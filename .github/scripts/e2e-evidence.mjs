import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Chromium uses software WebGL on CI. Give each scenario its own CPU rather
// than competing for one runner; WebKit's five scenarios fit on one runner.
export const browserMatrix = [
  ...Array.from({ length: 5 }, (_, i) => ({ id: `pixel-${i + 1}`, project: 'pixel-7-chromium', browser: 'chromium', shard: `${i + 1}/5` })),
  { id: 'iphone-1', project: 'iphone-15-webkit', browser: 'webkit', shard: '1/1' },
];

const fullRun = reason => ({ reuse: false, reason });
const shaPattern = /^[a-f0-9]{40}$/;

// Read-only evidence lookup. Any uncertainty falls back to a full browser run.
// Compare the entire tree, including lockfile, tests and workflow configuration.
export async function findEvidence({ eventName, event, repository, ref, sha, tree, get, now = Date.now() }) {
  try {
    let candidate;
    if (eventName === 'pull_request') {
      const pr = event.pull_request;
      if (pr?.head?.repo?.full_name !== repository || pr?.base?.ref !== 'main') return fullRun('External or unsupported PR');
      candidate = pr.head.sha;
    } else if (eventName === 'push' && ref === 'refs/heads/main') {
      const prs = await get(`/commits/${sha}/pulls`);
      candidate = prs.find(pr => pr.merged_at && pr.merge_commit_sha === sha && pr.base?.ref === 'main'
        && pr.head?.repo?.full_name === repository)?.head?.sha;
    } else return fullRun('Feature push or manual run requires browser coverage');

    if (!shaPattern.test(candidate ?? '') || !shaPattern.test(tree ?? '')) return fullRun('No exact source commit');
    const commit = await get(`/git/commits/${candidate}`);
    if (commit.tree?.sha !== tree) return fullRun('Integration tree differs from tested source');

    const { workflow_runs: runs = [] } = await get(`/actions/workflows/e2e.yml/runs?event=push&head_sha=${candidate}&per_page=5`);
    for (const run of runs) {
      const age = now - Date.parse(run.updated_at);
      if (run.head_sha !== candidate || run.event !== 'push' || !run.head_branch?.startsWith('feature/')
        || run.head_repository?.full_name !== repository || run.path !== '.github/workflows/e2e.yml'
        || run.status !== 'completed' || run.conclusion !== 'success' || !Number.isFinite(age) || age < 0 || age > 86_400_000
        || !Number.isSafeInteger(run.id) || !Number.isSafeInteger(run.run_attempt)) continue;

      const { jobs = [], total_count = 0 } = await get(`/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`);
      if (total_count > jobs.length) continue;
      const covered = browserMatrix.every(({ id }) => jobs.some(job => job.name === `browser-${id}`
        && job.status === 'completed' && job.conclusion === 'success'
        && job.steps?.some(step => step.name === 'Run browser scenarios' && step.status === 'completed' && step.conclusion === 'success')));
      if (covered) return { reuse: true, source: `https://github.com/${repository}/actions/runs/${run.id}`, head: candidate, tree,
        reason: 'All six browser jobs passed for this exact tree within 24 hours' };
    }
    return fullRun('No complete, recent browser evidence for this tree');
  } catch {
    return fullRun('Evidence lookup unavailable; run browsers');
  }
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const get = async path => {
    const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error('Evidence API unavailable');
    return response.json();
  };
  const result = await findEvidence({
    eventName: process.env.GITHUB_EVENT_NAME,
    event: JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')),
    repository, ref: process.env.GITHUB_REF, sha: process.env.GITHUB_SHA,
    tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim(), get,
  });
  appendFileSync(process.env.GITHUB_OUTPUT, `reuse=${result.reuse}\nmatrix=${JSON.stringify({ include: browserMatrix })}\n`);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Browser coverage\n\n${result.reason}.\n\n${result.reuse
    ? `Verified run: ${result.source}\n\nSource: \`${result.head}\` · tree: \`${result.tree}\`\n`
    : 'Running all scenarios on Chromium and WebKit.\n'}`);
  console.log(result.reason);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

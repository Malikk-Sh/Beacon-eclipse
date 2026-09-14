import assert from 'node:assert/strict';
import { test } from 'node:test';
import { browserMatrix, findEvidence } from '../.github/scripts/e2e-evidence.mjs';

function fixture() {
  const repository = 'owner/game', head = 'a'.repeat(40), tree = 'b'.repeat(40), sha = 'c'.repeat(40);
  const now = Date.parse('2026-09-14T12:00:00Z');
  const pr = { head: { sha: head, repo: { full_name: repository } }, base: { ref: 'main' }, merged_at: '2026-09-14T11:59:00Z', merge_commit_sha: sha };
  const run = { id: 77, run_attempt: 2, head_sha: head, head_branch: 'feature/mystery', event: 'push',
    head_repository: { full_name: repository }, path: '.github/workflows/e2e.yml', status: 'completed', conclusion: 'success', updated_at: '2026-09-14T11:55:00Z' };
  const jobs = browserMatrix.map(({ id }: { id: string }) => ({ name: `browser-${id}`, status: 'completed', conclusion: 'success',
    steps: [{ name: 'Run browser scenarios', status: 'completed', conclusion: 'success' }] }));
  const data = { commit: { tree: { sha: tree } }, runs: [run], jobs, prs: [pr] };
  const calls: string[] = [];
  const args = { repository, eventName: 'pull_request', event: { pull_request: pr }, ref: 'refs/pull/46/merge', sha, tree, now,
    get: async (path: string) => {
      calls.push(path);
      if (path === `/git/commits/${head}`) return data.commit;
      if (path === `/commits/${sha}/pulls`) return data.prs;
      if (path === `/actions/workflows/e2e.yml/runs?event=push&head_sha=${head}&per_page=5`) return { workflow_runs: data.runs };
      if (path === '/actions/runs/77/attempts/2/jobs?per_page=100') return { jobs: data.jobs, total_count: data.jobs.length };
      throw new Error(`Unexpected lookup ${path}`);
    } };
  return { args, data, run, calls };
}

test('PR and squash merge reuse only a complete exact-tree browser run', async () => {
  for (const eventName of ['pull_request', 'push']) {
    const { args } = fixture(); args.eventName = eventName;
    if (eventName === 'push') args.ref = 'refs/heads/main';
    const result = await findEvidence(args);
    assert.equal(result.reuse, true);
    assert.equal(result.source, 'https://github.com/owner/game/actions/runs/77');
    assert.equal(result.tree, args.tree);
  }
});

test('base changes, forks, direct main pushes and manual runs require fresh browser coverage', async () => {
  const changes = [
    (f: ReturnType<typeof fixture>) => { f.data.commit.tree.sha = 'd'.repeat(40); },
    (f: ReturnType<typeof fixture>) => { f.args.event.pull_request.head.repo.full_name = 'fork/game'; },
    (f: ReturnType<typeof fixture>) => { f.args.eventName = 'workflow_dispatch'; },
    (f: ReturnType<typeof fixture>) => { f.args.eventName = 'push'; f.args.ref = 'refs/heads/feature/mystery'; },
    (f: ReturnType<typeof fixture>) => { f.args.eventName = 'push'; f.args.ref = 'refs/heads/main'; f.data.prs = []; },
  ];
  for (const change of changes) { const f = fixture(); change(f); assert.equal((await findEvidence(f.args)).reuse, false); }
});

test('green summary cannot conceal failed, skipped, missing or unexecuted browser scenarios', async () => {
  for (const status of ['failure', 'cancelled', 'skipped', 'missing', 'step-skipped']) {
    const f = fixture();
    if (status === 'missing') f.data.jobs.pop();
    else if (status === 'step-skipped') f.data.jobs[0].steps[0].conclusion = 'skipped';
    else f.data.jobs[0].conclusion = status;
    assert.equal((await findEvidence(f.args)).reuse, false, status);
  }
});

test('stale, mismatched, running and foreign workflow results cannot be reused', async () => {
  for (const changes of [
    { updated_at: '2026-09-12T12:00:00Z' }, { updated_at: 'invalid' }, { updated_at: '2026-09-15T12:00:00Z' },
    { head_sha: 'd'.repeat(40) }, { head_branch: 'main' }, { event: 'pull_request' },
    { status: 'in_progress' }, { conclusion: 'failure' }, { path: '.github/workflows/ci.yml' },
    { head_repository: { full_name: 'fork/game' } },
  ]) {
    const f = fixture(); Object.assign(f.run, changes);
    assert.equal((await findEvidence(f.args)).reuse, false, JSON.stringify(changes));
  }
});

test('API failure and incomplete job pages fall back to a full run', async () => {
  const f = fixture();
  f.args.get = async () => { throw new Error('rate limited'); };
  assert.equal((await findEvidence(f.args)).reuse, false);
  const g = fixture(), originalGet = g.args.get;
  g.args.get = async path => {
    const result = await originalGet(path);
    return 'jobs' in result ? { ...result, total_count: 101 } : result;
  };
  assert.equal((await findEvidence(g.args)).reuse, false);
});

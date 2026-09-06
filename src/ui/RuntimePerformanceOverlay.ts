const SAMPLE_CAPACITY = 180;
const REFRESH_INTERVAL_MS = 500;
const LONG_FRAME_MS = 50;

export class RuntimePerformanceOverlay {
  private readonly element: HTMLPreElement | null;
  private readonly samples = new Float32Array(SAMPLE_CAPACITY);
  private sampleCount = 0;
  private sampleIndex = 0;
  private longFrameCount = 0;
  private worstFrameMs = 0;
  private lastTimestamp: number | null = null;
  private lastRefreshTimestamp = 0;

  constructor() {
    if (!RuntimePerformanceOverlay.isEnabled()) {
      this.element = null;
      return;
    }

    const element = document.createElement('pre');
    element.dataset.runtimePerformance = 'true';
    element.setAttribute('aria-hidden', 'true');
    Object.assign(element.style, {
      position: 'fixed',
      top: 'max(12px, env(safe-area-inset-top))',
      right: 'max(12px, env(safe-area-inset-right))',
      zIndex: '10000',
      margin: '0',
      padding: '10px 12px',
      maxWidth: 'min(460px, calc(100vw - 24px))',
      border: '1px solid rgba(151, 205, 238, 0.35)',
      borderRadius: '8px',
      background: 'rgba(3, 12, 18, 0.82)',
      color: '#c7e8ff',
      font: '600 11px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      letterSpacing: '0.01em',
      whiteSpace: 'pre-wrap',
      pointerEvents: 'none',
      userSelect: 'none',
      textShadow: '0 1px 2px #000',
    });
    document.body.appendChild(element);
    this.element = element;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') this.lastTimestamp = null;
    });
    requestAnimationFrame((timestamp) => this.tick(timestamp));
  }

  private tick(timestamp: number): void {
    if (!this.element) return;

    if (document.visibilityState === 'visible' && this.lastTimestamp !== null) {
      const frameMs = timestamp - this.lastTimestamp;
      if (frameMs > 0 && frameMs <= 500) this.recordSample(frameMs);
    }
    this.lastTimestamp = timestamp;

    if (timestamp - this.lastRefreshTimestamp >= REFRESH_INTERVAL_MS && this.sampleCount > 0) {
      this.lastRefreshTimestamp = timestamp;
      this.refreshText();
    }

    requestAnimationFrame((nextTimestamp) => this.tick(nextTimestamp));
  }

  private recordSample(frameMs: number): void {
    this.samples[this.sampleIndex] = frameMs;
    this.sampleIndex = (this.sampleIndex + 1) % SAMPLE_CAPACITY;
    this.sampleCount = Math.min(this.sampleCount + 1, SAMPLE_CAPACITY);
    this.worstFrameMs = Math.max(this.worstFrameMs, frameMs);
    if (frameMs > LONG_FRAME_MS) this.longFrameCount += 1;
  }

  private refreshText(): void {
    if (!this.element) return;

    const sortedSamples = Array.from(this.samples.slice(0, this.sampleCount)).sort((a, b) => a - b);
    const averageFrameMs = sortedSamples.reduce((sum, sample) => sum + sample, 0) / sortedSamples.length;
    const p95Index = Math.min(sortedSamples.length - 1, Math.ceil(sortedSamples.length * 0.95) - 1);
    const p95FrameMs = sortedSamples[p95Index];
    const averageFps = 1000 / averageFrameMs;
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
    const cssWidth = canvas?.clientWidth ?? 0;
    const cssHeight = canvas?.clientHeight ?? 0;
    const bufferWidth = canvas?.width ?? 0;
    const bufferHeight = canvas?.height ?? 0;
    const effectivePixelRatio = cssWidth > 0 ? bufferWidth / cssWidth : 0;

    this.element.textContent = [
      'RUNTIME AUDIT  (?perf=1)',
      `FPS avg ${averageFps.toFixed(1)}  |  frame avg ${averageFrameMs.toFixed(1)} ms`,
      `frame p95 ${p95FrameMs.toFixed(1)} ms  |  worst ${this.worstFrameMs.toFixed(1)} ms`,
      `> ${LONG_FRAME_MS} ms spikes ${this.longFrameCount}  |  sample ${this.sampleCount}/${SAMPLE_CAPACITY}`,
      `viewport ${innerWidth}x${innerHeight}  |  DPR ${devicePixelRatio.toFixed(2)}`,
      `canvas CSS ${cssWidth}x${cssHeight}  |  buffer ${bufferWidth}x${bufferHeight}`,
      `effective pixel ratio ${effectivePixelRatio.toFixed(2)}`,
    ].join('\n');
  }

  private static isEnabled(): boolean {
    return new URLSearchParams(window.location.search).get('perf') === '1';
  }
}

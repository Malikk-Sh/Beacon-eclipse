import * as THREE from 'three';
import type { GraphicsQuality } from '../game/SettingsStore';

const SAMPLE_CAPACITY = 180;
const REFRESH_INTERVAL_SECONDS = 0.5;
const LONG_FRAME_MS = 50;

export class RuntimePerformanceOverlay {
  private readonly element: HTMLPreElement | null;
  private readonly samples = new Float32Array(SAMPLE_CAPACITY);
  private sampleCount = 0;
  private sampleIndex = 0;
  private refreshElapsed = 0;
  private longFrameCount = 0;
  private worstFrameMs = 0;

  constructor(root: HTMLElement) {
    if (!RuntimePerformanceOverlay.isEnabled()) {
      this.element = null;
      return;
    }

    const element = document.createElement('pre');
    element.dataset.runtimePerformance = 'true';
    element.setAttribute('aria-hidden', 'true');
    Object.assign(element.style, {
      position: 'absolute',
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
    root.appendChild(element);
    this.element = element;
  }

  update(frameSeconds: number, renderer: THREE.WebGLRenderer, quality: GraphicsQuality): void {
    if (!this.element || document.visibilityState !== 'visible' || frameSeconds <= 0 || frameSeconds > 0.5) return;

    const frameMs = frameSeconds * 1000;
    this.samples[this.sampleIndex] = frameMs;
    this.sampleIndex = (this.sampleIndex + 1) % SAMPLE_CAPACITY;
    this.sampleCount = Math.min(this.sampleCount + 1, SAMPLE_CAPACITY);
    this.worstFrameMs = Math.max(this.worstFrameMs, frameMs);
    if (frameMs > LONG_FRAME_MS) this.longFrameCount += 1;

    this.refreshElapsed += frameSeconds;
    if (this.refreshElapsed < REFRESH_INTERVAL_SECONDS) return;
    this.refreshElapsed = 0;

    const sortedSamples = Array.from(this.samples.slice(0, this.sampleCount)).sort((a, b) => a - b);
    const averageFrameMs = sortedSamples.reduce((sum, sample) => sum + sample, 0) / sortedSamples.length;
    const p95Index = Math.min(sortedSamples.length - 1, Math.ceil(sortedSamples.length * 0.95) - 1);
    const p95FrameMs = sortedSamples[p95Index];
    const averageFps = 1000 / averageFrameMs;
    const info = renderer.info;

    this.element.textContent = [
      'RUNTIME AUDIT  (?perf=1)',
      `FPS avg ${averageFps.toFixed(1)}  |  frame avg ${averageFrameMs.toFixed(1)} ms`,
      `frame p95 ${p95FrameMs.toFixed(1)} ms  |  worst ${this.worstFrameMs.toFixed(1)} ms`,
      `> ${LONG_FRAME_MS} ms spikes ${this.longFrameCount}  |  sample ${this.sampleCount}/${SAMPLE_CAPACITY}`,
      `draw calls ${info.render.calls}  |  triangles ${formatCount(info.render.triangles)}  |  lines ${formatCount(info.render.lines)}`,
      `geometries ${info.memory.geometries}  |  textures ${info.memory.textures}`,
      `quality ${quality}  |  pixel ratio ${renderer.getPixelRatio().toFixed(2)}  |  shadows ${renderer.shadowMap.enabled ? 'on' : 'off'}`,
      `viewport ${innerWidth}x${innerHeight}  |  DPR ${devicePixelRatio.toFixed(2)}`,
    ].join('\n');
  }

  private static isEnabled(): boolean {
    return new URLSearchParams(window.location.search).get('perf') === '1';
  }
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

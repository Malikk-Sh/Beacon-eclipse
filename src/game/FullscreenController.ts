export class FullscreenController {
  isSupported(): boolean {
    return typeof document.documentElement.requestFullscreen === 'function'
      && typeof document.exitFullscreen === 'function';
  }

  isFullscreen(): boolean {
    return document.fullscreenElement !== null;
  }

  async enter(): Promise<void> {
    if (!this.isSupported() || this.isFullscreen()) return;
    await document.documentElement.requestFullscreen();
  }

  async exit(): Promise<void> {
    if (!this.isFullscreen()) return;
    await document.exitFullscreen();
  }

  async toggle(): Promise<boolean> {
    if (this.isFullscreen()) {
      await this.exit();
    } else {
      await this.enter();
    }
    return this.isFullscreen();
  }

  subscribe(callback: (active: boolean) => void): () => void {
    const handler = () => callback(this.isFullscreen());
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }
}

/**
 * utils/fpsTracker.ts
 *
 * 帧率统计器（记录渲染帧时间）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fpsTracker.ts
 * pieces: chunk-7fw14qgv.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-7fw14qgv.js:2195-2904 fingerprint = FpsTracker (0.901)
class FpsTracker {
  frameDurations = [];
  totalFrames = 0;
  firstRenderTime;
  lastRenderTime;
  record(durationMs) {
    let now = performance.now();
    if (this.firstRenderTime === undefined) this.firstRenderTime = now;
    this.lastRenderTime = now;
    this.totalFrames++;
    this.frameDurations.push(durationMs);
    if (this.frameDurations.length > 3600) this.frameDurations.splice(0, this.frameDurations.length >> 1);
  }
  getMetrics() {
    if (this.totalFrames === 0 || this.firstRenderTime === undefined || this.lastRenderTime === undefined)
      return;
    let totalTimeMs = this.lastRenderTime - this.firstRenderTime;
    if (totalTimeMs <= 0) return;
    let p = this.totalFrames / (totalTimeMs / 1000);
    let sorted = this.frameDurations.slice().sort((C, b) => b - C);
    let p99Index = Math.max(0, Math.ceil(sorted.length * 0.01) - 1);
    let p99FrameTimeMs = sorted[p99Index];
    let low1PctFps = p99FrameTimeMs > 0 ? 1000 / p99FrameTimeMs : 0;
    return {
      averageFps: Math.round(p * 100) / 100,
      low1PctFps: Math.round(low1PctFps * 100) / 100,
    };
  }
}
export { FpsTracker };

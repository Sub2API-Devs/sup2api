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
  record(o) {
    let startTime = performance.now();
    if (this.firstRenderTime === void 0) this.firstRenderTime = startTime;
    if (
      ((this.lastRenderTime = startTime),
      this.totalFrames++,
      this.frameDurations.push(o),
      this.frameDurations.length > 3600)
    )
      this.frameDurations.splice(0, this.frameDurations.length >> 1);
  }
  getMetrics() {
    if (this.totalFrames === 0 || this.firstRenderTime === void 0 || this.lastRenderTime === void 0) return;
    let o = this.lastRenderTime - this.firstRenderTime;
    if (o <= 0) return;
    let p = this.totalFrames / (o / 1000),
      sorted = this.frameDurations.slice().sort((C, b) => b - C),
      max = Math.max(0, Math.ceil(sorted.length * 0.01) - 1),
      T = sorted[max],
      A = T > 0 ? 1000 / T : 0;
    return { averageFps: Math.round(p * 100) / 100, low1PctFps: Math.round(A * 100) / 100 };
  }
}

export { FpsTracker };

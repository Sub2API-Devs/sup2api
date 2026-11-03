/**
 * ink/_new/RenderDebugHud.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: sole-consumer-new 1
 */

//@ chunk-bzr73sfg.js:286172-287550 sole-consumer-new
class RenderDebugHud {
  stylePool;
  snapshot = { boxOpen: !1, stress: "off", cellsPerFrame: 480, fullScreen: !1 };
  recordingBeforeHud = !1;
  listeners = new Set();
  constructor(n) {
    this.stylePool = n;
  }
  subscribe = (n) => (this.listeners.add(n), () => this.listeners.delete(n));
  getSnapshot = () => this.snapshot;
  isBoxOpen() {
    return this.snapshot.boxOpen;
  }
  get stressing() {
    return this.snapshot.stress !== "off";
  }
  getAtlasKeyCount() {
    return this.stylePool.atlasRecorder.size;
  }
  getStylePoolStats() {
    return { size: this.stylePool.size, overflowed: this.stylePool.overflowed };
  }
  setBox(n) {
    if (this.snapshot.boxOpen === n) return;
    if (n) {
      (this.beginHudRecording(), this.update({ ...this.snapshot, boxOpen: !0 }));
      return;
    }
    let atlasRecorder = this.stylePool.atlasRecorder;
    (atlasRecorder.reset(),
      atlasRecorder.setMaxKeys(null),
      (atlasRecorder.recording = this.recordingBeforeHud),
      this.update({ ...this.snapshot, boxOpen: !1, stress: "off" }));
  }
  setStress(n, u) {
    let snapshot = this.snapshot,
      m = u?.cellsPerFrame ?? snapshot.cellsPerFrame,
      p = u?.fullScreen ?? snapshot.fullScreen,
      boxOpen = snapshot.boxOpen;
    if (n !== "off" && !boxOpen) ((boxOpen = !0), this.beginHudRecording());
    if (
      boxOpen === snapshot.boxOpen &&
      snapshot.stress === n &&
      snapshot.cellsPerFrame === m &&
      snapshot.fullScreen === p
    )
      return;
    this.update({ boxOpen: boxOpen, stress: n, cellsPerFrame: m, fullScreen: p });
  }
  resetKeys() {
    (this.stylePool.atlasRecorder.reset(), this.update({ ...this.snapshot }));
  }
  beginHudRecording() {
    let atlasRecorder = this.stylePool.atlasRecorder;
    ((this.recordingBeforeHud = atlasRecorder.recording),
      (atlasRecorder.debugTainted = !0),
      atlasRecorder.setMaxKeys(1500000),
      atlasRecorder.reset(),
      (atlasRecorder.recording = !0));
  }
  update(n) {
    this.snapshot = n;
    for (let listener of this.listeners) listener();
  }
}

export { RenderDebugHud };

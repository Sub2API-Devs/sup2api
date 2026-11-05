/**
 * ink/renderTelemetry.ts
 *
 * 2.1.316 新增：渲染遥测（字形图集使用、终端宿主识别、样式池记录）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2avr6cej.js (1), chunk-emhzq435.js (5)
 * attribution: placement 6
 */
import { getSecondRootError, isXtermJs } from "./terminal.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { getTotalDuration } from "../bootstrap/state.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { env } from "../utils/env.js";

//@ chunk-2avr6cej.js:285753-287131 placement
class RenderDebugHud {
  stylePool;
  snapshot = {
    boxOpen: false,
    stress: "off",
    cellsPerFrame: 480,
    fullScreen: false,
  };
  recordingBeforeHud = false;
  listeners = new Set();
  constructor(stylePool) {
    this.stylePool = stylePool;
  }
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
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
    return {
      size: this.stylePool.size,
      overflowed: this.stylePool.overflowed,
    };
  }
  setBox(isOpen) {
    if (this.snapshot.boxOpen === isOpen) return;
    if (isOpen) {
      this.beginHudRecording();
      this.update({
        ...this.snapshot,
        boxOpen: true,
      });
      return;
    }
    let atlasRecorder = this.stylePool.atlasRecorder;
    atlasRecorder.reset();
    atlasRecorder.setMaxKeys(null);
    atlasRecorder.recording = this.recordingBeforeHud;
    this.update({
      ...this.snapshot,
      boxOpen: false,
      stress: "off",
    });
  }
  setStress(stress, options) {
    let snapshot = this.snapshot;
    let cellsPerFrame = options?.cellsPerFrame ?? snapshot.cellsPerFrame;
    let fullScreen = options?.fullScreen ?? snapshot.fullScreen;
    let boxOpen = snapshot.boxOpen;
    if (stress !== "off" && !boxOpen) {
      boxOpen = true;
      this.beginHudRecording();
    }
    if (
      boxOpen === snapshot.boxOpen &&
      snapshot.stress === stress &&
      snapshot.cellsPerFrame === cellsPerFrame &&
      snapshot.fullScreen === fullScreen
    )
      return;
    this.update({
      boxOpen,
      stress,
      cellsPerFrame,
      fullScreen,
    });
  }
  resetKeys() {
    this.stylePool.atlasRecorder.reset();
    this.update({
      ...this.snapshot,
    });
  }
  beginHudRecording() {
    let atlasRecorder = this.stylePool.atlasRecorder;
    this.recordingBeforeHud = atlasRecorder.recording;
    atlasRecorder.debugTainted = true;
    atlasRecorder.setMaxKeys(1500000);
    atlasRecorder.reset();
    atlasRecorder.recording = true;
  }
  update(snapshot) {
    this.snapshot = snapshot;
    for (let listener of this.listeners) listener();
  }
}
//@ chunk-emhzq435.js:4399-4479 placement
function recordStylePoolAtlas() {
  let inkInstance = getSecondRootError().get(process.stdout);
  if (!inkInstance) return;
  recordAtlasUsage(inkInstance.getStylePool());
}
//@ chunk-emhzq435.js:4479-4603 placement
function atlasResetConfig() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_xterm_atlas_reset", true);
  let featureValue_CACHED_MAY_BE_STALE_2 = getFeatureValue_CACHED_MAY_BE_STALE("tengu_basalt_meadow", false);
  return {
    autoResetEnabled: featureValue_CACHED_MAY_BE_STALE,
    recording: featureValue_CACHED_MAY_BE_STALE || featureValue_CACHED_MAY_BE_STALE_2,
  };
}
//@ chunk-emhzq435.js:4603-5270 placement
function recordAtlasUsage(stylePool) {
  let atlasRecorder = stylePool.atlasRecorder;
  if (atlasRecorder.debugTainted) return;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_basalt_meadow", false)) {
    if (!atlasRecorder.autoResetEnabled) atlasRecorder.recording = false;
    return;
  }
  atlasRecorder.recording = true;
  let proactiveResetStats = atlasRecorder.proactiveResetStats;
  logEvent("tengu_render_glyph_cardinality", {
    stylepool_styles: stylePool.size,
    stylepool_overflowed: stylePool.overflowed,
    atlas_glyph_keys: atlasRecorder.size,
    atlas_keys_saturated: atlasRecorder.saturated,
    term_program: fromEnum(detectTerminalHost()),
    is_xtermjs: isXtermJs(),
    session_age_bucket: fromEnum(sessionAgeBucket(getTotalDuration())),
    proactive_reset_count: proactiveResetStats.count,
    proactive_reset_last_reason: fromEnum(proactiveResetStats.lastReason),
  });
  if (!atlasRecorder.stylePoolHealthyReported) {
    atlasRecorder.stylePoolHealthyReported = true;
    logFeatureOk("render_stylepool");
  }
  if (stylePool.overflowed && !atlasRecorder.stylePoolCapHitReported) {
    atlasRecorder.stylePoolCapHitReported = true;
    logFeatureSad("render_stylepool", "cap_hit");
  }
}
//@ chunk-emhzq435.js:5270-5612 placement
function detectTerminalHost() {
  if (env.CURSOR_TRACE_ID !== undefined) return "cursor";
  switch (env.TERM_PROGRAM) {
    case "vscode":
      return "vscode";
    case "iTerm.app":
      return "iterm";
    case "Apple_Terminal":
      return "apple_terminal";
    case "ghostty":
      return "ghostty";
    case "WezTerm":
      return "wezterm";
    case "tmux":
      return "tmux";
  }
  if (process.env.WT_SESSION !== undefined) return "windows_terminal";
  return "other";
}
//@ chunk-emhzq435.js:5612-5746 placement
function sessionAgeBucket(totalDuration) {
  let minutes = totalDuration / 60000;
  if (minutes < 5) return "lt_5m";
  if (minutes < 30) return "5m_30m";
  if (minutes < 120) return "30m_2h";
  if (minutes < 480) return "2h_8h";
  return "gt_8h";
}
export { atlasResetConfig, RenderDebugHud, recordStylePoolAtlas };

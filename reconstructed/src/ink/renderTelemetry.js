/**
 * ink/renderTelemetry.ts
 *
 * 2.1.316 新增：渲染遥测（字形图集使用、终端宿主识别、样式池记录）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x6v6jz2y.js (5)
 * attribution: placement 5
 */
import { di, isXtermJs } from "./terminal.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { getTotalDuration } from "../bootstrap/state.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { env } from "../utils/env.js";

//@ chunk-x6v6jz2y.js:4461-4541 placement
function recordStylePoolAtlas() {
  let o = di().get(process.stdout);
  if (!o) return;
  recordAtlasUsage(o.getStylePool());
}
//@ chunk-x6v6jz2y.js:4541-4665 placement
function atlasResetConfig() {
  let o = getFeatureValue_CACHED_MAY_BE_STALE("tengu_xterm_atlas_reset", !0),
    r = getFeatureValue_CACHED_MAY_BE_STALE("tengu_basalt_meadow", !1);
  return { autoResetEnabled: o, recording: o || r };
}
//@ chunk-x6v6jz2y.js:4665-5332 placement
function recordAtlasUsage(o) {
  let atlasRecorder = o.atlasRecorder;
  if (atlasRecorder.debugTainted) return;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_basalt_meadow", !1)) {
    if (!atlasRecorder.autoResetEnabled) atlasRecorder.recording = !1;
    return;
  }
  atlasRecorder.recording = !0;
  let proactiveResetStats = atlasRecorder.proactiveResetStats;
  if (
    (logEvent("tengu_render_glyph_cardinality", {
      stylepool_styles: o.size,
      stylepool_overflowed: o.overflowed,
      atlas_glyph_keys: atlasRecorder.size,
      atlas_keys_saturated: atlasRecorder.saturated,
      term_program: fromEnum(detectTerminalHost()),
      is_xtermjs: isXtermJs(),
      session_age_bucket: fromEnum(sessionAgeBucket(getTotalDuration())),
      proactive_reset_count: proactiveResetStats.count,
      proactive_reset_last_reason: fromEnum(proactiveResetStats.lastReason),
    }),
    !atlasRecorder.stylePoolHealthyReported)
  )
    ((atlasRecorder.stylePoolHealthyReported = !0), logFeatureOk("render_stylepool"));
  if (o.overflowed && !atlasRecorder.stylePoolCapHitReported)
    ((atlasRecorder.stylePoolCapHitReported = !0), logFeatureSad("render_stylepool", "cap_hit"));
}
//@ chunk-x6v6jz2y.js:5332-5674 placement
function detectTerminalHost() {
  if (env.CURSOR_TRACE_ID !== void 0) return "cursor";
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
  if (process.env.WT_SESSION !== void 0) return "windows_terminal";
  return "other";
}
//@ chunk-x6v6jz2y.js:5674-5808 placement
function sessionAgeBucket(o) {
  let r = o / 60000;
  if (r < 5) return "lt_5m";
  if (r < 30) return "5m_30m";
  if (r < 120) return "30m_2h";
  if (r < 480) return "2h_8h";
  return "gt_8h";
}

export { recordStylePoolAtlas, atlasResetConfig };

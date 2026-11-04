/**
 * ink/nativeCursor.ts
 *
 * 2.1.316 新增：是否启用 DECSTBM 滚动区渲染（TTY、终端支持、环境）；是否使用原生光标（无障碍模式、开关 tengu_native_cursor）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzr73sfg.js (3)
 * attribution: placement 3
 */
import { getSessionFeatureValues } from "../bootstrap/sessionFeatureValues.js";
import { isTmuxControlMode, isFullscreenEnvEnabled } from "../utils/fullscreen.js";
import { shouldUseSynchronizedOutput, isSynchronizedOutputLikely } from "./terminal.js";
import { isScreenReaderMode } from "../utils/accessibility/screenReader.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { env } from "../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { getTerminalProbeState } from "./terminalCapabilities.js";

//@ chunk-bzr73sfg.js:144020-144502 placement
/**
 * 是否启用 DECSTBM 滚动区渲染（TTY、终端支持、环境）。
 */
function isDecstbmRendererEnabled() {
  let sessionFeatureValues = getSessionFeatureValues();
  if (sessionFeatureValues.decstbmRendererEnabled !== undefined)
    return sessionFeatureValues.decstbmRendererEnabled;
  if (!process.stdout.isTTY) return (sessionFeatureValues.decstbmRendererEnabled = false);
  if (isTmuxControlMode()) return (sessionFeatureValues.decstbmRendererEnabled = false);
  if (!shouldUseSynchronizedOutput(isSynchronizedOutputLikely()))
    return (sessionFeatureValues.decstbmRendererEnabled = false);
  if (isFullscreenEnvEnabled()) return (sessionFeatureValues.decstbmRendererEnabled = false);
  if (isScreenReaderMode()) return (sessionFeatureValues.decstbmRendererEnabled = false);
  if (isEnvTruthy(env.CLAUDE_CODE_DECSTBM)) return (sessionFeatureValues.decstbmRendererEnabled = true);
  sessionFeatureValues.decstbmRendererEnabled = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_marlin_porch",
    false,
  );
  return sessionFeatureValues.decstbmRendererEnabled;
}
//@ chunk-bzr73sfg.js:144502-144735 placement
/**
 * 是否使用原生光标（无障碍模式、开关 tengu_native_cursor）。
 */
function isNativeCursorEnabled() {
  let terminalProbeState = getTerminalProbeState();
  if (terminalProbeState.nativeCursorEnabled !== undefined) return terminalProbeState.nativeCursorEnabled;
  if (env.CLAUDE_CODE_ACCESSIBILITY) return (terminalProbeState.nativeCursorEnabled = true);
  if (isScreenReaderMode()) return (terminalProbeState.nativeCursorEnabled = true);
  return (terminalProbeState.nativeCursorEnabled = !isDecstbmRendererEnabled() && isNativeCursorRequested());
}
//@ chunk-bzr73sfg.js:144735-144882 placement
function isNativeCursorRequested() {
  if (env.CLAUDE_CODE_ACCESSIBILITY) return true;
  if (isScreenReaderMode()) return true;
  if (env.CLAUDE_CODE_NATIVE_CURSOR) return true;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_native_cursor", false);
}
export { isNativeCursorEnabled, isDecstbmRendererEnabled, isNativeCursorRequested };

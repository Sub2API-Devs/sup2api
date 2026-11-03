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
import { Ao } from "../bootstrap/sessionFeatureValues.js";
import { isTmuxControlMode, isFullscreenEnvEnabled } from "../utils/fullscreen.js";
import { shouldUseSynchronizedOutput, isSynchronizedOutputLikely } from "./terminal.js";
import { isScreenReaderMode } from "../utils/accessibility/screenReader.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { env } from "../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { gk } from "./terminalCapabilities.js";

/**
 * 是否启用 DECSTBM 滚动区渲染（TTY、终端支持、环境）。
 */
//@ chunk-bzr73sfg.js:144020-144502 placement
function isDecstbmRendererEnabled() {
  let n = Ao();
  if (n.decstbmRendererEnabled !== void 0) return n.decstbmRendererEnabled;
  if (!process.stdout.isTTY) return (n.decstbmRendererEnabled = !1);
  if (isTmuxControlMode()) return (n.decstbmRendererEnabled = !1);
  if (!shouldUseSynchronizedOutput(isSynchronizedOutputLikely())) return (n.decstbmRendererEnabled = !1);
  if (isFullscreenEnvEnabled()) return (n.decstbmRendererEnabled = !1);
  if (isScreenReaderMode()) return (n.decstbmRendererEnabled = !1);
  if (isEnvTruthy(env.CLAUDE_CODE_DECSTBM)) return (n.decstbmRendererEnabled = !0);
  return (
    (n.decstbmRendererEnabled = getFeatureValue_CACHED_MAY_BE_STALE("tengu_marlin_porch", !1)),
    n.decstbmRendererEnabled
  );
}
/**
 * 是否使用原生光标（无障碍模式、开关 tengu_native_cursor）。
 */
//@ chunk-bzr73sfg.js:144502-144735 placement
function isNativeCursorEnabled() {
  let n = gk();
  if (n.nativeCursorEnabled !== void 0) return n.nativeCursorEnabled;
  if (env.CLAUDE_CODE_ACCESSIBILITY) return (n.nativeCursorEnabled = !0);
  if (isScreenReaderMode()) return (n.nativeCursorEnabled = !0);
  return (n.nativeCursorEnabled = !isDecstbmRendererEnabled() && isNativeCursorRequested());
}
//@ chunk-bzr73sfg.js:144735-144882 placement
function isNativeCursorRequested() {
  if (env.CLAUDE_CODE_ACCESSIBILITY) return !0;
  if (isScreenReaderMode()) return !0;
  if (env.CLAUDE_CODE_NATIVE_CURSOR) return !0;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_native_cursor", !1);
}

export { isNativeCursorEnabled, isDecstbmRendererEnabled, isNativeCursorRequested };

/**
 * utils/terminalTitle.ts
 *
 * 2.1.316 新增：终端标题。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q6msdgx4.js (4)
 * attribution: placement 4
 */
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import { env } from "./env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";

//@ chunk-q6msdgx4.js:904-926 placement
var T = 1000,
  S = 10,
  y = 200;
//@ chunk-q6msdgx4.js:926-991 placement
function dPo() {
  return isEssentialTrafficOnly() || env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE;
}
/**
 * 判断是否设置终端标题（交互模式，或 sdk-cli 非 SDK、非远程会话且开关开启）。
 */
//@ chunk-q6msdgx4.js:991-1163 placement
function isTerminalTitleEnabled() {
  return (
    dPo() ||
    (env.CLAUDE_CODE_ENTRYPOINT === "sdk-cli" &&
      !process.env.CLAUDE_AGENT_SDK_VERSION &&
      !env.CLAUDE_CODE_REMOTE_SESSION_ID &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_quizzical_thimble", !0))
  );
}
//@ chunk-q6msdgx4.js:1163-1203 placement
function _(e) {
  return e.trim().length >= S;
}

export { y, isTerminalTitleEnabled, dPo, _, T };

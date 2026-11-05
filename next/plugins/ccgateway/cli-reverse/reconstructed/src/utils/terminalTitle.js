/**
 * utils/terminalTitle.ts
 *
 * 2.1.316 新增：终端标题。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zhnr3erp.js (4)
 * attribution: placement 4
 */
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import { env } from "./env.js";
import { _ } from "./codeMode/remoteSessionId.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";

//@ chunk-zhnr3erp.js:973-995 placement
var MAX_TITLE_TEXT_CHARS = 1000;
var MIN_RESUBMIT_TEXT_CHARS = 10;
var MAX_TITLE_RESUBMIT_CHARS = 200;
//@ chunk-zhnr3erp.js:995-1060 placement
/**
 * 终端标题是否被禁用（精简流量或显式关闭）。
 */
function isTerminalTitleDisabled() {
  return isEssentialTrafficOnly() || env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE;
}
//@ chunk-zhnr3erp.js:1060-1248 placement
/**
 * 判断是否设置终端标题（交互模式，或 sdk-cli 非 SDK、非远程会话且开关开启）。
 */
function isTerminalTitleEnabled() {
  return (
    isTerminalTitleDisabled() ||
    ((env.CLAUDE_CODE_ENTRYPOINT === "sdk-cli" || env.CLAUDE_CODE_REMOTE_SESSION_ID !== undefined) &&
      !process.env.CLAUDE_AGENT_SDK_VERSION &&
      !_() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_quizzical_thimble", true))
  );
}
//@ chunk-zhnr3erp.js:1248-1288 placement
function isLongEnoughForTitle(text) {
  return text.trim().length >= MIN_RESUBMIT_TEXT_CHARS;
}
export {
  isTerminalTitleEnabled,
  MAX_TITLE_RESUBMIT_CHARS,
  isLongEnoughForTitle,
  MAX_TITLE_TEXT_CHARS,
  isTerminalTitleDisabled,
};

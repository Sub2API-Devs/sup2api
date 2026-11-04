/**
 * utils/claudeInChrome/startupConnect.ts
 *
 * 2.1.316 新增：Claude in Chrome 启动连接
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e2839z0z.js (2)
 * attribution: placement 2
 */
import { getGlobalConfig } from "../config.js";
import { logError } from "../log.js";
import {
  savedChromeDefaultCounts,
  isClaudeInChromeWiredThisSession,
  isClaudeInChromeAllowed,
} from "./setup.js";
import { canAuthenticateChromeBridge, isClaudeAISubscriber } from "../auth.js";
import { env } from "../env.js";
import { logForDebugging } from "../debug.js";
import { isSafeMode } from "../envUtils.js";
import { isRestrictedSession } from "../../bootstrap/state.js";
import { isChromeServerPolicyDenied } from "./serverPolicy.js";

//@ chunk-e2839z0z.js:11888-12006 placement
async function connectChromeAtStartup(options) {
  try {
    return await connectChromeAtStartupIfAllowed(
      options?.settingOn ?? getGlobalConfig().claudeInChromeDefaultEnabled === true,
    );
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-e2839z0z.js:12006-12380 placement
/**
 * 启动时为编辑器连接 Claude in Chrome 的条件检查：设置开启、本会话未接入、组织策略允许且令牌可用、非安全模式/受限会话、Claude.ai 订阅用户等，满足后才连接。
 */
async function connectChromeAtStartupIfAllowed(options) {
  if (!options || !savedChromeDefaultCounts()) return false;
  if (isClaudeInChromeWiredThisSession()) return false;
  if (!isClaudeInChromeAllowed() || !canAuthenticateChromeBridge() || env.CLAUDE_CODE_ENABLE_CFC === false) {
    logForDebugging(
      `[Claude in Chrome] Not connecting at startup for the editor: org policy allows=${isClaudeInChromeAllowed()}, token accepted by the Chrome extension=${canAuthenticateChromeBridge()}, CLAUDE_CODE_ENABLE_CFC=${String(env.CLAUDE_CODE_ENABLE_CFC)}`,
    );
    return false;
  }
  if (isSafeMode() || isRestrictedSession()) return false;
  if (!isClaudeAISubscriber()) return false;
  return !isChromeServerPolicyDenied();
}
export { connectChromeAtStartup };

/**
 * utils/claudeInChrome/phoneAnswer.ts
 *
 * 2.1.316 新增：Claude in Chrome 手机应答
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wbsgh6dq.js (7)
 * attribution: placement 7
 */
import { isRemoteManagedEnvironment } from "../remoteEnvironment.js";
import { isCcsCoworkSurface, isClaudeAiChatCowork } from "../entrypointKinds.js";
import { isMobilePlatform, claudeInChromeSession } from "../../commands/mobile/mobile.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-wbsgh6dq.js:376-927 placement
/**
 * 用户最后一条消息来自手机端、浏览器扩展又未连接时给模型的说明：不给设置步骤，简短说明连不上 Claude in Chrome，尽量改用其他方式，并提出到电脑上再试；本次回复不要再调用 Chrome 工具。
 */
var PHONE_NO_BROWSER_ANSWER =
  "Browser extension is not connected. The user's last message came from the Claude mobile app, where Claude in Chrome cannot be set up, so give no setup or troubleshooting steps unless they ask. In one or two short sentences, tell them you could not reach Claude in Chrome, then carry on another way if you can (web search, for example), and offer to try again once they are at a computer with Chrome open and the Claude in Chrome extension signed in. Unless they say Chrome is now open, do not call a Claude in Chrome tool again in this reply.";
//@ chunk-wbsgh6dq.js:927-1070 placement
/**
 * 协作聊天中用户最后一条消息来自手机端（且功能开启）时，返回手机端的 Chrome 未连接说明。
 */
function phoneChromeAnswer() {
  if (
    (isRemoteManagedEnvironment() || isCcsCoworkSurface()) &&
    isClaudeAiChatCowork() &&
    isMobilePlatform(claudeInChromeSession().lastTurnClientPlatform) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_glowing_pancake", false)
  ) {
    logFeatureOk("chrome_phone_answer");
    return PHONE_NO_BROWSER_ANSWER;
  }
  return;
}
//@ chunk-wbsgh6dq.js:1070-1185 placement
/**
 * 包装"未连接"回答生成函数：每次生成时计数并记录回答文本。
 */
function countDisconnectedAnswers(e) {
  return () => {
    let n = e();
    let o = claudeInChromeSession();
    o.disconnectedAnswerCount++;
    o.disconnectedAnswerTexts.add(n);
    return n;
  };
}
//@ chunk-wbsgh6dq.js:1185-1236 placement
/**
 * 已断开的手机回答数量。
 */
function disconnectedAnswerCount() {
  return claudeInChromeSession().disconnectedAnswerCount;
}
//@ chunk-wbsgh6dq.js:1236-1295 placement
/**
 * 判断该回答文本是否已被标记为断开。
 */
function hasDisconnectedAnswerText(text) {
  return claudeInChromeSession().disconnectedAnswerTexts.has(text);
}
//@ chunk-wbsgh6dq.js:1295-1389 placement
/**
 * 是否出现过断开的回答，或前序 worker 已见过未连接。
 */
function hasDisconnectedChromeAnswer() {
  let e = claudeInChromeSession();
  return e.disconnectedAnswerCount > 0 || e.notConnectedSeenByPriorWorker;
}
//@ chunk-wbsgh6dq.js:1389-1442 placement
/**
 * 标记前序 worker 已见过“未连接”。
 */
function markNotConnectedByPriorWorker() {
  claudeInChromeSession().notConnectedSeenByPriorWorker = true;
}
export {
  hasDisconnectedAnswerText,
  phoneChromeAnswer,
  disconnectedAnswerCount,
  hasDisconnectedChromeAnswer,
  markNotConnectedByPriorWorker,
  countDisconnectedAnswers,
};

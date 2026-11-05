/**
 * utils/auth/oauthRefreshExitWait.ts
 *
 * 2.1.316 新增。退出前等待进行中的 OAuth 刷新。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m399y9ae.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity } from "../identity.js";

//@ chunk-m399y9ae.js:227-245 placement
/**
 * 保存“退出前等待刷新”回调的槽位。
 */
class OAuthRefreshExitWaitSlot {
  wait = null;
}
//@ chunk-m399y9ae.js:245-257 placement
/**
 * 全局唯一的退出等待槽位。
 */
var oauthRefreshExitWait = new OAuthRefreshExitWaitSlot();
//@ chunk-m399y9ae.js:257-303 placement
class OAuthRefreshExitState {
  untilDeadline = null;
  exitBeganAtMs = null;
}
//@ chunk-m399y9ae.js:303-368 placement
var exitState = identity(new OAuthRefreshExitState(), (state) => {
  state.untilDeadline = null;
  state.exitBeganAtMs = null;
});
//@ chunk-m399y9ae.js:368-427 placement
/**
 * 打开/关闭“退出前等待 OAuth 刷新”标记。
 */
function waitForOAuthRefreshUntilDeadlineAtExit(enabled = true) {
  exitState.untilDeadline = enabled && exitState.untilDeadline !== false;
}
//@ chunk-m399y9ae.js:427-470 placement
/**
 * 判定是否处于等待退出状态。
 */
function exitWaitsForOAuthRefreshUntilDeadline() {
  return exitState.untilDeadline === true;
}
//@ chunk-m399y9ae.js:470-540 placement
/**
 * 返回是否等待并在首次为真时记下退出开始时间。
 */
function beginExitWaitingForOAuthRefreshLast() {
  let waiting = exitWaitsForOAuthRefreshUntilDeadline();
  if (waiting) exitState.exitBeganAtMs ??= Date.now();
  return waiting;
}
//@ chunk-m399y9ae.js:540-609 placement
/**
 * 退出已等待的毫秒数，未开始为 0。
 */
function msSinceOAuthRefreshExitBegan() {
  let { exitBeganAtMs } = exitState;
  return exitBeganAtMs === null ? 0 : Date.now() - exitBeganAtMs;
}
//@ chunk-m399y9ae.js:609-656 placement
function registerOAuthRefreshExitWait(wait) {
  let wait_2 = oauthRefreshExitWait.wait;
  oauthRefreshExitWait.wait = wait;
  return wait_2;
}
//@ chunk-m399y9ae.js:656-708 placement
/**
 * 退出前等待进行中的 OAuth 刷新。
 */
async function waitForOAuthRefreshBeforeExit(capMs) {
  try {
    await oauthRefreshExitWait.wait?.(capMs);
  } catch {}
}
export {
  beginExitWaitingForOAuthRefreshLast,
  waitForOAuthRefreshBeforeExit,
  exitWaitsForOAuthRefreshUntilDeadline,
  registerOAuthRefreshExitWait,
  msSinceOAuthRefreshExitBegan,
  waitForOAuthRefreshUntilDeadlineAtExit,
};

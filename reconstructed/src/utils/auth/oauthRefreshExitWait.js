/**
 * utils/auth/oauthRefreshExitWait.ts
 *
 * 2.1.316 新增。退出前等待进行中的 OAuth 刷新。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tss4qggm.js (4)
 * attribution: placement 4
 */

//@ chunk-tss4qggm.js:191-209 placement
/**
 * 保存“退出前等待刷新”回调的槽位。
 */
class OAuthRefreshExitWaitSlot {
  wait = null;
}
//@ chunk-tss4qggm.js:209-221 placement
/**
 * 全局唯一的退出等待槽位。
 */
var oauthRefreshExitWait = new OAuthRefreshExitWaitSlot();
//@ chunk-tss4qggm.js:221-268 placement
function registerOAuthRefreshExitWait(wait) {
  let wait_2 = oauthRefreshExitWait.wait;
  oauthRefreshExitWait.wait = wait;
  return wait_2;
}
//@ chunk-tss4qggm.js:268-318 placement
/**
 * 退出前等待进行中的 OAuth 刷新。
 */
async function waitForOAuthRefreshBeforeExit() {
  try {
    await oauthRefreshExitWait.wait?.();
  } catch {}
}
export { registerOAuthRefreshExitWait, waitForOAuthRefreshBeforeExit };

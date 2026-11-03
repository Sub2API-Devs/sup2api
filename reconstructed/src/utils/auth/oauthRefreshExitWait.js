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
class e {
  wait = null;
}
//@ chunk-tss4qggm.js:209-221 placement
var t = new e();
//@ chunk-tss4qggm.js:221-268 placement
function registerOAuthRefreshExitWait(i) {
  let wait = t.wait;
  return ((t.wait = i), wait);
}
/**
 * 退出前等待进行中的 OAuth 刷新。
 */
//@ chunk-tss4qggm.js:268-318 placement
async function waitForOAuthRefreshBeforeExit() {
  try {
    await t.wait?.();
  } catch {}
}

export { registerOAuthRefreshExitWait, waitForOAuthRefreshBeforeExit };

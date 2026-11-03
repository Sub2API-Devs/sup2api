/**
 * services/mcp/ccrTurnId.ts
 *
 * 2.1.316 新增：云会话（CCR）回合 id 传给 MCP 服务器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (11)
 * attribution: placement 11
 */
import {
  AsyncLocalStorage,
  AsyncLocalStorage as AsyncLocalStorage_2,
  AsyncLocalStorage as AsyncLocalStorage_3,
  AsyncLocalStorage as AsyncLocalStorage_4,
  AsyncLocalStorage as AsyncLocalStorage_5,
  AsyncLocalStorage as AsyncLocalStorage_6,
  AsyncLocalStorage as AsyncLocalStorage_7,
  AsyncLocalStorage as AsyncLocalStorage_8,
} from "async_hooks";
import { logError } from "../../utils/log.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";

//@ chunk-e6aww6q8.js:3286160-3286225 placement
var X_CCR_TURN_ID = "X-CCR-Turn-Id",
  HAr = 128,
  BAr = /^[\x21-\x7e]+$/,
  cAe = new AsyncLocalStorage_5();
//@ chunk-e6aww6q8.js:3286225-3286268 placement
function L4s(e, n) {
  return cAe.run({ id: e }, n);
}
//@ chunk-e6aww6q8.js:3286268-3286363 placement
async function H4s(e, n, r) {
  let s = { id: e, onDropped: r };
  try {
    await cAe.run(s, n);
  } finally {
    s.id = void 0;
  }
}
/**
 * 当前调用的 id（ALS），用途未完全确认。
 */
//@ chunk-e6aww6q8.js:3286363-3286404 placement = getAgentContext (1)
function getCurrentCallId() {
  return cAe.getStore()?.id;
}
/**
 * 丢弃当前 CCR 回合 id，并通知注册的丢弃监听器（监听器出错时记录错误）。
 */
//@ chunk-e6aww6q8.js:3286404-3286620 placement
function dropCcrTurnId() {
  let store = cAe.getStore();
  if (store?.id === void 0) return;
  store.id = void 0;
  try {
    store.onDropped?.();
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the listener for a dropped CCR turn id threw: ${errorMessage(error)}`,
        "the listener for a dropped CCR turn id threw",
      ),
    );
  }
}
//@ chunk-e6aww6q8.js:3286620-3286707 placement
function V2e(e) {
  let n = getCurrentCallId();
  if (n === void 0) return;
  if (e.some((r) => r.ccrTurnId !== n)) dropCcrTurnId();
}
//@ chunk-e6aww6q8.js:3286707-3286763 placement
function t8n(e, { isRelayHuman: isRelayHuman }) {
  return isRelayHuman ? readTurnIdField(e) : void 0;
}
/**
 * 由服务器投递且会话持有云浏览器时，取出入站消息中的 CCR 回合 id。
 */
//@ chunk-e6aww6q8.js:3286763-3286875 placement
function cloudBrowserTurnId(
  e,
  { deliveredByServer: deliveredByServer, holdsCloudBrowser: holdsCloudBrowser },
) {
  let s = deliveredByServer ? readTurnIdField(e) : void 0;
  return s !== void 0 && holdsCloudBrowser() ? s : void 0;
}
//@ chunk-e6aww6q8.js:3286875-3286911 placement
function n8n(e) {
  if (e.length > 0) dropCcrTurnId();
}
//@ chunk-e6aww6q8.js:3286911-3286995 placement
function $4s(e) {
  let n = e[0]?.ccrTurnId;
  return e.every((r) => r.ccrTurnId === n) ? n : void 0;
}
//@ chunk-e6aww6q8.js:3286995-3287189 placement
function readTurnIdField(e) {
  if (typeof e !== "object" || e === null || !("turn_id" in e) || !Object.hasOwn(e, "turn_id")) return;
  let turn_id = e.turn_id;
  if (typeof turn_id !== "string" || turn_id === "" || turn_id.length > HAr || !BAr.test(turn_id)) return;
  return turn_id;
}

export { getCurrentCallId, X_CCR_TURN_ID, H4s, L4s, t8n, V2e, dropCcrTurnId, n8n, $4s, cloudBrowserTurnId };

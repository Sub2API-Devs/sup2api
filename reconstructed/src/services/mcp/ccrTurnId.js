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
import { AsyncLocalStorage } from "async_hooks";
import { logError } from "../../utils/log.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";

//@ chunk-e6aww6q8.js:3286160-3286225 placement
/**
 * 保存当前 CCR 回合 id 的 AsyncLocalStorage。
 */
var X_CCR_TURN_ID = "X-CCR-Turn-Id";
var MAX_TURN_ID_CHARS = 128;
var PRINTABLE_ASCII_RE = /^[\x21-\x7e]+$/;
var turnIdStorage = new AsyncLocalStorage();
//@ chunk-e6aww6q8.js:3286225-3286268 placement
/**
 * 在给定回合 id 下执行函数。
 */
function runWithCcrTurnId(id, n) {
  return turnIdStorage.run(
    {
      id,
    },
    n,
  );
}
//@ chunk-e6aww6q8.js:3286268-3286363 placement
/**
 * 在给定回合 id 下执行异步函数，结束时可丢弃 id。
 */
async function runWithDroppableTurnId(id, n, onDropped) {
  let s = {
    id,
    onDropped,
  };
  try {
    await turnIdStorage.run(s, n);
  } finally {
    s.id = undefined;
  }
}
//@ chunk-e6aww6q8.js:3286363-3286404 placement = getAgentContext (1)
/**
 * 当前调用的 id（ALS），用途未完全确认。
 */
function getCurrentCallId() {
  return turnIdStorage.getStore()?.id;
}
//@ chunk-e6aww6q8.js:3286404-3286620 placement
/**
 * 丢弃当前 CCR 回合 id，并通知注册的丢弃监听器（监听器出错时记录错误）。
 */
function dropCcrTurnId() {
  let e = turnIdStorage.getStore();
  if (e?.id === undefined) return;
  e.id = undefined;
  try {
    e.onDropped?.();
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
/**
 * 消息的回合 id 与当前不一致时丢弃当前 id。
 */
function checkTurnIdsConsistent(e) {
  let currentCallId = getCurrentCallId();
  if (currentCallId === undefined) return;
  if (e.some((r) => r.ccrTurnId !== currentCallId)) dropCcrTurnId();
}
//@ chunk-e6aww6q8.js:3286707-3286763 placement
/**
 * 只有中继人类消息时才取回合 id 字段。
 */
function pickTurnIdForRelay(e, { isRelayHuman }) {
  return isRelayHuman ? readTurnIdField(e) : undefined;
}
//@ chunk-e6aww6q8.js:3286763-3286875 placement
/**
 * 由服务器投递且会话持有云浏览器时，取出入站消息中的 CCR 回合 id。
 */
function cloudBrowserTurnId(e, { deliveredByServer, holdsCloudBrowser }) {
  let s = deliveredByServer ? readTurnIdField(e) : undefined;
  return s !== undefined && holdsCloudBrowser() ? s : undefined;
}
//@ chunk-e6aww6q8.js:3286875-3286911 placement
/**
 * 有消息时丢弃当前回合 id。
 */
function dropIfAnyMessages(e) {
  if (e.length > 0) dropCcrTurnId();
}
//@ chunk-e6aww6q8.js:3286911-3286995 placement
/**
 * 取一组消息共同的回合 id（不一致返回 undefined）。
 */
function commonTurnId(e) {
  let ccrTurnId = e[0]?.ccrTurnId;
  return e.every((r) => r.ccrTurnId === ccrTurnId) ? ccrTurnId : undefined;
}
//@ chunk-e6aww6q8.js:3286995-3287189 placement
function readTurnIdField(e) {
  if (typeof e !== "object" || e === null || !("turn_id" in e) || !Object.hasOwn(e, "turn_id")) return;
  let turnId = e.turn_id;
  if (
    typeof turnId !== "string" ||
    turnId === "" ||
    turnId.length > MAX_TURN_ID_CHARS ||
    !PRINTABLE_ASCII_RE.test(turnId)
  )
    return;
  return turnId;
}
export {
  getCurrentCallId,
  X_CCR_TURN_ID,
  runWithDroppableTurnId,
  runWithCcrTurnId,
  pickTurnIdForRelay,
  checkTurnIdsConsistent,
  dropCcrTurnId,
  dropIfAnyMessages,
  commonTurnId,
  cloudBrowserTurnId,
};

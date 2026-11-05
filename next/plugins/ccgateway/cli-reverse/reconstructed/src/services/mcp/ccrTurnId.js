/**
 * services/mcp/ccrTurnId.ts
 *
 * 2.1.316 新增：云会话（CCR）回合 id 传给 MCP 服务器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7kayq7nc.js (25)
 * attribution: placement 8, layout 17
 */
import { AsyncLocalStorage } from "async_hooks";
import { logError } from "../../utils/log.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { READNOTIFICATIONS } from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7kayq7nc.js:179344-179433 placement
/**
 * 保存当前 CCR 回合 id 的 AsyncLocalStorage。
 */
var X_CCR_TURN_ID; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_TURN_ID_CHARS;
var PRINTABLE_ASCII_RE;
var TURN_ID_RE;
var turnIdStorage;
deferInit("chunk-7kayq7nc.js:179344", () => {
  X_CCR_TURN_ID = "X-CCR-Turn-Id";
  MAX_TURN_ID_CHARS = 128;
  PRINTABLE_ASCII_RE = /^[\x21-\x7e]+$/;
  TURN_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
  turnIdStorage = new AsyncLocalStorage();
});
//@ chunk-7kayq7nc.js:179433-179698 layout
function runWithTurnId(id, commandResult, ccrProgramUseCaseId) {
  let store = {
    id,
    programUseCaseId: ccrProgramUseCaseId,
  };
  let result;
  try {
    result = turnIdStorage.run(store, commandResult);
  } catch (error) {
    store.programUseCaseId = undefined;
    throw error;
  }
  if (ccrProgramUseCaseId !== undefined)
    if (result instanceof Promise)
      result.then(
        () => {
          store.programUseCaseId = undefined;
        },
        () => {
          store.programUseCaseId = undefined;
        },
      );
    else store.programUseCaseId = undefined;
  return result;
}
//@ chunk-7kayq7nc.js:179698-179839 layout
async function runAsyncWithTurnId(id, run, onDropped, programUseCaseId) {
  let store = {
    id,
    onDropped,
    programUseCaseId,
  };
  try {
    await turnIdStorage.run(store, run);
  } finally {
    store.id = undefined;
    store.programUseCaseId = undefined;
  }
}
//@ chunk-7kayq7nc.js:179839-179879 placement
/**
 * 当前调用的 id（ALS），用途未完全确认。
 */
function getCurrentCallId() {
  return turnIdStorage.getStore()?.id;
}
//@ chunk-7kayq7nc.js:179879-179972 layout
function dropTurnId(reason = "cause_not_given") {
  let store = turnIdStorage.getStore();
  if (store) {
    store.programUseCaseId = undefined;
    notifyDroppedTurnId(store, reason);
  }
}
//@ chunk-7kayq7nc.js:179972-180169 layout
function notifyDroppedTurnId(store, reason) {
  if (store.id === undefined) return;
  store.id = undefined;
  try {
    store.onDropped?.(reason);
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `the listener for a dropped CCR turn id threw: ${errorMessage(error)}`,
        "the listener for a dropped CCR turn id threw",
      ),
    );
  }
}
//@ chunk-7kayq7nc.js:180169-180200 layout
var turnHeardState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7kayq7nc.js:180169", () => {
  turnHeardState = new HostScoped(() => ({
    heard: false,
  }));
});
//@ chunk-7kayq7nc.js:180200-180240 layout
function noteTurnHeard() {
  turnHeardState.of(getRootSession().host).heard = true;
}
//@ chunk-7kayq7nc.js:180240-180304 layout
function isPeerOrigin(origin) {
  return origin?.kind === "peer" && origin.senderTaskId === undefined;
}
//@ chunk-7kayq7nc.js:180304-180692 layout
function messagesHeard(messages, portCheck) {
  let seenNames = [];
  if (
    messages.some((message) => {
      let content = message.message?.content;
      return (
        isPeerOrigin(message.origin) ||
        (message.type === "user" && portCheck(content) !== undefined) ||
        message.attachment?.type === "teammate_mailbox" ||
        (message.attachment?.type === "queued_command" &&
          (isPeerOrigin(message.attachment.origin) || portCheck(message.attachment.prompt) !== undefined)) ||
        (message.type === "assistant" &&
          Array.isArray(content) &&
          content.some(
            (block) =>
              block?.type === "tool_use" &&
              block.name !== undefined &&
              [READNOTIFICATIONS, ...seenNames].includes(block.name),
          ))
      );
    })
  )
    noteTurnHeard();
}
//@ chunk-7kayq7nc.js:180692-180732 layout
function resetTurnHeard() {
  turnHeardState.of(getRootSession().host).heard = false;
}
//@ chunk-7kayq7nc.js:180732-180828 layout
function allPeerOrigins(keptMessages) {
  if (
    !keptMessages.every((relay) => relay.origin?.kind === "peer" && relay.origin.senderTaskId !== undefined)
  )
    noteTurnHeard();
}
//@ chunk-7kayq7nc.js:180828-180924 layout
function hasForeignOrigin(session) {
  if (
    session.some(
      (config) =>
        isPeerOrigin(config.origin) || config.foreignWord !== undefined || config.quotesOthers === true,
    )
  )
    noteTurnHeard();
}
//@ chunk-7kayq7nc.js:180924-181027 layout
function currentProgramUseCaseId() {
  let programUseCaseId = turnIdStorage.getStore()?.programUseCaseId;
  return programUseCaseId === undefined || turnHeardState.of(getRootSession().host).heard
    ? undefined
    : programUseCaseId;
}
//@ chunk-7kayq7nc.js:181027-181129 layout
function dropProgramUseCaseId(serverName) {
  let cache = turnIdStorage.getStore();
  if (cache) {
    cache.modelsRefusingStamp ??= new Set();
    cache.modelsRefusingStamp.add(serverName);
  }
}
//@ chunk-7kayq7nc.js:181129-181198 layout
function isModelRefusing(serverName) {
  return turnIdStorage.getStore()?.modelsRefusingStamp?.has(serverName) ?? false;
}
//@ chunk-7kayq7nc.js:181198-181263 layout
function clearProgramUseCaseId() {
  let servers = turnIdStorage.getStore();
  if (servers) servers.programUseCaseId = undefined;
}
//@ chunk-7kayq7nc.js:181263-181524 placement
/**
 * 消息的回合 id 与当前不一致时丢弃当前 id。
 */
function checkTurnIdsConsistent(messages) {
  hasForeignOrigin(messages);
  let rows = currentProgramUseCaseId();
  if (
    rows !== undefined &&
    messages.some((message) => message.ccrProgramUseCaseId !== rows && message.ownTaskUseCase !== rows)
  )
    clearProgramUseCaseId();
  let filtered = turnIdStorage.getStore();
  let id = filtered?.id;
  if (filtered !== undefined && id !== undefined && messages.some((message) => message.ccrTurnId !== id))
    notifyDroppedTurnId(
      filtered,
      messages.some((message) => message.ccrTurnId === undefined) ? "no_id" : "another_id",
    );
}
//@ chunk-7kayq7nc.js:181524-181579 placement
/**
 * 只有中继人类消息时才取回合 id 字段。
 */
function pickTurnIdForRelay(message, { isRelayHuman }) {
  return isRelayHuman ? readTurnIdField(message) : undefined;
}
//@ chunk-7kayq7nc.js:181579-181690 placement
/**
 * 由服务器投递且会话持有云浏览器时，取出入站消息中的 CCR 回合 id。
 */
function cloudBrowserTurnId(message, { deliveredByServer, holdsCloudBrowser }) {
  let turnId = deliveredByServer ? readTurnIdField(message) : undefined;
  return turnId !== undefined && holdsCloudBrowser() ? turnId : undefined;
}
//@ chunk-7kayq7nc.js:181690-181748 placement
/**
 * 有消息时丢弃当前回合 id。
 */
function dropIfAnyMessages(messages) {
  if (messages.length > 0) dropTurnId("cross_sender_content");
}
//@ chunk-7kayq7nc.js:181748-181832 placement
/**
 * 取一组消息共同的回合 id（不一致返回 undefined）。
 */
function commonTurnId(messages) {
  let ccrTurnId = messages[0]?.ccrTurnId;
  return messages.every((message) => message.ccrTurnId === ccrTurnId) ? ccrTurnId : undefined;
}
//@ chunk-7kayq7nc.js:181832-181936 layout
function sharedTurnId(serverName) {
  let ccrProgramUseCaseId = serverName[0]?.ccrProgramUseCaseId;
  return serverName.every((config) => config.ccrProgramUseCaseId === ccrProgramUseCaseId)
    ? ccrProgramUseCaseId
    : undefined;
}
//@ chunk-7kayq7nc.js:181936-182158 layout
function commonProgramUseCaseId(message, { ownerTyped }) {
  if (
    !ownerTyped ||
    typeof message !== "object" ||
    message === null ||
    !("program_use_case_id" in message) ||
    !Object.hasOwn(message, "program_use_case_id")
  )
    return;
  let programUseCaseId = message.program_use_case_id;
  return typeof programUseCaseId === "string" && TURN_ID_RE.test(programUseCaseId)
    ? programUseCaseId
    : undefined;
}
//@ chunk-7kayq7nc.js:182158-182349 placement
function readTurnIdField(message) {
  if (
    typeof message !== "object" ||
    message === null ||
    !("turn_id" in message) ||
    !Object.hasOwn(message, "turn_id")
  )
    return;
  let turnId = message.turn_id;
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
  dropProgramUseCaseId,
  messagesHeard,
  hasForeignOrigin,
  runWithTurnId,
  pickTurnIdForRelay,
  getCurrentCallId,
  X_CCR_TURN_ID,
  dropIfAnyMessages,
  noteTurnHeard,
  commonTurnId,
  sharedTurnId,
  checkTurnIdsConsistent,
  dropTurnId,
  allPeerOrigins,
  runAsyncWithTurnId,
  cloudBrowserTurnId,
  commonProgramUseCaseId,
  TURN_ID_RE,
  currentProgramUseCaseId,
  isModelRefusing,
  clearProgramUseCaseId,
  resetTurnHeard,
};

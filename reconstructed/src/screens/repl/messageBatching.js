/**
 * screens/repl/messageBatching.ts
 *
 * 2.1.316 新增。消息批量更新。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 8
 */
import { isUserTextPrompt } from "../../utils/messages.js";
import { fileHistoryMakeSnapshot, reduceFileHistoryState } from "../../utils/fileHistory.js";
import { $f, Up, e7n, REt, getRetainedPastedContents } from "../../utils/messageQueueManager.js";
import { createAbortController } from "../../utils/abortController.js";
import { b7e, hasThirdPartyPromptHooks, _Io } from "../../utils/processUserInput/userPromptSubmitHooks.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isAbortError } from "../../utils/errors.js";
import { mergeTurnTags } from "../../utils/userTurnTags.js";
import { recordSubmittedPrompts } from "../../history.js";
import { withExpandedPastes } from "../../utils/hooks/postSamplingHooks.js";
import { logError } from "../../utils/log.js";

/**
 * 生成文件历史快照函数：先为同批的其他用户提示做快照。
 */
//@ chunk-18hwfzwa.js:1493732-1494053 placement
function snapshotBatchSiblings({
  baseMakeFileHistorySnapshot: baseMakeFileHistorySnapshot,
  batchMessages: batchMessages,
  preSnapshottedSiblings: preSnapshottedSiblings,
  getAppState: getAppState,
  setAppState: setAppState,
  storageV5: storageV5,
}) {
  return async (Re) => {
    for (let Be of batchMessages.filter(isUserTextPrompt)) {
      if (Be.uuid === Re || preSnapshottedSiblings.has(Be.uuid)) continue;
      (preSnapshottedSiblings.add(Be.uuid),
        await makeFileHistorySnapshot({
          getAppState: getAppState,
          setAppState: setAppState,
          messageUuid: Be.uuid,
          storageV5: storageV5,
        }));
    }
    await baseMakeFileHistorySnapshot(Re);
  };
}
/**
 * 批量期间把追加/替换/插入消息的操作缓冲到批次中。
 */
//@ chunk-18hwfzwa.js:1494053-1494614 placement
function createBatchedMessageOp({
  baseApplyMessageOp: baseApplyMessageOp,
  batchMessages: batchMessages,
  isBatchHandedOff: isBatchHandedOff,
  buffered: buffered,
}) {
  return (ee) => {
    let ke = batchMessages.length > 0 && !isBatchHandedOff();
    if (ke && ee.type === "append") {
      batchMessages.push(...ee.messages);
      for (let message of ee.messages) buffered.add(message.uuid);
      return;
    }
    if (ke && ee.type === "replace-by-uuid") {
      let index = batchMessages.findIndex((Be) => Be.uuid === ee.uuid);
      if (index !== -1) {
        if (((batchMessages[index] = ee.message), buffered.delete(ee.uuid))) buffered.add(ee.message.uuid);
        return;
      }
    }
    if (ke && ee.type === "insert-after-uuid") {
      let index = batchMessages.findIndex((Be) => Be.uuid === ee.uuid);
      if (index !== -1) {
        batchMessages.splice(index + 1, 0, ...ee.messages);
        for (let message of ee.messages) buffered.add(message.uuid);
        return;
      }
    }
    baseApplyMessageOp(ee);
  };
}
/**
 * 为某条消息做文件历史快照并写回应用状态。
 */
//@ chunk-18hwfzwa.js:1494614-1494829 placement
function makeFileHistorySnapshot({
  getAppState: getAppState,
  setAppState: setAppState,
  messageUuid: messageUuid,
  storageV5: storageV5,
}) {
  return fileHistoryMakeSnapshot(
    () => getAppState().fileHistory,
    (ee) =>
      setAppState((ke) => {
        let Re = reduceFileHistoryState(ke.fileHistory, ee, storageV5);
        if (Re === ke.fileHistory) return ke;
        return { ...ke, fileHistory: Re };
      }),
    messageUuid,
  );
}
/**
 * 命令队列中没有可执行的用户提示。
 */
//@ chunk-18hwfzwa.js:1494829-1494937 placement
function isQueueFreeOfPrompts(h, x) {
  return !h.getCommandQueue().some((D) => $f(D) && Up(D) && (x === void 0 || D.ideSelection === void 0));
}
/**
 * 是否有 prompt.submit 钩子（读取失败时视为有）。
 */
//@ chunk-18hwfzwa.js:1494937-1495168 placement
function hasPromptSubmitHooks(h, x, D, L = "any") {
  try {
    let toolUseContext = h.buildToolUseContext(x, [], createAbortController(), D);
    return L === "installed"
      ? b7e(toolUseContext).hooks !== "" || hasThirdPartyPromptHooks()
      : _Io(toolUseContext);
  } catch (error) {
    return (
      logForDebugging(`prompt.submit at Enter could not read the hooks: ${errorMessage(error)}`, {
        level: "error",
      }),
      !0
    );
  }
}
/**
 * 被丢弃的输入放回输入框（含粘贴内容）。
 */
//@ chunk-18hwfzwa.js:1495168-1495281 placement
function restoreDroppedInput(h, x) {
  if (!e7n(h)) return;
  x.land(REt(h), h);
  let D = getRetainedPastedContents(h);
  if (D.length > 0) x.setPastedContents((L) => mergeTurnTags(L, D));
}
/**
 * 延迟写入一条历史记录（只写一次）。
 */
//@ chunk-18hwfzwa.js:1495281-1495463 placement
function deferredHistoryWrite(h, x) {
  let D = !1;
  return (L) => {
    if (D) return;
    D = !0;
    try {
      recordSubmittedPrompts([h], x, { placed: withExpandedPastes, screened: new Map([[h, L]]) });
    } catch (error) {
      if (isAbortError(error)) logForDebugging(`a deferred line's write: ${errorMessage(error)}`);
      else logError(error);
    }
  };
}
/**
 * 写入被扣留的历史记录，被丢弃时放回输入框。
 */
//@ chunk-18hwfzwa.js:1495463-1495627 placement
function writeHeldHistory({
  cmd: cmd,
  screened: screened,
  held: held,
  storageV5: storageV5,
  composer: composer,
}) {
  if (!held.delete(cmd)) return;
  if (
    (recordSubmittedPrompts([cmd], storageV5, {
      placed: withExpandedPastes,
      screened: new Map([[cmd, screened]]),
    }),
    screened.dropped === !0)
  )
    restoreDroppedInput(cmd, composer);
}

export {
  hasPromptSubmitHooks,
  isQueueFreeOfPrompts,
  snapshotBatchSiblings,
  createBatchedMessageOp,
  writeHeldHistory,
  deferredHistoryWrite,
  makeFileHistorySnapshot,
  restoreDroppedInput,
};

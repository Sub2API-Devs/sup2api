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
import {
  isMainAgentCommand,
  isRefillableInput,
  isReplayableHistoryEntry,
  inputDisplayText,
  getRetainedPastedContents,
} from "../../utils/messageQueueManager.js";
import { createAbortController } from "../../utils/abortController.js";
import {
  hooksSnapshotKey,
  hasThirdPartyPromptHooks,
  hasPromptSubmitHooks as hasPromptSubmitHooks_2,
} from "../../utils/processUserInput/userPromptSubmitHooks.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isAbortError } from "../../utils/errors.js";
import { mergeTurnTags } from "../../utils/userTurnTags.js";
import { recordSubmittedPrompts } from "../../history.js";
import { withExpandedPastes } from "../../utils/hooks/postSamplingHooks.js";
import { logError } from "../../utils/log.js";

//@ chunk-18hwfzwa.js:1493732-1494053 placement
/**
 * 生成文件历史快照函数：先为同批的其他用户提示做快照。
 */
function snapshotBatchSiblings({
  baseMakeFileHistorySnapshot,
  batchMessages,
  preSnapshottedSiblings,
  getAppState,
  setAppState,
  storageV5,
}) {
  return async (Re) => {
    for (let batchMessage of batchMessages.filter(isUserTextPrompt)) {
      if (batchMessage.uuid === Re || preSnapshottedSiblings.has(batchMessage.uuid)) continue;
      preSnapshottedSiblings.add(batchMessage.uuid);
      await makeFileHistorySnapshot({
        getAppState,
        setAppState,
        messageUuid: batchMessage.uuid,
        storageV5,
      });
    }
    await baseMakeFileHistorySnapshot(Re);
  };
}
//@ chunk-18hwfzwa.js:1494053-1494614 placement
/**
 * 批量期间把追加/替换/插入消息的操作缓冲到批次中。
 */
function createBatchedMessageOp({ baseApplyMessageOp, batchMessages, isBatchHandedOff, buffered }) {
  return (ee) => {
    let ke = batchMessages.length > 0 && !isBatchHandedOff();
    if (ke && ee.type === "append") {
      batchMessages.push(...ee.messages);
      for (let message of ee.messages) buffered.add(message.uuid);
      return;
    }
    if (ke && ee.type === "replace-by-uuid") {
      let index = batchMessages.findIndex((batchMessage) => batchMessage.uuid === ee.uuid);
      if (index !== -1) {
        batchMessages[index] = ee.message;
        if (buffered.delete(ee.uuid)) buffered.add(ee.message.uuid);
        return;
      }
    }
    if (ke && ee.type === "insert-after-uuid") {
      let index = batchMessages.findIndex((batchMessage) => batchMessage.uuid === ee.uuid);
      if (index !== -1) {
        batchMessages.splice(index + 1, 0, ...ee.messages);
        for (let message of ee.messages) buffered.add(message.uuid);
        return;
      }
    }
    baseApplyMessageOp(ee);
  };
}
//@ chunk-18hwfzwa.js:1494614-1494829 placement
/**
 * 为某条消息做文件历史快照并写回应用状态。
 */
function makeFileHistorySnapshot({ getAppState, setAppState, messageUuid, storageV5 }) {
  return fileHistoryMakeSnapshot(
    () => getAppState().fileHistory,
    (ee) =>
      setAppState((ke) => {
        let Re = reduceFileHistoryState(ke.fileHistory, ee, storageV5);
        if (Re === ke.fileHistory) return ke;
        return {
          ...ke,
          fileHistory: Re,
        };
      }),
    messageUuid,
  );
}
//@ chunk-18hwfzwa.js:1494829-1494937 placement
/**
 * 命令队列中没有可执行的用户提示。
 */
function isQueueFreeOfPrompts(h, ideSelection) {
  return !h
    .getCommandQueue()
    .some(
      (D) =>
        isMainAgentCommand(D) &&
        isRefillableInput(D) &&
        (ideSelection === undefined || D.ideSelection === undefined),
    );
}
//@ chunk-18hwfzwa.js:1494937-1495168 placement
/**
 * 是否有 prompt.submit 钩子（读取失败时视为有）。
 */
function hasPromptSubmitHooks(turn, x, D, L = "any") {
  try {
    let toolUseContext = turn.buildToolUseContext(x, [], createAbortController(), D);
    return L === "installed"
      ? hooksSnapshotKey(toolUseContext).hooks !== "" || hasThirdPartyPromptHooks()
      : hasPromptSubmitHooks_2(toolUseContext);
  } catch (error) {
    logForDebugging(`prompt.submit at Enter could not read the hooks: ${errorMessage(error)}`, {
      level: "error",
    });
    return true;
  }
}
//@ chunk-18hwfzwa.js:1495168-1495281 placement
/**
 * 被丢弃的输入放回输入框（含粘贴内容）。
 */
function restoreDroppedInput(h, composer) {
  if (!isReplayableHistoryEntry(h)) return;
  composer.land(inputDisplayText(h), h);
  let retainedPastedContents = getRetainedPastedContents(h);
  if (retainedPastedContents.length > 0)
    composer.setPastedContents((L) => mergeTurnTags(L, retainedPastedContents));
}
//@ chunk-18hwfzwa.js:1495281-1495463 placement
/**
 * 延迟写入一条历史记录（只写一次）。
 */
function deferredHistoryWrite(h, storageV5) {
  let D = false;
  return (L) => {
    if (D) return;
    D = true;
    try {
      recordSubmittedPrompts([h], storageV5, {
        placed: withExpandedPastes,
        screened: new Map([[h, L]]),
      });
    } catch (error) {
      if (isAbortError(error)) logForDebugging(`a deferred line's write: ${errorMessage(error)}`);
      else logError(error);
    }
  };
}
//@ chunk-18hwfzwa.js:1495463-1495627 placement
/**
 * 写入被扣留的历史记录，被丢弃时放回输入框。
 */
function writeHeldHistory({ cmd, screened, held, storageV5, composer }) {
  if (!held.delete(cmd)) return;
  recordSubmittedPrompts([cmd], storageV5, {
    placed: withExpandedPastes,
    screened: new Map([[cmd, screened]]),
  });
  if (screened.dropped === true) restoreDroppedInput(cmd, composer);
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

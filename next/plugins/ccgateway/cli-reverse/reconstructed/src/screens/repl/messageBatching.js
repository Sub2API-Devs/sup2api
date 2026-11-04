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
  return async (op) => {
    for (let batchMessage of batchMessages.filter(isUserTextPrompt)) {
      if (batchMessage.uuid === op || preSnapshottedSiblings.has(batchMessage.uuid)) continue;
      preSnapshottedSiblings.add(batchMessage.uuid);
      await makeFileHistorySnapshot({
        getAppState,
        setAppState,
        messageUuid: batchMessage.uuid,
        storageV5,
      });
    }
    await baseMakeFileHistorySnapshot(op);
  };
}
//@ chunk-18hwfzwa.js:1494053-1494614 placement
/**
 * 批量期间把追加/替换/插入消息的操作缓冲到批次中。
 */
function createBatchedMessageOp({ baseApplyMessageOp, batchMessages, isBatchHandedOff, buffered }) {
  return (op) => {
    let canBatch = batchMessages.length > 0 && !isBatchHandedOff();
    if (canBatch && op.type === "append") {
      batchMessages.push(...op.messages);
      for (let message of op.messages) buffered.add(message.uuid);
      return;
    }
    if (canBatch && op.type === "replace-by-uuid") {
      let index = batchMessages.findIndex((batchMessage) => batchMessage.uuid === op.uuid);
      if (index !== -1) {
        batchMessages[index] = op.message;
        if (buffered.delete(op.uuid)) buffered.add(op.message.uuid);
        return;
      }
    }
    if (canBatch && op.type === "insert-after-uuid") {
      let index = batchMessages.findIndex((batchMessage) => batchMessage.uuid === op.uuid);
      if (index !== -1) {
        batchMessages.splice(index + 1, 0, ...op.messages);
        for (let message of op.messages) buffered.add(message.uuid);
        return;
      }
    }
    baseApplyMessageOp(op);
  };
}
//@ chunk-18hwfzwa.js:1494614-1494829 placement
/**
 * 为某条消息做文件历史快照并写回应用状态。
 */
function makeFileHistorySnapshot({ getAppState, setAppState, messageUuid, storageV5 }) {
  return fileHistoryMakeSnapshot(
    () => getAppState().fileHistory,
    (nextFileHistory) =>
      setAppState((state) => {
        let fileHistory = reduceFileHistoryState(state.fileHistory, nextFileHistory, storageV5);
        if (fileHistory === state.fileHistory) return state;
        return {
          ...state,
          fileHistory,
        };
      }),
    messageUuid,
  );
}
//@ chunk-18hwfzwa.js:1494829-1494937 placement
/**
 * 命令队列中没有可执行的用户提示。
 */
function isQueueFreeOfPrompts(messageQueue, ideSelection) {
  return !messageQueue
    .getCommandQueue()
    .some(
      (command) =>
        isMainAgentCommand(command) &&
        isRefillableInput(command) &&
        (ideSelection === undefined || command.ideSelection === undefined),
    );
}
//@ chunk-18hwfzwa.js:1494937-1495168 placement
/**
 * 是否有 prompt.submit 钩子（读取失败时视为有）。
 */
function hasPromptSubmitHooks(turn, messages, options, mode = "any") {
  try {
    let context = turn.buildToolUseContext(messages, [], createAbortController(), options);
    return mode === "installed"
      ? hooksSnapshotKey(context).hooks !== "" || hasThirdPartyPromptHooks()
      : hasPromptSubmitHooks_2(context);
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
function restoreDroppedInput(entry, composer) {
  if (!isReplayableHistoryEntry(entry)) return;
  composer.land(inputDisplayText(entry), entry);
  let retainedPastedContents = getRetainedPastedContents(entry);
  if (retainedPastedContents.length > 0)
    composer.setPastedContents((pasted) => mergeTurnTags(pasted, retainedPastedContents));
}
//@ chunk-18hwfzwa.js:1495281-1495463 placement
/**
 * 延迟写入一条历史记录（只写一次）。
 */
function deferredHistoryWrite(entry, storageV5) {
  let written = false;
  return (screened) => {
    if (written) return;
    written = true;
    try {
      recordSubmittedPrompts([entry], storageV5, {
        placed: withExpandedPastes,
        screened: new Map([[entry, screened]]),
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

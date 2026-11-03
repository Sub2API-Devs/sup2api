/**
 * cli/print/transcriptLeaves.ts
 *
 * 2.1.316 新增：会话记录行加载与持久化检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (5)
 * attribution: placement 5
 */
import { stat } from "fs/promises";
import { findMessageIndex, isHeldMessageRecognitionOn } from "./queuedMessageUtils.js";
import {
  nextTurnStartIndex,
  isStopInterruption,
  isPartialAssistantRow,
  isRealAssistantReply,
  isTurnOpen,
} from "./transcriptChain.js";
import {
  isSyntheticApiErrorMessage,
  isTransientApiError,
  isToolResultMessage,
} from "../../utils/messages.js";
import { isSyntheticUserMessage, isOpenerUnanswered } from "./runningTurnRecord.js";
import { isInterruptMarkerRow } from "../../utils/transcript/deserialize.js";
import {
  getTranscriptPathForSession,
  getTranscriptStorageKey,
  loadTranscriptFile,
  MAX_TRANSCRIPT_READ_BYTES,
  doesMessageExistInSession,
  isMessageTurnUnanswered,
} from "../../utils/sessionStorage.js";
import { isDiskless, getSessionId } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { isClaudeAiChatOrigin } from "../../utils/entrypointKinds.js";
import { logError } from "../../utils/log.js";

//@ chunk-tyg7f3ek.js:50620-51236 placement
function foldedFollowUpEnd(e, n) {
  let messageIndex = findMessageIndex(e, n);
  if (e[messageIndex]?.type !== "attachment") return;
  let s = nextTurnStartIndex(e, messageIndex);
  let filtered = e
    .slice(messageIndex + 1, s === -1 ? undefined : s)
    .filter((w) => !("isSidechain" in w && w.isSidechain === true));
  let filtered_2 = filtered.filter(
    (w) =>
      (w.type === "user" || w.type === "assistant") &&
      !isSyntheticApiErrorMessage(w) &&
      !isSyntheticUserMessage(w),
  );
  let lastIndex = filtered.findLastIndex((w) => isSyntheticApiErrorMessage(w) || isInterruptMarkerRow(w));
  let last = filtered_2.at(-1);
  return {
    badEnd:
      last === undefined
        ? undefined
        : isStopInterruption(filtered_2, filtered_2.length - 1)
          ? "stopped"
          : isPartialAssistantRow(last)
            ? "reply_failed"
            : last.type === "assistant" && last.isApiErrorMessage === true
              ? "reply_refused"
              : undefined,
    failedTransiently:
      last?.type === "assistant" &&
      isPartialAssistantRow(last) &&
      (isTransientApiError(last) || last.streamWatchdogGaveUp === true),
    claudesRowBehind: filtered_2.some(isRealAssistantReply),
    reRunsRowBehind:
      lastIndex !== -1 &&
      filtered.slice(lastIndex + 1).some((w) => isRealAssistantReply(w) || isToolResultMessage(w)),
  };
}
//@ chunk-tyg7f3ek.js:51236-51413 placement
async function loadSessionTranscriptRows(sessionId, storageV5) {
  let transcriptPathForSession = getTranscriptPathForSession(sessionId);
  let transcriptStorageKey = getTranscriptStorageKey(transcriptPathForSession, storageV5);
  let { messages } = await loadTranscriptFile(transcriptPathForSession, {
    keepAllLeaves:
      !isDiskless() &&
      (await stat(transcriptPathForSession).then(
        (y) => y.size <= MAX_TRANSCRIPT_READ_BYTES,
        () => false,
      )),
    ...(transcriptStorageKey && {
      storageV5: transcriptStorageKey,
    }),
  });
  return [...messages.values()];
}
//@ chunk-tyg7f3ek.js:51413-51950 placement
function createPersistenceChecker({ storageV5, heldInMemory }) {
  return () => {
    let sessionId = getSessionId();
    let s = (S) => doesMessageExistInSession(sessionId, S, storageV5);
    let h = async (S) => heldInMemory(S) && !(await s(S));
    let y = async (S) => {
      try {
        return S(await loadSessionTranscriptRows(sessionId, storageV5));
      } catch (error) {
        logForDebugging(
          `could not read the transcript for a message stored inside another row; it reads unanswered: ${error instanceof Error ? error.message : String(error)}`,
          {
            level: "error",
          },
        );
        return true;
      }
    };
    return {
      persisted: (S) => (isHeldMessageRecognitionOn() ? s(S).then((R) => R || heldInMemory(S)) : s(S)),
      turnUnanswered: (S) =>
        isHeldMessageRecognitionOn()
          ? h(S).then((R) =>
              R ? y((w) => isOpenerUnanswered(w, S)) : isMessageTurnUnanswered(sessionId, S, storageV5),
            )
          : isMessageTurnUnanswered(sessionId, S, storageV5),
      holdersTurnUnanswered: async (S) => ((await h(S)) ? y((R) => isTurnOpen(R, S) ?? true) : undefined),
    };
  };
}
//@ chunk-tyg7f3ek.js:51950-51996 placement
function chatOriginField() {
  return isClaudeAiChatOrigin()
    ? {
        chat_origin: true,
      }
    : {};
}
//@ chunk-tyg7f3ek.js:51996-52052 placement
function tryOr(e, n) {
  try {
    return e();
  } catch (error) {
    logError(error);
    return n;
  }
}
export { createPersistenceChecker, loadSessionTranscriptRows, tryOr, chatOriginField, foldedFollowUpEnd };

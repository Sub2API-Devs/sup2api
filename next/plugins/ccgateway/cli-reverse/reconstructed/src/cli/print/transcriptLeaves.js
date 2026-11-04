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
function foldedFollowUpEnd(entries, uuid) {
  let messageIndex = findMessageIndex(entries, uuid);
  if (entries[messageIndex]?.type !== "attachment") return;
  let nextTurn = nextTurnStartIndex(entries, messageIndex);
  let filtered = entries
    .slice(messageIndex + 1, nextTurn === -1 ? undefined : nextTurn)
    .filter((row) => !("isSidechain" in row && row.isSidechain === true));
  let rows = filtered.filter(
    (row) =>
      (row.type === "user" || row.type === "assistant") &&
      !isSyntheticApiErrorMessage(row) &&
      !isSyntheticUserMessage(row),
  );
  let lastIndex = filtered.findLastIndex(
    (row) => isSyntheticApiErrorMessage(row) || isInterruptMarkerRow(row),
  );
  let last = rows.at(-1);
  return {
    badEnd:
      last === undefined
        ? undefined
        : isStopInterruption(rows, rows.length - 1)
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
    claudesRowBehind: rows.some(isRealAssistantReply),
    reRunsRowBehind:
      lastIndex !== -1 &&
      filtered.slice(lastIndex + 1).some((row) => isRealAssistantReply(row) || isToolResultMessage(row)),
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
        (stats) => stats.size <= MAX_TRANSCRIPT_READ_BYTES,
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
    let isPersisted = (uuid) => doesMessageExistInSession(sessionId, uuid, storageV5);
    let isHeldUnpersisted = async (uuid) => heldInMemory(uuid) && !(await isPersisted(uuid));
    let readTranscript = async (check) => {
      try {
        return check(await loadSessionTranscriptRows(sessionId, storageV5));
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
      persisted: (uuid) =>
        isHeldMessageRecognitionOn()
          ? isPersisted(uuid).then((persisted) => persisted || heldInMemory(uuid))
          : isPersisted(uuid),
      turnUnanswered: (uuid) =>
        isHeldMessageRecognitionOn()
          ? isHeldUnpersisted(uuid).then((held) =>
              held
                ? readTranscript((rows) => isOpenerUnanswered(rows, uuid))
                : isMessageTurnUnanswered(sessionId, uuid, storageV5),
            )
          : isMessageTurnUnanswered(sessionId, uuid, storageV5),
      holdersTurnUnanswered: async (uuid) =>
        (await isHeldUnpersisted(uuid))
          ? readTranscript((rows) => isTurnOpen(rows, uuid) ?? true)
          : undefined,
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
function tryOr(fn, fallback) {
  try {
    return fn();
  } catch (error) {
    logError(error);
    return fallback;
  }
}
export { createPersistenceChecker, loadSessionTranscriptRows, tryOr, chatOriginField, foldedFollowUpEnd };

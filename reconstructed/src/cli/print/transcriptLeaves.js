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
import { stat, stat as stat_2, stat as stat_3 } from "fs/promises";
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
  let r = findMessageIndex(e, n);
  if (e[r]?.type !== "attachment") return;
  let s = nextTurnStartIndex(e, r),
    filtered = e
      .slice(r + 1, s === -1 ? void 0 : s)
      .filter((w) => !("isSidechain" in w && w.isSidechain === !0)),
    filtered_2 = filtered.filter(
      (w) =>
        (w.type === "user" || w.type === "assistant") &&
        !isSyntheticApiErrorMessage(w) &&
        !isSyntheticUserMessage(w),
    ),
    lastIndex = filtered.findLastIndex((w) => isSyntheticApiErrorMessage(w) || isInterruptMarkerRow(w)),
    at = filtered_2.at(-1);
  return {
    badEnd:
      at === void 0
        ? void 0
        : isStopInterruption(filtered_2, filtered_2.length - 1)
          ? "stopped"
          : isPartialAssistantRow(at)
            ? "reply_failed"
            : at.type === "assistant" && at.isApiErrorMessage === !0
              ? "reply_refused"
              : void 0,
    failedTransiently:
      at?.type === "assistant" &&
      isPartialAssistantRow(at) &&
      (isTransientApiError(at) || at.streamWatchdogGaveUp === !0),
    claudesRowBehind: filtered_2.some(isRealAssistantReply),
    reRunsRowBehind:
      lastIndex !== -1 &&
      filtered.slice(lastIndex + 1).some((w) => isRealAssistantReply(w) || isToolResultMessage(w)),
  };
}
//@ chunk-tyg7f3ek.js:51236-51413 placement
async function loadSessionTranscriptRows(e, n) {
  let r = getTranscriptPathForSession(e),
    s = getTranscriptStorageKey(r, n),
    { messages: messages } = await loadTranscriptFile(r, {
      keepAllLeaves:
        !isDiskless() &&
        (await stat(r).then(
          (y) => y.size <= MAX_TRANSCRIPT_READ_BYTES,
          () => !1,
        )),
      ...(s && { storageV5: s }),
    });
  return [...messages.values()];
}
//@ chunk-tyg7f3ek.js:51413-51950 placement
function createPersistenceChecker({ storageV5: storageV5, heldInMemory: heldInMemory }) {
  return () => {
    let r = getSessionId(),
      s = (S) => doesMessageExistInSession(r, S, storageV5),
      h = async (S) => heldInMemory(S) && !(await s(S)),
      y = async (S) => {
        try {
          return S(await loadSessionTranscriptRows(r, storageV5));
        } catch (error) {
          return (
            logForDebugging(
              `could not read the transcript for a message stored inside another row; it reads unanswered: ${error instanceof Error ? error.message : String(error)}`,
              { level: "error" },
            ),
            !0
          );
        }
      };
    return {
      persisted: (S) => (isHeldMessageRecognitionOn() ? s(S).then((R) => R || heldInMemory(S)) : s(S)),
      turnUnanswered: (S) =>
        isHeldMessageRecognitionOn()
          ? h(S).then((R) =>
              R ? y((w) => isOpenerUnanswered(w, S)) : isMessageTurnUnanswered(r, S, storageV5),
            )
          : isMessageTurnUnanswered(r, S, storageV5),
      holdersTurnUnanswered: async (S) => ((await h(S)) ? y((R) => isTurnOpen(R, S) ?? !0) : void 0),
    };
  };
}
//@ chunk-tyg7f3ek.js:51950-51996 placement
function chatOriginField() {
  return isClaudeAiChatOrigin() ? { chat_origin: !0 } : {};
}
//@ chunk-tyg7f3ek.js:51996-52052 placement
function tryOr(e, n) {
  try {
    return e();
  } catch (error) {
    return (logError(error), n);
  }
}

export { createPersistenceChecker, loadSessionTranscriptRows, tryOr, chatOriginField, foldedFollowUpEnd };

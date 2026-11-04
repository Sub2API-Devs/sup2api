/**
 * hooks/useLogMessages.ts
 *
 * 把消息变化增量写入会话日志（transcript 持久化）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useLogMessages.ts
 * pieces: chunk-18hwfzwa.js (6)
 * attribution: placement 5, fingerprint 1
 */
import { logEvent } from "../services/analytics/index.js";
import {
  isCompactBoundaryMessage as isCompactBoundaryMessage_2,
  findCompactBoundaryIndex,
} from "../services/projects/threadRows.js";
import {
  registerTranscriptExitDrain,
  isTranscriptPersistenceDisabled,
  transcriptCursorEnd,
  isLoggableMessage,
  collectReplIds,
  recordTranscript,
  cleanMessagesForLogging,
  isChainParticipant,
} from "../utils/sessionStorage.js";
import { mcpTaskEndingsSlots, lookMcpTaskEndings } from "../tasks/McpTask/mcpTaskEndings.js";
import { getCaps, getSessionId } from "../bootstrap/state.js";
import { createTranscriptSaver } from "../cli/print/rewindStandIn.js";
import { isAgentSwarmsEnabled } from "../utils/agentSwarmsEnabled.js";
import { lastPromptRestampSlot } from "../screens/repl/lastPromptTracker.js";
import { isReorderedRow } from "../utils/messages.js";
import { logError } from "../utils/log.js";
import { useSession } from "../context/session.js";
import { useAppState } from "../state/AppState.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useState, useRef, useEffect } from "../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1618469-1618508 placement
var UNSETTLED_REPLAY_STATE = {
  isReplayed: false,
  settled: undefined,
};
//@ chunk-18hwfzwa.js:1618508-1618685 placement
function logTranscriptParentWait({ startedAt, overtaken, next, exitWaited }, extra) {
  if (next !== undefined)
    logEvent("tengu_transcript_parent_wait", {
      write_ms: Date.now() - startedAt,
      snapshots_overtaken: overtaken,
      exit_waited: exitWaited,
      ...extra,
    });
}
//@ chunk-18hwfzwa.js:1618685-1618794 placement
function endsWithCompactBoundary(messages) {
  let last = messages.findLast(
    (message) =>
      message.type === "user" || message.type === "assistant" || isCompactBoundaryMessage_2(message),
  );
  return last !== undefined && isCompactBoundaryMessage_2(last);
}
//@ chunk-18hwfzwa.js:1618794-1618860 placement
function registerExitDrain(promise, wait) {
  let remove = registerTranscriptExitDrain(() => {
    wait.exitWaited = true;
    return promise;
  });
  promise.finally(remove);
}
//@ chunk-18hwfzwa.js:1618860-1622007 placement
/**
 * TranscriptRecorder：把 REPL 消息写入会话转录文件。
 */
class TranscriptRecorder {
  session;
  lastRecordedLength = 0;
  lastParentUuid = undefined;
  firstMessageUuid = undefined;
  lastTailUuid = undefined;
  lastLoggable = undefined;
  callSequence = 0;
  replIds = new Set();
  holdFloor = 0;
  held = undefined;
  parentWait = undefined;
  constructor(session) {
    this.session = session;
    mcpTaskEndingsSlots.of(session).savesWith({
      isOn: () => !isTranscriptPersistenceDisabled() && getCaps().transcriptSource !== "ccr-api",
      ...createTranscriptSaver(),
    });
  }
  record(messages, options) {
    this.write(messages, options);
  }
  write(messages, options) {
    let { ignore, headPending, isResponseInFlight, teamName, selfAgentName, storageV5 } = options;
    if (getCaps().transcriptSource === "ccr-api") return;
    if (headPending) {
      this.lastRecordedLength = 0;
      this.lastParentUuid = undefined;
      this.firstMessageUuid = undefined;
      this.lastTailUuid = undefined;
      this.lastLoggable = undefined;
      this.holdFloor = 0;
      this.callSequence++;
      let parentWait = this.parentWait;
      this.parentWait = undefined;
      this.held = {
        messages,
        sessionId: getSessionId(),
      };
      if (parentWait !== undefined)
        logTranscriptParentWait(parentWait, {
          cut_short: true,
          replayed: false,
        });
      return;
    }
    let held = this.held;
    if (held !== undefined) {
      if (
        held.sessionId !== getSessionId() &&
        messages.every((message, index) =>
          index < held.messages.length
            ? message.uuid === held.messages[index].uuid
            : message.type !== "user" && message.type !== "assistant",
        )
      )
        return;
      this.held = undefined;
    }
    if (ignore) {
      this.holdFloor = messages.length;
      return;
    }
    if (endsWithCompactBoundary(messages)) return;
    if (this.parentWait !== undefined) {
      this.parentWait.overtaken += this.parentWait.next === undefined ? 0 : 1;
      this.parentWait.next = {
        messages,
        options,
        sessionId: getSessionId(),
      };
      return;
    }
    let uuid = messages[0]?.uuid;
    let lastRecordedLength = this.lastRecordedLength;
    let isFirst = this.firstMessageUuid === undefined;
    let tailIntact =
      lastRecordedLength === 0 ||
      messages[lastRecordedLength - 1]?.uuid === this.lastTailUuid ||
      this.isNonLoggableTailIntact(messages, lastRecordedLength);
    let isAppend =
      uuid !== undefined &&
      !isFirst &&
      uuid === this.firstMessageUuid &&
      lastRecordedLength <= messages.length &&
      tailIntact;
    let isShrunk =
      uuid !== undefined &&
      !isFirst &&
      uuid === this.firstMessageUuid &&
      lastRecordedLength > messages.length;
    let start = isAppend ? lastRecordedLength : 0;
    let boundary = isAppend || isFirst ? this.holdFloor : findCompactBoundaryIndex(messages);
    let end = transcriptCursorEnd(messages, Math.max(start, boundary), isResponseInFlight);
    if (!isAppend) this.holdFloor = end;
    this.lastTailUuid = messages[end - 1]?.uuid;
    let lastLoggableIndex = end - 1;
    while (lastLoggableIndex >= start && !isLoggableMessage(messages[lastLoggableIndex])) lastLoggableIndex--;
    if (lastLoggableIndex >= start)
      this.lastLoggable = {
        index: lastLoggableIndex,
        uuid: messages[lastLoggableIndex].uuid,
      };
    else if (!isAppend) this.lastLoggable = undefined;
    if (end === start) {
      lookMcpTaskEndings(messages, end, this.session)?.(true);
      return;
    }
    let messages_2 = start === 0 && end === messages.length ? messages : messages.slice(start, end);
    let lastParentUuid = isAppend ? this.lastParentUuid : undefined;
    if (start === 0) this.replIds.clear();
    collectReplIds(messages_2, this.replIds);
    let isParentReusable = isAppend || isFirst || isShrunk;
    let waitState = isParentReusable
      ? undefined
      : {
          startedAt: Date.now(),
          overtaken: 0,
          next: undefined,
          exitWaited: false,
        };
    let sequence = ++this.callSequence;
    let onMcpTaskEndings = lookMcpTaskEndings(messages, end, this.session);
    let writePromise = recordTranscript(
      messages_2,
      isAgentSwarmsEnabled() && selfAgentName
        ? {
            teamName,
            agentName: selfAgentName,
          }
        : {},
      lastParentUuid,
      this.replIds,
      storageV5,
    ).then(
      (parentUuid) => {
        if (sequence === this.callSequence && parentUuid && !isAppend) this.lastParentUuid = parentUuid;
        lastPromptRestampSlot.peek(this.session)?.rowsQueued(messages_2);
        onMcpTaskEndings?.(true);
        return this.endParentWait(waitState, false);
      },
      (error) => {
        lastPromptRestampSlot.peek(this.session)?.writeFailed(messages_2);
        onMcpTaskEndings?.(false);
        this.endParentWait(waitState, true);
        throw error;
      },
    );
    this.parentWait = waitState;
    if (isParentReusable) {
      let last = cleanMessagesForLogging(messages_2, this.replIds).findLast(
        (message) => isChainParticipant(message) && !isReorderedRow(message.uuid),
      );
      if (last) this.lastParentUuid = last.uuid;
    }
    this.lastRecordedLength = end;
    this.firstMessageUuid = uuid;
    if (waitState !== undefined) registerExitDrain(writePromise, waitState);
    return writePromise;
  }
  endParentWait(wait, writeRejected) {
    if (wait === undefined || this.parentWait !== wait) return;
    this.parentWait = undefined;
    let { next } = wait;
    if (next === undefined) return;
    let { isReplayed, settled } =
      next.sessionId === getSessionId() ? this.replay(next) : UNSETTLED_REPLAY_STATE;
    logTranscriptParentWait(wait, {
      cut_short: false,
      replayed: isReplayed,
      write_rejected: writeRejected,
    });
    return settled;
  }
  replay({ messages, options }) {
    try {
      return {
        isReplayed: true,
        settled: this.write(messages, options),
      };
    } catch (error) {
      logError(error);
      return UNSETTLED_REPLAY_STATE;
    }
  }
  isNonLoggableTailIntact(messages, lastRecordedLength) {
    let lastLoggable = this.lastLoggable;
    if (lastLoggable !== undefined && messages[lastLoggable.index]?.uuid !== lastLoggable.uuid) return false;
    for (
      let start = lastLoggable === undefined ? 0 : lastLoggable.index + 1;
      start < lastRecordedLength;
      start++
    ) {
      let message = messages[start];
      if (message === undefined || isLoggableMessage(message)) return false;
    }
    return true;
  }
}
//@ chunk-18hwfzwa.js:1622007-1622704 fingerprint (2.1.88 match: useLogMessages, 0.317)
function useLogMessages(
  messages,
  ignore = false,
  isLoading = false,
  transcriptStore,
  headHooksPending = false,
) {
  let session = useSession();
  let teamContext = useAppState((appState) => appState.teamContext?.teamName);
  let lastRecordedLengthRef = useAppState((appState) => appState.teamContext?.selfAgentName);
  let { storageV5 } = useTheme_2();
  let [recorder] = useState(() => new TranscriptRecorder(session));
  let lastParentUuidRef = useRef(false);
  useEffect(() => {
    if (
      transcriptStore &&
      lastParentUuidRef.current &&
      messages !== transcriptStore.transcript.getPublished()
    )
      return;
    lastParentUuidRef.current = true;
    recorder.record(messages, {
      ignore,
      headPending: headHooksPending,
      isResponseInFlight: isLoading,
      teamName: teamContext,
      selfAgentName: lastRecordedLengthRef,
      storageV5,
    });
  }, [
    recorder,
    messages,
    ignore,
    headHooksPending,
    isLoading,
    teamContext,
    lastRecordedLengthRef,
    storageV5,
    transcriptStore,
  ]);
  useEffect(() => {
    if (!transcriptStore) return;
    return transcriptStore.transcript.subscribe(() => {
      if (!transcriptStore.isWritePaced()) return;
      try {
        let snapshot = transcriptStore.transcript.getSnapshot();
        recorder.record(snapshot, {
          ignore: transcriptStore.isRestored(snapshot),
          headPending: transcriptStore.isHeadPending(),
          isResponseInFlight: transcriptStore.isResponseInFlight(),
          teamName: teamContext,
          selfAgentName: lastRecordedLengthRef,
          storageV5,
        });
      } catch (error) {
        logError(error);
      }
    });
  }, [recorder, transcriptStore, teamContext, lastRecordedLengthRef, storageV5]);
}
export { useLogMessages };

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
import { y, R, P } from "../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1618469-1618508 placement
var UNSETTLED_REPLAY_STATE = {
  isReplayed: false,
  settled: undefined,
};
//@ chunk-18hwfzwa.js:1618508-1618685 placement
function logTranscriptParentWait({ startedAt, overtaken, next: D, exitWaited }, ee) {
  if (D !== undefined)
    logEvent("tengu_transcript_parent_wait", {
      write_ms: Date.now() - startedAt,
      snapshots_overtaken: overtaken,
      exit_waited: exitWaited,
      ...ee,
    });
}
//@ chunk-18hwfzwa.js:1618685-1618794 placement
function endsWithCompactBoundary(h) {
  let last = h.findLast((D) => D.type === "user" || D.type === "assistant" || isCompactBoundaryMessage_2(D));
  return last !== undefined && isCompactBoundaryMessage_2(last);
}
//@ chunk-18hwfzwa.js:1618794-1618860 placement
function registerExitDrain(h, x) {
  let D = registerTranscriptExitDrain(() => {
    x.exitWaited = true;
    return h;
  });
  h.finally(D);
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
  record(h, x) {
    this.write(h, x);
  }
  write(h, x) {
    let { ignore, headPending, isResponseInFlight, teamName, selfAgentName, storageV5 } = x;
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
        messages: h,
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
        h.every((co, bo) =>
          bo < held.messages.length
            ? co.uuid === held.messages[bo].uuid
            : co.type !== "user" && co.type !== "assistant",
        )
      )
        return;
      this.held = undefined;
    }
    if (ignore) {
      this.holdFloor = h.length;
      return;
    }
    if (endsWithCompactBoundary(h)) return;
    if (this.parentWait !== undefined) {
      this.parentWait.overtaken += this.parentWait.next === undefined ? 0 : 1;
      this.parentWait.next = {
        messages: h,
        options: x,
        sessionId: getSessionId(),
      };
      return;
    }
    let uuid = h[0]?.uuid;
    let lastRecordedLength = this.lastRecordedLength;
    let Xe = this.firstMessageUuid === undefined;
    let rt =
      lastRecordedLength === 0 ||
      h[lastRecordedLength - 1]?.uuid === this.lastTailUuid ||
      this.isNonLoggableTailIntact(h, lastRecordedLength);
    let kt =
      uuid !== undefined && !Xe && uuid === this.firstMessageUuid && lastRecordedLength <= h.length && rt;
    let At = uuid !== undefined && !Xe && uuid === this.firstMessageUuid && lastRecordedLength > h.length;
    let It = kt ? lastRecordedLength : 0;
    let Ot = kt || Xe ? this.holdFloor : findCompactBoundaryIndex(h);
    let Et = transcriptCursorEnd(h, Math.max(It, Ot), isResponseInFlight);
    if (!kt) this.holdFloor = Et;
    this.lastTailUuid = h[Et - 1]?.uuid;
    let Dt = Et - 1;
    while (Dt >= It && !isLoggableMessage(h[Dt])) Dt--;
    if (Dt >= It)
      this.lastLoggable = {
        index: Dt,
        uuid: h[Dt].uuid,
      };
    else if (!kt) this.lastLoggable = undefined;
    if (Et === It) {
      lookMcpTaskEndings(h, Et, this.session)?.(true);
      return;
    }
    let messages = It === 0 && Et === h.length ? h : h.slice(It, Et);
    let lastParentUuid = kt ? this.lastParentUuid : undefined;
    if (It === 0) this.replIds.clear();
    collectReplIds(messages, this.replIds);
    let Xt = kt || Xe || At;
    let io = Xt
      ? undefined
      : {
          startedAt: Date.now(),
          overtaken: 0,
          next: undefined,
          exitWaited: false,
        };
    let so = ++this.callSequence;
    let po = lookMcpTaskEndings(h, Et, this.session);
    let ao = recordTranscript(
      messages,
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
      (co) => {
        if (so === this.callSequence && co && !kt) this.lastParentUuid = co;
        lastPromptRestampSlot.peek(this.session)?.rowsQueued(messages);
        po?.(true);
        return this.endParentWait(io, false);
      },
      (error) => {
        lastPromptRestampSlot.peek(this.session)?.writeFailed(messages);
        po?.(false);
        this.endParentWait(io, true);
        throw error;
      },
    );
    this.parentWait = io;
    if (Xt) {
      let last = cleanMessagesForLogging(messages, this.replIds).findLast(
        (bo) => isChainParticipant(bo) && !isReorderedRow(bo.uuid),
      );
      if (last) this.lastParentUuid = last.uuid;
    }
    this.lastRecordedLength = Et;
    this.firstMessageUuid = uuid;
    if (io !== undefined) registerExitDrain(ao, io);
    return ao;
  }
  endParentWait(h, writeRejected) {
    if (h === undefined || this.parentWait !== h) return;
    this.parentWait = undefined;
    let { next: D } = h;
    if (D === undefined) return;
    let { isReplayed, settled } = D.sessionId === getSessionId() ? this.replay(D) : UNSETTLED_REPLAY_STATE;
    logTranscriptParentWait(h, {
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
  isNonLoggableTailIntact(h, x) {
    let lastLoggable = this.lastLoggable;
    if (lastLoggable !== undefined && h[lastLoggable.index]?.uuid !== lastLoggable.uuid) return false;
    for (let L = lastLoggable === undefined ? 0 : lastLoggable.index + 1; L < x; L++) {
      let ee = h[L];
      if (ee === undefined || isLoggableMessage(ee)) return false;
    }
    return true;
  }
}
//@ chunk-18hwfzwa.js:1622007-1622704 fingerprint = useLogMessages (0.317)
function useLogMessages(messages, x = false, isLoading = false, L, headHooksPending = false) {
  let session = useSession();
  let teamContext = useAppState((Xe) => Xe.teamContext?.teamName);
  let lastRecordedLengthRef = useAppState((Xe) => Xe.teamContext?.selfAgentName);
  let { storageV5 } = useTheme_2();
  let [We] = y(() => new TranscriptRecorder(session));
  let lastParentUuidRef = R(false);
  P(() => {
    if (L && lastParentUuidRef.current && messages !== L.transcript.getPublished()) return;
    lastParentUuidRef.current = true;
    We.record(messages, {
      ignore: x,
      headPending: headHooksPending,
      isResponseInFlight: isLoading,
      teamName: teamContext,
      selfAgentName: lastRecordedLengthRef,
      storageV5,
    });
  }, [We, messages, x, headHooksPending, isLoading, teamContext, lastRecordedLengthRef, storageV5, L]);
  P(() => {
    if (!L) return;
    return L.transcript.subscribe(() => {
      if (!L.isWritePaced()) return;
      try {
        let snapshot = L.transcript.getSnapshot();
        We.record(snapshot, {
          ignore: L.isRestored(snapshot),
          headPending: L.isHeadPending(),
          isResponseInFlight: L.isResponseInFlight(),
          teamName: teamContext,
          selfAgentName: lastRecordedLengthRef,
          storageV5,
        });
      } catch (error) {
        logError(error);
      }
    });
  }, [We, L, teamContext, lastRecordedLengthRef, storageV5]);
}
export { useLogMessages };

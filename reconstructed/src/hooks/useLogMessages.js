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
import { isCompactBoundaryMessage, zRe } from "../services/projects/threadRows.js";
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
import { Yze, lookMcpTaskEndings } from "../tasks/McpTask/mcpTaskEndings.js";
import { getCaps, getSessionId } from "../bootstrap/state.js";
import { createTranscriptSaver } from "../cli/print/rewindStandIn.js";
import { isAgentSwarmsEnabled } from "../utils/agentSwarmsEnabled.js";
import { oE } from "../screens/repl/lastPromptTracker.js";
import { OB } from "../utils/messages.js";
import { logError } from "../utils/log.js";
import { useSession } from "../context/session.js";
import { useAppState } from "../state/AppState.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { y, R, P } from "../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1618469-1618508 placement
var Cvt = { isReplayed: !1, settled: void 0 };
//@ chunk-18hwfzwa.js:1618508-1618685 placement
function logTranscriptParentWait(
  { startedAt: startedAt, overtaken: overtaken, next: D, exitWaited: exitWaited },
  ee,
) {
  if (D !== void 0)
    logEvent("tengu_transcript_parent_wait", {
      write_ms: Date.now() - startedAt,
      snapshots_overtaken: overtaken,
      exit_waited: exitWaited,
      ...ee,
    });
}
//@ chunk-18hwfzwa.js:1618685-1618794 placement
function endsWithCompactBoundary(h) {
  let last = h.findLast((D) => D.type === "user" || D.type === "assistant" || isCompactBoundaryMessage(D));
  return last !== void 0 && isCompactBoundaryMessage(last);
}
//@ chunk-18hwfzwa.js:1618794-1618860 placement
function P$o(h, x) {
  let D = registerTranscriptExitDrain(() => ((x.exitWaited = !0), h));
  h.finally(D);
}
/**
 * TranscriptRecorder：把 REPL 消息写入会话转录文件。
 */
//@ chunk-18hwfzwa.js:1618860-1622007 placement
class TranscriptRecorder {
  session;
  lastRecordedLength = 0;
  lastParentUuid = void 0;
  firstMessageUuid = void 0;
  lastTailUuid = void 0;
  lastLoggable = void 0;
  callSequence = 0;
  replIds = new Set();
  holdFloor = 0;
  held = void 0;
  parentWait = void 0;
  constructor(h) {
    this.session = h;
    Yze.of(h).savesWith({
      isOn: () => !isTranscriptPersistenceDisabled() && getCaps().transcriptSource !== "ccr-api",
      ...createTranscriptSaver(),
    });
  }
  record(h, x) {
    this.write(h, x);
  }
  write(h, x) {
    let {
      ignore: ignore,
      headPending: headPending,
      isResponseInFlight: isResponseInFlight,
      teamName: teamName,
      selfAgentName: selfAgentName,
      storageV5: storageV5,
    } = x;
    if (getCaps().transcriptSource === "ccr-api") return;
    if (headPending) {
      ((this.lastRecordedLength = 0),
        (this.lastParentUuid = void 0),
        (this.firstMessageUuid = void 0),
        (this.lastTailUuid = void 0),
        (this.lastLoggable = void 0),
        (this.holdFloor = 0),
        this.callSequence++);
      let parentWait = this.parentWait;
      if (
        ((this.parentWait = void 0),
        (this.held = { messages: h, sessionId: getSessionId() }),
        parentWait !== void 0)
      )
        logTranscriptParentWait(parentWait, { cut_short: !0, replayed: !1 });
      return;
    }
    let held = this.held;
    if (held !== void 0) {
      if (
        held.sessionId !== getSessionId() &&
        h.every((co, bo) =>
          bo < held.messages.length
            ? co.uuid === held.messages[bo].uuid
            : co.type !== "user" && co.type !== "assistant",
        )
      )
        return;
      this.held = void 0;
    }
    if (ignore) {
      this.holdFloor = h.length;
      return;
    }
    if (endsWithCompactBoundary(h)) return;
    if (this.parentWait !== void 0) {
      ((this.parentWait.overtaken += this.parentWait.next === void 0 ? 0 : 1),
        (this.parentWait.next = { messages: h, options: x, sessionId: getSessionId() }));
      return;
    }
    let We = h[0]?.uuid,
      lastRecordedLength = this.lastRecordedLength,
      Xe = this.firstMessageUuid === void 0,
      rt =
        lastRecordedLength === 0 ||
        h[lastRecordedLength - 1]?.uuid === this.lastTailUuid ||
        this.isNonLoggableTailIntact(h, lastRecordedLength),
      kt = We !== void 0 && !Xe && We === this.firstMessageUuid && lastRecordedLength <= h.length && rt,
      At = We !== void 0 && !Xe && We === this.firstMessageUuid && lastRecordedLength > h.length,
      It = kt ? lastRecordedLength : 0,
      Ot = kt || Xe ? this.holdFloor : zRe(h),
      Et = transcriptCursorEnd(h, Math.max(It, Ot), isResponseInFlight);
    if (!kt) this.holdFloor = Et;
    this.lastTailUuid = h[Et - 1]?.uuid;
    let Dt = Et - 1;
    while (Dt >= It && !isLoggableMessage(h[Dt])) Dt--;
    if (Dt >= It) this.lastLoggable = { index: Dt, uuid: h[Dt].uuid };
    else if (!kt) this.lastLoggable = void 0;
    if (Et === It) {
      lookMcpTaskEndings(h, Et, this.session)?.(!0);
      return;
    }
    let Lt = It === 0 && Et === h.length ? h : h.slice(It, Et),
      oo = kt ? this.lastParentUuid : void 0;
    if (It === 0) this.replIds.clear();
    collectReplIds(Lt, this.replIds);
    let Xt = kt || Xe || At,
      io = Xt ? void 0 : { startedAt: Date.now(), overtaken: 0, next: void 0, exitWaited: !1 },
      so = ++this.callSequence,
      po = lookMcpTaskEndings(h, Et, this.session),
      ao = recordTranscript(
        Lt,
        isAgentSwarmsEnabled() && selfAgentName ? { teamName: teamName, agentName: selfAgentName } : {},
        oo,
        this.replIds,
        storageV5,
      ).then(
        (co) => {
          if (so === this.callSequence && co && !kt) this.lastParentUuid = co;
          return (oE.peek(this.session)?.rowsQueued(Lt), po?.(!0), this.endParentWait(io, !1));
        },
        (co) => {
          throw (oE.peek(this.session)?.writeFailed(Lt), po?.(!1), this.endParentWait(io, !0), co);
        },
      );
    if (((this.parentWait = io), Xt)) {
      let last = cleanMessagesForLogging(Lt, this.replIds).findLast(
        (bo) => isChainParticipant(bo) && !OB(bo.uuid),
      );
      if (last) this.lastParentUuid = last.uuid;
    }
    if (((this.lastRecordedLength = Et), (this.firstMessageUuid = We), io !== void 0)) P$o(ao, io);
    return ao;
  }
  endParentWait(h, x) {
    if (h === void 0 || this.parentWait !== h) return;
    this.parentWait = void 0;
    let { next: D } = h;
    if (D === void 0) return;
    let { isReplayed: isReplayed, settled: settled } = D.sessionId === getSessionId() ? this.replay(D) : Cvt;
    return (logTranscriptParentWait(h, { cut_short: !1, replayed: isReplayed, write_rejected: x }), settled);
  }
  replay({ messages: h, options: x }) {
    try {
      return { isReplayed: !0, settled: this.write(h, x) };
    } catch (error) {
      return (logError(error), Cvt);
    }
  }
  isNonLoggableTailIntact(h, x) {
    let lastLoggable = this.lastLoggable;
    if (lastLoggable !== void 0 && h[lastLoggable.index]?.uuid !== lastLoggable.uuid) return !1;
    for (let L = lastLoggable === void 0 ? 0 : lastLoggable.index + 1; L < x; L++) {
      let ee = h[L];
      if (ee === void 0 || isLoggableMessage(ee)) return !1;
    }
    return !0;
  }
}
//@ chunk-18hwfzwa.js:1622007-1622704 fingerprint = useLogMessages (0.317)
function useLogMessages(h, x = !1, D = !1, L, ee = !1) {
  let ke = useSession(),
    teamContext = useAppState((Xe) => Xe.teamContext?.teamName),
    lastRecordedLengthRef = useAppState((Xe) => Xe.teamContext?.selfAgentName),
    { storageV5: storageV5 } = Me(),
    [We] = y(() => new TranscriptRecorder(ke)),
    lastParentUuidRef = R(!1);
  (P(() => {
    if (L && lastParentUuidRef.current && h !== L.transcript.getPublished()) return;
    ((lastParentUuidRef.current = !0),
      We.record(h, {
        ignore: x,
        headPending: ee,
        isResponseInFlight: D,
        teamName: teamContext,
        selfAgentName: lastRecordedLengthRef,
        storageV5: storageV5,
      }));
  }, [We, h, x, ee, D, teamContext, lastRecordedLengthRef, storageV5, L]),
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
            storageV5: storageV5,
          });
        } catch (error) {
          logError(error);
        }
      });
    }, [We, L, teamContext, lastRecordedLengthRef, storageV5]));
}

export { useLogMessages };

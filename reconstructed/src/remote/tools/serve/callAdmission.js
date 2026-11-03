/**
 * remote/tools/serve/callAdmission.ts
 *
 * 2.1.316 新增：服务端远程工具调用的准入与闸门
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ad2e1aj6.js (7)
 * attribution: placement 7
 */
import { createExplanationPromise } from "../../../components/permissions/PermissionExplanation.js";
import { isPlainObject, isSessionDenial, failedEnvelope } from "./callStatusQuery.js";
import { BBn, noticeUnattestedServedCalls } from "../../../services/remoteTools/toolHostAttestation.js";
import { iv, AJ, buildRemoteToolCallResult } from "../callResults.js";
import {
  findServedTool,
  servedMcpWireArgs,
  MAX_TELEMETRY_STRING,
  isServedReadOnly,
  backgroundCommandStatusText,
  serveToolCall,
  callFailureEnvelope,
  logServedCallTelemetry,
} from "./serveCall.js";
import { renameInputFields, RTe } from "../../../services/remoteTools/pathMapping.js";
import { truncateToLength } from "../../../utils/stringUtils.js";
import { I1 } from "../../../utils/stripControlChars.js";
import {
  sanitizeToolNameForAnalytics,
  getUnknownToolAnalyticsName,
} from "../../../services/analytics/metadata.js";
import { refusedEnvelope } from "./backgroundCommands.js";
import { callerKey, decidingInput } from "./servedShellSettings.js";
import { withdrawAskedCall } from "./pendingAsks.js";
import {
  withdrawnRequestMessage,
  lateCallMessage,
  protocolMismatchMessage,
  untrustedRepositoriesMessage,
  unattestedSenderMessage,
  oMs,
  mustUseForwarderMessage,
  notStartedUpMessage,
} from "../../../services/remoteTools/hostRefusals.js";
import { logRemoteTools } from "../../../services/remoteTools/remoteToolsDebug.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../protocolConstants.js";
import { joinKnownCall, joinRetry, lookupCallerCall, callDeadlineMs } from "./callLedger.js";
import { withDeadline } from "../../../utils/sleep.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";

//@ chunk-ad2e1aj6.js:71537-71828 placement
async function admitServedCall(e, n, s, h, r, i) {
  let { request: request, toolInput: toolInput } = createExplanationPromise(isPlainObject(n) ? n : {}),
    R = r === "bridge" ? BBn() : void 0;
  return serveRemoteToolCall(e, toolInput, request, s, h, r, {
    requestBytes: () => iv(n ?? {}),
    ...(i !== void 0 && { trust: i }),
    ...(R?.attestation !== void 0 && {
      attestation: R.attestation,
      unattested: R.heldBack,
      onHeldBack: () => noticeUnattestedServedCalls(h.onNotice),
    }),
  });
}
/**
 * 远程工具服务端处理一次调用：协议解析、准入、重试合并、权限判定、执行与结果整形。
 */
//@ chunk-ad2e1aj6.js:71828-79282 placement
async function serveRemoteToolCall(e, n, s, h, r, i, y = {}) {
  let O = y.requestBytes ?? (() => iv({ toolInput: n, envelope: s.ok ? s.value : null })),
    R = { name: r.targetName, working_dir: r.announcedDir ?? r.launchDir },
    w = s.ok && s.kind === "call" ? s.value : void 0,
    C = findServedTool(r, e),
    P = servedMcpWireArgs(r, e),
    x = renameInputFields(n, P),
    Y = truncateToLength(I1(e), MAX_TELEMETRY_STRING),
    F = {
      arrivedOver: i,
      workerEpoch: h.workerEpoch,
      toolNameForAnalytics: C ? sanitizeToolNameForAnalytics(C.name) : getUnknownToolAnalyticsName(e),
      isMcp: C?.isMcp ?? !1,
      toolName: C?.name ?? e,
      resolvedToolName: C?.name,
      envelope: w,
      callId: s.ok ? s.value.call_id : void 0,
      envelopeStatus: s.ok ? "present" : s.why,
      query: s.ok && s.kind === "outcome_query",
      enteredRecord: !1,
      answeredFromRecord: void 0,
      joinedCallId: void 0,
      fromPriorEpoch: !1,
      inputFingerprint: void 0,
      redeemsAskId: void 0,
      sessionMode: w?.caller.permission_mode,
      startedAt: Date.now(),
      forceAsk: !1,
      secondLeg: w?.approval !== void 0,
      approvalAttested: !1,
      approvalBasis: void 0,
      deniedBySession: !1,
      seatsFull: !1,
      destinationDowngraded: !1,
      askStillPending: !1,
      truncated: !1,
      staleLeg: void 0,
      trust:
        i === "relay"
          ? {
              approvalAttested: y.trust?.approvalAttested === !0,
              modeDecidedByHost: y.trust?.modeDecidedByHost === !0,
            }
          : RTe,
      ...(y.attestation !== void 0 && { attestation: y.attestation }),
      ...(y.untrustedRepositories !== void 0 && { untrustedRepositories: y.untrustedRepositories }),
      ...(y.modeStamp !== void 0 && { modeStamp: y.modeStamp }),
      serverVerdict:
        i !== "session" || !s.ok || s.kind !== "call" || s.serverVerdict === void 0
          ? { kind: "absent" }
          : y.modeStamp === "present"
            ? s.serverVerdict
            : { kind: "unmarked" },
    },
    D = (V, K, Se = {}) => {
      if (F.secondLeg) F.askStillPending = !0;
      return refusedEnvelope(R, F, V, K, Se);
    },
    L = h.sessionId !== void 0 || r.policy.admission === "none" ? callerKey(h) : void 0,
    j = () => (L === void 0 ? void 0 : r.sessions.peek(L)),
    M = w !== void 0 && w.approval === void 0 ? w.call_id : void 0,
    Q = () => {
      let V = w?.approval,
        K = V === void 0 ? void 0 : j()?.pendingAsks.peek(V.ask_id);
      return K?.callId === w?.call_id ? K : void 0;
    },
    ee = (V) => {
      let K = w?.approval,
        Se = j(),
        ue = K !== void 0 && Se !== void 0 && Q() !== void 0;
      if (ue)
        withdrawAskedCall(Se, K.ask_id, {
          reason: "stale_answer",
          message: withdrawnRequestMessage({ targetName: r.targetName, reason: "stale_answer" }),
        });
      return (
        (F.staleLeg = V),
        logRemoteTools(w?.call_id, "stale leg refused", {
          leg: K === void 0 ? "call" : "answer",
          age_ms: V.ageMs,
          window_ms: V.windowMs,
          ended_ask: ue,
        }),
        refusedEnvelope(
          R,
          F,
          "stale",
          lateCallMessage({
            targetName: r.targetName,
            leg: K === void 0 ? "call" : "answer",
            endedAsk: ue,
            ageMs: V.ageMs,
          }),
          ue ? { reason: "stale_answer" } : {},
        )
      );
    },
    q = await (async () => {
      if (r.callLog !== void 0 && !r.callLog.priorLoaded) await r.callLog.loadPrior();
      if (O() > r.policy.limits.max_request_bytes)
        return D(
          "invalid_request",
          `The call is larger than ${r.targetName} accepts (${r.policy.limits.max_request_bytes} bytes) \u2014 it was not run.`,
        );
      if (!s.ok && s.why === "unsupported_protocol")
        return D("unsupported_protocol", protocolMismatchMessage({ toolName: Y, targetName: r.targetName }));
      if (!s.ok && s.why === "malformed") {
        if (s.unlistedOp !== void 0)
          r.callLog?.note({
            t: "refused_request",
            caller: callerKey(h),
            what: "op",
            length: s.unlistedOp.length,
            name_hash: s.unlistedOp.hash,
            variant_of_listed: s.unlistedOp.variantOfListed,
          });
        return D(
          "invalid_request",
          `The remote tool call envelope sent to ${r.targetName} was present but did not match protocol v${REMOTE_TOOL_PROTOCOL_VERSION} (for example a call id or expiry out of range) \u2014 the call was not run.`,
        );
      }
      let V = (Z) =>
        gateServedCall({
          toolName: C?.name ?? Y,
          ctx: h,
          deps: r,
          target: R,
          facts: F,
          refuse: D,
          answer: Z,
        });
      if (y.unattested === !0)
        return V(
          () => (
            y.onHeldBack?.(),
            D(
              "unattested_request",
              y.untrustedRepositories !== void 0
                ? untrustedRepositoriesMessage({ targetName: r.targetName, state: y.untrustedRepositories })
                : unattestedSenderMessage({
                    targetName: r.targetName,
                    status: y.attestation?.status ?? "UNSPECIFIED",
                    subtype: "remote_tool_call",
                  }),
            )
          ),
        );
      if (y.stale !== void 0) {
        let stale = y.stale;
        return V(() => {
          if (M !== void 0 && L !== void 0) {
            let forCaller = r.sessions.forCaller(L),
              ce = forCaller?.calls.lookup(M);
            if (forCaller !== void 0 && ce !== void 0)
              return joinKnownCall({
                known: ce,
                session: forCaller,
                hostEpoch: r.sessions.epoch,
                callId: M,
                target: R,
                facts: F,
              });
            if (forCaller !== void 0) {
              F.enteredRecord = forCaller.calls.receive(
                M,
                C === void 0
                  ? void 0
                  : {
                      retryKey: decidingInput(C, x, forCaller.cwd ?? r.launchDir),
                      workerEpoch: h.workerEpoch,
                      late: !0,
                    },
              );
              let ge = C === void 0 ? void 0 : forCaller.calls.retryOf(M);
              if (
                C !== void 0 &&
                ge !== void 0 &&
                ge.call.summary.state !== "asked" &&
                ge.call.summary.state !== "received" &&
                (ge.call.summary.state !== "running" || ge.call.summary.started === !0) &&
                !isServedReadOnly(C, x, r)
              )
                return (
                  (F.staleLeg = stale),
                  joinRetry({
                    session: forCaller,
                    joined: { callId: ge.callId, call: forCaller.calls.lookup(ge.callId) ?? ge.call },
                    hostEpoch: r.sessions.epoch,
                    callId: M,
                    target: R,
                    facts: F,
                    workerEpoch: h.workerEpoch,
                  })
                );
            }
          }
          return ee(stale);
        });
      }
      if (s.ok && s.kind === "outcome_query") {
        let call_id = s.value.call_id,
          X = await V(() =>
            L === void 0
              ? D("no_session", `${Y} refused: no server-asserted session.`)
              : lookupCallerCall({
                  sessions: r.sessions,
                  callLog: r.callLog,
                  callerKey: L,
                  callId: call_id,
                  target: R,
                  facts: F,
                }),
          ),
          ce =
            X.envelope.outcome === "completed" && r.policy.backgroundShells?.enabled() === !0
              ? await j()?.backgroundShells.statusOf(F.joinedCallId ?? call_id)
              : void 0;
        return ce === void 0 ? X : backgroundCommandStatusText(R, call_id, ce);
      }
      if (!C) {
        let Z = () => D("not_served", oMs({ toolName: Y, targetName: r.targetName })),
          X = j(),
          ce = w?.call_id,
          ge = X !== void 0 && ce !== void 0 ? X.calls.lookup(ce) : void 0;
        if (X === void 0 || ce === void 0 || ge === void 0) return Z();
        let _e = () =>
          joinKnownCall({
            known: X.calls.lookup(ce) ?? ge,
            session: X,
            hostEpoch: r.sessions.epoch,
            callId: ce,
            target: R,
            facts: F,
          });
        if (w?.approval === void 0 || ge.summary.state !== "asked") return V(_e);
        let we = ge.summary.askId !== void 0 ? X.pendingAsks.peek(ge.summary.askId) : void 0;
        if (we === void 0 || we.callId !== ce || we.toolStillServed()) return Z();
        return V(() => {
          let te = Z();
          return (
            withdrawAskedCall(X, we.askId, {
              reason: "tool_withdrawn",
              message: withdrawnRequestMessage({ targetName: r.targetName, reason: "tool_withdrawn" }),
              retain: te,
            }),
            (F.askStillPending = !1),
            te
          );
        });
      }
      if (!s.ok && r.policy.requireEnvelope)
        return D("invalid_request", mustUseForwarderMessage({ toolName: Y, targetName: r.targetName }));
      if (r.readiness !== void 0 && !r.readiness.ready) {
        if (
          (await withDeadline(
            r.readiness.whenReady(),
            AJ(callDeadlineMs(r.policy.limits, w) - (Date.now() - F.startedAt)),
          ),
          !r.readiness.ready)
        )
          return (
            logForDebugging(
              `[remote-tools] ${Y} refused: this machine was still loading its hooks and settings when the call's deadline ran out`,
              { level: "warn" },
            ),
            D("queue_full", notStartedUpMessage({ targetName: r.targetName }), { limit: "queue" })
          );
      }
      let K = j();
      if (M !== void 0 && K !== void 0) {
        let lookup = K.calls.lookup(M);
        if (lookup !== void 0)
          return V(() =>
            joinKnownCall({
              known: K.calls.lookup(M) ?? lookup,
              session: K,
              hostEpoch: r.sessions.epoch,
              callId: M,
              target: R,
              facts: F,
            }),
          );
        F.enteredRecord = K.calls.receive(M, {
          retryKey: decidingInput(C, x, K.cwd ?? r.launchDir),
          workerEpoch: h.workerEpoch,
        });
        let retryOf = K.calls.retryOf(M),
          directoryReset = K.directoryReset;
        if (
          retryOf === void 0 &&
          F.enteredRecord &&
          directoryReset !== void 0 &&
          directoryReset.from !== K.cwd
        ) {
          K.calls.rekey(M, decidingInput(C, x, directoryReset.from));
          let retryOf_2 = K.calls.retryOf(M);
          if (retryOf_2 !== void 0 && retryOf_2.call.receivedAt < directoryReset.at) retryOf = retryOf_2;
          else K.calls.rekey(M, decidingInput(C, x, K.cwd ?? r.launchDir));
        }
        if (retryOf !== void 0 && retryOf.call.summary.state !== "asked" && !isServedReadOnly(C, x, r))
          return V(() =>
            joinRetry({
              session: K,
              joined: { callId: retryOf.callId, call: K.calls.lookup(retryOf.callId) ?? retryOf.call },
              hostEpoch: r.sessions.epoch,
              callId: M,
              target: R,
              facts: F,
              workerEpoch: h.workerEpoch,
            }),
          );
      }
      let Se = () =>
          serveToolCall({ tool: C, toolInput: x, wireArguments: P, ctx: h, deps: r, target: R, facts: F }),
        ue = w?.approval?.decision === "allow" ? Q() : void 0;
      if (ue !== void 0) ((ue.redeemingLegs += 1), (F.redeemsAskId = ue.askId));
      try {
        if (r.policy.admission === "none")
          return await Se().catch((ce) => callFailureEnvelope(ce, R, F, h.signal, {}));
        if (!r.gate) return D("unbound", Po(Y, r.targetName));
        let now = Date.now(),
          X = createAdmissionOutcomes({
            target: R,
            facts: F,
            refuse: D,
            ctx: h,
            serve: () => ((F.postureWaitMs = Date.now() - now), Se()),
          });
        return await (w?.approval?.decision === "deny"
          ? r.gate.admitWithoutSlot(C.name, h, X)
          : r.gate.run(C.name, h, X));
      } finally {
        if (ue !== void 0) ((ue.redeemingLegs -= 1), (F.redeemsAskId = void 0));
      }
    })().catch(
      (V) => (
        logForDebugging(`[remote-tools] serving ${Y} failed before admission: ${errorMessage(V)}`, {
          level: "warn",
        }),
        D("invalid_request", `The call sent to ${r.targetName} could not be read \u2014 it was not run.`)
      ),
    ),
    ae = j();
  if (
    M !== void 0 &&
    F.enteredRecord &&
    ae !== void 0 &&
    F.answeredFromRecord === void 0 &&
    ls(q) &&
    ae.calls.lookup(M)?.result === void 0
  )
    ae.calls.settle(M, q, isSessionDenial(q));
  return (logServedCallTelemetry(q.envelope, F, r, ae), buildRemoteToolCallResult(q));
}
//@ chunk-ad2e1aj6.js:79282-79375 placement
function ls(e) {
  let { outcome: outcome } = e.envelope;
  return outcome === "completed" || outcome === "refused" || outcome === "failed";
}
//@ chunk-ad2e1aj6.js:79375-79680 placement
function gateServedCall({
  toolName: toolName,
  ctx: ctx,
  deps: deps,
  target: target,
  facts: facts,
  refuse: refuse,
  answer: answer,
}) {
  if (deps.policy.admission === "none") return Promise.resolve(answer());
  if (!deps.gate) return Promise.resolve(refuse("unbound", Po(toolName, deps.targetName)));
  return deps.gate.admitWithoutSlot(
    toolName,
    ctx,
    createAdmissionOutcomes({
      target: target,
      facts: facts,
      refuse: refuse,
      ctx: ctx,
      serve: () => Promise.resolve(answer()),
    }),
  );
}
//@ chunk-ad2e1aj6.js:79680-79889 placement
function createAdmissionOutcomes({ target: target, facts: facts, refuse: refuse, ctx: ctx, serve: serve }) {
  return {
    refuse: (i, y) => refuse(admissionRefusalCode(i), y),
    fail: (i) => callFailureEnvelope(i, target, facts, ctx.signal, {}),
    cancelled: () =>
      failedEnvelope(target, facts, "cancelled", "The caller cancelled the call before it ran."),
    serve: serve,
  };
}
//@ chunk-ad2e1aj6.js:79889-79987 placement
function Po(e, n) {
  return `${e} refused: ${n} is not accepting calls from cloud sessions right now.`;
}
//@ chunk-ad2e1aj6.js:79987-80196 placement
function admissionRefusalCode(e) {
  switch (e) {
    case "no_session":
      return "no_session";
    case "unbound_device":
    case "mode_withdrawn":
      return "unbound";
    case "too_many_concurrent":
      return "too_many_in_flight";
    default:
      return "sandbox_unavailable";
  }
}

export { serveRemoteToolCall, admitServedCall };

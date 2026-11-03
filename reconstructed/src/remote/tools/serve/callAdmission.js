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
import {
  unknownAttestationResult,
  noticeUnattestedServedCalls,
} from "../../../services/remoteTools/toolHostAttestation.js";
import { byteLengthOf, clampToMaxPageSize, buildRemoteToolCallResult } from "../callResults.js";
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
import { renameInputFields, DEFAULT_SERVING_POLICY } from "../../../services/remoteTools/pathMapping.js";
import { truncateToLength } from "../../../utils/stringUtils.js";
import { stripControlChars } from "../../../utils/stripControlChars.js";
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
  toolNotServedMessage,
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
async function admitServedCall(name, n, s, h, r, i) {
  let { request, toolInput } = createExplanationPromise(isPlainObject(n) ? n : {});
  let R = r === "bridge" ? unknownAttestationResult() : undefined;
  return serveRemoteToolCall(name, toolInput, request, s, h, r, {
    requestBytes: () => byteLengthOf(n ?? {}),
    ...(i !== undefined && {
      trust: i,
    }),
    ...(R?.attestation !== undefined && {
      attestation: R.attestation,
      unattested: R.heldBack,
      onHeldBack: () => noticeUnattestedServedCalls(h.onNotice),
    }),
  });
}
//@ chunk-ad2e1aj6.js:71828-79282 placement
/**
 * 远程工具服务端处理一次调用：协议解析、准入、重试合并、权限判定、执行与结果整形。
 */
async function serveRemoteToolCall(e, n, request, h, r, i, y = {}) {
  let O =
    y.requestBytes ??
    (() =>
      byteLengthOf({
        toolInput: n,
        envelope: request.ok ? request.value : null,
      }));
  let R = {
    name: r.targetName,
    working_dir: r.announcedDir ?? r.launchDir,
  };
  let w = request.ok && request.kind === "call" ? request.value : undefined;
  let servedTool = findServedTool(r, e);
  let P = servedMcpWireArgs(r, e);
  let x = renameInputFields(n, P);
  let Y = truncateToLength(stripControlChars(e), MAX_TELEMETRY_STRING);
  let F = {
    arrivedOver: i,
    workerEpoch: h.workerEpoch,
    toolNameForAnalytics: servedTool
      ? sanitizeToolNameForAnalytics(servedTool.name)
      : getUnknownToolAnalyticsName(e),
    isMcp: servedTool?.isMcp ?? false,
    toolName: servedTool?.name ?? e,
    resolvedToolName: servedTool?.name,
    envelope: w,
    callId: request.ok ? request.value.call_id : undefined,
    envelopeStatus: request.ok ? "present" : request.why,
    query: request.ok && request.kind === "outcome_query",
    enteredRecord: false,
    answeredFromRecord: undefined,
    joinedCallId: undefined,
    fromPriorEpoch: false,
    inputFingerprint: undefined,
    redeemsAskId: undefined,
    sessionMode: w?.caller.permission_mode,
    startedAt: Date.now(),
    forceAsk: false,
    secondLeg: w?.approval !== undefined,
    approvalAttested: false,
    approvalBasis: undefined,
    deniedBySession: false,
    seatsFull: false,
    destinationDowngraded: false,
    askStillPending: false,
    truncated: false,
    staleLeg: undefined,
    trust:
      i === "relay"
        ? {
            approvalAttested: y.trust?.approvalAttested === true,
            modeDecidedByHost: y.trust?.modeDecidedByHost === true,
          }
        : DEFAULT_SERVING_POLICY,
    ...(y.attestation !== undefined && {
      attestation: y.attestation,
    }),
    ...(y.untrustedRepositories !== undefined && {
      untrustedRepositories: y.untrustedRepositories,
    }),
    ...(y.modeStamp !== undefined && {
      modeStamp: y.modeStamp,
    }),
    serverVerdict:
      i !== "session" || !request.ok || request.kind !== "call" || request.serverVerdict === undefined
        ? {
            kind: "absent",
          }
        : y.modeStamp === "present"
          ? request.serverVerdict
          : {
              kind: "unmarked",
            },
  };
  let D = (V, K, Se = {}) => {
    if (F.secondLeg) F.askStillPending = true;
    return refusedEnvelope(R, F, V, K, Se);
  };
  let L = h.sessionId !== undefined || r.policy.admission === "none" ? callerKey(h) : undefined;
  let j = () => (L === undefined ? undefined : r.sessions.peek(L));
  let callId = w !== undefined && w.approval === undefined ? w.call_id : undefined;
  let Q = () => {
    let approval = w?.approval;
    let K = approval === undefined ? undefined : j()?.pendingAsks.peek(approval.ask_id);
    return K?.callId === w?.call_id ? K : undefined;
  };
  let ee = (stale) => {
    let approval = w?.approval;
    let Se = j();
    let ue = approval !== undefined && Se !== undefined && Q() !== undefined;
    if (ue)
      withdrawAskedCall(Se, approval.ask_id, {
        reason: "stale_answer",
        message: withdrawnRequestMessage({
          targetName: r.targetName,
          reason: "stale_answer",
        }),
      });
    F.staleLeg = stale;
    logRemoteTools(w?.call_id, "stale leg refused", {
      leg: approval === undefined ? "call" : "answer",
      age_ms: stale.ageMs,
      window_ms: stale.windowMs,
      ended_ask: ue,
    });
    return refusedEnvelope(
      R,
      F,
      "stale",
      lateCallMessage({
        targetName: r.targetName,
        leg: approval === undefined ? "call" : "answer",
        endedAsk: ue,
        ageMs: stale.ageMs,
      }),
      ue
        ? {
            reason: "stale_answer",
          }
        : {},
    );
  };
  let q = await (async () => {
    if (r.callLog !== undefined && !r.callLog.priorLoaded) await r.callLog.loadPrior();
    if (O() > r.policy.limits.max_request_bytes)
      return D(
        "invalid_request",
        `The call is larger than ${r.targetName} accepts (${r.policy.limits.max_request_bytes} bytes) \u2014 it was not run.`,
      );
    if (!request.ok && request.why === "unsupported_protocol")
      return D(
        "unsupported_protocol",
        protocolMismatchMessage({
          toolName: Y,
          targetName: r.targetName,
        }),
      );
    if (!request.ok && request.why === "malformed") {
      if (request.unlistedOp !== undefined)
        r.callLog?.note({
          t: "refused_request",
          caller: callerKey(h),
          what: "op",
          length: request.unlistedOp.length,
          name_hash: request.unlistedOp.hash,
          variant_of_listed: request.unlistedOp.variantOfListed,
        });
      return D(
        "invalid_request",
        `The remote tool call envelope sent to ${r.targetName} was present but did not match protocol v${REMOTE_TOOL_PROTOCOL_VERSION} (for example a call id or expiry out of range) \u2014 the call was not run.`,
      );
    }
    let V = (answer) =>
      gateServedCall({
        toolName: servedTool?.name ?? Y,
        ctx: h,
        deps: r,
        target: R,
        facts: F,
        refuse: D,
        answer,
      });
    if (y.unattested === true)
      return V(() => {
        y.onHeldBack?.();
        return D(
          "unattested_request",
          y.untrustedRepositories !== undefined
            ? untrustedRepositoriesMessage({
                targetName: r.targetName,
                state: y.untrustedRepositories,
              })
            : unattestedSenderMessage({
                targetName: r.targetName,
                status: y.attestation?.status ?? "UNSPECIFIED",
                subtype: "remote_tool_call",
              }),
        );
      });
    if (y.stale !== undefined) {
      let stale = y.stale;
      return V(() => {
        if (callId !== undefined && L !== undefined) {
          let X = r.sessions.forCaller(L);
          let ce = X?.calls.lookup(callId);
          if (X !== undefined && ce !== undefined)
            return joinKnownCall({
              known: ce,
              session: X,
              hostEpoch: r.sessions.epoch,
              callId,
              target: R,
              facts: F,
            });
          if (X !== undefined) {
            F.enteredRecord = X.calls.receive(
              callId,
              servedTool === undefined
                ? undefined
                : {
                    retryKey: decidingInput(servedTool, x, X.cwd ?? r.launchDir),
                    workerEpoch: h.workerEpoch,
                    late: true,
                  },
            );
            let ge = servedTool === undefined ? undefined : X.calls.retryOf(callId);
            if (
              servedTool !== undefined &&
              ge !== undefined &&
              ge.call.summary.state !== "asked" &&
              ge.call.summary.state !== "received" &&
              (ge.call.summary.state !== "running" || ge.call.summary.started === true) &&
              !isServedReadOnly(servedTool, x, r)
            ) {
              F.staleLeg = stale;
              return joinRetry({
                session: X,
                joined: {
                  callId: ge.callId,
                  call: X.calls.lookup(ge.callId) ?? ge.call,
                },
                hostEpoch: r.sessions.epoch,
                callId,
                target: R,
                facts: F,
                workerEpoch: h.workerEpoch,
              });
            }
          }
        }
        return ee(stale);
      });
    }
    if (request.ok && request.kind === "outcome_query") {
      let callId = request.value.call_id;
      let X = await V(() =>
        L === undefined
          ? D("no_session", `${Y} refused: no server-asserted session.`)
          : lookupCallerCall({
              sessions: r.sessions,
              callLog: r.callLog,
              callerKey: L,
              callId,
              target: R,
              facts: F,
            }),
      );
      let ce =
        X.envelope.outcome === "completed" && r.policy.backgroundShells?.enabled() === true
          ? await j()?.backgroundShells.statusOf(F.joinedCallId ?? callId)
          : undefined;
      return ce === undefined ? X : backgroundCommandStatusText(R, callId, ce);
    }
    if (!servedTool) {
      let Z = () =>
        D(
          "not_served",
          toolNotServedMessage({
            toolName: Y,
            targetName: r.targetName,
          }),
        );
      let X = j();
      let callId = w?.call_id;
      let ge = X !== undefined && callId !== undefined ? X.calls.lookup(callId) : undefined;
      if (X === undefined || callId === undefined || ge === undefined) return Z();
      let answer = () =>
        joinKnownCall({
          known: X.calls.lookup(callId) ?? ge,
          session: X,
          hostEpoch: r.sessions.epoch,
          callId,
          target: R,
          facts: F,
        });
      if (w?.approval === undefined || ge.summary.state !== "asked") return V(answer);
      let we = ge.summary.askId !== undefined ? X.pendingAsks.peek(ge.summary.askId) : undefined;
      if (we === undefined || we.callId !== callId || we.toolStillServed()) return Z();
      return V(() => {
        let te = Z();
        withdrawAskedCall(X, we.askId, {
          reason: "tool_withdrawn",
          message: withdrawnRequestMessage({
            targetName: r.targetName,
            reason: "tool_withdrawn",
          }),
          retain: te,
        });
        F.askStillPending = false;
        return te;
      });
    }
    if (!request.ok && r.policy.requireEnvelope)
      return D(
        "invalid_request",
        mustUseForwarderMessage({
          toolName: Y,
          targetName: r.targetName,
        }),
      );
    if (r.readiness !== undefined && !r.readiness.ready) {
      await withDeadline(
        r.readiness.whenReady(),
        clampToMaxPageSize(callDeadlineMs(r.policy.limits, w) - (Date.now() - F.startedAt)),
      );
      if (!r.readiness.ready) {
        logForDebugging(
          `[remote-tools] ${Y} refused: this machine was still loading its hooks and settings when the call's deadline ran out`,
          {
            level: "warn",
          },
        );
        return D(
          "queue_full",
          notStartedUpMessage({
            targetName: r.targetName,
          }),
          {
            limit: "queue",
          },
        );
      }
    }
    let K = j();
    if (callId !== undefined && K !== undefined) {
      let Z = K.calls.lookup(callId);
      if (Z !== undefined)
        return V(() =>
          joinKnownCall({
            known: K.calls.lookup(callId) ?? Z,
            session: K,
            hostEpoch: r.sessions.epoch,
            callId,
            target: R,
            facts: F,
          }),
        );
      F.enteredRecord = K.calls.receive(callId, {
        retryKey: decidingInput(servedTool, x, K.cwd ?? r.launchDir),
        workerEpoch: h.workerEpoch,
      });
      let X = K.calls.retryOf(callId);
      let directoryReset = K.directoryReset;
      if (
        X === undefined &&
        F.enteredRecord &&
        directoryReset !== undefined &&
        directoryReset.from !== K.cwd
      ) {
        K.calls.rekey(callId, decidingInput(servedTool, x, directoryReset.from));
        let ge = K.calls.retryOf(callId);
        if (ge !== undefined && ge.call.receivedAt < directoryReset.at) X = ge;
        else K.calls.rekey(callId, decidingInput(servedTool, x, K.cwd ?? r.launchDir));
      }
      if (X !== undefined && X.call.summary.state !== "asked" && !isServedReadOnly(servedTool, x, r))
        return V(() =>
          joinRetry({
            session: K,
            joined: {
              callId: X.callId,
              call: K.calls.lookup(X.callId) ?? X.call,
            },
            hostEpoch: r.sessions.epoch,
            callId,
            target: R,
            facts: F,
            workerEpoch: h.workerEpoch,
          }),
        );
    }
    let Se = () =>
      serveToolCall({
        tool: servedTool,
        toolInput: x,
        wireArguments: P,
        ctx: h,
        deps: r,
        target: R,
        facts: F,
      });
    let ue = w?.approval?.decision === "allow" ? Q() : undefined;
    if (ue !== undefined) {
      ue.redeemingLegs += 1;
      F.redeemsAskId = ue.askId;
    }
    try {
      if (r.policy.admission === "none")
        return await Se().catch((error) => callFailureEnvelope(error, R, F, h.signal, {}));
      if (!r.gate) return D("unbound", refusalTargetNotAcceptingText(Y, r.targetName));
      let now = Date.now();
      let admissionOutcomes = createAdmissionOutcomes({
        target: R,
        facts: F,
        refuse: D,
        ctx: h,
        serve: () => {
          F.postureWaitMs = Date.now() - now;
          return Se();
        },
      });
      return await (w?.approval?.decision === "deny"
        ? r.gate.admitWithoutSlot(servedTool.name, h, admissionOutcomes)
        : r.gate.run(servedTool.name, h, admissionOutcomes));
    } finally {
      if (ue !== undefined) {
        ue.redeemingLegs -= 1;
        F.redeemsAskId = undefined;
      }
    }
  })().catch((error) => {
    logForDebugging(`[remote-tools] serving ${Y} failed before admission: ${errorMessage(error)}`, {
      level: "warn",
    });
    return D("invalid_request", `The call sent to ${r.targetName} could not be read \u2014 it was not run.`);
  });
  let ae = j();
  if (
    callId !== undefined &&
    F.enteredRecord &&
    ae !== undefined &&
    F.answeredFromRecord === undefined &&
    hasSettledOutcome(q) &&
    ae.calls.lookup(callId)?.result === undefined
  )
    ae.calls.settle(callId, q, isSessionDenial(q));
  logServedCallTelemetry(q.envelope, F, r, ae);
  return buildRemoteToolCallResult(q);
}
//@ chunk-ad2e1aj6.js:79282-79375 placement
function hasSettledOutcome(e) {
  let { outcome } = e.envelope;
  return outcome === "completed" || outcome === "refused" || outcome === "failed";
}
//@ chunk-ad2e1aj6.js:79375-79680 placement
function gateServedCall({ toolName, ctx, deps, target, facts, refuse, answer }) {
  if (deps.policy.admission === "none") return Promise.resolve(answer());
  if (!deps.gate)
    return Promise.resolve(refuse("unbound", refusalTargetNotAcceptingText(toolName, deps.targetName)));
  return deps.gate.admitWithoutSlot(
    toolName,
    ctx,
    createAdmissionOutcomes({
      target,
      facts,
      refuse,
      ctx,
      serve: () => Promise.resolve(answer()),
    }),
  );
}
//@ chunk-ad2e1aj6.js:79680-79889 placement
function createAdmissionOutcomes({ target, facts, refuse, ctx, serve }) {
  return {
    refuse: (i, y) => refuse(admissionRefusalCode(i), y),
    fail: (i) => callFailureEnvelope(i, target, facts, ctx.signal, {}),
    cancelled: () =>
      failedEnvelope(target, facts, "cancelled", "The caller cancelled the call before it ran."),
    serve,
  };
}
//@ chunk-ad2e1aj6.js:79889-79987 placement
function refusalTargetNotAcceptingText(e, targetName) {
  return `${e} refused: ${targetName} is not accepting calls from cloud sessions right now.`;
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

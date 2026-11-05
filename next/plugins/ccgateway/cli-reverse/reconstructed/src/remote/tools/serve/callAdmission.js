/**
 * remote/tools/serve/callAdmission.ts
 *
 * 2.1.316 新增：服务端远程工具调用的准入与闸门
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nvm0wye1.js (7)
 * attribution: placement 7
 */
import { splitRemoteMeta } from "../protocolSchemas.js";
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
import { isMarkedMode, refusedEnvelope } from "./backgroundCommands.js";
import { compareWithStated, REMOTE_TOOL_PROTOCOL_VERSION } from "../protocolConstants.js";
import { MINIMAL_INTERFACE_VERSION } from "../protocolNegotiation.js";
import { callerKey, decidingInput } from "./servedShellSettings.js";
import { withdrawAskedCall } from "./pendingAsks.js";
import {
  withdrawnRequestMessage,
  lateCallMessage,
  formatRefusal,
  protocolMismatchMessage,
  untrustedRepositoriesMessage,
  unattestedSenderMessage,
  toolNotServedMessage,
  mustUseForwarderMessage,
  notStartedUpMessage,
} from "../../../services/remoteTools/hostRefusals.js";
import { logRemoteTools } from "../../../services/remoteTools/remoteToolsDebug.js";
import { joinKnownCall, joinRetry, lookupCallerCall, callDeadlineMs } from "./callLedger.js";
import { withDeadline } from "../../../utils/sleep.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";

//@ chunk-nvm0wye1.js:73047-73338 placement
async function admitServedCall(toolName, toolInput, ctx, deps, arrivedOver, options) {
  let { request, toolInput: toolInput_2 } = splitRemoteMeta(isPlainObject(toolInput) ? toolInput : {});
  let attestation = arrivedOver === "bridge" ? unknownAttestationResult() : undefined;
  return serveRemoteToolCall(toolName, toolInput_2, request, ctx, deps, arrivedOver, {
    requestBytes: () => byteLengthOf(toolInput ?? {}),
    ...(options !== undefined && {
      trust: options,
    }),
    ...(attestation?.attestation !== undefined && {
      attestation: attestation.attestation,
      unattested: attestation.heldBack,
      onHeldBack: () => noticeUnattestedServedCalls(deps.onNotice),
    }),
  });
}
//@ chunk-nvm0wye1.js:73338-81431 placement
/**
 * 远程工具服务端处理一次调用：协议解析、准入、重试合并、权限判定、执行与结果整形。
 */
async function serveRemoteToolCall(toolName, toolInput, request, ctx, deps, arrivedOver, options = {}) {
  let arrivedBytes = options.sharedRequest?.arrivedBytes;
  let arrivedSize =
    options.requestBytes ??
    (arrivedBytes !== undefined ? () => arrivedBytes : undefined) ??
    (() =>
      byteLengthOf({
        toolInput,
        envelope: request.ok ? request.value : null,
      }));
  let target = {
    name: deps.targetName,
    working_dir: deps.announcedDir ?? deps.launchDir,
  };
  let callEnvelope = request.ok && request.kind === "call" ? request.value : undefined;
  let tool = findServedTool(deps, toolName);
  let wireArguments = servedMcpWireArgs(deps, toolName);
  let normalizedInput = renameInputFields(toolInput, wireArguments);
  let toolNameForText = truncateToLength(stripControlChars(toolName), MAX_TELEMETRY_STRING);
  let statedInterface =
    request.ok && arrivedOver !== "relay"
      ? (request.sessionInterface ?? {
          kind: "none",
        })
      : undefined;
  let facts = {
    arrivedOver,
    workerEpoch: ctx.workerEpoch,
    toolNameForAnalytics: tool
      ? sanitizeToolNameForAnalytics(tool.name)
      : getUnknownToolAnalyticsName(toolName),
    isMcp: tool?.isMcp ?? false,
    toolName: tool?.name ?? toolName,
    resolvedToolName: tool?.name,
    envelope: callEnvelope,
    callId: request.ok ? request.value.call_id : undefined,
    envelopeStatus: request.ok ? "present" : request.why,
    query: request.ok && request.kind === "outcome_query",
    enteredRecord: false,
    answeredFromRecord: undefined,
    joinedCallId: undefined,
    fromPriorEpoch: false,
    inputFingerprint: undefined,
    redeemsAskId: undefined,
    sessionMode: callEnvelope?.caller.permission_mode,
    startedAt: Date.now(),
    forceAsk: false,
    secondLeg: callEnvelope?.approval !== undefined,
    approvalAttested: false,
    approvalBasis: undefined,
    deniedBySession: false,
    seatsFull: false,
    destinationDowngraded: false,
    askStillPending: false,
    truncated: false,
    staleLeg: undefined,
    trust:
      arrivedOver === "relay"
        ? {
            approvalAttested: options.trust?.approvalAttested === true,
            modeDecidedByHost: options.trust?.modeDecidedByHost === true,
          }
        : DEFAULT_SERVING_POLICY,
    ...(options.attestation !== undefined && {
      attestation: options.attestation,
    }),
    ...(options.untrustedRepositories !== undefined && {
      untrustedRepositories: options.untrustedRepositories,
    }),
    ...(options.modeStamp !== undefined && {
      modeStamp: options.modeStamp,
    }),
    requestForm: options.sharedRequest === undefined ? "call_envelope" : "shared_request",
    serverVerdict:
      arrivedOver !== "session" ||
      !request.ok ||
      request.kind !== "call" ||
      request.serverVerdict === undefined
        ? {
            kind: "absent",
          }
        : isMarkedMode(options.modeStamp)
          ? request.serverVerdict
          : {
              kind: "unmarked",
            },
    ...(statedInterface !== undefined && {
      sessionInterface: {
        stated: statedInterface,
        fit: compareWithStated(deps.interfaceRange ?? MINIMAL_INTERFACE_VERSION, statedInterface),
      },
    }),
  };
  let refuse = (code, message, extra = {}) => {
    if (facts.secondLeg) facts.askStillPending = true;
    return refusedEnvelope(target, facts, code, message, extra);
  };
  let servedCallerKey =
    ctx.sessionId !== undefined || deps.policy.admission === "none" ? callerKey(ctx) : undefined;
  let currentSession = () =>
    servedCallerKey === undefined ? undefined : deps.sessions.peek(servedCallerKey);
  let callId =
    callEnvelope !== undefined && callEnvelope.approval === undefined ? callEnvelope.call_id : undefined;
  let pendingAsk = () => {
    let approval = callEnvelope?.approval;
    let ask = approval === undefined ? undefined : currentSession()?.pendingAsks.peek(approval.ask_id);
    return ask?.callId === callEnvelope?.call_id ? ask : undefined;
  };
  let refuseStale = (stale) => {
    let approval = callEnvelope?.approval;
    let session = currentSession();
    let endedAsk = approval !== undefined && session !== undefined && pendingAsk() !== undefined;
    if (endedAsk)
      withdrawAskedCall(session, approval.ask_id, {
        reason: "stale_answer",
        message: withdrawnRequestMessage({
          targetName: deps.targetName,
          reason: "stale_answer",
        }),
      });
    facts.staleLeg = stale;
    logRemoteTools(callEnvelope?.call_id, "stale leg refused", {
      leg: approval === undefined ? "call" : "answer",
      age_ms: stale.ageMs,
      window_ms: stale.windowMs,
      ended_ask: endedAsk,
    });
    return refusedEnvelope(
      target,
      facts,
      "stale",
      lateCallMessage({
        targetName: deps.targetName,
        leg: approval === undefined ? "call" : "answer",
        endedAsk,
        ageMs: stale.ageMs,
      }),
      endedAsk
        ? {
            reason: "stale_answer",
          }
        : {},
    );
  };
  let envelope = await (async () => {
    if (deps.callLog !== undefined && !deps.callLog.priorLoaded) await deps.callLog.loadPrior();
    if (!request.ok && request.sharedRequestRefusal !== undefined) {
      facts.sharedRequestRefusal = request.sharedRequestRefusal.what;
      facts.refusedToolUseId = options.toolUseId;
      if (request.sharedRequestRefusal.what === "not_honoured")
        facts.sharedRequestPart = request.sharedRequestRefusal.part;
      return refuse(
        "invalid_request",
        formatRefusal({
          refusal: request.sharedRequestRefusal,
          toolName: toolNameForText,
          targetName: deps.targetName,
        }),
      );
    }
    if (arrivedSize() > deps.policy.limits.max_request_bytes)
      return refuse(
        "invalid_request",
        `The call is larger than ${deps.targetName} accepts (${deps.policy.limits.max_request_bytes} bytes) \u2014 it was not run.`,
      );
    if (!request.ok && request.why === "unsupported_protocol")
      return refuse(
        "unsupported_protocol",
        protocolMismatchMessage({
          toolName: toolNameForText,
          targetName: deps.targetName,
        }),
      );
    if (!request.ok && request.why === "malformed") {
      if (request.unlistedOp !== undefined)
        deps.callLog?.note({
          t: "refused_request",
          caller: callerKey(ctx),
          what: "op",
          length: request.unlistedOp.length,
          name_hash: request.unlistedOp.hash,
          variant_of_listed: request.unlistedOp.variantOfListed,
        });
      return refuse(
        "invalid_request",
        `The remote tool call envelope sent to ${deps.targetName} was present but did not match protocol v${REMOTE_TOOL_PROTOCOL_VERSION} (for example a call id or expiry out of range) \u2014 the call was not run.`,
      );
    }
    let throughGate = (answer) =>
      gateServedCall({
        toolName: tool?.name ?? toolNameForText,
        ctx,
        deps,
        target,
        facts,
        refuse,
        answer,
      });
    if (options.unattested === true)
      return throughGate(() => {
        options.onHeldBack?.();
        return refuse(
          "unattested_request",
          options.untrustedRepositories !== undefined
            ? untrustedRepositoriesMessage({
                targetName: deps.targetName,
                state: options.untrustedRepositories,
              })
            : unattestedSenderMessage({
                targetName: deps.targetName,
                status: options.attestation?.status ?? "UNSPECIFIED",
                subtype: "remote_tool_call",
              }),
        );
      });
    if (options.stale !== undefined) {
      let stale = options.stale;
      return throughGate(() => {
        if (callId !== undefined && servedCallerKey !== undefined) {
          let session = deps.sessions.forCaller(servedCallerKey);
          let known = session?.calls.lookup(callId);
          if (session !== undefined && known !== undefined)
            return joinKnownCall({
              known,
              session,
              hostEpoch: deps.sessions.epoch,
              callId,
              target,
              facts,
            });
          if (session !== undefined) {
            facts.enteredRecord = session.calls.receive(
              callId,
              tool === undefined
                ? undefined
                : {
                    retryKey: decidingInput(tool, normalizedInput, session.cwd ?? deps.launchDir),
                    workerEpoch: ctx.workerEpoch,
                    late: true,
                  },
            );
            let retry = tool === undefined ? undefined : session.calls.retryOf(callId);
            if (
              tool !== undefined &&
              retry !== undefined &&
              retry.call.summary.state !== "asked" &&
              retry.call.summary.state !== "received" &&
              (retry.call.summary.state !== "running" || retry.call.summary.started === true) &&
              !isServedReadOnly(tool, normalizedInput, deps)
            ) {
              facts.staleLeg = stale;
              return joinRetry({
                session,
                joined: {
                  callId: retry.callId,
                  call: session.calls.lookup(retry.callId) ?? retry.call,
                },
                hostEpoch: deps.sessions.epoch,
                callId,
                target,
                facts,
                workerEpoch: ctx.workerEpoch,
              });
            }
          }
        }
        return refuseStale(stale);
      });
    }
    if (request.ok && request.kind === "outcome_query") {
      let callId = request.value.call_id;
      let answer = await throughGate(() =>
        servedCallerKey === undefined
          ? refuse("no_session", `${toolNameForText} refused: no server-asserted session.`)
          : lookupCallerCall({
              sessions: deps.sessions,
              callLog: deps.callLog,
              callerKey: servedCallerKey,
              callId,
              target,
              facts,
            }),
      );
      let backgroundStatus =
        answer.envelope.outcome === "completed" && deps.policy.backgroundShells?.enabled() === true
          ? await currentSession()?.backgroundShells.statusOf(facts.joinedCallId ?? callId)
          : undefined;
      return backgroundStatus === undefined
        ? answer
        : backgroundCommandStatusText(target, callId, backgroundStatus);
    }
    if (!tool) {
      let refuseNotServed = () =>
        refuse(
          "not_served",
          toolNotServedMessage({
            toolName: toolNameForText,
            targetName: deps.targetName,
          }),
        );
      let session = currentSession();
      let callId = callEnvelope?.call_id;
      let knownCall =
        session !== undefined && callId !== undefined ? session.calls.lookup(callId) : undefined;
      if (session === undefined || callId === undefined || knownCall === undefined) return refuseNotServed();
      let answer = () =>
        joinKnownCall({
          known: session.calls.lookup(callId) ?? knownCall,
          session,
          hostEpoch: deps.sessions.epoch,
          callId,
          target,
          facts,
        });
      if (callEnvelope?.approval === undefined || knownCall.summary.state !== "asked")
        return throughGate(answer);
      let pendingAsk =
        knownCall.summary.askId !== undefined ? session.pendingAsks.peek(knownCall.summary.askId) : undefined;
      if (pendingAsk === undefined || pendingAsk.callId !== callId || pendingAsk.toolStillServed())
        return refuseNotServed();
      return throughGate(() => {
        let refusal = refuseNotServed();
        withdrawAskedCall(session, pendingAsk.askId, {
          reason: "tool_withdrawn",
          message: withdrawnRequestMessage({
            targetName: deps.targetName,
            reason: "tool_withdrawn",
          }),
          retain: refusal,
        });
        facts.askStillPending = false;
        return refusal;
      });
    }
    if (!request.ok && deps.policy.requireEnvelope)
      return refuse(
        "invalid_request",
        mustUseForwarderMessage({
          toolName: toolNameForText,
          targetName: deps.targetName,
        }),
      );
    if (deps.readiness !== undefined && !deps.readiness.ready) {
      await withDeadline(
        deps.readiness.whenReady(),
        clampToMaxPageSize(callDeadlineMs(deps.policy.limits, callEnvelope) - (Date.now() - facts.startedAt)),
      );
      if (!deps.readiness.ready) {
        logForDebugging(
          `[remote-tools] ${toolNameForText} refused: this machine was still loading its hooks and settings when the call's deadline ran out`,
          {
            level: "warn",
          },
        );
        return refuse(
          "queue_full",
          notStartedUpMessage({
            targetName: deps.targetName,
          }),
          {
            limit: "queue",
          },
        );
      }
    }
    let session = currentSession();
    if (callId !== undefined && session !== undefined) {
      let knownCall = session.calls.lookup(callId);
      if (knownCall !== undefined)
        return throughGate(() =>
          joinKnownCall({
            known: session.calls.lookup(callId) ?? knownCall,
            session,
            hostEpoch: deps.sessions.epoch,
            callId,
            target,
            facts,
          }),
        );
      facts.enteredRecord = session.calls.receive(callId, {
        retryKey: decidingInput(tool, normalizedInput, session.cwd ?? deps.launchDir),
        workerEpoch: ctx.workerEpoch,
      });
      let retry = session.calls.retryOf(callId);
      let directoryReset = session.directoryReset;
      if (
        retry === undefined &&
        facts.enteredRecord &&
        directoryReset !== undefined &&
        directoryReset.from !== session.cwd
      ) {
        session.calls.rekey(callId, decidingInput(tool, normalizedInput, directoryReset.from));
        let retryBeforeReset = session.calls.retryOf(callId);
        if (retryBeforeReset !== undefined && retryBeforeReset.call.receivedAt < directoryReset.at)
          retry = retryBeforeReset;
        else session.calls.rekey(callId, decidingInput(tool, normalizedInput, session.cwd ?? deps.launchDir));
      }
      if (
        retry !== undefined &&
        retry.call.summary.state !== "asked" &&
        !isServedReadOnly(tool, normalizedInput, deps)
      )
        return throughGate(() =>
          joinRetry({
            session,
            joined: {
              callId: retry.callId,
              call: session.calls.lookup(retry.callId) ?? retry.call,
            },
            hostEpoch: deps.sessions.epoch,
            callId,
            target,
            facts,
            workerEpoch: ctx.workerEpoch,
          }),
        );
    }
    let serve = () =>
      serveToolCall({
        tool,
        toolInput: normalizedInput,
        wireArguments,
        ctx,
        deps,
        target,
        facts,
      });
    let redeemedAsk = callEnvelope?.approval?.decision === "allow" ? pendingAsk() : undefined;
    if (redeemedAsk !== undefined) {
      redeemedAsk.redeemingLegs += 1;
      facts.redeemsAskId = redeemedAsk.askId;
    }
    try {
      if (deps.policy.admission === "none")
        return await serve().catch((error) => callFailureEnvelope(error, target, facts, ctx.signal, {}));
      if (!deps.gate)
        return refuse("unbound", refusalTargetNotAcceptingText(toolNameForText, deps.targetName));
      let now = Date.now();
      let admissionOutcomes = createAdmissionOutcomes({
        target,
        facts,
        refuse,
        ctx,
        serve: () => {
          facts.postureWaitMs = Date.now() - now;
          return serve();
        },
      });
      return await (callEnvelope?.approval?.decision === "deny"
        ? deps.gate.admitWithoutSlot(tool.name, ctx, admissionOutcomes)
        : deps.gate.run(tool.name, ctx, admissionOutcomes));
    } finally {
      if (redeemedAsk !== undefined) {
        redeemedAsk.redeemingLegs -= 1;
        facts.redeemsAskId = undefined;
      }
    }
  })().catch((error) => {
    logForDebugging(
      `[remote-tools] serving ${toolNameForText} failed before admission: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return refuse(
      "invalid_request",
      `The call sent to ${deps.targetName} could not be read \u2014 it was not run.`,
    );
  });
  let sessionAfter = currentSession();
  if (
    callId !== undefined &&
    facts.enteredRecord &&
    sessionAfter !== undefined &&
    facts.answeredFromRecord === undefined &&
    hasSettledOutcome(envelope) &&
    sessionAfter.calls.lookup(callId)?.result === undefined
  )
    sessionAfter.calls.settle(callId, envelope, isSessionDenial(envelope));
  logServedCallTelemetry(envelope.envelope, facts, deps, sessionAfter);
  return buildRemoteToolCallResult(envelope);
}
//@ chunk-nvm0wye1.js:81431-81524 placement (2.1.88 match: _temp, 0.751)
function hasSettledOutcome(result) {
  let { outcome } = result.envelope;
  return outcome === "completed" || outcome === "refused" || outcome === "failed";
}
//@ chunk-nvm0wye1.js:81524-81829 placement
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
//@ chunk-nvm0wye1.js:81829-82039 placement
function createAdmissionOutcomes({ target, facts, refuse, ctx, serve }) {
  return {
    refuse: (code, message) => refuse(admissionRefusalCode(code), message),
    fail: (error) => callFailureEnvelope(error, target, facts, ctx.signal, {}),
    cancelled: () =>
      failedEnvelope(target, facts, "cancelled", "The caller cancelled the call before it ran."),
    serve,
  };
}
//@ chunk-nvm0wye1.js:82039-82137 placement
function refusalTargetNotAcceptingText(toolName, targetName) {
  return `${toolName} refused: ${targetName} is not accepting calls from cloud sessions right now.`;
}
//@ chunk-nvm0wye1.js:82137-82346 placement
function admissionRefusalCode(code) {
  switch (code) {
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

/**
 * cli/headlessCloud/streamFilter.ts
 *
 * 2.1.316 新增：云会话下行流过滤：worker 就绪前缓存、规范化会话信息、为宿主展平内容。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fe6rs39h.js (20)
 * attribution: placement 20
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
} from "crypto";
import { logForDebugging } from "../../utils/debug.js";
import {
  sanitizeCloudText,
  cloudInformationalMessage,
  clipCloudLine,
  dPr,
} from "../cloudSession/headlessCloudClient.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { readWorkerEpoch } from "../../remote/wireFrameShape.js";
import { scopeKey } from "../transports/ccrClient.js";
import { hasToolResultContent } from "../../remote/controlRequestShape.js";
import { qwn } from "../transports/ccrMessageMapping.js";
import { MMs } from "../cloudSession/hostedSessionRestrictions.js";
import { uniq, count } from "../../utils/collections.js";
import { Vt } from "../../utils/agentId.js";
import {
  readSetupStepFields,
  isStaleTimestamp,
  createSetupProgress,
  applySetupEvent,
} from "../../services/cloudSessions/setupProgress.js";
import { extractInboundAttachments } from "../../bridge/inboundAttachments.js";
import { qt, Uo, Bo, xo, No } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { jsonStringify } from "../../utils/slowOperations.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { HEADLESS_FEATURE_NAMES } from "./headlessFeatures.js";

//@ chunk-fe6rs39h.js:44698-45093 placement
var STREAM_FILTER_LIMITS = 250,
  Ao = 1000,
  Fo = 1000,
  Nn = 200,
  Un = 30000,
  Po = 200000,
  To = 2048,
  Bn = {
    assistant: !0,
    user: !0,
    result: !0,
    system: !0,
    stream_event: !0,
    tool_progress: !0,
    tool_use_summary: !0,
    rate_limit_event: !0,
    prompt_suggestion: !0,
    conversation_reset: !0,
    command_lifecycle: !0,
    transcript_mirror: !1,
    auth_status: !1,
    active_goal: !1,
    autocompact_state: !1,
    keep_alive: !1,
    control_request: !1,
    control_response: !1,
    control_cancel_request: !1,
  };
//@ chunk-fe6rs39h.js:45093-45148 placement
function isForwardedMessageType(e) {
  return Object.hasOwn(Bn, e) ? Bn[e] : void 0;
}
//@ chunk-fe6rs39h.js:45148-45361 placement
var HELD_SYSTEM_SUBTYPES = new Set([
  "synced_file_changed",
  "mcp_auth_required",
  "tunnel_stream_interrupted",
  "composer_notice",
  "composer_notice_dismissed",
  "workflow_launch",
  "queued_notification",
  "heartbeat_probe",
  "classifier_verdict",
]);
//@ chunk-fe6rs39h.js:45361-45457 placement
function isTransientStreamMessage(e) {
  return e.type === "stream_event" || (e.type === "system" && e.subtype === "thinking_tokens");
}
//@ chunk-fe6rs39h.js:45457-45712 placement
class BoundedUuidSet {
  ceiling;
  uuids = new Set();
  constructor(e) {
    this.ceiling = e;
  }
  add(e) {
    if (this.uuids.has(e)) return;
    if (this.uuids.size >= this.ceiling) {
      let n = this.uuids.values().next().value;
      if (n !== void 0) this.uuids.delete(n);
    }
    this.uuids.add(e);
  }
  has(e) {
    return this.uuids.has(e);
  }
}
/**
 * 过滤云会话下行帧：等 worker 就绪前缓存、去掉 __proto__/cloud_session 等不允许的键、丢弃对端伪造标签，再交给宿主。
 */
//@ chunk-fe6rs39h.js:45712-56002 placement
class CloudStreamFilter {
  ports;
  workerReady;
  holdingForInit;
  closed = !1;
  heldForInit = [];
  peerHeldForInit = 0;
  peerFramesDroppedBeforeInitCount = 0;
  resultsBeforeInitCount = 0;
  maxHeldForInit = 0;
  bootstrap = null;
  emittedUuids = new BoundedUuidSet(Po);
  emittedPeerUuids = new BoundedUuidSet(To);
  narrateAfterReady;
  stamped;
  turnCount = 0;
  initCount = 0;
  summaryWritten = !1;
  workerUps = 0;
  lastWorkerUpAt = null;
  initSinceWorkerUp = !0;
  bootCountedByFrameAt = null;
  entry;
  sessionIdChangeCount = 0;
  peerContentOmittedCount = 0;
  peerDocumentsAsTextCount = 0;
  peerDropsTold = 0;
  peerToolUseOmitted = !1;
  cloudSessionKeysDroppedCount = 0;
  reservedTagsDroppedCount = 0;
  protoMembersDroppedCount = 0;
  serviceEventsDroppedCount = 0;
  unknownFramesDroppedCount = 0;
  synthesizedHeld = new Set();
  lastBlock;
  deltaSeq = 0;
  pendingDelta = null;
  connectEpoch;
  constructor(e, { entry: n, initialSessionId: s, connectEpoch: r, writesStatusBeforeInit: h }) {
    this.ports = e;
    ((this.entry = n),
      (this.lastBlock = h ? new Map() : null),
      (this.workerReady = n === "attach"),
      (this.holdingForInit = !0),
      (this.narrateAfterReady = n === "create"),
      (this.stamped = s),
      (this.connectEpoch = r));
  }
  get stampedSessionId() {
    return this.stamped;
  }
  get turns() {
    return this.turnCount;
  }
  get maxHeld() {
    return this.maxHeldForInit;
  }
  get counts() {
    return {
      sessionIdChanges: this.sessionIdChangeCount,
      peerContentOmitted: this.peerContentOmittedCount,
      peerDocumentsAsText: this.peerDocumentsAsTextCount,
      peerToolUseOmitted: this.peerToolUseOmitted,
      cloudSessionKeysDropped: this.cloudSessionKeysDroppedCount,
      reservedTagsDropped: this.reservedTagsDroppedCount,
      protoMembersDropped: this.protoMembersDroppedCount,
      serviceEventsDropped: this.serviceEventsDroppedCount,
      unknownFramesDropped: this.unknownFramesDroppedCount,
      peerFramesDroppedBeforeInit: this.peerFramesDroppedBeforeInitCount,
      resultsBeforeInit: this.resultsBeforeInitCount,
    };
  }
  handle(e, n) {
    let s = stripProtoKey(e);
    if (s !== e)
      (this.protoMembersDroppedCount++,
        logForDebugging(
          `[headlessCloudClient] dropped a __proto__ member on a ${sanitizeCloudText(truncateToLength(s.type, 40))} frame from source=${sanitizeCloudText(truncateToLength(n.source ?? "unknown", 40))}`,
          { level: "warn" },
        ));
    let r = stripApiErrorOrigin(s),
      h = rpo(r);
    if (h !== r)
      (this.reservedTagsDroppedCount++,
        logForDebugging(
          `[headlessCloudClient] dropped a tag that a session may not set, on a ${sanitizeCloudText(truncateToLength(h.type, 40))} frame from source=${sanitizeCloudText(truncateToLength(n.source ?? "unknown", 40))}`,
          { level: "warn" },
        ));
    if (h.type === "system" && h.subtype === "cloud_session_delta")
      return (this.cloudSessionKeysDroppedCount++, !0);
    let y = stripCloudSessionKey(h);
    if (y !== h)
      (this.cloudSessionKeysDroppedCount++,
        logForDebugging(
          `[headlessCloudClient] dropped a cloud_session key on a ${sanitizeCloudText(truncateToLength(y.type, 40))} frame from source=${sanitizeCloudText(truncateToLength(n.source ?? "unknown", 40))}`,
          { level: "warn" },
        ));
    if (y.type === "env_manager_log") return (this.reduceBootstrap(y), !0);
    let S = isForwardedMessageType(y.type);
    if (S === void 0) return (this.noteUnknownFrame(y.type, n.source), !1);
    if (y.type !== "user" && !isTransientStreamMessage(y) && n.source === "worker") {
      if (
        (this.adoptWorkerSessionId(y),
        this.entry === "attach" && this.holdingForInit && (y.type === "assistant" || y.type === "result"))
      )
        this.releaseHeld();
      if (this.entry === "create" && this.workerUps === 0) {
        let now = this.ports.clock.now();
        ((this.lastWorkerUpAt = now),
          (this.initSinceWorkerUp = !1),
          (this.bootCountedByFrameAt = now),
          this.noteWorkerUp(this.bootstrap?.sessionMode ?? void 0));
      }
      this.signalWorkerReady("worker_frame");
    }
    if (
      y.type === "assistant" ||
      y.type === "stream_event" ||
      y.type === "tool_progress" ||
      (y.type === "system" && y.subtype === "status" && y.status === "requesting")
    )
      this.ports.onTurnInFlight?.();
    switch (y.type) {
      case "system":
        if (y.subtype === "init") {
          ((this.initCount += 1), (this.initSinceWorkerUp = !0));
          let R = readWorkerEpoch(y);
          return (
            this.ports.onWorkerInit?.({
              ordinal: this.initCount,
              sessionId: this.stamped,
              ...(R !== void 0 && { workerEpoch: R }),
            }),
            this.emitInit(y),
            !0
          );
        }
        break;
      case "result":
        ((this.turnCount += 1), this.ports.onTurnEnded?.(), (this.narrateAfterReady = !1));
        let w = this.entry === "create" && this.holdingForInit && n.source === "worker";
        if (w) (this.resultsBeforeInitCount++, this.releaseHeld());
        if (S) this.emitAfterInit(filterResultErrors(y));
        if ((this.entry === "attach" || w) && this.initCount === 0 && n.source === "worker" && !this.closed)
          this.holdingForInit = !0;
        return !0;
      case "user":
        return (this.handleUserFrame(y, n.source), !0);
      case "stream_event":
        if (!this.ports.includePartialMessages) return !0;
        break;
      default:
        break;
    }
    if (S) this.emitAfterInit(y);
    return !0;
  }
  noteUnknownFrame(e, n) {
    let s = HELD_SYSTEM_SUBTYPES.has(e);
    if (s) this.serviceEventsDroppedCount++;
    else this.unknownFramesDroppedCount++;
    logForDebugging(
      `[headlessCloudClient] dropped a ${sanitizeCloudText(truncateToLength(e, 40))} ${s ? "service event" : "frame this build does not write"}, from source=${sanitizeCloudText(truncateToLength(n ?? "unknown", 40))}`,
      s ? void 0 : { level: "warn" },
    );
  }
  handleUserFrame(e, n) {
    let s =
      typeof e.uuid === "string"
        ? this.ports.outbound.streamEcho(e.uuid, e.message?.content)
        : { verdict: "not_own" };
    switch (s.verdict) {
      case "claim":
        this.emitAfterInit(
          s.sent === void 0
            ? { ...e, isReplay: !0, session_id: this.stamped }
            : scopeKey(this.stamped, e.uuid, s.sent),
          { synthesized: !0, ownEcho: !0 },
        );
        return;
      case "consume":
        (this.emittedUuids.add(e.uuid.toLowerCase()),
          logForDebugging(`[headlessCloudClient] consumed our own echo of ${String(e.uuid)}`));
        return;
      case "peer":
        this.emitAfterInit(this.projectPeer(e, { keepUuid: !1 }), { peer: !0, synthesized: !0 });
        return;
      case "not_own":
        break;
    }
    if (n === "worker" || hasToolResultContent(e)) {
      let S = qwn(e.tool_use_result, e.message);
      this.emitAfterInit(S === e.tool_use_result ? e : { ...e, tool_use_result: S });
      return;
    }
    let r = typeof e.uuid === "string" ? e.uuid.toLowerCase() : "",
      h =
        r !== "" &&
        (this.emittedUuids.has(r) || this.emittedPeerUuids.has(r) || this.ports.outbound.wasTaken(r)),
      projectPeer = this.projectPeer(e, { keepUuid: !h });
    if ("uuid" in projectPeer && typeof projectPeer.uuid === "string")
      this.emittedPeerUuids.add(projectPeer.uuid.toLowerCase());
    this.emitAfterInit(projectPeer, { peer: !0, synthesized: !0 });
  }
  projectPeer(e, { keepUuid: n }) {
    let {
      prompt: prompt,
      omitted: omitted,
      omittedToolUse: omittedToolUse,
      documentsAsText: documentsAsText,
    } = userMessageForHost(e, { keepUuid: n, sessionId: this.stamped });
    return (
      (this.peerContentOmittedCount += omitted),
      (this.peerDocumentsAsTextCount += documentsAsText),
      (this.peerToolUseOmitted = this.peerToolUseOmitted || omittedToolUse),
      prompt
    );
  }
  writeOwnEcho(e, { duplicate: n = !1 } = {}) {
    this.emitAfterInit(e, { synthesized: !0, ownEcho: !0, sessionPast: n });
  }
  rememberEmittedUuid(e) {
    if (!isTransientStreamMessage(e) && "uuid" in e && typeof e.uuid === "string")
      this.emittedUuids.add(e.uuid.toLowerCase());
  }
  close() {
    if (this.pendingDelta !== null) (this.cancelPendingDelta(), this.writeDelta());
    ((this.closed = !0), this.releaseHeld());
  }
  releaseHeld() {
    this.holdingForInit = !1;
    let heldForInit = this.heldForInit;
    ((this.heldForInit = []),
      (this.peerHeldForInit = 0),
      heldForInit.forEach((s) =>
        this.ports.emit(
          s.type === "user" && this.synthesizedHeld.has(s) ? { ...s, session_id: this.stamped } : s,
        ),
      ),
      this.synthesizedHeld.clear());
    let n = this.peerFramesDroppedBeforeInitCount - this.peerDropsTold;
    if (n > 0)
      ((this.peerDropsTold += n),
        this.ports.emit(
          cloudInformationalMessage(
            this.stamped,
            "warning",
            `This client kept only ${Nn} of the messages that other clients of this session sent while it waited for the session to start, and dropped ${n} more. Claude may read them all.`,
          ),
        ));
  }
  startCcCountsAsWorkerUp(e) {
    return this.lastWorkerUpAt === null || this.initSinceWorkerUp || e - this.lastWorkerUpAt >= Un;
  }
  noteWorkerUp(e) {
    ((this.workerUps += 1),
      this.ports.onWorkerUp?.({ generation: this.workerUps, ...(e !== void 0 && { sessionMode: e }) }));
  }
  signalWorkerReady(e) {
    if (this.workerReady) return;
    ((this.workerReady = !0), this.ports.onWorkerReady(e));
  }
  emitAfterInit(e, { peer: n = !1, synthesized: s = !1, ownEcho: r = !1, sessionPast: h = !1 } = {}) {
    if (!n) this.rememberEmittedUuid(e);
    let y = (e.type === "system" && e.subtype === "informational") || (this.entry === "attach" && (!r || h));
    if (!this.holdingForInit || y) {
      this.ports.emit(e);
      return;
    }
    if (isTransientStreamMessage(e)) return;
    if (n) {
      if (this.peerHeldForInit >= Nn) {
        this.peerFramesDroppedBeforeInitCount += 1;
        return;
      }
      this.peerHeldForInit += 1;
    } else if (this.heldForInit.length - this.peerHeldForInit >= Fo) {
      (this.releaseHeld(), this.ports.emit(e));
      return;
    }
    if ((this.heldForInit.push(e), s)) this.synthesizedHeld.add(e);
    this.maxHeldForInit = Math.max(this.maxHeldForInit, this.heldForInit.length);
  }
  emitInit(e) {
    let cloudSession = this.ports.cloudSession(),
      s = cloudSession === void 0 ? void 0 : normalizeCloudSessionInfo(cloudSession);
    if ((this.rememberEmittedUuid(e), this.cancelPendingDelta(), s !== void 0))
      this.lastBlock = entriesToStringMap(s);
    if (
      (this.ports.emit({
        ...e,
        ...(e.capabilities !== void 0 && {
          capabilities: e.capabilities.filter((capability) => !MMs.has(capability) && !0),
        }),
        cloud_session: s,
      }),
      this.writeSummaryFrom(s),
      this.holdingForInit)
    )
      this.releaseHeld();
  }
  noteCloudSessionChanged() {
    if (this.closed || (this.initCount === 0 && this.lastBlock === null)) return;
    let now = this.ports.clock.now(),
      n = this.pendingDelta?.since ?? now;
    this.pendingDelta?.cancel();
    let max = Math.max(0, Math.min(STREAM_FILTER_LIMITS, n + Ao - now));
    this.pendingDelta = {
      since: n,
      cancel: this.ports.clock.setTimeout(() => {
        ((this.pendingDelta = null), this.writeDelta());
      }, max),
    };
  }
  cancelPendingDelta() {
    (this.pendingDelta?.cancel(), (this.pendingDelta = null));
  }
  writeDelta() {
    let cloudSession = this.ports.cloudSession();
    if (cloudSession === void 0 || this.lastBlock === null) return;
    let n = normalizeCloudSessionInfo(cloudSession),
      s = entriesToStringMap(n),
      lastBlock = this.lastBlock,
      filtered = uniq([...lastBlock.keys(), ...s.keys()]).filter((y) => lastBlock.get(y) !== s.get(y));
    if (filtered.length === 0) return;
    ((this.lastBlock = s),
      (this.deltaSeq += 1),
      this.ports.emit({
        type: "system",
        subtype: "cloud_session_delta",
        seq: this.deltaSeq,
        changed: filtered,
        cloud_session: n,
        uuid: randomUUID_4(),
        session_id: this.stamped,
      }));
  }
  offerSummary() {
    if (this.summaryWritten || this.initCount === 0) return;
    let cloudSession = this.ports.cloudSession();
    if (cloudSession !== void 0) this.writeSummaryFrom(normalizeCloudSessionInfo(cloudSession));
  }
  writeSummaryFrom(e) {
    if (this.summaryWritten || e === void 0) return;
    let n = this.ports.summaryLine?.(e);
    if (n !== void 0 && n !== "")
      ((this.summaryWritten = !0), this.ports.emit(cloudInformationalMessage(this.stamped, "notice", n)));
  }
  adoptWorkerSessionId(e) {
    if (e.type === "user" || !("session_id" in e)) return;
    let n = Vt(e.session_id) === null ? null : e.session_id.toLowerCase();
    if (n === null || n === this.stamped.toLowerCase()) return;
    ((this.sessionIdChangeCount += 1), (this.stamped = n), this.ports.onWorkerSessionId(n));
  }
  reduceBootstrap(e) {
    let now = this.ports.clock.now(),
      s = readSetupStepFields(e);
    if (s.stepId === "start_cc" && s.stepStatus === "completed" && !isStaleTimestamp(e, now)) {
      let k = this.bootCountedByFrameAt !== null && now - this.bootCountedByFrameAt < Un;
      if (((this.bootCountedByFrameAt = null), !k && this.startCcCountsAsWorkerUp(now)))
        ((this.lastWorkerUpAt = now),
          (this.initSinceWorkerUp = !1),
          this.noteWorkerUp(this.bootstrap?.sessionMode ?? void 0));
    }
    if (this.entry === "attach" && this.holdingForInit && s.stepId !== null && s.stepStatus === "failed")
      this.releaseHeld();
    if (this.workerReady && !this.narrateAfterReady) return;
    let r = this.bootstrap !== null && this.bootstrap.hasStructuredSteps && !this.bootstrap.terminal;
    if (this.workerReady && !r && isStaleTimestamp(e, now)) return;
    let h = this.bootstrap !== null,
      y = this.bootstrap ?? createSetupProgress(this.connectEpoch, { wake: this.entry === "attach" }),
      S = applySetupEvent(y, e, "", now, this.connectEpoch);
    if (
      ((this.bootstrap = S),
      this.ports.onProvisioning?.(S, h ? y : null),
      S.terminal || S.steps.some((step) => step.status === "failed"))
    )
      this.narrateAfterReady = !1;
    if (this.workerReady) return;
    let { stepId: stepId, stepStatus: stepStatus } = readSetupStepFields(e);
    if (stepId !== null && stepStatus === "failed") {
      (this.releaseHeld(),
        this.ports.outbound.failQueued("the cloud container failed to start", "step_failed"),
        this.signalWorkerReady("step_failed"));
      return;
    }
    if (stepId === "start_cc" && stepStatus === "completed") this.signalWorkerReady("start_cc");
  }
}
//@ chunk-fe6rs39h.js:56002-56627 placement
function userMessageForHost(e, { keepUuid: keepUuid, sessionId: sessionId }) {
  let r = keepUuid && typeof e.uuid === "string" ? Vt(e.uuid) : null,
    h = extractInboundAttachments(e).length,
    y = flattenContentForHost(h > 0 && e.message?.content === void 0 ? "" : e.message?.content),
    S =
      h === 0
        ? y.content
        : [
            ...(typeof y.content !== "string"
              ? y.content
              : y.content === ""
                ? []
                : [{ type: "text", text: y.content }]),
            { type: "text", text: `[${h} ${h === 1 ? "file" : "files"} attached by another client omitted]` },
          ],
    w = y.omitted + h,
    { omittedToolUse: omittedToolUse, documentsAsText: documentsAsText } = y;
  return {
    prompt: {
      type: "user",
      ...(r !== null && { uuid: r }),
      session_id: sessionId,
      message: { role: "user", content: S },
      parent_tool_use_id: null,
      ...(isIsoTimestamp(e.timestamp) && { timestamp: e.timestamp }),
    },
    omitted: w,
    omittedToolUse: omittedToolUse,
    documentsAsText: documentsAsText,
  };
}
//@ chunk-fe6rs39h.js:56983-58336 placement
function flattenContentForHost(e) {
  if (typeof e === "string") return { content: e, omitted: 0, omittedToolUse: !1, documentsAsText: 0 };
  if (!Array.isArray(e))
    return {
      content: [{ type: "text", text: qt }],
      omitted: 1,
      omittedToolUse: isToolUseBlock(e),
      documentsAsText: 0,
    };
  let n = e,
    any = n.some(isToolUseBlock),
    mapped = n.map((S) => {
      if (typeof S !== "object" || S === null || !("type" in S) || S.type !== "document") return null;
      let safeParse = Uo().safeParse(S);
      if (!safeParse.success) return null;
      let { source: source } = safeParse.data,
        k = safeParse.data.title ?? "",
        I = safeParse.data.context ?? "",
        O = source.type === "content" && typeof source.content !== "string" ? source.content : [];
      if (!O.every((L) => Bo().safeParse(L).success)) return null;
      let P =
          source.type === "text"
            ? source.data
            : typeof source.content === "string"
              ? source.content
              : O.map((L) => L.text).join(`
`),
        joined = [xo, ...(k === "" ? [] : [`title: ${k}`]), ...(I === "" ? [] : [`context: ${I}`]), P].join(`
`);
      return [k, I, P, joined].some((L) => hasToolResultContent({ message: { content: L } })) ? null : joined;
    }),
    flattened = n.flatMap((S, w) => {
      if (typeof S !== "object" || S === null || !("type" in S)) return [];
      if (S.type === "text" && "text" in S && typeof S.text === "string")
        return [{ type: "text", text: S.text }];
      let R = mapped[w];
      if (typeof R === "string") return [{ type: "text", text: R }];
      let k = S.type === "image" ? base64ImageSource(S) : null;
      return k === null ? [] : [{ type: "image", source: k }];
    });
  if (hasSplitTextMatch(n) || hasSplitTextMatch(flattened))
    return {
      content: [{ type: "text", text: qt }],
      omitted: n.length,
      omittedToolUse: any,
      documentsAsText: 0,
    };
  let y = n.length - flattened.length;
  return {
    content: y > 0 ? [...flattened, { type: "text", text: qt }] : flattened,
    omitted: y,
    omittedToolUse: any,
    documentsAsText: count(mapped, (S) => S !== null),
  };
}
//@ chunk-fe6rs39h.js:58336-58421 placement
function isToolUseBlock(e) {
  return typeof e === "object" && e !== null && "type" in e && e.type === "tool_use";
}
//@ chunk-fe6rs39h.js:58421-58649 placement = extractErrorTypeFromData (1)
function hasSplitTextMatch(data) {
  let flattened = data.flatMap((s) =>
    typeof s === "object" &&
    s !== null &&
    "type" in s &&
    s.type === "text" &&
    "text" in s &&
    typeof s.text === "string"
      ? [s.text]
      : [],
  );
  return (
    flattened.length > 1 &&
    [
      "",
      `
`,
      " ",
    ].some((s) => hasToolResultContent({ message: { content: flattened.join(s) } }))
  );
}
//@ chunk-fe6rs39h.js:58649-58940 placement
function base64ImageSource(e) {
  let n = "source" in e ? e.source : void 0;
  if (
    typeof n !== "object" ||
    n === null ||
    !("type" in n) ||
    n.type !== "base64" ||
    !("data" in n) ||
    typeof n.data !== "string"
  )
    return null;
  let found = No.find((r) => "media_type" in n && n.media_type === r);
  return found === void 0 ? null : { type: "base64", media_type: found, data: n.data };
}
//@ chunk-fe6rs39h.js:58940-59086 placement
function isIsoTimestamp(e) {
  return (
    typeof e === "string" &&
    e.length <= 40 &&
    /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:?\d{2})?$/.test(e) &&
    !Number.isNaN(Date.parse(e))
  );
}
//@ chunk-fe6rs39h.js:59086-59181 placement
function stripProtoKey(e) {
  if (!Object.hasOwn(e, "__proto__")) return e;
  let { ["__proto__"]: n, ...s } = e;
  return s;
}
//@ chunk-fe6rs39h.js:59181-59280 placement
function stripCloudSessionKey(e) {
  if (!Object.hasOwn(e, "cloud_session")) return e;
  let { cloud_session: cloud_session, ...s } = e;
  return s;
}
//@ chunk-fe6rs39h.js:59280-59318 placement
function rpo(e) {
  let { tag: tag } = e;
  return e;
}
//@ chunk-fe6rs39h.js:59318-59410 placement
function entriesToStringMap(e) {
  return new Map(Object.entries(e).flatMap(([n, s]) => (s === void 0 ? [] : [[n, jsonStringify(s)]])));
}
//@ chunk-fe6rs39h.js:59410-61114 placement
function normalizeCloudSessionInfo(e) {
  let n = e.id.startsWith("cse_") ? `session_${sessionIdBody(e.id)}` : e.id,
    directory_sync = e.directory_sync;
  return {
    ...e,
    id: n,
    device:
      e.device.status === "unbound"
        ? { ...e.device, reason: clipCloudLine(e.device.reason), message: clipCloudLine(e.device.message) }
        : {
            ...e.device,
            ...(e.device.display_name !== void 0 && { display_name: clipCloudLine(e.device.display_name) }),
          },
    directory_sync: {
      state: directory_sync.state,
      ...(directory_sync.reason !== void 0 && { reason: clipCloudLine(directory_sync.reason) }),
      ...(directory_sync.message !== void 0 && { message: clipCloudLine(directory_sync.message) }),
      ...(directory_sync.first_upload !== void 0 && { first_upload: directory_sync.first_upload }),
      ...(directory_sync.synced_files !== void 0 && { synced_files: directory_sync.synced_files }),
      ...(directory_sync.other_window !== void 0 && { other_window: directory_sync.other_window }),
      ...(directory_sync.muted !== void 0 && { muted: directory_sync.muted }),
      ...(directory_sync.started_from_upload !== void 0 && {
        started_from_upload: directory_sync.started_from_upload,
      }),
      ...(directory_sync.direction !== void 0 && { direction: directory_sync.direction }),
      file_mode: directory_sync.file_mode,
      file_mode_source: directory_sync.file_mode_source,
    },
    ...(e.host !== void 0 && {
      host: {
        handle: clipCloudLine(e.host.handle),
        working_dir: clipCloudLine(e.host.working_dir),
        platform: clipCloudLine(e.host.platform),
        ...(e.host.cli_version !== void 0 && { cli_version: clipCloudLine(e.host.cli_version) }),
      },
    }),
    ...(e.serving !== void 0 && {
      serving: {
        state: e.serving.state,
        ...(e.serving.reason !== void 0 && { reason: e.serving.reason }),
        policy: e.serving.policy,
        channel: e.serving.channel,
      },
    }),
    ...(e.calls !== void 0 && {
      calls: {
        live: e.calls.live.map((r) => ({
          call_id: r.call_id,
          tool: clipCloudLine(r.tool),
          state: r.state,
          since: r.since,
          ...(r.ask_id !== void 0 && { ask_id: r.ask_id }),
          ...(r.lapses_at !== void 0 && { lapses_at: r.lapses_at }),
          ...(r.classifier_eligible !== void 0 && { classifier_eligible: r.classifier_eligible }),
        })),
        recent: e.calls.recent.map((r) => ({
          call_id: r.call_id,
          tool: clipCloudLine(r.tool),
          ended: r.ended,
          ...(r.code !== void 0 && { code: clipCloudLine(r.code) }),
          at: r.at,
        })),
      },
    }),
    ...(e.notices !== void 0 && {
      notices: e.notices.slice(-dPr).map((r) => ({ key: clipCloudLine(r.key), text: clipCloudLine(r.text) })),
    }),
    ...pickFeatureReports(e),
  };
}
//@ chunk-fe6rs39h.js:61114-61449 placement
function pickFeatureReports(e) {
  let n = e;
  return Object.fromEntries(
    HEADLESS_FEATURE_NAMES.flatMap((s) => {
      let r = n[s];
      if (typeof r !== "object" || r === null) return [];
      let { state: state, source: source, reason: reason, message: message } = r;
      return [
        [
          s,
          {
            ...(typeof state === "string" && { state: clipCloudLine(state) }),
            ...(typeof source === "string" && { source: clipCloudLine(source) }),
            ...(typeof reason === "string" && { reason: clipCloudLine(reason) }),
            ...(typeof message === "string" && { message: clipCloudLine(message) }),
          },
        ],
      ];
    }),
  );
}
//@ chunk-fe6rs39h.js:61449-61543 placement
function stripApiErrorOrigin(e) {
  if (!("api_error_origin" in e)) return e;
  let { api_error_origin: api_error_origin, ...s } = e;
  return s;
}
//@ chunk-fe6rs39h.js:61543-61774 placement
function filterResultErrors(e) {
  if (e.type !== "result" || !("errors" in e)) return e;
  let errors = e.errors;
  if (!Array.isArray(errors)) return e;
  let filtered = errors.filter((r) => !(typeof r === "string" && r.startsWith("[ede_diagnostic]")));
  return filtered.length === errors.length ? e : { ...e, errors: filtered };
}

export {
  filterResultErrors,
  stripCloudSessionKey,
  rpo,
  stripApiErrorOrigin,
  stripProtoKey,
  CloudStreamFilter,
};

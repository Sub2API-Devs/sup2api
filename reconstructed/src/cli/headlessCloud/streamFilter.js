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
import { randomUUID } from "crypto";
import { logForDebugging } from "../../utils/debug.js";
import {
  sanitizeCloudText,
  cloudInformationalMessage,
  clipCloudLine,
  CLOUD_SHORT_LIST_MAX,
} from "../cloudSession/headlessCloudClient.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { readWorkerEpoch } from "../../remote/wireFrameShape.js";
import { scopeKey } from "../transports/ccrClient.js";
import { hasToolResultContent } from "../../remote/controlRequestShape.js";
import { mapToolResultImages } from "../transports/ccrMessageMapping.js";
import { CLOUD_LOCAL_CONTROL_TYPES } from "../cloudSession/hostedSessionRestrictions.js";
import { uniq, count } from "../../utils/collections.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
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
/**
 * 云会话下行流过滤的限额常量：限流余量、持有/保留的对端消息条数、worker 就绪窗口、UUID 去重容量，以及各帧类型是否转发的表。
 */
var STREAM_FILTER_LIMITS = 250;
var STREAM_FILTER_SLACK_MS = 1000;
var MAX_HELD_PEER_MESSAGES = 1000;
var MAX_KEPT_PEER_MESSAGES = 200;
var WORKER_READY_WINDOW_MS = 30000;
var MAX_EMITTED_UUIDS = 200000;
var MAX_EMITTED_PEER_UUIDS = 2048;
var STREAM_FRAME_TYPE_FILTER = {
  assistant: true,
  user: true,
  result: true,
  system: true,
  stream_event: true,
  tool_progress: true,
  tool_use_summary: true,
  rate_limit_event: true,
  prompt_suggestion: true,
  conversation_reset: true,
  command_lifecycle: true,
  transcript_mirror: false,
  auth_status: false,
  active_goal: false,
  autocompact_state: false,
  keep_alive: false,
  control_request: false,
  control_response: false,
  control_cancel_request: false,
};
//@ chunk-fe6rs39h.js:45093-45148 placement
function isForwardedMessageType(type) {
  return Object.hasOwn(STREAM_FRAME_TYPE_FILTER, type) ? STREAM_FRAME_TYPE_FILTER[type] : undefined;
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
  constructor(ceiling) {
    this.ceiling = ceiling;
  }
  add(e) {
    if (this.uuids.has(e)) return;
    if (this.uuids.size >= this.ceiling) {
      let n = this.uuids.values().next().value;
      if (n !== undefined) this.uuids.delete(n);
    }
    this.uuids.add(e);
  }
  has(e) {
    return this.uuids.has(e);
  }
}
//@ chunk-fe6rs39h.js:45712-56002 placement
/**
 * 过滤云会话下行帧：等 worker 就绪前缓存、去掉 __proto__/cloud_session 等不允许的键、丢弃对端伪造标签，再交给宿主。
 */
class CloudStreamFilter {
  ports;
  workerReady;
  holdingForInit;
  closed = false;
  heldForInit = [];
  peerHeldForInit = 0;
  peerFramesDroppedBeforeInitCount = 0;
  resultsBeforeInitCount = 0;
  maxHeldForInit = 0;
  bootstrap = null;
  emittedUuids = new BoundedUuidSet(MAX_EMITTED_UUIDS);
  emittedPeerUuids = new BoundedUuidSet(MAX_EMITTED_PEER_UUIDS);
  narrateAfterReady;
  stamped;
  turnCount = 0;
  initCount = 0;
  summaryWritten = false;
  workerUps = 0;
  lastWorkerUpAt = null;
  initSinceWorkerUp = true;
  bootCountedByFrameAt = null;
  entry;
  sessionIdChangeCount = 0;
  peerContentOmittedCount = 0;
  peerDocumentsAsTextCount = 0;
  peerDropsTold = 0;
  peerToolUseOmitted = false;
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
  constructor(ports, { entry, initialSessionId, connectEpoch, writesStatusBeforeInit }) {
    this.ports = ports;
    this.entry = entry;
    this.lastBlock = writesStatusBeforeInit ? new Map() : null;
    this.workerReady = entry === "attach";
    this.holdingForInit = true;
    this.narrateAfterReady = entry === "create";
    this.stamped = initialSessionId;
    this.connectEpoch = connectEpoch;
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
    if (s !== e) {
      this.protoMembersDroppedCount++;
      logForDebugging(
        `[headlessCloudClient] dropped a __proto__ member on a ${sanitizeCloudText(truncateToLength(s.type, 40))} frame from source=${sanitizeCloudText(truncateToLength(n.source ?? "unknown", 40))}`,
        {
          level: "warn",
        },
      );
    }
    let r = stripApiErrorOrigin(s);
    let h = identity(r);
    if (h !== r) {
      this.reservedTagsDroppedCount++;
      logForDebugging(
        `[headlessCloudClient] dropped a tag that a session may not set, on a ${sanitizeCloudText(truncateToLength(h.type, 40))} frame from source=${sanitizeCloudText(truncateToLength(n.source ?? "unknown", 40))}`,
        {
          level: "warn",
        },
      );
    }
    if (h.type === "system" && h.subtype === "cloud_session_delta") {
      this.cloudSessionKeysDroppedCount++;
      return true;
    }
    let y = stripCloudSessionKey(h);
    if (y !== h) {
      this.cloudSessionKeysDroppedCount++;
      logForDebugging(
        `[headlessCloudClient] dropped a cloud_session key on a ${sanitizeCloudText(truncateToLength(y.type, 40))} frame from source=${sanitizeCloudText(truncateToLength(n.source ?? "unknown", 40))}`,
        {
          level: "warn",
        },
      );
    }
    if (y.type === "env_manager_log") {
      this.reduceBootstrap(y);
      return true;
    }
    let S = isForwardedMessageType(y.type);
    if (S === undefined) {
      this.noteUnknownFrame(y.type, n.source);
      return false;
    }
    if (y.type !== "user" && !isTransientStreamMessage(y) && n.source === "worker") {
      this.adoptWorkerSessionId(y);
      if (this.entry === "attach" && this.holdingForInit && (y.type === "assistant" || y.type === "result"))
        this.releaseHeld();
      if (this.entry === "create" && this.workerUps === 0) {
        let w = this.ports.clock.now();
        this.lastWorkerUpAt = w;
        this.initSinceWorkerUp = false;
        this.bootCountedByFrameAt = w;
        this.noteWorkerUp(this.bootstrap?.sessionMode ?? undefined);
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
          this.initCount += 1;
          this.initSinceWorkerUp = true;
          let workerEpoch = readWorkerEpoch(y);
          this.ports.onWorkerInit?.({
            ordinal: this.initCount,
            sessionId: this.stamped,
            ...(workerEpoch !== undefined && {
              workerEpoch,
            }),
          });
          this.emitInit(y);
          return true;
        }
        break;
      case "result":
        this.turnCount += 1;
        this.ports.onTurnEnded?.();
        this.narrateAfterReady = false;
        let w = this.entry === "create" && this.holdingForInit && n.source === "worker";
        if (w) {
          this.resultsBeforeInitCount++;
          this.releaseHeld();
        }
        if (S) this.emitAfterInit(filterResultErrors(y));
        if ((this.entry === "attach" || w) && this.initCount === 0 && n.source === "worker" && !this.closed)
          this.holdingForInit = true;
        return true;
      case "user":
        this.handleUserFrame(y, n.source);
        return true;
      case "stream_event":
        if (!this.ports.includePartialMessages) return true;
        break;
      default:
        break;
    }
    if (S) this.emitAfterInit(y);
    return true;
  }
  noteUnknownFrame(e, n) {
    let s = HELD_SYSTEM_SUBTYPES.has(e);
    if (s) this.serviceEventsDroppedCount++;
    else this.unknownFramesDroppedCount++;
    logForDebugging(
      `[headlessCloudClient] dropped a ${sanitizeCloudText(truncateToLength(e, 40))} ${s ? "service event" : "frame this build does not write"}, from source=${sanitizeCloudText(truncateToLength(n ?? "unknown", 40))}`,
      s
        ? undefined
        : {
            level: "warn",
          },
    );
  }
  handleUserFrame(e, n) {
    let s =
      typeof e.uuid === "string"
        ? this.ports.outbound.streamEcho(e.uuid, e.message?.content)
        : {
            verdict: "not_own",
          };
    switch (s.verdict) {
      case "claim":
        this.emitAfterInit(
          s.sent === undefined
            ? {
                ...e,
                isReplay: true,
                session_id: this.stamped,
              }
            : scopeKey(this.stamped, e.uuid, s.sent),
          {
            synthesized: true,
            ownEcho: true,
          },
        );
        return;
      case "consume":
        this.emittedUuids.add(e.uuid.toLowerCase());
        logForDebugging(`[headlessCloudClient] consumed our own echo of ${String(e.uuid)}`);
        return;
      case "peer":
        this.emitAfterInit(
          this.projectPeer(e, {
            keepUuid: false,
          }),
          {
            peer: true,
            synthesized: true,
          },
        );
        return;
      case "not_own":
        break;
    }
    if (n === "worker" || hasToolResultContent(e)) {
      let S = mapToolResultImages(e.tool_use_result, e.message);
      this.emitAfterInit(
        S === e.tool_use_result
          ? e
          : {
              ...e,
              tool_use_result: S,
            },
      );
      return;
    }
    let r = typeof e.uuid === "string" ? e.uuid.toLowerCase() : "";
    let h =
      r !== "" &&
      (this.emittedUuids.has(r) || this.emittedPeerUuids.has(r) || this.ports.outbound.wasTaken(r));
    let y = this.projectPeer(e, {
      keepUuid: !h,
    });
    if ("uuid" in y && typeof y.uuid === "string") this.emittedPeerUuids.add(y.uuid.toLowerCase());
    this.emitAfterInit(y, {
      peer: true,
      synthesized: true,
    });
  }
  projectPeer(e, { keepUuid }) {
    let { prompt, omitted, omittedToolUse, documentsAsText } = userMessageForHost(e, {
      keepUuid,
      sessionId: this.stamped,
    });
    this.peerContentOmittedCount += omitted;
    this.peerDocumentsAsTextCount += documentsAsText;
    this.peerToolUseOmitted = this.peerToolUseOmitted || omittedToolUse;
    return prompt;
  }
  writeOwnEcho(e, { duplicate: n = false } = {}) {
    this.emitAfterInit(e, {
      synthesized: true,
      ownEcho: true,
      sessionPast: n,
    });
  }
  rememberEmittedUuid(e) {
    if (!isTransientStreamMessage(e) && "uuid" in e && typeof e.uuid === "string")
      this.emittedUuids.add(e.uuid.toLowerCase());
  }
  close() {
    if (this.pendingDelta !== null) {
      this.cancelPendingDelta();
      this.writeDelta();
    }
    this.closed = true;
    this.releaseHeld();
  }
  releaseHeld() {
    this.holdingForInit = false;
    let heldForInit = this.heldForInit;
    this.heldForInit = [];
    this.peerHeldForInit = 0;
    heldForInit.forEach((s) =>
      this.ports.emit(
        s.type === "user" && this.synthesizedHeld.has(s)
          ? {
              ...s,
              session_id: this.stamped,
            }
          : s,
      ),
    );
    this.synthesizedHeld.clear();
    let n = this.peerFramesDroppedBeforeInitCount - this.peerDropsTold;
    if (n > 0) {
      this.peerDropsTold += n;
      this.ports.emit(
        cloudInformationalMessage(
          this.stamped,
          "warning",
          `This client kept only ${MAX_KEPT_PEER_MESSAGES} of the messages that other clients of this session sent while it waited for the session to start, and dropped ${n} more. Claude may read them all.`,
        ),
      );
    }
  }
  startCcCountsAsWorkerUp(e) {
    return (
      this.lastWorkerUpAt === null ||
      this.initSinceWorkerUp ||
      e - this.lastWorkerUpAt >= WORKER_READY_WINDOW_MS
    );
  }
  noteWorkerUp(e) {
    this.workerUps += 1;
    this.ports.onWorkerUp?.({
      generation: this.workerUps,
      ...(e !== undefined && {
        sessionMode: e,
      }),
    });
  }
  signalWorkerReady(e) {
    if (this.workerReady) return;
    this.workerReady = true;
    this.ports.onWorkerReady(e);
  }
  emitAfterInit(
    e,
    { peer: n = false, synthesized: s = false, ownEcho: r = false, sessionPast: h = false } = {},
  ) {
    if (!n) this.rememberEmittedUuid(e);
    let y = (e.type === "system" && e.subtype === "informational") || (this.entry === "attach" && (!r || h));
    if (!this.holdingForInit || y) {
      this.ports.emit(e);
      return;
    }
    if (isTransientStreamMessage(e)) return;
    if (n) {
      if (this.peerHeldForInit >= MAX_KEPT_PEER_MESSAGES) {
        this.peerFramesDroppedBeforeInitCount += 1;
        return;
      }
      this.peerHeldForInit += 1;
    } else if (this.heldForInit.length - this.peerHeldForInit >= MAX_HELD_PEER_MESSAGES) {
      this.releaseHeld();
      this.ports.emit(e);
      return;
    }
    this.heldForInit.push(e);
    if (s) this.synthesizedHeld.add(e);
    this.maxHeldForInit = Math.max(this.maxHeldForInit, this.heldForInit.length);
  }
  emitInit(e) {
    let n = this.ports.cloudSession();
    let s = n === undefined ? undefined : normalizeCloudSessionInfo(n);
    this.rememberEmittedUuid(e);
    this.cancelPendingDelta();
    if (s !== undefined) this.lastBlock = entriesToStringMap(s);
    this.ports.emit({
      ...e,
      ...(e.capabilities !== undefined && {
        capabilities: e.capabilities.filter(
          (capability) => !CLOUD_LOCAL_CONTROL_TYPES.has(capability) && true,
        ),
      }),
      cloud_session: s,
    });
    this.writeSummaryFrom(s);
    if (this.holdingForInit) this.releaseHeld();
  }
  noteCloudSessionChanged() {
    if (this.closed || (this.initCount === 0 && this.lastBlock === null)) return;
    let e = this.ports.clock.now();
    let since = this.pendingDelta?.since ?? e;
    this.pendingDelta?.cancel();
    let max = Math.max(0, Math.min(STREAM_FILTER_LIMITS, since + STREAM_FILTER_SLACK_MS - e));
    this.pendingDelta = {
      since,
      cancel: this.ports.clock.setTimeout(() => {
        this.pendingDelta = null;
        this.writeDelta();
      }, max),
    };
  }
  cancelPendingDelta() {
    this.pendingDelta?.cancel();
    this.pendingDelta = null;
  }
  writeDelta() {
    let e = this.ports.cloudSession();
    if (e === undefined || this.lastBlock === null) return;
    let n = normalizeCloudSessionInfo(e);
    let s = entriesToStringMap(n);
    let lastBlock = this.lastBlock;
    let filtered = uniq([...lastBlock.keys(), ...s.keys()]).filter((y) => lastBlock.get(y) !== s.get(y));
    if (filtered.length === 0) return;
    this.lastBlock = s;
    this.deltaSeq += 1;
    this.ports.emit({
      type: "system",
      subtype: "cloud_session_delta",
      seq: this.deltaSeq,
      changed: filtered,
      cloud_session: n,
      uuid: randomUUID(),
      session_id: this.stamped,
    });
  }
  offerSummary() {
    if (this.summaryWritten || this.initCount === 0) return;
    let e = this.ports.cloudSession();
    if (e !== undefined) this.writeSummaryFrom(normalizeCloudSessionInfo(e));
  }
  writeSummaryFrom(e) {
    if (this.summaryWritten || e === undefined) return;
    let n = this.ports.summaryLine?.(e);
    if (n !== undefined && n !== "") {
      this.summaryWritten = true;
      this.ports.emit(cloudInformationalMessage(this.stamped, "notice", n));
    }
  }
  adoptWorkerSessionId(e) {
    if (e.type === "user" || !("session_id" in e)) return;
    let n = normalizeUuidOrNull(e.session_id) === null ? null : e.session_id.toLowerCase();
    if (n === null || n === this.stamped.toLowerCase()) return;
    this.sessionIdChangeCount += 1;
    this.stamped = n;
    this.ports.onWorkerSessionId(n);
  }
  reduceBootstrap(e) {
    let n = this.ports.clock.now();
    let setupStepFields = readSetupStepFields(e);
    if (
      setupStepFields.stepId === "start_cc" &&
      setupStepFields.stepStatus === "completed" &&
      !isStaleTimestamp(e, n)
    ) {
      let k = this.bootCountedByFrameAt !== null && n - this.bootCountedByFrameAt < WORKER_READY_WINDOW_MS;
      this.bootCountedByFrameAt = null;
      if (!k && this.startCcCountsAsWorkerUp(n)) {
        this.lastWorkerUpAt = n;
        this.initSinceWorkerUp = false;
        this.noteWorkerUp(this.bootstrap?.sessionMode ?? undefined);
      }
    }
    if (
      this.entry === "attach" &&
      this.holdingForInit &&
      setupStepFields.stepId !== null &&
      setupStepFields.stepStatus === "failed"
    )
      this.releaseHeld();
    if (this.workerReady && !this.narrateAfterReady) return;
    let r = this.bootstrap !== null && this.bootstrap.hasStructuredSteps && !this.bootstrap.terminal;
    if (this.workerReady && !r && isStaleTimestamp(e, n)) return;
    let h = this.bootstrap !== null;
    let y =
      this.bootstrap ??
      createSetupProgress(this.connectEpoch, {
        wake: this.entry === "attach",
      });
    let S = applySetupEvent(y, e, "", n, this.connectEpoch);
    this.bootstrap = S;
    this.ports.onProvisioning?.(S, h ? y : null);
    if (S.terminal || S.steps.some((step) => step.status === "failed")) this.narrateAfterReady = false;
    if (this.workerReady) return;
    let { stepId, stepStatus } = readSetupStepFields(e);
    if (stepId !== null && stepStatus === "failed") {
      this.releaseHeld();
      this.ports.outbound.failQueued("the cloud container failed to start", "step_failed");
      this.signalWorkerReady("step_failed");
      return;
    }
    if (stepId === "start_cc" && stepStatus === "completed") this.signalWorkerReady("start_cc");
  }
}
//@ chunk-fe6rs39h.js:56002-56627 placement
function userMessageForHost(e, { keepUuid, sessionId }) {
  let r = keepUuid && typeof e.uuid === "string" ? normalizeUuidOrNull(e.uuid) : null;
  let h = extractInboundAttachments(e).length;
  let y = flattenContentForHost(h > 0 && e.message?.content === undefined ? "" : e.message?.content);
  let content =
    h === 0
      ? y.content
      : [
          ...(typeof y.content !== "string"
            ? y.content
            : y.content === ""
              ? []
              : [
                  {
                    type: "text",
                    text: y.content,
                  },
                ]),
          {
            type: "text",
            text: `[${h} ${h === 1 ? "file" : "files"} attached by another client omitted]`,
          },
        ];
  let omitted = y.omitted + h;
  let { omittedToolUse, documentsAsText } = y;
  return {
    prompt: {
      type: "user",
      ...(r !== null && {
        uuid: r,
      }),
      session_id: sessionId,
      message: {
        role: "user",
        content,
      },
      parent_tool_use_id: null,
      ...(isIsoTimestamp(e.timestamp) && {
        timestamp: e.timestamp,
      }),
    },
    omitted,
    omittedToolUse,
    documentsAsText,
  };
}
//@ chunk-fe6rs39h.js:56983-58336 placement
function flattenContentForHost(e) {
  if (typeof e === "string")
    return {
      content: e,
      omitted: 0,
      omittedToolUse: false,
      documentsAsText: 0,
    };
  if (!Array.isArray(e))
    return {
      content: [
        {
          type: "text",
          text: qt,
        },
      ],
      omitted: 1,
      omittedToolUse: isToolUseBlock(e),
      documentsAsText: 0,
    };
  let n = e;
  let omittedToolUse = n.some(isToolUseBlock);
  let mapped = n.map((S) => {
    if (typeof S !== "object" || S === null || !("type" in S) || S.type !== "document") return null;
    let w = Uo().safeParse(S);
    if (!w.success) return null;
    let { source } = w.data;
    let title = w.data.title ?? "";
    let context = w.data.context ?? "";
    let content = source.type === "content" && typeof source.content !== "string" ? source.content : [];
    if (!content.every((L) => Bo().safeParse(L).success)) return null;
    let P =
      source.type === "text"
        ? source.data
        : typeof source.content === "string"
          ? source.content
          : content.map((L) => L.text).join(`
`);
    let joined = [
      xo,
      ...(title === "" ? [] : [`title: ${title}`]),
      ...(context === "" ? [] : [`context: ${context}`]),
      P,
    ].join(`
`);
    return [title, context, P, joined].some((content) =>
      hasToolResultContent({
        message: {
          content,
        },
      }),
    )
      ? null
      : joined;
  });
  let flattened = n.flatMap((S, w) => {
    if (typeof S !== "object" || S === null || !("type" in S)) return [];
    if (S.type === "text" && "text" in S && typeof S.text === "string")
      return [
        {
          type: "text",
          text: S.text,
        },
      ];
    let R = mapped[w];
    if (typeof R === "string")
      return [
        {
          type: "text",
          text: R,
        },
      ];
    let k = S.type === "image" ? base64ImageSource(S) : null;
    return k === null
      ? []
      : [
          {
            type: "image",
            source: k,
          },
        ];
  });
  if (hasSplitTextMatch(n) || hasSplitTextMatch(flattened))
    return {
      content: [
        {
          type: "text",
          text: qt,
        },
      ],
      omitted: n.length,
      omittedToolUse,
      documentsAsText: 0,
    };
  let y = n.length - flattened.length;
  return {
    content:
      y > 0
        ? [
            ...flattened,
            {
              type: "text",
              text: qt,
            },
          ]
        : flattened,
    omitted: y,
    omittedToolUse,
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
    ].some((s) =>
      hasToolResultContent({
        message: {
          content: flattened.join(s),
        },
      }),
    )
  );
}
//@ chunk-fe6rs39h.js:58649-58940 placement
function base64ImageSource(e) {
  let source = "source" in e ? e.source : undefined;
  if (
    typeof source !== "object" ||
    source === null ||
    !("type" in source) ||
    source.type !== "base64" ||
    !("data" in source) ||
    typeof source.data !== "string"
  )
    return null;
  let found = No.find((r) => "media_type" in source && source.media_type === r);
  return found === undefined
    ? null
    : {
        type: "base64",
        media_type: found,
        data: source.data,
      };
}
//@ chunk-fe6rs39h.js:58940-59086 placement
function isIsoTimestamp(timestamp) {
  return (
    typeof timestamp === "string" &&
    timestamp.length <= 40 &&
    /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:?\d{2})?$/.test(timestamp) &&
    !Number.isNaN(Date.parse(timestamp))
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
  let { cloud_session: cloudSession, ...s } = e;
  return s;
}
//@ chunk-fe6rs39h.js:59280-59318 placement
/**
 * 原样返回输入（只为解构 tag 字段做类型检查）的恒等函数。
 */
function identity(e) {
  let { tag } = e;
  return e;
}
//@ chunk-fe6rs39h.js:59318-59410 placement
function entriesToStringMap(e) {
  return new Map(
    Object.entries(e).flatMap(([key, value]) => (value === undefined ? [] : [[key, jsonStringify(value)]])),
  );
}
//@ chunk-fe6rs39h.js:59410-61114 placement
function normalizeCloudSessionInfo(e) {
  let id = e.id.startsWith("cse_") ? `session_${sessionIdBody(e.id)}` : e.id;
  let directorySync = e.directory_sync;
  return {
    ...e,
    id,
    device:
      e.device.status === "unbound"
        ? {
            ...e.device,
            reason: clipCloudLine(e.device.reason),
            message: clipCloudLine(e.device.message),
          }
        : {
            ...e.device,
            ...(e.device.display_name !== undefined && {
              display_name: clipCloudLine(e.device.display_name),
            }),
          },
    directory_sync: {
      state: directorySync.state,
      ...(directorySync.reason !== undefined && {
        reason: clipCloudLine(directorySync.reason),
      }),
      ...(directorySync.message !== undefined && {
        message: clipCloudLine(directorySync.message),
      }),
      ...(directorySync.first_upload !== undefined && {
        first_upload: directorySync.first_upload,
      }),
      ...(directorySync.synced_files !== undefined && {
        synced_files: directorySync.synced_files,
      }),
      ...(directorySync.other_window !== undefined && {
        other_window: directorySync.other_window,
      }),
      ...(directorySync.muted !== undefined && {
        muted: directorySync.muted,
      }),
      ...(directorySync.started_from_upload !== undefined && {
        started_from_upload: directorySync.started_from_upload,
      }),
      ...(directorySync.direction !== undefined && {
        direction: directorySync.direction,
      }),
      file_mode: directorySync.file_mode,
      file_mode_source: directorySync.file_mode_source,
    },
    ...(e.host !== undefined && {
      host: {
        handle: clipCloudLine(e.host.handle),
        working_dir: clipCloudLine(e.host.working_dir),
        platform: clipCloudLine(e.host.platform),
        ...(e.host.cli_version !== undefined && {
          cli_version: clipCloudLine(e.host.cli_version),
        }),
      },
    }),
    ...(e.serving !== undefined && {
      serving: {
        state: e.serving.state,
        ...(e.serving.reason !== undefined && {
          reason: e.serving.reason,
        }),
        policy: e.serving.policy,
        channel: e.serving.channel,
      },
    }),
    ...(e.calls !== undefined && {
      calls: {
        live: e.calls.live.map((r) => ({
          call_id: r.call_id,
          tool: clipCloudLine(r.tool),
          state: r.state,
          since: r.since,
          ...(r.ask_id !== undefined && {
            ask_id: r.ask_id,
          }),
          ...(r.lapses_at !== undefined && {
            lapses_at: r.lapses_at,
          }),
          ...(r.classifier_eligible !== undefined && {
            classifier_eligible: r.classifier_eligible,
          }),
        })),
        recent: e.calls.recent.map((r) => ({
          call_id: r.call_id,
          tool: clipCloudLine(r.tool),
          ended: r.ended,
          ...(r.code !== undefined && {
            code: clipCloudLine(r.code),
          }),
          at: r.at,
        })),
      },
    }),
    ...(e.notices !== undefined && {
      notices: e.notices.slice(-CLOUD_SHORT_LIST_MAX).map((notice) => ({
        key: clipCloudLine(notice.key),
        text: clipCloudLine(notice.text),
      })),
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
      let { state, source, reason, message } = r;
      return [
        [
          s,
          {
            ...(typeof state === "string" && {
              state: clipCloudLine(state),
            }),
            ...(typeof source === "string" && {
              source: clipCloudLine(source),
            }),
            ...(typeof reason === "string" && {
              reason: clipCloudLine(reason),
            }),
            ...(typeof message === "string" && {
              message: clipCloudLine(message),
            }),
          },
        ],
      ];
    }),
  );
}
//@ chunk-fe6rs39h.js:61449-61543 placement
function stripApiErrorOrigin(e) {
  if (!("api_error_origin" in e)) return e;
  let { api_error_origin: apiErrorOrigin, ...s } = e;
  return s;
}
//@ chunk-fe6rs39h.js:61543-61774 placement
function filterResultErrors(e) {
  if (e.type !== "result" || !("errors" in e)) return e;
  let errors = e.errors;
  if (!Array.isArray(errors)) return e;
  let filtered = errors.filter(
    (error) => !(typeof error === "string" && error.startsWith("[ede_diagnostic]")),
  );
  return filtered.length === errors.length
    ? e
    : {
        ...e,
        errors: filtered,
      };
}
export {
  filterResultErrors,
  stripCloudSessionKey,
  identity,
  stripApiErrorOrigin,
  stripProtoKey,
  CloudStreamFilter,
};

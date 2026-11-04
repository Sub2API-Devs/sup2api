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
import {
  OMITTED_UNSUPPORTED_CONTENT,
  documentBlockSchema,
  textBlockSchema,
  OMITTED_DOCUMENT_PLACEHOLDER,
  SUPPORTED_IMAGE_MIME_TYPES,
} from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { jsonStringify } from "../../utils/slowOperations.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { HEADLESS_FEATURE_NAMES } from "./headlessFeatures.js";
import { deferInit } from "../../../runtime/deferred-init.js";

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
var HELD_SYSTEM_SUBTYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fe6rs39h.js:45148", () => {
  HELD_SYSTEM_SUBTYPES = new Set([
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
});
//@ chunk-fe6rs39h.js:45361-45457 placement
function isTransientStreamMessage(frame) {
  return frame.type === "stream_event" || (frame.type === "system" && frame.subtype === "thinking_tokens");
}
//@ chunk-fe6rs39h.js:45457-45712 placement
class BoundedUuidSet {
  ceiling;
  uuids = new Set();
  constructor(ceiling) {
    this.ceiling = ceiling;
  }
  add(value) {
    if (this.uuids.has(value)) return;
    if (this.uuids.size >= this.ceiling) {
      let oldest = this.uuids.values().next().value;
      if (oldest !== undefined) this.uuids.delete(oldest);
    }
    this.uuids.add(value);
  }
  has(uuid) {
    return this.uuids.has(uuid);
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
  handle(frame, meta) {
    let sanitized = stripProtoKey(frame);
    if (sanitized !== frame) {
      this.protoMembersDroppedCount++;
      logForDebugging(
        `[headlessCloudClient] dropped a __proto__ member on a ${sanitizeCloudText(truncateToLength(sanitized.type, 40))} frame from source=${sanitizeCloudText(truncateToLength(meta.source ?? "unknown", 40))}`,
        {
          level: "warn",
        },
      );
    }
    let tagged = stripApiErrorOrigin(sanitized);
    let withoutReservedTags = identity(tagged);
    if (withoutReservedTags !== tagged) {
      this.reservedTagsDroppedCount++;
      logForDebugging(
        `[headlessCloudClient] dropped a tag that a session may not set, on a ${sanitizeCloudText(truncateToLength(withoutReservedTags.type, 40))} frame from source=${sanitizeCloudText(truncateToLength(meta.source ?? "unknown", 40))}`,
        {
          level: "warn",
        },
      );
    }
    if (withoutReservedTags.type === "system" && withoutReservedTags.subtype === "cloud_session_delta") {
      this.cloudSessionKeysDroppedCount++;
      return true;
    }
    let clean = stripCloudSessionKey(withoutReservedTags);
    if (clean !== withoutReservedTags) {
      this.cloudSessionKeysDroppedCount++;
      logForDebugging(
        `[headlessCloudClient] dropped a cloud_session key on a ${sanitizeCloudText(truncateToLength(clean.type, 40))} frame from source=${sanitizeCloudText(truncateToLength(meta.source ?? "unknown", 40))}`,
        {
          level: "warn",
        },
      );
    }
    if (clean.type === "env_manager_log") {
      this.reduceBootstrap(clean);
      return true;
    }
    let isForwarded = isForwardedMessageType(clean.type);
    if (isForwarded === undefined) {
      this.noteUnknownFrame(clean.type, meta.source);
      return false;
    }
    if (clean.type !== "user" && !isTransientStreamMessage(clean) && meta.source === "worker") {
      this.adoptWorkerSessionId(clean);
      if (
        this.entry === "attach" &&
        this.holdingForInit &&
        (clean.type === "assistant" || clean.type === "result")
      )
        this.releaseHeld();
      if (this.entry === "create" && this.workerUps === 0) {
        let now = this.ports.clock.now();
        this.lastWorkerUpAt = now;
        this.initSinceWorkerUp = false;
        this.bootCountedByFrameAt = now;
        this.noteWorkerUp(this.bootstrap?.sessionMode ?? undefined);
      }
      this.signalWorkerReady("worker_frame");
    }
    if (
      clean.type === "assistant" ||
      clean.type === "stream_event" ||
      clean.type === "tool_progress" ||
      (clean.type === "system" && clean.subtype === "status" && clean.status === "requesting")
    )
      this.ports.onTurnInFlight?.();
    switch (clean.type) {
      case "system":
        if (clean.subtype === "init") {
          this.initCount += 1;
          this.initSinceWorkerUp = true;
          let workerEpoch = readWorkerEpoch(clean);
          this.ports.onWorkerInit?.({
            ordinal: this.initCount,
            sessionId: this.stamped,
            ...(workerEpoch !== undefined && {
              workerEpoch,
            }),
          });
          this.emitInit(clean);
          return true;
        }
        break;
      case "result":
        this.turnCount += 1;
        this.ports.onTurnEnded?.();
        this.narrateAfterReady = false;
        let isCreateBeforeInit = this.entry === "create" && this.holdingForInit && meta.source === "worker";
        if (isCreateBeforeInit) {
          this.resultsBeforeInitCount++;
          this.releaseHeld();
        }
        if (isForwarded) this.emitAfterInit(filterResultErrors(clean));
        if (
          (this.entry === "attach" || isCreateBeforeInit) &&
          this.initCount === 0 &&
          meta.source === "worker" &&
          !this.closed
        )
          this.holdingForInit = true;
        return true;
      case "user":
        this.handleUserFrame(clean, meta.source);
        return true;
      case "stream_event":
        if (!this.ports.includePartialMessages) return true;
        break;
      default:
        break;
    }
    if (isForwarded) this.emitAfterInit(clean);
    return true;
  }
  noteUnknownFrame(type, source) {
    let isServiceEvent = HELD_SYSTEM_SUBTYPES.has(type);
    if (isServiceEvent) this.serviceEventsDroppedCount++;
    else this.unknownFramesDroppedCount++;
    logForDebugging(
      `[headlessCloudClient] dropped a ${sanitizeCloudText(truncateToLength(type, 40))} ${isServiceEvent ? "service event" : "frame this build does not write"}, from source=${sanitizeCloudText(truncateToLength(source ?? "unknown", 40))}`,
      isServiceEvent
        ? undefined
        : {
            level: "warn",
          },
    );
  }
  handleUserFrame(frame, source) {
    let echo =
      typeof frame.uuid === "string"
        ? this.ports.outbound.streamEcho(frame.uuid, frame.message?.content)
        : {
            verdict: "not_own",
          };
    switch (echo.verdict) {
      case "claim":
        this.emitAfterInit(
          echo.sent === undefined
            ? {
                ...frame,
                isReplay: true,
                session_id: this.stamped,
              }
            : scopeKey(this.stamped, frame.uuid, echo.sent),
          {
            synthesized: true,
            ownEcho: true,
          },
        );
        return;
      case "consume":
        this.emittedUuids.add(frame.uuid.toLowerCase());
        logForDebugging(`[headlessCloudClient] consumed our own echo of ${String(frame.uuid)}`);
        return;
      case "peer":
        this.emitAfterInit(
          this.projectPeer(frame, {
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
    if (source === "worker" || hasToolResultContent(frame)) {
      let mapped = mapToolResultImages(frame.tool_use_result, frame.message);
      this.emitAfterInit(
        mapped === frame.tool_use_result
          ? frame
          : {
              ...frame,
              tool_use_result: mapped,
            },
      );
      return;
    }
    let uuid = typeof frame.uuid === "string" ? frame.uuid.toLowerCase() : "";
    let isKnown =
      uuid !== "" &&
      (this.emittedUuids.has(uuid) || this.emittedPeerUuids.has(uuid) || this.ports.outbound.wasTaken(uuid));
    let projected = this.projectPeer(frame, {
      keepUuid: !isKnown,
    });
    if ("uuid" in projected && typeof projected.uuid === "string")
      this.emittedPeerUuids.add(projected.uuid.toLowerCase());
    this.emitAfterInit(projected, {
      peer: true,
      synthesized: true,
    });
  }
  projectPeer(frame, { keepUuid }) {
    let { prompt, omitted, omittedToolUse, documentsAsText } = userMessageForHost(frame, {
      keepUuid,
      sessionId: this.stamped,
    });
    this.peerContentOmittedCount += omitted;
    this.peerDocumentsAsTextCount += documentsAsText;
    this.peerToolUseOmitted = this.peerToolUseOmitted || omittedToolUse;
    return prompt;
  }
  writeOwnEcho(echo, { duplicate: isDuplicate = false } = {}) {
    this.emitAfterInit(echo, {
      synthesized: true,
      ownEcho: true,
      sessionPast: isDuplicate,
    });
  }
  rememberEmittedUuid(frame) {
    if (!isTransientStreamMessage(frame) && "uuid" in frame && typeof frame.uuid === "string")
      this.emittedUuids.add(frame.uuid.toLowerCase());
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
    heldForInit.forEach((held) =>
      this.ports.emit(
        held.type === "user" && this.synthesizedHeld.has(held)
          ? {
              ...held,
              session_id: this.stamped,
            }
          : held,
      ),
    );
    this.synthesizedHeld.clear();
    let dropped = this.peerFramesDroppedBeforeInitCount - this.peerDropsTold;
    if (dropped > 0) {
      this.peerDropsTold += dropped;
      this.ports.emit(
        cloudInformationalMessage(
          this.stamped,
          "warning",
          `This client kept only ${MAX_KEPT_PEER_MESSAGES} of the messages that other clients of this session sent while it waited for the session to start, and dropped ${dropped} more. Claude may read them all.`,
        ),
      );
    }
  }
  startCcCountsAsWorkerUp(now) {
    return (
      this.lastWorkerUpAt === null ||
      this.initSinceWorkerUp ||
      now - this.lastWorkerUpAt >= WORKER_READY_WINDOW_MS
    );
  }
  noteWorkerUp(sessionMode) {
    this.workerUps += 1;
    this.ports.onWorkerUp?.({
      generation: this.workerUps,
      ...(sessionMode !== undefined && {
        sessionMode,
      }),
    });
  }
  signalWorkerReady(reason) {
    if (this.workerReady) return;
    this.workerReady = true;
    this.ports.onWorkerReady(reason);
  }
  emitAfterInit(
    frame,
    {
      peer: isPeer = false,
      synthesized: isSynthesized = false,
      ownEcho: isOwnEcho = false,
      sessionPast: isSessionPast = false,
    } = {},
  ) {
    if (!isPeer) this.rememberEmittedUuid(frame);
    let canPass =
      (frame.type === "system" && frame.subtype === "informational") ||
      (this.entry === "attach" && (!isOwnEcho || isSessionPast));
    if (!this.holdingForInit || canPass) {
      this.ports.emit(frame);
      return;
    }
    if (isTransientStreamMessage(frame)) return;
    if (isPeer) {
      if (this.peerHeldForInit >= MAX_KEPT_PEER_MESSAGES) {
        this.peerFramesDroppedBeforeInitCount += 1;
        return;
      }
      this.peerHeldForInit += 1;
    } else if (this.heldForInit.length - this.peerHeldForInit >= MAX_HELD_PEER_MESSAGES) {
      this.releaseHeld();
      this.ports.emit(frame);
      return;
    }
    this.heldForInit.push(frame);
    if (isSynthesized) this.synthesizedHeld.add(frame);
    this.maxHeldForInit = Math.max(this.maxHeldForInit, this.heldForInit.length);
  }
  emitInit(frame) {
    let info = this.ports.cloudSession();
    let normalized = info === undefined ? undefined : normalizeCloudSessionInfo(info);
    this.rememberEmittedUuid(frame);
    this.cancelPendingDelta();
    if (normalized !== undefined) this.lastBlock = entriesToStringMap(normalized);
    this.ports.emit({
      ...frame,
      ...(frame.capabilities !== undefined && {
        capabilities: frame.capabilities.filter(
          (capability) => !CLOUD_LOCAL_CONTROL_TYPES.has(capability) && true,
        ),
      }),
      cloud_session: normalized,
    });
    this.writeSummaryFrom(normalized);
    if (this.holdingForInit) this.releaseHeld();
  }
  noteCloudSessionChanged() {
    if (this.closed || (this.initCount === 0 && this.lastBlock === null)) return;
    let now = this.ports.clock.now();
    let since = this.pendingDelta?.since ?? now;
    this.pendingDelta?.cancel();
    let max = Math.max(0, Math.min(STREAM_FILTER_LIMITS, since + STREAM_FILTER_SLACK_MS - now));
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
    let info = this.ports.cloudSession();
    if (info === undefined || this.lastBlock === null) return;
    let normalized = normalizeCloudSessionInfo(info);
    let next = entriesToStringMap(normalized);
    let lastBlock = this.lastBlock;
    let filtered = uniq([...lastBlock.keys(), ...next.keys()]).filter(
      (key) => lastBlock.get(key) !== next.get(key),
    );
    if (filtered.length === 0) return;
    this.lastBlock = next;
    this.deltaSeq += 1;
    this.ports.emit({
      type: "system",
      subtype: "cloud_session_delta",
      seq: this.deltaSeq,
      changed: filtered,
      cloud_session: normalized,
      uuid: randomUUID(),
      session_id: this.stamped,
    });
  }
  offerSummary() {
    if (this.summaryWritten || this.initCount === 0) return;
    let info = this.ports.cloudSession();
    if (info !== undefined) this.writeSummaryFrom(normalizeCloudSessionInfo(info));
  }
  writeSummaryFrom(info) {
    if (this.summaryWritten || info === undefined) return;
    let line = this.ports.summaryLine?.(info);
    if (line !== undefined && line !== "") {
      this.summaryWritten = true;
      this.ports.emit(cloudInformationalMessage(this.stamped, "notice", line));
    }
  }
  adoptWorkerSessionId(frame) {
    if (frame.type === "user" || !("session_id" in frame)) return;
    let sessionId = normalizeUuidOrNull(frame.session_id) === null ? null : frame.session_id.toLowerCase();
    if (sessionId === null || sessionId === this.stamped.toLowerCase()) return;
    this.sessionIdChangeCount += 1;
    this.stamped = sessionId;
    this.ports.onWorkerSessionId(sessionId);
  }
  reduceBootstrap(event) {
    let now = this.ports.clock.now();
    let setupStepFields = readSetupStepFields(event);
    if (
      setupStepFields.stepId === "start_cc" &&
      setupStepFields.stepStatus === "completed" &&
      !isStaleTimestamp(event, now)
    ) {
      let alreadyBooted =
        this.bootCountedByFrameAt !== null && now - this.bootCountedByFrameAt < WORKER_READY_WINDOW_MS;
      this.bootCountedByFrameAt = null;
      if (!alreadyBooted && this.startCcCountsAsWorkerUp(now)) {
        this.lastWorkerUpAt = now;
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
    let isStructured =
      this.bootstrap !== null && this.bootstrap.hasStructuredSteps && !this.bootstrap.terminal;
    if (this.workerReady && !isStructured && isStaleTimestamp(event, now)) return;
    let hadBootstrap = this.bootstrap !== null;
    let previous =
      this.bootstrap ??
      createSetupProgress(this.connectEpoch, {
        wake: this.entry === "attach",
      });
    let next = applySetupEvent(previous, event, "", now, this.connectEpoch);
    this.bootstrap = next;
    this.ports.onProvisioning?.(next, hadBootstrap ? previous : null);
    if (next.terminal || next.steps.some((step) => step.status === "failed")) this.narrateAfterReady = false;
    if (this.workerReady) return;
    let { stepId, stepStatus } = readSetupStepFields(event);
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
function userMessageForHost(message, { keepUuid, sessionId }) {
  let keptUuid = keepUuid && typeof message.uuid === "string" ? normalizeUuidOrNull(message.uuid) : null;
  let toolUses = extractInboundAttachments(message).length;
  let projected = flattenContentForHost(
    toolUses > 0 && message.message?.content === undefined ? "" : message.message?.content,
  );
  let content =
    toolUses === 0
      ? projected.content
      : [
          ...(typeof projected.content !== "string"
            ? projected.content
            : projected.content === ""
              ? []
              : [
                  {
                    type: "text",
                    text: projected.content,
                  },
                ]),
          {
            type: "text",
            text: `[${toolUses} ${toolUses === 1 ? "file" : "files"} attached by another client omitted]`,
          },
        ];
  let omitted = projected.omitted + toolUses;
  let { omittedToolUse, documentsAsText } = projected;
  return {
    prompt: {
      type: "user",
      ...(keptUuid !== null && {
        uuid: keptUuid,
      }),
      session_id: sessionId,
      message: {
        role: "user",
        content,
      },
      parent_tool_use_id: null,
      ...(isIsoTimestamp(message.timestamp) && {
        timestamp: message.timestamp,
      }),
    },
    omitted,
    omittedToolUse,
    documentsAsText,
  };
}
//@ chunk-fe6rs39h.js:56983-58336 placement
function flattenContentForHost(content) {
  if (typeof content === "string")
    return {
      content,
      omitted: 0,
      omittedToolUse: false,
      documentsAsText: 0,
    };
  if (!Array.isArray(content))
    return {
      content: [
        {
          type: "text",
          text: OMITTED_UNSUPPORTED_CONTENT,
        },
      ],
      omitted: 1,
      omittedToolUse: isToolUseBlock(content),
      documentsAsText: 0,
    };
  let omittedContent = content;
  let omittedToolUse = omittedContent.some(isToolUseBlock);
  let mapped = omittedContent.map((blocks) => {
    if (typeof blocks !== "object" || blocks === null || !("type" in blocks) || blocks.type !== "document")
      return null;
    let block = documentBlockSchema().safeParse(blocks);
    if (!block.success) return null;
    let { source } = block.data;
    let title = block.data.title ?? "";
    let context = block.data.context ?? "";
    let content = source.type === "content" && typeof source.content !== "string" ? source.content : [];
    if (!content.every((parsed) => textBlockSchema().safeParse(parsed).success)) return null;
    let docSource =
      source.type === "text"
        ? source.data
        : typeof source.content === "string"
          ? source.content
          : content.map((nested) => nested.text).join(`
`);
    let joined = [
      OMITTED_DOCUMENT_PLACEHOLDER,
      ...(title === "" ? [] : [`title: ${title}`]),
      ...(context === "" ? [] : [`context: ${context}`]),
      docSource,
    ].join(`
`);
    return [title, context, docSource, joined].some((content) =>
      hasToolResultContent({
        message: {
          content,
        },
      }),
    )
      ? null
      : joined;
  });
  let flattened = omittedContent.flatMap((text, kept) => {
    if (typeof text !== "object" || text === null || !("type" in text)) return [];
    if (text.type === "text" && "text" in text && typeof text.text === "string")
      return [
        {
          type: "text",
          text: text.text,
        },
      ];
    let converted = mapped[kept];
    if (typeof converted === "string")
      return [
        {
          type: "text",
          text: converted,
        },
      ];
    let image = text.type === "image" ? base64ImageSource(text) : null;
    return image === null
      ? []
      : [
          {
            type: "image",
            source: image,
          },
        ];
  });
  if (hasSplitTextMatch(omittedContent) || hasSplitTextMatch(flattened))
    return {
      content: [
        {
          type: "text",
          text: OMITTED_UNSUPPORTED_CONTENT,
        },
      ],
      omitted: omittedContent.length,
      omittedToolUse,
      documentsAsText: 0,
    };
  let dropped = omittedContent.length - flattened.length;
  return {
    content:
      dropped > 0
        ? [
            ...flattened,
            {
              type: "text",
              text: OMITTED_UNSUPPORTED_CONTENT,
            },
          ]
        : flattened,
    omitted: dropped,
    omittedToolUse,
    documentsAsText: count(mapped, (keptBlock) => keptBlock !== null),
  };
}
//@ chunk-fe6rs39h.js:58336-58421 placement
function isToolUseBlock(block) {
  return typeof block === "object" && block !== null && "type" in block && block.type === "tool_use";
}
//@ chunk-fe6rs39h.js:58421-58649 placement = extractErrorTypeFromData (1)
function hasSplitTextMatch(data) {
  let flattened = data.flatMap((block) =>
    typeof block === "object" &&
    block !== null &&
    "type" in block &&
    block.type === "text" &&
    "text" in block &&
    typeof block.text === "string"
      ? [block.text]
      : [],
  );
  return (
    flattened.length > 1 &&
    [
      "",
      `
`,
      " ",
    ].some((separator) =>
      hasToolResultContent({
        message: {
          content: flattened.join(separator),
        },
      }),
    )
  );
}
//@ chunk-fe6rs39h.js:58649-58940 placement
function base64ImageSource(source) {
  let source_2 = "source" in source ? source.source : undefined;
  if (
    typeof source_2 !== "object" ||
    source_2 === null ||
    !("type" in source_2) ||
    source_2.type !== "base64" ||
    !("data" in source_2) ||
    typeof source_2.data !== "string"
  )
    return null;
  let found = SUPPORTED_IMAGE_MIME_TYPES.find(
    (mediaType) => "media_type" in source_2 && source_2.media_type === mediaType,
  );
  return found === undefined
    ? null
    : {
        type: "base64",
        media_type: found,
        data: source_2.data,
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
function stripProtoKey(frame) {
  if (!Object.hasOwn(frame, "__proto__")) return frame;
  let { ["__proto__"]: proto, ...rest } = frame;
  return rest;
}
//@ chunk-fe6rs39h.js:59181-59280 placement
function stripCloudSessionKey(frame) {
  if (!Object.hasOwn(frame, "cloud_session")) return frame;
  let { cloud_session: cloudSession, ...session } = frame;
  return session;
}
//@ chunk-fe6rs39h.js:59280-59318 placement
/**
 * 原样返回输入（只为解构 tag 字段做类型检查）的恒等函数。
 */
function identity(tag) {
  let { tag: tag_2 } = tag;
  return tag;
}
//@ chunk-fe6rs39h.js:59318-59410 placement
function entriesToStringMap(object) {
  return new Map(
    Object.entries(object).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, jsonStringify(value)]],
    ),
  );
}
//@ chunk-fe6rs39h.js:59410-61114 placement
function normalizeCloudSessionInfo(info) {
  let id = info.id.startsWith("cse_") ? `session_${sessionIdBody(info.id)}` : info.id;
  let directorySync = info.directory_sync;
  return {
    ...info,
    id,
    device:
      info.device.status === "unbound"
        ? {
            ...info.device,
            reason: clipCloudLine(info.device.reason),
            message: clipCloudLine(info.device.message),
          }
        : {
            ...info.device,
            ...(info.device.display_name !== undefined && {
              display_name: clipCloudLine(info.device.display_name),
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
    ...(info.host !== undefined && {
      host: {
        handle: clipCloudLine(info.host.handle),
        working_dir: clipCloudLine(info.host.working_dir),
        platform: clipCloudLine(info.host.platform),
        ...(info.host.cli_version !== undefined && {
          cli_version: clipCloudLine(info.host.cli_version),
        }),
      },
    }),
    ...(info.serving !== undefined && {
      serving: {
        state: info.serving.state,
        ...(info.serving.reason !== undefined && {
          reason: info.serving.reason,
        }),
        policy: info.serving.policy,
        channel: info.serving.channel,
      },
    }),
    ...(info.calls !== undefined && {
      calls: {
        live: info.calls.live.map((call) => ({
          call_id: call.call_id,
          tool: clipCloudLine(call.tool),
          state: call.state,
          since: call.since,
          ...(call.ask_id !== undefined && {
            ask_id: call.ask_id,
          }),
          ...(call.lapses_at !== undefined && {
            lapses_at: call.lapses_at,
          }),
          ...(call.classifier_eligible !== undefined && {
            classifier_eligible: call.classifier_eligible,
          }),
        })),
        recent: info.calls.recent.map((call) => ({
          call_id: call.call_id,
          tool: clipCloudLine(call.tool),
          ended: call.ended,
          ...(call.code !== undefined && {
            code: clipCloudLine(call.code),
          }),
          at: call.at,
        })),
      },
    }),
    ...(info.notices !== undefined && {
      notices: info.notices.slice(-CLOUD_SHORT_LIST_MAX).map((notice) => ({
        key: clipCloudLine(notice.key),
        text: clipCloudLine(notice.text),
      })),
    }),
    ...pickFeatureReports(info),
  };
}
//@ chunk-fe6rs39h.js:61114-61449 placement
function pickFeatureReports(feature) {
  let info = feature;
  return Object.fromEntries(
    HEADLESS_FEATURE_NAMES.flatMap((entry) => {
      let state = info[entry];
      if (typeof state !== "object" || state === null) return [];
      let { state: state_2, source, reason, message } = state;
      return [
        [
          entry,
          {
            ...(typeof state_2 === "string" && {
              state: clipCloudLine(state_2),
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
function stripApiErrorOrigin(origin) {
  if (!("api_error_origin" in origin)) return origin;
  let { api_error_origin: apiErrorOrigin, ...rest } = origin;
  return rest;
}
//@ chunk-fe6rs39h.js:61543-61774 placement
function filterResultErrors(errors) {
  if (errors.type !== "result" || !("errors" in errors)) return errors;
  let errors_2 = errors.errors;
  if (!Array.isArray(errors_2)) return errors;
  let filtered = errors_2.filter(
    (error) => !(typeof error === "string" && error.startsWith("[ede_diagnostic]")),
  );
  return filtered.length === errors_2.length
    ? errors
    : {
        ...errors,
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

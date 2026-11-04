/**
 * bridge/replBridgeTransport.ts
 *
 * v2 REPL 传输：worker 注册（epoch）、SSE 读流 /worker/events/stream + CCRClient 写事件/心跳/状态上报，暴露统一的 transport 接口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/replBridgeTransport.ts
 * pieces: chunk-fp6aqx1j.js (1)
 * attribution: fingerprint 1
 */
import { configureApiKeyHeaders } from "../services/api/client.js";
import { getSessionIngressAuthToken_2 } from "../utils/sessionIngressAuth.js";
import { registerWorker } from "./workSecret.js";
import { logForDebugging } from "../utils/debug.js";
import { SSETransport, LONG_POLL_TIMEOUT_MS, SHORT_POLL_TIMEOUT_MS } from "../cli/transports/SSETransport.js";
import { logError } from "../utils/log.js";
import { CCRClient, WORKER_CONFLICT_CLOSE_CODES, isUserPayload } from "../cli/transports/ccrClient.js";
import { withholdHeldReceipt, redeliveryKind } from "./readReceipts.js";
import { evaluateInboundAttestationWithPolicy } from "./attestationGate.js";
import { errorMessage } from "../utils/errors.js";

//@ chunk-fp6aqx1j.js:172333-177999 fingerprint (2.1.88 match: createV2ReplTransport, 0.45)
/**
 * 建 v2 传输：epoch 取 /bridge 给的值或调 registerWorker；SSETransport 读 `{sessionUrl}/worker/events/stream`，CCRClient 负责写事件、心跳、投递回执、内部事件；
 * epoch 不匹配等请求路径终态时按 4090/4094 关闭，心跳失败而 SSE 正常时 4093，初始化失败 4091；connect() 先 initialize(epoch) 成功后再开读流（outboundOnly 不开）。
 */
async function createV2ReplTransport(opts) {
  let { sessionUrl, ingressToken, sessionId, initialSequenceNum, getAuthToken } = opts;
  let reportsReadReceipts = () => opts.inboundReadReceipts?.() === true;
  let getAuthHeaders;
  if (getAuthToken) getAuthHeaders = () => configureApiKeyHeaders(getAuthToken());
  else getSessionIngressAuthToken_2(ingressToken);
  let epoch = opts.epoch ?? (await registerWorker(sessionUrl, ingressToken));
  logForDebugging(
    `[bridge:repl] CCR v2: worker sessionId=${sessionId} epoch=${epoch}${opts.epoch !== undefined ? " (from /bridge)" : " (via registerWorker)"}`,
  );
  let sseUrl = new URL(sessionUrl);
  sseUrl.pathname = sseUrl.pathname.replace(/\/$/, "") + "/worker/events/stream";
  let sseTransport = new SSETransport(
    sseUrl,
    {},
    {
      sessionId,
      initialSequenceNum,
      getAuthHeaders,
      connectTimeoutMs: opts.sseConnectTimeoutMs,
      sseKeepaliveMaxIntervalSeconds: opts.sseKeepaliveMaxIntervalSeconds,
      longPollFallback: opts.longPollFallback,
      initialLongPollMode: opts.initialLongPollMode,
    },
  );
  let inboundEnabled = !opts.outboundOnly;
  let selfHealHeartbeats = (opts.selfHealHeartbeats ?? false) && inboundEnabled;
  let nonOrigin403Retry = (opts.nonOrigin403Retry ?? false) && inboundEnabled;
  let nonOrigin403Transient = nonOrigin403Retry && selfHealHeartbeats;
  if (nonOrigin403Retry)
    sseTransport.setNonOriginRejectionPolicy({
      windowMs: LONG_POLL_TIMEOUT_MS,
      maxGapMs: SHORT_POLL_TIMEOUT_MS,
      onRecovered: opts.onNonOriginRejectionRecovered,
    });
  let onCloseCallback;
  let closed = false;
  function closeOnce(code, reason, closeInfo) {
    if (closed) return;
    closed = true;
    try {
      ccr.close({
        goodbye: false,
        retainUndeliveredClientEvents: opts.retainUndeliveredOnClose === true,
      });
      sseTransport.close();
    } catch (error) {
      logError(error);
    }
    try {
      onCloseCallback?.(code, reason, closeInfo);
    } catch (error) {
      logError(error);
    }
  }
  let ccr = new CCRClient(sseTransport, new URL(sessionUrl), {
    getAuthHeaders,
    heartbeatIntervalMs: opts.heartbeatIntervalMs,
    heartbeatJitterFraction: opts.heartbeatJitterFraction,
    advertiseHeartbeatProbeSupport: (opts.advertiseHeartbeatProbeSupport ?? false) && inboundEnabled,
    uploadTrim: opts.uploadTrim,
    keepsRequestId: opts.keepsRequestId,
    uploadHoldMarker: opts.uploadHoldMarker,
    liveOnlyShellTaskRows: opts.liveOnlyShellTaskRows,
    artifactSocketIds: opts.artifactSocketIds,
    followsServedPolicy: opts.followsServedPolicy,
    ...(opts.processExiting && {
      processExiting: opts.processExiting,
    }),
    beatOnStaleReconnect: (opts.beatOnStaleReconnect ?? false) && inboundEnabled,
    idleTracker: opts.idleTracker,
    beatOnReactivation: (opts.beatOnReactivation ?? false) && inboundEnabled,
    skipRedundantHeartbeats: opts.skipRedundantHeartbeats,
    streamEventFlushIntervalMs: opts.streamEventFlushIntervalMs,
    streamEventFirstFlushMs: opts.streamEventFirstFlushMs,
    gzipRequestBodyFetch: opts.gzipRequestBodyFetch,
    noSubscriberStreamEventFlushIntervalMs: opts.noSubscriberStreamEventFlushIntervalMs,
    noSubscriberUploadHoldMs: opts.noSubscriberUploadHoldMs,
    dropUnwatchedStreamEvents: opts.dropUnwatchedStreamEvents,
    nonOrigin403Transient,
    internalEventUploader: opts.internalEventUploader,
    stateReadEndsAtRegistration: opts.onConnectNeedsRecord !== true,
    onEpochMismatch: (condition) => {
      let closeCode = opts.causeTypedCloseCodes ? WORKER_CONFLICT_CLOSE_CODES[condition] : 4090;
      logForDebugging(
        `[bridge:repl] CCR v2: terminal request-path condition (${condition}) \u2014 closing with ${closeCode} for ${closeCode === 4094 ? "auth recovery" : "poll-loop recovery"}`,
      );
      closeOnce(closeCode, condition);
      throw Error("terminal request-path condition");
    },
    onRequestAuthOk: opts.onRequestAuthOk,
    ...(selfHealHeartbeats && {
      onHeartbeatLost: () => {
        if (closed) return;
        logForDebugging(
          "[bridge:repl] CCR v2: heartbeats failing while SSE healthy \u2014 closing for transport rebuild",
          {
            level: "warn",
          },
        );
        closeOnce(4093);
      },
    }),
  });
  sseTransport.setOnEvent((event) => {
    if (opts.processExiting?.() && isUserPayload(event)) return;
    ccr.reportDelivery(event.event_id, "received");
    if (!(reportsReadReceipts() && withholdHeldReceipt(event.event_id)))
      ccr.reportDelivery(event.event_id, "processed");
  });
  sseTransport.setEventFilter((event) => {
    if (evaluateInboundAttestationWithPolicy(event)) return true;
    return reportsReadReceipts() ? redeliveryKind(event) : false;
  });
  let onConnectCallback;
  let writesReady = false;
  return {
    write(msg) {
      return ccr.writeEvent(msg);
    },
    writeBatch(events) {
      return ccr.writeEvents(events);
    },
    close(options) {
      closed = true;
      ccr.close({
        goodbye: options?.goodbye,
        retainUndeliveredClientEvents: options?.retainUndelivered,
      });
      if (!options?.retainUndelivered) ccr.discardUndeliveredClientEvents();
      sseTransport.close();
    },
    takeUndeliveredEvents() {
      return ccr.takeUndeliveredClientEvents();
    },
    discardUndeliveredEvents() {
      return ccr.discardUndeliveredClientEvents();
    },
    adoptUndeliveredEvents(events) {
      ccr.adoptClientEvents(events);
    },
    flushGoodbye() {
      return ccr.flushGoodbye();
    },
    isConnectedStatus() {
      return writesReady;
    },
    getStateLabel() {
      if (sseTransport.isClosedStatus()) return "closed";
      if (sseTransport.isConnectedStatus()) return writesReady ? "connected" : "init";
      return "connecting";
    },
    setOnData(cb) {
      sseTransport.setOnData(cb);
    },
    setOnClose(cb) {
      onCloseCallback = cb;
      sseTransport.setOnClose((code, info) => {
        closeOnce(code ?? 4092, undefined, info);
      });
    },
    setOnConnect(cb) {
      onConnectCallback = cb;
    },
    getLastSequenceNum() {
      return sseTransport.getLastSequenceNum();
    },
    isLongPolling() {
      return sseTransport.isLongPolling();
    },
    lastFrameReadAt() {
      return sseTransport.lastFrameReadAt();
    },
    getEpoch() {
      return epoch;
    },
    reportState(state, extra) {
      ccr.reportState(state, extra);
    },
    reportMetadata(metadata) {
      ccr.reportMetadata(metadata);
    },
    reportInternalMetadata(metadata) {
      if (closed) return false;
      ccr.reportInternalMetadata(metadata);
      return true;
    },
    droppedDurableBatchCount() {
      return ccr.droppedDurableBatches;
    },
    flushWorkerState() {
      return ccr.flushWorkerState();
    },
    droppedWorkerStatePatchCount() {
      return ccr.droppedWorkerStatePatches;
    },
    reportDelivery(eventId, status) {
      ccr.reportDelivery(eventId, status);
    },
    setStreamEventFlushIntervalMs(ms) {
      ccr.setStreamEventFlushIntervalMs(ms);
    },
    setStreamEventFirstFlushMs(ms) {
      ccr.setStreamEventFirstFlushMs(ms);
    },
    setNoSubscriberStreamEventFlushIntervalMs(ms) {
      ccr.setNoSubscriberStreamEventFlushIntervalMs(ms);
    },
    setNoSubscriberUploadHoldMs(ms) {
      ccr.setNoSubscriberUploadHoldMs(ms);
    },
    setDropUnwatchedStreamEvents(shouldDrop) {
      ccr.setDropUnwatchedStreamEvents(shouldDrop);
    },
    setSubscribersReportedListener(listener) {
      ccr.setSubscribersReportedListener(listener);
    },
    mayHoldUploads() {
      return ccr.mayHoldUploads();
    },
    flush(options) {
      return ccr.flush(options);
    },
    flushDeliveryAcks(options) {
      return ccr.flushDeliveryAcks(options);
    },
    flushInternalEvents(options) {
      return ccr.flushInternalEvents(options);
    },
    getUploadBacklog() {
      return ccr.uploadBacklog();
    },
    getInternalEventBacklog() {
      return {
        pending: ccr.internalEventsPending,
        droppedBatches: ccr.droppedInternalBatches,
      };
    },
    trackFirstFrameUpload(upload) {
      return ccr.trackFirstFrameUpload(upload);
    },
    getInternalEventWriter() {
      return (kind, agentId, payload) => ccr.writeInternalEvent(kind, agentId, payload);
    },
    getInternalEventReaders() {
      return {
        readMain: (since) => (since ? ccr.readInternalEventsForCatchUp(since) : ccr.readInternalEvents()),
        readSubagents: () => ccr.readSubagentInternalEvents(),
        readSubagent: (agentId, since) => ccr.readAgentInternalEvents(agentId, since),
      };
    },
    getInternalEventsPort() {
      return {
        epoch: () => ccr.getWorkerEpoch(),
        postBatch: (batch, options) => ccr.postInternalEventsBatch(batch, options),
        listPage: (cursor, options) => ccr.getInternalEventsPage(cursor, options),
      };
    },
    connect() {
      ccr.initialize(epoch).then(
        (code) => {
          if (closed) return;
          writesReady = true;
          logForDebugging(
            `[bridge:repl] v2 transport ready for writes (epoch=${epoch}); opening the read stream`,
          );
          onConnectCallback?.(code);
          if (!opts.outboundOnly && !closed) sseTransport.connect();
        },
        (err) => {
          logForDebugging(`[bridge:repl] CCR v2 initialize failed: ${errorMessage(err)}`, {
            level: "error",
          });
          closeOnce(4091);
        },
      );
    },
  };
}
export { createV2ReplTransport };

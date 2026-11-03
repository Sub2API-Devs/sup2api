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
import { SSETransport, WNo, zr } from "../cli/transports/SSETransport.js";
import { logError } from "../utils/log.js";
import { CCRClient, WORKER_CONFLICT_CLOSE_CODES, Xe } from "../cli/transports/ccrClient.js";
import { Oli, redeliveryKind } from "./readReceipts.js";
import { evaluateInboundAttestationWithPolicy } from "./attestationGate.js";
import { errorMessage } from "../utils/errors.js";

/**
 * 建 v2 传输：epoch 取 /bridge 给的值或调 registerWorker；SSETransport 读 `{sessionUrl}/worker/events/stream`，CCRClient 负责写事件、心跳、投递回执、内部事件；
 * epoch 不匹配等请求路径终态时按 4090/4094 关闭，心跳失败而 SSE 正常时 4093，初始化失败 4091；connect() 先 initialize(epoch) 成功后再开读流（outboundOnly 不开）。
 */
//@ chunk-fp6aqx1j.js:172333-177999 fingerprint = createV2ReplTransport (0.45)
async function createV2ReplTransport(opts) {
  let {
      sessionUrl: sessionUrl,
      ingressToken: ingressToken,
      sessionId: sessionId,
      initialSequenceNum: initialSequenceNum,
      getAuthToken: getAuthToken,
    } = opts,
    reportsReadReceipts = () => opts.inboundReadReceipts?.() === !0,
    getAuthHeaders;
  if (getAuthToken) getAuthHeaders = () => configureApiKeyHeaders(getAuthToken());
  else getSessionIngressAuthToken_2(ingressToken);
  let epoch = opts.epoch ?? (await registerWorker(sessionUrl, ingressToken));
  logForDebugging(
    `[bridge:repl] CCR v2: worker sessionId=${sessionId} epoch=${epoch}${opts.epoch !== void 0 ? " (from /bridge)" : " (via registerWorker)"}`,
  );
  let sseUrl = new URL(sessionUrl);
  sseUrl.pathname = sseUrl.pathname.replace(/\/$/, "") + "/worker/events/stream";
  let sseTransport = new SSETransport(
      sseUrl,
      {},
      {
        sessionId: sessionId,
        initialSequenceNum: initialSequenceNum,
        getAuthHeaders: getAuthHeaders,
        connectTimeoutMs: opts.sseConnectTimeoutMs,
        sseKeepaliveMaxIntervalSeconds: opts.sseKeepaliveMaxIntervalSeconds,
        longPollFallback: opts.longPollFallback,
        initialLongPollMode: opts.initialLongPollMode,
      },
    ),
    inboundEnabled = !opts.outboundOnly,
    selfHealHeartbeats = (opts.selfHealHeartbeats ?? !1) && inboundEnabled,
    nonOrigin403Retry = (opts.nonOrigin403Retry ?? !1) && inboundEnabled,
    x = nonOrigin403Retry && selfHealHeartbeats;
  if (nonOrigin403Retry)
    sseTransport.setNonOriginRejectionPolicy({
      windowMs: WNo,
      maxGapMs: zr,
      onRecovered: opts.onNonOriginRejectionRecovered,
    });
  let onCloseCallback,
    closed = !1;
  function closeOnce(I, G, X) {
    if (closed) return;
    closed = !0;
    try {
      (ccr.close({ goodbye: !1, retainUndeliveredClientEvents: opts.retainUndeliveredOnClose === !0 }),
        sseTransport.close());
    } catch (error) {
      logError(error);
    }
    try {
      onCloseCallback?.(I, G, X);
    } catch (error) {
      logError(error);
    }
  }
  let ccr = new CCRClient(sseTransport, new URL(sessionUrl), {
    getAuthHeaders: getAuthHeaders,
    heartbeatIntervalMs: opts.heartbeatIntervalMs,
    heartbeatJitterFraction: opts.heartbeatJitterFraction,
    advertiseHeartbeatProbeSupport: (opts.advertiseHeartbeatProbeSupport ?? !1) && inboundEnabled,
    uploadTrim: opts.uploadTrim,
    keepsRequestId: opts.keepsRequestId,
    uploadHoldMarker: opts.uploadHoldMarker,
    liveOnlyShellTaskRows: opts.liveOnlyShellTaskRows,
    artifactSocketIds: opts.artifactSocketIds,
    followsServedPolicy: opts.followsServedPolicy,
    ...(opts.processExiting && { processExiting: opts.processExiting }),
    beatOnStaleReconnect: (opts.beatOnStaleReconnect ?? !1) && inboundEnabled,
    idleTracker: opts.idleTracker,
    beatOnReactivation: (opts.beatOnReactivation ?? !1) && inboundEnabled,
    skipRedundantHeartbeats: opts.skipRedundantHeartbeats,
    streamEventFlushIntervalMs: opts.streamEventFlushIntervalMs,
    streamEventFirstFlushMs: opts.streamEventFirstFlushMs,
    gzipRequestBodyFetch: opts.gzipRequestBodyFetch,
    noSubscriberStreamEventFlushIntervalMs: opts.noSubscriberStreamEventFlushIntervalMs,
    noSubscriberUploadHoldMs: opts.noSubscriberUploadHoldMs,
    dropUnwatchedStreamEvents: opts.dropUnwatchedStreamEvents,
    nonOrigin403Transient: x,
    internalEventUploader: opts.internalEventUploader,
    stateReadEndsAtRegistration: opts.onConnectNeedsRecord !== !0,
    onEpochMismatch: (I) => {
      let G = opts.causeTypedCloseCodes ? WORKER_CONFLICT_CLOSE_CODES[I] : 4090;
      throw (
        logForDebugging(
          `[bridge:repl] CCR v2: terminal request-path condition (${I}) \u2014 closing with ${G} for ${G === 4094 ? "auth recovery" : "poll-loop recovery"}`,
        ),
        closeOnce(G, I),
        Error("terminal request-path condition")
      );
    },
    onRequestAuthOk: opts.onRequestAuthOk,
    ...(selfHealHeartbeats && {
      onHeartbeatLost: () => {
        if (closed) return;
        (logForDebugging(
          "[bridge:repl] CCR v2: heartbeats failing while SSE healthy \u2014 closing for transport rebuild",
          { level: "warn" },
        ),
          closeOnce(4093));
      },
    }),
  });
  (sseTransport.setOnEvent((I) => {
    if (opts.processExiting?.() && Xe(I)) return;
    if ((ccr.reportDelivery(I.event_id, "received"), !(reportsReadReceipts() && Oli(I.event_id))))
      ccr.reportDelivery(I.event_id, "processed");
  }),
    sseTransport.setEventFilter((event) => {
      if (evaluateInboundAttestationWithPolicy(event)) return !0;
      return reportsReadReceipts() ? redeliveryKind(event) : !1;
    }));
  let onConnectCallback,
    writesReady = !1;
  return {
    write(I) {
      return ccr.writeEvent(I);
    },
    writeBatch(I) {
      return ccr.writeEvents(I);
    },
    close(I) {
      if (
        ((closed = !0),
        ccr.close({ goodbye: I?.goodbye, retainUndeliveredClientEvents: I?.retainUndelivered }),
        !I?.retainUndelivered)
      )
        ccr.discardUndeliveredClientEvents();
      sseTransport.close();
    },
    takeUndeliveredEvents() {
      return ccr.takeUndeliveredClientEvents();
    },
    discardUndeliveredEvents() {
      return ccr.discardUndeliveredClientEvents();
    },
    adoptUndeliveredEvents(I) {
      ccr.adoptClientEvents(I);
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
    setOnData(I) {
      sseTransport.setOnData(I);
    },
    setOnClose(I) {
      ((onCloseCallback = I),
        sseTransport.setOnClose((G, X) => {
          closeOnce(G ?? 4092, void 0, X);
        }));
    },
    setOnConnect(I) {
      onConnectCallback = I;
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
    reportState(I, G) {
      ccr.reportState(I, G);
    },
    reportMetadata(I) {
      ccr.reportMetadata(I);
    },
    reportInternalMetadata(I) {
      if (closed) return !1;
      return (ccr.reportInternalMetadata(I), !0);
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
    reportDelivery(I, G) {
      ccr.reportDelivery(I, G);
    },
    setStreamEventFlushIntervalMs(I) {
      ccr.setStreamEventFlushIntervalMs(I);
    },
    setStreamEventFirstFlushMs(I) {
      ccr.setStreamEventFirstFlushMs(I);
    },
    setNoSubscriberStreamEventFlushIntervalMs(I) {
      ccr.setNoSubscriberStreamEventFlushIntervalMs(I);
    },
    setNoSubscriberUploadHoldMs(I) {
      ccr.setNoSubscriberUploadHoldMs(I);
    },
    setDropUnwatchedStreamEvents(I) {
      ccr.setDropUnwatchedStreamEvents(I);
    },
    setSubscribersReportedListener(I) {
      ccr.setSubscribersReportedListener(I);
    },
    mayHoldUploads() {
      return ccr.mayHoldUploads();
    },
    flush(I) {
      return ccr.flush(I);
    },
    flushDeliveryAcks(I) {
      return ccr.flushDeliveryAcks(I);
    },
    flushInternalEvents(I) {
      return ccr.flushInternalEvents(I);
    },
    getUploadBacklog() {
      return ccr.uploadBacklog();
    },
    getInternalEventBacklog() {
      return { pending: ccr.internalEventsPending, droppedBatches: ccr.droppedInternalBatches };
    },
    trackFirstFrameUpload(I) {
      return ccr.trackFirstFrameUpload(I);
    },
    getInternalEventWriter() {
      return (I, G, X) => ccr.writeInternalEvent(I, G, X);
    },
    getInternalEventReaders() {
      return {
        readMain: (I) => (I ? ccr.readInternalEventsForCatchUp(I) : ccr.readInternalEvents()),
        readSubagents: () => ccr.readSubagentInternalEvents(),
        readSubagent: (I, G) => ccr.readAgentInternalEvents(I, G),
      };
    },
    getInternalEventsPort() {
      return {
        epoch: () => ccr.getWorkerEpoch(),
        postBatch: (I, G) => ccr.postInternalEventsBatch(I, G),
        listPage: (I, G) => ccr.getInternalEventsPage(I, G),
      };
    },
    connect() {
      ccr.initialize(epoch).then(
        (code) => {
          if (closed) return;
          if (
            ((writesReady = !0),
            logForDebugging(
              `[bridge:repl] v2 transport ready for writes (epoch=${epoch}); opening the read stream`,
            ),
            onConnectCallback?.(code),
            !opts.outboundOnly && !closed)
          )
            sseTransport.connect();
        },
        (err) => {
          (logForDebugging(`[bridge:repl] CCR v2 initialize failed: ${errorMessage(err)}`, {
            level: "error",
          }),
            closeOnce(4091));
        },
      );
    },
  };
}

export { createV2ReplTransport };

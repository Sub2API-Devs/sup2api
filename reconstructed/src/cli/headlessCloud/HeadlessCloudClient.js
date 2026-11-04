/**
 * cli/headlessCloud/HeadlessCloudClient.ts
 *
 * 2.1.316 新增：无头 --cloud 客户端主体：出站消息队列与账本、控制请求中继、启动看门狗、按原因退出。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fe6rs39h.js (28)
 * attribution: placement 28
 */
import { randomUUID } from "crypto";
import { isDeepStrictEqual } from "util";
import {
  ServedCallWatch,
  UNRESPONSIVE_NOTICE,
  responseTimeoutMs,
  WAITING_FOR_ANSWER_NOTICE,
  isServedCallWatchEnabled,
  syncRemotePermissionMode,
} from "../../remote/tools/servedChannel.js";
import { logEvent } from "../../services/analytics/index.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  isSetupStep,
  setupStepLabel,
  completedSetupMode,
  setupReadySummary,
} from "../../services/cloudSessions/setupProgress.js";
import { fromEnum, fromEnumOpt, lit } from "../../services/analytics/safeMetadata.js";
import { truncateToWidth } from "../../utils/format.js";
import {
  sanitizeCloudText,
  cloudInformationalMessage,
  clipCloudText,
  cloudDisconnectReason,
  cloudDisconnectMessage,
  logCloudWorkerInit,
} from "../cloudSession/headlessCloudClient.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { withDeadline } from "../../utils/sleep.js";
import { DoctorLazy } from "../handlers/util.js";
import { objectSchema, array, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { isSleepNoticeOnCached } from "../../services/analytics/violinTipGate.js";
import {
  controlErrorResponse,
  controlSuccessResponse,
  isImmediateInterruptRequest,
  emitLoadError,
} from "../print.js";
import { routeHostedControlRequest, lostSdkFeatures } from "../cloudSession/hostedSessionRestrictions.js";
import {
  RELEASED,
  isConfirmRepositoryTrustTool,
  isRequestComputerFolderTool,
  isComputerFolderTarget,
  toCanUseToolRequest,
  toServedPermissionRequest,
} from "../../remote/tools/protocolConstants.js";
import {
  SDKInitializeInitializeMessageSchema,
  createEmptyInitializeResponse,
} from "../../entrypoints/sdk/controlSchemas.js";
import {
  classifyControlRequestError,
  ControlRequestTimeoutError,
} from "../../remote/controlRequestErrors.js";
import { errorMessage, AbortError } from "../../utils/errors.js";
import { parseThinClientReply } from "../thinClient.js";
import { uniq, count } from "../../utils/collections.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import {
  isControlShapedMessage,
  hasNonTextContent,
  isControlCommandLike,
} from "../../remote/controlRequestShape.js";
import { scopeKey } from "../transports/ccrClient.js";
import { logError } from "../../utils/log.js";
import {
  WITHDRAWN as WITHDRAWN_2,
  CANCELLED,
  formatUndeliveredAnswerNotice,
  RemoteSessionManager,
} from "../../remote/RemoteSessionManager.js";
import { StructuredIO } from "../structuredIO.js";
import { HostPermissionBridge } from "./hostPermissions.js";
import {
  getAccountInformation,
  sdkHostOffersOAuthRefresh,
  hostSessionsBearerOffered,
  isClaudeAISignInToken,
  isClaudeAIOAuthTokenHostInjected,
} from "../../utils/auth.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { isConsentDialogKind, createHostDialogHandler } from "./consent.js";
import { setSdkOAuthTokenRefreshCallback, getSessionId } from "../../bootstrap/state.js";
import { setHostSessionsBearerSource } from "../../utils/hostSessionsBearer.js";
import { queuePriorityOrUndefined } from "../../utils/messages/messagePredicates.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { sanitizeStringList } from "../../bridge/controlRequests.js";
import {
  isStartupFailureResultRequested,
  buildStartupFailureResult,
  startupResultSessionId,
} from "../startupFailureResult.js";
import { hashSessionAddress } from "../../utils/sessionUrl.js";
import { toInfraSessionId } from "../../bridge/sessionIdCompat.js";
import { CloudStreamFilter } from "./streamFilter.js";
import { buildSyncStatusFromRemote, noop_3, formatSyncStatusLine } from "./syncStatus.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { markSessionRead, updateSessionTitle } from "../../utils/teleport/api.js";
import { HeadlessFeatureHandles, HEADLESS_FEATURE_NAMES } from "./headlessFeatures.js";
import { normalizeCanUseToolRequest, parsePermissionRequest } from "../../remote/wireFrameShape.js";
import { isRepositoryTrustGateEnabled } from "../../utils/teleport/repositoryTrustGate.js";
import { deviceProofState } from "../../utils/hooks/deviceHooks/contentDigest.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../../remote/tools/consentText.js";
import { getRemoteSessionUrl } from "../../constants/product.js";
import { parsePermissionMode } from "../../types/permissions.js";
import { toExternalPermissionMode } from "../../utils/permissions/PermissionMode.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fe6rs39h.js:61774-61809 placement
var CLOUD_CLIENT_TIMEOUTS = 60000;
var STALL_LINE_FRESHNESS_MS = 1000;
var STALL_LINE_MAX_WIDTH = 75;
var STALL_LINE_MAX_CHARS = 2048;
//@ chunk-fe6rs39h.js:61809-66045 placement
/**
 * 等待云会话启动的监控：长时间未就绪时提示（tengu_remote_headless_client_bootstrap_stalled），跟踪压缩与标题。
 */
class BootstrapWatchdog {
  ports;
  options;
  watchdog = new ServedCallWatch();
  cancelStall = null;
  unsubscribeStatus = [];
  compacting = false;
  workerReady = false;
  title = "none";
  titleSet = Promise.resolve();
  stopped = false;
  lastLine = null;
  lastProvisioningLine = "";
  watchdogFires = 0;
  linesWritten = 0;
  linesTagged = 0;
  linesSuppressed = 0;
  constructor(ports, options) {
    this.ports = ports;
    this.options = options;
  }
  get stats() {
    return {
      watchdog_fires: this.watchdogFires,
      title: this.options.titleFromFirstMessage ? this.title : "not_applicable",
      lines_written: this.linesWritten,
      lines_tagged: this.linesTagged,
      lines_suppressed: this.linesSuppressed,
    };
  }
  armStallWarning() {
    this.cancelStall?.();
    this.cancelStall = this.ports.clock.setTimeout(() => {
      this.cancelStall = null;
      if (this.workerReady || this.stopped) return;
      let queued = this.ports.queuedSendCount();
      if (queued === 0) {
        this.armStallWarning();
        return;
      }
      logEvent("tengu_remote_headless_client_bootstrap_stalled", {
        queued,
      });
      this.line(
        "warning",
        "Still waiting for the cloud session to start; what you sent will be delivered when it is ready.",
      );
    }, CLOUD_CLIENT_TIMEOUTS);
  }
  noteWorkerReady() {
    this.workerReady = true;
    this.cancelStall?.();
    this.cancelStall = null;
  }
  attachStatusFeeds(feeds, onChanged) {
    let handle = ({ line, level, notice }) => {
      switch (level) {
        case "debug":
        case "progress":
          logForDebugging(`[headlessCloudClient] ${level}: ${line}`);
          return;
        case "info":
          this.line("notice", line);
          return;
        case "warning":
          this.line("warning", line, undefined);
          return;
        default:
      }
    };
    for (let feed of feeds) {
      if (feed === undefined) continue;
      this.unsubscribeStatus = [
        ...this.unsubscribeStatus,
        feed.subscribe((entry) => {
          handle(entry);
          onChanged?.();
        }),
      ];
      feed.takeBacklog().forEach(handle);
    }
  }
  noteProvisioning(progress, previous) {
    let last = progress.steps.findLast(
      (step) =>
        step.status === "running" &&
        isSetupStep(step.id) &&
        previous?.steps.find((step_2) => step_2.id === step.id)?.status !== "running",
    );
    if (last !== undefined) {
      let label = setupStepLabel(last, completedSetupMode(progress));
      if (label !== this.lastProvisioningLine) {
        this.lastProvisioningLine = label;
        this.line("notice", `${label}\u2026`);
      }
    }
    let any = progress.steps.some((step) => step.status === "failed");
    let hadFailure = previous?.steps.some((step) => step.status === "failed") ?? false;
    if (any && !hadFailure) {
      if (!this.workerReady) {
        this.cancelStall?.();
        this.cancelStall = null;
        this.line("warning", "The cloud session failed to start.");
      }
      return;
    }
    if (progress.terminal && !(previous?.terminal ?? false)) {
      this.lastProvisioningLine = "";
      this.line("notice", setupReadySummary(progress));
    }
  }
  noteDelivered(content) {
    this.maybeTitle(content);
  }
  noteSendOk({ afterStop }) {
    if (this.ports.controlOnly || !this.workerReady || this.stopped || !afterStop) return;
    this.armWatchdog();
  }
  noteInbound(frame) {
    this.clearWatchdog();
    if (frame.type === "system" && frame.subtype === "status")
      this.compacting = frame.status === "compacting";
    else if (frame.type === "result" || (frame.type === "system" && frame.subtype === "compact_boundary"))
      this.compacting = false;
  }
  notePermissionRequestOpened(requestId) {
    this.watchdog.requestOpened(requestId);
  }
  notePermissionRequestClosed(requestId) {
    this.watchdog.requestClosed(requestId);
  }
  noteInterrupt() {
    this.clearWatchdog();
  }
  halt() {
    this.clearWatchdog();
    this.cancelStall?.();
    this.cancelStall = null;
  }
  async stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.clearWatchdog();
    this.cancelStall?.();
    this.cancelStall = null;
    this.unsubscribeStatus.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeStatus = [];
    let { sessionId, api, essentialTrafficOnly, controlOnly } = this.ports;
    await Promise.allSettled([
      ...(essentialTrafficOnly || controlOnly ? [] : [api.markSessionRead(sessionId)]),
      this.titleSet,
    ]);
  }
  armWatchdog() {
    this.clearWatchdog();
    if (
      !this.watchdog.watch(
        () => {
          if (this.stopped) return;
          this.watchdogFires += 1;
          logEvent("tengu_remote_headless_client_watchdog_fired", {
            timeout: fromEnum(this.compacting ? "compacting" : "response"),
          });
          logForDebugging("[headlessCloudClient] response timeout; reconnecting");
          this.line("warning", UNRESPONSIVE_NOTICE);
          this.ports.reconnect();
        },
        (fn) => this.ports.clock.setTimeout(fn, responseTimeoutMs(this.compacting)),
      )
    )
      this.line("notice", WAITING_FOR_ANSWER_NOTICE);
  }
  clearWatchdog() {
    this.watchdog.clear();
  }
  maybeTitle(content) {
    if (this.stopped || !this.options.titleFromFirstMessage || this.title !== "none") return;
    if (this.ports.essentialTrafficOnly) {
      this.title = "skipped";
      return;
    }
    let text =
      typeof content === "string"
        ? content
        : content
            .flatMap((block) =>
              typeof block === "object" &&
              block !== null &&
              block.type === "text" &&
              typeof block.text === "string"
                ? [block.text]
                : [],
            )
            .join(" ");
    let title = truncateToWidth(
      sanitizeCloudText(truncateToLength(text, STALL_LINE_MAX_CHARS)),
      STALL_LINE_MAX_WIDTH,
    );
    if (title === "") {
      this.title = "skipped";
      return;
    }
    this.title = "set";
    this.titleSet = this.ports.api
      .updateSessionTitle(this.ports.sessionId, title)
      .catch(() => false)
      .then((ok) => {
        if (!ok) this.title = "failed";
      });
  }
  line(level, text, notice) {
    if (this.stopped) return;
    let clean = sanitizeCloudText(text);
    if (clean === "") return;
    let now = this.ports.clock.now();
    if (
      this.lastLine !== null &&
      this.lastLine.level === level &&
      this.lastLine.text === clean &&
      now - this.lastLine.at < STALL_LINE_FRESHNESS_MS
    ) {
      this.linesSuppressed += 1;
      return;
    }
    this.lastLine = {
      level,
      text: clean,
      at: now,
    };
    this.linesWritten += 1;
    if (notice !== undefined) this.linesTagged += 1;
    this.ports.emit(cloudInformationalMessage(this.ports.stampedSessionId(), level, clean, notice));
  }
}
//@ chunk-fe6rs39h.js:66082-66141 placement
function scheduleTimer(clock, promise, onTimeout) {
  return withDeadline(promise, onTimeout, (resolve, timeoutMs) => clock.setTimeout(resolve, timeoutMs));
}
//@ chunk-fe6rs39h.js:66141-66240 placement
var HOST_SLEEP_NOTICE; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var RECEIPT_ORDER_TIMEOUT_MS;
var MAX_CANCELLED_IDS_ECHOED;
var thinClientInterruptReplySchema;
deferInit("chunk-fe6rs39h.js:66141", () => {
  HOST_SLEEP_NOTICE = "host_sleep_notice";
  RECEIPT_ORDER_TIMEOUT_MS = 3000;
  MAX_CANCELLED_IDS_ECHOED = 256;
  thinClientInterruptReplySchema = DoctorLazy(() =>
    objectSchema({
      cancelled: array(stringSchema()).optional().catch(undefined),
    }),
  );
});
//@ chunk-fe6rs39h.js:66240-72711 placement
/**
 * 转发宿主的 control_request 到云会话并回传响应；处理 interrupt、取消排队消息、收据顺序。
 */
class ControlRequestRelay {
  ports;
  pendingInterrupt = null;
  announcedCancelled = new Set();
  issued = Promise.resolve();
  lastReceipt = Promise.resolve();
  sleepOutstanding = false;
  constructor(ports) {
    this.ports = ports;
  }
  get interruptIssued() {
    return this.issued;
  }
  handleControlRequest(frame) {
    let requestId = "request_id" in frame ? frame.request_id : undefined;
    let request = "request" in frame ? frame.request : undefined;
    if (typeof requestId !== "string" || typeof request !== "object" || request === null) {
      logForDebugging("[headlessCloudClient] dropping control_request without request_id or request");
      return "dropped";
    }
    let state = "state" in request ? request.state : undefined;
    if (
      "subtype" in request &&
      request.subtype === HOST_SLEEP_NOTICE &&
      (isSleepNoticeOnCached() || (this.sleepOutstanding && state === "did_wake"))
    ) {
      if (state !== "will_sleep" && state !== "did_wake") {
        this.ports.emit(
          controlErrorResponse(requestId, `${HOST_SLEEP_NOTICE}: state must be will_sleep or did_wake`),
        );
        return "rejected";
      }
      this.sleepOutstanding = state === "will_sleep";
      this.ports.track(
        this.ports.sleepNotice(state).then(() => this.ports.emit(controlSuccessResponse(requestId, {}))),
      );
      return "local";
    }
    let hostedRequest = request;
    let { route, telemetrySubtype } = routeHostedControlRequest(hostedRequest, {
      strict: this.ports.initializePolicy === "strict",
    });
    switch (route.kind) {
      case "reject":
        this.ports.emit(controlErrorResponse(requestId, route.error));
        this.log(telemetrySubtype, "rejected");
        return "rejected";
      case "forward": {
        let submitResult = this.ports.outbound.submit({
          kind: "control",
          request: hostedRequest,
          hostRequestId: requestId,
          holdsLaterSends: route.holdsLaterSends,
          telemetrySubtype,
        });
        this.ports.requestOpen(null);
        return submitResult === "refused" ? "rejected" : "forwarded";
      }
      case "local":
        switch (route.handler) {
          case "initialize":
            this.handleInitialize(requestId, hostedRequest);
            return "local";
          case "interrupt":
            this.handleInterrupt(requestId, hostedRequest);
            this.ports.requestOpen(null);
            return "local";
          case "end_session":
            this.ports.emit(controlSuccessResponse(requestId, {}));
            this.ports.end({
              reason: "end_session",
              ...("reason" in hostedRequest &&
                hostedRequest.reason === RELEASED && {
                  leftFor: "released",
                }),
            });
            this.log("end_session", "local");
            return "local";
          case "cancel_async_message":
            this.handleCancelAsyncMessage(requestId, hostedRequest);
            this.ports.requestOpen(null);
            return "local";
        }
    }
  }
  handleCancelRequest(frame) {
    this.ports.outbound.cancelForward("request_id" in frame ? frame.request_id : undefined);
  }
  handleInitialize(requestId, request) {
    let isOpening = !this.ports.openRequested();
    let {
      hooks,
      sdkMcpServers,
      sdkMcpServerConfigs,
      sdkMcpServerManifests,
      sdkMcpServerManifestsOrigin,
      workspaceTrust,
      ...rest
    } = request;
    let parsed = SDKInitializeInitializeMessageSchema().safeParse(rest);
    let lossReport = lostSdkFeatures(
      request,
      this.ports.initializePolicy,
      isOpening && parsed.success ? this.ports.openingInitializeHonours : undefined,
    );
    if (
      lossReport.outcome !== "reject" &&
      isOpening &&
      !parsed.success &&
      this.ports.initializePolicy === "strict"
    ) {
      this.ports.emit(
        controlErrorResponse(
          requestId,
          "the initialize request could not be read (it does not match the control schema), so its options cannot be applied to a cloud session; nothing was started",
        ),
      );
      this.ports.end({
        reason: "rejected_options",
        message:
          "the initialize request could not be read (it does not match the control schema), so its options cannot be applied to a cloud session; nothing was started",
      });
      this.log("initialize", "rejected");
      return;
    }
    if (lossReport.outcome === "reject") {
      this.ports.emit(controlErrorResponse(requestId, lossReport.error));
      if (isOpening)
        this.ports.end({
          reason: "rejected_options",
          message: lossReport.error,
        });
      this.log("initialize", "rejected");
      return;
    }
    this.ports.emit(
      controlSuccessResponse(requestId, {
        ...createEmptyInitializeResponse(this.ports.account()),
        ...(lossReport.ignored.includes("hooks") && {
          hooks_applied: false,
        }),
        ...(lossReport.ignored.includes("plugins") && {
          plugins_applied: false,
        }),
      }),
    );
    if (!parsed.success)
      logForDebugging(
        "[headlessCloudClient] initialize did not match its schema; opening the session without host options",
      );
    this.ports.requestOpen(parsed.success ? parsed.data : null);
    logEvent("tengu_remote_headless_client_host_request", {
      subtype: fromEnum("initialize"),
      outcome: fromEnum("local"),
      ignored_count: lossReport.ignored.length + this.ports.ignoredOptionsCount,
    });
  }
  handleInterrupt(requestId, request) {
    let isCancelQueued = "cancel_queued" in request && request.cancel_queued === true;
    let seededUuid = this.ports.pendingSeededPromptUuid();
    let cancelled = isCancelQueued ? this.ports.outbound.withdrawQueuedSends() : [];
    let stillQueued = [
      ...(seededUuid === undefined ? [] : [seededUuid]),
      ...this.ports.outbound.sendUuidsInFlight(),
      ...(isCancelQueued ? [] : this.ports.outbound.queuedSendUuids()),
    ];
    if (!(request.subtype === "interrupt" && isImmediateInterruptRequest(request)))
      this.ports.onInterrupt?.();
    this.ports.emit(
      controlSuccessResponse(
        requestId,
        isCancelQueued
          ? {
              still_queued: stillQueued,
              cancelled,
            }
          : {
              still_queued: stillQueued,
            },
      ),
    );
    let forwarded = request;
    if (request.subtype === "interrupt") {
      let { for_user_message_uuids: forUserMessageUuids, worker_epoch: workerEpoch, ...rest } = request;
      forwarded =
        typeof rest.message_uuid === "string"
          ? {
              ...rest,
              message_uuid: rest.message_uuid.toLowerCase(),
            }
          : rest;
    }
    let live = this.ports.liveSession();
    if (live === null) {
      this.pendingInterrupt = normalizeInterruptRequest(this.pendingInterrupt, forwarded);
      this.log("interrupt", "queued");
      return;
    }
    this.dispatchInterrupt(live.manager, forwarded);
    this.log("interrupt", "forwarded");
  }
  async sendPendingInterrupt(manager) {
    let pending = this.takePendingInterrupt();
    if (pending === null) return;
    this.dispatchInterrupt(manager, pending);
    let gate = scheduleTimer(
      this.ports.clock,
      this.lastReceiptAfterIssue().catch(noopCallback),
      RECEIPT_ORDER_TIMEOUT_MS,
    );
    this.ports.outbound.holdLaterSendsBehind(gate);
    await gate;
  }
  async issuePendingInterrupt(manager) {
    let pending = this.takePendingInterrupt();
    if (pending === null) return;
    this.dispatchInterrupt(manager, pending);
    await this.issued;
  }
  takePendingInterrupt() {
    let pendingInterrupt = this.pendingInterrupt;
    this.pendingInterrupt = null;
    if (pendingInterrupt !== null && !this.ports.interruptMattersBeforeLive()) {
      logEvent("tengu_remote_headless_client_interrupt_receipt", {
        outcome: fromEnum("nothing_to_stop"),
      });
      return null;
    }
    return pendingInterrupt;
  }
  async lastReceiptAfterIssue() {
    await this.issued;
    await this.lastReceipt;
  }
  dispatchInterrupt(manager, request) {
    let startedAt = this.ports.clock.now();
    let keepWithheld = !("cancel_queued" in request && request.cancel_queued === true);
    let toSend = request;
    if (!keepWithheld && request.subtype === "interrupt") {
      let { send_now: sendNow, message_uuid: messageUuid, ...rest } = request;
      toSend = rest;
    }
    this.issued = this.ports.track(
      manager
        .releaseHeldSends(undefined, {
          keepWithheld,
        })
        .then(
          () => {
            this.lastReceipt = manager.sendControlRequest(toSend).then(
              (reply) => {
                this.logInterruptReceipt("ok", startedAt, this.announceSweptByWorker(reply));
              },
              (error) => {
                let isNotConnected = classifyControlRequestError(error) === "not_connected";
                this.logInterruptReceipt(isNotConnected ? "not_sent" : "error", startedAt);
              },
            );
          },
          (error) => {
            logForDebugging(`[headlessCloudClient] interrupt not dispatched: ${errorMessage(error)}`);
            this.logInterruptReceipt("not_sent", startedAt);
          },
        ),
    );
    this.ports.outbound.holdLaterSendsBehind(this.issued);
  }
  logInterruptReceipt(outcome, startedAt, sweptCount) {
    logEvent("tengu_remote_headless_client_interrupt_receipt", {
      outcome: fromEnum(outcome),
      latency_ms: this.ports.clock.now() - startedAt,
      ...(sweptCount !== undefined && {
        swept_announced: sweptCount,
      }),
    });
  }
  announceSweptByWorker(reply) {
    let cancelled =
      parseThinClientReply("interrupt", thinClientInterruptReplySchema(), reply ?? {})?.cancelled ?? [];
    let sliced = uniq(cancelled)
      .filter((uuid) => normalizeUuidOrNull(uuid) !== null && !this.announcedCancelled.has(uuid))
      .slice(0, MAX_CANCELLED_IDS_ECHOED);
    sliced.forEach((uuid) => {
      this.announcedCancelled.add(uuid);
      try {
        this.ports.emit({
          type: "command_lifecycle",
          command_uuid: uuid,
          state: "cancelled",
          uuid: randomUUID(),
          session_id: this.ports.stampedSessionId(),
        });
      } catch (error) {
        logForDebugging(`[headlessCloudClient] could not announce a swept command: ${errorMessage(error)}`);
      }
    });
    return sliced.length;
  }
  handleCancelAsyncMessage(requestId, request) {
    let normalized =
      request.subtype === "cancel_async_message" && typeof request.message_uuid === "string"
        ? {
            ...request,
            message_uuid: request.message_uuid.toLowerCase(),
          }
        : request;
    let messageUuid = "message_uuid" in normalized ? normalized.message_uuid : undefined;
    if (this.ports.outbound.withdrawQueuedSend(messageUuid)) {
      this.ports.emit(
        controlSuccessResponse(requestId, {
          cancelled: true,
        }),
      );
      this.log("cancel_async_message", "local");
      return;
    }
    this.ports.outbound.submit({
      kind: "control",
      request: normalized,
      hostRequestId: requestId,
      holdsLaterSends: false,
      telemetrySubtype: "cancel_async_message",
    });
  }
  log(subtype, outcome) {
    logEvent("tengu_remote_headless_client_host_request", {
      subtype: fromEnum(subtype),
      outcome: fromEnum(outcome),
    });
  }
}
//@ chunk-fe6rs39h.js:72711-72726 placement
function noopCallback() {}
//@ chunk-fe6rs39h.js:72726-73036 placement
function normalizeInterruptRequest(pendingInterrupt, request) {
  if (request.subtype !== "interrupt") return request;
  let isCancelQueued =
    pendingInterrupt !== null &&
    "cancel_queued" in pendingInterrupt &&
    pendingInterrupt.cancel_queued === true;
  let isHeld =
    pendingInterrupt !== null && !("send_now" in pendingInterrupt && pendingInterrupt.send_now === true);
  let { message_uuid: messageUuid, ...withoutUuid } = request;
  let { send_now: sendNow, ...withoutSendNow } = withoutUuid;
  let isSameMessage =
    pendingInterrupt === null ||
    ("message_uuid" in pendingInterrupt ? pendingInterrupt.message_uuid : undefined) === messageUuid;
  let normalized = isHeld ? withoutSendNow : isSameMessage ? request : withoutUuid;
  return isCancelQueued
    ? {
        ...normalized,
        cancel_queued: true,
      }
    : normalized;
}
//@ chunk-fe6rs39h.js:73078-76477 placement
/**
 * 发往云会话的用户消息账本：queued → posting → delivered/seeded/withdrawn，带上限与重放。
 */
class OutboundMessageLedger {
  cap;
  replay;
  entries = new Map();
  constructor(cap, replay) {
    this.cap = cap;
    this.replay = replay;
  }
  get size() {
    return this.entries.size;
  }
  phaseOf(uuid) {
    return this.entries.get(uuid)?.phase;
  }
  wasTaken(uuid) {
    let phase = this.phaseOf(uuid);
    return phase === "queued" || phase === "posting" || phase === "delivered" || phase === "seeded";
  }
  seed(uuid, content, shouldStore) {
    let existing = this.entries.get(uuid);
    let unsettled =
      existing !== undefined && existing.owed > 0 && existing.content !== undefined
        ? [
            {
              uuid,
              content: existing.content,
            },
          ]
        : [];
    let willStore = shouldStore && content !== undefined;
    return [
      ...this.set(uuid, {
        kind: "message",
        phase: "seeded",
        content: content ?? existing?.content,
        stored: willStore ? content : undefined,
        owed: this.replay && !willStore ? 1 : 0,
        pendingEchoes: willStore ? 0 : 1,
        delivered: true,
        echoMayBeLost: false,
        hadBefore: false,
      }),
      ...unsettled,
      ...(willStore && this.replay
        ? [
            {
              uuid,
              content,
            },
          ]
        : []),
    ];
  }
  accept(uuid, kind, content) {
    let existing = this.entries.get(uuid);
    let owedDelta = this.replay && kind === "message" ? 1 : 0;
    this.entries.delete(uuid);
    return this.set(uuid, {
      kind,
      phase: "queued",
      content,
      stored: undefined,
      owed: (existing?.owed ?? 0) + owedDelta,
      pendingEchoes: existing?.pendingEchoes ?? 0,
      delivered: false,
      echoMayBeLost: existing?.echoMayBeLost ?? false,
      hadBefore: false,
    });
  }
  withdraw(uuid) {
    let entry = this.entries.get(uuid);
    if (entry === undefined) return true;
    if (entry.phase === "posting") {
      entry.pendingEchoes = Math.max(0, entry.pendingEchoes - 1);
      if (entry.delivered) {
        entry.phase = "delivered";
        return false;
      }
    }
    entry.phase = "withdrawn";
    entry.owed = Math.max(0, entry.owed - 1);
    return true;
  }
  giveUp(uuid) {
    let entry = this.entries.get(uuid);
    if (entry === undefined)
      return {
        echo: false,
      };
    entry.phase = "given_up";
    return {
      echo: this.takeOwed(entry),
    };
  }
  postStart(uuid) {
    let entry = this.entries.get(uuid);
    if (entry === undefined) return;
    entry.phase = "posting";
    if (entry.kind === "message") entry.pendingEchoes += 1;
  }
  hadBefore(uuid) {
    return this.entries.get(uuid)?.hadBefore ?? false;
  }
  postOk(uuid, outcome) {
    let entry = this.entries.get(uuid);
    if (entry === undefined)
      return {
        echo: false,
      };
    entry.phase = "delivered";
    entry.delivered = true;
    if (outcome === "duplicate") entry.hadBefore = true;
    if (outcome === "never") entry.pendingEchoes = 0;
    if (outcome !== "streams") entry.stored ??= entry.content;
    return outcome !== "streams" || entry.echoMayBeLost
      ? {
          echo: this.takeOwed(entry),
        }
      : {
          echo: false,
        };
  }
  postFail(uuid, echoPending) {
    let entry = this.entries.get(uuid);
    if (entry === undefined)
      return {
        echo: false,
        error: true,
      };
    if (entry.delivered) {
      entry.phase = "delivered";
      return {
        echo: false,
        error: false,
      };
    }
    entry.phase = "failed";
    if (!echoPending) entry.pendingEchoes = Math.max(0, entry.pendingEchoes - 1);
    return {
      echo: this.takeOwed(entry),
      error: true,
    };
  }
  streamEcho(uuid, content) {
    let entry = this.entries.get(uuid);
    if (entry === undefined || entry.kind !== "message")
      return {
        verdict: "not_own",
        dequeue: false,
      };
    if (entry.pendingEchoes > 0) {
      entry.pendingEchoes = 0;
      entry.echoMayBeLost = false;
      entry.stored = content;
      let dequeue = entry.phase === "queued";
      entry.delivered = true;
      if (entry.phase !== "posting" && entry.phase !== "seeded") entry.phase = "delivered";
      if (entry.owed > 0) {
        entry.owed -= 1;
        return {
          verdict: "claim",
          sent: entry.content,
          dequeue,
        };
      }
      return {
        verdict: "consume",
        dequeue,
      };
    }
    return {
      verdict:
        entry.delivered &&
        entry.owed === 0 &&
        entry.stored !== undefined &&
        isDeepStrictEqual(content, entry.stored)
          ? "consume"
          : "peer",
      dequeue: false,
    };
  }
  settleOwed() {
    return [...this.entries].flatMap(([uuid, entry]) => {
      if (
        (entry.phase !== "delivered" && entry.phase !== "seeded") ||
        entry.owed === 0 ||
        entry.content === undefined
      )
        return [];
      entry.owed -= 1;
      return [
        {
          uuid,
          content: entry.content,
        },
      ];
    });
  }
  truncation() {
    return [...this.entries].flatMap(([uuid, entry]) => {
      if (entry.pendingEchoes === 0) return [];
      entry.echoMayBeLost = true;
      if (entry.owed === 0 || entry.content === undefined) return [];
      entry.owed -= 1;
      return [
        {
          uuid,
          content: entry.content,
        },
      ];
    });
  }
  takeOwed(entry) {
    if (entry.owed === 0) return false;
    entry.owed -= 1;
    return true;
  }
  set(uuid, entry) {
    let evicted = !this.entries.has(uuid) && this.entries.size >= this.cap ? this.evictOne() : [];
    this.entries.set(uuid, entry);
    return evicted;
  }
  evictOne() {
    let isPending = (entry) => entry.phase === "queued" || entry.phase === "posting";
    let isDisposable = (entry) => !isPending(entry) && entry.owed === 0 && entry.pendingEchoes === 0;
    let isIdle = (entry) => !isPending(entry) && entry.owed === 0;
    let isNotPending = (entry) => !isPending(entry);
    let victim = this.oldestWhere(isDisposable) ?? this.oldestWhere(isIdle) ?? this.oldestWhere(isNotPending);
    if (victim === null) return [];
    let [uuid, entry] = victim;
    this.entries.delete(uuid);
    return entry.owed > 0 && entry.content !== undefined
      ? [
          {
            uuid,
            content: entry.content,
          },
        ]
      : [];
  }
  oldestWhere(predicate) {
    return [...this.entries].find(([, entry]) => predicate(entry)) ?? null;
  }
}
//@ chunk-fe6rs39h.js:76477-76749 placement
var NOT_DELIVERED_MESSAGE = "Your message was not delivered to the cloud session";
var SEND_ACK_TIMEOUT_MS = 60000;
var CLIENT_CLOSED_BEFORE_COMPLETE = "the cloud client closed before this request completed";
var MALFORMED_CONTENT_BLOCKS_TEXT =
  "every content block must be an object, and a text block must carry string text";
var CLIENT_CLOSED_BEFORE_CONFIRMED = "the cloud client closed before the send was confirmed";
//@ chunk-fe6rs39h.js:76749-88163 placement
/**
 * 用户消息发送队列：顺序投递到云会话、断线后重投、关闭时给未确认的消息回错误。
 */
class OutboundMessageQueue {
  ports;
  queueCap;
  queue = [];
  flushing = false;
  closedWhy = null;
  closedCause = null;
  laterSendsHold = Promise.resolve();
  ledger;
  postsInFlight = new Set();
  forwardsInFlight = new Map();
  sendOutstanding = false;
  outstandingSend = Promise.resolve();
  forwardsWaiting = new Map();
  renewalParked = new Set();
  sendCount = 0;
  forwardCount = 0;
  maxQueued = 0;
  constructor(ports, queueCap) {
    this.ports = ports;
    this.queueCap = queueCap;
    this.ledger = new OutboundMessageLedger(queueCap * 4 + 8, ports.replayUserMessages);
  }
  get queuedCount() {
    return this.queue.length + this.forwardsWaiting.size;
  }
  get isFlushing() {
    return this.flushing;
  }
  get stats() {
    return {
      sends: this.sendCount,
      forwards: this.forwardCount,
      maxQueued: this.maxQueued,
    };
  }
  noteOwnUuid(uuid, content) {
    this.queue = this.queue.filter((item) => item.kind === "control" || item.uuid !== uuid);
    this.payOwed(
      this.ledger.seed(
        uuid,
        content,
        content !== undefined &&
          isControlShapedMessage({
            message: {
              content,
            },
          }),
      ),
    );
  }
  streamEcho(uuid, content) {
    let echo = this.ledger.streamEcho(uuid, content);
    if (echo.dequeue) this.queue = this.queue.filter((item) => item.kind === "control" || item.uuid !== uuid);
    return echo.verdict === "claim"
      ? {
          verdict: "claim",
          sent: echo.sent,
        }
      : {
          verdict: echo.verdict,
        };
  }
  settleOwedEchoes() {
    this.payOwed(this.ledger.settleOwed());
  }
  payOwed(owedEchoes) {
    let sessionId = this.ports.stampedSessionId();
    owedEchoes.forEach(({ uuid, content }) =>
      this.contained(() => this.writeEcho(scopeKey(sessionId, uuid, content))),
    );
  }
  wasTaken(uuid) {
    return this.ledger.wasTaken(uuid);
  }
  synthesizeMissedEchoes() {
    let owedEchoes = this.ledger.truncation();
    this.payOwed(owedEchoes);
    return owedEchoes.length;
  }
  writeEcho(echoKey, duplicate = false) {
    if (this.ports.emitEcho) {
      this.ports.emitEcho(echoKey, {
        duplicate,
      });
      return;
    }
    this.ports.emit(echoKey);
  }
  contained(fn) {
    try {
      fn();
    } catch (error) {
      logError(error);
    }
  }
  abandonPostsInFlight(reason) {
    let inFlight = [...this.postsInFlight];
    this.postsInFlight.clear();
    this.renewalParked.clear();
    inFlight.forEach((item) =>
      this.failItem(item, reason, {
        posted: true,
        unconfirmed: true,
      }),
    );
    this.settleOwedEchoes();
    return inFlight.length;
  }
  submit(item) {
    if (item.kind !== "control") {
      if (this.ledger.wasTaken(item.uuid)) {
        if (item.kind === "message" && this.ports.replayUserMessages)
          this.writeEcho(
            scopeKey(this.ports.stampedSessionId(), item.uuid, item.content),
            this.ledger.hadBefore(item.uuid),
          );
        return "redelivered";
      }
      this.payOwed(
        this.ledger.accept(item.uuid, item.kind, item.kind === "message" ? item.content : undefined),
      );
    }
    if (this.closedWhy !== null) {
      this.failItem(item, this.closedWhy, {
        composedHere: this.closedCause === "open_failed",
      });
      if (item.kind !== "control") this.logSend(item.kind, "closed");
      return "refused";
    }
    if (
      item.kind === "message" &&
      hasNonTextContent({
        message: {
          content: item.content,
        },
      })
    ) {
      this.failItem(item, MALFORMED_CONTENT_BLOCKS_TEXT);
      this.logSend(item.kind, "malformed");
      return "refused";
    }
    if (item.kind === "control" && this.sendOutstanding && this.ports.liveSession() !== null) {
      this.forwardOutOfBand(item);
      return "new";
    }
    if (this.queue.length >= this.queueCap) {
      this.failItem(item, "too many messages are waiting for the cloud session", {
        outcome: "overflow",
      });
      logEvent("tengu_remote_headless_client_queue_overflow", {
        kind: fromEnum(item.kind),
      });
      return "refused";
    }
    this.queue.push(item);
    this.maxQueued = Math.max(this.maxQueued, this.queue.length);
    if (this.ports.liveSession() !== null) this.ports.track(this.flush().catch(logError));
    return "new";
  }
  async untilNoHold() {
    let observed = null;
    while (observed !== this.laterSendsHold) {
      observed = this.laterSendsHold;
      await observed;
    }
  }
  holdLaterSendsBehind(promise) {
    this.laterSendsHold = this.laterSendsHold.then(() =>
      promise.then(noopPromiseHandler, noopPromiseHandler),
    );
  }
  close(closedWhy, cause) {
    if (this.closedWhy === null) {
      this.closedWhy = closedWhy;
      this.closedCause = cause;
    }
    this.failQueued(this.closedWhy, cause);
    this.settleOwedEchoes();
  }
  async flush() {
    if (this.flushing) return;
    this.flushing = true;
    try {
      while (this.ports.liveSession() !== null) {
        let head = this.queue[0];
        if (head !== undefined && head.kind !== "control") {
          await this.untilNoHold();
          if (this.ports.liveSession() === null) break;
        }
        let item = this.queue.shift();
        if (item === undefined) break;
        try {
          if (item.kind === "control") this.forwardOutOfBand(item);
          else {
            this.sendOutstanding = true;
            try {
              let sending = this.post(item);
              this.outstandingSend = sending.then(noopPromiseHandler, noopPromiseHandler);
              this.contained(() => this.releaseQueuedForwards());
              await sending;
            } finally {
              this.sendOutstanding = false;
            }
          }
        } catch (error) {
          this.failAfterInternalError(item, error);
        }
      }
    } finally {
      this.flushing = false;
    }
  }
  releaseQueuedForwards() {
    let filtered = this.queue.filter((item) => item.kind === "control");
    if (filtered.length === 0) return;
    this.queue = this.queue.filter((item) => item.kind !== "control");
    filtered.forEach((item) => this.forwardOutOfBand(item));
  }
  forwardOutOfBand(item) {
    let abortController = new AbortController();
    let gate =
      item.request.subtype === "cancel_async_message"
        ? Promise.all([this.laterSendsHold, this.outstandingSend]).then(noopPromiseHandler)
        : this.laterSendsHold;
    this.forwardsWaiting.set(abortController, item);
    let tracked = this.ports.track(
      gate
        .then(() => {
          if (!this.forwardsWaiting.delete(abortController)) return;
          return this.forward(item, abortController);
        })
        .catch((error) => this.failAfterInternalError(item, error, abortController)),
    );
    if (item.holdsLaterSends) this.holdLaterSendsBehind(tracked);
  }
  failQueued(reason, cause) {
    let failed = [...this.queue, ...this.forwardsWaiting.values()];
    this.queue = [];
    this.forwardsWaiting.clear();
    let composedHere = cause === "open_failed";
    failed.forEach((item) =>
      this.failItem(item, reason, {
        composedHere,
      }),
    );
    if (failed.length > 0)
      logEvent("tengu_remote_headless_client_queue_dropped", {
        count: failed.length,
        cause: fromEnum(cause),
      });
    return failed.length;
  }
  answerForwardsInFlight(reason) {
    let text = sanitizeCloudText(reason);
    for (let key of [...this.forwardsInFlight.keys()]) {
      this.contained(() => this.ports.emit(controlErrorResponse(key, text)));
      this.forwardsInFlight.delete(key);
    }
  }
  queuedSendUuids() {
    return [
      ...this.queue.flatMap((item) => (item.kind === "control" ? [] : [item.uuid])),
      ...[...this.renewalParked].map((item) => item.uuid),
    ];
  }
  sendUuidsInFlight() {
    return [...this.postsInFlight].flatMap((item) => (this.renewalParked.has(item) ? [] : [item.uuid]));
  }
  heldMessages() {
    let liveSession = this.ports.liveSession();
    if (liveSession === null) return [];
    let heldUuids = new Set(liveSession.manager.heldSendUuids());
    return [...this.postsInFlight].filter(
      (item) => item.kind === "message" && !this.renewalParked.has(item) && heldUuids.has(item.uuid),
    );
  }
  queuedMessages() {
    return [...this.queue, ...this.renewalParked].filter((item) => item.kind === "message");
  }
  withdrawQueuedSends() {
    let heldUuids = this.withdrawHeldSends();
    let targets = [...this.queuedSendUuids(), ...heldUuids];
    this.queue = this.queue.filter((item) => item.kind === "control");
    this.renewalParked.forEach((item) => this.postsInFlight.delete(item));
    this.renewalParked.clear();
    return targets
      .map((uuid) => [uuid, this.withdrawFromLedger(uuid, "interrupt")])
      .filter(([, withdrawn]) => withdrawn)
      .map(([uuid]) => uuid);
  }
  withdrawHeldSends() {
    let liveSession = this.ports.liveSession();
    if (liveSession === null) return [];
    return liveSession.manager.heldSendUuids().filter((uuid) => this.withdrawHeld(uuid));
  }
  withdrawHeld(uuid) {
    let liveSession = this.ports.liveSession();
    let found = [...this.postsInFlight].find((item) => item.uuid === uuid && !this.renewalParked.has(item));
    if (liveSession === null || found === undefined) return false;
    if (!liveSession.manager.withdrawHeldSend(uuid)) return false;
    this.postsInFlight.delete(found);
    return true;
  }
  withdrawQueuedSend(uuid) {
    if (typeof uuid !== "string") return false;
    let index = this.queue.findIndex((item) => item.kind !== "control" && item.uuid === uuid);
    let found = [...this.renewalParked].find((parked) => parked.uuid === uuid);
    if (index === -1 && found === undefined) {
      if (!this.withdrawHeld(uuid)) return false;
      return this.withdrawFromLedger(uuid, "cancel_async_message");
    }
    if (index !== -1) this.queue.splice(index, 1);
    if (found !== undefined) {
      this.renewalParked.delete(found);
      this.postsInFlight.delete(found);
    }
    return this.withdrawFromLedger(uuid, "cancel_async_message");
  }
  withdrawFromLedger(uuid, subtype) {
    let withdrawn = this.ledger.withdraw(uuid);
    if (!withdrawn)
      this.contained(() =>
        logEvent("tengu_remote_headless_client_cancel_found_delivered", {
          subtype: fromEnum(subtype),
        }),
      );
    return withdrawn;
  }
  cancelForward(hostRequestId) {
    let matches = (item) => item.kind === "control" && item.hostRequestId === hostRequestId;
    let filtered = [...this.forwardsWaiting].filter(([, item]) => matches(item));
    let affected = [...this.queue.filter(matches), ...filtered.map(([, item]) => item)];
    this.queue = this.queue.filter((item) => !matches(item));
    filtered.forEach(([key]) => this.forwardsWaiting.delete(key));
    if (typeof hostRequestId === "string") this.forwardsInFlight.get(hostRequestId)?.abort();
    affected.forEach((item) =>
      logEvent("tengu_remote_headless_client_host_request", {
        subtype: fromEnum(item.telemetrySubtype),
        outcome: fromEnum("cancelled"),
      }),
    );
  }
  failAfterInternalError(item, error, abortController) {
    logError(error);
    let message = "an internal error occurred while sending it";
    if (item.kind === "control") {
      if (
        abortController !== undefined &&
        this.forwardsInFlight.get(item.hostRequestId) === abortController
      ) {
        this.forwardsInFlight.delete(item.hostRequestId);
        this.failItem(item, message, {
          outcome: "error",
        });
      }
      return;
    }
    if (this.postsInFlight.delete(item)) {
      this.failItem(item, message, {
        posted: true,
        unconfirmed: true,
      });
      this.logSend(item.kind, "error");
      return;
    }
    switch (this.ledger.phaseOf(item.uuid)) {
      case "queued":
        this.failItem(item, message);
        this.logSend(item.kind, "error");
        return;
      case "posting":
        this.failItem(item, message, {
          posted: true,
          unconfirmed: true,
        });
        return;
      default:
        return;
    }
  }
  failItem(
    item,
    reason,
    { posted = false, unconfirmed = false, outcome = "closed", composedHere = false } = {},
  ) {
    let text = composedHere ? clipCloudText(reason) : sanitizeCloudText(reason);
    let sessionId = this.ports.stampedSessionId();
    switch (item.kind) {
      case "message": {
        let { echo, error } = posted
          ? this.ledger.postFail(item.uuid, unconfirmed)
          : {
              ...this.ledger.giveUp(item.uuid),
              error: true,
            };
        if (!error) {
          logForDebugging(
            `[headlessCloudClient] POST for ${item.uuid} failed after its echo; treating it as delivered`,
          );
          return;
        }
        if (echo) this.contained(() => this.ports.emit(scopeKey(sessionId, item.uuid, item.content)));
        this.contained(() =>
          this.ports.emit(emitLoadError(sessionId, [`${NOT_DELIVERED_MESSAGE}: ${text}`], item.uuid)),
        );
        return;
      }
      case "bash":
        if (posted) this.ledger.postFail(item.uuid, unconfirmed);
        else this.ledger.giveUp(item.uuid);
        this.contained(() =>
          this.ports.emit(
            emitLoadError(sessionId, [
              unconfirmed ? `bash_command may not have run: ${text}` : `bash_command was not run: ${text}`,
            ]),
          ),
        );
        return;
      case "control":
        this.contained(() =>
          this.ports.emit(
            controlErrorResponse(item.hostRequestId, `${item.request.subtype} was not sent: ${text}`),
          ),
        );
        this.contained(() =>
          logEvent("tengu_remote_headless_client_host_request", {
            subtype: fromEnum(item.telemetrySubtype),
            outcome: fromEnum(outcome),
          }),
        );
        return;
    }
  }
  async post(item) {
    let liveSession = this.ports.liveSession();
    if (liveSession === null) {
      this.failItem(item, CLIENT_CLOSED_BEFORE_COMPLETE);
      this.logSend(item.kind, "closed");
      return;
    }
    this.ledger.postStart(item.uuid);
    this.postsInFlight.add(item);
    let startedAt = this.ports.clock.now();
    let accessToken = liveSession.opened.getAccessToken();
    let result = await this.postOnce(liveSession.manager, item);
    let renewed = false;
    let disconnected = false;
    if (!result.ok && result.status === 401 && liveSession.opened.onAuth401 && this.postsInFlight.has(item)) {
      this.renewalParked.add(item);
      try {
        renewed =
          (await scheduleTimer(
            this.ports.clock,
            liveSession.opened.onAuth401(accessToken).catch(() => false),
            SEND_ACK_TIMEOUT_MS,
          )) ?? false;
        if (renewed && this.postsInFlight.has(item)) await this.untilNoHold();
      } finally {
        this.renewalParked.delete(item);
      }
      if (renewed && this.postsInFlight.has(item)) {
        this.ports.onRepost?.(item);
        let renewedSession = this.ports.liveSession();
        disconnected = renewedSession === null;
        result =
          renewedSession === null
            ? {
                ok: false,
                reason: this.closedWhy ?? "the cloud session disconnected",
              }
            : await this.postOnce(renewedSession.manager, item);
      }
    }
    if (!this.postsInFlight.delete(item)) {
      let wasWithdrawn = !result.ok && result.withheld === true && result.reason === WITHDRAWN_2;
      this.contained(() =>
        this.logSend(item.kind, wasWithdrawn ? "withdrawn_held" : "abandoned", {
          renewed,
        }),
      );
      return;
    }
    if (result.ok) {
      let { echo } = this.ledger.postOk(
        item.uuid,
        result.duplicate === true ? "duplicate" : getProgressStreamability(item),
      );
      if (echo && item.kind === "message")
        this.contained(() =>
          this.writeEcho(
            scopeKey(this.ports.stampedSessionId(), item.uuid, item.content),
            result.duplicate === true,
          ),
        );
      this.ports.onSent?.(item, {
        duplicate: result.duplicate === true,
      });
    } else if (result.withheld === true)
      this.failItem(
        item,
        result.reason === CANCELLED || result.reason === WITHDRAWN_2
          ? "it was still waiting to be sent when the cloud client closed"
          : result.reason,
        {
          posted: true,
          unconfirmed: false,
        },
      );
    else
      this.failItem(item, result.reason, {
        posted: true,
        unconfirmed: result.status === undefined && !disconnected,
      });
    this.sendCount += 1;
    this.logSend(item.kind, result.ok ? "ok" : result.withheld === true ? "withheld" : "failed", {
      status: result.ok ? undefined : result.status,
      renewed,
      latency_ms: this.ports.clock.now() - startedAt,
    });
  }
  logSend(kind, outcome, extra = {}) {
    logEvent("tengu_remote_headless_client_send", {
      kind: fromEnum(kind),
      outcome: fromEnum(outcome),
      ...extra,
    });
  }
  postOnce(manager, item) {
    return item.kind === "message"
      ? manager.sendMessage(item.content, {
          uuid: item.uuid,
          ...(item.priority && {
            priority: item.priority,
          }),
          ...(item.pastedContent && {
            pastedContent: item.pastedContent,
          }),
          ...(item.inlinePastes && {
            inlinePastes: item.inlinePastes,
          }),
        })
      : manager.sendBashCommand(
          {
            command: item.command,
            ...(item.cwd !== undefined && {
              cwd: item.cwd,
            }),
          },
          {
            uuid: item.uuid,
          },
        );
  }
  async forward(item, abortController) {
    let { telemetrySubtype } = item;
    let liveSession = this.ports.liveSession();
    if (liveSession === null || this.forwardsInFlight.has(item.hostRequestId)) {
      this.failItem(
        item,
        liveSession === null
          ? CLIENT_CLOSED_BEFORE_COMPLETE
          : "a request with this request_id is already in flight",
        {
          outcome: liveSession === null ? "closed" : "duplicate",
        },
      );
      return;
    }
    this.forwardsInFlight.set(item.hostRequestId, abortController);
    let startedAt = this.ports.clock.now();
    let outcome = await liveSession.manager
      .sendControlRequest(item.request, {
        signal: abortController.signal,
      })
      .then(
        (reply) => {
          if (this.forwardsInFlight.get(item.hostRequestId) !== abortController) return "closed";
          this.ports.emit(controlSuccessResponse(item.hostRequestId, reply ?? {}));
          this.forwardsInFlight.delete(item.hostRequestId);
          return "forwarded";
        },
        (error) => {
          if (this.forwardsInFlight.get(item.hostRequestId) !== abortController) return "closed";
          if (error instanceof AbortError) {
            this.forwardsInFlight.delete(item.hostRequestId);
            return "cancelled";
          }
          this.ports.emit(controlErrorResponse(item.hostRequestId, describeForwardFailure(error)));
          this.forwardsInFlight.delete(item.hostRequestId);
          return "error";
        },
      );
    this.forwardCount += 1;
    logEvent("tengu_remote_headless_client_host_request", {
      subtype: fromEnum(telemetrySubtype),
      outcome: fromEnum(outcome),
      latency_ms: this.ports.clock.now() - startedAt,
    });
  }
}
//@ chunk-fe6rs39h.js:88163-88178 placement
function noopPromiseHandler() {}
//@ chunk-fe6rs39h.js:88178-88316 placement
function getProgressStreamability(event) {
  if (event.kind === "bash") return "streams";
  let message = {
    message: {
      content: event.content,
    },
  };
  return isControlCommandLike(message) ? "never" : isControlShapedMessage(message) ? "unreliable" : "streams";
}
//@ chunk-fe6rs39h.js:88316-88593 placement
function describeForwardFailure(error) {
  if (error instanceof ControlRequestTimeoutError)
    return `the cloud session did not answer ${error.subtype} in time; it may still apply it`;
  let subtype = errorMessage(error);
  if (subtype.startsWith("[RemoteSessionManager]")) {
    logForDebugging(`[headlessCloudClient] forward failed: ${subtype}`);
    return "the cloud session is not connected";
  }
  return sanitizeCloudText(subtype);
}
//@ chunk-fe6rs39h.js:88593-88855 placement
var MAX_OUTBOX_ENTRIES = 100;
var STARTUP_WATCHDOG_MS = 120000;
var MAX_STARTUP_WAIT_MS = 300000;
var RETRY_DELAYS_MS = [400, 1200];
var CONTROL_TIMEOUT_MS = 5000;
var SEND_TIMEOUT_MS = 5000;
var POLL_MS = 1000;
var MIN_POLL_MS = 500;
var DRAIN_TIMEOUT_MS = 5000;
var DRAIN_DEADLINE_MS = DRAIN_TIMEOUT_MS - 250;
var FLUSH_TIMEOUT_MS = 850;
var FLUSH_DEADLINE_MS = FLUSH_TIMEOUT_MS - 100;
var CLOSE_GRACE_MS = 1000;
var CLIENT_CLOSING_REASON = "the cloud client is closing";
var EXIT_GRACE_MS = 5000;
var IDLE_EXIT_MS = 180000;
var REAL_CLOCK = {
  now: () => Date.now(),
  setTimeout: (callback, delayMs) => {
    let timer = setTimeout(callback, delayMs);
    return () => clearTimeout(timer);
  },
};
//@ chunk-fe6rs39h.js:88855-88879 placement
class ClientClosedError extends Error {}
//@ chunk-fe6rs39h.js:88879-88923 placement
/**
 * 启动无头云会话客户端并返回 done Promise（由 cloudPrint 与 openBareCloudSession 调用）。
 */
function runHeadlessCloudClient(options) {
  return {
    done: new HeadlessCloudClient(options).done,
  };
}
//@ chunk-fe6rs39h.js:88923-118745 placement
/**
 * 无头 --cloud 客户端主体：连接云会话、转发宿主 stdin 的 stream-json、处理控制请求/对话/权限、空闲释放与退出码。
 */
class HeadlessCloudClient {
  config;
  done;
  resolveDone = () => {};
  phase = "pre_session";
  clock;
  io;
  outbound;
  agentRequests;
  hostRequests;
  stopAwakeWatch = null;
  drained;
  inflight = new Set();
  unregisterCleanup;
  startedAt;
  workerReadyIdleMs;
  builtInNames;
  session = null;
  opened = null;
  openRequested = false;
  inputClosed = false;
  outputOpen = true;
  oauthBridgeInstalled = false;
  undeliveredKindsTold = new Set();
  frames = null;
  liveness = null;
  features = null;
  featureAbort = new AbortController();
  connectEpoch = 0;
  cancelIdleDeadline = null;
  inputClosedAt = null;
  containerStartFailed = false;
  hostDialogKinds = new Set();
  dialogsNotDeclaredCount = 0;
  dialogsReservedCount = 0;
  endLogged = false;
  requestedModeChecked = false;
  hostSentPermissionMode = false;
  everConnected = false;
  reconnectingTold = false;
  connection = "connecting";
  cancelReconnectNotice = null;
  workerInitializeReason = null;
  workerModesSeen = new Set();
  lastWorkerMode = undefined;
  inputFailed = false;
  signalled = false;
  transportClosed = null;
  sinceStop = new WeakSet();
  stoppedWhileLive = false;
  endingWith = null;
  preSessionEchoes = [];
  endsOnStartupResult = false;
  constructor(config) {
    this.config = config;
    this.clock = config.clock ?? REAL_CLOCK;
    this.workerReadyIdleMs = config.workerReadyIdleMs ?? STARTUP_WATCHDOG_MS;
    this.startedAt = this.clock.now();
    this.done = new Promise((resolve) => {
      this.resolveDone = resolve;
    });
    let inputStream = forwardUntilAbort(config.input, () => {
      this.inputFailed = true;
    });
    this.io = config.createIO
      ? config.createIO(inputStream, config.replayUserMessages)
      : new StructuredIO(inputStream, config.replayUserMessages);
    this.io.setUnexpectedResponseCallback(async (response) => {
      logForDebugging(
        `[headlessCloudClient] dropped control_response for unknown request ${sanitizeCloudText(truncateToLength(String(response.response?.request_id), 64))}`,
      );
    });
    let track = (promise) => this.track(promise);
    let emit = (frame) => this.emit(frame);
    let liveSession = () => (this.phase === "live" ? this.session : null);
    this.outbound = new OutboundMessageQueue(
      {
        clock: this.clock,
        replayUserMessages: config.replayUserMessages,
        emit,
        emitEcho: (echo, { duplicate }) => this.writeOwnEcho(echo, duplicate),
        track,
        liveSession,
        stampedSessionId: () => this.stampedSessionId,
        onSent: (sent, { duplicate }) => {
          if (sent.kind !== "message") return;
          this.liveness?.noteDelivered(sent.content);
          this.features?.noteMessageSent({
            uuid: sent.uuid,
            duplicate,
          });
          if (!duplicate)
            this.liveness?.noteSendOk({
              afterStop: !this.stoppedWhileLive || this.sinceStop.has(sent),
            });
        },
        onRepost: (repost) => {
          if (repost.kind === "message") this.sinceStop.add(repost);
        },
      },
      config.queueCap ?? MAX_OUTBOX_ENTRIES,
    );
    this.agentRequests = new HostPermissionBridge({
      clock: this.clock,
      io: this.io,
      track,
    });
    this.hostRequests = new ControlRequestRelay({
      clock: this.clock,
      initializePolicy: config.initializePolicy,
      ignoredOptionsCount: config.ignoredOptions.length,
      openingInitializeHonours: new Set([...(config.openingInitializeHonours ?? []), "supportedDialogKinds"]),
      outbound: this.outbound,
      emit,
      track,
      account: () => {
        let accountInformation = getAccountInformation();
        return {
          email: accountInformation?.email,
          organization: accountInformation?.organization,
          subscriptionType: accountInformation?.subscription,
          tokenSource: accountInformation?.tokenSource,
          apiKeySource: accountInformation?.apiKeySource,
          apiProvider: getAPIProvider(),
        };
      },
      openRequested: () => this.openRequested,
      requestOpen: (options) => this.requestOpen(options),
      sleepNotice: async (notice) => {
        this.stopAwakeWatch?.();
        this.stopAwakeWatch = null;
        if (notice === "will_sleep") {
          this.watchAwake(0, this.clock.now());
          await this.features?.noteHostSleep();
        } else this.hostWoke();
      },
      liveSession,
      pendingSeededPromptUuid: () =>
        this.phase === "awaiting_worker" && this.session?.opened.entry === "create"
          ? this.session.opened.initialPrompt?.uuid
          : undefined,
      interruptMattersBeforeLive: () => {
        let opened = this.opened;
        return opened !== null && (opened.entry === "attach" || opened.initialPrompt !== undefined);
      },
      end: (endRequest) =>
        void this.end(
          endRequest.reason,
          endRequest.reason === "rejected_options" ? endRequest.message : undefined,
          undefined,
          endRequest.reason === "end_session" && this.opened?.controlOnly === true
            ? endRequest.leftFor
            : undefined,
        ),
      stampedSessionId: () => this.stampedSessionId,
      onInterrupt: () => {
        if (this.phase === "live") {
          this.stoppedWhileLive = true;
          this.sinceStop = new WeakSet([...this.outbound.queuedMessages(), ...this.outbound.heldMessages()]);
        }
        this.liveness?.noteInterrupt();
      },
    });
    this.installOAuthBridge();
    this.drained = this.drainOutbound();
    this.readInput();
    this.unregisterCleanup = registerCleanup(() => this.closeFromSignal());
  }
  async closeFromSignal() {
    this.signalled = true;
    this.logEnded("signal", this.endingWith?.exitCode ?? 0, this.phase, this.endingWith?.disconnectCode);
    await this.tearDown(CLIENT_CLOSED_BEFORE_COMPLETE, "closed");
    await scheduleTimer(this.clock, this.settleOpener(FLUSH_DEADLINE_MS, "signal"), FLUSH_TIMEOUT_MS);
    this.outbound.abandonPostsInFlight(CLIENT_CLOSED_BEFORE_CONFIRMED);
    this.outbound.settleOwedEchoes();
  }
  settleOpener(deadlineMs, at) {
    return (this.opened?.settle?.(deadlineMs) ?? Promise.resolve(undefined)).then(
      (noticeInfo) => {
        if (!noticeInfo) return;
        logEvent("tengu_remote_headless_client_seed_cut_short", {
          at: fromEnum(at),
        });
        this.emit(
          cloudInformationalMessage(this.stampedSessionId, noticeInfo.level, clipCloudText(noticeInfo.text)),
        );
      },
      (error) => {
        logForDebugging(`[headlessCloudClient] settling the opener's work failed: ${errorMessage(error)}`);
      },
    );
  }
  initializeWorker(initializeRequest, manager) {
    let declaredKinds = [...this.hostDialogKinds].filter(
      (hostDialogKind) => !isConsentDialogKind(hostDialogKind),
    );
    let reason = openingControlRequest(initializeRequest, declaredKinds);
    this.workerInitializeReason = reason;
    if (reason === null) return;
    let request = {
      subtype: "initialize",
      ...(declaredKinds.length > 0 && {
        supportedDialogKinds: declaredKinds,
      }),
    };
    let logAttempt = (posted, attempt) => {
      logEvent("tengu_remote_headless_client_worker_initialize", {
        reason: fromEnum(reason),
        outcome: fromEnum(posted.outcome),
        ...("cause" in posted && {
          cause: fromEnum(posted.cause),
        }),
        ...("status" in posted && {
          status: posted.status,
        }),
        attempt,
        n_dialog_kinds: declaredKinds.length,
      });
    };
    let startedAt = this.clock.now();
    let attempt = async (attempt_2) => {
      let abortController = new AbortController();
      let posted = manager.postControlRequest(request, {
        answerExpected: false,
        background: true,
        timeoutMs: MAX_STARTUP_WAIT_MS,
        signal: abortController.signal,
      });
      posted.response.then(
        () => logForDebugging(`[headlessCloudClient] the worker took this client's initialize (${reason})`),
        (error) =>
          logForDebugging(
            `[headlessCloudClient] this client's initialize (${reason}) was not answered: ${sanitizeCloudText(truncateToLength(errorMessage(error), 200))}`,
          ),
      );
      let posted_2 = await posted.posted;
      logAttempt(posted_2, attempt_2);
      if (posted_2.outcome === "accepted") return;
      abortController.abort();
      let retryDelayMs = RETRY_DELAYS_MS[attempt_2 - 1];
      if (
        retryDelayMs !== undefined &&
        isRetryableHttpFailure(posted_2) &&
        this.clock.now() - startedAt < CONTROL_TIMEOUT_MS
      ) {
        await new Promise((resolve) => this.clock.setTimeout(resolve, retryDelayMs));
        if (!this.closing) return attempt(attempt_2 + 1);
      }
    };
    this.outbound.holdLaterSendsBehind(attempt(1));
  }
  async applyOpeningRequests(requests, manager) {
    for (let { request, required, describe } of requests)
      try {
        await manager.sendControlRequest(request);
        logEvent("tengu_remote_headless_client_opening_request", {
          subtype: fromEnum(request.subtype),
          outcome: fromEnum("applied"),
        });
      } catch (error) {
        logForDebugging(
          `[headlessCloudClient] opening request ${request.subtype} failed: ${sanitizeCloudText(truncateToLength(errorMessage(error), 200))}`,
        );
        logEvent("tengu_remote_headless_client_opening_request", {
          subtype: fromEnum(request.subtype),
          outcome: fromEnum(required ? "refused_required" : "refused_optional"),
        });
        if (required)
          throw new ClientClosedError(
            `Error: the cloud session did not accept ${describe}, so this attach was stopped rather than continue without it.`,
          );
        this.emit(
          cloudInformationalMessage(
            this.stampedSessionId,
            "warning",
            `The cloud session did not accept ${describe}; it keeps its own.`,
          ),
        );
      }
  }
  installOAuthBridge() {
    if (sdkHostOffersOAuthRefresh()) {
      setSdkOAuthTokenRefreshCallback(() => this.io.requestOAuthTokenRefresh());
      if (hostSessionsBearerOffered())
        setHostSessionsBearerSource({
          ask: () => this.io.requestHostSessionsBearer(),
          isSignInToken: isClaudeAISignInToken,
          hasSignIn: isClaudeAIOAuthTokenHostInjected,
        });
      this.oauthBridgeInstalled = true;
    }
  }
  async drainOutbound() {
    for await (let frame of this.io.outbound)
      try {
        await this.io.write(frame);
      } catch (error) {
        logError(error);
        this.end("output_failed", `failed to write to stdout: ${errorMessage(error)}`);
        return;
      }
  }
  emit(frame) {
    if (
      !this.outputOpen ||
      (this.endsOnStartupResult && frame.type !== "control_response" && !("startup_failure_reason" in frame))
    ) {
      logForDebugging(
        `[headlessCloudClient] dropped ${frame.type} frame ${this.outputOpen ? "because this launch ends on one start-up result" : "after stdout closed"}`,
      );
      return;
    }
    this.io.outbound.enqueue(frame);
  }
  track(promise) {
    this.inflight.add(promise);
    let onSettled = () => {
      this.inflight.delete(promise);
      this.detachIfDrained();
    };
    promise.then(onSettled, (error) => {
      logError(error);
      onSettled();
    });
    return promise;
  }
  async readInput() {
    try {
      for await (let frame of this.io.structuredInput)
        try {
          this.handleHostFrame(frame);
        } catch (error) {
          if (error instanceof AbortError)
            logForDebugging("[headlessCloudClient] host frame handling aborted");
          else logError(error);
        }
    } catch (error) {
      if (error instanceof AbortError) logForDebugging("[headlessCloudClient] stdin reading aborted");
      else logError(error);
      this.inputFailed = true;
    }
    if (this.inputFailed) this.agentRequests.cancelAll();
    this.inputClosed = true;
    this.inputClosedAt = this.clock.now();
    logForDebugging("[headlessCloudClient] stdin closed");
    if (!this.openRequested && this.phase === "pre_session") {
      this.end("stdin_eof", "no cloud session was created: the input closed with nothing to send to one");
      return;
    }
    this.detachIfDrained();
  }
  get closing() {
    return this.phase === "ending" || this.phase === "ended" || this.signalled;
  }
  handleHostFrame(frame) {
    if (this.closing) {
      this.refuseWhileClosing(frame);
      return;
    }
    switch (frame.type) {
      case "user":
        if (this.submitUserMessage(frame)) this.requestOpen(null);
        return;
      case "bash_command":
        if (this.submitBashCommand(frame)) this.requestOpen(null);
        return;
      case "control_request": {
        let isPermissionMode = controlRequestSubtype(frame) === "set_permission_mode";
        if (isPermissionMode) this.requestedModeChecked = true;
        if (this.hostRequests.handleControlRequest(frame) === "forwarded" && isPermissionMode)
          this.hostSentPermissionMode = true;
        return;
      }
      case "control_cancel_request":
        this.hostRequests.handleCancelRequest(frame);
        return;
      default:
        logForDebugging(`[headlessCloudClient] ignoring host ${frame.type} frame`);
    }
  }
  refuseWhileClosing(frame) {
    switch (frame.type) {
      case "user":
        this.submitUserMessage(frame);
        return;
      case "bash_command":
        this.submitBashCommand(frame);
        return;
      case "control_request": {
        let requestId = "request_id" in frame ? frame.request_id : undefined;
        if (typeof requestId === "string") this.emit(controlErrorResponse(requestId, CLIENT_CLOSING_REASON));
        return;
      }
      default:
        logForDebugging(`[headlessCloudClient] ignoring ${frame.type} frame while closing`);
    }
  }
  hostFrameUuid(frame) {
    if (!("uuid" in frame) || frame.uuid === undefined || frame.uuid === null) return;
    let uuid = normalizeUuidOrNull(frame.uuid);
    return uuid === null ? "invalid" : uuid.toLowerCase();
  }
  submitUserMessage(frame) {
    let uuid = this.hostFrameUuid(frame);
    let message = "message" in frame ? frame.message : undefined;
    let content =
      typeof message === "object" && message !== null && "content" in message ? message.content : undefined;
    if (uuid === "invalid") {
      this.emit(
        emitLoadError(this.stampedSessionId, [
          "Your message was not delivered to the cloud session: its uuid must be a UUID",
        ]),
      );
      return false;
    }
    if (typeof content !== "string" && !Array.isArray(content)) {
      this.emit(
        emitLoadError(
          this.stampedSessionId,
          [
            "Your message was not delivered to the cloud session: its content must be a string or content blocks",
          ],
          uuid,
        ),
      );
      return false;
    }
    if (
      Array.isArray(content) &&
      hasNonTextContent({
        message: {
          content,
        },
      })
    ) {
      this.emit(
        emitLoadError(
          this.stampedSessionId,
          [`Your message was not delivered to the cloud session: ${MALFORMED_CONTENT_BLOCKS_TEXT}`],
          uuid,
        ),
      );
      return false;
    }
    let userMessage = queuePriorityOrUndefined("priority" in frame ? frame.priority : undefined);
    let pastedContent = "pasted_content" in frame ? frame.pasted_content : undefined;
    let inlinePastes = "inline_pastes" in frame ? frame.inline_pastes : undefined;
    let messageContent = {
      pastedContent,
      inlinePastes,
      rows: [],
    };
    let rejected = {
      kind: "message",
      content,
      uuid: uuid ?? randomUUID(),
      ...(userMessage !== undefined && {
        priority: userMessage,
      }),
      ...(Array.isArray(messageContent.pastedContent) && {
        pastedContent: messageContent.pastedContent,
      }),
      ...(Array.isArray(messageContent.inlinePastes) && {
        inlinePastes: messageContent.inlinePastes,
      }),
    };
    let queued = this.outbound.submit(rejected);
    if (queued === "new" && !this.closing) this.sinceStop.add(rejected);
    if (queued === "new")
      messageContent.rows.forEach((decision) => logFeatureSad("sdk_pasted_content", decision));
    return true;
  }
  submitBashCommand(frame) {
    let uuid = this.hostFrameUuid(frame);
    let command = "command" in frame ? frame.command : undefined;
    let cwd = "cwd" in frame ? frame.cwd : undefined;
    let reject = (message) => {
      this.emit(emitLoadError(this.stampedSessionId, [message]));
      return false;
    };
    if (uuid === "invalid") return reject("bash_command was not run: its uuid must be a UUID");
    if (typeof command !== "string") return reject("bash_command was not run: it needs a string command");
    if (cwd !== undefined && typeof cwd !== "string")
      return reject("bash_command was not run: its cwd must be a string");
    this.outbound.submit({
      kind: "bash",
      command,
      ...(cwd !== undefined && {
        cwd,
      }),
      uuid: uuid ?? randomUUID(),
    });
    return true;
  }
  writeOwnEcho(echo, duplicate = false) {
    if (this.frames)
      this.frames.writeOwnEcho(echo, {
        duplicate,
      });
    else if (
      this.phase === "pre_session" &&
      this.preSessionEchoes.length < (this.config.queueCap ?? MAX_OUTBOX_ENTRIES)
    )
      this.preSessionEchoes.push(echo);
    else this.emit(echo);
  }
  releasePreSessionEchoes(frames) {
    this.preSessionEchoes.splice(0).forEach((preSessionEchoe) => {
      let stamped = {
        ...preSessionEchoe,
        session_id: this.stampedSessionId,
      };
      if (frames) frames.writeOwnEcho(stamped);
      else this.emit(stamped);
    });
  }
  requestOpen(initialize) {
    if (this.openRequested || this.phase !== "pre_session" || this.signalled) return;
    this.openRequested = true;
    this.hostDialogKinds = new Set(sanitizeStringList(initialize?.supportedDialogKinds));
    this.track(this.openSession(initialize));
  }
  async openSession(initialize) {
    let result;
    try {
      result = await this.config.openSession({
        initialize,
        signal: this.featureAbort.signal,
        dialogs: {
          kinds: this.hostDialogKinds,
          request: createHostDialogHandler({
            io: this.io,
            declaredKinds: this.hostDialogKinds,
            clock: this.clock,
          }),
        },
      });
    } catch (error) {
      logError(error);
      result = {
        kind: "failed",
        message: errorMessage(error),
      };
    }
    if (this.phase !== "pre_session" || this.signalled) {
      logForDebugging("[headlessCloudClient] session opened after the client ended; not attaching");
      if (result.kind === "opened") {
        logEvent("tengu_remote_headless_client_open_discarded", {
          entry: fromEnum(result.session.entry),
        });
        if (result.session.entry === "attach") result.session.preflightCheck?.catch(() => {});
        await result.session.dispose?.().catch((error) => {
          logForDebugging(`[headlessCloudClient] discarded session not released: ${errorMessage(error)}`);
        });
      }
      return;
    }
    if (result.kind === "failed") {
      this.failOpen(result.message, result.startupFailureReason);
      return;
    }
    try {
      this.attach(result.session);
    } catch (error) {
      logError(error);
      if (result.session.entry === "attach") result.session.preflightCheck?.catch(() => {});
      this.featureAbort.abort();
      this.features = null;
      await result.session.dispose?.().catch(() => {});
      this.failOpen(errorMessage(error));
    }
  }
  failOpen(message, reason) {
    this.endsOnStartupResult = reason !== undefined && isStartupFailureResultRequested();
    this.releasePreSessionEchoes(this.frames);
    this.frames?.close();
    this.outbound.close(message, "open_failed");
    if (this.endsOnStartupResult)
      this.emit(
        buildStartupFailureResult({
          sessionId: startupResultSessionId(getSessionId()),
          message: openSessionErrorMessage(message),
          reason,
        }),
      );
    this.end(reason === undefined ? "open_failed" : "start_refused", message);
  }
  attach(opened) {
    if (
      opened.entry === "create" &&
      opened.initialPrompt !== undefined &&
      opened.initialPrompt.uuid !== opened.initialPrompt.uuid.toLowerCase()
    )
      logForDebugging(
        "[headlessCloudClient] the seeded prompt uuid is not canonical lowercase; host redeliveries of it will not be recognised and will be sent again",
        {
          level: "warn",
        },
      );
    this.connectEpoch = this.clock.now();
    let sessionAddress = hashSessionAddress(toInfraSessionId(opened.sessionId));
    let frames = new CloudStreamFilter(
      {
        clock: this.clock,
        includePartialMessages: this.config.includePartialMessages,
        emit: (frame) => this.emit(frame),
        outbound: this.outbound,
        cloudSession: () => this.readCloudSession(),
        summaryLine: (info) => {
          let syncStatusFromRemote = buildSyncStatusFromRemote(info, undefined);
          return syncStatusFromRemote.projectFiles?.mark === "pending" ||
            noop_3(info) ||
            Object.values(this.features?.reports() ?? {}).some((report) => report.pending)
            ? ""
            : formatSyncStatusLine(syncStatusFromRemote);
        },
        onWorkerReady: (via) => this.markWorkerReady(via),
        onWorkerInit: (init) => this.features?.noteWorkerInit(init),
        onTurnInFlight: () => this.features?.noteTurnInFlight(),
        onTurnEnded: () => this.features?.noteTurnEnded(),
        onWorkerUp: (workerUp) => {
          this.features?.noteWorkerUp(workerUp);
          logEvent("tengu_remote_headless_client_worker_up", {
            generation: workerUp.generation,
            session_mode: fromEnumOpt(workerUp.sessionMode),
          });
        },
        onWorkerSessionId: (sessionId) => this.features?.noteSessionCleared(sessionId),
        onProvisioning: (provisioning, previous) => this.liveness?.noteProvisioning(provisioning, previous),
      },
      {
        entry: opened.entry,
        initialSessionId: sessionAddress,
        connectEpoch: this.connectEpoch,
        writesStatusBeforeInit: opened.controlOnly === true,
      },
    );
    this.frames = frames;
    this.guarded(() => opened.onDerivedSessionId(sessionAddress));
    opened.notices?.forEach((notice) =>
      this.emit(cloudInformationalMessage(this.stampedSessionId, notice.level, clipCloudText(notice.text))),
    );
    this.releasePreSessionEchoes(frames);
    let watchdog = new BootstrapWatchdog(
      {
        clock: this.clock,
        emit: (frame) => this.emit(frame),
        stampedSessionId: () => this.stampedSessionId,
        reconnect: () => this.session?.manager.reconnect(),
        queuedSendCount: () => this.outbound.queuedSendUuids().length,
        sessionId: opened.sessionId,
        essentialTrafficOnly: isEssentialTrafficOnly(),
        controlOnly: opened.controlOnly === true,
        api: {
          markSessionRead,
          updateSessionTitle,
        },
      },
      {
        titleFromFirstMessage: opened.entry === "create" && !opened.hasTitle,
      },
    );
    this.liveness = watchdog;
    let features = new HeadlessFeatureHandles();
    this.features = features;
    features.adopt(opened.featureHandles ?? []);
    features.onEachSettled(() => {
      if (!this.closing) {
        frames.offerSummary();
        frames.noteCloudSessionChanged();
      }
    });
    features.onEachReportChanged(() => {
      if (!this.closing) frames.noteCloudSessionChanged();
    });
    opened.onCloudSessionChanged?.(() =>
      this.guarded(() => {
        if (!this.closing) frames.noteCloudSessionChanged();
      }),
    );
    let hasSigner = opened.eventSigner === undefined ? false : undefined;
    opened.eventSigner?.then(
      (signer) => {
        hasSigner = signer !== undefined;
      },
      () => {
        hasSigner = false;
      },
    );
    let notedTrustAsk = new Set();
    let callbacks = features.callbacks({
      onMessage: (frame, meta = {}) => this.guarded(() => this.handleSessionFrame(frames, frame, meta)),
      onPermissionRequest: (request, requestId, context) =>
        this.guarded(() => {
          if (this.session !== null && this.phase !== "ending") {
            if (context?.reinstated === true) this.agentRequests.reinstate(requestId);
            let manager = this.session.manager;
            if (opened.controlOnly !== true && !normalizeCanUseToolRequest(request)) {
              logEvent("tengu_remote_headless_client_malformed_ask", {});
              manager.respondToPermissionRequest(requestId, parsePermissionRequest(request));
              return;
            }
            let isRepositoryTrust =
              isRepositoryTrustGateEnabled() && isConfirmRepositoryTrustTool(request.tool_name);
            let isComputerFolder =
              !isRepositoryTrust &&
              isServedCallWatchEnabled() &&
              isRequestComputerFolderTool(request.tool_name);
            if (isComputerFolder && !isComputerFolderTarget(request.input)) {
              logEvent("tengu_remote_headless_client_malformed_ask", {});
              if (opened.controlOnly !== true)
                manager.respondToPermissionRequest(requestId, parsePermissionRequest(request));
              return;
            }
            let proofState =
              isRepositoryTrust && opened.hostAnswersUnattended !== true
                ? deviceProofState(request, hasSigner)
                : undefined;
            if (proofState !== undefined) {
              logForDebugging(
                `[headlessCloudClient] not passing a repository-trust question to the host (${proofState})`,
                {
                  level: "warn",
                },
              );
              if (proofState === "proves_no_device") {
                watchdog.notePermissionRequestOpened(requestId);
                if (opened.controlOnly !== true && !notedTrustAsk.has(requestId)) {
                  notedTrustAsk.add(requestId);
                  this.emit(
                    cloudInformationalMessage(
                      this.stampedSessionId,
                      "notice",
                      REMOTE_TOOLS_CONSENT_TEXT["repository_trust.prompt.answer_elsewhere"](
                        getRemoteSessionUrl(opened.sessionId),
                      ),
                    ),
                  );
                }
              }
              return;
            }
            if (
              this.agentRequests.passPermissionRequest(
                {
                  respondToPermissionRequest: (id, answer) => {
                    try {
                      manager.respondToPermissionRequest(id, answer);
                    } finally {
                      watchdog.notePermissionRequestClosed(id);
                    }
                  },
                },
                isRepositoryTrust
                  ? toCanUseToolRequest(request)
                  : isComputerFolder
                    ? toServedPermissionRequest(request)
                    : request,
                requestId,
              )
            )
              watchdog.notePermissionRequestOpened(requestId);
          }
        }),
      onPermissionCancelled: (requestId) => {
        this.agentRequests.cancel(requestId);
        watchdog.notePermissionRequestClosed(requestId);
      },
      onUserDialogRequest: (request, requestId, context) =>
        this.guarded(() => {
          if (this.session === null || this.phase === "ending") return;
          if (isConsentDialogKind(request.dialog_kind)) {
            this.dialogsReservedCount++;
            logForDebugging(
              `[headlessCloudClient] not passing a ${sanitizeCloudText(truncateToLength(String(request.dialog_kind), 64))} dialog to the host: that kind is this client's own question, never the cloud session's`,
            );
            return;
          }
          if (!this.hostDialogKinds.has(request.dialog_kind)) {
            this.dialogsNotDeclaredCount++;
            let kind = sanitizeCloudText(truncateToLength(String(request.dialog_kind), 64));
            logForDebugging(
              `[headlessCloudClient] not passing a ${kind} dialog to the host: its initialize did not declare the kind`,
            );
            this.emit(
              cloudInformationalMessage(
                this.stampedSessionId,
                "notice",
                `The cloud session is waiting on a ${kind} dialog this host did not declare it can show; it continues when another client answers it or the session's dialog timeout passes.`,
              ),
            );
            return;
          }
          if (context?.reinstated === true) this.agentRequests.reinstate(requestId);
          this.agentRequests.passUserDialogRequest(this.session.manager, request, requestId);
        }),
      onUserDialogCancelled: (requestId) => this.agentRequests.cancel(requestId),
      onConnected: (info) =>
        this.guarded(() => {
          this.logStream("connected");
          let everConnected = this.everConnected;
          this.connection = "live";
          frames.noteCloudSessionChanged();
          this.features?.noteStreamConnected(info);
          this.everConnected = true;
          if (everConnected) this.recheckServeOnlyLink(opened);
          this.cancelReconnectNotice?.();
          this.cancelReconnectNotice = null;
          if (this.reconnectingTold) {
            this.reconnectingTold = false;
            this.emit(cloudInformationalMessage(this.stampedSessionId, "notice", "Reconnected."));
          }
        }),
      onReconnecting: () =>
        this.guarded(() => {
          this.logStream("reconnecting");
          this.connection = "reconnecting";
          frames.noteCloudSessionChanged();
          if (
            this.closing ||
            !this.everConnected ||
            this.reconnectingTold ||
            this.cancelReconnectNotice !== null
          )
            return;
          this.cancelReconnectNotice = this.clock.setTimeout(() => {
            this.cancelReconnectNotice = null;
            this.reconnectingTold = true;
            this.emit(
              cloudInformationalMessage(
                this.stampedSessionId,
                "notice",
                "Lost the connection to the cloud session \u2014 reconnecting\u2026",
              ),
            );
          }, SEND_TIMEOUT_MS);
        }),
      onCatchUpTruncated: () =>
        this.guarded(() => {
          frames.releaseHeld();
          this.requestedModeChecked = true;
          let missedEchoes = this.outbound.synthesizeMissedEchoes();
          this.logStream("catch_up_truncated", {
            missed_echoes: missedEchoes,
          });
          this.emit(
            cloudInformationalMessage(
              this.stampedSessionId,
              "warning",
              "Some earlier messages from this session could not be loaded after reconnecting.",
            ),
          );
        }),
      onToolHostEnded: (info) =>
        this.guarded(() => {
          if (opened.controlOnly !== true) {
            logForDebugging(
              "[headlessCloudClient] tool_host_ended ignored: this client is not a serve-only helper",
            );
            return;
          }
          if (info.reason === CONNECTION_EXPIRED && opened.resumeLinkHere !== undefined) {
            this.resumeServeOnlyLinkOrEnd(opened, info.reason);
            return;
          }
          this.end("tool_host_ended", sessionNoLongerUsesComputer(opened.sessionId, info.reason));
        }),
      onDisconnected: (reason) => {
        let disconnectReason = cloudDisconnectReason(reason);
        this.end("disconnected", cloudDisconnectMessage(disconnectReason), disconnectReason);
      },
      onResponseUndelivered: (response, kind, detail) =>
        this.guarded(() => {
          if (this.undeliveredKindsTold.has(kind)) return;
          if (this.undeliveredKindsTold.size === 0) queueMicrotask(() => this.undeliveredKindsTold.clear());
          this.undeliveredKindsTold.add(kind);
          this.emit(
            cloudInformationalMessage(
              this.stampedSessionId,
              "warning",
              formatUndeliveredAnswerNotice(kind, detail),
            ),
          );
        }),
      onError: (error) => logForDebugging(`[headlessCloudClient] stream error: ${error.message}`),
    });
    let homeSeed = features.homeSeed();
    let managerOptions = {
      sessionId: opened.sessionId,
      getAccessToken: opened.getAccessToken,
      consoleProfileBearer: opened.consoleProfileBearer,
      onAuth401: opened.onAuth401,
      orgUuid: opened.orgUuid,
      ...{},
      ...(opened.eventSigner && {
        eventSigner: opened.eventSigner,
      }),
      ...(homeSeed && {
        homeSeed,
        homeSeedHoldsFirstSend: opened.entry === "create",
      }),
      ...(opened.controlOnly === true && {
        controlOnly: true,
      }),
      trackSendsInFlight: true,
      keepUndeliveredResponses: true,
      nameToolOnPermissionAllow: true,
      rearmRedeliveredPermissionRequests: true,
      ignoreErrorShapedDialogReplies: true,
      nameRepositoryTrustAnswers: isRepositoryTrustGateEnabled(),
      pinComputerFolderAllow: isServedCallWatchEnabled,
      keepOwnModelSwitchBreadcrumb: true,
      keepStreamRedialling: opened.cloudSession().device.status === "bound",
      ...(opened.entry === "create"
        ? {
            initialPromptUuid: opened.initialPrompt?.uuid,
          }
        : {
            isAttachToExisting: true,
            initialSequenceNum: opened.initialSequenceNum ?? undefined,
            preflightCheck: opened.preflightCheck,
          }),
    };
    let manager = opened.createManager
      ? opened.createManager(managerOptions, callbacks)
      : new RemoteSessionManager(managerOptions, callbacks);
    let sendWait = features.sendWait();
    if (sendWait !== null)
      manager.addSendGate((gate) => Promise.race([sendWait(), gate.released, gate.withdrawn, gate.decided]), {
        onRelease: "send",
      });
    let dirSyncGate = opened.dirSync?.sync.sendGate?.bind(opened.dirSync.sync);
    if (dirSyncGate !== undefined)
      manager.addSendGate((gate) => dirSyncGate(gate), {
        onRelease: "withhold",
      });
    this.session = {
      manager,
      opened,
    };
    this.opened = opened;
    features.noteSession({
      sessionId: opened.sessionId,
      manager,
      clock: this.clock,
      ...(opened.controlOnly === true && {
        endServing: (leftFor) =>
          void (leftFor === "idle"
            ? this.end(
                "idle_released",
                `Cloud session ${opened.sessionId} ran nothing on this computer for its idle limit; letting it go. It can ask for this folder again.`,
                undefined,
                leftFor,
              )
            : this.end("end_session", undefined, undefined, leftFor)),
      }),
    });
    if (opened.entry === "create" && opened.initialPrompt)
      this.outbound.noteOwnUuid(opened.initialPrompt.uuid, opened.initialPrompt.content);
    let needsPreflight =
      opened.entry === "attach" &&
      (opened.preflightCheck !== undefined || (opened.openingRequests?.length ?? 0) > 0);
    this.phase = opened.entry === "create" || needsPreflight ? "awaiting_worker" : "live";
    manager.connect();
    let requestedPermissionMode = opened.entry === "create" ? opened.requestedPermissionMode : undefined;
    if (requestedPermissionMode !== undefined)
      this.outbound.holdLaterSendsBehind(
        syncRemotePermissionMode({
          manager,
          mode: requestedPermissionMode,
          surface: "headless",
          sessionId: opened.sessionId,
          superseded: () => this.session?.manager !== manager || this.hostSentPermissionMode,
          observedMode: () => this.lastWorkerMode,
          seededModeReported: () => this.workerModesSeen.has(requestedPermissionMode),
          linkDown: () => this.connection !== "live",
          onRefused: (gate) => this.outbound.holdLaterSendsBehind(gate),
          onGaveUp: (message) =>
            this.emit(cloudInformationalMessage(this.stampedSessionId, "warning", message)),
        }),
      );
    this.initializeWorker(opened, manager);
    let preflightDone = needsPreflight
      ? (opened.preflightCheck ?? Promise.resolve()).then(() =>
          this.applyOpeningRequests(opened.openingRequests ?? [], manager),
        )
      : undefined;
    watchdog.attachStatusFeeds([undefined, ...features.statusFeeds()], () => {
      if (!this.closing) {
        frames.offerSummary();
        frames.noteCloudSessionChanged();
      }
    });
    if (opened.entry === "create") watchdog.armStallWarning();
    if (this.phase === "live") watchdog.noteWorkerReady();
    preflightDone?.then(
      () => this.markWorkerReady("preflight"),
      (error) => {
        logForDebugging(
          `[headlessCloudClient] attach preflight failed: ${sanitizeCloudText(truncateToLength(errorMessage(error), 200))}`,
        );
        this.end(
          "disconnected",
          error instanceof ClientClosedError ? error.message : cloudDisconnectMessage("attach_rejected"),
          "attach_rejected",
        );
      },
    );
    let cloudSession = this.readCloudSession();
    let reports = features.reports();
    logEvent("tengu_remote_headless_client_started", {
      entry: fromEnum(opened.entry),
      device_status: fromEnumOpt(cloudSession?.device.status),
      sync_state: fromEnumOpt(cloudSession?.directory_sync.state),
      sync_reason: directorySyncReasonLabel(cloudSession?.directory_sync.reason),
      ignored_count: this.config.ignoredOptions.length,
      ...notAppliedCounts(cloudSession?.not_applied ?? []),
      replay_user_messages: this.config.replayUserMessages,
      include_partial_messages: this.config.includePartialMessages,
      initialize_policy: fromEnum(this.config.initializePolicy),
      has_dir_sync: false,
      has_home_seed: homeSeed !== undefined,
      worker_initialize: fromEnum(this.workerInitializeReason ?? "none"),
      machine_features: features.handles().length,
      ...Object.fromEntries(
        HEADLESS_FEATURE_NAMES.map((featureName) => [
          `feature_${featureName}`,
          fromEnumOpt(reports[featureName]?.state),
        ]),
      ),
      serving_state: fromEnumOpt(cloudSession?.serving?.state),
      serving_reason: fromEnumOpt(cloudSession?.serving?.reason),
      oauth_bridge: this.oauthBridgeInstalled,
    });
    if (this.phase === "live") this.goLive(manager);
    else if (opened.entry === "create") this.armIdleDeadline();
  }
  goLive(manager) {
    this.track(this.hostRequests.sendPendingInterrupt(manager).then(() => this.outbound.flush()));
    this.features?.noteWorkerLive();
  }
  recheckServeOnlyLink(opened) {
    let stillLinkedHere = opened.stillLinkedHere;
    if (opened.controlOnly !== true || stillLinkedHere === undefined) return;
    stillLinkedHere().then(
      async (stillLinked) => {
        if (stillLinked === false && !this.closing) await this.resumeServeOnlyLinkOrEnd(opened, undefined);
      },
      (error) => {
        logForDebugging(`[headlessCloudClient] re-reading the serve-only link threw: ${errorMessage(error)}`);
      },
    );
  }
  async resumeServeOnlyLinkOrEnd(opened, reason) {
    let resumeResult =
      this.servesSession() && !this.closing
        ? await opened.resumeLinkHere?.().catch(() => "stopped")
        : "stopped";
    if (this.closing) return;
    if (resumeResult === "resumed" && this.servesSession()) {
      this.guarded(() => this.session?.manager.reconnect());
      return;
    }
    this.end("tool_host_ended", sessionNoLongerUsesComputer(opened.sessionId, reason));
  }
  servesSession() {
    let state = this.readCloudSession()?.serving?.state;
    return state === "on" || state === "pending";
  }
  guarded(fn) {
    try {
      fn();
    } catch (error) {
      if (error instanceof AbortError)
        logForDebugging("[headlessCloudClient] session frame handling aborted");
      else logError(error);
    }
  }
  handleSessionFrame(frames, frame, meta) {
    this.liveness?.noteInbound(frame);
    if (frame.type === "result") {
      this.features?.noteReply(this.featureAbort.signal);
      if (!this.closing) frames.offerSummary();
    }
    if (frames.handle(frame, meta) && this.phase === "awaiting_worker" && this.opened?.entry === "create")
      this.armIdleDeadline();
    if (frame.type === "system" && "permissionMode" in frame) {
      let permissionMode = parsePermissionMode(frame.permissionMode);
      if (permissionMode !== undefined) {
        this.lastWorkerMode = permissionMode;
        this.workerModesSeen.add(permissionMode);
      }
    }
    if (frame.type === "system" && frame.subtype === "init") {
      this.checkRequestedPermissionMode(frame.permissionMode);
      this.logWorkerInit(frame);
    }
  }
  logWorkerInit(init) {
    try {
      this.builtInNames ??= new Set(this.config.builtInToolNames?.() ?? []);
    } catch (error) {
      this.builtInNames = new Set();
      logForDebugging(
        `[headlessCloudClient] built-in tool names could not be read: ${sanitizeCloudText(truncateToLength(errorMessage(error), 200))}`,
      );
    }
    logForDebugging(logCloudWorkerInit(init, this.builtInNames));
  }
  checkRequestedPermissionMode(mode) {
    if (this.requestedModeChecked) return;
    this.requestedModeChecked = true;
    let requestedPermissionMode =
      this.opened?.entry === "create" ? this.opened.requestedPermissionMode : undefined;
    if (requestedPermissionMode === undefined || typeof mode !== "string") return;
    let permissionMode = parsePermissionMode(mode);
    let appliedMode = permissionMode === undefined ? undefined : toExternalPermissionMode(permissionMode);
    if (appliedMode === requestedPermissionMode) return;
    let warning = `The cloud session did not apply the ${requestedPermissionMode} permission mode requested when it was created; it is in ${appliedMode ?? sanitizeCloudText(truncateToLength(mode, 24))} mode.`;
    this.emit(cloudInformationalMessage(this.stampedSessionId, "warning", warning));
    logEvent("tengu_remote_headless_client_mode_not_applied", {
      requested: fromEnum(requestedPermissionMode),
      actual: fromEnumOpt(appliedMode),
    });
    logForDebugging(`[headlessCloudClient] ${warning}`, {
      level: "warn",
    });
  }
  readCloudSession() {
    try {
      let info = this.opened?.cloudSession();
      let reports = this.features?.reports() ?? {};
      return info === undefined
        ? info
        : Object.assign(
            {},
            reports,
            ...Object.values(reports).map((report) => report.facts),
            {
              connection: this.connection,
            },
            info,
          );
    } catch (error) {
      if (error instanceof AbortError)
        logForDebugging("[headlessCloudClient] cloud_session snapshot aborted");
      else logError(error);
      return;
    }
  }
  get stampedSessionId() {
    return this.frames?.stampedSessionId ?? "";
  }
  markWorkerReady(via) {
    this.containerStartFailed ||= via === "step_failed";
    if (this.phase !== "awaiting_worker" || this.session === null) return;
    this.phase = "live";
    this.cancelIdleDeadline?.();
    this.cancelIdleDeadline = null;
    this.liveness?.noteWorkerReady();
    let queued = this.outbound.queuedCount;
    this.goLive(this.session.manager);
    logEvent("tengu_remote_headless_client_worker_ready", {
      via: fromEnum(via),
      wait_ms: this.clock.now() - this.connectEpoch,
      queued,
    });
  }
  armIdleDeadline() {
    this.cancelIdleDeadline?.();
    if (this.signalled) {
      this.cancelIdleDeadline = null;
      return;
    }
    this.cancelIdleDeadline = this.clock.setTimeout(() => {
      this.cancelIdleDeadline = null;
      this.markWorkerReady("idle_deadline");
    }, this.workerReadyIdleMs);
  }
  logStream(transition, fields = {}) {
    logEvent("tengu_remote_headless_client_stream", {
      transition: fromEnum(transition),
      ...fields,
    });
  }
  detachIfDrained() {
    if (
      !this.inputClosed ||
      this.phase === "pre_session" ||
      this.phase === "ending" ||
      this.phase === "ended" ||
      this.outbound.queuedCount > 0 ||
      this.outbound.isFlushing ||
      this.inflight.size > 0
    )
      return;
    this.end("stdin_eof");
  }
  hostWoke() {
    if (this.features?.noteHostWake() === true)
      this.guarded(() => this.session?.manager.reconnectAfterSuspend());
  }
  watchAwake(elapsedMs, since) {
    this.stopAwakeWatch = this.clock.setTimeout(() => {
      let now = this.clock.now();
      let awakeMs = now - since > EXIT_GRACE_MS * 2 ? 0 : elapsedMs + (now - since);
      if (awakeMs < IDLE_EXIT_MS) {
        this.watchAwake(awakeMs, now);
        return;
      }
      this.stopAwakeWatch = null;
      logFeatureSad("rtc_sleep_notice", "no_wake_word");
      this.hostWoke();
    }, EXIT_GRACE_MS);
  }
  closeTransport() {
    if (this.transportClosed !== null) return this.transportClosed;
    this.stopAwakeWatch?.();
    this.stopAwakeWatch = null;
    let session = this.session;
    if (session === null) {
      this.transportClosed = scheduleTimer(
        this.clock,
        this.liveness?.stop() ?? Promise.resolve(),
        POLL_MS,
      ).then(() => {});
      return this.transportClosed;
    }
    this.session = null;
    this.transportClosed = (async () => {
      await this.hostRequests.issuePendingInterrupt(session.manager).catch(() => {});
      await this.hostRequests.interruptIssued.catch(() => {});
      let stopped = scheduleTimer(this.clock, this.liveness?.stop() ?? Promise.resolve(), POLL_MS);
      await session.manager
        .releaseHeldSends(undefined, {
          exiting: true,
          final: true,
        })
        .catch(() => {});
      await session.manager.flushSends(CLOSE_GRACE_MS).catch(() => {});
      session.manager.disconnect();
      await stopped;
    })();
    return this.transportClosed;
  }
  async tearDown(reason, code, leftFor) {
    this.liveness?.halt();
    this.cancelIdleDeadline?.();
    this.cancelIdleDeadline = null;
    this.cancelReconnectNotice?.();
    this.cancelReconnectNotice = null;
    this.featureAbort.abort();
    this.releasePreSessionEchoes(this.frames);
    this.frames?.close();
    this.outbound.close(reason, code);
    this.outbound.answerForwardsInFlight(reason);
    this.agentRequests.cancelAll();
    await scheduleTimer(
      this.clock,
      this.features?.dispose(
        leftFor === undefined
          ? {}
          : {
              leftFor,
            },
      ) ?? Promise.resolve(),
      MIN_POLL_MS,
    );
    await this.closeTransport().catch((error) => {
      logForDebugging(`[headlessCloudClient] transport close failed: ${errorMessage(error)}`);
    });
    if (this.oauthBridgeInstalled) {
      setSdkOAuthTokenRefreshCallback(null);
      setHostSessionsBearerSource(null);
    }
  }
  logEnded(reason, exitCode, fromPhase, disconnectCode) {
    if (this.endLogged) return;
    this.endLogged = true;
    let stats = this.outbound.stats;
    let stats_2 = this.liveness?.stats;
    logEvent("tengu_remote_headless_client_ended", {
      reason: fromEnum(reason),
      exit_code: exitCode,
      ended_from: fromEnum(fromPhase),
      entry: fromEnumOpt(this.opened?.entry),
      disconnect_code: fromEnumOpt(disconnectCode),
      container_start_failed: this.containerStartFailed,
      duration_ms: this.clock.now() - this.startedAt,
      turns: this.frames?.turns ?? 0,
      sends: stats.sends,
      forwarded: stats.forwards,
      passed_through: this.agentRequests.settledCount,
      dialogs_not_declared: this.dialogsNotDeclaredCount,
      dialogs_reserved_dropped: this.dialogsReservedCount,
      max_queue: stats.maxQueued,
      max_held_for_init: this.frames?.maxHeld ?? 0,
      session_id_changes: this.frames?.counts.sessionIdChanges ?? 0,
      peer_content_omitted: this.frames?.counts.peerContentOmitted ?? 0,
      peer_documents_as_text: this.frames?.counts.peerDocumentsAsText ?? 0,
      peer_tool_use_omitted: this.frames?.counts.peerToolUseOmitted ?? false,
      cloud_session_keys_dropped: this.frames?.counts.cloudSessionKeysDropped ?? 0,
      tags_reserved_dropped: this.frames?.counts.reservedTagsDropped ?? 0,
      proto_members_dropped: this.frames?.counts.protoMembersDropped ?? 0,
      service_events_dropped: this.frames?.counts.serviceEventsDropped ?? 0,
      unknown_frames_dropped: this.frames?.counts.unknownFramesDropped ?? 0,
      peer_frames_dropped_before_init: this.frames?.counts.peerFramesDroppedBeforeInit ?? 0,
      results_before_init: this.frames?.counts.resultsBeforeInit ?? 0,
      input_failed: this.inputFailed,
      watchdog_fires: stats_2?.watchdog_fires ?? 0,
      title: fromEnum(stats_2?.title ?? "not_applicable"),
      lines_written: stats_2?.lines_written ?? 0,
      lines_tagged: stats_2?.lines_tagged ?? 0,
      lines_suppressed: stats_2?.lines_suppressed ?? 0,
      eof_to_end_ms: this.inputClosedAt === null ? undefined : this.clock.now() - this.inputClosedAt,
    });
    if (this.containerStartFailed) logFeatureBad("remote_headless_client", "container_start_failed");
    else if (reason === "start_refused") logFeatureSad("remote_headless_client", reason);
    else if (exitCode !== 0) logFeatureBad("remote_headless_client", reason);
    else if (this.inputFailed) logFeatureSad("remote_headless_client", "input_failed");
    else logFeatureOk("remote_headless_client");
  }
  async end(reason, message, reasonCode, leftFor) {
    if (this.phase === "ending" || this.phase === "ended") return;
    let disconnectCode =
      reason === "disconnected" ? (reasonCode ?? cloudDisconnectReason(undefined)) : undefined;
    let exitInfo = exitForReason(reason, message, disconnectCode);
    let exitCode = exitInfo.exitCode;
    let phase = this.phase;
    this.phase = "ending";
    this.endingWith = {
      exitCode,
      disconnectCode,
    };
    try {
      await this.tearDown(
        reason === "disconnected" ? "the cloud session disconnected" : CLIENT_CLOSED_BEFORE_COMPLETE,
        reason === "disconnected" ? "disconnected" : "closed",
        leftFor,
      );
      await scheduleTimer(
        this.clock,
        Promise.allSettled([...this.inflight, this.settleOpener(DRAIN_DEADLINE_MS, "end")]),
        DRAIN_TIMEOUT_MS,
      );
      this.outbound.abandonPostsInFlight(CLIENT_CLOSED_BEFORE_CONFIRMED);
      this.outbound.settleOwedEchoes();
    } catch (error) {
      if (error instanceof AbortError) logForDebugging("[headlessCloudClient] teardown aborted");
      else logError(error);
      await this.closeTransport().catch(() => {});
    }
    this.logEnded(reason, exitCode, phase, disconnectCode);
    this.outputOpen = false;
    this.io.outbound.done();
    await this.drained;
    this.phase = "ended";
    this.unregisterCleanup();
    this.resolveDone(exitInfo);
  }
}
//@ chunk-fe6rs39h.js:118745-118773 placement
var CONNECTION_EXPIRED = "connection expired";
//@ chunk-fe6rs39h.js:118773-118910 placement
function sessionNoLongerUsesComputer(sessionId, detail) {
  let suffix =
    detail === undefined || detail === "" ? "" : ` (${sanitizeCloudText(truncateToLength(detail, 64))})`;
  return `Cloud session ${sessionId} no longer uses this computer${suffix}; stopping.`;
}
//@ chunk-fe6rs39h.js:118910-119007 placement
async function* forwardUntilAbort(source, onAbort) {
  try {
    for await (let value of source) yield value;
  } catch (error) {
    if (!(error instanceof AbortError)) logError(error);
    onAbort();
  }
}
//@ chunk-fe6rs39h.js:119007-119178 placement
function openingControlRequest(openResult, declaredKinds) {
  if (openResult.entry === "create")
    return openResult.initialPrompt === undefined && declaredKinds.length > 0 ? "declare_dialog_kinds" : null;
  return openResult.workerAwaitsAnswer === true ? "rearm_parked_prompt" : null;
}
//@ chunk-fe6rs39h.js:119178-119288 placement = isHTTPConfig (1)
function isRetryableHttpFailure(config) {
  return (
    config.outcome === "failed" &&
    config.cause === "http" &&
    (config.status >= 500 || config.status === 429 || config.status === 408)
  );
}
//@ chunk-fe6rs39h.js:119288-119963 placement
function exitForReason(reason, failure, context) {
  let fallback = context ?? cloudDisconnectReason(undefined);
  switch (reason) {
    case "stdin_eof":
    case "end_session":
      return failure === undefined
        ? {
            exitCode: 0,
            reason,
          }
        : {
            exitCode: 0,
            reason,
            message: failure,
          };
    case "tool_host_ended":
    case "idle_released":
      return {
        exitCode: 0,
        reason,
        message: clipCloudText(failure ?? reason),
      };
    case "disconnected":
      return {
        exitCode: 1,
        reason,
        disconnectCode: fallback,
        message: sanitizeCloudText(failure ?? cloudDisconnectMessage(fallback)),
      };
    case "rejected_options":
      return {
        exitCode: 1,
        reason,
        message: clipCloudText(failure ?? reason),
      };
    case "open_failed": {
      let message = clipCloudText(failure ?? "") || "Unable to open the cloud session";
      return {
        exitCode: 1,
        reason,
        message: message.startsWith("Error: ") ? message : `Error: ${message}`,
      };
    }
    case "start_refused":
      return {
        exitCode: 1,
        reason,
        message: openSessionErrorMessage(failure),
      };
    case "output_failed":
      return {
        exitCode: 1,
        reason,
        message: sanitizeCloudText(failure ?? reason),
      };
  }
}
//@ chunk-fe6rs39h.js:119963-120032 placement
function openSessionErrorMessage(failure) {
  return clipCloudText(failure ?? "") || "Unable to open the cloud session";
}
//@ chunk-fe6rs39h.js:120032-120153 placement
function controlRequestSubtype(frame) {
  let request = "request" in frame ? frame.request : undefined;
  return typeof request === "object" && request !== null && "subtype" in request
    ? request.subtype
    : undefined;
}
//@ chunk-fe6rs39h.js:120153-120323 placement
function notAppliedCounts(entries) {
  return {
    not_applied_lost: count(entries, ({ kind }) => kind === "lost"),
    not_applied_kept: count(entries, ({ kind }) => kind === "kept"),
    not_applied_preference: count(entries, ({ kind }) => kind === "preference"),
  };
}
//@ chunk-fe6rs39h.js:120323-120577 placement
var DIR_SYNC_OFF_REASONS = [
  "not_seeded",
  "not_opted_in",
  "lookup_failed",
  "seeded_elsewhere",
  "engine_declined",
  "engine_unavailable",
  "created_empty_unfilled",
  "store_read_fault",
  "device_key_unavailable",
  "not_granted",
  "preflight_failed",
  "no_container_origin",
  "folder_too_large",
];
//@ chunk-fe6rs39h.js:120577-120657 placement
function directorySyncReasonLabel(reason) {
  if (reason === undefined) return;
  return fromEnumOpt(DIR_SYNC_OFF_REASONS.find((limitReason) => limitReason === reason)) ?? lit("engine");
}
export { runHeadlessCloudClient };

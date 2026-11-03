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
import { u, array, string } from "../../../vendor/zod/v4/classic/schemas.js";
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
      let e = this.ports.queuedSendCount();
      if (e === 0) {
        this.armStallWarning();
        return;
      }
      logEvent("tengu_remote_headless_client_bootstrap_stalled", {
        queued: e,
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
  attachStatusFeeds(e, n) {
    let s = ({ line, level, notice }) => {
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
    for (let r of e) {
      if (r === undefined) continue;
      this.unsubscribeStatus = [
        ...this.unsubscribeStatus,
        r.subscribe((h) => {
          s(h);
          n?.();
        }),
      ];
      r.takeBacklog().forEach(s);
    }
  }
  noteProvisioning(e, n) {
    let last = e.steps.findLast(
      (step) =>
        step.status === "running" &&
        isSetupStep(step.id) &&
        n?.steps.find((step_2) => step_2.id === step.id)?.status !== "running",
    );
    if (last !== undefined) {
      let y = setupStepLabel(last, completedSetupMode(e));
      if (y !== this.lastProvisioningLine) {
        this.lastProvisioningLine = y;
        this.line("notice", `${y}\u2026`);
      }
    }
    let any = e.steps.some((step) => step.status === "failed");
    let h = n?.steps.some((step) => step.status === "failed") ?? false;
    if (any && !h) {
      if (!this.workerReady) {
        this.cancelStall?.();
        this.cancelStall = null;
        this.line("warning", "The cloud session failed to start.");
      }
      return;
    }
    if (e.terminal && !(n?.terminal ?? false)) {
      this.lastProvisioningLine = "";
      this.line("notice", setupReadySummary(e));
    }
  }
  noteDelivered(e) {
    this.maybeTitle(e);
  }
  noteSendOk({ afterStop }) {
    if (this.ports.controlOnly || !this.workerReady || this.stopped || !afterStop) return;
    this.armWatchdog();
  }
  noteInbound(e) {
    this.clearWatchdog();
    if (e.type === "system" && e.subtype === "status") this.compacting = e.status === "compacting";
    else if (e.type === "result" || (e.type === "system" && e.subtype === "compact_boundary"))
      this.compacting = false;
  }
  notePermissionRequestOpened(e) {
    this.watchdog.requestOpened(e);
  }
  notePermissionRequestClosed(e) {
    this.watchdog.requestClosed(e);
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
    this.unsubscribeStatus.forEach((h) => h());
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
        (n) => this.ports.clock.setTimeout(n, responseTimeoutMs(this.compacting)),
      )
    )
      this.line("notice", WAITING_FOR_ANSWER_NOTICE);
  }
  clearWatchdog() {
    this.watchdog.clear();
  }
  maybeTitle(e) {
    if (this.stopped || !this.options.titleFromFirstMessage || this.title !== "none") return;
    if (this.ports.essentialTrafficOnly) {
      this.title = "skipped";
      return;
    }
    let n =
      typeof e === "string"
        ? e
        : e
            .flatMap((r) =>
              typeof r === "object" && r !== null && r.type === "text" && typeof r.text === "string"
                ? [r.text]
                : [],
            )
            .join(" ");
    let s = truncateToWidth(
      sanitizeCloudText(truncateToLength(n, STALL_LINE_MAX_CHARS)),
      STALL_LINE_MAX_WIDTH,
    );
    if (s === "") {
      this.title = "skipped";
      return;
    }
    this.title = "set";
    this.titleSet = this.ports.api
      .updateSessionTitle(this.ports.sessionId, s)
      .catch(() => false)
      .then((r) => {
        if (!r) this.title = "failed";
      });
  }
  line(e, n, s) {
    if (this.stopped) return;
    let r = sanitizeCloudText(n);
    if (r === "") return;
    let h = this.ports.clock.now();
    if (
      this.lastLine !== null &&
      this.lastLine.level === e &&
      this.lastLine.text === r &&
      h - this.lastLine.at < STALL_LINE_FRESHNESS_MS
    ) {
      this.linesSuppressed += 1;
      return;
    }
    this.lastLine = {
      level: e,
      text: r,
      at: h,
    };
    this.linesWritten += 1;
    if (s !== undefined) this.linesTagged += 1;
    this.ports.emit(cloudInformationalMessage(this.ports.stampedSessionId(), e, r, s));
  }
}
//@ chunk-fe6rs39h.js:66082-66141 placement
function scheduleTimer(clock, n, s) {
  return withDeadline(n, s, (r, h) => clock.setTimeout(r, h));
}
//@ chunk-fe6rs39h.js:66141-66240 placement
var HOST_SLEEP_NOTICE = "host_sleep_notice";
var RECEIPT_ORDER_TIMEOUT_MS = 3000;
var MAX_CANCELLED_IDS_ECHOED = 256;
var thinClientInterruptReplySchema = DoctorLazy(() =>
  u({
    cancelled: array(string()).optional().catch(undefined),
  }),
);
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
  handleControlRequest(e) {
    let requestId = "request_id" in e ? e.request_id : undefined;
    let request = "request" in e ? e.request : undefined;
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
    let h = request;
    let { route, telemetrySubtype } = routeHostedControlRequest(h, {
      strict: this.ports.initializePolicy === "strict",
    });
    switch (route.kind) {
      case "reject":
        this.ports.emit(controlErrorResponse(requestId, route.error));
        this.log(telemetrySubtype, "rejected");
        return "rejected";
      case "forward": {
        let w = this.ports.outbound.submit({
          kind: "control",
          request: h,
          hostRequestId: requestId,
          holdsLaterSends: route.holdsLaterSends,
          telemetrySubtype,
        });
        this.ports.requestOpen(null);
        return w === "refused" ? "rejected" : "forwarded";
      }
      case "local":
        switch (route.handler) {
          case "initialize":
            this.handleInitialize(requestId, h);
            return "local";
          case "interrupt":
            this.handleInterrupt(requestId, h);
            this.ports.requestOpen(null);
            return "local";
          case "end_session":
            this.ports.emit(controlSuccessResponse(requestId, {}));
            this.ports.end({
              reason: "end_session",
              ...("reason" in h &&
                h.reason === RELEASED && {
                  leftFor: "released",
                }),
            });
            this.log("end_session", "local");
            return "local";
          case "cancel_async_message":
            this.handleCancelAsyncMessage(requestId, h);
            this.ports.requestOpen(null);
            return "local";
        }
    }
  }
  handleCancelRequest(e) {
    this.ports.outbound.cancelForward("request_id" in e ? e.request_id : undefined);
  }
  handleInitialize(e, n) {
    let s = !this.ports.openRequested();
    let {
      hooks,
      sdkMcpServers,
      sdkMcpServerConfigs,
      sdkMcpServerManifests,
      sdkMcpServerManifestsOrigin,
      workspaceTrust,
      ...k
    } = n;
    let I = SDKInitializeInitializeMessageSchema().safeParse(k);
    let O = lostSdkFeatures(
      n,
      this.ports.initializePolicy,
      s && I.success ? this.ports.openingInitializeHonours : undefined,
    );
    if (O.outcome !== "reject" && s && !I.success && this.ports.initializePolicy === "strict") {
      this.ports.emit(
        controlErrorResponse(
          e,
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
    if (O.outcome === "reject") {
      this.ports.emit(controlErrorResponse(e, O.error));
      if (s)
        this.ports.end({
          reason: "rejected_options",
          message: O.error,
        });
      this.log("initialize", "rejected");
      return;
    }
    this.ports.emit(
      controlSuccessResponse(e, {
        ...createEmptyInitializeResponse(this.ports.account()),
        ...(O.ignored.includes("hooks") && {
          hooks_applied: false,
        }),
        ...(O.ignored.includes("plugins") && {
          plugins_applied: false,
        }),
      }),
    );
    if (!I.success)
      logForDebugging(
        "[headlessCloudClient] initialize did not match its schema; opening the session without host options",
      );
    this.ports.requestOpen(I.success ? I.data : null);
    logEvent("tengu_remote_headless_client_host_request", {
      subtype: fromEnum("initialize"),
      outcome: fromEnum("local"),
      ignored_count: O.ignored.length + this.ports.ignoredOptionsCount,
    });
  }
  handleInterrupt(e, n) {
    let s = "cancel_queued" in n && n.cancel_queued === true;
    let r = this.ports.pendingSeededPromptUuid();
    let cancelled = s ? this.ports.outbound.withdrawQueuedSends() : [];
    let stillQueued = [
      ...(r === undefined ? [] : [r]),
      ...this.ports.outbound.sendUuidsInFlight(),
      ...(s ? [] : this.ports.outbound.queuedSendUuids()),
    ];
    if (!(n.subtype === "interrupt" && isImmediateInterruptRequest(n))) this.ports.onInterrupt?.();
    this.ports.emit(
      controlSuccessResponse(
        e,
        s
          ? {
              still_queued: stillQueued,
              cancelled,
            }
          : {
              still_queued: stillQueued,
            },
      ),
    );
    let S = n;
    if (n.subtype === "interrupt") {
      let { for_user_message_uuids: forUserMessageUuids, worker_epoch: workerEpoch, ...I } = n;
      S =
        typeof I.message_uuid === "string"
          ? {
              ...I,
              message_uuid: I.message_uuid.toLowerCase(),
            }
          : I;
    }
    let w = this.ports.liveSession();
    if (w === null) {
      this.pendingInterrupt = normalizeInterruptRequest(this.pendingInterrupt, S);
      this.log("interrupt", "queued");
      return;
    }
    this.dispatchInterrupt(w.manager, S);
    this.log("interrupt", "forwarded");
  }
  async sendPendingInterrupt(e) {
    let n = this.takePendingInterrupt();
    if (n === null) return;
    this.dispatchInterrupt(e, n);
    let s = scheduleTimer(
      this.ports.clock,
      this.lastReceiptAfterIssue().catch(noopCallback),
      RECEIPT_ORDER_TIMEOUT_MS,
    );
    this.ports.outbound.holdLaterSendsBehind(s);
    await s;
  }
  async issuePendingInterrupt(e) {
    let n = this.takePendingInterrupt();
    if (n === null) return;
    this.dispatchInterrupt(e, n);
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
  dispatchInterrupt(e, n) {
    let s = this.ports.clock.now();
    let r = !("cancel_queued" in n && n.cancel_queued === true);
    let h = n;
    if (!r && n.subtype === "interrupt") {
      let { send_now: sendNow, message_uuid: messageUuid, ...w } = n;
      h = w;
    }
    this.issued = this.ports.track(
      e
        .releaseHeldSends(undefined, {
          keepWithheld: r,
        })
        .then(
          () => {
            this.lastReceipt = e.sendControlRequest(h).then(
              (y) => {
                this.logInterruptReceipt("ok", s, this.announceSweptByWorker(y));
              },
              (error) => {
                let S = classifyControlRequestError(error) === "not_connected";
                this.logInterruptReceipt(S ? "not_sent" : "error", s);
              },
            );
          },
          (error) => {
            logForDebugging(`[headlessCloudClient] interrupt not dispatched: ${errorMessage(error)}`);
            this.logInterruptReceipt("not_sent", s);
          },
        ),
    );
    this.ports.outbound.holdLaterSendsBehind(this.issued);
  }
  logInterruptReceipt(e, n, s) {
    logEvent("tengu_remote_headless_client_interrupt_receipt", {
      outcome: fromEnum(e),
      latency_ms: this.ports.clock.now() - n,
      ...(s !== undefined && {
        swept_announced: s,
      }),
    });
  }
  announceSweptByWorker(e) {
    let cancelled =
      parseThinClientReply("interrupt", thinClientInterruptReplySchema(), e ?? {})?.cancelled ?? [];
    let sliced = uniq(cancelled)
      .filter((r) => normalizeUuidOrNull(r) !== null && !this.announcedCancelled.has(r))
      .slice(0, MAX_CANCELLED_IDS_ECHOED);
    sliced.forEach((r) => {
      this.announcedCancelled.add(r);
      try {
        this.ports.emit({
          type: "command_lifecycle",
          command_uuid: r,
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
  handleCancelAsyncMessage(e, n) {
    let s =
      n.subtype === "cancel_async_message" && typeof n.message_uuid === "string"
        ? {
            ...n,
            message_uuid: n.message_uuid.toLowerCase(),
          }
        : n;
    let messageUuid = "message_uuid" in s ? s.message_uuid : undefined;
    if (this.ports.outbound.withdrawQueuedSend(messageUuid)) {
      this.ports.emit(
        controlSuccessResponse(e, {
          cancelled: true,
        }),
      );
      this.log("cancel_async_message", "local");
      return;
    }
    this.ports.outbound.submit({
      kind: "control",
      request: s,
      hostRequestId: e,
      holdsLaterSends: false,
      telemetrySubtype: "cancel_async_message",
    });
  }
  log(e, n) {
    logEvent("tengu_remote_headless_client_host_request", {
      subtype: fromEnum(e),
      outcome: fromEnum(n),
    });
  }
}
//@ chunk-fe6rs39h.js:72711-72726 placement
function noopCallback() {}
//@ chunk-fe6rs39h.js:72726-73036 placement
function normalizeInterruptRequest(pendingInterrupt, n) {
  if (n.subtype !== "interrupt") return n;
  let s =
    pendingInterrupt !== null &&
    "cancel_queued" in pendingInterrupt &&
    pendingInterrupt.cancel_queued === true;
  let r =
    pendingInterrupt !== null && !("send_now" in pendingInterrupt && pendingInterrupt.send_now === true);
  let { message_uuid: messageUuid, ...y } = n;
  let { send_now: sendNow, ...w } = y;
  let R =
    pendingInterrupt === null ||
    ("message_uuid" in pendingInterrupt ? pendingInterrupt.message_uuid : undefined) === messageUuid;
  let k = r ? w : R ? n : y;
  return s
    ? {
        ...k,
        cancel_queued: true,
      }
    : k;
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
  phaseOf(e) {
    return this.entries.get(e)?.phase;
  }
  wasTaken(e) {
    let n = this.phaseOf(e);
    return n === "queued" || n === "posting" || n === "delivered" || n === "seeded";
  }
  seed(e, n, s) {
    let r = this.entries.get(e);
    let h =
      r !== undefined && r.owed > 0 && r.content !== undefined
        ? [
            {
              uuid: e,
              content: r.content,
            },
          ]
        : [];
    let y = s && n !== undefined;
    return [
      ...this.set(e, {
        kind: "message",
        phase: "seeded",
        content: n ?? r?.content,
        stored: y ? n : undefined,
        owed: this.replay && !y ? 1 : 0,
        pendingEchoes: y ? 0 : 1,
        delivered: true,
        echoMayBeLost: false,
        hadBefore: false,
      }),
      ...h,
      ...(y && this.replay
        ? [
            {
              uuid: e,
              content: n,
            },
          ]
        : []),
    ];
  }
  accept(e, n, content) {
    let r = this.entries.get(e);
    let h = this.replay && n === "message" ? 1 : 0;
    this.entries.delete(e);
    return this.set(e, {
      kind: n,
      phase: "queued",
      content,
      stored: undefined,
      owed: (r?.owed ?? 0) + h,
      pendingEchoes: r?.pendingEchoes ?? 0,
      delivered: false,
      echoMayBeLost: r?.echoMayBeLost ?? false,
      hadBefore: false,
    });
  }
  withdraw(e) {
    let n = this.entries.get(e);
    if (n === undefined) return true;
    if (n.phase === "posting") {
      n.pendingEchoes = Math.max(0, n.pendingEchoes - 1);
      if (n.delivered) {
        n.phase = "delivered";
        return false;
      }
    }
    n.phase = "withdrawn";
    n.owed = Math.max(0, n.owed - 1);
    return true;
  }
  giveUp(e) {
    let n = this.entries.get(e);
    if (n === undefined)
      return {
        echo: false,
      };
    n.phase = "given_up";
    return {
      echo: this.takeOwed(n),
    };
  }
  postStart(e) {
    let n = this.entries.get(e);
    if (n === undefined) return;
    n.phase = "posting";
    if (n.kind === "message") n.pendingEchoes += 1;
  }
  hadBefore(e) {
    return this.entries.get(e)?.hadBefore ?? false;
  }
  postOk(e, n) {
    let s = this.entries.get(e);
    if (s === undefined)
      return {
        echo: false,
      };
    s.phase = "delivered";
    s.delivered = true;
    if (n === "duplicate") s.hadBefore = true;
    if (n === "never") s.pendingEchoes = 0;
    if (n !== "streams") s.stored ??= s.content;
    return n !== "streams" || s.echoMayBeLost
      ? {
          echo: this.takeOwed(s),
        }
      : {
          echo: false,
        };
  }
  postFail(e, n) {
    let s = this.entries.get(e);
    if (s === undefined)
      return {
        echo: false,
        error: true,
      };
    if (s.delivered) {
      s.phase = "delivered";
      return {
        echo: false,
        error: false,
      };
    }
    s.phase = "failed";
    if (!n) s.pendingEchoes = Math.max(0, s.pendingEchoes - 1);
    return {
      echo: this.takeOwed(s),
      error: true,
    };
  }
  streamEcho(e, n) {
    let s = this.entries.get(e);
    if (s === undefined || s.kind !== "message")
      return {
        verdict: "not_own",
        dequeue: false,
      };
    if (s.pendingEchoes > 0) {
      s.pendingEchoes = 0;
      s.echoMayBeLost = false;
      s.stored = n;
      let dequeue = s.phase === "queued";
      s.delivered = true;
      if (s.phase !== "posting" && s.phase !== "seeded") s.phase = "delivered";
      if (s.owed > 0) {
        s.owed -= 1;
        return {
          verdict: "claim",
          sent: s.content,
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
        s.delivered && s.owed === 0 && s.stored !== undefined && isDeepStrictEqual(n, s.stored)
          ? "consume"
          : "peer",
      dequeue: false,
    };
  }
  settleOwed() {
    return [...this.entries].flatMap(([e, n]) => {
      if ((n.phase !== "delivered" && n.phase !== "seeded") || n.owed === 0 || n.content === undefined)
        return [];
      n.owed -= 1;
      return [
        {
          uuid: e,
          content: n.content,
        },
      ];
    });
  }
  truncation() {
    return [...this.entries].flatMap(([e, n]) => {
      if (n.pendingEchoes === 0) return [];
      n.echoMayBeLost = true;
      if (n.owed === 0 || n.content === undefined) return [];
      n.owed -= 1;
      return [
        {
          uuid: e,
          content: n.content,
        },
      ];
    });
  }
  takeOwed(e) {
    if (e.owed === 0) return false;
    e.owed -= 1;
    return true;
  }
  set(e, n) {
    let s = !this.entries.has(e) && this.entries.size >= this.cap ? this.evictOne() : [];
    this.entries.set(e, n);
    return s;
  }
  evictOne() {
    let e = (w) => w.phase === "queued" || w.phase === "posting";
    let n = (w) => !e(w) && w.owed === 0 && w.pendingEchoes === 0;
    let s = (w) => !e(w) && w.owed === 0;
    let r = (w) => !e(w);
    let h = this.oldestWhere(n) ?? this.oldestWhere(s) ?? this.oldestWhere(r);
    if (h === null) return [];
    let [y, S] = h;
    this.entries.delete(y);
    return S.owed > 0 && S.content !== undefined
      ? [
          {
            uuid: y,
            content: S.content,
          },
        ]
      : [];
  }
  oldestWhere(e) {
    return [...this.entries].find(([, n]) => e(n)) ?? null;
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
  constructor(e, n) {
    this.ports = e;
    this.queueCap = n;
    this.ledger = new OutboundMessageLedger(n * 4 + 8, e.replayUserMessages);
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
  noteOwnUuid(e, n) {
    this.queue = this.queue.filter((s) => s.kind === "control" || s.uuid !== e);
    this.payOwed(
      this.ledger.seed(
        e,
        n,
        n !== undefined &&
          isControlShapedMessage({
            message: {
              content: n,
            },
          }),
      ),
    );
  }
  streamEcho(e, n) {
    let s = this.ledger.streamEcho(e, n);
    if (s.dequeue) this.queue = this.queue.filter((r) => r.kind === "control" || r.uuid !== e);
    return s.verdict === "claim"
      ? {
          verdict: "claim",
          sent: s.sent,
        }
      : {
          verdict: s.verdict,
        };
  }
  settleOwedEchoes() {
    this.payOwed(this.ledger.settleOwed());
  }
  payOwed(e) {
    let n = this.ports.stampedSessionId();
    e.forEach(({ uuid, content }) => this.contained(() => this.writeEcho(scopeKey(n, uuid, content))));
  }
  wasTaken(e) {
    return this.ledger.wasTaken(e);
  }
  synthesizeMissedEchoes() {
    let e = this.ledger.truncation();
    this.payOwed(e);
    return e.length;
  }
  writeEcho(e, duplicate = false) {
    if (this.ports.emitEcho) {
      this.ports.emitEcho(e, {
        duplicate,
      });
      return;
    }
    this.ports.emit(e);
  }
  contained(e) {
    try {
      e();
    } catch (error) {
      logError(error);
    }
  }
  abandonPostsInFlight(e) {
    let n = [...this.postsInFlight];
    this.postsInFlight.clear();
    this.renewalParked.clear();
    n.forEach((s) =>
      this.failItem(s, e, {
        posted: true,
        unconfirmed: true,
      }),
    );
    this.settleOwedEchoes();
    return n.length;
  }
  submit(e) {
    if (e.kind !== "control") {
      if (this.ledger.wasTaken(e.uuid)) {
        if (e.kind === "message" && this.ports.replayUserMessages)
          this.writeEcho(
            scopeKey(this.ports.stampedSessionId(), e.uuid, e.content),
            this.ledger.hadBefore(e.uuid),
          );
        return "redelivered";
      }
      this.payOwed(this.ledger.accept(e.uuid, e.kind, e.kind === "message" ? e.content : undefined));
    }
    if (this.closedWhy !== null) {
      this.failItem(e, this.closedWhy, {
        composedHere: this.closedCause === "open_failed",
      });
      if (e.kind !== "control") this.logSend(e.kind, "closed");
      return "refused";
    }
    if (
      e.kind === "message" &&
      hasNonTextContent({
        message: {
          content: e.content,
        },
      })
    ) {
      this.failItem(e, MALFORMED_CONTENT_BLOCKS_TEXT);
      this.logSend(e.kind, "malformed");
      return "refused";
    }
    if (e.kind === "control" && this.sendOutstanding && this.ports.liveSession() !== null) {
      this.forwardOutOfBand(e);
      return "new";
    }
    if (this.queue.length >= this.queueCap) {
      this.failItem(e, "too many messages are waiting for the cloud session", {
        outcome: "overflow",
      });
      logEvent("tengu_remote_headless_client_queue_overflow", {
        kind: fromEnum(e.kind),
      });
      return "refused";
    }
    this.queue.push(e);
    this.maxQueued = Math.max(this.maxQueued, this.queue.length);
    if (this.ports.liveSession() !== null) this.ports.track(this.flush().catch(logError));
    return "new";
  }
  async untilNoHold() {
    let e = null;
    while (e !== this.laterSendsHold) {
      e = this.laterSendsHold;
      await e;
    }
  }
  holdLaterSendsBehind(e) {
    this.laterSendsHold = this.laterSendsHold.then(() => e.then(noopPromiseHandler, noopPromiseHandler));
  }
  close(closedWhy, n) {
    if (this.closedWhy === null) {
      this.closedWhy = closedWhy;
      this.closedCause = n;
    }
    this.failQueued(this.closedWhy, n);
    this.settleOwedEchoes();
  }
  async flush() {
    if (this.flushing) return;
    this.flushing = true;
    try {
      while (this.ports.liveSession() !== null) {
        let e = this.queue[0];
        if (e !== undefined && e.kind !== "control") {
          await this.untilNoHold();
          if (this.ports.liveSession() === null) break;
        }
        let n = this.queue.shift();
        if (n === undefined) break;
        try {
          if (n.kind === "control") this.forwardOutOfBand(n);
          else {
            this.sendOutstanding = true;
            try {
              let s = this.post(n);
              this.outstandingSend = s.then(noopPromiseHandler, noopPromiseHandler);
              this.contained(() => this.releaseQueuedForwards());
              await s;
            } finally {
              this.sendOutstanding = false;
            }
          }
        } catch (error) {
          this.failAfterInternalError(n, error);
        }
      }
    } finally {
      this.flushing = false;
    }
  }
  releaseQueuedForwards() {
    let filtered = this.queue.filter((n) => n.kind === "control");
    if (filtered.length === 0) return;
    this.queue = this.queue.filter((n) => n.kind !== "control");
    filtered.forEach((n) => this.forwardOutOfBand(n));
  }
  forwardOutOfBand(e) {
    let abortController = new AbortController();
    let s =
      e.request.subtype === "cancel_async_message"
        ? Promise.all([this.laterSendsHold, this.outstandingSend]).then(noopPromiseHandler)
        : this.laterSendsHold;
    this.forwardsWaiting.set(abortController, e);
    let r = this.ports.track(
      s
        .then(() => {
          if (!this.forwardsWaiting.delete(abortController)) return;
          return this.forward(e, abortController);
        })
        .catch((error) => this.failAfterInternalError(e, error, abortController)),
    );
    if (e.holdsLaterSends) this.holdLaterSendsBehind(r);
  }
  failQueued(e, n) {
    let s = [...this.queue, ...this.forwardsWaiting.values()];
    this.queue = [];
    this.forwardsWaiting.clear();
    let composedHere = n === "open_failed";
    s.forEach((h) =>
      this.failItem(h, e, {
        composedHere,
      }),
    );
    if (s.length > 0)
      logEvent("tengu_remote_headless_client_queue_dropped", {
        count: s.length,
        cause: fromEnum(n),
      });
    return s.length;
  }
  answerForwardsInFlight(e) {
    let n = sanitizeCloudText(e);
    for (let key of [...this.forwardsInFlight.keys()]) {
      this.contained(() => this.ports.emit(controlErrorResponse(key, n)));
      this.forwardsInFlight.delete(key);
    }
  }
  queuedSendUuids() {
    return [
      ...this.queue.flatMap((e) => (e.kind === "control" ? [] : [e.uuid])),
      ...[...this.renewalParked].map((e) => e.uuid),
    ];
  }
  sendUuidsInFlight() {
    return [...this.postsInFlight].flatMap((e) => (this.renewalParked.has(e) ? [] : [e.uuid]));
  }
  heldMessages() {
    let e = this.ports.liveSession();
    if (e === null) return [];
    let n = new Set(e.manager.heldSendUuids());
    return [...this.postsInFlight].filter(
      (s) => s.kind === "message" && !this.renewalParked.has(s) && n.has(s.uuid),
    );
  }
  queuedMessages() {
    return [...this.queue, ...this.renewalParked].filter((e) => e.kind === "message");
  }
  withdrawQueuedSends() {
    let e = this.withdrawHeldSends();
    let n = [...this.queuedSendUuids(), ...e];
    this.queue = this.queue.filter((r) => r.kind === "control");
    this.renewalParked.forEach((r) => this.postsInFlight.delete(r));
    this.renewalParked.clear();
    return n
      .map((r) => [r, this.withdrawFromLedger(r, "interrupt")])
      .filter(([, r]) => r)
      .map(([r]) => r);
  }
  withdrawHeldSends() {
    let e = this.ports.liveSession();
    if (e === null) return [];
    return e.manager.heldSendUuids().filter((n) => this.withdrawHeld(n));
  }
  withdrawHeld(e) {
    let n = this.ports.liveSession();
    let found = [...this.postsInFlight].find((r) => r.uuid === e && !this.renewalParked.has(r));
    if (n === null || found === undefined) return false;
    if (!n.manager.withdrawHeldSend(e)) return false;
    this.postsInFlight.delete(found);
    return true;
  }
  withdrawQueuedSend(e) {
    if (typeof e !== "string") return false;
    let index = this.queue.findIndex((r) => r.kind !== "control" && r.uuid === e);
    let found = [...this.renewalParked].find((r) => r.uuid === e);
    if (index === -1 && found === undefined) {
      if (!this.withdrawHeld(e)) return false;
      return this.withdrawFromLedger(e, "cancel_async_message");
    }
    if (index !== -1) this.queue.splice(index, 1);
    if (found !== undefined) {
      this.renewalParked.delete(found);
      this.postsInFlight.delete(found);
    }
    return this.withdrawFromLedger(e, "cancel_async_message");
  }
  withdrawFromLedger(e, n) {
    let s = this.ledger.withdraw(e);
    if (!s)
      this.contained(() =>
        logEvent("tengu_remote_headless_client_cancel_found_delivered", {
          subtype: fromEnum(n),
        }),
      );
    return s;
  }
  cancelForward(e) {
    let n = (h) => h.kind === "control" && h.hostRequestId === e;
    let filtered = [...this.forwardsWaiting].filter(([, h]) => n(h));
    let r = [...this.queue.filter(n), ...filtered.map(([, h]) => h)];
    this.queue = this.queue.filter((h) => !n(h));
    filtered.forEach(([h]) => this.forwardsWaiting.delete(h));
    if (typeof e === "string") this.forwardsInFlight.get(e)?.abort();
    r.forEach((h) =>
      logEvent("tengu_remote_headless_client_host_request", {
        subtype: fromEnum(h.telemetrySubtype),
        outcome: fromEnum("cancelled"),
      }),
    );
  }
  failAfterInternalError(e, n, s) {
    logError(n);
    let r = "an internal error occurred while sending it";
    if (e.kind === "control") {
      if (s !== undefined && this.forwardsInFlight.get(e.hostRequestId) === s) {
        this.forwardsInFlight.delete(e.hostRequestId);
        this.failItem(e, r, {
          outcome: "error",
        });
      }
      return;
    }
    if (this.postsInFlight.delete(e)) {
      this.failItem(e, r, {
        posted: true,
        unconfirmed: true,
      });
      this.logSend(e.kind, "error");
      return;
    }
    switch (this.ledger.phaseOf(e.uuid)) {
      case "queued":
        this.failItem(e, r);
        this.logSend(e.kind, "error");
        return;
      case "posting":
        this.failItem(e, r, {
          posted: true,
          unconfirmed: true,
        });
        return;
      default:
        return;
    }
  }
  failItem(
    e,
    n,
    { posted: s = false, unconfirmed: r = false, outcome: h = "closed", composedHere: y = false } = {},
  ) {
    let S = y ? clipCloudText(n) : sanitizeCloudText(n);
    let w = this.ports.stampedSessionId();
    switch (e.kind) {
      case "message": {
        let { echo, error } = s
          ? this.ledger.postFail(e.uuid, r)
          : {
              ...this.ledger.giveUp(e.uuid),
              error: true,
            };
        if (!error) {
          logForDebugging(
            `[headlessCloudClient] POST for ${e.uuid} failed after its echo; treating it as delivered`,
          );
          return;
        }
        if (echo) this.contained(() => this.ports.emit(scopeKey(w, e.uuid, e.content)));
        this.contained(() => this.ports.emit(emitLoadError(w, [`${NOT_DELIVERED_MESSAGE}: ${S}`], e.uuid)));
        return;
      }
      case "bash":
        if (s) this.ledger.postFail(e.uuid, r);
        else this.ledger.giveUp(e.uuid);
        this.contained(() =>
          this.ports.emit(
            emitLoadError(w, [r ? `bash_command may not have run: ${S}` : `bash_command was not run: ${S}`]),
          ),
        );
        return;
      case "control":
        this.contained(() =>
          this.ports.emit(controlErrorResponse(e.hostRequestId, `${e.request.subtype} was not sent: ${S}`)),
        );
        this.contained(() =>
          logEvent("tengu_remote_headless_client_host_request", {
            subtype: fromEnum(e.telemetrySubtype),
            outcome: fromEnum(h),
          }),
        );
        return;
    }
  }
  async post(e) {
    let n = this.ports.liveSession();
    if (n === null) {
      this.failItem(e, CLIENT_CLOSED_BEFORE_COMPLETE);
      this.logSend(e.kind, "closed");
      return;
    }
    this.ledger.postStart(e.uuid);
    this.postsInFlight.add(e);
    let s = this.ports.clock.now();
    let accessToken = n.opened.getAccessToken();
    let h = await this.postOnce(n.manager, e);
    let y = false;
    let S = false;
    if (!h.ok && h.status === 401 && n.opened.onAuth401 && this.postsInFlight.has(e)) {
      this.renewalParked.add(e);
      try {
        y =
          (await scheduleTimer(
            this.ports.clock,
            n.opened.onAuth401(accessToken).catch(() => false),
            SEND_ACK_TIMEOUT_MS,
          )) ?? false;
        if (y && this.postsInFlight.has(e)) await this.untilNoHold();
      } finally {
        this.renewalParked.delete(e);
      }
      if (y && this.postsInFlight.has(e)) {
        this.ports.onRepost?.(e);
        let w = this.ports.liveSession();
        S = w === null;
        h =
          w === null
            ? {
                ok: false,
                reason: this.closedWhy ?? "the cloud session disconnected",
              }
            : await this.postOnce(w.manager, e);
      }
    }
    if (!this.postsInFlight.delete(e)) {
      let w = !h.ok && h.withheld === true && h.reason === WITHDRAWN_2;
      this.contained(() =>
        this.logSend(e.kind, w ? "withdrawn_held" : "abandoned", {
          renewed: y,
        }),
      );
      return;
    }
    if (h.ok) {
      let { echo } = this.ledger.postOk(
        e.uuid,
        h.duplicate === true ? "duplicate" : getProgressStreamability(e),
      );
      if (echo && e.kind === "message")
        this.contained(() =>
          this.writeEcho(scopeKey(this.ports.stampedSessionId(), e.uuid, e.content), h.duplicate === true),
        );
      this.ports.onSent?.(e, {
        duplicate: h.duplicate === true,
      });
    } else if (h.withheld === true)
      this.failItem(
        e,
        h.reason === CANCELLED || h.reason === WITHDRAWN_2
          ? "it was still waiting to be sent when the cloud client closed"
          : h.reason,
        {
          posted: true,
          unconfirmed: false,
        },
      );
    else
      this.failItem(e, h.reason, {
        posted: true,
        unconfirmed: h.status === undefined && !S,
      });
    this.sendCount += 1;
    this.logSend(e.kind, h.ok ? "ok" : h.withheld === true ? "withheld" : "failed", {
      status: h.ok ? undefined : h.status,
      renewed: y,
      latency_ms: this.ports.clock.now() - s,
    });
  }
  logSend(e, n, s = {}) {
    logEvent("tengu_remote_headless_client_send", {
      kind: fromEnum(e),
      outcome: fromEnum(n),
      ...s,
    });
  }
  postOnce(e, n) {
    return n.kind === "message"
      ? e.sendMessage(n.content, {
          uuid: n.uuid,
          ...(n.priority && {
            priority: n.priority,
          }),
          ...(n.pastedContent && {
            pastedContent: n.pastedContent,
          }),
          ...(n.inlinePastes && {
            inlinePastes: n.inlinePastes,
          }),
        })
      : e.sendBashCommand(
          {
            command: n.command,
            ...(n.cwd !== undefined && {
              cwd: n.cwd,
            }),
          },
          {
            uuid: n.uuid,
          },
        );
  }
  async forward(e, n) {
    let { telemetrySubtype } = e;
    let r = this.ports.liveSession();
    if (r === null || this.forwardsInFlight.has(e.hostRequestId)) {
      this.failItem(
        e,
        r === null ? CLIENT_CLOSED_BEFORE_COMPLETE : "a request with this request_id is already in flight",
        {
          outcome: r === null ? "closed" : "duplicate",
        },
      );
      return;
    }
    this.forwardsInFlight.set(e.hostRequestId, n);
    let h = this.ports.clock.now();
    let S = await r.manager
      .sendControlRequest(e.request, {
        signal: n.signal,
      })
      .then(
        (w) => {
          if (this.forwardsInFlight.get(e.hostRequestId) !== n) return "closed";
          this.ports.emit(controlSuccessResponse(e.hostRequestId, w ?? {}));
          this.forwardsInFlight.delete(e.hostRequestId);
          return "forwarded";
        },
        (error) => {
          if (this.forwardsInFlight.get(e.hostRequestId) !== n) return "closed";
          if (error instanceof AbortError) {
            this.forwardsInFlight.delete(e.hostRequestId);
            return "cancelled";
          }
          this.ports.emit(controlErrorResponse(e.hostRequestId, describeForwardFailure(error)));
          this.forwardsInFlight.delete(e.hostRequestId);
          return "error";
        },
      );
    this.forwardCount += 1;
    logEvent("tengu_remote_headless_client_host_request", {
      subtype: fromEnum(telemetrySubtype),
      outcome: fromEnum(S),
      latency_ms: this.ports.clock.now() - h,
    });
  }
}
//@ chunk-fe6rs39h.js:88163-88178 placement
function noopPromiseHandler() {}
//@ chunk-fe6rs39h.js:88178-88316 placement
function getProgressStreamability(e) {
  if (e.kind === "bash") return "streams";
  let n = {
    message: {
      content: e.content,
    },
  };
  return isControlCommandLike(n) ? "never" : isControlShapedMessage(n) ? "unreliable" : "streams";
}
//@ chunk-fe6rs39h.js:88316-88593 placement
function describeForwardFailure(error) {
  if (error instanceof ControlRequestTimeoutError)
    return `the cloud session did not answer ${error.subtype} in time; it may still apply it`;
  let n = errorMessage(error);
  if (n.startsWith("[RemoteSessionManager]")) {
    logForDebugging(`[headlessCloudClient] forward failed: ${n}`);
    return "the cloud session is not connected";
  }
  return sanitizeCloudText(n);
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
  setTimeout: (e, n) => {
    let timer = setTimeout(e, n);
    return () => clearTimeout(timer);
  },
};
//@ chunk-fe6rs39h.js:88855-88879 placement
class ClientClosedError extends Error {}
//@ chunk-fe6rs39h.js:88879-88923 placement
/**
 * 启动无头云会话客户端并返回 done Promise（由 cloudPrint 与 openBareCloudSession 调用）。
 */
function runHeadlessCloudClient(e) {
  return {
    done: new HeadlessCloudClient(e).done,
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
  constructor(e) {
    this.config = e;
    this.clock = e.clock ?? REAL_CLOCK;
    this.workerReadyIdleMs = e.workerReadyIdleMs ?? STARTUP_WATCHDOG_MS;
    this.startedAt = this.clock.now();
    this.done = new Promise((resolve) => {
      this.resolveDone = resolve;
    });
    let n = forwardUntilAbort(e.input, () => {
      this.inputFailed = true;
    });
    this.io = e.createIO ? e.createIO(n, e.replayUserMessages) : new StructuredIO(n, e.replayUserMessages);
    this.io.setUnexpectedResponseCallback(async (y) => {
      logForDebugging(
        `[headlessCloudClient] dropped control_response for unknown request ${sanitizeCloudText(truncateToLength(String(y.response?.request_id), 64))}`,
      );
    });
    let track = (y) => this.track(y);
    let emit = (y) => this.emit(y);
    let liveSession = () => (this.phase === "live" ? this.session : null);
    this.outbound = new OutboundMessageQueue(
      {
        clock: this.clock,
        replayUserMessages: e.replayUserMessages,
        emit,
        emitEcho: (y, { duplicate }) => this.writeOwnEcho(y, duplicate),
        track,
        liveSession,
        stampedSessionId: () => this.stampedSessionId,
        onSent: (y, { duplicate }) => {
          if (y.kind !== "message") return;
          this.liveness?.noteDelivered(y.content);
          this.features?.noteMessageSent({
            uuid: y.uuid,
            duplicate,
          });
          if (!duplicate)
            this.liveness?.noteSendOk({
              afterStop: !this.stoppedWhileLive || this.sinceStop.has(y),
            });
        },
        onRepost: (y) => {
          if (y.kind === "message") this.sinceStop.add(y);
        },
      },
      e.queueCap ?? MAX_OUTBOX_ENTRIES,
    );
    this.agentRequests = new HostPermissionBridge({
      clock: this.clock,
      io: this.io,
      track,
    });
    this.hostRequests = new ControlRequestRelay({
      clock: this.clock,
      initializePolicy: e.initializePolicy,
      ignoredOptionsCount: e.ignoredOptions.length,
      openingInitializeHonours: new Set([...(e.openingInitializeHonours ?? []), "supportedDialogKinds"]),
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
      requestOpen: (y) => this.requestOpen(y),
      sleepNotice: async (y) => {
        this.stopAwakeWatch?.();
        this.stopAwakeWatch = null;
        if (y === "will_sleep") {
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
      end: (y) =>
        void this.end(
          y.reason,
          y.reason === "rejected_options" ? y.message : undefined,
          undefined,
          y.reason === "end_session" && this.opened?.controlOnly === true ? y.leftFor : undefined,
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
  settleOpener(e, n) {
    return (this.opened?.settle?.(e) ?? Promise.resolve(undefined)).then(
      (s) => {
        if (!s) return;
        logEvent("tengu_remote_headless_client_seed_cut_short", {
          at: fromEnum(n),
        });
        this.emit(cloudInformationalMessage(this.stampedSessionId, s.level, clipCloudText(s.text)));
      },
      (error) => {
        logForDebugging(`[headlessCloudClient] settling the opener's work failed: ${errorMessage(error)}`);
      },
    );
  }
  initializeWorker(e, n) {
    let filtered = [...this.hostDialogKinds].filter((hostDialogKind) => !isConsentDialogKind(hostDialogKind));
    let r = openingControlRequest(e, filtered);
    this.workerInitializeReason = r;
    if (r === null) return;
    let h = {
      subtype: "initialize",
      ...(filtered.length > 0 && {
        supportedDialogKinds: filtered,
      }),
    };
    let y = (posted, attempt) => {
      logEvent("tengu_remote_headless_client_worker_initialize", {
        reason: fromEnum(r),
        outcome: fromEnum(posted.outcome),
        ...("cause" in posted && {
          cause: fromEnum(posted.cause),
        }),
        ...("status" in posted && {
          status: posted.status,
        }),
        attempt,
        n_dialog_kinds: filtered.length,
      });
    };
    let S = this.clock.now();
    let w = async (attempt) => {
      let abortController = new AbortController();
      let I = n.postControlRequest(h, {
        answerExpected: false,
        background: true,
        timeoutMs: MAX_STARTUP_WAIT_MS,
        signal: abortController.signal,
      });
      I.response.then(
        () => logForDebugging(`[headlessCloudClient] the worker took this client's initialize (${r})`),
        (error) =>
          logForDebugging(
            `[headlessCloudClient] this client's initialize (${r}) was not answered: ${sanitizeCloudText(truncateToLength(errorMessage(error), 200))}`,
          ),
      );
      let posted = await I.posted;
      y(posted, attempt);
      if (posted.outcome === "accepted") return;
      abortController.abort();
      let P = RETRY_DELAYS_MS[attempt - 1];
      if (P !== undefined && isRetryableHttpFailure(posted) && this.clock.now() - S < CONTROL_TIMEOUT_MS) {
        await new Promise((resolve) => this.clock.setTimeout(resolve, P));
        if (!this.closing) return w(attempt + 1);
      }
    };
    this.outbound.holdLaterSendsBehind(w(1));
  }
  async applyOpeningRequests(e, n) {
    for (let { request, required, describe } of e)
      try {
        await n.sendControlRequest(request);
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
    for await (let e of this.io.outbound)
      try {
        await this.io.write(e);
      } catch (error) {
        logError(error);
        this.end("output_failed", `failed to write to stdout: ${errorMessage(error)}`);
        return;
      }
  }
  emit(e) {
    if (
      !this.outputOpen ||
      (this.endsOnStartupResult && e.type !== "control_response" && !("startup_failure_reason" in e))
    ) {
      logForDebugging(
        `[headlessCloudClient] dropped ${e.type} frame ${this.outputOpen ? "because this launch ends on one start-up result" : "after stdout closed"}`,
      );
      return;
    }
    this.io.outbound.enqueue(e);
  }
  track(e) {
    this.inflight.add(e);
    let n = () => {
      this.inflight.delete(e);
      this.detachIfDrained();
    };
    e.then(n, (error) => {
      logError(error);
      n();
    });
    return e;
  }
  async readInput() {
    try {
      for await (let e of this.io.structuredInput)
        try {
          this.handleHostFrame(e);
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
  handleHostFrame(e) {
    if (this.closing) {
      this.refuseWhileClosing(e);
      return;
    }
    switch (e.type) {
      case "user":
        if (this.submitUserMessage(e)) this.requestOpen(null);
        return;
      case "bash_command":
        if (this.submitBashCommand(e)) this.requestOpen(null);
        return;
      case "control_request": {
        let n = controlRequestSubtype(e) === "set_permission_mode";
        if (n) this.requestedModeChecked = true;
        if (this.hostRequests.handleControlRequest(e) === "forwarded" && n)
          this.hostSentPermissionMode = true;
        return;
      }
      case "control_cancel_request":
        this.hostRequests.handleCancelRequest(e);
        return;
      default:
        logForDebugging(`[headlessCloudClient] ignoring host ${e.type} frame`);
    }
  }
  refuseWhileClosing(e) {
    switch (e.type) {
      case "user":
        this.submitUserMessage(e);
        return;
      case "bash_command":
        this.submitBashCommand(e);
        return;
      case "control_request": {
        let requestId = "request_id" in e ? e.request_id : undefined;
        if (typeof requestId === "string") this.emit(controlErrorResponse(requestId, CLIENT_CLOSING_REASON));
        return;
      }
      default:
        logForDebugging(`[headlessCloudClient] ignoring ${e.type} frame while closing`);
    }
  }
  hostFrameUuid(e) {
    if (!("uuid" in e) || e.uuid === undefined || e.uuid === null) return;
    let n = normalizeUuidOrNull(e.uuid);
    return n === null ? "invalid" : n.toLowerCase();
  }
  submitUserMessage(e) {
    let n = this.hostFrameUuid(e);
    let message = "message" in e ? e.message : undefined;
    let content =
      typeof message === "object" && message !== null && "content" in message ? message.content : undefined;
    if (n === "invalid") {
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
          n,
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
          n,
        ),
      );
      return false;
    }
    let h = queuePriorityOrUndefined("priority" in e ? e.priority : undefined);
    let pastedContent = "pasted_content" in e ? e.pasted_content : undefined;
    let inlinePastes = "inline_pastes" in e ? e.inline_pastes : undefined;
    let w = {
      pastedContent,
      inlinePastes,
      rows: [],
    };
    let R = {
      kind: "message",
      content,
      uuid: n ?? randomUUID(),
      ...(h !== undefined && {
        priority: h,
      }),
      ...(Array.isArray(w.pastedContent) && {
        pastedContent: w.pastedContent,
      }),
      ...(Array.isArray(w.inlinePastes) && {
        inlinePastes: w.inlinePastes,
      }),
    };
    let k = this.outbound.submit(R);
    if (k === "new" && !this.closing) this.sinceStop.add(R);
    if (k === "new") w.rows.forEach((I) => logFeatureSad("sdk_pasted_content", I));
    return true;
  }
  submitBashCommand(e) {
    let n = this.hostFrameUuid(e);
    let command = "command" in e ? e.command : undefined;
    let cwd = "cwd" in e ? e.cwd : undefined;
    let h = (y) => {
      this.emit(emitLoadError(this.stampedSessionId, [y]));
      return false;
    };
    if (n === "invalid") return h("bash_command was not run: its uuid must be a UUID");
    if (typeof command !== "string") return h("bash_command was not run: it needs a string command");
    if (cwd !== undefined && typeof cwd !== "string")
      return h("bash_command was not run: its cwd must be a string");
    this.outbound.submit({
      kind: "bash",
      command,
      ...(cwd !== undefined && {
        cwd,
      }),
      uuid: n ?? randomUUID(),
    });
    return true;
  }
  writeOwnEcho(e, duplicate = false) {
    if (this.frames)
      this.frames.writeOwnEcho(e, {
        duplicate,
      });
    else if (
      this.phase === "pre_session" &&
      this.preSessionEchoes.length < (this.config.queueCap ?? MAX_OUTBOX_ENTRIES)
    )
      this.preSessionEchoes.push(e);
    else this.emit(e);
  }
  releasePreSessionEchoes(e) {
    this.preSessionEchoes.splice(0).forEach((preSessionEchoe) => {
      let r = {
        ...preSessionEchoe,
        session_id: this.stampedSessionId,
      };
      if (e) e.writeOwnEcho(r);
      else this.emit(r);
    });
  }
  requestOpen(e) {
    if (this.openRequested || this.phase !== "pre_session" || this.signalled) return;
    this.openRequested = true;
    this.hostDialogKinds = new Set(sanitizeStringList(e?.supportedDialogKinds));
    this.track(this.openSession(e));
  }
  async openSession(initialize) {
    let n;
    try {
      n = await this.config.openSession({
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
      n = {
        kind: "failed",
        message: errorMessage(error),
      };
    }
    if (this.phase !== "pre_session" || this.signalled) {
      logForDebugging("[headlessCloudClient] session opened after the client ended; not attaching");
      if (n.kind === "opened") {
        logEvent("tengu_remote_headless_client_open_discarded", {
          entry: fromEnum(n.session.entry),
        });
        if (n.session.entry === "attach") n.session.preflightCheck?.catch(() => {});
        await n.session.dispose?.().catch((error) => {
          logForDebugging(`[headlessCloudClient] discarded session not released: ${errorMessage(error)}`);
        });
      }
      return;
    }
    if (n.kind === "failed") {
      this.failOpen(n.message, n.startupFailureReason);
      return;
    }
    try {
      this.attach(n.session);
    } catch (error) {
      logError(error);
      if (n.session.entry === "attach") n.session.preflightCheck?.catch(() => {});
      this.featureAbort.abort();
      this.features = null;
      await n.session.dispose?.().catch(() => {});
      this.failOpen(errorMessage(error));
    }
  }
  failOpen(e, n) {
    this.endsOnStartupResult = n !== undefined && isStartupFailureResultRequested();
    this.releasePreSessionEchoes(this.frames);
    this.frames?.close();
    this.outbound.close(e, "open_failed");
    if (this.endsOnStartupResult)
      this.emit(
        buildStartupFailureResult({
          sessionId: startupResultSessionId(getSessionId()),
          message: openSessionErrorMessage(e),
          reason: n,
        }),
      );
    this.end(n === undefined ? "open_failed" : "start_refused", e);
  }
  attach(e) {
    if (
      e.entry === "create" &&
      e.initialPrompt !== undefined &&
      e.initialPrompt.uuid !== e.initialPrompt.uuid.toLowerCase()
    )
      logForDebugging(
        "[headlessCloudClient] the seeded prompt uuid is not canonical lowercase; host redeliveries of it will not be recognised and will be sent again",
        {
          level: "warn",
        },
      );
    this.connectEpoch = this.clock.now();
    let n = hashSessionAddress(toInfraSessionId(e.sessionId));
    let s = new CloudStreamFilter(
      {
        clock: this.clock,
        includePartialMessages: this.config.includePartialMessages,
        emit: (D) => this.emit(D),
        outbound: this.outbound,
        cloudSession: () => this.readCloudSession(),
        summaryLine: (D) => {
          let syncStatusFromRemote = buildSyncStatusFromRemote(D, undefined);
          return syncStatusFromRemote.projectFiles?.mark === "pending" ||
            noop_3(D) ||
            Object.values(this.features?.reports() ?? {}).some((te) => te.pending)
            ? ""
            : formatSyncStatusLine(syncStatusFromRemote);
        },
        onWorkerReady: (D) => this.markWorkerReady(D),
        onWorkerInit: (D) => this.features?.noteWorkerInit(D),
        onTurnInFlight: () => this.features?.noteTurnInFlight(),
        onTurnEnded: () => this.features?.noteTurnEnded(),
        onWorkerUp: (D) => {
          this.features?.noteWorkerUp(D);
          logEvent("tengu_remote_headless_client_worker_up", {
            generation: D.generation,
            session_mode: fromEnumOpt(D.sessionMode),
          });
        },
        onWorkerSessionId: (D) => this.features?.noteSessionCleared(D),
        onProvisioning: (D, W) => this.liveness?.noteProvisioning(D, W),
      },
      {
        entry: e.entry,
        initialSessionId: n,
        connectEpoch: this.connectEpoch,
        writesStatusBeforeInit: e.controlOnly === true,
      },
    );
    this.frames = s;
    this.guarded(() => e.onDerivedSessionId(n));
    e.notices?.forEach((notice) =>
      this.emit(cloudInformationalMessage(this.stampedSessionId, notice.level, clipCloudText(notice.text))),
    );
    this.releasePreSessionEchoes(s);
    let r = new BootstrapWatchdog(
      {
        clock: this.clock,
        emit: (D) => this.emit(D),
        stampedSessionId: () => this.stampedSessionId,
        reconnect: () => this.session?.manager.reconnect(),
        queuedSendCount: () => this.outbound.queuedSendUuids().length,
        sessionId: e.sessionId,
        essentialTrafficOnly: isEssentialTrafficOnly(),
        controlOnly: e.controlOnly === true,
        api: {
          markSessionRead,
          updateSessionTitle,
        },
      },
      {
        titleFromFirstMessage: e.entry === "create" && !e.hasTitle,
      },
    );
    this.liveness = r;
    let h = new HeadlessFeatureHandles();
    this.features = h;
    h.adopt(e.featureHandles ?? []);
    h.onEachSettled(() => {
      if (!this.closing) {
        s.offerSummary();
        s.noteCloudSessionChanged();
      }
    });
    h.onEachReportChanged(() => {
      if (!this.closing) s.noteCloudSessionChanged();
    });
    e.onCloudSessionChanged?.(() =>
      this.guarded(() => {
        if (!this.closing) s.noteCloudSessionChanged();
      }),
    );
    let y = e.eventSigner === undefined ? false : undefined;
    e.eventSigner?.then(
      (D) => {
        y = D !== undefined;
      },
      () => {
        y = false;
      },
    );
    let S = new Set();
    let callbacks = h.callbacks({
      onMessage: (D, W = {}) => this.guarded(() => this.handleSessionFrame(s, D, W)),
      onPermissionRequest: (D, W, te) =>
        this.guarded(() => {
          if (this.session !== null && this.phase !== "ending") {
            if (te?.reinstated === true) this.agentRequests.reinstate(W);
            let manager = this.session.manager;
            if (e.controlOnly !== true && !normalizeCanUseToolRequest(D)) {
              logEvent("tengu_remote_headless_client_malformed_ask", {});
              manager.respondToPermissionRequest(W, parsePermissionRequest(D));
              return;
            }
            let ee = isRepositoryTrustGateEnabled() && isConfirmRepositoryTrustTool(D.tool_name);
            let se = !ee && isServedCallWatchEnabled() && isRequestComputerFolderTool(D.tool_name);
            if (se && !isComputerFolderTarget(D.input)) {
              logEvent("tengu_remote_headless_client_malformed_ask", {});
              if (e.controlOnly !== true) manager.respondToPermissionRequest(W, parsePermissionRequest(D));
              return;
            }
            let x = ee && e.hostAnswersUnattended !== true ? deviceProofState(D, y) : undefined;
            if (x !== undefined) {
              logForDebugging(
                `[headlessCloudClient] not passing a repository-trust question to the host (${x})`,
                {
                  level: "warn",
                },
              );
              if (x === "proves_no_device") {
                r.notePermissionRequestOpened(W);
                if (e.controlOnly !== true && !S.has(W)) {
                  S.add(W);
                  this.emit(
                    cloudInformationalMessage(
                      this.stampedSessionId,
                      "notice",
                      REMOTE_TOOLS_CONSENT_TEXT["repository_trust.prompt.answer_elsewhere"](
                        getRemoteSessionUrl(e.sessionId),
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
                  respondToPermissionRequest: (G, Q) => {
                    try {
                      manager.respondToPermissionRequest(G, Q);
                    } finally {
                      r.notePermissionRequestClosed(G);
                    }
                  },
                },
                ee ? toCanUseToolRequest(D) : se ? toServedPermissionRequest(D) : D,
                W,
              )
            )
              r.notePermissionRequestOpened(W);
          }
        }),
      onPermissionCancelled: (D) => {
        this.agentRequests.cancel(D);
        r.notePermissionRequestClosed(D);
      },
      onUserDialogRequest: (D, W, te) =>
        this.guarded(() => {
          if (this.session === null || this.phase === "ending") return;
          if (isConsentDialogKind(D.dialog_kind)) {
            this.dialogsReservedCount++;
            logForDebugging(
              `[headlessCloudClient] not passing a ${sanitizeCloudText(truncateToLength(String(D.dialog_kind), 64))} dialog to the host: that kind is this client's own question, never the cloud session's`,
            );
            return;
          }
          if (!this.hostDialogKinds.has(D.dialog_kind)) {
            this.dialogsNotDeclaredCount++;
            let X = sanitizeCloudText(truncateToLength(String(D.dialog_kind), 64));
            logForDebugging(
              `[headlessCloudClient] not passing a ${X} dialog to the host: its initialize did not declare the kind`,
            );
            this.emit(
              cloudInformationalMessage(
                this.stampedSessionId,
                "notice",
                `The cloud session is waiting on a ${X} dialog this host did not declare it can show; it continues when another client answers it or the session's dialog timeout passes.`,
              ),
            );
            return;
          }
          if (te?.reinstated === true) this.agentRequests.reinstate(W);
          this.agentRequests.passUserDialogRequest(this.session.manager, D, W);
        }),
      onUserDialogCancelled: (D) => this.agentRequests.cancel(D),
      onConnected: (D) =>
        this.guarded(() => {
          this.logStream("connected");
          let everConnected = this.everConnected;
          this.connection = "live";
          s.noteCloudSessionChanged();
          this.features?.noteStreamConnected(D);
          this.everConnected = true;
          if (everConnected) this.recheckServeOnlyLink(e);
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
          s.noteCloudSessionChanged();
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
          s.releaseHeld();
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
      onToolHostEnded: (D) =>
        this.guarded(() => {
          if (e.controlOnly !== true) {
            logForDebugging(
              "[headlessCloudClient] tool_host_ended ignored: this client is not a serve-only helper",
            );
            return;
          }
          if (D.reason === CONNECTION_EXPIRED && e.resumeLinkHere !== undefined) {
            this.resumeServeOnlyLinkOrEnd(e, D.reason);
            return;
          }
          this.end("tool_host_ended", sessionNoLongerUsesComputer(e.sessionId, D.reason));
        }),
      onDisconnected: (D) => {
        let W = cloudDisconnectReason(D);
        this.end("disconnected", cloudDisconnectMessage(W), W);
      },
      onResponseUndelivered: (D, W, te) =>
        this.guarded(() => {
          if (this.undeliveredKindsTold.has(W)) return;
          if (this.undeliveredKindsTold.size === 0) queueMicrotask(() => this.undeliveredKindsTold.clear());
          this.undeliveredKindsTold.add(W);
          this.emit(
            cloudInformationalMessage(this.stampedSessionId, "warning", formatUndeliveredAnswerNotice(W, te)),
          );
        }),
      onError: (D) => logForDebugging(`[headlessCloudClient] stream error: ${D.message}`),
    });
    let R = h.homeSeed();
    let k = {
      sessionId: e.sessionId,
      getAccessToken: e.getAccessToken,
      consoleProfileBearer: e.consoleProfileBearer,
      onAuth401: e.onAuth401,
      orgUuid: e.orgUuid,
      ...{},
      ...(e.eventSigner && {
        eventSigner: e.eventSigner,
      }),
      ...(R && {
        homeSeed: R,
        homeSeedHoldsFirstSend: e.entry === "create",
      }),
      ...(e.controlOnly === true && {
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
      keepStreamRedialling: e.cloudSession().device.status === "bound",
      ...(e.entry === "create"
        ? {
            initialPromptUuid: e.initialPrompt?.uuid,
          }
        : {
            isAttachToExisting: true,
            initialSequenceNum: e.initialSequenceNum ?? undefined,
            preflightCheck: e.preflightCheck,
          }),
    };
    let I = e.createManager ? e.createManager(k, callbacks) : new RemoteSessionManager(k, callbacks);
    let O = h.sendWait();
    if (O !== null)
      I.addSendGate((D) => Promise.race([O(), D.released, D.withdrawn, D.decided]), {
        onRelease: "send",
      });
    let P = e.dirSync?.sync.sendGate?.bind(e.dirSync.sync);
    if (P !== undefined)
      I.addSendGate((D) => P(D), {
        onRelease: "withhold",
      });
    this.session = {
      manager: I,
      opened: e,
    };
    this.opened = e;
    h.noteSession({
      sessionId: e.sessionId,
      manager: I,
      clock: this.clock,
      ...(e.controlOnly === true && {
        endServing: (D) =>
          void (D === "idle"
            ? this.end(
                "idle_released",
                `Cloud session ${e.sessionId} ran nothing on this computer for its idle limit; letting it go. It can ask for this folder again.`,
                undefined,
                D,
              )
            : this.end("end_session", undefined, undefined, D)),
      }),
    });
    if (e.entry === "create" && e.initialPrompt)
      this.outbound.noteOwnUuid(e.initialPrompt.uuid, e.initialPrompt.content);
    let N = e.entry === "attach" && (e.preflightCheck !== undefined || (e.openingRequests?.length ?? 0) > 0);
    this.phase = e.entry === "create" || N ? "awaiting_worker" : "live";
    I.connect();
    let requestedPermissionMode = e.entry === "create" ? e.requestedPermissionMode : undefined;
    if (requestedPermissionMode !== undefined)
      this.outbound.holdLaterSendsBehind(
        syncRemotePermissionMode({
          manager: I,
          mode: requestedPermissionMode,
          surface: "headless",
          sessionId: e.sessionId,
          superseded: () => this.session?.manager !== I || this.hostSentPermissionMode,
          observedMode: () => this.lastWorkerMode,
          seededModeReported: () => this.workerModesSeen.has(requestedPermissionMode),
          linkDown: () => this.connection !== "live",
          onRefused: (D) => this.outbound.holdLaterSendsBehind(D),
          onGaveUp: (D) => this.emit(cloudInformationalMessage(this.stampedSessionId, "warning", D)),
        }),
      );
    this.initializeWorker(e, I);
    let z = N
      ? (e.preflightCheck ?? Promise.resolve()).then(() =>
          this.applyOpeningRequests(e.openingRequests ?? [], I),
        )
      : undefined;
    r.attachStatusFeeds([undefined, ...h.statusFeeds()], () => {
      if (!this.closing) {
        s.offerSummary();
        s.noteCloudSessionChanged();
      }
    });
    if (e.entry === "create") r.armStallWarning();
    if (this.phase === "live") r.noteWorkerReady();
    z?.then(
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
    let Y = h.reports();
    logEvent("tengu_remote_headless_client_started", {
      entry: fromEnum(e.entry),
      device_status: fromEnumOpt(cloudSession?.device.status),
      sync_state: fromEnumOpt(cloudSession?.directory_sync.state),
      sync_reason: directorySyncReasonLabel(cloudSession?.directory_sync.reason),
      ignored_count: this.config.ignoredOptions.length,
      ...notAppliedCounts(cloudSession?.not_applied ?? []),
      replay_user_messages: this.config.replayUserMessages,
      include_partial_messages: this.config.includePartialMessages,
      initialize_policy: fromEnum(this.config.initializePolicy),
      has_dir_sync: false,
      has_home_seed: R !== undefined,
      worker_initialize: fromEnum(this.workerInitializeReason ?? "none"),
      machine_features: h.handles().length,
      ...Object.fromEntries(HEADLESS_FEATURE_NAMES.map((D) => [`feature_${D}`, fromEnumOpt(Y[D]?.state)])),
      serving_state: fromEnumOpt(cloudSession?.serving?.state),
      serving_reason: fromEnumOpt(cloudSession?.serving?.reason),
      oauth_bridge: this.oauthBridgeInstalled,
    });
    if (this.phase === "live") this.goLive(I);
    else if (e.entry === "create") this.armIdleDeadline();
  }
  goLive(e) {
    this.track(this.hostRequests.sendPendingInterrupt(e).then(() => this.outbound.flush()));
    this.features?.noteWorkerLive();
  }
  recheckServeOnlyLink(e) {
    let stillLinkedHere = e.stillLinkedHere;
    if (e.controlOnly !== true || stillLinkedHere === undefined) return;
    stillLinkedHere().then(
      async (s) => {
        if (s === false && !this.closing) await this.resumeServeOnlyLinkOrEnd(e, undefined);
      },
      (error) => {
        logForDebugging(`[headlessCloudClient] re-reading the serve-only link threw: ${errorMessage(error)}`);
      },
    );
  }
  async resumeServeOnlyLinkOrEnd(e, n) {
    let s =
      this.servesSession() && !this.closing ? await e.resumeLinkHere?.().catch(() => "stopped") : "stopped";
    if (this.closing) return;
    if (s === "resumed" && this.servesSession()) {
      this.guarded(() => this.session?.manager.reconnect());
      return;
    }
    this.end("tool_host_ended", sessionNoLongerUsesComputer(e.sessionId, n));
  }
  servesSession() {
    let state = this.readCloudSession()?.serving?.state;
    return state === "on" || state === "pending";
  }
  guarded(e) {
    try {
      e();
    } catch (error) {
      if (error instanceof AbortError)
        logForDebugging("[headlessCloudClient] session frame handling aborted");
      else logError(error);
    }
  }
  handleSessionFrame(e, n, s) {
    this.liveness?.noteInbound(n);
    if (n.type === "result") {
      this.features?.noteReply(this.featureAbort.signal);
      if (!this.closing) e.offerSummary();
    }
    if (e.handle(n, s) && this.phase === "awaiting_worker" && this.opened?.entry === "create")
      this.armIdleDeadline();
    if (n.type === "system" && "permissionMode" in n) {
      let permissionMode = parsePermissionMode(n.permissionMode);
      if (permissionMode !== undefined) {
        this.lastWorkerMode = permissionMode;
        this.workerModesSeen.add(permissionMode);
      }
    }
    if (n.type === "system" && n.subtype === "init") {
      this.checkRequestedPermissionMode(n.permissionMode);
      this.logWorkerInit(n);
    }
  }
  logWorkerInit(e) {
    try {
      this.builtInNames ??= new Set(this.config.builtInToolNames?.() ?? []);
    } catch (error) {
      this.builtInNames = new Set();
      logForDebugging(
        `[headlessCloudClient] built-in tool names could not be read: ${sanitizeCloudText(truncateToLength(errorMessage(error), 200))}`,
      );
    }
    logForDebugging(logCloudWorkerInit(e, this.builtInNames));
  }
  checkRequestedPermissionMode(e) {
    if (this.requestedModeChecked) return;
    this.requestedModeChecked = true;
    let requestedPermissionMode =
      this.opened?.entry === "create" ? this.opened.requestedPermissionMode : undefined;
    if (requestedPermissionMode === undefined || typeof e !== "string") return;
    let permissionMode = parsePermissionMode(e);
    let r = permissionMode === undefined ? undefined : toExternalPermissionMode(permissionMode);
    if (r === requestedPermissionMode) return;
    let h = `The cloud session did not apply the ${requestedPermissionMode} permission mode requested when it was created; it is in ${r ?? sanitizeCloudText(truncateToLength(e, 24))} mode.`;
    this.emit(cloudInformationalMessage(this.stampedSessionId, "warning", h));
    logEvent("tengu_remote_headless_client_mode_not_applied", {
      requested: fromEnum(requestedPermissionMode),
      actual: fromEnumOpt(r),
    });
    logForDebugging(`[headlessCloudClient] ${h}`, {
      level: "warn",
    });
  }
  readCloudSession() {
    try {
      let e = this.opened?.cloudSession();
      let n = this.features?.reports() ?? {};
      return e === undefined
        ? e
        : Object.assign(
            {},
            n,
            ...Object.values(n).map((s) => s.facts),
            {
              connection: this.connection,
            },
            e,
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
  markWorkerReady(e) {
    this.containerStartFailed ||= e === "step_failed";
    if (this.phase !== "awaiting_worker" || this.session === null) return;
    this.phase = "live";
    this.cancelIdleDeadline?.();
    this.cancelIdleDeadline = null;
    this.liveness?.noteWorkerReady();
    let queued = this.outbound.queuedCount;
    this.goLive(this.session.manager);
    logEvent("tengu_remote_headless_client_worker_ready", {
      via: fromEnum(e),
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
  logStream(e, n = {}) {
    logEvent("tengu_remote_headless_client_stream", {
      transition: fromEnum(e),
      ...n,
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
  watchAwake(e, n) {
    this.stopAwakeWatch = this.clock.setTimeout(() => {
      let s = this.clock.now();
      let r = s - n > EXIT_GRACE_MS * 2 ? 0 : e + (s - n);
      if (r < IDLE_EXIT_MS) {
        this.watchAwake(r, s);
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
      let n = scheduleTimer(this.clock, this.liveness?.stop() ?? Promise.resolve(), POLL_MS);
      await session.manager
        .releaseHeldSends(undefined, {
          exiting: true,
          final: true,
        })
        .catch(() => {});
      await session.manager.flushSends(CLOSE_GRACE_MS).catch(() => {});
      session.manager.disconnect();
      await n;
    })();
    return this.transportClosed;
  }
  async tearDown(e, n, s) {
    this.liveness?.halt();
    this.cancelIdleDeadline?.();
    this.cancelIdleDeadline = null;
    this.cancelReconnectNotice?.();
    this.cancelReconnectNotice = null;
    this.featureAbort.abort();
    this.releasePreSessionEchoes(this.frames);
    this.frames?.close();
    this.outbound.close(e, n);
    this.outbound.answerForwardsInFlight(e);
    this.agentRequests.cancelAll();
    await scheduleTimer(
      this.clock,
      this.features?.dispose(
        s === undefined
          ? {}
          : {
              leftFor: s,
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
  logEnded(e, n, s, r) {
    if (this.endLogged) return;
    this.endLogged = true;
    let stats = this.outbound.stats;
    let stats_2 = this.liveness?.stats;
    logEvent("tengu_remote_headless_client_ended", {
      reason: fromEnum(e),
      exit_code: n,
      ended_from: fromEnum(s),
      entry: fromEnumOpt(this.opened?.entry),
      disconnect_code: fromEnumOpt(r),
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
    else if (e === "start_refused") logFeatureSad("remote_headless_client", e);
    else if (n !== 0) logFeatureBad("remote_headless_client", e);
    else if (this.inputFailed) logFeatureSad("remote_headless_client", "input_failed");
    else logFeatureOk("remote_headless_client");
  }
  async end(e, n, s, r) {
    if (this.phase === "ending" || this.phase === "ended") return;
    let h = e === "disconnected" ? (s ?? cloudDisconnectReason(undefined)) : undefined;
    let y = exitForReason(e, n, h);
    let exitCode = y.exitCode;
    let phase = this.phase;
    this.phase = "ending";
    this.endingWith = {
      exitCode,
      disconnectCode: h,
    };
    try {
      await this.tearDown(
        e === "disconnected" ? "the cloud session disconnected" : CLIENT_CLOSED_BEFORE_COMPLETE,
        e === "disconnected" ? "disconnected" : "closed",
        r,
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
    this.logEnded(e, exitCode, phase, h);
    this.outputOpen = false;
    this.io.outbound.done();
    await this.drained;
    this.phase = "ended";
    this.unregisterCleanup();
    this.resolveDone(y);
  }
}
//@ chunk-fe6rs39h.js:118745-118773 placement
var CONNECTION_EXPIRED = "connection expired";
//@ chunk-fe6rs39h.js:118773-118910 placement
function sessionNoLongerUsesComputer(sessionId, n) {
  let s = n === undefined || n === "" ? "" : ` (${sanitizeCloudText(truncateToLength(n, 64))})`;
  return `Cloud session ${sessionId} no longer uses this computer${s}; stopping.`;
}
//@ chunk-fe6rs39h.js:118910-119007 placement
async function* forwardUntilAbort(e, n) {
  try {
    for await (let s of e) yield s;
  } catch (error) {
    if (!(error instanceof AbortError)) logError(error);
    n();
  }
}
//@ chunk-fe6rs39h.js:119007-119178 placement
function openingControlRequest(e, n) {
  if (e.entry === "create")
    return e.initialPrompt === undefined && n.length > 0 ? "declare_dialog_kinds" : null;
  return e.workerAwaitsAnswer === true ? "rearm_parked_prompt" : null;
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
function exitForReason(e, n, s) {
  let r = s ?? cloudDisconnectReason(undefined);
  switch (e) {
    case "stdin_eof":
    case "end_session":
      return n === undefined
        ? {
            exitCode: 0,
            reason: e,
          }
        : {
            exitCode: 0,
            reason: e,
            message: n,
          };
    case "tool_host_ended":
    case "idle_released":
      return {
        exitCode: 0,
        reason: e,
        message: clipCloudText(n ?? e),
      };
    case "disconnected":
      return {
        exitCode: 1,
        reason: e,
        disconnectCode: r,
        message: sanitizeCloudText(n ?? cloudDisconnectMessage(r)),
      };
    case "rejected_options":
      return {
        exitCode: 1,
        reason: e,
        message: clipCloudText(n ?? e),
      };
    case "open_failed": {
      let h = clipCloudText(n ?? "") || "Unable to open the cloud session";
      return {
        exitCode: 1,
        reason: e,
        message: h.startsWith("Error: ") ? h : `Error: ${h}`,
      };
    }
    case "start_refused":
      return {
        exitCode: 1,
        reason: e,
        message: openSessionErrorMessage(n),
      };
    case "output_failed":
      return {
        exitCode: 1,
        reason: e,
        message: sanitizeCloudText(n ?? e),
      };
  }
}
//@ chunk-fe6rs39h.js:119963-120032 placement
function openSessionErrorMessage(e) {
  return clipCloudText(e ?? "") || "Unable to open the cloud session";
}
//@ chunk-fe6rs39h.js:120032-120153 placement
function controlRequestSubtype(e) {
  let request = "request" in e ? e.request : undefined;
  return typeof request === "object" && request !== null && "subtype" in request
    ? request.subtype
    : undefined;
}
//@ chunk-fe6rs39h.js:120153-120323 placement
function notAppliedCounts(e) {
  return {
    not_applied_lost: count(e, ({ kind }) => kind === "lost"),
    not_applied_kept: count(e, ({ kind }) => kind === "kept"),
    not_applied_preference: count(e, ({ kind }) => kind === "preference"),
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
  return fromEnumOpt(DIR_SYNC_OFF_REASONS.find((n) => n === reason)) ?? lit("engine");
}
export { runHeadlessCloudClient };

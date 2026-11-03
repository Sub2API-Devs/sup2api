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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
} from "crypto";
import { isDeepStrictEqual } from "util";
import {
  ServedCallWatch,
  ONn,
  responseTimeoutMs,
  MNn,
  isServedCallWatchEnabled,
  syncRemotePermissionMode,
} from "../../remote/tools/servedChannel.js";
import { logEvent } from "../../services/analytics/index.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  rCs,
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
import { u, A, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { isSleepNoticeOnCached } from "../../services/analytics/violinTipGate.js";
import { controlErrorResponse, controlSuccessResponse, Sat, emitLoadError } from "../print.js";
import { routeHostedControlRequest, lostSdkFeatures } from "../cloudSession/hostedSessionRestrictions.js";
import {
  RELEASED,
  KNe,
  m2,
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
import { Vt } from "../../utils/agentId.js";
import { isControlShapedMessage, hasNonTextContent, Amo } from "../../remote/controlRequestShape.js";
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
import { Jvt } from "../../utils/messages/messagePredicates.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { sanitizeStringList } from "../../bridge/controlRequests.js";
import {
  isStartupFailureResultRequested,
  buildStartupFailureResult,
  startupResultSessionId,
} from "../startupFailureResult.js";
import { ADt } from "../../utils/sessionUrl.js";
import { toInfraSessionId } from "../../bridge/sessionIdCompat.js";
import { CloudStreamFilter } from "./streamFilter.js";
import { buildSyncStatusFromRemote, jxs, formatSyncStatusLine } from "./syncStatus.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { markSessionRead, updateSessionTitle } from "../../utils/teleport/api.js";
import { HeadlessFeatureHandles, HEADLESS_FEATURE_NAMES } from "./headlessFeatures.js";
import { normalizeCanUseToolRequest, parsePermissionRequest } from "../../remote/wireFrameShape.js";
import { dce } from "../../utils/teleport/repositoryTrustGate.js";
import { deviceProofState } from "../../utils/hooks/deviceHooks/contentDigest.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../../remote/tools/consentText.js";
import { getRemoteSessionUrl } from "../../constants/product.js";
import { parsePermissionMode } from "../../types/permissions.js";
import { toExternalPermissionMode } from "../../utils/permissions/PermissionMode.js";

//@ chunk-fe6rs39h.js:61774-61809 placement
var CLOUD_CLIENT_TIMEOUTS = 60000,
  Yo = 1000,
  Vo = 75,
  Go = 2048;
/**
 * 等待云会话启动的监控：长时间未就绪时提示（tengu_remote_headless_client_bootstrap_stalled），跟踪压缩与标题。
 */
//@ chunk-fe6rs39h.js:61809-66045 placement
class BootstrapWatchdog {
  ports;
  options;
  watchdog = new ServedCallWatch();
  cancelStall = null;
  unsubscribeStatus = [];
  compacting = !1;
  workerReady = !1;
  title = "none";
  titleSet = Promise.resolve();
  stopped = !1;
  lastLine = null;
  lastProvisioningLine = "";
  watchdogFires = 0;
  linesWritten = 0;
  linesTagged = 0;
  linesSuppressed = 0;
  constructor(e, n) {
    this.ports = e;
    this.options = n;
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
    (this.cancelStall?.(),
      (this.cancelStall = this.ports.clock.setTimeout(() => {
        if (((this.cancelStall = null), this.workerReady || this.stopped)) return;
        let queuedSendCount = this.ports.queuedSendCount();
        if (queuedSendCount === 0) {
          this.armStallWarning();
          return;
        }
        (logEvent("tengu_remote_headless_client_bootstrap_stalled", { queued: queuedSendCount }),
          this.line(
            "warning",
            "Still waiting for the cloud session to start; what you sent will be delivered when it is ready.",
          ));
      }, CLOUD_CLIENT_TIMEOUTS)));
  }
  noteWorkerReady() {
    ((this.workerReady = !0), this.cancelStall?.(), (this.cancelStall = null));
  }
  attachStatusFeeds(e, n) {
    let s = ({ line: line, level: level, notice: notice }) => {
      switch (level) {
        case "debug":
        case "progress":
          logForDebugging(`[headlessCloudClient] ${level}: ${line}`);
          return;
        case "info":
          this.line("notice", line);
          return;
        case "warning":
          this.line("warning", line, void 0);
          return;
        default:
      }
    };
    for (let r of e) {
      if (r === void 0) continue;
      ((this.unsubscribeStatus = [
        ...this.unsubscribeStatus,
        r.subscribe((h) => {
          (s(h), n?.());
        }),
      ]),
        r.takeBacklog().forEach(s));
    }
  }
  noteProvisioning(e, n) {
    let last = e.steps.findLast(
      (y) => y.status === "running" && rCs(y.id) && n?.steps.find((S) => S.id === y.id)?.status !== "running",
    );
    if (last !== void 0) {
      let y = setupStepLabel(last, completedSetupMode(e));
      if (y !== this.lastProvisioningLine)
        ((this.lastProvisioningLine = y), this.line("notice", `${y}\u2026`));
    }
    let any = e.steps.some((step) => step.status === "failed"),
      h = n?.steps.some((y) => y.status === "failed") ?? !1;
    if (any && !h) {
      if (!this.workerReady)
        (this.cancelStall?.(),
          (this.cancelStall = null),
          this.line("warning", "The cloud session failed to start."));
      return;
    }
    if (e.terminal && !(n?.terminal ?? !1))
      ((this.lastProvisioningLine = ""), this.line("notice", setupReadySummary(e)));
  }
  noteDelivered(e) {
    this.maybeTitle(e);
  }
  noteSendOk({ afterStop: e }) {
    if (this.ports.controlOnly || !this.workerReady || this.stopped || !e) return;
    this.armWatchdog();
  }
  noteInbound(e) {
    if ((this.clearWatchdog(), e.type === "system" && e.subtype === "status"))
      this.compacting = e.status === "compacting";
    else if (e.type === "result" || (e.type === "system" && e.subtype === "compact_boundary"))
      this.compacting = !1;
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
    (this.clearWatchdog(), this.cancelStall?.(), (this.cancelStall = null));
  }
  async stop() {
    if (this.stopped) return;
    ((this.stopped = !0),
      this.clearWatchdog(),
      this.cancelStall?.(),
      (this.cancelStall = null),
      this.unsubscribeStatus.forEach((h) => h()),
      (this.unsubscribeStatus = []));
    let {
      sessionId: sessionId,
      api: api,
      essentialTrafficOnly: essentialTrafficOnly,
      controlOnly: controlOnly,
    } = this.ports;
    await Promise.allSettled([
      ...(essentialTrafficOnly || controlOnly ? [] : [api.markSessionRead(sessionId)]),
      this.titleSet,
    ]);
  }
  armWatchdog() {
    if (
      (this.clearWatchdog(),
      !this.watchdog.watch(
        () => {
          if (this.stopped) return;
          ((this.watchdogFires += 1),
            logEvent("tengu_remote_headless_client_watchdog_fired", {
              timeout: fromEnum(this.compacting ? "compacting" : "response"),
            }),
            logForDebugging("[headlessCloudClient] response timeout; reconnecting"),
            this.line("warning", ONn),
            this.ports.reconnect());
        },
        (n) => this.ports.clock.setTimeout(n, responseTimeoutMs(this.compacting)),
      ))
    )
      this.line("notice", MNn);
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
              .join(" "),
      s = truncateToWidth(sanitizeCloudText(truncateToLength(n, Go)), Vo);
    if (s === "") {
      this.title = "skipped";
      return;
    }
    ((this.title = "set"),
      (this.titleSet = this.ports.api
        .updateSessionTitle(this.ports.sessionId, s)
        .catch(() => !1)
        .then((r) => {
          if (!r) this.title = "failed";
        })));
  }
  line(e, n, s) {
    if (this.stopped) return;
    let r = sanitizeCloudText(n);
    if (r === "") return;
    let now = this.ports.clock.now();
    if (
      this.lastLine !== null &&
      this.lastLine.level === e &&
      this.lastLine.text === r &&
      now - this.lastLine.at < Yo
    ) {
      this.linesSuppressed += 1;
      return;
    }
    if (((this.lastLine = { level: e, text: r, at: now }), (this.linesWritten += 1), s !== void 0))
      this.linesTagged += 1;
    this.ports.emit(cloudInformationalMessage(this.ports.stampedSessionId(), e, r, s));
  }
}
//@ chunk-fe6rs39h.js:66082-66141 placement
function scheduleTimer(e, n, s) {
  return withDeadline(n, s, (r, h) => e.setTimeout(r, h));
}
//@ chunk-fe6rs39h.js:66141-66240 placement
var HOST_SLEEP_NOTICE = "host_sleep_notice",
  Xo = 3000,
  Zo = 256,
  Jo = DoctorLazy(() =>
    u({
      cancelled: A(o())
        .optional()
        .catch(void 0),
    }),
  );
/**
 * 转发宿主的 control_request 到云会话并回传响应；处理 interrupt、取消排队消息、收据顺序。
 */
//@ chunk-fe6rs39h.js:66240-72711 placement
class ControlRequestRelay {
  ports;
  pendingInterrupt = null;
  announcedCancelled = new Set();
  issued = Promise.resolve();
  lastReceipt = Promise.resolve();
  sleepOutstanding = !1;
  constructor(e) {
    this.ports = e;
  }
  get interruptIssued() {
    return this.issued;
  }
  handleControlRequest(e) {
    let n = "request_id" in e ? e.request_id : void 0,
      s = "request" in e ? e.request : void 0;
    if (typeof n !== "string" || typeof s !== "object" || s === null)
      return (
        logForDebugging("[headlessCloudClient] dropping control_request without request_id or request"),
        "dropped"
      );
    let r = "state" in s ? s.state : void 0;
    if (
      "subtype" in s &&
      s.subtype === HOST_SLEEP_NOTICE &&
      (isSleepNoticeOnCached() || (this.sleepOutstanding && r === "did_wake"))
    ) {
      if (r !== "will_sleep" && r !== "did_wake")
        return (
          this.ports.emit(
            controlErrorResponse(n, `${HOST_SLEEP_NOTICE}: state must be will_sleep or did_wake`),
          ),
          "rejected"
        );
      return (
        (this.sleepOutstanding = r === "will_sleep"),
        this.ports.track(
          this.ports.sleepNotice(r).then(() => this.ports.emit(controlSuccessResponse(n, {}))),
        ),
        "local"
      );
    }
    let h = s,
      { route: route, telemetrySubtype: telemetrySubtype } = routeHostedControlRequest(h, {
        strict: this.ports.initializePolicy === "strict",
      });
    switch (route.kind) {
      case "reject":
        return (
          this.ports.emit(controlErrorResponse(n, route.error)),
          this.log(telemetrySubtype, "rejected"),
          "rejected"
        );
      case "forward": {
        let submit = this.ports.outbound.submit({
          kind: "control",
          request: h,
          hostRequestId: n,
          holdsLaterSends: route.holdsLaterSends,
          telemetrySubtype: telemetrySubtype,
        });
        return (this.ports.requestOpen(null), submit === "refused" ? "rejected" : "forwarded");
      }
      case "local":
        switch (route.handler) {
          case "initialize":
            return (this.handleInitialize(n, h), "local");
          case "interrupt":
            return (this.handleInterrupt(n, h), this.ports.requestOpen(null), "local");
          case "end_session":
            return (
              this.ports.emit(controlSuccessResponse(n, {})),
              this.ports.end({
                reason: "end_session",
                ...("reason" in h && h.reason === RELEASED && { leftFor: "released" }),
              }),
              this.log("end_session", "local"),
              "local"
            );
          case "cancel_async_message":
            return (this.handleCancelAsyncMessage(n, h), this.ports.requestOpen(null), "local");
        }
    }
  }
  handleCancelRequest(e) {
    this.ports.outbound.cancelForward("request_id" in e ? e.request_id : void 0);
  }
  handleInitialize(e, n) {
    let s = !this.ports.openRequested(),
      {
        hooks: hooks,
        sdkMcpServers: sdkMcpServers,
        sdkMcpServerConfigs: sdkMcpServerConfigs,
        sdkMcpServerManifests: sdkMcpServerManifests,
        sdkMcpServerManifestsOrigin: sdkMcpServerManifestsOrigin,
        workspaceTrust: workspaceTrust,
        ...k
      } = n,
      safeParse = SDKInitializeInitializeMessageSchema().safeParse(k),
      O = lostSdkFeatures(
        n,
        this.ports.initializePolicy,
        s && safeParse.success ? this.ports.openingInitializeHonours : void 0,
      );
    if (O.outcome !== "reject" && s && !safeParse.success && this.ports.initializePolicy === "strict") {
      (this.ports.emit(
        controlErrorResponse(
          e,
          "the initialize request could not be read (it does not match the control schema), so its options cannot be applied to a cloud session; nothing was started",
        ),
      ),
        this.ports.end({
          reason: "rejected_options",
          message:
            "the initialize request could not be read (it does not match the control schema), so its options cannot be applied to a cloud session; nothing was started",
        }),
        this.log("initialize", "rejected"));
      return;
    }
    if (O.outcome === "reject") {
      if ((this.ports.emit(controlErrorResponse(e, O.error)), s))
        this.ports.end({ reason: "rejected_options", message: O.error });
      this.log("initialize", "rejected");
      return;
    }
    if (
      (this.ports.emit(
        controlSuccessResponse(e, {
          ...createEmptyInitializeResponse(this.ports.account()),
          ...(O.ignored.includes("hooks") && { hooks_applied: !1 }),
          ...(O.ignored.includes("plugins") && { plugins_applied: !1 }),
        }),
      ),
      !safeParse.success)
    )
      logForDebugging(
        "[headlessCloudClient] initialize did not match its schema; opening the session without host options",
      );
    (this.ports.requestOpen(safeParse.success ? safeParse.data : null),
      logEvent("tengu_remote_headless_client_host_request", {
        subtype: fromEnum("initialize"),
        outcome: fromEnum("local"),
        ignored_count: O.ignored.length + this.ports.ignoredOptionsCount,
      }));
  }
  handleInterrupt(e, n) {
    let s = "cancel_queued" in n && n.cancel_queued === !0,
      pendingSeededPromptUuid = this.ports.pendingSeededPromptUuid(),
      h = s ? this.ports.outbound.withdrawQueuedSends() : [],
      y = [
        ...(pendingSeededPromptUuid === void 0 ? [] : [pendingSeededPromptUuid]),
        ...this.ports.outbound.sendUuidsInFlight(),
        ...(s ? [] : this.ports.outbound.queuedSendUuids()),
      ];
    if (!(n.subtype === "interrupt" && Sat(n))) this.ports.onInterrupt?.();
    this.ports.emit(controlSuccessResponse(e, s ? { still_queued: y, cancelled: h } : { still_queued: y }));
    let S = n;
    if (n.subtype === "interrupt") {
      let { for_user_message_uuids: for_user_message_uuids, worker_epoch: worker_epoch, ...I } = n;
      S = typeof I.message_uuid === "string" ? { ...I, message_uuid: I.message_uuid.toLowerCase() } : I;
    }
    let liveSession = this.ports.liveSession();
    if (liveSession === null) {
      ((this.pendingInterrupt = normalizeInterruptRequest(this.pendingInterrupt, S)),
        this.log("interrupt", "queued"));
      return;
    }
    (this.dispatchInterrupt(liveSession.manager, S), this.log("interrupt", "forwarded"));
  }
  async sendPendingInterrupt(e) {
    let takePendingInterrupt = this.takePendingInterrupt();
    if (takePendingInterrupt === null) return;
    this.dispatchInterrupt(e, takePendingInterrupt);
    let s = scheduleTimer(this.ports.clock, this.lastReceiptAfterIssue().catch(ei), Xo);
    (this.ports.outbound.holdLaterSendsBehind(s), await s);
  }
  async issuePendingInterrupt(e) {
    let takePendingInterrupt = this.takePendingInterrupt();
    if (takePendingInterrupt === null) return;
    (this.dispatchInterrupt(e, takePendingInterrupt), await this.issued);
  }
  takePendingInterrupt() {
    let pendingInterrupt = this.pendingInterrupt;
    if (
      ((this.pendingInterrupt = null), pendingInterrupt !== null && !this.ports.interruptMattersBeforeLive())
    )
      return (
        logEvent("tengu_remote_headless_client_interrupt_receipt", { outcome: fromEnum("nothing_to_stop") }),
        null
      );
    return pendingInterrupt;
  }
  async lastReceiptAfterIssue() {
    (await this.issued, await this.lastReceipt);
  }
  dispatchInterrupt(e, n) {
    let now = this.ports.clock.now(),
      r = !("cancel_queued" in n && n.cancel_queued === !0),
      h = n;
    if (!r && n.subtype === "interrupt") {
      let { send_now: send_now, message_uuid: message_uuid, ...w } = n;
      h = w;
    }
    ((this.issued = this.ports.track(
      e.releaseHeldSends(void 0, { keepWithheld: r }).then(
        () => {
          this.lastReceipt = e.sendControlRequest(h).then(
            (y) => {
              this.logInterruptReceipt("ok", now, this.announceSweptByWorker(y));
            },
            (y) => {
              let S = classifyControlRequestError(y) === "not_connected";
              this.logInterruptReceipt(S ? "not_sent" : "error", now);
            },
          );
        },
        (y) => {
          (logForDebugging(`[headlessCloudClient] interrupt not dispatched: ${errorMessage(y)}`),
            this.logInterruptReceipt("not_sent", now));
        },
      ),
    )),
      this.ports.outbound.holdLaterSendsBehind(this.issued));
  }
  logInterruptReceipt(e, n, s) {
    logEvent("tengu_remote_headless_client_interrupt_receipt", {
      outcome: fromEnum(e),
      latency_ms: this.ports.clock.now() - n,
      ...(s !== void 0 && { swept_announced: s }),
    });
  }
  announceSweptByWorker(e) {
    let n = parseThinClientReply("interrupt", Jo(), e ?? {})?.cancelled ?? [],
      sliced = uniq(n)
        .filter((r) => Vt(r) !== null && !this.announcedCancelled.has(r))
        .slice(0, Zo);
    return (
      sliced.forEach((r) => {
        this.announcedCancelled.add(r);
        try {
          this.ports.emit({
            type: "command_lifecycle",
            command_uuid: r,
            state: "cancelled",
            uuid: randomUUID_5(),
            session_id: this.ports.stampedSessionId(),
          });
        } catch (error) {
          logForDebugging(`[headlessCloudClient] could not announce a swept command: ${errorMessage(error)}`);
        }
      }),
      sliced.length
    );
  }
  handleCancelAsyncMessage(e, n) {
    let s =
        n.subtype === "cancel_async_message" && typeof n.message_uuid === "string"
          ? { ...n, message_uuid: n.message_uuid.toLowerCase() }
          : n,
      r = "message_uuid" in s ? s.message_uuid : void 0;
    if (this.ports.outbound.withdrawQueuedSend(r)) {
      (this.ports.emit(controlSuccessResponse(e, { cancelled: !0 })),
        this.log("cancel_async_message", "local"));
      return;
    }
    this.ports.outbound.submit({
      kind: "control",
      request: s,
      hostRequestId: e,
      holdsLaterSends: !1,
      telemetrySubtype: "cancel_async_message",
    });
  }
  log(e, n) {
    logEvent("tengu_remote_headless_client_host_request", { subtype: fromEnum(e), outcome: fromEnum(n) });
  }
}
//@ chunk-fe6rs39h.js:72711-72726 placement
function ei() {}
//@ chunk-fe6rs39h.js:72726-73036 placement
function normalizeInterruptRequest(e, n) {
  if (n.subtype !== "interrupt") return n;
  let s = e !== null && "cancel_queued" in e && e.cancel_queued === !0,
    r = e !== null && !("send_now" in e && e.send_now === !0),
    { message_uuid: message_uuid, ...y } = n,
    { send_now: send_now, ...w } = y,
    R = e === null || ("message_uuid" in e ? e.message_uuid : void 0) === message_uuid,
    k = r ? w : R ? n : y;
  return s ? { ...k, cancel_queued: !0 } : k;
}
/**
 * 发往云会话的用户消息账本：queued → posting → delivered/seeded/withdrawn，带上限与重放。
 */
//@ chunk-fe6rs39h.js:73078-76477 placement
class OutboundMessageLedger {
  cap;
  replay;
  entries = new Map();
  constructor(e, n) {
    this.cap = e;
    this.replay = n;
  }
  get size() {
    return this.entries.size;
  }
  phaseOf(e) {
    return this.entries.get(e)?.phase;
  }
  wasTaken(e) {
    let phaseOf = this.phaseOf(e);
    return phaseOf === "queued" || phaseOf === "posting" || phaseOf === "delivered" || phaseOf === "seeded";
  }
  seed(e, n, s) {
    let r = this.entries.get(e),
      h = r !== void 0 && r.owed > 0 && r.content !== void 0 ? [{ uuid: e, content: r.content }] : [],
      y = s && n !== void 0;
    return [
      ...this.set(e, {
        kind: "message",
        phase: "seeded",
        content: n ?? r?.content,
        stored: y ? n : void 0,
        owed: this.replay && !y ? 1 : 0,
        pendingEchoes: y ? 0 : 1,
        delivered: !0,
        echoMayBeLost: !1,
        hadBefore: !1,
      }),
      ...h,
      ...(y && this.replay ? [{ uuid: e, content: n }] : []),
    ];
  }
  accept(e, n, s) {
    let r = this.entries.get(e),
      h = this.replay && n === "message" ? 1 : 0;
    return (
      this.entries.delete(e),
      this.set(e, {
        kind: n,
        phase: "queued",
        content: s,
        stored: void 0,
        owed: (r?.owed ?? 0) + h,
        pendingEchoes: r?.pendingEchoes ?? 0,
        delivered: !1,
        echoMayBeLost: r?.echoMayBeLost ?? !1,
        hadBefore: !1,
      })
    );
  }
  withdraw(e) {
    let n = this.entries.get(e);
    if (n === void 0) return !0;
    if (n.phase === "posting") {
      if (((n.pendingEchoes = Math.max(0, n.pendingEchoes - 1)), n.delivered))
        return ((n.phase = "delivered"), !1);
    }
    return ((n.phase = "withdrawn"), (n.owed = Math.max(0, n.owed - 1)), !0);
  }
  giveUp(e) {
    let n = this.entries.get(e);
    if (n === void 0) return { echo: !1 };
    return ((n.phase = "given_up"), { echo: this.takeOwed(n) });
  }
  postStart(e) {
    let n = this.entries.get(e);
    if (n === void 0) return;
    if (((n.phase = "posting"), n.kind === "message")) n.pendingEchoes += 1;
  }
  hadBefore(e) {
    return this.entries.get(e)?.hadBefore ?? !1;
  }
  postOk(e, n) {
    let s = this.entries.get(e);
    if (s === void 0) return { echo: !1 };
    if (((s.phase = "delivered"), (s.delivered = !0), n === "duplicate")) s.hadBefore = !0;
    if (n === "never") s.pendingEchoes = 0;
    if (n !== "streams") s.stored ??= s.content;
    return n !== "streams" || s.echoMayBeLost ? { echo: this.takeOwed(s) } : { echo: !1 };
  }
  postFail(e, n) {
    let s = this.entries.get(e);
    if (s === void 0) return { echo: !1, error: !0 };
    if (s.delivered) return ((s.phase = "delivered"), { echo: !1, error: !1 });
    if (((s.phase = "failed"), !n)) s.pendingEchoes = Math.max(0, s.pendingEchoes - 1);
    return { echo: this.takeOwed(s), error: !0 };
  }
  streamEcho(e, n) {
    let s = this.entries.get(e);
    if (s === void 0 || s.kind !== "message") return { verdict: "not_own", dequeue: !1 };
    if (s.pendingEchoes > 0) {
      ((s.pendingEchoes = 0), (s.echoMayBeLost = !1), (s.stored = n));
      let h = s.phase === "queued";
      if (((s.delivered = !0), s.phase !== "posting" && s.phase !== "seeded")) s.phase = "delivered";
      if (s.owed > 0) return ((s.owed -= 1), { verdict: "claim", sent: s.content, dequeue: h });
      return { verdict: "consume", dequeue: h };
    }
    return {
      verdict:
        s.delivered && s.owed === 0 && s.stored !== void 0 && isDeepStrictEqual(n, s.stored)
          ? "consume"
          : "peer",
      dequeue: !1,
    };
  }
  settleOwed() {
    return [...this.entries].flatMap(([e, n]) => {
      if ((n.phase !== "delivered" && n.phase !== "seeded") || n.owed === 0 || n.content === void 0)
        return [];
      return ((n.owed -= 1), [{ uuid: e, content: n.content }]);
    });
  }
  truncation() {
    return [...this.entries].flatMap(([e, n]) => {
      if (n.pendingEchoes === 0) return [];
      if (((n.echoMayBeLost = !0), n.owed === 0 || n.content === void 0)) return [];
      return ((n.owed -= 1), [{ uuid: e, content: n.content }]);
    });
  }
  takeOwed(e) {
    if (e.owed === 0) return !1;
    return ((e.owed -= 1), !0);
  }
  set(e, n) {
    let s = !this.entries.has(e) && this.entries.size >= this.cap ? this.evictOne() : [];
    return (this.entries.set(e, n), s);
  }
  evictOne() {
    let e = (w) => w.phase === "queued" || w.phase === "posting",
      n = (w) => !e(w) && w.owed === 0 && w.pendingEchoes === 0,
      s = (w) => !e(w) && w.owed === 0,
      r = (w) => !e(w),
      h = this.oldestWhere(n) ?? this.oldestWhere(s) ?? this.oldestWhere(r);
    if (h === null) return [];
    let [y, S] = h;
    return (
      this.entries.delete(y),
      S.owed > 0 && S.content !== void 0 ? [{ uuid: y, content: S.content }] : []
    );
  }
  oldestWhere(e) {
    return [...this.entries].find(([, n]) => e(n)) ?? null;
  }
}
//@ chunk-fe6rs39h.js:76477-76749 placement
var NOT_DELIVERED_MESSAGE = "Your message was not delivered to the cloud session",
  oi = 60000,
  tt = "the cloud client closed before this request completed",
  Qt = "every content block must be an object, and a text block must carry string text",
  Xt = "the cloud client closed before the send was confirmed";
/**
 * 用户消息发送队列：顺序投递到云会话、断线后重投、关闭时给未确认的消息回错误。
 */
//@ chunk-fe6rs39h.js:76749-88163 placement
class OutboundMessageQueue {
  ports;
  queueCap;
  queue = [];
  flushing = !1;
  closedWhy = null;
  closedCause = null;
  laterSendsHold = Promise.resolve();
  ledger;
  postsInFlight = new Set();
  forwardsInFlight = new Map();
  sendOutstanding = !1;
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
    return { sends: this.sendCount, forwards: this.forwardCount, maxQueued: this.maxQueued };
  }
  noteOwnUuid(e, n) {
    ((this.queue = this.queue.filter((s) => s.kind === "control" || s.uuid !== e)),
      this.payOwed(
        this.ledger.seed(e, n, n !== void 0 && isControlShapedMessage({ message: { content: n } })),
      ));
  }
  streamEcho(e, n) {
    let streamEcho = this.ledger.streamEcho(e, n);
    if (streamEcho.dequeue) this.queue = this.queue.filter((r) => r.kind === "control" || r.uuid !== e);
    return streamEcho.verdict === "claim"
      ? { verdict: "claim", sent: streamEcho.sent }
      : { verdict: streamEcho.verdict };
  }
  settleOwedEchoes() {
    this.payOwed(this.ledger.settleOwed());
  }
  payOwed(e) {
    let stampedSessionId = this.ports.stampedSessionId();
    e.forEach(({ uuid: uuid, content: content }) =>
      this.contained(() => this.writeEcho(scopeKey(stampedSessionId, uuid, content))),
    );
  }
  wasTaken(e) {
    return this.ledger.wasTaken(e);
  }
  synthesizeMissedEchoes() {
    let truncation = this.ledger.truncation();
    return (this.payOwed(truncation), truncation.length);
  }
  writeEcho(e, n = !1) {
    if (this.ports.emitEcho) {
      this.ports.emitEcho(e, { duplicate: n });
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
    return (
      this.postsInFlight.clear(),
      this.renewalParked.clear(),
      n.forEach((s) => this.failItem(s, e, { posted: !0, unconfirmed: !0 })),
      this.settleOwedEchoes(),
      n.length
    );
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
      this.payOwed(this.ledger.accept(e.uuid, e.kind, e.kind === "message" ? e.content : void 0));
    }
    if (this.closedWhy !== null) {
      if (
        (this.failItem(e, this.closedWhy, { composedHere: this.closedCause === "open_failed" }),
        e.kind !== "control")
      )
        this.logSend(e.kind, "closed");
      return "refused";
    }
    if (e.kind === "message" && hasNonTextContent({ message: { content: e.content } }))
      return (this.failItem(e, Qt), this.logSend(e.kind, "malformed"), "refused");
    if (e.kind === "control" && this.sendOutstanding && this.ports.liveSession() !== null)
      return (this.forwardOutOfBand(e), "new");
    if (this.queue.length >= this.queueCap)
      return (
        this.failItem(e, "too many messages are waiting for the cloud session", { outcome: "overflow" }),
        logEvent("tengu_remote_headless_client_queue_overflow", { kind: fromEnum(e.kind) }),
        "refused"
      );
    if (
      (this.queue.push(e),
      (this.maxQueued = Math.max(this.maxQueued, this.queue.length)),
      this.ports.liveSession() !== null)
    )
      this.ports.track(this.flush().catch(logError));
    return "new";
  }
  async untilNoHold() {
    let e = null;
    while (e !== this.laterSendsHold) ((e = this.laterSendsHold), await e);
  }
  holdLaterSendsBehind(e) {
    this.laterSendsHold = this.laterSendsHold.then(() => e.then(et, et));
  }
  close(e, n) {
    if (this.closedWhy === null) ((this.closedWhy = e), (this.closedCause = n));
    (this.failQueued(this.closedWhy, n), this.settleOwedEchoes());
  }
  async flush() {
    if (this.flushing) return;
    this.flushing = !0;
    try {
      while (this.ports.liveSession() !== null) {
        let e = this.queue[0];
        if (e !== void 0 && e.kind !== "control") {
          if ((await this.untilNoHold(), this.ports.liveSession() === null)) break;
        }
        let n = this.queue.shift();
        if (n === void 0) break;
        try {
          if (n.kind === "control") this.forwardOutOfBand(n);
          else {
            this.sendOutstanding = !0;
            try {
              let post = this.post(n);
              ((this.outstandingSend = post.then(et, et)),
                this.contained(() => this.releaseQueuedForwards()),
                await post);
            } finally {
              this.sendOutstanding = !1;
            }
          }
        } catch (error) {
          this.failAfterInternalError(n, error);
        }
      }
    } finally {
      this.flushing = !1;
    }
  }
  releaseQueuedForwards() {
    let filtered = this.queue.filter((n) => n.kind === "control");
    if (filtered.length === 0) return;
    ((this.queue = this.queue.filter((n) => n.kind !== "control")),
      filtered.forEach((n) => this.forwardOutOfBand(n)));
  }
  forwardOutOfBand(e) {
    let abortController = new AbortController(),
      s =
        e.request.subtype === "cancel_async_message"
          ? Promise.all([this.laterSendsHold, this.outstandingSend]).then(et)
          : this.laterSendsHold;
    this.forwardsWaiting.set(abortController, e);
    let track = this.ports.track(
      s
        .then(() => {
          if (!this.forwardsWaiting.delete(abortController)) return;
          return this.forward(e, abortController);
        })
        .catch((h) => this.failAfterInternalError(e, h, abortController)),
    );
    if (e.holdsLaterSends) this.holdLaterSendsBehind(track);
  }
  failQueued(e, n) {
    let s = [...this.queue, ...this.forwardsWaiting.values()];
    ((this.queue = []), this.forwardsWaiting.clear());
    let r = n === "open_failed";
    if ((s.forEach((h) => this.failItem(h, e, { composedHere: r })), s.length > 0))
      logEvent("tengu_remote_headless_client_queue_dropped", { count: s.length, cause: fromEnum(n) });
    return s.length;
  }
  answerForwardsInFlight(e) {
    let n = sanitizeCloudText(e);
    for (let s of [...this.forwardsInFlight.keys()])
      (this.contained(() => this.ports.emit(controlErrorResponse(s, n))), this.forwardsInFlight.delete(s));
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
    let liveSession = this.ports.liveSession();
    if (liveSession === null) return [];
    let n = new Set(liveSession.manager.heldSendUuids());
    return [...this.postsInFlight].filter(
      (s) => s.kind === "message" && !this.renewalParked.has(s) && n.has(s.uuid),
    );
  }
  queuedMessages() {
    return [...this.queue, ...this.renewalParked].filter((e) => e.kind === "message");
  }
  withdrawQueuedSends() {
    let withdrawHeldSends = this.withdrawHeldSends(),
      n = [...this.queuedSendUuids(), ...withdrawHeldSends];
    return (
      (this.queue = this.queue.filter((r) => r.kind === "control")),
      this.renewalParked.forEach((r) => this.postsInFlight.delete(r)),
      this.renewalParked.clear(),
      n
        .map((r) => [r, this.withdrawFromLedger(r, "interrupt")])
        .filter(([, r]) => r)
        .map(([r]) => r)
    );
  }
  withdrawHeldSends() {
    let liveSession = this.ports.liveSession();
    if (liveSession === null) return [];
    return liveSession.manager.heldSendUuids().filter((n) => this.withdrawHeld(n));
  }
  withdrawHeld(e) {
    let liveSession = this.ports.liveSession(),
      found = [...this.postsInFlight].find((r) => r.uuid === e && !this.renewalParked.has(r));
    if (liveSession === null || found === void 0) return !1;
    if (!liveSession.manager.withdrawHeldSend(e)) return !1;
    return (this.postsInFlight.delete(found), !0);
  }
  withdrawQueuedSend(e) {
    if (typeof e !== "string") return !1;
    let index = this.queue.findIndex((r) => r.kind !== "control" && r.uuid === e),
      found = [...this.renewalParked].find((r) => r.uuid === e);
    if (index === -1 && found === void 0) {
      if (!this.withdrawHeld(e)) return !1;
      return this.withdrawFromLedger(e, "cancel_async_message");
    }
    if (index !== -1) this.queue.splice(index, 1);
    if (found !== void 0) (this.renewalParked.delete(found), this.postsInFlight.delete(found));
    return this.withdrawFromLedger(e, "cancel_async_message");
  }
  withdrawFromLedger(e, n) {
    let withdraw = this.ledger.withdraw(e);
    if (!withdraw)
      this.contained(() =>
        logEvent("tengu_remote_headless_client_cancel_found_delivered", { subtype: fromEnum(n) }),
      );
    return withdraw;
  }
  cancelForward(e) {
    let n = (h) => h.kind === "control" && h.hostRequestId === e,
      filtered = [...this.forwardsWaiting].filter(([, h]) => n(h)),
      r = [...this.queue.filter(n), ...filtered.map(([, h]) => h)];
    if (
      ((this.queue = this.queue.filter((h) => !n(h))),
      filtered.forEach(([h]) => this.forwardsWaiting.delete(h)),
      typeof e === "string")
    )
      this.forwardsInFlight.get(e)?.abort();
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
      if (s !== void 0 && this.forwardsInFlight.get(e.hostRequestId) === s)
        (this.forwardsInFlight.delete(e.hostRequestId), this.failItem(e, r, { outcome: "error" }));
      return;
    }
    if (this.postsInFlight.delete(e)) {
      (this.failItem(e, r, { posted: !0, unconfirmed: !0 }), this.logSend(e.kind, "error"));
      return;
    }
    switch (this.ledger.phaseOf(e.uuid)) {
      case "queued":
        (this.failItem(e, r), this.logSend(e.kind, "error"));
        return;
      case "posting":
        this.failItem(e, r, { posted: !0, unconfirmed: !0 });
        return;
      default:
        return;
    }
  }
  failItem(e, n, { posted: s = !1, unconfirmed: r = !1, outcome: h = "closed", composedHere: y = !1 } = {}) {
    let S = y ? clipCloudText(n) : sanitizeCloudText(n),
      stampedSessionId = this.ports.stampedSessionId();
    switch (e.kind) {
      case "message": {
        let { echo: echo, error: error } = s
          ? this.ledger.postFail(e.uuid, r)
          : { ...this.ledger.giveUp(e.uuid), error: !0 };
        if (!error) {
          logForDebugging(
            `[headlessCloudClient] POST for ${e.uuid} failed after its echo; treating it as delivered`,
          );
          return;
        }
        if (echo) this.contained(() => this.ports.emit(scopeKey(stampedSessionId, e.uuid, e.content)));
        this.contained(() =>
          this.ports.emit(emitLoadError(stampedSessionId, [`${NOT_DELIVERED_MESSAGE}: ${S}`], e.uuid)),
        );
        return;
      }
      case "bash":
        if (s) this.ledger.postFail(e.uuid, r);
        else this.ledger.giveUp(e.uuid);
        this.contained(() =>
          this.ports.emit(
            emitLoadError(stampedSessionId, [
              r ? `bash_command may not have run: ${S}` : `bash_command was not run: ${S}`,
            ]),
          ),
        );
        return;
      case "control":
        (this.contained(() =>
          this.ports.emit(controlErrorResponse(e.hostRequestId, `${e.request.subtype} was not sent: ${S}`)),
        ),
          this.contained(() =>
            logEvent("tengu_remote_headless_client_host_request", {
              subtype: fromEnum(e.telemetrySubtype),
              outcome: fromEnum(h),
            }),
          ));
        return;
    }
  }
  async post(e) {
    let liveSession = this.ports.liveSession();
    if (liveSession === null) {
      (this.failItem(e, tt), this.logSend(e.kind, "closed"));
      return;
    }
    (this.ledger.postStart(e.uuid), this.postsInFlight.add(e));
    let now = this.ports.clock.now(),
      accessToken = liveSession.opened.getAccessToken(),
      postOnce = await this.postOnce(liveSession.manager, e),
      y = !1,
      S = !1;
    if (
      !postOnce.ok &&
      postOnce.status === 401 &&
      liveSession.opened.onAuth401 &&
      this.postsInFlight.has(e)
    ) {
      this.renewalParked.add(e);
      try {
        if (
          ((y =
            (await scheduleTimer(
              this.ports.clock,
              liveSession.opened.onAuth401(accessToken).catch(() => !1),
              oi,
            )) ?? !1),
          y && this.postsInFlight.has(e))
        )
          await this.untilNoHold();
      } finally {
        this.renewalParked.delete(e);
      }
      if (y && this.postsInFlight.has(e)) {
        this.ports.onRepost?.(e);
        let liveSession = this.ports.liveSession();
        ((S = liveSession === null),
          (postOnce =
            liveSession === null
              ? { ok: !1, reason: this.closedWhy ?? "the cloud session disconnected" }
              : await this.postOnce(liveSession.manager, e)));
      }
    }
    if (!this.postsInFlight.delete(e)) {
      let w = !postOnce.ok && postOnce.withheld === !0 && postOnce.reason === WITHDRAWN_2;
      this.contained(() => this.logSend(e.kind, w ? "withdrawn_held" : "abandoned", { renewed: y }));
      return;
    }
    if (postOnce.ok) {
      let { echo: echo } = this.ledger.postOk(
        e.uuid,
        postOnce.duplicate === !0 ? "duplicate" : getProgressStreamability(e),
      );
      if (echo && e.kind === "message")
        this.contained(() =>
          this.writeEcho(
            scopeKey(this.ports.stampedSessionId(), e.uuid, e.content),
            postOnce.duplicate === !0,
          ),
        );
      this.ports.onSent?.(e, { duplicate: postOnce.duplicate === !0 });
    } else if (postOnce.withheld === !0)
      this.failItem(
        e,
        postOnce.reason === CANCELLED || postOnce.reason === WITHDRAWN_2
          ? "it was still waiting to be sent when the cloud client closed"
          : postOnce.reason,
        { posted: !0, unconfirmed: !1 },
      );
    else this.failItem(e, postOnce.reason, { posted: !0, unconfirmed: postOnce.status === void 0 && !S });
    ((this.sendCount += 1),
      this.logSend(e.kind, postOnce.ok ? "ok" : postOnce.withheld === !0 ? "withheld" : "failed", {
        status: postOnce.ok ? void 0 : postOnce.status,
        renewed: y,
        latency_ms: this.ports.clock.now() - now,
      }));
  }
  logSend(e, n, s = {}) {
    logEvent("tengu_remote_headless_client_send", { kind: fromEnum(e), outcome: fromEnum(n), ...s });
  }
  postOnce(e, n) {
    return n.kind === "message"
      ? e.sendMessage(n.content, {
          uuid: n.uuid,
          ...(n.priority && { priority: n.priority }),
          ...(n.pastedContent && { pastedContent: n.pastedContent }),
          ...(n.inlinePastes && { inlinePastes: n.inlinePastes }),
        })
      : e.sendBashCommand({ command: n.command, ...(n.cwd !== void 0 && { cwd: n.cwd }) }, { uuid: n.uuid });
  }
  async forward(e, n) {
    let { telemetrySubtype: telemetrySubtype } = e,
      liveSession = this.ports.liveSession();
    if (liveSession === null || this.forwardsInFlight.has(e.hostRequestId)) {
      this.failItem(e, liveSession === null ? tt : "a request with this request_id is already in flight", {
        outcome: liveSession === null ? "closed" : "duplicate",
      });
      return;
    }
    this.forwardsInFlight.set(e.hostRequestId, n);
    let now = this.ports.clock.now(),
      S = await liveSession.manager.sendControlRequest(e.request, { signal: n.signal }).then(
        (w) => {
          if (this.forwardsInFlight.get(e.hostRequestId) !== n) return "closed";
          return (
            this.ports.emit(controlSuccessResponse(e.hostRequestId, w ?? {})),
            this.forwardsInFlight.delete(e.hostRequestId),
            "forwarded"
          );
        },
        (w) => {
          if (this.forwardsInFlight.get(e.hostRequestId) !== n) return "closed";
          if (w instanceof AbortError) return (this.forwardsInFlight.delete(e.hostRequestId), "cancelled");
          return (
            this.ports.emit(controlErrorResponse(e.hostRequestId, describeForwardFailure(w))),
            this.forwardsInFlight.delete(e.hostRequestId),
            "error"
          );
        },
      );
    ((this.forwardCount += 1),
      logEvent("tengu_remote_headless_client_host_request", {
        subtype: fromEnum(telemetrySubtype),
        outcome: fromEnum(S),
        latency_ms: this.ports.clock.now() - now,
      }));
  }
}
//@ chunk-fe6rs39h.js:88163-88178 placement
function et() {}
//@ chunk-fe6rs39h.js:88178-88316 placement
function getProgressStreamability(e) {
  if (e.kind === "bash") return "streams";
  let n = { message: { content: e.content } };
  return Amo(n) ? "never" : isControlShapedMessage(n) ? "unreliable" : "streams";
}
//@ chunk-fe6rs39h.js:88316-88593 placement
function describeForwardFailure(e) {
  if (e instanceof ControlRequestTimeoutError)
    return `the cloud session did not answer ${e.subtype} in time; it may still apply it`;
  let n = errorMessage(e);
  if (n.startsWith("[RemoteSessionManager]"))
    return (
      logForDebugging(`[headlessCloudClient] forward failed: ${n}`),
      "the cloud session is not connected"
    );
  return sanitizeCloudText(n);
}
//@ chunk-fe6rs39h.js:88593-88855 placement
var MAX_OUTBOX_ENTRIES = 100,
  STARTUP_WATCHDOG_MS = 120000,
  MAX_STARTUP_WAIT_MS = 300000,
  RETRY_DELAYS_MS = [400, 1200],
  CONTROL_TIMEOUT_MS = 5000,
  SEND_TIMEOUT_MS = 5000,
  POLL_MS = 1000,
  MIN_POLL_MS = 500,
  DRAIN_TIMEOUT_MS = 5000,
  DRAIN_DEADLINE_MS = DRAIN_TIMEOUT_MS - 250,
  FLUSH_TIMEOUT_MS = 850,
  FLUSH_DEADLINE_MS = FLUSH_TIMEOUT_MS - 100,
  CLOSE_GRACE_MS = 1000,
  CLIENT_CLOSING_REASON = "the cloud client is closing",
  EXIT_GRACE_MS = 5000,
  IDLE_EXIT_MS = 180000,
  REAL_CLOCK = {
    now: () => Date.now(),
    setTimeout: (e, n) => {
      let s = setTimeout(e, n);
      return () => clearTimeout(s);
    },
  };
//@ chunk-fe6rs39h.js:88855-88879 placement
class ClientClosedError extends Error {}
/**
 * 启动无头云会话客户端并返回 done Promise（由 cloudPrint 与 openBareCloudSession 调用）。
 */
//@ chunk-fe6rs39h.js:88879-88923 placement
function runHeadlessCloudClient(e) {
  return { done: new HeadlessCloudClient(e).done };
}
/**
 * 无头 --cloud 客户端主体：连接云会话、转发宿主 stdin 的 stream-json、处理控制请求/对话/权限、空闲释放与退出码。
 */
//@ chunk-fe6rs39h.js:88923-118745 placement
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
  openRequested = !1;
  inputClosed = !1;
  outputOpen = !0;
  oauthBridgeInstalled = !1;
  undeliveredKindsTold = new Set();
  frames = null;
  liveness = null;
  features = null;
  featureAbort = new AbortController();
  connectEpoch = 0;
  cancelIdleDeadline = null;
  inputClosedAt = null;
  containerStartFailed = !1;
  hostDialogKinds = new Set();
  dialogsNotDeclaredCount = 0;
  dialogsReservedCount = 0;
  endLogged = !1;
  requestedModeChecked = !1;
  hostSentPermissionMode = !1;
  everConnected = !1;
  reconnectingTold = !1;
  connection = "connecting";
  cancelReconnectNotice = null;
  workerInitializeReason = null;
  workerModesSeen = new Set();
  lastWorkerMode = void 0;
  inputFailed = !1;
  signalled = !1;
  transportClosed = null;
  sinceStop = new WeakSet();
  stoppedWhileLive = !1;
  endingWith = null;
  preSessionEchoes = [];
  endsOnStartupResult = !1;
  constructor(e) {
    this.config = e;
    ((this.clock = e.clock ?? REAL_CLOCK),
      (this.workerReadyIdleMs = e.workerReadyIdleMs ?? STARTUP_WATCHDOG_MS),
      (this.startedAt = this.clock.now()),
      (this.done = new Promise((y) => {
        this.resolveDone = y;
      })));
    let n = forwardUntilAbort(e.input, () => {
      this.inputFailed = !0;
    });
    ((this.io = e.createIO ? e.createIO(n, e.replayUserMessages) : new StructuredIO(n, e.replayUserMessages)),
      this.io.setUnexpectedResponseCallback(async (y) => {
        logForDebugging(
          `[headlessCloudClient] dropped control_response for unknown request ${sanitizeCloudText(truncateToLength(String(y.response?.request_id), 64))}`,
        );
      }));
    let s = (y) => this.track(y),
      r = (y) => this.emit(y),
      h = () => (this.phase === "live" ? this.session : null);
    ((this.outbound = new OutboundMessageQueue(
      {
        clock: this.clock,
        replayUserMessages: e.replayUserMessages,
        emit: r,
        emitEcho: (y, { duplicate: duplicate }) => this.writeOwnEcho(y, duplicate),
        track: s,
        liveSession: h,
        stampedSessionId: () => this.stampedSessionId,
        onSent: (y, { duplicate: duplicate }) => {
          if (y.kind !== "message") return;
          if (
            (this.liveness?.noteDelivered(y.content),
            this.features?.noteMessageSent({ uuid: y.uuid, duplicate: duplicate }),
            !duplicate)
          )
            this.liveness?.noteSendOk({ afterStop: !this.stoppedWhileLive || this.sinceStop.has(y) });
        },
        onRepost: (y) => {
          if (y.kind === "message") this.sinceStop.add(y);
        },
      },
      e.queueCap ?? MAX_OUTBOX_ENTRIES,
    )),
      (this.agentRequests = new HostPermissionBridge({ clock: this.clock, io: this.io, track: s })),
      (this.hostRequests = new ControlRequestRelay({
        clock: this.clock,
        initializePolicy: e.initializePolicy,
        ignoredOptionsCount: e.ignoredOptions.length,
        openingInitializeHonours: new Set([...(e.openingInitializeHonours ?? []), "supportedDialogKinds"]),
        outbound: this.outbound,
        emit: r,
        track: s,
        account: () => {
          let y = getAccountInformation();
          return {
            email: y?.email,
            organization: y?.organization,
            subscriptionType: y?.subscription,
            tokenSource: y?.tokenSource,
            apiKeySource: y?.apiKeySource,
            apiProvider: getAPIProvider(),
          };
        },
        openRequested: () => this.openRequested,
        requestOpen: (y) => this.requestOpen(y),
        sleepNotice: async (y) => {
          if ((this.stopAwakeWatch?.(), (this.stopAwakeWatch = null), y === "will_sleep"))
            (this.watchAwake(0, this.clock.now()), await this.features?.noteHostSleep());
          else this.hostWoke();
        },
        liveSession: h,
        pendingSeededPromptUuid: () =>
          this.phase === "awaiting_worker" && this.session?.opened.entry === "create"
            ? this.session.opened.initialPrompt?.uuid
            : void 0,
        interruptMattersBeforeLive: () => {
          let opened = this.opened;
          return opened !== null && (opened.entry === "attach" || opened.initialPrompt !== void 0);
        },
        end: (y) =>
          void this.end(
            y.reason,
            y.reason === "rejected_options" ? y.message : void 0,
            void 0,
            y.reason === "end_session" && this.opened?.controlOnly === !0 ? y.leftFor : void 0,
          ),
        stampedSessionId: () => this.stampedSessionId,
        onInterrupt: () => {
          if (this.phase === "live")
            ((this.stoppedWhileLive = !0),
              (this.sinceStop = new WeakSet([
                ...this.outbound.queuedMessages(),
                ...this.outbound.heldMessages(),
              ])));
          this.liveness?.noteInterrupt();
        },
      })),
      this.installOAuthBridge(),
      (this.drained = this.drainOutbound()),
      this.readInput(),
      (this.unregisterCleanup = registerCleanup(() => this.closeFromSignal())));
  }
  async closeFromSignal() {
    ((this.signalled = !0),
      this.logEnded("signal", this.endingWith?.exitCode ?? 0, this.phase, this.endingWith?.disconnectCode),
      await this.tearDown(tt, "closed"),
      await scheduleTimer(this.clock, this.settleOpener(FLUSH_DEADLINE_MS, "signal"), FLUSH_TIMEOUT_MS),
      this.outbound.abandonPostsInFlight(Xt),
      this.outbound.settleOwedEchoes());
  }
  settleOpener(e, n) {
    return (this.opened?.settle?.(e) ?? Promise.resolve(void 0)).then(
      (s) => {
        if (!s) return;
        (logEvent("tengu_remote_headless_client_seed_cut_short", { at: fromEnum(n) }),
          this.emit(cloudInformationalMessage(this.stampedSessionId, s.level, clipCloudText(s.text))));
      },
      (s) => {
        logForDebugging(`[headlessCloudClient] settling the opener's work failed: ${errorMessage(s)}`);
      },
    );
  }
  initializeWorker(e, n) {
    let filtered = [...this.hostDialogKinds].filter((R) => !isConsentDialogKind(R)),
      r = openingControlRequest(e, filtered);
    if (((this.workerInitializeReason = r), r === null)) return;
    let h = { subtype: "initialize", ...(filtered.length > 0 && { supportedDialogKinds: filtered }) },
      y = (R, k) => {
        logEvent("tengu_remote_headless_client_worker_initialize", {
          reason: fromEnum(r),
          outcome: fromEnum(R.outcome),
          ...("cause" in R && { cause: fromEnum(R.cause) }),
          ...("status" in R && { status: R.status }),
          attempt: k,
          n_dialog_kinds: filtered.length,
        });
      },
      now = this.clock.now(),
      w = async (R) => {
        let abortController = new AbortController(),
          postControlRequest = n.postControlRequest(h, {
            answerExpected: !1,
            background: !0,
            timeoutMs: MAX_STARTUP_WAIT_MS,
            signal: abortController.signal,
          });
        postControlRequest.response.then(
          () => logForDebugging(`[headlessCloudClient] the worker took this client's initialize (${r})`),
          (N) =>
            logForDebugging(
              `[headlessCloudClient] this client's initialize (${r}) was not answered: ${sanitizeCloudText(truncateToLength(errorMessage(N), 200))}`,
            ),
        );
        let posted = await postControlRequest.posted;
        if ((y(posted, R), posted.outcome === "accepted")) return;
        abortController.abort();
        let P = RETRY_DELAYS_MS[R - 1];
        if (P !== void 0 && isRetryableHttpFailure(posted) && this.clock.now() - now < CONTROL_TIMEOUT_MS) {
          if ((await new Promise((N) => this.clock.setTimeout(N, P)), !this.closing)) return w(R + 1);
        }
      };
    this.outbound.holdLaterSendsBehind(w(1));
  }
  async applyOpeningRequests(e, n) {
    for (let { request: request, required: required, describe: describe } of e)
      try {
        (await n.sendControlRequest(request),
          logEvent("tengu_remote_headless_client_opening_request", {
            subtype: fromEnum(request.subtype),
            outcome: fromEnum("applied"),
          }));
      } catch (error) {
        if (
          (logForDebugging(
            `[headlessCloudClient] opening request ${request.subtype} failed: ${sanitizeCloudText(truncateToLength(errorMessage(error), 200))}`,
          ),
          logEvent("tengu_remote_headless_client_opening_request", {
            subtype: fromEnum(request.subtype),
            outcome: fromEnum(required ? "refused_required" : "refused_optional"),
          }),
          required)
        )
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
      if (
        (setSdkOAuthTokenRefreshCallback(() => this.io.requestOAuthTokenRefresh()),
        hostSessionsBearerOffered())
      )
        setHostSessionsBearerSource({
          ask: () => this.io.requestHostSessionsBearer(),
          isSignInToken: isClaudeAISignInToken,
          hasSignIn: isClaudeAIOAuthTokenHostInjected,
        });
      this.oauthBridgeInstalled = !0;
    }
  }
  async drainOutbound() {
    for await (let e of this.io.outbound)
      try {
        await this.io.write(e);
      } catch (error) {
        (logError(error), this.end("output_failed", `failed to write to stdout: ${errorMessage(error)}`));
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
      (this.inflight.delete(e), this.detachIfDrained());
    };
    return (
      e.then(n, (s) => {
        (logError(s), n());
      }),
      e
    );
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
      this.inputFailed = !0;
    }
    if (this.inputFailed) this.agentRequests.cancelAll();
    if (
      ((this.inputClosed = !0),
      (this.inputClosedAt = this.clock.now()),
      logForDebugging("[headlessCloudClient] stdin closed"),
      !this.openRequested && this.phase === "pre_session")
    ) {
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
        if (n) this.requestedModeChecked = !0;
        if (this.hostRequests.handleControlRequest(e) === "forwarded" && n) this.hostSentPermissionMode = !0;
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
        let n = "request_id" in e ? e.request_id : void 0;
        if (typeof n === "string") this.emit(controlErrorResponse(n, CLIENT_CLOSING_REASON));
        return;
      }
      default:
        logForDebugging(`[headlessCloudClient] ignoring ${e.type} frame while closing`);
    }
  }
  hostFrameUuid(e) {
    if (!("uuid" in e) || e.uuid === void 0 || e.uuid === null) return;
    let n = Vt(e.uuid);
    return n === null ? "invalid" : n.toLowerCase();
  }
  submitUserMessage(e) {
    let hostFrameUuid = this.hostFrameUuid(e),
      s = "message" in e ? e.message : void 0,
      r = typeof s === "object" && s !== null && "content" in s ? s.content : void 0;
    if (hostFrameUuid === "invalid")
      return (
        this.emit(
          emitLoadError(this.stampedSessionId, [
            "Your message was not delivered to the cloud session: its uuid must be a UUID",
          ]),
        ),
        !1
      );
    if (typeof r !== "string" && !Array.isArray(r))
      return (
        this.emit(
          emitLoadError(
            this.stampedSessionId,
            [
              "Your message was not delivered to the cloud session: its content must be a string or content blocks",
            ],
            hostFrameUuid,
          ),
        ),
        !1
      );
    if (Array.isArray(r) && hasNonTextContent({ message: { content: r } }))
      return (
        this.emit(
          emitLoadError(
            this.stampedSessionId,
            [`Your message was not delivered to the cloud session: ${Qt}`],
            hostFrameUuid,
          ),
        ),
        !1
      );
    let h = Jvt("priority" in e ? e.priority : void 0),
      y = "pasted_content" in e ? e.pasted_content : void 0,
      S = "inline_pastes" in e ? e.inline_pastes : void 0,
      w = { pastedContent: y, inlinePastes: S, rows: [] },
      R = {
        kind: "message",
        content: r,
        uuid: hostFrameUuid ?? randomUUID_2(),
        ...(h !== void 0 && { priority: h }),
        ...(Array.isArray(w.pastedContent) && { pastedContent: w.pastedContent }),
        ...(Array.isArray(w.inlinePastes) && { inlinePastes: w.inlinePastes }),
      },
      submit = this.outbound.submit(R);
    if (submit === "new" && !this.closing) this.sinceStop.add(R);
    if (submit === "new") w.rows.forEach((row) => logFeatureSad("sdk_pasted_content", row));
    return !0;
  }
  submitBashCommand(e) {
    let hostFrameUuid = this.hostFrameUuid(e),
      s = "command" in e ? e.command : void 0,
      r = "cwd" in e ? e.cwd : void 0,
      h = (y) => (this.emit(emitLoadError(this.stampedSessionId, [y])), !1);
    if (hostFrameUuid === "invalid") return h("bash_command was not run: its uuid must be a UUID");
    if (typeof s !== "string") return h("bash_command was not run: it needs a string command");
    if (r !== void 0 && typeof r !== "string") return h("bash_command was not run: its cwd must be a string");
    return (
      this.outbound.submit({
        kind: "bash",
        command: s,
        ...(r !== void 0 && { cwd: r }),
        uuid: hostFrameUuid ?? randomUUID_2(),
      }),
      !0
    );
  }
  writeOwnEcho(e, n = !1) {
    if (this.frames) this.frames.writeOwnEcho(e, { duplicate: n });
    else if (
      this.phase === "pre_session" &&
      this.preSessionEchoes.length < (this.config.queueCap ?? MAX_OUTBOX_ENTRIES)
    )
      this.preSessionEchoes.push(e);
    else this.emit(e);
  }
  releasePreSessionEchoes(e) {
    this.preSessionEchoes.splice(0).forEach((s) => {
      let r = { ...s, session_id: this.stampedSessionId };
      if (e) e.writeOwnEcho(r);
      else this.emit(r);
    });
  }
  requestOpen(e) {
    if (this.openRequested || this.phase !== "pre_session" || this.signalled) return;
    ((this.openRequested = !0),
      (this.hostDialogKinds = new Set(sanitizeStringList(e?.supportedDialogKinds))),
      this.track(this.openSession(e)));
  }
  async openSession(e) {
    let n;
    try {
      n = await this.config.openSession({
        initialize: e,
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
      (logError(error), (n = { kind: "failed", message: errorMessage(error) }));
    }
    if (this.phase !== "pre_session" || this.signalled) {
      if (
        (logForDebugging("[headlessCloudClient] session opened after the client ended; not attaching"),
        n.kind === "opened")
      ) {
        if (
          (logEvent("tengu_remote_headless_client_open_discarded", { entry: fromEnum(n.session.entry) }),
          n.session.entry === "attach")
        )
          n.session.preflightCheck?.catch(() => {});
        await n.session.dispose?.().catch((s) => {
          logForDebugging(`[headlessCloudClient] discarded session not released: ${errorMessage(s)}`);
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
      if ((logError(error), n.session.entry === "attach")) n.session.preflightCheck?.catch(() => {});
      (this.featureAbort.abort(),
        (this.features = null),
        await n.session.dispose?.().catch(() => {}),
        this.failOpen(errorMessage(error)));
    }
  }
  failOpen(e, n) {
    if (
      ((this.endsOnStartupResult = n !== void 0 && isStartupFailureResultRequested()),
      this.releasePreSessionEchoes(this.frames),
      this.frames?.close(),
      this.outbound.close(e, "open_failed"),
      this.endsOnStartupResult)
    )
      this.emit(
        buildStartupFailureResult({
          sessionId: startupResultSessionId(getSessionId()),
          message: openSessionErrorMessage(e),
          reason: n,
        }),
      );
    this.end(n === void 0 ? "open_failed" : "start_refused", e);
  }
  attach(e) {
    if (
      e.entry === "create" &&
      e.initialPrompt !== void 0 &&
      e.initialPrompt.uuid !== e.initialPrompt.uuid.toLowerCase()
    )
      logForDebugging(
        "[headlessCloudClient] the seeded prompt uuid is not canonical lowercase; host redeliveries of it will not be recognised and will be sent again",
        { level: "warn" },
      );
    this.connectEpoch = this.clock.now();
    let n = ADt(toInfraSessionId(e.sessionId)),
      s = new CloudStreamFilter(
        {
          clock: this.clock,
          includePartialMessages: this.config.includePartialMessages,
          emit: (D) => this.emit(D),
          outbound: this.outbound,
          cloudSession: () => this.readCloudSession(),
          summaryLine: (D) => {
            let W = buildSyncStatusFromRemote(D, void 0);
            return W.projectFiles?.mark === "pending" ||
              jxs(D) ||
              Object.values(this.features?.reports() ?? {}).some((te) => te.pending)
              ? ""
              : formatSyncStatusLine(W);
          },
          onWorkerReady: (D) => this.markWorkerReady(D),
          onWorkerInit: (D) => this.features?.noteWorkerInit(D),
          onTurnInFlight: () => this.features?.noteTurnInFlight(),
          onTurnEnded: () => this.features?.noteTurnEnded(),
          onWorkerUp: (D) => {
            (this.features?.noteWorkerUp(D),
              logEvent("tengu_remote_headless_client_worker_up", {
                generation: D.generation,
                session_mode: fromEnumOpt(D.sessionMode),
              }));
          },
          onWorkerSessionId: (D) => this.features?.noteSessionCleared(D),
          onProvisioning: (D, W) => this.liveness?.noteProvisioning(D, W),
        },
        {
          entry: e.entry,
          initialSessionId: n,
          connectEpoch: this.connectEpoch,
          writesStatusBeforeInit: e.controlOnly === !0,
        },
      );
    ((this.frames = s),
      this.guarded(() => e.onDerivedSessionId(n)),
      e.notices?.forEach((D) =>
        this.emit(cloudInformationalMessage(this.stampedSessionId, D.level, clipCloudText(D.text))),
      ),
      this.releasePreSessionEchoes(s));
    let r = new BootstrapWatchdog(
      {
        clock: this.clock,
        emit: (D) => this.emit(D),
        stampedSessionId: () => this.stampedSessionId,
        reconnect: () => this.session?.manager.reconnect(),
        queuedSendCount: () => this.outbound.queuedSendUuids().length,
        sessionId: e.sessionId,
        essentialTrafficOnly: isEssentialTrafficOnly(),
        controlOnly: e.controlOnly === !0,
        api: { markSessionRead: markSessionRead, updateSessionTitle: updateSessionTitle },
      },
      { titleFromFirstMessage: e.entry === "create" && !e.hasTitle },
    );
    this.liveness = r;
    let h = new HeadlessFeatureHandles();
    ((this.features = h),
      h.adopt(e.featureHandles ?? []),
      h.onEachSettled(() => {
        if (!this.closing) (s.offerSummary(), s.noteCloudSessionChanged());
      }),
      h.onEachReportChanged(() => {
        if (!this.closing) s.noteCloudSessionChanged();
      }),
      e.onCloudSessionChanged?.(() =>
        this.guarded(() => {
          if (!this.closing) s.noteCloudSessionChanged();
        }),
      ));
    let y = e.eventSigner === void 0 ? !1 : void 0;
    e.eventSigner?.then(
      (D) => {
        y = D !== void 0;
      },
      () => {
        y = !1;
      },
    );
    let S = new Set(),
      callbacks = h.callbacks({
        onMessage: (D, W = {}) => this.guarded(() => this.handleSessionFrame(s, D, W)),
        onPermissionRequest: (D, W, te) =>
          this.guarded(() => {
            if (this.session !== null && this.phase !== "ending") {
              if (te?.reinstated === !0) this.agentRequests.reinstate(W);
              let manager = this.session.manager;
              if (e.controlOnly !== !0 && !normalizeCanUseToolRequest(D)) {
                (logEvent("tengu_remote_headless_client_malformed_ask", {}),
                  manager.respondToPermissionRequest(W, parsePermissionRequest(D)));
                return;
              }
              let ee = dce() && KNe(D.tool_name),
                se = !ee && isServedCallWatchEnabled() && m2(D.tool_name);
              if (se && !isComputerFolderTarget(D.input)) {
                if ((logEvent("tengu_remote_headless_client_malformed_ask", {}), e.controlOnly !== !0))
                  manager.respondToPermissionRequest(W, parsePermissionRequest(D));
                return;
              }
              let x = ee && e.hostAnswersUnattended !== !0 ? deviceProofState(D, y) : void 0;
              if (x !== void 0) {
                if (
                  (logForDebugging(
                    `[headlessCloudClient] not passing a repository-trust question to the host (${x})`,
                    { level: "warn" },
                  ),
                  x === "proves_no_device")
                ) {
                  if ((r.notePermissionRequestOpened(W), e.controlOnly !== !0 && !S.has(W)))
                    (S.add(W),
                      this.emit(
                        cloudInformationalMessage(
                          this.stampedSessionId,
                          "notice",
                          REMOTE_TOOLS_CONSENT_TEXT["repository_trust.prompt.answer_elsewhere"](
                            getRemoteSessionUrl(e.sessionId),
                          ),
                        ),
                      ));
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
          (this.agentRequests.cancel(D), r.notePermissionRequestClosed(D));
        },
        onUserDialogRequest: (D, W, te) =>
          this.guarded(() => {
            if (this.session === null || this.phase === "ending") return;
            if (isConsentDialogKind(D.dialog_kind)) {
              (this.dialogsReservedCount++,
                logForDebugging(
                  `[headlessCloudClient] not passing a ${sanitizeCloudText(truncateToLength(String(D.dialog_kind), 64))} dialog to the host: that kind is this client's own question, never the cloud session's`,
                ));
              return;
            }
            if (!this.hostDialogKinds.has(D.dialog_kind)) {
              this.dialogsNotDeclaredCount++;
              let X = sanitizeCloudText(truncateToLength(String(D.dialog_kind), 64));
              (logForDebugging(
                `[headlessCloudClient] not passing a ${X} dialog to the host: its initialize did not declare the kind`,
              ),
                this.emit(
                  cloudInformationalMessage(
                    this.stampedSessionId,
                    "notice",
                    `The cloud session is waiting on a ${X} dialog this host did not declare it can show; it continues when another client answers it or the session's dialog timeout passes.`,
                  ),
                ));
              return;
            }
            if (te?.reinstated === !0) this.agentRequests.reinstate(W);
            this.agentRequests.passUserDialogRequest(this.session.manager, D, W);
          }),
        onUserDialogCancelled: (D) => this.agentRequests.cancel(D),
        onConnected: (D) =>
          this.guarded(() => {
            this.logStream("connected");
            let everConnected = this.everConnected;
            if (
              ((this.connection = "live"),
              s.noteCloudSessionChanged(),
              this.features?.noteStreamConnected(D),
              (this.everConnected = !0),
              everConnected)
            )
              this.recheckServeOnlyLink(e);
            if ((this.cancelReconnectNotice?.(), (this.cancelReconnectNotice = null), this.reconnectingTold))
              ((this.reconnectingTold = !1),
                this.emit(cloudInformationalMessage(this.stampedSessionId, "notice", "Reconnected.")));
          }),
        onReconnecting: () =>
          this.guarded(() => {
            if (
              (this.logStream("reconnecting"),
              (this.connection = "reconnecting"),
              s.noteCloudSessionChanged(),
              this.closing ||
                !this.everConnected ||
                this.reconnectingTold ||
                this.cancelReconnectNotice !== null)
            )
              return;
            this.cancelReconnectNotice = this.clock.setTimeout(() => {
              ((this.cancelReconnectNotice = null),
                (this.reconnectingTold = !0),
                this.emit(
                  cloudInformationalMessage(
                    this.stampedSessionId,
                    "notice",
                    "Lost the connection to the cloud session \u2014 reconnecting\u2026",
                  ),
                ));
            }, SEND_TIMEOUT_MS);
          }),
        onCatchUpTruncated: () =>
          this.guarded(() => {
            (s.releaseHeld(), (this.requestedModeChecked = !0));
            let synthesizeMissedEchoes = this.outbound.synthesizeMissedEchoes();
            (this.logStream("catch_up_truncated", { missed_echoes: synthesizeMissedEchoes }),
              this.emit(
                cloudInformationalMessage(
                  this.stampedSessionId,
                  "warning",
                  "Some earlier messages from this session could not be loaded after reconnecting.",
                ),
              ));
          }),
        onToolHostEnded: (D) =>
          this.guarded(() => {
            if (e.controlOnly !== !0) {
              logForDebugging(
                "[headlessCloudClient] tool_host_ended ignored: this client is not a serve-only helper",
              );
              return;
            }
            if (D.reason === CONNECTION_EXPIRED && e.resumeLinkHere !== void 0) {
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
            (this.undeliveredKindsTold.add(W),
              this.emit(
                cloudInformationalMessage(
                  this.stampedSessionId,
                  "warning",
                  formatUndeliveredAnswerNotice(W, te),
                ),
              ));
          }),
        onError: (D) => logForDebugging(`[headlessCloudClient] stream error: ${D.message}`),
      }),
      homeSeed = h.homeSeed(),
      k = {
        sessionId: e.sessionId,
        getAccessToken: e.getAccessToken,
        consoleProfileBearer: e.consoleProfileBearer,
        onAuth401: e.onAuth401,
        orgUuid: e.orgUuid,
        ...{},
        ...(e.eventSigner && { eventSigner: e.eventSigner }),
        ...(homeSeed && { homeSeed: homeSeed, homeSeedHoldsFirstSend: e.entry === "create" }),
        ...(e.controlOnly === !0 && { controlOnly: !0 }),
        trackSendsInFlight: !0,
        keepUndeliveredResponses: !0,
        nameToolOnPermissionAllow: !0,
        rearmRedeliveredPermissionRequests: !0,
        ignoreErrorShapedDialogReplies: !0,
        nameRepositoryTrustAnswers: dce(),
        pinComputerFolderAllow: isServedCallWatchEnabled,
        keepOwnModelSwitchBreadcrumb: !0,
        keepStreamRedialling: e.cloudSession().device.status === "bound",
        ...(e.entry === "create"
          ? { initialPromptUuid: e.initialPrompt?.uuid }
          : {
              isAttachToExisting: !0,
              initialSequenceNum: e.initialSequenceNum ?? void 0,
              preflightCheck: e.preflightCheck,
            }),
      },
      I = e.createManager ? e.createManager(k, callbacks) : new RemoteSessionManager(k, callbacks),
      sendWait = h.sendWait();
    if (sendWait !== null)
      I.addSendGate((D) => Promise.race([sendWait(), D.released, D.withdrawn, D.decided]), {
        onRelease: "send",
      });
    let P = e.dirSync?.sync.sendGate?.bind(e.dirSync.sync);
    if (P !== void 0) I.addSendGate((D) => P(D), { onRelease: "withhold" });
    if (
      ((this.session = { manager: I, opened: e }),
      (this.opened = e),
      h.noteSession({
        sessionId: e.sessionId,
        manager: I,
        clock: this.clock,
        ...(e.controlOnly === !0 && {
          endServing: (D) =>
            void (D === "idle"
              ? this.end(
                  "idle_released",
                  `Cloud session ${e.sessionId} ran nothing on this computer for its idle limit; letting it go. It can ask for this folder again.`,
                  void 0,
                  D,
                )
              : this.end("end_session", void 0, void 0, D)),
        }),
      }),
      e.entry === "create" && e.initialPrompt)
    )
      this.outbound.noteOwnUuid(e.initialPrompt.uuid, e.initialPrompt.content);
    let N = e.entry === "attach" && (e.preflightCheck !== void 0 || (e.openingRequests?.length ?? 0) > 0);
    ((this.phase = e.entry === "create" || N ? "awaiting_worker" : "live"), I.connect());
    let L = e.entry === "create" ? e.requestedPermissionMode : void 0;
    if (L !== void 0)
      this.outbound.holdLaterSendsBehind(
        syncRemotePermissionMode({
          manager: I,
          mode: L,
          surface: "headless",
          sessionId: e.sessionId,
          superseded: () => this.session?.manager !== I || this.hostSentPermissionMode,
          observedMode: () => this.lastWorkerMode,
          seededModeReported: () => this.workerModesSeen.has(L),
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
      : void 0;
    if (
      (r.attachStatusFeeds([void 0, ...h.statusFeeds()], () => {
        if (!this.closing) (s.offerSummary(), s.noteCloudSessionChanged());
      }),
      e.entry === "create")
    )
      r.armStallWarning();
    if (this.phase === "live") r.noteWorkerReady();
    z?.then(
      () => this.markWorkerReady("preflight"),
      (D) => {
        (logForDebugging(
          `[headlessCloudClient] attach preflight failed: ${sanitizeCloudText(truncateToLength(errorMessage(D), 200))}`,
        ),
          this.end(
            "disconnected",
            D instanceof ClientClosedError ? D.message : cloudDisconnectMessage("attach_rejected"),
            "attach_rejected",
          ));
      },
    );
    let cloudSession = this.readCloudSession(),
      reports = h.reports();
    if (
      (logEvent("tengu_remote_headless_client_started", {
        entry: fromEnum(e.entry),
        device_status: fromEnumOpt(cloudSession?.device.status),
        sync_state: fromEnumOpt(cloudSession?.directory_sync.state),
        sync_reason: Oi(cloudSession?.directory_sync.reason),
        ignored_count: this.config.ignoredOptions.length,
        ...notAppliedCounts(cloudSession?.not_applied ?? []),
        replay_user_messages: this.config.replayUserMessages,
        include_partial_messages: this.config.includePartialMessages,
        initialize_policy: fromEnum(this.config.initializePolicy),
        has_dir_sync: !1,
        has_home_seed: homeSeed !== void 0,
        worker_initialize: fromEnum(this.workerInitializeReason ?? "none"),
        machine_features: h.handles().length,
        ...Object.fromEntries(
          HEADLESS_FEATURE_NAMES.map((D) => [`feature_${D}`, fromEnumOpt(reports[D]?.state)]),
        ),
        serving_state: fromEnumOpt(cloudSession?.serving?.state),
        serving_reason: fromEnumOpt(cloudSession?.serving?.reason),
        oauth_bridge: this.oauthBridgeInstalled,
      }),
      this.phase === "live")
    )
      this.goLive(I);
    else if (e.entry === "create") this.armIdleDeadline();
  }
  goLive(e) {
    (this.track(this.hostRequests.sendPendingInterrupt(e).then(() => this.outbound.flush())),
      this.features?.noteWorkerLive());
  }
  recheckServeOnlyLink(e) {
    let stillLinkedHere = e.stillLinkedHere;
    if (e.controlOnly !== !0 || stillLinkedHere === void 0) return;
    stillLinkedHere().then(
      async (s) => {
        if (s === !1 && !this.closing) await this.resumeServeOnlyLinkOrEnd(e, void 0);
      },
      (s) => {
        logForDebugging(`[headlessCloudClient] re-reading the serve-only link threw: ${errorMessage(s)}`);
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
    let e = this.readCloudSession()?.serving?.state;
    return e === "on" || e === "pending";
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
    if ((this.liveness?.noteInbound(n), n.type === "result")) {
      if ((this.features?.noteReply(this.featureAbort.signal), !this.closing)) e.offerSummary();
    }
    if (e.handle(n, s) && this.phase === "awaiting_worker" && this.opened?.entry === "create")
      this.armIdleDeadline();
    if (n.type === "system" && "permissionMode" in n) {
      let h = parsePermissionMode(n.permissionMode);
      if (h !== void 0) ((this.lastWorkerMode = h), this.workerModesSeen.add(h));
    }
    if (n.type === "system" && n.subtype === "init")
      (this.checkRequestedPermissionMode(n.permissionMode), this.logWorkerInit(n));
  }
  logWorkerInit(e) {
    try {
      this.builtInNames ??= new Set(this.config.builtInToolNames?.() ?? []);
    } catch (error) {
      ((this.builtInNames = new Set()),
        logForDebugging(
          `[headlessCloudClient] built-in tool names could not be read: ${sanitizeCloudText(truncateToLength(errorMessage(error), 200))}`,
        ));
    }
    logForDebugging(logCloudWorkerInit(e, this.builtInNames));
  }
  checkRequestedPermissionMode(e) {
    if (this.requestedModeChecked) return;
    this.requestedModeChecked = !0;
    let n = this.opened?.entry === "create" ? this.opened.requestedPermissionMode : void 0;
    if (n === void 0 || typeof e !== "string") return;
    let s = parsePermissionMode(e),
      r = s === void 0 ? void 0 : toExternalPermissionMode(s);
    if (r === n) return;
    let h = `The cloud session did not apply the ${n} permission mode requested when it was created; it is in ${r ?? sanitizeCloudText(truncateToLength(e, 24))} mode.`;
    (this.emit(cloudInformationalMessage(this.stampedSessionId, "warning", h)),
      logEvent("tengu_remote_headless_client_mode_not_applied", {
        requested: fromEnum(n),
        actual: fromEnumOpt(r),
      }),
      logForDebugging(`[headlessCloudClient] ${h}`, { level: "warn" }));
  }
  readCloudSession() {
    try {
      let e = this.opened?.cloudSession(),
        n = this.features?.reports() ?? {};
      return e === void 0
        ? e
        : Object.assign({}, n, ...Object.values(n).map((s) => s.facts), { connection: this.connection }, e);
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
    if (
      ((this.containerStartFailed ||= e === "step_failed"),
      this.phase !== "awaiting_worker" || this.session === null)
    )
      return;
    ((this.phase = "live"),
      this.cancelIdleDeadline?.(),
      (this.cancelIdleDeadline = null),
      this.liveness?.noteWorkerReady());
    let queuedCount = this.outbound.queuedCount;
    (this.goLive(this.session.manager),
      logEvent("tengu_remote_headless_client_worker_ready", {
        via: fromEnum(e),
        wait_ms: this.clock.now() - this.connectEpoch,
        queued: queuedCount,
      }));
  }
  armIdleDeadline() {
    if ((this.cancelIdleDeadline?.(), this.signalled)) {
      this.cancelIdleDeadline = null;
      return;
    }
    this.cancelIdleDeadline = this.clock.setTimeout(() => {
      ((this.cancelIdleDeadline = null), this.markWorkerReady("idle_deadline"));
    }, this.workerReadyIdleMs);
  }
  logStream(e, n = {}) {
    logEvent("tengu_remote_headless_client_stream", { transition: fromEnum(e), ...n });
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
    if (this.features?.noteHostWake() === !0)
      this.guarded(() => this.session?.manager.reconnectAfterSuspend());
  }
  watchAwake(e, n) {
    this.stopAwakeWatch = this.clock.setTimeout(() => {
      let now = this.clock.now(),
        r = now - n > EXIT_GRACE_MS * 2 ? 0 : e + (now - n);
      if (r < IDLE_EXIT_MS) {
        this.watchAwake(r, now);
        return;
      }
      ((this.stopAwakeWatch = null), logFeatureSad("rtc_sleep_notice", "no_wake_word"), this.hostWoke());
    }, EXIT_GRACE_MS);
  }
  closeTransport() {
    if (this.transportClosed !== null) return this.transportClosed;
    (this.stopAwakeWatch?.(), (this.stopAwakeWatch = null));
    let session = this.session;
    if (session === null)
      return (
        (this.transportClosed = scheduleTimer(
          this.clock,
          this.liveness?.stop() ?? Promise.resolve(),
          POLL_MS,
        ).then(() => {})),
        this.transportClosed
      );
    return (
      (this.session = null),
      (this.transportClosed = (async () => {
        (await this.hostRequests.issuePendingInterrupt(session.manager).catch(() => {}),
          await this.hostRequests.interruptIssued.catch(() => {}));
        let n = scheduleTimer(this.clock, this.liveness?.stop() ?? Promise.resolve(), POLL_MS);
        (await session.manager.releaseHeldSends(void 0, { exiting: !0, final: !0 }).catch(() => {}),
          await session.manager.flushSends(CLOSE_GRACE_MS).catch(() => {}),
          session.manager.disconnect(),
          await n);
      })()),
      this.transportClosed
    );
  }
  async tearDown(e, n, s) {
    if (
      (this.liveness?.halt(),
      this.cancelIdleDeadline?.(),
      (this.cancelIdleDeadline = null),
      this.cancelReconnectNotice?.(),
      (this.cancelReconnectNotice = null),
      this.featureAbort.abort(),
      this.releasePreSessionEchoes(this.frames),
      this.frames?.close(),
      this.outbound.close(e, n),
      this.outbound.answerForwardsInFlight(e),
      this.agentRequests.cancelAll(),
      await scheduleTimer(
        this.clock,
        this.features?.dispose(s === void 0 ? {} : { leftFor: s }) ?? Promise.resolve(),
        MIN_POLL_MS,
      ),
      await this.closeTransport().catch((r) => {
        logForDebugging(`[headlessCloudClient] transport close failed: ${errorMessage(r)}`);
      }),
      this.oauthBridgeInstalled)
    )
      (setSdkOAuthTokenRefreshCallback(null), setHostSessionsBearerSource(null));
  }
  logEnded(e, n, s, r) {
    if (this.endLogged) return;
    this.endLogged = !0;
    let stats = this.outbound.stats,
      y = this.liveness?.stats;
    if (
      (logEvent("tengu_remote_headless_client_ended", {
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
        peer_tool_use_omitted: this.frames?.counts.peerToolUseOmitted ?? !1,
        cloud_session_keys_dropped: this.frames?.counts.cloudSessionKeysDropped ?? 0,
        tags_reserved_dropped: this.frames?.counts.reservedTagsDropped ?? 0,
        proto_members_dropped: this.frames?.counts.protoMembersDropped ?? 0,
        service_events_dropped: this.frames?.counts.serviceEventsDropped ?? 0,
        unknown_frames_dropped: this.frames?.counts.unknownFramesDropped ?? 0,
        peer_frames_dropped_before_init: this.frames?.counts.peerFramesDroppedBeforeInit ?? 0,
        results_before_init: this.frames?.counts.resultsBeforeInit ?? 0,
        input_failed: this.inputFailed,
        watchdog_fires: y?.watchdog_fires ?? 0,
        title: fromEnum(y?.title ?? "not_applicable"),
        lines_written: y?.lines_written ?? 0,
        lines_tagged: y?.lines_tagged ?? 0,
        lines_suppressed: y?.lines_suppressed ?? 0,
        eof_to_end_ms: this.inputClosedAt === null ? void 0 : this.clock.now() - this.inputClosedAt,
      }),
      this.containerStartFailed)
    )
      logFeatureBad("remote_headless_client", "container_start_failed");
    else if (e === "start_refused") logFeatureSad("remote_headless_client", e);
    else if (n !== 0) logFeatureBad("remote_headless_client", e);
    else if (this.inputFailed) logFeatureSad("remote_headless_client", "input_failed");
    else logFeatureOk("remote_headless_client");
  }
  async end(e, n, s, r) {
    if (this.phase === "ending" || this.phase === "ended") return;
    let h = e === "disconnected" ? (s ?? cloudDisconnectReason(void 0)) : void 0,
      y = exitForReason(e, n, h),
      exitCode = y.exitCode,
      phase = this.phase;
    ((this.phase = "ending"), (this.endingWith = { exitCode: exitCode, disconnectCode: h }));
    try {
      (await this.tearDown(
        e === "disconnected" ? "the cloud session disconnected" : tt,
        e === "disconnected" ? "disconnected" : "closed",
        r,
      ),
        await scheduleTimer(
          this.clock,
          Promise.allSettled([...this.inflight, this.settleOpener(DRAIN_DEADLINE_MS, "end")]),
          DRAIN_TIMEOUT_MS,
        ),
        this.outbound.abandonPostsInFlight(Xt),
        this.outbound.settleOwedEchoes());
    } catch (error) {
      if (error instanceof AbortError) logForDebugging("[headlessCloudClient] teardown aborted");
      else logError(error);
      await this.closeTransport().catch(() => {});
    }
    (this.logEnded(e, exitCode, phase, h),
      (this.outputOpen = !1),
      this.io.outbound.done(),
      await this.drained,
      (this.phase = "ended"),
      this.unregisterCleanup(),
      this.resolveDone(y));
  }
}
//@ chunk-fe6rs39h.js:118745-118773 placement
var CONNECTION_EXPIRED = "connection expired";
//@ chunk-fe6rs39h.js:118773-118910 placement
function sessionNoLongerUsesComputer(e, n) {
  let s = n === void 0 || n === "" ? "" : ` (${sanitizeCloudText(truncateToLength(n, 64))})`;
  return `Cloud session ${e} no longer uses this computer${s}; stopping.`;
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
  if (e.entry === "create") return e.initialPrompt === void 0 && n.length > 0 ? "declare_dialog_kinds" : null;
  return e.workerAwaitsAnswer === !0 ? "rearm_parked_prompt" : null;
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
  let r = s ?? cloudDisconnectReason(void 0);
  switch (e) {
    case "stdin_eof":
    case "end_session":
      return n === void 0 ? { exitCode: 0, reason: e } : { exitCode: 0, reason: e, message: n };
    case "tool_host_ended":
    case "idle_released":
      return { exitCode: 0, reason: e, message: clipCloudText(n ?? e) };
    case "disconnected":
      return {
        exitCode: 1,
        reason: e,
        disconnectCode: r,
        message: sanitizeCloudText(n ?? cloudDisconnectMessage(r)),
      };
    case "rejected_options":
      return { exitCode: 1, reason: e, message: clipCloudText(n ?? e) };
    case "open_failed": {
      let h = clipCloudText(n ?? "") || "Unable to open the cloud session";
      return { exitCode: 1, reason: e, message: h.startsWith("Error: ") ? h : `Error: ${h}` };
    }
    case "start_refused":
      return { exitCode: 1, reason: e, message: openSessionErrorMessage(n) };
    case "output_failed":
      return { exitCode: 1, reason: e, message: sanitizeCloudText(n ?? e) };
  }
}
//@ chunk-fe6rs39h.js:119963-120032 placement
function openSessionErrorMessage(e) {
  return clipCloudText(e ?? "") || "Unable to open the cloud session";
}
//@ chunk-fe6rs39h.js:120032-120153 placement
function controlRequestSubtype(e) {
  let n = "request" in e ? e.request : void 0;
  return typeof n === "object" && n !== null && "subtype" in n ? n.subtype : void 0;
}
//@ chunk-fe6rs39h.js:120153-120323 placement
function notAppliedCounts(e) {
  return {
    not_applied_lost: count(e, ({ kind: kind }) => kind === "lost"),
    not_applied_kept: count(e, ({ kind: kind }) => kind === "kept"),
    not_applied_preference: count(e, ({ kind: kind }) => kind === "preference"),
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
function Oi(e) {
  if (e === void 0) return;
  return fromEnumOpt(DIR_SYNC_OFF_REASONS.find((n) => n === e)) ?? lit("engine");
}

export { runHeadlessCloudClient };

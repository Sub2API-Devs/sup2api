/**
 * cli/remoteIO.ts
 *
 * 沿用旧版路径（门面模块 RemoteIO）：云 worker 的 SDK 输入输出（事件流、认证、交接）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/remoteIO.ts
 * pieces: chunk-z4g2ta8k.js (53)
 * attribution: placement 53
 */
import { PassThrough } from "stream";
import { URL as Zn, URL as As } from "url";
import { fstatSync, createWriteStream } from "fs";
import { xKs, C6n } from "./transports/streamEventCoalescing.js";
import { DoctorLazy } from "./handlers/util.js";
import { zodStrictObject, Ue, o, E } from "../../vendor/zod/v4/classic/schemas.js";
import {
  attestedRequestSubtype,
  turnHandoffAvailableMessage,
  BNt,
  waitForTurnPromptUploads,
  turnHandoffRegistration,
  aQe,
  logHandoffFlagAdvert,
  Lt,
  turnHandoffAdmission,
  shouldCarryWrites,
  Pt,
} from "./remoteIO/turnHandoff.js";
import { jgt, Fce, frameAgeVerdict, pLs } from "./sdkMcpManifests.js";
import { logForDiagnosticsNoPII, isDiagLogging } from "../utils/diagLogs.js";
import { jsonParse, alwaysTrue } from "../utils/slowOperations.js";
import { Wo, safeParseJSON } from "../utils/json.js";
import { SESSION_EVENT_TYPES_WITH_EVENT_TYPE, TKs } from "./transports/SSETransport.js";
import { logForDebugging, isDebugMode } from "../utils/debug.js";
import { ndjsonStringify } from "./ndjsonSafeStringify.js";
import { StructuredIO } from "./structuredIO.js";
import {
  judgeAttestationStanding,
  isAttestationGatedFrame,
  judgeDeviceAttestation,
  classifyAttestationAction,
  judgeAttestationAction,
  nn,
} from "./remoteIO/deviceAttestation.js";
import { logError } from "../utils/log.js";
import { toError, errorMessage } from "../utils/errors.js";
import { withDeadline } from "../utils/sleep.js";
import {
  sessionChannelPromptRecord,
  catchUpClientRows,
  createWorkerEventsTransport,
} from "./remoteIO/ingress.js";
import {
  resolveEffectiveAttestation,
  evaluateInboundAttestationWithPolicy,
  isKnownControlRequestId,
  rememberInboundRequestId,
  isServiceVouchedSettingsRequest,
  filterInboundEventBySource,
} from "../bridge/attestationGate.js";
import {
  normalizeAttestationStatus,
  REMOTE_IO_WARNING_PREFIX,
  formatUnsignedEventWarning,
  formatUnsignedEventNotice,
  setSenderDropWriter,
  setDropNotifier,
  setAttestationFilterPolicy,
  reportAttestationHeaderUnreadable,
  clearSenderDropWriter,
  clearDropNotifier,
} from "../bridge/deviceAttestation.js";
import {
  servedCallDispatcher,
  createLeaseRenewer,
  TaskEventMirror,
  fn,
  rewriteAsUiDetachRequest,
  rewriteAsControlRequest,
  pn,
  yn,
} from "./remoteIO/servedCalls.js";
import { controlErrorResponse } from "./print.js";
import { getTransportForUrl } from "./transports/transportUtils.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import {
  isRemoteToolForwardingSwitchOn,
  isSessionChannelDisabled,
  servedCallRequestsJumpQueueOn,
} from "../services/remoteTools/servingGates.js";
import { isFileReferenceCall } from "../services/api/fileReferenceCalls.js";
import { isPlainObject } from "../utils/isPlainObject.js";
import { logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { writeToStdout } from "../utils/process.js";
import {
  onGrowthBookRefresh,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";
import {
  waitForSessionAuthHeaders,
  ccrAuthRefreshAdmission,
  sessionAuthAdmission,
  Mn,
} from "./remoteIO/workerAuth.js";
import { En } from "../../vendor/lodash-es/_inlinedHelpers.js";
import {
  CCRInitError,
  kKs,
  SHUTDOWN_REQUEST_TIMEOUT_MS,
  WORKER_CONFLICT_CLOSE_CODES,
  DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS,
  CCRClient,
  NNo,
  createIdleTracker,
  TENGU_PATIENT_LEDGER,
} from "./transports/ccrClient.js";
import { gracefulShutdown, isShuttingDown } from "../utils/gracefulShutdown.js";
import {
  setInternalEventWriter,
  setAgentMetadataInStreamGate,
  setInternalEventReader,
  updateCCRTipFromAckedBatch,
  sealTranscriptAppendsForShutdown,
  readTranscriptTailForTip,
  getValidatedCCRTip,
  isTranscriptPersistenceDisabled,
} from "../utils/sessionStorage.js";
import { Br, ryi } from "../utils/startupTiming.js";
import { getAttestationFilterPolicy } from "../bridge/trustedDevice.js";
import { env } from "../utils/env.js";
import {
  rns,
  getMainLoopRefcount,
  ons,
  sendSessionActivitySignal_2,
  isActivityReasonActive,
} from "../utils/sessionActivity.js";
import { watchRepoCheckouts } from "../utils/git/repoCheckouts.js";
import { getPollIntervalConfig } from "../bridge/pollConfig.js";
import { registerCleanup } from "../utils/cleanupRegistry.js";
import { extractControlResponse } from "../entrypoints/sdk/controlSchemas.js";
import {
  getControlRequestSubtype as getControlRequestSubtype_2,
  isLiveOnlyResponse,
} from "../bridge/controlRequests.js";
import { hLe } from "../utils/crossSessionInbound/inboundMode.js";
import { isHermeticRemoteSession } from "../services/cloudSessions/eligibility.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { knownSubtypeOrUndefined } from "./structuredIOProtocol.js";
import { isHumanInboundMessage } from "../bridge/inboundMessageOrigin.js";
import { isProjectsHumanOriginEnabled } from "../utils/crossSessionMessagingGate.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { p7t } from "../utils/sessionUrl.js";
import { HPr } from "./remoteIO/gates.js";
import { getSessionIngressAuthHeaders } from "../utils/sessionIngressAuth.js";
import { addStartupContext } from "../utils/startupProfiler.js";
import { convertWsUrlToPostUrl } from "./transports/HybridTransport.js";
import { isClaudeAiChatOrigin } from "../utils/entrypointKinds.js";
import { getSessionId } from "../bootstrap/state.js";
import { getClientPlatform } from "../utils/http.js";
import { mn, isSelfHostedRemoteEnvironment } from "../utils/remoteEnvironment.js";
import { WorkerSocket, openWorkerWebSocket } from "./transports/WorkerSocket.js";
import { zci, createGzipFetchWrapper } from "../services/api/gzipRequestBody.js";
import { YDo } from "../services/mcp/hostedWorkerTrust.js";
import { TENGU_TOASTY_BEACON } from "../services/api/withRetry.js";
import { isReviewSession } from "../utils/sessionAccessToken.js";
import { isFirstPartyProvider } from "../utils/model/providers.js";

//@ chunk-z4g2ta8k.js:69084-69122 placement
var St = require("./chunk-1d5behve.js");
//@ chunk-z4g2ta8k.js:69122-69243 placement
var remoteIOSingleton = null,
  LOCAL_ONLY_CONTROL_SUBTYPES = new Set(["set_chrome_browser_hints", ...[]]),
  SESSION_STREAM_CREATED_AT = "session_stream_created_at",
  SESSION_STREAM_STARTED_AT = "session_stream_started_at";
//@ chunk-z4g2ta8k.js:69243-69323 placement
function sessionStreamStartedBefore(e) {
  return (
    Object.hasOwn(e, SESSION_STREAM_STARTED_AT) &&
    typeof Reflect.get(e, SESSION_STREAM_STARTED_AT) === "string"
  );
}
//@ chunk-z4g2ta8k.js:69323-69476 placement
function sessionStreamCreatedAt(e) {
  if (!Object.hasOwn(e, SESSION_STREAM_CREATED_AT)) return;
  let n = Reflect.get(e, SESSION_STREAM_CREATED_AT);
  if (typeof n !== "string") return;
  let parse = Date.parse(n);
  return Number.isNaN(parse) ? void 0 : parse;
}
//@ chunk-z4g2ta8k.js:69476-69515 placement
var SESSION_STREAM_RECEIVED_AT_MS = "session_stream_received_at_ms";
//@ chunk-z4g2ta8k.js:69515-69642 placement
function sessionStreamReceivedAtMs(e) {
  if (!Object.hasOwn(e, SESSION_STREAM_RECEIVED_AT_MS)) return;
  let n = Reflect.get(e, SESSION_STREAM_RECEIVED_AT_MS);
  return typeof n === "number" && Number.isFinite(n) ? n : void 0;
}
//@ chunk-z4g2ta8k.js:69642-69674 placement
var SESSION_STREAM_WRITERS = "session_stream_writers";
//@ chunk-z4g2ta8k.js:69674-69793 placement
function sessionStreamWriters(e) {
  if (!Object.hasOwn(e, SESSION_STREAM_WRITERS)) return;
  let safeParse = xKs().safeParse(Reflect.get(e, SESSION_STREAM_WRITERS));
  return safeParse.success ? safeParse.data : void 0;
}
//@ chunk-z4g2ta8k.js:69793-69826 placement
var SESSION_STREAM_AT_FLOOR = "session_stream_at_floor";
//@ chunk-z4g2ta8k.js:69826-69959 placement
function getAtFloorMarker(e) {
  if (!Object.hasOwn(e, SESSION_STREAM_AT_FLOOR)) return;
  let n = Reflect.get(e, SESSION_STREAM_AT_FLOOR);
  if (n === !0) return "stands";
  return n === "leaving" ? "leaving" : void 0;
}
//@ chunk-z4g2ta8k.js:69959-70107 placement
var SESSION_STREAM_SENDER = "session_stream_sender",
  zs = DoctorLazy(() =>
    zodStrictObject({
      status: Ue([o(), E()]).optional(),
      trustedDevice: o().min(1).optional(),
      credential: o().min(1).optional(),
    }),
  );
//@ chunk-z4g2ta8k.js:70107-70224 placement
function getStreamSenderInfo(e) {
  if (!Object.hasOwn(e, SESSION_STREAM_SENDER)) return;
  let safeParse = zs().safeParse(Reflect.get(e, SESSION_STREAM_SENDER));
  return safeParse.success ? safeParse.data : void 0;
}
//@ chunk-z4g2ta8k.js:70224-70372 placement
function getRequestClientId(e) {
  let n = Reflect.get(e, "request"),
    r = typeof n === "object" && n !== null ? Reflect.get(n, "client_id") : void 0;
  return typeof r === "string" ? r : void 0;
}
//@ chunk-z4g2ta8k.js:70372-70431 placement
function De(e) {
  return typeof e === "string" && e !== "" ? e : void 0;
}
//@ chunk-z4g2ta8k.js:70431-70461 placement
var SESSION_STREAM_FRAME = "session_stream_frame";
//@ chunk-z4g2ta8k.js:70461-70524 placement
function Ze(e) {
  return `${String(e.sequence_num)}/${e.event_id}`;
}
//@ chunk-z4g2ta8k.js:70524-70630 placement
function getStreamFrame(e) {
  if (!Object.hasOwn(e, SESSION_STREAM_FRAME)) return;
  let n = Reflect.get(e, SESSION_STREAM_FRAME);
  return typeof n === "string" ? n : void 0;
}
//@ chunk-z4g2ta8k.js:70630-70723 placement
function Js(e) {
  if (attestedRequestSubtype(e.payload) === "ui_surface") e.payload[SESSION_STREAM_FRAME] = Ze(e);
  else delete e.payload[SESSION_STREAM_FRAME];
}
//@ chunk-z4g2ta8k.js:70723-71001 placement
function extractDeviceAttestationSender(e) {
  let device_attestation_status = e.device_attestation_status,
    r = De(e.device_attestation_trusted_device_tagged_id),
    s = De(e.device_attestation_credential_tagged_id);
  return {
    ...((typeof device_attestation_status === "string" || typeof device_attestation_status === "number") && {
      status: device_attestation_status,
    }),
    ...(r !== void 0 && { trustedDevice: r }),
    ...(s !== void 0 && { credential: s }),
  };
}
//@ chunk-z4g2ta8k.js:71001-71195 placement
function tagUiSurfaceFloorAndSender(e, n) {
  if (
    n !== void 0 &&
    e.event_type === "control_request" &&
    attestedRequestSubtype(e.payload) === "ui_surface"
  )
    ((e.payload[SESSION_STREAM_AT_FLOOR] = n === "stands" ? !0 : n),
      (e.payload[SESSION_STREAM_SENDER] = extractDeviceAttestationSender(e)));
  else (delete e.payload[SESSION_STREAM_AT_FLOOR], delete e.payload[SESSION_STREAM_SENDER]);
}
/**
 * 给 initialize/界面面类 control_request 事件的 payload 打上流元数据：created_at 与当前写者集合；事件类型与 payload 不符时清除这些字段并记诊断日志。
 */
//@ chunk-z4g2ta8k.js:71195-71773 placement
function stampInitializeStreamMeta(event, writersInfo) {
  let subtype = getControlRequestSubtype(event.payload);
  if (event.payload.type !== "control_request" || (subtype !== "initialize" && !jgt(subtype))) return;
  if (event.event_type !== "control_request") {
    (delete event.payload[SESSION_STREAM_CREATED_AT],
      delete event.payload[SESSION_STREAM_WRITERS],
      logForDiagnosticsNoPII("warn", "cli_sse_initialize_row_type_mismatch", {
        family: subtype === "initialize" ? "initialize" : "surface",
        event_type:
          typeof event.event_type === "string" && /^[a-z_]{1,40}$/.test(event.event_type)
            ? event.event_type
            : "other",
      }));
    return;
  }
  if (typeof event.created_at === "string") event.payload[SESSION_STREAM_CREATED_AT] = event.created_at;
  else delete event.payload[SESSION_STREAM_CREATED_AT];
  if (writersInfo !== void 0)
    event.payload[SESSION_STREAM_WRITERS] = {
      writers: writersInfo.writers,
      statedAtMs: writersInfo.statedAtMs,
    };
  else delete event.payload[SESSION_STREAM_WRITERS];
}
//@ chunk-z4g2ta8k.js:71773-71956 placement
function stampControlResponseCreatedAt(e) {
  if (e.payload.type !== "control_response") return;
  if (e.event_type === "control_response" && typeof e.created_at === "string")
    e.payload[SESSION_STREAM_CREATED_AT] = e.created_at;
  else delete e.payload[SESSION_STREAM_CREATED_AT];
}
//@ chunk-z4g2ta8k.js:71956-72255 placement
function stampBashCommandTimes(e) {
  if (e.payload.type !== "bash_command") return;
  if (e.event_type === "bash_command" && typeof e.created_at === "string")
    e.payload[SESSION_STREAM_CREATED_AT] = e.created_at;
  else delete e.payload[SESSION_STREAM_CREATED_AT];
  if (e.event_type === "bash_command" && typeof e.processing_at === "string")
    e.payload[SESSION_STREAM_STARTED_AT] = e.processing_at;
  else delete e.payload[SESSION_STREAM_STARTED_AT];
}
//@ chunk-z4g2ta8k.js:72255-72539 placement
function stampHandoffReceivedAt(e, n) {
  let r = e.payload.type === "control_request" ? getControlRequestSubtype(e.payload) : void 0;
  if (r !== "turn_handoff" && r !== "rewind_conversation" && r !== "start_shell_task") return;
  if (r === "turn_handoff") e.payload[SESSION_STREAM_RECEIVED_AT_MS] = n;
  if (typeof e.created_at === "string") e.payload[SESSION_STREAM_CREATED_AT] = e.created_at;
  else delete e.payload[SESSION_STREAM_CREATED_AT];
}
//@ chunk-z4g2ta8k.js:72539-72702 placement
function getControlRequestSubtype(e) {
  if (typeof e !== "object" || e === null) return;
  let request = e.request;
  if (typeof request !== "object" || request === null) return;
  let subtype = request.subtype;
  return typeof subtype === "string" ? subtype : void 0;
}
//@ chunk-z4g2ta8k.js:72702-73638 placement
function dropServerOnlyStdinTypes(e, n) {
  let flattened = e
    .split(
      `
`,
    )
    .flatMap((h) => {
      let y;
      try {
        y = jsonParse(Wo(h));
      } catch {
        return [h];
      }
      let S = typeof y === "object" && y !== null ? y.type : void 0;
      if (typeof S === "string" && n?.(S, y)) return [];
      if (typeof S === "string" && SESSION_EVENT_TYPES_WITH_EVENT_TYPE.has(S))
        return (
          logForDiagnosticsNoPII("warn", "cli_stdin_server_only_type_dropped", { payload_type: S }),
          logForDebugging(
            `[remote-io] dropped a ${S} frame from the stdin lane (server-authored-only type; SSE is its only ingress)`,
            { level: "warn" },
          ),
          []
        );
      if (S === "control_request") {
        let O = getControlRequestSubtype(y);
        if (O !== void 0 && LOCAL_ONLY_CONTROL_SUBTYPES.has(O))
          return (
            logForDiagnosticsNoPII("warn", "cli_stdin_host_forwarded_subtype_dropped", { subtype: O }),
            logForDebugging(
              `[remote-io] dropped a ${O} control_request from the stdin lane (host-forwarded-only subtype; SSE is its only ingress)`,
              { level: "warn" },
            ),
            []
          );
      }
      if (typeof y !== "object" || y === null) return [h];
      let k = new Set([
          SESSION_STREAM_CREATED_AT,
          SESSION_STREAM_STARTED_AT,
          SESSION_STREAM_RECEIVED_AT_MS,
          SESSION_STREAM_WRITERS,
          SESSION_STREAM_AT_FLOOR,
          SESSION_STREAM_SENDER,
          SESSION_STREAM_FRAME,
          ...[],
        ]),
        entries = Object.entries(y);
      if (!entries.some(([O]) => k.has(O))) return [h];
      return [ndjsonStringify(Object.fromEntries(entries.filter(([O]) => !k.has(O))))];
    });
  return flattened.length === 0
    ? void 0
    : flattened.join(`
`);
}
//@ chunk-z4g2ta8k.js:73638-73749 placement
class UnreadableInputError extends Error {
  name = "UnreadableInputError";
  constructor() {
    super("stream-json input could not be read");
  }
}
//@ chunk-z4g2ta8k.js:73749-73769 placement
var MAX_QUEUED_FRAMES = 256,
  REMOTE_IO_TIMEOUT_MS = 30000;
//@ chunk-z4g2ta8k.js:73769-74271 placement
var CONTROL_SUBTYPE_TO_CAPABILITY = {
    remote_tools_announce: "remote_tools_announce",
    register_device_hooks: "device_hooks_register",
    upload_device_hook_template: "device_hooks_register",
    apply_flag_settings: "ccr_cloud_plugins_forward",
  },
  Xn = {
    served_call: "remote_tool_forward",
    hook: "device_hooks_serve",
    host_ask: "plugin_function_hooks_host_ask",
  },
  Qn = {
    served_call: ["served-call", "the machine's own answer"],
    hook: ["forwarded-hook", "the machine's own answer"],
    host_ask: ["plugin-ask", "the addressed client's own answer"],
  },
  UI_OTHER = "ui_other",
  co = 30000;
//@ chunk-z4g2ta8k.js:74271-74546 placement
function resolveCarriedPolicy(e, n, r) {
  if (n.fault === "policy_unparseable" || (n.fault === "policy_partial" && n.policy.enforce))
    return "unreadable";
  if (n.policy !== void 0) return { policy: n.policy, carried: !1 };
  if (e === void 0) return r ? { policy: void 0, carried: !1 } : void 0;
  return e === "unreadable" ? e : { ...e, carried: !0 };
}
//@ chunk-z4g2ta8k.js:74546-74637 placement
var PERMISSION_WITHDRAWN_MESSAGE =
    "This permission request was withdrawn because it was not answered in time.",
  _o = 256;
/**
 * RemoteIO（云 worker 的 SDK I/O 类，继承自通用 I/O 基类）：管理与客户端表面的连接状态、会话写入者、表面策略（stands/leaving）、入站消息与回合交接，是云会话 worker 的核心。
 */
//@ chunk-z4g2ta8k.js:74637-104943 placement = RemoteIO (0.126)
class RemoteIO extends StructuredIO {
  isRemoteTransport() {
    return !0;
  }
  sessionWriters() {
    return this.transport.getSessionWriters();
  }
  uiSurfaceFrameOf(e, n) {
    let r = getAtFloorMarker(e),
      s = getStreamSenderInfo(e);
    return {
      isRemoteTransport: !0,
      redactsWhatItPersists: this.redactsWhatItPersists(),
      isAnySurfaceAttached: n,
      createdAt: sessionStreamCreatedAt(e),
      sessionWriters: sessionStreamWriters(e),
      isAtFloor: r === "stands" && s !== void 0 && this.standsUnderPolicy(s),
      leavesBelowFloor: r === "leaving" && s !== void 0 && this.leavesOwnSurface(s, getRequestClientId(e)),
    };
  }
  standsUnderPolicy(e) {
    let n = judgeAttestationStanding(e.status, this.surfacePolicy());
    return n === "stands" || n === "observed_below_floor";
  }
  surfaceClientAttached(e, n) {
    let r = !1;
    try {
      let s = getStreamSenderInfo(n);
      if (s !== void 0 && this.standsUnderPolicy(s)) (this.surfaceClientsOnRecord.set(e, s), (r = !0));
    } catch (error) {
      logError(toError(error));
    }
    if (r) return (this.reviewStatementRenewal(), !0);
    try {
      (this.surfaceClientsOnRecord.delete(e), this.surfaceRoster?.refuse([e]));
    } catch (error) {
      logError(toError(error));
    }
    return !1;
  }
  surfaceSenderStands(e) {
    try {
      let n = getStreamSenderInfo(e);
      return n !== void 0 && this.standsUnderPolicy(n);
    } catch (error) {
      return (logError(toError(error)), !1);
    }
  }
  setSurfaceRoster(e) {
    this.surfaceRoster = e;
  }
  surfaceClientsAttached() {
    let e = new Set(this.surfaceRoster?.list() ?? []);
    for (let n of this.surfaceClientsOnRecord.keys()) if (!e.has(n)) this.surfaceClientsOnRecord.delete(n);
    return this.surfaceClientsOnRecord;
  }
  refuseSurfaceClientsBelowPolicy() {
    try {
      let surfaceClientsAttached = this.surfaceClientsAttached(),
        filtered = (this.surfaceRoster?.list() ?? []).filter((r) => {
          let s = surfaceClientsAttached.get(r);
          return s === void 0 || !this.standsUnderPolicy(s);
        });
      if (filtered.length > 0) this.surfaceRoster?.refuse(filtered);
    } catch (error) {
      logError(toError(error));
    }
  }
  setSubscribersReportedListener(e) {
    this.ccrClient.setSubscribersReportedListener(e);
  }
  taskHoldSince() {
    return this.taskHoldClock.since();
  }
  takeUserFrameReceivedWallMs(e) {
    let n = this.userFrameReceivedWallMs.get(e);
    return (
      this.userFrameReceivedWallMs.delete(e),
      this.userFrameStartedAt.delete(e),
      this.userFrameReceivedAt.delete(e),
      n
    );
  }
  userFrameReceivedAtMs(e) {
    return this.userFrameReceivedAt.get(e);
  }
  userFrameStartedAtMs(e) {
    return this.userFrameStartedAt.get(e);
  }
  hostOwnsStdinOrigin = !1;
  persistsOutboundFrames = !0;
  get isHostedWorker() {
    return this.hosting.kind === "hosted";
  }
  async readOwnClientEvent(e) {
    let ownClientEvent = await this.ccrClient.readOwnClientEvent(e);
    if (ownClientEvent.kind !== "event") return ownClientEvent;
    if (this.storedEventPolicy === void 0) await withDeadline(this.firstStreamPolicy.promise, co);
    let storedEventPolicy = this.storedEventPolicy;
    if (storedEventPolicy === void 0 || storedEventPolicy === "unreadable")
      return { kind: "unavailable", why: "attestation_policy_unknown" };
    let s = {
        kind: "event",
        event: ownClientEvent.event,
        personTypedLine: sessionChannelPromptRecord(ownClientEvent.event.payload),
      },
      policy = storedEventPolicy.policy;
    if (policy === void 0) return s;
    let deviceAttestationStatus = ownClientEvent.event.deviceAttestationStatus,
      {
        status: status,
        meetsLevel: meetsLevel,
        configException: configException,
      } = resolveEffectiveAttestation(
        normalizeAttestationStatus(
          typeof deviceAttestationStatus === "string"
            ? deviceAttestationStatus.toUpperCase()
            : deviceAttestationStatus,
        ),
        policy,
        { isCloudWorker: !0, vouchWithheld: !0 },
      );
    if (!policy.enforce || meetsLevel || configException) return s;
    if (status === "UNSPECIFIED") return { kind: "unavailable", why: "attestation_unstated" };
    return storedEventPolicy.carried
      ? { kind: "unavailable", why: "attestation_policy_unknown" }
      : { kind: "below_attestation" };
  }
  url;
  transport;
  inputStream;
  workerAttestationPolicy;
  vouchedModelOrEffortRequestIds = new Set();
  vouchableCloudModel;
  connectionIsFromSessionService() {
    return this.transport.getSessionWritersStatement() !== void 0;
  }
  storedEventPolicy;
  firstStreamPolicy = Promise.withResolvers();
  isSurfacePolicyUnreadable = !1;
  surfaceClientsOnRecord = new Map();
  surfaceRoster;
  countedSenderStatuses = new Set();
  countedDroppedAnswers = new Set();
  countedRefusedSurfaceRequests = new Set();
  surfaceRefusals = servedCallDispatcher({
    isAwaited: (e) => this.liveDeviceRequestKind(e) !== void 0,
    readNow: () => Date.now(),
  });
  statementRenewal = createLeaseRenewer({
    isWanted: () => (this.surfaceRoster?.list().length ?? 0) > 0 && Fce(this.uiSurfaceChannel()),
    renew: () => this.ccrClient.renewStream(),
    lapse: () => this.surfaceRoster?.setAside(),
    readNow: () => Date.now(),
    schedule: (e, n) => {
      let r = setTimeout(qe, n, e);
      return (r.unref(), () => clearTimeout(r));
    },
  });
  surfaceFramesAtFloor = new WeakMap();
  newestFrameCreatedAt;
  isBridge = !1;
  isDebug = !1;
  teeStdout = !1;
  waitingOnUserReport;
  idleLine;
  disarmModelCallProxyRefusalRideOut;
  takeRunnerLine;
  activityFd;
  ccrClient;
  idleTracker;
  onPromptAnswered;
  keepAliveTimer = null;
  aliveBeforeInit;
  inboundLanesDroppedAfterClose = new Set();
  userFrameReceivedWallMs = new Map();
  userFrameStartedAt = new Map();
  userFrameReceivedAt = new Map();
  ownDeniesAwaitingCancel = new Set();
  ownDenyHeldForCancel = new Map();
  taskHoldClock = new TaskEventMirror();
  unsubscribeGrowthBookRefresh;
  attestationDropSenderWriter = (e) => {
    this.ccrClient.writeEvent(e).catch((n) => {
      logForDebugging(`[remote-io] drop sender-notice write failed: ${errorMessage(n)}`, { level: "warn" });
    });
  };
  attestationDropNotifier = (e) => {
    if (this.isBridge)
      process.stderr.write(
        REMOTE_IO_WARNING_PREFIX +
          formatUnsignedEventWarning(e) +
          `
`,
      );
    if (e.payloadType === "control_request" && e.requestId)
      this.ccrClient
        .writeEvent(controlErrorResponse(e.requestId, formatUnsignedEventNotice(e)))
        .catch((n) => {
          logForDebugging(`[remote-io] refusal write failed: ${errorMessage(n)}`, { level: "warn" });
        });
  };
  permanentCloseCode;
  closeCause;
  hosting;
  feedsStoreSignals;
  endedByHost = !1;
  constructor({
    streamUrl: streamUrl,
    initialPrompt: initialPrompt,
    stdinLane: stdinLane,
    replayUserMessages: replayUserMessages,
    sessionState: sessionState,
    storageV5: storageV5,
    getAuthHeaders: getAuthHeaders,
    rereadMissingAuthHeaders: rereadMissingAuthHeaders,
    sessionId: sessionId,
    workerEpoch: workerEpoch,
    environmentKind: environmentKind,
    isResume: isResume,
    fetchesAgentTranscriptsOnDemand: fetchesAgentTranscriptsOnDemand,
    agentTranscriptBound: agentTranscriptBound,
    earlyHydrateReads: earlyHydrateReads,
    earlyRemoteLink: earlyRemoteLink,
    reportParkAtInit: reportParkAtInit,
    initExternalMetadata: initExternalMetadata,
    announcedExternalMetadata: announcedExternalMetadata,
    initialWorkerStatus: initialWorkerStatus,
    onStageFileDelivered: onStageFileDelivered,
    onUserFrameDelivered: onUserFrameDelivered,
    onClaimSessionDelivered: onClaimSessionDelivered,
    hosting: hosting,
  }) {
    let ue = new PassThrough({ encoding: "utf8" });
    super(ue, replayUserMessages, sessionState);
    ((this.inputStream = ue), (this.hosting = hosting), (this.url = getTransportForUrl(new Zn(streamUrl))));
    let Z = getAuthHeaders();
    if (Object.keys(Z).length === 0)
      logForDebugging(
        rereadMissingAuthHeaders
          ? "[remote-io] No session ingress token available yet, will re-read"
          : "[remote-io] No session ingress token available",
        { level: "error" },
      );
    ((this.isBridge = environmentKind === "bridge"),
      (this.isDebug = isDebugMode()),
      (this.teeStdout = isEnvTruthy(process.env.CLAUDE_CODE_TEE_SDK_STDOUT)));
    let envClaudeRunnerActivityFd = process.env.CLAUDE_RUNNER_ACTIVITY_FD,
      me = envClaudeRunnerActivityFd ? Number.parseInt(envClaudeRunnerActivityFd, 10) : NaN;
    if (Number.isInteger(me) && me > 2)
      try {
        let R = fstatSync(me);
        if (!R.isFIFO() && !R.isSocket()) throw Error("not a pipe");
        let W = createWriteStream("", { fd: me, autoClose: !1 });
        (W.on("error", (Y) => {
          (logForDebugging(
            `[remote-io] activity fd ${me} write error (${errorMessage(Y)}); falling back to stdout`,
          ),
            (this.activityFd = void 0));
        }),
          (this.activityFd = W));
      } catch (error) {
        logForDebugging(
          `[remote-io] activity fd ${me} unavailable (${errorMessage(error)}); falling back to stdout`,
        );
      }
    if (earlyRemoteLink && hosting.kind !== "owns-process")
      throw Error("earlyRemoteLink is only valid for an owns-process RemoteIO");
    if (earlyRemoteLink)
      (earlyRemoteLink.ccrClient.setFeatureGatedOptions(getHeartbeatFeatureFlags()),
        earlyRemoteLink.ccrClient.setStreamEventFlushIntervalMs(isCcrStreamEventFlushMsGateOn()),
        earlyRemoteLink.ccrClient.setStreamEventFirstFlushMs(isCcrStreamFirstFlushMsGateOn()),
        earlyRemoteLink.ccrClient.setToolInputFlushMs(isIdempotentPineGateOn()),
        earlyRemoteLink.ccrClient.setNoSubscriberStreamEventFlushIntervalMs(isCcrNoSubscriberFlushMsGateOn()),
        earlyRemoteLink.ccrClient.setDropUnwatchedStreamEvents(isCcrDropUnwatchedStreamEventsGateOn()));
    let ye =
        earlyRemoteLink ??
        startRemoteWorker({
          url: this.url,
          getAuthHeaders: getAuthHeaders,
          sessionId: sessionId,
          environmentKind: environmentKind,
          storageV5: storageV5,
          hosting: hosting,
          onEpochMismatch:
            hosting.kind === "hosted"
              ? (R) => {
                  throw (this.stopFor(classifyStreamCloseCode(R)), Error("terminal request-path condition"));
                }
              : void 0,
          reportParkAtInit: reportParkAtInit,
          initExternalMetadata: initExternalMetadata,
          initialWorkerStatus: initialWorkerStatus,
          deferDelivery: !1,
        }),
      onDiagnostic = ye.onDiagnostic;
    ((this.transport = ye.transport),
      (this.ccrClient = ye.ccrClient),
      (this.idleTracker = ye.idleTracker),
      (this.feedsStoreSignals = !1));
    let Be = isRemoteToolForwardingSwitchOn();
    if (Be)
      ((this.ccrClient.onDurableEventsDropped = (R, W) => {
        let Y = collectControlRequestIds(R);
        if (Y.length > 0) this.rejectUndeliveredRequests(Y, W);
      }),
        (this.ccrClient.onDurableEventsUpload = (R, W) => {
          let Y = collectControlRequestIds(R);
          if (Y.length > 0) this.noteRequestsUpload(Y, W);
        }));
    switch (((this.tracksRequestDelivery = Be), hosting.kind)) {
      case "owns-process":
        ((this.sessionState.slimsRefusedLead = (R) =>
          R.request_id === "" && isFileReferenceCall(R.tool_use_id)),
          (this.ccrClient.onCardRecordRefused = (R, { external_metadata: external_metadata }) => {
            try {
              if (
                isPlainObject(external_metadata) &&
                isPlainObject(external_metadata.pending_action) &&
                this.sessionState.leadRecordRefused(external_metadata.pending_action)
              )
                logFeatureSad("ccr_worker_state_publish", "card_written_slim");
            } catch (error) {
              logError(toError(error));
            }
          }));
        break;
      case "hosted":
        break;
    }
    if (
      (this.transport.setOnData((R) => {
        if ((this.writeInbound(R, "sse"), this.isBridge && this.isDebug))
          writeToStdout(
            R.endsWith(`
`)
              ? R
              : R +
                  `
`,
          );
      }),
      this.transport.setOnUserFrameReceived((R, W, Y, we) => {
        if (this.userFrameReceivedWallMs.has(R)) return;
        if (this.userFrameReceivedWallMs.size >= MAX_QUEUED_FRAMES) {
          let fe = this.userFrameReceivedWallMs.keys().next().value;
          if (fe !== void 0)
            (this.userFrameReceivedWallMs.delete(fe),
              this.userFrameStartedAt.delete(fe),
              this.userFrameReceivedAt.delete(fe));
        }
        (this.userFrameReceivedWallMs.set(R, W), this.userFrameReceivedAt.set(R, we));
        let ce = typeof Y === "string" ? Date.parse(Y) : NaN;
        if (!Number.isNaN(ce)) this.userFrameStartedAt.set(R, ce);
      }),
      this.transport.setOnClose((R, W) => {
        if (R !== void 0) {
          switch (((this.permanentCloseCode = R), hosting.kind)) {
            case "owns-process":
              process.stderr.write(`RemoteIO: transport closed permanently (code ${R})
`);
              break;
            case "hosted":
              hosting.onDiagnostic(
                `transport closed permanently (code ${R})`,
                "warn",
                "transport_closed_permanently",
              );
              break;
          }
          this.stopFor({ kind: "stream-rejected", closeCode: R });
        }
        this.inputStream.end();
      }),
      this.transport.setOnEventVetoed((R) => {
        (this.ccrClient.reportDelivery(R.event_id, "received"),
          this.ccrClient.reportDelivery(R.event_id, "processed"));
      }),
      hosting.kind === "hosted")
    ) {
      let R = !1;
      this.transport.setOnFrameRefused((W) => {
        if (W !== void 0)
          (this.ccrClient.reportDelivery(W, "received"), this.ccrClient.reportDelivery(W, "processed"));
        if (!R)
          ((R = !0),
            onDiagnostic?.(
              `a frame on the event stream held more than ${hosting.mostMembersInAFrame} object members and was dropped unparsed (${W === void 0 ? "no event_id read" : `event_id ${W}`}); later ones are not logged`,
              "warn",
              "frame_too_many_members",
            ));
      });
    }
    this.unsubscribeGrowthBookRefresh = onGrowthBookRefresh(() => {
      (this.ccrClient.setStreamEventFlushIntervalMs(isCcrStreamEventFlushMsGateOn()),
        this.ccrClient.setStreamEventFirstFlushMs(isCcrStreamFirstFlushMsGateOn()),
        this.ccrClient.setToolInputFlushMs(isIdempotentPineGateOn()),
        this.ccrClient.setNoSubscriberStreamEventFlushIntervalMs(isCcrNoSubscriberFlushMsGateOn()),
        this.ccrClient.setDropUnwatchedStreamEvents(isCcrDropUnwatchedStreamEventsGateOn()));
    });
    let _e =
        rereadMissingAuthHeaders && Object.keys(Z).length === 0
          ? waitForSessionAuthHeaders({
              getAuthHeaders: getAuthHeaders,
              rereadMiss: rereadMissingAuthHeaders,
              onDiagnostic: onDiagnostic,
            })
          : null,
      Me =
        earlyRemoteLink?.initialized ??
        (_e ? _e.then(() => this.ccrClient.initialize(workerEpoch)) : this.ccrClient.initialize(workerEpoch));
    if (
      ((this.restoredWorkerState = Me.catch(() => null)),
      Me.then(
        () => {
          onDiagnostic?.("worker registered", "info", "worker_registered");
          let R = initExternalMetadata ?? ye.initExternalMetadata;
          try {
            R = announcedExternalMetadata?.() ?? R;
          } catch (error) {
            logError(error);
          }
          if (!En(R, ye.initExternalMetadata)) this.ccrClient.reportMetadata({ ...R });
          let W = turnHandoffAvailableMessage(R, sessionId);
          if (W) this.write(W);
        },
        (R) => {
          let W = R instanceof CCRInitError ? R.reason : errorMessage(R);
          logForDiagnosticsNoPII("error", "cli_worker_lifecycle_init_failed", {
            reason: R instanceof CCRInitError ? R.reason : "unknown",
          });
          let Y = `CCRClient initialization failed: ${errorMessage(R)}`;
          if (kKs(R)) logForDebugging(Y, { level: "error" });
          else logError(Error(Y));
          switch (hosting.kind) {
            case "owns-process":
              (onDiagnostic?.(
                `worker registration failed (${W}), exiting`,
                "warn",
                "worker_registration_failed",
              ),
                gracefulShutdown(1, "other"));
              return;
            case "hosted":
              (onDiagnostic?.(
                `worker registration failed (${W}), stopping`,
                "warn",
                "worker_registration_failed",
              ),
                this.stopFor({
                  kind: "registration-failed",
                  reason: R instanceof CCRInitError ? R.reason : "unknown",
                  httpStatus: R instanceof CCRInitError ? R.httpStatus : void 0,
                  closeCode: 4091,
                }));
              return;
          }
        },
      ),
      setInternalEventWriter((R, W, Y) => this.ccrClient.writeInternalEvent(R, W, Y)),
      setAgentMetadataInStreamGate(BNt),
      setInternalEventReader(
        (R) => this.ccrClient.readInternalEvents(R),
        () => this.ccrClient.readSubagentInternalEvents(),
        isResume || fetchesAgentTranscriptsOnDemand
          ? (R, W, Y) => this.ccrClient.readAgentInternalEvents(R, W, agentTranscriptBound, Y)
          : void 0,
      ),
      (this.ccrClient.onInternalBatchAcked = (R) => updateCCRTipFromAckedBatch(R, storageV5)),
      (this.ccrClient.onInternalEventLaneClosed = sealTranscriptAppendsForShutdown),
      isResume)
    ) {
      let startTime = performance.now(),
        ccrClient = this.ccrClient;
      ((this.hydratePrefetch = (async () => {
        if (_e) (await _e, (startTime = performance.now()));
        return (
          (_e ? void 0 : await earlyHydrateReads) ??
          (await readInternalEventsFromTip(
            (Y) => ccrClient.readInternalEvents(Y),
            () => ccrClient.readSubagentInternalEvents(),
            storageV5,
          ))
        );
      })().catch((Y) => (logError(Y), null))),
        this.hydratePrefetch.then(() => {
          (Br("resume_hydrate_fetch_ms", performance.now() - startTime, startTime), ryi());
        }));
    }
    let Te = { started: "processing", completed: "processed", cancelled: "processed" };
    if (
      ((this.onCommandLifecycle = (R, W) => {
        if (!Object.hasOwn(Te, W)) return;
        let Y = Te[W];
        if (Y === void 0) return;
        this.ccrClient.reportDelivery(R, Y);
      }),
      this.transport.setOnDelivered((R, W, Y) => {
        if (
          (stampInitializeStreamMeta(R, W),
          tagUiSurfaceFloorAndSender(R, this.surfaceFramesAtFloor.get(R)),
          Js(R),
          stampHandoffReceivedAt(R, Y),
          stampBashCommandTimes(R),
          hosting.kind === "hosted")
        )
          stampControlResponseCreatedAt(R);
        let we = typeof R.created_at === "string" ? Date.parse(R.created_at) : Number.NaN;
        if (!Number.isNaN(we) && (this.newestFrameCreatedAt === void 0 || we > this.newestFrameCreatedAt))
          this.newestFrameCreatedAt = we;
        let { type: type, request: request } = R.payload;
        if (type === "user") qe(() => onUserFrameDelivered?.());
        else if (
          type === "control_request" &&
          getControlRequestSubtype(R.payload) === "stage_file" &&
          isPlainObject(request)
        )
          qe(() => onStageFileDelivered?.(request));
        else if (type === "control_request" && getControlRequestSubtype(R.payload) === "claim_session")
          qe(() => onClaimSessionDelivered?.());
      }),
      setSenderDropWriter(this.attestationDropSenderWriter),
      setDropNotifier(this.attestationDropNotifier),
      this.isBridge)
    )
      (setAttestationFilterPolicy(getAttestationFilterPolicy),
        this.transport.setEventFilter((R) => {
          this.markAndStripSessionChannelFrame(R, { listedOnly: !1 });
          let judgeNotingAdmission = this.judgeNotingAdmission(R, () =>
            evaluateInboundAttestationWithPolicy(R),
          );
          if (judgeNotingAdmission)
            (this.ccrClient.reportDelivery(R.event_id, "received"),
              this.ccrClient.reportDelivery(R.event_id, "processed"));
          return judgeNotingAdmission;
        }));
    else {
      (this.transport.setWorkerAttestationPolicySink((W) => this.takeWorkerAttestationPolicy(W)),
        this.transport.setStatementRenewalGate((W, Y) => this.awaitsFresherStatement(W, Y)));
      let R = env.CLAUDE_CODE_ENVIRONMENT_KIND === void 0;
      this.transport.setEventFilter((W) => {
        let judgeNotingAdmission = this.judgeNotingAdmission(W, () =>
          this.judgeInboundFrame(W, {
            isManagedCloudWorker: R,
            sessionWriters: this.transport.sessionWritersOf(W),
          }),
        );
        if (judgeNotingAdmission)
          (this.ccrClient.reportDelivery(W.event_id, "received"),
            this.ccrClient.reportDelivery(W.event_id, "processed"));
        return judgeNotingAdmission;
      });
    }
    let Se = () => {
      if (this.teeStdout && !this.isBridge)
        try {
          this.teeActivity(
            ndjsonStringify({
              type: "system",
              subtype: "session_state_changed",
              state: this.sessionState.getState(),
              waiting_on_user: this.sessionState.waitingOnUser,
            }) +
              `
`,
          );
        } catch {}
    };
    if (
      ((this.idleLine =
        remoteIOSingleton?.createIdleLineHold({
          readLine: () => ({
            isIdle: this.sessionState.getState() === "idle",
            isWaitingOnUser: this.sessionState.waitingOnUser,
          }),
          write: Se,
        }) ?? null),
      (this.waitingOnUserReport = waitForTurnPromptUploads({
        listTurnPromptsWaitedOn: () => (this.sessionState.waitingOnUser ? this.listTurnPrompts() : []),
        write: this.idleLine?.write ?? Se,
      })),
      (this.sessionState.onStateChanged = (R, W) => {
        (this.ccrClient.reportState(R, W), this.waitingOnUserReport.stateChanged());
      }),
      (this.sessionState.onWaitingOnUserChanged = () => {
        this.waitingOnUserReport.stateChanged();
      }),
      (this.sessionState.onTurnStarting = (R, W) => {
        if (this.teeStdout && !this.isBridge)
          try {
            this.teeActivity(
              ndjsonStringify({
                type: "system",
                subtype: "turn_starting",
                mode: R,
                ...(R === "task-notification" && { task_id: W ?? null }),
              }) +
                `
`,
            );
          } catch {}
      }),
      (this.sessionState.onTurnBeganBeforeInit = () => {
        if (this.teeStdout && !this.isBridge) {
          try {
            this.teeActivity(
              ndjsonStringify({ type: "system", subtype: "turn_began_before_init" }) +
                `
`,
            );
          } catch {}
          let CLAUDE_RUNNER_ALIVE_EVERY_MS = env.CLAUDE_RUNNER_ALIVE_EVERY_MS;
          if (this.aliveBeforeInit === void 0 && CLAUDE_RUNNER_ALIVE_EVERY_MS !== void 0)
            ((this.aliveBeforeInit = setInterval(() => {
              try {
                this.teeActivity(`{"type":"system","subtype":"alive_before_init"}
`);
              } catch {}
            }, CLAUDE_RUNNER_ALIVE_EVERY_MS)),
              this.aliveBeforeInit.unref());
        }
      }),
      rns((R) => this.sessionState.setMainLoopRefcount(R)),
      this.sessionState.setMainLoopRefcount(getMainLoopRefcount()),
      ons((R) => this.sessionState.dropNestedBlockedChain(R)),
      (this.sessionState.onMetadataChanged = (R) => {
        this.ccrClient.reportMetadata(R);
      }),
      (this.sessionState.onInternalMetadataChanged = (R) => {
        this.ccrClient.reportInternalMetadata(R);
      }),
      watchRepoCheckouts((R) => this.sessionState.notifyMetadataChanged(R)),
      earlyRemoteLink)
    )
      this.transport.startDelivery();
    else if (_e)
      _e.then(
        () => this.transport.connect(),
        () => {},
      );
    else this.transport.connect();
    let session_keepalive_interval_v2_ms = getPollIntervalConfig().session_keepalive_interval_v2_ms;
    if (this.isBridge && session_keepalive_interval_v2_ms > 0)
      ((this.keepAliveTimer = setInterval(() => {
        (logForDebugging("[remote-io] keep_alive sent"),
          this.write({ type: "keep_alive" }).catch((R) => {
            logForDebugging(`[remote-io] keep_alive write failed: ${errorMessage(R)}`);
          }));
      }, session_keepalive_interval_v2_ms)),
        this.keepAliveTimer.unref?.());
    if (hosting.kind === "owns-process") registerCleanup(async () => this.close());
    if (initialPrompt)
      this.writeInbound(
        initialPrompt.replace(/\n$/, "") +
          `
`,
        "stdin",
      );
    if (stdinLane)
      if (environmentKind === "bridge" || environmentKind === "byoc") this.pumpStdinLane(stdinLane);
      else this.discardStdinLane(stdinLane, environmentKind);
  }
  pumpStdinLane(e) {
    (async () => {
      for await (let n of e) {
        let r = dropServerOnlyStdinTypes(String(n).replace(/\n$/, ""), this.takeRunnerLine);
        if (r !== void 0)
          this.writeInbound(
            r +
              `
`,
            "stdin",
          );
      }
    })();
  }
  discardStdinLane(e, n) {
    (async () => {
      let r = !1;
      for await (let s of e)
        if (!r && String(s).trim() !== "")
          ((r = !0),
            logForDiagnosticsNoPII("warn", "cli_remote_io_stdin_ignored"),
            logForDebugging(
              `[remote-io] ignored data on process stdin (host kind ${n === null ? "unset" : `'${n}'`}): only a 'bridge' or 'byoc' host's stdin is an input lane, so control input comes from the session stream only`,
              { level: "warn" },
            ));
    })();
  }
  markAndStripSessionChannelFrame(e, { listedOnly: listedOnly }) {
    fn(e);
  }
  sessionChannelFloorVerdict(e, n) {
    let guardedFamilies = this.guardedFamilies();
    if (!isAttestationGatedFrame(e.payload, (h) => this.liveDeviceRequestKind(h), guardedFamilies))
      return "passed";
    try {
      let h = judgeDeviceAttestation(e, (y) => this.liveDeviceRequestKind(y), guardedFamilies, {
        policy: this.surfacePolicy(),
        leaves: (y) => this.leavesOwnSurface(extractDeviceAttestationSender(e), y),
        sessionWriters: n,
        now: Date.now,
      });
      if (h.kind === "observe_surface_request") this.countObservedSurfaceRequest(h.status.toLowerCase());
      else if (h.kind === "admit_leaving") {
        if (!this.surfaceRefusals.charges({ requestId: h.requestId, frame: Ze(e) })) return "dropped";
        return (
          rewriteAsUiDetachRequest(e.payload, {
            requestId: h.requestId,
            clientId: h.clientId,
            eventId: e.event_id,
          }),
          this.surfaceFramesAtFloor.set(e, "leaving"),
          logForDebugging(
            `[remote-io] a surface client on record leaves though the device floor refuses its frame (attestation ${h.status.toLowerCase()}): it goes on as its id and the client it names`,
          ),
          "rebuilt"
        );
      } else if (h.kind !== "pass") return this.applySessionChannelVerdict(e, h);
      if (attestedRequestSubtype(e.payload) === "ui_surface") this.surfaceFramesAtFloor.set(e, "stands");
      return "passed";
    } catch (error) {
      return (
        logForDebugging(
          `[remote-io] a guarded session-channel frame could not be judged or handled; dropped: ${errorMessage(error)}`,
          { level: "warn" },
        ),
        "dropped"
      );
    }
  }
  takeWorkerAttestationPolicy(e) {
    if (
      ((this.workerAttestationPolicy = e.policy),
      (this.storedEventPolicy = resolveCarriedPolicy(
        this.storedEventPolicy,
        e,
        this.connectionIsFromSessionService(),
      )),
      this.storedEventPolicy !== void 0)
    )
      this.firstStreamPolicy.resolve();
    if (
      ((this.isSurfacePolicyUnreadable =
        e.fault === "policy_unparseable" || (e.fault === "policy_partial" && e.policy.enforce)),
      e.fault !== void 0)
    )
      reportAttestationHeaderUnreadable(e.fault);
    (this.refuseSurfaceClientsBelowPolicy(), this.takeSessionWritersStatement());
  }
  takeSessionWritersStatement() {
    try {
      let sessionWritersStatement = this.transport.getSessionWritersStatement();
      this.statementRenewal.stated(
        sessionWritersStatement?.writers === "owner_account_only"
          ? sessionWritersStatement.statedAtMs
          : void 0,
      );
    } catch (error) {
      logError(toError(error));
    }
  }
  reviewStatementRenewal() {
    qe(() => this.statementRenewal.review());
  }
  awaitsFresherStatement(e, n) {
    try {
      let r = extractControlResponse(e.payload),
        s =
          attestedRequestSubtype(e.payload) === "ui_surface" ||
          (r !== void 0 && this.liveDeviceRequestKind(r) === "host_ask"),
        h =
          e.event_type === e.payload.type && typeof e.created_at === "string"
            ? Date.parse(e.created_at)
            : Number.NaN;
      return (
        s &&
        Fce(this.uiSurfaceChannel()) &&
        frameAgeVerdict({ createdAt: Number.isNaN(h) ? void 0 : h, sessionWriters: n }, Date.now()) ===
          "session_writers_stale"
      );
    } catch (error) {
      return (logError(toError(error)), !1);
    }
  }
  surfacePolicy() {
    return this.isSurfacePolicyUnreadable ? "unreadable" : this.workerAttestationPolicy;
  }
  leavesOwnSurface(e, n) {
    let r = n === void 0 ? void 0 : this.surfaceClientsAttached().get(n);
    if (r === void 0) return !1;
    let s = De(r.trustedDevice),
      h = De(r.credential);
    return (s !== void 0 && s === De(e.trustedDevice)) || (h !== void 0 && h === De(e.credential));
  }
  judgeNotingAdmission(e, n) {
    let r =
        e.payload.type === "control_request" && getControlRequestSubtype(e.payload) !== void 0
          ? getControlRequestSubtype_2(e.payload)
          : void 0,
      s = r === void 0 || isKnownControlRequestId(r),
      h = n();
    try {
      if (h === !1 && r !== void 0 && isKnownControlRequestId(r))
        this.surfaceRefusals.admitted({ requestId: r, frame: Ze(e), wasSeen: s });
    } catch (error) {
      logError(toError(error));
    }
    return h;
  }
  judgeInboundFrame(e, { isManagedCloudWorker: isManagedCloudWorker, sessionWriters: sessionWriters }) {
    if (isManagedCloudWorker) this.countHookOrPluginSender(e);
    let s =
      isManagedCloudWorker || attestedRequestSubtype(e.payload) === "ui_surface"
        ? this.sessionChannelFloorVerdict(e, sessionWriters)
        : "passed";
    if (s === "dropped") return !0;
    if (s === "rebuilt") return !1;
    if (this.workerAttestationPolicy === void 0) return (rememberInboundRequestId(e), !1);
    let h = this.workerAttestationPolicy.enforce ? isServiceVouchedSettingsRequest(e) : void 0;
    if (h !== void 0 && (isKnownControlRequestId(h) || this.vouchedModelOrEffortRequestIds.has(h)))
      return "attestation_policy";
    if (
      filterInboundEventBySource(
        e,
        this.workerAttestationPolicy,
        normalizeAttestationStatus(e.device_attestation_status) === "TRANSITIVELY_VOUCHED" &&
          (hLe() ?? "accept") === "accept",
        this.vouchableCloudModel,
      )
    )
      return "attestation_policy";
    if (h !== void 0) {
      if (this.vouchedModelOrEffortRequestIds.size >= _o) return "attestation_policy";
      this.vouchedModelOrEffortRequestIds.add(h);
    }
    return !1;
  }
  guardedFamilies() {
    let e = isRemoteToolForwardingSwitchOn() && !isSessionChannelDisabled(),
      waitsOnHostAsk = this.waitsOnHostAsk();
    return { remoteTools: e, hooks: !1, plugins: !1, hostAsks: waitsOnHostAsk, surfaces: !0 };
  }
  hookAndPluginAdmissions() {
    return {
      hooks: ccrAuthRefreshAdmission({
        sdkUrl: !0,
        remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
        environmentKind: void 0,
        entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
        disabled: env.CLAUDE_CODE_DISABLE_HOOK_FORWARDING,
        hermetic: isHermeticRemoteSession(),
      }).admitted,
      plugins: sessionAuthAdmission({
        sdkUrl: !0,
        remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
        environmentKind: void 0,
        entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
        disabled: env.CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING,
        hermetic: isHermeticRemoteSession(),
      }).admitted,
    };
  }
  countHookOrPluginSender(e) {
    try {
      let n = classifyAttestationAction(e.payload, (k) => this.liveDeviceRequestKind(k));
      if (n === void 0) return;
      let { verdict: verdict, status: status } = judgeAttestationAction(n, e),
        h = `${n}:${status}`,
        y = nn[n];
      if (this.countedSenderStatuses.has(h) || !this.hookAndPluginAdmissions()[y]) return;
      let S = this.guardedFamilies()[y] ? "enforce" : "observe";
      (this.countedSenderStatuses.add(h),
        logEvent("tengu_session_channel_sender_status", {
          kind: fromEnum(n),
          attestation_status: fromEnum(status),
          verdict: fromEnum(verdict === "pass" ? "pass" : "below_floor"),
          mode: fromEnum(S),
        }));
    } catch (error) {
      logForDebugging(
        `[remote-io] counting a hook or plugin frame's sender failed; the frame goes on as it would have: ${errorMessage(error)}`,
        { level: "warn" },
      );
    }
  }
  countRefusedSurfaceRequest(e) {
    if (this.countedRefusedSurfaceRequests.has(e)) return;
    this.countedRefusedSurfaceRequests.add(e);
    try {
      logFeatureBad("plugin_function_hooks_surface_request", e);
    } catch (error) {
      logError(toError(error));
    }
  }
  countObservedSurfaceRequest(e) {
    let n = `observed_below_floor_${e}`;
    if (this.countedRefusedSurfaceRequests.has(n)) return;
    this.countedRefusedSurfaceRequests.add(n);
    try {
      logFeatureSad("plugin_function_hooks_surface_request", n);
    } catch (error) {
      logError(toError(error));
    }
  }
  controlRequestEnded(e) {
    try {
      this.surfaceRefusals.settled(e);
    } catch (error) {
      logError(toError(error));
    }
  }
  answersSurfaceRefusal(e) {
    try {
      let answers = this.surfaceRefusals.answers(
        { requestId: Reflect.get(e, "request_id"), frame: getStreamFrame(e) },
        "loop",
      );
      if (!answers) this.countRefusedSurfaceRequest("refusal_unanswered");
      return answers;
    } catch (error) {
      return (logError(toError(error)), !1);
    }
  }
  applySessionChannelVerdict(e, n) {
    let lower = n.status.toLowerCase();
    switch (n.kind) {
      case "refuse_request":
        return (
          logFeatureBad(CONTROL_SUBTYPE_TO_CAPABILITY[n.subtype], `unverified_sender_${lower}`),
          logForDebugging(`[remote-io] dropped a below-floor ${n.subtype} (attestation ${lower}) unanswered`),
          "dropped"
        );
      case "refuse_surface_request": {
        let s = knownSubtypeOrUndefined(n.wireSubtype) ?? UI_OTHER;
        if (
          (this.countRefusedSurfaceRequest(
            n.refusal === "unreadable_policy" ? n.refusal : `${n.refusal}_${lower}_${s}`,
          ),
          !this.surfaceRefusals.answers({ requestId: n.requestId, frame: Ze(e) }, "filter"))
        )
          return (
            logForDebugging(
              `[remote-io] dropped a refused surface request (${n.refusal}, attestation ${lower}) unanswered: its id is none a refusal is written under, or this window's refusals are spent`,
            ),
            "dropped"
          );
        return (
          rewriteAsControlRequest(e.payload, {
            requestId: n.requestId ?? "",
            subtype: s,
            eventId: e.event_id,
          }),
          logForDebugging(
            `[remote-io] a refused surface request (${n.refusal}, attestation ${lower}) goes on as its id and its subtype's name, to be answered as unserved`,
          ),
          "rebuilt"
        );
      }
      case "drop_answer": {
        let s = n.why === void 0 || n.why === "below_floor" ? void 0 : n.why;
        if (s === void 0) logFeatureBad(Xn[n.answers], `unverified_answer_dropped_${lower}`);
        else if (!this.countedDroppedAnswers.has(s))
          (this.countedDroppedAnswers.add(s), logFeatureBad(Xn[n.answers], `answer_dropped_${s}`));
        return (
          logForDebugging(
            `[remote-io] dropped a reply to ${Qn[n.answers][0]} request ${n.requestId} (attestation ${lower}, ${s ?? "below the floor"}); the request keeps waiting for ${Qn[n.answers][1]}`,
          ),
          "dropped"
        );
      }
      case "strip_forwarded_plugins":
        return (
          pn(e.payload, n.remainder),
          logFeatureSad("ccr_cloud_plugins_forward", `unverified_patch_stripped_${lower}`),
          logForDebugging(
            `[remote-io] stripped below-floor forwarded plugin choices from an apply_flag_settings (attestation ${lower}); its other keys go on`,
          ),
          "passed"
        );
      case "admit_refusal":
        return (
          yn(e.payload, n.requestId, n.result),
          logFeatureSad("remote_tool_forward", `unverified_refusal_admitted_${lower}`),
          logForDebugging(
            `[remote-io] admitted a below-floor refusal of served-call request ${n.requestId} (attestation ${lower}) rebuilt and marked unverified: the machine is asked what became of the call`,
          ),
          "rebuilt"
        );
    }
  }
  flushInternalEvents() {
    return this.ccrClient.flushInternalEvents();
  }
  watchInternalEventPosts() {
    return this.ccrClient.watchInternalEventPosts();
  }
  withdrawQueuedRequest(e) {
    return this.ccrClient.withdrawQueuedControlRequest(e) > 0;
  }
  refusedInternalEvents(e) {
    return this.ccrClient.refusedInternalEvents(e);
  }
  readStreamFrameAt() {
    return this.transport.lastFrameReadAt();
  }
  sessionStreamJoinedAt() {
    return this.transport.firstConnectedServiceMs();
  }
  newestSessionStreamCreatedAt() {
    return this.newestFrameCreatedAt;
  }
  sessionServiceNow() {
    let serviceNow = this.transport.serviceNow();
    return serviceNow === void 0 ? void 0 : Math.max(serviceNow, this.newestFrameCreatedAt ?? serviceNow);
  }
  sessionServiceNowAtMost() {
    let serviceNowAtMost = this.transport.serviceNowAtMost();
    return serviceNowAtMost === void 0
      ? void 0
      : Math.max(serviceNowAtMost, this.newestFrameCreatedAt ?? serviceNowAtMost);
  }
  async flushInternalEventsConfirmed() {
    let droppedInternalBatches = this.ccrClient.droppedInternalBatches;
    return (
      await this.ccrClient.flushInternalEvents(),
      this.ccrClient.droppedInternalBatches === droppedInternalBatches && !this.ccrClient.awaitsCompactSummary
    );
  }
  flushDeliveryAcks() {
    return this.ccrClient.flushDeliveryAcks();
  }
  flushDeliveryAcksConfirmed() {
    return this.ccrClient.flushDeliveryAcksConfirmed();
  }
  settleVouchedModelOrEffort(e) {
    this.vouchableCloudModel = e;
  }
  takeVouchedModelOrEffortRequest(e) {
    return this.vouchedModelOrEffortRequestIds.delete(e) && this.workerAttestationPolicy?.enforce === !0;
  }
  setUploadAheadOfWaitingOnUser(e) {
    this.waitingOnUserReport.setUploadAhead(e);
  }
  idleLineWaitsFor(e) {
    this.idleLine?.uploadAsked(e);
  }
  setOnOwnerPresent(e) {
    this.transport.setOnOwnerPresent(e);
  }
  setOnPromptAnswered(e) {
    this.onPromptAnswered = e;
  }
  rereadWorkerState() {
    return this.ccrClient.readWorkerState();
  }
  sendOwedClientRowsAgain(e) {
    return catchUpClientRows(this.ccrClient, e);
  }
  markOfRepliesShownAsStored() {
    return this.ccrClient.markOfRepliesShownAsStored();
  }
  readProjectsBinding() {
    return this.ccrClient.readProjectsBinding();
  }
  workerEpoch() {
    return this.ccrClient.currentWorkerEpoch;
  }
  async flushClientEvents() {
    let droppedDurableBatches = this.ccrClient.droppedDurableBatches;
    return (await this.ccrClient.flush(), this.ccrClient.droppedDurableBatches === droppedDurableBatches);
  }
  async flushSessionState() {
    let droppedWorkerStatePatches = this.ccrClient.droppedWorkerStatePatches;
    return (
      (await this.ccrClient.flushWorkerState()) &&
      this.ccrClient.droppedWorkerStatePatches === droppedWorkerStatePatches
    );
  }
  get sessionStatePatchesRefused() {
    return this.ccrClient.droppedWorkerStatePatches;
  }
  get internalEventsPending() {
    return this.ccrClient.internalEventsPending;
  }
  get unsentInternalEvents() {
    return this.ccrClient.uploadBacklog().unsentInternalEvents;
  }
  get hasUnsentUploads() {
    return this.ccrClient.hasUnsentUploads();
  }
  get droppedInternalBatches() {
    return this.ccrClient.droppedInternalBatches;
  }
  hasInternalEventRoom(e) {
    return this.ccrClient.hasInternalEventRoom(e);
  }
  repeatAfterCompaction(e) {
    this.ccrClient.rowsRepeatedAfterCompaction = e;
  }
  readInternalEvents(e, n) {
    return this.ccrClient.readInternalEvents(void 0, e, n);
  }
  readAgentMetadataEvents(e, n) {
    return this.ccrClient.readAgentMetadataEvents(e, n);
  }
  teeActivity(e) {
    if (this.activityFd !== void 0) {
      this.activityFd.write(e);
      return;
    }
    writeToStdout(e);
  }
  writeInbound(e, n) {
    if (this.inputStream.destroyed || this.inputStream.writableEnded) {
      if (!this.inboundLanesDroppedAfterClose.has(n))
        (this.inboundLanesDroppedAfterClose.add(n),
          logForDiagnosticsNoPII("info", "cli_remote_io_inbound_dropped_after_close", { lane: n }));
      return;
    }
    (this.noteInputWritten(e), this.inputStream.write(e));
  }
  writeActivityLine(e) {
    this.teeActivity(e);
  }
  acceptsInboundEnvUpdates() {
    switch (this.hosting.kind) {
      case "owns-process":
        return this.hosting.trustsInboundEnvUpdates;
      case "hosted":
        return !1;
    }
  }
  exitOnFatalInput(e) {
    switch (this.hosting.kind) {
      case "owns-process":
        return super.exitOnFatalInput(e);
      case "hosted":
        return (
          logForDebugging(`[remote-io] ${e}`, { level: "error" }),
          this.stopFor({ kind: "unreadable-input" }),
          Promise.reject(new UnreadableInputError())
        );
    }
  }
  recordUserDrivenInbound(e) {
    switch ((super.recordUserDrivenInbound(e), e.type)) {
      case "user":
        if (isHumanInboundMessage(e, "remote-worker", isProjectsHumanOriginEnabled()))
          this.idleTracker.noteActivity();
        return;
      case "control_response":
        if (e.response.subtype === "success") this.idleTracker.noteActivity();
        return;
      case "control_request":
        if (C6n(e)) this.idleTracker.noteActivity();
        return;
      case "bash_command":
        this.idleTracker.noteActivity();
        return;
      default:
        return;
    }
  }
  recordAnsweredPrompt(e, n) {
    if (e.response.subtype === "success" && (n === "can_use_tool" || n === "request_user_dialog"))
      this.onPromptAnswered?.();
  }
  answerOwnWithdrawnAsk(e, n) {
    (this.ownDeniesAwaitingCancel.add(e),
      this.outbound.enqueue({
        type: "control_response",
        response: {
          subtype: "success",
          request_id: e,
          response: { behavior: "deny", message: PERMISSION_WITHDRAWN_MESSAGE, toolUseID: n },
        },
      }));
  }
  async write(e) {
    if (e.type === "transcript_mirror") return;
    if (e.type === "control_response") this.controlRequestEnded(e.response.request_id);
    let heldDueBefore = this.heldDueBefore(e);
    if (heldDueBefore.length > 0) await this.writeHeld(heldDueBefore);
    let trackWrite = this.trackWrite(e);
    if ((this.taskHoldClock.note(trackWrite, Date.now()), this.teeStdout && !this.isBridge)) {
      if (trackWrite.type === "result")
        (this.waitingOnUserReport.resultGoesNext(), this.idleLine?.resultGoesNext());
      let y = projectSdkEventForStream(trackWrite);
      if (y !== void 0)
        try {
          this.teeActivity(
            ndjsonStringify(y) +
              `
`,
          );
        } catch {}
      if (trackWrite.type === "system" && trackWrite.subtype === "init") this.endAliveBeforeInit();
    }
    let s =
      trackWrite.type === "control_cancel_request"
        ? this.ownDenyHeldForCancel.get(trackWrite.request_id)
        : void 0;
    if (
      trackWrite.type === "control_response" &&
      this.ownDeniesAwaitingCancel.delete(trackWrite.response.request_id)
    )
      this.ownDenyHeldForCancel.set(trackWrite.response.request_id, trackWrite);
    else if (s !== void 0 && trackWrite.type === "control_cancel_request")
      (this.ownDenyHeldForCancel.delete(trackWrite.request_id),
        await this.ccrClient.writeEvents([s, trackWrite], { together: !0 }));
    else await this.ccrClient.writeEvent(trackWrite);
    if (this.isBridge) {
      if (trackWrite.type === "control_request" || (this.isDebug && !isLiveOnlyResponse(trackWrite)))
        writeToStdout(
          ndjsonStringify(trackWrite) +
            `
`,
        );
    }
    let heldDueAfter = this.heldDueAfter(trackWrite);
    if (heldDueAfter.length > 0) await this.writeHeld(heldDueAfter);
  }
  trackFirstFrameUpload(e) {
    return this.ccrClient.trackFirstFrameUpload(e);
  }
  trackFirstTextFrameUpload(e) {
    return this.ccrClient.trackFirstTextFrameUpload(e);
  }
  trackFirstBlockFrameUpload(e) {
    return this.ccrClient.trackFirstBlockFrameUpload(e);
  }
  uploadHoldInAll() {
    return this.ccrClient.uploadHoldInAll();
  }
  uploadLaneCounts() {
    return this.ccrClient.uploadLaneCounts();
  }
  close() {
    switch (((this.endedByHost = !0), this.closeConnections(), this.hosting.kind)) {
      case "owns-process":
        return;
      case "hosted":
        this.ccrClient.close({ goodbye: !1 });
        return;
    }
  }
  async closeForSuccessor({ drained: drained = !1 } = {}) {
    (this.close(), await this.ccrClient.releaseLease({ drained: drained }));
  }
  async goodbye({ releaseLease: releaseLease, drained: drained = !1, withinMs: withinMs = 1 / 0 }) {
    ((this.endedByHost = !0), this.ccrClient.beginShutdown(), this.closeConnections());
    let s = releaseLease && this.ccrClient.leftMidTurn;
    if ((await this.ccrClient.finishShutdown(void 0, withinMs - (s ? SHUTDOWN_REQUEST_TIMEOUT_MS : 0)), s))
      await this.ccrClient.releaseLease({ drained: drained });
  }
  stopFor(e) {
    if (this.closeCause !== void 0 || this.endedByHost) return;
    if (((this.closeCause = e), e.kind !== "unreadable-input")) this.permanentCloseCode = e.closeCode;
    switch (this.hosting.kind) {
      case "owns-process":
        return;
      case "hosted":
        (this.ccrClient.close({ goodbye: !1 }), this.closeConnections());
        try {
          this.hosting.onFatal(e);
        } catch (error) {
          logError(error);
        }
        return;
    }
  }
  closeConnections() {
    if (this.ownDenyHeldForCancel.size > 0)
      logForDebugging(
        `[remote-io] closing with ${this.ownDenyHeldForCancel.size} unsent Deny answer(s) to withdrawn permission asks: the cancel each was waiting to share a POST with never came through write(), so neither reached the server`,
        { level: "warn" },
      );
    if (
      (rns(null),
      ons(null),
      this.waitingOnUserReport.setUploadAhead(null),
      this.idleLine?.close(),
      this.disarmModelCallProxyRefusalRideOut?.(),
      (this.takeRunnerLine = void 0),
      clearSenderDropWriter(this.attestationDropSenderWriter),
      clearDropNotifier(this.attestationDropNotifier),
      this.keepAliveTimer)
    )
      (clearInterval(this.keepAliveTimer), (this.keepAliveTimer = null));
    (this.endAliveBeforeInit(),
      this.unsubscribeGrowthBookRefresh(),
      this.statementRenewal.stop(),
      this.transport.close(),
      this.inputStream.end());
  }
  endAliveBeforeInit() {
    if (this.aliveBeforeInit !== "over")
      (clearInterval(this.aliveBeforeInit), (this.aliveBeforeInit = "over"));
  }
}
//@ chunk-z4g2ta8k.js:104943-104984 placement
function qe(e) {
  try {
    e();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-z4g2ta8k.js:104984-105082 placement
function ho(e) {
  switch (e.kind) {
    case "owns-process":
      return e.adoptRefreshedAuth;
    case "hosted":
      return;
  }
}
//@ chunk-z4g2ta8k.js:105082-105242 placement
function classifyStreamCloseCode(e) {
  let n = WORKER_CONFLICT_CLOSE_CODES[e];
  switch (n) {
    case 4090:
      return { kind: "lease-superseded", cause: e, closeCode: n };
    case 4094:
      return { kind: "auth-rejected", cause: e, closeCode: n };
  }
}
//@ chunk-z4g2ta8k.js:105242-105304 placement
function isCcrStreamEventFlushMsGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_ccr_stream_event_flush_ms",
    DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS,
  );
}
//@ chunk-z4g2ta8k.js:105304-105364 placement
function isCcrStreamFirstFlushMsGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_stream_first_flush_ms", 0);
}
//@ chunk-z4g2ta8k.js:105364-105414 placement
function isIdempotentPineGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_idempotent_pine", 0);
}
//@ chunk-z4g2ta8k.js:105414-105475 placement
function isCcrNoSubscriberFlushMsGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_no_subscriber_flush_ms", 0);
}
//@ chunk-z4g2ta8k.js:105475-105737 placement
function getHeartbeatFeatureFlags() {
  return {
    advertiseHeartbeatProbeSupport: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_idle_heartbeat", !1),
    beatOnStaleReconnect: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_reconnect_beat", !1),
    beatOnReactivation: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_reactivation_beat", !1),
    skipRedundantHeartbeats: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_skip_redundant_heartbeat", !1),
  };
}
//@ chunk-z4g2ta8k.js:105737-105805 placement
function isCcrDropUnwatchedStreamEventsGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_drop_unwatched_stream_events", !1);
}
//@ chunk-z4g2ta8k.js:105805-107157 placement
function projectSdkEventForStream(e) {
  let n = e,
    subtype = n.subtype;
  if (e.type === "result" || (e.type === "system" && subtype === "init"))
    return e.type === "result"
      ? {
          ...e,
          result: void 0,
          permission_denials: void 0,
          structured_output: void 0,
          deferred_tool_use: void 0,
          errors: void 0,
          subagent_stats: void 0,
        }
      : e;
  if (e.type === "system" && subtype === "task_started")
    return {
      type: "system",
      subtype: subtype,
      task_id: n.task_id,
      task_type: n.task_type,
      owned_by_subagent: n.owned_by_subagent,
    };
  if (e.type === "system" && subtype === "task_updated") {
    let patch = n.patch;
    return {
      type: "system",
      subtype: subtype,
      task_id: n.task_id,
      patch: { status: patch?.status, is_backgrounded: patch?.is_backgrounded },
    };
  }
  if (e.type === "system" && subtype === "task_notification")
    return { type: "system", subtype: subtype, task_id: n.task_id, status: n.status };
  if (e.type === "system" && subtype === "background_tasks_changed") {
    let tasks = n.tasks;
    return {
      type: "system",
      subtype: subtype,
      tasks: Array.isArray(tasks) ? tasks.map((h) => ({ task_id: h?.task_id })) : [],
    };
  }
  if (e.type === "system" && subtype === "hook_response")
    return { type: "system", subtype: subtype, hook_event: n.hook_event, outcome: n.outcome };
  if (e.type === "user") return { type: e.type, subtype: subtype, ...gt(n) };
  if (e.type === "assistant") {
    let s = n.message?.content;
    if (Array.isArray(s)) {
      let found = s.find(
        (y) => y && typeof y === "object" && y.type === "tool_use" && y.name === SCHEDULE_WAKEUP_TOOL_NAME,
      );
      if (found) {
        let input = found.input;
        return {
          type: "assistant",
          subtype: subtype,
          ...gt(n),
          message: {
            content: [
              {
                type: "tool_use",
                name: SCHEDULE_WAKEUP_TOOL_NAME,
                input: { delaySeconds: input?.delaySeconds },
              },
            ],
          },
        };
      }
    }
    return { type: e.type, subtype: subtype, ...gt(n) };
  }
  return;
}
//@ chunk-z4g2ta8k.js:107157-107228 placement
function gt(e) {
  return e.parent_tool_use_id != null ? { from_subagent: !0 } : {};
}
//@ chunk-z4g2ta8k.js:107228-107367 placement
function collectControlRequestIds(e) {
  return e.flatMap((n) =>
    n.payload.type === "control_request" && typeof n.payload.request_id === "string"
      ? [n.payload.request_id]
      : [],
  );
}
//@ chunk-z4g2ta8k.js:107367-107493 placement
function hasResumeFlag(e) {
  for (let n of e) {
    if (n === "--") return !1;
    if (n === "--resume" || n === "-r" || n.startsWith("--resume=")) return !0;
  }
  return !1;
}
//@ chunk-z4g2ta8k.js:107493-107699 placement
async function readInternalEventsFromTip(e, n, r) {
  let s = p7t(),
    h = s ? await readTranscriptTailForTip(s, r) : void 0,
    y = s ? await getValidatedCCRTip(s, h, r) : void 0,
    [S, k] = await Promise.all([
      e(y?.eventId),
      h === null || y?.eventId !== void 0 || (HPr() && r === void 0) ? void 0 : n(),
    ]);
  return [S, k, y];
}
//@ chunk-z4g2ta8k.js:107699-107963 placement
function startEarlyRemoteWork(e, n, { hydrate: hydrate, connect: connect }) {
  if (Object.keys(getSessionIngressAuthHeaders()).length === 0) return { hydrateReads: void 0, link: void 0 };
  let h = getTransportForUrl(new Zn(e));
  return (
    addStartupContext({
      ...(hydrate && { early_hydrate_prefetch: 1 }),
      ...(connect && { early_remote_connect: 1 }),
    }),
    {
      hydrateReads: hydrate ? loadCcrInternalEvents(h, n) : void 0,
      link: connect ? remoteIOWorkerEnv(h, n) : void 0,
    }
  );
}
//@ chunk-z4g2ta8k.js:107963-108184 placement
function loadCcrInternalEvents(e, n) {
  return (async () => {
    let r = !1,
      s = {
        ...convertWsUrlToPostUrl(e, getSessionIngressAuthHeaders),
        onConflict: () => {
          r = !0;
        },
      },
      h = await readInternalEventsFromTip(
        (y) => CCRClient.readInternalEventsFrom(s, y),
        () => CCRClient.readSubagentInternalEventsFrom(s),
        n,
      );
    return r ? void 0 : h;
  })().catch((r) => {
    logError(r);
    return;
  });
}
//@ chunk-z4g2ta8k.js:108184-108232 placement
function turnHandoffRegistrationNow(e, n, r) {
  return turnHandoffRegistration(e, n, r, isClaudeAiChatOrigin(), aQe());
}
//@ chunk-z4g2ta8k.js:108232-108343 placement
function turnHandoffRegistrationToAnnounce(e, n, r) {
  if (e.admitted && isClaudeAiChatOrigin()) logHandoffFlagAdvert();
  let s = turnHandoffRegistrationNow(e, n, r);
  if (s?.turn_handoff?.carried_writes) Lt();
  return s;
}
//@ chunk-z4g2ta8k.js:108343-109134 placement
function remoteIOWorkerEnv(e, n) {
  let r = cliRemoteWorkerInputs(),
    s = turnHandoffAdmission({
      sdkUrl: !0,
      remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
      environmentKind: env.CLAUDE_CODE_ENVIRONMENT_KIND,
      disabled: env.CLAUDE_CODE_DISABLE_TURN_HANDOFF,
    }),
    h = shouldCarryWrites({
      admission: s,
      relayConfigured: St !== null && St.getTeleportRelayEnvConfig() !== null,
      persistsTranscript: !isTranscriptPersistenceDisabled(),
      sharedBackend: isDiagLogging(),
    }),
    y = startRemoteWorker({
      url: e,
      getAuthHeaders: getSessionIngressAuthHeaders,
      sessionId: getSessionId(),
      environmentKind: r.environmentKind,
      storageV5: n,
      hosting: r.hosting,
      onEpochMismatch: void 0,
      reportParkAtInit: r.reportParkAtInit,
      initExternalMetadata: turnHandoffRegistrationNow(s, r.workerEpoch, h),
      initialWorkerStatus: void 0,
      deferDelivery: !0,
    }),
    initialize = y.ccrClient.initialize(r.workerEpoch);
  if ((initialize.catch(() => {}), r.environmentKind !== "bridge"))
    y.transport.setWorkerAttestationPolicySink(() => {});
  return (y.transport.connect(), { ...y, initialized: initialize, inputs: r, usesRelayMarker: h });
}
//@ chunk-z4g2ta8k.js:109134-109423 placement
function cliRemoteWorkerInputs() {
  let e = process.env.CLAUDE_CODE_ENVIRONMENT_KIND ?? null;
  return {
    environmentKind: e,
    workerEpoch: NNo(),
    hosting: { kind: "owns-process", trustsInboundEnvUpdates: !0, adoptRefreshedAuth: Mn(e) },
    reportParkAtInit: env.CLAUDE_CODE_HOLD_REPORT_PARK_AT_INIT && env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN,
  };
}
/**
 * 启动云 worker：组装 RemoteIO 所需环境、认证与事件流，启动并接管会话。
 */
//@ chunk-z4g2ta8k.js:109423-112627 placement
function startRemoteWorker({
  url: url,
  getAuthHeaders: getAuthHeaders,
  sessionId: sessionId,
  environmentKind: environmentKind,
  storageV5: storageV5,
  hosting: hosting,
  onEpochMismatch: onEpochMismatch,
  reportParkAtInit: reportParkAtInit,
  initExternalMetadata: initExternalMetadata,
  initialWorkerStatus: initialWorkerStatus,
  deferDelivery: deferDelivery,
}) {
  let x =
      environmentKind === "bridge"
        ? void 0
        : hosting.kind === "hosted"
          ? (ne, Q, ue) => {
              hosting.onDiagnostic(ne.replace(/\bexiting$/, "stopping"), Q, ue);
            }
          : (ne) => {
              process.stderr.write(`SDKStartup: ${ne}
`);
            },
    U = { "anthropic-client-platform": getClientPlatform(), ...getAuthHeaders() },
    envClaudeCodeEnvironmentRunnerVersion = process.env.CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION;
  if (envClaudeCodeEnvironmentRunnerVersion)
    U["x-environment-runner-version"] = envClaudeCodeEnvironmentRunnerVersion;
  let T = () => {
      let ne = { ...getAuthHeaders() },
        envClaudeCodeEnvironmentRunnerVersion = process.env.CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION;
      if (envClaudeCodeEnvironmentRunnerVersion)
        ne["x-environment-runner-version"] = envClaudeCodeEnvironmentRunnerVersion;
      return ne;
    },
    q =
      env.CLAUDE_CODE_CCR_WORKER_SOCKET?.split(",")
        .map((ne) => ne.trim())
        .includes(TKs) &&
      alwaysTrue() &&
      hosting.kind === "owns-process" &&
      environmentKind === null &&
      mn()
        ? new WorkerSocket(openWorkerWebSocket, (ne) => zci(ne, storageV5, "ccr_worker"))
        : void 0,
    z = new Set(),
    G = createWorkerEventsTransport(url, U, {
      sessionId: sessionId,
      refreshHeaders: T,
      getAuthHeaders: getAuthHeaders,
      deferDelivery: deferDelivery,
      streamOpener: q,
      mostMembersInAFrame: hosting.kind === "hosted" ? hosting.mostMembersInAFrame : void 0,
      lighterFrame: pLs,
      connectTimeoutMs: () => getPollIntervalConfig().sse_connect_timeout_ms,
      sseKeepaliveMaxIntervalSeconds: () =>
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_sse_keepalive_max_interval_s", 0),
      longPollFallback: () =>
        hosting.kind === "owns-process" &&
        !mn() &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_sse_long_poll_fallback", !0),
      requireStreamEvidence: !1,
      onUnexpectedContentType: ({ status: status, contentType: contentType, accepted: accepted }) => {
        try {
          let Z = `${contentType}:${accepted}`;
          if (z.has(Z)) return;
          (z.add(Z),
            logEvent("tengu_ccr_sse_unexpected_content_type", {
              status: status,
              content_type: fromEnum(contentType),
              accepted: accepted,
            }));
        } catch (error) {
          logForDebugging(
            `[remote-io] reporting a stream answer's unexpected content type failed; the connect goes on: ${errorMessage(error)}`,
            { level: "warn" },
          );
        }
      },
    });
  if (x) G.setOnDiagnostic?.(x);
  let L = void 0,
    j = void 0,
    ae = createIdleTracker(),
    de = new CCRClient(G, url, {
      onDiagnostic: x,
      ...(hosting.kind === "hosted" && { onCardRecordRefused: hosting.onCardRecordRefused }),
      ...(onEpochMismatch && { onEpochMismatch: onEpochMismatch }),
      ...{},
      ...!1,
      ...!1,
      ...getHeartbeatFeatureFlags(),
      ...(hosting.kind === "owns-process" &&
        (environmentKind === null || environmentKind === "anthropic_cloud") && { ownConnectionPool: YDo }),
      streamEventFlushIntervalMs: isCcrStreamEventFlushMsGateOn(),
      streamEventFirstFlushMs: isCcrStreamFirstFlushMsGateOn(),
      toolInputFlushMs: isIdempotentPineGateOn(),
      noSubscriberStreamEventFlushIntervalMs: isCcrNoSubscriberFlushMsGateOn(),
      dropUnwatchedStreamEvents: isCcrDropUnwatchedStreamEventsGateOn(),
      ...(isRemoteToolForwardingSwitchOn() && { servedCallRequestsJumpQueue: servedCallRequestsJumpQueueOn }),
      idleTracker: ae,
      uploadTrim: () =>
        Pt(getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_upload_trim", {}), hosting.kind === "hosted"),
      keepsRequestId: () => getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TOASTY_BEACON, !1),
      uploadHoldMarker: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_upload_hold_marker", !1),
      ...(environmentKind === "bridge" && {
        liveOnlyShellTaskRows: {
          enabled: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_shell_task_rows_live_only_enabled", !1),
          starts: new Map(),
        },
        artifactSocketIds: new Set(),
      }),
      followsServedPolicy: !0,
      ...(hosting.kind === "owns-process" && {
        keepAliveAtWorkStart: () =>
          sendSessionActivitySignal_2() &&
          (isActivityReasonActive("api_call") ||
            isActivityReasonActive("tool_exec") ||
            isActivityReasonActive("hook_exec")),
      }),
      launchFlushPolicy:
        safeParseJSON(env.CLAUDE_CODE_CCR_EVENT_FLUSH_POLICY, !1) ?? env.CLAUDE_CODE_CCR_EVENT_FLUSH_POLICY,
      workerSocket: q,
      ...((environmentKind === null ||
        environmentKind === "anthropic_cloud" ||
        isRemoteToolForwardingSwitchOn()) && { maxEventPostTimeoutMs: REMOTE_IO_TIMEOUT_MS }),
      ...(hosting.kind === "owns-process" && {
        guardsClientRows: () =>
          isSelfHostedRemoteEnvironment() &&
          !isReviewSession() &&
          getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PATIENT_LEDGER, !1),
      }),
      processExiting: isShuttingDown,
      gatesToolCalls: environmentKind !== "bridge",
      adoptRefreshedAuth: ho(hosting),
      gzipRequestBodyFetch: createGzipFetchWrapper("ccr_worker", storageV5),
      getAuthHeaders: getAuthHeaders,
      isFirstPartyProvider: isFirstPartyProvider,
      reportParkAtInit: reportParkAtInit,
      initExternalMetadata: initExternalMetadata,
      initialWorkerStatus: initialWorkerStatus,
    });
  switch (hosting.kind) {
    case "owns-process":
      (de.registerShutdownCleanup(), registerCleanup(async () => G.close()));
      break;
    case "hosted":
      break;
  }
  return {
    transport: G,
    ccrClient: de,
    idleTracker: ae,
    onDiagnostic: x,
    initExternalMetadata: initExternalMetadata,
    proxyRefusal: L,
  };
}

export {
  RemoteIO,
  sessionStreamCreatedAt,
  sessionStreamWriters,
  sessionStreamReceivedAtMs,
  sessionStreamStartedBefore,
  cliRemoteWorkerInputs,
  hasResumeFlag,
  turnHandoffRegistrationNow,
  turnHandoffRegistrationToAnnounce,
};

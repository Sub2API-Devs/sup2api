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
import { URL as As } from "url";
import { fstatSync, createWriteStream } from "fs";
import { sessionWritersSchema, isCoalescableControlRequest } from "./transports/streamEventCoalescing.js";
import { DoctorLazy } from "./handlers/util.js";
import { zodStrictObject, union, string, E } from "../../vendor/zod/v4/classic/schemas.js";
import {
  attestedRequestSubtype,
  turnHandoffAvailableMessage,
  isTurnHandoffResumeEnabled,
  waitForTurnPromptUploads,
  turnHandoffRegistration,
  isCarriedWritesEnabled,
  logHandoffFlagAdvert,
  markSaidCarriedWrites,
  turnHandoffAdmission,
  shouldCarryWrites,
  withEnvelopeFlag,
} from "./remoteIO/turnHandoff.js";
import {
  isUiSurfaceName,
  canServeManifests,
  frameAgeVerdict,
  redactSdkMcpManifests,
} from "./sdkMcpManifests.js";
import { logForDiagnosticsNoPII, isDiagLogging } from "../utils/diagLogs.js";
import { jsonParse, alwaysTrue } from "../utils/slowOperations.js";
import { stripBom, safeParseJSON } from "../utils/json.js";
import { SESSION_EVENT_TYPES_WITH_EVENT_TYPE, ATTESTATION_FLOOR_VERSION } from "./transports/SSETransport.js";
import { logForDebugging, isDebugMode } from "../utils/debug.js";
import { ndjsonStringify } from "./ndjsonSafeStringify.js";
import { StructuredIO } from "./structuredIO.js";
import {
  judgeAttestationStanding,
  isAttestationGatedFrame,
  judgeDeviceAttestation,
  classifyAttestationAction,
  judgeAttestationAction,
  ATTESTATION_ACTION_GROUPS,
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
  noop,
  rewriteAsUiDetachRequest,
  rewriteAsControlRequest,
  setRequestSettings,
  markResponseBelowFloor,
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
  ccrAuthRefresherFor,
} from "./remoteIO/workerAuth.js";
import { En } from "../../vendor/lodash-es/_inlinedHelpers.js";
import {
  CCRInitError,
  isWorkerRegisterFailure,
  SHUTDOWN_REQUEST_TIMEOUT_MS,
  WORKER_CONFLICT_CLOSE_CODES,
  DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS,
  CCRClient,
  workerEpochFromEnv,
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
import { recordPhase, markHydratePrefetchSettled } from "../utils/startupTiming.js";
import { getAttestationFilterPolicy } from "../bridge/trustedDevice.js";
import { env } from "../utils/env.js";
import {
  setMainLoopActivityListener,
  getMainLoopRefcount,
  setNestedChainDropListener,
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
import { currentInboundSetting } from "../utils/crossSessionInbound/inboundMode.js";
import { isHermeticRemoteSession } from "../services/cloudSessions/eligibility.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { knownSubtypeOrUndefined } from "./structuredIOProtocol.js";
import { isHumanInboundMessage } from "../bridge/inboundMessageOrigin.js";
import { isProjectsHumanOriginEnabled } from "../utils/crossSessionMessagingGate.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { remoteSessionUrlId } from "../utils/sessionUrl.js";
import { isWondrousIslandGateOn } from "./remoteIO/gates.js";
import { getSessionIngressAuthHeaders } from "../utils/sessionIngressAuth.js";
import { addStartupContext } from "../utils/startupProfiler.js";
import { convertWsUrlToPostUrl } from "./transports/HybridTransport.js";
import { isClaudeAiChatOrigin } from "../utils/entrypointKinds.js";
import { getSessionId } from "../bootstrap/state.js";
import { getClientPlatform } from "../utils/http.js";
import { isRemoteManagedEnvironment, isSelfHostedRemoteEnvironment } from "../utils/remoteEnvironment.js";
import { WorkerSocket, openWorkerWebSocket } from "./transports/WorkerSocket.js";
import { wouldGzipForHost, createGzipFetchWrapper } from "../services/api/gzipRequestBody.js";
import { isHostedWorkerFetchEnabled } from "../services/mcp/hostedWorkerTrust.js";
import { TENGU_TOASTY_BEACON } from "../services/api/withRetry.js";
import { isReviewSession } from "../utils/sessionAccessToken.js";
import { isFirstPartyProvider } from "../utils/model/providers.js";

//@ chunk-z4g2ta8k.js:69084-69122 placement
var teleportRelayEnvModule = require("./chunk-1d5behve.js");
//@ chunk-z4g2ta8k.js:69122-69243 placement
var remoteIOSingleton = null;
var LOCAL_ONLY_CONTROL_SUBTYPES = new Set(["set_chrome_browser_hints", ...[]]);
var SESSION_STREAM_CREATED_AT = "session_stream_created_at";
var SESSION_STREAM_STARTED_AT = "session_stream_started_at";
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
  let timestamp = Date.parse(n);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}
//@ chunk-z4g2ta8k.js:69476-69515 placement
var SESSION_STREAM_RECEIVED_AT_MS = "session_stream_received_at_ms";
//@ chunk-z4g2ta8k.js:69515-69642 placement
function sessionStreamReceivedAtMs(e) {
  if (!Object.hasOwn(e, SESSION_STREAM_RECEIVED_AT_MS)) return;
  let n = Reflect.get(e, SESSION_STREAM_RECEIVED_AT_MS);
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}
//@ chunk-z4g2ta8k.js:69642-69674 placement
var SESSION_STREAM_WRITERS = "session_stream_writers";
//@ chunk-z4g2ta8k.js:69674-69793 placement
function sessionStreamWriters(e) {
  if (!Object.hasOwn(e, SESSION_STREAM_WRITERS)) return;
  let n = sessionWritersSchema().safeParse(Reflect.get(e, SESSION_STREAM_WRITERS));
  return n.success ? n.data : undefined;
}
//@ chunk-z4g2ta8k.js:69793-69826 placement
var SESSION_STREAM_AT_FLOOR = "session_stream_at_floor";
//@ chunk-z4g2ta8k.js:69826-69959 placement
function getAtFloorMarker(e) {
  if (!Object.hasOwn(e, SESSION_STREAM_AT_FLOOR)) return;
  let n = Reflect.get(e, SESSION_STREAM_AT_FLOOR);
  if (n === true) return "stands";
  return n === "leaving" ? "leaving" : undefined;
}
//@ chunk-z4g2ta8k.js:69959-70107 placement
var SESSION_STREAM_SENDER = "session_stream_sender";
var sessionStreamSenderSchema = DoctorLazy(() =>
  zodStrictObject({
    status: union([string(), E()]).optional(),
    trustedDevice: string().min(1).optional(),
    credential: string().min(1).optional(),
  }),
);
//@ chunk-z4g2ta8k.js:70107-70224 placement
function getStreamSenderInfo(e) {
  if (!Object.hasOwn(e, SESSION_STREAM_SENDER)) return;
  let n = sessionStreamSenderSchema().safeParse(Reflect.get(e, SESSION_STREAM_SENDER));
  return n.success ? n.data : undefined;
}
//@ chunk-z4g2ta8k.js:70224-70372 placement
function getRequestClientId(e) {
  let n = Reflect.get(e, "request");
  let r = typeof n === "object" && n !== null ? Reflect.get(n, "client_id") : undefined;
  return typeof r === "string" ? r : undefined;
}
//@ chunk-z4g2ta8k.js:70372-70431 placement
function nonEmptyStringOrUndefined(e) {
  return typeof e === "string" && e !== "" ? e : undefined;
}
//@ chunk-z4g2ta8k.js:70431-70461 placement
var SESSION_STREAM_FRAME = "session_stream_frame";
//@ chunk-z4g2ta8k.js:70461-70524 placement
function streamFrameKey(e) {
  return `${String(e.sequence_num)}/${e.event_id}`;
}
//@ chunk-z4g2ta8k.js:70524-70630 placement
function getStreamFrame(e) {
  if (!Object.hasOwn(e, SESSION_STREAM_FRAME)) return;
  let n = Reflect.get(e, SESSION_STREAM_FRAME);
  return typeof n === "string" ? n : undefined;
}
//@ chunk-z4g2ta8k.js:70630-70723 placement
function stampSurfaceFrameKey(e) {
  if (attestedRequestSubtype(e.payload) === "ui_surface") e.payload[SESSION_STREAM_FRAME] = streamFrameKey(e);
  else delete e.payload[SESSION_STREAM_FRAME];
}
//@ chunk-z4g2ta8k.js:70723-71001 placement
function extractDeviceAttestationSender(e) {
  let deviceAttestationStatus = e.device_attestation_status;
  let r = nonEmptyStringOrUndefined(e.device_attestation_trusted_device_tagged_id);
  let s = nonEmptyStringOrUndefined(e.device_attestation_credential_tagged_id);
  return {
    ...((typeof deviceAttestationStatus === "string" || typeof deviceAttestationStatus === "number") && {
      status: deviceAttestationStatus,
    }),
    ...(r !== undefined && {
      trustedDevice: r,
    }),
    ...(s !== undefined && {
      credential: s,
    }),
  };
}
//@ chunk-z4g2ta8k.js:71001-71195 placement
function tagUiSurfaceFloorAndSender(e, n) {
  if (
    n !== undefined &&
    e.event_type === "control_request" &&
    attestedRequestSubtype(e.payload) === "ui_surface"
  ) {
    e.payload[SESSION_STREAM_AT_FLOOR] = n === "stands" ? true : n;
    e.payload[SESSION_STREAM_SENDER] = extractDeviceAttestationSender(e);
  } else {
    delete e.payload[SESSION_STREAM_AT_FLOOR];
    delete e.payload[SESSION_STREAM_SENDER];
  }
}
//@ chunk-z4g2ta8k.js:71195-71773 placement
/**
 * 给 initialize/界面面类 control_request 事件的 payload 打上流元数据：created_at 与当前写者集合；事件类型与 payload 不符时清除这些字段并记诊断日志。
 */
function stampInitializeStreamMeta(event, writersInfo) {
  let subtype = getControlRequestSubtype(event.payload);
  if (event.payload.type !== "control_request" || (subtype !== "initialize" && !isUiSurfaceName(subtype)))
    return;
  if (event.event_type !== "control_request") {
    delete event.payload[SESSION_STREAM_CREATED_AT];
    delete event.payload[SESSION_STREAM_WRITERS];
    logForDiagnosticsNoPII("warn", "cli_sse_initialize_row_type_mismatch", {
      family: subtype === "initialize" ? "initialize" : "surface",
      event_type:
        typeof event.event_type === "string" && /^[a-z_]{1,40}$/.test(event.event_type)
          ? event.event_type
          : "other",
    });
    return;
  }
  if (typeof event.created_at === "string") event.payload[SESSION_STREAM_CREATED_AT] = event.created_at;
  else delete event.payload[SESSION_STREAM_CREATED_AT];
  if (writersInfo !== undefined)
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
  let r = e.payload.type === "control_request" ? getControlRequestSubtype(e.payload) : undefined;
  if (r !== "turn_handoff" && r !== "rewind_conversation" && r !== "start_shell_task") return;
  if (r === "turn_handoff") e.payload[SESSION_STREAM_RECEIVED_AT_MS] = n;
  if (typeof e.created_at === "string") e.payload[SESSION_STREAM_CREATED_AT] = e.created_at;
  else delete e.payload[SESSION_STREAM_CREATED_AT];
}
//@ chunk-z4g2ta8k.js:72539-72702 placement
function getControlRequestSubtype(payload) {
  if (typeof payload !== "object" || payload === null) return;
  let request = payload.request;
  if (typeof request !== "object" || request === null) return;
  let subtype = request.subtype;
  return typeof subtype === "string" ? subtype : undefined;
}
//@ chunk-z4g2ta8k.js:72702-73638 placement
function dropServerOnlyStdinTypes(e, takeRunnerLine) {
  let flattened = e
    .split(
      `
`,
    )
    .flatMap((line) => {
      let y;
      try {
        y = jsonParse(stripBom(line));
      } catch {
        return [line];
      }
      let S = typeof y === "object" && y !== null ? y.type : undefined;
      if (typeof S === "string" && takeRunnerLine?.(S, y)) return [];
      if (typeof S === "string" && SESSION_EVENT_TYPES_WITH_EVENT_TYPE.has(S)) {
        logForDiagnosticsNoPII("warn", "cli_stdin_server_only_type_dropped", {
          payload_type: S,
        });
        logForDebugging(
          `[remote-io] dropped a ${S} frame from the stdin lane (server-authored-only type; SSE is its only ingress)`,
          {
            level: "warn",
          },
        );
        return [];
      }
      if (S === "control_request") {
        let controlRequestSubtype = getControlRequestSubtype(y);
        if (controlRequestSubtype !== undefined && LOCAL_ONLY_CONTROL_SUBTYPES.has(controlRequestSubtype)) {
          logForDiagnosticsNoPII("warn", "cli_stdin_host_forwarded_subtype_dropped", {
            subtype: controlRequestSubtype,
          });
          logForDebugging(
            `[remote-io] dropped a ${controlRequestSubtype} control_request from the stdin lane (host-forwarded-only subtype; SSE is its only ingress)`,
            {
              level: "warn",
            },
          );
          return [];
        }
      }
      if (typeof y !== "object" || y === null) return [line];
      let k = new Set([
        SESSION_STREAM_CREATED_AT,
        SESSION_STREAM_STARTED_AT,
        SESSION_STREAM_RECEIVED_AT_MS,
        SESSION_STREAM_WRITERS,
        SESSION_STREAM_AT_FLOOR,
        SESSION_STREAM_SENDER,
        SESSION_STREAM_FRAME,
        ...[],
      ]);
      let entries = Object.entries(y);
      if (!entries.some(([O]) => k.has(O))) return [line];
      return [ndjsonStringify(Object.fromEntries(entries.filter(([O]) => !k.has(O))))];
    });
  return flattened.length === 0
    ? undefined
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
var MAX_QUEUED_FRAMES = 256;
var REMOTE_IO_TIMEOUT_MS = 30000;
//@ chunk-z4g2ta8k.js:73769-74271 placement
/**
 * 云 worker 控制请求子类型到能力的映射，以及声明/必需的三个能力集合。
 */
var CONTROL_SUBTYPE_TO_CAPABILITY = {
  remote_tools_announce: "remote_tools_announce",
  register_device_hooks: "device_hooks_register",
  upload_device_hook_template: "device_hooks_register",
  apply_flag_settings: "ccr_cloud_plugins_forward",
};
var CAPABILITY_NAMES = {
  served_call: "remote_tool_forward",
  hook: "device_hooks_serve",
  host_ask: "plugin_function_hooks_host_ask",
};
var CAPABILITY_ANSWER_WORDING = {
  served_call: ["served-call", "the machine's own answer"],
  hook: ["forwarded-hook", "the machine's own answer"],
  host_ask: ["plugin-ask", "the addressed client's own answer"],
};
var UI_OTHER = "ui_other";
var FIRST_STREAM_POLICY_TIMEOUT_MS = 30000;
//@ chunk-z4g2ta8k.js:74271-74546 placement
function resolveCarriedPolicy(storedEventPolicy, n, r) {
  if (n.fault === "policy_unparseable" || (n.fault === "policy_partial" && n.policy.enforce))
    return "unreadable";
  if (n.policy !== undefined)
    return {
      policy: n.policy,
      carried: false,
    };
  if (storedEventPolicy === undefined)
    return r
      ? {
          policy: undefined,
          carried: false,
        }
      : undefined;
  return storedEventPolicy === "unreadable"
    ? storedEventPolicy
    : {
        ...storedEventPolicy,
        carried: true,
      };
}
//@ chunk-z4g2ta8k.js:74546-74637 placement
var PERMISSION_WITHDRAWN_MESSAGE =
  "This permission request was withdrawn because it was not answered in time.";
var MAX_VOUCHED_MODEL_REQUEST_IDS = 256;
//@ chunk-z4g2ta8k.js:74637-104943 placement = RemoteIO (0.126)
/**
 * RemoteIO（云 worker 的 SDK I/O 类，继承自通用 I/O 基类）：管理与客户端表面的连接状态、会话写入者、表面策略（stands/leaving）、入站消息与回合交接，是云会话 worker 的核心。
 */
class RemoteIO extends StructuredIO {
  isRemoteTransport() {
    return true;
  }
  sessionWriters() {
    return this.transport.getSessionWriters();
  }
  uiSurfaceFrameOf(e, isAnySurfaceAttached) {
    let atFloorMarker = getAtFloorMarker(e);
    let streamSenderInfo = getStreamSenderInfo(e);
    return {
      isRemoteTransport: true,
      redactsWhatItPersists: this.redactsWhatItPersists(),
      isAnySurfaceAttached,
      createdAt: sessionStreamCreatedAt(e),
      sessionWriters: sessionStreamWriters(e),
      isAtFloor:
        atFloorMarker === "stands" &&
        streamSenderInfo !== undefined &&
        this.standsUnderPolicy(streamSenderInfo),
      leavesBelowFloor:
        atFloorMarker === "leaving" &&
        streamSenderInfo !== undefined &&
        this.leavesOwnSurface(streamSenderInfo, getRequestClientId(e)),
    };
  }
  standsUnderPolicy(e) {
    let n = judgeAttestationStanding(e.status, this.surfacePolicy());
    return n === "stands" || n === "observed_below_floor";
  }
  surfaceClientAttached(e, n) {
    let r = false;
    try {
      let streamSenderInfo = getStreamSenderInfo(n);
      if (streamSenderInfo !== undefined && this.standsUnderPolicy(streamSenderInfo)) {
        this.surfaceClientsOnRecord.set(e, streamSenderInfo);
        r = true;
      }
    } catch (error) {
      logError(toError(error));
    }
    if (r) {
      this.reviewStatementRenewal();
      return true;
    }
    try {
      this.surfaceClientsOnRecord.delete(e);
      this.surfaceRoster?.refuse([e]);
    } catch (error) {
      logError(toError(error));
    }
    return false;
  }
  surfaceSenderStands(e) {
    try {
      let streamSenderInfo = getStreamSenderInfo(e);
      return streamSenderInfo !== undefined && this.standsUnderPolicy(streamSenderInfo);
    } catch (error) {
      logError(toError(error));
      return false;
    }
  }
  setSurfaceRoster(surfaceRoster) {
    this.surfaceRoster = surfaceRoster;
  }
  surfaceClientsAttached() {
    let e = new Set(this.surfaceRoster?.list() ?? []);
    for (let key of this.surfaceClientsOnRecord.keys())
      if (!e.has(key)) this.surfaceClientsOnRecord.delete(key);
    return this.surfaceClientsOnRecord;
  }
  refuseSurfaceClientsBelowPolicy() {
    try {
      let e = this.surfaceClientsAttached();
      let filtered = (this.surfaceRoster?.list() ?? []).filter((r) => {
        let s = e.get(r);
        return s === undefined || !this.standsUnderPolicy(s);
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
    this.userFrameReceivedWallMs.delete(e);
    this.userFrameStartedAt.delete(e);
    this.userFrameReceivedAt.delete(e);
    return n;
  }
  userFrameReceivedAtMs(e) {
    return this.userFrameReceivedAt.get(e);
  }
  userFrameStartedAtMs(e) {
    return this.userFrameStartedAt.get(e);
  }
  hostOwnsStdinOrigin = false;
  persistsOutboundFrames = true;
  get isHostedWorker() {
    return this.hosting.kind === "hosted";
  }
  async readOwnClientEvent(e) {
    let ownClientEvent = await this.ccrClient.readOwnClientEvent(e);
    if (ownClientEvent.kind !== "event") return ownClientEvent;
    if (this.storedEventPolicy === undefined)
      await withDeadline(this.firstStreamPolicy.promise, FIRST_STREAM_POLICY_TIMEOUT_MS);
    let storedEventPolicy = this.storedEventPolicy;
    if (storedEventPolicy === undefined || storedEventPolicy === "unreadable")
      return {
        kind: "unavailable",
        why: "attestation_policy_unknown",
      };
    let s = {
      kind: "event",
      event: ownClientEvent.event,
      personTypedLine: sessionChannelPromptRecord(ownClientEvent.event.payload),
    };
    let policy = storedEventPolicy.policy;
    if (policy === undefined) return s;
    let deviceAttestationStatus = ownClientEvent.event.deviceAttestationStatus;
    let { status, meetsLevel, configException } = resolveEffectiveAttestation(
      normalizeAttestationStatus(
        typeof deviceAttestationStatus === "string"
          ? deviceAttestationStatus.toUpperCase()
          : deviceAttestationStatus,
      ),
      policy,
      {
        isCloudWorker: true,
        vouchWithheld: true,
      },
    );
    if (!policy.enforce || meetsLevel || configException) return s;
    if (status === "UNSPECIFIED")
      return {
        kind: "unavailable",
        why: "attestation_unstated",
      };
    return storedEventPolicy.carried
      ? {
          kind: "unavailable",
          why: "attestation_policy_unknown",
        }
      : {
          kind: "below_attestation",
        };
  }
  url;
  transport;
  inputStream;
  workerAttestationPolicy;
  vouchedModelOrEffortRequestIds = new Set();
  vouchableCloudModel;
  connectionIsFromSessionService() {
    return this.transport.getSessionWritersStatement() !== undefined;
  }
  storedEventPolicy;
  firstStreamPolicy = Promise.withResolvers();
  isSurfacePolicyUnreadable = false;
  surfaceClientsOnRecord = new Map();
  surfaceRoster;
  countedSenderStatuses = new Set();
  countedDroppedAnswers = new Set();
  countedRefusedSurfaceRequests = new Set();
  surfaceRefusals = servedCallDispatcher({
    isAwaited: (e) => this.liveDeviceRequestKind(e) !== undefined,
    readNow: () => Date.now(),
  });
  statementRenewal = createLeaseRenewer({
    isWanted: () =>
      (this.surfaceRoster?.list().length ?? 0) > 0 && canServeManifests(this.uiSurfaceChannel()),
    renew: () => this.ccrClient.renewStream(),
    lapse: () => this.surfaceRoster?.setAside(),
    readNow: () => Date.now(),
    schedule: (e, n) => {
      let timer = setTimeout(runSafely, n, e);
      timer.unref();
      return () => clearTimeout(timer);
    },
  });
  surfaceFramesAtFloor = new WeakMap();
  newestFrameCreatedAt;
  isBridge = false;
  isDebug = false;
  teeStdout = false;
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
    this.ccrClient.writeEvent(e).catch((error) => {
      logForDebugging(`[remote-io] drop sender-notice write failed: ${errorMessage(error)}`, {
        level: "warn",
      });
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
        .catch((error) => {
          logForDebugging(`[remote-io] refusal write failed: ${errorMessage(error)}`, {
            level: "warn",
          });
        });
  };
  permanentCloseCode;
  closeCause;
  hosting;
  feedsStoreSignals;
  endedByHost = false;
  constructor({
    streamUrl,
    initialPrompt,
    stdinLane,
    replayUserMessages,
    sessionState,
    storageV5,
    getAuthHeaders,
    rereadMissingAuthHeaders,
    sessionId,
    workerEpoch,
    environmentKind,
    isResume,
    fetchesAgentTranscriptsOnDemand,
    agentTranscriptBound,
    earlyHydrateReads,
    earlyRemoteLink,
    reportParkAtInit,
    initExternalMetadata,
    announcedExternalMetadata,
    initialWorkerStatus,
    onStageFileDelivered,
    onUserFrameDelivered,
    onClaimSessionDelivered,
    hosting,
  }) {
    let ue = new PassThrough({
      encoding: "utf8",
    });
    super(ue, replayUserMessages, sessionState);
    this.inputStream = ue;
    this.hosting = hosting;
    this.url = getTransportForUrl(new As(streamUrl));
    let authHeaders = getAuthHeaders();
    if (Object.keys(authHeaders).length === 0)
      logForDebugging(
        rereadMissingAuthHeaders
          ? "[remote-io] No session ingress token available yet, will re-read"
          : "[remote-io] No session ingress token available",
        {
          level: "error",
        },
      );
    this.isBridge = environmentKind === "bridge";
    this.isDebug = isDebugMode();
    this.teeStdout = isEnvTruthy(process.env.CLAUDE_CODE_TEE_SDK_STDOUT);
    let envClaudeRunnerActivityFd = process.env.CLAUDE_RUNNER_ACTIVITY_FD;
    let me = envClaudeRunnerActivityFd ? Number.parseInt(envClaudeRunnerActivityFd, 10) : NaN;
    if (Number.isInteger(me) && me > 2)
      try {
        let R = fstatSync(me);
        if (!R.isFIFO() && !R.isSocket()) throw Error("not a pipe");
        let writeStream = createWriteStream("", {
          fd: me,
          autoClose: false,
        });
        writeStream.on("error", (Y) => {
          logForDebugging(
            `[remote-io] activity fd ${me} write error (${errorMessage(Y)}); falling back to stdout`,
          );
          this.activityFd = undefined;
        });
        this.activityFd = writeStream;
      } catch (error) {
        logForDebugging(
          `[remote-io] activity fd ${me} unavailable (${errorMessage(error)}); falling back to stdout`,
        );
      }
    if (earlyRemoteLink && hosting.kind !== "owns-process")
      throw Error("earlyRemoteLink is only valid for an owns-process RemoteIO");
    if (earlyRemoteLink) {
      earlyRemoteLink.ccrClient.setFeatureGatedOptions(getHeartbeatFeatureFlags());
      earlyRemoteLink.ccrClient.setStreamEventFlushIntervalMs(isCcrStreamEventFlushMsGateOn());
      earlyRemoteLink.ccrClient.setStreamEventFirstFlushMs(isCcrStreamFirstFlushMsGateOn());
      earlyRemoteLink.ccrClient.setToolInputFlushMs(isIdempotentPineGateOn());
      earlyRemoteLink.ccrClient.setNoSubscriberStreamEventFlushIntervalMs(isCcrNoSubscriberFlushMsGateOn());
      earlyRemoteLink.ccrClient.setDropUnwatchedStreamEvents(isCcrDropUnwatchedStreamEventsGateOn());
    }
    let ye =
      earlyRemoteLink ??
      startRemoteWorker({
        url: this.url,
        getAuthHeaders,
        sessionId,
        environmentKind,
        storageV5,
        hosting,
        onEpochMismatch:
          hosting.kind === "hosted"
            ? (R) => {
                this.stopFor(classifyStreamCloseCode(R));
                throw Error("terminal request-path condition");
              }
            : undefined,
        reportParkAtInit,
        initExternalMetadata,
        initialWorkerStatus,
        deferDelivery: false,
      });
    let onDiagnostic = ye.onDiagnostic;
    this.transport = ye.transport;
    this.ccrClient = ye.ccrClient;
    this.idleTracker = ye.idleTracker;
    this.feedsStoreSignals = false;
    let Be = isRemoteToolForwardingSwitchOn();
    if (Be) {
      this.ccrClient.onDurableEventsDropped = (R, W) => {
        let controlRequestIds = collectControlRequestIds(R);
        if (controlRequestIds.length > 0) this.rejectUndeliveredRequests(controlRequestIds, W);
      };
      this.ccrClient.onDurableEventsUpload = (R, W) => {
        let controlRequestIds = collectControlRequestIds(R);
        if (controlRequestIds.length > 0) this.noteRequestsUpload(controlRequestIds, W);
      };
    }
    switch (((this.tracksRequestDelivery = Be), hosting.kind)) {
      case "owns-process":
        this.sessionState.slimsRefusedLead = (R) => R.request_id === "" && isFileReferenceCall(R.tool_use_id);
        this.ccrClient.onCardRecordRefused = (R, { external_metadata: externalMetadata }) => {
          try {
            if (
              isPlainObject(externalMetadata) &&
              isPlainObject(externalMetadata.pending_action) &&
              this.sessionState.leadRecordRefused(externalMetadata.pending_action)
            )
              logFeatureSad("ccr_worker_state_publish", "card_written_slim");
          } catch (error) {
            logError(toError(error));
          }
        };
        break;
      case "hosted":
        break;
    }
    this.transport.setOnData((data) => {
      this.writeInbound(data, "sse");
      if (this.isBridge && this.isDebug)
        writeToStdout(
          data.endsWith(`
`)
            ? data
            : data +
                `
`,
        );
    });
    this.transport.setOnUserFrameReceived((R, W, Y, we) => {
      if (this.userFrameReceivedWallMs.has(R)) return;
      if (this.userFrameReceivedWallMs.size >= MAX_QUEUED_FRAMES) {
        let fe = this.userFrameReceivedWallMs.keys().next().value;
        if (fe !== undefined) {
          this.userFrameReceivedWallMs.delete(fe);
          this.userFrameStartedAt.delete(fe);
          this.userFrameReceivedAt.delete(fe);
        }
      }
      this.userFrameReceivedWallMs.set(R, W);
      this.userFrameReceivedAt.set(R, we);
      let ce = typeof Y === "string" ? Date.parse(Y) : NaN;
      if (!Number.isNaN(ce)) this.userFrameStartedAt.set(R, ce);
    });
    this.transport.setOnClose((R, W) => {
      if (R !== undefined) {
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
        this.stopFor({
          kind: "stream-rejected",
          closeCode: R,
        });
      }
      this.inputStream.end();
    });
    this.transport.setOnEventVetoed((R) => {
      this.ccrClient.reportDelivery(R.event_id, "received");
      this.ccrClient.reportDelivery(R.event_id, "processed");
    });
    if (hosting.kind === "hosted") {
      let R = false;
      this.transport.setOnFrameRefused((W) => {
        if (W !== undefined) {
          this.ccrClient.reportDelivery(W, "received");
          this.ccrClient.reportDelivery(W, "processed");
        }
        if (!R) {
          R = true;
          onDiagnostic?.(
            `a frame on the event stream held more than ${hosting.mostMembersInAFrame} object members and was dropped unparsed (${W === undefined ? "no event_id read" : `event_id ${W}`}); later ones are not logged`,
            "warn",
            "frame_too_many_members",
          );
        }
      });
    }
    this.unsubscribeGrowthBookRefresh = onGrowthBookRefresh(() => {
      this.ccrClient.setStreamEventFlushIntervalMs(isCcrStreamEventFlushMsGateOn());
      this.ccrClient.setStreamEventFirstFlushMs(isCcrStreamFirstFlushMsGateOn());
      this.ccrClient.setToolInputFlushMs(isIdempotentPineGateOn());
      this.ccrClient.setNoSubscriberStreamEventFlushIntervalMs(isCcrNoSubscriberFlushMsGateOn());
      this.ccrClient.setDropUnwatchedStreamEvents(isCcrDropUnwatchedStreamEventsGateOn());
    });
    let _e =
      rereadMissingAuthHeaders && Object.keys(authHeaders).length === 0
        ? waitForSessionAuthHeaders({
            getAuthHeaders,
            rereadMiss: rereadMissingAuthHeaders,
            onDiagnostic,
          })
        : null;
    let Me =
      earlyRemoteLink?.initialized ??
      (_e ? _e.then(() => this.ccrClient.initialize(workerEpoch)) : this.ccrClient.initialize(workerEpoch));
    this.restoredWorkerState = Me.catch(() => null);
    Me.then(
      () => {
        onDiagnostic?.("worker registered", "info", "worker_registered");
        let metadata = initExternalMetadata ?? ye.initExternalMetadata;
        try {
          metadata = announcedExternalMetadata?.() ?? metadata;
        } catch (error) {
          logError(error);
        }
        if (!En(metadata, ye.initExternalMetadata))
          this.ccrClient.reportMetadata({
            ...metadata,
          });
        let W = turnHandoffAvailableMessage(metadata, sessionId);
        if (W) this.write(W);
      },
      (error) => {
        let W = error instanceof CCRInitError ? error.reason : errorMessage(error);
        logForDiagnosticsNoPII("error", "cli_worker_lifecycle_init_failed", {
          reason: error instanceof CCRInitError ? error.reason : "unknown",
        });
        let Y = `CCRClient initialization failed: ${errorMessage(error)}`;
        if (isWorkerRegisterFailure(error))
          logForDebugging(Y, {
            level: "error",
          });
        else logError(Error(Y));
        switch (hosting.kind) {
          case "owns-process":
            onDiagnostic?.(
              `worker registration failed (${W}), exiting`,
              "warn",
              "worker_registration_failed",
            );
            gracefulShutdown(1, "other");
            return;
          case "hosted":
            onDiagnostic?.(
              `worker registration failed (${W}), stopping`,
              "warn",
              "worker_registration_failed",
            );
            this.stopFor({
              kind: "registration-failed",
              reason: error instanceof CCRInitError ? error.reason : "unknown",
              httpStatus: error instanceof CCRInitError ? error.httpStatus : undefined,
              closeCode: 4091,
            });
            return;
        }
      },
    );
    setInternalEventWriter((R, W, Y) => this.ccrClient.writeInternalEvent(R, W, Y));
    setAgentMetadataInStreamGate(isTurnHandoffResumeEnabled);
    setInternalEventReader(
      (R) => this.ccrClient.readInternalEvents(R),
      () => this.ccrClient.readSubagentInternalEvents(),
      isResume || fetchesAgentTranscriptsOnDemand
        ? (R, W, Y) => this.ccrClient.readAgentInternalEvents(R, W, agentTranscriptBound, Y)
        : undefined,
    );
    this.ccrClient.onInternalBatchAcked = (R) => updateCCRTipFromAckedBatch(R, storageV5);
    this.ccrClient.onInternalEventLaneClosed = sealTranscriptAppendsForShutdown;
    if (isResume) {
      let startTime = performance.now();
      let ccrClient = this.ccrClient;
      this.hydratePrefetch = (async () => {
        if (_e) {
          await _e;
          startTime = performance.now();
        }
        return (
          (_e ? undefined : await earlyHydrateReads) ??
          (await readInternalEventsFromTip(
            (Y) => ccrClient.readInternalEvents(Y),
            () => ccrClient.readSubagentInternalEvents(),
            storageV5,
          ))
        );
      })().catch((error) => {
        logError(error);
        return null;
      });
      this.hydratePrefetch.then(() => {
        recordPhase("resume_hydrate_fetch_ms", performance.now() - startTime, startTime);
        markHydratePrefetchSettled();
      });
    }
    let Te = {
      started: "processing",
      completed: "processed",
      cancelled: "processed",
    };
    this.onCommandLifecycle = (R, W) => {
      if (!Object.hasOwn(Te, W)) return;
      let Y = Te[W];
      if (Y === undefined) return;
      this.ccrClient.reportDelivery(R, Y);
    };
    this.transport.setOnDelivered((event, writersInfo, Y) => {
      stampInitializeStreamMeta(event, writersInfo);
      tagUiSurfaceFloorAndSender(event, this.surfaceFramesAtFloor.get(event));
      stampSurfaceFrameKey(event);
      stampHandoffReceivedAt(event, Y);
      stampBashCommandTimes(event);
      if (hosting.kind === "hosted") stampControlResponseCreatedAt(event);
      let we = typeof event.created_at === "string" ? Date.parse(event.created_at) : Number.NaN;
      if (!Number.isNaN(we) && (this.newestFrameCreatedAt === undefined || we > this.newestFrameCreatedAt))
        this.newestFrameCreatedAt = we;
      let { type, request } = event.payload;
      if (type === "user") runSafely(() => onUserFrameDelivered?.());
      else if (
        type === "control_request" &&
        getControlRequestSubtype(event.payload) === "stage_file" &&
        isPlainObject(request)
      )
        runSafely(() => onStageFileDelivered?.(request));
      else if (type === "control_request" && getControlRequestSubtype(event.payload) === "claim_session")
        runSafely(() => onClaimSessionDelivered?.());
    });
    setSenderDropWriter(this.attestationDropSenderWriter);
    setDropNotifier(this.attestationDropNotifier);
    if (this.isBridge) {
      setAttestationFilterPolicy(getAttestationFilterPolicy);
      this.transport.setEventFilter((R) => {
        this.markAndStripSessionChannelFrame(R, {
          listedOnly: false,
        });
        let W = this.judgeNotingAdmission(R, () => evaluateInboundAttestationWithPolicy(R));
        if (W) {
          this.ccrClient.reportDelivery(R.event_id, "received");
          this.ccrClient.reportDelivery(R.event_id, "processed");
        }
        return W;
      });
    } else {
      this.transport.setWorkerAttestationPolicySink((W) => this.takeWorkerAttestationPolicy(W));
      this.transport.setStatementRenewalGate((W, Y) => this.awaitsFresherStatement(W, Y));
      let isManagedCloudWorker = env.CLAUDE_CODE_ENVIRONMENT_KIND === undefined;
      this.transport.setEventFilter((W) => {
        let Y = this.judgeNotingAdmission(W, () =>
          this.judgeInboundFrame(W, {
            isManagedCloudWorker,
            sessionWriters: this.transport.sessionWritersOf(W),
          }),
        );
        if (Y) {
          this.ccrClient.reportDelivery(W.event_id, "received");
          this.ccrClient.reportDelivery(W.event_id, "processed");
        }
        return Y;
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
    this.idleLine =
      remoteIOSingleton?.createIdleLineHold({
        readLine: () => ({
          isIdle: this.sessionState.getState() === "idle",
          isWaitingOnUser: this.sessionState.waitingOnUser,
        }),
        write: Se,
      }) ?? null;
    this.waitingOnUserReport = waitForTurnPromptUploads({
      listTurnPromptsWaitedOn: () => (this.sessionState.waitingOnUser ? this.listTurnPrompts() : []),
      write: this.idleLine?.write ?? Se,
    });
    this.sessionState.onStateChanged = (R, W) => {
      this.ccrClient.reportState(R, W);
      this.waitingOnUserReport.stateChanged();
    };
    this.sessionState.onWaitingOnUserChanged = () => {
      this.waitingOnUserReport.stateChanged();
    };
    this.sessionState.onTurnStarting = (R, W) => {
      if (this.teeStdout && !this.isBridge)
        try {
          this.teeActivity(
            ndjsonStringify({
              type: "system",
              subtype: "turn_starting",
              mode: R,
              ...(R === "task-notification" && {
                task_id: W ?? null,
              }),
            }) +
              `
`,
          );
        } catch {}
    };
    this.sessionState.onTurnBeganBeforeInit = () => {
      if (this.teeStdout && !this.isBridge) {
        try {
          this.teeActivity(
            ndjsonStringify({
              type: "system",
              subtype: "turn_began_before_init",
            }) +
              `
`,
          );
        } catch {}
        let CLAUDE_RUNNER_ALIVE_EVERY_MS = env.CLAUDE_RUNNER_ALIVE_EVERY_MS;
        if (this.aliveBeforeInit === undefined && CLAUDE_RUNNER_ALIVE_EVERY_MS !== undefined) {
          this.aliveBeforeInit = setInterval(() => {
            try {
              this.teeActivity(`{"type":"system","subtype":"alive_before_init"}
`);
            } catch {}
          }, CLAUDE_RUNNER_ALIVE_EVERY_MS);
          this.aliveBeforeInit.unref();
        }
      }
    };
    setMainLoopActivityListener((R) => this.sessionState.setMainLoopRefcount(R));
    this.sessionState.setMainLoopRefcount(getMainLoopRefcount());
    setNestedChainDropListener((R) => this.sessionState.dropNestedBlockedChain(R));
    this.sessionState.onMetadataChanged = (R) => {
      this.ccrClient.reportMetadata(R);
    };
    this.sessionState.onInternalMetadataChanged = (R) => {
      this.ccrClient.reportInternalMetadata(R);
    };
    watchRepoCheckouts((R) => this.sessionState.notifyMetadataChanged(R));
    if (earlyRemoteLink) this.transport.startDelivery();
    else if (_e)
      _e.then(
        () => this.transport.connect(),
        () => {},
      );
    else this.transport.connect();
    let sessionKeepaliveIntervalV2Ms = getPollIntervalConfig().session_keepalive_interval_v2_ms;
    if (this.isBridge && sessionKeepaliveIntervalV2Ms > 0) {
      this.keepAliveTimer = setInterval(() => {
        logForDebugging("[remote-io] keep_alive sent");
        this.write({
          type: "keep_alive",
        }).catch((err) => {
          logForDebugging(`[remote-io] keep_alive write failed: ${errorMessage(err)}`);
        });
      }, sessionKeepaliveIntervalV2Ms);
      this.keepAliveTimer.unref?.();
    }
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
      for await (let chunk of e) {
        let r = dropServerOnlyStdinTypes(String(chunk).replace(/\n$/, ""), this.takeRunnerLine);
        if (r !== undefined)
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
      let r = false;
      for await (let s of e)
        if (!r && String(s).trim() !== "") {
          r = true;
          logForDiagnosticsNoPII("warn", "cli_remote_io_stdin_ignored");
          logForDebugging(
            `[remote-io] ignored data on process stdin (host kind ${n === null ? "unset" : `'${n}'`}): only a 'bridge' or 'byoc' host's stdin is an input lane, so control input comes from the session stream only`,
            {
              level: "warn",
            },
          );
        }
    })();
  }
  markAndStripSessionChannelFrame(e, { listedOnly }) {
    noop(e);
  }
  sessionChannelFloorVerdict(e, sessionWriters) {
    let r = this.guardedFamilies();
    if (!isAttestationGatedFrame(e.payload, (h) => this.liveDeviceRequestKind(h), r)) return "passed";
    try {
      let h = judgeDeviceAttestation(e, (y) => this.liveDeviceRequestKind(y), r, {
        policy: this.surfacePolicy(),
        leaves: (y) => this.leavesOwnSurface(extractDeviceAttestationSender(e), y),
        sessionWriters,
        now: Date.now,
      });
      if (h.kind === "observe_surface_request") this.countObservedSurfaceRequest(h.status.toLowerCase());
      else if (h.kind === "admit_leaving") {
        if (
          !this.surfaceRefusals.charges({
            requestId: h.requestId,
            frame: streamFrameKey(e),
          })
        )
          return "dropped";
        rewriteAsUiDetachRequest(e.payload, {
          requestId: h.requestId,
          clientId: h.clientId,
          eventId: e.event_id,
        });
        this.surfaceFramesAtFloor.set(e, "leaving");
        logForDebugging(
          `[remote-io] a surface client on record leaves though the device floor refuses its frame (attestation ${h.status.toLowerCase()}): it goes on as its id and the client it names`,
        );
        return "rebuilt";
      } else if (h.kind !== "pass") return this.applySessionChannelVerdict(e, h);
      if (attestedRequestSubtype(e.payload) === "ui_surface") this.surfaceFramesAtFloor.set(e, "stands");
      return "passed";
    } catch (error) {
      logForDebugging(
        `[remote-io] a guarded session-channel frame could not be judged or handled; dropped: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      return "dropped";
    }
  }
  takeWorkerAttestationPolicy(e) {
    this.workerAttestationPolicy = e.policy;
    this.storedEventPolicy = resolveCarriedPolicy(
      this.storedEventPolicy,
      e,
      this.connectionIsFromSessionService(),
    );
    if (this.storedEventPolicy !== undefined) this.firstStreamPolicy.resolve();
    this.isSurfacePolicyUnreadable =
      e.fault === "policy_unparseable" || (e.fault === "policy_partial" && e.policy.enforce);
    if (e.fault !== undefined) reportAttestationHeaderUnreadable(e.fault);
    this.refuseSurfaceClientsBelowPolicy();
    this.takeSessionWritersStatement();
  }
  takeSessionWritersStatement() {
    try {
      let sessionWritersStatement = this.transport.getSessionWritersStatement();
      this.statementRenewal.stated(
        sessionWritersStatement?.writers === "owner_account_only"
          ? sessionWritersStatement.statedAtMs
          : undefined,
      );
    } catch (error) {
      logError(toError(error));
    }
  }
  reviewStatementRenewal() {
    runSafely(() => this.statementRenewal.review());
  }
  awaitsFresherStatement(e, sessionWriters) {
    try {
      let controlResponse = extractControlResponse(e.payload);
      let s =
        attestedRequestSubtype(e.payload) === "ui_surface" ||
        (controlResponse !== undefined && this.liveDeviceRequestKind(controlResponse) === "host_ask");
      let h =
        e.event_type === e.payload.type && typeof e.created_at === "string"
          ? Date.parse(e.created_at)
          : Number.NaN;
      return (
        s &&
        canServeManifests(this.uiSurfaceChannel()) &&
        frameAgeVerdict(
          {
            createdAt: Number.isNaN(h) ? undefined : h,
            sessionWriters,
          },
          Date.now(),
        ) === "session_writers_stale"
      );
    } catch (error) {
      logError(toError(error));
      return false;
    }
  }
  surfacePolicy() {
    return this.isSurfacePolicyUnreadable ? "unreadable" : this.workerAttestationPolicy;
  }
  leavesOwnSurface(e, n) {
    let r = n === undefined ? undefined : this.surfaceClientsAttached().get(n);
    if (r === undefined) return false;
    let s = nonEmptyStringOrUndefined(r.trustedDevice);
    let h = nonEmptyStringOrUndefined(r.credential);
    return (
      (s !== undefined && s === nonEmptyStringOrUndefined(e.trustedDevice)) ||
      (h !== undefined && h === nonEmptyStringOrUndefined(e.credential))
    );
  }
  judgeNotingAdmission(e, n) {
    let r =
      e.payload.type === "control_request" && getControlRequestSubtype(e.payload) !== undefined
        ? getControlRequestSubtype_2(e.payload)
        : undefined;
    let wasSeen = r === undefined || isKnownControlRequestId(r);
    let h = n();
    try {
      if (h === false && r !== undefined && isKnownControlRequestId(r))
        this.surfaceRefusals.admitted({
          requestId: r,
          frame: streamFrameKey(e),
          wasSeen,
        });
    } catch (error) {
      logError(toError(error));
    }
    return h;
  }
  judgeInboundFrame(e, { isManagedCloudWorker, sessionWriters }) {
    if (isManagedCloudWorker) this.countHookOrPluginSender(e);
    let s =
      isManagedCloudWorker || attestedRequestSubtype(e.payload) === "ui_surface"
        ? this.sessionChannelFloorVerdict(e, sessionWriters)
        : "passed";
    if (s === "dropped") return true;
    if (s === "rebuilt") return false;
    if (this.workerAttestationPolicy === undefined) {
      rememberInboundRequestId(e);
      return false;
    }
    let h = this.workerAttestationPolicy.enforce ? isServiceVouchedSettingsRequest(e) : undefined;
    if (h !== undefined && (isKnownControlRequestId(h) || this.vouchedModelOrEffortRequestIds.has(h)))
      return "attestation_policy";
    if (
      filterInboundEventBySource(
        e,
        this.workerAttestationPolicy,
        normalizeAttestationStatus(e.device_attestation_status) === "TRANSITIVELY_VOUCHED" &&
          (currentInboundSetting() ?? "accept") === "accept",
        this.vouchableCloudModel,
      )
    )
      return "attestation_policy";
    if (h !== undefined) {
      if (this.vouchedModelOrEffortRequestIds.size >= MAX_VOUCHED_MODEL_REQUEST_IDS)
        return "attestation_policy";
      this.vouchedModelOrEffortRequestIds.add(h);
    }
    return false;
  }
  guardedFamilies() {
    let remoteTools = isRemoteToolForwardingSwitchOn() && !isSessionChannelDisabled();
    let hostAsks = this.waitsOnHostAsk();
    return {
      remoteTools,
      hooks: false,
      plugins: false,
      hostAsks,
      surfaces: true,
    };
  }
  hookAndPluginAdmissions() {
    return {
      hooks: ccrAuthRefreshAdmission({
        sdkUrl: true,
        remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
        environmentKind: undefined,
        entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
        disabled: env.CLAUDE_CODE_DISABLE_HOOK_FORWARDING,
        hermetic: isHermeticRemoteSession(),
      }).admitted,
      plugins: sessionAuthAdmission({
        sdkUrl: true,
        remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
        environmentKind: undefined,
        entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
        disabled: env.CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING,
        hermetic: isHermeticRemoteSession(),
      }).admitted,
    };
  }
  countHookOrPluginSender(e) {
    try {
      let n = classifyAttestationAction(e.payload, (k) => this.liveDeviceRequestKind(k));
      if (n === undefined) return;
      let { verdict, status } = judgeAttestationAction(n, e);
      let h = `${n}:${status}`;
      let y = ATTESTATION_ACTION_GROUPS[n];
      if (this.countedSenderStatuses.has(h) || !this.hookAndPluginAdmissions()[y]) return;
      let S = this.guardedFamilies()[y] ? "enforce" : "observe";
      this.countedSenderStatuses.add(h);
      logEvent("tengu_session_channel_sender_status", {
        kind: fromEnum(n),
        attestation_status: fromEnum(status),
        verdict: fromEnum(verdict === "pass" ? "pass" : "below_floor"),
        mode: fromEnum(S),
      });
    } catch (error) {
      logForDebugging(
        `[remote-io] counting a hook or plugin frame's sender failed; the frame goes on as it would have: ${errorMessage(error)}`,
        {
          level: "warn",
        },
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
      let n = this.surfaceRefusals.answers(
        {
          requestId: Reflect.get(e, "request_id"),
          frame: getStreamFrame(e),
        },
        "loop",
      );
      if (!n) this.countRefusedSurfaceRequest("refusal_unanswered");
      return n;
    } catch (error) {
      logError(toError(error));
      return false;
    }
  }
  applySessionChannelVerdict(e, n) {
    let lower = n.status.toLowerCase();
    switch (n.kind) {
      case "refuse_request":
        logFeatureBad(CONTROL_SUBTYPE_TO_CAPABILITY[n.subtype], `unverified_sender_${lower}`);
        logForDebugging(`[remote-io] dropped a below-floor ${n.subtype} (attestation ${lower}) unanswered`);
        return "dropped";
      case "refuse_surface_request": {
        let s = knownSubtypeOrUndefined(n.wireSubtype) ?? UI_OTHER;
        this.countRefusedSurfaceRequest(
          n.refusal === "unreadable_policy" ? n.refusal : `${n.refusal}_${lower}_${s}`,
        );
        if (
          !this.surfaceRefusals.answers(
            {
              requestId: n.requestId,
              frame: streamFrameKey(e),
            },
            "filter",
          )
        ) {
          logForDebugging(
            `[remote-io] dropped a refused surface request (${n.refusal}, attestation ${lower}) unanswered: its id is none a refusal is written under, or this window's refusals are spent`,
          );
          return "dropped";
        }
        rewriteAsControlRequest(e.payload, {
          requestId: n.requestId ?? "",
          subtype: s,
          eventId: e.event_id,
        });
        logForDebugging(
          `[remote-io] a refused surface request (${n.refusal}, attestation ${lower}) goes on as its id and its subtype's name, to be answered as unserved`,
        );
        return "rebuilt";
      }
      case "drop_answer": {
        let why = n.why === undefined || n.why === "below_floor" ? undefined : n.why;
        if (why === undefined)
          logFeatureBad(CAPABILITY_NAMES[n.answers], `unverified_answer_dropped_${lower}`);
        else if (!this.countedDroppedAnswers.has(why)) {
          this.countedDroppedAnswers.add(why);
          logFeatureBad(CAPABILITY_NAMES[n.answers], `answer_dropped_${why}`);
        }
        logForDebugging(
          `[remote-io] dropped a reply to ${CAPABILITY_ANSWER_WORDING[n.answers][0]} request ${n.requestId} (attestation ${lower}, ${why ?? "below the floor"}); the request keeps waiting for ${CAPABILITY_ANSWER_WORDING[n.answers][1]}`,
        );
        return "dropped";
      }
      case "strip_forwarded_plugins":
        setRequestSettings(e.payload, n.remainder);
        logFeatureSad("ccr_cloud_plugins_forward", `unverified_patch_stripped_${lower}`);
        logForDebugging(
          `[remote-io] stripped below-floor forwarded plugin choices from an apply_flag_settings (attestation ${lower}); its other keys go on`,
        );
        return "passed";
      case "admit_refusal":
        markResponseBelowFloor(e.payload, n.requestId, n.result);
        logFeatureSad("remote_tool_forward", `unverified_refusal_admitted_${lower}`);
        logForDebugging(
          `[remote-io] admitted a below-floor refusal of served-call request ${n.requestId} (attestation ${lower}) rebuilt and marked unverified: the machine is asked what became of the call`,
        );
        return "rebuilt";
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
    let e = this.transport.serviceNow();
    return e === undefined ? undefined : Math.max(e, this.newestFrameCreatedAt ?? e);
  }
  sessionServiceNowAtMost() {
    let e = this.transport.serviceNowAtMost();
    return e === undefined ? undefined : Math.max(e, this.newestFrameCreatedAt ?? e);
  }
  async flushInternalEventsConfirmed() {
    let droppedInternalBatches = this.ccrClient.droppedInternalBatches;
    await this.ccrClient.flushInternalEvents();
    return (
      this.ccrClient.droppedInternalBatches === droppedInternalBatches && !this.ccrClient.awaitsCompactSummary
    );
  }
  flushDeliveryAcks() {
    return this.ccrClient.flushDeliveryAcks();
  }
  flushDeliveryAcksConfirmed() {
    return this.ccrClient.flushDeliveryAcksConfirmed();
  }
  settleVouchedModelOrEffort(vouchableCloudModel) {
    this.vouchableCloudModel = vouchableCloudModel;
  }
  takeVouchedModelOrEffortRequest(e) {
    return this.vouchedModelOrEffortRequestIds.delete(e) && this.workerAttestationPolicy?.enforce === true;
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
  setOnPromptAnswered(onPromptAnswered) {
    this.onPromptAnswered = onPromptAnswered;
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
    await this.ccrClient.flush();
    return this.ccrClient.droppedDurableBatches === droppedDurableBatches;
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
  repeatAfterCompaction(rowsRepeatedAfterCompaction) {
    this.ccrClient.rowsRepeatedAfterCompaction = rowsRepeatedAfterCompaction;
  }
  readInternalEvents(e, n) {
    return this.ccrClient.readInternalEvents(undefined, e, n);
  }
  readAgentMetadataEvents(e, n) {
    return this.ccrClient.readAgentMetadataEvents(e, n);
  }
  teeActivity(e) {
    if (this.activityFd !== undefined) {
      this.activityFd.write(e);
      return;
    }
    writeToStdout(e);
  }
  writeInbound(e, n) {
    if (this.inputStream.destroyed || this.inputStream.writableEnded) {
      if (!this.inboundLanesDroppedAfterClose.has(n)) {
        this.inboundLanesDroppedAfterClose.add(n);
        logForDiagnosticsNoPII("info", "cli_remote_io_inbound_dropped_after_close", {
          lane: n,
        });
      }
      return;
    }
    this.noteInputWritten(e);
    this.inputStream.write(e);
  }
  writeActivityLine(e) {
    this.teeActivity(e);
  }
  acceptsInboundEnvUpdates() {
    switch (this.hosting.kind) {
      case "owns-process":
        return this.hosting.trustsInboundEnvUpdates;
      case "hosted":
        return false;
    }
  }
  exitOnFatalInput(e) {
    switch (this.hosting.kind) {
      case "owns-process":
        return super.exitOnFatalInput(e);
      case "hosted":
        logForDebugging(`[remote-io] ${e}`, {
          level: "error",
        });
        this.stopFor({
          kind: "unreadable-input",
        });
        return Promise.reject(new UnreadableInputError());
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
        if (isCoalescableControlRequest(e)) this.idleTracker.noteActivity();
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
  answerOwnWithdrawnAsk(e, toolUseID) {
    this.ownDeniesAwaitingCancel.add(e);
    this.outbound.enqueue({
      type: "control_response",
      response: {
        subtype: "success",
        request_id: e,
        response: {
          behavior: "deny",
          message: PERMISSION_WITHDRAWN_MESSAGE,
          toolUseID,
        },
      },
    });
  }
  async write(e) {
    if (e.type === "transcript_mirror") return;
    if (e.type === "control_response") this.controlRequestEnded(e.response.request_id);
    let n = this.heldDueBefore(e);
    if (n.length > 0) await this.writeHeld(n);
    let r = this.trackWrite(e);
    this.taskHoldClock.note(r, Date.now());
    if (this.teeStdout && !this.isBridge) {
      if (r.type === "result") {
        this.waitingOnUserReport.resultGoesNext();
        this.idleLine?.resultGoesNext();
      }
      let y = projectSdkEventForStream(r);
      if (y !== undefined)
        try {
          this.teeActivity(
            ndjsonStringify(y) +
              `
`,
          );
        } catch {}
      if (r.type === "system" && r.subtype === "init") this.endAliveBeforeInit();
    }
    let s = r.type === "control_cancel_request" ? this.ownDenyHeldForCancel.get(r.request_id) : undefined;
    if (r.type === "control_response" && this.ownDeniesAwaitingCancel.delete(r.response.request_id))
      this.ownDenyHeldForCancel.set(r.response.request_id, r);
    else if (s !== undefined && r.type === "control_cancel_request") {
      this.ownDenyHeldForCancel.delete(r.request_id);
      await this.ccrClient.writeEvents([s, r], {
        together: true,
      });
    } else await this.ccrClient.writeEvent(r);
    if (this.isBridge) {
      if (r.type === "control_request" || (this.isDebug && !isLiveOnlyResponse(r)))
        writeToStdout(
          ndjsonStringify(r) +
            `
`,
        );
    }
    let h = this.heldDueAfter(r);
    if (h.length > 0) await this.writeHeld(h);
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
    switch (((this.endedByHost = true), this.closeConnections(), this.hosting.kind)) {
      case "owns-process":
        return;
      case "hosted":
        this.ccrClient.close({
          goodbye: false,
        });
        return;
    }
  }
  async closeForSuccessor({ drained = false } = {}) {
    this.close();
    await this.ccrClient.releaseLease({
      drained,
    });
  }
  async goodbye({ releaseLease, drained = false, withinMs = 1 / 0 }) {
    this.endedByHost = true;
    this.ccrClient.beginShutdown();
    this.closeConnections();
    let leftMidTurn = releaseLease && this.ccrClient.leftMidTurn;
    await this.ccrClient.finishShutdown(
      undefined,
      withinMs - (leftMidTurn ? SHUTDOWN_REQUEST_TIMEOUT_MS : 0),
    );
    if (leftMidTurn)
      await this.ccrClient.releaseLease({
        drained,
      });
  }
  stopFor(e) {
    if (this.closeCause !== undefined || this.endedByHost) return;
    this.closeCause = e;
    if (e.kind !== "unreadable-input") this.permanentCloseCode = e.closeCode;
    switch (this.hosting.kind) {
      case "owns-process":
        return;
      case "hosted":
        this.ccrClient.close({
          goodbye: false,
        });
        this.closeConnections();
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
        {
          level: "warn",
        },
      );
    setMainLoopActivityListener(null);
    setNestedChainDropListener(null);
    this.waitingOnUserReport.setUploadAhead(null);
    this.idleLine?.close();
    this.disarmModelCallProxyRefusalRideOut?.();
    this.takeRunnerLine = undefined;
    clearSenderDropWriter(this.attestationDropSenderWriter);
    clearDropNotifier(this.attestationDropNotifier);
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    this.endAliveBeforeInit();
    this.unsubscribeGrowthBookRefresh();
    this.statementRenewal.stop();
    this.transport.close();
    this.inputStream.end();
  }
  endAliveBeforeInit() {
    if (this.aliveBeforeInit !== "over") {
      clearInterval(this.aliveBeforeInit);
      this.aliveBeforeInit = "over";
    }
  }
}
//@ chunk-z4g2ta8k.js:104943-104984 placement
function runSafely(e) {
  try {
    e();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-z4g2ta8k.js:104984-105082 placement
function authRefreshForOwnerKind(hosting) {
  switch (hosting.kind) {
    case "owns-process":
      return hosting.adoptRefreshedAuth;
    case "hosted":
      return;
  }
}
//@ chunk-z4g2ta8k.js:105082-105242 placement
function classifyStreamCloseCode(e) {
  let n = WORKER_CONFLICT_CLOSE_CODES[e];
  switch (n) {
    case 4090:
      return {
        kind: "lease-superseded",
        cause: e,
        closeCode: n,
      };
    case 4094:
      return {
        kind: "auth-rejected",
        cause: e,
        closeCode: n,
      };
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
    advertiseHeartbeatProbeSupport: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_idle_heartbeat", false),
    beatOnStaleReconnect: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_reconnect_beat", false),
    beatOnReactivation: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_reactivation_beat", false),
    skipRedundantHeartbeats: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_skip_redundant_heartbeat", false),
  };
}
//@ chunk-z4g2ta8k.js:105737-105805 placement
function isCcrDropUnwatchedStreamEventsGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_drop_unwatched_stream_events", false);
}
//@ chunk-z4g2ta8k.js:105805-107157 placement
function projectSdkEventForStream(e) {
  let n = e;
  let subtype = n.subtype;
  if (e.type === "result" || (e.type === "system" && subtype === "init"))
    return e.type === "result"
      ? {
          ...e,
          result: undefined,
          permission_denials: undefined,
          structured_output: undefined,
          deferred_tool_use: undefined,
          errors: undefined,
          subagent_stats: undefined,
        }
      : e;
  if (e.type === "system" && subtype === "task_started")
    return {
      type: "system",
      subtype,
      task_id: n.task_id,
      task_type: n.task_type,
      owned_by_subagent: n.owned_by_subagent,
    };
  if (e.type === "system" && subtype === "task_updated") {
    let patch = n.patch;
    return {
      type: "system",
      subtype,
      task_id: n.task_id,
      patch: {
        status: patch?.status,
        is_backgrounded: patch?.is_backgrounded,
      },
    };
  }
  if (e.type === "system" && subtype === "task_notification")
    return {
      type: "system",
      subtype,
      task_id: n.task_id,
      status: n.status,
    };
  if (e.type === "system" && subtype === "background_tasks_changed") {
    let tasks = n.tasks;
    return {
      type: "system",
      subtype,
      tasks: Array.isArray(tasks)
        ? tasks.map((task) => ({
            task_id: task?.task_id,
          }))
        : [],
    };
  }
  if (e.type === "system" && subtype === "hook_response")
    return {
      type: "system",
      subtype,
      hook_event: n.hook_event,
      outcome: n.outcome,
    };
  if (e.type === "user")
    return {
      type: e.type,
      subtype,
      ...subagentOriginFields(n),
    };
  if (e.type === "assistant") {
    let content = n.message?.content;
    if (Array.isArray(content)) {
      let found = content.find(
        (y) => y && typeof y === "object" && y.type === "tool_use" && y.name === SCHEDULE_WAKEUP_TOOL_NAME,
      );
      if (found) {
        let input = found.input;
        return {
          type: "assistant",
          subtype,
          ...subagentOriginFields(n),
          message: {
            content: [
              {
                type: "tool_use",
                name: SCHEDULE_WAKEUP_TOOL_NAME,
                input: {
                  delaySeconds: input?.delaySeconds,
                },
              },
            ],
          },
        };
      }
    }
    return {
      type: e.type,
      subtype,
      ...subagentOriginFields(n),
    };
  }
  return;
}
//@ chunk-z4g2ta8k.js:107157-107228 placement
function subagentOriginFields(e) {
  return e.parent_tool_use_id != null
    ? {
        from_subagent: true,
      }
    : {};
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
function hasResumeFlag(argv) {
  for (let n of argv) {
    if (n === "--") return false;
    if (n === "--resume" || n === "-r" || n.startsWith("--resume=")) return true;
  }
  return false;
}
//@ chunk-z4g2ta8k.js:107493-107699 placement
async function readInternalEventsFromTip(e, n, r) {
  let s = remoteSessionUrlId();
  let h = s ? await readTranscriptTailForTip(s, r) : undefined;
  let y = s ? await getValidatedCCRTip(s, h, r) : undefined;
  let [S, k] = await Promise.all([
    e(y?.eventId),
    h === null || y?.eventId !== undefined || (isWondrousIslandGateOn() && r === undefined) ? undefined : n(),
  ]);
  return [S, k, y];
}
//@ chunk-z4g2ta8k.js:107699-107963 placement
function startEarlyRemoteWork(e, storageV5, { hydrate, connect }) {
  if (Object.keys(getSessionIngressAuthHeaders()).length === 0)
    return {
      hydrateReads: undefined,
      link: undefined,
    };
  let url = getTransportForUrl(new As(e));
  addStartupContext({
    ...(hydrate && {
      early_hydrate_prefetch: 1,
    }),
    ...(connect && {
      early_remote_connect: 1,
    }),
  });
  return {
    hydrateReads: hydrate ? loadCcrInternalEvents(url, storageV5) : undefined,
    link: connect ? remoteIOWorkerEnv(url, storageV5) : undefined,
  };
}
//@ chunk-z4g2ta8k.js:107963-108184 placement
function loadCcrInternalEvents(e, n) {
  return (async () => {
    let r = false;
    let s = {
      ...convertWsUrlToPostUrl(e, getSessionIngressAuthHeaders),
      onConflict: () => {
        r = true;
      },
    };
    let internalEventsFromTip = await readInternalEventsFromTip(
      (y) => CCRClient.readInternalEventsFrom(s, y),
      () => CCRClient.readSubagentInternalEventsFrom(s),
      n,
    );
    return r ? undefined : internalEventsFromTip;
  })().catch((error) => {
    logError(error);
    return;
  });
}
//@ chunk-z4g2ta8k.js:108184-108232 placement
function turnHandoffRegistrationNow(e, workerEpoch, r) {
  return turnHandoffRegistration(e, workerEpoch, r, isClaudeAiChatOrigin(), isCarriedWritesEnabled());
}
//@ chunk-z4g2ta8k.js:108232-108343 placement
function turnHandoffRegistrationToAnnounce(turnHandoff, workerEpoch, carriedWrites) {
  if (turnHandoff.admitted && isClaudeAiChatOrigin()) logHandoffFlagAdvert();
  let s = turnHandoffRegistrationNow(turnHandoff, workerEpoch, carriedWrites);
  if (s?.turn_handoff?.carried_writes) markSaidCarriedWrites();
  return s;
}
//@ chunk-z4g2ta8k.js:108343-109134 placement
function remoteIOWorkerEnv(url, storageV5) {
  let r = cliRemoteWorkerInputs();
  let s = turnHandoffAdmission({
    sdkUrl: true,
    remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
    environmentKind: env.CLAUDE_CODE_ENVIRONMENT_KIND,
    disabled: env.CLAUDE_CODE_DISABLE_TURN_HANDOFF,
  });
  let h = shouldCarryWrites({
    admission: s,
    relayConfigured:
      teleportRelayEnvModule !== null && teleportRelayEnvModule.getTeleportRelayEnvConfig() !== null,
    persistsTranscript: !isTranscriptPersistenceDisabled(),
    sharedBackend: isDiagLogging(),
  });
  let remoteWorker = startRemoteWorker({
    url,
    getAuthHeaders: getSessionIngressAuthHeaders,
    sessionId: getSessionId(),
    environmentKind: r.environmentKind,
    storageV5,
    hosting: r.hosting,
    onEpochMismatch: undefined,
    reportParkAtInit: r.reportParkAtInit,
    initExternalMetadata: turnHandoffRegistrationNow(s, r.workerEpoch, h),
    initialWorkerStatus: undefined,
    deferDelivery: true,
  });
  let S = remoteWorker.ccrClient.initialize(r.workerEpoch);
  S.catch(() => {});
  if (r.environmentKind !== "bridge") remoteWorker.transport.setWorkerAttestationPolicySink(() => {});
  remoteWorker.transport.connect();
  return {
    ...remoteWorker,
    initialized: S,
    inputs: r,
    usesRelayMarker: h,
  };
}
//@ chunk-z4g2ta8k.js:109134-109423 placement
function cliRemoteWorkerInputs() {
  let CLAUDE_CODE_ENVIRONMENT_KIND = process.env.CLAUDE_CODE_ENVIRONMENT_KIND ?? null;
  return {
    environmentKind: CLAUDE_CODE_ENVIRONMENT_KIND,
    workerEpoch: workerEpochFromEnv(),
    hosting: {
      kind: "owns-process",
      trustsInboundEnvUpdates: true,
      adoptRefreshedAuth: ccrAuthRefresherFor(CLAUDE_CODE_ENVIRONMENT_KIND),
    },
    reportParkAtInit: env.CLAUDE_CODE_HOLD_REPORT_PARK_AT_INIT && env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN,
  };
}
//@ chunk-z4g2ta8k.js:109423-112627 placement
/**
 * 启动云 worker：组装 RemoteIO 所需环境、认证与事件流，启动并接管会话。
 */
function startRemoteWorker({
  url,
  getAuthHeaders,
  sessionId,
  environmentKind,
  storageV5,
  hosting,
  onEpochMismatch,
  reportParkAtInit,
  initExternalMetadata,
  initialWorkerStatus,
  deferDelivery,
}) {
  let x =
    environmentKind === "bridge"
      ? undefined
      : hosting.kind === "hosted"
        ? (ne, Q, ue) => {
            hosting.onDiagnostic(ne.replace(/\bexiting$/, "stopping"), Q, ue);
          }
        : (ne) => {
            process.stderr.write(`SDKStartup: ${ne}
`);
          };
  let U = {
    "anthropic-client-platform": getClientPlatform(),
    ...getAuthHeaders(),
  };
  let envClaudeCodeEnvironmentRunnerVersion = process.env.CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION;
  if (envClaudeCodeEnvironmentRunnerVersion)
    U["x-environment-runner-version"] = envClaudeCodeEnvironmentRunnerVersion;
  let refreshHeaders = () => {
    let ne = {
      ...getAuthHeaders(),
    };
    let envClaudeCodeEnvironmentRunnerVersion = process.env.CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION;
    if (envClaudeCodeEnvironmentRunnerVersion)
      ne["x-environment-runner-version"] = envClaudeCodeEnvironmentRunnerVersion;
    return ne;
  };
  let q =
    env.CLAUDE_CODE_CCR_WORKER_SOCKET?.split(",")
      .map((ne) => ne.trim())
      .includes(ATTESTATION_FLOOR_VERSION) &&
    alwaysTrue() &&
    hosting.kind === "owns-process" &&
    environmentKind === null &&
    isRemoteManagedEnvironment()
      ? new WorkerSocket(openWorkerWebSocket, (ne) => wouldGzipForHost(ne, storageV5, "ccr_worker"))
      : undefined;
  let z = new Set();
  let workerEventsTransport = createWorkerEventsTransport(url, U, {
    sessionId,
    refreshHeaders,
    getAuthHeaders,
    deferDelivery,
    streamOpener: q,
    mostMembersInAFrame: hosting.kind === "hosted" ? hosting.mostMembersInAFrame : undefined,
    lighterFrame: redactSdkMcpManifests,
    connectTimeoutMs: () => getPollIntervalConfig().sse_connect_timeout_ms,
    sseKeepaliveMaxIntervalSeconds: () =>
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_sse_keepalive_max_interval_s", 0),
    longPollFallback: () =>
      hosting.kind === "owns-process" &&
      !isRemoteManagedEnvironment() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_sse_long_poll_fallback", true),
    requireStreamEvidence: false,
    onUnexpectedContentType: ({ status, contentType, accepted }) => {
      try {
        let Z = `${contentType}:${accepted}`;
        if (z.has(Z)) return;
        z.add(Z);
        logEvent("tengu_ccr_sse_unexpected_content_type", {
          status,
          content_type: fromEnum(contentType),
          accepted,
        });
      } catch (error) {
        logForDebugging(
          `[remote-io] reporting a stream answer's unexpected content type failed; the connect goes on: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
    },
  });
  if (x) workerEventsTransport.setOnDiagnostic?.(x);
  let proxyRefusal = undefined;
  let j = undefined;
  let idleTracker = createIdleTracker();
  let de = new CCRClient(workerEventsTransport, url, {
    onDiagnostic: x,
    ...(hosting.kind === "hosted" && {
      onCardRecordRefused: hosting.onCardRecordRefused,
    }),
    ...(onEpochMismatch && {
      onEpochMismatch,
    }),
    ...{},
    ...false,
    ...false,
    ...getHeartbeatFeatureFlags(),
    ...(hosting.kind === "owns-process" &&
      (environmentKind === null || environmentKind === "anthropic_cloud") && {
        ownConnectionPool: isHostedWorkerFetchEnabled,
      }),
    streamEventFlushIntervalMs: isCcrStreamEventFlushMsGateOn(),
    streamEventFirstFlushMs: isCcrStreamFirstFlushMsGateOn(),
    toolInputFlushMs: isIdempotentPineGateOn(),
    noSubscriberStreamEventFlushIntervalMs: isCcrNoSubscriberFlushMsGateOn(),
    dropUnwatchedStreamEvents: isCcrDropUnwatchedStreamEventsGateOn(),
    ...(isRemoteToolForwardingSwitchOn() && {
      servedCallRequestsJumpQueue: servedCallRequestsJumpQueueOn,
    }),
    idleTracker,
    uploadTrim: () =>
      withEnvelopeFlag(
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_upload_trim", {}),
        hosting.kind === "hosted",
      ),
    keepsRequestId: () => getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TOASTY_BEACON, false),
    uploadHoldMarker: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_upload_hold_marker", false),
    ...(environmentKind === "bridge" && {
      liveOnlyShellTaskRows: {
        enabled: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_shell_task_rows_live_only_enabled", false),
        starts: new Map(),
      },
      artifactSocketIds: new Set(),
    }),
    followsServedPolicy: true,
    ...(hosting.kind === "owns-process" && {
      keepAliveAtWorkStart: () =>
        sendSessionActivitySignal_2() &&
        (isActivityReasonActive("api_call") ||
          isActivityReasonActive("tool_exec") ||
          isActivityReasonActive("hook_exec")),
    }),
    launchFlushPolicy:
      safeParseJSON(env.CLAUDE_CODE_CCR_EVENT_FLUSH_POLICY, false) ?? env.CLAUDE_CODE_CCR_EVENT_FLUSH_POLICY,
    workerSocket: q,
    ...((environmentKind === null ||
      environmentKind === "anthropic_cloud" ||
      isRemoteToolForwardingSwitchOn()) && {
      maxEventPostTimeoutMs: REMOTE_IO_TIMEOUT_MS,
    }),
    ...(hosting.kind === "owns-process" && {
      guardsClientRows: () =>
        isSelfHostedRemoteEnvironment() &&
        !isReviewSession() &&
        getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PATIENT_LEDGER, false),
    }),
    processExiting: isShuttingDown,
    gatesToolCalls: environmentKind !== "bridge",
    adoptRefreshedAuth: authRefreshForOwnerKind(hosting),
    gzipRequestBodyFetch: createGzipFetchWrapper("ccr_worker", storageV5),
    getAuthHeaders,
    isFirstPartyProvider,
    reportParkAtInit,
    initExternalMetadata,
    initialWorkerStatus,
  });
  switch (hosting.kind) {
    case "owns-process":
      de.registerShutdownCleanup();
      registerCleanup(async () => workerEventsTransport.close());
      break;
    case "hosted":
      break;
  }
  return {
    transport: workerEventsTransport,
    ccrClient: de,
    idleTracker,
    onDiagnostic: x,
    initExternalMetadata,
    proxyRefusal,
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

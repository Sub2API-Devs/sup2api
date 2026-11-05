/**
 * cli/remoteIO.ts
 *
 * 沿用旧版路径（门面模块 RemoteIO）：云 worker 的 SDK 输入输出（事件流、认证、交接）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/remoteIO.ts
 * pieces: chunk-1kk50rk6.js (56)
 * attribution: placement 53, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { PassThrough } from "stream";
import { URL as Ls } from "url";
import { fstatSync, createWriteStream, statSync } from "fs";
import { sessionWritersSchema, isCoalescableControlRequest } from "./transports/streamEventCoalescing.js";
import { DoctorLazy } from "./handlers/util.js";
import { zodStrictObject, union, stringSchema, numberSchema } from "../../vendor/zod/v4/classic/schemas.js";
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
import { logForDebugging, isDebugMode } from "../utils/debug.js";
import { SESSION_EVENT_TYPES_WITH_EVENT_TYPE, ATTESTATION_FLOOR_VERSION } from "./transports/SSETransport.js";
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
import { httpUrlFromWs } from "./transports/transportUtils.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { mainReplyHoldMs } from "../services/api/unwatchedReplyHold.js";
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
  GIT_CREDENTIAL_ENTRYPOINTS,
  ccrAuthRefreshAdmission,
  sessionAuthAdmission,
  ccrAuthRefresherFor,
} from "./remoteIO/workerAuth.js";
import { import_sortedIndex_2 } from "../../vendor/lodash-es/_inlinedHelpers.js";
import {
  CCRInitError,
  isWorkerRegisterFailure,
  SHUTDOWN_REQUEST_TIMEOUT_MS,
  WORKER_CONFLICT_CLOSE_CODES,
  DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS,
  DEFAULT_HELD_BUNCH_FLUSH_MS,
  CCRClient,
  workerEpochFromEnv,
  createIdleTracker,
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
import { isRemoteEnvPlaceholder, isRemoteManagedEnvironment } from "../utils/remoteEnvironment.js";
import {
  setMainLoopActivityListener,
  getMainLoopRefcount,
  setNestedChainDropListener,
  onProcessSlept,
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
import { listForRefusal } from "./cloudSession/hostedSessionRestrictions.js";
import { isHumanInboundMessage } from "../bridge/inboundMessageOrigin.js";
import { isProjectsHumanOriginEnabled } from "../utils/crossSessionMessagingGate.js";
import { launchedCwd } from "../utils/cwd.js";
import { isCommandMetadata } from "../utils/suggestions/commandSuggestions.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { CRON_CREATE_TOOL_NAME } from "../tools/ScheduleCronTool/prompt.js";
import { remoteSessionUrlId } from "../utils/sessionUrl.js";
import { isWondrousIslandGateOn } from "./remoteIO/gates.js";
import { getSessionIngressAuthHeaders } from "../utils/sessionIngressAuth.js";
import { addStartupContext } from "../utils/startupProfiler.js";
import { convertWsUrlToPostUrl } from "./transports/HybridTransport.js";
import { isClaudeAiChatOrigin } from "../utils/entrypointKinds.js";
import { getSessionId } from "../bootstrap/state.js";
import { getClientPlatform } from "../utils/http.js";
import { WorkerSocket, openWorkerWebSocket } from "./transports/WorkerSocket.js";
import { wouldGzipForHost, createGzipFetchWrapper } from "../services/api/gzipRequestBody.js";
import {
  setModelApiPoolRetiresAfterServerError,
  makeHttpsAgentCloseAfterServerError,
} from "../utils/mtls.js";
import { configureGlobalAgents } from "../utils/proxy.js";
import { isHostedWorkerFetchEnabled } from "../services/mcp/hostedWorkerTrust.js";
import { TENGU_TOASTY_BEACON } from "../services/api/withRetry.js";
import { getPatientLedgerReader } from "./remoteIO/servedTokenProvider.js";
import { isFirstPartyProvider } from "../utils/model/providers.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-1kk50rk6.js:72729-72767 placement
var teleportRelayEnvModule; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-1kk50rk6.js:72729", () => {
  teleportRelayEnvModule = require("../utils/teleport/relayEnv.js");
});
//@ chunk-1kk50rk6.js:72767-72938 placement
var remoteIOSingleton; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REPLAYABLE_ACCEPT_STATUSES;
var LOCAL_ONLY_CONTROL_SUBTYPES;
var SESSION_STREAM_CREATED_AT;
var SESSION_STREAM_STARTED_AT;
deferInit("chunk-1kk50rk6.js:72767", () => {
  remoteIOSingleton = null;
  REPLAYABLE_ACCEPT_STATUSES = new Set(["SERVER_AUTHORED", "SERVER_REPLAYED"]);
  LOCAL_ONLY_CONTROL_SUBTYPES = new Set(["set_chrome_browser_hints", ...[]]);
  SESSION_STREAM_CREATED_AT = "session_stream_created_at";
  SESSION_STREAM_STARTED_AT = "session_stream_started_at";
});
//@ chunk-1kk50rk6.js:72938-73018 placement
function sessionStreamStartedBefore(payload) {
  return (
    Object.hasOwn(payload, SESSION_STREAM_STARTED_AT) &&
    typeof Reflect.get(payload, SESSION_STREAM_STARTED_AT) === "string"
  );
}
//@ chunk-1kk50rk6.js:73018-73171 placement
function sessionStreamCreatedAt(payload) {
  if (!Object.hasOwn(payload, SESSION_STREAM_CREATED_AT)) return;
  let value = Reflect.get(payload, SESSION_STREAM_CREATED_AT);
  if (typeof value !== "string") return;
  let timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}
//@ chunk-1kk50rk6.js:73171-73210 placement
var SESSION_STREAM_RECEIVED_AT_MS = "session_stream_received_at_ms";
//@ chunk-1kk50rk6.js:73210-73337 placement
function sessionStreamReceivedAtMs(payload) {
  if (!Object.hasOwn(payload, SESSION_STREAM_RECEIVED_AT_MS)) return;
  let value = Reflect.get(payload, SESSION_STREAM_RECEIVED_AT_MS);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
//@ chunk-1kk50rk6.js:73337-73369 placement
var SESSION_STREAM_WRITERS = "session_stream_writers";
//@ chunk-1kk50rk6.js:73369-73488 placement
function sessionStreamWriters(payload) {
  if (!Object.hasOwn(payload, SESSION_STREAM_WRITERS)) return;
  let parsed = sessionWritersSchema().safeParse(Reflect.get(payload, SESSION_STREAM_WRITERS));
  return parsed.success ? parsed.data : undefined;
}
//@ chunk-1kk50rk6.js:73488-73521 placement
var SESSION_STREAM_AT_FLOOR = "session_stream_at_floor";
//@ chunk-1kk50rk6.js:73521-73654 placement
function getAtFloorMarker(payload) {
  if (!Object.hasOwn(payload, SESSION_STREAM_AT_FLOOR)) return;
  let value = Reflect.get(payload, SESSION_STREAM_AT_FLOOR);
  if (value === true) return "stands";
  return value === "leaving" ? "leaving" : undefined;
}
//@ chunk-1kk50rk6.js:73654-73802 placement
var SESSION_STREAM_SENDER; // deferred: uses DoctorLazy (./handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var sessionStreamSenderSchema;
deferInit("chunk-1kk50rk6.js:73654", () => {
  SESSION_STREAM_SENDER = "session_stream_sender";
  sessionStreamSenderSchema = DoctorLazy(() =>
    zodStrictObject({
      status: union([stringSchema(), numberSchema()]).optional(),
      trustedDevice: stringSchema().min(1).optional(),
      credential: stringSchema().min(1).optional(),
    }),
  );
});
//@ chunk-1kk50rk6.js:73802-73919 placement
function getStreamSenderInfo(payload) {
  if (!Object.hasOwn(payload, SESSION_STREAM_SENDER)) return;
  let parsed = sessionStreamSenderSchema().safeParse(Reflect.get(payload, SESSION_STREAM_SENDER));
  return parsed.success ? parsed.data : undefined;
}
//@ chunk-1kk50rk6.js:73919-74067 placement
function getRequestClientId(payload) {
  let request = Reflect.get(payload, "request");
  let clientId =
    typeof request === "object" && request !== null ? Reflect.get(request, "client_id") : undefined;
  return typeof clientId === "string" ? clientId : undefined;
}
//@ chunk-1kk50rk6.js:74067-74126 placement
function nonEmptyStringOrUndefined(value) {
  return typeof value === "string" && value !== "" ? value : undefined;
}
//@ chunk-1kk50rk6.js:74126-74156 placement
var SESSION_STREAM_FRAME = "session_stream_frame";
//@ chunk-1kk50rk6.js:74156-74219 placement
function streamFrameKey(frame) {
  return `${String(frame.sequence_num)}/${frame.event_id}`;
}
//@ chunk-1kk50rk6.js:74219-74325 placement
function getStreamFrame(payload) {
  if (!Object.hasOwn(payload, SESSION_STREAM_FRAME)) return;
  let frame = Reflect.get(payload, SESSION_STREAM_FRAME);
  return typeof frame === "string" ? frame : undefined;
}
//@ chunk-1kk50rk6.js:74325-74418 placement
function stampSurfaceFrameKey(frame) {
  if (attestedRequestSubtype(frame.payload) === "ui_surface")
    frame.payload[SESSION_STREAM_FRAME] = streamFrameKey(frame);
  else delete frame.payload[SESSION_STREAM_FRAME];
}
//@ chunk-1kk50rk6.js:74418-74696 placement
function extractDeviceAttestationSender(payload) {
  let deviceAttestationStatus = payload.device_attestation_status;
  let trustedDevice = nonEmptyStringOrUndefined(payload.device_attestation_trusted_device_tagged_id);
  let credential = nonEmptyStringOrUndefined(payload.device_attestation_credential_tagged_id);
  return {
    ...((typeof deviceAttestationStatus === "string" || typeof deviceAttestationStatus === "number") && {
      status: deviceAttestationStatus,
    }),
    ...(trustedDevice !== undefined && {
      trustedDevice,
    }),
    ...(credential !== undefined && {
      credential,
    }),
  };
}
//@ chunk-1kk50rk6.js:74696-74890 placement
function tagUiSurfaceFloorAndSender(frame, floor) {
  if (
    floor !== undefined &&
    frame.event_type === "control_request" &&
    attestedRequestSubtype(frame.payload) === "ui_surface"
  ) {
    frame.payload[SESSION_STREAM_AT_FLOOR] = floor === "stands" ? true : floor;
    frame.payload[SESSION_STREAM_SENDER] = extractDeviceAttestationSender(frame);
  } else {
    delete frame.payload[SESSION_STREAM_AT_FLOOR];
    delete frame.payload[SESSION_STREAM_SENDER];
  }
}
//@ chunk-1kk50rk6.js:74890-75468 placement
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
//@ chunk-1kk50rk6.js:75468-75651 placement
function stampControlResponseCreatedAt(frame) {
  if (frame.payload.type !== "control_response") return;
  if (frame.event_type === "control_response" && typeof frame.created_at === "string")
    frame.payload[SESSION_STREAM_CREATED_AT] = frame.created_at;
  else delete frame.payload[SESSION_STREAM_CREATED_AT];
}
//@ chunk-1kk50rk6.js:75651-75950 placement
function stampBashCommandTimes(frame) {
  if (frame.payload.type !== "bash_command") return;
  if (frame.event_type === "bash_command" && typeof frame.created_at === "string")
    frame.payload[SESSION_STREAM_CREATED_AT] = frame.created_at;
  else delete frame.payload[SESSION_STREAM_CREATED_AT];
  if (frame.event_type === "bash_command" && typeof frame.processing_at === "string")
    frame.payload[SESSION_STREAM_STARTED_AT] = frame.processing_at;
  else delete frame.payload[SESSION_STREAM_STARTED_AT];
}
//@ chunk-1kk50rk6.js:75950-76234 placement
function stampHandoffReceivedAt(frame, receivedAtMs) {
  let subtype =
    frame.payload.type === "control_request" ? getControlRequestSubtype(frame.payload) : undefined;
  if (subtype !== "turn_handoff" && subtype !== "rewind_conversation" && subtype !== "start_shell_task")
    return;
  if (subtype === "turn_handoff") frame.payload[SESSION_STREAM_RECEIVED_AT_MS] = receivedAtMs;
  if (typeof frame.created_at === "string") frame.payload[SESSION_STREAM_CREATED_AT] = frame.created_at;
  else delete frame.payload[SESSION_STREAM_CREATED_AT];
}
//@ chunk-1kk50rk6.js:76234-76397 placement
function getControlRequestSubtype(payload) {
  if (typeof payload !== "object" || payload === null) return;
  let request = payload.request;
  if (typeof request !== "object" || request === null) return;
  let subtype = request.subtype;
  return typeof subtype === "string" ? subtype : undefined;
}
//@ chunk-1kk50rk6.js:76397-77578 placement
function dropServerOnlyStdinTypes(text, takeRunnerLine, mayArriveByStream) {
  let flattened = text
    .split(
      `
`,
    )
    .flatMap((line) => {
      let parsed;
      try {
        parsed = jsonParse(stripBom(line));
      } catch {
        return [line];
      }
      let type = typeof parsed === "object" && parsed !== null ? parsed.type : undefined;
      if (typeof type === "string" && takeRunnerLine?.(type, parsed)) return [];
      if (mayArriveByStream?.(type, parsed) === false) {
        logForDiagnosticsNoPII("warn", "cli_stdin_line_dropped_on_granted_child");
        logForDebugging(
          "[remote-io] dropped a line from stdin: on this worker only the session stream may deliver it, so nothing was done with it",
          {
            level: "warn",
          },
        );
        return [];
      }
      if (typeof type === "string" && SESSION_EVENT_TYPES_WITH_EVENT_TYPE.has(type)) {
        logForDiagnosticsNoPII("warn", "cli_stdin_server_only_type_dropped", {
          payload_type: type,
        });
        logForDebugging(
          `[remote-io] dropped a ${type} frame from the stdin lane (server-authored-only type; SSE is its only ingress)`,
          {
            level: "warn",
          },
        );
        return [];
      }
      if (type === "control_request") {
        let controlRequestSubtype = getControlRequestSubtype(parsed);
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
      if (typeof parsed !== "object" || parsed === null) return [line];
      let keys = new Set([
        SESSION_STREAM_CREATED_AT,
        SESSION_STREAM_STARTED_AT,
        SESSION_STREAM_RECEIVED_AT_MS,
        SESSION_STREAM_WRITERS,
        SESSION_STREAM_AT_FLOOR,
        SESSION_STREAM_SENDER,
        SESSION_STREAM_FRAME,
        "program_use_case_id",
        ...[],
      ]);
      let entries = Object.entries(parsed);
      if (!entries.some(([key]) => keys.has(key))) return [line];
      return [ndjsonStringify(Object.fromEntries(entries.filter(([key]) => !keys.has(key))))];
    });
  return flattened.length === 0
    ? undefined
    : flattened.join(`
`);
}
//@ chunk-1kk50rk6.js:77578-77689 placement
class UnreadableInputError extends Error {
  name = "UnreadableInputError";
  constructor() {
    super("stream-json input could not be read");
  }
}
//@ chunk-1kk50rk6.js:77689-77709 placement
var MAX_QUEUED_FRAMES = 256;
var REMOTE_IO_TIMEOUT_MS = 30000;
//@ chunk-1kk50rk6.js:77709-78211 placement
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
//@ chunk-1kk50rk6.js:78211-78486 placement
function resolveCarriedPolicy(storedEventPolicy, carried, fallback) {
  if (
    carried.fault === "policy_unparseable" ||
    (carried.fault === "policy_partial" && carried.policy.enforce)
  )
    return "unreadable";
  if (carried.policy !== undefined)
    return {
      policy: carried.policy,
      carried: false,
    };
  if (storedEventPolicy === undefined)
    return fallback
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
//@ chunk-1kk50rk6.js:78486-78577 placement
var PERMISSION_WITHDRAWN_MESSAGE =
  "This permission request was withdrawn because it was not answered in time.";
var MAX_VOUCHED_MODEL_REQUEST_IDS = 256;
//@ chunk-1kk50rk6.js:78577-111651 placement (2.1.88 match: RemoteIO, 0.12)
/**
 * RemoteIO（云 worker 的 SDK I/O 类，继承自通用 I/O 基类）：管理与客户端表面的连接状态、会话写入者、表面策略（stands/leaving）、入站消息与回合交接，是云会话 worker 的核心。
 */
let RemoteIO; // deferred: uses StructuredIO (./structuredIO.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1kk50rk6.js:78577", () => {
  RemoteIO = class RemoteIO extends StructuredIO {
    isRemoteTransport() {
      return true;
    }
    sessionWriters() {
      return this.transport.getSessionWriters();
    }
    uiSurfaceFrameOf(frame, isAnySurfaceAttached) {
      let atFloorMarker = getAtFloorMarker(frame);
      let streamSenderInfo = getStreamSenderInfo(frame);
      return {
        isRemoteTransport: true,
        redactsWhatItPersists: this.redactsWhatItPersists(),
        isAnySurfaceAttached,
        createdAt: sessionStreamCreatedAt(frame),
        sessionWriters: sessionStreamWriters(frame),
        isAtFloor:
          atFloorMarker === "stands" &&
          streamSenderInfo !== undefined &&
          this.standsUnderPolicy(streamSenderInfo),
        leavesBelowFloor:
          atFloorMarker === "leaving" &&
          streamSenderInfo !== undefined &&
          this.leavesOwnSurface(streamSenderInfo, getRequestClientId(frame)),
      };
    }
    standsUnderPolicy(policy) {
      let verdict = judgeAttestationStanding(policy.status, this.surfacePolicy());
      return verdict === "stands" || verdict === "observed_below_floor";
    }
    surfaceClientAttached(clientId, frame) {
      let stands = false;
      try {
        let streamSenderInfo = getStreamSenderInfo(frame);
        if (streamSenderInfo !== undefined && this.standsUnderPolicy(streamSenderInfo)) {
          this.surfaceClientsOnRecord.set(clientId, streamSenderInfo);
          stands = true;
        }
      } catch (error) {
        logError(toError(error));
      }
      if (stands) {
        this.reviewStatementRenewal();
        return true;
      }
      try {
        this.surfaceClientsOnRecord.delete(clientId);
        this.surfaceRoster?.refuse([clientId]);
      } catch (error) {
        logError(toError(error));
      }
      return false;
    }
    surfaceSenderStands(frame) {
      try {
        let streamSenderInfo = getStreamSenderInfo(frame);
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
      let listed = new Set(this.surfaceRoster?.list() ?? []);
      for (let key of this.surfaceClientsOnRecord.keys())
        if (!listed.has(key)) this.surfaceClientsOnRecord.delete(key);
      return this.surfaceClientsOnRecord;
    }
    refuseSurfaceClientsBelowPolicy() {
      try {
        let attached = this.surfaceClientsAttached();
        let filtered = (this.surfaceRoster?.list() ?? []).filter((clientId) => {
          let record = attached.get(clientId);
          return record === undefined || !this.standsUnderPolicy(record);
        });
        if (filtered.length > 0) this.surfaceRoster?.refuse(filtered);
      } catch (error) {
        logError(toError(error));
      }
    }
    setSubscribersReportedListener(listener) {
      this.ccrClient.setSubscribersReportedListener(listener);
    }
    taskHoldSince() {
      return this.taskHoldClock.since();
    }
    takeUserFrameReceivedWallMs(uuid) {
      let wallMs = this.userFrameReceivedWallMs.get(uuid);
      this.userFrameReceivedWallMs.delete(uuid);
      this.userFrameStartedAt.delete(uuid);
      this.userFrameReceivedAt.delete(uuid);
      return wallMs;
    }
    userFrameReceivedAtMs(uuid) {
      return this.userFrameReceivedAt.get(uuid);
    }
    userFrameStartedAtMs(uuid) {
      return this.userFrameStartedAt.get(uuid);
    }
    hostOwnsStdinOrigin = false;
    persistsOutboundFrames = true;
    get isHostedWorker() {
      return this.hosting.kind === "hosted";
    }
    async readOwnClientEvent(eventId) {
      let ownClientEvent = await this.ccrClient.readOwnClientEvent(eventId);
      if (ownClientEvent.kind !== "event") return ownClientEvent;
      if (this.storedEventPolicy === undefined)
        await withDeadline(this.firstStreamPolicy.promise, FIRST_STREAM_POLICY_TIMEOUT_MS);
      let storedEventPolicy = this.storedEventPolicy;
      if (storedEventPolicy === undefined || storedEventPolicy === "unreadable")
        return {
          kind: "unavailable",
          why: "attestation_policy_unknown",
        };
      let result = {
        kind: "event",
        event: ownClientEvent.event,
        personTypedLine: sessionChannelPromptRecord(ownClientEvent.event.payload),
      };
      let policy = storedEventPolicy.policy;
      if (policy === undefined) return result;
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
      if (!policy.enforce || meetsLevel || configException) return result;
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
    countedSessionRefusals = new Set();
    warnedSessionWritersMissing = false;
    countedRefusedSurfaceRequests = new Set();
    surfaceRefusals = servedCallDispatcher({
      isAwaited: (requestId) => this.liveDeviceRequestKind(requestId) !== undefined,
      readNow: () => Date.now(),
    });
    statementRenewal = createLeaseRenewer({
      isWanted: () =>
        (this.surfaceRoster?.list().length ?? 0) > 0 && canServeManifests(this.uiSurfaceChannel()),
      renew: () => this.ccrClient.renewStream(),
      lapse: () => this.surfaceRoster?.setAside(),
      readNow: () => Date.now(),
      schedule: (fn, delay) => {
        let timer = setTimeout(runSafely, delay, fn);
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
    attestationDropSenderWriter = (event) => {
      this.ccrClient.writeEvent(event).catch((error) => {
        logForDebugging(`[remote-io] drop sender-notice write failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      });
    };
    attestationDropNotifier = (notice) => {
      if (this.isBridge)
        process.stderr.write(
          REMOTE_IO_WARNING_PREFIX +
            formatUnsignedEventWarning(notice) +
            `
`,
        );
      if (notice.payloadType === "control_request" && notice.requestId)
        this.ccrClient
          .writeEvent(controlErrorResponse(notice.requestId, formatUnsignedEventNotice(notice)))
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
      let stream = new PassThrough({
        encoding: "utf8",
      });
      super(stream, replayUserMessages, sessionState);
      this.inputStream = stream;
      this.hosting = hosting;
      this.url = httpUrlFromWs(new Ls(streamUrl));
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
      let fd = envClaudeRunnerActivityFd ? Number.parseInt(envClaudeRunnerActivityFd, 10) : NaN;
      if (Number.isInteger(fd) && fd > 2)
        try {
          let stats = fstatSync(fd);
          if (!stats.isFIFO() && !stats.isSocket()) throw Error("not a pipe");
          let writeStream = createWriteStream("", {
            fd,
            autoClose: false,
          });
          writeStream.on("error", (error) => {
            logForDebugging(
              `[remote-io] activity fd ${fd} write error (${errorMessage(error)}); falling back to stdout`,
            );
            this.activityFd = undefined;
          });
          this.activityFd = writeStream;
          let startLine = startFolderFrameLine();
          if (this.teeStdout && !this.isBridge && startLine !== undefined) writeStream.write(startLine);
        } catch (error) {
          logForDebugging(
            `[remote-io] activity fd ${fd} unavailable (${errorMessage(error)}); falling back to stdout`,
          );
        }
      if (earlyRemoteLink && hosting.kind !== "owns-process")
        throw Error("earlyRemoteLink is only valid for an owns-process RemoteIO");
      if (earlyRemoteLink) {
        earlyRemoteLink.ccrClient.flagsRefreshed();
        earlyRemoteLink.ccrClient.setFeatureGatedOptions(getHeartbeatFeatureFlags());
        earlyRemoteLink.ccrClient.setStreamEventFlushIntervalMs(isCcrStreamEventFlushMsGateOn());
        earlyRemoteLink.ccrClient.setStreamEventFirstFlushMs(isCcrStreamFirstFlushMsGateOn());
        earlyRemoteLink.ccrClient.setStreamEventWindowRunsFromLastFlush(mainReplyHoldMs() > 0);
        earlyRemoteLink.ccrClient.setHeldBunchFlushMs(getVirtualParasolHeldBunchFlushMs());
        earlyRemoteLink.ccrClient.setToolInputFlushMs(isIdempotentPineGateOn());
        earlyRemoteLink.ccrClient.setNoSubscriberStreamEventFlushIntervalMs(isCcrNoSubscriberFlushMsGateOn());
        earlyRemoteLink.ccrClient.setDropUnwatchedStreamEvents(isCcrDropUnwatchedStreamEventsGateOn());
      }
      let link =
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
              ? (code) => {
                  this.stopFor(classifyStreamCloseCode(code));
                  throw Error("terminal request-path condition");
                }
              : undefined,
          reportParkAtInit,
          initExternalMetadata,
          initialWorkerStatus,
          deferDelivery: false,
        });
      let onDiagnostic = link.onDiagnostic;
      this.transport = link.transport;
      this.ccrClient = link.ccrClient;
      this.idleTracker = link.idleTracker;
      this.feedsStoreSignals = false;
      let tracksDelivery = isRemoteToolForwardingSwitchOn();
      if (tracksDelivery) {
        this.ccrClient.onDurableEventsDropped = (events, uploaded) => {
          let controlRequestIds = collectControlRequestIds(events);
          if (controlRequestIds.length > 0) this.rejectUndeliveredRequests(controlRequestIds, uploaded);
        };
        this.ccrClient.onDurableEventsUpload = (events, uploaded) => {
          let controlRequestIds = collectControlRequestIds(events);
          if (controlRequestIds.length > 0) this.noteRequestsUpload(controlRequestIds, uploaded);
        };
      }
      switch (((this.tracksRequestDelivery = tracksDelivery), hosting.kind)) {
        case "owns-process":
          this.sessionState.slimsRefusedLead = (request) =>
            request.request_id === "" && isFileReferenceCall(request.tool_use_id);
          this.ccrClient.onCardRecordRefused = (requestId, { external_metadata: externalMetadata }) => {
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
      this.transport.setOnUserFrameReceived((uuid, wallMs, startedAt, receivedAt) => {
        if (this.userFrameReceivedWallMs.has(uuid)) return;
        if (this.userFrameReceivedWallMs.size >= MAX_QUEUED_FRAMES) {
          let oldest = this.userFrameReceivedWallMs.keys().next().value;
          if (oldest !== undefined) {
            this.userFrameReceivedWallMs.delete(oldest);
            this.userFrameStartedAt.delete(oldest);
            this.userFrameReceivedAt.delete(oldest);
          }
        }
        this.userFrameReceivedWallMs.set(uuid, wallMs);
        this.userFrameReceivedAt.set(uuid, receivedAt);
        let startedMs = typeof startedAt === "string" ? Date.parse(startedAt) : NaN;
        if (!Number.isNaN(startedMs)) this.userFrameStartedAt.set(uuid, startedMs);
      });
      this.transport.setOnClose((code, reason) => {
        if (code !== undefined) {
          switch (((this.permanentCloseCode = code), hosting.kind)) {
            case "owns-process":
              process.stderr.write(`RemoteIO: transport closed permanently (code ${code})
`);
              break;
            case "hosted":
              hosting.onDiagnostic(
                `transport closed permanently (code ${code})`,
                "warn",
                "transport_closed_permanently",
              );
              break;
          }
          this.stopFor({
            kind: "stream-rejected",
            closeCode: code,
          });
        }
        this.inputStream.end();
      });
      this.transport.setOnEventVetoed((frame) => {
        this.ccrClient.reportDelivery(frame.event_id, "received");
        this.ccrClient.reportDelivery(frame.event_id, "processed");
      });
      if (hosting.kind === "hosted") {
        let reported = false;
        this.transport.setOnFrameRefused((eventId) => {
          if (eventId !== undefined) {
            this.ccrClient.reportDelivery(eventId, "received");
            this.ccrClient.reportDelivery(eventId, "processed");
          }
          if (!reported) {
            reported = true;
            onDiagnostic?.(
              `a frame on the event stream held more than ${hosting.mostMembersInAFrame} object members and was dropped unparsed (${eventId === undefined ? "no event_id read" : `event_id ${eventId}`}); later ones are not logged`,
              "warn",
              "frame_too_many_members",
            );
          }
        });
      }
      this.unsubscribeGrowthBookRefresh = onGrowthBookRefresh(() => {
        this.ccrClient.flagsRefreshed();
        this.ccrClient.setStreamEventFlushIntervalMs(isCcrStreamEventFlushMsGateOn());
        this.ccrClient.setStreamEventFirstFlushMs(isCcrStreamFirstFlushMsGateOn());
        this.ccrClient.setHeldBunchFlushMs(getVirtualParasolHeldBunchFlushMs());
        this.ccrClient.setToolInputFlushMs(isIdempotentPineGateOn());
        this.ccrClient.setNoSubscriberStreamEventFlushIntervalMs(isCcrNoSubscriberFlushMsGateOn());
        this.ccrClient.setDropUnwatchedStreamEvents(isCcrDropUnwatchedStreamEventsGateOn());
      });
      let authWait =
        rereadMissingAuthHeaders && Object.keys(authHeaders).length === 0
          ? waitForSessionAuthHeaders({
              getAuthHeaders,
              rereadMiss: rereadMissingAuthHeaders,
              onDiagnostic,
            })
          : null;
      let initialized =
        earlyRemoteLink?.initialized ??
        (authWait
          ? authWait.then(() => this.ccrClient.initialize(workerEpoch))
          : this.ccrClient.initialize(workerEpoch));
      this.restoredWorkerState = initialized.catch(() => null);
      initialized.then(
        () => {
          onDiagnostic?.("worker registered", "info", "worker_registered");
          let metadata = initExternalMetadata ?? link.initExternalMetadata;
          try {
            metadata = announcedExternalMetadata?.() ?? metadata;
          } catch (error) {
            logError(error);
          }
          if (!import_sortedIndex_2(metadata, link.initExternalMetadata))
            this.ccrClient.reportMetadata({
              ...metadata,
            });
          let handoff = turnHandoffAvailableMessage(metadata, sessionId);
          if (handoff) this.write(handoff);
        },
        (error) => {
          let reason = error instanceof CCRInitError ? error.reason : errorMessage(error);
          logForDiagnosticsNoPII("error", "cli_worker_lifecycle_init_failed", {
            reason: error instanceof CCRInitError ? error.reason : "unknown",
          });
          let message = `CCRClient initialization failed: ${errorMessage(error)}`;
          if (isWorkerRegisterFailure(error))
            logForDebugging(message, {
              level: "error",
            });
          else logError(Error(message));
          switch (hosting.kind) {
            case "owns-process":
              onDiagnostic?.(
                `worker registration failed (${reason}), exiting`,
                "warn",
                "worker_registration_failed",
              );
              gracefulShutdown(1, "other");
              return;
            case "hosted":
              onDiagnostic?.(
                `worker registration failed (${reason}), stopping`,
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
      setInternalEventWriter((kind, payload, options) =>
        this.ccrClient.writeInternalEvent(kind, payload, options),
      );
      setAgentMetadataInStreamGate(isTurnHandoffResumeEnabled);
      setInternalEventReader(
        (uuid) => this.ccrClient.readInternalEvents(uuid),
        () => this.ccrClient.readSubagentInternalEvents(),
        isResume || fetchesAgentTranscriptsOnDemand
          ? (agentId, storageV5, options, maxTimestamp) =>
              this.ccrClient.readAgentInternalEvents(
                agentId,
                storageV5,
                agentTranscriptBound ??
                  (maxTimestamp === undefined
                    ? undefined
                    : {
                        maxEvents: 1 / 0,
                        maxBytes: maxTimestamp,
                        maxTimestampChars: undefined,
                        takesCompressedPages: true,
                      }),
                options,
              )
          : undefined,
      );
      this.ccrClient.onInternalBatchAcked = (batch) => updateCCRTipFromAckedBatch(batch, storageV5);
      this.ccrClient.onInternalEventLaneClosed = sealTranscriptAppendsForShutdown;
      if (isResume) {
        let startTime = performance.now();
        let ccrClient = this.ccrClient;
        this.hydratePrefetch = (async () => {
          if (authWait) {
            await authWait;
            startTime = performance.now();
          }
          return (
            (authWait ? undefined : await earlyHydrateReads) ??
            (await readInternalEventsFromTip(
              (generator) => ccrClient.readInternalEvents(generator),
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
      let states = {
        started: "processing",
        completed: "processed",
        cancelled: "processed",
      };
      this.onCommandLifecycle = (uuid, state) => {
        if (!Object.hasOwn(states, state)) return;
        let deliveryState = states[state];
        if (deliveryState === undefined) return;
        this.ccrClient.reportDelivery(uuid, deliveryState);
      };
      this.transport.setOnDelivered((frame, writersInfo, receivedAtMs) => {
        stampInitializeStreamMeta(frame, writersInfo);
        tagUiSurfaceFloorAndSender(frame, this.surfaceFramesAtFloor.get(frame));
        stampSurfaceFrameKey(frame);
        stampHandoffReceivedAt(frame, receivedAtMs);
        stampBashCommandTimes(frame);
        if (hosting.kind === "hosted") stampControlResponseCreatedAt(frame);
        let createdAt = typeof frame.created_at === "string" ? Date.parse(frame.created_at) : Number.NaN;
        if (
          !Number.isNaN(createdAt) &&
          (this.newestFrameCreatedAt === undefined || createdAt > this.newestFrameCreatedAt)
        )
          this.newestFrameCreatedAt = createdAt;
        let { type, request } = frame.payload;
        if (type === "user") runSafely(() => onUserFrameDelivered?.(frame.payload));
        else if (
          type === "control_request" &&
          getControlRequestSubtype(frame.payload) === "stage_file" &&
          isPlainObject(request)
        )
          runSafely(() => onStageFileDelivered?.(request));
        else if (type === "control_request" && getControlRequestSubtype(frame.payload) === "claim_session")
          runSafely(() => onClaimSessionDelivered?.());
      });
      setSenderDropWriter(this.attestationDropSenderWriter);
      setDropNotifier(this.attestationDropNotifier);
      if (this.isBridge) {
        setAttestationFilterPolicy(getAttestationFilterPolicy);
        this.transport.setEventFilter((event) => {
          this.markAndStripSessionChannelFrame(event, {
            listedOnly: false,
          });
          let admitted = this.judgeNotingAdmission(event, () => evaluateInboundAttestationWithPolicy(event));
          if (admitted) {
            this.ccrClient.reportDelivery(event.event_id, "received");
            this.ccrClient.reportDelivery(event.event_id, "processed");
          }
          return admitted;
        });
      } else {
        this.transport.setWorkerAttestationPolicySink((policy) => this.takeWorkerAttestationPolicy(policy));
        this.transport.setStatementRenewalGate((frame, writers) =>
          this.awaitsFresherStatement(frame, writers),
        );
        let isHostedKind = hosting.kind === "hosted" || env.CLAUDE_CODE_ENVIRONMENT_KIND === undefined;
        let holdsToFloor = isHostedKind || isRemoteEnvPlaceholder();
        this.transport.setEventFilter((event) => {
          let admitted = this.judgeNotingAdmission(event, () =>
            this.judgeInboundFrame(event, {
              isManagedCloudWorker: isHostedKind,
              holdsToFloor,
              sessionWriters: this.transport.sessionWritersOf(event),
            }),
          );
          if (admitted) {
            this.ccrClient.reportDelivery(event.event_id, "received");
            this.ccrClient.reportDelivery(event.event_id, "processed");
          }
          return admitted;
        });
      }
      let writeState = () => {
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
          write: writeState,
        }) ?? null;
      this.waitingOnUserReport = waitForTurnPromptUploads({
        listTurnPromptsWaitedOn: () => (this.sessionState.waitingOnUser ? this.listTurnPrompts() : []),
        write: this.idleLine?.write ?? writeState,
      });
      this.sessionState.onStateChanged = (state, detail) => {
        this.ccrClient.reportState(state, detail);
        this.waitingOnUserReport.stateChanged();
      };
      this.sessionState.onWaitingOnUserChanged = () => {
        this.waitingOnUserReport.stateChanged();
      };
      this.sessionState.onTurnStarting = (mode, taskId) => {
        if (this.teeStdout && !this.isBridge)
          try {
            this.teeActivity(
              ndjsonStringify({
                type: "system",
                subtype: "turn_starting",
                mode,
                ...(mode === "task-notification" && {
                  task_id: taskId ?? null,
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
      setMainLoopActivityListener((count) => this.sessionState.setMainLoopRefcount(count));
      this.sessionState.setMainLoopRefcount(getMainLoopRefcount());
      setNestedChainDropListener((agentId) => this.sessionState.dropNestedBlockedChain(agentId));
      this.sessionState.onMetadataChanged = (metadata) => {
        this.ccrClient.reportMetadata(metadata);
      };
      this.sessionState.onInternalMetadataChanged = (metadata) => {
        this.ccrClient.reportInternalMetadata(metadata);
      };
      watchRepoCheckouts((metadata) => this.sessionState.notifyMetadataChanged(metadata));
      if (earlyRemoteLink) this.transport.startDelivery();
      else if (authWait)
        authWait.then(
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
    pumpStdinLane(lane) {
      (async () => {
        for await (let chunk of lane) {
          let text = dropServerOnlyStdinTypes(
            String(chunk).replace(/\n$/, ""),
            this.takeRunnerLine,
            undefined,
          );
          if (text !== undefined)
            this.writeInbound(
              text +
                `
`,
              "stdin",
            );
        }
      })();
    }
    discardStdinLane(lane, kind) {
      (async () => {
        let reported = false;
        for await (let chunk of lane)
          if (!reported && String(chunk).trim() !== "") {
            reported = true;
            logForDiagnosticsNoPII("warn", "cli_remote_io_stdin_ignored");
            logForDebugging(
              `[remote-io] ignored data on process stdin (host kind ${kind === null ? "unset" : `'${kind}'`}): only a 'bridge' or 'byoc' host's stdin is an input lane, so control input comes from the session stream only`,
              {
                level: "warn",
              },
            );
          }
      })();
    }
    markAndStripSessionChannelFrame(frame, { listedOnly }) {
      noop(frame);
    }
    sessionChannelFloorVerdict(frame, sessionWriters) {
      let families = this.guardedFamilies();
      if (
        !isAttestationGatedFrame(
          frame.payload,
          (requestId) => this.liveDeviceRequestKind(requestId),
          families,
        )
      )
        return "passed";
      try {
        let verdict = judgeDeviceAttestation(
          frame,
          (requestId) => this.liveDeviceRequestKind(requestId),
          families,
          {
            policy: this.surfacePolicy(),
            leaves: (clientId) => this.leavesOwnSurface(extractDeviceAttestationSender(frame), clientId),
            sessionWriters,
            now: Date.now,
          },
        );
        if (verdict.kind === "observe_surface_request")
          this.countObservedSurfaceRequest(verdict.status.toLowerCase());
        else if (verdict.kind === "admit_leaving") {
          if (
            !this.surfaceRefusals.charges({
              requestId: verdict.requestId,
              frame: streamFrameKey(frame),
            })
          )
            return "dropped";
          rewriteAsUiDetachRequest(frame.payload, {
            requestId: verdict.requestId,
            clientId: verdict.clientId,
            eventId: frame.event_id,
          });
          this.surfaceFramesAtFloor.set(frame, "leaving");
          logForDebugging(
            `[remote-io] a surface client on record leaves though the device floor refuses its frame (attestation ${verdict.status.toLowerCase()}): it goes on as its id and the client it names`,
          );
          return "rebuilt";
        } else if (verdict.kind !== "pass") return this.applySessionChannelVerdict(frame, verdict);
        if (attestedRequestSubtype(frame.payload) === "ui_surface")
          this.surfaceFramesAtFloor.set(frame, "stands");
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
    enforcesDevicePolicy() {
      let workerAttestationPolicy = this.workerAttestationPolicy;
      return (
        workerAttestationPolicy?.enforce === true &&
        !this.isSurfacePolicyUnreadable &&
        [...workerAttestationPolicy.acceptStatuses].every((acceptStatus) =>
          REPLAYABLE_ACCEPT_STATUSES.has(acceptStatus),
        )
      );
    }
    whyNotSending() {
      return;
    }
    sendServedCallRequest(families) {
      return this.whyNotSending() === undefined
        ? super.sendServedCallRequest(families)
        : this.unsentServedCall();
    }
    takeWorkerAttestationPolicy(policy) {
      this.workerAttestationPolicy = policy.policy;
      this.storedEventPolicy = resolveCarriedPolicy(
        this.storedEventPolicy,
        policy,
        this.connectionIsFromSessionService(),
      );
      if (this.storedEventPolicy !== undefined) this.firstStreamPolicy.resolve();
      this.isSurfacePolicyUnreadable =
        policy.fault === "policy_unparseable" || (policy.fault === "policy_partial" && policy.policy.enforce);
      if (policy.fault !== undefined) reportAttestationHeaderUnreadable(policy.fault);
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
        if (sessionWritersStatement === undefined && !this.warnedSessionWritersMissing) {
          let families = this.guardedFamilies();
          if (
            env.CLAUDE_CODE_ENVIRONMENT_KIND === undefined &&
            (families.remoteTools || families.plugins || families.settings !== false)
          ) {
            this.warnedSessionWritersMissing = true;
            logForDiagnosticsNoPII("warn", "cli_session_writers_header_missing");
          }
        }
      } catch (error) {
        logError(toError(error));
      }
    }
    reviewStatementRenewal() {
      runSafely(() => this.statementRenewal.review());
    }
    awaitsFresherStatement(frame, sessionWriters) {
      try {
        let controlResponse = extractControlResponse(frame.payload);
        let isSurface =
          attestedRequestSubtype(frame.payload) === "ui_surface" ||
          (controlResponse !== undefined && this.liveDeviceRequestKind(controlResponse) === "host_ask");
        let createdAt =
          frame.event_type === frame.payload.type && typeof frame.created_at === "string"
            ? Date.parse(frame.created_at)
            : Number.NaN;
        return (
          isSurface &&
          canServeManifests(this.uiSurfaceChannel()) &&
          frameAgeVerdict(
            {
              createdAt: Number.isNaN(createdAt) ? undefined : createdAt,
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
    leavesOwnSurface(sender, clientId) {
      let record = clientId === undefined ? undefined : this.surfaceClientsAttached().get(clientId);
      if (record === undefined) return false;
      let trustedDevice = nonEmptyStringOrUndefined(record.trustedDevice);
      let credential = nonEmptyStringOrUndefined(record.credential);
      return (
        (trustedDevice !== undefined && trustedDevice === nonEmptyStringOrUndefined(sender.trustedDevice)) ||
        (credential !== undefined && credential === nonEmptyStringOrUndefined(sender.credential))
      );
    }
    judgeNotingAdmission(frame, judge) {
      let requestId =
        frame.payload.type === "control_request" && getControlRequestSubtype(frame.payload) !== undefined
          ? getControlRequestSubtype_2(frame.payload)
          : undefined;
      let wasSeen = requestId === undefined || isKnownControlRequestId(requestId);
      let admitted = judge();
      try {
        if (admitted === false && requestId !== undefined && isKnownControlRequestId(requestId))
          this.surfaceRefusals.admitted({
            requestId,
            frame: streamFrameKey(frame),
            wasSeen,
          });
      } catch (error) {
        logError(toError(error));
      }
      return admitted;
    }
    judgeInboundFrame(frame, { isManagedCloudWorker, holdsToFloor, sessionWriters }) {
      if (isManagedCloudWorker) this.countHookOrPluginSender(frame);
      let verdict =
        holdsToFloor || attestedRequestSubtype(frame.payload) === "ui_surface"
          ? this.sessionChannelFloorVerdict(frame, sessionWriters)
          : "passed";
      if (verdict === "dropped") return true;
      if (verdict === "rebuilt") return false;
      if (this.workerAttestationPolicy === undefined) {
        rememberInboundRequestId(frame);
        return false;
      }
      let requestId = this.workerAttestationPolicy.enforce
        ? isServiceVouchedSettingsRequest(frame)
        : undefined;
      if (
        requestId !== undefined &&
        (isKnownControlRequestId(requestId) || this.vouchedModelOrEffortRequestIds.has(requestId))
      )
        return "attestation_policy";
      if (
        filterInboundEventBySource(
          frame,
          this.workerAttestationPolicy,
          normalizeAttestationStatus(frame.device_attestation_status) === "TRANSITIVELY_VOUCHED" &&
            (currentInboundSetting() ?? "accept") === "accept",
          this.vouchableCloudModel,
        )
      )
        return "attestation_policy";
      if (requestId !== undefined) {
        if (this.vouchedModelOrEffortRequestIds.size >= MAX_VOUCHED_MODEL_REQUEST_IDS)
          return "attestation_policy";
        this.vouchedModelOrEffortRequestIds.add(requestId);
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
        settings: false,
        hostAsks,
        surfaces: true,
      };
    }
    cutsSettingsToList() {
      let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
      return CLAUDE_CODE_ENTRYPOINT === undefined || GIT_CREDENTIAL_ENTRYPOINTS.has(CLAUDE_CODE_ENTRYPOINT);
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
    countHookOrPluginSender(frame) {
      try {
        let action = classifyAttestationAction(frame.payload, (requestId) =>
          this.liveDeviceRequestKind(requestId),
        );
        if (action === undefined) return;
        let { verdict, status } = judgeAttestationAction(action, frame);
        let key = `${action}:${status}`;
        let group = ATTESTATION_ACTION_GROUPS[action];
        if (this.countedSenderStatuses.has(key) || !this.hookAndPluginAdmissions()[group]) return;
        let mode = this.guardedFamilies()[group] ? "enforce" : "observe";
        this.countedSenderStatuses.add(key);
        logEvent("tengu_session_channel_sender_status", {
          kind: fromEnum(action),
          attestation_status: fromEnum(status),
          verdict: fromEnum(verdict === "pass" ? "pass" : "below_floor"),
          mode: fromEnum(mode),
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
    countRefusedSurfaceRequest(reason) {
      if (this.countedRefusedSurfaceRequests.has(reason)) return;
      this.countedRefusedSurfaceRequests.add(reason);
      try {
        logFeatureBad("plugin_function_hooks_surface_request", reason);
      } catch (error) {
        logError(toError(error));
      }
    }
    countObservedSurfaceRequest(status) {
      let key = `observed_below_floor_${status}`;
      if (this.countedRefusedSurfaceRequests.has(key)) return;
      this.countedRefusedSurfaceRequests.add(key);
      try {
        logFeatureSad("plugin_function_hooks_surface_request", key);
      } catch (error) {
        logError(toError(error));
      }
    }
    controlRequestEnded(requestId) {
      try {
        this.surfaceRefusals.settled(requestId);
      } catch (error) {
        logError(toError(error));
      }
    }
    answersSurfaceRefusal(response) {
      try {
        let answered = this.surfaceRefusals.answers(
          {
            requestId: Reflect.get(response, "request_id"),
            frame: getStreamFrame(response),
          },
          "loop",
        );
        if (!answered) this.countRefusedSurfaceRequest("refusal_unanswered");
        return answered;
      } catch (error) {
        logError(toError(error));
        return false;
      }
    }
    applySessionChannelVerdict(frame, verdict) {
      let lower = verdict.status.toLowerCase();
      switch (verdict.kind) {
        case "refuse_request":
          if (verdict.why === undefined)
            logFeatureBad(CONTROL_SUBTYPE_TO_CAPABILITY[verdict.subtype], `unverified_sender_${lower}`);
          else if (!this.countedSessionRefusals.has(`${verdict.subtype}:${verdict.why}`)) {
            this.countedSessionRefusals.add(`${verdict.subtype}:${verdict.why}`);
            logFeatureBad(CONTROL_SUBTYPE_TO_CAPABILITY[verdict.subtype], `request_refused_${verdict.why}`);
          }
          logForDebugging(
            `[remote-io] dropped a ${verdict.subtype} (attestation ${lower}, ${verdict.why ?? "below the floor"}) unanswered`,
          );
          return "dropped";
        case "refuse_surface_request": {
          let subtype = knownSubtypeOrUndefined(verdict.wireSubtype) ?? UI_OTHER;
          this.countRefusedSurfaceRequest(
            verdict.refusal === "unreadable_policy"
              ? verdict.refusal
              : `${verdict.refusal}_${lower}_${subtype}`,
          );
          if (
            !this.surfaceRefusals.answers(
              {
                requestId: verdict.requestId,
                frame: streamFrameKey(frame),
              },
              "filter",
            )
          ) {
            logForDebugging(
              `[remote-io] dropped a refused surface request (${verdict.refusal}, attestation ${lower}) unanswered: its id is none a refusal is written under, or this window's refusals are spent`,
            );
            return "dropped";
          }
          rewriteAsControlRequest(frame.payload, {
            requestId: verdict.requestId ?? "",
            subtype,
            eventId: frame.event_id,
          });
          logForDebugging(
            `[remote-io] a refused surface request (${verdict.refusal}, attestation ${lower}) goes on as its id and its subtype's name, to be answered as unserved`,
          );
          return "rebuilt";
        }
        case "drop_answer": {
          let why = verdict.why === undefined || verdict.why === "below_floor" ? undefined : verdict.why;
          if (why === undefined)
            logFeatureBad(CAPABILITY_NAMES[verdict.answers], `unverified_answer_dropped_${lower}`);
          else if (!this.countedSessionRefusals.has(`${verdict.answers}:${why}`)) {
            this.countedSessionRefusals.add(`${verdict.answers}:${why}`);
            logFeatureBad(CAPABILITY_NAMES[verdict.answers], `answer_dropped_${why}`);
          }
          logForDebugging(
            `[remote-io] dropped a reply to ${CAPABILITY_ANSWER_WORDING[verdict.answers][0]} request ${verdict.requestId} (attestation ${lower}, ${why ?? "below the floor"}); the request keeps waiting for ${why === undefined ? CAPABILITY_ANSWER_WORDING[verdict.answers][1] : "an answer it can take, or its deadline"}`,
          );
          return "dropped";
        }
        case "strip_forwarded_plugins":
          setRequestSettings(frame.payload, verdict.remainder);
          if (verdict.why === undefined)
            logFeatureSad("ccr_cloud_plugins_forward", `unverified_patch_stripped_${lower}`);
          else if (!this.countedSessionRefusals.has(`patch_stripped:${verdict.why}`)) {
            this.countedSessionRefusals.add(`patch_stripped:${verdict.why}`);
            logFeatureBad("ccr_cloud_plugins_forward", `patch_stripped_${verdict.why}`);
          }
          logForDebugging(
            `[remote-io] stripped forwarded plugin choices from an apply_flag_settings (attestation ${lower}, ${verdict.why ?? "below the floor"}); its other keys go on`,
          );
          return "passed";
        case "strip_unlisted_settings":
          setRequestSettings(frame.payload, verdict.remainder);
          if (!this.countedSessionRefusals.has(`settings_stripped:${verdict.why}`)) {
            this.countedSessionRefusals.add(`settings_stripped:${verdict.why}`);
            logFeatureBad("ccr_flag_settings_floor", `settings_stripped_${verdict.why}`, {
              removed_count: verdict.removed.length,
            });
          }
          if (verdict.forwardedPlugins && !this.countedSessionRefusals.has(`patch_stripped:${verdict.why}`)) {
            this.countedSessionRefusals.add(`patch_stripped:${verdict.why}`);
            logFeatureBad("ccr_cloud_plugins_forward", `patch_stripped_${verdict.why}`);
          }
          logForDebugging(
            `[remote-io] removed these settings from an apply_flag_settings because the session service ${verdict.why === "session_writers_unknown" ? "said nothing about who can write to this session" : "did not say that only the owner's account can write to this session"} (${verdict.why}; attestation ${lower}): ${listForRefusal(verdict.removed)}${verdict.forwardedPlugins ? ", and its forwarded plugin choices" : ""}. The rest of the request goes on`,
            {
              level: "warn",
            },
          );
          return "passed";
        case "admit_refusal":
          markResponseBelowFloor(frame.payload, verdict.requestId, verdict.result);
          logFeatureSad(
            "remote_tool_forward",
            verdict.why === undefined
              ? `unverified_refusal_admitted_${lower}`
              : `refusal_rebuilt_${verdict.why}`,
          );
          logForDebugging(
            `[remote-io] admitted a refusal of served-call request ${verdict.requestId} (attestation ${lower}, ${verdict.why ?? "below the floor"}) rebuilt from its code and marked as if from below the floor: the machine is asked what became of the call`,
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
    withdrawQueuedRequest(requestId) {
      return this.ccrClient.withdrawQueuedControlRequest(requestId) > 0;
    }
    refusedInternalEvents(uuid) {
      return this.ccrClient.refusedInternalEvents(uuid);
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
      let now = this.transport.serviceNow();
      return now === undefined ? undefined : Math.max(now, this.newestFrameCreatedAt ?? now);
    }
    sessionServiceNowAtMost() {
      let now = this.transport.serviceNowAtMost();
      return now === undefined ? undefined : Math.max(now, this.newestFrameCreatedAt ?? now);
    }
    async flushInternalEventsConfirmed() {
      let droppedInternalBatches = this.ccrClient.droppedInternalBatches;
      await this.ccrClient.flushInternalEvents();
      return (
        this.ccrClient.droppedInternalBatches === droppedInternalBatches &&
        !this.ccrClient.awaitsCompactSummary
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
    takeVouchedModelOrEffortRequest(requestId) {
      return (
        this.vouchedModelOrEffortRequestIds.delete(requestId) &&
        this.workerAttestationPolicy?.enforce === true
      );
    }
    setUploadAheadOfWaitingOnUser(ahead) {
      this.waitingOnUserReport.setUploadAhead(ahead);
    }
    idleLineWaitsFor(uuid) {
      this.idleLine?.uploadAsked(uuid);
    }
    setOnOwnerPresent(listener) {
      this.transport.setOnOwnerPresent(listener);
    }
    setOnPromptAnswered(onPromptAnswered) {
      this.onPromptAnswered = onPromptAnswered;
    }
    rereadWorkerState() {
      return this.ccrClient.readWorkerState();
    }
    sendOwedClientRowsAgain(limit) {
      return catchUpClientRows(this.ccrClient, limit);
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
    hasInternalEventRoom(bytes) {
      return this.ccrClient.hasInternalEventRoom(bytes);
    }
    repeatAfterCompaction(rowsRepeatedAfterCompaction) {
      this.ccrClient.rowsRepeatedAfterCompaction = rowsRepeatedAfterCompaction;
    }
    readInternalEvents(uuid, storageV5) {
      return this.ccrClient.readInternalEvents(undefined, uuid, storageV5);
    }
    readAgentMetadataEvents(agentId, storageV5) {
      return this.ccrClient.readAgentMetadataEvents(agentId, storageV5);
    }
    teeActivity(line) {
      if (this.activityFd !== undefined) {
        this.activityFd.write(line);
        return;
      }
      writeToStdout(line);
    }
    writeInbound(text, lane) {
      if (this.inputStream.destroyed || this.inputStream.writableEnded) {
        if (!this.inboundLanesDroppedAfterClose.has(lane)) {
          this.inboundLanesDroppedAfterClose.add(lane);
          logForDiagnosticsNoPII("info", "cli_remote_io_inbound_dropped_after_close", {
            lane,
          });
        }
        return;
      }
      this.noteInputWritten(text);
      this.inputStream.write(text);
    }
    writeActivityLine(line) {
      this.teeActivity(line);
    }
    takesHostPick() {
      return false;
    }
    acceptsInboundEnvUpdates() {
      switch (this.hosting.kind) {
        case "owns-process":
          return this.hosting.trustsInboundEnvUpdates;
        case "hosted":
          return false;
      }
    }
    exitOnFatalInput(message) {
      switch (this.hosting.kind) {
        case "owns-process":
          return super.exitOnFatalInput(message);
        case "hosted":
          logForDebugging(`[remote-io] ${message}`, {
            level: "error",
          });
          this.stopFor({
            kind: "unreadable-input",
          });
          return Promise.reject(new UnreadableInputError());
      }
    }
    recordUserDrivenInbound(frame) {
      switch ((super.recordUserDrivenInbound(frame), frame.type)) {
        case "user":
          if (isHumanInboundMessage(frame, "remote-worker", isProjectsHumanOriginEnabled()))
            this.idleTracker.noteActivity();
          return;
        case "control_response":
          if (frame.response.subtype === "success") this.idleTracker.noteActivity();
          return;
        case "control_request":
          if (isCoalescableControlRequest(frame)) this.idleTracker.noteActivity();
          return;
        case "bash_command":
          this.idleTracker.noteActivity();
          return;
        default:
          return;
      }
    }
    recordAnsweredPrompt(response, subtype) {
      if (
        response.response.subtype === "success" &&
        (subtype === "can_use_tool" || subtype === "request_user_dialog")
      )
        this.onPromptAnswered?.();
    }
    answerOwnWithdrawnAsk(requestId, toolUseID) {
      this.ownDeniesAwaitingCancel.add(requestId);
      this.outbound.enqueue({
        type: "control_response",
        response: {
          subtype: "success",
          request_id: requestId,
          response: {
            behavior: "deny",
            message: PERMISSION_WITHDRAWN_MESSAGE,
            toolUseID,
          },
        },
      });
    }
    writePlainDeltaNow(requestId) {
      if (this.isBridge || !this.ccrClient.bufferLoneDelta(requestId)) return false;
      this.trackWrite(requestId);
      return true;
    }
    async write(message) {
      if (message.type === "transcript_mirror") return;
      if (message.type === "control_response") this.controlRequestEnded(message.response.request_id);
      let held = this.heldDueBefore(message);
      if (held.length > 0) await this.writeHeld(held);
      let frame = this.trackWrite(message);
      this.taskHoldClock.note(frame, Date.now());
      if (this.teeStdout && !this.isBridge) {
        if (frame.type === "result") {
          this.waitingOnUserReport.resultGoesNext();
          this.idleLine?.resultGoesNext();
        }
        let projected = projectSdkEventForStream(frame);
        if (projected !== undefined)
          try {
            this.teeActivity(
              ndjsonStringify(projected) +
                `
`,
            );
          } catch {}
        if (frame.type === "system" && frame.subtype === "init") this.endAliveBeforeInit();
      }
      let heldDeny =
        frame.type === "control_cancel_request" ? this.ownDenyHeldForCancel.get(frame.request_id) : undefined;
      if (frame.type === "control_response" && this.ownDeniesAwaitingCancel.delete(frame.response.request_id))
        this.ownDenyHeldForCancel.set(frame.response.request_id, frame);
      else if (heldDeny !== undefined && frame.type === "control_cancel_request") {
        this.ownDenyHeldForCancel.delete(frame.request_id);
        await this.ccrClient.writeEvents([heldDeny, frame], {
          together: true,
        });
      } else await this.ccrClient.writeEvent(frame);
      if (this.isBridge) {
        if (frame.type === "control_request" || (this.isDebug && !isLiveOnlyResponse(frame)))
          writeToStdout(
            ndjsonStringify(frame) +
              `
`,
          );
      }
      let trailing = this.heldDueAfter(frame);
      if (trailing.length > 0) await this.writeHeld(trailing);
    }
    trackFirstFrameUpload(atMs) {
      return this.ccrClient.trackFirstFrameUpload(atMs);
    }
    trackFirstTextFrameUpload(atMs) {
      return this.ccrClient.trackFirstTextFrameUpload(atMs);
    }
    trackFirstBlockFrameUpload(atMs) {
      return this.ccrClient.trackFirstBlockFrameUpload(atMs);
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
    stopFor(cause) {
      if (this.closeCause !== undefined || this.endedByHost) return;
      this.closeCause = cause;
      if (cause.kind !== "unreadable-input") this.permanentCloseCode = cause.closeCode;
      switch (this.hosting.kind) {
        case "owns-process":
          return;
        case "hosted":
          this.ccrClient.close({
            goodbye: false,
          });
          this.closeConnections();
          try {
            this.hosting.onFatal(cause);
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
  };
});
//@ chunk-1kk50rk6.js:111651-111692 placement
function runSafely(fn) {
  try {
    fn();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-1kk50rk6.js:111692-111790 placement
function authRefreshForOwnerKind(hosting) {
  switch (hosting.kind) {
    case "owns-process":
      return hosting.adoptRefreshedAuth;
    case "hosted":
      return;
  }
}
//@ chunk-1kk50rk6.js:111790-111950 placement
function classifyStreamCloseCode(code) {
  let mapped = WORKER_CONFLICT_CLOSE_CODES[code];
  switch (mapped) {
    case 4090:
      return {
        kind: "lease-superseded",
        cause: code,
        closeCode: mapped,
      };
    case 4094:
      return {
        kind: "auth-rejected",
        cause: code,
        closeCode: mapped,
      };
  }
}
//@ chunk-1kk50rk6.js:111950-112012 placement
function isCcrStreamEventFlushMsGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_ccr_stream_event_flush_ms",
    DEFAULT_STREAM_EVENT_FLUSH_INTERVAL_MS,
  );
}
//@ chunk-1kk50rk6.js:112012-112072 placement
function isCcrStreamFirstFlushMsGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_stream_first_flush_ms", 0);
}
//@ chunk-1kk50rk6.js:112072-112124 layout
function getVirtualParasolHeldBunchFlushMs() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_virtual_parasol", DEFAULT_HELD_BUNCH_FLUSH_MS);
}
//@ chunk-1kk50rk6.js:112124-112174 placement
function isIdempotentPineGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_idempotent_pine", 0);
}
//@ chunk-1kk50rk6.js:112174-112235 placement
function isCcrNoSubscriberFlushMsGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_no_subscriber_flush_ms", 0);
}
//@ chunk-1kk50rk6.js:112235-112497 placement
function getHeartbeatFeatureFlags() {
  return {
    advertiseHeartbeatProbeSupport: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_idle_heartbeat", false),
    beatOnStaleReconnect: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_reconnect_beat", false),
    beatOnReactivation: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_reactivation_beat", false),
    skipRedundantHeartbeats: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_skip_redundant_heartbeat", false),
  };
}
//@ chunk-1kk50rk6.js:112497-112545 layout
function shouldRetireModelApiPoolAfterServerError() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_nifty_harbor", true);
}
//@ chunk-1kk50rk6.js:112545-112613 placement
function isCcrDropUnwatchedStreamEventsGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_drop_unwatched_stream_events", false);
}
//@ chunk-1kk50rk6.js:112613-112786 layout
function startFolderFrameLine() {
  try {
    if (launchedCwd === null) return;
    let { dev, ino } = statSync(launchedCwd, {
      bigint: true,
    });
    return `${ndjsonStringify({
      type: "system",
      subtype: "start_folder",
      dev: String(dev),
      ino: String(ino),
    })}
`;
  } catch {
    return;
  }
}
//@ chunk-1kk50rk6.js:112786-114201 placement
function projectSdkEventForStream(m) {
  let message = m;
  let subtype = message.subtype;
  if (m.type === "result" || (m.type === "system" && subtype === "init"))
    return m.type === "result"
      ? {
          ...m,
          result: undefined,
          permission_denials: undefined,
          structured_output: undefined,
          deferred_tool_use: undefined,
          errors: undefined,
          subagent_stats: undefined,
        }
      : m;
  if (m.type === "system" && subtype === "task_started")
    return {
      type: "system",
      subtype,
      task_id: message.task_id,
      task_type: message.task_type,
      owned_by_subagent: message.owned_by_subagent,
    };
  if (m.type === "system" && subtype === "task_updated") {
    let patch = message.patch;
    return {
      type: "system",
      subtype,
      task_id: message.task_id,
      patch: {
        status: patch?.status,
        is_backgrounded: patch?.is_backgrounded,
      },
    };
  }
  if (m.type === "system" && subtype === "task_notification")
    return {
      type: "system",
      subtype,
      task_id: message.task_id,
      status: message.status,
    };
  if (m.type === "system" && subtype === "background_tasks_changed") {
    let tasks = message.tasks;
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
  if (m.type === "system" && subtype === "hook_response")
    return {
      type: "system",
      subtype,
      hook_event: message.hook_event,
      outcome: message.outcome,
    };
  if (m.type === "user")
    return {
      type: m.type,
      subtype,
      ...subagentOriginFields(message),
    };
  if (m.type === "assistant") {
    let content = message.message?.content;
    if (Array.isArray(content)) {
      let wakeupMeta = isCommandMetadata(content, SCHEDULE_WAKEUP_TOOL_NAME);
      let cronUseBlocks = isCommandMetadata(content, CRON_CREATE_TOOL_NAME)
        ? [
            {
              type: "tool_use",
              name: CRON_CREATE_TOOL_NAME,
            },
          ]
        : [];
      if (wakeupMeta) {
        let input = wakeupMeta.input;
        return {
          type: "assistant",
          subtype,
          ...subagentOriginFields(message),
          message: {
            content: [
              {
                type: "tool_use",
                name: SCHEDULE_WAKEUP_TOOL_NAME,
                input: {
                  delaySeconds: input?.delaySeconds,
                },
              },
              ...cronUseBlocks,
            ],
          },
        };
      }
      if (cronUseBlocks.length > 0)
        return {
          type: "assistant",
          subtype,
          ...subagentOriginFields(message),
          message: {
            content: cronUseBlocks,
          },
        };
    }
    return {
      type: m.type,
      subtype,
      ...subagentOriginFields(message),
    };
  }
  return;
}
//@ chunk-1kk50rk6.js:114201-114272 placement
function subagentOriginFields(event) {
  return event.parent_tool_use_id != null
    ? {
        from_subagent: true,
      }
    : {};
}
//@ chunk-1kk50rk6.js:114272-114411 placement
function collectControlRequestIds(events) {
  return events.flatMap((event) =>
    event.payload.type === "control_request" && typeof event.payload.request_id === "string"
      ? [event.payload.request_id]
      : [],
  );
}
//@ chunk-1kk50rk6.js:114411-114537 placement
function hasResumeFlag(argv) {
  for (let arg of argv) {
    if (arg === "--") return false;
    if (arg === "--resume" || arg === "-r" || arg.startsWith("--resume=")) return true;
  }
  return false;
}
//@ chunk-1kk50rk6.js:114537-114743 placement
async function readInternalEventsFromTip(readTip, readSubagent, storageV5) {
  let sessionId = remoteSessionUrlId();
  let tail = sessionId ? await readTranscriptTailForTip(sessionId, storageV5) : undefined;
  let tip = sessionId ? await getValidatedCCRTip(sessionId, tail, storageV5) : undefined;
  let [events, subagentEvents] = await Promise.all([
    readTip(tip?.eventId),
    tail === null || tip?.eventId !== undefined || (isWondrousIslandGateOn() && storageV5 === undefined)
      ? undefined
      : readSubagent(),
  ]);
  return [events, subagentEvents, tip];
}
//@ chunk-1kk50rk6.js:114743-115007 placement
function startEarlyRemoteWork(url, storageV5, { hydrate, connect }) {
  if (Object.keys(getSessionIngressAuthHeaders()).length === 0)
    return {
      hydrateReads: undefined,
      link: undefined,
    };
  let url_2 = httpUrlFromWs(new Ls(url));
  addStartupContext({
    ...(hydrate && {
      early_hydrate_prefetch: 1,
    }),
    ...(connect && {
      early_remote_connect: 1,
    }),
  });
  return {
    hydrateReads: hydrate ? loadCcrInternalEvents(url_2, storageV5) : undefined,
    link: connect ? remoteIOWorkerEnv(url_2, storageV5) : undefined,
  };
}
//@ chunk-1kk50rk6.js:115007-115228 placement
function loadCcrInternalEvents(url, storageV5) {
  return (async () => {
    let conflict = false;
    let options = {
      ...convertWsUrlToPostUrl(url, getSessionIngressAuthHeaders),
      onConflict: () => {
        conflict = true;
      },
    };
    let internalEventsFromTip = await readInternalEventsFromTip(
      (eventId) => CCRClient.readInternalEventsFrom(options, eventId),
      () => CCRClient.readSubagentInternalEventsFrom(options),
      storageV5,
    );
    return conflict ? undefined : internalEventsFromTip;
  })().catch((error) => {
    logError(error);
    return;
  });
}
//@ chunk-1kk50rk6.js:115228-115276 placement
function turnHandoffRegistrationNow(handoff, workerEpoch, carriedWrites) {
  return turnHandoffRegistration(
    handoff,
    workerEpoch,
    carriedWrites,
    isClaudeAiChatOrigin(),
    isCarriedWritesEnabled(),
  );
}
//@ chunk-1kk50rk6.js:115276-115387 placement
function turnHandoffRegistrationToAnnounce(handoff, workerEpoch, carriedWrites) {
  if (handoff.admitted && isClaudeAiChatOrigin()) logHandoffFlagAdvert();
  let registration = turnHandoffRegistrationNow(handoff, workerEpoch, carriedWrites);
  if (registration?.turn_handoff?.carried_writes) markSaidCarriedWrites();
  return registration;
}
//@ chunk-1kk50rk6.js:115387-116177 placement
function remoteIOWorkerEnv(url, storageV5) {
  let inputs = cliRemoteWorkerInputs();
  let admission = turnHandoffAdmission({
    sdkUrl: true,
    remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
    environmentKind: env.CLAUDE_CODE_ENVIRONMENT_KIND,
    disabled: env.CLAUDE_CODE_DISABLE_TURN_HANDOFF,
  });
  let carriedWrites = shouldCarryWrites({
    admission,
    relayConfigured:
      teleportRelayEnvModule !== null && teleportRelayEnvModule.getTeleportRelayEnvConfig() !== null,
    persistsTranscript: !isTranscriptPersistenceDisabled(),
    sharedBackend: isDiagLogging(),
  });
  let remoteWorker = startRemoteWorker({
    url,
    getAuthHeaders: getSessionIngressAuthHeaders,
    sessionId: getSessionId(),
    environmentKind: inputs.environmentKind,
    storageV5,
    hosting: inputs.hosting,
    onEpochMismatch: undefined,
    reportParkAtInit: inputs.reportParkAtInit,
    initExternalMetadata: turnHandoffRegistrationNow(admission, inputs.workerEpoch, carriedWrites),
    initialWorkerStatus: undefined,
    deferDelivery: true,
  });
  let initialized = remoteWorker.ccrClient.initialize(inputs.workerEpoch);
  initialized.catch(() => {});
  if (inputs.environmentKind !== "bridge") remoteWorker.transport.setWorkerAttestationPolicySink(() => {});
  remoteWorker.transport.connect();
  return {
    ...remoteWorker,
    initialized,
    inputs,
    usesRelayMarker: carriedWrites,
  };
}
//@ chunk-1kk50rk6.js:116177-116466 placement
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
//@ chunk-1kk50rk6.js:116466-119951 placement
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
  let onDiagnostic =
    environmentKind === "bridge"
      ? undefined
      : hosting.kind === "hosted"
        ? (message, level, code) => {
            hosting.onDiagnostic(message.replace(/\bexiting$/, "stopping"), level, code);
          }
        : (message) => {
            process.stderr.write(`SDKStartup: ${message}
`);
          };
  let headers = {
    "anthropic-client-platform": getClientPlatform(),
    ...getAuthHeaders(),
  };
  let envClaudeCodeEnvironmentRunnerVersion = process.env.CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION;
  if (envClaudeCodeEnvironmentRunnerVersion)
    headers["x-environment-runner-version"] = envClaudeCodeEnvironmentRunnerVersion;
  let refreshHeaders = () => {
    let headers = {
      ...getAuthHeaders(),
    };
    let envClaudeCodeEnvironmentRunnerVersion = process.env.CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION;
    if (envClaudeCodeEnvironmentRunnerVersion)
      headers["x-environment-runner-version"] = envClaudeCodeEnvironmentRunnerVersion;
    return headers;
  };
  let streamOpener =
    env.CLAUDE_CODE_CCR_WORKER_SOCKET?.split(",")
      .map((part) => part.trim())
      .includes(ATTESTATION_FLOOR_VERSION) &&
    alwaysTrue() &&
    hosting.kind === "owns-process" &&
    environmentKind === null &&
    isRemoteManagedEnvironment()
      ? new WorkerSocket(openWorkerWebSocket, (body) => wouldGzipForHost(body, storageV5, "ccr_worker"))
      : undefined;
  let modelApiPoolRetires =
    hosting.kind === "owns-process" && environmentKind === "byoc"
      ? shouldRetireModelApiPoolAfterServerError
      : undefined;
  if (modelApiPoolRetires) {
    setModelApiPoolRetiresAfterServerError(modelApiPoolRetires);
    makeHttpsAgentCloseAfterServerError();
    configureGlobalAgents();
  }
  let seenContentTypes = new Set();
  let transport = createWorkerEventsTransport(url, headers, {
    sessionId,
    leavesPoolAfterServerError: modelApiPoolRetires,
    refreshHeaders,
    getAuthHeaders,
    deferDelivery,
    streamOpener,
    mostMembersInAFrame: hosting.kind === "hosted" ? hosting.mostMembersInAFrame : undefined,
    lighterFrame: redactSdkMcpManifests,
    onProcessSlept:
      hosting.kind === "owns-process"
        ? (afterSettle) =>
            onProcessSlept((next) => {
              if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_tranquil_cocoa", false)) afterSettle(next);
            })
        : undefined,
    connectTimeoutMs: () => getPollIntervalConfig().sse_connect_timeout_ms,
    sseKeepaliveMaxIntervalSeconds: () =>
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_sse_keepalive_max_interval_s", 0),
    longPollFallback: () =>
      hosting.kind === "owns-process" &&
      !isRemoteManagedEnvironment() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_sse_long_poll_fallback", true),
    requireStreamEvidence: isRemoteEnvPlaceholder() || false,
    onUnexpectedContentType: ({ status, contentType, accepted }) => {
      try {
        let key = `${contentType}:${accepted}`;
        if (seenContentTypes.has(key)) return;
        seenContentTypes.add(key);
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
  if (onDiagnostic) transport.setOnDiagnostic?.(onDiagnostic);
  let proxyRefusal = undefined;
  let unusedRefusal = undefined;
  let idleTracker = createIdleTracker();
  let client = new CCRClient(transport, url, {
    onDiagnostic,
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
    leavesPoolAfterServerError: modelApiPoolRetires,
    streamEventFlushIntervalMs: isCcrStreamEventFlushMsGateOn(),
    streamEventFirstFlushMs: isCcrStreamFirstFlushMsGateOn(),
    streamEventWindowRunsFromLastFlush: mainReplyHoldMs() > 0,
    heldBunchFlushMs: getVirtualParasolHeldBunchFlushMs(),
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
    workerSocket: streamOpener,
    ...((environmentKind === null ||
      environmentKind === "anthropic_cloud" ||
      isRemoteToolForwardingSwitchOn()) && {
      maxEventPostTimeoutMs: REMOTE_IO_TIMEOUT_MS,
    }),
    ...(hosting.kind === "owns-process" && {
      guardsClientRows: getPatientLedgerReader(),
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
      client.registerShutdownCleanup();
      registerCleanup(async () => transport.close());
      break;
    case "hosted":
      break;
  }
  return {
    transport,
    ccrClient: client,
    idleTracker,
    onDiagnostic,
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
  startEarlyRemoteWork,
};

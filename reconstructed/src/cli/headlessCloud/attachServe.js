/**
 * cli/headlessCloud/attachServe.ts
 *
 * 2.1.316 新增：本机为云会话提供工具（attach serve）：设备链接重试、拒绝/关闭原因文案、恢复服务。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fe6rs39h.js (34), chunk-q8cqcff6.js (18)
 * attribution: placement 52
 */
import { isViolinWoodEnabled } from "../../services/analytics/violinGates.js";
import {
  checkGate_CACHED_OR_BLOCKING,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { ATTACH_SERVE_FLAG } from "./deviceHooks.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isFsInaccessible, TeleportOperationError } from "../../utils/errors.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { logEvent } from "../../services/analytics/index.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { decodeTaggedUuid } from "../../services/mcp/serverIdentity.js";
import { getStoredOauthAccountInfo } from "../../utils/auth.js";
import {
  localBindIdentity,
  canonicalLinkCapabilities,
  signSessionLateLink,
  signToolHostLink,
  signToolHostResume,
} from "../../bridge/deviceBinder.js";
import { logError } from "../../utils/log.js";
import { sleep, backoffDelayMs } from "../../utils/sleep.js";
import {
  forgetRegisteredRow,
  registerDeviceCached,
  deviceDisplayName,
  registeredRowPk,
  DeviceLimitReachedError,
  DeviceRegistrationUnavailableError,
  DeviceKeyRefusedError,
} from "../../bridge/deviceRegistry.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { deviceBindingRefusalText } from "../../bridge/deviceBinding.js";
import { getOriginalCwd, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { DoctorLazy } from "../handlers/util.js";
import { u, literal, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { parseToolOutputSchema } from "../../services/mcp/schemaParse.js";
import { sessionStillBoundTo } from "./attachDeviceBinding.js";
import { isSameDevice, isConnectedAndResumed, isServingConnected } from "./hostPermissions.js";
import {
  eagerParseCliFlag,
  eagerFindCliArg,
  detectNonInteractiveLaunch,
  eagerHasCliFlag,
} from "../../utils/cliArgs.js";
import { REPO_DIR_SETTING_SOURCES } from "../../utils/settings/constants.js";
import { withHostOwnedEnvGuard } from "../../utils/plugins/securityDefaultPlugin.js";
import { env } from "../../utils/env.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { builtInOauthConfig, getOauthConfig } from "../../constants/oauth.js";
import { isActualFirstPartyAnthropicBaseUrl } from "../../utils/model/providers.js";
import { isLoopbackHost } from "../../utils/localhost.js";
import { EXIT_CONFIG_ERROR } from "../../utils/exitCodes.js";
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import { commandSyncNameState } from "../../utils/settings/commandSyncNames.js";

//@ chunk-fe6rs39h.js:18087-18160 placement
async function isAttachServeEnabled() {
  try {
    return (await isViolinWoodEnabled()) && (await checkGate_CACHED_OR_BLOCKING(ATTACH_SERVE_FLAG));
  } catch {
    return false;
  }
}
//@ chunk-fe6rs39h.js:18160-18384 placement
function shouldServeOnlyNotArmed({ serveOnly, lookup, sessionBefore, sweep }) {
  return serveOnly &&
    lookup.handle === undefined &&
    lookup.why === "not_armed_here" &&
    lookup.noRecordOnThisMachine === true &&
    sessionBefore !== undefined &&
    sessionBefore.boundDeviceId === undefined &&
    isBeforeRetentionCutoff(sessionBefore.createdAt, sweep)
    ? "separate_copy"
    : undefined;
}
//@ chunk-fe6rs39h.js:18384-18553 placement
function isBeforeRetentionCutoff(createdAt, sweep) {
  switch (sweep.kind) {
    case "never":
      return true;
    case "unknown":
      return false;
    case "before": {
      let timestamp = Date.parse(createdAt);
      return Number.isFinite(timestamp) && timestamp - 86400000 > sweep.before.getTime();
    }
  }
}
//@ chunk-fe6rs39h.js:18553-18669 placement
function notArmedHereLookup(sessionRecordElsewhere) {
  return {
    handle: undefined,
    why: "not_armed_here",
    ...(sessionRecordElsewhere.hasOwnSessionRecord !== true && {
      noRecordOnThisMachine: true,
    }),
  };
}
//@ chunk-fe6rs39h.js:18669-18866 placement
var LATE_BIND_REFUSED = "late_bind_refused";
var TOOL_HOST_GRANT_REFUSED = "tool_host_grant_refused";
var DEVICE_NOT_FOUND = "device_not_found";
var BIND_ATTESTATION_STALE = "bind_attestation_stale";
var SESSION_ALREADY_BOUND_ELSEWHERE = "session_already_bound_elsewhere";
var SESSION_WORKER_BUSY = "session_worker_busy";
var TOOL_HOST_PROOF_INVALID = "tool_host_proof_invalid";
//@ chunk-fe6rs39h.js:18866-22034 placement
/**
 * 本机为云会话提供工具时，服务端拒绝码 → 面向用户的说明文字表。
 */
var ATTACH_REFUSAL_MESSAGES = {
  tool_host_no_live_grant:
    "that session has no live request to use this computer \u2014 it was never made, it expired, it was disconnected, or its feature is off for your organization",
  tool_host_rebind: "the session is already linked to a different computer",
  remote_control_disabled: "Remote Control is turned off for your organization",
  not_cowork_remote:
    "that session cannot use a computer (it is not a cloud Claude Code session on Anthropic's cloud, or the feature is off for your organization)",
  trigger_session: "a scheduled (routine) session cannot use a computer",
  terminal: "the session has ended",
  grouped: "a session inside a project cannot be linked to a computer",
  project_session: "a project session cannot be connected to a computer",
  project_session_not_own_cloud_environment:
    "a project session can use a computer only when its project runs on one of the project owner's own cloud environments",
  project_session_trusted_device_org:
    "a project session cannot use a computer in an organization that requires trusted devices",
  routine_pinned:
    "that session owns a scheduled routine or a pending reminder, and such a session cannot be linked to a computer",
  rc_child: "that kind of session has no cloud worker to link",
  monorepo_session: "that session has a repository checked out that cannot be used from a personal computer",
  trusted_device_required:
    "your organization requires a trusted device and that session was not started from one \u2014 start a new session",
  session_unattended: "a scheduled (routine) session cannot use a computer",
  tool_host_proof_needs_request:
    "this version of the Claude app can't connect to this session again. Update the Claude app on this computer, then ask the session to use this computer again. If there's no update yet, start a new session",
  tool_host_proof_invalid:
    "the service couldn't confirm that this request came from this computer. Ask the session to use this computer again",
  tool_host_proof_missing:
    "the request to connect this computer arrived incomplete. Ask the session to use this computer again",
  machine_credential:
    "a cloud session can't connect itself to a computer. Only the Claude app on your own computer, signed in to your account, can do that",
  config_denied: "that session was created with settings that don't allow connecting it to a computer",
  session_config_unreadable:
    "that session's saved settings couldn't be read, so it can't be connected to a computer. Start a new session",
  not_in_plan: "your organization's plan doesn't include connecting a computer to that kind of session",
  tool_host_stream_close_off:
    "your organization requires trusted devices, and using a computer from a cloud session isn't available yet for organizations that do. Try again later",
  cowork_session:
    "that's a Cowork task. Cowork connects a task to your computer in its own way, so it can't use a folder on this computer",
  agent_owned_session:
    "that session belongs to an agent rather than to a person's account, and such a session can't use a computer",
  child_session:
    "that session isn't running in the cloud, and only a cloud session can use a folder on this computer",
  session_kind_refused: "that kind of session can't use a folder on a computer",
};
//@ chunk-fe6rs39h.js:22034-22076 placement
function isKnownAttachRefusal(e) {
  return Object.hasOwn(ATTACH_REFUSAL_MESSAGES, e);
}
//@ chunk-fe6rs39h.js:22076-22153 placement
var ATTACH_LINK_RETRY_DELAYS_MS = [2000, 4000, 8000, 12000, 15000, 15000, 15000];
var ATTACH_LINK_TOTAL_TIMEOUT_MS = 90000;
var ATTACH_LINK_TRANSIENT_RETRY_MS = [2000, 4000, 8000];
//@ chunk-fe6rs39h.js:22153-22264 placement
function postTeleportOrg(e, n, credentials) {
  return apiClient.post(e, n, {
    auth: "teleport-org",
    timeout: 15000,
    validateStatus: () => true,
    credentials,
  });
}
//@ chunk-fe6rs39h.js:22264-23069 placement
/**
 * 把本机设备链接到指定云会话（attach-serve）：签名链接证明、调用 /v1/code/sessions/{id}/device，记录遥测。
 */
async function linkAttachServe({
  sessionId,
  orgUuid,
  credentials,
  request,
  localIdentity,
  prepared,
  handsKeyToLaterReaders = false,
  seams = {},
}) {
  let R = {
    form: undefined,
    retriedAsV1: false,
  };
  let k = await linkDeviceWithRetries({
    sessionId,
    orgUuid,
    credentials,
    request,
    localIdentity,
    prepared,
    handsKeyToLaterReaders,
    seams,
    proofSent: R,
  }).catch((error) => {
    logForDebugging(`[attach-serve] link failed unexpectedly: ${errorMessage(error)}`);
    return attachServeRefusal(
      {
        kind: "unavailable",
        status: undefined,
      },
      sessionId,
    );
  });
  let I = R.form !== undefined && {
    proof: fromEnum(R.form),
    proof_v1_retry: R.retriedAsV1,
  };
  if (k.ok) {
    logEvent("tengu_attach_serve_link", {
      outcome: lit("linked"),
      ...I,
    });
    logFeatureOk("attach_serve_link");
  } else {
    let O =
      k.refusal.kind === "refused"
        ? k.refusal.subReason
        : "reason" in k.refusal
          ? k.refusal.reason
          : undefined;
    logEvent("tengu_attach_serve_link", {
      outcome: fromEnum(k.refusal.kind),
      ...(O !== undefined && {
        detail: fromEnum(O),
      }),
      ...I,
    });
    logFeatureBad("attach_serve_link", k.refusal.kind);
  }
  return k;
}
//@ chunk-fe6rs39h.js:23069-23665 placement
/**
 * 本地预检能否为该云会话服务：会话 id 合法、本机服务开关、设备绑定器就绪。
 */
async function checkAttachServeLocally({ sessionId, credentials, resuming = false, seams = {} }) {
  try {
    let h = decodeTaggedUuid(sessionId);
    if (h === undefined)
      return attachServeRefusal(
        {
          kind: "bad_session_id",
        },
        sessionId,
      );
    let y = await (seams.servingOff ?? servingOffReason)(resuming);
    if (y !== undefined)
      return attachServeRefusal(
        {
          kind: "serving_off",
          reason: y,
        },
        sessionId,
      );
    let S;
    try {
      S = getStoredOauthAccountInfo()?.accountUuid;
    } catch {
      S = undefined;
    }
    let w = await (seams.identity ?? localBindIdentity)({
      accountUuid: S,
      credentials,
    });
    if (!w.ok)
      return attachServeRefusal(
        {
          kind: "local",
          reason: w.error,
        },
        sessionId,
      );
    return {
      ok: true,
      sessionUuid: h,
      accountUuid: w.value.accountUuid,
    };
  } catch (error) {
    if (isFsInaccessible(error))
      logForDebugging(`[attach-serve] local check could not examine this computer: ${errorMessage(error)}`);
    else logError(error);
    return attachServeRefusal(
      {
        kind: "unavailable",
        status: undefined,
      },
      sessionId,
    );
  }
}
//@ chunk-fe6rs39h.js:23665-23999 placement
async function registerAndLinkDevice({
  sessionId,
  credentials,
  localIdentity,
  handsKeyToLaterReaders = false,
  seams = {},
}) {
  let y =
    localIdentity ??
    (await checkAttachServeLocally({
      sessionId,
      credentials,
      seams,
    }));
  if (!y.ok) return y;
  let S = await registerDeviceForAttach({
    accountUuid: y.accountUuid,
    credentials,
    readBack: !handsKeyToLaterReaders,
    seams,
  });
  return S.ok
    ? {
        ok: true,
        local: y,
        registered: S,
      }
    : attachServeRefusal(
        {
          kind: "register",
          reason: S.reason,
        },
        sessionId,
      );
}
//@ chunk-fe6rs39h.js:23999-26544 placement
async function linkDeviceWithRetries({
  sessionId,
  orgUuid,
  credentials,
  request,
  localIdentity,
  prepared,
  handsKeyToLaterReaders,
  seams,
  proofSent,
}) {
  let k = await (prepared ??
    registerAndLinkDevice({
      sessionId,
      credentials,
      localIdentity,
      handsKeyToLaterReaders,
      seams,
    }));
  if (!k.ok) return k;
  let { sessionUuid, accountUuid } = k.local;
  let registered = k.registered;
  let busyRetryDelaysMs = seams.busyRetryDelaysMs ?? ATTACH_LINK_RETRY_DELAYS_MS;
  let transientRetryDelaysMs = seams.transientRetryDelaysMs ?? ATTACH_LINK_TRANSIENT_RETRY_MS;
  let sleep_2 = seams.sleep ?? sleep;
  let j = Date.now() + ATTACH_LINK_TOTAL_TIMEOUT_MS;
  let Y = 0;
  let D = 0;
  let W = false;
  let te;
  if (request !== undefined)
    try {
      let X = await (seams.linkCapabilities ?? noopAsync)();
      te = X === undefined ? undefined : canonicalLinkCapabilities(X);
    } catch (error) {
      logForDebugging(
        `[attach-serve] could not read what this computer declares on a link; declaring nothing: ${errorMessage(error)}`,
      );
    }
  for (;;) {
    let X;
    try {
      let x = {
        orgUuid,
        accountUuid,
        sessionUuid,
        deviceUUID: registered.deviceUUID,
        key: registered.key,
      };
      X =
        request === undefined
          ? await (seams.sign ?? signSessionLateLink)(x)
          : await (seams.signRequest ?? signToolHostLink)({
              ...x,
              request,
              ...(te !== undefined && {
                capabilities: te,
              }),
            });
      proofSent.form = request === undefined ? "session_only" : te === undefined ? "v1" : "v2";
    } catch (error) {
      logForDebugging(`[attach-serve] signing the link proof failed: ${errorMessage(error)}`);
      return attachServeRefusal(
        {
          kind: "register",
          reason: "sign",
        },
        sessionId,
      );
    }
    let ee = await Promise.resolve()
      .then(() =>
        (seams.post ?? postTeleportOrg)(
          `/v1/code/sessions/${sessionId}/device`,
          {
            target_device_id: X.deviceUUID,
            bind_attestation: {
              kid: X.kid,
              signature: X.signature,
            },
            bind_attestation_issued_at: X.issuedAt,
            ...(te !== undefined && {
              capabilities: te,
            }),
          },
          credentials,
        ),
      )
      .then(
        (result) => ({
          result,
        }),
        (error) => ({
          error,
        }),
      );
    let se =
      "error" in ee
        ? {
            next: "transient",
            status: undefined,
          }
        : classifyAttachLinkResponse(ee.result, registered.deviceUUID);
    switch (se.next) {
      case "linked":
        return {
          ok: true,
          deviceId: registered.deviceUUID,
          toolHostStatus: se.toolHostStatus,
          ...(handsKeyToLaterReaders && {
            heldKey: {
              accountUuid,
              rowPk: registered.deviceUUID.toLowerCase(),
              key: registered.key,
            },
          }),
        };
      case "final":
        return attachServeRefusal(se.refusal, sessionId);
      case "proof_invalid": {
        if (te === undefined)
          return attachServeRefusal(
            {
              kind: "refused",
              subReason: TOOL_HOST_PROOF_INVALID,
            },
            sessionId,
          );
        te = undefined;
        proofSent.retriedAsV1 = true;
        logForDebugging(
          "[attach-serve] the service did not take the v2 link proof; sending the v1 proof without the capability list",
        );
        continue;
      }
      case "busy": {
        let x = busyRetryDelaysMs[Y];
        if (x === undefined || Date.now() + x > j)
          return attachServeRefusal(
            {
              kind: "busy",
            },
            sessionId,
          );
        Y += 1;
        logForDebugging(
          `[attach-serve] session busy; retrying the link in ${x} ms (${Y}/${busyRetryDelaysMs.length})`,
        );
        await sleep_2(x);
        continue;
      }
      case "transient": {
        let x = transientRetryDelaysMs[D];
        if (x === undefined)
          return attachServeRefusal(
            {
              kind: "unavailable",
              status: se.status,
            },
            sessionId,
          );
        D += 1;
        logForDebugging(
          `[attach-serve] link request failed transiently (status ${se.status ?? "none"}: ${"error" in ee ? errorMessage(ee.error) : "server error"}); retrying in ${x} ms`,
        );
        await sleep_2(x);
        continue;
      }
      case "device_unknown": {
        if (W)
          return attachServeRefusal(
            {
              kind: "device_unknown",
            },
            sessionId,
          );
        W = true;
        await (seams.forgetRow ?? forgetRegisteredRow)(accountUuid, credentials).catch((error) => {
          logForDebugging(`[attach-serve] could not forget the cached device row: ${errorMessage(error)}`);
        });
        registered = await registerDeviceForAttach({
          accountUuid,
          credentials,
          readBack: !handsKeyToLaterReaders,
          seams,
        });
        if (!registered.ok)
          return attachServeRefusal(
            {
              kind: "register",
              reason: registered.reason,
            },
            sessionId,
          );
        continue;
      }
    }
  }
}
//@ chunk-fe6rs39h.js:26544-27166 placement
async function registerDeviceForAttach({ accountUuid, credentials, readBack, seams }) {
  try {
    let h = await (seams.register ?? registerDeviceCached)(accountUuid, deviceDisplayName(), credentials);
    let y = readBack
      ? await (seams.readCachedRow ?? registeredRowPk)(accountUuid, credentials)
      : normalizeUuidOrNull(h.deviceUUID)?.toLowerCase();
    if (y !== h.deviceUUID.toLowerCase()) {
      logForDebugging(
        `[attach-serve] registered device row=${h.deviceUUID} ${readBack ? `but the local store reads ${y ?? "nothing"}` : "is not a device row id"}; not linking`,
      );
      return {
        ok: false,
        reason: "register",
      };
    }
    return {
      ok: true,
      ...h,
    };
  } catch (error) {
    logForDebugging(`[attach-serve] device registration failed: ${errorMessage(error)}`);
    return {
      ok: false,
      reason:
        error instanceof DeviceLimitReachedError
          ? "limit_reached"
          : error instanceof DeviceRegistrationUnavailableError
            ? "registration_unavailable"
            : error instanceof DeviceKeyRefusedError
              ? "device_revoked"
              : "register",
    };
  }
}
//@ chunk-fe6rs39h.js:27166-27233 placement
var CLOUD_SESSION_ID_PATTERN = /^cse_[A-Za-z0-9_]{1,124}$/;
var CLOUD_ENVIRONMENT_ID_PATTERN = /^env_[A-Za-z0-9_-]{1,124}$/;
//@ chunk-fe6rs39h.js:27233-27512 placement
function readAttachServeRequest(initialize) {
  let attachServeRequest = initialize?.attachServeRequest;
  if (attachServeRequest === undefined) return;
  if (
    !CLOUD_SESSION_ID_PATTERN.test(attachServeRequest.workId) ||
    !CLOUD_ENVIRONMENT_ID_PATTERN.test(attachServeRequest.environmentId)
  ) {
    logForDebugging(
      "[attach-serve] the host named a request for this link but not in a usable form; signing without it",
    );
    return;
  }
  return {
    workId: attachServeRequest.workId,
    environmentId: attachServeRequest.environmentId,
  };
}
//@ chunk-fe6rs39h.js:27512-27658 placement
function readToolHostStatus(e) {
  let externalMetadata = e?.session?.external_metadata;
  return typeof externalMetadata === "object" &&
    externalMetadata !== null &&
    "tool_host_status" in externalMetadata
    ? (externalMetadata.tool_host_status ?? undefined)
    : undefined;
}
//@ chunk-fe6rs39h.js:27658-27721 placement
function nonEmptyString(e) {
  return typeof e === "string" && e.length > 0 ? e : undefined;
}
//@ chunk-fe6rs39h.js:27721-29019 placement
function classifyAttachLinkResponse(result, deviceUUID) {
  if (!result.ok)
    return {
      next: "final",
      refusal:
        result.reason === "no-auth"
          ? {
              kind: "auth",
            }
          : {
              kind: "local",
              reason: "egress",
            },
    };
  let { status, data: r } = result;
  logForDebugging(
    `[attach-serve] link status=${status} request_id=${String(result.response.headers?.["request-id"] ?? "")}`,
  );
  if (status === 200) {
    let lower = nonEmptyString(r?.session?.bound_device_uuid)?.toLowerCase();
    return lower === undefined || lower === deviceUUID.toLowerCase()
      ? {
          next: "linked",
          toolHostStatus: readToolHostStatus(r),
        }
      : {
          next: "final",
          refusal: {
            kind: "bound_elsewhere",
          },
        };
  }
  let h = nonEmptyString(r?.error?.resource);
  let y = nonEmptyString(r?.error?.sub_reason);
  let S = nonEmptyString(r?.error?.details);
  if (status === 409) {
    if (S === SESSION_WORKER_BUSY)
      return {
        next: "busy",
      };
    if (S === SESSION_ALREADY_BOUND_ELSEWHERE)
      return {
        next: "final",
        refusal: {
          kind: "bound_elsewhere",
        },
      };
    return {
      next: "final",
      refusal: {
        kind: "unavailable",
        status,
      },
    };
  }
  if (status === 403) {
    if (h === DEVICE_NOT_FOUND)
      return {
        next: "device_unknown",
      };
    if (h === BIND_ATTESTATION_STALE)
      return {
        next: "final",
        refusal: {
          kind: "clock",
        },
      };
    if (h === LATE_BIND_REFUSED && y === TOOL_HOST_PROOF_INVALID)
      return {
        next: "proof_invalid",
      };
    if (h === LATE_BIND_REFUSED || h === TOOL_HOST_GRANT_REFUSED)
      return {
        next: "final",
        refusal: {
          kind: "refused",
          subReason: y !== undefined && isKnownAttachRefusal(y) ? y : "other",
        },
      };
    return {
      next: "final",
      refusal: {
        kind: "refused",
        subReason: "other",
      },
    };
  }
  if (status === 412)
    return {
      next: "final",
      refusal: {
        kind: "dispatch_disabled",
      },
    };
  if (status === 401)
    return {
      next: "final",
      refusal: {
        kind: "auth",
      },
    };
  if (status === 404)
    return {
      next: "final",
      refusal: {
        kind: "not_found",
      },
    };
  if (status >= 500 || status === 429 || status === 408)
    return {
      next: "transient",
      status,
    };
  return {
    next: "final",
    refusal: {
      kind: "unavailable",
      status,
    },
  };
}
//@ chunk-fe6rs39h.js:29019-29138 placement
function attachServeRefusal(e, sessionId) {
  return {
    ok: false,
    refusal: e,
    message: `Error: cannot serve cloud session ${sessionId} from this computer: ${describeAttachRefusal(e)}`,
  };
}
//@ chunk-fe6rs39h.js:29138-30351 placement
function describeAttachRefusal(e) {
  switch (e.kind) {
    case "local":
    case "register":
      return `${deviceBindingRefusalText(e.reason)}.`;
    case "serving_off":
      return SERVING_OFF_MESSAGES[e.reason];
    case "bad_session_id":
      return "that is not a cloud session id.";
    case "refused":
      return e.subReason === "other"
        ? "the server refused to link the session to this computer."
        : `${ATTACH_REFUSAL_MESSAGES[e.subReason]}.`;
    case "bound_elsewhere":
      return "the session is already linked to a different computer.";
    case "busy":
      return "the session stayed busy; wait for its current turn to finish (or stop it) and allow again.";
    case "clock":
      return "this computer's clock is too far off; correct the date and time and allow again.";
    case "device_unknown":
      return "the server does not recognize this computer's device registration, even after registering again.";
    case "dispatch_disabled":
      return "using your own computer from cloud sessions is switched off for your organization right now.";
    case "not_found":
      return "no such session for this account (or the feature is off for your organization).";
    case "auth":
      return "this computer is not signed in to claude.ai (run claude /login), or its login expired.";
    case "unavailable":
      return `the service could not be reached or answered unexpectedly${e.status !== undefined ? ` (HTTP ${e.status})` : ""}; try again shortly.`;
  }
}
//@ chunk-fe6rs39h.js:30351-31763 placement
var SERVING_OFF_MESSAGES = {
  external_build: "this Claude Code cannot serve tools to cloud sessions.",
  windows: "serving tools from a Windows computer is not available yet.",
  muted: "serving tools from this computer is paused right now; try again in a few minutes.",
  switch_off: "serving tools is switched off on this computer.",
  flag_off: "using this computer from cloud sessions is switched off for your account right now.",
  profile_dirs_unread: "this computer is still reading where its shell profile lives; try again in a moment.",
  profile_dirs_unreadable:
    "Windows did not say where this computer keeps its profile folders (Documents, AppData, the Start Menu), so its tools are not served; restarting Claude Code tries again.",
  mount_table_unreadable:
    "this computer could not read its list of mounted drives (/proc/self/mountinfo) in full, so it cannot find your Windows user folder; if it fails again, see the debug log.",
  launched_from_home:
    "this helper was started in a folder or repository that is never served, such as your home directory or a hidden folder there; serve a project folder instead.",
  excluded_repository: "this helper was started in a repository that is never served.",
  egress: `${deviceBindingRefusalText("egress")}.`,
  policy_org: "your organization's policy does not allow using this computer from cloud sessions.",
  channel_off: "this computer's session channel is switched off.",
  test_vm_without_vm: "this folder cannot be served as it was offered.",
};
//@ chunk-fe6rs39h.js:31763-31790 placement
async function noopAsync() {
  return;
}
//@ chunk-fe6rs39h.js:31790-32256 placement
async function servingOffReason(e) {
  let [
    { remoteToolServingOffReason: n, remoteToolVmSwitch: s },
    { servedToolsUnavailableReason: r },
    { isViolinWoodServedOff: h },
    { primeWindowsProfileDirs: y },
    { inExcludedRepository: S },
  ] = await Promise.all([
    import("./chunk-wcfcn49z.js"),
    import("./chunk-012rhzq5.js"),
    import("./chunk-m288yvvf.js"),
    import("./chunk-w5rpngy7.js"),
    import("./chunk-z65m5xev.js"),
  ]);
  await y();
  return (
    n() ??
    ((await S(getOriginalCwd())) ? "excluded_repository" : undefined) ??
    r() ??
    (h() ? "flag_off" : undefined) ??
    undefined
  );
}
//@ chunk-fe6rs39h.js:32256-32285 placement
var ATTACH_RESUME_FLAG = "tengu_violin_volute";
//@ chunk-fe6rs39h.js:32285-32381 placement
function isAttachResumeEnabled() {
  try {
    let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(ATTACH_RESUME_FLAG, false);
    return e === true && source !== "override";
  } catch {
    return false;
  }
}
//@ chunk-fe6rs39h.js:32381-32665 placement
var ATTACH_RESUME_RETRY_MS = [1000, 3000, 8000];
var ATTACH_RESUME_BACKOFF_JITTER = {
  kind: "symmetric",
  ratio: 0.25,
};
var ATTACH_LINK_STATUS_STALE_MS = 30000;
var ATTACH_RESUME_POLL_MS = 5000;
var ATTACH_RESUME_MAX_ATTEMPTS = 3;
var linkedToolHostStatusSchema = DoctorLazy(() =>
  u({
    v: literal(1),
    state: string(),
    environment_id: string(),
    requested_at: string().min(1),
    resumed_at: string().min(1).nullish(),
    resume: u({
      nonce: string().regex(/^[\x21-\x7e]{1,512}$/),
      until: parseToolOutputSchema({
        offset: true,
      }),
    })
      .nullish()
      .catch(undefined),
  }),
);
//@ chunk-fe6rs39h.js:32665-32956 placement
async function readLinkedStatus(e, n, s) {
  let r;
  let h = await sessionStillBoundTo(e, async () => {
    r = await n();
    return r;
  });
  if (h === undefined || r === undefined) return;
  if (s === undefined) return h ? "linked" : "ended";
  try {
    let y = s.awaitsResume(r);
    if (h && !s.endedHere(r)) return "linked";
    if (y) return "awaits_resume";
    return h ? "detached_here" : "ended";
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-fe6rs39h.js:32956-33167 placement
async function waitForLinkedStatus(
  e,
  n,
  s,
  r = (h) =>
    sleep(h, undefined, {
      unref: true,
    }),
) {
  let linkedStatus = await readLinkedStatus(e, n, s);
  if (linkedStatus === "detached_here") {
    for (let y = 0; y < ATTACH_RESUME_MAX_ATTEMPTS; y += 1) {
      await r(ATTACH_RESUME_POLL_MS);
      linkedStatus = await readLinkedStatus(e, n, s);
      if (linkedStatus !== undefined) break;
    }
  }
  return linkedStatus === undefined ? undefined : linkedStatus === "linked";
}
//@ chunk-fe6rs39h.js:33167-34156 placement
/**
 * 链接状态为 detached 且持有恢复请求时，尝试重新签名并恢复本机对云会话的服务（tengu_attach_serve_resume）。
 */
function maybeResumeAttach({ linkedStatus, request, held, seams = {}, ...h }) {
  if (!(seams.flagOn ?? isAttachResumeEnabled)() || request === undefined || held === undefined) return;
  let y = decodeTaggedUuid(h.sessionId);
  let S = linkedToolHostStatusSchema().safeParse(linkedStatus);
  if (y === undefined || !S.success || S.data.environment_id !== request.environmentId) return;
  let requestedAt = S.data.requested_at;
  let R = {
    ...h,
    sessionUuid: y,
    held,
    request,
    requestedAt,
  };
  let now = seams.now ?? Date.now;
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let O;
  return {
    resume: () => {
      let maySign = now() - NEGATIVE_INFINITY >= ATTACH_LINK_STATUS_STALE_MS;
      O ??= checkAttachResumeAllowed(
        R,
        {
          posted: false,
          maySign,
        },
        seams,
      )
        .catch((error) => {
          logError(error);
          return "unexpected";
        })
        .then((j) => {
          O = undefined;
          logEvent("tengu_attach_serve_resume", {
            outcome: fromEnum(j),
          });
          if (j === "resumed") {
            NEGATIVE_INFINITY = now();
            logFeatureOk("attach_serve_resume");
          } else if (
            j === "sign" ||
            j === "refused" ||
            j === "not_same_attach" ||
            j === "unavailable" ||
            j === "not_sent" ||
            j === "unexpected"
          )
            logFeatureBad("attach_serve_resume", j);
          return j === "resumed" || j === "already_resumed" ? "resumed" : "stopped";
        });
      return O;
    },
    awaitsResume: (z) =>
      (seams.flagOn ?? isAttachResumeEnabled)() &&
      z.session_status !== "archived" &&
      typeof resumableDetachState(z, R, now()) === "object",
    endedHere: (z) =>
      (seams.flagOn ?? isAttachResumeEnabled)() &&
      isSameDevice(z.bound_device_uuid, R) &&
      parseToolHostStatus(z.tool_host_status, R)?.state === "detached",
  };
}
//@ chunk-fe6rs39h.js:34156-34624 placement
async function checkAttachResumeAllowed(e, n, seams) {
  if (!(seams.flagOn ?? isAttachResumeEnabled)()) return "flag_off";
  let r = await (seams.localIdentity ?? checkAttachServeLocally)({
    sessionId: e.sessionId,
    credentials: e.credentials,
    resuming: true,
  });
  if (!r.ok || r.accountUuid !== e.held.accountUuid) return "local";
  let retryDelaysMs = seams.retryDelaysMs ?? ATTACH_RESUME_RETRY_MS;
  for (let y = 0; ; y += 1) {
    let S = await resumeAttachServe(e, n, seams);
    if (S !== "retry") return S;
    let w = retryDelaysMs[y];
    if (w === undefined) return n.posted ? "unavailable" : "unreadable";
    let R = backoffDelayMs({
      attempt: 1,
      baseMs: w,
      jitter: ATTACH_RESUME_BACKOFF_JITTER,
      random: seams.random,
    });
    await (seams.sleep ?? sleep)(Math.round(R));
  }
}
//@ chunk-fe6rs39h.js:34624-36104 placement
async function resumeAttachServe(e, n, s) {
  let r;
  try {
    r = await e.readSession();
  } catch (error) {
    logForDebugging(`[attach-serve] resume could not read the session: ${errorMessage(error)}`);
    return error instanceof TeleportOperationError ? "session_read_refused" : "retry";
  }
  if (r.session_status === "archived") return "session_archived";
  let toolHostStatus = parseToolHostStatus(r.tool_host_status, e);
  if (isConnectedAndResumed(toolHostStatus) && isSameDevice(r.bound_device_uuid, e))
    return n.posted ? "resumed" : "already_resumed";
  let y = resumableDetachState(r, e, (s.now ?? Date.now)());
  if (typeof y === "string") return y;
  if (!n.maySign) return "too_soon";
  if (!(s.flagOn ?? isAttachResumeEnabled)()) return "flag_off";
  let S;
  try {
    S = await signToolHostResume({
      orgUuid: e.orgUuid,
      accountUuid: e.held.accountUuid,
      sessionUuid: e.sessionUuid,
      deviceUUID: e.deviceId,
      request: e.request,
      nonce: y.nonce,
      key: e.held.key,
    });
  } catch (error) {
    logForDebugging(`[attach-serve] signing the resume proof failed: ${errorMessage(error)}`);
    return "sign";
  }
  n.posted = true;
  let w;
  try {
    w = await (s.post ?? postTeleportOrg)(
      `/v1/code/sessions/${e.sessionId}/device`,
      {
        target_device_id: S.deviceUUID,
        bind_attestation: {
          kid: S.kid,
          signature: S.signature,
        },
        bind_attestation_issued_at: S.issuedAt,
      },
      e.credentials,
    );
  } catch (error) {
    logForDebugging(`[attach-serve] resume request got no answer: ${errorMessage(error)}`);
    return "retry";
  }
  if (!w.ok) return "not_sent";
  logForDebugging(
    `[attach-serve] resume status=${w.status} request_id=${String(w.response.headers?.["request-id"] ?? "")}`,
  );
  if (w.status >= 500 || w.status === 408 || w.status === 429) return "retry";
  if (w.status !== 200) return w.status === 403 && (await isServingConnected(e)) ? "resumed" : "refused";
  let boundDeviceUuid = w.data?.session?.bound_device_uuid;
  let toolHostStatus_2 = readToolHostStatus(w.data);
  if (typeof boundDeviceUuid !== "string" || boundDeviceUuid === "" || toolHostStatus_2 === undefined)
    return "retry";
  return isSameDevice(boundDeviceUuid, e) && isConnectedAndResumed(parseToolHostStatus(toolHostStatus_2, e))
    ? "resumed"
    : "not_same_attach";
}
//@ chunk-fe6rs39h.js:36104-36262 placement
function parseToolHostStatus(toolHostStatus, n) {
  let s = linkedToolHostStatusSchema().safeParse(toolHostStatus);
  return s.success &&
    s.data.environment_id === n.request.environmentId &&
    s.data.requested_at === n.requestedAt
    ? s.data
    : undefined;
}
//@ chunk-fe6rs39h.js:36262-36483 placement
function resumableDetachState(e, n, s) {
  let toolHostStatus = parseToolHostStatus(e.tool_host_status, n);
  if (
    toolHostStatus?.state !== "detached" ||
    toolHostStatus.resume == null ||
    (e.bound_device_uuid !== undefined && !isSameDevice(e.bound_device_uuid, n))
  )
    return "no_offer";
  return Date.parse(toolHostStatus.resume.until) > s ? toolHostStatus.resume : "expired";
}
//@ chunk-q8cqcff6.js:6929-7034 placement
function isCloudFlag(e) {
  return e === "--cloud" || e === "--remote" || e.startsWith("--cloud=") || e.startsWith("--remote=");
}
//@ chunk-q8cqcff6.js:7034-7133 placement
function isAttachServeMode() {
  return (
    eagerParseCliFlag("--attach-serve") !== undefined ||
    (eagerFindCliArg(isCloudFlag) !== -1 &&
      detectNonInteractiveLaunch() &&
      !eagerHasCliFlag("-p") &&
      !eagerHasCliFlag("--print"))
  );
}
//@ chunk-q8cqcff6.js:7133-7192 placement
/**
 * attach serve 模式下判断某设置来源是否为仓库目录级（非 globalConfig 且在 REPO_DIR_SETTING_SOURCES 内）。
 */
function isAttachServeRepoScopedSource(e) {
  return e !== "globalConfig" && REPO_DIR_SETTING_SOURCES.has(e) && isAttachServeMode();
}
//@ chunk-q8cqcff6.js:7192-7260 placement
/**
 * 在宿主环境守卫内读取 CLAUDE_CODE_IGNORE_PERSISTED_TRUST（是否忽略持久化的信任）。
 */
function ignoresPersistedTrust() {
  return withHostOwnedEnvGuard(() => env.CLAUDE_CODE_IGNORE_PERSISTED_TRUST);
}
//@ chunk-q8cqcff6.js:7260-7334 placement
/**
 * 仓库目录级设置来源在 attach serve 模式、或非交互且忽略持久信任时视为生效。
 */
function isAttachServeRepoScopedSourceOrNonInteractive(e) {
  return (
    e !== "globalConfig" &&
    REPO_DIR_SETTING_SOURCES.has(e) &&
    (isAttachServeMode() || (getIsNonInteractiveSession() && ignoresPersistedTrust()))
  );
}
//@ chunk-q8cqcff6.js:7334-7461 placement
var OAUTH_ENDPOINT_KEYS = [
  "BASE_API_URL",
  "TOKEN_URL",
  "CLAUDE_AI_ORIGIN",
  "API_KEY_URL",
  "ROLES_URL",
  "MCP_PROXY_URL",
];
var pinCache = identity_2(new Map(), (e) => e.clear());
//@ chunk-q8cqcff6.js:7461-7580 placement
/**
 * 是否固定使用已存储的登录（缓存首次判断结果，可由环境变量开启）。
 */
function isStoredLoginPinned() {
  let e = pinCache.get("isPinned") ?? env.CLAUDE_CODE_REMOTE_TOOLS_PIN_STORED_LOGIN === true;
  pinCache.set("isPinned", e);
  return e;
}
//@ chunk-q8cqcff6.js:7580-7604 placement
/**
 * 恒返回 true 的占位判断（attach serve 相关构建期开关）。
 */
function isAlwaysTrue() {
  return true;
}
//@ chunk-q8cqcff6.js:7604-7669 placement
function isRemoteToolsPinStoredLogin() {
  return "CLAUDE_CODE_REMOTE_TOOLS_PIN_STORED_LOGIN";
}
//@ chunk-q8cqcff6.js:7669-7813 placement
function formatServeHelperStoppedError(e) {
  return `Error: serve helper stopped: ${e} does not resolve to this computer's stored claude.ai login on Anthropic's own service`;
}
//@ chunk-q8cqcff6.js:7813-8191 placement
/**
 * 远程工具固定使用存储登录时，检查 base URL 与 OAuth 端点是否为官方第一方（本地 OAuth 构建另行判断），不符时返回 base_url 或 oauth_endpoint。
 */
function getServeHelperStopReason() {
  let e = builtInOauthConfig();
  let n = e.OAUTH_FILE_SUFFIX === "-local-oauth";
  let r = URL.parse(env.ANTHROPIC_BASE_URL ?? "");
  let s = isActualFirstPartyAnthropicBaseUrl() && (r === null || r.protocol === "https:");
  let S = n && isLoopbackHost(r?.hostname ?? "");
  if (!s && !S) return "base_url";
  try {
    let oauthConfig = getOauthConfig();
    if (OAUTH_ENDPOINT_KEYS.some((h) => oauthConfig[h] !== e[h])) return "oauth_endpoint";
  } catch {
    return "oauth_endpoint";
  }
  if (n && OAUTH_ENDPOINT_KEYS.some((E) => !isLoopbackHost(URL.parse(e[E])?.hostname ?? "")))
    return "oauth_endpoint";
  return;
}
//@ chunk-q8cqcff6.js:8191-8319 placement
/**
 * 固定使用已存储登录但服务助手不满足条件时，输出错误并以配置错误码退出。
 */
function exitIfServeHelperMisconfigured() {
  if (!isStoredLoginPinned()) return;
  let serveHelperStopReason = getServeHelperStopReason();
  if (serveHelperStopReason === undefined) return;
  try {
    process.stderr.write(`${formatServeHelperStoppedError(serveHelperStopReason)}
`);
  } finally {
    process.exit(EXIT_CONFIG_ERROR);
  }
}
//@ chunk-q8cqcff6.js:8319-8448 placement
/**
 * 受管设置询问的进程级状态（询问内容、是否询问中、读取身份、是否已告知），可重置。
 */
var managedSettingsAskState = identity_2(
  {
    asks: undefined,
    isAsking: false,
    readAs: undefined,
    told: undefined,
  },
  (e) => {
    e.asks = undefined;
    e.isAsking = false;
    e.readAs = undefined;
    e.told = undefined;
  },
);
//@ chunk-q8cqcff6.js:8448-8694 placement
/**
 * 读取是否存在托管设置（可通过注入的 asks 回调），递归调用时返回上次结果；结果变化时使策略层缓存失效。
 */
function hasManagedSettingsCached() {
  let e = managedSettingsAskState;
  if (e.isAsking) {
    e.readAs ??= hasManagedSettings();
    return e.readAs;
  }
  let n = hasManagedSettings();
  if (e.asks !== undefined) {
    e.isAsking = true;
    try {
      n = e.asks();
    } finally {
      e.isAsking = false;
    }
  }
  let r = e.readAs !== undefined && e.readAs !== n;
  e.readAs = n;
  if (r) commandSyncNameState().invalidatePolicyLayer();
  return n;
}
//@ chunk-q8cqcff6.js:8694-8707 placement
/**
 * 内部写入记录的有效窗口 5000ms：窗口内同路径写入事件视为自身写入而忽略。
 */
var INTERNAL_WRITE_WINDOW_MS = 5000;
//@ chunk-q8cqcff6.js:8707-8761 placement
/**
 * 按宿主记录一次内部写入时间戳，供 consumeInternalWrite 在窗口内消费。
 */
function markInternalWrite(e) {
  commandSyncNameState().internalWrites.set(e, Date.now());
}
//@ chunk-q8cqcff6.js:8761-8877 placement
/**
 * 若某路径在时间窗口内有内部写入记录则消费该记录并返回 true，用于忽略自身写入触发的变更。
 */
function consumeInternalWrite(e, n) {
  let internalWrites = commandSyncNameState().internalWrites;
  let s = internalWrites.get(e);
  if (s !== undefined && Date.now() - s < n) {
    internalWrites.delete(e);
    return true;
  }
  return false;
}
//@ chunk-q8cqcff6.js:8877-8920 placement
/**
 * 清空全部内部写入记录（重新开始监听外部变更时用）。
 */
function clearInternalWrites() {
  commandSyncNameState().internalWrites.clear();
}
export {
  ignoresPersistedTrust,
  formatServeHelperStoppedError,
  isAttachServeMode,
  isStoredLoginPinned,
  managedSettingsAskState,
  isAlwaysTrue,
  isRemoteToolsPinStoredLogin,
  hasManagedSettingsCached,
  isAttachServeRepoScopedSourceOrNonInteractive,
  isAttachServeRepoScopedSource,
  markInternalWrite,
  clearInternalWrites,
  consumeInternalWrite,
  INTERNAL_WRITE_WINDOW_MS,
  isAttachServeEnabled,
  exitIfServeHelperMisconfigured,
  parseToolHostStatus,
  readLinkedStatus,
  checkAttachServeLocally,
  registerAndLinkDevice,
  readAttachServeRequest,
  linkAttachServe,
  maybeResumeAttach,
  shouldServeOnlyNotArmed,
  waitForLinkedStatus,
  notArmedHereLookup,
};

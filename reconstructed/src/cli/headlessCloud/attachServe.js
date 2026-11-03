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
import { Vt } from "../../utils/agentId.js";
import { GNe } from "../../bridge/deviceBinding.js";
import { getOriginalCwd, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { DoctorLazy } from "../handlers/util.js";
import { u, T, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { t0 } from "../../services/mcp/schemaParse.js";
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
import { ge } from "../../utils/identity.js";
import { builtInOauthConfig, getOauthConfig } from "../../constants/oauth.js";
import { isActualFirstPartyAnthropicBaseUrl } from "../../utils/model/providers.js";
import { pw } from "../../utils/localhost.js";
import { EXIT_CONFIG_ERROR } from "../../utils/exitCodes.js";
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import { is } from "../../utils/settings/commandSyncNames.js";

//@ chunk-fe6rs39h.js:18087-18160 placement
async function isAttachServeEnabled() {
  try {
    return (await isViolinWoodEnabled()) && (await checkGate_CACHED_OR_BLOCKING(ATTACH_SERVE_FLAG));
  } catch {
    return !1;
  }
}
//@ chunk-fe6rs39h.js:18160-18384 placement
function shouldServeOnlyNotArmed({
  serveOnly: serveOnly,
  lookup: lookup,
  sessionBefore: sessionBefore,
  sweep: sweep,
}) {
  return serveOnly &&
    lookup.handle === void 0 &&
    lookup.why === "not_armed_here" &&
    lookup.noRecordOnThisMachine === !0 &&
    sessionBefore !== void 0 &&
    sessionBefore.boundDeviceId === void 0 &&
    isBeforeRetentionCutoff(sessionBefore.createdAt, sweep)
    ? "separate_copy"
    : void 0;
}
//@ chunk-fe6rs39h.js:18384-18553 placement
function isBeforeRetentionCutoff(e, n) {
  switch (n.kind) {
    case "never":
      return !0;
    case "unknown":
      return !1;
    case "before": {
      let parse = Date.parse(e);
      return Number.isFinite(parse) && parse - 86400000 > n.before.getTime();
    }
  }
}
//@ chunk-fe6rs39h.js:18553-18669 placement
function notArmedHereLookup(e) {
  return {
    handle: void 0,
    why: "not_armed_here",
    ...(e.hasOwnSessionRecord !== !0 && { noRecordOnThisMachine: !0 }),
  };
}
//@ chunk-fe6rs39h.js:18669-18866 placement
var LATE_BIND_REFUSED = "late_bind_refused",
  TOOL_HOST_GRANT_REFUSED = "tool_host_grant_refused",
  DEVICE_NOT_FOUND = "device_not_found",
  BIND_ATTESTATION_STALE = "bind_attestation_stale",
  SESSION_ALREADY_BOUND_ELSEWHERE = "session_already_bound_elsewhere",
  SESSION_WORKER_BUSY = "session_worker_busy",
  TOOL_HOST_PROOF_INVALID = "tool_host_proof_invalid";
/**
 * 本机为云会话提供工具时，服务端拒绝码 → 面向用户的说明文字表。
 */
//@ chunk-fe6rs39h.js:18866-22034 placement
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
var ATTACH_LINK_RETRY_DELAYS_MS = [2000, 4000, 8000, 12000, 15000, 15000, 15000],
  Js = 90000,
  eo = [2000, 4000, 8000];
//@ chunk-fe6rs39h.js:22153-22264 placement
function postTeleportOrg(e, n, s) {
  return apiClient.post(e, n, {
    auth: "teleport-org",
    timeout: 15000,
    validateStatus: () => !0,
    credentials: s,
  });
}
/**
 * 把本机设备链接到指定云会话（attach-serve）：签名链接证明、调用 /v1/code/sessions/{id}/device，记录遥测。
 */
//@ chunk-fe6rs39h.js:22264-23069 placement
async function linkAttachServe({
  sessionId: sessionId,
  orgUuid: orgUuid,
  credentials: credentials,
  request: request,
  localIdentity: localIdentity,
  prepared: prepared,
  handsKeyToLaterReaders: handsKeyToLaterReaders = !1,
  seams: seams = {},
}) {
  let R = { form: void 0, retriedAsV1: !1 },
    k = await linkDeviceWithRetries({
      sessionId: sessionId,
      orgUuid: orgUuid,
      credentials: credentials,
      request: request,
      localIdentity: localIdentity,
      prepared: prepared,
      handsKeyToLaterReaders: handsKeyToLaterReaders,
      seams: seams,
      proofSent: R,
    }).catch(
      (O) => (
        logForDebugging(`[attach-serve] link failed unexpectedly: ${errorMessage(O)}`),
        attachServeRefusal({ kind: "unavailable", status: void 0 }, sessionId)
      ),
    ),
    I = R.form !== void 0 && { proof: fromEnum(R.form), proof_v1_retry: R.retriedAsV1 };
  if (k.ok)
    (logEvent("tengu_attach_serve_link", { outcome: lit("linked"), ...I }),
      logFeatureOk("attach_serve_link"));
  else {
    let O =
      k.refusal.kind === "refused" ? k.refusal.subReason : "reason" in k.refusal ? k.refusal.reason : void 0;
    (logEvent("tengu_attach_serve_link", {
      outcome: fromEnum(k.refusal.kind),
      ...(O !== void 0 && { detail: fromEnum(O) }),
      ...I,
    }),
      logFeatureBad("attach_serve_link", k.refusal.kind));
  }
  return k;
}
/**
 * 本地预检能否为该云会话服务：会话 id 合法、本机服务开关、设备绑定器就绪。
 */
//@ chunk-fe6rs39h.js:23069-23665 placement
async function checkAttachServeLocally({
  sessionId: sessionId,
  credentials: credentials,
  resuming: resuming = !1,
  seams: seams = {},
}) {
  try {
    let h = decodeTaggedUuid(sessionId);
    if (h === void 0) return attachServeRefusal({ kind: "bad_session_id" }, sessionId);
    let y = await (seams.servingOff ?? servingOffReason)(resuming);
    if (y !== void 0) return attachServeRefusal({ kind: "serving_off", reason: y }, sessionId);
    let S;
    try {
      S = getStoredOauthAccountInfo()?.accountUuid;
    } catch {
      S = void 0;
    }
    let w = await (seams.identity ?? localBindIdentity)({ accountUuid: S, credentials: credentials });
    if (!w.ok) return attachServeRefusal({ kind: "local", reason: w.error }, sessionId);
    return { ok: !0, sessionUuid: h, accountUuid: w.value.accountUuid };
  } catch (error) {
    if (isFsInaccessible(error))
      logForDebugging(`[attach-serve] local check could not examine this computer: ${errorMessage(error)}`);
    else logError(error);
    return attachServeRefusal({ kind: "unavailable", status: void 0 }, sessionId);
  }
}
//@ chunk-fe6rs39h.js:23665-23999 placement
async function registerAndLinkDevice({
  sessionId: sessionId,
  credentials: credentials,
  localIdentity: localIdentity,
  handsKeyToLaterReaders: handsKeyToLaterReaders = !1,
  seams: seams = {},
}) {
  let y =
    localIdentity ??
    (await checkAttachServeLocally({ sessionId: sessionId, credentials: credentials, seams: seams }));
  if (!y.ok) return y;
  let S = await registerDeviceForAttach({
    accountUuid: y.accountUuid,
    credentials: credentials,
    readBack: !handsKeyToLaterReaders,
    seams: seams,
  });
  return S.ok
    ? { ok: !0, local: y, registered: S }
    : attachServeRefusal({ kind: "register", reason: S.reason }, sessionId);
}
//@ chunk-fe6rs39h.js:23999-26544 placement
async function linkDeviceWithRetries({
  sessionId: sessionId,
  orgUuid: orgUuid,
  credentials: credentials,
  request: request,
  localIdentity: localIdentity,
  prepared: prepared,
  handsKeyToLaterReaders: handsKeyToLaterReaders,
  seams: seams,
  proofSent: proofSent,
}) {
  let k = await (prepared ??
    registerAndLinkDevice({
      sessionId: sessionId,
      credentials: credentials,
      localIdentity: localIdentity,
      handsKeyToLaterReaders: handsKeyToLaterReaders,
      seams: seams,
    }));
  if (!k.ok) return k;
  let { sessionUuid: sessionUuid, accountUuid: accountUuid } = k.local,
    registered = k.registered,
    N = seams.busyRetryDelaysMs ?? ATTACH_LINK_RETRY_DELAYS_MS,
    L = seams.transientRetryDelaysMs ?? eo,
    z = seams.sleep ?? sleep,
    j = Date.now() + Js,
    Y = 0,
    D = 0,
    W = !1,
    te;
  if (request !== void 0)
    try {
      let X = await (seams.linkCapabilities ?? noopAsync)();
      te = X === void 0 ? void 0 : canonicalLinkCapabilities(X);
    } catch (error) {
      logForDebugging(
        `[attach-serve] could not read what this computer declares on a link; declaring nothing: ${errorMessage(error)}`,
      );
    }
  for (;;) {
    let X;
    try {
      let x = {
        orgUuid: orgUuid,
        accountUuid: accountUuid,
        sessionUuid: sessionUuid,
        deviceUUID: registered.deviceUUID,
        key: registered.key,
      };
      ((X =
        request === void 0
          ? await (seams.sign ?? signSessionLateLink)(x)
          : await (seams.signRequest ?? signToolHostLink)({
              ...x,
              request: request,
              ...(te !== void 0 && { capabilities: te }),
            })),
        (proofSent.form = request === void 0 ? "session_only" : te === void 0 ? "v1" : "v2"));
    } catch (error) {
      return (
        logForDebugging(`[attach-serve] signing the link proof failed: ${errorMessage(error)}`),
        attachServeRefusal({ kind: "register", reason: "sign" }, sessionId)
      );
    }
    let ee = await Promise.resolve()
        .then(() =>
          (seams.post ?? postTeleportOrg)(
            `/v1/code/sessions/${sessionId}/device`,
            {
              target_device_id: X.deviceUUID,
              bind_attestation: { kid: X.kid, signature: X.signature },
              bind_attestation_issued_at: X.issuedAt,
              ...(te !== void 0 && { capabilities: te }),
            },
            credentials,
          ),
        )
        .then(
          (x) => ({ result: x }),
          (x) => ({ error: x }),
        ),
      se =
        "error" in ee
          ? { next: "transient", status: void 0 }
          : classifyAttachLinkResponse(ee.result, registered.deviceUUID);
    switch (se.next) {
      case "linked":
        return {
          ok: !0,
          deviceId: registered.deviceUUID,
          toolHostStatus: se.toolHostStatus,
          ...(handsKeyToLaterReaders && {
            heldKey: {
              accountUuid: accountUuid,
              rowPk: registered.deviceUUID.toLowerCase(),
              key: registered.key,
            },
          }),
        };
      case "final":
        return attachServeRefusal(se.refusal, sessionId);
      case "proof_invalid": {
        if (te === void 0)
          return attachServeRefusal({ kind: "refused", subReason: TOOL_HOST_PROOF_INVALID }, sessionId);
        ((te = void 0),
          (proofSent.retriedAsV1 = !0),
          logForDebugging(
            "[attach-serve] the service did not take the v2 link proof; sending the v1 proof without the capability list",
          ));
        continue;
      }
      case "busy": {
        let x = N[Y];
        if (x === void 0 || Date.now() + x > j) return attachServeRefusal({ kind: "busy" }, sessionId);
        ((Y += 1),
          logForDebugging(`[attach-serve] session busy; retrying the link in ${x} ms (${Y}/${N.length})`),
          await z(x));
        continue;
      }
      case "transient": {
        let x = L[D];
        if (x === void 0) return attachServeRefusal({ kind: "unavailable", status: se.status }, sessionId);
        ((D += 1),
          logForDebugging(
            `[attach-serve] link request failed transiently (status ${se.status ?? "none"}: ${"error" in ee ? errorMessage(ee.error) : "server error"}); retrying in ${x} ms`,
          ),
          await z(x));
        continue;
      }
      case "device_unknown": {
        if (W) return attachServeRefusal({ kind: "device_unknown" }, sessionId);
        if (
          ((W = !0),
          await (seams.forgetRow ?? forgetRegisteredRow)(accountUuid, credentials).catch((x) => {
            logForDebugging(`[attach-serve] could not forget the cached device row: ${errorMessage(x)}`);
          }),
          (registered = await registerDeviceForAttach({
            accountUuid: accountUuid,
            credentials: credentials,
            readBack: !handsKeyToLaterReaders,
            seams: seams,
          })),
          !registered.ok)
        )
          return attachServeRefusal({ kind: "register", reason: registered.reason }, sessionId);
        continue;
      }
    }
  }
}
//@ chunk-fe6rs39h.js:26544-27166 placement
async function registerDeviceForAttach({
  accountUuid: accountUuid,
  credentials: credentials,
  readBack: readBack,
  seams: seams,
}) {
  try {
    let h = await (seams.register ?? registerDeviceCached)(accountUuid, deviceDisplayName(), credentials),
      y = readBack
        ? await (seams.readCachedRow ?? registeredRowPk)(accountUuid, credentials)
        : Vt(h.deviceUUID)?.toLowerCase();
    if (y !== h.deviceUUID.toLowerCase())
      return (
        logForDebugging(
          `[attach-serve] registered device row=${h.deviceUUID} ${readBack ? `but the local store reads ${y ?? "nothing"}` : "is not a device row id"}; not linking`,
        ),
        { ok: !1, reason: "register" }
      );
    return { ok: !0, ...h };
  } catch (error) {
    return (
      logForDebugging(`[attach-serve] device registration failed: ${errorMessage(error)}`),
      {
        ok: !1,
        reason:
          error instanceof DeviceLimitReachedError
            ? "limit_reached"
            : error instanceof DeviceRegistrationUnavailableError
              ? "registration_unavailable"
              : error instanceof DeviceKeyRefusedError
                ? "device_revoked"
                : "register",
      }
    );
  }
}
//@ chunk-fe6rs39h.js:27166-27233 placement
var CLOUD_SESSION_ID_PATTERN = /^cse_[A-Za-z0-9_]{1,124}$/,
  oo = /^env_[A-Za-z0-9_-]{1,124}$/;
//@ chunk-fe6rs39h.js:27233-27512 placement
function readAttachServeRequest(e) {
  let n = e?.attachServeRequest;
  if (n === void 0) return;
  if (!CLOUD_SESSION_ID_PATTERN.test(n.workId) || !oo.test(n.environmentId)) {
    logForDebugging(
      "[attach-serve] the host named a request for this link but not in a usable form; signing without it",
    );
    return;
  }
  return { workId: n.workId, environmentId: n.environmentId };
}
//@ chunk-fe6rs39h.js:27512-27658 placement
function readToolHostStatus(e) {
  let n = e?.session?.external_metadata;
  return typeof n === "object" && n !== null && "tool_host_status" in n
    ? (n.tool_host_status ?? void 0)
    : void 0;
}
//@ chunk-fe6rs39h.js:27658-27721 placement
function nonEmptyString(e) {
  return typeof e === "string" && e.length > 0 ? e : void 0;
}
//@ chunk-fe6rs39h.js:27721-29019 placement
function classifyAttachLinkResponse(e, n) {
  if (!e.ok)
    return {
      next: "final",
      refusal: e.reason === "no-auth" ? { kind: "auth" } : { kind: "local", reason: "egress" },
    };
  let { status: status, data: r } = e;
  if (
    (logForDebugging(
      `[attach-serve] link status=${status} request_id=${String(e.response.headers?.["request-id"] ?? "")}`,
    ),
    status === 200)
  ) {
    let w = nonEmptyString(r?.session?.bound_device_uuid)?.toLowerCase();
    return w === void 0 || w === n.toLowerCase()
      ? { next: "linked", toolHostStatus: readToolHostStatus(r) }
      : { next: "final", refusal: { kind: "bound_elsewhere" } };
  }
  let h = nonEmptyString(r?.error?.resource),
    y = nonEmptyString(r?.error?.sub_reason),
    S = nonEmptyString(r?.error?.details);
  if (status === 409) {
    if (S === SESSION_WORKER_BUSY) return { next: "busy" };
    if (S === SESSION_ALREADY_BOUND_ELSEWHERE) return { next: "final", refusal: { kind: "bound_elsewhere" } };
    return { next: "final", refusal: { kind: "unavailable", status: status } };
  }
  if (status === 403) {
    if (h === DEVICE_NOT_FOUND) return { next: "device_unknown" };
    if (h === BIND_ATTESTATION_STALE) return { next: "final", refusal: { kind: "clock" } };
    if (h === LATE_BIND_REFUSED && y === TOOL_HOST_PROOF_INVALID) return { next: "proof_invalid" };
    if (h === LATE_BIND_REFUSED || h === TOOL_HOST_GRANT_REFUSED)
      return {
        next: "final",
        refusal: { kind: "refused", subReason: y !== void 0 && isKnownAttachRefusal(y) ? y : "other" },
      };
    return { next: "final", refusal: { kind: "refused", subReason: "other" } };
  }
  if (status === 412) return { next: "final", refusal: { kind: "dispatch_disabled" } };
  if (status === 401) return { next: "final", refusal: { kind: "auth" } };
  if (status === 404) return { next: "final", refusal: { kind: "not_found" } };
  if (status >= 500 || status === 429 || status === 408) return { next: "transient", status: status };
  return { next: "final", refusal: { kind: "unavailable", status: status } };
}
//@ chunk-fe6rs39h.js:29019-29138 placement
function attachServeRefusal(e, n) {
  return {
    ok: !1,
    refusal: e,
    message: `Error: cannot serve cloud session ${n} from this computer: ${describeAttachRefusal(e)}`,
  };
}
//@ chunk-fe6rs39h.js:29138-30351 placement
function describeAttachRefusal(e) {
  switch (e.kind) {
    case "local":
    case "register":
      return `${GNe(e.reason)}.`;
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
      return `the service could not be reached or answered unexpectedly${e.status !== void 0 ? ` (HTTP ${e.status})` : ""}; try again shortly.`;
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
  egress: `${GNe("egress")}.`,
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
  return (
    await y(),
    n() ??
      ((await S(getOriginalCwd())) ? "excluded_repository" : void 0) ??
      r() ??
      (h() ? "flag_off" : void 0) ??
      void 0
  );
}
//@ chunk-fe6rs39h.js:32256-32285 placement
var ATTACH_RESUME_FLAG = "tengu_violin_volute";
//@ chunk-fe6rs39h.js:32285-32381 placement
function isAttachResumeEnabled() {
  try {
    let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(ATTACH_RESUME_FLAG, !1);
    return e === !0 && source !== "override";
  } catch {
    return !1;
  }
}
//@ chunk-fe6rs39h.js:32381-32665 placement
var ATTACH_RESUME_RETRY_MS = [1000, 3000, 8000],
  ho = { kind: "symmetric", ratio: 0.25 },
  fo = 30000,
  mo = 5000,
  go = 3,
  Dn = DoctorLazy(() =>
    u({
      v: T(1),
      state: o(),
      environment_id: o(),
      requested_at: o().min(1),
      resumed_at: o().min(1).nullish(),
      resume: u({ nonce: o().regex(/^[\x21-\x7e]{1,512}$/), until: t0({ offset: !0 }) })
        .nullish()
        .catch(void 0),
    }),
  );
//@ chunk-fe6rs39h.js:32665-32956 placement
async function readLinkedStatus(e, n, s) {
  let r,
    h = await sessionStillBoundTo(e, async () => ((r = await n()), r));
  if (h === void 0 || r === void 0) return;
  if (s === void 0) return h ? "linked" : "ended";
  try {
    let awaitsResume = s.awaitsResume(r);
    if (h && !s.endedHere(r)) return "linked";
    if (awaitsResume) return "awaits_resume";
    return h ? "detached_here" : "ended";
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-fe6rs39h.js:32956-33167 placement
async function waitForLinkedStatus(e, n, s, r = (h) => sleep(h, void 0, { unref: !0 })) {
  let h = await readLinkedStatus(e, n, s);
  if (h === "detached_here") {
    for (let y = 0; y < go; y += 1)
      if ((await r(mo), (h = await readLinkedStatus(e, n, s)), h !== void 0)) break;
  }
  return h === void 0 ? void 0 : h === "linked";
}
/**
 * 链接状态为 detached 且持有恢复请求时，尝试重新签名并恢复本机对云会话的服务（tengu_attach_serve_resume）。
 */
//@ chunk-fe6rs39h.js:33167-34156 placement
function maybeResumeAttach({
  linkedStatus: linkedStatus,
  request: request,
  held: held,
  seams: seams = {},
  ...h
}) {
  if (!(seams.flagOn ?? isAttachResumeEnabled)() || request === void 0 || held === void 0) return;
  let y = decodeTaggedUuid(h.sessionId),
    safeParse = Dn().safeParse(linkedStatus);
  if (y === void 0 || !safeParse.success || safeParse.data.environment_id !== request.environmentId) return;
  let requested_at = safeParse.data.requested_at,
    R = { ...h, sessionUuid: y, held: held, request: request, requestedAt: requested_at },
    k = seams.now ?? Date.now,
    NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY,
    O;
  return {
    resume: () => {
      let z = k() - NEGATIVE_INFINITY >= fo;
      return (
        (O ??= checkAttachResumeAllowed(R, { posted: !1, maySign: z }, seams)
          .catch((j) => (logError(j), "unexpected"))
          .then((j) => {
            if (
              ((O = void 0), logEvent("tengu_attach_serve_resume", { outcome: fromEnum(j) }), j === "resumed")
            )
              ((NEGATIVE_INFINITY = k()), logFeatureOk("attach_serve_resume"));
            else if (
              j === "sign" ||
              j === "refused" ||
              j === "not_same_attach" ||
              j === "unavailable" ||
              j === "not_sent" ||
              j === "unexpected"
            )
              logFeatureBad("attach_serve_resume", j);
            return j === "resumed" || j === "already_resumed" ? "resumed" : "stopped";
          })),
        O
      );
    },
    awaitsResume: (z) =>
      (seams.flagOn ?? isAttachResumeEnabled)() &&
      z.session_status !== "archived" &&
      typeof resumableDetachState(z, R, k()) === "object",
    endedHere: (z) =>
      (seams.flagOn ?? isAttachResumeEnabled)() &&
      isSameDevice(z.bound_device_uuid, R) &&
      parseToolHostStatus(z.tool_host_status, R)?.state === "detached",
  };
}
//@ chunk-fe6rs39h.js:34156-34624 placement
async function checkAttachResumeAllowed(e, n, s) {
  if (!(s.flagOn ?? isAttachResumeEnabled)()) return "flag_off";
  let r = await (s.localIdentity ?? checkAttachServeLocally)({
    sessionId: e.sessionId,
    credentials: e.credentials,
    resuming: !0,
  });
  if (!r.ok || r.accountUuid !== e.held.accountUuid) return "local";
  let h = s.retryDelaysMs ?? ATTACH_RESUME_RETRY_MS;
  for (let y = 0; ; y += 1) {
    let S = await resumeAttachServe(e, n, s);
    if (S !== "retry") return S;
    let w = h[y];
    if (w === void 0) return n.posted ? "unavailable" : "unreadable";
    let R = backoffDelayMs({ attempt: 1, baseMs: w, jitter: ho, random: s.random });
    await (s.sleep ?? sleep)(Math.round(R));
  }
}
//@ chunk-fe6rs39h.js:34624-36104 placement
async function resumeAttachServe(e, n, s) {
  let r;
  try {
    r = await e.readSession();
  } catch (error) {
    return (
      logForDebugging(`[attach-serve] resume could not read the session: ${errorMessage(error)}`),
      error instanceof TeleportOperationError ? "session_read_refused" : "retry"
    );
  }
  if (r.session_status === "archived") return "session_archived";
  let h = parseToolHostStatus(r.tool_host_status, e);
  if (isConnectedAndResumed(h) && isSameDevice(r.bound_device_uuid, e))
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
    return (
      logForDebugging(`[attach-serve] signing the resume proof failed: ${errorMessage(error)}`),
      "sign"
    );
  }
  n.posted = !0;
  let w;
  try {
    w = await (s.post ?? postTeleportOrg)(
      `/v1/code/sessions/${e.sessionId}/device`,
      {
        target_device_id: S.deviceUUID,
        bind_attestation: { kid: S.kid, signature: S.signature },
        bind_attestation_issued_at: S.issuedAt,
      },
      e.credentials,
    );
  } catch (error) {
    return (logForDebugging(`[attach-serve] resume request got no answer: ${errorMessage(error)}`), "retry");
  }
  if (!w.ok) return "not_sent";
  if (
    (logForDebugging(
      `[attach-serve] resume status=${w.status} request_id=${String(w.response.headers?.["request-id"] ?? "")}`,
    ),
    w.status >= 500 || w.status === 408 || w.status === 429)
  )
    return "retry";
  if (w.status !== 200) return w.status === 403 && (await isServingConnected(e)) ? "resumed" : "refused";
  let R = w.data?.session?.bound_device_uuid,
    k = readToolHostStatus(w.data);
  if (typeof R !== "string" || R === "" || k === void 0) return "retry";
  return isSameDevice(R, e) && isConnectedAndResumed(parseToolHostStatus(k, e))
    ? "resumed"
    : "not_same_attach";
}
//@ chunk-fe6rs39h.js:36104-36262 placement
function parseToolHostStatus(e, n) {
  let safeParse = Dn().safeParse(e);
  return safeParse.success &&
    safeParse.data.environment_id === n.request.environmentId &&
    safeParse.data.requested_at === n.requestedAt
    ? safeParse.data
    : void 0;
}
//@ chunk-fe6rs39h.js:36262-36483 placement
function resumableDetachState(e, n, s) {
  let r = parseToolHostStatus(e.tool_host_status, n);
  if (
    r?.state !== "detached" ||
    r.resume == null ||
    (e.bound_device_uuid !== void 0 && !isSameDevice(e.bound_device_uuid, n))
  )
    return "no_offer";
  return Date.parse(r.resume.until) > s ? r.resume : "expired";
}
//@ chunk-q8cqcff6.js:6929-7034 placement
function isCloudFlag(e) {
  return e === "--cloud" || e === "--remote" || e.startsWith("--cloud=") || e.startsWith("--remote=");
}
//@ chunk-q8cqcff6.js:7034-7133 placement
function isAttachServeMode() {
  return (
    eagerParseCliFlag("--attach-serve") !== void 0 ||
    (eagerFindCliArg(isCloudFlag) !== -1 &&
      detectNonInteractiveLaunch() &&
      !eagerHasCliFlag("-p") &&
      !eagerHasCliFlag("--print"))
  );
}
//@ chunk-q8cqcff6.js:7133-7192 placement
function zso(e) {
  return e !== "globalConfig" && REPO_DIR_SETTING_SOURCES.has(e) && isAttachServeMode();
}
//@ chunk-q8cqcff6.js:7192-7260 placement
function Kso() {
  return withHostOwnedEnvGuard(() => env.CLAUDE_CODE_IGNORE_PERSISTED_TRUST);
}
//@ chunk-q8cqcff6.js:7260-7334 placement
function Vso(e) {
  return (
    e !== "globalConfig" &&
    REPO_DIR_SETTING_SOURCES.has(e) &&
    (isAttachServeMode() || (getIsNonInteractiveSession() && Kso()))
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
  ],
  pinCache = ge(new Map(), (e) => e.clear());
/**
 * 是否固定使用已存储的登录（缓存首次判断结果，可由环境变量开启）。
 */
//@ chunk-q8cqcff6.js:7461-7580 placement
function isStoredLoginPinned() {
  let e = pinCache.get("isPinned") ?? env.CLAUDE_CODE_REMOTE_TOOLS_PIN_STORED_LOGIN === !0;
  return (pinCache.set("isPinned", e), e);
}
//@ chunk-q8cqcff6.js:7580-7604 placement
function _us() {
  return !0;
}
//@ chunk-q8cqcff6.js:7604-7669 placement
function isRemoteToolsPinStoredLogin() {
  return "CLAUDE_CODE_REMOTE_TOOLS_PIN_STORED_LOGIN";
}
//@ chunk-q8cqcff6.js:7669-7813 placement
function formatServeHelperStoppedError(e) {
  return `Error: serve helper stopped: ${e} does not resolve to this computer's stored claude.ai login on Anthropic's own service`;
}
/**
 * 远程工具固定使用存储登录时，检查 base URL 与 OAuth 端点是否为官方第一方（本地 OAuth 构建另行判断），不符时返回 base_url 或 oauth_endpoint。
 */
//@ chunk-q8cqcff6.js:7813-8191 placement
function getServeHelperStopReason() {
  let e = builtInOauthConfig(),
    n = e.OAUTH_FILE_SUFFIX === "-local-oauth",
    parse = URL.parse(env.ANTHROPIC_BASE_URL ?? ""),
    s = isActualFirstPartyAnthropicBaseUrl() && (parse === null || parse.protocol === "https:"),
    S = n && pw(parse?.hostname ?? "");
  if (!s && !S) return "base_url";
  try {
    let E = getOauthConfig();
    if (OAUTH_ENDPOINT_KEYS.some((h) => E[h] !== e[h])) return "oauth_endpoint";
  } catch {
    return "oauth_endpoint";
  }
  if (n && OAUTH_ENDPOINT_KEYS.some((E) => !pw(URL.parse(e[E])?.hostname ?? ""))) return "oauth_endpoint";
  return;
}
/**
 * 固定使用已存储登录但服务助手不满足条件时，输出错误并以配置错误码退出。
 */
//@ chunk-q8cqcff6.js:8191-8319 placement
function exitIfServeHelperMisconfigured() {
  if (!isStoredLoginPinned()) return;
  let e = getServeHelperStopReason();
  if (e === void 0) return;
  try {
    process.stderr.write(`${formatServeHelperStoppedError(e)}
`);
  } finally {
    process.exit(EXIT_CONFIG_ERROR);
  }
}
/**
 * 受管设置询问的进程级状态（询问内容、是否询问中、读取身份、是否已告知），可重置。
 */
//@ chunk-q8cqcff6.js:8319-8448 placement
var managedSettingsAskState = ge({ asks: void 0, isAsking: !1, readAs: void 0, told: void 0 }, (e) => {
  ((e.asks = void 0), (e.isAsking = !1), (e.readAs = void 0), (e.told = void 0));
});
/**
 * 读取是否存在托管设置（可通过注入的 asks 回调），递归调用时返回上次结果；结果变化时使策略层缓存失效。
 */
//@ chunk-q8cqcff6.js:8448-8694 placement
function hasManagedSettingsCached() {
  let e = managedSettingsAskState;
  if (e.isAsking) return ((e.readAs ??= hasManagedSettings()), e.readAs);
  let n = hasManagedSettings();
  if (e.asks !== void 0) {
    e.isAsking = !0;
    try {
      n = e.asks();
    } finally {
      e.isAsking = !1;
    }
  }
  let r = e.readAs !== void 0 && e.readAs !== n;
  if (((e.readAs = n), r)) is().invalidatePolicyLayer();
  return n;
}
//@ chunk-q8cqcff6.js:8694-8707 placement
var lIn = 5000;
//@ chunk-q8cqcff6.js:8707-8761 placement
function eOt(e) {
  is().internalWrites.set(e, Date.now());
}
/**
 * 若某路径在时间窗口内有内部写入记录则消费该记录并返回 true，用于忽略自身写入触发的变更。
 */
//@ chunk-q8cqcff6.js:8761-8877 placement
function consumeInternalWrite(e, n) {
  let internalWrites = is().internalWrites,
    s = internalWrites.get(e);
  if (s !== void 0 && Date.now() - s < n) return (internalWrites.delete(e), !0);
  return !1;
}
//@ chunk-q8cqcff6.js:8877-8920 placement
function IRi() {
  is().internalWrites.clear();
}

export {
  Kso,
  formatServeHelperStoppedError,
  isAttachServeMode,
  isStoredLoginPinned,
  managedSettingsAskState,
  _us,
  isRemoteToolsPinStoredLogin,
  hasManagedSettingsCached,
  Vso,
  zso,
  eOt,
  IRi,
  consumeInternalWrite,
  lIn,
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

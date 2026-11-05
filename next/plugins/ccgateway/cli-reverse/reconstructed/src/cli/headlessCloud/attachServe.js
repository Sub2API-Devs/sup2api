/**
 * cli/headlessCloud/attachServe.ts
 *
 * 2.1.316 新增：本机为云会话提供工具（attach serve）：设备链接重试、拒绝/关闭原因文案、恢复服务。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5fn9rb8r.js (19), chunk-keyy05re.js (34)
 * attribution: placement 52, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  eagerParseCliFlag,
  eagerFindCliArg,
  detectNonInteractiveLaunch,
  eagerHasCliFlag,
} from "../../utils/cliArgs.js";
import { REPO_DIR_SETTING_SOURCES } from "../../utils/settings/constants.js";
import { withHostOwnedEnvGuard } from "../../utils/plugins/securityDefaultPlugin.js";
import { env } from "../../utils/env.js";
import { getIsNonInteractiveSession, getOriginalCwd } from "../../bootstrap/state.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { builtInOauthConfig, getOauthConfig } from "../../constants/oauth.js";
import { isActualFirstPartyAnthropicBaseUrl } from "../../utils/model/providers.js";
import { isLoopbackHost } from "../../utils/localhost.js";
import { EXIT_CONFIG_ERROR } from "../../utils/exitCodes.js";
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import { commandSyncNameState } from "../../utils/settings/commandSyncNames.js";
import { isViolinWoodEnabled } from "../../services/analytics/violinGates.js";
import {
  checkGate_CACHED_OR_BLOCKING,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { ATTACH_SERVE_FLAG } from "./deviceHooks.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { trustedDeviceHeaders } from "../../utils/teleport/api.js";
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
import { DoctorLazy } from "../handlers/util.js";
import { objectSchema, literal, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { parseToolOutputSchema } from "../../services/mcp/schemaParse.js";
import { sessionStillBoundTo } from "./attachDeviceBinding.js";
import { isSameDevice, isConnectedAndResumed, isServingConnected } from "./hostPermissions.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5fn9rb8r.js:7067-7172 placement
function isCloudFlag(flag) {
  return (
    flag === "--cloud" || flag === "--remote" || flag.startsWith("--cloud=") || flag.startsWith("--remote=")
  );
}
//@ chunk-5fn9rb8r.js:7172-7272 placement
function isAttachServeMode() {
  return (
    eagerParseCliFlag("--attach-serve") !== undefined ||
    (eagerFindCliArg(isCloudFlag) !== -1 &&
      detectNonInteractiveLaunch() &&
      !eagerHasCliFlag("-p") &&
      !eagerHasCliFlag("--print"))
  );
}
//@ chunk-5fn9rb8r.js:7272-7332 placement
/**
 * attach serve 模式下判断某设置来源是否为仓库目录级（非 globalConfig 且在 REPO_DIR_SETTING_SOURCES 内）。
 */
function isAttachServeRepoScopedSource(sourceName) {
  return sourceName !== "globalConfig" && REPO_DIR_SETTING_SOURCES.has(sourceName) && isAttachServeMode();
}
//@ chunk-5fn9rb8r.js:7332-7400 placement
/**
 * 在宿主环境守卫内读取 CLAUDE_CODE_IGNORE_PERSISTED_TRUST（是否忽略持久化的信任）。
 */
function ignoresPersistedTrust() {
  return withHostOwnedEnvGuard(() => env.CLAUDE_CODE_IGNORE_PERSISTED_TRUST);
}
//@ chunk-5fn9rb8r.js:7400-7475 placement
/**
 * 仓库目录级设置来源在 attach serve 模式、或非交互且忽略持久信任时视为生效。
 */
function isAttachServeRepoScopedSourceOrNonInteractive(sourceName) {
  return (
    sourceName !== "globalConfig" &&
    REPO_DIR_SETTING_SOURCES.has(sourceName) &&
    (isAttachServeMode() || (getIsNonInteractiveSession() && ignoresPersistedTrust()))
  );
}
//@ chunk-5fn9rb8r.js:7475-7602 placement
var OAUTH_ENDPOINT_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var pinCache;
deferInit("chunk-5fn9rb8r.js:7475", () => {
  OAUTH_ENDPOINT_KEYS = [
    "BASE_API_URL",
    "TOKEN_URL",
    "CLAUDE_AI_ORIGIN",
    "API_KEY_URL",
    "ROLES_URL",
    "MCP_PROXY_URL",
  ];
  pinCache = identity_2(new Map(), (cache) => cache.clear());
});
//@ chunk-5fn9rb8r.js:7602-7721 placement
/**
 * 是否固定使用已存储的登录（缓存首次判断结果，可由环境变量开启）。
 */
function isStoredLoginPinned() {
  let pinned = pinCache.get("isPinned") ?? env.CLAUDE_CODE_REMOTE_TOOLS_PIN_STORED_LOGIN === true;
  pinCache.set("isPinned", pinned);
  return pinned;
}
//@ chunk-5fn9rb8r.js:7721-7745 placement
/**
 * 恒返回 true 的占位判断（attach serve 相关构建期开关）。
 */
function isAlwaysTrue() {
  return true;
}
//@ chunk-5fn9rb8r.js:7745-7810 placement
function isRemoteToolsPinStoredLogin() {
  return "CLAUDE_CODE_REMOTE_TOOLS_PIN_STORED_LOGIN";
}
//@ chunk-5fn9rb8r.js:7810-7954 placement
function formatServeHelperStoppedError(target) {
  return `Error: serve helper stopped: ${target} does not resolve to this computer's stored claude.ai login on Anthropic's own service`;
}
//@ chunk-5fn9rb8r.js:7954-8332 placement
/**
 * 远程工具固定使用存储登录时，检查 base URL 与 OAuth 端点是否为官方第一方（本地 OAuth 构建另行判断），不符时返回 base_url 或 oauth_endpoint。
 */
function getServeHelperStopReason() {
  let shippedConfig = builtInOauthConfig();
  let isLocalOauth = shippedConfig.OAUTH_FILE_SUFFIX === "-local-oauth";
  let baseUrl = URL.parse(env.ANTHROPIC_BASE_URL ?? "");
  let isFirstParty =
    isActualFirstPartyAnthropicBaseUrl() && (baseUrl === null || baseUrl.protocol === "https:");
  let isLocalLoopback = isLocalOauth && isLoopbackHost(baseUrl?.hostname ?? "");
  if (!isFirstParty && !isLocalLoopback) return "base_url";
  try {
    let oauthConfig = getOauthConfig();
    if (OAUTH_ENDPOINT_KEYS.some((key) => oauthConfig[key] !== shippedConfig[key])) return "oauth_endpoint";
  } catch {
    return "oauth_endpoint";
  }
  if (
    isLocalOauth &&
    OAUTH_ENDPOINT_KEYS.some((key) => !isLoopbackHost(URL.parse(shippedConfig[key])?.hostname ?? ""))
  )
    return "oauth_endpoint";
  return;
}
//@ chunk-5fn9rb8r.js:8332-8460 placement
/**
 * 固定使用已存储登录但服务助手不满足条件时，输出错误并以配置错误码退出。
 */
function exitIfServeHelperMisconfigured() {
  if (!isStoredLoginPinned()) return;
  let target = getServeHelperStopReason();
  if (target === undefined) return;
  try {
    process.stderr.write(`${formatServeHelperStoppedError(target)}
`);
  } finally {
    process.exit(EXIT_CONFIG_ERROR);
  }
}
//@ chunk-5fn9rb8r.js:8460-8589 placement
/**
 * 受管设置询问的进程级状态（询问内容、是否询问中、读取身份、是否已告知），可重置。
 */
var managedSettingsAskState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5fn9rb8r.js:8460", () => {
  managedSettingsAskState = identity_2(
    {
      asks: undefined,
      isAsking: false,
      readAs: undefined,
      told: undefined,
    },
    (state) => {
      state.asks = undefined;
      state.isAsking = false;
      state.readAs = undefined;
      state.told = undefined;
    },
  );
});
//@ chunk-5fn9rb8r.js:8589-8835 placement
/**
 * 读取是否存在托管设置（可通过注入的 asks 回调），递归调用时返回上次结果；结果变化时使策略层缓存失效。
 */
function hasManagedSettingsCached() {
  let state = managedSettingsAskState;
  if (state.isAsking) {
    state.readAs ??= hasManagedSettings();
    return state.readAs;
  }
  let current = hasManagedSettings();
  if (state.asks !== undefined) {
    state.isAsking = true;
    try {
      current = state.asks();
    } finally {
      state.isAsking = false;
    }
  }
  let didChange = state.readAs !== undefined && state.readAs !== current;
  state.readAs = current;
  if (didChange) commandSyncNameState().invalidatePolicyLayer();
  return current;
}
//@ chunk-5fn9rb8r.js:8835-8848 placement
/**
 * 内部写入记录的有效窗口 5000ms：窗口内同路径写入事件视为自身写入而忽略。
 */
var INTERNAL_WRITE_WINDOW_MS = 5000;
//@ chunk-5fn9rb8r.js:8848-8928 placement
/**
 * 按宿主记录一次内部写入时间戳，供 consumeInternalWrite 在窗口内消费。
 */
function markInternalWrite(key) {
  let state = commandSyncNameState();
  state.internalWrites.set(key, Date.now());
  state.noteOwnWrite(key);
}
//@ chunk-5fn9rb8r.js:8928-9044 placement
/**
 * 若某路径在时间窗口内有内部写入记录则消费该记录并返回 true，用于忽略自身写入触发的变更。
 */
function consumeInternalWrite(key, windowMs) {
  let internalWrites = commandSyncNameState().internalWrites;
  let writtenAt = internalWrites.get(key);
  if (writtenAt !== undefined && Date.now() - writtenAt < windowMs) {
    internalWrites.delete(key);
    return true;
  }
  return false;
}
//@ chunk-5fn9rb8r.js:9044-9120 layout
function withdrawInternalWrite(key) {
  let state = commandSyncNameState();
  state.internalWrites.delete(key);
  state.withdrawOwnWrite(key);
}
//@ chunk-5fn9rb8r.js:9120-9163 placement
/**
 * 清空全部内部写入记录（重新开始监听外部变更时用）。
 */
function clearInternalWrites() {
  commandSyncNameState().internalWrites.clear();
}
//@ chunk-keyy05re.js:18472-18545 placement
async function isAttachServeEnabled() {
  try {
    return (await isViolinWoodEnabled()) && (await checkGate_CACHED_OR_BLOCKING(ATTACH_SERVE_FLAG));
  } catch {
    return false;
  }
}
//@ chunk-keyy05re.js:18545-18769 placement
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
//@ chunk-keyy05re.js:18769-18938 placement
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
//@ chunk-keyy05re.js:18938-19054 placement
function notArmedHereLookup(sessionRecordElsewhere) {
  return {
    handle: undefined,
    why: "not_armed_here",
    ...(sessionRecordElsewhere.hasOwnSessionRecord !== true && {
      noRecordOnThisMachine: true,
    }),
  };
}
//@ chunk-keyy05re.js:19054-19251 placement
var LATE_BIND_REFUSED = "late_bind_refused";
var TOOL_HOST_GRANT_REFUSED = "tool_host_grant_refused";
var DEVICE_NOT_FOUND = "device_not_found";
var BIND_ATTESTATION_STALE = "bind_attestation_stale";
var SESSION_ALREADY_BOUND_ELSEWHERE = "session_already_bound_elsewhere";
var SESSION_WORKER_BUSY = "session_worker_busy";
var TOOL_HOST_PROOF_INVALID = "tool_host_proof_invalid";
//@ chunk-keyy05re.js:19251-22419 placement
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
//@ chunk-keyy05re.js:22419-22461 placement
function isKnownAttachRefusal(kind) {
  return Object.hasOwn(ATTACH_REFUSAL_MESSAGES, kind);
}
//@ chunk-keyy05re.js:22461-22538 placement
var ATTACH_LINK_RETRY_DELAYS_MS = [2000, 4000, 8000, 12000, 15000, 15000, 15000];
var ATTACH_LINK_TOTAL_TIMEOUT_MS = 90000;
var ATTACH_LINK_TRANSIENT_RETRY_MS = [2000, 4000, 8000];
//@ chunk-keyy05re.js:22538-22674 placement
async function postTeleportOrg(url, body, credentials) {
  return apiClient.post(url, body, {
    auth: "teleport-org",
    headers: await trustedDeviceHeaders(),
    timeout: 15000,
    validateStatus: () => true,
    credentials,
  });
}
//@ chunk-keyy05re.js:22674-23479 placement
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
  let proofSent = {
    form: undefined,
    retriedAsV1: false,
  };
  let linkResult = await linkDeviceWithRetries({
    sessionId,
    orgUuid,
    credentials,
    request,
    localIdentity,
    prepared,
    handsKeyToLaterReaders,
    seams,
    proofSent,
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
  let proofFields = proofSent.form !== undefined && {
    proof: fromEnum(proofSent.form),
    proof_v1_retry: proofSent.retriedAsV1,
  };
  if (linkResult.ok) {
    logEvent("tengu_attach_serve_link", {
      outcome: lit("linked"),
      ...proofFields,
    });
    logFeatureOk("attach_serve_link");
  } else {
    let detail =
      linkResult.refusal.kind === "refused"
        ? linkResult.refusal.subReason
        : "reason" in linkResult.refusal
          ? linkResult.refusal.reason
          : undefined;
    logEvent("tengu_attach_serve_link", {
      outcome: fromEnum(linkResult.refusal.kind),
      ...(detail !== undefined && {
        detail: fromEnum(detail),
      }),
      ...proofFields,
    });
    logFeatureBad("attach_serve_link", linkResult.refusal.kind);
  }
  return linkResult;
}
//@ chunk-keyy05re.js:23479-24060 placement
/**
 * 本地预检能否为该云会话服务：会话 id 合法、本机服务开关、设备绑定器就绪。
 */
async function checkAttachServeLocally({ sessionId, credentials, seams = {} }) {
  try {
    let sessionUuid = decodeTaggedUuid(sessionId);
    if (sessionUuid === undefined)
      return attachServeRefusal(
        {
          kind: "bad_session_id",
        },
        sessionId,
      );
    let servingOffReason = await (seams.servingOff ?? servingOffReason_2)();
    if (servingOffReason !== undefined)
      return attachServeRefusal(
        {
          kind: "serving_off",
          reason: servingOffReason,
        },
        sessionId,
      );
    let accountUuid;
    try {
      accountUuid = getStoredOauthAccountInfo()?.accountUuid;
    } catch {
      accountUuid = undefined;
    }
    let identity = await (seams.identity ?? localBindIdentity)({
      accountUuid,
      credentials,
    });
    if (!identity.ok)
      return attachServeRefusal(
        {
          kind: "local",
          reason: identity.error,
        },
        sessionId,
      );
    return {
      ok: true,
      sessionUuid,
      accountUuid: identity.value.accountUuid,
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
//@ chunk-keyy05re.js:24060-24394 placement
async function registerAndLinkDevice({
  sessionId,
  credentials,
  localIdentity,
  handsKeyToLaterReaders = false,
  seams = {},
}) {
  let localCheck =
    localIdentity ??
    (await checkAttachServeLocally({
      sessionId,
      credentials,
      seams,
    }));
  if (!localCheck.ok) return localCheck;
  let registered = await registerDeviceForAttach({
    accountUuid: localCheck.accountUuid,
    credentials,
    readBack: !handsKeyToLaterReaders,
    seams,
  });
  return registered.ok
    ? {
        ok: true,
        local: localCheck,
        registered,
      }
    : attachServeRefusal(
        {
          kind: "register",
          reason: registered.reason,
        },
        sessionId,
      );
}
//@ chunk-keyy05re.js:24394-26939 placement
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
  let preparedLink = await (prepared ??
    registerAndLinkDevice({
      sessionId,
      credentials,
      localIdentity,
      handsKeyToLaterReaders,
      seams,
    }));
  if (!preparedLink.ok) return preparedLink;
  let { sessionUuid, accountUuid } = preparedLink.local;
  let registered = preparedLink.registered;
  let busyRetryDelaysMs = seams.busyRetryDelaysMs ?? ATTACH_LINK_RETRY_DELAYS_MS;
  let transientRetryDelaysMs = seams.transientRetryDelaysMs ?? ATTACH_LINK_TRANSIENT_RETRY_MS;
  let sleep_2 = seams.sleep ?? sleep;
  let deadline = Date.now() + ATTACH_LINK_TOTAL_TIMEOUT_MS;
  let busyRetries = 0;
  let transientRetries = 0;
  let didForgetRow = false;
  let capabilities;
  if (request !== undefined)
    try {
      let declared = await (seams.linkCapabilities ?? noopAsync)();
      capabilities = declared === undefined ? undefined : canonicalLinkCapabilities(declared);
    } catch (error) {
      logForDebugging(
        `[attach-serve] could not read what this computer declares on a link; declaring nothing: ${errorMessage(error)}`,
      );
    }
  for (;;) {
    let linkResult;
    try {
      let linkArgs = {
        orgUuid,
        accountUuid,
        sessionUuid,
        deviceUUID: registered.deviceUUID,
        key: registered.key,
      };
      linkResult =
        request === undefined
          ? await (seams.sign ?? signSessionLateLink)(linkArgs)
          : await (seams.signRequest ?? signToolHostLink)({
              ...linkArgs,
              request,
              ...(capabilities !== undefined && {
                capabilities,
              }),
            });
      proofSent.form = request === undefined ? "session_only" : capabilities === undefined ? "v1" : "v2";
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
    let settled = await Promise.resolve()
      .then(() =>
        (seams.post ?? postTeleportOrg)(
          `/v1/code/sessions/${sessionId}/device`,
          {
            target_device_id: linkResult.deviceUUID,
            bind_attestation: {
              kid: linkResult.kid,
              signature: linkResult.signature,
            },
            bind_attestation_issued_at: linkResult.issuedAt,
            ...(capabilities !== undefined && {
              capabilities,
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
    let verdict =
      "error" in settled
        ? {
            next: "transient",
            status: undefined,
          }
        : classifyAttachLinkResponse(settled.result, registered.deviceUUID);
    switch (verdict.next) {
      case "linked":
        return {
          ok: true,
          deviceId: registered.deviceUUID,
          toolHostStatus: verdict.toolHostStatus,
          ...(handsKeyToLaterReaders && {
            heldKey: {
              accountUuid,
              rowPk: registered.deviceUUID.toLowerCase(),
              key: registered.key,
            },
          }),
        };
      case "final":
        return attachServeRefusal(verdict.refusal, sessionId);
      case "proof_invalid": {
        if (capabilities === undefined)
          return attachServeRefusal(
            {
              kind: "refused",
              subReason: TOOL_HOST_PROOF_INVALID,
            },
            sessionId,
          );
        capabilities = undefined;
        proofSent.retriedAsV1 = true;
        logForDebugging(
          "[attach-serve] the service did not take the v2 link proof; sending the v1 proof without the capability list",
        );
        continue;
      }
      case "busy": {
        let delayMs = busyRetryDelaysMs[busyRetries];
        if (delayMs === undefined || Date.now() + delayMs > deadline)
          return attachServeRefusal(
            {
              kind: "busy",
            },
            sessionId,
          );
        busyRetries += 1;
        logForDebugging(
          `[attach-serve] session busy; retrying the link in ${delayMs} ms (${busyRetries}/${busyRetryDelaysMs.length})`,
        );
        await sleep_2(delayMs);
        continue;
      }
      case "transient": {
        let delayMs = transientRetryDelaysMs[transientRetries];
        if (delayMs === undefined)
          return attachServeRefusal(
            {
              kind: "unavailable",
              status: verdict.status,
            },
            sessionId,
          );
        transientRetries += 1;
        logForDebugging(
          `[attach-serve] link request failed transiently (status ${verdict.status ?? "none"}: ${"error" in settled ? errorMessage(settled.error) : "server error"}); retrying in ${delayMs} ms`,
        );
        await sleep_2(delayMs);
        continue;
      }
      case "device_unknown": {
        if (didForgetRow)
          return attachServeRefusal(
            {
              kind: "device_unknown",
            },
            sessionId,
          );
        didForgetRow = true;
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
//@ chunk-keyy05re.js:26939-27561 placement
async function registerDeviceForAttach({ accountUuid, credentials, readBack, seams }) {
  try {
    let registered = await (seams.register ?? registerDeviceCached)(
      accountUuid,
      deviceDisplayName(),
      credentials,
    );
    let rowPk = readBack
      ? await (seams.readCachedRow ?? registeredRowPk)(accountUuid, credentials)
      : normalizeUuidOrNull(registered.deviceUUID)?.toLowerCase();
    if (rowPk !== registered.deviceUUID.toLowerCase()) {
      logForDebugging(
        `[attach-serve] registered device row=${registered.deviceUUID} ${readBack ? `but the local store reads ${rowPk ?? "nothing"}` : "is not a device row id"}; not linking`,
      );
      return {
        ok: false,
        reason: "register",
      };
    }
    return {
      ok: true,
      ...registered,
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
//@ chunk-keyy05re.js:27561-27628 placement
var CLOUD_SESSION_ID_PATTERN = /^cse_[A-Za-z0-9_]{1,124}$/;
var CLOUD_ENVIRONMENT_ID_PATTERN = /^env_[A-Za-z0-9_-]{1,124}$/;
//@ chunk-keyy05re.js:27628-27907 placement
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
//@ chunk-keyy05re.js:27907-28053 placement
function readToolHostStatus(body) {
  let externalMetadata = body?.session?.external_metadata;
  return typeof externalMetadata === "object" &&
    externalMetadata !== null &&
    "tool_host_status" in externalMetadata
    ? (externalMetadata.tool_host_status ?? undefined)
    : undefined;
}
//@ chunk-keyy05re.js:28053-28116 placement
function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
//@ chunk-keyy05re.js:28116-29414 placement
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
  let { status, data: body } = result;
  logForDebugging(
    `[attach-serve] link status=${status} request_id=${String(result.response.headers?.["request-id"] ?? "")}`,
  );
  if (status === 200) {
    let lower = nonEmptyString(body?.session?.bound_device_uuid)?.toLowerCase();
    return lower === undefined || lower === deviceUUID.toLowerCase()
      ? {
          next: "linked",
          toolHostStatus: readToolHostStatus(body),
        }
      : {
          next: "final",
          refusal: {
            kind: "bound_elsewhere",
          },
        };
  }
  let resource = nonEmptyString(body?.error?.resource);
  let subReason = nonEmptyString(body?.error?.sub_reason);
  let details = nonEmptyString(body?.error?.details);
  if (status === 409) {
    if (details === SESSION_WORKER_BUSY)
      return {
        next: "busy",
      };
    if (details === SESSION_ALREADY_BOUND_ELSEWHERE)
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
    if (resource === DEVICE_NOT_FOUND)
      return {
        next: "device_unknown",
      };
    if (resource === BIND_ATTESTATION_STALE)
      return {
        next: "final",
        refusal: {
          kind: "clock",
        },
      };
    if (resource === LATE_BIND_REFUSED && subReason === TOOL_HOST_PROOF_INVALID)
      return {
        next: "proof_invalid",
      };
    if (resource === LATE_BIND_REFUSED || resource === TOOL_HOST_GRANT_REFUSED)
      return {
        next: "final",
        refusal: {
          kind: "refused",
          subReason: subReason !== undefined && isKnownAttachRefusal(subReason) ? subReason : "other",
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
//@ chunk-keyy05re.js:29414-29533 placement
function attachServeRefusal(refusal, sessionId) {
  return {
    ok: false,
    refusal,
    message: `Error: cannot serve cloud session ${sessionId} from this computer: ${describeAttachRefusal(refusal)}`,
  };
}
//@ chunk-keyy05re.js:29533-30746 placement
function describeAttachRefusal(refusal) {
  switch (refusal.kind) {
    case "local":
    case "register":
      return `${deviceBindingRefusalText(refusal.reason)}.`;
    case "serving_off":
      return SERVING_OFF_MESSAGES[refusal.reason];
    case "bad_session_id":
      return "that is not a cloud session id.";
    case "refused":
      return refusal.subReason === "other"
        ? "the server refused to link the session to this computer."
        : `${ATTACH_REFUSAL_MESSAGES[refusal.subReason]}.`;
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
      return `the service could not be reached or answered unexpectedly${refusal.status !== undefined ? ` (HTTP ${refusal.status})` : ""}; try again shortly.`;
  }
}
//@ chunk-keyy05re.js:30746-32089 placement
var SERVING_OFF_MESSAGES; // deferred: uses deviceBindingRefusalText (../../bridge/deviceBinding.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-keyy05re.js:30746", () => {
  SERVING_OFF_MESSAGES = {
    external_build: "this Claude Code cannot serve tools to cloud sessions.",
    windows: "serving tools from a Windows computer is not available yet.",
    muted: "serving tools from this computer is paused right now; try again in a few minutes.",
    switch_off: "serving tools is switched off on this computer.",
    flag_off: "using this computer from cloud sessions is switched off for your account right now.",
    profile_dirs_unread:
      "this computer is still reading where its shell profile lives; try again in a moment.",
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
  };
});
//@ chunk-keyy05re.js:32089-32116 placement
async function noopAsync() {
  return;
}
//@ chunk-keyy05re.js:32116-32552 placement
async function servingOffReason_2() {
  let [
    { remoteToolServingOffReason },
    { servedToolsUnavailableReason },
    { isViolinWoodServedOff },
    { primeWindowsProfileDirs },
    { inExcludedRepository },
  ] = await Promise.all([
    import("../../services/remoteTools/servingGates.js"),
    import("../../remote/tools/servedToolsAttachOptions.lazy.js"),
    import("../../services/analytics/violinGates.js"),
    import("../../services/remoteTools/windowsProfileDirs.js"),
    import("../../utils/git/excludedRepository.js"),
  ]);
  await primeWindowsProfileDirs();
  return (
    remoteToolServingOffReason() ??
    ((await inExcludedRepository(getOriginalCwd())) ? "excluded_repository" : undefined) ??
    servedToolsUnavailableReason() ??
    (isViolinWoodServedOff() ? "flag_off" : undefined)
  );
}
//@ chunk-keyy05re.js:32552-32581 placement
var ATTACH_RESUME_FLAG = "tengu_violin_volute";
//@ chunk-keyy05re.js:32581-32677 placement
function isAttachResumeEnabled() {
  try {
    let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(ATTACH_RESUME_FLAG, false);
    return value === true && source !== "override";
  } catch {
    return false;
  }
}
//@ chunk-keyy05re.js:32677-32961 placement
var ATTACH_RESUME_RETRY_MS; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ATTACH_RESUME_BACKOFF_JITTER;
var ATTACH_LINK_STATUS_STALE_MS;
var ATTACH_RESUME_POLL_MS;
var ATTACH_RESUME_MAX_ATTEMPTS;
var linkedToolHostStatusSchema;
deferInit("chunk-keyy05re.js:32677", () => {
  ATTACH_RESUME_RETRY_MS = [1000, 3000, 8000];
  ATTACH_RESUME_BACKOFF_JITTER = {
    kind: "symmetric",
    ratio: 0.25,
  };
  ATTACH_LINK_STATUS_STALE_MS = 30000;
  ATTACH_RESUME_POLL_MS = 5000;
  ATTACH_RESUME_MAX_ATTEMPTS = 3;
  linkedToolHostStatusSchema = DoctorLazy(() =>
    objectSchema({
      v: literal(1),
      state: stringSchema(),
      environment_id: stringSchema(),
      requested_at: stringSchema().min(1),
      resumed_at: stringSchema().min(1).nullish(),
      resume: objectSchema({
        nonce: stringSchema().regex(/^[\x21-\x7e]{1,512}$/),
        until: parseToolOutputSchema({
          offset: true,
        }),
      })
        .nullish()
        .catch(undefined),
    }),
  );
});
//@ chunk-keyy05re.js:32961-33252 placement
async function readLinkedStatus(deviceId, readSession, resumeState) {
  let session;
  let isBound = await sessionStillBoundTo(deviceId, async () => {
    session = await readSession();
    return session;
  });
  if (isBound === undefined || session === undefined) return;
  if (resumeState === undefined) return isBound ? "linked" : "ended";
  try {
    let awaitsResume = resumeState.awaitsResume(session);
    if (isBound && !resumeState.endedHere(session)) return "linked";
    if (awaitsResume) return "awaits_resume";
    return isBound ? "detached_here" : "ended";
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-keyy05re.js:33252-33463 placement
async function waitForLinkedStatus(
  deviceId,
  readSession,
  resumeState,
  sleepFn = (ms) =>
    sleep(ms, undefined, {
      unref: true,
    }),
) {
  let linkedStatus = await readLinkedStatus(deviceId, readSession, resumeState);
  if (linkedStatus === "detached_here") {
    for (let attempt = 0; attempt < ATTACH_RESUME_MAX_ATTEMPTS; attempt += 1) {
      await sleepFn(ATTACH_RESUME_POLL_MS);
      linkedStatus = await readLinkedStatus(deviceId, readSession, resumeState);
      if (linkedStatus !== undefined) break;
    }
  }
  return linkedStatus === undefined ? undefined : linkedStatus === "linked";
}
//@ chunk-keyy05re.js:33463-34452 placement
/**
 * 链接状态为 detached 且持有恢复请求时，尝试重新签名并恢复本机对云会话的服务（tengu_attach_serve_resume）。
 */
function maybeResumeAttach({ linkedStatus, request, held, seams = {}, ...attachContext }) {
  if (!(seams.flagOn ?? isAttachResumeEnabled)() || request === undefined || held === undefined) return;
  let sessionUuid = decodeTaggedUuid(attachContext.sessionId);
  let parsedStatus = linkedToolHostStatusSchema().safeParse(linkedStatus);
  if (
    sessionUuid === undefined ||
    !parsedStatus.success ||
    parsedStatus.data.environment_id !== request.environmentId
  )
    return;
  let requestedAt = parsedStatus.data.requested_at;
  let resumeArgs = {
    ...attachContext,
    sessionUuid,
    held,
    request,
    requestedAt,
  };
  let now = seams.now ?? Date.now;
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let resumePromise;
  return {
    resume: () => {
      let maySign = now() - NEGATIVE_INFINITY >= ATTACH_LINK_STATUS_STALE_MS;
      resumePromise ??= checkAttachResumeAllowed(
        resumeArgs,
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
        .then((outcome) => {
          resumePromise = undefined;
          logEvent("tengu_attach_serve_resume", {
            outcome: fromEnum(outcome),
          });
          if (outcome === "resumed") {
            NEGATIVE_INFINITY = now();
            logFeatureOk("attach_serve_resume");
          } else if (
            outcome === "sign" ||
            outcome === "refused" ||
            outcome === "not_same_attach" ||
            outcome === "unavailable" ||
            outcome === "not_sent" ||
            outcome === "unexpected"
          )
            logFeatureBad("attach_serve_resume", outcome);
          return outcome === "resumed" || outcome === "already_resumed" ? "resumed" : "stopped";
        });
      return resumePromise;
    },
    awaitsResume: (session) =>
      (seams.flagOn ?? isAttachResumeEnabled)() &&
      session.session_status !== "archived" &&
      typeof resumableDetachState(session, resumeArgs, now()) === "object",
    endedHere: (session) =>
      (seams.flagOn ?? isAttachResumeEnabled)() &&
      isSameDevice(session.bound_device_uuid, resumeArgs) &&
      parseToolHostStatus(session.tool_host_status, resumeArgs)?.state === "detached",
  };
}
//@ chunk-keyy05re.js:34452-34908 placement
async function checkAttachResumeAllowed(args, state, seams) {
  if (!(seams.flagOn ?? isAttachResumeEnabled)()) return "flag_off";
  let localCheck = await (seams.localIdentity ?? checkAttachServeLocally)({
    sessionId: args.sessionId,
    credentials: args.credentials,
  });
  if (!localCheck.ok || localCheck.accountUuid !== args.held.accountUuid) return "local";
  let retryDelaysMs = seams.retryDelaysMs ?? ATTACH_RESUME_RETRY_MS;
  for (let attempt = 0; ; attempt += 1) {
    let outcome = await resumeAttachServe(args, state, seams);
    if (outcome !== "retry") return outcome;
    let baseDelayMs = retryDelaysMs[attempt];
    if (baseDelayMs === undefined) return state.posted ? "unavailable" : "unreadable";
    let delayMs = backoffDelayMs({
      attempt: 1,
      baseMs: baseDelayMs,
      jitter: ATTACH_RESUME_BACKOFF_JITTER,
      random: seams.random,
    });
    await (seams.sleep ?? sleep)(Math.round(delayMs));
  }
}
//@ chunk-keyy05re.js:34908-36388 placement
async function resumeAttachServe(args, state, seams) {
  let session;
  try {
    session = await args.readSession();
  } catch (error) {
    logForDebugging(`[attach-serve] resume could not read the session: ${errorMessage(error)}`);
    return error instanceof TeleportOperationError ? "session_read_refused" : "retry";
  }
  if (session.session_status === "archived") return "session_archived";
  let toolHostStatus = parseToolHostStatus(session.tool_host_status, args);
  if (isConnectedAndResumed(toolHostStatus) && isSameDevice(session.bound_device_uuid, args))
    return state.posted ? "resumed" : "already_resumed";
  let detachState = resumableDetachState(session, args, (seams.now ?? Date.now)());
  if (typeof detachState === "string") return detachState;
  if (!state.maySign) return "too_soon";
  if (!(seams.flagOn ?? isAttachResumeEnabled)()) return "flag_off";
  let proof;
  try {
    proof = await signToolHostResume({
      orgUuid: args.orgUuid,
      accountUuid: args.held.accountUuid,
      sessionUuid: args.sessionUuid,
      deviceUUID: args.deviceId,
      request: args.request,
      nonce: detachState.nonce,
      key: args.held.key,
    });
  } catch (error) {
    logForDebugging(`[attach-serve] signing the resume proof failed: ${errorMessage(error)}`);
    return "sign";
  }
  state.posted = true;
  let response;
  try {
    response = await (seams.post ?? postTeleportOrg)(
      `/v1/code/sessions/${args.sessionId}/device`,
      {
        target_device_id: proof.deviceUUID,
        bind_attestation: {
          kid: proof.kid,
          signature: proof.signature,
        },
        bind_attestation_issued_at: proof.issuedAt,
      },
      args.credentials,
    );
  } catch (error) {
    logForDebugging(`[attach-serve] resume request got no answer: ${errorMessage(error)}`);
    return "retry";
  }
  if (!response.ok) return "not_sent";
  logForDebugging(
    `[attach-serve] resume status=${response.status} request_id=${String(response.response.headers?.["request-id"] ?? "")}`,
  );
  if (response.status >= 500 || response.status === 408 || response.status === 429) return "retry";
  if (response.status !== 200)
    return response.status === 403 && (await isServingConnected(args)) ? "resumed" : "refused";
  let boundDeviceUuid = response.data?.session?.bound_device_uuid;
  let toolHostStatus_2 = readToolHostStatus(response.data);
  if (typeof boundDeviceUuid !== "string" || boundDeviceUuid === "" || toolHostStatus_2 === undefined)
    return "retry";
  return isSameDevice(boundDeviceUuid, args) &&
    isConnectedAndResumed(parseToolHostStatus(toolHostStatus_2, args))
    ? "resumed"
    : "not_same_attach";
}
//@ chunk-keyy05re.js:36388-36546 placement
function parseToolHostStatus(toolHostStatus, resumeArgs) {
  let parsed = linkedToolHostStatusSchema().safeParse(toolHostStatus);
  return parsed.success &&
    parsed.data.environment_id === resumeArgs.request.environmentId &&
    parsed.data.requested_at === resumeArgs.requestedAt
    ? parsed.data
    : undefined;
}
//@ chunk-keyy05re.js:36546-36767 placement
function resumableDetachState(session, resumeArgs, nowMs) {
  let toolHostStatus = parseToolHostStatus(session.tool_host_status, resumeArgs);
  if (
    toolHostStatus?.state !== "detached" ||
    toolHostStatus.resume == null ||
    (session.bound_device_uuid !== undefined && !isSameDevice(session.bound_device_uuid, resumeArgs))
  )
    return "no_offer";
  return Date.parse(toolHostStatus.resume.until) > nowMs ? toolHostStatus.resume : "expired";
}
export {
  managedSettingsAskState,
  formatServeHelperStoppedError,
  isAttachServeMode,
  isStoredLoginPinned,
  notArmedHereLookup,
  isAlwaysTrue,
  isRemoteToolsPinStoredLogin,
  hasManagedSettingsCached,
  clearInternalWrites,
  consumeInternalWrite,
  INTERNAL_WRITE_WINDOW_MS,
  isAttachServeRepoScopedSourceOrNonInteractive,
  isAttachServeRepoScopedSource,
  markInternalWrite,
  exitIfServeHelperMisconfigured,
  withdrawInternalWrite,
  isAttachServeEnabled,
  ignoresPersistedTrust,
  parseToolHostStatus,
  readLinkedStatus,
  checkAttachServeLocally,
  registerAndLinkDevice,
  readAttachServeRequest,
  linkAttachServe,
  maybeResumeAttach,
  shouldServeOnlyNotArmed,
  waitForLinkedStatus,
};

/**
 * cli/headlessCloud/openBareCloudSession.ts
 *
 * 2.1.316 新增：无头 --cloud 新建或附加云会话：门禁校验、带特性打开会话、报告未生效的特性。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fe6rs39h.js (50)
 * attribution: placement 50
 */
import { randomUUID } from "crypto";
import { takeDirSyncHandle as takeDirSyncHandle_2, dirSyncSession } from "../../utils/teleport/dirSync.js";
import { logForDebugging, setHasFormattedOutput } from "../../utils/debug.js";
import { errorMessage, TeleportOperationError } from "../../utils/errors.js";
import { startDeviceRegistration } from "../../services/deviceBridge/deviceRegistrationSocket.js";
import { nullOnError_2 } from "./syncStatus.js";
import { logEvent, logEventAsync } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt, lit } from "../../services/analytics/safeMetadata.js";
import {
  sessionsApiAccessTokenWithCcrFallback,
  recoverSessionsApiBearer,
  isConsoleProfileSessionsCredential,
  prepareApiRequest,
  archiveRemoteSession,
  deviceBridgeAccessToken,
  fetchSession,
} from "../../utils/teleport/api.js";
import { switchSession, setIsRemoteMode } from "../../bootstrap/state.js";
import { identityAgentId } from "../../utils/agentId.js";
import { localBindIdentity } from "../../bridge/deviceBinder.js";
import { getStoredOauthAccountInfo, validateForceLoginOrg } from "../../utils/auth.js";
import {
  cloudPermissionModeFrom,
  PROMPT_OPTION_KEYS,
  cloudPromptOverrides,
  checkCloudLaunchFlags,
  formatUnboundCreateError,
  formatBindFailure,
  formatServeSetupFailure,
  cloudSessionJsonSummary,
  formatArchivedSessionError,
  displaySessionId,
} from "../cloudSession/launchFlags.js";
import { PERMISSION_MODE_MANUAL_ALIAS } from "../../types/permissions.js";
import {
  isViolinWoodEnabledCached,
  isSettingsToCloudEnabled,
  isDeviceIdentityEnabledCached,
} from "../../services/analytics/violinGates.js";
import { isKnownBindingState } from "../../bridge/deviceBindingState.js";
import {
  readLinkedStatus,
  checkAttachServeLocally,
  registerAndLinkDevice,
  readAttachServeRequest,
  linkAttachServe,
  maybeResumeAttach,
  isAttachServeEnabled,
  shouldServeOnlyNotArmed,
  waitForLinkedStatus,
} from "./attachServe.js";
import { HeadlessFeatureHandles, attachHeadlessFeatures } from "./headlessFeatures.js";
import {
  logFeatureBadAsync,
  logFeatureOk,
  logFeatureSad,
} from "../../services/analytics/featureTelemetry.js";
import { printCliError } from "../exit.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { runHeadlessCloudClient } from "./HeadlessCloudClient.js";
import { uniq } from "../../utils/collections.js";
import { env } from "../../utils/env.js";
import { printableName } from "../../utils/printableName.js";
import {
  lostSdkFeatures,
  cloudOptionTreatment,
  disallowedToolsTelemetry,
} from "../cloudSession/hostedSessionRestrictions.js";
import {
  MAX_TURNS_UNCONFIRMED_ENTRY,
  withMaxTurns,
  cloudLaunchOptionsFrom,
  CLOUD_REFUSAL_SUBTYPES,
} from "../cloudSession/headlessCloudClient.js";
import { getAllBaseTools } from "../../tools.js";
import { recordManagedSettingsRefusal } from "../managedConfigRefusal.js";
import { waitForPolicyLimitsToLoad } from "../../services/policyLimits/PolicyLimitsClient.js";
import { cloudSessionsUnavailableReason } from "../../services/cloudSessions/cloudSessionsPolicy.js";
import { logOrgPolicyDeniedAsync } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import { getSettingsForSource, getInitialSettings_2 } from "../../utils/settings/settings.js";
import { createServedToolsFeature } from "./servedTools.js";
import { createRemoteSessionConnection } from "../../remote/tools/servedChannel.js";
import { createHomeSettingsFeature } from "./cloudPlugins.js";
import {
  createPluginForwardingFeature,
  askUnattendedServingConsent,
  servedFolderConfigNotice,
  SERVED_FOLDER_CONFIG_NOT_USED,
  servedProjectEnvNotice,
  SERVED_PROJECT_ENV_NOT_APPLIED,
  createServedSettingsTracker,
} from "./servedSettings.js";
import { deviceProofStateRegistry } from "../../utils/hooks/deviceHooks/contentDigest.js";
import { reachStateRegistry } from "../../utils/hooks/deviceHooks/runDeviceHook.js";
import { createDeviceHooksFeature } from "./deviceHooks.js";
import { deviceHooksProcessMemories } from "../../utils/hooks/deviceHooks/cloudRegistration.js";
import { teleportToRemote, cloudCreateRefusal } from "../../utils/teleport.js";
import { branchModeForTelemetry } from "../startup/prepareSession.js";
import { launchLocationFacts } from "../../services/remoteTools/launchLocation.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { onceExport } from "../../../vendor/lodash-es/once.js";
import {
  resolveHostConsentMode,
  storedHomeSettingsMode,
  noteHomeSettingsPrompt,
  isLaunchConsentBlocked,
} from "../../utils/teleport/homeSettingsMode.js";
import { buildCloudCreateOptions, buildInitialMessageOptions } from "./hostPermissions.js";
import { getBranch } from "../../utils/git.js";
import { shortHash } from "../../utils/shortHash.js";
import { getRemoteSessionUrl } from "../../constants/product.js";
import { logError } from "../../utils/log.js";
import { sessionRepositoryTrustReader } from "../../remote/tools/sessionRepositoryTrust.js";
import { deviceEventSignerFor, deviceEventSignerIfBoundHere } from "../../bridge/clientEventSigner.js";
import { emitHookStarted } from "../../utils/hooks/hookEvents.js";
import { modelSupportsAutoMode } from "../../utils/betas.js";
import { environmentUnresolvedOutcome } from "../../utils/teleport/cloudEnvironments.js";
import { fetchEnvironments } from "../../utils/teleport/environments.js";
import { toCompatSessionId } from "../../bridge/sessionIdCompat.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { isRemoteTurnUnderWay } from "../../assistant/sessionHistory.js";
import {
  latestStreamPosition,
  findLocalSessionRecord,
  readRetentionCutoff,
  logAttachRecordLookup,
} from "./sessionRecords.js";
import { deviceDisplayName, resolveRegisteredDevice } from "../../bridge/deviceRegistry.js";
import { isSelfHostedEnvironment } from "../../utils/teleport/environmentSelection.js";
import { isLinkPreparationOverlapOn } from "../../services/remoteTools/servingGates.js";
import {
  resolveAttachDeviceBinding,
  sessionBindingFields,
  keepSettingsBesideAHelper,
  boundDeviceKeyOf,
  pullsBackToThisMachine,
  boundDeviceOf,
  registerAttachedDevice,
  SETTINGS_NOT_KEPT_REFUSAL,
} from "./attachDeviceBinding.js";
import {
  getBareSessionNoToolsNotice,
  formatUnboundSessionNotice,
  deviceBindingRefusalText,
} from "../../bridge/deviceBinding.js";
import { markableRepositoryTrust, reportableRepositoryTrust } from "../../remote/tools/repositoryTrust.js";
import { isTrustedDeviceActiveForOrg } from "../../bridge/trustedDevice.js";

//@ chunk-fe6rs39h.js:128747-128919 placement
function takeDirSyncHandle(id, laptop = {}) {
  let s = (laptop.takeDirSync ?? takeDirSyncHandle_2)(id);
  return s === undefined
    ? Promise.resolve(undefined)
    : s.catch((error) => {
        logForDebugging(`[headlessCloud] session handle unavailable: ${errorMessage(error)}`);
        return;
      });
}
//@ chunk-fe6rs39h.js:128919-129093 placement
async function releaseDirSyncHandle(e, laptop = {}) {
  try {
    let s = await e;
    if (s === undefined) return;
    await (laptop.releaseDirSync ?? retireDirSync)(s.sessionId);
  } catch (error) {
    logForDebugging(`[headlessCloud] session handle not released: ${errorMessage(error)}`);
  }
}
//@ chunk-fe6rs39h.js:129093-129129 placement
async function retireDirSync(e) {
  dirSyncSession().retire(e);
}
//@ chunk-fe6rs39h.js:129129-129172 placement
async function remoteFileModeUnspecified(e, n) {
  return "unspecified";
}
//@ chunk-fe6rs39h.js:129172-129512 placement
/**
 * 为云会话启动设备注册：带会话、组织、设备 id、令牌、存储与目录同步等参数，通知走调试日志。
 */
function startCloudDeviceRegistration(
  { sessionId, orgUuid, deviceId, getAccessToken, storageV5, dirSync, servedSettingsChanged },
  laptop = {},
) {
  return (laptop.startRegistration ?? startDeviceRegistration)({
    sessionId,
    orgUuid,
    getAccessToken,
    getDeviceId: () => deviceId,
    cloudClient: true,
    storageV5,
    dirSync,
    ...(servedSettingsChanged && {
      servedSettingsChanged,
    }),
    onNotice: (R, k) =>
      logForDebugging(`[remote-tools] ${R}: ${k}`, {
        level: "warn",
      }),
  });
}
//@ chunk-fe6rs39h.js:129617-129743 placement
function dirSyncState({ dirSync, fileMode, sessionId }) {
  if (dirSync !== undefined) return dirSync.sync.state();
  return {
    state: "off",
    reason: "not_opted_in",
  };
}
//@ chunk-fe6rs39h.js:129743-130085 placement
function dirSyncReport({ dirSync, fileMode, sessionId }) {
  let r = dirSyncState({
    dirSync,
    fileMode,
    sessionId,
  });
  return {
    state: r.state,
    ...("reason" in r &&
      r.reason !== undefined && {
        reason: r.reason,
      }),
    ...("message" in r &&
      r.message !== undefined && {
        message: r.message,
      }),
    ...armedDirSyncFields(r),
    ...(nullOnError_2(dirSync?.createFacts?.origin).fromUpload && {
      started_from_upload: true,
    }),
    file_mode: fileMode,
    file_mode_source: "stored",
  };
}
//@ chunk-fe6rs39h.js:130085-130503 placement
function armedDirSyncFields(e) {
  if (e.state !== "armed") return {};
  return {
    ...(e.firstUpload !== null && {
      first_upload: e.firstUpload,
    }),
    ...(e.syncedFiles !== null && {
      synced_files: e.syncedFiles,
    }),
    ...(e.writerElsewhere && {
      other_window: true,
    }),
    ...(e.switchedOffByAnthropic === true && {
      muted: true,
    }),
    ...(e.versionDisagreement !== undefined && {
      muted: true,
      reason: e.versionDisagreement.reason,
      message: e.versionDisagreement.message,
    }),
    ...(e.direction !== "pending" && {
      direction: e.direction,
    }),
  };
}
//@ chunk-fe6rs39h.js:130503-130745 placement
function logLaptopLinked({ dirSync, fileMode, sessionId }) {
  let r = dirSyncState({
    dirSync,
    fileMode,
    sessionId,
  });
  logEvent("tengu_remote_headless_laptop_linked", {
    sync_state: fromEnum(r.state),
    sync_reason: fromEnumOpt("reason" in r ? r.reason : undefined),
    file_mode: fromEnum(fileMode),
    has_dir_sync: dirSync !== undefined,
  });
}
//@ chunk-fe6rs39h.js:130745-130867 placement
var CLOUD_START_TIMEOUT_MS = 5000;
var STDIN_IS_TTY_ERROR =
  "Error: headless --cloud reads the SDK host messages from stdin as stream-json; stdin is a terminal here.";
//@ chunk-fe6rs39h.js:130867-131100 placement
function cloudSessionContext(apiCreds, sessionId) {
  return {
    sessionId,
    orgUuid: apiCreds.orgUUID,
    getAccessToken: () => sessionsApiAccessTokenWithCcrFallback(apiCreds.profile) ?? apiCreds.accessToken,
    consoleProfileBearer: apiCreds.profile,
    onAuth401: (s) => recoverSessionsApiBearer(s, undefined, undefined, apiCreds.profile),
    onDerivedSessionId: (s) => {
      switchSession(identityAgentId(s), "remote_attach");
    },
  };
}
//@ chunk-fe6rs39h.js:131100-131207 placement
async function checkLocalBindIdentity() {
  if (isConsoleProfileSessionsCredential()) return "profile";
  let e = await localBindIdentity({
    accountUuid: currentAccountUuid(),
  });
  return e.ok ? undefined : e.error;
}
//@ chunk-fe6rs39h.js:131207-131246 placement
function currentAccountUuid() {
  return getStoredOauthAccountInfo()?.accountUuid;
}
//@ chunk-fe6rs39h.js:131246-131467 placement = PermissionModeSchema (0.42)
/**
 * 由 --permission-mode 生成启动时需发送的 set_permission_mode 控制请求。
 */
function attachOpeningRequests(permissionModeCli, { serveOnly }) {
  if (serveOnly) return [];
  let s = cloudPermissionModeFrom(permissionModeCli);
  return s === undefined || (s === "default" && permissionModeCli !== PERMISSION_MODE_MANUAL_ALIAS)
    ? []
    : [
        {
          request: {
            subtype: "set_permission_mode",
            mode: s,
          },
          required: s === "plan" || s === "dontAsk",
          describe: `--permission-mode ${s}`,
        },
      ];
}
//@ chunk-fe6rs39h.js:131467-131514 placement
var signal = new AbortController().signal;
var SESSION_HISTORY_PAGE_SIZE = 50;
var SESSION_HISTORY_MAX_PAGES = 5;
//@ chunk-fe6rs39h.js:131514-131755 placement
function normalizeOpenOptions({
  signal: signal_2,
  credentials,
  homeSeed,
  servedTools,
  servedToolsUnavailable,
  ...y
}) {
  return {
    ...y,
    bound: y.binding === "bound",
    signal: signal_2 ?? signal,
    ...(credentials && {
      credentials,
    }),
    ...(homeSeed && {
      homeSeed,
    }),
    ...(servedTools && {
      servedTools,
    }),
    ...(servedToolsUnavailable && {
      servedToolsUnavailable,
    }),
  };
}
//@ chunk-fe6rs39h.js:131755-131818 placement
function logRemoteToolsWarning(e, n) {
  logForDebugging(`[remote-tools] ${e}: ${n}`, {
    level: "warn",
  });
}
//@ chunk-fe6rs39h.js:131818-132413 placement
async function startServedTools(e, n, deviceId, cloudClient, deviceBridge, onNotice, S, w, R) {
  if (!isViolinWoodEnabledCached())
    return {
      servedToolsUnavailable: "flag_off",
    };
  if (!isKnownBindingState(n))
    return {
      servedToolsUnavailable: "helper_only",
    };
  let { servedToolsAttachOptions, servedToolsUnavailableReason } = await import("./chunk-012rhzq5.js");
  let O = servedToolsAttachOptions({
    owner: () => ({
      owner: true,
      deviceId,
    }),
    cloudClient,
    deviceBridge,
    onNotice,
    ...(S && {
      repositoryTrust: S,
    }),
    stillBound: async () => {
      let linkedStatus = await readLinkedStatus(deviceId, w, R);
      if (linkedStatus === "linked") return true;
      return linkedStatus === "ended" ? false : undefined;
    },
    plumbing: (await import("./chunk-2s19t0f2.js")).servedSessionPlumbing(e),
  });
  return O === undefined
    ? {
        servedToolsUnavailable: servedToolsUnavailableReason() ?? "flag_off",
      }
    : {
        servedTools: O,
      };
}
//@ chunk-fe6rs39h.js:132413-132471 placement
function disposeHandles(e) {
  let n = new HeadlessFeatureHandles();
  n.adopt(e);
  return n.dispose();
}
//@ chunk-fe6rs39h.js:132471-133445 placement
async function openWithFeatures(e, n, { entry, opener, features = [], attachHonours = [] }) {
  let S = entry === "create" ? PROMPT_OPTION_KEYS : attachHonours;
  let w = await checkCloudGates(e, n, entry);
  if (w.kind === "refused") {
    await logFeatureBadAsync("remote_headless_session", w.code);
    printCliError(w.message);
    await gracefulShutdown(1);
    return;
  }
  let { input, policy } = w;
  policy.notices.forEach(noteHeadless);
  setHasFormattedOutput(true);
  setIsRemoteMode(true);
  let O = await runHeadlessCloudClient({
    input,
    builtInToolNames: registeredBuiltInToolNames,
    replayUserMessages: e.effectiveReplayUserMessages,
    includePartialMessages: e.effectiveIncludePartialMessages,
    initializePolicy: "strict",
    ignoredOptions:
      entry === "create"
        ? policy.ignored
        : uniq([
            ...policy.ignored,
            ...sdkHostOptionEntries(policy.forwarded, e, e.effectiveModel ?? env.ANTHROPIC_MODEL),
          ]),
    openingInitializeHonours: S,
    openSession: (P) =>
      authenticateThenOpen(e.credentials, async (apiCreds) => {
        let L = await opener({
          apiCreds,
          host: P,
          forwarded: entry === "create" ? cloudPromptOverrides(policy.forwarded, P.initialize) : {},
          features,
          storageV5: e.storageV5,
          credentials: e.credentials,
        });
        return withNotApplied(
          L,
          notAppliedReport(
            [...getUnconfirmedOptions(policy.forwarded, L), ...policy.notApplied],
            P.initialize,
            entry,
            S,
          ),
        );
      }),
  }).done;
  if (O.message && O.exitCode === 0) noteHeadless(O.message);
  else if (O.message) printCliError(O.message);
  await gracefulShutdown(O.exitCode);
}
//@ chunk-fe6rs39h.js:133445-133798 placement
async function authenticateThenOpen(credentials, n) {
  let s;
  try {
    s = await prepareApiRequest(credentials);
  } catch (error) {
    await logFeatureBadAsync("remote_headless_session", "auth");
    return {
      kind: "failed",
      message: `Error: ${printableName(errorMessage(error), MAX_ERROR_MESSAGE_CHARS) || "Failed to authenticate"}`,
    };
  }
  try {
    return await n(s);
  } catch (error) {
    await logFeatureBadAsync("remote_headless_session", "open_threw");
    return {
      kind: "failed",
      message: `Error: ${printableName(errorMessage(error), MAX_ERROR_MESSAGE_CHARS) || "Unable to open the cloud session"}`,
    };
  }
}
//@ chunk-fe6rs39h.js:133798-133822 placement
var MAX_LISTED_REFUSAL_GROUPS = 12;
var MAX_ERROR_MESSAGE_CHARS = 2000;
var MAX_LISTED_ENTRIES = 40;
//@ chunk-fe6rs39h.js:133822-134757 placement
function notAppliedReport(e, initialize, entry, r) {
  let h = new Set(entry === "attach" ? PROMPT_OPTION_KEYS : []);
  let y =
    initialize === null
      ? []
      : lostSdkFeatures(initialize, "strict", new Set([...r, "supportedDialogKinds"])).ignored.map((L) => ({
          kind: h.has(L) ? "kept" : cloudOptionTreatment(L),
          name: `initialize.${L}`,
        }));
  let S = {
    lost: 0,
    kept: 1,
    preference: 2,
  };
  let sorted = [...e, ...y].sort((L, z) => S[L.kind] - S[z.kind]);
  let R = (L) => sorted.filter((z) => z.kind === L);
  let k = R("lost");
  let I = R("kept");
  let O = R("preference");
  let P = (L) => (L.kind === "lost" && L.why !== undefined ? `${L.name} (${L.why})` : L.name);
  let joined = [
    ...(I.length > 0
      ? [
          `An existing cloud session keeps the configuration it was created with; not applied: ${listWithOverflow(I.map(P))}.`,
        ]
      : []),
    ...(O.length > 0
      ? [
          `Host options not applied to this cloud session (it runs with the cloud container's own configuration): ${listWithOverflow(O.map(P))}.`,
        ]
      : []),
  ].join(" ");
  return {
    notices: [
      ...(k.length > 0
        ? [
            {
              level: "warning",
              text: `Not applied to this cloud session, where the agent runs with the cloud container's own configuration: ${listWithOverflow(k.map(P))}.`,
            },
          ]
        : []),
      ...(joined
        ? [
            {
              level: "notice",
              text: joined,
            },
          ]
        : []),
    ],
    entries: sorted.slice(0, MAX_LISTED_ENTRIES),
  };
}
//@ chunk-fe6rs39h.js:134757-134901 placement
function getUnconfirmedOptions(forwarded, n) {
  let s = n.kind === "opened" && n.session.entry === "create" && n.session.maxTurnsConfirmed === true;
  return forwarded.maxTurns !== undefined && !s ? [MAX_TURNS_UNCONFIRMED_ENTRY] : [];
}
//@ chunk-fe6rs39h.js:134901-135004 placement
function listWithOverflow(e) {
  return e.length > MAX_LISTED_REFUSAL_GROUPS
    ? `${e.slice(0, MAX_LISTED_REFUSAL_GROUPS).join(", ")} (and ${e.length - MAX_LISTED_REFUSAL_GROUPS} more)`
    : e.join(", ");
}
//@ chunk-fe6rs39h.js:135004-135264 placement
function withNotApplied(e, n) {
  if (e.kind !== "opened" || n.entries.length === 0) return e;
  let { session } = e;
  return {
    ...e,
    session: {
      ...session,
      notices: [...(session.notices ?? []), ...n.notices],
      cloudSession: () => ({
        ...session.cloudSession(),
        not_applied: n.entries.map(({ kind, name: h }) => ({
          name: h,
          kind,
        })),
      }),
    },
  };
}
//@ chunk-fe6rs39h.js:135264-135359 placement
function noteHeadless(text) {
  logForDebugging(`[headlessCloud] ${text}`);
  if (process.stderr.isTTY)
    process.stderr.write(`${text}
`);
}
//@ chunk-fe6rs39h.js:135359-135403 placement
function registeredBuiltInToolNames() {
  return getAllBaseTools().map((e) => e.name);
}
//@ chunk-fe6rs39h.js:135403-136151 placement
async function cloudCreateGates(e, n, entry, { isDeviceLess: r = false, poolLaunchFolder: h } = {}) {
  let y = e.orgValidation ?? (await validateForceLoginOrg());
  if (!y.valid) {
    if (y.policyUnreadable) recordManagedSettingsRefusal("policy_invalid");
    return {
      kind: "refused",
      code: y.reason === "provider_not_allowed" ? "provider_not_allowed" : "org_pin",
      message: y.message,
    };
  }
  await waitForPolicyLimitsToLoad();
  let S = cloudSessionsUnavailableReason();
  if (S) {
    await logOrgPolicyDeniedAsync("allow_remote_sessions", "cloud_session");
    return {
      kind: "refused",
      code: "unavailable",
      message: `Error: ${S}`,
    };
  }
  let w = withMaxTurns(n, e.resolvedMaxTurns);
  let R = cloudLaunchOptionsFrom(e, getSettingsForSource("flagSettings"));
  let k;
  let I = checkCloudLaunchFlags(w, {
    entry,
    isDeviceLess: r,
    ...R,
    ...(k !== undefined && {
      selectedAgentDefinition: null,
    }),
  });
  if (I.kind === "rejected")
    return {
      kind: "refused",
      code: CLOUD_REFUSAL_SUBTYPES[I.reason],
      message: I.message,
    };
  return {
    kind: "ready",
    policy:
      k === undefined
        ? I
        : {
            ...I,
            repositoryAgent: k.name,
            notices: [...I.notices, k.notice],
          },
  };
}
//@ chunk-fe6rs39h.js:136151-136371 placement
async function checkCloudGates(e, n, entry) {
  let inputPrompt = e.inputPrompt;
  let h = await cloudCreateGates(e, n, entry);
  if (h.kind === "refused") return h;
  if (typeof inputPrompt === "string")
    return {
      kind: "refused",
      code: "no_stream_input",
      message: STDIN_IS_TTY_ERROR,
    };
  return {
    kind: "ready",
    input: inputPrompt,
    policy: h.policy,
  };
}
//@ chunk-fe6rs39h.js:136371-136515 placement
function runHeadlessCloudCreate(e, n, s) {
  return openWithFeatures(e, n, {
    entry: "create",
    opener: (r) =>
      createBareCloudSession(e, {
        ...r,
        sessionHost: s,
        carriedMode: n.inheritPermissionMode,
      }),
    features: createCloudSessionFeatures(e, s),
  });
}
//@ chunk-fe6rs39h.js:136515-136672 placement
function createAttachFeatures() {
  let e = env.CLAUDE_CODE_REMOTE_TOOLS_HOST_IDLE_RELEASE_MINUTES;
  return [
    createServedToolsFeature({
      openChannel: createRemoteSessionConnection,
      controlOnly: true,
      ...(e !== undefined && {
        idleReleaseMs: e * 60000,
      }),
    }),
  ];
}
//@ chunk-fe6rs39h.js:136672-136889 placement
function createCloudSessionFeatures(e, n) {
  return [
    createHomeSettingsFeature({
      forwardHomeSettings: e.forwardHomeSettings,
      hostConsent: e.homeSettingsConsent,
    }),
    createPluginForwardingFeature({
      memory: deviceProofStateRegistry.of(n),
      reachMemory: reachStateRegistry.of(n),
    }),
    createDeviceHooksFeature({
      getTools: () => e.tools,
      memory: deviceHooksProcessMemories.of(n),
    }),
    createServedToolsFeature({
      openChannel: createRemoteSessionConnection,
    }),
  ];
}
//@ chunk-fe6rs39h.js:136889-143545 placement
/**
 * 无头 --cloud 创建新云会话：校验门禁、准备分支/引用、转发设置与特性、创建会话并启动客户端（失败记 tengu_remote_create_session_error）。
 */
async function createBareCloudSession(
  e,
  {
    apiCreds,
    forwarded,
    host = {
      initialize: null,
    },
    features = [],
    storageV5,
    credentials,
    sessionHost,
    carriedMode,
  },
  k = {},
) {
  let teleport = k.teleport ?? teleportToRemote;
  let branchMode = branchModeForTelemetry(e.poolOnBranch, e.poolRef);
  let P = await (k.bindPreflight ?? checkLocalBindIdentity)();
  if (P !== undefined) {
    await logFeatureBadAsync("remote_headless_session", "bind_unavailable", {
      reason: fromEnum(P),
      ...launchLocationFacts(P),
      ...null?.fields,
    });
    return {
      kind: "failed",
      message: formatUnboundCreateError(P, null?.why),
    };
  }
  let abortController = new AbortController();
  let L = registerCleanup(() => abortController.abort());
  let combinedAbortSignal = createCombinedAbortSignal(abortController.signal, {
    signalB: host.signal,
  });
  let j = onceExport(() => false);
  let Y = e.poolOnBranch
    ? {
        revision: e.poolOnBranch,
        flag: "--on-branch",
      }
    : e.poolRef
      ? {
          revision: e.poolRef,
          flag: "--ref",
        }
      : undefined;
  let { notices, noteForClaude, cardOutcome, wasNotOffered, moreFilesDecision } = {
    notices: [],
    noteForClaude: null,
    cardOutcome: null,
    wasNotOffered: undefined,
    moreFilesDecision: undefined,
  };
  let aborted = combinedAbortSignal.signal.aborted;
  combinedAbortSignal.cleanup();
  if (aborted) {
    L();
    return {
      kind: "failed",
      message: "Error: Unable to create cloud session",
    };
  }
  let x = j();
  let G = false;
  let Q = await (k.settingsToCloudEnabled ?? isSettingsToCloudEnabled)().catch(() => false);
  let q = false;
  let V = null;
  if (V !== null) {
    L();
    return {
      kind: "failed",
      message: V,
      startupFailureReason: "cli_version_too_old",
    };
  }
  let hostConsentMode = resolveHostConsentMode({
    hostConsent: e.homeSettingsConsent,
    areOwnFlagsOn: Q,
    stored: storedHomeSettingsMode(),
    isProjectSynced: q,
  });
  if (Q || q)
    noteHomeSettingsPrompt({
      launchConsent: hostConsentMode,
      isProjectSynced: q,
      launchMayForward: e.forwardHomeSettings,
      surface: "sdk_host",
      trigger: "create",
    });
  let settings = getInitialSettings_2();
  let { model, explicitMode, decision, isModeFromSettings, noticeOnRunner } = buildCloudCreateOptions(
    e,
    {
      settingsToCloudEnabled: Q || isLaunchConsentBlocked(hostConsentMode),
      launchConsent: hostConsentMode,
      settings,
      hostFillsDefault: true,
      typedLevel: forwarded.proactivityLevel,
      carriedMode,
    },
    k,
  );
  if (decision.notice !== undefined) noteHeadless(decision.notice.text);
  if (decision.action !== "none")
    logEvent("tengu_remote_model_gate_hint", {
      entry_point: lit("cloud_headless"),
      permission_mode: fromEnumOpt(explicitMode) ?? lit("unset"),
      action: fromEnum(decision.action),
      ...(decision.repositoryModel && {
        repository_model: fromEnum(decision.repositoryModel),
      }),
    });
  logEvent("tengu_remote_create_session", {
    has_initial_prompt: lit("false"),
    forwarded_count: Object.keys(forwarded).length,
    disallowed_tools_count: forwarded.disallowedTools?.length ?? 0,
    ...disallowedToolsTelemetry(forwarded.disallowedTools),
    builtin_tools_count: forwarded.builtinTools?.length ?? 0,
    entry_point: fromEnum("cloud_headless"),
    branch_mode: branchMode,
  });
  let combinedAbortSignal_2 = createCombinedAbortSignal(abortController.signal, {
    signalB: host.signal,
  });
  await askUnattendedServingConsent({
    dialogs: host.dialogs,
    permissionMode: decision.permissionMode,
    signal: combinedAbortSignal_2.signal,
    seams: k.unattendedConsent,
  });
  let aborted_2 = combinedAbortSignal_2.signal.aborted;
  combinedAbortSignal_2.cleanup();
  if (aborted_2) {
    L();
    return {
      kind: "failed",
      message: "Error: Unable to create cloud session",
    };
  }
  let Be = {
    status: "unbound",
    reason: undefined,
  };
  let it = () => Be;
  let deviceBinding = {
    orgUuid: apiCreds.orgUUID,
    accountUuid: currentAccountUuid(),
    onBound: (deviceId) => {
      Be = {
        status: "bound",
        deviceId,
      };
    },
    onUnbound: (reason) => {
      Be = {
        status: "unbound",
        reason,
      };
    },
    abandonsUnbound: true,
  };
  let ke;
  let vt = e.poolOnBranch ?? e.poolRef ?? (await (k.currentBranch ?? getBranch)());
  let We = [];
  let Z = await teleport({
    initialMessage: null,
    signal: abortController.signal,
    source: "remote",
    branchName: vt || undefined,
    title: e.sessionNameArg || undefined,
    description: e.remote || undefined,
    reuseOutcomeBranch: e.poolOnBranch ?? undefined,
    explicitRef: e.poolOnBranch ?? e.poolRef ?? undefined,
    branchFromHead: (e.poolOnBranch ?? e.poolRef) == null,
    personal: e.personal,
    deviceBinding,
    model,
    permissionMode: decision.permissionMode,
    isModeFromSettings,
    proactivityLevel: forwarded.proactivityLevel,
    appendSystemPrompt: forwarded.appendSystemPrompt,
    customSystemPrompt: forwarded.customSystemPrompt,
    appendSubagentSystemPrompt: forwarded.appendSubagentSystemPrompt,
    effort: forwarded.effort,
    fallbackModel: forwarded.fallbackModel,
    maxTurns: forwarded.maxTurns,
    maxBudgetUsd: forwarded.maxBudgetUsd,
    allowedTools: forwarded.allowedTools,
    disallowedTools: forwarded.disallowedTools,
    builtinTools: forwarded.builtinTools,
    thinking: forwarded.thinking,
    storageV5,
    credentials,
    allowBundle: true,
    ...{},
    firstUpload: undefined,
    seedSignal: abortController.signal,
    staysAttached: true,
    forwardHomeSettings: e.forwardHomeSettings,
    ...(hostConsentMode && {
      homeSettingsConsent: hostConsentMode,
    }),
    onBundleNotice: (text, ze) => {
      We.push({
        level: ze ?? "notice",
        text,
      });
    },
    onBundleFail: (message, ze) => {
      ke = {
        message,
        reason: ze === "env_create" ? "env_create_failed" : "bundle_failed",
        detail: undefined,
      };
    },
    onCreateFail: (message, reason, detail) => {
      ke = {
        message,
        reason,
        detail,
      };
    },
  }).finally(L);
  if (Z === null)
    return reportCreateSessionError(ke, abortController.signal.aborted, branchMode, "cloud_headless");
  let permissionMode = Z.settingsModeOnRunner === undefined ? decision.permissionMode : undefined;
  let Fe = Z.settingsModeOnRunner === undefined ? decision.notice : noticeOnRunner;
  if (Z.settingsModeOnRunner !== undefined && noticeOnRunner !== undefined) noteHeadless(noticeOnRunner.text);
  let Ie = takeDirSyncHandle(Z.id, k.laptop);
  let Re = async () => {
    abortController.abort();
    await releaseDirSyncHandle(Ie, k.laptop);
  };
  let ge = it();
  if (ge.status === "unbound") await Re();
  await logEventAsync("tengu_remote_create_session_success", {
    session_id: shortHash(Z.id),
    entry_point: fromEnum("cloud_headless"),
    branch_mode: branchMode,
    ...(forwarded.maxTurns !== undefined && {
      max_turns_confirmed: Z.maxTurnsConfirmed === true,
    }),
    home_seed_started: Z.homeSeed !== undefined,
    ...(Z.settingsPackUnsent !== undefined && {
      settings_pack_unsent: fromEnum(Z.settingsPackUnsent),
    }),
    ...(Z.settingsModeOnRunner !== undefined && {
      settings_mode_on_runner: fromEnum(Z.settingsModeOnRunner),
      settings_mode_warned: Fe?.level === "warning",
    }),
    ...(e.homeSettingsConsent && {
      home_settings_host_consent: fromEnum(e.homeSettingsConsent),
    }),
  });
  let remoteSessionUrl = getRemoteSessionUrl(Z.id, undefined, {
    from: "cli",
    m: "0",
  });
  let he = () => (k.archiveSession ?? archiveRemoteSession)(Z.id, CLOUD_START_TIMEOUT_MS).catch(() => false);
  if (ge.status === "unbound") {
    let re = await he();
    await logFeatureBadAsync("remote_headless_session", "unbound", {
      reason: fromEnumOpt(ge.reason) ?? lit("unknown"),
      archived: re,
    });
    return {
      kind: "failed",
      message: formatBindFailure(Z.id, ge.reason, remoteSessionUrl, re),
    };
  }
  let Ee = cloudSessionContext(apiCreds, Z.id);
  let Oe = await Ie;
  noopDialogWiring(Oe, host.dialogs);
  let Ct = await startDeviceBridgeForAttach(
    {
      sessionId: Z.id,
      orgUuid: apiCreds.orgUUID,
      deviceId: ge.deviceId,
      getAccessToken: () => deviceBridgeAccessToken(apiCreds),
      storageV5,
      servedSettingsChanged: servedSettingsChangedOf(sessionHost),
      seams: k,
    },
    Oe,
  ).then(
    (link) => ({
      link,
    }),
    async (error) => {
      await Re();
      logError(error);
      return {
        error: errorMessage(error),
      };
    },
  );
  if ("error" in Ct) {
    let re = await he();
    await logFeatureBadAsync("remote_headless_session", "link_failed", {
      archived: re,
    });
    return {
      kind: "failed",
      message: formatServeSetupFailure(Z.id, Ct.error, remoteSessionUrl, re),
    };
  }
  let { link } = Ct;
  let wt = sessionRepositoryTrustReader({
    sessionId: Z.id,
    getAccessToken: Ee.getAccessToken,
    fetchSession,
    createOrigin: Oe?.createFacts?.origin,
  });
  wt?.refresh();
  let hn = await attachHeadlessFeatures(
    features,
    normalizeOpenOptions({
      sessionId: Z.id,
      binding: "bound",
      boundDeviceUuid: ge.deviceId,
      trigger: "create",
      storageV5,
      credentials,
      settingsToCloud: Q,
      isProjectSynced: q,
      ...(Oe && {
        dirSync: Oe,
      }),
      homeSeed: Z.homeSeed,
      ...(await startServedTools(
        Z.id,
        "none",
        ge.deviceId,
        true,
        link.bridge,
        logRemoteToolsWarning,
        wt,
        () =>
          fetchSession(Z.id, {
            ...apiCreds,
            accessToken: Ee.getAccessToken(),
          }),
      )),
      signal: host.signal,
    }),
  );
  logFeatureOk("remote_headless_session");
  let at = servedFolderConfigNotice("create");
  if (at !== undefined) logRemoteToolsWarning(SERVED_FOLDER_CONFIG_NOT_USED, at);
  let dt = servedProjectEnvNotice("create");
  if (dt !== undefined) logRemoteToolsWarning(SERVED_PROJECT_ENV_NOT_APPLIED, dt);
  let fn = [
    ...notices,
    ...We,
    ...(Fe !== undefined ? [Fe] : []),
    ...(at !== undefined
      ? [
          {
            level: "notice",
            text: at,
          },
        ]
      : []),
    ...(dt !== undefined
      ? [
          {
            level: "notice",
            text: dt,
          },
        ]
      : []),
  ];
  return {
    kind: "opened",
    session: {
      entry: "create",
      ...Ee,
      ...(ge.status === "bound" && {
        eventSigner: deviceEventSignerFor(ge.deviceId, credentials),
      }),
      featureHandles: hn,
      hasTitle: Boolean(e.sessionNameArg || e.remote),
      ...(fn.length > 0 && {
        notices: fn,
      }),
      ...(permissionMode !== undefined && {
        requestedPermissionMode: permissionMode,
      }),
      maxTurnsConfirmed: Z.maxTurnsConfirmed,
      dirSync: Oe,
      settle: (re) => emitHookStarted(Z.id, abortController, re, k.laptop),
      dispose: async () => {
        await Re();
        await link.bridge.stop();
        await disposeHandles(hn);
      },
      cloudSession: () =>
        cloudSessionJsonSummary({
          sessionId: Z.id,
          viewUrl: remoteSessionUrl,
          device: {
            status: "bound",
            device_id: ge.deviceId,
            display_name: link.displayName,
          },
          directorySync: dirSyncReport({
            dirSync: Oe,
            fileMode: link.fileMode,
            sessionId: Z.id,
          }),
          repositoryTrust: repositoryTrustOf(wt),
        }),
    },
  };
}
//@ chunk-fe6rs39h.js:143545-144254 placement
async function reportCreateSessionError(e, aborted, branchMode, r) {
  await logEventAsync("tengu_remote_create_session_error", {
    error: aborted ? lit("aborted") : e ? fromEnum(e.reason) : lit("unknown"),
    entry_point: fromEnum(r),
    branch_mode: branchMode,
    ...(e?.detail?.endpoint && {
      create_endpoint: fromEnum(e.detail.endpoint),
    }),
    ...(e?.detail?.serverReason && {
      server_reason: fromEnum(e.detail.serverReason),
    }),
    ...(e?.detail?.messageHidden && {
      message_hidden: lit("true"),
    }),
    ...(e?.detail?.preflightTransient !== undefined && {
      deny_transient: lit(e.detail.preflightTransient ? "true" : "false"),
    }),
    ...(e?.detail?.sessionArchived !== undefined && {
      session_archived: lit(e.detail.sessionArchived ? "true" : "false"),
    }),
  });
  if (!aborted) await logFeatureBadAsync("remote_headless_session", "create_failed");
  return {
    kind: "failed",
    message: e
      ? `Error: ${printableName(e.message, MAX_ERROR_MESSAGE_CHARS)}`
      : "Error: Unable to create cloud session",
  };
}
//@ chunk-fe6rs39h.js:144254-148366 placement
/**
 * runHeadlessCloudCreate：`claude -p --cloud` 新建云会话入口（需要 prompt），处理模型门禁提示、bare 模式与退出码。
 */
async function openBareCloudSession(
  e,
  {
    apiCreds,
    prompt,
    forwarded,
    repositoryAgent,
    hostFillsDefault,
    carriedMode,
    signal,
    onSessionExists,
    storageV5,
    credentials,
  },
  O = {},
) {
  if (!hasPromptContent(prompt))
    return {
      kind: "failed",
      message: "Error: a cloud session needs a prompt",
    };
  let teleport = O.teleport ?? teleportToRemote;
  let branchMode = branchModeForTelemetry(e.poolOnBranch, e.poolRef);
  let abortController = new AbortController();
  let z = registerCleanup(() => abortController.abort());
  if (signal?.aborted) abortController.abort();
  signal?.addEventListener("abort", () => abortController.abort(), {
    once: true,
  });
  let settingsToCloudEnabled = e.noMonorepo
    ? false
    : await (O.settingsToCloudEnabled ?? isSettingsToCloudEnabled)().catch(() => false);
  let { model, explicitMode, decision, isModeFromSettings, noticeOnRunner } = buildCloudCreateOptions(
    e,
    {
      settingsToCloudEnabled,
      settingsNeverForwarded: e.noMonorepo,
      settings: getInitialSettings_2(),
      hostFillsDefault,
      typedLevel: forwarded.proactivityLevel,
      carriedMode,
    },
    O,
  );
  if (decision.notice !== undefined) noteHeadless(decision.notice.text);
  if (decision.action !== "none")
    logEvent("tengu_remote_model_gate_hint", {
      entry_point: lit("cloud_headless_bare"),
      permission_mode: fromEnumOpt(explicitMode) ?? lit("unset"),
      action: fromEnum(decision.action),
      ...(decision.repositoryModel && {
        repository_model: fromEnum(decision.repositoryModel),
      }),
      ...(decision.barredBy && {
        barred_by: fromEnum(decision.barredBy),
      }),
      model_runs_auto: lit(modelSupportsAutoMode(model) ? "true" : "false"),
    });
  logEvent("tengu_remote_create_session", {
    has_initial_prompt: lit("true"),
    forwarded_count: Object.keys(forwarded).length,
    disallowed_tools_count: forwarded.disallowedTools?.length ?? 0,
    ...disallowedToolsTelemetry(forwarded.disallowedTools),
    builtin_tools_count: forwarded.builtinTools?.length ?? 0,
    entry_point: fromEnum("cloud_headless_bare"),
    branch_mode: branchMode,
    has_environment_query: e.environmentQuery !== null,
  });
  let ee =
    e.environmentQuery === null
      ? null
      : await environmentUnresolvedOutcome(
          e.environmentQuery,
          () => fetchEnvironments(apiCreds.accessToken, storageV5, credentials),
          cloudCreateRefusal(),
        );
  if (ee?.ok === false) {
    z();
    return reportCreateSessionError(
      {
        message: ee.error,
        reason: ee.reason,
        detail: undefined,
      },
      abortController.signal.aborted,
      branchMode,
      "cloud_headless_bare",
    );
  }
  let se;
  let x = [];
  let ie = randomUUID();
  let G = await teleport({
    ...buildInitialMessageOptions({
      prompt,
      promptUuid: ie,
      currentBranch:
        (e.poolOnBranch ?? e.poolRef) == null ? await (O.currentBranch ?? getBranch)() : undefined,
      poolOnBranch: e.poolOnBranch,
      poolRef: e.poolRef,
      title: e.sessionNameArg || undefined,
      permissionMode: decision.permissionMode,
      model,
      signal: abortController.signal,
    }),
    ...{},
    chosenEnvironment: ee?.environment,
    monorepo: e.monorepo,
    poolId: e.poolId ?? undefined,
    noMonorepo: e.noMonorepo,
    correlationId: e.correlationId ?? undefined,
    repositoryRequiredBy: repositoryAgent === undefined ? undefined : `The agent "${repositoryAgent}"`,
    personal: e.personal,
    isModeFromSettings,
    proactivityLevel: forwarded.proactivityLevel,
    appendSystemPrompt: forwarded.appendSystemPrompt,
    customSystemPrompt: forwarded.customSystemPrompt,
    appendSubagentSystemPrompt: forwarded.appendSubagentSystemPrompt,
    effort: forwarded.effort,
    fallbackModel: forwarded.fallbackModel,
    maxTurns: forwarded.maxTurns,
    maxBudgetUsd: forwarded.maxBudgetUsd,
    allowedTools: forwarded.allowedTools,
    disallowedTools: forwarded.disallowedTools,
    builtinTools: forwarded.builtinTools,
    thinking: forwarded.thinking,
    environmentVariables: forwarded.environmentVariables,
    storageV5,
    credentials,
    onProgress: (ue) => {
      if (ue.kind === "session_exists")
        onSessionExists(
          printableName(
            getRemoteSessionUrl(ue.sessionId, undefined, {
              from: "cli",
              m: "0",
            }),
            200,
          ),
        );
    },
    onBundleNotice: (text, Se) => {
      x.push({
        level: Se ?? "notice",
        text,
      });
    },
    onBundleFail: (message, Se) => {
      se = {
        message,
        reason: Se === "env_create" ? "env_create_failed" : "bundle_failed",
        detail: undefined,
      };
    },
    onCreateFail: (message, reason, detail) => {
      se = {
        message,
        reason,
        detail,
      };
    },
  }).finally(z);
  if (G === null)
    return reportCreateSessionError(se, abortController.signal.aborted, branchMode, "cloud_headless_bare");
  let permissionMode = G.settingsModeOnRunner === undefined ? decision.permissionMode : undefined;
  let me = G.settingsModeOnRunner === undefined ? decision.notice : noticeOnRunner;
  if (G.settingsModeOnRunner !== undefined && noticeOnRunner !== undefined)
    logForDebugging(`[headlessCloud] ${noticeOnRunner.text}`);
  await logEventAsync("tengu_remote_create_session_success", {
    session_id: shortHash(G.id),
    entry_point: fromEnum("cloud_headless_bare"),
    branch_mode: branchMode,
    ...(forwarded.maxTurns !== undefined && {
      max_turns_confirmed: G.maxTurnsConfirmed === true,
    }),
    ...(G.settingsModeOnRunner !== undefined && {
      settings_mode_on_runner: fromEnum(G.settingsModeOnRunner),
      settings_mode_warned: me?.level === "warning",
    }),
  });
  logFeatureOk("remote_headless_session");
  let viewUrl = getRemoteSessionUrl(G.id, undefined, {
    from: "cli",
    m: "0",
  });
  let le = [
    ...(ee?.notice && !G.chosenEnvironmentMoved
      ? [
          {
            level: "notice",
            text: ee.notice,
          },
        ]
      : []),
    ...x,
    ...(me !== undefined ? [me] : []),
  ];
  return {
    kind: "opened",
    session: {
      entry: "create",
      ...cloudSessionContext(apiCreds, G.id),
      initialPrompt: {
        uuid: ie,
        content: prompt,
      },
      hasTitle: true,
      ...(le.length > 0 && {
        notices: le,
      }),
      ...(permissionMode !== undefined && {
        requestedPermissionMode: permissionMode,
      }),
      maxTurnsConfirmed: G.maxTurnsConfirmed,
      dispose: async () => {
        await (O.archiveSession ?? archiveRemoteSession)(G.id, CLOUD_START_TIMEOUT_MS).catch(() => false);
      },
      cloudSession: () =>
        cloudSessionJsonSummary({
          sessionId: G.id,
          viewUrl,
          device: unboundStatus("session_unbound"),
          directorySync: dirSyncReport({
            dirSync: undefined,
            fileMode: "unspecified",
            sessionId: G.id,
          }),
        }),
    },
  };
}
//@ chunk-fe6rs39h.js:148366-150538 placement
/**
 * runHeadlessCloudAttach：附加到已有云会话（archived/requires_action/running 等状态分支），可选本机提供工具。
 */
async function openBareAttachedSession({ apiCreds, credentials, openingRequests = [] }, sessionId, h = {}) {
  let compatSessionId = toCompatSessionId(sessionId);
  logEvent("tengu_remote_attach_session", {
    session_id: sanitizeMarkName(compatSessionId),
    entry_point: fromEnum("cloud_headless_bare"),
  });
  let remoteSessionUrl = getRemoteSessionUrl(compatSessionId, undefined, {
    from: "cli",
    m: "0",
  });
  let w = await (h.fetchSession ?? fetchSession)(compatSessionId, apiCreds).then(
    (k) => ({
      archived: k.session_status === "archived",
      awaitsAnswer: k.session_status === "requires_action",
      busy: k.session_status === "running",
      wontStart: k.startup_failure,
      boundDeviceUuid: k.bound_device_uuid,
    }),
    (error) => ({
      refused:
        error instanceof TeleportOperationError
          ? error.formattedMessage || errorMessage(error)
          : errorMessage(error),
    }),
  );
  if ("refused" in w) {
    await logFeatureBadAsync("remote_headless_session", "attach_refused");
    return {
      kind: "failed",
      message: `Error: ${printableName(w.refused, 300)}`,
    };
  }
  if (w.archived) {
    logEvent("tengu_remote_attach_session_rejected", {
      reason: lit("archived"),
      entry_point: fromEnum("cloud_headless_bare"),
    });
    await logFeatureBadAsync("remote_headless_session", "attach_archived");
    return {
      kind: "failed",
      message: formatArchivedSessionError(compatSessionId, remoteSessionUrl),
    };
  }
  if (w.wontStart !== undefined) {
    await logFeatureBadAsync("remote_headless_session", "attach_wont_start");
    return {
      kind: "failed",
      message: `Error: cloud session ${displaySessionId(compatSessionId)} will not start: ${printableName(w.wontStart, 200)} (${remoteSessionUrl})`,
    };
  }
  if (w.busy && ((await (h.turnInFlight ?? isRemoteTurnUnderWay)(compatSessionId, credentials)) ?? true)) {
    await logFeatureBadAsync("remote_headless_session", "attach_busy");
    return {
      kind: "failed",
      message: `Error: cloud session ${displaySessionId(compatSessionId)} is busy with a turn; wait for it to finish, or watch it at ${remoteSessionUrl}, then send the message again.`,
    };
  }
  if (w.awaitsAnswer) {
    await logFeatureBadAsync("remote_headless_session", "attach_requires_action");
    return {
      kind: "failed",
      message: `Error: cloud session ${displaySessionId(compatSessionId)} is waiting on a question; answer it where it was asked (${remoteSessionUrl}) before sending it another message.`,
    };
  }
  let R = await latestStreamPosition(compatSessionId, credentials, h, false).then(
    (at) => ({
      at,
    }),
    (error) => ({
      error: errorMessage(error),
    }),
  );
  if ("error" in R) {
    await logFeatureBadAsync("remote_headless_session", "attach_stream_position");
    return {
      kind: "failed",
      message: `Error: could not read where cloud session ${displaySessionId(compatSessionId)}'s stream stands (${printableName(R.error, 200)}).`,
    };
  }
  logFeatureOk("remote_headless_session");
  return {
    kind: "opened",
    session: {
      entry: "attach",
      ...cloudSessionContext(apiCreds, compatSessionId),
      initialSequenceNum: R.at,
      ...(openingRequests.length > 0 && {
        openingRequests,
      }),
      ...(w.boundDeviceUuid !== undefined &&
        isDeviceIdentityEnabledCached() && {
          eventSigner: deviceEventSignerIfBoundHere(w.boundDeviceUuid, credentials),
        }),
      cloudSession: () =>
        cloudSessionJsonSummary({
          sessionId: compatSessionId,
          viewUrl: remoteSessionUrl,
          device: unboundStatus("device_tools_off"),
          directorySync: dirSyncReport({
            dirSync: undefined,
            fileMode: "unspecified",
            sessionId: compatSessionId,
          }),
        }),
    },
  };
}
//@ chunk-fe6rs39h.js:151068-151199 placement
function hasPromptContent(prompt) {
  return typeof prompt === "string"
    ? prompt.trim() !== ""
    : prompt.some((n) => n.type !== "text" || (typeof n.text === "string" && n.text.trim() !== ""));
}
//@ chunk-fe6rs39h.js:151199-151768 placement
async function startDeviceBridgeForAttach(
  { sessionId, orgUuid, deviceId, getAccessToken, storageV5, servedSettingsChanged, seams },
  w,
) {
  let fileMode = await (seams.remoteFileMode ?? remoteFileModeUnspecified)(w?.gitRoot);
  let displayName = (seams.deviceDisplayName ?? deviceDisplayName)();
  let cloudDeviceRegistration = startCloudDeviceRegistration(
    {
      sessionId,
      orgUuid,
      deviceId,
      getAccessToken,
      storageV5,
      dirSync: w !== undefined,
      servedSettingsChanged,
    },
    seams.laptop,
  );
  cloudDeviceRegistration.started.then((O) => {
    if (!O)
      logForDebugging(
        "[headlessCloud] the device bridge did not start (gate off or account not fully configured); the session stays bound without laptop tools",
      );
  });
  logLaptopLinked({
    dirSync: w,
    fileMode,
    sessionId,
  });
  return {
    fileMode,
    displayName,
    bridge: cloudDeviceRegistration,
  };
}
//@ chunk-fe6rs39h.js:151768-152017 placement
function runHeadlessCloudAttach(e, n, s, r, { serveOnly: h = false } = {}) {
  return openWithFeatures(e, n, {
    entry: "attach",
    opener: (y) =>
      attachBareCloudSession(
        {
          ...y,
          openingRequests: attachOpeningRequests(e.permissionModeCli, {
            serveOnly: h,
          }),
          sessionHost: r,
          serveOnly: h,
        },
        s,
      ),
    features: h ? createAttachFeatures() : createCloudSessionFeatures(e, r),
    ...(h && {
      attachHonours: ["attachServeRequest"],
    }),
  });
}
//@ chunk-fe6rs39h.js:152017-152088 placement
function servedSettingsChangedOf(sessionHost) {
  return sessionHost === undefined
    ? undefined
    : deviceHooksProcessMemories.of(sessionHost).servedSettingsChanged;
}
//@ chunk-fe6rs39h.js:152088-152106 placement
function noopDialogWiring(e, dialogs) {}
//@ chunk-fe6rs39h.js:152106-152539 placement
function sdkHostOptionEntries(forwarded, n, s) {
  return [
    ["appendSystemPrompt", forwarded.appendSystemPrompt],
    ["systemPrompt", forwarded.customSystemPrompt],
    ["appendSubagentSystemPrompt", forwarded.appendSubagentSystemPrompt],
    ["effort", forwarded.effort],
    ["fallbackModel", forwarded.fallbackModel],
    ["maxBudgetUsd", forwarded.maxBudgetUsd],
    ["allowedTools", forwarded.allowedTools?.length],
    ["thinking", forwarded.thinking],
    ["proactivity", forwarded.proactivityLevel],
    ["model", s],
    ["name", n.sessionNameArg],
  ]
    .filter(([, h]) => Boolean(h))
    .map(([h]) => h);
}
//@ chunk-fe6rs39h.js:152539-158893 placement
/**
 * 附加到已有云会话的主体：预检、读取会话状态、本机记录查找、启动客户端与特性。
 */
async function attachBareCloudSession(
  {
    apiCreds,
    host = {
      initialize: null,
    },
    features = [],
    storageV5,
    credentials,
    sessionHost,
    openingRequests = [],
    serveOnly = false,
  },
  R,
  k = {},
) {
  let compatSessionId = toCompatSessionId(R);
  logEvent("tengu_remote_attach_session", {
    session_id: sanitizeMarkName(compatSessionId),
    entry_point: fromEnum("cloud_headless"),
  });
  let remoteSessionUrl = getRemoteSessionUrl(compatSessionId, undefined, {
    from: "cli",
    m: "0",
  });
  let P = cloudSessionContext(apiCreds, compatSessionId);
  let N = (k.fetchSession ?? fetchSession)(compatSessionId, apiCreds);
  let L = () =>
    (k.fetchSession ?? fetchSession)(compatSessionId, {
      ...apiCreds,
      accessToken: P.getAccessToken(),
    });
  let z = sessionRepositoryTrustReader({
    sessionId: compatSessionId,
    getAccessToken: P.getAccessToken,
    fetchSession: k.fetchSession ?? fetchSession,
    initial: N,
    createOrigin: undefined,
  });
  let j = await N.then(
    (B) => ({
      archived: B.session_status === "archived",
      awaitsAnswer: B.session_status === "requires_action",
      isOnSelfHostedRunner: isSelfHostedEnvironment(B),
      unreadable: false,
    }),
    (error) => {
      if (error instanceof TeleportOperationError)
        return {
          refused: error.formattedMessage || errorMessage(error),
        };
      logForDebugging(
        `[headlessCloud] attach preflight failed (continuing via the stream): ${errorMessage(error)}`,
      );
      return {
        archived: false,
        awaitsAnswer: false,
        isOnSelfHostedRunner: false,
        unreadable: true,
      };
    },
  );
  if ("refused" in j) {
    await logFeatureBadAsync("remote_headless_session", "attach_refused");
    return {
      kind: "failed",
      message: `Error: ${printableName(j.refused ?? "", 300)}`,
    };
  }
  if (j.archived) {
    logEvent("tengu_remote_attach_session_rejected", {
      reason: lit("archived"),
      entry_point: fromEnum("cloud_headless"),
    });
    await logFeatureBadAsync("remote_headless_session", "attach_archived");
    return {
      kind: "failed",
      message: formatArchivedSessionError(compatSessionId, remoteSessionUrl),
    };
  }
  let Y = false;
  let D;
  if (serveOnly) {
    let B = await (k.localServeLinkIdentity ?? checkAttachServeLocally)({
      sessionId: compatSessionId,
      credentials,
    });
    Y = B.ok || (B.refusal.kind === "local" && B.refusal.reason === "no_device_proof");
    D = B.ok ? B : undefined;
  }
  let W = latestStreamPosition(compatSessionId, credentials, k, Y).then(
    (position) => ({
      position,
    }),
    (error) => ({
      error: errorMessage(error),
    }),
  );
  let te = k.prepareLink ?? (k.linkForServing === undefined ? registerAndLinkDevice : undefined);
  let X =
    D !== undefined && te !== undefined && (k.linkPreparationOverlapOn ?? isLinkPreparationOverlapOn)()
      ? te({
          sessionId: compatSessionId,
          credentials,
          localIdentity: D,
          handsKeyToLaterReaders: true,
        })
      : undefined;
  X?.catch(() => {});
  let ee = await W;
  if ("error" in ee) {
    await logFeatureBadAsync("remote_headless_session", "attach_stream_position");
    return {
      kind: "failed",
      message: `Error: could not read where cloud session ${displaySessionId(compatSessionId)}'s stream stands (${printableName(ee.error, 200)}).`,
    };
  }
  let se;
  let x;
  let ie;
  if (serveOnly) {
    let request = readAttachServeRequest(host.initialize);
    let he = await (k.linkForServing ?? linkAttachServe)({
      sessionId: compatSessionId,
      orgUuid: apiCreds.orgUUID,
      credentials,
      request,
      ...(D && {
        localIdentity: D,
      }),
      ...(X && {
        prepared: X,
      }),
      handsKeyToLaterReaders: true,
    });
    if (!he.ok) {
      await logFeatureBadAsync("remote_headless_session", "attach_serve_link");
      return {
        kind: "failed",
        message: he.message,
      };
    }
    se = he.deviceId;
    x = he.heldKey;
    ie = maybeResumeAttach({
      sessionId: compatSessionId,
      orgUuid: apiCreds.orgUUID,
      deviceId: he.deviceId,
      held: he.heldKey,
      request,
      linkedStatus: he.toolHostStatus,
      readSession: L,
      credentials,
    });
  }
  let G = serveOnly && (await (k.hostedServeDialogsGateOn ?? isAttachServeEnabled)().catch(() => false));
  let Q = G ? createServedSettingsTracker() : undefined;
  let me =
    Q &&
    ((B, he) => {
      logRemoteToolsWarning(B, he);
      Q.add(B, he);
    });
  let q = G
    ? Promise.resolve(
        k.askDeviceMcpConsent ?? import("./chunk-8fq1kyxh.js").then((B) => B.askHostDeviceMcpConsent),
      )
        .then((B) =>
          B({
            dialogs: host.dialogs,
            storageV5,
            signal: host.signal ?? signal,
            ...(k.deviceMcpConsent && {
              seams: k.deviceMcpConsent,
            }),
          }),
        )
        .then(
          (B) => {
            switch (B.kind) {
              case "asked":
                return B.answer;
              case "not_asked":
                return "as_stored";
            }
          },
          (error) => {
            logError(error);
            return "as_stored";
          },
        )
    : undefined;
  let V = (k.resolveBinding ?? resolveAttachDeviceBinding)({
    sessionId: compatSessionId,
    storageV5,
    credentials,
    session:
      se !== undefined
        ? Promise.resolve({
            archived: false,
            boundDeviceId: se,
            toolHostLink: "this_helper",
          })
        : N.then(sessionBindingFields),
    ...(x && {
      loadLocalDevice: (B) => resolveRegisteredDevice(B, credentials, x),
    }),
  });
  let le = (k.keepSettings ?? keepSettingsBesideAHelper)(V, {
    ...(me && {
      onNotice: me,
    }),
  });
  registerCleanup(async () => le.end());
  let { binding } = le;
  let held = boundDeviceKeyOf(binding);
  let xe = false;
  let fe = (k.attachDirSync ?? findLocalSessionRecord)(
    compatSessionId,
    pullsBackToThisMachine(binding),
    boundDeviceOf(binding),
    credentials,
    storageV5,
    sessionHost,
    held,
    xe,
  );
  let deviceBridge = (k.registerDevice ?? registerAttachedDevice)({
    sessionId: compatSessionId,
    getAccessToken: () => deviceBridgeAccessToken(apiCreds),
    orgUuid: apiCreds.orgUUID,
    binding,
    cloudClient: !serveOnly,
    toolServingOn: isViolinWoodEnabledCached(),
    storageV5,
    dirSync: fe.then(
      (B) => B.handle !== undefined,
      () => false,
    ),
    folderRelation: serveOnly
      ? Promise.all([
          fe,
          N.then(
            (B) => ({
              boundDeviceId: B.bound_device_uuid,
              createdAt: B.created_at,
            }),
            () => {
              return;
            },
          ),
          (k.syncRecordSweep ?? readRetentionCutoff)(),
        ]).then(
          ([B, he, Ee]) =>
            shouldServeOnlyNotArmed({
              serveOnly,
              lookup: B,
              sessionBefore: he,
              sweep: Ee,
            }),
          () => {
            return;
          },
        )
      : Promise.resolve(undefined),
    servedSettingsChanged: servedSettingsChangedOf(sessionHost),
    ...(me && {
      onNotice: me,
    }),
    ...(q && {
      deviceMcpQuestion: q,
    }),
  });
  registerCleanup(() => deviceBridge.stop());
  let [pe, ce, yt, Be] = await Promise.all([
    binding,
    fe,
    (k.settingsToCloudEnabled ?? isSettingsToCloudEnabled)().catch(() => false),
    le.kept,
  ]);
  if (!Be) {
    le.end();
    await deviceBridge.stop();
    await logFeatureBadAsync("remote_headless_session", "attach_settings_not_kept");
    return {
      kind: "failed",
      message: `Error: ${SETTINGS_NOT_KEPT_REFUSAL}`,
    };
  }
  let it = false;
  logAttachRecordLookup(sessionRecordState(ce), serveOnly ? "attach_serve" : "cloud_headless");
  let Ae = undefined;
  let handle = ce.handle;
  noopDialogWiring(handle, host.dialogs);
  let vt = await (k.remoteFileMode ?? remoteFileModeUnspecified)(handle?.gitRoot, it);
  if (j.unreadable) logFeatureSad("remote_headless_session", "attach_session_unreadable");
  else if (ce.handle === undefined && ce.why === "lookup_failed")
    logFeatureSad("remote_headless_session", "attach_dir_sync_lookup_failed");
  else if (ce.handle === undefined && ce.why === "elsewhere_unknown")
    logFeatureSad("remote_headless_session", "attach_dir_sync_elsewhere_unknown");
  else logFeatureOk("remote_headless_session");
  let toolHostLink =
    pe.status === "bound" && !isKnownBindingState(pe.toolHostLink) ? pe.toolHostLink : undefined;
  let Z =
    pe.status === "bound"
      ? await startServedTools(
          compatSessionId,
          pe.toolHostLink,
          pe.deviceId,
          !serveOnly,
          deviceBridge,
          me ?? logRemoteToolsWarning,
          z,
          L,
          ie,
        )
      : {};
  let je =
    toolHostLink !== undefined && Z.servedToolsUnavailable === "helper_only"
      ? getBareSessionNoToolsNotice(toolHostLink)
      : undefined;
  let Fe = await attachHeadlessFeatures(
    features,
    normalizeOpenOptions({
      sessionId: compatSessionId,
      binding: bindingState(pe),
      trigger: "attach",
      isOnSelfHostedRunner: j.isOnSelfHostedRunner,
      storageV5,
      credentials,
      settingsToCloud: yt,
      isProjectSynced: false,
      ...(handle && {
        dirSync: handle,
      }),
      ...(!(ce.handle === undefined && ce.why === "not_looked") && {
        sessionRecordMayBeElsewhere: ce.handle === undefined && ce.why !== "not_armed_here",
      }),
      ...(pe.status === "bound" && {
        boundDeviceUuid: pe.deviceId,
      }),
      ...Z,
      signal: host.signal,
    }),
  );
  let Ie = pe.status === "bound" ? servedFolderConfigNotice(serveOnly ? "serve_only" : "attach") : undefined;
  if (Ie !== undefined) (me ?? logRemoteToolsWarning)(SERVED_FOLDER_CONFIG_NOT_USED, Ie);
  let Re = pe.status === "bound" ? servedProjectEnvNotice(serveOnly ? "serve_only" : "attach") : undefined;
  if (Re !== undefined) (me ?? logRemoteToolsWarning)(SERVED_PROJECT_ENV_NOT_APPLIED, Re);
  let ge = [
    ...(ce.handle === undefined && ce.why === "elsewhere" && ce.line !== undefined
      ? [
          {
            level: "warning",
            text: ce.line,
          },
        ]
      : []),
    ...(Ie !== undefined && !serveOnly
      ? [
          {
            level: "notice",
            text: Ie,
          },
        ]
      : []),
    ...(Re !== undefined && !serveOnly
      ? [
          {
            level: "notice",
            text: Re,
          },
        ]
      : []),
    ...(je !== undefined
      ? [
          {
            level: "notice",
            text: je,
          },
        ]
      : []),
  ];
  return {
    kind: "opened",
    session: {
      entry: "attach",
      ...P,
      ...(pe.status === "bound" && {
        eventSigner: deviceEventSignerFor(pe.deviceId, credentials, await held),
      }),
      ...(serveOnly && {
        controlOnly: true,
      }),
      ...(se !== undefined && {
        stillLinkedHere: () => waitForLinkedStatus(se, L, ie),
      }),
      ...(ie && {
        resumeLinkHere: ie.resume,
      }),
      initialSequenceNum: ee.position,
      ...(openingRequests.length > 0 && {
        openingRequests,
      }),
      ...(j.awaitsAnswer && {
        workerAwaitsAnswer: true,
      }),
      ...(ge.length > 0 && {
        notices: ge,
      }),
      ...{},
      dirSync: handle ?? Ae,
      featureHandles: Fe,
      dispose: () => disposeHandles(Fe),
      cloudSession: () => {
        let B = Ae !== undefined && Ae.sync.state().state !== "off";
        let he = B ? "container_sync" : vt;
        let Ee = Q?.list() ?? [];
        return {
          ...cloudSessionJsonSummary({
            sessionId: compatSessionId,
            viewUrl: remoteSessionUrl,
            device: toDeviceBindingStatus(pe),
            directorySync: {
              ...sessionRecordReport(
                B
                  ? {
                      handle: Ae,
                    }
                  : ce,
                he,
                it,
              ),
              file_mode: he,
              file_mode_source: "stored",
            },
            repositoryTrust: repositoryTrustOf(z),
          }),
          ...(Ee.length > 0 && {
            notices: Ee,
          }),
        };
      },
      ...((Q || z) && {
        onCloudSessionChanged: (B) => {
          Q?.onChanged(B);
          z?.onChanged(B);
        },
      }),
    },
  };
}
//@ chunk-fe6rs39h.js:158893-158961 placement
function repositoryTrustOf(e) {
  return e === undefined
    ? undefined
    : markableRepositoryTrust(reportableRepositoryTrust(e.current(), isTrustedDeviceActiveForOrg()));
}
//@ chunk-fe6rs39h.js:158961-159220 placement
function sessionRecordState(e) {
  if (e.handle !== undefined) return "held";
  switch (e.why) {
    case "not_looked":
    case "elsewhere":
      return e.why;
    case "elsewhere_unknown":
      return "unknown";
    case "lookup_failed":
      return "failed";
    case "not_armed_here":
      return e.noRecordOnThisMachine ? "nowhere" : "here_only";
  }
}
//@ chunk-fe6rs39h.js:159220-159812 placement
function sessionRecordReport(e, n, s) {
  if (e.handle === undefined)
    switch (e.why) {
      case "lookup_failed":
        return {
          state: "off",
          reason: "lookup_failed",
          message: "This computer could not check whether it holds a record of this session.",
        };
      case "elsewhere":
        return {
          state: "off",
          reason: "seeded_elsewhere",
          message: "This computer holds a record of this session under another directory, not this one.",
        };
      case "not_armed_here":
      case "elsewhere_unknown":
      case "not_looked":
        return {
          state: "off",
          reason: "not_opted_in",
        };
    }
  let r = e.handle.sync.state();
  return {
    state: r.state,
    ...("reason" in r && {
      reason: r.reason,
    }),
    ...("message" in r && {
      message: r.message,
    }),
    ...armedDirSyncFields(r),
  };
}
//@ chunk-fe6rs39h.js:159812-160033 placement
function bindingState(e) {
  switch (e.status) {
    case "bound":
      return "bound";
    case "not_applicable":
    case "created_unbound":
      return "none";
    case "unbound":
      return e.reason === "session_unreadable" ? "unknown" : "elsewhere";
    case "disabled":
      return "unknown";
  }
}
//@ chunk-fe6rs39h.js:160033-160345 placement
function toDeviceBindingStatus(e) {
  switch (e.status) {
    case "bound":
      return {
        status: "bound",
        device_id: e.deviceId,
      };
    case "unbound":
      return unboundStatus(e.reason);
    case "created_unbound":
      return {
        status: "unbound",
        reason: "session_unbound",
        message: formatUnboundSessionNotice(e.reason),
      };
    case "not_applicable":
      return unboundStatus("session_unbound");
    case "disabled":
      return unboundStatus("device_tools_off");
  }
}
//@ chunk-fe6rs39h.js:160345-160409 placement = resolveKey (0.584)
function unboundStatus(reason) {
  return {
    status: "unbound",
    reason,
    message: deviceBindingRefusalText(reason),
  };
}
export {
  SESSION_HISTORY_PAGE_SIZE,
  SESSION_HISTORY_MAX_PAGES,
  cloudCreateGates,
  authenticateThenOpen,
  openBareAttachedSession,
  attachOpeningRequests,
  openBareCloudSession,
  registeredBuiltInToolNames,
  withNotApplied,
  notAppliedReport,
  getUnconfirmedOptions,
};

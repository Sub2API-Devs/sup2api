/**
 * cli/headlessCloud/openBareCloudSession.ts
 *
 * 2.1.316 新增：无头 --cloud 新建或附加云会话：门禁校验、带特性打开会话、报告未生效的特性。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-keyy05re.js (50)
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
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
import { getSettingsForSource, getInitialSettings } from "../../utils/settings/settings.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-keyy05re.js:128604-128776 placement
function takeDirSyncHandle(id, laptop = {}) {
  let takeDirSync = (laptop.takeDirSync ?? takeDirSyncHandle_2)(id);
  return takeDirSync === undefined
    ? Promise.resolve(undefined)
    : takeDirSync.catch((error) => {
        logForDebugging(`[headlessCloud] session handle unavailable: ${errorMessage(error)}`);
        return;
      });
}
//@ chunk-keyy05re.js:128776-128950 placement
async function releaseDirSyncHandle(handlePromise, laptop = {}) {
  try {
    let handle = await handlePromise;
    if (handle === undefined) return;
    await (laptop.releaseDirSync ?? retireDirSync)(handle.sessionId);
  } catch (error) {
    logForDebugging(`[headlessCloud] session handle not released: ${errorMessage(error)}`);
  }
}
//@ chunk-keyy05re.js:128950-128986 placement
async function retireDirSync(sessionId) {
  dirSyncSession().retire(sessionId);
}
//@ chunk-keyy05re.js:128986-129029 placement
async function remoteFileModeUnspecified(sessionId, target) {
  return "unspecified";
}
//@ chunk-keyy05re.js:129029-129369 placement
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
    onNotice: (what, detail) =>
      logForDebugging(`[remote-tools] ${what}: ${detail}`, {
        level: "warn",
      }),
  });
}
//@ chunk-keyy05re.js:129474-129600 placement
function dirSyncState({ dirSync, fileMode, sessionId }) {
  if (dirSync !== undefined) return dirSync.sync.state();
  return {
    state: "off",
    reason: "not_opted_in",
  };
}
//@ chunk-keyy05re.js:129600-129942 placement
function dirSyncReport({ dirSync, fileMode, sessionId }) {
  let options = dirSyncState({
    dirSync,
    fileMode,
    sessionId,
  });
  return {
    state: options.state,
    ...("reason" in options &&
      options.reason !== undefined && {
        reason: options.reason,
      }),
    ...("message" in options &&
      options.message !== undefined && {
        message: options.message,
      }),
    ...armedDirSyncFields(options),
    ...(nullOnError_2(dirSync?.createFacts?.origin).fromUpload && {
      started_from_upload: true,
    }),
    file_mode: fileMode,
    file_mode_source: "stored",
  };
}
//@ chunk-keyy05re.js:129942-130360 placement
function armedDirSyncFields(state) {
  if (state.state !== "armed") return {};
  return {
    ...(state.firstUpload !== null && {
      first_upload: state.firstUpload,
    }),
    ...(state.syncedFiles !== null && {
      synced_files: state.syncedFiles,
    }),
    ...(state.writerElsewhere && {
      other_window: true,
    }),
    ...(state.switchedOffByAnthropic === true && {
      muted: true,
    }),
    ...(state.versionDisagreement !== undefined && {
      muted: true,
      reason: state.versionDisagreement.reason,
      message: state.versionDisagreement.message,
    }),
    ...(state.direction !== "pending" && {
      direction: state.direction,
    }),
  };
}
//@ chunk-keyy05re.js:130360-130602 placement
function logLaptopLinked({ dirSync, fileMode, sessionId }) {
  let options = dirSyncState({
    dirSync,
    fileMode,
    sessionId,
  });
  logEvent("tengu_remote_headless_laptop_linked", {
    sync_state: fromEnum(options.state),
    sync_reason: fromEnumOpt("reason" in options ? options.reason : undefined),
    file_mode: fromEnum(fileMode),
    has_dir_sync: dirSync !== undefined,
  });
}
//@ chunk-keyy05re.js:130602-130724 placement
var CLOUD_START_TIMEOUT_MS = 5000;
var STDIN_IS_TTY_ERROR =
  "Error: headless --cloud reads the SDK host messages from stdin as stream-json; stdin is a terminal here.";
//@ chunk-keyy05re.js:130724-130957 placement
function cloudSessionContext(apiCreds, sessionId) {
  return {
    sessionId,
    orgUuid: apiCreds.orgUUID,
    getAccessToken: () => sessionsApiAccessTokenWithCcrFallback(apiCreds.profile) ?? apiCreds.accessToken,
    consoleProfileBearer: apiCreds.profile,
    onAuth401: (token) => recoverSessionsApiBearer(token, undefined, undefined, apiCreds.profile),
    onDerivedSessionId: (sessionId) => {
      switchSession(identityAgentId(sessionId), "remote_attach");
    },
  };
}
//@ chunk-keyy05re.js:130957-131064 placement
async function checkLocalBindIdentity() {
  if (isConsoleProfileSessionsCredential()) return "profile";
  let result = await localBindIdentity({
    accountUuid: currentAccountUuid(),
  });
  return result.ok ? undefined : result.error;
}
//@ chunk-keyy05re.js:131064-131103 placement
function currentAccountUuid() {
  return getStoredOauthAccountInfo()?.accountUuid;
}
//@ chunk-keyy05re.js:131103-131324 placement (2.1.88 match: PermissionModeSchema, 0.42)
/**
 * 由 --permission-mode 生成启动时需发送的 set_permission_mode 控制请求。
 */
function attachOpeningRequests(permissionModeCli, { serveOnly }) {
  if (serveOnly) return [];
  let mode = cloudPermissionModeFrom(permissionModeCli);
  return mode === undefined || (mode === "default" && permissionModeCli !== PERMISSION_MODE_MANUAL_ALIAS)
    ? []
    : [
        {
          request: {
            subtype: "set_permission_mode",
            mode,
          },
          required: mode === "plan" || mode === "dontAsk",
          describe: `--permission-mode ${mode}`,
        },
      ];
}
//@ chunk-keyy05re.js:131324-131371 placement
var signal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SESSION_HISTORY_PAGE_SIZE;
var SESSION_HISTORY_MAX_PAGES;
deferInit("chunk-keyy05re.js:131324", () => {
  signal = new AbortController().signal;
  SESSION_HISTORY_PAGE_SIZE = 50;
  SESSION_HISTORY_MAX_PAGES = 5;
});
//@ chunk-keyy05re.js:131371-131612 placement
function normalizeOpenOptions({
  signal: signal_2,
  credentials,
  homeSeed,
  servedTools,
  servedToolsUnavailable,
  ...options
}) {
  return {
    ...options,
    bound: options.binding === "bound",
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
//@ chunk-keyy05re.js:131612-131675 placement
function logRemoteToolsWarning(what, detail) {
  logForDebugging(`[remote-tools] ${what}: ${detail}`, {
    level: "warn",
  });
}
//@ chunk-keyy05re.js:131675-132270 placement
async function startServedTools(
  options,
  sessionId,
  deviceId,
  cloudClient,
  deviceBridge,
  onNotice,
  credentials,
  cloudClientFlag,
  deviceBridgeArg,
) {
  if (!isViolinWoodEnabledCached())
    return {
      servedToolsUnavailable: "flag_off",
    };
  if (!isKnownBindingState(sessionId))
    return {
      servedToolsUnavailable: "helper_only",
    };
  let { servedToolsAttachOptions, servedToolsUnavailableReason } =
    await import("../../remote/tools/servedToolsAttachOptions.lazy.js");
  let servedTools = servedToolsAttachOptions({
    owner: () => ({
      owner: true,
      deviceId,
    }),
    cloudClient,
    deviceBridge,
    onNotice,
    ...(credentials && {
      repositoryTrust: credentials,
    }),
    stillBound: async () => {
      let linkedStatus = await readLinkedStatus(deviceId, cloudClientFlag, deviceBridgeArg);
      if (linkedStatus === "linked") return true;
      return linkedStatus === "ended" ? false : undefined;
    },
    plumbing: (
      await import("../../services/remoteTools/servedSessionPlumbing.lazy.js")
    ).servedSessionPlumbing(options),
  });
  return servedTools === undefined
    ? {
        servedToolsUnavailable: servedToolsUnavailableReason() ?? "flag_off",
      }
    : {
        servedTools,
      };
}
//@ chunk-keyy05re.js:132270-132328 placement
function disposeHandles(features) {
  let adopted = new HeadlessFeatureHandles();
  adopted.adopt(features);
  return adopted.dispose();
}
//@ chunk-keyy05re.js:132328-133302 placement
async function openWithFeatures(options, host, { entry, opener, features = [], attachHonours = [] }) {
  let honours = entry === "create" ? PROMPT_OPTION_KEYS : attachHonours;
  let gated = await checkCloudGates(options, host, entry);
  if (gated.kind === "refused") {
    await logFeatureBadAsync("remote_headless_session", gated.code);
    printCliError(gated.message);
    await gracefulShutdown(1);
    return;
  }
  let { input, policy } = gated;
  policy.notices.forEach(noteHeadless);
  setHasFormattedOutput(true);
  setIsRemoteMode(true);
  let client = await runHeadlessCloudClient({
    input,
    builtInToolNames: registeredBuiltInToolNames,
    replayUserMessages: options.effectiveReplayUserMessages,
    includePartialMessages: options.effectiveIncludePartialMessages,
    initializePolicy: "strict",
    ignoredOptions:
      entry === "create"
        ? policy.ignored
        : normalizeCaseForComparison_2([
            ...policy.ignored,
            ...sdkHostOptionEntries(policy.forwarded, options, options.effectiveModel ?? env.ANTHROPIC_MODEL),
          ]),
    openingInitializeHonours: honours,
    openSession: (openRequest) =>
      authenticateThenOpen(options.credentials, async (apiCreds) => {
        let request = await opener({
          apiCreds,
          host: openRequest,
          forwarded: entry === "create" ? cloudPromptOverrides(policy.forwarded, openRequest.initialize) : {},
          features,
          storageV5: options.storageV5,
          credentials: options.credentials,
        });
        return withNotApplied(
          request,
          notAppliedReport(
            [...getUnconfirmedOptions(policy.forwarded, request), ...policy.notApplied],
            openRequest.initialize,
            entry,
            honours,
          ),
        );
      }),
  }).done;
  if (client.message && client.exitCode === 0) noteHeadless(client.message);
  else if (client.message) printCliError(client.message);
  await gracefulShutdown(client.exitCode);
}
//@ chunk-keyy05re.js:133302-133655 placement
async function authenticateThenOpen(credentials, credArgs) {
  let apiCreds;
  try {
    apiCreds = await prepareApiRequest(credentials);
  } catch (error) {
    await logFeatureBadAsync("remote_headless_session", "auth");
    return {
      kind: "failed",
      message: `Error: ${printableName(errorMessage(error), MAX_ERROR_MESSAGE_CHARS) || "Failed to authenticate"}`,
    };
  }
  try {
    return await credArgs(apiCreds);
  } catch (error) {
    await logFeatureBadAsync("remote_headless_session", "open_threw");
    return {
      kind: "failed",
      message: `Error: ${printableName(errorMessage(error), MAX_ERROR_MESSAGE_CHARS) || "Unable to open the cloud session"}`,
    };
  }
}
//@ chunk-keyy05re.js:133655-133679 placement
var MAX_LISTED_REFUSAL_GROUPS = 12;
var MAX_ERROR_MESSAGE_CHARS = 2000;
var MAX_LISTED_ENTRIES = 40;
//@ chunk-keyy05re.js:133679-134614 placement
function notAppliedReport(notAppliedEntries, options, entry, supplied) {
  let openEntry = new Set(entry === "attach" ? PROMPT_OPTION_KEYS : []);
  let keptKinds =
    options === null
      ? []
      : lostSdkFeatures(options, "strict", new Set([...supplied, "supportedDialogKinds"])).ignored.map(
          (feature) => ({
            kind: openEntry.has(feature) ? "kept" : cloudOptionTreatment(feature),
            name: `initialize.${feature}`,
          }),
        );
  let order = {
    lost: 0,
    kept: 1,
    preference: 2,
  };
  let sorted = [...notAppliedEntries, ...keptKinds].sort(
    (combined, kinds) => order[combined.kind] - order[kinds.kind],
  );
  let lost = (kind) => sorted.filter((feature) => feature.kind === kind);
  let lostEntries = lost("lost");
  let kept = lost("kept");
  let preference = lost("preference");
  let label = (entry) =>
    entry.kind === "lost" && entry.why !== undefined ? `${entry.name} (${entry.why})` : entry.name;
  let joined = [
    ...(kept.length > 0
      ? [
          `An existing cloud session keeps the configuration it was created with; not applied: ${listWithOverflow(kept.map(label))}.`,
        ]
      : []),
    ...(preference.length > 0
      ? [
          `Host options not applied to this cloud session (it runs with the cloud container's own configuration): ${listWithOverflow(preference.map(label))}.`,
        ]
      : []),
  ].join(" ");
  return {
    notices: [
      ...(lostEntries.length > 0
        ? [
            {
              level: "warning",
              text: `Not applied to this cloud session, where the agent runs with the cloud container's own configuration: ${listWithOverflow(lostEntries.map(label))}.`,
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
//@ chunk-keyy05re.js:134614-134758 placement
function getUnconfirmedOptions(forwarded, result) {
  let maxTurnsSettled =
    result.kind === "opened" &&
    result.session.entry === "create" &&
    result.session.maxTurnsConfirmed === true;
  return forwarded.maxTurns !== undefined && !maxTurnsSettled ? [MAX_TURNS_UNCONFIRMED_ENTRY] : [];
}
//@ chunk-keyy05re.js:134758-134861 placement
function listWithOverflow(names) {
  return names.length > MAX_LISTED_REFUSAL_GROUPS
    ? `${names.slice(0, MAX_LISTED_REFUSAL_GROUPS).join(", ")} (and ${names.length - MAX_LISTED_REFUSAL_GROUPS} more)`
    : names.join(", ");
}
//@ chunk-keyy05re.js:134861-135121 placement
function withNotApplied(result, report) {
  if (result.kind !== "opened" || report.entries.length === 0) return result;
  let { session } = result;
  return {
    ...result,
    session: {
      ...session,
      notices: [...(session.notices ?? []), ...report.notices],
      cloudSession: () => ({
        ...session.cloudSession(),
        not_applied: report.entries.map(({ kind, name: entry }) => ({
          name: entry,
          kind,
        })),
      }),
    },
  };
}
//@ chunk-keyy05re.js:135121-135216 placement
function noteHeadless(text) {
  logForDebugging(`[headlessCloud] ${text}`);
  if (process.stderr.isTTY)
    process.stderr.write(`${text}
`);
}
//@ chunk-keyy05re.js:135216-135260 placement
function registeredBuiltInToolNames() {
  return getAllBaseTools().map((line) => line.name);
}
//@ chunk-keyy05re.js:135260-136008 placement
async function cloudCreateGates(
  options,
  host,
  entry,
  { isDeviceLess: openEntry = false, poolLaunchFolder: isDeviceLess } = {},
) {
  let orgCheck = options.orgValidation ?? (await validateForceLoginOrg());
  if (!orgCheck.valid) {
    if (orgCheck.policyUnreadable) recordManagedSettingsRefusal("policy_invalid");
    return {
      kind: "refused",
      code: orgCheck.reason === "provider_not_allowed" ? "provider_not_allowed" : "org_pin",
      message: orgCheck.message,
    };
  }
  await waitForPolicyLimitsToLoad();
  let reference = cloudSessionsUnavailableReason();
  if (reference) {
    await logOrgPolicyDeniedAsync("allow_remote_sessions", "cloud_session");
    return {
      kind: "refused",
      code: "unavailable",
      message: `Error: ${reference}`,
    };
  }
  let forwarded = withMaxTurns(host, options.resolvedMaxTurns);
  let flagSettings = cloudLaunchOptionsFrom(options, getSettingsForSource("flagSettings"));
  let selectedAgent;
  let rejected = checkCloudLaunchFlags(forwarded, {
    entry,
    isDeviceLess: openEntry,
    ...flagSettings,
    ...(selectedAgent !== undefined && {
      selectedAgentDefinition: null,
    }),
  });
  if (rejected.kind === "rejected")
    return {
      kind: "refused",
      code: CLOUD_REFUSAL_SUBTYPES[rejected.reason],
      message: rejected.message,
    };
  return {
    kind: "ready",
    policy:
      selectedAgent === undefined
        ? rejected
        : {
            ...rejected,
            repositoryAgent: selectedAgent.name,
            notices: [...rejected.notices, selectedAgent.notice],
          },
  };
}
//@ chunk-keyy05re.js:136008-136228 placement
async function checkCloudGates(options, host, entry) {
  let inputPrompt = options.inputPrompt;
  let openEntry = await cloudCreateGates(options, host, entry);
  if (openEntry.kind === "refused") return openEntry;
  if (typeof inputPrompt === "string")
    return {
      kind: "refused",
      code: "no_stream_input",
      message: STDIN_IS_TTY_ERROR,
    };
  return {
    kind: "ready",
    input: inputPrompt,
    policy: openEntry.policy,
  };
}
//@ chunk-keyy05re.js:136228-136372 placement
function runHeadlessCloudCreate(options, host, openerOptions) {
  return openWithFeatures(options, host, {
    entry: "create",
    opener: (sessionHost) =>
      createBareCloudSession(options, {
        ...sessionHost,
        sessionHost: openerOptions,
        carriedMode: host.inheritPermissionMode,
      }),
    features: createCloudSessionFeatures(options, openerOptions),
  });
}
//@ chunk-keyy05re.js:136372-136529 placement
function createAttachFeatures() {
  let idleMinutes = env.CLAUDE_CODE_REMOTE_TOOLS_HOST_IDLE_RELEASE_MINUTES;
  return [
    createServedToolsFeature({
      openChannel: createRemoteSessionConnection,
      controlOnly: true,
      ...(idleMinutes !== undefined && {
        idleReleaseMs: idleMinutes * 60000,
      }),
    }),
  ];
}
//@ chunk-keyy05re.js:136529-136746 placement
function createCloudSessionFeatures(options, sessionHost) {
  return [
    createHomeSettingsFeature({
      forwardHomeSettings: options.forwardHomeSettings,
      hostConsent: options.homeSettingsConsent,
    }),
    createPluginForwardingFeature({
      memory: deviceProofStateRegistry.of(sessionHost),
      reachMemory: reachStateRegistry.of(sessionHost),
    }),
    createDeviceHooksFeature({
      getTools: () => options.tools,
      memory: deviceHooksProcessMemories.of(sessionHost),
    }),
    createServedToolsFeature({
      openChannel: createRemoteSessionConnection,
    }),
  ];
}
//@ chunk-keyy05re.js:136746-143430 placement
/**
 * 官方行为，保留：createBareCloudSession 中 if (V_K137841 !== null) 整段不可达（恒 null），G_K137777/x_K137771 只赋值不使用；本版构建里是死代码。
 */
async function createBareCloudSession(
  options,
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
  seams = {},
) {
  let teleport = seams.teleport ?? teleportToRemote;
  let branchMode = branchModeForTelemetry(options.poolOnBranch, options.poolRef);
  let teleportFn = await (seams.bindPreflight ?? checkLocalBindIdentity)();
  if (teleportFn !== undefined) {
    await logFeatureBadAsync("remote_headless_session", "bind_unavailable", {
      reason: fromEnum(teleportFn),
      ...launchLocationFacts(teleportFn),
      ...null?.fields,
    });
    return {
      kind: "failed",
      message: formatUnboundCreateError(teleportFn, null?.why),
    };
  }
  let abortController = new AbortController();
  let releaseAbort = registerCleanup(() => abortController.abort());
  let combinedAbortSignal = createCombinedAbortSignal(abortController.signal, {
    signalB: host.signal,
  });
  let hasConsented = onceExport(() => false);
  let poolRevision = options.poolOnBranch
    ? {
        revision: options.poolOnBranch,
        flag: "--on-branch",
      }
    : options.poolRef
      ? {
          revision: options.poolRef,
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
    releaseAbort();
    return {
      kind: "failed",
      message: "Error: Unable to create cloud session",
    };
  }
  let consented = hasConsented();
  let projectSyncedState = false;
  let settingsToCloud = await (seams.settingsToCloudEnabled ?? isSettingsToCloudEnabled)().catch(() => false);
  let projectSyncEnabled = false;
  let versionRefusal = null;
  if (versionRefusal !== null) {
    releaseAbort();
    return {
      kind: "failed",
      message: versionRefusal,
      startupFailureReason: "cli_version_too_old",
    };
  }
  let hostConsentMode = resolveHostConsentMode({
    hostConsent: options.homeSettingsConsent,
    areOwnFlagsOn: settingsToCloud,
    stored: storedHomeSettingsMode(),
    isProjectSynced: projectSyncEnabled,
  });
  if (settingsToCloud || projectSyncEnabled)
    noteHomeSettingsPrompt({
      launchConsent: hostConsentMode,
      isProjectSynced: projectSyncEnabled,
      launchMayForward: options.forwardHomeSettings,
      surface: "sdk_host",
      trigger: "create",
    });
  let settings = getInitialSettings();
  let { model, explicitMode, decision, isModeFromSettings, noticeOnRunner } = buildCloudCreateOptions(
    options,
    {
      settingsToCloudEnabled: settingsToCloud || isLaunchConsentBlocked(hostConsentMode),
      launchConsent: hostConsentMode,
      settings,
      hostFillsDefault: true,
      typedLevel: forwarded.proactivityLevel,
      carriedMode,
    },
    seams,
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
    seams: seams.unattendedConsent,
  });
  let aborted_2 = combinedAbortSignal_2.signal.aborted;
  combinedAbortSignal_2.cleanup();
  if (aborted_2) {
    releaseAbort();
    return {
      kind: "failed",
      message: "Error: Unable to create cloud session",
    };
  }
  let bindingState = {
    status: "unbound",
    reason: undefined,
  };
  let getBindingState = () => bindingState;
  let deviceBinding = {
    orgUuid: apiCreds.orgUUID,
    accountUuid: currentAccountUuid(),
    onBound: (deviceId) => {
      bindingState = {
        status: "bound",
        deviceId,
      };
    },
    onUnbound: (reason) => {
      bindingState = {
        status: "unbound",
        reason,
      };
    },
    abandonsUnbound: true,
  };
  let createFailure;
  let branchName = options.poolOnBranch ?? options.poolRef ?? (await (seams.currentBranch ?? getBranch)());
  let bundleNotices = [];
  let teleportResult = await teleport({
    initialMessage: null,
    signal: abortController.signal,
    source: "remote",
    branchName: branchName || undefined,
    title: options.sessionNameArg || undefined,
    description: options.remote || undefined,
    reuseOutcomeBranch: options.poolOnBranch ?? undefined,
    explicitRef: options.poolOnBranch ?? options.poolRef ?? undefined,
    branchFromHead: (options.poolOnBranch ?? options.poolRef) == null,
    personal: options.personal,
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
    forwardHomeSettings: options.forwardHomeSettings,
    ...(hostConsentMode && {
      homeSettingsConsent: hostConsentMode,
    }),
    onBundleNotice: (text, level) => {
      bundleNotices.push({
        level: level ?? "notice",
        text,
      });
    },
    onBundleFail: (message, reason) => {
      createFailure = {
        message,
        reason: reason === "env_create" ? "env_create_failed" : "bundle_failed",
        detail: undefined,
      };
    },
    onCreateFail: (message, reason, detail) => {
      createFailure = {
        message,
        reason,
        detail,
      };
    },
  }).finally(releaseAbort);
  if (teleportResult === null)
    return reportCreateSessionError(
      createFailure,
      abortController.signal.aborted,
      branchMode,
      "cloud_headless",
    );
  let permissionMode =
    teleportResult.settingsModeOnRunner === undefined ? decision.permissionMode : undefined;
  let runnerNotice = teleportResult.settingsModeOnRunner === undefined ? decision.notice : noticeOnRunner;
  if (teleportResult.settingsModeOnRunner !== undefined && noticeOnRunner !== undefined)
    noteHeadless(noticeOnRunner.text);
  let dirSyncHandle = takeDirSyncHandle(teleportResult.id, seams.laptop);
  let releaseSession = async () => {
    abortController.abort();
    await releaseDirSyncHandle(dirSyncHandle, seams.laptop);
  };
  let binding = getBindingState();
  if (binding.status === "unbound") await releaseSession();
  await logEventAsync("tengu_remote_create_session_success", {
    session_id: shortHash(teleportResult.id),
    entry_point: fromEnum("cloud_headless"),
    branch_mode: branchMode,
    ...(forwarded.maxTurns !== undefined && {
      max_turns_confirmed: teleportResult.maxTurnsConfirmed === true,
    }),
    home_seed_started: teleportResult.homeSeed !== undefined,
    ...(teleportResult.settingsPackUnsent !== undefined && {
      settings_pack_unsent: fromEnum(teleportResult.settingsPackUnsent),
    }),
    ...(teleportResult.settingsModeOnRunner !== undefined && {
      settings_mode_on_runner: fromEnum(teleportResult.settingsModeOnRunner),
      settings_mode_warned: runnerNotice?.level === "warning",
    }),
    ...(options.homeSettingsConsent && {
      home_settings_host_consent: fromEnum(options.homeSettingsConsent),
    }),
  });
  let remoteSessionUrl = getRemoteSessionUrl(teleportResult.id, undefined, {
    from: "cli",
    m: "0",
  });
  let archiveSession = () =>
    (seams.archiveSession ?? archiveRemoteSession)(teleportResult.id, CLOUD_START_TIMEOUT_MS).catch(
      () => false,
    );
  if (binding.status === "unbound") {
    let archived = await archiveSession();
    await logFeatureBadAsync("remote_headless_session", "unbound", {
      reason: fromEnumOpt(binding.reason) ?? lit("unknown"),
      archived,
    });
    return {
      kind: "failed",
      message: formatBindFailure(teleportResult.id, binding.reason, remoteSessionUrl, archived),
    };
  }
  let sessionContext = cloudSessionContext(apiCreds, teleportResult.id);
  let createFacts = await dirSyncHandle;
  noopDialogWiring(createFacts, host.dialogs);
  let bridgeOutcome = await startDeviceBridgeForAttach(
    {
      sessionId: teleportResult.id,
      orgUuid: apiCreds.orgUUID,
      deviceId: binding.deviceId,
      getAccessToken: () => deviceBridgeAccessToken(apiCreds),
      storageV5,
      servedSettingsChanged: servedSettingsChangedOf(sessionHost),
      seams,
    },
    createFacts,
  ).then(
    (link) => ({
      link,
    }),
    async (error) => {
      await releaseSession();
      logError(error);
      return {
        error: errorMessage(error),
      };
    },
  );
  if ("error" in bridgeOutcome) {
    let archived = await archiveSession();
    await logFeatureBadAsync("remote_headless_session", "link_failed", {
      archived,
    });
    return {
      kind: "failed",
      message: formatServeSetupFailure(teleportResult.id, bridgeOutcome.error, remoteSessionUrl, archived),
    };
  }
  let { link } = bridgeOutcome;
  let trustReader = sessionRepositoryTrustReader({
    sessionId: teleportResult.id,
    getAccessToken: sessionContext.getAccessToken,
    fetchSession,
    createOrigin: createFacts?.createFacts?.origin,
  });
  trustReader?.refresh();
  let featureHandles = await attachHeadlessFeatures(
    features,
    normalizeOpenOptions({
      sessionId: teleportResult.id,
      binding: "bound",
      boundDeviceUuid: binding.deviceId,
      trigger: "create",
      storageV5,
      credentials,
      settingsToCloud,
      isProjectSynced: projectSyncEnabled,
      ...(createFacts && {
        dirSync: createFacts,
      }),
      homeSeed: teleportResult.homeSeed,
      ...(await startServedTools(
        teleportResult.id,
        "none",
        binding.deviceId,
        true,
        link.bridge,
        logRemoteToolsWarning,
        trustReader,
        () =>
          fetchSession(teleportResult.id, {
            ...apiCreds,
            accessToken: sessionContext.getAccessToken(),
          }),
      )),
      signal: host.signal,
    }),
  );
  logFeatureOk("remote_headless_session");
  let folderNotice = servedFolderConfigNotice("create");
  if (folderNotice !== undefined) logRemoteToolsWarning(SERVED_FOLDER_CONFIG_NOT_USED, folderNotice);
  let envNotice = servedProjectEnvNotice("create");
  if (envNotice !== undefined) logRemoteToolsWarning(SERVED_PROJECT_ENV_NOT_APPLIED, envNotice);
  let allNotices = [
    ...notices,
    ...bundleNotices,
    ...(runnerNotice !== undefined ? [runnerNotice] : []),
    ...(folderNotice !== undefined
      ? [
          {
            level: "notice",
            text: folderNotice,
          },
        ]
      : []),
    ...(envNotice !== undefined
      ? [
          {
            level: "notice",
            text: envNotice,
          },
        ]
      : []),
  ];
  return {
    kind: "opened",
    session: {
      entry: "create",
      ...sessionContext,
      ...(binding.status === "bound" && {
        eventSigner: deviceEventSignerFor(binding.deviceId, credentials),
      }),
      featureHandles,
      hasTitle: Boolean(options.sessionNameArg || options.remote),
      ...(allNotices.length > 0 && {
        notices: allNotices,
      }),
      ...(permissionMode !== undefined && {
        requestedPermissionMode: permissionMode,
      }),
      maxTurnsConfirmed: teleportResult.maxTurnsConfirmed,
      dirSync: createFacts,
      settle: (hookState) => emitHookStarted(teleportResult.id, abortController, hookState, seams.laptop),
      dispose: async () => {
        await releaseSession();
        await link.bridge.stop();
        await disposeHandles(featureHandles);
      },
      cloudSession: () =>
        cloudSessionJsonSummary({
          sessionId: teleportResult.id,
          viewUrl: remoteSessionUrl,
          device: {
            status: "bound",
            device_id: binding.deviceId,
            display_name: link.displayName,
          },
          directorySync: dirSyncReport({
            dirSync: createFacts,
            fileMode: link.fileMode,
            sessionId: teleportResult.id,
          }),
          repositoryTrust: repositoryTrustOf(trustReader),
        }),
    },
  };
}
//@ chunk-keyy05re.js:143430-144139 placement
async function reportCreateSessionError(failure, aborted, branchMode, isAborted) {
  await logEventAsync("tengu_remote_create_session_error", {
    error: aborted ? lit("aborted") : failure ? fromEnum(failure.reason) : lit("unknown"),
    entry_point: fromEnum(isAborted),
    branch_mode: branchMode,
    ...(failure?.detail?.endpoint && {
      create_endpoint: fromEnum(failure.detail.endpoint),
    }),
    ...(failure?.detail?.serverReason && {
      server_reason: fromEnum(failure.detail.serverReason),
    }),
    ...(failure?.detail?.messageHidden && {
      message_hidden: lit("true"),
    }),
    ...(failure?.detail?.preflightTransient !== undefined && {
      deny_transient: lit(failure.detail.preflightTransient ? "true" : "false"),
    }),
    ...(failure?.detail?.sessionArchived !== undefined && {
      session_archived: lit(failure.detail.sessionArchived ? "true" : "false"),
    }),
  });
  if (!aborted) await logFeatureBadAsync("remote_headless_session", "create_failed");
  return {
    kind: "failed",
    message: failure
      ? `Error: ${printableName(failure.message, MAX_ERROR_MESSAGE_CHARS)}`
      : "Error: Unable to create cloud session",
  };
}
//@ chunk-keyy05re.js:144139-148251 placement
/**
 * runHeadlessCloudCreate：`claude -p --cloud` 新建云会话入口（需要 prompt），处理模型门禁提示、bare 模式与退出码。
 */
async function openBareCloudSession(
  options,
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
  seams = {},
) {
  if (!hasPromptContent(prompt))
    return {
      kind: "failed",
      message: "Error: a cloud session needs a prompt",
    };
  let teleport = seams.teleport ?? teleportToRemote;
  let branchMode = branchModeForTelemetry(options.poolOnBranch, options.poolRef);
  let abortController = new AbortController();
  let teleportFn = registerCleanup(() => abortController.abort());
  if (signal?.aborted) abortController.abort();
  signal?.addEventListener("abort", () => abortController.abort(), {
    once: true,
  });
  let settingsToCloudEnabled = options.noMonorepo
    ? false
    : await (seams.settingsToCloudEnabled ?? isSettingsToCloudEnabled)().catch(() => false);
  let { model, explicitMode, decision, isModeFromSettings, noticeOnRunner } = buildCloudCreateOptions(
    options,
    {
      settingsToCloudEnabled,
      settingsNeverForwarded: options.noMonorepo,
      settings: getInitialSettings(),
      hostFillsDefault,
      typedLevel: forwarded.proactivityLevel,
      carriedMode,
    },
    seams,
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
    has_environment_query: options.environmentQuery !== null,
  });
  let branch =
    options.environmentQuery === null
      ? null
      : await environmentUnresolvedOutcome(
          options.environmentQuery,
          () => fetchEnvironments(apiCreds.accessToken, storageV5, credentials),
          cloudCreateRefusal(),
        );
  if (branch?.ok === false) {
    teleportFn();
    return reportCreateSessionError(
      {
        message: branch.error,
        reason: branch.reason,
        detail: undefined,
      },
      abortController.signal.aborted,
      branchMode,
      "cloud_headless_bare",
    );
  }
  let environment;
  let promptUuid = [];
  let notices = randomUUID();
  let opened = await teleport({
    ...buildInitialMessageOptions({
      prompt,
      promptUuid: notices,
      currentBranch:
        (options.poolOnBranch ?? options.poolRef) == null
          ? await (seams.currentBranch ?? getBranch)()
          : undefined,
      poolOnBranch: options.poolOnBranch,
      poolRef: options.poolRef,
      title: options.sessionNameArg || undefined,
      permissionMode: decision.permissionMode,
      model,
      signal: abortController.signal,
    }),
    ...{},
    chosenEnvironment: branch?.environment,
    monorepo: options.monorepo,
    poolId: options.poolId ?? undefined,
    noMonorepo: options.noMonorepo,
    correlationId: options.correlationId ?? undefined,
    repositoryRequiredBy: repositoryAgent === undefined ? undefined : `The agent "${repositoryAgent}"`,
    personal: options.personal,
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
    onProgress: (progress) => {
      if (progress.kind === "session_exists")
        onSessionExists(
          printableName(
            getRemoteSessionUrl(progress.sessionId, undefined, {
              from: "cli",
              m: "0",
            }),
            200,
          ),
        );
    },
    onBundleNotice: (text, bundleNotice) => {
      promptUuid.push({
        level: bundleNotice ?? "notice",
        text,
      });
    },
    onBundleFail: (message, level) => {
      environment = {
        message,
        reason: level === "env_create" ? "env_create_failed" : "bundle_failed",
        detail: undefined,
      };
    },
    onCreateFail: (message, reason, detail) => {
      environment = {
        message,
        reason,
        detail,
      };
    },
  }).finally(teleportFn);
  if (opened === null)
    return reportCreateSessionError(
      environment,
      abortController.signal.aborted,
      branchMode,
      "cloud_headless_bare",
    );
  let permissionMode = opened.settingsModeOnRunner === undefined ? decision.permissionMode : undefined;
  let modeNotice = opened.settingsModeOnRunner === undefined ? decision.notice : noticeOnRunner;
  if (opened.settingsModeOnRunner !== undefined && noticeOnRunner !== undefined)
    logForDebugging(`[headlessCloud] ${noticeOnRunner.text}`);
  await logEventAsync("tengu_remote_create_session_success", {
    session_id: shortHash(opened.id),
    entry_point: fromEnum("cloud_headless_bare"),
    branch_mode: branchMode,
    ...(forwarded.maxTurns !== undefined && {
      max_turns_confirmed: opened.maxTurnsConfirmed === true,
    }),
    ...(opened.settingsModeOnRunner !== undefined && {
      settings_mode_on_runner: fromEnum(opened.settingsModeOnRunner),
      settings_mode_warned: modeNotice?.level === "warning",
    }),
  });
  logFeatureOk("remote_headless_session");
  let viewUrl = getRemoteSessionUrl(opened.id, undefined, {
    from: "cli",
    m: "0",
  });
  let allNotices = [
    ...(branch?.notice && !opened.chosenEnvironmentMoved
      ? [
          {
            level: "notice",
            text: branch.notice,
          },
        ]
      : []),
    ...promptUuid,
    ...(modeNotice !== undefined ? [modeNotice] : []),
  ];
  return {
    kind: "opened",
    session: {
      entry: "create",
      ...cloudSessionContext(apiCreds, opened.id),
      initialPrompt: {
        uuid: notices,
        content: prompt,
      },
      hasTitle: true,
      ...(allNotices.length > 0 && {
        notices: allNotices,
      }),
      ...(permissionMode !== undefined && {
        requestedPermissionMode: permissionMode,
      }),
      maxTurnsConfirmed: opened.maxTurnsConfirmed,
      dispose: async () => {
        await (seams.archiveSession ?? archiveRemoteSession)(opened.id, CLOUD_START_TIMEOUT_MS).catch(
          () => false,
        );
      },
      cloudSession: () =>
        cloudSessionJsonSummary({
          sessionId: opened.id,
          viewUrl,
          device: unboundStatus("session_unbound"),
          directorySync: dirSyncReport({
            dirSync: undefined,
            fileMode: "unspecified",
            sessionId: opened.id,
          }),
        }),
    },
  };
}
//@ chunk-keyy05re.js:148251-150423 placement
/**
 * runHeadlessCloudAttach：附加到已有云会话（archived/requires_action/running 等状态分支），可选本机提供工具。
 */
async function openBareAttachedSession(
  { apiCreds, credentials, openingRequests = [] },
  sessionId,
  openArgs = {},
) {
  let compatSessionId = toCompatSessionId(sessionId);
  logEvent("tengu_remote_attach_session", {
    session_id: sanitizeMarkName(compatSessionId),
    entry_point: fromEnum("cloud_headless_bare"),
  });
  let remoteSessionUrl = getRemoteSessionUrl(compatSessionId, undefined, {
    from: "cli",
    m: "0",
  });
  let viewUrl = await (openArgs.fetchSession ?? fetchSession)(compatSessionId, apiCreds).then(
    (session) => ({
      archived: session.session_status === "archived",
      awaitsAnswer: session.session_status === "requires_action",
      busy: session.session_status === "running",
      wontStart: session.startup_failure,
      boundDeviceUuid: session.bound_device_uuid,
    }),
    (error) => ({
      refused:
        error instanceof TeleportOperationError
          ? error.formattedMessage || errorMessage(error)
          : errorMessage(error),
    }),
  );
  if ("refused" in viewUrl) {
    await logFeatureBadAsync("remote_headless_session", "attach_refused");
    return {
      kind: "failed",
      message: `Error: ${printableName(viewUrl.refused, 300)}`,
    };
  }
  if (viewUrl.archived) {
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
  if (viewUrl.wontStart !== undefined) {
    await logFeatureBadAsync("remote_headless_session", "attach_wont_start");
    return {
      kind: "failed",
      message: `Error: cloud session ${displaySessionId(compatSessionId)} will not start: ${printableName(viewUrl.wontStart, 200)} (${remoteSessionUrl})`,
    };
  }
  if (
    viewUrl.busy &&
    ((await (openArgs.turnInFlight ?? isRemoteTurnUnderWay)(compatSessionId, credentials)) ?? true)
  ) {
    await logFeatureBadAsync("remote_headless_session", "attach_busy");
    return {
      kind: "failed",
      message: `Error: cloud session ${displaySessionId(compatSessionId)} is busy with a turn; wait for it to finish, or watch it at ${remoteSessionUrl}, then send the message again.`,
    };
  }
  if (viewUrl.awaitsAnswer) {
    await logFeatureBadAsync("remote_headless_session", "attach_requires_action");
    return {
      kind: "failed",
      message: `Error: cloud session ${displaySessionId(compatSessionId)} is waiting on a question; answer it where it was asked (${remoteSessionUrl}) before sending it another message.`,
    };
  }
  let attach = await latestStreamPosition(compatSessionId, credentials, openArgs, false).then(
    (at) => ({
      at,
    }),
    (error) => ({
      error: errorMessage(error),
    }),
  );
  if ("error" in attach) {
    await logFeatureBadAsync("remote_headless_session", "attach_stream_position");
    return {
      kind: "failed",
      message: `Error: could not read where cloud session ${displaySessionId(compatSessionId)}'s stream stands (${printableName(attach.error, 200)}).`,
    };
  }
  logFeatureOk("remote_headless_session");
  return {
    kind: "opened",
    session: {
      entry: "attach",
      ...cloudSessionContext(apiCreds, compatSessionId),
      initialSequenceNum: attach.at,
      ...(openingRequests.length > 0 && {
        openingRequests,
      }),
      ...(viewUrl.boundDeviceUuid !== undefined &&
        isDeviceIdentityEnabledCached() && {
          eventSigner: deviceEventSignerIfBoundHere(viewUrl.boundDeviceUuid, credentials),
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
//@ chunk-keyy05re.js:150953-151084 placement
function hasPromptContent(prompt) {
  return typeof prompt === "string"
    ? prompt.trim() !== ""
    : prompt.some(
        (prompt) => prompt.type !== "text" || (typeof prompt.text === "string" && prompt.text.trim() !== ""),
      );
}
//@ chunk-keyy05re.js:151084-151653 placement
async function startDeviceBridgeForAttach(
  { sessionId, orgUuid, deviceId, getAccessToken, storageV5, servedSettingsChanged, seams },
  options,
) {
  let fileMode = await (seams.remoteFileMode ?? remoteFileModeUnspecified)(options?.gitRoot);
  let displayName = (seams.deviceDisplayName ?? deviceDisplayName)();
  let cloudDeviceRegistration = startCloudDeviceRegistration(
    {
      sessionId,
      orgUuid,
      deviceId,
      getAccessToken,
      storageV5,
      dirSync: options !== undefined,
      servedSettingsChanged,
    },
    seams.laptop,
  );
  cloudDeviceRegistration.started.then((dirSync) => {
    if (!dirSync)
      logForDebugging(
        "[headlessCloud] the device bridge did not start (gate off or account not fully configured); the session stays bound without laptop tools",
      );
  });
  logLaptopLinked({
    dirSync: options,
    fileMode,
    sessionId,
  });
  return {
    fileMode,
    displayName,
    bridge: cloudDeviceRegistration,
  };
}
//@ chunk-keyy05re.js:151653-151902 placement
function runHeadlessCloudAttach(options, host, storage, sessionHost, { serveOnly = false } = {}) {
  return openWithFeatures(options, host, {
    entry: "attach",
    opener: (openerArgs) =>
      attachBareCloudSession(
        {
          ...openerArgs,
          openingRequests: attachOpeningRequests(options.permissionModeCli, {
            serveOnly,
          }),
          sessionHost,
          serveOnly,
        },
        storage,
      ),
    features: serveOnly ? createAttachFeatures() : createCloudSessionFeatures(options, sessionHost),
    ...(serveOnly && {
      attachHonours: ["attachServeRequest"],
    }),
  });
}
//@ chunk-keyy05re.js:151902-151973 placement
function servedSettingsChangedOf(sessionHost) {
  return sessionHost === undefined
    ? undefined
    : deviceHooksProcessMemories.of(sessionHost).servedSettingsChanged;
}
//@ chunk-keyy05re.js:151973-151991 placement
function noopDialogWiring(unused, dialogs) {}
//@ chunk-keyy05re.js:151991-152424 placement
function sdkHostOptionEntries(forwarded, options, host) {
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
    ["model", host],
    ["name", options.sessionNameArg],
  ]
    .filter(([, name]) => Boolean(name))
    .map(([name]) => name);
}
//@ chunk-keyy05re.js:152424-158781 placement
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
  sessionId,
  seams = {},
) {
  let compatSessionId = toCompatSessionId(sessionId);
  logEvent("tengu_remote_attach_session", {
    session_id: sanitizeMarkName(compatSessionId),
    entry_point: fromEnum("cloud_headless"),
  });
  let remoteSessionUrl = getRemoteSessionUrl(compatSessionId, undefined, {
    from: "cli",
    m: "0",
  });
  let viewUrl = cloudSessionContext(apiCreds, compatSessionId);
  let tokenSource = (seams.fetchSession ?? fetchSession)(compatSessionId, apiCreds);
  let sessionReader = () =>
    (seams.fetchSession ?? fetchSession)(compatSessionId, {
      ...apiCreds,
      accessToken: viewUrl.getAccessToken(),
    });
  let repositoryTrust = sessionRepositoryTrustReader({
    sessionId: compatSessionId,
    getAccessToken: viewUrl.getAccessToken,
    fetchSession: seams.fetchSession ?? fetchSession,
    initial: tokenSource,
    createOrigin: undefined,
  });
  let sessionState = await tokenSource.then(
    (session) => ({
      archived: session.session_status === "archived",
      awaitsAnswer: session.session_status === "requires_action",
      isOnSelfHostedRunner: isSelfHostedEnvironment(session),
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
  if ("refused" in sessionState) {
    await logFeatureBadAsync("remote_headless_session", "attach_refused");
    return {
      kind: "failed",
      message: `Error: ${printableName(sessionState.refused ?? "", 300)}`,
    };
  }
  if (sessionState.archived) {
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
  let canServe = false;
  let localIdentity;
  if (serveOnly) {
    let localResult = await (seams.localServeLinkIdentity ?? checkAttachServeLocally)({
      sessionId: compatSessionId,
      credentials,
    });
    canServe =
      localResult.ok ||
      (localResult.refusal.kind === "local" && localResult.refusal.reason === "no_device_proof");
    localIdentity = localResult.ok ? localResult : undefined;
  }
  let streamPosition = latestStreamPosition(compatSessionId, credentials, seams, canServe).then(
    (position) => ({
      position,
    }),
    (error) => ({
      error: errorMessage(error),
    }),
  );
  let prepareLink =
    seams.prepareLink ?? (seams.linkForServing === undefined ? registerAndLinkDevice : undefined);
  let preparedLink =
    localIdentity !== undefined &&
    prepareLink !== undefined &&
    (seams.linkPreparationOverlapOn ?? isLinkPreparationOverlapOn)()
      ? prepareLink({
          sessionId: compatSessionId,
          credentials,
          localIdentity,
          handsKeyToLaterReaders: true,
        })
      : undefined;
  preparedLink?.catch(() => {});
  let position = await streamPosition;
  if ("error" in position) {
    await logFeatureBadAsync("remote_headless_session", "attach_stream_position");
    return {
      kind: "failed",
      message: `Error: could not read where cloud session ${displaySessionId(compatSessionId)}'s stream stands (${printableName(position.error, 200)}).`,
    };
  }
  let linkResult;
  let boundDeviceId;
  let heldKey;
  if (serveOnly) {
    let request = readAttachServeRequest(host.initialize);
    let serveLink = await (seams.linkForServing ?? linkAttachServe)({
      sessionId: compatSessionId,
      orgUuid: apiCreds.orgUUID,
      credentials,
      request,
      ...(localIdentity && {
        localIdentity,
      }),
      ...(preparedLink && {
        prepared: preparedLink,
      }),
      handsKeyToLaterReaders: true,
    });
    if (!serveLink.ok) {
      await logFeatureBadAsync("remote_headless_session", "attach_serve_link");
      return {
        kind: "failed",
        message: serveLink.message,
      };
    }
    linkResult = serveLink.deviceId;
    boundDeviceId = serveLink.heldKey;
    heldKey = maybeResumeAttach({
      sessionId: compatSessionId,
      orgUuid: apiCreds.orgUUID,
      deviceId: serveLink.deviceId,
      held: serveLink.heldKey,
      request,
      linkedStatus: serveLink.toolHostStatus,
      readSession: sessionReader,
      credentials,
    });
  }
  let dialogsOn =
    serveOnly && (await (seams.hostedServeDialogsGateOn ?? isAttachServeEnabled)().catch(() => false));
  let dialogWarnings = dialogsOn ? createServedSettingsTracker() : undefined;
  let onNotice =
    dialogWarnings &&
    ((what, detail) => {
      logRemoteToolsWarning(what, detail);
      dialogWarnings.add(what, detail);
    });
  let deviceMcpQuestion = dialogsOn
    ? Promise.resolve(
        seams.askDeviceMcpConsent ??
          import("../../components/cloud/HostDeviceMcpConsent.js").then(
            (consent) => consent.askHostDeviceMcpConsent,
          ),
      )
        .then((ask) =>
          ask({
            dialogs: host.dialogs,
            storageV5,
            signal: host.signal ?? signal,
            ...(seams.deviceMcpConsent && {
              seams: seams.deviceMcpConsent,
            }),
          }),
        )
        .then(
          (asked) => {
            switch (asked.kind) {
              case "asked":
                return asked.answer;
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
  let bindingPromise = (seams.resolveBinding ?? resolveAttachDeviceBinding)({
    sessionId: compatSessionId,
    storageV5,
    credentials,
    session:
      linkResult !== undefined
        ? Promise.resolve({
            archived: false,
            boundDeviceId: linkResult,
            toolHostLink: "this_helper",
          })
        : tokenSource.then(sessionBindingFields),
    ...(boundDeviceId && {
      loadLocalDevice: (accountUuid) => resolveRegisteredDevice(accountUuid, credentials, boundDeviceId),
    }),
  });
  let keepSettings = (seams.keepSettings ?? keepSettingsBesideAHelper)(bindingPromise, {
    ...(onNotice && {
      onNotice,
    }),
  });
  registerCleanup(async () => keepSettings.end());
  let { binding } = keepSettings;
  let held = boundDeviceKeyOf(binding);
  let didStop = false;
  let dirSync = (seams.attachDirSync ?? findLocalSessionRecord)(
    compatSessionId,
    pullsBackToThisMachine(binding),
    boundDeviceOf(binding),
    credentials,
    storageV5,
    sessionHost,
    held,
    didStop,
  );
  let deviceBridge = (seams.registerDevice ?? registerAttachedDevice)({
    sessionId: compatSessionId,
    getAccessToken: () => deviceBridgeAccessToken(apiCreds),
    orgUuid: apiCreds.orgUUID,
    binding,
    cloudClient: !serveOnly,
    toolServingOn: isViolinWoodEnabledCached(),
    storageV5,
    dirSync: dirSync.then(
      (sessionState) => sessionState.handle !== undefined,
      () => false,
    ),
    folderRelation: serveOnly
      ? Promise.all([
          dirSync,
          tokenSource.then(
            (session) => ({
              boundDeviceId: session.bound_device_uuid,
              createdAt: session.created_at,
            }),
            () => {
              return;
            },
          ),
          (seams.syncRecordSweep ?? readRetentionCutoff)(),
        ]).then(
          ([lookup, before, sweep]) =>
            shouldServeOnlyNotArmed({
              serveOnly,
              lookup,
              sessionBefore: before,
              sweep,
            }),
          () => {
            return;
          },
        )
      : Promise.resolve(undefined),
    servedSettingsChanged: servedSettingsChangedOf(sessionHost),
    ...(onNotice && {
      onNotice,
    }),
    ...(deviceMcpQuestion && {
      deviceMcpQuestion,
    }),
  });
  registerCleanup(() => deviceBridge.stop());
  let [bindingState, dirSyncResult, settingsToCloud, settingsKept] = await Promise.all([
    binding,
    dirSync,
    (seams.settingsToCloudEnabled ?? isSettingsToCloudEnabled)().catch(() => false),
    keepSettings.kept,
  ]);
  if (!settingsKept) {
    keepSettings.end();
    await deviceBridge.stop();
    await logFeatureBadAsync("remote_headless_session", "attach_settings_not_kept");
    return {
      kind: "failed",
      message: `Error: ${SETTINGS_NOT_KEPT_REFUSAL}`,
    };
  }
  let fromUpload = false;
  logAttachRecordLookup(sessionRecordState(dirSyncResult), serveOnly ? "attach_serve" : "cloud_headless");
  let handleHost = undefined;
  let handle = dirSyncResult.handle;
  noopDialogWiring(handle, host.dialogs);
  let fileMode = await (seams.remoteFileMode ?? remoteFileModeUnspecified)(handle?.gitRoot, fromUpload);
  if (sessionState.unreadable) logFeatureSad("remote_headless_session", "attach_session_unreadable");
  else if (dirSyncResult.handle === undefined && dirSyncResult.why === "lookup_failed")
    logFeatureSad("remote_headless_session", "attach_dir_sync_lookup_failed");
  else if (dirSyncResult.handle === undefined && dirSyncResult.why === "elsewhere_unknown")
    logFeatureSad("remote_headless_session", "attach_dir_sync_elsewhere_unknown");
  else logFeatureOk("remote_headless_session");
  let toolHostLink =
    bindingState.status === "bound" && !isKnownBindingState(bindingState.toolHostLink)
      ? bindingState.toolHostLink
      : undefined;
  let servedTools =
    bindingState.status === "bound"
      ? await startServedTools(
          compatSessionId,
          bindingState.toolHostLink,
          bindingState.deviceId,
          !serveOnly,
          deviceBridge,
          onNotice ?? logRemoteToolsWarning,
          repositoryTrust,
          sessionReader,
          heldKey,
        )
      : {};
  let helperOnly =
    toolHostLink !== undefined && servedTools.servedToolsUnavailable === "helper_only"
      ? getBareSessionNoToolsNotice(toolHostLink)
      : undefined;
  let featureHandles = await attachHeadlessFeatures(
    features,
    normalizeOpenOptions({
      sessionId: compatSessionId,
      binding: bindingState_2(bindingState),
      trigger: "attach",
      isOnSelfHostedRunner: sessionState.isOnSelfHostedRunner,
      storageV5,
      credentials,
      settingsToCloud,
      isProjectSynced: false,
      ...(handle && {
        dirSync: handle,
      }),
      ...(!(dirSyncResult.handle === undefined && dirSyncResult.why === "not_looked") && {
        sessionRecordMayBeElsewhere:
          dirSyncResult.handle === undefined && dirSyncResult.why !== "not_armed_here",
      }),
      ...(bindingState.status === "bound" && {
        boundDeviceUuid: bindingState.deviceId,
      }),
      ...servedTools,
      signal: host.signal,
    }),
  );
  let syncNotice =
    bindingState.status === "bound"
      ? servedFolderConfigNotice(serveOnly ? "serve_only" : "attach")
      : undefined;
  if (syncNotice !== undefined)
    (onNotice ?? logRemoteToolsWarning)(SERVED_FOLDER_CONFIG_NOT_USED, syncNotice);
  let syncWarning =
    bindingState.status === "bound" ? servedProjectEnvNotice(serveOnly ? "serve_only" : "attach") : undefined;
  if (syncWarning !== undefined)
    (onNotice ?? logRemoteToolsWarning)(SERVED_PROJECT_ENV_NOT_APPLIED, syncWarning);
  let notices = [
    ...(dirSyncResult.handle === undefined &&
    dirSyncResult.why === "elsewhere" &&
    dirSyncResult.line !== undefined
      ? [
          {
            level: "warning",
            text: dirSyncResult.line,
          },
        ]
      : []),
    ...(syncNotice !== undefined && !serveOnly
      ? [
          {
            level: "notice",
            text: syncNotice,
          },
        ]
      : []),
    ...(syncWarning !== undefined && !serveOnly
      ? [
          {
            level: "notice",
            text: syncWarning,
          },
        ]
      : []),
    ...(helperOnly !== undefined
      ? [
          {
            level: "notice",
            text: helperOnly,
          },
        ]
      : []),
  ];
  return {
    kind: "opened",
    session: {
      entry: "attach",
      ...viewUrl,
      ...(bindingState.status === "bound" && {
        eventSigner: deviceEventSignerFor(bindingState.deviceId, credentials, await held),
      }),
      ...(serveOnly && {
        controlOnly: true,
      }),
      ...(linkResult !== undefined && {
        stillLinkedHere: () => waitForLinkedStatus(linkResult, sessionReader, heldKey),
      }),
      ...(heldKey && {
        resumeLinkHere: heldKey.resume,
      }),
      initialSequenceNum: position.position,
      ...(openingRequests.length > 0 && {
        openingRequests,
      }),
      ...(sessionState.awaitsAnswer && {
        workerAwaitsAnswer: true,
      }),
      ...(notices.length > 0 && {
        notices,
      }),
      ...{},
      dirSync: handle ?? handleHost,
      featureHandles,
      dispose: () => disposeHandles(featureHandles),
      cloudSession: () => {
        let isSyncing = handleHost !== undefined && handleHost.sync.state().state !== "off";
        let reportedFileMode = isSyncing ? "container_sync" : fileMode;
        let dialogList = dialogWarnings?.list() ?? [];
        return {
          ...cloudSessionJsonSummary({
            sessionId: compatSessionId,
            viewUrl: remoteSessionUrl,
            device: toDeviceBindingStatus(bindingState),
            directorySync: {
              ...sessionRecordReport(
                isSyncing
                  ? {
                      handle: handleHost,
                    }
                  : dirSyncResult,
                reportedFileMode,
                fromUpload,
              ),
              file_mode: reportedFileMode,
              file_mode_source: "stored",
            },
            repositoryTrust: repositoryTrustOf(repositoryTrust),
          }),
          ...(dialogList.length > 0 && {
            notices: dialogList,
          }),
        };
      },
      ...((dialogWarnings || repositoryTrust) && {
        onCloudSessionChanged: (details) => {
          dialogWarnings?.onChanged(details);
          repositoryTrust?.onChanged(details);
        },
      }),
    },
  };
}
//@ chunk-keyy05re.js:158781-158849 placement
function repositoryTrustOf(reader) {
  return reader === undefined
    ? undefined
    : markableRepositoryTrust(reportableRepositoryTrust(reader.current(), isTrustedDeviceActiveForOrg()));
}
//@ chunk-keyy05re.js:158849-159108 placement
function sessionRecordState(refusal) {
  if (refusal.handle !== undefined) return "held";
  switch (refusal.why) {
    case "not_looked":
    case "elsewhere":
      return refusal.why;
    case "elsewhere_unknown":
      return "unknown";
    case "lookup_failed":
      return "failed";
    case "not_armed_here":
      return refusal.noRecordOnThisMachine ? "nowhere" : "here_only";
  }
}
//@ chunk-keyy05re.js:159108-159700 placement
function sessionRecordReport(state, detail, label) {
  if (state.handle === undefined)
    switch (state.why) {
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
  let inner = state.handle.sync.state();
  return {
    state: inner.state,
    ...("reason" in inner && {
      reason: inner.reason,
    }),
    ...("message" in inner && {
      message: inner.message,
    }),
    ...armedDirSyncFields(inner),
  };
}
//@ chunk-keyy05re.js:159700-159921 placement
function bindingState_2(binding) {
  switch (binding.status) {
    case "bound":
      return "bound";
    case "not_applicable":
    case "created_unbound":
      return "none";
    case "unbound":
      return binding.reason === "session_unreadable" ? "unknown" : "elsewhere";
    case "disabled":
      return "unknown";
  }
}
//@ chunk-keyy05re.js:159921-160233 placement
function toDeviceBindingStatus(binding) {
  switch (binding.status) {
    case "bound":
      return {
        status: "bound",
        device_id: binding.deviceId,
      };
    case "unbound":
      return unboundStatus(binding.reason);
    case "created_unbound":
      return {
        status: "unbound",
        reason: "session_unbound",
        message: formatUnboundSessionNotice(binding.reason),
      };
    case "not_applicable":
      return unboundStatus("session_unbound");
    case "disabled":
      return unboundStatus("device_tools_off");
  }
}
//@ chunk-keyy05re.js:160233-160297 placement (2.1.88 match: resolveKey, 0.585)
function unboundStatus(reason) {
  return {
    status: "unbound",
    reason,
    message: deviceBindingRefusalText(reason),
  };
}
export {
  cloudCreateGates,
  authenticateThenOpen,
  openBareAttachedSession,
  attachOpeningRequests,
  openBareCloudSession,
  registeredBuiltInToolNames,
  withNotApplied,
  notAppliedReport,
  getUnconfirmedOptions,
  SESSION_HISTORY_PAGE_SIZE,
  SESSION_HISTORY_MAX_PAGES,
  runHeadlessCloudAttach,
  runHeadlessCloudCreate,
};

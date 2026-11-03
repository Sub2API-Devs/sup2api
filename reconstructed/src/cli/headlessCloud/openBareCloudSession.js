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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
} from "crypto";
import { X5s, HB } from "../../utils/teleport/dirSync.js";
import { logForDebugging, setHasFormattedOutput } from "../../utils/debug.js";
import { errorMessage, TeleportOperationError } from "../../utils/errors.js";
import { startDeviceRegistration } from "../../services/deviceBridge/deviceRegistrationSocket.js";
import { uFn } from "./syncStatus.js";
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
import { LE } from "../../utils/agentId.js";
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
  FMs,
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
import { kpt } from "../../utils/hooks/deviceHooks/contentDigest.js";
import { xNn } from "../../utils/hooks/deviceHooks/runDeviceHook.js";
import { createDeviceHooksFeature } from "./deviceHooks.js";
import { deviceHooksProcessMemories } from "../../utils/hooks/deviceHooks/cloudRegistration.js";
import { teleportToRemote, cloudCreateRefusal } from "../../utils/teleport.js";
import { branchModeForTelemetry } from "../startup/prepareSession.js";
import { launchLocationFacts } from "../../services/remoteTools/launchLocation.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { onceExport } from "../../../vendor/lodash-es/once.js";
import { hKe, gbe, yKe, oN } from "../../utils/teleport/homeSettingsMode.js";
import { buildCloudCreateOptions, buildInitialMessageOptions } from "./hostPermissions.js";
import { getBranch } from "../../utils/git.js";
import { gn } from "../../utils/shortHash.js";
import { getRemoteSessionUrl } from "../../constants/product.js";
import { logError } from "../../utils/log.js";
import { sessionRepositoryTrustReader } from "../../remote/tools/sessionRepositoryTrust.js";
import { deviceEventSignerFor, deviceEventSignerIfBoundHere } from "../../bridge/clientEventSigner.js";
import { emitHookStarted } from "../../utils/hooks/hookEvents.js";
import { modelSupportsAutoMode } from "../../utils/betas.js";
import { w9n } from "../../utils/teleport/cloudEnvironments.js";
import { fetchEnvironments } from "../../utils/teleport/environments.js";
import { toCompatSessionId } from "../../bridge/sessionIdCompat.js";
import { ye } from "../../utils/startupMarks.js";
import { isRemoteTurnUnderWay } from "../../assistant/sessionHistory.js";
import { latestStreamPosition, findLocalSessionRecord, readRetentionCutoff, c0n } from "./sessionRecords.js";
import { deviceDisplayName, resolveRegisteredDevice } from "../../bridge/deviceRegistry.js";
import { Hsr } from "../../utils/teleport/environmentSelection.js";
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
import { getBareSessionNoToolsNotice, formatUnboundSessionNotice, GNe } from "../../bridge/deviceBinding.js";
import { Qti, Str } from "../../remote/tools/repositoryTrust.js";
import { isTrustedDeviceActiveForOrg } from "../../bridge/trustedDevice.js";

//@ chunk-fe6rs39h.js:128747-128919 placement
function takeDirSyncHandle(e, n = {}) {
  let s = (n.takeDirSync ?? X5s)(e);
  return s === void 0
    ? Promise.resolve(void 0)
    : s.catch((r) => {
        logForDebugging(`[headlessCloud] session handle unavailable: ${errorMessage(r)}`);
        return;
      });
}
//@ chunk-fe6rs39h.js:128919-129093 placement
async function releaseDirSyncHandle(e, n = {}) {
  try {
    let s = await e;
    if (s === void 0) return;
    await (n.releaseDirSync ?? retireDirSync)(s.sessionId);
  } catch (error) {
    logForDebugging(`[headlessCloud] session handle not released: ${errorMessage(error)}`);
  }
}
//@ chunk-fe6rs39h.js:129093-129129 placement
async function retireDirSync(e) {
  HB().retire(e);
}
//@ chunk-fe6rs39h.js:129129-129172 placement
async function an(e, n) {
  return "unspecified";
}
/**
 * 为云会话启动设备注册：带会话、组织、设备 id、令牌、存储与目录同步等参数，通知走调试日志。
 */
//@ chunk-fe6rs39h.js:129172-129512 placement
function startCloudDeviceRegistration(
  {
    sessionId: sessionId,
    orgUuid: orgUuid,
    deviceId: deviceId,
    getAccessToken: getAccessToken,
    storageV5: storageV5,
    dirSync: dirSync,
    servedSettingsChanged: servedSettingsChanged,
  },
  w = {},
) {
  return (w.startRegistration ?? startDeviceRegistration)({
    sessionId: sessionId,
    orgUuid: orgUuid,
    getAccessToken: getAccessToken,
    getDeviceId: () => deviceId,
    cloudClient: !0,
    storageV5: storageV5,
    dirSync: dirSync,
    ...(servedSettingsChanged && { servedSettingsChanged: servedSettingsChanged }),
    onNotice: (R, k) => logForDebugging(`[remote-tools] ${R}: ${k}`, { level: "warn" }),
  });
}
//@ chunk-fe6rs39h.js:129617-129743 placement
function dirSyncState({ dirSync: dirSync, fileMode: fileMode, sessionId: sessionId }) {
  if (dirSync !== void 0) return dirSync.sync.state();
  return { state: "off", reason: "not_opted_in" };
}
//@ chunk-fe6rs39h.js:129743-130085 placement
function dirSyncReport({ dirSync: dirSync, fileMode: fileMode, sessionId: sessionId }) {
  let r = dirSyncState({ dirSync: dirSync, fileMode: fileMode, sessionId: sessionId });
  return {
    state: r.state,
    ...("reason" in r && r.reason !== void 0 && { reason: r.reason }),
    ...("message" in r && r.message !== void 0 && { message: r.message }),
    ...armedDirSyncFields(r),
    ...(uFn(dirSync?.createFacts?.origin).fromUpload && { started_from_upload: !0 }),
    file_mode: fileMode,
    file_mode_source: "stored",
  };
}
//@ chunk-fe6rs39h.js:130085-130503 placement
function armedDirSyncFields(e) {
  if (e.state !== "armed") return {};
  return {
    ...(e.firstUpload !== null && { first_upload: e.firstUpload }),
    ...(e.syncedFiles !== null && { synced_files: e.syncedFiles }),
    ...(e.writerElsewhere && { other_window: !0 }),
    ...(e.switchedOffByAnthropic === !0 && { muted: !0 }),
    ...(e.versionDisagreement !== void 0 && {
      muted: !0,
      reason: e.versionDisagreement.reason,
      message: e.versionDisagreement.message,
    }),
    ...(e.direction !== "pending" && { direction: e.direction }),
  };
}
//@ chunk-fe6rs39h.js:130503-130745 placement
function logLaptopLinked({ dirSync: dirSync, fileMode: fileMode, sessionId: sessionId }) {
  let r = dirSyncState({ dirSync: dirSync, fileMode: fileMode, sessionId: sessionId });
  logEvent("tengu_remote_headless_laptop_linked", {
    sync_state: fromEnum(r.state),
    sync_reason: fromEnumOpt("reason" in r ? r.reason : void 0),
    file_mode: fromEnum(fileMode),
    has_dir_sync: dirSync !== void 0,
  });
}
//@ chunk-fe6rs39h.js:130745-130867 placement
var CLOUD_START_TIMEOUT_MS = 5000,
  STDIN_IS_TTY_ERROR =
    "Error: headless --cloud reads the SDK host messages from stdin as stream-json; stdin is a terminal here.";
//@ chunk-fe6rs39h.js:130867-131100 placement
function cloudSessionContext(e, n) {
  return {
    sessionId: n,
    orgUuid: e.orgUUID,
    getAccessToken: () => sessionsApiAccessTokenWithCcrFallback(e.profile) ?? e.accessToken,
    consoleProfileBearer: e.profile,
    onAuth401: (s) => recoverSessionsApiBearer(s, void 0, void 0, e.profile),
    onDerivedSessionId: (s) => {
      switchSession(LE(s), "remote_attach");
    },
  };
}
//@ chunk-fe6rs39h.js:131100-131207 placement
async function checkLocalBindIdentity() {
  if (isConsoleProfileSessionsCredential()) return "profile";
  let e = await localBindIdentity({ accountUuid: currentAccountUuid() });
  return e.ok ? void 0 : e.error;
}
//@ chunk-fe6rs39h.js:131207-131246 placement
function currentAccountUuid() {
  return getStoredOauthAccountInfo()?.accountUuid;
}
/**
 * 由 --permission-mode 生成启动时需发送的 set_permission_mode 控制请求。
 */
//@ chunk-fe6rs39h.js:131246-131467 placement = PermissionModeSchema (0.42)
function attachOpeningRequests(e, { serveOnly: serveOnly }) {
  if (serveOnly) return [];
  let s = cloudPermissionModeFrom(e);
  return s === void 0 || (s === "default" && e !== PERMISSION_MODE_MANUAL_ALIAS)
    ? []
    : [
        {
          request: { subtype: "set_permission_mode", mode: s },
          required: s === "plan" || s === "dontAsk",
          describe: `--permission-mode ${s}`,
        },
      ];
}
//@ chunk-fe6rs39h.js:131467-131514 placement
var signal = new AbortController().signal,
  fs = 50,
  Wi = 5;
//@ chunk-fe6rs39h.js:131514-131755 placement
function normalizeOpenOptions({
  signal: signal_2,
  credentials: credentials,
  homeSeed: homeSeed,
  servedTools: servedTools,
  servedToolsUnavailable: servedToolsUnavailable,
  ...y
}) {
  return {
    ...y,
    bound: y.binding === "bound",
    signal: signal_2 ?? signal,
    ...(credentials && { credentials: credentials }),
    ...(homeSeed && { homeSeed: homeSeed }),
    ...(servedTools && { servedTools: servedTools }),
    ...(servedToolsUnavailable && { servedToolsUnavailable: servedToolsUnavailable }),
  };
}
//@ chunk-fe6rs39h.js:131755-131818 placement
function logRemoteToolsWarning(e, n) {
  logForDebugging(`[remote-tools] ${e}: ${n}`, { level: "warn" });
}
//@ chunk-fe6rs39h.js:131818-132413 placement
async function startServedTools(e, n, s, r, h, y, S, w, R) {
  if (!isViolinWoodEnabledCached()) return { servedToolsUnavailable: "flag_off" };
  if (!isKnownBindingState(n)) return { servedToolsUnavailable: "helper_only" };
  let {
      servedToolsAttachOptions: servedToolsAttachOptions,
      servedToolsUnavailableReason: servedToolsUnavailableReason,
    } = await import("./chunk-012rhzq5.js"),
    O = servedToolsAttachOptions({
      owner: () => ({ owner: !0, deviceId: s }),
      cloudClient: r,
      deviceBridge: h,
      onNotice: y,
      ...(S && { repositoryTrust: S }),
      stillBound: async () => {
        let P = await readLinkedStatus(s, w, R);
        if (P === "linked") return !0;
        return P === "ended" ? !1 : void 0;
      },
      plumbing: (await import("./chunk-2s19t0f2.js")).servedSessionPlumbing(e),
    });
  return O === void 0
    ? { servedToolsUnavailable: servedToolsUnavailableReason() ?? "flag_off" }
    : { servedTools: O };
}
//@ chunk-fe6rs39h.js:132413-132471 placement
function disposeHandles(e) {
  let n = new HeadlessFeatureHandles();
  return (n.adopt(e), n.dispose());
}
//@ chunk-fe6rs39h.js:132471-133445 placement
async function openWithFeatures(
  e,
  n,
  { entry: entry, opener: opener, features: features = [], attachHonours: attachHonours = [] },
) {
  let S = entry === "create" ? PROMPT_OPTION_KEYS : attachHonours,
    w = await checkCloudGates(e, n, entry);
  if (w.kind === "refused") {
    (await logFeatureBadAsync("remote_headless_session", w.code),
      printCliError(w.message),
      await gracefulShutdown(1));
    return;
  }
  let { input: input, policy: policy } = w;
  (policy.notices.forEach(noteHeadless), setHasFormattedOutput(!0), setIsRemoteMode(!0));
  let O = await runHeadlessCloudClient({
    input: input,
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
      authenticateThenOpen(e.credentials, async (N) => {
        let L = await opener({
          apiCreds: N,
          host: P,
          forwarded: entry === "create" ? cloudPromptOverrides(policy.forwarded, P.initialize) : {},
          features: features,
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
async function authenticateThenOpen(e, n) {
  let s;
  try {
    s = await prepareApiRequest(e);
  } catch (error) {
    return (
      await logFeatureBadAsync("remote_headless_session", "auth"),
      {
        kind: "failed",
        message: `Error: ${printableName(errorMessage(error), cn) || "Failed to authenticate"}`,
      }
    );
  }
  try {
    return await n(s);
  } catch (error) {
    return (
      await logFeatureBadAsync("remote_headless_session", "open_threw"),
      {
        kind: "failed",
        message: `Error: ${printableName(errorMessage(error), cn) || "Unable to open the cloud session"}`,
      }
    );
  }
}
//@ chunk-fe6rs39h.js:133798-133822 placement
var ln = 12,
  cn = 2000,
  ji = 40;
//@ chunk-fe6rs39h.js:133822-134757 placement
function notAppliedReport(e, n, s, r) {
  let h = new Set(s === "attach" ? PROMPT_OPTION_KEYS : []),
    y =
      n === null
        ? []
        : lostSdkFeatures(n, "strict", new Set([...r, "supportedDialogKinds"])).ignored.map((L) => ({
            kind: h.has(L) ? "kept" : cloudOptionTreatment(L),
            name: `initialize.${L}`,
          })),
    S = { lost: 0, kept: 1, preference: 2 },
    sorted = [...e, ...y].sort((L, z) => S[L.kind] - S[z.kind]),
    R = (L) => sorted.filter((z) => z.kind === L),
    k = R("lost"),
    I = R("kept"),
    O = R("preference"),
    P = (L) => (L.kind === "lost" && L.why !== void 0 ? `${L.name} (${L.why})` : L.name),
    joined = [
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
      ...(joined ? [{ level: "notice", text: joined }] : []),
    ],
    entries: sorted.slice(0, ji),
  };
}
//@ chunk-fe6rs39h.js:134757-134901 placement
function getUnconfirmedOptions(e, n) {
  let s = n.kind === "opened" && n.session.entry === "create" && n.session.maxTurnsConfirmed === !0;
  return e.maxTurns !== void 0 && !s ? [FMs] : [];
}
//@ chunk-fe6rs39h.js:134901-135004 placement
function listWithOverflow(e) {
  return e.length > ln ? `${e.slice(0, ln).join(", ")} (and ${e.length - ln} more)` : e.join(", ");
}
//@ chunk-fe6rs39h.js:135004-135264 placement
function withNotApplied(e, n) {
  if (e.kind !== "opened" || n.entries.length === 0) return e;
  let { session: session } = e;
  return {
    ...e,
    session: {
      ...session,
      notices: [...(session.notices ?? []), ...n.notices],
      cloudSession: () => ({
        ...session.cloudSession(),
        not_applied: n.entries.map(({ kind: kind, name: h }) => ({ name: h, kind: kind })),
      }),
    },
  };
}
//@ chunk-fe6rs39h.js:135264-135359 placement
function noteHeadless(e) {
  if ((logForDebugging(`[headlessCloud] ${e}`), process.stderr.isTTY))
    process.stderr.write(`${e}
`);
}
//@ chunk-fe6rs39h.js:135359-135403 placement
function registeredBuiltInToolNames() {
  return getAllBaseTools().map((e) => e.name);
}
//@ chunk-fe6rs39h.js:135403-136151 placement
async function cloudCreateGates(e, n, s, { isDeviceLess: r = !1, poolLaunchFolder: h } = {}) {
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
  if (S)
    return (
      await logOrgPolicyDeniedAsync("allow_remote_sessions", "cloud_session"),
      { kind: "refused", code: "unavailable", message: `Error: ${S}` }
    );
  let w = withMaxTurns(n, e.resolvedMaxTurns),
    R = cloudLaunchOptionsFrom(e, getSettingsForSource("flagSettings")),
    k,
    I = checkCloudLaunchFlags(w, {
      entry: s,
      isDeviceLess: r,
      ...R,
      ...(k !== void 0 && { selectedAgentDefinition: null }),
    });
  if (I.kind === "rejected")
    return { kind: "refused", code: CLOUD_REFUSAL_SUBTYPES[I.reason], message: I.message };
  return {
    kind: "ready",
    policy: k === void 0 ? I : { ...I, repositoryAgent: k.name, notices: [...I.notices, k.notice] },
  };
}
//@ chunk-fe6rs39h.js:136151-136371 placement
async function checkCloudGates(e, n, s) {
  let inputPrompt = e.inputPrompt,
    h = await cloudCreateGates(e, n, s);
  if (h.kind === "refused") return h;
  if (typeof inputPrompt === "string")
    return { kind: "refused", code: "no_stream_input", message: STDIN_IS_TTY_ERROR };
  return { kind: "ready", input: inputPrompt, policy: h.policy };
}
//@ chunk-fe6rs39h.js:136371-136515 placement
function runHeadlessCloudCreate(e, n, s) {
  return openWithFeatures(e, n, {
    entry: "create",
    opener: (r) => createBareCloudSession(e, { ...r, sessionHost: s, carriedMode: n.inheritPermissionMode }),
    features: createCloudSessionFeatures(e, s),
  });
}
//@ chunk-fe6rs39h.js:136515-136672 placement
function createAttachFeatures() {
  let e = env.CLAUDE_CODE_REMOTE_TOOLS_HOST_IDLE_RELEASE_MINUTES;
  return [
    createServedToolsFeature({
      openChannel: createRemoteSessionConnection,
      controlOnly: !0,
      ...(e !== void 0 && { idleReleaseMs: e * 60000 }),
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
    createPluginForwardingFeature({ memory: kpt.of(n), reachMemory: xNn.of(n) }),
    createDeviceHooksFeature({ getTools: () => e.tools, memory: deviceHooksProcessMemories.of(n) }),
    createServedToolsFeature({ openChannel: createRemoteSessionConnection }),
  ];
}
/**
 * 无头 --cloud 创建新云会话：校验门禁、准备分支/引用、转发设置与特性、创建会话并启动客户端（失败记 tengu_remote_create_session_error）。
 */
//@ chunk-fe6rs39h.js:136889-143545 placement
async function createBareCloudSession(
  e,
  {
    apiCreds: apiCreds,
    forwarded: forwarded,
    host: host = { initialize: null },
    features: features = [],
    storageV5: storageV5,
    credentials: credentials,
    sessionHost: sessionHost,
    carriedMode: carriedMode,
  },
  k = {},
) {
  let I = k.teleport ?? teleportToRemote,
    O = branchModeForTelemetry(e.poolOnBranch, e.poolRef),
    P = await (k.bindPreflight ?? checkLocalBindIdentity)();
  if (P !== void 0)
    return (
      await logFeatureBadAsync("remote_headless_session", "bind_unavailable", {
        reason: fromEnum(P),
        ...launchLocationFacts(P),
        ...null?.fields,
      }),
      { kind: "failed", message: formatUnboundCreateError(P, null?.why) }
    );
  let abortController = new AbortController(),
    L = registerCleanup(() => abortController.abort()),
    z = createCombinedAbortSignal(abortController.signal, { signalB: host.signal }),
    j = onceExport(() => !1),
    Y = e.poolOnBranch
      ? { revision: e.poolOnBranch, flag: "--on-branch" }
      : e.poolRef
        ? { revision: e.poolRef, flag: "--ref" }
        : void 0,
    {
      notices: notices,
      noteForClaude: noteForClaude,
      cardOutcome: cardOutcome,
      wasNotOffered: wasNotOffered,
      moreFilesDecision: moreFilesDecision,
    } = {
      notices: [],
      noteForClaude: null,
      cardOutcome: null,
      wasNotOffered: void 0,
      moreFilesDecision: void 0,
    },
    aborted = z.signal.aborted;
  if ((z.cleanup(), aborted))
    return (L(), { kind: "failed", message: "Error: Unable to create cloud session" });
  let x = j(),
    G = !1,
    Q = await (k.settingsToCloudEnabled ?? isSettingsToCloudEnabled)().catch(() => !1),
    q = !1,
    V = null;
  if (V !== null) return (L(), { kind: "failed", message: V, startupFailureReason: "cli_version_too_old" });
  let le = hKe({ hostConsent: e.homeSettingsConsent, areOwnFlagsOn: Q, stored: gbe(), isProjectSynced: q });
  if (Q || q)
    yKe({
      launchConsent: le,
      isProjectSynced: q,
      launchMayForward: e.forwardHomeSettings,
      surface: "sdk_host",
      trigger: "create",
    });
  let ue = getInitialSettings_2(),
    {
      model: model,
      explicitMode: explicitMode,
      decision: decision,
      isModeFromSettings: isModeFromSettings,
      noticeOnRunner: noticeOnRunner,
    } = buildCloudCreateOptions(
      e,
      {
        settingsToCloudEnabled: Q || oN(le),
        launchConsent: le,
        settings: ue,
        hostFillsDefault: !0,
        typedLevel: forwarded.proactivityLevel,
        carriedMode: carriedMode,
      },
      k,
    );
  if (decision.notice !== void 0) noteHeadless(decision.notice.text);
  if (decision.action !== "none")
    logEvent("tengu_remote_model_gate_hint", {
      entry_point: lit("cloud_headless"),
      permission_mode: fromEnumOpt(explicitMode) ?? lit("unset"),
      action: fromEnum(decision.action),
      ...(decision.repositoryModel && { repository_model: fromEnum(decision.repositoryModel) }),
    });
  logEvent("tengu_remote_create_session", {
    has_initial_prompt: lit("false"),
    forwarded_count: Object.keys(forwarded).length,
    disallowed_tools_count: forwarded.disallowedTools?.length ?? 0,
    ...disallowedToolsTelemetry(forwarded.disallowedTools),
    builtin_tools_count: forwarded.builtinTools?.length ?? 0,
    entry_point: fromEnum("cloud_headless"),
    branch_mode: O,
  });
  let ce = createCombinedAbortSignal(abortController.signal, { signalB: host.signal });
  await askUnattendedServingConsent({
    dialogs: host.dialogs,
    permissionMode: decision.permissionMode,
    signal: ce.signal,
    seams: k.unattendedConsent,
  });
  let aborted_2 = ce.signal.aborted;
  if ((ce.cleanup(), aborted_2))
    return (L(), { kind: "failed", message: "Error: Unable to create cloud session" });
  let Be = { status: "unbound", reason: void 0 },
    it = () => Be,
    Ae = {
      orgUuid: apiCreds.orgUUID,
      accountUuid: currentAccountUuid(),
      onBound: (re) => {
        Be = { status: "bound", deviceId: re };
      },
      onUnbound: (re) => {
        Be = { status: "unbound", reason: re };
      },
      abandonsUnbound: !0,
    },
    ke,
    vt = e.poolOnBranch ?? e.poolRef ?? (await (k.currentBranch ?? getBranch)()),
    We = [],
    Z = await I({
      initialMessage: null,
      signal: abortController.signal,
      source: "remote",
      branchName: vt || void 0,
      title: e.sessionNameArg || void 0,
      description: e.remote || void 0,
      reuseOutcomeBranch: e.poolOnBranch ?? void 0,
      explicitRef: e.poolOnBranch ?? e.poolRef ?? void 0,
      branchFromHead: (e.poolOnBranch ?? e.poolRef) == null,
      personal: e.personal,
      deviceBinding: Ae,
      model: model,
      permissionMode: decision.permissionMode,
      isModeFromSettings: isModeFromSettings,
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
      storageV5: storageV5,
      credentials: credentials,
      allowBundle: !0,
      ...{},
      firstUpload: void 0,
      seedSignal: abortController.signal,
      staysAttached: !0,
      forwardHomeSettings: e.forwardHomeSettings,
      ...(le && { homeSettingsConsent: le }),
      onBundleNotice: (re, ze) => {
        We.push({ level: ze ?? "notice", text: re });
      },
      onBundleFail: (re, ze) => {
        ke = {
          message: re,
          reason: ze === "env_create" ? "env_create_failed" : "bundle_failed",
          detail: void 0,
        };
      },
      onCreateFail: (re, ze, Ds) => {
        ke = { message: re, reason: ze, detail: Ds };
      },
    }).finally(L);
  if (Z === null) return reportCreateSessionError(ke, abortController.signal.aborted, O, "cloud_headless");
  let je = Z.settingsModeOnRunner === void 0 ? decision.permissionMode : void 0,
    Fe = Z.settingsModeOnRunner === void 0 ? decision.notice : noticeOnRunner;
  if (Z.settingsModeOnRunner !== void 0 && noticeOnRunner !== void 0) noteHeadless(noticeOnRunner.text);
  let Ie = takeDirSyncHandle(Z.id, k.laptop),
    Re = async () => {
      (abortController.abort(), await releaseDirSyncHandle(Ie, k.laptop));
    },
    ge = it();
  if (ge.status === "unbound") await Re();
  await logEventAsync("tengu_remote_create_session_success", {
    session_id: gn(Z.id),
    entry_point: fromEnum("cloud_headless"),
    branch_mode: O,
    ...(forwarded.maxTurns !== void 0 && { max_turns_confirmed: Z.maxTurnsConfirmed === !0 }),
    home_seed_started: Z.homeSeed !== void 0,
    ...(Z.settingsPackUnsent !== void 0 && { settings_pack_unsent: fromEnum(Z.settingsPackUnsent) }),
    ...(Z.settingsModeOnRunner !== void 0 && {
      settings_mode_on_runner: fromEnum(Z.settingsModeOnRunner),
      settings_mode_warned: Fe?.level === "warning",
    }),
    ...(e.homeSettingsConsent && { home_settings_host_consent: fromEnum(e.homeSettingsConsent) }),
  });
  let B = getRemoteSessionUrl(Z.id, void 0, { from: "cli", m: "0" }),
    he = () => (k.archiveSession ?? archiveRemoteSession)(Z.id, CLOUD_START_TIMEOUT_MS).catch(() => !1);
  if (ge.status === "unbound") {
    let re = await he();
    return (
      await logFeatureBadAsync("remote_headless_session", "unbound", {
        reason: fromEnumOpt(ge.reason) ?? lit("unknown"),
        archived: re,
      }),
      { kind: "failed", message: formatBindFailure(Z.id, ge.reason, B, re) }
    );
  }
  let Ee = cloudSessionContext(apiCreds, Z.id),
    Oe = await Ie;
  Es(Oe, host.dialogs);
  let Ct = await startDeviceBridgeForAttach(
    {
      sessionId: Z.id,
      orgUuid: apiCreds.orgUUID,
      deviceId: ge.deviceId,
      getAccessToken: () => deviceBridgeAccessToken(apiCreds),
      storageV5: storageV5,
      servedSettingsChanged: Rs(sessionHost),
      seams: k,
    },
    Oe,
  ).then(
    (re) => ({ link: re }),
    async (re) => (await Re(), logError(re), { error: errorMessage(re) }),
  );
  if ("error" in Ct) {
    let re = await he();
    return (
      await logFeatureBadAsync("remote_headless_session", "link_failed", { archived: re }),
      { kind: "failed", message: formatServeSetupFailure(Z.id, Ct.error, B, re) }
    );
  }
  let { link: link } = Ct,
    wt = sessionRepositoryTrustReader({
      sessionId: Z.id,
      getAccessToken: Ee.getAccessToken,
      fetchSession: fetchSession,
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
      storageV5: storageV5,
      credentials: credentials,
      settingsToCloud: Q,
      isProjectSynced: q,
      ...(Oe && { dirSync: Oe }),
      homeSeed: Z.homeSeed,
      ...(await startServedTools(Z.id, "none", ge.deviceId, !0, link.bridge, logRemoteToolsWarning, wt, () =>
        fetchSession(Z.id, { ...apiCreds, accessToken: Ee.getAccessToken() }),
      )),
      signal: host.signal,
    }),
  );
  logFeatureOk("remote_headless_session");
  let at = servedFolderConfigNotice("create");
  if (at !== void 0) logRemoteToolsWarning(SERVED_FOLDER_CONFIG_NOT_USED, at);
  let dt = servedProjectEnvNotice("create");
  if (dt !== void 0) logRemoteToolsWarning(SERVED_PROJECT_ENV_NOT_APPLIED, dt);
  let fn = [
    ...notices,
    ...We,
    ...(Fe !== void 0 ? [Fe] : []),
    ...(at !== void 0 ? [{ level: "notice", text: at }] : []),
    ...(dt !== void 0 ? [{ level: "notice", text: dt }] : []),
  ];
  return {
    kind: "opened",
    session: {
      entry: "create",
      ...Ee,
      ...(ge.status === "bound" && { eventSigner: deviceEventSignerFor(ge.deviceId, credentials) }),
      featureHandles: hn,
      hasTitle: Boolean(e.sessionNameArg || e.remote),
      ...(fn.length > 0 && { notices: fn }),
      ...(je !== void 0 && { requestedPermissionMode: je }),
      maxTurnsConfirmed: Z.maxTurnsConfirmed,
      dirSync: Oe,
      settle: (re) => emitHookStarted(Z.id, abortController, re, k.laptop),
      dispose: async () => {
        (await Re(), await link.bridge.stop(), await disposeHandles(hn));
      },
      cloudSession: () =>
        cloudSessionJsonSummary({
          sessionId: Z.id,
          viewUrl: B,
          device: { status: "bound", device_id: ge.deviceId, display_name: link.displayName },
          directorySync: dirSyncReport({ dirSync: Oe, fileMode: link.fileMode, sessionId: Z.id }),
          repositoryTrust: Is(wt),
        }),
    },
  };
}
//@ chunk-fe6rs39h.js:143545-144254 placement
async function reportCreateSessionError(e, n, s, r) {
  if (
    (await logEventAsync("tengu_remote_create_session_error", {
      error: n ? lit("aborted") : e ? fromEnum(e.reason) : lit("unknown"),
      entry_point: fromEnum(r),
      branch_mode: s,
      ...(e?.detail?.endpoint && { create_endpoint: fromEnum(e.detail.endpoint) }),
      ...(e?.detail?.serverReason && { server_reason: fromEnum(e.detail.serverReason) }),
      ...(e?.detail?.messageHidden && { message_hidden: lit("true") }),
      ...(e?.detail?.preflightTransient !== void 0 && {
        deny_transient: lit(e.detail.preflightTransient ? "true" : "false"),
      }),
      ...(e?.detail?.sessionArchived !== void 0 && {
        session_archived: lit(e.detail.sessionArchived ? "true" : "false"),
      }),
    }),
    !n)
  )
    await logFeatureBadAsync("remote_headless_session", "create_failed");
  return {
    kind: "failed",
    message: e ? `Error: ${printableName(e.message, cn)}` : "Error: Unable to create cloud session",
  };
}
/**
 * runHeadlessCloudCreate：`claude -p --cloud` 新建云会话入口（需要 prompt），处理模型门禁提示、bare 模式与退出码。
 */
//@ chunk-fe6rs39h.js:144254-148366 placement
async function openBareCloudSession(
  e,
  {
    apiCreds: apiCreds,
    prompt: prompt,
    forwarded: forwarded,
    repositoryAgent: repositoryAgent,
    hostFillsDefault: hostFillsDefault,
    carriedMode: carriedMode,
    signal: signal,
    onSessionExists: onSessionExists,
    storageV5: storageV5,
    credentials: credentials,
  },
  O = {},
) {
  if (!hasPromptContent(prompt)) return { kind: "failed", message: "Error: a cloud session needs a prompt" };
  let P = O.teleport ?? teleportToRemote,
    N = branchModeForTelemetry(e.poolOnBranch, e.poolRef),
    abortController = new AbortController(),
    z = registerCleanup(() => abortController.abort());
  if (signal?.aborted) abortController.abort();
  signal?.addEventListener("abort", () => abortController.abort(), { once: !0 });
  let j = e.noMonorepo ? !1 : await (O.settingsToCloudEnabled ?? isSettingsToCloudEnabled)().catch(() => !1),
    {
      model: model,
      explicitMode: explicitMode,
      decision: decision,
      isModeFromSettings: isModeFromSettings,
      noticeOnRunner: noticeOnRunner,
    } = buildCloudCreateOptions(
      e,
      {
        settingsToCloudEnabled: j,
        settingsNeverForwarded: e.noMonorepo,
        settings: getInitialSettings_2(),
        hostFillsDefault: hostFillsDefault,
        typedLevel: forwarded.proactivityLevel,
        carriedMode: carriedMode,
      },
      O,
    );
  if (decision.notice !== void 0) noteHeadless(decision.notice.text);
  if (decision.action !== "none")
    logEvent("tengu_remote_model_gate_hint", {
      entry_point: lit("cloud_headless_bare"),
      permission_mode: fromEnumOpt(explicitMode) ?? lit("unset"),
      action: fromEnum(decision.action),
      ...(decision.repositoryModel && { repository_model: fromEnum(decision.repositoryModel) }),
      ...(decision.barredBy && { barred_by: fromEnum(decision.barredBy) }),
      model_runs_auto: lit(modelSupportsAutoMode(model) ? "true" : "false"),
    });
  logEvent("tengu_remote_create_session", {
    has_initial_prompt: lit("true"),
    forwarded_count: Object.keys(forwarded).length,
    disallowed_tools_count: forwarded.disallowedTools?.length ?? 0,
    ...disallowedToolsTelemetry(forwarded.disallowedTools),
    builtin_tools_count: forwarded.builtinTools?.length ?? 0,
    entry_point: fromEnum("cloud_headless_bare"),
    branch_mode: N,
    has_environment_query: e.environmentQuery !== null,
  });
  let ee =
    e.environmentQuery === null
      ? null
      : await w9n(
          e.environmentQuery,
          () => fetchEnvironments(apiCreds.accessToken, storageV5, credentials),
          cloudCreateRefusal(),
        );
  if (ee?.ok === !1)
    return (
      z(),
      reportCreateSessionError(
        { message: ee.error, reason: ee.reason, detail: void 0 },
        abortController.signal.aborted,
        N,
        "cloud_headless_bare",
      )
    );
  let se,
    x = [],
    ie = randomUUID(),
    G = await P({
      ...buildInitialMessageOptions({
        prompt: prompt,
        promptUuid: ie,
        currentBranch:
          (e.poolOnBranch ?? e.poolRef) == null ? await (O.currentBranch ?? getBranch)() : void 0,
        poolOnBranch: e.poolOnBranch,
        poolRef: e.poolRef,
        title: e.sessionNameArg || void 0,
        permissionMode: decision.permissionMode,
        model: model,
        signal: abortController.signal,
      }),
      ...{},
      chosenEnvironment: ee?.environment,
      monorepo: e.monorepo,
      poolId: e.poolId ?? void 0,
      noMonorepo: e.noMonorepo,
      correlationId: e.correlationId ?? void 0,
      repositoryRequiredBy: repositoryAgent === void 0 ? void 0 : `The agent "${repositoryAgent}"`,
      personal: e.personal,
      isModeFromSettings: isModeFromSettings,
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
      storageV5: storageV5,
      credentials: credentials,
      onProgress: (ue) => {
        if (ue.kind === "session_exists")
          onSessionExists(
            printableName(getRemoteSessionUrl(ue.sessionId, void 0, { from: "cli", m: "0" }), 200),
          );
      },
      onBundleNotice: (ue, Se) => {
        x.push({ level: Se ?? "notice", text: ue });
      },
      onBundleFail: (ue, Se) => {
        se = {
          message: ue,
          reason: Se === "env_create" ? "env_create_failed" : "bundle_failed",
          detail: void 0,
        };
      },
      onCreateFail: (ue, Se, xe) => {
        se = { message: ue, reason: Se, detail: xe };
      },
    }).finally(z);
  if (G === null)
    return reportCreateSessionError(se, abortController.signal.aborted, N, "cloud_headless_bare");
  let Q = G.settingsModeOnRunner === void 0 ? decision.permissionMode : void 0,
    me = G.settingsModeOnRunner === void 0 ? decision.notice : noticeOnRunner;
  if (G.settingsModeOnRunner !== void 0 && noticeOnRunner !== void 0)
    logForDebugging(`[headlessCloud] ${noticeOnRunner.text}`);
  (await logEventAsync("tengu_remote_create_session_success", {
    session_id: gn(G.id),
    entry_point: fromEnum("cloud_headless_bare"),
    branch_mode: N,
    ...(forwarded.maxTurns !== void 0 && { max_turns_confirmed: G.maxTurnsConfirmed === !0 }),
    ...(G.settingsModeOnRunner !== void 0 && {
      settings_mode_on_runner: fromEnum(G.settingsModeOnRunner),
      settings_mode_warned: me?.level === "warning",
    }),
  }),
    logFeatureOk("remote_headless_session"));
  let q = getRemoteSessionUrl(G.id, void 0, { from: "cli", m: "0" }),
    le = [
      ...(ee?.notice && !G.chosenEnvironmentMoved ? [{ level: "notice", text: ee.notice }] : []),
      ...x,
      ...(me !== void 0 ? [me] : []),
    ];
  return {
    kind: "opened",
    session: {
      entry: "create",
      ...cloudSessionContext(apiCreds, G.id),
      initialPrompt: { uuid: ie, content: prompt },
      hasTitle: !0,
      ...(le.length > 0 && { notices: le }),
      ...(Q !== void 0 && { requestedPermissionMode: Q }),
      maxTurnsConfirmed: G.maxTurnsConfirmed,
      dispose: async () => {
        await (O.archiveSession ?? archiveRemoteSession)(G.id, CLOUD_START_TIMEOUT_MS).catch(() => !1);
      },
      cloudSession: () =>
        cloudSessionJsonSummary({
          sessionId: G.id,
          viewUrl: q,
          device: unboundStatus("session_unbound"),
          directorySync: dirSyncReport({ dirSync: void 0, fileMode: "unspecified", sessionId: G.id }),
        }),
    },
  };
}
/**
 * runHeadlessCloudAttach：附加到已有云会话（archived/requires_action/running 等状态分支），可选本机提供工具。
 */
//@ chunk-fe6rs39h.js:148366-150538 placement
async function openBareAttachedSession(
  { apiCreds: apiCreds, credentials: credentials, openingRequests: openingRequests = [] },
  r,
  h = {},
) {
  let y = toCompatSessionId(r);
  logEvent("tengu_remote_attach_session", {
    session_id: ye(y),
    entry_point: fromEnum("cloud_headless_bare"),
  });
  let S = getRemoteSessionUrl(y, void 0, { from: "cli", m: "0" }),
    w = await (h.fetchSession ?? fetchSession)(y, apiCreds).then(
      (k) => ({
        archived: k.session_status === "archived",
        awaitsAnswer: k.session_status === "requires_action",
        busy: k.session_status === "running",
        wontStart: k.startup_failure,
        boundDeviceUuid: k.bound_device_uuid,
      }),
      (k) => ({
        refused:
          k instanceof TeleportOperationError ? k.formattedMessage || errorMessage(k) : errorMessage(k),
      }),
    );
  if ("refused" in w)
    return (
      await logFeatureBadAsync("remote_headless_session", "attach_refused"),
      { kind: "failed", message: `Error: ${printableName(w.refused, 300)}` }
    );
  if (w.archived)
    return (
      logEvent("tengu_remote_attach_session_rejected", {
        reason: lit("archived"),
        entry_point: fromEnum("cloud_headless_bare"),
      }),
      await logFeatureBadAsync("remote_headless_session", "attach_archived"),
      { kind: "failed", message: formatArchivedSessionError(y, S) }
    );
  if (w.wontStart !== void 0)
    return (
      await logFeatureBadAsync("remote_headless_session", "attach_wont_start"),
      {
        kind: "failed",
        message: `Error: cloud session ${displaySessionId(y)} will not start: ${printableName(w.wontStart, 200)} (${S})`,
      }
    );
  if (w.busy && ((await (h.turnInFlight ?? isRemoteTurnUnderWay)(y, credentials)) ?? !0))
    return (
      await logFeatureBadAsync("remote_headless_session", "attach_busy"),
      {
        kind: "failed",
        message: `Error: cloud session ${displaySessionId(y)} is busy with a turn; wait for it to finish, or watch it at ${S}, then send the message again.`,
      }
    );
  if (w.awaitsAnswer)
    return (
      await logFeatureBadAsync("remote_headless_session", "attach_requires_action"),
      {
        kind: "failed",
        message: `Error: cloud session ${displaySessionId(y)} is waiting on a question; answer it where it was asked (${S}) before sending it another message.`,
      }
    );
  let R = await latestStreamPosition(y, credentials, h, !1).then(
    (k) => ({ at: k }),
    (k) => ({ error: errorMessage(k) }),
  );
  if ("error" in R)
    return (
      await logFeatureBadAsync("remote_headless_session", "attach_stream_position"),
      {
        kind: "failed",
        message: `Error: could not read where cloud session ${displaySessionId(y)}'s stream stands (${printableName(R.error, 200)}).`,
      }
    );
  return (
    logFeatureOk("remote_headless_session"),
    {
      kind: "opened",
      session: {
        entry: "attach",
        ...cloudSessionContext(apiCreds, y),
        initialSequenceNum: R.at,
        ...(openingRequests.length > 0 && { openingRequests: openingRequests }),
        ...(w.boundDeviceUuid !== void 0 &&
          isDeviceIdentityEnabledCached() && {
            eventSigner: deviceEventSignerIfBoundHere(w.boundDeviceUuid, credentials),
          }),
        cloudSession: () =>
          cloudSessionJsonSummary({
            sessionId: y,
            viewUrl: S,
            device: unboundStatus("device_tools_off"),
            directorySync: dirSyncReport({ dirSync: void 0, fileMode: "unspecified", sessionId: y }),
          }),
      },
    }
  );
}
//@ chunk-fe6rs39h.js:151068-151199 placement
function hasPromptContent(e) {
  return typeof e === "string"
    ? e.trim() !== ""
    : e.some((n) => n.type !== "text" || (typeof n.text === "string" && n.text.trim() !== ""));
}
//@ chunk-fe6rs39h.js:151199-151768 placement
async function startDeviceBridgeForAttach(
  {
    sessionId: sessionId,
    orgUuid: orgUuid,
    deviceId: deviceId,
    getAccessToken: getAccessToken,
    storageV5: storageV5,
    servedSettingsChanged: servedSettingsChanged,
    seams: seams,
  },
  w,
) {
  let R = await (seams.remoteFileMode ?? an)(w?.gitRoot),
    k = (seams.deviceDisplayName ?? deviceDisplayName)(),
    I = startCloudDeviceRegistration(
      {
        sessionId: sessionId,
        orgUuid: orgUuid,
        deviceId: deviceId,
        getAccessToken: getAccessToken,
        storageV5: storageV5,
        dirSync: w !== void 0,
        servedSettingsChanged: servedSettingsChanged,
      },
      seams.laptop,
    );
  return (
    I.started.then((O) => {
      if (!O)
        logForDebugging(
          "[headlessCloud] the device bridge did not start (gate off or account not fully configured); the session stays bound without laptop tools",
        );
    }),
    logLaptopLinked({ dirSync: w, fileMode: R, sessionId: sessionId }),
    { fileMode: R, displayName: k, bridge: I }
  );
}
//@ chunk-fe6rs39h.js:151768-152017 placement
function runHeadlessCloudAttach(e, n, s, r, { serveOnly: h = !1 } = {}) {
  return openWithFeatures(e, n, {
    entry: "attach",
    opener: (y) =>
      attachBareCloudSession(
        {
          ...y,
          openingRequests: attachOpeningRequests(e.permissionModeCli, { serveOnly: h }),
          sessionHost: r,
          serveOnly: h,
        },
        s,
      ),
    features: h ? createAttachFeatures() : createCloudSessionFeatures(e, r),
    ...(h && { attachHonours: ["attachServeRequest"] }),
  });
}
//@ chunk-fe6rs39h.js:152017-152088 placement
function Rs(e) {
  return e === void 0 ? void 0 : deviceHooksProcessMemories.of(e).servedSettingsChanged;
}
//@ chunk-fe6rs39h.js:152088-152106 placement
function Es(e, n) {}
//@ chunk-fe6rs39h.js:152106-152539 placement
function sdkHostOptionEntries(e, n, s) {
  return [
    ["appendSystemPrompt", e.appendSystemPrompt],
    ["systemPrompt", e.customSystemPrompt],
    ["appendSubagentSystemPrompt", e.appendSubagentSystemPrompt],
    ["effort", e.effort],
    ["fallbackModel", e.fallbackModel],
    ["maxBudgetUsd", e.maxBudgetUsd],
    ["allowedTools", e.allowedTools?.length],
    ["thinking", e.thinking],
    ["proactivity", e.proactivityLevel],
    ["model", s],
    ["name", n.sessionNameArg],
  ]
    .filter(([, h]) => Boolean(h))
    .map(([h]) => h);
}
/**
 * 附加到已有云会话的主体：预检、读取会话状态、本机记录查找、启动客户端与特性。
 */
//@ chunk-fe6rs39h.js:152539-158893 placement
async function attachBareCloudSession(
  {
    apiCreds: apiCreds,
    host: host = { initialize: null },
    features: features = [],
    storageV5: storageV5,
    credentials: credentials,
    sessionHost: sessionHost,
    openingRequests: openingRequests = [],
    serveOnly: serveOnly = !1,
  },
  R,
  k = {},
) {
  let I = toCompatSessionId(R);
  logEvent("tengu_remote_attach_session", { session_id: ye(I), entry_point: fromEnum("cloud_headless") });
  let O = getRemoteSessionUrl(I, void 0, { from: "cli", m: "0" }),
    P = cloudSessionContext(apiCreds, I),
    N = (k.fetchSession ?? fetchSession)(I, apiCreds),
    L = () => (k.fetchSession ?? fetchSession)(I, { ...apiCreds, accessToken: P.getAccessToken() }),
    z = sessionRepositoryTrustReader({
      sessionId: I,
      getAccessToken: P.getAccessToken,
      fetchSession: k.fetchSession ?? fetchSession,
      initial: N,
      createOrigin: void 0,
    }),
    j = await N.then(
      (B) => ({
        archived: B.session_status === "archived",
        awaitsAnswer: B.session_status === "requires_action",
        isOnSelfHostedRunner: Hsr(B),
        unreadable: !1,
      }),
      (B) => {
        if (B instanceof TeleportOperationError) return { refused: B.formattedMessage || errorMessage(B) };
        return (
          logForDebugging(
            `[headlessCloud] attach preflight failed (continuing via the stream): ${errorMessage(B)}`,
          ),
          { archived: !1, awaitsAnswer: !1, isOnSelfHostedRunner: !1, unreadable: !0 }
        );
      },
    );
  if ("refused" in j)
    return (
      await logFeatureBadAsync("remote_headless_session", "attach_refused"),
      { kind: "failed", message: `Error: ${printableName(j.refused ?? "", 300)}` }
    );
  if (j.archived)
    return (
      logEvent("tengu_remote_attach_session_rejected", {
        reason: lit("archived"),
        entry_point: fromEnum("cloud_headless"),
      }),
      await logFeatureBadAsync("remote_headless_session", "attach_archived"),
      { kind: "failed", message: formatArchivedSessionError(I, O) }
    );
  let Y = !1,
    D;
  if (serveOnly) {
    let B = await (k.localServeLinkIdentity ?? checkAttachServeLocally)({
      sessionId: I,
      credentials: credentials,
    });
    ((Y = B.ok || (B.refusal.kind === "local" && B.refusal.reason === "no_device_proof")),
      (D = B.ok ? B : void 0));
  }
  let W = latestStreamPosition(I, credentials, k, Y).then(
      (B) => ({ position: B }),
      (B) => ({ error: errorMessage(B) }),
    ),
    te = k.prepareLink ?? (k.linkForServing === void 0 ? registerAndLinkDevice : void 0),
    X =
      D !== void 0 && te !== void 0 && (k.linkPreparationOverlapOn ?? isLinkPreparationOverlapOn)()
        ? te({ sessionId: I, credentials: credentials, localIdentity: D, handsKeyToLaterReaders: !0 })
        : void 0;
  X?.catch(() => {});
  let ee = await W;
  if ("error" in ee)
    return (
      await logFeatureBadAsync("remote_headless_session", "attach_stream_position"),
      {
        kind: "failed",
        message: `Error: could not read where cloud session ${displaySessionId(I)}'s stream stands (${printableName(ee.error, 200)}).`,
      }
    );
  let se, x, ie;
  if (serveOnly) {
    let B = readAttachServeRequest(host.initialize),
      he = await (k.linkForServing ?? linkAttachServe)({
        sessionId: I,
        orgUuid: apiCreds.orgUUID,
        credentials: credentials,
        request: B,
        ...(D && { localIdentity: D }),
        ...(X && { prepared: X }),
        handsKeyToLaterReaders: !0,
      });
    if (!he.ok)
      return (
        await logFeatureBadAsync("remote_headless_session", "attach_serve_link"),
        { kind: "failed", message: he.message }
      );
    ((se = he.deviceId),
      (x = he.heldKey),
      (ie = maybeResumeAttach({
        sessionId: I,
        orgUuid: apiCreds.orgUUID,
        deviceId: he.deviceId,
        held: he.heldKey,
        request: B,
        linkedStatus: he.toolHostStatus,
        readSession: L,
        credentials: credentials,
      })));
  }
  let G = serveOnly && (await (k.hostedServeDialogsGateOn ?? isAttachServeEnabled)().catch(() => !1)),
    Q = G ? createServedSettingsTracker() : void 0,
    me =
      Q &&
      ((B, he) => {
        (logRemoteToolsWarning(B, he), Q.add(B, he));
      }),
    q = G
      ? Promise.resolve(
          k.askDeviceMcpConsent ?? import("./chunk-8fq1kyxh.js").then((B) => B.askHostDeviceMcpConsent),
        )
          .then((B) =>
            B({
              dialogs: host.dialogs,
              storageV5: storageV5,
              signal: host.signal ?? signal,
              ...(k.deviceMcpConsent && { seams: k.deviceMcpConsent }),
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
            (B) => (logError(B), "as_stored"),
          )
      : void 0,
    V = (k.resolveBinding ?? resolveAttachDeviceBinding)({
      sessionId: I,
      storageV5: storageV5,
      credentials: credentials,
      session:
        se !== void 0
          ? Promise.resolve({ archived: !1, boundDeviceId: se, toolHostLink: "this_helper" })
          : N.then(sessionBindingFields),
      ...(x && { loadLocalDevice: (B) => resolveRegisteredDevice(B, credentials, x) }),
    }),
    le = (k.keepSettings ?? keepSettingsBesideAHelper)(V, { ...(me && { onNotice: me }) });
  registerCleanup(async () => le.end());
  let { binding: binding } = le,
    Se = boundDeviceKeyOf(binding),
    xe = !1,
    fe = (k.attachDirSync ?? findLocalSessionRecord)(
      I,
      pullsBackToThisMachine(binding),
      boundDeviceOf(binding),
      credentials,
      storageV5,
      sessionHost,
      Se,
      xe,
    ),
    Ne = (k.registerDevice ?? registerAttachedDevice)({
      sessionId: I,
      getAccessToken: () => deviceBridgeAccessToken(apiCreds),
      orgUuid: apiCreds.orgUUID,
      binding: binding,
      cloudClient: !serveOnly,
      toolServingOn: isViolinWoodEnabledCached(),
      storageV5: storageV5,
      dirSync: fe.then(
        (B) => B.handle !== void 0,
        () => !1,
      ),
      folderRelation: serveOnly
        ? Promise.all([
            fe,
            N.then(
              (B) => ({ boundDeviceId: B.bound_device_uuid, createdAt: B.created_at }),
              () => {
                return;
              },
            ),
            (k.syncRecordSweep ?? readRetentionCutoff)(),
          ]).then(
            ([B, he, Ee]) =>
              shouldServeOnlyNotArmed({ serveOnly: serveOnly, lookup: B, sessionBefore: he, sweep: Ee }),
            () => {
              return;
            },
          )
        : Promise.resolve(void 0),
      servedSettingsChanged: Rs(sessionHost),
      ...(me && { onNotice: me }),
      ...(q && { deviceMcpQuestion: q }),
    });
  registerCleanup(() => Ne.stop());
  let [pe, ce, yt, Be] = await Promise.all([
    binding,
    fe,
    (k.settingsToCloudEnabled ?? isSettingsToCloudEnabled)().catch(() => !1),
    le.kept,
  ]);
  if (!Be)
    return (
      le.end(),
      await Ne.stop(),
      await logFeatureBadAsync("remote_headless_session", "attach_settings_not_kept"),
      { kind: "failed", message: `Error: ${SETTINGS_NOT_KEPT_REFUSAL}` }
    );
  let it = !1;
  c0n(sessionRecordState(ce), serveOnly ? "attach_serve" : "cloud_headless");
  let Ae = void 0,
    handle = ce.handle;
  Es(handle, host.dialogs);
  let vt = await (k.remoteFileMode ?? an)(handle?.gitRoot, it);
  if (j.unreadable) logFeatureSad("remote_headless_session", "attach_session_unreadable");
  else if (ce.handle === void 0 && ce.why === "lookup_failed")
    logFeatureSad("remote_headless_session", "attach_dir_sync_lookup_failed");
  else if (ce.handle === void 0 && ce.why === "elsewhere_unknown")
    logFeatureSad("remote_headless_session", "attach_dir_sync_elsewhere_unknown");
  else logFeatureOk("remote_headless_session");
  let We = pe.status === "bound" && !isKnownBindingState(pe.toolHostLink) ? pe.toolHostLink : void 0,
    Z =
      pe.status === "bound"
        ? await startServedTools(
            I,
            pe.toolHostLink,
            pe.deviceId,
            !serveOnly,
            Ne,
            me ?? logRemoteToolsWarning,
            z,
            L,
            ie,
          )
        : {},
    je =
      We !== void 0 && Z.servedToolsUnavailable === "helper_only" ? getBareSessionNoToolsNotice(We) : void 0,
    Fe = await attachHeadlessFeatures(
      features,
      normalizeOpenOptions({
        sessionId: I,
        binding: bindingState(pe),
        trigger: "attach",
        isOnSelfHostedRunner: j.isOnSelfHostedRunner,
        storageV5: storageV5,
        credentials: credentials,
        settingsToCloud: yt,
        isProjectSynced: !1,
        ...(handle && { dirSync: handle }),
        ...(!(ce.handle === void 0 && ce.why === "not_looked") && {
          sessionRecordMayBeElsewhere: ce.handle === void 0 && ce.why !== "not_armed_here",
        }),
        ...(pe.status === "bound" && { boundDeviceUuid: pe.deviceId }),
        ...Z,
        signal: host.signal,
      }),
    ),
    Ie = pe.status === "bound" ? servedFolderConfigNotice(serveOnly ? "serve_only" : "attach") : void 0;
  if (Ie !== void 0) (me ?? logRemoteToolsWarning)(SERVED_FOLDER_CONFIG_NOT_USED, Ie);
  let Re = pe.status === "bound" ? servedProjectEnvNotice(serveOnly ? "serve_only" : "attach") : void 0;
  if (Re !== void 0) (me ?? logRemoteToolsWarning)(SERVED_PROJECT_ENV_NOT_APPLIED, Re);
  let ge = [
    ...(ce.handle === void 0 && ce.why === "elsewhere" && ce.line !== void 0
      ? [{ level: "warning", text: ce.line }]
      : []),
    ...(Ie !== void 0 && !serveOnly ? [{ level: "notice", text: Ie }] : []),
    ...(Re !== void 0 && !serveOnly ? [{ level: "notice", text: Re }] : []),
    ...(je !== void 0 ? [{ level: "notice", text: je }] : []),
  ];
  return {
    kind: "opened",
    session: {
      entry: "attach",
      ...P,
      ...(pe.status === "bound" && { eventSigner: deviceEventSignerFor(pe.deviceId, credentials, await Se) }),
      ...(serveOnly && { controlOnly: !0 }),
      ...(se !== void 0 && { stillLinkedHere: () => waitForLinkedStatus(se, L, ie) }),
      ...(ie && { resumeLinkHere: ie.resume }),
      initialSequenceNum: ee.position,
      ...(openingRequests.length > 0 && { openingRequests: openingRequests }),
      ...(j.awaitsAnswer && { workerAwaitsAnswer: !0 }),
      ...(ge.length > 0 && { notices: ge }),
      ...{},
      dirSync: handle ?? Ae,
      featureHandles: Fe,
      dispose: () => disposeHandles(Fe),
      cloudSession: () => {
        let B = Ae !== void 0 && Ae.sync.state().state !== "off",
          he = B ? "container_sync" : vt,
          Ee = Q?.list() ?? [];
        return {
          ...cloudSessionJsonSummary({
            sessionId: I,
            viewUrl: O,
            device: toDeviceBindingStatus(pe),
            directorySync: {
              ...sessionRecordReport(B ? { handle: Ae } : ce, he, it),
              file_mode: he,
              file_mode_source: "stored",
            },
            repositoryTrust: Is(z),
          }),
          ...(Ee.length > 0 && { notices: Ee }),
        };
      },
      ...((Q || z) && {
        onCloudSessionChanged: (B) => {
          (Q?.onChanged(B), z?.onChanged(B));
        },
      }),
    },
  };
}
//@ chunk-fe6rs39h.js:158893-158961 placement
function Is(e) {
  return e === void 0 ? void 0 : Qti(Str(e.current(), isTrustedDeviceActiveForOrg()));
}
//@ chunk-fe6rs39h.js:158961-159220 placement
function sessionRecordState(e) {
  if (e.handle !== void 0) return "held";
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
  if (e.handle === void 0)
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
        return { state: "off", reason: "not_opted_in" };
    }
  let state = e.handle.sync.state();
  return {
    state: state.state,
    ...("reason" in state && { reason: state.reason }),
    ...("message" in state && { message: state.message }),
    ...armedDirSyncFields(state),
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
      return { status: "bound", device_id: e.deviceId };
    case "unbound":
      return unboundStatus(e.reason);
    case "created_unbound":
      return { status: "unbound", reason: "session_unbound", message: formatUnboundSessionNotice(e.reason) };
    case "not_applicable":
      return unboundStatus("session_unbound");
    case "disabled":
      return unboundStatus("device_tools_off");
  }
}
//@ chunk-fe6rs39h.js:160345-160409 placement = resolveKey (0.584)
function unboundStatus(e) {
  return { status: "unbound", reason: e, message: GNe(e) };
}

export {
  fs,
  Wi,
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

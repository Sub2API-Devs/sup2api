/**
 * cli/handlers/attachRemote.ts
 *
 * 2.1.316 新增：附着云会话（claude --cloud <id>）主流程：预检、取令牌、建立 WS 并启动 REPL
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ptg2macw.js (6)
 * attribution: placement 6
 */
import {
  TeleportOperationError,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { SESSION_NOT_FOUND_MESSAGE, INVALID_SESSION_ID_MESSAGE } from "../../utils/teleport/api.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import {
  getSessionId,
  getCwdState,
  getIsRemoteMode,
  getCaps,
  setIsRemoteMode,
  switchSession,
  setCwdState,
  setCaps,
} from "../../bootstrap/state.js";
import {
  getCurrentLimits,
  areLimitsObserved,
  getLimitsAccountEpoch,
  restoreLimits,
  resetCurrentLimits,
} from "../../services/claudeAiLimits.js";
import { isAutoModeActive, setAutoModeActive } from "../../utils/permissions/autoModeState.js";
import { sessionRepositoryTrustReader } from "../../remote/tools/sessionRepositoryTrust.js";
import {
  isDeviceIdentityEnabledCached,
  isViolinWoodEnabledCached,
  isSettingsToCloudEnabledCached,
} from "../../services/analytics/violinGates.js";
import { deviceToolNoticesTo } from "../../services/deviceMcp/deviceToolNotices.js";
import { isKnownBindingState } from "../../bridge/deviceBindingState.js";
import { identityAgentId } from "../../utils/agentId.js";
import { getRemoteSessionUrl } from "../../constants/product.js";
import { recordRemoteSessionTeam } from "../../utils/background/remote/remoteSession.js";
import { isHarpForepillarOn } from "../../utils/launchDirPosition.js";
import { isAdoptableSessionCwd } from "../../commands/resume/openLiveBackground.js";
import { tryReadFileForSync } from "../../services/settingsSync/index.js";
import { isAutoModeGateEnabled } from "../../utils/permissions/permissionSetup.js";
import {
  isSessionRecordLookupEnabled,
  describeSessionRecordWhere,
  logAttachRecordLookup,
} from "../headlessCloud/sessionRecords.js";
import {
  isRemoteCoworkLet,
  isContainerSyncEnvironment,
  isContainerSyncDisabled,
} from "../../utils/teleport/containerSync.js";
import { neverTrue } from "../../utils/permissions/sensitivePaths.js";
import {
  resolveHostConsentMode,
  storedHomeSettingsMode,
  noteHomeSettingsPrompt,
  isForwardModeEffective,
  isLaunchConsentBlocked,
} from "../../utils/teleport/homeSettingsMode.js";
import { isSelfHostedEnvironment } from "../../utils/teleport/environmentSelection.js";
import { reportSignerLoadFailure } from "../../utils/telemetry/clientEventUploader.js";
import { getSecondRootError } from "../../ink/terminal.js";
import { showScreen } from "../../utils/runSteps.js";
import { createSystemMessage } from "../../utils/messages.js";

//@ chunk-ptg2macw.js:15833-15853 placement
async function noopRefresh() {}
//@ chunk-ptg2macw.js:15853-16122 placement
function classifyAttachLookupError(error) {
  if (!(error instanceof TeleportOperationError)) return null;
  let formattedMessage = error.formattedMessage;
  return formattedMessage.startsWith(SESSION_NOT_FOUND_MESSAGE)
    ? {
        reason: "not_found",
        message: `${formattedMessage} \u2014 it doesn't match a cloud session you can access from this organization.`,
      }
    : formattedMessage.startsWith(INVALID_SESSION_ID_MESSAGE)
      ? {
          reason: "invalid_id",
          message: formattedMessage,
        }
      : null;
}
//@ chunk-ptg2macw.js:16122-16424 placement
function assertCloudSessionAttachable(error) {
  let refusal = classifyAttachLookupError(error);
  if (refusal === null) {
    logForDebugging(
      `[attachRemote] preflight fetchSession failed (continuing via WS): ${errorMessage(error)}`,
    );
    return;
  }
  logEvent("tengu_remote_attach_session_rejected", {
    reason: fromEnum(refusal.reason),
  });
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    refusal.message,
    "cloud attach refused: the id names no session of this account, or is malformed",
    refusal.reason,
  );
}
//@ chunk-ptg2macw.js:16424-16477 placement
async function attachRemoteSession(sessionId, url, options, context) {
  return runAttachRemoteSession(sessionId, url, options, context, undefined);
}
//@ chunk-ptg2macw.js:16477-24577 placement
/**
 * `claude --cloud <id>` 等附着云会话的主流程：预检会话、取令牌、建立 WS 连接并启动 REPL。
 */
async function runAttachRemoteSession(sessionId, url, options, runtime, attachContext) {
  let [
    {
      prepareApiRequest,
      deviceBridgeAccessToken,
      fetchSession,
      recoverSessionsApiBearer,
      sessionsApiAccessTokenNow,
    },
    { launchRepl },
    { getCommands, filterCommandsForRemoteMode },
    { getDefaultAppState },
    { isDebugMode },
    { consumePrefetchedHistory, gateSeed, partialSeedNotice, reportPrefetchOutcome },
    { serviceSessionName },
  ] = await Promise.all([
    import("../../utils/teleport/api.js"),
    import("../../replLauncher.js"),
    import("../../commands.lazy.js"),
    import("../../state/AppStateStore.js"),
    import("../../utils/debug.js"),
    import("../../services/remoteHistory/consumePrefetchedHistory.lazy.js"),
    import("../../utils/teleport/serviceSessionName.js"),
  ]);
  let prefetched = consumePrefetchedHistory(url, runtime?.credentials);
  let api = await prepareApiRequest(runtime?.credentials).catch((error) => {
    throw Error(`auth setup failed: ${errorMessage(error)}`);
  });
  let currentAccessToken = () => sessionsApiAccessTokenNow(api.profile) ?? api.accessToken;
  let prevState = {
    sessionId: getSessionId(),
    cwd: getCwdState(),
    isRemoteMode: getIsRemoteMode(),
    capsRemote: getCaps().remote,
    capsTranscriptSource: getCaps().transcriptSource,
    limits: getCurrentLimits(),
    limitsObserved: areLimitsObserved(),
    limitsEpoch: getLimitsAccountEpoch(),
    autoModeActive: isAutoModeActive(),
  };
  let [
    {
      boundDeviceKeyOf,
      boundDeviceOf,
      keepSettingsBesideAHelper: deviceTools,
      pullsBackToThisMachine,
      registerAttachedDevice,
      rereadBoundDevice,
      resolveAttachDeviceBinding,
      servedToolsForAttach,
      sessionBindingFields,
      SETTINGS_NOT_KEPT_REFUSAL: settingsNotKeptMessage,
    },
    { deviceHooksProcessMemories },
  ] = await Promise.all([
    import("../headlessCloud/attachDeviceBinding.js"),
    import("../../utils/hooks/deviceHooks/cloudRegistration.js"),
  ]);
  let sessionPromise = fetchSession(url, api);
  let repositoryTrust = sessionRepositoryTrustReader({
    sessionId: url,
    getAccessToken: currentAccessToken,
    fetchSession,
    initial: sessionPromise,
    createOrigin: undefined,
  });
  let session = sessionPromise.then(sessionBindingFields);
  session.catch(() => {});
  let bindingInput = runtime?.viewerOnly
    ? Promise.resolve({
        status: "disabled",
      })
    : resolveAttachDeviceBinding({
        sessionId: url,
        storageV5: runtime?.storageV5,
        credentials: runtime?.credentials,
        session,
        isEnabled: async () => isDeviceIdentityEnabledCached(),
      });
  let binding = deviceTools(bindingInput, {
    onNotice: deviceToolNoticesTo(options),
  });
  let { binding: binding_2 } = binding;
  let bindingKept =
    runtime?.viewerOnly || !isDeviceIdentityEnabledCached()
      ? Promise.resolve(true)
      : session.then(
          ({ boundDeviceId, toolHostLink }) =>
            boundDeviceId === undefined || isKnownBindingState(toolHostLink) || binding.kept,
          () => true,
        );
  let resolve = () => {};
  let dirSync = new Promise((resolve_2) => {
    resolve = resolve_2;
  });
  let prefetch = registerAttachedDevice({
    sessionId: url,
    getAccessToken: () => deviceBridgeAccessToken(api),
    orgUuid: api.orgUUID,
    binding: binding_2,
    cloudClient: true,
    toolServingOn: isViolinWoodEnabledCached(),
    storageV5: runtime?.storageV5,
    dirSync,
    onNotice: deviceToolNoticesTo(options),
    servedSettingsChanged: deviceHooksProcessMemories.of(options.host).servedSettingsChanged,
  });
  let sessionStore =
    runtime?.viewerOnly || !isViolinWoodEnabledCached()
      ? undefined
      : await servedToolsForAttach({
          sessionId: url,
          binding: binding_2,
          deviceBridge: prefetch,
          onNotice: deviceToolNoticesTo(options),
          ...(repositoryTrust && {
            repositoryTrust,
          }),
          readSession: () =>
            fetchSession(url, {
              accessToken: currentAccessToken(),
            }),
        }).catch(async (error) => {
          binding.end();
          await prefetch.stop();
          throw error;
        });
  let didAdoptCwd = false;
  let resolved = Promise.resolve();
  let abortController = new AbortController();
  try {
    setIsRemoteMode(true);
    switchSession(identityAgentId(url), "remote_attach");
    let attachableCheck = sessionPromise.then(
      async (session) => {
        if (session.session_status === "archived") {
          logEvent("tengu_remote_attach_session_rejected", {
            reason: lit("archived"),
          });
          throw Error(`Cloud session ${url} is archived and cannot accept new messages.
View it at ${getRemoteSessionUrl(url, undefined, {
            from: "cli",
            m: "0",
          })}`);
        }
        recordRemoteSessionTeam(url, session.tags);
        if (session.session_context.cwd && !didAdoptCwd && !isHarpForepillarOn()) {
          if ((await isAdoptableSessionCwd(session.session_context.cwd, "attachRemote")) && !didAdoptCwd)
            setCwdState(session.session_context.cwd);
        }
      },
      (error) => assertCloudSessionAttachable(error),
    );
    attachableCheck.catch(() => {});
    let remoteSessionUrl = getRemoteSessionUrl(url, undefined, {
      from: "cli",
      m: "0",
    });
    let isDeviceIdentityEnabled = isDeviceIdentityEnabledCached();
    let boundFile = tryReadFileForSync("attach", remoteSessionUrl, isDeviceIdentityEnabled);
    let initialState = getDefaultAppState();
    let isAutoModeEnabled = isAutoModeGateEnabled();
    let appState = {
      ...initialState,
      toolPermissionContext: {
        ...initialState.toolPermissionContext,
        isAutoModeAvailable: isAutoModeEnabled,
        canAutoClassifierRun: isAutoModeEnabled,
      },
      ...runtime?.initialStateOverride,
      remoteSessionUrl,
      replBridgeEnabled: false,
      replBridgeOutboundOnly: false,
      replBridgeExplicit: false,
    };
    let historyGate =
      runtime?.viewerOnly || !isSessionRecordLookupEnabled()
        ? Promise.resolve({
            handle: undefined,
            elsewhere: undefined,
            maybeElsewhere: undefined,
            lookup: "not_looked",
          })
        : (async () => {
            let recordLookup = await import("../../utils/findSessionRecordElsewhere.lazy.js").then(
              ({ findSessionRecordElsewhere }) => findSessionRecordElsewhere(url, runtime?.storageV5),
            );
            return {
              handle: undefined,
              elsewhere: undefined,
              maybeElsewhere:
                recordLookup.kind === "unknown" && recordLookup.why === "not_looked"
                  ? undefined
                  : recordLookup.kind !== "nowhere",
              lookup: describeSessionRecordWhere(recordLookup),
            };
          })().catch((error) => {
            logForDebugging(
              `[attachRemote] could not check this computer's session records: ${errorMessage(error)}`,
              {
                level: "warn",
              },
            );
            return {
              handle: undefined,
              elsewhere: undefined,
              maybeElsewhere: true,
              lookup: "failed",
            };
          });
    resolved = historyGate;
    historyGate.then(({ handle }) => resolve(handle !== undefined));
    historyGate.then(({ lookup }) => logAttachRecordLookup(lookup, "terminal"));
    let resendSettings = (async () => {
      if (runtime?.viewerOnly || !options.host.launchOptions.mayForwardHomeSettings()) return;
      let ownFlagsOn = isSettingsToCloudEnabledCached();
      let { handle } = await historyGate;
      let projectSynced =
        handle !== undefined &&
        isRemoteCoworkLet(handle) &&
        (await isContainerSyncEnvironment(neverTrue(), handle.gitRoot));
      if (!ownFlagsOn && !projectSynced) return;
      let hostConsentMode = resolveHostConsentMode({
        hostConsent: options.host.launchOptions.homeSettingsHostConsent(),
        areOwnFlagsOn: ownFlagsOn,
        stored: storedHomeSettingsMode(),
        isProjectSynced: projectSynced,
      });
      noteHomeSettingsPrompt({
        launchConsent: hostConsentMode,
        isProjectSynced: projectSynced,
        launchMayForward: true,
        surface: "terminal",
        trigger: "attach",
      });
      if (!isForwardModeEffective(hostConsentMode)) return;
      let { resendHomeSettingsOnAttach } =
        await import("../../services/homeSeed/resendHomeSettingsOnAttach.lazy.js");
      return resendHomeSettingsOnAttach({
        sessionId: url,
        boundDeviceUuid: binding_2.then(
          (binding) => (binding.status === "bound" ? binding.deviceId : undefined),
          () => {
            return;
          },
        ),
        isOnSelfHostedRunner: sessionPromise.then(isSelfHostedEnvironment, () => false),
        storageV5: runtime?.storageV5,
        credentials: runtime?.credentials,
        signal: abortController.signal,
        ...(isLaunchConsentBlocked(hostConsentMode)
          ? {
              launchConsent: hostConsentMode,
              isProjectSynced: isContainerSyncDisabled(handle),
              isProjectStillSynced: async () =>
                isRemoteCoworkLet(handle) && isContainerSyncEnvironment(true, handle?.gitRoot),
            }
          : hostConsentMode && {
              launchConsent: hostConsentMode,
            }),
      });
    })().catch((error) => {
      logForDebugging(`[attachRemote] settings re-send could not start: ${errorMessage(error)}`, {
        level: "warn",
      });
      return;
    });
    let [
      commands,
      prefetchOutcome,
      { handle, elsewhere, maybeElsewhere, lookup },
      seededHistory,
      isSettingsKept,
    ] = await Promise.all([
      getCommands(prevState.cwd, runtime?.storageV5).then(filterCommandsForRemoteMode),
      prefetched,
      historyGate,
      resendSettings,
      bindingKept,
    ]);
    if (!isSettingsKept) {
      logEvent("tengu_remote_attach_session_rejected", {
        reason: lit("settings_not_kept"),
      });
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        settingsNotKeptMessage,
        "cloud attach refused: the copies of the settings could not be kept beside a helper",
        "settings_not_kept",
      );
    }
    reportPrefetchOutcome(prefetchOutcome);
    let seed = gateSeed(prefetchOutcome);
    appState.hasRemoteReplyChannel = false;
    appState.workerInventory = seed?.lastWorkerInventory ?? null;
    let signerPromise =
      isDeviceIdentityEnabledCached() && !runtime?.viewerOnly
        ? import("../../bridge/clientEventSigner.js").then(
            ({ deviceEventSignerOnceBoundHere }) =>
              deviceEventSignerOnceBoundHere(
                binding_2.then(
                  (binding) => (binding.status === "bound" ? binding.deviceId : undefined),
                  () => {
                    return;
                  },
                ),
                runtime?.credentials,
              ),
            reportSignerLoadFailure,
          )
        : undefined;
    let didAbort = false;
    let remoteSessionConfig = {
      sessionId: url,
      getAccessToken: currentAccessToken,
      consoleProfileBearer: api.profile,
      orgUuid: api.orgUUID,
      viewerOnly: runtime?.viewerOnly ?? false,
      isAttachToExisting: true,
      serviceName: sessionPromise.then(
        (session) => serviceSessionName(session.title),
        () => {
          return;
        },
      ),
      ...false,
      preflightCheck: attachableCheck,
      deviceNotBoundNotice: prefetch.notice,
      ...(runtime?.endProcessOnExit && {
        leaveEndsProcess: true,
      }),
      ...(repositoryTrust && {
        repositoryTrust,
        boundHere: binding_2.then(
          (error) => error.status === "bound",
          () => false,
        ),
      }),
      ...(sessionStore && {
        servedTools: sessionStore,
      }),
      heldServedCall: prefetch.heldServedCall,
      ...(signerPromise && {
        eventSigner: signerPromise,
        rebindEventSigner: () => {
          if (didAbort) return;
          didAbort = true;
          signerPromise
            .then((error) => {
              if (error === undefined) return;
              let lookup = rereadBoundDevice(
                fetchSession(url, {
                  accessToken: currentAccessToken(),
                }).then(sessionBindingFields),
              );
              error.rebind(lookup);
              return lookup;
            })
            .catch((error) =>
              logForDebugging(
                `[attachRemote] could not re-read the session's binding (the event signer keeps what it had): ${errorMessage(error)}`,
              ),
            )
            .finally(() => {
              didAbort = false;
            });
        },
      }),
      onAuth401: (session) =>
        recoverSessionsApiBearer(session, runtime?.credentials, runtime?.storageV5, api.profile),
      dirSync: handle,
      ...false,
      ...(maybeElsewhere !== undefined && {
        sessionRecordMayBeElsewhere: maybeElsewhere,
      }),
      ...(lookup !== "not_looked" && {
        sessionRecordLookup: lookup,
      }),
      ...(seededHistory && {
        homeSeed: seededHistory,
        homeSeedHoldsFirstSend: false,
      }),
      initialSequenceNum: seed?.maxSequenceNum,
      seedNestedUuidAliases: seed?.nestedUuidAliases,
      seedReplyChannelToolUseIds: seed?.replyChannelToolUseIds,
      seedActiveGoal: seed?.lastActiveGoal ?? (seed?.complete ? null : undefined),
      seedAutocompactState: seed?.lastAutocompactState,
      seedSessionArtifacts: seed?.lastSessionArtifacts,
      storedSessionArtifacts: sessionPromise.then(
        (session) => session.artifacts,
        () => {
          return;
        },
      ),
      storedAutocompactState: sessionPromise.then(
        (session) => session.autocompact_state,
        () => {
          return;
        },
      ),
      seedPermissionMode: seed?.lastWorkerPermissionMode,
      adoptSeedPermissionMode: runtime?.adoptSeedPermissionMode,
      seedRateLimitInfos: seed?.rateLimitInfos,
      seedBackgroundTasks: seed?.backgroundTasks,
      seedWorkflowRuns: seed?.workflowRuns,
      seedWorkerSendsNow: seed?.lastWorkerSendsNow,
      seedWorkerMovesBash: seed?.lastWorkerMovesBash,
      seedSubagentRequests: seed?.openSubagentRequests,
      seedAskersPastATurn: seed?.askersPastATurn,
    };
    await launchRepl(
      sessionId,
      {
        getFpsMetrics: () => {
          return;
        },
        initialState: appState,
        session: options,
        storageV5: runtime?.storageV5,
        credentials: runtime?.credentials,
        fleetNudgeStore: runtime?.fleetNudgeStore,
      },
      {
        debug: isDebugMode(),
        commands,
        initialTools: [],
        initialMessagesOrigin: "remote",
        initialMessages: [
          ...(isDeviceIdentityEnabled ? [] : [boundFile]),
          ...(seed ? (seed.complete ? seed.messages : [partialSeedNotice(url), ...seed.messages]) : []),
          ...(isDeviceIdentityEnabled ? [boundFile] : []),
          ...(elsewhere === undefined ? [] : [warningSystemMessage(elsewhere)]),
          ...[],
        ],
        mcpClients: [],
        remoteSessionConfig,
        autoConnectIdeFlag: runtime?.autoConnectIdeFlag,
        disableSlashCommands: runtime?.disableSlashCommands,
        onDetachToCaller: () => sessionId.unmount(),
        thinkingConfig: {
          type: "adaptive",
        },
      },
      async (root, store) => {
        if (attachContext?.overLoading)
          getSecondRootError().get(process.stdout)?.keepAltScreenForNextScreen();
        showScreen(root, store);
        let winner = await Promise.race([
          root.waitUntilExit().then(() => {
            return;
          }),
          ...(attachContext
            ? [
                attachContext.leftForTab.then((screen) => ({
                  screen,
                })),
              ]
            : []),
        ]);
        if (winner !== undefined) {
          getSecondRootError().get(process.stdout)?.keepAltScreenForNextScreen();
          showScreen(root, winner.screen, {
            session: options,
            storageV5: runtime?.storageV5,
          });
          return;
        }
        await runtime?.endProcessOnExit?.();
      },
    );
  } finally {
    didAdoptCwd = true;
    abortController.abort();
    binding.end();
    await prefetch.stop();
    setIsRemoteMode(prevState.isRemoteMode);
    setAutoModeActive(prevState.autoModeActive && isAutoModeGateEnabled());
    switchSession(prevState.sessionId, "remote_attach", null, {
      cwd: prevState.cwd,
    });
    if (!prevState.isRemoteMode)
      setCaps({
        ...getCaps(),
        remote: prevState.capsRemote,
        transcriptSource: prevState.capsTranscriptSource,
      });
    await noopRefresh();
    if (getCurrentLimits() !== prevState.limits)
      if (getLimitsAccountEpoch() === prevState.limitsEpoch)
        restoreLimits(prevState.limits, prevState.limitsObserved);
      else resetCurrentLimits();
  }
}
//@ chunk-ptg2macw.js:24577-24615 placement
function warningSystemMessage(text) {
  return createSystemMessage(text, "warning");
}
export { attachRemoteSession };

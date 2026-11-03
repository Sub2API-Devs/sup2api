/**
 * cli/handlers/attachRemote.ts
 *
 * 2.1.316 新增：附着云会话（claude --cloud <id>）主流程：预检、取令牌、建立 WS 并启动 REPL
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-edjpba11.js (6)
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
import { reportSignerLoadFailure } from "../../utils/telemetry/memorySummary.js";
import { getSecondRootError } from "../../ink/terminal.js";
import { showScreen } from "../../utils/runSteps.js";
import { createSystemMessage } from "../../utils/messages.js";

//@ chunk-edjpba11.js:14629-14649 placement
async function noopRefresh() {}
//@ chunk-edjpba11.js:14649-14918 placement
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
//@ chunk-edjpba11.js:14918-15220 placement
function assertCloudSessionAttachable(error) {
  let o = classifyAttachLookupError(error);
  if (o === null) {
    logForDebugging(
      `[attachRemote] preflight fetchSession failed (continuing via WS): ${errorMessage(error)}`,
    );
    return;
  }
  logEvent("tengu_remote_attach_session_rejected", {
    reason: fromEnum(o.reason),
  });
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    o.message,
    "cloud attach refused: the id names no session of this account, or is malformed",
    o.reason,
  );
}
//@ chunk-edjpba11.js:15220-15273 placement
async function attachRemoteSession(r, o, u, n) {
  return runAttachRemoteSession(r, o, u, n, undefined);
}
//@ chunk-edjpba11.js:15273-23367 placement
/**
 * `claude --cloud <id>` 等附着云会话的主流程：预检会话、取令牌、建立 WS 连接并启动 REPL。
 */
async function runAttachRemoteSession(r, o, u, n, k) {
  let [
    {
      prepareApiRequest: L,
      deviceBridgeAccessToken: ee,
      fetchSession: R,
      recoverSessionsApiBearer: te,
      sessionsApiAccessTokenNow: oe,
    },
    { launchRepl: ne },
    { getCommands: se, filterCommandsForRemoteMode: ie },
    { getDefaultAppState: re },
    { isDebugMode: ae },
    { consumePrefetchedHistory: de, gateSeed: ce, partialSeedNotice: le, reportPrefetchOutcome: ue },
    { serviceSessionName: me },
  ] = await Promise.all([
    import("./chunk-6phxatm7.js"),
    import("./chunk-68kbv6e6.js"),
    import("./chunk-aeccp9b6.js"),
    import("./chunk-c9766cw2.js"),
    import("./chunk-cgjee2k6.js"),
    import("./chunk-pmgfyvx7.js"),
    import("./chunk-qzae0f47.js"),
  ]);
  let fe = de(o, n?.credentials);
  let h = await L(n?.credentials).catch((error) => {
    throw Error(`auth setup failed: ${errorMessage(error)}`);
  });
  let _ = () => oe(h.profile) ?? h.accessToken;
  let l = {
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
      boundDeviceKeyOf: Ie,
      boundDeviceOf: Le,
      keepSettingsBesideAHelper: he,
      pullsBackToThisMachine: Be,
      registerAttachedDevice: pe,
      rereadBoundDevice: Se,
      resolveAttachDeviceBinding: ge,
      servedToolsForAttach: we,
      sessionBindingFields: B,
      SETTINGS_NOT_KEPT_REFUSAL: ye,
    },
    { deviceHooksProcessMemories: ve },
  ] = await Promise.all([import("./chunk-0yqdkcyd.js"), import("./chunk-frrbnh1c.js")]);
  let g = R(o, h);
  let A = sessionRepositoryTrustReader({
    sessionId: o,
    getAccessToken: _,
    fetchSession: R,
    initial: g,
    createOrigin: undefined,
  });
  let O = g.then(B);
  O.catch(() => {});
  let ke = n?.viewerOnly
    ? Promise.resolve({
        status: "disabled",
      })
    : ge({
        sessionId: o,
        storageV5: n?.storageV5,
        credentials: n?.credentials,
        session: O,
        isEnabled: async () => isDeviceIdentityEnabledCached(),
      });
  let T = he(ke, {
    onNotice: deviceToolNoticesTo(u),
  });
  let { binding } = T;
  let be =
    n?.viewerOnly || !isDeviceIdentityEnabledCached()
      ? Promise.resolve(true)
      : O.then(
          ({ boundDeviceId, toolHostLink }) =>
            boundDeviceId === undefined || isKnownBindingState(toolHostLink) || T.kept,
          () => true,
        );
  let H = () => {};
  let dirSync = new Promise((resolve) => {
    H = resolve;
  });
  let y = pe({
    sessionId: o,
    getAccessToken: () => ee(h),
    orgUuid: h.orgUUID,
    binding,
    cloudClient: true,
    toolServingOn: isViolinWoodEnabledCached(),
    storageV5: n?.storageV5,
    dirSync,
    onNotice: deviceToolNoticesTo(u),
    servedSettingsChanged: ve.of(u.host).servedSettingsChanged,
  });
  let D =
    n?.viewerOnly || !isViolinWoodEnabledCached()
      ? undefined
      : await we({
          sessionId: o,
          binding,
          deviceBridge: y,
          onNotice: deviceToolNoticesTo(u),
          ...(A && {
            repositoryTrust: A,
          }),
          readSession: () =>
            R(o, {
              accessToken: _(),
            }),
        }).catch(async (error) => {
          T.end();
          await y.stop();
          throw error;
        });
  let P = false;
  let resolved = Promise.resolve();
  let abortController = new AbortController();
  try {
    setIsRemoteMode(true);
    switchSession(identityAgentId(o), "remote_attach");
    let m = g.then(
      async (e) => {
        if (e.session_status === "archived") {
          logEvent("tengu_remote_attach_session_rejected", {
            reason: lit("archived"),
          });
          throw Error(`Cloud session ${o} is archived and cannot accept new messages.
View it at ${getRemoteSessionUrl(o, undefined, {
            from: "cli",
            m: "0",
          })}`);
        }
        recordRemoteSessionTeam(o, e.tags);
        if (e.session_context.cwd && !P && !isHarpForepillarOn()) {
          if ((await isAdoptableSessionCwd(e.session_context.cwd, "attachRemote")) && !P)
            setCwdState(e.session_context.cwd);
        }
      },
      (error) => assertCloudSessionAttachable(error),
    );
    m.catch(() => {});
    let remoteSessionUrl = getRemoteSessionUrl(o, undefined, {
      from: "cli",
      m: "0",
    });
    let F = isDeviceIdentityEnabledCached();
    let j = tryReadFileForSync("attach", remoteSessionUrl, F);
    let V = re();
    let W = isAutoModeGateEnabled();
    let M = {
      ...V,
      toolPermissionContext: {
        ...V.toolPermissionContext,
        isAutoModeAvailable: W,
        canAutoClassifierRun: W,
      },
      ...n?.initialStateOverride,
      remoteSessionUrl,
      replBridgeEnabled: false,
      replBridgeOutboundOnly: false,
      replBridgeExplicit: false,
    };
    let v =
      n?.viewerOnly || !isSessionRecordLookupEnabled()
        ? Promise.resolve({
            handle: undefined,
            elsewhere: undefined,
            maybeElsewhere: undefined,
            lookup: "not_looked",
          })
        : (async () => {
            let i = await import("./chunk-dmh8arxx.js").then(({ findSessionRecordElsewhere }) =>
              findSessionRecordElsewhere(o, n?.storageV5),
            );
            return {
              handle: undefined,
              elsewhere: undefined,
              maybeElsewhere:
                i.kind === "unknown" && i.why === "not_looked" ? undefined : i.kind !== "nowhere",
              lookup: describeSessionRecordWhere(i),
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
    resolved = v;
    v.then(({ handle }) => H(handle !== undefined));
    v.then(({ lookup }) => logAttachRecordLookup(lookup, "terminal"));
    let Ce = (async () => {
      if (n?.viewerOnly || !u.host.launchOptions.mayForwardHomeSettings()) return;
      let e = isSettingsToCloudEnabledCached();
      let { handle } = await v;
      let f =
        handle !== undefined &&
        isRemoteCoworkLet(handle) &&
        (await isContainerSyncEnvironment(neverTrue(), handle.gitRoot));
      if (!e && !f) return;
      let hostConsentMode = resolveHostConsentMode({
        hostConsent: u.host.launchOptions.homeSettingsHostConsent(),
        areOwnFlagsOn: e,
        stored: storedHomeSettingsMode(),
        isProjectSynced: f,
      });
      noteHomeSettingsPrompt({
        launchConsent: hostConsentMode,
        isProjectSynced: f,
        launchMayForward: true,
        surface: "terminal",
        trigger: "attach",
      });
      if (!isForwardModeEffective(hostConsentMode)) return;
      let { resendHomeSettingsOnAttach } = await import("./chunk-h33znphj.js");
      return resendHomeSettingsOnAttach({
        sessionId: o,
        boundDeviceUuid: binding.then(
          (J) => (J.status === "bound" ? J.deviceId : undefined),
          () => {
            return;
          },
        ),
        isOnSelfHostedRunner: g.then(isSelfHostedEnvironment, () => false),
        storageV5: n?.storageV5,
        credentials: n?.credentials,
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
    let [Ae, q, { handle: Te, elsewhere: Y, maybeElsewhere: G, lookup: X }, z, Ee] = await Promise.all([
      se(l.cwd, n?.storageV5).then(ie),
      fe,
      v,
      Ce,
      be,
    ]);
    if (!Ee) {
      logEvent("tengu_remote_attach_session_rejected", {
        reason: lit("settings_not_kept"),
      });
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        ye,
        "cloud attach refused: the copies of the settings could not be kept beside a helper",
        "settings_not_kept",
      );
    }
    ue(q);
    let s = ce(q);
    M.hasRemoteReplyChannel = false;
    M.workerInventory = s?.lastWorkerInventory ?? null;
    let N =
      isDeviceIdentityEnabledCached() && !n?.viewerOnly
        ? import("./chunk-pesgm5d3.js").then(
            ({ deviceEventSignerOnceBoundHere }) =>
              deviceEventSignerOnceBoundHere(
                binding.then(
                  (i) => (i.status === "bound" ? i.deviceId : undefined),
                  () => {
                    return;
                  },
                ),
                n?.credentials,
              ),
            reportSignerLoadFailure,
          )
        : undefined;
    let x = false;
    let remoteSessionConfig = {
      sessionId: o,
      getAccessToken: _,
      consoleProfileBearer: h.profile,
      orgUuid: h.orgUUID,
      viewerOnly: n?.viewerOnly ?? false,
      isAttachToExisting: true,
      serviceName: g.then(
        (e) => me(e.title),
        () => {
          return;
        },
      ),
      preflightCheck: m,
      deviceNotBoundNotice: y.notice,
      ...(n?.endProcessOnExit && {
        leaveEndsProcess: true,
      }),
      ...(A && {
        repositoryTrust: A,
        boundHere: binding.then(
          (e) => e.status === "bound",
          () => false,
        ),
      }),
      ...(D && {
        servedTools: D,
      }),
      heldServedCall: y.heldServedCall,
      ...(N && {
        eventSigner: N,
        rebindEventSigner: () => {
          if (x) return;
          x = true;
          N.then((e) => {
            if (e === undefined) return;
            let i = Se(
              R(o, {
                accessToken: _(),
              }).then(B),
            );
            e.rebind(i);
            return i;
          })
            .catch((error) =>
              logForDebugging(
                `[attachRemote] could not re-read the session's binding (the event signer keeps what it had): ${errorMessage(error)}`,
              ),
            )
            .finally(() => {
              x = false;
            });
        },
      }),
      onAuth401: (e) => te(e, n?.credentials, n?.storageV5, h.profile),
      dirSync: Te,
      ...false,
      ...(G !== undefined && {
        sessionRecordMayBeElsewhere: G,
      }),
      ...(X !== "not_looked" && {
        sessionRecordLookup: X,
      }),
      ...(z && {
        homeSeed: z,
        homeSeedHoldsFirstSend: false,
      }),
      initialSequenceNum: s?.maxSequenceNum,
      seedNestedUuidAliases: s?.nestedUuidAliases,
      seedReplyChannelToolUseIds: s?.replyChannelToolUseIds,
      seedActiveGoal: s?.lastActiveGoal ?? (s?.complete ? null : undefined),
      seedAutocompactState: s?.lastAutocompactState,
      seedSessionArtifacts: s?.lastSessionArtifacts,
      storedSessionArtifacts: g.then(
        (e) => e.artifacts,
        () => {
          return;
        },
      ),
      storedAutocompactState: g.then(
        (e) => e.autocompact_state,
        () => {
          return;
        },
      ),
      seedPermissionMode: s?.lastWorkerPermissionMode,
      adoptSeedPermissionMode: n?.adoptSeedPermissionMode,
      seedRateLimitInfos: s?.rateLimitInfos,
      seedBackgroundTasks: s?.backgroundTasks,
      seedWorkflowRuns: s?.workflowRuns,
      seedWorkerSendsNow: s?.lastWorkerSendsNow,
      seedWorkerMovesBash: s?.lastWorkerMovesBash,
      seedSubagentRequests: s?.openSubagentRequests,
      seedAskersPastATurn: s?.askersPastATurn,
    };
    await ne(
      r,
      {
        getFpsMetrics: () => {
          return;
        },
        initialState: M,
        session: u,
        storageV5: n?.storageV5,
        credentials: n?.credentials,
        fleetNudgeStore: n?.fleetNudgeStore,
      },
      {
        debug: ae(),
        commands: Ae,
        initialTools: [],
        initialMessagesOrigin: "remote",
        initialMessages: [
          ...(F ? [] : [j]),
          ...(s ? (s.complete ? s.messages : [le(o), ...s.messages]) : []),
          ...(F ? [j] : []),
          ...(Y === undefined ? [] : [warningSystemMessage(Y)]),
          ...[],
        ],
        mcpClients: [],
        remoteSessionConfig,
        autoConnectIdeFlag: n?.autoConnectIdeFlag,
        disableSlashCommands: n?.disableSlashCommands,
        onDetachToCaller: () => r.unmount(),
        thinkingConfig: {
          type: "adaptive",
        },
      },
      async (e, i) => {
        if (k?.overLoading) getSecondRootError().get(process.stdout)?.keepAltScreenForNextScreen();
        showScreen(e, i);
        let winner = await Promise.race([
          e.waitUntilExit().then(() => {
            return;
          }),
          ...(k
            ? [
                k.leftForTab.then((screen) => ({
                  screen,
                })),
              ]
            : []),
        ]);
        if (winner !== undefined) {
          getSecondRootError().get(process.stdout)?.keepAltScreenForNextScreen();
          showScreen(e, winner.screen, {
            session: u,
            storageV5: n?.storageV5,
          });
          return;
        }
        await n?.endProcessOnExit?.();
      },
    );
  } finally {
    P = true;
    abortController.abort();
    T.end();
    await y.stop();
    setIsRemoteMode(l.isRemoteMode);
    setAutoModeActive(l.autoModeActive && isAutoModeGateEnabled());
    switchSession(l.sessionId, "remote_attach", null, {
      cwd: l.cwd,
    });
    if (!l.isRemoteMode)
      setCaps({
        ...getCaps(),
        remote: l.capsRemote,
        transcriptSource: l.capsTranscriptSource,
      });
    await noopRefresh();
    if (getCurrentLimits() !== l.limits)
      if (getLimitsAccountEpoch() === l.limitsEpoch) restoreLimits(l.limits, l.limitsObserved);
      else resetCurrentLimits();
  }
}
//@ chunk-edjpba11.js:23367-23405 placement
function warningSystemMessage(r) {
  return createSystemMessage(r, "warning");
}

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
import { SESSION_NOT_FOUND_MESSAGE, pro } from "../../utils/teleport/api.js";
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
import { LE } from "../../utils/agentId.js";
import { getRemoteSessionUrl } from "../../constants/product.js";
import { u5s } from "../../utils/background/remote/remoteSession.js";
import { KZt } from "../../utils/launchDirPosition.js";
import { isAdoptableSessionCwd } from "../../commands/resume/openLiveBackground.js";
import { tryReadFileForSync } from "../../services/settingsSync/index.js";
import { isAutoModeGateEnabled } from "../../utils/permissions/permissionSetup.js";
import { dpt, describeSessionRecordWhere, c0n } from "../headlessCloud/sessionRecords.js";
import { Apn, O0e, N9n } from "../../utils/teleport/containerSync.js";
import { Uxe } from "../../utils/permissions/sensitivePaths.js";
import { hKe, gbe, yKe, isForwardModeEffective, oN } from "../../utils/teleport/homeSettingsMode.js";
import { Hsr } from "../../utils/teleport/environmentSelection.js";
import { reportSignerLoadFailure } from "../../utils/telemetry/memorySummary.js";
import { di } from "../../ink/terminal.js";
import { showScreen } from "../../utils/runSteps.js";
import { createSystemMessage } from "../../utils/messages.js";

//@ chunk-edjpba11.js:14629-14649 placement
async function Q() {}
//@ chunk-edjpba11.js:14649-14918 placement
function classifyAttachLookupError(error) {
  if (!(error instanceof TeleportOperationError)) return null;
  let formattedMessage = error.formattedMessage;
  return formattedMessage.startsWith(SESSION_NOT_FOUND_MESSAGE)
    ? {
        reason: "not_found",
        message: `${formattedMessage} \u2014 it doesn't match a cloud session you can access from this organization.`,
      }
    : formattedMessage.startsWith(pro)
      ? { reason: "invalid_id", message: formattedMessage }
      : null;
}
//@ chunk-edjpba11.js:14918-15220 placement
function assertCloudSessionAttachable(r) {
  let o = classifyAttachLookupError(r);
  if (o === null) {
    logForDebugging(`[attachRemote] preflight fetchSession failed (continuing via WS): ${errorMessage(r)}`);
    return;
  }
  throw (
    logEvent("tengu_remote_attach_session_rejected", { reason: fromEnum(o.reason) }),
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      o.message,
      "cloud attach refused: the id names no session of this account, or is malformed",
      o.reason,
    )
  );
}
//@ chunk-edjpba11.js:15220-15273 placement
async function attachRemoteSession(r, o, u, n) {
  return runAttachRemoteSession(r, o, u, n, void 0);
}
/**
 * `claude --cloud <id>` 等附着云会话的主流程：预检会话、取令牌、建立 WS 连接并启动 REPL。
 */
//@ chunk-edjpba11.js:15273-23367 placement
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
    ]),
    fe = de(o, n?.credentials),
    h = await L(n?.credentials).catch((m) => {
      throw Error(`auth setup failed: ${errorMessage(m)}`);
    }),
    _ = () => oe(h.profile) ?? h.accessToken,
    l = {
      sessionId: getSessionId(),
      cwd: getCwdState(),
      isRemoteMode: getIsRemoteMode(),
      capsRemote: getCaps().remote,
      capsTranscriptSource: getCaps().transcriptSource,
      limits: getCurrentLimits(),
      limitsObserved: areLimitsObserved(),
      limitsEpoch: getLimitsAccountEpoch(),
      autoModeActive: isAutoModeActive(),
    },
    [
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
    ] = await Promise.all([import("./chunk-0yqdkcyd.js"), import("./chunk-frrbnh1c.js")]),
    g = R(o, h),
    A = sessionRepositoryTrustReader({
      sessionId: o,
      getAccessToken: _,
      fetchSession: R,
      initial: g,
      createOrigin: void 0,
    }),
    O = g.then(B);
  O.catch(() => {});
  let ke = n?.viewerOnly
      ? Promise.resolve({ status: "disabled" })
      : ge({
          sessionId: o,
          storageV5: n?.storageV5,
          credentials: n?.credentials,
          session: O,
          isEnabled: async () => isDeviceIdentityEnabledCached(),
        }),
    T = he(ke, { onNotice: deviceToolNoticesTo(u) }),
    { binding: binding } = T,
    be =
      n?.viewerOnly || !isDeviceIdentityEnabledCached()
        ? Promise.resolve(!0)
        : O.then(
            ({ boundDeviceId: boundDeviceId, toolHostLink: toolHostLink }) =>
              boundDeviceId === void 0 || isKnownBindingState(toolHostLink) || T.kept,
            () => !0,
          ),
    H = () => {},
    promise = new Promise((m) => {
      H = m;
    }),
    y = pe({
      sessionId: o,
      getAccessToken: () => ee(h),
      orgUuid: h.orgUUID,
      binding: binding,
      cloudClient: !0,
      toolServingOn: isViolinWoodEnabledCached(),
      storageV5: n?.storageV5,
      dirSync: promise,
      onNotice: deviceToolNoticesTo(u),
      servedSettingsChanged: ve.of(u.host).servedSettingsChanged,
    }),
    D =
      n?.viewerOnly || !isViolinWoodEnabledCached()
        ? void 0
        : await we({
            sessionId: o,
            binding: binding,
            deviceBridge: y,
            onNotice: deviceToolNoticesTo(u),
            ...(A && { repositoryTrust: A }),
            readSession: () => R(o, { accessToken: _() }),
          }).catch(async (m) => {
            throw (T.end(), await y.stop(), m);
          }),
    P = !1,
    resolved = Promise.resolve(),
    abortController = new AbortController();
  try {
    (setIsRemoteMode(!0), switchSession(LE(o), "remote_attach"));
    let m = g.then(
      async (e) => {
        if (e.session_status === "archived")
          throw (
            logEvent("tengu_remote_attach_session_rejected", { reason: lit("archived") }),
            Error(`Cloud session ${o} is archived and cannot accept new messages.
View it at ${getRemoteSessionUrl(o, void 0, { from: "cli", m: "0" })}`)
          );
        if ((u5s(o, e.tags), e.session_context.cwd && !P && !KZt())) {
          if ((await isAdoptableSessionCwd(e.session_context.cwd, "attachRemote")) && !P)
            setCwdState(e.session_context.cwd);
        }
      },
      (e) => assertCloudSessionAttachable(e),
    );
    m.catch(() => {});
    let E = getRemoteSessionUrl(o, void 0, { from: "cli", m: "0" }),
      F = isDeviceIdentityEnabledCached(),
      j = tryReadFileForSync("attach", E, F),
      V = re(),
      W = isAutoModeGateEnabled(),
      M = {
        ...V,
        toolPermissionContext: {
          ...V.toolPermissionContext,
          isAutoModeAvailable: W,
          canAutoClassifierRun: W,
        },
        ...n?.initialStateOverride,
        remoteSessionUrl: E,
        replBridgeEnabled: !1,
        replBridgeOutboundOnly: !1,
        replBridgeExplicit: !1,
      },
      v =
        n?.viewerOnly || !dpt()
          ? Promise.resolve({
              handle: void 0,
              elsewhere: void 0,
              maybeElsewhere: void 0,
              lookup: "not_looked",
            })
          : (async () => {
              let i = await import("./chunk-dmh8arxx.js").then(
                ({ findSessionRecordElsewhere: findSessionRecordElsewhere }) =>
                  findSessionRecordElsewhere(o, n?.storageV5),
              );
              return {
                handle: void 0,
                elsewhere: void 0,
                maybeElsewhere:
                  i.kind === "unknown" && i.why === "not_looked" ? void 0 : i.kind !== "nowhere",
                lookup: describeSessionRecordWhere(i),
              };
            })().catch(
              (e) => (
                logForDebugging(
                  `[attachRemote] could not check this computer's session records: ${errorMessage(e)}`,
                  { level: "warn" },
                ),
                { handle: void 0, elsewhere: void 0, maybeElsewhere: !0, lookup: "failed" }
              ),
            );
    ((resolved = v),
      v.then(({ handle: handle }) => H(handle !== void 0)),
      v.then(({ lookup: lookup }) => c0n(lookup, "terminal")));
    let Ce = (async () => {
        if (n?.viewerOnly || !u.host.launchOptions.mayForwardHomeSettings()) return;
        let e = isSettingsToCloudEnabledCached(),
          { handle: handle } = await v,
          f = handle !== void 0 && Apn(handle) && (await O0e(Uxe(), handle.gitRoot));
        if (!e && !f) return;
        let p = hKe({
          hostConsent: u.host.launchOptions.homeSettingsHostConsent(),
          areOwnFlagsOn: e,
          stored: gbe(),
          isProjectSynced: f,
        });
        if (
          (yKe({
            launchConsent: p,
            isProjectSynced: f,
            launchMayForward: !0,
            surface: "terminal",
            trigger: "attach",
          }),
          !isForwardModeEffective(p))
        )
          return;
        let { resendHomeSettingsOnAttach: resendHomeSettingsOnAttach } = await import("./chunk-h33znphj.js");
        return resendHomeSettingsOnAttach({
          sessionId: o,
          boundDeviceUuid: binding.then(
            (J) => (J.status === "bound" ? J.deviceId : void 0),
            () => {
              return;
            },
          ),
          isOnSelfHostedRunner: g.then(Hsr, () => !1),
          storageV5: n?.storageV5,
          credentials: n?.credentials,
          signal: abortController.signal,
          ...(oN(p)
            ? {
                launchConsent: p,
                isProjectSynced: N9n(handle),
                isProjectStillSynced: async () => Apn(handle) && O0e(!0, handle?.gitRoot),
              }
            : p && { launchConsent: p }),
        });
      })().catch((e) => {
        logForDebugging(`[attachRemote] settings re-send could not start: ${errorMessage(e)}`, {
          level: "warn",
        });
        return;
      }),
      [Ae, q, { handle: Te, elsewhere: Y, maybeElsewhere: G, lookup: X }, z, Ee] = await Promise.all([
        se(l.cwd, n?.storageV5).then(ie),
        fe,
        v,
        Ce,
        be,
      ]);
    if (!Ee)
      throw (
        logEvent("tengu_remote_attach_session_rejected", { reason: lit("settings_not_kept") }),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          ye,
          "cloud attach refused: the copies of the settings could not be kept beside a helper",
          "settings_not_kept",
        )
      );
    ue(q);
    let s = ce(q);
    ((M.hasRemoteReplyChannel = !1), (M.workerInventory = s?.lastWorkerInventory ?? null));
    let N =
        isDeviceIdentityEnabledCached() && !n?.viewerOnly
          ? import("./chunk-pesgm5d3.js").then(
              ({ deviceEventSignerOnceBoundHere: deviceEventSignerOnceBoundHere }) =>
                deviceEventSignerOnceBoundHere(
                  binding.then(
                    (i) => (i.status === "bound" ? i.deviceId : void 0),
                    () => {
                      return;
                    },
                  ),
                  n?.credentials,
                ),
              reportSignerLoadFailure,
            )
          : void 0,
      x = !1,
      Oe = {
        sessionId: o,
        getAccessToken: _,
        consoleProfileBearer: h.profile,
        orgUuid: h.orgUUID,
        viewerOnly: n?.viewerOnly ?? !1,
        isAttachToExisting: !0,
        serviceName: g.then(
          (e) => me(e.title),
          () => {
            return;
          },
        ),
        preflightCheck: m,
        deviceNotBoundNotice: y.notice,
        ...(n?.endProcessOnExit && { leaveEndsProcess: !0 }),
        ...(A && {
          repositoryTrust: A,
          boundHere: binding.then(
            (e) => e.status === "bound",
            () => !1,
          ),
        }),
        ...(D && { servedTools: D }),
        heldServedCall: y.heldServedCall,
        ...(N && {
          eventSigner: N,
          rebindEventSigner: () => {
            if (x) return;
            ((x = !0),
              N.then((e) => {
                if (e === void 0) return;
                let i = Se(R(o, { accessToken: _() }).then(B));
                return (e.rebind(i), i);
              })
                .catch((e) =>
                  logForDebugging(
                    `[attachRemote] could not re-read the session's binding (the event signer keeps what it had): ${errorMessage(e)}`,
                  ),
                )
                .finally(() => {
                  x = !1;
                }));
          },
        }),
        onAuth401: (e) => te(e, n?.credentials, n?.storageV5, h.profile),
        dirSync: Te,
        ...!1,
        ...(G !== void 0 && { sessionRecordMayBeElsewhere: G }),
        ...(X !== "not_looked" && { sessionRecordLookup: X }),
        ...(z && { homeSeed: z, homeSeedHoldsFirstSend: !1 }),
        initialSequenceNum: s?.maxSequenceNum,
        seedNestedUuidAliases: s?.nestedUuidAliases,
        seedReplyChannelToolUseIds: s?.replyChannelToolUseIds,
        seedActiveGoal: s?.lastActiveGoal ?? (s?.complete ? null : void 0),
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
          ...(Y === void 0 ? [] : [xe(Y)]),
          ...[],
        ],
        mcpClients: [],
        remoteSessionConfig: Oe,
        autoConnectIdeFlag: n?.autoConnectIdeFlag,
        disableSlashCommands: n?.disableSlashCommands,
        onDetachToCaller: () => r.unmount(),
        thinkingConfig: { type: "adaptive" },
      },
      async (e, i) => {
        if (k?.overLoading) di().get(process.stdout)?.keepAltScreenForNextScreen();
        showScreen(e, i);
        let winner = await Promise.race([
          e.waitUntilExit().then(() => {
            return;
          }),
          ...(k ? [k.leftForTab.then((p) => ({ screen: p }))] : []),
        ]);
        if (winner !== void 0) {
          (di().get(process.stdout)?.keepAltScreenForNextScreen(),
            showScreen(e, winner.screen, { session: u, storageV5: n?.storageV5 }));
          return;
        }
        await n?.endProcessOnExit?.();
      },
    );
  } finally {
    if (
      ((P = !0),
      abortController.abort(),
      T.end(),
      await y.stop(),
      setIsRemoteMode(l.isRemoteMode),
      setAutoModeActive(l.autoModeActive && isAutoModeGateEnabled()),
      switchSession(l.sessionId, "remote_attach", null, { cwd: l.cwd }),
      !l.isRemoteMode)
    )
      setCaps({ ...getCaps(), remote: l.capsRemote, transcriptSource: l.capsTranscriptSource });
    if ((await Q(), getCurrentLimits() !== l.limits))
      if (getLimitsAccountEpoch() === l.limitsEpoch) restoreLimits(l.limits, l.limitsObserved);
      else resetCurrentLimits();
  }
}
//@ chunk-edjpba11.js:23367-23405 placement
function xe(r) {
  return createSystemMessage(r, "warning");
}

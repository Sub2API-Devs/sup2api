/**
 * services/oauth/postLoginHooks.ts
 *
 * 2.1.316 新增：网关托管设置加载失败原因说明；网关登录后重启 Claude Code（后台会话不能自重启）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrmtstb0.js (24)
 * attribution: placement 24
 */
import { j, y, R } from "../../../vendor/react/cjs/react.production.js";
import { onOrgMemoryAuthCompletion } from "../orgMemory/orgMemoryDecision.js";
import { Jpe } from "../orgMemory/selection.js";
import {
  getGatewayAuth,
  resetCostState,
  getIsRemoteMode,
  getGatewayRefreshInFlight,
  getForkRestrictedLaunchConfig,
  getForkReplayLaunchConfig,
} from "../../bootstrap/state.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import {
  armConsentNeededRelease,
  acquireConsentHandoffHold,
} from "../remoteManagedSettings/securityCheck.js";
import {
  refreshRemoteManagedSettingsWithOutcome,
  refreshRemoteManagedSettings,
  clearRemoteManagedSettingsCache,
} from "../remoteManagedSettings/loader.js";
import { showStandaloneSecurityDialog } from "../../components/ManagedSettingsSecurityDialog/showStandaloneSecurityDialog.js";
import { hasPolicyDiverged } from "../../utils/settings/policySnapshot.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { resetProviderBoundCaches } from "../../utils/model/resetProviderCaches.js";
import { applyConfigEnvironmentVariables } from "../../utils/managedEnvApply.js";
import { relatchTenguSandboxGbConfig } from "../../utils/sandbox/sandbox-adapter.js";
import { refreshPolicyLimits, POLICY_LIMITS_COLD_AWAIT_MS } from "../policyLimits/PolicyLimitsClient.js";
import { shouldRefreshArtifactRoster } from "../artifacts/artifactToolGates.js";
import { refreshArtifactRoster } from "../artifacts/rosterWait.js";
import { resetUserData, refreshGrowthBookAfterAuthChange } from "../analytics/growthbook.js";
import { withTimeout } from "../../utils/sleep.js";
import { dDs } from "../../utils/model/servedModelCatalog.js";
import { logError } from "../../utils/log.js";
import { KV } from "./loginEvents.js";
import { getOauthAccountInfo, sameOwnerAccount, isBareModeAuthRestricted } from "../../utils/auth.js";
import { logForDebugging } from "../../utils/debug.js";
import { removeNotificationByKey } from "../../context/notifications.js";
import { BRIDGE_FAILED } from "../../bridge/bridgeStatusUtil.js";
import { clearOrgMemoryCredential } from "../orgMemory/credential.js";
import {
  clearOrgMemoryDiscoveryCaches,
  clearOrgMemoryDiscoveryAccountState,
} from "../orgMemory/discovery.js";
import { Jyi } from "../liveReplica/liveReplica.js";
import { wqn } from "../../state/artifactReadState.js";
import { Gdi } from "../../utils/planTiers.js";
import { REMOTE_CALLOUT_DIALOG } from "../../components/RemoteCallout.js";
import {
  readStoredTrustedDeviceToken,
  forgetEnrollmentAfterRefusal,
  clearTrustedDeviceToken,
  enrollTrustedDevice,
} from "../../bridge/trustedDevice.js";
import {
  rearmAutoModeGateCheck,
  checkAndDisableAutoModeIfNeeded,
} from "../../utils/permissions/bypassPermissionsKillswitch.js";
import { clearFastRejectedFallbackModels } from "../../utils/fastMode.js";
import { getToolPermissionContext, getSessionEffort } from "../../utils/permissions/toolPermissionContext.js";
import { clearGatewayCredential } from "../gateway/gatewayAuth.js";
import { isTranscriptPersistenceDisabled } from "../../utils/sessionStorage.js";
import { saveResumePoint, relaunchClaudeCode } from "../../utils/processRelaunch.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { yN } from "../../utils/promptSubmissionOrigin.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import {
  listUncarriedLaunchSettings,
  buildRelaunchArgs,
  buildPermissionAndAgentArgs,
  mvt,
} from "../daemon/relaunchArgs.js";
import { getScreenReaderEnv } from "../../utils/accessibility/screenReader.js";
import { toError, errorMessage } from "../../utils/errors.js";
import { getLoginAvailability } from "../../commands/login/loginAvailability.js";
import { createSystemMessage, getLastAssistantMessage } from "../../utils/messages.js";
import { env } from "../../utils/env.js";
import { REMOTE_CONTROL_DISCONNECTED_MSG } from "../../bridge/types.js";
import { getBareModeExitHint } from "../../utils/envUtils.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useMainLoopModel } from "../../hooks/useMainLoopModel.js";
import { useSetAppState } from "../../state/AppState.js";
import { Tl } from "../../components/ScrollViewportContext.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { MANAGED_RELOAD_NOTICES } from "../../components/GatewayLogin.js";
import { useKeybinding, useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { getUserSettingsGateway } from "../gateway/gatewayCredentialStore.js";
import { useApp } from "../../ink/components/Input.js";
import { Text } from "../../ink/components/Text.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { ConsoleOAuthFlow } from "../../components/ConsoleOAuthFlow.js";
import { zR, PANE_PADDING } from "../../components/design-system/Pane.js";
import { Dialog } from "../../components/design-system/Dialog.js";

//@ chunk-vrmtstb0.js:2293-2297 placement
j();
//@ chunk-vrmtstb0.js:2297-2323 placement
function runOrgMemoryAuthBoundary() {
  onOrgMemoryAuthCompletion(Jpe());
}
//@ chunk-vrmtstb0.js:2323-4584 placement
async function runPostLoginHooks(o, a, s) {
  if ((o.onChangeAPIKey(), !a)) return { bridgeDisconnected: !1, accountSwitched: !1, relaunching: !1 };
  let u = getGatewayAuth(),
    c = u !== null && u !== s.previousGatewayAuth;
  if (getAPIProvider() === "gateway") {
    let onConsentNeeded = s.onConsentNeeded,
      P = { release: null },
      J = onConsentNeeded
        ? armConsentNeededRelease(() => ((P.release ??= acquireConsentHandoffHold()), onConsentNeeded()))
        : null;
    try {
      let m;
      try {
        m = await refreshRemoteManagedSettingsWithOutcome(
          showStandaloneSecurityDialog,
          o.storageV5,
          o.credentials,
        );
      } finally {
        J?.();
      }
      let B = getGatewayAuth(),
        M = ye(B);
      if (c && !m.fetchSucceeded && m.failure?.errorKind === "gateway_cert_mismatch")
        return await finishGatewayLoginFailure(
          o,
          B,
          formatGatewayPinMismatchError(M, m.failure.gatewayPinMismatch),
        );
      if (!m.fetchSucceeded || hasPolicyDiverged()) {
        let U = m.fetchSucceeded ? void 0 : m.failure;
        return (
          await restartAfterGatewayLogin(o, formatGatewayRestartNotice(M, U, c), (h) =>
            formatGatewayExitNotice(M, U, h, c),
          ),
          H
        );
      }
      if (isTerminalShutdown()) return H;
      (resetProviderBoundCaches("gateway"), applyConfigEnvironmentVariables(), relatchTenguSandboxGbConfig());
    } finally {
      if (!isTerminalShutdown()) P.release?.();
    }
  } else refreshRemoteManagedSettings(showStandaloneSecurityDialog, o.storageV5, o.credentials);
  resetCostState();
  let p = refreshPolicyLimits().catch(() => {});
  (p
    .then(() => {
      if (shouldRefreshArtifactRoster())
        refreshArtifactRoster({ credentials: o.credentials, storageV5: o.storageV5, timeoutMs: 5000 });
    })
    .catch(() => {}),
    resetUserData(),
    refreshGrowthBookAfterAuthChange(),
    withTimeout(p, POLICY_LIMITS_COLD_AWAIT_MS, "post-login policy limits refresh")
      .catch(() => {})
      .then(() => dDs())
      .then(() => {})
      .catch((f) => logError(f)));
  let { setAppState: setAppState } = s,
    of = KV.of(o.session),
    C = () => of.credentialsPersisted(),
    previousAccount = s.previousAccount,
    E = getOauthAccountInfo(),
    A = sameOwnerAccount(previousAccount, E),
    { replBridgeEnabled: replBridgeEnabled, replBridgeOutboundOnly: replBridgeOutboundOnly } =
      o.getAppState(),
    v = previousAccount?.accountUuid !== void 0 && !A,
    G = v && replBridgeEnabled && !replBridgeOutboundOnly;
  if (v)
    setAppState((f) => {
      if (!(f.replBridgeEnabled || f.replBridgeError !== void 0)) return f;
      return (
        logForDebugging(
          "[bridge:repl] Account changed via /login \u2014 disconnecting Remote Control session",
        ),
        {
          ...f,
          replBridgeEnabled: !1,
          replBridgeExplicit: !1,
          replBridgeOutboundOnly: !1,
          replBridgeError: void 0,
          replBridgeErrorKind: void 0,
          notifications: removeNotificationByKey(f.notifications, BRIDGE_FAILED),
        }
      );
    });
  if ((clearOrgMemoryCredential(), clearOrgMemoryDiscoveryCaches(), Jyi(E), s.setAppState(wqn), v))
    if (
      (clearOrgMemoryDiscoveryAccountState(),
      s.setAppState((f) => ({
        ...f,
        replBridgeSessionGroupingId: void 0,
        replBridgeInitialName: void 0,
        ultrareviewOverageConfirmed: !1,
      })),
      Gdi(),
      o.dialogStore)
    )
      o.dialogStore.dismissKind(REMOTE_CALLOUT_DIALOG.kind);
    else
      logError(
        Error(
          "runPostLoginHooks: no dialog store to dismiss a pending Remote Control callout on account switch",
        ),
      );
  if (A && (await readStoredTrustedDeviceToken()))
    (logForDebugging(
      "[trusted-device] Same account+org re-login with existing token, skipping re-enrollment",
    ),
      await forgetEnrollmentAfterRefusal(),
      C());
  else {
    clearTrustedDeviceToken();
    let f = enrollTrustedDevice({ credentials: o.credentials }).then(C, C);
    if (s.awaitEnrollment) await f;
  }
  let { host: host } = o.session,
    appState = o.getAppState();
  if ((rearmAutoModeGateCheck(host), clearFastRejectedFallbackModels(), !getIsRemoteMode()))
    checkAndDisableAutoModeIfNeeded(host, getToolPermissionContext(o), setAppState, appState.fastMode);
  return (
    runOrgMemoryAuthBoundary(),
    of.loginCompleted(),
    { bridgeDisconnected: G, accountSwitched: v, relaunching: !1 }
  );
}
//@ chunk-vrmtstb0.js:4584-4594 placement
var he = 16;
//@ chunk-vrmtstb0.js:4594-4640 placement
function te(o) {
  return `${o.slice(0, he)}\u2026`;
}
//@ chunk-vrmtstb0.js:4640-4734 placement
function ye(o) {
  try {
    return o ? new URL(o.url).hostname : "gateway";
  } catch {
    return o?.url ?? "gateway";
  }
}
//@ chunk-vrmtstb0.js:4734-4798 placement
var H = { bridgeDisconnected: !1, accountSwitched: !1, relaunching: !0 };
/**
 * 网关登录失败后的收尾（清除凭据、恢复会话）。
 */
//@ chunk-vrmtstb0.js:4798-5306 placement
async function finishGatewayLoginFailure(o, a, s) {
  for (let p = getGatewayRefreshInFlight(); p; p = getGatewayRefreshInFlight()) await p.catch(() => {});
  let u = getGatewayAuth();
  if (
    (await clearGatewayCredential(u && a && u.url === a.url ? u : a, o.credentials),
    await clearRemoteManagedSettingsCache(o.storageV5),
    isTerminalShutdown())
  )
    return { ...H, gatewayLoginError: s };
  let c = !isTranscriptPersistenceDisabled();
  if (c) await saveResumePoint(o.messages, o.storageV5);
  return (
    await gracefulShutdown(0, "other", {
      finalMessage: `${s}
This session is ending so that nothing from that gateway stays half-applied. Start claude again${c ? " to continue (your conversation can be resumed)" : ""} and sign in once that is fixed.`,
    }),
    { ...H, gatewayLoginError: s }
  );
}
//@ chunk-vrmtstb0.js:5306-5871 placement
function formatGatewayPinMismatchError(o, a) {
  let s =
    a?.presentedFingerprint && a.pinnedFingerprint
      ? `TLS certificate ${te(a.presentedFingerprint)} instead of the one you trusted (${te(a.pinnedFingerprint)})`
      : "a different TLS certificate from the one you trusted";
  return `Cloud gateway sign-in was not completed: on the first request after sign-in, ${o} presented ${s}. No gateway credentials were kept. Usually this means the gateway runs several nodes behind one address that serve different certificates (they must all serve the same one), or something on the network path is intercepting TLS.`;
}
/**
 * 网关托管设置加载失败原因说明。
 */
//@ chunk-vrmtstb0.js:5871-7369 placement
function describeGatewaySettingsError(o, a) {
  switch (o.errorKind) {
    case "timeout":
      return "the request timed out";
    case "network_error":
      return "couldn't connect to the gateway";
    case "http_401":
    case "api_key_not_sent":
      return a
        ? "the gateway did not accept the new credential"
        : "the gateway did not accept this session's credential";
    case "http_403":
      return "the gateway refused them for this account: Claude Code may not be enabled for your organization; contact your administrator";
    case "no_auth_available":
      return "no credential was on hand for the request";
    case "profile_credential_error":
      return "the profile credential could not authenticate the request (details with --debug)";
    case "http_4xx":
    case "http_5xx":
      return o.httpStatus === void 0
        ? "the gateway answered with an unexpected status"
        : `the gateway answered HTTP ${o.httpStatus}`;
    case "parse_error":
      return "the gateway's response was not valid managed settings";
    case "ruled_empty":
      return "no setting in the gateway's response could be applied as written";
    case "gateway_cert_mismatch":
      return "the gateway's TLS certificate did not match the one you trusted";
    case "gateway_public_address":
      return "the gateway's name resolved to a public address, so the request was not sent";
    case "gateway_pin_refused":
      return "the credentials file that keeps the gateway's TLS pin is a symlink, which is not followed";
    case "gateway_pin_unreadable":
      return "the credentials file that keeps the gateway's TLS pin could not be read (try again)";
    case "unknown_error":
      return "something unexpected went wrong (details with --debug)";
  }
}
/**
 * 网关登录后设置加载失败的提示。
 */
//@ chunk-vrmtstb0.js:7369-7712 placement
function gatewaySettingsErrorMessage(o, a, s) {
  if (a) {
    let u = describeGatewaySettingsError(a, s);
    return s
      ? `Signed in to Cloud gateway ${o}, but couldn't load your organization's managed settings (${u})`
      : `Couldn't reload your organization's managed settings from Cloud gateway ${o} (${u})`;
  }
  return s
    ? `Signed in to Cloud gateway ${o}`
    : `Your organization's managed settings on Cloud gateway ${o} changed`;
}
//@ chunk-vrmtstb0.js:7712-7979 placement
function formatGatewayRestartNotice(o, a, s, u = !isTranscriptPersistenceDisabled()) {
  let c = u ? "\u2026" : " (this conversation is not saved, so it starts fresh)\u2026",
    p = gatewaySettingsErrorMessage(o, a, s);
  return a
    ? `${p}. Restarting Claude Code to retry${c}`
    : `${p}. Restarting Claude Code to apply ${s ? "your organization's managed settings" : "them"}${c}`;
}
//@ chunk-vrmtstb0.js:7979-8323 placement
function formatGatewayExitNotice(o, a, s, u, c = !isTranscriptPersistenceDisabled()) {
  return `${gatewaySettingsErrorMessage(o, a, u)}. ${a ? "Claude Code has to restart to retry" : `Claude Code has to restart to apply ${u ? "your organization's managed settings" : "them"}`}, and ${s}, so this session is ending instead. Your sign-in is saved: start claude again the same way${c ? " (add --continue to return to this conversation)" : ""}.`;
}
/**
 * 网关登录后重启 Claude Code（后台会话不能自重启）。
 */
//@ chunk-vrmtstb0.js:8323-9046 placement
async function restartAfterGatewayLogin(o, a, s) {
  if (isTerminalShutdown()) return;
  let u = (_) => gracefulShutdown(0, "other", { finalMessage: s(_) });
  if ((await saveResumePoint(yN(o), o.storageV5), isTerminalShutdown())) return;
  if (isBgSession())
    return u(
      "a background session cannot restart itself (sign in from a session started directly with `claude`)",
    );
  let c = getToolPermissionContext(o),
    p = listUncarriedLaunchSettings(c, getForkRestrictedLaunchConfig());
  if (p.length > 0) return u(`this session has restrictions a restart can't carry over (${p.join("; ")})`);
  let g = { proactivityLevel: o.getProactivityLevel(), toolPermissionContext: c };
  try {
    await relaunchClaudeCode(
      {
        freshIfNoTranscript: !0,
        extraArgs: [
          ...buildRelaunchArgs(c, getSessionEffort(o)),
          ...buildPermissionAndAgentArgs(c, getForkReplayLaunchConfig()),
        ],
        proactivity: g,
        env: { ...getScreenReaderEnv(), ...mvt(c.additionalWorkingDirectories) },
        preSpawn: () =>
          process.stdout.write(`
${a}
`),
      },
      o.storageV5,
    );
  } catch (error) {
    return (logError(toError(error)), u(`it could not restart itself (${errorMessage(error)})`));
  }
}
//@ chunk-vrmtstb0.js:9046-9588 placement
function loginCompletion(o, a, s, { envTokenWasSet: u = !1, envWarningOnce: c } = {}) {
  if (s.gatewayLoginError !== void 0 || s.relaunching) return [s.gatewayLoginError];
  let p = a ? void 0 : getLoginAvailability();
  if (p?.kind === "refused") return [p.notice, { display: "system" }];
  let g = a ? loginAutoContinueOptions(o, s) : void 0,
    _ = envTokenWarningRoute({
      envTokenWasSet: u,
      gatewayActive: getAPIProvider() === "gateway",
      willAutoQuery: g?.shouldQuery === !0,
    });
  if (_ === "out-of-band" && c && !c.delivered)
    ((c.delivered = !0),
      o.applyMessageOp({
        type: "append",
        messages: [createSystemMessage(LOGIN_SUCCESS_ENV_OVERRIDE_WARNING, "notice")],
      }));
  return [
    buildLoginDoneMessage(a, {
      bridgeDisconnected: s.bridgeDisconnected,
      includeEnvTokenWarning: _ === "inline",
    }),
    g,
  ];
}
//@ chunk-vrmtstb0.js:9588-9776 placement = launchAndDone (0.376)
function loginAutoContinueOptions(o, a) {
  if (a.accountSwitched || a.relaunching) return;
  let s = getLastAssistantMessage(o.messages);
  if (s?.isApiErrorMessage && s.error === "authentication_failed")
    return { display: "system", shouldQuery: !0 };
  return;
}
//@ chunk-vrmtstb0.js:9776-9946 placement
var OLD_TOKEN_ENV_WARNING =
  "but if that variable is set in your shell profile or a Claude Code settings file, new `claude` sessions will keep using the old token until you remove it there.";
//@ chunk-vrmtstb0.js:9946-10037 placement
function getLoginConsentHandoffMessage() {
  return "Signed in. Review your organization's managed settings to continue.";
}
//@ chunk-vrmtstb0.js:10037-10228 placement
function getLoginStartingMessage() {
  return env.CLAUDE_CODE_OAUTH_TOKEN
    ? `Warning: CLAUDE_CODE_OAUTH_TOKEN is set in your environment. This session will switch to your new credentials after logging in, ${OLD_TOKEN_ENV_WARNING}`
    : void 0;
}
//@ chunk-vrmtstb0.js:10228-10367 placement
var LOGIN_SUCCESS_ENV_OVERRIDE_WARNING = `Note: CLAUDE_CODE_OAUTH_TOKEN was set in your environment when /login started. This session will use your new credentials, ${OLD_TOKEN_ENV_WARNING}`;
//@ chunk-vrmtstb0.js:10367-10480 placement
function envTokenWarningRoute(o) {
  if (!o.envTokenWasSet || o.gatewayActive) return "none";
  return o.willAutoQuery ? "out-of-band" : "inline";
}
//@ chunk-vrmtstb0.js:10480-10652 placement = call (0.512)
function buildLoginDoneMessage(onDone, context) {
  if (!onDone) return "Login interrupted";
  let s = context.bridgeDisconnected
    ? `Login successful. ${REMOTE_CONTROL_DISCONNECTED_MSG}`
    : "Login successful";
  return context.includeEnvTokenWarning
    ? `${s}

${LOGIN_SUCCESS_ENV_OVERRIDE_WARNING}`
    : s;
}
//@ chunk-vrmtstb0.js:10652-11396 placement
async function call(onDone, context) {
  if (getAPIProvider() === "firstParty" && isBareModeAuthRestricted())
    return (
      onDone(
        `Bare mode doesn't use the sign-in from /login. It reads ANTHROPIC_API_KEY or an apiKeyHelper from --settings: set or change one and restart, or ${getBareModeExitHint()} to sign in.`,
        { display: "system" },
      ),
      null
    );
  let s = getLoginStartingMessage(),
    u = s !== void 0,
    c = getOauthAccountInfo(),
    p = c && { accountUuid: c.accountUuid, organizationUuid: c.organizationUuid },
    g = getGatewayAuth(),
    _ = { delivered: !1 };
  return e(Login, {
    startingMessage: s,
    onDone: async (C, b, E) => {
      let A = !1,
        D = await runPostLoginHooks(context, C, {
          setAppState: E,
          previousAccount: p,
          previousGatewayAuth: g,
          onConsentNeeded: () => (
            (A = !0),
            onDone(getLoginConsentHandoffMessage(), { display: "system" }),
            yieldToEventLoop()
          ),
        }),
        O = loginCompletion(context, C, D, { envTokenWasSet: u, envWarningOnce: _ });
      if (A) {
        let [v] = O;
        if (v) context.applyMessageOp({ type: "append", messages: [createSystemMessage(v, "notice")] });
        return;
      }
      onDone(...O);
    },
    onHybridSignIn: void 0,
  });
}
//@ chunk-vrmtstb0.js:11396-13635 placement = Login (0.296)
function Login(props) {
  let g = w(38),
    mainLoopModel = useMainLoopModel(),
    s = useSetAppState(),
    u = Tl(),
    [c, p] = y(!1),
    _;
  if (g[0] === MEMO_CACHE_SENTINEL) ((_ = () => p(!0)), (g[0] = _));
  else _ = g[0];
  let C = _,
    { storageV5: storageV5, credentials: credentials } = Me(),
    { onOrgDocumentsReload: onOrgDocumentsReload } = props,
    D;
  if (g[1] !== credentials || g[2] !== onOrgDocumentsReload || g[3] !== storageV5)
    ((D = (O) => {
      if (onOrgDocumentsReload) onOrgDocumentsReload(O);
      else if (O === "previous") MANAGED_RELOAD_NOTICES({ storageV5: storageV5, credentials: credentials });
    }),
      (g[1] = credentials),
      (g[2] = onOrgDocumentsReload),
      (g[3] = storageV5),
      (g[4] = D));
  else D = g[4];
  let v = D,
    G = R(!1),
    k = R(null),
    [x, f] = y(!1),
    P;
  if (g[5] !== mainLoopModel || g[6] !== props || g[7] !== s)
    ((P = (J) => {
      if (G.current) {
        return;
      }
      if (((G.current = !0), f(!0), k.current !== null && props.onHybridSignIn)) {
        props.onHybridSignIn(k.current);
        return;
      }
      props.onDone(J, mainLoopModel, s);
    }),
      (g[5] = mainLoopModel),
      (g[6] = props),
      (g[7] = s),
      (g[8] = P));
  else P = g[8];
  let m = P,
    B;
  if (g[9] !== c || g[10] !== m) ((B = () => m(c)), (g[9] = c), (g[10] = m), (g[11] = B));
  else B = g[11];
  let M = B,
    U;
  if (g[12] === MEMO_CACHE_SENTINEL) ((U = { context: "Settings" }), (g[12] = U));
  else U = g[12];
  useKeybinding("confirm:no", M, U);
  let [h] = y(getLoginAvailability),
    pe;
  if (g[13] !== h.kind)
    ((pe = () => h.kind === "any-method" && getUserSettingsGateway() !== void 0),
      (g[13] = h.kind),
      (g[14] = pe));
  else pe = g[14];
  let [Fe] = y(pe),
    { exit: exit } = useApp(),
    [F, Ge] = y(h.kind === "refused"),
    fe;
  if (g[15] !== exit || g[16] !== m || g[17] !== F)
    ((fe = () => {
      if (F && !G.current) {
        m(!1);
        return;
      }
      exit();
    }),
      (g[15] = exit),
      (g[16] = m),
      (g[17] = F),
      (g[18] = fe));
  else fe = g[18];
  let L = useGlobalExitKeybindings(fe);
  const ee = (c || Fe) && !L.pending;
  let K;
  if (g[19] !== x || g[20] !== L.keyName || g[21] !== L.pending || g[22] !== F || g[23] !== h.kind)
    ((K = L.pending
      ? r(Text, { children: ["Press ", L.keyName, " again to", " ", F && !x ? "cancel" : "exit"] })
      : e(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Settings",
          fallback: "Esc",
          description: h.kind === "refused" ? "close" : "cancel",
        })),
      (g[19] = x),
      (g[20] = L.keyName),
      (g[21] = L.pending),
      (g[22] = F),
      (g[23] = h.kind),
      (g[24] = K));
  else K = g[24];
  let z;
  if (
    g[25] !== m ||
    g[26] !== v ||
    g[27] !== u ||
    g[28] !== props.onHybridSignIn ||
    g[29] !== props.startingMessage ||
    g[30] !== h.kind ||
    g[31] !== h.notice
  )
    ((z =
      h.kind === "refused"
        ? e(Text, { children: h.notice })
        : e(ConsoleOAuthFlow, {
            onDone: () => m(!0),
            onAuthSuccess: C,
            onOrgDocumentsReload: v,
            onHybridSignIn:
              props.onHybridSignIn &&
              ((xe) => {
                ((k.current = xe), C());
              }),
            onFreshPickerChange: Ge,
            startingMessage: props.startingMessage,
            forceLoginMethod: h.kind === "claudeai-only" ? "claudeai" : void 0,
            urlOutdent: u ? zR : PANE_PADDING,
          })),
      (g[25] = m),
      (g[26] = v),
      (g[27] = u),
      (g[28] = props.onHybridSignIn),
      (g[29] = props.startingMessage),
      (g[30] = h.kind),
      (g[31] = h.notice),
      (g[32] = z));
  else z = g[32];
  let me;
  if (g[33] !== M || g[34] !== ee || g[35] !== K || g[36] !== z)
    ((me = e(Dialog, {
      title: "Login",
      onCancel: M,
      color: "permission",
      isCancelActive: !1,
      hideInputGuide: ee,
      inputGuide: K,
      children: z,
    })),
      (g[33] = M),
      (g[34] = ee),
      (g[35] = K),
      (g[36] = z),
      (g[37] = me));
  else me = g[37];
  return me;
}

export { Login, runPostLoginHooks, loginCompletion };

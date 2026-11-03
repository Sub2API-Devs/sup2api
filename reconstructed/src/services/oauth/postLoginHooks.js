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
import { init_react_production, y, R } from "../../../vendor/react/cjs/react.production.js";
import { onOrgMemoryAuthCompletion } from "../orgMemory/orgMemoryDecision.js";
import { selectionAccountKey } from "../orgMemory/selection.js";
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
import { noopServedCatalogHook } from "../../utils/model/servedModelCatalog.js";
import { logError } from "../../utils/log.js";
import { loginEventCounter } from "./loginEvents.js";
import { getOauthAccountInfo, sameOwnerAccount, isBareModeAuthRestricted } from "../../utils/auth.js";
import { logForDebugging } from "../../utils/debug.js";
import { removeNotificationByKey } from "../../context/notifications.js";
import { BRIDGE_FAILED } from "../../bridge/bridgeStatusUtil.js";
import { clearOrgMemoryCredential } from "../orgMemory/credential.js";
import {
  clearOrgMemoryDiscoveryCaches,
  clearOrgMemoryDiscoveryAccountState,
} from "../orgMemory/discovery.js";
import { notifyRoomAccountChanged } from "../liveReplica/liveReplica.js";
import { resetSliceIfUnchanged } from "../../state/artifactReadState.js";
import { clearSessionConsentKeys } from "../../utils/planTiers.js";
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
import { submittedMessages } from "../../utils/promptSubmissionOrigin.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import {
  listUncarriedLaunchSettings,
  buildRelaunchArgs,
  buildPermissionAndAgentArgs,
  sessionAddDirsEnv,
} from "../daemon/relaunchArgs.js";
import { getScreenReaderEnv } from "../../utils/accessibility/screenReader.js";
import { toError, errorMessage } from "../../utils/errors.js";
import { getLoginAvailability } from "../../commands/login/loginAvailability.js";
import { createSystemMessage, getLastAssistantMessage } from "../../utils/messages.js";
import { env } from "../../utils/env.js";
import { REMOTE_CONTROL_DISCONNECTED_MSG } from "../../bridge/types.js";
import { getBareModeExitHint } from "../../utils/envUtils.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useMainLoopModel } from "../../hooks/useMainLoopModel.js";
import { useSetAppState } from "../../state/AppState.js";
import { useHasScrollViewport } from "../../components/ScrollViewportContext.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { MANAGED_RELOAD_NOTICES } from "../../components/GatewayLogin.js";
import { useKeybinding, useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { getUserSettingsGateway } from "../gateway/gatewayCredentialStore.js";
import { useApp } from "../../ink/components/Input.js";
import { Text } from "../../ink/components/Text.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { ConsoleOAuthFlow } from "../../components/ConsoleOAuthFlow.js";
import { PANE_PADDING_X, PANE_PADDING } from "../../components/design-system/Pane.js";
import { Dialog } from "../../components/design-system/Dialog.js";

//@ chunk-vrmtstb0.js:2293-2297 placement
init_react_production();
//@ chunk-vrmtstb0.js:2297-2323 placement
function runOrgMemoryAuthBoundary() {
  onOrgMemoryAuthCompletion(selectionAccountKey());
}
//@ chunk-vrmtstb0.js:2323-4584 placement
async function runPostLoginHooks(context, a, s) {
  context.onChangeAPIKey();
  if (!a)
    return {
      bridgeDisconnected: false,
      accountSwitched: false,
      relaunching: false,
    };
  let gatewayAuth = getGatewayAuth();
  let c = gatewayAuth !== null && gatewayAuth !== s.previousGatewayAuth;
  if (getAPIProvider() === "gateway") {
    let onConsentNeeded = s.onConsentNeeded;
    let P = {
      release: null,
    };
    let J = onConsentNeeded
      ? armConsentNeededRelease(() => {
          P.release ??= acquireConsentHandoffHold();
          return onConsentNeeded();
        })
      : null;
    try {
      let m;
      try {
        m = await refreshRemoteManagedSettingsWithOutcome(
          showStandaloneSecurityDialog,
          context.storageV5,
          context.credentials,
        );
      } finally {
        J?.();
      }
      let gatewayAuth = getGatewayAuth();
      let M = gatewayLabel(gatewayAuth);
      if (c && !m.fetchSucceeded && m.failure?.errorKind === "gateway_cert_mismatch")
        return await finishGatewayLoginFailure(
          context,
          gatewayAuth,
          formatGatewayPinMismatchError(M, m.failure.gatewayPinMismatch),
        );
      if (!m.fetchSucceeded || hasPolicyDiverged()) {
        let failure = m.fetchSucceeded ? undefined : m.failure;
        await restartAfterGatewayLogin(context, formatGatewayRestartNotice(M, failure, c), (h) =>
          formatGatewayExitNotice(M, failure, h, c),
        );
        return POST_LOGIN_SHUTDOWN_STATE;
      }
      if (isTerminalShutdown()) return POST_LOGIN_SHUTDOWN_STATE;
      resetProviderBoundCaches("gateway");
      applyConfigEnvironmentVariables();
      relatchTenguSandboxGbConfig();
    } finally {
      if (!isTerminalShutdown()) P.release?.();
    }
  } else refreshRemoteManagedSettings(showStandaloneSecurityDialog, context.storageV5, context.credentials);
  resetCostState();
  let p = refreshPolicyLimits().catch(() => {});
  p.then(() => {
    if (shouldRefreshArtifactRoster())
      refreshArtifactRoster({
        credentials: context.credentials,
        storageV5: context.storageV5,
        timeoutMs: 5000,
      });
  }).catch(() => {});
  resetUserData();
  refreshGrowthBookAfterAuthChange();
  withTimeout(p, POLICY_LIMITS_COLD_AWAIT_MS, "post-login policy limits refresh")
    .catch(() => {})
    .then(() => noopServedCatalogHook())
    .then(() => {})
    .catch((error) => logError(error));
  let { setAppState } = s;
  let _ = loginEventCounter.of(context.session);
  let C = () => _.credentialsPersisted();
  let previousAccount = s.previousAccount;
  let oauthAccountInfo = getOauthAccountInfo();
  let A = sameOwnerAccount(previousAccount, oauthAccountInfo);
  let { replBridgeEnabled, replBridgeOutboundOnly } = context.getAppState();
  let v = previousAccount?.accountUuid !== undefined && !A;
  let bridgeDisconnected = v && replBridgeEnabled && !replBridgeOutboundOnly;
  if (v)
    setAppState((f) => {
      if (!(f.replBridgeEnabled || f.replBridgeError !== undefined)) return f;
      logForDebugging("[bridge:repl] Account changed via /login \u2014 disconnecting Remote Control session");
      return {
        ...f,
        replBridgeEnabled: false,
        replBridgeExplicit: false,
        replBridgeOutboundOnly: false,
        replBridgeError: undefined,
        replBridgeErrorKind: undefined,
        notifications: removeNotificationByKey(f.notifications, BRIDGE_FAILED),
      };
    });
  clearOrgMemoryCredential();
  clearOrgMemoryDiscoveryCaches();
  notifyRoomAccountChanged(oauthAccountInfo);
  s.setAppState(resetSliceIfUnchanged);
  if (v) {
    clearOrgMemoryDiscoveryAccountState();
    s.setAppState((f) => ({
      ...f,
      replBridgeSessionGroupingId: undefined,
      replBridgeInitialName: undefined,
      ultrareviewOverageConfirmed: false,
    }));
    clearSessionConsentKeys();
    if (context.dialogStore) context.dialogStore.dismissKind(REMOTE_CALLOUT_DIALOG.kind);
    else
      logError(
        Error(
          "runPostLoginHooks: no dialog store to dismiss a pending Remote Control callout on account switch",
        ),
      );
  }
  if (A && (await readStoredTrustedDeviceToken())) {
    logForDebugging("[trusted-device] Same account+org re-login with existing token, skipping re-enrollment");
    await forgetEnrollmentAfterRefusal();
    C();
  } else {
    clearTrustedDeviceToken();
    let f = enrollTrustedDevice({
      credentials: context.credentials,
    }).then(C, C);
    if (s.awaitEnrollment) await f;
  }
  let { host } = context.session;
  let appState = context.getAppState();
  rearmAutoModeGateCheck(host);
  clearFastRejectedFallbackModels();
  if (!getIsRemoteMode())
    checkAndDisableAutoModeIfNeeded(host, getToolPermissionContext(context), setAppState, appState.fastMode);
  runOrgMemoryAuthBoundary();
  _.loginCompleted();
  return {
    bridgeDisconnected,
    accountSwitched: v,
    relaunching: false,
  };
}
//@ chunk-vrmtstb0.js:4584-4594 placement
/**
 * 指纹展示保留的字符数（16）。
 */
var FINGERPRINT_PREFIX_CHARS = 16;
//@ chunk-vrmtstb0.js:4594-4640 placement
/**
 * 截短指纹用于展示。
 */
function shortFingerprint(o) {
  return `${o.slice(0, FINGERPRINT_PREFIX_CHARS)}\u2026`;
}
//@ chunk-vrmtstb0.js:4640-4734 placement
/**
 * 取网关的主机名（无效时用 "gateway"）。
 */
function gatewayLabel(gatewayAuth) {
  try {
    return gatewayAuth ? new URL(gatewayAuth.url).hostname : "gateway";
  } catch {
    return gatewayAuth?.url ?? "gateway";
  }
}
//@ chunk-vrmtstb0.js:4734-4798 placement
/**
 * 终端关闭时的统一收尾状态。
 */
var POST_LOGIN_SHUTDOWN_STATE = {
  bridgeDisconnected: false,
  accountSwitched: false,
  relaunching: true,
};
//@ chunk-vrmtstb0.js:4798-5306 placement
/**
 * 网关登录失败后的收尾（清除凭据、恢复会话）。
 */
async function finishGatewayLoginFailure(o, gatewayAuth, s) {
  for (
    let gatewayRefreshInFlight = getGatewayRefreshInFlight();
    gatewayRefreshInFlight;
    gatewayRefreshInFlight = getGatewayRefreshInFlight()
  )
    await gatewayRefreshInFlight.catch(() => {});
  let gatewayAuth_2 = getGatewayAuth();
  await clearGatewayCredential(
    gatewayAuth_2 && gatewayAuth && gatewayAuth_2.url === gatewayAuth.url ? gatewayAuth_2 : gatewayAuth,
    o.credentials,
  );
  await clearRemoteManagedSettingsCache(o.storageV5);
  if (isTerminalShutdown())
    return {
      ...POST_LOGIN_SHUTDOWN_STATE,
      gatewayLoginError: s,
    };
  let c = !isTranscriptPersistenceDisabled();
  if (c) await saveResumePoint(o.messages, o.storageV5);
  await gracefulShutdown(0, "other", {
    finalMessage: `${s}
This session is ending so that nothing from that gateway stays half-applied. Start claude again${c ? " to continue (your conversation can be resumed)" : ""} and sign in once that is fixed.`,
  });
  return {
    ...POST_LOGIN_SHUTDOWN_STATE,
    gatewayLoginError: s,
  };
}
//@ chunk-vrmtstb0.js:5306-5871 placement
function formatGatewayPinMismatchError(o, gatewayPinMismatch) {
  let s =
    gatewayPinMismatch?.presentedFingerprint && gatewayPinMismatch.pinnedFingerprint
      ? `TLS certificate ${shortFingerprint(gatewayPinMismatch.presentedFingerprint)} instead of the one you trusted (${shortFingerprint(gatewayPinMismatch.pinnedFingerprint)})`
      : "a different TLS certificate from the one you trusted";
  return `Cloud gateway sign-in was not completed: on the first request after sign-in, ${o} presented ${s}. No gateway credentials were kept. Usually this means the gateway runs several nodes behind one address that serve different certificates (they must all serve the same one), or something on the network path is intercepting TLS.`;
}
//@ chunk-vrmtstb0.js:5871-7369 placement
/**
 * 网关托管设置加载失败原因说明。
 */
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
      return o.httpStatus === undefined
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
//@ chunk-vrmtstb0.js:7369-7712 placement
/**
 * 网关登录后设置加载失败的提示。
 */
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
function formatGatewayRestartNotice(o, failure, s, u = !isTranscriptPersistenceDisabled()) {
  let c = u ? "\u2026" : " (this conversation is not saved, so it starts fresh)\u2026";
  let p = gatewaySettingsErrorMessage(o, failure, s);
  return failure
    ? `${p}. Restarting Claude Code to retry${c}`
    : `${p}. Restarting Claude Code to apply ${s ? "your organization's managed settings" : "them"}${c}`;
}
//@ chunk-vrmtstb0.js:7979-8323 placement
function formatGatewayExitNotice(o, failure, s, u, c = !isTranscriptPersistenceDisabled()) {
  return `${gatewaySettingsErrorMessage(o, failure, u)}. ${failure ? "Claude Code has to restart to retry" : `Claude Code has to restart to apply ${u ? "your organization's managed settings" : "them"}`}, and ${s}, so this session is ending instead. Your sign-in is saved: start claude again the same way${c ? " (add --continue to return to this conversation)" : ""}.`;
}
//@ chunk-vrmtstb0.js:8323-9046 placement
/**
 * 网关登录后重启 Claude Code（后台会话不能自重启）。
 */
async function restartAfterGatewayLogin(o, a, s) {
  if (isTerminalShutdown()) return;
  let u = (_) =>
    gracefulShutdown(0, "other", {
      finalMessage: s(_),
    });
  await saveResumePoint(submittedMessages(o), o.storageV5);
  if (isTerminalShutdown()) return;
  if (isBgSession())
    return u(
      "a background session cannot restart itself (sign in from a session started directly with `claude`)",
    );
  let toolPermissionContext = getToolPermissionContext(o);
  let p = listUncarriedLaunchSettings(toolPermissionContext, getForkRestrictedLaunchConfig());
  if (p.length > 0) return u(`this session has restrictions a restart can't carry over (${p.join("; ")})`);
  let proactivity = {
    proactivityLevel: o.getProactivityLevel(),
    toolPermissionContext,
  };
  try {
    await relaunchClaudeCode(
      {
        freshIfNoTranscript: true,
        extraArgs: [
          ...buildRelaunchArgs(toolPermissionContext, getSessionEffort(o)),
          ...buildPermissionAndAgentArgs(toolPermissionContext, getForkReplayLaunchConfig()),
        ],
        proactivity,
        env: {
          ...getScreenReaderEnv(),
          ...sessionAddDirsEnv(toolPermissionContext.additionalWorkingDirectories),
        },
        preSpawn: () =>
          process.stdout.write(`
${a}
`),
      },
      o.storageV5,
    );
  } catch (error) {
    logError(toError(error));
    return u(`it could not restart itself (${errorMessage(error)})`);
  }
}
//@ chunk-vrmtstb0.js:9046-9588 placement
function loginCompletion(context, onDone, s, { envTokenWasSet: u = false, envWarningOnce: c } = {}) {
  if (s.gatewayLoginError !== undefined || s.relaunching) return [s.gatewayLoginError];
  let p = onDone ? undefined : getLoginAvailability();
  if (p?.kind === "refused")
    return [
      p.notice,
      {
        display: "system",
      },
    ];
  let g = onDone ? loginAutoContinueOptions(context, s) : undefined;
  let _ = envTokenWarningRoute({
    envTokenWasSet: u,
    gatewayActive: getAPIProvider() === "gateway",
    willAutoQuery: g?.shouldQuery === true,
  });
  if (_ === "out-of-band" && c && !c.delivered) {
    c.delivered = true;
    context.applyMessageOp({
      type: "append",
      messages: [createSystemMessage(LOGIN_SUCCESS_ENV_OVERRIDE_WARNING, "notice")],
    });
  }
  return [
    buildLoginDoneMessage(onDone, {
      bridgeDisconnected: s.bridgeDisconnected,
      includeEnvTokenWarning: _ === "inline",
    }),
    g,
  ];
}
//@ chunk-vrmtstb0.js:9588-9776 placement = launchAndDone (0.376)
function loginAutoContinueOptions(o, a) {
  if (a.accountSwitched || a.relaunching) return;
  let lastAssistantMessage = getLastAssistantMessage(o.messages);
  if (lastAssistantMessage?.isApiErrorMessage && lastAssistantMessage.error === "authentication_failed")
    return {
      display: "system",
      shouldQuery: true,
    };
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
    : undefined;
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
  if (getAPIProvider() === "firstParty" && isBareModeAuthRestricted()) {
    onDone(
      `Bare mode doesn't use the sign-in from /login. It reads ANTHROPIC_API_KEY or an apiKeyHelper from --settings: set or change one and restart, or ${getBareModeExitHint()} to sign in.`,
      {
        display: "system",
      },
    );
    return null;
  }
  let loginStartingMessage = getLoginStartingMessage();
  let envTokenWasSet = loginStartingMessage !== undefined;
  let oauthAccountInfo = getOauthAccountInfo();
  let previousAccount = oauthAccountInfo && {
    accountUuid: oauthAccountInfo.accountUuid,
    organizationUuid: oauthAccountInfo.organizationUuid,
  };
  let previousGatewayAuth = getGatewayAuth();
  let envWarningOnce = {
    delivered: false,
  };
  return jsxProd_default(Login, {
    startingMessage: loginStartingMessage,
    onDone: async (C, b, setAppState) => {
      let A = false;
      let D = await runPostLoginHooks(context, C, {
        setAppState,
        previousAccount,
        previousGatewayAuth,
        onConsentNeeded: () => {
          A = true;
          onDone(getLoginConsentHandoffMessage(), {
            display: "system",
          });
          return yieldToEventLoop();
        },
      });
      let O = loginCompletion(context, C, D, {
        envTokenWasSet,
        envWarningOnce,
      });
      if (A) {
        let [v] = O;
        if (v)
          context.applyMessageOp({
            type: "append",
            messages: [createSystemMessage(v, "notice")],
          });
        return;
      }
      onDone(...O);
    },
    onHybridSignIn: undefined,
  });
}
//@ chunk-vrmtstb0.js:11396-13635 placement = Login (0.296)
function Login(props) {
  let g = w(38);
  let mainLoopModel = useMainLoopModel();
  let setAppState = useSetAppState();
  let hasScrollViewport = useHasScrollViewport();
  let [c, p] = y(false);
  let _;
  if (g[0] === MEMO_CACHE_SENTINEL) {
    _ = () => p(true);
    g[0] = _;
  } else _ = g[0];
  let C = _;
  let { storageV5, credentials } = useTheme_2();
  let { onOrgDocumentsReload } = props;
  let D;
  if (g[1] !== credentials || g[2] !== onOrgDocumentsReload || g[3] !== storageV5) {
    D = (O) => {
      if (onOrgDocumentsReload) onOrgDocumentsReload(O);
      else if (O === "previous")
        MANAGED_RELOAD_NOTICES({
          storageV5,
          credentials,
        });
    };
    g[1] = credentials;
    g[2] = onOrgDocumentsReload;
    g[3] = storageV5;
    g[4] = D;
  } else D = g[4];
  let onOrgDocumentsReload_2 = D;
  let G = R(false);
  let k = R(null);
  let [x, f] = y(false);
  let P;
  if (g[5] !== mainLoopModel || g[6] !== props || g[7] !== setAppState) {
    P = (J) => {
      if (G.current) {
        return;
      }
      G.current = true;
      f(true);
      if (k.current !== null && props.onHybridSignIn) {
        props.onHybridSignIn(k.current);
        return;
      }
      props.onDone(J, mainLoopModel, setAppState);
    };
    g[5] = mainLoopModel;
    g[6] = props;
    g[7] = setAppState;
    g[8] = P;
  } else P = g[8];
  let m = P;
  let B;
  if (g[9] !== c || g[10] !== m) {
    B = () => m(c);
    g[9] = c;
    g[10] = m;
    g[11] = B;
  } else B = g[11];
  let M = B;
  let U;
  if (g[12] === MEMO_CACHE_SENTINEL) {
    U = {
      context: "Settings",
    };
    g[12] = U;
  } else U = g[12];
  useKeybinding("confirm:no", M, U);
  let [h] = y(getLoginAvailability);
  let pe;
  if (g[13] !== h.kind) {
    pe = () => h.kind === "any-method" && getUserSettingsGateway() !== undefined;
    g[13] = h.kind;
    g[14] = pe;
  } else pe = g[14];
  let [Fe] = y(pe);
  let { exit } = useApp();
  let [F, Ge] = y(h.kind === "refused");
  let fe;
  if (g[15] !== exit || g[16] !== m || g[17] !== F) {
    fe = () => {
      if (F && !G.current) {
        m(false);
        return;
      }
      exit();
    };
    g[15] = exit;
    g[16] = m;
    g[17] = F;
    g[18] = fe;
  } else fe = g[18];
  let globalExitKeybindings = useGlobalExitKeybindings(fe);
  const hideInputGuide = (c || Fe) && !globalExitKeybindings.pending;
  let inputGuide;
  if (
    g[19] !== x ||
    g[20] !== globalExitKeybindings.keyName ||
    g[21] !== globalExitKeybindings.pending ||
    g[22] !== F ||
    g[23] !== h.kind
  ) {
    inputGuide = globalExitKeybindings.pending
      ? jsxProd_default_2(Text, {
          children: ["Press ", globalExitKeybindings.keyName, " again to", " ", F && !x ? "cancel" : "exit"],
        })
      : jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Settings",
          fallback: "Esc",
          description: h.kind === "refused" ? "close" : "cancel",
        });
    g[19] = x;
    g[20] = globalExitKeybindings.keyName;
    g[21] = globalExitKeybindings.pending;
    g[22] = F;
    g[23] = h.kind;
    g[24] = inputGuide;
  } else inputGuide = g[24];
  let children;
  if (
    g[25] !== m ||
    g[26] !== onOrgDocumentsReload_2 ||
    g[27] !== hasScrollViewport ||
    g[28] !== props.onHybridSignIn ||
    g[29] !== props.startingMessage ||
    g[30] !== h.kind ||
    g[31] !== h.notice
  ) {
    children =
      h.kind === "refused"
        ? jsxProd_default(Text, {
            children: h.notice,
          })
        : jsxProd_default(ConsoleOAuthFlow, {
            onDone: () => m(true),
            onAuthSuccess: C,
            onOrgDocumentsReload: onOrgDocumentsReload_2,
            onHybridSignIn:
              props.onHybridSignIn &&
              ((xe) => {
                k.current = xe;
                C();
              }),
            onFreshPickerChange: Ge,
            startingMessage: props.startingMessage,
            forceLoginMethod: h.kind === "claudeai-only" ? "claudeai" : undefined,
            urlOutdent: hasScrollViewport ? PANE_PADDING_X : PANE_PADDING,
          });
    g[25] = m;
    g[26] = onOrgDocumentsReload_2;
    g[27] = hasScrollViewport;
    g[28] = props.onHybridSignIn;
    g[29] = props.startingMessage;
    g[30] = h.kind;
    g[31] = h.notice;
    g[32] = children;
  } else children = g[32];
  let me;
  if (g[33] !== M || g[34] !== hideInputGuide || g[35] !== inputGuide || g[36] !== children) {
    me = jsxProd_default(Dialog, {
      title: "Login",
      onCancel: M,
      color: "permission",
      isCancelActive: false,
      hideInputGuide,
      inputGuide,
      children,
    });
    g[33] = M;
    g[34] = hideInputGuide;
    g[35] = inputGuide;
    g[36] = children;
    g[37] = me;
  } else me = g[37];
  return me;
}
export { Login, runPostLoginHooks, loginCompletion };

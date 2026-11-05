/**
 * services/oauth/postLoginHooks.ts
 *
 * 2.1.316 新增：网关托管设置加载失败原因说明；网关登录后重启 Claude Code（后台会话不能自重启）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s4h0q5es.js (24)
 * attribution: placement 24
 */
import { init_react_production, useState, useRef } from "../../../vendor/react/cjs/react.production.js";
import { onOrgMemoryAuthCompletion } from "../orgMemory/orgMemoryDecision.js";
import { selectionAccountKey } from "../orgMemory/selection.js";
import {
  getGatewayAuth,
  resetCostState,
  getStickyBetas,
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
import { isAccepted } from "../../utils/codeMode/accepted.js";
import { signedInRestartNotice, signedInEndingNotice } from "../../utils/foresightStatus.js";
import { hasPolicyDiverged } from "../../utils/settings/policySnapshot.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { resetProviderBoundCaches } from "../../utils/model/resetProviderCaches.js";
import { applyConfigEnvironmentVariables } from "../../utils/managedEnvApply.js";
import { relatchTenguSandboxGbConfig } from "../../utils/sandbox/sandbox-adapter.js";
import { forgetBeta } from "../../bootstrap/stateSlices.js";
import { BETA_CCR_TOOL_PROVENANCE } from "../../utils/betas.js";
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-s4h0q5es.js:2380-2384 placement
init_react_production();
//@ chunk-s4h0q5es.js:2384-2410 placement
function runOrgMemoryAuthBoundary() {
  onOrgMemoryAuthCompletion(selectionAccountKey());
}
//@ chunk-s4h0q5es.js:2410-4826 placement
async function runPostLoginHooks(session, session_2, options) {
  session.onChangeAPIKey();
  if (!session_2)
    return {
      bridgeDisconnected: false,
      accountSwitched: false,
      relaunching: false,
    };
  let gatewayAuth = getGatewayAuth();
  let gatewayChanged = gatewayAuth !== null && gatewayAuth !== options.previousGatewayAuth;
  if (getAPIProvider() === "gateway") {
    let onConsentNeeded = options.onConsentNeeded;
    let consentHold = {
      release: null,
    };
    let releaseConsentHold = onConsentNeeded
      ? armConsentNeededRelease(() => {
          consentHold.release ??= acquireConsentHandoffHold();
          return onConsentNeeded();
        })
      : null;
    try {
      let settingsOutcome;
      try {
        settingsOutcome = await refreshRemoteManagedSettingsWithOutcome(
          showStandaloneSecurityDialog,
          session.storageV5,
          session.credentials,
        );
      } finally {
        releaseConsentHold?.();
      }
      let gatewayAuth = getGatewayAuth();
      let gatewayLabelText = gatewayLabel(gatewayAuth);
      if (
        gatewayChanged &&
        !settingsOutcome.fetchSucceeded &&
        settingsOutcome.failure?.errorKind === "gateway_cert_mismatch"
      )
        return await finishGatewayLoginFailure(
          session,
          gatewayAuth,
          formatGatewayPinMismatchError(gatewayLabelText, settingsOutcome.failure.gatewayPinMismatch),
        );
      if (isAccepted()) {
        await restartAfterGatewayLogin(session, signedInRestartNotice(), signedInEndingNotice);
        return POST_LOGIN_SHUTDOWN_STATE;
      }
      if (!settingsOutcome.fetchSucceeded || hasPolicyDiverged()) {
        let failure = settingsOutcome.fetchSucceeded ? undefined : settingsOutcome.failure;
        await restartAfterGatewayLogin(
          session,
          formatGatewayRestartNotice(gatewayLabelText, failure, gatewayChanged),
          (exitNotice) => formatGatewayExitNotice(gatewayLabelText, failure, exitNotice, gatewayChanged),
        );
        return POST_LOGIN_SHUTDOWN_STATE;
      }
      if (isTerminalShutdown()) return POST_LOGIN_SHUTDOWN_STATE;
      resetProviderBoundCaches("gateway");
      applyConfigEnvironmentVariables();
      relatchTenguSandboxGbConfig();
    } finally {
      if (!isTerminalShutdown()) consentHold.release?.();
    }
  } else if (isAccepted() && !require("../../utils/codeModeOptIn.js").isSignedInAsWhenModeKept()) {
    await restartAfterGatewayLogin(session, signedInRestartNotice(), signedInEndingNotice);
    return POST_LOGIN_SHUTDOWN_STATE;
  } else refreshRemoteManagedSettings(showStandaloneSecurityDialog, session.storageV5, session.credentials);
  resetCostState();
  forgetBeta(getStickyBetas(), BETA_CCR_TOOL_PROVENANCE);
  let policyLimitsRefresh = refreshPolicyLimits().catch(() => {});
  policyLimitsRefresh
    .then(() => {
      if (shouldRefreshArtifactRoster())
        refreshArtifactRoster({
          credentials: session.credentials,
          storageV5: session.storageV5,
          timeoutMs: 5000,
        });
    })
    .catch(() => {});
  resetUserData();
  refreshGrowthBookAfterAuthChange();
  withTimeout(policyLimitsRefresh, POLICY_LIMITS_COLD_AWAIT_MS, "post-login policy limits refresh")
    .catch(() => {})
    .then(() => noopServedCatalogHook())
    .then(() => {})
    .catch((error) => logError(error));
  let { setAppState } = options;
  let loginCounter = loginEventCounter.of(session.session);
  let persisted = () => loginCounter.credentialsPersisted();
  let previousAccount = options.previousAccount;
  let oauthAccountInfo = getOauthAccountInfo();
  let sameAccount = sameOwnerAccount(previousAccount, oauthAccountInfo);
  let { replBridgeEnabled, replBridgeOutboundOnly } = session.getAppState();
  let accountSwitched = previousAccount?.accountUuid !== undefined && !sameAccount;
  let bridgeDisconnected = accountSwitched && replBridgeEnabled && !replBridgeOutboundOnly;
  if (accountSwitched)
    setAppState((state) => {
      if (!(state.replBridgeEnabled || state.replBridgeError !== undefined)) return state;
      logForDebugging("[bridge:repl] Account changed via /login \u2014 disconnecting Remote Control session");
      return {
        ...state,
        replBridgeEnabled: false,
        replBridgeExplicit: false,
        replBridgeOutboundOnly: false,
        replBridgeError: undefined,
        replBridgeErrorKind: undefined,
        notifications: removeNotificationByKey(state.notifications, BRIDGE_FAILED),
      };
    });
  clearOrgMemoryCredential();
  clearOrgMemoryDiscoveryCaches();
  notifyRoomAccountChanged(oauthAccountInfo);
  options.setAppState(resetSliceIfUnchanged);
  if (accountSwitched) {
    clearOrgMemoryDiscoveryAccountState();
    options.setAppState((state) => ({
      ...state,
      replBridgeSessionGroupingId: undefined,
      replBridgeInitialName: undefined,
      ultrareviewOverageConfirmed: false,
    }));
    clearSessionConsentKeys();
    if (session.dialogStore) session.dialogStore.dismissKind(REMOTE_CALLOUT_DIALOG.kind);
    else
      logError(
        Error(
          "runPostLoginHooks: no dialog store to dismiss a pending Remote Control callout on account switch",
        ),
      );
  }
  if (sameAccount && (await readStoredTrustedDeviceToken())) {
    logForDebugging("[trusted-device] Same account+org re-login with existing token, skipping re-enrollment");
    await forgetEnrollmentAfterRefusal();
    persisted();
  } else {
    clearTrustedDeviceToken();
    let enrollment = enrollTrustedDevice({
      credentials: session.credentials,
    }).then(persisted, persisted);
    if (options.awaitEnrollment) await enrollment;
  }
  let { host } = session.session;
  let appState = session.getAppState();
  rearmAutoModeGateCheck(host);
  clearFastRejectedFallbackModels();
  if (!getIsRemoteMode())
    checkAndDisableAutoModeIfNeeded(host, getToolPermissionContext(session), setAppState, appState.fastMode);
  runOrgMemoryAuthBoundary();
  loginCounter.loginCompleted();
  return {
    bridgeDisconnected,
    accountSwitched,
    relaunching: false,
  };
}
//@ chunk-s4h0q5es.js:4826-4836 placement
/**
 * 指纹展示保留的字符数（16）。
 */
var FINGERPRINT_PREFIX_CHARS = 16;
//@ chunk-s4h0q5es.js:4836-4882 placement
/**
 * 截短指纹用于展示。
 */
function shortFingerprint(fingerprint) {
  return `${fingerprint.slice(0, FINGERPRINT_PREFIX_CHARS)}\u2026`;
}
//@ chunk-s4h0q5es.js:4882-4976 placement
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
//@ chunk-s4h0q5es.js:4976-5040 placement
/**
 * 终端关闭时的统一收尾状态。
 */
var POST_LOGIN_SHUTDOWN_STATE = {
  bridgeDisconnected: false,
  accountSwitched: false,
  relaunching: true,
};
//@ chunk-s4h0q5es.js:5040-5548 placement
/**
 * 网关登录失败后的收尾（清除凭据、恢复会话）。
 */
async function finishGatewayLoginFailure(session, gatewayAuth, failureText) {
  for (
    let gatewayRefreshInFlight = getGatewayRefreshInFlight();
    gatewayRefreshInFlight;
    gatewayRefreshInFlight = getGatewayRefreshInFlight()
  )
    await gatewayRefreshInFlight.catch(() => {});
  let gatewayAuth_2 = getGatewayAuth();
  await clearGatewayCredential(
    gatewayAuth_2 && gatewayAuth && gatewayAuth_2.url === gatewayAuth.url ? gatewayAuth_2 : gatewayAuth,
    session.credentials,
  );
  await clearRemoteManagedSettingsCache(session.storageV5);
  if (isTerminalShutdown())
    return {
      ...POST_LOGIN_SHUTDOWN_STATE,
      gatewayLoginError: failureText,
    };
  let transcriptsSaved = !isTranscriptPersistenceDisabled();
  if (transcriptsSaved) await saveResumePoint(session.messages, session.storageV5);
  await gracefulShutdown(0, "other", {
    finalMessage: `${failureText}
This session is ending so that nothing from that gateway stays half-applied. Start claude again${transcriptsSaved ? " to continue (your conversation can be resumed)" : ""} and sign in once that is fixed.`,
  });
  return {
    ...POST_LOGIN_SHUTDOWN_STATE,
    gatewayLoginError: failureText,
  };
}
//@ chunk-s4h0q5es.js:5548-6113 placement
function formatGatewayPinMismatchError(gatewayLabel, gatewayPinMismatch) {
  let certificateText =
    gatewayPinMismatch?.presentedFingerprint && gatewayPinMismatch.pinnedFingerprint
      ? `TLS certificate ${shortFingerprint(gatewayPinMismatch.presentedFingerprint)} instead of the one you trusted (${shortFingerprint(gatewayPinMismatch.pinnedFingerprint)})`
      : "a different TLS certificate from the one you trusted";
  return `Cloud gateway sign-in was not completed: on the first request after sign-in, ${gatewayLabel} presented ${certificateText}. No gateway credentials were kept. Usually this means the gateway runs several nodes behind one address that serve different certificates (they must all serve the same one), or something on the network path is intercepting TLS.`;
}
//@ chunk-s4h0q5es.js:6113-7611 placement
/**
 * 网关托管设置加载失败原因说明。
 */
function describeGatewaySettingsError(error, signedIn) {
  switch (error.errorKind) {
    case "timeout":
      return "the request timed out";
    case "network_error":
      return "couldn't connect to the gateway";
    case "http_401":
    case "api_key_not_sent":
      return signedIn
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
      return error.httpStatus === undefined
        ? "the gateway answered with an unexpected status"
        : `the gateway answered HTTP ${error.httpStatus}`;
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
//@ chunk-s4h0q5es.js:7611-7954 placement
/**
 * 网关登录后设置加载失败的提示。
 */
function gatewaySettingsErrorMessage(gatewayLabel, failure, signedIn) {
  if (failure) {
    let detail = describeGatewaySettingsError(failure, signedIn);
    return signedIn
      ? `Signed in to Cloud gateway ${gatewayLabel}, but couldn't load your organization's managed settings (${detail})`
      : `Couldn't reload your organization's managed settings from Cloud gateway ${gatewayLabel} (${detail})`;
  }
  return signedIn
    ? `Signed in to Cloud gateway ${gatewayLabel}`
    : `Your organization's managed settings on Cloud gateway ${gatewayLabel} changed`;
}
//@ chunk-s4h0q5es.js:7954-8221 placement
function formatGatewayRestartNotice(
  gatewayLabel,
  failure,
  signedIn,
  transcriptSaved = !isTranscriptPersistenceDisabled(),
) {
  let ellipsis = transcriptSaved ? "\u2026" : " (this conversation is not saved, so it starts fresh)\u2026";
  let message = gatewaySettingsErrorMessage(gatewayLabel, failure, signedIn);
  return failure
    ? `${message}. Restarting Claude Code to retry${ellipsis}`
    : `${message}. Restarting Claude Code to apply ${signedIn ? "your organization's managed settings" : "them"}${ellipsis}`;
}
//@ chunk-s4h0q5es.js:8221-8565 placement
function formatGatewayExitNotice(
  gatewayLabel,
  failure,
  reason,
  signedIn,
  transcriptSaved = !isTranscriptPersistenceDisabled(),
) {
  return `${gatewaySettingsErrorMessage(gatewayLabel, failure, signedIn)}. ${failure ? "Claude Code has to restart to retry" : `Claude Code has to restart to apply ${signedIn ? "your organization's managed settings" : "them"}`}, and ${reason}, so this session is ending instead. Your sign-in is saved: start claude again the same way${transcriptSaved ? " (add --continue to return to this conversation)" : ""}.`;
}
//@ chunk-s4h0q5es.js:8565-9285 placement
/**
 * 网关登录后重启 Claude Code（后台会话不能自重启）。
 */
async function restartAfterGatewayLogin(session, notice, exitNotice) {
  if (isTerminalShutdown()) return;
  let shutdownWith = (reason) =>
    gracefulShutdown(0, "other", {
      finalMessage: exitNotice(reason),
    });
  await saveResumePoint(submittedMessages(session), session.storageV5);
  if (isTerminalShutdown()) return;
  if (isBgSession())
    return shutdownWith(
      "a background session cannot restart itself (sign in from a session started directly with `claude`)",
    );
  let toolPermissionContext = getToolPermissionContext(session);
  let uncarried = listUncarriedLaunchSettings(toolPermissionContext, getForkRestrictedLaunchConfig());
  if (uncarried.length > 0)
    return shutdownWith(`this session has restrictions a restart can't carry over (${uncarried.join("; ")})`);
  let proactivity = {
    proactivityLevel: session.getProactivityLevel(),
    toolPermissionContext,
  };
  try {
    await relaunchClaudeCode(
      {
        freshIfNoTranscript: true,
        extraArgs: [
          ...buildRelaunchArgs(toolPermissionContext, getSessionEffort(session)),
          ...buildPermissionAndAgentArgs(toolPermissionContext, getForkReplayLaunchConfig()),
        ],
        proactivity,
        env: {
          ...getScreenReaderEnv(),
          ...sessionAddDirsEnv(toolPermissionContext.additionalWorkingDirectories),
        },
        preSpawn: () =>
          process.stdout.write(`
${notice}
`),
      },
      session.storageV5,
    );
  } catch (error) {
    logError(toError(error));
    return shutdownWith(`it could not restart itself (${errorMessage(error)})`);
  }
}
//@ chunk-s4h0q5es.js:9285-9827 placement
function loginCompletion(context, onDone, outcome, { envTokenWasSet = false, envWarningOnce } = {}) {
  if (outcome.gatewayLoginError !== undefined || outcome.relaunching) return [outcome.gatewayLoginError];
  let availability = onDone ? undefined : getLoginAvailability();
  if (availability?.kind === "refused")
    return [
      availability.notice,
      {
        display: "system",
      },
    ];
  let autoContinue = onDone ? loginAutoContinueOptions(context, outcome) : undefined;
  let envWarningRoute = envTokenWarningRoute({
    envTokenWasSet,
    gatewayActive: getAPIProvider() === "gateway",
    willAutoQuery: autoContinue?.shouldQuery === true,
  });
  if (envWarningRoute === "out-of-band" && envWarningOnce && !envWarningOnce.delivered) {
    envWarningOnce.delivered = true;
    context.applyMessageOp({
      type: "append",
      messages: [createSystemMessage(LOGIN_SUCCESS_ENV_OVERRIDE_WARNING, "notice")],
    });
  }
  return [
    buildLoginDoneMessage(onDone, {
      bridgeDisconnected: outcome.bridgeDisconnected,
      includeEnvTokenWarning: envWarningRoute === "inline",
    }),
    autoContinue,
  ];
}
//@ chunk-s4h0q5es.js:9827-10015 placement (2.1.88 match: launchAndDone, 0.376)
function loginAutoContinueOptions(session, outcome) {
  if (outcome.accountSwitched || outcome.relaunching) return;
  let lastAssistantMessage = getLastAssistantMessage(session.messages);
  if (lastAssistantMessage?.isApiErrorMessage && lastAssistantMessage.error === "authentication_failed")
    return {
      display: "system",
      shouldQuery: true,
    };
  return;
}
//@ chunk-s4h0q5es.js:10015-10185 placement
var OLD_TOKEN_ENV_WARNING =
  "but if that variable is set in your shell profile or a Claude Code settings file, new `claude` sessions will keep using the old token until you remove it there.";
//@ chunk-s4h0q5es.js:10185-10276 placement
function getLoginConsentHandoffMessage() {
  return "Signed in. Review your organization's managed settings to continue.";
}
//@ chunk-s4h0q5es.js:10276-10467 placement
function getLoginStartingMessage() {
  return env.CLAUDE_CODE_OAUTH_TOKEN
    ? `Warning: CLAUDE_CODE_OAUTH_TOKEN is set in your environment. This session will switch to your new credentials after logging in, ${OLD_TOKEN_ENV_WARNING}`
    : undefined;
}
//@ chunk-s4h0q5es.js:10467-10606 placement
var LOGIN_SUCCESS_ENV_OVERRIDE_WARNING = `Note: CLAUDE_CODE_OAUTH_TOKEN was set in your environment when /login started. This session will use your new credentials, ${OLD_TOKEN_ENV_WARNING}`;
//@ chunk-s4h0q5es.js:10606-10719 placement
function envTokenWarningRoute(input) {
  if (!input.envTokenWasSet || input.gatewayActive) return "none";
  return input.willAutoQuery ? "out-of-band" : "inline";
}
//@ chunk-s4h0q5es.js:10719-10891 placement (2.1.88 match: call, 0.512)
function buildLoginDoneMessage(onDone, context) {
  if (!onDone) return "Login interrupted";
  let message = context.bridgeDisconnected
    ? `Login successful. ${REMOTE_CONTROL_DISCONNECTED_MSG}`
    : "Login successful";
  return context.includeEnvTokenWarning
    ? `${message}

${LOGIN_SUCCESS_ENV_OVERRIDE_WARNING}`
    : message;
}
//@ chunk-s4h0q5es.js:10891-11635 placement
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
    onDone: async (messages, done, setAppState) => {
      let consentNeeded = false;
      let postLoginResult = await runPostLoginHooks(context, messages, {
        setAppState,
        previousAccount,
        previousGatewayAuth,
        onConsentNeeded: () => {
          consentNeeded = true;
          onDone(getLoginConsentHandoffMessage(), {
            display: "system",
          });
          return yieldToEventLoop();
        },
      });
      let completion = loginCompletion(context, messages, postLoginResult, {
        envTokenWasSet,
        envWarningOnce,
      });
      if (consentNeeded) {
        let [firstMessage] = completion;
        if (firstMessage)
          context.applyMessageOp({
            type: "append",
            messages: [createSystemMessage(firstMessage, "notice")],
          });
        return;
      }
      onDone(...completion);
    },
    onHybridSignIn: undefined,
  });
}
//@ chunk-s4h0q5es.js:11635-13878 placement (2.1.88 match: Login, 0.296)
function Login(props) {
  let $ = useMemoCache(38);
  let mainLoopModel = useMainLoopModel();
  let setAppState = useSetAppState();
  let hasScrollViewport = useHasScrollViewport();
  let [authCompleted, setAuthCompleted] = useState(false);
  let markAuthSuccess;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    markAuthSuccess = () => setAuthCompleted(true);
    $[0] = markAuthSuccess;
  } else markAuthSuccess = $[0];
  let onAuthSuccess = markAuthSuccess;
  let { storageV5, credentials } = useTheme_2();
  let { onOrgDocumentsReload } = props;
  let handleOrgDocumentsReload;
  if ($[1] !== credentials || $[2] !== onOrgDocumentsReload || $[3] !== storageV5) {
    handleOrgDocumentsReload = (reloadMode) => {
      if (onOrgDocumentsReload) onOrgDocumentsReload(reloadMode);
      else if (reloadMode === "previous")
        MANAGED_RELOAD_NOTICES({
          storageV5,
          credentials,
        });
    };
    $[1] = credentials;
    $[2] = onOrgDocumentsReload;
    $[3] = storageV5;
    $[4] = handleOrgDocumentsReload;
  } else handleOrgDocumentsReload = $[4];
  let onOrgDocumentsReload_2 = handleOrgDocumentsReload;
  let loginHandledRef = useRef(false);
  let pendingHybridCredentialRef = useRef(null);
  let [loginCompleted, setLoginCompleted] = useState(false);
  let handleDone;
  if ($[5] !== mainLoopModel || $[6] !== props || $[7] !== setAppState) {
    handleDone = (completed) => {
      if (loginHandledRef.current) {
        return;
      }
      loginHandledRef.current = true;
      setLoginCompleted(true);
      if (pendingHybridCredentialRef.current !== null && props.onHybridSignIn) {
        props.onHybridSignIn(pendingHybridCredentialRef.current);
        return;
      }
      props.onDone(completed, mainLoopModel, setAppState);
    };
    $[5] = mainLoopModel;
    $[6] = props;
    $[7] = setAppState;
    $[8] = handleDone;
  } else handleDone = $[8];
  let onDone = handleDone;
  let handleCancel;
  if ($[9] !== authCompleted || $[10] !== onDone) {
    handleCancel = () => onDone(authCompleted);
    $[9] = authCompleted;
    $[10] = onDone;
    $[11] = handleCancel;
  } else handleCancel = $[11];
  let onCancel = handleCancel;
  let keybindingOptions;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    keybindingOptions = {
      context: "Settings",
    };
    $[12] = keybindingOptions;
  } else keybindingOptions = $[12];
  useKeybinding("confirm:no", onCancel, keybindingOptions);
  let [loginAvailability] = useState(getLoginAvailability);
  let isGatewayOnly;
  if ($[13] !== loginAvailability.kind) {
    isGatewayOnly = () => loginAvailability.kind === "any-method" && getUserSettingsGateway() !== undefined;
    $[13] = loginAvailability.kind;
    $[14] = isGatewayOnly;
  } else isGatewayOnly = $[14];
  let [gatewayOnly] = useState(isGatewayOnly);
  let { exit } = useApp();
  let [isRefused, setIsRefused] = useState(loginAvailability.kind === "refused");
  let handleExit;
  if ($[15] !== exit || $[16] !== onDone || $[17] !== isRefused) {
    handleExit = () => {
      if (isRefused && !loginHandledRef.current) {
        onDone(false);
        return;
      }
      exit();
    };
    $[15] = exit;
    $[16] = onDone;
    $[17] = isRefused;
    $[18] = handleExit;
  } else handleExit = $[18];
  let globalExitKeybindings = useGlobalExitKeybindings(handleExit);
  const hideInputGuide = (authCompleted || gatewayOnly) && !globalExitKeybindings.pending;
  let inputGuide;
  if (
    $[19] !== loginCompleted ||
    $[20] !== globalExitKeybindings.keyName ||
    $[21] !== globalExitKeybindings.pending ||
    $[22] !== isRefused ||
    $[23] !== loginAvailability.kind
  ) {
    inputGuide = globalExitKeybindings.pending
      ? jsxProd_default_2(Text, {
          children: [
            "Press ",
            globalExitKeybindings.keyName,
            " again to",
            " ",
            isRefused && !loginCompleted ? "cancel" : "exit",
          ],
        })
      : jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Settings",
          fallback: "Esc",
          description: loginAvailability.kind === "refused" ? "close" : "cancel",
        });
    $[19] = loginCompleted;
    $[20] = globalExitKeybindings.keyName;
    $[21] = globalExitKeybindings.pending;
    $[22] = isRefused;
    $[23] = loginAvailability.kind;
    $[24] = inputGuide;
  } else inputGuide = $[24];
  let children;
  if (
    $[25] !== onDone ||
    $[26] !== onOrgDocumentsReload_2 ||
    $[27] !== hasScrollViewport ||
    $[28] !== props.onHybridSignIn ||
    $[29] !== props.startingMessage ||
    $[30] !== loginAvailability.kind ||
    $[31] !== loginAvailability.notice
  ) {
    children =
      loginAvailability.kind === "refused"
        ? jsxProd_default(Text, {
            children: loginAvailability.notice,
          })
        : jsxProd_default(ConsoleOAuthFlow, {
            onDone: () => onDone(true),
            onAuthSuccess,
            onOrgDocumentsReload: onOrgDocumentsReload_2,
            onHybridSignIn:
              props.onHybridSignIn &&
              ((hybridCredential) => {
                pendingHybridCredentialRef.current = hybridCredential;
                onAuthSuccess();
              }),
            onFreshPickerChange: setIsRefused,
            startingMessage: props.startingMessage,
            forceLoginMethod: loginAvailability.kind === "claudeai-only" ? "claudeai" : undefined,
            urlOutdent: hasScrollViewport ? PANE_PADDING_X : PANE_PADDING,
          });
    $[25] = onDone;
    $[26] = onOrgDocumentsReload_2;
    $[27] = hasScrollViewport;
    $[28] = props.onHybridSignIn;
    $[29] = props.startingMessage;
    $[30] = loginAvailability.kind;
    $[31] = loginAvailability.notice;
    $[32] = children;
  } else children = $[32];
  let dialog;
  if ($[33] !== onCancel || $[34] !== hideInputGuide || $[35] !== inputGuide || $[36] !== children) {
    dialog = jsxProd_default(Dialog, {
      title: "Login",
      onCancel,
      color: "permission",
      isCancelActive: false,
      hideInputGuide,
      inputGuide,
      children,
    });
    $[33] = onCancel;
    $[34] = hideInputGuide;
    $[35] = inputGuide;
    $[36] = children;
    $[37] = dialog;
  } else dialog = $[37];
  return dialog;
}
export {
  Login,
  runPostLoginHooks,
  loginCompletion,
  LOGIN_SUCCESS_ENV_OVERRIDE_WARNING,
  buildLoginDoneMessage,
  call,
  envTokenWarningRoute,
  formatGatewayExitNotice,
  formatGatewayPinMismatchError,
  formatGatewayRestartNotice,
  getLoginConsentHandoffMessage,
  getLoginStartingMessage,
  loginAutoContinueOptions,
  runOrgMemoryAuthBoundary,
};

/**
 * components/ConsoleOAuthFlow.tsx
 *
 * 登录流程：选择订阅（claude.ai）/API 计费（console）/网关，启动 OAuth、等待浏览器授权或粘贴代码、保存凭证。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ConsoleOAuthFlow.tsx
 * pieces: chunk-f94bkgbg.js (1), chunk-mx6cbnn0.js (11)
 * attribution: fingerprint 1, placement 8, callgraph-fingerprint 1, layout 1, facade-exports 1
 */
import {
  init_react_production,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { managedSettingsUrl, MANAGED_SETTINGS_NOTICE } from "./ManagedSettingsNotice.js";
import { markManagedSettingsNoticeSeen } from "../services/remoteManagedSettings/loginNotice.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../ink/components/Text.js";
import { plural } from "../utils/stringUtils.js";
import { useHasScrollViewport } from "./ScrollViewportContext.js";
import { useAppStateSlice } from "../state/AppState.js";
import { PANE_WIDTH_RESERVE } from "./design-system/Pane.js";
import { getInitialSettings } from "../utils/settings/settings.js";
import { getUserSettingsGateway, getForcedGatewayLogin } from "../services/gateway/gatewayCredentialStore.js";
import {
  getForcedLoginMethod,
  policyUnreadableForEnforcement,
  checkNewLoginTokenOrg,
  validateForceLoginOrg,
  getConfiguredAwsAuthRefresh,
  getOauthAccountInfo,
} from "../utils/auth.js";
import { useTerminalNotification } from "../ink/useTerminalNotification.js";
import { useClock } from "../ink/components/ClockContext.js";
import { OAuthService } from "../services/oauth/index.js";
import { getAPIProvider } from "../utils/model/providers.js";
import {
  getAllowedProviders,
  checkAllowedProvider,
  providerBlockedMessage,
  ProviderNotAllowedError,
} from "../utils/model/allowedProviders.js";
import { useCopyUrl, CopiedUrlHint, CopyUrlFallbackHint } from "./CopyUrlHint.js";
import {
  PASTE_CODE_PROMPT as PASTE_CODE_PROMPT_2,
  MANUAL_CODE_HINT,
} from "../services/oauth/auth-code-listener.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { isFullscreenActive, isMouseTrackingEnabled } from "../utils/fullscreen.js";
import { logEvent } from "../services/analytics/index.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { useApp } from "../ink/components/Input.js";
import { saveGlobalConfig } from "../utils/config.js";
import { withProactivityBaseline } from "../utils/proactivityRelaunch.js";
import { logError } from "../utils/log.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../utils/errors.js";
import {
  MANAGED_RELOAD_NOTICES,
  loginWithConsoleProfile,
  ConsoleProfileLoginError,
  GatewayLogin,
} from "./GatewayLogin.js";
import { isBrowserUnavailable, openValidatedUrlSucceeded } from "../utils/browser.js";
import {
  SIGN_IN_AGAIN_TO_CLEAR_MESSAGE,
  mintApiKeyIfAllowed,
  OrgConfigLoginRefusedError,
  revokeRefusedSignInToken,
  checkLoginAllowed,
  needsProfileVerification,
  unverifiedSettingsNotice,
  saveLoginOrWarn,
  LOGIN_REFUSAL_REASONS,
  rollbackFailureText,
} from "../services/oauth/refusedSignIn.js";
import { notifyAsync } from "../utils/terminalProbe.js";
import { stripNonPrintable } from "../utils/truncateGraphemes.js";
import { logForDebugging } from "../utils/debug.js";
import { LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS } from "../constants/oauth.js";
import {
  OAuthCallbackError,
  isOAuthCallbackError,
  formatAccountOnHoldSignInError,
  isClaudeAiOrigin,
  trimTrailingPunctuation,
} from "../services/oauth/oauthErrors.js";
import { getSSLErrorHint } from "../services/api/errorUtils.js";
import { errorTelemetryFields } from "../utils/accessibility/screenReader.js";
import { sanitizeStorageKindForAnalytics } from "../services/analytics/metadata.js";
import { fromEnum, lit } from "../services/analytics/safeMetadata.js";
import { isVerificationOrMintRefusal } from "../services/oauth/client.js";
import { describeMetaKey } from "../ink/terminal.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../runtime/bun-runtime.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { call } from "./AwsAuthRefresh.js";
import { CreateAgentWizard } from "./agents/new-agent-creation/CreateAgentWizard.js";
import { VertexSetupWizard } from "./vertexSetup/VertexSetupWizard.js";
import { Spinner } from "./Spinner.js";
import { TextInput } from "./TextInput.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { safeVerificationUrl } from "../services/api/verificationRequired.js";
import { WorkerBadge } from "./permissions/WorkerBadge.js";
import { PASTE_CODE_PROMPT_3, DesignOAuthWarning } from "./DesignOAuthFlow.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-mx6cbnn0.js:12718-12722 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-mx6cbnn0.js:12718", () => {
  init_react_production();
});
//@ chunk-mx6cbnn0.js:12722-13002 placement
function ManagedSettingsLoginNotice() {
  let $ = useMemoCache(6);
  let { storageV5 } = useTheme_2();
  let [managedUrl] = useState(managedSettingsUrl);
  let markSeenEffect;
  let markSeenDeps;
  if ($[0] !== managedUrl || $[1] !== storageV5) {
    markSeenEffect = () => {
      if (managedUrl !== undefined) markManagedSettingsNoticeSeen(managedUrl, "login_screen", storageV5);
    };
    markSeenDeps = [managedUrl, storageV5];
    $[0] = managedUrl;
    $[1] = storageV5;
    $[2] = markSeenEffect;
    $[3] = markSeenDeps;
  } else {
    markSeenEffect = $[2];
    markSeenDeps = $[3];
  }
  useEffect(markSeenEffect, markSeenDeps);
  let notice;
  if ($[4] !== managedUrl) {
    notice =
      managedUrl === undefined
        ? null
        : jsxProd_default(Text, {
            children: MANAGED_SETTINGS_NOTICE,
          });
    $[4] = managedUrl;
    $[5] = notice;
  } else notice = $[5];
  return notice;
}
//@ chunk-mx6cbnn0.js:13002-13034 placement
function titleOf(option) {
  return option.title;
}
//@ chunk-mx6cbnn0.js:13034-13151 placement
function providerOption(option) {
  return {
    label: jsxProd_default_2(Text, {
      children: [
        option.title,
        " \xB7 ",
        jsxProd_default(Text, {
          dimColor: true,
          children: option.hint,
        }),
      ],
    }),
    value: option.value,
  };
}
//@ chunk-mx6cbnn0.js:13151-13195 placement
function isFoundryAuthMethod(option) {
  return option.value === "foundry";
}
//@ chunk-mx6cbnn0.js:13195-13296 callgraph-fingerprint (2.1.88 match: PASTE_HERE_MSG, 0.632)
var PASTE_CODE_PROMPT = "Paste code here if prompted > ";
var RECOMMENDED_SIGNIN_UNAVAILABLE_TEXT = "The recommended sign-in isn't available on this machine";
//@ chunk-mx6cbnn0.js:13296-13421 layout
function formatTokenLifetimeDays(seconds) {
  let rounded = Math.round(seconds / 86400);
  if (rounded < 1) return "less than a day";
  if (rounded === 365) return "1 year";
  return `${rounded} ${plural(rounded, "day")}`;
}
//@ chunk-mx6cbnn0.js:13421-24795 facade-exports (2.1.88 match: ConsoleOAuthFlow, 0.496)
/**
 * 登录流程：选择登录方式（Claude 订阅 / Console API 计费 / 网关，可由参数预选），启动本地 OAuth 回调并打开浏览器，显示等待/粘贴代码提示，换取并保存凭证，完成后回调 onDone。
 */
function ConsoleOAuthFlow({
  onDone,
  onAuthSuccess,
  onOrgDocumentsReload,
  onHybridSignIn,
  onFreshPickerChange,
  onAccountOnHold,
  onOrgConfigRefused,
  startingMessage,
  mode = "login",
  expiresIn,
  forceLoginMethod,
  urlOutdent = 0,
  allowContinueWithoutLogin = false,
  orgConfigGateFollows = false,
}) {
  let hasScrollViewport = useHasScrollViewport();
  let { storageV5, credentials } = useTheme_2();
  let proactivityLevel = useAppStateSlice((appState) => appState.proactivityLevel);
  let toolPermissionContext = useAppStateSlice((appState) => appState.toolPermissionContext);
  let urlOutdentWidth = (hasScrollViewport ? PANE_WIDTH_RESERVE : 0) + urlOutdent;
  let initialSettings = getInitialSettings();
  let [userSettings] = useState(getUserSettingsGateway);
  let forcedGatewayLogin = getForcedGatewayLogin(userSettings);
  let forcedGateway = forcedGatewayLogin?.url === undefined ? undefined : forcedGatewayLogin;
  let forcedLoginMethod = getForcedLoginMethod();
  let isGatewayForced = forcedLoginMethod === "gateway";
  let loginMethod = isGatewayForced ? "gateway" : (forceLoginMethod ?? forcedLoginMethod);
  let forcedMethodMessage =
    loginMethod === "claudeai"
      ? "Login method pre-selected: Claude subscription (claude.ai account)"
      : loginMethod === "console"
        ? "Login method pre-selected: API usage billing (Anthropic Console)"
        : null;
  let installedAccount = null;
  let terminalNotification = useTerminalNotification();
  let clock = useClock();
  let [oauthStatus, setOAuthStatus] = useState(() => {
    if (mode === "setup-token")
      return {
        state: "ready_to_start",
      };
    if (loginMethod === "claudeai" || loginMethod === "console")
      return {
        state: "ready_to_start",
      };
    if (forcedGatewayLogin)
      return {
        state: "gateway_setup",
      };
    return {
      state: "idle",
    };
  });
  let pickerDirtiedRef = useRef(false);
  useEffect(() => {
    if (
      oauthStatus.state !== "idle" &&
      oauthStatus.state !== "platform_setup" &&
      oauthStatus.state !== "console_method"
    )
      pickerDirtiedRef.current = true;
    onFreshPickerChange?.(oauthStatus.state === "idle" && !pickerDirtiedRef.current);
  }, [oauthStatus.state, onFreshPickerChange]);
  let [pastedCode, setPastedCode] = useState("");
  let [cursorOffset, setCursorOffset] = useState(0);
  let [oauthService] = useState(() => new OAuthService());
  let [loginWithClaudeAi, setLoginWithClaudeAi] = useState(
    () => mode === "setup-token" || loginMethod === "claudeai",
  );
  let [consoleProfileLogin, setConsoleProfileLogin] = useState(false);
  let [keyMintFallbackReason, setKeyMintFallbackReason] = useState(null);
  let policyUnreadable = policyUnreadableForEnforcement();
  let consoleProfileLoginAllowed =
    getAPIProvider() === "firstParty" &&
    !policyUnreadable &&
    initialSettings.forceLoginOrgUUID === undefined &&
    loginMethod !== "claudeai";
  let allowedProviders = getAllowedProviders();
  let firstPartyLoginAllowed = checkAllowedProvider("firstParty") === undefined;
  let [hybridSignInOnly] = useState(() => false);
  let [hybridRowPicked, setHybridRowPicked] = useState(false);
  let pinnedMethodDiffers =
    initialSettings.forceLoginMethod !== undefined &&
    loginWithClaudeAi !== (initialSettings.forceLoginMethod === "claudeai");
  let forceLoginOrgUUID =
    typeof initialSettings.forceLoginOrgUUID === "string" && !pinnedMethodDiffers
      ? initialSettings.forceLoginOrgUUID
      : undefined;
  let [showPastePrompt, setShowPastePrompt] = useState(false);
  let [manualCodeMode, setManualCodeMode] = useState(false);
  let { copiedVia, copy, reset } = useCopyUrl(
    oauthStatus.state === "waiting_for_login" ? oauthStatus.url : null,
  );
  let pasteCodePrompt = manualCodeMode ? PASTE_CODE_PROMPT_2 : PASTE_CODE_PROMPT;
  let textInputColumns = useTerminalSize().columns - pasteCodePrompt.length - 1;
  let [showNativeCopyHint] = useState(() => isFullscreenActive() && isMouseTrackingEnabled() !== "off");
  useEffect(() => {
    if (loginMethod === "claudeai") logEvent("tengu_oauth_claudeai_forced", {});
    else if (loginMethod === "console") logEvent("tengu_oauth_console_forced", {});
    else if (isGatewayForced && true && mode !== "setup-token") logEvent("tengu_oauth_gateway_forced", {});
  }, [loginMethod, isGatewayForced, mode]);
  useTimeout(
    () => {
      if (oauthStatus.state === "about_to_retry") setOAuthStatus(oauthStatus.nextState);
    },
    oauthStatus.state === "about_to_retry" ? 1000 : null,
    [oauthStatus],
  );
  useKeybinding(
    "confirm:yes",
    () => {
      if (oauthStatus.state !== "storage_failed" && !(oauthStatus.state === "success" && oauthStatus.hybrid))
        logEvent(oauthStatus.state === "gateway_done" ? "tengu_oauth_gateway_done" : "tengu_oauth_success", {
          loginWithClaudeAi,
        });
      onDone();
    },
    {
      context: "Confirmation",
      isActive:
        (oauthStatus.state === "success" && mode !== "setup-token") ||
        (oauthStatus.state === "storage_failed" && oauthStatus.sessionAuth === "fresh") ||
        oauthStatus.state === "gateway_done",
    },
  );
  let terminal = useApp();
  let relaunchingRef = useRef(false);
  useKeybinding(
    "confirm:yes",
    () => {
      if (relaunchingRef.current) return;
      relaunchingRef.current = true;
      saveGlobalConfig(
        (config) => ({
          ...config,
          hasCompletedOnboarding: true,
          lastOnboardingVersion: {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION,
        }),
        storageV5,
      ).then(() => {
        terminal.exit();
        let proactivityBaseline =
          proactivityLevel !== undefined && toolPermissionContext !== undefined
            ? withProactivityBaseline({
                proactivityLevel,
                toolPermissionContext,
              })
            : undefined;
        import("../utils/relaunch.js").then((raw) =>
          raw.execRelaunch(
            proactivityBaseline
              ? {
                  proactivity: proactivityBaseline,
                }
              : {},
          ),
        );
      });
    },
    {
      context: "Confirmation",
      isActive: oauthStatus.state === "bedrock_done" || oauthStatus.state === "vertex_done",
    },
  );
  useKeybinding(
    "confirm:yes",
    () =>
      setOAuthStatus({
        state: "platform_setup",
      }),
    {
      context: "Confirmation",
      isActive: oauthStatus.state === "aws_refresh_done",
    },
  );
  useKeybinding(
    "confirm:yes",
    () => {
      if (oauthStatus.state === "error" && oauthStatus.toRetry) {
        setPastedCode("");
        setOAuthStatus({
          state: "about_to_retry",
          nextState: oauthStatus.toRetry,
        });
      } else if (oauthStatus.state === "storage_failed" && oauthStatus.sessionAuth !== "fresh") {
        setPastedCode("");
        setOAuthStatus({
          state: "about_to_retry",
          nextState:
            loginMethod === "claudeai" || loginMethod === "console"
              ? {
                  state: "ready_to_start",
                }
              : {
                  state: "idle",
                },
        });
      }
    },
    {
      context: "Confirmation",
      isActive:
        (oauthStatus.state === "error" && !!oauthStatus.toRetry) ||
        (oauthStatus.state === "storage_failed" && oauthStatus.sessionAuth !== "fresh"),
    },
  );
  useKeybinding("confirm:no", () => onDone(), {
    context: "Confirmation",
    isActive:
      allowContinueWithoutLogin &&
      ((oauthStatus.state === "storage_failed" && oauthStatus.sessionAuth !== "fresh") ||
        oauthStatus.state === "error"),
  });
  useKeybinding(
    "confirm:yes",
    () =>
      setOAuthStatus({
        state: "idle",
      }),
    {
      context: "Confirmation",
      isActive: oauthStatus.state === "account_on_hold" && mode !== "setup-token",
    },
  );
  useEffect(() => {
    if (/^c+$/.test(pastedCode) && oauthStatus.state === "waiting_for_login" && showPastePrompt) {
      setPastedCode("");
      copy(oauthStatus.url);
    }
  }, [pastedCode, oauthStatus, showPastePrompt, copy]);
  async function handleSubmitCode(value, url) {
    if (!value.trim()) {
      setPastedCode("");
      setCursorOffset(0);
      return;
    }
    try {
      let [authorizationCode, state] = value.split("#");
      if (!authorizationCode || !state) {
        setOAuthStatus({
          state: "error",
          message: "Invalid code. Please make sure the full code was copied",
          toRetry: {
            state: "waiting_for_login",
            url,
          },
        });
        return;
      }
      logEvent("tengu_oauth_manual_entry", {});
      oauthService.handleManualAuthCodeInput({
        authorizationCode,
        state,
      });
    } catch (err) {
      logError(err);
      setOAuthStatus({
        state: "error",
        message: errorMessage(err),
        toRetry: {
          state: "waiting_for_login",
          url,
        },
      });
    }
  }
  let abortControllerRef = useRef(new AbortController());
  useEffect(() => {
    let abortController = abortControllerRef.current;
    return () => abortController.abort();
  }, []);
  let startOAuth = useCallback(
    (loginMode) => {
      if (onOrgDocumentsReload) {
        onOrgDocumentsReload(loginMode);
        return;
      }
      MANAGED_RELOAD_NOTICES({
        storageV5,
        credentials,
      });
    },
    [onOrgDocumentsReload, storageV5, credentials],
  );
  let startOAuthFlow = useCallback(async () => {
    let listenerUnavailable = false;
    setManualCodeMode(false);
    let onCallbackListenerUnavailable = () => {
      listenerUnavailable = true;
      setManualCodeMode(true);
    };
    let onAuthorizationUrl = (url) => {
      reset();
      setShowPastePrompt(false);
      setOAuthStatus({
        state: "waiting_for_login",
        url,
      });
      if (listenerUnavailable || isBrowserUnavailable()) setShowPastePrompt(true);
      else clock.setTimeout(() => setShowPastePrompt(true), 3000);
    };
    setKeyMintFallbackReason(null);
    try {
      let blockedMessage = providerBlockedMessage("firstParty");
      if (blockedMessage !== undefined) throw new ProviderNotAllowedError(blockedMessage);
      logEvent("tengu_oauth_flow_start", {
        loginWithClaudeAi,
      });
      if (consoleProfileLogin && mode !== "setup-token") {
        if (!consoleProfileLoginAllowed)
          throw Error(
            "Settings on this machine pin the login method or organization, so signing in without an API key is not available here.",
          );
        let consoleInstallSource;
        try {
          let installKind = await loginWithConsoleProfile(
            oauthService,
            async (url) => onAuthorizationUrl(url),
            {
              orgUUID: forceLoginOrgUUID,
              onCallbackListenerUnavailable,
              onInstallStart: () => {
                consoleInstallSource = "previous";
              },
            },
          );
          consoleInstallSource = "new";
          setOAuthStatus({
            state: "success",
            ...(installKind?.departingLoginMayRemain && {
              notice: SIGN_IN_AGAIN_TO_CLEAR_MESSAGE,
            }),
          });
          onAuthSuccess?.();
          notifyAsync(
            {
              message: "Claude Code login successful",
              notificationType: "auth_success",
            },
            terminalNotification,
            {
              storageV5,
              credentials,
            },
          );
          return;
        } catch (error) {
          if (!(error instanceof ConsoleProfileLoginError) || !error.fallbackCures) throw error;
          let failureMessage = stripNonPrintable(errorMessage(error));
          setKeyMintFallbackReason({
            cause: error.causeSummary !== null ? stripNonPrintable(error.causeSummary) : failureMessage,
            message: failureMessage,
          });
          logForDebugging(
            `Keyless Console sign-in unavailable here, continuing with the API-key sign-in: ${failureMessage}`,
            {
              level: "warn",
            },
          );
        } finally {
          if (consoleInstallSource !== undefined) startOAuth(consoleInstallSource);
        }
      }
      let settingsOnlyGrant;
      let oauthFlowArgs = [
        async (url) => onAuthorizationUrl(url),
        {
          loginWithClaudeAi,
          inferenceOnly: mode === "setup-token",
          expiresIn: mode === "setup-token" ? (expiresIn ?? LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS) : undefined,
          orgUUID: forceLoginOrgUUID,
          onCallbackListenerUnavailable,
          settingsOnlyGrant,
        },
      ];
      let oauthPromise;
      oauthPromise ??= oauthService.startOAuthFlow(...oauthFlowArgs);
      let result = await oauthPromise.catch((err) => {
        if (err instanceof OAuthCallbackError) throw err;
        let isTokenExchangeError = err.message.includes("Token exchange failed");
        let sslHint = getSSLErrorHint(err);
        setOAuthStatus({
          state: "error",
          message:
            sslHint ??
            (isTokenExchangeError
              ? "Failed to exchange authorization code for access token. Please try again."
              : err.message),
          toRetry:
            mode === "setup-token"
              ? {
                  state: "ready_to_start",
                }
              : {
                  state: "idle",
                },
        });
        logEvent("tengu_oauth_token_exchange_error", {
          ...errorTelemetryFields(err),
          ssl_error: sslHint !== null,
        });
        throw err;
      });
      if (mode === "setup-token") {
        let mintResult = await mintApiKeyIfAllowed({
          accessToken: result.accessToken,
          minted: result,
        });
        if (!mintResult.ok) throw new OrgConfigLoginRefusedError(mintResult.message, mintResult.evaluation);
        setOAuthStatus({
          state: "success",
          token: result.accessToken,
          expiresAt: result.expiresAt ?? undefined,
        });
        onAuthSuccess?.();
      } else {
        let orgCheck = await checkNewLoginTokenOrg(result);
        if (orgCheck.outcome === "refused") {
          let revokeNote = await revokeRefusedSignInToken(result);
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${orgCheck.rejection.message}
${revokeNote}`,
            "ConsoleOAuthFlow: org pin refused the new token",
          );
        }
        let loginCheck = await checkLoginAllowed({
          accessToken: result.accessToken,
          startupGateFollows: orgConfigGateFollows,
          newLogin: result,
          untieredLogin: needsProfileVerification(result),
          organizationName: result.profile?.organization.name ?? result.tokenAccount?.organizationName,
        });
        let warning = loginCheck.ok ? loginCheck.warning : undefined;
        if (!loginCheck.ok)
          if (orgConfigGateFollows && loginCheck.evaluation.decision.verdict === "blocked")
            warning = unverifiedSettingsNotice(loginCheck.evaluation);
          else {
            let revokeNote = await revokeRefusedSignInToken(result);
            throw new OrgConfigLoginRefusedError(
              `${loginCheck.message} ${revokeNote}`,
              loginCheck.evaluation,
            );
          }
        if (abortControllerRef.current.signal.aborted) {
          await revokeRefusedSignInToken(result);
          return;
        }
        let sessionAuthKind = "previous";
        try {
          let saveResult = await saveLoginOrWarn(result, {
            storageV5,
            credentials,
          });
          let orgValidation = await validateForceLoginOrg(
            credentials,
            orgCheck.outcome === "permitted" ? orgCheck.verified : undefined,
          );
          if (!orgValidation.valid) {
            let refusalReason = await LOGIN_REFUSAL_REASONS(orgValidation, saveResult?.storage, {
              storageV5,
              credentials,
            });
            throw Error(
              refusalReason?.restored === false
                ? `${orgValidation.message}
${rollbackFailureText(refusalReason)}`
                : orgValidation.message,
            );
          }
          let storage = saveResult?.storage;
          if (storage && !storage.success) {
            setOAuthStatus({
              state: "storage_failed",
              backendName: storage.backendName,
              sessionAuth: storage.sessionAuth,
              transient: storage.transient,
              departingLoginMayRemain: saveResult?.departingLoginMayRemain,
            });
            logEvent("tengu_oauth_persist_failure_shown", {
              storageBackend: sanitizeStorageKindForAnalytics(storage.backendName),
              session_auth: fromEnum(storage.sessionAuth),
              transient: storage.transient === true,
            });
            if (storage.sessionAuth === "fresh") {
              sessionAuthKind = "new";
              onAuthSuccess?.();
            }
            notifyAsync(
              {
                message: storage.transient
                  ? "Claude Code login needs attention: credentials may not have been saved"
                  : "Claude Code login needs attention: credentials could not be saved",
                notificationType: "auth_storage_failure",
              },
              terminalNotification,
              {
                storageV5,
                credentials,
              },
            );
          } else {
            let filtered = [
              warning,
              saveResult?.departingLoginMayRemain ? SIGN_IN_AGAIN_TO_CLEAR_MESSAGE : undefined,
            ].filter((notice) => notice !== undefined);
            setOAuthStatus({
              state: "success",
              ...(filtered.length > 0 && {
                notice: filtered.join(`
`),
              }),
            });
            sessionAuthKind = "new";
            onAuthSuccess?.();
            notifyAsync(
              {
                message: "Claude Code login successful",
                notificationType: "auth_success",
              },
              terminalNotification,
              {
                storageV5,
                credentials,
              },
            );
          }
        } finally {
          startOAuth(sessionAuthKind);
        }
      }
    } catch (err_0) {
      if (isOAuthCallbackError(err_0)) {
        setOAuthStatus({
          state: "account_on_hold",
          message: formatAccountOnHoldSignInError(isClaudeAiOrigin(err_0.errorUri)),
        });
        logEvent("tengu_oauth_error", {
          account_on_hold: true,
        });
        return;
      }
      let errorText = err_0 instanceof OAuthCallbackError ? err_0.displayMessage : errorMessage(err_0);
      let sslHint = getSSLErrorHint(err_0);
      let isSetupMintRefusal =
        mode === "setup-token" &&
        err_0 instanceof OrgConfigLoginRefusedError &&
        err_0.evaluation.decision.verdict === "refused";
      let toRetry = {
        state:
          mode === "setup-token" ||
          loginMethod === "claudeai" ||
          (loginMethod === "console" && !consoleProfileLoginAllowed)
            ? "ready_to_start"
            : loginMethod === "console"
              ? "console_method"
              : "idle",
      };
      setOAuthStatus({
        state: "error",
        message: sslHint ?? errorText,
        ...((isVerificationOrMintRefusal(err_0) || err_0 instanceof OrgConfigLoginRefusedError) && {
          verbatim: true,
        }),
        ...(isSetupMintRefusal
          ? {
              endsCommand: true,
            }
          : {
              toRetry,
            }),
      });
      logEvent("tengu_oauth_error", {
        ...errorTelemetryFields(err_0),
        ssl_error: sslHint !== null,
      });
    }
  }, [
    oauthService,
    loginWithClaudeAi,
    hybridRowPicked,
    consoleProfileLogin,
    consoleProfileLoginAllowed,
    mode,
    expiresIn,
    forceLoginOrgUUID,
    terminalNotification,
    clock,
    onAuthSuccess,
    startOAuth,
    onHybridSignIn,
    loginMethod,
    storageV5,
    credentials,
    reset,
  ]);
  let pendingOAuthStartRef = useRef(false);
  useEffect(() => {
    if (oauthStatus.state === "ready_to_start" && !pendingOAuthStartRef.current) {
      pendingOAuthStartRef.current = true;
      process.nextTick(
        (startOAuth, pendingOAuthStartRef) => {
          startOAuth().finally(() => {
            pendingOAuthStartRef.current = false;
          });
        },
        startOAuthFlow,
        pendingOAuthStartRef,
      );
    }
  }, [oauthStatus.state, startOAuthFlow]);
  useTimeout(
    () => {
      logEvent("tengu_oauth_success", {
        loginWithClaudeAi,
      });
      onDone();
    },
    mode === "setup-token" && oauthStatus.state === "success" ? 500 : null,
    [mode, oauthStatus, loginWithClaudeAi, onDone],
  );
  useTimeout(
    () => onAccountOnHold?.(),
    mode === "setup-token" && oauthStatus.state === "account_on_hold" ? 500 : null,
    [mode, oauthStatus, onAccountOnHold],
  );
  useTimeout(
    () => onOrgConfigRefused?.(),
    mode === "setup-token" && oauthStatus.state === "error" && oauthStatus.endsCommand === true ? 500 : null,
    [mode, oauthStatus, onOrgConfigRefused],
  );
  useEffect(
    () => () => {
      oauthService.cleanup();
    },
    [oauthService],
  );
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    gap: 1,
    children: [
      oauthStatus.state === "waiting_for_login" &&
        showPastePrompt &&
        jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            gap: 1,
            paddingBottom: 1,
            marginX: urlOutdentWidth ? -urlOutdentWidth : undefined,
            children: [
              jsxProd_default_2(Box, {
                flexDirection: "column",
                paddingX: urlOutdentWidth,
                children: [
                  manualCodeMode &&
                    jsxProd_default(Text, {
                      children: MANUAL_CODE_HINT,
                    }),
                  jsxProd_default_2(Box, {
                    children: [
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: manualCodeMode
                          ? "Use the URL below to sign in "
                          : "Browser didn't open? Use the url below to sign in ",
                      }),
                      jsxProd_default(CopiedUrlHint, {
                        via: copiedVia,
                      }),
                    ],
                  }),
                  jsxProd_default(CopyUrlFallbackHint, {
                    via: copiedVia,
                  }),
                ],
              }),
              jsxProd_default(Box, {
                children: jsxProd_default(Link, {
                  url: oauthStatus.url,
                  assumeSupport: true,
                  children: jsxProd_default(Text, {
                    dimColor: true,
                    children: oauthStatus.url,
                  }),
                }),
              }),
              showNativeCopyHint &&
                jsxProd_default(Box, {
                  paddingX: urlOutdentWidth,
                  children: jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [
                      "Hold ",
                      describeMetaKey(),
                      " while selecting to use your terminal's native copy",
                    ],
                  }),
                }),
            ],
          },
          "urlToCopy",
        ),
      mode === "setup-token" &&
        oauthStatus.state === "success" &&
        oauthStatus.token &&
        jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            gap: 1,
            paddingTop: 1,
            children: [
              jsxProd_default(Text, {
                color: "success",
                children: "\u2713 Long-lived authentication token created successfully!",
              }),
              jsxProd_default_2(Box, {
                flexDirection: "column",
                gap: 1,
                children: [
                  jsxProd_default_2(Text, {
                    children: [
                      "Your OAuth token (valid for",
                      " ",
                      formatTokenLifetimeDays(
                        oauthStatus.expiresAt !== undefined && Number.isFinite(oauthStatus.expiresAt)
                          ? Math.round((oauthStatus.expiresAt - Date.now()) / 1000)
                          : (expiresIn ?? LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS),
                      ),
                      "):",
                    ],
                  }),
                  jsxProd_default(Text, {
                    color: "warning",
                    children: oauthStatus.token,
                  }),
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: "Store this token securely. You won't be able to see it again.",
                  }),
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: "Use this token by setting: export CLAUDE_CODE_OAUTH_TOKEN=<token>",
                  }),
                ],
              }),
            ],
          },
          "tokenOutput",
        ),
      jsxProd_default(Box, {
        flexDirection: "column",
        gap: 1,
        children: jsxProd_default(ConsoleOAuthFlowView, {
          oauthStatus,
          mode,
          startingMessage,
          forcedMethodMessage,
          gatewayUnsupportedWarning: null,
          forceLoginGatewayUrl: forcedGateway?.url,
          gatewayNamedBy: forcedGateway?.namedBy ?? "developer",
          gatewayInternalNetworks: forcedGateway?.internalNetworks,
          gatewayScreenLocked: isGatewayForced,
          keyMintFallbackReason,
          showPastePrompt,
          pasteCodePrompt,
          pastedCode,
          setPastedCode,
          cursorOffset,
          setCursorOffset,
          textInputColumns,
          handleSubmitCode,
          setOAuthStatus,
          setLoginWithClaudeAi,
          setConsoleProfileLogin,
          consoleProfileLoginAllowed,
          allowedProviders,
          firstPartyLoginAllowed,
          hybridSignInOnly,
          setHybridRowPicked,
          onAuthSuccess,
          reloadClearedOrgDocuments: startOAuth,
          allowContinueWithoutLogin,
        }),
      }),
    ],
  });
}
//@ chunk-mx6cbnn0.js:25302-25697 placement
/**
 * 第三方提供方登录选项。
 */
var THIRD_PARTY_PROVIDER_OPTIONS = [
  {
    value: "bedrock",
    providers: ["bedrock"],
    title: "Amazon Bedrock",
    hint: "interactive setup",
  },
  {
    value: "aws_refresh",
    providers: ["anthropicAws", "bedrock", "mantle"],
    title: "Claude Platform on AWS",
    hint: "refresh credentials",
  },
  {
    value: "foundry",
    providers: ["foundry"],
    title: "Microsoft Foundry",
    hint: "opens docs",
  },
  {
    value: "vertex",
    providers: ["vertex"],
    title: "Google Vertex AI",
    hint: "interactive setup",
  },
];
//@ chunk-mx6cbnn0.js:25697-40642 placement
/**
 * 登录流程主视图：选择方式、OAuth 状态、粘贴授权码、网关与第三方提供方。
 */
function ConsoleOAuthFlowView(props) {
  let $ = useMemoCache(194);
  let {
    oauthStatus,
    mode,
    startingMessage,
    forcedMethodMessage,
    gatewayUnsupportedWarning,
    forceLoginGatewayUrl,
    gatewayNamedBy,
    gatewayInternalNetworks,
    gatewayScreenLocked,
    keyMintFallbackReason,
    showPastePrompt,
    pasteCodePrompt,
    pastedCode,
    setPastedCode,
    cursorOffset,
    setCursorOffset,
    textInputColumns,
    handleSubmitCode,
    setOAuthStatus,
    setLoginWithClaudeAi,
    setConsoleProfileLogin,
    consoleProfileLoginAllowed,
    allowedProviders,
    firstPartyLoginAllowed,
    setHybridRowPicked,
    onAuthSuccess,
    reloadClearedOrgDocuments,
    allowContinueWithoutLogin,
  } = props;
  let showCursor = useIsScreenReaderEnabled();
  let awsAuthRefreshConfig;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    awsAuthRefreshConfig = getConfiguredAwsAuthRefresh();
    $[0] = awsAuthRefreshConfig;
  } else awsAuthRefreshConfig = $[0];
  let awsRefreshConfig = awsAuthRefreshConfig;
  let contentElement;
  if (
    $[1] !== allowContinueWithoutLogin ||
    $[2] !== allowedProviders ||
    $[3] !== consoleProfileLoginAllowed ||
    $[4] !== cursorOffset ||
    $[5] !== firstPartyLoginAllowed ||
    $[6] !== forceLoginGatewayUrl ||
    $[7] !== forcedMethodMessage ||
    $[8] !== gatewayInternalNetworks ||
    $[9] !== gatewayNamedBy ||
    $[10] !== gatewayScreenLocked ||
    $[11] !== gatewayUnsupportedWarning ||
    $[12] !== handleSubmitCode ||
    $[13] !== showCursor ||
    $[14] !== keyMintFallbackReason ||
    $[15] !== mode ||
    $[16] !== oauthStatus.backendName ||
    $[17] !== oauthStatus.departingLoginMayRemain ||
    $[18] !== oauthStatus.message ||
    $[19] !== oauthStatus.notice ||
    $[20] !== oauthStatus.ok ||
    $[21] !== oauthStatus.sessionAuth ||
    $[22] !== oauthStatus.state ||
    $[23] !== oauthStatus.toRetry ||
    $[24] !== oauthStatus.token ||
    $[25] !== oauthStatus.transient ||
    $[26] !== oauthStatus.url ||
    $[27] !== oauthStatus.verbatim ||
    $[28] !== onAuthSuccess ||
    $[29] !== pasteCodePrompt ||
    $[30] !== pastedCode ||
    $[31] !== reloadClearedOrgDocuments ||
    $[32] !== setConsoleProfileLogin ||
    $[33] !== setCursorOffset ||
    $[34] !== setHybridRowPicked ||
    $[35] !== setLoginWithClaudeAi ||
    $[36] !== setOAuthStatus ||
    $[37] !== setPastedCode ||
    $[38] !== showPastePrompt ||
    $[39] !== startingMessage ||
    $[40] !== textInputColumns
  ) {
    contentElement = EARLY_RETURN_SENTINEL;
    fo: {
      let providerFilter;
      if ($[42] !== allowedProviders) {
        providerFilter = (provider) =>
          (allowedProviders === undefined ||
            provider.providers.some((provider) => allowedProviders.includes(provider))) &&
          (provider.value !== "aws_refresh" || !!awsRefreshConfig);
        $[42] = allowedProviders;
        $[43] = providerFilter;
      } else providerFilter = $[43];
      let filtered = THIRD_PARTY_PROVIDER_OPTIONS.filter(providerFilter);
      let hybridLabel;
      switch (oauthStatus.state) {
        case "idle": {
          const children = startingMessage
            ? startingMessage
            : "Claude Code can be used with your Claude subscription or billed based on API usage through your Console account.";
          let introElement;
          if ($[44] !== children) {
            introElement = jsxProd_default(Text, {
              bold: true,
              children,
            });
            $[44] = children;
            $[45] = introElement;
          } else introElement = $[45];
          let gatewayWarningElement;
          if ($[46] !== gatewayUnsupportedWarning) {
            gatewayWarningElement =
              gatewayUnsupportedWarning &&
              jsxProd_default(Text, {
                color: "warning",
                children: gatewayUnsupportedWarning,
              });
            $[46] = gatewayUnsupportedWarning;
            $[47] = gatewayWarningElement;
          } else gatewayWarningElement = $[47];
          const noProvidersElement =
            !firstPartyLoginAllowed &&
            hybridLabel === undefined &&
            filtered.length === 0 &&
            jsxProd_default(Text, {
              color: "error",
              children:
                checkAllowedProvider("firstParty")?.message ??
                "Your organization's managed settings (allowedProviders) admit no sign-in this screen can offer; ask your administrator.",
            });
          let selectPromptElement;
          if ($[48] === MEMO_CACHE_SENTINEL) {
            selectPromptElement = jsxProd_default(Text, {
              children: "Select login method:",
            });
            $[48] = selectPromptElement;
          } else selectPromptElement = $[48];
          let firstPartyOptions;
          if ($[49] !== firstPartyLoginAllowed) {
            firstPartyOptions = firstPartyLoginAllowed
              ? [
                  {
                    label: jsxProd_default_2(Text, {
                      children: [
                        "Claude account with subscription \xB7",
                        " ",
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: "Individual, Team, or Enterprise",
                        }),
                        false,
                      ],
                    }),
                    value: "claudeai",
                  },
                  {
                    label: jsxProd_default_2(Text, {
                      children: [
                        "Anthropic Console account \xB7",
                        " ",
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: "API usage billing",
                        }),
                      ],
                    }),
                    value: "console",
                  },
                ]
              : [];
            $[49] = firstPartyLoginAllowed;
            $[50] = firstPartyOptions;
          } else firstPartyOptions = $[50];
          let hybridOptions;
          if ($[51] === MEMO_CACHE_SENTINEL) {
            hybridOptions =
              hybridLabel !== undefined
                ? [
                    {
                      label: hybridLabel,
                      value: "hybrid",
                    },
                  ]
                : [];
            $[51] = hybridOptions;
          } else hybridOptions = $[51];
          const thirdPartyOptions =
            filtered.length > 0
              ? [
                  {
                    label: jsxProd_default_2(Text, {
                      children: [
                        "3rd-party platform \xB7",
                        " ",
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: filtered.map(titleOf).join(", "),
                        }),
                      ],
                    }),
                    value: "platform",
                  },
                ]
              : [];
          let options;
          if ($[52] !== thirdPartyOptions || $[53] !== firstPartyOptions) {
            options = [...firstPartyOptions, ...hybridOptions, ...thirdPartyOptions];
            $[52] = thirdPartyOptions;
            $[53] = firstPartyOptions;
            $[54] = options;
          } else options = $[54];
          let onChange;
          if (
            $[55] !== consoleProfileLoginAllowed ||
            $[56] !== setConsoleProfileLogin ||
            $[57] !== setHybridRowPicked ||
            $[58] !== setLoginWithClaudeAi ||
            $[59] !== setOAuthStatus
          ) {
            onChange = (selectedValue) => {
              if (selectedValue === "platform") {
                logEvent("tengu_oauth_platform_selected", {});
                setOAuthStatus({
                  state: "platform_setup",
                });
              } else if (selectedValue === "claudeai" || selectedValue === "hybrid") {
                logEvent("tengu_oauth_claudeai_selected", {});
                setHybridRowPicked(selectedValue === "hybrid");
                setLoginWithClaudeAi(true);
                setConsoleProfileLogin(false);
                setOAuthStatus({
                  state: "ready_to_start",
                });
              } else if (consoleProfileLoginAllowed) {
                logEvent("tengu_oauth_console_selected", {});
                setOAuthStatus({
                  state: "console_method",
                });
              } else {
                logEvent("tengu_oauth_console_selected", {});
                setLoginWithClaudeAi(false);
                setConsoleProfileLogin(false);
                setOAuthStatus({
                  state: "ready_to_start",
                });
              }
            };
            $[55] = consoleProfileLoginAllowed;
            $[56] = setConsoleProfileLogin;
            $[57] = setHybridRowPicked;
            $[58] = setLoginWithClaudeAi;
            $[59] = setOAuthStatus;
            $[60] = onChange;
          } else onChange = $[60];
          let selectorElement;
          if ($[61] !== options || $[62] !== onChange) {
            selectorElement = jsxProd_default(Box, {
              children: jsxProd_default(ModelSelector, {
                options,
                onChange,
              }),
            });
            $[61] = options;
            $[62] = onChange;
            $[63] = selectorElement;
          } else selectorElement = $[63];
          let idleElement;
          if (
            $[64] !== selectorElement ||
            $[65] !== introElement ||
            $[66] !== gatewayWarningElement ||
            $[67] !== noProvidersElement
          ) {
            idleElement = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [
                introElement,
                gatewayWarningElement,
                noProvidersElement,
                selectPromptElement,
                selectorElement,
              ],
            });
            $[64] = selectorElement;
            $[65] = introElement;
            $[66] = gatewayWarningElement;
            $[67] = noProvidersElement;
            $[68] = idleElement;
          } else idleElement = $[68];
          contentElement = idleElement;
          break fo;
        }
        case "gateway_setup": {
          let onDone;
          if ($[69] !== onAuthSuccess || $[70] !== reloadClearedOrgDocuments || $[71] !== setOAuthStatus) {
            onDone = () => {
              onAuthSuccess?.();
              reloadClearedOrgDocuments("new");
              setOAuthStatus({
                state: "gateway_done",
              });
            };
            $[69] = onAuthSuccess;
            $[70] = reloadClearedOrgDocuments;
            $[71] = setOAuthStatus;
            $[72] = onDone;
          } else onDone = $[72];
          let onCancel;
          if ($[73] !== setOAuthStatus) {
            onCancel = () =>
              setOAuthStatus({
                state: "idle",
              });
            $[73] = setOAuthStatus;
            $[74] = onCancel;
          } else onCancel = $[74];
          let gatewaySetupElement;
          if (
            $[75] !== forceLoginGatewayUrl ||
            $[76] !== gatewayInternalNetworks ||
            $[77] !== gatewayNamedBy ||
            $[78] !== gatewayScreenLocked ||
            $[79] !== onDone ||
            $[80] !== onCancel
          ) {
            gatewaySetupElement = jsxProd_default(GatewayLogin, {
              initialUrl: forceLoginGatewayUrl,
              namedBy: gatewayNamedBy,
              internalNetworks: gatewayInternalNetworks,
              screenLocked: gatewayScreenLocked,
              onDone,
              onCancel,
            });
            $[75] = forceLoginGatewayUrl;
            $[76] = gatewayInternalNetworks;
            $[77] = gatewayNamedBy;
            $[78] = gatewayScreenLocked;
            $[79] = onDone;
            $[80] = onCancel;
            $[81] = gatewaySetupElement;
          } else gatewaySetupElement = $[81];
          contentElement = gatewaySetupElement;
          break fo;
        }
        case "gateway_done": {
          let gatewayDoneText;
          if ($[82] === MEMO_CACHE_SENTINEL) {
            gatewayDoneText = jsxProd_default(Text, {
              color: "success",
              children: "Connected to Cloud gateway.",
            });
            $[82] = gatewayDoneText;
          } else gatewayDoneText = $[82];
          let gatewayDoneElement;
          if ($[83] === MEMO_CACHE_SENTINEL) {
            gatewayDoneElement = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              marginTop: 1,
              children: [
                gatewayDoneText,
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    "Press ",
                    jsxProd_default(Text, {
                      bold: true,
                      children: "Enter",
                    }),
                    " to continue.",
                  ],
                }),
              ],
            });
            $[83] = gatewayDoneElement;
          } else gatewayDoneElement = $[83];
          contentElement = gatewayDoneElement;
          break fo;
        }
        case "console_method": {
          let consoleMethodTitle;
          let consoleMethodPrompt;
          if ($[84] === MEMO_CACHE_SENTINEL) {
            consoleMethodTitle = jsxProd_default(Text, {
              bold: true,
              children: "Anthropic Console account",
            });
            consoleMethodPrompt = jsxProd_default(Text, {
              children: "How do you want to sign in?",
            });
            $[84] = consoleMethodTitle;
            $[85] = consoleMethodPrompt;
          } else {
            consoleMethodTitle = $[84];
            consoleMethodPrompt = $[85];
          }
          let wifOption;
          if ($[86] === MEMO_CACHE_SENTINEL) {
            wifOption = {
              label: jsxProd_default_2(Text, {
                children: [
                  "Sign in with your Console account",
                  " ",
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: "(recommended)",
                  }),
                ],
              }),
              value: "wif",
            };
            $[86] = wifOption;
          } else wifOption = $[86];
          let legacyBadge;
          if ($[87] === MEMO_CACHE_SENTINEL) {
            legacyBadge = jsxProd_default(Text, {
              dimColor: true,
              children: "(legacy)",
            });
            $[87] = legacyBadge;
          } else legacyBadge = $[87];
          let options;
          if ($[88] === MEMO_CACHE_SENTINEL) {
            options = [
              wifOption,
              {
                label: jsxProd_default_2(Text, {
                  children: [
                    "Create an API key ",
                    legacyBadge,
                    " \xB7",
                    " ",
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: "adds a key to your Console workspace",
                    }),
                  ],
                }),
                value: "api-key",
              },
              {
                label: "Go back",
                value: "back",
              },
            ];
            $[88] = options;
          } else options = $[88];
          let onCancel;
          if ($[89] !== setOAuthStatus) {
            onCancel = () =>
              setOAuthStatus({
                state: "idle",
              });
            $[89] = setOAuthStatus;
            $[90] = onCancel;
          } else onCancel = $[90];
          let onChange;
          if (
            $[91] !== setConsoleProfileLogin ||
            $[92] !== setLoginWithClaudeAi ||
            $[93] !== setOAuthStatus
          ) {
            onChange = (selectedValue) => {
              if (selectedValue === "back") {
                setOAuthStatus({
                  state: "idle",
                });
                return;
              }
              setLoginWithClaudeAi(false);
              if (selectedValue === "wif") {
                logEvent("tengu_oauth_console_token_selected", {});
                setConsoleProfileLogin(true);
              } else {
                logEvent("tengu_oauth_console_api_key_selected", {});
                setConsoleProfileLogin(false);
              }
              setOAuthStatus({
                state: "ready_to_start",
              });
            };
            $[91] = setConsoleProfileLogin;
            $[92] = setLoginWithClaudeAi;
            $[93] = setOAuthStatus;
            $[94] = onChange;
          } else onChange = $[94];
          let consoleMethodElement;
          if ($[95] !== onChange || $[96] !== onCancel) {
            consoleMethodElement = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [
                consoleMethodTitle,
                consoleMethodPrompt,
                jsxProd_default(Box, {
                  children: jsxProd_default(ModelSelector, {
                    options,
                    onCancel,
                    onChange,
                  }),
                }),
              ],
            });
            $[95] = onChange;
            $[96] = onCancel;
            $[97] = consoleMethodElement;
          } else consoleMethodElement = $[97];
          contentElement = consoleMethodElement;
          break fo;
        }
        case "platform_setup": {
          let platformTitle;
          if ($[98] === MEMO_CACHE_SENTINEL) {
            platformTitle = jsxProd_default(Text, {
              bold: true,
              children: "Using 3rd-party platforms",
            });
            $[98] = platformTitle;
          } else platformTitle = $[98];
          const options = [
            ...filtered.map(providerOption),
            {
              label: "Go back",
              value: "back",
            },
          ];
          let onChange;
          let onCancel;
          if ($[99] !== setOAuthStatus) {
            onChange = (selectedValue) => {
              kt: switch (selectedValue) {
                case "bedrock": {
                  logEvent("tengu_oauth_bedrock_wizard_launched", {});
                  setOAuthStatus({
                    state: "bedrock_wizard",
                  });
                  break kt;
                }
                case "aws_refresh": {
                  logEvent("tengu_oauth_aws_refresh_launched", {});
                  setOAuthStatus({
                    state: "aws_refresh_running",
                  });
                  break kt;
                }
                case "foundry": {
                  logEvent("tengu_oauth_platform_docs_opened", {
                    platform: lit("foundry"),
                  });
                  openValidatedUrlSucceeded("https://code.claude.com/docs/en/microsoft-foundry");
                  setOAuthStatus({
                    state: "idle",
                  });
                  break kt;
                }
                case "vertex": {
                  logEvent("tengu_oauth_vertex_wizard_launched", {});
                  setOAuthStatus({
                    state: "vertex_wizard",
                  });
                  break kt;
                }
                default: {
                  setOAuthStatus({
                    state: "idle",
                  });
                }
              }
            };
            onCancel = () =>
              setOAuthStatus({
                state: "idle",
              });
            $[99] = setOAuthStatus;
            $[100] = onChange;
            $[101] = onCancel;
          } else {
            onChange = $[100];
            onCancel = $[101];
          }
          contentElement = jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              platformTitle,
              jsxProd_default(ModelSelector, {
                options,
                onChange,
                onCancel,
              }),
              filtered.some(isFoundryAuthMethod) &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    "Foundry: ",
                    jsxProd_default(Link, {
                      url: "https://code.claude.com/docs/en/microsoft-foundry",
                      children: "https://code.claude.com/docs/en/microsoft-foundry",
                    }),
                  ],
                }),
            ],
          });
          break fo;
        }
        case "aws_refresh_running": {
          let awsRefreshRunningElement;
          if ($[102] !== setOAuthStatus) {
            awsRefreshRunningElement = jsxProd_default(call, {
              onComplete: (ok) =>
                setOAuthStatus({
                  state: "aws_refresh_done",
                  ok,
                }),
            });
            $[102] = setOAuthStatus;
            $[103] = awsRefreshRunningElement;
          } else awsRefreshRunningElement = $[103];
          contentElement = awsRefreshRunningElement;
          break fo;
        }
        case "aws_refresh_done": {
          let awsRefreshResultText;
          if ($[104] !== oauthStatus.ok) {
            awsRefreshResultText = oauthStatus.ok
              ? jsxProd_default(Text, {
                  color: "success",
                  children: "AWS credentials refreshed.",
                })
              : jsxProd_default(Text, {
                  color: "error",
                  children:
                    "awsAuthRefresh failed. Check the command in your settings and try running it in a separate terminal.",
                });
            $[104] = oauthStatus.ok;
            $[105] = awsRefreshResultText;
          } else awsRefreshResultText = $[105];
          let pressEnterToContinue;
          if ($[106] === MEMO_CACHE_SENTINEL) {
            pressEnterToContinue = jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "Press ",
                jsxProd_default(Text, {
                  bold: true,
                  children: "Enter",
                }),
                " to continue.",
              ],
            });
            $[106] = pressEnterToContinue;
          } else pressEnterToContinue = $[106];
          let awsRefreshDoneElement;
          if ($[107] !== awsRefreshResultText) {
            awsRefreshDoneElement = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [awsRefreshResultText, pressEnterToContinue],
            });
            $[107] = awsRefreshResultText;
            $[108] = awsRefreshDoneElement;
          } else awsRefreshDoneElement = $[108];
          contentElement = awsRefreshDoneElement;
          break fo;
        }
        case "bedrock_wizard": {
          let bedrockWizardElement;
          if ($[109] !== setOAuthStatus) {
            bedrockWizardElement = jsxProd_default(CreateAgentWizard, {
              onComplete: (message) =>
                setOAuthStatus({
                  state: "bedrock_done",
                  message,
                }),
              onCancel: () =>
                setOAuthStatus({
                  state: "platform_setup",
                }),
              exitOnCtrlCD: true,
            });
            $[109] = setOAuthStatus;
            $[110] = bedrockWizardElement;
          } else bedrockWizardElement = $[110];
          contentElement = bedrockWizardElement;
          break fo;
        }
        case "bedrock_done":
        case "vertex_done": {
          let wizardDoneMessage;
          if ($[111] !== oauthStatus.message) {
            wizardDoneMessage = jsxProd_default(Text, {
              color: "success",
              children: oauthStatus.message,
            });
            $[111] = oauthStatus.message;
            $[112] = wizardDoneMessage;
          } else wizardDoneMessage = $[112];
          let pressEnterToRestart;
          if ($[113] === MEMO_CACHE_SENTINEL) {
            pressEnterToRestart = jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "Press ",
                jsxProd_default(Text, {
                  bold: true,
                  children: "Enter",
                }),
                " to restart Claude Code.",
              ],
            });
            $[113] = pressEnterToRestart;
          } else pressEnterToRestart = $[113];
          let wizardDoneElement;
          if ($[114] !== wizardDoneMessage) {
            wizardDoneElement = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [wizardDoneMessage, pressEnterToRestart],
            });
            $[114] = wizardDoneMessage;
            $[115] = wizardDoneElement;
          } else wizardDoneElement = $[115];
          contentElement = wizardDoneElement;
          break fo;
        }
        case "vertex_wizard": {
          let vertexWizardElement;
          if ($[116] !== setOAuthStatus) {
            vertexWizardElement = jsxProd_default(VertexSetupWizard, {
              onComplete: (message) =>
                setOAuthStatus({
                  state: "vertex_done",
                  message,
                }),
              onCancel: () =>
                setOAuthStatus({
                  state: "platform_setup",
                }),
              exitOnCtrlCD: true,
            });
            $[116] = setOAuthStatus;
            $[117] = vertexWizardElement;
          } else vertexWizardElement = $[117];
          contentElement = vertexWizardElement;
          break fo;
        }
        case "waiting_for_login": {
          let forcedMethodElement;
          if ($[118] !== forcedMethodMessage) {
            forcedMethodElement =
              forcedMethodMessage &&
              jsxProd_default(Box, {
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: forcedMethodMessage,
                }),
              });
            $[118] = forcedMethodMessage;
            $[119] = forcedMethodElement;
          } else forcedMethodElement = $[119];
          let fallbackReasonElement;
          if ($[120] !== keyMintFallbackReason) {
            fallbackReasonElement =
              keyMintFallbackReason &&
              jsxProd_default(Box, {
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: `${RECOMMENDED_SIGNIN_UNAVAILABLE_TEXT} (${keyMintFallbackReason.cause}), so this sign-in will create an API key.`,
                }),
              });
            $[120] = keyMintFallbackReason;
            $[121] = fallbackReasonElement;
          } else fallbackReasonElement = $[121];
          let browserOpeningElement;
          if ($[122] !== showPastePrompt) {
            browserOpeningElement =
              !showPastePrompt &&
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default(Spinner, {}),
                  jsxProd_default(Text, {
                    children: "Opening browser to sign in\u2026",
                  }),
                ],
              });
            $[122] = showPastePrompt;
            $[123] = browserOpeningElement;
          } else browserOpeningElement = $[123];
          let pasteCodeElement;
          if (
            $[124] !== cursorOffset ||
            $[125] !== handleSubmitCode ||
            $[126] !== showCursor ||
            $[127] !== oauthStatus.url ||
            $[128] !== pasteCodePrompt ||
            $[129] !== pastedCode ||
            $[130] !== setCursorOffset ||
            $[131] !== setPastedCode ||
            $[132] !== showPastePrompt ||
            $[133] !== textInputColumns
          ) {
            pasteCodeElement =
              showPastePrompt &&
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default(Text, {
                    children: pasteCodePrompt,
                  }),
                  jsxProd_default(TextInput, {
                    value: pastedCode,
                    onChange: setPastedCode,
                    onSubmit: (submittedCode) => handleSubmitCode(submittedCode, oauthStatus.url),
                    cursorOffset,
                    onChangeCursorOffset: setCursorOffset,
                    columns: textInputColumns,
                    mask: "*",
                    focus: true,
                    showCursor,
                  }),
                ],
              });
            $[124] = cursorOffset;
            $[125] = handleSubmitCode;
            $[126] = showCursor;
            $[127] = oauthStatus.url;
            $[128] = pasteCodePrompt;
            $[129] = pastedCode;
            $[130] = setCursorOffset;
            $[131] = setPastedCode;
            $[132] = showPastePrompt;
            $[133] = textInputColumns;
            $[134] = pasteCodeElement;
          } else pasteCodeElement = $[134];
          let creatingKeyElement;
          if (
            $[135] !== forcedMethodElement ||
            $[136] !== fallbackReasonElement ||
            $[137] !== browserOpeningElement ||
            $[138] !== pasteCodeElement
          ) {
            creatingKeyElement = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [forcedMethodElement, fallbackReasonElement, browserOpeningElement, pasteCodeElement],
            });
            $[135] = forcedMethodElement;
            $[136] = fallbackReasonElement;
            $[137] = browserOpeningElement;
            $[138] = pasteCodeElement;
            $[139] = creatingKeyElement;
          } else creatingKeyElement = $[139];
          contentElement = creatingKeyElement;
          break fo;
        }
        case "about_to_retry": {
          let retryingElement;
          if ($[140] === MEMO_CACHE_SENTINEL) {
            retryingElement = jsxProd_default(Box, {
              flexDirection: "column",
              gap: 1,
              children: jsxProd_default(Text, {
                color: "permission",
                children: "Retrying\u2026",
              }),
            });
            $[140] = retryingElement;
          } else retryingElement = $[140];
          contentElement = retryingElement;
          break fo;
        }
        case "success": {
          let children;
          if ($[141] !== mode || $[142] !== oauthStatus.notice || $[143] !== oauthStatus.token) {
            children =
              mode === "setup-token" && oauthStatus.token
                ? null
                : jsxProd_default_2(Fragment, {
                    children: [
                      getOauthAccountInfo()?.emailAddress
                        ? jsxProd_default_2(Text, {
                            dimColor: true,
                            children: [
                              "Logged in as",
                              " ",
                              jsxProd_default(Text, {
                                children: getOauthAccountInfo()?.emailAddress,
                              }),
                            ],
                          })
                        : null,
                      jsxProd_default(ManagedSettingsLoginNotice, {}),
                      jsxProd_default_2(Text, {
                        color: "success",
                        children: [
                          "Login successful. Press ",
                          jsxProd_default(Text, {
                            bold: true,
                            children: "Enter",
                          }),
                          " to continue\u2026",
                        ],
                      }),
                      oauthStatus.notice
                        ? jsxProd_default(Text, {
                            color: "warning",
                            children: oauthStatus.notice,
                          })
                        : null,
                    ],
                  });
            $[141] = mode;
            $[142] = oauthStatus.notice;
            $[143] = oauthStatus.token;
            $[144] = children;
          } else children = $[144];
          let successElement;
          if ($[145] !== children) {
            successElement = jsxProd_default(Box, {
              flexDirection: "column",
              children,
            });
            $[145] = children;
            $[146] = successElement;
          } else successElement = $[146];
          contentElement = successElement;
          break fo;
        }
        case "storage_failed": {
          let storageLabel;
          if ($[147] !== oauthStatus.backendName) {
            storageLabel = secureStorageLabel(oauthStatus.backendName);
            $[147] = oauthStatus.backendName;
            $[148] = storageLabel;
          } else storageLabel = $[148];
          let storageLabelStable = storageLabel;
          let key;
          if (
            $[149] !== storageLabelStable ||
            $[150] !== oauthStatus.sessionAuth ||
            $[151] !== oauthStatus.transient
          ) {
            key = jsxProd_default(Box, {
              flexDirection: "column",
              children:
                oauthStatus.sessionAuth === "fresh"
                  ? jsxProd_default_2(Fragment, {
                      children: [
                        jsxProd_default(Text, {
                          color: "warning",
                          children: oauthStatus.transient
                            ? `Logged in for now, but Claude Code couldn't confirm your new credentials were saved to ${storageLabelStable}.`
                            : `Logged in for now, but your new credentials could not be saved to ${storageLabelStable}.`,
                        }),
                        jsxProd_default(Text, {
                          color: "warning",
                          children: oauthStatus.transient
                            ? "This login may expire mid-session and may not persist after you exit Claude Code."
                            : "This login may expire mid-session and will not persist after you exit Claude Code.",
                        }),
                      ],
                    })
                  : oauthStatus.sessionAuth === "previous"
                    ? jsxProd_default_2(Fragment, {
                        children: [
                          jsxProd_default_2(Text, {
                            color: "error",
                            children: [
                              "Sign-in completed in the browser, but your new credentials could not be saved to ",
                              storageLabelStable,
                              " \u2014 a previous login's credentials are still in place and will be used instead.",
                            ],
                          }),
                          jsxProd_default(Text, {
                            dimColor: true,
                            children: "(Your new sign-in did not replace the existing credentials.)",
                          }),
                        ],
                      })
                    : jsxProd_default_2(Fragment, {
                        children: [
                          jsxProd_default_2(Text, {
                            color: "error",
                            children: [
                              "Sign-in completed in the browser, but your credentials could not be saved to ",
                              storageLabelStable,
                              " \u2014 you are not logged in.",
                            ],
                          }),
                          jsxProd_default(Text, {
                            dimColor: true,
                            children: "(No previous login on this machine is usable right now either.)",
                          }),
                        ],
                      }),
            });
            $[149] = storageLabelStable;
            $[150] = oauthStatus.sessionAuth;
            $[151] = oauthStatus.transient;
            $[152] = key;
          } else key = $[152];
          let content;
          if ($[153] !== oauthStatus.departingLoginMayRemain) {
            content = oauthStatus.departingLoginMayRemain
              ? jsxProd_default(Text, {
                  color: "warning",
                  children: SIGN_IN_AGAIN_TO_CLEAR_MESSAGE,
                })
              : null;
            $[153] = oauthStatus.departingLoginMayRemain;
            $[154] = content;
          } else content = $[154];
          let fixHintIntro;
          if ($[155] === MEMO_CACHE_SENTINEL) {
            fixHintIntro = jsxProd_default(Text, {
              dimColor: true,
              children: "To avoid having to log in again each session:",
            });
            $[155] = fixHintIntro;
          } else fixHintIntro = $[155];
          let fixAccessHint;
          if ($[156] !== storageLabelStable) {
            fixAccessHint = jsxProd_default_2(Text, {
              dimColor: true,
              children: ["  ", "\u2022 fix access to ", storageLabelStable, ", then run /login again"],
            });
            $[156] = storageLabelStable;
            $[157] = fixAccessHint;
          } else fixAccessHint = $[157];
          let setupTokenHint;
          if ($[158] === MEMO_CACHE_SENTINEL) {
            setupTokenHint = jsxProd_default_2(Text, {
              dimColor: true,
              children: ["  ", "\u2022 or run claude setup-token and set CLAUDE_CODE_OAUTH_TOKEN"],
            });
            $[158] = setupTokenHint;
          } else setupTokenHint = $[158];
          let view;
          if ($[159] !== fixAccessHint) {
            view = jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [fixHintIntro, fixAccessHint, setupTokenHint],
            });
            $[159] = fixAccessHint;
            $[160] = view;
          } else view = $[160];
          let renderView;
          if ($[161] !== allowContinueWithoutLogin || $[162] !== oauthStatus.sessionAuth) {
            renderView =
              oauthStatus.sessionAuth === "fresh"
                ? jsxProd_default_2(Text, {
                    color: "permission",
                    children: [
                      "Press ",
                      jsxProd_default(Text, {
                        bold: true,
                        children: "Enter",
                      }),
                      " to continue\u2026",
                    ],
                  })
                : jsxProd_default_2(Text, {
                    color: "permission",
                    children: [
                      "Press ",
                      jsxProd_default(Text, {
                        bold: true,
                        children: "Enter",
                      }),
                      " to retry.",
                      " ",
                      allowContinueWithoutLogin
                        ? jsxProd_default(Text, {
                            dimColor: true,
                            children: jsxProd_default(KeyboardShortcutHint, {
                              chord: "escape",
                              action: "continue without logging in",
                              parens: true,
                            }),
                          })
                        : null,
                    ],
                  });
            $[161] = allowContinueWithoutLogin;
            $[162] = oauthStatus.sessionAuth;
            $[163] = renderView;
          } else renderView = $[163];
          let storageFailedElement;
          if ($[164] !== view || $[165] !== renderView || $[166] !== key || $[167] !== content) {
            storageFailedElement = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [key, content, view, renderView],
            });
            $[164] = view;
            $[165] = renderView;
            $[166] = key;
            $[167] = content;
            $[168] = storageFailedElement;
          } else storageFailedElement = $[168];
          contentElement = storageFailedElement;
          break fo;
        }
        case "account_on_hold": {
          let holdMessageText;
          if ($[169] !== oauthStatus.message) {
            holdMessageText = jsxProd_default(Text, {
              color: "warning",
              children: oauthStatus.message,
            });
            $[169] = oauthStatus.message;
            $[170] = holdMessageText;
          } else holdMessageText = $[170];
          let holdHint;
          if ($[171] !== mode) {
            holdHint =
              mode !== "setup-token" &&
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [
                  "Press ",
                  jsxProd_default(Text, {
                    bold: true,
                    children: "Enter",
                  }),
                  " to go back to login options.",
                ],
              });
            $[171] = mode;
            $[172] = holdHint;
          } else holdHint = $[172];
          let accountOnHoldElement;
          if ($[173] !== holdMessageText || $[174] !== holdHint) {
            accountOnHoldElement = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [holdMessageText, holdHint],
            });
            $[173] = holdMessageText;
            $[174] = holdHint;
            $[175] = accountOnHoldElement;
          } else accountOnHoldElement = $[175];
          contentElement = accountOnHoldElement;
          break fo;
        }
        case "error": {
          let BoxComponent;
          let flexDirection;
          let gap;
          let errorElement;
          if ($[176] !== oauthStatus.message || $[177] !== oauthStatus.verbatim) {
            let urlMatch = oauthStatus.verbatim ? /\s(https:\/\/\S+)$/.exec(oauthStatus.message) : null;
            let urlRaw = urlMatch?.[1];
            let urlTrimmed = urlRaw && trimTrailingPunctuation(urlRaw);
            let urlTrailing = urlRaw && urlTrimmed ? urlRaw.slice(urlTrimmed.length) : "";
            let safeUrl = urlTrimmed ? safeVerificationUrl(urlTrimmed) : undefined;
            BoxComponent = Box;
            flexDirection = "column";
            gap = 1;
            errorElement =
              urlMatch && urlTrimmed
                ? jsxProd_default_2(Box, {
                    flexDirection: "column",
                    children: [
                      jsxProd_default(Text, {
                        color: "error",
                        children: oauthStatus.message.slice(0, urlMatch.index),
                      }),
                      jsxProd_default_2(Text, {
                        color: "error",
                        children: [
                          safeUrl
                            ? jsxProd_default(Link, {
                                url: safeUrl,
                                assumeSupport: true,
                                children: jsxProd_default(Text, {
                                  color: "error",
                                  children: safeUrl,
                                }),
                              })
                            : urlTrimmed,
                          urlTrailing,
                        ],
                      }),
                    ],
                  })
                : jsxProd_default(Text, {
                    color: "error",
                    children: oauthStatus.verbatim
                      ? oauthStatus.message
                      : `OAuth error: ${oauthStatus.message}`,
                  });
            $[176] = oauthStatus.message;
            $[177] = oauthStatus.verbatim;
            $[178] = BoxComponent;
            $[179] = flexDirection;
            $[180] = gap;
            $[181] = errorElement;
          } else {
            BoxComponent = $[178];
            flexDirection = $[179];
            gap = $[180];
            errorElement = $[181];
          }
          let fallbackNoteElement;
          if ($[182] !== keyMintFallbackReason) {
            fallbackNoteElement =
              keyMintFallbackReason &&
              jsxProd_default(Text, {
                dimColor: true,
                children: `${RECOMMENDED_SIGNIN_UNAVAILABLE_TEXT}: ${keyMintFallbackReason.message}`,
              });
            $[182] = keyMintFallbackReason;
            $[183] = fallbackNoteElement;
          } else fallbackNoteElement = $[183];
          let retryHintElement;
          if ($[184] !== allowContinueWithoutLogin || $[185] !== oauthStatus.toRetry) {
            retryHintElement =
              (oauthStatus.toRetry || allowContinueWithoutLogin) &&
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default_2(Text, {
                  color: "permission",
                  children: [
                    oauthStatus.toRetry &&
                      jsxProd_default_2(Fragment, {
                        children: [
                          "Press ",
                          jsxProd_default(Text, {
                            bold: true,
                            children: "Enter",
                          }),
                          " to retry.",
                          " ",
                        ],
                      }),
                    allowContinueWithoutLogin
                      ? jsxProd_default(Text, {
                          dimColor: true,
                          children: jsxProd_default(KeyboardShortcutHint, {
                            chord: "escape",
                            action: "continue without logging in",
                            parens: true,
                          }),
                        })
                      : null,
                  ],
                }),
              });
            $[184] = allowContinueWithoutLogin;
            $[185] = oauthStatus.toRetry;
            $[186] = retryHintElement;
          } else retryHintElement = $[186];
          let errorBlock;
          if (
            $[187] !== BoxComponent ||
            $[188] !== flexDirection ||
            $[189] !== gap ||
            $[190] !== errorElement ||
            $[191] !== fallbackNoteElement ||
            $[192] !== retryHintElement
          ) {
            errorBlock = jsxProd_default_2(BoxComponent, {
              flexDirection,
              gap,
              children: [errorElement, fallbackNoteElement, retryHintElement],
            });
            $[187] = BoxComponent;
            $[188] = flexDirection;
            $[189] = gap;
            $[190] = errorElement;
            $[191] = fallbackNoteElement;
            $[192] = retryHintElement;
            $[193] = errorBlock;
          } else errorBlock = $[193];
          contentElement = errorBlock;
          break fo;
        }
        default: {
          contentElement = null;
          break fo;
        }
      }
    }
    $[1] = allowContinueWithoutLogin;
    $[2] = allowedProviders;
    $[3] = consoleProfileLoginAllowed;
    $[4] = cursorOffset;
    $[5] = firstPartyLoginAllowed;
    $[6] = forceLoginGatewayUrl;
    $[7] = forcedMethodMessage;
    $[8] = gatewayInternalNetworks;
    $[9] = gatewayNamedBy;
    $[10] = gatewayScreenLocked;
    $[11] = gatewayUnsupportedWarning;
    $[12] = handleSubmitCode;
    $[13] = showCursor;
    $[14] = keyMintFallbackReason;
    $[15] = mode;
    $[16] = oauthStatus.backendName;
    $[17] = oauthStatus.departingLoginMayRemain;
    $[18] = oauthStatus.message;
    $[19] = oauthStatus.notice;
    $[20] = oauthStatus.ok;
    $[21] = oauthStatus.sessionAuth;
    $[22] = oauthStatus.state;
    $[23] = oauthStatus.toRetry;
    $[24] = oauthStatus.token;
    $[25] = oauthStatus.transient;
    $[26] = oauthStatus.url;
    $[27] = oauthStatus.verbatim;
    $[28] = onAuthSuccess;
    $[29] = pasteCodePrompt;
    $[30] = pastedCode;
    $[31] = reloadClearedOrgDocuments;
    $[32] = setConsoleProfileLogin;
    $[33] = setCursorOffset;
    $[34] = setHybridRowPicked;
    $[35] = setLoginWithClaudeAi;
    $[36] = setOAuthStatus;
    $[37] = setPastedCode;
    $[38] = showPastePrompt;
    $[39] = startingMessage;
    $[40] = textInputColumns;
    $[41] = contentElement;
  } else contentElement = $[41];
  if (contentElement !== EARLY_RETURN_SENTINEL) return contentElement;
}
//@ chunk-mx6cbnn0.js:40642-41038 placement
/**
 * 安全存储类型的显示名。
 */
function secureStorageLabel(backendName) {
  switch (backendName) {
    case "keychain":
      return "the macOS Keychain";
    case "keychain-with-plaintext-fallback":
      return "the macOS Keychain or the credentials file";
    case "windows-credman":
      return "Windows Credential Manager";
    case "windows-credman-with-plaintext-fallback":
      return "Windows Credential Manager or the credentials file";
    case "plaintext":
      return "the credentials file";
    default:
      return "secure storage";
  }
}
//@ chunk-f94bkgbg.js:21223-22990 fingerprint (2.1.88 match: OAuthStatusMessage, 0.381)
/**
 * 登录状态文案（starting/waiting_for_login/保存凭证等）。
 */
function OAuthStatusMessage(props) {
  let $ = useMemoCache(24);
  let {
    oauthStatus,
    showPastePrompt,
    pastedCode,
    setPastedCode,
    cursorOffset,
    setCursorOffset,
    textInputColumns,
    onSubmitCode,
  } = props;
  let showCursor = useIsScreenReaderEnabled();
  switch (oauthStatus.state) {
    case "starting": {
      let startingBadge;
      if ($[0] === MEMO_CACHE_SENTINEL) {
        startingBadge = jsxProd_default(WorkerBadge, {
          message: "Starting design login\u2026",
        });
        $[0] = startingBadge;
      } else startingBadge = $[0];
      return startingBadge;
    }
    case "waiting_for_login": {
      let waitingBadge;
      if ($[1] === MEMO_CACHE_SENTINEL) {
        waitingBadge = jsxProd_default(WorkerBadge, {
          message: "Waiting for browser authorization\u2026",
        });
        $[1] = waitingBadge;
      } else waitingBadge = $[1];
      let pasteBox;
      if (
        $[2] !== cursorOffset ||
        $[3] !== showCursor ||
        $[4] !== oauthStatus.url ||
        $[5] !== onSubmitCode ||
        $[6] !== pastedCode ||
        $[7] !== setCursorOffset ||
        $[8] !== setPastedCode ||
        $[9] !== showPastePrompt ||
        $[10] !== textInputColumns
      ) {
        pasteBox =
          showPastePrompt &&
          jsxProd_default_2(Box, {
            children: [
              jsxProd_default(Text, {
                children: PASTE_CODE_PROMPT_3,
              }),
              jsxProd_default(TextInput, {
                value: pastedCode,
                onChange: setPastedCode,
                onSubmit: (value_0) => onSubmitCode(value_0, oauthStatus.url),
                cursorOffset,
                onChangeCursorOffset: setCursorOffset,
                columns: textInputColumns,
                focus: true,
                showCursor,
              }),
            ],
          });
        $[2] = cursorOffset;
        $[3] = showCursor;
        $[4] = oauthStatus.url;
        $[5] = onSubmitCode;
        $[6] = pastedCode;
        $[7] = setCursorOffset;
        $[8] = setPastedCode;
        $[9] = showPastePrompt;
        $[10] = textInputColumns;
        $[11] = pasteBox;
      } else pasteBox = $[11];
      let waitingBox;
      if ($[12] !== pasteBox) {
        waitingBox = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [waitingBadge, pasteBox],
        });
        $[12] = pasteBox;
        $[13] = waitingBox;
      } else waitingBox = $[13];
      return waitingBox;
    }
    case "processing": {
      let savingBadge;
      if ($[14] === MEMO_CACHE_SENTINEL) {
        savingBadge = jsxProd_default(WorkerBadge, {
          message: "Saving design credential\u2026",
        });
        $[14] = savingBadge;
      } else savingBadge = $[14];
      return savingBadge;
    }
    case "success": {
      let successView;
      if ($[15] === MEMO_CACHE_SENTINEL) {
        successView = jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              color: "success",
              children:
                "Design-system access authorized. /design-sync can now reach your claude.ai/design projects.",
            }),
            jsxProd_default(DesignOAuthWarning, {}),
          ],
        });
        $[15] = successView;
      } else successView = $[15];
      return successView;
    }
    case "error": {
      let errorText;
      if ($[16] !== oauthStatus.message) {
        errorText = jsxProd_default(Text, {
          color: "error",
          children: oauthStatus.message,
        });
        $[16] = oauthStatus.message;
        $[17] = errorText;
      } else errorText = $[17];
      const children = oauthStatus.toRetry
        ? "Press Enter to retry, or any other key to cancel."
        : "Press any key to close.";
      let hintText;
      if ($[18] !== children) {
        hintText = jsxProd_default(Text, {
          dimColor: true,
          children,
        });
        $[18] = children;
        $[19] = hintText;
      } else hintText = $[19];
      let errorBox;
      if ($[20] !== errorText || $[21] !== hintText) {
        errorBox = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [errorText, hintText],
        });
        $[20] = errorText;
        $[21] = hintText;
        $[22] = errorBox;
      } else errorBox = $[22];
      return errorBox;
    }
    case "about_to_retry": {
      let retryingText;
      if ($[23] === MEMO_CACHE_SENTINEL) {
        retryingText = jsxProd_default(Text, {
          color: "permission",
          children: "Retrying\u2026",
        });
        $[23] = retryingText;
      } else retryingText = $[23];
      return retryingText;
    }
  }
}
export { ConsoleOAuthFlow, OAuthStatusMessage };

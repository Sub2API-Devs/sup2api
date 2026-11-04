/**
 * components/ConsoleOAuthFlow.tsx
 *
 * 登录流程：选择订阅（claude.ai）/API 计费（console）/网关，启动 OAuth、等待浏览器授权或粘贴代码、保存凭证。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ConsoleOAuthFlow.tsx
 * pieces: chunk-s5p7fp0c.js (11), chunk-zkzpd9ky.js (1)
 * attribution: placement 8, callgraph-fingerprint 1, layout 1, facade-exports 1, fingerprint 1
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
import { getInitialSettings_2 } from "../utils/settings/settings.js";
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
import {
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

//@ chunk-s5p7fp0c.js:12637-12641 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s5p7fp0c.js:12637", () => {
  init_react_production();
});
//@ chunk-s5p7fp0c.js:12641-12920 placement
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
//@ chunk-s5p7fp0c.js:12920-12952 placement
function titleOf(option) {
  return option.title;
}
//@ chunk-s5p7fp0c.js:12952-13069 placement
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
//@ chunk-s5p7fp0c.js:13069-13113 placement
function isFoundryAuthMethod(option) {
  return option.value === "foundry";
}
//@ chunk-s5p7fp0c.js:13113-13214 callgraph-fingerprint (2.1.88 match: PASTE_HERE_MSG, 0.632)
var PASTE_CODE_PROMPT = "Paste code here if prompted > ";
var RECOMMENDED_SIGNIN_UNAVAILABLE_TEXT = "The recommended sign-in isn't available on this machine";
//@ chunk-s5p7fp0c.js:13214-13339 layout
function formatTokenLifetimeDays(seconds) {
  let rounded = Math.round(seconds / 86400);
  if (rounded < 1) return "less than a day";
  if (rounded === 365) return "1 year";
  return `${rounded} ${plural(rounded, "day")}`;
}
//@ chunk-s5p7fp0c.js:13339-24518 facade-exports (2.1.88 match: ConsoleOAuthFlow, 0.507)
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
  let initialSettings = getInitialSettings_2();
  let [userSettings] = useState(getUserSettingsGateway);
  let forcedGatewayLogin = getForcedGatewayLogin(userSettings);
  let forcedGateway = forcedGatewayLogin?.url === undefined ? undefined : forcedGatewayLogin;
  let forcedLoginMethod = getForcedLoginMethod();
  let isGatewayForced = forcedLoginMethod === "gateway";
  let loginMethod = isGatewayForced ? "gateway" : (forceLoginMethod ?? forcedLoginMethod);
  let forcedMethodMessage =
    loginMethod === "claudeai"
      ? "Login method pre-selected: Subscription Plan (Claude Pro/Max)"
      : loginMethod === "console"
        ? "Login method pre-selected: API usage billing (Anthropic Console)"
        : null;
  let Y = null;
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
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
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
          await loginWithConsoleProfile(oauthService, async (url) => onAuthorizationUrl(url), {
            orgUUID: forceLoginOrgUUID,
            onCallbackListenerUnavailable,
            onInstallStart: () => {
              consoleInstallSource = "previous";
            },
          });
          consoleInstallSource = "new";
          setOAuthStatus({
            state: "success",
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
            setOAuthStatus({
              state: "success",
              ...(warning !== undefined && {
                notice: warning,
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
//@ chunk-s5p7fp0c.js:25025-25420 placement
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
//@ chunk-s5p7fp0c.js:25420-40330 placement
/**
 * 登录流程主视图：选择方式、OAuth 状态、粘贴授权码、网关与第三方提供方。
 */
function ConsoleOAuthFlowView(props) {
  let $ = useMemoCache(191);
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
    $[17] !== oauthStatus.message ||
    $[18] !== oauthStatus.notice ||
    $[19] !== oauthStatus.ok ||
    $[20] !== oauthStatus.sessionAuth ||
    $[21] !== oauthStatus.state ||
    $[22] !== oauthStatus.toRetry ||
    $[23] !== oauthStatus.token ||
    $[24] !== oauthStatus.transient ||
    $[25] !== oauthStatus.url ||
    $[26] !== oauthStatus.verbatim ||
    $[27] !== onAuthSuccess ||
    $[28] !== pasteCodePrompt ||
    $[29] !== pastedCode ||
    $[30] !== reloadClearedOrgDocuments ||
    $[31] !== setConsoleProfileLogin ||
    $[32] !== setCursorOffset ||
    $[33] !== setHybridRowPicked ||
    $[34] !== setLoginWithClaudeAi ||
    $[35] !== setOAuthStatus ||
    $[36] !== setPastedCode ||
    $[37] !== showPastePrompt ||
    $[38] !== startingMessage ||
    $[39] !== textInputColumns
  ) {
    contentElement = EARLY_RETURN_SENTINEL;
    mo: {
      let providerFilter;
      if ($[41] !== allowedProviders) {
        providerFilter = (provider) =>
          (allowedProviders === undefined ||
            provider.providers.some((provider) => allowedProviders.includes(provider))) &&
          (provider.value !== "aws_refresh" || !!awsRefreshConfig);
        $[41] = allowedProviders;
        $[42] = providerFilter;
      } else providerFilter = $[42];
      let filtered = THIRD_PARTY_PROVIDER_OPTIONS.filter(providerFilter);
      let hybridLabel;
      switch (oauthStatus.state) {
        case "idle": {
          const children = startingMessage
            ? startingMessage
            : "Claude Code can be used with your Claude subscription or billed based on API usage through your Console account.";
          let introElement;
          if ($[43] !== children) {
            introElement = jsxProd_default(Text, {
              bold: true,
              children,
            });
            $[43] = children;
            $[44] = introElement;
          } else introElement = $[44];
          let gatewayWarningElement;
          if ($[45] !== gatewayUnsupportedWarning) {
            gatewayWarningElement =
              gatewayUnsupportedWarning &&
              jsxProd_default(Text, {
                color: "warning",
                children: gatewayUnsupportedWarning,
              });
            $[45] = gatewayUnsupportedWarning;
            $[46] = gatewayWarningElement;
          } else gatewayWarningElement = $[46];
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
          if ($[47] === MEMO_CACHE_SENTINEL) {
            selectPromptElement = jsxProd_default(Text, {
              children: "Select login method:",
            });
            $[47] = selectPromptElement;
          } else selectPromptElement = $[47];
          let firstPartyOptions;
          if ($[48] !== firstPartyLoginAllowed) {
            firstPartyOptions = firstPartyLoginAllowed
              ? [
                  {
                    label: jsxProd_default_2(Text, {
                      children: [
                        "Claude account with subscription \xB7",
                        " ",
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: "Pro, Max, Team, or Enterprise",
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
            $[48] = firstPartyLoginAllowed;
            $[49] = firstPartyOptions;
          } else firstPartyOptions = $[49];
          let hybridOptions;
          if ($[50] === MEMO_CACHE_SENTINEL) {
            hybridOptions =
              hybridLabel !== undefined
                ? [
                    {
                      label: hybridLabel,
                      value: "hybrid",
                    },
                  ]
                : [];
            $[50] = hybridOptions;
          } else hybridOptions = $[50];
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
          if ($[51] !== thirdPartyOptions || $[52] !== firstPartyOptions) {
            options = [...firstPartyOptions, ...hybridOptions, ...thirdPartyOptions];
            $[51] = thirdPartyOptions;
            $[52] = firstPartyOptions;
            $[53] = options;
          } else options = $[53];
          let onChange;
          if (
            $[54] !== consoleProfileLoginAllowed ||
            $[55] !== setConsoleProfileLogin ||
            $[56] !== setHybridRowPicked ||
            $[57] !== setLoginWithClaudeAi ||
            $[58] !== setOAuthStatus
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
            $[54] = consoleProfileLoginAllowed;
            $[55] = setConsoleProfileLogin;
            $[56] = setHybridRowPicked;
            $[57] = setLoginWithClaudeAi;
            $[58] = setOAuthStatus;
            $[59] = onChange;
          } else onChange = $[59];
          let selectorElement;
          if ($[60] !== options || $[61] !== onChange) {
            selectorElement = jsxProd_default(Box, {
              children: jsxProd_default(ModelSelector, {
                options,
                onChange,
              }),
            });
            $[60] = options;
            $[61] = onChange;
            $[62] = selectorElement;
          } else selectorElement = $[62];
          let idleElement;
          if (
            $[63] !== selectorElement ||
            $[64] !== introElement ||
            $[65] !== gatewayWarningElement ||
            $[66] !== noProvidersElement
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
            $[63] = selectorElement;
            $[64] = introElement;
            $[65] = gatewayWarningElement;
            $[66] = noProvidersElement;
            $[67] = idleElement;
          } else idleElement = $[67];
          contentElement = idleElement;
          break mo;
        }
        case "gateway_setup": {
          let onDone;
          if ($[68] !== onAuthSuccess || $[69] !== reloadClearedOrgDocuments || $[70] !== setOAuthStatus) {
            onDone = () => {
              onAuthSuccess?.();
              reloadClearedOrgDocuments("new");
              setOAuthStatus({
                state: "gateway_done",
              });
            };
            $[68] = onAuthSuccess;
            $[69] = reloadClearedOrgDocuments;
            $[70] = setOAuthStatus;
            $[71] = onDone;
          } else onDone = $[71];
          let onCancel;
          if ($[72] !== setOAuthStatus) {
            onCancel = () =>
              setOAuthStatus({
                state: "idle",
              });
            $[72] = setOAuthStatus;
            $[73] = onCancel;
          } else onCancel = $[73];
          let gatewaySetupElement;
          if (
            $[74] !== forceLoginGatewayUrl ||
            $[75] !== gatewayInternalNetworks ||
            $[76] !== gatewayNamedBy ||
            $[77] !== gatewayScreenLocked ||
            $[78] !== onDone ||
            $[79] !== onCancel
          ) {
            gatewaySetupElement = jsxProd_default(GatewayLogin, {
              initialUrl: forceLoginGatewayUrl,
              namedBy: gatewayNamedBy,
              internalNetworks: gatewayInternalNetworks,
              screenLocked: gatewayScreenLocked,
              onDone,
              onCancel,
            });
            $[74] = forceLoginGatewayUrl;
            $[75] = gatewayInternalNetworks;
            $[76] = gatewayNamedBy;
            $[77] = gatewayScreenLocked;
            $[78] = onDone;
            $[79] = onCancel;
            $[80] = gatewaySetupElement;
          } else gatewaySetupElement = $[80];
          contentElement = gatewaySetupElement;
          break mo;
        }
        case "gateway_done": {
          let gatewayDoneText;
          if ($[81] === MEMO_CACHE_SENTINEL) {
            gatewayDoneText = jsxProd_default(Text, {
              color: "success",
              children: "Connected to Cloud gateway.",
            });
            $[81] = gatewayDoneText;
          } else gatewayDoneText = $[81];
          let gatewayDoneElement;
          if ($[82] === MEMO_CACHE_SENTINEL) {
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
            $[82] = gatewayDoneElement;
          } else gatewayDoneElement = $[82];
          contentElement = gatewayDoneElement;
          break mo;
        }
        case "console_method": {
          let consoleMethodTitle;
          let consoleMethodPrompt;
          if ($[83] === MEMO_CACHE_SENTINEL) {
            consoleMethodTitle = jsxProd_default(Text, {
              bold: true,
              children: "Anthropic Console account",
            });
            consoleMethodPrompt = jsxProd_default(Text, {
              children: "How do you want to sign in?",
            });
            $[83] = consoleMethodTitle;
            $[84] = consoleMethodPrompt;
          } else {
            consoleMethodTitle = $[83];
            consoleMethodPrompt = $[84];
          }
          let wifOption;
          if ($[85] === MEMO_CACHE_SENTINEL) {
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
            $[85] = wifOption;
          } else wifOption = $[85];
          let legacyBadge;
          if ($[86] === MEMO_CACHE_SENTINEL) {
            legacyBadge = jsxProd_default(Text, {
              dimColor: true,
              children: "(legacy)",
            });
            $[86] = legacyBadge;
          } else legacyBadge = $[86];
          let options;
          if ($[87] === MEMO_CACHE_SENTINEL) {
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
            $[87] = options;
          } else options = $[87];
          let onCancel;
          if ($[88] !== setOAuthStatus) {
            onCancel = () =>
              setOAuthStatus({
                state: "idle",
              });
            $[88] = setOAuthStatus;
            $[89] = onCancel;
          } else onCancel = $[89];
          let onChange;
          if (
            $[90] !== setConsoleProfileLogin ||
            $[91] !== setLoginWithClaudeAi ||
            $[92] !== setOAuthStatus
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
            $[90] = setConsoleProfileLogin;
            $[91] = setLoginWithClaudeAi;
            $[92] = setOAuthStatus;
            $[93] = onChange;
          } else onChange = $[93];
          let consoleMethodElement;
          if ($[94] !== onChange || $[95] !== onCancel) {
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
            $[94] = onChange;
            $[95] = onCancel;
            $[96] = consoleMethodElement;
          } else consoleMethodElement = $[96];
          contentElement = consoleMethodElement;
          break mo;
        }
        case "platform_setup": {
          let platformTitle;
          if ($[97] === MEMO_CACHE_SENTINEL) {
            platformTitle = jsxProd_default(Text, {
              bold: true,
              children: "Using 3rd-party platforms",
            });
            $[97] = platformTitle;
          } else platformTitle = $[97];
          const options = [
            ...filtered.map(providerOption),
            {
              label: "Go back",
              value: "back",
            },
          ];
          let onChange;
          let onCancel;
          if ($[98] !== setOAuthStatus) {
            onChange = (selectedValue) => {
              _t: switch (selectedValue) {
                case "bedrock": {
                  logEvent("tengu_oauth_bedrock_wizard_launched", {});
                  setOAuthStatus({
                    state: "bedrock_wizard",
                  });
                  break _t;
                }
                case "aws_refresh": {
                  logEvent("tengu_oauth_aws_refresh_launched", {});
                  setOAuthStatus({
                    state: "aws_refresh_running",
                  });
                  break _t;
                }
                case "foundry": {
                  logEvent("tengu_oauth_platform_docs_opened", {
                    platform: lit("foundry"),
                  });
                  openValidatedUrlSucceeded("https://code.claude.com/docs/en/microsoft-foundry");
                  setOAuthStatus({
                    state: "idle",
                  });
                  break _t;
                }
                case "vertex": {
                  logEvent("tengu_oauth_vertex_wizard_launched", {});
                  setOAuthStatus({
                    state: "vertex_wizard",
                  });
                  break _t;
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
            $[98] = setOAuthStatus;
            $[99] = onChange;
            $[100] = onCancel;
          } else {
            onChange = $[99];
            onCancel = $[100];
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
          break mo;
        }
        case "aws_refresh_running": {
          let awsRefreshRunningElement;
          if ($[101] !== setOAuthStatus) {
            awsRefreshRunningElement = jsxProd_default(call, {
              onComplete: (ok) =>
                setOAuthStatus({
                  state: "aws_refresh_done",
                  ok,
                }),
            });
            $[101] = setOAuthStatus;
            $[102] = awsRefreshRunningElement;
          } else awsRefreshRunningElement = $[102];
          contentElement = awsRefreshRunningElement;
          break mo;
        }
        case "aws_refresh_done": {
          let awsRefreshResultText;
          if ($[103] !== oauthStatus.ok) {
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
            $[103] = oauthStatus.ok;
            $[104] = awsRefreshResultText;
          } else awsRefreshResultText = $[104];
          let pressEnterToContinue;
          if ($[105] === MEMO_CACHE_SENTINEL) {
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
            $[105] = pressEnterToContinue;
          } else pressEnterToContinue = $[105];
          let awsRefreshDoneElement;
          if ($[106] !== awsRefreshResultText) {
            awsRefreshDoneElement = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [awsRefreshResultText, pressEnterToContinue],
            });
            $[106] = awsRefreshResultText;
            $[107] = awsRefreshDoneElement;
          } else awsRefreshDoneElement = $[107];
          contentElement = awsRefreshDoneElement;
          break mo;
        }
        case "bedrock_wizard": {
          let bedrockWizardElement;
          if ($[108] !== setOAuthStatus) {
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
            $[108] = setOAuthStatus;
            $[109] = bedrockWizardElement;
          } else bedrockWizardElement = $[109];
          contentElement = bedrockWizardElement;
          break mo;
        }
        case "bedrock_done":
        case "vertex_done": {
          let wizardDoneMessage;
          if ($[110] !== oauthStatus.message) {
            wizardDoneMessage = jsxProd_default(Text, {
              color: "success",
              children: oauthStatus.message,
            });
            $[110] = oauthStatus.message;
            $[111] = wizardDoneMessage;
          } else wizardDoneMessage = $[111];
          let pressEnterToRestart;
          if ($[112] === MEMO_CACHE_SENTINEL) {
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
            $[112] = pressEnterToRestart;
          } else pressEnterToRestart = $[112];
          let wizardDoneElement;
          if ($[113] !== wizardDoneMessage) {
            wizardDoneElement = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [wizardDoneMessage, pressEnterToRestart],
            });
            $[113] = wizardDoneMessage;
            $[114] = wizardDoneElement;
          } else wizardDoneElement = $[114];
          contentElement = wizardDoneElement;
          break mo;
        }
        case "vertex_wizard": {
          let vertexWizardElement;
          if ($[115] !== setOAuthStatus) {
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
            $[115] = setOAuthStatus;
            $[116] = vertexWizardElement;
          } else vertexWizardElement = $[116];
          contentElement = vertexWizardElement;
          break mo;
        }
        case "waiting_for_login": {
          let forcedMethodElement;
          if ($[117] !== forcedMethodMessage) {
            forcedMethodElement =
              forcedMethodMessage &&
              jsxProd_default(Box, {
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: forcedMethodMessage,
                }),
              });
            $[117] = forcedMethodMessage;
            $[118] = forcedMethodElement;
          } else forcedMethodElement = $[118];
          let fallbackReasonElement;
          if ($[119] !== keyMintFallbackReason) {
            fallbackReasonElement =
              keyMintFallbackReason &&
              jsxProd_default(Box, {
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: `${RECOMMENDED_SIGNIN_UNAVAILABLE_TEXT} (${keyMintFallbackReason.cause}), so this sign-in will create an API key.`,
                }),
              });
            $[119] = keyMintFallbackReason;
            $[120] = fallbackReasonElement;
          } else fallbackReasonElement = $[120];
          let browserOpeningElement;
          if ($[121] !== showPastePrompt) {
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
            $[121] = showPastePrompt;
            $[122] = browserOpeningElement;
          } else browserOpeningElement = $[122];
          let pasteCodeElement;
          if (
            $[123] !== cursorOffset ||
            $[124] !== handleSubmitCode ||
            $[125] !== showCursor ||
            $[126] !== oauthStatus.url ||
            $[127] !== pasteCodePrompt ||
            $[128] !== pastedCode ||
            $[129] !== setCursorOffset ||
            $[130] !== setPastedCode ||
            $[131] !== showPastePrompt ||
            $[132] !== textInputColumns
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
            $[123] = cursorOffset;
            $[124] = handleSubmitCode;
            $[125] = showCursor;
            $[126] = oauthStatus.url;
            $[127] = pasteCodePrompt;
            $[128] = pastedCode;
            $[129] = setCursorOffset;
            $[130] = setPastedCode;
            $[131] = showPastePrompt;
            $[132] = textInputColumns;
            $[133] = pasteCodeElement;
          } else pasteCodeElement = $[133];
          let waitingForLoginElement;
          if (
            $[134] !== forcedMethodElement ||
            $[135] !== fallbackReasonElement ||
            $[136] !== browserOpeningElement ||
            $[137] !== pasteCodeElement
          ) {
            waitingForLoginElement = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [forcedMethodElement, fallbackReasonElement, browserOpeningElement, pasteCodeElement],
            });
            $[134] = forcedMethodElement;
            $[135] = fallbackReasonElement;
            $[136] = browserOpeningElement;
            $[137] = pasteCodeElement;
            $[138] = waitingForLoginElement;
          } else waitingForLoginElement = $[138];
          contentElement = waitingForLoginElement;
          break mo;
        }
        case "creating_api_key": {
          let creatingKeyElement;
          if ($[139] === MEMO_CACHE_SENTINEL) {
            creatingKeyElement = jsxProd_default(Box, {
              flexDirection: "column",
              gap: 1,
              children: jsxProd_default_2(Box, {
                children: [
                  jsxProd_default(Spinner, {}),
                  jsxProd_default(Text, {
                    children: "Creating API key for Claude Code\u2026",
                  }),
                ],
              }),
            });
            $[139] = creatingKeyElement;
          } else creatingKeyElement = $[139];
          contentElement = creatingKeyElement;
          break mo;
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
          break mo;
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
          break mo;
        }
        case "storage_failed": {
          let storageLabel;
          if ($[147] !== oauthStatus.backendName) {
            storageLabel = secureStorageLabel(oauthStatus.backendName);
            $[147] = oauthStatus.backendName;
            $[148] = storageLabel;
          } else storageLabel = $[148];
          let storageLabelStable = storageLabel;
          let storageWarningElement;
          if (
            $[149] !== storageLabelStable ||
            $[150] !== oauthStatus.sessionAuth ||
            $[151] !== oauthStatus.transient
          ) {
            storageWarningElement = jsxProd_default(Box, {
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
            $[152] = storageWarningElement;
          } else storageWarningElement = $[152];
          let fixHintIntro;
          if ($[153] === MEMO_CACHE_SENTINEL) {
            fixHintIntro = jsxProd_default(Text, {
              dimColor: true,
              children: "To avoid having to log in again each session:",
            });
            $[153] = fixHintIntro;
          } else fixHintIntro = $[153];
          let fixAccessHint;
          if ($[154] !== storageLabelStable) {
            fixAccessHint = jsxProd_default_2(Text, {
              dimColor: true,
              children: ["  ", "\u2022 fix access to ", storageLabelStable, ", then run /login again"],
            });
            $[154] = storageLabelStable;
            $[155] = fixAccessHint;
          } else fixAccessHint = $[155];
          let setupTokenHint;
          if ($[156] === MEMO_CACHE_SENTINEL) {
            setupTokenHint = jsxProd_default_2(Text, {
              dimColor: true,
              children: ["  ", "\u2022 or run claude setup-token and set CLAUDE_CODE_OAUTH_TOKEN"],
            });
            $[156] = setupTokenHint;
          } else setupTokenHint = $[156];
          let hintsElement;
          if ($[157] !== fixAccessHint) {
            hintsElement = jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [fixHintIntro, fixAccessHint, setupTokenHint],
            });
            $[157] = fixAccessHint;
            $[158] = hintsElement;
          } else hintsElement = $[158];
          let continuePrompt;
          if ($[159] !== allowContinueWithoutLogin || $[160] !== oauthStatus.sessionAuth) {
            continuePrompt =
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
            $[159] = allowContinueWithoutLogin;
            $[160] = oauthStatus.sessionAuth;
            $[161] = continuePrompt;
          } else continuePrompt = $[161];
          let storageFailedElement;
          if ($[162] !== continuePrompt || $[163] !== storageWarningElement || $[164] !== hintsElement) {
            storageFailedElement = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [storageWarningElement, hintsElement, continuePrompt],
            });
            $[162] = continuePrompt;
            $[163] = storageWarningElement;
            $[164] = hintsElement;
            $[165] = storageFailedElement;
          } else storageFailedElement = $[165];
          contentElement = storageFailedElement;
          break mo;
        }
        case "account_on_hold": {
          let holdMessageText;
          if ($[166] !== oauthStatus.message) {
            holdMessageText = jsxProd_default(Text, {
              color: "warning",
              children: oauthStatus.message,
            });
            $[166] = oauthStatus.message;
            $[167] = holdMessageText;
          } else holdMessageText = $[167];
          let holdHint;
          if ($[168] !== mode) {
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
            $[168] = mode;
            $[169] = holdHint;
          } else holdHint = $[169];
          let accountOnHoldElement;
          if ($[170] !== holdMessageText || $[171] !== holdHint) {
            accountOnHoldElement = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [holdMessageText, holdHint],
            });
            $[170] = holdMessageText;
            $[171] = holdHint;
            $[172] = accountOnHoldElement;
          } else accountOnHoldElement = $[172];
          contentElement = accountOnHoldElement;
          break mo;
        }
        case "error": {
          let BoxComponent;
          let flexDirection;
          let gap;
          let errorElement;
          if ($[173] !== oauthStatus.message || $[174] !== oauthStatus.verbatim) {
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
            $[173] = oauthStatus.message;
            $[174] = oauthStatus.verbatim;
            $[175] = BoxComponent;
            $[176] = flexDirection;
            $[177] = gap;
            $[178] = errorElement;
          } else {
            BoxComponent = $[175];
            flexDirection = $[176];
            gap = $[177];
            errorElement = $[178];
          }
          let fallbackNoteElement;
          if ($[179] !== keyMintFallbackReason) {
            fallbackNoteElement =
              keyMintFallbackReason &&
              jsxProd_default(Text, {
                dimColor: true,
                children: `${RECOMMENDED_SIGNIN_UNAVAILABLE_TEXT}: ${keyMintFallbackReason.message}`,
              });
            $[179] = keyMintFallbackReason;
            $[180] = fallbackNoteElement;
          } else fallbackNoteElement = $[180];
          let retryHintElement;
          if ($[181] !== allowContinueWithoutLogin || $[182] !== oauthStatus.toRetry) {
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
            $[181] = allowContinueWithoutLogin;
            $[182] = oauthStatus.toRetry;
            $[183] = retryHintElement;
          } else retryHintElement = $[183];
          let errorBlock;
          if (
            $[184] !== BoxComponent ||
            $[185] !== flexDirection ||
            $[186] !== gap ||
            $[187] !== errorElement ||
            $[188] !== fallbackNoteElement ||
            $[189] !== retryHintElement
          ) {
            errorBlock = jsxProd_default_2(BoxComponent, {
              flexDirection,
              gap,
              children: [errorElement, fallbackNoteElement, retryHintElement],
            });
            $[184] = BoxComponent;
            $[185] = flexDirection;
            $[186] = gap;
            $[187] = errorElement;
            $[188] = fallbackNoteElement;
            $[189] = retryHintElement;
            $[190] = errorBlock;
          } else errorBlock = $[190];
          contentElement = errorBlock;
          break mo;
        }
        default: {
          contentElement = null;
          break mo;
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
    $[17] = oauthStatus.message;
    $[18] = oauthStatus.notice;
    $[19] = oauthStatus.ok;
    $[20] = oauthStatus.sessionAuth;
    $[21] = oauthStatus.state;
    $[22] = oauthStatus.toRetry;
    $[23] = oauthStatus.token;
    $[24] = oauthStatus.transient;
    $[25] = oauthStatus.url;
    $[26] = oauthStatus.verbatim;
    $[27] = onAuthSuccess;
    $[28] = pasteCodePrompt;
    $[29] = pastedCode;
    $[30] = reloadClearedOrgDocuments;
    $[31] = setConsoleProfileLogin;
    $[32] = setCursorOffset;
    $[33] = setHybridRowPicked;
    $[34] = setLoginWithClaudeAi;
    $[35] = setOAuthStatus;
    $[36] = setPastedCode;
    $[37] = showPastePrompt;
    $[38] = startingMessage;
    $[39] = textInputColumns;
    $[40] = contentElement;
  } else contentElement = $[40];
  if (contentElement !== EARLY_RETURN_SENTINEL) return contentElement;
}
//@ chunk-s5p7fp0c.js:40330-40726 placement
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
//@ chunk-zkzpd9ky.js:20079-21845 fingerprint (2.1.88 match: OAuthStatusMessage, 0.372)
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
      let _;
      if ($[12] !== pasteBox) {
        _ = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [waitingBadge, pasteBox],
        });
        $[12] = pasteBox;
        $[13] = _;
      } else _ = $[13];
      return _;
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
      let _;
      if ($[18] !== children) {
        _ = jsxProd_default(Text, {
          dimColor: true,
          children,
        });
        $[18] = children;
        $[19] = _;
      } else _ = $[19];
      let errorBox;
      if ($[20] !== errorText || $[21] !== _) {
        errorBox = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [errorText, _],
        });
        $[20] = errorText;
        $[21] = _;
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

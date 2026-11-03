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
import { init_react_production, y, P, R, ce } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
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

//@ chunk-s5p7fp0c.js:12637-12641 placement
init_react_production();
//@ chunk-s5p7fp0c.js:12641-12920 placement
function ManagedSettingsLoginNotice() {
  let D = w(6);
  let { storageV5 } = useTheme_2();
  let [o] = y(managedSettingsUrl);
  let M;
  let L;
  if (D[0] !== o || D[1] !== storageV5) {
    M = () => {
      if (o !== undefined) markManagedSettingsNoticeSeen(o, "login_screen", storageV5);
    };
    L = [o, storageV5];
    D[0] = o;
    D[1] = storageV5;
    D[2] = M;
    D[3] = L;
  } else {
    M = D[2];
    L = D[3];
  }
  P(M, L);
  let W;
  if (D[4] !== o) {
    W =
      o === undefined
        ? null
        : jsxProd_default(Text, {
            children: MANAGED_SETTINGS_NOTICE,
          });
    D[4] = o;
    D[5] = W;
  } else W = D[5];
  return W;
}
//@ chunk-s5p7fp0c.js:12920-12952 placement
function titleOf(At) {
  return At.title;
}
//@ chunk-s5p7fp0c.js:12952-13069 placement
function providerOption(Fe) {
  return {
    label: jsxProd_default_2(Text, {
      children: [
        Fe.title,
        " \xB7 ",
        jsxProd_default(Text, {
          dimColor: true,
          children: Fe.hint,
        }),
      ],
    }),
    value: Fe.value,
  };
}
//@ chunk-s5p7fp0c.js:13069-13113 placement
function isFoundryAuthMethod(Pt) {
  return Pt.value === "foundry";
}
//@ chunk-s5p7fp0c.js:13113-13214 callgraph-fingerprint = PASTE_HERE_MSG (0.632)
var PASTE_CODE_PROMPT = "Paste code here if prompted > ";
var RECOMMENDED_SIGNIN_UNAVAILABLE_TEXT = "The recommended sign-in isn't available on this machine";
//@ chunk-s5p7fp0c.js:13214-13339 layout
function formatTokenLifetimeDays(A) {
  let rounded = Math.round(A / 86400);
  if (rounded < 1) return "less than a day";
  if (rounded === 365) return "1 year";
  return `${rounded} ${plural(rounded, "day")}`;
}
//@ chunk-s5p7fp0c.js:13339-24518 facade-exports = ConsoleOAuthFlow (0.507)
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
  let De = useAppStateSlice((K) => K.proactivityLevel);
  let Oe = useAppStateSlice((K) => K.toolPermissionContext);
  let v = (hasScrollViewport ? PANE_WIDTH_RESERVE : 0) + urlOutdent;
  let initialSettings = getInitialSettings_2();
  let [ne] = y(getUserSettingsGateway);
  let forcedGatewayLogin = getForcedGatewayLogin(ne);
  let pe = forcedGatewayLogin?.url === undefined ? undefined : forcedGatewayLogin;
  let forcedLoginMethod = getForcedLoginMethod();
  let ge = forcedLoginMethod === "gateway";
  let V = ge ? "gateway" : (forceLoginMethod ?? forcedLoginMethod);
  let forcedMethodMessage =
    V === "claudeai"
      ? "Login method pre-selected: Subscription Plan (Claude Pro/Max)"
      : V === "console"
        ? "Login method pre-selected: API usage billing (Anthropic Console)"
        : null;
  let Y = null;
  let terminalNotification = useTerminalNotification();
  let clock = useClock();
  let [p, H] = y(() => {
    if (mode === "setup-token")
      return {
        state: "ready_to_start",
      };
    if (V === "claudeai" || V === "console")
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
  let N = R(false);
  P(() => {
    if (p.state !== "idle" && p.state !== "platform_setup" && p.state !== "console_method") N.current = true;
    onFreshPickerChange?.(p.state === "idle" && !N.current);
  }, [p.state, onFreshPickerChange]);
  let [Se, xe] = y("");
  let [cursorOffset, setCursorOffset] = y(0);
  let [oauthService] = y(() => new OAuthService());
  let [loginWithClaudeAi, setLoginWithClaudeAi] = y(() => mode === "setup-token" || V === "claudeai");
  let [I, G] = y(false);
  let [re, ee] = y(null);
  let fe = policyUnreadableForEnforcement();
  let me =
    getAPIProvider() === "firstParty" &&
    !fe &&
    initialSettings.forceLoginOrgUUID === undefined &&
    V !== "claudeai";
  let allowedProviders = getAllowedProviders();
  let firstPartyLoginAllowed = checkAllowedProvider("firstParty") === undefined;
  let [$e] = y(() => false);
  let [Ve, bt] = y(false);
  let mo =
    initialSettings.forceLoginMethod !== undefined &&
    loginWithClaudeAi !== (initialSettings.forceLoginMethod === "claudeai");
  let forceLoginOrgUUID =
    typeof initialSettings.forceLoginOrgUUID === "string" && !mo
      ? initialSettings.forceLoginOrgUUID
      : undefined;
  let [Xe, _t] = y(false);
  let [ot, kt] = y(false);
  let { copiedVia, copy, reset } = useCopyUrl(p.state === "waiting_for_login" ? p.url : null);
  let ze = ot ? PASTE_CODE_PROMPT_2 : PASTE_CODE_PROMPT;
  let textInputColumns = useTerminalSize().columns - ze.length - 1;
  let [Ke] = y(() => isFullscreenActive() && isMouseTrackingEnabled() !== "off");
  P(() => {
    if (V === "claudeai") logEvent("tengu_oauth_claudeai_forced", {});
    else if (V === "console") logEvent("tengu_oauth_console_forced", {});
    else if (ge && true && mode !== "setup-token") logEvent("tengu_oauth_gateway_forced", {});
  }, [V, ge, mode]);
  useTimeout(
    () => {
      if (p.state === "about_to_retry") H(p.nextState);
    },
    p.state === "about_to_retry" ? 1000 : null,
    [p],
  );
  useKeybinding(
    "confirm:yes",
    () => {
      if (p.state !== "storage_failed" && !(p.state === "success" && p.hybrid))
        logEvent(p.state === "gateway_done" ? "tengu_oauth_gateway_done" : "tengu_oauth_success", {
          loginWithClaudeAi,
        });
      onDone();
    },
    {
      context: "Confirmation",
      isActive:
        (p.state === "success" && mode !== "setup-token") ||
        (p.state === "storage_failed" && p.sessionAuth === "fresh") ||
        p.state === "gateway_done",
    },
  );
  let terminal = useApp();
  let St = R(false);
  useKeybinding(
    "confirm:yes",
    () => {
      if (St.current) return;
      St.current = true;
      saveGlobalConfig(
        (K) => ({
          ...K,
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
        let K =
          De !== undefined && Oe !== undefined
            ? withProactivityBaseline({
                proactivityLevel: De,
                toolPermissionContext: Oe,
              })
            : undefined;
        import("./chunk-sv7j935w.js").then((raw) =>
          raw.execRelaunch(
            K
              ? {
                  proactivity: K,
                }
              : {},
          ),
        );
      });
    },
    {
      context: "Confirmation",
      isActive: p.state === "bedrock_done" || p.state === "vertex_done",
    },
  );
  useKeybinding(
    "confirm:yes",
    () =>
      H({
        state: "platform_setup",
      }),
    {
      context: "Confirmation",
      isActive: p.state === "aws_refresh_done",
    },
  );
  useKeybinding(
    "confirm:yes",
    () => {
      if (p.state === "error" && p.toRetry) {
        xe("");
        H({
          state: "about_to_retry",
          nextState: p.toRetry,
        });
      } else if (p.state === "storage_failed" && p.sessionAuth !== "fresh") {
        xe("");
        H({
          state: "about_to_retry",
          nextState:
            V === "claudeai" || V === "console"
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
        (p.state === "error" && !!p.toRetry) || (p.state === "storage_failed" && p.sessionAuth !== "fresh"),
    },
  );
  useKeybinding("confirm:no", () => onDone(), {
    context: "Confirmation",
    isActive:
      allowContinueWithoutLogin &&
      ((p.state === "storage_failed" && p.sessionAuth !== "fresh") || p.state === "error"),
  });
  useKeybinding(
    "confirm:yes",
    () =>
      H({
        state: "idle",
      }),
    {
      context: "Confirmation",
      isActive: p.state === "account_on_hold" && mode !== "setup-token",
    },
  );
  P(() => {
    if (/^c+$/.test(Se) && p.state === "waiting_for_login" && Xe) {
      xe("");
      copy(p.url);
    }
  }, [Se, p, Xe, copy]);
  async function handleSubmitCode(value, url) {
    if (!value.trim()) {
      xe("");
      setCursorOffset(0);
      return;
    }
    try {
      let [authorizationCode, state] = value.split("#");
      if (!authorizationCode || !state) {
        H({
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
      H({
        state: "error",
        message: errorMessage(err),
        toRetry: {
          state: "waiting_for_login",
          url,
        },
      });
    }
  }
  let At = R(new AbortController());
  P(() => {
    let K = At.current;
    return () => K.abort();
  }, []);
  let startOAuth = ce(
    (K) => {
      if (onOrgDocumentsReload) {
        onOrgDocumentsReload(K);
        return;
      }
      MANAGED_RELOAD_NOTICES({
        storageV5,
        credentials,
      });
    },
    [onOrgDocumentsReload, storageV5, credentials],
  );
  let Pt = ce(async () => {
    let K = false;
    kt(false);
    let onCallbackListenerUnavailable = () => {
      K = true;
      kt(true);
    };
    let Ee = (url) => {
      reset();
      _t(false);
      H({
        state: "waiting_for_login",
        url,
      });
      if (K || isBrowserUnavailable()) _t(true);
      else clock.setTimeout(() => _t(true), 3000);
    };
    ee(null);
    try {
      let at = providerBlockedMessage("firstParty");
      if (at !== undefined) throw new ProviderNotAllowedError(at);
      logEvent("tengu_oauth_flow_start", {
        loginWithClaudeAi,
      });
      if (I && mode !== "setup-token") {
        if (!me)
          throw Error(
            "Settings on this machine pin the login method or organization, so signing in without an API key is not available here.",
          );
        let z;
        try {
          await loginWithConsoleProfile(oauthService, async (url) => Ee(url), {
            orgUUID: forceLoginOrgUUID,
            onCallbackListenerUnavailable,
            onInstallStart: () => {
              z = "previous";
            },
          });
          z = "new";
          H({
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
          let be = stripNonPrintable(errorMessage(error));
          ee({
            cause: error.causeSummary !== null ? stripNonPrintable(error.causeSummary) : be,
            message: be,
          });
          logForDebugging(
            `Keyless Console sign-in unavailable here, continuing with the API-key sign-in: ${be}`,
            {
              level: "warn",
            },
          );
        } finally {
          if (z !== undefined) startOAuth(z);
        }
      }
      let settingsOnlyGrant;
      let Lt = [
        async (url) => Ee(url),
        {
          loginWithClaudeAi,
          inferenceOnly: mode === "setup-token",
          expiresIn: mode === "setup-token" ? (expiresIn ?? LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS) : undefined,
          orgUUID: forceLoginOrgUUID,
          onCallbackListenerUnavailable,
          settingsOnlyGrant,
        },
      ];
      let ut;
      ut ??= oauthService.startOAuthFlow(...Lt);
      let result = await ut.catch((err) => {
        if (err instanceof OAuthCallbackError) throw err;
        let isTokenExchangeError = err.message.includes("Token exchange failed");
        let sslHint = getSSLErrorHint(err);
        H({
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
        let z = await mintApiKeyIfAllowed({
          accessToken: result.accessToken,
          minted: result,
        });
        if (!z.ok) throw new OrgConfigLoginRefusedError(z.message, z.evaluation);
        H({
          state: "success",
          token: result.accessToken,
          expiresAt: result.expiresAt ?? undefined,
        });
        onAuthSuccess?.();
      } else {
        let z = await checkNewLoginTokenOrg(result);
        if (z.outcome === "refused") {
          let He = await revokeRefusedSignInToken(result);
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${z.rejection.message}
${He}`,
            "ConsoleOAuthFlow: org pin refused the new token",
          );
        }
        let te = await checkLoginAllowed({
          accessToken: result.accessToken,
          startupGateFollows: orgConfigGateFollows,
          newLogin: result,
          untieredLogin: needsProfileVerification(result),
          organizationName: result.profile?.organization.name ?? result.tokenAccount?.organizationName,
        });
        let warning = te.ok ? te.warning : undefined;
        if (!te.ok)
          if (orgConfigGateFollows && te.evaluation.decision.verdict === "blocked")
            warning = unverifiedSettingsNotice(te.evaluation);
          else {
            let He = await revokeRefusedSignInToken(result);
            throw new OrgConfigLoginRefusedError(`${te.message} ${He}`, te.evaluation);
          }
        if (At.current.signal.aborted) {
          await revokeRefusedSignInToken(result);
          return;
        }
        let It = "previous";
        try {
          let He = await saveLoginOrWarn(result, {
            storageV5,
            credentials,
          });
          let qe = await validateForceLoginOrg(
            credentials,
            z.outcome === "permitted" ? z.verified : undefined,
          );
          if (!qe.valid) {
            let Yt = await LOGIN_REFUSAL_REASONS(qe, He?.storage, {
              storageV5,
              credentials,
            });
            throw Error(
              Yt?.restored === false
                ? `${qe.message}
${rollbackFailureText(Yt)}`
                : qe.message,
            );
          }
          let storage = He?.storage;
          if (storage && !storage.success) {
            H({
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
              It = "new";
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
            H({
              state: "success",
              ...(warning !== undefined && {
                notice: warning,
              }),
            });
            It = "new";
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
          startOAuth(It);
        }
      }
    } catch (err_0) {
      if (isOAuthCallbackError(err_0)) {
        H({
          state: "account_on_hold",
          message: formatAccountOnHoldSignInError(isClaudeAiOrigin(err_0.errorUri)),
        });
        logEvent("tengu_oauth_error", {
          account_on_hold: true,
        });
        return;
      }
      let at = err_0 instanceof OAuthCallbackError ? err_0.displayMessage : errorMessage(err_0);
      let sslHint = getSSLErrorHint(err_0);
      let Lt =
        mode === "setup-token" &&
        err_0 instanceof OrgConfigLoginRefusedError &&
        err_0.evaluation.decision.verdict === "refused";
      let toRetry = {
        state:
          mode === "setup-token" || V === "claudeai" || (V === "console" && !me)
            ? "ready_to_start"
            : V === "console"
              ? "console_method"
              : "idle",
      };
      H({
        state: "error",
        message: sslHint ?? at,
        ...((isVerificationOrMintRefusal(err_0) || err_0 instanceof OrgConfigLoginRefusedError) && {
          verbatim: true,
        }),
        ...(Lt
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
    Ve,
    I,
    me,
    mode,
    expiresIn,
    forceLoginOrgUUID,
    terminalNotification,
    clock,
    onAuthSuccess,
    startOAuth,
    onHybridSignIn,
    V,
    storageV5,
    credentials,
    reset,
  ]);
  let pendingOAuthStartRef = R(false);
  P(() => {
    if (p.state === "ready_to_start" && !pendingOAuthStartRef.current) {
      pendingOAuthStartRef.current = true;
      process.nextTick(
        (startOAuth, pendingOAuthStartRef) => {
          startOAuth().finally(() => {
            pendingOAuthStartRef.current = false;
          });
        },
        Pt,
        pendingOAuthStartRef,
      );
    }
  }, [p.state, Pt]);
  useTimeout(
    () => {
      logEvent("tengu_oauth_success", {
        loginWithClaudeAi,
      });
      onDone();
    },
    mode === "setup-token" && p.state === "success" ? 500 : null,
    [mode, p, loginWithClaudeAi, onDone],
  );
  useTimeout(
    () => onAccountOnHold?.(),
    mode === "setup-token" && p.state === "account_on_hold" ? 500 : null,
    [mode, p, onAccountOnHold],
  );
  useTimeout(
    () => onOrgConfigRefused?.(),
    mode === "setup-token" && p.state === "error" && p.endsCommand === true ? 500 : null,
    [mode, p, onOrgConfigRefused],
  );
  P(
    () => () => {
      oauthService.cleanup();
    },
    [oauthService],
  );
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    gap: 1,
    children: [
      p.state === "waiting_for_login" &&
        Xe &&
        jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            gap: 1,
            paddingBottom: 1,
            marginX: v ? -v : undefined,
            children: [
              jsxProd_default_2(Box, {
                flexDirection: "column",
                paddingX: v,
                children: [
                  ot &&
                    jsxProd_default(Text, {
                      children: MANUAL_CODE_HINT,
                    }),
                  jsxProd_default_2(Box, {
                    children: [
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: ot
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
                  url: p.url,
                  assumeSupport: true,
                  children: jsxProd_default(Text, {
                    dimColor: true,
                    children: p.url,
                  }),
                }),
              }),
              Ke &&
                jsxProd_default(Box, {
                  paddingX: v,
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
        p.state === "success" &&
        p.token &&
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
                        p.expiresAt !== undefined && Number.isFinite(p.expiresAt)
                          ? Math.round((p.expiresAt - Date.now()) / 1000)
                          : (expiresIn ?? LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS),
                      ),
                      "):",
                    ],
                  }),
                  jsxProd_default(Text, {
                    color: "warning",
                    children: p.token,
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
          oauthStatus: p,
          mode,
          startingMessage,
          forcedMethodMessage,
          gatewayUnsupportedWarning: null,
          forceLoginGatewayUrl: pe?.url,
          gatewayNamedBy: pe?.namedBy ?? "developer",
          gatewayInternalNetworks: pe?.internalNetworks,
          gatewayScreenLocked: ge,
          keyMintFallbackReason: re,
          showPastePrompt: Xe,
          pasteCodePrompt: ze,
          pastedCode: Se,
          setPastedCode: xe,
          cursorOffset,
          setCursorOffset,
          textInputColumns,
          handleSubmitCode,
          setOAuthStatus: H,
          setLoginWithClaudeAi,
          setConsoleProfileLogin: G,
          consoleProfileLoginAllowed: me,
          allowedProviders,
          firstPartyLoginAllowed,
          hybridSignInOnly: $e,
          setHybridRowPicked: bt,
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
  let u = w(191);
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
  let p;
  if (u[0] === MEMO_CACHE_SENTINEL) {
    p = getConfiguredAwsAuthRefresh();
    u[0] = p;
  } else p = u[0];
  let H = p;
  let N;
  if (
    u[1] !== allowContinueWithoutLogin ||
    u[2] !== allowedProviders ||
    u[3] !== consoleProfileLoginAllowed ||
    u[4] !== cursorOffset ||
    u[5] !== firstPartyLoginAllowed ||
    u[6] !== forceLoginGatewayUrl ||
    u[7] !== forcedMethodMessage ||
    u[8] !== gatewayInternalNetworks ||
    u[9] !== gatewayNamedBy ||
    u[10] !== gatewayScreenLocked ||
    u[11] !== gatewayUnsupportedWarning ||
    u[12] !== handleSubmitCode ||
    u[13] !== showCursor ||
    u[14] !== keyMintFallbackReason ||
    u[15] !== mode ||
    u[16] !== oauthStatus.backendName ||
    u[17] !== oauthStatus.message ||
    u[18] !== oauthStatus.notice ||
    u[19] !== oauthStatus.ok ||
    u[20] !== oauthStatus.sessionAuth ||
    u[21] !== oauthStatus.state ||
    u[22] !== oauthStatus.toRetry ||
    u[23] !== oauthStatus.token ||
    u[24] !== oauthStatus.transient ||
    u[25] !== oauthStatus.url ||
    u[26] !== oauthStatus.verbatim ||
    u[27] !== onAuthSuccess ||
    u[28] !== pasteCodePrompt ||
    u[29] !== pastedCode ||
    u[30] !== reloadClearedOrgDocuments ||
    u[31] !== setConsoleProfileLogin ||
    u[32] !== setCursorOffset ||
    u[33] !== setHybridRowPicked ||
    u[34] !== setLoginWithClaudeAi ||
    u[35] !== setOAuthStatus ||
    u[36] !== setPastedCode ||
    u[37] !== showPastePrompt ||
    u[38] !== startingMessage ||
    u[39] !== textInputColumns
  ) {
    N = EARLY_RETURN_SENTINEL;
    mo: {
      let Se;
      if (u[41] !== allowedProviders) {
        Se = (xe) =>
          (allowedProviders === undefined ||
            xe.providers.some((provider) => allowedProviders.includes(provider))) &&
          (xe.value !== "aws_refresh" || !!H);
        u[41] = allowedProviders;
        u[42] = Se;
      } else Se = u[42];
      let filtered = THIRD_PARTY_PROVIDER_OPTIONS.filter(Se);
      let Le;
      switch (oauthStatus.state) {
        case "idle": {
          const children = startingMessage
            ? startingMessage
            : "Claude Code can be used with your Claude subscription or billed based on API usage through your Console account.";
          let k;
          if (u[43] !== children) {
            k = jsxProd_default(Text, {
              bold: true,
              children,
            });
            u[43] = children;
            u[44] = k;
          } else k = u[44];
          let I;
          if (u[45] !== gatewayUnsupportedWarning) {
            I =
              gatewayUnsupportedWarning &&
              jsxProd_default(Text, {
                color: "warning",
                children: gatewayUnsupportedWarning,
              });
            u[45] = gatewayUnsupportedWarning;
            u[46] = I;
          } else I = u[46];
          const G =
            !firstPartyLoginAllowed &&
            Le === undefined &&
            filtered.length === 0 &&
            jsxProd_default(Text, {
              color: "error",
              children:
                checkAllowedProvider("firstParty")?.message ??
                "Your organization's managed settings (allowedProviders) admit no sign-in this screen can offer; ask your administrator.",
            });
          let re;
          if (u[47] === MEMO_CACHE_SENTINEL) {
            re = jsxProd_default(Text, {
              children: "Select login method:",
            });
            u[47] = re;
          } else re = u[47];
          let ee;
          if (u[48] !== firstPartyLoginAllowed) {
            ee = firstPartyLoginAllowed
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
            u[48] = firstPartyLoginAllowed;
            u[49] = ee;
          } else ee = u[49];
          let fe;
          if (u[50] === MEMO_CACHE_SENTINEL) {
            fe =
              Le !== undefined
                ? [
                    {
                      label: Le,
                      value: "hybrid",
                    },
                  ]
                : [];
            u[50] = fe;
          } else fe = u[50];
          const me =
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
          if (u[51] !== me || u[52] !== ee) {
            options = [...ee, ...fe, ...me];
            u[51] = me;
            u[52] = ee;
            u[53] = options;
          } else options = u[53];
          let onChange;
          if (
            u[54] !== consoleProfileLoginAllowed ||
            u[55] !== setConsoleProfileLogin ||
            u[56] !== setHybridRowPicked ||
            u[57] !== setLoginWithClaudeAi ||
            u[58] !== setOAuthStatus
          ) {
            onChange = ($e) => {
              if ($e === "platform") {
                logEvent("tengu_oauth_platform_selected", {});
                setOAuthStatus({
                  state: "platform_setup",
                });
              } else if ($e === "claudeai" || $e === "hybrid") {
                logEvent("tengu_oauth_claudeai_selected", {});
                setHybridRowPicked($e === "hybrid");
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
            u[54] = consoleProfileLoginAllowed;
            u[55] = setConsoleProfileLogin;
            u[56] = setHybridRowPicked;
            u[57] = setLoginWithClaudeAi;
            u[58] = setOAuthStatus;
            u[59] = onChange;
          } else onChange = u[59];
          let Ve;
          if (u[60] !== options || u[61] !== onChange) {
            Ve = jsxProd_default(Box, {
              children: jsxProd_default(ModelSelector, {
                options,
                onChange,
              }),
            });
            u[60] = options;
            u[61] = onChange;
            u[62] = Ve;
          } else Ve = u[62];
          let bt;
          if (u[63] !== Ve || u[64] !== k || u[65] !== I || u[66] !== G) {
            bt = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [k, I, G, re, Ve],
            });
            u[63] = Ve;
            u[64] = k;
            u[65] = I;
            u[66] = G;
            u[67] = bt;
          } else bt = u[67];
          N = bt;
          break mo;
        }
        case "gateway_setup": {
          let onDone;
          if (u[68] !== onAuthSuccess || u[69] !== reloadClearedOrgDocuments || u[70] !== setOAuthStatus) {
            onDone = () => {
              onAuthSuccess?.();
              reloadClearedOrgDocuments("new");
              setOAuthStatus({
                state: "gateway_done",
              });
            };
            u[68] = onAuthSuccess;
            u[69] = reloadClearedOrgDocuments;
            u[70] = setOAuthStatus;
            u[71] = onDone;
          } else onDone = u[71];
          let onCancel;
          if (u[72] !== setOAuthStatus) {
            onCancel = () =>
              setOAuthStatus({
                state: "idle",
              });
            u[72] = setOAuthStatus;
            u[73] = onCancel;
          } else onCancel = u[73];
          let I;
          if (
            u[74] !== forceLoginGatewayUrl ||
            u[75] !== gatewayInternalNetworks ||
            u[76] !== gatewayNamedBy ||
            u[77] !== gatewayScreenLocked ||
            u[78] !== onDone ||
            u[79] !== onCancel
          ) {
            I = jsxProd_default(GatewayLogin, {
              initialUrl: forceLoginGatewayUrl,
              namedBy: gatewayNamedBy,
              internalNetworks: gatewayInternalNetworks,
              screenLocked: gatewayScreenLocked,
              onDone,
              onCancel,
            });
            u[74] = forceLoginGatewayUrl;
            u[75] = gatewayInternalNetworks;
            u[76] = gatewayNamedBy;
            u[77] = gatewayScreenLocked;
            u[78] = onDone;
            u[79] = onCancel;
            u[80] = I;
          } else I = u[80];
          N = I;
          break mo;
        }
        case "gateway_done": {
          let h;
          if (u[81] === MEMO_CACHE_SENTINEL) {
            h = jsxProd_default(Text, {
              color: "success",
              children: "Connected to Cloud gateway.",
            });
            u[81] = h;
          } else h = u[81];
          let k;
          if (u[82] === MEMO_CACHE_SENTINEL) {
            k = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              marginTop: 1,
              children: [
                h,
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
            u[82] = k;
          } else k = u[82];
          N = k;
          break mo;
        }
        case "console_method": {
          let h;
          let k;
          if (u[83] === MEMO_CACHE_SENTINEL) {
            h = jsxProd_default(Text, {
              bold: true,
              children: "Anthropic Console account",
            });
            k = jsxProd_default(Text, {
              children: "How do you want to sign in?",
            });
            u[83] = h;
            u[84] = k;
          } else {
            h = u[83];
            k = u[84];
          }
          let I;
          if (u[85] === MEMO_CACHE_SENTINEL) {
            I = {
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
            u[85] = I;
          } else I = u[85];
          let G;
          if (u[86] === MEMO_CACHE_SENTINEL) {
            G = jsxProd_default(Text, {
              dimColor: true,
              children: "(legacy)",
            });
            u[86] = G;
          } else G = u[86];
          let options;
          if (u[87] === MEMO_CACHE_SENTINEL) {
            options = [
              I,
              {
                label: jsxProd_default_2(Text, {
                  children: [
                    "Create an API key ",
                    G,
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
            u[87] = options;
          } else options = u[87];
          let onCancel;
          if (u[88] !== setOAuthStatus) {
            onCancel = () =>
              setOAuthStatus({
                state: "idle",
              });
            u[88] = setOAuthStatus;
            u[89] = onCancel;
          } else onCancel = u[89];
          let onChange;
          if (
            u[90] !== setConsoleProfileLogin ||
            u[91] !== setLoginWithClaudeAi ||
            u[92] !== setOAuthStatus
          ) {
            onChange = (je) => {
              if (je === "back") {
                setOAuthStatus({
                  state: "idle",
                });
                return;
              }
              setLoginWithClaudeAi(false);
              if (je === "wif") {
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
            u[90] = setConsoleProfileLogin;
            u[91] = setLoginWithClaudeAi;
            u[92] = setOAuthStatus;
            u[93] = onChange;
          } else onChange = u[93];
          let me;
          if (u[94] !== onChange || u[95] !== onCancel) {
            me = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [
                h,
                k,
                jsxProd_default(Box, {
                  children: jsxProd_default(ModelSelector, {
                    options,
                    onCancel,
                    onChange,
                  }),
                }),
              ],
            });
            u[94] = onChange;
            u[95] = onCancel;
            u[96] = me;
          } else me = u[96];
          N = me;
          break mo;
        }
        case "platform_setup": {
          let h;
          if (u[97] === MEMO_CACHE_SENTINEL) {
            h = jsxProd_default(Text, {
              bold: true,
              children: "Using 3rd-party platforms",
            });
            u[97] = h;
          } else h = u[97];
          const options = [
            ...filtered.map(providerOption),
            {
              label: "Go back",
              value: "back",
            },
          ];
          let onChange;
          let onCancel;
          if (u[98] !== setOAuthStatus) {
            onChange = (Xe) => {
              _t: switch (Xe) {
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
            u[98] = setOAuthStatus;
            u[99] = onChange;
            u[100] = onCancel;
          } else {
            onChange = u[99];
            onCancel = u[100];
          }
          N = jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              h,
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
          let h;
          if (u[101] !== setOAuthStatus) {
            h = jsxProd_default(call, {
              onComplete: (ok) =>
                setOAuthStatus({
                  state: "aws_refresh_done",
                  ok,
                }),
            });
            u[101] = setOAuthStatus;
            u[102] = h;
          } else h = u[102];
          N = h;
          break mo;
        }
        case "aws_refresh_done": {
          let h;
          if (u[103] !== oauthStatus.ok) {
            h = oauthStatus.ok
              ? jsxProd_default(Text, {
                  color: "success",
                  children: "AWS credentials refreshed.",
                })
              : jsxProd_default(Text, {
                  color: "error",
                  children:
                    "awsAuthRefresh failed. Check the command in your settings and try running it in a separate terminal.",
                });
            u[103] = oauthStatus.ok;
            u[104] = h;
          } else h = u[104];
          let k;
          if (u[105] === MEMO_CACHE_SENTINEL) {
            k = jsxProd_default_2(Text, {
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
            u[105] = k;
          } else k = u[105];
          let I;
          if (u[106] !== h) {
            I = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [h, k],
            });
            u[106] = h;
            u[107] = I;
          } else I = u[107];
          N = I;
          break mo;
        }
        case "bedrock_wizard": {
          let h;
          if (u[108] !== setOAuthStatus) {
            h = jsxProd_default(CreateAgentWizard, {
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
            u[108] = setOAuthStatus;
            u[109] = h;
          } else h = u[109];
          N = h;
          break mo;
        }
        case "bedrock_done":
        case "vertex_done": {
          let h;
          if (u[110] !== oauthStatus.message) {
            h = jsxProd_default(Text, {
              color: "success",
              children: oauthStatus.message,
            });
            u[110] = oauthStatus.message;
            u[111] = h;
          } else h = u[111];
          let k;
          if (u[112] === MEMO_CACHE_SENTINEL) {
            k = jsxProd_default_2(Text, {
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
            u[112] = k;
          } else k = u[112];
          let I;
          if (u[113] !== h) {
            I = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [h, k],
            });
            u[113] = h;
            u[114] = I;
          } else I = u[114];
          N = I;
          break mo;
        }
        case "vertex_wizard": {
          let h;
          if (u[115] !== setOAuthStatus) {
            h = jsxProd_default(VertexSetupWizard, {
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
            u[115] = setOAuthStatus;
            u[116] = h;
          } else h = u[116];
          N = h;
          break mo;
        }
        case "waiting_for_login": {
          let h;
          if (u[117] !== forcedMethodMessage) {
            h =
              forcedMethodMessage &&
              jsxProd_default(Box, {
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: forcedMethodMessage,
                }),
              });
            u[117] = forcedMethodMessage;
            u[118] = h;
          } else h = u[118];
          let k;
          if (u[119] !== keyMintFallbackReason) {
            k =
              keyMintFallbackReason &&
              jsxProd_default(Box, {
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: `${RECOMMENDED_SIGNIN_UNAVAILABLE_TEXT} (${keyMintFallbackReason.cause}), so this sign-in will create an API key.`,
                }),
              });
            u[119] = keyMintFallbackReason;
            u[120] = k;
          } else k = u[120];
          let I;
          if (u[121] !== showPastePrompt) {
            I =
              !showPastePrompt &&
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default(Spinner, {}),
                  jsxProd_default(Text, {
                    children: "Opening browser to sign in\u2026",
                  }),
                ],
              });
            u[121] = showPastePrompt;
            u[122] = I;
          } else I = u[122];
          let G;
          if (
            u[123] !== cursorOffset ||
            u[124] !== handleSubmitCode ||
            u[125] !== showCursor ||
            u[126] !== oauthStatus.url ||
            u[127] !== pasteCodePrompt ||
            u[128] !== pastedCode ||
            u[129] !== setCursorOffset ||
            u[130] !== setPastedCode ||
            u[131] !== showPastePrompt ||
            u[132] !== textInputColumns
          ) {
            G =
              showPastePrompt &&
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default(Text, {
                    children: pasteCodePrompt,
                  }),
                  jsxProd_default(TextInput, {
                    value: pastedCode,
                    onChange: setPastedCode,
                    onSubmit: (Ot) => handleSubmitCode(Ot, oauthStatus.url),
                    cursorOffset,
                    onChangeCursorOffset: setCursorOffset,
                    columns: textInputColumns,
                    mask: "*",
                    focus: true,
                    showCursor,
                  }),
                ],
              });
            u[123] = cursorOffset;
            u[124] = handleSubmitCode;
            u[125] = showCursor;
            u[126] = oauthStatus.url;
            u[127] = pasteCodePrompt;
            u[128] = pastedCode;
            u[129] = setCursorOffset;
            u[130] = setPastedCode;
            u[131] = showPastePrompt;
            u[132] = textInputColumns;
            u[133] = G;
          } else G = u[133];
          let re;
          if (u[134] !== h || u[135] !== k || u[136] !== I || u[137] !== G) {
            re = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [h, k, I, G],
            });
            u[134] = h;
            u[135] = k;
            u[136] = I;
            u[137] = G;
            u[138] = re;
          } else re = u[138];
          N = re;
          break mo;
        }
        case "creating_api_key": {
          let h;
          if (u[139] === MEMO_CACHE_SENTINEL) {
            h = jsxProd_default(Box, {
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
            u[139] = h;
          } else h = u[139];
          N = h;
          break mo;
        }
        case "about_to_retry": {
          let h;
          if (u[140] === MEMO_CACHE_SENTINEL) {
            h = jsxProd_default(Box, {
              flexDirection: "column",
              gap: 1,
              children: jsxProd_default(Text, {
                color: "permission",
                children: "Retrying\u2026",
              }),
            });
            u[140] = h;
          } else h = u[140];
          N = h;
          break mo;
        }
        case "success": {
          let children;
          if (u[141] !== mode || u[142] !== oauthStatus.notice || u[143] !== oauthStatus.token) {
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
            u[141] = mode;
            u[142] = oauthStatus.notice;
            u[143] = oauthStatus.token;
            u[144] = children;
          } else children = u[144];
          let k;
          if (u[145] !== children) {
            k = jsxProd_default(Box, {
              flexDirection: "column",
              children,
            });
            u[145] = children;
            u[146] = k;
          } else k = u[146];
          N = k;
          break mo;
        }
        case "storage_failed": {
          let h;
          if (u[147] !== oauthStatus.backendName) {
            h = secureStorageLabel(oauthStatus.backendName);
            u[147] = oauthStatus.backendName;
            u[148] = h;
          } else h = u[148];
          let he = h;
          let k;
          if (u[149] !== he || u[150] !== oauthStatus.sessionAuth || u[151] !== oauthStatus.transient) {
            k = jsxProd_default(Box, {
              flexDirection: "column",
              children:
                oauthStatus.sessionAuth === "fresh"
                  ? jsxProd_default_2(Fragment, {
                      children: [
                        jsxProd_default(Text, {
                          color: "warning",
                          children: oauthStatus.transient
                            ? `Logged in for now, but Claude Code couldn't confirm your new credentials were saved to ${he}.`
                            : `Logged in for now, but your new credentials could not be saved to ${he}.`,
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
                              he,
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
                              he,
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
            u[149] = he;
            u[150] = oauthStatus.sessionAuth;
            u[151] = oauthStatus.transient;
            u[152] = k;
          } else k = u[152];
          let I;
          if (u[153] === MEMO_CACHE_SENTINEL) {
            I = jsxProd_default(Text, {
              dimColor: true,
              children: "To avoid having to log in again each session:",
            });
            u[153] = I;
          } else I = u[153];
          let G;
          if (u[154] !== he) {
            G = jsxProd_default_2(Text, {
              dimColor: true,
              children: ["  ", "\u2022 fix access to ", he, ", then run /login again"],
            });
            u[154] = he;
            u[155] = G;
          } else G = u[155];
          let re;
          if (u[156] === MEMO_CACHE_SENTINEL) {
            re = jsxProd_default_2(Text, {
              dimColor: true,
              children: ["  ", "\u2022 or run claude setup-token and set CLAUDE_CODE_OAUTH_TOKEN"],
            });
            u[156] = re;
          } else re = u[156];
          let ee;
          if (u[157] !== G) {
            ee = jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [I, G, re],
            });
            u[157] = G;
            u[158] = ee;
          } else ee = u[158];
          let fe;
          if (u[159] !== allowContinueWithoutLogin || u[160] !== oauthStatus.sessionAuth) {
            fe =
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
            u[159] = allowContinueWithoutLogin;
            u[160] = oauthStatus.sessionAuth;
            u[161] = fe;
          } else fe = u[161];
          let me;
          if (u[162] !== fe || u[163] !== k || u[164] !== ee) {
            me = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [k, ee, fe],
            });
            u[162] = fe;
            u[163] = k;
            u[164] = ee;
            u[165] = me;
          } else me = u[165];
          N = me;
          break mo;
        }
        case "account_on_hold": {
          let h;
          if (u[166] !== oauthStatus.message) {
            h = jsxProd_default(Text, {
              color: "warning",
              children: oauthStatus.message,
            });
            u[166] = oauthStatus.message;
            u[167] = h;
          } else h = u[167];
          let k;
          if (u[168] !== mode) {
            k =
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
            u[168] = mode;
            u[169] = k;
          } else k = u[169];
          let I;
          if (u[170] !== h || u[171] !== k) {
            I = jsxProd_default_2(Box, {
              flexDirection: "column",
              gap: 1,
              children: [h, k],
            });
            u[170] = h;
            u[171] = k;
            u[172] = I;
          } else I = u[172];
          N = I;
          break mo;
        }
        case "error": {
          let ze;
          let flexDirection;
          let gap;
          let I;
          if (u[173] !== oauthStatus.message || u[174] !== oauthStatus.verbatim) {
            let rt = oauthStatus.verbatim ? /\s(https:\/\/\S+)$/.exec(oauthStatus.message) : null;
            let Ke = rt?.[1];
            let Ne = Ke && trimTrailingPunctuation(Ke);
            let St = Ke && Ne ? Ke.slice(Ne.length) : "";
            let it = Ne ? safeVerificationUrl(Ne) : undefined;
            ze = Box;
            flexDirection = "column";
            gap = 1;
            I =
              rt && Ne
                ? jsxProd_default_2(Box, {
                    flexDirection: "column",
                    children: [
                      jsxProd_default(Text, {
                        color: "error",
                        children: oauthStatus.message.slice(0, rt.index),
                      }),
                      jsxProd_default_2(Text, {
                        color: "error",
                        children: [
                          it
                            ? jsxProd_default(Link, {
                                url: it,
                                assumeSupport: true,
                                children: jsxProd_default(Text, {
                                  color: "error",
                                  children: it,
                                }),
                              })
                            : Ne,
                          St,
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
            u[173] = oauthStatus.message;
            u[174] = oauthStatus.verbatim;
            u[175] = ze;
            u[176] = flexDirection;
            u[177] = gap;
            u[178] = I;
          } else {
            ze = u[175];
            flexDirection = u[176];
            gap = u[177];
            I = u[178];
          }
          let G;
          if (u[179] !== keyMintFallbackReason) {
            G =
              keyMintFallbackReason &&
              jsxProd_default(Text, {
                dimColor: true,
                children: `${RECOMMENDED_SIGNIN_UNAVAILABLE_TEXT}: ${keyMintFallbackReason.message}`,
              });
            u[179] = keyMintFallbackReason;
            u[180] = G;
          } else G = u[180];
          let re;
          if (u[181] !== allowContinueWithoutLogin || u[182] !== oauthStatus.toRetry) {
            re =
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
            u[181] = allowContinueWithoutLogin;
            u[182] = oauthStatus.toRetry;
            u[183] = re;
          } else re = u[183];
          let ee;
          if (
            u[184] !== ze ||
            u[185] !== flexDirection ||
            u[186] !== gap ||
            u[187] !== I ||
            u[188] !== G ||
            u[189] !== re
          ) {
            ee = jsxProd_default_2(ze, {
              flexDirection,
              gap,
              children: [I, G, re],
            });
            u[184] = ze;
            u[185] = flexDirection;
            u[186] = gap;
            u[187] = I;
            u[188] = G;
            u[189] = re;
            u[190] = ee;
          } else ee = u[190];
          N = ee;
          break mo;
        }
        default: {
          N = null;
          break mo;
        }
      }
    }
    u[1] = allowContinueWithoutLogin;
    u[2] = allowedProviders;
    u[3] = consoleProfileLoginAllowed;
    u[4] = cursorOffset;
    u[5] = firstPartyLoginAllowed;
    u[6] = forceLoginGatewayUrl;
    u[7] = forcedMethodMessage;
    u[8] = gatewayInternalNetworks;
    u[9] = gatewayNamedBy;
    u[10] = gatewayScreenLocked;
    u[11] = gatewayUnsupportedWarning;
    u[12] = handleSubmitCode;
    u[13] = showCursor;
    u[14] = keyMintFallbackReason;
    u[15] = mode;
    u[16] = oauthStatus.backendName;
    u[17] = oauthStatus.message;
    u[18] = oauthStatus.notice;
    u[19] = oauthStatus.ok;
    u[20] = oauthStatus.sessionAuth;
    u[21] = oauthStatus.state;
    u[22] = oauthStatus.toRetry;
    u[23] = oauthStatus.token;
    u[24] = oauthStatus.transient;
    u[25] = oauthStatus.url;
    u[26] = oauthStatus.verbatim;
    u[27] = onAuthSuccess;
    u[28] = pasteCodePrompt;
    u[29] = pastedCode;
    u[30] = reloadClearedOrgDocuments;
    u[31] = setConsoleProfileLogin;
    u[32] = setCursorOffset;
    u[33] = setHybridRowPicked;
    u[34] = setLoginWithClaudeAi;
    u[35] = setOAuthStatus;
    u[36] = setPastedCode;
    u[37] = showPastePrompt;
    u[38] = startingMessage;
    u[39] = textInputColumns;
    u[40] = N;
  } else N = u[40];
  if (N !== EARLY_RETURN_SENTINEL) return N;
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
//@ chunk-zkzpd9ky.js:20079-21845 fingerprint = OAuthStatusMessage (0.372)
/**
 * 登录状态文案（starting/waiting_for_login/保存凭证等）。
 */
function OAuthStatusMessage(props) {
  let $ = w(24);
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
      let u;
      if ($[0] === MEMO_CACHE_SENTINEL) {
        u = jsxProd_default(WorkerBadge, {
          message: "Starting design login\u2026",
        });
        $[0] = u;
      } else u = $[0];
      return u;
    }
    case "waiting_for_login": {
      let u;
      if ($[1] === MEMO_CACHE_SENTINEL) {
        u = jsxProd_default(WorkerBadge, {
          message: "Waiting for browser authorization\u2026",
        });
        $[1] = u;
      } else u = $[1];
      let m;
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
        m =
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
        $[11] = m;
      } else m = $[11];
      let _;
      if ($[12] !== m) {
        _ = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [u, m],
        });
        $[12] = m;
        $[13] = _;
      } else _ = $[13];
      return _;
    }
    case "processing": {
      let u;
      if ($[14] === MEMO_CACHE_SENTINEL) {
        u = jsxProd_default(WorkerBadge, {
          message: "Saving design credential\u2026",
        });
        $[14] = u;
      } else u = $[14];
      return u;
    }
    case "success": {
      let u;
      if ($[15] === MEMO_CACHE_SENTINEL) {
        u = jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              color: "success",
              children:
                "Design-system access authorized. /design-sync can now reach your claude.ai/design projects.",
            }),
            jsxProd_default(DesignOAuthWarning, {}),
          ],
        });
        $[15] = u;
      } else u = $[15];
      return u;
    }
    case "error": {
      let u;
      if ($[16] !== oauthStatus.message) {
        u = jsxProd_default(Text, {
          color: "error",
          children: oauthStatus.message,
        });
        $[16] = oauthStatus.message;
        $[17] = u;
      } else u = $[17];
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
      let x;
      if ($[20] !== u || $[21] !== _) {
        x = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [u, _],
        });
        $[20] = u;
        $[21] = _;
        $[22] = x;
      } else x = $[22];
      return x;
    }
    case "about_to_retry": {
      let u;
      if ($[23] === MEMO_CACHE_SENTINEL) {
        u = jsxProd_default(Text, {
          color: "permission",
          children: "Retrying\u2026",
        });
        $[23] = u;
      } else u = $[23];
      return u;
    }
  }
}
export { ConsoleOAuthFlow, OAuthStatusMessage };

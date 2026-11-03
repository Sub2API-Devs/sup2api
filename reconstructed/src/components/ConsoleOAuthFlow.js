/**
 * components/ConsoleOAuthFlow.tsx
 *
 * 登录流程：选择订阅（claude.ai）/API 计费（console）/网关，启动 OAuth、等待浏览器授权或粘贴代码、保存凭证。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ConsoleOAuthFlow.tsx
 * pieces: chunk-s5p7fp0c.js (3), chunk-zkzpd9ky.js (1)
 * attribution: callgraph-fingerprint 1, layout 1, facade-exports 1, fingerprint 1
 */
import { plural } from "../utils/stringUtils.js";
import { Tl } from "./ScrollViewportContext.js";
import { Me } from "./design-system/ThemeProvider.js";
import { rs } from "../state/AppState.js";
import { l5 } from "./design-system/Pane.js";
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import { y, R, P, ce } from "../../vendor/react/cjs/react.production.js";
import { getUserSettingsGateway, getForcedGatewayLogin } from "../services/gateway/gatewayCredentialStore.js";
import {
  getForcedLoginMethod,
  policyUnreadableForEnforcement,
  checkNewLoginTokenOrg,
  validateForceLoginOrg,
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
import { vjs } from "../utils/proactivityRelaunch.js";
import { logError } from "../utils/log.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../utils/errors.js";
import { MANAGED_RELOAD_NOTICES, loginWithConsoleProfile, ConsoleProfileLoginError } from "./GatewayLogin.js";
import { isBrowserUnavailable } from "../utils/browser.js";
import { gB } from "../utils/terminalProbe.js";
import { stripNonPrintable } from "../utils/truncateGraphemes.js";
import { logForDebugging } from "../utils/debug.js";
import { LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS } from "../constants/oauth.js";
import {
  OAuthCallbackError,
  isOAuthCallbackError,
  formatAccountOnHoldSignInError,
  isClaudeAiOrigin,
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
  fnn,
} from "../services/oauth/refusedSignIn.js";
import { sanitizeStorageKindForAnalytics } from "../services/analytics/metadata.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { B3t } from "../services/oauth/client.js";
import { r, e, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../ink/components/Text.js";
import { describeMetaKey } from "../ink/terminal.js";
import { ConsoleOAuthFlowView } from "./_new/ConsoleOAuthFlowView.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { WorkerBadge } from "./permissions/WorkerBadge.js";
import { Y, DesignOAuthWarning } from "./DesignOAuthFlow.js";
import { TextInput } from "./TextInput.js";

//@ chunk-s5p7fp0c.js:13113-13214 callgraph-fingerprint = PASTE_HERE_MSG (0.632)
var PASTE_CODE_PROMPT = "Paste code here if prompted > ",
  RECOMMENDED_SIGNIN_UNAVAILABLE_TEXT = "The recommended sign-in isn't available on this machine";
//@ chunk-s5p7fp0c.js:13214-13339 layout
function formatTokenLifetimeDays(A) {
  let rounded = Math.round(A / 86400);
  if (rounded < 1) return "less than a day";
  if (rounded === 365) return "1 year";
  return `${rounded} ${plural(rounded, "day")}`;
}
/**
 * 登录流程：选择登录方式（Claude 订阅 / Console API 计费 / 网关，可由参数预选），启动本地 OAuth 回调并打开浏览器，显示等待/粘贴代码提示，换取并保存凭证，完成后回调 onDone。
 */
//@ chunk-s5p7fp0c.js:13339-24518 facade-exports = ConsoleOAuthFlow (0.507)
function ConsoleOAuthFlow({
  onDone: onDone,
  onAuthSuccess: onAuthSuccess,
  onOrgDocumentsReload: onOrgDocumentsReload,
  onHybridSignIn: onHybridSignIn,
  onFreshPickerChange: onFreshPickerChange,
  onAccountOnHold: onAccountOnHold,
  onOrgConfigRefused: onOrgConfigRefused,
  startingMessage: startingMessage,
  mode: mode = "login",
  expiresIn: expiresIn,
  forceLoginMethod: forceLoginMethod,
  urlOutdent: urlOutdent = 0,
  allowContinueWithoutLogin: allowContinueWithoutLogin = !1,
  orgConfigGateFollows: orgConfigGateFollows = !1,
}) {
  let ve = Tl(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    De = rs((K) => K.proactivityLevel),
    Oe = rs((K) => K.toolPermissionContext),
    v = (ve ? l5 : 0) + urlOutdent,
    E = getInitialSettings_2(),
    [ne] = y(getUserSettingsGateway),
    we = getForcedGatewayLogin(ne),
    pe = we?.url === void 0 ? void 0 : we,
    Ce = getForcedLoginMethod(),
    ge = Ce === "gateway",
    V = ge ? "gateway" : (forceLoginMethod ?? Ce),
    T =
      V === "claudeai"
        ? "Login method pre-selected: Subscription Plan (Claude Pro/Max)"
        : V === "console"
          ? "Login method pre-selected: API usage billing (Anthropic Console)"
          : null,
    Y = null,
    B = useTerminalNotification(),
    u = useClock(),
    [p, H] = y(() => {
      if (mode === "setup-token") return { state: "ready_to_start" };
      if (V === "claudeai" || V === "console") return { state: "ready_to_start" };
      if (we) return { state: "gateway_setup" };
      return { state: "idle" };
    }),
    N = R(!1);
  P(() => {
    if (p.state !== "idle" && p.state !== "platform_setup" && p.state !== "console_method") N.current = !0;
    onFreshPickerChange?.(p.state === "idle" && !N.current);
  }, [p.state, onFreshPickerChange]);
  let [Se, xe] = y(""),
    [Wt, Ue] = y(0),
    [Le] = y(() => new OAuthService()),
    [h, k] = y(() => mode === "setup-token" || V === "claudeai"),
    [I, G] = y(!1),
    [re, ee] = y(null),
    fe = policyUnreadableForEnforcement(),
    me = getAPIProvider() === "firstParty" && !fe && E.forceLoginOrgUUID === void 0 && V !== "claudeai",
    We = getAllowedProviders(),
    Ye = checkAllowedProvider("firstParty") === void 0,
    [$e] = y(() => !1),
    [Ve, bt] = y(!1),
    mo = E.forceLoginMethod !== void 0 && h !== (E.forceLoginMethod === "claudeai"),
    je = typeof E.forceLoginOrgUUID === "string" && !mo ? E.forceLoginOrgUUID : void 0,
    [Xe, _t] = y(!1),
    [ot, kt] = y(!1),
    {
      copiedVia: copiedVia,
      copy: copy,
      reset: reset,
    } = useCopyUrl(p.state === "waiting_for_login" ? p.url : null),
    ze = ot ? PASTE_CODE_PROMPT_2 : PASTE_CODE_PROMPT,
    rt = useTerminalSize().columns - ze.length - 1,
    [Ke] = y(() => isFullscreenActive() && isMouseTrackingEnabled() !== "off");
  (P(() => {
    if (V === "claudeai") logEvent("tengu_oauth_claudeai_forced", {});
    else if (V === "console") logEvent("tengu_oauth_console_forced", {});
    else if (ge && !0 && mode !== "setup-token") logEvent("tengu_oauth_gateway_forced", {});
  }, [V, ge, mode]),
    useTimeout(
      () => {
        if (p.state === "about_to_retry") H(p.nextState);
      },
      p.state === "about_to_retry" ? 1000 : null,
      [p],
    ),
    useKeybinding(
      "confirm:yes",
      () => {
        if (p.state !== "storage_failed" && !(p.state === "success" && p.hybrid))
          logEvent(p.state === "gateway_done" ? "tengu_oauth_gateway_done" : "tengu_oauth_success", {
            loginWithClaudeAi: h,
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
    ));
  let terminal = useApp(),
    St = R(!1);
  (useKeybinding(
    "confirm:yes",
    () => {
      if (St.current) return;
      ((St.current = !0),
        saveGlobalConfig(
          (K) => ({
            ...K,
            hasCompletedOnboarding: !0,
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
            De !== void 0 && Oe !== void 0
              ? vjs({ proactivityLevel: De, toolPermissionContext: Oe })
              : void 0;
          import("./chunk-sv7j935w.js").then((raw) => raw.execRelaunch(K ? { proactivity: K } : {}));
        }));
    },
    { context: "Confirmation", isActive: p.state === "bedrock_done" || p.state === "vertex_done" },
  ),
    useKeybinding("confirm:yes", () => H({ state: "platform_setup" }), {
      context: "Confirmation",
      isActive: p.state === "aws_refresh_done",
    }),
    useKeybinding(
      "confirm:yes",
      () => {
        if (p.state === "error" && p.toRetry) (xe(""), H({ state: "about_to_retry", nextState: p.toRetry }));
        else if (p.state === "storage_failed" && p.sessionAuth !== "fresh")
          (xe(""),
            H({
              state: "about_to_retry",
              nextState:
                V === "claudeai" || V === "console" ? { state: "ready_to_start" } : { state: "idle" },
            }));
      },
      {
        context: "Confirmation",
        isActive:
          (p.state === "error" && !!p.toRetry) || (p.state === "storage_failed" && p.sessionAuth !== "fresh"),
      },
    ),
    useKeybinding("confirm:no", () => onDone(), {
      context: "Confirmation",
      isActive:
        allowContinueWithoutLogin &&
        ((p.state === "storage_failed" && p.sessionAuth !== "fresh") || p.state === "error"),
    }),
    useKeybinding("confirm:yes", () => H({ state: "idle" }), {
      context: "Confirmation",
      isActive: p.state === "account_on_hold" && mode !== "setup-token",
    }),
    P(() => {
      if (/^c+$/.test(Se) && p.state === "waiting_for_login" && Xe) (xe(""), copy(p.url));
    }, [Se, p, Xe, copy]));
  async function handleSubmitCode(value, url) {
    if (!value.trim()) {
      (xe(""), Ue(0));
      return;
    }
    try {
      let [Ee, ie] = value.split("#");
      if (!Ee || !ie) {
        H({
          state: "error",
          message: "Invalid code. Please make sure the full code was copied",
          toRetry: { state: "waiting_for_login", url: url },
        });
        return;
      }
      (logEvent("tengu_oauth_manual_entry", {}),
        Le.handleManualAuthCodeInput({ authorizationCode: Ee, state: ie }));
    } catch (err) {
      (logError(err),
        H({ state: "error", message: errorMessage(err), toRetry: { state: "waiting_for_login", url: url } }));
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
        MANAGED_RELOAD_NOTICES({ storageV5: storageV5, credentials: credentials });
      },
      [onOrgDocumentsReload, storageV5, credentials],
    ),
    Pt = ce(async () => {
      let K = !1;
      kt(!1);
      let Re = () => {
          ((K = !0), kt(!0));
        },
        Ee = (ie) => {
          if ((reset(), _t(!1), H({ state: "waiting_for_login", url: ie }), K || isBrowserUnavailable()))
            _t(!0);
          else u.setTimeout(() => _t(!0), 3000);
        };
      ee(null);
      try {
        let at = providerBlockedMessage("firstParty");
        if (at !== void 0) throw new ProviderNotAllowedError(at);
        if ((logEvent("tengu_oauth_flow_start", { loginWithClaudeAi: h }), I && mode !== "setup-token")) {
          if (!me)
            throw Error(
              "Settings on this machine pin the login method or organization, so signing in without an API key is not available here.",
            );
          let z;
          try {
            (await loginWithConsoleProfile(Le, async (te) => Ee(te), {
              orgUUID: je,
              onCallbackListenerUnavailable: Re,
              onInstallStart: () => {
                z = "previous";
              },
            }),
              (z = "new"),
              H({ state: "success" }),
              onAuthSuccess?.(),
              gB({ message: "Claude Code login successful", notificationType: "auth_success" }, B, {
                storageV5: storageV5,
                credentials: credentials,
              }));
            return;
          } catch (error) {
            if (!(error instanceof ConsoleProfileLoginError) || !error.fallbackCures) throw error;
            let be = stripNonPrintable(errorMessage(error));
            (ee({
              cause: error.causeSummary !== null ? stripNonPrintable(error.causeSummary) : be,
              message: be,
            }),
              logForDebugging(
                `Keyless Console sign-in unavailable here, continuing with the API-key sign-in: ${be}`,
                { level: "warn" },
              ));
          } finally {
            if (z !== void 0) startOAuth(z);
          }
        }
        let st,
          Lt = [
            async (z) => Ee(z),
            {
              loginWithClaudeAi: h,
              inferenceOnly: mode === "setup-token",
              expiresIn: mode === "setup-token" ? (expiresIn ?? LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS) : void 0,
              orgUUID: je,
              onCallbackListenerUnavailable: Re,
              settingsOnlyGrant: st,
            },
          ],
          ut;
        ut ??= Le.startOAuthFlow(...Lt);
        let result = await ut.catch((url_0) => {
          if (url_0 instanceof OAuthCallbackError) throw url_0;
          let isTokenExchangeError = url_0.message.includes("Token exchange failed"),
            sslHint_0 = getSSLErrorHint(url_0);
          throw (
            H({
              state: "error",
              message:
                sslHint_0 ??
                (isTokenExchangeError
                  ? "Failed to exchange authorization code for access token. Please try again."
                  : url_0.message),
              toRetry: mode === "setup-token" ? { state: "ready_to_start" } : { state: "idle" },
            }),
            logEvent("tengu_oauth_token_exchange_error", {
              ...errorTelemetryFields(url_0),
              ssl_error: sslHint_0 !== null,
            }),
            url_0
          );
        });
        if (mode === "setup-token") {
          let z = await mintApiKeyIfAllowed({ accessToken: result.accessToken, minted: result });
          if (!z.ok) throw new OrgConfigLoginRefusedError(z.message, z.evaluation);
          (H({ state: "success", token: result.accessToken, expiresAt: result.expiresAt ?? void 0 }),
            onAuthSuccess?.());
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
            }),
            be = te.ok ? te.warning : void 0;
          if (!te.ok)
            if (orgConfigGateFollows && te.evaluation.decision.verdict === "blocked")
              be = unverifiedSettingsNotice(te.evaluation);
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
            let He = await saveLoginOrWarn(result, { storageV5: storageV5, credentials: credentials }),
              qe = await validateForceLoginOrg(credentials, z.outcome === "permitted" ? z.verified : void 0);
            if (!qe.valid) {
              let Yt = await LOGIN_REFUSAL_REASONS(qe, He?.storage, {
                storageV5: storageV5,
                credentials: credentials,
              });
              throw Error(
                Yt?.restored === !1
                  ? `${qe.message}
${fnn(Yt)}`
                  : qe.message,
              );
            }
            let ye = He?.storage;
            if (ye && !ye.success) {
              if (
                (H({
                  state: "storage_failed",
                  backendName: ye.backendName,
                  sessionAuth: ye.sessionAuth,
                  transient: ye.transient,
                }),
                logEvent("tengu_oauth_persist_failure_shown", {
                  storageBackend: sanitizeStorageKindForAnalytics(ye.backendName),
                  session_auth: fromEnum(ye.sessionAuth),
                  transient: ye.transient === !0,
                }),
                ye.sessionAuth === "fresh")
              )
                ((It = "new"), onAuthSuccess?.());
              gB(
                {
                  message: ye.transient
                    ? "Claude Code login needs attention: credentials may not have been saved"
                    : "Claude Code login needs attention: credentials could not be saved",
                  notificationType: "auth_storage_failure",
                },
                B,
                { storageV5: storageV5, credentials: credentials },
              );
            } else
              (H({ state: "success", ...(be !== void 0 && { notice: be }) }),
                (It = "new"),
                onAuthSuccess?.(),
                gB({ message: "Claude Code login successful", notificationType: "auth_success" }, B, {
                  storageV5: storageV5,
                  credentials: credentials,
                }));
          } finally {
            startOAuth(It);
          }
        }
      } catch (err_0) {
        if (isOAuthCallbackError(err_0)) {
          (H({
            state: "account_on_hold",
            message: formatAccountOnHoldSignInError(isClaudeAiOrigin(err_0.errorUri)),
          }),
            logEvent("tengu_oauth_error", { account_on_hold: !0 }));
          return;
        }
        let at = err_0 instanceof OAuthCallbackError ? err_0.displayMessage : errorMessage(err_0),
          sslHint = getSSLErrorHint(err_0),
          Lt =
            mode === "setup-token" &&
            err_0 instanceof OrgConfigLoginRefusedError &&
            err_0.evaluation.decision.verdict === "refused",
          ut = {
            state:
              mode === "setup-token" || V === "claudeai" || (V === "console" && !me)
                ? "ready_to_start"
                : V === "console"
                  ? "console_method"
                  : "idle",
          };
        (H({
          state: "error",
          message: sslHint ?? at,
          ...((B3t(err_0) || err_0 instanceof OrgConfigLoginRefusedError) && { verbatim: !0 }),
          ...(Lt ? { endsCommand: !0 } : { toRetry: ut }),
        }),
          logEvent("tengu_oauth_error", { ...errorTelemetryFields(err_0), ssl_error: sslHint !== null }));
      }
    }, [
      Le,
      h,
      Ve,
      I,
      me,
      mode,
      expiresIn,
      je,
      B,
      u,
      onAuthSuccess,
      startOAuth,
      onHybridSignIn,
      V,
      storageV5,
      credentials,
      reset,
    ]),
    pendingOAuthStartRef = R(!1);
  return (
    P(() => {
      if (p.state === "ready_to_start" && !pendingOAuthStartRef.current)
        ((pendingOAuthStartRef.current = !0),
          process.nextTick(
            (startOAuth_0, pendingOAuthStartRef_0) => {
              startOAuth_0().finally(() => {
                pendingOAuthStartRef_0.current = !1;
              });
            },
            Pt,
            pendingOAuthStartRef,
          ));
    }, [p.state, Pt]),
    useTimeout(
      () => {
        (logEvent("tengu_oauth_success", { loginWithClaudeAi: h }), onDone());
      },
      mode === "setup-token" && p.state === "success" ? 500 : null,
      [mode, p, h, onDone],
    ),
    useTimeout(
      () => onAccountOnHold?.(),
      mode === "setup-token" && p.state === "account_on_hold" ? 500 : null,
      [mode, p, onAccountOnHold],
    ),
    useTimeout(
      () => onOrgConfigRefused?.(),
      mode === "setup-token" && p.state === "error" && p.endsCommand === !0 ? 500 : null,
      [mode, p, onOrgConfigRefused],
    ),
    P(
      () => () => {
        Le.cleanup();
      },
      [Le],
    ),
    r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        p.state === "waiting_for_login" &&
          Xe &&
          r(
            Box,
            {
              flexDirection: "column",
              gap: 1,
              paddingBottom: 1,
              marginX: v ? -v : void 0,
              children: [
                r(Box, {
                  flexDirection: "column",
                  paddingX: v,
                  children: [
                    ot && e(Text, { children: MANUAL_CODE_HINT }),
                    r(Box, {
                      children: [
                        e(Text, {
                          dimColor: !0,
                          children: ot
                            ? "Use the URL below to sign in "
                            : "Browser didn't open? Use the url below to sign in ",
                        }),
                        e(CopiedUrlHint, { via: copiedVia }),
                      ],
                    }),
                    e(CopyUrlFallbackHint, { via: copiedVia }),
                  ],
                }),
                e(Box, {
                  children: e(Link, {
                    url: p.url,
                    assumeSupport: !0,
                    children: e(Text, { dimColor: !0, children: p.url }),
                  }),
                }),
                Ke &&
                  e(Box, {
                    paddingX: v,
                    children: r(Text, {
                      dimColor: !0,
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
          r(
            Box,
            {
              flexDirection: "column",
              gap: 1,
              paddingTop: 1,
              children: [
                e(Text, {
                  color: "success",
                  children: "\u2713 Long-lived authentication token created successfully!",
                }),
                r(Box, {
                  flexDirection: "column",
                  gap: 1,
                  children: [
                    r(Text, {
                      children: [
                        "Your OAuth token (valid for",
                        " ",
                        formatTokenLifetimeDays(
                          p.expiresAt !== void 0 && Number.isFinite(p.expiresAt)
                            ? Math.round((p.expiresAt - Date.now()) / 1000)
                            : (expiresIn ?? LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS),
                        ),
                        "):",
                      ],
                    }),
                    e(Text, { color: "warning", children: p.token }),
                    e(Text, {
                      dimColor: !0,
                      children: "Store this token securely. You won't be able to see it again.",
                    }),
                    e(Text, {
                      dimColor: !0,
                      children: "Use this token by setting: export CLAUDE_CODE_OAUTH_TOKEN=<token>",
                    }),
                  ],
                }),
              ],
            },
            "tokenOutput",
          ),
        e(Box, {
          flexDirection: "column",
          gap: 1,
          children: e(ConsoleOAuthFlowView, {
            oauthStatus: p,
            mode: mode,
            startingMessage: startingMessage,
            forcedMethodMessage: T,
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
            cursorOffset: Wt,
            setCursorOffset: Ue,
            textInputColumns: rt,
            handleSubmitCode: handleSubmitCode,
            setOAuthStatus: H,
            setLoginWithClaudeAi: k,
            setConsoleProfileLogin: G,
            consoleProfileLoginAllowed: me,
            allowedProviders: We,
            firstPartyLoginAllowed: Ye,
            hybridSignInOnly: $e,
            setHybridRowPicked: bt,
            onAuthSuccess: onAuthSuccess,
            reloadClearedOrgDocuments: startOAuth,
            allowContinueWithoutLogin: allowContinueWithoutLogin,
          }),
        }),
      ],
    })
  );
}
/**
 * 登录状态文案（starting/waiting_for_login/保存凭证等）。
 */
//@ chunk-zkzpd9ky.js:20079-21845 fingerprint = OAuthStatusMessage (0.372)
function OAuthStatusMessage(t0) {
  let $ = w(24),
    {
      oauthStatus: oauthStatus,
      showPastePrompt: showPastePrompt,
      pastedCode: pastedCode,
      setPastedCode: setPastedCode,
      cursorOffset: cursorOffset,
      setCursorOffset: setCursorOffset,
      textInputColumns: textInputColumns,
      onSubmitCode: onSubmitCode,
    } = t0,
    k = useIsScreenReaderEnabled();
  switch (oauthStatus.state) {
    case "starting": {
      let u;
      if ($[0] === MEMO_CACHE_SENTINEL)
        ((u = e(WorkerBadge, { message: "Starting design login\u2026" })), ($[0] = u));
      else u = $[0];
      return u;
    }
    case "waiting_for_login": {
      let u;
      if ($[1] === MEMO_CACHE_SENTINEL)
        ((u = e(WorkerBadge, { message: "Waiting for browser authorization\u2026" })), ($[1] = u));
      else u = $[1];
      let m;
      if (
        $[2] !== cursorOffset ||
        $[3] !== k ||
        $[4] !== oauthStatus.url ||
        $[5] !== onSubmitCode ||
        $[6] !== pastedCode ||
        $[7] !== setCursorOffset ||
        $[8] !== setPastedCode ||
        $[9] !== showPastePrompt ||
        $[10] !== textInputColumns
      )
        ((m =
          showPastePrompt &&
          r(Box, {
            children: [
              e(Text, { children: Y }),
              e(TextInput, {
                value: pastedCode,
                onChange: setPastedCode,
                onSubmit: (value_0) => onSubmitCode(value_0, oauthStatus.url),
                cursorOffset: cursorOffset,
                onChangeCursorOffset: setCursorOffset,
                columns: textInputColumns,
                focus: !0,
                showCursor: k,
              }),
            ],
          })),
          ($[2] = cursorOffset),
          ($[3] = k),
          ($[4] = oauthStatus.url),
          ($[5] = onSubmitCode),
          ($[6] = pastedCode),
          ($[7] = setCursorOffset),
          ($[8] = setPastedCode),
          ($[9] = showPastePrompt),
          ($[10] = textInputColumns),
          ($[11] = m));
      else m = $[11];
      let _;
      if ($[12] !== m)
        ((_ = r(Box, { flexDirection: "column", gap: 1, children: [u, m] })), ($[12] = m), ($[13] = _));
      else _ = $[13];
      return _;
    }
    case "processing": {
      let u;
      if ($[14] === MEMO_CACHE_SENTINEL)
        ((u = e(WorkerBadge, { message: "Saving design credential\u2026" })), ($[14] = u));
      else u = $[14];
      return u;
    }
    case "success": {
      let u;
      if ($[15] === MEMO_CACHE_SENTINEL)
        ((u = r(Fragment, {
          children: [
            e(Text, {
              color: "success",
              children:
                "Design-system access authorized. /design-sync can now reach your claude.ai/design projects.",
            }),
            e(DesignOAuthWarning, {}),
          ],
        })),
          ($[15] = u));
      else u = $[15];
      return u;
    }
    case "error": {
      let u;
      if ($[16] !== oauthStatus.message)
        ((u = e(Text, { color: "error", children: oauthStatus.message })),
          ($[16] = oauthStatus.message),
          ($[17] = u));
      else u = $[17];
      const m = oauthStatus.toRetry
        ? "Press Enter to retry, or any other key to cancel."
        : "Press any key to close.";
      let _;
      if ($[18] !== m) ((_ = e(Text, { dimColor: !0, children: m })), ($[18] = m), ($[19] = _));
      else _ = $[19];
      let x;
      if ($[20] !== u || $[21] !== _)
        ((x = r(Box, { flexDirection: "column", gap: 1, children: [u, _] })),
          ($[20] = u),
          ($[21] = _),
          ($[22] = x));
      else x = $[22];
      return x;
    }
    case "about_to_retry": {
      let u;
      if ($[23] === MEMO_CACHE_SENTINEL)
        ((u = e(Text, { color: "permission", children: "Retrying\u2026" })), ($[23] = u));
      else u = $[23];
      return u;
    }
  }
}

export { ConsoleOAuthFlow, RECOMMENDED_SIGNIN_UNAVAILABLE_TEXT, OAuthStatusMessage };

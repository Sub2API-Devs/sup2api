/**
 * components/GatewayLogin.tsx
 *
 * 网关登录界面与托管设置重载提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s5p7fp0c.js (13)
 * attribution: placement 13
 */
import {
  init_react_production,
  useState,
  useEffectEvent,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import {
  resolveConsoleProfileTarget,
  profileRefusalFallsBack,
  profileRefusalNote,
  CONSOLE_PROFILE_CLIENT_ID,
  PROFILE_LOGIN_SCOPES,
  saveConsoleProfileLogin,
  isStoredRefreshToken,
} from "../utils/anthropicProfile.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../utils/errors.js";
import { installOAuthTokens } from "../cli/handlers/auth.js";
import { fetchAndStoreUserRoles, revokeOAuthToken } from "../services/oauth/client.js";
import { logForDebugging } from "../utils/debug.js";
import { isSameAccount } from "../services/oauth/refusedSignIn.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { getSecureStorage } from "../utils/secureStorage/index.js";
import { CLAUDE_AI_INFERENCE_SCOPE } from "../constants/oauth.js";
import { refreshRemoteManagedSettings } from "../services/remoteManagedSettings/loader.js";
import { logError } from "../utils/log.js";
import { errorKindForTelemetry } from "../services/policyLimits/startupGate.js";
import { refreshPolicyLimits } from "../services/policyLimits/PolicyLimitsClient.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import {
  GatewayLoginFlow,
  NO_GATEWAY_URL_MESSAGE,
  CERT_ROTATED_MESSAGE,
  FIRST_TRUST_MESSAGE,
  FINGERPRINT_LABEL,
  TRUST_ACCEPT_LABEL,
  PIN_MISMATCH_MESSAGE,
  LOGIN_FAILED_MESSAGE,
} from "../services/oauth/gatewayLogin/GatewayLogin.js";
import { openValidatedUrlSucceeded } from "../utils/browser.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { getSettingsFilePathForSource } from "../utils/settings/settings.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { usePreDispatchKeyHandler } from "../keybindings/useActionHandlers.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { AgentEditor } from "./agents/AgentEditor.js";
import { AutoRunIssueNotification } from "../utils/autoRunIssue.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Spinner } from "./Spinner.js";
import { usePermissionExplainerUI } from "./permissions/PermissionExplanation.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-s5p7fp0c.js:2310-2314 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s5p7fp0c.js:2310", () => {
  init_react_production();
});
//@ chunk-s5p7fp0c.js:2314-2496 placement
/**
 * Console 账号登录被拒的错误；fallbackCures 表示改用其他登录方式可解决，causeSummary 为原因摘要。
 */
class ConsoleProfileLoginError extends Error {
  fallbackCures;
  causeSummary;
  constructor(message, options) {
    super(message, {
      cause: options.cause,
    });
    this.fallbackCures = options.fallbackCures;
    this.causeSummary = options.fallbackCures ? options.causeSummary : null;
  }
}
//@ chunk-s5p7fp0c.js:2496-2771 placement
/**
 * 执行 Console 账号登录并记录 oauth_console_profile_login 结果（成功/被拒后回退/失败）。
 */
async function loginWithConsoleProfile(oauthService, profile, options = {}) {
  try {
    let result = await performConsoleProfileLogin(oauthService, profile, options);
    logFeatureOk("oauth_console_profile_login");
    return result;
  } catch (error) {
    if (error instanceof ConsoleProfileLoginError && error.fallbackCures)
      logFeatureSad("oauth_console_profile_login", "refused_fell_back");
    else
      logFeatureBad(
        "oauth_console_profile_login",
        error instanceof ConsoleProfileLoginError ? "refused" : "error",
      );
    throw error;
  }
}
//@ chunk-s5p7fp0c.js:2771-3854 placement
/**
 * Console 账号登录主体：预检可能拒绝（包成 ConsoleProfileLoginError），走 OAuth 流程、校验令牌、吊销被替换的 claude.ai 登录、安装令牌并保存账号信息；保存失败时撤销令牌。
 */
async function performConsoleProfileLogin(
  oauthService,
  profile,
  { loginHint, loginMethod, orgUUID, onCallbackListenerUnavailable, onInstallStart },
) {
  try {
    await resolveConsoleProfileTarget();
  } catch (error) {
    let refusal = profileRefusalFallsBack(error);
    if (refusal === null) throw error;
    let causeSummary = profileRefusalNote(error);
    throw new ConsoleProfileLoginError(
      errorMessage(error),
      refusal && causeSummary !== null
        ? {
            fallbackCures: true,
            causeSummary,
            cause: error,
          }
        : {
            fallbackCures: false,
            cause: error,
          },
    );
  }
  let login = await oauthService.startOAuthFlow(profile, {
    loginWithClaudeAi: false,
    oauthClient: {
      clientId: CONSOLE_PROFILE_CLIENT_ID,
      scopes: PROFILE_LOGIN_SCOPES,
    },
    loginHint,
    loginMethod,
    orgUUID,
    onCallbackListenerUnavailable,
  });
  let tokenResult = GATEWAY_LOGIN_ERROR_TEXTS(login);
  if (tokenResult instanceof Error) {
    await refreshGatewayToken(login);
    throw tokenResult;
  }
  await revokeReplacedClaudeAiLogin(await readStoredClaudeAiLogin());
  onInstallStart?.();
  let installed = await installOAuthTokens(login, {});
  let savedProfile;
  try {
    let tokenAccount = login.tokenAccount;
    savedProfile = await saveConsoleProfileLogin({
      accessToken: login.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresAtMs: tokenResult.expiresAtMs,
      scopes: login.scopes,
      organizationUuid: tokenAccount?.organizationUuid ?? login.profile?.organization.uuid,
      organizationName: tokenAccount?.organizationName ?? login.profile?.organization.name,
      accountEmail: tokenAccount?.emailAddress ?? login.profile?.account.email,
      workspaceId: tokenAccount?.workspaceId,
      workspaceName: tokenAccount?.workspaceName,
    });
  } catch (error) {
    if (!(await isStoredRefreshToken(tokenResult.refreshToken))) await refreshGatewayToken(login);
    throw error;
  }
  await fetchAndStoreUserRoles(login.accessToken).catch((error) =>
    logForDebugging(String(error), {
      level: "error",
    }),
  );
  await isSameAccount({
    ...installed,
  });
  return savedProfile;
}
//@ chunk-s5p7fp0c.js:3854-4063 placement
async function readStoredClaudeAiLogin() {
  if (getAPIProvider() !== "firstParty") return null;
  let secureStorage = getSecureStorage();
  secureStorage.invalidateCache?.();
  let claudeAiOauth = (await secureStorage.readAsync())?.claudeAiOauth;
  return claudeAiOauth?.refreshToken
    ? {
        refreshToken: claudeAiOauth.refreshToken,
        clientId: claudeAiOauth.clientId,
      }
    : null;
}
//@ chunk-s5p7fp0c.js:4063-4312 placement
async function revokeReplacedClaudeAiLogin(storedClaudeAiLogin) {
  if (storedClaudeAiLogin === null) return;
  await revokeOAuthToken(storedClaudeAiLogin.refreshToken, storedClaudeAiLogin.clientId);
  try {
    await getSecureStorage().mutate((secureState) => ({
      ...secureState,
      claudeAiOauth: undefined,
    }));
  } catch (error) {
    logForDebugging(
      `Console profile login: could not clear the replaced claude.ai login record: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  }
}
//@ chunk-s5p7fp0c.js:4312-4818 placement
function GATEWAY_LOGIN_ERROR_TEXTS(login) {
  if (!login.scopes.includes(CLAUDE_AI_INFERENCE_SCOPE))
    return Error(
      "The organization didn't grant inference access to this sign-in, so Claude Code can't use it.",
    );
  if (!login.refreshToken)
    return Error(
      "The sign-in came back without a refresh token, so it would stop working within hours. Try again.",
    );
  if (login.expiresAt === null || !Number.isFinite(login.expiresAt))
    return Error(
      "The sign-in came back without the token's expiry, so it can't be refreshed on time. Try again.",
    );
  return {
    refreshToken: login.refreshToken,
    expiresAtMs: login.expiresAt,
  };
}
//@ chunk-s5p7fp0c.js:4818-4886 placement
async function refreshGatewayToken(login) {
  if (login.refreshToken) await revokeOAuthToken(login.refreshToken, CONSOLE_PROFILE_CLIENT_ID);
}
//@ chunk-s5p7fp0c.js:4886-5325 placement
function MANAGED_RELOAD_NOTICES({ showSecurityDialog, storageV5, credentials }) {
  let settingsReload = refreshRemoteManagedSettings(showSecurityDialog, storageV5, credentials).catch(
    (error) => {
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Reloading the organization's managed settings after a sign-in threw (${errorKindForTelemetry(error)})`,
          "Reloading the organization's managed settings after a sign-in threw",
        ),
      );
      return false;
    },
  );
  refreshPolicyLimits().catch((error) =>
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Reloading the organization's policy limits after a sign-in threw (${errorKindForTelemetry(error)})`,
        "Reloading the organization's policy limits after a sign-in threw",
      ),
    ),
  );
  return settingsReload;
}
//@ chunk-s5p7fp0c.js:5325-5329 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s5p7fp0c.js:5325", () => {
  init_react_production();
});
//@ chunk-s5p7fp0c.js:5329-5352 placement
function returnFalse() {
  return false;
}
//@ chunk-s5p7fp0c.js:5352-5388 placement
function isEscape(input, key) {
  return key.escape;
}
//@ chunk-s5p7fp0c.js:5388-10633 placement
/**
 * 网关登录界面：显示网关 URL 来源（设置文件或托管设置）并完成登录
 */
function GatewayLogin(props) {
  let $ = useMemoCache(87);
  let { onDone, onCancel, initialUrl, namedBy, internalNetworks, screenLocked } = props;
  let { credentials } = useTheme_2();
  let createFlow;
  if ($[0] !== credentials) {
    createFlow = () => new GatewayLoginFlow(credentials, openValidatedUrlSucceeded);
    $[0] = credentials;
    $[1] = createFlow;
  } else createFlow = $[1];
  let [flow] = useState(createFlow);
  let storeSelector = useStoreSelector(flow.status);
  let gatewayUrl = initialUrl ?? undefined?.url;
  let caption;
  if ($[2] !== namedBy) {
    caption =
      undefined?.caption ??
      (namedBy === "developer"
        ? `Gateway URL from your settings file (${getSettingsFilePathForSource("userSettings")}), not from your organization's managed settings.`
        : "Your organization's gateway URL (set by managed settings):");
    $[2] = namedBy;
    $[3] = caption;
  } else caption = $[3];
  let children = caption;
  let finish = useEffectEvent(onDone);
  let subscribeStatus;
  if ($[4] !== finish || $[5] !== flow) {
    subscribeStatus = () => {
      let unsubscribe = flow.status.subscribe(() => {
        if (flow.status.getSnapshot().state === "done") finish();
      });
      return () => {
        unsubscribe();
        flow.cancel();
      };
    };
    $[4] = finish;
    $[5] = flow;
    $[6] = subscribeStatus;
  } else subscribeStatus = $[6];
  let statusDeps;
  if ($[7] !== flow) {
    statusDeps = [flow];
    $[7] = flow;
    $[8] = statusDeps;
  } else statusDeps = $[8];
  useEffect(subscribeStatus, statusDeps);
  let cancelOrRestart;
  if ($[9] !== onCancel || $[10] !== screenLocked || $[11] !== flow) {
    cancelOrRestart = function handleCancel() {
      if (screenLocked) flow.restart();
      else {
        flow.cancel();
        onCancel();
      }
    };
    $[9] = onCancel;
    $[10] = screenLocked;
    $[11] = flow;
    $[12] = cancelOrRestart;
  } else cancelOrRestart = $[12];
  let handleCancel = cancelOrRestart;
  let isActive = storeSelector.state === "url_input";
  let connectNow;
  if ($[13] !== gatewayUrl || $[14] !== internalNetworks || $[15] !== namedBy || $[16] !== flow) {
    connectNow = () => {
      if (gatewayUrl)
        flow.connect({
          url: gatewayUrl,
          namedBy,
          internalNetworks,
        });
    };
    $[13] = gatewayUrl;
    $[14] = internalNetworks;
    $[15] = namedBy;
    $[16] = flow;
    $[17] = connectNow;
  } else connectNow = $[17];
  let confirmYesOptions;
  if ($[18] !== isActive) {
    confirmYesOptions = {
      context: "Confirmation",
      isActive,
    };
    $[18] = isActive;
    $[19] = confirmYesOptions;
  } else confirmYesOptions = $[19];
  useKeybinding("confirm:yes", connectNow, confirmYesOptions);
  let confirmNoOptions;
  if ($[20] !== isActive) {
    confirmNoOptions = {
      context: "Confirmation",
      isActive,
    };
    $[20] = isActive;
    $[21] = confirmNoOptions;
  } else confirmNoOptions = $[21];
  useKeybinding("confirm:no", screenLocked ? returnFalse : onCancel, confirmNoOptions);
  const isActive_2 = storeSelector.state === "saving" || storeSelector.state === "done";
  let escapeOptions;
  if ($[22] !== isActive_2) {
    escapeOptions = {
      isActive: isActive_2,
    };
    $[22] = isActive_2;
    $[23] = escapeOptions;
  } else escapeOptions = $[23];
  switch ((usePreDispatchKeyHandler(isEscape, escapeOptions), storeSelector.state)) {
    case "url_input": {
      if (!gatewayUrl) {
        let missingUrlView;
        if ($[24] === MEMO_CACHE_SENTINEL) {
          missingUrlView = jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              jsxProd_default(Text, {
                bold: true,
                children: "Cloud gateway",
              }),
              jsxProd_default(Text, {
                color: "warning",
                children: NO_GATEWAY_URL_MESSAGE,
              }),
            ],
          });
          $[24] = missingUrlView;
        } else missingUrlView = $[24];
        return missingUrlView;
      }
      let titleText;
      if ($[25] === MEMO_CACHE_SENTINEL) {
        titleText = jsxProd_default(Text, {
          bold: true,
          children: "Cloud gateway",
        });
        $[25] = titleText;
      } else titleText = $[25];
      let captionText;
      if ($[26] !== children) {
        captionText = jsxProd_default(Text, {
          children,
        });
        $[26] = children;
        $[27] = captionText;
      } else captionText = $[27];
      let urlBox;
      if ($[28] !== gatewayUrl) {
        urlBox = jsxProd_default(Box, {
          borderDimColor: true,
          borderStyle: "round",
          paddingLeft: 1,
          children: jsxProd_default(Text, {
            children: gatewayUrl,
          }),
        });
        $[28] = gatewayUrl;
        $[29] = urlBox;
      } else urlBox = $[29];
      const escapeHint = screenLocked ? "" : " \xB7 Esc for other login methods";
      let pressEnterText;
      if ($[30] !== escapeHint) {
        pressEnterText = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Press Enter to connect", escapeHint],
        });
        $[30] = escapeHint;
        $[31] = pressEnterText;
      } else pressEnterText = $[31];
      let urlInputView;
      if ($[32] !== captionText || $[33] !== urlBox || $[34] !== pressEnterText) {
        urlInputView = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [titleText, captionText, urlBox, pressEnterText],
        });
        $[32] = captionText;
        $[33] = urlBox;
        $[34] = pressEnterText;
        $[35] = urlInputView;
      } else urlInputView = $[35];
      return urlInputView;
    }
    case "polling": {
      let codeEditor;
      if (
        $[36] !== handleCancel ||
        $[37] !== storeSelector.userCode ||
        $[38] !== storeSelector.verificationUri
      ) {
        codeEditor = jsxProd_default(AgentEditor, {
          userCode: storeSelector.userCode,
          verificationUri: storeSelector.verificationUri,
          onCancel: handleCancel,
        });
        $[36] = handleCancel;
        $[37] = storeSelector.userCode;
        $[38] = storeSelector.verificationUri;
        $[39] = codeEditor;
      } else codeEditor = $[39];
      return codeEditor;
    }
    case "connecting": {
      let connectingNotice;
      if ($[40] !== handleCancel) {
        connectingNotice = jsxProd_default(AutoRunIssueNotification, {
          label: "Connecting to gateway\u2026",
          onCancel: handleCancel,
        });
        $[40] = handleCancel;
        $[41] = connectingNotice;
      } else connectingNotice = $[41];
      return connectingNotice;
    }
    case "trust_prompt": {
      let trustTitle;
      if ($[42] !== storeSelector.hostname) {
        trustTitle = jsxProd_default_2(Text, {
          bold: true,
          children: [
            "Trust gateway ",
            jsxProd_default(Text, {
              color: "suggestion",
              children: storeSelector.hostname,
            }),
            "?",
          ],
        });
        $[42] = storeSelector.hostname;
        $[43] = trustTitle;
      } else trustTitle = $[43];
      let trustMessage;
      if ($[44] !== storeSelector.previouslyPinned) {
        trustMessage = storeSelector.previouslyPinned
          ? jsxProd_default(Text, {
              color: "warning",
              children: CERT_ROTATED_MESSAGE,
            })
          : jsxProd_default(Text, {
              children: FIRST_TRUST_MESSAGE,
            });
        $[44] = storeSelector.previouslyPinned;
        $[45] = trustMessage;
      } else trustMessage = $[45];
      let routeText;
      if ($[46] !== storeSelector.route) {
        routeText =
          storeSelector.route &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: ["Connecting ", storeSelector.route],
          });
        $[46] = storeSelector.route;
        $[47] = routeText;
      } else routeText = $[47];
      let fingerprintShort;
      if ($[48] !== storeSelector.fingerprint) {
        fingerprintShort = storeSelector.fingerprint.slice(0, 16);
        $[48] = storeSelector.fingerprint;
        $[49] = fingerprintShort;
      } else fingerprintShort = $[49];
      let fingerprintText;
      if ($[50] !== fingerprintShort) {
        fingerprintText = jsxProd_default_2(Text, {
          dimColor: true,
          children: [FINGERPRINT_LABEL, " ", fingerprintShort, "\u2026"],
        });
        $[50] = fingerprintShort;
        $[51] = fingerprintText;
      } else fingerprintText = $[51];
      const cancelLabel = screenLocked ? "No, go back" : "No, cancel login";
      let onConfirm;
      if ($[52] !== flow) {
        onConfirm = () => flow.trust();
        $[52] = flow;
        $[53] = onConfirm;
      } else onConfirm = $[53];
      let trustSelect;
      if ($[54] !== handleCancel || $[55] !== cancelLabel || $[56] !== onConfirm) {
        trustSelect = jsxProd_default(ConfirmSelect, {
          hideIndexes: true,
          confirmLabel: TRUST_ACCEPT_LABEL,
          cancelLabel,
          focus: "cancel",
          onConfirm,
          onCancel: handleCancel,
        });
        $[54] = handleCancel;
        $[55] = cancelLabel;
        $[56] = onConfirm;
        $[57] = trustSelect;
      } else trustSelect = $[57];
      let trustView;
      if (
        $[58] !== trustTitle ||
        $[59] !== trustMessage ||
        $[60] !== routeText ||
        $[61] !== fingerprintText ||
        $[62] !== trustSelect
      ) {
        trustView = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [trustTitle, trustMessage, routeText, fingerprintText, trustSelect],
        });
        $[58] = trustTitle;
        $[59] = trustMessage;
        $[60] = routeText;
        $[61] = fingerprintText;
        $[62] = trustSelect;
        $[63] = trustView;
      } else trustView = $[63];
      return trustView;
    }
    case "confirm_account": {
      let accountTitle;
      if ($[64] !== storeSelector.email) {
        accountTitle = jsxProd_default_2(Text, {
          bold: true,
          children: [
            "Signed in to Cloud gateway as",
            " ",
            jsxProd_default(Text, {
              color: "suggestion",
              children: storeSelector.email,
            }),
          ],
        });
        $[64] = storeSelector.email;
        $[65] = accountTitle;
      } else accountTitle = $[65];
      let pinMismatchText;
      if ($[66] === MEMO_CACHE_SENTINEL) {
        pinMismatchText = jsxProd_default(Text, {
          children: PIN_MISMATCH_MESSAGE,
        });
        $[66] = pinMismatchText;
      } else pinMismatchText = $[66];
      const cancelLabel = screenLocked ? "No, go back" : "No, cancel login";
      let onConfirm;
      if ($[67] !== flow) {
        onConfirm = () => flow.confirmAccount();
        $[67] = flow;
        $[68] = onConfirm;
      } else onConfirm = $[68];
      let onCancel;
      if ($[69] !== handleCancel) {
        onCancel = () => {
          logForDebugging("[gateway-login] signed-in account declined; nothing saved");
          handleCancel();
        };
        $[69] = handleCancel;
        $[70] = onCancel;
      } else onCancel = $[70];
      let accountSelect;
      if ($[71] !== cancelLabel || $[72] !== onConfirm || $[73] !== onCancel) {
        accountSelect = jsxProd_default(ConfirmSelect, {
          hideIndexes: true,
          focus: "cancel",
          confirmLabel: LOGIN_FAILED_MESSAGE,
          cancelLabel,
          onConfirm,
          onCancel,
        });
        $[71] = cancelLabel;
        $[72] = onConfirm;
        $[73] = onCancel;
        $[74] = accountSelect;
      } else accountSelect = $[74];
      let accountView;
      if ($[75] !== accountTitle || $[76] !== accountSelect) {
        accountView = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [accountTitle, pinMismatchText, accountSelect],
        });
        $[75] = accountTitle;
        $[76] = accountSelect;
        $[77] = accountView;
      } else accountView = $[77];
      return accountView;
    }
    case "saving":
    case "done": {
      let savingTitle;
      if ($[78] !== storeSelector.email) {
        savingTitle =
          storeSelector.email &&
          jsxProd_default_2(Text, {
            bold: true,
            children: [
              "Signed in to Cloud gateway as",
              " ",
              jsxProd_default(Text, {
                color: "suggestion",
                children: storeSelector.email,
              }),
            ],
          });
        $[78] = storeSelector.email;
        $[79] = savingTitle;
      } else savingTitle = $[79];
      let finishingRow;
      if ($[80] === MEMO_CACHE_SENTINEL) {
        finishingRow = jsxProd_default_2(Box, {
          gap: 1,
          children: [
            jsxProd_default(Spinner, {}),
            jsxProd_default(Text, {
              dimColor: true,
              children: "Finishing sign-in\u2026",
            }),
          ],
        });
        $[80] = finishingRow;
      } else finishingRow = $[80];
      let savingView;
      if ($[81] !== savingTitle) {
        savingView = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [savingTitle, finishingRow],
        });
        $[81] = savingTitle;
        $[82] = savingView;
      } else savingView = $[82];
      return savingView;
    }
    case "cancelled": {
      return null;
    }
    case "error": {
      let errorView;
      if ($[83] !== handleCancel || $[84] !== storeSelector.detail || $[85] !== storeSelector.message) {
        errorView = jsxProd_default(usePermissionExplainerUI, {
          message: storeSelector.message,
          detail: storeSelector.detail,
          onCancel: handleCancel,
        });
        $[83] = handleCancel;
        $[84] = storeSelector.detail;
        $[85] = storeSelector.message;
        $[86] = errorView;
      } else errorView = $[86];
      return errorView;
    }
  }
}
export { MANAGED_RELOAD_NOTICES, loginWithConsoleProfile, ConsoleProfileLoginError, GatewayLogin };

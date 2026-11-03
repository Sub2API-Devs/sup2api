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
import { init_react_production, y, Oo, P } from "../../vendor/react/cjs/react.production.js";
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
import { w } from "../../vendor/react/compiler-runtime.js";
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

//@ chunk-s5p7fp0c.js:2310-2314 placement
init_react_production();
//@ chunk-s5p7fp0c.js:2314-2496 placement
/**
 * Console 账号登录被拒的错误；fallbackCures 表示改用其他登录方式可解决，causeSummary 为原因摘要。
 */
class ConsoleProfileLoginError extends Error {
  fallbackCures;
  causeSummary;
  constructor(message, o) {
    super(message, {
      cause: o.cause,
    });
    this.fallbackCures = o.fallbackCures;
    this.causeSummary = o.fallbackCures ? o.causeSummary : null;
  }
}
//@ chunk-s5p7fp0c.js:2496-2771 placement
/**
 * 执行 Console 账号登录并记录 oauth_console_profile_login 结果（成功/被拒后回退/失败）。
 */
async function loginWithConsoleProfile(oauthService, o, D = {}) {
  try {
    let M = await performConsoleProfileLogin(oauthService, o, D);
    logFeatureOk("oauth_console_profile_login");
    return M;
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
  A,
  o,
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
  let U = await A.startOAuthFlow(o, {
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
  let tokenResult = GATEWAY_LOGIN_ERROR_TEXTS(U);
  if (tokenResult instanceof Error) {
    await refreshGatewayToken(U);
    throw tokenResult;
  }
  await revokeReplacedClaudeAiLogin(await readStoredClaudeAiLogin());
  onInstallStart?.();
  let installed = await installOAuthTokens(U, {});
  let savedProfile;
  try {
    let tokenAccount = U.tokenAccount;
    savedProfile = await saveConsoleProfileLogin({
      accessToken: U.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresAtMs: tokenResult.expiresAtMs,
      scopes: U.scopes,
      organizationUuid: tokenAccount?.organizationUuid ?? U.profile?.organization.uuid,
      organizationName: tokenAccount?.organizationName ?? U.profile?.organization.name,
      accountEmail: tokenAccount?.emailAddress ?? U.profile?.account.email,
      workspaceId: tokenAccount?.workspaceId,
      workspaceName: tokenAccount?.workspaceName,
    });
  } catch (error) {
    if (!(await isStoredRefreshToken(tokenResult.refreshToken))) await refreshGatewayToken(U);
    throw error;
  }
  await fetchAndStoreUserRoles(U.accessToken).catch((error) =>
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
    await getSecureStorage().mutate((o) => ({
      ...o,
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
function GATEWAY_LOGIN_ERROR_TEXTS(A) {
  if (!A.scopes.includes(CLAUDE_AI_INFERENCE_SCOPE))
    return Error(
      "The organization didn't grant inference access to this sign-in, so Claude Code can't use it.",
    );
  if (!A.refreshToken)
    return Error(
      "The sign-in came back without a refresh token, so it would stop working within hours. Try again.",
    );
  if (A.expiresAt === null || !Number.isFinite(A.expiresAt))
    return Error(
      "The sign-in came back without the token's expiry, so it can't be refreshed on time. Try again.",
    );
  return {
    refreshToken: A.refreshToken,
    expiresAtMs: A.expiresAt,
  };
}
//@ chunk-s5p7fp0c.js:4818-4886 placement
async function refreshGatewayToken(A) {
  if (A.refreshToken) await revokeOAuthToken(A.refreshToken, CONSOLE_PROFILE_CLIENT_ID);
}
//@ chunk-s5p7fp0c.js:4886-5325 placement
function MANAGED_RELOAD_NOTICES({ showSecurityDialog, storageV5, credentials }) {
  let M = refreshRemoteManagedSettings(showSecurityDialog, storageV5, credentials).catch((error) => {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Reloading the organization's managed settings after a sign-in threw (${errorKindForTelemetry(error)})`,
        "Reloading the organization's managed settings after a sign-in threw",
      ),
    );
    return false;
  });
  refreshPolicyLimits().catch((error) =>
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Reloading the organization's policy limits after a sign-in threw (${errorKindForTelemetry(error)})`,
        "Reloading the organization's policy limits after a sign-in threw",
      ),
    ),
  );
  return M;
}
//@ chunk-s5p7fp0c.js:5325-5329 placement
init_react_production();
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
  let i = w(87);
  let { onDone, onCancel, initialUrl, namedBy, internalNetworks, screenLocked } = props;
  let { credentials } = useTheme_2();
  let ae;
  if (i[0] !== credentials) {
    ae = () => new GatewayLoginFlow(credentials, openValidatedUrlSucceeded);
    i[0] = credentials;
    i[1] = ae;
  } else ae = i[1];
  let [x] = y(ae);
  let storeSelector = useStoreSelector(x.status);
  let Q = initialUrl ?? undefined?.url;
  let ue;
  if (i[2] !== namedBy) {
    ue =
      undefined?.caption ??
      (namedBy === "developer"
        ? `Gateway URL from your settings file (${getSettingsFilePathForSource("userSettings")}), not from your organization's managed settings.`
        : "Your organization's gateway URL (set by managed settings):");
    i[2] = namedBy;
    i[3] = ue;
  } else ue = i[3];
  let children = ue;
  let oe = Oo(onDone);
  let se;
  if (i[4] !== oe || i[5] !== x) {
    se = () => {
      let De = x.status.subscribe(() => {
        if (x.status.getSnapshot().state === "done") oe();
      });
      return () => {
        De();
        x.cancel();
      };
    };
    i[4] = oe;
    i[5] = x;
    i[6] = se;
  } else se = i[6];
  let Oe;
  if (i[7] !== x) {
    Oe = [x];
    i[7] = x;
    i[8] = Oe;
  } else Oe = i[8];
  P(se, Oe);
  let v;
  if (i[9] !== onCancel || i[10] !== screenLocked || i[11] !== x) {
    v = function E() {
      if (screenLocked) x.restart();
      else {
        x.cancel();
        onCancel();
      }
    };
    i[9] = onCancel;
    i[10] = screenLocked;
    i[11] = x;
    i[12] = v;
  } else v = i[12];
  let E = v;
  let isActive = storeSelector.state === "url_input";
  let we;
  if (i[13] !== Q || i[14] !== internalNetworks || i[15] !== namedBy || i[16] !== x) {
    we = () => {
      if (Q)
        x.connect({
          url: Q,
          namedBy,
          internalNetworks,
        });
    };
    i[13] = Q;
    i[14] = internalNetworks;
    i[15] = namedBy;
    i[16] = x;
    i[17] = we;
  } else we = i[17];
  let pe;
  if (i[18] !== isActive) {
    pe = {
      context: "Confirmation",
      isActive,
    };
    i[18] = isActive;
    i[19] = pe;
  } else pe = i[19];
  useKeybinding("confirm:yes", we, pe);
  let Ce;
  if (i[20] !== isActive) {
    Ce = {
      context: "Confirmation",
      isActive,
    };
    i[20] = isActive;
    i[21] = Ce;
  } else Ce = i[21];
  useKeybinding("confirm:no", screenLocked ? returnFalse : onCancel, Ce);
  const isActive_2 = storeSelector.state === "saving" || storeSelector.state === "done";
  let V;
  if (i[22] !== isActive_2) {
    V = {
      isActive: isActive_2,
    };
    i[22] = isActive_2;
    i[23] = V;
  } else V = i[23];
  switch ((usePreDispatchKeyHandler(isEscape, V), storeSelector.state)) {
    case "url_input": {
      if (!Q) {
        let T;
        if (i[24] === MEMO_CACHE_SENTINEL) {
          T = jsxProd_default_2(Box, {
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
          i[24] = T;
        } else T = i[24];
        return T;
      }
      let T;
      if (i[25] === MEMO_CACHE_SENTINEL) {
        T = jsxProd_default(Text, {
          bold: true,
          children: "Cloud gateway",
        });
        i[25] = T;
      } else T = i[25];
      let Y;
      if (i[26] !== children) {
        Y = jsxProd_default(Text, {
          children,
        });
        i[26] = children;
        i[27] = Y;
      } else Y = i[27];
      let B;
      if (i[28] !== Q) {
        B = jsxProd_default(Box, {
          borderDimColor: true,
          borderStyle: "round",
          paddingLeft: 1,
          children: jsxProd_default(Text, {
            children: Q,
          }),
        });
        i[28] = Q;
        i[29] = B;
      } else B = i[29];
      const u = screenLocked ? "" : " \xB7 Esc for other login methods";
      let p;
      if (i[30] !== u) {
        p = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Press Enter to connect", u],
        });
        i[30] = u;
        i[31] = p;
      } else p = i[31];
      let H;
      if (i[32] !== Y || i[33] !== B || i[34] !== p) {
        H = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [T, Y, B, p],
        });
        i[32] = Y;
        i[33] = B;
        i[34] = p;
        i[35] = H;
      } else H = i[35];
      return H;
    }
    case "polling": {
      let T;
      if (i[36] !== E || i[37] !== storeSelector.userCode || i[38] !== storeSelector.verificationUri) {
        T = jsxProd_default(AgentEditor, {
          userCode: storeSelector.userCode,
          verificationUri: storeSelector.verificationUri,
          onCancel: E,
        });
        i[36] = E;
        i[37] = storeSelector.userCode;
        i[38] = storeSelector.verificationUri;
        i[39] = T;
      } else T = i[39];
      return T;
    }
    case "connecting": {
      let T;
      if (i[40] !== E) {
        T = jsxProd_default(AutoRunIssueNotification, {
          label: "Connecting to gateway\u2026",
          onCancel: E,
        });
        i[40] = E;
        i[41] = T;
      } else T = i[41];
      return T;
    }
    case "trust_prompt": {
      let T;
      if (i[42] !== storeSelector.hostname) {
        T = jsxProd_default_2(Text, {
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
        i[42] = storeSelector.hostname;
        i[43] = T;
      } else T = i[43];
      let Y;
      if (i[44] !== storeSelector.previouslyPinned) {
        Y = storeSelector.previouslyPinned
          ? jsxProd_default(Text, {
              color: "warning",
              children: CERT_ROTATED_MESSAGE,
            })
          : jsxProd_default(Text, {
              children: FIRST_TRUST_MESSAGE,
            });
        i[44] = storeSelector.previouslyPinned;
        i[45] = Y;
      } else Y = i[45];
      let B;
      if (i[46] !== storeSelector.route) {
        B =
          storeSelector.route &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: ["Connecting ", storeSelector.route],
          });
        i[46] = storeSelector.route;
        i[47] = B;
      } else B = i[47];
      let u;
      if (i[48] !== storeSelector.fingerprint) {
        u = storeSelector.fingerprint.slice(0, 16);
        i[48] = storeSelector.fingerprint;
        i[49] = u;
      } else u = i[49];
      let p;
      if (i[50] !== u) {
        p = jsxProd_default_2(Text, {
          dimColor: true,
          children: [FINGERPRINT_LABEL, " ", u, "\u2026"],
        });
        i[50] = u;
        i[51] = p;
      } else p = i[51];
      const cancelLabel = screenLocked ? "No, go back" : "No, cancel login";
      let onConfirm;
      if (i[52] !== x) {
        onConfirm = () => x.trust();
        i[52] = x;
        i[53] = onConfirm;
      } else onConfirm = i[53];
      let Se;
      if (i[54] !== E || i[55] !== cancelLabel || i[56] !== onConfirm) {
        Se = jsxProd_default(ConfirmSelect, {
          hideIndexes: true,
          confirmLabel: TRUST_ACCEPT_LABEL,
          cancelLabel,
          focus: "cancel",
          onConfirm,
          onCancel: E,
        });
        i[54] = E;
        i[55] = cancelLabel;
        i[56] = onConfirm;
        i[57] = Se;
      } else Se = i[57];
      let xe;
      if (i[58] !== T || i[59] !== Y || i[60] !== B || i[61] !== p || i[62] !== Se) {
        xe = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [T, Y, B, p, Se],
        });
        i[58] = T;
        i[59] = Y;
        i[60] = B;
        i[61] = p;
        i[62] = Se;
        i[63] = xe;
      } else xe = i[63];
      return xe;
    }
    case "confirm_account": {
      let T;
      if (i[64] !== storeSelector.email) {
        T = jsxProd_default_2(Text, {
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
        i[64] = storeSelector.email;
        i[65] = T;
      } else T = i[65];
      let Y;
      if (i[66] === MEMO_CACHE_SENTINEL) {
        Y = jsxProd_default(Text, {
          children: PIN_MISMATCH_MESSAGE,
        });
        i[66] = Y;
      } else Y = i[66];
      const cancelLabel = screenLocked ? "No, go back" : "No, cancel login";
      let onConfirm;
      if (i[67] !== x) {
        onConfirm = () => x.confirmAccount();
        i[67] = x;
        i[68] = onConfirm;
      } else onConfirm = i[68];
      let onCancel;
      if (i[69] !== E) {
        onCancel = () => {
          logForDebugging("[gateway-login] signed-in account declined; nothing saved");
          E();
        };
        i[69] = E;
        i[70] = onCancel;
      } else onCancel = i[70];
      let H;
      if (i[71] !== cancelLabel || i[72] !== onConfirm || i[73] !== onCancel) {
        H = jsxProd_default(ConfirmSelect, {
          hideIndexes: true,
          focus: "cancel",
          confirmLabel: LOGIN_FAILED_MESSAGE,
          cancelLabel,
          onConfirm,
          onCancel,
        });
        i[71] = cancelLabel;
        i[72] = onConfirm;
        i[73] = onCancel;
        i[74] = H;
      } else H = i[74];
      let N;
      if (i[75] !== T || i[76] !== H) {
        N = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [T, Y, H],
        });
        i[75] = T;
        i[76] = H;
        i[77] = N;
      } else N = i[77];
      return N;
    }
    case "saving":
    case "done": {
      let T;
      if (i[78] !== storeSelector.email) {
        T =
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
        i[78] = storeSelector.email;
        i[79] = T;
      } else T = i[79];
      let Y;
      if (i[80] === MEMO_CACHE_SENTINEL) {
        Y = jsxProd_default_2(Box, {
          gap: 1,
          children: [
            jsxProd_default(Spinner, {}),
            jsxProd_default(Text, {
              dimColor: true,
              children: "Finishing sign-in\u2026",
            }),
          ],
        });
        i[80] = Y;
      } else Y = i[80];
      let B;
      if (i[81] !== T) {
        B = jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [T, Y],
        });
        i[81] = T;
        i[82] = B;
      } else B = i[82];
      return B;
    }
    case "cancelled": {
      return null;
    }
    case "error": {
      let T;
      if (i[83] !== E || i[84] !== storeSelector.detail || i[85] !== storeSelector.message) {
        T = jsxProd_default(usePermissionExplainerUI, {
          message: storeSelector.message,
          detail: storeSelector.detail,
          onCancel: E,
        });
        i[83] = E;
        i[84] = storeSelector.detail;
        i[85] = storeSelector.message;
        i[86] = T;
      } else T = i[86];
      return T;
    }
  }
}
export { MANAGED_RELOAD_NOTICES, loginWithConsoleProfile, ConsoleProfileLoginError, GatewayLogin };

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
import { j, y, Oo, P } from "../../vendor/react/cjs/react.production.js";
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
import { Me } from "./design-system/ThemeProvider.js";
import {
  GatewayLoginFlow,
  rnn,
  snn,
  onn,
  inn,
  ann,
  cnn,
  unn,
} from "../services/oauth/gatewayLogin/GatewayLogin.js";
import { fi } from "../utils/browser.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { getSettingsFilePathForSource } from "../utils/settings/settings.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { usePreDispatchKeyHandler } from "../keybindings/useActionHandlers.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { AgentEditor } from "./agents/AgentEditor.js";
import { AutoRunIssueNotification } from "../utils/autoRunIssue.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Spinner } from "./Spinner.js";
import { usePermissionExplainerUI } from "./permissions/PermissionExplanation.js";

//@ chunk-s5p7fp0c.js:2310-2314 placement
j();
/**
 * Console 账号登录被拒的错误；fallbackCures 表示改用其他登录方式可解决，causeSummary 为原因摘要。
 */
//@ chunk-s5p7fp0c.js:2314-2496 placement
class ConsoleProfileLoginError extends Error {
  fallbackCures;
  causeSummary;
  constructor(A, o) {
    super(A, { cause: o.cause });
    ((this.fallbackCures = o.fallbackCures), (this.causeSummary = o.fallbackCures ? o.causeSummary : null));
  }
}
/**
 * 执行 Console 账号登录并记录 oauth_console_profile_login 结果（成功/被拒后回退/失败）。
 */
//@ chunk-s5p7fp0c.js:2496-2771 placement
async function loginWithConsoleProfile(A, o, D = {}) {
  try {
    let M = await performConsoleProfileLogin(A, o, D);
    return (logFeatureOk("oauth_console_profile_login"), M);
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
/**
 * Console 账号登录主体：预检可能拒绝（包成 ConsoleProfileLoginError），走 OAuth 流程、校验令牌、吊销被替换的 claude.ai 登录、安装令牌并保存账号信息；保存失败时撤销令牌。
 */
//@ chunk-s5p7fp0c.js:2771-3854 placement
async function performConsoleProfileLogin(
  A,
  o,
  {
    loginHint: loginHint,
    loginMethod: loginMethod,
    orgUUID: orgUUID,
    onCallbackListenerUnavailable: onCallbackListenerUnavailable,
    onInstallStart: onInstallStart,
  },
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
        ? { fallbackCures: !0, causeSummary: causeSummary, cause: error }
        : { fallbackCures: !1, cause: error },
    );
  }
  let startOAuthFlow = await A.startOAuthFlow(o, {
      loginWithClaudeAi: !1,
      oauthClient: { clientId: CONSOLE_PROFILE_CLIENT_ID, scopes: PROFILE_LOGIN_SCOPES },
      loginHint: loginHint,
      loginMethod: loginMethod,
      orgUUID: orgUUID,
      onCallbackListenerUnavailable: onCallbackListenerUnavailable,
    }),
    tokenResult = GATEWAY_LOGIN_ERROR_TEXTS(startOAuthFlow);
  if (tokenResult instanceof Error) throw (await $t(startOAuthFlow), tokenResult);
  (await revokeReplacedClaudeAiLogin(await readStoredClaudeAiLogin()), onInstallStart?.());
  let installed = await installOAuthTokens(startOAuthFlow, {}),
    savedProfile;
  try {
    let tokenAccount = startOAuthFlow.tokenAccount;
    savedProfile = await saveConsoleProfileLogin({
      accessToken: startOAuthFlow.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresAtMs: tokenResult.expiresAtMs,
      scopes: startOAuthFlow.scopes,
      organizationUuid: tokenAccount?.organizationUuid ?? startOAuthFlow.profile?.organization.uuid,
      organizationName: tokenAccount?.organizationName ?? startOAuthFlow.profile?.organization.name,
      accountEmail: tokenAccount?.emailAddress ?? startOAuthFlow.profile?.account.email,
      workspaceId: tokenAccount?.workspaceId,
      workspaceName: tokenAccount?.workspaceName,
    });
  } catch (error) {
    if (!(await isStoredRefreshToken(tokenResult.refreshToken))) await $t(startOAuthFlow);
    throw error;
  }
  return (
    await fetchAndStoreUserRoles(startOAuthFlow.accessToken).catch((_) =>
      logForDebugging(String(_), { level: "error" }),
    ),
    await isSameAccount({ ...installed }),
    savedProfile
  );
}
//@ chunk-s5p7fp0c.js:3854-4063 placement
async function readStoredClaudeAiLogin() {
  if (getAPIProvider() !== "firstParty") return null;
  let A = getSecureStorage();
  A.invalidateCache?.();
  let o = (await A.readAsync())?.claudeAiOauth;
  return o?.refreshToken ? { refreshToken: o.refreshToken, clientId: o.clientId } : null;
}
//@ chunk-s5p7fp0c.js:4063-4312 placement
async function revokeReplacedClaudeAiLogin(A) {
  if (A === null) return;
  await revokeOAuthToken(A.refreshToken, A.clientId);
  try {
    await getSecureStorage().mutate((o) => ({ ...o, claudeAiOauth: void 0 }));
  } catch (error) {
    logForDebugging(
      `Console profile login: could not clear the replaced claude.ai login record: ${errorMessage(error)}`,
      { level: "error" },
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
  return { refreshToken: A.refreshToken, expiresAtMs: A.expiresAt };
}
//@ chunk-s5p7fp0c.js:4818-4886 placement
async function $t(A) {
  if (A.refreshToken) await revokeOAuthToken(A.refreshToken, CONSOLE_PROFILE_CLIENT_ID);
}
//@ chunk-s5p7fp0c.js:4886-5325 placement
function MANAGED_RELOAD_NOTICES({
  showSecurityDialog: showSecurityDialog,
  storageV5: storageV5,
  credentials: credentials,
}) {
  let M = refreshRemoteManagedSettings(showSecurityDialog, storageV5, credentials).catch(
    (L) => (
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Reloading the organization's managed settings after a sign-in threw (${errorKindForTelemetry(L)})`,
          "Reloading the organization's managed settings after a sign-in threw",
        ),
      ),
      !1
    ),
  );
  return (
    refreshPolicyLimits().catch((L) =>
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Reloading the organization's policy limits after a sign-in threw (${errorKindForTelemetry(L)})`,
          "Reloading the organization's policy limits after a sign-in threw",
        ),
      ),
    ),
    M
  );
}
//@ chunk-s5p7fp0c.js:5325-5329 placement
j();
//@ chunk-s5p7fp0c.js:5329-5352 placement
function Eo() {
  return !1;
}
//@ chunk-s5p7fp0c.js:5352-5388 placement
function No(Wt, Ue) {
  return Ue.escape;
}
/**
 * 网关登录界面：显示网关 URL 来源（设置文件或托管设置）并完成登录
 */
//@ chunk-s5p7fp0c.js:5388-10633 placement
function GatewayLogin(A) {
  let i = w(87),
    {
      onDone: onDone,
      onCancel: onCancel,
      initialUrl: initialUrl,
      namedBy: namedBy,
      internalNetworks: internalNetworks,
      screenLocked: screenLocked,
    } = A,
    { credentials: credentials } = Me(),
    ae;
  if (i[0] !== credentials)
    ((ae = () => new GatewayLoginFlow(credentials, fi)), (i[0] = credentials), (i[1] = ae));
  else ae = i[1];
  let [x] = y(ae),
    _ = useStoreSelector(x.status),
    Q = initialUrl ?? (void 0)?.url,
    ue;
  if (i[2] !== namedBy)
    ((ue =
      (void 0)?.caption ??
      (namedBy === "developer"
        ? `Gateway URL from your settings file (${getSettingsFilePathForSource("userSettings")}), not from your organization's managed settings.`
        : "Your organization's gateway URL (set by managed settings):")),
      (i[2] = namedBy),
      (i[3] = ue));
  else ue = i[3];
  let ve = ue,
    oe = Oo(onDone),
    se;
  if (i[4] !== oe || i[5] !== x)
    ((se = () => {
      let subscribe = x.status.subscribe(() => {
        if (x.status.getSnapshot().state === "done") oe();
      });
      return () => {
        (subscribe(), x.cancel());
      };
    }),
      (i[4] = oe),
      (i[5] = x),
      (i[6] = se));
  else se = i[6];
  let Oe;
  if (i[7] !== x) ((Oe = [x]), (i[7] = x), (i[8] = Oe));
  else Oe = i[8];
  P(se, Oe);
  let v;
  if (i[9] !== onCancel || i[10] !== screenLocked || i[11] !== x)
    ((v = function E() {
      if (screenLocked) x.restart();
      else (x.cancel(), onCancel());
    }),
      (i[9] = onCancel),
      (i[10] = screenLocked),
      (i[11] = x),
      (i[12] = v));
  else v = i[12];
  let E = v,
    ne = _.state === "url_input",
    we;
  if (i[13] !== Q || i[14] !== internalNetworks || i[15] !== namedBy || i[16] !== x)
    ((we = () => {
      if (Q) x.connect({ url: Q, namedBy: namedBy, internalNetworks: internalNetworks });
    }),
      (i[13] = Q),
      (i[14] = internalNetworks),
      (i[15] = namedBy),
      (i[16] = x),
      (i[17] = we));
  else we = i[17];
  let pe;
  if (i[18] !== ne) ((pe = { context: "Confirmation", isActive: ne }), (i[18] = ne), (i[19] = pe));
  else pe = i[19];
  useKeybinding("confirm:yes", we, pe);
  let Ce;
  if (i[20] !== ne) ((Ce = { context: "Confirmation", isActive: ne }), (i[20] = ne), (i[21] = Ce));
  else Ce = i[21];
  useKeybinding("confirm:no", screenLocked ? Eo : onCancel, Ce);
  const ge = _.state === "saving" || _.state === "done";
  let V;
  if (i[22] !== ge) ((V = { isActive: ge }), (i[22] = ge), (i[23] = V));
  else V = i[23];
  switch ((usePreDispatchKeyHandler(No, V), _.state)) {
    case "url_input": {
      if (!Q) {
        let T;
        if (i[24] === MEMO_CACHE_SENTINEL)
          ((T = r(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              e(Text, { bold: !0, children: "Cloud gateway" }),
              e(Text, { color: "warning", children: rnn }),
            ],
          })),
            (i[24] = T));
        else T = i[24];
        return T;
      }
      let T;
      if (i[25] === MEMO_CACHE_SENTINEL)
        ((T = e(Text, { bold: !0, children: "Cloud gateway" })), (i[25] = T));
      else T = i[25];
      let Y;
      if (i[26] !== ve) ((Y = e(Text, { children: ve })), (i[26] = ve), (i[27] = Y));
      else Y = i[27];
      let B;
      if (i[28] !== Q)
        ((B = e(Box, {
          borderDimColor: !0,
          borderStyle: "round",
          paddingLeft: 1,
          children: e(Text, { children: Q }),
        })),
          (i[28] = Q),
          (i[29] = B));
      else B = i[29];
      const u = screenLocked ? "" : " \xB7 Esc for other login methods";
      let p;
      if (i[30] !== u)
        ((p = r(Text, { dimColor: !0, children: ["Press Enter to connect", u] })), (i[30] = u), (i[31] = p));
      else p = i[31];
      let H;
      if (i[32] !== Y || i[33] !== B || i[34] !== p)
        ((H = r(Box, { flexDirection: "column", gap: 1, children: [T, Y, B, p] })),
          (i[32] = Y),
          (i[33] = B),
          (i[34] = p),
          (i[35] = H));
      else H = i[35];
      return H;
    }
    case "polling": {
      let T;
      if (i[36] !== E || i[37] !== _.userCode || i[38] !== _.verificationUri)
        ((T = e(AgentEditor, { userCode: _.userCode, verificationUri: _.verificationUri, onCancel: E })),
          (i[36] = E),
          (i[37] = _.userCode),
          (i[38] = _.verificationUri),
          (i[39] = T));
      else T = i[39];
      return T;
    }
    case "connecting": {
      let T;
      if (i[40] !== E)
        ((T = e(AutoRunIssueNotification, { label: "Connecting to gateway\u2026", onCancel: E })),
          (i[40] = E),
          (i[41] = T));
      else T = i[41];
      return T;
    }
    case "trust_prompt": {
      let T;
      if (i[42] !== _.hostname)
        ((T = r(Text, {
          bold: !0,
          children: ["Trust gateway ", e(Text, { color: "suggestion", children: _.hostname }), "?"],
        })),
          (i[42] = _.hostname),
          (i[43] = T));
      else T = i[43];
      let Y;
      if (i[44] !== _.previouslyPinned)
        ((Y = _.previouslyPinned ? e(Text, { color: "warning", children: snn }) : e(Text, { children: onn })),
          (i[44] = _.previouslyPinned),
          (i[45] = Y));
      else Y = i[45];
      let B;
      if (i[46] !== _.route)
        ((B = _.route && r(Text, { dimColor: !0, children: ["Connecting ", _.route] })),
          (i[46] = _.route),
          (i[47] = B));
      else B = i[47];
      let u;
      if (i[48] !== _.fingerprint) ((u = _.fingerprint.slice(0, 16)), (i[48] = _.fingerprint), (i[49] = u));
      else u = i[49];
      let p;
      if (i[50] !== u)
        ((p = r(Text, { dimColor: !0, children: [inn, " ", u, "\u2026"] })), (i[50] = u), (i[51] = p));
      else p = i[51];
      const H = screenLocked ? "No, go back" : "No, cancel login";
      let N;
      if (i[52] !== x) ((N = () => x.trust()), (i[52] = x), (i[53] = N));
      else N = i[53];
      let Se;
      if (i[54] !== E || i[55] !== H || i[56] !== N)
        ((Se = e(ConfirmSelect, {
          hideIndexes: !0,
          confirmLabel: ann,
          cancelLabel: H,
          focus: "cancel",
          onConfirm: N,
          onCancel: E,
        })),
          (i[54] = E),
          (i[55] = H),
          (i[56] = N),
          (i[57] = Se));
      else Se = i[57];
      let xe;
      if (i[58] !== T || i[59] !== Y || i[60] !== B || i[61] !== p || i[62] !== Se)
        ((xe = r(Box, { flexDirection: "column", gap: 1, children: [T, Y, B, p, Se] })),
          (i[58] = T),
          (i[59] = Y),
          (i[60] = B),
          (i[61] = p),
          (i[62] = Se),
          (i[63] = xe));
      else xe = i[63];
      return xe;
    }
    case "confirm_account": {
      let T;
      if (i[64] !== _.email)
        ((T = r(Text, {
          bold: !0,
          children: [
            "Signed in to Cloud gateway as",
            " ",
            e(Text, { color: "suggestion", children: _.email }),
          ],
        })),
          (i[64] = _.email),
          (i[65] = T));
      else T = i[65];
      let Y;
      if (i[66] === MEMO_CACHE_SENTINEL) ((Y = e(Text, { children: cnn })), (i[66] = Y));
      else Y = i[66];
      const B = screenLocked ? "No, go back" : "No, cancel login";
      let u;
      if (i[67] !== x) ((u = () => x.confirmAccount()), (i[67] = x), (i[68] = u));
      else u = i[68];
      let p;
      if (i[69] !== E)
        ((p = () => {
          (logForDebugging("[gateway-login] signed-in account declined; nothing saved"), E());
        }),
          (i[69] = E),
          (i[70] = p));
      else p = i[70];
      let H;
      if (i[71] !== B || i[72] !== u || i[73] !== p)
        ((H = e(ConfirmSelect, {
          hideIndexes: !0,
          focus: "cancel",
          confirmLabel: unn,
          cancelLabel: B,
          onConfirm: u,
          onCancel: p,
        })),
          (i[71] = B),
          (i[72] = u),
          (i[73] = p),
          (i[74] = H));
      else H = i[74];
      let N;
      if (i[75] !== T || i[76] !== H)
        ((N = r(Box, { flexDirection: "column", gap: 1, children: [T, Y, H] })),
          (i[75] = T),
          (i[76] = H),
          (i[77] = N));
      else N = i[77];
      return N;
    }
    case "saving":
    case "done": {
      let T;
      if (i[78] !== _.email)
        ((T =
          _.email &&
          r(Text, {
            bold: !0,
            children: [
              "Signed in to Cloud gateway as",
              " ",
              e(Text, { color: "suggestion", children: _.email }),
            ],
          })),
          (i[78] = _.email),
          (i[79] = T));
      else T = i[79];
      let Y;
      if (i[80] === MEMO_CACHE_SENTINEL)
        ((Y = r(Box, {
          gap: 1,
          children: [e(Spinner, {}), e(Text, { dimColor: !0, children: "Finishing sign-in\u2026" })],
        })),
          (i[80] = Y));
      else Y = i[80];
      let B;
      if (i[81] !== T)
        ((B = r(Box, { flexDirection: "column", gap: 1, children: [T, Y] })), (i[81] = T), (i[82] = B));
      else B = i[82];
      return B;
    }
    case "cancelled": {
      return null;
    }
    case "error": {
      let T;
      if (i[83] !== E || i[84] !== _.detail || i[85] !== _.message)
        ((T = e(usePermissionExplainerUI, { message: _.message, detail: _.detail, onCancel: E })),
          (i[83] = E),
          (i[84] = _.detail),
          (i[85] = _.message),
          (i[86] = T));
      else T = i[86];
      return T;
    }
  }
}

export { MANAGED_RELOAD_NOTICES, loginWithConsoleProfile, ConsoleProfileLoginError, GatewayLogin };

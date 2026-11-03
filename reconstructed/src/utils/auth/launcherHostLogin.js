/**
 * utils/auth/launcherHostLogin.ts
 *
 * 2.1.316 新增（门面模块 launcherHostLoginRefusal）。启动器宿主登录令牌续期与拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-30p0tvt0.js (39)
 * attribution: placement 39
 */
import { PROVIDER_ENV_FLAGS } from "../model/modelIds.js";
import { env } from "../env.js";
import { HostScoped } from "../hostScoped.js";
import { createEnvAccessor } from "../env/envRegistry.js";
import { gj, Gx, che, Wps } from "../managedEnvConstants.js";
import { ide } from "../tlsEnv.js";
import { ENV_PARSERS } from "../envSchema.js";
import {
  getRootSession,
  wasDescriptorAnnouncementConsumed,
  getSdkOAuthTokenRefreshCallback,
  setAuthenticatedAccount,
} from "../../bootstrap/state.js";
import {
  getAPIProvider,
  isActualFirstPartyAnthropicBaseUrl,
  isFirstPartyAnthropicHost,
} from "../model/providers.js";
import { isGatewayLoginForced } from "../auth.js";
import {
  getHostPolicyLoginPins,
  getSettingsForSource,
  getMachineAdminCredentialInputs,
} from "../settings/settings.js";
import { getOauthConfig, fileSuffixForOauthConfig } from "../../constants/oauth.js";
import { K1e, getOAuthTokenFromFileDescriptor, getApiKeyFromFileDescriptor } from "../authFileDescriptor.js";
import { isBareMode, isEnvTruthy } from "../envUtils.js";
import { logForDebugging } from "../debug.js";
import { servedSettingsLoadLeftNoAnswer } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { computeContentHash } from "../commitAttribution.js";

//@ chunk-30p0tvt0.js:991-1030 placement
function y() {
  return PROVIDER_ENV_FLAGS.some((e) => env[e]);
}
//@ chunk-30p0tvt0.js:1030-1101 placement
var sus = ["signed_out", "identity_changed", "transient", "refresh_failed"];
//@ chunk-30p0tvt0.js:1101-1145 placement
function ARi(e) {
  return sus.some((n) => n === e);
}
//@ chunk-30p0tvt0.js:1145-1155 placement
var c = 0,
  _;
//@ chunk-30p0tvt0.js:1155-1201 placement
function CRi(e) {
  (c++, (_ = { reason: e, generation: c }));
}
//@ chunk-30p0tvt0.js:1201-1229 placement
function RRi() {
  (c++, (_ = void 0));
}
//@ chunk-30p0tvt0.js:1229-1253 placement
function $yr() {
  return _;
}
//@ chunk-30p0tvt0.js:1253-1277 placement
function TXt() {
  return c;
}
//@ chunk-30p0tvt0.js:1277-1576 placement
class LauncherHostLoginState {
  token = null;
  everHeld = new Set();
  identity = null;
  hasIdentitySaidNothing = !1;
  identityReasksMade = 0;
  identityOf = null;
  endedAtRead = null;
  hasEndToSettle = !1;
  renewalHoldOffUntilMs = 0;
  judgeReplacement = null;
  readFlag = null;
  replacing = Promise.resolve();
  startupAskIds = new Set();
  wasLauncherStarted = !1;
  wasOpenToSignIn = !1;
}
/**
 * 启动器宿主登录的按会话状态、读取相关环境变量的访问器，以及身份重问间隔、续期重试间隔与续期暂停时长。
 */
//@ chunk-30p0tvt0.js:1576-1898 placement
var launcherHostLoginStates = new HostScoped(() => new LauncherHostLoginState()),
  launcherEnv = createEnvAccessor(
    Object.fromEntries(
      [
        ...gj,
        ...Gx,
        ...che,
        ...Wps,
        "ANTHROPIC_UNIX_SOCKET",
        "CLAUDE_CODE_CUSTOM_OAUTH_URL",
        "ANTHROPIC_BASE_URL",
        "ANTHROPIC_CUSTOM_HEADERS",
        "CLAUDE_CODE_HOST_CREDS_FILE",
        "CLAUDE_SESSION_INGRESS_TOKEN_FILE",
        ...ide,
      ].map((e) => [e, ENV_PARSERS.rawStr()]),
    ),
    null,
  ),
  IDENTITY_REASK_MS = 60000,
  RENEWAL_RETRY_DELAYS_MS = [5000, 30000, 120000],
  RENEWAL_HOLD_OFF_MS = 600000;
//@ chunk-30p0tvt0.js:1898-2154 placement
function isLauncherStartedProcess() {
  let of = launcherHostLoginStates.of(getRootSession().host);
  return (
    (of.wasLauncherStarted ||= Boolean(
      env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && env.CLAUDE_CODE_HOST_AUTH_ENV_VAR,
    )),
    (of.wasOpenToSignIn ||= of.wasLauncherStarted && env.CLAUDE_CODE_ENTRYPOINT !== "claude-desktop-3p"),
    of.wasLauncherStarted
  );
}
//@ chunk-30p0tvt0.js:2154-2212 placement
function mayHaveLauncherHostLoginInMemory() {
  return (isLauncherStartedProcess(), launcherHostLoginStates.of(getRootSession().host).wasOpenToSignIn);
}
//@ chunk-30p0tvt0.js:2212-2298 placement
function readLauncherStartAtClaim() {
  let of = launcherHostLoginStates.of(getRootSession().host);
  ((of.wasLauncherStarted = !1), (of.wasOpenToSignIn = !1), isLauncherStartedProcess());
}
//@ chunk-30p0tvt0.js:2298-3532 placement
function launcherHostLoginRefusal() {
  if (!isLauncherStartedProcess()) return "not_launcher_started";
  if (env.CLAUDE_CODE_DISABLE_LAUNCHER_SIGN_IN) return "switched_off";
  if (getAPIProvider() !== "firstParty") return "not_first_party";
  if (isGatewayLoginForced()) return "gateway_mandate";
  if (getHostPolicyLoginPins().forceLoginMethod === "console") return "login_method_pin";
  if (!isActualFirstPartyAnthropicBaseUrl()) return "custom_base_url";
  let e = launcherEnvRefusal((n) => {
    let o = launcherEnv[n];
    return typeof o === "string" ? o : void 0;
  });
  if (e !== null) return e;
  try {
    if (!S(getOauthConfig().BASE_API_URL)) return "api_base_not_anthropic";
  } catch {
    return "api_base_not_anthropic";
  }
  if (fileSuffixForOauthConfig() === "-local-oauth") return "endpoint_override";
  if (
    K1e() ||
    getOAuthTokenFromFileDescriptor() ||
    getApiKeyFromFileDescriptor() ||
    [...che, "CLAUDE_BG_AUTH_SNAPSHOT_PATH"].some((n) => wasDescriptorAnnouncementConsumed(n)) ||
    (isBareMode() && getSettingsForSource("flagSettings")?.apiKeyHelper)
  )
    return "launcher_credential";
  try {
    let { envs: envs, apiKeyHelper: apiKeyHelper, unread: unread } = getMachineAdminCredentialInputs();
    if (apiKeyHelper || envs.some((u) => launcherEnvRefusal((s) => u[s]) !== null))
      return "machine_policy_credential";
    if (envs.some((u) => isEnvTruthy(u.CLAUDE_CODE_DISABLE_LAUNCHER_SIGN_IN))) return "switched_off";
    if (unread) return "machine_policy_unread";
  } catch (error) {
    return (
      logForDebugging(
        `[launcher-host-login] the read of the machine's managed settings threw (${error instanceof Error ? error.name : "unknown"})`,
        { level: "error" },
      ),
      "machine_policy_unread"
    );
  }
  if (servedSettingsLoadLeftNoAnswer()) return "served_policy_unread";
  try {
    let { readFlag: readFlag } = launcherHostLoginStates.of(getRootSession().host);
    return readFlag?.("tengu_kestrel_lantern", !0) === !1 ? "switched_off" : null;
  } catch {
    return null;
  }
}
//@ chunk-30p0tvt0.js:3532-3636 placement
function usableLauncherHostLoginToken() {
  if (!isLauncherStartedProcess()) return null;
  let of = launcherHostLoginStates.of(getRootSession().host);
  return of.token !== null && dropRefusedToken(of) === null ? of.token : null;
}
//@ chunk-30p0tvt0.js:3636-3841 placement
function takeLauncherHostLoginEnd() {
  let of = launcherHostLoginStates.of(getRootSession().host);
  if (of.token !== null) dropRefusedToken(of);
  if (of.endedAtRead !== null)
    ((of.endedAtRead = null), logFeatureBad("auth_launcher_host_login", "refused_while_held"));
  let hasEndToSettle = of.hasEndToSettle;
  return ((of.hasEndToSettle = !1), hasEndToSettle);
}
//@ chunk-30p0tvt0.js:3841-3883 placement
function setLauncherHostLoginFlagReader(e) {
  launcherHostLoginStates.of(getRootSession().host).readFlag = e;
}
//@ chunk-30p0tvt0.js:3883-3933 placement
function setLauncherHostLoginReplacementJudge(e) {
  launcherHostLoginStates.of(getRootSession().host).judgeReplacement = e;
}
//@ chunk-30p0tvt0.js:3933-4041 placement
function holdStartupLauncherHostLogin(e) {
  if (!e || launcherHostLoginRefusal() !== null) return !1;
  let of = launcherHostLoginStates.of(getRootSession().host);
  return ((of.token = e), of.everHeld.add(computeContentHash(e)), !0);
}
//@ chunk-30p0tvt0.js:4041-4117 placement
function wasLauncherHostLoginToken(e) {
  let everHeld = launcherHostLoginStates.of(getRootSession().host).everHeld;
  return everHeld.size > 0 && everHeld.has(computeContentHash(e));
}
//@ chunk-30p0tvt0.js:4117-4160 placement
function isLauncherHostLoginRefusedNow(e) {
  return wasLauncherHostLoginToken(e) && usableLauncherHostLoginToken() === null;
}
//@ chunk-30p0tvt0.js:4160-4219 placement
function loginToHandOn(e) {
  return e !== null && wasLauncherHostLoginToken(e.accessToken) ? null : e;
}
//@ chunk-30p0tvt0.js:4219-4643 placement
function learnLauncherHostLoginIdentity(e) {
  let of = launcherHostLoginStates.of(getRootSession().host);
  if (((of.identityOf = e), of.identity !== null && !of.hasIdentitySaidNothing)) return of.identity;
  let o = usableLauncherHostLoginToken();
  if (o === null) return of.identity ?? Promise.resolve(null);
  let r = e(o).catch(() => null);
  return (
    (of.identity = r),
    (of.hasIdentitySaidNothing = !1),
    r.then((u) => {
      if (u !== null || of.identity !== r) return;
      of.hasIdentitySaidNothing = !0;
      let s = RENEWAL_RETRY_DELAYS_MS[of.identityReasksMade] ?? RENEWAL_HOLD_OFF_MS;
      ((of.identityReasksMade += 1), setTimeout(reaskIdentityIfCurrent, s, of, r, e).unref());
    }),
    r
  );
}
//@ chunk-30p0tvt0.js:4643-4800 placement
function reaskIdentityIfCurrent(e, n, o) {
  try {
    if (e.identity === n && launcherHostLoginStates.of(getRootSession().host) === e)
      learnLauncherHostLoginIdentity(o);
  } catch {
    logForDebugging("[launcher-host-login] asking again whose sign-in this is threw", { level: "warn" });
  }
}
//@ chunk-30p0tvt0.js:4800-4846 placement
function launcherHostLoginIdentity() {
  return launcherHostLoginStates.of(getRootSession().host).identity;
}
//@ chunk-30p0tvt0.js:4846-4939 placement
function askLauncherHostLoginIdentityAgain() {
  let { identityOf: identityOf } = launcherHostLoginStates.of(getRootSession().host);
  return identityOf === null ? Promise.resolve(null) : learnLauncherHostLoginIdentity(identityOf);
}
//@ chunk-30p0tvt0.js:4939-4991 placement
function noteLauncherStartupAsk(e) {
  launcherHostLoginStates.of(getRootSession().host).startupAskIds.add(e);
}
//@ chunk-30p0tvt0.js:4991-5077 placement
function isLauncherStartupAsk(e) {
  return (
    isLauncherStartedProcess() &&
    typeof e === "string" &&
    launcherHostLoginStates.of(getRootSession().host).startupAskIds.has(e)
  );
}
//@ chunk-30p0tvt0.js:5077-5173 placement
function forgetLauncherHostLogin() {
  let of = launcherHostLoginStates.of(getRootSession().host),
    n = of.token !== null;
  return ((of.token = null), (of.hasEndToSettle ||= n), n);
}
//@ chunk-30p0tvt0.js:5173-5405 placement
function dropRefusedToken(e) {
  let n = launcherHostLoginRefusal();
  if (n !== null && e.token !== null)
    ((e.token = null),
      (e.endedAtRead = n),
      (e.hasEndToSettle = !0),
      logForDebugging(
        `[launcher-host-login] the desktop app's sign-in is over for this process (refused_while_held: ${n})`,
        { level: "warn" },
      ));
  return n;
}
//@ chunk-30p0tvt0.js:5405-5465 placement
function renewLauncherHostLogin(e) {
  let of = launcherHostLoginStates.of(getRootSession().host);
  return E(of, () => renewLauncherHostLoginToken(of, e));
}
//@ chunk-30p0tvt0.js:5465-5715 placement
function holdPushedLauncherHostLogin(e) {
  let of = launcherHostLoginStates.of(getRootSession().host),
    o;
  try {
    o = dropRefusedToken(of);
  } catch (error) {
    return (logReplaceThrew(error), null);
  }
  if (!e || of.token === null || o !== null)
    return (
      logForDebugging(
        `[launcher-host-login] refused a pushed claude.ai token (${o ?? (e ? "none_held" : "empty")})`,
        { level: "warn" },
      ),
      null
    );
  return E(of, () => judgeReplacementToken(of, e));
}
//@ chunk-30p0tvt0.js:5715-5802 placement
function E(e, n) {
  let o = e.replacing.then(n).catch((r) => (logReplaceThrew(r), !1));
  return ((e.replacing = o), o);
}
//@ chunk-30p0tvt0.js:5802-5931 placement
function logReplaceThrew(e) {
  logForDebugging(
    `[launcher-host-login] replacing the token held threw (${e instanceof Error ? e.name : "unknown"})`,
    { level: "error" },
  );
}
//@ chunk-30p0tvt0.js:5931-6648 placement
async function renewLauncherHostLoginToken(e, n) {
  if (e.token === null || dropRefusedToken(e) !== null) return !1;
  if (e.token !== n) return !0;
  let o = getSdkOAuthTokenRefreshCallback();
  if (!o || Date.now() < e.renewalHoldOffUntilMs) return !1;
  let r = TXt(),
    u;
  try {
    u = await o();
  } catch (error) {
    return (
      logForDebugging(
        `[launcher-host-login] oauth_token_refresh failed (${error instanceof Error ? error.name : "unknown"})`,
        { level: "warn" },
      ),
      (e.renewalHoldOffUntilMs = Date.now() + IDENTITY_REASK_MS),
      logFeatureBad("auth_launcher_host_login", "request_failed"),
      !1
    );
  }
  if (e.token === null) return !1;
  if (launcherHostLoginRefusal() !== null) return (endLauncherHostLogin(e, "refused_after_answer"), !1);
  if (!u) {
    let s = $yr();
    if (s !== void 0 && s.generation > r && s.reason === "identity_changed")
      return (endLauncherHostLogin(e, "identity_changed"), !1);
    return (logFeatureBad("auth_launcher_host_login", "no_token"), !1);
  }
  if (u === n) return (logFeatureBad("auth_launcher_host_login", "same_token"), !1);
  return judgeReplacementToken(e, u, !0);
}
//@ chunk-30p0tvt0.js:6648-7368 placement
async function judgeReplacementToken(e, n, o = !1) {
  if (e.token === null || dropRefusedToken(e) !== null) return !1;
  if (n === e.token) return !0;
  let r = "refused";
  try {
    if (e.judgeReplacement !== null) r = await e.judgeReplacement(n);
  } catch (error) {
    logForDebugging(
      `[launcher-host-login] the replacement could not be judged (${error instanceof Error ? error.name : "unknown"})`,
      { level: "error" },
    );
  }
  if (e.token === null) return !1;
  if (r === "held_unknown" && o) return (endLauncherHostLogin(e, "identity_never_learned"), !1);
  if (r === "unverified" || r === "held_unknown")
    return (
      (e.renewalHoldOffUntilMs = Date.now() + IDENTITY_REASK_MS),
      logFeatureBad("auth_launcher_host_login", "replacement_unverified"),
      !1
    );
  if (r === "allowed" && launcherHostLoginRefusal() === null)
    return (
      (e.token = n),
      e.everHeld.add(computeContentHash(n)),
      setAuthenticatedAccount(null),
      logFeatureOk("auth_launcher_host_login"),
      !0
    );
  return (endLauncherHostLogin(e, r === "allowed" ? "refused_after_answer" : "replacement_refused"), !1);
}
//@ chunk-30p0tvt0.js:7368-7549 placement
function endLauncherHostLogin(e, n) {
  ((e.token = null),
    (e.hasEndToSettle = !0),
    logForDebugging(`[launcher-host-login] the desktop app's sign-in is over for this process (${n})`, {
      level: "warn",
    }),
    logFeatureBad("auth_launcher_host_login", n));
}
/**
 * 检查环境是否不允许使用桌面应用下发的登录：非一方提供方、Unix socket、自定义 OAuth、不安全的 base URL、端点覆盖、启动器凭据或关闭了 TLS 校验。
 */
//@ chunk-30p0tvt0.js:7549-8235 placement
function launcherEnvRefusal(readEnv) {
  if (gj.some((o) => o.startsWith("CLAUDE_CODE_USE_") && isEnvTruthy(readEnv(o)))) return "not_first_party";
  if (readEnv("ANTHROPIC_UNIX_SOCKET")?.trim()) return "unix_socket";
  if (readEnv("CLAUDE_CODE_CUSTOM_OAUTH_URL")?.trim()) return "custom_oauth_deployment";
  let baseUrl = readEnv("ANTHROPIC_BASE_URL")?.trim();
  if (baseUrl && !S(baseUrl)) return "insecure_base_url";
  if (Wps.some((o) => readEnv(o)?.trim())) return "endpoint_override";
  if (
    readEnv("ANTHROPIC_CUSTOM_HEADERS")?.trim() ||
    readEnv("CLAUDE_CODE_HOST_CREDS_FILE")?.trim() ||
    readEnv("CLAUDE_SESSION_INGRESS_TOKEN_FILE")?.trim() ||
    Gx.some((o) => readEnv(o)?.trim()) ||
    che.some((o) => readEnv(o)?.trim())
  )
    return "launcher_credential";
  if (
    ide.some((o) => {
      let r = readEnv(o);
      return r !== void 0 && r !== "1";
    })
  )
    return "tls_verification_disabled";
  return null;
}
//@ chunk-30p0tvt0.js:8235-8294 placement
function S(e) {
  return isFirstPartyAnthropicHost(e) && new URL(e).protocol === "https:";
}

export {
  sus,
  mayHaveLauncherHostLoginInMemory,
  isLauncherStartedProcess,
  usableLauncherHostLoginToken,
  forgetLauncherHostLogin,
  renewLauncherHostLogin,
  launcherHostLoginIdentity,
  askLauncherHostLoginIdentityAgain,
  setLauncherHostLoginReplacementJudge,
  y,
  takeLauncherHostLoginEnd,
  launcherHostLoginRefusal,
  learnLauncherHostLoginIdentity,
  $yr,
  TXt,
  loginToHandOn,
  holdPushedLauncherHostLogin,
  isLauncherStartupAsk,
  RRi,
  CRi,
  isLauncherHostLoginRefusedNow,
  wasLauncherHostLoginToken,
  setLauncherHostLoginFlagReader,
  noteLauncherStartupAsk,
  holdStartupLauncherHostLogin,
  readLauncherStartAtClaim,
  ARi,
};

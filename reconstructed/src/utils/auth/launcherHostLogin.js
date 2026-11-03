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
import {
  PROVIDER_SELECTION_ENV_VARS,
  PROVIDER_CREDENTIAL_ENV_VARS,
  TOKEN_FD_ENV_VARS,
  HOST_SERVICE_BASE_URL_VARS,
} from "../managedEnvConstants.js";
import { TLS_ENV_VARS } from "../tlsEnv.js";
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
import {
  hasBgAuthSnapshotPending,
  getOAuthTokenFromFileDescriptor,
  getApiKeyFromFileDescriptor,
} from "../authFileDescriptor.js";
import { isBareMode, isEnvTruthy } from "../envUtils.js";
import { logForDebugging } from "../debug.js";
import { servedSettingsLoadLeftNoAnswer } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { computeContentHash } from "../commitAttribution.js";

//@ chunk-30p0tvt0.js:991-1030 placement
/**
 * 判断是否设置了任一的第三方提供方环境变量。
 */
function hasProviderEnvFlag() {
  return PROVIDER_ENV_FLAGS.some((e) => env[e]);
}
//@ chunk-30p0tvt0.js:1030-1101 placement
/**
 * 宿主登录结束的原因集合（登出、身份变化、临时失败、刷新失败）。
 */
var LAUNCHER_END_REASONS = ["signed_out", "identity_changed", "transient", "refresh_failed"];
//@ chunk-30p0tvt0.js:1101-1145 placement
/**
 * 判断字符串是否为已知的登录结束原因。
 */
function isLauncherEndReason(e) {
  return LAUNCHER_END_REASONS.some((n) => n === e);
}
//@ chunk-30p0tvt0.js:1145-1155 placement
/**
 * 宿主登录的代次计数（每次结束或清除都递增）。
 */
var launcherLoginGeneration = 0;
var _;
//@ chunk-30p0tvt0.js:1155-1201 placement
/**
 * 记录一次登录结束（原因与代次）。
 */
function recordLauncherLoginEnd(reason) {
  launcherLoginGeneration++;
  _ = {
    reason,
    generation: launcherLoginGeneration,
  };
}
//@ chunk-30p0tvt0.js:1201-1229 placement
/**
 * 清除登录结束记录并递增代次。
 */
function clearLauncherLoginEnd() {
  launcherLoginGeneration++;
  _ = undefined;
}
//@ chunk-30p0tvt0.js:1229-1253 placement
/**
 * 读取当前的登录结束记录。
 */
function getLauncherLoginEnd() {
  return _;
}
//@ chunk-30p0tvt0.js:1253-1277 placement
/**
 * 读取当前的登录代次。
 */
function getLauncherLoginGeneration() {
  return launcherLoginGeneration;
}
//@ chunk-30p0tvt0.js:1277-1576 placement
class LauncherHostLoginState {
  token = null;
  everHeld = new Set();
  identity = null;
  hasIdentitySaidNothing = false;
  identityReasksMade = 0;
  identityOf = null;
  endedAtRead = null;
  hasEndToSettle = false;
  renewalHoldOffUntilMs = 0;
  judgeReplacement = null;
  readFlag = null;
  replacing = Promise.resolve();
  startupAskIds = new Set();
  wasLauncherStarted = false;
  wasOpenToSignIn = false;
}
//@ chunk-30p0tvt0.js:1576-1898 placement
/**
 * 启动器宿主登录的按会话状态、读取相关环境变量的访问器，以及身份重问间隔、续期重试间隔与续期暂停时长。
 */
var launcherHostLoginStates = new HostScoped(() => new LauncherHostLoginState());
var launcherEnv = createEnvAccessor(
  Object.fromEntries(
    [
      ...PROVIDER_SELECTION_ENV_VARS,
      ...PROVIDER_CREDENTIAL_ENV_VARS,
      ...TOKEN_FD_ENV_VARS,
      ...HOST_SERVICE_BASE_URL_VARS,
      "ANTHROPIC_UNIX_SOCKET",
      "CLAUDE_CODE_CUSTOM_OAUTH_URL",
      "ANTHROPIC_BASE_URL",
      "ANTHROPIC_CUSTOM_HEADERS",
      "CLAUDE_CODE_HOST_CREDS_FILE",
      "CLAUDE_SESSION_INGRESS_TOKEN_FILE",
      ...TLS_ENV_VARS,
    ].map((e) => [e, ENV_PARSERS.rawStr()]),
  ),
  null,
);
var IDENTITY_REASK_MS = 60000;
var RENEWAL_RETRY_DELAYS_MS = [5000, 30000, 120000];
var RENEWAL_HOLD_OFF_MS = 600000;
//@ chunk-30p0tvt0.js:1898-2154 placement
function isLauncherStartedProcess() {
  let e = launcherHostLoginStates.of(getRootSession().host);
  e.wasLauncherStarted ||= Boolean(
    env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && env.CLAUDE_CODE_HOST_AUTH_ENV_VAR,
  );
  e.wasOpenToSignIn ||= e.wasLauncherStarted && env.CLAUDE_CODE_ENTRYPOINT !== "claude-desktop-3p";
  return e.wasLauncherStarted;
}
//@ chunk-30p0tvt0.js:2154-2212 placement
function mayHaveLauncherHostLoginInMemory() {
  isLauncherStartedProcess();
  return launcherHostLoginStates.of(getRootSession().host).wasOpenToSignIn;
}
//@ chunk-30p0tvt0.js:2212-2298 placement
function readLauncherStartAtClaim() {
  let e = launcherHostLoginStates.of(getRootSession().host);
  e.wasLauncherStarted = false;
  e.wasOpenToSignIn = false;
  isLauncherStartedProcess();
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
    return typeof o === "string" ? o : undefined;
  });
  if (e !== null) return e;
  try {
    if (!isHttpsAnthropicHost(getOauthConfig().BASE_API_URL)) return "api_base_not_anthropic";
  } catch {
    return "api_base_not_anthropic";
  }
  if (fileSuffixForOauthConfig() === "-local-oauth") return "endpoint_override";
  if (
    hasBgAuthSnapshotPending() ||
    getOAuthTokenFromFileDescriptor() ||
    getApiKeyFromFileDescriptor() ||
    [...TOKEN_FD_ENV_VARS, "CLAUDE_BG_AUTH_SNAPSHOT_PATH"].some((n) =>
      wasDescriptorAnnouncementConsumed(n),
    ) ||
    (isBareMode() && getSettingsForSource("flagSettings")?.apiKeyHelper)
  )
    return "launcher_credential";
  try {
    let { envs, apiKeyHelper, unread } = getMachineAdminCredentialInputs();
    if (apiKeyHelper || envs.some((env) => launcherEnvRefusal((s) => env[s]) !== null))
      return "machine_policy_credential";
    if (envs.some((env) => isEnvTruthy(env.CLAUDE_CODE_DISABLE_LAUNCHER_SIGN_IN))) return "switched_off";
    if (unread) return "machine_policy_unread";
  } catch (error) {
    logForDebugging(
      `[launcher-host-login] the read of the machine's managed settings threw (${error instanceof Error ? error.name : "unknown"})`,
      {
        level: "error",
      },
    );
    return "machine_policy_unread";
  }
  if (servedSettingsLoadLeftNoAnswer()) return "served_policy_unread";
  try {
    let { readFlag } = launcherHostLoginStates.of(getRootSession().host);
    return readFlag?.("tengu_kestrel_lantern", true) === false ? "switched_off" : null;
  } catch {
    return null;
  }
}
//@ chunk-30p0tvt0.js:3532-3636 placement
function usableLauncherHostLoginToken() {
  if (!isLauncherStartedProcess()) return null;
  let e = launcherHostLoginStates.of(getRootSession().host);
  return e.token !== null && dropRefusedToken(e) === null ? e.token : null;
}
//@ chunk-30p0tvt0.js:3636-3841 placement
function takeLauncherHostLoginEnd() {
  let e = launcherHostLoginStates.of(getRootSession().host);
  if (e.token !== null) dropRefusedToken(e);
  if (e.endedAtRead !== null) {
    e.endedAtRead = null;
    logFeatureBad("auth_launcher_host_login", "refused_while_held");
  }
  let hasEndToSettle = e.hasEndToSettle;
  e.hasEndToSettle = false;
  return hasEndToSettle;
}
//@ chunk-30p0tvt0.js:3841-3883 placement
function setLauncherHostLoginFlagReader(readFlag) {
  launcherHostLoginStates.of(getRootSession().host).readFlag = readFlag;
}
//@ chunk-30p0tvt0.js:3883-3933 placement
function setLauncherHostLoginReplacementJudge(judgeReplacement) {
  launcherHostLoginStates.of(getRootSession().host).judgeReplacement = judgeReplacement;
}
//@ chunk-30p0tvt0.js:3933-4041 placement
function holdStartupLauncherHostLogin(token) {
  if (!token || launcherHostLoginRefusal() !== null) return false;
  let n = launcherHostLoginStates.of(getRootSession().host);
  n.token = token;
  n.everHeld.add(computeContentHash(token));
  return true;
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
function loginToHandOn(claudeAIOAuthTokens) {
  return claudeAIOAuthTokens !== null && wasLauncherHostLoginToken(claudeAIOAuthTokens.accessToken)
    ? null
    : claudeAIOAuthTokens;
}
//@ chunk-30p0tvt0.js:4219-4643 placement
function learnLauncherHostLoginIdentity(e) {
  let n = launcherHostLoginStates.of(getRootSession().host);
  n.identityOf = e;
  if (n.identity !== null && !n.hasIdentitySaidNothing) return n.identity;
  let o = usableLauncherHostLoginToken();
  if (o === null) return n.identity ?? Promise.resolve(null);
  let r = e(o).catch(() => null);
  n.identity = r;
  n.hasIdentitySaidNothing = false;
  r.then((u) => {
    if (u !== null || n.identity !== r) return;
    n.hasIdentitySaidNothing = true;
    let s = RENEWAL_RETRY_DELAYS_MS[n.identityReasksMade] ?? RENEWAL_HOLD_OFF_MS;
    n.identityReasksMade += 1;
    setTimeout(reaskIdentityIfCurrent, s, n, r, e).unref();
  });
  return r;
}
//@ chunk-30p0tvt0.js:4643-4800 placement
function reaskIdentityIfCurrent(e, n, o) {
  try {
    if (e.identity === n && launcherHostLoginStates.of(getRootSession().host) === e)
      learnLauncherHostLoginIdentity(o);
  } catch {
    logForDebugging("[launcher-host-login] asking again whose sign-in this is threw", {
      level: "warn",
    });
  }
}
//@ chunk-30p0tvt0.js:4800-4846 placement
function launcherHostLoginIdentity() {
  return launcherHostLoginStates.of(getRootSession().host).identity;
}
//@ chunk-30p0tvt0.js:4846-4939 placement
function askLauncherHostLoginIdentityAgain() {
  let { identityOf } = launcherHostLoginStates.of(getRootSession().host);
  return identityOf === null ? Promise.resolve(null) : learnLauncherHostLoginIdentity(identityOf);
}
//@ chunk-30p0tvt0.js:4939-4991 placement
function noteLauncherStartupAsk(requestId) {
  launcherHostLoginStates.of(getRootSession().host).startupAskIds.add(requestId);
}
//@ chunk-30p0tvt0.js:4991-5077 placement
function isLauncherStartupAsk(requestId) {
  return (
    isLauncherStartedProcess() &&
    typeof requestId === "string" &&
    launcherHostLoginStates.of(getRootSession().host).startupAskIds.has(requestId)
  );
}
//@ chunk-30p0tvt0.js:5077-5173 placement
function forgetLauncherHostLogin() {
  let e = launcherHostLoginStates.of(getRootSession().host);
  let n = e.token !== null;
  e.token = null;
  e.hasEndToSettle ||= n;
  return n;
}
//@ chunk-30p0tvt0.js:5173-5405 placement
function dropRefusedToken(e) {
  let n = launcherHostLoginRefusal();
  if (n !== null && e.token !== null) {
    e.token = null;
    e.endedAtRead = n;
    e.hasEndToSettle = true;
    logForDebugging(
      `[launcher-host-login] the desktop app's sign-in is over for this process (refused_while_held: ${n})`,
      {
        level: "warn",
      },
    );
  }
  return n;
}
//@ chunk-30p0tvt0.js:5405-5465 placement
function renewLauncherHostLogin(e) {
  let n = launcherHostLoginStates.of(getRootSession().host);
  return chainReplacement(n, () => renewLauncherHostLoginToken(n, e));
}
//@ chunk-30p0tvt0.js:5465-5715 placement
function holdPushedLauncherHostLogin(e) {
  let n = launcherHostLoginStates.of(getRootSession().host);
  let o;
  try {
    o = dropRefusedToken(n);
  } catch (error) {
    logReplaceThrew(error);
    return null;
  }
  if (!e || n.token === null || o !== null) {
    logForDebugging(
      `[launcher-host-login] refused a pushed claude.ai token (${o ?? (e ? "none_held" : "empty")})`,
      {
        level: "warn",
      },
    );
    return null;
  }
  return chainReplacement(n, () => judgeReplacementToken(n, e));
}
//@ chunk-30p0tvt0.js:5715-5802 placement
/**
 * 串行执行令牌替换任务，失败时记日志并返回 false。
 */
function chainReplacement(e, n) {
  let o = e.replacing.then(n).catch((error) => {
    logReplaceThrew(error);
    return false;
  });
  e.replacing = o;
  return o;
}
//@ chunk-30p0tvt0.js:5802-5931 placement
function logReplaceThrew(error) {
  logForDebugging(
    `[launcher-host-login] replacing the token held threw (${error instanceof Error ? error.name : "unknown"})`,
    {
      level: "error",
    },
  );
}
//@ chunk-30p0tvt0.js:5931-6648 placement
async function renewLauncherHostLoginToken(e, n) {
  if (e.token === null || dropRefusedToken(e) !== null) return false;
  if (e.token !== n) return true;
  let sdkOAuthTokenRefreshCallback = getSdkOAuthTokenRefreshCallback();
  if (!sdkOAuthTokenRefreshCallback || Date.now() < e.renewalHoldOffUntilMs) return false;
  let launcherLoginGeneration = getLauncherLoginGeneration();
  let u;
  try {
    u = await sdkOAuthTokenRefreshCallback();
  } catch (error) {
    logForDebugging(
      `[launcher-host-login] oauth_token_refresh failed (${error instanceof Error ? error.name : "unknown"})`,
      {
        level: "warn",
      },
    );
    e.renewalHoldOffUntilMs = Date.now() + IDENTITY_REASK_MS;
    logFeatureBad("auth_launcher_host_login", "request_failed");
    return false;
  }
  if (e.token === null) return false;
  if (launcherHostLoginRefusal() !== null) {
    endLauncherHostLogin(e, "refused_after_answer");
    return false;
  }
  if (!u) {
    let launcherLoginEnd = getLauncherLoginEnd();
    if (
      launcherLoginEnd !== undefined &&
      launcherLoginEnd.generation > launcherLoginGeneration &&
      launcherLoginEnd.reason === "identity_changed"
    ) {
      endLauncherHostLogin(e, "identity_changed");
      return false;
    }
    logFeatureBad("auth_launcher_host_login", "no_token");
    return false;
  }
  if (u === n) {
    logFeatureBad("auth_launcher_host_login", "same_token");
    return false;
  }
  return judgeReplacementToken(e, u, true);
}
//@ chunk-30p0tvt0.js:6648-7368 placement
async function judgeReplacementToken(e, n, o = false) {
  if (e.token === null || dropRefusedToken(e) !== null) return false;
  if (n === e.token) return true;
  let r = "refused";
  try {
    if (e.judgeReplacement !== null) r = await e.judgeReplacement(n);
  } catch (error) {
    logForDebugging(
      `[launcher-host-login] the replacement could not be judged (${error instanceof Error ? error.name : "unknown"})`,
      {
        level: "error",
      },
    );
  }
  if (e.token === null) return false;
  if (r === "held_unknown" && o) {
    endLauncherHostLogin(e, "identity_never_learned");
    return false;
  }
  if (r === "unverified" || r === "held_unknown") {
    e.renewalHoldOffUntilMs = Date.now() + IDENTITY_REASK_MS;
    logFeatureBad("auth_launcher_host_login", "replacement_unverified");
    return false;
  }
  if (r === "allowed" && launcherHostLoginRefusal() === null) {
    e.token = n;
    e.everHeld.add(computeContentHash(n));
    setAuthenticatedAccount(null);
    logFeatureOk("auth_launcher_host_login");
    return true;
  }
  endLauncherHostLogin(e, r === "allowed" ? "refused_after_answer" : "replacement_refused");
  return false;
}
//@ chunk-30p0tvt0.js:7368-7549 placement
function endLauncherHostLogin(e, n) {
  e.token = null;
  e.hasEndToSettle = true;
  logForDebugging(`[launcher-host-login] the desktop app's sign-in is over for this process (${n})`, {
    level: "warn",
  });
  logFeatureBad("auth_launcher_host_login", n);
}
//@ chunk-30p0tvt0.js:7549-8235 placement
/**
 * 检查环境是否不允许使用桌面应用下发的登录：非一方提供方、Unix socket、自定义 OAuth、不安全的 base URL、端点覆盖、启动器凭据或关闭了 TLS 校验。
 */
function launcherEnvRefusal(readEnv) {
  if (PROVIDER_SELECTION_ENV_VARS.some((o) => o.startsWith("CLAUDE_CODE_USE_") && isEnvTruthy(readEnv(o))))
    return "not_first_party";
  if (readEnv("ANTHROPIC_UNIX_SOCKET")?.trim()) return "unix_socket";
  if (readEnv("CLAUDE_CODE_CUSTOM_OAUTH_URL")?.trim()) return "custom_oauth_deployment";
  let baseUrl = readEnv("ANTHROPIC_BASE_URL")?.trim();
  if (baseUrl && !isHttpsAnthropicHost(baseUrl)) return "insecure_base_url";
  if (HOST_SERVICE_BASE_URL_VARS.some((o) => readEnv(o)?.trim())) return "endpoint_override";
  if (
    readEnv("ANTHROPIC_CUSTOM_HEADERS")?.trim() ||
    readEnv("CLAUDE_CODE_HOST_CREDS_FILE")?.trim() ||
    readEnv("CLAUDE_SESSION_INGRESS_TOKEN_FILE")?.trim() ||
    PROVIDER_CREDENTIAL_ENV_VARS.some((o) => readEnv(o)?.trim()) ||
    TOKEN_FD_ENV_VARS.some((o) => readEnv(o)?.trim())
  )
    return "launcher_credential";
  if (
    TLS_ENV_VARS.some((o) => {
      let env = readEnv(o);
      return env !== undefined && env !== "1";
    })
  )
    return "tls_verification_disabled";
  return null;
}
//@ chunk-30p0tvt0.js:8235-8294 placement
/**
 * 判断 URL 是否为 https 的 Anthropic 主机。
 */
function isHttpsAnthropicHost(e) {
  return isFirstPartyAnthropicHost(e) && new URL(e).protocol === "https:";
}
export {
  LAUNCHER_END_REASONS,
  mayHaveLauncherHostLoginInMemory,
  isLauncherStartedProcess,
  usableLauncherHostLoginToken,
  forgetLauncherHostLogin,
  renewLauncherHostLogin,
  launcherHostLoginIdentity,
  askLauncherHostLoginIdentityAgain,
  setLauncherHostLoginReplacementJudge,
  hasProviderEnvFlag,
  takeLauncherHostLoginEnd,
  launcherHostLoginRefusal,
  learnLauncherHostLoginIdentity,
  getLauncherLoginEnd,
  getLauncherLoginGeneration,
  loginToHandOn,
  holdPushedLauncherHostLogin,
  isLauncherStartupAsk,
  clearLauncherLoginEnd,
  recordLauncherLoginEnd,
  isLauncherHostLoginRefusedNow,
  wasLauncherHostLoginToken,
  setLauncherHostLoginFlagReader,
  noteLauncherStartupAsk,
  holdStartupLauncherHostLogin,
  readLauncherStartAtClaim,
  isLauncherEndReason,
};

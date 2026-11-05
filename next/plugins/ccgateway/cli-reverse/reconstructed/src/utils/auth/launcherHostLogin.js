/**
 * utils/auth/launcherHostLogin.ts
 *
 * 2.1.316 新增（门面模块 launcherHostLoginRefusal）。启动器宿主登录令牌续期与拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vgaj51qh.js (39)
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
  dropAuthenticatedAccountForNewToken,
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vgaj51qh.js:991-1030 placement
/**
 * 判断是否设置了任一的第三方提供方环境变量。
 */
function hasProviderEnvFlag() {
  return PROVIDER_ENV_FLAGS.some((flagName) => env[flagName]);
}
//@ chunk-vgaj51qh.js:1030-1101 placement
/**
 * 宿主登录结束的原因集合（登出、身份变化、临时失败、刷新失败）。
 */
var LAUNCHER_END_REASONS = ["signed_out", "identity_changed", "transient", "refresh_failed"];
//@ chunk-vgaj51qh.js:1101-1145 placement
/**
 * 判断字符串是否为已知的登录结束原因。
 */
function isLauncherEndReason(endReason) {
  return LAUNCHER_END_REASONS.some((reason) => reason === endReason);
}
//@ chunk-vgaj51qh.js:1145-1155 placement
/**
 * 宿主登录的代次计数（每次结束或清除都递增）。
 */
var launcherLoginGeneration = 0;
var _;
//@ chunk-vgaj51qh.js:1155-1201 placement
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
//@ chunk-vgaj51qh.js:1201-1229 placement
/**
 * 清除登录结束记录并递增代次。
 */
function clearLauncherLoginEnd() {
  launcherLoginGeneration++;
  _ = undefined;
}
//@ chunk-vgaj51qh.js:1229-1253 placement
/**
 * 读取当前的登录结束记录。
 */
function getLauncherLoginEnd() {
  return _;
}
//@ chunk-vgaj51qh.js:1253-1277 placement
/**
 * 读取当前的登录代次。
 */
function getLauncherLoginGeneration() {
  return launcherLoginGeneration;
}
//@ chunk-vgaj51qh.js:1277-1576 placement
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
//@ chunk-vgaj51qh.js:1576-1898 placement
/**
 * 启动器宿主登录的按会话状态、读取相关环境变量的访问器，以及身份重问间隔、续期重试间隔与续期暂停时长。
 */
var launcherHostLoginStates; // deferred: uses LauncherHostLoginState of its import cycle while loading; runs once the cycle is complete
var launcherEnv;
var IDENTITY_REASK_MS;
var RENEWAL_RETRY_DELAYS_MS;
var RENEWAL_HOLD_OFF_MS;
deferInit("chunk-vgaj51qh.js:1576", () => {
  launcherHostLoginStates = new HostScoped(() => new LauncherHostLoginState());
  launcherEnv = createEnvAccessor(
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
      ].map((envVarName) => [envVarName, ENV_PARSERS.rawStr()]),
    ),
    null,
  );
  IDENTITY_REASK_MS = 60000;
  RENEWAL_RETRY_DELAYS_MS = [5000, 30000, 120000];
  RENEWAL_HOLD_OFF_MS = 600000;
});
//@ chunk-vgaj51qh.js:1898-2154 placement
function isLauncherStartedProcess() {
  let state = launcherHostLoginStates.of(getRootSession().host);
  state.wasLauncherStarted ||= Boolean(
    env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && env.CLAUDE_CODE_HOST_AUTH_ENV_VAR,
  );
  state.wasOpenToSignIn ||= state.wasLauncherStarted && env.CLAUDE_CODE_ENTRYPOINT !== "claude-desktop-3p";
  return state.wasLauncherStarted;
}
//@ chunk-vgaj51qh.js:2154-2212 placement
function mayHaveLauncherHostLoginInMemory() {
  isLauncherStartedProcess();
  return launcherHostLoginStates.of(getRootSession().host).wasOpenToSignIn;
}
//@ chunk-vgaj51qh.js:2212-2298 placement
function readLauncherStartAtClaim() {
  let state = launcherHostLoginStates.of(getRootSession().host);
  state.wasLauncherStarted = false;
  state.wasOpenToSignIn = false;
  isLauncherStartedProcess();
}
//@ chunk-vgaj51qh.js:2298-3532 placement
function launcherHostLoginRefusal() {
  if (!isLauncherStartedProcess()) return "not_launcher_started";
  if (env.CLAUDE_CODE_DISABLE_LAUNCHER_SIGN_IN) return "switched_off";
  if (getAPIProvider() !== "firstParty") return "not_first_party";
  if (isGatewayLoginForced()) return "gateway_mandate";
  if (getHostPolicyLoginPins().forceLoginMethod === "console") return "login_method_pin";
  if (!isActualFirstPartyAnthropicBaseUrl()) return "custom_base_url";
  let envRefusal = launcherEnvRefusal((envVarName) => {
    let envValue = launcherEnv[envVarName];
    return typeof envValue === "string" ? envValue : undefined;
  });
  if (envRefusal !== null) return envRefusal;
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
    [...TOKEN_FD_ENV_VARS, "CLAUDE_BG_AUTH_SNAPSHOT_PATH"].some((envVarName) =>
      wasDescriptorAnnouncementConsumed(envVarName),
    ) ||
    (isBareMode() && getSettingsForSource("flagSettings")?.apiKeyHelper)
  )
    return "launcher_credential";
  try {
    let { envs, apiKeyHelper, unread } = getMachineAdminCredentialInputs();
    if (apiKeyHelper || envs.some((env) => launcherEnvRefusal((envVarName) => env[envVarName]) !== null))
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
//@ chunk-vgaj51qh.js:3532-3636 placement
function usableLauncherHostLoginToken() {
  if (!isLauncherStartedProcess()) return null;
  let state = launcherHostLoginStates.of(getRootSession().host);
  return state.token !== null && dropRefusedToken(state) === null ? state.token : null;
}
//@ chunk-vgaj51qh.js:3636-3841 placement
function takeLauncherHostLoginEnd() {
  let state = launcherHostLoginStates.of(getRootSession().host);
  if (state.token !== null) dropRefusedToken(state);
  if (state.endedAtRead !== null) {
    state.endedAtRead = null;
    logFeatureBad("auth_launcher_host_login", "refused_while_held");
  }
  let hasEndToSettle = state.hasEndToSettle;
  state.hasEndToSettle = false;
  return hasEndToSettle;
}
//@ chunk-vgaj51qh.js:3841-3883 placement
function setLauncherHostLoginFlagReader(readFlag) {
  launcherHostLoginStates.of(getRootSession().host).readFlag = readFlag;
}
//@ chunk-vgaj51qh.js:3883-3933 placement
function setLauncherHostLoginReplacementJudge(judgeReplacement) {
  launcherHostLoginStates.of(getRootSession().host).judgeReplacement = judgeReplacement;
}
//@ chunk-vgaj51qh.js:3933-4041 placement
function holdStartupLauncherHostLogin(token) {
  if (!token || launcherHostLoginRefusal() !== null) return false;
  let state = launcherHostLoginStates.of(getRootSession().host);
  state.token = token;
  state.everHeld.add(computeContentHash(token));
  return true;
}
//@ chunk-vgaj51qh.js:4041-4117 placement
function wasLauncherHostLoginToken(token) {
  let everHeld = launcherHostLoginStates.of(getRootSession().host).everHeld;
  return everHeld.size > 0 && everHeld.has(computeContentHash(token));
}
//@ chunk-vgaj51qh.js:4117-4160 placement
function isLauncherHostLoginRefusedNow(token) {
  return wasLauncherHostLoginToken(token) && usableLauncherHostLoginToken() === null;
}
//@ chunk-vgaj51qh.js:4160-4219 placement
function loginToHandOn(claudeAIOAuthTokens) {
  return claudeAIOAuthTokens !== null && wasLauncherHostLoginToken(claudeAIOAuthTokens.accessToken)
    ? null
    : claudeAIOAuthTokens;
}
//@ chunk-vgaj51qh.js:4219-4643 placement
function learnLauncherHostLoginIdentity(identityOf) {
  let state = launcherHostLoginStates.of(getRootSession().host);
  state.identityOf = identityOf;
  if (state.identity !== null && !state.hasIdentitySaidNothing) return state.identity;
  let token = usableLauncherHostLoginToken();
  if (token === null) return state.identity ?? Promise.resolve(null);
  let identityPromise = identityOf(token).catch(() => null);
  state.identity = identityPromise;
  state.hasIdentitySaidNothing = false;
  identityPromise.then((identity) => {
    if (identity !== null || state.identity !== identityPromise) return;
    state.hasIdentitySaidNothing = true;
    let delayMs = RENEWAL_RETRY_DELAYS_MS[state.identityReasksMade] ?? RENEWAL_HOLD_OFF_MS;
    state.identityReasksMade += 1;
    setTimeout(reaskIdentityIfCurrent, delayMs, state, identityPromise, identityOf).unref();
  });
  return identityPromise;
}
//@ chunk-vgaj51qh.js:4643-4800 placement
function reaskIdentityIfCurrent(state, identityPromise, identityOf) {
  try {
    if (state.identity === identityPromise && launcherHostLoginStates.of(getRootSession().host) === state)
      learnLauncherHostLoginIdentity(identityOf);
  } catch {
    logForDebugging("[launcher-host-login] asking again whose sign-in this is threw", {
      level: "warn",
    });
  }
}
//@ chunk-vgaj51qh.js:4800-4846 placement
function launcherHostLoginIdentity() {
  return launcherHostLoginStates.of(getRootSession().host).identity;
}
//@ chunk-vgaj51qh.js:4846-4939 placement
function askLauncherHostLoginIdentityAgain() {
  let { identityOf } = launcherHostLoginStates.of(getRootSession().host);
  return identityOf === null ? Promise.resolve(null) : learnLauncherHostLoginIdentity(identityOf);
}
//@ chunk-vgaj51qh.js:4939-4991 placement
function noteLauncherStartupAsk(requestId) {
  launcherHostLoginStates.of(getRootSession().host).startupAskIds.add(requestId);
}
//@ chunk-vgaj51qh.js:4991-5077 placement
function isLauncherStartupAsk(requestId) {
  return (
    isLauncherStartedProcess() &&
    typeof requestId === "string" &&
    launcherHostLoginStates.of(getRootSession().host).startupAskIds.has(requestId)
  );
}
//@ chunk-vgaj51qh.js:5077-5173 placement
function forgetLauncherHostLogin() {
  let state = launcherHostLoginStates.of(getRootSession().host);
  let hadToken = state.token !== null;
  state.token = null;
  state.hasEndToSettle ||= hadToken;
  return hadToken;
}
//@ chunk-vgaj51qh.js:5173-5405 placement
function dropRefusedToken(state) {
  let refusal = launcherHostLoginRefusal();
  if (refusal !== null && state.token !== null) {
    state.token = null;
    state.endedAtRead = refusal;
    state.hasEndToSettle = true;
    logForDebugging(
      `[launcher-host-login] the desktop app's sign-in is over for this process (refused_while_held: ${refusal})`,
      {
        level: "warn",
      },
    );
  }
  return refusal;
}
//@ chunk-vgaj51qh.js:5405-5465 placement
function renewLauncherHostLogin(token) {
  let state = launcherHostLoginStates.of(getRootSession().host);
  return chainReplacement(state, () => renewLauncherHostLoginToken(state, token));
}
//@ chunk-vgaj51qh.js:5465-5715 placement
function holdPushedLauncherHostLogin(token) {
  let state = launcherHostLoginStates.of(getRootSession().host);
  let refusal;
  try {
    refusal = dropRefusedToken(state);
  } catch (error) {
    logReplaceThrew(error);
    return null;
  }
  if (!token || state.token === null || refusal !== null) {
    logForDebugging(
      `[launcher-host-login] refused a pushed claude.ai token (${refusal ?? (token ? "none_held" : "empty")})`,
      {
        level: "warn",
      },
    );
    return null;
  }
  return chainReplacement(state, () => judgeReplacementToken(state, token));
}
//@ chunk-vgaj51qh.js:5715-5802 placement
/**
 * 串行执行令牌替换任务，失败时记日志并返回 false。
 */
function chainReplacement(state, replace) {
  let chained = state.replacing.then(replace).catch((error) => {
    logReplaceThrew(error);
    return false;
  });
  state.replacing = chained;
  return chained;
}
//@ chunk-vgaj51qh.js:5802-5931 placement
function logReplaceThrew(error) {
  logForDebugging(
    `[launcher-host-login] replacing the token held threw (${error instanceof Error ? error.name : "unknown"})`,
    {
      level: "error",
    },
  );
}
//@ chunk-vgaj51qh.js:5931-6648 placement
async function renewLauncherHostLoginToken(state, expectedToken) {
  if (state.token === null || dropRefusedToken(state) !== null) return false;
  if (state.token !== expectedToken) return true;
  let sdkOAuthTokenRefreshCallback = getSdkOAuthTokenRefreshCallback();
  if (!sdkOAuthTokenRefreshCallback || Date.now() < state.renewalHoldOffUntilMs) return false;
  let launcherLoginGeneration = getLauncherLoginGeneration();
  let newToken;
  try {
    newToken = await sdkOAuthTokenRefreshCallback();
  } catch (error) {
    logForDebugging(
      `[launcher-host-login] oauth_token_refresh failed (${error instanceof Error ? error.name : "unknown"})`,
      {
        level: "warn",
      },
    );
    state.renewalHoldOffUntilMs = Date.now() + IDENTITY_REASK_MS;
    logFeatureBad("auth_launcher_host_login", "request_failed");
    return false;
  }
  if (state.token === null) return false;
  if (launcherHostLoginRefusal() !== null) {
    endLauncherHostLogin(state, "refused_after_answer");
    return false;
  }
  if (!newToken) {
    let launcherLoginEnd = getLauncherLoginEnd();
    if (
      launcherLoginEnd !== undefined &&
      launcherLoginEnd.generation > launcherLoginGeneration &&
      launcherLoginEnd.reason === "identity_changed"
    ) {
      endLauncherHostLogin(state, "identity_changed");
      return false;
    }
    logFeatureBad("auth_launcher_host_login", "no_token");
    return false;
  }
  if (newToken === expectedToken) {
    logFeatureBad("auth_launcher_host_login", "same_token");
    return false;
  }
  return judgeReplacementToken(state, newToken, true);
}
//@ chunk-vgaj51qh.js:6648-7366 placement
async function judgeReplacementToken(state, candidateToken, afterRefresh = false) {
  if (state.token === null || dropRefusedToken(state) !== null) return false;
  if (candidateToken === state.token) return true;
  let verdict = "refused";
  try {
    if (state.judgeReplacement !== null) verdict = await state.judgeReplacement(candidateToken);
  } catch (error) {
    logForDebugging(
      `[launcher-host-login] the replacement could not be judged (${error instanceof Error ? error.name : "unknown"})`,
      {
        level: "error",
      },
    );
  }
  if (state.token === null) return false;
  if (verdict === "held_unknown" && afterRefresh) {
    endLauncherHostLogin(state, "identity_never_learned");
    return false;
  }
  if (verdict === "unverified" || verdict === "held_unknown") {
    state.renewalHoldOffUntilMs = Date.now() + IDENTITY_REASK_MS;
    logFeatureBad("auth_launcher_host_login", "replacement_unverified");
    return false;
  }
  if (verdict === "allowed" && launcherHostLoginRefusal() === null) {
    state.token = candidateToken;
    state.everHeld.add(computeContentHash(candidateToken));
    dropAuthenticatedAccountForNewToken(true);
    logFeatureOk("auth_launcher_host_login");
    return true;
  }
  endLauncherHostLogin(state, verdict === "allowed" ? "refused_after_answer" : "replacement_refused");
  return false;
}
//@ chunk-vgaj51qh.js:7366-7547 placement
function endLauncherHostLogin(state, reason) {
  state.token = null;
  state.hasEndToSettle = true;
  logForDebugging(`[launcher-host-login] the desktop app's sign-in is over for this process (${reason})`, {
    level: "warn",
  });
  logFeatureBad("auth_launcher_host_login", reason);
}
//@ chunk-vgaj51qh.js:7547-8233 placement
/**
 * 检查环境是否不允许使用桌面应用下发的登录：非一方提供方、Unix socket、自定义 OAuth、不安全的 base URL、端点覆盖、启动器凭据或关闭了 TLS 校验。
 */
function launcherEnvRefusal(readEnv) {
  if (
    PROVIDER_SELECTION_ENV_VARS.some(
      (envVarName) => envVarName.startsWith("CLAUDE_CODE_USE_") && isEnvTruthy(readEnv(envVarName)),
    )
  )
    return "not_first_party";
  if (readEnv("ANTHROPIC_UNIX_SOCKET")?.trim()) return "unix_socket";
  if (readEnv("CLAUDE_CODE_CUSTOM_OAUTH_URL")?.trim()) return "custom_oauth_deployment";
  let baseUrl = readEnv("ANTHROPIC_BASE_URL")?.trim();
  if (baseUrl && !isHttpsAnthropicHost(baseUrl)) return "insecure_base_url";
  if (HOST_SERVICE_BASE_URL_VARS.some((envVarName) => readEnv(envVarName)?.trim()))
    return "endpoint_override";
  if (
    readEnv("ANTHROPIC_CUSTOM_HEADERS")?.trim() ||
    readEnv("CLAUDE_CODE_HOST_CREDS_FILE")?.trim() ||
    readEnv("CLAUDE_SESSION_INGRESS_TOKEN_FILE")?.trim() ||
    PROVIDER_CREDENTIAL_ENV_VARS.some((envVarName) => readEnv(envVarName)?.trim()) ||
    TOKEN_FD_ENV_VARS.some((envVarName) => readEnv(envVarName)?.trim())
  )
    return "launcher_credential";
  if (
    TLS_ENV_VARS.some((envVarName) => {
      let env = readEnv(envVarName);
      return env !== undefined && env !== "1";
    })
  )
    return "tls_verification_disabled";
  return null;
}
//@ chunk-vgaj51qh.js:8233-8292 placement
/**
 * 判断 URL 是否为 https 的 Anthropic 主机。
 */
function isHttpsAnthropicHost(url) {
  return isFirstPartyAnthropicHost(url) && new URL(url).protocol === "https:";
}
export {
  isLauncherStartedProcess,
  setLauncherHostLoginReplacementJudge,
  holdPushedLauncherHostLogin,
  isLauncherStartupAsk,
  clearLauncherLoginEnd,
  recordLauncherLoginEnd,
  usableLauncherHostLoginToken,
  loginToHandOn,
  getLauncherLoginEnd,
  getLauncherLoginGeneration,
  forgetLauncherHostLogin,
  renewLauncherHostLogin,
  launcherHostLoginIdentity,
  askLauncherHostLoginIdentityAgain,
  wasLauncherHostLoginToken,
  hasProviderEnvFlag,
  mayHaveLauncherHostLoginInMemory,
  takeLauncherHostLoginEnd,
  isLauncherHostLoginRefusedNow,
  LAUNCHER_END_REASONS,
  setLauncherHostLoginFlagReader,
  launcherHostLoginRefusal,
  noteLauncherStartupAsk,
  holdStartupLauncherHostLogin,
  learnLauncherHostLoginIdentity,
  readLauncherStartAtClaim,
  isLauncherEndReason,
};

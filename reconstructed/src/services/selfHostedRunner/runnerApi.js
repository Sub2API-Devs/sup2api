/**
 * services/selfHostedRunner/runnerApi.ts
 *
 * 2.1.316 新增：调用自托管 runner 管理 API（base URL 变化时重试）；获取 runner 管理用的访问令牌等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ja1jtv44.js (12)
 * attribution: placement 12
 */
import { env } from "../../utils/env.js";
import { getOauthConfig } from "../../constants/oauth.js";
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getClaudeAIOAuthTokensAsync,
  getClaudeAIOAuthTokens,
  getClaudeAIOAuthTokenOriginAsync,
  isLoginStashedInTokenSlot,
} from "../../utils/auth.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  isStoredLoginRefused,
  storedLoginRefusalReason,
  settleStoredLoginRefusal,
} from "../../utils/auth/storedLoginRefused.js";
import { isOauthTokenFromBgSnapshot } from "../../bootstrap/state.js";
import { StoredLoginHeldBackError } from "../oauth/storedLoginRefusal.js";
import { isLauncherHostLoginRefusedNow } from "../../utils/auth/launcherHostLogin.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { describeUnparsedInput } from "../../utils/json.js";

/**
 * 自托管 runner 认证失败的提示。
 */
//@ chunk-ja1jtv44.js:642-1012 placement
var RUNNER_AUTH_HINT =
    " \u2014 run `claude login` to refresh your session, or verify ANTHROPIC_BASE_URL matches your login environment",
  h =
    "Self-hosted runner tools need your claude.ai login, and Claude Code didn't send it to the configured API address because your administrator set an API key helper. Ask your administrator to remove the key helper or to use Anthropic's API address.";
//@ chunk-ja1jtv44.js:1012-1119 placement
class SelfHostedRunnerApiError extends Error {
  status;
  constructor(e, t) {
    super(t);
    ((this.name = "SelfHostedRunnerApiError"), (this.status = e));
  }
}
/**
 * 自托管 runner 默认端口。
 */
//@ chunk-ja1jtv44.js:1119-1132 placement
var DEFAULT_RUNNER_PORT = 8080;
//@ chunk-ja1jtv44.js:1132-1330 placement
function assertFirstPartyRunnerApi() {
  let { getAPIProvider: getAPIProvider } = require("./chunk-hzephfq7.js");
  if (getAPIProvider() !== "firstParty")
    throw new SelfHostedRunnerApiError(
      403,
      "Self-hosted runner management is only available on the first-party Anthropic API provider.",
    );
}
//@ chunk-ja1jtv44.js:1330-1531 placement
var NOT_LOGGED_IN_RUNNER_TEXT =
  "Not logged in. Environment-management endpoints require the operator OAuth session \u2014 run `claude login`, then re-invoke this tool. (`ANTHROPIC_API_KEY` will not work for these endpoints.)";
/**
 * API 基址：ANTHROPIC_BASE_URL（去尾部 /），否则 OAuth 配置的 BASE_API_URL。
 */
//@ chunk-ja1jtv44.js:1531-1632 placement = getBridgeBaseUrl (1)
function runnerApiBaseUrl() {
  let e = env.ANTHROPIC_BASE_URL?.replace(/\/+$/, "");
  if (e) return e;
  return getOauthConfig().BASE_API_URL;
}
//@ chunk-ja1jtv44.js:1632-1676 placement
function S0s() {
  return getOauthConfig().CLAUDE_AI_ORIGIN;
}
/**
 * 获取 runner 管理用的访问令牌。
 */
//@ chunk-ja1jtv44.js:1676-2198 placement
async function runnerAccessToken(e, t = runnerApiBaseUrl()) {
  assertFirstPartyRunnerApi();
  let n = require("./chunk-6phxatm7.js");
  if (n.isConsoleProfileSessionsCredential()) {
    let sessionsApiAccessToken = await n.sessionsApiAccessToken(!0);
    if (!sessionsApiAccessToken) throw new SelfHostedRunnerApiError(401, n.cloudSessionsSignInRefusal());
    return sessionsApiAccessToken;
  }
  await checkAndRefreshOAuthTokenIfNeeded({ credentials: e }).catch(() => {});
  let o =
    isStorageV5Enabled() && e !== void 0
      ? (await getClaudeAIOAuthTokensAsync(e))?.accessToken
      : getClaudeAIOAuthTokens()?.accessToken;
  if (!o) throw new SelfHostedRunnerApiError(401, NOT_LOGGED_IN_RUNNER_TEXT);
  if (isStoredLoginRefused(t, !0)) {
    let a = await getClaudeAIOAuthTokenOriginAsync(e);
    if (
      (a === "env" || a === "fd") &&
      !isOauthTokenFromBgSnapshot() &&
      !isLoginStashedInTokenSlot() &&
      getClaudeAIOAuthTokens()?.accessToken === o
    )
      return o;
    let d = storedLoginRefusalReason();
    throw new SelfHostedRunnerApiError(403, d === "admin" ? h : new StoredLoginHeldBackError(d).message);
  }
  return o;
}
/**
 * 包装 UI 字段。
 */
//@ chunk-ja1jtv44.js:2198-2227 placement
function withUi(e) {
  return { ui: e };
}
/**
 * 调用自托管 runner 管理 API（base URL 变化时重试）。
 */
//@ chunk-ja1jtv44.js:2227-2958 placement
async function runnerApiRequest(e, t, n, o, a) {
  (await settleStoredLoginRefusal({ url: runnerApiBaseUrl(), signal: o }), assertFirstPartyRunnerApi());
  let d = runnerApiBaseUrl(),
    c = await runnerAccessToken(a, d);
  if (runnerApiBaseUrl() !== d) return runnerApiRequest(e, t, n, o, a);
  if (isLauncherHostLoginRefusedNow(c)) throw new SelfHostedRunnerApiError(401, NOT_LOGGED_IN_RUNNER_TEXT);
  let r = await Dt.request({
    method: e,
    url: `${runnerApiBaseUrl()}${t}`,
    data: n,
    headers: {
      Authorization: `Bearer ${c}`,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    timeout: 20000,
    signal: o,
    validateStatus: (s) => s < 500,
  }).catch((s) => {
    if (Dt.isAxiosError(s) && !Dt.isCancel(s) && s.response === void 0)
      throw new SelfHostedRunnerApiError(0, `${e} ${t}: ${s.message}`);
    throw s;
  });
  if (r.status >= 400) {
    let s = r.data?.error?.message ?? jsonStringify(r.data),
      l = `HTTP ${r.status} ${e} ${t}: ${s}`;
    if ([401, 403, 404, 409, 429].includes(r.status)) {
      let m = r.status === 401 || r.status === 403 ? RUNNER_AUTH_HINT : "";
      throw new SelfHostedRunnerApiError(r.status, l + m);
    }
    throw Error(l);
  }
  return r.data;
}
/**
 * 生成 tool_result 块。
 */
//@ chunk-ja1jtv44.js:2958-3033 placement
function toolResultBlock(e, t) {
  return { tool_use_id: e, type: "tool_result", content: redactSecretsInText(jsonStringify(t)) };
}
/**
 * 把参数对象格式化为 key=value。
 */
//@ chunk-ja1jtv44.js:3033-3194 placement
function describeArgs(e) {
  let t = describeUnparsedInput(e);
  if (t !== null) return t;
  return Object.entries(e)
    .filter(([, n]) => n !== void 0)
    .map(([n, o]) => `${n}=${typeof o === "string" ? o : jsonStringify(o)}`)
    .join(" ");
}

export {
  runnerApiRequest,
  withUi,
  toolResultBlock,
  describeArgs,
  DEFAULT_RUNNER_PORT,
  runnerApiBaseUrl,
  S0s,
};

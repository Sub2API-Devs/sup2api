/**
 * services/gateway/hostCheck.ts
 *
 * 2.1.316 新增：调用 /gateway-api/gateway-hosts/check 确认网关主机；创建到网关的 HTTPS 请求（代理、客户端证书、CA）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (22)
 * attribution: placement 22
 */
import { Agent, request as request_2 } from "https";
import { getBedrockRegionPrefix, withBedrockRegionPrefix } from "../../utils/model/bedrock.js";
import { getAwsRegionSync } from "../../utils/awsRegion.js";
import { getBedrockInferenceProfilesGuard } from "../analytics/telemetryCredentialGuard.js";
import {
  pickProfileForFoundationModel,
  findCatalogRowIdByWireId,
} from "../../utils/model/modelCatalog/catalogSeed.js";
import { resolveProviderModelId, gatewayModelIdFor } from "../../utils/model/modelStrings.js";
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from "../../utils/model/providers.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, getGatewayAuth } from "../../bootstrap/state.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, M } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  getErrnoCode,
  toError,
} from "../../utils/errors.js";
import {
  getProxyAuthFromHelper,
  getUsableProxyUrl,
  shouldBypassProxy,
  findProxyError,
  getConfiguredProxyAuthHelper,
  clearProxyAuthHelperCache,
  describeHttpStatus,
  createConnectProxyAgent,
  proxyTlsOptions,
} from "../../utils/proxy.js";
import { getCACertificates } from "../../utils/caCerts.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { caListBehindProxy, getMTLSConfig } from "../../utils/mtls.js";
import { anthropicHostOf } from "../../utils/anthropicHosts.js";
import { DESKTOP_3P_ENTRYPOINT } from "../../utils/entrypointKinds.js";
import { withTimeout } from "../../utils/sleep.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { LOCALHOST_NAMES } from "../../bridge/workSecret.js";

//@ chunk-aepeg2w5.js:231706-231792 placement
/**
 * 把模型名解析成上游 wire id（Bedrock 时按 profile 与区域前缀处理）。
 */
function resolveWireModelId(e) {
  let bedrockRegionPrefix = getBedrockRegionPrefix(getAwsRegionSync());
  let bedrockInferenceProfilesGuard = getBedrockInferenceProfilesGuard();
  return (
    (bedrockInferenceProfilesGuard === undefined
      ? undefined
      : pickProfileForFoundationModel(e, bedrockInferenceProfilesGuard, bedrockRegionPrefix)) ??
    withBedrockRegionPrefix(e, bedrockRegionPrefix)
  );
}
//@ chunk-aepeg2w5.js:231792-231834 placement
/**
 * 判断模型是否可解析成 provider 模型 id。
 */
function hasProviderModelId(e, n) {
  return resolveProviderModelId(e, n) !== undefined;
}
//@ chunk-aepeg2w5.js:231834-231887 placement
/**
 * 生成网关缓存代际键（provider 与 first-party/custom）。
 */
function gatewayGeneration() {
  return `${getAPIProvider()}|${isFirstPartyAnthropicBaseUrl() ? "api" : "custom"}`;
}
//@ chunk-aepeg2w5.js:231887-231959 placement
/**
 * 按 wire id 查网关模型的目录行 id。
 */
function gatewayCatalogRowId(e) {
  return findCatalogRowIdByWireId(e, {
    provider: getAPIProvider(),
    generation: gatewayGeneration(),
    wireIdOf: gatewayModelIdFor,
  });
}
//@ chunk-aepeg2w5.js:232332-232372 placement
/**
 * 记录网关 URL 的看到/确认状态。
 */
class GatewaySeenState {
  seenAt = undefined;
  settledAt = undefined;
}
//@ chunk-aepeg2w5.js:232372-232397 placement
/**
 * 网关 URL 状态的宿主作用域单例。
 */
var gatewaySeenState = new HostScoped(() => new GatewaySeenState());
//@ chunk-aepeg2w5.js:232397-232434 placement
/**
 * 取当前宿主的网关 URL 状态。
 */
function getGatewaySeenState() {
  return gatewaySeenState.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:232434-232544 placement
/**
 * 记录看到的网关 URL。
 */
function noteGatewaySeen(gatewayVersion) {
  let gatewaySeenState = getGatewaySeenState();
  let url = getGatewayAuth()?.url;
  if (
    url !== undefined &&
    url !== gatewaySeenState.settledAt &&
    typeof gatewayVersion === "string" &&
    gatewayVersion !== ""
  )
    gatewaySeenState.seenAt = url;
}
//@ chunk-aepeg2w5.js:232544-232639 placement
/**
 * 记录已确认的网关 URL，返回它是否与之前看到的一致。
 */
function noteGatewaySettled() {
  let gatewaySeenState = getGatewaySeenState();
  let url = getGatewayAuth()?.url;
  if (url === undefined) return false;
  gatewaySeenState.settledAt = url;
  return gatewaySeenState.seenAt === url;
}
//@ chunk-aepeg2w5.js:232639-232785 placement
var GATEWAY_HOST_CHECK_PATH = "/gateway-api/gateway-hosts/check";
var MAX_HOST_CHECK_BYTES = 8192;
var GatewayHostCheckSchema = DoctorLazy(() =>
  u({
    host: string(),
    listed: M(),
    served: M().nullable(),
    canonical: string().optional().catch(undefined),
  }),
);
//@ chunk-aepeg2w5.js:232785-232852 placement
/**
 * 网关主机检查中可重试的错误（429/5xx）。
 */
class GatewayHostCheckRetryableError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  kind;
  constructor(e, n, kind) {
    super(e, n);
    this.kind = kind;
  }
}
//@ chunk-aepeg2w5.js:232852-232872 placement
/**
 * 网关主机检查的一般失败（非 200、非 JSON）。
 */
class GatewayHostCheckError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
//@ chunk-aepeg2w5.js:232872-232948 placement
/**
 * 临时暂停代理时钟后取 helper 的代理认证。
 */
async function withProxyAuthHelper(helperClock) {
  let n = helperClock?.pause();
  try {
    return await getProxyAuthFromHelper();
  } finally {
    n?.();
  }
}
//@ chunk-aepeg2w5.js:232948-234232 placement
/**
 * 调用 /gateway-api/gateway-hosts/check 确认网关主机。
 */
async function queryGatewayHostCheck(
  e,
  n,
  { timeoutMs, presentClientCertificate, authorization, helperClock },
) {
  let S = new URL(GATEWAY_HOST_CHECK_PATH, `https://${e}`);
  S.searchParams.set("host", n);
  if (authorization !== undefined && !/^[\x20-\x7e]+$/.test(authorization)) authorization = undefined;
  let href = S.href;
  let usableProxyUrl = getUsableProxyUrl();
  let x = usableProxyUrl !== undefined && !shouldBypassProxy(href);
  if (x) await withProxyAuthHelper(helperClock);
  let P = {
    timedOut: false,
  };
  let F = await (async () => {
    let j = await requestWithProxyAuthRetry(S, {
      proxyUrl: x ? usableProxyUrl : undefined,
      presentClientCertificate,
      authorization,
      caCerts: getCACertificates(),
      timeoutMs,
      helperClock,
      attempt: P,
    });
    if (j.status === 429 || (j.status >= 500 && j.status <= 599))
      throw new GatewayHostCheckRetryableError(
        `HTTP ${j.status}`,
        "gateway host check answered a 429 or 5xx status",
        "http-status",
      );
    if (j.status !== 200)
      throw new GatewayHostCheckError(`HTTP ${j.status}`, "gateway host check answered a non-200 status");
    return j.body;
  })().catch((error) => {
    if (
      !P.timedOut &&
      (error instanceof GatewayHostCheckError || error instanceof GatewayHostCheckRetryableError)
    )
      throw error;
    throw new GatewayHostCheckRetryableError(
      P.timedOut ? HOST_CHECK_TIMEOUT_MESSAGE : classifyTlsError(error),
      "gateway host check got no answer",
      "no-answer",
    );
  });
  let L;
  try {
    L = jsonParse(F);
  } catch {
    throw new GatewayHostCheckError(
      "not a host-check answer (not JSON)",
      "gateway host check answer was not JSON",
    );
  }
  let G = GatewayHostCheckSchema().safeParse(L);
  if (!G.success)
    throw new GatewayHostCheckError(
      "not a host-check answer (unrecognized JSON)",
      "gateway host check answer was not a host-check object",
    );
  if (G.data.host !== n.toLowerCase().replace(/\.$/, ""))
    throw new GatewayHostCheckError(
      "it answered about another hostname",
      "gateway host check answered about another hostname",
    );
  return G.data;
}
//@ chunk-aepeg2w5.js:234232-234436 placement
var HOST_CHECK_TIMEOUT_MESSAGE = "timed out";
var ANSWER_TOO_LARGE_MESSAGE = "answer exceeds size limit";
var answerTooLargeError = () =>
  new GatewayHostCheckError(ANSWER_TOO_LARGE_MESSAGE, "gateway host check answer exceeds size limit");
var PROXY_AUTH_REQUIRED_MESSAGE = "the proxy requires authentication, HTTP 407";
var MAX_ERROR_DETAIL = 160;
var TLS_REFUSED_MESSAGE = "TLS connection not accepted";
//@ chunk-aepeg2w5.js:234436-235145 placement
/**
 * 把 TLS/网络错误归类并截短消息。
 */
function classifyTlsError(error) {
  let n = truncateToLength(
    errorMessage(error)
      .replace(/\s*For more information, pass `verbose: true`.*$/s, "")
      .replace(/[^\x20-\x7e]/gu, "?")
      .trim(),
    MAX_ERROR_DETAIL,
  );
  let errnoCode = getErrnoCode(error);
  if (errnoCode === "ERR_TLS_CERT_ALTNAME_INVALID" || /does not match certificate's altnames/i.test(n)) {
    logForDebugging(`[gateway] certificate for another name: ${n}`);
    return `${TLS_REFUSED_MESSAGE}: the certificate is for another name`;
  }
  if (errnoCode === "ConnectionRefused" || errnoCode === "ECONNREFUSED") return "connection refused";
  if (errnoCode?.startsWith("HPE_") || /^Parse Error/i.test(n)) return "not an HTTP response";
  if (errnoCode === "ENOTFOUND" || /ENOTFOUND|getaddrinfo/i.test(n)) return "the name does not resolve";
  if (/timed? ?out|TimedOut/i.test(n)) return HOST_CHECK_TIMEOUT_MESSAGE;
  if (/certificate|altnames|self[- ]signed|CERT_|SSL|TLS/i.test(n)) return `${TLS_REFUSED_MESSAGE}: ${n}`;
  return n;
}
//@ chunk-aepeg2w5.js:235145-236281 placement
/**
 * 探测网关的 /managed/settings 端点。
 */
async function probeGatewayManagedSettings(url, n, timeoutMs) {
  try {
    let s = new URL(`${url.replace(/\/$/, "")}/managed/settings`);
    if (s.protocol !== "https:") return;
    let proxyUrl = shouldBypassProxy(s.href) ? undefined : getUsableProxyUrl();
    let y = {
      timedOut: false,
    };
    let S = await requestWithProxyAuthRetry(s, {
      proxyUrl,
      presentClientCertificate: true,
      authorization: /^[\x20-\x7e]+$/.test(n) ? n : undefined,
      caCerts: caListBehindProxy(anthropicHostOf(s)),
      timeoutMs,
      helperClock: undefined,
      attempt: y,
      statusOnlyAs: `claude-cli/${
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION
      } (external, ${DESKTOP_3P_ENTRYPOINT})`,
    }).catch((error) => ({
      unanswered: y.timedOut ? HOST_CHECK_TIMEOUT_MESSAGE : classifyTlsError(error),
    }));
    if ("unanswered" in S) return S;
    noteGatewaySeen(S.gatewayVersion);
    if (S.status === 429 || (S.status >= 500 && S.status <= 599))
      return {
        unanswered: `HTTP ${S.status}`,
      };
    return !S.isGatewaysOwnNow ? undefined : S.status === 304 ? true : S.status === 404 ? false : undefined;
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:236281-236560 placement
async function requestWithProxyAuthRetry(e, n) {
  try {
    return await requestWithTimeout(e, n);
  } catch (error) {
    let proxyError = findProxyError(error);
    if (proxyError?.connectStatus === 407 && getConfiguredProxyAuthHelper() !== undefined) {
      let h = proxyError.headers["proxy-authenticate"];
      clearProxyAuthHelperCache(Array.isArray(h) ? h[0] : h);
      if ((await withProxyAuthHelper(n.helperClock)) !== null)
        return await requestWithTimeout(e, n).catch((error) => {
          throw proxyErrorToHostCheckError(error) ?? error;
        });
    }
    throw proxyErrorToHostCheckError(error) ?? error;
  }
}
//@ chunk-aepeg2w5.js:236560-236757 placement
async function requestWithTimeout(e, n) {
  let signal = AbortSignal.timeout(n.timeoutMs);
  try {
    return await withTimeout(createGatewayRequest(e, n, signal), n.timeoutMs, HOST_CHECK_TIMEOUT_MESSAGE);
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.message === HOST_CHECK_TIMEOUT_MESSAGE))
      n.attempt.timedOut = true;
    throw error;
  }
}
//@ chunk-aepeg2w5.js:236757-237047 placement
function proxyErrorToHostCheckError(error) {
  let proxyError = findProxyError(error);
  if (proxyError === undefined) return;
  return proxyError.connectStatus === 407
    ? new GatewayHostCheckRetryableError(
        PROXY_AUTH_REQUIRED_MESSAGE,
        "gateway host check met a proxy authentication challenge",
        "proxy-auth",
      )
    : new GatewayHostCheckRetryableError(
        `the proxy did not connect to it, ${describeHttpStatus(proxyError.connectStatus)}`,
        "gateway host check got no tunnel through the proxy",
        "no-answer",
      );
}
//@ chunk-aepeg2w5.js:237047-238316 placement
/**
 * 创建到网关的 HTTPS 请求（代理、客户端证书、CA）。
 */
function createGatewayRequest(
  e,
  { proxyUrl, presentClientCertificate, authorization, caCerts, statusOnlyAs },
  signal,
) {
  let w = {
    ...(presentClientCertificate && getMTLSConfig()),
    ...(caCerts && {
      ca: caCerts,
    }),
  };
  let R =
    proxyUrl === undefined
      ? new Agent({
          ...w,
          keepAlive: false,
        })
      : createConnectProxyAgent(proxyUrl, w);
  let replaced = e.hostname.replace(/^\[|\]$/g, "");
  return new Promise((resolve, reject) => {
    let L = request_2(
      {
        host: replaced,
        port: e.port ? Number(e.port) : 443,
        path: `${e.pathname}${e.search}`,
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": statusOnlyAs ?? claudeCodeUserAgent(),
          ...(statusOnlyAs !== undefined && {
            "If-None-Match": "*",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          }),
          ...(authorization !== undefined && {
            Authorization: authorization,
          }),
        },
        agent: R,
        ...w,
        ...proxyTlsOptions(replaced),
        signal,
      },
      (G) => {
        let statusCode = G.statusCode ?? 0;
        if (statusOnlyAs !== undefined) {
          let re = G.headers["x-cc-gateway-version"];
          let isGatewaysOwnNow = Boolean(re) && /\bno-store\b/i.test(G.headers["cache-control"] ?? "");
          G.destroy();
          resolve({
            status: statusCode,
            body: "",
            isGatewaysOwnNow,
            gatewayVersion: re,
          });
          return;
        }
        if (statusCode !== 200) {
          G.resume();
          resolve({
            status: statusCode,
            body: "",
          });
          return;
        }
        if (Number(G.headers["content-length"] ?? "0") > MAX_HOST_CHECK_BYTES) {
          G.destroy();
          reject(answerTooLargeError());
          return;
        }
        let q = [];
        let Q = 0;
        G.on("data", (re) => {
          Q += re.length;
          if (Q > MAX_HOST_CHECK_BYTES) {
            G.destroy();
            reject(answerTooLargeError());
            return;
          }
          q.push(re);
        });
        G.once("end", () => {
          if (G.complete)
            resolve({
              status: statusCode,
              body: Buffer.concat(q).toString("utf8"),
            });
          else reject(Error("response ended early"));
        });
        G.once("error", (re) => reject(toError(re)));
        G.once("close", () => reject(Error("response ended early")));
      },
    );
    L.once("error", (G) => reject(toError(G)));
    L.end();
  }).finally(() => R.destroy());
}
//@ chunk-aepeg2w5.js:238366-238658 placement
/**
 * 规范化网关 URL：补 https://，非本地主机拒绝 http，去掉结尾斜杠。
 */
function normalizeGatewayUrl(url) {
  let trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) trimmed = `https://${trimmed}`;
  let r = new URL(trimmed);
  if (r.protocol === "http:" && !LOCALHOST_NAMES.has(r.hostname))
    throw Error(
      "Gateway URL must use https:// (got http://). Plain HTTP is only allowed for localhost during development.",
    );
  return r.href.replace(/\/+$/, "");
}
export {
  gatewayCatalogRowId,
  probeGatewayManagedSettings,
  normalizeGatewayUrl,
  noteGatewaySettled,
  noteGatewaySeen,
  resolveWireModelId,
  GatewayHostCheckError,
  GatewayHostCheckRetryableError,
  queryGatewayHostCheck,
  classifyTlsError,
  hasProviderModelId,
  gatewayGeneration,
};

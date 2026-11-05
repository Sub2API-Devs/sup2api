/**
 * services/gateway/hostCheck.ts
 *
 * 2.1.316 新增：调用 /gateway-api/gateway-hosts/check 确认网关主机；创建到网关的 HTTPS 请求（代理、客户端证书、CA）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (23)
 * attribution: placement 22, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { objectSchema, stringSchema, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:241221-241307 placement
/**
 * 把模型名解析成上游 wire id（Bedrock 时按 profile 与区域前缀处理）。
 */
function resolveWireModelId(model) {
  let regionPrefix = getBedrockRegionPrefix(getAwsRegionSync());
  let profiles = getBedrockInferenceProfilesGuard();
  return (
    (profiles === undefined ? undefined : pickProfileForFoundationModel(model, profiles, regionPrefix)) ??
    withBedrockRegionPrefix(model, regionPrefix)
  );
}
//@ chunk-exfmq47h.js:241307-241349 placement
/**
 * 判断模型是否可解析成 provider 模型 id。
 */
function hasProviderModelId(provider, model) {
  return resolveProviderModelId(provider, model) !== undefined;
}
//@ chunk-exfmq47h.js:241349-241402 placement
/**
 * 生成网关缓存代际键（provider 与 first-party/custom）。
 */
function gatewayGeneration() {
  return `${getAPIProvider()}|${isFirstPartyAnthropicBaseUrl() ? "api" : "custom"}`;
}
//@ chunk-exfmq47h.js:241402-241474 placement
/**
 * 按 wire id 查网关模型的目录行 id。
 */
function gatewayCatalogRowId(wireId) {
  return findCatalogRowIdByWireId(wireId, {
    provider: getAPIProvider(),
    generation: gatewayGeneration(),
    wireIdOf: gatewayModelIdFor,
  });
}
//@ chunk-exfmq47h.js:241847-241887 placement
/**
 * 记录网关 URL 的看到/确认状态。
 */
class GatewaySeenState {
  seenAt = undefined;
  settledAt = undefined;
}
//@ chunk-exfmq47h.js:241887-241912 placement
/**
 * 网关 URL 状态的宿主作用域单例。
 */
var gatewaySeenState; // deferred: uses GatewaySeenState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:241887", () => {
  gatewaySeenState = new HostScoped(() => new GatewaySeenState());
});
//@ chunk-exfmq47h.js:241912-241949 placement
/**
 * 取当前宿主的网关 URL 状态。
 */
function getGatewaySeenState() {
  return gatewaySeenState.of(getRootSession().host);
}
//@ chunk-exfmq47h.js:241949-242059 placement
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
//@ chunk-exfmq47h.js:242059-242154 placement
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
//@ chunk-exfmq47h.js:242154-242300 placement
var GATEWAY_HOST_CHECK_PATH; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_HOST_CHECK_BYTES;
var GatewayHostCheckSchema;
deferInit("chunk-exfmq47h.js:242154", () => {
  GATEWAY_HOST_CHECK_PATH = "/gateway-api/gateway-hosts/check";
  MAX_HOST_CHECK_BYTES = 8192;
  GatewayHostCheckSchema = DoctorLazy(() =>
    objectSchema({
      host: stringSchema(),
      listed: booleanSchema(),
      served: booleanSchema().nullable(),
      canonical: stringSchema().optional().catch(undefined),
    }),
  );
});
//@ chunk-exfmq47h.js:242300-242367 placement
/**
 * 网关主机检查中可重试的错误（429/5xx）。
 */
let GatewayHostCheckRetryableError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:242300", () => {
  GatewayHostCheckRetryableError = class GatewayHostCheckRetryableError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    kind;
    constructor(message, telemetry, kind) {
      super(message, telemetry);
      this.kind = kind;
    }
  };
});
//@ chunk-exfmq47h.js:242367-242387 placement
/**
 * 网关主机检查的一般失败（非 200、非 JSON）。
 */
let GatewayHostCheckError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:242367", () => {
  GatewayHostCheckError = class GatewayHostCheckError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {};
});
//@ chunk-exfmq47h.js:242387-242463 placement
/**
 * 临时暂停代理时钟后取 helper 的代理认证。
 */
async function withProxyAuthHelper(helperClock) {
  let clock = helperClock?.pause();
  try {
    return await getProxyAuthFromHelper();
  } finally {
    clock?.();
  }
}
//@ chunk-exfmq47h.js:242463-243747 placement
/**
 * 调用 /gateway-api/gateway-hosts/check 确认网关主机。
 */
async function queryGatewayHostCheck(
  host,
  claimedHost,
  { timeoutMs, presentClientCertificate, authorization, helperClock },
) {
  let url = new URL(GATEWAY_HOST_CHECK_PATH, `https://${host}`);
  url.searchParams.set("host", claimedHost);
  if (authorization !== undefined && !/^[\x20-\x7e]+$/.test(authorization)) authorization = undefined;
  let href = url.href;
  let usableProxyUrl = getUsableProxyUrl();
  let viaProxy = usableProxyUrl !== undefined && !shouldBypassProxy(href);
  if (viaProxy) await withProxyAuthHelper(helperClock);
  let attempt = {
    timedOut: false,
  };
  let body = await (async () => {
    let answer = await requestWithProxyAuthRetry(url, {
      proxyUrl: viaProxy ? usableProxyUrl : undefined,
      presentClientCertificate,
      authorization,
      caCerts: getCACertificates(),
      timeoutMs,
      helperClock,
      attempt,
    });
    if (answer.status === 429 || (answer.status >= 500 && answer.status <= 599))
      throw new GatewayHostCheckRetryableError(
        `HTTP ${answer.status}`,
        "gateway host check answered a 429 or 5xx status",
        "http-status",
      );
    if (answer.status !== 200)
      throw new GatewayHostCheckError(
        `HTTP ${answer.status}`,
        "gateway host check answered a non-200 status",
      );
    return answer.body;
  })().catch((error) => {
    if (
      !attempt.timedOut &&
      (error instanceof GatewayHostCheckError || error instanceof GatewayHostCheckRetryableError)
    )
      throw error;
    throw new GatewayHostCheckRetryableError(
      attempt.timedOut ? HOST_CHECK_TIMEOUT_MESSAGE : classifyTlsError(error),
      "gateway host check got no answer",
      "no-answer",
    );
  });
  let parsed;
  try {
    parsed = jsonParse(body);
  } catch {
    throw new GatewayHostCheckError(
      "not a host-check answer (not JSON)",
      "gateway host check answer was not JSON",
    );
  }
  let validated = GatewayHostCheckSchema().safeParse(parsed);
  if (!validated.success)
    throw new GatewayHostCheckError(
      "not a host-check answer (unrecognized JSON)",
      "gateway host check answer was not a host-check object",
    );
  if (validated.data.host !== claimedHost.toLowerCase().replace(/\.$/, ""))
    throw new GatewayHostCheckError(
      "it answered about another hostname",
      "gateway host check answered about another hostname",
    );
  return validated.data;
}
//@ chunk-exfmq47h.js:243747-243951 placement
var HOST_CHECK_TIMEOUT_MESSAGE = "timed out";
var ANSWER_TOO_LARGE_MESSAGE = "answer exceeds size limit";
var answerTooLargeError = () =>
  new GatewayHostCheckError(ANSWER_TOO_LARGE_MESSAGE, "gateway host check answer exceeds size limit");
var PROXY_AUTH_REQUIRED_MESSAGE = "the proxy requires authentication, HTTP 407";
var MAX_ERROR_DETAIL = 160;
var TLS_REFUSED_MESSAGE = "TLS connection not accepted";
//@ chunk-exfmq47h.js:243951-244659 placement
/**
 * 把 TLS/网络错误归类并截短消息。
 */
function classifyTlsError(error) {
  let text = truncateToLength(
    errorMessage(error)
      .replace(/\s*For more information, pass `verbose: true`.*$/s, "")
      .replace(/[^\x20-\x7e]/gu, "?")
      .trim(),
    MAX_ERROR_DETAIL,
  );
  let errnoCode = getErrnoCode(error);
  if (errnoCode === "ERR_TLS_CERT_ALTNAME_INVALID" || /does not match certificate's altnames/i.test(text)) {
    logForDebugging(`[gateway] certificate for another name: ${text}`);
    return `${TLS_REFUSED_MESSAGE}: the certificate is for another name`;
  }
  if (errnoCode === "ConnectionRefused" || errnoCode === "ECONNREFUSED") return "connection refused";
  if (errnoCode?.startsWith("HPE_") || /^Parse Error/i.test(text)) return "not an HTTP response";
  if (errnoCode === "ENOTFOUND" || /ENOTFOUND|getaddrinfo/i.test(text)) return "the name does not resolve";
  if (/timed? ?out|TimedOut/i.test(text)) return HOST_CHECK_TIMEOUT_MESSAGE;
  if (/certificate|altnames|self[- ]signed|CERT_|SSL|TLS/i.test(text))
    return `${TLS_REFUSED_MESSAGE}: ${text}`;
  return text;
}
//@ chunk-exfmq47h.js:244659-245795 placement
/**
 * 探测网关的 /managed/settings 端点。
 */
async function probeGatewayManagedSettings(url, authorization, timeoutMs) {
  try {
    let settingsUrl = new URL(`${url.replace(/\/$/, "")}/managed/settings`);
    if (settingsUrl.protocol !== "https:") return;
    let proxyUrl = shouldBypassProxy(settingsUrl.href) ? undefined : getUsableProxyUrl();
    let attempt = {
      timedOut: false,
    };
    let answer = await requestWithProxyAuthRetry(settingsUrl, {
      proxyUrl,
      presentClientCertificate: true,
      authorization: /^[\x20-\x7e]+$/.test(authorization) ? authorization : undefined,
      caCerts: caListBehindProxy(anthropicHostOf(settingsUrl)),
      timeoutMs,
      helperClock: undefined,
      attempt,
      statusOnlyAs: `claude-cli/${
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION
      } (external, ${DESKTOP_3P_ENTRYPOINT})`,
    }).catch((error) => ({
      unanswered: attempt.timedOut ? HOST_CHECK_TIMEOUT_MESSAGE : classifyTlsError(error),
    }));
    if ("unanswered" in answer) return answer;
    noteGatewaySeen(answer.gatewayVersion);
    if (answer.status === 429 || (answer.status >= 500 && answer.status <= 599))
      return {
        unanswered: `HTTP ${answer.status}`,
      };
    return !answer.isGatewaysOwnNow
      ? undefined
      : answer.status === 304
        ? true
        : answer.status === 404
          ? false
          : undefined;
  } catch {
    return;
  }
}
//@ chunk-exfmq47h.js:245795-246074 placement
async function requestWithProxyAuthRetry(url, options) {
  try {
    return await requestWithTimeout(url, options);
  } catch (error) {
    let proxyError = findProxyError(error);
    if (proxyError?.connectStatus === 407 && getConfiguredProxyAuthHelper() !== undefined) {
      let proxyErr = proxyError.headers["proxy-authenticate"];
      clearProxyAuthHelperCache(Array.isArray(proxyErr) ? proxyErr[0] : proxyErr);
      if ((await withProxyAuthHelper(options.helperClock)) !== null)
        return await requestWithTimeout(url, options).catch((error) => {
          throw proxyErrorToHostCheckError(error) ?? error;
        });
    }
    throw proxyErrorToHostCheckError(error) ?? error;
  }
}
//@ chunk-exfmq47h.js:246074-246271 placement
async function requestWithTimeout(url, options) {
  let signal = AbortSignal.timeout(options.timeoutMs);
  try {
    return await withTimeout(
      createGatewayRequest(url, options, signal),
      options.timeoutMs,
      HOST_CHECK_TIMEOUT_MESSAGE,
    );
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.message === HOST_CHECK_TIMEOUT_MESSAGE))
      options.attempt.timedOut = true;
    throw error;
  }
}
//@ chunk-exfmq47h.js:246271-246561 placement
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
//@ chunk-exfmq47h.js:246561-247830 placement
/**
 * 创建到网关的 HTTPS 请求（代理、客户端证书、CA）。
 */
function createGatewayRequest(
  url,
  { proxyUrl, presentClientCertificate, authorization, caCerts, statusOnlyAs },
  signal,
) {
  let tlsOptions = {
    ...(presentClientCertificate && getMTLSConfig()),
    ...(caCerts && {
      ca: caCerts,
    }),
  };
  let agent =
    proxyUrl === undefined
      ? new Agent({
          ...tlsOptions,
          keepAlive: false,
        })
      : createConnectProxyAgent(proxyUrl, tlsOptions);
  let replaced = url.hostname.replace(/^\[|\]$/g, "");
  return new Promise((resolve, reject) => {
    let request = request_2(
      {
        host: replaced,
        port: url.port ? Number(url.port) : 443,
        path: `${url.pathname}${url.search}`,
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
        agent,
        ...tlsOptions,
        ...proxyTlsOptions(replaced),
        signal,
      },
      (response) => {
        let statusCode = response.statusCode ?? 0;
        if (statusOnlyAs !== undefined) {
          let gatewayVersion = response.headers["x-cc-gateway-version"];
          let isGatewaysOwnNow =
            Boolean(gatewayVersion) && /\bno-store\b/i.test(response.headers["cache-control"] ?? "");
          response.destroy();
          resolve({
            status: statusCode,
            body: "",
            isGatewaysOwnNow,
            gatewayVersion,
          });
          return;
        }
        if (statusCode !== 200) {
          response.resume();
          resolve({
            status: statusCode,
            body: "",
          });
          return;
        }
        if (Number(response.headers["content-length"] ?? "0") > MAX_HOST_CHECK_BYTES) {
          response.destroy();
          reject(answerTooLargeError());
          return;
        }
        let chunks = [];
        let receivedBytes = 0;
        response.on("data", (chunk) => {
          receivedBytes += chunk.length;
          if (receivedBytes > MAX_HOST_CHECK_BYTES) {
            response.destroy();
            reject(answerTooLargeError());
            return;
          }
          chunks.push(chunk);
        });
        response.once("end", () => {
          if (response.complete)
            resolve({
              status: statusCode,
              body: Buffer.concat(chunks).toString("utf8"),
            });
          else reject(Error("response ended early"));
        });
        response.once("error", (error) => reject(toError(error)));
        response.once("close", () => reject(Error("response ended early")));
      },
    );
    request.once("error", (error) => reject(toError(error)));
    request.end();
  }).finally(() => agent.destroy());
}
//@ chunk-exfmq47h.js:247830-247880 layout
/**
 * 允许使用 http:// 的本地主机名集合。
 */
var LOCALHOST_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:247830", () => {
  LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
});
//@ chunk-exfmq47h.js:247880-248172 placement
/**
 * 规范化网关 URL：补 https://，非本地主机拒绝 http，去掉结尾斜杠。
 */
function normalizeGatewayUrl(url) {
  let trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) trimmed = `https://${trimmed}`;
  let parsed = new URL(trimmed);
  if (parsed.protocol === "http:" && !LOCALHOST_NAMES.has(parsed.hostname))
    throw Error(
      "Gateway URL must use https:// (got http://). Plain HTTP is only allowed for localhost during development.",
    );
  return parsed.href.replace(/\/+$/, "");
}
export {
  normalizeGatewayUrl,
  probeGatewayManagedSettings,
  gatewayCatalogRowId,
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

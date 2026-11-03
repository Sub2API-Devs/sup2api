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
import { Agent, Agent as Agent_2, request as request_2, request as request_3 } from "https";
import { getBedrockRegionPrefix, withBedrockRegionPrefix } from "../../utils/model/bedrock.js";
import { getAwsRegionSync } from "../../utils/awsRegion.js";
import { Ry } from "../analytics/telemetryCredentialGuard.js";
import { pickProfileForFoundationModel } from "../../utils/model/modelCatalog/catalogSeed.js";
import { resolveProviderModelId, gatewayModelIdFor } from "../../utils/model/modelStrings.js";
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from "../../utils/model/providers.js";
import { findCatalogRowIdByWireId } from "./_new/findCatalogRowIdByWireId.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, getGatewayAuth } from "../../bootstrap/state.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, M } from "../../../vendor/zod/v4/classic/schemas.js";
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
function zN(e) {
  let n = getBedrockRegionPrefix(getAwsRegionSync()),
    r = Ry();
  return (r === void 0 ? void 0 : pickProfileForFoundationModel(e, r, n)) ?? withBedrockRegionPrefix(e, n);
}
//@ chunk-aepeg2w5.js:231792-231834 placement
function oS(e, n) {
  return resolveProviderModelId(e, n) !== void 0;
}
//@ chunk-aepeg2w5.js:231834-231887 placement
function ef() {
  return `${getAPIProvider()}|${isFirstPartyAnthropicBaseUrl() ? "api" : "custom"}`;
}
//@ chunk-aepeg2w5.js:231887-231959 placement
function tf(e) {
  return findCatalogRowIdByWireId(e, {
    provider: getAPIProvider(),
    generation: ef(),
    wireIdOf: gatewayModelIdFor,
  });
}
//@ chunk-aepeg2w5.js:232332-232372 placement
class iS {
  seenAt = void 0;
  settledAt = void 0;
}
//@ chunk-aepeg2w5.js:232372-232397 placement
var jN = new HostScoped(() => new iS());
//@ chunk-aepeg2w5.js:232397-232434 placement
function sS() {
  return jN.of(getRootSession().host);
}
/**
 * 记录看到的网关 URL。
 */
//@ chunk-aepeg2w5.js:232434-232544 placement
function noteGatewaySeen(e) {
  let n = sS(),
    r = getGatewayAuth()?.url;
  if (r !== void 0 && r !== n.settledAt && typeof e === "string" && e !== "") n.seenAt = r;
}
//@ chunk-aepeg2w5.js:232544-232639 placement
function ywi() {
  let e = sS(),
    n = getGatewayAuth()?.url;
  if (n === void 0) return !1;
  return ((e.settledAt = n), e.seenAt === n);
}
//@ chunk-aepeg2w5.js:232639-232785 placement
var GATEWAY_HOST_CHECK_PATH = "/gateway-api/gateway-hosts/check",
  MAX_HOST_CHECK_BYTES = 8192,
  GatewayHostCheckSchema = DoctorLazy(() =>
    u({
      host: o(),
      listed: M(),
      served: M().nullable(),
      canonical: o()
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-aepeg2w5.js:232785-232852 placement
class Qn extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  kind;
  constructor(e, n, r) {
    super(e, n);
    this.kind = r;
  }
}
//@ chunk-aepeg2w5.js:232852-232872 placement
class pn extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
//@ chunk-aepeg2w5.js:232872-232948 placement
async function _S(e) {
  let n = e?.pause();
  try {
    return await getProxyAuthFromHelper();
  } finally {
    n?.();
  }
}
/**
 * 调用 /gateway-api/gateway-hosts/check 确认网关主机。
 */
//@ chunk-aepeg2w5.js:232948-234232 placement
async function queryGatewayHostCheck(
  e,
  n,
  {
    timeoutMs: timeoutMs,
    presentClientCertificate: presentClientCertificate,
    authorization: authorization,
    helperClock: helperClock,
  },
) {
  let S = new URL(GATEWAY_HOST_CHECK_PATH, `https://${e}`);
  if ((S.searchParams.set("host", n), authorization !== void 0 && !/^[\x20-\x7e]+$/.test(authorization)))
    authorization = void 0;
  let href = S.href,
    R = getUsableProxyUrl(),
    x = R !== void 0 && !shouldBypassProxy(href);
  if (x) await _S(helperClock);
  let P = { timedOut: !1 },
    F = await (async () => {
      let j = await requestWithProxyAuthRetry(S, {
        proxyUrl: x ? R : void 0,
        presentClientCertificate: presentClientCertificate,
        authorization: authorization,
        caCerts: getCACertificates(),
        timeoutMs: timeoutMs,
        helperClock: helperClock,
        attempt: P,
      });
      if (j.status === 429 || (j.status >= 500 && j.status <= 599))
        throw new Qn(`HTTP ${j.status}`, "gateway host check answered a 429 or 5xx status", "http-status");
      if (j.status !== 200) throw new pn(`HTTP ${j.status}`, "gateway host check answered a non-200 status");
      return j.body;
    })().catch((j) => {
      if (!P.timedOut && (j instanceof pn || j instanceof Qn)) throw j;
      throw new Qn(
        P.timedOut ? HOST_CHECK_TIMEOUT_MESSAGE : classifyTlsError(j),
        "gateway host check got no answer",
        "no-answer",
      );
    }),
    L;
  try {
    L = jsonParse(F);
  } catch {
    throw new pn("not a host-check answer (not JSON)", "gateway host check answer was not JSON");
  }
  let safeParse = GatewayHostCheckSchema().safeParse(L);
  if (!safeParse.success)
    throw new pn(
      "not a host-check answer (unrecognized JSON)",
      "gateway host check answer was not a host-check object",
    );
  if (safeParse.data.host !== n.toLowerCase().replace(/\.$/, ""))
    throw new pn("it answered about another hostname", "gateway host check answered about another hostname");
  return safeParse.data;
}
//@ chunk-aepeg2w5.js:234232-234436 placement
var HOST_CHECK_TIMEOUT_MESSAGE = "timed out",
  ANSWER_TOO_LARGE_MESSAGE = "answer exceeds size limit",
  answerTooLargeError = () =>
    new pn(ANSWER_TOO_LARGE_MESSAGE, "gateway host check answer exceeds size limit"),
  PROXY_AUTH_REQUIRED_MESSAGE = "the proxy requires authentication, HTTP 407",
  MAX_ERROR_DETAIL = 160,
  TLS_REFUSED_MESSAGE = "TLS connection not accepted";
/**
 * 把 TLS/网络错误归类并截短消息。
 */
//@ chunk-aepeg2w5.js:234436-235145 placement
function classifyTlsError(e) {
  let n = truncateToLength(
      errorMessage(e)
        .replace(/\s*For more information, pass `verbose: true`.*$/s, "")
        .replace(/[^\x20-\x7e]/gu, "?")
        .trim(),
      MAX_ERROR_DETAIL,
    ),
    r = getErrnoCode(e);
  if (r === "ERR_TLS_CERT_ALTNAME_INVALID" || /does not match certificate's altnames/i.test(n))
    return (
      logForDebugging(`[gateway] certificate for another name: ${n}`),
      `${TLS_REFUSED_MESSAGE}: the certificate is for another name`
    );
  if (r === "ConnectionRefused" || r === "ECONNREFUSED") return "connection refused";
  if (r?.startsWith("HPE_") || /^Parse Error/i.test(n)) return "not an HTTP response";
  if (r === "ENOTFOUND" || /ENOTFOUND|getaddrinfo/i.test(n)) return "the name does not resolve";
  if (/timed? ?out|TimedOut/i.test(n)) return HOST_CHECK_TIMEOUT_MESSAGE;
  if (/certificate|altnames|self[- ]signed|CERT_|SSL|TLS/i.test(n)) return `${TLS_REFUSED_MESSAGE}: ${n}`;
  return n;
}
/**
 * 探测网关的 /managed/settings 端点。
 */
//@ chunk-aepeg2w5.js:235145-236281 placement
async function probeGatewayManagedSettings(e, n, r) {
  try {
    let s = new URL(`${e.replace(/\/$/, "")}/managed/settings`);
    if (s.protocol !== "https:") return;
    let h = shouldBypassProxy(s.href) ? void 0 : getUsableProxyUrl(),
      y = { timedOut: !1 },
      S = await requestWithProxyAuthRetry(s, {
        proxyUrl: h,
        presentClientCertificate: !0,
        authorization: /^[\x20-\x7e]+$/.test(n) ? n : void 0,
        caCerts: caListBehindProxy(anthropicHostOf(s)),
        timeoutMs: r,
        helperClock: void 0,
        attempt: y,
        statusOnlyAs: `claude-cli/${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} (external, ${DESKTOP_3P_ENTRYPOINT})`,
      }).catch((w) => ({ unanswered: y.timedOut ? HOST_CHECK_TIMEOUT_MESSAGE : classifyTlsError(w) }));
    if ("unanswered" in S) return S;
    if ((noteGatewaySeen(S.gatewayVersion), S.status === 429 || (S.status >= 500 && S.status <= 599)))
      return { unanswered: `HTTP ${S.status}` };
    return !S.isGatewaysOwnNow ? void 0 : S.status === 304 ? !0 : S.status === 404 ? !1 : void 0;
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:236281-236560 placement
async function requestWithProxyAuthRetry(e, n) {
  try {
    return await requestWithTimeout(e, n);
  } catch (error) {
    let s = findProxyError(error);
    if (s?.connectStatus === 407 && getConfiguredProxyAuthHelper() !== void 0) {
      let h = s.headers["proxy-authenticate"];
      if ((clearProxyAuthHelperCache(Array.isArray(h) ? h[0] : h), (await _S(n.helperClock)) !== null))
        return await requestWithTimeout(e, n).catch((S) => {
          throw proxyErrorToHostCheckError(S) ?? S;
        });
    }
    throw proxyErrorToHostCheckError(error) ?? error;
  }
}
//@ chunk-aepeg2w5.js:236560-236757 placement
async function requestWithTimeout(e, n) {
  let timeout = AbortSignal.timeout(n.timeoutMs);
  try {
    return await withTimeout(createGatewayRequest(e, n, timeout), n.timeoutMs, HOST_CHECK_TIMEOUT_MESSAGE);
  } catch (error) {
    if (timeout.aborted || (error instanceof Error && error.message === HOST_CHECK_TIMEOUT_MESSAGE))
      n.attempt.timedOut = !0;
    throw error;
  }
}
//@ chunk-aepeg2w5.js:236757-237047 placement
function proxyErrorToHostCheckError(e) {
  let n = findProxyError(e);
  if (n === void 0) return;
  return n.connectStatus === 407
    ? new Qn(
        PROXY_AUTH_REQUIRED_MESSAGE,
        "gateway host check met a proxy authentication challenge",
        "proxy-auth",
      )
    : new Qn(
        `the proxy did not connect to it, ${describeHttpStatus(n.connectStatus)}`,
        "gateway host check got no tunnel through the proxy",
        "no-answer",
      );
}
/**
 * 创建到网关的 HTTPS 请求（代理、客户端证书、CA）。
 */
//@ chunk-aepeg2w5.js:237047-238316 placement
function createGatewayRequest(
  e,
  {
    proxyUrl: proxyUrl,
    presentClientCertificate: presentClientCertificate,
    authorization: authorization,
    caCerts: caCerts,
    statusOnlyAs: statusOnlyAs,
  },
  S,
) {
  let w = { ...(presentClientCertificate && getMTLSConfig()), ...(caCerts && { ca: caCerts }) },
    R = proxyUrl === void 0 ? new Agent_2({ ...w, keepAlive: !1 }) : createConnectProxyAgent(proxyUrl, w),
    replaced = e.hostname.replace(/^\[|\]$/g, "");
  return new Promise((P, F) => {
    let L = request_3(
      {
        host: replaced,
        port: e.port ? Number(e.port) : 443,
        path: `${e.pathname}${e.search}`,
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": statusOnlyAs ?? claudeCodeUserAgent(),
          ...(statusOnlyAs !== void 0 && {
            "If-None-Match": "*",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          }),
          ...(authorization !== void 0 && { Authorization: authorization }),
        },
        agent: R,
        ...w,
        ...proxyTlsOptions(replaced),
        signal: S,
      },
      (G) => {
        let j = G.statusCode ?? 0;
        if (statusOnlyAs !== void 0) {
          let re = G.headers["x-cc-gateway-version"],
            se = Boolean(re) && /\bno-store\b/i.test(G.headers["cache-control"] ?? "");
          (G.destroy(), P({ status: j, body: "", isGatewaysOwnNow: se, gatewayVersion: re }));
          return;
        }
        if (j !== 200) {
          (G.resume(), P({ status: j, body: "" }));
          return;
        }
        if (Number(G.headers["content-length"] ?? "0") > MAX_HOST_CHECK_BYTES) {
          (G.destroy(), F(answerTooLargeError()));
          return;
        }
        let q = [],
          Q = 0;
        (G.on("data", (re) => {
          if (((Q += re.length), Q > MAX_HOST_CHECK_BYTES)) {
            (G.destroy(), F(answerTooLargeError()));
            return;
          }
          q.push(re);
        }),
          G.once("end", () => {
            if (G.complete) P({ status: j, body: Buffer.concat(q).toString("utf8") });
            else F(Error("response ended early"));
          }),
          G.once("error", (re) => F(toError(re))),
          G.once("close", () => F(Error("response ended early"))));
      },
    );
    (L.once("error", (G) => F(toError(G))), L.end());
  }).finally(() => R.destroy());
}
/**
 * 规范化网关 URL：补 https://，非本地主机拒绝 http，去掉结尾斜杠。
 */
//@ chunk-aepeg2w5.js:238366-238658 placement
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
  tf,
  probeGatewayManagedSettings,
  normalizeGatewayUrl,
  ywi,
  noteGatewaySeen,
  zN,
  pn,
  Qn,
  queryGatewayHostCheck,
  classifyTlsError,
  oS,
  ef,
};

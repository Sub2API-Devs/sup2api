/**
 * services/artifacts/framePublish.ts
 *
 * 2.1.316 新增：Artifact frame 发布。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sh3bk7pt.js (12)
 * attribution: placement 12
 */
import { findProxyError, ConnectProxyAgent, getUsableProxyUrl } from "../../utils/proxy.js";
import { findInCauseChain, getErrnoCode } from "../../utils/errors.js";
import { SSL_CERT_ERROR_CODES } from "../api/errorUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { mn } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import { getRootSession } from "../../bootstrap/state.js";
import { Wci } from "../../utils/agentProxy/agentProxyState.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { ANT_KEY_PFX } from "../teamMemorySync/secretScanner.js";
import { xki, Pki } from "../analytics/eventSerialization.js";

//@ chunk-sh3bk7pt.js:977-1055 placement
var we = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
  Oe = /^(?:0x[0-9a-f]*|[0-9]+)$/;
//@ chunk-sh3bk7pt.js:1055-1282 placement
function parseFrameHostsList(e) {
  if (e === void 0) return;
  let n;
  for (let r of e.split(",")) {
    let lower = r.trim().toLowerCase();
    if (lower === "") continue;
    let parts = lower.split(".");
    if (lower.length > 253 || !parts.every((y) => we.test(y)) || parts.every((y) => Oe.test(y))) return;
    n ??= lower;
  }
  return n;
}
/**
 * 判断错误是否来自代理或连接被拒（含 SSL 证书错误）。
 */
//@ chunk-sh3bk7pt.js:1282-1438 placement
function isProxyOrConnectRefusal(e) {
  if (findProxyError(e) !== void 0) return !0;
  return (
    findInCauseChain(e, (n) => {
      let r = getErrnoCode(n);
      return (
        r === "ECONNREFUSED" || r === "ConnectionRefused" || (r !== void 0 && SSL_CERT_ERROR_CODES.has(r))
      );
    }) !== void 0
  );
}
/**
 * 框架隧道代理缓存：按代理配置复用 HTTP 代理 agent（携带网关 CA），并对格式错误的配置只警告一次。
 */
//@ chunk-sh3bk7pt.js:1438-1867 placement
class FrameTunnelAgentCache {
  builtFor = void 0;
  agent = void 0;
  warnedMalformed = void 0;
  agentFor(e) {
    if (this.agent === void 0 || this.builtFor !== e) {
      let n = new ConnectProxyAgent(e.proxyUrl, { ca: e.gatewayCa });
      ((n.options = { ...n.options, ca: e.gatewayCa }), (this.builtFor = e), (this.agent = n));
    }
    return this.agent;
  }
  warnMalformedOnce(e) {
    if (this.warnedMalformed === e) return;
    ((this.warnedMalformed = e),
      logForDebugging("[frame-tunnel] CCR_AGENT_PROXY_FRAME_HOSTS is malformed; keeping the gateway routes", {
        level: "warn",
      }));
  }
}
//@ chunk-sh3bk7pt.js:1867-1891 placement
var Pe = new HostScoped(() => new FrameTunnelAgentCache());
/**
 * 云会话下读取 CCR_AGENT_PROXY_FRAME_HOSTS，解析出第一个合法主机名并返回经网关代理的 {host, agent}；格式错误只警告一次；没有可用网关代理配置或已有其他代理时返回 undefined。
 */
//@ chunk-sh3bk7pt.js:1891-2136 placement
function getFrameTunnelRoute() {
  if (!mn()) return;
  let CCR_AGENT_PROXY_FRAME_HOSTS = env.CCR_AGENT_PROXY_FRAME_HOSTS;
  if (CCR_AGENT_PROXY_FRAME_HOSTS === void 0) return;
  let of = Pe.of(getRootSession().host),
    r = parseFrameHostsList(CCR_AGENT_PROXY_FRAME_HOSTS);
  if (r === void 0) {
    of.warnMalformedOnce(CCR_AGENT_PROXY_FRAME_HOSTS);
    return;
  }
  let a = Wci();
  if (a === void 0 || getUsableProxyUrl() !== void 0) return;
  return { host: r, agent: of.agentFor(a) };
}
/**
 * 发布请求体压缩用的常量：服务端读取期限、大小阈值、取样长度、压缩比余量与 gzip 请求头。
 */
//@ chunk-sh3bk7pt.js:2136-2255 placement
var PUBLISH_READ_DEADLINE_S = 60,
  PUBLISH_READ_DEADLINE_MAX_S = 180,
  BYTES_PER_EXTRA_SECOND = 32768,
  GZIP_SAMPLE_THRESHOLD = 1048576,
  GZIP_SAMPLE_CHARS = 262144,
  GZIP_RATIO_MARGIN = 1.25,
  GZIP_JSON_HEADERS = { "Content-Encoding": "gzip", "Content-Type": "application/json" };
//@ chunk-sh3bk7pt.js:2255-2339 placement
function y3r(e) {
  if (e === void 0 || e <= 0) return PUBLISH_READ_DEADLINE_S;
  return Math.min(
    PUBLISH_READ_DEADLINE_MAX_S,
    PUBLISH_READ_DEADLINE_S + Math.floor(e / BYTES_PER_EXTRA_SECOND),
  );
}
//@ chunk-sh3bk7pt.js:2339-2377 placement
function Le(e, n) {
  return n * y3r(e) <= e * PUBLISH_READ_DEADLINE_S;
}
/**
 * 决定发布请求体是否 gzip：先看滚动开关；大请求体先取样估算压缩比，达不到在服务端读取期限内完成所需比例就不压缩；压缩后再核验一次。返回压缩结果（或 null）与编码打点信息。
 */
//@ chunk-sh3bk7pt.js:2377-3381 placement
async function gzipPublishBody({ url: options, body: body, storageV5: storageV5 }) {
  let json = jsonStringify(body),
    l = json.length,
    gzipDecision = ANT_KEY_PFX(options, json, storageV5, "frame_publish");
  if (gzipDecision === void 0) return { gzipped: null, encoding: void 0, jsonChars: l };
  let jsonBytes = Buffer.byteLength(json),
    uncompressed = (R) => ({
      gzipped: null,
      jsonChars: l,
      encoding: { json_bytes: jsonBytes, wire_bytes: jsonBytes, body_gzip: !1, gzip_skip: R },
    });
  if (!gzipDecision.gzip) return uncompressed(gzipDecision.reason);
  let u = y3r(jsonBytes) / PUBLISH_READ_DEADLINE_S;
  if (jsonBytes >= GZIP_SAMPLE_THRESHOLD) {
    let sliced = json.slice(0, GZIP_SAMPLE_CHARS),
      w = Buffer.byteLength(sliced) / (await xki(sliced)).length;
    if (w * GZIP_RATIO_MARGIN < u)
      return (
        logForDebugging(
          `[artifact] publish body sent uncompressed: its first ${GZIP_SAMPLE_CHARS} characters compress only ${w.toFixed(2)}x, and a body of ${jsonBytes} bytes needs ${u.toFixed(2)}x to finish inside the server's 60-second read limit for a compressed upload`,
        ),
        uncompressed("deadline_ratio")
      );
  }
  let gzipped = await Pki(json);
  if (!Le(jsonBytes, gzipped.length))
    return (
      logForDebugging(
        `[artifact] publish body sent uncompressed: gzip only got ${jsonBytes} bytes down to ${gzipped.length}, too little to finish inside the server's 60-second read limit for a compressed upload`,
      ),
      uncompressed("deadline_ratio")
    );
  return {
    gzipped: gzipped,
    jsonChars: l,
    encoding: { json_bytes: jsonBytes, wire_bytes: gzipped.length, body_gzip: !0 },
  };
}
/**
 * 判断值是否是普通对象（原型为 Object.prototype 或 null）。
 */
//@ chunk-sh3bk7pt.js:3381-3525 placement
function isPlainRecord(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e)) return !1;
  let prototypeOf = Object.getPrototypeOf(e);
  return prototypeOf === Object.prototype || prototypeOf === null;
}
/**
 * 把框架请求结果转为统一的响应信息（状态码、按名取响应头、读取正文）；请求失败时状态为 0、正文为空。
 */
//@ chunk-sh3bk7pt.js:3525-3791 placement
function toResponseFacts(e) {
  if (!e.ok)
    return {
      status: 0,
      header: () => {
        return;
      },
      bodyText: async () => "",
    };
  return {
    status: e.status,
    header: (n) => {
      let r = e.response?.headers?.[n];
      return typeof r === "string" ? r : void 0;
    },
    bodyText: async () =>
      typeof e.data === "string" ? e.data : e.data === void 0 ? "" : jsonStringify(e.data),
  };
}

export {
  y3r,
  isPlainRecord,
  gzipPublishBody,
  toResponseFacts,
  getFrameTunnelRoute,
  isProxyOrConnectRefusal,
  GZIP_JSON_HEADERS,
};

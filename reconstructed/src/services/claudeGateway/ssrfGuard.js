/**
 * services/claudeGateway/ssrfGuard.ts
 *
 * 2.1.316 新增：网关 SSRF 防护
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (20)
 * attribution: placement 20
 */
import { lookup, promises } from "dns";
import { checkServerIdentity } from "tls";
import { request as request_2 } from "https";
import { request } from "http";
import { Re } from "../../../runtime/bun-runtime.js";
import { Yy } from "../../../vendor/ipaddr.js/ipaddr.min.js";
import { env } from "../../utils/env.js";
import { isPrivateHost } from "../../utils/network/privateHostCheck.js";
import { js, Rl } from "./network.js";
import { getUsableProxyUrl, shouldBypassProxy } from "../../utils/proxy.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";

//@ chunk-1ny7cxrt.js:1316760-1316778 placement
var Ga = Re(Yy(), 1);
/**
 * SSRF 拦截错误前缀（云元数据/链路本地、回环）。
 */
//@ chunk-1ny7cxrt.js:1316931-1317116 placement
var SSRF_METADATA_BLOCKED = "ECONNREFUSED_SSRF: blocked (cloud metadata / link-local)",
  SSRF_LOOPBACK_BLOCKED =
    "ECONNREFUSED_SSRF: blocked (loopback; set CLAUDE_GATEWAY_ALLOW_LOOPBACK=1 in the gateway environment to allow it)";
//@ chunk-1ny7cxrt.js:1317116-1317204 placement
function jk(e) {
  let range = Ga.parse(e).range();
  return range === "loopback" || range === "unspecified" ? SSRF_LOOPBACK_BLOCKED : SSRF_METADATA_BLOCKED;
}
//@ chunk-1ny7cxrt.js:1317204-1317257 placement
function Jy() {
  return env.CLAUDE_GATEWAY_ALLOW_LOOPBACK;
}
//@ chunk-1ny7cxrt.js:1317257-1317291 placement
function Du(e) {
  return Jy() && isLoopbackUrl(e);
}
/**
 * URL 主机是否为 localhost 或回环/未指定地址。
 */
//@ chunk-1ny7cxrt.js:1317291-1317502 placement
function isLoopbackUrl(e) {
  try {
    let replaced = new URL(e).hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "")
      .replace(/\.$/, "");
    if (replaced === "localhost") return !0;
    let range = Ga.parse(replaced).range();
    return range === "loopback" || range === "unspecified";
  } catch {
    return !1;
  }
}
/**
 * IP 是否被拦截（回环在未允许时、私有/元数据地址）。
 */
//@ chunk-1ny7cxrt.js:1317502-1317751 placement
function isBlockedAddress(e) {
  let t;
  try {
    t = Ga.parse(e.replace(/^\[|\]$/g, ""));
  } catch {
    return !1;
  }
  let range = (t.kind() === "ipv6" && t.isIPv4MappedAddress() ? t.toIPv4Address() : t).range();
  if (range === "loopback" || range === "unspecified") return !Jy();
  return isPrivateHost(t.toString().replace(/%.*$/, ""));
}
//@ chunk-1ny7cxrt.js:1317751-1317868 placement
var METADATA_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata.goog",
  "metadata",
  "instance-data",
  "instance-data.ec2.internal",
]);
/**
 * 出站 URL 是否允许：http(s)、主机名合法、非元数据主机、非受限地址。
 */
//@ chunk-1ny7cxrt.js:1317868-1318121 placement
function isAllowedOutboundUrl(e) {
  try {
    let t = new URL(e);
    if (t.protocol !== "https:" && t.protocol !== "http:") return !1;
    let replaced = t.hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "")
      .replace(/\.$/, "");
    if (replaced.split(".").includes("")) return !1;
    if (METADATA_HOSTNAMES.has(replaced)) return !1;
    return !isBlockedAddress(replaced);
  } catch {
    return !1;
  }
}
/**
 * DNS lookup 包装：解析结果含受限地址时拒绝，优先返回 IPv4。
 */
//@ chunk-1ny7cxrt.js:1318121-1318520 placement
var guardedLookup = (e, t, n) => {
  let o = typeof t === "function" ? {} : t,
    r = typeof t === "function" ? t : n;
  lookup(e, { ...o, all: !0 }, (s, a) => {
    if (s) return r(s);
    if (a.length === 0) return r(Object.assign(Error(`getaddrinfo ENOTFOUND ${e}`), { code: "ENOTFOUND" }));
    for (let { address: address } of a)
      if (isBlockedAddress(address)) return r(Error(`${jk(address)}: ${e} \u2192 ${address}`));
    let l = a.find((c) => c.family === 4) ?? a[0];
    if (o.all) return r(null, [l]);
    return r(null, l.address, l.family);
  });
};
/**
 * SSRF 安全的 fetch：校验 URL；经代理时交给代理；直连时先解析并检查所有地址，再按 IP 连接并保留 Host/SNI。
 */
//@ chunk-1ny7cxrt.js:1318520-1319482 placement
async function ssrfSafeFetch(e, t) {
  if (!isAllowedOutboundUrl(e))
    throw Error(`${isLoopbackUrl(e) ? SSRF_LOOPBACK_BLOCKED : SSRF_METADATA_BLOCKED}: ${e}`);
  let n = new URL(e);
  ((n.username = ""), (n.password = ""));
  let replaced = n.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, ""),
    { honorNoProxy: honorNoProxy, ...s } = t ?? {},
    a = { ...s, redirect: "manual", tls: { ...s.tls, ca: js() } };
  if (Rl()) {
    if (isPrivateHost(replaced)) throw Error("ECONNREFUSED_SSRF: blocked loopback/metadata host via proxy");
    if (!Ga.isValid(replaced)) n.hostname = replaced;
    let h = { ...a, proxy: t?.proxy ?? getUsableProxyUrl() };
    return fetch(n, h);
  }
  if (Ga.isValid(replaced)) return fetch(n, a);
  if (honorNoProxy && getUsableProxyUrl() && shouldBypassProxy(e)) return requestViaNodeHttp(n, a);
  let lookup = await promises.lookup(replaced, { all: !0 });
  if (lookup.length === 0)
    throw Object.assign(Error(`getaddrinfo ENOTFOUND ${replaced}`), { code: "ENOTFOUND" });
  for (let { address: address } of lookup)
    if (isBlockedAddress(address)) throw Error(`${jk(address)}: ${replaced} \u2192 ${address}`);
  let c = lookup.find((h) => h.family === 4) ?? lookup[0],
    host = n.host;
  n.hostname = c.family === 6 ? `[${c.address}]` : c.address;
  let headers = new Headers(a.headers);
  return (
    headers.set("host", host),
    fetch(n, {
      ...a,
      headers: headers,
      ...(n.protocol === "https:" && {
        tls: {
          ...a.tls,
          serverName: replaced,
          checkServerIdentity: (h, m) => checkServerIdentity(replaced, m),
        },
      }),
    })
  );
}
/**
 * NO_PROXY 直连时用 node http(s) 发送请求（使用受保护的 lookup），只返回状态。
 */
//@ chunk-1ny7cxrt.js:1319482-1320078 placement
async function requestViaNodeHttp(e, t) {
  let headers = new Headers(t.headers);
  if ((headers.set("host", e.host), !headers.has("user-agent")))
    headers.set("user-agent", navigator.userAgent);
  if (!headers.has("accept")) headers.set("accept", "*/*");
  let o = t.body == null ? void 0 : Buffer.from(await new Response(t.body).arrayBuffer());
  return new Promise((r, s) => {
    let a = (e.protocol === "https:" ? request_2 : request)(
      e,
      {
        method: t.method,
        headers: Object.fromEntries(headers),
        ...(t.signal && { signal: t.signal }),
        lookup: guardedLookup,
      },
      (l) => {
        l.resume();
        try {
          r(new Response(null, { status: l.statusCode ?? 502, statusText: l.statusMessage }));
        } catch (error) {
          s(error);
        }
      },
    );
    (a.on("error", (l) => s(t.signal?.aborted ? t.signal.reason : l)), a.end(o));
  });
}
/**
 * 能访问 169.254.169.254 时警告需要出口网络策略。
 */
//@ chunk-1ny7cxrt.js:1320078-1320363 placement
async function warnIfMetadataReachable() {
  if (Jy()) return;
  try {
    (await fetch("http://169.254.169.254/", { signal: AbortSignal.timeout(200), redirect: "manual" }),
      gatewayLog(
        "warn",
        "pod can reach cloud metadata endpoint (169.254.169.254); apply egress NetworkPolicy (see src/gateway/docs/docker/network-policy.yaml)",
      ));
  } catch {}
}
//@ chunk-1ny7cxrt.js:1336032-1336050 placement
var qr = Re(Yy(), 1);
/**
 * 解析 CIDR 或单个 IP（IPv4 映射地址转为 IPv4）。
 */
//@ chunk-1ny7cxrt.js:1336050-1336340 placement
function parseCidr(e) {
  if (e.includes("/")) {
    let [n, o] = qr.parseCIDR(e);
    if (n instanceof qr.IPv6 && n.isIPv4MappedAddress() && o >= 96) return [n.toIPv4Address(), o - 96];
    return [n, o];
  }
  let parse = qr.parse(e);
  if (parse instanceof qr.IPv6 && parse.isIPv4MappedAddress()) return [parse.toIPv4Address(), 32];
  return [parse, parse.kind() === "ipv6" ? 128 : 32];
}
//@ chunk-1ny7cxrt.js:1336340-1336372 placement
function Lu(e) {
  return e.map(parseCidr);
}
/**
 * 解析 IP（IPv4 映射转 IPv4），失败返回 null。
 */
//@ chunk-1ny7cxrt.js:1336372-1336511 placement
function parseIp(e) {
  try {
    let parse = qr.parse(e);
    if (parse instanceof qr.IPv6 && parse.isIPv4MappedAddress()) return parse.toIPv4Address();
    return parse;
  } catch {
    return null;
  }
}
//@ chunk-1ny7cxrt.js:1336511-1336589 placement
var gH = /^(\d{1,3}(?:\.\d{1,3}){3}):\d{1,5}$/,
  yH = /^\[([^\]]+)\](?::\d{1,5})?$/;
//@ chunk-1ny7cxrt.js:1336589-1336649 placement
function _H(e) {
  let t = gH.exec(e) ?? yH.exec(e);
  return t ? t[1] : e;
}
/**
 * IP 是否在任一 CIDR 范围内。
 */
//@ chunk-1ny7cxrt.js:1336649-1336831 placement
function ipInRanges(e, t) {
  for (let [n, o] of t) {
    if (e instanceof qr.IPv4 && n instanceof qr.IPv4 && e.match(n, o)) return !0;
    if (e instanceof qr.IPv6 && n instanceof qr.IPv6 && e.match(n, o)) return !0;
  }
  return !1;
}

export {
  ssrfSafeFetch,
  isLoopbackUrl,
  Du,
  isAllowedOutboundUrl,
  guardedLookup,
  parseIp,
  ipInRanges,
  _H,
  parseCidr,
  Lu,
  warnIfMetadataReachable,
};

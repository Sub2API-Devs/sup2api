/**
 * services/claudeGateway/ssrfGuard.ts
 *
 * 2.1.316 新增：网关 SSRF 防护
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (20)
 * attribution: placement 20
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lookup, promises } from "dns";
import { checkServerIdentity } from "tls";
import { request as request_2 } from "https";
import { request } from "http";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_ipaddr_min } from "../../../vendor/ipaddr.js/ipaddr.min.js";
import { env } from "../../utils/env.js";
import { isPrivateHost } from "../../utils/network/privateHostCheck.js";
import { getNativeCaBlocks, isEgressBoundaryActive } from "./network.js";
import { getUsableProxyUrl, shouldBypassProxy } from "../../utils/proxy.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1hnjmk23.js:1317723-1317741 placement
/**
 * 懒加载的 ipaddr.js 模块（判断地址段）。
 */
var ipaddrModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1hnjmk23.js:1317723", () => {
  ipaddrModule = __toESM(require_ipaddr_min(), 1);
});
//@ chunk-1hnjmk23.js:1317894-1318079 placement
/**
 * SSRF 拦截错误前缀（云元数据/链路本地、回环）。
 */
var SSRF_METADATA_BLOCKED = "ECONNREFUSED_SSRF: blocked (cloud metadata / link-local)";
var SSRF_LOOPBACK_BLOCKED =
  "ECONNREFUSED_SSRF: blocked (loopback; set CLAUDE_GATEWAY_ALLOW_LOOPBACK=1 in the gateway environment to allow it)";
//@ chunk-1hnjmk23.js:1318079-1318167 placement
/**
 * 给出被拦截地址的说明：回环/未指定 → 回环拦截，否则 → 云元数据拦截。
 */
function describeBlockedAddress(address) {
  let range = ipaddrModule.parse(address).range();
  return range === "loopback" || range === "unspecified" ? SSRF_LOOPBACK_BLOCKED : SSRF_METADATA_BLOCKED;
}
//@ chunk-1hnjmk23.js:1318167-1318220 placement
/**
 * 是否通过 CLAUDE_GATEWAY_ALLOW_LOOPBACK 允许回环地址。
 */
function isLoopbackAllowed() {
  return env.CLAUDE_GATEWAY_ALLOW_LOOPBACK;
}
//@ chunk-1hnjmk23.js:1318220-1318254 placement
/**
 * 判断 URL 主机是否为 localhost 或回环地址（且允许回环时放行判断）。
 */
function isAllowedLoopbackUrl(url) {
  return isLoopbackAllowed() && isLoopbackUrl(url);
}
//@ chunk-1hnjmk23.js:1318254-1318465 placement
/**
 * URL 主机是否为 localhost 或回环/未指定地址。
 */
function isLoopbackUrl(url) {
  try {
    let replaced = new URL(url).hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "")
      .replace(/\.$/, "");
    if (replaced === "localhost") return true;
    let range = ipaddrModule.parse(replaced).range();
    return range === "loopback" || range === "unspecified";
  } catch {
    return false;
  }
}
//@ chunk-1hnjmk23.js:1318465-1318714 placement
/**
 * IP 是否被拦截（回环在未允许时、私有/元数据地址）。
 */
function isBlockedAddress(address) {
  let parsed;
  try {
    parsed = ipaddrModule.parse(address.replace(/^\[|\]$/g, ""));
  } catch {
    return false;
  }
  let range = (
    parsed.kind() === "ipv6" && parsed.isIPv4MappedAddress() ? parsed.toIPv4Address() : parsed
  ).range();
  if (range === "loopback" || range === "unspecified") return !isLoopbackAllowed();
  return isPrivateHost(parsed.toString().replace(/%.*$/, ""));
}
//@ chunk-1hnjmk23.js:1318714-1318831 placement
var METADATA_HOSTNAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1hnjmk23.js:1318714", () => {
  METADATA_HOSTNAMES = new Set([
    "metadata.google.internal",
    "metadata.goog",
    "metadata",
    "instance-data",
    "instance-data.ec2.internal",
  ]);
});
//@ chunk-1hnjmk23.js:1318831-1319084 placement
/**
 * 出站 URL 是否允许：http(s)、主机名合法、非元数据主机、非受限地址。
 */
function isAllowedOutboundUrl(url) {
  try {
    let parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") return false;
    let replaced = parsedUrl.hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "")
      .replace(/\.$/, "");
    if (replaced.split(".").includes("")) return false;
    if (METADATA_HOSTNAMES.has(replaced)) return false;
    return !isBlockedAddress(replaced);
  } catch {
    return false;
  }
}
//@ chunk-1hnjmk23.js:1319084-1319483 placement
/**
 * DNS lookup 包装：解析结果含受限地址时拒绝，优先返回 IPv4。
 */
var guardedLookup = (host, optionsOrCallback, callback) => {
  let options = typeof optionsOrCallback === "function" ? {} : optionsOrCallback;
  let done = typeof optionsOrCallback === "function" ? optionsOrCallback : callback;
  lookup(
    host,
    {
      ...options,
      all: true,
    },
    (error, addresses) => {
      if (error) return done(error);
      if (addresses.length === 0)
        return done(
          Object.assign(Error(`getaddrinfo ENOTFOUND ${host}`), {
            code: "ENOTFOUND",
          }),
        );
      for (let { address } of addresses)
        if (isBlockedAddress(address))
          return done(Error(`${describeBlockedAddress(address)}: ${host} \u2192 ${address}`));
      let chosen = addresses.find((entry) => entry.family === 4) ?? addresses[0];
      if (options.all) return done(null, [chosen]);
      return done(null, chosen.address, chosen.family);
    },
  );
};
//@ chunk-1hnjmk23.js:1319483-1320445 placement
/**
 * SSRF 安全的 fetch：校验 URL；经代理时交给代理；直连时先解析并检查所有地址，再按 IP 连接并保留 Host/SNI。
 */
async function ssrfSafeFetch(url, init) {
  if (!isAllowedOutboundUrl(url))
    throw Error(`${isLoopbackUrl(url) ? SSRF_LOOPBACK_BLOCKED : SSRF_METADATA_BLOCKED}: ${url}`);
  let parsedUrl = new URL(url);
  parsedUrl.username = "";
  parsedUrl.password = "";
  let replaced = parsedUrl.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  let { honorNoProxy, ...restOptions } = init ?? {};
  let baseOptions = {
    ...restOptions,
    redirect: "manual",
    tls: {
      ...restOptions.tls,
      ca: getNativeCaBlocks(),
    },
  };
  if (isEgressBoundaryActive()) {
    if (isPrivateHost(replaced)) throw Error("ECONNREFUSED_SSRF: blocked loopback/metadata host via proxy");
    if (!ipaddrModule.isValid(replaced)) parsedUrl.hostname = replaced;
    let proxyOptions = {
      ...baseOptions,
      proxy: init?.proxy ?? getUsableProxyUrl(),
    };
    return fetch(parsedUrl, proxyOptions);
  }
  if (ipaddrModule.isValid(replaced)) return fetch(parsedUrl, baseOptions);
  if (honorNoProxy && getUsableProxyUrl() && shouldBypassProxy(url))
    return requestViaNodeHttp(parsedUrl, baseOptions);
  let addresses = await promises.lookup(replaced, {
    all: true,
  });
  if (addresses.length === 0)
    throw Object.assign(Error(`getaddrinfo ENOTFOUND ${replaced}`), {
      code: "ENOTFOUND",
    });
  for (let { address } of addresses)
    if (isBlockedAddress(address))
      throw Error(`${describeBlockedAddress(address)}: ${replaced} \u2192 ${address}`);
  let chosen = addresses.find((entry) => entry.family === 4) ?? addresses[0];
  let host = parsedUrl.host;
  parsedUrl.hostname = chosen.family === 6 ? `[${chosen.address}]` : chosen.address;
  let headers = new Headers(baseOptions.headers);
  headers.set("host", host);
  return fetch(parsedUrl, {
    ...baseOptions,
    headers,
    ...(parsedUrl.protocol === "https:" && {
      tls: {
        ...baseOptions.tls,
        serverName: replaced,
        checkServerIdentity: (hostname, cert) => checkServerIdentity(replaced, cert),
      },
    }),
  });
}
//@ chunk-1hnjmk23.js:1320445-1321041 placement
/**
 * NO_PROXY 直连时用 node http(s) 发送请求（使用受保护的 lookup），只返回状态。
 */
async function requestViaNodeHttp(url, init) {
  let headers = new Headers(init.headers);
  headers.set("host", url.host);
  if (!headers.has("user-agent")) headers.set("user-agent", navigator.userAgent);
  if (!headers.has("accept")) headers.set("accept", "*/*");
  let bodyBuffer = init.body == null ? undefined : Buffer.from(await new Response(init.body).arrayBuffer());
  return new Promise((resolve, reject) => {
    let httpRequest = (url.protocol === "https:" ? request_2 : request)(
      url,
      {
        method: init.method,
        headers: Object.fromEntries(headers),
        ...(init.signal && {
          signal: init.signal,
        }),
        lookup: guardedLookup,
      },
      (response) => {
        response.resume();
        try {
          resolve(
            new Response(null, {
              status: response.statusCode ?? 502,
              statusText: response.statusMessage,
            }),
          );
        } catch (error) {
          reject(error);
        }
      },
    );
    httpRequest.on("error", (error) => reject(init.signal?.aborted ? init.signal.reason : error));
    httpRequest.end(bodyBuffer);
  });
}
//@ chunk-1hnjmk23.js:1321041-1321326 placement
/**
 * 能访问 169.254.169.254 时警告需要出口网络策略。
 */
async function warnIfMetadataReachable() {
  if (isLoopbackAllowed()) return;
  try {
    await fetch("http://169.254.169.254/", {
      signal: AbortSignal.timeout(200),
      redirect: "manual",
    });
    gatewayLog(
      "warn",
      "pod can reach cloud metadata endpoint (169.254.169.254); apply egress NetworkPolicy (see src/gateway/docs/docker/network-policy.yaml)",
    );
  } catch {}
}
//@ chunk-1hnjmk23.js:1336995-1337013 placement
/**
 * 懒加载的 ipaddr.js 模块（解析 CIDR）。
 */
var ipaddrModule2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1hnjmk23.js:1336995", () => {
  ipaddrModule2 = __toESM(require_ipaddr_min(), 1);
});
//@ chunk-1hnjmk23.js:1337013-1337303 placement
/**
 * 解析 CIDR 或单个 IP（IPv4 映射地址转为 IPv4）。
 */
function parseCidr(cidr) {
  if (cidr.includes("/")) {
    let [network, prefixLength] = ipaddrModule2.parseCIDR(cidr);
    if (network instanceof ipaddrModule2.IPv6 && network.isIPv4MappedAddress() && prefixLength >= 96)
      return [network.toIPv4Address(), prefixLength - 96];
    return [network, prefixLength];
  }
  let address = ipaddrModule2.parse(cidr);
  if (address instanceof ipaddrModule2.IPv6 && address.isIPv4MappedAddress())
    return [address.toIPv4Address(), 32];
  return [address, address.kind() === "ipv6" ? 128 : 32];
}
//@ chunk-1hnjmk23.js:1337303-1337335 placement
/**
 * 把 CIDR 字符串列表解析成范围列表。
 */
function parseCidrList(entries) {
  return entries.map(parseCidr);
}
//@ chunk-1hnjmk23.js:1337335-1337474 placement
/**
 * 解析 IP（IPv4 映射转 IPv4），失败返回 null。
 */
function parseIp(text) {
  try {
    let parsed = ipaddrModule2.parse(text);
    if (parsed instanceof ipaddrModule2.IPv6 && parsed.isIPv4MappedAddress()) return parsed.toIPv4Address();
    return parsed;
  } catch {
    return null;
  }
}
//@ chunk-1hnjmk23.js:1337474-1337552 placement
/**
 * 匹配 [IPv6] 或 [IPv6]:端口 的正则。
 */
var IPV4_WITH_PORT_RE = /^(\d{1,3}(?:\.\d{1,3}){3}):\d{1,5}$/;
var BRACKETED_IPV6_RE = /^\[([^\]]+)\](?::\d{1,5})?$/;
//@ chunk-1hnjmk23.js:1337552-1337612 placement
/**
 * 从主机字符串里去掉端口取出 IP（不是 IP 形状就原样返回）。
 */
function extractIpFromHost(host) {
  let match = IPV4_WITH_PORT_RE.exec(host) ?? BRACKETED_IPV6_RE.exec(host);
  return match ? match[1] : host;
}
//@ chunk-1hnjmk23.js:1337612-1337794 placement
/**
 * IP 是否在任一 CIDR 范围内。
 */
function ipInRanges(ip, ranges) {
  for (let [network, bits] of ranges) {
    if (ip instanceof ipaddrModule2.IPv4 && network instanceof ipaddrModule2.IPv4 && ip.match(network, bits))
      return true;
    if (ip instanceof ipaddrModule2.IPv6 && network instanceof ipaddrModule2.IPv6 && ip.match(network, bits))
      return true;
  }
  return false;
}
export {
  ssrfSafeFetch,
  isLoopbackUrl,
  isAllowedLoopbackUrl,
  isAllowedOutboundUrl,
  guardedLookup,
  parseIp,
  ipInRanges,
  extractIpFromHost,
  parseCidr,
  parseCidrList,
  warnIfMetadataReachable,
};

/**
 * utils/network/privateHostCheck.ts
 *
 * 2.1.316 新增：主机是否为本地/内网/元数据地址；解析 IPv6 地址等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (10)
 * attribution: placement 10
 */
import { isIPv6, isIPv4 } from "net";

//@ chunk-dcmhvw5a.js:24123-24435 placement
/**
 * 云元数据等内部主机名。
 */
var METADATA_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata.goog",
  "metadata",
  "instance-data",
  "instance-data.ec2.internal",
  "ip6-localhost",
  "ip6-loopback",
  "localhost.localdomain",
  "localhost4",
  "localhost4.localdomain4",
  "localhost6",
  "localhost6.localdomain6",
]);
var METADATA_IPS = new Set(["100.100.100.200", "168.63.129.16", "192.0.0.192"]);
//@ chunk-dcmhvw5a.js:24435-24496 placement
function isLoopbackOrLinkLocalV4(e, n, r, s) {
  return e === 127 || (e === 169 && n === 254) || e === 0;
}
//@ chunk-dcmhvw5a.js:24496-25156 placement
/**
 * 解析 IPv6 地址。
 */
function parseIpv6Address(e) {
  let index = e.indexOf("%");
  let parts = (index >= 0 ? e.slice(0, index) : e).toLowerCase().split("::");
  if (parts.length > 2) return;
  let a = parts[0] ? parts[0].split(":") : [];
  let c = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
  let g = parts.length === 2 ? c : a;
  let m = [];
  let last = g.at(-1);
  if (last !== undefined && last.includes(".")) {
    let mapped = last.split(".").map(Number);
    if (mapped.length !== 4 || mapped.some((w) => !Number.isInteger(w) || w < 0 || w > 255)) return;
    m = mapped;
    g.pop();
  }
  let h = (C) => {
    let w = [];
    for (let L of C) {
      if (!/^[0-9a-f]{1,4}$/.test(L)) return;
      let v = parseInt(L, 16);
      w.push(v >> 8, v & 255);
    }
    return w;
  };
  let y = h(parts.length === 2 ? a : []);
  let b = h(g);
  if (y === undefined || b === undefined) return;
  let S = y.length + b.length + m.length;
  if (S > 16 || (parts.length === 1 && S !== 16)) return;
  return [...y, ...Array(16 - S).fill(0), ...b, ...m];
}
//@ chunk-dcmhvw5a.js:25156-25204 placement
function isIpv4MappedLoopback(ipv6Address) {
  return isNat64Prefix(ipv6Address) && ipv6Address[4] === 0 && ipv6Address[5] === 1;
}
//@ chunk-dcmhvw5a.js:25204-25271 placement
function isNat64Prefix(e) {
  return e[0] === 0 && e[1] === 100 && e[2] === 255 && e[3] === 155;
}
//@ chunk-dcmhvw5a.js:25271-25465 placement
function isIpv4MappedOrTranslatedIpv6(e) {
  if (!isIPv6(e)) return false;
  let ipv6Address = parseIpv6Address(e);
  if (ipv6Address === undefined) return false;
  let s =
    ipv6Address.slice(0, 10).every((c) => c === 0) && ipv6Address[10] === 255 && ipv6Address[11] === 255;
  let a = isNat64Prefix(ipv6Address) && ipv6Address.slice(4, 12).every((c) => c === 0);
  return s || a || isIpv4MappedLoopback(ipv6Address);
}
//@ chunk-dcmhvw5a.js:25465-25772 placement
/**
 * 提取 IPv6 中内嵌的 IPv4。
 */
function embeddedIpv4(ipv6Address) {
  let n = [];
  if (ipv6Address[0] === 32 && ipv6Address[1] === 2) n.push(ipv6Address.slice(2, 6));
  let all = ipv6Address.slice(0, 10).every((m) => m === 0);
  let s = all && ipv6Address[10] === 255 && ipv6Address[11] === 255;
  let a = all && ipv6Address[10] === 0 && ipv6Address[11] === 0;
  let c = isNat64Prefix(ipv6Address) && ipv6Address.slice(4, 12).every((m) => m === 0);
  let g =
    (ipv6Address[8] === 0 || ipv6Address[8] === 2) &&
    ipv6Address[9] === 0 &&
    ipv6Address[10] === 94 &&
    ipv6Address[11] === 254;
  if (s || a || c || g) n.push(ipv6Address.slice(12, 16));
  return n;
}
//@ chunk-dcmhvw5a.js:25772-26470 placement
/**
 * 主机是否为本地/内网/元数据地址。
 */
function isPrivateHost(e) {
  let replaced = e.toLowerCase().replace(/^\[|\]$/g, "");
  if (replaced.endsWith(".")) replaced = replaced.slice(0, -1);
  if (replaced === "" || replaced === "localhost" || replaced.endsWith(".localhost")) return true;
  if (METADATA_HOSTNAMES.has(replaced)) return true;
  if (replaced.startsWith("instance-data.") && replaced.endsWith(".compute.internal")) return true;
  if (isIPv4(replaced)) {
    if (METADATA_IPS.has(replaced)) return true;
    let [s = 0, a = 0, c = 0, g = 0] = replaced.split(".").map(Number);
    return isLoopbackOrLinkLocalV4(s, a, c, g);
  }
  if (!isIPv6(replaced)) return false;
  let ipv6Address = parseIpv6Address(replaced);
  if (ipv6Address === undefined) return true;
  if (isIpv4MappedLoopback(ipv6Address)) return true;
  if (ipv6Address.every((s) => s === 0)) return true;
  if (ipv6Address.slice(0, 15).every((s) => s === 0) && ipv6Address[15] === 1) return true;
  if (replaced === "fd00:ec2::254") return true;
  if (ipv6Address[0] === 254 && (ipv6Address[1] ?? 0) >= 128 && (ipv6Address[1] ?? 0) <= 191) return true;
  return embeddedIpv4(ipv6Address).some((s) => {
    let [a = 0, c = 0, g = 0, m = 0] = s;
    return isLoopbackOrLinkLocalV4(a, c, g, m) || METADATA_IPS.has(`${a}.${c}.${g}.${m}`);
  });
}
//@ chunk-dcmhvw5a.js:26470-26694 placement
/**
 * 从请求选项还原 URL。
 */
function urlFromRequestOptions(e) {
  if (e.href) return e.href;
  let n =
    e.host ??
    (e.hostname &&
      (e.hostname.includes(":") && !e.hostname.startsWith("[") ? `[${e.hostname}]` : e.hostname) +
        (e.port ? `:${e.port}` : ""));
  return e.protocol && n ? `${e.protocol}//${n}` : "";
}
//@ chunk-dcmhvw5a.js:26694-26800 placement
/**
 * 两个 URL 是否同源。
 */
function sameOrigin(e, n) {
  try {
    let origin = new URL(e).origin;
    let origin_2 = new URL(n).origin;
    return origin !== "null" && origin === origin_2;
  } catch {
    return false;
  }
}
export { sameOrigin, urlFromRequestOptions, isPrivateHost, isIpv4MappedOrTranslatedIpv6 };

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

/**
 * 云元数据等内部主机名。
 */
//@ chunk-dcmhvw5a.js:24123-24435 placement
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
  ]),
  _a = new Set(["100.100.100.200", "168.63.129.16", "192.0.0.192"]);
//@ chunk-dcmhvw5a.js:24435-24496 placement
function ya(e, n, r, s) {
  return e === 127 || (e === 169 && n === 254) || e === 0;
}
/**
 * 解析 IPv6 地址。
 */
//@ chunk-dcmhvw5a.js:24496-25156 placement
function parseIpv6Address(e) {
  let index = e.indexOf("%"),
    parts = (index >= 0 ? e.slice(0, index) : e).toLowerCase().split("::");
  if (parts.length > 2) return;
  let a = parts[0] ? parts[0].split(":") : [],
    c = parts.length === 2 && parts[1] ? parts[1].split(":") : [],
    g = parts.length === 2 ? c : a,
    m = [],
    at = g.at(-1);
  if (at !== void 0 && at.includes(".")) {
    let mapped = at.split(".").map(Number);
    if (mapped.length !== 4 || mapped.some((w) => !Number.isInteger(w) || w < 0 || w > 255)) return;
    ((m = mapped), g.pop());
  }
  let h = (C) => {
      let w = [];
      for (let L of C) {
        if (!/^[0-9a-f]{1,4}$/.test(L)) return;
        let v = parseInt(L, 16);
        w.push(v >> 8, v & 255);
      }
      return w;
    },
    y = h(parts.length === 2 ? a : []),
    b = h(g);
  if (y === void 0 || b === void 0) return;
  let S = y.length + b.length + m.length;
  if (S > 16 || (parts.length === 1 && S !== 16)) return;
  return [...y, ...Array(16 - S).fill(0), ...b, ...m];
}
//@ chunk-dcmhvw5a.js:25156-25204 placement
function Ca(e) {
  return Qo(e) && e[4] === 0 && e[5] === 1;
}
//@ chunk-dcmhvw5a.js:25204-25271 placement
function Qo(e) {
  return e[0] === 0 && e[1] === 100 && e[2] === 255 && e[3] === 155;
}
//@ chunk-dcmhvw5a.js:25271-25465 placement
function isIpv4MappedOrTranslatedIpv6(e) {
  if (!isIPv6(e)) return !1;
  let n = parseIpv6Address(e);
  if (n === void 0) return !1;
  let s = n.slice(0, 10).every((c) => c === 0) && n[10] === 255 && n[11] === 255,
    a = Qo(n) && n.slice(4, 12).every((c) => c === 0);
  return s || a || Ca(n);
}
/**
 * 提取 IPv6 中内嵌的 IPv4。
 */
//@ chunk-dcmhvw5a.js:25465-25772 placement
function embeddedIpv4(e) {
  let n = [];
  if (e[0] === 32 && e[1] === 2) n.push(e.slice(2, 6));
  let all = e.slice(0, 10).every((m) => m === 0),
    s = all && e[10] === 255 && e[11] === 255,
    a = all && e[10] === 0 && e[11] === 0,
    c = Qo(e) && e.slice(4, 12).every((m) => m === 0),
    g = (e[8] === 0 || e[8] === 2) && e[9] === 0 && e[10] === 94 && e[11] === 254;
  if (s || a || c || g) n.push(e.slice(12, 16));
  return n;
}
/**
 * 主机是否为本地/内网/元数据地址。
 */
//@ chunk-dcmhvw5a.js:25772-26470 placement
function isPrivateHost(e) {
  let replaced = e.toLowerCase().replace(/^\[|\]$/g, "");
  if (replaced.endsWith(".")) replaced = replaced.slice(0, -1);
  if (replaced === "" || replaced === "localhost" || replaced.endsWith(".localhost")) return !0;
  if (METADATA_HOSTNAMES.has(replaced)) return !0;
  if (replaced.startsWith("instance-data.") && replaced.endsWith(".compute.internal")) return !0;
  if (isIPv4(replaced)) {
    if (_a.has(replaced)) return !0;
    let [s = 0, a = 0, c = 0, g = 0] = replaced.split(".").map(Number);
    return ya(s, a, c, g);
  }
  if (!isIPv6(replaced)) return !1;
  let r = parseIpv6Address(replaced);
  if (r === void 0) return !0;
  if (Ca(r)) return !0;
  if (r.every((s) => s === 0)) return !0;
  if (r.slice(0, 15).every((s) => s === 0) && r[15] === 1) return !0;
  if (replaced === "fd00:ec2::254") return !0;
  if (r[0] === 254 && (r[1] ?? 0) >= 128 && (r[1] ?? 0) <= 191) return !0;
  return embeddedIpv4(r).some((s) => {
    let [a = 0, c = 0, g = 0, m = 0] = s;
    return ya(a, c, g, m) || _a.has(`${a}.${c}.${g}.${m}`);
  });
}
/**
 * 从请求选项还原 URL。
 */
//@ chunk-dcmhvw5a.js:26470-26694 placement
function urlFromRequestOptions(e) {
  if (e.href) return e.href;
  let n =
    e.host ??
    (e.hostname &&
      (e.hostname.includes(":") && !e.hostname.startsWith("[") ? `[${e.hostname}]` : e.hostname) +
        (e.port ? `:${e.port}` : ""));
  return e.protocol && n ? `${e.protocol}//${n}` : "";
}
/**
 * 两个 URL 是否同源。
 */
//@ chunk-dcmhvw5a.js:26694-26800 placement
function sameOrigin(e, n) {
  try {
    let origin = new URL(e).origin,
      origin_2 = new URL(n).origin;
    return origin !== "null" && origin === origin_2;
  } catch {
    return !1;
  }
}

export { sameOrigin, urlFromRequestOptions, isPrivateHost, isIpv4MappedOrTranslatedIpv6 };

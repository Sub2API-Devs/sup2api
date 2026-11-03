/**
 * utils/hooks/ssrfGuard.ts
 *
 * HTTP 钩子的 SSRF 防护：私有/链路本地地址判定与带检查的 DNS lookup。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/ssrfGuard.ts
 * pieces: chunk-e6aww6q8.js (13), chunk-tp07j3pd.js (5)
 * attribution: placement 11, callgraph-witnessed 1, layout 2, fingerprint 4
 */
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
  randomBytes as randomBytes_6,
  randomBytes as randomBytes_7,
  randomBytes as randomBytes_8,
  randomBytes as randomBytes_9,
  randomBytes as randomBytes_10,
  randomBytes as randomBytes_11,
  randomBytes as randomBytes_12,
  randomBytes as randomBytes_13,
  randomBytes as randomBytes_14,
} from "crypto";
import { isIP, isIP as isIP_2 } from "net";
import { lookup } from "dns";
import { matchRuleSegments, matchWildcard } from "../permissions/permissionRuleParser.js";
import { firstLineOf } from "../stringUtils.js";
import { sanitizeDisplayText, tailLines } from "../resultError.js";

//@ chunk-e6aww6q8.js:3401980-3402131 placement
var WILDCARD_PLACEHOLDER = `zzwildcard${randomBytes_8(8).toString("hex")}zz`,
  PUNYCODE_PLACEHOLDER = `zzpunycode${randomBytes_8(8).toString("hex")}zz`,
  URL_PROTOCOLS_WITH_HOST = new Set(["http:", "https:", "ws:", "wss:", "ftp:", "file:"]);
/**
 * 解析主机模式（支持通配符和端口），无法解析时返回 null。
 */
//@ chunk-e6aww6q8.js:3402131-3402571 placement
function parseHostPattern(e, n) {
  let r = markPunycodeLabels(e.replaceAll("*", WILDCARD_PLACEHOLDER), n),
    s;
  try {
    s = new URL(r);
  } catch {
    let replaced = r.replace(new RegExp(`:(?:${WILDCARD_PLACEHOLDER}${n ? `|${n}` : ""})(?=[/?#]|$)`), ":0");
    if (replaced === r) return null;
    try {
      s = new URL(replaced);
    } catch {
      return null;
    }
  }
  if (hasWildcardPunycodeLabel(s, n)) return null;
  let h = (y) => ynt(y).replaceAll(WILDCARD_PLACEHOLDER, "*");
  return {
    protocol: h(s.protocol),
    hostname: h(s.hostname),
    username: h(s.username),
    password: h(s.password),
    port: h(s.port),
    pathname: h(s.pathname),
    search: h(s.search),
    hash: h(s.hash),
  };
}
//@ chunk-e6aww6q8.js:3402571-3403333 placement
function buildHostPatternRegex(e, n) {
  if (n === "*") return !0;
  let r;
  try {
    r = new URL(e);
  } catch {
    return !1;
  }
  let s = markPunycodeLabels(n.replaceAll("*", WILDCARD_PLACEHOLDER)),
    h = !1,
    y;
  try {
    y = new URL(s);
  } catch {
    let replaced = s.replace(new RegExp(`:${WILDCARD_PLACEHOLDER}(?=[/?#]|$)`), ":0");
    if (replaced !== s)
      try {
        ((y = new URL(replaced)), (h = !0));
      } catch {}
  }
  if (!y || hasWildcardPunycodeLabel(y)) {
    let q = `${r.protocol}//${r.host}${r.pathname}${r.search}`;
    return matchRuleSegments(n, q, "/");
  }
  if (y.protocol !== `${WILDCARD_PLACEHOLDER}:` && y.protocol !== r.protocol) return !1;
  let lower = r.hostname.replace(/\.$/, "").toLowerCase(),
    replaced = ynt(y.hostname).replace(/\.$/, "").toLowerCase().replaceAll(WILDCARD_PLACEHOLDER, "*");
  if (!matchWildcard(replaced, lower)) return !1;
  if (y.port === "" && y.hostname.includes(WILDCARD_PLACEHOLDER)) h = !0;
  if (!h && y.port !== r.port) return !1;
  if ((y.pathname === "/" || y.pathname === "") && y.search === "" && !s.endsWith("/")) return !0;
  let replaced_2 = ynt(y.pathname + y.search).replaceAll(WILDCARD_PLACEHOLDER, "*");
  return matchWildcard(replaced_2, r.pathname + r.search);
}
//@ chunk-e6aww6q8.js:3403333-3403450 placement
function markPunycodeLabels(e, n) {
  return e.replace(/[a-z0-9-]+/gi, (r) =>
    /^xn--/i.test(r) && (r.includes(WILDCARD_PLACEHOLDER) || (n && r.includes(n)))
      ? PUNYCODE_PLACEHOLDER + r
      : r,
  );
}
//@ chunk-e6aww6q8.js:3403450-3403494 placement
function ynt(e) {
  return e.replaceAll(PUNYCODE_PLACEHOLDER, "");
}
//@ chunk-e6aww6q8.js:3403494-3403630 placement
function hasWildcardPunycodeLabel(e, n) {
  return (
    URL_PROTOCOLS_WITH_HOST.has(e.protocol) &&
    e.hostname
      .split(".")
      .some((r) => r.startsWith("xn--") && (r.includes(WILDCARD_PLACEHOLDER) || (n && r.includes(n))))
  );
}
/**
 * 判断 IP 是否属于 HTTP 钩子禁止访问的私有/链路本地地址（回环 127.0.0.1、::1 允许）。
 */
//@ chunk-e6aww6q8.js:3403690-3403774 callgraph-witnessed = isBlockedAddress (0)
function isBlockedAddress(address) {
  let n = isIP_2(address);
  if (n === 4) return isBlockedV4(address);
  if (n === 6) return isBlockedV6(address);
  return !1;
}
//@ chunk-e6aww6q8.js:3403774-3404101 layout
function isBlockedV4(e) {
  let mapped = e.split(".").map(Number),
    [r, s] = mapped;
  if (mapped.length !== 4 || r === void 0 || s === void 0 || mapped.some((h) => Number.isNaN(h))) return !1;
  if (r === 127) return !1;
  if (r === 0) return !0;
  if (r === 10) return !0;
  if (r === 169 && s === 254) return !0;
  if (r === 172 && s >= 16 && s <= 31) return !0;
  if (r === 100 && s >= 64 && s <= 127) return !0;
  if (r === 192 && s === 168) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:3404101-3404347 fingerprint = isBlockedV6 (1)
function isBlockedV6(address) {
  let lower = address.toLowerCase();
  if (lower === "::1") return !1;
  if (lower === "::") return !0;
  let mappedV4 = extractMappedIPv4(lower);
  if (mappedV4 !== null) return isBlockedV4(mappedV4);
  if (lower.startsWith("fc") || lower.startsWith("fd")) return !0;
  let s = firstLineOf(lower, ":");
  if (s && s.length === 4 && s >= "fe80" && s <= "febf") return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:3404347-3404949 fingerprint = expandIPv6Groups (1)
function expandIPv6Groups(addr) {
  let tailHextets = [];
  if (addr.includes(".")) {
    let lastColon = addr.lastIndexOf(":"),
      v4 = addr.slice(lastColon + 1);
    addr = addr.slice(0, lastColon);
    let octets = v4.split(".").map(Number);
    if (octets.length !== 4 || octets.some((Se) => !Number.isInteger(Se) || Se < 0 || Se > 255)) return null;
    tailHextets = [(octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]];
  }
  let dbl = addr.indexOf("::"),
    s,
    h;
  if (dbl === -1) ((s = addr.split(":")), (h = []));
  else {
    let headStr = addr.slice(0, dbl),
      tailStr = addr.slice(dbl + 2);
    ((s = headStr === "" ? [] : headStr.split(":")), (h = tailStr === "" ? [] : tailStr.split(":")));
  }
  let S = 8 - tailHextets.length - s.length - h.length;
  if (S < 0) return null;
  let nums = [...s, ...Array(S).fill("0"), ...h].map((G) => parseInt(G, 16));
  if (nums.some((G) => Number.isNaN(G) || G < 0 || G > 65535)) return null;
  return (nums.push(...tailHextets), nums.length === 8 ? nums : null);
}
//@ chunk-e6aww6q8.js:3404949-3405135 layout
function extractMappedIPv4(e) {
  let n = expandIPv6Groups(e);
  if (!n) return null;
  if (n[0] === 0 && n[1] === 0 && n[2] === 0 && n[3] === 0 && n[4] === 0 && n[5] === 65535) {
    let r = n[6],
      s = n[7];
    return `${r >> 8}.${r & 255}.${s >> 8}.${s & 255}`;
  }
  return null;
}
/**
 * HTTP 钩子的 DNS lookup：解析出的任一地址被禁止就报 ERR_HTTP_HOOK_BLOCKED_ADDRESS。
 */
//@ chunk-e6aww6q8.js:3405135-3405632 fingerprint = ssrfGuardedLookup (1)
function ssrfGuardedLookup(hostname, options, callback) {
  let wantsAll = "all" in options && options.all === !0,
    ipVersion = isIP_2(hostname);
  if (ipVersion !== 0) {
    if (isBlockedAddress(hostname)) {
      callback(ssrfError(hostname, hostname), "");
      return;
    }
    let y = ipVersion === 6 ? 6 : 4;
    if (wantsAll) callback(null, [{ address: hostname, family: y }]);
    else callback(null, hostname, y);
    return;
  }
  lookup(hostname, { all: !0 }, (err, addresses) => {
    if (err) {
      callback(err, "");
      return;
    }
    for (let { address: address } of addresses)
      if (isBlockedAddress(address)) {
        callback(ssrfError(hostname, address), "");
        return;
      }
    let first = addresses[0];
    if (!first) {
      callback(Object.assign(Error(`ENOTFOUND ${hostname}`), { code: "ENOTFOUND", hostname: hostname }), "");
      return;
    }
    let L = first.family === 6 ? 6 : 4;
    if (wantsAll)
      callback(
        null,
        addresses.map((G) => ({ address: G.address, family: G.family === 6 ? 6 : 4 })),
      );
    else callback(null, first.address, L);
  });
}
//@ chunk-e6aww6q8.js:3405632-3405872 fingerprint = ssrfError (1)
function ssrfError(hostname, address) {
  let r = Error(
    `HTTP hook blocked: ${hostname} resolves to ${address} (private/link-local address). Loopback (127.0.0.1, ::1) is allowed for local dev.`,
  );
  return Object.assign(r, { code: "ERR_HTTP_HOOK_BLOCKED_ADDRESS", hostname: hostname, address: address });
}
//@ chunk-tp07j3pd.js:376-449 placement
function M(e) {
  return typeof e === "string" ? sanitizeDisplayText(e, { maxCodeUnits: 512 }) : void 0;
}
//@ chunk-tp07j3pd.js:449-494 placement
function y(e) {
  return sanitizeDisplayText(e, { maxCodeUnits: 64 });
}
//@ chunk-tp07j3pd.js:494-525 placement
var _ = 32,
  k = 1000,
  B = 86400000,
  L = 5;
//@ chunk-tp07j3pd.js:525-613 placement
function S(e) {
  if (typeof e !== "string") return;
  let t = tailLines(e, L);
  return t.length === 0 ? void 0 : t;
}
//@ chunk-tp07j3pd.js:613-758 placement
function parseSafeInteger(e) {
  if (typeof e === "number") return Number.isSafeInteger(e) ? e : void 0;
  return typeof e === "string" && /^-?\d{1,15}$/.test(e) ? Number(e) : void 0;
}

export {
  parseHostPattern,
  buildHostPatternRegex,
  isBlockedAddress,
  ssrfGuardedLookup,
  y,
  parseSafeInteger,
  k,
  B,
  _,
  M,
  S,
};

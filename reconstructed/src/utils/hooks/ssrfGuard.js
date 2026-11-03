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
import { randomBytes } from "crypto";
import { isIP } from "net";
import { lookup } from "dns";
import { matchRuleSegments, matchWildcard } from "../permissions/permissionRuleParser.js";
import { firstLineOf } from "../stringUtils.js";
import { sanitizeDisplayText, tailLines } from "../resultError.js";

//@ chunk-e6aww6q8.js:3401980-3402131 placement
var WILDCARD_PLACEHOLDER = `zzwildcard${randomBytes(8).toString("hex")}zz`;
var PUNYCODE_PLACEHOLDER = `zzpunycode${randomBytes(8).toString("hex")}zz`;
var URL_PROTOCOLS_WITH_HOST = new Set(["http:", "https:", "ws:", "wss:", "ftp:", "file:"]);
//@ chunk-e6aww6q8.js:3402131-3402571 placement
/**
 * 解析主机模式（支持通配符和端口），无法解析时返回 null。
 */
function parseHostPattern(expanded, n) {
  let r = markPunycodeLabels(expanded.replaceAll("*", WILDCARD_PLACEHOLDER), n);
  let s;
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
  let h = (y) => stripPunycodePlaceholder(y).replaceAll(WILDCARD_PLACEHOLDER, "*");
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
  if (n === "*") return true;
  let r;
  try {
    r = new URL(e);
  } catch {
    return false;
  }
  let s = markPunycodeLabels(n.replaceAll("*", WILDCARD_PLACEHOLDER));
  let h = false;
  let y;
  try {
    y = new URL(s);
  } catch {
    let replaced = s.replace(new RegExp(`:${WILDCARD_PLACEHOLDER}(?=[/?#]|$)`), ":0");
    if (replaced !== s)
      try {
        y = new URL(replaced);
        h = true;
      } catch {}
  }
  if (!y || hasWildcardPunycodeLabel(y)) {
    let q = `${r.protocol}//${r.host}${r.pathname}${r.search}`;
    return matchRuleSegments(n, q, "/");
  }
  if (y.protocol !== `${WILDCARD_PLACEHOLDER}:` && y.protocol !== r.protocol) return false;
  let lower = r.hostname.replace(/\.$/, "").toLowerCase();
  let replaced = stripPunycodePlaceholder(y.hostname)
    .replace(/\.$/, "")
    .toLowerCase()
    .replaceAll(WILDCARD_PLACEHOLDER, "*");
  if (!matchWildcard(replaced, lower)) return false;
  if (y.port === "" && y.hostname.includes(WILDCARD_PLACEHOLDER)) h = true;
  if (!h && y.port !== r.port) return false;
  if ((y.pathname === "/" || y.pathname === "") && y.search === "" && !s.endsWith("/")) return true;
  let replaced_2 = stripPunycodePlaceholder(y.pathname + y.search).replaceAll(WILDCARD_PLACEHOLDER, "*");
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
function stripPunycodePlaceholder(e) {
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
//@ chunk-e6aww6q8.js:3403690-3403774 callgraph-witnessed = isBlockedAddress (0)
/**
 * 判断 IP 是否属于 HTTP 钩子禁止访问的私有/链路本地地址（回环 127.0.0.1、::1 允许）。
 */
function isBlockedAddress(address) {
  let v = isIP(address);
  if (v === 4) return isBlockedV4(address);
  if (v === 6) return isBlockedV6(address);
  return false;
}
//@ chunk-e6aww6q8.js:3403774-3404101 layout
function isBlockedV4(address) {
  let parts = address.split(".").map(Number);
  let [r, s] = parts;
  if (parts.length !== 4 || r === undefined || s === undefined || parts.some((n) => Number.isNaN(n)))
    return false;
  if (r === 127) return false;
  if (r === 0) return true;
  if (r === 10) return true;
  if (r === 169 && s === 254) return true;
  if (r === 172 && s >= 16 && s <= 31) return true;
  if (r === 100 && s >= 64 && s <= 127) return true;
  if (r === 192 && s === 168) return true;
  return false;
}
//@ chunk-e6aww6q8.js:3404101-3404347 fingerprint = isBlockedV6 (1)
function isBlockedV6(address) {
  let lower = address.toLowerCase();
  if (lower === "::1") return false;
  if (lower === "::") return true;
  let mappedV4 = extractMappedIPv4(lower);
  if (mappedV4 !== null) return isBlockedV4(mappedV4);
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  let firstHextet = firstLineOf(lower, ":");
  if (firstHextet && firstHextet.length === 4 && firstHextet >= "fe80" && firstHextet <= "febf") return true;
  return false;
}
//@ chunk-e6aww6q8.js:3404347-3404949 fingerprint = expandIPv6Groups (1)
function expandIPv6Groups(addr) {
  let tailHextets = [];
  if (addr.includes(".")) {
    let lastColon = addr.lastIndexOf(":");
    let v4 = addr.slice(lastColon + 1);
    addr = addr.slice(0, lastColon);
    let octets = v4.split(".").map(Number);
    if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    tailHextets = [(octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]];
  }
  let dbl = addr.indexOf("::");
  let head;
  let tail;
  if (dbl === -1) {
    head = addr.split(":");
    tail = [];
  } else {
    let headStr = addr.slice(0, dbl);
    let tailStr = addr.slice(dbl + 2);
    head = headStr === "" ? [] : headStr.split(":");
    tail = tailStr === "" ? [] : tailStr.split(":");
  }
  let S = 8 - tailHextets.length - head.length - tail.length;
  if (S < 0) return null;
  let nums = [...head, ...Array(S).fill("0"), ...tail].map((G) => parseInt(G, 16));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 65535)) return null;
  nums.push(...tailHextets);
  return nums.length === 8 ? nums : null;
}
//@ chunk-e6aww6q8.js:3404949-3405135 layout
function extractMappedIPv4(addr) {
  let n = expandIPv6Groups(addr);
  if (!n) return null;
  if (n[0] === 0 && n[1] === 0 && n[2] === 0 && n[3] === 0 && n[4] === 0 && n[5] === 65535) {
    let hi = n[6];
    let lo = n[7];
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
}
//@ chunk-e6aww6q8.js:3405135-3405632 fingerprint = ssrfGuardedLookup (1)
/**
 * HTTP 钩子的 DNS lookup：解析出的任一地址被禁止就报 ERR_HTTP_HOOK_BLOCKED_ADDRESS。
 */
function ssrfGuardedLookup(hostname, options, callback) {
  let wantsAll = "all" in options && options.all === true;
  let ipVersion = isIP(hostname);
  if (ipVersion !== 0) {
    if (isBlockedAddress(hostname)) {
      callback(ssrfError(hostname, hostname), "");
      return;
    }
    let family = ipVersion === 6 ? 6 : 4;
    if (wantsAll)
      callback(null, [
        {
          address: hostname,
          family,
        },
      ]);
    else callback(null, hostname, family);
    return;
  }
  lookup(
    hostname,
    {
      all: true,
    },
    (err, addresses) => {
      if (err) {
        callback(err, "");
        return;
      }
      for (let { address } of addresses)
        if (isBlockedAddress(address)) {
          callback(ssrfError(hostname, address), "");
          return;
        }
      let first = addresses[0];
      if (!first) {
        callback(
          Object.assign(Error(`ENOTFOUND ${hostname}`), {
            code: "ENOTFOUND",
            hostname,
          }),
          "",
        );
        return;
      }
      let family = first.family === 6 ? 6 : 4;
      if (wantsAll)
        callback(
          null,
          addresses.map((address) => ({
            address: address.address,
            family: address.family === 6 ? 6 : 4,
          })),
        );
      else callback(null, first.address, family);
    },
  );
}
//@ chunk-e6aww6q8.js:3405632-3405872 fingerprint = ssrfError (1)
function ssrfError(hostname, address) {
  let err = Error(
    `HTTP hook blocked: ${hostname} resolves to ${address} (private/link-local address). Loopback (127.0.0.1, ::1) is allowed for local dev.`,
  );
  return Object.assign(err, {
    code: "ERR_HTTP_HOOK_BLOCKED_ADDRESS",
    hostname,
    address,
  });
}
//@ chunk-tp07j3pd.js:376-449 placement
/**
 * 清洗主机相关展示文本（上限 512）。
 */
function sanitizeHostText(e) {
  return typeof e === "string"
    ? sanitizeDisplayText(e, {
        maxCodeUnits: 512,
      })
    : undefined;
}
//@ chunk-tp07j3pd.js:449-494 placement
/**
 * 清洗短主机文本（上限 64）。
 */
function sanitizeShortHostText(stepId) {
  return sanitizeDisplayText(stepId, {
    maxCodeUnits: 64,
  });
}
//@ chunk-tp07j3pd.js:494-525 placement
/**
 * DNS 结果缓存与解析限制常量（标签数、TTL 等）。
 */
var MAX_EXPECTED_STEPS = 32;
var DNS_ERROR_CACHE_MS = 1000;
var DNS_POSITIVE_CACHE_MS = 86400000;
var MAX_DNS_TAIL_LINES = 5;
//@ chunk-tp07j3pd.js:525-613 placement
/**
 * 取 DNS 响应文本的最后若干行（失败返回 undefined）。
 */
function tailOfDnsResponse(output) {
  if (typeof output !== "string") return;
  let t = tailLines(output, MAX_DNS_TAIL_LINES);
  return t.length === 0 ? undefined : t;
}
//@ chunk-tp07j3pd.js:613-758 placement
function parseSafeInteger(e) {
  if (typeof e === "number") return Number.isSafeInteger(e) ? e : undefined;
  return typeof e === "string" && /^-?\d{1,15}$/.test(e) ? Number(e) : undefined;
}
export {
  parseHostPattern,
  buildHostPatternRegex,
  isBlockedAddress,
  ssrfGuardedLookup,
  sanitizeShortHostText,
  parseSafeInteger,
  DNS_ERROR_CACHE_MS,
  DNS_POSITIVE_CACHE_MS,
  MAX_EXPECTED_STEPS,
  sanitizeHostText,
  tailOfDnsResponse,
};

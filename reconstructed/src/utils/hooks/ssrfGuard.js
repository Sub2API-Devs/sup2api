/**
 * utils/hooks/ssrfGuard.ts
 *
 * HTTP 钩子的 SSRF 防护：私有/链路本地地址判定与带检查的 DNS lookup。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/ssrfGuard.ts
 * pieces: chunk-e6aww6q8.js (13)
 * attribution: placement 6, callgraph-witnessed 1, layout 2, fingerprint 4
 */
import { randomBytes } from "crypto";
import { isIP } from "net";
import { lookup } from "dns";
import { matchRuleSegments, matchWildcard } from "../permissions/permissionRuleParser.js";
import { firstLineOf } from "../stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3401980-3402131 placement
var WILDCARD_PLACEHOLDER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PUNYCODE_PLACEHOLDER;
var URL_PROTOCOLS_WITH_HOST;
deferInit("chunk-e6aww6q8.js:3401980", () => {
  WILDCARD_PLACEHOLDER = `zzwildcard${randomBytes(8).toString("hex")}zz`;
  PUNYCODE_PLACEHOLDER = `zzpunycode${randomBytes(8).toString("hex")}zz`;
  URL_PROTOCOLS_WITH_HOST = new Set(["http:", "https:", "ws:", "wss:", "ftp:", "file:"]);
});
//@ chunk-e6aww6q8.js:3402131-3402571 placement
/**
 * 解析主机模式（支持通配符和端口），无法解析时返回 null。
 */
function parseHostPattern(expanded, portPlaceholder) {
  let marked = markPunycodeLabels(expanded.replaceAll("*", WILDCARD_PLACEHOLDER), portPlaceholder);
  let parsedUrl;
  try {
    parsedUrl = new URL(marked);
  } catch {
    let replaced = marked.replace(
      new RegExp(`:(?:${WILDCARD_PLACEHOLDER}${portPlaceholder ? `|${portPlaceholder}` : ""})(?=[/?#]|$)`),
      ":0",
    );
    if (replaced === marked) return null;
    try {
      parsedUrl = new URL(replaced);
    } catch {
      return null;
    }
  }
  if (hasWildcardPunycodeLabel(parsedUrl, portPlaceholder)) return null;
  let unmark = (text) => stripPunycodePlaceholder(text).replaceAll(WILDCARD_PLACEHOLDER, "*");
  return {
    protocol: unmark(parsedUrl.protocol),
    hostname: unmark(parsedUrl.hostname),
    username: unmark(parsedUrl.username),
    password: unmark(parsedUrl.password),
    port: unmark(parsedUrl.port),
    pathname: unmark(parsedUrl.pathname),
    search: unmark(parsedUrl.search),
    hash: unmark(parsedUrl.hash),
  };
}
//@ chunk-e6aww6q8.js:3402571-3403333 placement
function buildHostPatternRegex(url, pattern) {
  if (pattern === "*") return true;
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return false;
  }
  let markedPattern = markPunycodeLabels(pattern.replaceAll("*", WILDCARD_PLACEHOLDER));
  let portWildcard = false;
  let parsedPattern;
  try {
    parsedPattern = new URL(markedPattern);
  } catch {
    let replaced = markedPattern.replace(new RegExp(`:${WILDCARD_PLACEHOLDER}(?=[/?#]|$)`), ":0");
    if (replaced !== markedPattern)
      try {
        parsedPattern = new URL(replaced);
        portWildcard = true;
      } catch {}
  }
  if (!parsedPattern || hasWildcardPunycodeLabel(parsedPattern)) {
    let urlWithoutHash = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}`;
    return matchRuleSegments(pattern, urlWithoutHash, "/");
  }
  if (parsedPattern.protocol !== `${WILDCARD_PLACEHOLDER}:` && parsedPattern.protocol !== parsedUrl.protocol)
    return false;
  let lower = parsedUrl.hostname.replace(/\.$/, "").toLowerCase();
  let replaced = stripPunycodePlaceholder(parsedPattern.hostname)
    .replace(/\.$/, "")
    .toLowerCase()
    .replaceAll(WILDCARD_PLACEHOLDER, "*");
  if (!matchWildcard(replaced, lower)) return false;
  if (parsedPattern.port === "" && parsedPattern.hostname.includes(WILDCARD_PLACEHOLDER)) portWildcard = true;
  if (!portWildcard && parsedPattern.port !== parsedUrl.port) return false;
  if (
    (parsedPattern.pathname === "/" || parsedPattern.pathname === "") &&
    parsedPattern.search === "" &&
    !markedPattern.endsWith("/")
  )
    return true;
  let replaced_2 = stripPunycodePlaceholder(parsedPattern.pathname + parsedPattern.search).replaceAll(
    WILDCARD_PLACEHOLDER,
    "*",
  );
  return matchWildcard(replaced_2, parsedUrl.pathname + parsedUrl.search);
}
//@ chunk-e6aww6q8.js:3403333-3403450 placement
function markPunycodeLabels(hostText, portPlaceholder) {
  return hostText.replace(/[a-z0-9-]+/gi, (label) =>
    /^xn--/i.test(label) &&
    (label.includes(WILDCARD_PLACEHOLDER) || (portPlaceholder && label.includes(portPlaceholder)))
      ? PUNYCODE_PLACEHOLDER + label
      : label,
  );
}
//@ chunk-e6aww6q8.js:3403450-3403494 placement
function stripPunycodePlaceholder(text) {
  return text.replaceAll(PUNYCODE_PLACEHOLDER, "");
}
//@ chunk-e6aww6q8.js:3403494-3403630 placement
function hasWildcardPunycodeLabel(parsedUrl, portPlaceholder) {
  return (
    URL_PROTOCOLS_WITH_HOST.has(parsedUrl.protocol) &&
    parsedUrl.hostname
      .split(".")
      .some(
        (label) =>
          label.startsWith("xn--") &&
          (label.includes(WILDCARD_PLACEHOLDER) || (portPlaceholder && label.includes(portPlaceholder))),
      )
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
  let [firstOctet, secondOctet] = parts;
  if (
    parts.length !== 4 ||
    firstOctet === undefined ||
    secondOctet === undefined ||
    parts.some((n) => Number.isNaN(n))
  )
    return false;
  if (firstOctet === 127) return false;
  if (firstOctet === 0) return true;
  if (firstOctet === 10) return true;
  if (firstOctet === 169 && secondOctet === 254) return true;
  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) return true;
  if (firstOctet === 100 && secondOctet >= 64 && secondOctet <= 127) return true;
  if (firstOctet === 192 && secondOctet === 168) return true;
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
  let fillCount = 8 - tailHextets.length - head.length - tail.length;
  if (fillCount < 0) return null;
  let nums = [...head, ...Array(fillCount).fill("0"), ...tail].map((hextet) => parseInt(hextet, 16));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 65535)) return null;
  nums.push(...tailHextets);
  return nums.length === 8 ? nums : null;
}
//@ chunk-e6aww6q8.js:3404949-3405135 layout
function extractMappedIPv4(addr) {
  let groups = expandIPv6Groups(addr);
  if (!groups) return null;
  if (
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 65535
  ) {
    let hi = groups[6];
    let lo = groups[7];
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
export { parseHostPattern, buildHostPatternRegex, isBlockedAddress, ssrfGuardedLookup };

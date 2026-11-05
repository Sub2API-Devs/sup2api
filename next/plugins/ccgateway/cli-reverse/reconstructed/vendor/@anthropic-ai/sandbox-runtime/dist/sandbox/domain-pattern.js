/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/domain-pattern.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-70ac3q96.js (13)
 * attribution: esm-fingerprint 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isIP } from "net";
import { canonicalizeHost, stripBrackets } from "./parent-proxy.js";

//@ chunk-70ac3q96.js:7450-7514 esm-fingerprint
function dropZone(host) {
  let pct = host.indexOf("%");
  return pct === -1 ? host : host.slice(0, pct);
}
//@ chunk-70ac3q96.js:7514-8073 esm-fingerprint
function splitDomainPatternPort(pattern) {
  if (pattern.startsWith("[")) {
    let close = pattern.indexOf("]");
    if (close === -1)
      return {
        hostPattern: pattern,
        port: undefined,
      };
    let inner = dropZone(pattern.slice(1, close));
    let host = canonicalizeHost(inner) ?? inner;
    let rest = pattern.slice(close + 1);
    if (rest === "")
      return {
        hostPattern: host,
        port: undefined,
      };
    let port = parsePortSuffix(rest.startsWith(":") ? rest.slice(1) : "");
    return port === undefined
      ? {
          hostPattern: pattern,
          port: undefined,
        }
      : {
          hostPattern: host,
          port,
        };
  }
  let idx = pattern.lastIndexOf(":");
  if (idx === -1)
    return {
      hostPattern: pattern,
      port: undefined,
    };
  if (pattern.indexOf(":") !== idx) {
    let host = dropZone(pattern);
    return {
      hostPattern: canonicalizeHost(host) ?? host,
      port: undefined,
    };
  }
  let port = parsePortSuffix(pattern.slice(idx + 1));
  if (port === undefined)
    return {
      hostPattern: pattern,
      port: undefined,
    };
  return {
    hostPattern: pattern.slice(0, idx),
    port,
  };
}
//@ chunk-70ac3q96.js:8073-8166 esm-fingerprint
function parsePortSuffix(suffix) {
  if (!/^[1-9][0-9]{0,4}$/.test(suffix)) return;
  let port = Number(suffix);
  return port > 65535 ? undefined : port;
}
//@ chunk-70ac3q96.js:8166-8553 esm-fingerprint
/**
 * 主机串是否可作为网络白名单域名（localhost、IPv6、合法域名）。与插件无关，见 lead 建议。
 */
function isValidDomainPattern(val) {
  if (isIP(val) === 6) return true;
  if (val.includes("://") || val.includes("/") || val.includes(":")) return false;
  if (val === "localhost") return true;
  if (val.startsWith("*.")) {
    let domain = val.slice(2);
    if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return false;
    let parts = domain.split(".");
    return parts.length >= 2 && parts.every((p) => p.length > 0);
  }
  if (val.includes("*")) return false;
  return val.includes(".") && !val.startsWith(".") && !val.endsWith(".");
}
//@ chunk-70ac3q96.js:8553-8815 esm-fingerprint
var DOMAIN_PATTERN_MESSAGE =
  'Invalid domain pattern. Must be a valid domain (e.g., "example.com"), a wildcard (e.g., "*.example.com"), or a bracketed IPv6 literal (e.g., "[::1]", "[2001:db8::1]:443"). Overly broad patterns like "*.com" or "*" are not allowed for security reasons.';
//@ chunk-70ac3q96.js:8815-8912 esm-fingerprint
function hasValidIpv6Bracketing(val) {
  let first = val.indexOf(":");
  return !(first !== -1 && val.indexOf(":", first + 1) !== -1) || val.startsWith("[");
}
//@ chunk-70ac3q96.js:8912-8967 esm-fingerprint
function isValidAllowedDomainEntry(val) {
  return hasValidIpv6Bracketing(val) && isValidDomainPattern(splitDomainPatternPort(val).hostPattern);
}
//@ chunk-70ac3q96.js:8967-9053 esm-fingerprint
var ALLOWED_DOMAIN_ENTRY_MESSAGE =
  DOMAIN_PATTERN_MESSAGE + ' An optional ":port" suffix (1-65535) restricts the entry to that port.';
//@ chunk-70ac3q96.js:9053-9161 esm-fingerprint
function ipLiteralRules(entries) {
  return entries.flatMap((entry) => {
    let { hostPattern, port } = splitDomainPatternPort(entry);
    return isIP(hostPattern)
      ? [
          {
            range: hostPattern,
            port,
          },
        ]
      : [];
  });
}
//@ chunk-70ac3q96.js:9161-9203 esm-fingerprint
function stripDomainPatternPort(pattern) {
  return splitDomainPatternPort(pattern).hostPattern;
}
//@ chunk-70ac3q96.js:9203-9395 esm-fingerprint
function matchesDomainPattern(hostname, pattern) {
  let h = hostname.toLowerCase();
  if (pattern === "*") return true;
  if (pattern.startsWith("*.")) {
    if (isIP(stripBrackets(h))) return false;
    let baseDomain = pattern.substring(2).toLowerCase();
    return h.endsWith("." + baseDomain);
  }
  return h === pattern.toLowerCase();
}
//@ chunk-70ac3q96.js:9395-9494 esm-fingerprint
function matchesDomainPatternWithPort(hostname, port, pattern) {
  let { hostPattern, port: patternPort } = splitDomainPatternPort(pattern);
  if (patternPort !== undefined && patternPort !== port) return false;
  return matchesDomainPattern(hostname, hostPattern);
}
//@ chunk-70ac3q96.js:9494-9729 esm-fingerprint
function isInjectHostCoveredByAllowedDomains(injectHost, allowedDomains) {
  let allowedHosts = allowedDomains.map(stripDomainPatternPort);
  if (!injectHost.startsWith("*.")) return allowedHosts.some((p) => matchesDomainPattern(injectHost, p));
  let injectBase = injectHost.slice(2).toLowerCase();
  return allowedHosts.some((p) => {
    if (!p.startsWith("*.")) return false;
    let allowedBase = p.slice(2).toLowerCase();
    return injectBase === allowedBase || injectBase.endsWith("." + allowedBase);
  });
}
export {
  isValidDomainPattern,
  DOMAIN_PATTERN_MESSAGE,
  isValidAllowedDomainEntry,
  ALLOWED_DOMAIN_ENTRY_MESSAGE,
  hasValidIpv6Bracketing,
  splitDomainPatternPort,
  stripDomainPatternPort,
  isInjectHostCoveredByAllowedDomains,
  ipLiteralRules,
  matchesDomainPatternWithPort,
  matchesDomainPattern,
};

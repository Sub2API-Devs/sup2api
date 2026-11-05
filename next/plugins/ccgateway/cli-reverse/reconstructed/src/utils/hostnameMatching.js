/**
 * utils/hostnameMatching.ts
 *
 * 2.1.316 新增：主机名匹配（NFKC 归一、通配、后缀）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-355mdh7x.js (11)
 * attribution: placement 11
 */
import { domainToASCII } from "url";

//@ chunk-355mdh7x.js:89614-89672 placement
var WIDE_DOT_CHARS_RE = /[\u3002\uFF0E\uFF61]/g;
var WIDE_COLON_CHARS_RE = /[\uFF1A\uFE55\uFE13]/g;
//@ chunk-355mdh7x.js:89672-89729 placement
/**
 * 归一化主机名中的全角点号与冒号。
 */
function normalizeHostnameText(text) {
  return text.replace(WIDE_DOT_CHARS_RE, ".").replace(WIDE_COLON_CHARS_RE, ":");
}
//@ chunk-355mdh7x.js:89729-90021 placement
var DOTTED_IPV4_PATTERN = /^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/;
var IPV4_PART_PATTERN = /^(0x[0-9a-f]*|\d+)$/;
var FORBIDDEN_HOST_CHARS_RE =
  /[\x00-\x20\x7f#%/<>?@\\^|]|[\u180E\u206A-\u206F\u{2F868}\u{2F874}\u{2F91F}\u{2F95F}\u{2F9BF}]/u;
var IGNORABLE_HOST_CHARS_RE =
  /[\u00AD\u034F\u180B-\u180D\u180F\u200B\u2060\u2064\uFE00-\uFE0F\uFEFF\u{1BCA0}-\u{1BCA3}\u{E0100}-\u{E01EF}]/gu;
//@ chunk-355mdh7x.js:90021-90228 placement
function normalizeHostnameText_2(hostname) {
  let decoded = hostname;
  if (decoded.includes("%"))
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return hostname.normalize("NFKC").toLowerCase();
    }
  return decoded
    .replace(IGNORABLE_HOST_CHARS_RE, "")
    .replace(WIDE_DOT_CHARS_RE, ".")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\.$/, "");
}
//@ chunk-355mdh7x.js:90228-90332 placement
/**
 * 规范化主机名：含禁止字符返回空串；转 ASCII（punycode），对点分 IPv4 形式再按解码、去不可见字符、NFKC、小写处理。
 */
function canonicalHostname(hostname) {
  if (FORBIDDEN_HOST_CHARS_RE.test(hostname)) return "";
  let ascii = domainToASCII(hostname);
  if (!DOTTED_IPV4_PATTERN.test(ascii)) return ascii;
  let normalized = normalizeHostnameText_2(hostname);
  return normalized === ascii ? ascii : normalized;
}
//@ chunk-355mdh7x.js:90332-90382 placement
/**
 * 判断域名转 ASCII 后是否为点分 IPv4。
 */
function isDomainToAsciiIPv4(hostname) {
  return !FORBIDDEN_HOST_CHARS_RE.test(hostname) && DOTTED_IPV4_PATTERN.test(domainToASCII(hostname));
}
//@ chunk-355mdh7x.js:90382-90477 placement
/**
 * 解析点分 IPv4 文本，不合法返回 null。
 */
function dottedIPv4OrNull(hostname) {
  let normalized = normalizeHostnameText_2(hostname);
  let parts = normalized.split(".");
  return parts.length <= 4 && parts.every((part) => IPV4_PART_PATTERN.test(part)) ? normalized : null;
}
//@ chunk-355mdh7x.js:90477-90584 placement
function normalizeHostPattern(pattern) {
  let hostname = normalizeHostnameText(pattern.toLowerCase()).replace(/\.+$/, "");
  let canonical = canonicalHostname(hostname);
  return canonical !== "" ? canonical.replace(/\.+$/, "") : hostname;
}
//@ chunk-355mdh7x.js:90584-90780 placement
function hostMatchesPattern(host, pattern) {
  let normalizedPattern;
  if (host.startsWith("*.")) normalizedPattern = `*.${normalizeHostPattern(host.slice(2))}`;
  else normalizedPattern = normalizeHostPattern(host);
  let normalizedHost = normalizeHostPattern(pattern);
  if (normalizedPattern === "*") return true;
  if (normalizedPattern === normalizedHost) return true;
  if (normalizedPattern.startsWith("*.") && normalizedHost.endsWith(normalizedPattern.slice(1))) return true;
  return false;
}
//@ chunk-355mdh7x.js:90780-90813 placement
/**
 * 判断主机是否匹配单个模式。
 */
function hostMatchesOnePattern(pattern, host) {
  return hostMatchesPattern(host, pattern);
}
//@ chunk-355mdh7x.js:90813-90875 placement
/**
 * 判断主机是否匹配任一模式。
 */
function hostMatchesAnyPattern(host, patterns) {
  for (let pattern of patterns) if (hostMatchesPattern(pattern, host)) return true;
  return false;
}
export {
  normalizeHostnameText,
  canonicalHostname,
  dottedIPv4OrNull,
  isDomainToAsciiIPv4,
  hostMatchesOnePattern,
  hostMatchesAnyPattern,
};

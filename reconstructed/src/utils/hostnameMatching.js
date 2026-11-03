/**
 * utils/hostnameMatching.ts
 *
 * 2.1.316 新增：主机名匹配（NFKC 归一、通配、后缀）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hq88884p.js (11)
 * attribution: placement 11
 */
import { domainToASCII } from "url";

//@ chunk-hq88884p.js:50891-50949 placement
var WIDE_DOT_CHARS_RE = /[\u3002\uFF0E\uFF61]/g;
var WIDE_COLON_CHARS_RE = /[\uFF1A\uFE55\uFE13]/g;
//@ chunk-hq88884p.js:50949-51006 placement
/**
 * 归一化主机名中的全角点号与冒号。
 */
function normalizeHostnameText(e) {
  return e.replace(WIDE_DOT_CHARS_RE, ".").replace(WIDE_COLON_CHARS_RE, ":");
}
//@ chunk-hq88884p.js:51006-51298 placement
var DOTTED_IPV4_PATTERN = /^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/;
var IPV4_PART_PATTERN = /^(0x[0-9a-f]*|\d+)$/;
var FORBIDDEN_HOST_CHARS =
  /[\x00-\x20\x7f#%/<>?@\\^|]|[\u180E\u206A-\u206F\u{2F868}\u{2F874}\u{2F91F}\u{2F95F}\u{2F9BF}]/u;
var IGNORABLE_HOST_CHARS =
  /[\u00AD\u034F\u180B-\u180D\u180F\u200B\u2060\u2064\uFE00-\uFE0F\uFEFF\u{1BCA0}-\u{1BCA3}\u{E0100}-\u{E01EF}]/gu;
//@ chunk-hq88884p.js:51298-51505 placement
function normalizeHostnameText_2(e) {
  let r = e;
  if (r.includes("%"))
    try {
      r = decodeURIComponent(r);
    } catch {
      return e.normalize("NFKC").toLowerCase();
    }
  return r
    .replace(IGNORABLE_HOST_CHARS, "")
    .replace(WIDE_DOT_CHARS_RE, ".")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\.$/, "");
}
//@ chunk-hq88884p.js:51505-51609 placement
/**
 * 规范化主机名：含禁止字符返回空串；转 ASCII（punycode），对点分 IPv4 形式再按解码、去不可见字符、NFKC、小写处理。
 */
function canonicalHostname(e) {
  if (FORBIDDEN_HOST_CHARS.test(e)) return "";
  let r = domainToASCII(e);
  if (!DOTTED_IPV4_PATTERN.test(r)) return r;
  let n = normalizeHostnameText_2(e);
  return n === r ? r : n;
}
//@ chunk-hq88884p.js:51609-51659 placement
/**
 * 判断域名转 ASCII 后是否为点分 IPv4。
 */
function isDomainToAsciiIPv4(e) {
  return !FORBIDDEN_HOST_CHARS.test(e) && DOTTED_IPV4_PATTERN.test(domainToASCII(e));
}
//@ chunk-hq88884p.js:51659-51754 placement
/**
 * 解析点分 IPv4 文本，不合法返回 null。
 */
function dottedIPv4OrNull(e) {
  let r = normalizeHostnameText_2(e);
  let parts = r.split(".");
  return parts.length <= 4 && parts.every((o) => IPV4_PART_PATTERN.test(o)) ? r : null;
}
//@ chunk-hq88884p.js:51754-51861 placement
function normalizeHostPattern(e) {
  let replaced = normalizeHostnameText(e.toLowerCase()).replace(/\.+$/, "");
  let n = canonicalHostname(replaced);
  return n !== "" ? n.replace(/\.+$/, "") : replaced;
}
//@ chunk-hq88884p.js:51861-52057 placement
function hostMatchesPattern(e, r) {
  let n;
  if (e.startsWith("*.")) n = `*.${normalizeHostPattern(e.slice(2))}`;
  else n = normalizeHostPattern(e);
  let o = normalizeHostPattern(r);
  if (n === "*") return true;
  if (n === o) return true;
  if (n.startsWith("*.") && o.endsWith(n.slice(1))) return true;
  return false;
}
//@ chunk-hq88884p.js:52057-52090 placement
/**
 * 判断主机是否匹配单个模式。
 */
function hostMatchesOnePattern(e, r) {
  return hostMatchesPattern(r, e);
}
//@ chunk-hq88884p.js:52090-52152 placement
/**
 * 判断主机是否匹配任一模式。
 */
function hostMatchesAnyPattern(e, r) {
  for (let n of r) if (hostMatchesPattern(n, e)) return true;
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

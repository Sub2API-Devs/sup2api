/**
 * utils/redaction/urlRedaction.ts
 *
 * 2.1.316 新增：遮盖单个 URL（凭据、查询、可疑主机）；协议中夹杂空白等的伪装 URL等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cgr0tezp.js (49)
 * attribution: placement 46, affinity 1, sole-consumer 2
 */
import { repeatString, firstLineOf, truncateToLength } from "../stringUtils.js";
import {
  mergeRanges,
  REDACT_WINDOW_CHARS,
  redactSecretTokens,
} from "../../services/teamMemorySync/secretScanner.js";
import { findSshUrlUserinfoSpans, parseUrlScheme, decodePercentRuns } from "./urlParsing.js";
import { normalizeUrl } from "../../services/mcp/officialRegistry.js";

//@ chunk-cgr0tezp.js:68247-68271 placement
/**
 * URL 遮盖占位。
 */
var REDACTED_URL = "[redacted URL]";
//@ chunk-cgr0tezp.js:68271-68471 placement
function decodeAuthorityEscapes(e) {
  let n = stripLeadingSpaceAndNewlines(e);
  if (!/%(?:40|3a|5c)/i.test(n)) return e;
  let matches = /^(?:https?|wss?|ftp|file):/i.test(n);
  return n.replace(matches ? /%(40|3a)/gi : /%(40|3a|5c)/gi, (i, s) => String.fromCharCode(parseInt(s, 16)));
}
//@ chunk-cgr0tezp.js:68471-68568 placement
function redactUrlWithFallback(e, n, r) {
  let i = n(e);
  let s = decodeAuthorityEscapes(e);
  if (i === r || s === e) return i;
  return i !== null && decodeAuthorityEscapes(i) === n(s) ? i : r;
}
//@ chunk-cgr0tezp.js:68568-68605 placement
/**
 * safeOriginUrlRedacted：安全来源 URL。
 */
function safeOriginUrlRedacted(e) {
  return redactUrlWithFallback(e, safeOriginUrl, null);
}
//@ chunk-cgr0tezp.js:68605-68801 placement
function safeOriginUrl(e) {
  try {
    let n = new URL(e);
    if (
      !n.host ||
      isGitSshUrl(e) ||
      hasEncodedColonHost(n) ||
      isRestrictedDestination(e, n) ||
      hasBackslashUserinfo_2(e)
    )
      return null;
    n.username = "";
    n.password = "";
    n.search = "";
    n.hash = "";
    return n.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
//@ chunk-cgr0tezp.js:68801-68821 placement
/**
 * URL_AUTHORITY_ESCAPE_RE：URL 权威部分需转义的字符。
 */
var URL_AUTHORITY_ESCAPE_RE = /[@:]|\/\//;
//@ chunk-cgr0tezp.js:68821-69066 placement
/**
 * 显示用 URL（路径中的 @、: 与多斜杠转义）。
 */
function displaySafeUrl(e) {
  let n = safeOriginUrlRedacted(e);
  if (n === null) return null;
  let { protocol, host, pathname } = new URL(n);
  if (!URL_AUTHORITY_ESCAPE_RE.test(pathname)) return n;
  let replaced = pathname
    .replace(/@/g, "%40")
    .replace(/:/g, "%3A")
    .replace(/\/{2,}/g, (a) => `/${repeatString("%2F", a.length - 1)}`);
  return `${protocol}//${host}${replaced}`;
}
//@ chunk-cgr0tezp.js:69066-69267 placement
/**
 * 遮盖 ssh URL 与 :// 后的 userinfo。
 */
function redactSshUserinfo(e) {
  let n = [];
  let r = 0;
  for (let [i, s] of mergeRanges(findSshUrlUserinfoSpans(e))) {
    n.push(e.slice(r, i), "[REDACTED]");
    r = s;
  }
  n.push(e.slice(r));
  return n.join("").replace(/:\/\/[^/?#]*(@|%40)/g, (i, s) => (s === "@" ? "://" : "://[REDACTED]%40"));
}
//@ chunk-cgr0tezp.js:69267-69301 placement
/**
 * 遮盖文本中的 URL。
 */
function redactUrlsInText(e) {
  return redactUrlWithFallback(e, redactUrl, REDACTED_URL);
}
//@ chunk-cgr0tezp.js:69301-70041 placement
/**
 * 遮盖单个 URL（凭据、查询、可疑主机）。
 */
function redactUrl(e) {
  if (!e) return e;
  if (isFileLikeUrl(e) || hasBackslashUserinfo(e) || isGitSshUrl(e)) return REDACTED_URL;
  try {
    let n = new URL(e);
    if (!n.host) throw TypeError("opaque");
    if (
      ((n.username !== "" || n.password !== "") && `${n.pathname}${n.search}${n.hash}`.includes("@")) ||
      hasEncodedColonHost(n) ||
      isRestrictedDestination(e, n)
    )
      return REDACTED_URL;
    n.username = "";
    n.password = "";
    n.search = "";
    n.hash = "";
    return n.toString().replace(/\/$/, "");
  } catch {
    let n = stripLeadingSpaceAndNewlines(e);
    let urlAuthorityStart = getUrlAuthorityStart(n);
    let sliced = n.slice(urlAuthorityStart);
    let s = userinfoEnd_2(sliced);
    let o = sliced.search(/[?#]/);
    if (s !== -1 && o !== -1 && o < s) return REDACTED_URL;
    let a = s === -1 ? sliced : sliced.slice(s + 1);
    let u = a.search(/[?#]/);
    if (u !== -1 && a.includes("@", u) && (s !== -1 || !hasNonHostPrefix(a, u, urlAuthorityStart !== 0)))
      return REDACTED_URL;
    let c = firstLineOf(firstLineOf(s === -1 ? n : n.slice(urlAuthorityStart + s + 1), "?"), "#");
    let index = c.lastIndexOf("@");
    let d = index === -1 ? c : c.slice(index + 1);
    return isScpLikeRemote(d) &&
      !isScpLikeRemote(n) &&
      !/^:\d+\/?$/.test(d.startsWith("[") ? d.slice(d.indexOf("]") + 1) : d.slice(d.indexOf(":")))
      ? REDACTED_URL
      : d;
  }
}
//@ chunk-cgr0tezp.js:70041-70097 placement
var WINDOWS_LOCAL_PATH_RE = /^(?:(?:file:\/\/)?[a-z]:(?:\\|\/(?!\/))|\\\\)/i;
//@ chunk-cgr0tezp.js:70097-70131 placement
/**
 * 遮盖 URL 查询部分。
 */
function redactUrlQuery(e) {
  return redactUrlWithFallback(e, stripUrlQuery, REDACTED_URL);
}
//@ chunk-cgr0tezp.js:70131-70597 placement
/**
 * 去掉 URL 查询（本地路径保留）。
 */
function stripUrlQuery(e) {
  if (isFileLikeUrl(e) || isGitSshUrl(e)) return REDACTED_URL;
  if (WINDOWS_LOCAL_PATH_RE.test(e)) {
    let index = e.indexOf("?", e.startsWith("\\\\?\\") ? 4 : 0);
    return index === -1 ? e : e.slice(0, index);
  }
  if (hasBackslashUserinfo(e) && !isPlainPathLike(e)) return REDACTED_URL;
  let n;
  try {
    n = new URL(e);
  } catch {
    return ghIsDangerousCallback(e, hasSensitiveUrlOrGitHubCallback(e) ? redactUrl(e) : e);
  }
  if (!n.host)
    return ghIsDangerousCallback(
      e,
      n.search || n.hash || hasSensitiveUrlOrGitHubCallback(e) ? redactUrl(e) : e,
    );
  if (isRestrictedDestination(e, n)) return REDACTED_URL;
  let r = n.username !== "" && isNotSshScheme(n.protocol.slice(0, -1));
  let i = n.username !== "" && !/^[^:]*:\//.test(stripLeadingSpaceAndNewlines(e));
  return ghIsDangerousCallback(
    e,
    r || i || n.password || hasColon(n.username) || hasEncodedColonHost(n) || n.search || n.hash
      ? redactUrl(e)
      : e,
  );
}
//@ chunk-cgr0tezp.js:70597-70632 placement
/**
 * 遮盖 URL 并记录位置。
 */
function redactUrlsTracked(e) {
  return ghIsDangerousCallback(e, redactUrlsInText(e));
}
//@ chunk-cgr0tezp.js:70632-70694 placement
/**
 * 字符串全部替换。
 */
function replaceAll(e, n, r) {
  return n === "" || n === r ? e : e.split(n).join(r);
}
//@ chunk-cgr0tezp.js:70694-70850 placement
/**
 * 用已知 URL 遮盖文本。
 */
function redactKnownUrls(stderr, gitUrl) {
  let r = typeof gitUrl === "string" || gitUrl === undefined ? [gitUrl] : gitUrl;
  for (let i of r) {
    let s = urlVariants(i);
    let o = i && s.length > 0 ? redactUrlQuery(i) : "";
    for (let a of s) stderr = replaceAll(stderr, a, o);
  }
  return redactUrlsInMessage(stderr);
}
//@ chunk-cgr0tezp.js:70850-71072 placement
function urlVariants(e) {
  if (!e || !URL_BREAK_CHARS.test(e) || redactUrlQuery(e) === e) return [];
  let n = [e];
  let urlAuthorityStart = getUrlAuthorityStart(e);
  let sliced = e.slice(urlAuthorityStart);
  let index = sliced.indexOf("/");
  for (let o of new Set([sliced.indexOf("@"), userinfoEnd_2(sliced)]))
    if (urlAuthorityStart !== 0 && o !== -1 && (index === -1 || o < index))
      n.push(e.slice(0, urlAuthorityStart) + sliced.slice(o + 1));
  return n;
}
//@ chunk-cgr0tezp.js:71072-71397 placement
/**
 * URL 是否含查询、片段或凭据。
 */
function hasSensitiveUrlParts(e) {
  let n = stripLeadingSpaceAndNewlines(e);
  let urlAuthorityStart = getUrlAuthorityStart(n);
  let i = urlAuthorityStart !== 0;
  let index = n.indexOf("#");
  if (n.includes("?") || (index !== -1 && (i || n.includes("@", index)))) return true;
  let sliced = n.slice(urlAuthorityStart);
  let a = userinfoEnd_2(sliced);
  if (a === -1) return false;
  let sliced_2 = n.slice(0, urlAuthorityStart - 3);
  let c = /^(?:ftps?|wss?)$/i.test(sliced_2) ? sliced.slice(0, a).replace(/^[/\\]+/, "") : sliced.slice(0, a);
  return hasColon(c) || (i && (/https?$/i.test(sliced_2) || (!c.includes("/") && isNotSshScheme(sliced_2))));
}
//@ chunk-cgr0tezp.js:71397-71414 placement
/**
 * COLON_RE：冒号或其编码。
 */
var COLON_RE = /:|%3a/i;
//@ chunk-cgr0tezp.js:71414-71539 placement
function hasEncodedColonHost(e) {
  return (
    !e.hostname.startsWith("[") &&
    /%3a/i.test(e.hostname) &&
    `${e.pathname}${e.search}${e.hash}`.includes("@")
  );
}
//@ chunk-cgr0tezp.js:71539-71573 placement
function hasColon(e) {
  return COLON_RE.test(e);
}
//@ chunk-cgr0tezp.js:71573-72027 placement
/**
 * 是否为 ssh/git 形式 URL。
 */
function isGitSshUrl(e) {
  let n = stripLeadingSpaceAndNewlines(e);
  let index = n.indexOf(":");
  let i = index === -1 ? "" : n.slice(0, index);
  if (
    !/^[a-z][a-z0-9+.-]*$/i.test(i) ||
    !/(?:ssh|git\+ssh|ssh\+git|git|file)$/i.test(i) ||
    WINDOWS_LOCAL_PATH_RE.test(n)
  )
    return false;
  let sliced = n.slice(index + 1);
  let o = firstLineOf(sliced.slice(/^\/*/.exec(sliced)[0].length), "/");
  let a = o.search(/[?#]/);
  if (!(/%40/i.test(o) || (a !== -1 && o.includes("@", a)))) return false;
  let replaced = o.replace(/%([0-9a-f]{2})/gi, (l, d) => String.fromCharCode(parseInt(d, 16)));
  let index_2 = replaced.lastIndexOf("@");
  return index_2 !== -1 && replaced.slice(0, index_2).includes(":");
}
//@ chunk-cgr0tezp.js:72027-72126 placement = ghIsDangerousCallback (1)
function isScpLikeRemote(e) {
  let index = e.indexOf(":");
  let index_2 = e.indexOf("/");
  return index > 0 && !e.includes("://") && (index_2 === -1 || index < index_2);
}
//@ chunk-cgr0tezp.js:72126-72410 placement = ghIsDangerousCallback (1)
function ghIsDangerousCallback(_rawCommand, args) {
  let r = (s, o) => {
    let a = stripLeadingSpaceAndNewlines(s);
    return (
      isObfuscatedSchemeUrl(s) ||
      (/^(?:ssh|git|git\+ssh|ssh\+git|file):\/\//i.test(a) &&
        o !== s &&
        !o.toLowerCase().startsWith(a.slice(0, a.indexOf("://") + 3).toLowerCase())) ||
      (isScpLikeRemote(s) && (hasUrlHost(s) || /[\t\n\r]/.test(s) || isScpStyleUrl(s, o)))
    );
  };
  return (args !== _rawCommand && isScpLikeRemote(args) && !isScpLikeRemote(_rawCommand)) ||
    r(_rawCommand, args) ||
    r(args, args)
    ? REDACTED_URL
    : args;
}
//@ chunk-cgr0tezp.js:72410-72956 placement
/**
 * 协议中夹杂空白等的伪装 URL。
 */
function isObfuscatedSchemeUrl(e) {
  let replaced = e.replace(/^[\u0000-\u0020]+/, "");
  let match = /^[a-z+\t\n\r]*:[\t\n\r]*\/[\t\n\r]*\//i.exec(replaced);
  let i =
    match !== null && /^(?:ssh|git|git\+ssh|ssh\+git|file):\/\/$/i.test(match[0].replace(/[\t\n\r]/g, ""))
      ? match
      : null;
  if (!i && !isScpLikeRemote(e)) return false;
  let s = i
    ? /^(?:[\w.~+-]+(?::[^@/?#%\s[\]]*)?@)?(?:\w(?:[\w.-]*\w)?|\[[\da-f]*:[\da-f.]*:[\da-f:.]*\])?(?::[\w~-]*)?(?:\/|$)/i
    : /^(?:[\w.~+-]+@)?(?:\w(?:[\w.-]*\w)?|\[[\da-f]*:[\da-f.]*:[\da-f:.]*\]):/i;
  let o = i ? replaced.slice(i[0].length) : e;
  let a = i ? o.slice(Math.max(o.indexOf("/"), 0)) : "";
  return !s.test(o) || /(?:@|%40)(?:\[|%5b)/i.test(a);
}
//@ chunk-cgr0tezp.js:72956-73019 placement
function hasUrlHost(e) {
  try {
    return new URL(e).host !== "";
  } catch {
    return false;
  }
}
//@ chunk-cgr0tezp.js:73019-73389 placement = ghIsDangerousCallback (0.825)
/**
 * 是否为 scp 风格地址（user@host:path）。
 */
function isScpStyleUrl(_rawCommand, args) {
  let r = stripLeadingSpaceAndNewlines(_rawCommand);
  let index = r.indexOf(":");
  let sliced = r.slice(0, index);
  if (index <= 0 || /[/?#]/.test(sliced) || _rawCommand.includes("://")) return false;
  let index_2 = sliced.lastIndexOf("@");
  let index_3 = r.indexOf("@[");
  let u = index_3 !== -1 ? index_3 + 1 : r.startsWith("[") ? 0 : -1;
  let sliced_2 = sliced.slice(index_2 + 1);
  if (u !== -1) {
    let index = r.indexOf("]", u);
    if (u !== index_2 + 1 || r[index + 1] !== ":" || /[/?#@\\]/.test(r.slice(u + 1, index))) return true;
    sliced_2 = r.slice(u, index + 1);
  }
  return args !== _rawCommand && args !== REDACTED_URL && !args.startsWith(`${sliced_2}:`);
}
//@ chunk-cgr0tezp.js:73389-73424 placement
function hasSensitiveUrlOrGitHubCallback(e) {
  return hasSensitiveUrlParts(e) || ghIsDangerousCallback_2(e);
}
//@ chunk-cgr0tezp.js:73424-73650 placement = ghIsDangerousCallback (0.825)
function ghIsDangerousCallback_2(e) {
  let replaced = e.replace(/^[\u0000-\u0020]+/, "");
  let index = replaced.indexOf("://");
  if (index !== -1 && /[?#]/.test(replaced)) return true;
  let i = firstLineOf(index === -1 ? replaced : replaced.slice(index + 3), "/");
  let index_2 = i.lastIndexOf("@");
  return (
    index_2 !== -1 &&
    (hasColon(i.slice(0, index_2)) || (index !== -1 && isNotSshScheme(replaced.slice(0, index))))
  );
}
//@ chunk-cgr0tezp.js:73650-73711 placement
function isNotSshScheme(e) {
  return !/^(?:ssh|git\+ssh|ssh\+git)$/i.test(e);
}
//@ chunk-cgr0tezp.js:73711-73790 placement
/**
 * stripLeadingSpaceAndNewlines：去掉前导空白与换行。
 */
function stripLeadingSpaceAndNewlines(e) {
  return e.replace(/^[\u0000-\u0020]+/, "").replace(/[\t\n\r]/g, "");
}
//@ chunk-cgr0tezp.js:73790-74046 placement
var URL_PREFIX_BOUNDARY = "(^|[^a-z0-9+.-]|%[0-9a-f]{2})";
var WEB_SCHEMES = "https?|wss?|ftps?";
var GIT_SCHEMES = "ssh\\+git|git\\+ssh|ssh|git";
var regExp_15 = new RegExp(
  `[a-z](?:[a-z0-9+.-]{1,31}:\\/+|:\\/\\/)|(?:https?|ftps?):(?!\\/)|${URL_PREFIX_BOUNDARY}(?:wss?|file):(?!\\/)|${URL_PREFIX_BOUNDARY}(?:${GIT_SCHEMES}):(?!\\/)(?=[^@/?#\\s]*?(?::|%3a))`,
  "i",
);
//@ chunk-cgr0tezp.js:74046-74424 placement
/**
 * 是否为文件类 URL。
 */
function isFileLikeUrl(e, { forDestination: n = false } = {}) {
  let replaced = stripLeadingSpaceAndNewlines(e).replace(/\\/g, "/");
  let i = replaced.search(/[?#]/);
  let s = i === -1 ? replaced : replaced.slice(0, i);
  let o = (n ? /^[a-z][a-z0-9+.-]*:\/*/i.exec(s) : null) ?? /:\/+/.exec(s);
  if (!o) return false;
  let a = o.index + o[0].length;
  let match = (n ? regExp_15 : /[a-z][a-z0-9+.-]{1,31}:\/+/i).exec(s.slice(a));
  let c = a + (match?.index ?? 0) + (match?.[0].length ?? 0);
  return match !== null && (replaced.includes("@", c) || /%40/i.test(firstLineOf(replaced.slice(c), "/")));
}
//@ chunk-cgr0tezp.js:74424-74505 placement
function hasBackslashUserinfo(e) {
  let n = stripLeadingSpaceAndNewlines(e);
  if (WINDOWS_LOCAL_PATH_RE.test(n) || /^file:/i.test(n)) return false;
  return hasBackslashUserinfo_2(e);
}
//@ chunk-cgr0tezp.js:74505-74623 placement
function hasBackslashUserinfo_2(e) {
  let n = stripLeadingSpaceAndNewlines(e);
  let r = n.search(/[?#]/);
  let index = (r === -1 ? n : n.slice(0, r)).indexOf("\\");
  return index !== -1 && n.includes("@", index);
}
//@ chunk-cgr0tezp.js:74623-74843 affinity
function hasBracketedSshHost(e) {
  let n = stripLeadingSpaceAndNewlines(e);
  let match = /(?:ssh|git\+ssh|ssh\+git|git):\/\//i.exec(n);
  if (!match) return false;
  let replaced = n
    .slice(match.index + match[0].length)
    .replace(/%40/gi, "@")
    .replace(/%5b/gi, "[");
  let s = replaced.search(/[/?#]/);
  return s !== -1 && replaced.includes("@[", s);
}
//@ chunk-cgr0tezp.js:74843-75015 sole-consumer
function sshHostMismatch(e, n) {
  if (!/^(?:ssh|git|git\+ssh|ssh\+git):$/i.test(n.protocol)) return false;
  let host = parseUrlScheme(stripLeadingSpaceAndNewlines(e))?.host;
  return host !== undefined && host.toLowerCase() !== decodePercentRuns(n.hostname).toLowerCase();
}
//@ chunk-cgr0tezp.js:75015-75142 sole-consumer
/**
 * 判断 URL 是否指向受限目的地（多种检测的组合）。归属疑为通用 URL 安全工具。
 */
function isRestrictedDestination(url, n) {
  return (
    isFileLikeUrl(url, {
      forDestination: true,
    }) ||
    isFileLikeUrl(n.href, {
      forDestination: true,
    }) ||
    hasBracketedSshHost(url) ||
    sshHostMismatch(url, n) ||
    (n.protocol === "file:" && normalizeUrl(url))
  );
}
//@ chunk-cgr0tezp.js:75296-75461 placement
function isPlainPathLike(e) {
  return (
    /^[\w .+~@\\/-]*$/.test(e) &&
    !/\\(?:[^A-Za-z0-9@]|$)| $|\.[_~+]*\.|(?:^|\/)[_~+]*\.[_~+]*$/.test(e) &&
    !/(?:^|[^\\])@|@[^\\/ ]*(?:[/ ]|$)/.test(e)
  );
}
//@ chunk-cgr0tezp.js:75461-75562 placement = ghIsDangerousCallback (1)
function getUrlAuthorityStart(e) {
  let index = e.indexOf("://");
  return index !== -1 && /^[a-z][a-z0-9+.-]*$/i.test(e.slice(0, index)) ? index + 3 : 0;
}
//@ chunk-cgr0tezp.js:75562-75758 placement
function userinfoEnd_2(e) {
  let index = e.indexOf("@");
  if (index === -1) return -1;
  let r = e.search(/[?#]/);
  if (r !== -1 && r < index && e.lastIndexOf("/", r) !== -1) return -1;
  let index_2 = e.indexOf("/", index);
  return e.lastIndexOf("@", index_2 === -1 ? e.length : index_2);
}
//@ chunk-cgr0tezp.js:75758-75902 placement
function hasNonHostPrefix(e, n, r) {
  let index = e.indexOf("/");
  if (index <= 0 || index > n) return false;
  let replaced = e.slice(0, index).replace(/^\[[^\]]*\]/, "");
  return !hasColon(r ? replaced.replace(/:\d+$/, "") : replaced);
}
//@ chunk-cgr0tezp.js:75902-76021 placement
/**
 * 文本中 URL 的正则与分隔字符。
 */
var URL_IN_TEXT_RE = /[a-z][a-z0-9+.-]{0,31}:\/\/[^\s'"`<>]+/gi;
var URL_BREAK_CHARS = /[\s'"`<>]/;
var URL_BREAK_DESCRIPTION = "whitespace, quotes, backticks or angle brackets";
//@ chunk-cgr0tezp.js:76021-76080 placement
/**
 * isPlainHttpUrl：普通 http(s) URL。
 */
function isPlainHttpUrl(url) {
  return /^https?:\/\//i.test(url) && !URL_BREAK_CHARS.test(url);
}
//@ chunk-cgr0tezp.js:76080-76212 placement
var AT_TOKEN_RE = /(^|[\s'"`<>])([^\s'"`<>]*(?:@|%40)[^\s'"`<>]*)/gi;
var regExp_16 = new RegExp(
  `${URL_PREFIX_BOUNDARY}(?:${WEB_SCHEMES}):(?!\\/\\/)|${URL_PREFIX_BOUNDARY}(?:${GIT_SCHEMES}):(?!\\/\\/)`,
  "gi",
);
//@ chunk-cgr0tezp.js:76212-76547 placement
/**
 * 找出 userinfo 结束位置。
 */
function userinfoEnd(e) {
  let lower = e.toLowerCase();
  let max = Math.max(lower.lastIndexOf("@"), lower.lastIndexOf("%40"));
  for (let i of e.matchAll(regExp_16)) {
    let s = i.index + i[0].length;
    if (max < s) return -1;
    let o = i.index + (i[1] ?? i[2] ?? "").length;
    if (i[2] === undefined) return o;
    let index = lower.indexOf(":", s);
    let min = Math.min(index === -1 ? max : index, max);
    if ((index !== -1 && index < max) || lower.slice(s, min).includes("%3a")) return o;
  }
  return -1;
}
//@ chunk-cgr0tezp.js:76547-76692 placement
/**
 * 遮盖消息中的 URL 与 userinfo。
 */
function redactUrlsInMessage(e) {
  if (!e) return e;
  return e
    .replace(URL_IN_TEXT_RE, (n) => redactUrlQuery(n))
    .replace(AT_TOKEN_RE, (n, r, i) => {
      let s = userinfoEnd(i);
      return s === -1 ? r + i : r + i.slice(0, s) + redactUrlQuery(i.slice(s));
    });
}
//@ chunk-cgr0tezp.js:76692-76785 placement
function ruleApplies(redactRule, n, r) {
  return (
    (n || redactRule.redactOnly !== true) &&
    (redactRule.prefilter === undefined || redactRule.prefilter.test(r))
  );
}
//@ chunk-cgr0tezp.js:76785-76919 placement
function redactTokensPrefix(e, n) {
  for (let r = n + 2 * REDACT_WINDOW_CHARS; ; r *= 2) {
    if (e.length <= r) return redactSecretTokens(e);
    let i = redactSecretTokens(e.slice(0, r));
    let s = i.length - REDACT_WINDOW_CHARS;
    if (s >= n) return truncateToLength(i, s);
  }
}
export {
  ruleApplies,
  redactTokensPrefix,
  redactUrlsInText,
  safeOriginUrlRedacted,
  redactUrlsInMessage,
  redactKnownUrls,
  redactUrlQuery,
  redactUrlsTracked,
  replaceAll,
  REDACTED_URL,
  redactSshUserinfo,
  COLON_RE,
  stripLeadingSpaceAndNewlines,
  displaySafeUrl,
  URL_AUTHORITY_ESCAPE_RE,
  URL_BREAK_DESCRIPTION,
  isPlainHttpUrl,
};

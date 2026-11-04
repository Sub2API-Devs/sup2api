/**
 * utils/redaction/urlRedaction.ts
 *
 * 2.1.316 新增：遮盖单个 URL（凭据、查询、可疑主机）；协议中夹杂空白等的伪装 URL等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cgr0tezp.js (50)
 * attribution: placement 47, layout 3
 */
import { repeatString, firstLineOf, truncateToLength } from "../stringUtils.js";
import {
  mergeRanges,
  REDACT_WINDOW_CHARS,
  redactSecretTokens,
} from "../../services/teamMemorySync/secretScanner.js";
import { findSshUrlUserinfoSpans, parseUrlScheme, decodePercentRuns } from "./urlParsing.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-cgr0tezp.js:68247-68271 placement
/**
 * URL 遮盖占位。
 */
var REDACTED_URL = "[redacted URL]";
//@ chunk-cgr0tezp.js:68271-68471 placement
function decodeAuthorityEscapes(text) {
  let stripped = stripLeadingSpaceAndNewlines(text);
  if (!/%(?:40|3a|5c)/i.test(stripped)) return text;
  let matches = /^(?:https?|wss?|ftp|file):/i.test(stripped);
  return stripped.replace(matches ? /%(40|3a)/gi : /%(40|3a|5c)/gi, (match, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}
//@ chunk-cgr0tezp.js:68471-68568 placement
function redactUrlWithFallback(text, redact, fallback) {
  let redacted = redact(text);
  let decodedText = decodeAuthorityEscapes(text);
  if (redacted === fallback || decodedText === text) return redacted;
  return redacted !== null && decodeAuthorityEscapes(redacted) === redact(decodedText) ? redacted : fallback;
}
//@ chunk-cgr0tezp.js:68568-68605 placement
/**
 * safeOriginUrlRedacted：安全来源 URL。
 */
function safeOriginUrlRedacted(text) {
  return redactUrlWithFallback(text, safeOriginUrl, null);
}
//@ chunk-cgr0tezp.js:68605-68801 placement
function safeOriginUrl(text) {
  try {
    let url = new URL(text);
    if (
      !url.host ||
      isGitSshUrl(text) ||
      hasEncodedColonHost(url) ||
      isRestrictedDestination(text, url) ||
      hasBackslashUserinfo_2(text)
    )
      return null;
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
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
function displaySafeUrl(text) {
  let redacted = safeOriginUrlRedacted(text);
  if (redacted === null) return null;
  let { protocol, host, pathname } = new URL(redacted);
  if (!URL_AUTHORITY_ESCAPE_RE.test(pathname)) return redacted;
  let replaced = pathname
    .replace(/@/g, "%40")
    .replace(/:/g, "%3A")
    .replace(/\/{2,}/g, (run) => `/${repeatString("%2F", run.length - 1)}`);
  return `${protocol}//${host}${replaced}`;
}
//@ chunk-cgr0tezp.js:69066-69267 placement
/**
 * 遮盖 ssh URL 与 :// 后的 userinfo。
 */
function redactSshUserinfo(text) {
  let parts = [];
  let cursor = 0;
  for (let [start, end] of mergeRanges(findSshUrlUserinfoSpans(text))) {
    parts.push(text.slice(cursor, start), "[REDACTED]");
    cursor = end;
  }
  parts.push(text.slice(cursor));
  return parts
    .join("")
    .replace(/:\/\/[^/?#]*(@|%40)/g, (match, atOrEncoded) =>
      atOrEncoded === "@" ? "://" : "://[REDACTED]%40",
    );
}
//@ chunk-cgr0tezp.js:69267-69301 placement
/**
 * 遮盖文本中的 URL。
 */
function redactUrlsInText(text) {
  return redactUrlWithFallback(text, redactUrl, REDACTED_URL);
}
//@ chunk-cgr0tezp.js:69301-70041 placement
/**
 * 遮盖单个 URL（凭据、查询、可疑主机）。
 */
function redactUrl(text) {
  if (!text) return text;
  if (isFileLikeUrl(text) || hasBackslashUserinfo(text) || isGitSshUrl(text)) return REDACTED_URL;
  try {
    let url = new URL(text);
    if (!url.host) throw TypeError("opaque");
    if (
      ((url.username !== "" || url.password !== "") &&
        `${url.pathname}${url.search}${url.hash}`.includes("@")) ||
      hasEncodedColonHost(url) ||
      isRestrictedDestination(text, url)
    )
      return REDACTED_URL;
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    let stripped = stripLeadingSpaceAndNewlines(text);
    let urlAuthorityStart = getUrlAuthorityStart(stripped);
    let text_2 = stripped.slice(urlAuthorityStart);
    let userinfoEnd = userinfoEnd_2(text_2);
    let queryIndex = text_2.search(/[?#]/);
    if (userinfoEnd !== -1 && queryIndex !== -1 && queryIndex < userinfoEnd) return REDACTED_URL;
    let afterUserinfo = userinfoEnd === -1 ? text_2 : text_2.slice(userinfoEnd + 1);
    let queryInRest = afterUserinfo.search(/[?#]/);
    if (
      queryInRest !== -1 &&
      afterUserinfo.includes("@", queryInRest) &&
      (userinfoEnd !== -1 || !hasNonHostPrefix(afterUserinfo, queryInRest, urlAuthorityStart !== 0))
    )
      return REDACTED_URL;
    let hostPart = firstLineOf(
      firstLineOf(userinfoEnd === -1 ? stripped : stripped.slice(urlAuthorityStart + userinfoEnd + 1), "?"),
      "#",
    );
    let index = hostPart.lastIndexOf("@");
    let hostCandidate = index === -1 ? hostPart : hostPart.slice(index + 1);
    return isScpLikeRemote(hostCandidate) &&
      !isScpLikeRemote(stripped) &&
      !/^:\d+\/?$/.test(
        hostCandidate.startsWith("[")
          ? hostCandidate.slice(hostCandidate.indexOf("]") + 1)
          : hostCandidate.slice(hostCandidate.indexOf(":")),
      )
      ? REDACTED_URL
      : hostCandidate;
  }
}
//@ chunk-cgr0tezp.js:70041-70097 placement
var WINDOWS_LOCAL_PATH_RE = /^(?:(?:file:\/\/)?[a-z]:(?:\\|\/(?!\/))|\\\\)/i;
//@ chunk-cgr0tezp.js:70097-70131 placement
/**
 * 遮盖 URL 查询部分。
 */
function redactUrlQuery(text) {
  return redactUrlWithFallback(text, stripUrlQuery, REDACTED_URL);
}
//@ chunk-cgr0tezp.js:70131-70597 placement
/**
 * 去掉 URL 查询（本地路径保留）。
 */
function stripUrlQuery(text) {
  if (isFileLikeUrl(text) || isGitSshUrl(text)) return REDACTED_URL;
  if (WINDOWS_LOCAL_PATH_RE.test(text)) {
    let index = text.indexOf("?", text.startsWith("\\\\?\\") ? 4 : 0);
    return index === -1 ? text : text.slice(0, index);
  }
  if (hasBackslashUserinfo(text) && !isPlainPathLike(text)) return REDACTED_URL;
  let url;
  try {
    url = new URL(text);
  } catch {
    return ghIsDangerousCallback(text, hasSensitiveUrlOrGitHubCallback(text) ? redactUrl(text) : text);
  }
  if (!url.host)
    return ghIsDangerousCallback(
      text,
      url.search || url.hash || hasSensitiveUrlOrGitHubCallback(text) ? redactUrl(text) : text,
    );
  if (isRestrictedDestination(text, url)) return REDACTED_URL;
  let hasNonSshUserinfo = url.username !== "" && isNotSshScheme(url.protocol.slice(0, -1));
  let missingScheme = url.username !== "" && !/^[^:]*:\//.test(stripLeadingSpaceAndNewlines(text));
  return ghIsDangerousCallback(
    text,
    hasNonSshUserinfo ||
      missingScheme ||
      url.password ||
      hasColon(url.username) ||
      hasEncodedColonHost(url) ||
      url.search ||
      url.hash
      ? redactUrl(text)
      : text,
  );
}
//@ chunk-cgr0tezp.js:70597-70632 placement
/**
 * 遮盖 URL 并记录位置。
 */
function redactUrlsTracked(text) {
  return ghIsDangerousCallback(text, redactUrlsInText(text));
}
//@ chunk-cgr0tezp.js:70632-70694 placement
/**
 * 字符串全部替换。
 */
function replaceAll(text, search, replacement) {
  return search === "" || search === replacement ? text : text.split(search).join(replacement);
}
//@ chunk-cgr0tezp.js:70694-70850 placement
/**
 * 用已知 URL 遮盖文本。
 */
function redactKnownUrls(stderr, gitUrl) {
  let urls = typeof gitUrl === "string" || gitUrl === undefined ? [gitUrl] : gitUrl;
  for (let url of urls) {
    let variants = urlVariants(url);
    let replacement = url && variants.length > 0 ? redactUrlQuery(url) : "";
    for (let variant of variants) stderr = replaceAll(stderr, variant, replacement);
  }
  return redactUrlsInMessage(stderr);
}
//@ chunk-cgr0tezp.js:70850-71072 placement
function urlVariants(url) {
  if (!url || !URL_BREAK_RE.test(url) || redactUrlQuery(url) === url) return [];
  let variants = [url];
  let urlAuthorityStart = getUrlAuthorityStart(url);
  let text = url.slice(urlAuthorityStart);
  let index = text.indexOf("/");
  for (let atIndex of new Set([text.indexOf("@"), userinfoEnd_2(text)]))
    if (urlAuthorityStart !== 0 && atIndex !== -1 && (index === -1 || atIndex < index))
      variants.push(url.slice(0, urlAuthorityStart) + text.slice(atIndex + 1));
  return variants;
}
//@ chunk-cgr0tezp.js:71072-71397 placement
/**
 * URL 是否含查询、片段或凭据。
 */
function hasSensitiveUrlParts(text) {
  let stripped = stripLeadingSpaceAndNewlines(text);
  let urlAuthorityStart = getUrlAuthorityStart(stripped);
  let hasAuthority = urlAuthorityStart !== 0;
  let index = stripped.indexOf("#");
  if (stripped.includes("?") || (index !== -1 && (hasAuthority || stripped.includes("@", index))))
    return true;
  let text_2 = stripped.slice(urlAuthorityStart);
  let userinfoEnd = userinfoEnd_2(text_2);
  if (userinfoEnd === -1) return false;
  let scheme = stripped.slice(0, urlAuthorityStart - 3);
  let userinfo = /^(?:ftps?|wss?)$/i.test(scheme)
    ? text_2.slice(0, userinfoEnd).replace(/^[/\\]+/, "")
    : text_2.slice(0, userinfoEnd);
  return (
    hasColon(userinfo) ||
    (hasAuthority && (/https?$/i.test(scheme) || (!userinfo.includes("/") && isNotSshScheme(scheme))))
  );
}
//@ chunk-cgr0tezp.js:71397-71414 placement
/**
 * COLON_RE：冒号或其编码。
 */
var COLON_RE = /:|%3a/i;
//@ chunk-cgr0tezp.js:71414-71539 placement
function hasEncodedColonHost(url) {
  return (
    !url.hostname.startsWith("[") &&
    /%3a/i.test(url.hostname) &&
    `${url.pathname}${url.search}${url.hash}`.includes("@")
  );
}
//@ chunk-cgr0tezp.js:71539-71573 placement
function hasColon(text) {
  return COLON_RE.test(text);
}
//@ chunk-cgr0tezp.js:71573-72027 placement
/**
 * 是否为 ssh/git 形式 URL。
 */
function isGitSshUrl(url) {
  let stripped = stripLeadingSpaceAndNewlines(url);
  let index = stripped.indexOf(":");
  let scheme = index === -1 ? "" : stripped.slice(0, index);
  if (
    !/^[a-z][a-z0-9+.-]*$/i.test(scheme) ||
    !/(?:ssh|git\+ssh|ssh\+git|git|file)$/i.test(scheme) ||
    WINDOWS_LOCAL_PATH_RE.test(stripped)
  )
    return false;
  let sliced = stripped.slice(index + 1);
  let rest = firstLineOf(sliced.slice(/^\/*/.exec(sliced)[0].length), "/");
  let queryIndex = rest.search(/[?#]/);
  if (!(/%40/i.test(rest) || (queryIndex !== -1 && rest.includes("@", queryIndex)))) return false;
  let replaced = rest.replace(/%([0-9a-f]{2})/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  let index_2 = replaced.lastIndexOf("@");
  return index_2 !== -1 && replaced.slice(0, index_2).includes(":");
}
//@ chunk-cgr0tezp.js:72027-72126 placement (2.1.88 match: ghIsDangerousCallback, 1)
function isScpLikeRemote(text) {
  let index = text.indexOf(":");
  let index_2 = text.indexOf("/");
  return index > 0 && !text.includes("://") && (index_2 === -1 || index < index_2);
}
//@ chunk-cgr0tezp.js:72126-72410 placement (2.1.88 match: ghIsDangerousCallback, 1)
function ghIsDangerousCallback(_rawCommand, args) {
  let isDangerous = (raw, replaced) => {
    let stripped = stripLeadingSpaceAndNewlines(raw);
    return (
      isObfuscatedSchemeUrl(raw) ||
      (/^(?:ssh|git|git\+ssh|ssh\+git|file):\/\//i.test(stripped) &&
        replaced !== raw &&
        !replaced.toLowerCase().startsWith(stripped.slice(0, stripped.indexOf("://") + 3).toLowerCase())) ||
      (isScpLikeRemote(raw) && (hasUrlHost(raw) || /[\t\n\r]/.test(raw) || isScpStyleUrl(raw, replaced)))
    );
  };
  return (args !== _rawCommand && isScpLikeRemote(args) && !isScpLikeRemote(_rawCommand)) ||
    isDangerous(_rawCommand, args) ||
    isDangerous(args, args)
    ? REDACTED_URL
    : args;
}
//@ chunk-cgr0tezp.js:72410-72956 placement
/**
 * 协议中夹杂空白等的伪装 URL。
 */
function isObfuscatedSchemeUrl(text) {
  let replaced = text.replace(/^[\u0000-\u0020]+/, "");
  let match = /^[a-z+\t\n\r]*:[\t\n\r]*\/[\t\n\r]*\//i.exec(replaced);
  let schemeMatch =
    match !== null && /^(?:ssh|git|git\+ssh|ssh\+git|file):\/\/$/i.test(match[0].replace(/[\t\n\r]/g, ""))
      ? match
      : null;
  if (!schemeMatch && !isScpLikeRemote(text)) return false;
  let authorityPattern = schemeMatch
    ? /^(?:[\w.~+-]+(?::[^@/?#%\s[\]]*)?@)?(?:\w(?:[\w.-]*\w)?|\[[\da-f]*:[\da-f.]*:[\da-f:.]*\])?(?::[\w~-]*)?(?:\/|$)/i
    : /^(?:[\w.~+-]+@)?(?:\w(?:[\w.-]*\w)?|\[[\da-f]*:[\da-f.]*:[\da-f:.]*\]):/i;
  let rest = schemeMatch ? replaced.slice(schemeMatch[0].length) : text;
  let pathPart = schemeMatch ? rest.slice(Math.max(rest.indexOf("/"), 0)) : "";
  return !authorityPattern.test(rest) || /(?:@|%40)(?:\[|%5b)/i.test(pathPart);
}
//@ chunk-cgr0tezp.js:72956-73019 placement
function hasUrlHost(text) {
  try {
    return new URL(text).host !== "";
  } catch {
    return false;
  }
}
//@ chunk-cgr0tezp.js:73019-73389 placement (2.1.88 match: ghIsDangerousCallback, 0.825)
/**
 * 是否为 scp 风格地址（user@host:path）。
 */
function isScpStyleUrl(_rawCommand, args) {
  let stripped = stripLeadingSpaceAndNewlines(_rawCommand);
  let index = stripped.indexOf(":");
  let sliced = stripped.slice(0, index);
  if (index <= 0 || /[/?#]/.test(sliced) || _rawCommand.includes("://")) return false;
  let index_2 = sliced.lastIndexOf("@");
  let index_3 = stripped.indexOf("@[");
  let bracketAt = index_3 !== -1 ? index_3 + 1 : stripped.startsWith("[") ? 0 : -1;
  let sliced_2 = sliced.slice(index_2 + 1);
  if (bracketAt !== -1) {
    let index = stripped.indexOf("]", bracketAt);
    if (
      bracketAt !== index_2 + 1 ||
      stripped[index + 1] !== ":" ||
      /[/?#@\\]/.test(stripped.slice(bracketAt + 1, index))
    )
      return true;
    sliced_2 = stripped.slice(bracketAt, index + 1);
  }
  return args !== _rawCommand && args !== REDACTED_URL && !args.startsWith(`${sliced_2}:`);
}
//@ chunk-cgr0tezp.js:73389-73424 placement
function hasSensitiveUrlOrGitHubCallback(text) {
  return hasSensitiveUrlParts(text) || ghIsDangerousCallback_2(text);
}
//@ chunk-cgr0tezp.js:73424-73650 placement (2.1.88 match: ghIsDangerousCallback, 0.825)
function ghIsDangerousCallback_2(text) {
  let replaced = text.replace(/^[\u0000-\u0020]+/, "");
  let index = replaced.indexOf("://");
  if (index !== -1 && /[?#]/.test(replaced)) return true;
  let rest = firstLineOf(index === -1 ? replaced : replaced.slice(index + 3), "/");
  let index_2 = rest.lastIndexOf("@");
  return (
    index_2 !== -1 &&
    (hasColon(rest.slice(0, index_2)) || (index !== -1 && isNotSshScheme(replaced.slice(0, index))))
  );
}
//@ chunk-cgr0tezp.js:73650-73711 placement
function isNotSshScheme(scheme) {
  return !/^(?:ssh|git\+ssh|ssh\+git)$/i.test(scheme);
}
//@ chunk-cgr0tezp.js:73711-73790 placement
/**
 * stripLeadingSpaceAndNewlines：去掉前导空白与换行。
 */
function stripLeadingSpaceAndNewlines(text) {
  return text.replace(/^[\u0000-\u0020]+/, "").replace(/[\t\n\r]/g, "");
}
//@ chunk-cgr0tezp.js:73790-74046 placement
var URL_PREFIX_BOUNDARY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WEB_SCHEMES;
var GIT_SCHEMES;
var regExp_15;
deferInit("chunk-cgr0tezp.js:73790", () => {
  URL_PREFIX_BOUNDARY = "(^|[^a-z0-9+.-]|%[0-9a-f]{2})";
  WEB_SCHEMES = "https?|wss?|ftps?";
  GIT_SCHEMES = "ssh\\+git|git\\+ssh|ssh|git";
  regExp_15 = new RegExp(
    `[a-z](?:[a-z0-9+.-]{1,31}:\\/+|:\\/\\/)|(?:https?|ftps?):(?!\\/)|${URL_PREFIX_BOUNDARY}(?:wss?|file):(?!\\/)|${URL_PREFIX_BOUNDARY}(?:${GIT_SCHEMES}):(?!\\/)(?=[^@/?#\\s]*?(?::|%3a))`,
    "i",
  );
});
//@ chunk-cgr0tezp.js:74046-74424 placement
/**
 * 是否为文件类 URL。
 */
function isFileLikeUrl(text, { forDestination = false } = {}) {
  let replaced = stripLeadingSpaceAndNewlines(text).replace(/\\/g, "/");
  let queryIndex = replaced.search(/[?#]/);
  let beforeQuery = queryIndex === -1 ? replaced : replaced.slice(0, queryIndex);
  let schemeMatch =
    (forDestination ? /^[a-z][a-z0-9+.-]*:\/*/i.exec(beforeQuery) : null) ?? /:\/+/.exec(beforeQuery);
  if (!schemeMatch) return false;
  let restStart = schemeMatch.index + schemeMatch[0].length;
  let match = (forDestination ? regExp_15 : /[a-z][a-z0-9+.-]{1,31}:\/+/i).exec(beforeQuery.slice(restStart));
  let afterScheme = restStart + (match?.index ?? 0) + (match?.[0].length ?? 0);
  return (
    match !== null &&
    (replaced.includes("@", afterScheme) || /%40/i.test(firstLineOf(replaced.slice(afterScheme), "/")))
  );
}
//@ chunk-cgr0tezp.js:74424-74505 placement
function hasBackslashUserinfo(text) {
  let stripped = stripLeadingSpaceAndNewlines(text);
  if (WINDOWS_LOCAL_PATH_RE.test(stripped) || /^file:/i.test(stripped)) return false;
  return hasBackslashUserinfo_2(text);
}
//@ chunk-cgr0tezp.js:74505-74623 placement
function hasBackslashUserinfo_2(text) {
  let stripped = stripLeadingSpaceAndNewlines(text);
  let queryIndex = stripped.search(/[?#]/);
  let index = (queryIndex === -1 ? stripped : stripped.slice(0, queryIndex)).indexOf("\\");
  return index !== -1 && stripped.includes("@", index);
}
//@ chunk-cgr0tezp.js:74623-74843 layout
function hasBracketedSshHost(text) {
  let stripped = stripLeadingSpaceAndNewlines(text);
  let match = /(?:ssh|git\+ssh|ssh\+git|git):\/\//i.exec(stripped);
  if (!match) return false;
  let replaced = stripped
    .slice(match.index + match[0].length)
    .replace(/%40/gi, "@")
    .replace(/%5b/gi, "[");
  let pathBreak = replaced.search(/[/?#]/);
  return pathBreak !== -1 && replaced.includes("@[", pathBreak);
}
//@ chunk-cgr0tezp.js:74843-75015 layout
function sshHostMismatch(text, url) {
  if (!/^(?:ssh|git|git\+ssh|ssh\+git):$/i.test(url.protocol)) return false;
  let host = parseUrlScheme(stripLeadingSpaceAndNewlines(text))?.host;
  return host !== undefined && host.toLowerCase() !== decodePercentRuns(url.hostname).toLowerCase();
}
//@ chunk-cgr0tezp.js:75015-75142 layout
/**
 * 判断 URL 是否指向受限目的地（多种检测的组合）。归属疑为通用 URL 安全工具。
 */
function isRestrictedDestination(text, parsedUrl) {
  return (
    isFileLikeUrl(text, {
      forDestination: true,
    }) ||
    isFileLikeUrl(parsedUrl.href, {
      forDestination: true,
    }) ||
    hasBracketedSshHost(text) ||
    sshHostMismatch(text, parsedUrl) ||
    (parsedUrl.protocol === "file:" && hasConfusableAuthority(text))
  );
}
//@ chunk-cgr0tezp.js:75142-75296 placement (2.1.88 match: normalizeUrl, 0.695)
/**
 * 检测 URL 的反斜杠与 @ 混淆：反斜杠之后、@ 之前出现：或 %3a 视为可疑（浏览器与 URL 解析器会把它当成不同主机）。
 */
function hasConfusableAuthority(url) {
  let text = stripLeadingSpaceAndNewlines(url);
  let queryIndex = text.search(/[?#]/);
  let index = (queryIndex === -1 ? text : text.slice(0, queryIndex)).indexOf("\\");
  let index_2 = text.lastIndexOf("@");
  return index !== -1 && index_2 > index && /:|%3a/i.test(text.slice(index, index_2));
}
//@ chunk-cgr0tezp.js:75296-75461 placement
function isPlainPathLike(text) {
  return (
    /^[\w .+~@\\/-]*$/.test(text) &&
    !/\\(?:[^A-Za-z0-9@]|$)| $|\.[_~+]*\.|(?:^|\/)[_~+]*\.[_~+]*$/.test(text) &&
    !/(?:^|[^\\])@|@[^\\/ ]*(?:[/ ]|$)/.test(text)
  );
}
//@ chunk-cgr0tezp.js:75461-75562 placement (2.1.88 match: ghIsDangerousCallback, 1)
function getUrlAuthorityStart(text) {
  let index = text.indexOf("://");
  return index !== -1 && /^[a-z][a-z0-9+.-]*$/i.test(text.slice(0, index)) ? index + 3 : 0;
}
//@ chunk-cgr0tezp.js:75562-75758 placement
function userinfoEnd_2(text) {
  let index = text.indexOf("@");
  if (index === -1) return -1;
  let queryIndex = text.search(/[?#]/);
  if (queryIndex !== -1 && queryIndex < index && text.lastIndexOf("/", queryIndex) !== -1) return -1;
  let index_2 = text.indexOf("/", index);
  return text.lastIndexOf("@", index_2 === -1 ? text.length : index_2);
}
//@ chunk-cgr0tezp.js:75758-75902 placement
function hasNonHostPrefix(text, limit, stripPortSuffix) {
  let index = text.indexOf("/");
  if (index <= 0 || index > limit) return false;
  let replaced = text.slice(0, index).replace(/^\[[^\]]*\]/, "");
  return !hasColon(stripPortSuffix ? replaced.replace(/:\d+$/, "") : replaced);
}
//@ chunk-cgr0tezp.js:75902-76021 placement
/**
 * 文本中 URL 的正则与分隔字符。
 */
var URL_IN_TEXT_RE = /[a-z][a-z0-9+.-]{0,31}:\/\/[^\s'"`<>]+/gi;
var URL_BREAK_RE = /[\s'"`<>]/;
var URL_BREAK_DESCRIPTION = "whitespace, quotes, backticks or angle brackets";
//@ chunk-cgr0tezp.js:76021-76080 placement
/**
 * isPlainHttpUrl：普通 http(s) URL。
 */
function isPlainHttpUrl(url) {
  return /^https?:\/\//i.test(url) && !URL_BREAK_RE.test(url);
}
//@ chunk-cgr0tezp.js:76080-76212 placement
var AT_TOKEN_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_16;
deferInit("chunk-cgr0tezp.js:76080", () => {
  AT_TOKEN_RE = /(^|[\s'"`<>])([^\s'"`<>]*(?:@|%40)[^\s'"`<>]*)/gi;
  regExp_16 = new RegExp(
    `${URL_PREFIX_BOUNDARY}(?:${WEB_SCHEMES}):(?!\\/\\/)|${URL_PREFIX_BOUNDARY}(?:${GIT_SCHEMES}):(?!\\/\\/)`,
    "gi",
  );
});
//@ chunk-cgr0tezp.js:76212-76547 placement
/**
 * 找出 userinfo 结束位置。
 */
function userinfoEnd(text) {
  let lower = text.toLowerCase();
  let max = Math.max(lower.lastIndexOf("@"), lower.lastIndexOf("%40"));
  for (let match of text.matchAll(regExp_16)) {
    let matchEnd = match.index + match[0].length;
    if (max < matchEnd) return -1;
    let userinfoEnd = match.index + (match[1] ?? match[2] ?? "").length;
    if (match[2] === undefined) return userinfoEnd;
    let index = lower.indexOf(":", matchEnd);
    let min = Math.min(index === -1 ? max : index, max);
    if ((index !== -1 && index < max) || lower.slice(matchEnd, min).includes("%3a")) return userinfoEnd;
  }
  return -1;
}
//@ chunk-cgr0tezp.js:76547-76692 placement
/**
 * 遮盖消息中的 URL 与 userinfo。
 */
function redactUrlsInMessage(text) {
  if (!text) return text;
  return text
    .replace(URL_IN_TEXT_RE, (match) => redactUrlQuery(match))
    .replace(AT_TOKEN_RE, (match, prefix, rest) => {
      let userinfoEndIndex = userinfoEnd(rest);
      return userinfoEndIndex === -1
        ? prefix + rest
        : prefix + rest.slice(0, userinfoEndIndex) + redactUrlQuery(rest.slice(userinfoEndIndex));
    });
}
//@ chunk-cgr0tezp.js:76692-76785 placement
function ruleApplies(redactRule, forDestination, text) {
  return (
    (forDestination || redactRule.redactOnly !== true) &&
    (redactRule.prefilter === undefined || redactRule.prefilter.test(text))
  );
}
//@ chunk-cgr0tezp.js:76785-76919 placement
function redactTokensPrefix(text, startIndex) {
  for (let windowChars = startIndex + 2 * REDACT_WINDOW_CHARS; ; windowChars *= 2) {
    if (text.length <= windowChars) return redactSecretTokens(text);
    let redacted = redactSecretTokens(text.slice(0, windowChars));
    let stableLength = redacted.length - REDACT_WINDOW_CHARS;
    if (stableLength >= startIndex) return truncateToLength(redacted, stableLength);
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
  displaySafeUrl,
  URL_AUTHORITY_ESCAPE_RE,
  URL_BREAK_DESCRIPTION,
  isPlainHttpUrl,
};

/**
 * utils/errorRedaction.ts
 *
 * 2.1.316 新增：系统错误码列表（用于识别错误消息）；主机名错误消息模式等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (64)
 * attribution: placement 64
 */
import { homedir } from "os";
import { countCharInString, urlPatternToRegex } from "./stringUtils.js";
import { GENERIC_SECRET_RULES, TOKEN_AND_JWT_RULES, SHORT_PREFIX_TOKEN_RULES } from "./redactSecrets.js";
import { redactUnknownBlockType } from "../services/api/requestHeaders.js";
import { uniq } from "./collections.js";

//@ chunk-aepeg2w5.js:384217-384644 placement
/**
 * 遮盖错误信息中的用户目录、驱动器、UNC 路径。
 */
function redactPaths(e) {
  let n = e;
  let r = "";
  try {
    r = homedir();
  } catch {}
  if (r) n = n.replaceAll(r + "/", "~/").replaceAll(r + "\\", "~\\");
  let s = (h, y) => /https?:\/\/[^\s'",;|()]*$/i.test(h.slice(0, y));
  n = n
    .replace(/([/\\](?:Users|home)[/\\])[^/\\\n]+/gi, (h, y, S, w) => (s(w, S) ? h : `${y}<user>`))
    .replace(/(\/(?:Volumes|mnt|media)\/)[^/\n]+/g, (h, y, S, w) => (s(w, S) ? h : `${y}<vol>`))
    .replace(/\b([A-Za-z]):[\\/]/g, "<drv>:\\")
    .replace(/\\\\[^\\]+\\[^\\\s'",:()]+/g, "<unc>");
  return n;
}
//@ chunk-aepeg2w5.js:384644-385682 placement
/**
 * 错误遮盖用的密钥键名正则。
 */
var SECRET_KEY_PATTERN = String.raw`(?:aws[-_]?)?(?:secret[-_]?(?:access[-_]?)?key|session[-_]?token|security[-_]?token|bearer[-_]?token[-_]?bedrock)(?![A-Za-z0-9_-])`;
var SECRET_KEY_WITH_SEP_PATTERN = String.raw`(?:${SECRET_KEY_PATTERN}(?:\\{0,7}["'\`])?[ \t]*[:=][ \t]*(?:\\{0,7}["'\`])?|<${SECRET_KEY_PATTERN}>)`;
var SECRET_VALUE_NEGATIVE_LOOKAHEAD = String.raw`(?![{[(=]|arn:|~[\\/]|[a-z]:[\\/]|\\\\|(?:\.{1,2})?\/[^\s"':/]+\/[^\s"':]|[a-z][a-z0-9+.-]*:(?:[a-z][a-z0-9+.-]*:)?(?:\/\/|\\\/\\\/)|E[A-Z0-9]{1,15}: )`;
var SECRET_VALUE_CHARS_PATTERN = String.raw`(?:(?!arn:)(?!plugin:)(?!https?:\/\/)(?!bearer\s)[A-Za-z0-9_]|[+/=%.@-](?!(?:ssh|git|gs|s3|file|s?ftp|wss?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?|amqps?):\/\/)|\\\/)+`;
var regExp_3 = new RegExp(
  `(${SECRET_KEY_WITH_SEP_PATTERN})${SECRET_VALUE_NEGATIVE_LOOKAHEAD}(${SECRET_VALUE_CHARS_PATTERN})`,
  "gi",
);
var SECRET_PLACEHOLDER_VALUES = new Set([
  "undefined",
  "null",
  "none",
  "nil",
  "true",
  "false",
  "bearer",
  "basic",
]);
var REDACTION_MARKER_CHAR = "\uE000";
var REDACTION_MARKER_RE = /(?:\\?\/x){0,2}\uE000(?:x\\x\\|x)?/g;
var COLON_SEPARATOR_RE = /^:[\\/]/;
var keepPathSeparatorShape = (e, n) => {
  let r = e.split("\\/").length - 1;
  let min = Math.min(2, r);
  let min_2 = Math.min(2 - min, countCharInString(e, "/") - r);
  let y = "\\/x".repeat(min) + "/x".repeat(min_2);
  let S = COLON_SEPARATOR_RE.test(n) ? "x\\x\\" : /^arn:/i.test(n) && /\w$/.test(e) ? "x" : "";
  return y === "" && S === "" ? "" : `${y}${REDACTION_MARKER_CHAR}${S}`;
};
var trailingErrnoNameRe = /[^A-Za-z0-9](E[A-Z0-9_]{2,15})$/;
//@ chunk-aepeg2w5.js:385682-385975 placement
/**
 * 遮盖 "secret_key=… / session_token: …" 一类密钥键后的值为 <token>（保留 errno 名尾巴与路径分隔形状），跳过 null/true/bearer 等占位值和盘符路径。
 */
function redactSecretValues(e) {
  return e.replace(regExp_3, (n, r, s, h, y) => {
    if (
      SECRET_PLACEHOLDER_VALUES.has(s.replace(/\.+$/, "").toLowerCase()) ||
      (/[a-z]:$/i.test(r) && s.startsWith("\\/"))
    )
      return n;
    let S = h + n.length;
    let sliced = y.slice(S, S + 4);
    let R = sliced.startsWith(": ") ? trailingErrnoNameRe.exec(s)?.[1] : undefined;
    let x = R !== undefined && ERRNO_NAMES.includes(R) ? R : "";
    return `${r}<token>${keepPathSeparatorShape(s, sliced)}${x}`;
  });
}
//@ chunk-aepeg2w5.js:385975-386054 placement
var EMAIL_RE = /[\w.+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){0,7}\.[A-Za-z][\w-]{0,62}/g;
//@ chunk-aepeg2w5.js:386054-386100 placement
function redactEmails(e) {
  return e.replace(EMAIL_RE, "<email>");
}
//@ chunk-aepeg2w5.js:386100-386229 placement
var IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
var IPV6_RE = /\b(?:[A-Fa-f0-9]{1,4}:){2,7}(?::?[A-Fa-f0-9]{1,4}){1,7}\b/g;
var TIME_OF_DAY_RE = /^\d{1,2}:\d{2}:\d{2}$/;
//@ chunk-aepeg2w5.js:386229-386309 placement
function redactIpAddresses(e) {
  return e.replace(IPV4_RE, "<ip>").replace(IPV6_RE, (n) => (TIME_OF_DAY_RE.test(n) ? n : "<ip>"));
}
//@ chunk-aepeg2w5.js:386309-386507 placement
var PHONE_NUMBER_RE =
  /(^|[^\w/.-])((?:\+\d{1,3}[ \t.-]?)?\(?\d{2,4}\)?[ \t.-]\d{2,4}[ \t.-]\d{2,4}(?:[ \t.-]\d{2,4}(?![ \t.-]\d))?)(?!\w)/g;
var DATE_LIKE_RE = /^\s*\d{4}[-.]\d{2}[-.]\d{2}(?:[ T]\d{1,2})?\s*$/;
var E164_PHONE_RE = /\+\d{7,15}\b/g;
//@ chunk-aepeg2w5.js:386507-386642 placement
function redactPhoneNumbers(e) {
  return e
    .replace(PHONE_NUMBER_RE, (n, r, s) =>
      s.replace(/\D/g, "").length >= 7 && !DATE_LIKE_RE.test(s) ? `${r}<phone>` : `${r}${s}`,
    )
    .replace(E164_PHONE_RE, "<phone>");
}
//@ chunk-aepeg2w5.js:386642-386655 placement
var DIGIT_RE = /\d/g;
//@ chunk-aepeg2w5.js:386655-386797 placement
function redactArn(e, n, r, s) {
  let h = [n, r, s];
  return h.reduce((acc, w) => acc + (w.match(DIGIT_RE)?.length ?? 0), 0) >= 5
    ? `${e}:<redacted>`
    : `${e}:${h.join(":")}:<redacted>`;
}
//@ chunk-aepeg2w5.js:386797-386996 placement
var TOKEN_REDACTION_RULES = [
  ...GENERIC_SECRET_RULES,
  [/\barn:(aws[\w-]*):([\w-]*):([\w-]*):\d*:[^\s"')\],]*/g, (e, n, r, s) => redactArn("arn", n, r, s)],
  ...TOKEN_AND_JWT_RULES,
  [/(?<![A-Za-z0-9+_-])(?!mcp__)(?=[a-z_]*[A-Z0-9+-])[A-Za-z0-9+_-]{40,}={0,2}\b/g, "<blob>"],
];
//@ chunk-aepeg2w5.js:386996-387098 placement
function applyTokenRedactionRules(e) {
  let n = e;
  for (let [r, s] of TOKEN_REDACTION_RULES) n = typeof s === "string" ? n.replace(r, s) : n.replace(r, s);
  return n;
}
//@ chunk-aepeg2w5.js:387098-387206 placement
var JWT_LIKE_RE =
  /(?:<blob>|eyJ[A-Za-z0-9_-]{10,256})\.(?:<blob>|[A-Za-z0-9_-]{10,})\.(?:<blob>|[A-Za-z0-9_-]{10,})/g;
//@ chunk-aepeg2w5.js:387206-387288 placement
function redactJwtLike(e) {
  return SHORT_PREFIX_TOKEN_RULES.reduce((acc, [r, s]) => acc.replace(r, s), e).replace(JWT_LIKE_RE, "<jwt>");
}
//@ chunk-aepeg2w5.js:387288-387541 placement
function redactUrls(e) {
  return e
    .replace(/https?:\/\/\S+/gi, "<url>")
    .replace(
      /\b(?:ssh|git|gs|s3|file|s?ftp|wss?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?|amqps?):\/\/\S+/gi,
      "<url>",
    )
    .replace(/\b[\w.-]+\.(?:ant\.dev|anthropic\.com)\b[^\s"')\]]*/gi, "<url>");
}
//@ chunk-aepeg2w5.js:387541-388039 placement
/**
 * 路径遮盖正则。
 */
var PATH_PATTERNS = /[^"'\n]*(?:['"](?=[^\s"',;:)\]}])[^"'\n]*)*/.source;
var regExp_4 = new RegExp(String.raw`~[\\/]` + PATH_PATTERNS, "g");
var regExp_5 = new RegExp(String.raw`<drv>:\\` + PATH_PATTERNS, "g");
var regExp_6 = new RegExp(String.raw`[A-Za-z]:\\` + PATH_PATTERNS, "g");
var regExp_7 = new RegExp(String.raw`<unc>[\\/]?` + PATH_PATTERNS, "g");
var regExp_8 = new RegExp(String.raw`\\\\(?=[^"'\n])` + PATH_PATTERNS, "g");
var regExp_9 = new RegExp(String.raw`(?:[^\s"'\\]+\\){2,}` + PATH_PATTERNS, "g");
var regExp_10 = new RegExp(String.raw`(?:\/[^\s"':]+){2,}` + PATH_PATTERNS, "g");
var ERRNO_QUOTED_NAME_PATTERN = String.raw`E[A-Z0-9]+: [^,'\n]{1,80}, [a-z]\w{0,31} '`;
var regExp_11 = new RegExp(String.raw`\b(${ERRNO_QUOTED_NAME_PATTERN})[^]*`, "g");
//@ chunk-aepeg2w5.js:388039-388236 placement
function redactPathShapes(e) {
  return e
    .replace(regExp_11, "$1<path>'")
    .replace(regExp_4, "~/<path>")
    .replace(regExp_5, "<path>")
    .replace(regExp_6, "<path>")
    .replace(regExp_7, "<path>")
    .replace(regExp_8, "<path>")
    .replace(regExp_9, "<path>")
    .replace(regExp_10, "<path>");
}
//@ chunk-aepeg2w5.js:388236-388401 placement
var API_ERROR_JSON_START = String.raw`\{\s*\\?["'](?:type\\?["']\s*:\s*\\?["']error|request_id\\?["']\s*:\s*\\?["']req_|error\\?["']\s*:\s*\{)`;
var regExp_12 = new RegExp(String.raw`${API_ERROR_JSON_START}[^]*`, "g");
//@ chunk-aepeg2w5.js:388401-388456 placement
function redactApiErrorBody(e) {
  return e.replace(regExp_12, "<api-error-body>");
}
//@ chunk-aepeg2w5.js:388456-388668 placement
function redactMcpServerNames(e) {
  return e
    .replace(/\bmcp__[A-Za-z0-9_-]+__([A-Za-z0-9_-]+)/g, "mcp__<server>__$1")
    .replace(/\bmcp__[A-Za-z0-9_-]+/g, "mcp__<server>")
    .replace(/\bplugin:[^\s:"')\],]+:[^\s"')\],]*/g, "plugin:<server>");
}
//@ chunk-aepeg2w5.js:388668-388731 placement
var HTTP_POST_ERROR_RE = /(Error POSTing to endpoint(?: \(HTTP \d+\))?:\s*)[^]*/;
//@ chunk-aepeg2w5.js:388731-388833 placement
function redactHttpBodies(e) {
  try {
    return e.replace(HTTP_POST_ERROR_RE, (n, r) => `${r}<http-body.${n.length - r.length}>`);
  } catch {
    return e;
  }
}
//@ chunk-aepeg2w5.js:388833-389000 placement
var INVALID_HEADER_VALUE_RE = /(Header '[A-Za-z0-9!#$%&'*+.^_`|~-]+' has invalid value: )[^]*/;
var INVALID_HEADER_RE =
  /(Headers\.(?:append|set): )\\?"(?:[^]*\\?"( is an invalid header (?:name|value)\.)$|[^]*)/;
//@ chunk-aepeg2w5.js:389000-389080 placement
/**
 * 把无效的 HTTP 头值（非法头名或控制字符）替换为 <redacted>，保留前缀。
 */
function redactInvalidHeaderValues(e) {
  return e.replace(INVALID_HEADER_VALUE_RE, "$1<redacted>").replace(INVALID_HEADER_RE, "$1<redacted>$2");
}
//@ chunk-aepeg2w5.js:389080-389570 placement
/**
 * 遮盖占位符名与标识符格式。
 */
var REDACTION_TOKENS = 120;
var PLACEHOLDER_TOKEN_RE = /^#?[A-Za-z_$][\w$]*$/;
var ALLOWED_PLACEHOLDER_NAMES = [
  "user",
  "vol",
  "drv",
  "path",
  "email",
  "ip",
  "phone",
  "token",
  "jwt",
  "blob",
  "url",
  "userinfo",
  "server",
  "host",
  "redacted",
  "api-error-body",
];
var NUMBERED_PLACEHOLDER_NAMES = ["http-body", "domains", "tags", "non-identifier"];
var regExp_13 = new RegExp(
  `^<(?:${ALLOWED_PLACEHOLDER_NAMES.map(urlPatternToRegex).join("|")}|(?:${NUMBERED_PLACEHOLDER_NAMES.map(urlPatternToRegex).join("|")})\\.\\d+)>$`,
);
var MAX_PLACEHOLDER_LENGTH = 40;
var NOT_DEFINED_SUFFIX = " is not defined";
var CANNOT_ACCESS_PREFIX = "Cannot access '";
var BEFORE_INIT_SUFFIX = "' before initialization";
var UNDEFINED_VARIABLE_PREFIXES = ["Can't find private variable: PrivateSymbol.", "Can't find variable: "];
var TRAILING_PUNCTUATION_RE = /[)\]}'"`.,; \t\r\n]*$/;
var TRAILER_SCAN_LENGTH = 8;
//@ chunk-aepeg2w5.js:389570-389615 placement
function nonIdentifierPlaceholder(e) {
  return `<non-identifier.${e}>`;
}
//@ chunk-aepeg2w5.js:389615-389703 placement
function sanitizeIdentifierSegment(e) {
  return (e.length <= REDACTION_TOKENS && PLACEHOLDER_TOKEN_RE.test(e)) ||
    (e.length <= MAX_PLACEHOLDER_LENGTH && regExp_13.test(e))
    ? e
    : nonIdentifierPlaceholder(e.length);
}
//@ chunk-aepeg2w5.js:389703-389809 placement
function findTrailerStart(e, n) {
  let sliced = e.slice(-TRAILER_SCAN_LENGTH);
  let s = e.length - sliced.length + sliced.search(TRAILING_PUNCTUATION_RE);
  return e.endsWith(n, s) ? s - n.length : -1;
}
//@ chunk-aepeg2w5.js:389809-389903 placement
function redactUndefinedVariable(e) {
  let trailerStart = findTrailerStart(e, NOT_DEFINED_SUFFIX);
  if (trailerStart < 0) return e;
  return (
    (trailerStart <= REDACTION_TOKENS
      ? sanitizeIdentifierSegment(e.slice(0, trailerStart))
      : nonIdentifierPlaceholder(trailerStart)) + e.slice(trailerStart)
  );
}
//@ chunk-aepeg2w5.js:389903-390081 placement
function truncateAfterMarkers(e) {
  let index = e.indexOf(CANNOT_ACCESS_PREFIX);
  let r = index + CANNOT_ACCESS_PREFIX.length;
  let trailerStart = findTrailerStart(e, BEFORE_INIT_SUFFIX);
  let h = index < 0 ? e : replaceSpanWithSanitized(e, r, trailerStart < r ? e.length : trailerStart);
  return UNDEFINED_VARIABLE_PREFIXES.reduce((acc, S) => {
    let index = acc.indexOf(S);
    return index < 0 ? acc : replaceSpanWithSanitized(acc, index + S.length, acc.length);
  }, h);
}
//@ chunk-aepeg2w5.js:390081-390148 placement
function replaceSpanWithSanitized(e, n, r) {
  return e.slice(0, n) + sanitizeIdentifierSegment(e.slice(n, r)) + e.slice(r);
}
//@ chunk-aepeg2w5.js:390148-390332 placement
var UA_BLOCKED_DOMAINS_RE =
  /(domains are not accessible to our user agent)(?!:? ?(?:<domains\.\d+>\. Read more: |<redacted>$))(:? ?)(?:\[('[a-z0-9._-]+'(?:, '[a-z0-9._-]+')*)\](?=\. Read more: )|[^]*)/gi;
//@ chunk-aepeg2w5.js:390332-390460 placement
function redactBlockedDomains(e) {
  return e.replace(
    UA_BLOCKED_DOMAINS_RE,
    (n, r, s, h) =>
      `${r}${s || ": "}${h === undefined ? "<redacted>" : `<domains.${h.split("', '").length}>`}`,
  );
}
//@ chunk-aepeg2w5.js:390460-392131 placement
/**
 * 主机名错误消息模式。
 */
var HOSTNAME_ERROR_PATTERNS = [
  String.raw`Hostname is too long\. Public domain names are required\.`,
  String.raw`Hostname contains non-ASCII characters that do not form a valid internationalized domain name\. Public domain names are required\.`,
  String.raw`Host is a non-canonical IP address literal \(resolves to <ip>\)\. Use the dotted-quad form or a domain name\.`,
  String.raw`Host looks like an IP address but could not be parsed\. Public domain names are required\.`,
  String.raw`IP address is in a restricted range \((?:<ip>|::1|::|fe80::|fc00::|ff00::)\/\d{1,3}\)\. Public domain names are required\.`,
  String.raw`Hostname matches restricted pattern \(e\.g\., (?:localhost|\*\.local|\*\.internal|\*\.localdomain)\)\. Public domain names are required\.`,
];
var PRIVATE_VARIABLE_PREFIX = String.raw`(Cannot use ')[^]*'?`;
var DOMAIN_FIELD_NAMES = ["allowed_domains", "blocked_domains"];
var DOMAIN_FIELD_SUFFIX = String.raw` in (?:${DOMAIN_FIELD_NAMES.join("|")}): `;
var regExp_14 = new RegExp(
  String.raw`${PRIVATE_VARIABLE_PREFIX}(${DOMAIN_FIELD_SUFFIX})(${HOSTNAME_ERROR_PATTERNS.join("|")})?[^]*`,
  "g",
);
var regExp_15 = new RegExp(String.raw`${PRIVATE_VARIABLE_PREFIX}(${DOMAIN_FIELD_SUFFIX}[^\n]*)[^]*`);
var regExp_16 = new RegExp(String.raw`('${DOMAIN_FIELD_SUFFIX})(${HOSTNAME_ERROR_PATTERNS.join("|")})?[^]*`);
var INVALID_DOMAIN_FORMAT_RE =
  /(Invalid domain format: )(?:[^]*( in (?:allowed|blocked)_domains(?: contains (?:a newline|whitespace|'[*?]')\.(?: Wildcards, whitespace, and line breaks are not supported; provide a plain hostname like 'example\.com'\.)?|\.(?!\w)))[^]*|[^]*)/g;
var INVALID_DOMAIN_VALUE_RE =
  /((?:allowed|blocked)_domains: ')(?:[^]*'?( is not a valid domain format\. Domains should follow the format example\.com or example\.com\/path\.)[^]*|[^]*)/g;
var UNSUPPORTED_ENTRIES_RE = /([Tt]hese entries (?:are not supported|have a path): )[^]*/g;
var ORG_BLOCKED_CONFLICT_RE =
  /(entries conflict with domains blocked by your organization: )(?:[^]*(\. Remove them from `allowed_domains`, or ask an organization admin to unblock them\.)[^]*|[^]*)/g;
//@ chunk-aepeg2w5.js:392131-392192 placement
function hasDomainFieldError(e) {
  return DOMAIN_FIELD_NAMES.some((n) => e.includes(` in ${n}: `));
}
//@ chunk-aepeg2w5.js:392192-392254 placement
function redactDomainErrorValue(e) {
  return hasDomainFieldError(e) ? e.replace(regExp_15, "$1<redacted>'$2") : e;
}
//@ chunk-aepeg2w5.js:392254-392562 placement
/**
 * 遮盖引号中的值。
 */
function redactQuotedValues(e) {
  return (
    hasDomainFieldError(e)
      ? e
          .replace(regExp_14, (r, s, h, y) => `${s}<redacted>'${h}${y ?? "<redacted>"}`)
          .replace(regExp_16, (r, s, h) => `${s}${h ?? "<redacted>"}`)
      : e
  )
    .replace(INVALID_DOMAIN_FORMAT_RE, (r, s, h) => `${s}<redacted>${h ?? ""}`)
    .replace(INVALID_DOMAIN_VALUE_RE, (r, s, h) => `${s}<redacted>'${h ?? ""}`)
    .replace(UNSUPPORTED_ENTRIES_RE, "$1<redacted>")
    .replace(ORG_BLOCKED_CONFLICT_RE, (r, s, h) => `${s}<redacted>${h ?? ""}`);
}
//@ chunk-aepeg2w5.js:392562-392633 placement
var ARN_RE = /(arn):(aws[\w*?-]*|\*):([\w*?-]*):([\w*?-]*):[\d*?]*:[^\n]*/gi;
//@ chunk-aepeg2w5.js:392633-392694 placement
function redactArnValues(e) {
  return e.replace(ARN_RE, (n, r, s, h, y) => redactArn(r, s, h, y));
}
//@ chunk-aepeg2w5.js:392694-393097 placement
/**
 * 各种引号的正则与证书主机名错误模式。
 */
var QUOTE_PATTERN = String.raw`(?:'|\\'|\\u0027|&#0*39;|&#[xX]0*27;|&apos;|\u2019|&#0*8217;|&#[xX]0*2019;|&rsquo;)`;
var regExp_17 = new RegExp(
  String.raw`(Hostname(?:\/|\\\/|\\u002[Ff])IP does(?: not|n${QUOTE_PATTERN}t) match certificate)[^]*`,
);
var regExp_18 = new RegExp(
  String.raw`\b(Host: )\S*?(\. is not (?:in the cert${QUOTE_PATTERN}s altnames|cert${QUOTE_PATTERN}s CN): )[^]*|\b(IP: )\S+( is not in the cert${QUOTE_PATTERN}s list: )[^]*|\b(Cert does not contain a DNS name)[^]+`,
);
//@ chunk-aepeg2w5.js:393097-393374 placement
function redactTlsAltnames(e) {
  let replaced = e.replace(regExp_17, "$1's altnames: <redacted>");
  let match = regExp_18.exec(replaced);
  if (!match) return replaced;
  let [, s, h, y, S, w] = match;
  let sliced = replaced.slice(0, match.index);
  if (s !== undefined) return `${sliced}${s}<host>${h}<redacted>`;
  if (y !== undefined) return `${sliced}${y}<ip>${S}<redacted>`;
  return `${sliced}${w === undefined ? "" : `${w} `}<redacted>`;
}
//@ chunk-aepeg2w5.js:393374-393635 placement
var COMMAND_PREFIX_BOUNDARY = String.raw`(?:\b|\\[nrt]|\x1b\[[0-9;?]{0,20}[A-Za-z]|\\u001[bB]\[[0-9;?]{0,20}[A-Za-z]|_)`;
var regExp_19 = new RegExp(
  String.raw`(${COMMAND_PREFIX_BOUNDARY}Command (?:(?:failed with|timed out after|was killed with) [^:\n]{0,200}|was (?:gracefully )?canceled[^:\n]{0,200}|failed): )[^]*`,
);
//@ chunk-aepeg2w5.js:393635-393686 placement
function redactCommandOutput(e) {
  return e.replace(regExp_19, "$1<redacted>");
}
//@ chunk-aepeg2w5.js:393686-395843 placement
/**
 * 系统错误码列表（用于识别错误消息）。
 */
var ERRNO_NAMES = `
  E2BIG EACCES EADDRINUSE EADDRNOTAVAIL EADV EAFNOSUPPORT EAGAIN
  EAI_ADDRFAMILY EAI_AGAIN EAI_BADFLAGS EAI_BADHINTS EAI_CANCELED EAI_FAIL
  EAI_FAMILY EAI_MEMORY EAI_NODATA EAI_NONAME EAI_OVERFLOW EAI_PROTOCOL
  EAI_SERVICE EAI_SOCKTYPE EALREADY EAUTH EBADARCH EBADE EBADEXEC EBADF EBADFD
  EBADMACHO EBADMSG EBADR EBADRPC EBADRQC EBADSLT EBFONT EBUSY ECANCELED
  ECHARSET ECHILD ECHRNG ECOMM ECONNABORTED ECONNREFUSED ECONNRESET EDEADLK
  EDEADLOCK EDESTADDRREQ EDEVERR EDOM EDOTDOT EDQUOT EEXIST EFAULT EFBIG
  EFTYPE EHOSTDOWN EHOSTUNREACH EHWPOISON EIDRM EILSEQ EINPROGRESS EINTR
  EINVAL EIO EISCONN EISDIR EISNAM EKEYEXPIRED EKEYREJECTED EKEYREVOKED EL2HLT
  EL2NSYNC EL3HLT EL3RST ELIBACC ELIBBAD ELIBEXEC ELIBMAX ELIBSCN ELNRNG ELOOP
  EMEDIUMTYPE EMFILE EMLINK EMSGSIZE EMULTIHOP ENAMETOOLONG ENAVAIL ENEEDAUTH
  ENETDOWN ENETRESET ENETUNREACH ENFILE ENOANO ENOATTR ENOBUFS ENOCSI ENODATA
  ENODEV ENOENT ENOEXEC ENOKEY ENOLCK ENOLINK ENOMEDIUM ENOMEM ENOMSG ENONET
  ENOPKG ENOPOLICY ENOPROTOOPT ENOSPC ENOSR ENOSTR ENOSYS ENOTBLK ENOTCONN
  ENOTDIR ENOTEMPTY ENOTNAM ENOTRECOVERABLE ENOTSOCK ENOTSUP ENOTTY ENOTUNIQ
  ENXIO EOF EOPNOTSUPP EOVERFLOW EOWNERDEAD EPERM EPFNOSUPPORT EPIPE EPROCLIM
  EPROCUNAVAIL EPROGMISMATCH EPROGUNAVAIL EPROTO EPROTONOSUPPORT EPROTOTYPE
  EPWROFF EQFULL ERANGE EREMCHG EREMOTE EREMOTEIO ERESTART ERFKILL EROFS
  ERPCMISMATCH ESHLIBVERS ESHUTDOWN ESOCKTNOSUPPORT ESPIPE ESRCH ESRMNT ESTALE
  ESTRPIPE ETIME ETIMEDOUT ETOOMANYREFS ETXTBSY EUCLEAN EUNATCH EUNKNOWN
  EUSERS EWOULDBLOCK EXDEV EXFULL
`
  .trim()
  .split(/\s+/);
var $Ei = Object.freeze([...ERRNO_NAMES]);
var ERRNO_NAME_PATTERN = String.raw`(?=E[A-Z0-9]|U)(?:${ERRNO_NAMES.join("|")}|UNKNOWN|Unknown system error -?\d+)`;
var SPAWN_ARG_LINE_PATTERN = String.raw`(?:(?!'${DOMAIN_FIELD_SUFFIX}|\b${ERRNO_QUOTED_NAME_PATTERN})[^\n])+`;
var SPAWN_LINE_BREAK = String.raw`(?:\r?\n\s*(?=\S))?`;
var OPTIONAL_NEWLINE = String.raw`(?:\n\s*)?`;
var SPAWN_ERRNO_TAIL = String.raw`( (?:${ERRNO_NAME_PATTERN})(?![A-Za-z0-9\-/]|_\w|\\(?!["\\/bfnrt]|u[0-9A-Fa-f]{4})|\.\w))[^]*`;
var regExp_20 = new RegExp(
  String.raw`(${COMMAND_PREFIX_BOUNDARY}spawn(?:Sync)? )${SPAWN_LINE_BREAK}${SPAWN_ARG_LINE_PATTERN}${OPTIONAL_NEWLINE}${SPAWN_ERRNO_TAIL}`,
  "g",
);
var regExp_21 = new RegExp(
  String.raw`(${COMMAND_PREFIX_BOUNDARY}spawn(?:Sync)? )${SPAWN_LINE_BREAK}[^\n]+(?:\n\s*(?=\S)[^\n]*)?(\u2026<truncated>)$`,
);
var EXECUTABLE_NOT_FOUND_RE = /(Executable not found in \$PATH: )(?!<redacted>$)[^]*/;
var regExp_22 = new RegExp(String.raw` (?:${ERRNO_NAME_PATTERN})`);
//@ chunk-aepeg2w5.js:395843-395939 placement
function redactSpawnCommandLine(e) {
  return (regExp_22.test(e) ? e.replace(regExp_20, "$1<redacted>$2") : e).replace(
    regExp_21,
    "$1<redacted>$2",
  );
}
//@ chunk-aepeg2w5.js:395939-396072 placement
function redactSpawnPaths(e) {
  let n = e.includes("spawn") ? redactSpawnCommandLine(e) : e;
  return n.includes("Executable not found in $PATH: ")
    ? n.replace(EXECUTABLE_NOT_FOUND_RE, "$1<redacted>")
    : n;
}
//@ chunk-aepeg2w5.js:396072-396627 placement
/**
 * 模块加载错误消息模式。
 */
var MODULE_ERROR_PATTERNS = String.raw`[A-Z][A-Za-z0-9_]{1,63}`;
var MODULE_ERROR_PREFIXES = [
  String.raw`${MODULE_ERROR_PATTERNS} (?:reading|parsing data url|decoding data|(?:while )?resolving(?: package| preload)?)`,
  "Cannot find (?:module|package)",
  "Cannot resolve invalid (?:data )?URL",
  "Cannot read directory",
  "Module not found",
  "preload not found",
  String.raw`\d+ errors building`,
  "Unexpected pending import in",
];
var regExp_23 = new RegExp(
  String.raw`(${COMMAND_PREFIX_BOUNDARY}(?:${MODULE_ERROR_PREFIXES.join("|")}) )\\*["'][^]*`,
);
var BUILD_ERROR_PREFIXES = ["No such built-in module:", String.raw`${MODULE_ERROR_PATTERNS} while building`];
var regExp_24 = new RegExp(
  String.raw`(${COMMAND_PREFIX_BOUNDARY}(?:${BUILD_ERROR_PREFIXES.join("|")}) )(?!<redacted>$)[^]*`,
);
//@ chunk-aepeg2w5.js:396627-396705 placement
function redactModuleLoadErrors(e) {
  return e.replace(regExp_23, "$1<redacted>").replace(regExp_24, "$1<redacted>");
}
//@ chunk-aepeg2w5.js:396705-396927 placement
var INPUT_TAG_MISMATCH_RE =
  /(Input tag ')(?:([^]*)' found using 'type' does not match any of the expected tags: ('[\w.-]{1,64}'(?:, '[\w.-]{1,64}')*|<tags\.\d{1,4}>)$|[^]*)/;
var INPUT_TAG_MISMATCH_MIDDLE = "' found using 'type' does not match any of the expected tags: ";
//@ chunk-aepeg2w5.js:396927-397100 placement
function redactInputTagMismatch(e) {
  let replaced = e.replace(INPUT_TAG_MISMATCH_RE, (r, s, h, y) =>
    h === undefined || y === undefined
      ? `${s}<redacted>`
      : `${s}${redactUnknownBlockType(h)}${INPUT_TAG_MISMATCH_MIDDLE}${tagListPlaceholder(y)}`,
  );
  return replaced.length > MAX_REDACTED_LENGTH
    ? replaced.replace(INPUT_TAG_MISMATCH_RE, (r, s) => `${s}<redacted>`)
    : replaced;
}
//@ chunk-aepeg2w5.js:397100-397194 placement
function tagListPlaceholder(e) {
  return e.startsWith("<tags.") ? e : `<tags.${e.slice(1, -1).split("', '").length}>`;
}
//@ chunk-aepeg2w5.js:397194-398158 placement
/**
 * DNS 错误消息模式。
 */
var DNS_ERROR_PATTERNS = [
  "getaddrinfo",
  "getnameinfo",
  "getHostByAddr",
  "query(?:A|Aaaa|Any|Caa|Cname|Mx|Naptr|Ns|Ptr|Soa|Srv|Tlsa|Txt)",
  "connect",
];
var DNS_CALL_PATTERN = `(?:${DNS_ERROR_PATTERNS.join("|")})`;
var DNS_ERRNO_PREFIX = String.raw`${DNS_CALL_PATTERN} E[A-Z][A-Z0-9_]{1,30} `;
var HOSTNAME_BREAK_CHARS = String.raw`\s"'\`,;()<>[\]{}\\\u2026`;
var HOSTNAME_QUOTE_PATTERN = String.raw`(?:"{1,2}|[,;'\`(){}]+)`;
var NOT_DNS_OR_ERRNO = String.raw`(?!\b(?:${DNS_ERRNO_PREFIX}|${ERRNO_QUOTED_NAME_PATTERN}))`;
var NOT_API_ERROR_JSON = String.raw`(?![,;'\`(){}]*${API_ERROR_JSON_START})`;
var joined = uniq([...DNS_ERROR_PATTERNS.map((e) => e.charAt(0)), "E"]).join("");
var HOST_SEGMENT_CHARS = String.raw`[^${HOSTNAME_BREAK_CHARS}${joined}]*`;
var HOST_SEGMENT_PATTERN = String.raw`${HOST_SEGMENT_CHARS}(?:(?:${NOT_DNS_OR_ERRNO}[${joined}]+|${NOT_API_ERROR_JSON}${HOSTNAME_QUOTE_PATTERN}${NOT_DNS_OR_ERRNO}[^${HOSTNAME_BREAK_CHARS}])${HOST_SEGMENT_CHARS})*`;
var HOST_FIRST_SEGMENT = String.raw`${NOT_DNS_OR_ERRNO}(?![A-Za-z]:[\\/]|\.{1,2}[\\/])[^${HOSTNAME_BREAK_CHARS}/~]${HOST_SEGMENT_PATTERN}`;
var regExp_25 = new RegExp(
  String.raw`\b(${DNS_ERRNO_PREFIX})(["'\`({])?(${HOST_FIRST_SEGMENT})( ${NOT_DNS_OR_ERRNO}\3${HOST_SEGMENT_PATTERN})?`,
  "g",
);
var HOSTNAME_TRAILING_PUNCT_RE = /[^.,;:!?'"`)}~][.,;:!?'"`)}~]*$/;
var IPV4_WITH_PORT_RE = /^(?:\d{1,3}\.){3}\d{1,3}(:\d{1,5})?$/;
var IPV6_LIKE_RE = /^[0-9A-Fa-f.]*:[0-9A-Fa-f.]*:[0-9A-Fa-f:.]*$/;
var UNDEFINED_PLACEHOLDER_RE = /^(?:undefined|null)(?::\d{1,5})?$/;
var PORT_SUFFIX_RE = /:\d{1,5}$/;
var SHORT_NUMBER_RE = /^\d{1,4}$/;
var AUTH_SCHEME_RE = /^(?:([^]*)([^A-Za-z0-9]))?(bearer|basic)$/i;
var HOME_TILDE_RE = /~\//;
var DRIVE_PATH_RE = /\b[A-Za-z]:\//;
var TRAILING_ROOT_RE = /(?:~|[A-Za-z]:)$/;
var MULTI_SEGMENT_PATH_RE = /(?:\/[^\s"':]+){2}/;
//@ chunk-aepeg2w5.js:398158-398412 placement
function redactHostPrefix(e) {
  let n = e.search(HOSTNAME_TRAILING_PUNCT_RE) + 1;
  if (n === 0) return e;
  let sliced = e.slice(0, n);
  let sliced_2 = e.slice(n);
  let match = IPV4_WITH_PORT_RE.exec(sliced);
  if (match) return `<ip>${match[1] ?? ""}${sliced_2}`;
  if (IPV6_LIKE_RE.test(sliced)) return `<ip>${sliced_2}`;
  if (IPV6_LIKE_RE.test(e)) return "<ip>";
  if (UNDEFINED_PLACEHOLDER_RE.test(sliced)) return e;
  return `<host>${PORT_SUFFIX_RE.exec(sliced)?.[0] ?? ""}${sliced_2}`;
}
//@ chunk-aepeg2w5.js:398412-398606 placement = ghIsDangerousCallback (0.806)
function ghIsDangerousCallback(_rawCommand, args) {
  if (_rawCommand.includes("://")) return -1;
  let r = _rawCommand.search(HOME_TILDE_RE);
  if (r > 0) return r;
  let s = _rawCommand.search(DRIVE_PATH_RE);
  if (s >= 0) return s;
  let h = args ? _rawCommand.search(TRAILING_ROOT_RE) : -1;
  if (h >= 0) return h;
  let y = _rawCommand.search(MULTI_SEGMENT_PATH_RE);
  return y > 0 ? y : -1;
}
//@ chunk-aepeg2w5.js:398606-398790 placement
function redactHostSegment(e, n) {
  if (SHORT_NUMBER_RE.test(e)) return e;
  let r = ghIsDangerousCallback(e, n);
  if (r >= 0) return redactHostPrefix(e.slice(0, r)) + e.slice(r);
  let match = AUTH_SCHEME_RE.exec(e);
  if (match) {
    let [, h = "", y = "", S = ""] = match;
    return (h === "" ? "" : redactHostPrefix(h)) + y + S;
  }
  return redactHostPrefix(e);
}
//@ chunk-aepeg2w5.js:398790-398842 placement
var regExp_26 = new RegExp(String.raw`\b${ERRNO_QUOTED_NAME_PATTERN}|${API_ERROR_JSON_START}`);
var HOST_SCAN_WINDOW = 160;
//@ chunk-aepeg2w5.js:398842-398963 placement
function redactHostBeforePort(e, n, r) {
  let match = regExp_26.exec(n);
  return match !== null && match.index < e.length
    ? redactHostSegment(e.slice(0, match.index), false) + e.slice(match.index)
    : redactHostSegment(e, r);
}
//@ chunk-aepeg2w5.js:398963-399150 placement
function redactHostnames(e) {
  return e.replace(regExp_25, (n, r, s, h, y, S) => {
    let w = S + n.length;
    let R = e[w] === "\\";
    return (
      r +
      (s ?? "") +
      redactHostSegment(h, y === undefined && R) +
      (y === undefined
        ? ""
        : ` ${redactHostBeforePort(y.slice(1), e.slice(w - y.length + 1, w + HOST_SCAN_WINDOW), R)}`)
    );
  });
}
//@ chunk-aepeg2w5.js:399150-399312 placement
var regExp_27 = new RegExp(
  String.raw`(<host>(?::\d{1,5})?[.,;:!?~\`(){}'"]*)[\\\[\]<>\u2026]` +
    String.raw`(?:[^\s"'/]|['"](?=[^\s"',;:)\]}])){0,255}(?:\/|<path>)` +
    PATH_PATTERNS,
  "g",
);
//@ chunk-aepeg2w5.js:399312-399359 placement
function redactPathAfterHost(e) {
  return e.replace(regExp_27, "$1<path>");
}
//@ chunk-aepeg2w5.js:399359-399528 placement
/**
 * 把错误消息中出现的 path/dest 路径替换为 <path>（长路径优先）。
 */
function redactErrorPaths(e, n) {
  let r = e;
  return [r?.path, r?.dest]
    .filter((s) => typeof s === "string" && s.length > 0)
    .sort((s, h) => h.length - s.length)
    .reduce((acc, h) => acc.split(h).join("<path>"), n);
}
//@ chunk-aepeg2w5.js:399528-399540 placement
var MAX_REDACTED_LENGTH = 4000;
//@ chunk-aepeg2w5.js:399540-399969 placement
/**
 * 对错误消息依次遮盖路径、密钥、邮箱、IP、URL 等后截断。
 */
function redactErrorMessage(e) {
  let n = redactUndefinedVariable(e);
  let replaced = (
    n.length > MAX_REDACTED_LENGTH ? n.slice(0, MAX_REDACTED_LENGTH) + "\u2026<truncated>" : n
  ).replaceAll(REDACTION_MARKER_CHAR, "\uFFFD");
  let s = redactDomainErrorValue(replaced);
  let h = redactHttpBodies(s);
  let y = redactBlockedDomains(h);
  let S = redactInvalidHeaderValues(y);
  let w = truncateAfterMarkers(S);
  let R = redactTlsAltnames(w);
  let x = redactCommandOutput(R);
  let P = redactSpawnPaths(x);
  let F = redactModuleLoadErrors(P);
  let L = redactInputTagMismatch(F);
  let replaced_2 = redactHostnames(L)
    .replace(/:\/\/[^\s/]*@(?=[^@\s]*(?:[/:\s]|$))/g, "://<userinfo>@")
    .replace(/\b[\w][\w.+-]*@[\w.-]+:[^\s"')\]]*(?:\/[^\s"')\]]*|\.git\b)/gi, "<url>");
  let ee = redactSecretValues(replaced_2);
  let q = redactMcpServerNames(
    redactPhoneNumbers(applyTokenRedactionRules(redactIpAddresses(redactEmails(redactPaths(ee))))),
  );
  return redactJwtLike(
    redactArnValues(
      redactPathAfterHost(redactQuotedValues(redactPathShapes(redactUrls(redactApiErrorBody(q))))),
    ),
  ).replace(REDACTION_MARKER_RE, "");
}
export { redactInvalidHeaderValues, redactErrorMessage, redactErrorPaths, $Ei };

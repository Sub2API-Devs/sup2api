/**
 * utils/errorRedaction.ts
 *
 * 2.1.316 新增：系统错误码列表（用于识别错误消息）；主机名错误消息模式等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (64)
 * attribution: placement 64
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { homedir } from "os";
import { countCharInString, urlPatternToRegex } from "./stringUtils.js";
import { GENERIC_SECRET_RULES, TOKEN_AND_JWT_RULES, SHORT_PREFIX_TOKEN_RULES } from "./redactSecrets.js";
import { redactUnknownBlockType } from "../services/api/requestHeaders.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:395605-396032 placement
/**
 * 遮盖错误信息中的用户目录、驱动器、UNC 路径。
 */
function redactPaths(text) {
  let current = text;
  let result = "";
  try {
    result = homedir();
  } catch {}
  if (result) current = current.replaceAll(result + "/", "~/").replaceAll(result + "\\", "~\\");
  let isUrlPrefix = (prefixText, endIndex) =>
    /https?:\/\/[^\s'",;|()]*$/i.test(prefixText.slice(0, endIndex));
  current = current
    .replace(/([/\\](?:Users|home)[/\\])[^/\\\n]+/gi, (matchText, homePrefix, offset, fullText) =>
      isUrlPrefix(fullText, offset) ? matchText : `${homePrefix}<user>`,
    )
    .replace(/(\/(?:Volumes|mnt|media)\/)[^/\n]+/g, (matchText, mountPrefix, offset, fullText) =>
      isUrlPrefix(fullText, offset) ? matchText : `${mountPrefix}<vol>`,
    )
    .replace(/\b([A-Za-z]):[\\/]/g, "<drv>:\\")
    .replace(/\\\\[^\\]+\\[^\\\s'",:()]+/g, "<unc>");
  return current;
}
//@ chunk-exfmq47h.js:396032-397070 placement
/**
 * 错误遮盖用的密钥键名正则。
 */
var SECRET_KEY_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SECRET_KEY_WITH_SEP_PATTERN;
var SECRET_VALUE_NEGATIVE_LOOKAHEAD;
var SECRET_VALUE_CHARS_PATTERN;
var regExp_3;
var SECRET_PLACEHOLDER_VALUES;
var REDACTION_MARKER_CHAR;
var REDACTION_MARKER_RE;
var COLON_SEPARATOR_RE;
var keepPathSeparatorShape;
var trailingErrnoNameRe;
deferInit("chunk-exfmq47h.js:396032", () => {
  SECRET_KEY_PATTERN = String.raw`(?:aws[-_]?)?(?:secret[-_]?(?:access[-_]?)?key|session[-_]?token|security[-_]?token|bearer[-_]?token[-_]?bedrock)(?![A-Za-z0-9_-])`;
  SECRET_KEY_WITH_SEP_PATTERN = String.raw`(?:${SECRET_KEY_PATTERN}(?:\\{0,7}["'\`])?[ \t]*[:=][ \t]*(?:\\{0,7}["'\`])?|<${SECRET_KEY_PATTERN}>)`;
  SECRET_VALUE_NEGATIVE_LOOKAHEAD = String.raw`(?![{[(=]|arn:|~[\\/]|[a-z]:[\\/]|\\\\|(?:\.{1,2})?\/[^\s"':/]+\/[^\s"':]|[a-z][a-z0-9+.-]*:(?:[a-z][a-z0-9+.-]*:)?(?:\/\/|\\\/\\\/)|E[A-Z0-9]{1,15}: )`;
  SECRET_VALUE_CHARS_PATTERN = String.raw`(?:(?!arn:)(?!plugin:)(?!https?:\/\/)(?!bearer\s)[A-Za-z0-9_]|[+/=%.@-](?!(?:ssh|git|gs|s3|file|s?ftp|wss?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?|amqps?):\/\/)|\\\/)+`;
  regExp_3 = new RegExp(
    `(${SECRET_KEY_WITH_SEP_PATTERN})${SECRET_VALUE_NEGATIVE_LOOKAHEAD}(${SECRET_VALUE_CHARS_PATTERN})`,
    "gi",
  );
  SECRET_PLACEHOLDER_VALUES = new Set([
    "undefined",
    "null",
    "none",
    "nil",
    "true",
    "false",
    "bearer",
    "basic",
  ]);
  REDACTION_MARKER_CHAR = "\uE000";
  REDACTION_MARKER_RE = /(?:\\?\/x){0,2}\uE000(?:x\\x\\|x)?/g;
  COLON_SEPARATOR_RE = /^:[\\/]/;
  keepPathSeparatorShape = (placeholder, originalPath) => {
    let escapedSeparators = placeholder.split("\\/").length - 1;
    let min = Math.min(2, escapedSeparators);
    let min_2 = Math.min(2 - min, countCharInString(placeholder, "/") - escapedSeparators);
    let rebuilt = "\\/x".repeat(min) + "/x".repeat(min_2);
    let hasColon = COLON_SEPARATOR_RE.test(originalPath)
      ? "x\\x\\"
      : /^arn:/i.test(originalPath) && /\w$/.test(placeholder)
        ? "x"
        : "";
    return rebuilt === "" && hasColon === "" ? "" : `${rebuilt}${REDACTION_MARKER_CHAR}${hasColon}`;
  };
  trailingErrnoNameRe = /[^A-Za-z0-9](E[A-Z0-9_]{2,15})$/;
});
//@ chunk-exfmq47h.js:397070-397363 placement
/**
 * 遮盖 "secret_key=… / session_token: …" 一类密钥键后的值为 <token>（保留 errno 名尾巴与路径分隔形状），跳过 null/true/bearer 等占位值和盘符路径。
 */
function redactSecretValues(text) {
  return text.replace(regExp_3, (matchText, keyName, valueText, offset, fullText) => {
    if (
      SECRET_PLACEHOLDER_VALUES.has(valueText.replace(/\.+$/, "").toLowerCase()) ||
      (/[a-z]:$/i.test(keyName) && valueText.startsWith("\\/"))
    )
      return matchText;
    let valueEnd = offset + matchText.length;
    let originalPath = fullText.slice(valueEnd, valueEnd + 4);
    let errnoName = originalPath.startsWith(": ") ? trailingErrnoNameRe.exec(valueText)?.[1] : undefined;
    let errnoSuffix = errnoName !== undefined && ERRNO_NAMES.includes(errnoName) ? errnoName : "";
    return `${keyName}<token>${keepPathSeparatorShape(valueText, originalPath)}${errnoSuffix}`;
  });
}
//@ chunk-exfmq47h.js:397363-397442 placement
var EMAIL_RE = /[\w.+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){0,7}\.[A-Za-z][\w-]{0,62}/g;
//@ chunk-exfmq47h.js:397442-397488 placement
function redactEmails(text) {
  return text.replace(EMAIL_RE, "<email>");
}
//@ chunk-exfmq47h.js:397488-397617 placement
var IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
var IPV6_RE = /\b(?:[A-Fa-f0-9]{1,4}:){2,7}(?::?[A-Fa-f0-9]{1,4}){1,7}\b/g;
var TIME_OF_DAY_RE = /^\d{1,2}:\d{2}:\d{2}$/;
//@ chunk-exfmq47h.js:397617-397697 placement
function redactIpAddresses(text) {
  return text
    .replace(IPV4_RE, "<ip>")
    .replace(IPV6_RE, (candidate) => (TIME_OF_DAY_RE.test(candidate) ? candidate : "<ip>"));
}
//@ chunk-exfmq47h.js:397697-397895 placement
var PHONE_NUMBER_RE =
  /(^|[^\w/.-])((?:\+\d{1,3}[ \t.-]?)?\(?\d{2,4}\)?[ \t.-]\d{2,4}[ \t.-]\d{2,4}(?:[ \t.-]\d{2,4}(?![ \t.-]\d))?)(?!\w)/g;
var DATE_LIKE_RE = /^\s*\d{4}[-.]\d{2}[-.]\d{2}(?:[ T]\d{1,2})?\s*$/;
var E164_PHONE_RE = /\+\d{7,15}\b/g;
//@ chunk-exfmq47h.js:397895-398030 placement
function redactPhoneNumbers(text) {
  return text
    .replace(PHONE_NUMBER_RE, (matchText, countryCode, number) =>
      number.replace(/\D/g, "").length >= 7 && !DATE_LIKE_RE.test(number)
        ? `${countryCode}<phone>`
        : `${countryCode}${number}`,
    )
    .replace(E164_PHONE_RE, "<phone>");
}
//@ chunk-exfmq47h.js:398030-398043 placement
var DIGIT_RE = /\d/g;
//@ chunk-exfmq47h.js:398043-398185 placement
function redactArn(prefix, region, accountPart, resourcePart) {
  let parts = [region, accountPart, resourcePart];
  return parts.reduce((acc, part) => acc + (part.match(DIGIT_RE)?.length ?? 0), 0) >= 5
    ? `${prefix}:<redacted>`
    : `${prefix}:${parts.join(":")}:<redacted>`;
}
//@ chunk-exfmq47h.js:398185-398384 placement
var TOKEN_REDACTION_RULES; // deferred: uses JWT_TOKEN_PATTERNS_2 (./redactSecrets.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:398185", () => {
  TOKEN_REDACTION_RULES = [
    ...GENERIC_SECRET_RULES,
    [
      /\barn:(aws[\w-]*):([\w-]*):([\w-]*):\d*:[^\s"')\],]*/g,
      (matchText, region, accountPart, resourcePart) => redactArn("arn", region, accountPart, resourcePart),
    ],
    ...TOKEN_AND_JWT_RULES,
    [/(?<![A-Za-z0-9+_-])(?!mcp__)(?=[a-z_]*[A-Z0-9+-])[A-Za-z0-9+_-]{40,}={0,2}\b/g, "<blob>"],
  ];
});
//@ chunk-exfmq47h.js:398384-398486 placement
function applyTokenRedactionRules(text) {
  let current = text;
  for (let [pattern, replacement] of TOKEN_REDACTION_RULES)
    current =
      typeof replacement === "string"
        ? current.replace(pattern, replacement)
        : current.replace(pattern, replacement);
  return current;
}
//@ chunk-exfmq47h.js:398486-398594 placement
var JWT_LIKE_RE =
  /(?:<blob>|eyJ[A-Za-z0-9_-]{10,256})\.(?:<blob>|[A-Za-z0-9_-]{10,})\.(?:<blob>|[A-Za-z0-9_-]{10,})/g;
//@ chunk-exfmq47h.js:398594-398676 placement
function redactJwtLike(text) {
  return SHORT_PREFIX_TOKEN_RULES.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    text,
  ).replace(JWT_LIKE_RE, "<jwt>");
}
//@ chunk-exfmq47h.js:398676-398929 placement
function redactUrls(text) {
  return text
    .replace(/https?:\/\/\S+/gi, "<url>")
    .replace(
      /\b(?:ssh|git|gs|s3|file|s?ftp|wss?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?|amqps?):\/\/\S+/gi,
      "<url>",
    )
    .replace(/\b[\w.-]+\.(?:ant\.dev|anthropic\.com)\b[^\s"')\]]*/gi, "<url>");
}
//@ chunk-exfmq47h.js:398929-399427 placement
/**
 * 路径遮盖正则。
 */
var PATH_PATTERNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_4;
var regExp_5;
var regExp_6;
var regExp_7;
var regExp_8;
var regExp_9;
var regExp_10;
var ERRNO_QUOTED_NAME_PATTERN;
var regExp_11;
deferInit("chunk-exfmq47h.js:398929", () => {
  PATH_PATTERNS = /[^"'\n]*(?:['"](?=[^\s"',;:)\]}])[^"'\n]*)*/.source;
  regExp_4 = new RegExp(String.raw`~[\\/]` + PATH_PATTERNS, "g");
  regExp_5 = new RegExp(String.raw`<drv>:\\` + PATH_PATTERNS, "g");
  regExp_6 = new RegExp(String.raw`[A-Za-z]:\\` + PATH_PATTERNS, "g");
  regExp_7 = new RegExp(String.raw`<unc>[\\/]?` + PATH_PATTERNS, "g");
  regExp_8 = new RegExp(String.raw`\\\\(?=[^"'\n])` + PATH_PATTERNS, "g");
  regExp_9 = new RegExp(String.raw`(?:[^\s"'\\]+\\){2,}` + PATH_PATTERNS, "g");
  regExp_10 = new RegExp(String.raw`(?:\/[^\s"':]+){2,}` + PATH_PATTERNS, "g");
  ERRNO_QUOTED_NAME_PATTERN = String.raw`E[A-Z0-9]+: [^,'\n]{1,80}, [a-z]\w{0,31} '`;
  regExp_11 = new RegExp(String.raw`\b(${ERRNO_QUOTED_NAME_PATTERN})[^]*`, "g");
});
//@ chunk-exfmq47h.js:399427-399624 placement
function redactPathShapes(text) {
  return text
    .replace(regExp_11, "$1<path>'")
    .replace(regExp_4, "~/<path>")
    .replace(regExp_5, "<path>")
    .replace(regExp_6, "<path>")
    .replace(regExp_7, "<path>")
    .replace(regExp_8, "<path>")
    .replace(regExp_9, "<path>")
    .replace(regExp_10, "<path>");
}
//@ chunk-exfmq47h.js:399624-399789 placement
var API_ERROR_JSON_START; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_12;
deferInit("chunk-exfmq47h.js:399624", () => {
  API_ERROR_JSON_START = String.raw`\{\s*\\?["'](?:type\\?["']\s*:\s*\\?["']error|request_id\\?["']\s*:\s*\\?["']req_|error\\?["']\s*:\s*\{)`;
  regExp_12 = new RegExp(String.raw`${API_ERROR_JSON_START}[^]*`, "g");
});
//@ chunk-exfmq47h.js:399789-399844 placement
function redactApiErrorBody(text) {
  return text.replace(regExp_12, "<api-error-body>");
}
//@ chunk-exfmq47h.js:399844-400056 placement
function redactMcpServerNames(text) {
  return text
    .replace(/\bmcp__[A-Za-z0-9_-]+__([A-Za-z0-9_-]+)/g, "mcp__<server>__$1")
    .replace(/\bmcp__[A-Za-z0-9_-]+/g, "mcp__<server>")
    .replace(/\bplugin:[^\s:"')\],]+:[^\s"')\],]*/g, "plugin:<server>");
}
//@ chunk-exfmq47h.js:400056-400119 placement
var HTTP_POST_ERROR_RE = /(Error POSTing to endpoint(?: \(HTTP \d+\))?:\s*)[^]*/;
//@ chunk-exfmq47h.js:400119-400221 placement
function redactHttpBodies(text) {
  try {
    return text.replace(
      HTTP_POST_ERROR_RE,
      (matchText, bodyLabel) => `${bodyLabel}<http-body.${matchText.length - bodyLabel.length}>`,
    );
  } catch {
    return text;
  }
}
//@ chunk-exfmq47h.js:400221-400388 placement
var INVALID_HEADER_VALUE_RE = /(Header '[A-Za-z0-9!#$%&'*+.^_`|~-]+' has invalid value: )[^]*/;
var INVALID_HEADER_RE =
  /(Headers\.(?:append|set): )\\?"(?:[^]*\\?"( is an invalid header (?:name|value)\.)$|[^]*)/;
//@ chunk-exfmq47h.js:400388-400468 placement
/**
 * 把无效的 HTTP 头值（非法头名或控制字符）替换为 <redacted>，保留前缀。
 */
function redactInvalidHeaderValues(text) {
  return text.replace(INVALID_HEADER_VALUE_RE, "$1<redacted>").replace(INVALID_HEADER_RE, "$1<redacted>$2");
}
//@ chunk-exfmq47h.js:400468-400958 placement
/**
 * 遮盖占位符名与标识符格式。
 */
var REDACTION_TOKENS; // deferred: uses urlPatternToRegex (./stringUtils.js) of its import cycle while loading; runs once the cycle is complete
var PLACEHOLDER_TOKEN_RE;
var ALLOWED_PLACEHOLDER_NAMES;
var NUMBERED_PLACEHOLDER_NAMES;
var regExp_13;
var MAX_PLACEHOLDER_LENGTH;
var NOT_DEFINED_SUFFIX;
var CANNOT_ACCESS_PREFIX;
var BEFORE_INIT_SUFFIX;
var UNDEFINED_VARIABLE_PREFIXES;
var TRAILING_PUNCTUATION_RE;
var TRAILER_SCAN_LENGTH;
deferInit("chunk-exfmq47h.js:400468", () => {
  REDACTION_TOKENS = 120;
  PLACEHOLDER_TOKEN_RE = /^#?[A-Za-z_$][\w$]*$/;
  ALLOWED_PLACEHOLDER_NAMES = [
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
  NUMBERED_PLACEHOLDER_NAMES = ["http-body", "domains", "tags", "non-identifier"];
  regExp_13 = new RegExp(
    `^<(?:${ALLOWED_PLACEHOLDER_NAMES.map(urlPatternToRegex).join("|")}|(?:${NUMBERED_PLACEHOLDER_NAMES.map(urlPatternToRegex).join("|")})\\.\\d+)>$`,
  );
  MAX_PLACEHOLDER_LENGTH = 40;
  NOT_DEFINED_SUFFIX = " is not defined";
  CANNOT_ACCESS_PREFIX = "Cannot access '";
  BEFORE_INIT_SUFFIX = "' before initialization";
  UNDEFINED_VARIABLE_PREFIXES = ["Can't find private variable: PrivateSymbol.", "Can't find variable: "];
  TRAILING_PUNCTUATION_RE = /[)\]}'"`.,; \t\r\n]*$/;
  TRAILER_SCAN_LENGTH = 8;
});
//@ chunk-exfmq47h.js:400958-401003 placement
function nonIdentifierPlaceholder(segment) {
  return `<non-identifier.${segment}>`;
}
//@ chunk-exfmq47h.js:401003-401091 placement
function sanitizeIdentifierSegment(segment) {
  return (segment.length <= REDACTION_TOKENS && PLACEHOLDER_TOKEN_RE.test(segment)) ||
    (segment.length <= MAX_PLACEHOLDER_LENGTH && regExp_13.test(segment))
    ? segment
    : nonIdentifierPlaceholder(segment.length);
}
//@ chunk-exfmq47h.js:401091-401197 placement
function findTrailerStart(text, tail) {
  let sliced = text.slice(-TRAILER_SCAN_LENGTH);
  let trailerStart = text.length - sliced.length + sliced.search(TRAILING_PUNCTUATION_RE);
  return text.endsWith(tail, trailerStart) ? trailerStart - tail.length : -1;
}
//@ chunk-exfmq47h.js:401197-401291 placement
function redactUndefinedVariable(text) {
  let segment = findTrailerStart(text, NOT_DEFINED_SUFFIX);
  if (segment < 0) return text;
  return (
    (segment <= REDACTION_TOKENS
      ? sanitizeIdentifierSegment(text.slice(0, segment))
      : nonIdentifierPlaceholder(segment)) + text.slice(segment)
  );
}
//@ chunk-exfmq47h.js:401291-401469 placement
function truncateAfterMarkers(text) {
  let index = text.indexOf(CANNOT_ACCESS_PREFIX);
  let afterPrefix = index + CANNOT_ACCESS_PREFIX.length;
  let trailerStart = findTrailerStart(text, BEFORE_INIT_SUFFIX);
  let lineEnd =
    index < 0
      ? text
      : replaceSpanWithSanitized(text, afterPrefix, trailerStart < afterPrefix ? text.length : trailerStart);
  return UNDEFINED_VARIABLE_PREFIXES.reduce((acc, prefix) => {
    let index = acc.indexOf(prefix);
    return index < 0 ? acc : replaceSpanWithSanitized(acc, index + prefix.length, acc.length);
  }, lineEnd);
}
//@ chunk-exfmq47h.js:401469-401536 placement
function replaceSpanWithSanitized(text, segment, sanitizer) {
  return (
    text.slice(0, segment) + sanitizeIdentifierSegment(text.slice(segment, sanitizer)) + text.slice(sanitizer)
  );
}
//@ chunk-exfmq47h.js:401536-401720 placement
var UA_BLOCKED_DOMAINS_RE =
  /(domains are not accessible to our user agent)(?!:? ?(?:<domains\.\d+>\. Read more: |<redacted>$))(:? ?)(?:\[('[a-z0-9._-]+'(?:, '[a-z0-9._-]+')*)\](?=\. Read more: )|[^]*)/gi;
//@ chunk-exfmq47h.js:401720-401848 placement
function redactBlockedDomains(text) {
  return text.replace(
    UA_BLOCKED_DOMAINS_RE,
    (matchText, scheme, offset, fullText) =>
      `${scheme}${offset || ": "}${fullText === undefined ? "<redacted>" : `<domains.${fullText.split("', '").length}>`}`,
  );
}
//@ chunk-exfmq47h.js:401848-403519 placement
/**
 * 主机名错误消息模式。
 */
var HOSTNAME_ERROR_PATTERNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PRIVATE_VARIABLE_PREFIX;
var DOMAIN_FIELD_NAMES;
var DOMAIN_FIELD_SUFFIX;
var regExp_14;
var regExp_15;
var regExp_16;
var INVALID_DOMAIN_FORMAT_RE;
var INVALID_DOMAIN_VALUE_RE;
var UNSUPPORTED_ENTRIES_RE;
var ORG_BLOCKED_CONFLICT_RE;
deferInit("chunk-exfmq47h.js:401848", () => {
  HOSTNAME_ERROR_PATTERNS = [
    String.raw`Hostname is too long\. Public domain names are required\.`,
    String.raw`Hostname contains non-ASCII characters that do not form a valid internationalized domain name\. Public domain names are required\.`,
    String.raw`Host is a non-canonical IP address literal \(resolves to <ip>\)\. Use the dotted-quad form or a domain name\.`,
    String.raw`Host looks like an IP address but could not be parsed\. Public domain names are required\.`,
    String.raw`IP address is in a restricted range \((?:<ip>|::1|::|fe80::|fc00::|ff00::)\/\d{1,3}\)\. Public domain names are required\.`,
    String.raw`Hostname matches restricted pattern \(e\.g\., (?:localhost|\*\.local|\*\.internal|\*\.localdomain)\)\. Public domain names are required\.`,
  ];
  PRIVATE_VARIABLE_PREFIX = String.raw`(Cannot use ')[^]*'?`;
  DOMAIN_FIELD_NAMES = ["allowed_domains", "blocked_domains"];
  DOMAIN_FIELD_SUFFIX = String.raw` in (?:${DOMAIN_FIELD_NAMES.join("|")}): `;
  regExp_14 = new RegExp(
    String.raw`${PRIVATE_VARIABLE_PREFIX}(${DOMAIN_FIELD_SUFFIX})(${HOSTNAME_ERROR_PATTERNS.join("|")})?[^]*`,
    "g",
  );
  regExp_15 = new RegExp(String.raw`${PRIVATE_VARIABLE_PREFIX}(${DOMAIN_FIELD_SUFFIX}[^\n]*)[^]*`);
  regExp_16 = new RegExp(String.raw`('${DOMAIN_FIELD_SUFFIX})(${HOSTNAME_ERROR_PATTERNS.join("|")})?[^]*`);
  INVALID_DOMAIN_FORMAT_RE =
    /(Invalid domain format: )(?:[^]*( in (?:allowed|blocked)_domains(?: contains (?:a newline|whitespace|'[*?]')\.(?: Wildcards, whitespace, and line breaks are not supported; provide a plain hostname like 'example\.com'\.)?|\.(?!\w)))[^]*|[^]*)/g;
  INVALID_DOMAIN_VALUE_RE =
    /((?:allowed|blocked)_domains: ')(?:[^]*'?( is not a valid domain format\. Domains should follow the format example\.com or example\.com\/path\.)[^]*|[^]*)/g;
  UNSUPPORTED_ENTRIES_RE = /([Tt]hese entries (?:are not supported|have a path): )[^]*/g;
  ORG_BLOCKED_CONFLICT_RE =
    /(entries conflict with domains blocked by your organization: )(?:[^]*(\. Remove them from `allowed_domains`, or ask an organization admin to unblock them\.)[^]*|[^]*)/g;
});
//@ chunk-exfmq47h.js:403519-403580 placement
function hasDomainFieldError(text) {
  return DOMAIN_FIELD_NAMES.some((fieldName) => text.includes(` in ${fieldName}: `));
}
//@ chunk-exfmq47h.js:403580-403642 placement
function redactDomainErrorValue(text) {
  return hasDomainFieldError(text) ? text.replace(regExp_15, "$1<redacted>'$2") : text;
}
//@ chunk-exfmq47h.js:403642-403950 placement
/**
 * 遮盖引号中的值。
 */
function redactQuotedValues(text) {
  return (
    hasDomainFieldError(text)
      ? text
          .replace(
            regExp_14,
            (matchText, keyName, openQuote, closeQuote) =>
              `${keyName}<redacted>'${openQuote}${closeQuote ?? "<redacted>"}`,
          )
          .replace(regExp_16, (matchText, prefix, rest) => `${prefix}${rest ?? "<redacted>"}`)
      : text
  )
    .replace(INVALID_DOMAIN_FORMAT_RE, (matchText, prefix, rest) => `${prefix}<redacted>${rest ?? ""}`)
    .replace(INVALID_DOMAIN_VALUE_RE, (matchText, prefix, rest) => `${prefix}<redacted>'${rest ?? ""}`)
    .replace(UNSUPPORTED_ENTRIES_RE, "$1<redacted>")
    .replace(ORG_BLOCKED_CONFLICT_RE, (matchText, prefix, rest) => `${prefix}<redacted>${rest ?? ""}`);
}
//@ chunk-exfmq47h.js:403950-404021 placement
var ARN_RE = /(arn):(aws[\w*?-]*|\*):([\w*?-]*):([\w*?-]*):[\d*?]*:[^\n]*/gi;
//@ chunk-exfmq47h.js:404021-404082 placement
function redactArnValues(text) {
  return text.replace(ARN_RE, (matchText, partition, service, region, accountId) =>
    redactArn(partition, service, region, accountId),
  );
}
//@ chunk-exfmq47h.js:404082-404485 placement
/**
 * 各种引号的正则与证书主机名错误模式。
 */
var QUOTE_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_17;
var regExp_18;
deferInit("chunk-exfmq47h.js:404082", () => {
  QUOTE_PATTERN = String.raw`(?:'|\\'|\\u0027|&#0*39;|&#[xX]0*27;|&apos;|\u2019|&#0*8217;|&#[xX]0*2019;|&rsquo;)`;
  regExp_17 = new RegExp(
    String.raw`(Hostname(?:\/|\\\/|\\u002[Ff])IP does(?: not|n${QUOTE_PATTERN}t) match certificate)[^]*`,
  );
  regExp_18 = new RegExp(
    String.raw`\b(Host: )\S*?(\. is not (?:in the cert${QUOTE_PATTERN}s altnames|cert${QUOTE_PATTERN}s CN): )[^]*|\b(IP: )\S+( is not in the cert${QUOTE_PATTERN}s list: )[^]*|\b(Cert does not contain a DNS name)[^]+`,
  );
});
//@ chunk-exfmq47h.js:404485-404762 placement
function redactTlsAltnames(text) {
  let replaced = text.replace(regExp_17, "$1's altnames: <redacted>");
  let match = regExp_18.exec(replaced);
  if (!match) return replaced;
  let [, hostGroup, hostRest, ipGroup, ipRest, fallbackGroup] = match;
  let sliced = replaced.slice(0, match.index);
  if (hostGroup !== undefined) return `${sliced}${hostGroup}<host>${hostRest}<redacted>`;
  if (ipGroup !== undefined) return `${sliced}${ipGroup}<ip>${ipRest}<redacted>`;
  return `${sliced}${fallbackGroup === undefined ? "" : `${fallbackGroup} `}<redacted>`;
}
//@ chunk-exfmq47h.js:404762-405023 placement
var COMMAND_PREFIX_BOUNDARY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_19;
deferInit("chunk-exfmq47h.js:404762", () => {
  COMMAND_PREFIX_BOUNDARY = String.raw`(?:\b|\\[nrt]|\x1b\[[0-9;?]{0,20}[A-Za-z]|\\u001[bB]\[[0-9;?]{0,20}[A-Za-z]|_)`;
  regExp_19 = new RegExp(
    String.raw`(${COMMAND_PREFIX_BOUNDARY}Command (?:(?:failed with|timed out after|was killed with) [^:\n]{0,200}|was (?:gracefully )?canceled[^:\n]{0,200}|failed): )[^]*`,
  );
});
//@ chunk-exfmq47h.js:405023-405074 placement
function redactCommandOutput(text) {
  return text.replace(regExp_19, "$1<redacted>");
}
//@ chunk-exfmq47h.js:405074-407231 placement
/**
 * 系统错误码列表（用于识别错误消息）。
 */
var ERRNO_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ERRNO_NAMES_COPY;
var ERRNO_NAME_PATTERN;
var SPAWN_ARG_LINE_PATTERN;
var SPAWN_LINE_BREAK;
var OPTIONAL_NEWLINE;
var SPAWN_ERRNO_TAIL;
var regExp_20;
var regExp_21;
var EXECUTABLE_NOT_FOUND_RE;
var regExp_22;
deferInit("chunk-exfmq47h.js:405074", () => {
  ERRNO_NAMES = `
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
  ERRNO_NAMES_COPY = Object.freeze([...ERRNO_NAMES]);
  ERRNO_NAME_PATTERN = String.raw`(?=E[A-Z0-9]|U)(?:${ERRNO_NAMES.join("|")}|UNKNOWN|Unknown system error -?\d+)`;
  SPAWN_ARG_LINE_PATTERN = String.raw`(?:(?!'${DOMAIN_FIELD_SUFFIX}|\b${ERRNO_QUOTED_NAME_PATTERN})[^\n])+`;
  SPAWN_LINE_BREAK = String.raw`(?:\r?\n\s*(?=\S))?`;
  OPTIONAL_NEWLINE = String.raw`(?:\n\s*)?`;
  SPAWN_ERRNO_TAIL = String.raw`( (?:${ERRNO_NAME_PATTERN})(?![A-Za-z0-9\-/]|_\w|\\(?!["\\/bfnrt]|u[0-9A-Fa-f]{4})|\.\w))[^]*`;
  regExp_20 = new RegExp(
    String.raw`(${COMMAND_PREFIX_BOUNDARY}spawn(?:Sync)? )${SPAWN_LINE_BREAK}${SPAWN_ARG_LINE_PATTERN}${OPTIONAL_NEWLINE}${SPAWN_ERRNO_TAIL}`,
    "g",
  );
  regExp_21 = new RegExp(
    String.raw`(${COMMAND_PREFIX_BOUNDARY}spawn(?:Sync)? )${SPAWN_LINE_BREAK}[^\n]+(?:\n\s*(?=\S)[^\n]*)?(\u2026<truncated>)$`,
  );
  EXECUTABLE_NOT_FOUND_RE = /(Executable not found in \$PATH: )(?!<redacted>$)[^]*/;
  regExp_22 = new RegExp(String.raw` (?:${ERRNO_NAME_PATTERN})`);
});
//@ chunk-exfmq47h.js:407231-407327 placement
function redactSpawnCommandLine(text) {
  return (regExp_22.test(text) ? text.replace(regExp_20, "$1<redacted>$2") : text).replace(
    regExp_21,
    "$1<redacted>$2",
  );
}
//@ chunk-exfmq47h.js:407327-407460 placement
function redactSpawnPaths(text) {
  let current = text.includes("spawn") ? redactSpawnCommandLine(text) : text;
  return current.includes("Executable not found in $PATH: ")
    ? current.replace(EXECUTABLE_NOT_FOUND_RE, "$1<redacted>")
    : current;
}
//@ chunk-exfmq47h.js:407460-408015 placement
/**
 * 模块加载错误消息模式。
 */
var MODULE_ERROR_PATTERNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MODULE_ERROR_PREFIXES;
var regExp_23;
var BUILD_ERROR_PREFIXES;
var regExp_24;
deferInit("chunk-exfmq47h.js:407460", () => {
  MODULE_ERROR_PATTERNS = String.raw`[A-Z][A-Za-z0-9_]{1,63}`;
  MODULE_ERROR_PREFIXES = [
    String.raw`${MODULE_ERROR_PATTERNS} (?:reading|parsing data url|decoding data|(?:while )?resolving(?: package| preload)?)`,
    "Cannot find (?:module|package)",
    "Cannot resolve invalid (?:data )?URL",
    "Cannot read directory",
    "Module not found",
    "preload not found",
    String.raw`\d+ errors building`,
    "Unexpected pending import in",
  ];
  regExp_23 = new RegExp(
    String.raw`(${COMMAND_PREFIX_BOUNDARY}(?:${MODULE_ERROR_PREFIXES.join("|")}) )\\*["'][^]*`,
  );
  BUILD_ERROR_PREFIXES = ["No such built-in module:", String.raw`${MODULE_ERROR_PATTERNS} while building`];
  regExp_24 = new RegExp(
    String.raw`(${COMMAND_PREFIX_BOUNDARY}(?:${BUILD_ERROR_PREFIXES.join("|")}) )(?!<redacted>$)[^]*`,
  );
});
//@ chunk-exfmq47h.js:408015-408093 placement
function redactModuleLoadErrors(text) {
  return text.replace(regExp_23, "$1<redacted>").replace(regExp_24, "$1<redacted>");
}
//@ chunk-exfmq47h.js:408093-408315 placement
var INPUT_TAG_MISMATCH_RE =
  /(Input tag ')(?:([^]*)' found using 'type' does not match any of the expected tags: ('[\w.-]{1,64}'(?:, '[\w.-]{1,64}')*|<tags\.\d{1,4}>)$|[^]*)/;
var INPUT_TAG_MISMATCH_MIDDLE = "' found using 'type' does not match any of the expected tags: ";
//@ chunk-exfmq47h.js:408315-408488 placement
function redactInputTagMismatch(text) {
  let replaced = text.replace(INPUT_TAG_MISMATCH_RE, (matchText, prefix, unknownType, tagList) =>
    unknownType === undefined || tagList === undefined
      ? `${prefix}<redacted>`
      : `${prefix}${redactUnknownBlockType(unknownType)}${INPUT_TAG_MISMATCH_MIDDLE}${tagListPlaceholder(tagList)}`,
  );
  return replaced.length > MAX_REDACTED_LENGTH
    ? replaced.replace(INPUT_TAG_MISMATCH_RE, (matchText, prefix) => `${prefix}<redacted>`)
    : replaced;
}
//@ chunk-exfmq47h.js:408488-408582 placement
function tagListPlaceholder(tagList) {
  return tagList.startsWith("<tags.") ? tagList : `<tags.${tagList.slice(1, -1).split("', '").length}>`;
}
//@ chunk-exfmq47h.js:408582-409546 placement
/**
 * DNS 错误消息模式。
 */
var DNS_ERROR_PATTERNS; // deferred: uses normalizeCaseForComparison_2 (./permissions/filesystem.js) of its import cycle while loading; runs once the cycle is complete
var DNS_CALL_PATTERN;
var DNS_ERRNO_PREFIX;
var HOSTNAME_BREAK_CHARS;
var HOSTNAME_QUOTE_PATTERN;
var NOT_DNS_OR_ERRNO;
var NOT_API_ERROR_JSON;
var joined;
var HOST_SEGMENT_CHARS;
var HOST_SEGMENT_PATTERN;
var HOST_FIRST_SEGMENT;
var regExp_25;
var HOSTNAME_TRAILING_PUNCT_RE;
var IPV4_WITH_PORT_RE;
var IPV6_LIKE_RE;
var UNDEFINED_PLACEHOLDER_RE;
var PORT_SUFFIX_RE;
var SHORT_NUMBER_RE;
var AUTH_SCHEME_RE;
var HOME_TILDE_RE;
var DRIVE_PATH_RE;
var TRAILING_ROOT_RE;
var MULTI_SEGMENT_PATH_RE;
deferInit("chunk-exfmq47h.js:408582", () => {
  DNS_ERROR_PATTERNS = [
    "getaddrinfo",
    "getnameinfo",
    "getHostByAddr",
    "query(?:A|Aaaa|Any|Caa|Cname|Mx|Naptr|Ns|Ptr|Soa|Srv|Tlsa|Txt)",
    "connect",
  ];
  DNS_CALL_PATTERN = `(?:${DNS_ERROR_PATTERNS.join("|")})`;
  DNS_ERRNO_PREFIX = String.raw`${DNS_CALL_PATTERN} E[A-Z][A-Z0-9_]{1,30} `;
  HOSTNAME_BREAK_CHARS = String.raw`\s"'\`,;()<>[\]{}\\\u2026`;
  HOSTNAME_QUOTE_PATTERN = String.raw`(?:"{1,2}|[,;'\`(){}]+)`;
  NOT_DNS_OR_ERRNO = String.raw`(?!\b(?:${DNS_ERRNO_PREFIX}|${ERRNO_QUOTED_NAME_PATTERN}))`;
  NOT_API_ERROR_JSON = String.raw`(?![,;'\`(){}]*${API_ERROR_JSON_START})`;
  joined = normalizeCaseForComparison_2([
    ...DNS_ERROR_PATTERNS.map((pattern) => pattern.charAt(0)),
    "E",
  ]).join("");
  HOST_SEGMENT_CHARS = String.raw`[^${HOSTNAME_BREAK_CHARS}${joined}]*`;
  HOST_SEGMENT_PATTERN = String.raw`${HOST_SEGMENT_CHARS}(?:(?:${NOT_DNS_OR_ERRNO}[${joined}]+|${NOT_API_ERROR_JSON}${HOSTNAME_QUOTE_PATTERN}${NOT_DNS_OR_ERRNO}[^${HOSTNAME_BREAK_CHARS}])${HOST_SEGMENT_CHARS})*`;
  HOST_FIRST_SEGMENT = String.raw`${NOT_DNS_OR_ERRNO}(?![A-Za-z]:[\\/]|\.{1,2}[\\/])[^${HOSTNAME_BREAK_CHARS}/~]${HOST_SEGMENT_PATTERN}`;
  regExp_25 = new RegExp(
    String.raw`\b(${DNS_ERRNO_PREFIX})(["'\`({])?(${HOST_FIRST_SEGMENT})( ${NOT_DNS_OR_ERRNO}\3${HOST_SEGMENT_PATTERN})?`,
    "g",
  );
  HOSTNAME_TRAILING_PUNCT_RE = /[^.,;:!?'"`)}~][.,;:!?'"`)}~]*$/;
  IPV4_WITH_PORT_RE = /^(?:\d{1,3}\.){3}\d{1,3}(:\d{1,5})?$/;
  IPV6_LIKE_RE = /^[0-9A-Fa-f.]*:[0-9A-Fa-f.]*:[0-9A-Fa-f:.]*$/;
  UNDEFINED_PLACEHOLDER_RE = /^(?:undefined|null)(?::\d{1,5})?$/;
  PORT_SUFFIX_RE = /:\d{1,5}$/;
  SHORT_NUMBER_RE = /^\d{1,4}$/;
  AUTH_SCHEME_RE = /^(?:([^]*)([^A-Za-z0-9]))?(bearer|basic)$/i;
  HOME_TILDE_RE = /~\//;
  DRIVE_PATH_RE = /\b[A-Za-z]:\//;
  TRAILING_ROOT_RE = /(?:~|[A-Za-z]:)$/;
  MULTI_SEGMENT_PATH_RE = /(?:\/[^\s"':]+){2}/;
});
//@ chunk-exfmq47h.js:409546-409800 placement
function redactHostPrefix(text) {
  let splitAt = text.search(HOSTNAME_TRAILING_PUNCT_RE) + 1;
  if (splitAt === 0) return text;
  let sliced = text.slice(0, splitAt);
  let sliced_2 = text.slice(splitAt);
  let match = IPV4_WITH_PORT_RE.exec(sliced);
  if (match) return `<ip>${match[1] ?? ""}${sliced_2}`;
  if (IPV6_LIKE_RE.test(sliced)) return `<ip>${sliced_2}`;
  if (IPV6_LIKE_RE.test(text)) return "<ip>";
  if (UNDEFINED_PLACEHOLDER_RE.test(sliced)) return text;
  return `<host>${PORT_SUFFIX_RE.exec(sliced)?.[0] ?? ""}${sliced_2}`;
}
//@ chunk-exfmq47h.js:409800-409994 placement (2.1.88 match: ghIsDangerousCallback, 0.805)
function ghIsDangerousCallback(_rawCommand, args) {
  if (_rawCommand.includes("://")) return -1;
  let homeMatchIndex = _rawCommand.search(HOME_TILDE_RE);
  if (homeMatchIndex > 0) return homeMatchIndex;
  let driveMatchIndex = _rawCommand.search(DRIVE_PATH_RE);
  if (driveMatchIndex >= 0) return driveMatchIndex;
  let rootMatchIndex = args ? _rawCommand.search(TRAILING_ROOT_RE) : -1;
  if (rootMatchIndex >= 0) return rootMatchIndex;
  let multiSegmentIndex = _rawCommand.search(MULTI_SEGMENT_PATH_RE);
  return multiSegmentIndex > 0 ? multiSegmentIndex : -1;
}
//@ chunk-exfmq47h.js:409994-410178 placement
function redactHostSegment(segment, isAfterHost) {
  if (SHORT_NUMBER_RE.test(segment)) return segment;
  let cutIndex = ghIsDangerousCallback(segment, isAfterHost);
  if (cutIndex >= 0) return redactHostPrefix(segment.slice(0, cutIndex)) + segment.slice(cutIndex);
  let match = AUTH_SCHEME_RE.exec(segment);
  if (match) {
    let [, credentialPart = "", separator = "", hostPart = ""] = match;
    return (credentialPart === "" ? "" : redactHostPrefix(credentialPart)) + separator + hostPart;
  }
  return redactHostPrefix(segment);
}
//@ chunk-exfmq47h.js:410178-410230 placement
var regExp_26; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HOST_SCAN_WINDOW;
deferInit("chunk-exfmq47h.js:410178", () => {
  regExp_26 = new RegExp(String.raw`\b${ERRNO_QUOTED_NAME_PATTERN}|${API_ERROR_JSON_START}`);
  HOST_SCAN_WINDOW = 160;
});
//@ chunk-exfmq47h.js:410230-410351 placement
function redactHostBeforePort(hostSegment, fullText, isAfterHost) {
  let match = regExp_26.exec(fullText);
  return match !== null && match.index < hostSegment.length
    ? redactHostSegment(hostSegment.slice(0, match.index), false) + hostSegment.slice(match.index)
    : redactHostSegment(hostSegment, isAfterHost);
}
//@ chunk-exfmq47h.js:410351-410538 placement
function redactHostnames(text) {
  return text.replace(
    regExp_25,
    (matchText, leadingText, optionalText, hostSegment, portSuffix, matchOffset) => {
      let afterMatchIndex = matchOffset + matchText.length;
      let isAfterHost = text[afterMatchIndex] === "\\";
      return (
        leadingText +
        (optionalText ?? "") +
        redactHostSegment(hostSegment, portSuffix === undefined && isAfterHost) +
        (portSuffix === undefined
          ? ""
          : ` ${redactHostBeforePort(portSuffix.slice(1), text.slice(afterMatchIndex - portSuffix.length + 1, afterMatchIndex + HOST_SCAN_WINDOW), isAfterHost)}`)
      );
    },
  );
}
//@ chunk-exfmq47h.js:410538-410700 placement
var regExp_27; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:410538", () => {
  regExp_27 = new RegExp(
    String.raw`(<host>(?::\d{1,5})?[.,;:!?~\`(){}'"]*)[\\\[\]<>\u2026]` +
      String.raw`(?:[^\s"'/]|['"](?=[^\s"',;:)\]}])){0,255}(?:\/|<path>)` +
      PATH_PATTERNS,
    "g",
  );
});
//@ chunk-exfmq47h.js:410700-410747 placement
function redactPathAfterHost(text) {
  return text.replace(regExp_27, "$1<path>");
}
//@ chunk-exfmq47h.js:410747-410916 placement
/**
 * 把错误消息中出现的 path/dest 路径替换为 <path>（长路径优先）。
 */
function redactErrorPaths(errnoLike, text) {
  let current = errnoLike;
  return [current?.path, current?.dest]
    .filter((pathValue) => typeof pathValue === "string" && pathValue.length > 0)
    .sort((leftPath, rightPath) => rightPath.length - leftPath.length)
    .reduce((acc, pathValue) => acc.split(pathValue).join("<path>"), text);
}
//@ chunk-exfmq47h.js:410916-410928 placement
var MAX_REDACTED_LENGTH = 4000;
//@ chunk-exfmq47h.js:410928-411357 placement
/**
 * 对错误消息依次遮盖路径、密钥、邮箱、IP、URL 等后截断。
 */
function redactErrorMessage(message) {
  let withoutUndefinedVars = redactUndefinedVariable(message);
  let text = (
    withoutUndefinedVars.length > MAX_REDACTED_LENGTH
      ? withoutUndefinedVars.slice(0, MAX_REDACTED_LENGTH) + "\u2026<truncated>"
      : withoutUndefinedVars
  ).replaceAll(REDACTION_MARKER_CHAR, "\uFFFD");
  let withoutDomainValues = redactDomainErrorValue(text);
  let withoutHttpBodies = redactHttpBodies(withoutDomainValues);
  let withoutBlockedDomains = redactBlockedDomains(withoutHttpBodies);
  let withoutHeaderValues = redactInvalidHeaderValues(withoutBlockedDomains);
  let truncated = truncateAfterMarkers(withoutHeaderValues);
  let withoutTlsAltnames = redactTlsAltnames(truncated);
  let withoutCommandOutput = redactCommandOutput(withoutTlsAltnames);
  let withoutSpawnPaths = redactSpawnPaths(withoutCommandOutput);
  let withoutModulePaths = redactModuleLoadErrors(withoutSpawnPaths);
  let withoutInputTags = redactInputTagMismatch(withoutModulePaths);
  let text_2 = redactHostnames(withoutInputTags)
    .replace(/:\/\/[^\s/]*@(?=[^@\s]*(?:[/:\s]|$))/g, "://<userinfo>@")
    .replace(/\b[\w][\w.+-]*@[\w.-]+:[^\s"')\]]*(?:\/[^\s"')\]]*|\.git\b)/gi, "<url>");
  let withoutSecrets = redactSecretValues(text_2);
  let withoutMcpNames = redactMcpServerNames(
    redactPhoneNumbers(
      applyTokenRedactionRules(redactIpAddresses(redactEmails(redactPaths(withoutSecrets)))),
    ),
  );
  return redactJwtLike(
    redactArnValues(
      redactPathAfterHost(
        redactQuotedValues(redactPathShapes(redactUrls(redactApiErrorBody(withoutMcpNames)))),
      ),
    ),
  ).replace(REDACTION_MARKER_RE, "");
}
export { ERRNO_NAMES_COPY, redactInvalidHeaderValues, redactErrorMessage, redactErrorPaths };

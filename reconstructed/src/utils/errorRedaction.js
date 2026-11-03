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
import { homedir, homedir as homedir_2, homedir as homedir_3, homedir as homedir_4 } from "os";
import { countCharInString, urlPatternToRegex } from "./stringUtils.js";
import { gls, hls, jTi } from "./redactSecrets.js";
import { YE } from "../services/api/requestHeaders.js";
import { uniq } from "./collections.js";

/**
 * 遮盖错误信息中的用户目录、驱动器、UNC 路径。
 */
//@ chunk-aepeg2w5.js:384217-384644 placement
function redactPaths(e) {
  let n = e,
    r = "";
  try {
    r = homedir_3();
  } catch {}
  if (r) n = n.replaceAll(r + "/", "~/").replaceAll(r + "\\", "~\\");
  let s = (h, y) => /https?:\/\/[^\s'",;|()]*$/i.test(h.slice(0, y));
  return (
    (n = n
      .replace(/([/\\](?:Users|home)[/\\])[^/\\\n]+/gi, (h, y, S, w) => (s(w, S) ? h : `${y}<user>`))
      .replace(/(\/(?:Volumes|mnt|media)\/)[^/\n]+/g, (h, y, S, w) => (s(w, S) ? h : `${y}<vol>`))
      .replace(/\b([A-Za-z]):[\\/]/g, "<drv>:\\")
      .replace(/\\\\[^\\]+\\[^\\\s'",:()]+/g, "<unc>")),
    n
  );
}
/**
 * 错误遮盖用的密钥键名正则。
 */
//@ chunk-aepeg2w5.js:384644-385682 placement
var SECRET_KEY_PATTERN = String.raw`(?:aws[-_]?)?(?:secret[-_]?(?:access[-_]?)?key|session[-_]?token|security[-_]?token|bearer[-_]?token[-_]?bedrock)(?![A-Za-z0-9_-])`,
  H0 = String.raw`(?:${SECRET_KEY_PATTERN}(?:\\{0,7}["'\`])?[ \t]*[:=][ \t]*(?:\\{0,7}["'\`])?|<${SECRET_KEY_PATTERN}>)`,
  B0 = String.raw`(?![{[(=]|arn:|~[\\/]|[a-z]:[\\/]|\\\\|(?:\.{1,2})?\/[^\s"':/]+\/[^\s"':]|[a-z][a-z0-9+.-]*:(?:[a-z][a-z0-9+.-]*:)?(?:\/\/|\\\/\\\/)|E[A-Z0-9]{1,15}: )`,
  K0 = String.raw`(?:(?!arn:)(?!plugin:)(?!https?:\/\/)(?!bearer\s)[A-Za-z0-9_]|[+/=%.@-](?!(?:ssh|git|gs|s3|file|s?ftp|wss?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?|amqps?):\/\/)|\\\/)+`,
  regExp_3 = new RegExp(`(${H0})${B0}(${K0})`, "gi"),
  $0 = new Set(["undefined", "null", "none", "nil", "true", "false", "bearer", "basic"]),
  tk = "\uE000",
  W0 = /(?:\\?\/x){0,2}\uE000(?:x\\x\\|x)?/g,
  z0 = /^:[\\/]/,
  j0 = (e, n) => {
    let r = e.split("\\/").length - 1,
      min = Math.min(2, r),
      min_2 = Math.min(2 - min, countCharInString(e, "/") - r),
      y = "\\/x".repeat(min) + "/x".repeat(min_2),
      S = z0.test(n) ? "x\\x\\" : /^arn:/i.test(n) && /\w$/.test(e) ? "x" : "";
    return y === "" && S === "" ? "" : `${y}${tk}${S}`;
  },
  V0 = /[^A-Za-z0-9](E[A-Z0-9_]{2,15})$/;
/**
 * 遮盖 "secret_key=… / session_token: …" 一类密钥键后的值为 <token>（保留 errno 名尾巴与路径分隔形状），跳过 null/true/bearer 等占位值和盘符路径。
 */
//@ chunk-aepeg2w5.js:385682-385975 placement
function redactSecretValues(e) {
  return e.replace(regExp_3, (n, r, s, h, y) => {
    if ($0.has(s.replace(/\.+$/, "").toLowerCase()) || (/[a-z]:$/i.test(r) && s.startsWith("\\/"))) return n;
    let S = h + n.length,
      sliced = y.slice(S, S + 4),
      R = sliced.startsWith(": ") ? V0.exec(s)?.[1] : void 0,
      x = R !== void 0 && ERRNO_NAMES.includes(R) ? R : "";
    return `${r}<token>${j0(s, sliced)}${x}`;
  });
}
//@ chunk-aepeg2w5.js:385975-386054 placement
var q0 = /[\w.+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){0,7}\.[A-Za-z][\w-]{0,62}/g;
//@ chunk-aepeg2w5.js:386054-386100 placement
function X0(e) {
  return e.replace(q0, "<email>");
}
//@ chunk-aepeg2w5.js:386100-386229 placement
var IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  IPV6_RE = /\b(?:[A-Fa-f0-9]{1,4}:){2,7}(?::?[A-Fa-f0-9]{1,4}){1,7}\b/g,
  TIME_OF_DAY_RE = /^\d{1,2}:\d{2}:\d{2}$/;
//@ chunk-aepeg2w5.js:386229-386309 placement
function eH(e) {
  return e.replace(IPV4_RE, "<ip>").replace(IPV6_RE, (n) => (TIME_OF_DAY_RE.test(n) ? n : "<ip>"));
}
//@ chunk-aepeg2w5.js:386309-386507 placement
var PHONE_NUMBER_RE =
    /(^|[^\w/.-])((?:\+\d{1,3}[ \t.-]?)?\(?\d{2,4}\)?[ \t.-]\d{2,4}[ \t.-]\d{2,4}(?:[ \t.-]\d{2,4}(?![ \t.-]\d))?)(?!\w)/g,
  DATE_LIKE_RE = /^\s*\d{4}[-.]\d{2}[-.]\d{2}(?:[ T]\d{1,2})?\s*$/,
  E164_PHONE_RE = /\+\d{7,15}\b/g;
//@ chunk-aepeg2w5.js:386507-386642 placement
function redactPhoneNumbers(e) {
  return e
    .replace(PHONE_NUMBER_RE, (n, r, s) =>
      s.replace(/\D/g, "").length >= 7 && !DATE_LIKE_RE.test(s) ? `${r}<phone>` : `${r}${s}`,
    )
    .replace(E164_PHONE_RE, "<phone>");
}
//@ chunk-aepeg2w5.js:386642-386655 placement
var iH = /\d/g;
//@ chunk-aepeg2w5.js:386655-386797 placement
function redactArn(e, n, r, s) {
  let h = [n, r, s];
  return h.reduce((S, w) => S + (w.match(iH)?.length ?? 0), 0) >= 5
    ? `${e}:<redacted>`
    : `${e}:${h.join(":")}:<redacted>`;
}
//@ chunk-aepeg2w5.js:386797-386996 placement
var TOKEN_REDACTION_RULES = [
  ...gls,
  [/\barn:(aws[\w-]*):([\w-]*):([\w-]*):\d*:[^\s"')\],]*/g, (e, n, r, s) => redactArn("arn", n, r, s)],
  ...hls,
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
function lH(e) {
  return jTi.reduce((n, [r, s]) => n.replace(r, s), e).replace(JWT_LIKE_RE, "<jwt>");
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
/**
 * 路径遮盖正则。
 */
//@ chunk-aepeg2w5.js:387541-388039 placement
var PATH_PATTERNS = /[^"'\n]*(?:['"](?=[^\s"',;:)\]}])[^"'\n]*)*/.source,
  regExp_4 = new RegExp(String.raw`~[\\/]` + PATH_PATTERNS, "g"),
  regExp_5 = new RegExp(String.raw`<drv>:\\` + PATH_PATTERNS, "g"),
  regExp_6 = new RegExp(String.raw`[A-Za-z]:\\` + PATH_PATTERNS, "g"),
  regExp_7 = new RegExp(String.raw`<unc>[\\/]?` + PATH_PATTERNS, "g"),
  regExp_8 = new RegExp(String.raw`\\\\(?=[^"'\n])` + PATH_PATTERNS, "g"),
  regExp_9 = new RegExp(String.raw`(?:[^\s"'\\]+\\){2,}` + PATH_PATTERNS, "g"),
  regExp_10 = new RegExp(String.raw`(?:\/[^\s"':]+){2,}` + PATH_PATTERNS, "g"),
  Ru = String.raw`E[A-Z0-9]+: [^,'\n]{1,80}, [a-z]\w{0,31} '`,
  regExp_11 = new RegExp(String.raw`\b(${Ru})[^]*`, "g");
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
var API_ERROR_JSON_START = String.raw`\{\s*\\?["'](?:type\\?["']\s*:\s*\\?["']error|request_id\\?["']\s*:\s*\\?["']req_|error\\?["']\s*:\s*\{)`,
  regExp_12 = new RegExp(String.raw`${API_ERROR_JSON_START}[^]*`, "g");
//@ chunk-aepeg2w5.js:388401-388456 placement
function vH(e) {
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
var kH = /(Error POSTing to endpoint(?: \(HTTP \d+\))?:\s*)[^]*/;
//@ chunk-aepeg2w5.js:388731-388833 placement
function redactHttpBodies(e) {
  try {
    return e.replace(kH, (n, r) => `${r}<http-body.${n.length - r.length}>`);
  } catch {
    return e;
  }
}
//@ chunk-aepeg2w5.js:388833-389000 placement
var INVALID_HEADER_VALUE_RE = /(Header '[A-Za-z0-9!#$%&'*+.^_`|~-]+' has invalid value: )[^]*/,
  INVALID_HEADER_RE =
    /(Headers\.(?:append|set): )\\?"(?:[^]*\\?"( is an invalid header (?:name|value)\.)$|[^]*)/;
//@ chunk-aepeg2w5.js:389000-389080 placement
function Tp(e) {
  return e.replace(INVALID_HEADER_VALUE_RE, "$1<redacted>").replace(INVALID_HEADER_RE, "$1<redacted>$2");
}
/**
 * 遮盖占位符名与标识符格式。
 */
//@ chunk-aepeg2w5.js:389080-389570 placement
var REDACTION_TOKENS = 120,
  CH = /^#?[A-Za-z_$][\w$]*$/,
  RH = [
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
  ],
  xH = ["http-body", "domains", "tags", "non-identifier"],
  regExp_13 = new RegExp(
    `^<(?:${RH.map(urlPatternToRegex).join("|")}|(?:${xH.map(urlPatternToRegex).join("|")})\\.\\d+)>$`,
  ),
  PH = 40,
  MH = " is not defined",
  XE = "Cannot access '",
  IH = "' before initialization",
  DH = ["Can't find private variable: PrivateSymbol.", "Can't find variable: "],
  NH = /[)\]}'"`.,; \t\r\n]*$/,
  FH = 8;
//@ chunk-aepeg2w5.js:389570-389615 placement
function ik(e) {
  return `<non-identifier.${e}>`;
}
//@ chunk-aepeg2w5.js:389615-389703 placement
function sk(e) {
  return (e.length <= REDACTION_TOKENS && CH.test(e)) || (e.length <= PH && regExp_13.test(e))
    ? e
    : ik(e.length);
}
//@ chunk-aepeg2w5.js:389703-389809 placement
function findTrailerStart(e, n) {
  let sliced = e.slice(-FH),
    s = e.length - sliced.length + sliced.search(NH);
  return e.endsWith(n, s) ? s - n.length : -1;
}
//@ chunk-aepeg2w5.js:389809-389903 placement
function LH(e) {
  let n = findTrailerStart(e, MH);
  if (n < 0) return e;
  return (n <= REDACTION_TOKENS ? sk(e.slice(0, n)) : ik(n)) + e.slice(n);
}
//@ chunk-aepeg2w5.js:389903-390081 placement
function truncateAfterMarkers(e) {
  let index = e.indexOf(XE),
    r = index + XE.length,
    s = findTrailerStart(e, IH),
    h = index < 0 ? e : JE(e, r, s < r ? e.length : s);
  return DH.reduce((y, S) => {
    let index = y.indexOf(S);
    return index < 0 ? y : JE(y, index + S.length, y.length);
  }, h);
}
//@ chunk-aepeg2w5.js:390081-390148 placement
function JE(e, n, r) {
  return e.slice(0, n) + sk(e.slice(n, r)) + e.slice(r);
}
//@ chunk-aepeg2w5.js:390148-390332 placement
var UA_BLOCKED_DOMAINS_RE =
  /(domains are not accessible to our user agent)(?!:? ?(?:<domains\.\d+>\. Read more: |<redacted>$))(:? ?)(?:\[('[a-z0-9._-]+'(?:, '[a-z0-9._-]+')*)\](?=\. Read more: )|[^]*)/gi;
//@ chunk-aepeg2w5.js:390332-390460 placement
function redactBlockedDomains(e) {
  return e.replace(
    UA_BLOCKED_DOMAINS_RE,
    (n, r, s, h) => `${r}${s || ": "}${h === void 0 ? "<redacted>" : `<domains.${h.split("', '").length}>`}`,
  );
}
/**
 * 主机名错误消息模式。
 */
//@ chunk-aepeg2w5.js:390460-392131 placement
var HOSTNAME_ERROR_PATTERNS = [
    String.raw`Hostname is too long\. Public domain names are required\.`,
    String.raw`Hostname contains non-ASCII characters that do not form a valid internationalized domain name\. Public domain names are required\.`,
    String.raw`Host is a non-canonical IP address literal \(resolves to <ip>\)\. Use the dotted-quad form or a domain name\.`,
    String.raw`Host looks like an IP address but could not be parsed\. Public domain names are required\.`,
    String.raw`IP address is in a restricted range \((?:<ip>|::1|::|fe80::|fc00::|ff00::)\/\d{1,3}\)\. Public domain names are required\.`,
    String.raw`Hostname matches restricted pattern \(e\.g\., (?:localhost|\*\.local|\*\.internal|\*\.localdomain)\)\. Public domain names are required\.`,
  ],
  dk = String.raw`(Cannot use ')[^]*'?`,
  ck = ["allowed_domains", "blocked_domains"],
  Ou = String.raw` in (?:${ck.join("|")}): `,
  regExp_14 = new RegExp(String.raw`${dk}(${Ou})(${HOSTNAME_ERROR_PATTERNS.join("|")})?[^]*`, "g"),
  regExp_15 = new RegExp(String.raw`${dk}(${Ou}[^\n]*)[^]*`),
  regExp_16 = new RegExp(String.raw`('${Ou})(${HOSTNAME_ERROR_PATTERNS.join("|")})?[^]*`),
  ZH =
    /(Invalid domain format: )(?:[^]*( in (?:allowed|blocked)_domains(?: contains (?:a newline|whitespace|'[*?]')\.(?: Wildcards, whitespace, and line breaks are not supported; provide a plain hostname like 'example\.com'\.)?|\.(?!\w)))[^]*|[^]*)/g,
  eB =
    /((?:allowed|blocked)_domains: ')(?:[^]*'?( is not a valid domain format\. Domains should follow the format example\.com or example\.com\/path\.)[^]*|[^]*)/g,
  tB = /([Tt]hese entries (?:are not supported|have a path): )[^]*/g,
  nB =
    /(entries conflict with domains blocked by your organization: )(?:[^]*(\. Remove them from `allowed_domains`, or ask an organization admin to unblock them\.)[^]*|[^]*)/g;
//@ chunk-aepeg2w5.js:392131-392192 placement
function fk(e) {
  return ck.some((n) => e.includes(` in ${n}: `));
}
//@ chunk-aepeg2w5.js:392192-392254 placement
function rB(e) {
  return fk(e) ? e.replace(regExp_15, "$1<redacted>'$2") : e;
}
/**
 * 遮盖引号中的值。
 */
//@ chunk-aepeg2w5.js:392254-392562 placement
function redactQuotedValues(e) {
  return (
    fk(e)
      ? e
          .replace(regExp_14, (r, s, h, y) => `${s}<redacted>'${h}${y ?? "<redacted>"}`)
          .replace(regExp_16, (r, s, h) => `${s}${h ?? "<redacted>"}`)
      : e
  )
    .replace(ZH, (r, s, h) => `${s}<redacted>${h ?? ""}`)
    .replace(eB, (r, s, h) => `${s}<redacted>'${h ?? ""}`)
    .replace(tB, "$1<redacted>")
    .replace(nB, (r, s, h) => `${s}<redacted>${h ?? ""}`);
}
//@ chunk-aepeg2w5.js:392562-392633 placement
var iB = /(arn):(aws[\w*?-]*|\*):([\w*?-]*):([\w*?-]*):[\d*?]*:[^\n]*/gi;
//@ chunk-aepeg2w5.js:392633-392694 placement
function sB(e) {
  return e.replace(iB, (n, r, s, h, y) => redactArn(r, s, h, y));
}
/**
 * 各种引号的正则与证书主机名错误模式。
 */
//@ chunk-aepeg2w5.js:392694-393097 placement
var QUOTE_PATTERN = String.raw`(?:'|\\'|\\u0027|&#0*39;|&#[xX]0*27;|&apos;|\u2019|&#0*8217;|&#[xX]0*2019;|&rsquo;)`,
  regExp_17 = new RegExp(
    String.raw`(Hostname(?:\/|\\\/|\\u002[Ff])IP does(?: not|n${QUOTE_PATTERN}t) match certificate)[^]*`,
  ),
  regExp_18 = new RegExp(
    String.raw`\b(Host: )\S*?(\. is not (?:in the cert${QUOTE_PATTERN}s altnames|cert${QUOTE_PATTERN}s CN): )[^]*|\b(IP: )\S+( is not in the cert${QUOTE_PATTERN}s list: )[^]*|\b(Cert does not contain a DNS name)[^]+`,
  );
//@ chunk-aepeg2w5.js:393097-393374 placement
function redactTlsAltnames(e) {
  let replaced = e.replace(regExp_17, "$1's altnames: <redacted>"),
    match = regExp_18.exec(replaced);
  if (!match) return replaced;
  let [, s, h, y, S, w] = match,
    sliced = replaced.slice(0, match.index);
  if (s !== void 0) return `${sliced}${s}<host>${h}<redacted>`;
  if (y !== void 0) return `${sliced}${y}<ip>${S}<redacted>`;
  return `${sliced}${w === void 0 ? "" : `${w} `}<redacted>`;
}
//@ chunk-aepeg2w5.js:393374-393635 placement
var COMMAND_PREFIX_BOUNDARY = String.raw`(?:\b|\\[nrt]|\x1b\[[0-9;?]{0,20}[A-Za-z]|\\u001[bB]\[[0-9;?]{0,20}[A-Za-z]|_)`,
  regExp_19 = new RegExp(
    String.raw`(${COMMAND_PREFIX_BOUNDARY}Command (?:(?:failed with|timed out after|was killed with) [^:\n]{0,200}|was (?:gracefully )?canceled[^:\n]{0,200}|failed): )[^]*`,
  );
//@ chunk-aepeg2w5.js:393635-393686 placement
function cB(e) {
  return e.replace(regExp_19, "$1<redacted>");
}
/**
 * 系统错误码列表（用于识别错误消息）。
 */
//@ chunk-aepeg2w5.js:393686-395843 placement
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
    .split(/\s+/),
  freeze = Object.freeze([...ERRNO_NAMES]),
  pk = String.raw`(?=E[A-Z0-9]|U)(?:${ERRNO_NAMES.join("|")}|UNKNOWN|Unknown system error -?\d+)`,
  fB = String.raw`(?:(?!'${Ou}|\b${Ru})[^\n])+`,
  mk = String.raw`(?:\r?\n\s*(?=\S))?`,
  pB = String.raw`(?:\n\s*)?`,
  mB = String.raw`( (?:${pk})(?![A-Za-z0-9\-/]|_\w|\\(?!["\\/bfnrt]|u[0-9A-Fa-f]{4})|\.\w))[^]*`,
  regExp_20 = new RegExp(String.raw`(${COMMAND_PREFIX_BOUNDARY}spawn(?:Sync)? )${mk}${fB}${pB}${mB}`, "g"),
  regExp_21 = new RegExp(
    String.raw`(${COMMAND_PREFIX_BOUNDARY}spawn(?:Sync)? )${mk}[^\n]+(?:\n\s*(?=\S)[^\n]*)?(\u2026<truncated>)$`,
  ),
  hB = /(Executable not found in \$PATH: )(?!<redacted>$)[^]*/,
  regExp_22 = new RegExp(String.raw` (?:${pk})`);
//@ chunk-aepeg2w5.js:395843-395939 placement
function bB(e) {
  return (regExp_22.test(e) ? e.replace(regExp_20, "$1<redacted>$2") : e).replace(
    regExp_21,
    "$1<redacted>$2",
  );
}
//@ chunk-aepeg2w5.js:395939-396072 placement
function redactSpawnPaths(e) {
  let n = e.includes("spawn") ? bB(e) : e;
  return n.includes("Executable not found in $PATH: ") ? n.replace(hB, "$1<redacted>") : n;
}
/**
 * 模块加载错误消息模式。
 */
//@ chunk-aepeg2w5.js:396072-396627 placement
var MODULE_ERROR_PATTERNS = String.raw`[A-Z][A-Za-z0-9_]{1,63}`,
  vB = [
    String.raw`${MODULE_ERROR_PATTERNS} (?:reading|parsing data url|decoding data|(?:while )?resolving(?: package| preload)?)`,
    "Cannot find (?:module|package)",
    "Cannot resolve invalid (?:data )?URL",
    "Cannot read directory",
    "Module not found",
    "preload not found",
    String.raw`\d+ errors building`,
    "Unexpected pending import in",
  ],
  regExp_23 = new RegExp(String.raw`(${COMMAND_PREFIX_BOUNDARY}(?:${vB.join("|")}) )\\*["'][^]*`),
  kB = ["No such built-in module:", String.raw`${MODULE_ERROR_PATTERNS} while building`],
  regExp_24 = new RegExp(String.raw`(${COMMAND_PREFIX_BOUNDARY}(?:${kB.join("|")}) )(?!<redacted>$)[^]*`);
//@ chunk-aepeg2w5.js:396627-396705 placement
function AB(e) {
  return e.replace(regExp_23, "$1<redacted>").replace(regExp_24, "$1<redacted>");
}
//@ chunk-aepeg2w5.js:396705-396927 placement
var INPUT_TAG_MISMATCH_RE =
    /(Input tag ')(?:([^]*)' found using 'type' does not match any of the expected tags: ('[\w.-]{1,64}'(?:, '[\w.-]{1,64}')*|<tags\.\d{1,4}>)$|[^]*)/,
  INPUT_TAG_MISMATCH_MIDDLE = "' found using 'type' does not match any of the expected tags: ";
//@ chunk-aepeg2w5.js:396927-397100 placement
function redactInputTagMismatch(e) {
  let replaced = e.replace(INPUT_TAG_MISMATCH_RE, (r, s, h, y) =>
    h === void 0 || y === void 0 ? `${s}<redacted>` : `${s}${YE(h)}${INPUT_TAG_MISMATCH_MIDDLE}${RB(y)}`,
  );
  return replaced.length > kp
    ? replaced.replace(INPUT_TAG_MISMATCH_RE, (r, s) => `${s}<redacted>`)
    : replaced;
}
//@ chunk-aepeg2w5.js:397100-397194 placement
function RB(e) {
  return e.startsWith("<tags.") ? e : `<tags.${e.slice(1, -1).split("', '").length}>`;
}
/**
 * DNS 错误消息模式。
 */
//@ chunk-aepeg2w5.js:397194-398158 placement
var DNS_ERROR_PATTERNS = [
    "getaddrinfo",
    "getnameinfo",
    "getHostByAddr",
    "query(?:A|Aaaa|Any|Caa|Cname|Mx|Naptr|Ns|Ptr|Soa|Srv|Tlsa|Txt)",
    "connect",
  ],
  xB = `(?:${DNS_ERROR_PATTERNS.join("|")})`,
  hk = String.raw`${xB} E[A-Z][A-Z0-9_]{1,30} `,
  xp = String.raw`\s"'\`,;()<>[\]{}\\\u2026`,
  OB = String.raw`(?:"{1,2}|[,;'\`(){}]+)`,
  Cu = String.raw`(?!\b(?:${hk}|${Ru}))`,
  PB = String.raw`(?![,;'\`(){}]*${API_ERROR_JSON_START})`,
  joined = uniq([...DNS_ERROR_PATTERNS.map((e) => e.charAt(0)), "E"]).join(""),
  ZE = String.raw`[^${xp}${joined}]*`,
  bk = String.raw`${ZE}(?:(?:${Cu}[${joined}]+|${PB}${OB}${Cu}[^${xp}])${ZE})*`,
  MB = String.raw`${Cu}(?![A-Za-z]:[\\/]|\.{1,2}[\\/])[^${xp}/~]${bk}`,
  regExp_25 = new RegExp(String.raw`\b(${hk})(["'\`({])?(${MB})( ${Cu}\3${bk})?`, "g"),
  DB = /[^.,;:!?'"`)}~][.,;:!?'"`)}~]*$/,
  NB = /^(?:\d{1,3}\.){3}\d{1,3}(:\d{1,5})?$/,
  ek = /^[0-9A-Fa-f.]*:[0-9A-Fa-f.]*:[0-9A-Fa-f:.]*$/,
  FB = /^(?:undefined|null)(?::\d{1,5})?$/,
  LB = /:\d{1,5}$/,
  UB = /^\d{1,4}$/,
  HB = /^(?:([^]*)([^A-Za-z0-9]))?(bearer|basic)$/i,
  BB = /~\//,
  KB = /\b[A-Za-z]:\//,
  GB = /(?:~|[A-Za-z]:)$/,
  $B = /(?:\/[^\s"':]+){2}/;
//@ chunk-aepeg2w5.js:398158-398412 placement
function redactHostPrefix(e) {
  let n = e.search(DB) + 1;
  if (n === 0) return e;
  let sliced = e.slice(0, n),
    sliced_2 = e.slice(n),
    match = NB.exec(sliced);
  if (match) return `<ip>${match[1] ?? ""}${sliced_2}`;
  if (ek.test(sliced)) return `<ip>${sliced_2}`;
  if (ek.test(e)) return "<ip>";
  if (FB.test(sliced)) return e;
  return `<host>${LB.exec(sliced)?.[0] ?? ""}${sliced_2}`;
}
//@ chunk-aepeg2w5.js:398412-398606 placement = ghIsDangerousCallback (0.806)
function ghIsDangerousCallback(_rawCommand, args) {
  if (_rawCommand.includes("://")) return -1;
  let search = _rawCommand.search(BB);
  if (search > 0) return search;
  let search_2 = _rawCommand.search(KB);
  if (search_2 >= 0) return search_2;
  let h = args ? _rawCommand.search(GB) : -1;
  if (h >= 0) return h;
  let search_3 = _rawCommand.search($B);
  return search_3 > 0 ? search_3 : -1;
}
//@ chunk-aepeg2w5.js:398606-398790 placement
function redactHostSegment(e, n) {
  if (UB.test(e)) return e;
  let r = ghIsDangerousCallback(e, n);
  if (r >= 0) return redactHostPrefix(e.slice(0, r)) + e.slice(r);
  let match = HB.exec(e);
  if (match) {
    let [, h = "", y = "", S = ""] = match;
    return (h === "" ? "" : redactHostPrefix(h)) + y + S;
  }
  return redactHostPrefix(e);
}
//@ chunk-aepeg2w5.js:398790-398842 placement
var regExp_26 = new RegExp(String.raw`\b${Ru}|${API_ERROR_JSON_START}`),
  jB = 160;
//@ chunk-aepeg2w5.js:398842-398963 placement
function redactHostBeforePort(e, n, r) {
  let match = regExp_26.exec(n);
  return match !== null && match.index < e.length
    ? redactHostSegment(e.slice(0, match.index), !1) + e.slice(match.index)
    : redactHostSegment(e, r);
}
//@ chunk-aepeg2w5.js:398963-399150 placement
function redactHostnames(e) {
  return e.replace(regExp_25, (n, r, s, h, y, S) => {
    let w = S + n.length,
      R = e[w] === "\\";
    return (
      r +
      (s ?? "") +
      redactHostSegment(h, y === void 0 && R) +
      (y === void 0 ? "" : ` ${redactHostBeforePort(y.slice(1), e.slice(w - y.length + 1, w + jB), R)}`)
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
function XB(e) {
  return e.replace(regExp_27, "$1<path>");
}
/**
 * 把错误消息中出现的 path/dest 路径替换为 <path>（长路径优先）。
 */
//@ chunk-aepeg2w5.js:399359-399528 placement
function redactErrorPaths(e, n) {
  let r = e;
  return [r?.path, r?.dest]
    .filter((s) => typeof s === "string" && s.length > 0)
    .sort((s, h) => h.length - s.length)
    .reduce((s, h) => s.split(h).join("<path>"), n);
}
//@ chunk-aepeg2w5.js:399528-399540 placement
var kp = 4000;
/**
 * 对错误消息依次遮盖路径、密钥、邮箱、IP、URL 等后截断。
 */
//@ chunk-aepeg2w5.js:399540-399969 placement
function redactErrorMessage(e) {
  let n = LH(e),
    replaced = (n.length > kp ? n.slice(0, kp) + "\u2026<truncated>" : n).replaceAll(tk, "\uFFFD"),
    s = rB(replaced),
    h = redactHttpBodies(s),
    y = redactBlockedDomains(h),
    S = Tp(y),
    w = truncateAfterMarkers(S),
    R = redactTlsAltnames(w),
    x = cB(R),
    P = redactSpawnPaths(x),
    F = AB(P),
    L = redactInputTagMismatch(F),
    replaced_2 = redactHostnames(L)
      .replace(/:\/\/[^\s/]*@(?=[^@\s]*(?:[/:\s]|$))/g, "://<userinfo>@")
      .replace(/\b[\w][\w.+-]*@[\w.-]+:[^\s"')\]]*(?:\/[^\s"')\]]*|\.git\b)/gi, "<url>"),
    ee = redactSecretValues(replaced_2),
    q = redactMcpServerNames(redactPhoneNumbers(applyTokenRedactionRules(eH(X0(redactPaths(ee))))));
  return lH(sB(XB(redactQuotedValues(redactPathShapes(redactUrls(vH(q))))))).replace(W0, "");
}

export { Tp, redactErrorMessage, redactErrorPaths, freeze };

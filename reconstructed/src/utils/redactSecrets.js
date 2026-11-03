/**
 * utils/redactSecrets.ts
 *
 * 2.1.316 新增：敏感信息脱敏规则表（令牌、密钥模式）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bwbq4xvm.js (10), chunk-xtav90k5.js (3)
 * attribution: placement 13
 */
import { Tje, allowSeparatorsInPattern, gft } from "./sanitization.js";

//@ chunk-bwbq4xvm.js:167134-167213 placement
var SLACK_WEBHOOK_PATTERN = /hooks\.slack\.com\/(?:services|workflows|triggers)\/[A-Za-z0-9/_-]+/gi;
/**
 * 敏感信息脱敏规则表（Bearer/Basic 令牌、Slack token、sk-ant、OpenAI、AWS AKIA、JWT 等正则与替换文本）。
 */
//@ chunk-bwbq4xvm.js:167213-167800 placement
var SECRET_REDACTIONS = {
    bearer: [
      /\bBearer\s+(?=[A-Za-z0-9._~+/=-](?:[A-Za-z0-9._~+/=-]|%[0-9A-Fa-f]{2}){7})[A-Za-z0-9._~+/=-](?:[A-Za-z0-9._~+/=-]+|%[0-9A-Fa-f]{2})*/gi,
      "Bearer <token>",
    ],
    basic: [/(:\s*)Basic\s+[A-Za-z0-9+/=]{8,}/gi, "$1Basic <token>"],
    sk: [/\bsk-[A-Za-z0-9_-]{20,}/g, "<token>"],
  },
  hC = [
    /\bBearer\s{1,512}(?=[A-Za-z0-9._~+/=-](?:[A-Za-z0-9._~+/=-]|%(?!20)[0-9A-Fa-f]{2}){15})(?:eyJ|(?=(?:[A-Za-z0-9._~+/=-]|%(?!20)[0-9A-Fa-f]{2}){0,64}[0-9=]))/i,
    /:\s{0,512}Basic\s{1,512}(?=[A-Za-z0-9+/=]{16})(?=[A-Za-z0-9+/=]{0,64}[0-9=])/i,
    /\bsk-(?=[A-Za-z0-9_-]{20})(?=[A-Za-z0-9_-]{0,64}[0-9])/,
  ],
  BTi = 4096;
//@ chunk-bwbq4xvm.js:167800-168954 placement
var SLACK_TOKEN_PATTERN = new RegExp(
    `(?:\\b(?:xox[abe-z](?:\\.xox[a-z])?|xapp|xwfp)-${requireDigitLookahead("[A-Za-z0-9+/=%_-]")}|\\bxox[cd]-|(?:xox[abe-z](?:\\.xox[a-z])?|xapp|xwfp)-(?=[0-9])|xox[cd]-${requireDigitLookahead("[A-Za-z0-9+/=%_-]")}(?=[A-Za-z0-9+/=%_-]{16}))`,
    "i",
  ),
  hd = [
    [tokenPrefixPattern("sk-ant-", "[A-Za-z0-9_-]", 8, mixedAlnumLookahead(8)), "<token>"],
    [
      tokenPrefixPattern("sk-(?:proj|svcacct|admin)-", "[A-Za-z0-9_-]", 20, mixedAlnumLookahead(20)),
      "<token>",
    ],
  ],
  ud = ["AKIA", "ASIA", "ABIA", "ACCA", "A3T[A-Z0-9]"],
  uC = `(?:${ud.join("|")})`,
  pd = [[new RegExp(`(^|[^A-Za-z0-9+])${uC}[A-Z0-9]{16}(?![A-Za-z0-9+=])`, "g"), "$1<token>"]],
  md = [
    [tokenPrefixPattern("gh[opusr]_", "[A-Za-z0-9]", 20, requireDigitLookahead("[A-Za-z0-9]")), "<token>"],
    [/github_pat_[A-Za-z0-9_]{82,}/g, "<token>"],
    [/sq0(?:atp|csp)-[A-Za-z0-9_-]{22,}/g, "<token>"],
    [/(^|[^A-Za-z0-9+/])EAAA[A-Za-z0-9+/=%_-]{56,}/g, "$1<token>"],
    [
      tokenPrefixPattern(
        "gl(?:pat|dt|rt|ft|soat|oas|agent|ptt|cbt|imt|ffct)-",
        "[A-Za-z0-9_=-]",
        20,
        requireDigitLookahead("[A-Za-z0-9_=-]"),
        "(?:\\.[0-9a-z]{9})?",
      ),
      "<token>",
    ],
    [
      tokenPrefixPattern(
        "(?:xox[abe-z](?:\\.xox[a-z])?|xapp|xwfp)-",
        "[A-Za-z0-9+/=%_-]",
        10,
        "(?=[0-9])",
        "",
        requireDigitLookahead("[A-Za-z0-9+/=%_-]"),
        "gi",
      ),
      "<token>",
    ],
    [
      new RegExp(
        `(?:\\bxox[cd]-[A-Za-z0-9+/=%_-]{10,}|xox[cd]-${requireDigitLookahead("[A-Za-z0-9+/=%_-]")}[A-Za-z0-9+/=%_-]{16,})`,
        "gi",
      ),
      "<token>",
    ],
    [SLACK_WEBHOOK_PATTERN, "hooks.slack.com/<redacted>"],
  ];
//@ chunk-bwbq4xvm.js:168954-169904 placement
var JWT_TOKEN_PATTERNS = [
    new RegExp(
      "(?<![A-Za-z0-9_-])(?=[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]{10}[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]{10}[A-Za-z0-9_-]*)((?:[A-Za-z0-9_-]*?-)??)ey[A-Za-z0-9_-]{10}[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]{10}[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]{10}[A-Za-z0-9_-]*",
      "g",
    ),
    "$1<jwt>",
  ],
  mC = /\beyJ(?:[A-Za-z0-9_-]{256}|[A-Za-z0-9_-]{8,2048}\.[A-Za-z0-9_-]{10})/,
  _d = [
    [/(^|[^A-Za-z0-9+_-])AIza[A-Za-z0-9_-]{35}(?![A-Za-z0-9+=_-])/g, "$1<token>"],
    [/(^|[^A-Za-z0-9+_-])GOCSPX-[A-Za-z0-9_-]{28}(?![A-Za-z0-9+=_-])/g, "$1<token>"],
  ],
  gd = [
    [
      /(^|[^A-Za-z0-9+_-])[sr]k_(?:live|test|prod)_(?=[A-Za-z0-9]{0,64}[0-9])[A-Za-z0-9]{24,}(?![A-Za-z0-9+=_-])/g,
      "$1<token>",
    ],
  ],
  gls = [SECRET_REDACTIONS.bearer, SECRET_REDACTIONS.basic, ...hd, SECRET_REDACTIONS.sk, ...pd],
  hls = [...md, JWT_TOKEN_PATTERNS, ..._d, ...gd],
  jTi = [
    [new RegExp(`sk-${mixedAlnumLookahead(20)}[A-Za-z0-9_-]{20,}`, "g"), "<token>"],
    ...ud.map((e) => [new RegExp(`${e}[A-Z2-7]{16}`, "g"), "<token>"]),
    [/AIza[\w-]{35}/g, "<token>"],
    [/GOCSPX-[\w-]{28,}/g, "<token>"],
    [/[sr]k_(?:live|test|prod)_[A-Za-z0-9]{24,}/g, "<token>"],
  ];
/**
 * 依次套用全部脱敏规则，把文本中的令牌/密钥替换为占位符。
 */
//@ chunk-bwbq4xvm.js:169904-169986 placement
function redactSecrets(e) {
  return [...gls, ...hls].reduce((s, [n, r]) => s.replace(n, r), String(e));
}
//@ chunk-bwbq4xvm.js:169986-170099 placement
var SECRET_DETECTORS = [
  ...hC,
  ...[...hd, ...pd, ...md, ..._d, ...gd].map(([e]) => new RegExp(e.source, e.flags.replaceAll("g", ""))),
  mC,
];
//@ chunk-bwbq4xvm.js:170099-170146 placement
function containsSecret(e) {
  return SECRET_DETECTORS.some((s) => s.test(e));
}
//@ chunk-bwbq4xvm.js:170146-170263 placement
function tokenPrefixPattern(e, s, n, r, a = "", l = "", c = "g") {
  let h = `${s}{${n},}${a}`;
  return new RegExp(`(?:\\b${e}${l}${h}|${e}${r}${h})`, c);
}
//@ chunk-bwbq4xvm.js:170263-170306 placement
function requireDigitLookahead(e) {
  return `(?=${e}{0,64}[0-9])`;
}
//@ chunk-bwbq4xvm.js:170306-170430 placement
function mixedAlnumLookahead(e) {
  return `(?=[A-Za-z0-9_-]{0,64}?(?=[A-Za-z0-9]{${e}})(?=[A-Za-z0-9]{0,64}[0-9])(?=[A-Za-z0-9]{0,64}[A-Za-z]))`;
}
/**
 * 敏感信息脱敏的正则构件：不可见字符、空白类、键名字符、JWT 片段；R 为普通规则（key=value、Bearer、Basic），l 为容忍不可见字符插入的加强版规则，z 检测格式/不可见字符。
 */
//@ chunk-xtav90k5.js:236-1173 placement
var INVISIBLE_RUN = `[${Tje}]*`,
  SPACE_OR_INVISIBLE = `[\\s${Tje}]`,
  WHITESPACE_CHARS = String.raw`\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000`,
  KEY_CHAR = `[^=:${WHITESPACE_CHARS}]`,
  OPTIONAL_GAP = `(?:[${WHITESPACE_CHARS}]${SPACE_OR_INVISIBLE}*)?`,
  B64URL_CHAR = "[A-Za-z0-9_-]",
  B64URL_RUN = `${B64URL_CHAR}{8}${B64URL_CHAR}*`,
  JWT_TAIL = `\\.eyJ${B64URL_RUN}\\.${B64URL_RUN}`,
  regExp = new RegExp(
    `((?<!${B64URL_CHAR})(?=${B64URL_CHAR}+${JWT_TAIL})${B64URL_CHAR}*?)eyJ${B64URL_RUN}${JWT_TAIL}`,
    "g",
  ),
  PLAIN_SECRET_RULES = {
    keyValue: new RegExp(
      "((?:^|[\\s=:])(?=[^=:\\s]+\\s*[=:]\\s*\\S)[^=:\\s]*?(?:secret|key|token|password|credential)[^=:\\s]*\\s*[=:]\\s*)\\S+",
      "gi",
    ),
    bearer: /(Bearer )\S+/gi,
    basicAuth: /(Authorization:\s*Basic\s+)\S+/gi,
  },
  OBFUSCATION_TOLERANT_RULES = {
    keyValue: new RegExp(
      `((?:^|[=:${WHITESPACE_CHARS}])(?=[${Tje}\\ufeff]*[^=:\\s${Tje}])(?=${KEY_CHAR}+${OPTIONAL_GAP}[=:]${SPACE_OR_INVISIBLE}*[^${WHITESPACE_CHARS}])${KEY_CHAR}*?(?:${allowSeparatorsInPattern("secret|key|token|password|credential")})${KEY_CHAR}*${OPTIONAL_GAP}[=:]${SPACE_OR_INVISIBLE}*)[^${WHITESPACE_CHARS}]+`,
      "gi",
    ),
    bearer: new RegExp(
      `((?:${allowSeparatorsInPattern("Bearer")})${gft} [${Tje}\\ufeff]*)[^${WHITESPACE_CHARS}]+`,
      "gi",
    ),
    basicAuth: new RegExp(
      `((?:${allowSeparatorsInPattern("Authorization")})${gft}:${SPACE_OR_INVISIBLE}*(?:${allowSeparatorsInPattern("Basic")})${INVISIBLE_RUN}\\s${SPACE_OR_INVISIBLE}*)[^${WHITESPACE_CHARS}]+`,
      "gi",
    ),
  },
  FORMAT_CHAR_RE = /[\p{Cf}\p{Default_Ignorable_Code_Point}\p{Cs}\u2800\ufeff]/u;
//@ chunk-xtav90k5.js:1173-1227 placement
function redactSecretsInText(r) {
  let s = applySecretRedaction(r, PLAIN_SECRET_RULES);
  return FORMAT_CHAR_RE.test(r) ? applySecretRedaction(s, OBFUSCATION_TOLERANT_RULES) : s;
}
/**
 * 按给定规则脱敏文本：URL 中的用户信息、key=value 秘密、sk-ant 密钥、Bearer、JWT、GitHub/GitLab 等令牌、Basic 认证，替换为 [REDACTED] 类占位。
 */
//@ chunk-xtav90k5.js:1227-2467 placement
function applySecretRedaction(text, patterns) {
  return text
    .replace(/(\b[a-z][a-z0-9+.-]{0,31}:\/\/)[^@/\s]+@/gi, "$1***:***@")
    .replace(patterns.keyValue, "$1[REDACTED]")
    .replace(/(\b[a-z][a-z0-9+.-]{0,31}:\/\/\*\*\*:\*\*\*@)(?:[^@/?#\s"',;&>|)\]}`]*@)+/gi, "$1")
    .replace(/sk-ant-[A-Za-z0-9_.-]+/g, "[REDACTED]")
    .replace(patterns.bearer, "$1[REDACTED]")
    .replace(regExp, "$1[REDACTED-JWT]")
    .replace(
      /(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{82,}|gl(?:pat|dt|rt|ft|soat|oas|agent|ptt|cbt|imt|ffct)-[A-Za-z0-9_=-]{20,}(?:\.[0-9a-z]{9})?|xox[a-z]-[A-Za-z0-9+/=%_-]{10,}|xapp-[A-Za-z0-9_-]{10,}|xwfp-[A-Za-z0-9_-]{10,}|[Hh][Oo][Oo][Kk][Ss]\.[Ss][Ll][Aa][Cc][Kk]\.[Cc][Oo][Mm]\/(?:services|workflows|triggers)\/[A-Za-z0-9+/_-]{20,}|sq0(?:atp|csp)-[A-Za-z0-9_-]{22,}|EAAA[A-Za-z0-9+/=%_-]{56,}|AIza[A-Za-z0-9_-]{35}|GOCSPX-[A-Za-z0-9_-]{28}|[sr]k_(?:live|test|prod)_[A-Za-z0-9]{24,})/g,
      "[REDACTED-PAT]",
    )
    .replace(patterns.basicAuth, "$1[REDACTED]")
    .replace(
      /(\b[a-z][a-z0-9+.-]{0,31}:\/\/)(?!\*\*\*:\*\*\*%40)(?:\*\*\*:\*\*\*@)?(?![^@/?#\s"',;&>|)\]}`]*@)(?:[^@/?#\s"',;&<>|)\]{}`[]*["'`<>{}[\]][^@/?#\s,;&|{}"'`<>[\]()]*(%40)|[^@/?#\s"',;&<>|)\]}`[]+(%40)|(?=[^@/?#\s"',;&<>|)\]}`[]*?(?:%|:[^@/?#\s"',;&<>|)\]}`[]))[^@/?#\s"',;&<>|)\]}`[]+(?=\[REDACTED[-A-Z]*\]))/gi,
      (S, i, o, p) => `${i}***:***${o ?? p ?? ""}`,
    );
}

export { redactSecretsInText, containsSecret, redactSecrets, gls, hls, jTi, BTi };

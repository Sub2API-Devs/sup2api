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
import {
  INVISIBLE_CHAR_RANGES,
  allowSeparatorsInPattern,
  INVISIBLE_CHARS_RE_SOURCE,
} from "./sanitization.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bwbq4xvm.js:167134-167213 placement
var SLACK_WEBHOOK_PATTERN = /hooks\.slack\.com\/(?:services|workflows|triggers)\/[A-Za-z0-9/_-]+/gi;
//@ chunk-bwbq4xvm.js:167213-167800 placement
/**
 * 敏感信息脱敏规则表（Bearer/Basic 令牌、Slack token、sk-ant、OpenAI、AWS AKIA、JWT 等正则与替换文本）。
 */
var SECRET_REDACTIONS_2 = {
  bearer: [
    /\bBearer\s+(?=[A-Za-z0-9._~+/=-](?:[A-Za-z0-9._~+/=-]|%[0-9A-Fa-f]{2}){7})[A-Za-z0-9._~+/=-](?:[A-Za-z0-9._~+/=-]+|%[0-9A-Fa-f]{2})*/gi,
    "Bearer <token>",
  ],
  basic: [/(:\s*)Basic\s+[A-Za-z0-9+/=]{8,}/gi, "$1Basic <token>"],
  sk: [/\bsk-[A-Za-z0-9_-]{20,}/g, "<token>"],
};
var SECRET_REDACTIONS = [
  /\bBearer\s{1,512}(?=[A-Za-z0-9._~+/=-](?:[A-Za-z0-9._~+/=-]|%(?!20)[0-9A-Fa-f]{2}){15})(?:eyJ|(?=(?:[A-Za-z0-9._~+/=-]|%(?!20)[0-9A-Fa-f]{2}){0,64}[0-9=]))/i,
  /:\s{0,512}Basic\s{1,512}(?=[A-Za-z0-9+/=]{16})(?=[A-Za-z0-9+/=]{0,64}[0-9=])/i,
  /\bsk-(?=[A-Za-z0-9_-]{20})(?=[A-Za-z0-9_-]{0,64}[0-9])/,
];
var SECRET_REDACTION_PATTERNS = 4096;
//@ chunk-bwbq4xvm.js:167800-168954 placement
/**
 * SLACK_TOKEN_PATTERN：Slack 令牌正则；AWS_KEY_PREFIXES：AWS access key 前缀列表；AWS_KEY_PREFIX_PATTERN：AWS access key 前缀的正则源码（同一声明共 5 个绑定）。
 */
var SLACK_TOKEN_PATTERN_2; // deferred: uses requireDigitLookahead of its import cycle while loading; runs once the cycle is complete
var SLACK_TOKEN_PATTERN;
var AWS_KEY_PREFIXES;
var AWS_KEY_PREFIX_PATTERN;
var AWS_ACCESS_KEY_RULES;
var GIT_AND_CLOUD_TOKEN_RULES;
deferInit("chunk-bwbq4xvm.js:167800", () => {
  SLACK_TOKEN_PATTERN_2 = new RegExp(
    `(?:\\b(?:xox[abe-z](?:\\.xox[a-z])?|xapp|xwfp)-${requireDigitLookahead("[A-Za-z0-9+/=%_-]")}|\\bxox[cd]-|(?:xox[abe-z](?:\\.xox[a-z])?|xapp|xwfp)-(?=[0-9])|xox[cd]-${requireDigitLookahead("[A-Za-z0-9+/=%_-]")}(?=[A-Za-z0-9+/=%_-]{16}))`,
    "i",
  );
  SLACK_TOKEN_PATTERN = [
    [tokenPrefixPattern("sk-ant-", "[A-Za-z0-9_-]", 8, mixedAlnumLookahead(8)), "<token>"],
    [
      tokenPrefixPattern("sk-(?:proj|svcacct|admin)-", "[A-Za-z0-9_-]", 20, mixedAlnumLookahead(20)),
      "<token>",
    ],
  ];
  AWS_KEY_PREFIXES = ["AKIA", "ASIA", "ABIA", "ACCA", "A3T[A-Z0-9]"];
  AWS_KEY_PREFIX_PATTERN = `(?:${AWS_KEY_PREFIXES.join("|")})`;
  AWS_ACCESS_KEY_RULES = [
    [new RegExp(`(^|[^A-Za-z0-9+])${AWS_KEY_PREFIX_PATTERN}[A-Z0-9]{16}(?![A-Za-z0-9+=])`, "g"), "$1<token>"],
  ];
  GIT_AND_CLOUD_TOKEN_RULES = [
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
});
//@ chunk-bwbq4xvm.js:168954-169904 placement
/**
 * JWT_TOKEN_PATTERNS：JWT 令牌正则列表；GOOGLE_API_KEY_RULES：Google API key 的脱敏规则；STRIPE_KEY_RULES：Stripe 密钥的脱敏规则（同一声明共 6 个绑定）。
 */
var JWT_TOKEN_PATTERNS_2; // deferred: uses SECRET_REDACTIONS_2 of its import cycle while loading; runs once the cycle is complete
var JWT_TOKEN_PATTERNS;
var GOOGLE_API_KEY_RULES;
var STRIPE_KEY_RULES;
var GENERIC_SECRET_RULES;
var TOKEN_AND_JWT_RULES;
var SHORT_PREFIX_TOKEN_RULES;
deferInit("chunk-bwbq4xvm.js:168954", () => {
  JWT_TOKEN_PATTERNS_2 = [
    new RegExp(
      "(?<![A-Za-z0-9_-])(?=[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]{10}[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]{10}[A-Za-z0-9_-]*)((?:[A-Za-z0-9_-]*?-)??)ey[A-Za-z0-9_-]{10}[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]{10}[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]{10}[A-Za-z0-9_-]*",
      "g",
    ),
    "$1<jwt>",
  ];
  JWT_TOKEN_PATTERNS = /\beyJ(?:[A-Za-z0-9_-]{256}|[A-Za-z0-9_-]{8,2048}\.[A-Za-z0-9_-]{10})/;
  GOOGLE_API_KEY_RULES = [
    [/(^|[^A-Za-z0-9+_-])AIza[A-Za-z0-9_-]{35}(?![A-Za-z0-9+=_-])/g, "$1<token>"],
    [/(^|[^A-Za-z0-9+_-])GOCSPX-[A-Za-z0-9_-]{28}(?![A-Za-z0-9+=_-])/g, "$1<token>"],
  ];
  STRIPE_KEY_RULES = [
    [
      /(^|[^A-Za-z0-9+_-])[sr]k_(?:live|test|prod)_(?=[A-Za-z0-9]{0,64}[0-9])[A-Za-z0-9]{24,}(?![A-Za-z0-9+=_-])/g,
      "$1<token>",
    ],
  ];
  GENERIC_SECRET_RULES = [
    SECRET_REDACTIONS_2.bearer,
    SECRET_REDACTIONS_2.basic,
    ...SLACK_TOKEN_PATTERN,
    SECRET_REDACTIONS_2.sk,
    ...AWS_ACCESS_KEY_RULES,
  ];
  TOKEN_AND_JWT_RULES = [
    ...GIT_AND_CLOUD_TOKEN_RULES,
    JWT_TOKEN_PATTERNS_2,
    ...GOOGLE_API_KEY_RULES,
    ...STRIPE_KEY_RULES,
  ];
  SHORT_PREFIX_TOKEN_RULES = [
    [new RegExp(`sk-${mixedAlnumLookahead(20)}[A-Za-z0-9_-]{20,}`, "g"), "<token>"],
    ...AWS_KEY_PREFIXES.map((prefix) => [new RegExp(`${prefix}[A-Z2-7]{16}`, "g"), "<token>"]),
    [/AIza[\w-]{35}/g, "<token>"],
    [/GOCSPX-[\w-]{28,}/g, "<token>"],
    [/[sr]k_(?:live|test|prod)_[A-Za-z0-9]{24,}/g, "<token>"],
  ];
});
//@ chunk-bwbq4xvm.js:169904-169986 placement
/**
 * 依次套用全部脱敏规则，把文本中的令牌/密钥替换为占位符。
 */
function redactSecrets(text) {
  return [...GENERIC_SECRET_RULES, ...TOKEN_AND_JWT_RULES].reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    String(text),
  );
}
//@ chunk-bwbq4xvm.js:169986-170099 placement
var SECRET_DETECTORS; // deferred: uses SECRET_REDACTIONS_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bwbq4xvm.js:169986", () => {
  SECRET_DETECTORS = [
    ...SECRET_REDACTIONS,
    ...[
      ...SLACK_TOKEN_PATTERN,
      ...AWS_ACCESS_KEY_RULES,
      ...GIT_AND_CLOUD_TOKEN_RULES,
      ...GOOGLE_API_KEY_RULES,
      ...STRIPE_KEY_RULES,
    ].map(([pattern]) => new RegExp(pattern.source, pattern.flags.replaceAll("g", ""))),
    JWT_TOKEN_PATTERNS,
  ];
});
//@ chunk-bwbq4xvm.js:170099-170146 placement
function containsSecret(text) {
  return SECRET_DETECTORS.some((detector) => detector.test(text));
}
//@ chunk-bwbq4xvm.js:170146-170263 placement
function tokenPrefixPattern(
  prefix,
  charClass,
  minLength,
  digitLookahead,
  suffix = "",
  lookahead = "",
  flags = "g",
) {
  let bodyPattern = `${charClass}{${minLength},}${suffix}`;
  return new RegExp(
    `(?:\\b${prefix}${lookahead}${bodyPattern}|${prefix}${digitLookahead}${bodyPattern})`,
    flags,
  );
}
//@ chunk-bwbq4xvm.js:170263-170306 placement
function requireDigitLookahead(charClass) {
  return `(?=${charClass}{0,64}[0-9])`;
}
//@ chunk-bwbq4xvm.js:170306-170430 placement
function mixedAlnumLookahead(digitCount) {
  return `(?=[A-Za-z0-9_-]{0,64}?(?=[A-Za-z0-9]{${digitCount}})(?=[A-Za-z0-9]{0,64}[0-9])(?=[A-Za-z0-9]{0,64}[A-Za-z]))`;
}
//@ chunk-xtav90k5.js:236-1173 placement
/**
 * 敏感信息脱敏的正则构件：不可见字符、空白类、键名字符、JWT 片段；R 为普通规则（key=value、Bearer、Basic），l 为容忍不可见字符插入的加强版规则，z 检测格式/不可见字符。
 */
var INVISIBLE_RUN; // deferred: uses allowSeparatorsInPattern (./sanitization.js) of its import cycle while loading; runs once the cycle is complete
var SPACE_OR_INVISIBLE;
var WHITESPACE_CHARS;
var KEY_CHAR;
var OPTIONAL_GAP;
var B64URL_CHAR;
var B64URL_RUN;
var JWT_TAIL;
var regExp;
var PLAIN_SECRET_RULES;
var OBFUSCATION_TOLERANT_RULES;
var FORMAT_CHAR_RE;
deferInit("chunk-xtav90k5.js:236", () => {
  INVISIBLE_RUN = `[${INVISIBLE_CHAR_RANGES}]*`;
  SPACE_OR_INVISIBLE = `[\\s${INVISIBLE_CHAR_RANGES}]`;
  WHITESPACE_CHARS = String.raw`\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000`;
  KEY_CHAR = `[^=:${WHITESPACE_CHARS}]`;
  OPTIONAL_GAP = `(?:[${WHITESPACE_CHARS}]${SPACE_OR_INVISIBLE}*)?`;
  B64URL_CHAR = "[A-Za-z0-9_-]";
  B64URL_RUN = `${B64URL_CHAR}{8}${B64URL_CHAR}*`;
  JWT_TAIL = `\\.eyJ${B64URL_RUN}\\.${B64URL_RUN}`;
  regExp = new RegExp(
    `((?<!${B64URL_CHAR})(?=${B64URL_CHAR}+${JWT_TAIL})${B64URL_CHAR}*?)eyJ${B64URL_RUN}${JWT_TAIL}`,
    "g",
  );
  PLAIN_SECRET_RULES = {
    keyValue: new RegExp(
      "((?:^|[\\s=:])(?=[^=:\\s]+\\s*[=:]\\s*\\S)[^=:\\s]*?(?:secret|key|token|password|credential)[^=:\\s]*\\s*[=:]\\s*)\\S+",
      "gi",
    ),
    bearer: /(Bearer )\S+/gi,
    basicAuth: /(Authorization:\s*Basic\s+)\S+/gi,
  };
  OBFUSCATION_TOLERANT_RULES = {
    keyValue: new RegExp(
      `((?:^|[=:${WHITESPACE_CHARS}])(?=[${INVISIBLE_CHAR_RANGES}\\ufeff]*[^=:\\s${INVISIBLE_CHAR_RANGES}])(?=${KEY_CHAR}+${OPTIONAL_GAP}[=:]${SPACE_OR_INVISIBLE}*[^${WHITESPACE_CHARS}])${KEY_CHAR}*?(?:${allowSeparatorsInPattern("secret|key|token|password|credential")})${KEY_CHAR}*${OPTIONAL_GAP}[=:]${SPACE_OR_INVISIBLE}*)[^${WHITESPACE_CHARS}]+`,
      "gi",
    ),
    bearer: new RegExp(
      `((?:${allowSeparatorsInPattern("Bearer")})${INVISIBLE_CHARS_RE_SOURCE} [${INVISIBLE_CHAR_RANGES}\\ufeff]*)[^${WHITESPACE_CHARS}]+`,
      "gi",
    ),
    basicAuth: new RegExp(
      `((?:${allowSeparatorsInPattern("Authorization")})${INVISIBLE_CHARS_RE_SOURCE}:${SPACE_OR_INVISIBLE}*(?:${allowSeparatorsInPattern("Basic")})${INVISIBLE_RUN}\\s${SPACE_OR_INVISIBLE}*)[^${WHITESPACE_CHARS}]+`,
      "gi",
    ),
  };
  FORMAT_CHAR_RE = /[\p{Cf}\p{Default_Ignorable_Code_Point}\p{Cs}\u2800\ufeff]/u;
});
//@ chunk-xtav90k5.js:1173-1227 placement
function redactSecretsInText(text) {
  let text_2 = applySecretRedaction(text, PLAIN_SECRET_RULES);
  return FORMAT_CHAR_RE.test(text) ? applySecretRedaction(text_2, OBFUSCATION_TOLERANT_RULES) : text_2;
}
//@ chunk-xtav90k5.js:1227-2467 placement
/**
 * 按给定规则脱敏文本：URL 中的用户信息、key=value 秘密、sk-ant 密钥、Bearer、JWT、GitHub/GitLab 等令牌、Basic 认证，替换为 [REDACTED] 类占位。
 */
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
      (matched, scheme, encodedAtQuoted, encodedAtPlain) =>
        `${scheme}***:***${encodedAtQuoted ?? encodedAtPlain ?? ""}`,
    );
}
export {
  redactSecretsInText,
  containsSecret,
  redactSecrets,
  GENERIC_SECRET_RULES,
  TOKEN_AND_JWT_RULES,
  SHORT_PREFIX_TOKEN_RULES,
  SECRET_REDACTION_PATTERNS,
};

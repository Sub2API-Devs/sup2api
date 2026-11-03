/**
 * services/teamMemorySync/secretScanner.ts
 *
 * 密钥扫描与脱敏引擎（规则表、PEM 私钥、key=value 赋值、HTTP 头值判别）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/teamMemorySync/secretScanner.ts
 * pieces: chunk-151tygw9.js (1), chunk-cgr0tezp.js (38), chunk-jy3v56kg.js (1), chunk-nmregrje.js (1), chunk-s61vbvea.js (1)
 * attribution: fingerprint 6, affinity 1, placement 32, layout 3
 */
import {
  allowSeparatorsInPattern,
  INVISIBLE_CHAR_RANGES,
  INVISIBLE_CHARS_RE_SOURCE,
} from "../../utils/sanitization.js";
import {
  collectUrlRedactions,
  findSshUrlUserinfoSpans,
  sliceSpan,
} from "../../utils/redaction/urlParsing.js";
import { capitalize, truncateToLength } from "../../utils/stringUtils.js";
import { ruleApplies, redactTokensPrefix } from "../../utils/redaction/urlRedaction.js";
import { createOffsetMappedText } from "../../utils/fsOperations.js";
import {
  REPLACEMENT_CHAR,
  ANTHROPIC_KEY_LABEL,
  ANTHROPIC_KEY_IN_PATH_REGEX,
} from "../../skills/bundled/pluginAuthoring/secretScanTool.js";
import { uniq } from "../../utils/collections.js";
import { getSecretScanVariants } from "../memoryStore/memoryKeys.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { decideGzip, bodyCharCount } from "../api/gzipRequestBody.js";
import { GH_PR_ACTIONS, GLAB_MR_ACTIONS, getPrAction } from "../../tools/shared/gitOperationTracking.js";

//@ chunk-cgr0tezp.js:43122-43347 affinity
function redactMatches(e, n, redactMatchKeepPrefix) {
  let i = [];
  for (let s of e.text.matchAll(n)) {
    let { keep, insert, keepEnd = 0 } = redactMatchKeepPrefix(s);
    let index = s.index ?? 0;
    let l = s[0].length;
    let min = Math.min(Math.max(keep | 0, 0), l);
    let min_2 = Math.min(Math.max(keepEnd | 0, 0), l - min);
    i.push([index + min, index + l - min_2, insert]);
  }
  return applyTextEdits(e, i);
}
//@ chunk-cgr0tezp.js:43347-43695 placement = initCharAscii (0.716)
function applyTextEdits(e, n) {
  if (n.length === 0) return e;
  let { text, origin } = e;
  let s = text.length;
  for (let [l, d, g] of n) s += g.length - (d - l);
  let table = new Int32Array(s);
  let a = [];
  let u = 0;
  let c = 0;
  for (let [l, d, g] of n) {
    a.push(text.slice(u, l));
    table.set(origin.subarray(u, l), c);
    c += l - u;
    a.push(g);
    table.fill(-1, c, c + g.length);
    c += g.length;
    u = d;
  }
  a.push(text.slice(u));
  table.set(origin.subarray(u), c);
  return {
    text: a.join(""),
    origin: table,
  };
}
//@ chunk-cgr0tezp.js:51715-60332 fingerprint = SECRET_RULES (0.516)
/**
 * 密钥扫描的规则表与全部正则片段：键名模式、值形态、JWT、各云厂商令牌规则，以及置信度与预筛标记。
 */
var SECRET_KEY_NAME_RE = new RegExp(
  allowSeparatorsInPattern(
    String.raw`api[_-]?key|secret|token|password|passwd|credential|bearer|authorization|auth[_-]?header|memory[_-]?request[_-]?mac|cookie|session[_-]?(?:id|key)|connection[_-]?string|(?:private|ssh|encryption|signing|access|deploy|master|license)[_-]?key|client[_-]?secret`,
  ),
  "i",
);
var WHITESPACE_CHAR_CLASS = `[\\s\\u0085${INVISIBLE_CHAR_RANGES}]`;
var AUTH_SCHEME_PREFIX = `(?:${allowSeparatorsInPattern("Bearer|Basic")})[${INVISIBLE_CHAR_RANGES}]*[\\s\\u0085]+`;
var UNQUOTED_TOKEN_CHARS = "[^\\s\\u0085,;&}\\])]+";
var VALUE_END_LOOKAHEAD = "(?![\\w\\[({$/+=~!@%^?\\\\-])";
var LINE_BREAK_CHARS = "\\n\\r\\x0b\\x0c\\u0085\\u2028\\u2029";
var WHITESPACE_CLASS = "[\\s\\u0085]";
var regExp_10 = new RegExp(WHITESPACE_CHAR_CLASS);
var regExp_11 = new RegExp(`(?:[=:]|["']|\\b(?:${allowSeparatorsInPattern("bearer|basic")}))$`, "i");
var ESCAPED_QUOTE_VALUE = `\\\\+(?:"[^"${LINE_BREAK_CHARS}]*(?<!\\\\)(?=\\\\+")|'[^'${LINE_BREAK_CHARS}]*(?<!\\\\)(?=\\\\+'))`;
var SIMPLE_VALUE_CHARS = `[^\\s\\u0085,;&})"'\\\\]+`;
var SECRET_VALUE_PATTERN = `"[^"${LINE_BREAK_CHARS}]*"|'[^'${LINE_BREAK_CHARS}]*'|"[^"]*"${VALUE_END_LOOKAHEAD}|'[^']*'${VALUE_END_LOOKAHEAD}|[^\\s-]{0,4}\\[REDACTED\\]['"\`]?|${AUTH_SCHEME_PREFIX}(?:\\[REDACTED\\]|${UNQUOTED_TOKEN_CHARS})|${UNQUOTED_TOKEN_CHARS}`;
var BEARER_VALUE_RULE = {
  word: "\\b(?:Bearer|Basic)",
  tail: "",
  separator: `${WHITESPACE_CLASS}+`,
  value: "[A-Za-z0-9+/=._~-]{20,}",
};
var SENSITIVE_KEY_RULE = {
  word: `(?:${SECRET_KEY_NAME_RE.source})`,
  tail: "[\\w.-]",
  separator: `["']?${WHITESPACE_CLASS}*[=:]${WHITESPACE_CLASS}*`,
  value: SECRET_VALUE_PATTERN,
};
var CLOUD_ENV_VAR_RULE = {
  word: "\\b(?:AWS|GOOGLE|GCP|GCLOUD|AZURE)_\\w",
  tail: "\\w",
  separator: `${WHITESPACE_CLASS}*[=:]${WHITESPACE_CLASS}*`,
  value: SECRET_VALUE_PATTERN,
};
var ASSIGNMENT_RULES = [SENSITIVE_KEY_RULE, CLOUD_ENV_VAR_RULE, BEARER_VALUE_RULE];
var TOKEN_CHAR_CLASS = "[\\w=-]";
var GITLAB_TOKEN_BODY = `${TOKEN_CHAR_CLASS}{20,}(?:\\.[0-9a-z]{9})?`;
var KEY_TAIL_CHARS = "[\\w.-]{0,256}(?![\\w.-])";
var NO_WHITESPACE_AFTER = `${WHITESPACE_CLASS}*(?!${WHITESPACE_CLASS})`;
var SENSITIVE_KEY_NAME = `(?:${SECRET_KEY_NAME_RE.source})${KEY_TAIL_CHARS}`;
var CLOUD_KEY_NAME = `\\b(?:${allowSeparatorsInPattern("AWS|GOOGLE|GCP|GCLOUD|AZURE")})${INVISIBLE_CHARS_RE_SOURCE}_\\w+`;
var SENSITIVE_ASSIGN_PATTERN = `${SENSITIVE_KEY_NAME}(?:${INVISIBLE_CHARS_RE_SOURCE}["'])?${WHITESPACE_CHAR_CLASS}*[=:]${NO_WHITESPACE_AFTER}(${SECRET_VALUE_PATTERN})`;
var CLOUD_ENV_ASSIGN_PATTERN = `${CLOUD_KEY_NAME}${WHITESPACE_CHAR_CLASS}*[=:]${WHITESPACE_CLASS}*(${SECRET_VALUE_PATTERN})`;
var ESCAPED_QUOTE_PREFILTER = /\\["']/;
var ESCAPED_ASSIGN_PATTERN = `${SENSITIVE_KEY_NAME}${INVISIBLE_CHARS_RE_SOURCE}\\\\+["']${WHITESPACE_CHAR_CLASS}*[=:]${NO_WHITESPACE_AFTER}(${ESCAPED_QUOTE_VALUE}|${AUTH_SCHEME_PREFIX}${SIMPLE_VALUE_CHARS}|${SIMPLE_VALUE_CHARS}|\\\\+["'][^\\s\\u0085,;&})"'\\\\]*)`;
var LOOSE_SENSITIVE_KEY = `[^\\s\\u0085,;&}\\])"']{0,64}?(?:${SENSITIVE_KEY_NAME}|${CLOUD_KEY_NAME})`;
var NEXT_KEY_AFTER_MASKED = `(?:${AUTH_SCHEME_PREFIX})?(?:[{[(]{0,8}(?:"${LOOSE_SENSITIVE_KEY}"|'${LOOSE_SENSITIVE_KEY}')|${LOOSE_SENSITIVE_KEY})${WHITESPACE_CHAR_CLASS}*[=:]`;
var NEXT_KEY_AFTER_MASKED_ESCAPED = `(?:${AUTH_SCHEME_PREFIX})?(?:[{[(]{0,8}(?:"${LOOSE_SENSITIVE_KEY}"|'${LOOSE_SENSITIVE_KEY}'|\\\\+"${LOOSE_SENSITIVE_KEY}\\\\+"|\\\\+'${LOOSE_SENSITIVE_KEY}\\\\+')|${LOOSE_SENSITIVE_KEY})${WHITESPACE_CHAR_CLASS}*[=:]`;
var MASKED_VALUE_TAIL = "\\][^\\s\"'>}|,;&`)\\]]*";
var TOKEN_WORD_CHAR = "[A-Za-z0-9_-]";
var TOKEN_RUN = `${TOKEN_WORD_CHAR}{10}${TOKEN_WORD_CHAR}*`;
var JWT_SEGMENT_PAIR = `\\.${TOKEN_RUN}\\.${TOKEN_RUN}`;
var JWT_PATTERN = `(?<!${TOKEN_WORD_CHAR})(?=${TOKEN_WORD_CHAR}+${JWT_SEGMENT_PAIR})(?:${TOKEN_WORD_CHAR}*?-)??(eyJ${TOKEN_RUN}${JWT_SEGMENT_PAIR})`;
var SECRET_RULES = [
  {
    id: "url-userinfo",
    source: `:\\/\\/((["'])[^/@\\s]*\\2(?=@)|(?:[^/@\\s"'|,;&\`]+(?=@))|[^/@\\s"'|,;&\`]*["'|,;&\`][^/@\\s]*@)@?`,
    confidence: "low",
  },
  {
    id: "gcp-service-account",
    source: "\\b([a-z0-9-]{1,64}@[a-z0-9-]+\\.iam\\.gserviceaccount\\.com)\\b",
    flags: "i",
    confidence: "low",
  },
  {
    id: "loose-anthropic-key",
    source: "\\b(sk-ant-?[\\w-]{10,})",
    confidence: "low",
  },
  {
    id: "http-auth-scheme",
    source: `\\b${AUTH_SCHEME_PREFIX}([A-Za-z0-9+/=._~-]{20,})`,
    flags: "i",
    confidence: "low",
  },
  {
    id: "loose-jwt",
    prefilter: /eyJ/,
    source: JWT_PATTERN,
    confidence: "low",
  },
  {
    id: "sensitive-assign",
    source: SENSITIVE_ASSIGN_PATTERN,
    flags: "i",
    confidence: "low",
  },
  {
    id: "cloud-env-var",
    source: CLOUD_ENV_ASSIGN_PATTERN,
    flags: "i",
    confidence: "low",
  },
  {
    id: "url-userinfo-tail",
    source:
      ":\\/\\/(\\[REDACTED\\](?!@|%40[^\\s\"'>}|,;&`)\\]@/]*(?:[\\s\"'>}|,;&`)\\]/]|$))[^\\s\"'>}|,;&`)\\]]*?(?=[\\s\"'>}|,;&`)\\]]|:\\/\\/|$))",
    confidence: "low",
  },
  {
    id: "url-userinfo-later-at",
    source: ":\\/\\/(\\[REDACTED\\]@(?:[^\\s:/?#\"'>}|,;&`)\\]]|:(?!\\/\\/)){0,256})(?=@|%40)",
    confidence: "low",
  },
  {
    id: "url-userinfo-encoded",
    source:
      ":\\/\\/((?:\\[REDACTED\\]@)?(?:(?:[^/?#@\\s\"',;&<>|)\\]{}`[]*[\"'`<>{}[\\]][^/?#@\\s,;&|{}\"'`<>[\\]()]*(?=%40))|[^/?#@\\s\"',;&<>|)\\]}`[]+(?=%40)|(?=[^/?#@\\s\"',;&<>|)\\]}`[]*?(?:%|:[^/?#@\\s\"',;&<>|)\\]}`[]))[^/?#@\\s\"',;&<>|)\\]}`[]+(?=\\[REDACTED\\])))",
    confidence: "low",
  },
  {
    id: "masked-value-rest",
    source: `\\[REDACTED\\](${MASKED_VALUE_TAIL})`,
    confidence: "low",
  },
  {
    id: "anthropic-signed-key-rest",
    redactOnly: true,
    prefilter: /\[REDACTED\]\.eyJ/,
    source: "\\[REDACTED\\]\\.(eyJ[\\w-]+\\.[\\w-]+)",
    confidence: "low",
  },
  {
    id: "sensitive-assign-escaped",
    redactOnly: true,
    prefilter: ESCAPED_QUOTE_PREFILTER,
    source: ESCAPED_ASSIGN_PATTERN,
    flags: "i",
    confidence: "low",
  },
  {
    id: "aws-access-token",
    source: "\\b((?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16})\\b",
    confidence: "high",
  },
  {
    id: "gcp-api-key",
    source: "\\b(AIza[\\w-]{35})(?![\\w-])",
    confidence: "high",
  },
  {
    id: "google-oauth-client-secret",
    source: "\\bGOCSPX-[\\w-]{28}(?![\\w-])",
    confidence: "high",
  },
  {
    id: "azure-ad-client-secret",
    source: `(?:^|[\\\\'"\\x60\\s>=:(,)])([a-zA-Z0-9_~.]{3}\\dQ~[a-zA-Z0-9_~.-]{31,34})(?:$|[\\\\'"\\x60\\s<),])`,
    confidence: "high",
  },
  {
    id: "digitalocean-pat",
    source: `\\b(dop_v1_[a-f0-9]{64})(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "digitalocean-access-token",
    source: `\\b(doo_v1_[a-f0-9]{64})(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "anthropic-api-key",
    source: `\\b(sk[-]ant[-]api03-[a-zA-Z0-9_\\-]{93}AA)(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "anthropic-admin-api-key",
    source: `\\b(sk-ant-admin01-[a-zA-Z0-9_\\-]{93}AA)(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "anthropic-oauth-token",
    source: `\\b(sk-ant-(?:oat|ort)\\d{2}-[\\w-]{20,})(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    run: "[\\w-]",
    confidence: "high",
  },
  {
    id: "openai-api-key",
    source: "sk-[A-Za-z0-9_-]{8,200}T3BlbkFJ[A-Za-z0-9_-]{8,200}",
    confidence: "high",
  },
  {
    id: "openai-legacy-api-key",
    source: "\\bsk-[a-zA-Z0-9]{48}(?![a-zA-Z0-9])",
    confidence: "high",
  },
  {
    id: "huggingface-access-token",
    source: `\\b(hf_[a-zA-Z]{34})(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "supabase-secret-key",
    source: "\\bsb_secret_[A-Za-z0-9_-]{20,}",
    confidence: "high",
  },
  {
    id: "supabase-access-token",
    source: "\\bsbp_[a-z0-9]{40,}",
    confidence: "high",
  },
  {
    id: "github-pat",
    source: "ghp_[0-9a-zA-Z]{36}",
    confidence: "high",
  },
  {
    id: "github-fine-grained-pat",
    source: "github_pat_\\w{82}",
    confidence: "high",
  },
  {
    id: "github-app-token",
    source: "(?:ghu|ghs)_[0-9a-zA-Z]{36}",
    confidence: "high",
  },
  {
    id: "github-oauth",
    source: "gho_[0-9a-zA-Z]{36}",
    confidence: "high",
  },
  {
    id: "github-refresh-token",
    source: "ghr_[0-9a-zA-Z]{36}",
    confidence: "high",
  },
  {
    id: "gitlab-pat",
    source: `glpat-${GITLAB_TOKEN_BODY}`,
    displayRun: TOKEN_CHAR_CLASS,
    confidence: "high",
  },
  {
    id: "gitlab-deploy-token",
    source: `gldt-${GITLAB_TOKEN_BODY}`,
    displayRun: TOKEN_CHAR_CLASS,
    confidence: "high",
  },
  {
    id: "gitlab-runner-authentication-token",
    source: `glrt-${GITLAB_TOKEN_BODY}`,
    displayRun: TOKEN_CHAR_CLASS,
    confidence: "high",
  },
  {
    id: "gitlab-oauth-app-secret",
    source: `gloas-${GITLAB_TOKEN_BODY}`,
    displayRun: TOKEN_CHAR_CLASS,
    confidence: "high",
  },
  {
    id: "gitlab-pipeline-trigger-token",
    source: `glptt-${GITLAB_TOKEN_BODY}`,
    displayRun: TOKEN_CHAR_CLASS,
    confidence: "high",
  },
  {
    id: "gitlab-kubernetes-agent-token",
    source: `glagent-${GITLAB_TOKEN_BODY}`,
    displayRun: TOKEN_CHAR_CLASS,
    confidence: "high",
  },
  {
    id: "gitlab-incoming-mail-token",
    source: `glimt-${GITLAB_TOKEN_BODY}`,
    displayRun: TOKEN_CHAR_CLASS,
    confidence: "high",
  },
  {
    id: "gitlab-scim-oauth-token",
    source: `glsoat-${GITLAB_TOKEN_BODY}`,
    displayRun: TOKEN_CHAR_CLASS,
    confidence: "high",
  },
  {
    id: "gitlab-ci-build-token",
    source: `glcbt-${GITLAB_TOKEN_BODY}`,
    displayRun: TOKEN_CHAR_CLASS,
    confidence: "high",
  },
  {
    id: "gitlab-feed-token",
    source: `glft-${GITLAB_TOKEN_BODY}`,
    displayRun: TOKEN_CHAR_CLASS,
    confidence: "high",
  },
  {
    id: "gitlab-feature-flag-client-token",
    source: `glffct-${GITLAB_TOKEN_BODY}`,
    displayRun: TOKEN_CHAR_CLASS,
    confidence: "high",
  },
  {
    id: "slack-bot-token",
    source: "xoxb-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*",
    confidence: "high",
  },
  {
    id: "slack-user-token",
    source: "xox[a-z](?:-[0-9]{10,13}){3}-[a-zA-Z0-9-]{28,34}",
    confidence: "high",
  },
  {
    id: "slack-rotation-token",
    source: "xoxe(?:\\.xox[a-z])?-[0-9]-[A-Za-z0-9-]{28,}",
    confidence: "high",
  },
  {
    id: "slack-app-token",
    source: "xapp-\\d-[A-Z0-9]+-\\d+-[a-z0-9]+",
    flags: "i",
    confidence: "high",
  },
  {
    id: "slack-workflow-token",
    source: "\\bxwfp-[a-zA-Z0-9-]{20,}",
    confidence: "high",
  },
  {
    id: "slack-webhook-url",
    source: "(?:https?://)?hooks\\.slack\\.com/(?:services|workflows|triggers)/[A-Za-z0-9+/_-]{40,}",
    flags: "i",
    confidence: "high",
  },
  {
    id: "twilio-api-key",
    source: "SK[0-9a-fA-F]{32}",
    confidence: "high",
  },
  {
    id: "sendgrid-api-token",
    source: `\\b(SG\\.[a-zA-Z0-9=_\\-.]{66})(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "npm-access-token",
    source: `\\b(npm_[a-zA-Z0-9]{36})(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "pypi-upload-token",
    source: "pypi-AgEIcHlwaS5vcmc[\\w-]{50,1000}",
    confidence: "high",
  },
  {
    id: "databricks-api-token",
    source: `\\b(dapi[a-f0-9]{32}(?:-\\d)?)(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "hashicorp-tf-api-token",
    source: "[a-zA-Z0-9]{14}\\.atlasv1\\.[a-zA-Z0-9\\-_=]{60,70}",
    confidence: "high",
  },
  {
    id: "pulumi-api-token",
    source: `\\b(pul-[a-f0-9]{40})(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "postman-api-token",
    source: `\\b(PMAK-[a-fA-F0-9]{24}-[a-fA-F0-9]{34})(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "grafana-api-key",
    source: `\\b(eyJrIjoi[A-Za-z0-9+/]{70,400}={0,3})(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "grafana-cloud-api-token",
    source: `\\b(glc_[A-Za-z0-9+/]{32,400}={0,3})(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "grafana-service-account-token",
    source: `\\b(glsa_[A-Za-z0-9]{32}_[A-Fa-f0-9]{8})(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "sentry-user-token",
    source: `\\b(sntryu_[a-f0-9]{64})(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "sentry-org-token",
    source:
      "\\bsntrys_eyJpYXQiO[a-zA-Z0-9+/]{10,200}(?:LCJyZWdpb25fdXJs|InJlZ2lvbl91cmwi|cmVnaW9uX3VybCI6)[a-zA-Z0-9+/]{10,200}={0,2}_[a-zA-Z0-9+/]{43}",
    confidence: "high",
  },
  {
    id: "stripe-access-token",
    source: `\\b((?:sk|rk)_(?:test|live|prod)_[a-zA-Z0-9]{10,99})(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
    confidence: "high",
  },
  {
    id: "shopify-access-token",
    source: "shpat_[a-fA-F0-9]{32}",
    confidence: "high",
  },
  {
    id: "shopify-shared-secret",
    source: "shpss_[a-fA-F0-9]{32}",
    confidence: "high",
  },
];
var MIN_PRIVATE_KEY_BODY_CHARS = 64;
//@ chunk-cgr0tezp.js:60332-60640 layout
/**
 * 查找 PEM 私钥块（BEGIN … PRIVATE KEY 到 END）。
 */
function findPrivateKeyBlock(e, lastIndex) {
  let r = /-----BEGIN[ A-Z0-9_-]{0,100}?PRIVATE KEY(?: BLOCK)?-----/gi;
  let i = /-----END[ A-Z0-9_-]{0,100}?PRIVATE KEY(?: BLOCK)?-----/gi;
  r.lastIndex = lastIndex;
  let match = r.exec(e);
  if (!match) return null;
  i.lastIndex = match.index + match[0].length + MIN_PRIVATE_KEY_BODY_CHARS;
  let match_2 = i.exec(e);
  if (!match_2) return null;
  return {
    start: match.index,
    end: match_2.index + match_2[0].length,
  };
}
//@ chunk-cgr0tezp.js:60640-60677 layout
function containsPrivateKey(e) {
  return findPrivateKeyBlock(e, 0) !== null;
}
//@ chunk-cgr0tezp.js:60677-60821 layout = redactSecrets (0.815)
function redactSecrets_2(content) {
  let pemBlocks = findPemBlocks(content);
  if (pemBlocks.length === 0) return content;
  let r = "";
  let i = 0;
  for (let re of pemBlocks) {
    r += content.slice(i, re.start) + "[REDACTED]";
    i = re.end;
  }
  return r + content.slice(i);
}
//@ chunk-cgr0tezp.js:60821-61171 placement
/**
 * 文本中是否有 PEM 私钥块。
 */
function findPemBlocks(e) {
  let lastIndex = e.indexOf("-----");
  while (lastIndex !== -1) {
    while (e.charCodeAt(lastIndex + 5) === 45) lastIndex++;
    if (
      (e.charCodeAt(lastIndex + 5) | 32) === 98 &&
      (e.charCodeAt(lastIndex + 6) | 32) === 101 &&
      (e.charCodeAt(lastIndex + 7) | 32) === 103 &&
      (e.charCodeAt(lastIndex + 8) | 32) === 105 &&
      (e.charCodeAt(lastIndex + 9) | 32) === 110
    )
      break;
    lastIndex = e.indexOf("-----", lastIndex + 5);
  }
  let r = [];
  if (lastIndex === -1) return r;
  for (
    let privateKeyBlock = findPrivateKeyBlock(e, lastIndex);
    privateKeyBlock;
    privateKeyBlock = findPrivateKeyBlock(e, privateKeyBlock.end)
  )
    r.push(privateKeyBlock);
  return r;
}
//@ chunk-cgr0tezp.js:61171-61265 placement
/**
 * 令牌边界的两个断言（前后不允许标识符字符）。
 */
var SECRET_VALUE_TERMINATOR = `(?:[\\x60'"\\s;]|\\\\[nr]|$)`;
var TOKEN_BOUNDARY_AFTER = "(?=[^a-zA-Z0-9_\\-+=]|$)";
var TOKEN_BOUNDARY_BEFORE = "(?<![a-zA-Z0-9_\\-])";
//@ chunk-cgr0tezp.js:61265-61632 placement
/**
 * 编译显示用的密钥匹配规则。
 */
function compileDisplayRules() {
  return SECRET_RULES.map(({ id, confidence, source, flags = "", displayRun }) => {
    let o = {
      id,
      confidence,
    };
    let a = flags.replace("g", "") + "g";
    if (confidence !== "high")
      return {
        ...o,
        re: new RegExp(source, a),
      };
    let u = stripTrailingDelimiter(source);
    if (displayRun === undefined)
      return {
        ...o,
        re: new RegExp(TOKEN_BOUNDARY_BEFORE + u + TOKEN_BOUNDARY_AFTER, a),
      };
    return {
      ...o,
      prefilter: new RegExp(u, flags.replace("g", "")),
      re: new RegExp(
        `(?<!${displayRun})(?=${displayRun}+${TOKEN_BOUNDARY_AFTER})${displayRun}*?${TOKEN_BOUNDARY_BEFORE}(${u})${TOKEN_BOUNDARY_AFTER}`,
        a,
      ),
    };
  });
}
//@ chunk-cgr0tezp.js:61632-62061 placement
/**
 * 编译密钥扫描规则（预过滤、置信度）。
 */
function compileSecretRules(e) {
  return SECRET_RULES.map((n) => {
    let replaced = (n.flags ?? "").replace("g", "");
    let i = {
      id: n.id,
      confidence: n.confidence,
      ...(n.redactOnly === true && {
        redactOnly: n.redactOnly,
      }),
      ...(n.prefilter !== undefined && {
        prefilter: n.prefilter,
      }),
    };
    if (n.run === undefined)
      return {
        ...i,
        re: new RegExp(n.source, e ? replaced + "g" : (n.flags ?? "")),
      };
    return {
      ...i,
      prefilter: new RegExp(stripTrailingDelimiter(n.source), replaced),
      re: new RegExp(
        `(?:(?<!${n.run})|(?<=\\\\[nr]))(?=${n.run}+${SECRET_VALUE_TERMINATOR})${n.run}*?${n.source}`,
        e ? replaced + "g" : replaced,
      ),
    };
  });
}
//@ chunk-cgr0tezp.js:62061-62122 placement
function stripTrailingDelimiter(source) {
  return source.endsWith(SECRET_VALUE_TERMINATOR) ? source.slice(0, -SECRET_VALUE_TERMINATOR.length) : source;
}
//@ chunk-cgr0tezp.js:62122-62333 placement
function replaceSecretValue(e, n) {
  if (typeof n !== "string") return "[REDACTED]";
  let r = n.length >= 2 && (n[0] === '"' || n[0] === "'") && n.at(-1) === n[0] ? n[0] : "";
  let index = e.lastIndexOf(n);
  return `${e.slice(0, index)}${r}[REDACTED]${r}${e.slice(index + n.length)}`;
}
//@ chunk-cgr0tezp.js:62333-62574 placement
function redactMatchKeepPrefix(e) {
  let n = e[1];
  if (typeof n !== "string")
    return {
      keep: 0,
      insert: "[REDACTED]",
    };
  let r = n.length >= 2 && (n[0] === '"' || n[0] === "'") && n.at(-1) === n[0] ? 1 : 0;
  let index = e[0].lastIndexOf(n);
  return {
    keep: index + r,
    insert: "[REDACTED]",
    keepEnd: e[0].length - index - n.length + r,
  };
}
//@ chunk-cgr0tezp.js:62574-62765 placement
function findSecretAssignmentRanges(e) {
  let mapped = collectUrlRedactions(e, ASSIGNMENT_RULES).map(({ start, end }) => {
    let a = /^(["'])[^]*\1$/.test(e.slice(start, end)) ? 1 : 0;
    return [start + a, end - a];
  });
  let sshUrlUserinfoSpans = findSshUrlUserinfoSpans(e);
  let keyValueSecretRanges = findKeyValueSecretRanges(e);
  return sshUrlUserinfoSpans.length === 0 && keyValueSecretRanges.length === 0
    ? mapped
    : mergeRanges([...mapped, ...sshUrlUserinfoSpans, ...keyValueSecretRanges]);
}
//@ chunk-cgr0tezp.js:62765-62801 placement
/**
 * 赋值形式（key=value）扫描的两套编译结果缓存（普通与转义）。
 */
var assignmentScanCache;
var regExp_12 = new RegExp(MASKED_VALUE_TAIL, "y");
var MAX_NEXT_KEY_CHARS = 512;
//@ chunk-cgr0tezp.js:62801-63182 placement
/**
 * 赋值形式（key=value）密钥扫描器。
 */
function findKeyValueSecretRanges(e) {
  assignmentScanCache ??= {
    plain: {
      assign: new RegExp(`${SENSITIVE_ASSIGN_PATTERN}|${CLOUD_ENV_ASSIGN_PATTERN}`, "gi"),
      nextKey: new RegExp(NEXT_KEY_AFTER_MASKED, "iy"),
      valueWithWhitespace: new RegExp(`["']|${AUTH_SCHEME_PREFIX}`, "iy"),
      skipsStrays: false,
    },
    escaped: {
      assign: new RegExp(
        `${SENSITIVE_ASSIGN_PATTERN}|${CLOUD_ENV_ASSIGN_PATTERN}|${ESCAPED_ASSIGN_PATTERN}`,
        "gi",
      ),
      nextKey: new RegExp(NEXT_KEY_AFTER_MASKED_ESCAPED, "iy"),
      valueWithWhitespace: new RegExp(`\\\\*["']|${AUTH_SCHEME_PREFIX}`, "iy"),
      skipsStrays: true,
    },
  };
  let n = scanAssignments(e, assignmentScanCache.plain);
  return ESCAPED_QUOTE_PREFILTER.test(e) ? [...n, ...scanAssignments(e, assignmentScanCache.escaped)] : n;
}
//@ chunk-cgr0tezp.js:63182-63767 placement
/**
 * 扫描 key=value 中的敏感值区间。
 */
function scanAssignments(e, { assign, nextKey, valueWithWhitespace, skipsStrays }) {
  let o = [];
  let a;
  let u = 0;
  let c = regExp_12;
  assign.lastIndex = 0;
  for (let match = assign.exec(e); match !== null; match = assign.exec(e)) {
    let d = match[1] ?? match[2] ?? match[3];
    let g = match.index + match[0].length;
    let y = g - d.length;
    nextKey.lastIndex = y;
    let lastIndex = d.length <= MAX_NEXT_KEY_CHARS && nextKey.test(e) ? nextKey.lastIndex : undefined;
    if (lastIndex !== undefined && lastIndex < g) {
      valueWithWhitespace.lastIndex = lastIndex;
      if (!valueWithWhitespace.test(e)) lastIndex = undefined;
    }
    if (skipsStrays && a !== undefined && match.index >= a && match.index < u && lastIndex === undefined) {
      a = undefined;
      assign.lastIndex = u;
      continue;
    }
    if (a !== undefined && match.index < a) {
      let matches = /^(["'])[^]*\1$/.test(d);
      let f = matches && u <= y ? 1 : 0;
      c.lastIndex = g;
      o.push([y + f, !matches && c.test(e) ? c.lastIndex : g - f]);
    }
    u = g;
    a = lastIndex;
    if (a !== undefined) assign.lastIndex = y;
  }
  return o;
}
//@ chunk-cgr0tezp.js:63767-63945 placement
function mergeRanges(sshUrlUserinfoSpans) {
  let sorted = sshUrlUserinfoSpans.filter(([i, s]) => s > i).sort((i, s) => i[0] - s[0]);
  let r = [];
  for (let [i, s] of sorted) {
    let last = r.at(-1);
    if (last !== undefined && i <= last[1]) last[1] = Math.max(last[1], s);
    else r.push([i, s]);
  }
  return r;
}
//@ chunk-cgr0tezp.js:63945-64293 placement = redactSecrets (0.815)
/**
 * 按原文位置映射对跟踪文本做遮盖。
 */
function redactTrackedRanges(e, secretAssignmentRanges) {
  let { text, origin } = e;
  let s = [];
  let o = 0;
  for (let a = 0; a < text.length;) {
    let u = origin[a];
    while (o < secretAssignmentRanges.length && secretAssignmentRanges[o][1] <= u) o++;
    let c = secretAssignmentRanges[o];
    if (u < 0 || c === undefined || u < c[0]) {
      a++;
      continue;
    }
    let l = a;
    while (l > 0 && origin[l - 1] < 0) l--;
    while (a < text.length && (origin[a] < 0 || (origin[a] >= c[0] && origin[a] < c[1]))) a++;
    let last = s.at(-1);
    if (last !== undefined && last[1] >= l) last[1] = a;
    else s.push([l, a, "[REDACTED]"]);
  }
  return applyTextEdits(e, s);
}
//@ chunk-cgr0tezp.js:64293-64311 placement
/**
 * 扫描器的两个上限：可缓存的输入长度与结果缓存条目数。
 */
var MAX_CACHED_SCAN_INPUT_CHARS = 512;
var MAX_SCAN_RESULT_CACHE_ENTRIES = 512;
//@ chunk-cgr0tezp.js:64311-66178 placement
/**
 * 密钥扫描器：按规则表编译测试/脱敏/展示三套正则（带结果缓存），提供 scan、redactContext、redactTokens、redactForDisplay 等。
 */
class SecretScanner {
  testRules = null;
  redactRules = null;
  displayRules = null;
  resultCache = new Map();
  scan(e) {
    this.testRules ??= compileSecretRules(false);
    let n = [];
    for (let testRule of this.testRules)
      if (testRule.confidence === "high" && testRule.prefilter?.test(e) !== false && testRule.re.test(e))
        n.push({
          ruleId: testRule.id,
          label: testRule.id
            .split("-")
            .map((i) => ruleIdToLabel[i] ?? capitalize(i))
            .join(" "),
        });
    if (containsPrivateKey(e))
      n.push({
        ruleId: "private-key",
        label: "Private Key",
      });
    return n;
  }
  redactContext(content, n = false) {
    this.redactRules ??= compileSecretRules(true);
    let r = redactSecrets_2(content);
    for (let redactRule of this.redactRules)
      if (redactRule.confidence === "low" && ruleApplies(redactRule, n, r))
        r = r.replace(redactRule.re, replaceSecretValue);
    return r;
  }
  redactTokens(e) {
    this.redactRules ??= compileSecretRules(true);
    let n = e;
    for (let redactRule of this.redactRules)
      if (redactRule.confidence === "high" && redactRule.prefilter?.test(n) !== false)
        n = n.replace(redactRule.re, replaceSecretValue);
    return n;
  }
  trackedByRules(e, n = false) {
    return this.trackedTokens(this.trackedContext(e, n));
  }
  trackedContext(e, n = false) {
    let r = applyTextEdits(
      createOffsetMappedText(e),
      findPemBlocks(e).map(({ start, end }) => [start, end, "[REDACTED]"]),
    );
    return this.trackedRules(r, "low", n);
  }
  redactOnlyRules(e) {
    this.redactRules ??= compileSecretRules(true);
    let n = e;
    for (let redactRule of this.redactRules)
      if (redactRule.redactOnly === true && ruleApplies(redactRule, true, n))
        n = n.replace(redactRule.re, replaceSecretValue);
    return n;
  }
  trackedTokens(e) {
    return this.trackedRules(e, "high");
  }
  trackedRules(e, n, r = false) {
    this.redactRules ??= compileSecretRules(true);
    let i = e;
    for (let redactRule of this.redactRules)
      if (redactRule.confidence === n && ruleApplies(redactRule, r, i.text)) {
        redactRule.re.lastIndex = 0;
        i = redactMatches(i, redactRule.re, redactMatchKeepPrefix);
      }
    return i;
  }
  redactWithUrlRanges(e) {
    let secretAssignmentRanges = findSecretAssignmentRanges(e);
    return secretAssignmentRanges.length === 0
      ? this.redactTokens(this.redactContext(e, true))
      : redactTrackedRanges(this.trackedByRules(e, true), secretAssignmentRanges).text;
  }
  redactTracked(e) {
    return redactTrackedRanges(this.trackedByRules(e, true), findSecretAssignmentRanges(e));
  }
  redact(e) {
    let n = e.length <= MAX_CACHED_SCAN_INPUT_CHARS;
    if (n) {
      let i = this.resultCache.get(e);
      if (i !== undefined) return i;
    }
    let r = this.redactWithUrlRanges(e);
    if (n) {
      if (this.resultCache.size >= MAX_SCAN_RESULT_CACHE_ENTRIES)
        this.resultCache.delete(this.resultCache.keys().next().value);
      this.resultCache.set(e, r);
    }
    return r;
  }
  redactForDisplay(e) {
    this.displayRules ??= compileDisplayRules();
    let n = e;
    for (let displayRule of this.displayRules) {
      if (displayRule.confidence !== "high" || displayRule.prefilter?.test(n) === false) continue;
      n = n.replace(displayRule.re, redactUnlessShellLike);
    }
    return n;
  }
}
//@ chunk-cgr0tezp.js:66178-66191 placement
/**
 * 全局 SecretScanner 单例，所有扫描/脱敏函数都委托给它。
 */
var secretScanner = new SecretScanner();
//@ chunk-cgr0tezp.js:66191-66224 placement
/**
 * 扫描文本中的疑似密钥，返回命中规则列表。
 */
function scanForSecrets(e) {
  return secretScanner.scan(e);
}
//@ chunk-cgr0tezp.js:66224-66258 placement
/**
 * 遮盖文本中的密钥。
 */
function redactSecrets(e) {
  return secretScanner.redact(e);
}
//@ chunk-cgr0tezp.js:66258-66316 placement
/**
 * 先按上下文（key=value 等）再按令牌形状脱敏，替换为 [REDACTED]。
 */
function redactSecretsInText(e) {
  return secretScanner.redactTokens(secretScanner.redactContext(e));
}
//@ chunk-cgr0tezp.js:66316-66358 placement
function redactSecretContext(e) {
  return secretScanner.redactContext(e);
}
//@ chunk-cgr0tezp.js:66358-66399 placement
function redactSecretTokens(e) {
  return secretScanner.redactTokens(e);
}
//@ chunk-cgr0tezp.js:66399-66443 placement
var regExp_13 = new RegExp(JWT_PATTERN);
var regExp_14 = new RegExp(JWT_PATTERN, "g");
//@ chunk-cgr0tezp.js:66443-66457 placement
/**
 * 截断遮盖的窗口大小。
 */
var REDACT_WINDOW_CHARS = 16384;
//@ chunk-cgr0tezp.js:66457-66791 placement
/**
 * 遮盖后截断到指定长度。
 */
function redactAndTruncate(e, n) {
  let secretAssignmentRanges = findSecretAssignmentRanges(e);
  if (secretAssignmentRanges.length === 0) return redactTokensPrefix(secretScanner.redactContext(e, true), n);
  let i = secretScanner.trackedContext(e, true);
  for (let s = n + 2 * REDACT_WINDOW_CHARS; ; s *= 2) {
    if (i.text.length <= s)
      return redactTrackedRanges(secretScanner.trackedTokens(i), secretAssignmentRanges).text;
    let o = secretScanner.trackedTokens(sliceSpan(i, 0, s));
    let a = o.text.length - REDACT_WINDOW_CHARS;
    if (a >= n) {
      let u = truncateToLength(o.text, a).length;
      let c = redactTrackedRanges(sliceSpan(o, 0, u), secretAssignmentRanges);
      if (c.text.length >= n) return c.text;
    }
  }
}
//@ chunk-cgr0tezp.js:66791-66834 placement
/**
 * shell 元字符正则（含空白、反引号与斜杠等）。
 */
var SHELL_META_RE = /[$\x60|;&<>()\s]/;
var SHELL_META_CHARS = /[/.@:~*?\\]/;
//@ chunk-cgr0tezp.js:66834-66931 placement
function redactUnlessShellLike(e, n) {
  let r = typeof n === "string" ? n : e;
  if (SHELL_META_RE.test(r) || SHELL_META_CHARS.test(r)) return e;
  return replaceSecretValue(e, n);
}
//@ chunk-cgr0tezp.js:66931-66976 placement
/**
 * 展示用脱敏（保留可辨识前缀）。
 */
function redactSecretsForDisplay(e) {
  return secretScanner.redactForDisplay(e);
}
//@ chunk-cgr0tezp.js:66976-67406 placement
/**
 * 递归脱敏字符串、数组、对象（含对象键）。
 */
function redactSecretsDeep(e, redactSecretsForDisplay = redactSecrets) {
  if (typeof e === "string") return redactSecretsForDisplay(e);
  if (Array.isArray(e)) return e.map((r) => redactSecretsDeep(r, redactSecretsForDisplay));
  if (e !== null && typeof e === "object") {
    let r = Object.create(null);
    let entries = Object.entries(e);
    let s = redactSecretsForDisplay === redactSecrets ? redactObjectKeys(entries.map(([o]) => o)) : undefined;
    for (let [o, [a, u]] of entries.entries()) {
      let c = s ? s[o] : a;
      if (typeof u === "string") {
        if (redactSecretsForDisplay === redactSecrets) {
          r[c] = redactKeyedValue(a, u);
          continue;
        }
        let l = `${a}: `;
        let d = redactSecretsForDisplay(l + u);
        r[c] = d.startsWith(l) ? d.slice(l.length) : redactSecretsForDisplay(u);
      } else r[c] = redactSecretsDeep(u, redactSecretsForDisplay);
    }
    return r;
  }
  return e;
}
//@ chunk-cgr0tezp.js:67406-67875 placement
/**
 * 带键名上下文地遮盖值。
 */
function redactKeyedValue(e, n) {
  let r = `${e}: `;
  let i = r + n;
  let secretAssignmentRanges = findSecretAssignmentRanges(i);
  if (secretAssignmentRanges.length === 0) {
    let c = redactSecrets(i);
    if (c.startsWith(r)) return c.slice(r.length);
    let l = redactSecretsInText(i);
    return l.startsWith(r) ? secretScanner.redactOnlyRules(l.slice(r.length)) : redactSecrets(n);
  }
  let o = [];
  for (let [c, l] of secretAssignmentRanges) if (l > r.length) o.push([Math.max(c, r.length), l]);
  let a = secretScanner.trackedByRules(i, true);
  if (a.text.startsWith(r)) return redactTrackedRanges(a, o).text.slice(r.length);
  let u = secretScanner.trackedByRules(i);
  return u.text.startsWith(r)
    ? secretScanner.redactOnlyRules(redactTrackedRanges(u, o).text.slice(r.length))
    : redactSecrets(n);
}
//@ chunk-cgr0tezp.js:67875-68132 placement
function redactObjectKeys(e) {
  let mapped = e.map((s) => redactSecrets(s));
  if (mapped.every((s, o) => s === e[o])) return mapped;
  let r = new Set(mapped.filter((s, o) => s === e[o]));
  let i = new Map();
  return mapped.map((s, o) => {
    if (s === e[o]) return s;
    let a = s;
    let u = i.get(s) ?? 2;
    while (r.has(a)) {
      a = `${s} (${u})`;
      u++;
    }
    i.set(s, u);
    r.add(a);
    return a;
  });
}
//@ chunk-cgr0tezp.js:68132-68247 placement = redactSecrets (0.815)
function redactSecrets_3(content) {
  let n = Object.create(null);
  for (let [key, value] of Object.entries(content))
    n[key] = SECRET_KEY_NAME_RE.test(key) ? "[REDACTED]" : value;
  return n;
}
//@ chunk-cgr0tezp.js:76919-77194 fingerprint = ruleIdToLabel (0.957)
/**
 * 规则 id 片段到展示标签的映射（aws→AWS、jwt→JWT 等）。
 */
var ruleIdToLabel = {
  aws: "AWS",
  gcp: "GCP",
  api: "API",
  pat: "PAT",
  ad: "AD",
  tf: "TF",
  oauth: "OAuth",
  npm: "NPM",
  pypi: "PyPI",
  jwt: "JWT",
  ci: "CI",
  scim: "SCIM",
  github: "GitHub",
  gitlab: "GitLab",
  openai: "OpenAI",
  digitalocean: "DigitalOcean",
  huggingface: "HuggingFace",
  hashicorp: "HashiCorp",
  sendgrid: "SendGrid",
};
//@ chunk-151tygw9.js:7043-7062 fingerprint = redactSecrets (0.815)
var REDACTED_PLACEHOLDER = "[REDACTED]";
//@ chunk-jy3v56kg.js:27929-28144 fingerprint = scanForSecrets (0.425)
/**
 * 扫描文本中的密钥（规则 id 与标签）。
 */
function scanForSecrets_2(content) {
  let n = content.includes(REPLACEMENT_CHAR)
    ? uniq([
        ...getSecretScanVariants(content),
        ...getSecretScanVariants(content.replaceAll(REPLACEMENT_CHAR, "")),
      ])
    : getSecretScanVariants(content);
  let flattened = n.flatMap((r) =>
    scanForSecrets(r).map((a) => (a.ruleId.startsWith("anthropic-") ? ANTHROPIC_KEY_LABEL : a.label)),
  );
  if (n.some((r) => ANTHROPIC_KEY_IN_PATH_REGEX.test(r))) flattened.push(ANTHROPIC_KEY_LABEL);
  return uniq(flattened);
}
//@ chunk-nmregrje.js:1741-1805 fingerprint = ANT_KEY_PFX (0.628)
function ANT_KEY_PFX(url, n, storage, rollout = "api") {
  return isFirstPartyAnthropicHost(url) ? decideGzip(url, bodyCharCount(n), storage, rollout) : undefined;
}
//@ chunk-s61vbvea.js:569876-570050 fingerprint = getCompiledRules (0.704)
function getTextAfterLastRuleMatch(e) {
  let n = -1;
  for (let { re } of [...GH_PR_ACTIONS, ...GLAB_MR_ACTIONS]) {
    let regExp = new RegExp(re.source, "g");
    for (let match = regExp.exec(e); match; match = regExp.exec(e)) n = Math.max(n, match.index);
  }
  return n < 0 ? undefined : getPrAction(e.slice(n));
}
export {
  redactSecrets,
  REDACTED_PLACEHOLDER,
  redactSecretsDeep,
  scanForSecrets,
  redactSecretsInText,
  redactSecrets_3,
  redactAndTruncate,
  ANT_KEY_PFX,
  mergeRanges,
  REDACT_WINDOW_CHARS,
  redactSecretTokens,
  redactSecretsForDisplay,
  scanForSecrets_2,
  getTextAfterLastRuleMatch,
  redactSecrets_2,
  redactSecretContext,
  regExp_10,
  regExp_11,
  redactKeyedValue,
};

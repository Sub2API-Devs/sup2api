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
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { decideGzip, bodyCharCount } from "../api/gzipRequestBody.js";
import { GH_PR_ACTIONS, GLAB_MR_ACTIONS, getPrAction } from "../../tools/shared/gitOperationTracking.js";
import {
  REPLACEMENT_CHAR,
  ANTHROPIC_KEY_LABEL,
  ANTHROPIC_KEY_IN_PATH_REGEX,
} from "../../skills/bundled/pluginAuthoring/secretScanTool.js";
import { uniq } from "../../utils/collections.js";
import { getSecretScanVariants } from "../memoryStore/memoryKeys.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-cgr0tezp.js:43122-43347 affinity
function redactMatches(target, pattern, redactMatchKeepPrefix) {
  let edits = [];
  for (let match of target.text.matchAll(pattern)) {
    let { keep, insert, keepEnd = 0 } = redactMatchKeepPrefix(match);
    let index = match.index ?? 0;
    let matchLength = match[0].length;
    let min = Math.min(Math.max(keep | 0, 0), matchLength);
    let min_2 = Math.min(Math.max(keepEnd | 0, 0), matchLength - min);
    edits.push([index + min, index + matchLength - min_2, insert]);
  }
  return applyTextEdits(target, edits);
}
//@ chunk-cgr0tezp.js:43347-43695 placement = initCharAscii (0.716)
function applyTextEdits(target, edits) {
  if (edits.length === 0) return target;
  let { text, origin } = target;
  let newLength = text.length;
  for (let [editStart, editEnd, insert] of edits) newLength += insert.length - (editEnd - editStart);
  let table = new Int32Array(newLength);
  let parts = [];
  let sourceIndex = 0;
  let destIndex = 0;
  for (let [editStart, editEnd, insert] of edits) {
    parts.push(text.slice(sourceIndex, editStart));
    table.set(origin.subarray(sourceIndex, editStart), destIndex);
    destIndex += editStart - sourceIndex;
    parts.push(insert);
    table.fill(-1, destIndex, destIndex + insert.length);
    destIndex += insert.length;
    sourceIndex = editEnd;
  }
  parts.push(text.slice(sourceIndex));
  table.set(origin.subarray(sourceIndex), destIndex);
  return {
    text: parts.join(""),
    origin: table,
  };
}
//@ chunk-cgr0tezp.js:51715-60332 fingerprint = SECRET_RULES (0.516)
/**
 * 密钥扫描的规则表与全部正则片段：键名模式、值形态、JWT、各云厂商令牌规则，以及置信度与预筛标记。
 */
var SECRET_KEY_NAME_RE; // deferred: uses allowSeparatorsInPattern (../../utils/sanitization.js) of its import cycle while loading; runs once the cycle is complete
var WHITESPACE_CHAR_CLASS;
var AUTH_SCHEME_PREFIX;
var UNQUOTED_TOKEN_CHARS;
var VALUE_END_LOOKAHEAD;
var LINE_BREAK_CHARS;
var WHITESPACE_CLASS;
var regExp_10;
var regExp_11;
var ESCAPED_QUOTE_VALUE;
var SIMPLE_VALUE_CHARS;
var SECRET_VALUE_PATTERN;
var BEARER_VALUE_RULE;
var SENSITIVE_KEY_RULE;
var CLOUD_ENV_VAR_RULE;
var ASSIGNMENT_RULES;
var TOKEN_CHAR_CLASS;
var GITLAB_TOKEN_BODY;
var KEY_TAIL_CHARS;
var NO_WHITESPACE_AFTER;
var SENSITIVE_KEY_NAME;
var CLOUD_KEY_NAME;
var SENSITIVE_ASSIGN_PATTERN;
var CLOUD_ENV_ASSIGN_PATTERN;
var ESCAPED_QUOTE_PREFILTER;
var ESCAPED_ASSIGN_PATTERN;
var LOOSE_SENSITIVE_KEY;
var NEXT_KEY_AFTER_MASKED;
var NEXT_KEY_AFTER_MASKED_ESCAPED;
var MASKED_VALUE_TAIL;
var TOKEN_WORD_CHAR;
var TOKEN_RUN;
var JWT_SEGMENT_PAIR;
var JWT_PATTERN;
var SECRET_RULES;
var MIN_PRIVATE_KEY_BODY_CHARS;
deferInit("chunk-cgr0tezp.js:51715", () => {
  SECRET_KEY_NAME_RE = new RegExp(
    allowSeparatorsInPattern(
      String.raw`api[_-]?key|secret|token|password|passwd|credential|bearer|authorization|auth[_-]?header|memory[_-]?request[_-]?mac|cookie|session[_-]?(?:id|key)|connection[_-]?string|(?:private|ssh|encryption|signing|access|deploy|master|license)[_-]?key|client[_-]?secret`,
    ),
    "i",
  );
  WHITESPACE_CHAR_CLASS = `[\\s\\u0085${INVISIBLE_CHAR_RANGES}]`;
  AUTH_SCHEME_PREFIX = `(?:${allowSeparatorsInPattern("Bearer|Basic")})[${INVISIBLE_CHAR_RANGES}]*[\\s\\u0085]+`;
  UNQUOTED_TOKEN_CHARS = "[^\\s\\u0085,;&}\\])]+";
  VALUE_END_LOOKAHEAD = "(?![\\w\\[({$/+=~!@%^?\\\\-])";
  LINE_BREAK_CHARS = "\\n\\r\\x0b\\x0c\\u0085\\u2028\\u2029";
  WHITESPACE_CLASS = "[\\s\\u0085]";
  regExp_10 = new RegExp(WHITESPACE_CHAR_CLASS);
  regExp_11 = new RegExp(`(?:[=:]|["']|\\b(?:${allowSeparatorsInPattern("bearer|basic")}))$`, "i");
  ESCAPED_QUOTE_VALUE = `\\\\+(?:"[^"${LINE_BREAK_CHARS}]*(?<!\\\\)(?=\\\\+")|'[^'${LINE_BREAK_CHARS}]*(?<!\\\\)(?=\\\\+'))`;
  SIMPLE_VALUE_CHARS = `[^\\s\\u0085,;&})"'\\\\]+`;
  SECRET_VALUE_PATTERN = `"[^"${LINE_BREAK_CHARS}]*"|'[^'${LINE_BREAK_CHARS}]*'|"[^"]*"${VALUE_END_LOOKAHEAD}|'[^']*'${VALUE_END_LOOKAHEAD}|[^\\s-]{0,4}\\[REDACTED\\]['"\`]?|${AUTH_SCHEME_PREFIX}(?:\\[REDACTED\\]|${UNQUOTED_TOKEN_CHARS})|${UNQUOTED_TOKEN_CHARS}`;
  BEARER_VALUE_RULE = {
    word: "\\b(?:Bearer|Basic)",
    tail: "",
    separator: `${WHITESPACE_CLASS}+`,
    value: "[A-Za-z0-9+/=._~-]{20,}",
  };
  SENSITIVE_KEY_RULE = {
    word: `(?:${SECRET_KEY_NAME_RE.source})`,
    tail: "[\\w.-]",
    separator: `["']?${WHITESPACE_CLASS}*[=:]${WHITESPACE_CLASS}*`,
    value: SECRET_VALUE_PATTERN,
  };
  CLOUD_ENV_VAR_RULE = {
    word: "\\b(?:AWS|GOOGLE|GCP|GCLOUD|AZURE)_\\w",
    tail: "\\w",
    separator: `${WHITESPACE_CLASS}*[=:]${WHITESPACE_CLASS}*`,
    value: SECRET_VALUE_PATTERN,
  };
  ASSIGNMENT_RULES = [SENSITIVE_KEY_RULE, CLOUD_ENV_VAR_RULE, BEARER_VALUE_RULE];
  TOKEN_CHAR_CLASS = "[\\w=-]";
  GITLAB_TOKEN_BODY = `${TOKEN_CHAR_CLASS}{20,}(?:\\.[0-9a-z]{9})?`;
  KEY_TAIL_CHARS = "[\\w.-]{0,256}(?![\\w.-])";
  NO_WHITESPACE_AFTER = `${WHITESPACE_CLASS}*(?!${WHITESPACE_CLASS})`;
  SENSITIVE_KEY_NAME = `(?:${SECRET_KEY_NAME_RE.source})${KEY_TAIL_CHARS}`;
  CLOUD_KEY_NAME = `\\b(?:${allowSeparatorsInPattern("AWS|GOOGLE|GCP|GCLOUD|AZURE")})${INVISIBLE_CHARS_RE_SOURCE}_\\w+`;
  SENSITIVE_ASSIGN_PATTERN = `${SENSITIVE_KEY_NAME}(?:${INVISIBLE_CHARS_RE_SOURCE}["'])?${WHITESPACE_CHAR_CLASS}*[=:]${NO_WHITESPACE_AFTER}(${SECRET_VALUE_PATTERN})`;
  CLOUD_ENV_ASSIGN_PATTERN = `${CLOUD_KEY_NAME}${WHITESPACE_CHAR_CLASS}*[=:]${WHITESPACE_CLASS}*(${SECRET_VALUE_PATTERN})`;
  ESCAPED_QUOTE_PREFILTER = /\\["']/;
  ESCAPED_ASSIGN_PATTERN = `${SENSITIVE_KEY_NAME}${INVISIBLE_CHARS_RE_SOURCE}\\\\+["']${WHITESPACE_CHAR_CLASS}*[=:]${NO_WHITESPACE_AFTER}(${ESCAPED_QUOTE_VALUE}|${AUTH_SCHEME_PREFIX}${SIMPLE_VALUE_CHARS}|${SIMPLE_VALUE_CHARS}|\\\\+["'][^\\s\\u0085,;&})"'\\\\]*)`;
  LOOSE_SENSITIVE_KEY = `[^\\s\\u0085,;&}\\])"']{0,64}?(?:${SENSITIVE_KEY_NAME}|${CLOUD_KEY_NAME})`;
  NEXT_KEY_AFTER_MASKED = `(?:${AUTH_SCHEME_PREFIX})?(?:[{[(]{0,8}(?:"${LOOSE_SENSITIVE_KEY}"|'${LOOSE_SENSITIVE_KEY}')|${LOOSE_SENSITIVE_KEY})${WHITESPACE_CHAR_CLASS}*[=:]`;
  NEXT_KEY_AFTER_MASKED_ESCAPED = `(?:${AUTH_SCHEME_PREFIX})?(?:[{[(]{0,8}(?:"${LOOSE_SENSITIVE_KEY}"|'${LOOSE_SENSITIVE_KEY}'|\\\\+"${LOOSE_SENSITIVE_KEY}\\\\+"|\\\\+'${LOOSE_SENSITIVE_KEY}\\\\+')|${LOOSE_SENSITIVE_KEY})${WHITESPACE_CHAR_CLASS}*[=:]`;
  MASKED_VALUE_TAIL = "\\][^\\s\"'>}|,;&`)\\]]*";
  TOKEN_WORD_CHAR = "[A-Za-z0-9_-]";
  TOKEN_RUN = `${TOKEN_WORD_CHAR}{10}${TOKEN_WORD_CHAR}*`;
  JWT_SEGMENT_PAIR = `\\.${TOKEN_RUN}\\.${TOKEN_RUN}`;
  JWT_PATTERN = `(?<!${TOKEN_WORD_CHAR})(?=${TOKEN_WORD_CHAR}+${JWT_SEGMENT_PAIR})(?:${TOKEN_WORD_CHAR}*?-)??(eyJ${TOKEN_RUN}${JWT_SEGMENT_PAIR})`;
  SECRET_RULES = [
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
  MIN_PRIVATE_KEY_BODY_CHARS = 64;
});
//@ chunk-cgr0tezp.js:60332-60640 layout
/**
 * 查找 PEM 私钥块（BEGIN … PRIVATE KEY 到 END）。
 */
function findPrivateKeyBlock(text, lastIndex) {
  let beginRe = /-----BEGIN[ A-Z0-9_-]{0,100}?PRIVATE KEY(?: BLOCK)?-----/gi;
  let endRe = /-----END[ A-Z0-9_-]{0,100}?PRIVATE KEY(?: BLOCK)?-----/gi;
  beginRe.lastIndex = lastIndex;
  let match = beginRe.exec(text);
  if (!match) return null;
  endRe.lastIndex = match.index + match[0].length + MIN_PRIVATE_KEY_BODY_CHARS;
  let match_2 = endRe.exec(text);
  if (!match_2) return null;
  return {
    start: match.index,
    end: match_2.index + match_2[0].length,
  };
}
//@ chunk-cgr0tezp.js:60640-60677 layout
function containsPrivateKey(text) {
  return findPrivateKeyBlock(text, 0) !== null;
}
//@ chunk-cgr0tezp.js:60677-60821 layout = redactSecrets (0.815)
function redactSecrets_2(content) {
  let pemBlocks = findPemBlocks(content);
  if (pemBlocks.length === 0) return content;
  let result = "";
  let cursor = 0;
  for (let re of pemBlocks) {
    result += content.slice(cursor, re.start) + "[REDACTED]";
    cursor = re.end;
  }
  return result + content.slice(cursor);
}
//@ chunk-cgr0tezp.js:60821-61171 placement
/**
 * 文本中是否有 PEM 私钥块。
 */
function findPemBlocks(text) {
  let lastIndex = text.indexOf("-----");
  while (lastIndex !== -1) {
    while (text.charCodeAt(lastIndex + 5) === 45) lastIndex++;
    if (
      (text.charCodeAt(lastIndex + 5) | 32) === 98 &&
      (text.charCodeAt(lastIndex + 6) | 32) === 101 &&
      (text.charCodeAt(lastIndex + 7) | 32) === 103 &&
      (text.charCodeAt(lastIndex + 8) | 32) === 105 &&
      (text.charCodeAt(lastIndex + 9) | 32) === 110
    )
      break;
    lastIndex = text.indexOf("-----", lastIndex + 5);
  }
  let blocks = [];
  if (lastIndex === -1) return blocks;
  for (
    let privateKeyBlock = findPrivateKeyBlock(text, lastIndex);
    privateKeyBlock;
    privateKeyBlock = findPrivateKeyBlock(text, privateKeyBlock.end)
  )
    blocks.push(privateKeyBlock);
  return blocks;
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
    let base = {
      id,
      confidence,
    };
    let globalFlags = flags.replace("g", "") + "g";
    if (confidence !== "high")
      return {
        ...base,
        re: new RegExp(source, globalFlags),
      };
    let bodyPattern = stripTrailingDelimiter(source);
    if (displayRun === undefined)
      return {
        ...base,
        re: new RegExp(TOKEN_BOUNDARY_BEFORE + bodyPattern + TOKEN_BOUNDARY_AFTER, globalFlags),
      };
    return {
      ...base,
      prefilter: new RegExp(bodyPattern, flags.replace("g", "")),
      re: new RegExp(
        `(?<!${displayRun})(?=${displayRun}+${TOKEN_BOUNDARY_AFTER})${displayRun}*?${TOKEN_BOUNDARY_BEFORE}(${bodyPattern})${TOKEN_BOUNDARY_AFTER}`,
        globalFlags,
      ),
    };
  });
}
//@ chunk-cgr0tezp.js:61632-62061 placement
/**
 * 编译密钥扫描规则（预过滤、置信度）。
 */
function compileSecretRules(globalRegex) {
  return SECRET_RULES.map((rule) => {
    let replaced = (rule.flags ?? "").replace("g", "");
    let base = {
      id: rule.id,
      confidence: rule.confidence,
      ...(rule.redactOnly === true && {
        redactOnly: rule.redactOnly,
      }),
      ...(rule.prefilter !== undefined && {
        prefilter: rule.prefilter,
      }),
    };
    if (rule.run === undefined)
      return {
        ...base,
        re: new RegExp(rule.source, globalRegex ? replaced + "g" : (rule.flags ?? "")),
      };
    return {
      ...base,
      prefilter: new RegExp(stripTrailingDelimiter(rule.source), replaced),
      re: new RegExp(
        `(?:(?<!${rule.run})|(?<=\\\\[nr]))(?=${rule.run}+${SECRET_VALUE_TERMINATOR})${rule.run}*?${rule.source}`,
        globalRegex ? replaced + "g" : replaced,
      ),
    };
  });
}
//@ chunk-cgr0tezp.js:62061-62122 placement
function stripTrailingDelimiter(source) {
  return source.endsWith(SECRET_VALUE_TERMINATOR) ? source.slice(0, -SECRET_VALUE_TERMINATOR.length) : source;
}
//@ chunk-cgr0tezp.js:62122-62333 placement
function replaceSecretValue(text, value) {
  if (typeof value !== "string") return "[REDACTED]";
  let quote =
    value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0] ? value[0] : "";
  let index = text.lastIndexOf(value);
  return `${text.slice(0, index)}${quote}[REDACTED]${quote}${text.slice(index + value.length)}`;
}
//@ chunk-cgr0tezp.js:62333-62574 placement
function redactMatchKeepPrefix(match) {
  let value = match[1];
  if (typeof value !== "string")
    return {
      keep: 0,
      insert: "[REDACTED]",
    };
  let quoteOffset =
    value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0] ? 1 : 0;
  let index = match[0].lastIndexOf(value);
  return {
    keep: index + quoteOffset,
    insert: "[REDACTED]",
    keepEnd: match[0].length - index - value.length + quoteOffset,
  };
}
//@ chunk-cgr0tezp.js:62574-62765 placement
function findSecretAssignmentRanges(text) {
  let mapped = collectUrlRedactions(text, ASSIGNMENT_RULES).map(({ start, end }) => {
    let quoteOffset = /^(["'])[^]*\1$/.test(text.slice(start, end)) ? 1 : 0;
    return [start + quoteOffset, end - quoteOffset];
  });
  let sshUrlUserinfoSpans = findSshUrlUserinfoSpans(text);
  let keyValueSecretRanges = findKeyValueSecretRanges(text);
  return sshUrlUserinfoSpans.length === 0 && keyValueSecretRanges.length === 0
    ? mapped
    : mergeRanges([...mapped, ...sshUrlUserinfoSpans, ...keyValueSecretRanges]);
}
//@ chunk-cgr0tezp.js:62765-62801 placement
/**
 * 赋值形式（key=value）扫描的两套编译结果缓存（普通与转义）。
 */
var assignmentScanCache; // deferred: uses SECRET_KEY_NAME_RE of its import cycle while loading; runs once the cycle is complete
var regExp_12;
var MAX_NEXT_KEY_CHARS;
deferInit("chunk-cgr0tezp.js:62765", () => {
  regExp_12 = new RegExp(MASKED_VALUE_TAIL, "y");
  MAX_NEXT_KEY_CHARS = 512;
});
//@ chunk-cgr0tezp.js:62801-63182 placement
/**
 * 赋值形式（key=value）密钥扫描器。
 */
function findKeyValueSecretRanges(text) {
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
  let ranges = scanAssignments(text, assignmentScanCache.plain);
  return ESCAPED_QUOTE_PREFILTER.test(text)
    ? [...ranges, ...scanAssignments(text, assignmentScanCache.escaped)]
    : ranges;
}
//@ chunk-cgr0tezp.js:63182-63767 placement
/**
 * 扫描 key=value 中的敏感值区间。
 */
function scanAssignments(text, { assign, nextKey, valueWithWhitespace, skipsStrays }) {
  let ranges = [];
  let pendingValueStart;
  let previousMatchEnd = 0;
  let terminatorRe = regExp_12;
  assign.lastIndex = 0;
  for (let match = assign.exec(text); match !== null; match = assign.exec(text)) {
    let valueText = match[1] ?? match[2] ?? match[3];
    let matchEnd = match.index + match[0].length;
    let valueStart = matchEnd - valueText.length;
    nextKey.lastIndex = valueStart;
    let lastIndex =
      valueText.length <= MAX_NEXT_KEY_CHARS && nextKey.test(text) ? nextKey.lastIndex : undefined;
    if (lastIndex !== undefined && lastIndex < matchEnd) {
      valueWithWhitespace.lastIndex = lastIndex;
      if (!valueWithWhitespace.test(text)) lastIndex = undefined;
    }
    if (
      skipsStrays &&
      pendingValueStart !== undefined &&
      match.index >= pendingValueStart &&
      match.index < previousMatchEnd &&
      lastIndex === undefined
    ) {
      pendingValueStart = undefined;
      assign.lastIndex = previousMatchEnd;
      continue;
    }
    if (pendingValueStart !== undefined && match.index < pendingValueStart) {
      let matches = /^(["'])[^]*\1$/.test(valueText);
      let quoteOffset = matches && previousMatchEnd <= valueStart ? 1 : 0;
      terminatorRe.lastIndex = matchEnd;
      ranges.push([
        valueStart + quoteOffset,
        !matches && terminatorRe.test(text) ? terminatorRe.lastIndex : matchEnd - quoteOffset,
      ]);
    }
    previousMatchEnd = matchEnd;
    pendingValueStart = lastIndex;
    if (pendingValueStart !== undefined) assign.lastIndex = valueStart;
  }
  return ranges;
}
//@ chunk-cgr0tezp.js:63767-63945 placement
function mergeRanges(sshUrlUserinfoSpans) {
  let sorted = sshUrlUserinfoSpans
    .filter(([start, end]) => end > start)
    .sort((left, right) => left[0] - right[0]);
  let merged = [];
  for (let [start, end] of sorted) {
    let last = merged.at(-1);
    if (last !== undefined && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
//@ chunk-cgr0tezp.js:63945-64293 placement = redactSecrets (0.815)
/**
 * 按原文位置映射对跟踪文本做遮盖。
 */
function redactTrackedRanges(target, ranges) {
  let { text, origin } = target;
  let edits = [];
  let rangeIndex = 0;
  for (let cursor = 0; cursor < text.length;) {
    let originIndex = origin[cursor];
    while (rangeIndex < ranges.length && ranges[rangeIndex][1] <= originIndex) rangeIndex++;
    let range = ranges[rangeIndex];
    if (originIndex < 0 || range === undefined || originIndex < range[0]) {
      cursor++;
      continue;
    }
    let runStart = cursor;
    while (runStart > 0 && origin[runStart - 1] < 0) runStart--;
    while (
      cursor < text.length &&
      (origin[cursor] < 0 || (origin[cursor] >= range[0] && origin[cursor] < range[1]))
    )
      cursor++;
    let last = edits.at(-1);
    if (last !== undefined && last[1] >= runStart) last[1] = cursor;
    else edits.push([runStart, cursor, "[REDACTED]"]);
  }
  return applyTextEdits(target, edits);
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
  scan(text) {
    this.testRules ??= compileSecretRules(false);
    let findings = [];
    for (let testRule of this.testRules)
      if (
        testRule.confidence === "high" &&
        testRule.prefilter?.test(text) !== false &&
        testRule.re.test(text)
      )
        findings.push({
          ruleId: testRule.id,
          label: testRule.id
            .split("-")
            .map((word) => ruleIdToLabel[word] ?? capitalize(word))
            .join(" "),
        });
    if (containsPrivateKey(text))
      findings.push({
        ruleId: "private-key",
        label: "Private Key",
      });
    return findings;
  }
  redactContext(content, includePrefixContext = false) {
    this.redactRules ??= compileSecretRules(true);
    let result = redactSecrets_2(content);
    for (let redactRule of this.redactRules)
      if (redactRule.confidence === "low" && ruleApplies(redactRule, includePrefixContext, result))
        result = result.replace(redactRule.re, replaceSecretValue);
    return result;
  }
  redactTokens(text) {
    this.redactRules ??= compileSecretRules(true);
    let result = text;
    for (let redactRule of this.redactRules)
      if (redactRule.confidence === "high" && redactRule.prefilter?.test(result) !== false)
        result = result.replace(redactRule.re, replaceSecretValue);
    return result;
  }
  trackedByRules(text, includePrefixContext = false) {
    return this.trackedTokens(this.trackedContext(text, includePrefixContext));
  }
  trackedContext(text, includePrefixContext = false) {
    let mappedText = applyTextEdits(
      createOffsetMappedText(text),
      findPemBlocks(text).map(({ start, end }) => [start, end, "[REDACTED]"]),
    );
    return this.trackedRules(mappedText, "low", includePrefixContext);
  }
  redactOnlyRules(text) {
    this.redactRules ??= compileSecretRules(true);
    let result = text;
    for (let redactRule of this.redactRules)
      if (redactRule.redactOnly === true && ruleApplies(redactRule, true, result))
        result = result.replace(redactRule.re, replaceSecretValue);
    return result;
  }
  trackedTokens(text) {
    return this.trackedRules(text, "high");
  }
  trackedRules(target, confidence, includePrefixContext = false) {
    this.redactRules ??= compileSecretRules(true);
    let result = target;
    for (let redactRule of this.redactRules)
      if (
        redactRule.confidence === confidence &&
        ruleApplies(redactRule, includePrefixContext, result.text)
      ) {
        redactRule.re.lastIndex = 0;
        result = redactMatches(result, redactRule.re, redactMatchKeepPrefix);
      }
    return result;
  }
  redactWithUrlRanges(text) {
    let secretAssignmentRanges = findSecretAssignmentRanges(text);
    return secretAssignmentRanges.length === 0
      ? this.redactTokens(this.redactContext(text, true))
      : redactTrackedRanges(this.trackedByRules(text, true), secretAssignmentRanges).text;
  }
  redactTracked(text) {
    return redactTrackedRanges(this.trackedByRules(text, true), findSecretAssignmentRanges(text));
  }
  redact(text) {
    let isCacheable = text.length <= MAX_CACHED_SCAN_INPUT_CHARS;
    if (isCacheable) {
      let cached = this.resultCache.get(text);
      if (cached !== undefined) return cached;
    }
    let result = this.redactWithUrlRanges(text);
    if (isCacheable) {
      if (this.resultCache.size >= MAX_SCAN_RESULT_CACHE_ENTRIES)
        this.resultCache.delete(this.resultCache.keys().next().value);
      this.resultCache.set(text, result);
    }
    return result;
  }
  redactForDisplay(text) {
    this.displayRules ??= compileDisplayRules();
    let result = text;
    for (let displayRule of this.displayRules) {
      if (displayRule.confidence !== "high" || displayRule.prefilter?.test(result) === false) continue;
      result = result.replace(displayRule.re, redactUnlessShellLike);
    }
    return result;
  }
}
//@ chunk-cgr0tezp.js:66178-66191 placement
/**
 * 全局 SecretScanner 单例，所有扫描/脱敏函数都委托给它。
 */
var secretScanner; // deferred: uses SecretScanner of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-cgr0tezp.js:66178", () => {
  secretScanner = new SecretScanner();
});
//@ chunk-cgr0tezp.js:66191-66224 placement
/**
 * 扫描文本中的疑似密钥，返回命中规则列表。
 */
function scanForSecrets(text) {
  return secretScanner.scan(text);
}
//@ chunk-cgr0tezp.js:66224-66258 placement
/**
 * 遮盖文本中的密钥。
 */
function redactSecrets(text) {
  return secretScanner.redact(text);
}
//@ chunk-cgr0tezp.js:66258-66316 placement
/**
 * 先按上下文（key=value 等）再按令牌形状脱敏，替换为 [REDACTED]。
 */
function redactSecretsInText(text) {
  return secretScanner.redactTokens(secretScanner.redactContext(text));
}
//@ chunk-cgr0tezp.js:66316-66358 placement
function redactSecretContext(text) {
  return secretScanner.redactContext(text);
}
//@ chunk-cgr0tezp.js:66358-66399 placement
function redactSecretTokens(text) {
  return secretScanner.redactTokens(text);
}
//@ chunk-cgr0tezp.js:66399-66443 placement
var regExp_13; // deferred: uses SECRET_KEY_NAME_RE of its import cycle while loading; runs once the cycle is complete
var regExp_14;
deferInit("chunk-cgr0tezp.js:66399", () => {
  regExp_13 = new RegExp(JWT_PATTERN);
  regExp_14 = new RegExp(JWT_PATTERN, "g");
});
//@ chunk-cgr0tezp.js:66443-66457 placement
/**
 * 截断遮盖的窗口大小。
 */
var REDACT_WINDOW_CHARS = 16384;
//@ chunk-cgr0tezp.js:66457-66791 placement
/**
 * 遮盖后截断到指定长度。
 */
function redactAndTruncate(text, maxChars) {
  let secretAssignmentRanges = findSecretAssignmentRanges(text);
  if (secretAssignmentRanges.length === 0)
    return redactTokensPrefix(secretScanner.redactContext(text, true), maxChars);
  let mappedText = secretScanner.trackedContext(text, true);
  for (let windowChars = maxChars + 2 * REDACT_WINDOW_CHARS; ; windowChars *= 2) {
    if (mappedText.text.length <= windowChars)
      return redactTrackedRanges(secretScanner.trackedTokens(mappedText), secretAssignmentRanges).text;
    let sliceRedacted = secretScanner.trackedTokens(sliceSpan(mappedText, 0, windowChars));
    let availableChars = sliceRedacted.text.length - REDACT_WINDOW_CHARS;
    if (availableChars >= maxChars) {
      let sliceLength = truncateToLength(sliceRedacted.text, availableChars).length;
      let redactedSlice = redactTrackedRanges(
        sliceSpan(sliceRedacted, 0, sliceLength),
        secretAssignmentRanges,
      );
      if (redactedSlice.text.length >= maxChars) return redactedSlice.text;
    }
  }
}
//@ chunk-cgr0tezp.js:66791-66834 placement
/**
 * shell 元字符正则（含空白、反引号与斜杠等）。
 */
var SHELL_META_RE = /[$\x60|;&<>()\s]/;
var SHELL_PUNCT_RE = /[/.@:~*?\\]/;
//@ chunk-cgr0tezp.js:66834-66931 placement
function redactUnlessShellLike(matched, captured) {
  let candidate = typeof captured === "string" ? captured : matched;
  if (SHELL_META_RE.test(candidate) || SHELL_PUNCT_RE.test(candidate)) return matched;
  return replaceSecretValue(matched, captured);
}
//@ chunk-cgr0tezp.js:66931-66976 placement
/**
 * 展示用脱敏（保留可辨识前缀）。
 */
function redactSecretsForDisplay(text) {
  return secretScanner.redactForDisplay(text);
}
//@ chunk-cgr0tezp.js:66976-67406 placement
/**
 * 递归脱敏字符串、数组、对象（含对象键）。
 */
function redactSecretsDeep(value, redactSecretsForDisplay = redactSecrets) {
  if (typeof value === "string") return redactSecretsForDisplay(value);
  if (Array.isArray(value)) return value.map((item) => redactSecretsDeep(item, redactSecretsForDisplay));
  if (value !== null && typeof value === "object") {
    let out = Object.create(null);
    let entries = Object.entries(value);
    let redactedKeys =
      redactSecretsForDisplay === redactSecrets ? redactObjectKeys(entries.map(([key]) => key)) : undefined;
    for (let [index, [key, entryValue]] of entries.entries()) {
      let destKey = redactedKeys ? redactedKeys[index] : key;
      if (typeof entryValue === "string") {
        if (redactSecretsForDisplay === redactSecrets) {
          out[destKey] = redactKeyedValue(key, entryValue);
          continue;
        }
        let prefix = `${key}: `;
        let redacted = redactSecretsForDisplay(prefix + entryValue);
        out[destKey] = redacted.startsWith(prefix)
          ? redacted.slice(prefix.length)
          : redactSecretsForDisplay(entryValue);
      } else out[destKey] = redactSecretsDeep(entryValue, redactSecretsForDisplay);
    }
    return out;
  }
  return value;
}
//@ chunk-cgr0tezp.js:67406-67875 placement
/**
 * 带键名上下文地遮盖值。
 */
function redactKeyedValue(key, value) {
  let prefix = `${key}: `;
  let prefixed = prefix + value;
  let secretAssignmentRanges = findSecretAssignmentRanges(prefixed);
  if (secretAssignmentRanges.length === 0) {
    let redacted = redactSecrets(prefixed);
    if (redacted.startsWith(prefix)) return redacted.slice(prefix.length);
    let tokenRedacted = redactSecretsInText(prefixed);
    return tokenRedacted.startsWith(prefix)
      ? secretScanner.redactOnlyRules(tokenRedacted.slice(prefix.length))
      : redactSecrets(value);
  }
  let localRanges = [];
  for (let [start, end] of secretAssignmentRanges)
    if (end > prefix.length) localRanges.push([Math.max(start, prefix.length), end]);
  let trackedWithPrefix = secretScanner.trackedByRules(prefixed, true);
  if (trackedWithPrefix.text.startsWith(prefix))
    return redactTrackedRanges(trackedWithPrefix, localRanges).text.slice(prefix.length);
  let tracked = secretScanner.trackedByRules(prefixed);
  return tracked.text.startsWith(prefix)
    ? secretScanner.redactOnlyRules(redactTrackedRanges(tracked, localRanges).text.slice(prefix.length))
    : redactSecrets(value);
}
//@ chunk-cgr0tezp.js:67875-68132 placement
function redactObjectKeys(keys) {
  let mapped = keys.map((key) => redactSecrets(key));
  if (mapped.every((redactedKey, index) => redactedKey === keys[index])) return mapped;
  let used = new Set(mapped.filter((redactedKey, index) => redactedKey === keys[index]));
  let nextSuffix = new Map();
  return mapped.map((redactedKey, index) => {
    if (redactedKey === keys[index]) return redactedKey;
    let candidate = redactedKey;
    let suffix = nextSuffix.get(redactedKey) ?? 2;
    while (used.has(candidate)) {
      candidate = `${redactedKey} (${suffix})`;
      suffix++;
    }
    nextSuffix.set(redactedKey, suffix);
    used.add(candidate);
    return candidate;
  });
}
//@ chunk-cgr0tezp.js:68132-68247 placement = redactSecrets (0.815)
function redactSecrets_3(content) {
  let result = Object.create(null);
  for (let [key, value] of Object.entries(content))
    result[key] = SECRET_KEY_NAME_RE.test(key) ? "[REDACTED]" : value;
  return result;
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
//@ chunk-nmregrje.js:1741-1805 fingerprint = ANT_KEY_PFX (0.628)
function ANT_KEY_PFX(url, body, storage, rollout = "api") {
  return isFirstPartyAnthropicHost(url) ? decideGzip(url, bodyCharCount(body), storage, rollout) : undefined;
}
//@ chunk-s61vbvea.js:569876-570050 fingerprint = getCompiledRules (0.704)
function getTextAfterLastRuleMatch(text) {
  let lastMatchIndex = -1;
  for (let { re } of [...GH_PR_ACTIONS, ...GLAB_MR_ACTIONS]) {
    let regExp = new RegExp(re.source, "g");
    for (let match = regExp.exec(text); match; match = regExp.exec(text))
      lastMatchIndex = Math.max(lastMatchIndex, match.index);
  }
  return lastMatchIndex < 0 ? undefined : getPrAction(text.slice(lastMatchIndex));
}
//@ chunk-151tygw9.js:7043-7062 fingerprint = redactSecrets (0.815)
var REDACTED_PLACEHOLDER = "[REDACTED]";
//@ chunk-jy3v56kg.js:27929-28144 fingerprint = scanForSecrets (0.425)
/**
 * 扫描文本中的密钥（规则 id 与标签）。
 */
function scanForSecrets_2(content) {
  let variants = content.includes(REPLACEMENT_CHAR)
    ? uniq([
        ...getSecretScanVariants(content),
        ...getSecretScanVariants(content.replaceAll(REPLACEMENT_CHAR, "")),
      ])
    : getSecretScanVariants(content);
  let flattened = variants.flatMap((variant) =>
    scanForSecrets(variant).map((finding) =>
      finding.ruleId.startsWith("anthropic-") ? ANTHROPIC_KEY_LABEL : finding.label,
    ),
  );
  if (variants.some((variant) => ANTHROPIC_KEY_IN_PATH_REGEX.test(variant)))
    flattened.push(ANTHROPIC_KEY_LABEL);
  return uniq(flattened);
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

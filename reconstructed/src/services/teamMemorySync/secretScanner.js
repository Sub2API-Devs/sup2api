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
import { allowSeparatorsInPattern, Tje, gft } from "../../utils/sanitization.js";
import { collectUrlRedactions, findSshUrlUserinfoSpans, ot } from "../../utils/redaction/urlParsing.js";
import { capitalize, truncateToLength } from "../../utils/stringUtils.js";
import { ruleApplies, redactTokensPrefix } from "../../utils/redaction/urlRedaction.js";
import { createOffsetMappedText } from "../../utils/fsOperations.js";
import { Je, qe, Yn } from "../../skills/bundled/pluginAuthoring/secretScanTool.js";
import { uniq } from "../../utils/collections.js";
import { getSecretScanVariants } from "../memoryStore/memoryKeys.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { decideGzip, Dir } from "../api/gzipRequestBody.js";
import { GH_PR_ACTIONS, GLAB_MR_ACTIONS, getPrAction } from "../../tools/shared/gitOperationTracking.js";

//@ chunk-cgr0tezp.js:43122-43347 affinity
function redactMatches(e, n, r) {
  let i = [];
  for (let s of e.text.matchAll(n)) {
    let { keep: keep, insert: insert, keepEnd: keepEnd = 0 } = r(s),
      c = s.index ?? 0,
      l = s[0].length,
      min = Math.min(Math.max(keep | 0, 0), l),
      min_2 = Math.min(Math.max(keepEnd | 0, 0), l - min);
    i.push([c + min, c + l - min_2, insert]);
  }
  return applyTextEdits(e, i);
}
//@ chunk-cgr0tezp.js:43347-43695 placement = initCharAscii (0.716)
function applyTextEdits(e, n) {
  if (n.length === 0) return e;
  let { text: text, origin: origin } = e,
    s = text.length;
  for (let [l, d, g] of n) s += g.length - (d - l);
  let table = new Int32Array(s),
    a = [],
    u = 0,
    c = 0;
  for (let [l, d, g] of n)
    (a.push(text.slice(u, l)),
      table.set(origin.subarray(u, l), c),
      (c += l - u),
      a.push(g),
      table.fill(-1, c, c + g.length),
      (c += g.length),
      (u = d));
  return (a.push(text.slice(u)), table.set(origin.subarray(u), c), { text: a.join(""), origin: table });
}
//@ chunk-cgr0tezp.js:51715-60332 fingerprint = SECRET_RULES (0.516)
var SECRET_KEY_NAME_RE = new RegExp(
    allowSeparatorsInPattern(
      String.raw`api[_-]?key|secret|token|password|passwd|credential|bearer|authorization|auth[_-]?header|memory[_-]?request[_-]?mac|cookie|session[_-]?(?:id|key)|connection[_-]?string|(?:private|ssh|encryption|signing|access|deploy|master|license)[_-]?key|client[_-]?secret`,
    ),
    "i",
  ),
  ge = `[\\s\\u0085${Tje}]`,
  oe = `(?:${allowSeparatorsInPattern("Bearer|Basic")})[${Tje}]*[\\s\\u0085]+`,
  Wn = "[^\\s\\u0085,;&}\\])]+",
  Gn = "(?![\\w\\[({$/+=~!@%^?\\\\-])",
  He = "\\n\\r\\x0b\\x0c\\u0085\\u2028\\u2029",
  ee = "[\\s\\u0085]",
  regExp_10 = new RegExp(ge),
  regExp_11 = new RegExp(`(?:[=:]|["']|\\b(?:${allowSeparatorsInPattern("bearer|basic")}))$`, "i"),
  rs = `\\\\+(?:"[^"${He}]*(?<!\\\\)(?=\\\\+")|'[^'${He}]*(?<!\\\\)(?=\\\\+'))`,
  Kn = `[^\\s\\u0085,;&})"'\\\\]+`,
  Ge = `"[^"${He}]*"|'[^'${He}]*'|"[^"]*"${Gn}|'[^']*'${Gn}|[^\\s-]{0,4}\\[REDACTED\\]['"\`]?|${oe}(?:\\[REDACTED\\]|${Wn})|${Wn}`,
  is = { word: "\\b(?:Bearer|Basic)", tail: "", separator: `${ee}+`, value: "[A-Za-z0-9+/=._~-]{20,}" },
  ss = {
    word: `(?:${SECRET_KEY_NAME_RE.source})`,
    tail: "[\\w.-]",
    separator: `["']?${ee}*[=:]${ee}*`,
    value: Ge,
  },
  os = {
    word: "\\b(?:AWS|GOOGLE|GCP|GCLOUD|AZURE)_\\w",
    tail: "\\w",
    separator: `${ee}*[=:]${ee}*`,
    value: Ge,
  },
  as = [ss, os, is],
  V = "[\\w=-]",
  J = `${V}{20,}(?:\\.[0-9a-z]{9})?`,
  us = "[\\w.-]{0,256}(?![\\w.-])",
  Xn = `${ee}*(?!${ee})`,
  Et = `(?:${SECRET_KEY_NAME_RE.source})${us}`,
  qn = `\\b(?:${allowSeparatorsInPattern("AWS|GOOGLE|GCP|GCLOUD|AZURE")})${gft}_\\w+`,
  ft = `${Et}(?:${gft}["'])?${ge}*[=:]${Xn}(${Ge})`,
  gt = `${qn}${ge}*[=:]${ee}*(${Ge})`,
  er = /\\["']/,
  tr = `${Et}${gft}\\\\+["']${ge}*[=:]${Xn}(${rs}|${oe}${Kn}|${Kn}|\\\\+["'][^\\s\\u0085,;&})"'\\\\]*)`,
  Q = `[^\\s\\u0085,;&}\\])"']{0,64}?(?:${Et}|${qn})`,
  ls = `(?:${oe})?(?:[{[(]{0,8}(?:"${Q}"|'${Q}')|${Q})${ge}*[=:]`,
  cs = `(?:${oe})?(?:[{[(]{0,8}(?:"${Q}"|'${Q}'|\\\\+"${Q}\\\\+"|\\\\+'${Q}\\\\+')|${Q})${ge}*[=:]`,
  nr = "\\][^\\s\"'>}|,;&`)\\]]*",
  Ee = "[A-Za-z0-9_-]",
  pt = `${Ee}{10}${Ee}*`,
  zn = `\\.${pt}\\.${pt}`,
  St = `(?<!${Ee})(?=${Ee}+${zn})(?:${Ee}*?-)??(eyJ${pt}${zn})`,
  rr = [
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
    { id: "loose-anthropic-key", source: "\\b(sk-ant-?[\\w-]{10,})", confidence: "low" },
    { id: "http-auth-scheme", source: `\\b${oe}([A-Za-z0-9+/=._~-]{20,})`, flags: "i", confidence: "low" },
    { id: "loose-jwt", prefilter: /eyJ/, source: St, confidence: "low" },
    { id: "sensitive-assign", source: ft, flags: "i", confidence: "low" },
    { id: "cloud-env-var", source: gt, flags: "i", confidence: "low" },
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
    { id: "masked-value-rest", source: `\\[REDACTED\\](${nr})`, confidence: "low" },
    {
      id: "anthropic-signed-key-rest",
      redactOnly: !0,
      prefilter: /\[REDACTED\]\.eyJ/,
      source: "\\[REDACTED\\]\\.(eyJ[\\w-]+\\.[\\w-]+)",
      confidence: "low",
    },
    {
      id: "sensitive-assign-escaped",
      redactOnly: !0,
      prefilter: er,
      source: tr,
      flags: "i",
      confidence: "low",
    },
    {
      id: "aws-access-token",
      source: "\\b((?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16})\\b",
      confidence: "high",
    },
    { id: "gcp-api-key", source: "\\b(AIza[\\w-]{35})(?![\\w-])", confidence: "high" },
    { id: "google-oauth-client-secret", source: "\\bGOCSPX-[\\w-]{28}(?![\\w-])", confidence: "high" },
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
    { id: "openai-legacy-api-key", source: "\\bsk-[a-zA-Z0-9]{48}(?![a-zA-Z0-9])", confidence: "high" },
    {
      id: "huggingface-access-token",
      source: `\\b(hf_[a-zA-Z]{34})(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
      confidence: "high",
    },
    { id: "supabase-secret-key", source: "\\bsb_secret_[A-Za-z0-9_-]{20,}", confidence: "high" },
    { id: "supabase-access-token", source: "\\bsbp_[a-z0-9]{40,}", confidence: "high" },
    { id: "github-pat", source: "ghp_[0-9a-zA-Z]{36}", confidence: "high" },
    { id: "github-fine-grained-pat", source: "github_pat_\\w{82}", confidence: "high" },
    { id: "github-app-token", source: "(?:ghu|ghs)_[0-9a-zA-Z]{36}", confidence: "high" },
    { id: "github-oauth", source: "gho_[0-9a-zA-Z]{36}", confidence: "high" },
    { id: "github-refresh-token", source: "ghr_[0-9a-zA-Z]{36}", confidence: "high" },
    { id: "gitlab-pat", source: `glpat-${J}`, displayRun: V, confidence: "high" },
    { id: "gitlab-deploy-token", source: `gldt-${J}`, displayRun: V, confidence: "high" },
    { id: "gitlab-runner-authentication-token", source: `glrt-${J}`, displayRun: V, confidence: "high" },
    { id: "gitlab-oauth-app-secret", source: `gloas-${J}`, displayRun: V, confidence: "high" },
    { id: "gitlab-pipeline-trigger-token", source: `glptt-${J}`, displayRun: V, confidence: "high" },
    { id: "gitlab-kubernetes-agent-token", source: `glagent-${J}`, displayRun: V, confidence: "high" },
    { id: "gitlab-incoming-mail-token", source: `glimt-${J}`, displayRun: V, confidence: "high" },
    { id: "gitlab-scim-oauth-token", source: `glsoat-${J}`, displayRun: V, confidence: "high" },
    { id: "gitlab-ci-build-token", source: `glcbt-${J}`, displayRun: V, confidence: "high" },
    { id: "gitlab-feed-token", source: `glft-${J}`, displayRun: V, confidence: "high" },
    { id: "gitlab-feature-flag-client-token", source: `glffct-${J}`, displayRun: V, confidence: "high" },
    { id: "slack-bot-token", source: "xoxb-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*", confidence: "high" },
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
    { id: "slack-app-token", source: "xapp-\\d-[A-Z0-9]+-\\d+-[a-z0-9]+", flags: "i", confidence: "high" },
    { id: "slack-workflow-token", source: "\\bxwfp-[a-zA-Z0-9-]{20,}", confidence: "high" },
    {
      id: "slack-webhook-url",
      source: "(?:https?://)?hooks\\.slack\\.com/(?:services|workflows|triggers)/[A-Za-z0-9+/_-]{40,}",
      flags: "i",
      confidence: "high",
    },
    { id: "twilio-api-key", source: "SK[0-9a-fA-F]{32}", confidence: "high" },
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
    { id: "pypi-upload-token", source: "pypi-AgEIcHlwaS5vcmc[\\w-]{50,1000}", confidence: "high" },
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
    { id: "shopify-access-token", source: "shpat_[a-fA-F0-9]{32}", confidence: "high" },
    { id: "shopify-shared-secret", source: "shpss_[a-fA-F0-9]{32}", confidence: "high" },
  ],
  fs = 64;
/**
 * 查找 PEM 私钥块（BEGIN … PRIVATE KEY 到 END）。
 */
//@ chunk-cgr0tezp.js:60332-60640 layout
function findPrivateKeyBlock(e, n) {
  let r = /-----BEGIN[ A-Z0-9_-]{0,100}?PRIVATE KEY(?: BLOCK)?-----/gi,
    i = /-----END[ A-Z0-9_-]{0,100}?PRIVATE KEY(?: BLOCK)?-----/gi;
  r.lastIndex = n;
  let match = r.exec(e);
  if (!match) return null;
  i.lastIndex = match.index + match[0].length + fs;
  let match_2 = i.exec(e);
  if (!match_2) return null;
  return { start: match.index, end: match_2.index + match_2[0].length };
}
//@ chunk-cgr0tezp.js:60640-60677 layout
function containsPrivateKey(e) {
  return findPrivateKeyBlock(e, 0) !== null;
}
//@ chunk-cgr0tezp.js:60677-60821 layout = redactSecrets (0.815)
function redactSecrets_2(content) {
  let n = findPemBlocks(content);
  if (n.length === 0) return content;
  let r = "",
    i = 0;
  for (let re of n) ((r += content.slice(i, re.start) + "[REDACTED]"), (i = re.end));
  return r + content.slice(i);
}
/**
 * 文本中是否有 PEM 私钥块。
 */
//@ chunk-cgr0tezp.js:60821-61171 placement
function findPemBlocks(e) {
  let index = e.indexOf("-----");
  while (index !== -1) {
    while (e.charCodeAt(index + 5) === 45) index++;
    if (
      (e.charCodeAt(index + 5) | 32) === 98 &&
      (e.charCodeAt(index + 6) | 32) === 101 &&
      (e.charCodeAt(index + 7) | 32) === 103 &&
      (e.charCodeAt(index + 8) | 32) === 105 &&
      (e.charCodeAt(index + 9) | 32) === 110
    )
      break;
    index = e.indexOf("-----", index + 5);
  }
  let r = [];
  if (index === -1) return r;
  for (let i = findPrivateKeyBlock(e, index); i; i = findPrivateKeyBlock(e, i.end)) r.push(i);
  return r;
}
//@ chunk-cgr0tezp.js:61171-61265 placement
var SECRET_VALUE_TERMINATOR = `(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
  lt = "(?=[^a-zA-Z0-9_\\-+=]|$)",
  Vn = "(?<![a-zA-Z0-9_\\-])";
/**
 * 编译显示用的密钥匹配规则。
 */
//@ chunk-cgr0tezp.js:61265-61632 placement
function compileDisplayRules() {
  return rr.map(
    ({ id: id, confidence: confidence, source: source, flags: flags = "", displayRun: displayRun }) => {
      let o = { id: id, confidence: confidence },
        a = flags.replace("g", "") + "g";
      if (confidence !== "high") return { ...o, re: new RegExp(source, a) };
      let u = stripTrailingDelimiter(source);
      if (displayRun === void 0) return { ...o, re: new RegExp(Vn + u + lt, a) };
      return {
        ...o,
        prefilter: new RegExp(u, flags.replace("g", "")),
        re: new RegExp(`(?<!${displayRun})(?=${displayRun}+${lt})${displayRun}*?${Vn}(${u})${lt}`, a),
      };
    },
  );
}
/**
 * 编译密钥扫描规则（预过滤、置信度）。
 */
//@ chunk-cgr0tezp.js:61632-62061 placement
function compileSecretRules(e) {
  return rr.map((n) => {
    let replaced = (n.flags ?? "").replace("g", ""),
      i = {
        id: n.id,
        confidence: n.confidence,
        ...(n.redactOnly === !0 && { redactOnly: n.redactOnly }),
        ...(n.prefilter !== void 0 && { prefilter: n.prefilter }),
      };
    if (n.run === void 0) return { ...i, re: new RegExp(n.source, e ? replaced + "g" : (n.flags ?? "")) };
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
function stripTrailingDelimiter(e) {
  return e.endsWith(SECRET_VALUE_TERMINATOR) ? e.slice(0, -SECRET_VALUE_TERMINATOR.length) : e;
}
//@ chunk-cgr0tezp.js:62122-62333 placement
function replaceSecretValue(e, n) {
  if (typeof n !== "string") return "[REDACTED]";
  let r = n.length >= 2 && (n[0] === '"' || n[0] === "'") && n.at(-1) === n[0] ? n[0] : "",
    index = e.lastIndexOf(n);
  return `${e.slice(0, index)}${r}[REDACTED]${r}${e.slice(index + n.length)}`;
}
//@ chunk-cgr0tezp.js:62333-62574 placement
function redactMatchKeepPrefix(e) {
  let n = e[1];
  if (typeof n !== "string") return { keep: 0, insert: "[REDACTED]" };
  let r = n.length >= 2 && (n[0] === '"' || n[0] === "'") && n.at(-1) === n[0] ? 1 : 0,
    index = e[0].lastIndexOf(n);
  return { keep: index + r, insert: "[REDACTED]", keepEnd: e[0].length - index - n.length + r };
}
//@ chunk-cgr0tezp.js:62574-62765 placement
function findSecretAssignmentRanges(e) {
  let mapped = collectUrlRedactions(e, as).map(({ start: start, end: end }) => {
      let a = /^(["'])[^]*\1$/.test(e.slice(start, end)) ? 1 : 0;
      return [start + a, end - a];
    }),
    r = findSshUrlUserinfoSpans(e),
    i = findKeyValueSecretRanges(e);
  return r.length === 0 && i.length === 0 ? mapped : mergeRanges([...mapped, ...r, ...i]);
}
//@ chunk-cgr0tezp.js:62765-62801 placement
var ct,
  regExp_12 = new RegExp(nr, "y"),
  ys = 512;
/**
 * 赋值形式（key=value）密钥扫描器。
 */
//@ chunk-cgr0tezp.js:62801-63182 placement
function findKeyValueSecretRanges(e) {
  ct ??= {
    plain: {
      assign: new RegExp(`${ft}|${gt}`, "gi"),
      nextKey: new RegExp(ls, "iy"),
      valueWithWhitespace: new RegExp(`["']|${oe}`, "iy"),
      skipsStrays: !1,
    },
    escaped: {
      assign: new RegExp(`${ft}|${gt}|${tr}`, "gi"),
      nextKey: new RegExp(cs, "iy"),
      valueWithWhitespace: new RegExp(`\\\\*["']|${oe}`, "iy"),
      skipsStrays: !0,
    },
  };
  let n = scanAssignments(e, ct.plain);
  return er.test(e) ? [...n, ...scanAssignments(e, ct.escaped)] : n;
}
/**
 * 扫描 key=value 中的敏感值区间。
 */
//@ chunk-cgr0tezp.js:63182-63767 placement
function scanAssignments(
  e,
  { assign: assign, nextKey: nextKey, valueWithWhitespace: valueWithWhitespace, skipsStrays: skipsStrays },
) {
  let o = [],
    a,
    u = 0,
    c = regExp_12;
  assign.lastIndex = 0;
  for (let match = assign.exec(e); match !== null; match = assign.exec(e)) {
    let d = match[1] ?? match[2] ?? match[3],
      g = match.index + match[0].length,
      y = g - d.length;
    nextKey.lastIndex = y;
    let h = d.length <= ys && nextKey.test(e) ? nextKey.lastIndex : void 0;
    if (h !== void 0 && h < g) {
      if (((valueWithWhitespace.lastIndex = h), !valueWithWhitespace.test(e))) h = void 0;
    }
    if (skipsStrays && a !== void 0 && match.index >= a && match.index < u && h === void 0) {
      ((a = void 0), (assign.lastIndex = u));
      continue;
    }
    if (a !== void 0 && match.index < a) {
      let matches = /^(["'])[^]*\1$/.test(d),
        f = matches && u <= y ? 1 : 0;
      ((c.lastIndex = g), o.push([y + f, !matches && c.test(e) ? c.lastIndex : g - f]));
    }
    if (((u = g), (a = h), a !== void 0)) assign.lastIndex = y;
  }
  return o;
}
//@ chunk-cgr0tezp.js:63767-63945 placement
function mergeRanges(e) {
  let sorted = e.filter(([i, s]) => s > i).sort((i, s) => i[0] - s[0]),
    r = [];
  for (let [i, s] of sorted) {
    let at = r.at(-1);
    if (at !== void 0 && i <= at[1]) at[1] = Math.max(at[1], s);
    else r.push([i, s]);
  }
  return r;
}
/**
 * 按原文位置映射对跟踪文本做遮盖。
 */
//@ chunk-cgr0tezp.js:63945-64293 placement = redactSecrets (0.815)
function redactTrackedRanges(e, n) {
  let { text: text, origin: origin } = e,
    s = [],
    o = 0;
  for (let a = 0; a < text.length;) {
    let u = origin[a];
    while (o < n.length && n[o][1] <= u) o++;
    let c = n[o];
    if (u < 0 || c === void 0 || u < c[0]) {
      a++;
      continue;
    }
    let l = a;
    while (l > 0 && origin[l - 1] < 0) l--;
    while (a < text.length && (origin[a] < 0 || (origin[a] >= c[0] && origin[a] < c[1]))) a++;
    let at = s.at(-1);
    if (at !== void 0 && at[1] >= l) at[1] = a;
    else s.push([l, a, "[REDACTED]"]);
  }
  return applyTextEdits(e, s);
}
//@ chunk-cgr0tezp.js:64293-64311 placement
var Es = 512,
  Ss = 512;
/**
 * 密钥扫描器：按规则表编译测试/脱敏/展示三套正则（带结果缓存），提供 scan、redactContext、redactTokens、redactForDisplay 等。
 */
//@ chunk-cgr0tezp.js:64311-66178 placement
class SecretScanner {
  testRules = null;
  redactRules = null;
  displayRules = null;
  resultCache = new Map();
  scan(e) {
    this.testRules ??= compileSecretRules(!1);
    let n = [];
    for (let testRule of this.testRules)
      if (testRule.confidence === "high" && testRule.prefilter?.test(e) !== !1 && testRule.re.test(e))
        n.push({
          ruleId: testRule.id,
          label: testRule.id
            .split("-")
            .map((i) => ruleIdToLabel[i] ?? capitalize(i))
            .join(" "),
        });
    if (containsPrivateKey(e)) n.push({ ruleId: "private-key", label: "Private Key" });
    return n;
  }
  redactContext(e, n = !1) {
    this.redactRules ??= compileSecretRules(!0);
    let r = redactSecrets_2(e);
    for (let redactRule of this.redactRules)
      if (redactRule.confidence === "low" && ruleApplies(redactRule, n, r))
        r = r.replace(redactRule.re, replaceSecretValue);
    return r;
  }
  redactTokens(e) {
    this.redactRules ??= compileSecretRules(!0);
    let n = e;
    for (let redactRule of this.redactRules)
      if (redactRule.confidence === "high" && redactRule.prefilter?.test(n) !== !1)
        n = n.replace(redactRule.re, replaceSecretValue);
    return n;
  }
  trackedByRules(e, n = !1) {
    return this.trackedTokens(this.trackedContext(e, n));
  }
  trackedContext(e, n = !1) {
    let r = applyTextEdits(
      createOffsetMappedText(e),
      findPemBlocks(e).map(({ start: start, end: end }) => [start, end, "[REDACTED]"]),
    );
    return this.trackedRules(r, "low", n);
  }
  redactOnlyRules(e) {
    this.redactRules ??= compileSecretRules(!0);
    let n = e;
    for (let redactRule of this.redactRules)
      if (redactRule.redactOnly === !0 && ruleApplies(redactRule, !0, n))
        n = n.replace(redactRule.re, replaceSecretValue);
    return n;
  }
  trackedTokens(e) {
    return this.trackedRules(e, "high");
  }
  trackedRules(e, n, r = !1) {
    this.redactRules ??= compileSecretRules(!0);
    let i = e;
    for (let redactRule of this.redactRules)
      if (redactRule.confidence === n && ruleApplies(redactRule, r, i.text))
        ((redactRule.re.lastIndex = 0), (i = redactMatches(i, redactRule.re, redactMatchKeepPrefix)));
    return i;
  }
  redactWithUrlRanges(e) {
    let n = findSecretAssignmentRanges(e);
    return n.length === 0
      ? this.redactTokens(this.redactContext(e, !0))
      : redactTrackedRanges(this.trackedByRules(e, !0), n).text;
  }
  redactTracked(e) {
    return redactTrackedRanges(this.trackedByRules(e, !0), findSecretAssignmentRanges(e));
  }
  redact(e) {
    let n = e.length <= Es;
    if (n) {
      let i = this.resultCache.get(e);
      if (i !== void 0) return i;
    }
    let redactWithUrlRanges = this.redactWithUrlRanges(e);
    if (n) {
      if (this.resultCache.size >= Ss) this.resultCache.delete(this.resultCache.keys().next().value);
      this.resultCache.set(e, redactWithUrlRanges);
    }
    return redactWithUrlRanges;
  }
  redactForDisplay(e) {
    this.displayRules ??= compileDisplayRules();
    let n = e;
    for (let displayRule of this.displayRules) {
      if (displayRule.confidence !== "high" || displayRule.prefilter?.test(n) === !1) continue;
      n = n.replace(displayRule.re, redactUnlessShellLike);
    }
    return n;
  }
}
/**
 * 全局 SecretScanner 单例，所有扫描/脱敏函数都委托给它。
 */
//@ chunk-cgr0tezp.js:66178-66191 placement
var secretScanner = new SecretScanner();
/**
 * 扫描文本中的疑似密钥，返回命中规则列表。
 */
//@ chunk-cgr0tezp.js:66191-66224 placement
function scanForSecrets(e) {
  return secretScanner.scan(e);
}
/**
 * 遮盖文本中的密钥。
 */
//@ chunk-cgr0tezp.js:66224-66258 placement
function redactSecrets(e) {
  return secretScanner.redact(e);
}
/**
 * 先按上下文（key=value 等）再按令牌形状脱敏，替换为 [REDACTED]。
 */
//@ chunk-cgr0tezp.js:66258-66316 placement
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
var regExp_13 = new RegExp(St),
  regExp_14 = new RegExp(St, "g");
/**
 * 截断遮盖的窗口大小。
 */
//@ chunk-cgr0tezp.js:66443-66457 placement
var REDACT_WINDOW_CHARS = 16384;
/**
 * 遮盖后截断到指定长度。
 */
//@ chunk-cgr0tezp.js:66457-66791 placement
function redactAndTruncate(e, n) {
  let r = findSecretAssignmentRanges(e);
  if (r.length === 0) return redactTokensPrefix(secretScanner.redactContext(e, !0), n);
  let trackedContext = secretScanner.trackedContext(e, !0);
  for (let s = n + 2 * REDACT_WINDOW_CHARS; ; s *= 2) {
    if (trackedContext.text.length <= s)
      return redactTrackedRanges(secretScanner.trackedTokens(trackedContext), r).text;
    let trackedTokens = secretScanner.trackedTokens(ot(trackedContext, 0, s)),
      a = trackedTokens.text.length - REDACT_WINDOW_CHARS;
    if (a >= n) {
      let u = truncateToLength(trackedTokens.text, a).length,
        c = redactTrackedRanges(ot(trackedTokens, 0, u), r);
      if (c.text.length >= n) return c.text;
    }
  }
}
//@ chunk-cgr0tezp.js:66791-66834 placement
var SHELL_META_RE = /[$\x60|;&<>()\s]/,
  ks = /[/.@:~*?\\]/;
//@ chunk-cgr0tezp.js:66834-66931 placement
function redactUnlessShellLike(e, n) {
  let r = typeof n === "string" ? n : e;
  if (SHELL_META_RE.test(r) || ks.test(r)) return e;
  return replaceSecretValue(e, n);
}
/**
 * 展示用脱敏（保留可辨识前缀）。
 */
//@ chunk-cgr0tezp.js:66931-66976 placement
function redactSecretsForDisplay(e) {
  return secretScanner.redactForDisplay(e);
}
/**
 * 递归脱敏字符串、数组、对象（含对象键）。
 */
//@ chunk-cgr0tezp.js:66976-67406 placement
function redactSecretsDeep(e, n = redactSecrets) {
  if (typeof e === "string") return n(e);
  if (Array.isArray(e)) return e.map((r) => redactSecretsDeep(r, n));
  if (e !== null && typeof e === "object") {
    let create = Object.create(null),
      entries = Object.entries(e),
      s = n === redactSecrets ? redactObjectKeys(entries.map(([o]) => o)) : void 0;
    for (let [o, [a, u]] of entries.entries()) {
      let c = s ? s[o] : a;
      if (typeof u === "string") {
        if (n === redactSecrets) {
          create[c] = redactKeyedValue(a, u);
          continue;
        }
        let l = `${a}: `,
          d = n(l + u);
        create[c] = d.startsWith(l) ? d.slice(l.length) : n(u);
      } else create[c] = redactSecretsDeep(u, n);
    }
    return create;
  }
  return e;
}
/**
 * 带键名上下文地遮盖值。
 */
//@ chunk-cgr0tezp.js:67406-67875 placement
function redactKeyedValue(e, n) {
  let r = `${e}: `,
    i = r + n,
    s = findSecretAssignmentRanges(i);
  if (s.length === 0) {
    let c = redactSecrets(i);
    if (c.startsWith(r)) return c.slice(r.length);
    let l = redactSecretsInText(i);
    return l.startsWith(r) ? secretScanner.redactOnlyRules(l.slice(r.length)) : redactSecrets(n);
  }
  let o = [];
  for (let [c, l] of s) if (l > r.length) o.push([Math.max(c, r.length), l]);
  let trackedByRules = secretScanner.trackedByRules(i, !0);
  if (trackedByRules.text.startsWith(r)) return redactTrackedRanges(trackedByRules, o).text.slice(r.length);
  let trackedByRules_2 = secretScanner.trackedByRules(i);
  return trackedByRules_2.text.startsWith(r)
    ? secretScanner.redactOnlyRules(redactTrackedRanges(trackedByRules_2, o).text.slice(r.length))
    : redactSecrets(n);
}
//@ chunk-cgr0tezp.js:67875-68132 placement
function redactObjectKeys(e) {
  let mapped = e.map((s) => redactSecrets(s));
  if (mapped.every((s, o) => s === e[o])) return mapped;
  let r = new Set(mapped.filter((s, o) => s === e[o])),
    i = new Map();
  return mapped.map((s, o) => {
    if (s === e[o]) return s;
    let a = s,
      u = i.get(s) ?? 2;
    while (r.has(a)) ((a = `${s} (${u})`), u++);
    return (i.set(s, u), r.add(a), a);
  });
}
//@ chunk-cgr0tezp.js:68132-68247 placement = redactSecrets (0.815)
function redactSecrets_3(content) {
  let create = Object.create(null);
  for (let [r, i] of Object.entries(content)) create[r] = SECRET_KEY_NAME_RE.test(r) ? "[REDACTED]" : i;
  return create;
}
/**
 * 规则 id 片段到展示标签的映射（aws→AWS、jwt→JWT 等）。
 */
//@ chunk-cgr0tezp.js:76919-77194 fingerprint = ruleIdToLabel (0.957)
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
/**
 * 扫描文本中的密钥（规则 id 与标签）。
 */
//@ chunk-jy3v56kg.js:27929-28144 fingerprint = scanForSecrets (0.425)
function scanForSecrets_2(content) {
  let n = content.includes(Je)
      ? uniq([...getSecretScanVariants(content), ...getSecretScanVariants(content.replaceAll(Je, ""))])
      : getSecretScanVariants(content),
    flattened = n.flatMap((r) =>
      scanForSecrets(r).map((a) => (a.ruleId.startsWith("anthropic-") ? qe : a.label)),
    );
  if (n.some((r) => Yn.test(r))) flattened.push(qe);
  return uniq(flattened);
}
//@ chunk-nmregrje.js:1741-1805 fingerprint = ANT_KEY_PFX (0.628)
function ANT_KEY_PFX(e, n, r, s = "api") {
  return isFirstPartyAnthropicHost(e) ? decideGzip(e, Dir(n), r, s) : void 0;
}
//@ chunk-s61vbvea.js:569876-570050 fingerprint = getCompiledRules (0.704)
function getTextAfterLastRuleMatch(e) {
  let n = -1;
  for (let { re: re } of [...GH_PR_ACTIONS, ...GLAB_MR_ACTIONS]) {
    let regExp = new RegExp(re.source, "g");
    for (let match = regExp.exec(e); match; match = regExp.exec(e)) n = Math.max(n, match.index);
  }
  return n < 0 ? void 0 : getPrAction(e.slice(n));
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

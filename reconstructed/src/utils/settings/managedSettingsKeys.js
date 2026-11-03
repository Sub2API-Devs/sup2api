/**
 * utils/settings/managedSettingsKeys.ts
 *
 * 2.1.316 新增：收集托管设置中生效的限制；描述值中的问题字符等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (17)
 * attribution: placement 17
 */
import { withConfusables } from "../sanitization.js";
import {
  isAcceptableRuleText,
  DEFAULTS_PLACEHOLDER,
  hasControlChars,
  hasInvisibleRuleChars,
} from "../permissions/autoModeRulesPrompt.js";
import { RESTRICTIVE_NESTED_SETTINGS } from "./types.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { countCodePoints, normalizeFullWidthSpace } from "../stringUtils.js";
import {
  MANAGED_RESTRICTION_KEYS,
  restrictionValue,
  asArray,
  setAtPath,
  getAtPath,
} from "./managedRestrictionKeys.js";
import { credentialRuleExtractSchema, credentialRuleMaskClaimsSchema } from "./settingsSourceTrust.js";
import { dt } from "../../../vendor/@modelcontextprotocol/client/dist/cfWorkerProvider-l7BFVI5n.mjs";

//@ chunk-dcmhvw5a.js:348365-348414 placement
var MAX_CONFUSABLE_SETTING_LENGTH = 65536;
var regExp_6 = new RegExp(`[${withConfusables("<")}]`, "gu");
//@ chunk-dcmhvw5a.js:348414-348461 placement
function hasNoConfusables(e) {
  return isAcceptableRuleText(e) && e.search(regExp_6) === -1;
}
//@ chunk-dcmhvw5a.js:348461-349059 placement
/**
 * 统计各类权限规则数量。
 */
function summarizePermissionRules(autoMode) {
  let n = {};
  let r = MAX_CONFUSABLE_SETTING_LENGTH;
  let s = 0;
  let a = 0;
  for (let c of RESTRICTIVE_NESTED_SETTINGS.toSorted(
    (g, m) => Number(m === "hard_deny") - Number(g === "hard_deny"),
  )) {
    let g = isPlainObject_2(autoMode) ? autoMode[c] : undefined;
    if (g !== undefined && g !== null && !Array.isArray(g)) s++;
    let m = [DEFAULTS_PLACEHOLDER];
    for (let f of Array.isArray(g) ? g : []) {
      if (typeof f !== "string") {
        s++;
        continue;
      }
      if (["", DEFAULTS_PLACEHOLDER].includes(f.trim())) continue;
      let h = f.length > 2 * r ? 1 / 0 : countCodePoints(f);
      if (h > r) {
        s++;
        continue;
      }
      r -= h;
      let replaced = Array.from(normalizeFullWidthSpace(f), (C) =>
        hasControlChars(C) || hasInvisibleRuleChars(C) ? " " : C,
      )
        .join("")
        .replace(regExp_6, "&lt;");
      if (replaced.trim() === DEFAULTS_PLACEHOLDER) continue;
      let S = countCodePoints(replaced) - h;
      if (!hasNoConfusables(replaced) || S > r) {
        s++;
        continue;
      }
      r -= S;
      m.push(replaced);
      if (replaced !== f) a++;
    }
    if (m.length > 1) n[c] = m;
  }
  return {
    lists: n,
    leftOut: s,
    mended: a,
  };
}
//@ chunk-dcmhvw5a.js:349059-349156 placement
var HOOK_DISABLE_KEYS = new Set(["disableAllHooks"]);
var AWS_PAIR_FIELDS = ["accessKeyIdVar", "secretAccessKeyVar", "sessionTokenVar"];
//@ chunk-dcmhvw5a.js:349156-350801 placement
/**
 * 收集托管设置中生效的限制。
 */
function collectManagedRestrictions(e) {
  let n = {};
  for (let w of MANAGED_RESTRICTION_KEYS()) {
    let { path, restrictive } = w;
    if (HOOK_DISABLE_KEYS.has(path[0])) continue;
    let j = restrictionValue(w, e);
    if ((typeof j === "boolean" || typeof j === "string") && asArray(restrictive).includes(j))
      setAtPath(n, path, j);
  }
  if (getAtPath(e, ["attribution"]) === false) setAtPath(n, ["attribution", "sessionUrl"], false);
  let r = pickDefinedKeys(e.permissions, ["deny", "ask", "disableBypassPermissionsMode", "disableAutoMode"]);
  if (r)
    n.permissions = {
      ...n.permissions,
      ...r,
    };
  for (let w of MANAGED_ONLY_KEYS_2) if (e[w] !== undefined) n[w] = e[w];
  for (let [key, value] of Object.entries(e))
    if (
      ((key.startsWith("disable") && (value === true || value === "disable")) ||
        (key.startsWith("enable") && value === false)) &&
      !HOOK_DISABLE_KEYS.has(key)
    )
      n[key] = value;
  if (e.disableAllHooks === true) n.allowManagedHooksOnly = true;
  if (Array.isArray(e.httpHookAllowedEnvVars) && e.httpHookAllowedEnvVars.length === 0)
    n.httpHookAllowedEnvVars = [];
  let s = pickDefinedKeys(e.sandbox?.filesystem, ["denyRead", "denyWrite", "allowManagedReadPathsOnly"]);
  let a = pickDefinedKeys(e.sandbox?.network, [
    "deniedDomains",
    "strictAllowlist",
    "allowManagedDomainsOnly",
  ]);
  let c = pickDefinedKeys(e.sandbox?.credentials, ["files", "envVars"]) ?? {};
  let awsPairs = e.sandbox?.credentials?.awsPairs;
  let m = isPlainObject_2(awsPairs) && AWS_PAIR_FIELDS.some((w) => w in awsPairs);
  let flattened = (Array.isArray(awsPairs) ? awsPairs : m ? [awsPairs] : []).flatMap((w) =>
    isPlainObject_2(w) ? AWS_PAIR_FIELDS.map((L) => w[L]) : [],
  );
  let y = awsPairs !== undefined && !Array.isArray(awsPairs) && !m;
  let filtered = credentialRuleExtractSchema.filter((w) => y || flattened.includes(w));
  if (filtered.length > 0)
    c.awsPairs = filtered.map((accessKeyIdVar, L) => ({
      accessKeyIdVar,
      secretAccessKeyVar: `${credentialRuleMaskClaimsSchema}${L + 1}_`,
    }));
  let sigv4 = e.sandbox?.credentials?.sigv4;
  if (sigv4) {
    let w = {};
    for (let [key, value] of Object.entries(sigv4)) if (value === "deny") w[key] = "deny";
    if (Object.keys(w).length > 0) c.sigv4 = w;
  }
  let C = Object.keys(c).length > 0;
  if (s || a || C) {
    let sandbox = n.sandbox ?? {};
    n.sandbox = {
      ...sandbox,
      ...(s && {
        filesystem: {
          ...sandbox.filesystem,
          ...s,
        },
      }),
      ...(a && {
        network: {
          ...sandbox.network,
          ...a,
        },
      }),
      ...(C && {
        credentials: {
          ...sandbox.credentials,
          ...c,
        },
      }),
    };
  }
  return Object.keys(n).length > 0 ? n : null;
}
//@ chunk-dcmhvw5a.js:350801-350922 placement
function pickDefinedKeys(e, n) {
  if (!e) return;
  let r = {};
  for (let s of n) if (e[s] !== undefined) r[s] = e[s];
  return Object.keys(r).length > 0 ? r : undefined;
}
//@ chunk-dcmhvw5a.js:350922-351272 placement
/**
 * 只认托管来源的设置键。
 */
var MANAGED_ONLY_KEYS_2 = [
  "allowedMcpServers",
  "deniedMcpServers",
  "allowManagedMcpServersOnly",
  "disabledMcpjsonServers",
  "allowManagedHooksOnly",
  "allowedHttpHookUrls",
  "strictKnownMarketplaces",
  "allowedMarketplaces",
  "blockedMarketplaces",
  "strictPluginOnlyCustomization",
  "availableModels",
  "enforceAvailableModels",
  "availableModelsMatch",
  "deniedModels",
  "allowedProviders",
];
//@ chunk-dcmhvw5a.js:351272-351653 placement
/**
 * CA 证书相关环境变量。
 */
var CA_CERT_ENV_VARS_2 = [
  "SSL_CERT_FILE",
  "NODE_EXTRA_CA_CERTS",
  "REQUESTS_CA_BUNDLE",
  "CURL_CA_BUNDLE",
  "CLOUDSDK_CORE_CUSTOM_CA_CERTS_FILE",
  "HTTPLIB2_CA_CERTS",
];
var CA_CERT_ENV_VARS = [
  "AWS_CA_BUNDLE",
  "DENO_CERT",
  "CARGO_HTTP_CAINFO",
  "PIP_CERT",
  "GIT_SSL_CAINFO",
  "GRPC_DEFAULT_SSL_ROOTS_FILE_PATH",
  "NIX_SSL_CERT_FILE",
  "HEX_CACERTS_PATH",
];
var caCertEnvVars = [...CA_CERT_ENV_VARS_2, ...CA_CERT_ENV_VARS];
var caCertEnvVarList = {
  UV_NATIVE_TLS: "true",
  DENO_TLS_CA_STORE: "system,mozilla",
};
//@ chunk-dcmhvw5a.js:351653-352112 placement
/**
 * 找出值中的换行或不可见字符位置。
 */
function findUnsafeChar(stderr, { maxLength }) {
  let r = firstLineBreakIndex(stderr);
  if (r !== -1)
    return {
      kind: "line_break",
      index: dt(stderr, r),
    };
  for (let j = 0; j < stderr.length; j++) {
    let code = stderr.charCodeAt(j);
    if (code === 0)
      return {
        kind: "nul",
        index: dt(stderr, j),
      };
    if (code === 32 || code === 9)
      return {
        kind: "whitespace",
        index: dt(stderr, j),
      };
    if (code < 32 || code === 127)
      return {
        kind: "control_character",
        index: dt(stderr, j),
        codePoint: code,
      };
    if (code > 126)
      return {
        kind: "non_ascii",
        index: dt(stderr, j),
        codePoint: codePointAtOrUnit(stderr, j),
      };
  }
  let s = countUtf16CodePoints(stderr);
  if (s > maxLength)
    return {
      kind: "too_long",
      length: s,
      maxLength,
    };
  return null;
}
//@ chunk-dcmhvw5a.js:352112-352457 placement
/**
 * 检查值首尾与内部的特殊字符。
 */
function checkValueChars(e) {
  let n = 0;
  let r = e.length;
  while (n < r && isAsciiWhitespaceCode(e.charCodeAt(n))) n++;
  while (r > n && isAsciiWhitespaceCode(e.charCodeAt(r - 1))) r--;
  let s = firstLineBreakIndex(e.slice(n, r));
  if (s !== -1)
    return {
      kind: "line_break",
      index: dt(e, n + s),
    };
  for (let a = n; a < r; a++) {
    let code = e.charCodeAt(a);
    if (code === 0)
      return {
        kind: "nul",
        index: dt(e, a),
      };
    if (code > 255)
      return {
        kind: "non_ascii",
        index: dt(e, a),
        codePoint: codePointAtOrUnit(e, a),
      };
  }
  return null;
}
//@ chunk-dcmhvw5a.js:352629-353285 placement
/**
 * 描述值中的问题字符。
 */
function describeUnsafeValue(e, { length: n, lineCount }) {
  let s = n === 1 ? "1 character" : `${n} characters`;
  let a = lineCount > 1 ? `${s} on ${lineCount} lines` : s;
  switch (e.kind) {
    case "line_break":
      return `it contains a line break at character ${e.index + 1} (${a})`;
    case "nul":
      return `it contains a NUL byte at character ${e.index + 1} (${a})`;
    case "control_character":
      return `it contains a control character at character ${e.index + 1} (${a})`;
    case "whitespace":
      return `it contains whitespace at character ${e.index + 1} (${a})`;
    case "non_ascii":
      return `it contains ${describeCodePoint(e.codePoint) ?? "a non-ASCII character"} at character ${e.index + 1} (${a})`;
    case "too_long":
      return `it is ${e.length} characters long (limit ${e.maxLength})`;
  }
}
//@ chunk-dcmhvw5a.js:353285-353871 placement
/**
 * 描述特殊码点（BOM、零宽字符等）。
 */
function describeCodePoint(codePoint) {
  switch (codePoint) {
    case 65279:
      return "a byte-order mark (U+FEFF)";
    case 8203:
    case 8204:
    case 8205:
    case 8288:
      return `a zero-width character (${unicodeEscapeLabel(codePoint)})`;
    case 160:
    case 8239:
      return `a no-break space (${unicodeEscapeLabel(codePoint)})`;
    case 8216:
    case 8217:
    case 8220:
    case 8221:
      return `a typographic quote (${unicodeEscapeLabel(codePoint)})`;
    case 8211:
    case 8212:
      return `a typographic dash (${unicodeEscapeLabel(codePoint)})`;
    case 8230:
      return "an ellipsis character (U+2026)";
    case 8232:
    case 8233:
      return `a line or paragraph separator (${unicodeEscapeLabel(codePoint)})`;
    case 65533:
      return "a replacement character (U+FFFD)";
    default:
      return codePoint >= 55296 && codePoint <= 57343 ? "an unpaired UTF-16 surrogate" : null;
  }
}
//@ chunk-dcmhvw5a.js:353871-353944 placement
function unicodeEscapeLabel(e) {
  return `U+${e.toString(16).toUpperCase().padStart(4, "0")}`;
}
//@ chunk-dcmhvw5a.js:353944-354047 placement
function firstLineBreakIndex(e) {
  let index = e.indexOf(`
`);
  let index_2 = e.indexOf("\r");
  if (index === -1) return index_2;
  return index_2 === -1 ? index : Math.min(index, index_2);
}
//@ chunk-dcmhvw5a.js:354047-354099 placement
function isAsciiWhitespaceCode(e) {
  return e === 9 || e === 32 || e === 10 || e === 13;
}
//@ chunk-dcmhvw5a.js:354099-354157 placement = needsWidthCompensation (1)
function codePointAtOrUnit(e, n) {
  return e.codePointAt(n) ?? e.charCodeAt(n);
}
//@ chunk-dcmhvw5a.js:354313-354350 placement
function countUtf16CodePoints(e) {
  return dt(e, e.length);
}
export {
  findUnsafeChar,
  describeUnsafeValue,
  countUtf16CodePoints,
  caCertEnvVars,
  caCertEnvVarList,
  CA_CERT_ENV_VARS_2,
  CA_CERT_ENV_VARS,
  checkValueChars,
  collectManagedRestrictions,
  summarizePermissionRules,
};

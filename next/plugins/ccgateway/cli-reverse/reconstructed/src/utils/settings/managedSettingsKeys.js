/**
 * utils/settings/managedSettingsKeys.ts
 *
 * 2.1.316 新增：收集托管设置中生效的限制；描述值中的问题字符等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { AWS_CREDENTIAL_ENV_NAMES, PARENT_PAIR_SUPPRESSOR_SENTINEL } from "./settingsSourceTrust.js";
import { countCodePointsInString } from "../../../vendor/@modelcontextprotocol/client/dist/cfWorkerProvider-l7BFVI5n.mjs";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:346325-346374 placement
var MAX_CONFUSABLE_SETTING_LENGTH; // deferred: uses withConfusables (../sanitization.js) of its import cycle while loading; runs once the cycle is complete
var regExp_6;
deferInit("chunk-z20c443b.js:346325", () => {
  MAX_CONFUSABLE_SETTING_LENGTH = 65536;
  regExp_6 = new RegExp(`[${withConfusables("<")}]`, "gu");
});
//@ chunk-z20c443b.js:346374-346421 placement
function hasNoConfusables(text) {
  return isAcceptableRuleText(text) && text.search(regExp_6) === -1;
}
//@ chunk-z20c443b.js:346421-347019 placement
/**
 * 统计各类权限规则数量。
 */
function summarizePermissionRules(autoMode) {
  let lists = {};
  let budget = MAX_CONFUSABLE_SETTING_LENGTH;
  let leftOut = 0;
  let mended = 0;
  for (let key of RESTRICTIVE_NESTED_SETTINGS.toSorted(
    (a, b) => Number(b === "hard_deny") - Number(a === "hard_deny"),
  )) {
    let value = isPlainObject_2(autoMode) ? autoMode[key] : undefined;
    if (value !== undefined && value !== null && !Array.isArray(value)) leftOut++;
    let entries = [DEFAULTS_PLACEHOLDER];
    for (let rule of Array.isArray(value) ? value : []) {
      if (typeof rule !== "string") {
        leftOut++;
        continue;
      }
      if (["", DEFAULTS_PLACEHOLDER].includes(rule.trim())) continue;
      let cost = rule.length > 2 * budget ? 1 / 0 : countCodePoints(rule);
      if (cost > budget) {
        leftOut++;
        continue;
      }
      budget -= cost;
      let text = Array.from(normalizeFullWidthSpace(rule), (char) =>
        hasControlChars(char) || hasInvisibleRuleChars(char) ? " " : char,
      )
        .join("")
        .replace(regExp_6, "&lt;");
      if (text.trim() === DEFAULTS_PLACEHOLDER) continue;
      let extra = countCodePoints(text) - cost;
      if (!hasNoConfusables(text) || extra > budget) {
        leftOut++;
        continue;
      }
      budget -= extra;
      entries.push(text);
      if (text !== rule) mended++;
    }
    if (entries.length > 1) lists[key] = entries;
  }
  return {
    lists,
    leftOut,
    mended,
  };
}
//@ chunk-z20c443b.js:347019-347136 placement
var HOOK_DISABLE_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var AWS_PAIR_FIELDS;
deferInit("chunk-z20c443b.js:347019", () => {
  HOOK_DISABLE_KEYS = new Set(["disableAllHooks", "disableReplyCheck"]);
  AWS_PAIR_FIELDS = ["accessKeyIdVar", "secretAccessKeyVar", "sessionTokenVar"];
});
//@ chunk-z20c443b.js:347136-348781 placement
/**
 * 收集托管设置中生效的限制。
 */
function collectManagedRestrictions(doc) {
  let out = {};
  for (let def of MANAGED_RESTRICTION_KEYS()) {
    let { path, restrictive } = def;
    if (HOOK_DISABLE_KEYS.has(path[0])) continue;
    let value = restrictionValue(def, doc);
    if ((typeof value === "boolean" || typeof value === "string") && asArray(restrictive).includes(value))
      setAtPath(out, path, value);
  }
  if (getAtPath(doc, ["attribution"]) === false) setAtPath(out, ["attribution", "sessionUrl"], false);
  let permissionKeys = pickDefinedKeys(doc.permissions, [
    "deny",
    "ask",
    "disableBypassPermissionsMode",
    "disableAutoMode",
  ]);
  if (permissionKeys)
    out.permissions = {
      ...out.permissions,
      ...permissionKeys,
    };
  for (let key of MANAGED_ONLY_KEYS_2) if (doc[key] !== undefined) out[key] = doc[key];
  for (let [key, value] of Object.entries(doc))
    if (
      ((key.startsWith("disable") && (value === true || value === "disable")) ||
        (key.startsWith("enable") && value === false)) &&
      !HOOK_DISABLE_KEYS.has(key)
    )
      out[key] = value;
  if (doc.disableAllHooks === true) out.allowManagedHooksOnly = true;
  if (Array.isArray(doc.httpHookAllowedEnvVars) && doc.httpHookAllowedEnvVars.length === 0)
    out.httpHookAllowedEnvVars = [];
  let fs = pickDefinedKeys(doc.sandbox?.filesystem, ["denyRead", "denyWrite", "allowManagedReadPathsOnly"]);
  let net = pickDefinedKeys(doc.sandbox?.network, [
    "deniedDomains",
    "strictAllowlist",
    "allowManagedDomainsOnly",
  ]);
  let creds = pickDefinedKeys(doc.sandbox?.credentials, ["files", "envVars"]) ?? {};
  let awsPairs = doc.sandbox?.credentials?.awsPairs;
  let pairObject = isPlainObject_2(awsPairs) && AWS_PAIR_FIELDS.some((field) => field in awsPairs);
  let flattened = (Array.isArray(awsPairs) ? awsPairs : pairObject ? [awsPairs] : []).flatMap((pair) =>
    isPlainObject_2(pair) ? AWS_PAIR_FIELDS.map((field) => pair[field]) : [],
  );
  let obsoleteShape = awsPairs !== undefined && !Array.isArray(awsPairs) && !pairObject;
  let filtered = AWS_CREDENTIAL_ENV_NAMES.filter((varName) => obsoleteShape || flattened.includes(varName));
  if (filtered.length > 0)
    creds.awsPairs = filtered.map((accessKeyIdVar, index) => ({
      accessKeyIdVar,
      secretAccessKeyVar: `${PARENT_PAIR_SUPPRESSOR_SENTINEL}${index + 1}_`,
    }));
  let sigv4 = doc.sandbox?.credentials?.sigv4;
  if (sigv4) {
    let kept = {};
    for (let [key, value] of Object.entries(sigv4)) if (value === "deny") kept[key] = "deny";
    if (Object.keys(kept).length > 0) creds.sigv4 = kept;
  }
  let hasCredentials = Object.keys(creds).length > 0;
  if (fs || net || hasCredentials) {
    let sandbox = out.sandbox ?? {};
    out.sandbox = {
      ...sandbox,
      ...(fs && {
        filesystem: {
          ...sandbox.filesystem,
          ...fs,
        },
      }),
      ...(net && {
        network: {
          ...sandbox.network,
          ...net,
        },
      }),
      ...(hasCredentials && {
        credentials: {
          ...sandbox.credentials,
          ...creds,
        },
      }),
    };
  }
  return Object.keys(out).length > 0 ? out : null;
}
//@ chunk-z20c443b.js:348781-348902 placement
function pickDefinedKeys(doc, keys) {
  if (!doc) return;
  let out = {};
  for (let key of keys) if (doc[key] !== undefined) out[key] = doc[key];
  return Object.keys(out).length > 0 ? out : undefined;
}
//@ chunk-z20c443b.js:348902-349252 placement
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
//@ chunk-z20c443b.js:349252-349633 placement
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
//@ chunk-z20c443b.js:349633-350092 placement
/**
 * 找出值中的换行或不可见字符位置。
 */
function findUnsafeChar(text, { maxLength }) {
  let index = firstLineBreakIndex(text);
  if (index !== -1)
    return {
      kind: "line_break",
      index: countCodePointsInString(text, index),
    };
  for (let j = 0; j < text.length; j++) {
    let code = text.charCodeAt(j);
    if (code === 0)
      return {
        kind: "nul",
        index: countCodePointsInString(text, j),
      };
    if (code === 32 || code === 9)
      return {
        kind: "whitespace",
        index: countCodePointsInString(text, j),
      };
    if (code < 32 || code === 127)
      return {
        kind: "control_character",
        index: countCodePointsInString(text, j),
        codePoint: code,
      };
    if (code > 126)
      return {
        kind: "non_ascii",
        index: countCodePointsInString(text, j),
        codePoint: codePointAtOrUnit(text, j),
      };
  }
  let length = countUtf16CodePoints(text);
  if (length > maxLength)
    return {
      kind: "too_long",
      length,
      maxLength,
    };
  return null;
}
//@ chunk-z20c443b.js:350092-350437 placement
/**
 * 检查值首尾与内部的特殊字符。
 */
function checkValueChars(text) {
  let start = 0;
  let end = text.length;
  while (start < end && isAsciiWhitespaceCode(text.charCodeAt(start))) start++;
  while (end > start && isAsciiWhitespaceCode(text.charCodeAt(end - 1))) end--;
  let index = firstLineBreakIndex(text.slice(start, end));
  if (index !== -1)
    return {
      kind: "line_break",
      index: countCodePointsInString(text, start + index),
    };
  for (let index = start; index < end; index++) {
    let code = text.charCodeAt(index);
    if (code === 0)
      return {
        kind: "nul",
        index: countCodePointsInString(text, index),
      };
    if (code > 255)
      return {
        kind: "non_ascii",
        index: countCodePointsInString(text, index),
        codePoint: codePointAtOrUnit(text, index),
      };
  }
  return null;
}
//@ chunk-z20c443b.js:350609-351265 placement
/**
 * 描述值中的问题字符。
 */
function describeUnsafeValue(found, { length, lineCount }) {
  let sizeText = length === 1 ? "1 character" : `${length} characters`;
  let detail = lineCount > 1 ? `${sizeText} on ${lineCount} lines` : sizeText;
  switch (found.kind) {
    case "line_break":
      return `it contains a line break at character ${found.index + 1} (${detail})`;
    case "nul":
      return `it contains a NUL byte at character ${found.index + 1} (${detail})`;
    case "control_character":
      return `it contains a control character at character ${found.index + 1} (${detail})`;
    case "whitespace":
      return `it contains whitespace at character ${found.index + 1} (${detail})`;
    case "non_ascii":
      return `it contains ${describeCodePoint(found.codePoint) ?? "a non-ASCII character"} at character ${found.index + 1} (${detail})`;
    case "too_long":
      return `it is ${found.length} characters long (limit ${found.maxLength})`;
  }
}
//@ chunk-z20c443b.js:351265-351851 placement
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
//@ chunk-z20c443b.js:351851-351924 placement
function unicodeEscapeLabel(code) {
  return `U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
}
//@ chunk-z20c443b.js:351924-352027 placement
function firstLineBreakIndex(text) {
  let index = text.indexOf(`
`);
  let index_2 = text.indexOf("\r");
  if (index === -1) return index_2;
  return index_2 === -1 ? index : Math.min(index, index_2);
}
//@ chunk-z20c443b.js:352027-352079 placement
function isAsciiWhitespaceCode(code) {
  return code === 9 || code === 32 || code === 10 || code === 13;
}
//@ chunk-z20c443b.js:352079-352137 placement (2.1.88 match: needsWidthCompensation, 1)
function codePointAtOrUnit(text, index) {
  return text.codePointAt(index) ?? text.charCodeAt(index);
}
//@ chunk-z20c443b.js:352293-352330 placement
function countUtf16CodePoints(text) {
  return countCodePointsInString(text, text.length);
}
export {
  caCertEnvVars,
  caCertEnvVarList,
  countUtf16CodePoints,
  findUnsafeChar,
  describeUnsafeValue,
  CA_CERT_ENV_VARS_2,
  CA_CERT_ENV_VARS,
  collectManagedRestrictions,
  checkValueChars,
  summarizePermissionRules,
};

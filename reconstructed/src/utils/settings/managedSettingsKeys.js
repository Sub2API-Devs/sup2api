/**
 * utils/settings/managedSettingsKeys.ts
 *
 * 2.1.316 新增：收集托管设置中生效的限制；描述值中的问题字符等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (16)
 * attribution: placement 16
 */
import { withConfusables } from "../sanitization.js";
import { Xr, DEFAULTS_PLACEHOLDER, hasControlChars, oct } from "../permissions/autoModeRulesPrompt.js";
import { Bt } from "./types.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { countCodePoints, normalizeFullWidthSpace } from "../stringUtils.js";
import {
  MANAGED_RESTRICTION_KEYS,
  restrictionValue,
  JOe,
  setAtPath,
  getAtPath,
} from "./managedRestrictionKeys.js";
import { V3e, sn } from "./settingsSourceTrust.js";
import { dt } from "../../../vendor/@modelcontextprotocol/client/dist/cfWorkerProvider-l7BFVI5n.mjs";
import { ou } from "../../_unattributed/chunk-dcmhvw5a/part-001.js";

//@ chunk-dcmhvw5a.js:348365-348414 placement
var AE = 65536,
  regExp_6 = new RegExp(`[${withConfusables("<")}]`, "gu");
//@ chunk-dcmhvw5a.js:348414-348461 placement
function kE(e) {
  return Xr(e) && e.search(regExp_6) === -1;
}
/**
 * 统计各类权限规则数量。
 */
//@ chunk-dcmhvw5a.js:348461-349059 placement
function summarizePermissionRules(e) {
  let n = {},
    r = AE,
    s = 0,
    a = 0;
  for (let c of Bt.toSorted((g, m) => Number(m === "hard_deny") - Number(g === "hard_deny"))) {
    let g = isPlainObject_2(e) ? e[c] : void 0;
    if (g !== void 0 && g !== null && !Array.isArray(g)) s++;
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
      let replaced = Array.from(normalizeFullWidthSpace(f), (C) => (hasControlChars(C) || oct(C) ? " " : C))
        .join("")
        .replace(regExp_6, "&lt;");
      if (replaced.trim() === DEFAULTS_PLACEHOLDER) continue;
      let S = countCodePoints(replaced) - h;
      if (!kE(replaced) || S > r) {
        s++;
        continue;
      }
      if (((r -= S), m.push(replaced), replaced !== f)) a++;
    }
    if (m.length > 1) n[c] = m;
  }
  return { lists: n, leftOut: s, mended: a };
}
//@ chunk-dcmhvw5a.js:349059-349156 placement
var Zc = new Set(["disableAllHooks"]),
  Qc = ["accessKeyIdVar", "secretAccessKeyVar", "sessionTokenVar"];
/**
 * 收集托管设置中生效的限制。
 */
//@ chunk-dcmhvw5a.js:349156-350801 placement
function collectManagedRestrictions(e) {
  let n = {};
  for (let w of MANAGED_RESTRICTION_KEYS()) {
    let { path: path, restrictive: restrictive } = w;
    if (Zc.has(path[0])) continue;
    let j = restrictionValue(w, e);
    if ((typeof j === "boolean" || typeof j === "string") && JOe(restrictive).includes(j))
      setAtPath(n, path, j);
  }
  if (getAtPath(e, ["attribution"]) === !1) setAtPath(n, ["attribution", "sessionUrl"], !1);
  let r = pickDefinedKeys(e.permissions, ["deny", "ask", "disableBypassPermissionsMode", "disableAutoMode"]);
  if (r) n.permissions = { ...n.permissions, ...r };
  for (let w of MANAGED_ONLY_KEYS_2) if (e[w] !== void 0) n[w] = e[w];
  for (let [w, L] of Object.entries(e))
    if (
      ((w.startsWith("disable") && (L === !0 || L === "disable")) || (w.startsWith("enable") && L === !1)) &&
      !Zc.has(w)
    )
      n[w] = L;
  if (e.disableAllHooks === !0) n.allowManagedHooksOnly = !0;
  if (Array.isArray(e.httpHookAllowedEnvVars) && e.httpHookAllowedEnvVars.length === 0)
    n.httpHookAllowedEnvVars = [];
  let s = pickDefinedKeys(e.sandbox?.filesystem, ["denyRead", "denyWrite", "allowManagedReadPathsOnly"]),
    a = pickDefinedKeys(e.sandbox?.network, ["deniedDomains", "strictAllowlist", "allowManagedDomainsOnly"]),
    c = pickDefinedKeys(e.sandbox?.credentials, ["files", "envVars"]) ?? {},
    g = e.sandbox?.credentials?.awsPairs,
    m = isPlainObject_2(g) && Qc.some((w) => w in g),
    flattened = (Array.isArray(g) ? g : m ? [g] : []).flatMap((w) =>
      isPlainObject_2(w) ? Qc.map((L) => w[L]) : [],
    ),
    y = g !== void 0 && !Array.isArray(g) && !m,
    filtered = V3e.filter((w) => y || flattened.includes(w));
  if (filtered.length > 0)
    c.awsPairs = filtered.map((w, L) => ({ accessKeyIdVar: w, secretAccessKeyVar: `${sn}${L + 1}_` }));
  let S = e.sandbox?.credentials?.sigv4;
  if (S) {
    let w = {};
    for (let [L, v] of Object.entries(S)) if (v === "deny") w[L] = "deny";
    if (Object.keys(w).length > 0) c.sigv4 = w;
  }
  let C = Object.keys(c).length > 0;
  if (s || a || C) {
    let w = n.sandbox ?? {};
    n.sandbox = {
      ...w,
      ...(s && { filesystem: { ...w.filesystem, ...s } }),
      ...(a && { network: { ...w.network, ...a } }),
      ...(C && { credentials: { ...w.credentials, ...c } }),
    };
  }
  return Object.keys(n).length > 0 ? n : null;
}
//@ chunk-dcmhvw5a.js:350801-350922 placement
function pickDefinedKeys(e, n) {
  if (!e) return;
  let r = {};
  for (let s of n) if (e[s] !== void 0) r[s] = e[s];
  return Object.keys(r).length > 0 ? r : void 0;
}
/**
 * 只认托管来源的设置键。
 */
//@ chunk-dcmhvw5a.js:350922-351272 placement
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
/**
 * CA 证书相关环境变量。
 */
//@ chunk-dcmhvw5a.js:351272-351653 placement
var CA_CERT_ENV_VARS = [
    "SSL_CERT_FILE",
    "NODE_EXTRA_CA_CERTS",
    "REQUESTS_CA_BUNDLE",
    "CURL_CA_BUNDLE",
    "CLOUDSDK_CORE_CUSTOM_CA_CERTS_FILE",
    "HTTPLIB2_CA_CERTS",
  ],
  q_r = [
    "AWS_CA_BUNDLE",
    "DENO_CERT",
    "CARGO_HTTP_CAINFO",
    "PIP_CERT",
    "GIT_SSL_CAINFO",
    "GRPC_DEFAULT_SSL_ROOTS_FILE_PATH",
    "NIX_SSL_CERT_FILE",
    "HEX_CACERTS_PATH",
  ],
  Gle = [...CA_CERT_ENV_VARS, ...q_r],
  wve = { UV_NATIVE_TLS: "true", DENO_TLS_CA_STORE: "system,mozilla" };
/**
 * 找出值中的换行或不可见字符位置。
 */
//@ chunk-dcmhvw5a.js:351653-352112 placement
function findUnsafeChar(e, { maxLength: maxLength }) {
  let r = firstLineBreakIndex(e);
  if (r !== -1) return { kind: "line_break", index: dt(e, r) };
  for (let a = 0; a < e.length; a++) {
    let code = e.charCodeAt(a);
    if (code === 0) return { kind: "nul", index: dt(e, a) };
    if (code === 32 || code === 9) return { kind: "whitespace", index: dt(e, a) };
    if (code < 32 || code === 127) return { kind: "control_character", index: dt(e, a), codePoint: code };
    if (code > 126) return { kind: "non_ascii", index: dt(e, a), codePoint: codePointAtOrUnit(e, a) };
  }
  let s = ou(e);
  if (s > maxLength) return { kind: "too_long", length: s, maxLength: maxLength };
  return null;
}
/**
 * 检查值首尾与内部的特殊字符。
 */
//@ chunk-dcmhvw5a.js:352112-352457 placement
function checkValueChars(e) {
  let n = 0,
    r = e.length;
  while (n < r && eu(e.charCodeAt(n))) n++;
  while (r > n && eu(e.charCodeAt(r - 1))) r--;
  let s = firstLineBreakIndex(e.slice(n, r));
  if (s !== -1) return { kind: "line_break", index: dt(e, n + s) };
  for (let a = n; a < r; a++) {
    let code = e.charCodeAt(a);
    if (code === 0) return { kind: "nul", index: dt(e, a) };
    if (code > 255) return { kind: "non_ascii", index: dt(e, a), codePoint: codePointAtOrUnit(e, a) };
  }
  return null;
}
/**
 * 描述值中的问题字符。
 */
//@ chunk-dcmhvw5a.js:352629-353285 placement
function describeUnsafeValue(e, { length: n, lineCount: lineCount }) {
  let s = n === 1 ? "1 character" : `${n} characters`,
    a = lineCount > 1 ? `${s} on ${lineCount} lines` : s;
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
/**
 * 描述特殊码点（BOM、零宽字符等）。
 */
//@ chunk-dcmhvw5a.js:353285-353871 placement
function describeCodePoint(e) {
  switch (e) {
    case 65279:
      return "a byte-order mark (U+FEFF)";
    case 8203:
    case 8204:
    case 8205:
    case 8288:
      return `a zero-width character (${hn(e)})`;
    case 160:
    case 8239:
      return `a no-break space (${hn(e)})`;
    case 8216:
    case 8217:
    case 8220:
    case 8221:
      return `a typographic quote (${hn(e)})`;
    case 8211:
    case 8212:
      return `a typographic dash (${hn(e)})`;
    case 8230:
      return "an ellipsis character (U+2026)";
    case 8232:
    case 8233:
      return `a line or paragraph separator (${hn(e)})`;
    case 65533:
      return "a replacement character (U+FFFD)";
    default:
      return e >= 55296 && e <= 57343 ? "an unpaired UTF-16 surrogate" : null;
  }
}
//@ chunk-dcmhvw5a.js:353871-353944 placement
function hn(e) {
  return `U+${e.toString(16).toUpperCase().padStart(4, "0")}`;
}
//@ chunk-dcmhvw5a.js:353944-354047 placement
function firstLineBreakIndex(e) {
  let index = e.indexOf(`
`),
    index_2 = e.indexOf("\r");
  if (index === -1) return index_2;
  return index_2 === -1 ? index : Math.min(index, index_2);
}
//@ chunk-dcmhvw5a.js:354047-354099 placement
function eu(e) {
  return e === 9 || e === 32 || e === 10 || e === 13;
}
//@ chunk-dcmhvw5a.js:354099-354157 placement = needsWidthCompensation (1)
function codePointAtOrUnit(e, n) {
  return e.codePointAt(n) ?? e.charCodeAt(n);
}

export {
  findUnsafeChar,
  describeUnsafeValue,
  checkValueChars,
  Gle,
  wve,
  CA_CERT_ENV_VARS,
  q_r,
  collectManagedRestrictions,
  summarizePermissionRules,
};

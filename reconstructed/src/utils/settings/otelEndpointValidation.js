/**
 * utils/settings/otelEndpointValidation.ts
 *
 * 2.1.316 新增：校验 shell helper 设置；描述 helper 设置位置等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (21)
 * attribution: placement 21
 */
import { fbs, QDn, displaySafeUrl, REDACTED_URL } from "../redaction/urlRedaction.js";
import { safeParseJSON } from "../json.js";
import {
  isInlineScriptHelper,
  Nu,
  riskyPayloadSlots,
  ENHANCED_TELEMETRY_VARS,
  OTLP_ANY_ENDPOINT_RE,
  Pu,
  escapeNonPrintable,
  parseHeadersHelperCommand,
} from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { plural } from "../stringUtils.js";
import { jsonStringify } from "../slowOperations.js";
import { isEnvTruthy } from "../envUtils.js";
import { SETTING_ALIASES } from "./marketplaceSettingsAliases.js";

//@ chunk-dcmhvw5a.js:388586-388597 placement
var gC = 120;
//@ chunk-dcmhvw5a.js:388597-388834 placement
function sanitizeEndpointUrl(e) {
  if (/[\\\s\x00-\x1f\x7f]/.test(e)) return;
  let n;
  try {
    n = new URL(e);
  } catch {
    return;
  }
  if ((n.protocol !== "http:" && n.protocol !== "https:") || !n.host) return;
  if (fbs.test(n.pathname)) return;
  let r = QDn(e);
  return r !== null && r.length <= gC ? r : void 0;
}
//@ chunk-dcmhvw5a.js:388834-389022 placement
var SCHEME_PREFIX_PATTERN = /^\w{1,8}:\/\//,
  GRPC_RESOLVER_SCHEMES = new Set(["dns", "unix", "ipv4", "ipv6"]),
  KNOWN_URL_SCHEMES = new Set([
    ...GRPC_RESOLVER_SCHEMES,
    "http",
    "https",
    "ws",
    "wss",
    "ftp",
    "file",
    "grpc",
    "grpcs",
    "otlp",
    "xds",
    "tcp",
    "udp",
    "tls",
    "h2",
    "h2c",
    "http2",
  ]);
//@ chunk-dcmhvw5a.js:389022-389265 placement
function endpointHostForDisplay(e) {
  let n = Io(`https://${e}`);
  if (SCHEME_PREFIX_PATTERN.test(e)) {
    let r = Io(e);
    return r && r.port !== "" && GRPC_RESOLVER_SCHEMES.has(r.hostname) ? void 0 : sanitizeEndpointUrl(e);
  }
  if (Io(e)?.host) return n === null ? sanitizeEndpointUrl(e) : void 0;
  return n && !KNOWN_URL_SCHEMES.has(_C(n.hostname)) && sanitizeEndpointUrl(`https://${e}`) !== void 0
    ? n.host
    : void 0;
}
//@ chunk-dcmhvw5a.js:389265-389343 placement
function _C(e) {
  let n = e.length;
  while (n > 0 && e[n - 1] === ".") n--;
  return e.slice(0, n);
}
//@ chunk-dcmhvw5a.js:389343-389399 placement
function Io(e) {
  try {
    return new URL(e);
  } catch {
    return null;
  }
}
//@ chunk-dcmhvw5a.js:389399-389458 placement
var yC = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/,
  bu = 64,
  bC = 160,
  EC = 400;
//@ chunk-dcmhvw5a.js:389458-389489 placement
function CC(e) {
  return zu(e, bC);
}
//@ chunk-dcmhvw5a.js:389489-389520 placement
function Ts(e) {
  return zu(e, EC);
}
//@ chunk-dcmhvw5a.js:389520-389615 placement
function zu(e, n) {
  return e.length <= n ? e : `${e.slice(0, n)}\u2026 (+${e.length - n} chars NOT SHOWN)`;
}
//@ chunk-dcmhvw5a.js:389615-389716 placement
function maskEnvName(e) {
  let replaced = e.replace(/[^A-Za-z0-9_]+/g, "?");
  return replaced.length <= bu ? replaced : `${replaced.slice(0, bu)}\u2026`;
}
//@ chunk-dcmhvw5a.js:389716-389746 placement
var AC = 256,
  Eu = 180,
  Cu = 60,
  Ku = 32;
/**
 * 非 ASCII 替换为 ?。
 */
//@ chunk-dcmhvw5a.js:389746-389801 placement
function asciiOnly(e) {
  return e.replace(/[^\x20-\x7e]/gu, "?");
}
/**
 * 解析 helper 设置值。
 */
//@ chunk-dcmhvw5a.js:389801-390244 placement
function parseHelperSetting(e, n) {
  let r = safeParseJSON(e, !1);
  if (!Array.isArray(r)) return;
  let [s, a, c] = r,
    g;
  if (typeof s === "string" && s) g = quoteHelperSetting(s);
  else if (isInlineScriptHelper(s)) {
    let f = n ? ` (${n.bytes} ${plural(n.bytes, "byte")}, ${n.lines} ${plural(n.lines, "line")})` : "";
    g = `script for ${s.interpreter}${f} sha256:${s.script.slice(0, Ku)}`;
  } else return;
  let m = [];
  for (let [f, h] of [
    ["timeout", a],
    ["refresh", c],
  ])
    if (h != null) m.push(`${f} ${typeof h === "number" ? `${h}ms` : "?"}`);
  return m.length ? `${g} (${m.join(", ")})` : g;
}
//@ chunk-dcmhvw5a.js:390244-390456 placement
function quoteHelperSetting(e) {
  let n = asciiOnly(e),
    r = n.length > AC,
    s;
  if (!r) s = jsonStringify(n);
  else {
    let a = n.length - Eu - Cu;
    s = jsonStringify(`${n.slice(0, Eu)}\u2026(${a} chars omitted)\u2026${n.slice(-Cu)}`);
  }
  if (r || n !== e) s = `${s} sha256:${Nu(e).slice(0, Ku)}`;
  return s;
}
//@ chunk-dcmhvw5a.js:390456-390627 placement
function describeEnvRows(e) {
  let mapped = Object.entries(e.envVars).map(([r, s]) => describeEnvVar(r, s, ""));
  for (let [r, s] of riskyPayloadSlots(e))
    for (let [a, c] of Object.entries(s.envVars)) mapped.push(describeEnvVar(a, c, `${r}.env.`));
  return mapped;
}
//@ chunk-dcmhvw5a.js:390627-390910 placement
function describeEnvVar(e, n, r) {
  if (!yC.test(e)) return { key: e, text: `${r}${maskEnvName(e)}` };
  if (ENHANCED_TELEMETRY_VARS.has(e) && isEnvTruthy(n))
    return { key: e, text: `${r}${e} (adds traces to the telemetry export)`, tracesSwitch: !0 };
  let s = OTLP_ANY_ENDPOINT_RE.test(e.toUpperCase()) ? endpointHostForDisplay(n) : sanitizeEndpointUrl(n);
  return s ? { key: e, text: `${r}${e}=${s}`, url: s } : { key: e, text: `${r}${e}` };
}
/**
 * 取出 shell helper 设置校验结果中给安全对话框展示的各组行（命令、沙箱、隔离、环境变量、类别）。
 */
//@ chunk-dcmhvw5a.js:390910-391083 placement
function shellHelperRows(e) {
  let {
    commandRows: commandRows,
    sandboxRows: sandboxRows,
    isolationRows: isolationRows,
    envRows: envRows,
    categoryRows: categoryRows,
  } = validateShellHelperSettings(e);
  return {
    commandRows: commandRows,
    sandboxRows: sandboxRows,
    isolationRows: isolationRows,
    envRows: envRows,
    categoryRows: categoryRows,
  };
}
/**
 * 校验 shell helper 设置。
 */
//@ chunk-dcmhvw5a.js:391083-391798 placement
function validateShellHelperSettings(e) {
  let n = [];
  for (let [g, m] of Object.entries(e.shellSettings)) {
    if (m === void 0) continue;
    if (Pu(g)) {
      let f = parseHelperSetting(m, e.inlineHelperScriptSizes?.[g]);
      n.push(f ? `${g}=${f}` : g);
      continue;
    }
    n.push(describeHelperSettingPath(g, m, ""));
  }
  for (let [g, m] of riskyPayloadSlots(e))
    for (let [f, h] of Object.entries(m.shellSettings)) {
      if (h === void 0) continue;
      n.push(describeHelperSettingPath(f, h, `${g}.`));
    }
  let keys = Object.keys(e.sandboxSettings);
  for (let [g, m] of riskyPayloadSlots(e))
    for (let f of Object.keys(m.sandboxSettings)) keys.push(`${g}.${f}`);
  let keys_2 = Object.keys(e.isolationSettings);
  for (let [g, m] of riskyPayloadSlots(e))
    for (let f of Object.keys(m.isolationSettings)) keys_2.push(`${g}.${f}`);
  let a = [];
  for (let g of describeEnvRows(e)) a.push(g.text);
  let c = e.hasHooks ? ["hooks"] : [];
  return { commandRows: n, sandboxRows: keys, isolationRows: keys_2, envRows: a, categoryRows: c };
}
/**
 * 描述 helper 设置位置。
 */
//@ chunk-dcmhvw5a.js:391798-392265 placement
function describeHelperSettingPath(e, n, r) {
  let s = CC(escapeNonPrintable(`${r}${e}`).text);
  if (e.startsWith("extraKnownMarketplaces[")) {
    if (e.endsWith(".headersHelper")) {
      let a = parseHeadersHelperCommand(n);
      if (a !== void 0) {
        let c = a.url === void 0 ? null : (displaySafeUrl(a.url) ?? (Io(a.url)?.host ? REDACTED_URL : null));
        return `${s}: ${Ts(escapeNonPrintable(a.command).text)}${c === null ? "" : ` \u2192 ${Ts(escapeNonPrintable(c).text)}`}`;
      }
    } else if (e.endsWith(".pluginDigests")) return `${s}: code from your organization will run`;
    else if (e.endsWith(".source.command")) return `${s}: ${Ts(escapeNonPrintable(n).text)}`;
  }
  return s;
}
//@ chunk-dcmhvw5a.js:392265-392501 placement
function extraMarketplacesOf(e) {
  let extraKnownMarketplaces = e.extraKnownMarketplaces;
  if (extraKnownMarketplaces !== void 0 && extraKnownMarketplaces !== null) return extraKnownMarketplaces;
  let r = e;
  for (let { alias: alias, canonical: canonical } of SETTING_ALIASES) {
    if (canonical !== "extraKnownMarketplaces") continue;
    let c = r[alias];
    if (c !== void 0 && c !== null && typeof c === "object") return c;
  }
  return;
}

export { shellHelperRows, asciiOnly, extraMarketplacesOf, describeEnvRows, parseHelperSetting };

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
import {
  URL_AUTHORITY_ESCAPE_RE,
  safeOriginUrlRedacted,
  displaySafeUrl,
  REDACTED_URL,
} from "../redaction/urlRedaction.js";
import { safeParseJSON } from "../json.js";
import {
  isInlineScriptHelper,
  normalizePathText,
  riskyPayloadSlots,
  ENHANCED_TELEMETRY_VARS,
  OTLP_ANY_ENDPOINT_RE,
  isPolicyHelperName,
  escapeNonPrintable,
  parseHeadersHelperCommand,
} from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { plural } from "../stringUtils.js";
import { jsonStringify } from "../slowOperations.js";
import { isEnvTruthy } from "../envUtils.js";
import { SETTING_ALIASES } from "./marketplaceSettingsAliases.js";

//@ chunk-dcmhvw5a.js:388586-388597 placement
var MAX_OTEL_HEADER_NAME_LENGTH = 120;
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
  if (URL_AUTHORITY_ESCAPE_RE.test(n.pathname)) return;
  let r = safeOriginUrlRedacted(e);
  return r !== null && r.length <= MAX_OTEL_HEADER_NAME_LENGTH ? r : undefined;
}
//@ chunk-dcmhvw5a.js:388834-389022 placement
var SCHEME_PREFIX_PATTERN = /^\w{1,8}:\/\//;
var GRPC_RESOLVER_SCHEMES = new Set(["dns", "unix", "ipv4", "ipv6"]);
var KNOWN_URL_SCHEMES = new Set([
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
  let urlOrNull = parseUrlOrNull(`https://${e}`);
  if (SCHEME_PREFIX_PATTERN.test(e)) {
    let urlOrNull = parseUrlOrNull(e);
    return urlOrNull && urlOrNull.port !== "" && GRPC_RESOLVER_SCHEMES.has(urlOrNull.hostname)
      ? undefined
      : sanitizeEndpointUrl(e);
  }
  if (parseUrlOrNull(e)?.host) return urlOrNull === null ? sanitizeEndpointUrl(e) : undefined;
  return urlOrNull &&
    !KNOWN_URL_SCHEMES.has(trimTrailingDots(urlOrNull.hostname)) &&
    sanitizeEndpointUrl(`https://${e}`) !== undefined
    ? urlOrNull.host
    : undefined;
}
//@ chunk-dcmhvw5a.js:389265-389343 placement
function trimTrailingDots(hostname) {
  let n = hostname.length;
  while (n > 0 && hostname[n - 1] === ".") n--;
  return hostname.slice(0, n);
}
//@ chunk-dcmhvw5a.js:389343-389399 placement
function parseUrlOrNull(e) {
  try {
    return new URL(e);
  } catch {
    return null;
  }
}
//@ chunk-dcmhvw5a.js:389399-389458 placement
var OTEL_HEADER_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
var MAX_OTEL_ATTRIBUTE_LENGTH = 64;
var MAX_OTEL_RESOURCE_LENGTH = 160;
var MAX_OTEL_ENDPOINT_LENGTH = 400;
//@ chunk-dcmhvw5a.js:389458-389489 placement
function truncateResourceValue(text) {
  return truncateWithNotShown(text, MAX_OTEL_RESOURCE_LENGTH);
}
//@ chunk-dcmhvw5a.js:389489-389520 placement
function truncateEndpointValue(text) {
  return truncateWithNotShown(text, MAX_OTEL_ENDPOINT_LENGTH);
}
//@ chunk-dcmhvw5a.js:389520-389615 placement
function truncateWithNotShown(e, n) {
  return e.length <= n ? e : `${e.slice(0, n)}\u2026 (+${e.length - n} chars NOT SHOWN)`;
}
//@ chunk-dcmhvw5a.js:389615-389716 placement
function maskEnvName(e) {
  let replaced = e.replace(/[^A-Za-z0-9_]+/g, "?");
  return replaced.length <= MAX_OTEL_ATTRIBUTE_LENGTH
    ? replaced
    : `${replaced.slice(0, MAX_OTEL_ATTRIBUTE_LENGTH)}\u2026`;
}
//@ chunk-dcmhvw5a.js:389716-389746 placement
var MAX_ENDPOINT_SCHEME_LENGTH = 256;
var MAX_ENDPOINT_HOST_LENGTH = 180;
var MAX_ENDPOINT_PATH_LENGTH = 60;
var MAX_ENDPOINT_QUERY_LENGTH = 32;
//@ chunk-dcmhvw5a.js:389746-389801 placement
/**
 * 非 ASCII 替换为 ?。
 */
function asciiOnly(e) {
  return e.replace(/[^\x20-\x7e]/gu, "?");
}
//@ chunk-dcmhvw5a.js:389801-390244 placement
/**
 * 解析 helper 设置值。
 */
function parseHelperSetting(e, n) {
  let r = safeParseJSON(e, false);
  if (!Array.isArray(r)) return;
  let [s, a, c] = r;
  let g;
  if (typeof s === "string" && s) g = quoteHelperSetting(s);
  else if (isInlineScriptHelper(s)) {
    let f = n ? ` (${n.bytes} ${plural(n.bytes, "byte")}, ${n.lines} ${plural(n.lines, "line")})` : "";
    g = `script for ${s.interpreter}${f} sha256:${s.script.slice(0, MAX_ENDPOINT_QUERY_LENGTH)}`;
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
  let n = asciiOnly(e);
  let r = n.length > MAX_ENDPOINT_SCHEME_LENGTH;
  let s;
  if (!r) s = jsonStringify(n);
  else {
    let a = n.length - MAX_ENDPOINT_HOST_LENGTH - MAX_ENDPOINT_PATH_LENGTH;
    s = jsonStringify(
      `${n.slice(0, MAX_ENDPOINT_HOST_LENGTH)}\u2026(${a} chars omitted)\u2026${n.slice(-MAX_ENDPOINT_PATH_LENGTH)}`,
    );
  }
  if (r || n !== e) s = `${s} sha256:${normalizePathText(e).slice(0, MAX_ENDPOINT_QUERY_LENGTH)}`;
  return s;
}
//@ chunk-dcmhvw5a.js:390456-390627 placement
function describeEnvRows(e) {
  let mapped = Object.entries(e.envVars).map(([key, value]) => describeEnvVar(key, value, ""));
  for (let [r, s] of riskyPayloadSlots(e))
    for (let [key, value] of Object.entries(s.envVars)) mapped.push(describeEnvVar(key, value, `${r}.env.`));
  return mapped;
}
//@ chunk-dcmhvw5a.js:390627-390910 placement
function describeEnvVar(e, n, r) {
  if (!OTEL_HEADER_NAME_RE.test(e))
    return {
      key: e,
      text: `${r}${maskEnvName(e)}`,
    };
  if (ENHANCED_TELEMETRY_VARS.has(e) && isEnvTruthy(n))
    return {
      key: e,
      text: `${r}${e} (adds traces to the telemetry export)`,
      tracesSwitch: true,
    };
  let s = OTLP_ANY_ENDPOINT_RE.test(e.toUpperCase()) ? endpointHostForDisplay(n) : sanitizeEndpointUrl(n);
  return s
    ? {
        key: e,
        text: `${r}${e}=${s}`,
        url: s,
      }
    : {
        key: e,
        text: `${r}${e}`,
      };
}
//@ chunk-dcmhvw5a.js:390910-391083 placement
/**
 * 取出 shell helper 设置校验结果中给安全对话框展示的各组行（命令、沙箱、隔离、环境变量、类别）。
 */
function shellHelperRows(e) {
  let { commandRows, sandboxRows, isolationRows, envRows, categoryRows } = validateShellHelperSettings(e);
  return {
    commandRows,
    sandboxRows,
    isolationRows,
    envRows,
    categoryRows,
  };
}
//@ chunk-dcmhvw5a.js:391083-391798 placement
/**
 * 校验 shell helper 设置。
 */
function validateShellHelperSettings(e) {
  let n = [];
  for (let [key, value] of Object.entries(e.shellSettings)) {
    if (value === undefined) continue;
    if (isPolicyHelperName(key)) {
      let helperSetting = parseHelperSetting(value, e.inlineHelperScriptSizes?.[key]);
      n.push(helperSetting ? `${key}=${helperSetting}` : key);
      continue;
    }
    n.push(describeHelperSettingPath(key, value, ""));
  }
  for (let [g, m] of riskyPayloadSlots(e))
    for (let [key, value] of Object.entries(m.shellSettings)) {
      if (value === undefined) continue;
      n.push(describeHelperSettingPath(key, value, `${g}.`));
    }
  let keys = Object.keys(e.sandboxSettings);
  for (let [g, m] of riskyPayloadSlots(e))
    for (let key of Object.keys(m.sandboxSettings)) keys.push(`${g}.${key}`);
  let keys_2 = Object.keys(e.isolationSettings);
  for (let [g, m] of riskyPayloadSlots(e))
    for (let key of Object.keys(m.isolationSettings)) keys_2.push(`${g}.${key}`);
  let a = [];
  for (let g of describeEnvRows(e)) a.push(g.text);
  let categoryRows = e.hasHooks ? ["hooks"] : [];
  return {
    commandRows: n,
    sandboxRows: keys,
    isolationRows: keys_2,
    envRows: a,
    categoryRows,
  };
}
//@ chunk-dcmhvw5a.js:391798-392265 placement
/**
 * 描述 helper 设置位置。
 */
function describeHelperSettingPath(e, n, r) {
  let s = truncateResourceValue(escapeNonPrintable(`${r}${e}`).text);
  if (e.startsWith("extraKnownMarketplaces[")) {
    if (e.endsWith(".headersHelper")) {
      let headersHelperCommand = parseHeadersHelperCommand(n);
      if (headersHelperCommand !== undefined) {
        let c =
          headersHelperCommand.url === undefined
            ? null
            : (displaySafeUrl(headersHelperCommand.url) ??
              (parseUrlOrNull(headersHelperCommand.url)?.host ? REDACTED_URL : null));
        return `${s}: ${truncateEndpointValue(escapeNonPrintable(headersHelperCommand.command).text)}${c === null ? "" : ` \u2192 ${truncateEndpointValue(escapeNonPrintable(c).text)}`}`;
      }
    } else if (e.endsWith(".pluginDigests")) return `${s}: code from your organization will run`;
    else if (e.endsWith(".source.command"))
      return `${s}: ${truncateEndpointValue(escapeNonPrintable(n).text)}`;
  }
  return s;
}
//@ chunk-dcmhvw5a.js:392265-392501 placement
function extraMarketplacesOf(e) {
  let extraKnownMarketplaces = e.extraKnownMarketplaces;
  if (extraKnownMarketplaces !== undefined && extraKnownMarketplaces !== null) return extraKnownMarketplaces;
  let r = e;
  for (let { alias, canonical } of SETTING_ALIASES) {
    if (canonical !== "extraKnownMarketplaces") continue;
    let c = r[alias];
    if (c !== undefined && c !== null && typeof c === "object") return c;
  }
  return;
}
export { shellHelperRows, asciiOnly, extraMarketplacesOf, describeEnvRows, parseHelperSetting };

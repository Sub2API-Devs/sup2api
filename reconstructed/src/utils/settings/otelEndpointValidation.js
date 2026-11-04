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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:388586-388597 placement
var MAX_OTEL_HEADER_NAME_LENGTH = 120;
//@ chunk-dcmhvw5a.js:388597-388834 placement
function sanitizeEndpointUrl(value) {
  if (/[\\\s\x00-\x1f\x7f]/.test(value)) return;
  let url;
  try {
    url = new URL(value);
  } catch {
    return;
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.host) return;
  if (URL_AUTHORITY_ESCAPE_RE.test(url.pathname)) return;
  let redacted = safeOriginUrlRedacted(value);
  return redacted !== null && redacted.length <= MAX_OTEL_HEADER_NAME_LENGTH ? redacted : undefined;
}
//@ chunk-dcmhvw5a.js:388834-389022 placement
var SCHEME_PREFIX_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GRPC_RESOLVER_SCHEMES;
var KNOWN_URL_SCHEMES;
deferInit("chunk-dcmhvw5a.js:388834", () => {
  SCHEME_PREFIX_PATTERN = /^\w{1,8}:\/\//;
  GRPC_RESOLVER_SCHEMES = new Set(["dns", "unix", "ipv4", "ipv6"]);
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
});
//@ chunk-dcmhvw5a.js:389022-389265 placement
function endpointHostForDisplay(value) {
  let urlOrNull = parseUrlOrNull(`https://${value}`);
  if (SCHEME_PREFIX_PATTERN.test(value)) {
    let urlOrNull = parseUrlOrNull(value);
    return urlOrNull && urlOrNull.port !== "" && GRPC_RESOLVER_SCHEMES.has(urlOrNull.hostname)
      ? undefined
      : sanitizeEndpointUrl(value);
  }
  if (parseUrlOrNull(value)?.host) return urlOrNull === null ? sanitizeEndpointUrl(value) : undefined;
  return urlOrNull &&
    !KNOWN_URL_SCHEMES.has(trimTrailingDots(urlOrNull.hostname)) &&
    sanitizeEndpointUrl(`https://${value}`) !== undefined
    ? urlOrNull.host
    : undefined;
}
//@ chunk-dcmhvw5a.js:389265-389343 placement
function trimTrailingDots(hostname) {
  let end = hostname.length;
  while (end > 0 && hostname[end - 1] === ".") end--;
  return hostname.slice(0, end);
}
//@ chunk-dcmhvw5a.js:389343-389399 placement
function parseUrlOrNull(text) {
  try {
    return new URL(text);
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
function truncateWithNotShown(text, maxLength) {
  return text.length <= maxLength
    ? text
    : `${text.slice(0, maxLength)}\u2026 (+${text.length - maxLength} chars NOT SHOWN)`;
}
//@ chunk-dcmhvw5a.js:389615-389716 placement
function maskEnvName(name) {
  let replaced = name.replace(/[^A-Za-z0-9_]+/g, "?");
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
function asciiOnly(text) {
  return text.replace(/[^\x20-\x7e]/gu, "?");
}
//@ chunk-dcmhvw5a.js:389801-390244 placement
/**
 * 解析 helper 设置值。
 */
function parseHelperSetting(raw, sizes) {
  let parsed = safeParseJSON(raw, false);
  if (!Array.isArray(parsed)) return;
  let [helper, timeout, refresh] = parsed;
  let label;
  if (typeof helper === "string" && helper) label = quoteHelperSetting(helper);
  else if (isInlineScriptHelper(helper)) {
    let sizeText = sizes
      ? ` (${sizes.bytes} ${plural(sizes.bytes, "byte")}, ${sizes.lines} ${plural(sizes.lines, "line")})`
      : "";
    label = `script for ${helper.interpreter}${sizeText} sha256:${helper.script.slice(0, MAX_ENDPOINT_QUERY_LENGTH)}`;
  } else return;
  let parts = [];
  for (let [key, value] of [
    ["timeout", timeout],
    ["refresh", refresh],
  ])
    if (value != null) parts.push(`${key} ${typeof value === "number" ? `${value}ms` : "?"}`);
  return parts.length ? `${label} (${parts.join(", ")})` : label;
}
//@ chunk-dcmhvw5a.js:390244-390456 placement
function quoteHelperSetting(text) {
  let ascii = asciiOnly(text);
  let tooLong = ascii.length > MAX_ENDPOINT_SCHEME_LENGTH;
  let quoted;
  if (!tooLong) quoted = jsonStringify(ascii);
  else {
    let omitted = ascii.length - MAX_ENDPOINT_HOST_LENGTH - MAX_ENDPOINT_PATH_LENGTH;
    quoted = jsonStringify(
      `${ascii.slice(0, MAX_ENDPOINT_HOST_LENGTH)}\u2026(${omitted} chars omitted)\u2026${ascii.slice(-MAX_ENDPOINT_PATH_LENGTH)}`,
    );
  }
  if (tooLong || ascii !== text)
    quoted = `${quoted} sha256:${normalizePathText(text).slice(0, MAX_ENDPOINT_QUERY_LENGTH)}`;
  return quoted;
}
//@ chunk-dcmhvw5a.js:390456-390627 placement
function describeEnvRows(doc) {
  let mapped = Object.entries(doc.envVars).map(([key, value]) => describeEnvVar(key, value, ""));
  for (let [prefix, slot] of riskyPayloadSlots(doc))
    for (let [key, value] of Object.entries(slot.envVars))
      mapped.push(describeEnvVar(key, value, `${prefix}.env.`));
  return mapped;
}
//@ chunk-dcmhvw5a.js:390627-390910 placement
function describeEnvVar(name, value, prefix) {
  if (!OTEL_HEADER_NAME_RE.test(name))
    return {
      key: name,
      text: `${prefix}${maskEnvName(name)}`,
    };
  if (ENHANCED_TELEMETRY_VARS.has(name) && isEnvTruthy(value))
    return {
      key: name,
      text: `${prefix}${name} (adds traces to the telemetry export)`,
      tracesSwitch: true,
    };
  let display = OTLP_ANY_ENDPOINT_RE.test(name.toUpperCase())
    ? endpointHostForDisplay(value)
    : sanitizeEndpointUrl(value);
  return display
    ? {
        key: name,
        text: `${prefix}${name}=${display}`,
        url: display,
      }
    : {
        key: name,
        text: `${prefix}${name}`,
      };
}
//@ chunk-dcmhvw5a.js:390910-391083 placement
/**
 * 取出 shell helper 设置校验结果中给安全对话框展示的各组行（命令、沙箱、隔离、环境变量、类别）。
 */
function shellHelperRows(doc) {
  let { commandRows, sandboxRows, isolationRows, envRows, categoryRows } = validateShellHelperSettings(doc);
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
function validateShellHelperSettings(doc) {
  let rows = [];
  for (let [key, value] of Object.entries(doc.shellSettings)) {
    if (value === undefined) continue;
    if (isPolicyHelperName(key)) {
      let helperSetting = parseHelperSetting(value, doc.inlineHelperScriptSizes?.[key]);
      rows.push(helperSetting ? `${key}=${helperSetting}` : key);
      continue;
    }
    rows.push(describeHelperSettingPath(key, value, ""));
  }
  for (let [prefix, slot] of riskyPayloadSlots(doc))
    for (let [key, value] of Object.entries(slot.shellSettings)) {
      if (value === undefined) continue;
      rows.push(describeHelperSettingPath(key, value, `${prefix}.`));
    }
  let keys = Object.keys(doc.sandboxSettings);
  for (let [prefix, slot] of riskyPayloadSlots(doc))
    for (let key of Object.keys(slot.sandboxSettings)) keys.push(`${prefix}.${key}`);
  let keys_2 = Object.keys(doc.isolationSettings);
  for (let [prefix, slot] of riskyPayloadSlots(doc))
    for (let key of Object.keys(slot.isolationSettings)) keys_2.push(`${prefix}.${key}`);
  let envRows = [];
  for (let row of describeEnvRows(doc)) envRows.push(row.text);
  let categoryRows = doc.hasHooks ? ["hooks"] : [];
  return {
    commandRows: rows,
    sandboxRows: keys,
    isolationRows: keys_2,
    envRows,
    categoryRows,
  };
}
//@ chunk-dcmhvw5a.js:391798-392265 placement
/**
 * 描述 helper 设置位置。
 */
function describeHelperSettingPath(key, value, prefix) {
  let label = truncateResourceValue(escapeNonPrintable(`${prefix}${key}`).text);
  if (key.startsWith("extraKnownMarketplaces[")) {
    if (key.endsWith(".headersHelper")) {
      let headersHelperCommand = parseHeadersHelperCommand(value);
      if (headersHelperCommand !== undefined) {
        let url =
          headersHelperCommand.url === undefined
            ? null
            : (displaySafeUrl(headersHelperCommand.url) ??
              (parseUrlOrNull(headersHelperCommand.url)?.host ? REDACTED_URL : null));
        return `${label}: ${truncateEndpointValue(escapeNonPrintable(headersHelperCommand.command).text)}${url === null ? "" : ` \u2192 ${truncateEndpointValue(escapeNonPrintable(url).text)}`}`;
      }
    } else if (key.endsWith(".pluginDigests")) return `${label}: code from your organization will run`;
    else if (key.endsWith(".source.command"))
      return `${label}: ${truncateEndpointValue(escapeNonPrintable(value).text)}`;
  }
  return label;
}
//@ chunk-dcmhvw5a.js:392265-392501 placement
function extraMarketplacesOf(doc) {
  let extraKnownMarketplaces = doc.extraKnownMarketplaces;
  if (extraKnownMarketplaces !== undefined && extraKnownMarketplaces !== null) return extraKnownMarketplaces;
  let target = doc;
  for (let { alias, canonical } of SETTING_ALIASES) {
    if (canonical !== "extraKnownMarketplaces") continue;
    let value = target[alias];
    if (value !== undefined && value !== null && typeof value === "object") return value;
  }
  return;
}
export { shellHelperRows, asciiOnly, extraMarketplacesOf, describeEnvRows, parseHelperSetting };

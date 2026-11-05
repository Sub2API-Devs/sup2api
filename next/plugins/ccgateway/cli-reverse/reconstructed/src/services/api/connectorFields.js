/**
 * services/api/connectorFields.ts
 *
 * API 连接器字段（url/directory_entry）的白名单校验与统计：入参长度/字符集限制、未解析标记与按连接器缓存（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wvdswywk.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logEventTo1P_2 } from "../../utils/model/firstPartyBaseUrl.js";
import { hasPlainAuthority } from "../mcp/stepUpAuth.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wvdswywk.js:2221-2281 placement
var MAX_URL_BYTES = 2048;
var MAX_ENTRY_BYTES = 255;
var ENTRY_PATTERN = /^[!#-[\]-~]+$/;
var AUTHORITY_PATTERN = /^[A-Za-z0-9.:[\]-]+$/;
//@ chunk-wvdswywk.js:2281-2339 placement
/**
 * 连接器字段上报开关（tengu_precious_ember）。
 */
function isConnectorFieldsReported() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_precious_ember", true) && logEventTo1P_2();
}
//@ chunk-wvdswywk.js:2339-2643 placement
/**
 * 规范化 url 字段：只留 https origin+pathname，长度上限 2048。
 */
function sanitizeUrl(url) {
  let authority = url.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i)?.[1];
  if (!hasPlainAuthority(url) || authority === undefined || !AUTHORITY_PATTERN.test(authority)) return;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (parsed.protocol !== "https:" || parsed.host !== authority.toLowerCase().replace(/:443$/, "")) return;
  let trimmed = `${parsed.origin}${parsed.pathname}`;
  return Buffer.byteLength(trimmed, "utf8") <= MAX_URL_BYTES ? trimmed : undefined;
}
//@ chunk-wvdswywk.js:2643-2715 placement
function sanitizeEntry(entry) {
  return ENTRY_PATTERN.test(entry) && Buffer.byteLength(entry, "utf8") <= MAX_ENTRY_BYTES ? entry : undefined;
}
//@ chunk-wvdswywk.js:2715-2990 placement
/**
 * 组装连接器字段（url/directory_entry/unresolved），被拒的字段只留 unresolved。
 */
function connectorFields(url, entry, unresolved) {
  let entry_2 = typeof entry === "string" && sanitizeEntry(entry) === entry ? entry : undefined;
  let cleanUrl =
    entry_2 !== undefined && typeof url === "string" && sanitizeUrl(url) === url ? url : undefined;
  return {
    ...(cleanUrl !== undefined && {
      url: cleanUrl,
    }),
    ...(entry_2 !== undefined && {
      directory_entry: entry_2,
    }),
    ...(((unresolved !== undefined && unresolved !== false) ||
      (entry !== undefined && entry_2 === undefined) ||
      (url !== undefined && cleanUrl === undefined)) && {
      unresolved: true,
    }),
  };
}
//@ chunk-wvdswywk.js:2990-3103 placement
var connectorUsage; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-wvdswywk.js:2990", () => {
  connectorUsage = new SessionRootSlot(() => ({
    byConnector: new Map(),
    connectorByTool: new Map(),
    fieldsSentReported: false,
    refusalsReported: new Set(),
  }));
});
//@ chunk-wvdswywk.js:3103-3661 placement
/**
 * 按连接器重算 url/directory_entry 字段并对从未报过的拒绝类型记遥测。
 */
function recordConnectors(connectors) {
  try {
    let usage = connectorUsage.of(getRootSession());
    let refusals = new Set();
    for (let { id, url, directoryEntry } of connectors) {
      let entry = directoryEntry === undefined ? undefined : sanitizeEntry(directoryEntry);
      let cleanUrl = url === undefined || entry === undefined ? undefined : sanitizeUrl(url);
      let entryRefused = directoryEntry !== undefined && entry === undefined;
      let urlRefused = url !== undefined && entry !== undefined && cleanUrl === undefined;
      if (entryRefused) refusals.add("entry_refused");
      else if (urlRefused) refusals.add("url_refused");
      if (directoryEntry === undefined) usage.byConnector.delete(id);
      else
        usage.byConnector.set(id, {
          ...(cleanUrl !== undefined && {
            url: cleanUrl,
          }),
          ...(entry !== undefined && {
            directory_entry: entry,
          }),
          ...((entryRefused || urlRefused) && {
            unresolved: true,
          }),
        });
    }
    for (let reason of refusals)
      if (!usage.refusalsReported.has(reason) && isConnectorFieldsReported()) {
        usage.refusalsReported.add(reason);
        logFeatureSad("api_tools_used_connector_fields", reason);
      }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-wvdswywk.js:3661-3842 placement
/**
 * 按 claudeai 作用域的 serverId 维护工具到连接器的映射。
 */
function indexConnectorByTool(tools) {
  try {
    let { connectorByTool } = connectorUsage.of(getRootSession());
    for (let { name, mcpInfo } of tools)
      if (mcpInfo?.scope === "claudeai" && mcpInfo.serverId !== undefined)
        connectorByTool.set(name, mcpInfo.serverId);
      else connectorByTool.delete(name);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-wvdswywk.js:3842-3965 placement
/**
 * 首次发送连接器字段时记一条遥测。
 */
function reportFieldsSent() {
  let usage = connectorUsage.of(getRootSession());
  if (usage.fieldsSentReported) return;
  usage.fieldsSentReported = true;
  logFeatureOk("api_tools_used_connector_fields");
}
//@ chunk-wvdswywk.js:4074-4120 placement
/**
 * 清空本会话的连接器字段状态。
 */
function dropConnectorIndex() {
  try {
    connectorUsage.drop(getRootSession());
  } catch (error) {
    logError(error);
  }
}
export {
  indexConnectorByTool,
  recordConnectors,
  dropConnectorIndex,
  isConnectorFieldsReported,
  connectorFields,
  connectorUsage,
  reportFieldsSent,
};

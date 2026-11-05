/**
 * utils/plugins/pluginAttribution.ts
 *
 * 2.1.316 新增：插件归属 sidecar 读取。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5s0qaz1x.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { INVISIBLE_CHAR_CLASS_SOURCE } from "../sanitization.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  pluginAvailabilitySchema,
  pluginOriginSchema,
  parsePluginAvailability,
  parsePluginOriginKind,
} from "./marketplaceNames.js";
import { readSmallFileOrNull } from "../readSmallFile.js";
import { jsonParse } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { env } from "../env.js";
import { parseJsonRegistryFile, normalizeRegistryKey } from "./localMarketplacePaths.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5s0qaz1x.js:38545-38729 placement
var PLUGIN_META_SUFFIX; // deferred: uses INVISIBLE_CHAR_CLASSES (../sanitization.js) of its import cycle while loading; runs once the cycle is complete
var SERVER_PLUGIN_ID;
var MARKETPLACE_NAME;
var INSTALLATION_PREFERENCE;
var MARKETPLACE_KIND;
var regExp;
deferInit("chunk-5s0qaz1x.js:38545", () => {
  PLUGIN_META_SUFFIX = ".meta.json";
  SERVER_PLUGIN_ID = "server_plugin_id";
  MARKETPLACE_NAME = "marketplace_name";
  INSTALLATION_PREFERENCE = "installation_preference";
  MARKETPLACE_KIND = "marketplace_kind";
  regExp = new RegExp(`^(?!\\s)(?![\\s\\S]*\\s$)[^@${INVISIBLE_CHAR_CLASS_SOURCE}]{1,128}$`, "u");
});
//@ chunk-5s0qaz1x.js:38729-38763 placement
/**
 * isAttributionNameValid：归属市场名格式合法。
 */
function isAttributionNameValid(name) {
  return regExp.test(name);
}
//@ chunk-5s0qaz1x.js:38763-38820 placement
var SERVER_PLUGIN_ID_PATTERN = /^plugin_(?:staging_|local_)?[A-Za-z0-9]{1,64}$/;
//@ chunk-5s0qaz1x.js:38820-38855 placement
function isServerPluginId(id) {
  return SERVER_PLUGIN_ID_PATTERN.test(id);
}
//@ chunk-5s0qaz1x.js:38855-39048 placement
/**
 * 插件归属 sidecar：un 是侧车文件的 schema（四个可选字段，键来自常量，解析失败按缺省忽略）；dZo 是读取该文件时 4096 字节的上限。
 */
var PluginAttributionSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_ATTRIBUTION_FILE_BYTES;
deferInit("chunk-5s0qaz1x.js:38855", () => {
  PluginAttributionSchema = DoctorLazy(() =>
    objectSchema({
      [SERVER_PLUGIN_ID]: stringSchema().regex(SERVER_PLUGIN_ID_PATTERN).optional().catch(undefined),
      [MARKETPLACE_NAME]: stringSchema().regex(regExp).optional().catch(undefined),
      [INSTALLATION_PREFERENCE]: pluginAvailabilitySchema().optional().catch(undefined),
      [MARKETPLACE_KIND]: pluginOriginSchema().optional().catch(undefined),
    }),
  );
  MAX_ATTRIBUTION_FILE_BYTES = 4096;
});
//@ chunk-5s0qaz1x.js:39048-39291 placement
async function readPluginAttributionSidecar(pluginPath) {
  let sidecarPath = pluginPath + PLUGIN_META_SUFFIX;
  let unread = false;
  let smallFileOrNull = await readSmallFileOrNull(sidecarPath, MAX_ATTRIBUTION_FILE_BYTES, () => {
    unread = true;
  });
  if (smallFileOrNull === null)
    return unread
      ? {
          unread: true,
        }
      : {};
  let parsed;
  try {
    parsed = jsonParse(smallFileOrNull);
  } catch {
    logForDebugging(`Ignoring plugin attribution sidecar at ${sidecarPath}: not valid JSON`);
    return {
      unread: true,
    };
  }
  return parsePluginAttribution(parsed, `sidecar at ${sidecarPath}`);
}
//@ chunk-5s0qaz1x.js:39291-39953 placement
/**
 * 校验一条插件归属：取合法的 serverPluginId、marketplaceName、installationPreference、marketplaceKind； 存在但非法的字段记调试日志，市场名非法时标记 unread。整体不是对象时返回 {unread:true}。
 */
function parsePluginAttribution(raw, label) {
  let parseResult = PluginAttributionSchema().safeParse(raw);
  if (!parseResult.success) {
    logForDebugging(`Ignoring plugin attribution ${label}: not a JSON object`);
    return {
      unread: true,
    };
  }
  let result = {};
  let serverPluginId = parseResult.data[SERVER_PLUGIN_ID];
  if (typeof serverPluginId === "string" && isServerPluginId(serverPluginId))
    result.serverPluginId = serverPluginId;
  let marketplaceName = parseResult.data[MARKETPLACE_NAME];
  if (typeof marketplaceName === "string" && isAttributionNameValid(marketplaceName))
    result.marketplaceName = marketplaceName;
  let pluginAvailability = parsePluginAvailability(parseResult.data[INSTALLATION_PREFERENCE]);
  if (pluginAvailability !== undefined) result.installationPreference = pluginAvailability;
  let pluginOriginKind = parsePluginOriginKind(parseResult.data[MARKETPLACE_KIND]);
  if (pluginOriginKind !== undefined) result.marketplaceKind = pluginOriginKind;
  if (typeof raw === "object" && raw !== null) {
    for (let [field, value] of [
      [SERVER_PLUGIN_ID, result.serverPluginId],
      [MARKETPLACE_NAME, result.marketplaceName],
      [INSTALLATION_PREFERENCE, result.installationPreference],
      [MARKETPLACE_KIND, result.marketplaceKind],
    ])
      if (field in raw && value === undefined) {
        logForDebugging(`Ignoring plugin attribution field (${label}): invalid ${field}`);
        if (field === MARKETPLACE_NAME) result.unread = true;
      }
  }
  return result;
}
//@ chunk-5s0qaz1x.js:39953-39966 placement
var MAX_ATTRIBUTION_FILE_BYTES_2 = 65536;
//@ chunk-5s0qaz1x.js:39966-40153 placement
function getEnvPluginAttribution(pluginKey) {
  let CLAUDE_CODE_PLUGIN_ATTRIBUTION = env.CLAUDE_CODE_PLUGIN_ATTRIBUTION;
  if (CLAUDE_CODE_PLUGIN_ATTRIBUTION === undefined) return;
  return parseJsonRegistryFile(
    "CLAUDE_CODE_PLUGIN_ATTRIBUTION",
    CLAUDE_CODE_PLUGIN_ATTRIBUTION,
    MAX_ATTRIBUTION_FILE_BYTES_2,
    (entry) => parsePluginAttribution(entry, "CLAUDE_CODE_PLUGIN_ATTRIBUTION entry"),
  ).get(normalizeRegistryKey(pluginKey));
}
//@ chunk-5s0qaz1x.js:40153-40202 placement
async function getPluginAttribution(pluginPath) {
  return getEnvPluginAttribution(pluginPath) ?? (await readPluginAttributionSidecar(pluginPath));
}
export {
  isServerPluginId,
  getPluginAttribution,
  PLUGIN_META_SUFFIX,
  isAttributionNameValid,
  SERVER_PLUGIN_ID,
  MARKETPLACE_NAME,
  INSTALLATION_PREFERENCE,
  MARKETPLACE_KIND,
  MAX_ATTRIBUTION_FILE_BYTES,
  readPluginAttributionSidecar,
  SERVER_PLUGIN_ID_PATTERN,
};

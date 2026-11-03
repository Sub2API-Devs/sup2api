/**
 * utils/plugins/pluginAttribution.ts
 *
 * 2.1.316 新增：插件归属 sidecar 读取。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f3qhjfah.js (10)
 * attribution: placement 10
 */
import { INVISIBLE_CHAR_CLASS_SOURCE } from "../sanitization.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-f3qhjfah.js:38283-38467 placement
var PLUGIN_META_SUFFIX = ".meta.json";
var SERVER_PLUGIN_ID = "server_plugin_id";
var MARKETPLACE_NAME = "marketplace_name";
var INSTALLATION_PREFERENCE = "installation_preference";
var MARKETPLACE_KIND = "marketplace_kind";
var regExp = new RegExp(`^(?!\\s)(?![\\s\\S]*\\s$)[^@${INVISIBLE_CHAR_CLASS_SOURCE}]{1,128}$`, "u");
//@ chunk-f3qhjfah.js:38467-38501 placement
/**
 * isAttributionNameValid：归属市场名格式合法。
 */
function isAttributionNameValid(e) {
  return regExp.test(e);
}
//@ chunk-f3qhjfah.js:38501-38558 placement
var SERVER_PLUGIN_ID_PATTERN = /^plugin_(?:staging_|local_)?[A-Za-z0-9]{1,64}$/;
//@ chunk-f3qhjfah.js:38558-38593 placement
function isServerPluginId(e) {
  return SERVER_PLUGIN_ID_PATTERN.test(e);
}
//@ chunk-f3qhjfah.js:38593-38786 placement
/**
 * pluginAttributionSchema：插件归属 sidecar schema。
 */
var PluginAttributionSchema = DoctorLazy(() =>
  u({
    [SERVER_PLUGIN_ID]: string().regex(SERVER_PLUGIN_ID_PATTERN).optional().catch(undefined),
    [MARKETPLACE_NAME]: string().regex(regExp).optional().catch(undefined),
    [INSTALLATION_PREFERENCE]: pluginAvailabilitySchema().optional().catch(undefined),
    [MARKETPLACE_KIND]: pluginOriginSchema().optional().catch(undefined),
  }),
);
var pluginAttributionSchema = 4096;
//@ chunk-f3qhjfah.js:38786-39029 placement
async function readPluginAttributionSidecar(e) {
  let n = e + PLUGIN_META_SUFFIX;
  let r = false;
  let smallFileOrNull = await readSmallFileOrNull(n, pluginAttributionSchema, () => {
    r = true;
  });
  if (smallFileOrNull === null)
    return r
      ? {
          unread: true,
        }
      : {};
  let a;
  try {
    a = jsonParse(smallFileOrNull);
  } catch {
    logForDebugging(`Ignoring plugin attribution sidecar at ${n}: not valid JSON`);
    return {
      unread: true,
    };
  }
  return parsePluginAttribution(a, `sidecar at ${n}`);
}
//@ chunk-f3qhjfah.js:39029-39691 placement
/**
 * 校验一条插件归属：取合法的 serverPluginId、marketplaceName、installationPreference、marketplaceKind； 存在但非法的字段记调试日志，市场名非法时标记 unread。整体不是对象时返回 {unread:true}。
 */
function parsePluginAttribution(e, n) {
  let r = PluginAttributionSchema().safeParse(e);
  if (!r.success) {
    logForDebugging(`Ignoring plugin attribution ${n}: not a JSON object`);
    return {
      unread: true,
    };
  }
  let s = {};
  let a = r.data[SERVER_PLUGIN_ID];
  if (typeof a === "string" && isServerPluginId(a)) s.serverPluginId = a;
  let c = r.data[MARKETPLACE_NAME];
  if (typeof c === "string" && isAttributionNameValid(c)) s.marketplaceName = c;
  let pluginAvailability = parsePluginAvailability(r.data[INSTALLATION_PREFERENCE]);
  if (pluginAvailability !== undefined) s.installationPreference = pluginAvailability;
  let pluginOriginKind = parsePluginOriginKind(r.data[MARKETPLACE_KIND]);
  if (pluginOriginKind !== undefined) s.marketplaceKind = pluginOriginKind;
  if (typeof e === "object" && e !== null) {
    for (let [f, m] of [
      [SERVER_PLUGIN_ID, s.serverPluginId],
      [MARKETPLACE_NAME, s.marketplaceName],
      [INSTALLATION_PREFERENCE, s.installationPreference],
      [MARKETPLACE_KIND, s.marketplaceKind],
    ])
      if (f in e && m === undefined) {
        logForDebugging(`Ignoring plugin attribution field (${n}): invalid ${f}`);
        if (f === MARKETPLACE_NAME) s.unread = true;
      }
  }
  return s;
}
//@ chunk-f3qhjfah.js:39691-39704 placement
var MAX_ATTRIBUTION_FILE_BYTES = 65536;
//@ chunk-f3qhjfah.js:39704-39891 placement
function getEnvPluginAttribution(e) {
  let CLAUDE_CODE_PLUGIN_ATTRIBUTION = env.CLAUDE_CODE_PLUGIN_ATTRIBUTION;
  if (CLAUDE_CODE_PLUGIN_ATTRIBUTION === undefined) return;
  return parseJsonRegistryFile(
    "CLAUDE_CODE_PLUGIN_ATTRIBUTION",
    CLAUDE_CODE_PLUGIN_ATTRIBUTION,
    MAX_ATTRIBUTION_FILE_BYTES,
    (r) => parsePluginAttribution(r, "CLAUDE_CODE_PLUGIN_ATTRIBUTION entry"),
  ).get(normalizeRegistryKey(e));
}
//@ chunk-f3qhjfah.js:39891-39940 placement
async function getPluginAttribution(e) {
  return getEnvPluginAttribution(e) ?? (await readPluginAttributionSidecar(e));
}
export {
  getPluginAttribution,
  isServerPluginId,
  SERVER_PLUGIN_ID,
  SERVER_PLUGIN_ID_PATTERN,
  PLUGIN_META_SUFFIX,
  isAttributionNameValid,
  MARKETPLACE_NAME,
  INSTALLATION_PREFERENCE,
  MARKETPLACE_KIND,
  pluginAttributionSchema,
  readPluginAttributionSidecar,
};

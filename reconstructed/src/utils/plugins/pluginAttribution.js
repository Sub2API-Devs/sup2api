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
import { RS } from "../sanitization.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { fdr, pdr, EJr, vJr } from "./marketplaceNames.js";
import { readSmallFileOrNull } from "../readSmallFile.js";
import { jsonParse } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { env } from "../env.js";
import { parseJsonRegistryFile, normalizeRegistryKey } from "./localMarketplacePaths.js";

//@ chunk-f3qhjfah.js:38283-38467 placement
var PLUGIN_META_SUFFIX = ".meta.json",
  SERVER_PLUGIN_ID = "server_plugin_id",
  MARKETPLACE_NAME = "marketplace_name",
  INSTALLATION_PREFERENCE = "installation_preference",
  MARKETPLACE_KIND = "marketplace_kind",
  regExp = new RegExp(`^(?!\\s)(?![\\s\\S]*\\s$)[^@${RS}]{1,128}$`, "u");
//@ chunk-f3qhjfah.js:38467-38501 placement
function lZo(e) {
  return regExp.test(e);
}
//@ chunk-f3qhjfah.js:38501-38558 placement
var SERVER_PLUGIN_ID_PATTERN = /^plugin_(?:staging_|local_)?[A-Za-z0-9]{1,64}$/;
//@ chunk-f3qhjfah.js:38558-38593 placement
function isServerPluginId(e) {
  return SERVER_PLUGIN_ID_PATTERN.test(e);
}
//@ chunk-f3qhjfah.js:38593-38786 placement
var PluginAttributionSchema = DoctorLazy(() =>
    u({
      [SERVER_PLUGIN_ID]: o()
        .regex(SERVER_PLUGIN_ID_PATTERN)
        .optional()
        .catch(void 0),
      [MARKETPLACE_NAME]: o()
        .regex(regExp)
        .optional()
        .catch(void 0),
      [INSTALLATION_PREFERENCE]: fdr()
        .optional()
        .catch(void 0),
      [MARKETPLACE_KIND]: pdr()
        .optional()
        .catch(void 0),
    }),
  ),
  dZo = 4096;
//@ chunk-f3qhjfah.js:38786-39029 placement
async function readPluginAttributionSidecar(e) {
  let n = e + PLUGIN_META_SUFFIX,
    r = !1,
    s = await readSmallFileOrNull(n, dZo, () => {
      r = !0;
    });
  if (s === null) return r ? { unread: !0 } : {};
  let a;
  try {
    a = jsonParse(s);
  } catch {
    return (logForDebugging(`Ignoring plugin attribution sidecar at ${n}: not valid JSON`), { unread: !0 });
  }
  return parsePluginAttribution(a, `sidecar at ${n}`);
}
/**
 * 校验一条插件归属：取合法的 serverPluginId、marketplaceName、installationPreference、marketplaceKind； 存在但非法的字段记调试日志，市场名非法时标记 unread。整体不是对象时返回 {unread:true}。
 */
//@ chunk-f3qhjfah.js:39029-39691 placement
function parsePluginAttribution(e, n) {
  let safeParse = PluginAttributionSchema().safeParse(e);
  if (!safeParse.success)
    return (logForDebugging(`Ignoring plugin attribution ${n}: not a JSON object`), { unread: !0 });
  let s = {},
    a = safeParse.data[SERVER_PLUGIN_ID];
  if (typeof a === "string" && isServerPluginId(a)) s.serverPluginId = a;
  let c = safeParse.data[MARKETPLACE_NAME];
  if (typeof c === "string" && lZo(c)) s.marketplaceName = c;
  let l = EJr(safeParse.data[INSTALLATION_PREFERENCE]);
  if (l !== void 0) s.installationPreference = l;
  let g = vJr(safeParse.data[MARKETPLACE_KIND]);
  if (g !== void 0) s.marketplaceKind = g;
  if (typeof e === "object" && e !== null) {
    for (let [f, m] of [
      [SERVER_PLUGIN_ID, s.serverPluginId],
      [MARKETPLACE_NAME, s.marketplaceName],
      [INSTALLATION_PREFERENCE, s.installationPreference],
      [MARKETPLACE_KIND, s.marketplaceKind],
    ])
      if (f in e && m === void 0) {
        if (
          (logForDebugging(`Ignoring plugin attribution field (${n}): invalid ${f}`), f === MARKETPLACE_NAME)
        )
          s.unread = !0;
      }
  }
  return s;
}
//@ chunk-f3qhjfah.js:39691-39704 placement
var cn = 65536;
//@ chunk-f3qhjfah.js:39704-39891 placement
function getEnvPluginAttribution(e) {
  let CLAUDE_CODE_PLUGIN_ATTRIBUTION = env.CLAUDE_CODE_PLUGIN_ATTRIBUTION;
  if (CLAUDE_CODE_PLUGIN_ATTRIBUTION === void 0) return;
  return parseJsonRegistryFile("CLAUDE_CODE_PLUGIN_ATTRIBUTION", CLAUDE_CODE_PLUGIN_ATTRIBUTION, cn, (r) =>
    parsePluginAttribution(r, "CLAUDE_CODE_PLUGIN_ATTRIBUTION entry"),
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
  lZo,
  MARKETPLACE_NAME,
  INSTALLATION_PREFERENCE,
  MARKETPLACE_KIND,
  dZo,
  readPluginAttributionSidecar,
};

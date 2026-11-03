/**
 * utils/telemetry/pluginTelemetryName.ts
 *
 * 2.1.316 新增：插件遥测名（官方/第三方判定，读不到市场目录时按第三方记录）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g8nydygk.js (2)
 * attribution: placement 2
 */
import {
  normalizePluginId,
  parsePluginIdentifier_2,
  isOfficialOrCommunityMarketplace,
  isKnownOfficialPluginName,
} from "../plugins/pluginIdentifier.js";
import { OFFICIAL_MARKETPLACE_NAME } from "../plugins/officialMarketplaceNames.js";
import { kk } from "../plugins/commandSourceErrors.js";
import { loadKnownMarketplacesSafe, getPluginByIdCacheOnly } from "../plugins/marketplaceManager.js";
import { buildPluginEventFields, BUILTIN, lYo } from "./pluginTelemetry.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { THIRD_PARTY } from "../../services/analytics/metadata.js";
import { getBuiltinPlugin } from "../../plugins/builtinPlugins.js";

/**
 * 插件遥测字段（官方插件确认存在，否则名字记为第三方）。
 */
//@ chunk-g8nydygk.js:503-956 placement
async function pluginTelemetryFields(n, i, r) {
  let o = normalizePluginId(n),
    { name: a, marketplace: marketplace } = parsePluginIdentifier_2(o);
  if (marketplace === OFFICIAL_MARKETPLACE_NAME && kk().nameRegistration === void 0)
    await loadKnownMarketplacesSafe(r);
  let l = buildPluginEventFields(a, marketplace, i),
    m = isOfficialOrCommunityMarketplace(marketplace);
  if (!m && marketplace !== BUILTIN && !isKnownOfficialPluginName(a, marketplace)) return l;
  let s = !1;
  try {
    s = await pluginExists(o, a, marketplace, r);
  } catch (error) {
    logForDebugging(
      `Plugin telemetry: could not read the marketplace catalog to confirm "${n}" exists (${errorMessage(error)}); logging its name as third-party`,
    );
  }
  return {
    ...l,
    ...(m && marketplace !== void 0 && { marketplace_name_redacted: lYo(marketplace) }),
    ...(!s && { plugin_name_redacted: lit(THIRD_PARTY) }),
  };
}
//@ chunk-g8nydygk.js:956-1063 placement
async function pluginExists(n, i, r, o) {
  if (isKnownOfficialPluginName(i, r)) return !0;
  if (r === BUILTIN) return getBuiltinPlugin(i) !== void 0;
  return (await getPluginByIdCacheOnly(n, o)) !== null;
}

export { pluginTelemetryFields };

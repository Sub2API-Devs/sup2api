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
import { commandSourceSession } from "../plugins/commandSourceErrors.js";
import { loadKnownMarketplacesSafe, getPluginByIdCacheOnly } from "../plugins/marketplaceManager.js";
import { buildPluginEventFields, BUILTIN, redactedMarketplaceName } from "./pluginTelemetry.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { THIRD_PARTY } from "../../services/analytics/metadata.js";
import { getBuiltinPlugin } from "../../plugins/builtinPlugins.js";

//@ chunk-g8nydygk.js:503-956 placement
/**
 * 插件遥测字段（官方插件确认存在，否则名字记为第三方）。
 */
async function pluginTelemetryFields(n, i, r) {
  let o = normalizePluginId(n);
  let { name: a, marketplace } = parsePluginIdentifier_2(o);
  if (marketplace === OFFICIAL_MARKETPLACE_NAME && commandSourceSession().nameRegistration === undefined)
    await loadKnownMarketplacesSafe(r);
  let pluginEventFields = buildPluginEventFields(a, marketplace, i);
  let m = isOfficialOrCommunityMarketplace(marketplace);
  if (!m && marketplace !== BUILTIN && !isKnownOfficialPluginName(a, marketplace)) return pluginEventFields;
  let s = false;
  try {
    s = await pluginExists(o, a, marketplace, r);
  } catch (error) {
    logForDebugging(
      `Plugin telemetry: could not read the marketplace catalog to confirm "${n}" exists (${errorMessage(error)}); logging its name as third-party`,
    );
  }
  return {
    ...pluginEventFields,
    ...(m &&
      marketplace !== undefined && {
        marketplace_name_redacted: redactedMarketplaceName(marketplace),
      }),
    ...(!s && {
      plugin_name_redacted: lit(THIRD_PARTY),
    }),
  };
}
//@ chunk-g8nydygk.js:956-1063 placement
async function pluginExists(n, i, marketplace, o) {
  if (isKnownOfficialPluginName(i, marketplace)) return true;
  if (marketplace === BUILTIN) return getBuiltinPlugin(i) !== undefined;
  return (await getPluginByIdCacheOnly(n, o)) !== null;
}
export { pluginTelemetryFields };

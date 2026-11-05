/**
 * utils/telemetry/pluginTelemetryName.ts
 *
 * 2.1.316 新增：插件遥测名（官方/第三方判定，读不到市场目录时按第三方记录）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mbyxant6.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-mbyxant6.js:4215-4668 placement
/**
 * 插件遥测字段（官方插件确认存在，否则名字记为第三方）。
 */
async function pluginTelemetryFields(pluginIdRaw, managedNames, storage) {
  let pluginId = normalizePluginId(pluginIdRaw);
  let { name, marketplace } = parsePluginIdentifier_2(pluginId);
  if (marketplace === OFFICIAL_MARKETPLACE_NAME && commandSourceSession().nameRegistration === undefined)
    await loadKnownMarketplacesSafe(storage);
  let pluginEventFields = buildPluginEventFields(name, marketplace, managedNames);
  let isOfficialMarketplace = isOfficialOrCommunityMarketplace(marketplace);
  if (!isOfficialMarketplace && marketplace !== BUILTIN && !isKnownOfficialPluginName(name, marketplace))
    return pluginEventFields;
  let exists = false;
  try {
    exists = await pluginExists(pluginId, name, marketplace, storage);
  } catch (error) {
    logForDebugging(
      `Plugin telemetry: could not read the marketplace catalog to confirm "${pluginIdRaw}" exists (${errorMessage(error)}); logging its name as third-party`,
    );
  }
  return {
    ...pluginEventFields,
    ...(isOfficialMarketplace &&
      marketplace !== undefined && {
        marketplace_name_redacted: redactedMarketplaceName(marketplace),
      }),
    ...(!exists && {
      plugin_name_redacted: lit(THIRD_PARTY),
    }),
  };
}
//@ chunk-mbyxant6.js:4668-4775 placement
async function pluginExists(pluginId, name, marketplace, storage) {
  if (isKnownOfficialPluginName(name, marketplace)) return true;
  if (marketplace === BUILTIN) return getBuiltinPlugin(name) !== undefined;
  return (await getPluginByIdCacheOnly(pluginId, storage)) !== null;
}
export { pluginTelemetryFields };

/**
 * utils/plugins/pluginSourceResolution.ts
 *
 * 2.1.316 新增：插件来源解析。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vbctfrwr.js (2)
 * attribution: placement 2
 */
import { isLocalMarketplaceSource } from "./reconciler.js";
import {
  getPluginByIdCacheOnly,
  loadKnownMarketplacesSafe,
  seedDirFor,
  tryUnwrapTextPayload,
} from "./marketplaceManager.js";
import { parsePluginIdentifier } from "./pluginIdentifier.js";
import { isLocalMarketplaceEntry } from "./pluginDirectories.js";
import { resolvePluginEntryPath, entryResolutionError } from "./localMarketplacePaths.js";

//@ chunk-vbctfrwr.js:319-483 placement
function unresolvedForLocalMarketplace(source) {
  return source !== undefined && isLocalMarketplaceSource(source)
    ? {
        kind: "unresolved",
        reason: "Its marketplace is a folder whose catalog could not be read, or lists it no more.",
      }
    : {
        kind: "copy",
      };
}
//@ chunk-vbctfrwr.js:483-942 placement
/**
 * 根据缓存的市场条目判断插件来源：本地市场内的相对路径插件解析成目录路径；其他来源返回 copy； 本地市场条目解析失败时返回 unresolved 与原因。
 */
async function resolvePluginSourceLocation(e, o) {
  let [pluginByIdCacheOnly, knownMarketplaces] = await Promise.all([
    getPluginByIdCacheOnly(e, o),
    loadKnownMarketplacesSafe(o),
  ]);
  let source = knownMarketplaces[parsePluginIdentifier(e).marketplace ?? ""]?.source;
  if (pluginByIdCacheOnly === null) return unresolvedForLocalMarketplace(source);
  let { source: source_2 } = pluginByIdCacheOnly.entry;
  let c = isLocalMarketplaceEntry(source_2, source);
  if (typeof source_2 !== "string" || !c)
    return {
      kind: "copy",
    };
  let i = seedDirFor(pluginByIdCacheOnly.marketplaceInstallLocation) === undefined ? "workspace" : "system";
  let pluginEntryPath = await resolvePluginEntryPath(
    e,
    pluginByIdCacheOnly.marketplaceInstallLocation,
    source_2,
    knownMarketplaces,
    tryUnwrapTextPayload(),
    o,
    i,
  );
  return pluginEntryPath.kind === "ok"
    ? {
        kind: "folder",
        path: pluginEntryPath.entryPath,
      }
    : {
        kind: "unresolved",
        reason: entryResolutionError(
          pluginEntryPath,
          pluginByIdCacheOnly.marketplaceInstallLocation,
          source_2,
        ).message,
      };
}
export { resolvePluginSourceLocation };

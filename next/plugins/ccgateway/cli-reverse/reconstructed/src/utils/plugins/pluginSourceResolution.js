/**
 * utils/plugins/pluginSourceResolution.ts
 *
 * 2.1.316 新增：插件来源解析。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8qpn2q62.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isLocalMarketplaceSource } from "./schemas.js";
import {
  getPluginByIdCacheOnly,
  loadKnownMarketplacesSafe,
  seedDirFor,
  tryUnwrapTextPayload,
} from "./marketplaceManager.js";
import { parsePluginIdentifier } from "./pluginIdentifier.js";
import { isLocalMarketplaceEntry } from "./pluginDirectories.js";
import { resolvePluginEntryPath, entryResolutionError } from "./localMarketplacePaths.js";

//@ chunk-8qpn2q62.js:319-483 placement
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
//@ chunk-8qpn2q62.js:483-942 placement
/**
 * 根据缓存的市场条目判断插件来源：本地市场内的相对路径插件解析成目录路径；其他来源返回 copy； 本地市场条目解析失败时返回 unresolved 与原因。
 */
async function resolvePluginSourceLocation(pluginId, storageV5) {
  let [pluginByIdCacheOnly, knownMarketplaces] = await Promise.all([
    getPluginByIdCacheOnly(pluginId, storageV5),
    loadKnownMarketplacesSafe(storageV5),
  ]);
  let source = knownMarketplaces[parsePluginIdentifier(pluginId).marketplace ?? ""]?.source;
  if (pluginByIdCacheOnly === null) return unresolvedForLocalMarketplace(source);
  let { source: source_2 } = pluginByIdCacheOnly.entry;
  let isLocalEntry = isLocalMarketplaceEntry(source_2, source);
  if (typeof source_2 !== "string" || !isLocalEntry)
    return {
      kind: "copy",
    };
  let space =
    seedDirFor(pluginByIdCacheOnly.marketplaceInstallLocation) === undefined ? "workspace" : "system";
  let pluginEntryPath = await resolvePluginEntryPath(
    pluginId,
    pluginByIdCacheOnly.marketplaceInstallLocation,
    source_2,
    knownMarketplaces,
    tryUnwrapTextPayload(),
    storageV5,
    space,
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

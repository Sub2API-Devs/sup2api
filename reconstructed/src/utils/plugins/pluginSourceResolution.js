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
import { L2e } from "./pluginDirectories.js";
import { resolvePluginEntryPath, entryResolutionError } from "./localMarketplacePaths.js";

//@ chunk-vbctfrwr.js:319-483 placement
function unresolvedForLocalMarketplace(e) {
  return e !== void 0 && isLocalMarketplaceSource(e)
    ? {
        kind: "unresolved",
        reason: "Its marketplace is a folder whose catalog could not be read, or lists it no more.",
      }
    : { kind: "copy" };
}
/**
 * 根据缓存的市场条目判断插件来源：本地市场内的相对路径插件解析成目录路径；其他来源返回 copy； 本地市场条目解析失败时返回 unresolved 与原因。
 */
//@ chunk-vbctfrwr.js:483-942 placement
async function resolvePluginSourceLocation(e, o) {
  let [r, l] = await Promise.all([getPluginByIdCacheOnly(e, o), loadKnownMarketplacesSafe(o)]),
    n = l[parsePluginIdentifier(e).marketplace ?? ""]?.source;
  if (r === null) return unresolvedForLocalMarketplace(n);
  let { source: source } = r.entry,
    c = L2e(source, n);
  if (typeof source !== "string" || !c) return { kind: "copy" };
  let i = seedDirFor(r.marketplaceInstallLocation) === void 0 ? "workspace" : "system",
    a = await resolvePluginEntryPath(
      e,
      r.marketplaceInstallLocation,
      source,
      l,
      tryUnwrapTextPayload(),
      o,
      i,
    );
  return a.kind === "ok"
    ? { kind: "folder", path: a.entryPath }
    : { kind: "unresolved", reason: entryResolutionError(a, r.marketplaceInstallLocation, source).message };
}

export { resolvePluginSourceLocation };

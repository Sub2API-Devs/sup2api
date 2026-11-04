/**
 * utils/plugins/orphanedPluginFilter.ts
 *
 * 为 Grep/Glob 生成排除插件缓存中孤儿版本目录的 glob。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/orphanedPluginFilter.ts
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: fingerprint 1, placement 3
 */
import { normalize, dirname, isAbsolute, relative, sep } from "path";
import { realpath, readdir } from "fs/promises";
import { getPluginRegistry } from "./pluginLoadState.js";
import { projectPluginCacheDir } from "./pluginCachePaths.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { isENOENT } from "../errors.js";
import { ripGrep_2, ripgrepStorageOverride } from "../ripgrep.js";
import { ORPHAN_MARKER_FILE } from "./cacheUtils.js";

//@ chunk-e6aww6q8.js:1435631-1436326 fingerprint (2.1.88 match: getGlobExclusionsForPluginCache, 0.908)
/**
 * 为 Grep/Glob 生成排除插件缓存里孤儿版本目录的 glob（避免搜到已废弃的旧版本）。
 */
async function getGlobExclusionsForPluginCache(searchPath, target) {
  let pluginRegistry = getPluginRegistry();
  let cachePath = normalize(projectPluginCacheDir());
  if (
    searchPath &&
    !(
      pathsOverlap(searchPath, cachePath) ||
      pathsOverlap(searchPath, await realpath(cachePath).catch(() => cachePath))
    )
  )
    return [];
  if (pluginRegistry.orphanedVersionGlobExclusions !== null)
    return pluginRegistry.orphanedVersionGlobExclusions;
  try {
    if (
      !(isStorageV5Enabled() && target !== undefined) &&
      (await readdir(cachePath).then((entries) => entries.length === 0, isENOENT))
    ) {
      pluginRegistry.orphanedVersionGlobExclusions = [];
      return pluginRegistry.orphanedVersionGlobExclusions;
    }
    let markers = await ripGrep_2(
      ["--files", "--hidden", "--no-ignore", "--max-depth", "4", "--glob", ORPHAN_MARKER_FILE],
      cachePath,
      new AbortController().signal,
      {
        cwd: ripgrepStorageOverride(target),
      },
    );
    pluginRegistry.orphanedVersionGlobExclusions = markers.map((markerPath) => {
      let versionDir = dirname(markerPath);
      return `!**/${(isAbsolute(versionDir) ? relative(cachePath, versionDir) : versionDir).replaceAll("\\", "/")}/**`;
    });
    return pluginRegistry.orphanedVersionGlobExclusions;
  } catch {
    pluginRegistry.orphanedVersionGlobExclusions = [];
    return pluginRegistry.orphanedVersionGlobExclusions;
  }
}
//@ chunk-e6aww6q8.js:1436326-1436381 placement
/**
 * clearOrphanedGlobExclusions：清空孤儿版本 glob 排除缓存。
 */
function clearOrphanedGlobExclusions() {
  getPluginRegistry().orphanedVersionGlobExclusions = null;
}
//@ chunk-e6aww6q8.js:1436381-1436490 placement
function pathsOverlap(a, b) {
  let na = normalizeGlobPath(a);
  let nb = normalizeGlobPath(b);
  return na === nb || na === sep || nb === sep || na.startsWith(nb + sep) || nb.startsWith(na + sep);
}
//@ chunk-e6aww6q8.js:1436490-1436520 placement
function normalizeGlobPath(globPath) {
  return normalize(globPath);
}
export { getGlobExclusionsForPluginCache, clearOrphanedGlobExclusions };

/**
 * cli/print/pluginDirReload.ts
 *
 * 2.1.316 新增：--plugin-dir 插件目录加入/重载时的缓存影响记录与沙箱重建
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (3)
 * attribution: placement 3
 */
import { computePluginReloadImpact } from "../../utils/plugins/reloadImpact.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { refreshActivePlugins } from "../../utils/plugins/refresh.js";
import { getInlinePlugins, setInlinePlugins } from "../../bootstrap/state.js";
import { mergePluginDirs } from "../../utils/plugins/pluginDirsEnv.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";

//@ chunk-0sfjpx19.js:128792-129161 placement
async function logPluginDirReload(e, { storageV5, credentials, ...s }) {
  try {
    let { wouldInvalidateCache } = await computePluginReloadImpact({
      ...s,
      storageV5,
      credentials,
    });
    if (wouldInvalidateCache) {
      e.markNeedsRefresh();
      logFeatureSad("plugin_dir_folder_reload", "cache_impact");
      return "held";
    }
    await refreshActivePlugins(e, storageV5, credentials, {
      applyStagedInstalls: false,
    });
    logFeatureOk("plugin_dir_folder_reload");
    return "reloaded";
  } catch (error) {
    logFeatureBad("plugin_dir_folder_reload", "refresh_failed");
    throw error;
  }
}
//@ chunk-0sfjpx19.js:129161-129280 placement
/**
 * 把插件目录加入内联插件列表并重建沙箱（目录已在列表中则不变），返回可撤销的修改。
 */
async function addPluginDirAndRebuildSandbox(e) {
  await rebuildSandboxForPluginDir(() => {
    let inlinePlugins = getInlinePlugins();
    let r = mergePluginDirs(inlinePlugins, [e]);
    if (r.length === mergePluginDirs(inlinePlugins).length) return;
    setInlinePlugins(r);
    return () => setInlinePlugins(inlinePlugins);
  });
}
//@ chunk-0sfjpx19.js:129280-129913 placement
/**
 * 插件目录加入后重建沙箱以把 shell 命令挡在插件根之外。
 */
async function rebuildSandboxForPluginDir(e) {
  let pluginRegistry = getPluginRegistry();
  while (pluginRegistry.sandboxBringUp !== undefined) await pluginRegistry.sandboxBringUp;
  let r = e();
  if (r === undefined) return;
  let s;
  try {
    s = pluginRegistry.denyJoinedPluginRoot?.();
  } catch (error) {
    r();
    throw error;
  }
  switch (s) {
    case undefined:
    case "installed":
      return;
    case "rebuild_failed":
      r();
      throw Error(
        "the sandbox could not be rebuilt to keep shell commands out of this folder, so it was not added to the session; check the sandbox settings with /sandbox, then try again",
      );
    case "stamped_at_start":
      r();
      throw Error(
        "on Windows the sandbox cannot keep shell commands out of a folder added after it started, so it was not added to the session; start a new session to load it",
      );
  }
}
export { logPluginDirReload, addPluginDirAndRebuildSandbox, rebuildSandboxForPluginDir };

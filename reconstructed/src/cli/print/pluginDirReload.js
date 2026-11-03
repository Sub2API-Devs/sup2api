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
async function logPluginDirReload(e, { storageV5: storageV5, credentials: credentials, ...s }) {
  try {
    let { wouldInvalidateCache: wouldInvalidateCache } = await computePluginReloadImpact({
      ...s,
      storageV5: storageV5,
      credentials: credentials,
    });
    if (wouldInvalidateCache)
      return (e.markNeedsRefresh(), logFeatureSad("plugin_dir_folder_reload", "cache_impact"), "held");
    return (
      await refreshActivePlugins(e, storageV5, credentials, { applyStagedInstalls: !1 }),
      logFeatureOk("plugin_dir_folder_reload"),
      "reloaded"
    );
  } catch (error) {
    throw (logFeatureBad("plugin_dir_folder_reload", "refresh_failed"), error);
  }
}
/**
 * 把插件目录加入内联插件列表并重建沙箱（目录已在列表中则不变），返回可撤销的修改。
 */
//@ chunk-0sfjpx19.js:129161-129280 placement
async function addPluginDirAndRebuildSandbox(e) {
  await rebuildSandboxForPluginDir(() => {
    let n = getInlinePlugins(),
      r = mergePluginDirs(n, [e]);
    if (r.length === mergePluginDirs(n).length) return;
    return (setInlinePlugins(r), () => setInlinePlugins(n));
  });
}
/**
 * 插件目录加入后重建沙箱以把 shell 命令挡在插件根之外。
 */
//@ chunk-0sfjpx19.js:129280-129913 placement
async function rebuildSandboxForPluginDir(e) {
  let n = getPluginRegistry();
  while (n.sandboxBringUp !== void 0) await n.sandboxBringUp;
  let r = e();
  if (r === void 0) return;
  let s;
  try {
    s = n.denyJoinedPluginRoot?.();
  } catch (error) {
    throw (r(), error);
  }
  switch (s) {
    case void 0:
    case "installed":
      return;
    case "rebuild_failed":
      throw (
        r(),
        Error(
          "the sandbox could not be rebuilt to keep shell commands out of this folder, so it was not added to the session; check the sandbox settings with /sandbox, then try again",
        )
      );
    case "stamped_at_start":
      throw (
        r(),
        Error(
          "on Windows the sandbox cannot keep shell commands out of a folder added after it started, so it was not added to the session; start a new session to load it",
        )
      );
  }
}

export { logPluginDirReload, addPluginDirAndRebuildSandbox, rebuildSandboxForPluginDir };

/**
 * utils/codeMode/modStartupCheck.ts
 *
 * 启动时检查已装插件是否有检查工具调用的 mod（按是否允许加入会话扫描走两条路径）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d775357q.js (1)
 * attribution: placement 1
 */
import { loadAllPluginsCacheOnly, loadAllPluginsForPreview } from "../plugins/pluginLoader.js";
import { hasHookingPlugin } from "./modHooksGate.js";
import { setAdditionalDirectoriesForClaudeMd } from "../../bootstrap/state.js";
import { initBuiltinPlugins } from "../plugins/pluginPolicyColdStart.js";

//@ chunk-d775357q.js:13053-13233 placement
/**
 * 启动时检查已装插件里是否有检查工具调用的 mod：按是否允许加入会话扫描走两条读法。
 */
async function hasHookingPluginsForPreview({ mayJoinSessionsScan, addDir, storageV5, credentials }) {
  if (mayJoinSessionsScan) {
    let { enabled } = await loadAllPluginsCacheOnly(storageV5, credentials);
    return hasHookingPlugin(enabled);
  }
  setAdditionalDirectoriesForClaudeMd(addDir);
  initBuiltinPlugins();
  let { enabled } = await loadAllPluginsForPreview(storageV5);
  return hasHookingPlugin(enabled);
}
export { hasHookingPluginsForPreview };

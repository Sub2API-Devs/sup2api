/**
 * utils/plugins/functionHooks/hookRegistration.ts
 *
 * 2.1.316 新增。函数钩子注册。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6txwcq2p.js (4)
 * attribution: placement 4
 */
import { isHookRegistrationPending } from "../loadPluginHooks.js";
import { Rbn } from "../../telemetry/sessionTracing.js";
import { logError } from "../../log.js";
import { toError } from "../../errors.js";
import { getPluginRegistry } from "../pluginLoadState.js";
import { oae } from "../../hooks.js";
import { hasLink } from "../../hasLink.js";
import { sdr } from "../managedPlugins.js";

//@ chunk-6txwcq2p.js:480-544 placement
function n() {
  try {
    return isHookRegistrationPending() && Rbn();
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
/**
 * 对比快照：快照时注册未知、当前仍未知、或注册代次/已加载模块变化且有相关钩子时返回 true；出错保守返回 true。
 */
//@ chunk-6txwcq2p.js:544-709 placement
function hasHookRegistrationChanged(r) {
  try {
    let o = getPluginRegistry(),
      e = o.hookRegistrationEpoch !== r.epoch || o.loadedModules !== r.modules;
    return r.wasUnknown || n() || (e && oae() && Rbn());
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
/**
 * 是否有插件模块订阅 prompt.submit（或未到 run 时的 command.run）。
 */
//@ chunk-6txwcq2p.js:709-906 placement
function hasPromptSubmitHooks({ isRunReached: isRunReached }) {
  try {
    return (
      n() ||
      getPluginRegistry().loadedModules.some(
        (loadedModule) =>
          !hasLink(loadedModule) &&
          sdr(loadedModule.args.pluginStorageId) &&
          (loadedModule.hooks("prompt.submit") || (!isRunReached && loadedModule.hooks("command.run"))),
      )
    );
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
/**
 * 记录钩子注册代次与已加载模块。
 */
//@ chunk-6txwcq2p.js:906-1008 placement
function snapshotHookRegistration() {
  let r = getPluginRegistry();
  return { wasUnknown: n(), epoch: r.hookRegistrationEpoch, modules: r.loadedModules };
}

export { snapshotHookRegistration, hasHookRegistrationChanged, hasPromptSubmitHooks };

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
import { hasManagedPluginsSafe } from "../../telemetry/sessionTracing.js";
import { logError } from "../../log.js";
import { toError } from "../../errors.js";
import { getPluginRegistry } from "../pluginLoadState.js";
import { areHooksEnabled } from "../../hooks.js";
import { hasLink } from "../../hasLink.js";
import { isManagedOrPolicyBlocked } from "../managedPlugins.js";

//@ chunk-6txwcq2p.js:480-544 placement
function hasPendingHookRegistration() {
  try {
    return isHookRegistrationPending() && hasManagedPluginsSafe();
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-6txwcq2p.js:544-709 placement
/**
 * 对比快照：快照时注册未知、当前仍未知、或注册代次/已加载模块变化且有相关钩子时返回 true；出错保守返回 true。
 */
function hasHookRegistrationChanged(snapshot) {
  try {
    let pluginRegistry = getPluginRegistry();
    let changed =
      pluginRegistry.hookRegistrationEpoch !== snapshot.epoch ||
      pluginRegistry.loadedModules !== snapshot.modules;
    return (
      snapshot.wasUnknown ||
      hasPendingHookRegistration() ||
      (changed && areHooksEnabled() && hasManagedPluginsSafe())
    );
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-6txwcq2p.js:709-906 placement
/**
 * 是否有插件模块订阅 prompt.submit（或未到 run 时的 command.run）。
 */
function hasPromptSubmitHooks({ isRunReached }) {
  try {
    return (
      hasPendingHookRegistration() ||
      getPluginRegistry().loadedModules.some(
        (loadedModule) =>
          !hasLink(loadedModule) &&
          isManagedOrPolicyBlocked(loadedModule.args.pluginStorageId) &&
          (loadedModule.hooks("prompt.submit") || (!isRunReached && loadedModule.hooks("command.run"))),
      )
    );
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-6txwcq2p.js:906-1008 placement
/**
 * 记录钩子注册代次与已加载模块。
 */
function snapshotHookRegistration() {
  let pluginRegistry = getPluginRegistry();
  return {
    wasUnknown: hasPendingHookRegistration(),
    epoch: pluginRegistry.hookRegistrationEpoch,
    modules: pluginRegistry.loadedModules,
  };
}
export { snapshotHookRegistration, hasHookRegistrationChanged, hasPromptSubmitHooks };

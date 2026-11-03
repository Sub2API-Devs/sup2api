/**
 * plugins/hooksModules/loadedModuleFilters.ts
 *
 * 2.1.316 新增：已加载 hooks 模块的过滤辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-57kgd85y.js (1), chunk-hde26vvz.js (2), chunk-jahwkg2g.js (2)
 * attribution: placement 5
 */
import { SEC_DEFAULT_PLUGIN_NAME } from "../../utils/plugins/securityDefaultPlugin.js";
import { hasLink } from "../../utils/hasLink.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { isModuleAdmitted } from "../../utils/plugins/functionHooks/admission.js";
import { lookupPathTable } from "../../utils/pathTable.js";
import { matchesFields } from "../../utils/hooks/functionHookMatchers.js";

//@ chunk-hde26vvz.js:300-333 placement
/**
 * 是否 sec-default 模块
 */
var isSecDefaultModule = (loadedModule) =>
  loadedModule.name === SEC_DEFAULT_PLUGIN_NAME && hasLink(loadedModule);
//@ chunk-hde26vvz.js:333-486 placement
/**
 * 返回给定钩子位置可用的已加载模块；classic.* 与 tool.describe/call/check 位置会排除特定类别的模块。
 */
var getLoadedModulesForSite = (o) => {
  let e = o.startsWith("classic.") || o === "tool.describe" || o === "tool.call" || o === "tool.check";
  return getPluginRegistry().loadedModules.filter((loadedModule) => !(e && isSecDefaultModule(loadedModule)));
};
//@ chunk-jahwkg2g.js:263-324 placement
/**
 * 按名字找已加载模块
 */
var findLoadedModule = (o) =>
  getPluginRegistry().loadedModules.find(
    (loadedModule) => loadedModule.name === o && isModuleAdmitted(loadedModule),
  );
//@ chunk-jahwkg2g.js:324-349 placement
/**
 * 取模块参数
 */
var loadedModuleArgs = (o) => findLoadedModule(o)?.args;
//@ chunk-57kgd85y.js:337-471 placement
/**
 * 判断是否有已加载的函数钩子模块挂接了指定位置（且模块处于启用状态）；给出匹配目标时还需该模块的匹配器命中。被大量钩子点用作快速短路检查。
 */
function hasModuleHookingSite(o, e, loadedModulesForSite) {
  let t = e && lookupPathTable(o);
  return (loadedModulesForSite ?? getPluginRegistry().loadedModules).some(
    (r) => r.hooks(o) && isModuleAdmitted(r) && (e === undefined || matchesFields(r.matcherFor(o), e, t)),
  );
}
export {
  hasModuleHookingSite,
  getLoadedModulesForSite,
  loadedModuleArgs,
  findLoadedModule,
  isSecDefaultModule,
};

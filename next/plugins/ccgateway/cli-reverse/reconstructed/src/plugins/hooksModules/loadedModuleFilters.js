/**
 * plugins/hooksModules/loadedModuleFilters.ts
 *
 * 2.1.316 新增：已加载 hooks 模块的过滤辅助
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cjaaaha5.js (1), chunk-hmqfvhkd.js (2), chunk-qzkfqg75.js (2)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lookupPathTable } from "../../utils/pathTable.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { isModuleAdmitted } from "../../utils/plugins/functionHooks/admission.js";
import { matchWithPathTable } from "./loadedModuleMatchers.js";
import { SEC_DEFAULT_PLUGIN_NAME } from "../../utils/plugins/securityDefaultPlugin.js";
import { hasLink } from "../../utils/hasLink.js";
import { CC_PLUGIN_PRIVACY } from "./privacyPluginName.js";

//@ chunk-cjaaaha5.js:449-571 placement
/**
 * 判断是否有已加载的函数钩子模块挂接了指定位置（且模块处于启用状态）；给出匹配目标时还需该模块的匹配器命中。被大量钩子点用作快速短路检查。
 */
function hasModuleHookingSite(hookSite, matchTarget, loadedModulesForSite) {
  let pathTable = matchTarget && lookupPathTable(hookSite);
  return (loadedModulesForSite ?? getPluginRegistry().loadedModules).some(
    (loadedModule) =>
      loadedModule.hooks(hookSite) &&
      isModuleAdmitted(loadedModule) &&
      (matchTarget === undefined || matchWithPathTable(loadedModule, hookSite, matchTarget, pathTable)),
  );
}
//@ chunk-hmqfvhkd.js:263-324 placement
/**
 * 按名字找已加载模块
 */
var findLoadedModule = (moduleName) =>
  getPluginRegistry().loadedModules.find(
    (loadedModule) => loadedModule.name === moduleName && isModuleAdmitted(loadedModule),
  );
//@ chunk-hmqfvhkd.js:324-349 placement
/**
 * 取模块参数
 */
var loadedModuleArgs = (moduleName) => findLoadedModule(moduleName)?.args;
//@ chunk-qzkfqg75.js:337-370 placement
/**
 * 是否 sec-default 模块
 */
var isSecDefaultModule = (loadedModule) =>
  loadedModule.name === SEC_DEFAULT_PLUGIN_NAME && hasLink(loadedModule);
//@ chunk-qzkfqg75.js:370-565 placement
/**
 * 返回给定钩子位置可用的已加载模块；classic.* 与 tool.describe/call/check 位置会排除特定类别的模块。
 */
var getLoadedModulesForSite = (hookSite) => {
  let excludeSecDefault =
    hookSite.startsWith("classic.") ||
    hookSite === "tool.describe" ||
    hookSite === "tool.call" ||
    hookSite === "tool.check";
  return getPluginRegistry().loadedModules.filter(
    (loadedModule) =>
      !(excludeSecDefault && isSecDefaultModule(loadedModule)) &&
      !(hookSite === "tool.check" && loadedModule.name === CC_PLUGIN_PRIVACY && hasLink(loadedModule)),
  );
};
export {
  hasModuleHookingSite,
  getLoadedModulesForSite,
  isSecDefaultModule,
  findLoadedModule,
  loadedModuleArgs,
};

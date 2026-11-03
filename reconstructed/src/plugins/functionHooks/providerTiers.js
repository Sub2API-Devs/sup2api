/**
 * plugins/functionHooks/providerTiers.ts
 *
 * 2.1.316 新增：钩子提供者层级（managed/prepend/user）排序
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { pluginTier, N5e } from "./dispatch/chain.js";
import { getVouchedPolicyPluginIds, resolveManagedPluginOrder } from "../../utils/plugins/managedPlugins.js";
import { SETTING_SOURCES } from "../../utils/settings/constants.js";
import { moduleStore } from "../../services/mcp/mcpClientCapabilities.js";
import { resolvePluginStorageId, isPluginLocalCommand_2, pluginCommandRegistry } from "./commandHooks.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { nfcLower } from "../../utils/stringUtils.js";
import { hasTrustedOnlyBuiltinPlugin } from "../../utils/plugins/loadPluginHooks.js";
import { tierIndex } from "./dispatch/valueSizing.js";

//@ chunk-e6aww6q8.js:54143-54204 placement
/**
 * 插件提供者层级
 */
var providerTierOf = (e) =>
  Object.freeze({
    plugin: e,
    tier: pluginTier(e, getVouchedPolicyPluginIds(), resolveManagedPluginOrder()),
  });
//@ chunk-e6aww6q8.js:54204-54323 placement
var settingsSourceProvider = (source) =>
  Object.freeze({
    plugin: source.endsWith("Settings") ? source.slice(0, -8) : source,
    tier: source === "policySettings" ? "prepend" : "user",
  });
//@ chunk-e6aww6q8.js:54323-54380 placement
var xP = Object.freeze({
  plugin: "unplaced",
  tier: "prepend",
});
//@ chunk-e6aww6q8.js:54380-54525 placement = _temp1 (1)
/**
 * 代理定义的提供者与层级：内置为 engine，设置来源按来源，插件代理按插件层级。
 */
function agentProvider(a_9) {
  if (a_9.source === "built-in") return N5e;
  if (a_9.plugin === undefined)
    return SETTING_SOURCES.some((r) => r === a_9.source) ? settingsSourceProvider(a_9.source) : xP;
  return providerTierOf(a_9.plugin);
}
//@ chunk-e6aww6q8.js:55434-55482 placement
var Myt = Object.freeze(["enterprise", "managed"]);
//@ chunk-e6aww6q8.js:56202-56497 placement
/**
 * MCP 服务器的提供者：企业/托管范围为 prepend，插件提供的按插件层级，其余为 user。
 */
function mcpServerProvider(e) {
  if (e.scope !== undefined && Myt.includes(e.scope))
    return Object.freeze({
      plugin: `mcp:${e.name}`,
      tier: "prepend",
    });
  if (e.pluginSource !== undefined) return providerTierOf(e.pluginSource);
  let r = moduleStore.ownerOfKey(e.name);
  if (r === undefined)
    return Object.freeze({
      plugin: `mcp:${e.name}`,
      tier: "user",
    });
  return providerTierOf(resolvePluginStorageId(r));
}
//@ chunk-e6aww6q8.js:56497-57170 placement
/**
 * 命令的提供者与层级：MCP 命令按服务器，插件登记的按插件，本地命令为 engine，提示命令按插件或设置来源。
 */
function commandProvider(e) {
  if (e.mcpInfo !== undefined)
    return mcpServerProvider({
      name: e.mcpInfo.serverName,
      scope: e.mcpInfo.scope,
      pluginSource: e.mcpInfo.pluginSource,
    });
  let n = isPluginLocalCommand_2(e);
  let r = n ? pluginCommandRegistry.ownerOf(e.name) : undefined;
  if (r !== undefined) return providerTierOf(resolvePluginStorageId(r));
  if (n || e.isMcp === true || e.loadedFrom === "mcp") return xP;
  switch (e.type) {
    case "local":
    case "local-jsx":
      return N5e;
    case "prompt":
      break;
    default:
      return xP;
  }
  if (e.pluginInfo !== undefined) return providerTierOf(e.pluginInfo.repository);
  switch (e.source) {
    case "builtin":
    case "bundled":
      return N5e;
    case "mcp":
    case "plugin":
      return xP;
    case "userSettings":
    case "projectSettings":
    case "localSettings":
    case "flagSettings":
    case "policySettings":
    case "memoryStore":
      return settingsSourceProvider(e.source);
    default:
      e.source;
      return xP;
  }
}
//@ chunk-e6aww6q8.js:57170-57418 placement
/**
 * 工具的提供者：非 MCP 工具为 engine，MCP 工具按所属服务器。
 */
async function toolProvider(e) {
  if (!(e.isMcp === true || e.mcpInfo !== undefined)) return N5e;
  let serverName = e.mcpInfo?.serverName ?? mcpInfoFromString(e.name)?.serverName;
  if (serverName === undefined) return xP;
  return mcpServerProvider({
    name: serverName,
    scope: e.mcpInfo?.scope ?? e.mcpInfo?.source,
    pluginSource: e.mcpInfo?.pluginSource,
  });
}
//@ chunk-e6aww6q8.js:733595-733946 placement
/**
 * 计算插件在钩子链中的排序值：层级为主，同层按 prepend/append 列表位置。
 */
function providerRank(e, n, managedPluginOrder) {
  let s =
    managedPluginOrder.outermost.length +
    managedPluginOrder.prepend.length +
    managedPluginOrder.append.length +
    1;
  let h = pluginTier(e, n, managedPluginOrder);
  let y = [];
  let S = (q) => managedPluginOrder.from.prepend === "policy" && managedPluginOrder.prepend.includes(q);
  let index = {
    prepend: [...managedPluginOrder.outermost.filter((q) => !S(q)), ...managedPluginOrder.prepend],
    append: managedPluginOrder.append,
    user: y,
    builtin: y,
  }[h].indexOf(nfcLower(e));
  let G = (h === "prepend" && index === -1) || (h === "builtin" && hasTrustedOnlyBuiltinPlugin(e)) ? 1 : 0;
  return (tierIndex(h) * 2 + G) * s + Math.max(index, 0);
}
export { providerRank, toolProvider, agentProvider, commandProvider, providerTierOf };

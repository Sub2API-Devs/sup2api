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
import { pluginTier, ENGINE_ORIGIN } from "./dispatch/chain.js";
import { getVouchedPolicyPluginIds, resolveManagedPluginOrder } from "../../utils/plugins/managedPlugins.js";
import { SETTING_SOURCES } from "../../utils/settings/constants.js";
import { moduleStore } from "../../services/mcp/mcpClientCapabilities.js";
import { resolvePluginStorageId, isPluginLocalCommand_2, pluginCommandRegistry } from "./commandHooks.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { nfcLower } from "../../utils/stringUtils.js";
import { hasTrustedOnlyBuiltinPlugin } from "../../utils/plugins/loadPluginHooks.js";
import { tierIndex } from "./dispatch/valueSizing.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:54143-54204 placement
/**
 * 插件提供者层级
 */
var providerTierOf = (plugin) =>
  Object.freeze({
    plugin,
    tier: pluginTier(plugin, getVouchedPolicyPluginIds(), resolveManagedPluginOrder()),
  });
//@ chunk-e6aww6q8.js:54204-54323 placement
var settingsSourceProvider = (source) =>
  Object.freeze({
    plugin: source.endsWith("Settings") ? source.slice(0, -8) : source,
    tier: source === "policySettings" ? "prepend" : "user",
  });
//@ chunk-e6aww6q8.js:54323-54380 placement
var UNPLACED_PROVIDER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:54323", () => {
  UNPLACED_PROVIDER = Object.freeze({
    plugin: "unplaced",
    tier: "prepend",
  });
});
//@ chunk-e6aww6q8.js:54380-54525 placement = _temp1 (1)
/**
 * 代理定义的提供者与层级：内置为 engine，设置来源按来源，插件代理按插件层级。
 */
function agentProvider(a_9) {
  if (a_9.source === "built-in") return ENGINE_ORIGIN;
  if (a_9.plugin === undefined)
    return SETTING_SOURCES.some((source) => source === a_9.source)
      ? settingsSourceProvider(a_9.source)
      : UNPLACED_PROVIDER;
  return providerTierOf(a_9.plugin);
}
//@ chunk-e6aww6q8.js:55434-55482 placement
var MANAGED_SCOPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:55434", () => {
  MANAGED_SCOPES = Object.freeze(["enterprise", "managed"]);
});
//@ chunk-e6aww6q8.js:56202-56497 placement
/**
 * MCP 服务器的提供者：企业/托管范围为 prepend，插件提供的按插件层级，其余为 user。
 */
function mcpServerProvider(server) {
  if (server.scope !== undefined && MANAGED_SCOPES.includes(server.scope))
    return Object.freeze({
      plugin: `mcp:${server.name}`,
      tier: "prepend",
    });
  if (server.pluginSource !== undefined) return providerTierOf(server.pluginSource);
  let owner = moduleStore.ownerOfKey(server.name);
  if (owner === undefined)
    return Object.freeze({
      plugin: `mcp:${server.name}`,
      tier: "user",
    });
  return providerTierOf(resolvePluginStorageId(owner));
}
//@ chunk-e6aww6q8.js:56497-57170 placement
/**
 * 命令的提供者与层级：MCP 命令按服务器，插件登记的按插件，本地命令为 engine，提示命令按插件或设置来源。
 */
function commandProvider(command) {
  if (command.mcpInfo !== undefined)
    return mcpServerProvider({
      name: command.mcpInfo.serverName,
      scope: command.mcpInfo.scope,
      pluginSource: command.mcpInfo.pluginSource,
    });
  let isPluginLocal = isPluginLocalCommand_2(command);
  let owner = isPluginLocal ? pluginCommandRegistry.ownerOf(command.name) : undefined;
  if (owner !== undefined) return providerTierOf(resolvePluginStorageId(owner));
  if (isPluginLocal || command.isMcp === true || command.loadedFrom === "mcp") return UNPLACED_PROVIDER;
  switch (command.type) {
    case "local":
    case "local-jsx":
      return ENGINE_ORIGIN;
    case "prompt":
      break;
    default:
      return UNPLACED_PROVIDER;
  }
  if (command.pluginInfo !== undefined) return providerTierOf(command.pluginInfo.repository);
  switch (command.source) {
    case "builtin":
    case "bundled":
      return ENGINE_ORIGIN;
    case "mcp":
    case "plugin":
      return UNPLACED_PROVIDER;
    case "userSettings":
    case "projectSettings":
    case "localSettings":
    case "flagSettings":
    case "policySettings":
    case "memoryStore":
      return settingsSourceProvider(command.source);
    default:
      command.source;
      return UNPLACED_PROVIDER;
  }
}
//@ chunk-e6aww6q8.js:57170-57418 placement
/**
 * 工具的提供者：非 MCP 工具为 engine，MCP 工具按所属服务器。
 */
async function toolProvider(tool) {
  if (!(tool.isMcp === true || tool.mcpInfo !== undefined)) return ENGINE_ORIGIN;
  let serverName = tool.mcpInfo?.serverName ?? mcpInfoFromString(tool.name)?.serverName;
  if (serverName === undefined) return UNPLACED_PROVIDER;
  return mcpServerProvider({
    name: serverName,
    scope: tool.mcpInfo?.scope ?? tool.mcpInfo?.source,
    pluginSource: tool.mcpInfo?.pluginSource,
  });
}
//@ chunk-e6aww6q8.js:733595-733946 placement
/**
 * 计算插件在钩子链中的排序值：层级为主，同层按 prepend/append 列表位置。
 */
function providerRank(plugin, vouchedIds, pluginOrder) {
  let tierSpan = pluginOrder.outermost.length + pluginOrder.prepend.length + pluginOrder.append.length + 1;
  let tier = pluginTier(plugin, vouchedIds, pluginOrder);
  let noPlugins = [];
  let isPolicyPrepend = (pluginName) =>
    pluginOrder.from.prepend === "policy" && pluginOrder.prepend.includes(pluginName);
  let index = {
    prepend: [
      ...pluginOrder.outermost.filter((pluginName) => !isPolicyPrepend(pluginName)),
      ...pluginOrder.prepend,
    ],
    append: pluginOrder.append,
    user: noPlugins,
    builtin: noPlugins,
  }[tier].indexOf(nfcLower(plugin));
  let isUnlistedBonus =
    (tier === "prepend" && index === -1) || (tier === "builtin" && hasTrustedOnlyBuiltinPlugin(plugin))
      ? 1
      : 0;
  return (tierIndex(tier) * 2 + isUnlistedBonus) * tierSpan + Math.max(index, 0);
}
export { providerRank, toolProvider, agentProvider, commandProvider, providerTierOf };

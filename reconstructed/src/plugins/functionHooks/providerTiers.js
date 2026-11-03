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
import { pluginTier, freeze_6 as freeze_6_2 } from "./dispatch/chain.js";
import { getVouchedPolicyPluginIds, resolveManagedPluginOrder } from "../../utils/plugins/managedPlugins.js";
import { SETTING_SOURCES } from "../../utils/settings/constants.js";
import { EN } from "../../services/mcp/mcpClientCapabilities.js";
import { resolvePluginStorageId, I1r, rbe } from "./commandHooks.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { nfcLower } from "../../utils/stringUtils.js";
import { Wq } from "../../utils/plugins/loadPluginHooks.js";
import { zRt } from "./dispatch/valueSizing.js";

//@ chunk-e6aww6q8.js:54143-54204 placement
var tKe = (e) =>
  Object.freeze({ plugin: e, tier: pluginTier(e, getVouchedPolicyPluginIds(), resolveManagedPluginOrder()) });
//@ chunk-e6aww6q8.js:54204-54323 placement
var settingsSourceProvider = (e) =>
  Object.freeze({
    plugin: e.endsWith("Settings") ? e.slice(0, -8) : e,
    tier: e === "policySettings" ? "prepend" : "user",
  });
//@ chunk-e6aww6q8.js:54323-54380 placement
var freeze = Object.freeze({ plugin: "unplaced", tier: "prepend" });
/**
 * 代理定义的提供者与层级：内置为 engine，设置来源按来源，插件代理按插件层级。
 */
//@ chunk-e6aww6q8.js:54380-54525 placement = _temp1 (1)
function agentProvider(a_9) {
  if (a_9.source === "built-in") return freeze_6_2;
  if (a_9.plugin === void 0)
    return SETTING_SOURCES.some((r) => r === a_9.source) ? settingsSourceProvider(a_9.source) : freeze;
  return tKe(a_9.plugin);
}
//@ chunk-e6aww6q8.js:55434-55482 placement
var freeze_2 = Object.freeze(["enterprise", "managed"]);
/**
 * MCP 服务器的提供者：企业/托管范围为 prepend，插件提供的按插件层级，其余为 user。
 */
//@ chunk-e6aww6q8.js:56202-56497 placement
function mcpServerProvider(e) {
  if (e.scope !== void 0 && freeze_2.includes(e.scope))
    return Object.freeze({ plugin: `mcp:${e.name}`, tier: "prepend" });
  if (e.pluginSource !== void 0) return tKe(e.pluginSource);
  let ownerOfKey = EN.ownerOfKey(e.name);
  if (ownerOfKey === void 0) return Object.freeze({ plugin: `mcp:${e.name}`, tier: "user" });
  return tKe(resolvePluginStorageId(ownerOfKey));
}
/**
 * 命令的提供者与层级：MCP 命令按服务器，插件登记的按插件，本地命令为 engine，提示命令按插件或设置来源。
 */
//@ chunk-e6aww6q8.js:56497-57170 placement
function commandProvider(e) {
  if (e.mcpInfo !== void 0)
    return mcpServerProvider({
      name: e.mcpInfo.serverName,
      scope: e.mcpInfo.scope,
      pluginSource: e.mcpInfo.pluginSource,
    });
  let n = I1r(e),
    r = n ? rbe.ownerOf(e.name) : void 0;
  if (r !== void 0) return tKe(resolvePluginStorageId(r));
  if (n || e.isMcp === !0 || e.loadedFrom === "mcp") return freeze;
  switch (e.type) {
    case "local":
    case "local-jsx":
      return freeze_6_2;
    case "prompt":
      break;
    default:
      return freeze;
  }
  if (e.pluginInfo !== void 0) return tKe(e.pluginInfo.repository);
  switch (e.source) {
    case "builtin":
    case "bundled":
      return freeze_6_2;
    case "mcp":
    case "plugin":
      return freeze;
    case "userSettings":
    case "projectSettings":
    case "localSettings":
    case "flagSettings":
    case "policySettings":
    case "memoryStore":
      return settingsSourceProvider(e.source);
    default:
      return (e.source, freeze);
  }
}
/**
 * 工具的提供者：非 MCP 工具为 engine，MCP 工具按所属服务器。
 */
//@ chunk-e6aww6q8.js:57170-57418 placement
async function toolProvider(e) {
  if (!(e.isMcp === !0 || e.mcpInfo !== void 0)) return freeze_6_2;
  let r = e.mcpInfo?.serverName ?? mcpInfoFromString(e.name)?.serverName;
  if (r === void 0) return freeze;
  return mcpServerProvider({
    name: r,
    scope: e.mcpInfo?.scope ?? e.mcpInfo?.source,
    pluginSource: e.mcpInfo?.pluginSource,
  });
}
/**
 * 计算插件在钩子链中的排序值：层级为主，同层按 prepend/append 列表位置。
 */
//@ chunk-e6aww6q8.js:733595-733946 placement
function providerRank(e, n, r) {
  let s = r.outermost.length + r.prepend.length + r.append.length + 1,
    h = pluginTier(e, n, r),
    y = [],
    S = (q) => r.from.prepend === "policy" && r.prepend.includes(q),
    index = {
      prepend: [...r.outermost.filter((q) => !S(q)), ...r.prepend],
      append: r.append,
      user: y,
      builtin: y,
    }[h].indexOf(nfcLower(e)),
    G = (h === "prepend" && index === -1) || (h === "builtin" && Wq(e)) ? 1 : 0;
  return (zRt(h) * 2 + G) * s + Math.max(index, 0);
}

export { providerRank, toolProvider, agentProvider, commandProvider, tKe };

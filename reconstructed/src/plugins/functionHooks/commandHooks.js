/**
 * plugins/functionHooks/commandHooks.ts
 *
 * 2.1.316 新增：command.run/command.describe 事件钩子接入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (13)
 * attribution: placement 13
 */
import { isModuleAdmittedByName } from "../../services/mcp/mcpClientCapabilities.js";
import { isOfficialMarketplacePlugin } from "./panes.js";
import { loadedModuleArgs } from "../hooksModules/loadedModuleFilters.js";
import { nfcLower } from "../../utils/stringUtils.js";
import { getVouchedPolicyPluginIds } from "../../utils/plugins/managedPlugins.js";
import { subscribe } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:54525-54580 placement
/**
 * 来自插件的本地命令
 */
var isPluginLocalCommand_2 = (command) => command.type === "local" && command.loadedFrom === "plugin";
//@ chunk-e6aww6q8.js:54580-54952 placement
/**
 * 插件命令登记表：只列出仍可用插件的命令，支持登记、查询与移除。
 */
function createPluginCommandRegistry() {
  let registry = new Map();
  function take(name) {
    let entry = registry.get(name);
    return entry !== undefined && isModuleAdmittedByName(entry.plugin) ? entry : undefined;
  }
  return {
    list: () => [...registry.values()].filter((holder) => isModuleAdmittedByName(holder.plugin)),
    ownerOf: (spec) => take(spec)?.plugin,
    holderOf: (owner) => registry.get(owner)?.plugin,
    specOf: (found) => take(found)?.spec,
    register: (plugin, first) => {
      registry.set(first.name, {
        plugin,
        spec: first,
      });
    },
    forget: (owned) => {
      let name = false;
      for (let [holder, entry] of registry)
        if (entry.plugin === owned) {
          registry.delete(holder);
          name = true;
        }
      return name;
    },
  };
}
//@ chunk-e6aww6q8.js:54952-54966 placement
/**
 * 插件命令登记表
 */
var pluginCommandRegistry; // deferred: uses createPluginCommandRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:54952", () => {
  pluginCommandRegistry = createPluginCommandRegistry();
});
//@ chunk-e6aww6q8.js:54966-55434 placement
/**
 * 把插件通过 $.command.register 登记的命令转换为本地命令对象；没有 command.run 钩子应答时提示插件作者补钩子。
 */
var pluginCommandToCommand = ({ plugin, spec }) => ({
  type: "local",
  name: spec.name,
  description: spec.description,
  argumentHint: spec.argumentHint,
  immediate: spec.immediate === true,
  loadedFrom: "plugin",
  ...(!isOfficialMarketplacePlugin(loadedModuleArgs(plugin)?.pluginStorageId ?? "") && {
    registeredBy: plugin,
  }),
  supportsNonInteractive: true,
  load: () =>
    Promise.resolve({
      call: () =>
        Promise.resolve({
          type: "text",
          value: `${plugin} registered /${spec.name} but no command.run hook answered it: add on("command.run", { command: "${spec.name}" }, ($, e) => ({ text: ... })) to the plugin.`,
        }),
    }),
});
//@ chunk-e6aww6q8.js:55482-55520 placement
/**
 * 插件名转存储 id
 */
var pluginStorageIdOf = (plugin) => loadedModuleArgs(plugin)?.pluginStorageId ?? plugin;
//@ chunk-e6aww6q8.js:55520-55650 placement
/**
 * 把插件名解析为存储 id（已加载插件直接取，否则按名字匹配已知插件 id）。
 */
function resolvePluginStorageId(plugin) {
  let storageId = pluginStorageIdOf(plugin);
  if (storageId !== plugin) return storageId;
  let folded = nfcLower(plugin);
  return (
    [...(getVouchedPolicyPluginIds() ?? [])].find(
      (row) => nfcLower(row.slice(0, row.lastIndexOf("@"))) === folded,
    ) ?? plugin
  );
}
//@ chunk-e6aww6q8.js:84602-84692 placement
/**
 * 命令结果对象
 */
function commandRunResult(text, context, exitCode) {
  return {
    text,
    ...(context !== undefined && {
      context,
    }),
    ...(exitCode !== undefined && {
      exitCode,
    }),
  };
}
//@ chunk-e6aww6q8.js:1661229-1661395 placement
function createCommandSetHookSlot() {
  let slot = subscribe();
  return {
    setCommandSetHooker: slot.set,
    hookedCommands: (hooker) => slot.get()?.hooked(hooker) ?? Promise.resolve(hooker),
    isCommandSetHooked: () => slot.get()?.isHooked() ?? false,
  };
}
//@ chunk-e6aww6q8.js:1661395-1661408 placement
/**
 * 命令集合钩子槽
 */
var commandSetHookSlot; // deferred: uses createCommandSetHookSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1661395", () => {
  commandSetHookSlot = createCommandSetHookSlot();
});
//@ chunk-e6aww6q8.js:1661408-1661434 placement
var hookedCommands_2; // deferred: uses commandSetHookSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1661408", () => {
  hookedCommands_2 = commandSetHookSlot.hookedCommands;
});
//@ chunk-e6aww6q8.js:1661434-1661464 placement
var isCommandSetHooked; // deferred: uses commandSetHookSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1661434", () => {
  isCommandSetHooked = commandSetHookSlot.isCommandSetHooked;
});
//@ chunk-e6aww6q8.js:1661464-1661495 placement
var setCommandSetHooker; // deferred: uses commandSetHookSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1661464", () => {
  setCommandSetHooker = commandSetHookSlot.setCommandSetHooker;
});
//@ chunk-e6aww6q8.js:1661495-1661511 placement
/**
 * 空 Map
 */
var EMPTY_COMMAND_CACHE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1661495", () => {
  EMPTY_COMMAND_CACHE = new Map();
});
export {
  isCommandSetHooked,
  pluginCommandRegistry,
  hookedCommands_2,
  pluginStorageIdOf,
  resolvePluginStorageId,
  isPluginLocalCommand_2,
  EMPTY_COMMAND_CACHE,
  pluginCommandToCommand,
  setCommandSetHooker,
  commandRunResult,
};

/**
 * plugins/functionHooks/commandHooks.ts
 *
 * 2.1.316 新增：command.run/command.describe 事件钩子接入
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (13)
 * attribution: placement 13
 */
import { isModuleAdmittedByName } from "../../services/mcp/mcpClientCapabilities.js";
import { isOfficialMarketplacePlugin } from "./panes.js";
import { loadedModuleArgs } from "../hooksModules/loadedModuleFilters.js";
import { nfcLower } from "../../utils/stringUtils.js";
import { getVouchedPolicyPluginIds } from "../../utils/plugins/managedPlugins.js";
import { subscribe } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:56981-57036 placement
/**
 * 来自插件的本地命令
 */
var isPluginLocalCommand_2 = (command) => command.type === "local" && command.loadedFrom === "plugin";
//@ chunk-5xgkngpb.js:57036-57408 placement
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
//@ chunk-5xgkngpb.js:57408-57422 placement
/**
 * 插件命令登记表
 */
var pluginCommandRegistry; // deferred: uses createPluginCommandRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:57408", () => {
  pluginCommandRegistry = createPluginCommandRegistry();
});
//@ chunk-5xgkngpb.js:57422-57890 placement
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
//@ chunk-5xgkngpb.js:57938-57976 placement
/**
 * 插件名转存储 id
 */
var pluginStorageIdOf = (plugin) => loadedModuleArgs(plugin)?.pluginStorageId ?? plugin;
//@ chunk-5xgkngpb.js:57976-58106 placement
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
//@ chunk-5xgkngpb.js:87152-87242 placement
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
//@ chunk-5xgkngpb.js:1735550-1735716 placement
function createCommandSetHookSlot() {
  let slot = subscribe();
  return {
    setCommandSetHooker: slot.set,
    hookedCommands: (hooker) => slot.get()?.hooked(hooker) ?? Promise.resolve(hooker),
    isCommandSetHooked: () => slot.get()?.isHooked() ?? false,
  };
}
//@ chunk-5xgkngpb.js:1735716-1735729 placement
/**
 * 命令集合钩子槽
 */
var commandSetHookSlot; // deferred: uses createCommandSetHookSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1735716", () => {
  commandSetHookSlot = createCommandSetHookSlot();
});
//@ chunk-5xgkngpb.js:1735729-1735755 placement
var hookedCommands_2; // deferred: uses commandSetHookSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1735729", () => {
  hookedCommands_2 = commandSetHookSlot.hookedCommands;
});
//@ chunk-5xgkngpb.js:1735755-1735785 placement
var isCommandSetHooked; // deferred: uses commandSetHookSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1735755", () => {
  isCommandSetHooked = commandSetHookSlot.isCommandSetHooked;
});
//@ chunk-5xgkngpb.js:1735785-1735816 placement
var setCommandSetHooker; // deferred: uses commandSetHookSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1735785", () => {
  setCommandSetHooker = commandSetHookSlot.setCommandSetHooker;
});
//@ chunk-5xgkngpb.js:1735816-1735832 placement
/**
 * 空 Map
 */
var EMPTY_COMMAND_CACHE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1735816", () => {
  EMPTY_COMMAND_CACHE = new Map();
});
export {
  pluginCommandRegistry,
  isPluginLocalCommand_2,
  EMPTY_COMMAND_CACHE,
  hookedCommands_2,
  pluginStorageIdOf,
  resolvePluginStorageId,
  pluginCommandToCommand,
  setCommandSetHooker,
  commandRunResult,
  isCommandSetHooked,
};

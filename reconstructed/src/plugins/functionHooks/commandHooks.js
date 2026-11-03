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
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";

//@ chunk-e6aww6q8.js:54525-54580 placement
/**
 * 来自插件的本地命令
 */
var isPluginLocalCommand_2 = (e) => e.type === "local" && e.loadedFrom === "plugin";
//@ chunk-e6aww6q8.js:54580-54952 placement
/**
 * 插件命令登记表：只列出仍可用插件的命令，支持登记、查询与移除。
 */
function createPluginCommandRegistry() {
  let e = new Map();
  function n(r) {
    let s = e.get(r);
    return s !== undefined && isModuleAdmittedByName(s.plugin) ? s : undefined;
  }
  return {
    list: () => [...e.values()].filter((r) => isModuleAdmittedByName(r.plugin)),
    ownerOf: (r) => n(r)?.plugin,
    holderOf: (r) => e.get(r)?.plugin,
    specOf: (r) => n(r)?.spec,
    register: (plugin, s) => {
      e.set(s.name, {
        plugin,
        spec: s,
      });
    },
    forget: (r) => {
      let s = false;
      for (let [h, y] of e)
        if (y.plugin === r) {
          e.delete(h);
          s = true;
        }
      return s;
    },
  };
}
//@ chunk-e6aww6q8.js:54952-54966 placement
/**
 * 插件命令登记表
 */
var pluginCommandRegistry = createPluginCommandRegistry();
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
var pluginStorageIdOf = (e) => loadedModuleArgs(e)?.pluginStorageId ?? e;
//@ chunk-e6aww6q8.js:55520-55650 placement
/**
 * 把插件名解析为存储 id（已加载插件直接取，否则按名字匹配已知插件 id）。
 */
function resolvePluginStorageId(e) {
  let n = pluginStorageIdOf(e);
  if (n !== e) return n;
  let r = nfcLower(e);
  return (
    [...(getVouchedPolicyPluginIds() ?? [])].find((s) => nfcLower(s.slice(0, s.lastIndexOf("@"))) === r) ?? e
  );
}
//@ chunk-e6aww6q8.js:84602-84692 placement
/**
 * 命令结果对象
 */
function commandRunResult(text, n, exitCode) {
  return {
    text,
    ...(n !== undefined && {
      context: n,
    }),
    ...(exitCode !== undefined && {
      exitCode,
    }),
  };
}
//@ chunk-e6aww6q8.js:1661229-1661395 placement
function createCommandSetHookSlot() {
  let e = pu();
  return {
    setCommandSetHooker: e.set,
    hookedCommands: (n) => e.get()?.hooked(n) ?? Promise.resolve(n),
    isCommandSetHooked: () => e.get()?.isHooked() ?? false,
  };
}
//@ chunk-e6aww6q8.js:1661395-1661408 placement
/**
 * 命令集合钩子槽
 */
var commandSetHookSlot = createCommandSetHookSlot();
//@ chunk-e6aww6q8.js:1661408-1661434 placement
var hookedCommands_2 = commandSetHookSlot.hookedCommands;
//@ chunk-e6aww6q8.js:1661434-1661464 placement
var isCommandSetHooked = commandSetHookSlot.isCommandSetHooked;
//@ chunk-e6aww6q8.js:1661464-1661495 placement
var setCommandSetHooker = commandSetHookSlot.setCommandSetHooker;
//@ chunk-e6aww6q8.js:1661495-1661511 placement
/**
 * 空 Map
 */
var EMPTY_COMMAND_CACHE = new Map();
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

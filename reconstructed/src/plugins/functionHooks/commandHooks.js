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
import { M$e } from "../../services/mcp/mcpClientCapabilities.js";
import { isOfficialMarketplacePlugin } from "./panes.js";
import { IT } from "../hooksModules/loadedModuleFilters.js";
import { nfcLower } from "../../utils/stringUtils.js";
import { getVouchedPolicyPluginIds } from "../../utils/plugins/managedPlugins.js";
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";

//@ chunk-e6aww6q8.js:54525-54580 placement
var I1r = (e) => e.type === "local" && e.loadedFrom === "plugin";
/**
 * 插件命令登记表：只列出仍可用插件的命令，支持登记、查询与移除。
 */
//@ chunk-e6aww6q8.js:54580-54952 placement
function createPluginCommandRegistry() {
  let e = new Map();
  function n(r) {
    let s = e.get(r);
    return s !== void 0 && M$e(s.plugin) ? s : void 0;
  }
  return {
    list: () => [...e.values()].filter((r) => M$e(r.plugin)),
    ownerOf: (r) => n(r)?.plugin,
    holderOf: (r) => e.get(r)?.plugin,
    specOf: (r) => n(r)?.spec,
    register: (r, s) => {
      e.set(s.name, { plugin: r, spec: s });
    },
    forget: (r) => {
      let s = !1;
      for (let [h, y] of e) if (y.plugin === r) (e.delete(h), (s = !0));
      return s;
    },
  };
}
//@ chunk-e6aww6q8.js:54952-54966 placement
var rbe = createPluginCommandRegistry();
/**
 * 把插件通过 $.command.register 登记的命令转换为本地命令对象；没有 command.run 钩子应答时提示插件作者补钩子。
 */
//@ chunk-e6aww6q8.js:54966-55434 placement
var pluginCommandToCommand = ({ plugin: plugin, spec: spec }) => ({
  type: "local",
  name: spec.name,
  description: spec.description,
  argumentHint: spec.argumentHint,
  immediate: spec.immediate === !0,
  loadedFrom: "plugin",
  ...(!isOfficialMarketplacePlugin(IT(plugin)?.pluginStorageId ?? "") && { registeredBy: plugin }),
  supportsNonInteractive: !0,
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
var JC = (e) => IT(e)?.pluginStorageId ?? e;
/**
 * 把插件名解析为存储 id（已加载插件直接取，否则按名字匹配已知插件 id）。
 */
//@ chunk-e6aww6q8.js:55520-55650 placement
function resolvePluginStorageId(e) {
  let n = JC(e);
  if (n !== e) return n;
  let r = nfcLower(e);
  return (
    [...(getVouchedPolicyPluginIds() ?? [])].find((s) => nfcLower(s.slice(0, s.lastIndexOf("@"))) === r) ?? e
  );
}
//@ chunk-e6aww6q8.js:84602-84692 placement
function Nde(e, n, r) {
  return { text: e, ...(n !== void 0 && { context: n }), ...(r !== void 0 && { exitCode: r }) };
}
//@ chunk-e6aww6q8.js:1661229-1661395 placement
function createCommandSetHookSlot() {
  let e = pu();
  return {
    setCommandSetHooker: e.set,
    hookedCommands: (n) => e.get()?.hooked(n) ?? Promise.resolve(n),
    isCommandSetHooked: () => e.get()?.isHooked() ?? !1,
  };
}
//@ chunk-e6aww6q8.js:1661395-1661408 placement
var VK = createCommandSetHookSlot();
//@ chunk-e6aww6q8.js:1661408-1661434 placement
var hookedCommands = VK.hookedCommands;
//@ chunk-e6aww6q8.js:1661434-1661464 placement
var isCommandSetHooked = VK.isCommandSetHooked;
//@ chunk-e6aww6q8.js:1661464-1661495 placement
var setCommandSetHooker = VK.setCommandSetHooker;
//@ chunk-e6aww6q8.js:1661495-1661511 placement
var ewe = new Map();

export {
  isCommandSetHooked,
  rbe,
  hookedCommands,
  JC,
  resolvePluginStorageId,
  I1r,
  ewe,
  pluginCommandToCommand,
  setCommandSetHooker,
  Nde,
};

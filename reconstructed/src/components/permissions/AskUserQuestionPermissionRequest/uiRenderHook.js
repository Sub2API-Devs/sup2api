/**
 * components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.ts
 *
 * 2.1.316 新增：ui.render 插件渲染钩子注册表（模组/插件渲染站点）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fzty8e18.js (23)
 * attribution: placement 23
 */
import { Ar } from "../../../../runtime/bun-runtime.js";
import { loadedModuleArgs, findLoadedModule } from "../../../plugins/hooksModules/loadedModuleFilters.js";
import { isBuiltinPluginId } from "../../../plugins/builtinPlugins.js";
import { createSignal } from "../../../utils/signal.js";
import { matchesEventPattern } from "../../../plugins/functionHooks/eventPatterns.js";
import { HOOK_EVENTS_2 } from "../../../plugins/functionHooks/hookApiSurface.js";
import { BUILTIN, INLINE_PLUGIN_MARKETPLACE } from "../../../utils/telemetry/pluginTelemetry.js";
import { pluginNameAliases } from "../../../utils/plugins/pluginIdentifier.js";

//@ chunk-fzty8e18.js:389-400 placement
var uiRenderModule = {};
//@ chunk-fzty8e18.js:400-885 placement
Ar(uiRenderModule, {
  FALLBACK_RENDER_SITE: () => ASK_USER_QUESTION_RENDER_SITE,
  activeModNames: () => getActiveModNames,
  changed: () => renderEventSignal,
  copyInterface: () => cloneInterfaceRecord,
  copyPlugin: () => clonePluginRenderRecord,
  default: () => uiRenderModule,
  devtoolsEvents: () => renderSiteMap,
  devtoolsHooks: () => listPlugins,
  devtoolsInterfaces: () => listInterfaces,
  devtoolsRenderSites: () => listRenderSites,
  failed: () => renderResultSignal,
  hooksOn: () => findPluginRenderHooks,
  latest: () => uiRenderRegistry,
  loadedArgsOf: () => loadedModuleArgs,
  loadedModuleNamed: () => findLoadedModule,
  publishHookFailure: () => emit,
  publishInterfaces: () => setRenderInterfaces,
  publishRegistry: () => setRenderPlugins,
  publishRenderSites: () => setRenderSites,
  snapshots: () => createUiRenderRegistry,
  subscribeHookFailures: () => subscribe,
  subscribeRegistry: () => subscribe_2,
});
//@ chunk-fzty8e18.js:885-958 placement
var getActiveModNames = (e) => e.filter((o) => !isBuiltinPluginId(o.args.pluginStorageId)).map((o) => o.name);
//@ chunk-fzty8e18.js:958-969 placement
var renderEventSignal = createSignal();
//@ chunk-fzty8e18.js:969-980 placement
var renderResultSignal = createSignal();
//@ chunk-fzty8e18.js:980-1076 placement
var ASK_USER_QUESTION_RENDER_SITE = {
  event: "ui.render",
  component: "AskUserQuestion",
  drawnBy: "AskUserQuestionPermissionDialog",
};
//@ chunk-fzty8e18.js:1076-1239 placement
/**
 * 创建 ui.render 渲染钩子注册表：插件列表、渲染站点（默认含 AskUserQuestion 站点）、接口列表，各带 getter/setter。
 */
function createUiRenderRegistry() {
  let e = [];
  let o = [ASK_USER_QUESTION_RENDER_SITE];
  let t = [];
  return {
    plugins: () => e,
    setPlugins: (s) => {
      e = s;
    },
    renderSites: () => o,
    setRenderSites: (s) => {
      o = s;
    },
    interfaces: () => t,
    setInterfaces: (s) => {
      t = s;
    },
  };
}
//@ chunk-fzty8e18.js:1239-1251 placement
var uiRenderRegistry = createUiRenderRegistry();
//@ chunk-fzty8e18.js:1251-1266 placement
var emit = renderResultSignal.emit;
//@ chunk-fzty8e18.js:1266-1420 placement
function cloneInterfaceRecord(e) {
  return e.owner === undefined
    ? {
        name: e.name,
        methods: [...e.methods],
        suppressedBy: e.suppressedBy,
      }
    : {
        name: e.name,
        methods: [...e.methods],
        owner: e.owner,
      };
}
//@ chunk-fzty8e18.js:1420-1523 placement
var clonePluginRenderRecord = (e) => ({
  name: e.name,
  events: [...e.events],
  calls: [...e.calls],
  tier: e.tier,
  generation: e.generation,
});
//@ chunk-fzty8e18.js:1523-1690 placement
var findPluginRenderHooks = (e) =>
  uiRenderRegistry.plugins().flatMap((o) => {
    let found = o.events.find((event) => matchesEventPattern(event, e));
    if (found === undefined) return [];
    return [
      {
        plugin: o.name,
        tier: o.tier,
        hook: found,
        generation: o.generation,
      },
    ];
  });
//@ chunk-fzty8e18.js:1690-1750 placement
function renderSiteMap() {
  let e = {};
  for (let o of HOOK_EVENTS_2) e[o] = findPluginRenderHooks(o);
  return e;
}
//@ chunk-fzty8e18.js:1750-1781 placement
var listPlugins = () => uiRenderRegistry.plugins().map(clonePluginRenderRecord);
//@ chunk-fzty8e18.js:1781-1815 placement
var listInterfaces = () => uiRenderRegistry.interfaces().map(cloneInterfaceRecord);
//@ chunk-fzty8e18.js:1815-1862 placement
var listRenderSites = () =>
  uiRenderRegistry.renderSites().map((e) => ({
    ...e,
  }));
//@ chunk-fzty8e18.js:1862-1903 placement
var setRenderInterfaces = (e) => uiRenderRegistry.setInterfaces(e.map(cloneInterfaceRecord));
//@ chunk-fzty8e18.js:1903-1956 placement
function setRenderPlugins(e) {
  uiRenderRegistry.setPlugins(e.map(clonePluginRenderRecord));
  renderEventSignal.emit(listPlugins());
}
//@ chunk-fzty8e18.js:1956-2010 placement
var setRenderSites = (e) =>
  uiRenderRegistry.setRenderSites(
    e.map((o) => ({
      ...o,
    })),
  );
//@ chunk-fzty8e18.js:2010-2030 placement
var subscribe = renderResultSignal.subscribe;
//@ chunk-fzty8e18.js:2030-2050 placement
var subscribe_2 = renderEventSignal.subscribe;
//@ chunk-fzty8e18.js:2050-2064 placement
var RENDER_SIGNALS = [BUILTIN, INLINE_PLUGIN_MARKETPLACE];
//@ chunk-fzty8e18.js:2064-2242 placement
function isBundledModLive(e) {
  return pluginNameAliases({
    name: e,
    source: `${e}@${BUILTIN}`,
  }).some((o) => {
    let loadedModule = findLoadedModule(o);
    return (
      loadedModule !== undefined &&
      loadedModule.status().kind === "live" &&
      RENDER_SIGNALS.some((s) => loadedModule.args.pluginStorageId === `${o}@${s}`)
    );
  });
}
export {
  emit,
  isBundledModLive,
  subscribe_2,
  findPluginRenderHooks,
  uiRenderModule,
  uiRenderRegistry,
  setRenderInterfaces,
  setRenderPlugins,
  subscribe,
  setRenderSites,
  getActiveModNames,
};

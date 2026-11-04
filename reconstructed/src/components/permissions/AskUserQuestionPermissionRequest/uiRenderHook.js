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
import { __export } from "../../../../runtime/bun-runtime.js";
import { loadedModuleArgs, findLoadedModule } from "../../../plugins/hooksModules/loadedModuleFilters.js";
import { isBuiltinPluginId } from "../../../plugins/builtinPlugins.js";
import { createSignal } from "../../../utils/signal.js";
import { matchesEventPattern } from "../../../plugins/functionHooks/eventPatterns.js";
import { HOOK_EVENTS_2 } from "../../../plugins/functionHooks/hookApiSurface.js";
import { BUILTIN, INLINE_PLUGIN_MARKETPLACE } from "../../../utils/telemetry/pluginTelemetry.js";
import { pluginNameAliases } from "../../../utils/plugins/pluginIdentifier.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-fzty8e18.js:389-400 placement
var uiRenderModule = {};
//@ chunk-fzty8e18.js:400-885 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fzty8e18.js:400", () => {
  __export(uiRenderModule, {
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
});
//@ chunk-fzty8e18.js:885-958 placement
var getActiveModNames = (state) =>
  state.filter((plugin) => !isBuiltinPluginId(plugin.args.pluginStorageId)).map((state) => state.name);
//@ chunk-fzty8e18.js:958-969 placement
var renderEventSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fzty8e18.js:958", () => {
  renderEventSignal = createSignal();
});
//@ chunk-fzty8e18.js:969-980 placement
var renderResultSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fzty8e18.js:969", () => {
  renderResultSignal = createSignal();
});
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
  let plugins = [];
  let renderSites = [ASK_USER_QUESTION_RENDER_SITE];
  let interfaces = [];
  return {
    plugins: () => plugins,
    setPlugins: (next) => {
      plugins = next;
    },
    renderSites: () => renderSites,
    setRenderSites: (next) => {
      renderSites = next;
    },
    interfaces: () => interfaces,
    setInterfaces: (next) => {
      interfaces = next;
    },
  };
}
//@ chunk-fzty8e18.js:1239-1251 placement
var uiRenderRegistry; // deferred: uses createUiRenderRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fzty8e18.js:1239", () => {
  uiRenderRegistry = createUiRenderRegistry();
});
//@ chunk-fzty8e18.js:1251-1266 placement
var emit; // deferred: uses renderResultSignal of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fzty8e18.js:1251", () => {
  emit = renderResultSignal.emit;
});
//@ chunk-fzty8e18.js:1266-1420 placement
function cloneInterfaceRecord(record) {
  return record.owner === undefined
    ? {
        name: record.name,
        methods: [...record.methods],
        suppressedBy: record.suppressedBy,
      }
    : {
        name: record.name,
        methods: [...record.methods],
        owner: record.owner,
      };
}
//@ chunk-fzty8e18.js:1420-1523 placement
var clonePluginRenderRecord = (record) => ({
  name: record.name,
  events: [...record.events],
  calls: [...record.calls],
  tier: record.tier,
  generation: record.generation,
});
//@ chunk-fzty8e18.js:1523-1690 placement
var findPluginRenderHooks = (eventName) =>
  uiRenderRegistry.plugins().flatMap((plugin) => {
    let found = plugin.events.find((event) => matchesEventPattern(event, eventName));
    if (found === undefined) return [];
    return [
      {
        plugin: plugin.name,
        tier: plugin.tier,
        hook: found,
        generation: plugin.generation,
      },
    ];
  });
//@ chunk-fzty8e18.js:1690-1750 placement
function renderSiteMap() {
  let byEvent = {};
  for (let eventName of HOOK_EVENTS_2) byEvent[eventName] = findPluginRenderHooks(eventName);
  return byEvent;
}
//@ chunk-fzty8e18.js:1750-1781 placement
var listPlugins = () => uiRenderRegistry.plugins().map(clonePluginRenderRecord);
//@ chunk-fzty8e18.js:1781-1815 placement
var listInterfaces = () => uiRenderRegistry.interfaces().map(cloneInterfaceRecord);
//@ chunk-fzty8e18.js:1815-1862 placement
var listRenderSites = () =>
  uiRenderRegistry.renderSites().map((site) => ({
    ...site,
  }));
//@ chunk-fzty8e18.js:1862-1903 placement
var setRenderInterfaces = (interfaces) =>
  uiRenderRegistry.setInterfaces(interfaces.map(cloneInterfaceRecord));
//@ chunk-fzty8e18.js:1903-1956 placement
function setRenderPlugins(plugins) {
  uiRenderRegistry.setPlugins(plugins.map(clonePluginRenderRecord));
  renderEventSignal.emit(listPlugins());
}
//@ chunk-fzty8e18.js:1956-2010 placement
var setRenderSites = (sites) =>
  uiRenderRegistry.setRenderSites(
    sites.map((site) => ({
      ...site,
    })),
  );
//@ chunk-fzty8e18.js:2010-2030 placement
var subscribe; // deferred: uses renderResultSignal of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fzty8e18.js:2010", () => {
  subscribe = renderResultSignal.subscribe;
});
//@ chunk-fzty8e18.js:2030-2050 placement
var subscribe_2; // deferred: uses renderEventSignal of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fzty8e18.js:2030", () => {
  subscribe_2 = renderEventSignal.subscribe;
});
//@ chunk-fzty8e18.js:2050-2064 placement
var RENDER_SIGNALS; // deferred: uses INLINE_PLUGIN_MARKETPLACE (../../../utils/telemetry/pluginTelemetry.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fzty8e18.js:2050", () => {
  RENDER_SIGNALS = [BUILTIN, INLINE_PLUGIN_MARKETPLACE];
});
//@ chunk-fzty8e18.js:2064-2242 placement
function isBundledModLive(name) {
  return pluginNameAliases({
    name,
    source: `${name}@${BUILTIN}`,
  }).some((alias) => {
    let loadedModule = findLoadedModule(alias);
    return (
      loadedModule !== undefined &&
      loadedModule.status().kind === "live" &&
      RENDER_SIGNALS.some((signal) => loadedModule.args.pluginStorageId === `${alias}@${signal}`)
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

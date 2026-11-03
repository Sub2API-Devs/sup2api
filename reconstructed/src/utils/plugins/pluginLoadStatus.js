/**
 * utils/plugins/pluginLoadStatus.ts
 *
 * 2.1.316 新增：插件加载状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7nse75qx.js (3)
 * attribution: placement 3
 */
import { mergePluginErrors } from "./refresh.js";
import { pluginErrorKey } from "../../hooks/notifs/useLspInitializationNotification.js";
import { gCn } from "../../state/sliceHelpers.js";
import { getErrorKey } from "../../services/mcp/useManageMCPConnections.js";
import { splitPluginId, pluginNamesEqual, hasMarketplaceAlias } from "./pluginIdentifier.js";
import { mergePluginRecord } from "../../plugins/functionHooks/hooksModuleLoader.js";

//@ chunk-7nse75qx.js:519-634 placement
function mergeErrorsBySource(e, t) {
  let filtered = e.filter((i) => mergePluginErrors(i.source)),
    r = new Set(t.map(pluginErrorKey));
  return [...filtered.filter((i) => !r.has(pluginErrorKey(i))), ...t];
}
//@ chunk-7nse75qx.js:743-921 placement
function mergePluginSourceErrors(e, t) {
  let filtered = e.filter((i) => i.source.startsWith("plugin:")),
    r = new Set(t.map((i) => `${i.type}:${i.source}`));
  return [...filtered.filter((i) => !r.has(`${i.type}:${i.source}`)), ...t];
}
/**
 * 封装 AppState 中 plugins 状态的更新：addErrors/addWarnings 按键去重追加，removeErrorsOf 删除指定插件的错误， markNeedsRefresh 标记需要刷新（not-loaded 另标 needsRefreshToLoad）等。over() 由 store 构造。
 */
//@ chunk-7nse75qx.js:921-2963 placement
class PluginsStateStore {
  #n;
  #t;
  constructor(e) {
    ((this.#n = e.getState), (this.#t = e.setState));
  }
  static over(e) {
    return new PluginsStateStore({ getState: e.getState, setState: gCn(e.setState) });
  }
  get() {
    return this.#n().plugins;
  }
  #e(e) {
    this.#t((t) => {
      let n = e(t.plugins);
      return n === t.plugins ? t : { ...t, plugins: n };
    });
  }
  addErrors(e) {
    if (e.length === 0) return;
    this.#e((t) => {
      let n = new Set(t.errors.map((error) => getErrorKey(error))),
        filtered = e.filter((s) => !n.has(getErrorKey(s)));
      if (filtered.length === 0) return t;
      return { ...t, errors: [...t.errors, ...filtered] };
    });
  }
  removeErrorsOf(e) {
    if (e.length === 0) return;
    let mapped = e.map((n) => ({ id: n, ...splitPluginId(n) }));
    this.#e((n) => {
      let filtered = n.errors.filter((error) => {
        let marketplace = splitPluginId(error.source).marketplace;
        return !mapped.some(
          (o) =>
            pluginNamesEqual(error.source, o.id) ||
            ("plugin" in error &&
              error.plugin === o.name &&
              !hasMarketplaceAlias(error.source) &&
              (marketplace === void 0 || marketplace === o.marketplace)),
        );
      });
      return filtered.length === n.errors.length ? n : { ...n, errors: filtered };
    });
  }
  addWarnings(e) {
    if (e.length === 0) return;
    this.#e((t) => {
      let n = new Set(t.warnings.map((warning) => getErrorKey(warning))),
        filtered = e.filter((s) => !n.has(getErrorKey(s)));
      if (filtered.length === 0) return t;
      return { ...t, warnings: [...t.warnings, ...filtered] };
    });
  }
  markNeedsRefresh(e = "changed") {
    this.#e((t) => {
      if (e === "not-loaded")
        return t.needsRefresh && t.needsRefreshToLoad === !0
          ? t
          : { ...t, needsRefresh: !0, needsRefreshToLoad: !0 };
      return t.needsRefresh ? t : { ...t, needsRefresh: !0 };
    });
  }
  retarget(e) {
    this.#e((t) => {
      let index = t.enabled.findIndex((i) => i.source === e.source && i.path === e.path),
        r = t.enabled[index];
      if (r === void 0) return t;
      let s = mergePluginRecord(r, e);
      if (s === r) return t;
      return { ...t, enabled: t.enabled.with(index, s) };
    });
  }
  setPendingMarketplaces(e) {
    this.#e((t) => ({
      ...t,
      installationStatus: { marketplaces: e.map((n) => ({ name: n, status: "pending" })), plugins: [] },
    }));
  }
  setMarketplaceStatus(e, t, n) {
    this.#e((r) => ({
      ...r,
      installationStatus: {
        ...r.installationStatus,
        marketplaces: r.installationStatus.marketplaces.map((marketplace) =>
          marketplace.name === e ? { ...marketplace, status: t, error: n } : marketplace,
        ),
      },
    }));
  }
  applyRefresh(e) {
    this.#t((t) => ({
      ...t,
      plugins: {
        ...t.plugins,
        enabled: e.enabled,
        disabled: e.disabled,
        commands: e.commands,
        errors: mergeErrorsBySource(t.plugins.errors, e.errors),
        warnings: mergePluginSourceErrors(t.plugins.warnings, e.warnings),
        needsRefresh: !1,
        needsRefreshToLoad: void 0,
      },
      agentDefinitions: e.agentDefinitions,
      mcp: { ...t.mcp, pluginReconnectKey: t.mcp.pluginReconnectKey + 1 },
    }));
  }
}

export { PluginsStateStore };

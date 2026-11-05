/**
 * utils/plugins/pluginLoadStatus.ts
 *
 * 2.1.316 新增：插件加载状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a8hqqf13.js (3)
 * attribution: placement 3
 */
import { mergePluginErrors } from "./refresh.js";
import { pluginErrorKey } from "../../hooks/notifs/useLspInitializationNotification.js";
import { mergeSlicePatch } from "../../state/sliceHelpers.js";
import { getErrorKey } from "../../services/mcp/useManageMCPConnections.js";
import { splitPluginId, pluginNamesEqual, hasMarketplaceAlias } from "./pluginIdentifier.js";
import { mergePluginRecord } from "../../plugins/functionHooks/hooksModuleLoader.js";

//@ chunk-a8hqqf13.js:520-635 placement
function mergeErrorsBySource(errors, errors_2) {
  let filtered = errors.filter((error) => mergePluginErrors(error.source));
  let keys = new Set(errors_2.map(pluginErrorKey));
  return [...filtered.filter((error) => !keys.has(pluginErrorKey(error))), ...errors_2];
}
//@ chunk-a8hqqf13.js:744-922 placement
function mergePluginSourceErrors(warnings, warnings_2) {
  let filtered = warnings.filter((warning) => warning.source.startsWith("plugin:"));
  let keys = new Set(warnings_2.map((warning) => `${warning.type}:${warning.source}`));
  return [...filtered.filter((warning) => !keys.has(`${warning.type}:${warning.source}`)), ...warnings_2];
}
//@ chunk-a8hqqf13.js:922-2965 placement
/**
 * 封装 AppState 中 plugins 状态的更新：addErrors/addWarnings 按键去重追加，removeErrorsOf 删除指定插件的错误， markNeedsRefresh 标记需要刷新（not-loaded 另标 needsRefreshToLoad）等。over() 由 store 构造。
 */
class PluginsStateStore {
  #n;
  #t;
  constructor(host) {
    this.#n = host.getState;
    this.#t = host.setState;
  }
  static over(store) {
    return new PluginsStateStore({
      getState: store.getState,
      setState: mergeSlicePatch(store.setState),
    });
  }
  get() {
    return this.#n().plugins;
  }
  #e(mutate) {
    this.#t((state) => {
      let plugins = mutate(state.plugins);
      return plugins === state.plugins
        ? state
        : {
            ...state,
            plugins,
          };
    });
  }
  addErrors(errors) {
    if (errors.length === 0) return;
    this.#e((plugins) => {
      let keys = new Set(plugins.errors.map((error) => getErrorKey(error)));
      let filtered = errors.filter((error) => !keys.has(getErrorKey(error)));
      if (filtered.length === 0) return plugins;
      return {
        ...plugins,
        errors: [...plugins.errors, ...filtered],
      };
    });
  }
  removeErrorsOf(pluginIds) {
    if (pluginIds.length === 0) return;
    let mapped = pluginIds.map((id) => ({
      id,
      ...splitPluginId(id),
    }));
    this.#e((plugins) => {
      let filtered = plugins.errors.filter((error) => {
        let marketplace = splitPluginId(error.source).marketplace;
        return !mapped.some(
          (target) =>
            pluginNamesEqual(error.source, target.id) ||
            ("plugin" in error &&
              error.plugin === target.name &&
              !hasMarketplaceAlias(error.source) &&
              (marketplace === undefined || marketplace === target.marketplace)),
        );
      });
      return filtered.length === plugins.errors.length
        ? plugins
        : {
            ...plugins,
            errors: filtered,
          };
    });
  }
  addWarnings(warnings) {
    if (warnings.length === 0) return;
    this.#e((plugins) => {
      let keys = new Set(plugins.warnings.map((warning) => getErrorKey(warning)));
      let filtered = warnings.filter((warning) => !keys.has(getErrorKey(warning)));
      if (filtered.length === 0) return plugins;
      return {
        ...plugins,
        warnings: [...plugins.warnings, ...filtered],
      };
    });
  }
  markNeedsRefresh(reason = "changed") {
    this.#e((plugins) => {
      if (reason === "not-loaded")
        return plugins.needsRefresh && plugins.needsRefreshToLoad === true
          ? plugins
          : {
              ...plugins,
              needsRefresh: true,
              needsRefreshToLoad: true,
            };
      return plugins.needsRefresh
        ? plugins
        : {
            ...plugins,
            needsRefresh: true,
          };
    });
  }
  retarget(patch) {
    this.#e((plugins) => {
      let index = plugins.enabled.findIndex(
        (plugin) => plugin.source === patch.source && plugin.path === patch.path,
      );
      let current = plugins.enabled[index];
      if (current === undefined) return plugins;
      let merged = mergePluginRecord(current, patch);
      if (merged === current) return plugins;
      return {
        ...plugins,
        enabled: plugins.enabled.with(index, merged),
      };
    });
  }
  setPendingMarketplaces(names) {
    this.#e((plugins) => ({
      ...plugins,
      installationStatus: {
        marketplaces: names.map((name) => ({
          name,
          status: "pending",
        })),
        plugins: [],
      },
    }));
  }
  setMarketplaceStatus(name, status, error) {
    this.#e((plugins) => ({
      ...plugins,
      installationStatus: {
        ...plugins.installationStatus,
        marketplaces: plugins.installationStatus.marketplaces.map((marketplace) =>
          marketplace.name === name
            ? {
                ...marketplace,
                status,
                error,
              }
            : marketplace,
        ),
      },
    }));
  }
  applyRefresh(result) {
    this.#t((state) => ({
      ...state,
      plugins: {
        ...state.plugins,
        enabled: result.enabled,
        disabled: result.disabled,
        commands: result.commands,
        errors: mergeErrorsBySource(state.plugins.errors, result.errors),
        warnings: mergePluginSourceErrors(state.plugins.warnings, result.warnings),
        needsRefresh: false,
        needsRefreshToLoad: undefined,
      },
      agentDefinitions: result.agentDefinitions,
      mcp: {
        ...state.mcp,
        pluginReconnectKey: state.mcp.pluginReconnectKey + 1,
      },
    }));
  }
}
export { PluginsStateStore };

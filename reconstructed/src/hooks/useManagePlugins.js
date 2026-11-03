/**
 * hooks/useManagePlugins.ts
 *
 * 插件加载管理：加载插件命令、agents、hooks、主题、技能并在出错时通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useManagePlugins.ts
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: sole-consumer 4, fingerprint 1
 */
import { isDeepStrictEqual } from "util";
import { init_react_production, ce, P } from "../../vendor/react/cjs/react.production.js";
import { readThemesFromPathAsync, getCustomThemeRegistry } from "../utils/customThemes.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { isCustomizationDisabled } from "../utils/settings/customizationDisabled.js";
import { useSetAppState, useAppState } from "../state/AppState.js";
import { useNotifications } from "../context/notifications.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useSession } from "../context/session.js";
import { loadAllPluginsCacheOnly } from "../utils/plugins/pluginLoader.js";
import { detectAndUninstallDelistedPlugins } from "../utils/plugins/pluginBlocklist.js";
import { reinitializeLspServerManager } from "../services/lsp/manager.js";
import { getFlaggedPlugins } from "../utils/plugins/pluginFlagging.js";
import { logSetupIssues } from "../utils/notifications/setupIssues.js";
import { getPluginCommands } from "../utils/plugins/loadPluginCommands.js";
import { printableMessage } from "../utils/printableName.js";
import { loadPluginAgents } from "../utils/plugins/loadPluginAgents.js";
import { loadPluginHooks } from "../utils/plugins/loadPluginHooks.js";
import { extractMcpServersFromPlugins } from "../utils/plugins/mcpPluginIntegration.js";
import { loadPluginLspServers, findLspExtensionConflicts } from "../utils/plugins/lspPluginIntegration.js";
import { noReloadPlugins } from "../utils/plugins/refresh.js";
import { logForDebugging } from "../utils/debug.js";
import { toError, withTelemetryMessage } from "../utils/errors.js";
import { logError } from "../utils/log.js";
import { env } from "../utils/env.js";
import { logEvent } from "../services/analytics/index.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { reresolveCommandSourcesOnce } from "../utils/plugins/pluginAutoupdate.js";
import { marketplaceOf } from "../utils/plugins/pluginIdentifier.js";

//@ chunk-18hwfzwa.js:208743-208747 sole-consumer
init_react_production();
//@ chunk-18hwfzwa.js:208790-209096 sole-consumer
/**
 * 从插件声明的主题路径读取主题，并加上插件名前缀。
 */
async function loadPluginThemes(h) {
  let x = [];
  for (let D of h) {
    let L = {
      plugin: D.name,
    };
    let ee = `${D.name}:`;
    if (D.themesPath) x.push(...(await readThemesFromPathAsync(D.themesPath, L, ee)));
    for (let ke of D.themesPaths ?? []) x.push(...(await readThemesFromPathAsync(ke, L, ee)));
  }
  getCustomThemeRegistry().addCustomThemeBases(x);
  logFeatureOk("plugin_load_themes");
  return x.sort((D, L) => D.name.localeCompare(L.name));
}
//@ chunk-18hwfzwa.js:209096-209253 sole-consumer
async function refreshPluginThemes(enabled) {
  if (isCustomizationDisabled("themes")) {
    getCustomThemeRegistry().pluginThemes.setState(() => []);
    return [];
  }
  let pluginThemes = await loadPluginThemes(enabled);
  getCustomThemeRegistry().pluginThemes.setState((D) =>
    isDeepStrictEqual(D, pluginThemes) ? D : pluginThemes,
  );
  return pluginThemes;
}
//@ chunk-18hwfzwa.js:209253-213242 fingerprint = useManagePlugins (0.853)
/**
 * 加载已启用插件的命令、agents、hooks、输出样式、主题、技能并注入 AppState；失败时发 generic-error 通知。
 */
function useManagePlugins({ enabled = true } = {}) {
  let setAppState = useSetAppState();
  let needsRefresh = useAppState((We) => We.plugins.needsRefresh);
  let L = useAppState((We) => We.plugins.needsRefreshToLoad === true);
  let { addNotification, removeNotification } = useNotifications();
  let { storageV5 } = useTheme_2();
  let pluginsSync = useSession((We) => We.pluginsSync);
  let initialPluginLoad = ce(async () => {
    try {
      let { enabled, disabled, errors, warnings } = await loadAllPluginsCacheOnly(storageV5);
      let kt = [...errors];
      let At = [...warnings];
      if ((await detectAndUninstallDelistedPlugins(storageV5)).length > 0)
        reinitializeLspServerManager(storageV5);
      let Ot = Object.keys(getFlaggedPlugins()).length;
      logSetupIssues("plugins", Ot);
      setAppState((bo) => {
        if (bo.setupIssues.flaggedPluginCount === Ot) return bo;
        return {
          ...bo,
          setupIssues: {
            ...bo.setupIssues,
            flaggedPluginCount: Ot,
          },
        };
      });
      let commands = [];
      let agents = [];
      try {
        commands = await getPluginCommands(storageV5);
      } catch (error) {
        kt.push({
          type: "generic-error",
          source: "plugin-commands",
          error: `Failed to load plugin commands: ${printableMessage(error)}`,
        });
      }
      try {
        agents = await loadPluginAgents(storageV5);
      } catch (error) {
        kt.push({
          type: "generic-error",
          source: "plugin-agents",
          error: `Failed to load plugin agents: ${printableMessage(error)}`,
        });
      }
      try {
        await loadPluginHooks(storageV5);
      } catch (error) {
        kt.push({
          type: "generic-error",
          source: "plugin-hooks",
          error: `Failed to load plugin hooks: ${printableMessage(error)}`,
        });
      }
      let mcpCount = (
        await Promise.all(
          enabled.map(async (bo) => {
            let servers = await extractMcpServersFromPlugins(bo, kt, storageV5, {
              warnings: At,
            });
            return servers ? Object.keys(servers).length : 0;
          }),
        )
      ).reduce((sum, n) => sum + n, 0);
      let lspCount = (
        await Promise.all(
          enabled.map(async (bo) => {
            if (bo.lspServers) return Object.keys(bo.lspServers).length;
            let servers = await loadPluginLspServers(bo, kt, storageV5);
            if (servers) bo.lspServers = servers;
            return servers ? Object.keys(servers).length : 0;
          }),
        )
      ).reduce((sum, n) => sum + n, 0);
      let lspExtensionConflicts = findLspExtensionConflicts(enabled);
      let po = [...At, ...lspExtensionConflicts];
      let themeCount = (await refreshPluginThemes(enabled)).length;
      await noReloadPlugins(enabled, kt);
      setAppState((prevState) => {
        let existingLspErrors = prevState.plugins.errors.filter(
          (e) => e.source === "lsp-manager" || e.source.startsWith("plugin:"),
        );
        let newErrorKeys = new Set(
          kt.map((e) =>
            e.type === "generic-error" ? `generic-error:${e.source}:${e.error}` : `${e.type}:${e.source}`,
          ),
        );
        let errors = [
          ...existingLspErrors.filter((e) => {
            let key =
              e.type === "generic-error" ? `generic-error:${e.source}:${e.error}` : `${e.type}:${e.source}`;
            return !newErrorKeys.has(key);
          }),
          ...kt,
        ];
        let filteredExisting = prevState.plugins.warnings.filter((warning) =>
          warning.source.startsWith("plugin:"),
        );
        let Wo = new Set(po.map((No) => `${No.type}:${No.source}`));
        let mergedErrors = [...filteredExisting.filter((No) => !Wo.has(`${No.type}:${No.source}`)), ...po];
        return {
          ...prevState,
          plugins: {
            ...prevState.plugins,
            enabled,
            disabled,
            commands,
            errors,
            warnings: mergedErrors,
          },
        };
      });
      logForDebugging(
        `Loaded plugins - Enabled: ${enabled.length}, Disabled: ${disabled.length}, Commands: ${commands.length}, Agents: ${agents.length}, Errors: ${kt.length}`,
      );
      let hook_count = enabled.reduce((sum, Ao) => {
        if (!Ao.hooksConfig) return sum;
        return (
          sum +
          Object.values(Ao.hooksConfig).reduce(
            (acc, matchers) => acc + (matchers?.reduce((acc, m) => acc + m.hooks.length, 0) ?? 0),
            0,
          )
        );
      }, 0);
      return {
        enabled_count: enabled.length,
        disabled_count: disabled.length,
        ...countPluginsByMarketplaceKind(enabled),
        error_count: kt.length,
        skill_count: commands.length,
        agent_count: agents.length,
        hook_count,
        mcp_count: mcpCount,
        lsp_count: lspCount,
        theme_count: themeCount,
        ant_enabled_names: undefined,
        ant_disabled_names: undefined,
      };
    } catch (error) {
      let errorObj = toError(error);
      logError(withTelemetryMessage(errorObj, "plugin initial load failed"));
      logForDebugging(`Error loading plugins: ${error}`);
      setAppState((prevState) => {
        let existingLspErrors = prevState.plugins.errors.filter(
          (e) => e.source === "lsp-manager" || e.source.startsWith("plugin:"),
        );
        let newError = {
          type: "generic-error",
          source: "plugin-system",
          error: printableMessage(errorObj),
        };
        return {
          ...prevState,
          plugins: {
            ...prevState.plugins,
            enabled: [],
            disabled: [],
            commands: [],
            errors: [...existingLspErrors, newError],
          },
        };
      });
      return {
        enabled_count: 0,
        disabled_count: 0,
        ...countPluginsByMarketplaceKind([]),
        error_count: 1,
        skill_count: 0,
        agent_count: 0,
        hook_count: 0,
        mcp_count: 0,
        lsp_count: 0,
        theme_count: 0,
        load_failed: true,
        ant_enabled_names: undefined,
        ant_disabled_names: undefined,
      };
    }
  }, [setAppState, storageV5]);
  P(() => {
    if (!enabled) return;
    initialPluginLoad().then((metrics) => {
      let { ant_enabled_names, ant_disabled_names: antDisabledNames, ...baseMetrics } = metrics;
      let allMetrics = {
        ...baseMetrics,
        has_custom_plugin_cache_dir: !!env.CLAUDE_CODE_PLUGIN_CACHE_DIR,
      };
      logEvent("tengu_plugins_loaded", {
        ...allMetrics,
        ...(ant_enabled_names !== undefined && {
          enabled_names: ant_enabled_names,
        }),
        ...(antDisabledNames !== undefined && {
          disabled_names: antDisabledNames,
        }),
      });
      logForDiagnosticsNoPII("info", "tengu_plugins_loaded", allMetrics);
      reresolveCommandSourcesOnce(storageV5);
    });
  }, [initialPluginLoad, enabled, storageV5]);
  P(() => {
    if (!enabled) return;
    let We = true;
    pluginsSync.firstSyncPromise?.then(
      (ze) => {
        if (ze && We)
          setAppState((Xe) =>
            Xe.plugins.needsRefresh
              ? Xe
              : {
                  ...Xe,
                  plugins: {
                    ...Xe.plugins,
                    needsRefresh: true,
                  },
                },
          );
      },
      () => {},
    );
    return () => {
      We = false;
    };
  }, [enabled, setAppState, pluginsSync]);
  P(() => {
    if (!enabled) return;
    if (!needsRefresh) {
      removeNotification("plugin-reload-pending");
      removeNotification("plugin-load-pending");
      return;
    }
    if (L) removeNotification("plugin-reload-pending");
    addNotification({
      key: L ? "plugin-load-pending" : "plugin-reload-pending",
      text: "Plugins changed. Run /reload-plugins to activate.",
      color: "suggestion",
      priority: "low",
    });
  }, [enabled, needsRefresh, L, addNotification, removeNotification]);
}
//@ chunk-18hwfzwa.js:213242-213490 sole-consumer
function countPluginsByMarketplaceKind(enabled) {
  let x = {
    inline_count: 0,
    synced_count: 0,
    marketplace_count: 0,
  };
  for (let D of enabled)
    switch (marketplaceOf(D.source)) {
      case "inline":
        x.inline_count++;
        break;
      case "synced":
        x.synced_count++;
        break;
      case "skills-dir":
      case undefined:
        x.marketplace_count++;
        break;
    }
  return x;
}
export { useManagePlugins };

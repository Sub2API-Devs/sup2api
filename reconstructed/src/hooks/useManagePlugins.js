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
import { isDeepStrictEqual, isDeepStrictEqual as isDeepStrictEqual_2 } from "util";
import { j, ce, P } from "../../vendor/react/cjs/react.production.js";
import { readThemesFromPathAsync, Nz } from "../utils/customThemes.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { isCustomizationDisabled } from "../utils/settings/customizationDisabled.js";
import { useSetAppState, useAppState } from "../state/AppState.js";
import { useNotifications } from "../context/notifications.js";
import { Me } from "../components/design-system/ThemeProvider.js";
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
import { pDr } from "../utils/plugins/refresh.js";
import { logForDebugging } from "../utils/debug.js";
import { toError, withTelemetryMessage } from "../utils/errors.js";
import { logError } from "../utils/log.js";
import { env } from "../utils/env.js";
import { logEvent } from "../services/analytics/index.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { reresolveCommandSourcesOnce } from "../utils/plugins/pluginAutoupdate.js";
import { marketplaceOf } from "../utils/plugins/pluginIdentifier.js";

//@ chunk-18hwfzwa.js:208743-208747 sole-consumer
j();
/**
 * 从插件声明的主题路径读取主题，并加上插件名前缀。
 */
//@ chunk-18hwfzwa.js:208790-209096 sole-consumer
async function loadPluginThemes(h) {
  let x = [];
  for (let D of h) {
    let L = { plugin: D.name },
      ee = `${D.name}:`;
    if (D.themesPath) x.push(...(await readThemesFromPathAsync(D.themesPath, L, ee)));
    for (let ke of D.themesPaths ?? []) x.push(...(await readThemesFromPathAsync(ke, L, ee)));
  }
  return (
    Nz().addCustomThemeBases(x),
    logFeatureOk("plugin_load_themes"),
    x.sort((D, L) => D.name.localeCompare(L.name))
  );
}
//@ chunk-18hwfzwa.js:209096-209253 sole-consumer
async function refreshPluginThemes(h) {
  if (isCustomizationDisabled("themes")) return (Nz().pluginThemes.setState(() => []), []);
  let x = await loadPluginThemes(h);
  return (Nz().pluginThemes.setState((D) => (isDeepStrictEqual(D, x) ? D : x)), x);
}
/**
 * 加载已启用插件的命令、agents、hooks、输出样式、主题、技能并注入 AppState；失败时发 generic-error 通知。
 */
//@ chunk-18hwfzwa.js:209253-213242 fingerprint = useManagePlugins (0.853)
function useManagePlugins({ enabled: h = !0 } = {}) {
  let setAppState = useSetAppState(),
    needsRefresh = useAppState((We) => We.plugins.needsRefresh),
    L = useAppState((We) => We.plugins.needsRefreshToLoad === !0),
    { addNotification: addNotification, removeNotification: removeNotification } = useNotifications(),
    { storageV5: storageV5 } = Me(),
    pluginsSync = useSession((We) => We.pluginsSync),
    initialPluginLoad = ce(async () => {
      try {
        let {
            enabled: enabled,
            disabled: disabled,
            errors: errors,
            warnings: warnings,
          } = await loadAllPluginsCacheOnly(storageV5),
          kt = [...errors],
          At = [...warnings];
        if ((await detectAndUninstallDelistedPlugins(storageV5)).length > 0)
          reinitializeLspServerManager(storageV5);
        let Ot = Object.keys(getFlaggedPlugins()).length;
        (logSetupIssues("plugins", Ot),
          setAppState((bo) => {
            if (bo.setupIssues.flaggedPluginCount === Ot) return bo;
            return { ...bo, setupIssues: { ...bo.setupIssues, flaggedPluginCount: Ot } };
          }));
        let Et = [],
          Dt = [];
        try {
          Et = await getPluginCommands(storageV5);
        } catch (error) {
          kt.push({
            type: "generic-error",
            source: "plugin-commands",
            error: `Failed to load plugin commands: ${printableMessage(error)}`,
          });
        }
        try {
          Dt = await loadPluginAgents(storageV5);
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
        let reduced = (
            await Promise.all(
              enabled.map(async (bo) => {
                let Ao = await extractMcpServersFromPlugins(bo, kt, storageV5, { warnings: At });
                return Ao ? Object.keys(Ao).length : 0;
              }),
            )
          ).reduce((sum, Ao) => sum + Ao, 0),
          reduced_2 = (
            await Promise.all(
              enabled.map(async (bo) => {
                if (bo.lspServers) return Object.keys(bo.lspServers).length;
                let Ao = await loadPluginLspServers(bo, kt, storageV5);
                if (Ao) bo.lspServers = Ao;
                return Ao ? Object.keys(Ao).length : 0;
              }),
            )
          ).reduce((sum, Ao) => sum + Ao, 0),
          so = findLspExtensionConflicts(enabled),
          po = [...At, ...so],
          ao = (await refreshPluginThemes(enabled)).length;
        (await pDr(enabled, kt),
          setAppState((prevState) => {
            let existingLspErrors = prevState.plugins.errors.filter(
                (error) => error.source === "lsp-manager" || error.source.startsWith("plugin:"),
              ),
              newErrorKeys = new Set(
                kt.map((No) =>
                  No.type === "generic-error"
                    ? `generic-error:${No.source}:${No.error}`
                    : `${No.type}:${No.source}`,
                ),
              ),
              Ho = [
                ...existingLspErrors.filter((No) => {
                  let vo =
                    No.type === "generic-error"
                      ? `generic-error:${No.source}:${No.error}`
                      : `${No.type}:${No.source}`;
                  return !newErrorKeys.has(vo);
                }),
                ...kt,
              ],
              filteredExisting = prevState.plugins.warnings.filter((warning) =>
                warning.source.startsWith("plugin:"),
              ),
              Wo = new Set(po.map((No) => `${No.type}:${No.source}`)),
              mergedErrors = [...filteredExisting.filter((No) => !Wo.has(`${No.type}:${No.source}`)), ...po];
            return {
              ...prevState,
              plugins: {
                ...prevState.plugins,
                enabled: enabled,
                disabled: disabled,
                commands: Et,
                errors: Ho,
                warnings: mergedErrors,
              },
            };
          }),
          logForDebugging(
            `Loaded plugins - Enabled: ${enabled.length}, Disabled: ${disabled.length}, Commands: ${Et.length}, Agents: ${Dt.length}, Errors: ${kt.length}`,
          ));
        let hook_count = enabled.reduce((sum, Ao) => {
          if (!Ao.hooksConfig) return sum;
          return (
            sum +
            Object.values(Ao.hooksConfig).reduce(
              (Bo, matchers) => Bo + (matchers?.reduce((Ho, Io) => Ho + Io.hooks.length, 0) ?? 0),
              0,
            )
          );
        }, 0);
        return {
          enabled_count: enabled.length,
          disabled_count: disabled.length,
          ...countPluginsByMarketplaceKind(enabled),
          error_count: kt.length,
          skill_count: Et.length,
          agent_count: Dt.length,
          hook_count: hook_count,
          mcp_count: reduced,
          lsp_count: reduced_2,
          theme_count: ao,
          ant_enabled_names: void 0,
          ant_disabled_names: void 0,
        };
      } catch (error) {
        let errorObj = toError(error);
        return (
          logError(withTelemetryMessage(errorObj, "plugin initial load failed")),
          logForDebugging(`Error loading plugins: ${error}`),
          setAppState((prevState) => {
            let existingLspErrors = prevState.plugins.errors.filter(
                (error) => error.source === "lsp-manager" || error.source.startsWith("plugin:"),
              ),
              newError = {
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
          }),
          {
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
            load_failed: !0,
            ant_enabled_names: void 0,
            ant_disabled_names: void 0,
          }
        );
      }
    }, [setAppState, storageV5]);
  (P(() => {
    if (!h) return;
    initialPluginLoad().then((metrics) => {
      let { ant_enabled_names: ant_enabled_names, ant_disabled_names: ant_disabled_names, ...rt } = metrics,
        allMetrics = { ...rt, has_custom_plugin_cache_dir: !!env.CLAUDE_CODE_PLUGIN_CACHE_DIR };
      (logEvent("tengu_plugins_loaded", {
        ...allMetrics,
        ...(ant_enabled_names !== void 0 && { enabled_names: ant_enabled_names }),
        ...(ant_disabled_names !== void 0 && { disabled_names: ant_disabled_names }),
      }),
        logForDiagnosticsNoPII("info", "tengu_plugins_loaded", allMetrics),
        reresolveCommandSourcesOnce(storageV5));
    });
  }, [initialPluginLoad, h, storageV5]),
    P(() => {
      if (!h) return;
      let We = !0;
      return (
        pluginsSync.firstSyncPromise?.then(
          (ze) => {
            if (ze && We)
              setAppState((Xe) =>
                Xe.plugins.needsRefresh ? Xe : { ...Xe, plugins: { ...Xe.plugins, needsRefresh: !0 } },
              );
          },
          () => {},
        ),
        () => {
          We = !1;
        }
      );
    }, [h, setAppState, pluginsSync]),
    P(() => {
      if (!h) return;
      if (!needsRefresh) {
        (removeNotification("plugin-reload-pending"), removeNotification("plugin-load-pending"));
        return;
      }
      if (L) removeNotification("plugin-reload-pending");
      addNotification({
        key: L ? "plugin-load-pending" : "plugin-reload-pending",
        text: "Plugins changed. Run /reload-plugins to activate.",
        color: "suggestion",
        priority: "low",
      });
    }, [h, needsRefresh, L, addNotification, removeNotification]));
}
//@ chunk-18hwfzwa.js:213242-213490 sole-consumer
function countPluginsByMarketplaceKind(h) {
  let x = { inline_count: 0, synced_count: 0, marketplace_count: 0 };
  for (let D of h)
    switch (marketplaceOf(D.source)) {
      case "inline":
        x.inline_count++;
        break;
      case "synced":
        x.synced_count++;
        break;
      case "skills-dir":
      case void 0:
        x.marketplace_count++;
        break;
    }
  return x;
}

export { useManagePlugins };

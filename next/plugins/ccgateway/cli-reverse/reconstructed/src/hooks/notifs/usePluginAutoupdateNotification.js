/**
 * hooks/notifs/usePluginAutoupdateNotification.tsx
 *
 * 插件自动更新结果通知（N 个已更新、跳过的原因）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/usePluginAutoupdateNotification.tsx
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: fingerprint 1, file-last-pair 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { onPluginsAutoUpdated } from "../../utils/plugins/pluginAutoupdate.js";
import { logForDebugging } from "../../utils/debug.js";
import { computePluginReloadImpact } from "../../utils/plugins/reloadImpact.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { refreshActivePlugins } from "../../utils/plugins/refresh.js";
import { PluginsStateStore } from "../../utils/plugins/pluginLoadStatus.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-czq1j3j2.js:1820610-1823233 fingerprint (2.1.88 match: usePluginAutoupdateNotification, 0.325)
var usePluginAutoupdateNotification = {
  id: "plugin-autoupdate",
  deps: (noticeState) => [noticeState.store, noticeState.storageV5, noticeState.credentials],
  setup() {
    let reloadGeneration = 0;
    let trackedErrors = [];
    let weakSet = new WeakSet();
    return ({ store, storageV5, credentials }, noticeState) => {
      if (isRemoteSessionAvailable()) return;
      let unsubscribe = onPluginsAutoUpdated((updatedIds, skippedErrors, reresolved, anySkipped) => {
        logForDebugging(
          `Plugin autoupdate notification: ${updatedIds.length} plugin(s) updated (${reresolved.length} re-resolved), ${skippedErrors.length} skipped (pinned, deferred or refused)`,
        );
        let syncPluginErrors = (nextErrors, droppedKeys = new Set()) =>
          store.setState((state) => {
            let nextErrorKeys = new Set(nextErrors.map(pluginErrorKey));
            let filtered = state.plugins.errors.filter(
              (error) =>
                error.type !== "autoupdate-blocked-by-pinner" &&
                error.type !== "autoupdate-deferred-entry-helper" &&
                error.type !== "autoupdate-disabled-by-policy" &&
                !(
                  weakSet.has(error) &&
                  (nextErrorKeys.has(pluginErrorKey(error)) || droppedKeys.has(pluginErrorKey(error)))
                ),
            );
            for (let pluginError of nextErrors) weakSet.add(pluginError);
            let mergedErrors = [...filtered, ...nextErrors];
            if (
              mergedErrors.length === state.plugins.errors.length &&
              mergedErrors.every((candidate, index) => candidate === state.plugins.errors[index])
            )
              return state;
            return {
              ...state,
              plugins: {
                ...state.plugins,
                errors: mergedErrors,
              },
            };
          });
        let skippedKeys = new Set(skippedErrors.map(pluginErrorKey));
        let updatedIdSet = new Set(updatedIds);
        let staleKeys = new Set(
          trackedErrors.filter((pluginError) => updatedIdSet.has(pluginError.source)).map(pluginErrorKey),
        );
        trackedErrors = [
          ...trackedErrors.filter(
            (pluginError) =>
              !skippedKeys.has(pluginErrorKey(pluginError)) && !updatedIdSet.has(pluginError.source),
          ),
          ...skippedErrors,
        ];
        syncPluginErrors(trackedErrors, staleKeys);
        let generation = ++reloadGeneration;
        if (reresolved.length === 0) {
          if (anySkipped) notifyAutoupdate(updatedIds, "skipped");
          return;
        }
        checkReloadImpact().then((reloadOutcome) => {
          if (reloadOutcome === "ok" || reloadOutcome === "with-errors") syncPluginErrors(trackedErrors);
          if (generation !== reloadGeneration && (reloadOutcome === "ok" || reloadOutcome === "skipped"))
            return;
          notifyAutoupdate(updatedIds, reloadOutcome);
        });
      });
      async function checkReloadImpact() {
        try {
          let { mainLoopModel, dynamicMcpConfig } = noticeState();
          if (
            (
              await computePluginReloadImpact({
                model: mainLoopModel,
                dynamicMcpConfig,
                mcpClients: store.getState().mcp.clients,
                storageV5,
                credentials,
              })
            ).wouldInvalidateCache
          ) {
            logFeatureSad("plugin_command_reresolve_reload", "cache_impact");
            return "skipped";
          }
          if (
            (await refreshActivePlugins(PluginsStateStore.over(store), storageV5, credentials)).error_count >
            0
          ) {
            logFeatureSad("plugin_command_reresolve_reload", "load_errors");
            return "with-errors";
          }
          logFeatureOk("plugin_command_reresolve_reload");
          return "ok";
        } catch (error) {
          logForDebugging(`Plugin autoupdate: in-session reload failed: ${errorMessage(error)}`, {
            level: "warn",
          });
          logFeatureBad("plugin_command_reresolve_reload", "refresh_failed");
          return "failed";
        }
      }
      function notifyAutoupdate(pluginIds, outcome) {
        if (isRemoteSessionAvailable()) return;
        if (pluginIds.length === 0) return;
        let mapped = pluginIds.map((id) => {
          let atIndex = id.indexOf("@");
          return atIndex > 0 ? id.substring(0, atIndex) : id;
        });
        let label = mapped.length <= 2 ? mapped.join(" and ") : `${mapped.length} plugins`;
        let noticeKey;
        let noticeHint;
        switch (outcome) {
          case "ok":
            noticeKey = "plugin-autoupdate-reloaded";
            noticeHint = " \xB7 reloaded for this session";
            break;
          case "with-errors":
            noticeKey = "plugin-autoupdate-reload-errors";
            noticeHint = " \xB7 reloaded with errors \u2014 see /plugin";
            break;
          case "failed":
            noticeKey = "plugin-autoupdate-reload-errors";
            noticeHint = " \xB7 Run /reload-plugins to apply";
            break;
          case "skipped":
            noticeKey = "plugin-autoupdate-restart";
            noticeHint = " \xB7 Run /reload-plugins to apply";
            break;
        }
        noticeState().addNotification({
          key: noticeKey,
          segments: [
            {
              text: `${mapped.length === 1 ? "Plugin" : "Plugins"} updated: ${label}`,
              color: outcome === "with-errors" ? "warning" : "success",
            },
            {
              text: noticeHint,
              dim: true,
            },
          ],
          priority: "low",
          timeoutMs: 1e4,
        });
        logForDebugging(`Plugin autoupdate notice ${noticeKey} for: ${mapped.join(", ")}`);
      }
      return unsubscribe;
    };
  },
};
//@ chunk-czq1j3j2.js:1823233-1823281 file-last-pair
function pluginErrorKey(id) {
  return `${id.type}\x00${id.source}`;
}
export { usePluginAutoupdateNotification };

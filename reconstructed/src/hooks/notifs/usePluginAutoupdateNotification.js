/**
 * hooks/notifs/usePluginAutoupdateNotification.tsx
 *
 * 插件自动更新结果通知（N 个已更新、跳过的原因）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/usePluginAutoupdateNotification.tsx
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: fingerprint 1, file-last-pair 1
 */
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { onPluginsAutoUpdated } from "../../utils/plugins/pluginAutoupdate.js";
import { logForDebugging } from "../../utils/debug.js";
import { computePluginReloadImpact } from "../../utils/plugins/reloadImpact.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { refreshActivePlugins } from "../../utils/plugins/refresh.js";
import { PluginsStateStore } from "../../utils/plugins/pluginLoadStatus.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-18hwfzwa.js:1773348-1775970 fingerprint = usePluginAutoupdateNotification (0.325)
var usePluginAutoupdateNotification = {
  id: "plugin-autoupdate",
  deps: (h) => [h.store, h.storageV5, h.credentials],
  setup() {
    let h = 0;
    let x = [];
    let weakSet = new WeakSet();
    return ({ store, storageV5, credentials }, Re) => {
      if (isRemoteSessionAvailable()) return;
      let Be = onPluginsAutoUpdated((ze, Xe, rt, kt) => {
        logForDebugging(
          `Plugin autoupdate notification: ${ze.length} plugin(s) updated (${rt.length} re-resolved), ${Xe.length} skipped (pinned, deferred or refused)`,
        );
        let At = (Lt, oo = new Set()) =>
          store.setState((Xt) => {
            let io = new Set(Lt.map(pluginErrorKey));
            let filtered = Xt.plugins.errors.filter(
              (error) =>
                error.type !== "autoupdate-blocked-by-pinner" &&
                error.type !== "autoupdate-deferred-entry-helper" &&
                error.type !== "autoupdate-disabled-by-policy" &&
                !(weakSet.has(error) && (io.has(pluginErrorKey(error)) || oo.has(pluginErrorKey(error)))),
            );
            for (let ao of Lt) weakSet.add(ao);
            let po = [...filtered, ...Lt];
            if (po.length === Xt.plugins.errors.length && po.every((ao, co) => ao === Xt.plugins.errors[co]))
              return Xt;
            return {
              ...Xt,
              plugins: {
                ...Xt.plugins,
                errors: po,
              },
            };
          });
        let It = new Set(Xe.map(pluginErrorKey));
        let Ot = new Set(ze);
        let Et = new Set(x.filter((Lt) => Ot.has(Lt.source)).map(pluginErrorKey));
        x = [...x.filter((Lt) => !It.has(pluginErrorKey(Lt)) && !Ot.has(Lt.source)), ...Xe];
        At(x, Et);
        let Dt = ++h;
        if (rt.length === 0) {
          if (kt) We(ze, "skipped");
          return;
        }
        He().then((Lt) => {
          if (Lt === "ok" || Lt === "with-errors") At(x);
          if (Dt !== h && (Lt === "ok" || Lt === "skipped")) return;
          We(ze, Lt);
        });
      });
      async function He() {
        try {
          let { mainLoopModel, dynamicMcpConfig } = Re();
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
      function We(ze, Xe) {
        if (isRemoteSessionAvailable()) return;
        if (ze.length === 0) return;
        let mapped = ze.map((id) => {
          let atIndex = id.indexOf("@");
          return atIndex > 0 ? id.substring(0, atIndex) : id;
        });
        let kt = mapped.length <= 2 ? mapped.join(" and ") : `${mapped.length} plugins`;
        let At;
        let It;
        switch (Xe) {
          case "ok":
            At = "plugin-autoupdate-reloaded";
            It = " \xB7 reloaded for this session";
            break;
          case "with-errors":
            At = "plugin-autoupdate-reload-errors";
            It = " \xB7 reloaded with errors \u2014 see /plugin";
            break;
          case "failed":
            At = "plugin-autoupdate-reload-errors";
            It = " \xB7 Run /reload-plugins to apply";
            break;
          case "skipped":
            At = "plugin-autoupdate-restart";
            It = " \xB7 Run /reload-plugins to apply";
            break;
        }
        Re().addNotification({
          key: At,
          segments: [
            {
              text: `${mapped.length === 1 ? "Plugin" : "Plugins"} updated: ${kt}`,
              color: Xe === "with-errors" ? "warning" : "success",
            },
            {
              text: It,
              dim: true,
            },
          ],
          priority: "low",
          timeoutMs: 1e4,
        });
        logForDebugging(`Plugin autoupdate notice ${At} for: ${mapped.join(", ")}`);
      }
      return Be;
    };
  },
};
//@ chunk-18hwfzwa.js:1775970-1776018 file-last-pair
function pluginErrorKey(id) {
  return `${id.type}\x00${id.source}`;
}
export { usePluginAutoupdateNotification };

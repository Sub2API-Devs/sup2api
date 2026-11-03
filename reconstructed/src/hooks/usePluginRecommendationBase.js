/**
 * hooks/usePluginRecommendationBase.tsx
 *
 * 插件推荐公共逻辑：从 marketplace 安装插件并通知结果。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/usePluginRecommendationBase.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { labelOr } from "../utils/permissions/approvalPayloadSerialization.js";
import { getPluginById } from "../utils/plugins/marketplaceManager.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { StatusIcon } from "../components/design-system/StatusIcon.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { CommandSourceError } from "../utils/plugins/commandSource.js";
import { logForDebugging } from "../utils/debug.js";
import { classifyCommandSourceError } from "../utils/plugins/headersHelper.js";
import { PluginFolderHeldError } from "../utils/plugins/crossMarketplaceInstall.js";
import { findPluginNameCollision } from "../utils/plugins/pluginNameCollision.js";

//@ chunk-18hwfzwa.js:1801339-1802617 fingerprint = installPluginAndNotify (0.441)
async function installPluginAndNotify(pluginId, pluginName, D, L, install, ke) {
  let Re = labelOr(pluginName, "(unnamed plugin)");
  try {
    let pluginData = await getPluginById(pluginId, ke, "install");
    if (!pluginData) throw Error(`Plugin ${pluginId} not found in marketplace`);
    await install(pluginData);
    L({
      key: `${D}-installed`,
      kind: "feedback",
      jsx: jsxProd_default_2(Text, {
        color: "success",
        children: [
          jsxProd_default(StatusIcon, {
            status: "success",
            withSpace: true,
          }),
          Re,
          " installed \xB7 restart to apply",
        ],
      }),
      priority: "immediate",
      timeoutMs: 5000,
    });
    logFeatureOk("plugin_recommendation_install");
  } catch (error) {
    if (error instanceof CommandSourceError) {
      logForDebugging(`Plugin ${pluginId} not installed: ${error.message}`);
      L({
        key: `${D}-install-refused`,
        text: error.message,
        color: "warning",
        priority: "immediate",
        timeoutMs: 8000,
      });
      let { code, kind } = classifyCommandSourceError(error);
      if (kind === "bad") logFeatureBad("plugin_recommendation_install", code);
      else logFeatureSad("plugin_recommendation_install", code);
      return;
    }
    if (error instanceof PluginFolderHeldError) {
      logForDebugging(`Plugin ${pluginId} not installed: ${error.message}`);
      L({
        key: `${D}-install-refused`,
        text: findPluginNameCollision({
          refused: pluginId,
          askedFor: pluginId,
          sharedWith: "installed",
          holders: error.holders,
          surface: "notice",
        }),
        color: "warning",
        priority: "immediate",
        timeoutMs: 8000,
      });
      logFeatureSad("plugin_recommendation_install", "plugin_folder_held");
      return;
    }
    logForDebugging(
      `Failed to install plugin ${pluginId}: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    L({
      key: `${D}-install-failed`,
      text: `Failed to install ${Re}`,
      color: "error",
      priority: "immediate",
      timeoutMs: 5000,
    });
    logFeatureBad("plugin_recommendation_install", "install_failed");
  }
}
export { installPluginAndNotify };

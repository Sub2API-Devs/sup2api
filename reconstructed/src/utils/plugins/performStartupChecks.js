/**
 * utils/plugins/performStartupChecks.tsx
 *
 * 交互启动时（工作区受信后）触发后台插件安装与官方市场自动安装。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/performStartupChecks.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { logForDebugging } from "../debug.js";
import { checkHasTrustDialogAccepted } from "../config.js";
import { kA } from "../../services/policyLimits/coldStartWaiter.js";
import { syncSeedMarketplaces } from "./marketplaceManager.js";
import {
  updateMarketplaceStatus,
  performBackgroundPluginInstallations,
} from "../../services/plugins/PluginInstallationManager.js";
import { clearPluginCache } from "./pluginLoader.js";

/**
 * 交互启动时的插件检查：工作区受信后执行后台市场/插件安装与官方市场自动安装。
 */
//@ chunk-18hwfzwa.js:206503-207065 fingerprint = performStartupChecks (0.714)
async function performStartupChecks(h, x) {
  if ((logForDebugging("performStartupChecks called"), !checkHasTrustDialogAccepted())) {
    logForDebugging("Trust not accepted for current directory - skipping plugin installations");
    return;
  }
  try {
    if (
      (await kA().catch((prev) => {
        logForDebugging(
          `Remote managed settings did not settle before the background plugin installations (${prev}); installing against the settings loaded so far`,
        );
      }),
      logForDebugging("Starting background plugin installations"),
      await syncSeedMarketplaces(x))
    )
      (updateMarketplaceStatus(),
        clearPluginCache("performStartupChecks: seed marketplaces changed"),
        h.markNeedsRefresh("not-loaded"));
    await performBackgroundPluginInstallations(h, x);
  } catch (error) {
    logForDebugging(`Error initiating background plugin installations: ${error}`);
  }
}

export { performStartupChecks };

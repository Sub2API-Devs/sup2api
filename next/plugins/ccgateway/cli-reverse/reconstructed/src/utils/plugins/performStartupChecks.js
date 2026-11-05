/**
 * utils/plugins/performStartupChecks.tsx
 *
 * 交互启动时（工作区受信后）触发后台插件安装与官方市场自动安装。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/performStartupChecks.tsx
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: fingerprint 1
 */
import { logForDebugging } from "../debug.js";
import { checkHasTrustDialogAccepted } from "../config.js";
import { awaitPolicyColdStartWaiter } from "../../services/policyLimits/coldStartWaiter.js";
import { syncSeedMarketplaces } from "./marketplaceManager.js";
import {
  updateMarketplaceStatus,
  performBackgroundPluginInstallations,
} from "../../services/plugins/PluginInstallationManager.js";
import { clearPluginCache } from "./pluginLoader.js";

//@ chunk-czq1j3j2.js:211302-211864 fingerprint (2.1.88 match: performStartupChecks, 0.714)
/**
 * 交互启动时的插件检查：工作区受信后执行后台市场/插件安装与官方市场自动安装。
 */
async function performStartupChecks(setAppState, storageV5) {
  logForDebugging("performStartupChecks called");
  if (!checkHasTrustDialogAccepted()) {
    logForDebugging("Trust not accepted for current directory - skipping plugin installations");
    return;
  }
  try {
    await awaitPolicyColdStartWaiter().catch((prev) => {
      logForDebugging(
        `Remote managed settings did not settle before the background plugin installations (${prev}); installing against the settings loaded so far`,
      );
    });
    logForDebugging("Starting background plugin installations");
    if (await syncSeedMarketplaces(storageV5)) {
      updateMarketplaceStatus();
      clearPluginCache("performStartupChecks: seed marketplaces changed");
      setAppState.markNeedsRefresh("not-loaded");
    }
    await performBackgroundPluginInstallations(setAppState, storageV5);
  } catch (error) {
    logForDebugging(`Error initiating background plugin installations: ${error}`);
  }
}
export { performStartupChecks };

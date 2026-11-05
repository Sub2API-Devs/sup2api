/**
 * utils/agentsWorkspaceTrust.ts
 *
 * 2.1.316 新增：Agents 视图启动时处理工作区信任（跳过/已信任/询问后重新发现项目技能插件）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5z1vsgd5.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDemoOrClaubbet } from "../plugins/functionHooks/policyGate.js";
import { checkHasTrustDialogAccepted } from "./config.js";
import { hasUngatedTrustSources } from "../components/TrustDialog/utils.js";
import { env } from "./env.js";
import { setSessionTrustAccepted, getRootSession } from "../bootstrap/state.js";
import { getCwd } from "./cwd.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-5z1vsgd5.js:13045-13116 placement
/**
 * 返回 Agents 视图启动时的工作区信任决定（skip/trusted/ask）。
 */
function agentsTrustDecision() {
  if (isDemoOrClaubbet()) return "skip";
  return checkHasTrustDialogAccepted() && !hasUngatedTrustSources() ? "trusted" : "ask";
}
//@ chunk-5z1vsgd5.js:13116-14242 placement
/**
 * Agents 视图启动时处理工作区信任（跳过/已信任/询问后重新发现项目技能插件）。
 */
async function ensureAgentsWorkspaceTrust(ui, mode, storageV5) {
  switch (mode) {
    case "skip":
      if (!env.CLAUBBIT && checkHasTrustDialogAccepted()) {
        setSessionTrustAccepted(true);
        let { primePlanSlugCollisions } = await import("./plans.js");
        primePlanSlugCollisions(storageV5);
      }
      {
        let { capturePolicySnapshot } = await import("./settings/policySnapshot.js");
        capturePolicySnapshot();
      }
      return;
    case "trusted": {
      setSessionTrustAccepted(true);
      let [{ primePlanSlugCollisions }, { capturePolicySnapshot }] = await Promise.all([
        import("./plans.js"),
        import("./settings/policySnapshot.js"),
      ]);
      primePlanSlugCollisions(storageV5);
      capturePolicySnapshot();
      return;
    }
    case "ask": {
      let [{ runSteps }, { TrustDialog }, { getCommands }] = await Promise.all([
        import("./runSteps.js"),
        import("../components/TrustDialog/TrustDialog.js"),
        import("../commands.lazy.js"),
      ]);
      let commands = await getCommands(getCwd(), storageV5).catch(() => []);
      await runSteps(
        ui,
        [
          (resolveDone) =>
            jsxProd_default(TrustDialog, {
              commands,
              onDone: () => resolveDone(),
            }),
        ],
        {
          session: getRootSession(),
          storageV5,
        },
      );
      setSessionTrustAccepted(true);
      let { clearPluginCache } = await import("./plugins/pluginLoader.js");
      clearPluginCache("post-trust: re-discover project @skills-dir plugins");
      let [
        { resetGrowthBook, initializeGrowthBook },
        { primePlanSlugCollisions },
        { logError },
        { capturePolicySnapshot },
      ] = await Promise.all([
        import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
        import("./plans.js"),
        import("./log.js"),
        import("./settings/policySnapshot.js"),
      ]);
      resetGrowthBook({
        preservePendingExposures: true,
      });
      initializeGrowthBook().catch(logError);
      primePlanSlugCollisions(storageV5);
      capturePolicySnapshot();
      return;
    }
  }
}
export { agentsTrustDecision, ensureAgentsWorkspaceTrust };

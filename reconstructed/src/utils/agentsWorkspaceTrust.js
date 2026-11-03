/**
 * utils/agentsWorkspaceTrust.ts
 *
 * 2.1.316 新增：Agents 视图启动时处理工作区信任（跳过/已信任/询问后重新发现项目技能插件）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pn8x1715.js (2)
 * attribution: placement 2
 */
import { JKe } from "../plugins/functionHooks/policyGate.js";
import { checkHasTrustDialogAccepted } from "./config.js";
import { hasUngatedTrustSources } from "../components/TrustDialog/utils.js";
import { env } from "./env.js";
import { setSessionTrustAccepted, getRootSession } from "../bootstrap/state.js";
import { getCwd } from "./cwd.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-pn8x1715.js:11897-11968 placement
function D() {
  if (JKe()) return "skip";
  return checkHasTrustDialogAccepted() && !hasUngatedTrustSources() ? "trusted" : "ask";
}
/**
 * Agents 视图启动时处理工作区信任（跳过/已信任/询问后重新发现项目技能插件）。
 */
//@ chunk-pn8x1715.js:11968-13094 placement
async function ensureAgentsWorkspaceTrust(s, n, o) {
  switch (n) {
    case "skip":
      if (!env.CLAUBBIT && checkHasTrustDialogAccepted()) {
        setSessionTrustAccepted(!0);
        let { primePlanSlugCollisions: primePlanSlugCollisions } = await import("./chunk-p2nht1vg.js");
        primePlanSlugCollisions(o);
      }
      {
        let { capturePolicySnapshot: capturePolicySnapshot } = await import("./chunk-mav6jbkz.js");
        capturePolicySnapshot();
      }
      return;
    case "trusted": {
      setSessionTrustAccepted(!0);
      let [{ primePlanSlugCollisions: t }, { capturePolicySnapshot: r }] = await Promise.all([
        import("./chunk-p2nht1vg.js"),
        import("./chunk-mav6jbkz.js"),
      ]);
      (t(o), r());
      return;
    }
    case "ask": {
      let [{ runSteps: t }, { TrustDialog: r }, { getCommands: a }] = await Promise.all([
          import("./chunk-8pefyxsz.js"),
          import("./chunk-8rmevhsy.js"),
          import("./chunk-aeccp9b6.js"),
        ]),
        p = await a(getCwd(), o).catch(() => []);
      (await t(s, [(k) => e(r, { commands: p, onDone: () => k() })], {
        session: getRootSession(),
        storageV5: o,
      }),
        setSessionTrustAccepted(!0));
      let { clearPluginCache: clearPluginCache } = await import("./chunk-w27ej3rn.js");
      clearPluginCache("post-trust: re-discover project @skills-dir plugins");
      let [
        { resetGrowthBook: m, initializeGrowthBook: u },
        { primePlanSlugCollisions: l },
        { logError: d },
        { capturePolicySnapshot: g },
      ] = await Promise.all([
        import("./chunk-6df1d6re.js"),
        import("./chunk-p2nht1vg.js"),
        import("./chunk-ytv7p2hj.js"),
        import("./chunk-mav6jbkz.js"),
      ]);
      (m({ preservePendingExposures: !0 }), u().catch(d), l(o), g());
      return;
    }
  }
}

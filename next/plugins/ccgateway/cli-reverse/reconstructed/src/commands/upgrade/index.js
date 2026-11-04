/**
 * commands/upgrade/index.ts
 *
 * /upgrade 命令对象（claude-ai，非企业）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/upgrade/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { canShowUpgradeCommand } from "../../utils/planTiers.js";

//@ chunk-e6aww6q8.js:2041887-2042062 fingerprint = upgrade (0.778)
/**
 * /upgrade 命令对象（local-jsx）；描述：Upgrade to Max for higher rate limits and more Opus；availability ["claude-ai"]；isEnabled: Gpe；实现 chunk-txp87wj5.js 的 Jji。
 */
var upgradeCommandDefinition = {
  type: "local-jsx",
  name: "upgrade",
  description: "Upgrade to Max for higher rate limits and more Opus",
  availability: ["claude-ai"],
  isEnabled: canShowUpgradeCommand,
  requires: {
    ink: true,
  },
};
var upgradeCommand = upgradeCommandDefinition;
export { upgradeCommand };

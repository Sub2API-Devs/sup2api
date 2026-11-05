/**
 * commands/upgrade/index.ts
 *
 * /upgrade 命令对象（claude-ai，非企业）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/upgrade/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { canShowUpgradeCommand } from "../../utils/planTiers.js";

//@ chunk-5xgkngpb.js:2098013-2098191 fingerprint (2.1.88 match: upgrade, 0.636)
/**
 * /upgrade 命令对象（local-jsx）；描述：Upgrade to Max for higher rate limits and more Opus；availability ["claude-ai"]；isEnabled: Gpe；实现 chunk-txp87wj5.js 的 Jji。
 */
var upgradeCommandDefinition = {
  type: "local-jsx",
  name: "upgrade",
  description: "Upgrade your plan for higher rate limits and more Opus",
  availability: ["claude-ai"],
  isEnabled: canShowUpgradeCommand,
  requires: {
    ink: true,
  },
};
var upgradeCommand = upgradeCommandDefinition;
export { upgradeCommand };

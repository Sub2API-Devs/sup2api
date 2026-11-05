/**
 * commands/extra-usage/index.ts
 *
 * /usage-credits 与改名存根 /extra-usage 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/extra-usage/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isExtraUsageAllowed } from "../../utils/auth.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-5xgkngpb.js:2098191-2098941 fingerprint (2.1.88 match: extraUsageNonInteractive, 0.462)
/**
 * /usage-credits 命令对象（local-jsx）；描述：Configure usage credits or request them from your admin when you hit a limit；isEnabled: ()=>Px()&&!_e()；实现 chunk-2gtphf4m.js 的 Jpt。
 */
var usageCreditsCommand = {
  type: "local-jsx",
  name: "usage-credits",
  description: "Configure usage credits or request them from your admin when you hit a limit",
  isEnabled: () => isExtraUsageAllowed() && !getIsNonInteractiveSession(),
  requires: {
    ink: true,
  },
};
var usageCreditsNonInteractiveCommand = {
  type: "local",
  name: "usage-credits",
  supportsNonInteractive: true,
  description: "Configure usage credits or request them from your admin when you hit a limit",
  isEnabled: () => isExtraUsageAllowed() && getIsNonInteractiveSession(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("./call.lazy.js"),
};
var extraUsageCommand = {
  type: "local-jsx",
  name: "extra-usage",
  description: "Renamed to /usage-credits",
  isHidden: true,
  isEnabled: () => isExtraUsageAllowed() && !getIsNonInteractiveSession(),
  requires: {
    ink: true,
  },
};
var extraUsageNonInteractiveCommand = {
  type: "local",
  name: "extra-usage",
  supportsNonInteractive: true,
  description: "Renamed to /usage-credits",
  isHidden: true,
  isEnabled: () => isExtraUsageAllowed() && getIsNonInteractiveSession(),
  load: () => import("../usage-credits/renameNotice.js"),
};
export {
  usageCreditsCommand,
  usageCreditsNonInteractiveCommand,
  extraUsageCommand,
  extraUsageNonInteractiveCommand,
};

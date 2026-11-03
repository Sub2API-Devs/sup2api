/**
 * commands/usage/index.ts
 *
 * 2.1.316 新增：/usage 命令对象：显示订阅用量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/usage/index.ts
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

/**
 * /usage 命令对象（local-jsx）；描述：Show session cost, plan usage, and activity stats；别名 ["cost","stats"]；实现 chunk-b8fqh6y9.js 的 m。
 */
//@ chunk-e6aww6q8.js:2025765-2026266 placement
var usageCommand = {
    type: "local-jsx",
    name: "usage",
    aliases: ["cost", "stats"],
    description: "Show session cost, plan usage, and activity stats",
    thinClientDispatch: "control-request",
    immediate: !0,
    requires: { ink: !0 },
  },
  usageNonInteractiveCommand = {
    type: "local",
    name: "usage",
    aliases: ["cost", "stats"],
    supportsNonInteractive: !0,
    description: "Show session cost, plan usage, and what's contributing to your limits",
    menuDescription: "Show session cost and plan usage",
    isEnabled: () => getIsNonInteractiveSession(),
    get isHidden() {
      return !getIsNonInteractiveSession();
    },
    load: () => import("./chunk-9689amr8.js"),
  };
/**
 * /skill-doctor 命令对象（local-jsx）；描述：Show which loaded skills are unused and costing context；实现 chunk-ej3ckp70.js 的 r。
 */
//@ chunk-e6aww6q8.js:2026266-2026674 placement
var skillDoctorCommand = {
    type: "local-jsx",
    name: "skill-doctor",
    description: "Show which loaded skills are unused and costing context",
    immediate: !0,
    thinClientDispatch: "twin",
  },
  skillDoctorNonInteractiveCommand = {
    type: "local",
    name: "skill-doctor",
    description: "Show which loaded skills are unused and costing context",
    supportsNonInteractive: !0,
    thinClientDispatch: "post-text",
    isEnabled: () => getIsNonInteractiveSession(),
    get isHidden() {
      return !getIsNonInteractiveSession();
    },
    load: () => import("./chunk-trqm4cp5.js"),
  };

export { skillDoctorCommand, skillDoctorNonInteractiveCommand, usageCommand, usageNonInteractiveCommand };

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

//@ chunk-e6aww6q8.js:2025765-2026266 placement
/**
 * /usage 命令对象（local-jsx）；描述：Show session cost, plan usage, and activity stats；别名 ["cost","stats"]；实现 chunk-b8fqh6y9.js 的 m。
 */
var usageCommand = {
  type: "local-jsx",
  name: "usage",
  aliases: ["cost", "stats"],
  description: "Show session cost, plan usage, and activity stats",
  thinClientDispatch: "control-request",
  immediate: true,
  requires: {
    ink: true,
  },
};
var usageNonInteractiveCommand = {
  type: "local",
  name: "usage",
  aliases: ["cost", "stats"],
  supportsNonInteractive: true,
  description: "Show session cost, plan usage, and what's contributing to your limits",
  menuDescription: "Show session cost and plan usage",
  isEnabled: () => getIsNonInteractiveSession(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("../cost/call.lazy.js"),
};
//@ chunk-e6aww6q8.js:2026266-2026674 placement
/**
 * /skill-doctor 命令对象（local-jsx）；描述：Show which loaded skills are unused and costing context；实现 chunk-ej3ckp70.js 的 r。
 */
var skillDoctorCommand = {
  type: "local-jsx",
  name: "skill-doctor",
  description: "Show which loaded skills are unused and costing context",
  immediate: true,
  thinClientDispatch: "twin",
};
var skillDoctorNonInteractiveCommand = {
  type: "local",
  name: "skill-doctor",
  description: "Show which loaded skills are unused and costing context",
  supportsNonInteractive: true,
  thinClientDispatch: "post-text",
  isEnabled: () => getIsNonInteractiveSession(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("../skill-doctor/skill-doctor.js"),
};
export { skillDoctorCommand, skillDoctorNonInteractiveCommand, usageCommand, usageNonInteractiveCommand };

/**
 * commands/usage/index.ts
 *
 * 2.1.316 新增：/usage 命令对象：显示订阅用量
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/usage/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-5xgkngpb.js:2081582-2082083 placement
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
export { usageCommand, usageNonInteractiveCommand };

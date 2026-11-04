/**
 * commands/rename/index.ts
 *
 * /rename（别名 name）命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/rename/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-e6aww6q8.js:1733646-1734080 fingerprint (2.1.88 match: rename, 0.625)
/**
 * /rename 命令对象（local-jsx）；描述：Rename the current conversation；别名 ["name"]；实现 chunk-wqa2f5xk.js 的 Hzi。
 */
var renameCommandDefinition = {
  type: "local-jsx",
  name: "rename",
  aliases: ["name"],
  description: "Rename the current conversation",
  immediate: true,
  argumentHint: "[name]",
  requires: {
    ink: true,
  },
  load: () => import("./rename.js"),
};
var renameNonInteractiveCommand = {
  type: "local",
  name: "rename",
  aliases: ["name"],
  supportsNonInteractive: true,
  description: "Rename the current conversation",
  argumentHint: "[name]",
  isEnabled: () => getIsNonInteractiveSession(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("../../utils/call.lazy.js"),
};
var renameCommand = renameCommandDefinition;
export { renameCommand, renameNonInteractiveCommand };

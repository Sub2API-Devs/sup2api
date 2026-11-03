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

/**
 * /rename 命令对象（local-jsx）；描述：Rename the current conversation；别名 ["name"]；实现 chunk-wqa2f5xk.js 的 Hzi。
 */
//@ chunk-e6aww6q8.js:1733646-1734080 fingerprint = rename (0.625)
var renameCommandDefinition = {
    type: "local-jsx",
    name: "rename",
    aliases: ["name"],
    description: "Rename the current conversation",
    immediate: !0,
    argumentHint: "[name]",
    requires: { ink: !0 },
    load: () => import("./chunk-wqa2f5xk.js"),
  },
  renameNonInteractiveCommand = {
    type: "local",
    name: "rename",
    aliases: ["name"],
    supportsNonInteractive: !0,
    description: "Rename the current conversation",
    argumentHint: "[name]",
    isEnabled: () => getIsNonInteractiveSession(),
    get isHidden() {
      return !getIsNonInteractiveSession();
    },
    load: () => import("./chunk-5h69ret3.js"),
  },
  renameCommand = renameCommandDefinition;

export { renameCommand, renameNonInteractiveCommand };

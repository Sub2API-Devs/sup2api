/**
 * commands/rename/index.ts
 *
 * /rename（别名 name）命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/rename/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-5xgkngpb.js:1809098-1809532 fingerprint (2.1.88 match: rename, 0.625)
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
var resumeCommand = renameCommandDefinition;
export { resumeCommand, renameNonInteractiveCommand };

/**
 * commands/add-dir/index.ts
 *
 * /add-dir 命令对象（local-jsx 交互版与 local 无头版）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/add-dir/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { isDesktopTopNonClaudecode } from "../../utils/sessionShape.js";

//@ chunk-5xgkngpb.js:1758853-1759290 fingerprint (2.1.88 match: addDir, 0.589)
var addDirNonInteractiveCommand = {
  type: "local",
  name: "add-dir",
  description: "Add a new working directory",
  argumentHint: "<path>",
  supportsNonInteractive: true,
  thinClientDispatch: "post-text",
  isEnabled: () => getIsNonInteractiveSession() && isDesktopTopNonClaudecode(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("./call.lazy.js"),
};
var addDirInteractiveCommand = {
  type: "local-jsx",
  name: "add-dir",
  description: "Add a new working directory",
  argumentHint: "<path>",
  immediate: (input, surface) => input.trim() !== "" || surface === "fullscreen",
  thinClientDispatch: "twin",
};
var addDirCommand = addDirInteractiveCommand;
export { addDirCommand, addDirNonInteractiveCommand };

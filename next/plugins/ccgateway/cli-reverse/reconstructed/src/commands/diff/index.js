/**
 * commands/diff/index.ts
 *
 * /diff 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/diff/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDiffPaneAvailable } from "../../plugins/bundled/diffPane/index.js";
import { resolveRenderMode, isFullscreenEnvEnabled } from "../../utils/fullscreen.js";

//@ chunk-5xgkngpb.js:1770717-1771024 fingerprint (2.1.88 match: default, 0.51)
var diffCommandDefinition = {
  type: "local-jsx",
  name: "diff",
  isEnabled: () => !isDiffPaneAvailable(),
  get description() {
    return resolveRenderMode(isFullscreenEnvEnabled() ? "fullscreen" : "inline") === "fullscreen"
      ? "Toggle the diff panel showing uncommitted changes"
      : "View uncommitted changes and per-turn diffs";
  },
  immediate: (input, surface) => resolveRenderMode(surface) === "fullscreen",
  thinClientDispatch: "control-request",
};
export { diffCommandDefinition };

/**
 * commands/keybindings/index.ts
 *
 * /keybindings 命令对象（需 tengu_keybinding_customization_release）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/keybindings/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isKeybindingCustomizationEnabled } from "../../keybindings/loadUserBindings.js";

//@ chunk-5xgkngpb.js:1798230-1798437 fingerprint (2.1.88 match: keybindings, 0.628)
/**
 * /keybindings 命令对象（local）；描述：Open your keyboard shortcuts file；isEnabled: ()=>Iee()；实现 chunk-1nat7wre.js 的 T。
 */
var keybindingsCommandDefinition = {
  name: "keybindings",
  description: "Open your keyboard shortcuts file",
  isEnabled: () => isKeybindingCustomizationEnabled(),
  supportsNonInteractive: false,
  type: "local",
  requires: {
    workspace: false,
  },
  load: () => import("./keybindings.js"),
};
var keybindingsCommand = keybindingsCommandDefinition;
export { keybindingsCommand };

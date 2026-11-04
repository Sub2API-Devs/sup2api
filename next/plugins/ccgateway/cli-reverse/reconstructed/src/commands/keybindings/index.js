/**
 * commands/keybindings/index.ts
 *
 * /keybindings 命令对象（需 tengu_keybinding_customization_release）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/keybindings/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { isKeybindingCustomizationEnabled } from "../../keybindings/loadUserBindings.js";

//@ chunk-e6aww6q8.js:1722860-1723067 fingerprint (2.1.88 match: keybindings, 0.628)
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

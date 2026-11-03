/**
 * keybindings/_new/getReservedShortcuts.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6qssfmzs.js (1)
 * attribution: sole-consumer-new 1
 */
import { getPlatform } from "../../utils/platform.js";
import { NON_REBINDABLE, TERMINAL_RESERVED, MACOS_RESERVED } from "../reservedShortcuts.js";

//@ chunk-6qssfmzs.js:8790-8872 sole-consumer-new = getReservedShortcuts (1)
function getReservedShortcuts() {
  let platform = getPlatform(),
    reserved = [...NON_REBINDABLE, ...TERMINAL_RESERVED];
  if (platform === "macos") reserved.push(...MACOS_RESERVED);
  return reserved;
}

export { getReservedShortcuts };

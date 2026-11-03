/**
 * @anthropic-ai/sandbox-runtime/dist/utils/platform.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-r0ads4ty.js (2)
 * attribution: esm-fingerprint 2
 */
import * as fsModule from "fs";
import * as fsModule_2 from "fs";
import * as fsModule_3 from "fs";

//@ chunk-r0ads4ty.js:212-405 esm-fingerprint
function sli() {
  try {
    let content = fsModule.readFileSync("/proc/version", { encoding: "utf8" }),
      match = content.match(/WSL(\d+)/i);
    if (match && match[1]) return match[1];
    if (content.toLowerCase().includes("microsoft")) return "1";
    return;
  } catch {
    return;
  }
}
//@ chunk-r0ads4ty.js:405-541 esm-fingerprint
function zv() {
  switch ("linux") {
    case "darwin":
      return "macos";
    case "linux":
      return "linux";
    case "win32":
      return "windows";
    default:
      return "unknown";
  }
}

export { zv, sli };

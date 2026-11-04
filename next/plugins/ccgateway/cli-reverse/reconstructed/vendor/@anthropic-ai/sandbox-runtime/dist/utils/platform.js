/**
 * @anthropic-ai/sandbox-runtime/dist/utils/platform.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-r0ads4ty.js (2)
 * attribution: esm-fingerprint 2
 */
import "fs";
import * as fsModule_2 from "fs";
import "fs";

//@ chunk-r0ads4ty.js:212-405 esm-fingerprint
function getWslVersion() {
  try {
    let procVersion = fsModule_2.readFileSync("/proc/version", {
      encoding: "utf8",
    });
    let wslVersionMatch = procVersion.match(/WSL(\d+)/i);
    if (wslVersionMatch && wslVersionMatch[1]) return wslVersionMatch[1];
    if (procVersion.toLowerCase().includes("microsoft")) return "1";
    return;
  } catch {
    return;
  }
}
//@ chunk-r0ads4ty.js:405-541 esm-fingerprint
function getPlatform() {
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
export { getPlatform, getWslVersion };

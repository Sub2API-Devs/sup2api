/**
 * is-wsl/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: is-wsl@3.1.1
 * pieces: chunk-20ppca50.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { default as E } from "process";
import os from "os";
import fs from "fs";
import { y, hasContainerEnv, x } from "../is-inside-container/index.js";

//@ chunk-20ppca50.js:873-920 esm-layout
function p() {
  if (y === undefined) y = hasContainerEnv() || x();
  return y;
}
//@ chunk-20ppca50.js:920-1182 esm-fingerprint
var isWsl = () => {
  if (E.platform !== "linux") return false;
  if (os.release().toLowerCase().includes("microsoft")) {
    if (p()) return false;
    return true;
  }
  try {
    return fs.readFileSync("/proc/version", "utf8").toLowerCase().includes("microsoft") ? !p() : false;
  } catch {
    return false;
  }
};
var is_wsl_default = E.env.__IS_WSL_TEST__ ? isWsl : isWsl();
export { is_wsl_default, p };

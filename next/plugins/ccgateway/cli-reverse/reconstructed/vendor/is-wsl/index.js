/**
 * is-wsl/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: is-wsl@3.1.1
 * pieces: chunk-j8hasev3.js (1)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { default as E } from "process";
import os from "os";
import fs from "fs";
import { isInsideContainer } from "../is-inside-container/index.js";

//@ chunk-j8hasev3.js:920-1182 esm-fingerprint
var isWsl = () => {
  if (E.platform !== "linux") return false;
  if (os.release().toLowerCase().includes("microsoft")) {
    if (isInsideContainer()) return false;
    return true;
  }
  try {
    return fs.readFileSync("/proc/version", "utf8").toLowerCase().includes("microsoft")
      ? !isInsideContainer()
      : false;
  } catch {
    return false;
  }
};
var is_wsl_default = E.env.__IS_WSL_TEST__ ? isWsl : isWsl();
export { is_wsl_default };

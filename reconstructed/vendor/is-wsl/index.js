/**
 * is-wsl/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: is-wsl@3.1.1
 * pieces: chunk-20ppca50.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import N, { default as I, default as T, default as E, default as ee, default as te } from "process";
import os from "os";
import fs, { default as fs_2, default as fs_3 } from "fs";
import { y, q, x } from "../is-inside-container/index.js";

//@ chunk-20ppca50.js:873-920 esm-layout
function p() {
  if (y === void 0) y = q() || x();
  return y;
}
//@ chunk-20ppca50.js:920-1182 esm-fingerprint
var isWsl = () => {
    if (T.platform !== "linux") return !1;
    if (os.release().toLowerCase().includes("microsoft")) {
      if (p()) return !1;
      return !0;
    }
    try {
      return fs.readFileSync("/proc/version", "utf8").toLowerCase().includes("microsoft") ? !p() : !1;
    } catch {
      return !1;
    }
  },
  c = T.env.__IS_WSL_TEST__ ? isWsl : isWsl();

export { c, p };

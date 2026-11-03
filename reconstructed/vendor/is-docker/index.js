/**
 * is-docker/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: is-docker@3.0.0
 * pieces: chunk-20ppca50.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import fs, { default as fs_2, default as fs_3 } from "fs";

//@ chunk-20ppca50.js:572-578 esm-layout
var h;
//@ chunk-20ppca50.js:578-647 esm-fingerprint
function G() {
  try {
    return (fs_3.statSync("/.dockerenv"), !0);
  } catch {
    return !1;
  }
}
//@ chunk-20ppca50.js:647-749 esm-fingerprint
function X() {
  try {
    return fs_3.readFileSync("/proc/self/cgroup", "utf8").includes("docker");
  } catch {
    return !1;
  }
}

export { h, G, X };

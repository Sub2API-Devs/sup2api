/**
 * is-docker/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: is-docker@3.0.0
 * pieces: chunk-20ppca50.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import fs from "fs";

//@ chunk-20ppca50.js:572-578 esm-layout
var h;
//@ chunk-20ppca50.js:578-647 esm-fingerprint
function hasDockerEnv() {
  try {
    fs.statSync("/.dockerenv");
    return true;
  } catch {
    return false;
  }
}
//@ chunk-20ppca50.js:647-749 esm-fingerprint
function hasDockerCGroup() {
  try {
    return fs.readFileSync("/proc/self/cgroup", "utf8").includes("docker");
  } catch {
    return false;
  }
}
export { h, hasDockerEnv, hasDockerCGroup };

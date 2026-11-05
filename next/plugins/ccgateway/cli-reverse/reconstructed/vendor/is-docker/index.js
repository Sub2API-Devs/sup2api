/**
 * is-docker/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: is-docker@3.0.0
 * pieces: chunk-j8hasev3.js (2)
 * attribution: esm-layout 1, esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import fs from "fs";

//@ chunk-j8hasev3.js:578-647 esm-fingerprint
function hasDockerEnv() {
  try {
    fs.statSync("/.dockerenv");
    return true;
  } catch {
    return false;
  }
}
//@ chunk-j8hasev3.js:647-749 esm-fingerprint
function hasDockerCGroup() {
  try {
    return fs.readFileSync("/proc/self/cgroup", "utf8").includes("docker");
  } catch {
    return false;
  }
}
export { hasDockerEnv, hasDockerCGroup };

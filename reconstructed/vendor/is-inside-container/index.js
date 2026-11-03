/**
 * is-inside-container/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: is-inside-container@1.0.0
 * pieces: chunk-20ppca50.js (2)
 * attribution: esm-layout 2
 */
import fs from "fs";
import { h, hasDockerEnv, hasDockerCGroup } from "../is-docker/index.js";

//@ chunk-20ppca50.js:749-796 esm-layout
function x() {
  if (h === undefined) h = hasDockerEnv() || hasDockerCGroup();
  return h;
}
//@ chunk-20ppca50.js:796-873 esm-layout
var y;
var hasContainerEnv = () => {
  try {
    fs.statSync("/run/.containerenv");
    return true;
  } catch {
    return false;
  }
};
export { y, hasContainerEnv, x };

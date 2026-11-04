/**
 * is-inside-container/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: is-inside-container@1.0.0
 * pieces: chunk-20ppca50.js (4)
 * attribution: esm-layout 2
 */
import fs from "fs";
import { hasDockerEnv, hasDockerCGroup } from "../is-docker/index.js";

//@ chunk-20ppca50.js:572-578 esm-layout (moved: shares a binding it assigns)
var isDockerCache;
//@ chunk-20ppca50.js:749-796 esm-layout
function isDocker() {
  if (isDockerCache === undefined) isDockerCache = hasDockerEnv() || hasDockerCGroup();
  return isDockerCache;
}
//@ chunk-20ppca50.js:796-873 esm-layout
var isContainerCache;
var hasContainerEnv = () => {
  try {
    fs.statSync("/run/.containerenv");
    return true;
  } catch {
    return false;
  }
};
//@ chunk-20ppca50.js:873-920 esm-layout (moved: shares a binding it assigns)
function isInsideContainer() {
  if (isContainerCache === undefined) isContainerCache = hasContainerEnv() || isDocker();
  return isContainerCache;
}
export { isInsideContainer };

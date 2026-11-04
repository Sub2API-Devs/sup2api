/**
 * utils/pidSpace.ts
 *
 * 2.1.316 新增：判断 PID 命名空间（Linux/WSL /proc/self/ns/pid）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g4mgfvqt.js (5)
 * attribution: placement 5
 */
import { hostname } from "os";
import { readFile, readlink } from "fs/promises";
import { readlinkSync } from "fs";
import { identity } from "./identity.js";
import { getPlatform } from "./platform.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-g4mgfvqt.js:1454-1712 placement
async function computePidDomain(platform) {
  if (platform === "windows") return `linux:${hostname().toLowerCase()}`;
  if (platform !== "linux" && platform !== "wsl") return "linux";
  let [machineId, pidNamespace] = await Promise.all([
    readFile("/etc/machine-id", "utf8").then(
      (file) => file.trim(),
      () => "",
    ),
    readlink("/proc/self/ns/pid").catch(() => ""),
  ]);
  return `linux:${machineId}:${pidNamespace}`;
}
//@ chunk-g4mgfvqt.js:1776-1833 placement
class PidSpaceInfo {
  pidSpace = null;
  pidDomain = undefined;
  uidsCollapse = null;
}
//@ chunk-g4mgfvqt.js:1833-1877 placement
var processIdentity; // deferred: uses PidSpaceInfo of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g4mgfvqt.js:1833", () => {
  processIdentity = identity(new PidSpaceInfo(), (pidSpaceInfo) => {
    pidSpaceInfo.pidDomain = undefined;
  });
});
//@ chunk-g4mgfvqt.js:1877-2024 placement
function ownPidSpace() {
  if (processIdentity.pidSpace === null) {
    let pidNamespaceLink = "";
    try {
      pidNamespaceLink = readlinkSync("/proc/self/ns/pid");
    } catch {
      pidNamespaceLink = "";
    }
    processIdentity.pidSpace = `${hostname()}${pidNamespaceLink === "" ? "" : "#" + pidNamespaceLink}`;
  }
  return processIdentity.pidSpace;
}
//@ chunk-g4mgfvqt.js:2024-2138 placement
function ownPidDomain() {
  processIdentity.pidDomain ??= (async () => computePidDomain(getPlatform()))().catch((error) => {
    processIdentity.pidDomain = undefined;
    throw error;
  });
  return processIdentity.pidDomain;
}
export { ownPidSpace, ownPidDomain, processIdentity };

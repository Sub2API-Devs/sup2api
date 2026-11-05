/**
 * utils/pidSpace.ts
 *
 * 2.1.316 新增：判断 PID 命名空间（Linux/WSL /proc/self/ns/pid）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y28agbhb.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { hostname } from "os";
import { readFile, readlink } from "fs/promises";
import { readlinkSync } from "fs";
import { identity } from "./identity.js";
import { getPlatform } from "./platform.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-y28agbhb.js:1454-1712 placement
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
//@ chunk-y28agbhb.js:1776-1833 placement
class PidSpaceInfo {
  pidSpace = null;
  pidDomain = undefined;
  uidsCollapse = null;
}
//@ chunk-y28agbhb.js:1833-1877 placement
var processIdentity; // deferred: uses PidSpaceInfo of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-y28agbhb.js:1833", () => {
  processIdentity = identity(new PidSpaceInfo(), (pidSpaceInfo) => {
    pidSpaceInfo.pidDomain = undefined;
  });
});
//@ chunk-y28agbhb.js:1877-2025 placement
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
//@ chunk-y28agbhb.js:2025-2139 placement
function ownPidDomain() {
  processIdentity.pidDomain ??= (async () => computePidDomain(getPlatform()))().catch((error) => {
    processIdentity.pidDomain = undefined;
    throw error;
  });
  return processIdentity.pidDomain;
}
export { ownPidSpace, ownPidDomain, processIdentity };

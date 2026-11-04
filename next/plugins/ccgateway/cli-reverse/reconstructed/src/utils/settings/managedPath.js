/**
 * utils/settings/managedPath.ts
 *
 * 托管设置目录：macOS /Library/Application Support/ClaudeCode、Windows C:\Program Files\ClaudeCode、其他 /etc/claude-code；managed-settings.d 目录。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/managedPath.ts
 * pieces: chunk-dcmhvw5a.js (10)
 * attribution: placement 9, fingerprint 1
 */
import { accessSync, constants, lstatSync, readlinkSync } from "fs";
import { resolve, parse as parse_2, sep, join } from "path";
import { getErrnoCode } from "../errors.js";
import { isWritableByCurrentUser } from "../../bootstrap/stateSlices.js";
import { getPlatform } from "../platform.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:427275-427376 placement
function writabilityFromError(error) {
  switch (getErrnoCode(error)) {
    case "EACCES":
    case "EPERM":
    case "EROFS":
      return "no";
    default:
      return "unknown";
  }
}
//@ chunk-dcmhvw5a.js:427376-427445 placement
/**
 * probeWritabilitySync：同步探测路径可写。
 */
function probeWritabilitySync(path) {
  try {
    accessSync(path, constants.W_OK);
    return "yes";
  } catch (error) {
    return writabilityFromError(error);
  }
}
//@ chunk-dcmhvw5a.js:427445-427574 placement
function anyAccountCouldWrite(accountInfo, file, folder) {
  for (let euid of accountInfo.uids) {
    let writable = isWritableByCurrentUser({
      file,
      folder,
      posix: true,
      euid,
      groups: accountInfo.groups,
    });
    if (writable !== false) return writable;
  }
  return false;
}
//@ chunk-dcmhvw5a.js:427574-427584 placement
var MAX_MANAGED_PATH_SEGMENTS = 40;
//@ chunk-dcmhvw5a.js:427584-428151 placement
/**
 * 安全解析托管设置路径（逐段检查链接）。
 */
function resolveManagedPathSafely(path, accountInfo, certain) {
  let resolved = resolve(path);
  try {
    for (let j = 0; j <= MAX_MANAGED_PATH_SEGMENTS; j++) {
      let root = parse_2(resolved).root;
      let stats;
      let filtered = resolved.slice(root.length).split(sep).filter(Boolean);
      let next;
      for (let [index, segment] of filtered.entries()) {
        let certainDir = certain.get(root);
        if (certainDir === undefined) {
          stats ??= lstatSync(root);
          let info = {
            uid: stats.uid,
            gid: stats.gid,
            mode: stats.mode,
          };
          certainDir =
            anyAccountCouldWrite(accountInfo, info, info) === false && probeWritabilitySync(root) === "no";
          certain.set(root, certainDir);
        }
        if (!certainDir) return true;
        let child = join(root, segment);
        if (certain.has(child)) {
          root = child;
          stats = undefined;
          continue;
        }
        let childStats = lstatSync(child);
        if (childStats.isSymbolicLink()) {
          let linkText = readlinkSync(child);
          let filtered_2 = linkText.split(sep).filter((part) => part && part !== ".");
          if (filtered_2.lastIndexOf("..") > filtered_2.findIndex((part) => part !== "..")) return true;
          next = resolve(root, linkText, ...filtered.slice(index + 1));
          break;
        }
        root = child;
        stats = childStats;
      }
      if (next === undefined) return false;
      resolved = next;
    }
  } catch {}
  return true;
}
//@ chunk-dcmhvw5a.js:428180-428488 placement
/**
 * 托管设置文件路径与 drop-in 目录缓存。
 */
class ManagedPathCache {
  managedFilePath = undefined;
  dropInDir = undefined;
  getManagedFilePath() {
    this.managedFilePath ??= getManagedFilePath_2();
    return this.managedFilePath;
  }
  getDropInDir() {
    this.dropInDir ??= join(getManagedFilePath(), "managed-settings.d");
    return this.dropInDir;
  }
  clearDropInDir() {
    this.dropInDir = undefined;
  }
  reset() {
    this.managedFilePath = undefined;
    this.dropInDir = undefined;
  }
}
//@ chunk-dcmhvw5a.js:428488-428502 placement
/**
 * managedPathCache：托管路径缓存。
 */
var managedPathCache; // deferred: uses ManagedPathCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dcmhvw5a.js:428488", () => {
  managedPathCache = new ManagedPathCache();
});
//@ chunk-dcmhvw5a.js:428502-428547 placement
/**
 * 托管设置文件路径。
 */
function getManagedFilePath() {
  return managedPathCache.getManagedFilePath();
}
//@ chunk-dcmhvw5a.js:428547-428754 fingerprint (2.1.88 match: getManagedFilePath, 0.801)
/**
 * 托管设置根目录（按平台固定路径，见 getManagedSettingsFilePath）。
 */
function getManagedFilePath_2() {
  let managedFilePathOverride = getManagedFilePathOverride();
  if (managedFilePathOverride !== undefined) return managedFilePathOverride;
  switch (getPlatform()) {
    case "macos":
      return "/Library/Application Support/ClaudeCode";
    case "windows":
      return "C:\\Program Files\\ClaudeCode";
    default:
      return "/etc/claude-code";
  }
}
//@ chunk-dcmhvw5a.js:428754-428776 placement
function getManagedFilePathOverride() {
  return;
}
export {
  getManagedFilePath,
  managedPathCache,
  writabilityFromError,
  anyAccountCouldWrite,
  probeWritabilitySync,
  resolveManagedPathSafely,
  getManagedFilePathOverride,
};

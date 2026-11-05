/**
 * utils/settings/managedPath.ts
 *
 * 托管设置目录：macOS /Library/Application Support/ClaudeCode、Windows C:\Program Files\ClaudeCode、其他 /etc/claude-code；managed-settings.d 目录。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/managedPath.ts
 * pieces: chunk-z20c443b.js (10)
 * attribution: placement 9, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { accessSync, constants, lstatSync, readlinkSync } from "fs";
import { resolve, parse as parse_2, sep, join } from "path";
import { getErrnoCode } from "../errors.js";
import { isWritableByCurrentUser } from "../../bootstrap/stateSlices.js";
import { getPlatform } from "../platform.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:425738-425839 placement
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
//@ chunk-z20c443b.js:425839-425908 placement
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
//@ chunk-z20c443b.js:425908-426037 placement
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
//@ chunk-z20c443b.js:426037-426047 placement
var MAX_MANAGED_PATH_SEGMENTS = 40;
//@ chunk-z20c443b.js:426047-426614 placement
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
//@ chunk-z20c443b.js:426643-426951 placement
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
//@ chunk-z20c443b.js:426951-426965 placement
/**
 * managedPathCache：托管路径缓存。
 */
var managedPathCache; // deferred: uses ManagedPathCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:426951", () => {
  managedPathCache = new ManagedPathCache();
});
//@ chunk-z20c443b.js:426965-427010 placement
/**
 * 托管设置文件路径。
 */
function getManagedFilePath() {
  return managedPathCache.getManagedFilePath();
}
//@ chunk-z20c443b.js:427010-427217 fingerprint (2.1.88 match: getManagedFilePath, 0.801)
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
//@ chunk-z20c443b.js:427217-427239 placement
function getManagedFilePathOverride() {
  return;
}
export {
  getManagedFilePath,
  getManagedFilePathOverride,
  managedPathCache,
  writabilityFromError,
  anyAccountCouldWrite,
  probeWritabilitySync,
  resolveManagedPathSafely,
};

/**
 * utils/plugins/fileIdentity.ts
 *
 * 2.1.316 新增：文件身份
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstat, readdir } from "fs/promises";
import { dirname, join } from "path";
import { isSentinelInode } from "../slowOperations.js";
import { stripInvisibleChars as stripInvisibleChars_3 } from "./syncedItems.js";
import { foldName } from "../permissions/protectedDirNames.js";

//@ chunk-5xgkngpb.js:621946-622001 placement
/**
 * isSameFileIdentity：两路径是否为同一文件。
 */
async function isSameFileIdentity(pathA, pathB) {
  return (await compareFileIdentity(pathA, pathB)) === "same";
}
//@ chunk-5xgkngpb.js:622001-622349 placement
/**
 * 用 bigint lstat 比较两路径的 dev/ino；inode 是哨兵值或与父目录相同时退回比较去掉不可见字符后的路径。返回 same/different/unknown。
 */
async function compareFileIdentity(pathA, pathB) {
  if (pathA === pathB) return "same";
  try {
    let [statA, statB, parentStatA] = await Promise.all([
      lstat(pathA, {
        bigint: true,
      }),
      lstat(pathB, {
        bigint: true,
      }),
      lstat(dirname(pathA), {
        bigint: true,
      }),
    ]);
    if (isSentinelInode(statA.ino) !== isSentinelInode(statB.ino)) return "unknown";
    if (isSentinelInode(statA.ino) || (statA.dev === parentStatA.dev && statA.ino === parentStatA.ino))
      return stripInvisibleChars_3(pathA) === stripInvisibleChars_3(pathB) ? "same" : "different";
    return statA.dev === statB.dev && statA.ino === statB.ino ? "same" : "different";
  } catch {
    return "different";
  }
}
//@ chunk-5xgkngpb.js:622349-622629 placement
/**
 * 返回判定同步条目是否仍指向已知目标的函数（live/not-live/indeterminate）。
 */
function createLiveEntryClassifier(liveDirs) {
  let liveByStrip = new Map(Array.from(liveDirs, (dir) => [stripInvisibleChars_3(dir), dir]));
  return async (entryPath) => {
    let liveDir = liveByStrip.get(stripInvisibleChars_3(entryPath));
    if (liveDir === undefined) return "not-live";
    let identity = await compareFileIdentity(entryPath, liveDir);
    if (identity === "same") return "live";
    if (identity === "unknown") return "indeterminate";
    try {
      await lstat(liveDir);
      return "not-live";
    } catch {
      return "indeterminate";
    }
  };
}
//@ chunk-5xgkngpb.js:622629-622914 placement
/**
 * 递归查找是否含 git 目录（HEAD + commondir/refs）。
 */
async function containsGitDirectory(rootDir) {
  let pending = [rootDir];
  while (pending.length > 0) {
    let dir = pending.pop();
    let entries;
    try {
      entries = await readdir(dir, {
        withFileTypes: true,
      });
    } catch {
      continue;
    }
    let names = new Set(entries.map((entry) => foldName(entry.name)));
    if (names.has("head") && (names.has("commondir") || names.has("refs"))) return true;
    for (let entry of entries) if (entry.isDirectory()) pending.push(join(dir, entry.name));
  }
  return false;
}
export { containsGitDirectory, isSameFileIdentity, createLiveEntryClassifier };

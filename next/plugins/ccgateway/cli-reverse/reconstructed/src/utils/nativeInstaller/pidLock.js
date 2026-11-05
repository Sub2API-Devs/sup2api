/**
 * utils/nativeInstaller/pidLock.ts
 *
 * 版本锁：按 PID 锁住正在使用的版本目录（进程存活检查、过期锁清理、进程生命周期锁），防止清理时删掉运行中的二进制
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/nativeInstaller/pidLock.ts
 * pieces: chunk-e5z7dpjd.js (10), chunk-p3km1ynr.js (1)
 * attribution: affinity 1, callgraph-witnessed 1, fingerprint 7, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { mkdir, readdir, lstat } from "fs/promises";
import { unlinkSync } from "fs";
import { bundleVersionOfPath, versionOrDefault } from "./bundlePaths.js";
import { isAutoUpdateEnabled } from "./download.js";
import { getLocksDir } from "./lockDir.js";
import { writeFileAtomic, syncTarget } from "../atomicPublishWrite.js";
import { jsonStringify } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, getErrnoCode, isENOENT, toError } from "../errors.js";
import { getProcessCommand } from "../processIdentity.js";
import { readFileSafe } from "../file.js";
import { getFsImplementation } from "../fsOperations.js";
import { embeddedSearchToolsBinaryPath } from "../embeddedTools.js";
import { getTaskListLockPath_2, classifyErrno } from "./lockFiles.js";

//@ chunk-p3km1ynr.js:586-1025 fingerprint (2.1.88 match: getAllLockInfo, 0.577)
async function getAllLockInfo() {
  let version = bundleVersionOfPath(process.execPath);
  if (version === undefined || !isAutoUpdateEnabled()) return;
  try {
    let fs = getLocksDir();
    let lockFilePath = join(fs, `${version}@${process.pid}.lock`);
    let lockInfo = {
      pid: process.pid,
      version,
      execPath: process.execPath,
      acquiredAt: Date.now(),
    };
    await mkdir(fs, {
      recursive: true,
    });
    await writeFileAtomic(lockFilePath, jsonStringify(lockInfo, null, 2));
    process.on("exit", () => {
      try {
        unlinkSync(lockFilePath);
      } catch {}
    });
  } catch (error) {
    logForDebugging(
      `Could not write this process's version lock, so a later update may delete the app bundle it runs from: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-e5z7dpjd.js:20085-20100 affinity
var LOCK_STALE_MS = 7200000;
//@ chunk-e5z7dpjd.js:20100-20196 callgraph-witnessed (2.1.88 match: isProcessRunning, 0.516)
function isProcessRunning(pid) {
  if (pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return getErrnoCode(error) === "EPERM";
  }
}
//@ chunk-e5z7dpjd.js:20196-20391 fingerprint (2.1.88 match: isClaudeProcess, 1)
function isClaudeProcess(pid, expectedExecPath) {
  if (!isProcessRunning(pid)) return false;
  if (pid === process.pid) return true;
  try {
    let command = getProcessCommand(pid);
    if (!command) return true;
    let normalizedCommand = command.toLowerCase();
    let normalizedExecPath = expectedExecPath.toLowerCase();
    return normalizedCommand.includes("claude") || normalizedCommand.includes(normalizedExecPath);
  } catch {
    return true;
  }
}
//@ chunk-e5z7dpjd.js:20651-20955 fingerprint (2.1.88 match: isLockActive, 1)
function isLockActive(lockFilePath, content) {
  let content_2 = content !== undefined ? content : readFileSafe(lockFilePath);
  if (!content_2) return false;
  let { pid, execPath } = content_2;
  if (!isProcessRunning(pid)) return false;
  if (!isClaudeProcess(pid, execPath)) {
    logForDebugging(`Lock PID ${pid} is running but does not appear to be Claude - treating as stale`);
    return false;
  }
  let fs = getFsImplementation();
  try {
    let stats = fs.statSync(lockFilePath);
    if (Date.now() - stats.mtimeMs > LOCK_STALE_MS) {
      if (!isProcessRunning(pid)) return false;
    }
  } catch {}
  return true;
}
//@ chunk-e5z7dpjd.js:20955-20990 layout
function writeLockFile(lockFilePath, content) {
  syncTarget(lockFilePath, jsonStringify(content, null, 2));
}
//@ chunk-e5z7dpjd.js:20990-21523 fingerprint (2.1.88 match: tryAcquireLock, 1)
/**
 * tryAcquireLock：写 {pid,version,execPath,acquiredAt} 的 PID 锁文件，持有者存活且是 Claude 进程时失败。
 */
async function tryAcquireLock(versionPath, lockFilePath) {
  let fs = getFsImplementation();
  let versionName = versionOrDefault(versionPath);
  if (isLockActive(lockFilePath)) {
    let existingContent = readFileSafe(lockFilePath);
    logForDebugging(`Cannot acquire lock for ${versionName} - held by PID ${existingContent?.pid}`);
    return null;
  }
  let lockContent = {
    pid: process.pid,
    version: versionName,
    execPath: process.execPath,
    acquiredAt: Date.now(),
  };
  try {
    writeLockFile(lockFilePath, lockContent);
    if (readFileSafe(lockFilePath)?.pid !== process.pid) return null;
    logForDebugging(`Acquired PID lock for ${versionName} (PID ${process.pid})`);
    return () => {
      try {
        if (readFileSafe(lockFilePath)?.pid === process.pid) {
          fs.unlinkSync(lockFilePath);
          logForDebugging(`Released PID lock for ${versionName}`);
        }
      } catch (error) {
        logForDebugging(`Failed to release lock for ${versionName}: ${error}`);
      }
    };
  } catch (error) {
    logForDebugging(`Failed to acquire lock for ${versionName}: ${error}`);
    return null;
  }
}
//@ chunk-e5z7dpjd.js:21523-21687 fingerprint (2.1.88 match: acquireProcessLifetimeLock, 1)
async function acquireProcessLifetimeLock(versionPath, lockFilePath) {
  let release = await tryAcquireLock(versionPath, lockFilePath);
  if (!release) return false;
  let cleanup = () => {
    try {
      release();
    } catch {}
  };
  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  return true;
}
//@ chunk-e5z7dpjd.js:21687-21784 layout
async function withProcessLock(versionPath, lockFilePath, callback) {
  let release = await tryAcquireLock(versionPath, lockFilePath);
  if (!release) return false;
  try {
    await callback();
    return true;
  } finally {
    release();
  }
}
//@ chunk-e5z7dpjd.js:21784-22431 fingerprint (2.1.88 match: cleanupStaleLocks, 0.732)
async function cleanupStaleLocks(locksDir) {
  let fs = getFsImplementation();
  let cleanedCount = 0;
  let lockEntries;
  try {
    lockEntries = (await readdir(locksDir)).filter((fileName) => fileName.endsWith(".lock"));
  } catch (error) {
    if (isENOENT(error)) return 0;
    logForDebugging(`Failed to readdir locks directory: ${toError(error).message}`, {
      level: "error",
    });
    return 0;
  }
  for (let lockEntry of lockEntries) {
    let lockFilePath = join(locksDir, lockEntry);
    try {
      if ((await lstat(lockFilePath)).isDirectory()) {
        fs.rmSync(lockFilePath, {
          recursive: true,
          force: true,
        });
        cleanedCount++;
        logForDebugging(`Cleaned up legacy directory lock: ${lockEntry}`);
      } else {
        let raw = null;
        let unreadable = false;
        try {
          raw = fs.readFileSync(lockFilePath, {
            encoding: "utf8",
          });
        } catch (error) {
          if (isENOENT(error)) continue;
          unreadable = true;
          logForDebugging(
            `Skipping stale-lock sweep of unreadable lock ${lockEntry}: ${toError(error).message}`,
          );
        }
        if (!unreadable && !isLockActive(lockFilePath, embeddedSearchToolsBinaryPath(raw ?? ""))) {
          fs.unlinkSync(lockFilePath);
          cleanedCount++;
          logForDebugging(`Cleaned up stale lock: ${lockEntry}`);
        }
      }
    } catch {}
    await new Promise((error) => setImmediate(error));
  }
  return cleanedCount;
}
//@ chunk-e5z7dpjd.js:23913-24246 fingerprint (2.1.88 match: readLockContent, 0.565)
function readLockContent(locks, taskListName) {
  let fs = getFsImplementation();
  let lockNames;
  try {
    lockNames = fs
      .readdirSync(locks)
      .map((dirent) => dirent.name)
      .filter((lockNameArg) => getTaskListLockPath_2(lockNameArg, taskListName));
  } catch (error) {
    return !isENOENT(error);
  }
  for (let lockName of lockNames) {
    let lockPath = join(locks, lockName);
    let raw;
    try {
      raw = fs.readFileSync(lockPath, {
        encoding: "utf8",
      });
    } catch (error) {
      if (isENOENT(error)) continue;
      if (classifyErrno(error) === "transient") return true;
      continue;
    }
    let parsed = embeddedSearchToolsBinaryPath(raw);
    if (
      parsed &&
      parsed.version === taskListName &&
      parsed.pid !== process.pid &&
      isLockActive(lockPath, parsed)
    )
      return true;
  }
  return false;
}
export {
  writeLockFile,
  withProcessLock,
  isLockActive,
  isProcessRunning,
  getAllLockInfo,
  acquireProcessLifetimeLock,
  cleanupStaleLocks,
  readLockContent,
  tryAcquireLock,
};

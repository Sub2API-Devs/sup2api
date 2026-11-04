/**
 * utils/nativeInstaller/pidLock.ts
 *
 * 版本锁：按 PID 锁住正在使用的版本目录（进程存活检查、过期锁清理、进程生命周期锁），防止清理时删掉运行中的二进制
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/nativeInstaller/pidLock.ts
 * pieces: chunk-zw17mz74.js (10)
 * attribution: affinity 1, callgraph-witnessed 1, fingerprint 6, layout 2
 */
import { basename, join } from "path";
import { readdir, lstat } from "fs/promises";
import { getProcessCommand } from "../processIdentity.js";
import { getFsImplementation } from "../fsOperations.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { writeAndPublishSync } from "../atomicPublishWrite.js";
import { isENOENT, toError } from "../errors.js";

//@ chunk-zw17mz74.js:17940-17955 affinity
var LOCK_STALE_MS = 7200000;
//@ chunk-zw17mz74.js:17955-18035 callgraph-witnessed = isProcessRunning (1)
function isProcessRunning(pid) {
  if (pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-zw17mz74.js:18035-18230 fingerprint = isClaudeProcess (1)
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
//@ chunk-zw17mz74.js:18230-18439 fingerprint = readLockContent (1)
function readLockContent(lockFilePath) {
  let fs = getFsImplementation();
  try {
    let content = fs.readFileSync(lockFilePath, {
      encoding: "utf8",
    });
    if (!content || content.trim() === "") return null;
    let parsed = jsonParse(content);
    if (typeof parsed.pid !== "number" || !parsed.version || !parsed.execPath) return null;
    return parsed;
  } catch {
    return null;
  }
}
//@ chunk-zw17mz74.js:18439-18728 fingerprint = isLockActive (1)
function isLockActive(lockFilePath) {
  let content = readLockContent(lockFilePath);
  if (!content) return false;
  let { pid, execPath } = content;
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
//@ chunk-zw17mz74.js:18728-18763 layout
function writeLockFile(lockFilePath, lockContent) {
  writeAndPublishSync(lockFilePath, jsonStringify(lockContent, null, 2));
}
//@ chunk-zw17mz74.js:18763-19295 fingerprint = tryAcquireLock (1)
/**
 * tryAcquireLock：写 {pid,version,execPath,acquiredAt} 的 PID 锁文件，持有者存活且是 Claude 进程时失败。
 */
async function tryAcquireLock(versionPath, lockFilePath) {
  let fs = getFsImplementation();
  let versionName = basename(versionPath);
  if (isLockActive(lockFilePath)) {
    let existingContent = readLockContent(lockFilePath);
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
    if (readLockContent(lockFilePath)?.pid !== process.pid) return null;
    logForDebugging(`Acquired PID lock for ${versionName} (PID ${process.pid})`);
    return () => {
      try {
        if (readLockContent(lockFilePath)?.pid === process.pid) {
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
//@ chunk-zw17mz74.js:19295-19459 fingerprint = acquireProcessLifetimeLock (1)
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
//@ chunk-zw17mz74.js:19459-19556 layout
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
//@ chunk-zw17mz74.js:19556-20027 fingerprint = cleanupStaleLocks (0.858)
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
      } else if (!isLockActive(lockFilePath)) {
        fs.unlinkSync(lockFilePath);
        cleanedCount++;
        logForDebugging(`Cleaned up stale lock: ${lockEntry}`);
      }
    } catch {}
    await new Promise((error) => setImmediate(error));
  }
  return cleanedCount;
}
export { withProcessLock, isLockActive, readLockContent, acquireProcessLifetimeLock, cleanupStaleLocks };

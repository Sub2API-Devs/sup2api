/**
 * utils/computerUse/computerUseLock.ts
 *
 * （归属存疑）旧版 computer-use 锁；316 中此处收集的是服务器锁文件读取、上传连接统计、插件宿主动作等误归代码。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/computerUse/computerUseLock.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-e5z7dpjd.js (2)
 * attribution: fingerprint 2, affinity 1
 */
import { transcriptVersion, CLI_VERSION } from "../sessionStorage.js";
import { getFsImplementation } from "../fsOperations.js";
import { versionOrDefault } from "../nativeInstaller/bundlePaths.js";
import { getTaskListLockPath } from "../nativeInstaller/lockFiles.js";
import { writeLockFile } from "../nativeInstaller/pidLock.js";
import { logForDebugging } from "../debug.js";

//@ chunk-5xgkngpb.js:352086-352146 fingerprint (2.1.88 match: isComputerUseLock, 0.575)
function transcriptVersionOrDefault(entry) {
  return transcriptVersion(entry) ?? ("sessionId" in entry ? undefined : CLI_VERSION);
}
//@ chunk-e5z7dpjd.js:22771-22789 affinity
var heldLockPath = null;
var exitHookInstalled_2 = false;
//@ chunk-e5z7dpjd.js:22789-23172 fingerprint (2.1.88 match: tryAcquireComputerUseLock, 0.405)
function tryAcquireComputerUseLock(version, dir) {
  let sessionId = getFsImplementation();
  let lockVersion = versionOrDefault(version);
  let lockFilePath = getTaskListLockPath(dir, lockVersion, process.pid);
  try {
    writeLockFile(lockFilePath, {
      pid: process.pid,
      version: lockVersion,
      execPath: process.execPath,
      acquiredAt: Date.now(),
    });
  } catch (error) {
    logForDebugging(`NON-FATAL: Failed to write per-PID lock for ${lockVersion}: ${error}`);
    return false;
  }
  heldLockPath = lockFilePath;
  if (!exitHookInstalled_2) {
    exitHookInstalled_2 = true;
    let cleanup = () => {
      try {
        if (heldLockPath) {
          sessionId.unlinkSync(heldLockPath);
          heldLockPath = null;
        }
      } catch {}
    };
    process.on("exit", cleanup);
  }
  logForDebugging(`Wrote per-PID lock for ${lockVersion} (PID ${process.pid})`);
  return true;
}
export { transcriptVersionOrDefault, tryAcquireComputerUseLock };

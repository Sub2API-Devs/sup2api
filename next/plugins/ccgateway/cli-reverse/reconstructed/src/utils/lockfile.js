/**
 * utils/lockfile.ts
 *
 * proper-lockfile 封装：lock() 返回支持 await using 的释放函数（含内联的 proper-lockfile npm 代码）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/lockfile.ts
 * pieces: chunk-3c7mkwg0.js (4)
 * attribution: placement 3, fingerprint 1
 */
import { properLockfileIndex } from "../../vendor/proper-lockfile/index.js";
import { getErrnoCode, errorMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";

//@ chunk-3c7mkwg0.js:22139-22165 placement
function requireProperLockfile() {
  return properLockfileIndex();
}
//@ chunk-3c7mkwg0.js:22165-22265 fingerprint (2.1.88 match: lock, 0.66)
/**
 * lock：proper-lockfile 加锁并让返回的释放函数支持 `await using`（Symbol.asyncDispose）。全局配置、history、OAuth 刷新等都用它。
 */
async function lock(file, options) {
  let lockHandle = await requireProperLockfile().lock(file, options);
  return Object.assign(lockHandle, {
    [Symbol.asyncDispose]: lockHandle,
  });
}
//@ chunk-3c7mkwg0.js:22265-22306 placement
function checkLockfile(options, options_2) {
  return requireProperLockfile().check(options, options_2);
}
//@ chunk-3c7mkwg0.js:22306-22694 placement
async function releaseLockQuietly(release, label) {
  if (!release) return;
  try {
    await release();
  } catch (error) {
    let message;
    try {
      let errnoCode = getErrnoCode(error);
      message =
        errnoCode === "ERELEASED" || errnoCode === "ENOTACQUIRED"
          ? `lock was no longer held at release (${errnoCode}); the locked section may have run without exclusivity`
          : `lock directory could not be removed and is left to go stale: ${errorMessage(error)}`;
    } catch {
      message = "lock release rejected with a value that cannot be described";
    }
    logForDebugging(`${label}: ${message}`, {
      level: "warn",
    });
  }
}
export { lock, releaseLockQuietly, checkLockfile };

/**
 * utils/lockfile.ts
 *
 * proper-lockfile 封装：lock() 返回支持 await using 的释放函数（含内联的 proper-lockfile npm 代码）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/lockfile.ts
 * pieces: chunk-1tz177x8.js (1), chunk-bmbhxpfm.js (4)
 * attribution: fingerprint 2, placement 3
 */
import { properLockfileIndex } from "../../vendor/proper-lockfile/index.js";
import { getErrnoCode, errorMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { validateStateRef, stateGetForPlugin } from "../plugins/functionHooks/api/state.js";

//@ chunk-bmbhxpfm.js:22139-22165 placement
function requireProperLockfile() {
  return properLockfileIndex();
}
//@ chunk-bmbhxpfm.js:22165-22265 fingerprint (2.1.88 match: lock, 0.659)
/**
 * lock：proper-lockfile 加锁并让返回的释放函数支持 `await using`（Symbol.asyncDispose）。全局配置、history、OAuth 刷新等都用它。
 */
async function lock(file, options) {
  let lockHandle = await requireProperLockfile().lock(file, options);
  return Object.assign(lockHandle, {
    [Symbol.asyncDispose]: lockHandle,
  });
}
//@ chunk-bmbhxpfm.js:22265-22306 placement
function checkLockfile(resolvedPath, options) {
  return requireProperLockfile().check(resolvedPath, options);
}
//@ chunk-bmbhxpfm.js:22306-22694 placement
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
//@ chunk-1tz177x8.js:39326-39353 fingerprint (2.1.88 match: check, 0.689)
var check = {
  check: validateStateRef,
  run: stateGetForPlugin,
};
export { lock, releaseLockQuietly, check, checkLockfile };

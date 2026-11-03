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
/**
 * lock：proper-lockfile 加锁并让返回的释放函数支持 `await using`（Symbol.asyncDispose）。全局配置、history、OAuth 刷新等都用它。
 */
//@ chunk-bmbhxpfm.js:22165-22265 fingerprint = lock (0.659)
async function lock(file, options) {
  let lock = await requireProperLockfile().lock(file, options);
  return Object.assign(lock, { [Symbol.asyncDispose]: lock });
}
//@ chunk-bmbhxpfm.js:22265-22306 placement
function checkLockfile(e, r) {
  return requireProperLockfile().check(e, r);
}
//@ chunk-bmbhxpfm.js:22306-22694 placement
async function releaseLockQuietly(e, r) {
  if (!e) return;
  try {
    await e();
  } catch (error) {
    let i;
    try {
      let u = getErrnoCode(error);
      i =
        u === "ERELEASED" || u === "ENOTACQUIRED"
          ? `lock was no longer held at release (${u}); the locked section may have run without exclusivity`
          : `lock directory could not be removed and is left to go stale: ${errorMessage(error)}`;
    } catch {
      i = "lock release rejected with a value that cannot be described";
    }
    logForDebugging(`${r}: ${i}`, { level: "warn" });
  }
}
//@ chunk-1tz177x8.js:39326-39353 fingerprint = check (0.689)
var check = { check: validateStateRef, run: stateGetForPlugin };

export { lock, releaseLockQuietly, check, checkLockfile };

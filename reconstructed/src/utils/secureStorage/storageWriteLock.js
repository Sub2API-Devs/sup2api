/**
 * utils/secureStorage/storageWriteLock.ts
 *
 * 2.1.316 新增：安全存储写锁
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b29hdd5e.js (8)
 * attribution: placement 8
 */
import { AsyncLocalStorage } from "async_hooks";
import { join } from "path";
import { isDiskless } from "../../bootstrap/state.js";
import { getProjectDirsUpToHome } from "./macOsKeychainHelpers.js";
import { getFsImplementation } from "../fsOperations.js";
import { lock } from "../lockfile.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-b29hdd5e.js:764-807 placement
var READ_FAILED = Symbol("secureStorage.READ_FAILED");
//@ chunk-b29hdd5e.js:883-915 placement
var secureStorageWriteContext = new AsyncLocalStorage();
var resolved = Promise.resolve();
//@ chunk-b29hdd5e.js:915-1422 placement
/**
 * 串行化安全存储的写操作（同一异步上下文可重入）。
 */
async function withStorageWriteLock(e) {
  if (secureStorageWriteContext.getStore()) return e();
  let r = resolved;
  let a;
  resolved = new Promise((resolve) => {
    a = resolve;
  });
  try {
    await r;
    if (isDiskless()) return await secureStorageWriteContext.run(true, e);
    let projectDirsUpToHome = getProjectDirsUpToHome();
    await getFsImplementation().mkdir(projectDirsUpToHome);
    let o = await lock(join(projectDirsUpToHome, ".storage-write"), {
      realpath: false,
      retries: {
        retries: 10,
        minTimeout: 100,
        maxTimeout: 1000,
      },
      stale: 15000,
      onCompromised: (s) =>
        logForDebugging(`[secureStorage] write lock compromised: ${errorMessage(s)}`, {
          level: "warn",
        }),
    });
    try {
      return await secureStorageWriteContext.run(true, e);
    } finally {
      await o().catch((error) =>
        logForDebugging(`[secureStorage] write lock release failed: ${errorMessage(error)}`, {
          level: "warn",
        }),
      );
    }
  } finally {
    a();
  }
}
//@ chunk-b29hdd5e.js:1422-1463 placement
async function runInsideWriteLock(e) {
  return secureStorageWriteContext.run(true, e);
}
//@ chunk-b29hdd5e.js:1463-1787 placement
function mutateSecureStorage(plainTextStorage, r, a) {
  return withStorageWriteLock(async () => {
    plainTextStorage.invalidateCache?.();
    let n = await (plainTextStorage.readAsyncStrict?.(a, {
      inaccessibleAs: "failureIfTransient",
    }) ?? plainTextStorage.readAsync(a));
    if (n === READ_FAILED) {
      logFeatureSad("secure_storage_credentials_write", "read_failed_skip_write");
      return {
        success: false,
        transient: true,
      };
    }
    let o = n ?? {};
    let s = r(o);
    return s === o
      ? {
          success: true,
        }
      : await plainTextStorage.update(s, a);
  });
}
//@ chunk-b29hdd5e.js:1787-1830 placement
var FALLBACK_LEGS_SYMBOL = Symbol("secureStorage.fallbackLegs");
//@ chunk-b29hdd5e.js:1830-1858 placement
function storageMarker(e) {
  return e[FALLBACK_LEGS_SYMBOL];
}
//@ chunk-b29hdd5e.js:1858-2006 placement
function stripSlackBinding(e) {
  let slackTag = e?.slackTag;
  if (typeof slackTag !== "object" || slackTag === null || !("lastBinding" in slackTag)) return e;
  let { lastBinding, ...n } = slackTag;
  return {
    ...e,
    slackTag: n,
  };
}
export {
  READ_FAILED,
  storageMarker,
  withStorageWriteLock,
  stripSlackBinding,
  mutateSecureStorage,
  runInsideWriteLock,
};

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
import { join, join as join_2, join as join_3 } from "path";
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
var m = new AsyncLocalStorage(),
  resolved = Promise.resolve();
/**
 * 串行化安全存储的写操作（同一异步上下文可重入）。
 */
//@ chunk-b29hdd5e.js:915-1422 placement
async function withStorageWriteLock(e) {
  if (m.getStore()) return e();
  let r = resolved,
    a;
  resolved = new Promise((n) => {
    a = n;
  });
  try {
    if ((await r, isDiskless())) return await m.run(!0, e);
    let n = getProjectDirsUpToHome();
    await getFsImplementation().mkdir(n);
    let o = await lock(join_2(n, ".storage-write"), {
      realpath: !1,
      retries: { retries: 10, minTimeout: 100, maxTimeout: 1000 },
      stale: 15000,
      onCompromised: (s) =>
        logForDebugging(`[secureStorage] write lock compromised: ${errorMessage(s)}`, { level: "warn" }),
    });
    try {
      return await m.run(!0, e);
    } finally {
      await o().catch((s) =>
        logForDebugging(`[secureStorage] write lock release failed: ${errorMessage(s)}`, { level: "warn" }),
      );
    }
  } finally {
    a();
  }
}
//@ chunk-b29hdd5e.js:1422-1463 placement
async function runInsideWriteLock(e) {
  return m.run(!0, e);
}
//@ chunk-b29hdd5e.js:1463-1787 placement
function mutateSecureStorage(e, r, a) {
  return withStorageWriteLock(async () => {
    e.invalidateCache?.();
    let n = await (e.readAsyncStrict?.(a, { inaccessibleAs: "failureIfTransient" }) ?? e.readAsync(a));
    if (n === READ_FAILED)
      return (
        logFeatureSad("secure_storage_credentials_write", "read_failed_skip_write"),
        { success: !1, transient: !0 }
      );
    let o = n ?? {},
      s = r(o);
    return s === o ? { success: !0 } : await e.update(s, a);
  });
}
//@ chunk-b29hdd5e.js:1787-1830 placement
var F = Symbol("secureStorage.fallbackLegs");
//@ chunk-b29hdd5e.js:1830-1858 placement
function storageMarker(e) {
  return e[F];
}
//@ chunk-b29hdd5e.js:1858-2006 placement
function stripSlackBinding(e) {
  let r = e?.slackTag;
  if (typeof r !== "object" || r === null || !("lastBinding" in r)) return e;
  let { lastBinding: lastBinding, ...n } = r;
  return { ...e, slackTag: n };
}

export {
  READ_FAILED,
  storageMarker,
  withStorageWriteLock,
  stripSlackBinding,
  mutateSecureStorage,
  runInsideWriteLock,
};

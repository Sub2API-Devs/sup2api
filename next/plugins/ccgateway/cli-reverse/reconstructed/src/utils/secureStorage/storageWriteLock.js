/**
 * utils/secureStorage/storageWriteLock.ts
 *
 * 2.1.316 新增：安全存储写锁
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5me9t3vk.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5me9t3vk.js:801-844 placement
var READ_FAILED; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5me9t3vk.js:801", () => {
  READ_FAILED = Symbol("secureStorage.READ_FAILED");
});
//@ chunk-5me9t3vk.js:920-952 placement
var secureStorageWriteContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var resolved;
deferInit("chunk-5me9t3vk.js:920", () => {
  secureStorageWriteContext = new AsyncLocalStorage();
  resolved = Promise.resolve();
});
//@ chunk-5me9t3vk.js:952-1459 placement
/**
 * 串行化安全存储的写操作（同一异步上下文可重入）。
 */
async function withStorageWriteLock(fn) {
  if (secureStorageWriteContext.getStore()) return fn();
  let previous = resolved;
  let release;
  resolved = new Promise((resolve) => {
    release = resolve;
  });
  try {
    await previous;
    if (isDiskless()) return await secureStorageWriteContext.run(true, fn);
    let projectDirsUpToHome = getProjectDirsUpToHome();
    await getFsImplementation().mkdir(projectDirsUpToHome);
    let releaseLock = await lock(join(projectDirsUpToHome, ".storage-write"), {
      realpath: false,
      retries: {
        retries: 10,
        minTimeout: 100,
        maxTimeout: 1000,
      },
      stale: 15000,
      onCompromised: (error) =>
        logForDebugging(`[secureStorage] write lock compromised: ${errorMessage(error)}`, {
          level: "warn",
        }),
    });
    try {
      return await secureStorageWriteContext.run(true, fn);
    } finally {
      await releaseLock().catch((error) =>
        logForDebugging(`[secureStorage] write lock release failed: ${errorMessage(error)}`, {
          level: "warn",
        }),
      );
    }
  } finally {
    release();
  }
}
//@ chunk-5me9t3vk.js:1459-1500 placement
async function runInsideWriteLock(fn) {
  return secureStorageWriteContext.run(true, fn);
}
//@ chunk-5me9t3vk.js:1500-1824 placement
function mutateSecureStorage(backend, mutate, options) {
  return withStorageWriteLock(async () => {
    backend.invalidateCache?.();
    let current = await (backend.readAsyncStrict?.(options, {
      inaccessibleAs: "failureIfTransient",
    }) ?? backend.readAsync(options));
    if (current === READ_FAILED) {
      logFeatureSad("secure_storage_credentials_write", "read_failed_skip_write");
      return {
        success: false,
        transient: true,
      };
    }
    let base = current ?? {};
    let next = mutate(base);
    return next === base
      ? {
          success: true,
        }
      : await backend.update(next, options);
  });
}
//@ chunk-5me9t3vk.js:1824-1867 placement
var FALLBACK_LEGS_SYMBOL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5me9t3vk.js:1824", () => {
  FALLBACK_LEGS_SYMBOL = Symbol("secureStorage.fallbackLegs");
});
//@ chunk-5me9t3vk.js:1867-1895 placement
function storageMarker(marker) {
  return marker[FALLBACK_LEGS_SYMBOL];
}
//@ chunk-5me9t3vk.js:1895-2043 placement
function stripSlackBinding(value) {
  let slackTag = value?.slackTag;
  if (typeof slackTag !== "object" || slackTag === null || !("lastBinding" in slackTag)) return value;
  let { lastBinding, ...rest } = slackTag;
  return {
    ...value,
    slackTag: rest,
  };
}
export {
  READ_FAILED,
  mutateSecureStorage,
  storageMarker,
  withStorageWriteLock,
  stripSlackBinding,
  runInsideWriteLock,
};

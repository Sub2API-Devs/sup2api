/**
 * utils/secureStorage/plainTextStorage.ts
 *
 * 明文凭据存储 ~/.claude/.credentials.json（0600），以及宿主托管凭据后端与 diskless 空后端的选择。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/secureStorage/plainTextStorage.ts
 * pieces: chunk-5me9t3vk.js (20)
 * attribution: placement 14, fingerprint 2, layout 4
 */
import { join } from "path";
import { chmod } from "fs/promises";
import { getProjectDirsUpToHome } from "./macOsKeychainHelpers.js";
import { isDiskless, getRootSession } from "../../bootstrap/state.js";
import { READ_FAILED, mutateSecureStorage } from "./storageWriteLock.js";
import { getFsImplementation } from "../fsOperations.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { getErrnoCode } from "../errors.js";
import { filePath } from "../atomicPublishWrite.js";
import { preservedTmpOf } from "./preservedTmpNotice.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { HostScoped } from "../hostScoped.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5me9t3vk.js:2249-2255 placement
var plainTextStoragePromise;
//@ chunk-5me9t3vk.js:2255-2324 placement
/**
 * isPlainTextStorageAvailable：明文凭据存储是否可用。
 */
function isPlainTextStorageAvailable() {
  if (plainTextStoragePromise !== undefined) return plainTextStoragePromise;
  plainTextStoragePromise = Promise.resolve(false);
  return plainTextStoragePromise;
}
//@ chunk-5me9t3vk.js:2388-2492 fingerprint (2.1.88 match: getStoragePath, 1)
/**
 * 明文凭据位置：<配置目录>/.credentials.json。
 */
function getStoragePath() {
  let storageDir = getProjectDirsUpToHome();
  let storageFileName = ".credentials.json";
  return {
    storageDir,
    storagePath: join(storageDir, ".credentials.json"),
  };
}
//@ chunk-5me9t3vk.js:2492-2537 layout
function getStoragePathIfDiskful() {
  return isDiskless() ? null : getStoragePath().storagePath;
}
//@ chunk-5me9t3vk.js:2537-2590 layout
var PLAINTEXT_STORAGE_WARNING = "Warning: Storing credentials in plaintext.";
//@ chunk-5me9t3vk.js:2590-2729 layout
function classifyReadErrorLenient(code, platform) {
  if (code === "ENOENT" || code === "EISDIR" || code === "ENOTDIR") return null;
  if ((code === "EACCES" || code === "EPERM") && platform !== "win32") return null;
  return READ_FAILED;
}
//@ chunk-5me9t3vk.js:2729-2773 layout
function classifyReadErrorStrict(code, platform) {
  return code === "ENOENT" ? null : READ_FAILED;
}
//@ chunk-5me9t3vk.js:2773-3567 fingerprint (2.1.88 match: plainTextStorage, 0.398)
/**
 * 明文凭据文件后端（read/readStrict/write(权限 0600)/remove）与 diskless 会话的空后端。
 */
var fileCredentialBackend = {
  async read() {
    let { storagePath } = getStoragePath();
    try {
      let data = await getFsImplementation().readFile(storagePath, {
        encoding: "utf8",
      });
      return jsonParse(data);
    } catch {
      return null;
    }
  },
  async readStrict(strict) {
    let { storagePath } = getStoragePath();
    let data;
    try {
      data = await getFsImplementation().readFile(storagePath, {
        encoding: "utf8",
      });
    } catch (error) {
      return (strict ? classifyReadErrorStrict : classifyReadErrorLenient)(getErrnoCode(error), "linux");
    }
    try {
      return jsonParse(data);
    } catch {
      if (strict) return READ_FAILED;
      return null;
    }
  },
  async write(data) {
    try {
      let { storageDir, storagePath } = getStoragePath();
      await getFsImplementation().mkdir(storageDir);
      await filePath(storagePath, jsonStringify(data), {
        mode: 384,
        flush: true,
        flushForgivesEbadf: true,
      });
      await chmod(storagePath, 384);
      return {
        success: true,
        warning: PLAINTEXT_STORAGE_WARNING,
      };
    } catch (error) {
      await preservedTmpOf(error);
      return {
        success: false,
      };
    } finally {
      if (isStorageV5Enabled()) invalidatePlainTextStoreCopy();
    }
  },
  async remove() {
    let { storagePath } = getStoragePath();
    try {
      await getFsImplementation().unlink(storagePath);
      return true;
    } catch (e) {
      if (getErrnoCode(e) === "ENOENT") return true;
      return false;
    } finally {
      if (isStorageV5Enabled()) invalidatePlainTextStoreCopy();
    }
  },
};
var disklessCredentialBackend = {
  read: async () => null,
  readStrict: async () => null,
  write: async () => ({
    success: false,
  }),
  remove: async () => true,
};
//@ chunk-5me9t3vk.js:3567-3743 placement
function storeReadToValue(result) {
  switch (result.state) {
    case "present":
      return result.data;
    case "absent":
    case "corrupt":
      return null;
    case "refused-symlink":
    case "read-failed":
      return READ_FAILED;
    default: {
      let unexpected = result;
      return READ_FAILED;
    }
  }
}
//@ chunk-5me9t3vk.js:3743-4477 placement
/**
 * 宿主托管凭据存储后端：读写走宿主提供的 readCredentials/writeCredentials/deleteCredentials，并维护本地副本与代数。
 */
function createHostStoreBackend(store) {
  return {
    async read() {
      let storagePathIfDiskful = getStoragePathIfDiskful();
      let storeCopyState = getStoreCopyState();
      let generation = storeCopyState.generation;
      let read = await trackStoreOp(store.readCredentials(), storeCopyState);
      recordStoreRead(storeCopyState, read, storagePathIfDiskful, generation);
      return read.state === "present" ? read.data : null;
    },
    async readStrict(strict) {
      let storagePathIfDiskful = getStoragePathIfDiskful();
      let storeCopyState = getStoreCopyState();
      let generation = storeCopyState.generation;
      let read = await trackStoreOp(
        strict ? store.readCredentials() : store.readCredentialsStrict(),
        storeCopyState,
      );
      recordStoreRead(storeCopyState, read, storagePathIfDiskful, generation);
      if (strict) return read.state === "present" ? read.data : read.state === "absent" ? null : READ_FAILED;
      return storeReadToValue(read);
    },
    async write(data) {
      let storagePathIfDiskful = getStoragePathIfDiskful();
      let storeCopyState = getStoreCopyState();
      let generation = storeCopyState.generation;
      let result = await trackStoreOp(store.writeCredentials(data), storeCopyState);
      if (result.state === "written" && generation === storeCopyState.generation)
        setStoreCopy(storeCopyState, storagePathIfDiskful, jsonStringify(data));
      else invalidateStoreCopy(storeCopyState);
      return result.state === "written"
        ? {
            success: true,
            warning: PLAINTEXT_STORAGE_WARNING,
          }
        : {
            success: false,
          };
    },
    async remove() {
      let storagePathIfDiskful = getStoragePathIfDiskful();
      let storeCopyState = getStoreCopyState();
      let generation = storeCopyState.generation;
      let result = await trackStoreOp(store.deleteCredentials(), storeCopyState);
      if (result.state === "deleted" && generation === storeCopyState.generation)
        setStoreCopy(storeCopyState, storagePathIfDiskful, null);
      else invalidateStoreCopy(storeCopyState);
      return result.state === "deleted";
    },
  };
}
//@ chunk-5me9t3vk.js:4477-4541 placement
async function trackStoreOp(promise, storeCopyState) {
  try {
    return await promise;
  } catch (error) {
    invalidateStoreCopy(storeCopyState);
    throw error;
  }
}
//@ chunk-5me9t3vk.js:4541-4574 placement
class StoreCopyState {
  copy = undefined;
  generation = 0;
}
//@ chunk-5me9t3vk.js:4574-4597 placement
var STORE_COPY_PER_HOST; // deferred: uses StoreCopyState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5me9t3vk.js:4574", () => {
  STORE_COPY_PER_HOST = new HostScoped(() => new StoreCopyState());
});
//@ chunk-5me9t3vk.js:4597-4632 placement
function getStoreCopyState() {
  return STORE_COPY_PER_HOST.of(getRootSession().host);
}
//@ chunk-5me9t3vk.js:4632-4695 placement
function setStoreCopy(storeCopyState, storagePath, text) {
  storeCopyState.copy = {
    storagePath,
    text,
  };
  storeCopyState.generation++;
}
//@ chunk-5me9t3vk.js:4695-4924 placement
function recordStoreRead(storeCopyState, read, storagePathIfDiskful, generation) {
  if (generation !== storeCopyState.generation) {
    invalidateStoreCopy(storeCopyState);
    return;
  }
  switch (read.state) {
    case "present":
      setStoreCopy(storeCopyState, storagePathIfDiskful, jsonStringify(read.data));
      return;
    case "absent":
    case "corrupt":
    case "refused-symlink":
      setStoreCopy(storeCopyState, storagePathIfDiskful, null);
      return;
    case "read-failed":
      invalidateStoreCopy(storeCopyState);
      return;
    default: {
      let unexpected = read;
      invalidateStoreCopy(storeCopyState);
    }
  }
}
//@ chunk-5me9t3vk.js:4924-4967 placement
function invalidateStoreCopy(state) {
  state.copy = undefined;
  state.generation++;
}
//@ chunk-5me9t3vk.js:4967-4989 placement
function invalidatePlainTextStoreCopy() {
  invalidateStoreCopy(getStoreCopyState());
}
//@ chunk-5me9t3vk.js:4989-5039 placement
function getCredentialBackend(store) {
  return isStorageV5Enabled() && store !== undefined
    ? createHostStoreBackend(store)
    : isDiskless()
      ? disklessCredentialBackend
      : fileCredentialBackend;
}
//@ chunk-5me9t3vk.js:5039-5570 placement
/**
 * 明文安全存储（name=plaintext）：同步 read 读 .credentials.json（宿主托管时可读本地副本）；readAsync/readAsyncStrict/update/delete 按情况选宿主后端、文件后端或 diskless 空后端；写入返回 "Warning: Storing credentials in plaintext."。
 */
var plainTextStore = {
  name: "plaintext",
  osGuarded: false,
  read(options) {
    let storagePathIfDiskful = getStoragePathIfDiskful();
    try {
      let copy =
        isStorageV5Enabled() && options?.fromStoreCopy === true ? getStoreCopyState().copy : undefined;
      if (copy !== undefined && copy.storagePath === storagePathIfDiskful) {
        if (copy.text === null) return null;
        return JSON.parse(copy.text);
      }
      if (storagePathIfDiskful === null) return null;
      let content = getFsImplementation().readFileSync(storagePathIfDiskful, {
        encoding: "utf8",
      });
      return jsonParse(content);
    } catch {
      return null;
    }
  },
  invalidateCache() {
    invalidatePlainTextStoreCopy();
  },
  readAsync(store) {
    return getCredentialBackend(store).read();
  },
  readAsyncStrict(store, options) {
    return getCredentialBackend(store).readStrict(options?.unreadableFileAs === "failure");
  },
  mutate(mutate, options) {
    return mutateSecureStorage(plainTextStore, mutate, options);
  },
  update(data, store) {
    return getCredentialBackend(store).write(data);
  },
  delete(store) {
    return getCredentialBackend(store).remove();
  },
};
export {
  plainTextStore,
  invalidatePlainTextStoreCopy,
  PLAINTEXT_STORAGE_WARNING,
  isPlainTextStorageAvailable,
};

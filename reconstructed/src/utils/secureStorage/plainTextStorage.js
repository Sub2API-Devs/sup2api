/**
 * utils/secureStorage/plainTextStorage.ts
 *
 * 明文凭据存储 ~/.claude/.credentials.json（0600），以及宿主托管凭据后端与 diskless 空后端的选择。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/secureStorage/plainTextStorage.ts
 * pieces: chunk-b29hdd5e.js (20)
 * attribution: placement 2, fingerprint 2, layout 16
 */
import { join } from "path";
import { chmod } from "fs/promises";
import { getProjectDirsUpToHome } from "./macOsKeychainHelpers.js";
import { isDiskless, getRootSession } from "../../bootstrap/state.js";
import { READ_FAILED, mutateSecureStorage } from "./storageWriteLock.js";
import { getFsImplementation } from "../fsOperations.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { getErrnoCode } from "../errors.js";
import { writeFileAtomic } from "../atomicPublishWrite.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { HostScoped } from "../hostScoped.js";

//@ chunk-b29hdd5e.js:2212-2218 placement
var plainTextStoragePromise;
//@ chunk-b29hdd5e.js:2218-2287 placement
/**
 * isPlainTextStorageAvailable：明文凭据存储是否可用。
 */
function isPlainTextStorageAvailable() {
  if (plainTextStoragePromise !== undefined) return plainTextStoragePromise;
  plainTextStoragePromise = Promise.resolve(false);
  return plainTextStoragePromise;
}
//@ chunk-b29hdd5e.js:2351-2455 fingerprint = getStoragePath (1)
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
//@ chunk-b29hdd5e.js:2455-2500 layout
function getStoragePathIfDiskful() {
  return isDiskless() ? null : getStoragePath().storagePath;
}
//@ chunk-b29hdd5e.js:2500-2553 layout
var PLAINTEXT_STORAGE_WARNING = "Warning: Storing credentials in plaintext.";
//@ chunk-b29hdd5e.js:2553-2692 layout
function classifyReadErrorLenient(e, r) {
  if (e === "ENOENT" || e === "EISDIR" || e === "ENOTDIR") return null;
  if ((e === "EACCES" || e === "EPERM") && r !== "win32") return null;
  return READ_FAILED;
}
//@ chunk-b29hdd5e.js:2692-2736 layout
function classifyReadErrorStrict(e, r) {
  return e === "ENOENT" ? null : READ_FAILED;
}
//@ chunk-b29hdd5e.js:2736-3475 layout
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
  async readStrict(e) {
    let { storagePath } = getStoragePath();
    let data;
    try {
      data = await getFsImplementation().readFile(storagePath, {
        encoding: "utf8",
      });
    } catch (error) {
      return (e ? classifyReadErrorStrict : classifyReadErrorLenient)(getErrnoCode(error), "linux");
    }
    try {
      return jsonParse(data);
    } catch {
      if (e) return READ_FAILED;
      return null;
    }
  },
  async write(data) {
    try {
      let { storageDir, storagePath } = getStoragePath();
      await getFsImplementation().mkdir(storageDir);
      await writeFileAtomic(storagePath, jsonStringify(data), 384);
      await chmod(storagePath, 384);
      return {
        success: true,
        warning: PLAINTEXT_STORAGE_WARNING,
      };
    } catch {
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
//@ chunk-b29hdd5e.js:3475-3651 layout
function storeReadToValue(e) {
  switch (e.state) {
    case "present":
      return e.data;
    case "absent":
    case "corrupt":
      return null;
    case "refused-symlink":
    case "read-failed":
      return READ_FAILED;
    default: {
      let r = e;
      return READ_FAILED;
    }
  }
}
//@ chunk-b29hdd5e.js:3651-4385 layout
/**
 * 宿主托管凭据存储后端：读写走宿主提供的 readCredentials/writeCredentials/deleteCredentials，并维护本地副本与代数。
 */
function createHostStoreBackend(e) {
  return {
    async read() {
      let storagePathIfDiskful = getStoragePathIfDiskful();
      let storeCopyState = getStoreCopyState();
      let generation = storeCopyState.generation;
      let o = await trackStoreOp(e.readCredentials(), storeCopyState);
      recordStoreRead(storeCopyState, o, storagePathIfDiskful, generation);
      return o.state === "present" ? o.data : null;
    },
    async readStrict(r) {
      let storagePathIfDiskful = getStoragePathIfDiskful();
      let storeCopyState = getStoreCopyState();
      let generation = storeCopyState.generation;
      let s = await trackStoreOp(r ? e.readCredentials() : e.readCredentialsStrict(), storeCopyState);
      recordStoreRead(storeCopyState, s, storagePathIfDiskful, generation);
      if (r) return s.state === "present" ? s.data : s.state === "absent" ? null : READ_FAILED;
      return storeReadToValue(s);
    },
    async write(r) {
      let storagePathIfDiskful = getStoragePathIfDiskful();
      let storeCopyState = getStoreCopyState();
      let generation = storeCopyState.generation;
      let s = await trackStoreOp(e.writeCredentials(r), storeCopyState);
      if (s.state === "written" && generation === storeCopyState.generation)
        setStoreCopy(storeCopyState, storagePathIfDiskful, jsonStringify(r));
      else invalidateStoreCopy(storeCopyState);
      return s.state === "written"
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
      let o = await trackStoreOp(e.deleteCredentials(), storeCopyState);
      if (o.state === "deleted" && generation === storeCopyState.generation)
        setStoreCopy(storeCopyState, storagePathIfDiskful, null);
      else invalidateStoreCopy(storeCopyState);
      return o.state === "deleted";
    },
  };
}
//@ chunk-b29hdd5e.js:4385-4449 layout
async function trackStoreOp(e, storeCopyState) {
  try {
    return await e;
  } catch (error) {
    invalidateStoreCopy(storeCopyState);
    throw error;
  }
}
//@ chunk-b29hdd5e.js:4449-4482 layout
class StoreCopyState {
  copy = undefined;
  generation = 0;
}
//@ chunk-b29hdd5e.js:4482-4505 layout
var STORE_COPY_PER_HOST = new HostScoped(() => new StoreCopyState());
//@ chunk-b29hdd5e.js:4505-4540 layout
function getStoreCopyState() {
  return STORE_COPY_PER_HOST.of(getRootSession().host);
}
//@ chunk-b29hdd5e.js:4540-4603 layout
function setStoreCopy(storeCopyState, storagePath, text) {
  storeCopyState.copy = {
    storagePath,
    text,
  };
  storeCopyState.generation++;
}
//@ chunk-b29hdd5e.js:4603-4832 layout
function recordStoreRead(storeCopyState, r, storagePathIfDiskful, generation) {
  if (generation !== storeCopyState.generation) {
    invalidateStoreCopy(storeCopyState);
    return;
  }
  switch (r.state) {
    case "present":
      setStoreCopy(storeCopyState, storagePathIfDiskful, jsonStringify(r.data));
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
      let o = r;
      invalidateStoreCopy(storeCopyState);
    }
  }
}
//@ chunk-b29hdd5e.js:4832-4875 layout
function invalidateStoreCopy(e) {
  e.copy = undefined;
  e.generation++;
}
//@ chunk-b29hdd5e.js:4875-4897 layout
function invalidatePlainTextStoreCopy() {
  invalidateStoreCopy(getStoreCopyState());
}
//@ chunk-b29hdd5e.js:4897-4947 layout
function getCredentialBackend(e) {
  return isStorageV5Enabled() && e !== undefined
    ? createHostStoreBackend(e)
    : isDiskless()
      ? disklessCredentialBackend
      : fileCredentialBackend;
}
//@ chunk-b29hdd5e.js:4947-5478 fingerprint = plainTextStorage (0.372)
/**
 * 明文安全存储（name=plaintext）：同步 read 读 .credentials.json（宿主托管时可读本地副本）；readAsync/readAsyncStrict/update/delete 按情况选宿主后端、文件后端或 diskless 空后端；写入返回 "Warning: Storing credentials in plaintext."。
 */
var plainTextStorage = {
  name: "plaintext",
  osGuarded: false,
  read(e) {
    let storagePathIfDiskful = getStoragePathIfDiskful();
    try {
      let copy = isStorageV5Enabled() && e?.fromStoreCopy === true ? getStoreCopyState().copy : undefined;
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
  readAsync(e) {
    return getCredentialBackend(e).read();
  },
  readAsyncStrict(e, r) {
    return getCredentialBackend(e).readStrict(r?.unreadableFileAs === "failure");
  },
  mutate(e, r) {
    return mutateSecureStorage(plainTextStorage, e, r);
  },
  update(e, r) {
    return getCredentialBackend(r).write(e);
  },
  delete(e) {
    return getCredentialBackend(e).remove();
  },
};
export {
  invalidatePlainTextStoreCopy,
  isPlainTextStorageAvailable,
  plainTextStorage,
  PLAINTEXT_STORAGE_WARNING,
};

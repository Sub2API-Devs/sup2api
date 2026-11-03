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
import { join, join as join_2, join as join_3 } from "path";
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
var c;
//@ chunk-b29hdd5e.js:2218-2287 placement
function eus() {
  if (c !== void 0) return c;
  return ((c = Promise.resolve(!1)), c);
}
/**
 * 明文凭据位置：<配置目录>/.credentials.json。
 */
//@ chunk-b29hdd5e.js:2351-2455 fingerprint = getStoragePath (1)
function getStoragePath() {
  let storageDir = getProjectDirsUpToHome(),
    storageFileName = ".credentials.json";
  return { storageDir: storageDir, storagePath: join_3(storageDir, ".credentials.json") };
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
/**
 * 明文凭据文件后端（read/readStrict/write(权限 0600)/remove）与 diskless 会话的空后端。
 */
//@ chunk-b29hdd5e.js:2736-3475 layout
var fileCredentialBackend = {
    async read() {
      let { storagePath: storagePath } = getStoragePath();
      try {
        let content = await getFsImplementation().readFile(storagePath, { encoding: "utf8" });
        return jsonParse(content);
      } catch {
        return null;
      }
    },
    async readStrict(e) {
      let { storagePath: storagePath } = getStoragePath(),
        a;
      try {
        a = await getFsImplementation().readFile(storagePath, { encoding: "utf8" });
      } catch (error) {
        return (e ? classifyReadErrorStrict : classifyReadErrorLenient)(getErrnoCode(error), "linux");
      }
      try {
        return jsonParse(a);
      } catch {
        if (e) return READ_FAILED;
        return null;
      }
    },
    async write(e) {
      try {
        let { storageDir: storageDir, storagePath: storagePath } = getStoragePath();
        return (
          await getFsImplementation().mkdir(storageDir),
          await writeFileAtomic(storagePath, jsonStringify(e), 384),
          await chmod(storagePath, 384),
          { success: !0, warning: PLAINTEXT_STORAGE_WARNING }
        );
      } catch {
        return { success: !1 };
      } finally {
        if (isStorageV5Enabled()) invalidatePlainTextStoreCopy();
      }
    },
    async remove() {
      let { storagePath: storagePath } = getStoragePath();
      try {
        return (await getFsImplementation().unlink(storagePath), !0);
      } catch (error) {
        if (getErrnoCode(error) === "ENOENT") return !0;
        return !1;
      } finally {
        if (isStorageV5Enabled()) invalidatePlainTextStoreCopy();
      }
    },
  },
  disklessCredentialBackend = {
    read: async () => null,
    readStrict: async () => null,
    write: async () => ({ success: !1 }),
    remove: async () => !0,
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
/**
 * 宿主托管凭据存储后端：读写走宿主提供的 readCredentials/writeCredentials/deleteCredentials，并维护本地副本与代数。
 */
//@ chunk-b29hdd5e.js:3651-4385 layout
function createHostStoreBackend(e) {
  return {
    async read() {
      let r = getStoragePathIfDiskful(),
        a = getStoreCopyState(),
        generation = a.generation,
        o = await trackStoreOp(e.readCredentials(), a);
      return (recordStoreRead(a, o, r, generation), o.state === "present" ? o.data : null);
    },
    async readStrict(r) {
      let a = getStoragePathIfDiskful(),
        n = getStoreCopyState(),
        generation = n.generation,
        s = await trackStoreOp(r ? e.readCredentials() : e.readCredentialsStrict(), n);
      if ((recordStoreRead(n, s, a, generation), r))
        return s.state === "present" ? s.data : s.state === "absent" ? null : READ_FAILED;
      return storeReadToValue(s);
    },
    async write(r) {
      let a = getStoragePathIfDiskful(),
        n = getStoreCopyState(),
        generation = n.generation,
        s = await trackStoreOp(e.writeCredentials(r), n);
      if (s.state === "written" && generation === n.generation) setStoreCopy(n, a, jsonStringify(r));
      else invalidateStoreCopy(n);
      return s.state === "written" ? { success: !0, warning: PLAINTEXT_STORAGE_WARNING } : { success: !1 };
    },
    async remove() {
      let r = getStoragePathIfDiskful(),
        a = getStoreCopyState(),
        generation = a.generation,
        o = await trackStoreOp(e.deleteCredentials(), a);
      if (o.state === "deleted" && generation === a.generation) setStoreCopy(a, r, null);
      else invalidateStoreCopy(a);
      return o.state === "deleted";
    },
  };
}
//@ chunk-b29hdd5e.js:4385-4449 layout
async function trackStoreOp(e, r) {
  try {
    return await e;
  } catch (error) {
    throw (invalidateStoreCopy(r), error);
  }
}
//@ chunk-b29hdd5e.js:4449-4482 layout
class StoreCopyState {
  copy = void 0;
  generation = 0;
}
//@ chunk-b29hdd5e.js:4482-4505 layout
var STORE_COPY_PER_HOST = new HostScoped(() => new StoreCopyState());
//@ chunk-b29hdd5e.js:4505-4540 layout
function getStoreCopyState() {
  return STORE_COPY_PER_HOST.of(getRootSession().host);
}
//@ chunk-b29hdd5e.js:4540-4603 layout
function setStoreCopy(e, r, a) {
  ((e.copy = { storagePath: r, text: a }), e.generation++);
}
//@ chunk-b29hdd5e.js:4603-4832 layout
function recordStoreRead(e, r, a, n) {
  if (n !== e.generation) {
    invalidateStoreCopy(e);
    return;
  }
  switch (r.state) {
    case "present":
      setStoreCopy(e, a, jsonStringify(r.data));
      return;
    case "absent":
    case "corrupt":
    case "refused-symlink":
      setStoreCopy(e, a, null);
      return;
    case "read-failed":
      invalidateStoreCopy(e);
      return;
    default: {
      let o = r;
      invalidateStoreCopy(e);
    }
  }
}
//@ chunk-b29hdd5e.js:4832-4875 layout
function invalidateStoreCopy(e) {
  ((e.copy = void 0), e.generation++);
}
//@ chunk-b29hdd5e.js:4875-4897 layout
function invalidatePlainTextStoreCopy() {
  invalidateStoreCopy(getStoreCopyState());
}
//@ chunk-b29hdd5e.js:4897-4947 layout
function getCredentialBackend(e) {
  return isStorageV5Enabled() && e !== void 0
    ? createHostStoreBackend(e)
    : isDiskless()
      ? disklessCredentialBackend
      : fileCredentialBackend;
}
/**
 * 明文安全存储（name=plaintext）：同步 read 读 .credentials.json（宿主托管时可读本地副本）；readAsync/readAsyncStrict/update/delete 按情况选宿主后端、文件后端或 diskless 空后端；写入返回 "Warning: Storing credentials in plaintext."。
 */
//@ chunk-b29hdd5e.js:4947-5478 fingerprint = plainTextStorage (0.372)
var plainTextStorage = {
  name: "plaintext",
  osGuarded: !1,
  read(e) {
    let r = getStoragePathIfDiskful();
    try {
      let a = isStorageV5Enabled() && e?.fromStoreCopy === !0 ? getStoreCopyState().copy : void 0;
      if (a !== void 0 && a.storagePath === r) {
        if (a.text === null) return null;
        return JSON.parse(a.text);
      }
      if (r === null) return null;
      let content = getFsImplementation().readFileSync(r, { encoding: "utf8" });
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

export { invalidatePlainTextStoreCopy, eus, plainTextStorage, PLAINTEXT_STORAGE_WARNING };

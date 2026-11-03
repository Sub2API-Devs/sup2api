/**
 * utils/secureStorage/credentialsFileStore.ts
 *
 * 2.1.316 新增。按配置目录取凭据文件存储（.credentials.json 等），拒绝符号链接。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6tm3rt42.js (16)
 * attribution: placement 16
 */
import { join, isAbsolute, basename, dirname } from "path";
import { constants } from "fs";
import { open, mkdir, lstat } from "fs/promises";
import { FOe } from "./macOsKeychainHelpers.js";
import { getErrnoCode } from "../errors.js";
import { getFsImplementation } from "../fsOperations.js";
import { publishWriteAtomic } from "../atomicPublishWrite.js";
import { jsonStringify } from "../slowOperations.js";
import { isDiskless } from "../../bootstrap/state.js";
import { _Mn } from "../authFileDescriptor.js";
import { isStorageV5Enabled } from "../hoverRest.js";

//@ chunk-6tm3rt42.js:604-698 placement
function f() {
  let e = FOe();
  return e === null ? null : { storeDir: e, storePath: join(e, ".credentials.json") };
}
//@ chunk-6tm3rt42.js:698-727 placement
var O_NONBLOCK = constants.O_NONBLOCK,
  c = 1048576;
/**
 * 只读、不跟随符号链接打开
 */
//@ chunk-6tm3rt42.js:727-914 placement
async function openForReadNoFollow(e) {
  try {
    return {
      kind: "open",
      fileHandle: await open(e, constants.O_RDONLY | constants.O_NOFOLLOW | O_NONBLOCK),
    };
  } catch (error) {
    let n = getErrnoCode(error);
    if (n === "ELOOP") return { kind: "refused-symlink" };
    return { kind: "error", code: n };
  }
}
/**
 * 写方式、不跟随符号链接打开
 */
//@ chunk-6tm3rt42.js:914-1131 placement
async function openForWriteNoFollow(e, t) {
  let n = constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC;
  try {
    return { kind: "open", fileHandle: await open(e, n | constants.O_NOFOLLOW, t) };
  } catch (error) {
    let a = getErrnoCode(error);
    if (a === "ELOOP") return { kind: "refused-symlink" };
    return { kind: "error", code: a };
  }
}
//@ chunk-6tm3rt42.js:1131-1190 placement
function g(e) {
  return e.length > 0 && !e.includes("\x00") && isAbsolute(e);
}
//@ chunk-6tm3rt42.js:1190-1258 placement
var B = new Set([".oauth_token", ".api_key", ".session_ingress_token"]);
//@ chunk-6tm3rt42.js:1258-1338 placement
function m(e) {
  return e === "ENOENT" ? { state: "absent" } : { state: "read-failed", code: e };
}
//@ chunk-6tm3rt42.js:1338-1395 placement
function w(e) {
  return e === "ENOENT" ? "absent" : "read-failed";
}
/**
 * 读取错误分类
 */
//@ chunk-6tm3rt42.js:1395-1550 placement
function classifyReadErrno(e, t) {
  if (e === "ENOENT" || e === "EISDIR" || e === "ENOTDIR") return "absent";
  if ((e === "EACCES" || e === "EPERM") && t !== "win32") return "absent";
  return "read-failed";
}
/**
 * 读取凭据文件
 */
//@ chunk-6tm3rt42.js:1550-2570 placement
async function readCredentialsFile(e) {
  let t = f();
  if (t === null) return { state: "absent" };
  let n = await openForReadNoFollow(t.storePath);
  switch (n.kind) {
    case "refused-symlink":
      return { state: "refused-symlink" };
    case "error":
      return e(n.code) === "absent" ? { state: "absent" } : { state: "read-failed", code: n.code };
    case "open": {
      let { fileHandle: fileHandle } = n,
        a,
        l,
        O;
      try {
        let stats = await fileHandle.stat();
        if (!stats.isFile()) {
          if (stats.isDirectory())
            return e("EISDIR") === "absent" ? { state: "absent" } : { state: "read-failed", code: "EISDIR" };
          return { state: "corrupt" };
        }
        if (stats.size > c) return { state: "corrupt" };
        ((l = stats.uid), (O = stats.mode));
        let alloc = Buffer.alloc(Math.min(stats.size, c) + 1),
          d = 0;
        for (;;) {
          let { bytesRead: bytesRead } = await fileHandle.read(alloc, d, alloc.length - d, d);
          if (bytesRead === 0) break;
          if (((d += bytesRead), d === alloc.length)) {
            if (alloc.length > c) return { state: "corrupt" };
            let alloc_2 = Buffer.alloc(c + 1);
            (alloc.copy(alloc_2, 0, 0, d), (alloc = alloc_2));
          }
        }
        a = alloc.toString("utf8", 0, d);
      } catch (error) {
        let i = getErrnoCode(error);
        return e(i) === "absent" ? { state: "absent" } : { state: "read-failed", code: i };
      } finally {
        await fileHandle.close().catch(() => {});
      }
      let u;
      try {
        u = JSON.parse(a);
      } catch {
        return { state: "corrupt" };
      }
      if (u === null) return { state: "absent" };
      return { state: "present", data: u, uid: l, mode: O };
    }
  }
}
/**
 * 凭据文件存储实现
 */
//@ chunk-6tm3rt42.js:2570-4838 placement
var CREDENTIALS_FILE_STORE = {
  readCredentials() {
    return readCredentialsFile(w);
  },
  readCredentialsStrict() {
    return readCredentialsFile((e) => classifyReadErrno(e, "linux"));
  },
  async writeCredentials(e) {
    let t = f();
    if (t === null) return { state: "write-failed", code: "ENOTSUP" };
    let { storeDir: storeDir, storePath: storePath } = t;
    try {
      (await getFsImplementation().mkdir(storeDir),
        await publishWriteAtomic(storePath, jsonStringify(e), { mode: 384, exactMode: 384 }));
    } catch (error) {
      return { state: "write-failed", code: getErrnoCode(error) };
    }
    return { state: "written" };
  },
  async deleteCredentials() {
    let e = f();
    return e === null ? { state: "delete-failed", code: "ENOTSUP" } : deleteCredentialsFile(e.storePath);
  },
  async discardSpentCredentialFile(e) {
    if (isDiskless()) return { state: "delete-failed", code: "ENOTSUP" };
    return deleteCredentialsFile(e);
  },
  async readHandoffCredential(e, { symlinkAtPath: t }) {
    if (isDiskless()) return { state: "read-failed", code: "ENOTSUP" };
    if (!g(e)) return { state: "read-failed", code: "EINVAL" };
    let n;
    if (t === "follow")
      try {
        n = await open(e, constants.O_RDONLY | O_NONBLOCK);
      } catch (error) {
        return m(getErrnoCode(error));
      }
    else {
      let r = await openForReadNoFollow(e);
      switch (r.kind) {
        case "refused-symlink":
          return { state: "read-failed", code: "ELOOP" };
        case "error":
          return m(r.code);
        case "open":
          n = r.fileHandle;
      }
    }
    try {
      if (!(await n.stat()).isFile()) return { state: "read-failed", code: "EINVAL" };
      let alloc = Buffer.alloc(_Mn + 1),
        a = 0;
      for (;;) {
        let { bytesRead: bytesRead } = await n.read(alloc, a, alloc.length - a, a);
        if (bytesRead === 0) break;
        if (((a += bytesRead), a > _Mn)) return { state: "read-failed", code: "EFBIG" };
      }
      return { state: "present", contents: alloc.toString("utf8", 0, a) };
    } catch (error) {
      return m(getErrnoCode(error));
    } finally {
      await n.close().catch(() => {});
    }
  },
  async writeHandoffCredential(e, t) {
    if (isDiskless()) return { state: "write-failed", code: "ENOTSUP" };
    if (!g(e)) return { state: "write-failed", code: "EINVAL" };
    if (!B.has(basename(e))) return { state: "write-failed", code: "EINVAL" };
    try {
      await mkdir(dirname(e), { recursive: !0, mode: 448 });
    } catch (error) {
      return { state: "write-failed", code: getErrnoCode(error) };
    }
    let n = await openForWriteNoFollow(e, 384);
    switch (n.kind) {
      case "refused-symlink":
        return { state: "write-failed", code: "ELOOP" };
      case "error":
        return { state: "write-failed", code: n.code };
      case "open":
        try {
          return (await n.fileHandle.writeFile(t, { encoding: "utf8" }), { state: "written" });
        } catch (error) {
          return { state: "write-failed", code: getErrnoCode(error) };
        } finally {
          await n.fileHandle.close().catch(() => {});
        }
    }
  },
  async probeCredentials() {
    let e = f();
    if (e === null) return { state: "absent" };
    let t;
    try {
      t = await lstat(e.storePath, { bigint: !0 });
    } catch (error) {
      let r = getErrnoCode(error);
      return w(r) === "absent" ? { state: "absent" } : { state: "read-failed", code: r };
    }
    if (t.isSymbolicLink()) return { state: "read-failed", code: "ELOOP" };
    return { state: "present", version: `${t.dev}:${t.ino}:${t.size}:${t.mtimeNs}` };
  },
};
/**
 * 删除凭据文件
 */
//@ chunk-6tm3rt42.js:4838-5006 placement
async function deleteCredentialsFile(e) {
  try {
    return (await getFsImplementation().unlink(e), { state: "deleted" });
  } catch (error) {
    let n = getErrnoCode(error);
    if (n === "ENOENT") return { state: "deleted" };
    return { state: "delete-failed", code: n };
  }
}
//@ chunk-6tm3rt42.js:5006-5059 placement
var A = Symbol("secureStorage.CredentialsStoreHandle");
/**
 * 按配置目录取凭据文件存储（.credentials.json 等），拒绝符号链接。
 */
//@ chunk-6tm3rt42.js:5059-5113 placement
function credentialsStoreFor(e, t = CREDENTIALS_FILE_STORE) {
  return isStorageV5Enabled() && e !== void 0 ? I(t) : void 0;
}
//@ chunk-6tm3rt42.js:5113-5167 placement
function sessionServicesFor(e) {
  return { storageV5: e, credentials: credentialsStoreFor(e) };
}
//@ chunk-6tm3rt42.js:5167-5225 placement
function I(e = CREDENTIALS_FILE_STORE) {
  return { ...e, [A]: "CredentialsStoreHandle" };
}

export { credentialsStoreFor, sessionServicesFor };

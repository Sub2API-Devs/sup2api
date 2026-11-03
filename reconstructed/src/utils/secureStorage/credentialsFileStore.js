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
import { keychainProjectDirs } from "./macOsKeychainHelpers.js";
import { getErrnoCode } from "../errors.js";
import { getFsImplementation } from "../fsOperations.js";
import { publishWriteAtomic } from "../atomicPublishWrite.js";
import { jsonStringify } from "../slowOperations.js";
import { isDiskless } from "../../bootstrap/state.js";
import { MAX_CREDENTIAL_READ_BYTES } from "../authFileDescriptor.js";
import { isStorageV5Enabled } from "../hoverRest.js";

//@ chunk-6tm3rt42.js:604-698 placement
function credentialsStorePaths() {
  let e = keychainProjectDirs();
  return e === null
    ? null
    : {
        storeDir: e,
        storePath: join(e, ".credentials.json"),
      };
}
//@ chunk-6tm3rt42.js:698-727 placement
var O_NONBLOCK = constants.O_NONBLOCK;
var MAX_CREDENTIALS_FILE_BYTES = 1048576;
//@ chunk-6tm3rt42.js:727-914 placement
/**
 * 只读、不跟随符号链接打开
 */
async function openForReadNoFollow(e) {
  try {
    return {
      kind: "open",
      fileHandle: await open(e, constants.O_RDONLY | constants.O_NOFOLLOW | O_NONBLOCK),
    };
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP")
      return {
        kind: "refused-symlink",
      };
    return {
      kind: "error",
      code: errnoCode,
    };
  }
}
//@ chunk-6tm3rt42.js:914-1131 placement
/**
 * 写方式、不跟随符号链接打开
 */
async function openForWriteNoFollow(e, t) {
  let n = constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC;
  try {
    return {
      kind: "open",
      fileHandle: await open(e, n | constants.O_NOFOLLOW, t),
    };
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP")
      return {
        kind: "refused-symlink",
      };
    return {
      kind: "error",
      code: errnoCode,
    };
  }
}
//@ chunk-6tm3rt42.js:1131-1190 placement
function isUsableStoreDir(e) {
  return e.length > 0 && !e.includes("\x00") && isAbsolute(e);
}
//@ chunk-6tm3rt42.js:1190-1258 placement
var CREDENTIAL_FIELD_NAMES = new Set([".oauth_token", ".api_key", ".session_ingress_token"]);
//@ chunk-6tm3rt42.js:1258-1338 placement
function classifyReadError(e) {
  return e === "ENOENT"
    ? {
        state: "absent",
      }
    : {
        state: "read-failed",
        code: e,
      };
}
//@ chunk-6tm3rt42.js:1338-1395 placement
function readErrorState(errnoCode) {
  return errnoCode === "ENOENT" ? "absent" : "read-failed";
}
//@ chunk-6tm3rt42.js:1395-1550 placement
/**
 * 读取错误分类
 */
function classifyReadErrno(e, t) {
  if (e === "ENOENT" || e === "EISDIR" || e === "ENOTDIR") return "absent";
  if ((e === "EACCES" || e === "EPERM") && t !== "win32") return "absent";
  return "read-failed";
}
//@ chunk-6tm3rt42.js:1550-2570 placement
/**
 * 读取凭据文件
 */
async function readCredentialsFile(readErrorState) {
  let t = credentialsStorePaths();
  if (t === null)
    return {
      state: "absent",
    };
  let n = await openForReadNoFollow(t.storePath);
  switch (n.kind) {
    case "refused-symlink":
      return {
        state: "refused-symlink",
      };
    case "error":
      return readErrorState(n.code) === "absent"
        ? {
            state: "absent",
          }
        : {
            state: "read-failed",
            code: n.code,
          };
    case "open": {
      let { fileHandle } = n;
      let a;
      let uid;
      let mode;
      try {
        let stats = await fileHandle.stat();
        if (!stats.isFile()) {
          if (stats.isDirectory())
            return readErrorState("EISDIR") === "absent"
              ? {
                  state: "absent",
                }
              : {
                  state: "read-failed",
                  code: "EISDIR",
                };
          return {
            state: "corrupt",
          };
        }
        if (stats.size > MAX_CREDENTIALS_FILE_BYTES)
          return {
            state: "corrupt",
          };
        uid = stats.uid;
        mode = stats.mode;
        let i = Buffer.alloc(Math.min(stats.size, MAX_CREDENTIALS_FILE_BYTES) + 1);
        let d = 0;
        for (;;) {
          let { bytesRead } = await fileHandle.read(i, d, i.length - d, d);
          if (bytesRead === 0) break;
          d += bytesRead;
          if (d === i.length) {
            if (i.length > MAX_CREDENTIALS_FILE_BYTES)
              return {
                state: "corrupt",
              };
            let C = Buffer.alloc(MAX_CREDENTIALS_FILE_BYTES + 1);
            i.copy(C, 0, 0, d);
            i = C;
          }
        }
        a = i.toString("utf8", 0, d);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        return readErrorState(errnoCode) === "absent"
          ? {
              state: "absent",
            }
          : {
              state: "read-failed",
              code: errnoCode,
            };
      } finally {
        await fileHandle.close().catch(() => {});
      }
      let u;
      try {
        u = JSON.parse(a);
      } catch {
        return {
          state: "corrupt",
        };
      }
      if (u === null)
        return {
          state: "absent",
        };
      return {
        state: "present",
        data: u,
        uid,
        mode,
      };
    }
  }
}
//@ chunk-6tm3rt42.js:2570-4838 placement
/**
 * 凭据文件存储实现
 */
var CREDENTIALS_FILE_STORE = {
  readCredentials() {
    return readCredentialsFile(readErrorState);
  },
  readCredentialsStrict() {
    return readCredentialsFile((e) => classifyReadErrno(e, "linux"));
  },
  async writeCredentials(e) {
    let t = credentialsStorePaths();
    if (t === null)
      return {
        state: "write-failed",
        code: "ENOTSUP",
      };
    let { storeDir, storePath } = t;
    try {
      await getFsImplementation().mkdir(storeDir);
      await publishWriteAtomic(storePath, jsonStringify(e), {
        mode: 384,
        exactMode: 384,
      });
    } catch (error) {
      return {
        state: "write-failed",
        code: getErrnoCode(error),
      };
    }
    return {
      state: "written",
    };
  },
  async deleteCredentials() {
    let e = credentialsStorePaths();
    return e === null
      ? {
          state: "delete-failed",
          code: "ENOTSUP",
        }
      : deleteCredentialsFile(e.storePath);
  },
  async discardSpentCredentialFile(e) {
    if (isDiskless())
      return {
        state: "delete-failed",
        code: "ENOTSUP",
      };
    return deleteCredentialsFile(e);
  },
  async readHandoffCredential(e, { symlinkAtPath }) {
    if (isDiskless())
      return {
        state: "read-failed",
        code: "ENOTSUP",
      };
    if (!isUsableStoreDir(e))
      return {
        state: "read-failed",
        code: "EINVAL",
      };
    let n;
    if (symlinkAtPath === "follow")
      try {
        n = await open(e, constants.O_RDONLY | O_NONBLOCK);
      } catch (error) {
        return classifyReadError(getErrnoCode(error));
      }
    else {
      let r = await openForReadNoFollow(e);
      switch (r.kind) {
        case "refused-symlink":
          return {
            state: "read-failed",
            code: "ELOOP",
          };
        case "error":
          return classifyReadError(r.code);
        case "open":
          n = r.fileHandle;
      }
    }
    try {
      if (!(await n.stat()).isFile())
        return {
          state: "read-failed",
          code: "EINVAL",
        };
      let r = Buffer.alloc(MAX_CREDENTIAL_READ_BYTES + 1);
      let a = 0;
      for (;;) {
        let { bytesRead } = await n.read(r, a, r.length - a, a);
        if (bytesRead === 0) break;
        a += bytesRead;
        if (a > MAX_CREDENTIAL_READ_BYTES)
          return {
            state: "read-failed",
            code: "EFBIG",
          };
      }
      return {
        state: "present",
        contents: r.toString("utf8", 0, a),
      };
    } catch (error) {
      return classifyReadError(getErrnoCode(error));
    } finally {
      await n.close().catch(() => {});
    }
  },
  async writeHandoffCredential(e, t) {
    if (isDiskless())
      return {
        state: "write-failed",
        code: "ENOTSUP",
      };
    if (!isUsableStoreDir(e))
      return {
        state: "write-failed",
        code: "EINVAL",
      };
    if (!CREDENTIAL_FIELD_NAMES.has(basename(e)))
      return {
        state: "write-failed",
        code: "EINVAL",
      };
    try {
      await mkdir(dirname(e), {
        recursive: true,
        mode: 448,
      });
    } catch (error) {
      return {
        state: "write-failed",
        code: getErrnoCode(error),
      };
    }
    let n = await openForWriteNoFollow(e, 384);
    switch (n.kind) {
      case "refused-symlink":
        return {
          state: "write-failed",
          code: "ELOOP",
        };
      case "error":
        return {
          state: "write-failed",
          code: n.code,
        };
      case "open":
        try {
          await n.fileHandle.writeFile(t, {
            encoding: "utf8",
          });
          return {
            state: "written",
          };
        } catch (error) {
          return {
            state: "write-failed",
            code: getErrnoCode(error),
          };
        } finally {
          await n.fileHandle.close().catch(() => {});
        }
    }
  },
  async probeCredentials() {
    let e = credentialsStorePaths();
    if (e === null)
      return {
        state: "absent",
      };
    let t;
    try {
      t = await lstat(e.storePath, {
        bigint: true,
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return readErrorState(errnoCode) === "absent"
        ? {
            state: "absent",
          }
        : {
            state: "read-failed",
            code: errnoCode,
          };
    }
    if (t.isSymbolicLink())
      return {
        state: "read-failed",
        code: "ELOOP",
      };
    return {
      state: "present",
      version: `${t.dev}:${t.ino}:${t.size}:${t.mtimeNs}`,
    };
  },
};
//@ chunk-6tm3rt42.js:4838-5006 placement
/**
 * 删除凭据文件
 */
async function deleteCredentialsFile(e) {
  try {
    await getFsImplementation().unlink(e);
    return {
      state: "deleted",
    };
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT")
      return {
        state: "deleted",
      };
    return {
      state: "delete-failed",
      code: errnoCode,
    };
  }
}
//@ chunk-6tm3rt42.js:5006-5059 placement
var CredentialsStoreHandleSymbol = Symbol("secureStorage.CredentialsStoreHandle");
//@ chunk-6tm3rt42.js:5059-5113 placement
/**
 * 按配置目录取凭据文件存储（.credentials.json 等），拒绝符号链接。
 */
function credentialsStoreFor(e, t = CREDENTIALS_FILE_STORE) {
  return isStorageV5Enabled() && e !== undefined ? withStoreHandle(t) : undefined;
}
//@ chunk-6tm3rt42.js:5113-5167 placement
function sessionServicesFor(storageV5) {
  return {
    storageV5,
    credentials: credentialsStoreFor(storageV5),
  };
}
//@ chunk-6tm3rt42.js:5167-5225 placement
function withStoreHandle(e = CREDENTIALS_FILE_STORE) {
  return {
    ...e,
    [CredentialsStoreHandleSymbol]: "CredentialsStoreHandle",
  };
}
export { credentialsStoreFor, sessionServicesFor };

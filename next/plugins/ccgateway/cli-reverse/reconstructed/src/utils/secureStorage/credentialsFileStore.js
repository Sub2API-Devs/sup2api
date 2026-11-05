/**
 * utils/secureStorage/credentialsFileStore.ts
 *
 * 2.1.316 新增。按配置目录取凭据文件存储（.credentials.json 等），拒绝符号链接。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1853x41x.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, isAbsolute, basename, dirname } from "path";
import { constants } from "fs";
import { open, mkdir, lstat } from "fs/promises";
import { keychainProjectDirs } from "./macOsKeychainHelpers.js";
import { getErrnoCode } from "../errors.js";
import { getFsImplementation } from "../fsOperations.js";
import { filePath } from "../atomicPublishWrite.js";
import { jsonStringify } from "../slowOperations.js";
import { preservedTmpOf } from "./preservedTmpNotice.js";
import { isDiskless } from "../../bootstrap/state.js";
import { MAX_CREDENTIAL_READ_BYTES } from "../authFileDescriptor.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1853x41x.js:640-734 placement
function credentialsStorePaths() {
  let dir = keychainProjectDirs();
  return dir === null
    ? null
    : {
        storeDir: dir,
        storePath: join(dir, ".credentials.json"),
      };
}
//@ chunk-1853x41x.js:734-763 placement
var O_NONBLOCK = constants.O_NONBLOCK;
var MAX_CREDENTIALS_FILE_BYTES = 1048576;
//@ chunk-1853x41x.js:763-950 placement
/**
 * 只读、不跟随符号链接打开
 */
async function openForReadNoFollow(path) {
  try {
    return {
      kind: "open",
      fileHandle: await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | O_NONBLOCK),
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
//@ chunk-1853x41x.js:950-1167 placement
/**
 * 写方式、不跟随符号链接打开
 */
async function openForWriteNoFollow(path, mode) {
  let flags = constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC;
  try {
    return {
      kind: "open",
      fileHandle: await open(path, flags | constants.O_NOFOLLOW, mode),
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
//@ chunk-1853x41x.js:1167-1226 placement
function isUsableStoreDir(dir) {
  return dir.length > 0 && !dir.includes("\x00") && isAbsolute(dir);
}
//@ chunk-1853x41x.js:1226-1294 placement
var CREDENTIAL_FIELD_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1853x41x.js:1226", () => {
  CREDENTIAL_FIELD_NAMES = new Set([".oauth_token", ".api_key", ".session_ingress_token"]);
});
//@ chunk-1853x41x.js:1294-1374 placement
function classifyReadError(code) {
  return code === "ENOENT"
    ? {
        state: "absent",
      }
    : {
        state: "read-failed",
        code,
      };
}
//@ chunk-1853x41x.js:1374-1431 placement
function readErrorState(errnoCode) {
  return errnoCode === "ENOENT" ? "absent" : "read-failed";
}
//@ chunk-1853x41x.js:1431-1586 placement
/**
 * 读取错误分类
 */
function classifyReadErrno(code, platform) {
  if (code === "ENOENT" || code === "EISDIR" || code === "ENOTDIR") return "absent";
  if ((code === "EACCES" || code === "EPERM") && platform !== "win32") return "absent";
  return "read-failed";
}
//@ chunk-1853x41x.js:1586-2606 placement
/**
 * 读取凭据文件
 */
async function readCredentialsFile(readErrorState) {
  let paths = credentialsStorePaths();
  if (paths === null)
    return {
      state: "absent",
    };
  let opened = await openForReadNoFollow(paths.storePath);
  switch (opened.kind) {
    case "refused-symlink":
      return {
        state: "refused-symlink",
      };
    case "error":
      return readErrorState(opened.code) === "absent"
        ? {
            state: "absent",
          }
        : {
            state: "read-failed",
            code: opened.code,
          };
    case "open": {
      let { fileHandle } = opened;
      let text;
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
        let buffer = Buffer.alloc(Math.min(stats.size, MAX_CREDENTIALS_FILE_BYTES) + 1);
        let total = 0;
        for (;;) {
          let { bytesRead } = await fileHandle.read(buffer, total, buffer.length - total, total);
          if (bytesRead === 0) break;
          total += bytesRead;
          if (total === buffer.length) {
            if (buffer.length > MAX_CREDENTIALS_FILE_BYTES)
              return {
                state: "corrupt",
              };
            let larger = Buffer.alloc(MAX_CREDENTIALS_FILE_BYTES + 1);
            buffer.copy(larger, 0, 0, total);
            buffer = larger;
          }
        }
        text = buffer.toString("utf8", 0, total);
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
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        return {
          state: "corrupt",
        };
      }
      if (parsed === null)
        return {
          state: "absent",
        };
      return {
        state: "present",
        data: parsed,
        uid,
        mode,
      };
    }
  }
}
//@ chunk-1853x41x.js:2606-4918 placement
/**
 * 凭据文件存储实现
 */
var CREDENTIALS_FILE_STORE = {
  readCredentials() {
    return readCredentialsFile(readErrorState);
  },
  readCredentialsStrict() {
    return readCredentialsFile((code) => classifyReadErrno(code, "linux"));
  },
  async writeCredentials(data) {
    let paths = credentialsStorePaths();
    if (paths === null)
      return {
        state: "write-failed",
        code: "ENOTSUP",
      };
    let { storeDir, storePath } = paths;
    try {
      await getFsImplementation().mkdir(storeDir);
      await filePath(storePath, jsonStringify(data), {
        mode: 384,
        exactMode: 384,
        flush: true,
        flushForgivesEbadf: true,
      });
    } catch (error) {
      await preservedTmpOf(error);
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
    let paths = credentialsStorePaths();
    return paths === null
      ? {
          state: "delete-failed",
          code: "ENOTSUP",
        }
      : deleteCredentialsFile(paths.storePath);
  },
  async discardSpentCredentialFile(path) {
    if (isDiskless())
      return {
        state: "delete-failed",
        code: "ENOTSUP",
      };
    return deleteCredentialsFile(path);
  },
  async readHandoffCredential(path, { symlinkAtPath }) {
    if (isDiskless())
      return {
        state: "read-failed",
        code: "ENOTSUP",
      };
    if (!isUsableStoreDir(path))
      return {
        state: "read-failed",
        code: "EINVAL",
      };
    let handle;
    if (symlinkAtPath === "follow")
      try {
        handle = await open(path, constants.O_RDONLY | O_NONBLOCK);
      } catch (error) {
        return classifyReadError(getErrnoCode(error));
      }
    else {
      let opened = await openForReadNoFollow(path);
      switch (opened.kind) {
        case "refused-symlink":
          return {
            state: "read-failed",
            code: "ELOOP",
          };
        case "error":
          return classifyReadError(opened.code);
        case "open":
          handle = opened.fileHandle;
      }
    }
    try {
      if (!(await handle.stat()).isFile())
        return {
          state: "read-failed",
          code: "EINVAL",
        };
      let buffer = Buffer.alloc(MAX_CREDENTIAL_READ_BYTES + 1);
      let total = 0;
      for (;;) {
        let { bytesRead } = await handle.read(buffer, total, buffer.length - total, total);
        if (bytesRead === 0) break;
        total += bytesRead;
        if (total > MAX_CREDENTIAL_READ_BYTES)
          return {
            state: "read-failed",
            code: "EFBIG",
          };
      }
      return {
        state: "present",
        contents: buffer.toString("utf8", 0, total),
      };
    } catch (error) {
      return classifyReadError(getErrnoCode(error));
    } finally {
      await handle.close().catch(() => {});
    }
  },
  async writeHandoffCredential(path, contents) {
    if (isDiskless())
      return {
        state: "write-failed",
        code: "ENOTSUP",
      };
    if (!isUsableStoreDir(path))
      return {
        state: "write-failed",
        code: "EINVAL",
      };
    if (!CREDENTIAL_FIELD_NAMES.has(basename(path)))
      return {
        state: "write-failed",
        code: "EINVAL",
      };
    try {
      await mkdir(dirname(path), {
        recursive: true,
        mode: 448,
      });
    } catch (error) {
      return {
        state: "write-failed",
        code: getErrnoCode(error),
      };
    }
    let opened = await openForWriteNoFollow(path, 384);
    switch (opened.kind) {
      case "refused-symlink":
        return {
          state: "write-failed",
          code: "ELOOP",
        };
      case "error":
        return {
          state: "write-failed",
          code: opened.code,
        };
      case "open":
        try {
          await opened.fileHandle.writeFile(contents, {
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
          await opened.fileHandle.close().catch(() => {});
        }
    }
  },
  async probeCredentials() {
    let paths = credentialsStorePaths();
    if (paths === null)
      return {
        state: "absent",
      };
    let stats;
    try {
      stats = await lstat(paths.storePath, {
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
    if (stats.isSymbolicLink())
      return {
        state: "read-failed",
        code: "ELOOP",
      };
    return {
      state: "present",
      version: `${stats.dev}:${stats.ino}:${stats.size}:${stats.mtimeNs}`,
    };
  },
};
//@ chunk-1853x41x.js:4918-5086 placement
/**
 * 删除凭据文件
 */
async function deleteCredentialsFile(path) {
  try {
    await getFsImplementation().unlink(path);
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
//@ chunk-1853x41x.js:5086-5139 placement
var CredentialsStoreHandleSymbol; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1853x41x.js:5086", () => {
  CredentialsStoreHandleSymbol = Symbol("secureStorage.CredentialsStoreHandle");
});
//@ chunk-1853x41x.js:5139-5193 placement
/**
 * 按配置目录取凭据文件存储（.credentials.json 等），拒绝符号链接。
 */
function credentialsStoreFor(handle, store = CREDENTIALS_FILE_STORE) {
  return isStorageV5Enabled() && handle !== undefined ? withStoreHandle(store) : undefined;
}
//@ chunk-1853x41x.js:5193-5247 placement
function sessionServicesFor(storageV5) {
  return {
    storageV5,
    credentials: credentialsStoreFor(storageV5),
  };
}
//@ chunk-1853x41x.js:5247-5305 placement
function withStoreHandle(store = CREDENTIALS_FILE_STORE) {
  return {
    ...store,
    [CredentialsStoreHandleSymbol]: "CredentialsStoreHandle",
  };
}
export { credentialsStoreFor, sessionServicesFor };

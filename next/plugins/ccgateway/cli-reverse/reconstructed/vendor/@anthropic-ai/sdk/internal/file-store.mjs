/**
 * @anthropic-ai/sdk/internal/file-store.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-m6wtswwx.js (17)
 * attribution: esm-fingerprint 15, esm-layout 2
 */
import * as Jpt from "fs";
import * as Nm from "path";
import * as pHt from "crypto";
import { encodeUTF8 } from "./utils/bytes.mjs";

//@ chunk-m6wtswwx.js:6954-7426 esm-fingerprint
var fsp = Jpt.promises;
var C_2 = Jpt.constants;
var OWNER_ONLY_DIR_MODE = 448;
var OWNER_ONLY_FILE_MODE = 384;
var OWNER_ONLY_EXEC_MODE = 448;
var O_NOFOLLOW = C_2.O_NOFOLLOW ?? 0;
var O_NONBLOCK = C_2.O_NONBLOCK ?? 0;
var FileStoreError = (() => {
  class FileStoreError extends Error {
    constructor(reason, relPath) {
      super(`path ${JSON.stringify(relPath)} ${reason}`);
      this.name = "FileStoreError";
      this.reason = reason;
      this.relPath = relPath;
    }
  }
  FileStoreError.ESCAPES_ROOT = "escapes the store root";
  FileStoreError.IS_A_SYMLINK = "is a symlink";
  FileStoreError.NOT_A_FILE = "is not a regular file";
  FileStoreError.NOT_A_DIRECTORY = "is not a directory";
  FileStoreError.NOT_UTF8 = "is not valid utf-8";
  FileStoreError.MOVE_DESTINATION_EXISTS = "already exists";
  return FileStoreError;
})();
//@ chunk-m6wtswwx.js:7426-7496 esm-fingerprint
function isPathLegal(p) {
  return p.startsWith("/") && !p.split("/").includes("..");
}
//@ chunk-m6wtswwx.js:7496-10714 esm-fingerprint
var FileStore = (() => {
  class FileStore {
    constructor(root, removedOnDispose, utf8Only = false) {
      this.hashes = new Map();
      this.rootPath = root;
      this.removedOnDispose = removedOnDispose;
      this.decoder = utf8Only
        ? new TextDecoder("utf-8", {
            fatal: true,
          })
        : undefined;
    }
    static async open(root, opts) {
      if (!platformSupported()) throw Error("FileStore requires O_NOFOLLOW support on this platform");
      let removedOnDispose = false;
      try {
        await fsp.lstat(root);
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
        removedOnDispose = true;
      }
      return new FileStore(Nm.resolve(root), removedOnDispose, opts?.utf8 ?? false);
    }
    async createRoot() {
      await makeDirAndAncestors(this.rootPath);
    }
    root() {
      return {
        path: this.rootPath,
        removedOnDispose: this.removedOnDispose,
      };
    }
    async dispose() {
      if (!this.removedOnDispose) return;
      await fsp.rm(this.rootPath, {
        recursive: true,
        force: true,
      });
    }
    async put(relPath, data, opts) {
      let tail = relPath.replace(/\\/g, "/");
      if (tail.endsWith("/") || tail.endsWith("/.") || tail === "" || tail === ".")
        throw new FileStoreError(FileStoreError.NOT_A_FILE, relPath);
      let dest = this.resolveUnderRoot(relPath);
      let payload = typeof data === "string" ? encodeUTF8(data) : data;
      this.requireUtf8(relPath, payload);
      await makeDirsBelowRoot(this.rootPath, Nm.dirname(dest));
      await replaceViaTemp(dest, payload, opts?.executable ?? false);
    }
    async get(relPath) {
      let dest = this.resolveUnderRoot(relPath);
      let handle;
      try {
        handle = await openRegularFile(relPath, dest);
      } catch (e) {
        if (e.code === "ENOENT") return null;
        throw e;
      }
      let data;
      try {
        let buf = await handle.readFile();
        data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      } finally {
        await handle.close();
      }
      this.requireUtf8(relPath, data);
      return data;
    }
    async ls(under = "/") {
      let base = this.resolveUnderRoot(under);
      return new Set((await filenamesInDir(this.rootPath, under, base)).map(([rel]) => rel));
    }
    async findSymlinks(under = "/") {
      let base = this.resolveUnderRoot(under);
      return symlinksInDir(this.rootPath, under, base);
    }
    async hashtree(under = "/") {
      let base = this.resolveUnderRoot(under);
      let walkStartNs = _internals.nowNs();
      let out = Object.create(null);
      for (let [rel, full] of await filenamesInDir(this.rootPath, under, base)) {
        let sha = await this.hashViaCache(rel, full, walkStartNs);
        if (sha !== null) out[rel] = sha;
      }
      return out;
    }
    async hashFile(relPath) {
      let dest = this.resolveUnderRoot(relPath);
      let st;
      try {
        st = await fsp.lstat(dest, {
          bigint: true,
        });
      } catch (e) {
        if (e.code === "ENOENT") return null;
        throw e;
      }
      if (st.isSymbolicLink()) throw new FileStoreError(FileStoreError.IS_A_SYMLINK, relPath);
      if (!st.isFile()) throw new FileStoreError(FileStoreError.NOT_A_FILE, relPath);
      let rel = Nm.relative(this.rootPath, dest).split(Nm.sep).join("/");
      return this.hashViaCache(rel, dest, _internals.nowNs());
    }
    async move(src, dst) {
      let s = this.resolveUnderRoot(src);
      let d = this.resolveUnderRoot(dst);
      if (s === this.rootPath || d === this.rootPath) return;
      if (
        await fsp.stat(d).then(
          () => true,
          () => false,
        )
      )
        throw new FileStoreError(FileStoreError.MOVE_DESTINATION_EXISTS, dst);
      await makeDirsBelowRoot(this.rootPath, Nm.dirname(d));
      await fsp.rename(s, d);
    }
    async remove(relPath) {
      let dest = this.resolveUnderRoot(relPath);
      if (dest === this.rootPath) return;
      let st;
      try {
        st = await fsp.lstat(dest, {
          bigint: true,
        });
      } catch (e) {
        if (e.code === "ENOENT") return;
        throw e;
      }
      if (st.isDirectory())
        await fsp.rm(dest, {
          recursive: true,
          force: true,
        });
      else
        try {
          await fsp.unlink(dest);
        } catch (e) {
          if (e.code !== "ENOENT") throw e;
        }
    }
    resolveUnderRoot(relPath) {
      let norm = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
      let parts = norm.split("/").filter((p) => p !== "" && p !== ".");
      if (Nm.posix.isAbsolute(norm) || parts.includes(".."))
        throw new FileStoreError(FileStoreError.ESCAPES_ROOT, relPath);
      return parts.length === 0 ? this.rootPath : Nm.join(this.rootPath, ...parts);
    }
    requireUtf8(relPath, data) {
      if (!this.decoder) return;
      try {
        this.decoder.decode(data);
      } catch {
        throw new FileStoreError(FileStoreError.NOT_UTF8, relPath);
      }
    }
    async hashViaCache(rel, full, walkStartNs) {
      let st;
      try {
        st = await fsp.lstat(full, {
          bigint: true,
        });
      } catch (e) {
        if (e.code === "ENOENT") return null;
        throw e;
      }
      if (!st.isFile()) return null;
      let cached = this.hashes.get(rel);
      let sha;
      if (cached !== undefined && unchangedSinceHashed(cached, st)) sha = cached.sha;
      else
        try {
          sha = await _internals.hashFile(full);
        } catch (e) {
          let code = e.code;
          if (code === "ENOENT" || e instanceof FileStoreError) return null;
          if (code === "ELOOP" || code === "EMLINK") return null;
          throw e;
        }
      if (oldEnoughToCache(st, walkStartNs))
        this.hashes.set(rel, {
          mtimeNs: st.mtimeNs,
          ctimeNs: st.ctimeNs,
          size: st.size,
          sha,
        });
      return sha;
    }
  }
  FileStore.isPathLegal = isPathLegal;
  return FileStore;
})();
//@ chunk-m6wtswwx.js:10714-10742 esm-layout
function platformSupported() {
  return O_NOFOLLOW !== 0;
}
//@ chunk-m6wtswwx.js:10742-11028 esm-fingerprint
async function makeDirAndAncestors(dir) {
  let missing = [];
  let current = dir;
  for (;;) {
    try {
      await fsp.stat(current);
      break;
    } catch (e) {
      let code = e.code;
      if (code !== "ENOENT" && code !== "ENOTDIR" && code !== "ELOOP") throw e;
    }
    missing.push(current);
    let parent = Nm.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  for (let directory of missing.reverse())
    try {
      await fsp.mkdir(directory, {
        mode: OWNER_ONLY_DIR_MODE,
      });
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
}
//@ chunk-m6wtswwx.js:11028-11215 esm-fingerprint
async function makeDirsBelowRoot(root, dir) {
  let below = Nm.relative(root, dir);
  if (below === "") return;
  let current = root;
  for (let part of below.split(Nm.sep)) {
    current = Nm.join(current, part);
    try {
      await fsp.mkdir(current, {
        mode: OWNER_ONLY_DIR_MODE,
      });
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
  }
}
//@ chunk-m6wtswwx.js:11215-11537 esm-fingerprint
async function replaceViaTemp(dest, data, isExecutable) {
  let mode = isExecutable ? OWNER_ONLY_EXEC_MODE : OWNER_ONLY_FILE_MODE;
  let tmp = Nm.join(Nm.dirname(dest), `.fs-${pHt.randomBytes(8).toString("hex")}.tmp`);
  let handle;
  try {
    handle = await fsp.open(tmp, C_2.O_WRONLY | C_2.O_CREAT | C_2.O_EXCL | O_NOFOLLOW, mode);
    await handle.writeFile(data);
    await handle.close();
    handle = undefined;
    await fsp.rename(tmp, dest);
  } catch (err) {
    if (handle) await handle.close().catch(() => {});
    await fsp.unlink(tmp).catch(() => {});
    throw err;
  }
}
//@ chunk-m6wtswwx.js:11537-11812 esm-fingerprint
async function openRegularFile(relPath, dest) {
  let handle;
  try {
    handle = await fsp.open(dest, C_2.O_RDONLY | O_NOFOLLOW | O_NONBLOCK);
  } catch (e) {
    let code = e.code;
    if (code === "ELOOP" || code === "EMLINK") throw new FileStoreError(FileStoreError.IS_A_SYMLINK, relPath);
    throw e;
  }
  try {
    if (!(await handle.stat()).isFile()) throw new FileStoreError(FileStoreError.NOT_A_FILE, relPath);
  } catch (e) {
    await handle.close().catch(() => {});
    throw e;
  }
  return handle;
}
//@ chunk-m6wtswwx.js:11812-12064 esm-fingerprint
async function hashFile(full) {
  let digest = pHt.createHash("sha256");
  let handle = await openRegularFile(Nm.basename(full), full);
  let buf = new Uint8Array(1048576);
  try {
    for (;;) {
      let { bytesRead } = await handle.read(buf, 0, buf.length);
      if (bytesRead === 0) break;
      digest.update(buf.subarray(0, bytesRead));
    }
  } finally {
    await handle.close();
  }
  return digest.digest("hex");
}
//@ chunk-m6wtswwx.js:12064-12231 esm-fingerprint
async function filenamesInDir(root, under, base) {
  if (!(await requireDir(under, base))) return [];
  let out = [];
  await walk(base, (full, entry) => {
    if (entry.isFile()) out.push([Nm.relative(root, full).split(Nm.sep).join("/"), full]);
  });
  out.sort();
  return out;
}
//@ chunk-m6wtswwx.js:12231-12597 esm-fingerprint
async function symlinksInDir(root, under, base) {
  let relOf = (full) => Nm.relative(root, full).split(Nm.sep).join("/");
  let st;
  try {
    st = await fsp.lstat(base, {
      bigint: true,
    });
  } catch (e) {
    let code = e.code;
    if (code === "ENOENT" || code === "ENOTDIR") return new Set();
    throw e;
  }
  if (st.isSymbolicLink()) return new Set([relOf(base)]);
  if (!st.isDirectory()) throw new FileStoreError(FileStoreError.NOT_A_DIRECTORY, under);
  let out = new Set();
  await walk(base, (full, entry) => {
    if (entry.isSymbolicLink()) out.add(relOf(full));
  });
  return out;
}
//@ chunk-m6wtswwx.js:12597-12793 esm-fingerprint
async function requireDir(under, base) {
  let st;
  try {
    st = await fsp.lstat(base, {
      bigint: true,
    });
  } catch (e) {
    let code = e.code;
    if (code === "ENOENT" || code === "ENOTDIR") return false;
    throw e;
  }
  if (!st.isDirectory()) throw new FileStoreError(FileStoreError.NOT_A_DIRECTORY, under);
  return true;
}
//@ chunk-m6wtswwx.js:12793-13048 esm-fingerprint
async function walk(base, visit) {
  let stack = [base];
  while (stack.length) {
    let dir = stack.pop();
    let entries;
    try {
      entries = await fsp.readdir(dir, {
        withFileTypes: true,
      });
    } catch (e) {
      if (e.code === "ENOENT") continue;
      throw e;
    }
    for (let entry of entries) {
      let full = Nm.join(dir, entry.name);
      visit(full, entry);
      if (entry.isDirectory() && !entry.isSymbolicLink()) stack.push(full);
    }
  }
}
//@ chunk-m6wtswwx.js:13048-13134 esm-fingerprint
function unchangedSinceHashed(cached, st) {
  return st.mtimeNs === cached.mtimeNs && st.ctimeNs === cached.ctimeNs && st.size === cached.size;
}
//@ chunk-m6wtswwx.js:13134-13227 esm-fingerprint
function oldEnoughToCache(st, walkStartNs) {
  return (
    (st.mtimeNs > st.ctimeNs ? st.mtimeNs : st.ctimeNs) < walkStartNs - _internals.timestampTrustMarginNs
  );
}
//@ chunk-m6wtswwx.js:13227-13356 esm-layout
var TIMESTAMP_TRUST_MARGIN_NS = 2000000000n;
var _internals = {
  hashFile,
  timestampTrustMarginNs: TIMESTAMP_TRUST_MARGIN_NS,
  nowNs: () => BigInt(Date.now()) * 1000000n,
};
var FileStore_default = FileStore;
var asyncDispose = Symbol.asyncDispose;
//@ chunk-m6wtswwx.js:13356-13458 esm-fingerprint
if (asyncDispose)
  Object.defineProperty(FileStore.prototype, asyncDispose, {
    value: FileStore.prototype.dispose,
    configurable: true,
    writable: true,
  });
export { FileStore_default, FileStoreError, isPathLegal };

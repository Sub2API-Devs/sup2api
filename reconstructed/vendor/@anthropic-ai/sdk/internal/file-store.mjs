/**
 * @anthropic-ai/sdk/internal/file-store.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-2cw52qnf.js (17)
 * attribution: esm-fingerprint 15, esm-layout 2
 */
import * as hat from "fs";
import * as zp from "path";
import * as BRt from "crypto";
import { h4t } from "./utils/bytes.mjs";

//@ chunk-2cw52qnf.js:6954-7426 esm-fingerprint
var promises_3 = hat.promises,
  constants = hat.constants,
  xe = 448,
  bt = 384,
  Ot = 448,
  ge = constants.O_NOFOLLOW ?? 0,
  Mt = constants.O_NONBLOCK ?? 0,
  m = (() => {
    class FileStoreError extends Error {
      constructor(e, t) {
        super(`path ${JSON.stringify(t)} ${e}`);
        ((this.name = "FileStoreError"), (this.reason = e), (this.relPath = t));
      }
    }
    return (
      (FileStoreError.ESCAPES_ROOT = "escapes the store root"),
      (FileStoreError.IS_A_SYMLINK = "is a symlink"),
      (FileStoreError.NOT_A_FILE = "is not a regular file"),
      (FileStoreError.NOT_A_DIRECTORY = "is not a directory"),
      (FileStoreError.NOT_UTF8 = "is not valid utf-8"),
      (FileStoreError.MOVE_DESTINATION_EXISTS = "already exists"),
      FileStoreError
    );
  })();
//@ chunk-2cw52qnf.js:7426-7496 esm-fingerprint
function Se(r) {
  return r.startsWith("/") && !r.split("/").includes("..");
}
//@ chunk-2cw52qnf.js:7496-10714 esm-fingerprint
var _e = (() => {
  class r {
    constructor(e, t, n = !1) {
      ((this.hashes = new Map()),
        (this.rootPath = e),
        (this.removedOnDispose = t),
        (this.decoder = n ? new TextDecoder("utf-8", { fatal: !0 }) : void 0));
    }
    static async open(e, t) {
      if (!vt()) throw Error("FileStore requires O_NOFOLLOW support on this platform");
      let n = !1;
      try {
        await promises_3.lstat(e);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        n = !0;
      }
      return new r(zp.resolve(e), n, t?.utf8 ?? !1);
    }
    async createRoot() {
      await kt(this.rootPath);
    }
    root() {
      return { path: this.rootPath, removedOnDispose: this.removedOnDispose };
    }
    async dispose() {
      if (!this.removedOnDispose) return;
      await promises_3.rm(this.rootPath, { recursive: !0, force: !0 });
    }
    async put(e, t, n) {
      let replaced = e.replace(/\\/g, "/");
      if (replaced.endsWith("/") || replaced.endsWith("/.") || replaced === "" || replaced === ".")
        throw new m(m.NOT_A_FILE, e);
      let underRoot = this.resolveUnderRoot(e),
        s = typeof t === "string" ? h4t(t) : t;
      (this.requireUtf8(e, s),
        await Le(this.rootPath, zp.dirname(underRoot)),
        await It(underRoot, s, n?.executable ?? !1));
    }
    async get(e) {
      let underRoot = this.resolveUnderRoot(e),
        n;
      try {
        n = await De(e, underRoot);
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
      let i;
      try {
        let content = await n.readFile();
        i = new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
      } finally {
        await n.close();
      }
      return (this.requireUtf8(e, i), i);
    }
    async ls(e = "/") {
      let underRoot = this.resolveUnderRoot(e);
      return new Set((await $e(this.rootPath, e, underRoot)).map(([n]) => n));
    }
    async findSymlinks(e = "/") {
      let underRoot = this.resolveUnderRoot(e);
      return Rt(this.rootPath, e, underRoot);
    }
    async hashtree(e = "/") {
      let underRoot = this.resolveUnderRoot(e),
        nowNs = re.nowNs(),
        create = Object.create(null);
      for (let [o, s] of await $e(this.rootPath, e, underRoot)) {
        let hashViaCache = await this.hashViaCache(o, s, nowNs);
        if (hashViaCache !== null) create[o] = hashViaCache;
      }
      return create;
    }
    async hashFile(e) {
      let underRoot = this.resolveUnderRoot(e),
        n;
      try {
        n = await promises_3.lstat(underRoot, { bigint: !0 });
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
      if (n.isSymbolicLink()) throw new m(m.IS_A_SYMLINK, e);
      if (!n.isFile()) throw new m(m.NOT_A_FILE, e);
      let joined = zp.relative(this.rootPath, underRoot).split(zp.sep).join("/");
      return this.hashViaCache(joined, underRoot, re.nowNs());
    }
    async move(e, t) {
      let underRoot = this.resolveUnderRoot(e),
        underRoot_2 = this.resolveUnderRoot(t);
      if (underRoot === this.rootPath || underRoot_2 === this.rootPath) return;
      if (
        await promises_3.stat(underRoot_2).then(
          () => !0,
          () => !1,
        )
      )
        throw new m(m.MOVE_DESTINATION_EXISTS, t);
      (await Le(this.rootPath, zp.dirname(underRoot_2)), await promises_3.rename(underRoot, underRoot_2));
    }
    async remove(e) {
      let underRoot = this.resolveUnderRoot(e);
      if (underRoot === this.rootPath) return;
      let n;
      try {
        n = await promises_3.lstat(underRoot, { bigint: !0 });
      } catch (error) {
        if (error.code === "ENOENT") return;
        throw error;
      }
      if (n.isDirectory()) await promises_3.rm(underRoot, { recursive: !0, force: !0 });
      else
        try {
          await promises_3.unlink(underRoot);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
    }
    resolveUnderRoot(e) {
      let replaced = e.replace(/\\/g, "/").replace(/^\/+/, ""),
        filtered = replaced.split("/").filter((i) => i !== "" && i !== ".");
      if (zp.posix.isAbsolute(replaced) || filtered.includes("..")) throw new m(m.ESCAPES_ROOT, e);
      return filtered.length === 0 ? this.rootPath : zp.join(this.rootPath, ...filtered);
    }
    requireUtf8(e, t) {
      if (!this.decoder) return;
      try {
        this.decoder.decode(t);
      } catch {
        throw new m(m.NOT_UTF8, e);
      }
    }
    async hashViaCache(e, t, n) {
      let i;
      try {
        i = await promises_3.lstat(t, { bigint: !0 });
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
      if (!i.isFile()) return null;
      let o = this.hashes.get(e),
        s;
      if (o !== void 0 && Lt(o, i)) s = o.sha;
      else
        try {
          s = await re.hashFile(t);
        } catch (error) {
          let code = error.code;
          if (code === "ENOENT" || error instanceof m) return null;
          if (code === "ELOOP" || code === "EMLINK") return null;
          throw error;
        }
      if ($t(i, n)) this.hashes.set(e, { mtimeNs: i.mtimeNs, ctimeNs: i.ctimeNs, size: i.size, sha: s });
      return s;
    }
  }
  return ((r.isPathLegal = Se), r);
})();
//@ chunk-2cw52qnf.js:10714-10742 esm-layout
function vt() {
  return ge !== 0;
}
//@ chunk-2cw52qnf.js:10742-11028 esm-fingerprint
async function kt(r) {
  let e = [],
    t = r;
  for (;;) {
    try {
      await promises_3.stat(t);
      break;
    } catch (error) {
      let code = error.code;
      if (code !== "ENOENT" && code !== "ENOTDIR" && code !== "ELOOP") throw error;
    }
    e.push(t);
    let dir = zp.dirname(t);
    if (dir === t) break;
    t = dir;
  }
  for (let n of e.reverse())
    try {
      await promises_3.mkdir(n, { mode: xe });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
}
//@ chunk-2cw52qnf.js:11028-11215 esm-fingerprint
async function Le(r, e) {
  let relativePath = zp.relative(r, e);
  if (relativePath === "") return;
  let n = r;
  for (let i of relativePath.split(zp.sep)) {
    n = zp.join(n, i);
    try {
      await promises_3.mkdir(n, { mode: xe });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }
}
//@ chunk-2cw52qnf.js:11215-11537 esm-fingerprint
async function It(r, e, t) {
  let n = t ? Ot : bt,
    joined = zp.join(zp.dirname(r), `.fs-${BRt.randomBytes(8).toString("hex")}.tmp`),
    o;
  try {
    ((o = await promises_3.open(joined, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | ge, n)),
      await o.writeFile(e),
      await o.close(),
      (o = void 0),
      await promises_3.rename(joined, r));
  } catch (error) {
    if (o) await o.close().catch(() => {});
    throw (await promises_3.unlink(joined).catch(() => {}), error);
  }
}
//@ chunk-2cw52qnf.js:11537-11812 esm-fingerprint
async function De(r, e) {
  let t;
  try {
    t = await promises_3.open(e, constants.O_RDONLY | ge | Mt);
  } catch (error) {
    let code = error.code;
    if (code === "ELOOP" || code === "EMLINK") throw new m(m.IS_A_SYMLINK, r);
    throw error;
  }
  try {
    if (!(await t.stat()).isFile()) throw new m(m.NOT_A_FILE, r);
  } catch (error) {
    throw (await t.close().catch(() => {}), error);
  }
  return t;
}
//@ chunk-2cw52qnf.js:11812-12064 esm-fingerprint
async function Nt(r) {
  let hash = BRt.createHash("sha256"),
    t = await De(zp.basename(r), r),
    uint8Array = new Uint8Array(1048576);
  try {
    for (;;) {
      let { bytesRead: bytesRead } = await t.read(uint8Array, 0, uint8Array.length);
      if (bytesRead === 0) break;
      hash.update(uint8Array.subarray(0, bytesRead));
    }
  } finally {
    await t.close();
  }
  return hash.digest("hex");
}
//@ chunk-2cw52qnf.js:12064-12231 esm-fingerprint
async function $e(r, e, t) {
  if (!(await Tt(e, t))) return [];
  let n = [];
  return (
    await Ce(t, (i, o) => {
      if (o.isFile()) n.push([zp.relative(r, i).split(zp.sep).join("/"), i]);
    }),
    n.sort(),
    n
  );
}
//@ chunk-2cw52qnf.js:12231-12597 esm-fingerprint
async function Rt(r, e, t) {
  let n = (s) => zp.relative(r, s).split(zp.sep).join("/"),
    i;
  try {
    i = await promises_3.lstat(t, { bigint: !0 });
  } catch (error) {
    let code = error.code;
    if (code === "ENOENT" || code === "ENOTDIR") return new Set();
    throw error;
  }
  if (i.isSymbolicLink()) return new Set([n(t)]);
  if (!i.isDirectory()) throw new m(m.NOT_A_DIRECTORY, e);
  let o = new Set();
  return (
    await Ce(t, (s, a) => {
      if (a.isSymbolicLink()) o.add(n(s));
    }),
    o
  );
}
//@ chunk-2cw52qnf.js:12597-12793 esm-fingerprint
async function Tt(r, e) {
  let t;
  try {
    t = await promises_3.lstat(e, { bigint: !0 });
  } catch (error) {
    let code = error.code;
    if (code === "ENOENT" || code === "ENOTDIR") return !1;
    throw error;
  }
  if (!t.isDirectory()) throw new m(m.NOT_A_DIRECTORY, r);
  return !0;
}
//@ chunk-2cw52qnf.js:12793-13048 esm-fingerprint
async function Ce(r, e) {
  let t = [r];
  while (t.length) {
    let n = t.pop(),
      i;
    try {
      i = await promises_3.readdir(n, { withFileTypes: !0 });
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    for (let o of i) {
      let joined = zp.join(n, o.name);
      if ((e(joined, o), o.isDirectory() && !o.isSymbolicLink())) t.push(joined);
    }
  }
}
//@ chunk-2cw52qnf.js:13048-13134 esm-fingerprint
function Lt(r, e) {
  return e.mtimeNs === r.mtimeNs && e.ctimeNs === r.ctimeNs && e.size === r.size;
}
//@ chunk-2cw52qnf.js:13134-13227 esm-fingerprint
function $t(r, e) {
  return (r.mtimeNs > r.ctimeNs ? r.mtimeNs : r.ctimeNs) < e - re.timestampTrustMarginNs;
}
//@ chunk-2cw52qnf.js:13227-13356 esm-layout
var At = 2000000000n,
  re = { hashFile: Nt, timestampTrustMarginNs: At, nowNs: () => BigInt(Date.now()) * 1000000n },
  Fe = _e,
  asyncDispose = Symbol.asyncDispose;
//@ chunk-2cw52qnf.js:13356-13458 esm-fingerprint
if (asyncDispose)
  Object.defineProperty(_e.prototype, asyncDispose, {
    value: _e.prototype.dispose,
    configurable: !0,
    writable: !0,
  });

export { Fe, m, Se };

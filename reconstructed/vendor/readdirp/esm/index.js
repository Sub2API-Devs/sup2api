/**
 * readdirp/esm/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: readdirp@4.1.0..4.1.2
 * pieces: chunk-3gvas51j.js (5)
 * attribution: esm-fingerprint 4, esm-layout 1
 */
import { Readable } from "stream";
import {
  lstat,
  lstat as lstat_2,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  readdir,
  readdir as readdir_2,
  realpath,
  realpath as realpath_2,
} from "fs/promises";
import { resolve, join, relative, sep } from "path";

//@ chunk-3gvas51j.js:508-745 esm-fingerprint
var p = {
    FILE_TYPE: "files",
    DIR_TYPE: "directories",
    FILE_DIR_TYPE: "files_directories",
    EVERYTHING_TYPE: "all",
  },
  L = {
    root: ".",
    fileFilter: (t) => !0,
    directoryFilter: (t) => !0,
    type: p.FILE_TYPE,
    lstat: !1,
    depth: 2147483648,
    alwaysStat: !1,
    highWaterMark: 4096,
  };
//@ chunk-3gvas51j.js:745-762 esm-layout
Object.freeze(L);
//@ chunk-3gvas51j.js:762-1291 esm-fingerprint
var READDIRP_RECURSIVE_ERROR = "READDIRP_RECURSIVE_ERROR",
  Rt = new Set(["ENOENT", "EPERM", "EACCES", "ELOOP", READDIRP_RECURSIVE_ERROR]),
  V = [p.DIR_TYPE, p.EVERYTHING_TYPE, p.FILE_DIR_TYPE, p.FILE_TYPE],
  Dt = new Set([p.DIR_TYPE, p.EVERYTHING_TYPE, p.FILE_DIR_TYPE]),
  bt = new Set([p.EVERYTHING_TYPE, p.FILE_DIR_TYPE, p.FILE_TYPE]),
  It = (t) => Rt.has(t.code),
  Tt = !1,
  B = (t) => !0,
  q = (t) => {
    if (t === void 0) return B;
    if (typeof t === "function") return t;
    if (typeof t === "string") {
      let trimmed = t.trim();
      return (i) => i.basename === trimmed;
    }
    if (Array.isArray(t)) {
      let mapped = t.map((i) => i.trim());
      return (i) => mapped.some((s) => i.basename === s);
    }
    return B;
  };
//@ chunk-3gvas51j.js:1291-3702 esm-fingerprint
class Q extends Readable {
  constructor(t = {}) {
    super({ objectMode: !0, autoDestroy: !0, highWaterMark: t.highWaterMark });
    let e = { ...L, ...t },
      { root: root, type: s } = e;
    ((this._fileFilter = q(e.fileFilter)), (this._directoryFilter = q(e.directoryFilter)));
    let r = e.lstat ? lstat : stat_3;
    if (Tt) this._stat = (a) => r(a, { bigint: !0 });
    else this._stat = r;
    ((this._maxDepth = e.depth ?? L.depth),
      (this._wantsDir = s ? Dt.has(s) : !1),
      (this._wantsFile = s ? bt.has(s) : !1),
      (this._wantsEverything = s === p.EVERYTHING_TYPE),
      (this._root = resolve(root)),
      (this._isDirent = !e.alwaysStat),
      (this._statsProp = this._isDirent ? "dirent" : "stats"),
      (this._rdOptions = { encoding: "utf8", withFileTypes: this._isDirent }),
      (this.parents = [this._exploreDir(root, 1)]),
      (this.reading = !1),
      (this.parent = void 0));
  }
  async _read(t) {
    if (this.reading) return;
    this.reading = !0;
    try {
      while (!this.destroyed && t > 0) {
        let parent = this.parent,
          i = parent && parent.files;
        if (i && i.length > 0) {
          let { path: path, depth: depth } = parent,
            mapped = i.splice(0, t).map((n) => this._formatEntry(n, path)),
            results = await Promise.all(mapped);
          for (let n of results) {
            if (!n) continue;
            if (this.destroyed) return;
            let _getEntryType = await this._getEntryType(n);
            if (_getEntryType === "directory" && this._directoryFilter(n)) {
              if (depth <= this._maxDepth) this.parents.push(this._exploreDir(n.fullPath, depth + 1));
              if (this._wantsDir) (this.push(n), t--);
            } else if ((_getEntryType === "file" || this._includeAsFile(n)) && this._fileFilter(n)) {
              if (this._wantsFile) (this.push(n), t--);
            }
          }
        } else {
          let s = this.parents.pop();
          if (!s) {
            this.push(null);
            break;
          }
          if (((this.parent = await s), this.destroyed)) return;
        }
      }
    } catch (error) {
      this.destroy(error);
    } finally {
      this.reading = !1;
    }
  }
  async _exploreDir(t, e) {
    let i;
    try {
      i = await readdir_2(t, this._rdOptions);
    } catch (error) {
      this._onError(error);
    }
    return { files: i, depth: e, path: t };
  }
  async _formatEntry(t, e) {
    let i,
      s = this._isDirent ? t.name : t;
    try {
      let r = resolve(join(e, s));
      ((i = { path: relative(this._root, r), fullPath: r, basename: s }),
        (i[this._statsProp] = this._isDirent ? t : await this._stat(r)));
    } catch (error) {
      this._onError(error);
      return;
    }
    return i;
  }
  _onError(t) {
    if (It(t) && !this.destroyed) this.emit("warn", t);
    else this.destroy(t);
  }
  async _getEntryType(t) {
    if (!t && this._statsProp in t) return "";
    let e = t[this._statsProp];
    if (!e) return "";
    if (e.isFile()) return "file";
    if (e.isDirectory()) return "directory";
    if (e && e.isSymbolicLink()) {
      let fullPath = t.fullPath;
      try {
        let s = await realpath(fullPath),
          r = await lstat(s);
        if (r.isFile()) return "file";
        if (r.isDirectory()) {
          let a = s.length;
          if (fullPath.startsWith(s) && fullPath.substr(a, 1) === sep) {
            let o = Error(`Circular symlink detected: "${fullPath}" points to "${s}"`);
            return ((o.code = READDIRP_RECURSIVE_ERROR), this._onError(o));
          }
          return "directory";
        }
      } catch (error) {
        return (this._onError(error), "");
      }
    }
  }
  _includeAsFile(t) {
    let e = t && t[this._statsProp];
    return e && this._wantsEverything && !e.isDirectory();
  }
}
//@ chunk-3gvas51j.js:3702-4126 esm-fingerprint
function X(t, e = {}) {
  let i = e.entryType || e.type;
  if (i === "both") i = p.FILE_DIR_TYPE;
  if (i) e.type = i;
  if (!t) throw Error("readdirp: root argument is required. Usage: readdirp(root, options)");
  else if (typeof t !== "string")
    throw TypeError("readdirp: root argument must be a string. Usage: readdirp(root, options)");
  else if (i && !V.includes(i)) throw Error(`readdirp: Invalid type passed. Use one of ${V.join(", ")}`);
  return ((e.root = t), new Q(e));
}

export { X };

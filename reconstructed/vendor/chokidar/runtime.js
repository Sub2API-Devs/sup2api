/**
 * chokidar/runtime.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: chokidar@6.0.0
 * pieces: chunk-3gvas51j.js (5)
 * attribution: esm-layout 1, esm-fingerprint 1, affinity 3
 */
import { type as St } from "os";
import { lstat, stat as stat_2, open, realpath } from "fs/promises";
import "path";
import * as pathModule_2 from "path";
import { watch as watch_2, unwatchFile, watchFile } from "fs";

//@ chunk-3gvas51j.js:4308-4350 esm-layout
var DATA = "data";
var END = "end";
var CLOSE = "close";
var I = () => {};
//@ chunk-3gvas51j.js:4350-6739 esm-fingerprint
var LINUX = "linux";
var F = LINUX === "win32";
var At = LINUX === "darwin";
var Wt = LINUX === "linux";
var Nt = LINUX === "freebsd";
var it = St() === "OS400";
var m = {
  ALL: "all",
  READY: "ready",
  ADD: "add",
  CHANGE: "change",
  ADD_DIR: "addDir",
  UNLINK: "unlink",
  UNLINK_DIR: "unlinkDir",
  RAW: "raw",
  ERROR: "error",
};
var y = m;
var WATCH = "watch";
var kt = {
  lstat,
  stat: stat_2,
};
var LISTENERS = "listeners";
var ERRHANDLERS = "errHandlers";
var RAWEMITTERS = "rawEmitters";
var Ct = [LISTENERS, ERRHANDLERS, RAWEMITTERS];
var Ot = new Set([
  "3dm",
  "3ds",
  "3g2",
  "3gp",
  "7z",
  "a",
  "aac",
  "adp",
  "afdesign",
  "afphoto",
  "afpub",
  "ai",
  "aif",
  "aiff",
  "alz",
  "ape",
  "apk",
  "appimage",
  "ar",
  "arj",
  "asf",
  "au",
  "avi",
  "bak",
  "baml",
  "bh",
  "bin",
  "bk",
  "bmp",
  "btif",
  "bz2",
  "bzip2",
  "cab",
  "caf",
  "cgm",
  "class",
  "cmx",
  "cpio",
  "cr2",
  "cur",
  "dat",
  "dcm",
  "deb",
  "dex",
  "djvu",
  "dll",
  "dmg",
  "dng",
  "doc",
  "docm",
  "docx",
  "dot",
  "dotm",
  "dra",
  "DS_Store",
  "dsk",
  "dts",
  "dtshd",
  "dvb",
  "dwg",
  "dxf",
  "ecelp4800",
  "ecelp7470",
  "ecelp9600",
  "egg",
  "eol",
  "eot",
  "epub",
  "exe",
  "f4v",
  "fbs",
  "fh",
  "fla",
  "flac",
  "flatpak",
  "fli",
  "flv",
  "fpx",
  "fst",
  "fvt",
  "g3",
  "gh",
  "gif",
  "graffle",
  "gz",
  "gzip",
  "h261",
  "h263",
  "h264",
  "icns",
  "ico",
  "ief",
  "img",
  "ipa",
  "iso",
  "jar",
  "jpeg",
  "jpg",
  "jpgv",
  "jpm",
  "jxr",
  "key",
  "ktx",
  "lha",
  "lib",
  "lvp",
  "lz",
  "lzh",
  "lzma",
  "lzo",
  "m3u",
  "m4a",
  "m4v",
  "mar",
  "mdi",
  "mht",
  "mid",
  "midi",
  "mj2",
  "mka",
  "mkv",
  "mmr",
  "mng",
  "mobi",
  "mov",
  "movie",
  "mp3",
  "mp4",
  "mp4a",
  "mpeg",
  "mpg",
  "mpga",
  "mxu",
  "nef",
  "npx",
  "numbers",
  "nupkg",
  "o",
  "odp",
  "ods",
  "odt",
  "oga",
  "ogg",
  "ogv",
  "otf",
  "ott",
  "pages",
  "pbm",
  "pcx",
  "pdb",
  "pdf",
  "pea",
  "pgm",
  "pic",
  "png",
  "pnm",
  "pot",
  "potm",
  "potx",
  "ppa",
  "ppam",
  "ppm",
  "pps",
  "ppsm",
  "ppsx",
  "ppt",
  "pptm",
  "pptx",
  "psd",
  "pya",
  "pyc",
  "pyo",
  "pyv",
  "qt",
  "rar",
  "ras",
  "raw",
  "resources",
  "rgb",
  "rip",
  "rlc",
  "rmf",
  "rmvb",
  "rpm",
  "rtf",
  "rz",
  "s3m",
  "s7z",
  "scpt",
  "sgi",
  "shar",
  "snap",
  "sil",
  "sketch",
  "slk",
  "smv",
  "snk",
  "so",
  "stl",
  "suo",
  "sub",
  "swf",
  "tar",
  "tbz",
  "tbz2",
  "tga",
  "tgz",
  "thmx",
  "tif",
  "tiff",
  "tlz",
  "ttc",
  "ttf",
  "txz",
  "udf",
  "uvh",
  "uvi",
  "uvm",
  "uvp",
  "uvs",
  "uvu",
  "viv",
  "vob",
  "war",
  "wav",
  "wax",
  "wbmp",
  "wdp",
  "weba",
  "webm",
  "webp",
  "whl",
  "wim",
  "wm",
  "wma",
  "wmv",
  "wmx",
  "woff",
  "woff2",
  "wrm",
  "wvx",
  "xbm",
  "xif",
  "xla",
  "xlam",
  "xls",
  "xlsb",
  "xlsm",
  "xlsx",
  "xlt",
  "xltm",
  "xltx",
  "xm",
  "xmind",
  "xpi",
  "xpm",
  "xwd",
  "xz",
  "z",
  "zip",
  "zipx",
]);
var Mt = (t) => Ot.has(pathModule_2.extname(t).slice(1).toLowerCase());
var O = (t, e) => {
  if (t instanceof Set) t.forEach(e);
  else e(t);
};
var D = (t, e, i) => {
  let s = t[e];
  if (!(s instanceof Set)) t[e] = s = new Set([s]);
  s.add(i);
};
var zt = (t) => (e) => {
  let i = t[e];
  if (i instanceof Set) i.clear();
  else delete t[e];
};
var b = (t, e, i) => {
  let s = t[e];
  if (s instanceof Set) s.delete(i);
  else if (s === i) delete t[e];
};
var rt = (listeners) => (listeners instanceof Set ? listeners.size === 0 : !listeners);
var x = new Map();
//@ chunk-3gvas51j.js:6739-6916 affinity
function tt(t, e, i, errHandler, r) {
  let a = (o, n) => {
    i(t);
    r(o, n, {
      watchedPath: t,
    });
    if (n && t !== n) v(pathModule_2.resolve(t, n), LISTENERS, pathModule_2.join(t, n));
  };
  try {
    return watch_2(
      t,
      {
        persistent: e.persistent,
      },
      a,
    );
  } catch (error) {
    errHandler(error);
    return;
  }
}
//@ chunk-3gvas51j.js:6916-8809 affinity
var v = (t, e, i, s, r) => {
  let a = x.get(t);
  if (!a) return;
  O(a[e], (o) => {
    o(i, s, r);
  });
};
var Ht = (t, e, i, s) => {
  let { listener, errHandler, rawEmitter } = s;
  let n = x.get(e);
  let l;
  if (!i.persistent) {
    l = tt(t, i, listener, errHandler, rawEmitter);
    if (!l) return;
    l.on(y.ERROR, async (h) => {
      if (F && h.code === "EPERM")
        try {
          await (await open(t, "r")).close();
          errHandler(h);
        } catch (error) {}
      else errHandler(h);
    });
    return l.close.bind(l);
  }
  if (n) {
    D(n, LISTENERS, listener);
    D(n, ERRHANDLERS, errHandler);
    D(n, RAWEMITTERS, rawEmitter);
  } else {
    l = tt(t, i, v.bind(null, e, LISTENERS), errHandler, v.bind(null, e, RAWEMITTERS));
    if (!l) return;
    l.on(y.ERROR, async (h) => {
      let f = v.bind(null, e, ERRHANDLERS);
      if (n) n.watcherUnusable = true;
      if (F && h.code === "EPERM")
        try {
          await (await open(t, "r")).close();
          f(h);
        } catch (error) {}
      else f(h);
    });
    n = {
      listeners: listener,
      errHandlers: errHandler,
      rawEmitters: rawEmitter,
      watcher: l,
    };
    x.set(e, n);
  }
  return () => {
    b(n, LISTENERS, listener);
    b(n, ERRHANDLERS, errHandler);
    b(n, RAWEMITTERS, rawEmitter);
    if (rt(n.listeners) && n.watcher) {
      n.watcher.close();
      x.delete(e);
      Ct.forEach(zt(n));
      n.watcher = undefined;
      Object.freeze(n);
    }
  };
};
var S = new Map();
var jt = (t, e, i, s) => {
  let { listener, rawEmitter, folderStamp } = s;
  let n = S.get(e);
  let options = n && n.options;
  if (options && (options.persistent < i.persistent || options.interval > i.interval)) {
    unwatchFile(e);
    n = undefined;
  }
  if (n) {
    D(n, LISTENERS, listener);
    D(n, RAWEMITTERS, rawEmitter);
  } else {
    let h = (c) => O(n.listeners, (u) => u(t, c));
    let f = (c, u) => {
      O(n.rawEmitters, (E) => {
        E(y.CHANGE, e, {
          curr: c,
          prev: u,
        });
      });
      let mtimeMs = c.mtimeMs;
      if (c.size !== u.size || mtimeMs > u.mtimeMs || mtimeMs === 0) {
        if (n.watcher && n.folderStamp !== undefined) n.folderStamp = A(c);
        h(c);
      }
    };
    n = {
      listeners: listener,
      rawEmitters: rawEmitter,
      options: i,
      onPoll: f,
      notify: h,
      folderStamp,
      watcher: watchFile(e, i, f),
    };
    S.set(e, n);
  }
  return () => {
    b(n, LISTENERS, listener);
    b(n, RAWEMITTERS, rawEmitter);
    if (rt(n.listeners) && n.watcher) {
      S.delete(e);
      unwatchFile(e);
      n.options = n.watcher = undefined;
      Object.freeze(n);
    }
  };
};
var nt = (t, e) => {
  for (let [i, s] of S) {
    let rawEmitters = s.rawEmitters;
    let a = rawEmitters instanceof Set && rawEmitters.size > 1;
    if (
      !(rawEmitters instanceof Set ? rawEmitters.has(t) : rawEmitters === t) ||
      s.options.interval === e ||
      (a && e > s.options.interval)
    )
      continue;
    unwatchFile(i, s.onPoll);
    s.options = {
      ...s.options,
      interval: e,
    };
    s.watcher = watchFile(i, s.options, s.onPoll);
    if (s.folderStamp !== undefined) Yt(i, s).catch(I);
  }
};
var A = (t) => `${t.mtimeMs}:${t.ctimeMs}`;
var Yt = async (t, e) => {
  let i;
  try {
    i = await stat_2(t);
  } catch (error) {
    return;
  }
  if (e.watcher && A(i) !== e.folderStamp) {
    e.folderStamp = A(i);
    e.notify(i);
  }
};
//@ chunk-3gvas51j.js:8809-13067 affinity
class H {
  constructor(t) {
    this.fsw = t;
    this._boundHandleError = (e) => t._handleError(e);
  }
  _watchWithNodeFs(t, e, folderStamp) {
    let options = this.fsw.options;
    let dir = pathModule_2.dirname(t);
    let base = pathModule_2.basename(t);
    this.fsw._getWatchedDir(dir).add(base);
    let resolved = pathModule_2.resolve(t);
    let l = {
      persistent: options.persistent,
    };
    if (!e) e = I;
    let h;
    if (options.usePolling) {
      let f = options.interval !== options.binaryInterval;
      l.interval = f && Mt(base) ? options.binaryInterval : options.interval;
      h = jt(t, resolved, l, {
        listener: e,
        rawEmitter: this.fsw._emitRaw,
        folderStamp,
      });
    } else
      h = Ht(t, resolved, l, {
        listener: e,
        errHandler: this._boundHandleError,
        rawEmitter: this.fsw._emitRaw,
      });
    return h;
  }
  _handleFile(t, e, i) {
    if (this.fsw.closed) return;
    let dir = pathModule_2.dirname(t);
    let base = pathModule_2.basename(t);
    let a = this.fsw._getWatchedDir(dir);
    let o = e;
    if (a.has(base)) return;
    let n = async (h, f) => {
      if (!this.fsw._throttle(WATCH, t, 5)) return;
      if (!f || f.mtimeMs === 0)
        try {
          let c = await stat_2(t);
          if (this.fsw.closed) return;
          let { atimeMs, mtimeMs } = c;
          if (!atimeMs || atimeMs <= mtimeMs || mtimeMs !== o.mtimeMs) this.fsw._emit(y.CHANGE, t, c);
          if ((At || Wt || Nt) && o.ino !== c.ino) {
            this.fsw._closeFile(t);
            o = c;
            let E = this._watchWithNodeFs(t, n);
            if (E) this.fsw._addPathCloser(t, E);
          } else o = c;
        } catch (error) {
          this.fsw._remove(dir, base);
        }
      else if (a.has(base)) {
        let { atimeMs, mtimeMs } = f;
        if (!atimeMs || atimeMs <= mtimeMs || mtimeMs !== o.mtimeMs) this.fsw._emit(y.CHANGE, t, f);
        o = f;
      }
    };
    let l = this._watchWithNodeFs(t, n);
    if (!(i && this.fsw.options.ignoreInitial) && this.fsw._isntIgnored(t)) {
      if (!this.fsw._throttle(y.ADD, t, 0)) return;
      this.fsw._emit(y.ADD, t, e);
    }
    return l;
  }
  async _handleSymlink(t, e, i, s) {
    if (this.fsw.closed) return;
    let fullPath = t.fullPath;
    let a = this.fsw._getWatchedDir(e);
    if (!this.fsw.options.followSymlinks) {
      this.fsw._incrReadyCount();
      let o;
      try {
        o = await realpath(i);
      } catch (error) {
        this.fsw._emitReady();
        return true;
      }
      if (this.fsw.closed) return;
      if (a.has(s)) {
        if (this.fsw._symlinkPaths.get(fullPath) !== o) {
          this.fsw._symlinkPaths.set(fullPath, o);
          this.fsw._emit(y.CHANGE, i, t.stats);
        }
      } else {
        a.add(s);
        this.fsw._symlinkPaths.set(fullPath, o);
        this.fsw._emit(y.ADD, i, t.stats);
      }
      this.fsw._emitReady();
      return true;
    }
    if (this.fsw._symlinkPaths.has(fullPath)) return true;
    this.fsw._symlinkPaths.set(fullPath, true);
  }
  _handleRead(t, e, i, s, r, a, o) {
    t = pathModule_2.join(t, "");
    o = this.fsw._throttle("readdir", t, 1000);
    if (!o) return;
    let n = this.fsw._getWatchedDir(i.path);
    let l = new Set();
    let h = this.fsw._readdirp(t, {
      fileFilter: (f) => i.filterPath(f),
      directoryFilter: (f) => i.filterDir(f),
    });
    if (!h) return;
    h.on(DATA, async (f) => {
      if (this.fsw.closed) {
        h = undefined;
        return;
      }
      let path = f.path;
      let joined = pathModule_2.join(t, path);
      l.add(path);
      if (f.stats.isSymbolicLink() && (await this._handleSymlink(f, t, joined, path))) return;
      if (this.fsw.closed) {
        h = undefined;
        return;
      }
      if (path === s || (!s && !n.has(path))) {
        this.fsw._incrReadyCount();
        joined = pathModule_2.join(r, pathModule_2.relative(r, joined));
        this._addToNodeFs(joined, e, i, a + 1);
      }
    }).on(y.ERROR, this._boundHandleError);
    return new Promise((resolve, reject) => {
      if (!h) return reject();
      h.once(END, () => {
        if (this.fsw.closed) {
          h = undefined;
          return;
        }
        let u = o ? o.clear() : false;
        resolve(undefined);
        n.getChildren()
          .filter((w) => w !== t && !l.has(w))
          .forEach((w) => {
            this.fsw._remove(t, w);
          });
        h = undefined;
        if (u) this._handleRead(t, false, i, s, r, a, o);
      });
    });
  }
  async _handleDir(t, e, i, s, r, a, o) {
    let n = this.fsw._getWatchedDir(pathModule_2.dirname(t));
    let l = n.has(pathModule_2.basename(t));
    if (!(i && this.fsw.options.ignoreInitial) && !r && !l) this.fsw._emit(y.ADD_DIR, t, e);
    n.add(pathModule_2.basename(t));
    this.fsw._getWatchedDir(t);
    let h;
    let f;
    let depth = this.fsw.options.depth;
    if ((depth == null || s <= depth) && !this.fsw._symlinkPaths.has(o)) {
      if (!r) {
        await this._handleRead(t, i, a, r, t, s, h);
        if (this.fsw.closed) return;
      }
      f = this._watchWithNodeFs(
        t,
        (u, w) => {
          if (w && w.mtimeMs === 0) return;
          this._handleRead(u, false, a, r, t, s, h);
        },
        e ? A(e) : null,
      );
    }
    return f;
  }
  async _addToNodeFs(t, e, i, s, r) {
    let _emitReady = this.fsw._emitReady;
    if (this.fsw._isIgnored(t) || this.fsw.closed) {
      _emitReady();
      return false;
    }
    let o = this.fsw._getWatchHelpers(t);
    if (i) {
      o.filterPath = (n) => i.filterPath(n);
      o.filterDir = (n) => i.filterDir(n);
    }
    try {
      let n = await kt[o.statMethod](o.watchPath);
      if (this.fsw.closed) return;
      if (this.fsw._isIgnored(o.watchPath, n)) {
        _emitReady();
        return false;
      }
      let followSymlinks = this.fsw.options.followSymlinks;
      let h;
      if (n.isDirectory()) {
        let resolved = pathModule_2.resolve(t);
        let c = followSymlinks ? await realpath(t) : t;
        if (this.fsw.closed) return;
        h = await this._handleDir(o.watchPath, n, e, s, r, o, c);
        if (this.fsw.closed) return;
        if (resolved !== c && c !== undefined) this.fsw._symlinkPaths.set(resolved, c);
      } else if (n.isSymbolicLink()) {
        let f = followSymlinks ? await realpath(t) : t;
        if (this.fsw.closed) return;
        let dir = pathModule_2.dirname(o.watchPath);
        this.fsw._getWatchedDir(dir).add(o.watchPath);
        this.fsw._emit(y.ADD, o.watchPath, n);
        h = await this._handleDir(dir, n, e, s, t, o, f);
        if (this.fsw.closed) return;
        if (f !== undefined) this.fsw._symlinkPaths.set(pathModule_2.resolve(t), f);
      } else h = this._handleFile(o.watchPath, n, e);
      _emitReady();
      if (h) this.fsw._addPathCloser(t, h);
      return false;
    } catch (error) {
      if (this.fsw._handleError(error)) {
        _emitReady();
        return t;
      }
    }
  }
}
export { I, it, m, H, nt, F, CLOSE, END };

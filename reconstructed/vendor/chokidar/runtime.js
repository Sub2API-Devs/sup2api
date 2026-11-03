/**
 * chokidar/runtime.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: chokidar@6.0.0
 * pieces: chunk-3gvas51j.js (5)
 * attribution: esm-layout 1, esm-fingerprint 1, affinity 3
 */
import { type as St } from "os";
import {
  lstat,
  lstat as lstat_2,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  open,
  realpath,
  realpath as realpath_2,
} from "fs/promises";
import * as pathModule from "path";
import * as pathModule_2 from "path";
import { watch, unwatchFile, watchFile } from "fs";

//@ chunk-3gvas51j.js:4308-4350 esm-layout
var DATA = "data",
  END = "end",
  CLOSE = "close",
  I = () => {};
//@ chunk-3gvas51j.js:4350-6739 esm-fingerprint
var LINUX = "linux",
  F = LINUX === "win32",
  At = LINUX === "darwin",
  Wt = LINUX === "linux",
  Nt = LINUX === "freebsd",
  it = St() === "OS400",
  m = {
    ALL: "all",
    READY: "ready",
    ADD: "add",
    CHANGE: "change",
    ADD_DIR: "addDir",
    UNLINK: "unlink",
    UNLINK_DIR: "unlinkDir",
    RAW: "raw",
    ERROR: "error",
  },
  y = m,
  WATCH = "watch",
  kt = { lstat: lstat_2, stat: stat_4 },
  LISTENERS = "listeners",
  ERRHANDLERS = "errHandlers",
  RAWEMITTERS = "rawEmitters",
  Ct = [LISTENERS, ERRHANDLERS, RAWEMITTERS],
  Ot = new Set([
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
  ]),
  Mt = (t) => Ot.has(pathModule_2.extname(t).slice(1).toLowerCase()),
  O = (t, e) => {
    if (t instanceof Set) t.forEach(e);
    else e(t);
  },
  D = (t, e, i) => {
    let s = t[e];
    if (!(s instanceof Set)) t[e] = s = new Set([s]);
    s.add(i);
  },
  zt = (t) => (e) => {
    let i = t[e];
    if (i instanceof Set) i.clear();
    else delete t[e];
  },
  b = (t, e, i) => {
    let s = t[e];
    if (s instanceof Set) s.delete(i);
    else if (s === i) delete t[e];
  },
  rt = (t) => (t instanceof Set ? t.size === 0 : !t),
  x = new Map();
//@ chunk-3gvas51j.js:6739-6916 affinity
function tt(t, e, i, s, r) {
  let a = (o, n) => {
    if ((i(t), r(o, n, { watchedPath: t }), n && t !== n))
      v(pathModule_2.resolve(t, n), LISTENERS, pathModule_2.join(t, n));
  };
  try {
    return watch(t, { persistent: e.persistent }, a);
  } catch (error) {
    s(error);
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
  },
  Ht = (t, e, i, s) => {
    let { listener: listener, errHandler: errHandler, rawEmitter: rawEmitter } = s,
      n = x.get(e),
      l;
    if (!i.persistent) {
      if (((l = tt(t, i, listener, errHandler, rawEmitter)), !l)) return;
      return (
        l.on(y.ERROR, async (h) => {
          if (F && h.code === "EPERM")
            try {
              (await (await open(t, "r")).close(), errHandler(h));
            } catch (error) {}
          else errHandler(h);
        }),
        l.close.bind(l)
      );
    }
    if (n) (D(n, LISTENERS, listener), D(n, ERRHANDLERS, errHandler), D(n, RAWEMITTERS, rawEmitter));
    else {
      if (((l = tt(t, i, v.bind(null, e, LISTENERS), errHandler, v.bind(null, e, RAWEMITTERS))), !l)) return;
      (l.on(y.ERROR, async (h) => {
        let f = v.bind(null, e, ERRHANDLERS);
        if (n) n.watcherUnusable = !0;
        if (F && h.code === "EPERM")
          try {
            (await (await open(t, "r")).close(), f(h));
          } catch (error) {}
        else f(h);
      }),
        (n = { listeners: listener, errHandlers: errHandler, rawEmitters: rawEmitter, watcher: l }),
        x.set(e, n));
    }
    return () => {
      if (
        (b(n, LISTENERS, listener),
        b(n, ERRHANDLERS, errHandler),
        b(n, RAWEMITTERS, rawEmitter),
        rt(n.listeners) && n.watcher)
      )
        (n.watcher.close(), x.delete(e), Ct.forEach(zt(n)), (n.watcher = void 0), Object.freeze(n));
    };
  },
  S = new Map(),
  jt = (t, e, i, s) => {
    let { listener: listener, rawEmitter: rawEmitter, folderStamp: folderStamp } = s,
      n = S.get(e),
      l = n && n.options;
    if (l && (l.persistent < i.persistent || l.interval > i.interval)) (unwatchFile(e), (n = void 0));
    if (n) (D(n, LISTENERS, listener), D(n, RAWEMITTERS, rawEmitter));
    else {
      let h = (c) => O(n.listeners, (u) => u(t, c)),
        f = (c, u) => {
          O(n.rawEmitters, (E) => {
            E(y.CHANGE, e, { curr: c, prev: u });
          });
          let mtimeMs = c.mtimeMs;
          if (c.size !== u.size || mtimeMs > u.mtimeMs || mtimeMs === 0) {
            if (n.watcher && n.folderStamp !== void 0) n.folderStamp = A(c);
            h(c);
          }
        };
      ((n = {
        listeners: listener,
        rawEmitters: rawEmitter,
        options: i,
        onPoll: f,
        notify: h,
        folderStamp: folderStamp,
        watcher: watchFile(e, i, f),
      }),
        S.set(e, n));
    }
    return () => {
      if ((b(n, LISTENERS, listener), b(n, RAWEMITTERS, rawEmitter), rt(n.listeners) && n.watcher))
        (S.delete(e), unwatchFile(e), (n.options = n.watcher = void 0), Object.freeze(n));
    };
  },
  nt = (t, e) => {
    for (let [i, s] of S) {
      let rawEmitters = s.rawEmitters,
        a = rawEmitters instanceof Set && rawEmitters.size > 1;
      if (
        !(rawEmitters instanceof Set ? rawEmitters.has(t) : rawEmitters === t) ||
        s.options.interval === e ||
        (a && e > s.options.interval)
      )
        continue;
      if (
        (unwatchFile(i, s.onPoll),
        (s.options = { ...s.options, interval: e }),
        (s.watcher = watchFile(i, s.options, s.onPoll)),
        s.folderStamp !== void 0)
      )
        Yt(i, s).catch(I);
    }
  },
  A = (t) => `${t.mtimeMs}:${t.ctimeMs}`,
  Yt = async (t, e) => {
    let i;
    try {
      i = await stat_4(t);
    } catch (error) {
      return;
    }
    if (e.watcher && A(i) !== e.folderStamp) ((e.folderStamp = A(i)), e.notify(i));
  };
//@ chunk-3gvas51j.js:8809-13067 affinity
class H {
  constructor(t) {
    ((this.fsw = t), (this._boundHandleError = (e) => t._handleError(e)));
  }
  _watchWithNodeFs(t, e, i) {
    let options = this.fsw.options,
      dir = pathModule_2.dirname(t),
      base = pathModule_2.basename(t);
    this.fsw._getWatchedDir(dir).add(base);
    let resolved = pathModule_2.resolve(t),
      l = { persistent: options.persistent };
    if (!e) e = I;
    let h;
    if (options.usePolling) {
      let f = options.interval !== options.binaryInterval;
      ((l.interval = f && Mt(base) ? options.binaryInterval : options.interval),
        (h = jt(t, resolved, l, { listener: e, rawEmitter: this.fsw._emitRaw, folderStamp: i })));
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
    let dir = pathModule_2.dirname(t),
      base = pathModule_2.basename(t),
      _getWatchedDir = this.fsw._getWatchedDir(dir),
      o = e;
    if (_getWatchedDir.has(base)) return;
    let n = async (h, f) => {
        if (!this.fsw._throttle(WATCH, t, 5)) return;
        if (!f || f.mtimeMs === 0)
          try {
            let c = await stat_4(t);
            if (this.fsw.closed) return;
            let { atimeMs: atimeMs, mtimeMs: mtimeMs } = c;
            if (!atimeMs || atimeMs <= mtimeMs || mtimeMs !== o.mtimeMs) this.fsw._emit(y.CHANGE, t, c);
            if ((At || Wt || Nt) && o.ino !== c.ino) {
              (this.fsw._closeFile(t), (o = c));
              let _watchWithNodeFs = this._watchWithNodeFs(t, n);
              if (_watchWithNodeFs) this.fsw._addPathCloser(t, _watchWithNodeFs);
            } else o = c;
          } catch (error) {
            this.fsw._remove(dir, base);
          }
        else if (_getWatchedDir.has(base)) {
          let { atimeMs: atimeMs, mtimeMs: mtimeMs } = f;
          if (!atimeMs || atimeMs <= mtimeMs || mtimeMs !== o.mtimeMs) this.fsw._emit(y.CHANGE, t, f);
          o = f;
        }
      },
      _watchWithNodeFs = this._watchWithNodeFs(t, n);
    if (!(i && this.fsw.options.ignoreInitial) && this.fsw._isntIgnored(t)) {
      if (!this.fsw._throttle(y.ADD, t, 0)) return;
      this.fsw._emit(y.ADD, t, e);
    }
    return _watchWithNodeFs;
  }
  async _handleSymlink(t, e, i, s) {
    if (this.fsw.closed) return;
    let fullPath = t.fullPath,
      _getWatchedDir = this.fsw._getWatchedDir(e);
    if (!this.fsw.options.followSymlinks) {
      this.fsw._incrReadyCount();
      let o;
      try {
        o = await realpath_2(i);
      } catch (error) {
        return (this.fsw._emitReady(), !0);
      }
      if (this.fsw.closed) return;
      if (_getWatchedDir.has(s)) {
        if (this.fsw._symlinkPaths.get(fullPath) !== o)
          (this.fsw._symlinkPaths.set(fullPath, o), this.fsw._emit(y.CHANGE, i, t.stats));
      } else
        (_getWatchedDir.add(s), this.fsw._symlinkPaths.set(fullPath, o), this.fsw._emit(y.ADD, i, t.stats));
      return (this.fsw._emitReady(), !0);
    }
    if (this.fsw._symlinkPaths.has(fullPath)) return !0;
    this.fsw._symlinkPaths.set(fullPath, !0);
  }
  _handleRead(t, e, i, s, r, a, o) {
    if (((t = pathModule_2.join(t, "")), (o = this.fsw._throttle("readdir", t, 1000)), !o)) return;
    let _getWatchedDir = this.fsw._getWatchedDir(i.path),
      l = new Set(),
      _readdirp = this.fsw._readdirp(t, {
        fileFilter: (f) => i.filterPath(f),
        directoryFilter: (f) => i.filterDir(f),
      });
    if (!_readdirp) return;
    return (
      _readdirp
        .on(DATA, async (f) => {
          if (this.fsw.closed) {
            _readdirp = void 0;
            return;
          }
          let path = f.path,
            joined = pathModule_2.join(t, path);
          if ((l.add(path), f.stats.isSymbolicLink() && (await this._handleSymlink(f, t, joined, path))))
            return;
          if (this.fsw.closed) {
            _readdirp = void 0;
            return;
          }
          if (path === s || (!s && !_getWatchedDir.has(path)))
            (this.fsw._incrReadyCount(),
              (joined = pathModule_2.join(r, pathModule_2.relative(r, joined))),
              this._addToNodeFs(joined, e, i, a + 1));
        })
        .on(y.ERROR, this._boundHandleError),
      new Promise((f, c) => {
        if (!_readdirp) return c();
        _readdirp.once(END, () => {
          if (this.fsw.closed) {
            _readdirp = void 0;
            return;
          }
          let u = o ? o.clear() : !1;
          if (
            (f(void 0),
            _getWatchedDir
              .getChildren()
              .filter((w) => w !== t && !l.has(w))
              .forEach((w) => {
                this.fsw._remove(t, w);
              }),
            (_readdirp = void 0),
            u)
          )
            this._handleRead(t, !1, i, s, r, a, o);
        });
      })
    );
  }
  async _handleDir(t, e, i, s, r, a, o) {
    let _getWatchedDir = this.fsw._getWatchedDir(pathModule_2.dirname(t)),
      l = _getWatchedDir.has(pathModule_2.basename(t));
    if (!(i && this.fsw.options.ignoreInitial) && !r && !l) this.fsw._emit(y.ADD_DIR, t, e);
    (_getWatchedDir.add(pathModule_2.basename(t)), this.fsw._getWatchedDir(t));
    let h,
      f,
      depth = this.fsw.options.depth;
    if ((depth == null || s <= depth) && !this.fsw._symlinkPaths.has(o)) {
      if (!r) {
        if ((await this._handleRead(t, i, a, r, t, s, h), this.fsw.closed)) return;
      }
      f = this._watchWithNodeFs(
        t,
        (u, w) => {
          if (w && w.mtimeMs === 0) return;
          this._handleRead(u, !1, a, r, t, s, h);
        },
        e ? A(e) : null,
      );
    }
    return f;
  }
  async _addToNodeFs(t, e, i, s, r) {
    let _emitReady = this.fsw._emitReady;
    if (this.fsw._isIgnored(t) || this.fsw.closed) return (_emitReady(), !1);
    let _getWatchHelpers = this.fsw._getWatchHelpers(t);
    if (i)
      ((_getWatchHelpers.filterPath = (n) => i.filterPath(n)),
        (_getWatchHelpers.filterDir = (n) => i.filterDir(n)));
    try {
      let n = await kt[_getWatchHelpers.statMethod](_getWatchHelpers.watchPath);
      if (this.fsw.closed) return;
      if (this.fsw._isIgnored(_getWatchHelpers.watchPath, n)) return (_emitReady(), !1);
      let followSymlinks = this.fsw.options.followSymlinks,
        h;
      if (n.isDirectory()) {
        let resolved = pathModule_2.resolve(t),
          c = followSymlinks ? await realpath_2(t) : t;
        if (this.fsw.closed) return;
        if (
          ((h = await this._handleDir(_getWatchHelpers.watchPath, n, e, s, r, _getWatchHelpers, c)),
          this.fsw.closed)
        )
          return;
        if (resolved !== c && c !== void 0) this.fsw._symlinkPaths.set(resolved, c);
      } else if (n.isSymbolicLink()) {
        let f = followSymlinks ? await realpath_2(t) : t;
        if (this.fsw.closed) return;
        let dir = pathModule_2.dirname(_getWatchHelpers.watchPath);
        if (
          (this.fsw._getWatchedDir(dir).add(_getWatchHelpers.watchPath),
          this.fsw._emit(y.ADD, _getWatchHelpers.watchPath, n),
          (h = await this._handleDir(dir, n, e, s, t, _getWatchHelpers, f)),
          this.fsw.closed)
        )
          return;
        if (f !== void 0) this.fsw._symlinkPaths.set(pathModule_2.resolve(t), f);
      } else h = this._handleFile(_getWatchHelpers.watchPath, n, e);
      if ((_emitReady(), h)) this.fsw._addPathCloser(t, h);
      return !1;
    } catch (error) {
      if (this.fsw._handleError(error)) return (_emitReady(), t);
    }
  }
}

export { I, it, m, H, nt, F, CLOSE, END };

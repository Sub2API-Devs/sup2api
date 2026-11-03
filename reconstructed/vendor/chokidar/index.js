/**
 * chokidar/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: chokidar@6.0.0
 * pieces: chunk-3gvas51j.js (14)
 * attribution: placement 14
 */
import * as pathModule from "path";
import * as pathModule_2 from "path";
import { readdir, readdir as readdir_2, stat as stat_2, stat as stat_3, stat as stat_4 } from "fs/promises";
import { EventEmitter } from "events";
import { stat } from "fs";
import { I, it, m, H, nt, F, CLOSE, END } from "./runtime.js";
import { X } from "../readdirp/esm/index.js";

//@ chunk-3gvas51j.js:13133-13249 placement
var j = "/",
  Bt = "//",
  ft = ".",
  $t = "..",
  STRING = "string",
  Jt = /\\/g,
  ot = /\/\//,
  Qt = /\..*\.(sw[px])$|~$|\.subl.*\.tmp/,
  Xt = /^\.[/\\]/;
//@ chunk-3gvas51j.js:13249-13293 placement
function N(t) {
  return Array.isArray(t) ? t : [t];
}
//@ chunk-3gvas51j.js:13293-13358 placement
var Y = (t) => typeof t === "object" && t !== null && !(t instanceof RegExp);
/**
 * anymatch 匹配器
 */
//@ chunk-3gvas51j.js:13358-13684 placement
function createMatcher(t) {
  if (typeof t === "function") return t;
  if (typeof t === "string") return (e) => t === e;
  if (t instanceof RegExp) return (e) => t.test(e);
  if (typeof t === "object" && t !== null)
    return (e) => {
      if (t.path === e) return !0;
      if (t.recursive) {
        let relativePath = pathModule.relative(t.path, e);
        if (!relativePath) return !1;
        return !relativePath.startsWith("..") && !pathModule.isAbsolute(relativePath);
      }
      return !1;
    };
  return () => !1;
}
/**
 * 规范化路径
 */
//@ chunk-3gvas51j.js:13684-13900 placement
function normalizePath(t) {
  if (typeof t !== "string") throw Error("string expected");
  ((t = pathModule.normalize(t)), (t = t.replace(/\\/g, "/")));
  let e = !1;
  if (t.startsWith("//")) e = !0;
  let i = /\/\//;
  while (t.match(i)) t = t.replace(i, "/");
  if (e) t = "/" + t;
  return t;
}
//@ chunk-3gvas51j.js:13900-13998 placement
function at(t, e, i) {
  let s = normalizePath(e);
  for (let r = 0; r < t.length; r++) {
    let a = t[r];
    if (a(s, i)) return !0;
  }
  return !1;
}
/**
 * anymatch
 */
//@ chunk-3gvas51j.js:13998-14154 placement
function anymatch(t, e) {
  if (t == null) throw TypeError("anymatch: specify first argument");
  let mapped = N(t).map((r) => createMatcher(r));
  if (e == null) return (r, a) => at(mapped, r, a);
  return at(mapped, e);
}
/**
 * 规范化监视路径
 */
//@ chunk-3gvas51j.js:14154-14624 placement
var unifyPaths = (t) => {
    let flat = N(t).flat();
    if (!flat.every((i) => typeof i === STRING))
      throw TypeError(`Non-string provided as watch path: ${flat}`);
    return flat.map(dt);
  },
  ct = (t) => {
    let replaced = t.replace(Jt, j),
      i = !1;
    if (replaced.startsWith(Bt)) i = !0;
    while (replaced.match(ot)) replaced = replaced.replace(ot, j);
    if (i) replaced = j + replaced;
    return replaced;
  },
  dt = (t) => ct(pathModule.normalize(ct(t))),
  lt =
    (t = "") =>
    (e) => {
      if (typeof e === "string") return dt(pathModule.isAbsolute(e) ? e : pathModule.join(t, e));
      else return e;
    },
  se = (t, e) => {
    if (pathModule.isAbsolute(t)) return t;
    return pathModule.join(e, t);
  },
  freeze = Object.freeze(new Set());
/**
 * chokidar DirEntry
 */
//@ chunk-3gvas51j.js:14624-15181 placement
class DirEntry {
  constructor(t, e) {
    ((this.path = t), (this._removeWatcher = e), (this.items = new Set()));
  }
  add(t) {
    let { items: items } = this;
    if (!items) return;
    if (t !== ft && t !== $t) items.add(t);
  }
  async remove(t) {
    let { items: items } = this;
    if (!items) return;
    if ((items.delete(t), items.size > 0)) return;
    let path = this.path;
    try {
      await readdir(path);
    } catch (error) {
      if (this._removeWatcher) this._removeWatcher(pathModule.dirname(path), pathModule.basename(path));
    }
  }
  has(t) {
    let { items: items } = this;
    if (!items) return;
    return items.has(t);
  }
  getChildren() {
    let { items: items } = this;
    if (!items) return [];
    return [...items.values()];
  }
  dispose() {
    (this.items.clear(),
      (this.path = ""),
      (this._removeWatcher = I),
      (this.items = freeze),
      Object.freeze(this));
  }
}
//@ chunk-3gvas51j.js:15181-15206 placement
var STAT = "stat",
  LSTAT = "lstat";
/**
 * chokidar WatchHelper
 */
//@ chunk-3gvas51j.js:15206-15767 placement
class WatchHelper {
  constructor(t, e, i) {
    this.fsw = i;
    let s = t;
    ((this.path = t = t.replace(Xt, "")),
      (this.watchPath = s),
      (this.fullWatchPath = pathModule.resolve(s)),
      (this.dirParts = []),
      this.dirParts.forEach((dirPart) => {
        if (dirPart.length > 1) dirPart.pop();
      }),
      (this.followSymlinks = e),
      (this.statMethod = e ? STAT : LSTAT));
  }
  entryPath(t) {
    return pathModule.join(this.watchPath, pathModule.relative(this.watchPath, t.fullPath));
  }
  filterPath(t) {
    let { stats: stats } = t;
    if (stats && stats.isSymbolicLink()) return this.filterDir(t);
    let entryPath = this.entryPath(t);
    return this.fsw._isntIgnored(entryPath, stats) && this.fsw._hasReadPermissions(stats);
  }
  filterDir(t) {
    return this.fsw._isntIgnored(this.entryPath(t), t.stats);
  }
}
/**
 * chokidar FSWatcher
 */
//@ chunk-3gvas51j.js:15767-23630 placement
class FSWatcher extends EventEmitter {
  constructor(t = {}) {
    super();
    ((this.closed = !1),
      (this._closers = new Map()),
      (this._ignoredPaths = new Set()),
      (this._throttled = new Map()),
      (this._streams = new Set()),
      (this._symlinkPaths = new Map()),
      (this._watched = new Map()),
      (this._pendingWrites = new Map()),
      (this._pendingUnlinks = new Map()),
      (this._readyCount = 0),
      (this._readyEmitted = !1));
    let awaitWriteFinish = t.awaitWriteFinish,
      i = { stabilityThreshold: 2000, pollInterval: 100 },
      s = {
        persistent: !0,
        ignoreInitial: !1,
        ignorePermissionErrors: !1,
        interval: 100,
        binaryInterval: 300,
        followSymlinks: !0,
        usePolling: !1,
        atomic: !0,
        ...t,
        ignored: t.ignored ? N(t.ignored) : N([]),
        awaitWriteFinish:
          awaitWriteFinish === !0
            ? i
            : typeof awaitWriteFinish === "object"
              ? { ...i, ...awaitWriteFinish }
              : !1,
      };
    if (it) s.usePolling = !0;
    if (s.atomic === void 0) s.atomic = !s.usePolling;
    let envChokidarUsepolling = process.env.CHOKIDAR_USEPOLLING;
    if (envChokidarUsepolling !== void 0) {
      let lower = envChokidarUsepolling.toLowerCase();
      if (lower === "false" || lower === "0") s.usePolling = !1;
      else if (lower === "true" || lower === "1") s.usePolling = !0;
      else s.usePolling = !!lower;
    }
    let envChokidarInterval = process.env.CHOKIDAR_INTERVAL;
    if (envChokidarInterval) s.interval = Number.parseInt(envChokidarInterval, 10);
    let o = 0;
    ((this._emitReady = () => {
      if ((o++, o >= this._readyCount))
        ((this._emitReady = I), (this._readyEmitted = !0), process.nextTick(() => this.emit(m.READY)));
    }),
      (this._emitRaw = (...n) => this.emit(m.RAW, ...n)),
      (this._boundRemove = this._remove.bind(this)),
      (this.options = s),
      (this._nodeFsHandler = new H(this)),
      Object.freeze(s));
  }
  _addIgnoredPath(t) {
    if (Y(t)) {
      for (let _ignoredPath of this._ignoredPaths)
        if (Y(_ignoredPath) && _ignoredPath.path === t.path && _ignoredPath.recursive === t.recursive) return;
    }
    this._ignoredPaths.add(t);
  }
  _removeIgnoredPath(t) {
    if ((this._ignoredPaths.delete(t), typeof t === "string")) {
      for (let _ignoredPath of this._ignoredPaths)
        if (Y(_ignoredPath) && _ignoredPath.path === t) this._ignoredPaths.delete(_ignoredPath);
    }
  }
  add(t, e, i) {
    let { cwd: cwd } = this.options;
    ((this.closed = !1), (this._closePromise = void 0));
    let r = unifyPaths(t);
    if (cwd) r = r.map((a) => se(a, cwd));
    if (
      (r.forEach((a) => {
        this._removeIgnoredPath(a);
      }),
      (this._userIgnored = void 0),
      !this._readyCount)
    )
      this._readyCount = 0;
    return (
      (this._readyCount += r.length),
      Promise.all(
        r.map(async (a) => {
          let _addToNodeFs = await this._nodeFsHandler._addToNodeFs(a, !i, void 0, 0, e);
          if (_addToNodeFs) this._emitReady();
          return _addToNodeFs;
        }),
      ).then((a) => {
        if (this.closed) return;
        a.forEach((o) => {
          if (o) this.add(pathModule.dirname(o), pathModule.basename(e || o));
        });
      }),
      this
    );
  }
  unwatch(t) {
    if (this.closed) return this;
    let e = unifyPaths(t),
      { cwd: cwd } = this.options;
    return (
      e.forEach((s) => {
        if (!pathModule.isAbsolute(s) && !this._closers.has(s)) {
          if (cwd) s = pathModule.join(cwd, s);
          s = pathModule.resolve(s);
        }
        if ((this._closePath(s), this._addIgnoredPath(s), this._watched.has(s)))
          this._addIgnoredPath({ path: s, recursive: !0 });
        this._userIgnored = void 0;
      }),
      this
    );
  }
  close() {
    if (this._closePromise) return this._closePromise;
    ((this.closed = !0), this.removeAllListeners());
    let t = [];
    return (
      this._closers.forEach((_closer) =>
        _closer.forEach((i) => {
          let s = i();
          if (s instanceof Promise) t.push(s);
        }),
      ),
      this._streams.forEach((_stream) => _stream.destroy()),
      (this._userIgnored = void 0),
      (this._readyCount = 0),
      (this._readyEmitted = !1),
      this._watched.forEach((e) => e.dispose()),
      this._closers.clear(),
      this._watched.clear(),
      this._streams.clear(),
      this._symlinkPaths.clear(),
      this._throttled.clear(),
      (this._closePromise = t.length
        ? Promise.all(t).then(() => {
            return;
          })
        : Promise.resolve()),
      this._closePromise
    );
  }
  getWatched() {
    let t = {};
    return (
      this._watched.forEach((e, i) => {
        let r = (this.options.cwd ? pathModule.relative(this.options.cwd, i) : i) || ft;
        t[r] = e.getChildren().sort();
      }),
      t
    );
  }
  setPollInterval(t) {
    if (
      ((this.options = Object.freeze({ ...this.options, interval: t, binaryInterval: t })),
      this.options.usePolling)
    )
      nt(this._emitRaw, t);
  }
  emitWithAll(t, e) {
    if ((this.emit(t, ...e), t !== m.ERROR)) this.emit(m.ALL, t, ...e);
  }
  async _emit(t, e, i) {
    if (this.closed) return;
    let options = this.options;
    if (F) e = pathModule.normalize(e);
    if (options.cwd) e = pathModule.relative(options.cwd, e);
    let r = [e];
    if (i != null) r.push(i);
    let awaitWriteFinish = options.awaitWriteFinish,
      o;
    if (awaitWriteFinish && (o = this._pendingWrites.get(e))) return ((o.lastChange = new Date()), this);
    if (options.atomic) {
      if (t === m.UNLINK)
        return (
          this._pendingUnlinks.set(e, [t, ...r]),
          setTimeout(
            () => {
              this._pendingUnlinks.forEach((_pendingUnlink, l) => {
                (this.emit(..._pendingUnlink),
                  this.emit(m.ALL, ..._pendingUnlink),
                  this._pendingUnlinks.delete(l));
              });
            },
            typeof options.atomic === "number" ? options.atomic : 100,
          ),
          this
        );
      if (t === m.ADD && this._pendingUnlinks.has(e)) ((t = m.CHANGE), this._pendingUnlinks.delete(e));
    }
    if (awaitWriteFinish && (t === m.ADD || t === m.CHANGE) && this._readyEmitted) {
      let n = (l, h) => {
        if (this.closed) return;
        if (l) {
          if (this.listenerCount(m.ERROR) === 0) {
            this._pendingWrites.delete(e);
            return;
          }
          ((t = m.ERROR), (r[0] = l), this.emitWithAll(t, r));
        } else if (h) {
          if (r.length > 1) r[1] = h;
          else r.push(h);
          this.emitWithAll(t, r);
        }
      };
      return (this._awaitWriteFinish(e, awaitWriteFinish.stabilityThreshold, t, n), this);
    }
    if (t === m.CHANGE) {
      if (!this._throttle(m.CHANGE, e, 50)) return this;
    }
    if (options.alwaysStat && i === void 0 && (t === m.ADD || t === m.ADD_DIR || t === m.CHANGE)) {
      let n = options.cwd ? pathModule.join(options.cwd, e) : e,
        l;
      try {
        l = await stat_2(n);
      } catch (error) {}
      if (!l || this.closed) return;
      r.push(l);
    }
    return (this.emitWithAll(t, r), this);
  }
  _handleError(t) {
    let e = t && t.code;
    if (
      t &&
      !this.closed &&
      this.listenerCount(m.ERROR) > 0 &&
      e !== "ENOENT" &&
      e !== "ENOTDIR" &&
      (!this.options.ignorePermissionErrors || (e !== "EPERM" && e !== "EACCES"))
    )
      this.emit(m.ERROR, t);
    return t || this.closed;
  }
  _throttle(t, e, i) {
    if (!this._throttled.has(t)) this._throttled.set(t, new Map());
    let s = this._throttled.get(t);
    if (!s) throw Error("invalid throttle");
    let r = s.get(e);
    if (r) return (r.count++, !1);
    let a,
      o = () => {
        let l = s.get(e),
          h = l ? l.count : 0;
        if ((s.delete(e), clearTimeout(a), l)) clearTimeout(l.timeoutObject);
        return h;
      };
    a = setTimeout(o, i);
    let n = { timeoutObject: a, clear: o, count: 0 };
    return (s.set(e, n), n);
  }
  _incrReadyCount() {
    return this._readyCount++;
  }
  _awaitWriteFinish(t, e, i, s) {
    let awaitWriteFinish = this.options.awaitWriteFinish;
    if (typeof awaitWriteFinish !== "object") return;
    let pollInterval = awaitWriteFinish.pollInterval,
      o,
      n = t;
    if (this.options.cwd && !pathModule.isAbsolute(t)) n = pathModule.join(this.options.cwd, t);
    let date = new Date(),
      _pendingWrites = this._pendingWrites;
    function f(c) {
      stat(n, (u, w) => {
        if (u || !_pendingWrites.has(t)) {
          if (u && u.code !== "ENOENT") s(u);
          return;
        }
        let E = Number(new Date());
        if (c && w.size !== c.size) _pendingWrites.get(t).lastChange = E;
        let R = _pendingWrites.get(t);
        if (E - R.lastChange >= e) (_pendingWrites.delete(t), s(void 0, w));
        else o = setTimeout(f, pollInterval, w);
      });
    }
    if (!_pendingWrites.has(t))
      (_pendingWrites.set(t, {
        lastChange: date,
        cancelWait: () => (_pendingWrites.delete(t), clearTimeout(o), i),
      }),
        (o = setTimeout(f, pollInterval)));
  }
  _isIgnored(t, e) {
    if (this.options.atomic && Qt.test(t)) return !0;
    if (!this._userIgnored) {
      let { cwd: cwd } = this.options,
        mapped = (this.options.ignored || []).map(lt(cwd)),
        o = [...[...this._ignoredPaths].map(lt(cwd)), ...mapped];
      this._userIgnored = anymatch(o, void 0);
    }
    return this._userIgnored(t, e);
  }
  _isntIgnored(t, e) {
    return !this._isIgnored(t, e);
  }
  _getWatchHelpers(t) {
    return new WatchHelper(t, this.options.followSymlinks, this);
  }
  _getWatchedDir(t) {
    let resolved = pathModule.resolve(t);
    if (!this._watched.has(resolved)) this._watched.set(resolved, new DirEntry(resolved, this._boundRemove));
    return this._watched.get(resolved);
  }
  _hasReadPermissions(t) {
    if (this.options.ignorePermissionErrors) return !0;
    return Boolean(Number(t.mode) & 256);
  }
  _remove(t, e, i) {
    let s = [{ directory: t, item: e, isDirectory: i, path: "", fullPath: "", expanded: !1 }];
    while (s.length > 0) {
      let r = s[s.length - 1];
      if (!r.expanded) {
        r.expanded = !0;
        let joined = pathModule.join(r.directory, r.item),
          resolved = pathModule.resolve(joined);
        if (
          ((r.path = joined),
          (r.fullPath = resolved),
          (r.isDirectory =
            r.isDirectory != null ? r.isDirectory : this._watched.has(joined) || this._watched.has(resolved)),
          !this._throttle("remove", joined, 100))
        ) {
          s.pop();
          continue;
        }
        if (!r.isDirectory && this._watched.size === 1) this.add(r.directory, r.item, !0);
        let children = this._getWatchedDir(joined).getChildren();
        for (let R = children.length - 1; R >= 0; R--)
          s.push({
            directory: joined,
            item: children[R],
            isDirectory: void 0,
            path: "",
            fullPath: "",
            expanded: !1,
          });
        continue;
      }
      s.pop();
      let { path: path, fullPath: fullPath } = r,
        _getWatchedDir = this._getWatchedDir(r.directory),
        l = _getWatchedDir.has(r.item);
      if ((_getWatchedDir.remove(r.item), this._symlinkPaths.has(fullPath)))
        this._symlinkPaths.delete(fullPath);
      let h = path;
      if (this.options.cwd) h = pathModule.relative(this.options.cwd, path);
      if (this.options.awaitWriteFinish && this._pendingWrites.has(h)) {
        if (this._pendingWrites.get(h).cancelWait() === m.ADD) continue;
      }
      (this._watched.delete(path), this._watched.delete(fullPath));
      let f = r.isDirectory ? m.UNLINK_DIR : m.UNLINK;
      if (l && !this._isIgnored(path)) this._emit(f, path);
      this._closePath(path);
    }
  }
  _closePath(t) {
    this._closeFile(t);
    let dir = pathModule.dirname(t);
    this._getWatchedDir(dir).remove(pathModule.basename(t));
  }
  _closeFile(t) {
    let e = this._closers.get(t);
    if (!e) return;
    (e.forEach((i) => i()), this._closers.delete(t));
  }
  _addPathCloser(t, e) {
    if (!e) return;
    let i = this._closers.get(t);
    if (!i) ((i = []), this._closers.set(t, i));
    i.push(e);
  }
  _readdirp(t, e) {
    if (this.closed) return;
    let i = { type: m.ALL, alwaysStat: !0, lstat: !0, ...e, depth: 0 },
      s = X(t, i);
    return (
      this._streams.add(s),
      s.once(CLOSE, () => {
        s = void 0;
      }),
      s.once(END, () => {
        if (s) (this._streams.delete(s), (s = void 0));
      }),
      s
    );
  }
}
//@ chunk-3gvas51j.js:23630-23683 placement
function oe(t, e = {}) {
  let i = new FSWatcher(e);
  return (i.add(t), i);
}
//@ chunk-3gvas51j.js:23683-23713 placement
var Ok = { watch: oe, FSWatcher: FSWatcher };

export { Ok };

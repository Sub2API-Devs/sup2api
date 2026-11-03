/**
 * chokidar/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: chokidar@6.0.0
 * pieces: chunk-3gvas51j.js (14)
 * attribution: placement 14
 */
import "path";
import * as pathModule_2 from "path";
import { readdir, stat as stat_2 } from "fs/promises";
import { EventEmitter } from "events";
import { stat } from "fs";
import { I, it, m, H, nt, F, CLOSE, END } from "./runtime.js";
import { X } from "../readdirp/esm/index.js";

//@ chunk-3gvas51j.js:13133-13249 placement
var j = "/";
var Bt = "//";
var ft = ".";
var $t = "..";
var STRING = "string";
var Jt = /\\/g;
var ot = /\/\//;
var Qt = /\..*\.(sw[px])$|~$|\.subl.*\.tmp/;
var Xt = /^\.[/\\]/;
//@ chunk-3gvas51j.js:13249-13293 placement
function arrify(item) {
  return Array.isArray(item) ? item : [item];
}
//@ chunk-3gvas51j.js:13293-13358 placement
var Y = (t) => typeof t === "object" && t !== null && !(t instanceof RegExp);
//@ chunk-3gvas51j.js:13358-13684 placement
/**
 * anymatch 匹配器
 */
function createMatcher(t) {
  if (typeof t === "function") return t;
  if (typeof t === "string") return (e) => t === e;
  if (t instanceof RegExp) return (e) => t.test(e);
  if (typeof t === "object" && t !== null)
    return (e) => {
      if (t.path === e) return true;
      if (t.recursive) {
        let relativePath = pathModule_2.relative(t.path, e);
        if (!relativePath) return false;
        return !relativePath.startsWith("..") && !pathModule_2.isAbsolute(relativePath);
      }
      return false;
    };
  return () => false;
}
//@ chunk-3gvas51j.js:13684-13900 placement
/**
 * 规范化路径
 */
function normalizePath(t) {
  if (typeof t !== "string") throw Error("string expected");
  t = pathModule_2.normalize(t);
  t = t.replace(/\\/g, "/");
  let e = false;
  if (t.startsWith("//")) e = true;
  let i = /\/\//;
  while (t.match(i)) t = t.replace(i, "/");
  if (e) t = "/" + t;
  return t;
}
//@ chunk-3gvas51j.js:13900-13998 placement
function at(t, e, i) {
  let s = normalizePath(e);
  for (let idx = 0; idx < t.length; idx++) {
    let a = t[idx];
    if (a(s, i)) return true;
  }
  return false;
}
//@ chunk-3gvas51j.js:13998-14154 placement
/**
 * anymatch
 */
function anymatch(t, e) {
  if (t == null) throw TypeError("anymatch: specify first argument");
  let mapped = arrify(t).map((r) => createMatcher(r));
  if (e == null) return (r, a) => at(mapped, r, a);
  return at(mapped, e);
}
//@ chunk-3gvas51j.js:14154-14624 placement
/**
 * 规范化监视路径
 */
var unifyPaths = (paths_) => {
  let paths = arrify(paths_).flat();
  if (!paths.every((path) => typeof path === STRING))
    throw TypeError(`Non-string provided as watch path: ${paths}`);
  return paths.map(dt);
};
var ct = (t) => {
  let replaced = t.replace(Jt, j);
  let i = false;
  if (replaced.startsWith(Bt)) i = true;
  while (replaced.match(ot)) replaced = replaced.replace(ot, j);
  if (i) replaced = j + replaced;
  return replaced;
};
var dt = (t) => ct(pathModule_2.normalize(ct(t)));
var lt =
  (cwd = "") =>
  (e) => {
    if (typeof e === "string") return dt(pathModule_2.isAbsolute(e) ? e : pathModule_2.join(cwd, e));
    else return e;
  };
var getAbsolutePath = (t, cwd) => {
  if (pathModule_2.isAbsolute(t)) return t;
  return pathModule_2.join(cwd, t);
};
var ie = Object.freeze(new Set());
//@ chunk-3gvas51j.js:14624-15181 placement
/**
 * chokidar DirEntry
 */
class DirEntry {
  constructor(path, _removeWatcher) {
    this.path = path;
    this._removeWatcher = _removeWatcher;
    this.items = new Set();
  }
  add(t) {
    let { items } = this;
    if (!items) return;
    if (t !== ft && t !== $t) items.add(t);
  }
  async remove(t) {
    let { items } = this;
    if (!items) return;
    items.delete(t);
    if (items.size > 0) return;
    let path = this.path;
    try {
      await readdir(path);
    } catch (error) {
      if (this._removeWatcher) this._removeWatcher(pathModule_2.dirname(path), pathModule_2.basename(path));
    }
  }
  has(t) {
    let { items } = this;
    if (!items) return;
    return items.has(t);
  }
  getChildren() {
    let { items } = this;
    if (!items) return [];
    return [...items.values()];
  }
  dispose() {
    this.items.clear();
    this.path = "";
    this._removeWatcher = I;
    this.items = ie;
    Object.freeze(this);
  }
}
//@ chunk-3gvas51j.js:15181-15206 placement
var STAT = "stat";
var LSTAT = "lstat";
//@ chunk-3gvas51j.js:15206-15767 placement
/**
 * chokidar WatchHelper
 */
class WatchHelper {
  constructor(t, followSymlinks, fsw) {
    this.fsw = fsw;
    let s = t;
    this.path = t = t.replace(Xt, "");
    this.watchPath = s;
    this.fullWatchPath = pathModule_2.resolve(s);
    this.dirParts = [];
    this.dirParts.forEach((dirPart) => {
      if (dirPart.length > 1) dirPart.pop();
    });
    this.followSymlinks = followSymlinks;
    this.statMethod = followSymlinks ? STAT : LSTAT;
  }
  entryPath(t) {
    return pathModule_2.join(this.watchPath, pathModule_2.relative(this.watchPath, t.fullPath));
  }
  filterPath(t) {
    let { stats } = t;
    if (stats && stats.isSymbolicLink()) return this.filterDir(t);
    let i = this.entryPath(t);
    return this.fsw._isntIgnored(i, stats) && this.fsw._hasReadPermissions(stats);
  }
  filterDir(t) {
    return this.fsw._isntIgnored(this.entryPath(t), t.stats);
  }
}
//@ chunk-3gvas51j.js:15767-23630 placement
/**
 * chokidar FSWatcher
 */
class FSWatcher extends EventEmitter {
  constructor(options = {}) {
    super();
    this.closed = false;
    this._closers = new Map();
    this._ignoredPaths = new Set();
    this._throttled = new Map();
    this._streams = new Set();
    this._symlinkPaths = new Map();
    this._watched = new Map();
    this._pendingWrites = new Map();
    this._pendingUnlinks = new Map();
    this._readyCount = 0;
    this._readyEmitted = false;
    let awaitWriteFinish = options.awaitWriteFinish;
    let i = {
      stabilityThreshold: 2000,
      pollInterval: 100,
    };
    let s = {
      persistent: true,
      ignoreInitial: false,
      ignorePermissionErrors: false,
      interval: 100,
      binaryInterval: 300,
      followSymlinks: true,
      usePolling: false,
      atomic: true,
      ...options,
      ignored: options.ignored ? arrify(options.ignored) : arrify([]),
      awaitWriteFinish:
        awaitWriteFinish === true
          ? i
          : typeof awaitWriteFinish === "object"
            ? {
                ...i,
                ...awaitWriteFinish,
              }
            : false,
    };
    if (it) s.usePolling = true;
    if (s.atomic === undefined) s.atomic = !s.usePolling;
    let envChokidarUsepolling = process.env.CHOKIDAR_USEPOLLING;
    if (envChokidarUsepolling !== undefined) {
      let lower = envChokidarUsepolling.toLowerCase();
      if (lower === "false" || lower === "0") s.usePolling = false;
      else if (lower === "true" || lower === "1") s.usePolling = true;
      else s.usePolling = !!lower;
    }
    let envChokidarInterval = process.env.CHOKIDAR_INTERVAL;
    if (envChokidarInterval) s.interval = Number.parseInt(envChokidarInterval, 10);
    let o = 0;
    this._emitReady = () => {
      o++;
      if (o >= this._readyCount) {
        this._emitReady = I;
        this._readyEmitted = true;
        process.nextTick(() => this.emit(m.READY));
      }
    };
    this._emitRaw = (...n) => this.emit(m.RAW, ...n);
    this._boundRemove = this._remove.bind(this);
    this.options = s;
    this._nodeFsHandler = new H(this);
    Object.freeze(s);
  }
  _addIgnoredPath(t) {
    if (Y(t)) {
      for (let _ignoredPath of this._ignoredPaths)
        if (Y(_ignoredPath) && _ignoredPath.path === t.path && _ignoredPath.recursive === t.recursive) return;
    }
    this._ignoredPaths.add(t);
  }
  _removeIgnoredPath(t) {
    this._ignoredPaths.delete(t);
    if (typeof t === "string") {
      for (let _ignoredPath of this._ignoredPaths)
        if (Y(_ignoredPath) && _ignoredPath.path === t) this._ignoredPaths.delete(_ignoredPath);
    }
  }
  add(paths_, e, i) {
    let { cwd } = this.options;
    this.closed = false;
    this._closePromise = undefined;
    let r = unifyPaths(paths_);
    if (cwd) r = r.map((a) => getAbsolutePath(a, cwd));
    r.forEach((a) => {
      this._removeIgnoredPath(a);
    });
    this._userIgnored = undefined;
    if (!this._readyCount) this._readyCount = 0;
    this._readyCount += r.length;
    Promise.all(
      r.map(async (a) => {
        let o = await this._nodeFsHandler._addToNodeFs(a, !i, undefined, 0, e);
        if (o) this._emitReady();
        return o;
      }),
    ).then((a) => {
      if (this.closed) return;
      a.forEach((o) => {
        if (o) this.add(pathModule_2.dirname(o), pathModule_2.basename(e || o));
      });
    });
    return this;
  }
  unwatch(paths_) {
    if (this.closed) return this;
    let e = unifyPaths(paths_);
    let { cwd } = this.options;
    e.forEach((s) => {
      if (!pathModule_2.isAbsolute(s) && !this._closers.has(s)) {
        if (cwd) s = pathModule_2.join(cwd, s);
        s = pathModule_2.resolve(s);
      }
      this._closePath(s);
      this._addIgnoredPath(s);
      if (this._watched.has(s))
        this._addIgnoredPath({
          path: s,
          recursive: true,
        });
      this._userIgnored = undefined;
    });
    return this;
  }
  close() {
    if (this._closePromise) return this._closePromise;
    this.closed = true;
    this.removeAllListeners();
    let t = [];
    this._closers.forEach((_closer) =>
      _closer.forEach((i) => {
        let s = i();
        if (s instanceof Promise) t.push(s);
      }),
    );
    this._streams.forEach((_stream) => _stream.destroy());
    this._userIgnored = undefined;
    this._readyCount = 0;
    this._readyEmitted = false;
    this._watched.forEach((e) => e.dispose());
    this._closers.clear();
    this._watched.clear();
    this._streams.clear();
    this._symlinkPaths.clear();
    this._throttled.clear();
    this._closePromise = t.length
      ? Promise.all(t).then(() => {
          return;
        })
      : Promise.resolve();
    return this._closePromise;
  }
  getWatched() {
    let t = {};
    this._watched.forEach((e, i) => {
      let r = (this.options.cwd ? pathModule_2.relative(this.options.cwd, i) : i) || ft;
      t[r] = e.getChildren().sort();
    });
    return t;
  }
  setPollInterval(t) {
    this.options = Object.freeze({
      ...this.options,
      interval: t,
      binaryInterval: t,
    });
    if (this.options.usePolling) nt(this._emitRaw, t);
  }
  emitWithAll(t, e) {
    this.emit(t, ...e);
    if (t !== m.ERROR) this.emit(m.ALL, t, ...e);
  }
  async _emit(t, e, i) {
    if (this.closed) return;
    let options = this.options;
    if (F) e = pathModule_2.normalize(e);
    if (options.cwd) e = pathModule_2.relative(options.cwd, e);
    let r = [e];
    if (i != null) r.push(i);
    let awaitWriteFinish = options.awaitWriteFinish;
    let o;
    if (awaitWriteFinish && (o = this._pendingWrites.get(e))) {
      o.lastChange = new Date();
      return this;
    }
    if (options.atomic) {
      if (t === m.UNLINK) {
        this._pendingUnlinks.set(e, [t, ...r]);
        setTimeout(
          () => {
            this._pendingUnlinks.forEach((_pendingUnlink, l) => {
              this.emit(..._pendingUnlink);
              this.emit(m.ALL, ..._pendingUnlink);
              this._pendingUnlinks.delete(l);
            });
          },
          typeof options.atomic === "number" ? options.atomic : 100,
        );
        return this;
      }
      if (t === m.ADD && this._pendingUnlinks.has(e)) {
        t = m.CHANGE;
        this._pendingUnlinks.delete(e);
      }
    }
    if (awaitWriteFinish && (t === m.ADD || t === m.CHANGE) && this._readyEmitted) {
      let n = (l, h) => {
        if (this.closed) return;
        if (l) {
          if (this.listenerCount(m.ERROR) === 0) {
            this._pendingWrites.delete(e);
            return;
          }
          t = m.ERROR;
          r[0] = l;
          this.emitWithAll(t, r);
        } else if (h) {
          if (r.length > 1) r[1] = h;
          else r.push(h);
          this.emitWithAll(t, r);
        }
      };
      this._awaitWriteFinish(e, awaitWriteFinish.stabilityThreshold, t, n);
      return this;
    }
    if (t === m.CHANGE) {
      if (!this._throttle(m.CHANGE, e, 50)) return this;
    }
    if (options.alwaysStat && i === undefined && (t === m.ADD || t === m.ADD_DIR || t === m.CHANGE)) {
      let n = options.cwd ? pathModule_2.join(options.cwd, e) : e;
      let l;
      try {
        l = await stat_2(n);
      } catch (error) {}
      if (!l || this.closed) return;
      r.push(l);
    }
    this.emitWithAll(t, r);
    return this;
  }
  _handleError(t) {
    let code = t && t.code;
    if (
      t &&
      !this.closed &&
      this.listenerCount(m.ERROR) > 0 &&
      code !== "ENOENT" &&
      code !== "ENOTDIR" &&
      (!this.options.ignorePermissionErrors || (code !== "EPERM" && code !== "EACCES"))
    )
      this.emit(m.ERROR, t);
    return t || this.closed;
  }
  _throttle(t, e, i) {
    if (!this._throttled.has(t)) this._throttled.set(t, new Map());
    let s = this._throttled.get(t);
    if (!s) throw Error("invalid throttle");
    let r = s.get(e);
    if (r) {
      r.count++;
      return false;
    }
    let a;
    let o = () => {
      let l = s.get(e);
      let count = l ? l.count : 0;
      s.delete(e);
      clearTimeout(a);
      if (l) clearTimeout(l.timeoutObject);
      return count;
    };
    a = setTimeout(o, i);
    let n = {
      timeoutObject: a,
      clear: o,
      count: 0,
    };
    s.set(e, n);
    return n;
  }
  _incrReadyCount() {
    return this._readyCount++;
  }
  _awaitWriteFinish(t, e, i, s) {
    let awaitWriteFinish = this.options.awaitWriteFinish;
    if (typeof awaitWriteFinish !== "object") return;
    let pollInterval = awaitWriteFinish.pollInterval;
    let o;
    let n = t;
    if (this.options.cwd && !pathModule_2.isAbsolute(t)) n = pathModule_2.join(this.options.cwd, t);
    let lastChange = new Date();
    let _pendingWrites = this._pendingWrites;
    function f(c) {
      stat(n, (u, w) => {
        if (u || !_pendingWrites.has(t)) {
          if (u && u.code !== "ENOENT") s(u);
          return;
        }
        let E = Number(new Date());
        if (c && w.size !== c.size) _pendingWrites.get(t).lastChange = E;
        let R = _pendingWrites.get(t);
        if (E - R.lastChange >= e) {
          _pendingWrites.delete(t);
          s(undefined, w);
        } else o = setTimeout(f, pollInterval, w);
      });
    }
    if (!_pendingWrites.has(t)) {
      _pendingWrites.set(t, {
        lastChange,
        cancelWait: () => {
          _pendingWrites.delete(t);
          clearTimeout(o);
          return i;
        },
      });
      o = setTimeout(f, pollInterval);
    }
  }
  _isIgnored(t, e) {
    if (this.options.atomic && Qt.test(t)) return true;
    if (!this._userIgnored) {
      let { cwd } = this.options;
      let mapped = (this.options.ignored || []).map(lt(cwd));
      let o = [...[...this._ignoredPaths].map(lt(cwd)), ...mapped];
      this._userIgnored = anymatch(o, undefined);
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
    let path = pathModule_2.resolve(t);
    if (!this._watched.has(path)) this._watched.set(path, new DirEntry(path, this._boundRemove));
    return this._watched.get(path);
  }
  _hasReadPermissions(t) {
    if (this.options.ignorePermissionErrors) return true;
    return Boolean(Number(t.mode) & 256);
  }
  _remove(directory, item, isDirectory) {
    let s = [
      {
        directory,
        item,
        isDirectory,
        path: "",
        fullPath: "",
        expanded: false,
      },
    ];
    while (s.length > 0) {
      let r = s[s.length - 1];
      if (!r.expanded) {
        r.expanded = true;
        let joined = pathModule_2.join(r.directory, r.item);
        let resolved = pathModule_2.resolve(joined);
        r.path = joined;
        r.fullPath = resolved;
        r.isDirectory =
          r.isDirectory != null ? r.isDirectory : this._watched.has(joined) || this._watched.has(resolved);
        if (!this._throttle("remove", joined, 100)) {
          s.pop();
          continue;
        }
        if (!r.isDirectory && this._watched.size === 1) this.add(r.directory, r.item, true);
        let children = this._getWatchedDir(joined).getChildren();
        for (let idx = children.length - 1; idx >= 0; idx--)
          s.push({
            directory: joined,
            item: children[idx],
            isDirectory: undefined,
            path: "",
            fullPath: "",
            expanded: false,
          });
        continue;
      }
      s.pop();
      let { path, fullPath } = r;
      let n = this._getWatchedDir(r.directory);
      let l = n.has(r.item);
      n.remove(r.item);
      if (this._symlinkPaths.has(fullPath)) this._symlinkPaths.delete(fullPath);
      let h = path;
      if (this.options.cwd) h = pathModule_2.relative(this.options.cwd, path);
      if (this.options.awaitWriteFinish && this._pendingWrites.has(h)) {
        if (this._pendingWrites.get(h).cancelWait() === m.ADD) continue;
      }
      this._watched.delete(path);
      this._watched.delete(fullPath);
      let f = r.isDirectory ? m.UNLINK_DIR : m.UNLINK;
      if (l && !this._isIgnored(path)) this._emit(f, path);
      this._closePath(path);
    }
  }
  _closePath(t) {
    this._closeFile(t);
    let dir = pathModule_2.dirname(t);
    this._getWatchedDir(dir).remove(pathModule_2.basename(t));
  }
  _closeFile(t) {
    let e = this._closers.get(t);
    if (!e) return;
    e.forEach((i) => i());
    this._closers.delete(t);
  }
  _addPathCloser(t, e) {
    if (!e) return;
    let i = this._closers.get(t);
    if (!i) {
      i = [];
      this._closers.set(t, i);
    }
    i.push(e);
  }
  _readdirp(root, e) {
    if (this.closed) return;
    let options = {
      type: m.ALL,
      alwaysStat: true,
      lstat: true,
      ...e,
      depth: 0,
    };
    let s = X(root, options);
    this._streams.add(s);
    s.once(CLOSE, () => {
      s = undefined;
    });
    s.once(END, () => {
      if (s) {
        this._streams.delete(s);
        s = undefined;
      }
    });
    return s;
  }
}
//@ chunk-3gvas51j.js:23630-23683 placement
function watch(paths, options = {}) {
  let watcher = new FSWatcher(options);
  watcher.add(paths);
  return watcher;
}
//@ chunk-3gvas51j.js:23683-23713 placement
var chokidar_default = {
  watch,
  FSWatcher,
};
export { chokidar_default };

/**
 * chokidar/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: chokidar@6.0.0
 * pieces: chunk-k7sq4jmf.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import "path";
import * as pathModule_2 from "path";
import { readdir, stat as stat_2 } from "fs/promises";
import { EventEmitter } from "events";
import { stat } from "fs";
import { noop, isIBMi, EV, NodeFsHandler, setPollingInterval, isWindows, CLOSE, END } from "./runtime.js";
import { readdirp } from "../readdirp/esm/index.js";

//@ chunk-k7sq4jmf.js:13133-13249 placement
var SLASH = "/";
var SLASH_SLASH = "//";
var DOT = ".";
var DOT_DOT = "..";
var STRING = "string";
var BACKSLASH_GLOBAL_RE = /\\/g;
var DOUBLE_SLASH_RE = /\/\//;
var DOT_RE = /\..*\.(sw[px])$|~$|\.subl.*\.tmp/;
var DOT_PATH_RE = /^\.[/\\]/;
//@ chunk-k7sq4jmf.js:13249-13293 placement
function arrify(item) {
  return Array.isArray(item) ? item : [item];
}
//@ chunk-k7sq4jmf.js:13293-13358 placement
var isPlainObject = (value) => typeof value === "object" && value !== null && !(value instanceof RegExp);
//@ chunk-k7sq4jmf.js:13358-13684 placement
/**
 * anymatch 匹配器
 */
function createMatcher(matcher) {
  if (typeof matcher === "function") return matcher;
  if (typeof matcher === "string") return (path) => matcher === path;
  if (matcher instanceof RegExp) return (path) => matcher.test(path);
  if (typeof matcher === "object" && matcher !== null)
    return (path) => {
      if (matcher.path === path) return true;
      if (matcher.recursive) {
        let relativePath = pathModule_2.relative(matcher.path, path);
        if (!relativePath) return false;
        return !relativePath.startsWith("..") && !pathModule_2.isAbsolute(relativePath);
      }
      return false;
    };
  return () => false;
}
//@ chunk-k7sq4jmf.js:13684-13900 placement
/**
 * 规范化路径
 */
function normalizePath(path) {
  if (typeof path !== "string") throw Error("string expected");
  path = pathModule_2.normalize(path);
  path = path.replace(/\\/g, "/");
  let unc = false;
  if (path.startsWith("//")) unc = true;
  let DOUBLE_SLASH_RE = /\/\//;
  while (path.match(DOUBLE_SLASH_RE)) path = path.replace(DOUBLE_SLASH_RE, "/");
  if (unc) path = "/" + path;
  return path;
}
//@ chunk-k7sq4jmf.js:13900-13998 placement
function matchesAny(matchers, inputPath, stats) {
  let normalized = normalizePath(inputPath);
  for (let idx = 0; idx < matchers.length; idx++) {
    let matcher = matchers[idx];
    if (matcher(normalized, stats)) return true;
  }
  return false;
}
//@ chunk-k7sq4jmf.js:13998-14154 placement
/**
 * anymatch
 */
function anymatch(matchers, testString) {
  if (matchers == null) throw TypeError("anymatch: specify first argument");
  let matchers_2 = arrify(matchers).map((matcher) => createMatcher(matcher));
  if (testString == null) return (path, stats) => matchesAny(matchers_2, path, stats);
  return matchesAny(matchers_2, testString);
}
//@ chunk-k7sq4jmf.js:14154-14624 placement
/**
 * 规范化监视路径
 */
var unifyPaths = (paths_) => {
  let paths = arrify(paths_).flat();
  if (!paths.every((path) => typeof path === STRING))
    throw TypeError(`Non-string provided as watch path: ${paths}`);
  return paths.map(normalizePathDouble);
};
var normalizePathOnce = (path) => {
  let replaced = path.replace(BACKSLASH_GLOBAL_RE, SLASH);
  let isUNC = false;
  if (replaced.startsWith(SLASH_SLASH)) isUNC = true;
  while (replaced.match(DOUBLE_SLASH_RE)) replaced = replaced.replace(DOUBLE_SLASH_RE, SLASH);
  if (isUNC) replaced = SLASH + replaced;
  return replaced;
};
var normalizePathDouble = (path) => normalizePathOnce(pathModule_2.normalize(normalizePathOnce(path)));
var normalizeMatcherPath =
  (cwd = "") =>
  (path) => {
    if (typeof path === "string")
      return normalizePathDouble(pathModule_2.isAbsolute(path) ? path : pathModule_2.join(cwd, path));
    else return path;
  };
var getAbsolutePath = (path, cwd) => {
  if (pathModule_2.isAbsolute(path)) return path;
  return pathModule_2.join(cwd, path);
};
var EMPTY_SET = Object.freeze(new Set());
//@ chunk-k7sq4jmf.js:14624-15181 placement
/**
 * chokidar DirEntry
 */
class DirEntry {
  constructor(path, _removeWatcher) {
    this.path = path;
    this._removeWatcher = _removeWatcher;
    this.items = new Set();
  }
  add(child) {
    let { items } = this;
    if (!items) return;
    if (child !== DOT && child !== DOT_DOT) items.add(child);
  }
  async remove(child) {
    let { items } = this;
    if (!items) return;
    items.delete(child);
    if (items.size > 0) return;
    let path = this.path;
    try {
      await readdir(path);
    } catch (error) {
      if (this._removeWatcher) this._removeWatcher(pathModule_2.dirname(path), pathModule_2.basename(path));
    }
  }
  has(child) {
    let { items } = this;
    if (!items) return;
    return items.has(child);
  }
  getChildren() {
    let { items } = this;
    if (!items) return [];
    return [...items.values()];
  }
  dispose() {
    this.items.clear();
    this.path = "";
    this._removeWatcher = noop;
    this.items = EMPTY_SET;
    Object.freeze(this);
  }
}
//@ chunk-k7sq4jmf.js:15181-15206 placement
var STAT = "stat";
var LSTAT = "lstat";
//@ chunk-k7sq4jmf.js:15206-15767 placement
/**
 * chokidar WatchHelper
 */
class WatchHelper {
  constructor(path, followSymlinks, fsw) {
    this.fsw = fsw;
    let watchPath = path;
    this.path = path = path.replace(DOT_PATH_RE, "");
    this.watchPath = watchPath;
    this.fullWatchPath = pathModule_2.resolve(watchPath);
    this.dirParts = [];
    this.dirParts.forEach((dirPart) => {
      if (dirPart.length > 1) dirPart.pop();
    });
    this.followSymlinks = followSymlinks;
    this.statMethod = followSymlinks ? STAT : LSTAT;
  }
  entryPath(entry) {
    return pathModule_2.join(this.watchPath, pathModule_2.relative(this.watchPath, entry.fullPath));
  }
  filterPath(entry) {
    let { stats } = entry;
    if (stats && stats.isSymbolicLink()) return this.filterDir(entry);
    let entryPath = this.entryPath(entry);
    return this.fsw._isntIgnored(entryPath, stats) && this.fsw._hasReadPermissions(stats);
  }
  filterDir(entry) {
    return this.fsw._isntIgnored(this.entryPath(entry), entry.stats);
  }
}
//@ chunk-k7sq4jmf.js:15767-23630 placement
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
    let DEF_AWF = {
      stabilityThreshold: 2000,
      pollInterval: 100,
    };
    let opts = {
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
          ? DEF_AWF
          : typeof awaitWriteFinish === "object"
            ? {
                ...DEF_AWF,
                ...awaitWriteFinish,
              }
            : false,
    };
    if (isIBMi) opts.usePolling = true;
    if (opts.atomic === undefined) opts.atomic = !opts.usePolling;
    let envChokidarUsepolling = process.env.CHOKIDAR_USEPOLLING;
    if (envChokidarUsepolling !== undefined) {
      let lower = envChokidarUsepolling.toLowerCase();
      if (lower === "false" || lower === "0") opts.usePolling = false;
      else if (lower === "true" || lower === "1") opts.usePolling = true;
      else opts.usePolling = !!lower;
    }
    let envChokidarInterval = process.env.CHOKIDAR_INTERVAL;
    if (envChokidarInterval) opts.interval = Number.parseInt(envChokidarInterval, 10);
    let readyCount = 0;
    this._emitReady = () => {
      readyCount++;
      if (readyCount >= this._readyCount) {
        this._emitReady = noop;
        this._readyEmitted = true;
        process.nextTick(() => this.emit(EV.READY));
      }
    };
    this._emitRaw = (...args) => this.emit(EV.RAW, ...args);
    this._boundRemove = this._remove.bind(this);
    this.options = opts;
    this._nodeFsHandler = new NodeFsHandler(this);
    Object.freeze(opts);
  }
  _addIgnoredPath(ignoredPath) {
    if (isPlainObject(ignoredPath)) {
      for (let _ignoredPath of this._ignoredPaths)
        if (
          isPlainObject(_ignoredPath) &&
          _ignoredPath.path === ignoredPath.path &&
          _ignoredPath.recursive === ignoredPath.recursive
        )
          return;
    }
    this._ignoredPaths.add(ignoredPath);
  }
  _removeIgnoredPath(ignoredPath) {
    this._ignoredPaths.delete(ignoredPath);
    if (typeof ignoredPath === "string") {
      for (let _ignoredPath of this._ignoredPaths)
        if (isPlainObject(_ignoredPath) && _ignoredPath.path === ignoredPath)
          this._ignoredPaths.delete(_ignoredPath);
    }
  }
  add(paths_, origAdd, internal) {
    let { cwd } = this.options;
    this.closed = false;
    this._closePromise = undefined;
    let paths = unifyPaths(paths_);
    if (cwd) paths = paths.map((path) => getAbsolutePath(path, cwd));
    paths.forEach((path) => {
      this._removeIgnoredPath(path);
    });
    this._userIgnored = undefined;
    if (!this._readyCount) this._readyCount = 0;
    this._readyCount += paths.length;
    Promise.all(
      paths.map(async (path) => {
        let addedPath = await this._nodeFsHandler._addToNodeFs(path, !internal, undefined, 0, origAdd);
        if (addedPath) this._emitReady();
        return addedPath;
      }),
    ).then((addResults) => {
      if (this.closed) return;
      addResults.forEach((addedPath) => {
        if (addedPath) this.add(pathModule_2.dirname(addedPath), pathModule_2.basename(origAdd || addedPath));
      });
    });
    return this;
  }
  unwatch(paths_) {
    if (this.closed) return this;
    let paths = unifyPaths(paths_);
    let { cwd } = this.options;
    paths.forEach((path) => {
      if (!pathModule_2.isAbsolute(path) && !this._closers.has(path)) {
        if (cwd) path = pathModule_2.join(cwd, path);
        path = pathModule_2.resolve(path);
      }
      this._closePath(path);
      this._addIgnoredPath(path);
      if (this._watched.has(path))
        this._addIgnoredPath({
          path,
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
    let pendingPromises = [];
    this._closers.forEach((_closer) =>
      _closer.forEach((closer) => {
        let closerResult = closer();
        if (closerResult instanceof Promise) pendingPromises.push(closerResult);
      }),
    );
    this._streams.forEach((_stream) => _stream.destroy());
    this._userIgnored = undefined;
    this._readyCount = 0;
    this._readyEmitted = false;
    this._watched.forEach((dirEntry) => dirEntry.dispose());
    this._closers.clear();
    this._watched.clear();
    this._streams.clear();
    this._symlinkPaths.clear();
    this._throttled.clear();
    this._closePromise = pendingPromises.length
      ? Promise.all(pendingPromises).then(() => {
          return;
        })
      : Promise.resolve();
    return this._closePromise;
  }
  getWatched() {
    let watched = {};
    this._watched.forEach((dirEntry, path) => {
      let relativePath = (this.options.cwd ? pathModule_2.relative(this.options.cwd, path) : path) || DOT;
      watched[relativePath] = dirEntry.getChildren().sort();
    });
    return watched;
  }
  setPollInterval(interval) {
    this.options = Object.freeze({
      ...this.options,
      interval,
      binaryInterval: interval,
    });
    if (this.options.usePolling) setPollingInterval(this._emitRaw, interval);
  }
  emitWithAll(eventName, args) {
    this.emit(eventName, ...args);
    if (eventName !== EV.ERROR) this.emit(EV.ALL, eventName, ...args);
  }
  async _emit(event, path, stats) {
    if (this.closed) return;
    let options = this.options;
    if (isWindows) path = pathModule_2.normalize(path);
    if (options.cwd) path = pathModule_2.relative(options.cwd, path);
    let args = [path];
    if (stats != null) args.push(stats);
    let awaitWriteFinish = options.awaitWriteFinish;
    let pendingWrite;
    if (awaitWriteFinish && (pendingWrite = this._pendingWrites.get(path))) {
      pendingWrite.lastChange = new Date();
      return this;
    }
    if (options.atomic) {
      if (event === EV.UNLINK) {
        this._pendingUnlinks.set(path, [event, ...args]);
        setTimeout(
          () => {
            this._pendingUnlinks.forEach((_pendingUnlink, pendingPath) => {
              this.emit(..._pendingUnlink);
              this.emit(EV.ALL, ..._pendingUnlink);
              this._pendingUnlinks.delete(pendingPath);
            });
          },
          typeof options.atomic === "number" ? options.atomic : 100,
        );
        return this;
      }
      if (event === EV.ADD && this._pendingUnlinks.has(path)) {
        event = EV.CHANGE;
        this._pendingUnlinks.delete(path);
      }
    }
    if (awaitWriteFinish && (event === EV.ADD || event === EV.CHANGE) && this._readyEmitted) {
      let listener = (error, stats) => {
        if (this.closed) return;
        if (error) {
          if (this.listenerCount(EV.ERROR) === 0) {
            this._pendingWrites.delete(path);
            return;
          }
          event = EV.ERROR;
          args[0] = error;
          this.emitWithAll(event, args);
        } else if (stats) {
          if (args.length > 1) args[1] = stats;
          else args.push(stats);
          this.emitWithAll(event, args);
        }
      };
      this._awaitWriteFinish(path, awaitWriteFinish.stabilityThreshold, event, listener);
      return this;
    }
    if (event === EV.CHANGE) {
      if (!this._throttle(EV.CHANGE, path, 50)) return this;
    }
    if (
      options.alwaysStat &&
      stats === undefined &&
      (event === EV.ADD || event === EV.ADD_DIR || event === EV.CHANGE)
    ) {
      let fullPath = options.cwd ? pathModule_2.join(options.cwd, path) : path;
      let statsResult;
      try {
        statsResult = await stat_2(fullPath);
      } catch (error) {}
      if (!statsResult || this.closed) return;
      args.push(statsResult);
    }
    this.emitWithAll(event, args);
    return this;
  }
  _handleError(error) {
    let code = error && error.code;
    if (
      error &&
      !this.closed &&
      this.listenerCount(EV.ERROR) > 0 &&
      code !== "ENOENT" &&
      code !== "ENOTDIR" &&
      (!this.options.ignorePermissionErrors || (code !== "EPERM" && code !== "EACCES"))
    )
      this.emit(EV.ERROR, error);
    return error || this.closed;
  }
  _throttle(action, path, timeout) {
    if (!this._throttled.has(action)) this._throttled.set(action, new Map());
    let pathMap = this._throttled.get(action);
    if (!pathMap) throw Error("invalid throttle");
    let throttled = pathMap.get(path);
    if (throttled) {
      throttled.count++;
      return false;
    }
    let timeoutObject;
    let clear = () => {
      let throttled = pathMap.get(path);
      let count = throttled ? throttled.count : 0;
      pathMap.delete(path);
      clearTimeout(timeoutObject);
      if (throttled) clearTimeout(throttled.timeoutObject);
      return count;
    };
    timeoutObject = setTimeout(clear, timeout);
    let throttledEntry = {
      timeoutObject,
      clear,
      count: 0,
    };
    pathMap.set(path, throttledEntry);
    return throttledEntry;
  }
  _incrReadyCount() {
    return this._readyCount++;
  }
  _awaitWriteFinish(path, threshold, event, callback) {
    let awaitWriteFinish = this.options.awaitWriteFinish;
    if (typeof awaitWriteFinish !== "object") return;
    let pollInterval = awaitWriteFinish.pollInterval;
    let timer;
    let fullPath = path;
    if (this.options.cwd && !pathModule_2.isAbsolute(path))
      fullPath = pathModule_2.join(this.options.cwd, path);
    let lastChange = new Date();
    let _pendingWrites = this._pendingWrites;
    function checkStability(prevStats) {
      stat(fullPath, (error, stats) => {
        if (error || !_pendingWrites.has(path)) {
          if (error && error.code !== "ENOENT") callback(error);
          return;
        }
        let now = Number(new Date());
        if (prevStats && stats.size !== prevStats.size) _pendingWrites.get(path).lastChange = now;
        let pendingWrite = _pendingWrites.get(path);
        if (now - pendingWrite.lastChange >= threshold) {
          _pendingWrites.delete(path);
          callback(undefined, stats);
        } else timer = setTimeout(checkStability, pollInterval, stats);
      });
    }
    if (!_pendingWrites.has(path)) {
      _pendingWrites.set(path, {
        lastChange,
        cancelWait: () => {
          _pendingWrites.delete(path);
          clearTimeout(timer);
          return event;
        },
      });
      timer = setTimeout(checkStability, pollInterval);
    }
  }
  _isIgnored(path, stats) {
    if (this.options.atomic && DOT_RE.test(path)) return true;
    if (!this._userIgnored) {
      let { cwd } = this.options;
      let mapped = (this.options.ignored || []).map(normalizeMatcherPath(cwd));
      let ignoredPaths = [...[...this._ignoredPaths].map(normalizeMatcherPath(cwd)), ...mapped];
      this._userIgnored = anymatch(ignoredPaths, undefined);
    }
    return this._userIgnored(path, stats);
  }
  _isntIgnored(path, stats) {
    return !this._isIgnored(path, stats);
  }
  _getWatchHelpers(path) {
    return new WatchHelper(path, this.options.followSymlinks, this);
  }
  _getWatchedDir(path) {
    let path_2 = pathModule_2.resolve(path);
    if (!this._watched.has(path_2)) this._watched.set(path_2, new DirEntry(path_2, this._boundRemove));
    return this._watched.get(path_2);
  }
  _hasReadPermissions(stats) {
    if (this.options.ignorePermissionErrors) return true;
    return Boolean(Number(stats.mode) & 256);
  }
  _remove(directory, item, isDirectory) {
    let stack = [
      {
        directory,
        item,
        isDirectory,
        path: "",
        fullPath: "",
        expanded: false,
      },
    ];
    while (stack.length > 0) {
      let entry = stack[stack.length - 1];
      if (!entry.expanded) {
        entry.expanded = true;
        let joined = pathModule_2.join(entry.directory, entry.item);
        let resolved = pathModule_2.resolve(joined);
        entry.path = joined;
        entry.fullPath = resolved;
        entry.isDirectory =
          entry.isDirectory != null
            ? entry.isDirectory
            : this._watched.has(joined) || this._watched.has(resolved);
        if (!this._throttle("remove", joined, 100)) {
          stack.pop();
          continue;
        }
        if (!entry.isDirectory && this._watched.size === 1) this.add(entry.directory, entry.item, true);
        let children = this._getWatchedDir(joined).getChildren();
        for (let idx = children.length - 1; idx >= 0; idx--)
          stack.push({
            directory: joined,
            item: children[idx],
            isDirectory: undefined,
            path: "",
            fullPath: "",
            expanded: false,
          });
        continue;
      }
      stack.pop();
      let { path, fullPath } = entry;
      let dirEntry = this._getWatchedDir(entry.directory);
      let hadItem = dirEntry.has(entry.item);
      dirEntry.remove(entry.item);
      if (this._symlinkPaths.has(fullPath)) this._symlinkPaths.delete(fullPath);
      let relativePath = path;
      if (this.options.cwd) relativePath = pathModule_2.relative(this.options.cwd, path);
      if (this.options.awaitWriteFinish && this._pendingWrites.has(relativePath)) {
        if (this._pendingWrites.get(relativePath).cancelWait() === EV.ADD) continue;
      }
      this._watched.delete(path);
      this._watched.delete(fullPath);
      let event = entry.isDirectory ? EV.UNLINK_DIR : EV.UNLINK;
      if (hadItem && !this._isIgnored(path)) this._emit(event, path);
      this._closePath(path);
    }
  }
  _closePath(path) {
    this._closeFile(path);
    let dir = pathModule_2.dirname(path);
    this._getWatchedDir(dir).remove(pathModule_2.basename(path));
  }
  _closeFile(path) {
    let closers = this._closers.get(path);
    if (!closers) return;
    closers.forEach((closer) => closer());
    this._closers.delete(path);
  }
  _addPathCloser(path, closer) {
    if (!closer) return;
    let closers = this._closers.get(path);
    if (!closers) {
      closers = [];
      this._closers.set(path, closers);
    }
    closers.push(closer);
  }
  _readdirp(root, options) {
    if (this.closed) return;
    let options_2 = {
      type: EV.ALL,
      alwaysStat: true,
      lstat: true,
      ...options,
      depth: 0,
    };
    let stream = readdirp(root, options_2);
    this._streams.add(stream);
    stream.once(CLOSE, () => {
      stream = undefined;
    });
    stream.once(END, () => {
      if (stream) {
        this._streams.delete(stream);
        stream = undefined;
      }
    });
    return stream;
  }
}
//@ chunk-k7sq4jmf.js:23630-23683 placement
function watch(paths, options = {}) {
  let watcher = new FSWatcher(options);
  watcher.add(paths);
  return watcher;
}
//@ chunk-k7sq4jmf.js:23683-23713 placement
var chokidar_default = {
  watch,
  FSWatcher,
};
export { chokidar_default };

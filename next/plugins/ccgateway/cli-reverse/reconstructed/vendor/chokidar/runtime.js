/**
 * chokidar/runtime.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: chokidar@6.0.0
 * pieces: chunk-k7sq4jmf.js (5)
 * attribution: esm-layout 1, esm-fingerprint 1, affinity 3
 */
import { type as St } from "os";
import { lstat, stat as stat_2, open, realpath } from "fs/promises";
import "path";
import * as pathModule_2 from "path";
import { watch as watch_2, unwatchFile, watchFile } from "fs";

//@ chunk-k7sq4jmf.js:4308-4350 esm-layout
var DATA = "data";
var END = "end";
var CLOSE = "close";
var noop = () => {};
//@ chunk-k7sq4jmf.js:4350-6739 esm-fingerprint
var LINUX = "linux";
var isWindows = LINUX === "win32";
var isMacos = LINUX === "darwin";
var isLinuxPlatform = LINUX === "linux";
var isFreeBSD = LINUX === "freebsd";
var isIBMi = St() === "OS400";
var EV = {
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
var EVENTS = EV;
var WATCH = "watch";
var fsMethods = {
  lstat,
  stat: stat_2,
};
var LISTENERS = "listeners";
var ERRHANDLERS = "errHandlers";
var RAWEMITTERS = "rawEmitters";
var EMITTER_KEYS = [LISTENERS, ERRHANDLERS, RAWEMITTERS];
var BINARY_EXTENSIONS = new Set([
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
var isBinaryPath = (path) => BINARY_EXTENSIONS.has(pathModule_2.extname(path).slice(1).toLowerCase());
var forEachSetOrValue = (value, callback) => {
  if (value instanceof Set) value.forEach(callback);
  else callback(value);
};
var addToSet = (map, key, value) => {
  let set = map[key];
  if (!(set instanceof Set)) map[key] = set = new Set([set]);
  set.add(value);
};
var clearSet = (map) => (key) => {
  let set = map[key];
  if (set instanceof Set) set.clear();
  else delete map[key];
};
var deleteFromSet = (map, key, value) => {
  let set = map[key];
  if (set instanceof Set) set.delete(value);
  else if (set === value) delete map[key];
};
var isEmptySet = (listeners) => (listeners instanceof Set ? listeners.size === 0 : !listeners);
var EVENT_QUEUES = new Map();
//@ chunk-k7sq4jmf.js:6739-6916 affinity
function runThrottledEvent(watchedPath, eventType, clearThrottle, errHandler, emitEvent) {
  let onThrottled = (error, stats) => {
    clearThrottle(watchedPath);
    emitEvent(error, stats, {
      watchedPath,
    });
    if (stats && watchedPath !== stats)
      delegateToSubscribers(
        pathModule_2.resolve(watchedPath, stats),
        LISTENERS,
        pathModule_2.join(watchedPath, stats),
      );
  };
  try {
    return watch_2(
      watchedPath,
      {
        persistent: eventType.persistent,
      },
      onThrottled,
    );
  } catch (error) {
    errHandler(error);
    return;
  }
}
//@ chunk-k7sq4jmf.js:6916-8809 affinity
var delegateToSubscribers = (watchedPath, kind, eventName, path, stats) => {
  let entry = EVENT_QUEUES.get(watchedPath);
  if (!entry) return;
  forEachSetOrValue(entry[kind], (handler) => {
    handler(eventName, path, stats);
  });
};
var watchWithNodeFs = (path, resolvedPath, options, handlers) => {
  let { listener, errHandler, rawEmitter } = handlers;
  let entry = EVENT_QUEUES.get(resolvedPath);
  let watcher;
  if (!options.persistent) {
    watcher = runThrottledEvent(path, options, listener, errHandler, rawEmitter);
    if (!watcher) return;
    watcher.on(EVENTS.ERROR, async (error) => {
      if (isWindows && error.code === "EPERM")
        try {
          await (await open(path, "r")).close();
          errHandler(error);
        } catch (error) {}
      else errHandler(error);
    });
    return watcher.close.bind(watcher);
  }
  if (entry) {
    addToSet(entry, LISTENERS, listener);
    addToSet(entry, ERRHANDLERS, errHandler);
    addToSet(entry, RAWEMITTERS, rawEmitter);
  } else {
    watcher = runThrottledEvent(
      path,
      options,
      delegateToSubscribers.bind(null, resolvedPath, LISTENERS),
      errHandler,
      delegateToSubscribers.bind(null, resolvedPath, RAWEMITTERS),
    );
    if (!watcher) return;
    watcher.on(EVENTS.ERROR, async (error) => {
      let notifyError = delegateToSubscribers.bind(null, resolvedPath, ERRHANDLERS);
      if (entry) entry.watcherUnusable = true;
      if (isWindows && error.code === "EPERM")
        try {
          await (await open(path, "r")).close();
          notifyError(error);
        } catch (error) {}
      else notifyError(error);
    });
    entry = {
      listeners: listener,
      errHandlers: errHandler,
      rawEmitters: rawEmitter,
      watcher,
    };
    EVENT_QUEUES.set(resolvedPath, entry);
  }
  return () => {
    deleteFromSet(entry, LISTENERS, listener);
    deleteFromSet(entry, ERRHANDLERS, errHandler);
    deleteFromSet(entry, RAWEMITTERS, rawEmitter);
    if (isEmptySet(entry.listeners) && entry.watcher) {
      entry.watcher.close();
      EVENT_QUEUES.delete(resolvedPath);
      EMITTER_KEYS.forEach(clearSet(entry));
      entry.watcher = undefined;
      Object.freeze(entry);
    }
  };
};
var pollingWatchers = new Map();
var watchWithPolling = (path, resolvedPath, options, handlers) => {
  let { listener, rawEmitter, folderStamp } = handlers;
  let entry = pollingWatchers.get(resolvedPath);
  let options_2 = entry && entry.options;
  if (options_2 && (options_2.persistent < options.persistent || options_2.interval > options.interval)) {
    unwatchFile(resolvedPath);
    entry = undefined;
  }
  if (entry) {
    addToSet(entry, LISTENERS, listener);
    addToSet(entry, RAWEMITTERS, rawEmitter);
  } else {
    let notify = (stats) => forEachSetOrValue(entry.listeners, (listener) => listener(path, stats));
    let onPoll = (curr, prev) => {
      forEachSetOrValue(entry.rawEmitters, (rawEmitter) => {
        rawEmitter(EVENTS.CHANGE, resolvedPath, {
          curr,
          prev,
        });
      });
      let mtimeMs = curr.mtimeMs;
      if (curr.size !== prev.size || mtimeMs > prev.mtimeMs || mtimeMs === 0) {
        if (entry.watcher && entry.folderStamp !== undefined) entry.folderStamp = folderStampOf(curr);
        notify(curr);
      }
    };
    entry = {
      listeners: listener,
      rawEmitters: rawEmitter,
      options,
      onPoll,
      notify,
      folderStamp,
      watcher: watchFile(resolvedPath, options, onPoll),
    };
    pollingWatchers.set(resolvedPath, entry);
  }
  return () => {
    deleteFromSet(entry, LISTENERS, listener);
    deleteFromSet(entry, RAWEMITTERS, rawEmitter);
    if (isEmptySet(entry.listeners) && entry.watcher) {
      pollingWatchers.delete(resolvedPath);
      unwatchFile(resolvedPath);
      entry.options = entry.watcher = undefined;
      Object.freeze(entry);
    }
  };
};
var setPollingInterval = (rawEmitter, interval) => {
  for (let [resolvedPath, entry] of pollingWatchers) {
    let rawEmitters = entry.rawEmitters;
    let multipleEmitters = rawEmitters instanceof Set && rawEmitters.size > 1;
    if (
      !(rawEmitters instanceof Set ? rawEmitters.has(rawEmitter) : rawEmitters === rawEmitter) ||
      entry.options.interval === interval ||
      (multipleEmitters && interval > entry.options.interval)
    )
      continue;
    unwatchFile(resolvedPath, entry.onPoll);
    entry.options = {
      ...entry.options,
      interval,
    };
    entry.watcher = watchFile(resolvedPath, entry.options, entry.onPoll);
    if (entry.folderStamp !== undefined) refreshFolderStamp(resolvedPath, entry).catch(noop);
  }
};
var folderStampOf = (stats) => `${stats.mtimeMs}:${stats.ctimeMs}`;
var refreshFolderStamp = async (path, entry) => {
  let stats;
  try {
    stats = await stat_2(path);
  } catch (error) {
    return;
  }
  if (entry.watcher && folderStampOf(stats) !== entry.folderStamp) {
    entry.folderStamp = folderStampOf(stats);
    entry.notify(stats);
  }
};
//@ chunk-k7sq4jmf.js:8809-13067 affinity
class NodeFsHandler {
  constructor(fsw) {
    this.fsw = fsw;
    this._boundHandleError = (error) => fsw._handleError(error);
  }
  _watchWithNodeFs(path, listener, folderStamp) {
    let options = this.fsw.options;
    let dir = pathModule_2.dirname(path);
    let path_2 = pathModule_2.basename(path);
    this.fsw._getWatchedDir(dir).add(path_2);
    let resolvedPath = pathModule_2.resolve(path);
    let watchOptions = {
      persistent: options.persistent,
    };
    if (!listener) listener = noop;
    let closeWatcher;
    if (options.usePolling) {
      let hasBinaryInterval = options.interval !== options.binaryInterval;
      watchOptions.interval =
        hasBinaryInterval && isBinaryPath(path_2) ? options.binaryInterval : options.interval;
      closeWatcher = watchWithPolling(path, resolvedPath, watchOptions, {
        listener,
        rawEmitter: this.fsw._emitRaw,
        folderStamp,
      });
    } else
      closeWatcher = watchWithNodeFs(path, resolvedPath, watchOptions, {
        listener,
        errHandler: this._boundHandleError,
        rawEmitter: this.fsw._emitRaw,
      });
    return closeWatcher;
  }
  _handleFile(path, stats, isInitial) {
    if (this.fsw.closed) return;
    let dir = pathModule_2.dirname(path);
    let base = pathModule_2.basename(path);
    let parentDir = this.fsw._getWatchedDir(dir);
    let prevStats = stats;
    if (parentDir.has(base)) return;
    let onChange = async (changedPath, currStats) => {
      if (!this.fsw._throttle(WATCH, path, 5)) return;
      if (!currStats || currStats.mtimeMs === 0)
        try {
          let newStats = await stat_2(path);
          if (this.fsw.closed) return;
          let { atimeMs, mtimeMs } = newStats;
          if (!atimeMs || atimeMs <= mtimeMs || mtimeMs !== prevStats.mtimeMs)
            this.fsw._emit(EVENTS.CHANGE, path, newStats);
          if ((isMacos || isLinuxPlatform || isFreeBSD) && prevStats.ino !== newStats.ino) {
            this.fsw._closeFile(path);
            prevStats = newStats;
            let newWatcher = this._watchWithNodeFs(path, onChange);
            if (newWatcher) this.fsw._addPathCloser(path, newWatcher);
          } else prevStats = newStats;
        } catch (error) {
          this.fsw._remove(dir, base);
        }
      else if (parentDir.has(base)) {
        let { atimeMs, mtimeMs } = currStats;
        if (!atimeMs || atimeMs <= mtimeMs || mtimeMs !== prevStats.mtimeMs)
          this.fsw._emit(EVENTS.CHANGE, path, currStats);
        prevStats = currStats;
      }
    };
    let closeWatcher = this._watchWithNodeFs(path, onChange);
    if (!(isInitial && this.fsw.options.ignoreInitial) && this.fsw._isntIgnored(path)) {
      if (!this.fsw._throttle(EVENTS.ADD, path, 0)) return;
      this.fsw._emit(EVENTS.ADD, path, stats);
    }
    return closeWatcher;
  }
  async _handleSymlink(entry, dir, symlinkPath, item) {
    if (this.fsw.closed) return;
    let fullPath = entry.fullPath;
    let parentDir = this.fsw._getWatchedDir(dir);
    if (!this.fsw.options.followSymlinks) {
      this.fsw._incrReadyCount();
      let realPath;
      try {
        realPath = await realpath(symlinkPath);
      } catch (error) {
        this.fsw._emitReady();
        return true;
      }
      if (this.fsw.closed) return;
      if (parentDir.has(item)) {
        if (this.fsw._symlinkPaths.get(fullPath) !== realPath) {
          this.fsw._symlinkPaths.set(fullPath, realPath);
          this.fsw._emit(EVENTS.CHANGE, symlinkPath, entry.stats);
        }
      } else {
        parentDir.add(item);
        this.fsw._symlinkPaths.set(fullPath, realPath);
        this.fsw._emit(EVENTS.ADD, symlinkPath, entry.stats);
      }
      this.fsw._emitReady();
      return true;
    }
    if (this.fsw._symlinkPaths.has(fullPath)) return true;
    this.fsw._symlinkPaths.set(fullPath, true);
  }
  _handleRead(dirPath, isInitial, helper, item, watchPath, depth, throttled) {
    dirPath = pathModule_2.join(dirPath, "");
    throttled = this.fsw._throttle("readdir", dirPath, 1000);
    if (!throttled) return;
    let watchedDir = this.fsw._getWatchedDir(helper.path);
    let children = new Set();
    let readStream = this.fsw._readdirp(dirPath, {
      fileFilter: (filePath) => helper.filterPath(filePath),
      directoryFilter: (dirPath) => helper.filterDir(dirPath),
    });
    if (!readStream) return;
    readStream
      .on(DATA, async (entry) => {
        if (this.fsw.closed) {
          readStream = undefined;
          return;
        }
        let path = entry.path;
        let joined = pathModule_2.join(dirPath, path);
        children.add(path);
        if (entry.stats.isSymbolicLink() && (await this._handleSymlink(entry, dirPath, joined, path))) return;
        if (this.fsw.closed) {
          readStream = undefined;
          return;
        }
        if (path === item || (!item && !watchedDir.has(path))) {
          this.fsw._incrReadyCount();
          joined = pathModule_2.join(watchPath, pathModule_2.relative(watchPath, joined));
          this._addToNodeFs(joined, isInitial, helper, depth + 1);
        }
      })
      .on(EVENTS.ERROR, this._boundHandleError);
    return new Promise((resolve, reject) => {
      if (!readStream) return reject();
      readStream.once(END, () => {
        if (this.fsw.closed) {
          readStream = undefined;
          return;
        }
        let cleared = throttled ? throttled.clear() : false;
        resolve(undefined);
        watchedDir
          .getChildren()
          .filter((child) => child !== dirPath && !children.has(child))
          .forEach((child) => {
            this.fsw._remove(dirPath, child);
          });
        readStream = undefined;
        if (cleared) this._handleRead(dirPath, false, helper, item, watchPath, depth, throttled);
      });
    });
  }
  async _handleDir(dirPath, stats, isInitial, depth, isSubdir, helper, realPath) {
    let parentDir = this.fsw._getWatchedDir(pathModule_2.dirname(dirPath));
    let alreadyWatched = parentDir.has(pathModule_2.basename(dirPath));
    if (!(isInitial && this.fsw.options.ignoreInitial) && !isSubdir && !alreadyWatched)
      this.fsw._emit(EVENTS.ADD_DIR, dirPath, stats);
    parentDir.add(pathModule_2.basename(dirPath));
    this.fsw._getWatchedDir(dirPath);
    let folderStamp;
    let closeWatcher;
    let depth_2 = this.fsw.options.depth;
    if ((depth_2 == null || depth <= depth_2) && !this.fsw._symlinkPaths.has(realPath)) {
      if (!isSubdir) {
        await this._handleRead(dirPath, isInitial, helper, isSubdir, dirPath, depth, folderStamp);
        if (this.fsw.closed) return;
      }
      closeWatcher = this._watchWithNodeFs(
        dirPath,
        (changedPath, currStats) => {
          if (currStats && currStats.mtimeMs === 0) return;
          this._handleRead(changedPath, false, helper, isSubdir, dirPath, depth, folderStamp);
        },
        stats ? folderStampOf(stats) : null,
      );
    }
    return closeWatcher;
  }
  async _addToNodeFs(targetPath, isInitial, helper, depth, isSubdir) {
    let _emitReady = this.fsw._emitReady;
    if (this.fsw._isIgnored(targetPath) || this.fsw.closed) {
      _emitReady();
      return false;
    }
    let watchHelper = this.fsw._getWatchHelpers(targetPath);
    if (helper) {
      watchHelper.filterPath = (path) => helper.filterPath(path);
      watchHelper.filterDir = (path) => helper.filterDir(path);
    }
    try {
      let stats = await fsMethods[watchHelper.statMethod](watchHelper.watchPath);
      if (this.fsw.closed) return;
      if (this.fsw._isIgnored(watchHelper.watchPath, stats)) {
        _emitReady();
        return false;
      }
      let followSymlinks = this.fsw.options.followSymlinks;
      let closeWatcher;
      if (stats.isDirectory()) {
        let resolved = pathModule_2.resolve(targetPath);
        let realPath = followSymlinks ? await realpath(targetPath) : targetPath;
        if (this.fsw.closed) return;
        closeWatcher = await this._handleDir(
          watchHelper.watchPath,
          stats,
          isInitial,
          depth,
          isSubdir,
          watchHelper,
          realPath,
        );
        if (this.fsw.closed) return;
        if (resolved !== realPath && realPath !== undefined) this.fsw._symlinkPaths.set(resolved, realPath);
      } else if (stats.isSymbolicLink()) {
        let realPath = followSymlinks ? await realpath(targetPath) : targetPath;
        if (this.fsw.closed) return;
        let dir = pathModule_2.dirname(watchHelper.watchPath);
        this.fsw._getWatchedDir(dir).add(watchHelper.watchPath);
        this.fsw._emit(EVENTS.ADD, watchHelper.watchPath, stats);
        closeWatcher = await this._handleDir(dir, stats, isInitial, depth, targetPath, watchHelper, realPath);
        if (this.fsw.closed) return;
        if (realPath !== undefined) this.fsw._symlinkPaths.set(pathModule_2.resolve(targetPath), realPath);
      } else closeWatcher = this._handleFile(watchHelper.watchPath, stats, isInitial);
      _emitReady();
      if (closeWatcher) this.fsw._addPathCloser(targetPath, closeWatcher);
      return false;
    } catch (error) {
      if (this.fsw._handleError(error)) {
        _emitReady();
        return targetPath;
      }
    }
  }
}
export { noop, isIBMi, EV, NodeFsHandler, setPollingInterval, isWindows, CLOSE, END };

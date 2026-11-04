/**
 * readdirp/esm/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: readdirp@4.1.0..4.1.2
 * pieces: chunk-3gvas51j.js (5)
 * attribution: esm-fingerprint 4, esm-layout 1
 */
import { Readable } from "stream";
import { lstat, stat as stat_2, readdir, realpath } from "fs/promises";
import { resolve, join, relative, sep } from "path";

//@ chunk-3gvas51j.js:508-745 esm-fingerprint
var EntryTypes = {
  FILE_TYPE: "files",
  DIR_TYPE: "directories",
  FILE_DIR_TYPE: "files_directories",
  EVERYTHING_TYPE: "all",
};
var defaultOptions = {
  root: ".",
  fileFilter: (_entryInfo) => true,
  directoryFilter: (_entryInfo) => true,
  type: EntryTypes.FILE_TYPE,
  lstat: false,
  depth: 2147483648,
  alwaysStat: false,
  highWaterMark: 4096,
};
//@ chunk-3gvas51j.js:745-762 esm-layout
Object.freeze(defaultOptions);
//@ chunk-3gvas51j.js:762-1291 esm-fingerprint
var RECURSIVE_ERROR_CODE = "READDIRP_RECURSIVE_ERROR";
var NORMAL_FLOW_ERRORS = new Set(["ENOENT", "EPERM", "EACCES", "ELOOP", RECURSIVE_ERROR_CODE]);
var ALL_TYPES = [
  EntryTypes.DIR_TYPE,
  EntryTypes.EVERYTHING_TYPE,
  EntryTypes.FILE_DIR_TYPE,
  EntryTypes.FILE_TYPE,
];
var DIR_TYPES = new Set([EntryTypes.DIR_TYPE, EntryTypes.EVERYTHING_TYPE, EntryTypes.FILE_DIR_TYPE]);
var FILE_TYPES = new Set([EntryTypes.EVERYTHING_TYPE, EntryTypes.FILE_DIR_TYPE, EntryTypes.FILE_TYPE]);
var isNormalFlowError = (error) => NORMAL_FLOW_ERRORS.has(error.code);
var wantBigintFsStats = false;
var emptyFn = (entry) => true;
var normalizeFilter = (filter) => {
  if (filter === undefined) return emptyFn;
  if (typeof filter === "function") return filter;
  if (typeof filter === "string") {
    let fl = filter.trim();
    return (entry) => entry.basename === fl;
  }
  if (Array.isArray(filter)) {
    let trItems = filter.map((item) => item.trim());
    return (entry) => trItems.some((f) => entry.basename === f);
  }
  return emptyFn;
};
//@ chunk-3gvas51j.js:1291-3702 esm-fingerprint
class ReaddirpStream extends Readable {
  constructor(options = {}) {
    super({
      objectMode: true,
      autoDestroy: true,
      highWaterMark: options.highWaterMark,
    });
    let opts = {
      ...defaultOptions,
      ...options,
    };
    let { root, type } = opts;
    this._fileFilter = normalizeFilter(opts.fileFilter);
    this._directoryFilter = normalizeFilter(opts.directoryFilter);
    let statMethod = opts.lstat ? lstat : stat_2;
    if (wantBigintFsStats)
      this._stat = (path) =>
        statMethod(path, {
          bigint: true,
        });
    else this._stat = statMethod;
    this._maxDepth = opts.depth ?? defaultOptions.depth;
    this._wantsDir = type ? DIR_TYPES.has(type) : false;
    this._wantsFile = type ? FILE_TYPES.has(type) : false;
    this._wantsEverything = type === EntryTypes.EVERYTHING_TYPE;
    this._root = resolve(root);
    this._isDirent = !opts.alwaysStat;
    this._statsProp = this._isDirent ? "dirent" : "stats";
    this._rdOptions = {
      encoding: "utf8",
      withFileTypes: this._isDirent,
    };
    this.parents = [this._exploreDir(root, 1)];
    this.reading = false;
    this.parent = undefined;
  }
  async _read(batch) {
    if (this.reading) return;
    this.reading = true;
    try {
      while (!this.destroyed && batch > 0) {
        let par = this.parent;
        let fil = par && par.files;
        if (fil && fil.length > 0) {
          let { path, depth } = par;
          let slice = fil.splice(0, batch).map((dirent) => this._formatEntry(dirent, path));
          let awaited = await Promise.all(slice);
          for (let entry of awaited) {
            if (!entry) continue;
            if (this.destroyed) return;
            let entryType = await this._getEntryType(entry);
            if (entryType === "directory" && this._directoryFilter(entry)) {
              if (depth <= this._maxDepth) this.parents.push(this._exploreDir(entry.fullPath, depth + 1));
              if (this._wantsDir) {
                this.push(entry);
                batch--;
              }
            } else if ((entryType === "file" || this._includeAsFile(entry)) && this._fileFilter(entry)) {
              if (this._wantsFile) {
                this.push(entry);
                batch--;
              }
            }
          }
        } else {
          let parent = this.parents.pop();
          if (!parent) {
            this.push(null);
            break;
          }
          this.parent = await parent;
          if (this.destroyed) return;
        }
      }
    } catch (error) {
      this.destroy(error);
    } finally {
      this.reading = false;
    }
  }
  async _exploreDir(path, depth) {
    let files;
    try {
      files = await readdir(path, this._rdOptions);
    } catch (error) {
      this._onError(error);
    }
    return {
      files,
      depth,
      path,
    };
  }
  async _formatEntry(dirent, path) {
    let entry;
    let basename = this._isDirent ? dirent.name : dirent;
    try {
      let fullPath = resolve(join(path, basename));
      entry = {
        path: relative(this._root, fullPath),
        fullPath,
        basename,
      };
      entry[this._statsProp] = this._isDirent ? dirent : await this._stat(fullPath);
    } catch (err) {
      this._onError(err);
      return;
    }
    return entry;
  }
  _onError(err) {
    if (isNormalFlowError(err) && !this.destroyed) this.emit("warn", err);
    else this.destroy(err);
  }
  async _getEntryType(entry) {
    if (!entry && this._statsProp in entry) return "";
    let stats = entry[this._statsProp];
    if (!stats) return "";
    if (stats.isFile()) return "file";
    if (stats.isDirectory()) return "directory";
    if (stats && stats.isSymbolicLink()) {
      let full = entry.fullPath;
      try {
        let entryRealPath = await realpath(full);
        let entryRealPathStats = await lstat(entryRealPath);
        if (entryRealPathStats.isFile()) return "file";
        if (entryRealPathStats.isDirectory()) {
          let len = entryRealPath.length;
          if (full.startsWith(entryRealPath) && full.substr(len, 1) === sep) {
            let recursiveError = Error(`Circular symlink detected: "${full}" points to "${entryRealPath}"`);
            recursiveError.code = RECURSIVE_ERROR_CODE;
            return this._onError(recursiveError);
          }
          return "directory";
        }
      } catch (error) {
        this._onError(error);
        return "";
      }
    }
  }
  _includeAsFile(entry) {
    let stats = entry && entry[this._statsProp];
    return stats && this._wantsEverything && !stats.isDirectory();
  }
}
//@ chunk-3gvas51j.js:3702-4126 esm-fingerprint
function readdirp(root, options = {}) {
  let type = options.entryType || options.type;
  if (type === "both") type = EntryTypes.FILE_DIR_TYPE;
  if (type) options.type = type;
  if (!root) throw Error("readdirp: root argument is required. Usage: readdirp(root, options)");
  else if (typeof root !== "string")
    throw TypeError("readdirp: root argument must be a string. Usage: readdirp(root, options)");
  else if (type && !ALL_TYPES.includes(type))
    throw Error(`readdirp: Invalid type passed. Use one of ${ALL_TYPES.join(", ")}`);
  options.root = root;
  return new ReaddirpStream(options);
}
export { readdirp };

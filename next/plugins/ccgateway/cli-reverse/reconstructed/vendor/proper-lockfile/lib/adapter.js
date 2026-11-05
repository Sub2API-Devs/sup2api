/**
 * proper-lockfile/lib/adapter.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: proper-lockfile@4.1.2
 * pieces: chunk-3c7mkwg0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_graceful_fs } from "../../graceful-fs/graceful-fs.js";

//@ chunk-3c7mkwg0.js:20904-21622 cjs-fingerprint
var properLockfileAdapter = __commonJS(function (cjsExports, cjsModule) {
  var fs = require_graceful_fs();
  function createSyncFs(fs) {
    let methods = ["mkdir", "realpath", "stat", "rmdir", "utimes"];
    let newFs = {
      ...fs,
    };
    methods.forEach((method) => {
      newFs[method] = (...args) => {
        let callback = args.pop();
        let ret;
        try {
          ret = fs[`${method}Sync`](...args);
        } catch (err) {
          return callback(err);
        }
        callback(null, ret);
      };
    });
    return newFs;
  }
  function toPromise(method) {
    return (...args) =>
      new Promise((resolve, reject) => {
        args.push((err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
        method(...args);
      });
  }
  function toSync(method) {
    return (...args) => {
      let err;
      let result;
      args.push((_err, _result) => {
        err = _err;
        result = _result;
      });
      method(...args);
      if (err) throw err;
      return result;
    };
  }
  function toSyncOptions(options) {
    options = {
      ...options,
    };
    options.fs = createSyncFs(options.fs || fs);
    if (
      (typeof options.retries === "number" && options.retries > 0) ||
      (options.retries && typeof options.retries.retries === "number" && options.retries.retries > 0)
    )
      throw Object.assign(Error("Cannot use retries with the sync api"), {
        code: "ESYNC",
      });
    return options;
  }
  cjsModule.exports = {
    toPromise,
    toSync,
    toSyncOptions,
  };
});
export { properLockfileAdapter };

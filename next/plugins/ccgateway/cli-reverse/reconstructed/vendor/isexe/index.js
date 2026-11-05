/**
 * isexe/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: isexe@2.0.0
 * pieces: chunk-t889g22j.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../runtime/bun-runtime.js";
import { require_windows } from "./windows.js";
import { require_mode } from "./mode.js";

//@ chunk-t889g22j.js:1714-2251 cjs-fingerprint
var require_isexe = __commonJS(function (cjsExports, cjsModule) {
  var fs = importMetaRequire("fs");
  var core;
  if (global.TESTING_WINDOWS) core = require_windows();
  else core = require_mode();
  cjsModule.exports = isexe;
  isexe.sync = sync;
  function isexe(path, options, cb) {
    if (typeof options === "function") {
      cb = options;
      options = {};
    }
    if (!cb) {
      if (typeof Promise !== "function") throw TypeError("callback not provided");
      return new Promise(function (resolve, reject) {
        isexe(path, options || {}, function (er, is) {
          if (er) reject(er);
          else resolve(is);
        });
      });
    }
    core(path, options || {}, function (er, is) {
      if (er) {
        if (er.code === "EACCES" || (options && options.ignoreErrors)) {
          er = null;
          is = false;
        }
      }
      cb(er, is);
    });
  }
  function sync(path, options) {
    try {
      return core.sync(path, options || {});
    } catch (er) {
      if ((options && options.ignoreErrors) || er.code === "EACCES") return false;
      else throw er;
    }
  }
});
export { require_isexe };

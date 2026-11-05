/**
 * isexe/windows.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: isexe@2.0.0
 * pieces: chunk-t889g22j.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../runtime/bun-runtime.js";

//@ chunk-t889g22j.js:713-1221 cjs-fingerprint
var require_windows = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = isexe;
  isexe.sync = sync;
  var fs = importMetaRequire("fs");
  function checkPathExt(path, options) {
    var pathext = options.pathExt !== undefined ? options.pathExt : process.env.PATHEXT;
    if (!pathext) return true;
    pathext = pathext.split(";");
    if (pathext.indexOf("") !== -1) return true;
    for (var i = 0; i < pathext.length; i++) {
      var p = pathext[i].toLowerCase();
      if (p && path.substr(-p.length).toLowerCase() === p) return true;
    }
    return false;
  }
  function checkStat(stat, path, options) {
    if (!stat.isSymbolicLink() && !stat.isFile()) return false;
    return checkPathExt(path, options);
  }
  function isexe(path, options, cb) {
    fs.stat(path, function (er, stat) {
      cb(er, er ? false : checkStat(stat, path, options));
    });
  }
  function sync(path, options) {
    return checkStat(fs.statSync(path), path, options);
  }
});
export { require_windows };

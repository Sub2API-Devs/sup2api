/**
 * isexe/mode.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: isexe@2.0.0
 * pieces: chunk-t889g22j.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../runtime/bun-runtime.js";

//@ chunk-t889g22j.js:1221-1714 cjs-fingerprint
var require_mode = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = isexe;
  isexe.sync = sync;
  var fs = importMetaRequire("fs");
  function isexe(path, options, cb) {
    fs.stat(path, function (er, stat) {
      cb(er, er ? false : checkStat(stat, options));
    });
  }
  function sync(path, options) {
    return checkStat(fs.statSync(path), options);
  }
  function checkStat(stat, options) {
    return stat.isFile() && checkMode(stat, options);
  }
  function checkMode(stat, options) {
    var { mode: mod, uid, gid } = stat;
    var myUid = options.uid !== undefined ? options.uid : process.getuid && process.getuid();
    var myGid = options.gid !== undefined ? options.gid : process.getgid && process.getgid();
    var u = parseInt("100", 8);
    var g = parseInt("010", 8);
    var o = parseInt("001", 8);
    var ug = u | g;
    var ret =
      mod & o || (mod & g && gid === myGid) || (mod & u && uid === myUid) || (mod & ug && myUid === 0);
    return ret;
  }
});
export { require_mode };

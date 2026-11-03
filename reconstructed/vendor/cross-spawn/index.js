/**
 * cross-spawn/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: cross-spawn@7.0.5..7.0.6
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { require_parse } from "./lib/parse.js";
import { require_enoent } from "./lib/enoent.js";

//@ chunk-m4p5zn6n.js:6175-6576 cjs-fingerprint
var require_cross_spawn = x(function (cjsExports, cjsModule) {
  var cp = importMetaRequire("child_process");
  var parse = require_parse();
  var enoent = require_enoent();
  function spawn(command, args, options) {
    let parsed = parse(command, args, options);
    let spawned = cp.spawn(parsed.command, parsed.args, parsed.options);
    enoent.hookChildProcess(spawned, parsed);
    return spawned;
  }
  function spawnSync(command, args, options) {
    let parsed = parse(command, args, options);
    let result = cp.spawnSync(parsed.command, parsed.args, parsed.options);
    result.error = result.error || enoent.verifyENOENTSync(result.status, parsed);
    return result;
  }
  cjsModule.exports = spawn;
  cjsModule.exports.spawn = spawn;
  cjsModule.exports.sync = spawnSync;
  cjsModule.exports._parse = parse;
  cjsModule.exports._enoent = enoent;
});
export { require_cross_spawn };

/**
 * cross-spawn/lib/util/readShebang.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: cross-spawn@7.0.5..7.0.6
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_shebang_command } from "../../../shebang-command/index.js";

//@ chunk-m4p5zn6n.js:5128-5330 cjs-fingerprint
var require_readShebang = __commonJS(function (cjsExports, cjsModule) {
  var fs = importMetaRequire("fs");
  var shebangCommand = require_shebang_command();
  function readShebang(command) {
    let buffer = Buffer.alloc(150);
    let fd;
    try {
      fd = fs.openSync(command, "r");
      fs.readSync(fd, buffer, 0, 150, 0);
      fs.closeSync(fd);
    } catch (error) {}
    return shebangCommand(buffer.toString());
  }
  cjsModule.exports = readShebang;
});
export { require_readShebang };

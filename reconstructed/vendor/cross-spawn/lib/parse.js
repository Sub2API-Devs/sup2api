/**
 * cross-spawn/lib/parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: cross-spawn@7.0.5..7.0.6
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_resolveCommand } from "./util/resolveCommand.js";
import { require_escape } from "./util/escape.js";
import { require_readShebang } from "./util/readShebang.js";

//@ chunk-m4p5zn6n.js:5330-5816 cjs-fingerprint
var require_parse = x(function (cjsExports, cjsModule) {
  var path = importMetaRequire("path");
  var resolveCommand = require_resolveCommand();
  var ee = require_escape();
  var readShebang = require_readShebang();
  var lr = /\.(?:com|exe)$/i;
  var fr = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
  function detectShebang(parsed) {
    parsed.file = resolveCommand(parsed);
    let shebang = parsed.file && readShebang(parsed.file);
    if (shebang) {
      parsed.args.unshift(parsed.file);
      parsed.command = shebang;
      return resolveCommand(parsed);
    }
    return parsed.file;
  }
  function parseNonShell(parsed) {
    return parsed;
  }
  function parse(command, args, options) {
    if (args && !Array.isArray(args)) {
      options = args;
      args = null;
    }
    args = args ? args.slice(0) : [];
    options = Object.assign({}, options);
    let parsed = {
      command,
      args,
      options,
      file: undefined,
      original: {
        command,
        args,
      },
    };
    return options.shell ? parsed : parseNonShell(parsed);
  }
  cjsModule.exports = parse;
});
export { require_parse };

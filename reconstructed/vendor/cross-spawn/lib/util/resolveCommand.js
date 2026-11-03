/**
 * cross-spawn/lib/util/resolveCommand.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: cross-spawn@7.0.5..7.0.6
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_which } from "../../../which/which.js";
import { Et } from "../../../unresolved-cjs/index.js";

//@ chunk-m4p5zn6n.js:3917-4564 cjs-fingerprint
var require_resolveCommand = x(function (cjsExports, cjsModule) {
  var path = importMetaRequire("path");
  var Tt = require_which();
  var Jn = Et();
  function resolveCommandAttempt(parsed, withoutPathExt) {
    let env = parsed.options.env || process.env;
    let cwd = process.cwd();
    let hasCustomCwd = parsed.options.cwd != null;
    let shouldSwitchCwd = hasCustomCwd && process.chdir !== undefined && !process.chdir.disabled;
    if (shouldSwitchCwd)
      try {
        process.chdir(parsed.options.cwd);
      } catch (error) {}
    let resolved;
    try {
      resolved = Tt.sync(parsed.command, {
        path: env[
          Jn({
            env,
          })
        ],
        pathExt: withoutPathExt ? path.delimiter : undefined,
      });
    } catch (error) {
    } finally {
      if (shouldSwitchCwd)
        try {
          process.chdir(cwd);
        } catch (error) {
          let code =
            error !== null && typeof error === "object" && typeof error.code === "string" ? error.code : "";
          if (!(/^E[A-Z0-9]+$/.test(code) || code === "UNKNOWN" || code.startsWith("Unknown system error")))
            throw error;
        }
    }
    if (resolved) resolved = path.resolve(hasCustomCwd ? parsed.options.cwd : "", resolved);
    return resolved;
  }
  function resolveCommand(parsed) {
    return resolveCommandAttempt(parsed) || resolveCommandAttempt(parsed, true);
  }
  cjsModule.exports = resolveCommand;
});
export { require_resolveCommand };

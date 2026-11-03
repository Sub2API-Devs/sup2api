/**
 * cross-spawn/lib/util/resolveCommand.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: cross-spawn@7.0.5..7.0.6
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { bt } from "../../../which/which.js";
import { Et } from "../../../unresolved-cjs/index.js";

//@ chunk-m4p5zn6n.js:3917-4564 cjs-fingerprint
var It = x(function (hi, Pt) {
  var J = importMetaRequire("path"),
    Tt = bt(),
    Jn = Et();
  function wt(e, n) {
    let r = e.options.env || process.env,
      cwd = process.cwd(),
      s = e.options.cwd != null,
      u = s && process.chdir !== void 0 && !process.chdir.disabled;
    if (u)
      try {
        process.chdir(e.options.cwd);
      } catch (error) {}
    let d;
    try {
      d = Tt.sync(e.command, { path: r[Jn({ env: r })], pathExt: n ? J.delimiter : void 0 });
    } catch (error) {
    } finally {
      if (u)
        try {
          process.chdir(cwd);
        } catch (error) {
          let f =
            error !== null && typeof error === "object" && typeof error.code === "string" ? error.code : "";
          if (!(/^E[A-Z0-9]+$/.test(f) || f === "UNKNOWN" || f.startsWith("Unknown system error")))
            throw error;
        }
    }
    if (d) d = J.resolve(s ? e.options.cwd : "", d);
    return d;
  }
  function er(e) {
    return wt(e) || wt(e, !0);
  }
  Pt.exports = er;
});

export { It };

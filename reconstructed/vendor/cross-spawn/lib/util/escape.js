/**
 * cross-spawn/lib/util/escape.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: cross-spawn@7.0.5..7.0.6
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-m4p5zn6n.js:4564-4874 cjs-fingerprint
var vt = x(function (rr, xe) {
  var Se = /([()\][%!^"`<>&|;, *?])/g;
  function tr(e) {
    return ((e = e.replace(Se, "^$1")), e);
  }
  function nr(e, n) {
    if (
      ((e = `${e}`),
      (e = e.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"')),
      (e = e.replace(/(?=(\\+?)?)\1$/, "$1$1")),
      (e = `"${e}"`),
      (e = e.replace(Se, "^$1")),
      n)
    )
      e = e.replace(Se, "^$1");
    return e;
  }
  rr.command = tr;
  rr.argument = nr;
});

export { vt };

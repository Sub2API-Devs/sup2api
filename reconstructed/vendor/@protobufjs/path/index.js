/**
 * @protobufjs/path/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @protobufjs/path@1.1.2
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:79292-79820 cjs-fingerprint
var ad = x(function (nd) {
  var xa = nd,
    sd = (xa.isAbsolute = function (t) {
      return /^(?:\/|\w+:)/.test(t);
    }),
    Ia = (xa.normalize = function (t) {
      t = t.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
      var parts = t.split("/"),
        i = sd(t),
        s = "";
      if (i) s = parts.shift() + "/";
      for (var n = 0; n < parts.length;)
        if (parts[n] === "..")
          if (n > 0 && parts[n - 1] !== "..") parts.splice(--n, 2);
          else if (i) parts.splice(n, 1);
          else ++n;
        else if (parts[n] === ".") parts.splice(n, 1);
        else ++n;
      return s + parts.join("/");
    });
  xa.resolve = function (t, r, i) {
    if (!i) r = Ia(r);
    if (sd(r)) return r;
    if (!i) t = Ia(t);
    return (t = t.replace(/(?:\/|^)[^/]+$/, "")).length ? Ia(t + "/" + r) : r;
  };
});

export { ad };

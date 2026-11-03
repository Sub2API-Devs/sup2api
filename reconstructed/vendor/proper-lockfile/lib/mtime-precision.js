/**
 * proper-lockfile/lib/mtime-precision.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: proper-lockfile@4.1.2
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-bmbhxpfm.js:17126-17645 cjs-fingerprint
var Je = x(function (Lt, Fe) {
  var Le = Symbol();
  function kt(e, r, n) {
    let i = r[Le];
    if (i)
      return r.stat(e, (c, h) => {
        if (c) return n(c);
        n(null, h.mtime, i);
      });
    let date = new Date(Math.ceil(Date.now() / 1000) * 1000 + 5);
    r.utimes(e, date, date, (c) => {
      if (c) return n(c);
      r.stat(e, (h, m) => {
        if (h) return n(h);
        let E = m.mtime.getTime() % 1000 === 0 ? "s" : "ms";
        if (!(Le in r))
          try {
            Object.defineProperty(r, Le, { value: E, configurable: !0 });
          } catch {}
        n(null, m.mtime, E);
      });
    });
  }
  function It(e) {
    let now = Date.now();
    if (e === "s") now = Math.ceil(now / 1000) * 1000;
    return new Date(now);
  }
  Lt.probe = kt;
  Lt.getMtime = It;
});

export { Je };

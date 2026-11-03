/**
 * proper-lockfile/lib/adapter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: proper-lockfile@4.1.2
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { ge } from "../../graceful-fs/graceful-fs.js";

//@ chunk-bmbhxpfm.js:20904-21622 cjs-fingerprint
var properLockfileAdapter = x(function (or, ot) {
  var Ut = ge();
  function At(e) {
    let r = ["mkdir", "realpath", "stat", "rmdir", "utimes"],
      n = { ...e };
    return (
      r.forEach((i) => {
        n[i] = (...u) => {
          let c = u.pop(),
            h;
          try {
            h = e[`${i}Sync`](...u);
          } catch (error) {
            return c(error);
          }
          c(null, h);
        };
      }),
      n
    );
  }
  function $t(e) {
    return (...r) =>
      new Promise((n, i) => {
        (r.push((u, c) => {
          if (u) i(u);
          else n(c);
        }),
          e(...r));
      });
  }
  function Wt(e) {
    return (...r) => {
      let n, i;
      if (
        (r.push((u, c) => {
          ((n = u), (i = c));
        }),
        e(...r),
        n)
      )
        throw n;
      return i;
    };
  }
  function Yt(e) {
    if (
      ((e = { ...e }),
      (e.fs = At(e.fs || Ut)),
      (typeof e.retries === "number" && e.retries > 0) ||
        (e.retries && typeof e.retries.retries === "number" && e.retries.retries > 0))
    )
      throw Object.assign(Error("Cannot use retries with the sync api"), { code: "ESYNC" });
    return e;
  }
  ot.exports = { toPromise: $t, toSync: Wt, toSyncOptions: Yt };
});

export { properLockfileAdapter };

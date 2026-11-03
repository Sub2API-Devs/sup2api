/**
 * proper-lockfile/lib/lockfile.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: proper-lockfile@4.1.2
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { ge } from "../../graceful-fs/graceful-fs.js";
import { He } from "../../retry/lib/retry.js";
import { Xe } from "../../signal-exit/index.js";
import { Je } from "./mtime-precision.js";

//@ chunk-bmbhxpfm.js:17645-20904 cjs-fingerprint
var it = x(function (Mt, ie) {
  var Ze = importMetaRequire("path"),
    Ne = ge(),
    et = He(),
    Dt = Xe(),
    me = Je(),
    A = {};
  function ne(e, r) {
    return r.lockfilePath || `${e}.lock`;
  }
  function Pe(e, r, n) {
    if (!r.realpath) return n(null, Ze.resolve(e));
    r.fs.realpath(e, n);
  }
  function De(e, r, n) {
    let i = ne(e, r);
    r.fs.mkdir(i, (u) => {
      if (!u)
        return me.probe(i, r.fs, (c, h, m) => {
          if (c) return (r.fs.rmdir(i, () => {}), n(c));
          n(null, h, m);
        });
      if (u.code !== "EEXIST") return n(u);
      if (r.stale <= 0)
        return n(Object.assign(Error("Lock file is already being held"), { code: "ELOCKED", file: e }));
      r.fs.stat(i, (c, h) => {
        if (c) {
          if (c.code === "ENOENT") return De(e, { ...r, stale: 0 }, n);
          return n(c);
        }
        if (!tt(h, r))
          return n(Object.assign(Error("Lock file is already being held"), { code: "ELOCKED", file: e }));
        rt(e, r, (m) => {
          if (m) return n(m);
          De(e, { ...r, stale: 0 }, n);
        });
      });
    });
  }
  function tt(e, r) {
    return e.mtime.getTime() < Date.now() - r.stale;
  }
  function rt(e, r, n) {
    r.fs.rmdir(ne(e, r), (i) => {
      if (i && i.code !== "ENOENT") return n(i);
      n();
    });
  }
  function pe(e, r) {
    let n = A[e];
    if (n.updateTimeout) return;
    if (
      ((n.updateDelay = n.updateDelay || r.update),
      (n.updateTimeout = setTimeout(() => {
        ((n.updateTimeout = null),
          r.fs.stat(n.lockfilePath, (i, u) => {
            let c = n.lastUpdate + r.stale < Date.now();
            if (i) {
              if (i.code === "ENOENT" || c) return be(e, n, Object.assign(i, { code: "ECOMPROMISED" }));
              return ((n.updateDelay = 1000), pe(e, r));
            }
            if (n.mtime.getTime() !== u.mtime.getTime())
              return be(
                e,
                n,
                Object.assign(Error("Unable to update lock within the stale threshold"), {
                  code: "ECOMPROMISED",
                }),
              );
            let mtime = me.getMtime(n.mtimePrecision);
            r.fs.utimes(n.lockfilePath, mtime, mtime, (E) => {
              let b = n.lastUpdate + r.stale < Date.now();
              if (n.released) return;
              if (E) {
                if (E.code === "ENOENT" || b) return be(e, n, Object.assign(E, { code: "ECOMPROMISED" }));
                return ((n.updateDelay = 1000), pe(e, r));
              }
              ((n.mtime = mtime), (n.lastUpdate = Date.now()), (n.updateDelay = null), pe(e, r));
            });
          }));
      }, n.updateDelay)),
      n.updateTimeout.unref)
    )
      n.updateTimeout.unref();
  }
  function be(e, r, n) {
    if (((r.released = !0), r.updateTimeout)) clearTimeout(r.updateTimeout);
    if (A[e] === r) delete A[e];
    r.options.onCompromised(n);
  }
  function Nt(e, r, n) {
    ((r = {
      stale: 1e4,
      update: null,
      realpath: !0,
      retries: 0,
      fs: Ne,
      onCompromised: (i) => {
        throw i;
      },
      ...r,
    }),
      (r.retries = r.retries || 0),
      (r.retries = typeof r.retries === "number" ? { retries: r.retries } : r.retries),
      (r.stale = Math.max(r.stale || 0, 2000)),
      (r.update = r.update == null ? r.stale / 2 : r.update || 0),
      (r.update = Math.max(Math.min(r.update, r.stale / 2), 1000)),
      Pe(e, r, (i, u) => {
        if (i) return n(i);
        let operation = et.operation(r.retries);
        operation.attempt(() => {
          De(u, r, (h, m, E) => {
            if (operation.retry(h)) return;
            if (h) return n(operation.mainError());
            let b = (A[u] = {
              lockfilePath: ne(u, r),
              mtime: m,
              mtimePrecision: E,
              options: r,
              lastUpdate: Date.now(),
            });
            (pe(u, r),
              n(null, (o) => {
                if (b.released)
                  return o && o(Object.assign(Error("Lock is already released"), { code: "ERELEASED" }));
                nt(u, { ...r, realpath: !1 }, o);
              }));
          });
        });
      }));
  }
  function nt(e, r, n) {
    ((r = { fs: Ne, realpath: !0, ...r }),
      Pe(e, r, (i, u) => {
        if (i) return n(i);
        let c = A[u];
        if (!c) return n(Object.assign(Error("Lock is not acquired/owned by you"), { code: "ENOTACQUIRED" }));
        (c.updateTimeout && clearTimeout(c.updateTimeout), (c.released = !0), delete A[u], rt(u, r, n));
      }));
  }
  function Pt(e, r, n) {
    ((r = { stale: 1e4, realpath: !0, fs: Ne, ...r }),
      (r.stale = Math.max(r.stale || 0, 2000)),
      Pe(e, r, (i, u) => {
        if (i) return n(i);
        r.fs.stat(ne(u, r), (c, h) => {
          if (c) return c.code === "ENOENT" ? n(null, !1) : n(c);
          return n(null, !tt(h, r));
        });
      }));
  }
  function Rt() {
    return A;
  }
  Dt(() => {
    for (let key in A) {
      let options = A[key].options;
      try {
        options.fs.rmdirSync(ne(key, options));
      } catch (error) {}
    }
  });
  Mt.lock = Nt;
  Mt.unlock = nt;
  Mt.check = Pt;
  Mt.getLocks = Rt;
});

export { it };

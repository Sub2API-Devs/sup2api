/**
 * which/which.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: which@2.0.2
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { gt } from "../isexe/index.js";

//@ chunk-m4p5zn6n.js:2251-3688 cjs-fingerprint
var bt = x(function (mi, xt) {
  var R = process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys",
    Q = importMetaRequire("path"),
    Zn = R ? ";" : ":",
    he = gt(),
    ht = (e) => Object.assign(Error(`not found: ${e}`), { code: "ENOENT" }),
    yt = (e, n) => {
      let r = n.colon || Zn,
        o =
          e.match(/\//) || (R && e.match(/\\/))
            ? [""]
            : [...(R ? [process.cwd()] : []), ...(n.path || process.env.PATH || "").split(r)],
        s = R ? n.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "",
        u = R ? s.split(r) : [""];
      if (R) {
        if (e.indexOf(".") !== -1 && u[0] !== "") u.unshift("");
      }
      return { pathEnv: o, pathExt: u, pathExtExe: s };
    },
    St = (e, n, r) => {
      if (typeof n === "function") ((r = n), (n = {}));
      if (!n) n = {};
      let { pathEnv: pathEnv, pathExt: pathExt, pathExtExe: pathExtExe } = yt(e, n),
        d = [],
        l = (p) =>
          new Promise((h, S) => {
            if (p === pathEnv.length) return n.all && d.length ? h(d) : S(ht(e));
            let y = pathEnv[p],
              w = /^".*"$/.test(y) ? y.slice(1, -1) : y,
              joined = Q.join(w, e),
              v = !w && /^\.[\\\/]/.test(e) ? e.slice(0, 2) + joined : joined;
            h(f(v, p, 0));
          }),
        f = (p, h, S) =>
          new Promise((y, w) => {
            if (S === pathExt.length) return y(l(h + 1));
            let E = pathExt[S];
            he(p + E, { pathExt: pathExtExe }, (v, A) => {
              if (!v && A)
                if (n.all) d.push(p + E);
                else return y(p + E);
              return y(f(p, h, S + 1));
            });
          });
      return r ? l(0).then((p) => r(null, p), r) : l(0);
    },
    Qn = (e, n) => {
      n = n || {};
      let { pathEnv: pathEnv, pathExt: pathExt, pathExtExe: pathExtExe } = yt(e, n),
        u = [];
      for (let d = 0; d < pathEnv.length; d++) {
        let l = pathEnv[d],
          f = /^".*"$/.test(l) ? l.slice(1, -1) : l,
          joined = Q.join(f, e),
          h = !f && /^\.[\\\/]/.test(e) ? e.slice(0, 2) + joined : joined;
        for (let S = 0; S < pathExt.length; S++) {
          let y = h + pathExt[S];
          try {
            if (he.sync(y, { pathExt: pathExtExe }))
              if (n.all) u.push(y);
              else return y;
          } catch (error) {}
        }
      }
      if (n.all && u.length) return u;
      if (n.nothrow) return null;
      throw ht(e);
    };
  xt.exports = St;
  St.sync = Qn;
});

export { bt };

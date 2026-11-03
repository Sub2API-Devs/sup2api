/**
 * @smithy/middleware-stack/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/middleware-stack@4.2.0..4.2.14
 * pieces: chunk-ke7ft91e.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-ke7ft91e.js:307-3961 cjs-fingerprint
var q = x(function (J) {
  var C = (e, t) => {
      let r = [];
      if (e) r.push(e);
      if (t) for (let n of t) r.push(n);
      return r;
    },
    v = (e, t) => `${e || "anonymous"}${t && t.length > 0 ? ` (a.k.a. ${t.join(",")})` : ""}`,
    b = () => {
      let e = [],
        t = [],
        r = !1,
        n = new Set(),
        a = (i) =>
          i.sort((s, l) => A[l.step] - A[s.step] || P[l.priority || "normal"] - P[s.priority || "normal"]),
        o = (i) => {
          let s = !1,
            l = (h) => {
              let m = C(h.name, h.aliases);
              if (m.includes(i)) {
                s = !0;
                for (let c of m) n.delete(c);
                return !1;
              }
              return !0;
            };
          return ((e = e.filter(l)), (t = t.filter(l)), s);
        },
        d = (i) => {
          let s = !1,
            l = (h) => {
              if (h.middleware === i) {
                s = !0;
                for (let m of C(h.name, h.aliases)) n.delete(m);
                return !1;
              }
              return !0;
            };
          return ((e = e.filter(l)), (t = t.filter(l)), s);
        },
        u = (i) => (
          e.forEach((s) => {
            i.add(s.middleware, { ...s });
          }),
          t.forEach((s) => {
            i.addRelativeTo(s.middleware, { ...s });
          }),
          i.identifyOnResolve?.(I.identifyOnResolve()),
          i
        ),
        g = (i) => {
          let s = [];
          return (
            i.before.forEach((l) => {
              if (l.before.length === 0 && l.after.length === 0) s.push(l);
              else s.push(...g(l));
            }),
            s.push(i),
            i.after.reverse().forEach((l) => {
              if (l.before.length === 0 && l.after.length === 0) s.push(l);
              else s.push(...g(l));
            }),
            s
          );
        },
        w = (i = !1) => {
          let s = [],
            l = [],
            h = {};
          return (
            e.forEach((c) => {
              let f = { ...c, before: [], after: [] };
              for (let p of C(f.name, f.aliases)) h[p] = f;
              s.push(f);
            }),
            t.forEach((c) => {
              let f = { ...c, before: [], after: [] };
              for (let p of C(f.name, f.aliases)) h[p] = f;
              l.push(f);
            }),
            l.forEach((c) => {
              if (c.toMiddleware) {
                let f = h[c.toMiddleware];
                if (f === void 0) {
                  if (i) return;
                  throw Error(
                    `${c.toMiddleware} is not found when adding ${v(c.name, c.aliases)} middleware ${c.relation} ${c.toMiddleware}`,
                  );
                }
                if (c.relation === "after") f.after.push(c);
                if (c.relation === "before") f.before.push(c);
              }
            }),
            a(s)
              .map(g)
              .reduce((c, f) => (c.push(...f), c), [])
          );
        },
        I = {
          add: (i, s = {}) => {
            let { name: l, override: override, aliases: aliases } = s,
              c = { step: "initialize", priority: "normal", middleware: i, ...s },
              f = C(l, aliases);
            if (f.length > 0) {
              if (f.some((p) => n.has(p))) {
                if (!override) throw Error(`Duplicate middleware name '${v(l, aliases)}'`);
                for (let p of f) {
                  let index = e.findIndex((M) => M.name === p || M.aliases?.some((N) => N === p));
                  if (index === -1) continue;
                  let y = e[index];
                  if (y.step !== c.step || c.priority !== y.priority)
                    throw Error(
                      `"${v(y.name, y.aliases)}" middleware with ${y.priority} priority in ${y.step} step cannot be overridden by "${v(l, aliases)}" middleware with ${c.priority} priority in ${c.step} step.`,
                    );
                  e.splice(index, 1);
                }
              }
              for (let p of f) n.add(p);
            }
            e.push(c);
          },
          addRelativeTo: (i, s) => {
            let { name: l, override: override, aliases: aliases } = s,
              c = { middleware: i, ...s },
              f = C(l, aliases);
            if (f.length > 0) {
              if (f.some((p) => n.has(p))) {
                if (!override) throw Error(`Duplicate middleware name '${v(l, aliases)}'`);
                for (let p of f) {
                  let index = t.findIndex((M) => M.name === p || M.aliases?.some((N) => N === p));
                  if (index === -1) continue;
                  let y = t[index];
                  if (y.toMiddleware !== c.toMiddleware || y.relation !== c.relation)
                    throw Error(
                      `"${v(y.name, y.aliases)}" middleware ${y.relation} "${y.toMiddleware}" middleware cannot be overridden by "${v(l, aliases)}" middleware ${c.relation} "${c.toMiddleware}" middleware.`,
                    );
                  t.splice(index, 1);
                }
              }
              for (let p of f) n.add(p);
            }
            t.push(c);
          },
          clone: () => u(b()),
          use: (i) => {
            i.applyToStack(I);
          },
          remove: (i) => {
            if (typeof i === "string") return o(i);
            else return d(i);
          },
          removeByTag: (i) => {
            let s = !1,
              l = (h) => {
                let { tags: tags, name: c, aliases: aliases } = h;
                if (tags && tags.includes(i)) {
                  let p = C(c, aliases);
                  for (let S of p) n.delete(S);
                  return ((s = !0), !1);
                }
                return !0;
              };
            return ((e = e.filter(l)), (t = t.filter(l)), s);
          },
          concat: (i) => {
            let s = u(b());
            return (
              s.use(i),
              s.identifyOnResolve(r || s.identifyOnResolve() || (i.identifyOnResolve?.() ?? !1)),
              s
            );
          },
          applyToStack: u,
          identify: () =>
            w(!0).map((i) => {
              let s = i.step ?? i.relation + " " + i.toMiddleware;
              return v(i.name, i.aliases) + " - " + s;
            }),
          identifyOnResolve(i) {
            if (typeof i === "boolean") r = i;
            return r;
          },
          resolve: (i, s) => {
            for (let l of w()
              .map((h) => h.middleware)
              .reverse())
              i = l(i, s);
            if (r) console.log(I.identify());
            return i;
          },
        };
      return I;
    },
    A = { initialize: 5, serialize: 4, build: 3, finalizeRequest: 2, deserialize: 1 },
    P = { high: 3, normal: 2, low: 1 };
  J.constructStack = b;
});

export { q };

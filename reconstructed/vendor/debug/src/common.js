/**
 * debug/src/common.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: debug@4.4.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { ihs } from "../../ms/index.js";

//@ chunk-h6b7mazd.js:28648-30759 cjs-fingerprint
var vr = x(function (Cd, qs) {
  function Mc(e) {
    ((r.debug = r),
      (r.default = r),
      (r.coerce = l),
      (r.disable = i),
      (r.enable = o),
      (r.enabled = a),
      (r.humanize = ihs()),
      (r.destroy = f),
      Object.keys(e).forEach((c) => {
        r[c] = e[c];
      }),
      (r.names = []),
      (r.skips = []),
      (r.formatters = {}));
    function t(c) {
      let p = 0;
      for (let d = 0; d < c.length; d++) ((p = (p << 5) - p + c.charCodeAt(d)), (p |= 0));
      return r.colors[Math.abs(p) % r.colors.length];
    }
    r.selectColor = t;
    function r(c) {
      let p,
        d = null,
        b,
        m;
      function g(...h) {
        if (!g.enabled) return;
        let E = g,
          N = Number(new Date()),
          v = N - (p || N);
        if (
          ((E.diff = v),
          (E.prev = p),
          (E.curr = N),
          (p = N),
          (h[0] = r.coerce(h[0])),
          typeof h[0] !== "string")
        )
          h.unshift("%O");
        let _ = 0;
        ((h[0] = h[0].replace(/%([a-zA-Z%])/g, (G, T) => {
          if (G === "%%") return "%";
          _++;
          let J = r.formatters[T];
          if (typeof J === "function") {
            let D = h[_];
            ((G = J.call(E, D)), h.splice(_, 1), _--);
          }
          return G;
        })),
          r.formatArgs.call(E, h),
          (E.log || r.log).apply(E, h));
      }
      if (
        ((g.namespace = c),
        (g.useColors = r.useColors()),
        (g.color = r.selectColor(c)),
        (g.extend = n),
        (g.destroy = r.destroy),
        Object.defineProperty(g, "enabled", {
          enumerable: !0,
          configurable: !1,
          get: () => {
            if (d !== null) return d;
            if (b !== r.namespaces) ((b = r.namespaces), (m = r.enabled(c)));
            return m;
          },
          set: (h) => {
            d = h;
          },
        }),
        typeof r.init === "function")
      )
        r.init(g);
      return g;
    }
    function n(c, p) {
      let d = r(this.namespace + (typeof p > "u" ? ":" : p) + c);
      return ((d.log = this.log), d);
    }
    function o(c) {
      (r.save(c), (r.namespaces = c), (r.names = []), (r.skips = []));
      let filtered = (typeof c === "string" ? c : "").trim().replace(" ", ",").split(",").filter(Boolean);
      for (let d of filtered)
        if (d[0] === "-") r.skips.push(d.slice(1));
        else r.names.push(d);
    }
    function s(c, p) {
      let d = 0,
        b = 0,
        m = -1,
        g = 0;
      while (d < c.length)
        if (b < p.length && (p[b] === c[d] || p[b] === "*"))
          if (p[b] === "*") ((m = b), (g = d), b++);
          else (d++, b++);
        else if (m !== -1) ((b = m + 1), g++, (d = g));
        else return !1;
      while (b < p.length && p[b] === "*") b++;
      return b === p.length;
    }
    function i() {
      let joined = [...r.names, ...r.skips.map((skip) => "-" + skip)].join(",");
      return (r.enable(""), joined);
    }
    function a(c) {
      for (let skip of r.skips) if (s(c, skip)) return !1;
      for (let p of r.names) if (s(c, p)) return !0;
      return !1;
    }
    function l(c) {
      if (c instanceof Error) return c.stack || c.message;
      return c;
    }
    function f() {
      console.warn(
        "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.",
      );
    }
    return (r.enable(r.load()), r);
  }
  qs.exports = Mc;
});

export { vr };

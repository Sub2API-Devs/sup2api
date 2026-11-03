/**
 * picomatch/lib/picomatch.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: picomatch@4.0.4..4.0.7
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { rN } from "./scan.js";
import { lN } from "./parse.js";
import { np } from "./utils.js";
import { tp } from "./constants.js";

//@ chunk-fq0cr76a.js:317963-320219 cjs-fingerprint
var uN = x(function (Kge, cN) {
  var Cq = rN(),
    xg = lN(),
    _g = np(),
    Rq = tp(),
    Iq = (e) => e && typeof e === "object" && !Array.isArray(e),
    Jr = (e, n, r = !1) => {
      if (Array.isArray(e)) {
        let mapped = e.map((L) => Jr(L, n, r));
        return (L) => {
          for (let V of mapped) {
            let K = V(L);
            if (K) return K;
          }
          return !1;
        };
      }
      let s = Iq(e) && e.tokens && e.input;
      if (e === "" || (typeof e !== "string" && !s))
        throw TypeError("Expected pattern to be a non-empty string");
      let h = n || {},
        windows = h.windows,
        b = s ? Jr.compileRe(e, n) : Jr.makeRe(e, n, !1, !0),
        state = b.state;
      delete b.state;
      let w = () => !1;
      if (h.ignore) {
        let D = { ...n, ignore: null, onMatch: null, onResult: null };
        w = Jr(h.ignore, D, r);
      }
      let R = (D, O = !1) => {
        let {
            isMatch: isMatch,
            match: match,
            output: output,
          } = Jr.test(D, b, n, { glob: e, posix: windows }),
          q = {
            glob: e,
            state: state,
            regex: b,
            posix: windows,
            input: D,
            output: output,
            match: match,
            isMatch: isMatch,
          };
        if (typeof h.onResult === "function") h.onResult(q);
        if (isMatch === !1) return ((q.isMatch = !1), O ? q : !1);
        if (w(D)) {
          if (typeof h.onIgnore === "function") h.onIgnore(q);
          return ((q.isMatch = !1), O ? q : !1);
        }
        if (typeof h.onMatch === "function") h.onMatch(q);
        return O ? q : !0;
      };
      if (r) R.state = state;
      return R;
    };
  Jr.test = (e, n, r, { glob: s, posix: h } = {}) => {
    if (typeof e !== "string") throw TypeError("Expected input to be a string");
    if (e === "") return { isMatch: !1, output: "" };
    let y = r || {},
      b = y.format || (h ? _g.toPosixSlashes : null),
      S = e === s,
      w = S && b ? b(e) : e;
    if (S === !1) ((w = b ? b(e) : e), (S = w === s));
    if (S === !1 || y.capture === !0)
      if (y.matchBase === !0 || y.basename === !0) S = Jr.matchBase(e, n, r, h);
      else S = n.exec(w);
    return { isMatch: Boolean(S), match: S, output: w };
  };
  Jr.matchBase = (e, n, r) => (n instanceof RegExp ? n : Jr.makeRe(n, r)).test(_g.basename(e));
  Jr.isMatch = (e, n, r) => Jr(n, r)(e);
  Jr.parse = (e, n) => {
    if (Array.isArray(e)) return e.map((r) => Jr.parse(r, n));
    return xg(e, { ...n, fastpaths: !1 });
  };
  Jr.scan = (e, n) => Cq(e, n);
  Jr.compileRe = (e, n, r = !1, s = !1) => {
    if (r === !0) return e.output;
    let h = n || {},
      y = h.contains ? "" : "^",
      b = h.contains ? "" : "$",
      S = `${y}(?:${e.output})${b}`;
    if (e && e.negated === !0) S = `^(?!${S}).*$`;
    let toRegex = Jr.toRegex(S, n);
    if (s === !0) toRegex.state = e;
    return toRegex;
  };
  Jr.makeRe = (e, n = {}, r = !1, s = !1) => {
    if (!e || typeof e !== "string") throw TypeError("Expected a non-empty string");
    let h = { negated: !1, fastpaths: !0 };
    if (n.fastpaths !== !1 && (e[0] === "." || e[0] === "*")) h.output = xg.fastpaths(e, n);
    if (!h.output) h = xg(e, n);
    return Jr.compileRe(h, n, r, s);
  };
  Jr.toRegex = (e, n) => {
    try {
      let r = n || {};
      return new RegExp(e, r.flags || (r.nocase ? "i" : ""));
    } catch (error) {
      if (n && n.debug === !0) throw error;
      return /$^/;
    }
  };
  Jr.constants = Rq;
  cN.exports = Jr;
});

export { uN };

/**
 * chalk/source/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: chalk@5.6.0..5.6.2
 * pieces: chunk-4ymxyb4g.js (14)
 * attribution: esm-layout 5, esm-fingerprint 9
 */
import { M, h } from "./vendor/supports-color/index.js";

//@ chunk-4ymxyb4g.js:4788-4951 esm-layout
function S(e, r, t) {
  let index = e.indexOf(r);
  if (index === -1) return e;
  let n = r.length,
    a = 0,
    c = "";
  do ((c += e.slice(a, index) + r + t), (a = index + n), (index = e.indexOf(r, a)));
  while (index !== -1);
  return ((c += e.slice(a)), c);
}
//@ chunk-4ymxyb4g.js:4951-5109 esm-layout
function L(e, r, t, o) {
  let n = 0,
    a = "";
  do {
    let c = e[o - 1] === "\r";
    ((a +=
      e.slice(n, c ? o - 1 : o) +
      r +
      (c
        ? `\r
`
        : `
`) +
      t),
      (n = o + 1),
      (o = e.indexOf(
        `
`,
        n,
      )));
  } while (o !== -1);
  return ((a += e.slice(n)), a);
}
//@ chunk-4ymxyb4g.js:5109-5455 esm-fingerprint
var { stdout: stdout, stderr: stderr } = M,
  R = Symbol("GENERATOR"),
  m = Symbol("STYLER"),
  d = Symbol("IS_EMPTY"),
  k = ["ansi", "ansi", "ansi256", "ansi16m"],
  create = Object.create(null),
  H = (e, r = {}) => {
    if (r.level && !(Number.isInteger(r.level) && r.level >= 0 && r.level <= 3))
      throw Error("The `level` option should be an integer from 0 to 3");
    let t = stdout ? stdout.level : 0;
    e.level = r.level === void 0 ? t : r.level;
  };
//@ chunk-4ymxyb4g.js:5455-5493 esm-layout
class xoo {
  constructor(e) {
    return w(e);
  }
}
//@ chunk-4ymxyb4g.js:5493-5585 esm-fingerprint
var w = (e) => {
  let r = (...t) => t.join(" ");
  return (H(r, e), Object.setPrototypeOf(r, g.prototype), r);
};
//@ chunk-4ymxyb4g.js:5585-5611 esm-layout
function g(e) {
  return w(e);
}
//@ chunk-4ymxyb4g.js:5611-5665 esm-fingerprint
Object.setPrototypeOf(g.prototype, Function.prototype);
//@ chunk-4ymxyb4g.js:5665-5809 esm-fingerprint
for (let [e, r] of Object.entries(h))
  create[e] = {
    get() {
      let t = C(this, y(r.open, r.close, this[m]), this[d]);
      return (Object.defineProperty(this, e, { value: t }), t);
    },
  };
//@ chunk-4ymxyb4g.js:5809-5910 esm-fingerprint
create.visible = {
  get() {
    let e = C(this, this[m], !0);
    return (Object.defineProperty(this, "visible", { value: e }), e);
  },
};
//@ chunk-4ymxyb4g.js:5910-6184 esm-fingerprint
var T = (e, r, t, ...o) => {
    if (e === "rgb") {
      if (r === "ansi16m") return h[t].ansi16m(...o);
      if (r === "ansi256") return h[t].ansi256(h.rgbToAnsi256(...o));
      return h[t].ansi(h.rgbToAnsi(...o));
    }
    if (e === "hex") return T("rgb", r, t, ...h.hexToRgb(...o));
    return h[t][e](...o);
  },
  J = ["rgb", "hex", "ansi256"];
//@ chunk-4ymxyb4g.js:6184-6513 esm-fingerprint
for (let e of J) {
  create[e] = {
    get() {
      let { level: level } = this;
      return function (...o) {
        let n = y(T(e, k[level], "color", ...o), h.color.close, this[m]);
        return C(this, n, this[d]);
      };
    },
  };
  let r = "bg" + e[0].toUpperCase() + e.slice(1);
  create[r] = {
    get() {
      let { level: level } = this;
      return function (...o) {
        let n = y(T(e, k[level], "bgColor", ...o), h.bgColor.close, this[m]);
        return C(this, n, this[d]);
      };
    },
  };
}
//@ chunk-4ymxyb4g.js:6513-7121 esm-fingerprint
var defineProperties = Object.defineProperties(() => {}, {
    ...create,
    level: {
      enumerable: !0,
      get() {
        return this[R].level;
      },
      set(e) {
        this[R].level = e;
      },
    },
  }),
  y = (e, r, t) => {
    let o, n;
    if (t === void 0) ((o = e), (n = r));
    else ((o = t.openAll + e), (n = r + t.closeAll));
    return { open: e, close: r, openAll: o, closeAll: n, parent: t };
  },
  C = (e, r, t) => {
    let o = (...n) => Q(o, n.length === 1 ? "" + n[0] : n.join(" "));
    return (Object.setPrototypeOf(o, defineProperties), (o[R] = e), (o[m] = r), (o[d] = t), o);
  },
  Q = (e, r) => {
    if (e.level <= 0 || !r) return e[d] ? "" : r;
    let t = e[m];
    if (t === void 0) return r;
    let { openAll: openAll, closeAll: closeAll } = t;
    if (r.includes("\x1B")) while (t !== void 0) ((r = S(r, t.close, t.open)), (t = t.parent));
    let index = r.indexOf(`
`);
    if (index !== -1) r = L(r, closeAll, openAll, index);
    return openAll + r + closeAll;
  };
//@ chunk-4ymxyb4g.js:7121-7160 esm-fingerprint
Object.defineProperties(g.prototype, create);
//@ chunk-4ymxyb4g.js:7160-7196 esm-layout
var Z = g(),
  Re = g({ level: stderr ? stderr.level : 0 });

export { Z, xoo };

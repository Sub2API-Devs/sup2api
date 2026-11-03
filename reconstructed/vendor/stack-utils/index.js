/**
 * stack-utils/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: stack-utils@2.0.6
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { jg } from "../escape-string-regexp/index.js";

//@ chunk-bzr73sfg.js:126279-129747 cjs-fingerprint
var Qg = x(function (KA, Xg) {
  var K1 = jg(),
    W1 = typeof process === "object" && process && typeof process.cwd === "function" ? process.cwd() : ".",
    mapped = []
      .concat(importMetaRequire("module").builtinModules, "bootstrap_node", "node")
      .map(
        (n) =>
          new RegExp(
            `(?:\\((?:node:)?${n}(?:\\.js)?:\\d+:\\d+\\)$|^\\s*at (?:node:)?${n}(?:\\.js)?:\\d+:\\d+$)`,
          ),
      );
  mapped.push(
    /\((?:node:)?internal\/[^:]+:\d+:\d+\)$/,
    /\s*at (?:node:)?internal\/[^:]+:\d+:\d+$/,
    /\/\.node-spawn-wrap-\w+-\w+\/node:\d+:\d+\)?$/,
  );
  class Yd {
    constructor(n) {
      if (((n = { ignoredPackages: [], ...n }), "internals" in n === !1)) n.internals = Yd.nodeInternals();
      if ("cwd" in n === !1) n.cwd = W1;
      ((this._cwd = n.cwd.replace(/\\/g, "/")),
        (this._internals = [].concat(n.internals, Y1(n.ignoredPackages))),
        (this._wrapCallSite = n.wrapCallSite || !1));
    }
    static nodeInternals() {
      return [...mapped];
    }
    clean(n, u = 0) {
      if (((u = " ".repeat(u)), !Array.isArray(n)))
        n = n.split(`
`);
      if (!/^\s*at /.test(n[0]) && /^\s*at /.test(n[1])) n = n.slice(1);
      let f = !1,
        m = null,
        p = [];
      return (
        n.forEach((g) => {
          if (((g = g.replace(/\\/g, "/")), this._internals.some((_internal) => _internal.test(g)))) return;
          let matches = /^\s*at /.test(g);
          if (f) g = g.trimEnd().replace(/^(\s+)at /, "$1");
          else if (((g = g.trim()), matches)) g = g.slice(3);
          if (((g = g.replace(`${this._cwd}/`, "")), g))
            if (matches) {
              if (m) (p.push(m), (m = null));
              p.push(g);
            } else ((f = !0), (m = g));
        }),
        p
          .map(
            (g) => `${u}${g}
`,
          )
          .join("")
      );
    }
    captureString(n, u = this.captureString) {
      if (typeof n === "function") ((u = n), (n = 1 / 0));
      let { stackTraceLimit: stackTraceLimit } = Error;
      if (n) Error.stackTraceLimit = n;
      let m = {};
      Error.captureStackTrace(m, u);
      let { stack: stack } = m;
      return ((Error.stackTraceLimit = stackTraceLimit), this.clean(stack));
    }
    capture(n, u = this.capture) {
      if (typeof n === "function") ((u = n), (n = 1 / 0));
      let { prepareStackTrace: prepareStackTrace, stackTraceLimit: stackTraceLimit } = Error;
      if (
        ((Error.prepareStackTrace = (E, T) => {
          if (this._wrapCallSite) return T.map(this._wrapCallSite);
          return T;
        }),
        n)
      )
        Error.stackTraceLimit = n;
      let p = {};
      Error.captureStackTrace(p, u);
      let { stack: stack } = p;
      return (
        Object.assign(Error, { prepareStackTrace: prepareStackTrace, stackTraceLimit: stackTraceLimit }),
        stack
      );
    }
    at(n = this.at) {
      let [u] = this.capture(1, n);
      if (!u) return {};
      let f = { line: u.getLineNumber(), column: u.getColumnNumber() };
      if ((Vg(f, u.getFileName(), this._cwd), u.isConstructor()))
        Object.defineProperty(f, "constructor", { value: !0, configurable: !0 });
      if (u.isEval()) f.evalOrigin = u.getEvalOrigin();
      if (u.isNative()) f.native = !0;
      let m;
      try {
        m = u.getTypeName();
      } catch (error) {}
      if (m && m !== "Object" && m !== "[object Object]") f.type = m;
      let functionName = u.getFunctionName();
      if (functionName) f.function = functionName;
      let methodName = u.getMethodName();
      if (methodName && functionName !== methodName) f.method = methodName;
      return f;
    }
    parseLine(n) {
      let u = n && n.match(regExp);
      if (!u) return null;
      let f = u[1] === "new",
        m = u[2],
        p = u[3],
        g = u[4],
        E = Number(u[5]),
        T = Number(u[6]),
        A = u[7],
        D = u[8],
        O = u[9],
        _ = u[10] === "native",
        U = u[11] === ")",
        L,
        P = {};
      if (D) P.line = Number(D);
      if (O) P.column = Number(O);
      if (U && A) {
        let z = 0;
        for (let G = A.length - 1; G > 0; G--)
          if (A.charAt(G) === ")") z++;
          else if (A.charAt(G) === "(" && A.charAt(G - 1) === " ") {
            if ((z--, z === -1 && A.charAt(G - 1) === " ")) {
              let sliced = A.slice(0, G - 1);
              ((A = A.slice(G + 1)), (m += ` (${sliced}`));
              break;
            }
          }
      }
      if (m) {
        let match = m.match(V1);
        if (match) ((m = match[1]), (L = match[2]));
      }
      if ((Vg(P, A, this._cwd), f)) Object.defineProperty(P, "constructor", { value: !0, configurable: !0 });
      if (p)
        ((P.evalOrigin = p), (P.evalLine = E), (P.evalColumn = T), (P.evalFile = g && g.replace(/\\/g, "/")));
      if (_) P.native = !0;
      if (m) P.function = m;
      if (L && m !== L) P.method = L;
      return P;
    }
  }
  function Vg(n, u, f) {
    if (u) {
      if (((u = u.replace(/\\/g, "/")), u.startsWith(`${f}/`))) u = u.slice(f.length + 1);
      n.file = u;
    }
  }
  function Y1(n) {
    if (n.length === 0) return [];
    let mapped = n.map((f) => K1(f));
    return new RegExp(`[/\\\\]node_modules[/\\\\](?:${mapped.join("|")})[/\\\\][^:]+:\\d+:\\d+`);
  }
  var regExp = new RegExp(
      "^(?:\\s*at )?(?:(new) )?(?:(.*?) \\()?(?:eval at ([^ ]+) \\((.+?):(\\d+):(\\d+)\\), )?(?:(.+?):(\\d+):(\\d+)|(native))(\\)?)$",
    ),
    V1 = /^(.*?) \[as (.*?)\]$/;
  Xg.exports = Yd;
});

export { Qg };

/**
 * ajv-formats/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv-formats@3.0.1
 * pieces: chunk-zykv69v4.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { X } from "./formats.js";
import { re } from "./limit.js";
import { uh } from "../../ajv/dist/compile/codegen/index.js";

//@ chunk-zykv69v4.js:9708-10458 cjs-fingerprint
var oe = x(function (P, se) {
  Object.defineProperty(P, "__esModule", { value: !0 });
  var y = X(),
    Oe = re(),
    w = uh(),
    ae = new w.Name("fullFormats"),
    je = new w.Name("fastFormats"),
    C = (e, t = { keywords: !0 }) => {
      if (Array.isArray(t)) return (ne(e, t, y.fullFormats, ae), e);
      let [r, a] = t.mode === "fast" ? [y.fastFormats, je] : [y.fullFormats, ae],
        n = t.formats || y.formatNames;
      if ((ne(e, n, r, a), t.keywords)) (0, Oe.default)(e);
      return e;
    };
  C.get = (e, t = "full") => {
    let a = (t === "fast" ? y.fastFormats : y.fullFormats)[e];
    if (!a) throw Error(`Unknown format "${e}"`);
    return a;
  };
  function ne(e, t, r, a) {
    var n, s;
    ((n = (s = e.opts.code).formats) !== null && n !== void 0) ||
      (s.formats = w._`require("ajv-formats/dist/formats").${a}`);
    for (let o of t) e.addFormat(o, r[o]);
  }
  se.exports = P = C;
  Object.defineProperty(P, "__esModule", { value: !0 });
  P.default = C;
});

export { oe };

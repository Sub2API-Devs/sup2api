/**
 * ajv/dist/compile/validate/defaults.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../codegen/index.js";
import { ew } from "../util.js";

//@ chunk-s82q9s4x.js:30071-30715 cjs-fingerprint
var Hs = x(function (Fs) {
  Object.defineProperty(Fs, "__esModule", { value: !0 });
  Fs.assignDefaults = void 0;
  var B = uh(),
    Ks = ew();
  function nu(e, t) {
    let { properties: properties, items: items } = e.schema;
    if (t === "object" && properties) for (let key in properties) Us(e, key, properties[key].default);
    else if (t === "array" && Array.isArray(items)) items.forEach((n, o) => Us(e, o, n.default));
  }
  Fs.assignDefaults = nu;
  function Us(e, t, r) {
    let { gen: gen, compositeRule: compositeRule, data: o, opts: opts } = e;
    if (r === void 0) return;
    let a = B._`${o}${B.getProperty(t)}`;
    if (compositeRule) {
      Ks.checkStrictMode(e, `default is ignored for: ${a}`);
      return;
    }
    let c = B._`${a} === undefined`;
    if (opts.useDefaults === "empty") c = B._`${c} || ${a} === null || ${a} === ""`;
    gen.if(c, B._`${a} = ${B.stringify(r)}`);
  }
});

export { Hs };

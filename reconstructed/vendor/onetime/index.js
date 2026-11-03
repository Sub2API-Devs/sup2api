/**
 * onetime/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: onetime@7.0.0
 * pieces: chunk-m4p5zn6n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Ee } from "../mimic-function/index.js";

//@ chunk-m4p5zn6n.js:9126-9455 esm-layout
var weakMap = new WeakMap(),
  zt = (e, n = {}) => {
    if (typeof e !== "function") throw TypeError("Expected a function");
    let r,
      o = 0,
      s = e.displayName || e.name || "<anonymous>",
      u = function (...d) {
        if ((weakMap.set(u, ++o), o === 1)) ((r = e.apply(this, d)), (e = null));
        else if (n.throw === !0) throw Error(`Function \`${s}\` can only be called once`);
        return r;
      };
    return (Ee(u, e), weakMap.set(u, o), u);
  };
//@ chunk-m4p5zn6n.js:9455-9596 esm-fingerprint
zt.callCount = (e) => {
  if (!weakMap.has(e))
    throw Error(`The given function \`${e.name}\` is not wrapped by the \`onetime\` package`);
  return weakMap.get(e);
};

export { zt };

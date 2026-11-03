/**
 * @azure/core-client/dist/esm/operationHelpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-client@1.9.2..1.10.0
 * pieces: chunk-mrx6y2r5.js (5)
 * attribution: esm-fingerprint 4, esm-layout 1
 */
import { state_2 } from "../commonjs/state-cjs.js";

//@ chunk-mrx6y2r5.js:68828-69300 esm-fingerprint
function Nt(e, t, r) {
  let { parameterPath: parameterPath, mapper: mapper } = t,
    i;
  if (typeof parameterPath === "string") parameterPath = [parameterPath];
  if (Array.isArray(parameterPath)) {
    if (parameterPath.length > 0)
      if (mapper.isConstant) i = mapper.defaultValue;
      else {
        let s = Rd(e, parameterPath);
        if (!s.propertyFound && r) s = Rd(r, parameterPath);
        let a = !1;
        if (!s.propertyFound)
          a = mapper.required || (parameterPath[0] === "options" && parameterPath.length === 2);
        i = a ? mapper.defaultValue : s.propertyValue;
      }
  } else {
    if (mapper.required) i = {};
    for (let key in parameterPath) {
      let a = mapper.type.modelProperties[key],
        c = parameterPath[key],
        l = Nt(e, { parameterPath: c, mapper: a }, r);
      if (l !== void 0) {
        if (!i) i = {};
        i[key] = l;
      }
    }
  }
  return i;
}
//@ chunk-mrx6y2r5.js:69300-69471 esm-fingerprint
function Rd(e, t) {
  let r = { propertyFound: !1 },
    n = 0;
  for (; n < t.length; ++n) {
    let o = t[n];
    if (e && o in e) e = e[o];
    else break;
  }
  if (n === t.length) ((r.propertyValue = e), (r.propertyFound = !0));
  return r;
}
//@ chunk-mrx6y2r5.js:69471-69528 esm-fingerprint
var wd = Symbol.for("@azure/core-client original request");
//@ chunk-mrx6y2r5.js:69528-69558 esm-layout
function Gp(e) {
  return wd in e;
}
//@ chunk-mrx6y2r5.js:69558-69687 esm-fingerprint
function ft(e) {
  if (Gp(e)) return ft(e[wd]);
  let t = state_2.operationRequestMap.get(e);
  if (!t) ((t = {}), state_2.operationRequestMap.set(e, t));
  return t;
}

export { ft, Nt };

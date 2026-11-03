/**
 * @modelcontextprotocol/sdk/dist/cjs/validation/ajv-provider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-zykv69v4.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */
import { L } from "../../esm/shared/protocol.js";
import { Re } from "../../../../../../runtime/bun-runtime.js";
import { nlr } from "../../../../../ajv/dist/ajv.js";
import { oe } from "../../../../../ajv-formats/dist/index.js";

//@ chunk-zykv69v4.js:27574-27722 esm-layout
function vGn(e, t) {
  let r = { ...e };
  for (let key in t) {
    let n = key,
      s = t[n];
    if (s === void 0) continue;
    let o = r[n];
    if (L(o) && L(s)) r[n] = { ...o, ...s };
    else r[n] = s;
  }
  return r;
}
//@ chunk-zykv69v4.js:27722-27755 esm-layout
var ie = Re(nlr(), 1),
  ue = Re(oe(), 1);
//@ chunk-zykv69v4.js:27755-27876 esm-fingerprint
function qe() {
  let e = new ie.default({ strict: !1, validateFormats: !0, validateSchema: !1, allErrors: !0 });
  return (ue.default(e), e);
}
//@ chunk-zykv69v4.js:27876-28190 esm-fingerprint
class Gsn {
  constructor(e) {
    this._ajv = e ?? qe();
  }
  getValidator(e) {
    let t =
      "$id" in e && typeof e.$id === "string"
        ? (this._ajv.getSchema(e.$id) ?? this._ajv.compile(e))
        : this._ajv.compile(e);
    return (r) => {
      if (t(r)) return { valid: !0, data: r, errorMessage: void 0 };
      else return { valid: !1, data: void 0, errorMessage: this._ajv.errorsText(t.errors) };
    };
  }
}

export { Gsn, vGn };

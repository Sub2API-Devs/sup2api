/**
 * @bufbuild/protobuf/dist/commonjs/fields.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { xl } from "../cjs/reflect/unsafe.js";

//@ chunk-fq0cr76a.js:445879-446147 cjs-fingerprint
var E_ = x(function (_P) {
  Object.defineProperty(_P, "__esModule", { value: !0 });
  _P.isFieldSet = uJ;
  _P.clearField = fJ;
  var fy = xl();
  function uJ(e, n) {
    return n.parent.typeName == e.$typeName && fy.unsafeIsSet(e, n);
  }
  function fJ(e, n) {
    if (n.parent.typeName == e.$typeName) fy.unsafeClear(e, n);
  }
});

export { E_ };

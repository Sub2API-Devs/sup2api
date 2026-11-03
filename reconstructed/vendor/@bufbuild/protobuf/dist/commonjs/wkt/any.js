/**
 * @bufbuild/protobuf/dist/commonjs/wkt/any.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Yg } from "./google/protobuf/any_pb.js";
import { wl } from "../../cjs/create.js";
import { qu } from "../../cjs/to-binary.js";
import { Ku } from "../from-binary.js";

//@ chunk-fq0cr76a.js:419542-420360 cjs-fingerprint
var MO = x(function (FO) {
  Object.defineProperty(FO, "__esModule", { value: !0 });
  FO.anyPack = Kz;
  FO.anyIs = g_;
  FO.anyUnpack = qz;
  FO.anyUnpackTo = jz;
  var PO = Yg(),
    LO = wl(),
    BO = qu(),
    Jg = Ku();
  function Kz(e, n, r) {
    let s = !1;
    if (!r) ((r = LO.create(PO.AnySchema)), (s = !0));
    return ((r.value = BO.toBinary(e, n)), (r.typeUrl = Yz(n.$typeName)), s ? r : void 0);
  }
  function g_(e, n) {
    if (e.typeUrl === "") return !1;
    let r = typeof n == "string" ? n : n.typeName,
      s = UO(e.typeUrl);
    return r === s;
  }
  function qz(e, n) {
    if (e.typeUrl === "") return;
    let r = n.kind == "message" ? n : n.getMessage(UO(e.typeUrl));
    if (!r || !g_(e, r)) return;
    return Jg.fromBinary(r, e.value);
  }
  function jz(e, n, r) {
    if (!g_(e, n)) return;
    return Jg.mergeFromBinary(n, r, e.value);
  }
  function Yz(e) {
    return `type.googleapis.com/${e}`;
  }
  function UO(e) {
    let index = e.lastIndexOf("/"),
      r = index >= 0 ? e.substring(index + 1) : e;
    if (!r.length) throw Error(`invalid type url: ${e}`);
    return r;
  }
});

export { MO };

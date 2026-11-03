/**
 * protobufjs/src/encoder.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { nt } from "./enum.js";
import { Cr } from "./types.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:128334-129796 cjs-fingerprint
var Ka = x(function (SA, zd) {
  zd.exports = BE;
  var UE = nt(),
    io = Cr(),
    so = de();
  function Bd(e, t, r, i) {
    return t.delimited
      ? e(
          "types[%i].encode(%s,w.uint32(%i)).uint32(%i)",
          r,
          i,
          ((t.id << 3) | 3) >>> 0,
          ((t.id << 3) | 4) >>> 0,
        )
      : e("types[%i].encode(%s,w.uint32(%i).fork()).ldelim()", r, i, ((t.id << 3) | 2) >>> 0);
  }
  function BE(e) {
    var t = so.codegen(["m", "w"], e.name + "$encode")("if(!w)")("w=Writer.create()"),
      r,
      i,
      sorted = e.fieldsArray.slice().sort(so.compareFieldsById);
    for (var r = 0; r < sorted.length; ++r) {
      var resolved = sorted[r].resolve(),
        index = e._fieldsArray.indexOf(resolved),
        o = resolved.resolvedType instanceof UE ? "int32" : resolved.type,
        l = io.basic[o];
      if (((i = "m" + so.safeProp(resolved.name)), resolved.map)) {
        if (
          (t(
            "if(%s!=null&&Object.hasOwnProperty.call(m,%j)){",
            i,
            resolved.name,
          )("for(var ks=Object.keys(%s),i=0;i<ks.length;++i){", i)(
            "w.uint32(%i).fork().uint32(%i).%s(ks[i])",
            ((resolved.id << 3) | 2) >>> 0,
            8 | io.mapKey[resolved.keyType],
            resolved.keyType,
          ),
          l === void 0)
        )
          t("types[%i].encode(%s[ks[i]],w.uint32(18).fork()).ldelim().ldelim()", index, i);
        else t(".uint32(%i).%s(%s[ks[i]]).ldelim()", 16 | l, o, i);
        t("}")("}");
      } else if (resolved.repeated) {
        if ((t("if(%s!=null&&%s.length){", i, i), resolved.packed && io.packed[o] !== void 0))
          t("w.uint32(%i).fork()", ((resolved.id << 3) | 2) >>> 0)("for(var i=0;i<%s.length;++i)", i)(
            "w.%s(%s[i])",
            o,
            i,
          )("w.ldelim()");
        else if ((t("for(var i=0;i<%s.length;++i)", i), l === void 0)) Bd(t, resolved, index, i + "[i]");
        else t("w.uint32(%i).%s(%s[i])", ((resolved.id << 3) | l) >>> 0, o, i);
        t("}");
      } else {
        if (resolved.optional) t("if(%s!=null&&Object.hasOwnProperty.call(m,%j))", i, resolved.name);
        if (l === void 0) Bd(t, resolved, index, i);
        else t("w.uint32(%i).%s(%s)", ((resolved.id << 3) | l) >>> 0, o, i);
      }
    }
    return t("return w");
  }
});

export { Ka };

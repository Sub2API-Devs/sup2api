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
var Ka = x(function (cjsExports, cjsModule) {
  cjsModule.exports = encoder;
  var Enum = nt();
  var types = Cr();
  var util = de();
  function genTypePartial(gen, field, fieldIndex, ref) {
    return field.delimited
      ? gen(
          "types[%i].encode(%s,w.uint32(%i)).uint32(%i)",
          fieldIndex,
          ref,
          ((field.id << 3) | 3) >>> 0,
          ((field.id << 3) | 4) >>> 0,
        )
      : gen(
          "types[%i].encode(%s,w.uint32(%i).fork()).ldelim()",
          fieldIndex,
          ref,
          ((field.id << 3) | 2) >>> 0,
        );
  }
  function encoder(mtype) {
    var gen = util.codegen(["m", "w"], mtype.name + "$encode")("if(!w)")("w=Writer.create()");
    var j;
    var ref;
    var fields = mtype.fieldsArray.slice().sort(util.compareFieldsById);
    for (var j = 0; j < fields.length; ++j) {
      var field = fields[j].resolve();
      var index = mtype._fieldsArray.indexOf(field);
      var type = field.resolvedType instanceof Enum ? "int32" : field.type;
      var wireType = types.basic[type];
      ref = "m" + util.safeProp(field.name);
      if (field.map) {
        gen(
          "if(%s!=null&&Object.hasOwnProperty.call(m,%j)){",
          ref,
          field.name,
        )("for(var ks=Object.keys(%s),i=0;i<ks.length;++i){", ref)(
          "w.uint32(%i).fork().uint32(%i).%s(ks[i])",
          ((field.id << 3) | 2) >>> 0,
          8 | types.mapKey[field.keyType],
          field.keyType,
        );
        if (wireType === undefined)
          gen("types[%i].encode(%s[ks[i]],w.uint32(18).fork()).ldelim().ldelim()", index, ref);
        else gen(".uint32(%i).%s(%s[ks[i]]).ldelim()", 16 | wireType, type, ref);
        gen("}")("}");
      } else if (field.repeated) {
        gen("if(%s!=null&&%s.length){", ref, ref);
        if (field.packed && types.packed[type] !== undefined)
          gen("w.uint32(%i).fork()", ((field.id << 3) | 2) >>> 0)("for(var i=0;i<%s.length;++i)", ref)(
            "w.%s(%s[i])",
            type,
            ref,
          )("w.ldelim()");
        else {
          gen("for(var i=0;i<%s.length;++i)", ref);
          if (wireType === undefined) genTypePartial(gen, field, index, ref + "[i]");
          else gen("w.uint32(%i).%s(%s[i])", ((field.id << 3) | wireType) >>> 0, type, ref);
        }
        gen("}");
      } else {
        if (field.optional) gen("if(%s!=null&&Object.hasOwnProperty.call(m,%j))", ref, field.name);
        if (wireType === undefined) genTypePartial(gen, field, index, ref);
        else gen("w.uint32(%i).%s(%s)", ((field.id << 3) | wireType) >>> 0, type, ref);
      }
    }
    return gen("return w");
  }
});
export { Ka };

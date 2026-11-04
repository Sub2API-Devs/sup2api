/**
 * protobufjs/src/decoder.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../runtime/bun-runtime.js";
import { nt } from "./enum.js";
import { Cr } from "./types.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:91572-93802 cjs-fingerprint
var qa = x(function (cjsExports, cjsModule) {
  cjsModule.exports = decoder;
  var Enum = nt();
  var types = Cr();
  var util = de();
  function missing(field) {
    return "missing required '" + field.name + "'";
  }
  function decoder(mtype) {
    var gen = util.codegen(["r", "l", "e", "n"], mtype.name + "$decode")("if(!(r instanceof Reader))")(
      "r=Reader.create(r)",
    )("if(n===undefined)n=0")("if(n>Reader.recursionLimit)")('throw Error("maximum nesting depth exceeded")')(
      "var c=l===undefined?r.len:r.pos+l,m=new this.ctor" +
        (mtype.fieldsArray.filter(function (field) {
          return field.map;
        }).length
          ? ",k,value"
          : ""),
    )("while(r.pos<c){")("var t=r.uint32()")("if(t===e)")("break")("switch(t>>>3){");
    var i_2 = 0;
    for (; i_2 < mtype.fieldsArray.length; ++i_2) {
      var field = mtype._fieldsArray[i_2].resolve();
      var type = field.resolvedType instanceof Enum ? "int32" : field.type;
      var ref = "m" + util.safeProp(field.name);
      gen("case %i: {", field.id);
      if (field.map) {
        gen("if(%s===util.emptyObject)", ref)("%s={}", ref)("var c2 = r.uint32()+r.pos");
        if (types.defaults[field.keyType] !== undefined) gen("k=%j", types.defaults[field.keyType]);
        else gen("k=null");
        if (types.defaults[type] !== undefined) gen("value=%j", types.defaults[type]);
        else gen("value=null");
        gen("while(r.pos<c2){")("var tag2=r.uint32()")("switch(tag2>>>3){")(
          "case 1: k=r.%s(); break",
          field.keyType,
        )("case 2:");
        if (types.basic[type] === undefined) gen("value=types[%i].decode(r,r.uint32(),undefined,n+1)", i_2);
        else gen("value=r.%s()", type);
        gen("break")("default:")("r.skipType(tag2&7,n)")("break")("}")("}");
        if (types.long[field.keyType] !== undefined)
          gen('%s[typeof k==="object"?util.longToHash(k):k]=value', ref);
        else {
          if (field.keyType === "string") gen('if(k==="__proto__")')("util.makeProp(%s,k)", ref);
          gen("%s[k]=value", ref);
        }
      } else if (field.repeated) {
        gen("if(!(%s&&%s.length))", ref, ref)("%s=[]", ref);
        if (types.packed[type] !== undefined)
          gen("if((t&7)===2){")("var c2=r.uint32()+r.pos")("while(r.pos<c2)")("%s.push(r.%s())", ref, type)(
            "}else",
          );
        if (types.basic[type] === undefined)
          gen(
            field.delimited
              ? "%s.push(types[%i].decode(r,undefined,((t&~7)|4),n+1))"
              : "%s.push(types[%i].decode(r,r.uint32(),undefined,n+1))",
            ref,
            i_2,
          );
        else gen("%s.push(r.%s())", ref, type);
      } else if (types.basic[type] === undefined)
        gen(
          field.delimited
            ? "%s=types[%i].decode(r,undefined,((t&~7)|4),n+1)"
            : "%s=types[%i].decode(r,r.uint32(),undefined,n+1)",
          ref,
          i_2,
        );
      else gen("%s=r.%s()", ref, type);
      gen("break")("}");
    }
    gen("default:")("r.skipType(t&7,n)")("break")("}")("}");
    for (i_2 = 0; i_2 < mtype._fieldsArray.length; ++i_2) {
      var rfield = mtype._fieldsArray[i_2];
      if (rfield.required)
        gen("if(!m.hasOwnProperty(%j))", rfield.name)(
          "throw util.ProtocolError(%j,{instance:m})",
          missing(rfield),
        );
    }
    return gen("return m");
  }
});
export { qa };

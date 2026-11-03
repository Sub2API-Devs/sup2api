/**
 * protobufjs/src/decoder.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { nt } from "./enum.js";
import { Cr } from "./types.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:91572-93802 cjs-fingerprint
var qa = x(function (lA, yd) {
  yd.exports = pE;
  var hE = nt(),
    qt = Cr(),
    vd = de();
  function fE(e) {
    return "missing required '" + e.name + "'";
  }
  function pE(e) {
    var t = vd.codegen(["r", "l", "e", "n"], e.name + "$decode")("if(!(r instanceof Reader))")(
        "r=Reader.create(r)",
      )("if(n===undefined)n=0")("if(n>Reader.recursionLimit)")(
        'throw Error("maximum nesting depth exceeded")',
      )(
        "var c=l===undefined?r.len:r.pos+l,m=new this.ctor" +
          (e.fieldsArray.filter(function (o) {
            return o.map;
          }).length
            ? ",k,value"
            : ""),
      )("while(r.pos<c){")("var t=r.uint32()")("if(t===e)")("break")("switch(t>>>3){"),
      r = 0;
    for (; r < e.fieldsArray.length; ++r) {
      var resolved = e._fieldsArray[r].resolve(),
        s = resolved.resolvedType instanceof hE ? "int32" : resolved.type,
        n = "m" + vd.safeProp(resolved.name);
      if ((t("case %i: {", resolved.id), resolved.map)) {
        if (
          (t("if(%s===util.emptyObject)", n)("%s={}", n)("var c2 = r.uint32()+r.pos"),
          qt.defaults[resolved.keyType] !== void 0)
        )
          t("k=%j", qt.defaults[resolved.keyType]);
        else t("k=null");
        if (qt.defaults[s] !== void 0) t("value=%j", qt.defaults[s]);
        else t("value=null");
        if (
          (t("while(r.pos<c2){")("var tag2=r.uint32()")("switch(tag2>>>3){")(
            "case 1: k=r.%s(); break",
            resolved.keyType,
          )("case 2:"),
          qt.basic[s] === void 0)
        )
          t("value=types[%i].decode(r,r.uint32(),undefined,n+1)", r);
        else t("value=r.%s()", s);
        if (
          (t("break")("default:")("r.skipType(tag2&7,n)")("break")("}")("}"),
          qt.long[resolved.keyType] !== void 0)
        )
          t('%s[typeof k==="object"?util.longToHash(k):k]=value', n);
        else {
          if (resolved.keyType === "string") t('if(k==="__proto__")')("util.makeProp(%s,k)", n);
          t("%s[k]=value", n);
        }
      } else if (resolved.repeated) {
        if ((t("if(!(%s&&%s.length))", n, n)("%s=[]", n), qt.packed[s] !== void 0))
          t("if((t&7)===2){")("var c2=r.uint32()+r.pos")("while(r.pos<c2)")("%s.push(r.%s())", n, s)("}else");
        if (qt.basic[s] === void 0)
          t(
            resolved.delimited
              ? "%s.push(types[%i].decode(r,undefined,((t&~7)|4),n+1))"
              : "%s.push(types[%i].decode(r,r.uint32(),undefined,n+1))",
            n,
            r,
          );
        else t("%s.push(r.%s())", n, s);
      } else if (qt.basic[s] === void 0)
        t(
          resolved.delimited
            ? "%s=types[%i].decode(r,undefined,((t&~7)|4),n+1)"
            : "%s=types[%i].decode(r,r.uint32(),undefined,n+1)",
          n,
          r,
        );
      else t("%s=r.%s()", n, s);
      t("break")("}");
    }
    t("default:")("r.skipType(t&7,n)")("break")("}")("}");
    for (r = 0; r < e._fieldsArray.length; ++r) {
      var a = e._fieldsArray[r];
      if (a.required)
        t("if(!m.hasOwnProperty(%j))", a.name)("throw util.ProtocolError(%j,{instance:m})", fE(a));
    }
    return t("return m");
  }
});

export { qa };

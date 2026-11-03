/**
 * protobufjs/src/verifier.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { nt } from "./enum.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:93802-96427 cjs-fingerprint
var za = x(function (cA, _d) {
  _d.exports = vE;
  var gE = nt(),
    Ua = de();
  function He(e, t) {
    return (
      e.name +
      ": " +
      t +
      (e.repeated && t !== "array" ? "[]" : e.map && t !== "object" ? "{k:" + e.keyType + "}" : "") +
      " expected"
    );
  }
  function Ba(e, t, r, i) {
    if (t.resolvedType)
      if (t.resolvedType instanceof gE) {
        e("switch(%s){", i)("default:")("return%j", He(t, "enum value"));
        for (var keys = Object.keys(t.resolvedType.values), n = 0; n < keys.length; ++n)
          e("case %i:", t.resolvedType.values[keys[n]]);
        e("break")("}");
      } else e("{")("var e=types[%i].verify(%s,n+1);", r, i)("if(e)")("return%j+e", t.name + ".")("}");
    else
      switch (t.type) {
        case "int32":
        case "uint32":
        case "sint32":
        case "fixed32":
        case "sfixed32":
          e("if(!util.isInteger(%s))", i)("return%j", He(t, "integer"));
          break;
        case "int64":
        case "uint64":
        case "sint64":
        case "fixed64":
        case "sfixed64":
          e(
            "if(!util.isInteger(%s)&&!(%s&&util.isInteger(%s.low)&&util.isInteger(%s.high)))",
            i,
            i,
            i,
            i,
          )("return%j", He(t, "integer|Long"));
          break;
        case "float":
        case "double":
          e('if(typeof %s!=="number")', i)("return%j", He(t, "number"));
          break;
        case "bool":
          e('if(typeof %s!=="boolean")', i)("return%j", He(t, "boolean"));
          break;
        case "string":
          e("if(!util.isString(%s))", i)("return%j", He(t, "string"));
          break;
        case "bytes":
          e(
            'if(!(%s&&typeof %s.length==="number"||util.isString(%s)))',
            i,
            i,
            i,
          )("return%j", He(t, "buffer"));
          break;
      }
    return e;
  }
  function mE(e, t, r) {
    switch (t.keyType) {
      case "int32":
      case "uint32":
      case "sint32":
      case "fixed32":
      case "sfixed32":
        e("if(!util.key32Re.test(%s))", r)("return%j", He(t, "integer key"));
        break;
      case "int64":
      case "uint64":
      case "sint64":
      case "fixed64":
      case "sfixed64":
        e("if(!util.key64Re.test(%s))", r)("return%j", He(t, "integer|Long key"));
        break;
      case "bool":
        e("if(!util.key2Re.test(%s))", r)("return%j", He(t, "boolean key"));
        break;
    }
    return e;
  }
  function vE(e) {
    var t = Ua.codegen(["m", "n"], e.name + "$verify")('if(typeof m!=="object"||m===null)')(
        "return%j",
        "object expected",
      )("if(n===undefined)n=0")("if(n>util.recursionLimit)")("return%j", "maximum nesting depth exceeded"),
      oneofsArray = e.oneofsArray,
      i = {};
    if (oneofsArray.length) t("var p={}");
    for (var s = 0; s < e.fieldsArray.length; ++s) {
      var resolved = e._fieldsArray[s].resolve(),
        a = "m" + Ua.safeProp(resolved.name);
      if (resolved.optional) t("if(%s!=null&&m.hasOwnProperty(%j)){", a, resolved.name);
      if (resolved.map)
        (t("if(!util.isObject(%s))", a)("return%j", He(resolved, "object"))("var k=Object.keys(%s)", a)(
          "for(var i=0;i<k.length;++i){",
        ),
          mE(t, resolved, "k[i]"),
          Ba(t, resolved, s, a + "[k[i]]")("}"));
      else if (resolved.repeated)
        (t("if(!Array.isArray(%s))", a)("return%j", He(resolved, "array"))(
          "for(var i=0;i<%s.length;++i){",
          a,
        ),
          Ba(t, resolved, s, a + "[i]")("}"));
      else {
        if (resolved.partOf) {
          var safeProp = Ua.safeProp(resolved.partOf.name);
          if (i[resolved.partOf.name] === 1)
            t("if(p%s===1)", safeProp)("return%j", resolved.partOf.name + ": multiple values");
          ((i[resolved.partOf.name] = 1), t("p%s=1", safeProp));
        }
        Ba(t, resolved, s, a);
      }
      if (resolved.optional) t("}");
    }
    return t("return null");
  }
});

export { za };

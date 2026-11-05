/**
 * protobufjs/src/verifier.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_enum } from "./enum.js";
import { require_util_2 } from "./util.js";

//@ chunk-3k21nfa0.js:93802-96427 cjs-fingerprint
var require_verifier = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = verifier;
  var Enum = require_enum();
  var util = require_util_2();
  function invalid(field, expected) {
    return (
      field.name +
      ": " +
      expected +
      (field.repeated && expected !== "array"
        ? "[]"
        : field.map && expected !== "object"
          ? "{k:" + field.keyType + "}"
          : "") +
      " expected"
    );
  }
  function genVerifyValue(gen, field, fieldIndex, ref) {
    if (field.resolvedType) {
      if (field.resolvedType instanceof Enum) {
        gen("switch(%s){", ref)("default:")("return%j", invalid(field, "enum value"));
        for (var keys = Object.keys(field.resolvedType.values), j = 0; j < keys.length; ++j)
          gen("case %i:", field.resolvedType.values[keys[j]]);
        gen("break")("}");
      } else
        gen("{")("var e=types[%i].verify(%s,n+1);", fieldIndex, ref)("if(e)")("return%j+e", field.name + ".")(
          "}",
        );
    } else
      switch (field.type) {
        case "int32":
        case "uint32":
        case "sint32":
        case "fixed32":
        case "sfixed32":
          gen("if(!util.isInteger(%s))", ref)("return%j", invalid(field, "integer"));
          break;
        case "int64":
        case "uint64":
        case "sint64":
        case "fixed64":
        case "sfixed64":
          gen(
            "if(!util.isInteger(%s)&&!(%s&&util.isInteger(%s.low)&&util.isInteger(%s.high)))",
            ref,
            ref,
            ref,
            ref,
          )("return%j", invalid(field, "integer|Long"));
          break;
        case "float":
        case "double":
          gen('if(typeof %s!=="number")', ref)("return%j", invalid(field, "number"));
          break;
        case "bool":
          gen('if(typeof %s!=="boolean")', ref)("return%j", invalid(field, "boolean"));
          break;
        case "string":
          gen("if(!util.isString(%s))", ref)("return%j", invalid(field, "string"));
          break;
        case "bytes":
          gen(
            'if(!(%s&&typeof %s.length==="number"||util.isString(%s)))',
            ref,
            ref,
            ref,
          )("return%j", invalid(field, "buffer"));
          break;
      }
    return gen;
  }
  function genVerifyKey(gen, field, ref) {
    switch (field.keyType) {
      case "int32":
      case "uint32":
      case "sint32":
      case "fixed32":
      case "sfixed32":
        gen("if(!util.key32Re.test(%s))", ref)("return%j", invalid(field, "integer key"));
        break;
      case "int64":
      case "uint64":
      case "sint64":
      case "fixed64":
      case "sfixed64":
        gen("if(!util.key64Re.test(%s))", ref)("return%j", invalid(field, "integer|Long key"));
        break;
      case "bool":
        gen("if(!util.key2Re.test(%s))", ref)("return%j", invalid(field, "boolean key"));
        break;
    }
    return gen;
  }
  function verifier(mtype) {
    var gen = util.codegen(["m", "n"], mtype.name + "$verify")('if(typeof m!=="object"||m===null)')(
      "return%j",
      "object expected",
    )("if(n===undefined)n=0")("if(n>util.recursionLimit)")("return%j", "maximum nesting depth exceeded");
    var oneofs = mtype.oneofsArray;
    var seenFirstField = {};
    if (oneofs.length) gen("var p={}");
    for (var i = 0; i < mtype.fieldsArray.length; ++i) {
      var field = mtype._fieldsArray[i].resolve();
      var ref = "m" + util.safeProp(field.name);
      if (field.optional) gen("if(%s!=null&&m.hasOwnProperty(%j)){", ref, field.name);
      if (field.map) {
        gen("if(!util.isObject(%s))", ref)("return%j", invalid(field, "object"))(
          "var k=Object.keys(%s)",
          ref,
        )("for(var i=0;i<k.length;++i){");
        genVerifyKey(gen, field, "k[i]");
        genVerifyValue(gen, field, i, ref + "[k[i]]")("}");
      } else if (field.repeated) {
        gen("if(!Array.isArray(%s))", ref)("return%j", invalid(field, "array"))(
          "for(var i=0;i<%s.length;++i){",
          ref,
        );
        genVerifyValue(gen, field, i, ref + "[i]")("}");
      } else {
        if (field.partOf) {
          var oneofProp = util.safeProp(field.partOf.name);
          if (seenFirstField[field.partOf.name] === 1)
            gen("if(p%s===1)", oneofProp)("return%j", field.partOf.name + ": multiple values");
          seenFirstField[field.partOf.name] = 1;
          gen("p%s=1", oneofProp);
        }
        genVerifyValue(gen, field, i, ref);
      }
      if (field.optional) gen("}");
    }
    return gen("return null");
  }
});
export { require_verifier };

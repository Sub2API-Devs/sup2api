/**
 * protobufjs/src/converter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { nt } from "./enum.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:96427-101568 cjs-fingerprint
var ja = x(function (Cd) {
  var Sd = Cd,
    Pi = nt(),
    gt = de();
  function Ha(e, t, r, i) {
    var s = !1;
    if (t.resolvedType)
      if (t.resolvedType instanceof Pi) {
        e("switch(d%s){", i);
        for (var values = t.resolvedType.values, keys = Object.keys(values), o = 0; o < keys.length; ++o) {
          if (values[keys[o]] === t.typeDefault && !s) {
            if ((e("default:")('if(typeof(d%s)==="number"){m%s=d%s;break}', i, i, i), !t.repeated))
              e("break");
            s = !0;
          }
          e("case%j:", keys[o])("case %i:", values[keys[o]])("m%s=%j", i, values[keys[o]])("break");
        }
        e("}");
      } else
        e('if(typeof d%s!=="object")', i)("throw TypeError(%j)", t.fullName + ": object expected")(
          "m%s=types[%i].fromObject(d%s,n+1)",
          i,
          r,
          i,
        );
    else {
      var l = !1;
      switch (t.type) {
        case "double":
        case "float":
          e("m%s=Number(d%s)", i, i);
          break;
        case "uint32":
        case "fixed32":
          e("m%s=d%s>>>0", i, i);
          break;
        case "int32":
        case "sint32":
        case "sfixed32":
          e("m%s=d%s|0", i, i);
          break;
        case "uint64":
          l = !0;
        case "int64":
        case "sint64":
        case "fixed64":
        case "sfixed64":
          e("if(util.Long)")("(m%s=util.Long.fromValue(d%s)).unsigned=%j", i, i, l)(
            'else if(typeof d%s==="string")',
            i,
          )(
            "m%s=parseInt(d%s,10)",
            i,
            i,
          )('else if(typeof d%s==="number")', i)(
            "m%s=d%s",
            i,
            i,
          )('else if(typeof d%s==="object")', i)(
            "m%s=new util.LongBits(d%s.low>>>0,d%s.high>>>0).toNumber(%s)",
            i,
            i,
            i,
            l ? "true" : "",
          );
          break;
        case "bytes":
          e('if(typeof d%s==="string")', i)(
            "util.base64.decode(d%s,m%s=util.newBuffer(util.base64.length(d%s)),0)",
            i,
            i,
            i,
          )("else if(d%s.length >= 0)", i)("m%s=d%s", i, i);
          break;
        case "string":
          e("m%s=String(d%s)", i, i);
          break;
        case "bool":
          e("m%s=Boolean(d%s)", i, i);
          break;
      }
    }
    return e;
  }
  Sd.fromObject = function (t) {
    var fieldsArray = t.fieldsArray,
      i = gt.codegen(["d", "n"], t.name + "$fromObject")("if(d instanceof this.ctor)")("return d")(
        "if(n===undefined)n=0",
      )("if(n>util.recursionLimit)")('throw Error("maximum nesting depth exceeded")');
    if (!fieldsArray.length) return i("return new this.ctor");
    i("var m=new this.ctor");
    for (var s = 0; s < fieldsArray.length; ++s) {
      var resolved = fieldsArray[s].resolve(),
        safeProp = gt.safeProp(resolved.name);
      if (resolved.map)
        (i("if(d%s){", safeProp)('if(typeof d%s!=="object")', safeProp)(
          "throw TypeError(%j)",
          resolved.fullName + ": object expected",
        )("m%s={}", safeProp)("for(var ks=Object.keys(d%s),i=0;i<ks.length;++i){", safeProp),
          i('if(ks[i]==="__proto__")')("util.makeProp(m%s,ks[i])", safeProp),
          Ha(i, resolved, s, safeProp + "[ks[i]]")("}")("}"));
      else if (resolved.repeated)
        (i("if(d%s){", safeProp)("if(!Array.isArray(d%s))", safeProp)(
          "throw TypeError(%j)",
          resolved.fullName + ": array expected",
        )("m%s=[]", safeProp)("for(var i=0;i<d%s.length;++i){", safeProp),
          Ha(i, resolved, s, safeProp + "[i]")("}")("}"));
      else {
        if (!(resolved.resolvedType instanceof Pi)) i("if(d%s!=null){", safeProp);
        if ((Ha(i, resolved, s, safeProp), !(resolved.resolvedType instanceof Pi))) i("}");
      }
    }
    return i("return m");
  };
  function Wa(e, t, r, i) {
    if (t.resolvedType)
      if (t.resolvedType instanceof Pi)
        e(
          "d%s=o.enums===String?(types[%i].values[m%s]===undefined?m%s:types[%i].values[m%s]):m%s",
          i,
          r,
          i,
          i,
          r,
          i,
          i,
        );
      else e("d%s=types[%i].toObject(m%s,o)", i, r, i);
    else {
      var s = !1;
      switch (t.type) {
        case "double":
        case "float":
          e("d%s=o.json&&!isFinite(m%s)?String(m%s):m%s", i, i, i, i);
          break;
        case "uint64":
          s = !0;
        case "int64":
        case "sint64":
        case "fixed64":
        case "sfixed64":
          e('if(typeof m%s==="number")', i)("d%s=o.longs===String?String(m%s):m%s", i, i, i)("else")(
            "d%s=o.longs===String?util.Long.prototype.toString.call(m%s):o.longs===Number?new util.LongBits(m%s.low>>>0,m%s.high>>>0).toNumber(%s):m%s",
            i,
            i,
            i,
            i,
            s ? "true" : "",
            i,
          );
          break;
        case "bytes":
          e(
            "d%s=o.bytes===String?util.base64.encode(m%s,0,m%s.length):o.bytes===Array?Array.prototype.slice.call(m%s):m%s",
            i,
            i,
            i,
            i,
            i,
          );
          break;
        default:
          e("d%s=m%s", i, i);
          break;
      }
    }
    return e;
  }
  Sd.toObject = function (t) {
    var sorted = t.fieldsArray.slice().sort(gt.compareFieldsById);
    if (!sorted.length) return gt.codegen()("return {}");
    var i = gt.codegen(["m", "o"], t.name + "$toObject")("if(!o)")("o={}")("var d={}"),
      s = [],
      n = [],
      a = [],
      o = 0;
    for (; o < sorted.length; ++o)
      if (!sorted[o].partOf) (sorted[o].resolve().repeated ? s : sorted[o].map ? n : a).push(sorted[o]);
    if (s.length) {
      i("if(o.arrays||o.defaults){");
      for (o = 0; o < s.length; ++o) i("d%s=[]", gt.safeProp(s[o].name));
      i("}");
    }
    if (n.length) {
      i("if(o.objects||o.defaults){");
      for (o = 0; o < n.length; ++o) i("d%s={}", gt.safeProp(n[o].name));
      i("}");
    }
    if (a.length) {
      i("if(o.defaults){");
      for (o = 0; o < a.length; ++o) {
        var l = a[o],
          safeProp = gt.safeProp(l.name);
        if (l.resolvedType instanceof Pi)
          i("d%s=o.enums===String?%j:%j", safeProp, l.resolvedType.valuesById[l.typeDefault], l.typeDefault);
        else if (l.long)
          i("if(util.Long){")(
            "var n=new util.Long(%i,%i,%j)",
            l.typeDefault.low,
            l.typeDefault.high,
            l.typeDefault.unsigned,
          )(
            "d%s=o.longs===String?n.toString():o.longs===Number?n.toNumber():n",
            safeProp,
          )("}else")(
            "d%s=o.longs===String?%j:%i",
            safeProp,
            l.typeDefault.toString(),
            l.typeDefault.toNumber(),
          );
        else if (l.bytes) {
          var u = Array.prototype.slice.call(l.typeDefault);
          i(
            "if(o.bytes===String)d%s=%j",
            safeProp,
            String.fromCharCode.apply(String, l.typeDefault),
          )("else{")("d%s=%j", safeProp, u)(
            "if(o.bytes!==Array)d%s=util.newBuffer(d%s)",
            safeProp,
            safeProp,
          )("}");
        } else i("d%s=%j", safeProp, l.typeDefault);
      }
      i("}");
    }
    var d = !1;
    for (o = 0; o < sorted.length; ++o) {
      var l = sorted[o],
        index = t._fieldsArray.indexOf(l),
        safeProp = gt.safeProp(l.name);
      if (l.map) {
        if (!d) ((d = !0), i("var ks2"));
        (i("if(m%s&&(ks2=Object.keys(m%s)).length){", safeProp, safeProp)("d%s={}", safeProp)(
          "for(var j=0;j<ks2.length;++j){",
        ),
          i('if(ks2[j]==="__proto__")')("util.makeProp(d%s,ks2[j])", safeProp),
          Wa(i, l, index, safeProp + "[ks2[j]]")("}"));
      } else if (l.repeated)
        (i("if(m%s&&m%s.length){", safeProp, safeProp)("d%s=[]", safeProp)(
          "for(var j=0;j<m%s.length;++j){",
          safeProp,
        ),
          Wa(i, l, index, safeProp + "[j]")("}"));
      else if (
        (i("if(m%s!=null&&m.hasOwnProperty(%j)){", safeProp, l.name), Wa(i, l, index, safeProp), l.partOf)
      )
        i("if(o.oneofs)")("d%s=%j", gt.safeProp(l.partOf.name), l.name);
      i("}");
    }
    return i("return d");
  };
});

export { ja };

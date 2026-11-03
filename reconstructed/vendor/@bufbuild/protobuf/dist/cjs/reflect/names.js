/**
 * @bufbuild/protobuf/dist/cjs/reflect/names.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:321485-322426 cjs-require-graph
var Ec = x(function (_N) {
  Object.defineProperty(_N, "__esModule", { value: !0 });
  _N.qualifiedName = Wq;
  _N.protoCamelCase = Gq;
  _N.protoSnakeCase = Hq;
  _N.safeObjectProperty = qq;
  function Wq(e) {
    switch (e.kind) {
      case "field":
      case "oneof":
      case "rpc":
        return e.parent.typeName + "." + e.name;
      case "enum_value": {
        let n = e.parent.parent ? e.parent.parent.typeName : e.parent.file.proto.package;
        return n + (n.length > 0 ? "." : "") + e.name;
      }
      case "service":
      case "message":
      case "enum":
      case "extension":
        return e.typeName;
      case "file":
        return e.proto.name;
    }
  }
  function Gq(e) {
    let n = !1,
      r = [];
    for (let s = 0; s < e.length; s++) {
      let charAt = e.charAt(s);
      switch (charAt) {
        case "_":
          n = !0;
          break;
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          (r.push(charAt), (n = !1));
          break;
        default:
          if (n) ((n = !1), (charAt = charAt.toUpperCase()));
          r.push(charAt);
          break;
      }
    }
    return r.join("");
  }
  function Hq(e) {
    return e.replace(/[A-Z]/g, (n) => "_" + n.toLowerCase());
  }
  var Kq = new Set(["constructor", "toString", "toJSON", "valueOf"]);
  function qq(e) {
    return Kq.has(e) ? e + "$" : e;
  }
});

export { Ec };

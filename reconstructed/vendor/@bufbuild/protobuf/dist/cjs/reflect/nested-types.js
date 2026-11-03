/**
 * @bufbuild/protobuf/dist/cjs/reflect/nested-types.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:322426-323372 cjs-require-graph
var Ux = x(function (wN) {
  Object.defineProperty(wN, "__esModule", { value: !0 });
  wN.nestedTypes = Bx;
  wN.usedTypes = ej;
  wN.parentTypes = tj;
  function* Bx(e) {
    switch (e.kind) {
      case "file":
        for (let message of e.messages) (yield message, yield* Bx(message));
        (yield* e.enums, yield* e.services, yield* e.extensions);
        break;
      case "message":
        for (let nestedMessage of e.nestedMessages) (yield nestedMessage, yield* Bx(nestedMessage));
        (yield* e.nestedEnums, yield* e.nestedExtensions);
        break;
    }
  }
  function ej(e) {
    return vN(e, new Set());
  }
  function* vN(e, n) {
    var r, s;
    for (let field of e.fields) {
      let y =
        (s = (r = field.enum) !== null && r !== void 0 ? r : field.message) !== null && s !== void 0
          ? s
          : void 0;
      if (!y || n.has(y.typeName)) continue;
      if ((n.add(y.typeName), yield y, y.kind == "message")) yield* vN(y, n);
    }
  }
  function tj(e) {
    let n = [];
    while (e.kind !== "file") {
      let r = nj(e);
      ((e = r), n.push(r));
    }
    return n;
  }
  function nj(e) {
    var n;
    switch (e.kind) {
      case "enum_value":
      case "field":
      case "oneof":
      case "rpc":
        return e.parent;
      case "service":
        return e.file;
      case "extension":
      case "enum":
      case "message":
        return (n = e.parent) !== null && n !== void 0 ? n : e.file;
    }
  }
});

export { Ux };

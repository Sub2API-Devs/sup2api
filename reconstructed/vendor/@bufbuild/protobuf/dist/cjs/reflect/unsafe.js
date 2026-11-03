/**
 * @bufbuild/protobuf/dist/cjs/reflect/unsafe.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { El } from "../../commonjs/reflect/scalar.js";

//@ chunk-fq0cr76a.js:329308-330751 cjs-require-graph
var xl = x(function (VN) {
  Object.defineProperty(VN, "__esModule", { value: !0 });
  VN.unsafeLocal = void 0;
  VN.unsafeOneofCase = Ij;
  VN.unsafeIsSet = Nj;
  VN.unsafeIsSetExplicit = kj;
  VN.unsafeGet = Dj;
  VN.unsafeSet = Oj;
  VN.unsafeClear = Pj;
  var Ag = El(),
    MN = 2;
  VN.unsafeLocal = Symbol.for("reflect unsafe local");
  function Ij(e, n) {
    let r = e[n.localName].case;
    if (r === void 0) return r;
    return n.fields.find((field) => field.localName === r);
  }
  function Nj(e, n) {
    let localName = n.localName;
    if (n.oneof) return e[n.oneof.localName].case === localName;
    if (n.presence != MN)
      return e[localName] !== void 0 && Object.prototype.hasOwnProperty.call(e, localName);
    switch (n.fieldKind) {
      case "list":
        return e[localName].length > 0;
      case "map":
        return Object.keys(e[localName]).length > 0;
      case "scalar":
        return !Ag.isScalarZeroValue(n.scalar, e[localName]);
      case "enum":
        return e[localName] !== n.enum.values[0].number;
    }
    throw Error("message field with implicit presence");
  }
  function kj(e, n) {
    return Object.prototype.hasOwnProperty.call(e, n) && e[n] !== void 0;
  }
  function Dj(e, n) {
    if (n.oneof) {
      let r = e[n.oneof.localName];
      if (r.case === n.localName) return r.value;
      return;
    }
    return e[n.localName];
  }
  function Oj(e, n, r) {
    if (n.oneof) e[n.oneof.localName] = { case: n.localName, value: r };
    else e[n.localName] = r;
  }
  function Pj(e, n) {
    let localName = n.localName;
    if (n.oneof) {
      let localName_2 = n.oneof.localName;
      if (e[localName_2].case === localName) e[localName_2] = { case: void 0 };
    } else if (n.presence != MN) delete e[localName];
    else
      switch (n.fieldKind) {
        case "map":
          e[localName] = {};
          break;
        case "list":
          e[localName] = [];
          break;
        case "enum":
          e[localName] = n.enum.values[0].number;
          break;
        case "scalar":
          e[localName] = Ag.scalarZeroValue(n.scalar, n.longAsString);
          break;
      }
  }
});

export { xl };

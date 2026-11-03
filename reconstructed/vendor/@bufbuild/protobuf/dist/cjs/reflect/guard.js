/**
 * @bufbuild/protobuf/dist/cjs/reflect/guard.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { xl } from "./unsafe.js";

//@ chunk-fq0cr76a.js:330751-332193 cjs-require-graph
var Uu = x(function (GN) {
  Object.defineProperty(GN, "__esModule", { value: !0 });
  GN.isObject = ap;
  GN.isOneofADT = Vj;
  GN.isReflectList = Wj;
  GN.isReflectMap = Gj;
  GN.isReflectMessage = Hj;
  var Bu = xl();
  function ap(e) {
    return e !== null && typeof e == "object" && !Array.isArray(e);
  }
  function Vj(e) {
    return (
      e !== null &&
      typeof e == "object" &&
      "case" in e &&
      ((typeof e.case == "string" && "value" in e && e.value != null) ||
        (e.case === void 0 && (!("value" in e) || e.value === void 0)))
    );
  }
  function Wj(e, n) {
    var r, s, h, y;
    if (ap(e) && Bu.unsafeLocal in e && "add" in e && "field" in e && typeof e.field == "function") {
      if (n !== void 0) {
        let b = n,
          field = e.field();
        return (
          b.listKind == field.listKind &&
          b.scalar === field.scalar &&
          ((r = b.message) === null || r === void 0 ? void 0 : r.typeName) ===
            ((s = field.message) === null || s === void 0 ? void 0 : s.typeName) &&
          ((h = b.enum) === null || h === void 0 ? void 0 : h.typeName) ===
            ((y = field.enum) === null || y === void 0 ? void 0 : y.typeName)
        );
      }
      return !0;
    }
    return !1;
  }
  function Gj(e, n) {
    var r, s, h, y;
    if (ap(e) && Bu.unsafeLocal in e && "has" in e && "field" in e && typeof e.field == "function") {
      if (n !== void 0) {
        let b = n,
          field = e.field();
        return (
          b.mapKey === field.mapKey &&
          b.mapKind == field.mapKind &&
          b.scalar === field.scalar &&
          ((r = b.message) === null || r === void 0 ? void 0 : r.typeName) ===
            ((s = field.message) === null || s === void 0 ? void 0 : s.typeName) &&
          ((h = b.enum) === null || h === void 0 ? void 0 : h.typeName) ===
            ((y = field.enum) === null || y === void 0 ? void 0 : y.typeName)
        );
      }
      return !0;
    }
    return !1;
  }
  function Hj(e, n) {
    return (
      ap(e) &&
      Bu.unsafeLocal in e &&
      "desc" in e &&
      ap(e.desc) &&
      e.desc.kind === "message" &&
      (n === void 0 || e.desc.typeName == n.typeName)
    );
  }
});

export { Uu };

/**
 * @bufbuild/protobuf/dist/cjs/reflect/guard.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { require_unsafe } from "./unsafe.js";

//@ chunk-fq0cr76a.js:330751-332193 cjs-require-graph
var require_guard = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isObject = isObject;
  cjsExports.isOneofADT = isOneofADT;
  cjsExports.isReflectList = isReflectList;
  cjsExports.isReflectMap = isReflectMap;
  cjsExports.isReflectMessage = isReflectMessage;
  var unsafe_js_1 = require_unsafe();
  function isObject(arg) {
    return arg !== null && typeof arg == "object" && !Array.isArray(arg);
  }
  function isOneofADT(arg) {
    return (
      arg !== null &&
      typeof arg == "object" &&
      "case" in arg &&
      ((typeof arg.case == "string" && "value" in arg && arg.value != null) ||
        (arg.case === undefined && (!("value" in arg) || arg.value === undefined)))
    );
  }
  function isReflectList(arg, field) {
    var _a;
    var _b;
    var _c;
    var _d;
    if (
      isObject(arg) &&
      unsafe_js_1.unsafeLocal in arg &&
      "add" in arg &&
      "field" in arg &&
      typeof arg.field == "function"
    ) {
      if (field !== undefined) {
        let a = field;
        let b = arg.field();
        return (
          a.listKind == b.listKind &&
          a.scalar === b.scalar &&
          ((_a = a.message) === null || _a === undefined ? undefined : _a.typeName) ===
            ((_b = b.message) === null || _b === undefined ? undefined : _b.typeName) &&
          ((_c = a.enum) === null || _c === undefined ? undefined : _c.typeName) ===
            ((_d = b.enum) === null || _d === undefined ? undefined : _d.typeName)
        );
      }
      return true;
    }
    return false;
  }
  function isReflectMap(arg, field) {
    var _a;
    var _b;
    var _c;
    var _d;
    if (
      isObject(arg) &&
      unsafe_js_1.unsafeLocal in arg &&
      "has" in arg &&
      "field" in arg &&
      typeof arg.field == "function"
    ) {
      if (field !== undefined) {
        let a = field;
        let b = arg.field();
        return (
          a.mapKey === b.mapKey &&
          a.mapKind == b.mapKind &&
          a.scalar === b.scalar &&
          ((_a = a.message) === null || _a === undefined ? undefined : _a.typeName) ===
            ((_b = b.message) === null || _b === undefined ? undefined : _b.typeName) &&
          ((_c = a.enum) === null || _c === undefined ? undefined : _c.typeName) ===
            ((_d = b.enum) === null || _d === undefined ? undefined : _d.typeName)
        );
      }
      return true;
    }
    return false;
  }
  function isReflectMessage(arg, messageDesc) {
    return (
      isObject(arg) &&
      unsafe_js_1.unsafeLocal in arg &&
      "desc" in arg &&
      isObject(arg.desc) &&
      arg.desc.kind === "message" &&
      (messageDesc === undefined || arg.desc.typeName == messageDesc.typeName)
    );
  }
});
export { require_guard };

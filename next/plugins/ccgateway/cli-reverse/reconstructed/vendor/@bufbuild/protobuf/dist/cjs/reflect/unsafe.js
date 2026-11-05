/**
 * @bufbuild/protobuf/dist/cjs/reflect/unsafe.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_scalar } from "../../commonjs/reflect/scalar.js";

//@ chunk-qg41pqt6.js:329875-331318 cjs-require-graph
var require_unsafe = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.unsafeLocal = undefined;
  cjsExports.unsafeOneofCase = unsafeOneofCase;
  cjsExports.unsafeIsSet = unsafeIsSet;
  cjsExports.unsafeIsSetExplicit = unsafeIsSetExplicit;
  cjsExports.unsafeGet = unsafeGet;
  cjsExports.unsafeSet = unsafeSet;
  cjsExports.unsafeClear = unsafeClear;
  var scalar_js_1 = require_scalar();
  var IMPLICIT = 2;
  cjsExports.unsafeLocal = Symbol.for("reflect unsafe local");
  function unsafeOneofCase(target, oneof) {
    let c = target[oneof.localName].case;
    if (c === undefined) return c;
    return oneof.fields.find((f) => f.localName === c);
  }
  function unsafeIsSet(target, field) {
    let name = field.localName;
    if (field.oneof) return target[field.oneof.localName].case === name;
    if (field.presence != IMPLICIT)
      return target[name] !== undefined && Object.prototype.hasOwnProperty.call(target, name);
    switch (field.fieldKind) {
      case "list":
        return target[name].length > 0;
      case "map":
        return Object.keys(target[name]).length > 0;
      case "scalar":
        return !scalar_js_1.isScalarZeroValue(field.scalar, target[name]);
      case "enum":
        return target[name] !== field.enum.values[0].number;
    }
    throw Error("message field with implicit presence");
  }
  function unsafeIsSetExplicit(target, localName) {
    return Object.prototype.hasOwnProperty.call(target, localName) && target[localName] !== undefined;
  }
  function unsafeGet(target, field) {
    if (field.oneof) {
      let oneof = target[field.oneof.localName];
      if (oneof.case === field.localName) return oneof.value;
      return;
    }
    return target[field.localName];
  }
  function unsafeSet(target, field, value) {
    if (field.oneof)
      target[field.oneof.localName] = {
        case: field.localName,
        value,
      };
    else target[field.localName] = value;
  }
  function unsafeClear(target, field) {
    let name = field.localName;
    if (field.oneof) {
      let oneofLocalName = field.oneof.localName;
      if (target[oneofLocalName].case === name)
        target[oneofLocalName] = {
          case: undefined,
        };
    } else if (field.presence != IMPLICIT) delete target[name];
    else
      switch (field.fieldKind) {
        case "map":
          target[name] = {};
          break;
        case "list":
          target[name] = [];
          break;
        case "enum":
          target[name] = field.enum.values[0].number;
          break;
        case "scalar":
          target[name] = scalar_js_1.scalarZeroValue(field.scalar, field.longAsString);
          break;
      }
  }
});
export { require_unsafe };

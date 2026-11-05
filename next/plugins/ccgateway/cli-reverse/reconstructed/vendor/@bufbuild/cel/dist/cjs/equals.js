/**
 * @bufbuild/cel/dist/cjs/equals.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_reflect_2 } from "../../../protobuf/dist/commonjs/reflect/index.js";
import { require_eval } from "./eval.js";
import { require_protobuf } from "../../../protobuf/dist/commonjs/index.js";
import { require_list } from "./list.js";
import { require_map } from "./map.js";
import { require_uint } from "./uint.js";
import { require_type } from "./type.js";

//@ chunk-qg41pqt6.js:482899-484143 cjs-fingerprint
var require_equals_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.equals = equals;
  cjsExports.equalsType = equalsType;
  var reflect_1 = require_reflect_2();
  var eval_js_1 = require_eval();
  var protobuf_1 = require_protobuf();
  var list_js_1 = require_list();
  var map_js_1 = require_map();
  var uint_js_1 = require_uint();
  var type_js_1 = require_type();
  function equals(lhs, rhs) {
    if (lhs === rhs) return true;
    if (uint_js_1.isCelUint(lhs)) lhs = lhs.value;
    if (uint_js_1.isCelUint(rhs)) rhs = rhs.value;
    if (
      (typeof lhs === "number" || typeof lhs === "bigint") &&
      (typeof rhs === "number" || typeof rhs === "bigint")
    )
      return lhs == rhs;
    switch (true) {
      case lhs instanceof Uint8Array:
        return rhs instanceof Uint8Array && equalsBytes(lhs, rhs);
      case list_js_1.isCelList(lhs):
        return list_js_1.isCelList(rhs) && equalsList(lhs, rhs);
      case map_js_1.isCelMap(lhs):
        return map_js_1.isCelMap(rhs) && equalsMap(lhs, rhs);
      case type_js_1.isCelType(lhs):
        return type_js_1.isCelType(rhs) && equalsType(lhs, rhs);
    }
    if (reflect_1.isReflectMessage(lhs)) {
      if (!reflect_1.isReflectMessage(rhs)) return false;
      if (lhs.desc.typeName !== rhs.desc.typeName) return false;
      return protobuf_1.equals(lhs.desc, lhs.message, rhs.message, {
        registry: eval_js_1.getEvalContext().registry,
        unpackAny: true,
        unknown: true,
        extensions: true,
      });
    }
    return false;
  }
  function equalsType(lhs, rhs) {
    return lhs.kind === rhs.kind && lhs.name === rhs.name;
  }
  function equalsList(lhs, rhs) {
    if (lhs.size !== rhs.size) return false;
    for (let i = 0; i < lhs.size; i++) if (!equals(lhs.get(i), rhs.get(i))) return false;
    return true;
  }
  function equalsMap(lhs, rhs) {
    if (lhs.size !== rhs.size) return false;
    for (let [k, v] of lhs) {
      let rv = rhs.get(k);
      if (rv === undefined || !equals(v, rv)) return false;
    }
    return true;
  }
  function equalsBytes(lhs, rhs) {
    if (lhs.length !== rhs.length) return false;
    for (let i = 0; i < lhs.length; i++) if (lhs[i] !== rhs[i]) return false;
    return true;
  }
});
export { require_equals_2 };

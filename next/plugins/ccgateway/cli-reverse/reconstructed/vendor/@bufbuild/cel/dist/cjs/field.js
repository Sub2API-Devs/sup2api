/**
 * @bufbuild/cel/dist/cjs/field.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_reflect_2 } from "../../../protobuf/dist/commonjs/reflect/index.js";
import { require_error_4 } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { require_list } from "./list.js";
import { require_map } from "./map.js";
import { require_proto } from "./proto.js";
import { require_value } from "./value.js";

//@ chunk-qg41pqt6.js:602779-604018 cjs-fingerprint
var require_field = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.accessByIndex = accessByIndex;
  cjsExports.accessByName = accessByName;
  cjsExports.isSet = isSet;
  var reflect_1 = require_reflect_2();
  var wkt_1 = require_error_4();
  var list_js_1 = require_list();
  var map_js_1 = require_map();
  var proto_js_1 = require_proto();
  var value_js_1 = require_value();
  function accessByIndex(obj, index) {
    if (typeof obj !== "object" || obj === null) return;
    if (map_js_1.isCelMap(obj)) return obj.get(index);
    if (list_js_1.isCelList(obj)) return obj.get(Number(index));
    return;
  }
  function accessByName(obj, name) {
    if (typeof obj !== "object" || obj === null) return;
    if (map_js_1.isCelMap(obj)) return obj.get(name);
    obj = value_js_1.unwrapAny(obj);
    if (!reflect_1.isReflectMessage(obj)) return;
    let field = obj.desc.fields.find((f) => f.name === name);
    if (!field) return;
    switch (field.fieldKind) {
      case "enum":
        return BigInt(obj.get(field));
      case "list":
        return list_js_1.celList(obj.get(field));
      case "map":
        return map_js_1.celMap(obj.get(field));
      case "scalar":
        return proto_js_1.celFromScalar(field.scalar, obj.get(field));
      case "message":
        if (obj.isSet(field)) return value_js_1.reflectMsgToCel(obj.get(field));
        if (wkt_1.isWrapperDesc(field.message)) return null;
        switch (field.message.typeName) {
          case wkt_1.StructSchema.typeName:
            return map_js_1.EMPTY_MAP;
          case wkt_1.ListValueSchema.typeName:
            return list_js_1.EMPTY_LIST;
          case wkt_1.ValueSchema.typeName:
            return null;
        }
        return reflect_1.reflect(field.message);
    }
  }
  function isSet(obj, name) {
    if (typeof obj !== "object" || obj === null) return false;
    if (map_js_1.isCelMap(obj)) return obj.has(name);
    obj = value_js_1.unwrapAny(obj);
    if (reflect_1.isReflectMessage(obj)) {
      let field = obj.desc.fields.find((f) => f.name === name);
      if (!field) return;
      return obj.isSet(field);
    }
    return false;
  }
});
export { require_field };

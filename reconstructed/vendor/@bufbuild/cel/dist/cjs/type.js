/**
 * @bufbuild/cel/dist/cjs/type.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_list } from "./list.js";
import { require_map } from "./map.js";
import { require_uint } from "./uint.js";
import { require_reflect_2 } from "../../../protobuf/dist/commonjs/reflect/index.js";
import { require_error_4 } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";

//@ chunk-fq0cr76a.js:470154-473203 cjs-fingerprint
var require_type = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DURATION = cjsExports.TIMESTAMP = cjsExports.CelScalar = undefined;
  cjsExports.mapType = mapType;
  cjsExports.listType = listType;
  cjsExports.objectType = objectType;
  cjsExports.celType = celType;
  cjsExports.isCelType = isCelType;
  cjsExports.isObjectCelType = isObjectCelType;
  var list_js_1 = require_list();
  var map_js_1 = require_map();
  var uint_js_1 = require_uint();
  var reflect_1 = require_reflect_2();
  var wkt_1 = require_error_4();
  var privateSymbol = Symbol.for("@bufbuild/cel/type");
  cjsExports.CelScalar = {
    INT: celScalarType("int"),
    UINT: celScalarType("uint"),
    BOOL: celScalarType("bool"),
    STRING: celScalarType("string"),
    BYTES: celScalarType("bytes"),
    DOUBLE: celScalarType("double"),
    NULL: celScalarType("null_type"),
    DYN: celScalarType("dyn"),
    TYPE: celScalarType("type"),
  };
  cjsExports.TIMESTAMP = objectType(wkt_1.TimestampSchema);
  cjsExports.DURATION = objectType(wkt_1.DurationSchema);
  function mapType(key, value) {
    return {
      [privateSymbol]: {},
      kind: "map",
      key,
      value,
      name: "map",
      toString() {
        return `map(${key}, ${value})`;
      },
    };
  }
  function listType(element) {
    return {
      [privateSymbol]: {},
      kind: "list",
      element,
      name: "list",
      toString() {
        return `list(${element})`;
      },
    };
  }
  function objectType(descOrTypeName) {
    let name;
    let desc;
    if (typeof descOrTypeName === "string") {
      name = descOrTypeName;
      desc = undefined;
    } else {
      name = descOrTypeName.typeName;
      desc = descOrTypeName;
    }
    return {
      [privateSymbol]: {},
      kind: "object",
      desc,
      name,
      toString() {
        return name;
      },
    };
  }
  function celScalarType(scalar) {
    return {
      [privateSymbol]: {},
      kind: "scalar",
      scalar,
      name: scalar,
      toString() {
        return scalar;
      },
    };
  }
  function celType(v) {
    switch (typeof v) {
      case "bigint":
        return cjsExports.CelScalar.INT;
      case "boolean":
        return cjsExports.CelScalar.BOOL;
      case "number":
        return cjsExports.CelScalar.DOUBLE;
      case "string":
        return cjsExports.CelScalar.STRING;
      case "object":
        switch (true) {
          case v === null:
            return cjsExports.CelScalar.NULL;
          case v instanceof Uint8Array:
            return cjsExports.CelScalar.BYTES;
          case reflect_1.isReflectMessage(v):
            return celTypeOfMessage(v);
          case list_js_1.isCelList(v):
            return listType(cjsExports.CelScalar.DYN);
          case map_js_1.isCelMap(v):
            return mapType(cjsExports.CelScalar.DYN, cjsExports.CelScalar.DYN);
          case uint_js_1.isCelUint(v):
            return cjsExports.CelScalar.UINT;
          default:
            if (isObjectCelType(v)) return cjsExports.CelScalar.TYPE;
        }
    }
    throw Error(`Not a CEL value: ${v}`);
  }
  function isCelType(v) {
    return typeof v === "object" && v !== null && isObjectCelType(v);
  }
  function isObjectCelType(v) {
    return privateSymbol in v;
  }
  function celTypeOfMessage(v) {
    let typeName = v.desc.typeName;
    if (isReflectMessageAny(v)) {
      typeName = typeUrlToName(v.message.typeUrl);
      if (typeName === wkt_1.ValueSchema.typeName) {
        let value = wkt_1.anyUnpack(v.message, wkt_1.ValueSchema);
        return value ? valueToType(value) : cjsExports.CelScalar.NULL;
      }
    }
    switch (typeName) {
      case wkt_1.FloatValueSchema.typeName:
      case wkt_1.DoubleValueSchema.typeName:
        return cjsExports.CelScalar.DOUBLE;
      case wkt_1.UInt64ValueSchema.typeName:
      case wkt_1.UInt32ValueSchema.typeName:
        return cjsExports.CelScalar.UINT;
      case wkt_1.Int32ValueSchema.typeName:
      case wkt_1.Int64ValueSchema.typeName:
        return cjsExports.CelScalar.INT;
      case wkt_1.StringValueSchema.typeName:
        return cjsExports.CelScalar.STRING;
      case wkt_1.BytesValueSchema.typeName:
        return cjsExports.CelScalar.BYTES;
      case wkt_1.BoolValueSchema.typeName:
        return cjsExports.CelScalar.BOOL;
      case wkt_1.StructSchema.typeName:
        return mapType(cjsExports.CelScalar.STRING, cjsExports.CelScalar.DYN);
      case wkt_1.ListValueSchema.typeName:
        return listType(cjsExports.CelScalar.DYN);
      case wkt_1.ValueSchema.typeName:
        return valueToType(v.message);
    }
    return typeName === v.desc.typeName ? objectType(v.desc) : objectType(typeName);
  }
  function valueToType(v) {
    switch (v.kind.case) {
      case "boolValue":
        return cjsExports.CelScalar.BOOL;
      case "listValue":
        return listType(cjsExports.CelScalar.DYN);
      case "nullValue":
      case undefined:
        return cjsExports.CelScalar.NULL;
      case "numberValue":
        return cjsExports.CelScalar.DOUBLE;
      case "stringValue":
        return cjsExports.CelScalar.STRING;
      case "structValue":
        return mapType(cjsExports.CelScalar.STRING, cjsExports.CelScalar.DYN);
    }
  }
  function isReflectMessageAny(v) {
    return v.desc.typeName === wkt_1.AnySchema.typeName;
  }
  function typeUrlToName(url) {
    let slash = url.lastIndexOf("/");
    let name = slash >= 0 ? url.substring(slash + 1) : url;
    if (!name.length) throw Error(`invalid type url: ${url}`);
    return name;
  }
});
export { require_type };

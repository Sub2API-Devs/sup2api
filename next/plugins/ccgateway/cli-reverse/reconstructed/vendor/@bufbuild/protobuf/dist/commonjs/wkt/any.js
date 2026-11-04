/**
 * @bufbuild/protobuf/dist/commonjs/wkt/any.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_any_pb } from "./google/protobuf/any_pb.js";
import { require_create } from "../../cjs/create.js";
import { require_to_binary } from "../../cjs/to-binary.js";
import { require_from_binary } from "../from-binary.js";

//@ chunk-fq0cr76a.js:419542-420360 cjs-fingerprint
var require_any = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.anyPack = anyPack;
  cjsExports.anyIs = anyIs;
  cjsExports.anyUnpack = anyUnpack;
  cjsExports.anyUnpackTo = anyUnpackTo;
  var any_pb_js_1 = require_any_pb();
  var create_js_1 = require_create();
  var to_binary_js_1 = require_to_binary();
  var from_binary_js_1 = require_from_binary();
  function anyPack(schema, message, into) {
    let ret = false;
    if (!into) {
      into = create_js_1.create(any_pb_js_1.AnySchema);
      ret = true;
    }
    into.value = to_binary_js_1.toBinary(schema, message);
    into.typeUrl = typeNameToUrl(message.$typeName);
    return ret ? into : undefined;
  }
  function anyIs(any, descOrTypeName) {
    if (any.typeUrl === "") return false;
    let want = typeof descOrTypeName == "string" ? descOrTypeName : descOrTypeName.typeName;
    let got = typeUrlToName(any.typeUrl);
    return want === got;
  }
  function anyUnpack(any, registryOrMessageDesc) {
    if (any.typeUrl === "") return;
    let desc =
      registryOrMessageDesc.kind == "message"
        ? registryOrMessageDesc
        : registryOrMessageDesc.getMessage(typeUrlToName(any.typeUrl));
    if (!desc || !anyIs(any, desc)) return;
    return from_binary_js_1.fromBinary(desc, any.value);
  }
  function anyUnpackTo(any, schema, message) {
    if (!anyIs(any, schema)) return;
    return from_binary_js_1.mergeFromBinary(schema, message, any.value);
  }
  function typeNameToUrl(name) {
    return `type.googleapis.com/${name}`;
  }
  function typeUrlToName(url) {
    let slash = url.lastIndexOf("/");
    let name = slash >= 0 ? url.substring(slash + 1) : url;
    if (!name.length) throw Error(`invalid type url: ${url}`);
    return name;
  }
});
export { require_any };

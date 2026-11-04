/**
 * @bufbuild/protobuf/dist/cjs/codegenv2/file.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_base64_encoding } from "../wire/base64-encoding.js";
import { require_descriptor_pb } from "../../commonjs/wkt/gen/google/protobuf/descriptor_pb.js";
import { require_registry } from "../registry.js";
import { require_restore_json_names } from "./restore-json-names.js";
import { require_from_binary } from "../../commonjs/from-binary.js";

//@ chunk-fq0cr76a.js:413424-413898 cjs-require-graph
var require_file = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.fileDesc = fileDesc;
  var base64_encoding_js_1 = require_base64_encoding();
  var descriptor_pb_js_1 = require_descriptor_pb();
  var registry_js_1 = require_registry();
  var restore_json_names_js_1 = require_restore_json_names();
  var from_binary_js_1 = require_from_binary();
  function fileDesc(b64, imports) {
    var _a;
    let root = from_binary_js_1.fromBinary(
      descriptor_pb_js_1.FileDescriptorProtoSchema,
      base64_encoding_js_1.base64Decode(b64),
    );
    root.messageType.forEach(restore_json_names_js_1.restoreJsonNames);
    root.dependency =
      (_a = imports === null || imports === undefined ? undefined : imports.map((f) => f.proto.name)) !==
        null && _a !== undefined
        ? _a
        : [];
    return registry_js_1
      .createFileRegistry(root, (name) =>
        imports === null || imports === undefined ? undefined : imports.find((f) => f.proto.name === name),
      )
      .getFile(root.name);
  }
});
export { require_file };

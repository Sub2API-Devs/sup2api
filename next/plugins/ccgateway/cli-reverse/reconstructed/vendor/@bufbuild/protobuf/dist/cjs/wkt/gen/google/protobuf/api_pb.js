/**
 * @bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/api_pb.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../../../runtime/bun-runtime.js";
import { require_file } from "../../../../codegenv2/file.js";
import { require_source_context_pb } from "./source_context_pb.js";
import { require_type_pb } from "./type_pb.js";
import { require_message } from "../../../../codegenv2/message.js";

//@ chunk-qg41pqt6.js:425587-427042 cjs-fingerprint
var require_api_pb = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.MixinSchema =
    cjsExports.MethodSchema =
    cjsExports.ApiSchema =
    cjsExports.file_google_protobuf_api =
      undefined;
  var file_js_1 = require_file();
  var source_context_pb_js_1 = require_source_context_pb();
  var type_pb_js_1 = require_type_pb();
  var message_js_1 = require_message();
  cjsExports.file_google_protobuf_api = file_js_1.fileDesc(
    "Chlnb29nbGUvcHJvdG9idWYvYXBpLnByb3RvEg9nb29nbGUucHJvdG9idWYikgIKA0FwaRIMCgRuYW1lGAEgASgJEigKB21ldGhvZHMYAiADKAsyFy5nb29nbGUucHJvdG9idWYuTWV0aG9kEigKB29wdGlvbnMYAyADKAsyFy5nb29nbGUucHJvdG9idWYuT3B0aW9uEg8KB3ZlcnNpb24YBCABKAkSNgoOc291cmNlX2NvbnRleHQYBSABKAsyHi5nb29nbGUucHJvdG9idWYuU291cmNlQ29udGV4dBImCgZtaXhpbnMYBiADKAsyFi5nb29nbGUucHJvdG9idWYuTWl4aW4SJwoGc3ludGF4GAcgASgOMhcuZ29vZ2xlLnByb3RvYnVmLlN5bnRheBIPCgdlZGl0aW9uGAggASgJIu4BCgZNZXRob2QSDAoEbmFtZRgBIAEoCRIYChByZXF1ZXN0X3R5cGVfdXJsGAIgASgJEhkKEXJlcXVlc3Rfc3RyZWFtaW5nGAMgASgIEhkKEXJlc3BvbnNlX3R5cGVfdXJsGAQgASgJEhoKEnJlc3BvbnNlX3N0cmVhbWluZxgFIAEoCBIoCgdvcHRpb25zGAYgAygLMhcuZ29vZ2xlLnByb3RvYnVmLk9wdGlvbhIrCgZzeW50YXgYByABKA4yFy5nb29nbGUucHJvdG9idWYuU3ludGF4QgIYARITCgdlZGl0aW9uGAggASgJQgIYASIjCgVNaXhpbhIMCgRuYW1lGAEgASgJEgwKBHJvb3QYAiABKAlCdgoTY29tLmdvb2dsZS5wcm90b2J1ZkIIQXBpUHJvdG9QAVosZ29vZ2xlLmdvbGFuZy5vcmcvcHJvdG9idWYvdHlwZXMva25vd24vYXBpcGKiAgNHUEKqAh5Hb29nbGUuUHJvdG9idWYuV2VsbEtub3duVHlwZXNiBnByb3RvMw",
    [source_context_pb_js_1.file_google_protobuf_source_context, type_pb_js_1.file_google_protobuf_type],
  );
  cjsExports.ApiSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_api, 0);
  cjsExports.MethodSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_api, 1);
  cjsExports.MixinSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_api, 2);
});
export { require_api_pb };

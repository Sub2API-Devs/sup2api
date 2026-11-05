/**
 * @bufbuild/cel/dist/cjs/parse.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_syntax_pb } from "../../../cel-spec/dist/cjs/gen/cel/expr/syntax_pb.js";
import { require_parser } from "./parser.js";
import { require_protobuf } from "../../../protobuf/dist/commonjs/index.js";

//@ chunk-qg41pqt6.js:597883-598072 cjs-fingerprint
var require_parse_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.parse = parse;
  var syntax_pb_js_1 = require_syntax_pb();
  var parser_js_1 = require_parser();
  var protobuf_1 = require_protobuf();
  function parse(expr) {
    return protobuf_1.create(syntax_pb_js_1.ParsedExprSchema, {
      expr: parser_js_1.parse(expr),
    });
  }
});
export { require_parse_2 };

/**
 * @bufbuild/cel/dist/cjs/parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_syntax_pb } from "../../../cel-spec/dist/cjs/gen/cel/expr/syntax_pb.js";
import { require_parser } from "./parser.js";
import { require_protobuf } from "../../../protobuf/dist/commonjs/index.js";

//@ chunk-fq0cr76a.js:597305-597494 cjs-fingerprint
var require_parse_2 = x(function (cjsExports) {
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

/**
 * json-bigint/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: json-bigint@1.0.0
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_stringify } from "./lib/stringify.js";
import { require_parse } from "./lib/parse.js";

//@ chunk-e8d3a8an.js:43194-43354 cjs-require-graph
var require_json_bigint = __commonJS(function (cjsExports, cjsModule) {
  var json_stringify = require_stringify().stringify;
  var json_parse = require_parse();
  cjsModule.exports = function (options) {
    return {
      parse: json_parse(options),
      stringify: json_stringify,
    };
  };
  cjsModule.exports.parse = json_parse();
  cjsModule.exports.stringify = json_stringify;
});
export { require_json_bigint };

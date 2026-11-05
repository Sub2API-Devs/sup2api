/**
 * protobufjs/src/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_index_light } from "./index-light.js";
import { require_tokenize } from "./tokenize.js";
import { require_parse } from "./parse.js";
import { require_common } from "./common.js";

//@ chunk-3k21nfa0.js:142798-142957 cjs-fingerprint
var require_protobufjs = __commonJS(function (cjsExports, cjsModule) {
  var protobuf = (cjsModule.exports = require_index_light());
  protobuf.build = "full";
  protobuf.tokenize = require_tokenize();
  protobuf.parse = require_parse();
  protobuf.common = require_common();
  protobuf.Root._configure(protobuf.Type, protobuf.parse, protobuf.common);
});
export { require_protobufjs };

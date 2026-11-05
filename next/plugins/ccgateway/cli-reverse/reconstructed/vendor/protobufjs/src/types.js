/**
 * protobufjs/src/types.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_util_2 } from "./util.js";

//@ chunk-3k21nfa0.js:114753-115253 cjs-fingerprint
var require_types = __commonJS(function (cjsExports) {
  var types = cjsExports;
  var util = require_util_2();
  var s = [
    "double",
    "float",
    "int32",
    "uint32",
    "sint32",
    "fixed32",
    "sfixed32",
    "int64",
    "uint64",
    "sint64",
    "fixed64",
    "sfixed64",
    "bool",
    "string",
    "bytes",
  ];
  function bake(values, offset) {
    var i_2 = 0;
    var o = Object.create(null);
    offset |= 0;
    while (i_2 < values.length) o[s[i_2 + offset]] = values[i_2++];
    return o;
  }
  types.basic = bake([1, 5, 0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0, 2, 2]);
  types.defaults = bake([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, false, "", util.emptyArray, null]);
  types.long = bake([0, 0, 0, 1, 1], 7);
  types.mapKey = bake([0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0, 2], 2);
  types.packed = bake([1, 5, 0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0]);
});
export { require_types };

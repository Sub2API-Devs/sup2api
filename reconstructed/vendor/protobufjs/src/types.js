/**
 * protobufjs/src/types.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:114753-115253 cjs-fingerprint
var Cr = x(function (Md) {
  var Mi = Md,
    IE = de(),
    xE = [
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
  function Ii(e, t) {
    var r = 0,
      create = Object.create(null);
    t |= 0;
    while (r < e.length) create[xE[r + t]] = e[r++];
    return create;
  }
  Mi.basic = Ii([1, 5, 0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0, 2, 2]);
  Mi.defaults = Ii([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, !1, "", IE.emptyArray, null]);
  Mi.long = Ii([0, 0, 0, 1, 1], 7);
  Mi.mapKey = Ii([0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0, 2], 2);
  Mi.packed = Ii([1, 5, 0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0]);
});

export { Cr };

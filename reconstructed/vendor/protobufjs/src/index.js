/**
 * protobufjs/src/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Wd } from "./index-light.js";
import { ao } from "./tokenize.js";
import { Qd } from "./parse.js";
import { th } from "./common.js";

//@ chunk-pwh5dx3n.js:142798-142957 cjs-fingerprint
var qs = x(function (bA, rh) {
  var Jt = (rh.exports = Wd());
  Jt.build = "full";
  Jt.tokenize = ao();
  Jt.parse = Qd();
  Jt.common = th();
  Jt.Root._configure(Jt.Type, Jt.parse, Jt.common);
});

export { qs };

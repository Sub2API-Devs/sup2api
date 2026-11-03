/**
 * @bufbuild/cel/dist/cjs/timestamp.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { li } from "../../../protobuf/dist/commonjs/index.js";
import { Os } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";

//@ chunk-fq0cr76a.js:481955-482325 cjs-fingerprint
var lB = x(function (aB) {
  Object.defineProperty(aB, "__esModule", { value: !0 });
  aB.createTimestamp = Uee;
  var iB = li(),
    oB = Os(),
    Lee = 253402300799n,
    Bee = -62135596800n,
    vp = 1000000000n;
  function Uee(e = 0n, n = 0n) {
    let r = e * vp + BigInt(n),
      s = r % vp < 0n ? 1n : 0n,
      h = r / vp - s,
      y = Number((r % vp) + s * vp);
    if (h > Lee || h < Bee) throw Error("timestamp out of range");
    return iB.create(oB.TimestampSchema, { seconds: h, nanos: y });
  }
});

export { lB };

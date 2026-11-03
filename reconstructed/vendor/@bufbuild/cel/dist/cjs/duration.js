/**
 * @bufbuild/cel/dist/cjs/duration.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Os } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { li } from "../../../protobuf/dist/commonjs/index.js";

//@ chunk-fq0cr76a.js:480792-481955 cjs-fingerprint
var L_ = x(function (sB) {
  Object.defineProperty(sB, "__esModule", { value: !0 });
  sB.createDuration = P_;
  sB.parseDuration = Dee;
  var tB = Os(),
    nB = li(),
    O_ = 1000000000n,
    Iee = 9223372036854775807n,
    Nee = -9223372036854775808n;
  function P_(e = 0n, n = 0n) {
    let r = e * O_ + BigInt(n);
    if (r > Iee || r < Nee) throw Error("duration out of range");
    return nB.create(tB.DurationSchema, { seconds: r / O_, nanos: Number(r % O_) });
  }
  var JL = 128,
    freeze = Object.freeze({
      ns: 1n,
      us: 1000n,
      µs: 1000n,
      ms: 1000n * 1000n,
      s: 1000n * 1000n * 1000n,
      m: 1000n * 1000n * 1000n * 60n,
      h: 1000n * 1000n * 1000n * 60n * 60n,
    }),
    QL = /^\d+/,
    regExp = new RegExp(`^(${Object.keys(freeze).join("|")})`);
  function Dee(e) {
    if (e.length > JL) throw eB(`duration string exceeds ${JL} characters`);
    if (/^[-+]?0$/.test(e)) return P_();
    let [n, r] = /^[+-]/.test(e) ? [e[0] === "+" ? 1n : -1n, e.slice(1)] : [1n, e],
      s = 0n,
      h = r;
    while (h.length > 0) {
      let y = QL.exec(h)?.[0];
      if (((h = h.slice(y?.length ?? 0)), h[0] === ".")) h = h.slice(1);
      let b = QL.exec(h)?.[0];
      h = h.slice(b?.length ?? 0);
      let S = regExp.exec(h)?.[0];
      if (((h = h.slice(S?.length ?? 0)), (y ?? b) === void 0 || S === void 0)) throw eB("invalid syntax");
      let w = freeze[S];
      ((s += BigInt(y ?? 0) * w), (s += (BigInt(b ?? 0) * w) / 10n ** BigInt(b?.length ?? 0)));
    }
    return P_(0n, n * s);
  }
  function eB(e) {
    return Error(`Failed to parse duration: ${e}`);
  }
});

export { L_ };

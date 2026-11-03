/**
 * @bufbuild/protobuf/dist/commonjs/wkt/duration.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { m_ } from "./google/protobuf/duration_pb.js";
import { wl } from "../../cjs/create.js";
import { ko } from "../proto-int64.js";

//@ chunk-fq0cr76a.js:415592-415973 cjs-fingerprint
var _O = x(function (xO) {
  Object.defineProperty(xO, "__esModule", { value: !0 });
  xO.durationFromMs = Oz;
  xO.durationMs = Pz;
  var bO = m_(),
    SO = wl(),
    EO = ko();
  function Oz(e) {
    let n = e < 0 ? -1 : 1,
      abs = Math.abs(e),
      floored = Math.floor(abs / 1000),
      h = (abs - floored * 1000) * 1e6;
    return SO.create(bO.DurationSchema, {
      seconds: EO.protoInt64.parse(floored * n),
      nanos: h === 0 ? 0 : h * n,
    });
  }
  function Pz(e) {
    return Number(e.seconds) * 1000 + Math.round(e.nanos / 1e6);
  }
});

export { _O };

/**
 * @bufbuild/protobuf/dist/commonjs/wkt/timestamp.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { h_ } from "./google/protobuf/timestamp_pb.js";
import { wl } from "../../cjs/create.js";
import { ko } from "../proto-int64.js";

//@ chunk-fq0cr76a.js:414492-415008 cjs-fingerprint
var fO = x(function (dO) {
  Object.defineProperty(dO, "__esModule", { value: !0 });
  dO.timestampNow = Az;
  dO.timestampFromDate = lO;
  dO.timestampDate = Cz;
  dO.timestampFromMs = cO;
  dO.timestampMs = uO;
  var iO = h_(),
    oO = wl(),
    aO = ko();
  function Az() {
    return lO(new Date());
  }
  function lO(e) {
    return cO(e.getTime());
  }
  function Cz(e) {
    return new Date(uO(e));
  }
  function cO(e) {
    let floored = Math.floor(e / 1000);
    return oO.create(iO.TimestampSchema, {
      seconds: aO.protoInt64.parse(floored),
      nanos: (e - floored * 1000) * 1e6,
    });
  }
  function uO(e) {
    return Number(e.seconds) * 1000 + Math.round(e.nanos / 1e6);
  }
});

export { fO };

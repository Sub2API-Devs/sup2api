/**
 * types/generated/google/protobuf/timestamp.ts
 *
 * protobuf 生成代码：google.protobuf.Timestamp 与 Date 互转。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/types/generated/google/protobuf/timestamp.ts
 * pieces: chunk-aepeg2w5.js (3)
 * attribution: fingerprint 2, file-last-pair 1
 */

//@ chunk-aepeg2w5.js:660137-660177 fingerprint = createBaseTimestamp (1)
function createBaseTimestamp() {
  return { seconds: 0, nanos: 0 };
}
//@ chunk-aepeg2w5.js:660177-660556 fingerprint = Timestamp (1)
var Timestamp = {
  fromJSON(e) {
    return {
      seconds: isSet_3(e.seconds) ? globalThis.Number(e.seconds) : 0,
      nanos: isSet_3(e.nanos) ? globalThis.Number(e.nanos) : 0,
    };
  },
  toJSON(e) {
    let n = {};
    if (e.seconds !== void 0) n.seconds = Math.round(e.seconds);
    if (e.nanos !== void 0) n.nanos = Math.round(e.nanos);
    return n;
  },
  create(e) {
    return Timestamp.fromPartial(e ?? {});
  },
  fromPartial(e) {
    let n = createBaseTimestamp();
    return ((n.seconds = e.seconds ?? 0), (n.nanos = e.nanos ?? 0), n);
  },
};
//@ chunk-aepeg2w5.js:660556-660599 file-last-pair
function isSet_3(value) {
  return value !== null && value !== void 0;
}

export { Timestamp };

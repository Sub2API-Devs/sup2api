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

//@ chunk-aepeg2w5.js:660137-660177 fingerprint (2.1.88 match: createBaseTimestamp, 1)
function createBaseTimestamp() {
  return {
    seconds: 0,
    nanos: 0,
  };
}
//@ chunk-aepeg2w5.js:660177-660556 fingerprint (2.1.88 match: Timestamp, 1)
var Timestamp = {
  fromJSON(object) {
    return {
      seconds: isSet_3(object.seconds) ? globalThis.Number(object.seconds) : 0,
      nanos: isSet_3(object.nanos) ? globalThis.Number(object.nanos) : 0,
    };
  },
  toJSON(message) {
    let obj = {};
    if (message.seconds !== undefined) obj.seconds = Math.round(message.seconds);
    if (message.nanos !== undefined) obj.nanos = Math.round(message.nanos);
    return obj;
  },
  create(base) {
    return Timestamp.fromPartial(base ?? {});
  },
  fromPartial(object) {
    let message = createBaseTimestamp();
    message.seconds = object.seconds ?? 0;
    message.nanos = object.nanos ?? 0;
    return message;
  },
};
//@ chunk-aepeg2w5.js:660556-660599 file-last-pair
function isSet_3(value) {
  return value !== null && value !== undefined;
}
export { Timestamp };

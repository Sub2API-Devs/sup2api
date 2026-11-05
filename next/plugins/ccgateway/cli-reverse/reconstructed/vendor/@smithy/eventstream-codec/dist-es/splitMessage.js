/**
 * @smithy/eventstream-codec/dist-es/splitMessage.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/eventstream-codec@4.2.13..4.2.14
 * pieces: chunk-ayc8mk37.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Crc32 } from "../../../@aws-crypto/crc32/build/module/index.js";

//@ chunk-ayc8mk37.js:8241-8270 esm-layout
var PRELUDE_MEMBER_LENGTH = 4;
var PRELUDE_LENGTH = PRELUDE_MEMBER_LENGTH * 2;
var CHECKSUM_LENGTH = 4;
var MINIMUM_MESSAGE_LENGTH = PRELUDE_LENGTH + CHECKSUM_LENGTH * 2;
//@ chunk-ayc8mk37.js:8270-9036 esm-fingerprint
function splitMessage({ byteLength, byteOffset, buffer }) {
  if (byteLength < MINIMUM_MESSAGE_LENGTH)
    throw Error("Provided message too short to accommodate event stream message overhead");
  let view = new DataView(buffer, byteOffset, byteLength);
  let messageLength = view.getUint32(0, false);
  if (byteLength !== messageLength)
    throw Error("Reported message length does not match received message length");
  let headerLength = view.getUint32(PRELUDE_MEMBER_LENGTH, false);
  let expectedPreludeChecksum = view.getUint32(PRELUDE_LENGTH, false);
  let expectedMessageChecksum = view.getUint32(byteLength - CHECKSUM_LENGTH, false);
  let checksummer = new Crc32().update(new Uint8Array(buffer, byteOffset, PRELUDE_LENGTH));
  if (expectedPreludeChecksum !== checksummer.digest())
    throw Error(
      `The prelude checksum specified in the message (${expectedPreludeChecksum}) does not match the calculated CRC32 checksum (${checksummer.digest()})`,
    );
  checksummer.update(
    new Uint8Array(buffer, byteOffset + PRELUDE_LENGTH, byteLength - (PRELUDE_LENGTH + CHECKSUM_LENGTH)),
  );
  if (expectedMessageChecksum !== checksummer.digest())
    throw Error(
      `The message checksum (${checksummer.digest()}) did not match the expected value of ${expectedMessageChecksum}`,
    );
  return {
    headers: new DataView(buffer, byteOffset + PRELUDE_LENGTH + CHECKSUM_LENGTH, headerLength),
    body: new Uint8Array(
      buffer,
      byteOffset + PRELUDE_LENGTH + CHECKSUM_LENGTH + headerLength,
      messageLength - headerLength - (PRELUDE_LENGTH + CHECKSUM_LENGTH + CHECKSUM_LENGTH),
    ),
  };
}
export { splitMessage };

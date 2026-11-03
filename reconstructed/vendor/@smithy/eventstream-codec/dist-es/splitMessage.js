/**
 * @smithy/eventstream-codec/dist-es/splitMessage.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/eventstream-codec@4.2.13..4.2.14
 * pieces: chunk-3cddmtk7.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { g } from "../../../@aws-crypto/crc32/build/module/index.js";

//@ chunk-3cddmtk7.js:8241-8270 esm-layout
var ue = 4,
  x = ue * 2,
  f = 4,
  Mt = x + f * 2;
//@ chunk-3cddmtk7.js:8270-9036 esm-fingerprint
function de({ byteLength: byteLength, byteOffset: byteOffset, buffer: buffer }) {
  if (byteLength < Mt) throw Error("Provided message too short to accommodate event stream message overhead");
  let dataView = new DataView(buffer, byteOffset, byteLength),
    uint32 = dataView.getUint32(0, !1);
  if (byteLength !== uint32) throw Error("Reported message length does not match received message length");
  let uint32_2 = dataView.getUint32(ue, !1),
    uint32_3 = dataView.getUint32(x, !1),
    uint32_4 = dataView.getUint32(byteLength - f, !1),
    update = new g().update(new Uint8Array(buffer, byteOffset, x));
  if (uint32_3 !== update.digest())
    throw Error(
      `The prelude checksum specified in the message (${uint32_3}) does not match the calculated CRC32 checksum (${update.digest()})`,
    );
  if (
    (update.update(new Uint8Array(buffer, byteOffset + x, byteLength - (x + f))),
    uint32_4 !== update.digest())
  )
    throw Error(`The message checksum (${update.digest()}) did not match the expected value of ${uint32_4}`);
  return {
    headers: new DataView(buffer, byteOffset + x + f, uint32_2),
    body: new Uint8Array(buffer, byteOffset + x + f + uint32_2, uint32 - uint32_2 - (x + f + f)),
  };
}

export { de };

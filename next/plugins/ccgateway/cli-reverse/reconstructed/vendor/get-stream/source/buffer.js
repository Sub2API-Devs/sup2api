/**
 * get-stream/source/buffer.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: get-stream@8.0.1
 * pieces: chunk-t889g22j.js (2)
 * attribution: esm-fingerprint 2
 */
import { getStreamAsBuffer } from "./array-buffer.js";

//@ chunk-t889g22j.js:23879-24102 esm-fingerprint
async function getStreamAsBuffer_2(stream, options) {
  if (!("Buffer" in globalThis)) throw Error("getStreamAsBuffer() is only supported in Node.js");
  try {
    return arrayBufferToNodeBuffer(await getStreamAsBuffer(stream, options));
  } catch (error) {
    if (error.bufferedData !== undefined) error.bufferedData = arrayBufferToNodeBuffer(error.bufferedData);
    throw error;
  }
}
//@ chunk-t889g22j.js:24102-24140 esm-fingerprint
var arrayBufferToNodeBuffer = (arrayBuffer) => globalThis.Buffer.from(arrayBuffer);
export { getStreamAsBuffer_2 };

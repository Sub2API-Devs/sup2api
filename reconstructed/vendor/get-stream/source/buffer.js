/**
 * get-stream/source/buffer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: get-stream@8.0.1
 * pieces: chunk-m4p5zn6n.js (2)
 * attribution: esm-fingerprint 2
 */
import { Ge } from "./array-buffer.js";

//@ chunk-m4p5zn6n.js:23880-24103 esm-fingerprint
async function getStreamAsBuffer(stream, options) {
  if (!("Buffer" in globalThis)) throw Error("getStreamAsBuffer() is only supported in Node.js");
  try {
    return arrayBufferToNodeBuffer(await Ge(stream, options));
  } catch (error) {
    if (error.bufferedData !== undefined) error.bufferedData = arrayBufferToNodeBuffer(error.bufferedData);
    throw error;
  }
}
//@ chunk-m4p5zn6n.js:24103-24141 esm-fingerprint
var arrayBufferToNodeBuffer = (arrayBuffer) => globalThis.Buffer.from(arrayBuffer);
export { getStreamAsBuffer };

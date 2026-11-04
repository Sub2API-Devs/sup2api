/**
 * @smithy/util-stream/dist-cjs/headStream.browser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-wjd9n4jx.js:6573-7005 cjs-fingerprint
var require_headStream_browser = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.headStream = headStream;
  async function headStream(stream, bytes) {
    let byteLengthCounter = 0;
    let chunks = [];
    let reader = stream.getReader();
    let isDone = false;
    while (!isDone) {
      let { done, value } = await reader.read();
      if (value) {
        chunks.push(value);
        byteLengthCounter += value?.byteLength ?? 0;
      }
      if (byteLengthCounter >= bytes) break;
      isDone = done;
    }
    reader.releaseLock();
    let collected = new Uint8Array(Math.min(bytes, byteLengthCounter));
    let offset = 0;
    for (let chunk of chunks) {
      if (chunk.byteLength > collected.byteLength - offset) {
        collected.set(chunk.subarray(0, collected.byteLength - offset), offset);
        break;
      } else collected.set(chunk, offset);
      offset += chunk.length;
    }
    return collected;
  }
});
export { require_headStream_browser };

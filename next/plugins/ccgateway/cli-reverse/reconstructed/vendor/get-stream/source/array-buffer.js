/**
 * get-stream/source/array-buffer.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: get-stream@8.0.1
 * pieces: chunk-t889g22j.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { getStreamContents } from "./contents.js";
import { throwObjectStream, getLengthProp, noop } from "./utils.js";

//@ chunk-t889g22j.js:22965-23005 esm-layout
async function getStreamAsBuffer(stream, options) {
  return getStreamContents(stream, arrayBufferMethods, options);
}
//@ chunk-t889g22j.js:23005-23879 esm-fingerprint
var initArrayBuffer = () => ({
  contents: new ArrayBuffer(0),
});
var useTextEncoder = (chunk) => textEncoder.encode(chunk);
var textEncoder = new TextEncoder();
var useUint8Array = (chunk) => new Uint8Array(chunk);
var useUint8ArrayWithOffset = (chunk) => new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
var truncateArrayBufferChunk = (convertedChunk, chunkSize) => convertedChunk.slice(0, chunkSize);
var addArrayBufferChunk = (convertedChunk, { contents, length: previousLength }, length) => {
  let newContents = hasArrayBufferResize()
    ? resizeArrayBuffer(contents, length)
    : resizeArrayBufferSlow(contents, length);
  new Uint8Array(newContents).set(convertedChunk, previousLength);
  return newContents;
};
var resizeArrayBufferSlow = (contents, length) => {
  if (length <= contents.byteLength) return contents;
  let arrayBuffer = new ArrayBuffer(getNewContentsLength(length));
  new Uint8Array(arrayBuffer).set(new Uint8Array(contents), 0);
  return arrayBuffer;
};
var resizeArrayBuffer = (contents, length) => {
  if (length <= contents.maxByteLength) {
    contents.resize(length);
    return contents;
  }
  let arrayBuffer = new ArrayBuffer(length, {
    maxByteLength: getNewContentsLength(length),
  });
  new Uint8Array(arrayBuffer).set(new Uint8Array(contents), 0);
  return arrayBuffer;
};
var getNewContentsLength = (length) => SCALE_FACTOR ** Math.ceil(Math.log(length) / Math.log(SCALE_FACTOR));
var SCALE_FACTOR = 2;
var finalizeArrayBuffer = ({ contents, length }) =>
  hasArrayBufferResize() ? contents : contents.slice(0, length);
var hasArrayBufferResize = () => "resize" in ArrayBuffer.prototype;
var arrayBufferMethods = {
  init: initArrayBuffer,
  convertChunk: {
    string: useTextEncoder,
    buffer: useUint8Array,
    arrayBuffer: useUint8Array,
    dataView: useUint8ArrayWithOffset,
    typedArray: useUint8ArrayWithOffset,
    others: throwObjectStream,
  },
  getSize: getLengthProp,
  truncateChunk: truncateArrayBufferChunk,
  addChunk: addArrayBufferChunk,
  getFinalChunk: noop,
  finalize: finalizeArrayBuffer,
};
export { getStreamAsBuffer };

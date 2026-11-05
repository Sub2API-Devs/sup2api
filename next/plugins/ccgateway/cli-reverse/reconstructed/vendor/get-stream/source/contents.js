/**
 * get-stream/source/contents.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: get-stream@8.0.1
 * pieces: chunk-t889g22j.js (2)
 * attribution: esm-fingerprint 2
 */
//@ chunk-t889g22j.js:21235-22729 esm-fingerprint
var getStreamContents = async (
  stream,
  { init, convertChunk, getSize, truncateChunk, addChunk, getFinalChunk, finalize },
  { maxBuffer = Number.POSITIVE_INFINITY } = {},
) => {
  if (!isAsyncIterable(stream))
    throw Error("The first argument must be a Readable, a ReadableStream, or an async iterable.");
  let state = init();
  state.length = 0;
  try {
    for await (let chunk of stream) {
      let chunkType = getChunkType(chunk);
      let convertedChunk = convertChunk[chunkType](chunk, state);
      appendChunk({
        convertedChunk,
        state,
        getSize,
        truncateChunk,
        addChunk,
        maxBuffer,
      });
    }
    appendFinalChunk({
      state,
      convertChunk,
      getSize,
      truncateChunk,
      addChunk,
      getFinalChunk,
      maxBuffer,
    });
    return finalize(state);
  } catch (error) {
    error.bufferedData = finalize(state);
    throw error;
  }
};
var appendFinalChunk = ({ state, getSize, truncateChunk, addChunk, getFinalChunk, maxBuffer }) => {
  let convertedChunk = getFinalChunk(state);
  if (convertedChunk !== undefined)
    appendChunk({
      convertedChunk,
      state,
      getSize,
      truncateChunk,
      addChunk,
      maxBuffer,
    });
};
var appendChunk = ({ convertedChunk, state, getSize, truncateChunk, addChunk, maxBuffer }) => {
  let chunkSize = getSize(convertedChunk);
  let newLength = state.length + chunkSize;
  if (newLength <= maxBuffer) {
    addNewChunk(convertedChunk, state, addChunk, newLength);
    return;
  }
  let truncatedChunk = truncateChunk(convertedChunk, maxBuffer - state.length);
  if (truncatedChunk !== undefined) addNewChunk(truncatedChunk, state, addChunk, maxBuffer);
  throw new MaxBufferError();
};
var addNewChunk = (convertedChunk, state, addChunk, newLength) => {
  state.contents = addChunk(convertedChunk, state, newLength);
  state.length = newLength;
};
var isAsyncIterable = (stream) =>
  typeof stream === "object" && stream !== null && typeof stream[Symbol.asyncIterator] === "function";
var getChunkType = (chunk) => {
  let typeOfChunk = typeof chunk;
  if (typeOfChunk === "string") return "string";
  if (typeOfChunk !== "object" || chunk === null) return "others";
  if (globalThis.Buffer?.isBuffer(chunk)) return "buffer";
  let prototypeName = objectToString.call(chunk);
  if (prototypeName === "[object ArrayBuffer]") return "arrayBuffer";
  if (prototypeName === "[object DataView]") return "dataView";
  if (
    Number.isInteger(chunk.byteLength) &&
    Number.isInteger(chunk.byteOffset) &&
    objectToString.call(chunk.buffer) === "[object ArrayBuffer]"
  )
    return "typedArray";
  return "others";
};
var { toString: objectToString } = Object.prototype;
//@ chunk-t889g22j.js:22729-22817 esm-fingerprint
class MaxBufferError extends Error {
  name = "MaxBufferError";
  constructor() {
    super("maxBuffer exceeded");
  }
}
export { getStreamContents };

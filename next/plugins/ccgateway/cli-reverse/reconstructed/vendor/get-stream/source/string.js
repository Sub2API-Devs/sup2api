/**
 * get-stream/source/string.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: get-stream@8.0.1
 * pieces: chunk-m4p5zn6n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { getStreamContents } from "./contents.js";
import { identity, throwObjectStream, getLengthProp, getContentsProp } from "./utils.js";

//@ chunk-m4p5zn6n.js:24141-24181 esm-layout
async function getStreamContentsImpl(stream, options) {
  return getStreamContents(stream, stringMethods, options);
}
//@ chunk-m4p5zn6n.js:24181-24564 esm-fingerprint
var initString = () => ({
  contents: "",
  textDecoder: new TextDecoder(),
});
var useTextDecoder = (chunk, { textDecoder }) =>
  textDecoder.decode(chunk, {
    stream: true,
  });
var addStringChunk = (convertedChunk, { contents }) => contents + convertedChunk;
var truncateStringChunk = (convertedChunk, chunkSize) => convertedChunk.slice(0, chunkSize);
var getFinalStringChunk = ({ textDecoder }) => {
  let finalChunk = textDecoder.decode();
  return finalChunk === "" ? undefined : finalChunk;
};
var stringMethods = {
  init: initString,
  convertChunk: {
    string: identity,
    buffer: useTextDecoder,
    arrayBuffer: useTextDecoder,
    dataView: useTextDecoder,
    typedArray: useTextDecoder,
    others: throwObjectStream,
  },
  getSize: getLengthProp,
  truncateChunk: truncateStringChunk,
  addChunk: addStringChunk,
  getFinalChunk: getFinalStringChunk,
  finalize: getContentsProp,
};
export { getStreamContentsImpl };

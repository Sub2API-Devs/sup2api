/**
 * get-stream/source/string.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: get-stream@8.0.1
 * pieces: chunk-t889g22j.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getStreamContents } from "./contents.js";
import { identity, throwObjectStream, getLengthProp, getContentsProp } from "./utils.js";

//@ chunk-t889g22j.js:24140-24180 esm-layout
async function getStreamContentsImpl(stream, options) {
  return getStreamContents(stream, stringMethods, options);
}
//@ chunk-t889g22j.js:24180-24563 esm-fingerprint
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

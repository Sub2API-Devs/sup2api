/**
 * get-stream/source/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: get-stream@8.0.1
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-layout 1
 */
//@ chunk-m4p5zn6n.js:22818-22966 esm-layout
var ke = (value) => value;
var Fe = () => {
  return;
};
var getContentsProp = ({ contents }) => contents;
var throwObjectStream = (chunk) => {
  throw Error(`Streams in object mode are not supported: ${String(chunk)}`);
};
var getLengthProp = (convertedChunk) => convertedChunk.length;
export { throwObjectStream, getLengthProp, Fe, ke, getContentsProp };

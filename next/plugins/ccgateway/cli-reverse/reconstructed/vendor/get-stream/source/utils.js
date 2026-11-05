/**
 * get-stream/source/utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: get-stream@8.0.1
 * pieces: chunk-t889g22j.js (1)
 * attribution: esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-t889g22j.js:22817-22965 esm-layout
var identity = (value) => value;
var noop = () => {
  return;
};
var getContentsProp = ({ contents }) => contents;
var throwObjectStream = (chunk) => {
  throw Error(`Streams in object mode are not supported: ${String(chunk)}`);
};
var getLengthProp = (convertedChunk) => convertedChunk.length;
export { throwObjectStream, getLengthProp, noop, identity, getContentsProp };

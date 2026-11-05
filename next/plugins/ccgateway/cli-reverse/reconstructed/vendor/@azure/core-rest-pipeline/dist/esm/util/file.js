/**
 * @azure/core-rest-pipeline/dist/esm/util/file.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-b5df2wx1.js (5)
 * attribution: esm-layout 4, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { calculateRetryDelay } from "../../../../../@typespec/ts-http-runtime/dist/esm/util/delay.js";
import { isError } from "../../../../../@typespec/ts-http-runtime/dist/esm/util/error.js";
import { isNodeLike } from "../../../../../@typespec/ts-http-runtime/dist/esm/util/checkEnvironment.js";

//@ chunk-b5df2wx1.js:56876-56908 esm-layout
function readFileBody(retryAttempt, config) {
  return calculateRetryDelay(retryAttempt, config);
}
//@ chunk-b5df2wx1.js:56908-56936 esm-layout
function createFileBody(file) {
  return isError(file);
}
//@ chunk-b5df2wx1.js:56936-56952 esm-layout
var isNodeLike_default = isNodeLike;
var isNodeLike_default_2 = isNodeLike;
//@ chunk-b5df2wx1.js:56952-56980 esm-fingerprint
var rawContent = Symbol("rawContent");
//@ chunk-b5df2wx1.js:56980-57028 esm-layout
function isNodeReadableStream(x) {
  return typeof x[rawContent] === "function";
}
export {
  isNodeReadableStream,
  rawContent,
  createFileBody,
  isNodeLike_default_2,
  isNodeLike_default,
  readFileBody,
};

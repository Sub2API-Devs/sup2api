/**
 * @typespec/ts-http-runtime/dist/esm/policies/multipartPolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-b5df2wx1.js (8)
 * attribution: esm-fingerprint 6, esm-layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getRequestUuid } from "../pipelineRequest.js";
import { hasStreamMethod, stringToUint8Array, concat } from "../util/concat.js";

//@ chunk-b5df2wx1.js:50855-50906 esm-fingerprint
function generateBoundary() {
  return `----AzSDKFormBoundary${getRequestUuid()}`;
}
//@ chunk-b5df2wx1.js:50906-50975 esm-layout
function encodeHeaders(headers) {
  let result = "";
  for (let [key, value] of headers)
    result += `${key}: ${value}\r
`;
  return result;
}
//@ chunk-b5df2wx1.js:50975-51096 esm-fingerprint
function getLength(source) {
  if (source instanceof Uint8Array) return source.byteLength;
  else if (hasStreamMethod(source)) return source.size === -1 ? undefined : source.size;
  else return;
}
//@ chunk-b5df2wx1.js:51096-51187 esm-layout
function getTotalLength(sources) {
  let total = 0;
  for (let source of sources) {
    let partLength = getLength(source);
    if (partLength === undefined) return;
    else total += partLength;
  }
  return total;
}
//@ chunk-b5df2wx1.js:51187-51444 esm-fingerprint
async function buildRequestBody(request, parts, boundary) {
  let sources = [
    stringToUint8Array(`--${boundary}`, "utf-8"),
    ...parts.flatMap((part) => [
      stringToUint8Array(
        `\r
`,
        "utf-8",
      ),
      stringToUint8Array(encodeHeaders(part.headers), "utf-8"),
      stringToUint8Array(
        `\r
`,
        "utf-8",
      ),
      part.body,
      stringToUint8Array(
        `\r
--${boundary}`,
        "utf-8",
      ),
    ]),
    stringToUint8Array(
      `--\r
\r
`,
      "utf-8",
    ),
  ];
  let contentLength = getTotalLength(sources);
  if (contentLength) request.headers.set("Content-Length", contentLength);
  request.body = await concat(sources);
}
//@ chunk-b5df2wx1.js:51444-51563 esm-fingerprint
var multipartPolicyName = "multipartPolicy";
var maxBoundaryLength = 70;
var validBoundaryCharacters = new Set(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'()+,-./:=?",
);
//@ chunk-b5df2wx1.js:51563-51782 esm-fingerprint
function assertValidBoundary(boundary) {
  if (boundary.length > maxBoundaryLength)
    throw Error(`Multipart boundary "${boundary}" exceeds maximum length of 70 characters`);
  if (Array.from(boundary).some((x) => !validBoundaryCharacters.has(x)))
    throw Error(`Multipart boundary "${boundary}" contains invalid characters`);
}
//@ chunk-b5df2wx1.js:51782-52525 esm-fingerprint
function multipartPolicy_2() {
  return {
    name: multipartPolicyName,
    async sendRequest(request, next) {
      var _a;
      if (!request.multipartBody) return next(request);
      if (request.body) throw Error("multipartBody and regular body cannot be set at the same time");
      let boundary = request.multipartBody.boundary;
      let contentTypeHeader =
        (_a = request.headers.get("Content-Type")) !== null && _a !== undefined ? _a : "multipart/mixed";
      let parsedHeader = contentTypeHeader.match(/^(multipart\/[^ ;]+)(?:; *boundary=(.+))?$/);
      if (!parsedHeader)
        throw Error(
          `Got multipart request body, but content-type header was not multipart: ${contentTypeHeader}`,
        );
      let [, contentType, parsedBoundary] = parsedHeader;
      if (parsedBoundary && boundary && parsedBoundary !== boundary)
        throw Error(
          `Multipart boundary was specified as ${parsedBoundary} in the header, but got ${boundary} in the request body`,
        );
      if (!(boundary !== null && boundary !== undefined)) boundary = parsedBoundary;
      if (boundary) assertValidBoundary(boundary);
      else boundary = generateBoundary();
      request.headers.set("Content-Type", `${contentType}; boundary=${boundary}`);
      await buildRequestBody(request, request.multipartBody.parts, boundary);
      request.multipartBody = undefined;
      return next(request);
    },
  };
}
export { multipartPolicyName, multipartPolicy_2 };

/**
 * @smithy/util-stream/dist-cjs/splitStream.browser.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-1fkvp0h1.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-1fkvp0h1.js:10211-10385 cjs-fingerprint
var require_splitStream_browser = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.splitStream = splitStream;
  async function splitStream(stream) {
    if (typeof stream.stream === "function") stream = stream.stream();
    return stream.tee();
  }
});
export { require_splitStream_browser };

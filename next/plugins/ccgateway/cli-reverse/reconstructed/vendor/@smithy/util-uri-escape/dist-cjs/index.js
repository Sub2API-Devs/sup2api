/**
 * @smithy/util-uri-escape/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/util-uri-escape@2.2.0..3.0.0
 * pieces: chunk-355mdh7x.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-355mdh7x.js:4962-5176 cjs-fingerprint
var require_util_uri_escape = __commonJS(function (cjsExports) {
  var escapeUri = (uri) => encodeURIComponent(uri).replace(/[!'()*]/g, hexEncode);
  var hexEncode = (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`;
  var escapeUriPath = (uri) => uri.split("/").map(escapeUri).join("/");
  cjsExports.escapeUri = escapeUri;
  cjsExports.escapeUriPath = escapeUriPath;
});
export { require_util_uri_escape };

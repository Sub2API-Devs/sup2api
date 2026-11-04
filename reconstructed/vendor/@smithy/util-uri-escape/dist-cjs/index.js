/**
 * @smithy/util-uri-escape/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-uri-escape@2.2.0..3.0.0
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-hq88884p.js:4952-5166 cjs-fingerprint
var require_util_uri_escape = __commonJS(function (cjsExports) {
  var escapeUri = (uri) => encodeURIComponent(uri).replace(/[!'()*]/g, hexEncode);
  var hexEncode = (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`;
  var escapeUriPath = (uri) => uri.split("/").map(escapeUri).join("/");
  cjsExports.escapeUri = escapeUri;
  cjsExports.escapeUriPath = escapeUriPath;
});
export { require_util_uri_escape };

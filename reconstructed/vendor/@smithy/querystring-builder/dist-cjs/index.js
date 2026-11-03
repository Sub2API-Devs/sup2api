/**
 * @smithy/querystring-builder/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/querystring-builder@2.2.0
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_util_uri_escape } from "../../util-uri-escape/dist-cjs/index.js";

//@ chunk-hq88884p.js:5166-5498 cjs-fingerprint
var require_querystring_builder = x(function (cjsExports) {
  var import_util_uri_escape = require_util_uri_escape();
  function buildQueryString(query) {
    let parts = [];
    for (let key of Object.keys(query).sort()) {
      let value = query[key];
      key = import_util_uri_escape.escapeUri(key);
      if (Array.isArray(value))
        for (let i = 0, iLen = value.length; i < iLen; i++)
          parts.push(`${key}=${import_util_uri_escape.escapeUri(value[i])}`);
      else {
        let qsEntry = key;
        if (value || typeof value === "string") qsEntry += `=${import_util_uri_escape.escapeUri(value)}`;
        parts.push(qsEntry);
      }
    }
    return parts.join("&");
  }
  cjsExports.buildQueryString = buildQueryString;
});
export { require_querystring_builder };

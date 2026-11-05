/**
 * @smithy/querystring-builder/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/querystring-builder@2.2.0
 * pieces: chunk-355mdh7x.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util_uri_escape } from "../../util-uri-escape/dist-cjs/index.js";

//@ chunk-355mdh7x.js:5176-5508 cjs-fingerprint
var require_querystring_builder = __commonJS(function (cjsExports) {
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

/**
 * @smithy/querystring-parser/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/querystring-parser@2.2.0
 * pieces: chunk-wyz669fp.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-wyz669fp.js:226-515 cjs-fingerprint
var require_querystring_parser = __commonJS(function (cjsExports) {
  function parseQueryString(querystring) {
    let query = {};
    querystring = querystring.replace(/^\?/, "");
    if (querystring)
      for (let pair of querystring.split("&")) {
        let [key, value = null] = pair.split("=");
        key = decodeURIComponent(key);
        if (value) value = decodeURIComponent(value);
        if (!(key in query)) query[key] = value;
        else if (Array.isArray(query[key])) query[key].push(value);
        else query[key] = [query[key], value];
      }
    return query;
  }
  cjsExports.parseQueryString = parseQueryString;
});
export { require_querystring_parser };

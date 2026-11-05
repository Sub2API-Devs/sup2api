/**
 * google-auth-library/build/src/shared.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_package_2 } from "../../package.json.js";

//@ chunk-e8d3a8an.js:64137-64376 cjs-fingerprint
var require_shared_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.USER_AGENT = cjsExports.PRODUCT_NAME = cjsExports.pkg = undefined;
  var pkg = require_package_2();
  cjsExports.pkg = pkg;
  var PRODUCT_NAME = "google-api-nodejs-client";
  cjsExports.PRODUCT_NAME = PRODUCT_NAME;
  var USER_AGENT = `${PRODUCT_NAME}/${pkg.version}`;
  cjsExports.USER_AGENT = USER_AGENT;
});
export { require_shared_2 };

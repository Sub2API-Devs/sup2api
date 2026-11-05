/**
 * @smithy/shared-ini-file-loader/dist-cjs/getSSOTokenFromFile.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/shared-ini-file-loader@4.4.0..4.4.3
 * pieces: chunk-g8stk5cd.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_getSSOTokenFilepath } from "./getSSOTokenFilepath.js";

//@ chunk-g8stk5cd.js:951-1293 cjs-fingerprint
var require_getSSOTokenFromFile = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getSSOTokenFromFile = cjsExports.tokenIntercept = undefined;
  var promises_1 = importMetaRequire("fs/promises");
  var getSSOTokenFilepath_1 = require_getSSOTokenFilepath();
  cjsExports.tokenIntercept = {};
  var getSSOTokenFromFile = async (id) => {
    if (cjsExports.tokenIntercept[id]) return cjsExports.tokenIntercept[id];
    let ssoTokenFilepath = getSSOTokenFilepath_1.getSSOTokenFilepath(id);
    let ssoTokenText = await promises_1.readFile(ssoTokenFilepath, "utf8");
    return JSON.parse(ssoTokenText);
  };
  cjsExports.getSSOTokenFromFile = getSSOTokenFromFile;
});
export { require_getSSOTokenFromFile };

/**
 * @smithy/shared-ini-file-loader/dist-cjs/getHomeDir.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/shared-ini-file-loader@4.4.0..4.4.3
 * pieces: chunk-g8stk5cd.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";

//@ chunk-g8stk5cd.js:266-666 cjs-fingerprint
var require_getHomeDir = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getHomeDir = undefined;
  var os_1 = importMetaRequire("os");
  var path_1 = importMetaRequire("path");
  var homeDirCache = {};
  var getHomeDirCacheKey = () => {
    if (process && process.geteuid) return `${process.geteuid()}`;
    return "DEFAULT";
  };
  var getHomeDir = () => {
    let { HOME, USERPROFILE, HOMEPATH, HOMEDRIVE = `C:${path_1.sep}` } = process.env;
    if (HOME) return HOME;
    if (USERPROFILE) return USERPROFILE;
    if (HOMEPATH) return `${HOMEDRIVE}${HOMEPATH}`;
    let homeDirCacheKey = getHomeDirCacheKey();
    if (!homeDirCache[homeDirCacheKey]) homeDirCache[homeDirCacheKey] = os_1.homedir();
    return homeDirCache[homeDirCacheKey];
  };
  cjsExports.getHomeDir = getHomeDir;
});
export { require_getHomeDir };

/**
 * openid-client/lib/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_issuer } from "./issuer.js";
import { require_errors } from "./errors.js";
import { require_passport_strategy } from "./passport_strategy.js";
import { require_token_set } from "./token_set.js";
import { require_consts } from "./helpers/consts.js";
import { require_generators } from "./helpers/generators.js";
import { require_request } from "./helpers/request.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1hnjmk23.js:76399-76718 cjs-fingerprint
var require_openid_client; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1hnjmk23.js:76399", () => {
  require_openid_client = __commonJS(function (cjsExports, cjsModule) {
    var Issuer = require_issuer();
    var { OPError, RPError } = require_errors();
    var Strategy = require_passport_strategy();
    var TokenSet = require_token_set();
    var { CLOCK_TOLERANCE, HTTP_OPTIONS } = require_consts();
    var generators = require_generators();
    var { setDefaults } = require_request();
    cjsModule.exports = {
      Issuer,
      Strategy,
      TokenSet,
      errors: {
        OPError,
        RPError,
      },
      custom: {
        setHttpOptionsDefaults: setDefaults,
        http_options: HTTP_OPTIONS,
        clock_tolerance: CLOCK_TOLERANCE,
      },
      generators,
    };
  });
});
export { require_openid_client };

/**
 * openid-client/lib/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { lk } from "./issuer.js";
import { Ki } from "./errors.js";
import { pk } from "./passport_strategy.js";
import { dy } from "./token_set.js";
import { _f } from "./helpers/consts.js";
import { Su } from "./helpers/generators.js";
import { Ol } from "./helpers/request.js";

//@ chunk-1ny7cxrt.js:76030-76349 cjs-fingerprint
var mk = x(function (nwe, hk) {
  var jB = lk(),
    { OPError: OPError, RPError: RPError } = Ki(),
    NB = pk(),
    UB = dy(),
    { CLOCK_TOLERANCE: CLOCK_TOLERANCE, HTTP_OPTIONS: HTTP_OPTIONS } = _f(),
    BB = Su(),
    { setDefaults: setDefaults } = Ol();
  hk.exports = {
    Issuer: jB,
    Strategy: NB,
    TokenSet: UB,
    errors: { OPError: OPError, RPError: RPError },
    custom: {
      setHttpOptionsDefaults: setDefaults,
      http_options: HTTP_OPTIONS,
      clock_tolerance: CLOCK_TOLERANCE,
    },
    generators: BB,
  };
});

export { mk };

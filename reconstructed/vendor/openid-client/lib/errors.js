/**
 * openid-client/lib/errors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:4634-5438 cjs-fingerprint
var Ki = x(function (Eve, fO) {
  var { format: format } = importMetaRequire("util");
  class uO extends Error {
    constructor({ error_description: e, error: t, error_uri: n, session_state: o, state: r, scope: s }, a) {
      super(!e ? t : `${t} (${e})`);
      if (
        (Object.assign(
          this,
          { error: t },
          e && { error_description: e },
          n && { error_uri: n },
          r && { state: r },
          s && { scope: s },
          o && { session_state: o },
        ),
        a)
      )
        Object.defineProperty(this, "response", { value: a });
      ((this.name = this.constructor.name), Error.captureStackTrace(this, this.constructor));
    }
  }
  class dO extends Error {
    constructor(...e) {
      if (typeof e[0] === "string") super(format(...e));
      else {
        let { message: message, printf: printf, response: response, ...r } = e[0];
        if (printf) super(format(...printf));
        else super(message);
        if ((Object.assign(this, r), response)) Object.defineProperty(this, "response", { value: response });
      }
      ((this.name = this.constructor.name), Error.captureStackTrace(this, this.constructor));
    }
  }
  fO.exports = { OPError: uO, RPError: dO };
});

export { Ki };

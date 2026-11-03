/**
 * openid-client/lib/errors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:4634-5438 cjs-fingerprint
var require_errors = x(function (cjsExports, cjsModule) {
  var { format } = importMetaRequire("util");
  class OPError extends Error {
    constructor({ error_description, error, error_uri, session_state, state, scope }, response) {
      super(!error_description ? error : `${error} (${error_description})`);
      Object.assign(
        this,
        {
          error,
        },
        error_description && {
          error_description,
        },
        error_uri && {
          error_uri,
        },
        state && {
          state,
        },
        scope && {
          scope,
        },
        session_state && {
          session_state,
        },
      );
      if (response)
        Object.defineProperty(this, "response", {
          value: response,
        });
      this.name = this.constructor.name;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  class RPError extends Error {
    constructor(...args) {
      if (typeof args[0] === "string") super(format(...args));
      else {
        let { message, printf, response, ...rest } = args[0];
        if (printf) super(format(...printf));
        else super(message);
        Object.assign(this, rest);
        if (response)
          Object.defineProperty(this, "response", {
            value: response,
          });
      }
      this.name = this.constructor.name;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  cjsModule.exports = {
    OPError,
    RPError,
  };
});
export { require_errors };

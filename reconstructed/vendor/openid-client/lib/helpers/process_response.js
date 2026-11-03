/**
 * openid-client/lib/helpers/process_response.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_errors } from "../errors.js";
import { require_www_authenticate_parser } from "./www_authenticate_parser.js";

//@ chunk-1ny7cxrt.js:9227-10006 cjs-fingerprint
var require_process_response = x(function (cjsExports, cjsModule) {
  var { STATUS_CODES } = importMetaRequire("http");
  var { format } = importMetaRequire("util");
  var { OPError } = require_errors();
  var parseWwwAuthenticate = require_www_authenticate_parser();
  var throwAuthenticateErrors = (response) => {
    let params = parseWwwAuthenticate(response.headers["www-authenticate"]);
    if (params.error) throw new OPError(params, response);
  };
  var isStandardBodyError = (response) => {
    let result = false;
    try {
      let jsonbody;
      if (typeof response.body !== "object" || Buffer.isBuffer(response.body))
        jsonbody = JSON.parse(response.body);
      else jsonbody = response.body;
      result = typeof jsonbody.error === "string" && jsonbody.error.length;
      if (result)
        Object.defineProperty(response, "body", {
          value: jsonbody,
          configurable: true,
        });
    } catch (err) {}
    return result;
  };
  function processResponse(response, { statusCode = 200, body = true, bearer = false } = {}) {
    if (response.statusCode !== statusCode) {
      if (bearer) throwAuthenticateErrors(response);
      if (isStandardBodyError(response)) throw new OPError(response.body, response);
      throw new OPError(
        {
          error: format(
            "expected %i %s, got: %i %s",
            statusCode,
            STATUS_CODES[statusCode],
            response.statusCode,
            STATUS_CODES[response.statusCode],
          ),
        },
        response,
      );
    }
    if (body && !response.body)
      throw new OPError(
        {
          error: format(
            "expected %i %s with body but no body was returned",
            statusCode,
            STATUS_CODES[statusCode],
          ),
        },
        response,
      );
    return response.body;
  }
  cjsModule.exports = processResponse;
});
export { require_process_response };

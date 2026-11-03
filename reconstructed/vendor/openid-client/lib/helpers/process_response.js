/**
 * openid-client/lib/helpers/process_response.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { Ki } from "../errors.js";
import { cy } from "./www_authenticate_parser.js";

//@ chunk-1ny7cxrt.js:9227-10006 cjs-fingerprint
var pf = x(function (xve, DO) {
  var { STATUS_CODES: STATUS_CODES } = importMetaRequire("http"),
    { format: format } = importMetaRequire("util"),
    { OPError: OPError } = Ki(),
    fF = cy(),
    pF = (e) => {
      let t = fF(e.headers["www-authenticate"]);
      if (t.error) throw new OPError(t, e);
    },
    hF = (e) => {
      let t = !1;
      try {
        let n;
        if (typeof e.body !== "object" || Buffer.isBuffer(e.body)) n = JSON.parse(e.body);
        else n = e.body;
        if (((t = typeof n.error === "string" && n.error.length), t))
          Object.defineProperty(e, "body", { value: n, configurable: !0 });
      } catch (error) {}
      return t;
    };
  function mF(e, { statusCode: t = 200, body: n = !0, bearer: o = !1 } = {}) {
    if (e.statusCode !== t) {
      if (o) pF(e);
      if (hF(e)) throw new OPError(e.body, e);
      throw new OPError(
        {
          error: format(
            "expected %i %s, got: %i %s",
            t,
            STATUS_CODES[t],
            e.statusCode,
            STATUS_CODES[e.statusCode],
          ),
        },
        e,
      );
    }
    if (n && !e.body)
      throw new OPError(
        { error: format("expected %i %s with body but no body was returned", t, STATUS_CODES[t]) },
        e,
      );
    return e.body;
  }
  DO.exports = mF;
});

export { pf };

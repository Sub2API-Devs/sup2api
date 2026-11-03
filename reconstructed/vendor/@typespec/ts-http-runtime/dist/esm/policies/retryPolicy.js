/**
 * @typespec/ts-http-runtime/dist/esm/policies/retryPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { Uo } from "../../../../../@azure/logger/dist/esm/index.js";
import { AbortError_2 } from "../restError.js";
import { yl } from "../util/helpers.js";

//@ chunk-mrx6y2r5.js:45267-45276 esm-layout
var Vn = 3;
//@ chunk-mrx6y2r5.js:45276-45334 esm-fingerprint
var Bm = Uo("ts-http-runtime retryPolicy"),
  RETRYPOLICY = "retryPolicy";
//@ chunk-mrx6y2r5.js:45334-46988 esm-fingerprint
function jn(e, t = { maxRetries: Vn }) {
  let r = t.logger || Bm;
  return {
    name: RETRYPOLICY,
    async sendRequest(n, o) {
      var i, s;
      let a,
        c,
        l = -1;
      e: while (!0) {
        ((l += 1), (a = void 0), (c = void 0));
        try {
          (r.info(`Retry ${l}: Attempting to send request`, n.requestId),
            (a = await o(n)),
            r.info(`Retry ${l}: Received a response from request`, n.requestId));
        } catch (error) {
          if (
            (r.error(`Retry ${l}: Received an error from request`, n.requestId),
            (c = error),
            !error || c.name !== "RestError")
          )
            throw error;
          a = c.response;
        }
        if ((i = n.abortSignal) === null || i === void 0 ? void 0 : i.aborted)
          throw (r.error(`Retry ${l}: Request aborted.`), new AbortError_2());
        if (l >= ((s = t.maxRetries) !== null && s !== void 0 ? s : Vn))
          if (
            (r.info(
              `Retry ${l}: Maximum retries reached. Returning the last received response, or throwing the last received error.`,
            ),
            c)
          )
            throw c;
          else if (a) return a;
          else throw Error("Maximum retries reached with no response or error to throw");
        r.info(`Retry ${l}: Processing ${e.length} retry strategies.`);
        t: for (let d of e) {
          let u = d.logger || r;
          u.info(`Retry ${l}: Processing retry strategy ${d.name}.`);
          let retry = d.retry({ retryCount: l, response: a, responseError: c });
          if (retry.skipStrategy) {
            u.info(`Retry ${l}: Skipped.`);
            continue t;
          }
          let { errorToThrow: errorToThrow, retryAfterInMs: retryAfterInMs, redirectTo: redirectTo } = retry;
          if (errorToThrow)
            throw (u.error(`Retry ${l}: Retry strategy ${d.name} throws error:`, errorToThrow), errorToThrow);
          if (retryAfterInMs || retryAfterInMs === 0) {
            (u.info(`Retry ${l}: Retry strategy ${d.name} retries after ${retryAfterInMs}`),
              await yl(retryAfterInMs, void 0, { abortSignal: n.abortSignal }));
            continue e;
          }
          if (redirectTo) {
            (u.info(`Retry ${l}: Retry strategy ${d.name} redirects to ${redirectTo}`), (n.url = redirectTo));
            continue e;
          }
        }
        if (c)
          throw (r.info("None of the retry strategies could work with the received error. Throwing it."), c);
        if (a)
          return (
            r.info("None of the retry strategies could work with the received response. Returning it."),
            a
          );
      }
    },
  };
}

export { jn, Vn };

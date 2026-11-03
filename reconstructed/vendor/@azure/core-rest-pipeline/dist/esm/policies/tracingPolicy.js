/**
 * @azure/core-rest-pipeline/dist/esm/policies/tracingPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (8)
 * attribution: esm-layout 2, esm-fingerprint 6
 */
import { RestError, qs } from "../../../../../@typespec/ts-http-runtime/dist/esm/restError.js";
import { Yo } from "../util/userAgent.js";
import { tt } from "../../../../../@typespec/ts-http-runtime/dist/esm/util/sanitizer.js";
import { Jn } from "../../../../core-tracing/dist/esm/tracingClient.js";
import { jo } from "../constants.js";
import { ut } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";
import { jr } from "../../../../core-util/dist/esm/error.js";
import { Wo } from "../util/file.js";

//@ chunk-mrx6y2r5.js:59724-59734 esm-layout
var Wr = RestError;
//@ chunk-mrx6y2r5.js:59734-59762 esm-layout
function Xn(e) {
  return qs(e);
}
//@ chunk-mrx6y2r5.js:59762-59785 esm-fingerprint
var TRACINGPOLICY = "tracingPolicy";
//@ chunk-mrx6y2r5.js:59785-60294 esm-fingerprint
function md(e = {}) {
  let t = Yo(e.userAgentPrefix),
    r = new tt({ additionalAllowedQueryParameters: e.additionalAllowedQueryParameters }),
    n = Op();
  return {
    name: TRACINGPOLICY,
    async sendRequest(o, i) {
      var s;
      if (!n) return i(o);
      let a = await t,
        c = {
          "http.url": r.sanitizeUrl(o.url),
          "http.method": o.method,
          "http.user_agent": a,
          requestId: o.requestId,
        };
      if (a) c["http.user_agent"] = a;
      let { span: span, tracingContext: tracingContext } =
        (s = Np(n, o, c)) !== null && s !== void 0 ? s : {};
      if (!span || !tracingContext) return i(o);
      try {
        let withContext = await n.withContext(tracingContext, i, o);
        return (Mp(span, withContext), withContext);
      } catch (error) {
        throw (xp(span, error), error);
      }
    },
  };
}
//@ chunk-mrx6y2r5.js:60294-60475 esm-fingerprint
function Op() {
  try {
    return Jn({ namespace: "", packageName: "@azure/core-rest-pipeline", packageVersion: jo });
  } catch (error) {
    ut.warning(`Error when creating the TracingClient: ${jr(error)}`);
    return;
  }
}
//@ chunk-mrx6y2r5.js:60475-60932 esm-fingerprint
function Np(e, t, r) {
  try {
    let { span: span, updatedOptions: updatedOptions } = e.startSpan(
      `HTTP ${t.method}`,
      { tracingOptions: t.tracingOptions },
      { spanKind: "client", spanAttributes: r },
    );
    if (!span.isRecording()) {
      span.end();
      return;
    }
    let requestHeaders = e.createRequestHeaders(updatedOptions.tracingOptions.tracingContext);
    for (let [s, a] of Object.entries(requestHeaders)) t.headers.set(s, a);
    return { span: span, tracingContext: updatedOptions.tracingOptions.tracingContext };
  } catch (error) {
    ut.warning(`Skipping creating a tracing span due to an error: ${jr(error)}`);
    return;
  }
}
//@ chunk-mrx6y2r5.js:60932-61166 esm-fingerprint
function xp(e, t) {
  try {
    if ((e.setStatus({ status: "error", error: Wo(t) ? t : void 0 }), Xn(t) && t.statusCode))
      e.setAttribute("http.status_code", t.statusCode);
    e.end();
  } catch (error) {
    ut.warning(`Skipping tracing span processing due to an error: ${jr(error)}`);
  }
}
//@ chunk-mrx6y2r5.js:61166-61450 esm-fingerprint
function Mp(e, t) {
  try {
    e.setAttribute("http.status_code", t.status);
    let r = t.headers.get("x-ms-request-id");
    if (r) e.setAttribute("serviceRequestId", r);
    if (t.status >= 400) e.setStatus({ status: "error" });
    e.end();
  } catch (error) {
    ut.warning(`Skipping tracing span processing due to an error: ${jr(error)}`);
  }
}

export { md, Xn, Wr };

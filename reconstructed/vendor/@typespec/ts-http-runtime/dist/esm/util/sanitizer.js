/**
 * @typespec/ts-http-runtime/dist/esm/util/sanitizer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { inspect } from "util";
import { zn } from "./error.js";

//@ chunk-mrx6y2r5.js:34990-35007 esm-layout
var custom = inspect.custom;
//@ chunk-mrx6y2r5.js:35007-35792 esm-fingerprint
var REDACTED = "REDACTED",
  wm = [
    "x-ms-client-request-id",
    "x-ms-return-client-request-id",
    "x-ms-useragent",
    "x-ms-correlation-request-id",
    "x-ms-request-id",
    "client-request-id",
    "ms-cv",
    "return-client-request-id",
    "traceparent",
    "Access-Control-Allow-Credentials",
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Methods",
    "Access-Control-Allow-Origin",
    "Access-Control-Expose-Headers",
    "Access-Control-Max-Age",
    "Access-Control-Request-Headers",
    "Access-Control-Request-Method",
    "Origin",
    "Accept",
    "Accept-Encoding",
    "Cache-Control",
    "Connection",
    "Content-Length",
    "Content-Type",
    "Date",
    "ETag",
    "Expires",
    "If-Match",
    "If-Modified-Since",
    "If-None-Match",
    "If-Unmodified-Since",
    "Last-Modified",
    "Pragma",
    "Request-Id",
    "Retry-After",
    "Server",
    "Transfer-Encoding",
    "User-Agent",
    "WWW-Authenticate",
  ],
  vm = ["api-version"];
//@ chunk-mrx6y2r5.js:35792-37067 esm-fingerprint
class tt {
  constructor({ additionalAllowedHeaderNames: e = [], additionalAllowedQueryParameters: t = [] } = {}) {
    ((e = wm.concat(e)),
      (t = vm.concat(t)),
      (this.allowedHeaderNames = new Set(e.map((r) => r.toLowerCase()))),
      (this.allowedQueryParameters = new Set(t.map((r) => r.toLowerCase()))));
  }
  sanitize(e) {
    let t = new Set();
    return JSON.stringify(
      e,
      (r, n) => {
        if (n instanceof Error)
          return Object.assign(Object.assign({}, n), { name: n.name, message: n.message });
        if (r === "headers") return this.sanitizeHeaders(n);
        else if (r === "url") return this.sanitizeUrl(n);
        else if (r === "query") return this.sanitizeQuery(n);
        else if (r === "body") return;
        else if (r === "response") return;
        else if (r === "operationSpec") return;
        else if (Array.isArray(n) || zn(n)) {
          if (t.has(n)) return "[Circular]";
          t.add(n);
        }
        return n;
      },
      2,
    );
  }
  sanitizeUrl(e) {
    if (typeof e !== "string" || e === null || e === "") return e;
    let t = new URL(e);
    if (!t.search) return e;
    for (let [r] of t.searchParams)
      if (!this.allowedQueryParameters.has(r.toLowerCase())) t.searchParams.set(r, REDACTED);
    return t.toString();
  }
  sanitizeHeaders(e) {
    let t = {};
    for (let r of Object.keys(e))
      if (this.allowedHeaderNames.has(r.toLowerCase())) t[r] = e[r];
      else t[r] = REDACTED;
    return t;
  }
  sanitizeQuery(e) {
    if (typeof e !== "object" || e === null) return e;
    let t = {};
    for (let r of Object.keys(e))
      if (this.allowedQueryParameters.has(r.toLowerCase())) t[r] = e[r];
      else t[r] = REDACTED;
    return t;
  }
}

export { tt, custom };

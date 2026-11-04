/**
 * @typespec/ts-http-runtime/dist/esm/util/sanitizer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { inspect } from "util";
import { isErrorLike } from "./error.js";

//@ chunk-mrx6y2r5.js:34990-35007 esm-layout
var custom = inspect.custom;
//@ chunk-mrx6y2r5.js:35007-35792 esm-fingerprint
var RedactedString = "REDACTED";
var defaultAllowedHeaderNames = [
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
];
var defaultAllowedQueryParameters = ["api-version"];
//@ chunk-mrx6y2r5.js:35792-37067 esm-fingerprint
class Sanitizer {
  constructor({
    additionalAllowedHeaderNames: allowedHeaderNames = [],
    additionalAllowedQueryParameters: allowedQueryParameters = [],
  } = {}) {
    allowedHeaderNames = defaultAllowedHeaderNames.concat(allowedHeaderNames);
    allowedQueryParameters = defaultAllowedQueryParameters.concat(allowedQueryParameters);
    this.allowedHeaderNames = new Set(allowedHeaderNames.map((n) => n.toLowerCase()));
    this.allowedQueryParameters = new Set(allowedQueryParameters.map((p) => p.toLowerCase()));
  }
  sanitize(obj) {
    let seen = new Set();
    return JSON.stringify(
      obj,
      (key, value) => {
        if (value instanceof Error)
          return Object.assign(Object.assign({}, value), {
            name: value.name,
            message: value.message,
          });
        if (key === "headers") return this.sanitizeHeaders(value);
        else if (key === "url") return this.sanitizeUrl(value);
        else if (key === "query") return this.sanitizeQuery(value);
        else if (key === "body") return;
        else if (key === "response") return;
        else if (key === "operationSpec") return;
        else if (Array.isArray(value) || isErrorLike(value)) {
          if (seen.has(value)) return "[Circular]";
          seen.add(value);
        }
        return value;
      },
      2,
    );
  }
  sanitizeUrl(value) {
    if (typeof value !== "string" || value === null || value === "") return value;
    let url = new URL(value);
    if (!url.search) return value;
    for (let [key] of url.searchParams)
      if (!this.allowedQueryParameters.has(key.toLowerCase())) url.searchParams.set(key, RedactedString);
    return url.toString();
  }
  sanitizeHeaders(obj) {
    let sanitized = {};
    for (let key of Object.keys(obj))
      if (this.allowedHeaderNames.has(key.toLowerCase())) sanitized[key] = obj[key];
      else sanitized[key] = RedactedString;
    return sanitized;
  }
  sanitizeQuery(value) {
    if (typeof value !== "object" || value === null) return value;
    let sanitized = {};
    for (let k of Object.keys(value))
      if (this.allowedQueryParameters.has(k.toLowerCase())) sanitized[k] = value[k];
      else sanitized[k] = RedactedString;
    return sanitized;
  }
}
export { Sanitizer, custom };

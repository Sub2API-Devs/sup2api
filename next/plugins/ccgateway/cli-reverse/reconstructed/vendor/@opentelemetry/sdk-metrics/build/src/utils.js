/**
 * @opentelemetry/sdk-metrics/build/src/utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-q87n5wsq.js:1114-2237 cjs-fingerprint
var require_utils = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.equalsCaseInsensitive =
    cjsExports.binarySearchUB =
    cjsExports.setEquals =
    cjsExports.callWithTimeout =
    cjsExports.TimeoutError =
    cjsExports.instrumentationScopeId =
    cjsExports.hashAttributes =
      undefined;
  function hashAttributes(attributes) {
    let keys = Object.keys(attributes);
    if (keys.length === 0) return "";
    keys = keys.sort();
    return JSON.stringify(keys.map((key) => [key, attributes[key]]));
  }
  cjsExports.hashAttributes = hashAttributes;
  function instrumentationScopeId(instrumentationScope) {
    return `${instrumentationScope.name}:${instrumentationScope.version ?? ""}:${instrumentationScope.schemaUrl ?? ""}`;
  }
  cjsExports.instrumentationScopeId = instrumentationScopeId;
  class TimeoutError extends Error {
    constructor(message) {
      super(message);
      Object.setPrototypeOf(this, TimeoutError.prototype);
    }
  }
  cjsExports.TimeoutError = TimeoutError;
  function callWithTimeout(promise, timeout) {
    let timeoutHandle;
    let timeoutPromise = new Promise(function (_resolve, reject) {
      timeoutHandle = setTimeout(function () {
        reject(new TimeoutError("Operation timed out."));
      }, timeout);
    });
    return Promise.race([promise, timeoutPromise]).then(
      (result) => {
        clearTimeout(timeoutHandle);
        return result;
      },
      (reason) => {
        clearTimeout(timeoutHandle);
        throw reason;
      },
    );
  }
  cjsExports.callWithTimeout = callWithTimeout;
  function setEquals(lhs, rhs) {
    if (lhs.size !== rhs.size) return false;
    for (let item of lhs) if (!rhs.has(item)) return false;
    return true;
  }
  cjsExports.setEquals = setEquals;
  function binarySearchUB(arr, value) {
    let lo = 0;
    let hi = arr.length - 1;
    let ret = arr.length;
    while (hi >= lo) {
      let mid = lo + Math.trunc((hi - lo) / 2);
      if (arr[mid] < value) lo = mid + 1;
      else {
        ret = mid;
        hi = mid - 1;
      }
    }
    return ret;
  }
  cjsExports.binarySearchUB = binarySearchUB;
  function equalsCaseInsensitive(lhs, rhs) {
    return lhs.toLowerCase() === rhs.toLowerCase();
  }
  cjsExports.equalsCaseInsensitive = equalsCaseInsensitive;
});
export { require_utils };

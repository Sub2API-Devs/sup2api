/**
 * @opentelemetry/core/build/src/common/timer-util.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:120113-120273 cjs-fingerprint
var require_timer_util = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.unrefTimer = undefined;
  function unrefTimer(timer) {
    if (typeof timer !== "number") timer.unref();
  }
  cjsExports.unrefTimer = unrefTimer;
});
export { require_timer_util };

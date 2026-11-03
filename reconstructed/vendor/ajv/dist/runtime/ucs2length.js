/**
 * ajv/dist/runtime/ucs2length.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-s82q9s4x.js:85041-85340 cjs-fingerprint
var Oo = x(function (qo) {
  Object.defineProperty(qo, "__esModule", { value: !0 });
  function ko(e) {
    let t = e.length,
      r = 0,
      s = 0,
      n;
    while (s < t)
      if ((r++, (n = e.charCodeAt(s++)), n >= 55296 && n <= 56319 && s < t)) {
        if (((n = e.charCodeAt(s)), (n & 64512) === 56320)) s++;
      }
    return r;
  }
  qo.default = ko;
  ko.code = 'require("ajv/dist/runtime/ucs2length").default';
});

export { Oo };

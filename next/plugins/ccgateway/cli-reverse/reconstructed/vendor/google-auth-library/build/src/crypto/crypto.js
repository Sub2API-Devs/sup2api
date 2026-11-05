/**
 * google-auth-library/build/src/crypto/crypto.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_crypto } from "./browser/crypto.js";
import { require_crypto_2 } from "./node/crypto.js";
import { require_shared } from "./shared.js";

//@ chunk-e8d3a8an.js:59826-60582 cjs-fingerprint
var require_crypto_3 = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o, k2, desc);
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        });
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, target) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(target, p))
          __createBinding(target, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createCrypto = createCrypto;
  cjsExports.hasBrowserCrypto = hasBrowserCrypto;
  var crypto_1 = require_crypto();
  var crypto_2 = require_crypto_2();
  __exportStar(require_shared(), cjsExports);
  function createCrypto() {
    if (hasBrowserCrypto()) return new crypto_1.BrowserCrypto();
    return new crypto_2.NodeCrypto();
  }
  function hasBrowserCrypto() {
    return (
      typeof window !== "undefined" &&
      typeof window.crypto !== "undefined" &&
      typeof window.crypto.subtle !== "undefined"
    );
  }
});
export { require_crypto_3 };

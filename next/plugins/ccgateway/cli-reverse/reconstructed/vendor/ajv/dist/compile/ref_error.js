/**
 * ajv/dist/compile/ref_error.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_resolve_2 } from "./resolve.js";

//@ chunk-xcs4sv9h.js:52170-52476 cjs-fingerprint
var require_ref_error_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var resolve_1 = require_resolve_2();
  class MissingRefError extends Error {
    constructor(resolver, baseId, ref, msg) {
      super(msg || `can't resolve reference ${ref} from id ${baseId}`);
      this.missingRef = resolve_1.resolveUrl(resolver, baseId, ref);
      this.missingSchema = resolve_1.normalizeId(resolve_1.getFullPath(resolver, this.missingRef));
    }
  }
  cjsExports.default = MissingRefError;
});
export { require_ref_error_2 };

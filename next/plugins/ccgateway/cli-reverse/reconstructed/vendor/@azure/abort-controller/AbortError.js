/**
 * @azure/abort-controller/AbortError.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/abort-controller/AbortError.js
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-b5df2wx1.js:55897-55968 placement (2.1.88 match: AbortError, 1)
class AbortError extends Error {
  constructor(message) {
    super(message);
    this.name = "AbortError";
  }
}
export { AbortError };

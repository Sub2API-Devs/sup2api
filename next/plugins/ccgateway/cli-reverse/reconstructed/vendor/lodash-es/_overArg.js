/**
 * lodash-es/_overArg.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-wwjb4dqs.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-wwjb4dqs.js:579-631 placement
function overArg(func, transform) {
  return function (arg) {
    return func(transform(arg));
  };
}
//@ chunk-wwjb4dqs.js:631-642 placement
var overArg_default = overArg;
export { overArg_default };

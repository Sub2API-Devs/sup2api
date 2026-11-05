/**
 * jose/dist/node/esm/lib/invalid_key_input.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (2), chunk-pd6th42n.js (4)
 * attribution: esm-fingerprint 5, esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-0f6azspv.js:4387-4811 esm-fingerprint
function message(msg, actual, ...types) {
  types = types.filter(Boolean);
  if (types.length > 2) {
    let last = types.pop();
    msg += `one of type ${types.join(", ")}, or ${last}.`;
  } else if (types.length === 2) msg += `one of type ${types[0]} or ${types[1]}.`;
  else msg += `of type ${types[0]}.`;
  if (actual == null) msg += ` Received ${actual}`;
  else if (typeof actual === "function" && actual.name) msg += ` Received function ${actual.name}`;
  else if (typeof actual === "object" && actual != null) {
    if (actual.constructor?.name) msg += ` Received an instance of ${actual.constructor.name}`;
  }
  return msg;
}
//@ chunk-0f6azspv.js:4811-4917 esm-fingerprint
var message_2 = (actual, ...types) => message("Key must be ", actual, ...types);
var withAlg = (alg, actual, ...types) => message(`Key for the ${alg} algorithm must be `, actual, ...types);
//@ chunk-pd6th42n.js:6891-6904 esm-layout
var noop = () => {};
//@ chunk-pd6th42n.js:6904-7322 esm-fingerprint
function message_3(msg, actual, ...types) {
  if (types.length > 2) {
    let last = types.pop();
    msg += `one of type ${types.join(", ")}, or ${last}.`;
  } else if (types.length === 2) msg += `one of type ${types[0]} or ${types[1]}.`;
  else msg += `of type ${types[0]}.`;
  if (actual == null) msg += ` Received ${actual}`;
  else if (typeof actual === "function" && actual.name) msg += ` Received function ${actual.name}`;
  else if (typeof actual === "object" && actual != null) {
    if (actual.constructor && actual.constructor.name)
      msg += ` Received an instance of ${actual.constructor.name}`;
  }
  return msg;
}
//@ chunk-pd6th42n.js:7322-7400 esm-fingerprint
function keyTypeError(alg, actual, ...expected) {
  return message_3(`Key for the ${alg} algorithm must be `, actual, ...expected);
}
//@ chunk-pd6th42n.js:7400-7442 esm-fingerprint
var keyMustBeTypeError = (actual, ...expected) => message_3("Key must be ", actual, ...expected);
export { message_2, noop, withAlg, keyMustBeTypeError, keyTypeError };

/**
 * lodash-es/_baseZipObject.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-323717f6.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-323717f6.js:1871-1982 placement
function baseZipObject(props, values, assignFunc) {
  var index = -1;
  var length = props.length;
  var valsLength = values.length;
  var result = {};
  while (++index < length) {
    var value = index < valsLength ? values[index] : undefined;
    assignFunc(result, props[index], value);
  }
  return result;
}
export { baseZipObject };

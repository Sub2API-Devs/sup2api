/**
 * lodash-es/_getRawTag.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-j8tzrgex.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { symbolExport } from "./_root.js";

//@ chunk-j8tzrgex.js:391-473 placement (2.1.88 match: substituteVariables, 0.576)
var objectProto = Object.prototype;
var { hasOwnProperty, toString: nativeObjectToString } = objectProto;
var symToStringTag = symbolExport ? symbolExport.toStringTag : undefined;
//@ chunk-j8tzrgex.js:473-606 placement
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag);
  var tag = value[symToStringTag];
  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (error) {}
  var result = nativeObjectToString.call(value);
  if (unmasked)
    if (isOwn) value[symToStringTag] = tag;
    else delete value[symToStringTag];
  return result;
}
//@ chunk-j8tzrgex.js:606-614 placement
var getRawTag_default = getRawTag;
export { getRawTag_default };

/**
 * lodash-es/_getRawTag.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-a16kyqj3.js (3)
 * attribution: placement 3
 */
import { symbolExport } from "./_root.js";

//@ chunk-a16kyqj3.js:391-473 placement = substituteVariables (0.576)
var objectProto = Object.prototype;
var { hasOwnProperty, toString: nativeObjectToString } = objectProto;
var symToStringTag = symbolExport ? symbolExport.toStringTag : undefined;
//@ chunk-a16kyqj3.js:473-606 placement
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
//@ chunk-a16kyqj3.js:606-614 placement
var getRawTag_default = getRawTag;
export { getRawTag_default };

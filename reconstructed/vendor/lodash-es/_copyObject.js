/**
 * lodash-es/_copyObject.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-dcmhvw5a.js (1)
 * attribution: placement 1
 */
import { assignValueRaw, assignValueIfDifferent } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-dcmhvw5a.js:3654-3830 placement
/**
 * lodash copyObject
 */
function copyObject(source, props, object, customizer) {
  var isNew = !object;
  if (!object) object = {};
  var index = -1;
  var length = props.length;
  while (++index < length) {
    var key = props[index];
    var newValue = customizer ? customizer(object[key], source[key], key, object, source) : undefined;
    if (newValue === undefined) newValue = source[key];
    if (isNew) assignValueRaw(object, key, newValue);
    else assignValueIfDifferent(object, key, newValue);
  }
  return object;
}
export { copyObject };

/**
 * lodash-es/_arrayEach.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-dcmhvw5a.js (2)
 * attribution: placement 2
 */

//@ chunk-dcmhvw5a.js:3550-3644 placement
function arrayEach(array, iteratee) {
  var index = -1;
  var length = array == null ? 0 : array.length;
  while (++index < length) if (iteratee(array[index], index, array) === false) break;
  return array;
}
//@ chunk-dcmhvw5a.js:3644-3654 placement
var arrayEach_default = arrayEach;
export { arrayEach_default };

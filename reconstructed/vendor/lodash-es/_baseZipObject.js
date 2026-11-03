/**
 * lodash-es/_baseZipObject.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-29pqxdaf.js (1)
 * attribution: placement 1
 */

//@ chunk-29pqxdaf.js:1524-1635 placement
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

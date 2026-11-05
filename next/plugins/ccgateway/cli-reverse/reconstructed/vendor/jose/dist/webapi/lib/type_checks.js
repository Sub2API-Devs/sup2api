/**
 * jose/dist/webapi/lib/type_checks.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */

//@ chunk-0f6azspv.js:11400-11442 esm-layout
var isObjectLike = (value) => typeof value === "object" && value !== null;
//@ chunk-0f6azspv.js:11442-11683 esm-fingerprint
function isObject(input) {
  if (!isObjectLike(input) || Object.prototype.toString.call(input) !== "[object Object]") return false;
  if (Object.getPrototypeOf(input) === null) return true;
  let proto = input;
  while (Object.getPrototypeOf(proto) !== null) proto = Object.getPrototypeOf(proto);
  return Object.getPrototypeOf(input) === proto;
}
//@ chunk-0f6azspv.js:11683-11903 esm-fingerprint
function isDisjoint(...headers) {
  let sources = headers.filter(Boolean);
  if (sources.length === 0 || sources.length === 1) return true;
  let acc;
  for (let header of sources) {
    let parameters = Object.keys(header);
    if (!acc || acc.size === 0) {
      acc = new Set(parameters);
      continue;
    }
    for (let parameter of parameters) {
      if (acc.has(parameter)) return false;
      acc.add(parameter);
    }
  }
  return true;
}
//@ chunk-0f6azspv.js:11903-12131 esm-fingerprint
var isJWK = (key) => isObject(key) && typeof key.kty === "string";
var isPrivateJWK = (key) =>
  key.kty !== "oct" && ((key.kty === "AKP" && typeof key.priv === "string") || typeof key.d === "string");
var isPublicJWK = (key) => key.kty !== "oct" && key.d === undefined && key.priv === undefined;
var isSecretJWK = (key) => key.kty === "oct" && typeof key.k === "string";
export { isObject, isJWK, isSecretJWK, isPrivateJWK, isPublicJWK, isDisjoint };

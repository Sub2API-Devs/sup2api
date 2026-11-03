/**
 * @typespec/ts-http-runtime/dist/esm/util/error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */

//@ chunk-mrx6y2r5.js:34734-34851 esm-layout
function zn(e) {
  return (
    typeof e === "object" && e !== null && !Array.isArray(e) && !(e instanceof RegExp) && !(e instanceof Date)
  );
}
//@ chunk-mrx6y2r5.js:34851-34958 esm-fingerprint
function tr(e) {
  if (zn(e)) {
    let hasName = typeof e.name === "string";
    let r = typeof e.message === "string";
    return hasName && r;
  }
  return false;
}
export { zn, tr };

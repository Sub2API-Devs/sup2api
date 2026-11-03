/**
 * parse5/dist/common/token.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */

//@ chunk-6ja29j2n.js:8620-8626 esm-layout
var f;
//@ chunk-6ja29j2n.js:8626-8925 esm-fingerprint
(function (e) {
  ((e[(e.CHARACTER = 0)] = "CHARACTER"),
    (e[(e.NULL_CHARACTER = 1)] = "NULL_CHARACTER"),
    (e[(e.WHITESPACE_CHARACTER = 2)] = "WHITESPACE_CHARACTER"),
    (e[(e.START_TAG = 3)] = "START_TAG"),
    (e[(e.END_TAG = 4)] = "END_TAG"),
    (e[(e.COMMENT = 5)] = "COMMENT"),
    (e[(e.DOCTYPE = 6)] = "DOCTYPE"),
    (e[(e.EOF = 7)] = "EOF"),
    (e[(e.HIBERNATION = 8)] = "HIBERNATION"));
})(f || (f = {}));
//@ chunk-6ja29j2n.js:8925-9036 esm-fingerprint
function z(e, t) {
  for (let a = e.attrs.length - 1; a >= 0; a--) if (e.attrs[a].name === t) return e.attrs[a].value;
  return null;
}

export { f, z };

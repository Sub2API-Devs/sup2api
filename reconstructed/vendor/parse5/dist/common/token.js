/**
 * parse5/dist/common/token.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */

//@ chunk-6ja29j2n.js:8620-8626 esm-layout
var TokenType;
//@ chunk-6ja29j2n.js:8626-8925 esm-fingerprint
(function (TokenType) {
  TokenType[(TokenType.CHARACTER = 0)] = "CHARACTER";
  TokenType[(TokenType.NULL_CHARACTER = 1)] = "NULL_CHARACTER";
  TokenType[(TokenType.WHITESPACE_CHARACTER = 2)] = "WHITESPACE_CHARACTER";
  TokenType[(TokenType.START_TAG = 3)] = "START_TAG";
  TokenType[(TokenType.END_TAG = 4)] = "END_TAG";
  TokenType[(TokenType.COMMENT = 5)] = "COMMENT";
  TokenType[(TokenType.DOCTYPE = 6)] = "DOCTYPE";
  TokenType[(TokenType.EOF = 7)] = "EOF";
  TokenType[(TokenType.HIBERNATION = 8)] = "HIBERNATION";
})(TokenType || (TokenType = {}));
//@ chunk-6ja29j2n.js:8925-9036 esm-fingerprint
function getTokenAttr(token, attrName) {
  for (let i = token.attrs.length - 1; i >= 0; i--)
    if (token.attrs[i].name === attrName) return token.attrs[i].value;
  return null;
}
export { TokenType, getTokenAttr };

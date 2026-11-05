/**
 * parse5/dist/common/token.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-p9ac6cnb.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-p9ac6cnb.js:8620-8626 esm-layout
var TokenType;
//@ chunk-p9ac6cnb.js:8626-8925 esm-fingerprint
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
//@ chunk-p9ac6cnb.js:8925-9036 esm-fingerprint
function getTokenAttr(token, attrName) {
  for (let i = token.attrs.length - 1; i >= 0; i--)
    if (token.attrs[i].name === attrName) return token.attrs[i].value;
  return null;
}
export { TokenType, getTokenAttr };

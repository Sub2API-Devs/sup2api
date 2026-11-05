/**
 * jsonc-parser/lib/esm/main.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jsonc-parser@3.2.1..3.3.1
 * pieces: chunk-aj4djjd6.js (9)
 * attribution: esm-layout 5, esm-fingerprint 4
 */
import { parseTree } from "./impl/parser.js";
import { modify, applyEdit } from "./impl/edit.js";

//@ chunk-aj4djjd6.js:15523-15530 esm-layout
var ScanError;
//@ chunk-aj4djjd6.js:15530-15875 esm-fingerprint
(function (ScanError) {
  ScanError[(ScanError.None = 0)] = "None";
  ScanError[(ScanError.UnexpectedEndOfComment = 1)] = "UnexpectedEndOfComment";
  ScanError[(ScanError.UnexpectedEndOfString = 2)] = "UnexpectedEndOfString";
  ScanError[(ScanError.UnexpectedEndOfNumber = 3)] = "UnexpectedEndOfNumber";
  ScanError[(ScanError.InvalidUnicode = 4)] = "InvalidUnicode";
  ScanError[(ScanError.InvalidEscapeCharacter = 5)] = "InvalidEscapeCharacter";
  ScanError[(ScanError.InvalidCharacter = 6)] = "InvalidCharacter";
})(ScanError || (ScanError = {}));
//@ chunk-aj4djjd6.js:15875-15882 esm-layout
var SyntaxKind;
//@ chunk-aj4djjd6.js:15882-16523 esm-fingerprint
(function (SyntaxKind) {
  SyntaxKind[(SyntaxKind.OpenBraceToken = 1)] = "OpenBraceToken";
  SyntaxKind[(SyntaxKind.CloseBraceToken = 2)] = "CloseBraceToken";
  SyntaxKind[(SyntaxKind.OpenBracketToken = 3)] = "OpenBracketToken";
  SyntaxKind[(SyntaxKind.CloseBracketToken = 4)] = "CloseBracketToken";
  SyntaxKind[(SyntaxKind.CommaToken = 5)] = "CommaToken";
  SyntaxKind[(SyntaxKind.ColonToken = 6)] = "ColonToken";
  SyntaxKind[(SyntaxKind.NullKeyword = 7)] = "NullKeyword";
  SyntaxKind[(SyntaxKind.TrueKeyword = 8)] = "TrueKeyword";
  SyntaxKind[(SyntaxKind.FalseKeyword = 9)] = "FalseKeyword";
  SyntaxKind[(SyntaxKind.StringLiteral = 10)] = "StringLiteral";
  SyntaxKind[(SyntaxKind.NumericLiteral = 11)] = "NumericLiteral";
  SyntaxKind[(SyntaxKind.LineCommentTrivia = 12)] = "LineCommentTrivia";
  SyntaxKind[(SyntaxKind.BlockCommentTrivia = 13)] = "BlockCommentTrivia";
  SyntaxKind[(SyntaxKind.LineBreakTrivia = 14)] = "LineBreakTrivia";
  SyntaxKind[(SyntaxKind.Trivia = 15)] = "Trivia";
  SyntaxKind[(SyntaxKind.Unknown = 16)] = "Unknown";
  SyntaxKind[(SyntaxKind.EOF = 17)] = "EOF";
})(SyntaxKind || (SyntaxKind = {}));
//@ chunk-aj4djjd6.js:16523-16533 esm-layout
var parseJsonc = parseTree;
//@ chunk-aj4djjd6.js:16533-16540 esm-layout
var ParseErrorCode;
//@ chunk-aj4djjd6.js:16540-17313 esm-fingerprint
(function (ParseErrorCode) {
  ParseErrorCode[(ParseErrorCode.InvalidSymbol = 1)] = "InvalidSymbol";
  ParseErrorCode[(ParseErrorCode.InvalidNumberFormat = 2)] = "InvalidNumberFormat";
  ParseErrorCode[(ParseErrorCode.PropertyNameExpected = 3)] = "PropertyNameExpected";
  ParseErrorCode[(ParseErrorCode.ValueExpected = 4)] = "ValueExpected";
  ParseErrorCode[(ParseErrorCode.ColonExpected = 5)] = "ColonExpected";
  ParseErrorCode[(ParseErrorCode.CommaExpected = 6)] = "CommaExpected";
  ParseErrorCode[(ParseErrorCode.CloseBraceExpected = 7)] = "CloseBraceExpected";
  ParseErrorCode[(ParseErrorCode.CloseBracketExpected = 8)] = "CloseBracketExpected";
  ParseErrorCode[(ParseErrorCode.EndOfFileExpected = 9)] = "EndOfFileExpected";
  ParseErrorCode[(ParseErrorCode.InvalidCommentToken = 10)] = "InvalidCommentToken";
  ParseErrorCode[(ParseErrorCode.UnexpectedEndOfComment = 11)] = "UnexpectedEndOfComment";
  ParseErrorCode[(ParseErrorCode.UnexpectedEndOfString = 12)] = "UnexpectedEndOfString";
  ParseErrorCode[(ParseErrorCode.UnexpectedEndOfNumber = 13)] = "UnexpectedEndOfNumber";
  ParseErrorCode[(ParseErrorCode.InvalidUnicode = 14)] = "InvalidUnicode";
  ParseErrorCode[(ParseErrorCode.InvalidEscapeCharacter = 15)] = "InvalidEscapeCharacter";
  ParseErrorCode[(ParseErrorCode.InvalidCharacter = 16)] = "InvalidCharacter";
})(ParseErrorCode || (ParseErrorCode = {}));
//@ chunk-aj4djjd6.js:17313-17354 esm-layout
function modifyJsonc(text, path, value, options) {
  return modify(text, path, value, options);
}
//@ chunk-aj4djjd6.js:17354-17614 esm-fingerprint
function applyEdits(text, edits) {
  let sortedEdits = edits.slice(0).sort((a, b) => {
    let diff = a.offset - b.offset;
    if (diff === 0) return a.length - b.length;
    return diff;
  });
  let lastModifiedOffset = text.length;
  for (let editIndex = sortedEdits.length - 1; editIndex >= 0; editIndex--) {
    let e = sortedEdits[editIndex];
    if (e.offset + e.length <= lastModifiedOffset) text = applyEdit(text, e);
    else throw Error("Overlapping edit");
    lastModifiedOffset = e.offset;
  }
  return text;
}
export { parseJsonc, modifyJsonc, applyEdits };

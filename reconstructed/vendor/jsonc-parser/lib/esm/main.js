/**
 * jsonc-parser/lib/esm/main.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonc-parser@3.2.1..3.3.1
 * pieces: chunk-kndsyy4v.js (9)
 * attribution: esm-layout 5, esm-fingerprint 4
 */
import { C } from "./impl/parser.js";
import { ee, R } from "./impl/edit.js";

//@ chunk-kndsyy4v.js:15523-15530 esm-layout
var ne;
//@ chunk-kndsyy4v.js:15530-15875 esm-fingerprint
(function (e) {
  ((e[(e.None = 0)] = "None"),
    (e[(e.UnexpectedEndOfComment = 1)] = "UnexpectedEndOfComment"),
    (e[(e.UnexpectedEndOfString = 2)] = "UnexpectedEndOfString"),
    (e[(e.UnexpectedEndOfNumber = 3)] = "UnexpectedEndOfNumber"),
    (e[(e.InvalidUnicode = 4)] = "InvalidUnicode"),
    (e[(e.InvalidEscapeCharacter = 5)] = "InvalidEscapeCharacter"),
    (e[(e.InvalidCharacter = 6)] = "InvalidCharacter"));
})(ne || (ne = {}));
//@ chunk-kndsyy4v.js:15875-15882 esm-layout
var te;
//@ chunk-kndsyy4v.js:15882-16523 esm-fingerprint
(function (e) {
  ((e[(e.OpenBraceToken = 1)] = "OpenBraceToken"),
    (e[(e.CloseBraceToken = 2)] = "CloseBraceToken"),
    (e[(e.OpenBracketToken = 3)] = "OpenBracketToken"),
    (e[(e.CloseBracketToken = 4)] = "CloseBracketToken"),
    (e[(e.CommaToken = 5)] = "CommaToken"),
    (e[(e.ColonToken = 6)] = "ColonToken"),
    (e[(e.NullKeyword = 7)] = "NullKeyword"),
    (e[(e.TrueKeyword = 8)] = "TrueKeyword"),
    (e[(e.FalseKeyword = 9)] = "FalseKeyword"),
    (e[(e.StringLiteral = 10)] = "StringLiteral"),
    (e[(e.NumericLiteral = 11)] = "NumericLiteral"),
    (e[(e.LineCommentTrivia = 12)] = "LineCommentTrivia"),
    (e[(e.BlockCommentTrivia = 13)] = "BlockCommentTrivia"),
    (e[(e.LineBreakTrivia = 14)] = "LineBreakTrivia"),
    (e[(e.Trivia = 15)] = "Trivia"),
    (e[(e.Unknown = 16)] = "Unknown"),
    (e[(e.EOF = 17)] = "EOF"));
})(te || (te = {}));
//@ chunk-kndsyy4v.js:16523-16533 esm-layout
var b8e = C;
//@ chunk-kndsyy4v.js:16533-16540 esm-layout
var re;
//@ chunk-kndsyy4v.js:16540-17313 esm-fingerprint
(function (e) {
  ((e[(e.InvalidSymbol = 1)] = "InvalidSymbol"),
    (e[(e.InvalidNumberFormat = 2)] = "InvalidNumberFormat"),
    (e[(e.PropertyNameExpected = 3)] = "PropertyNameExpected"),
    (e[(e.ValueExpected = 4)] = "ValueExpected"),
    (e[(e.ColonExpected = 5)] = "ColonExpected"),
    (e[(e.CommaExpected = 6)] = "CommaExpected"),
    (e[(e.CloseBraceExpected = 7)] = "CloseBraceExpected"),
    (e[(e.CloseBracketExpected = 8)] = "CloseBracketExpected"),
    (e[(e.EndOfFileExpected = 9)] = "EndOfFileExpected"),
    (e[(e.InvalidCommentToken = 10)] = "InvalidCommentToken"),
    (e[(e.UnexpectedEndOfComment = 11)] = "UnexpectedEndOfComment"),
    (e[(e.UnexpectedEndOfString = 12)] = "UnexpectedEndOfString"),
    (e[(e.UnexpectedEndOfNumber = 13)] = "UnexpectedEndOfNumber"),
    (e[(e.InvalidUnicode = 14)] = "InvalidUnicode"),
    (e[(e.InvalidEscapeCharacter = 15)] = "InvalidEscapeCharacter"),
    (e[(e.InvalidCharacter = 16)] = "InvalidCharacter"));
})(re || (re = {}));
//@ chunk-kndsyy4v.js:17313-17354 esm-layout
function KOn(e, s, r, n) {
  return ee(e, s, r, n);
}
//@ chunk-kndsyy4v.js:17354-17614 esm-fingerprint
function Wbr(e, s) {
  let sorted = s.slice(0).sort((i, o) => {
      let c = i.offset - o.offset;
      if (c === 0) return i.length - o.length;
      return c;
    }),
    n = e.length;
  for (let i = sorted.length - 1; i >= 0; i--) {
    let o = sorted[i];
    if (o.offset + o.length <= n) e = R(e, o);
    else throw Error("Overlapping edit");
    n = o.offset;
  }
  return e;
}

export { b8e, KOn, Wbr };

/**
 * parse5/dist/tokenizer/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (13)
 * attribution: esm-layout 4, esm-fingerprint 9
 */
import { s, X, V, K, m, C } from "../common/unicode.js";
import { o } from "../../lib/common/error-codes.js";
import { de } from "./preprocessor.js";
import { J, D } from "../../../entities/lib/esm/decode.js";
import { uint16Array } from "../../../entities/lib/esm/generated/decode-data-xml.js";
import { f, z } from "../common/token.js";
import { u, x } from "../common/html.js";

//@ chunk-6ja29j2n.js:71013-71019 esm-layout
var r;
//@ chunk-6ja29j2n.js:71019-75235 esm-fingerprint
(function (e) {
  ((e[(e.DATA = 0)] = "DATA"),
    (e[(e.RCDATA = 1)] = "RCDATA"),
    (e[(e.RAWTEXT = 2)] = "RAWTEXT"),
    (e[(e.SCRIPT_DATA = 3)] = "SCRIPT_DATA"),
    (e[(e.PLAINTEXT = 4)] = "PLAINTEXT"),
    (e[(e.TAG_OPEN = 5)] = "TAG_OPEN"),
    (e[(e.END_TAG_OPEN = 6)] = "END_TAG_OPEN"),
    (e[(e.TAG_NAME = 7)] = "TAG_NAME"),
    (e[(e.RCDATA_LESS_THAN_SIGN = 8)] = "RCDATA_LESS_THAN_SIGN"),
    (e[(e.RCDATA_END_TAG_OPEN = 9)] = "RCDATA_END_TAG_OPEN"),
    (e[(e.RCDATA_END_TAG_NAME = 10)] = "RCDATA_END_TAG_NAME"),
    (e[(e.RAWTEXT_LESS_THAN_SIGN = 11)] = "RAWTEXT_LESS_THAN_SIGN"),
    (e[(e.RAWTEXT_END_TAG_OPEN = 12)] = "RAWTEXT_END_TAG_OPEN"),
    (e[(e.RAWTEXT_END_TAG_NAME = 13)] = "RAWTEXT_END_TAG_NAME"),
    (e[(e.SCRIPT_DATA_LESS_THAN_SIGN = 14)] = "SCRIPT_DATA_LESS_THAN_SIGN"),
    (e[(e.SCRIPT_DATA_END_TAG_OPEN = 15)] = "SCRIPT_DATA_END_TAG_OPEN"),
    (e[(e.SCRIPT_DATA_END_TAG_NAME = 16)] = "SCRIPT_DATA_END_TAG_NAME"),
    (e[(e.SCRIPT_DATA_ESCAPE_START = 17)] = "SCRIPT_DATA_ESCAPE_START"),
    (e[(e.SCRIPT_DATA_ESCAPE_START_DASH = 18)] = "SCRIPT_DATA_ESCAPE_START_DASH"),
    (e[(e.SCRIPT_DATA_ESCAPED = 19)] = "SCRIPT_DATA_ESCAPED"),
    (e[(e.SCRIPT_DATA_ESCAPED_DASH = 20)] = "SCRIPT_DATA_ESCAPED_DASH"),
    (e[(e.SCRIPT_DATA_ESCAPED_DASH_DASH = 21)] = "SCRIPT_DATA_ESCAPED_DASH_DASH"),
    (e[(e.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN = 22)] = "SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN"),
    (e[(e.SCRIPT_DATA_ESCAPED_END_TAG_OPEN = 23)] = "SCRIPT_DATA_ESCAPED_END_TAG_OPEN"),
    (e[(e.SCRIPT_DATA_ESCAPED_END_TAG_NAME = 24)] = "SCRIPT_DATA_ESCAPED_END_TAG_NAME"),
    (e[(e.SCRIPT_DATA_DOUBLE_ESCAPE_START = 25)] = "SCRIPT_DATA_DOUBLE_ESCAPE_START"),
    (e[(e.SCRIPT_DATA_DOUBLE_ESCAPED = 26)] = "SCRIPT_DATA_DOUBLE_ESCAPED"),
    (e[(e.SCRIPT_DATA_DOUBLE_ESCAPED_DASH = 27)] = "SCRIPT_DATA_DOUBLE_ESCAPED_DASH"),
    (e[(e.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH = 28)] = "SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH"),
    (e[(e.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN = 29)] = "SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN"),
    (e[(e.SCRIPT_DATA_DOUBLE_ESCAPE_END = 30)] = "SCRIPT_DATA_DOUBLE_ESCAPE_END"),
    (e[(e.BEFORE_ATTRIBUTE_NAME = 31)] = "BEFORE_ATTRIBUTE_NAME"),
    (e[(e.ATTRIBUTE_NAME = 32)] = "ATTRIBUTE_NAME"),
    (e[(e.AFTER_ATTRIBUTE_NAME = 33)] = "AFTER_ATTRIBUTE_NAME"),
    (e[(e.BEFORE_ATTRIBUTE_VALUE = 34)] = "BEFORE_ATTRIBUTE_VALUE"),
    (e[(e.ATTRIBUTE_VALUE_DOUBLE_QUOTED = 35)] = "ATTRIBUTE_VALUE_DOUBLE_QUOTED"),
    (e[(e.ATTRIBUTE_VALUE_SINGLE_QUOTED = 36)] = "ATTRIBUTE_VALUE_SINGLE_QUOTED"),
    (e[(e.ATTRIBUTE_VALUE_UNQUOTED = 37)] = "ATTRIBUTE_VALUE_UNQUOTED"),
    (e[(e.AFTER_ATTRIBUTE_VALUE_QUOTED = 38)] = "AFTER_ATTRIBUTE_VALUE_QUOTED"),
    (e[(e.SELF_CLOSING_START_TAG = 39)] = "SELF_CLOSING_START_TAG"),
    (e[(e.BOGUS_COMMENT = 40)] = "BOGUS_COMMENT"),
    (e[(e.MARKUP_DECLARATION_OPEN = 41)] = "MARKUP_DECLARATION_OPEN"),
    (e[(e.COMMENT_START = 42)] = "COMMENT_START"),
    (e[(e.COMMENT_START_DASH = 43)] = "COMMENT_START_DASH"),
    (e[(e.COMMENT = 44)] = "COMMENT"),
    (e[(e.COMMENT_LESS_THAN_SIGN = 45)] = "COMMENT_LESS_THAN_SIGN"),
    (e[(e.COMMENT_LESS_THAN_SIGN_BANG = 46)] = "COMMENT_LESS_THAN_SIGN_BANG"),
    (e[(e.COMMENT_LESS_THAN_SIGN_BANG_DASH = 47)] = "COMMENT_LESS_THAN_SIGN_BANG_DASH"),
    (e[(e.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH = 48)] = "COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH"),
    (e[(e.COMMENT_END_DASH = 49)] = "COMMENT_END_DASH"),
    (e[(e.COMMENT_END = 50)] = "COMMENT_END"),
    (e[(e.COMMENT_END_BANG = 51)] = "COMMENT_END_BANG"),
    (e[(e.DOCTYPE = 52)] = "DOCTYPE"),
    (e[(e.BEFORE_DOCTYPE_NAME = 53)] = "BEFORE_DOCTYPE_NAME"),
    (e[(e.DOCTYPE_NAME = 54)] = "DOCTYPE_NAME"),
    (e[(e.AFTER_DOCTYPE_NAME = 55)] = "AFTER_DOCTYPE_NAME"),
    (e[(e.AFTER_DOCTYPE_PUBLIC_KEYWORD = 56)] = "AFTER_DOCTYPE_PUBLIC_KEYWORD"),
    (e[(e.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER = 57)] = "BEFORE_DOCTYPE_PUBLIC_IDENTIFIER"),
    (e[(e.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED = 58)] = "DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED"),
    (e[(e.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED = 59)] = "DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED"),
    (e[(e.AFTER_DOCTYPE_PUBLIC_IDENTIFIER = 60)] = "AFTER_DOCTYPE_PUBLIC_IDENTIFIER"),
    (e[(e.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS = 61)] =
      "BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS"),
    (e[(e.AFTER_DOCTYPE_SYSTEM_KEYWORD = 62)] = "AFTER_DOCTYPE_SYSTEM_KEYWORD"),
    (e[(e.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER = 63)] = "BEFORE_DOCTYPE_SYSTEM_IDENTIFIER"),
    (e[(e.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED = 64)] = "DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED"),
    (e[(e.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED = 65)] = "DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED"),
    (e[(e.AFTER_DOCTYPE_SYSTEM_IDENTIFIER = 66)] = "AFTER_DOCTYPE_SYSTEM_IDENTIFIER"),
    (e[(e.BOGUS_DOCTYPE = 67)] = "BOGUS_DOCTYPE"),
    (e[(e.CDATA_SECTION = 68)] = "CDATA_SECTION"),
    (e[(e.CDATA_SECTION_BRACKET = 69)] = "CDATA_SECTION_BRACKET"),
    (e[(e.CDATA_SECTION_END = 70)] = "CDATA_SECTION_END"),
    (e[(e.CHARACTER_REFERENCE = 71)] = "CHARACTER_REFERENCE"),
    (e[(e.AMBIGUOUS_AMPERSAND = 72)] = "AMBIGUOUS_AMPERSAND"));
})(r || (r = {}));
//@ chunk-6ja29j2n.js:75235-75368 esm-fingerprint
var TokenizerMode = {
  DATA: r.DATA,
  RCDATA: r.RCDATA,
  RAWTEXT: r.RAWTEXT,
  SCRIPT_DATA: r.SCRIPT_DATA,
  PLAINTEXT: r.PLAINTEXT,
  CDATA_SECTION: r.CDATA_SECTION,
};
//@ chunk-6ja29j2n.js:75368-75417 esm-fingerprint
function Lt(e) {
  return e >= s.DIGIT_0 && e <= s.DIGIT_9;
}
//@ chunk-6ja29j2n.js:75417-75481 esm-fingerprint
function U(e) {
  return e >= s.LATIN_CAPITAL_A && e <= s.LATIN_CAPITAL_Z;
}
//@ chunk-6ja29j2n.js:75481-75542 esm-fingerprint
function Rt(e) {
  return e >= s.LATIN_SMALL_A && e <= s.LATIN_SMALL_Z;
}
//@ chunk-6ja29j2n.js:75542-75575 esm-layout
function M(e) {
  return Rt(e) || U(e);
}
//@ chunk-6ja29j2n.js:75575-75609 esm-layout
function Pe(e) {
  return M(e) || Lt(e);
}
//@ chunk-6ja29j2n.js:75609-75635 esm-layout
function Z(e) {
  return e + 32;
}
//@ chunk-6ja29j2n.js:75635-75721 esm-fingerprint
function xe(e) {
  return e === s.SPACE || e === s.LINE_FEED || e === s.TABULATION || e === s.FORM_FEED;
}
//@ chunk-6ja29j2n.js:75721-75789 esm-fingerprint
function Me(e) {
  return xe(e) || e === s.SOLIDUS || e === s.GREATER_THAN_SIGN;
}
//@ chunk-6ja29j2n.js:75789-76101 esm-fingerprint
function Dt(e) {
  if (e === s.NULL) return o.nullCharacterReference;
  else if (e > 1114111) return o.characterReferenceOutsideUnicodeRange;
  else if (X(e)) return o.surrogateCharacterReference;
  else if (V(e)) return o.noncharacterCharacterReference;
  else if (K(e) || e === s.CARRIAGE_RETURN) return o.controlCharacterReference;
  return null;
}
//@ chunk-6ja29j2n.js:76101-117020 esm-fingerprint
class Tokenizer {
  constructor(e, t) {
    ((this.options = e),
      (this.handler = t),
      (this.paused = !1),
      (this.inLoop = !1),
      (this.inForeignNode = !1),
      (this.lastStartTagName = ""),
      (this.active = !1),
      (this.state = r.DATA),
      (this.returnState = r.DATA),
      (this.entityStartPos = 0),
      (this.consumedAfterSnapshot = -1),
      (this.currentCharacterToken = null),
      (this.currentToken = null),
      (this.currentAttr = { name: "", value: "" }),
      (this.preprocessor = new de(t)),
      (this.currentLocation = this.getCurrentLocation(-1)),
      (this.entityDecoder = new J(
        uint16Array,
        (a, n) => {
          ((this.preprocessor.pos = this.entityStartPos + n - 1),
            this._flushCodePointConsumedAsCharacterReference(a));
        },
        t.onParseError
          ? {
              missingSemicolonAfterCharacterReference: () => {
                this._err(o.missingSemicolonAfterCharacterReference, 1);
              },
              absenceOfDigitsInNumericCharacterReference: (a) => {
                this._err(
                  o.absenceOfDigitsInNumericCharacterReference,
                  this.entityStartPos - this.preprocessor.pos + a,
                );
              },
              validateNumericCharacterReference: (a) => {
                let n = Dt(a);
                if (n) this._err(n, 1);
              },
            }
          : void 0,
      )));
  }
  _err(e, t = 0) {
    var a, n;
    (n = (a = this.handler).onParseError) === null ||
      n === void 0 ||
      n.call(a, this.preprocessor.getError(e, t));
  }
  getCurrentLocation(e) {
    if (!this.options.sourceCodeLocationInfo) return null;
    return {
      startLine: this.preprocessor.line,
      startCol: this.preprocessor.col - e,
      startOffset: this.preprocessor.offset - e,
      endLine: -1,
      endCol: -1,
      endOffset: -1,
    };
  }
  _runParsingLoop() {
    if (this.inLoop) return;
    this.inLoop = !0;
    while (this.active && !this.paused) {
      this.consumedAfterSnapshot = 0;
      let _consume = this._consume();
      if (!this._ensureHibernation()) this._callState(_consume);
    }
    this.inLoop = !1;
  }
  pause() {
    this.paused = !0;
  }
  resume(e) {
    if (!this.paused) throw Error("Parser was already resumed");
    if (((this.paused = !1), this.inLoop)) return;
    if ((this._runParsingLoop(), !this.paused)) e === null || e === void 0 || e();
  }
  write(e, t, a) {
    if (((this.active = !0), this.preprocessor.write(e, t), this._runParsingLoop(), !this.paused))
      a === null || a === void 0 || a();
  }
  insertHtmlAtCurrentPos(e) {
    ((this.active = !0), this.preprocessor.insertHtmlAtCurrentPos(e), this._runParsingLoop());
  }
  _ensureHibernation() {
    if (this.preprocessor.endOfChunkHit)
      return (
        this.preprocessor.retreat(this.consumedAfterSnapshot),
        (this.consumedAfterSnapshot = 0),
        (this.active = !1),
        !0
      );
    return !1;
  }
  _consume() {
    return (this.consumedAfterSnapshot++, this.preprocessor.advance());
  }
  _advanceBy(e) {
    this.consumedAfterSnapshot += e;
    for (let t = 0; t < e; t++) this.preprocessor.advance();
  }
  _consumeSequenceIfMatch(e, t) {
    if (this.preprocessor.startsWith(e, t)) return (this._advanceBy(e.length - 1), !0);
    return !1;
  }
  _createStartTagToken() {
    this.currentToken = {
      type: f.START_TAG,
      tagName: "",
      tagID: u.UNKNOWN,
      selfClosing: !1,
      ackSelfClosing: !1,
      attrs: [],
      location: this.getCurrentLocation(1),
    };
  }
  _createEndTagToken() {
    this.currentToken = {
      type: f.END_TAG,
      tagName: "",
      tagID: u.UNKNOWN,
      selfClosing: !1,
      ackSelfClosing: !1,
      attrs: [],
      location: this.getCurrentLocation(2),
    };
  }
  _createCommentToken(e) {
    this.currentToken = { type: f.COMMENT, data: "", location: this.getCurrentLocation(e) };
  }
  _createDoctypeToken(e) {
    this.currentToken = {
      type: f.DOCTYPE,
      name: e,
      forceQuirks: !1,
      publicId: null,
      systemId: null,
      location: this.currentLocation,
    };
  }
  _createCharacterToken(e, t) {
    this.currentCharacterToken = { type: e, chars: t, location: this.currentLocation };
  }
  _createAttr(e) {
    ((this.currentAttr = { name: e, value: "" }), (this.currentLocation = this.getCurrentLocation(0)));
  }
  _leaveAttrName() {
    var e, t;
    let currentToken = this.currentToken;
    if (z(currentToken, this.currentAttr.name) === null) {
      if ((currentToken.attrs.push(this.currentAttr), currentToken.location && this.currentLocation)) {
        let n =
          (e = (t = currentToken.location).attrs) !== null && e !== void 0
            ? e
            : (t.attrs = Object.create(null));
        ((n[this.currentAttr.name] = this.currentLocation), this._leaveAttrValue());
      }
    } else this._err(o.duplicateAttribute);
  }
  _leaveAttrValue() {
    if (this.currentLocation)
      ((this.currentLocation.endLine = this.preprocessor.line),
        (this.currentLocation.endCol = this.preprocessor.col),
        (this.currentLocation.endOffset = this.preprocessor.offset));
  }
  prepareToken(e) {
    if ((this._emitCurrentCharacterToken(e.location), (this.currentToken = null), e.location))
      ((e.location.endLine = this.preprocessor.line),
        (e.location.endCol = this.preprocessor.col + 1),
        (e.location.endOffset = this.preprocessor.offset + 1));
    this.currentLocation = this.getCurrentLocation(-1);
  }
  emitCurrentTagToken() {
    let currentToken = this.currentToken;
    if (
      (this.prepareToken(currentToken),
      (currentToken.tagID = x(currentToken.tagName)),
      currentToken.type === f.START_TAG)
    )
      ((this.lastStartTagName = currentToken.tagName), this.handler.onStartTag(currentToken));
    else {
      if (currentToken.attrs.length > 0) this._err(o.endTagWithAttributes);
      if (currentToken.selfClosing) this._err(o.endTagWithTrailingSolidus);
      this.handler.onEndTag(currentToken);
    }
    this.preprocessor.dropParsedChunk();
  }
  emitCurrentComment(e) {
    (this.prepareToken(e), this.handler.onComment(e), this.preprocessor.dropParsedChunk());
  }
  emitCurrentDoctype(e) {
    (this.prepareToken(e), this.handler.onDoctype(e), this.preprocessor.dropParsedChunk());
  }
  _emitCurrentCharacterToken(e) {
    if (this.currentCharacterToken) {
      if (e && this.currentCharacterToken.location)
        ((this.currentCharacterToken.location.endLine = e.startLine),
          (this.currentCharacterToken.location.endCol = e.startCol),
          (this.currentCharacterToken.location.endOffset = e.startOffset));
      switch (this.currentCharacterToken.type) {
        case f.CHARACTER: {
          this.handler.onCharacter(this.currentCharacterToken);
          break;
        }
        case f.NULL_CHARACTER: {
          this.handler.onNullCharacter(this.currentCharacterToken);
          break;
        }
        case f.WHITESPACE_CHARACTER: {
          this.handler.onWhitespaceCharacter(this.currentCharacterToken);
          break;
        }
      }
      this.currentCharacterToken = null;
    }
  }
  _emitEOFToken() {
    let currentLocation = this.getCurrentLocation(0);
    if (currentLocation)
      ((currentLocation.endLine = currentLocation.startLine),
        (currentLocation.endCol = currentLocation.startCol),
        (currentLocation.endOffset = currentLocation.startOffset));
    (this._emitCurrentCharacterToken(currentLocation),
      this.handler.onEof({ type: f.EOF, location: currentLocation }),
      (this.active = !1));
  }
  _appendCharToCurrentCharacterToken(e, t) {
    if (this.currentCharacterToken)
      if (this.currentCharacterToken.type === e) {
        this.currentCharacterToken.chars += t;
        return;
      } else
        ((this.currentLocation = this.getCurrentLocation(0)),
          this._emitCurrentCharacterToken(this.currentLocation),
          this.preprocessor.dropParsedChunk());
    this._createCharacterToken(e, t);
  }
  _emitCodePoint(e) {
    let t = xe(e) ? f.WHITESPACE_CHARACTER : e === s.NULL ? f.NULL_CHARACTER : f.CHARACTER;
    this._appendCharToCurrentCharacterToken(t, String.fromCodePoint(e));
  }
  _emitChars(e) {
    this._appendCharToCurrentCharacterToken(f.CHARACTER, e);
  }
  _startCharacterReference() {
    ((this.returnState = this.state),
      (this.state = r.CHARACTER_REFERENCE),
      (this.entityStartPos = this.preprocessor.pos),
      this.entityDecoder.startEntity(this._isCharacterReferenceInAttribute() ? D.Attribute : D.Legacy));
  }
  _isCharacterReferenceInAttribute() {
    return (
      this.returnState === r.ATTRIBUTE_VALUE_DOUBLE_QUOTED ||
      this.returnState === r.ATTRIBUTE_VALUE_SINGLE_QUOTED ||
      this.returnState === r.ATTRIBUTE_VALUE_UNQUOTED
    );
  }
  _flushCodePointConsumedAsCharacterReference(e) {
    if (this._isCharacterReferenceInAttribute()) this.currentAttr.value += String.fromCodePoint(e);
    else this._emitCodePoint(e);
  }
  _callState(e) {
    switch (this.state) {
      case r.DATA: {
        this._stateData(e);
        break;
      }
      case r.RCDATA: {
        this._stateRcdata(e);
        break;
      }
      case r.RAWTEXT: {
        this._stateRawtext(e);
        break;
      }
      case r.SCRIPT_DATA: {
        this._stateScriptData(e);
        break;
      }
      case r.PLAINTEXT: {
        this._statePlaintext(e);
        break;
      }
      case r.TAG_OPEN: {
        this._stateTagOpen(e);
        break;
      }
      case r.END_TAG_OPEN: {
        this._stateEndTagOpen(e);
        break;
      }
      case r.TAG_NAME: {
        this._stateTagName(e);
        break;
      }
      case r.RCDATA_LESS_THAN_SIGN: {
        this._stateRcdataLessThanSign(e);
        break;
      }
      case r.RCDATA_END_TAG_OPEN: {
        this._stateRcdataEndTagOpen(e);
        break;
      }
      case r.RCDATA_END_TAG_NAME: {
        this._stateRcdataEndTagName(e);
        break;
      }
      case r.RAWTEXT_LESS_THAN_SIGN: {
        this._stateRawtextLessThanSign(e);
        break;
      }
      case r.RAWTEXT_END_TAG_OPEN: {
        this._stateRawtextEndTagOpen(e);
        break;
      }
      case r.RAWTEXT_END_TAG_NAME: {
        this._stateRawtextEndTagName(e);
        break;
      }
      case r.SCRIPT_DATA_LESS_THAN_SIGN: {
        this._stateScriptDataLessThanSign(e);
        break;
      }
      case r.SCRIPT_DATA_END_TAG_OPEN: {
        this._stateScriptDataEndTagOpen(e);
        break;
      }
      case r.SCRIPT_DATA_END_TAG_NAME: {
        this._stateScriptDataEndTagName(e);
        break;
      }
      case r.SCRIPT_DATA_ESCAPE_START: {
        this._stateScriptDataEscapeStart(e);
        break;
      }
      case r.SCRIPT_DATA_ESCAPE_START_DASH: {
        this._stateScriptDataEscapeStartDash(e);
        break;
      }
      case r.SCRIPT_DATA_ESCAPED: {
        this._stateScriptDataEscaped(e);
        break;
      }
      case r.SCRIPT_DATA_ESCAPED_DASH: {
        this._stateScriptDataEscapedDash(e);
        break;
      }
      case r.SCRIPT_DATA_ESCAPED_DASH_DASH: {
        this._stateScriptDataEscapedDashDash(e);
        break;
      }
      case r.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN: {
        this._stateScriptDataEscapedLessThanSign(e);
        break;
      }
      case r.SCRIPT_DATA_ESCAPED_END_TAG_OPEN: {
        this._stateScriptDataEscapedEndTagOpen(e);
        break;
      }
      case r.SCRIPT_DATA_ESCAPED_END_TAG_NAME: {
        this._stateScriptDataEscapedEndTagName(e);
        break;
      }
      case r.SCRIPT_DATA_DOUBLE_ESCAPE_START: {
        this._stateScriptDataDoubleEscapeStart(e);
        break;
      }
      case r.SCRIPT_DATA_DOUBLE_ESCAPED: {
        this._stateScriptDataDoubleEscaped(e);
        break;
      }
      case r.SCRIPT_DATA_DOUBLE_ESCAPED_DASH: {
        this._stateScriptDataDoubleEscapedDash(e);
        break;
      }
      case r.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH: {
        this._stateScriptDataDoubleEscapedDashDash(e);
        break;
      }
      case r.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN: {
        this._stateScriptDataDoubleEscapedLessThanSign(e);
        break;
      }
      case r.SCRIPT_DATA_DOUBLE_ESCAPE_END: {
        this._stateScriptDataDoubleEscapeEnd(e);
        break;
      }
      case r.BEFORE_ATTRIBUTE_NAME: {
        this._stateBeforeAttributeName(e);
        break;
      }
      case r.ATTRIBUTE_NAME: {
        this._stateAttributeName(e);
        break;
      }
      case r.AFTER_ATTRIBUTE_NAME: {
        this._stateAfterAttributeName(e);
        break;
      }
      case r.BEFORE_ATTRIBUTE_VALUE: {
        this._stateBeforeAttributeValue(e);
        break;
      }
      case r.ATTRIBUTE_VALUE_DOUBLE_QUOTED: {
        this._stateAttributeValueDoubleQuoted(e);
        break;
      }
      case r.ATTRIBUTE_VALUE_SINGLE_QUOTED: {
        this._stateAttributeValueSingleQuoted(e);
        break;
      }
      case r.ATTRIBUTE_VALUE_UNQUOTED: {
        this._stateAttributeValueUnquoted(e);
        break;
      }
      case r.AFTER_ATTRIBUTE_VALUE_QUOTED: {
        this._stateAfterAttributeValueQuoted(e);
        break;
      }
      case r.SELF_CLOSING_START_TAG: {
        this._stateSelfClosingStartTag(e);
        break;
      }
      case r.BOGUS_COMMENT: {
        this._stateBogusComment(e);
        break;
      }
      case r.MARKUP_DECLARATION_OPEN: {
        this._stateMarkupDeclarationOpen(e);
        break;
      }
      case r.COMMENT_START: {
        this._stateCommentStart(e);
        break;
      }
      case r.COMMENT_START_DASH: {
        this._stateCommentStartDash(e);
        break;
      }
      case r.COMMENT: {
        this._stateComment(e);
        break;
      }
      case r.COMMENT_LESS_THAN_SIGN: {
        this._stateCommentLessThanSign(e);
        break;
      }
      case r.COMMENT_LESS_THAN_SIGN_BANG: {
        this._stateCommentLessThanSignBang(e);
        break;
      }
      case r.COMMENT_LESS_THAN_SIGN_BANG_DASH: {
        this._stateCommentLessThanSignBangDash(e);
        break;
      }
      case r.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH: {
        this._stateCommentLessThanSignBangDashDash(e);
        break;
      }
      case r.COMMENT_END_DASH: {
        this._stateCommentEndDash(e);
        break;
      }
      case r.COMMENT_END: {
        this._stateCommentEnd(e);
        break;
      }
      case r.COMMENT_END_BANG: {
        this._stateCommentEndBang(e);
        break;
      }
      case r.DOCTYPE: {
        this._stateDoctype(e);
        break;
      }
      case r.BEFORE_DOCTYPE_NAME: {
        this._stateBeforeDoctypeName(e);
        break;
      }
      case r.DOCTYPE_NAME: {
        this._stateDoctypeName(e);
        break;
      }
      case r.AFTER_DOCTYPE_NAME: {
        this._stateAfterDoctypeName(e);
        break;
      }
      case r.AFTER_DOCTYPE_PUBLIC_KEYWORD: {
        this._stateAfterDoctypePublicKeyword(e);
        break;
      }
      case r.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER: {
        this._stateBeforeDoctypePublicIdentifier(e);
        break;
      }
      case r.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED: {
        this._stateDoctypePublicIdentifierDoubleQuoted(e);
        break;
      }
      case r.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED: {
        this._stateDoctypePublicIdentifierSingleQuoted(e);
        break;
      }
      case r.AFTER_DOCTYPE_PUBLIC_IDENTIFIER: {
        this._stateAfterDoctypePublicIdentifier(e);
        break;
      }
      case r.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS: {
        this._stateBetweenDoctypePublicAndSystemIdentifiers(e);
        break;
      }
      case r.AFTER_DOCTYPE_SYSTEM_KEYWORD: {
        this._stateAfterDoctypeSystemKeyword(e);
        break;
      }
      case r.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER: {
        this._stateBeforeDoctypeSystemIdentifier(e);
        break;
      }
      case r.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED: {
        this._stateDoctypeSystemIdentifierDoubleQuoted(e);
        break;
      }
      case r.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED: {
        this._stateDoctypeSystemIdentifierSingleQuoted(e);
        break;
      }
      case r.AFTER_DOCTYPE_SYSTEM_IDENTIFIER: {
        this._stateAfterDoctypeSystemIdentifier(e);
        break;
      }
      case r.BOGUS_DOCTYPE: {
        this._stateBogusDoctype(e);
        break;
      }
      case r.CDATA_SECTION: {
        this._stateCdataSection(e);
        break;
      }
      case r.CDATA_SECTION_BRACKET: {
        this._stateCdataSectionBracket(e);
        break;
      }
      case r.CDATA_SECTION_END: {
        this._stateCdataSectionEnd(e);
        break;
      }
      case r.CHARACTER_REFERENCE: {
        this._stateCharacterReference();
        break;
      }
      case r.AMBIGUOUS_AMPERSAND: {
        this._stateAmbiguousAmpersand(e);
        break;
      }
      default:
        throw Error("Unknown state");
    }
  }
  _stateData(e) {
    switch (e) {
      case s.LESS_THAN_SIGN: {
        this.state = r.TAG_OPEN;
        break;
      }
      case s.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), this._emitCodePoint(e));
        break;
      }
      case s.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(e);
    }
  }
  _stateRcdata(e) {
    switch (e) {
      case s.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case s.LESS_THAN_SIGN: {
        this.state = r.RCDATA_LESS_THAN_SIGN;
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), this._emitChars(m));
        break;
      }
      case s.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(e);
    }
  }
  _stateRawtext(e) {
    switch (e) {
      case s.LESS_THAN_SIGN: {
        this.state = r.RAWTEXT_LESS_THAN_SIGN;
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), this._emitChars(m));
        break;
      }
      case s.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(e);
    }
  }
  _stateScriptData(e) {
    switch (e) {
      case s.LESS_THAN_SIGN: {
        this.state = r.SCRIPT_DATA_LESS_THAN_SIGN;
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), this._emitChars(m));
        break;
      }
      case s.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(e);
    }
  }
  _statePlaintext(e) {
    switch (e) {
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), this._emitChars(m));
        break;
      }
      case s.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(e);
    }
  }
  _stateTagOpen(e) {
    if (M(e)) (this._createStartTagToken(), (this.state = r.TAG_NAME), this._stateTagName(e));
    else
      switch (e) {
        case s.EXCLAMATION_MARK: {
          this.state = r.MARKUP_DECLARATION_OPEN;
          break;
        }
        case s.SOLIDUS: {
          this.state = r.END_TAG_OPEN;
          break;
        }
        case s.QUESTION_MARK: {
          (this._err(o.unexpectedQuestionMarkInsteadOfTagName),
            this._createCommentToken(1),
            (this.state = r.BOGUS_COMMENT),
            this._stateBogusComment(e));
          break;
        }
        case s.EOF: {
          (this._err(o.eofBeforeTagName), this._emitChars("<"), this._emitEOFToken());
          break;
        }
        default:
          (this._err(o.invalidFirstCharacterOfTagName),
            this._emitChars("<"),
            (this.state = r.DATA),
            this._stateData(e));
      }
  }
  _stateEndTagOpen(e) {
    if (M(e)) (this._createEndTagToken(), (this.state = r.TAG_NAME), this._stateTagName(e));
    else
      switch (e) {
        case s.GREATER_THAN_SIGN: {
          (this._err(o.missingEndTagName), (this.state = r.DATA));
          break;
        }
        case s.EOF: {
          (this._err(o.eofBeforeTagName), this._emitChars("</"), this._emitEOFToken());
          break;
        }
        default:
          (this._err(o.invalidFirstCharacterOfTagName),
            this._createCommentToken(2),
            (this.state = r.BOGUS_COMMENT),
            this._stateBogusComment(e));
      }
  }
  _stateTagName(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED: {
        this.state = r.BEFORE_ATTRIBUTE_NAME;
        break;
      }
      case s.SOLIDUS: {
        this.state = r.SELF_CLOSING_START_TAG;
        break;
      }
      case s.GREATER_THAN_SIGN: {
        ((this.state = r.DATA), this.emitCurrentTagToken());
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), (currentToken.tagName += m));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInTag), this._emitEOFToken());
        break;
      }
      default:
        currentToken.tagName += String.fromCodePoint(U(e) ? Z(e) : e);
    }
  }
  _stateRcdataLessThanSign(e) {
    if (e === s.SOLIDUS) this.state = r.RCDATA_END_TAG_OPEN;
    else (this._emitChars("<"), (this.state = r.RCDATA), this._stateRcdata(e));
  }
  _stateRcdataEndTagOpen(e) {
    if (M(e)) ((this.state = r.RCDATA_END_TAG_NAME), this._stateRcdataEndTagName(e));
    else (this._emitChars("</"), (this.state = r.RCDATA), this._stateRcdata(e));
  }
  handleSpecialEndTag(e) {
    if (!this.preprocessor.startsWith(this.lastStartTagName, !1)) return !this._ensureHibernation();
    this._createEndTagToken();
    let currentToken = this.currentToken;
    switch (
      ((currentToken.tagName = this.lastStartTagName), this.preprocessor.peek(this.lastStartTagName.length))
    ) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED:
        return (this._advanceBy(this.lastStartTagName.length), (this.state = r.BEFORE_ATTRIBUTE_NAME), !1);
      case s.SOLIDUS:
        return (this._advanceBy(this.lastStartTagName.length), (this.state = r.SELF_CLOSING_START_TAG), !1);
      case s.GREATER_THAN_SIGN:
        return (
          this._advanceBy(this.lastStartTagName.length),
          this.emitCurrentTagToken(),
          (this.state = r.DATA),
          !1
        );
      default:
        return !this._ensureHibernation();
    }
  }
  _stateRcdataEndTagName(e) {
    if (this.handleSpecialEndTag(e)) (this._emitChars("</"), (this.state = r.RCDATA), this._stateRcdata(e));
  }
  _stateRawtextLessThanSign(e) {
    if (e === s.SOLIDUS) this.state = r.RAWTEXT_END_TAG_OPEN;
    else (this._emitChars("<"), (this.state = r.RAWTEXT), this._stateRawtext(e));
  }
  _stateRawtextEndTagOpen(e) {
    if (M(e)) ((this.state = r.RAWTEXT_END_TAG_NAME), this._stateRawtextEndTagName(e));
    else (this._emitChars("</"), (this.state = r.RAWTEXT), this._stateRawtext(e));
  }
  _stateRawtextEndTagName(e) {
    if (this.handleSpecialEndTag(e)) (this._emitChars("</"), (this.state = r.RAWTEXT), this._stateRawtext(e));
  }
  _stateScriptDataLessThanSign(e) {
    switch (e) {
      case s.SOLIDUS: {
        this.state = r.SCRIPT_DATA_END_TAG_OPEN;
        break;
      }
      case s.EXCLAMATION_MARK: {
        ((this.state = r.SCRIPT_DATA_ESCAPE_START), this._emitChars("<!"));
        break;
      }
      default:
        (this._emitChars("<"), (this.state = r.SCRIPT_DATA), this._stateScriptData(e));
    }
  }
  _stateScriptDataEndTagOpen(e) {
    if (M(e)) ((this.state = r.SCRIPT_DATA_END_TAG_NAME), this._stateScriptDataEndTagName(e));
    else (this._emitChars("</"), (this.state = r.SCRIPT_DATA), this._stateScriptData(e));
  }
  _stateScriptDataEndTagName(e) {
    if (this.handleSpecialEndTag(e))
      (this._emitChars("</"), (this.state = r.SCRIPT_DATA), this._stateScriptData(e));
  }
  _stateScriptDataEscapeStart(e) {
    if (e === s.HYPHEN_MINUS) ((this.state = r.SCRIPT_DATA_ESCAPE_START_DASH), this._emitChars("-"));
    else ((this.state = r.SCRIPT_DATA), this._stateScriptData(e));
  }
  _stateScriptDataEscapeStartDash(e) {
    if (e === s.HYPHEN_MINUS) ((this.state = r.SCRIPT_DATA_ESCAPED_DASH_DASH), this._emitChars("-"));
    else ((this.state = r.SCRIPT_DATA), this._stateScriptData(e));
  }
  _stateScriptDataEscaped(e) {
    switch (e) {
      case s.HYPHEN_MINUS: {
        ((this.state = r.SCRIPT_DATA_ESCAPED_DASH), this._emitChars("-"));
        break;
      }
      case s.LESS_THAN_SIGN: {
        this.state = r.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), this._emitChars(m));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInScriptHtmlCommentLikeText), this._emitEOFToken());
        break;
      }
      default:
        this._emitCodePoint(e);
    }
  }
  _stateScriptDataEscapedDash(e) {
    switch (e) {
      case s.HYPHEN_MINUS: {
        ((this.state = r.SCRIPT_DATA_ESCAPED_DASH_DASH), this._emitChars("-"));
        break;
      }
      case s.LESS_THAN_SIGN: {
        this.state = r.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), (this.state = r.SCRIPT_DATA_ESCAPED), this._emitChars(m));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInScriptHtmlCommentLikeText), this._emitEOFToken());
        break;
      }
      default:
        ((this.state = r.SCRIPT_DATA_ESCAPED), this._emitCodePoint(e));
    }
  }
  _stateScriptDataEscapedDashDash(e) {
    switch (e) {
      case s.HYPHEN_MINUS: {
        this._emitChars("-");
        break;
      }
      case s.LESS_THAN_SIGN: {
        this.state = r.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
        break;
      }
      case s.GREATER_THAN_SIGN: {
        ((this.state = r.SCRIPT_DATA), this._emitChars(">"));
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), (this.state = r.SCRIPT_DATA_ESCAPED), this._emitChars(m));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInScriptHtmlCommentLikeText), this._emitEOFToken());
        break;
      }
      default:
        ((this.state = r.SCRIPT_DATA_ESCAPED), this._emitCodePoint(e));
    }
  }
  _stateScriptDataEscapedLessThanSign(e) {
    if (e === s.SOLIDUS) this.state = r.SCRIPT_DATA_ESCAPED_END_TAG_OPEN;
    else if (M(e))
      (this._emitChars("<"),
        (this.state = r.SCRIPT_DATA_DOUBLE_ESCAPE_START),
        this._stateScriptDataDoubleEscapeStart(e));
    else (this._emitChars("<"), (this.state = r.SCRIPT_DATA_ESCAPED), this._stateScriptDataEscaped(e));
  }
  _stateScriptDataEscapedEndTagOpen(e) {
    if (M(e)) ((this.state = r.SCRIPT_DATA_ESCAPED_END_TAG_NAME), this._stateScriptDataEscapedEndTagName(e));
    else (this._emitChars("</"), (this.state = r.SCRIPT_DATA_ESCAPED), this._stateScriptDataEscaped(e));
  }
  _stateScriptDataEscapedEndTagName(e) {
    if (this.handleSpecialEndTag(e))
      (this._emitChars("</"), (this.state = r.SCRIPT_DATA_ESCAPED), this._stateScriptDataEscaped(e));
  }
  _stateScriptDataDoubleEscapeStart(e) {
    if (this.preprocessor.startsWith(C.SCRIPT, !1) && Me(this.preprocessor.peek(C.SCRIPT.length))) {
      this._emitCodePoint(e);
      for (let t = 0; t < C.SCRIPT.length; t++) this._emitCodePoint(this._consume());
      this.state = r.SCRIPT_DATA_DOUBLE_ESCAPED;
    } else if (!this._ensureHibernation())
      ((this.state = r.SCRIPT_DATA_ESCAPED), this._stateScriptDataEscaped(e));
  }
  _stateScriptDataDoubleEscaped(e) {
    switch (e) {
      case s.HYPHEN_MINUS: {
        ((this.state = r.SCRIPT_DATA_DOUBLE_ESCAPED_DASH), this._emitChars("-"));
        break;
      }
      case s.LESS_THAN_SIGN: {
        ((this.state = r.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN), this._emitChars("<"));
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), this._emitChars(m));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInScriptHtmlCommentLikeText), this._emitEOFToken());
        break;
      }
      default:
        this._emitCodePoint(e);
    }
  }
  _stateScriptDataDoubleEscapedDash(e) {
    switch (e) {
      case s.HYPHEN_MINUS: {
        ((this.state = r.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH), this._emitChars("-"));
        break;
      }
      case s.LESS_THAN_SIGN: {
        ((this.state = r.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN), this._emitChars("<"));
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter),
          (this.state = r.SCRIPT_DATA_DOUBLE_ESCAPED),
          this._emitChars(m));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInScriptHtmlCommentLikeText), this._emitEOFToken());
        break;
      }
      default:
        ((this.state = r.SCRIPT_DATA_DOUBLE_ESCAPED), this._emitCodePoint(e));
    }
  }
  _stateScriptDataDoubleEscapedDashDash(e) {
    switch (e) {
      case s.HYPHEN_MINUS: {
        this._emitChars("-");
        break;
      }
      case s.LESS_THAN_SIGN: {
        ((this.state = r.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN), this._emitChars("<"));
        break;
      }
      case s.GREATER_THAN_SIGN: {
        ((this.state = r.SCRIPT_DATA), this._emitChars(">"));
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter),
          (this.state = r.SCRIPT_DATA_DOUBLE_ESCAPED),
          this._emitChars(m));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInScriptHtmlCommentLikeText), this._emitEOFToken());
        break;
      }
      default:
        ((this.state = r.SCRIPT_DATA_DOUBLE_ESCAPED), this._emitCodePoint(e));
    }
  }
  _stateScriptDataDoubleEscapedLessThanSign(e) {
    if (e === s.SOLIDUS) ((this.state = r.SCRIPT_DATA_DOUBLE_ESCAPE_END), this._emitChars("/"));
    else ((this.state = r.SCRIPT_DATA_DOUBLE_ESCAPED), this._stateScriptDataDoubleEscaped(e));
  }
  _stateScriptDataDoubleEscapeEnd(e) {
    if (this.preprocessor.startsWith(C.SCRIPT, !1) && Me(this.preprocessor.peek(C.SCRIPT.length))) {
      this._emitCodePoint(e);
      for (let t = 0; t < C.SCRIPT.length; t++) this._emitCodePoint(this._consume());
      this.state = r.SCRIPT_DATA_ESCAPED;
    } else if (!this._ensureHibernation())
      ((this.state = r.SCRIPT_DATA_DOUBLE_ESCAPED), this._stateScriptDataDoubleEscaped(e));
  }
  _stateBeforeAttributeName(e) {
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED:
        break;
      case s.SOLIDUS:
      case s.GREATER_THAN_SIGN:
      case s.EOF: {
        ((this.state = r.AFTER_ATTRIBUTE_NAME), this._stateAfterAttributeName(e));
        break;
      }
      case s.EQUALS_SIGN: {
        (this._err(o.unexpectedEqualsSignBeforeAttributeName),
          this._createAttr("="),
          (this.state = r.ATTRIBUTE_NAME));
        break;
      }
      default:
        (this._createAttr(""), (this.state = r.ATTRIBUTE_NAME), this._stateAttributeName(e));
    }
  }
  _stateAttributeName(e) {
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED:
      case s.SOLIDUS:
      case s.GREATER_THAN_SIGN:
      case s.EOF: {
        (this._leaveAttrName(), (this.state = r.AFTER_ATTRIBUTE_NAME), this._stateAfterAttributeName(e));
        break;
      }
      case s.EQUALS_SIGN: {
        (this._leaveAttrName(), (this.state = r.BEFORE_ATTRIBUTE_VALUE));
        break;
      }
      case s.QUOTATION_MARK:
      case s.APOSTROPHE:
      case s.LESS_THAN_SIGN: {
        (this._err(o.unexpectedCharacterInAttributeName), (this.currentAttr.name += String.fromCodePoint(e)));
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), (this.currentAttr.name += m));
        break;
      }
      default:
        this.currentAttr.name += String.fromCodePoint(U(e) ? Z(e) : e);
    }
  }
  _stateAfterAttributeName(e) {
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED:
        break;
      case s.SOLIDUS: {
        this.state = r.SELF_CLOSING_START_TAG;
        break;
      }
      case s.EQUALS_SIGN: {
        this.state = r.BEFORE_ATTRIBUTE_VALUE;
        break;
      }
      case s.GREATER_THAN_SIGN: {
        ((this.state = r.DATA), this.emitCurrentTagToken());
        break;
      }
      case s.EOF: {
        (this._err(o.eofInTag), this._emitEOFToken());
        break;
      }
      default:
        (this._createAttr(""), (this.state = r.ATTRIBUTE_NAME), this._stateAttributeName(e));
    }
  }
  _stateBeforeAttributeValue(e) {
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED:
        break;
      case s.QUOTATION_MARK: {
        this.state = r.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
        break;
      }
      case s.APOSTROPHE: {
        this.state = r.ATTRIBUTE_VALUE_SINGLE_QUOTED;
        break;
      }
      case s.GREATER_THAN_SIGN: {
        (this._err(o.missingAttributeValue), (this.state = r.DATA), this.emitCurrentTagToken());
        break;
      }
      default:
        ((this.state = r.ATTRIBUTE_VALUE_UNQUOTED), this._stateAttributeValueUnquoted(e));
    }
  }
  _stateAttributeValueDoubleQuoted(e) {
    switch (e) {
      case s.QUOTATION_MARK: {
        this.state = r.AFTER_ATTRIBUTE_VALUE_QUOTED;
        break;
      }
      case s.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), (this.currentAttr.value += m));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInTag), this._emitEOFToken());
        break;
      }
      default:
        this.currentAttr.value += String.fromCodePoint(e);
    }
  }
  _stateAttributeValueSingleQuoted(e) {
    switch (e) {
      case s.APOSTROPHE: {
        this.state = r.AFTER_ATTRIBUTE_VALUE_QUOTED;
        break;
      }
      case s.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), (this.currentAttr.value += m));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInTag), this._emitEOFToken());
        break;
      }
      default:
        this.currentAttr.value += String.fromCodePoint(e);
    }
  }
  _stateAttributeValueUnquoted(e) {
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED: {
        (this._leaveAttrValue(), (this.state = r.BEFORE_ATTRIBUTE_NAME));
        break;
      }
      case s.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case s.GREATER_THAN_SIGN: {
        (this._leaveAttrValue(), (this.state = r.DATA), this.emitCurrentTagToken());
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), (this.currentAttr.value += m));
        break;
      }
      case s.QUOTATION_MARK:
      case s.APOSTROPHE:
      case s.LESS_THAN_SIGN:
      case s.EQUALS_SIGN:
      case s.GRAVE_ACCENT: {
        (this._err(o.unexpectedCharacterInUnquotedAttributeValue),
          (this.currentAttr.value += String.fromCodePoint(e)));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInTag), this._emitEOFToken());
        break;
      }
      default:
        this.currentAttr.value += String.fromCodePoint(e);
    }
  }
  _stateAfterAttributeValueQuoted(e) {
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED: {
        (this._leaveAttrValue(), (this.state = r.BEFORE_ATTRIBUTE_NAME));
        break;
      }
      case s.SOLIDUS: {
        (this._leaveAttrValue(), (this.state = r.SELF_CLOSING_START_TAG));
        break;
      }
      case s.GREATER_THAN_SIGN: {
        (this._leaveAttrValue(), (this.state = r.DATA), this.emitCurrentTagToken());
        break;
      }
      case s.EOF: {
        (this._err(o.eofInTag), this._emitEOFToken());
        break;
      }
      default:
        (this._err(o.missingWhitespaceBetweenAttributes),
          (this.state = r.BEFORE_ATTRIBUTE_NAME),
          this._stateBeforeAttributeName(e));
    }
  }
  _stateSelfClosingStartTag(e) {
    switch (e) {
      case s.GREATER_THAN_SIGN: {
        let currentToken = this.currentToken;
        ((currentToken.selfClosing = !0), (this.state = r.DATA), this.emitCurrentTagToken());
        break;
      }
      case s.EOF: {
        (this._err(o.eofInTag), this._emitEOFToken());
        break;
      }
      default:
        (this._err(o.unexpectedSolidusInTag),
          (this.state = r.BEFORE_ATTRIBUTE_NAME),
          this._stateBeforeAttributeName(e));
    }
  }
  _stateBogusComment(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.GREATER_THAN_SIGN: {
        ((this.state = r.DATA), this.emitCurrentComment(currentToken));
        break;
      }
      case s.EOF: {
        (this.emitCurrentComment(currentToken), this._emitEOFToken());
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), (currentToken.data += m));
        break;
      }
      default:
        currentToken.data += String.fromCodePoint(e);
    }
  }
  _stateMarkupDeclarationOpen(e) {
    if (this._consumeSequenceIfMatch(C.DASH_DASH, !0))
      (this._createCommentToken(C.DASH_DASH.length + 1), (this.state = r.COMMENT_START));
    else if (this._consumeSequenceIfMatch(C.DOCTYPE, !1))
      ((this.currentLocation = this.getCurrentLocation(C.DOCTYPE.length + 1)), (this.state = r.DOCTYPE));
    else if (this._consumeSequenceIfMatch(C.CDATA_START, !0))
      if (this.inForeignNode) this.state = r.CDATA_SECTION;
      else
        (this._err(o.cdataInHtmlContent),
          this._createCommentToken(C.CDATA_START.length + 1),
          (this.currentToken.data = "[CDATA["),
          (this.state = r.BOGUS_COMMENT));
    else if (!this._ensureHibernation())
      (this._err(o.incorrectlyOpenedComment),
        this._createCommentToken(2),
        (this.state = r.BOGUS_COMMENT),
        this._stateBogusComment(e));
  }
  _stateCommentStart(e) {
    switch (e) {
      case s.HYPHEN_MINUS: {
        this.state = r.COMMENT_START_DASH;
        break;
      }
      case s.GREATER_THAN_SIGN: {
        (this._err(o.abruptClosingOfEmptyComment), (this.state = r.DATA));
        let currentToken = this.currentToken;
        this.emitCurrentComment(currentToken);
        break;
      }
      default:
        ((this.state = r.COMMENT), this._stateComment(e));
    }
  }
  _stateCommentStartDash(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.HYPHEN_MINUS: {
        this.state = r.COMMENT_END;
        break;
      }
      case s.GREATER_THAN_SIGN: {
        (this._err(o.abruptClosingOfEmptyComment),
          (this.state = r.DATA),
          this.emitCurrentComment(currentToken));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInComment), this.emitCurrentComment(currentToken), this._emitEOFToken());
        break;
      }
      default:
        ((currentToken.data += "-"), (this.state = r.COMMENT), this._stateComment(e));
    }
  }
  _stateComment(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.HYPHEN_MINUS: {
        this.state = r.COMMENT_END_DASH;
        break;
      }
      case s.LESS_THAN_SIGN: {
        ((currentToken.data += "<"), (this.state = r.COMMENT_LESS_THAN_SIGN));
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), (currentToken.data += m));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInComment), this.emitCurrentComment(currentToken), this._emitEOFToken());
        break;
      }
      default:
        currentToken.data += String.fromCodePoint(e);
    }
  }
  _stateCommentLessThanSign(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.EXCLAMATION_MARK: {
        ((currentToken.data += "!"), (this.state = r.COMMENT_LESS_THAN_SIGN_BANG));
        break;
      }
      case s.LESS_THAN_SIGN: {
        currentToken.data += "<";
        break;
      }
      default:
        ((this.state = r.COMMENT), this._stateComment(e));
    }
  }
  _stateCommentLessThanSignBang(e) {
    if (e === s.HYPHEN_MINUS) this.state = r.COMMENT_LESS_THAN_SIGN_BANG_DASH;
    else ((this.state = r.COMMENT), this._stateComment(e));
  }
  _stateCommentLessThanSignBangDash(e) {
    if (e === s.HYPHEN_MINUS) this.state = r.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH;
    else ((this.state = r.COMMENT_END_DASH), this._stateCommentEndDash(e));
  }
  _stateCommentLessThanSignBangDashDash(e) {
    if (e !== s.GREATER_THAN_SIGN && e !== s.EOF) this._err(o.nestedComment);
    ((this.state = r.COMMENT_END), this._stateCommentEnd(e));
  }
  _stateCommentEndDash(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.HYPHEN_MINUS: {
        this.state = r.COMMENT_END;
        break;
      }
      case s.EOF: {
        (this._err(o.eofInComment), this.emitCurrentComment(currentToken), this._emitEOFToken());
        break;
      }
      default:
        ((currentToken.data += "-"), (this.state = r.COMMENT), this._stateComment(e));
    }
  }
  _stateCommentEnd(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.GREATER_THAN_SIGN: {
        ((this.state = r.DATA), this.emitCurrentComment(currentToken));
        break;
      }
      case s.EXCLAMATION_MARK: {
        this.state = r.COMMENT_END_BANG;
        break;
      }
      case s.HYPHEN_MINUS: {
        currentToken.data += "-";
        break;
      }
      case s.EOF: {
        (this._err(o.eofInComment), this.emitCurrentComment(currentToken), this._emitEOFToken());
        break;
      }
      default:
        ((currentToken.data += "--"), (this.state = r.COMMENT), this._stateComment(e));
    }
  }
  _stateCommentEndBang(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.HYPHEN_MINUS: {
        ((currentToken.data += "--!"), (this.state = r.COMMENT_END_DASH));
        break;
      }
      case s.GREATER_THAN_SIGN: {
        (this._err(o.incorrectlyClosedComment), (this.state = r.DATA), this.emitCurrentComment(currentToken));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInComment), this.emitCurrentComment(currentToken), this._emitEOFToken());
        break;
      }
      default:
        ((currentToken.data += "--!"), (this.state = r.COMMENT), this._stateComment(e));
    }
  }
  _stateDoctype(e) {
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED: {
        this.state = r.BEFORE_DOCTYPE_NAME;
        break;
      }
      case s.GREATER_THAN_SIGN: {
        ((this.state = r.BEFORE_DOCTYPE_NAME), this._stateBeforeDoctypeName(e));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInDoctype), this._createDoctypeToken(null));
        let currentToken = this.currentToken;
        ((currentToken.forceQuirks = !0), this.emitCurrentDoctype(currentToken), this._emitEOFToken());
        break;
      }
      default:
        (this._err(o.missingWhitespaceBeforeDoctypeName),
          (this.state = r.BEFORE_DOCTYPE_NAME),
          this._stateBeforeDoctypeName(e));
    }
  }
  _stateBeforeDoctypeName(e) {
    if (U(e)) (this._createDoctypeToken(String.fromCharCode(Z(e))), (this.state = r.DOCTYPE_NAME));
    else
      switch (e) {
        case s.SPACE:
        case s.LINE_FEED:
        case s.TABULATION:
        case s.FORM_FEED:
          break;
        case s.NULL: {
          (this._err(o.unexpectedNullCharacter), this._createDoctypeToken(m), (this.state = r.DOCTYPE_NAME));
          break;
        }
        case s.GREATER_THAN_SIGN: {
          (this._err(o.missingDoctypeName), this._createDoctypeToken(null));
          let currentToken = this.currentToken;
          ((currentToken.forceQuirks = !0), this.emitCurrentDoctype(currentToken), (this.state = r.DATA));
          break;
        }
        case s.EOF: {
          (this._err(o.eofInDoctype), this._createDoctypeToken(null));
          let currentToken = this.currentToken;
          ((currentToken.forceQuirks = !0), this.emitCurrentDoctype(currentToken), this._emitEOFToken());
          break;
        }
        default:
          (this._createDoctypeToken(String.fromCodePoint(e)), (this.state = r.DOCTYPE_NAME));
      }
  }
  _stateDoctypeName(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED: {
        this.state = r.AFTER_DOCTYPE_NAME;
        break;
      }
      case s.GREATER_THAN_SIGN: {
        ((this.state = r.DATA), this.emitCurrentDoctype(currentToken));
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), (currentToken.name += m));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInDoctype),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          this._emitEOFToken());
        break;
      }
      default:
        currentToken.name += String.fromCodePoint(U(e) ? Z(e) : e);
    }
  }
  _stateAfterDoctypeName(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED:
        break;
      case s.GREATER_THAN_SIGN: {
        ((this.state = r.DATA), this.emitCurrentDoctype(currentToken));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInDoctype),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          this._emitEOFToken());
        break;
      }
      default:
        if (this._consumeSequenceIfMatch(C.PUBLIC, !1)) this.state = r.AFTER_DOCTYPE_PUBLIC_KEYWORD;
        else if (this._consumeSequenceIfMatch(C.SYSTEM, !1)) this.state = r.AFTER_DOCTYPE_SYSTEM_KEYWORD;
        else if (!this._ensureHibernation())
          (this._err(o.invalidCharacterSequenceAfterDoctypeName),
            (currentToken.forceQuirks = !0),
            (this.state = r.BOGUS_DOCTYPE),
            this._stateBogusDoctype(e));
    }
  }
  _stateAfterDoctypePublicKeyword(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED: {
        this.state = r.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER;
        break;
      }
      case s.QUOTATION_MARK: {
        (this._err(o.missingWhitespaceAfterDoctypePublicKeyword),
          (currentToken.publicId = ""),
          (this.state = r.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED));
        break;
      }
      case s.APOSTROPHE: {
        (this._err(o.missingWhitespaceAfterDoctypePublicKeyword),
          (currentToken.publicId = ""),
          (this.state = r.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED));
        break;
      }
      case s.GREATER_THAN_SIGN: {
        (this._err(o.missingDoctypePublicIdentifier),
          (currentToken.forceQuirks = !0),
          (this.state = r.DATA),
          this.emitCurrentDoctype(currentToken));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInDoctype),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          this._emitEOFToken());
        break;
      }
      default:
        (this._err(o.missingQuoteBeforeDoctypePublicIdentifier),
          (currentToken.forceQuirks = !0),
          (this.state = r.BOGUS_DOCTYPE),
          this._stateBogusDoctype(e));
    }
  }
  _stateBeforeDoctypePublicIdentifier(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED:
        break;
      case s.QUOTATION_MARK: {
        ((currentToken.publicId = ""), (this.state = r.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED));
        break;
      }
      case s.APOSTROPHE: {
        ((currentToken.publicId = ""), (this.state = r.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED));
        break;
      }
      case s.GREATER_THAN_SIGN: {
        (this._err(o.missingDoctypePublicIdentifier),
          (currentToken.forceQuirks = !0),
          (this.state = r.DATA),
          this.emitCurrentDoctype(currentToken));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInDoctype),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          this._emitEOFToken());
        break;
      }
      default:
        (this._err(o.missingQuoteBeforeDoctypePublicIdentifier),
          (currentToken.forceQuirks = !0),
          (this.state = r.BOGUS_DOCTYPE),
          this._stateBogusDoctype(e));
    }
  }
  _stateDoctypePublicIdentifierDoubleQuoted(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.QUOTATION_MARK: {
        this.state = r.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), (currentToken.publicId += m));
        break;
      }
      case s.GREATER_THAN_SIGN: {
        (this._err(o.abruptDoctypePublicIdentifier),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          (this.state = r.DATA));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInDoctype),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          this._emitEOFToken());
        break;
      }
      default:
        currentToken.publicId += String.fromCodePoint(e);
    }
  }
  _stateDoctypePublicIdentifierSingleQuoted(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.APOSTROPHE: {
        this.state = r.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), (currentToken.publicId += m));
        break;
      }
      case s.GREATER_THAN_SIGN: {
        (this._err(o.abruptDoctypePublicIdentifier),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          (this.state = r.DATA));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInDoctype),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          this._emitEOFToken());
        break;
      }
      default:
        currentToken.publicId += String.fromCodePoint(e);
    }
  }
  _stateAfterDoctypePublicIdentifier(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED: {
        this.state = r.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS;
        break;
      }
      case s.GREATER_THAN_SIGN: {
        ((this.state = r.DATA), this.emitCurrentDoctype(currentToken));
        break;
      }
      case s.QUOTATION_MARK: {
        (this._err(o.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers),
          (currentToken.systemId = ""),
          (this.state = r.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED));
        break;
      }
      case s.APOSTROPHE: {
        (this._err(o.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers),
          (currentToken.systemId = ""),
          (this.state = r.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInDoctype),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          this._emitEOFToken());
        break;
      }
      default:
        (this._err(o.missingQuoteBeforeDoctypeSystemIdentifier),
          (currentToken.forceQuirks = !0),
          (this.state = r.BOGUS_DOCTYPE),
          this._stateBogusDoctype(e));
    }
  }
  _stateBetweenDoctypePublicAndSystemIdentifiers(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED:
        break;
      case s.GREATER_THAN_SIGN: {
        (this.emitCurrentDoctype(currentToken), (this.state = r.DATA));
        break;
      }
      case s.QUOTATION_MARK: {
        ((currentToken.systemId = ""), (this.state = r.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED));
        break;
      }
      case s.APOSTROPHE: {
        ((currentToken.systemId = ""), (this.state = r.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInDoctype),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          this._emitEOFToken());
        break;
      }
      default:
        (this._err(o.missingQuoteBeforeDoctypeSystemIdentifier),
          (currentToken.forceQuirks = !0),
          (this.state = r.BOGUS_DOCTYPE),
          this._stateBogusDoctype(e));
    }
  }
  _stateAfterDoctypeSystemKeyword(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED: {
        this.state = r.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER;
        break;
      }
      case s.QUOTATION_MARK: {
        (this._err(o.missingWhitespaceAfterDoctypeSystemKeyword),
          (currentToken.systemId = ""),
          (this.state = r.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED));
        break;
      }
      case s.APOSTROPHE: {
        (this._err(o.missingWhitespaceAfterDoctypeSystemKeyword),
          (currentToken.systemId = ""),
          (this.state = r.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED));
        break;
      }
      case s.GREATER_THAN_SIGN: {
        (this._err(o.missingDoctypeSystemIdentifier),
          (currentToken.forceQuirks = !0),
          (this.state = r.DATA),
          this.emitCurrentDoctype(currentToken));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInDoctype),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          this._emitEOFToken());
        break;
      }
      default:
        (this._err(o.missingQuoteBeforeDoctypeSystemIdentifier),
          (currentToken.forceQuirks = !0),
          (this.state = r.BOGUS_DOCTYPE),
          this._stateBogusDoctype(e));
    }
  }
  _stateBeforeDoctypeSystemIdentifier(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED:
        break;
      case s.QUOTATION_MARK: {
        ((currentToken.systemId = ""), (this.state = r.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED));
        break;
      }
      case s.APOSTROPHE: {
        ((currentToken.systemId = ""), (this.state = r.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED));
        break;
      }
      case s.GREATER_THAN_SIGN: {
        (this._err(o.missingDoctypeSystemIdentifier),
          (currentToken.forceQuirks = !0),
          (this.state = r.DATA),
          this.emitCurrentDoctype(currentToken));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInDoctype),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          this._emitEOFToken());
        break;
      }
      default:
        (this._err(o.missingQuoteBeforeDoctypeSystemIdentifier),
          (currentToken.forceQuirks = !0),
          (this.state = r.BOGUS_DOCTYPE),
          this._stateBogusDoctype(e));
    }
  }
  _stateDoctypeSystemIdentifierDoubleQuoted(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.QUOTATION_MARK: {
        this.state = r.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), (currentToken.systemId += m));
        break;
      }
      case s.GREATER_THAN_SIGN: {
        (this._err(o.abruptDoctypeSystemIdentifier),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          (this.state = r.DATA));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInDoctype),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          this._emitEOFToken());
        break;
      }
      default:
        currentToken.systemId += String.fromCodePoint(e);
    }
  }
  _stateDoctypeSystemIdentifierSingleQuoted(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.APOSTROPHE: {
        this.state = r.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
        break;
      }
      case s.NULL: {
        (this._err(o.unexpectedNullCharacter), (currentToken.systemId += m));
        break;
      }
      case s.GREATER_THAN_SIGN: {
        (this._err(o.abruptDoctypeSystemIdentifier),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          (this.state = r.DATA));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInDoctype),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          this._emitEOFToken());
        break;
      }
      default:
        currentToken.systemId += String.fromCodePoint(e);
    }
  }
  _stateAfterDoctypeSystemIdentifier(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.SPACE:
      case s.LINE_FEED:
      case s.TABULATION:
      case s.FORM_FEED:
        break;
      case s.GREATER_THAN_SIGN: {
        (this.emitCurrentDoctype(currentToken), (this.state = r.DATA));
        break;
      }
      case s.EOF: {
        (this._err(o.eofInDoctype),
          (currentToken.forceQuirks = !0),
          this.emitCurrentDoctype(currentToken),
          this._emitEOFToken());
        break;
      }
      default:
        (this._err(o.unexpectedCharacterAfterDoctypeSystemIdentifier),
          (this.state = r.BOGUS_DOCTYPE),
          this._stateBogusDoctype(e));
    }
  }
  _stateBogusDoctype(e) {
    let currentToken = this.currentToken;
    switch (e) {
      case s.GREATER_THAN_SIGN: {
        (this.emitCurrentDoctype(currentToken), (this.state = r.DATA));
        break;
      }
      case s.NULL: {
        this._err(o.unexpectedNullCharacter);
        break;
      }
      case s.EOF: {
        (this.emitCurrentDoctype(currentToken), this._emitEOFToken());
        break;
      }
      default:
    }
  }
  _stateCdataSection(e) {
    switch (e) {
      case s.RIGHT_SQUARE_BRACKET: {
        this.state = r.CDATA_SECTION_BRACKET;
        break;
      }
      case s.EOF: {
        (this._err(o.eofInCdata), this._emitEOFToken());
        break;
      }
      default:
        this._emitCodePoint(e);
    }
  }
  _stateCdataSectionBracket(e) {
    if (e === s.RIGHT_SQUARE_BRACKET) this.state = r.CDATA_SECTION_END;
    else (this._emitChars("]"), (this.state = r.CDATA_SECTION), this._stateCdataSection(e));
  }
  _stateCdataSectionEnd(e) {
    switch (e) {
      case s.GREATER_THAN_SIGN: {
        this.state = r.DATA;
        break;
      }
      case s.RIGHT_SQUARE_BRACKET: {
        this._emitChars("]");
        break;
      }
      default:
        (this._emitChars("]]"), (this.state = r.CDATA_SECTION), this._stateCdataSection(e));
    }
  }
  _stateCharacterReference() {
    let write = this.entityDecoder.write(this.preprocessor.html, this.preprocessor.pos);
    if (write < 0)
      if (this.preprocessor.lastChunkWritten) write = this.entityDecoder.end();
      else {
        ((this.active = !1),
          (this.preprocessor.pos = this.preprocessor.html.length - 1),
          (this.consumedAfterSnapshot = 0),
          (this.preprocessor.endOfChunkHit = !0));
        return;
      }
    if (write === 0)
      ((this.preprocessor.pos = this.entityStartPos),
        this._flushCodePointConsumedAsCharacterReference(s.AMPERSAND),
        (this.state =
          !this._isCharacterReferenceInAttribute() && Pe(this.preprocessor.peek(1))
            ? r.AMBIGUOUS_AMPERSAND
            : this.returnState));
    else this.state = this.returnState;
  }
  _stateAmbiguousAmpersand(e) {
    if (Pe(e)) this._flushCodePointConsumedAsCharacterReference(e);
    else {
      if (e === s.SEMICOLON) this._err(o.unknownNamedCharacterReference);
      ((this.state = this.returnState), this._callState(e));
    }
  }
}

export { Tokenizer, TokenizerMode };

/**
 * parse5/dist/tokenizer/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (13)
 * attribution: esm-layout 4, esm-fingerprint 9
 */
import {
  CODE_POINTS,
  isSurrogate,
  isUndefinedCodePoint,
  isControlCodePoint,
  REPLACEMENT_CHARACTER,
  SEQUENCES,
} from "../common/unicode.js";
import { errors } from "../../lib/common/error-codes.js";
import { Preprocessor } from "./preprocessor.js";
import { EntityDecoder, DecodingMode } from "../../../entities/lib/esm/decode.js";
import { uint16Array } from "../../../entities/lib/esm/generated/decode-data-xml.js";
import { TokenType, getTokenAttr } from "../common/token.js";
import { TAG_ID, getTagID } from "../common/html.js";

//@ chunk-6ja29j2n.js:71013-71019 esm-layout
var State;
//@ chunk-6ja29j2n.js:71019-75235 esm-fingerprint
(function (State) {
  State[(State.DATA = 0)] = "DATA";
  State[(State.RCDATA = 1)] = "RCDATA";
  State[(State.RAWTEXT = 2)] = "RAWTEXT";
  State[(State.SCRIPT_DATA = 3)] = "SCRIPT_DATA";
  State[(State.PLAINTEXT = 4)] = "PLAINTEXT";
  State[(State.TAG_OPEN = 5)] = "TAG_OPEN";
  State[(State.END_TAG_OPEN = 6)] = "END_TAG_OPEN";
  State[(State.TAG_NAME = 7)] = "TAG_NAME";
  State[(State.RCDATA_LESS_THAN_SIGN = 8)] = "RCDATA_LESS_THAN_SIGN";
  State[(State.RCDATA_END_TAG_OPEN = 9)] = "RCDATA_END_TAG_OPEN";
  State[(State.RCDATA_END_TAG_NAME = 10)] = "RCDATA_END_TAG_NAME";
  State[(State.RAWTEXT_LESS_THAN_SIGN = 11)] = "RAWTEXT_LESS_THAN_SIGN";
  State[(State.RAWTEXT_END_TAG_OPEN = 12)] = "RAWTEXT_END_TAG_OPEN";
  State[(State.RAWTEXT_END_TAG_NAME = 13)] = "RAWTEXT_END_TAG_NAME";
  State[(State.SCRIPT_DATA_LESS_THAN_SIGN = 14)] = "SCRIPT_DATA_LESS_THAN_SIGN";
  State[(State.SCRIPT_DATA_END_TAG_OPEN = 15)] = "SCRIPT_DATA_END_TAG_OPEN";
  State[(State.SCRIPT_DATA_END_TAG_NAME = 16)] = "SCRIPT_DATA_END_TAG_NAME";
  State[(State.SCRIPT_DATA_ESCAPE_START = 17)] = "SCRIPT_DATA_ESCAPE_START";
  State[(State.SCRIPT_DATA_ESCAPE_START_DASH = 18)] = "SCRIPT_DATA_ESCAPE_START_DASH";
  State[(State.SCRIPT_DATA_ESCAPED = 19)] = "SCRIPT_DATA_ESCAPED";
  State[(State.SCRIPT_DATA_ESCAPED_DASH = 20)] = "SCRIPT_DATA_ESCAPED_DASH";
  State[(State.SCRIPT_DATA_ESCAPED_DASH_DASH = 21)] = "SCRIPT_DATA_ESCAPED_DASH_DASH";
  State[(State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN = 22)] = "SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN";
  State[(State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN = 23)] = "SCRIPT_DATA_ESCAPED_END_TAG_OPEN";
  State[(State.SCRIPT_DATA_ESCAPED_END_TAG_NAME = 24)] = "SCRIPT_DATA_ESCAPED_END_TAG_NAME";
  State[(State.SCRIPT_DATA_DOUBLE_ESCAPE_START = 25)] = "SCRIPT_DATA_DOUBLE_ESCAPE_START";
  State[(State.SCRIPT_DATA_DOUBLE_ESCAPED = 26)] = "SCRIPT_DATA_DOUBLE_ESCAPED";
  State[(State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH = 27)] = "SCRIPT_DATA_DOUBLE_ESCAPED_DASH";
  State[(State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH = 28)] = "SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH";
  State[(State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN = 29)] = "SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN";
  State[(State.SCRIPT_DATA_DOUBLE_ESCAPE_END = 30)] = "SCRIPT_DATA_DOUBLE_ESCAPE_END";
  State[(State.BEFORE_ATTRIBUTE_NAME = 31)] = "BEFORE_ATTRIBUTE_NAME";
  State[(State.ATTRIBUTE_NAME = 32)] = "ATTRIBUTE_NAME";
  State[(State.AFTER_ATTRIBUTE_NAME = 33)] = "AFTER_ATTRIBUTE_NAME";
  State[(State.BEFORE_ATTRIBUTE_VALUE = 34)] = "BEFORE_ATTRIBUTE_VALUE";
  State[(State.ATTRIBUTE_VALUE_DOUBLE_QUOTED = 35)] = "ATTRIBUTE_VALUE_DOUBLE_QUOTED";
  State[(State.ATTRIBUTE_VALUE_SINGLE_QUOTED = 36)] = "ATTRIBUTE_VALUE_SINGLE_QUOTED";
  State[(State.ATTRIBUTE_VALUE_UNQUOTED = 37)] = "ATTRIBUTE_VALUE_UNQUOTED";
  State[(State.AFTER_ATTRIBUTE_VALUE_QUOTED = 38)] = "AFTER_ATTRIBUTE_VALUE_QUOTED";
  State[(State.SELF_CLOSING_START_TAG = 39)] = "SELF_CLOSING_START_TAG";
  State[(State.BOGUS_COMMENT = 40)] = "BOGUS_COMMENT";
  State[(State.MARKUP_DECLARATION_OPEN = 41)] = "MARKUP_DECLARATION_OPEN";
  State[(State.COMMENT_START = 42)] = "COMMENT_START";
  State[(State.COMMENT_START_DASH = 43)] = "COMMENT_START_DASH";
  State[(State.COMMENT = 44)] = "COMMENT";
  State[(State.COMMENT_LESS_THAN_SIGN = 45)] = "COMMENT_LESS_THAN_SIGN";
  State[(State.COMMENT_LESS_THAN_SIGN_BANG = 46)] = "COMMENT_LESS_THAN_SIGN_BANG";
  State[(State.COMMENT_LESS_THAN_SIGN_BANG_DASH = 47)] = "COMMENT_LESS_THAN_SIGN_BANG_DASH";
  State[(State.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH = 48)] = "COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH";
  State[(State.COMMENT_END_DASH = 49)] = "COMMENT_END_DASH";
  State[(State.COMMENT_END = 50)] = "COMMENT_END";
  State[(State.COMMENT_END_BANG = 51)] = "COMMENT_END_BANG";
  State[(State.DOCTYPE = 52)] = "DOCTYPE";
  State[(State.BEFORE_DOCTYPE_NAME = 53)] = "BEFORE_DOCTYPE_NAME";
  State[(State.DOCTYPE_NAME = 54)] = "DOCTYPE_NAME";
  State[(State.AFTER_DOCTYPE_NAME = 55)] = "AFTER_DOCTYPE_NAME";
  State[(State.AFTER_DOCTYPE_PUBLIC_KEYWORD = 56)] = "AFTER_DOCTYPE_PUBLIC_KEYWORD";
  State[(State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER = 57)] = "BEFORE_DOCTYPE_PUBLIC_IDENTIFIER";
  State[(State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED = 58)] = "DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED";
  State[(State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED = 59)] = "DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED";
  State[(State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER = 60)] = "AFTER_DOCTYPE_PUBLIC_IDENTIFIER";
  State[(State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS = 61)] =
    "BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS";
  State[(State.AFTER_DOCTYPE_SYSTEM_KEYWORD = 62)] = "AFTER_DOCTYPE_SYSTEM_KEYWORD";
  State[(State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER = 63)] = "BEFORE_DOCTYPE_SYSTEM_IDENTIFIER";
  State[(State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED = 64)] = "DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED";
  State[(State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED = 65)] = "DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED";
  State[(State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER = 66)] = "AFTER_DOCTYPE_SYSTEM_IDENTIFIER";
  State[(State.BOGUS_DOCTYPE = 67)] = "BOGUS_DOCTYPE";
  State[(State.CDATA_SECTION = 68)] = "CDATA_SECTION";
  State[(State.CDATA_SECTION_BRACKET = 69)] = "CDATA_SECTION_BRACKET";
  State[(State.CDATA_SECTION_END = 70)] = "CDATA_SECTION_END";
  State[(State.CHARACTER_REFERENCE = 71)] = "CHARACTER_REFERENCE";
  State[(State.AMBIGUOUS_AMPERSAND = 72)] = "AMBIGUOUS_AMPERSAND";
})(State || (State = {}));
//@ chunk-6ja29j2n.js:75235-75368 esm-fingerprint
var TokenizerMode = {
  DATA: State.DATA,
  RCDATA: State.RCDATA,
  RAWTEXT: State.RAWTEXT,
  SCRIPT_DATA: State.SCRIPT_DATA,
  PLAINTEXT: State.PLAINTEXT,
  CDATA_SECTION: State.CDATA_SECTION,
};
//@ chunk-6ja29j2n.js:75368-75417 esm-fingerprint
function isAsciiDigit(cp) {
  return cp >= CODE_POINTS.DIGIT_0 && cp <= CODE_POINTS.DIGIT_9;
}
//@ chunk-6ja29j2n.js:75417-75481 esm-fingerprint
function isAsciiUpper(cp) {
  return cp >= CODE_POINTS.LATIN_CAPITAL_A && cp <= CODE_POINTS.LATIN_CAPITAL_Z;
}
//@ chunk-6ja29j2n.js:75481-75542 esm-fingerprint
function isAsciiLower(cp) {
  return cp >= CODE_POINTS.LATIN_SMALL_A && cp <= CODE_POINTS.LATIN_SMALL_Z;
}
//@ chunk-6ja29j2n.js:75542-75575 esm-layout
function isAsciiLetter(cp) {
  return isAsciiLower(cp) || isAsciiUpper(cp);
}
//@ chunk-6ja29j2n.js:75575-75609 esm-layout
function isAsciiAlphaNumeric_2(cp) {
  return isAsciiLetter(cp) || isAsciiDigit(cp);
}
//@ chunk-6ja29j2n.js:75609-75635 esm-layout
function toAsciiLower(cp) {
  return cp + 32;
}
//@ chunk-6ja29j2n.js:75635-75721 esm-fingerprint
function isWhitespace(cp) {
  return (
    cp === CODE_POINTS.SPACE ||
    cp === CODE_POINTS.LINE_FEED ||
    cp === CODE_POINTS.TABULATION ||
    cp === CODE_POINTS.FORM_FEED
  );
}
//@ chunk-6ja29j2n.js:75721-75789 esm-fingerprint
function isScriptDataDoubleEscapeSequenceEnd(cp) {
  return isWhitespace(cp) || cp === CODE_POINTS.SOLIDUS || cp === CODE_POINTS.GREATER_THAN_SIGN;
}
//@ chunk-6ja29j2n.js:75789-76101 esm-fingerprint
function getErrorForNumericCharacterReference(code) {
  if (code === CODE_POINTS.NULL) return errors.nullCharacterReference;
  else if (code > 1114111) return errors.characterReferenceOutsideUnicodeRange;
  else if (isSurrogate(code)) return errors.surrogateCharacterReference;
  else if (isUndefinedCodePoint(code)) return errors.noncharacterCharacterReference;
  else if (isControlCodePoint(code) || code === CODE_POINTS.CARRIAGE_RETURN)
    return errors.controlCharacterReference;
  return null;
}
//@ chunk-6ja29j2n.js:76101-117020 esm-fingerprint
class Tokenizer {
  constructor(options, handler) {
    this.options = options;
    this.handler = handler;
    this.paused = false;
    this.inLoop = false;
    this.inForeignNode = false;
    this.lastStartTagName = "";
    this.active = false;
    this.state = State.DATA;
    this.returnState = State.DATA;
    this.entityStartPos = 0;
    this.consumedAfterSnapshot = -1;
    this.currentCharacterToken = null;
    this.currentToken = null;
    this.currentAttr = {
      name: "",
      value: "",
    };
    this.preprocessor = new Preprocessor(handler);
    this.currentLocation = this.getCurrentLocation(-1);
    this.entityDecoder = new EntityDecoder(
      uint16Array,
      (cp, consumed) => {
        this.preprocessor.pos = this.entityStartPos + consumed - 1;
        this._flushCodePointConsumedAsCharacterReference(cp);
      },
      handler.onParseError
        ? {
            missingSemicolonAfterCharacterReference: () => {
              this._err(errors.missingSemicolonAfterCharacterReference, 1);
            },
            absenceOfDigitsInNumericCharacterReference: (consumed) => {
              this._err(
                errors.absenceOfDigitsInNumericCharacterReference,
                this.entityStartPos - this.preprocessor.pos + consumed,
              );
            },
            validateNumericCharacterReference: (code) => {
              let error = getErrorForNumericCharacterReference(code);
              if (error) this._err(error, 1);
            },
          }
        : undefined,
    );
  }
  _err(code, cpOffset = 0) {
    var _a;
    var _b;
    if (!((_b = (_a = this.handler).onParseError) === null || _b === undefined))
      _b.call(_a, this.preprocessor.getError(code, cpOffset));
  }
  getCurrentLocation(offset) {
    if (!this.options.sourceCodeLocationInfo) return null;
    return {
      startLine: this.preprocessor.line,
      startCol: this.preprocessor.col - offset,
      startOffset: this.preprocessor.offset - offset,
      endLine: -1,
      endCol: -1,
      endOffset: -1,
    };
  }
  _runParsingLoop() {
    if (this.inLoop) return;
    this.inLoop = true;
    while (this.active && !this.paused) {
      this.consumedAfterSnapshot = 0;
      let cp = this._consume();
      if (!this._ensureHibernation()) this._callState(cp);
    }
    this.inLoop = false;
  }
  pause() {
    this.paused = true;
  }
  resume(writeCallback) {
    if (!this.paused) throw Error("Parser was already resumed");
    this.paused = false;
    if (this.inLoop) return;
    this._runParsingLoop();
    if (!this.paused) {
      if (!(writeCallback === null || writeCallback === undefined)) writeCallback();
    }
  }
  write(chunk, isLastChunk, writeCallback) {
    this.active = true;
    this.preprocessor.write(chunk, isLastChunk);
    this._runParsingLoop();
    if (!this.paused) {
      if (!(writeCallback === null || writeCallback === undefined)) writeCallback();
    }
  }
  insertHtmlAtCurrentPos(chunk) {
    this.active = true;
    this.preprocessor.insertHtmlAtCurrentPos(chunk);
    this._runParsingLoop();
  }
  _ensureHibernation() {
    if (this.preprocessor.endOfChunkHit) {
      this.preprocessor.retreat(this.consumedAfterSnapshot);
      this.consumedAfterSnapshot = 0;
      this.active = false;
      return true;
    }
    return false;
  }
  _consume() {
    this.consumedAfterSnapshot++;
    return this.preprocessor.advance();
  }
  _advanceBy(count) {
    this.consumedAfterSnapshot += count;
    for (let i = 0; i < count; i++) this.preprocessor.advance();
  }
  _consumeSequenceIfMatch(pattern, caseSensitive) {
    if (this.preprocessor.startsWith(pattern, caseSensitive)) {
      this._advanceBy(pattern.length - 1);
      return true;
    }
    return false;
  }
  _createStartTagToken() {
    this.currentToken = {
      type: TokenType.START_TAG,
      tagName: "",
      tagID: TAG_ID.UNKNOWN,
      selfClosing: false,
      ackSelfClosing: false,
      attrs: [],
      location: this.getCurrentLocation(1),
    };
  }
  _createEndTagToken() {
    this.currentToken = {
      type: TokenType.END_TAG,
      tagName: "",
      tagID: TAG_ID.UNKNOWN,
      selfClosing: false,
      ackSelfClosing: false,
      attrs: [],
      location: this.getCurrentLocation(2),
    };
  }
  _createCommentToken(offset) {
    this.currentToken = {
      type: TokenType.COMMENT,
      data: "",
      location: this.getCurrentLocation(offset),
    };
  }
  _createDoctypeToken(initialName) {
    this.currentToken = {
      type: TokenType.DOCTYPE,
      name: initialName,
      forceQuirks: false,
      publicId: null,
      systemId: null,
      location: this.currentLocation,
    };
  }
  _createCharacterToken(type, chars) {
    this.currentCharacterToken = {
      type,
      chars,
      location: this.currentLocation,
    };
  }
  _createAttr(attrNameFirstCh) {
    this.currentAttr = {
      name: attrNameFirstCh,
      value: "",
    };
    this.currentLocation = this.getCurrentLocation(0);
  }
  _leaveAttrName() {
    var _a;
    var _b;
    let token = this.currentToken;
    if (getTokenAttr(token, this.currentAttr.name) === null) {
      token.attrs.push(this.currentAttr);
      if (token.location && this.currentLocation) {
        let attrLocations =
          (_a = (_b = token.location).attrs) !== null && _a !== undefined
            ? _a
            : (_b.attrs = Object.create(null));
        attrLocations[this.currentAttr.name] = this.currentLocation;
        this._leaveAttrValue();
      }
    } else this._err(errors.duplicateAttribute);
  }
  _leaveAttrValue() {
    if (this.currentLocation) {
      this.currentLocation.endLine = this.preprocessor.line;
      this.currentLocation.endCol = this.preprocessor.col;
      this.currentLocation.endOffset = this.preprocessor.offset;
    }
  }
  prepareToken(ct) {
    this._emitCurrentCharacterToken(ct.location);
    this.currentToken = null;
    if (ct.location) {
      ct.location.endLine = this.preprocessor.line;
      ct.location.endCol = this.preprocessor.col + 1;
      ct.location.endOffset = this.preprocessor.offset + 1;
    }
    this.currentLocation = this.getCurrentLocation(-1);
  }
  emitCurrentTagToken() {
    let ct = this.currentToken;
    this.prepareToken(ct);
    ct.tagID = getTagID(ct.tagName);
    if (ct.type === TokenType.START_TAG) {
      this.lastStartTagName = ct.tagName;
      this.handler.onStartTag(ct);
    } else {
      if (ct.attrs.length > 0) this._err(errors.endTagWithAttributes);
      if (ct.selfClosing) this._err(errors.endTagWithTrailingSolidus);
      this.handler.onEndTag(ct);
    }
    this.preprocessor.dropParsedChunk();
  }
  emitCurrentComment(ct) {
    this.prepareToken(ct);
    this.handler.onComment(ct);
    this.preprocessor.dropParsedChunk();
  }
  emitCurrentDoctype(ct) {
    this.prepareToken(ct);
    this.handler.onDoctype(ct);
    this.preprocessor.dropParsedChunk();
  }
  _emitCurrentCharacterToken(nextLocation) {
    if (this.currentCharacterToken) {
      if (nextLocation && this.currentCharacterToken.location) {
        this.currentCharacterToken.location.endLine = nextLocation.startLine;
        this.currentCharacterToken.location.endCol = nextLocation.startCol;
        this.currentCharacterToken.location.endOffset = nextLocation.startOffset;
      }
      switch (this.currentCharacterToken.type) {
        case TokenType.CHARACTER: {
          this.handler.onCharacter(this.currentCharacterToken);
          break;
        }
        case TokenType.NULL_CHARACTER: {
          this.handler.onNullCharacter(this.currentCharacterToken);
          break;
        }
        case TokenType.WHITESPACE_CHARACTER: {
          this.handler.onWhitespaceCharacter(this.currentCharacterToken);
          break;
        }
      }
      this.currentCharacterToken = null;
    }
  }
  _emitEOFToken() {
    let location = this.getCurrentLocation(0);
    if (location) {
      location.endLine = location.startLine;
      location.endCol = location.startCol;
      location.endOffset = location.startOffset;
    }
    this._emitCurrentCharacterToken(location);
    this.handler.onEof({
      type: TokenType.EOF,
      location,
    });
    this.active = false;
  }
  _appendCharToCurrentCharacterToken(type, ch) {
    if (this.currentCharacterToken)
      if (this.currentCharacterToken.type === type) {
        this.currentCharacterToken.chars += ch;
        return;
      } else {
        this.currentLocation = this.getCurrentLocation(0);
        this._emitCurrentCharacterToken(this.currentLocation);
        this.preprocessor.dropParsedChunk();
      }
    this._createCharacterToken(type, ch);
  }
  _emitCodePoint(cp) {
    let type = isWhitespace(cp)
      ? TokenType.WHITESPACE_CHARACTER
      : cp === CODE_POINTS.NULL
        ? TokenType.NULL_CHARACTER
        : TokenType.CHARACTER;
    this._appendCharToCurrentCharacterToken(type, String.fromCodePoint(cp));
  }
  _emitChars(ch) {
    this._appendCharToCurrentCharacterToken(TokenType.CHARACTER, ch);
  }
  _startCharacterReference() {
    this.returnState = this.state;
    this.state = State.CHARACTER_REFERENCE;
    this.entityStartPos = this.preprocessor.pos;
    this.entityDecoder.startEntity(
      this._isCharacterReferenceInAttribute() ? DecodingMode.Attribute : DecodingMode.Legacy,
    );
  }
  _isCharacterReferenceInAttribute() {
    return (
      this.returnState === State.ATTRIBUTE_VALUE_DOUBLE_QUOTED ||
      this.returnState === State.ATTRIBUTE_VALUE_SINGLE_QUOTED ||
      this.returnState === State.ATTRIBUTE_VALUE_UNQUOTED
    );
  }
  _flushCodePointConsumedAsCharacterReference(cp) {
    if (this._isCharacterReferenceInAttribute()) this.currentAttr.value += String.fromCodePoint(cp);
    else this._emitCodePoint(cp);
  }
  _callState(cp) {
    switch (this.state) {
      case State.DATA: {
        this._stateData(cp);
        break;
      }
      case State.RCDATA: {
        this._stateRcdata(cp);
        break;
      }
      case State.RAWTEXT: {
        this._stateRawtext(cp);
        break;
      }
      case State.SCRIPT_DATA: {
        this._stateScriptData(cp);
        break;
      }
      case State.PLAINTEXT: {
        this._statePlaintext(cp);
        break;
      }
      case State.TAG_OPEN: {
        this._stateTagOpen(cp);
        break;
      }
      case State.END_TAG_OPEN: {
        this._stateEndTagOpen(cp);
        break;
      }
      case State.TAG_NAME: {
        this._stateTagName(cp);
        break;
      }
      case State.RCDATA_LESS_THAN_SIGN: {
        this._stateRcdataLessThanSign(cp);
        break;
      }
      case State.RCDATA_END_TAG_OPEN: {
        this._stateRcdataEndTagOpen(cp);
        break;
      }
      case State.RCDATA_END_TAG_NAME: {
        this._stateRcdataEndTagName(cp);
        break;
      }
      case State.RAWTEXT_LESS_THAN_SIGN: {
        this._stateRawtextLessThanSign(cp);
        break;
      }
      case State.RAWTEXT_END_TAG_OPEN: {
        this._stateRawtextEndTagOpen(cp);
        break;
      }
      case State.RAWTEXT_END_TAG_NAME: {
        this._stateRawtextEndTagName(cp);
        break;
      }
      case State.SCRIPT_DATA_LESS_THAN_SIGN: {
        this._stateScriptDataLessThanSign(cp);
        break;
      }
      case State.SCRIPT_DATA_END_TAG_OPEN: {
        this._stateScriptDataEndTagOpen(cp);
        break;
      }
      case State.SCRIPT_DATA_END_TAG_NAME: {
        this._stateScriptDataEndTagName(cp);
        break;
      }
      case State.SCRIPT_DATA_ESCAPE_START: {
        this._stateScriptDataEscapeStart(cp);
        break;
      }
      case State.SCRIPT_DATA_ESCAPE_START_DASH: {
        this._stateScriptDataEscapeStartDash(cp);
        break;
      }
      case State.SCRIPT_DATA_ESCAPED: {
        this._stateScriptDataEscaped(cp);
        break;
      }
      case State.SCRIPT_DATA_ESCAPED_DASH: {
        this._stateScriptDataEscapedDash(cp);
        break;
      }
      case State.SCRIPT_DATA_ESCAPED_DASH_DASH: {
        this._stateScriptDataEscapedDashDash(cp);
        break;
      }
      case State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN: {
        this._stateScriptDataEscapedLessThanSign(cp);
        break;
      }
      case State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN: {
        this._stateScriptDataEscapedEndTagOpen(cp);
        break;
      }
      case State.SCRIPT_DATA_ESCAPED_END_TAG_NAME: {
        this._stateScriptDataEscapedEndTagName(cp);
        break;
      }
      case State.SCRIPT_DATA_DOUBLE_ESCAPE_START: {
        this._stateScriptDataDoubleEscapeStart(cp);
        break;
      }
      case State.SCRIPT_DATA_DOUBLE_ESCAPED: {
        this._stateScriptDataDoubleEscaped(cp);
        break;
      }
      case State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH: {
        this._stateScriptDataDoubleEscapedDash(cp);
        break;
      }
      case State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH: {
        this._stateScriptDataDoubleEscapedDashDash(cp);
        break;
      }
      case State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN: {
        this._stateScriptDataDoubleEscapedLessThanSign(cp);
        break;
      }
      case State.SCRIPT_DATA_DOUBLE_ESCAPE_END: {
        this._stateScriptDataDoubleEscapeEnd(cp);
        break;
      }
      case State.BEFORE_ATTRIBUTE_NAME: {
        this._stateBeforeAttributeName(cp);
        break;
      }
      case State.ATTRIBUTE_NAME: {
        this._stateAttributeName(cp);
        break;
      }
      case State.AFTER_ATTRIBUTE_NAME: {
        this._stateAfterAttributeName(cp);
        break;
      }
      case State.BEFORE_ATTRIBUTE_VALUE: {
        this._stateBeforeAttributeValue(cp);
        break;
      }
      case State.ATTRIBUTE_VALUE_DOUBLE_QUOTED: {
        this._stateAttributeValueDoubleQuoted(cp);
        break;
      }
      case State.ATTRIBUTE_VALUE_SINGLE_QUOTED: {
        this._stateAttributeValueSingleQuoted(cp);
        break;
      }
      case State.ATTRIBUTE_VALUE_UNQUOTED: {
        this._stateAttributeValueUnquoted(cp);
        break;
      }
      case State.AFTER_ATTRIBUTE_VALUE_QUOTED: {
        this._stateAfterAttributeValueQuoted(cp);
        break;
      }
      case State.SELF_CLOSING_START_TAG: {
        this._stateSelfClosingStartTag(cp);
        break;
      }
      case State.BOGUS_COMMENT: {
        this._stateBogusComment(cp);
        break;
      }
      case State.MARKUP_DECLARATION_OPEN: {
        this._stateMarkupDeclarationOpen(cp);
        break;
      }
      case State.COMMENT_START: {
        this._stateCommentStart(cp);
        break;
      }
      case State.COMMENT_START_DASH: {
        this._stateCommentStartDash(cp);
        break;
      }
      case State.COMMENT: {
        this._stateComment(cp);
        break;
      }
      case State.COMMENT_LESS_THAN_SIGN: {
        this._stateCommentLessThanSign(cp);
        break;
      }
      case State.COMMENT_LESS_THAN_SIGN_BANG: {
        this._stateCommentLessThanSignBang(cp);
        break;
      }
      case State.COMMENT_LESS_THAN_SIGN_BANG_DASH: {
        this._stateCommentLessThanSignBangDash(cp);
        break;
      }
      case State.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH: {
        this._stateCommentLessThanSignBangDashDash(cp);
        break;
      }
      case State.COMMENT_END_DASH: {
        this._stateCommentEndDash(cp);
        break;
      }
      case State.COMMENT_END: {
        this._stateCommentEnd(cp);
        break;
      }
      case State.COMMENT_END_BANG: {
        this._stateCommentEndBang(cp);
        break;
      }
      case State.DOCTYPE: {
        this._stateDoctype(cp);
        break;
      }
      case State.BEFORE_DOCTYPE_NAME: {
        this._stateBeforeDoctypeName(cp);
        break;
      }
      case State.DOCTYPE_NAME: {
        this._stateDoctypeName(cp);
        break;
      }
      case State.AFTER_DOCTYPE_NAME: {
        this._stateAfterDoctypeName(cp);
        break;
      }
      case State.AFTER_DOCTYPE_PUBLIC_KEYWORD: {
        this._stateAfterDoctypePublicKeyword(cp);
        break;
      }
      case State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER: {
        this._stateBeforeDoctypePublicIdentifier(cp);
        break;
      }
      case State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED: {
        this._stateDoctypePublicIdentifierDoubleQuoted(cp);
        break;
      }
      case State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED: {
        this._stateDoctypePublicIdentifierSingleQuoted(cp);
        break;
      }
      case State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER: {
        this._stateAfterDoctypePublicIdentifier(cp);
        break;
      }
      case State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS: {
        this._stateBetweenDoctypePublicAndSystemIdentifiers(cp);
        break;
      }
      case State.AFTER_DOCTYPE_SYSTEM_KEYWORD: {
        this._stateAfterDoctypeSystemKeyword(cp);
        break;
      }
      case State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER: {
        this._stateBeforeDoctypeSystemIdentifier(cp);
        break;
      }
      case State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED: {
        this._stateDoctypeSystemIdentifierDoubleQuoted(cp);
        break;
      }
      case State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED: {
        this._stateDoctypeSystemIdentifierSingleQuoted(cp);
        break;
      }
      case State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER: {
        this._stateAfterDoctypeSystemIdentifier(cp);
        break;
      }
      case State.BOGUS_DOCTYPE: {
        this._stateBogusDoctype(cp);
        break;
      }
      case State.CDATA_SECTION: {
        this._stateCdataSection(cp);
        break;
      }
      case State.CDATA_SECTION_BRACKET: {
        this._stateCdataSectionBracket(cp);
        break;
      }
      case State.CDATA_SECTION_END: {
        this._stateCdataSectionEnd(cp);
        break;
      }
      case State.CHARACTER_REFERENCE: {
        this._stateCharacterReference();
        break;
      }
      case State.AMBIGUOUS_AMPERSAND: {
        this._stateAmbiguousAmpersand(cp);
        break;
      }
      default:
        throw Error("Unknown state");
    }
  }
  _stateData(cp) {
    switch (cp) {
      case CODE_POINTS.LESS_THAN_SIGN: {
        this.state = State.TAG_OPEN;
        break;
      }
      case CODE_POINTS.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this._emitCodePoint(cp);
        break;
      }
      case CODE_POINTS.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(cp);
    }
  }
  _stateRcdata(cp) {
    switch (cp) {
      case CODE_POINTS.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case CODE_POINTS.LESS_THAN_SIGN: {
        this.state = State.RCDATA_LESS_THAN_SIGN;
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this._emitChars(REPLACEMENT_CHARACTER);
        break;
      }
      case CODE_POINTS.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(cp);
    }
  }
  _stateRawtext(cp) {
    switch (cp) {
      case CODE_POINTS.LESS_THAN_SIGN: {
        this.state = State.RAWTEXT_LESS_THAN_SIGN;
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this._emitChars(REPLACEMENT_CHARACTER);
        break;
      }
      case CODE_POINTS.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(cp);
    }
  }
  _stateScriptData(cp) {
    switch (cp) {
      case CODE_POINTS.LESS_THAN_SIGN: {
        this.state = State.SCRIPT_DATA_LESS_THAN_SIGN;
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this._emitChars(REPLACEMENT_CHARACTER);
        break;
      }
      case CODE_POINTS.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(cp);
    }
  }
  _statePlaintext(cp) {
    switch (cp) {
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this._emitChars(REPLACEMENT_CHARACTER);
        break;
      }
      case CODE_POINTS.EOF: {
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(cp);
    }
  }
  _stateTagOpen(cp) {
    if (isAsciiLetter(cp)) {
      this._createStartTagToken();
      this.state = State.TAG_NAME;
      this._stateTagName(cp);
    } else
      switch (cp) {
        case CODE_POINTS.EXCLAMATION_MARK: {
          this.state = State.MARKUP_DECLARATION_OPEN;
          break;
        }
        case CODE_POINTS.SOLIDUS: {
          this.state = State.END_TAG_OPEN;
          break;
        }
        case CODE_POINTS.QUESTION_MARK: {
          this._err(errors.unexpectedQuestionMarkInsteadOfTagName);
          this._createCommentToken(1);
          this.state = State.BOGUS_COMMENT;
          this._stateBogusComment(cp);
          break;
        }
        case CODE_POINTS.EOF: {
          this._err(errors.eofBeforeTagName);
          this._emitChars("<");
          this._emitEOFToken();
          break;
        }
        default:
          this._err(errors.invalidFirstCharacterOfTagName);
          this._emitChars("<");
          this.state = State.DATA;
          this._stateData(cp);
      }
  }
  _stateEndTagOpen(cp) {
    if (isAsciiLetter(cp)) {
      this._createEndTagToken();
      this.state = State.TAG_NAME;
      this._stateTagName(cp);
    } else
      switch (cp) {
        case CODE_POINTS.GREATER_THAN_SIGN: {
          this._err(errors.missingEndTagName);
          this.state = State.DATA;
          break;
        }
        case CODE_POINTS.EOF: {
          this._err(errors.eofBeforeTagName);
          this._emitChars("</");
          this._emitEOFToken();
          break;
        }
        default:
          this._err(errors.invalidFirstCharacterOfTagName);
          this._createCommentToken(2);
          this.state = State.BOGUS_COMMENT;
          this._stateBogusComment(cp);
      }
  }
  _stateTagName(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED: {
        this.state = State.BEFORE_ATTRIBUTE_NAME;
        break;
      }
      case CODE_POINTS.SOLIDUS: {
        this.state = State.SELF_CLOSING_START_TAG;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this.state = State.DATA;
        this.emitCurrentTagToken();
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        token.tagName += REPLACEMENT_CHARACTER;
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInTag);
        this._emitEOFToken();
        break;
      }
      default:
        token.tagName += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
    }
  }
  _stateRcdataLessThanSign(cp) {
    if (cp === CODE_POINTS.SOLIDUS) this.state = State.RCDATA_END_TAG_OPEN;
    else {
      this._emitChars("<");
      this.state = State.RCDATA;
      this._stateRcdata(cp);
    }
  }
  _stateRcdataEndTagOpen(cp) {
    if (isAsciiLetter(cp)) {
      this.state = State.RCDATA_END_TAG_NAME;
      this._stateRcdataEndTagName(cp);
    } else {
      this._emitChars("</");
      this.state = State.RCDATA;
      this._stateRcdata(cp);
    }
  }
  handleSpecialEndTag(_cp) {
    if (!this.preprocessor.startsWith(this.lastStartTagName, false)) return !this._ensureHibernation();
    this._createEndTagToken();
    let token = this.currentToken;
    switch (((token.tagName = this.lastStartTagName), this.preprocessor.peek(this.lastStartTagName.length))) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED:
        this._advanceBy(this.lastStartTagName.length);
        this.state = State.BEFORE_ATTRIBUTE_NAME;
        return false;
      case CODE_POINTS.SOLIDUS:
        this._advanceBy(this.lastStartTagName.length);
        this.state = State.SELF_CLOSING_START_TAG;
        return false;
      case CODE_POINTS.GREATER_THAN_SIGN:
        this._advanceBy(this.lastStartTagName.length);
        this.emitCurrentTagToken();
        this.state = State.DATA;
        return false;
      default:
        return !this._ensureHibernation();
    }
  }
  _stateRcdataEndTagName(cp) {
    if (this.handleSpecialEndTag(cp)) {
      this._emitChars("</");
      this.state = State.RCDATA;
      this._stateRcdata(cp);
    }
  }
  _stateRawtextLessThanSign(cp) {
    if (cp === CODE_POINTS.SOLIDUS) this.state = State.RAWTEXT_END_TAG_OPEN;
    else {
      this._emitChars("<");
      this.state = State.RAWTEXT;
      this._stateRawtext(cp);
    }
  }
  _stateRawtextEndTagOpen(cp) {
    if (isAsciiLetter(cp)) {
      this.state = State.RAWTEXT_END_TAG_NAME;
      this._stateRawtextEndTagName(cp);
    } else {
      this._emitChars("</");
      this.state = State.RAWTEXT;
      this._stateRawtext(cp);
    }
  }
  _stateRawtextEndTagName(cp) {
    if (this.handleSpecialEndTag(cp)) {
      this._emitChars("</");
      this.state = State.RAWTEXT;
      this._stateRawtext(cp);
    }
  }
  _stateScriptDataLessThanSign(cp) {
    switch (cp) {
      case CODE_POINTS.SOLIDUS: {
        this.state = State.SCRIPT_DATA_END_TAG_OPEN;
        break;
      }
      case CODE_POINTS.EXCLAMATION_MARK: {
        this.state = State.SCRIPT_DATA_ESCAPE_START;
        this._emitChars("<!");
        break;
      }
      default:
        this._emitChars("<");
        this.state = State.SCRIPT_DATA;
        this._stateScriptData(cp);
    }
  }
  _stateScriptDataEndTagOpen(cp) {
    if (isAsciiLetter(cp)) {
      this.state = State.SCRIPT_DATA_END_TAG_NAME;
      this._stateScriptDataEndTagName(cp);
    } else {
      this._emitChars("</");
      this.state = State.SCRIPT_DATA;
      this._stateScriptData(cp);
    }
  }
  _stateScriptDataEndTagName(cp) {
    if (this.handleSpecialEndTag(cp)) {
      this._emitChars("</");
      this.state = State.SCRIPT_DATA;
      this._stateScriptData(cp);
    }
  }
  _stateScriptDataEscapeStart(cp) {
    if (cp === CODE_POINTS.HYPHEN_MINUS) {
      this.state = State.SCRIPT_DATA_ESCAPE_START_DASH;
      this._emitChars("-");
    } else {
      this.state = State.SCRIPT_DATA;
      this._stateScriptData(cp);
    }
  }
  _stateScriptDataEscapeStartDash(cp) {
    if (cp === CODE_POINTS.HYPHEN_MINUS) {
      this.state = State.SCRIPT_DATA_ESCAPED_DASH_DASH;
      this._emitChars("-");
    } else {
      this.state = State.SCRIPT_DATA;
      this._stateScriptData(cp);
    }
  }
  _stateScriptDataEscaped(cp) {
    switch (cp) {
      case CODE_POINTS.HYPHEN_MINUS: {
        this.state = State.SCRIPT_DATA_ESCAPED_DASH;
        this._emitChars("-");
        break;
      }
      case CODE_POINTS.LESS_THAN_SIGN: {
        this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this._emitChars(REPLACEMENT_CHARACTER);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInScriptHtmlCommentLikeText);
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(cp);
    }
  }
  _stateScriptDataEscapedDash(cp) {
    switch (cp) {
      case CODE_POINTS.HYPHEN_MINUS: {
        this.state = State.SCRIPT_DATA_ESCAPED_DASH_DASH;
        this._emitChars("-");
        break;
      }
      case CODE_POINTS.LESS_THAN_SIGN: {
        this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this.state = State.SCRIPT_DATA_ESCAPED;
        this._emitChars(REPLACEMENT_CHARACTER);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInScriptHtmlCommentLikeText);
        this._emitEOFToken();
        break;
      }
      default:
        this.state = State.SCRIPT_DATA_ESCAPED;
        this._emitCodePoint(cp);
    }
  }
  _stateScriptDataEscapedDashDash(cp) {
    switch (cp) {
      case CODE_POINTS.HYPHEN_MINUS: {
        this._emitChars("-");
        break;
      }
      case CODE_POINTS.LESS_THAN_SIGN: {
        this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this.state = State.SCRIPT_DATA;
        this._emitChars(">");
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this.state = State.SCRIPT_DATA_ESCAPED;
        this._emitChars(REPLACEMENT_CHARACTER);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInScriptHtmlCommentLikeText);
        this._emitEOFToken();
        break;
      }
      default:
        this.state = State.SCRIPT_DATA_ESCAPED;
        this._emitCodePoint(cp);
    }
  }
  _stateScriptDataEscapedLessThanSign(cp) {
    if (cp === CODE_POINTS.SOLIDUS) this.state = State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN;
    else if (isAsciiLetter(cp)) {
      this._emitChars("<");
      this.state = State.SCRIPT_DATA_DOUBLE_ESCAPE_START;
      this._stateScriptDataDoubleEscapeStart(cp);
    } else {
      this._emitChars("<");
      this.state = State.SCRIPT_DATA_ESCAPED;
      this._stateScriptDataEscaped(cp);
    }
  }
  _stateScriptDataEscapedEndTagOpen(cp) {
    if (isAsciiLetter(cp)) {
      this.state = State.SCRIPT_DATA_ESCAPED_END_TAG_NAME;
      this._stateScriptDataEscapedEndTagName(cp);
    } else {
      this._emitChars("</");
      this.state = State.SCRIPT_DATA_ESCAPED;
      this._stateScriptDataEscaped(cp);
    }
  }
  _stateScriptDataEscapedEndTagName(cp) {
    if (this.handleSpecialEndTag(cp)) {
      this._emitChars("</");
      this.state = State.SCRIPT_DATA_ESCAPED;
      this._stateScriptDataEscaped(cp);
    }
  }
  _stateScriptDataDoubleEscapeStart(cp) {
    if (
      this.preprocessor.startsWith(SEQUENCES.SCRIPT, false) &&
      isScriptDataDoubleEscapeSequenceEnd(this.preprocessor.peek(SEQUENCES.SCRIPT.length))
    ) {
      this._emitCodePoint(cp);
      for (let i = 0; i < SEQUENCES.SCRIPT.length; i++) this._emitCodePoint(this._consume());
      this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
    } else if (!this._ensureHibernation()) {
      this.state = State.SCRIPT_DATA_ESCAPED;
      this._stateScriptDataEscaped(cp);
    }
  }
  _stateScriptDataDoubleEscaped(cp) {
    switch (cp) {
      case CODE_POINTS.HYPHEN_MINUS: {
        this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH;
        this._emitChars("-");
        break;
      }
      case CODE_POINTS.LESS_THAN_SIGN: {
        this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
        this._emitChars("<");
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this._emitChars(REPLACEMENT_CHARACTER);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInScriptHtmlCommentLikeText);
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(cp);
    }
  }
  _stateScriptDataDoubleEscapedDash(cp) {
    switch (cp) {
      case CODE_POINTS.HYPHEN_MINUS: {
        this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH;
        this._emitChars("-");
        break;
      }
      case CODE_POINTS.LESS_THAN_SIGN: {
        this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
        this._emitChars("<");
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
        this._emitChars(REPLACEMENT_CHARACTER);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInScriptHtmlCommentLikeText);
        this._emitEOFToken();
        break;
      }
      default:
        this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
        this._emitCodePoint(cp);
    }
  }
  _stateScriptDataDoubleEscapedDashDash(cp) {
    switch (cp) {
      case CODE_POINTS.HYPHEN_MINUS: {
        this._emitChars("-");
        break;
      }
      case CODE_POINTS.LESS_THAN_SIGN: {
        this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
        this._emitChars("<");
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this.state = State.SCRIPT_DATA;
        this._emitChars(">");
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
        this._emitChars(REPLACEMENT_CHARACTER);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInScriptHtmlCommentLikeText);
        this._emitEOFToken();
        break;
      }
      default:
        this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
        this._emitCodePoint(cp);
    }
  }
  _stateScriptDataDoubleEscapedLessThanSign(cp) {
    if (cp === CODE_POINTS.SOLIDUS) {
      this.state = State.SCRIPT_DATA_DOUBLE_ESCAPE_END;
      this._emitChars("/");
    } else {
      this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
      this._stateScriptDataDoubleEscaped(cp);
    }
  }
  _stateScriptDataDoubleEscapeEnd(cp) {
    if (
      this.preprocessor.startsWith(SEQUENCES.SCRIPT, false) &&
      isScriptDataDoubleEscapeSequenceEnd(this.preprocessor.peek(SEQUENCES.SCRIPT.length))
    ) {
      this._emitCodePoint(cp);
      for (let i = 0; i < SEQUENCES.SCRIPT.length; i++) this._emitCodePoint(this._consume());
      this.state = State.SCRIPT_DATA_ESCAPED;
    } else if (!this._ensureHibernation()) {
      this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
      this._stateScriptDataDoubleEscaped(cp);
    }
  }
  _stateBeforeAttributeName(cp) {
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED:
        break;
      case CODE_POINTS.SOLIDUS:
      case CODE_POINTS.GREATER_THAN_SIGN:
      case CODE_POINTS.EOF: {
        this.state = State.AFTER_ATTRIBUTE_NAME;
        this._stateAfterAttributeName(cp);
        break;
      }
      case CODE_POINTS.EQUALS_SIGN: {
        this._err(errors.unexpectedEqualsSignBeforeAttributeName);
        this._createAttr("=");
        this.state = State.ATTRIBUTE_NAME;
        break;
      }
      default:
        this._createAttr("");
        this.state = State.ATTRIBUTE_NAME;
        this._stateAttributeName(cp);
    }
  }
  _stateAttributeName(cp) {
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED:
      case CODE_POINTS.SOLIDUS:
      case CODE_POINTS.GREATER_THAN_SIGN:
      case CODE_POINTS.EOF: {
        this._leaveAttrName();
        this.state = State.AFTER_ATTRIBUTE_NAME;
        this._stateAfterAttributeName(cp);
        break;
      }
      case CODE_POINTS.EQUALS_SIGN: {
        this._leaveAttrName();
        this.state = State.BEFORE_ATTRIBUTE_VALUE;
        break;
      }
      case CODE_POINTS.QUOTATION_MARK:
      case CODE_POINTS.APOSTROPHE:
      case CODE_POINTS.LESS_THAN_SIGN: {
        this._err(errors.unexpectedCharacterInAttributeName);
        this.currentAttr.name += String.fromCodePoint(cp);
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this.currentAttr.name += REPLACEMENT_CHARACTER;
        break;
      }
      default:
        this.currentAttr.name += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
    }
  }
  _stateAfterAttributeName(cp) {
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED:
        break;
      case CODE_POINTS.SOLIDUS: {
        this.state = State.SELF_CLOSING_START_TAG;
        break;
      }
      case CODE_POINTS.EQUALS_SIGN: {
        this.state = State.BEFORE_ATTRIBUTE_VALUE;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this.state = State.DATA;
        this.emitCurrentTagToken();
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInTag);
        this._emitEOFToken();
        break;
      }
      default:
        this._createAttr("");
        this.state = State.ATTRIBUTE_NAME;
        this._stateAttributeName(cp);
    }
  }
  _stateBeforeAttributeValue(cp) {
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED:
        break;
      case CODE_POINTS.QUOTATION_MARK: {
        this.state = State.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
        break;
      }
      case CODE_POINTS.APOSTROPHE: {
        this.state = State.ATTRIBUTE_VALUE_SINGLE_QUOTED;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this._err(errors.missingAttributeValue);
        this.state = State.DATA;
        this.emitCurrentTagToken();
        break;
      }
      default:
        this.state = State.ATTRIBUTE_VALUE_UNQUOTED;
        this._stateAttributeValueUnquoted(cp);
    }
  }
  _stateAttributeValueDoubleQuoted(cp) {
    switch (cp) {
      case CODE_POINTS.QUOTATION_MARK: {
        this.state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
        break;
      }
      case CODE_POINTS.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this.currentAttr.value += REPLACEMENT_CHARACTER;
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInTag);
        this._emitEOFToken();
        break;
      }
      default:
        this.currentAttr.value += String.fromCodePoint(cp);
    }
  }
  _stateAttributeValueSingleQuoted(cp) {
    switch (cp) {
      case CODE_POINTS.APOSTROPHE: {
        this.state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
        break;
      }
      case CODE_POINTS.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this.currentAttr.value += REPLACEMENT_CHARACTER;
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInTag);
        this._emitEOFToken();
        break;
      }
      default:
        this.currentAttr.value += String.fromCodePoint(cp);
    }
  }
  _stateAttributeValueUnquoted(cp) {
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED: {
        this._leaveAttrValue();
        this.state = State.BEFORE_ATTRIBUTE_NAME;
        break;
      }
      case CODE_POINTS.AMPERSAND: {
        this._startCharacterReference();
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this._leaveAttrValue();
        this.state = State.DATA;
        this.emitCurrentTagToken();
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        this.currentAttr.value += REPLACEMENT_CHARACTER;
        break;
      }
      case CODE_POINTS.QUOTATION_MARK:
      case CODE_POINTS.APOSTROPHE:
      case CODE_POINTS.LESS_THAN_SIGN:
      case CODE_POINTS.EQUALS_SIGN:
      case CODE_POINTS.GRAVE_ACCENT: {
        this._err(errors.unexpectedCharacterInUnquotedAttributeValue);
        this.currentAttr.value += String.fromCodePoint(cp);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInTag);
        this._emitEOFToken();
        break;
      }
      default:
        this.currentAttr.value += String.fromCodePoint(cp);
    }
  }
  _stateAfterAttributeValueQuoted(cp) {
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED: {
        this._leaveAttrValue();
        this.state = State.BEFORE_ATTRIBUTE_NAME;
        break;
      }
      case CODE_POINTS.SOLIDUS: {
        this._leaveAttrValue();
        this.state = State.SELF_CLOSING_START_TAG;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this._leaveAttrValue();
        this.state = State.DATA;
        this.emitCurrentTagToken();
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInTag);
        this._emitEOFToken();
        break;
      }
      default:
        this._err(errors.missingWhitespaceBetweenAttributes);
        this.state = State.BEFORE_ATTRIBUTE_NAME;
        this._stateBeforeAttributeName(cp);
    }
  }
  _stateSelfClosingStartTag(cp) {
    switch (cp) {
      case CODE_POINTS.GREATER_THAN_SIGN: {
        let token = this.currentToken;
        token.selfClosing = true;
        this.state = State.DATA;
        this.emitCurrentTagToken();
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInTag);
        this._emitEOFToken();
        break;
      }
      default:
        this._err(errors.unexpectedSolidusInTag);
        this.state = State.BEFORE_ATTRIBUTE_NAME;
        this._stateBeforeAttributeName(cp);
    }
  }
  _stateBogusComment(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this.state = State.DATA;
        this.emitCurrentComment(token);
        break;
      }
      case CODE_POINTS.EOF: {
        this.emitCurrentComment(token);
        this._emitEOFToken();
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        token.data += REPLACEMENT_CHARACTER;
        break;
      }
      default:
        token.data += String.fromCodePoint(cp);
    }
  }
  _stateMarkupDeclarationOpen(cp) {
    if (this._consumeSequenceIfMatch(SEQUENCES.DASH_DASH, true)) {
      this._createCommentToken(SEQUENCES.DASH_DASH.length + 1);
      this.state = State.COMMENT_START;
    } else if (this._consumeSequenceIfMatch(SEQUENCES.DOCTYPE, false)) {
      this.currentLocation = this.getCurrentLocation(SEQUENCES.DOCTYPE.length + 1);
      this.state = State.DOCTYPE;
    } else if (this._consumeSequenceIfMatch(SEQUENCES.CDATA_START, true)) {
      if (this.inForeignNode) this.state = State.CDATA_SECTION;
      else {
        this._err(errors.cdataInHtmlContent);
        this._createCommentToken(SEQUENCES.CDATA_START.length + 1);
        this.currentToken.data = "[CDATA[";
        this.state = State.BOGUS_COMMENT;
      }
    } else if (!this._ensureHibernation()) {
      this._err(errors.incorrectlyOpenedComment);
      this._createCommentToken(2);
      this.state = State.BOGUS_COMMENT;
      this._stateBogusComment(cp);
    }
  }
  _stateCommentStart(cp) {
    switch (cp) {
      case CODE_POINTS.HYPHEN_MINUS: {
        this.state = State.COMMENT_START_DASH;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this._err(errors.abruptClosingOfEmptyComment);
        this.state = State.DATA;
        let token = this.currentToken;
        this.emitCurrentComment(token);
        break;
      }
      default:
        this.state = State.COMMENT;
        this._stateComment(cp);
    }
  }
  _stateCommentStartDash(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.HYPHEN_MINUS: {
        this.state = State.COMMENT_END;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this._err(errors.abruptClosingOfEmptyComment);
        this.state = State.DATA;
        this.emitCurrentComment(token);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInComment);
        this.emitCurrentComment(token);
        this._emitEOFToken();
        break;
      }
      default:
        token.data += "-";
        this.state = State.COMMENT;
        this._stateComment(cp);
    }
  }
  _stateComment(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.HYPHEN_MINUS: {
        this.state = State.COMMENT_END_DASH;
        break;
      }
      case CODE_POINTS.LESS_THAN_SIGN: {
        token.data += "<";
        this.state = State.COMMENT_LESS_THAN_SIGN;
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        token.data += REPLACEMENT_CHARACTER;
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInComment);
        this.emitCurrentComment(token);
        this._emitEOFToken();
        break;
      }
      default:
        token.data += String.fromCodePoint(cp);
    }
  }
  _stateCommentLessThanSign(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.EXCLAMATION_MARK: {
        token.data += "!";
        this.state = State.COMMENT_LESS_THAN_SIGN_BANG;
        break;
      }
      case CODE_POINTS.LESS_THAN_SIGN: {
        token.data += "<";
        break;
      }
      default:
        this.state = State.COMMENT;
        this._stateComment(cp);
    }
  }
  _stateCommentLessThanSignBang(cp) {
    if (cp === CODE_POINTS.HYPHEN_MINUS) this.state = State.COMMENT_LESS_THAN_SIGN_BANG_DASH;
    else {
      this.state = State.COMMENT;
      this._stateComment(cp);
    }
  }
  _stateCommentLessThanSignBangDash(cp) {
    if (cp === CODE_POINTS.HYPHEN_MINUS) this.state = State.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH;
    else {
      this.state = State.COMMENT_END_DASH;
      this._stateCommentEndDash(cp);
    }
  }
  _stateCommentLessThanSignBangDashDash(cp) {
    if (cp !== CODE_POINTS.GREATER_THAN_SIGN && cp !== CODE_POINTS.EOF) this._err(errors.nestedComment);
    this.state = State.COMMENT_END;
    this._stateCommentEnd(cp);
  }
  _stateCommentEndDash(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.HYPHEN_MINUS: {
        this.state = State.COMMENT_END;
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInComment);
        this.emitCurrentComment(token);
        this._emitEOFToken();
        break;
      }
      default:
        token.data += "-";
        this.state = State.COMMENT;
        this._stateComment(cp);
    }
  }
  _stateCommentEnd(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this.state = State.DATA;
        this.emitCurrentComment(token);
        break;
      }
      case CODE_POINTS.EXCLAMATION_MARK: {
        this.state = State.COMMENT_END_BANG;
        break;
      }
      case CODE_POINTS.HYPHEN_MINUS: {
        token.data += "-";
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInComment);
        this.emitCurrentComment(token);
        this._emitEOFToken();
        break;
      }
      default:
        token.data += "--";
        this.state = State.COMMENT;
        this._stateComment(cp);
    }
  }
  _stateCommentEndBang(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.HYPHEN_MINUS: {
        token.data += "--!";
        this.state = State.COMMENT_END_DASH;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this._err(errors.incorrectlyClosedComment);
        this.state = State.DATA;
        this.emitCurrentComment(token);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInComment);
        this.emitCurrentComment(token);
        this._emitEOFToken();
        break;
      }
      default:
        token.data += "--!";
        this.state = State.COMMENT;
        this._stateComment(cp);
    }
  }
  _stateDoctype(cp) {
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED: {
        this.state = State.BEFORE_DOCTYPE_NAME;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this.state = State.BEFORE_DOCTYPE_NAME;
        this._stateBeforeDoctypeName(cp);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInDoctype);
        this._createDoctypeToken(null);
        let token = this.currentToken;
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
        this._err(errors.missingWhitespaceBeforeDoctypeName);
        this.state = State.BEFORE_DOCTYPE_NAME;
        this._stateBeforeDoctypeName(cp);
    }
  }
  _stateBeforeDoctypeName(cp) {
    if (isAsciiUpper(cp)) {
      this._createDoctypeToken(String.fromCharCode(toAsciiLower(cp)));
      this.state = State.DOCTYPE_NAME;
    } else
      switch (cp) {
        case CODE_POINTS.SPACE:
        case CODE_POINTS.LINE_FEED:
        case CODE_POINTS.TABULATION:
        case CODE_POINTS.FORM_FEED:
          break;
        case CODE_POINTS.NULL: {
          this._err(errors.unexpectedNullCharacter);
          this._createDoctypeToken(REPLACEMENT_CHARACTER);
          this.state = State.DOCTYPE_NAME;
          break;
        }
        case CODE_POINTS.GREATER_THAN_SIGN: {
          this._err(errors.missingDoctypeName);
          this._createDoctypeToken(null);
          let token = this.currentToken;
          token.forceQuirks = true;
          this.emitCurrentDoctype(token);
          this.state = State.DATA;
          break;
        }
        case CODE_POINTS.EOF: {
          this._err(errors.eofInDoctype);
          this._createDoctypeToken(null);
          let token = this.currentToken;
          token.forceQuirks = true;
          this.emitCurrentDoctype(token);
          this._emitEOFToken();
          break;
        }
        default:
          this._createDoctypeToken(String.fromCodePoint(cp));
          this.state = State.DOCTYPE_NAME;
      }
  }
  _stateDoctypeName(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED: {
        this.state = State.AFTER_DOCTYPE_NAME;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this.state = State.DATA;
        this.emitCurrentDoctype(token);
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        token.name += REPLACEMENT_CHARACTER;
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInDoctype);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
        token.name += String.fromCodePoint(isAsciiUpper(cp) ? toAsciiLower(cp) : cp);
    }
  }
  _stateAfterDoctypeName(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED:
        break;
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this.state = State.DATA;
        this.emitCurrentDoctype(token);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInDoctype);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
        if (this._consumeSequenceIfMatch(SEQUENCES.PUBLIC, false))
          this.state = State.AFTER_DOCTYPE_PUBLIC_KEYWORD;
        else if (this._consumeSequenceIfMatch(SEQUENCES.SYSTEM, false))
          this.state = State.AFTER_DOCTYPE_SYSTEM_KEYWORD;
        else if (!this._ensureHibernation()) {
          this._err(errors.invalidCharacterSequenceAfterDoctypeName);
          token.forceQuirks = true;
          this.state = State.BOGUS_DOCTYPE;
          this._stateBogusDoctype(cp);
        }
    }
  }
  _stateAfterDoctypePublicKeyword(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED: {
        this.state = State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER;
        break;
      }
      case CODE_POINTS.QUOTATION_MARK: {
        this._err(errors.missingWhitespaceAfterDoctypePublicKeyword);
        token.publicId = "";
        this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
        break;
      }
      case CODE_POINTS.APOSTROPHE: {
        this._err(errors.missingWhitespaceAfterDoctypePublicKeyword);
        token.publicId = "";
        this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this._err(errors.missingDoctypePublicIdentifier);
        token.forceQuirks = true;
        this.state = State.DATA;
        this.emitCurrentDoctype(token);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInDoctype);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
        this._err(errors.missingQuoteBeforeDoctypePublicIdentifier);
        token.forceQuirks = true;
        this.state = State.BOGUS_DOCTYPE;
        this._stateBogusDoctype(cp);
    }
  }
  _stateBeforeDoctypePublicIdentifier(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED:
        break;
      case CODE_POINTS.QUOTATION_MARK: {
        token.publicId = "";
        this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
        break;
      }
      case CODE_POINTS.APOSTROPHE: {
        token.publicId = "";
        this.state = State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this._err(errors.missingDoctypePublicIdentifier);
        token.forceQuirks = true;
        this.state = State.DATA;
        this.emitCurrentDoctype(token);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInDoctype);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
        this._err(errors.missingQuoteBeforeDoctypePublicIdentifier);
        token.forceQuirks = true;
        this.state = State.BOGUS_DOCTYPE;
        this._stateBogusDoctype(cp);
    }
  }
  _stateDoctypePublicIdentifierDoubleQuoted(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.QUOTATION_MARK: {
        this.state = State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        token.publicId += REPLACEMENT_CHARACTER;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this._err(errors.abruptDoctypePublicIdentifier);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this.state = State.DATA;
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInDoctype);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
        token.publicId += String.fromCodePoint(cp);
    }
  }
  _stateDoctypePublicIdentifierSingleQuoted(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.APOSTROPHE: {
        this.state = State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        token.publicId += REPLACEMENT_CHARACTER;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this._err(errors.abruptDoctypePublicIdentifier);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this.state = State.DATA;
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInDoctype);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
        token.publicId += String.fromCodePoint(cp);
    }
  }
  _stateAfterDoctypePublicIdentifier(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED: {
        this.state = State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this.state = State.DATA;
        this.emitCurrentDoctype(token);
        break;
      }
      case CODE_POINTS.QUOTATION_MARK: {
        this._err(errors.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers);
        token.systemId = "";
        this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
        break;
      }
      case CODE_POINTS.APOSTROPHE: {
        this._err(errors.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers);
        token.systemId = "";
        this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInDoctype);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
        this._err(errors.missingQuoteBeforeDoctypeSystemIdentifier);
        token.forceQuirks = true;
        this.state = State.BOGUS_DOCTYPE;
        this._stateBogusDoctype(cp);
    }
  }
  _stateBetweenDoctypePublicAndSystemIdentifiers(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED:
        break;
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this.emitCurrentDoctype(token);
        this.state = State.DATA;
        break;
      }
      case CODE_POINTS.QUOTATION_MARK: {
        token.systemId = "";
        this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
        break;
      }
      case CODE_POINTS.APOSTROPHE: {
        token.systemId = "";
        this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInDoctype);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
        this._err(errors.missingQuoteBeforeDoctypeSystemIdentifier);
        token.forceQuirks = true;
        this.state = State.BOGUS_DOCTYPE;
        this._stateBogusDoctype(cp);
    }
  }
  _stateAfterDoctypeSystemKeyword(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED: {
        this.state = State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER;
        break;
      }
      case CODE_POINTS.QUOTATION_MARK: {
        this._err(errors.missingWhitespaceAfterDoctypeSystemKeyword);
        token.systemId = "";
        this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
        break;
      }
      case CODE_POINTS.APOSTROPHE: {
        this._err(errors.missingWhitespaceAfterDoctypeSystemKeyword);
        token.systemId = "";
        this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this._err(errors.missingDoctypeSystemIdentifier);
        token.forceQuirks = true;
        this.state = State.DATA;
        this.emitCurrentDoctype(token);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInDoctype);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
        this._err(errors.missingQuoteBeforeDoctypeSystemIdentifier);
        token.forceQuirks = true;
        this.state = State.BOGUS_DOCTYPE;
        this._stateBogusDoctype(cp);
    }
  }
  _stateBeforeDoctypeSystemIdentifier(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED:
        break;
      case CODE_POINTS.QUOTATION_MARK: {
        token.systemId = "";
        this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
        break;
      }
      case CODE_POINTS.APOSTROPHE: {
        token.systemId = "";
        this.state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this._err(errors.missingDoctypeSystemIdentifier);
        token.forceQuirks = true;
        this.state = State.DATA;
        this.emitCurrentDoctype(token);
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInDoctype);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
        this._err(errors.missingQuoteBeforeDoctypeSystemIdentifier);
        token.forceQuirks = true;
        this.state = State.BOGUS_DOCTYPE;
        this._stateBogusDoctype(cp);
    }
  }
  _stateDoctypeSystemIdentifierDoubleQuoted(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.QUOTATION_MARK: {
        this.state = State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        token.systemId += REPLACEMENT_CHARACTER;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this._err(errors.abruptDoctypeSystemIdentifier);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this.state = State.DATA;
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInDoctype);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
        token.systemId += String.fromCodePoint(cp);
    }
  }
  _stateDoctypeSystemIdentifierSingleQuoted(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.APOSTROPHE: {
        this.state = State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        token.systemId += REPLACEMENT_CHARACTER;
        break;
      }
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this._err(errors.abruptDoctypeSystemIdentifier);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this.state = State.DATA;
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInDoctype);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
        token.systemId += String.fromCodePoint(cp);
    }
  }
  _stateAfterDoctypeSystemIdentifier(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.SPACE:
      case CODE_POINTS.LINE_FEED:
      case CODE_POINTS.TABULATION:
      case CODE_POINTS.FORM_FEED:
        break;
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this.emitCurrentDoctype(token);
        this.state = State.DATA;
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInDoctype);
        token.forceQuirks = true;
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
        this._err(errors.unexpectedCharacterAfterDoctypeSystemIdentifier);
        this.state = State.BOGUS_DOCTYPE;
        this._stateBogusDoctype(cp);
    }
  }
  _stateBogusDoctype(cp) {
    let token = this.currentToken;
    switch (cp) {
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this.emitCurrentDoctype(token);
        this.state = State.DATA;
        break;
      }
      case CODE_POINTS.NULL: {
        this._err(errors.unexpectedNullCharacter);
        break;
      }
      case CODE_POINTS.EOF: {
        this.emitCurrentDoctype(token);
        this._emitEOFToken();
        break;
      }
      default:
    }
  }
  _stateCdataSection(cp) {
    switch (cp) {
      case CODE_POINTS.RIGHT_SQUARE_BRACKET: {
        this.state = State.CDATA_SECTION_BRACKET;
        break;
      }
      case CODE_POINTS.EOF: {
        this._err(errors.eofInCdata);
        this._emitEOFToken();
        break;
      }
      default:
        this._emitCodePoint(cp);
    }
  }
  _stateCdataSectionBracket(cp) {
    if (cp === CODE_POINTS.RIGHT_SQUARE_BRACKET) this.state = State.CDATA_SECTION_END;
    else {
      this._emitChars("]");
      this.state = State.CDATA_SECTION;
      this._stateCdataSection(cp);
    }
  }
  _stateCdataSectionEnd(cp) {
    switch (cp) {
      case CODE_POINTS.GREATER_THAN_SIGN: {
        this.state = State.DATA;
        break;
      }
      case CODE_POINTS.RIGHT_SQUARE_BRACKET: {
        this._emitChars("]");
        break;
      }
      default:
        this._emitChars("]]");
        this.state = State.CDATA_SECTION;
        this._stateCdataSection(cp);
    }
  }
  _stateCharacterReference() {
    let length = this.entityDecoder.write(this.preprocessor.html, this.preprocessor.pos);
    if (length < 0)
      if (this.preprocessor.lastChunkWritten) length = this.entityDecoder.end();
      else {
        this.active = false;
        this.preprocessor.pos = this.preprocessor.html.length - 1;
        this.consumedAfterSnapshot = 0;
        this.preprocessor.endOfChunkHit = true;
        return;
      }
    if (length === 0) {
      this.preprocessor.pos = this.entityStartPos;
      this._flushCodePointConsumedAsCharacterReference(CODE_POINTS.AMPERSAND);
      this.state =
        !this._isCharacterReferenceInAttribute() && isAsciiAlphaNumeric_2(this.preprocessor.peek(1))
          ? State.AMBIGUOUS_AMPERSAND
          : this.returnState;
    } else this.state = this.returnState;
  }
  _stateAmbiguousAmpersand(cp) {
    if (isAsciiAlphaNumeric_2(cp)) this._flushCodePointConsumedAsCharacterReference(cp);
    else {
      if (cp === CODE_POINTS.SEMICOLON) this._err(errors.unknownNamedCharacterReference);
      this.state = this.returnState;
      this._callState(cp);
    }
  }
}
export { Tokenizer, TokenizerMode };

/**
 * entities/lib/esm/decode.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: entities@4.5.0
 * pieces: chunk-p9ac6cnb.js (15)
 * attribution: esm-layout 4, esm-fingerprint 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { decodeCodePoint, fromCodePoint } from "./decode_codepoint.js";

//@ chunk-p9ac6cnb.js:57771-57777 esm-layout
var CharCodes;
//@ chunk-p9ac6cnb.js:57777-58090 esm-fingerprint
(function (CharCodes) {
  CharCodes[(CharCodes.NUM = 35)] = "NUM";
  CharCodes[(CharCodes.SEMI = 59)] = "SEMI";
  CharCodes[(CharCodes.EQUALS = 61)] = "EQUALS";
  CharCodes[(CharCodes.ZERO = 48)] = "ZERO";
  CharCodes[(CharCodes.NINE = 57)] = "NINE";
  CharCodes[(CharCodes.LOWER_A = 97)] = "LOWER_A";
  CharCodes[(CharCodes.LOWER_F = 102)] = "LOWER_F";
  CharCodes[(CharCodes.LOWER_X = 120)] = "LOWER_X";
  CharCodes[(CharCodes.LOWER_Z = 122)] = "LOWER_Z";
  CharCodes[(CharCodes.UPPER_A = 65)] = "UPPER_A";
  CharCodes[(CharCodes.UPPER_F = 70)] = "UPPER_F";
  CharCodes[(CharCodes.UPPER_Z = 90)] = "UPPER_Z";
})(CharCodes || (CharCodes = {}));
//@ chunk-p9ac6cnb.js:58090-58102 esm-layout
var TO_LOWER_BIT = 32;
var BinTrieFlags;
//@ chunk-p9ac6cnb.js:58102-58241 esm-fingerprint
(function (BinTrieFlags) {
  BinTrieFlags[(BinTrieFlags.VALUE_LENGTH = 49152)] = "VALUE_LENGTH";
  BinTrieFlags[(BinTrieFlags.BRANCH_LENGTH = 16256)] = "BRANCH_LENGTH";
  BinTrieFlags[(BinTrieFlags.JUMP_TABLE = 127)] = "JUMP_TABLE";
})(BinTrieFlags || (BinTrieFlags = {}));
//@ chunk-p9ac6cnb.js:58241-58284 esm-fingerprint
function isNumber(code) {
  return code >= CharCodes.ZERO && code <= CharCodes.NINE;
}
//@ chunk-p9ac6cnb.js:58284-58361 esm-fingerprint
function isHexadecimalCharacter(code) {
  return (
    (code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_F) ||
    (code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_F)
  );
}
//@ chunk-p9ac6cnb.js:58361-58445 esm-fingerprint
function isAsciiAlphaNumeric(code) {
  return (
    (code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_Z) ||
    (code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_Z) ||
    isNumber(code)
  );
}
//@ chunk-p9ac6cnb.js:58445-58487 esm-fingerprint
function isEntityInAttributeInvalidEnd(code) {
  return code === CharCodes.EQUALS || isAsciiAlphaNumeric(code);
}
//@ chunk-p9ac6cnb.js:58487-58493 esm-layout
var EntityDecoderState;
//@ chunk-p9ac6cnb.js:58493-58690 esm-fingerprint
(function (EntityDecoderState) {
  EntityDecoderState[(EntityDecoderState.EntityStart = 0)] = "EntityStart";
  EntityDecoderState[(EntityDecoderState.NumericStart = 1)] = "NumericStart";
  EntityDecoderState[(EntityDecoderState.NumericDecimal = 2)] = "NumericDecimal";
  EntityDecoderState[(EntityDecoderState.NumericHex = 3)] = "NumericHex";
  EntityDecoderState[(EntityDecoderState.NamedEntity = 4)] = "NamedEntity";
})(EntityDecoderState || (EntityDecoderState = {}));
//@ chunk-p9ac6cnb.js:58690-58696 esm-layout
var DecodingMode;
//@ chunk-p9ac6cnb.js:58696-58797 esm-fingerprint
(function (DecodingMode) {
  DecodingMode[(DecodingMode.Legacy = 0)] = "Legacy";
  DecodingMode[(DecodingMode.Strict = 1)] = "Strict";
  DecodingMode[(DecodingMode.Attribute = 2)] = "Attribute";
})(DecodingMode || (DecodingMode = {}));
//@ chunk-p9ac6cnb.js:58797-62166 esm-fingerprint
class EntityDecoder {
  constructor(decodeTree, emitCodePoint, errors) {
    this.decodeTree = decodeTree;
    this.emitCodePoint = emitCodePoint;
    this.errors = errors;
    this.state = EntityDecoderState.EntityStart;
    this.consumed = 1;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.decodeMode = DecodingMode.Strict;
  }
  startEntity(decodeMode) {
    this.decodeMode = decodeMode;
    this.state = EntityDecoderState.EntityStart;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.consumed = 1;
  }
  write(str, offset) {
    switch (this.state) {
      case EntityDecoderState.EntityStart: {
        if (str.charCodeAt(offset) === CharCodes.NUM) {
          this.state = EntityDecoderState.NumericStart;
          this.consumed += 1;
          return this.stateNumericStart(str, offset + 1);
        }
        this.state = EntityDecoderState.NamedEntity;
        return this.stateNamedEntity(str, offset);
      }
      case EntityDecoderState.NumericStart:
        return this.stateNumericStart(str, offset);
      case EntityDecoderState.NumericDecimal:
        return this.stateNumericDecimal(str, offset);
      case EntityDecoderState.NumericHex:
        return this.stateNumericHex(str, offset);
      case EntityDecoderState.NamedEntity:
        return this.stateNamedEntity(str, offset);
    }
  }
  stateNumericStart(str, offset) {
    if (offset >= str.length) return -1;
    if ((str.charCodeAt(offset) | TO_LOWER_BIT) === CharCodes.LOWER_X) {
      this.state = EntityDecoderState.NumericHex;
      this.consumed += 1;
      return this.stateNumericHex(str, offset + 1);
    }
    this.state = EntityDecoderState.NumericDecimal;
    return this.stateNumericDecimal(str, offset);
  }
  addToNumericResult(str, start, end, base) {
    if (start !== end) {
      let digitCount = end - start;
      this.result = this.result * Math.pow(base, digitCount) + parseInt(str.substr(start, digitCount), base);
      this.consumed += digitCount;
    }
  }
  stateNumericHex(str, offset) {
    let startIdx = offset;
    while (offset < str.length) {
      let char = str.charCodeAt(offset);
      if (isNumber(char) || isHexadecimalCharacter(char)) offset += 1;
      else {
        this.addToNumericResult(str, startIdx, offset, 16);
        return this.emitNumericEntity(char, 3);
      }
    }
    this.addToNumericResult(str, startIdx, offset, 16);
    return -1;
  }
  stateNumericDecimal(str, offset) {
    let startIdx = offset;
    while (offset < str.length) {
      let char = str.charCodeAt(offset);
      if (isNumber(char)) offset += 1;
      else {
        this.addToNumericResult(str, startIdx, offset, 10);
        return this.emitNumericEntity(char, 2);
      }
    }
    this.addToNumericResult(str, startIdx, offset, 10);
    return -1;
  }
  emitNumericEntity(lastCp, expectedLength) {
    var _a;
    if (this.consumed <= expectedLength) {
      if (!((_a = this.errors) === null || _a === undefined))
        _a.absenceOfDigitsInNumericCharacterReference(this.consumed);
      return 0;
    }
    if (lastCp === CharCodes.SEMI) this.consumed += 1;
    else if (this.decodeMode === DecodingMode.Strict) return 0;
    this.emitCodePoint(decodeCodePoint(this.result), this.consumed);
    if (this.errors) {
      if (lastCp !== CharCodes.SEMI) this.errors.missingSemicolonAfterCharacterReference();
      this.errors.validateNumericCharacterReference(this.result);
    }
    return this.consumed;
  }
  stateNamedEntity(str, offset) {
    let { decodeTree } = this;
    let current = decodeTree[this.treeIndex];
    let valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
    for (; offset < str.length; offset++, this.excess++) {
      let char = str.charCodeAt(offset);
      this.treeIndex = determineBranch(decodeTree, current, this.treeIndex + Math.max(1, valueLength), char);
      if (this.treeIndex < 0)
        return this.result === 0 ||
          (this.decodeMode === DecodingMode.Attribute &&
            (valueLength === 0 || isEntityInAttributeInvalidEnd(char)))
          ? 0
          : this.emitNotTerminatedNamedEntity();
      current = decodeTree[this.treeIndex];
      valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
      if (valueLength !== 0) {
        if (char === CharCodes.SEMI)
          return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
        if (this.decodeMode !== DecodingMode.Strict) {
          this.result = this.treeIndex;
          this.consumed += this.excess;
          this.excess = 0;
        }
      }
    }
    return -1;
  }
  emitNotTerminatedNamedEntity() {
    var _a;
    let { result, decodeTree } = this;
    let valueLength = (decodeTree[result] & BinTrieFlags.VALUE_LENGTH) >> 14;
    this.emitNamedEntityData(result, valueLength, this.consumed);
    if (!((_a = this.errors) === null || _a === undefined)) _a.missingSemicolonAfterCharacterReference();
    return this.consumed;
  }
  emitNamedEntityData(result, valueLength, consumed) {
    let { decodeTree } = this;
    this.emitCodePoint(
      valueLength === 1 ? decodeTree[result] & ~BinTrieFlags.VALUE_LENGTH : decodeTree[result + 1],
      consumed,
    );
    if (valueLength === 3) this.emitCodePoint(decodeTree[result + 2], consumed);
    return consumed;
  }
  end() {
    var _a;
    switch (this.state) {
      case EntityDecoderState.NamedEntity:
        return this.result !== 0 &&
          (this.decodeMode !== DecodingMode.Attribute || this.result === this.treeIndex)
          ? this.emitNotTerminatedNamedEntity()
          : 0;
      case EntityDecoderState.NumericDecimal:
        return this.emitNumericEntity(0, 2);
      case EntityDecoderState.NumericHex:
        return this.emitNumericEntity(0, 3);
      case EntityDecoderState.NumericStart:
        if (!((_a = this.errors) === null || _a === undefined))
          _a.absenceOfDigitsInNumericCharacterReference(this.consumed);
        return 0;
      case EntityDecoderState.EntityStart:
        return 0;
    }
  }
}
//@ chunk-p9ac6cnb.js:62166-62413 esm-fingerprint
function getDecoder(decodeTree) {
  let ret = "";
  let decoder = new EntityDecoder(decodeTree, (str) => (ret += fromCodePoint(str)));
  return function (str, decodeMode) {
    let lastIndex = 0;
    let offset = 0;
    while ((offset = str.indexOf("&", offset)) >= 0) {
      ret += str.slice(lastIndex, offset);
      decoder.startEntity(decodeMode);
      let len = decoder.write(str, offset + 1);
      if (len < 0) {
        lastIndex = offset + decoder.end();
        break;
      }
      lastIndex = offset + len;
      offset = len === 0 ? lastIndex + 1 : lastIndex;
    }
    let result = ret + str.slice(lastIndex);
    ret = "";
    return result;
  };
}
//@ chunk-p9ac6cnb.js:62413-62667 esm-fingerprint
function determineBranch(decodeTree, current, nodeIdx, char) {
  let branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
  let jumpOffset = current & BinTrieFlags.JUMP_TABLE;
  if (branchCount === 0) return jumpOffset !== 0 && char === jumpOffset ? nodeIdx : -1;
  if (jumpOffset) {
    let value = char - jumpOffset;
    return value < 0 || value >= branchCount ? -1 : decodeTree[nodeIdx + value] - 1;
  }
  let lo = nodeIdx;
  let hi = lo + branchCount - 1;
  while (lo <= hi) {
    let mid = (lo + hi) >>> 1;
    let midVal = decodeTree[mid];
    if (midVal < char) lo = mid + 1;
    else if (midVal > char) hi = mid - 1;
    else return decodeTree[mid + branchCount];
  }
  return -1;
}
export { getDecoder, EntityDecoder, DecodingMode };

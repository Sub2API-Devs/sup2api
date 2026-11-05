/**
 * fuse.js/dist/fuse.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: fuse.js@7.0.0
 * pieces: chunk-z20c443b.js (50)
 * attribution: affinity 3, esm-fingerprint 38, esm-layout 9
 */
import {
  isString,
  isArrayInline,
  isNumber,
  isBoolean,
  toStringInline,
  isObject,
} from "../../lodash-es/_inlinedHelpers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:27261-27304 affinity
function isDefined(value) {
  return value !== undefined && value !== null;
}
//@ chunk-z20c443b.js:27304-27342 affinity
function isBlank(value) {
  return !value.trim().length;
}
//@ chunk-z20c443b.js:27342-27454 esm-fingerprint
function getTag(value) {
  return value == null
    ? value === undefined
      ? "[object Undefined]"
      : "[object Null]"
    : Object.prototype.toString.call(value);
}
//@ chunk-z20c443b.js:27454-27712 esm-fingerprint
var INCORRECT_INDEX_TYPE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY;
var PATTERN_LENGTH_TOO_LARGE;
var MISSING_KEY_PROPERTY;
var INVALID_KEY_WEIGHT_VALUE;
var hasOwn;
deferInit("chunk-z20c443b.js:27454", () => {
  INCORRECT_INDEX_TYPE = "Incorrect 'index' type";
  LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY = (key) => `Invalid value for key ${key}`;
  PATTERN_LENGTH_TOO_LARGE = (max) => `Pattern length exceeds max of ${max}.`;
  MISSING_KEY_PROPERTY = (name) => `Missing ${name} property in key`;
  INVALID_KEY_WEIGHT_VALUE = (key) => `Property 'weight' in key '${key}' must be a positive integer`;
  hasOwn = Object.prototype.hasOwnProperty;
});
//@ chunk-z20c443b.js:27712-27994 esm-fingerprint
class KeyStore {
  constructor(keys) {
    this._keys = [];
    this._keyMap = {};
    let totalWeight = 0;
    keys.forEach((key) => {
      let obj = createKey(key);
      this._keys.push(obj);
      this._keyMap[obj.id] = obj;
      totalWeight += obj.weight;
    });
    this._keys.forEach((key) => {
      key.weight /= totalWeight;
    });
  }
  get(keyId) {
    return this._keyMap[keyId];
  }
  keys() {
    return this._keys;
  }
  toJSON() {
    return JSON.stringify(this._keys);
  }
}
//@ chunk-z20c443b.js:27994-28280 esm-fingerprint
function createKey(key) {
  let path = null;
  let id = null;
  let src = null;
  let weight = 1;
  let getFn = null;
  if (isString(key) || isArrayInline(key)) {
    src = key;
    path = createKeyPath(key);
    id = createKeyId(key);
  } else {
    if (!hasOwn.call(key, "name")) throw Error(MISSING_KEY_PROPERTY("name"));
    let name = key.name;
    src = name;
    if (hasOwn.call(key, "weight")) {
      weight = key.weight;
      if (weight <= 0) throw Error(INVALID_KEY_WEIGHT_VALUE(name));
    }
    path = createKeyPath(name);
    id = createKeyId(name);
    getFn = key.getFn;
  }
  return {
    path,
    id,
    weight,
    src,
    getFn,
  };
}
//@ chunk-z20c443b.js:28280-28323 esm-layout
function createKeyPath(key) {
  return isArrayInline(key) ? key : key.split(".");
}
//@ chunk-z20c443b.js:28323-28365 esm-layout
function createKeyId(key) {
  return isArrayInline(key) ? key.join(".") : key;
}
//@ chunk-z20c443b.js:28365-28679 esm-fingerprint
function get(obj, path) {
  let list = [];
  let arr = false;
  let deepGet = (obj, path, index) => {
    if (!isDefined(obj)) return;
    if (!path[index]) list.push(obj);
    else {
      let key = path[index];
      let value = obj[key];
      if (!isDefined(value)) return;
      if (index === path.length - 1 && (isString(value) || isNumber(value) || isBoolean(value)))
        list.push(toStringInline(value));
      else if (isArrayInline(value)) {
        arr = true;
        for (let i = 0, len = value.length; i < len; i += 1) deepGet(value[i], path, index + 1);
      } else if (path.length) deepGet(value, path, index + 1);
    }
  };
  deepGet(obj, isString(path) ? path.split(".") : path, 0);
  return arr ? list : list[0];
}
//@ chunk-z20c443b.js:28679-29051 esm-fingerprint
var MatchOptions = {
  includeMatches: false,
  findAllMatches: false,
  minMatchCharLength: 1,
};
var BasicOptions = {
  isCaseSensitive: false,
  includeScore: false,
  keys: [],
  shouldSort: true,
  sortFn: (a, b) => (a.score === b.score ? (a.idx < b.idx ? -1 : 1) : a.score < b.score ? -1 : 1),
};
var FuzzyOptions = {
  location: 0,
  threshold: 0.6,
  distance: 100,
};
var AdvancedOptions = {
  useExtendedSearch: false,
  getFn: get,
  ignoreLocation: false,
  ignoreFieldNorm: false,
  fieldNormWeight: 1,
};
var Config = {
  ...BasicOptions,
  ...MatchOptions,
  ...FuzzyOptions,
  ...AdvancedOptions,
};
var SPACE = /[^ ]+/g;
//@ chunk-z20c443b.js:29051-29269 esm-fingerprint
function norm(weight = 1, mantissa = 3) {
  let cache = new Map();
  let m_2 = Math.pow(10, mantissa);
  return {
    get(value) {
      let numTokens = value.match(SPACE).length;
      if (cache.has(numTokens)) return cache.get(numTokens);
      let norm = 1 / Math.pow(numTokens, 0.5 * weight);
      let n = parseFloat(Math.round(norm * m_2) / m_2);
      cache.set(numTokens, n);
      return n;
    },
    clear() {
      cache.clear();
    },
  };
}
//@ chunk-z20c443b.js:29269-30672 esm-fingerprint
class FuseIndex {
  constructor({ getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {}) {
    this.norm = norm(fieldNormWeight, 3);
    this.getFn = getFn;
    this.isCreated = false;
    this.setIndexRecords();
  }
  setSources(docs = []) {
    this.docs = docs;
  }
  setIndexRecords(records = []) {
    this.records = records;
  }
  setKeys(keys = []) {
    this.keys = keys;
    this._keysMap = {};
    keys.forEach((key, idx) => {
      this._keysMap[key.id] = idx;
    });
  }
  create() {
    if (this.isCreated || !this.docs.length) return;
    this.isCreated = true;
    if (isString(this.docs[0]))
      this.docs.forEach((doc, docIndex) => {
        this._addString(doc, docIndex);
      });
    else
      this.docs.forEach((doc, docIndex) => {
        this._addObject(doc, docIndex);
      });
    this.norm.clear();
  }
  add(doc) {
    let idx = this.size();
    if (isString(doc)) this._addString(doc, idx);
    else this._addObject(doc, idx);
  }
  removeAt(idx) {
    this.records.splice(idx, 1);
    for (let i = idx, len = this.size(); i < len; i += 1) this.records[i].i -= 1;
  }
  getValueForItemAtKeyId(item, keyId) {
    return item[this._keysMap[keyId]];
  }
  size() {
    return this.records.length;
  }
  _addString(doc, docIndex) {
    if (!isDefined(doc) || isBlank(doc)) return;
    let record = {
      v: doc,
      i: docIndex,
      n: this.norm.get(doc),
    };
    this.records.push(record);
  }
  _addObject(doc, docIndex) {
    let record = {
      i: docIndex,
      $: {},
    };
    this.keys.forEach((key, keyIndex) => {
      let value = key.getFn ? key.getFn(doc) : this.getFn(doc, key.path);
      if (!isDefined(value)) return;
      if (isArrayInline(value)) {
        let subRecords = [];
        let stack = [
          {
            nestedArrIndex: -1,
            value,
          },
        ];
        while (stack.length) {
          let { nestedArrIndex, value } = stack.pop();
          if (!isDefined(value)) continue;
          if (isString(value) && !isBlank(value)) {
            let subRecord = {
              v: value,
              i: nestedArrIndex,
              n: this.norm.get(value),
            };
            subRecords.push(subRecord);
          } else if (isArrayInline(value))
            value.forEach((item, k) => {
              stack.push({
                nestedArrIndex: k,
                value: item,
              });
            });
        }
        record.$[keyIndex] = subRecords;
      } else if (isString(value) && !isBlank(value)) {
        let subRecord = {
          v: value,
          n: this.norm.get(value),
        };
        record.$[keyIndex] = subRecord;
      }
    });
    this.records.push(record);
  }
  toJSON() {
    return {
      keys: this.keys,
      records: this.records,
    };
  }
}
//@ chunk-z20c443b.js:30672-30847 esm-fingerprint
function createIndex(keys, docs, { getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {}) {
  let myIndex = new FuseIndex({
    getFn,
    fieldNormWeight,
  });
  myIndex.setKeys(keys.map(createKey));
  myIndex.setSources(docs);
  myIndex.create();
  return myIndex;
}
//@ chunk-z20c443b.js:30847-31026 esm-fingerprint
function parseIndex(data, { getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {}) {
  let { keys, records } = data;
  let myIndex = new FuseIndex({
    getFn,
    fieldNormWeight,
  });
  myIndex.setKeys(keys);
  myIndex.setIndexRecords(records);
  return myIndex;
}
//@ chunk-z20c443b.js:31026-31239 esm-fingerprint
function computeScore$1(
  pattern,
  {
    errors = 0,
    currentLocation = 0,
    expectedLocation = 0,
    distance = Config.distance,
    ignoreLocation = Config.ignoreLocation,
  } = {},
) {
  let accuracy = errors / pattern.length;
  if (ignoreLocation) return accuracy;
  let proximity = Math.abs(expectedLocation - currentLocation);
  if (!distance) return proximity ? 1 : accuracy;
  return accuracy + proximity / distance;
}
//@ chunk-z20c443b.js:31239-31462 esm-fingerprint
function convertMaskToIndices(matchmask = [], minMatchCharLength = Config.minMatchCharLength) {
  let indices = [];
  let start = -1;
  let end = -1;
  let i = 0;
  for (let len = matchmask.length; i < len; i += 1) {
    let match = matchmask[i];
    if (match && start === -1) start = i;
    else if (!match && start !== -1) {
      end = i - 1;
      if (end - start + 1 >= minMatchCharLength) indices.push([start, end]);
      start = -1;
    }
  }
  if (matchmask[i - 1] && i - start >= minMatchCharLength) indices.push([start, i - 1]);
  return indices;
}
//@ chunk-z20c443b.js:31462-31472 esm-layout
var MAX_BITS = 32;
//@ chunk-z20c443b.js:31472-32827 esm-fingerprint
function search(
  text,
  pattern,
  patternAlphabet,
  {
    location = Config.location,
    distance = Config.distance,
    threshold = Config.threshold,
    findAllMatches = Config.findAllMatches,
    minMatchCharLength = Config.minMatchCharLength,
    includeMatches = Config.includeMatches,
    ignoreLocation = Config.ignoreLocation,
  } = {},
) {
  if (pattern.length > MAX_BITS) throw Error(PATTERN_LENGTH_TOO_LARGE(MAX_BITS));
  let patternLen = pattern.length;
  let textLen = text.length;
  let expectedLocation = Math.max(0, Math.min(location, textLen));
  let currentThreshold = threshold;
  let bestLocation = expectedLocation;
  let computeMatches = minMatchCharLength > 1 || includeMatches;
  let matchMask = computeMatches ? Array(textLen) : [];
  let index;
  while ((index = text.indexOf(pattern, bestLocation)) > -1) {
    let score = computeScore$1(pattern, {
      currentLocation: index,
      expectedLocation,
      distance,
      ignoreLocation,
    });
    currentThreshold = Math.min(score, currentThreshold);
    bestLocation = index + patternLen;
    if (computeMatches) {
      let i = 0;
      while (i < patternLen) {
        matchMask[index + i] = 1;
        i += 1;
      }
    }
  }
  bestLocation = -1;
  let lastBitArr = [];
  let finalScore = 1;
  let binMax = patternLen + textLen;
  let mask = 1 << (patternLen - 1);
  for (let i = 0; i < patternLen; i += 1) {
    let binMin = 0;
    let binMid = binMax;
    while (binMin < binMid) {
      if (
        computeScore$1(pattern, {
          errors: i,
          currentLocation: expectedLocation + binMid,
          expectedLocation,
          distance,
          ignoreLocation,
        }) <= currentThreshold
      )
        binMin = binMid;
      else binMax = binMid;
      binMid = Math.floor((binMax - binMin) / 2 + binMin);
    }
    binMax = binMid;
    let start = Math.max(1, expectedLocation - binMid + 1);
    let finish = findAllMatches ? textLen : Math.min(expectedLocation + binMid, textLen) + patternLen;
    let bitArr = Array(finish + 2);
    bitArr[finish + 1] = (1 << i) - 1;
    for (let textIdx = finish; textIdx >= start; textIdx -= 1) {
      let currentLocation = textIdx - 1;
      let charMatch = patternAlphabet[text.charAt(currentLocation)];
      if (computeMatches) matchMask[currentLocation] = +!!charMatch;
      bitArr[textIdx] = ((bitArr[textIdx + 1] << 1) | 1) & charMatch;
      if (i)
        bitArr[textIdx] |=
          ((lastBitArr[textIdx + 1] | lastBitArr[textIdx]) << 1) | 1 | lastBitArr[textIdx + 1];
      if (bitArr[textIdx] & mask) {
        finalScore = computeScore$1(pattern, {
          errors: i,
          currentLocation,
          expectedLocation,
          distance,
          ignoreLocation,
        });
        if (finalScore <= currentThreshold) {
          currentThreshold = finalScore;
          bestLocation = currentLocation;
          if (bestLocation <= expectedLocation) break;
          start = Math.max(1, 2 * expectedLocation - bestLocation);
        }
      }
    }
    if (
      computeScore$1(pattern, {
        errors: i + 1,
        currentLocation: expectedLocation,
        expectedLocation,
        distance,
        ignoreLocation,
      }) > currentThreshold
    )
      break;
    lastBitArr = bitArr;
  }
  let result = {
    isMatch: bestLocation >= 0,
    score: Math.max(0.001, finalScore),
  };
  if (computeMatches) {
    let indices = convertMaskToIndices(matchMask, minMatchCharLength);
    if (!indices.length) result.isMatch = false;
    else if (includeMatches) result.indices = indices;
  }
  return result;
}
//@ chunk-z20c443b.js:32827-32935 esm-fingerprint
function createPatternAlphabet(pattern) {
  let mask = {};
  for (let i = 0, len = pattern.length; i < len; i += 1) {
    let char = pattern.charAt(i);
    mask[char] = (mask[char] || 0) | (1 << (len - i - 1));
  }
  return mask;
}
//@ chunk-z20c443b.js:32935-34309 esm-fingerprint
class BitapSearch {
  constructor(
    pattern,
    {
      location = Config.location,
      threshold = Config.threshold,
      distance = Config.distance,
      includeMatches = Config.includeMatches,
      findAllMatches = Config.findAllMatches,
      minMatchCharLength = Config.minMatchCharLength,
      isCaseSensitive = Config.isCaseSensitive,
      ignoreLocation = Config.ignoreLocation,
    } = {},
  ) {
    this.options = {
      location,
      threshold,
      distance,
      includeMatches,
      findAllMatches,
      minMatchCharLength,
      isCaseSensitive,
      ignoreLocation,
    };
    this.pattern = isCaseSensitive ? pattern : pattern.toLowerCase();
    this.chunks = [];
    if (!this.pattern.length) return;
    let addChunk = (pattern, startIndex) => {
      this.chunks.push({
        pattern,
        alphabet: createPatternAlphabet(pattern),
        startIndex,
      });
    };
    let len = this.pattern.length;
    if (len > MAX_BITS) {
      let i = 0;
      let remainder = len % MAX_BITS;
      let end = len - remainder;
      while (i < end) {
        addChunk(this.pattern.substr(i, MAX_BITS), i);
        i += MAX_BITS;
      }
      if (remainder) {
        let startIndex = len - MAX_BITS;
        addChunk(this.pattern.substr(startIndex), startIndex);
      }
    } else addChunk(this.pattern, 0);
  }
  searchIn(text) {
    let { isCaseSensitive, includeMatches } = this.options;
    if (!isCaseSensitive) text = text.toLowerCase();
    if (this.pattern === text) {
      let result = {
        isMatch: true,
        score: 0,
      };
      if (includeMatches) result.indices = [[0, text.length - 1]];
      return result;
    }
    let { location, distance, threshold, findAllMatches, minMatchCharLength, ignoreLocation } = this.options;
    let allIndices = [];
    let totalScore = 0;
    let hasMatches = false;
    this.chunks.forEach(({ pattern, alphabet, startIndex }) => {
      let { isMatch, score, indices } = search(text, pattern, alphabet, {
        location: location + startIndex,
        distance,
        threshold,
        findAllMatches,
        minMatchCharLength,
        includeMatches,
        ignoreLocation,
      });
      if (isMatch) hasMatches = true;
      totalScore += score;
      if (isMatch && indices) allIndices = [...allIndices, ...indices];
    });
    let result = {
      isMatch: hasMatches,
      score: hasMatches ? totalScore / this.chunks.length : 1,
    };
    if (hasMatches && includeMatches) result.indices = allIndices;
    return result;
  }
}
//@ chunk-z20c443b.js:34309-34465 esm-fingerprint
class BaseMatch {
  constructor(pattern) {
    this.pattern = pattern;
  }
  static isMultiMatch(pattern) {
    return getMatch(pattern, this.multiRegex);
  }
  static isSingleMatch(pattern) {
    return getMatch(pattern, this.singleRegex);
  }
  search() {}
}
//@ chunk-z20c443b.js:34465-34518 esm-layout
function getMatch(pattern, exp) {
  let matches = pattern.match(exp);
  return matches ? matches[1] : null;
}
//@ chunk-z20c443b.js:34518-34775 esm-fingerprint
let ExactMatch; // deferred: uses BaseMatch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:34518", () => {
  ExactMatch = class ExactMatch extends BaseMatch {
    constructor(pattern) {
      super(pattern);
    }
    static get type() {
      return "exact";
    }
    static get multiRegex() {
      return /^="(.*)"$/;
    }
    static get singleRegex() {
      return /^=(.*)$/;
    }
    search(text) {
      let isMatch = text === this.pattern;
      return {
        isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, this.pattern.length - 1],
      };
    }
  };
});
//@ chunk-z20c443b.js:34775-35041 esm-fingerprint
let InverseExactMatch; // deferred: uses BaseMatch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:34775", () => {
  InverseExactMatch = class InverseExactMatch extends BaseMatch {
    constructor(pattern) {
      super(pattern);
    }
    static get type() {
      return "inverse-exact";
    }
    static get multiRegex() {
      return /^!"(.*)"$/;
    }
    static get singleRegex() {
      return /^!(.*)$/;
    }
    search(text) {
      let isMatch = text.indexOf(this.pattern) === -1;
      return {
        isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, text.length - 1],
      };
    }
  };
});
//@ chunk-z20c443b.js:35041-35317 esm-fingerprint
let PrefixExactMatch; // deferred: uses BaseMatch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:35041", () => {
  PrefixExactMatch = class PrefixExactMatch extends BaseMatch {
    constructor(pattern) {
      super(pattern);
    }
    static get type() {
      return "prefix-exact";
    }
    static get multiRegex() {
      return /^\^"(.*)"$/;
    }
    static get singleRegex() {
      return /^\^(.*)$/;
    }
    search(text) {
      let isMatch = text.startsWith(this.pattern);
      return {
        isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, this.pattern.length - 1],
      };
    }
  };
});
//@ chunk-z20c443b.js:35317-35593 esm-fingerprint
let InversePrefixExactMatch; // deferred: uses BaseMatch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:35317", () => {
  InversePrefixExactMatch = class InversePrefixExactMatch extends BaseMatch {
    constructor(pattern) {
      super(pattern);
    }
    static get type() {
      return "inverse-prefix-exact";
    }
    static get multiRegex() {
      return /^!\^"(.*)"$/;
    }
    static get singleRegex() {
      return /^!\^(.*)$/;
    }
    search(text) {
      let isMatch = !text.startsWith(this.pattern);
      return {
        isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, text.length - 1],
      };
    }
  };
});
//@ chunk-z20c443b.js:35593-35883 esm-fingerprint
let SuffixExactMatch; // deferred: uses BaseMatch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:35593", () => {
  SuffixExactMatch = class SuffixExactMatch extends BaseMatch {
    constructor(pattern) {
      super(pattern);
    }
    static get type() {
      return "suffix-exact";
    }
    static get multiRegex() {
      return /^"(.*)"\$$/;
    }
    static get singleRegex() {
      return /^(.*)\$$/;
    }
    search(text) {
      let isMatch = text.endsWith(this.pattern);
      return {
        isMatch,
        score: isMatch ? 0 : 1,
        indices: [text.length - this.pattern.length, text.length - 1],
      };
    }
  };
});
//@ chunk-z20c443b.js:35883-36157 esm-fingerprint
let InverseSuffixExactMatch; // deferred: uses BaseMatch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:35883", () => {
  InverseSuffixExactMatch = class InverseSuffixExactMatch extends BaseMatch {
    constructor(pattern) {
      super(pattern);
    }
    static get type() {
      return "inverse-suffix-exact";
    }
    static get multiRegex() {
      return /^!"(.*)"\$$/;
    }
    static get singleRegex() {
      return /^!(.*)\$$/;
    }
    search(text) {
      let isMatch = !text.endsWith(this.pattern);
      return {
        isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, text.length - 1],
      };
    }
  };
});
//@ chunk-z20c443b.js:36157-36777 esm-fingerprint
let FuzzyMatch; // deferred: uses BaseMatch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:36157", () => {
  FuzzyMatch = class FuzzyMatch extends BaseMatch {
    constructor(
      pattern,
      {
        location = Config.location,
        threshold = Config.threshold,
        distance = Config.distance,
        includeMatches = Config.includeMatches,
        findAllMatches = Config.findAllMatches,
        minMatchCharLength = Config.minMatchCharLength,
        isCaseSensitive = Config.isCaseSensitive,
        ignoreLocation = Config.ignoreLocation,
      } = {},
    ) {
      super(pattern);
      this._bitapSearch = new BitapSearch(pattern, {
        location,
        threshold,
        distance,
        includeMatches,
        findAllMatches,
        minMatchCharLength,
        isCaseSensitive,
        ignoreLocation,
      });
    }
    static get type() {
      return "fuzzy";
    }
    static get multiRegex() {
      return /^"(.*)"$/;
    }
    static get singleRegex() {
      return /^(.*)$/;
    }
    search(text) {
      return this._bitapSearch.searchIn(text);
    }
  };
});
//@ chunk-z20c443b.js:36777-37104 esm-fingerprint
let IncludeMatch; // deferred: uses BaseMatch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:36777", () => {
  IncludeMatch = class IncludeMatch extends BaseMatch {
    constructor(pattern) {
      super(pattern);
    }
    static get type() {
      return "include";
    }
    static get multiRegex() {
      return /^'"(.*)"$/;
    }
    static get singleRegex() {
      return /^'(.*)$/;
    }
    search(text) {
      let location = 0;
      let index;
      let indices = [];
      let patternLen = this.pattern.length;
      while ((index = text.indexOf(this.pattern, location)) > -1) {
        location = index + patternLen;
        indices.push([index, location - 1]);
      }
      let isMatch = !!indices.length;
      return {
        isMatch,
        score: isMatch ? 0 : 1,
        indices,
      };
    }
  };
});
//@ chunk-z20c443b.js:37104-37197 esm-layout
var searchers; // deferred: uses ExactMatch of its import cycle while loading; runs once the cycle is complete
var searchersLen;
var SPACE_RE;
var OR_TOKEN;
deferInit("chunk-z20c443b.js:37104", () => {
  searchers = [
    ExactMatch,
    IncludeMatch,
    PrefixExactMatch,
    InversePrefixExactMatch,
    InverseSuffixExactMatch,
    SuffixExactMatch,
    InverseExactMatch,
    FuzzyMatch,
  ];
  searchersLen = searchers.length;
  SPACE_RE = / +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/;
  OR_TOKEN = "|";
});
//@ chunk-z20c443b.js:37197-37546 esm-fingerprint
function parseQuery(pattern, options = {}) {
  return pattern.split(OR_TOKEN).map((item) => {
    let query = item
      .trim()
      .split(SPACE_RE)
      .filter((item) => item && !!item.trim());
    let results = [];
    for (let i = 0, len = query.length; i < len; i += 1) {
      let queryItem = query[i];
      let found = false;
      let idx = -1;
      while (!found && ++idx < searchersLen) {
        let searcher = searchers[idx];
        let token = searcher.isMultiMatch(queryItem);
        if (token) {
          results.push(new searcher(token, options));
          found = true;
        }
      }
      if (found) continue;
      idx = -1;
      while (++idx < searchersLen) {
        let searcher = searchers[idx];
        let token = searcher.isSingleMatch(queryItem);
        if (token) {
          results.push(new searcher(token, options));
          break;
        }
      }
    }
    return results;
  });
}
//@ chunk-z20c443b.js:37546-37580 esm-layout
var MultiMatchSet; // deferred: uses FuzzyMatch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:37546", () => {
  MultiMatchSet = new Set([FuzzyMatch.type, IncludeMatch.type]);
});
//@ chunk-z20c443b.js:37580-38653 esm-fingerprint
class ExtendedSearch {
  constructor(
    pattern,
    {
      isCaseSensitive = Config.isCaseSensitive,
      includeMatches = Config.includeMatches,
      minMatchCharLength = Config.minMatchCharLength,
      ignoreLocation = Config.ignoreLocation,
      findAllMatches = Config.findAllMatches,
      location = Config.location,
      threshold = Config.threshold,
      distance = Config.distance,
    } = {},
  ) {
    this.query = null;
    this.options = {
      isCaseSensitive,
      includeMatches,
      minMatchCharLength,
      findAllMatches,
      ignoreLocation,
      location,
      threshold,
      distance,
    };
    this.pattern = isCaseSensitive ? pattern : pattern.toLowerCase();
    this.query = parseQuery(this.pattern, this.options);
  }
  static condition(_, options) {
    return options.useExtendedSearch;
  }
  searchIn(text) {
    let query = this.query;
    if (!query)
      return {
        isMatch: false,
        score: 1,
      };
    let { includeMatches, isCaseSensitive } = this.options;
    text = isCaseSensitive ? text : text.toLowerCase();
    let numMatches = 0;
    let allIndices = [];
    let totalScore = 0;
    for (let i = 0, qLen = query.length; i < qLen; i += 1) {
      let searchers = query[i];
      allIndices.length = 0;
      numMatches = 0;
      for (let j = 0, pLen = searchers.length; j < pLen; j += 1) {
        let searcher = searchers[j];
        let { isMatch, indices, score } = searcher.search(text);
        if (isMatch) {
          numMatches += 1;
          totalScore += score;
          if (includeMatches) {
            let type = searcher.constructor.type;
            if (MultiMatchSet.has(type)) allIndices = [...allIndices, ...indices];
            else allIndices.push(indices);
          }
        } else {
          totalScore = 0;
          numMatches = 0;
          allIndices.length = 0;
          break;
        }
      }
      if (numMatches) {
        let result = {
          isMatch: true,
          score: totalScore / numMatches,
        };
        if (includeMatches) result.indices = allIndices;
        return result;
      }
    }
    return {
      isMatch: false,
      score: 1,
    };
  }
}
//@ chunk-z20c443b.js:38653-38663 esm-layout
var registeredSearchers = [];
//@ chunk-z20c443b.js:38663-38695 esm-layout
function register(...args) {
  registeredSearchers.push(...args);
}
//@ chunk-z20c443b.js:38695-38815 esm-fingerprint
function createSearcher(pattern, options) {
  for (let i = 0, len = registeredSearchers.length; i < len; i += 1) {
    let searcherClass = registeredSearchers[i];
    if (searcherClass.condition(pattern, options)) return new searcherClass(pattern, options);
  }
  return new BitapSearch(pattern, options);
}
//@ chunk-z20c443b.js:38815-39019 esm-fingerprint
var LogicalOperator = {
  AND: "$and",
  OR: "$or",
};
var KeyType = {
  PATH: "$path",
  PATTERN: "$val",
};
var isExpression = (query) => !!(query[LogicalOperator.AND] || query[LogicalOperator.OR]);
var isPath = (query) => !!query[KeyType.PATH];
var isLeaf = (query) => !isArrayInline(query) && isObject(query) && !isExpression(query);
var convertToExplicit = (query) => ({
  [LogicalOperator.AND]: Object.keys(query).map((key) => ({
    [key]: query[key],
  })),
});
//@ chunk-z20c443b.js:39019-39435 esm-fingerprint
function parse(query, options, { auto = true } = {}) {
  let next = (query) => {
    let keys = Object.keys(query);
    let isQueryPath = isPath(query);
    if (!isQueryPath && keys.length > 1 && !isExpression(query)) return next(convertToExplicit(query));
    if (isLeaf(query)) {
      let key = isQueryPath ? query[KeyType.PATH] : keys[0];
      let pattern = isQueryPath ? query[KeyType.PATTERN] : query[key];
      if (!isString(pattern)) throw Error(LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY(key));
      let obj = {
        keyId: createKeyId(key),
        pattern,
      };
      if (auto) obj.searcher = createSearcher(pattern, options);
      return obj;
    }
    let node = {
      children: [],
      operator: keys[0],
    };
    keys.forEach((key) => {
      let value = query[key];
      if (isArrayInline(value))
        value.forEach((item) => {
          node.children.push(next(item));
        });
    });
    return node;
  };
  if (!isExpression(query)) query = convertToExplicit(query);
  return next(query);
}
//@ chunk-z20c443b.js:39435-39648 esm-fingerprint
function computeScore(results, { ignoreFieldNorm = Config.ignoreFieldNorm }) {
  results.forEach((result) => {
    let totalScore = 1;
    result.matches.forEach(({ key, norm, score }) => {
      let weight = key ? key.weight : null;
      totalScore *= Math.pow(
        score === 0 && weight ? Number.EPSILON : score,
        (weight || 1) * (ignoreFieldNorm ? 1 : norm),
      );
    });
    result.score = totalScore;
  });
}
//@ chunk-z20c443b.js:39648-39892 esm-fingerprint
function transformMatches(result, data) {
  let matches = result.matches;
  data.matches = [];
  if (!isDefined(matches)) return;
  matches.forEach((match) => {
    if (!isDefined(match.indices) || !match.indices.length) return;
    let { indices, value } = match;
    let obj = {
      indices,
      value,
    };
    if (match.key) obj.key = match.key.src;
    if (match.idx > -1) obj.refIndex = match.idx;
    data.matches.push(obj);
  });
}
//@ chunk-z20c443b.js:39892-39925 esm-fingerprint
function transformScore(result, data) {
  data.score = result.score;
}
//@ chunk-z20c443b.js:39925-40159 esm-fingerprint
function format(
  results,
  docs,
  { includeMatches = Config.includeMatches, includeScore = Config.includeScore } = {},
) {
  let transformers = [];
  if (includeMatches) transformers.push(transformMatches);
  if (includeScore) transformers.push(transformScore);
  return results.map((result) => {
    let { idx } = result;
    let data = {
      item: docs[idx],
      refIndex: idx,
    };
    if (transformers.length)
      transformers.forEach((transformer) => {
        transformer(result, data);
      });
    return data;
  });
}
//@ chunk-z20c443b.js:40159-42668 esm-fingerprint
class Fuse {
  constructor(docs, options = {}, index) {
    this.options = {
      ...Config,
      ...options,
    };
    this.options.useExtendedSearch;
    this._keyStore = new KeyStore(this.options.keys);
    this.setCollection(docs, index);
  }
  setCollection(docs, index) {
    this._docs = docs;
    if (index && !(index instanceof FuseIndex)) throw Error(INCORRECT_INDEX_TYPE);
    this._myIndex =
      index ||
      createIndex(this.options.keys, this._docs, {
        getFn: this.options.getFn,
        fieldNormWeight: this.options.fieldNormWeight,
      });
  }
  add(doc) {
    if (!isDefined(doc)) return;
    this._docs.push(doc);
    this._myIndex.add(doc);
  }
  remove(predicate = () => false) {
    let results = [];
    for (let i = 0, len = this._docs.length; i < len; i += 1) {
      let doc = this._docs[i];
      if (predicate(doc, i)) {
        this.removeAt(i);
        i -= 1;
        len -= 1;
        results.push(doc);
      }
    }
    return results;
  }
  removeAt(idx) {
    this._docs.splice(idx, 1);
    this._myIndex.removeAt(idx);
  }
  getIndex() {
    return this._myIndex;
  }
  search(query, { limit = -1 } = {}) {
    let { includeMatches, includeScore, shouldSort, sortFn, ignoreFieldNorm } = this.options;
    let results = isString(query)
      ? isString(this._docs[0])
        ? this._searchStringList(query)
        : this._searchObjectList(query)
      : this._searchLogical(query);
    computeScore(results, {
      ignoreFieldNorm,
    });
    if (shouldSort) results.sort(sortFn);
    if (isNumber(limit) && limit > -1) results = results.slice(0, limit);
    return format(results, this._docs, {
      includeMatches,
      includeScore,
    });
  }
  _searchStringList(query) {
    let searcher = createSearcher(query, this.options);
    let { records } = this._myIndex;
    let results = [];
    records.forEach(({ v: text, i: idx, n: norm }) => {
      if (!isDefined(text)) return;
      let { isMatch, score, indices } = searcher.searchIn(text);
      if (isMatch)
        results.push({
          item: text,
          idx,
          matches: [
            {
              score,
              value: text,
              norm,
              indices,
            },
          ],
        });
    });
    return results;
  }
  _searchLogical(query) {
    let expression = parse(query, this.options);
    let evaluate = (node, item, idx) => {
      if (!node.children) {
        let { keyId, searcher } = node;
        let matches = this._findMatches({
          key: this._keyStore.get(keyId),
          value: this._myIndex.getValueForItemAtKeyId(item, keyId),
          searcher,
        });
        if (matches && matches.length)
          return [
            {
              idx,
              item,
              matches,
            },
          ];
        return [];
      }
      let res = [];
      for (let i = 0, len = node.children.length; i < len; i += 1) {
        let child = node.children[i];
        let result = evaluate(child, item, idx);
        if (result.length) res.push(...result);
        else if (node.operator === LogicalOperator.AND) return [];
      }
      return res;
    };
    let records = this._myIndex.records;
    let resultMap = {};
    let results = [];
    records.forEach(({ $: item, i: idx }) => {
      if (isDefined(item)) {
        let expResults = evaluate(expression, item, idx);
        if (expResults.length) {
          if (!resultMap[idx]) {
            resultMap[idx] = {
              idx,
              item,
              matches: [],
            };
            results.push(resultMap[idx]);
          }
          expResults.forEach(({ matches }) => {
            resultMap[idx].matches.push(...matches);
          });
        }
      }
    });
    return results;
  }
  _searchObjectList(query) {
    let searcher = createSearcher(query, this.options);
    let { keys, records } = this._myIndex;
    let results = [];
    records.forEach(({ $: item, i: idx }) => {
      if (!isDefined(item)) return;
      let matches = [];
      keys.forEach((key, keyIndex) => {
        matches.push(
          ...this._findMatches({
            key,
            value: item[keyIndex],
            searcher,
          }),
        );
      });
      if (matches.length)
        results.push({
          idx,
          item,
          matches,
        });
    });
    return results;
  }
  _findMatches({ key, value, searcher }) {
    if (!isDefined(value)) return [];
    let matches = [];
    if (isArrayInline(value))
      value.forEach(({ v: text, i: idx, n: norm }) => {
        if (!isDefined(text)) return;
        let { isMatch, score, indices } = searcher.searchIn(text);
        if (isMatch)
          matches.push({
            score,
            key,
            value: text,
            idx,
            norm,
            indices,
          });
      });
    else {
      let { v: text, n: norm } = value;
      let { isMatch, score, indices } = searcher.searchIn(text);
      if (isMatch)
        matches.push({
          score,
          key,
          value: text,
          norm,
          indices,
        });
    }
    return matches;
  }
}
//@ chunk-z20c443b.js:42668-42688 esm-fingerprint
// deferred: uses Fuse of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:42668", () => {
  Fuse.version = "7.0.0";
});
//@ chunk-z20c443b.js:42688-42707 esm-fingerprint
// deferred: uses Fuse of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:42688", () => {
  Fuse.createIndex = createIndex;
});
//@ chunk-z20c443b.js:42707-42725 esm-fingerprint
// deferred: uses Fuse of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:42707", () => {
  Fuse.parseIndex = parseIndex;
});
//@ chunk-z20c443b.js:42725-42739 esm-layout
// deferred: uses Fuse of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:42725", () => {
  Fuse.config = Config;
});
//@ chunk-z20c443b.js:42739-42757 esm-fingerprint
// deferred: uses Fuse of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:42739", () => {
  Fuse.parseQuery = parse;
});
//@ chunk-z20c443b.js:42757-42764 affinity
// deferred: uses register of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:42757", () => {
  register(ExtendedSearch);
});
export { Fuse, getTag };

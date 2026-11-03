/**
 * fuse.js/dist/fuse.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: fuse.js@7.0.0
 * pieces: chunk-dcmhvw5a.js (50)
 * attribution: affinity 3, esm-fingerprint 38, esm-layout 9
 */
import { Qe, ot, Ta, Gh, Bh, va } from "../../lodash-es/_inlinedHelpers.js";

//@ chunk-dcmhvw5a.js:27251-27294 affinity
function isDefined(value) {
  return value !== undefined && value !== null;
}
//@ chunk-dcmhvw5a.js:27294-27332 affinity
function isBlank(value) {
  return !value.trim().length;
}
//@ chunk-dcmhvw5a.js:27332-27444 esm-fingerprint
function getTag(value) {
  return value == null
    ? value === undefined
      ? "[object Undefined]"
      : "[object Null]"
    : Object.prototype.toString.call(value);
}
//@ chunk-dcmhvw5a.js:27444-27702 esm-fingerprint
var INCORRECT_INDEX_TYPE = "Incorrect 'index' type";
var LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY = (key) => `Invalid value for key ${key}`;
var PATTERN_LENGTH_TOO_LARGE = (max) => `Pattern length exceeds max of ${max}.`;
var MISSING_KEY_PROPERTY = (name) => `Missing ${name} property in key`;
var INVALID_KEY_WEIGHT_VALUE = (key) => `Property 'weight' in key '${key}' must be a positive integer`;
var hasOwn = Object.prototype.hasOwnProperty;
//@ chunk-dcmhvw5a.js:27702-27984 esm-fingerprint
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
//@ chunk-dcmhvw5a.js:27984-28270 esm-fingerprint
function createKey(key) {
  let path = null;
  let id = null;
  let src = null;
  let weight = 1;
  let getFn = null;
  if (Qe(key) || ot(key)) {
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
//@ chunk-dcmhvw5a.js:28270-28313 esm-layout
function createKeyPath(key) {
  return ot(key) ? key : key.split(".");
}
//@ chunk-dcmhvw5a.js:28313-28355 esm-layout
function createKeyId(key) {
  return ot(key) ? key.join(".") : key;
}
//@ chunk-dcmhvw5a.js:28355-28669 esm-fingerprint
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
      if (index === path.length - 1 && (Qe(value) || Ta(value) || Gh(value))) list.push(Bh(value));
      else if (ot(value)) {
        arr = true;
        for (let i = 0, len = value.length; i < len; i += 1) deepGet(value[i], path, index + 1);
      } else if (path.length) deepGet(value, path, index + 1);
    }
  };
  deepGet(obj, Qe(path) ? path.split(".") : path, 0);
  return arr ? list : list[0];
}
//@ chunk-dcmhvw5a.js:28669-29041 esm-fingerprint
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
//@ chunk-dcmhvw5a.js:29041-29259 esm-fingerprint
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
//@ chunk-dcmhvw5a.js:29259-30662 esm-fingerprint
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
    if (Qe(this.docs[0]))
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
    if (Qe(doc)) this._addString(doc, idx);
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
      if (ot(value)) {
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
          if (Qe(value) && !isBlank(value)) {
            let subRecord = {
              v: value,
              i: nestedArrIndex,
              n: this.norm.get(value),
            };
            subRecords.push(subRecord);
          } else if (ot(value))
            value.forEach((item, k) => {
              stack.push({
                nestedArrIndex: k,
                value: item,
              });
            });
        }
        record.$[keyIndex] = subRecords;
      } else if (Qe(value) && !isBlank(value)) {
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
//@ chunk-dcmhvw5a.js:30662-30837 esm-fingerprint
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
//@ chunk-dcmhvw5a.js:30837-31016 esm-fingerprint
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
//@ chunk-dcmhvw5a.js:31016-31229 esm-fingerprint
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
//@ chunk-dcmhvw5a.js:31229-31452 esm-fingerprint
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
//@ chunk-dcmhvw5a.js:31452-31462 esm-layout
var MAX_BITS = 32;
//@ chunk-dcmhvw5a.js:31462-32815 esm-fingerprint
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
    for (let j = finish; j >= start; j -= 1) {
      let currentLocation = j - 1;
      let charMatch = patternAlphabet[text.charAt(currentLocation)];
      if (computeMatches) matchMask[currentLocation] = +!!charMatch;
      bitArr[j] = ((bitArr[j + 1] << 1) | 1) & charMatch;
      if (i) bitArr[j] |= ((lastBitArr[j + 1] | lastBitArr[j]) << 1) | 1 | lastBitArr[j + 1];
      if (bitArr[j] & mask) {
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
//@ chunk-dcmhvw5a.js:32815-32923 esm-fingerprint
function createPatternAlphabet(pattern) {
  let mask = {};
  for (let i = 0, len = pattern.length; i < len; i += 1) {
    let char = pattern.charAt(i);
    mask[char] = (mask[char] || 0) | (1 << (len - i - 1));
  }
  return mask;
}
//@ chunk-dcmhvw5a.js:32923-34297 esm-fingerprint
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
//@ chunk-dcmhvw5a.js:34297-34453 esm-fingerprint
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
//@ chunk-dcmhvw5a.js:34453-34506 esm-layout
function getMatch(pattern, exp) {
  let matches = pattern.match(exp);
  return matches ? matches[1] : null;
}
//@ chunk-dcmhvw5a.js:34506-34763 esm-fingerprint
class ExactMatch extends BaseMatch {
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
}
//@ chunk-dcmhvw5a.js:34763-35029 esm-fingerprint
class InverseExactMatch extends BaseMatch {
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
}
//@ chunk-dcmhvw5a.js:35029-35305 esm-fingerprint
class PrefixExactMatch extends BaseMatch {
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
}
//@ chunk-dcmhvw5a.js:35305-35581 esm-fingerprint
class InversePrefixExactMatch extends BaseMatch {
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
}
//@ chunk-dcmhvw5a.js:35581-35871 esm-fingerprint
class SuffixExactMatch extends BaseMatch {
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
}
//@ chunk-dcmhvw5a.js:35871-36145 esm-fingerprint
class InverseSuffixExactMatch extends BaseMatch {
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
}
//@ chunk-dcmhvw5a.js:36145-36765 esm-fingerprint
class FuzzyMatch extends BaseMatch {
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
}
//@ chunk-dcmhvw5a.js:36765-37092 esm-fingerprint
class IncludeMatch extends BaseMatch {
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
}
//@ chunk-dcmhvw5a.js:37092-37185 esm-layout
var searchers = [
  ExactMatch,
  IncludeMatch,
  PrefixExactMatch,
  InversePrefixExactMatch,
  InverseSuffixExactMatch,
  SuffixExactMatch,
  InverseExactMatch,
  FuzzyMatch,
];
var searchersLen = searchers.length;
var SPACE_RE = / +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/;
var OR_TOKEN = "|";
//@ chunk-dcmhvw5a.js:37185-37534 esm-fingerprint
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
//@ chunk-dcmhvw5a.js:37534-37568 esm-layout
var MultiMatchSet = new Set([FuzzyMatch.type, IncludeMatch.type]);
//@ chunk-dcmhvw5a.js:37568-38641 esm-fingerprint
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
//@ chunk-dcmhvw5a.js:38641-38651 esm-layout
var registeredSearchers = [];
//@ chunk-dcmhvw5a.js:38651-38683 esm-layout
function register(...args) {
  registeredSearchers.push(...args);
}
//@ chunk-dcmhvw5a.js:38683-38803 esm-fingerprint
function createSearcher(pattern, options) {
  for (let i = 0, len = registeredSearchers.length; i < len; i += 1) {
    let searcherClass = registeredSearchers[i];
    if (searcherClass.condition(pattern, options)) return new searcherClass(pattern, options);
  }
  return new BitapSearch(pattern, options);
}
//@ chunk-dcmhvw5a.js:38803-39007 esm-fingerprint
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
var isLeaf = (query) => !ot(query) && va(query) && !isExpression(query);
var convertToExplicit = (query) => ({
  [LogicalOperator.AND]: Object.keys(query).map((key) => ({
    [key]: query[key],
  })),
});
//@ chunk-dcmhvw5a.js:39007-39423 esm-fingerprint
function parse(query, options, { auto = true } = {}) {
  let next = (query) => {
    let keys = Object.keys(query);
    let isQueryPath = isPath(query);
    if (!isQueryPath && keys.length > 1 && !isExpression(query)) return next(convertToExplicit(query));
    if (isLeaf(query)) {
      let key = isQueryPath ? query[KeyType.PATH] : keys[0];
      let pattern = isQueryPath ? query[KeyType.PATTERN] : query[key];
      if (!Qe(pattern)) throw Error(LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY(key));
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
      if (ot(value))
        value.forEach((item) => {
          node.children.push(next(item));
        });
    });
    return node;
  };
  if (!isExpression(query)) query = convertToExplicit(query);
  return next(query);
}
//@ chunk-dcmhvw5a.js:39423-39636 esm-fingerprint
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
//@ chunk-dcmhvw5a.js:39636-39880 esm-fingerprint
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
//@ chunk-dcmhvw5a.js:39880-39913 esm-fingerprint
function transformScore(result, data) {
  data.score = result.score;
}
//@ chunk-dcmhvw5a.js:39913-40147 esm-fingerprint
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
//@ chunk-dcmhvw5a.js:40147-42656 esm-fingerprint
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
    let results = Qe(query)
      ? Qe(this._docs[0])
        ? this._searchStringList(query)
        : this._searchObjectList(query)
      : this._searchLogical(query);
    computeScore(results, {
      ignoreFieldNorm,
    });
    if (shouldSort) results.sort(sortFn);
    if (Ta(limit) && limit > -1) results = results.slice(0, limit);
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
    if (ot(value))
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
//@ chunk-dcmhvw5a.js:42656-42676 esm-fingerprint
Fuse.version = "7.0.0";
//@ chunk-dcmhvw5a.js:42676-42695 esm-fingerprint
Fuse.createIndex = createIndex;
//@ chunk-dcmhvw5a.js:42695-42713 esm-fingerprint
Fuse.parseIndex = parseIndex;
//@ chunk-dcmhvw5a.js:42713-42727 esm-layout
Fuse.config = Config;
//@ chunk-dcmhvw5a.js:42727-42745 esm-fingerprint
Fuse.parseQuery = parse;
//@ chunk-dcmhvw5a.js:42745-42752 affinity
register(ExtendedSearch);
export { Fuse, getTag };

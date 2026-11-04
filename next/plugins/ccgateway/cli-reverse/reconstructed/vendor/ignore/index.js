/**
 * ignore/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ignore@7.0.5
 * pieces: chunk-82kqcve8.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-82kqcve8.js:4002-8454 cjs-fingerprint
var require_ignore = __commonJS(function (cjsExports, cjsModule) {
  function makeArray(subject) {
    return Array.isArray(subject) ? subject : [subject];
  }
  var UNDEFINED = undefined;
  var EMPTY = "";
  var SPACE = " ";
  var ESCAPE = "\\";
  var REGEX_TEST_BLANK_LINE = /^\s+$/;
  var REGEX_INVALID_TRAILING_BACKSLASH = /(?:[^\\]|^)\\$/;
  var REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/;
  var REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/;
  var REGEX_SPLITALL_CRLF = /\r?\n/g;
  var REGEX_TEST_INVALID_PATH = /^\.{0,2}\/|^\.{1,2}$/;
  var REGEX_TEST_TRAILING_SLASH = /\/$/;
  var SLASH = "/";
  var TMP_KEY_IGNORE = "node-ignore";
  if (typeof Symbol !== "undefined") TMP_KEY_IGNORE = Symbol.for("node-ignore");
  var KEY_IGNORE = TMP_KEY_IGNORE;
  var define = (object, key, value) => {
    Object.defineProperty(object, key, {
      value,
    });
    return value;
  };
  var REGEX_REGEXP_RANGE = /([0-z])-([0-z])/g;
  var RETURN_FALSE = () => false;
  var sanitizeRange = (range) =>
    range.replace(REGEX_REGEXP_RANGE, (match, from, to) =>
      from.charCodeAt(0) <= to.charCodeAt(0) ? match : EMPTY,
    );
  var cleanRangeBackSlash = (slashes) => {
    let { length } = slashes;
    return slashes.slice(0, length - (length % 2));
  };
  var REPLACERS = [
    [/^\uFEFF/, () => EMPTY],
    [/((?:\\\\)*?)(\\?\s+)$/, (_, m1, m2) => m1 + (m2.indexOf("\\") === 0 ? SPACE : EMPTY)],
    [
      /(\\+?)\s/g,
      (_, m1) => {
        let { length } = m1;
        return m1.slice(0, length - (length % 2)) + SPACE;
      },
    ],
    [/[\\$.|*+(){^]/g, (match) => `\\${match}`],
    [/(?!\\)\?/g, () => "[^/]"],
    [/^\//, () => "^"],
    [/\//g, () => "\\/"],
    [/^\^*\\\*\\\*\\\//, () => "^(?:.*\\/)?"],
    [
      /^(?=[^^])/,
      function () {
        return !/\/(?!$)/.test(this) ? "(?:^|\\/)" : "^";
      },
    ],
    [/\\\/\\\*\\\*(?=\\\/|$)/g, (_, index, str) => (index + 6 < str.length ? "(?:\\/[^\\/]+)*" : "\\/.+")],
    [
      /(^|[^\\]+)(\\\*)+(?=.+)/g,
      (_, p1, p2) => {
        let unescaped = p2.replace(/\\\*/g, "[^\\/]*");
        return p1 + unescaped;
      },
    ],
    [/\\\\\\(?=[$.|*+(){^])/g, () => ESCAPE],
    [/\\\\/g, () => ESCAPE],
    [
      /(\\)?\[([^\]/]*?)(\\*)($|\])/g,
      (match, leadEscape, range, endEscape, close) =>
        leadEscape === ESCAPE
          ? `\\[${range}${cleanRangeBackSlash(endEscape)}${close}`
          : close === "]"
            ? endEscape.length % 2 === 0
              ? `[${sanitizeRange(range)}${endEscape}]`
              : "[]"
            : "[]",
    ],
    [/(?:[^*])$/, (match) => (/\/$/.test(match) ? `${match}$` : `${match}(?=$|\\/$)`)],
  ];
  var REGEX_REPLACE_TRAILING_WILDCARD = /(^|\\\/)?\\\*$/;
  var MODE_IGNORE = "regex";
  var MODE_CHECK_IGNORE = "checkRegex";
  var UNDERSCORE = "_";
  var TRAILING_WILD_CARD_REPLACERS = {
    [MODE_IGNORE](_, p1) {
      return `${p1 ? `${p1}[^/]+` : "[^/]*"}(?=$|\\/$)`;
    },
    [MODE_CHECK_IGNORE](_, p1) {
      return `${p1 ? `${p1}[^/]*` : "[^/]*"}(?=$|\\/$)`;
    },
  };
  var makeRegexPrefix = (pattern) =>
    REPLACERS.reduce((prev, [matcher, replacer]) => prev.replace(matcher, replacer.bind(pattern)), pattern);
  var isString = (subject) => typeof subject === "string";
  var checkPattern = (pattern) =>
    pattern &&
    isString(pattern) &&
    !REGEX_TEST_BLANK_LINE.test(pattern) &&
    !REGEX_INVALID_TRAILING_BACKSLASH.test(pattern) &&
    pattern.indexOf("#") !== 0;
  var splitPattern = (pattern) => pattern.split(REGEX_SPLITALL_CRLF).filter(Boolean);
  class IgnoreRule {
    constructor(pattern, mark, body, ignoreCase, negative, prefix) {
      this.pattern = pattern;
      this.mark = mark;
      this.negative = negative;
      define(this, "body", body);
      define(this, "ignoreCase", ignoreCase);
      define(this, "regexPrefix", prefix);
    }
    get regex() {
      let key = UNDERSCORE + MODE_IGNORE;
      if (this[key]) return this[key];
      return this._make(MODE_IGNORE, key);
    }
    get checkRegex() {
      let key = UNDERSCORE + MODE_CHECK_IGNORE;
      if (this[key]) return this[key];
      return this._make(MODE_CHECK_IGNORE, key);
    }
    _make(mode, key) {
      let str = this.regexPrefix.replace(REGEX_REPLACE_TRAILING_WILDCARD, TRAILING_WILD_CARD_REPLACERS[mode]);
      let regex = this.ignoreCase ? new RegExp(str, "i") : new RegExp(str);
      return define(this, key, regex);
    }
  }
  var createRule = ({ pattern, mark }, ignoreCase) => {
    let negative = false;
    let body = pattern;
    if (body.indexOf("!") === 0) {
      negative = true;
      body = body.substr(1);
    }
    body = body
      .replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, "!")
      .replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, "#");
    let regexPrefix = makeRegexPrefix(body);
    return new IgnoreRule(pattern, mark, body, ignoreCase, negative, regexPrefix);
  };
  class RuleManager {
    constructor(ignoreCase) {
      this._ignoreCase = ignoreCase;
      this._rules = [];
    }
    _add(pattern) {
      if (pattern && pattern[KEY_IGNORE]) {
        this._rules = this._rules.concat(pattern._rules._rules);
        this._added = true;
        return;
      }
      if (isString(pattern))
        pattern = {
          pattern,
        };
      if (checkPattern(pattern.pattern)) {
        let rule = createRule(pattern, this._ignoreCase);
        this._added = true;
        this._rules.push(rule);
      }
    }
    add(pattern) {
      this._added = false;
      makeArray(isString(pattern) ? splitPattern(pattern) : pattern).forEach(this._add, this);
      return this._added;
    }
    test(path, checkUnignored, mode) {
      let ignored = false;
      let unignored = false;
      let matchedRule;
      this._rules.forEach((rule) => {
        let { negative } = rule;
        if (
          (unignored === negative && ignored !== unignored) ||
          (negative && !ignored && !unignored && !checkUnignored)
        )
          return;
        if (!rule[mode].test(path)) return;
        ignored = !negative;
        unignored = negative;
        matchedRule = negative ? UNDEFINED : rule;
      });
      let ret = {
        ignored,
        unignored,
      };
      if (matchedRule) ret.rule = matchedRule;
      return ret;
    }
  }
  var throwError = (message, Ctor) => {
    throw new Ctor(message);
  };
  var checkPath = (path, originalPath, doThrow) => {
    if (!isString(path)) return doThrow(`path must be a string, but got \`${originalPath}\``, TypeError);
    if (!path) return doThrow("path must not be empty", TypeError);
    if (checkPath.isNotRelative(path))
      return doThrow(`path should be a \`path.relative()\`d string, but got "${originalPath}"`, RangeError);
    return true;
  };
  var isNotRelative = (path) => REGEX_TEST_INVALID_PATH.test(path);
  checkPath.isNotRelative = isNotRelative;
  checkPath.convert = (p) => p;
  class Ignore {
    constructor({ ignorecase = true, ignoreCase = ignorecase, allowRelativePaths = false } = {}) {
      define(this, KEY_IGNORE, true);
      this._rules = new RuleManager(ignoreCase);
      this._strictPathCheck = !allowRelativePaths;
      this._initCache();
    }
    _initCache() {
      this._ignoreCache = Object.create(null);
      this._testCache = Object.create(null);
    }
    add(pattern) {
      if (this._rules.add(pattern)) this._initCache();
      return this;
    }
    addPattern(pattern) {
      return this.add(pattern);
    }
    _test(originalPath, cache, checkUnignored, slices) {
      let path = originalPath && checkPath.convert(originalPath);
      checkPath(path, originalPath, this._strictPathCheck ? throwError : RETURN_FALSE);
      return this._t(path, cache, checkUnignored, slices);
    }
    checkIgnore(path) {
      if (!REGEX_TEST_TRAILING_SLASH.test(path)) return this.test(path);
      let slices = path.split(SLASH).filter(Boolean);
      slices.pop();
      if (slices.length) {
        let parent = this._t(slices.join(SLASH) + SLASH, this._testCache, true, slices);
        if (parent.ignored) return parent;
      }
      return this._rules.test(path, false, MODE_CHECK_IGNORE);
    }
    _t(path, cache, checkUnignored, slices) {
      if (path in cache) return cache[path];
      if (!slices) slices = path.split(SLASH).filter(Boolean);
      slices.pop();
      if (!slices.length) return (cache[path] = this._rules.test(path, checkUnignored, MODE_IGNORE));
      let parent = this._t(slices.join(SLASH) + SLASH, cache, checkUnignored, slices);
      return (cache[path] = parent.ignored ? parent : this._rules.test(path, checkUnignored, MODE_IGNORE));
    }
    ignores(path) {
      return this._test(path, this._ignoreCache, false).ignored;
    }
    createFilter() {
      return (path) => !this.ignores(path);
    }
    filter(paths) {
      return makeArray(paths).filter(this.createFilter());
    }
    test(path) {
      return this._test(path, this._testCache, true);
    }
  }
  var factory = (options) => new Ignore(options);
  var isPathValid = (path) => checkPath(path && checkPath.convert(path), path, RETURN_FALSE);
  var setupWindows = () => {
    let makePosix = (str) =>
      /^\\\\\?\\/.test(str) || /["<>|\u0000-\u001F]+/u.test(str) ? str : str.replace(/\\/g, "/");
    checkPath.convert = makePosix;
    let REGEX_TEST_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
    checkPath.isNotRelative = (path) => REGEX_TEST_WINDOWS_PATH_ABSOLUTE.test(path) || isNotRelative(path);
  };
  cjsModule.exports = factory;
  factory.default = factory;
  cjsModule.exports.isPathValid = isPathValid;
  define(cjsModule.exports, Symbol.for("setupWindows"), setupWindows);
});
export { require_ignore };

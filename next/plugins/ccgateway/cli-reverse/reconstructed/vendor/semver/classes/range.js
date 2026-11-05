/**
 * semver/classes/range.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_lrucache } from "../internal/lrucache.js";
import { require_parse_options } from "../internal/parse-options.js";
import { require_comparator } from "./comparator.js";
import { require_debug } from "../internal/debug.js";
import { require_semver } from "./semver.js";
import { require_re } from "../internal/re.js";
import { require_constants } from "../internal/constants.js";

//@ chunk-7kayq7nc.js:14298-19854 cjs-fingerprint
var require_range = __commonJS(function (cjsExports, cjsModule) {
  var SPACE_CHARACTERS = /\s+/g;
  class Range {
    constructor(range, options) {
      options = parseOptions(options);
      if (range instanceof Range)
        if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease)
          return range;
        else return new Range(range.raw, options);
      if (range instanceof Comparator) {
        this.raw = range.value;
        this.set = [[range]];
        this.formatted = undefined;
        return this;
      }
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
      this.set = this.raw
        .split("||")
        .map((r) => this.parseRange(r.trim()))
        .filter((c) => c.length);
      if (!this.set.length) throw TypeError(`Invalid SemVer Range: ${this.raw}`);
      if (this.set.length > 1) {
        let first = this.set[0];
        this.set = this.set.filter((c) => !isNullSet(c[0]));
        if (this.set.length === 0) this.set = [first];
        else if (this.set.length > 1) {
          for (let c of this.set)
            if (c.length === 1 && isAny(c[0])) {
              this.set = [c];
              break;
            }
        }
      }
      this.formatted = undefined;
    }
    get range() {
      if (this.formatted === undefined) {
        this.formatted = "";
        for (let i = 0; i < this.set.length; i++) {
          if (i > 0) this.formatted += "||";
          let comps = this.set[i];
          for (let k = 0; k < comps.length; k++) {
            if (k > 0) this.formatted += " ";
            this.formatted += comps[k].toString().trim();
          }
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(range) {
      let memoKey =
        ((this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE)) +
        ":" +
        range;
      let cached = cache.get(memoKey);
      if (cached) return cached;
      let loose = this.options.loose;
      let hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
      range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
      debug("hyphen replace", range);
      range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
      debug("comparator trim", range);
      range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
      debug("tilde trim", range);
      range = range.replace(re[t.CARETTRIM], caretTrimReplace);
      debug("caret trim", range);
      let rangeList = range
        .split(" ")
        .map((comp) => parseComparator(comp, this.options))
        .join(" ")
        .split(/\s+/)
        .map((comp) => replaceGTE0(comp, this.options));
      if (loose)
        rangeList = rangeList.filter((comp) => {
          debug("loose invalid filter", comp, this.options);
          return !!comp.match(re[t.COMPARATORLOOSE]);
        });
      debug("range list", rangeList);
      let rangeMap = new Map();
      let comparators = rangeList.map((comp) => new Comparator(comp, this.options));
      for (let comp of comparators) {
        if (isNullSet(comp)) return [comp];
        rangeMap.set(comp.value, comp);
      }
      if (rangeMap.size > 1 && rangeMap.has("")) rangeMap.delete("");
      let result = [...rangeMap.values()];
      cache.set(memoKey, result);
      return result;
    }
    intersects(range, options) {
      if (!(range instanceof Range)) throw TypeError("a Range is required");
      return this.set.some(
        (thisComparators) =>
          isSatisfiable(thisComparators, options) &&
          range.set.some(
            (rangeComparators) =>
              isSatisfiable(rangeComparators, options) &&
              thisComparators.every((thisComparator) =>
                rangeComparators.every((rangeComparator) =>
                  thisComparator.intersects(rangeComparator, options),
                ),
              ),
          ),
      );
    }
    test(version) {
      if (!version) return false;
      if (typeof version === "string")
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      for (let i = 0; i < this.set.length; i++) if (testSet(this.set[i], version, this.options)) return true;
      return false;
    }
  }
  cjsModule.exports = Range;
  var LRU = require_lrucache();
  var cache = new LRU();
  var parseOptions = require_parse_options();
  var Comparator = require_comparator();
  var debug = require_debug();
  var SemVer = require_semver();
  var { safeRe: re, t, comparatorTrimReplace, tildeTrimReplace, caretTrimReplace } = require_re();
  var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
  var isNullSet = (c) => c.value === "<0.0.0-0";
  var isAny = (c) => c.value === "";
  var isSatisfiable = (comparators, options) => {
    let result = true;
    let remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while (result && remainingComparators.length) {
      result = remainingComparators.every((otherComparator) =>
        testComparator.intersects(otherComparator, options),
      );
      testComparator = remainingComparators.pop();
    }
    return result;
  };
  var parseComparator = (comp, options) => {
    comp = comp.replace(re[t.BUILD], "");
    debug("comp", comp, options);
    comp = replaceCarets(comp, options);
    debug("caret", comp);
    comp = replaceTildes(comp, options);
    debug("tildes", comp);
    comp = replaceXRanges(comp, options);
    debug("xrange", comp);
    comp = replaceStars(comp, options);
    debug("stars", comp);
    return comp;
  };
  var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
  var replaceTildes = (comp, options) =>
    comp
      .trim()
      .split(/\s+/)
      .map((c) => replaceTilde(c, options))
      .join(" ");
  var replaceTilde = (comp, options) => {
    let r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
    return comp.replace(r, (_, M, m_2, p, pr) => {
      debug("tilde", comp, _, M, m_2, p, pr);
      let ret;
      if (isX(M)) ret = "";
      else if (isX(m_2)) ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
      else if (isX(p)) ret = `>=${M}.${m_2}.0 <${M}.${+m_2 + 1}.0-0`;
      else if (pr) {
        debug("replaceTilde pr", pr);
        ret = `>=${M}.${m_2}.${p}-${pr} <${M}.${+m_2 + 1}.0-0`;
      } else ret = `>=${M}.${m_2}.${p} <${M}.${+m_2 + 1}.0-0`;
      debug("tilde return", ret);
      return ret;
    });
  };
  var replaceCarets = (comp, options) =>
    comp
      .trim()
      .split(/\s+/)
      .map((c) => replaceCaret(c, options))
      .join(" ");
  var replaceCaret = (comp, options) => {
    debug("caret", comp, options);
    let r_2 = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
    let z = options.includePrerelease ? "-0" : "";
    return comp.replace(r_2, (_, M, m_2, p, pr) => {
      debug("caret", comp, _, M, m_2, p, pr);
      let ret;
      if (isX(M)) ret = "";
      else if (isX(m_2)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
      else if (isX(p)) {
        if (M === "0") ret = `>=${M}.${m_2}.0${z} <${M}.${+m_2 + 1}.0-0`;
        else ret = `>=${M}.${m_2}.0${z} <${+M + 1}.0.0-0`;
      } else if (pr) {
        debug("replaceCaret pr", pr);
        if (M === "0") {
          if (m_2 === "0") ret = `>=${M}.${m_2}.${p}-${pr} <${M}.${m_2}.${+p + 1}-0`;
          else ret = `>=${M}.${m_2}.${p}-${pr} <${M}.${+m_2 + 1}.0-0`;
        } else ret = `>=${M}.${m_2}.${p}-${pr} <${+M + 1}.0.0-0`;
      } else {
        debug("no pr");
        if (M === "0") {
          if (m_2 === "0") ret = `>=${M}.${m_2}.${p}${z} <${M}.${m_2}.${+p + 1}-0`;
          else ret = `>=${M}.${m_2}.${p}${z} <${M}.${+m_2 + 1}.0-0`;
        } else ret = `>=${M}.${m_2}.${p} <${+M + 1}.0.0-0`;
      }
      debug("caret return", ret);
      return ret;
    });
  };
  var replaceXRanges = (comp, options) => {
    debug("replaceXRanges", comp, options);
    return comp
      .split(/\s+/)
      .map((c) => replaceXRange(c, options))
      .join(" ");
  };
  var replaceXRange = (comp, options) => {
    comp = comp.trim();
    let r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
    return comp.replace(r, (ret, gtlt, M, m_2, p, pr) => {
      debug("xRange", comp, ret, gtlt, M, m_2, p, pr);
      let xM = isX(M);
      let xm = xM || isX(m_2);
      let xp = xm || isX(p);
      let anyX = xp;
      if (gtlt === "=" && anyX) gtlt = "";
      pr = options.includePrerelease ? "-0" : "";
      if (xM) {
        if (gtlt === ">" || gtlt === "<") ret = "<0.0.0-0";
        else ret = "*";
      } else if (gtlt && anyX) {
        if (xm) m_2 = 0;
        p = 0;
        if (gtlt === ">") {
          gtlt = ">=";
          if (xm) {
            M = +M + 1;
            m_2 = 0;
            p = 0;
          } else {
            m_2 = +m_2 + 1;
            p = 0;
          }
        } else if (gtlt === "<=") {
          gtlt = "<";
          if (xm) M = +M + 1;
          else m_2 = +m_2 + 1;
        }
        if (gtlt === "<") pr = "-0";
        ret = `${gtlt + M}.${m_2}.${p}${pr}`;
      } else if (xm) ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
      else if (xp) ret = `>=${M}.${m_2}.0${pr} <${M}.${+m_2 + 1}.0-0`;
      debug("xRange return", ret);
      return ret;
    });
  };
  var replaceStars = (comp, options) => {
    debug("replaceStars", comp, options);
    return comp.trim().replace(re[t.STAR], "");
  };
  var replaceGTE0 = (comp, options) => {
    debug("replaceGTE0", comp, options);
    return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
  };
  var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
    if (isX(fM)) from = "";
    else if (isX(fm)) from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
    else if (isX(fp)) from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
    else if (fpr) from = `>=${from}`;
    else from = `>=${from}${incPr ? "-0" : ""}`;
    if (isX(tM)) to = "";
    else if (isX(tm)) to = `<${+tM + 1}.0.0-0`;
    else if (isX(tp)) to = `<${tM}.${+tm + 1}.0-0`;
    else if (tpr) to = `<=${tM}.${tm}.${tp}-${tpr}`;
    else if (incPr) to = `<${tM}.${tm}.${+tp + 1}-0`;
    else to = `<=${to}`;
    return `${from} ${to}`.trim();
  };
  var testSet = (set, version, options) => {
    for (let i = 0; i < set.length; i++) if (!set[i].test(version)) return false;
    if (version.prerelease.length && !options.includePrerelease) {
      for (let i = 0; i < set.length; i++) {
        debug(set[i].semver);
        if (set[i].semver === Comparator.ANY) continue;
        if (set[i].semver.prerelease.length > 0) {
          let allowed = set[i].semver;
          if (
            allowed.major === version.major &&
            allowed.minor === version.minor &&
            allowed.patch === version.patch
          )
            return true;
        }
      }
      return false;
    }
    return true;
  };
});
export { require_range };

/**
 * semver/ranges/subset.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_range } from "../classes/range.js";
import { require_comparator } from "../classes/comparator.js";
import { require_satisfies } from "../functions/satisfies.js";
import { require_compare } from "../functions/compare.js";

//@ chunk-7kayq7nc.js:24628-26877 cjs-fingerprint
var require_subset = __commonJS(function (cjsExports, cjsModule) {
  var Range = require_range();
  var Comparator = require_comparator();
  var { ANY } = Comparator;
  var satisfies = require_satisfies();
  var compare = require_compare();
  var subset = (sub, dom, options = {}) => {
    if (sub === dom) return true;
    sub = new Range(sub, options);
    dom = new Range(dom, options);
    let sawNonNull = false;
    e: for (let simpleSub of sub.set) {
      for (let simpleDom of dom.set) {
        let isSub = simpleSubset(simpleSub, simpleDom, options);
        sawNonNull = sawNonNull || isSub !== null;
        if (isSub) continue e;
      }
      if (sawNonNull) return false;
    }
    return true;
  };
  var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
  var minimumVersion = [new Comparator(">=0.0.0")];
  var simpleSubset = (sub, dom, options) => {
    if (sub === dom) return true;
    if (sub.length === 1 && sub[0].semver === ANY)
      if (dom.length === 1 && dom[0].semver === ANY) return true;
      else if (options.includePrerelease) sub = minimumVersionWithPreRelease;
      else sub = minimumVersion;
    if (dom.length === 1 && dom[0].semver === ANY)
      if (options.includePrerelease) return true;
      else dom = minimumVersion;
    let eqSet = new Set();
    let gt;
    let lt;
    for (let c of sub)
      if (c.operator === ">" || c.operator === ">=") gt = higherGT(gt, c, options);
      else if (c.operator === "<" || c.operator === "<=") lt = lowerLT(lt, c, options);
      else eqSet.add(c.semver);
    if (eqSet.size > 1) return null;
    let gtltComp;
    if (gt && lt) {
      gtltComp = compare(gt.semver, lt.semver, options);
      if (gtltComp > 0) return null;
      else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) return null;
    }
    for (let eq of eqSet) {
      if (gt && !satisfies(eq, String(gt), options)) return null;
      if (lt && !satisfies(eq, String(lt), options)) return null;
      for (let c of dom) if (!satisfies(eq, String(c), options)) return false;
      return true;
    }
    let higher;
    let lower;
    let hasDomLT;
    let hasDomGT;
    let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
    let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
    if (
      needDomLTPre &&
      needDomLTPre.prerelease.length === 1 &&
      lt.operator === "<" &&
      needDomLTPre.prerelease[0] === 0
    )
      needDomLTPre = false;
    for (let c of dom) {
      hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
      hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
      if (gt) {
        if (needDomGTPre) {
          if (
            c.semver.prerelease &&
            c.semver.prerelease.length &&
            c.semver.major === needDomGTPre.major &&
            c.semver.minor === needDomGTPre.minor &&
            c.semver.patch === needDomGTPre.patch
          )
            needDomGTPre = false;
        }
        if (c.operator === ">" || c.operator === ">=") {
          higher = higherGT(gt, c, options);
          if (higher === c && higher !== gt) return false;
        } else if (gt.operator === ">=" && !satisfies(gt.semver, String(c), options)) return false;
      }
      if (lt) {
        if (needDomLTPre) {
          if (
            c.semver.prerelease &&
            c.semver.prerelease.length &&
            c.semver.major === needDomLTPre.major &&
            c.semver.minor === needDomLTPre.minor &&
            c.semver.patch === needDomLTPre.patch
          )
            needDomLTPre = false;
        }
        if (c.operator === "<" || c.operator === "<=") {
          lower = lowerLT(lt, c, options);
          if (lower === c && lower !== lt) return false;
        } else if (lt.operator === "<=" && !satisfies(lt.semver, String(c), options)) return false;
      }
      if (!c.operator && (lt || gt) && gtltComp !== 0) return false;
    }
    if (gt && hasDomLT && !lt && gtltComp !== 0) return false;
    if (lt && hasDomGT && !gt && gtltComp !== 0) return false;
    if (needDomGTPre || needDomLTPre) return false;
    return true;
  };
  var higherGT = (a, b, options) => {
    if (!a) return b;
    let comp = compare(a.semver, b.semver, options);
    return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
  };
  var lowerLT = (a, b, options) => {
    if (!a) return b;
    let comp = compare(a.semver, b.semver, options);
    return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
  };
  cjsModule.exports = subset;
});
export { require_subset };

/**
 * semver/classes/comparator.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_parse_options } from "../internal/parse-options.js";
import { require_re } from "../internal/re.js";
import { require_cmp } from "../functions/cmp.js";
import { require_debug } from "../internal/debug.js";
import { require_semver } from "./semver.js";
import { require_range } from "./range.js";

//@ chunk-7kayq7nc.js:19854-21761 cjs-fingerprint
var require_comparator = __commonJS(function (cjsExports, cjsModule) {
  var ANY = Symbol("SemVer ANY");
  class Comparator {
    static get ANY() {
      return ANY;
    }
    constructor(comp, options) {
      options = parseOptions(options);
      if (comp instanceof Comparator)
        if (comp.loose === !!options.loose) return comp;
        else comp = comp.value;
      comp = comp.trim().split(/\s+/).join(" ");
      debug("comparator", comp, options);
      this.options = options;
      this.loose = !!options.loose;
      this.parse(comp);
      if (this.semver === ANY) this.value = "";
      else this.value = this.operator + this.semver.version;
      debug("comp", this);
    }
    parse(comp) {
      let r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
      let m = comp.match(r);
      if (!m) throw TypeError(`Invalid comparator: ${comp}`);
      this.operator = m[1] !== undefined ? m[1] : "";
      if (this.operator === "=") this.operator = "";
      if (!m[2]) this.semver = ANY;
      else this.semver = new SemVer(m[2], this.options.loose);
    }
    toString() {
      return this.value;
    }
    test(version) {
      debug("Comparator.test", version, this.options.loose);
      if (this.semver === ANY || version === ANY) return true;
      if (typeof version === "string")
        try {
          version = new SemVer(version, this.options);
        } catch (er) {
          return false;
        }
      return cmp(version, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
      if (!(comp instanceof Comparator)) throw TypeError("a Comparator is required");
      if (this.operator === "") {
        if (this.value === "") return true;
        return new Range(comp.value, options).test(this.value);
      } else if (comp.operator === "") {
        if (comp.value === "") return true;
        return new Range(this.value, options).test(comp.semver);
      }
      options = parseOptions(options);
      if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) return false;
      if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0")))
        return false;
      if (this.operator.startsWith(">") && comp.operator.startsWith(">")) return true;
      if (this.operator.startsWith("<") && comp.operator.startsWith("<")) return true;
      if (
        this.semver.version === comp.semver.version &&
        this.operator.includes("=") &&
        comp.operator.includes("=")
      )
        return true;
      if (
        cmp(this.semver, "<", comp.semver, options) &&
        this.operator.startsWith(">") &&
        comp.operator.startsWith("<")
      )
        return true;
      if (
        cmp(this.semver, ">", comp.semver, options) &&
        this.operator.startsWith("<") &&
        comp.operator.startsWith(">")
      )
        return true;
      return false;
    }
  }
  cjsModule.exports = Comparator;
  var parseOptions = require_parse_options();
  var { safeRe: re, t } = require_re();
  var cmp = require_cmp();
  var debug = require_debug();
  var SemVer = require_semver();
  var Range = require_range();
});
export { require_comparator };

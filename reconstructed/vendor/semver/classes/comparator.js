/**
 * semver/classes/comparator.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { as } from "../internal/parse-options.js";
import { Ye } from "../internal/re.js";
import { Mn } from "../functions/cmp.js";
import { St } from "../internal/debug.js";
import { G } from "./semver.js";
import { ee } from "./range.js";

//@ chunk-bwbq4xvm.js:19771-21678 cjs-fingerprint
var yt = x(function (w2, fl) {
  var At = Symbol("SemVer ANY");
  class bs {
    static get ANY() {
      return At;
    }
    constructor(e, s) {
      if (((s = ul(s)), e instanceof bs))
        if (e.loose === !!s.loose) return e;
        else e = e.value;
      if (
        ((e = e.trim().split(/\s+/).join(" ")),
        Dn("comparator", e, s),
        (this.options = s),
        (this.loose = !!s.loose),
        this.parse(e),
        this.semver === At)
      )
        this.value = "";
      else this.value = this.operator + this.semver.version;
      Dn("comp", this);
    }
    parse(e) {
      let s = this.options.loose ? safeRe[ml.COMPARATORLOOSE] : safeRe[ml.COMPARATOR],
        match = e.match(s);
      if (!match) throw TypeError(`Invalid comparator: ${e}`);
      if (((this.operator = match[1] !== void 0 ? match[1] : ""), this.operator === "=")) this.operator = "";
      if (!match[2]) this.semver = At;
      else this.semver = new _l(match[2], this.options.loose);
    }
    toString() {
      return this.value;
    }
    test(e) {
      if ((Dn("Comparator.test", e, this.options.loose), this.semver === At || e === At)) return !0;
      if (typeof e === "string")
        try {
          e = new _l(e, this.options);
        } catch (error) {
          return !1;
        }
      return xn(e, this.operator, this.semver, this.options);
    }
    intersects(e, s) {
      if (!(e instanceof bs)) throw TypeError("a Comparator is required");
      if (this.operator === "") {
        if (this.value === "") return !0;
        return new gl(e.value, s).test(this.value);
      } else if (e.operator === "") {
        if (e.value === "") return !0;
        return new gl(this.value, s).test(e.semver);
      }
      if (((s = ul(s)), s.includePrerelease && (this.value === "<0.0.0-0" || e.value === "<0.0.0-0")))
        return !1;
      if (!s.includePrerelease && (this.value.startsWith("<0.0.0") || e.value.startsWith("<0.0.0")))
        return !1;
      if (this.operator.startsWith(">") && e.operator.startsWith(">")) return !0;
      if (this.operator.startsWith("<") && e.operator.startsWith("<")) return !0;
      if (this.semver.version === e.semver.version && this.operator.includes("=") && e.operator.includes("="))
        return !0;
      if (xn(this.semver, "<", e.semver, s) && this.operator.startsWith(">") && e.operator.startsWith("<"))
        return !0;
      if (xn(this.semver, ">", e.semver, s) && this.operator.startsWith("<") && e.operator.startsWith(">"))
        return !0;
      return !1;
    }
  }
  fl.exports = bs;
  var ul = as(),
    { safeRe: safeRe, t: ml } = Ye(),
    xn = Mn(),
    Dn = St(),
    _l = G(),
    gl = ee();
});

export { yt };

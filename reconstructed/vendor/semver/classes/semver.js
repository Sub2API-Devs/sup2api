/**
 * semver/classes/semver.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { St } from "../internal/debug.js";
import { Et } from "../internal/constants.js";
import { Ye } from "../internal/re.js";
import { as } from "../internal/parse-options.js";
import { Cn } from "../internal/identifiers.js";

//@ chunk-bwbq4xvm.js:5826-10148 cjs-fingerprint
var G = x(function (X$, gi) {
  var is = St(),
    { MAX_LENGTH: MAX_LENGTH, MAX_SAFE_INTEGER: MAX_SAFE_INTEGER } = Et(),
    { safeRe: safeRe, t: cs } = Ye(),
    _v = as(),
    { compareIdentifiers: compareIdentifiers } = Cn();
  class ie {
    constructor(e, s) {
      if (((s = _v(s)), e instanceof ie))
        if (e.loose === !!s.loose && e.includePrerelease === !!s.includePrerelease) return e;
        else e = e.version;
      else if (typeof e !== "string")
        throw TypeError(`Invalid version. Must be a string. Got type "${typeof e}".`);
      if (e.length > MAX_LENGTH) throw TypeError(`version is longer than ${MAX_LENGTH} characters`);
      (is("SemVer", e, s),
        (this.options = s),
        (this.loose = !!s.loose),
        (this.includePrerelease = !!s.includePrerelease));
      let match = e.trim().match(s.loose ? safeRe[cs.LOOSE] : safeRe[cs.FULL]);
      if (!match) throw TypeError(`Invalid Version: ${e}`);
      if (
        ((this.raw = e),
        (this.major = +match[1]),
        (this.minor = +match[2]),
        (this.patch = +match[3]),
        this.major > MAX_SAFE_INTEGER || this.major < 0)
      )
        throw TypeError("Invalid major version");
      if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) throw TypeError("Invalid minor version");
      if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) throw TypeError("Invalid patch version");
      if (!match[4]) this.prerelease = [];
      else
        this.prerelease = match[4].split(".").map((r) => {
          if (/^[0-9]+$/.test(r)) {
            let a = +r;
            if (a >= 0 && a < MAX_SAFE_INTEGER) return a;
          }
          return r;
        });
      ((this.build = match[5] ? match[5].split(".") : []), this.format());
    }
    format() {
      if (((this.version = `${this.major}.${this.minor}.${this.patch}`), this.prerelease.length))
        this.version += `-${this.prerelease.join(".")}`;
      return this.version;
    }
    toString() {
      return this.version;
    }
    compare(e) {
      if ((is("SemVer.compare", this.version, this.options, e), !(e instanceof ie))) {
        if (typeof e === "string" && e === this.version) return 0;
        e = new ie(e, this.options);
      }
      if (e.version === this.version) return 0;
      return this.compareMain(e) || this.comparePre(e);
    }
    compareMain(e) {
      if (!(e instanceof ie)) e = new ie(e, this.options);
      if (this.major < e.major) return -1;
      if (this.major > e.major) return 1;
      if (this.minor < e.minor) return -1;
      if (this.minor > e.minor) return 1;
      if (this.patch < e.patch) return -1;
      if (this.patch > e.patch) return 1;
      return 0;
    }
    comparePre(e) {
      if (!(e instanceof ie)) e = new ie(e, this.options);
      if (this.prerelease.length && !e.prerelease.length) return -1;
      else if (!this.prerelease.length && e.prerelease.length) return 1;
      else if (!this.prerelease.length && !e.prerelease.length) return 0;
      let s = 0;
      do {
        let n = this.prerelease[s],
          r = e.prerelease[s];
        if ((is("prerelease compare", s, n, r), n === void 0 && r === void 0)) return 0;
        else if (r === void 0) return 1;
        else if (n === void 0) return -1;
        else if (n === r) continue;
        else return compareIdentifiers(n, r);
      } while (++s);
    }
    compareBuild(e) {
      if (!(e instanceof ie)) e = new ie(e, this.options);
      let s = 0;
      do {
        let n = this.build[s],
          r = e.build[s];
        if ((is("build compare", s, n, r), n === void 0 && r === void 0)) return 0;
        else if (r === void 0) return 1;
        else if (n === void 0) return -1;
        else if (n === r) continue;
        else return compareIdentifiers(n, r);
      } while (++s);
    }
    inc(e, s, n) {
      if (e.startsWith("pre")) {
        if (!s && n === !1) throw Error("invalid increment argument: identifier is empty");
        if (s) {
          let match = `-${s}`.match(this.options.loose ? safeRe[cs.PRERELEASELOOSE] : safeRe[cs.PRERELEASE]);
          if (!match || match[1] !== s) throw Error(`invalid identifier: ${s}`);
        }
      }
      switch (e) {
        case "premajor":
          ((this.prerelease.length = 0),
            (this.patch = 0),
            (this.minor = 0),
            this.major++,
            this.inc("pre", s, n));
          break;
        case "preminor":
          ((this.prerelease.length = 0), (this.patch = 0), this.minor++, this.inc("pre", s, n));
          break;
        case "prepatch":
          ((this.prerelease.length = 0), this.inc("patch", s, n), this.inc("pre", s, n));
          break;
        case "prerelease":
          if (this.prerelease.length === 0) this.inc("patch", s, n);
          this.inc("pre", s, n);
          break;
        case "release":
          if (this.prerelease.length === 0) throw Error(`version ${this.raw} is not a prerelease`);
          this.prerelease.length = 0;
          break;
        case "major":
          if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) this.major++;
          ((this.minor = 0), (this.patch = 0), (this.prerelease = []));
          break;
        case "minor":
          if (this.patch !== 0 || this.prerelease.length === 0) this.minor++;
          ((this.patch = 0), (this.prerelease = []));
          break;
        case "patch":
          if (this.prerelease.length === 0) this.patch++;
          this.prerelease = [];
          break;
        case "pre": {
          let r = Number(n) ? 1 : 0;
          if (this.prerelease.length === 0) this.prerelease = [r];
          else {
            let a = this.prerelease.length;
            while (--a >= 0) if (typeof this.prerelease[a] === "number") (this.prerelease[a]++, (a = -2));
            if (a === -1) {
              if (s === this.prerelease.join(".") && n === !1)
                throw Error("invalid increment argument: identifier already exists");
              this.prerelease.push(r);
            }
          }
          if (s) {
            let a = [s, r];
            if (n === !1) a = [s];
            if (compareIdentifiers(this.prerelease[0], s) === 0) {
              if (isNaN(this.prerelease[1])) this.prerelease = a;
            } else this.prerelease = a;
          }
          break;
        }
        default:
          throw Error(`invalid increment argument: ${e}`);
      }
      if (((this.raw = this.format()), this.build.length)) this.raw += `+${this.build.join(".")}`;
      return this;
    }
  }
  gi.exports = ie;
});

export { G };

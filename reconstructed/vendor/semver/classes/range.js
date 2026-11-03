/**
 * semver/classes/range.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { il } from "../internal/lrucache.js";
import { as } from "../internal/parse-options.js";
import { yt } from "./comparator.js";
import { St } from "../internal/debug.js";
import { G } from "./semver.js";
import { Ye } from "../internal/re.js";
import { Et } from "../internal/constants.js";

//@ chunk-bwbq4xvm.js:14215-19771 cjs-fingerprint
var ee = x(function (T2, hl) {
  var ck = /\s+/g;
  class wt {
    constructor(e, s) {
      if (((s = uk(s)), e instanceof wt))
        if (e.loose === !!s.loose && e.includePrerelease === !!s.includePrerelease) return e;
        else return new wt(e.raw, s);
      if (e instanceof fs) return ((this.raw = e.value), (this.set = [[e]]), (this.formatted = void 0), this);
      if (
        ((this.options = s),
        (this.loose = !!s.loose),
        (this.includePrerelease = !!s.includePrerelease),
        (this.raw = e.trim().replace(ck, " ")),
        (this.set = this.raw
          .split("||")
          .map((n) => this.parseRange(n.trim()))
          .filter((n) => n.length)),
        !this.set.length)
      )
        throw TypeError(`Invalid SemVer Range: ${this.raw}`);
      if (this.set.length > 1) {
        let n = this.set[0];
        if (((this.set = this.set.filter((r) => !dl(r[0]))), this.set.length === 0)) this.set = [n];
        else if (this.set.length > 1) {
          for (let r of this.set)
            if (r.length === 1 && Ek(r[0])) {
              this.set = [r];
              break;
            }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let e = 0; e < this.set.length; e++) {
          if (e > 0) this.formatted += "||";
          let s = this.set[e];
          for (let n = 0; n < s.length; n++) {
            if (n > 0) this.formatted += " ";
            this.formatted += s[n].toString().trim();
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
    parseRange(e) {
      let n =
          ((this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE)) +
          ":" +
          e,
        r = ll.get(n);
      if (r) return r;
      let loose = this.options.loose,
        l = loose ? safeRe[H.HYPHENRANGELOOSE] : safeRe[H.HYPHENRANGE];
      ((e = e.replace(l, Ck(this.options.includePrerelease))),
        N("hyphen replace", e),
        (e = e.replace(safeRe[H.COMPARATORTRIM], comparatorTrimReplace)),
        N("comparator trim", e),
        (e = e.replace(safeRe[H.TILDETRIM], tildeTrimReplace)),
        N("tilde trim", e),
        (e = e.replace(safeRe[H.CARETTRIM], caretTrimReplace)),
        N("caret trim", e));
      let mapped = e
        .split(" ")
        .map((w) => Sk(w, this.options))
        .join(" ")
        .split(/\s+/)
        .map((w) => zk(w, this.options));
      if (loose)
        mapped = mapped.filter(
          (w) => (N("loose invalid filter", w, this.options), !!w.match(safeRe[H.COMPARATORLOOSE])),
        );
      N("range list", mapped);
      let h = new Map(),
        mapped_2 = mapped.map((w) => new fs(w, this.options));
      for (let w of mapped_2) {
        if (dl(w)) return [w];
        h.set(w.value, w);
      }
      if (h.size > 1 && h.has("")) h.delete("");
      let f = [...h.values()];
      return (ll.set(n, f), f);
    }
    intersects(e, s) {
      if (!(e instanceof wt)) throw TypeError("a Range is required");
      return this.set.some(
        (n) => cl(n, s) && e.set.some((r) => cl(r, s) && n.every((a) => r.every((l) => a.intersects(l, s)))),
      );
    }
    test(e) {
      if (!e) return !1;
      if (typeof e === "string")
        try {
          e = new pk(e, this.options);
        } catch (error) {
          return !1;
        }
      for (let s = 0; s < this.set.length; s++) if (Ok(this.set[s], e, this.options)) return !0;
      return !1;
    }
  }
  hl.exports = wt;
  var hk = il(),
    ll = new hk(),
    uk = as(),
    fs = yt(),
    N = St(),
    pk = G(),
    {
      safeRe: safeRe,
      t: H,
      comparatorTrimReplace: comparatorTrimReplace,
      tildeTrimReplace: tildeTrimReplace,
      caretTrimReplace: caretTrimReplace,
    } = Ye(),
    { FLAG_INCLUDE_PRERELEASE: FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE: FLAG_LOOSE } = Et(),
    dl = (e) => e.value === "<0.0.0-0",
    Ek = (e) => e.value === "",
    cl = (e, s) => {
      let n = !0,
        sliced = e.slice(),
        a = sliced.pop();
      while (n && sliced.length) ((n = sliced.every((l) => a.intersects(l, s))), (a = sliced.pop()));
      return n;
    },
    Sk = (e, s) => (
      (e = e.replace(safeRe[H.BUILD], "")),
      N("comp", e, s),
      (e = yk(e, s)),
      N("caret", e),
      (e = Tk(e, s)),
      N("tildes", e),
      (e = Rk(e, s)),
      N("xrange", e),
      (e = kk(e, s)),
      N("stars", e),
      e
    ),
    F = (e) => !e || e.toLowerCase() === "x" || e === "*",
    Tk = (e, s) =>
      e
        .trim()
        .split(/\s+/)
        .map((n) => wk(n, s))
        .join(" "),
    wk = (e, s) => {
      let n = s.loose ? safeRe[H.TILDELOOSE] : safeRe[H.TILDE];
      return e.replace(n, (r, a, l, c, h) => {
        N("tilde", e, r, a, l, c, h);
        let m;
        if (F(a)) m = "";
        else if (F(l)) m = `>=${a}.0.0 <${+a + 1}.0.0-0`;
        else if (F(c)) m = `>=${a}.${l}.0 <${a}.${+l + 1}.0-0`;
        else if (h) (N("replaceTilde pr", h), (m = `>=${a}.${l}.${c}-${h} <${a}.${+l + 1}.0-0`));
        else m = `>=${a}.${l}.${c} <${a}.${+l + 1}.0-0`;
        return (N("tilde return", m), m);
      });
    },
    yk = (e, s) =>
      e
        .trim()
        .split(/\s+/)
        .map((n) => Ak(n, s))
        .join(" "),
    Ak = (e, s) => {
      N("caret", e, s);
      let n = s.loose ? safeRe[H.CARETLOOSE] : safeRe[H.CARET],
        r = s.includePrerelease ? "-0" : "";
      return e.replace(n, (a, l, c, h, m) => {
        N("caret", e, a, l, c, h, m);
        let f;
        if (F(l)) f = "";
        else if (F(c)) f = `>=${l}.0.0${r} <${+l + 1}.0.0-0`;
        else if (F(h))
          if (l === "0") f = `>=${l}.${c}.0${r} <${l}.${+c + 1}.0-0`;
          else f = `>=${l}.${c}.0${r} <${+l + 1}.0.0-0`;
        else if (m)
          if ((N("replaceCaret pr", m), l === "0"))
            if (c === "0") f = `>=${l}.${c}.${h}-${m} <${l}.${c}.${+h + 1}-0`;
            else f = `>=${l}.${c}.${h}-${m} <${l}.${+c + 1}.0-0`;
          else f = `>=${l}.${c}.${h}-${m} <${+l + 1}.0.0-0`;
        else if ((N("no pr"), l === "0"))
          if (c === "0") f = `>=${l}.${c}.${h}${r} <${l}.${c}.${+h + 1}-0`;
          else f = `>=${l}.${c}.${h}${r} <${l}.${+c + 1}.0-0`;
        else f = `>=${l}.${c}.${h} <${+l + 1}.0.0-0`;
        return (N("caret return", f), f);
      });
    },
    Rk = (e, s) => (
      N("replaceXRanges", e, s),
      e
        .split(/\s+/)
        .map((n) => vk(n, s))
        .join(" ")
    ),
    vk = (e, s) => {
      e = e.trim();
      let n = s.loose ? safeRe[H.XRANGELOOSE] : safeRe[H.XRANGE];
      return e.replace(n, (r, a, l, c, h, m) => {
        N("xRange", e, r, a, l, c, h, m);
        let f = F(l),
          w = f || F(c),
          z = w || F(h),
          I = z;
        if (a === "=" && I) a = "";
        if (((m = s.includePrerelease ? "-0" : ""), f))
          if (a === ">" || a === "<") r = "<0.0.0-0";
          else r = "*";
        else if (a && I) {
          if (w) c = 0;
          if (((h = 0), a === ">"))
            if (((a = ">="), w)) ((l = +l + 1), (c = 0), (h = 0));
            else ((c = +c + 1), (h = 0));
          else if (a === "<=")
            if (((a = "<"), w)) l = +l + 1;
            else c = +c + 1;
          if (a === "<") m = "-0";
          r = `${a + l}.${c}.${h}${m}`;
        } else if (w) r = `>=${l}.0.0${m} <${+l + 1}.0.0-0`;
        else if (z) r = `>=${l}.${c}.0${m} <${l}.${+c + 1}.0-0`;
        return (N("xRange return", r), r);
      });
    },
    kk = (e, s) => (N("replaceStars", e, s), e.trim().replace(safeRe[H.STAR], "")),
    zk = (e, s) => (
      N("replaceGTE0", e, s),
      e.trim().replace(safeRe[s.includePrerelease ? H.GTE0PRE : H.GTE0], "")
    ),
    Ck = (e) => (s, n, r, a, l, c, h, m, f, w, z, I) => {
      if (F(r)) n = "";
      else if (F(a)) n = `>=${r}.0.0${e ? "-0" : ""}`;
      else if (F(l)) n = `>=${r}.${a}.0${e ? "-0" : ""}`;
      else if (c) n = `>=${n}`;
      else n = `>=${n}${e ? "-0" : ""}`;
      if (F(f)) m = "";
      else if (F(w)) m = `<${+f + 1}.0.0-0`;
      else if (F(z)) m = `<${f}.${+w + 1}.0-0`;
      else if (I) m = `<=${f}.${w}.${z}-${I}`;
      else if (e) m = `<${f}.${w}.${+z + 1}-0`;
      else m = `<=${m}`;
      return `${n} ${m}`.trim();
    },
    Ok = (e, s, n) => {
      for (let r = 0; r < e.length; r++) if (!e[r].test(s)) return !1;
      if (s.prerelease.length && !n.includePrerelease) {
        for (let r = 0; r < e.length; r++) {
          if ((N(e[r].semver), e[r].semver === fs.ANY)) continue;
          if (e[r].semver.prerelease.length > 0) {
            let semver = e[r].semver;
            if (semver.major === s.major && semver.minor === s.minor && semver.patch === s.patch) return !0;
          }
        }
        return !1;
      }
      return !0;
    };
});

export { ee };

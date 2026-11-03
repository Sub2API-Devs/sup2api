/**
 * semver/internal/re.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: semver@7.7.3..7.7.4
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Et } from "./constants.js";
import { St } from "./debug.js";

//@ chunk-bwbq4xvm.js:1947-5373 cjs-fingerprint
var Ye = x(function (ce, ci) {
  var {
      MAX_SAFE_COMPONENT_LENGTH: MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH: MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH: MAX_LENGTH,
    } = Et(),
    rv = St();
  ce = ci.exports = {};
  var ov = (ce.re = []),
    av = (ce.safeRe = []),
    b = (ce.src = []),
    iv = (ce.safeSrc = []),
    S = (ce.t = {}),
    lv = 0,
    zn = "[a-zA-Z0-9-]",
    dv = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [zn, MAX_SAFE_BUILD_LENGTH],
    ],
    cv = (e) => {
      for (let [s, n] of dv) e = e.split(`${s}*`).join(`${s}{0,${n}}`).split(`${s}+`).join(`${s}{1,${n}}`);
      return e;
    },
    v = (e, s, n) => {
      let r = cv(s),
        a = lv++;
      (rv(e, a, s),
        (S[e] = a),
        (b[a] = s),
        (iv[a] = r),
        (ov[a] = new RegExp(s, n ? "g" : void 0)),
        (av[a] = new RegExp(r, n ? "g" : void 0)));
    };
  v("NUMERICIDENTIFIER", "0|[1-9]\\d*");
  v("NUMERICIDENTIFIERLOOSE", "\\d+");
  v("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${zn}*`);
  v("MAINVERSION", `(${b[S.NUMERICIDENTIFIER]})\\.(${b[S.NUMERICIDENTIFIER]})\\.(${b[S.NUMERICIDENTIFIER]})`);
  v(
    "MAINVERSIONLOOSE",
    `(${b[S.NUMERICIDENTIFIERLOOSE]})\\.(${b[S.NUMERICIDENTIFIERLOOSE]})\\.(${b[S.NUMERICIDENTIFIERLOOSE]})`,
  );
  v("PRERELEASEIDENTIFIER", `(?:${b[S.NONNUMERICIDENTIFIER]}|${b[S.NUMERICIDENTIFIER]})`);
  v("PRERELEASEIDENTIFIERLOOSE", `(?:${b[S.NONNUMERICIDENTIFIER]}|${b[S.NUMERICIDENTIFIERLOOSE]})`);
  v("PRERELEASE", `(?:-(${b[S.PRERELEASEIDENTIFIER]}(?:\\.${b[S.PRERELEASEIDENTIFIER]})*))`);
  v("PRERELEASELOOSE", `(?:-?(${b[S.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${b[S.PRERELEASEIDENTIFIERLOOSE]})*))`);
  v("BUILDIDENTIFIER", `${zn}+`);
  v("BUILD", `(?:\\+(${b[S.BUILDIDENTIFIER]}(?:\\.${b[S.BUILDIDENTIFIER]})*))`);
  v("FULLPLAIN", `v?${b[S.MAINVERSION]}${b[S.PRERELEASE]}?${b[S.BUILD]}?`);
  v("FULL", `^${b[S.FULLPLAIN]}$`);
  v("LOOSEPLAIN", `[v=\\s]*${b[S.MAINVERSIONLOOSE]}${b[S.PRERELEASELOOSE]}?${b[S.BUILD]}?`);
  v("LOOSE", `^${b[S.LOOSEPLAIN]}$`);
  v("GTLT", "((?:<|>)?=?)");
  v("XRANGEIDENTIFIERLOOSE", `${b[S.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
  v("XRANGEIDENTIFIER", `${b[S.NUMERICIDENTIFIER]}|x|X|\\*`);
  v(
    "XRANGEPLAIN",
    `[v=\\s]*(${b[S.XRANGEIDENTIFIER]})(?:\\.(${b[S.XRANGEIDENTIFIER]})(?:\\.(${b[S.XRANGEIDENTIFIER]})(?:${b[S.PRERELEASE]})?${b[S.BUILD]}?)?)?`,
  );
  v(
    "XRANGEPLAINLOOSE",
    `[v=\\s]*(${b[S.XRANGEIDENTIFIERLOOSE]})(?:\\.(${b[S.XRANGEIDENTIFIERLOOSE]})(?:\\.(${b[S.XRANGEIDENTIFIERLOOSE]})(?:${b[S.PRERELEASELOOSE]})?${b[S.BUILD]}?)?)?`,
  );
  v("XRANGE", `^${b[S.GTLT]}\\s*${b[S.XRANGEPLAIN]}$`);
  v("XRANGELOOSE", `^${b[S.GTLT]}\\s*${b[S.XRANGEPLAINLOOSE]}$`);
  v(
    "COERCEPLAIN",
    `(^|[^\\d])(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`,
  );
  v("COERCE", `${b[S.COERCEPLAIN]}(?:$|[^\\d])`);
  v("COERCEFULL", b[S.COERCEPLAIN] + `(?:${b[S.PRERELEASE]})?(?:${b[S.BUILD]})?(?:$|[^\\d])`);
  v("COERCERTL", b[S.COERCE], !0);
  v("COERCERTLFULL", b[S.COERCEFULL], !0);
  v("LONETILDE", "(?:~>?)");
  v("TILDETRIM", `(\\s*)${b[S.LONETILDE]}\\s+`, !0);
  ce.tildeTrimReplace = "$1~";
  v("TILDE", `^${b[S.LONETILDE]}${b[S.XRANGEPLAIN]}$`);
  v("TILDELOOSE", `^${b[S.LONETILDE]}${b[S.XRANGEPLAINLOOSE]}$`);
  v("LONECARET", "(?:\\^)");
  v("CARETTRIM", `(\\s*)${b[S.LONECARET]}\\s+`, !0);
  ce.caretTrimReplace = "$1^";
  v("CARET", `^${b[S.LONECARET]}${b[S.XRANGEPLAIN]}$`);
  v("CARETLOOSE", `^${b[S.LONECARET]}${b[S.XRANGEPLAINLOOSE]}$`);
  v("COMPARATORLOOSE", `^${b[S.GTLT]}\\s*(${b[S.LOOSEPLAIN]})$|^$`);
  v("COMPARATOR", `^${b[S.GTLT]}\\s*(${b[S.FULLPLAIN]})$|^$`);
  v("COMPARATORTRIM", `(\\s*)${b[S.GTLT]}\\s*(${b[S.LOOSEPLAIN]}|${b[S.XRANGEPLAIN]})`, !0);
  ce.comparatorTrimReplace = "$1$2$3";
  v("HYPHENRANGE", `^\\s*(${b[S.XRANGEPLAIN]})\\s+-\\s+(${b[S.XRANGEPLAIN]})\\s*$`);
  v("HYPHENRANGELOOSE", `^\\s*(${b[S.XRANGEPLAINLOOSE]})\\s+-\\s+(${b[S.XRANGEPLAINLOOSE]})\\s*$`);
  v("STAR", "(<|>)?=?\\s*\\*");
  v("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
  v("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
});

export { Ye };

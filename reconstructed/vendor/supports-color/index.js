/**
 * supports-color/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: supports-color@7.2.0
 * pieces: chunk-avfhvhz8.js (2), chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 2, cjs-fingerprint+context 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { clo } from "../has-flag/index.js";

//@ chunk-avfhvhz8.js:341-1755 cjs-fingerprint
var I = x(function (S, d) {
  var N = importMetaRequire("os"),
    f = importMetaRequire("tty"),
    o = clo(),
    { env: env } = process,
    u;
  if (o("no-color") || o("no-colors") || o("color=false") || o("color=never")) u = 0;
  else if (o("color") || o("colors") || o("color=true") || o("color=always")) u = 1;
  if ("FORCE_COLOR" in env)
    if (env.FORCE_COLOR === "true") u = 1;
    else if (env.FORCE_COLOR === "false") u = 0;
    else u = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
  function E(r) {
    if (r === 0) return !1;
    return { level: r, hasBasic: !0, has256: r >= 2, has16m: r >= 3 };
  }
  function m(r, n) {
    if (u === 0) return 0;
    if (o("color=16m") || o("color=full") || o("color=truecolor")) return 3;
    if (o("color=256")) return 2;
    if (r && !n && u === void 0) return 0;
    let e = u || 0;
    if (env.TERM === "dumb") return e;
    if ("CI" in env) {
      if (
        ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some(
          (i) => i in env,
        ) ||
        env.CI_NAME === "codeship"
      )
        return 1;
      return e;
    }
    if ("TEAMCITY_VERSION" in env) return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
    if (env.COLORTERM === "truecolor") return 3;
    if ("TERM_PROGRAM" in env) {
      let i = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env.TERM_PROGRAM) {
        case "iTerm.app":
          return i >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env.TERM)) return 2;
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) return 1;
    if ("COLORTERM" in env) return 1;
    return e;
  }
  function v(r) {
    let n = m(r, r && r.isTTY);
    return E(n);
  }
  d.exports = { supportsColor: v, stdout: E(m(!0, f.isatty(1))), stderr: E(m(!0, f.isatty(2))) };
});
//@ chunk-avfhvhz8.js:1755-2914 cjs-fingerprint+context
var supportsHyperlinksPackage = x(function (k, M) {
  var C = I(),
    c = clo();
  function y(r) {
    if (/^\d{3,4}$/.test(r)) {
      let e = /(\d{1,2})(\d{2})/.exec(r) || [];
      return { major: 0, minor: parseInt(e[1], 10), patch: parseInt(e[2], 10) };
    }
    let mapped = (r || "").split(".").map((e) => parseInt(e, 10));
    return { major: mapped[0], minor: mapped[1], patch: mapped[2] };
  }
  function T(r) {
    let {
      CI: CI,
      FORCE_HYPERLINK: FORCE_HYPERLINK,
      NETLIFY: NETLIFY,
      TEAMCITY_VERSION: TEAMCITY_VERSION,
      TERM_PROGRAM: TERM_PROGRAM,
      TERM_PROGRAM_VERSION: TERM_PROGRAM_VERSION,
      VTE_VERSION: VTE_VERSION,
      TERM: TERM,
    } = process.env;
    if (FORCE_HYPERLINK) return !(FORCE_HYPERLINK.length > 0 && parseInt(FORCE_HYPERLINK, 10) === 0);
    if (c("no-hyperlink") || c("no-hyperlinks") || c("hyperlink=false") || c("hyperlink=never")) return !1;
    if (c("hyperlink=true") || c("hyperlink=always")) return !0;
    if (NETLIFY) return !0;
    if (!C.supportsColor(r)) return !1;
    if (r && !r.isTTY) return !1;
    if ("WT_SESSION" in process.env) return !0;
    if (CI) return !1;
    if (TEAMCITY_VERSION) return !1;
    if (TERM_PROGRAM) {
      let s = y(TERM_PROGRAM_VERSION || "");
      switch (TERM_PROGRAM) {
        case "iTerm.app":
          if (s.major === 3) return s.minor >= 1;
          return s.major > 3;
        case "WezTerm":
          return s.major >= 20200620;
        case "vscode":
          return s.major > 1 || (s.major === 1 && s.minor >= 72);
        case "ghostty":
          return !0;
      }
    }
    if (VTE_VERSION) {
      if (VTE_VERSION === "0.50.0") return !1;
      let s = y(VTE_VERSION);
      return s.major > 0 || s.minor >= 50;
    }
    switch (TERM) {
      case "alacritty":
        return !0;
    }
    return !1;
  }
  M.exports = { supportsHyperlink: T, stdout: T(process.stdout), stderr: T(process.stderr) };
});
//@ chunk-h6b7mazd.js:33555-35154 cjs-fingerprint
var Ms = x(function (Fd, js) {
  var Pd = importMetaRequire("os"),
    qt = importMetaRequire("tty"),
    ee = clo(),
    { env: env } = process,
    It;
  if (ee("no-color") || ee("no-colors") || ee("color=false") || ee("color=never")) It = 0;
  else if (ee("color") || ee("colors") || ee("color=true") || ee("color=always")) It = 1;
  function tf() {
    if ("FORCE_COLOR" in env) {
      if (env.FORCE_COLOR === "true") return 1;
      if (env.FORCE_COLOR === "false") return 0;
      return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
    }
  }
  function rf(e) {
    if (e === 0) return !1;
    return { level: e, hasBasic: !0, has256: e >= 2, has16m: e >= 3 };
  }
  function nf(e, { streamIsTTY: t, sniffFlags: r = !0 } = {}) {
    let n = tf();
    if (n !== void 0) It = n;
    let o = r ? It : n;
    if (o === 0) return 0;
    if (r) {
      if (ee("color=16m") || ee("color=full") || ee("color=truecolor")) return 3;
      if (ee("color=256")) return 2;
    }
    if (e && !t && o === void 0) return 0;
    let s = o || 0;
    if (env.TERM === "dumb") return s;
    if ("CI" in env) {
      if (
        ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE", "DRONE"].some(
          (i) => i in env,
        ) ||
        env.CI_NAME === "codeship"
      )
        return 1;
      return s;
    }
    if ("TEAMCITY_VERSION" in env) return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
    if (env.COLORTERM === "truecolor") return 3;
    if ("TERM_PROGRAM" in env) {
      let int = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env.TERM_PROGRAM) {
        case "iTerm.app":
          return int >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env.TERM)) return 2;
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) return 1;
    if ("COLORTERM" in env) return 1;
    return s;
  }
  function Pr(e, t = {}) {
    let r = nf(e, { streamIsTTY: e && e.isTTY, ...t });
    return rf(r);
  }
  js.exports = {
    supportsColor: Pr,
    stdout: Pr({ isTTY: qt.isatty(1) }),
    stderr: Pr({ isTTY: qt.isatty(2) }),
  };
});

export { supportsHyperlinksPackage, Ms };

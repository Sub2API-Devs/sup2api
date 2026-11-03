/**
 * supports-color/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: supports-color@7.2.0
 * pieces: chunk-avfhvhz8.js (2), chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 2, cjs-fingerprint+context 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { require_has_flag } from "../has-flag/index.js";

//@ chunk-avfhvhz8.js:341-1755 cjs-fingerprint
var require_supports_color = x(function (cjsExports, cjsModule) {
  var os = importMetaRequire("os");
  var tty = importMetaRequire("tty");
  var hasFlag = require_has_flag();
  var { env } = process;
  var forceColor;
  if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never"))
    forceColor = 0;
  else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always"))
    forceColor = 1;
  if ("FORCE_COLOR" in env)
    if (env.FORCE_COLOR === "true") forceColor = 1;
    else if (env.FORCE_COLOR === "false") forceColor = 0;
    else forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
  function translateLevel(level) {
    if (level === 0) return false;
    return {
      level,
      hasBasic: true,
      has256: level >= 2,
      has16m: level >= 3,
    };
  }
  function supportsColor(haveStream, streamIsTTY) {
    if (forceColor === 0) return 0;
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) return 3;
    if (hasFlag("color=256")) return 2;
    if (haveStream && !streamIsTTY && forceColor === undefined) return 0;
    let min = forceColor || 0;
    if (env.TERM === "dumb") return min;
    if ("CI" in env) {
      if (
        ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some(
          (sign) => sign in env,
        ) ||
        env.CI_NAME === "codeship"
      )
        return 1;
      return min;
    }
    if ("TEAMCITY_VERSION" in env) return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
    if (env.COLORTERM === "truecolor") return 3;
    if ("TERM_PROGRAM" in env) {
      let version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env.TERM_PROGRAM) {
        case "iTerm.app":
          return version >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env.TERM)) return 2;
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) return 1;
    if ("COLORTERM" in env) return 1;
    return min;
  }
  function getSupportLevel(stream) {
    let level = supportsColor(stream, stream && stream.isTTY);
    return translateLevel(level);
  }
  cjsModule.exports = {
    supportsColor: getSupportLevel,
    stdout: translateLevel(supportsColor(true, tty.isatty(1))),
    stderr: translateLevel(supportsColor(true, tty.isatty(2))),
  };
});
//@ chunk-avfhvhz8.js:1755-2914 cjs-fingerprint+context
var supportsHyperlinksPackage = x(function (cjsExports, cjsModule) {
  var C = require_supports_color();
  var c = require_has_flag();
  function y(r) {
    if (/^\d{3,4}$/.test(r)) {
      let e = /(\d{1,2})(\d{2})/.exec(r) || [];
      return {
        major: 0,
        minor: parseInt(e[1], 10),
        patch: parseInt(e[2], 10),
      };
    }
    let mapped = (r || "").split(".").map((e) => parseInt(e, 10));
    return {
      major: mapped[0],
      minor: mapped[1],
      patch: mapped[2],
    };
  }
  function T(r) {
    let {
      CI,
      FORCE_HYPERLINK,
      NETLIFY,
      TEAMCITY_VERSION,
      TERM_PROGRAM,
      TERM_PROGRAM_VERSION,
      VTE_VERSION,
      TERM,
    } = process.env;
    if (FORCE_HYPERLINK) return !(FORCE_HYPERLINK.length > 0 && parseInt(FORCE_HYPERLINK, 10) === 0);
    if (c("no-hyperlink") || c("no-hyperlinks") || c("hyperlink=false") || c("hyperlink=never")) return false;
    if (c("hyperlink=true") || c("hyperlink=always")) return true;
    if (NETLIFY) return true;
    if (!C.supportsColor(r)) return false;
    if (r && !r.isTTY) return false;
    if ("WT_SESSION" in process.env) return true;
    if (CI) return false;
    if (TEAMCITY_VERSION) return false;
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
          return true;
      }
    }
    if (VTE_VERSION) {
      if (VTE_VERSION === "0.50.0") return false;
      let s = y(VTE_VERSION);
      return s.major > 0 || s.minor >= 50;
    }
    switch (TERM) {
      case "alacritty":
        return true;
    }
    return false;
  }
  cjsModule.exports = {
    supportsHyperlink: T,
    stdout: T(process.stdout),
    stderr: T(process.stderr),
  };
});
//@ chunk-h6b7mazd.js:33555-35154 cjs-fingerprint
var require_supports_color_2 = x(function (cjsExports, cjsModule) {
  var os = importMetaRequire("os");
  var tty = importMetaRequire("tty");
  var hasFlag = require_has_flag();
  var { env } = process;
  var It;
  if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) It = 0;
  else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) It = 1;
  function tf() {
    if ("FORCE_COLOR" in env) {
      if (env.FORCE_COLOR === "true") return 1;
      if (env.FORCE_COLOR === "false") return 0;
      return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
    }
  }
  function rf(level) {
    if (level === 0) return false;
    return {
      level,
      hasBasic: true,
      has256: level >= 2,
      has16m: level >= 3,
    };
  }
  function supportsColor(haveStream, { streamIsTTY, sniffFlags: r = true } = {}) {
    let n = tf();
    if (n !== undefined) It = n;
    let forceColor = r ? It : n;
    if (forceColor === 0) return 0;
    if (r) {
      if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) return 3;
      if (hasFlag("color=256")) return 2;
    }
    if (haveStream && !streamIsTTY && forceColor === undefined) return 0;
    let min = forceColor || 0;
    if (env.TERM === "dumb") return min;
    if ("CI" in env) {
      if (
        ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE", "DRONE"].some(
          (sign) => sign in env,
        ) ||
        env.CI_NAME === "codeship"
      )
        return 1;
      return min;
    }
    if ("TEAMCITY_VERSION" in env) return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
    if (env.COLORTERM === "truecolor") return 3;
    if ("TERM_PROGRAM" in env) {
      let version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env.TERM_PROGRAM) {
        case "iTerm.app":
          return version >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env.TERM)) return 2;
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) return 1;
    if ("COLORTERM" in env) return 1;
    return min;
  }
  function Pr(stream, t = {}) {
    let level = supportsColor(stream, {
      streamIsTTY: stream && stream.isTTY,
      ...t,
    });
    return rf(level);
  }
  cjsModule.exports = {
    supportsColor: Pr,
    stdout: Pr({
      isTTY: tty.isatty(1),
    }),
    stderr: Pr({
      isTTY: tty.isatty(2),
    }),
  };
});
export { supportsHyperlinksPackage, require_supports_color_2 };

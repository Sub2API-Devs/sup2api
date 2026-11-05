/**
 * supports-color/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: supports-color@7.2.0
 * pieces: chunk-1jphxy9b.js (2), chunk-ww9agm6g.js (1)
 * attribution: cjs-fingerprint 2, cjs-fingerprint+context 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../runtime/bun-runtime.js";
import { require_has_flag } from "../has-flag/index.js";

//@ chunk-ww9agm6g.js:33555-35154 cjs-fingerprint
var require_supports_color_2 = __commonJS(function (cjsExports, cjsModule) {
  var os = importMetaRequire("os");
  var tty = importMetaRequire("tty");
  var hasFlag = require_has_flag();
  var { env } = process;
  var flagForceLevel;
  if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never"))
    flagForceLevel = 0;
  else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always"))
    flagForceLevel = 1;
  function forceColorFromEnv() {
    if ("FORCE_COLOR" in env) {
      if (env.FORCE_COLOR === "true") return 1;
      if (env.FORCE_COLOR === "false") return 0;
      return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
    }
  }
  function toColorSupport(level) {
    if (level === 0) return false;
    return {
      level,
      hasBasic: true,
      has256: level >= 2,
      has16m: level >= 3,
    };
  }
  function supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
    let envForceLevel = forceColorFromEnv();
    if (envForceLevel !== undefined) flagForceLevel = envForceLevel;
    let forceColor = sniffFlags ? flagForceLevel : envForceLevel;
    if (forceColor === 0) return 0;
    if (sniffFlags) {
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
  function supportsColorForStream(stream, options = {}) {
    let level = supportsColor(stream, {
      streamIsTTY: stream && stream.isTTY,
      ...options,
    });
    return toColorSupport(level);
  }
  cjsModule.exports = {
    supportsColor: supportsColorForStream,
    stdout: supportsColorForStream({
      isTTY: tty.isatty(1),
    }),
    stderr: supportsColorForStream({
      isTTY: tty.isatty(2),
    }),
  };
});
//@ chunk-1jphxy9b.js:341-1755 cjs-fingerprint
var require_supports_color = __commonJS(function (cjsExports, cjsModule) {
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
//@ chunk-1jphxy9b.js:1755-2914 cjs-fingerprint+context
var supportsHyperlinksPackage = __commonJS(function (cjsExports, cjsModule) {
  var supportsColor = require_supports_color();
  var hasFlag = require_has_flag();
  function parseVersion(version) {
    if (/^\d{3,4}$/.test(version)) {
      let match = /(\d{1,2})(\d{2})/.exec(version) || [];
      return {
        major: 0,
        minor: parseInt(match[1], 10),
        patch: parseInt(match[2], 10),
      };
    }
    let mapped = (version || "").split(".").map((part) => parseInt(part, 10));
    return {
      major: mapped[0],
      minor: mapped[1],
      patch: mapped[2],
    };
  }
  function supportsHyperlink(stream) {
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
    if (
      hasFlag("no-hyperlink") ||
      hasFlag("no-hyperlinks") ||
      hasFlag("hyperlink=false") ||
      hasFlag("hyperlink=never")
    )
      return false;
    if (hasFlag("hyperlink=true") || hasFlag("hyperlink=always")) return true;
    if (NETLIFY) return true;
    if (!supportsColor.supportsColor(stream)) return false;
    if (stream && !stream.isTTY) return false;
    if ("WT_SESSION" in process.env) return true;
    if (CI) return false;
    if (TEAMCITY_VERSION) return false;
    if (TERM_PROGRAM) {
      let termVersion = parseVersion(TERM_PROGRAM_VERSION || "");
      switch (TERM_PROGRAM) {
        case "iTerm.app":
          if (termVersion.major === 3) return termVersion.minor >= 1;
          return termVersion.major > 3;
        case "WezTerm":
          return termVersion.major >= 20200620;
        case "vscode":
          return termVersion.major > 1 || (termVersion.major === 1 && termVersion.minor >= 72);
        case "ghostty":
          return true;
      }
    }
    if (VTE_VERSION) {
      if (VTE_VERSION === "0.50.0") return false;
      let vteVersion = parseVersion(VTE_VERSION);
      return vteVersion.major > 0 || vteVersion.minor >= 50;
    }
    switch (TERM) {
      case "alacritty":
        return true;
    }
    return false;
  }
  cjsModule.exports = {
    supportsHyperlink,
    stdout: supportsHyperlink(process.stdout),
    stderr: supportsHyperlink(process.stderr),
  };
});
export { supportsHyperlinksPackage, require_supports_color_2 };

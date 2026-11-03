/**
 * chalk/source/vendor/supports-color/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: chalk@5.6.0..5.6.2
 * pieces: chunk-4ymxyb4g.js (9)
 * attribution: esm-layout 2, esm-fingerprint 7
 */
import v from "process";
import os from "os";
import tty from "tty";
import { assembleStyles } from "../ansi-styles/index.js";

//@ chunk-4ymxyb4g.js:2723-2737 esm-layout
var D = assembleStyles();
var h = D;
//@ chunk-4ymxyb4g.js:2797-2970 esm-fingerprint
function hasFlag(flag, argv = globalThis.Deno ? globalThis.Deno.args : v.argv) {
  let prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
  let position = argv.indexOf(prefix + flag);
  let terminatorPosition = argv.indexOf("--");
  return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
}
//@ chunk-4ymxyb4g.js:2970-2985 esm-layout
var { env } = v;
var flagForceColor;
//@ chunk-4ymxyb4g.js:2985-3130 esm-fingerprint
if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never"))
  flagForceColor = 0;
else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always"))
  flagForceColor = 1;
//@ chunk-4ymxyb4g.js:3130-3317 esm-fingerprint
function envForceColor() {
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") return 1;
    if (env.FORCE_COLOR === "false") return 0;
    return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
  }
}
//@ chunk-4ymxyb4g.js:3317-3401 esm-fingerprint
function translateLevel(level) {
  if (level === 0) return false;
  return {
    level,
    hasBasic: true,
    has256: level >= 2,
    has16m: level >= 3,
  };
}
//@ chunk-4ymxyb4g.js:3401-4644 esm-fingerprint
function _supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
  let noFlagForceColor = envForceColor();
  if (noFlagForceColor !== undefined) flagForceColor = noFlagForceColor;
  let forceColor = sniffFlags ? flagForceColor : noFlagForceColor;
  if (forceColor === 0) return 0;
  if (sniffFlags) {
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) return 3;
    if (hasFlag("color=256")) return 2;
  }
  if ("TF_BUILD" in env && "AGENT_NAME" in env) return 1;
  if (haveStream && !streamIsTTY && forceColor === undefined) return 0;
  let min = forceColor || 0;
  if (env.TERM === "dumb") return min;
  if (v.platform === "win32") {
    let osRelease = os.release().split(".");
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586)
      return Number(osRelease[2]) >= 14931 ? 3 : 2;
    return 1;
  }
  if ("CI" in env) {
    if (["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some((key) => key in env)) return 3;
    if (
      ["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some((sign) => sign in env) ||
      env.CI_NAME === "codeship"
    )
      return 1;
    return min;
  }
  if ("TEAMCITY_VERSION" in env) return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
  if (env.COLORTERM === "truecolor") return 3;
  if (env.TERM === "xterm-kitty") return 3;
  if (env.TERM === "xterm-ghostty") return 3;
  if (env.TERM === "wezterm") return 3;
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
//@ chunk-4ymxyb4g.js:4644-4716 esm-fingerprint
function createSupportsColor(stream, options = {}) {
  let level = _supportsColor(stream, {
    streamIsTTY: stream && stream.isTTY,
    ...options,
  });
  return translateLevel(level);
}
//@ chunk-4ymxyb4g.js:4716-4788 esm-fingerprint
var supportsColor = {
  stdout: createSupportsColor({
    isTTY: tty.isatty(1),
  }),
  stderr: createSupportsColor({
    isTTY: tty.isatty(2),
  }),
};
var supportsColor_default = supportsColor;
export { supportsColor_default, h };

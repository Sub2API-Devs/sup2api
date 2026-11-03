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
import { U } from "../ansi-styles/index.js";

//@ chunk-4ymxyb4g.js:2723-2737 esm-layout
var D = U(),
  h = D;
//@ chunk-4ymxyb4g.js:2797-2970 esm-fingerprint
function f(e, r = globalThis.Deno ? globalThis.Deno.args : v.argv) {
  let t = e.startsWith("-") ? "" : e.length === 1 ? "-" : "--",
    index = r.indexOf(t + e),
    index_2 = r.indexOf("--");
  return index !== -1 && (index_2 === -1 || index < index_2);
}
//@ chunk-4ymxyb4g.js:2970-2985 esm-layout
var { env: env } = v,
  O;
//@ chunk-4ymxyb4g.js:2985-3130 esm-fingerprint
if (f("no-color") || f("no-colors") || f("color=false") || f("color=never")) O = 0;
else if (f("color") || f("colors") || f("color=true") || f("color=always")) O = 1;
//@ chunk-4ymxyb4g.js:3130-3317 esm-fingerprint
function K() {
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") return 1;
    if (env.FORCE_COLOR === "false") return 0;
    return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
  }
}
//@ chunk-4ymxyb4g.js:3317-3401 esm-fingerprint
function W(e) {
  if (e === 0) return !1;
  return { level: e, hasBasic: !0, has256: e >= 2, has16m: e >= 3 };
}
//@ chunk-4ymxyb4g.js:3401-4644 esm-fingerprint
function X(e, { streamIsTTY: r, sniffFlags: t = !0 } = {}) {
  let o = K();
  if (o !== void 0) O = o;
  let n = t ? O : o;
  if (n === 0) return 0;
  if (t) {
    if (f("color=16m") || f("color=full") || f("color=truecolor")) return 3;
    if (f("color=256")) return 2;
  }
  if ("TF_BUILD" in env && "AGENT_NAME" in env) return 1;
  if (e && !r && n === void 0) return 0;
  let a = n || 0;
  if (env.TERM === "dumb") return a;
  if (v.platform === "win32") {
    let parts = os.release().split(".");
    if (Number(parts[0]) >= 10 && Number(parts[2]) >= 10586) return Number(parts[2]) >= 14931 ? 3 : 2;
    return 1;
  }
  if ("CI" in env) {
    if (["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some((c) => c in env)) return 3;
    if (
      ["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some((c) => c in env) ||
      env.CI_NAME === "codeship"
    )
      return 1;
    return a;
  }
  if ("TEAMCITY_VERSION" in env) return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
  if (env.COLORTERM === "truecolor") return 3;
  if (env.TERM === "xterm-kitty") return 3;
  if (env.TERM === "xterm-ghostty") return 3;
  if (env.TERM === "wezterm") return 3;
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
  return a;
}
//@ chunk-4ymxyb4g.js:4644-4716 esm-fingerprint
function F(e, r = {}) {
  let t = X(e, { streamIsTTY: e && e.isTTY, ...r });
  return W(t);
}
//@ chunk-4ymxyb4g.js:4716-4788 esm-fingerprint
var z = { stdout: F({ isTTY: tty.isatty(1) }), stderr: F({ isTTY: tty.isatty(2) }) },
  M = z;

export { M, h };

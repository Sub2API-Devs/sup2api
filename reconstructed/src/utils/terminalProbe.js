/**
 * utils/terminalProbe.ts
 *
 * 2.1.316 新增。终端探测。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (9), chunk-q6rfp6n3.js (5)
 * attribution: placement 14
 */
import { env } from "./env.js";
import {
  isTmuxControlMode,
  getFullscreenDecision,
  fullscreenDecisionMode,
  isMouseTrackingEnabled,
} from "./fullscreen.js";
import { getTerminalProbeState, getXtversionName } from "../ink/terminalCapabilities.js";
import { setRendererModeForAnalytics, onAttacherCapsChange, getAttacherCaps } from "../bootstrap/state.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeVersion } from "../services/analytics/metadata.js";
import { fromEnum, fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../services/analytics/safeMetadata.js";
import { isSynchronizedOutputSupported, getSecondRootError } from "../ink/terminal.js";
import { getLinuxClipboardToolName, isVteTerminal } from "../ink/termio/osc.js";
import { init_react_production, yt, P } from "../../vendor/react/cjs/react.production.js";
import { useStdin } from "../components/design-system/ThemeProvider.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { sleep } from "./sleep.js";
import { sendNotification } from "../services/notifier.js";

//@ chunk-18hwfzwa.js:207065-207200 placement
function detectTerminalMultiplexer() {
  if (env.TMUX) return isTmuxControlMode() ? "tmux_cc" : "tmux";
  if (process.env.ZELLIJ != null) return "zellij";
  if (env.STY) return "screen";
  return "none";
}
//@ chunk-18hwfzwa.js:207200-207333 placement
function logTerminalProbe() {
  let terminalProbeState = getTerminalProbeState();
  if (terminalProbeState.probeEventLogged) return;
  terminalProbeState.probeEventLogged = true;
  let fullscreenDecision = getFullscreenDecision();
  setRendererModeForAnalytics(fullscreenDecisionMode(fullscreenDecision));
  logEvent("tengu_terminal_probe", terminalProbeFields(fullscreenDecision));
}
//@ chunk-18hwfzwa.js:207333-207650 placement
function terminalProbeFields(fullscreenDecision) {
  return {
    xtversion: sanitizeTerminalReply(getXtversionName()),
    term_program_version: sanitizeVersion(env.TERM_PROGRAM_VERSION),
    is_ssh: env.isSSH(),
    multiplexer: fromEnum(detectTerminalMultiplexer()),
    term_rows: process.stdout.rows ?? 0,
    term_cols: process.stdout.columns ?? 0,
    dec2026_allowlist: isSynchronizedOutputSupported(),
    renderer_entry_path: fromEnum(fullscreenDecision),
    mouse_mode: fromEnum(isMouseTrackingEnabled()),
    linux_clipboard_tool: fromEnum(getLinuxClipboardToolName()),
    vte_terminal: isVteTerminal(),
  };
}
//@ chunk-18hwfzwa.js:207650-207654 placement
init_react_production();
//@ chunk-18hwfzwa.js:207782-207786 placement
init_react_production();
//@ chunk-18hwfzwa.js:208031-208035 placement
init_react_production();
//@ chunk-18hwfzwa.js:920856-920860 placement
init_react_production();
//@ chunk-18hwfzwa.js:920860-921229 placement
function queryTerminalBackground() {
  let { internal_querier: internalQuerier } = useStdin();
  let x = yt(onAttacherCapsChange, () => getAttacherCaps()?.terminal ?? env.terminal);
  let isFullscreen = useIsFullscreen();
  P(() => {
    if (!isFullscreen || !internalQuerier) return;
    if (x !== "iTerm.app" && x !== "Apple_Terminal") return;
    let L = getSecondRootError().get(process.stdout);
    if (!L) return;
    let abortController = new AbortController();
    (async () => {
      while (!abortController.signal.aborted) {
        await L.probeExternalClear(internalQuerier);
        await sleep(200, abortController.signal, {
          unref: true,
        });
      }
    })();
    return () => abortController.abort();
  }, [isFullscreen, internalQuerier, x]);
}
//@ chunk-18hwfzwa.js:921229-921233 placement
init_react_production();
//@ chunk-q6rfp6n3.js:598-641 placement
var TERMINAL_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;
//@ chunk-q6rfp6n3.js:641-727 placement
/**
 * 校验终端名，不合规记 nonconforming。
 */
function sanitizeTerminalName(e) {
  if (e == null) return;
  if (TERMINAL_NAME_RE.test(e)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
  return lit("nonconforming");
}
//@ chunk-q6rfp6n3.js:727-1357 placement
/**
 * 已知终端名与版本号格式正则。
 */
var KNOWN_TERMINAL_NAMES = new Set([
  "Apple_Terminal",
  "contour",
  "foot",
  "ghostty",
  "iTerm.app",
  "iTerm2",
  "kitty",
  "Konsole",
  "libghostty",
  "libvterm",
  "mintty",
  "Rio",
  "ShellFish",
  "SwiftTerm",
  "Tabby",
  "terminology",
  "Termius",
  "tmux",
  "VTE",
  "Warp",
  "WezTerm",
  "xterm",
  "xterm-ghostty",
  "XTerm",
  "xterm.js",
  "Zap",
  "Zellij",
]);
var VERSION_PATTERNS = [
  /^(?:next-)?v?\d{1,8}(?:\.\d{1,8}){0,5}[a-z]?$/,
  /^\d{1,8}\.\d{1,8}\.\d{1,8}-?(?:alpha|beta|rc|pre|dev)\.?\d{0,8}$/,
  /^\d{8}[-_]\d{6}[-_][0-9a-f]{8}$/,
  /^v\d\.\d{4}(?:\.\d{2}){4}\.(?:stable|preview|beta|dev)_\d{2}$/,
];
var VERSION_PREFIX_RE = /^\d{1,8}(?:\.\d{1,8}){1,3}/;
var NAME_REST_RE = /^([A-Za-z][A-Za-z0-9_.]*)(.*)$/;
var DASHED_NAME_REST_RE = /^([A-Za-z][A-Za-z0-9_.-]*[A-Za-z0-9_.])(.*)$/;
var TRAILING_PUNCT_RE = /[):]{1,4}$/;
//@ chunk-q6rfp6n3.js:1357-1822 placement
/**
 * 把终端版本回复规范为 “名字(版本)” 等安全形式。
 */
function sanitizeTerminalReply(xtversionName) {
  if (xtversionName === undefined) return lit("no_reply");
  let n = xtversionName.length <= 128 ? NAME_REST_RE.exec(xtversionName) : null;
  if (!n) return lit("other");
  let match = DASHED_NAME_REST_RE.exec(xtversionName);
  let [, r = "", s = ""] = match && KNOWN_TERMINAL_NAMES.has(match[1] ?? "") ? match : n;
  if (!KNOWN_TERMINAL_NAMES.has(r)) return lit("other");
  if (s === "") return fromSanitizer_SANITIZER_OUTPUT_ONLY(r);
  let l = s[0];
  let replaced = s.slice(1).replace(TRAILING_PUNCT_RE, "");
  if (replaced === "") return fromSanitizer_SANITIZER_OUTPUT_ONLY(l === "(" ? `${r}()` : r);
  let d = VERSION_PATTERNS.some((_) => _.test(replaced))
    ? replaced
    : (VERSION_PREFIX_RE.exec(replaced)?.[0] ?? "other");
  switch (l) {
    case "(":
      return fromSanitizer_SANITIZER_OUTPUT_ONLY(`${r}(${d})`);
    case " ":
    case "-":
      return fromSanitizer_SANITIZER_OUTPUT_ONLY(`${r}${l}${d}`);
    default:
      return fromSanitizer_SANITIZER_OUTPUT_ONLY(`${r} ${d}`);
  }
}
//@ chunk-q6rfp6n3.js:1822-1867 placement
/**
 * 异步发送通知（包一层 sendNotification）。
 */
async function notifyAsync(notification, terminal, o = {}) {
  await sendNotification(notification, terminal, o);
}
export { queryTerminalBackground, notifyAsync, sanitizeTerminalName, logTerminalProbe };

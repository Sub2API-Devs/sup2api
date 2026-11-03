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
import { gk, Rsn } from "../ink/terminalCapabilities.js";
import { setRendererModeForAnalytics, onAttacherCapsChange, getAttacherCaps } from "../bootstrap/state.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeVersion } from "../services/analytics/metadata.js";
import { fromEnum, fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../services/analytics/safeMetadata.js";
import { isSynchronizedOutputSupported, di } from "../ink/terminal.js";
import { getLinuxClipboardToolName, isVteTerminal } from "../ink/termio/osc.js";
import { j, yt, P } from "../../vendor/react/cjs/react.production.js";
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
  let h = gk();
  if (h.probeEventLogged) return;
  h.probeEventLogged = !0;
  let x = getFullscreenDecision();
  (setRendererModeForAnalytics(fullscreenDecisionMode(x)),
    logEvent("tengu_terminal_probe", terminalProbeFields(x)));
}
//@ chunk-18hwfzwa.js:207333-207650 placement
function terminalProbeFields(h) {
  return {
    xtversion: sanitizeTerminalReply(Rsn()),
    term_program_version: sanitizeVersion(env.TERM_PROGRAM_VERSION),
    is_ssh: env.isSSH(),
    multiplexer: fromEnum(detectTerminalMultiplexer()),
    term_rows: process.stdout.rows ?? 0,
    term_cols: process.stdout.columns ?? 0,
    dec2026_allowlist: isSynchronizedOutputSupported(),
    renderer_entry_path: fromEnum(h),
    mouse_mode: fromEnum(isMouseTrackingEnabled()),
    linux_clipboard_tool: fromEnum(getLinuxClipboardToolName()),
    vte_terminal: isVteTerminal(),
  };
}
//@ chunk-18hwfzwa.js:207650-207654 placement
j();
//@ chunk-18hwfzwa.js:207782-207786 placement
j();
//@ chunk-18hwfzwa.js:208031-208035 placement
j();
//@ chunk-18hwfzwa.js:920856-920860 placement
j();
//@ chunk-18hwfzwa.js:920860-921229 placement
function queryTerminalBackground() {
  let { internal_querier: internal_querier } = useStdin(),
    x = yt(onAttacherCapsChange, () => getAttacherCaps()?.terminal ?? env.terminal),
    D = useIsFullscreen();
  P(() => {
    if (!D || !internal_querier) return;
    if (x !== "iTerm.app" && x !== "Apple_Terminal") return;
    let L = di().get(process.stdout);
    if (!L) return;
    let abortController = new AbortController();
    return (
      (async () => {
        while (!abortController.signal.aborted)
          (await L.probeExternalClear(internal_querier),
            await sleep(200, abortController.signal, { unref: !0 }));
      })(),
      () => abortController.abort()
    );
  }, [D, internal_querier, x]);
}
//@ chunk-18hwfzwa.js:921229-921233 placement
j();
//@ chunk-q6rfp6n3.js:598-641 placement
var h = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;
//@ chunk-q6rfp6n3.js:641-727 placement
function gnn(e) {
  if (e == null) return;
  if (h.test(e)) return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
  return lit("nonconforming");
}
/**
 * 已知终端名与版本号格式正则。
 */
//@ chunk-q6rfp6n3.js:727-1357 placement
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
  ]),
  VERSION_PATTERNS = [
    /^(?:next-)?v?\d{1,8}(?:\.\d{1,8}){0,5}[a-z]?$/,
    /^\d{1,8}\.\d{1,8}\.\d{1,8}-?(?:alpha|beta|rc|pre|dev)\.?\d{0,8}$/,
    /^\d{8}[-_]\d{6}[-_][0-9a-f]{8}$/,
    /^v\d\.\d{4}(?:\.\d{2}){4}\.(?:stable|preview|beta|dev)_\d{2}$/,
  ],
  VERSION_PREFIX_RE = /^\d{1,8}(?:\.\d{1,8}){1,3}/,
  NAME_REST_RE = /^([A-Za-z][A-Za-z0-9_.]*)(.*)$/,
  DASHED_NAME_REST_RE = /^([A-Za-z][A-Za-z0-9_.-]*[A-Za-z0-9_.])(.*)$/,
  TRAILING_PUNCT_RE = /[):]{1,4}$/;
/**
 * 把终端版本回复规范为 “名字(版本)” 等安全形式。
 */
//@ chunk-q6rfp6n3.js:1357-1822 placement
function sanitizeTerminalReply(e) {
  if (e === void 0) return lit("no_reply");
  let n = e.length <= 128 ? NAME_REST_RE.exec(e) : null;
  if (!n) return lit("other");
  let match = DASHED_NAME_REST_RE.exec(e),
    [, r = "", s = ""] = match && KNOWN_TERMINAL_NAMES.has(match[1] ?? "") ? match : n;
  if (!KNOWN_TERMINAL_NAMES.has(r)) return lit("other");
  if (s === "") return fromSanitizer_SANITIZER_OUTPUT_ONLY(r);
  let l = s[0],
    replaced = s.slice(1).replace(TRAILING_PUNCT_RE, "");
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
async function gB(e, n, o = {}) {
  await sendNotification(e, n, o);
}

export { gB, gnn, logTerminalProbe, queryTerminalBackground };

/**
 * ink/terminal.ts
 *
 * 并入旧版已有路径：终端写入与能力。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/terminal.ts
 * pieces: chunk-24t3dkzb.js (25), chunk-brd2890s.js (1), chunk-dxdtyerk.js (43)
 * attribution: placement 45, layout 18, fingerprint 5, callgraph-fingerprint 1
 */
import { isAbsolute } from "path";
import { Buffer as M } from "buffer";
import { logError } from "../utils/log.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession, getAttacherCaps } from "../bootstrap/state.js";
import { irs } from "../../vendor/private-unresolved/clipboard-napi.node.js";
import { importMetaRequire, Re } from "../../runtime/bun-runtime.js";
import { terminalDetector } from "./terminalColorSupport.js";
import { env, JETBRAINS_IDES } from "../utils/env.js";
import { isValidPipeOrPath } from "../utils/peerAddress.js";
import { getPlatform } from "../utils/platform.js";
import { truncateUtf8Bytes } from "../utils/stringUtils.js";
import { URL_STRIP_RE, osc, OSC, OSC_PREFIX, link } from "./termio/osc.js";
import { BEL } from "./termio/ansi.js";
import { Vy } from "../../vendor/semver/index.js";
import { gte } from "../utils/semver.js";
import { Rsn, EA, gk } from "./terminalCapabilities.js";
import { readScrollSpeedBase } from "../components/ScrollKeybindingHandler.js";
import {
  csi,
  DISABLE_KITTY_KEYBOARD,
  DISABLE_MODIFY_OTHER_KEYS,
  ENABLE_KITTY_KEYBOARD_LEGACY,
  ENABLE_KITTY_KEYBOARD,
  ENABLE_MODIFY_OTHER_KEYS,
  ERASE_SCREEN,
  CURSOR_HOME,
  eraseLines,
  cursorMove,
  cursorTo,
} from "./termio/csi.js";
import { ENTER_ALT_SCREEN, EXIT_ALT_SCREEN, BSU, HIDE_CURSOR, SHOW_CURSOR, ESU } from "./termio/dec.js";
import { handleEPIPE } from "../utils/process.js";
import { getClearTerminalSequence, eraseViewportInPlace } from "./clearTerminal.js";

//@ chunk-dxdtyerk.js:788-879 placement
class R {
  hooks = null;
  uiMounted = !1;
  setHooks(e) {
    this.hooks = e;
  }
  setUiMounted(e) {
    this.uiMounted = e;
  }
}
//@ chunk-dxdtyerk.js:879-891 placement
var g = new R();
//@ chunk-dxdtyerk.js:891-921 placement
function tKo(e) {
  g.setHooks(e);
}
//@ chunk-dxdtyerk.js:921-951 placement
function nKo() {
  return g.hooks;
}
//@ chunk-dxdtyerk.js:951-983 placement
function h(e) {
  g.setUiMounted(e);
}
//@ chunk-dxdtyerk.js:983-1017 placement
function oZn() {
  return g.uiMounted;
}
//@ chunk-dxdtyerk.js:1017-1570 placement
class SecondRootError extends Map {
  get everMounted() {
    return oZn();
  }
  set everMounted(e) {
    h(e);
  }
  set(e, r) {
    this.everMounted = !0;
    let n = this.get(e);
    if (n && n !== r && !n.hasUnmounted && n.holdsRawMode)
      logError(
        Error(
          "ink: second root created on a stream whose mounted root still holds stdin (raw mode); unmount the previous root first",
        ),
      );
    return super.set(e, r);
  }
  treeRoots = new Map();
  standaloneRender = null;
  claimForStandaloneRender(e) {
    let r = () => {
        if (this.standaloneRender === n) this.standaloneRender = null;
      },
      n = e.then(r, r);
    this.standaloneRender = n;
  }
  get pendingStandaloneRender() {
    return this.standaloneRender;
  }
}
//@ chunk-dxdtyerk.js:1570-1593 placement
var H = new HostScoped(() => new SecondRootError());
//@ chunk-dxdtyerk.js:1593-1629 placement
function di() {
  return H.of(getRootSession().host);
}
//@ chunk-dxdtyerk.js:1629-1645 placement
var m = null,
  w = !1;
//@ chunk-dxdtyerk.js:1645-1908 placement
function getClipboardNativeModulePath() {
  if (w) return m;
  w = !0;
  try {
    return ((m = irs()), m);
  } catch {}
  let e = "x64-linux",
    flattened = [e, `${e}-musl`].flatMap((o) => [
      `./vendor/clipboard-napi/${o}/clipboard-napi.node`,
      `../clipboard-napi/${o}/clipboard-napi.node`,
    ]);
  for (let o of flattened)
    try {
      return ((m = importMetaRequire(o)), m);
    } catch {}
  return null;
}
//@ chunk-dxdtyerk.js:1974-2070 placement
function HX() {
  return (
    getAttacherCaps()?.printsUnknownSequences ?? terminalDetector.hasUnknownSequencePrintingBug(env.terminal)
  );
}
//@ chunk-dxdtyerk.js:2120-2167 placement
function getTerminalName() {
  return getAttacherCaps()?.terminal ?? env.terminal;
}
/**
 * 当前终端复用器：附着端能力优先，否则按 TMUX/STY/ZELLIJ 判断为 tmux/screen/zellij。
 */
//@ chunk-dxdtyerk.js:2167-2297 placement
function getTerminalMultiplexer() {
  let e = getAttacherCaps();
  if (e) return e.mux;
  if (env.TMUX) return "tmux";
  if (env.STY) return "screen";
  if (env.ZELLIJ) return "zellij";
  return null;
}
//@ chunk-dxdtyerk.js:2297-2347 placement
function b_dxdt() {
  return getAttacherCaps()?.ssh ?? !!env.SSH_CONNECTION;
}
//@ chunk-dxdtyerk.js:2347-2510 placement
function getTmuxSocketArgs() {
  let e = getAttacherCaps();
  if (e) {
    if (e.mux !== "tmux" || !e.tmuxSocket) return null;
    return isAbsolute(e.tmuxSocket) && isValidPipeOrPath(e.tmuxSocket) ? ["-S", e.tmuxSocket] : null;
  }
  return env.TMUX ? [] : null;
}
//@ chunk-dxdtyerk.js:2510-2844 placement
function describeMetaKey() {
  let e = getTerminalName();
  if (e === "Apple_Terminal") return "Fn";
  if (e === "iTerm.app") return "Option";
  if (getAttacherCaps()?.isVscodeTerm || (e && VSCODE_FAMILY_TERMINALS.has(e)))
    return getPlatform() === "macos" ? "Option" : "Shift";
  if (e && KNOWN_TERMINALS.has(e)) return "Shift";
  if (env.LC_TERMINAL === "iTerm2") return "Option";
  return b_dxdt() || getTerminalMultiplexer() !== null || getPlatform() === "macos"
    ? "Shift (Option in iTerm2, Fn in Terminal.app)"
    : "Shift";
}
/**
 * （误归 deepLink）终端/IDE 名称集合：支持某终端特性的终端列表与 VS Code 系编辑器列表。
 */
//@ chunk-dxdtyerk.js:2844-3048 placement = LINUX_TERMINALS (0.468)
var KNOWN_TERMINALS = new Set([
    "ghostty",
    "kitty",
    "WezTerm",
    "alacritty",
    "xterm",
    "gnome-terminal",
    "vte-based",
    "konsole",
    "windows-terminal",
    "mintty",
    ...JETBRAINS_IDES,
  ]),
  VSCODE_FAMILY_TERMINALS = new Set(["vscode", "cursor", "windsurf", "antigravity", "codium"]);
//@ chunk-dxdtyerk.js:10964-10989 placement
var oe = 2048,
  ie = 192,
  se = 32;
//@ chunk-dxdtyerk.js:10989-11085 placement
function SQs(e) {
  let sliced = e.replace(/[^A-Za-z0-9_.+-]/g, "-").slice(0, se);
  return sliced.length > 0 ? sliced : void 0;
}
//@ chunk-dxdtyerk.js:11085-11166 placement = base64URLEncode (1)
function base64URLEncode(e, r) {
  let n = truncateUtf8Bytes(e.replace(URL_STRIP_RE, " "), r);
  return M.from(n).toString("base64");
}
//@ chunk-dxdtyerk.js:11166-11620 placement
function formatTabStatus(e) {
  let r = [`state=${e.state}`, "app=claude-code"];
  if (e.id !== void 0) r.push(`id=${e.id}`);
  if (e.state === "blocked" && e.kind) r.push(`kind=${e.kind}`);
  if (
    (e.state === "working" || e.state === "blocked") &&
    e.progress !== void 0 &&
    Number.isFinite(e.progress)
  ) {
    let min = Math.min(100, Math.max(0, Math.round(e.progress)));
    r.push(`progress=${min}`);
  }
  if (e.title) r.push(`title=${base64URLEncode(e.title, ie)}`);
  if (e.msg) r.push(`msg=${base64URLEncode(e.msg, oe)}`);
  return osc(OSC.PROGRAM_STATUS, r.join(":"));
}
//@ chunk-dxdtyerk.js:11620-11672 placement
var rZn = `${OSC_PREFIX}${OSC.PROGRAM_STATUS};state=clear${BEL}`;
//@ chunk-dxdtyerk.js:11672-11739 placement
function wQs(e) {
  return osc(OSC.PROGRAM_STATUS, `state=clear:id=${e}`);
}
//@ chunk-dxdtyerk.js:11739-11756 placement
var y = Re(Vy(), 1);
/**
 * 由 TERM 识别 st 或 rxvt，否则 null。
 */
//@ chunk-dxdtyerk.js:11756-11887 layout
function detectMinimalTerminal(e) {
  if (e === void 0) return null;
  if (/^st(term)?(-|$)/.test(e)) return "st";
  if (/^rxvt(-|$)/.test(e)) return "rxvt";
  return null;
}
//@ chunk-dxdtyerk.js:11887-12003 fingerprint = EXTENDED_KEYS_TERMINALS (0.914)
var EXTENDED_KEYS_TERMINALS = [
    "iTerm.app",
    "kitty",
    "WezTerm",
    "ghostty",
    "tmux",
    "windows-terminal",
    "WarpTerminal",
  ],
  EXTENDED_KEYS_NEEDS_CONFIRM = ["windows-terminal"];
//@ chunk-dxdtyerk.js:12003-12038 layout
function isStTerminal(e) {
  return detectMinimalTerminal(e) === "st";
}
//@ chunk-dxdtyerk.js:12038-12122 layout
function describeOldVte(e) {
  return `env: terminal=${e}, VTE before 0.53 (shows the query as text)`;
}
//@ chunk-dxdtyerk.js:12122-12205 layout
var TMUX_IMAGES_PENDING_SOURCE = "env: inside tmux, waiting for tmux to say whether it passes images through";
/**
 * 终端能力表的初始状态（每项 settled/likely + 来源说明），由环境变量推断，之后由 probeTerminalCapabilities 的查询结果修正：extendedKeys、synchronizedOutput、kittyKeyboard、kittyGraphics、itermImages、mousePixels、programStatus。后台会话（CLAUDE_CODE_SESSION_KIND=bg）、tmux/screen、CLAUDE_CODE_FORCE_TERMINAL_IMAGES、CLAUDE_CODE_DISABLE_TERMINAL_TITLE、旧 VTE 会影响初值。
 */
//@ chunk-dxdtyerk.js:12205-12973 layout
function getInitialCapabilities() {
  return {
    extendedKeys: initialExtendedKeys(env.terminal, env.CLAUDE_CODE_SESSION_KIND === "bg"),
    synchronizedOutput: initialSyncOutput(),
    kittyKeyboard: initialKittyKeyboard(env.terminal, env.CLAUDE_CODE_SESSION_KIND === "bg"),
    kittyGraphics: initialKittyGraphics({
      terminal: env.terminal,
      bgWorker: env.CLAUDE_CODE_SESSION_KIND === "bg",
      multiplexed: Boolean(env.TMUX) || Boolean(env.STY),
      tmux: Boolean(env.TMUX) && !env.STY,
      forced: env.CLAUDE_CODE_FORCE_TERMINAL_IMAGES,
    }),
    itermImages: initialItermImages({
      bgWorker: env.CLAUDE_CODE_SESSION_KIND === "bg",
      multiplexed: Boolean(env.TMUX) || Boolean(env.STY),
      tmux: Boolean(env.TMUX) && !env.STY,
    }),
    mousePixels: initialMousePixels({
      terminal: env.terminal,
      bgWorker: env.CLAUDE_CODE_SESSION_KIND === "bg",
      multiplexed: Boolean(env.TMUX) || Boolean(env.STY),
    }),
    programStatus: initialProgramStatus({
      terminal: env.terminal,
      bgWorker: env.CLAUDE_CODE_SESSION_KIND === "bg",
      tabWritesDisabled: env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE,
    }),
  };
}
//@ chunk-dxdtyerk.js:12973-13260 layout
function initialProgramStatus(e) {
  if (e.tabWritesDisabled) return { settled: !1, source: "env: CLAUDE_CODE_DISABLE_TERMINAL_TITLE" };
  if (e.bgWorker) return { settled: !1, source: "bg worker" };
  if (terminalDetector.hasUnknownSequencePrintingBug(e.terminal))
    return { settled: !1, source: describeOldVte(e.terminal) };
  return { likely: !1, source: "not asked yet" };
}
//@ chunk-dxdtyerk.js:13260-13480 layout
function initialMousePixels(e) {
  if (e.bgWorker) return { settled: !1, source: "bg worker" };
  if (e.multiplexed) return { settled: !1, source: "env: inside tmux or screen" };
  return { likely: !1, source: `env: terminal=${e.terminal || "unknown"}, not asked yet` };
}
//@ chunk-dxdtyerk.js:13480-13519 layout
var KITTY_GRAPHICS_TERMINALS = ["kitty", "ghostty"],
  KITTY_GRAPHICS_MIN_VERSION = "0.28.0";
/**
 * 按 XTVERSION 名判断是否支持 kitty 图形协议：kitty ≥0.28.0 或 Ghostty。
 */
//@ chunk-dxdtyerk.js:13519-13694 layout
function supportsKittyGraphics(terminal) {
  if (terminal === null) return !1;
  if (terminal.startsWith("kitty(")) {
    let coerce = y.coerce(terminal.slice(6));
    return coerce !== null && gte(coerce.version, KITTY_GRAPHICS_MIN_VERSION);
  }
  return KITTY_GRAPHICS_TERMINALS.some((r) => terminal === r || terminal.startsWith(`${r} `));
}
//@ chunk-dxdtyerk.js:13694-14022 layout
function initialKittyGraphics(e) {
  if (e.forced) return { settled: !0, source: "env: CLAUDE_CODE_FORCE_TERMINAL_IMAGES" };
  if (e.bgWorker) return { settled: !1, source: "bg worker" };
  if (e.tmux) return { likely: !1, source: TMUX_IMAGES_PENDING_SOURCE };
  if (e.multiplexed) return { settled: !1, source: "env: inside screen" };
  return { likely: !1, source: `env: terminal=${e.terminal || "unknown"}, not asked yet` };
}
//@ chunk-dxdtyerk.js:14022-14037 layout
var ITERM_IMAGES_MIN_VERSION = "3.5.0";
/**
 * 按 XTVERSION 名判断是否 iTerm2 ≥3.5（支持内联图片按格定位）。
 */
//@ chunk-dxdtyerk.js:14037-14164 layout
function supportsItermImages(terminal) {
  if (terminal === null || !/^iTerm2\s/.test(terminal)) return !1;
  let coerce = y.coerce(terminal.slice(6).trim());
  return coerce !== null && gte(coerce.version, ITERM_IMAGES_MIN_VERSION);
}
//@ chunk-dxdtyerk.js:14164-14432 layout
function initialItermImages(e) {
  if (e.bgWorker) return { settled: !1, source: "bg worker" };
  if (e.tmux) return { likely: !1, source: TMUX_IMAGES_PENDING_SOURCE };
  if (e.multiplexed) return { settled: !1, source: "env: inside screen, not supported" };
  return { likely: !1, source: "yes only on an XTVERSION reply naming iTerm2 3.5 or later" };
}
//@ chunk-dxdtyerk.js:14432-14668 layout
function initialKittyKeyboard(e, r) {
  if (r) return { settled: !0, source: "bg worker" };
  if (e !== null && isStTerminal(e)) return { settled: !1, source: `env: terminal=${e}` };
  if (terminalDetector.hasUnknownSequencePrintingBug(e)) return { settled: !1, source: describeOldVte(e) };
  return { likely: !0, source: "not asked yet" };
}
//@ chunk-dxdtyerk.js:14668-14972 layout
function initialExtendedKeys(e, r) {
  let n = `env: terminal=${e || "unknown"}`;
  if (r) return { settled: !1, source: `${n}, bg worker` };
  if (e !== null && EXTENDED_KEYS_TERMINALS.includes(e)) return { settled: !0, source: n };
  if (e !== null && isStTerminal(e)) return { settled: !1, source: n };
  if (terminalDetector.hasUnknownSequencePrintingBug(e)) return { settled: !1, source: describeOldVte(e) };
  return { likely: !1, source: n };
}
//@ chunk-dxdtyerk.js:14972-15361 layout
function initialSyncOutput() {
  if (env.TMUX) return { likely: !1, source: "env: TMUX (tmux answers for itself)" };
  if (env.CLAUDE_CODE_FORCE_SYNC_OUTPUT) return { settled: !0, source: "env: CLAUDE_CODE_FORCE_SYNC_OUTPUT" };
  if (terminalDetector.isJetBrainsIdeTerminal())
    return { settled: !0, source: "env: TERMINAL_EMULATOR=JetBrains-JediTerm" };
  let e = isSynchronizedOutputSupported_2();
  if (e) return { likely: !0, source: `env: ${e}` };
  return { likely: !1, source: "env: no known terminal" };
}
/**
 * 按环境变量猜测终端是否支持同步输出（DEC 2026）：iTerm2、WezTerm、Warp、Ghostty、Contour、VS Code、Alacritty、mintty、Rio、Tabby、kitty、foot、Zed、Windows Terminal、VTE ≥0.68；返回依据字符串或 undefined。
 */
//@ chunk-dxdtyerk.js:15361-15951 fingerprint = isSynchronizedOutputSupported (0.708)
function isSynchronizedOutputSupported_2() {
  let termProgram = env.TERM_PROGRAM,
    term = env.TERM;
  if (
    termProgram === "iTerm.app" ||
    termProgram === "WezTerm" ||
    termProgram === "WarpTerminal" ||
    termProgram === "ghostty" ||
    termProgram === "contour" ||
    termProgram === "vscode" ||
    termProgram === "alacritty" ||
    termProgram === "mintty" ||
    termProgram === "rio" ||
    termProgram === "Tabby"
  )
    return `TERM_PROGRAM=${termProgram}`;
  if (term?.includes("kitty")) return `TERM=${term}`;
  if (env.KITTY_WINDOW_ID) return "KITTY_WINDOW_ID";
  if (term === "xterm-ghostty") return `TERM=${term}`;
  if (term?.startsWith("foot")) return `TERM=${term}`;
  if (term?.includes("alacritty")) return `TERM=${term}`;
  if (env.ZED_TERM) return "ZED_TERM";
  if (env.WT_SESSION) return "WT_SESSION";
  if (parseInt(env.VTE_VERSION ?? "", 10) >= 6800) return `VTE_VERSION=${env.VTE_VERSION}`;
  return;
}
//@ chunk-24t3dkzb.js:855-1523 placement
class hasCursorUpViewportYankBug {
  value = void 0;
  get() {
    let r = Rsn(),
      n = getAttacherCaps(),
      o = n?.wheelFlood ?? isXtermJsTerminal(),
      u = n ? JETBRAINS_IDES.includes(n.terminal ?? "") : terminalDetector.isJetBrainsIdeTerminal(),
      s = n?.wtSession ?? !!env.WT_SESSION,
      p = isXtermJs(),
      a = this.value;
    if (
      a &&
      a.xtversion === (r ?? "(no reply)") &&
      a.wheelFlood === o &&
      a.jediTerm === u &&
      a.wtSession === s &&
      a.xtermJs === p
    )
      return a;
    let d = "linux";
    return (
      (this.value = {
        useDecayCurve: !o && (p || d === "win32" || s),
        useAdaptiveDrain: p,
        base: u ? 2 : readScrollSpeedBase(p, o, s),
        xtermJs: p,
        wheelFlood: o,
        jediTerm: u,
        termProgram: env.TERM_PROGRAM ?? "unset",
        termProgramVersion: env.TERM_PROGRAM_VERSION ?? "unset",
        xtversion: r ?? "(no reply)",
        wtSession: s,
        scrollSpeedEnv: env.CLAUDE_CODE_SCROLL_SPEED ?? "unset",
        platform: d,
      }),
      this.value
    );
  }
  invalidate() {
    this.value = void 0;
  }
}
//@ chunk-24t3dkzb.js:1523-1546 placement
var S = new HostScoped(() => new hasCursorUpViewportYankBug());
//@ chunk-24t3dkzb.js:1546-1588 placement
function b9() {
  return S.of(getRootSession().host).get();
}
/**
 * 是否为 xterm.js 终端：Cursor、特定版本区间的 VS Code 或终端标识以 xterm.js 开头。
 */
//@ chunk-24t3dkzb.js:1588-1855 placement
function isXtermJsTerminal() {
  if (process.env.CURSOR_TRACE_ID !== void 0) return !0;
  if (env.VSCODE_GIT_ASKPASS_MAIN?.includes("cursor")) return !0;
  if (env.TERM_PROGRAM === "vscode") {
    let r = parseVersionNumber(env.TERM_PROGRAM_VERSION);
    if (r !== null) return r >= 1092000 && r < 1105000;
  }
  return Rsn()?.startsWith("xterm.js") ?? !1;
}
//@ chunk-24t3dkzb.js:1855-1978 placement
function parseVersionNumber(r) {
  if (!r) return null;
  let match = /^(\d+)\.(\d+)\.(\d+)/.exec(r);
  if (!match) return null;
  return +match[1] * 1e6 + +match[2] * 1000 + +match[3];
}
//@ chunk-24t3dkzb.js:2169-2212 placement
function crn() {
  S.of(getRootSession().host).invalidate();
}
//@ chunk-24t3dkzb.js:2212-2229 placement
var b = Re(Vy(), 1);
//@ chunk-24t3dkzb.js:2229-2246 placement
var CURSOR_HOME_FULL = csi(0, "f");
//@ chunk-24t3dkzb.js:2358-2453 placement
function isSyncOutputKnownSupported() {
  if (env.TMUX && EA().get("synchronizedOutput").state === "pending") return;
  return isSynchronizedOutputLikely();
}
/**
 * 终端是否支持同步输出（DEC 2026）：只在探测已得出结论时为真。
 */
//@ chunk-24t3dkzb.js:2453-2499 placement
function isSynchronizedOutputSupported() {
  return resolveSyncOutputSupport({ beforeTheAnswer: !1 });
}
/**
 * 同 isSynchronizedOutputSupported，但探测未完成时按“可能支持”估计。
 */
//@ chunk-24t3dkzb.js:2499-2545 placement
function isSynchronizedOutputLikely() {
  return resolveSyncOutputSupport({ beforeTheAnswer: !0 });
}
/**
 * 同步输出支持判断：后台守护进程按会话状态；非 tmux 且 CLAUDE_CODE_FORCE_SYNC_OUTPUT 时强制开；否则看能力表 synchronizedOutput（已定论用结论，未定论时 allowLikely 才用估计）。
 */
//@ chunk-24t3dkzb.js:2545-2787 placement
function resolveSyncOutputSupport({ beforeTheAnswer: allowLikely }) {
  if (env.CLAUDE_BG_BACKEND === "daemon") return getAttacherCaps()?.syncOutput !== !1;
  if (!env.TMUX && env.CLAUDE_CODE_FORCE_SYNC_OUTPUT) return !0;
  let n = EA().get("synchronizedOutput");
  if (n.state === "settled") return n.value;
  return allowLikely && n.likely;
}
/**
 * 是否启用同步输出：支持且不在 daemon 后端、tmux、zellij、JetBrains、xterm.js 或 Windows Terminal 中。
 */
//@ chunk-24t3dkzb.js:2787-2958 layout
function shouldUseSynchronizedOutput(r = isSynchronizedOutputSupported()) {
  if (env.CLAUDE_BG_BACKEND === "daemon") return !1;
  return (
    r &&
    env.TMUX == null &&
    process.env.ZELLIJ == null &&
    !terminalDetector.isJetBrainsIdeTerminal() &&
    !isXtermJs() &&
    env.WT_SESSION == null
  );
}
/**
 * 终端是否支持 OSC 9;4 进度条：会话状态优先；ConEmu 支持；Ghostty ≥1.2.0、iTerm2 ≥3.6.6 支持；Windows Terminal 与非 TTY 不支持。
 */
//@ chunk-24t3dkzb.js:2958-3320 fingerprint = isProgressReportingAvailable (0.938)
function isProgressReportingAvailable() {
  let r = getAttacherCaps()?.progressReporting;
  if (r !== void 0) return r;
  if (!process.stdout.isTTY) return !1;
  if (env.WT_SESSION) return !1;
  if (env.ConEmuANSI || env.ConEmuPID || env.ConEmuTask) return !0;
  let coerce = b.coerce(env.TERM_PROGRAM_VERSION);
  if (!coerce) return !1;
  if (env.TERM_PROGRAM === "ghostty") return gte(coerce.version, "1.2.0");
  if (env.TERM_PROGRAM === "iTerm.app") return gte(coerce.version, "3.6.6");
  return !1;
}
/**
 * 给定终端名是否在扩展键（kitty 键盘协议/modifyOtherKeys）白名单里；不给终端名时看能力探测结果。
 */
//@ chunk-24t3dkzb.js:3320-3400 layout
function isExtendedKeysTerminal(terminal) {
  if (terminal != null) return EXTENDED_KEYS_TERMINALS.includes(terminal);
  return EA().now("extendedKeys");
}
/**
 * 是否启用扩展键：tmux/screen 下不启用；能力表显示支持，且终端不在需要确认的名单里或已确认支持 kitty 键盘。
 */
//@ chunk-24t3dkzb.js:3400-3548 callgraph-fingerprint = supportsExtendedKeys (0.183)
function supportsExtendedKeys(terminal = env.terminal, capabilities = EA()) {
  if (env.TMUX || env.STY || !capabilities.now("extendedKeys")) return !1;
  return (
    terminal === null ||
    !EXTENDED_KEYS_NEEDS_CONFIRM.includes(terminal) ||
    capabilities.confirmed("kittyKeyboard")
  );
}
//@ chunk-24t3dkzb.js:3548-3616 placement = kittyKeyboard (0.863)
function popKittyKeyboardSequence() {
  return !HX() && (isExtendedKeysTerminal() || EA().now("kittyKeyboard")) ? DISABLE_KITTY_KEYBOARD : "";
}
//@ chunk-24t3dkzb.js:3616-3650 placement
function disableModifyOtherKeysSequence() {
  return HX() ? "" : DISABLE_MODIFY_OTHER_KEYS;
}
/**
 * 启用扩展键：kitty 键盘协议压栈（legacyKitty 时用旧标志位）+ modifyOtherKeys。
 */
//@ chunk-24t3dkzb.js:3650-3713 placement
function enableExtendedKeysSequence(options) {
  return isExtendedKeysTerminal()
    ? DISABLE_KITTY_KEYBOARD +
        (options?.legacyKitty ? ENABLE_KITTY_KEYBOARD_LEGACY : ENABLE_KITTY_KEYBOARD) +
        ENABLE_MODIFY_OTHER_KEYS
    : "";
}
//@ chunk-24t3dkzb.js:3713-3753 placement
function enterAltScreenSequence(r) {
  return ENTER_ALT_SCREEN + ERASE_SCREEN + CURSOR_HOME + enableExtendedKeysSequence(r);
}
//@ chunk-24t3dkzb.js:3753-3791 placement
function exitAltScreenSequence() {
  return popKittyKeyboardSequence() + EXIT_ALT_SCREEN + disableModifyOtherKeysSequence();
}
//@ chunk-24t3dkzb.js:3791-3804 placement
var STDIN_IDLE_REASSERT_MS = 5000;
//@ chunk-24t3dkzb.js:3840-3859 placement
var DECSTBM_ENABLED = shouldUseSynchronizedOutput(isSynchronizedOutputLikely());
//@ chunk-24t3dkzb.js:3859-4009 placement
function recordSlowestWrite(r, n, o) {
  let startTime = performance.now(),
    slowestWrite = r.slowestWrite;
  if (slowestWrite === void 0 || startTime - n >= slowestWrite.endedMs - slowestWrite.startedMs)
    r.slowestWrite = { startedMs: n, endedMs: startTime, bytes: o };
}
/**
 * 把 Patch 列表拼成一个字符串一次写到终端：默认用同步输出（DEC 2026 BSU/ESU）包裹；clearTerminal 按主屏/备用屏用不同清屏方式；相对光标移动的 dy 夹在视口内；写失败（EPIPE）静默处理。
 */
//@ chunk-24t3dkzb.js:4238-4838 fingerprint = writeDiffToTerminal (0.956)
function writeDiffToTerminal(terminal, patches, skipSyncMarkers = !1, rows, prefix = "") {
  let maxDy = rows !== void 0 && rows > 1 ? rows - 1 : void 0;
  if (patches.length === 0) {
    if (prefix !== "") handleEPIPE(terminal, prefix);
    return;
  }
  let useSync = !skipSyncMarkers,
    out = prefix + (useSync ? BSU : "");
  for (let patch of patches)
    switch (patch.type) {
      case "stdout":
        out += patch.content;
        break;
      case "clear":
        if (patch.count > 0) out += eraseLines(patch.count);
        break;
      case "clearTerminal":
        out += patch.altScreen ? getClearTerminalSequence() : eraseViewportInPlace(patch.viewportRows);
        break;
      case "cursorHide":
        out += HIDE_CURSOR;
        break;
      case "cursorShow":
        out += SHOW_CURSOR;
        break;
      case "cursorMove":
        out += cursorMove(patch.x, maxDy !== void 0 ? Math.max(-maxDy, Math.min(maxDy, patch.y)) : patch.y);
        break;
      case "cursorTo":
        out += cursorTo(patch.col);
        break;
      case "carriageReturn":
        out += "\r";
        break;
      case "hyperlink":
        out += link(patch.uri);
        break;
      case "styleStr":
        out += patch.str;
        break;
    }
  if (useSync) out += ESU;
  handleEPIPE(terminal, out);
}
/**
 * 是否运行在 xterm.js 终端（VS Code 等）：会话状态、TERM_PROGRAM=vscode，或 XTVERSION 应答以 xterm.js 开头。
 */
//@ chunk-brd2890s.js:3337-3474 fingerprint = isXtermJs (0.807)
function isXtermJs() {
  if (getAttacherCaps()?.isVscodeTerm) return !0;
  if (env.TERM_PROGRAM === "vscode") return !0;
  return gk().xtversionName?.startsWith("xterm.js") ?? !1;
}

export {
  di,
  b9,
  HX,
  describeMetaKey,
  supportsExtendedKeys,
  getTerminalMultiplexer,
  isSynchronizedOutputLikely,
  isSynchronizedOutputSupported,
  isXtermJs,
  SQs,
  formatTabStatus,
  wQs,
  rZn,
  recordSlowestWrite,
  enableExtendedKeysSequence,
  disableModifyOtherKeysSequence,
  popKittyKeyboardSequence,
  isProgressReportingAvailable,
  enterAltScreenSequence,
  exitAltScreenSequence,
  getInitialCapabilities,
  detectMinimalTerminal,
  shouldUseSynchronizedOutput,
  supportsItermImages,
  supportsKittyGraphics,
  DECSTBM_ENABLED,
  STDIN_IDLE_REASSERT_MS,
  getTerminalName,
  getClipboardNativeModulePath,
  b_dxdt,
  getTmuxSocketArgs,
  writeDiffToTerminal,
  tKo,
  nKo,
  oZn,
  crn,
  isXtermJsTerminal,
  isSyncOutputKnownSupported,
};

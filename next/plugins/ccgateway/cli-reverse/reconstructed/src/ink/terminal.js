/**
 * ink/terminal.ts
 *
 * 并入旧版已有路径：终端写入与能力。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/terminal.ts
 * pieces: chunk-8n54kmae.js (1), chunk-edrpfa7j.js (43), chunk-xd1cb3xs.js (25)
 * attribution: fingerprint 5, placement 45, layout 18, callgraph-fingerprint 1
 */
import { isAbsolute } from "path";
import { Buffer as N } from "buffer";
import { logError } from "../utils/log.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession, getAttacherCaps } from "../bootstrap/state.js";
import { identity } from "../utils/identity.js";
import { require_clipboard_napi_node } from "../../vendor/private-unresolved/clipboard-napi.node.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { isRunningFromTsSource } from "../utils/slowOperations.js";
import { importMetaRequire, __toESM } from "../../runtime/bun-runtime.js";
import { terminalDetector } from "./terminalColorSupport.js";
import { env, JETBRAINS_IDES } from "../utils/env.js";
import { isValidPipeOrPath } from "../utils/peerAddress.js";
import { getPlatform } from "../utils/platform.js";
import { truncateUtf8Bytes } from "../utils/stringUtils.js";
import { URL_STRIP_RE, osc, OSC, OSC_PREFIX, link } from "./termio/osc.js";
import { BEL } from "./termio/ansi.js";
import { require_semver_3 } from "../../vendor/semver/index.js";
import { semverGt } from "../utils/semver.js";
import { getTerminalProbeState, getXtversionName, getTerminalCapabilities } from "./terminalCapabilities.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-edrpfa7j.js:897-988 placement
/**
 * 终端钩子与 UI 挂载状态
 */
class TerminalHooksRegistry {
  hooks = null;
  uiMounted = false;
  setHooks(hooks) {
    this.hooks = hooks;
  }
  setUiMounted(uiMounted) {
    this.uiMounted = uiMounted;
  }
}
//@ chunk-edrpfa7j.js:988-1000 placement
/**
 * 单例
 */
var terminalHooksRegistry; // deferred: uses TerminalHooksRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-edrpfa7j.js:988", () => {
  terminalHooksRegistry = new TerminalHooksRegistry();
});
//@ chunk-edrpfa7j.js:1000-1030 placement
/**
 * 登记供终端模块使用的钩子集合。
 */
function setTerminalHooks(inkShutdownHooks) {
  terminalHooksRegistry.setHooks(inkShutdownHooks);
}
//@ chunk-edrpfa7j.js:1030-1060 placement
/**
 * 取已登记的终端钩子集合。
 */
function getTerminalHooks() {
  return terminalHooksRegistry.hooks;
}
//@ chunk-edrpfa7j.js:1060-1092 placement
/**
 * 标记 UI 已挂载
 */
function markUiMounted(mounted) {
  terminalHooksRegistry.setUiMounted(mounted);
}
//@ chunk-edrpfa7j.js:1092-1126 placement
/**
 * 终端侧判断 UI 是否已经挂载。
 */
function isUiMounted() {
  return terminalHooksRegistry.uiMounted;
}
//@ chunk-edrpfa7j.js:1126-1679 placement
class SecondRootError extends Map {
  get everMounted() {
    return isUiMounted();
  }
  set everMounted(mounted) {
    markUiMounted(mounted);
  }
  set(stream, root) {
    this.everMounted = true;
    let existing = this.get(stream);
    if (existing && existing !== root && !existing.hasUnmounted && existing.holdsRawMode)
      logError(
        Error(
          "ink: second root created on a stream whose mounted root still holds stdin (raw mode); unmount the previous root first",
        ),
      );
    return super.set(stream, root);
  }
  treeRoots = new Map();
  standaloneRender = null;
  claimForStandaloneRender(promise) {
    let clear = () => {
      if (this.standaloneRender === tracked) this.standaloneRender = null;
    };
    let tracked = promise.then(clear, clear);
    this.standaloneRender = tracked;
  }
  get pendingStandaloneRender() {
    return this.standaloneRender;
  }
}
//@ chunk-edrpfa7j.js:1679-1702 placement
/**
 * HostScoped 的“第二个根”错误
 */
var secondRootErrorSlot; // deferred: uses SecondRootError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-edrpfa7j.js:1679", () => {
  secondRootErrorSlot = new HostScoped(() => new SecondRootError());
});
//@ chunk-edrpfa7j.js:1702-1738 placement
/**
 * 取“同一宿主只允许一个 Ink 根”错误的实例。
 */
function getSecondRootError() {
  return secondRootErrorSlot.of(getRootSession().host);
}
//@ chunk-edrpfa7j.js:1738-1843 placement
/**
 * 惰性加载的节点属性模块
 */
var lazyNodeAttrsLoaded; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-edrpfa7j.js:1738", () => {
  lazyNodeAttrsLoaded = identity(
    {
      settled: false,
      embeddedTried: false,
      module: null,
    },
    (attrsState) => {
      attrsState.settled = false;
      attrsState.embeddedTried = false;
      attrsState.module = null;
    },
  );
});
//@ chunk-edrpfa7j.js:1843-2269 placement
function getClipboardNativeModulePath() {
  if (lazyNodeAttrsLoaded.settled) return lazyNodeAttrsLoaded.module;
  if (!lazyNodeAttrsLoaded.embeddedTried)
    try {
      lazyNodeAttrsLoaded.module = require_clipboard_napi_node();
      lazyNodeAttrsLoaded.settled = true;
      return lazyNodeAttrsLoaded.module;
    } catch {}
  lazyNodeAttrsLoaded.embeddedTried = true;
  if (
    readFlagWithOverride("tengu_composed_quilt", {
      safe: true,
    }) &&
    !isRunningFromTsSource()
  )
    return null;
  lazyNodeAttrsLoaded.settled = true;
  let platform = "x64-linux";
  let flattened = [platform, `${platform}-musl`].flatMap((variant) => [
    `./vendor/clipboard-napi/${variant}/clipboard-napi.node`,
    `../clipboard-napi/${variant}/clipboard-napi.node`,
  ]);
  for (let candidatePath of flattened)
    try {
      lazyNodeAttrsLoaded.module = importMetaRequire(candidatePath);
      return lazyNodeAttrsLoaded.module;
    } catch {}
  return null;
}
//@ chunk-edrpfa7j.js:2335-2431 placement
/**
 * 判断该终端是否有“未知转义序列被原样打印”的已知缺陷（决定是否关闭 kitty 键协议等）。
 */
function hasUnknownSequencePrintingBug() {
  return (
    getAttacherCaps()?.printsUnknownSequences ?? terminalDetector.hasUnknownSequencePrintingBug(env.terminal)
  );
}
//@ chunk-edrpfa7j.js:2481-2528 placement
function getTerminalName() {
  return getAttacherCaps()?.terminal ?? env.terminal;
}
//@ chunk-edrpfa7j.js:2528-2658 placement
/**
 * 当前终端复用器：附着端能力优先，否则按 TMUX/STY/ZELLIJ 判断为 tmux/screen/zellij。
 */
function getTerminalMultiplexer() {
  let attacherCaps = getAttacherCaps();
  if (attacherCaps) return attacherCaps.mux;
  if (env.TMUX) return "tmux";
  if (env.STY) return "screen";
  if (env.ZELLIJ) return "zellij";
  return null;
}
//@ chunk-edrpfa7j.js:2658-2708 placement
/**
 * 通过 SSH 连接
 */
function isSshSession() {
  return getAttacherCaps()?.ssh ?? !!env.SSH_CONNECTION;
}
//@ chunk-edrpfa7j.js:2708-2871 placement
function getTmuxSocketArgs() {
  let attacherCaps = getAttacherCaps();
  if (attacherCaps) {
    if (attacherCaps.mux !== "tmux" || !attacherCaps.tmuxSocket) return null;
    return isAbsolute(attacherCaps.tmuxSocket) && isValidPipeOrPath(attacherCaps.tmuxSocket)
      ? ["-S", attacherCaps.tmuxSocket]
      : null;
  }
  return env.TMUX ? [] : null;
}
//@ chunk-edrpfa7j.js:2871-3205 placement
function describeMetaKey() {
  let terminalName = getTerminalName();
  if (terminalName === "Apple_Terminal") return "Fn";
  if (terminalName === "iTerm.app") return "Option";
  if (getAttacherCaps()?.isVscodeTerm || (terminalName && VSCODE_FAMILY_TERMINALS.has(terminalName)))
    return getPlatform() === "macos" ? "Option" : "Shift";
  if (terminalName && KNOWN_TERMINALS.has(terminalName)) return "Shift";
  if (env.LC_TERMINAL === "iTerm2") return "Option";
  return isSshSession() || getTerminalMultiplexer() !== null || getPlatform() === "macos"
    ? "Shift (Option in iTerm2, Fn in Terminal.app)"
    : "Shift";
}
//@ chunk-edrpfa7j.js:3205-3409 placement (2.1.88 match: LINUX_TERMINALS, 0.468)
/**
 * （误归 deepLink）终端/IDE 名称集合：支持某终端特性的终端列表与 VS Code 系编辑器列表。
 */
var KNOWN_TERMINALS; // deferred: uses JETBRAINS_IDES (../utils/env.js) of its import cycle while loading; runs once the cycle is complete
var VSCODE_FAMILY_TERMINALS;
deferInit("chunk-edrpfa7j.js:3205", () => {
  KNOWN_TERMINALS = new Set([
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
  ]);
  VSCODE_FAMILY_TERMINALS = new Set(["vscode", "cursor", "windsurf", "antigravity", "codium"]);
});
//@ chunk-edrpfa7j.js:11323-11348 placement
/**
 * 2048
 */
var MAX_MSG_BASE64_CHARS = 2048;
var MAX_TITLE_BASE64_CHARS = 192;
var MAX_SESSION_NAME_CHARS = 32;
//@ chunk-edrpfa7j.js:11348-11444 placement
/**
 * 把会话名净化成只含字母数字和 _.+_，截到 32 字符，空则 undefined。
 */
function sanitizeSessionName(id) {
  let sliced = id.replace(/[^A-Za-z0-9_.+-]/g, "-").slice(0, MAX_SESSION_NAME_CHARS);
  return sliced.length > 0 ? sliced : undefined;
}
//@ chunk-edrpfa7j.js:11444-11525 placement (2.1.88 match: base64URLEncode, 1)
function base64URLEncode(text, maxBytes) {
  let truncated = truncateUtf8Bytes(text.replace(URL_STRIP_RE, " "), maxBytes);
  return N.from(truncated).toString("base64");
}
//@ chunk-edrpfa7j.js:11525-11979 placement
function formatTabStatus(tabStatus) {
  let parts = [`state=${tabStatus.state}`, "app=claude-code"];
  if (tabStatus.id !== undefined) parts.push(`id=${tabStatus.id}`);
  if (tabStatus.state === "blocked" && tabStatus.kind) parts.push(`kind=${tabStatus.kind}`);
  if (
    (tabStatus.state === "working" || tabStatus.state === "blocked") &&
    tabStatus.progress !== undefined &&
    Number.isFinite(tabStatus.progress)
  ) {
    let min = Math.min(100, Math.max(0, Math.round(tabStatus.progress)));
    parts.push(`progress=${min}`);
  }
  if (tabStatus.title) parts.push(`title=${base64URLEncode(tabStatus.title, MAX_TITLE_BASE64_CHARS)}`);
  if (tabStatus.msg) parts.push(`msg=${base64URLEncode(tabStatus.msg, MAX_MSG_BASE64_CHARS)}`);
  return osc(OSC.PROGRAM_STATUS, parts.join(":"));
}
//@ chunk-edrpfa7j.js:11979-12031 placement
/**
 * 生成 OSC 7501 “state=clear” 序列（清掉程序状态）。
 */
var PROGRAM_STATUS_CLEAR; // deferred: uses OSC (./termio/osc.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-edrpfa7j.js:11979", () => {
  PROGRAM_STATUS_CLEAR = `${OSC_PREFIX}${OSC.PROGRAM_STATUS};state=clear${BEL}`;
});
//@ chunk-edrpfa7j.js:12031-12098 placement
/**
 * 生成带 id 的 OSC 7501 状态清除序列。
 */
function programStatusClearById(id) {
  return osc(OSC.PROGRAM_STATUS, `state=clear:id=${id}`);
}
//@ chunk-edrpfa7j.js:12098-12115 placement
/**
 * semver 模块命名空间
 */
var semverModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-edrpfa7j.js:12098", () => {
  semverModule = __toESM(require_semver_3(), 1);
});
//@ chunk-edrpfa7j.js:12115-12246 layout
/**
 * 由 TERM 识别 st 或 rxvt，否则 null。
 */
function detectMinimalTerminal(terminalName) {
  if (terminalName === undefined) return null;
  if (/^st(term)?(-|$)/.test(terminalName)) return "st";
  if (/^rxvt(-|$)/.test(terminalName)) return "rxvt";
  return null;
}
//@ chunk-edrpfa7j.js:12246-12362 fingerprint (2.1.88 match: EXTENDED_KEYS_TERMINALS, 0.914)
var EXTENDED_KEYS_TERMINALS = [
  "iTerm.app",
  "kitty",
  "WezTerm",
  "ghostty",
  "tmux",
  "windows-terminal",
  "WarpTerminal",
];
var EXTENDED_KEYS_NEEDS_CONFIRM = ["windows-terminal"];
//@ chunk-edrpfa7j.js:12362-12397 layout
function isStTerminal(terminalName) {
  return detectMinimalTerminal(terminalName) === "st";
}
//@ chunk-edrpfa7j.js:12397-12481 layout
function describeOldVte(terminalName) {
  return `env: terminal=${terminalName}, VTE before 0.53 (shows the query as text)`;
}
//@ chunk-edrpfa7j.js:12481-12564 layout
var TMUX_IMAGES_PENDING_SOURCE = "env: inside tmux, waiting for tmux to say whether it passes images through";
//@ chunk-edrpfa7j.js:12564-13332 layout
/**
 * 终端能力表的初始状态（每项 settled/likely + 来源说明），由环境变量推断，之后由 probeTerminalCapabilities 的查询结果修正：extendedKeys、synchronizedOutput、kittyKeyboard、kittyGraphics、itermImages、mousePixels、programStatus。后台会话（CLAUDE_CODE_SESSION_KIND=bg）、tmux/screen、CLAUDE_CODE_FORCE_TERMINAL_IMAGES、CLAUDE_CODE_DISABLE_TERMINAL_TITLE、旧 VTE 会影响初值。
 */
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
//@ chunk-edrpfa7j.js:13332-13619 layout
function initialProgramStatus(envInfo) {
  if (envInfo.tabWritesDisabled)
    return {
      settled: false,
      source: "env: CLAUDE_CODE_DISABLE_TERMINAL_TITLE",
    };
  if (envInfo.bgWorker)
    return {
      settled: false,
      source: "bg worker",
    };
  if (terminalDetector.hasUnknownSequencePrintingBug(envInfo.terminal))
    return {
      settled: false,
      source: describeOldVte(envInfo.terminal),
    };
  return {
    likely: false,
    source: "not asked yet",
  };
}
//@ chunk-edrpfa7j.js:13619-13839 layout
function initialMousePixels(envInfo) {
  if (envInfo.bgWorker)
    return {
      settled: false,
      source: "bg worker",
    };
  if (envInfo.multiplexed)
    return {
      settled: false,
      source: "env: inside tmux or screen",
    };
  return {
    likely: false,
    source: `env: terminal=${envInfo.terminal || "unknown"}, not asked yet`,
  };
}
//@ chunk-edrpfa7j.js:13839-13878 layout
var KITTY_GRAPHICS_TERMINALS = ["kitty", "ghostty"];
var KITTY_GRAPHICS_MIN_VERSION = "0.28.0";
//@ chunk-edrpfa7j.js:13878-14053 layout
/**
 * 按 XTVERSION 名判断是否支持 kitty 图形协议：kitty ≥0.28.0 或 Ghostty。
 */
function supportsKittyGraphics(terminal) {
  if (terminal === null) return false;
  if (terminal.startsWith("kitty(")) {
    let parsedVersion = semverModule.coerce(terminal.slice(6));
    return parsedVersion !== null && semverGt(parsedVersion.version, KITTY_GRAPHICS_MIN_VERSION);
  }
  return KITTY_GRAPHICS_TERMINALS.some((prefix) => terminal === prefix || terminal.startsWith(`${prefix} `));
}
//@ chunk-edrpfa7j.js:14053-14381 layout
function initialKittyGraphics(envInfo) {
  if (envInfo.forced)
    return {
      settled: true,
      source: "env: CLAUDE_CODE_FORCE_TERMINAL_IMAGES",
    };
  if (envInfo.bgWorker)
    return {
      settled: false,
      source: "bg worker",
    };
  if (envInfo.tmux)
    return {
      likely: false,
      source: TMUX_IMAGES_PENDING_SOURCE,
    };
  if (envInfo.multiplexed)
    return {
      settled: false,
      source: "env: inside screen",
    };
  return {
    likely: false,
    source: `env: terminal=${envInfo.terminal || "unknown"}, not asked yet`,
  };
}
//@ chunk-edrpfa7j.js:14381-14396 layout
var ITERM_IMAGES_MIN_VERSION = "3.5.0";
//@ chunk-edrpfa7j.js:14396-14523 layout
/**
 * 按 XTVERSION 名判断是否 iTerm2 ≥3.5（支持内联图片按格定位）。
 */
function supportsItermImages(terminal) {
  if (terminal === null || !/^iTerm2\s/.test(terminal)) return false;
  let parsedVersion = semverModule.coerce(terminal.slice(6).trim());
  return parsedVersion !== null && semverGt(parsedVersion.version, ITERM_IMAGES_MIN_VERSION);
}
//@ chunk-edrpfa7j.js:14523-14791 layout
function initialItermImages(envInfo) {
  if (envInfo.bgWorker)
    return {
      settled: false,
      source: "bg worker",
    };
  if (envInfo.tmux)
    return {
      likely: false,
      source: TMUX_IMAGES_PENDING_SOURCE,
    };
  if (envInfo.multiplexed)
    return {
      settled: false,
      source: "env: inside screen, not supported",
    };
  return {
    likely: false,
    source: "yes only on an XTVERSION reply naming iTerm2 3.5 or later",
  };
}
//@ chunk-edrpfa7j.js:14791-15027 layout
function initialKittyKeyboard(terminalName, isBgWorker) {
  if (isBgWorker)
    return {
      settled: true,
      source: "bg worker",
    };
  if (terminalName !== null && isStTerminal(terminalName))
    return {
      settled: false,
      source: `env: terminal=${terminalName}`,
    };
  if (terminalDetector.hasUnknownSequencePrintingBug(terminalName))
    return {
      settled: false,
      source: describeOldVte(terminalName),
    };
  return {
    likely: true,
    source: "not asked yet",
  };
}
//@ chunk-edrpfa7j.js:15027-15331 layout
function initialExtendedKeys(terminalName, isBgWorker) {
  let envSource = `env: terminal=${terminalName || "unknown"}`;
  if (isBgWorker)
    return {
      settled: false,
      source: `${envSource}, bg worker`,
    };
  if (terminalName !== null && EXTENDED_KEYS_TERMINALS.includes(terminalName))
    return {
      settled: true,
      source: envSource,
    };
  if (terminalName !== null && isStTerminal(terminalName))
    return {
      settled: false,
      source: envSource,
    };
  if (terminalDetector.hasUnknownSequencePrintingBug(terminalName))
    return {
      settled: false,
      source: describeOldVte(terminalName),
    };
  return {
    likely: false,
    source: envSource,
  };
}
//@ chunk-edrpfa7j.js:15331-15720 layout
function initialSyncOutput() {
  if (env.TMUX)
    return {
      likely: false,
      source: "env: TMUX (tmux answers for itself)",
    };
  if (env.CLAUDE_CODE_FORCE_SYNC_OUTPUT)
    return {
      settled: true,
      source: "env: CLAUDE_CODE_FORCE_SYNC_OUTPUT",
    };
  if (terminalDetector.isJetBrainsIdeTerminal())
    return {
      settled: true,
      source: "env: TERMINAL_EMULATOR=JetBrains-JediTerm",
    };
  let syncSupport = isSynchronizedOutputSupported_2();
  if (syncSupport)
    return {
      likely: true,
      source: `env: ${syncSupport}`,
    };
  return {
    likely: false,
    source: "env: no known terminal",
  };
}
//@ chunk-edrpfa7j.js:15720-16310 fingerprint (2.1.88 match: isSynchronizedOutputSupported, 0.708)
/**
 * 按环境变量猜测终端是否支持同步输出（DEC 2026）：iTerm2、WezTerm、Warp、Ghostty、Contour、VS Code、Alacritty、mintty、Rio、Tabby、kitty、foot、Zed、Windows Terminal、VTE ≥0.68；返回依据字符串或 undefined。
 */
function isSynchronizedOutputSupported_2() {
  let termProgram = env.TERM_PROGRAM;
  let term = env.TERM;
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
//@ chunk-8n54kmae.js:3337-3474 fingerprint (2.1.88 match: isXtermJs, 0.807)
/**
 * 是否运行在 xterm.js 终端（VS Code 等）：会话状态、TERM_PROGRAM=vscode，或 XTVERSION 应答以 xterm.js 开头。
 */
function isXtermJs() {
  if (getAttacherCaps()?.isVscodeTerm) return true;
  if (env.TERM_PROGRAM === "vscode") return true;
  return getTerminalProbeState().xtversionName?.startsWith("xterm.js") ?? false;
}
//@ chunk-xd1cb3xs.js:855-1523 placement
class hasCursorUpViewportYankBug_2 {
  value = undefined;
  get() {
    let xtversionName = getXtversionName();
    let attacherCaps = getAttacherCaps();
    let wheelFlood = attacherCaps?.wheelFlood ?? isXtermJsTerminal();
    let isJetBrains = attacherCaps
      ? JETBRAINS_IDES.includes(attacherCaps.terminal ?? "")
      : terminalDetector.isJetBrainsIdeTerminal();
    let isWtSession = attacherCaps?.wtSession ?? !!env.WT_SESSION;
    let isXterm = isXtermJs();
    let cached = this.value;
    if (
      cached &&
      cached.xtversion === (xtversionName ?? "(no reply)") &&
      cached.wheelFlood === wheelFlood &&
      cached.jediTerm === isJetBrains &&
      cached.wtSession === isWtSession &&
      cached.xtermJs === isXterm
    )
      return cached;
    let platform = "linux";
    this.value = {
      useDecayCurve: !wheelFlood && (isXterm || platform === "win32" || isWtSession),
      useAdaptiveDrain: isXterm,
      base: isJetBrains ? 2 : readScrollSpeedBase(isXterm, wheelFlood, isWtSession),
      xtermJs: isXterm,
      wheelFlood,
      jediTerm: isJetBrains,
      termProgram: env.TERM_PROGRAM ?? "unset",
      termProgramVersion: env.TERM_PROGRAM_VERSION ?? "unset",
      xtversion: xtversionName ?? "(no reply)",
      wtSession: isWtSession,
      scrollSpeedEnv: env.CLAUDE_CODE_SCROLL_SPEED ?? "unset",
      platform,
    };
    return this.value;
  }
  invalidate() {
    this.value = undefined;
  }
}
//@ chunk-xd1cb3xs.js:1523-1546 placement
/**
 * HostScoped 的“光标上移视口”缺陷状态
 */
var cursorYankBugSlot; // deferred: uses hasCursorUpViewportYankBug_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xd1cb3xs.js:1523", () => {
  cursorYankBugSlot = new HostScoped(() => new hasCursorUpViewportYankBug_2());
});
//@ chunk-xd1cb3xs.js:1546-1588 placement
/**
 * 判断当前宿主终端是否有“光标上移导致视口错位”的缺陷。
 */
function hasCursorUpViewportYankBug() {
  return cursorYankBugSlot.of(getRootSession().host).get();
}
//@ chunk-xd1cb3xs.js:1588-1855 placement
/**
 * 是否为 xterm.js 终端：Cursor、特定版本区间的 VS Code 或终端标识以 xterm.js 开头。
 */
function isXtermJsTerminal() {
  if (process.env.CURSOR_TRACE_ID !== undefined) return true;
  if (env.VSCODE_GIT_ASKPASS_MAIN?.includes("cursor")) return true;
  if (env.TERM_PROGRAM === "vscode") {
    let versionNumber = parseVersionNumber(env.TERM_PROGRAM_VERSION);
    if (versionNumber !== null) return versionNumber >= 1092000 && versionNumber < 1105000;
  }
  return getXtversionName()?.startsWith("xterm.js") ?? false;
}
//@ chunk-xd1cb3xs.js:1855-1978 placement
function parseVersionNumber(version) {
  if (!version) return null;
  let match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return null;
  return +match[1] * 1e6 + +match[2] * 1000 + +match[3];
}
//@ chunk-xd1cb3xs.js:2169-2212 placement
/**
 * 让“光标上移缺陷”的探测结果失效，下次重新判定。
 */
function invalidateCursorYankBug() {
  cursorYankBugSlot.of(getRootSession().host).invalidate();
}
//@ chunk-xd1cb3xs.js:2212-2229 placement
/**
 * semver 模块命名空间
 */
var semverModule_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xd1cb3xs.js:2212", () => {
  semverModule_2 = __toESM(require_semver_3(), 1);
});
//@ chunk-xd1cb3xs.js:2229-2246 placement
var CURSOR_HOME_FULL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xd1cb3xs.js:2229", () => {
  CURSOR_HOME_FULL = csi(0, "f");
});
//@ chunk-xd1cb3xs.js:2358-2453 placement
function isSyncOutputKnownSupported() {
  if (env.TMUX && getTerminalCapabilities().get("synchronizedOutput").state === "pending") return;
  return isSynchronizedOutputLikely();
}
//@ chunk-xd1cb3xs.js:2453-2499 placement
/**
 * 终端是否支持同步输出（DEC 2026）：只在探测已得出结论时为真。
 */
function isSynchronizedOutputSupported() {
  return resolveSyncOutputSupport({
    beforeTheAnswer: false,
  });
}
//@ chunk-xd1cb3xs.js:2499-2545 placement
/**
 * 同 isSynchronizedOutputSupported，但探测未完成时按“可能支持”估计。
 */
function isSynchronizedOutputLikely() {
  return resolveSyncOutputSupport({
    beforeTheAnswer: true,
  });
}
//@ chunk-xd1cb3xs.js:2545-2787 placement
/**
 * 同步输出支持判断：后台守护进程按会话状态；非 tmux 且 CLAUDE_CODE_FORCE_SYNC_OUTPUT 时强制开；否则看能力表 synchronizedOutput（已定论用结论，未定论时 allowLikely 才用估计）。
 */
function resolveSyncOutputSupport({ beforeTheAnswer: allowLikely }) {
  if (env.CLAUDE_BG_BACKEND === "daemon") return getAttacherCaps()?.syncOutput !== false;
  if (!env.TMUX && env.CLAUDE_CODE_FORCE_SYNC_OUTPUT) return true;
  let reading = getTerminalCapabilities().get("synchronizedOutput");
  if (reading.state === "settled") return reading.value;
  return allowLikely && reading.likely;
}
//@ chunk-xd1cb3xs.js:2787-2958 layout
/**
 * 是否启用同步输出：支持且不在 daemon 后端、tmux、zellij、JetBrains、xterm.js 或 Windows Terminal 中。
 */
function shouldUseSynchronizedOutput(syncSupported = isSynchronizedOutputSupported()) {
  if (env.CLAUDE_BG_BACKEND === "daemon") return false;
  return (
    syncSupported &&
    env.TMUX == null &&
    process.env.ZELLIJ == null &&
    !terminalDetector.isJetBrainsIdeTerminal() &&
    !isXtermJs() &&
    env.WT_SESSION == null
  );
}
//@ chunk-xd1cb3xs.js:2958-3320 fingerprint (2.1.88 match: isProgressReportingAvailable, 0.938)
/**
 * 终端是否支持 OSC 9;4 进度条：会话状态优先；ConEmu 支持；Ghostty ≥1.2.0、iTerm2 ≥3.6.6 支持；Windows Terminal 与非 TTY 不支持。
 */
function isProgressReportingAvailable() {
  let progressReporting = getAttacherCaps()?.progressReporting;
  if (progressReporting !== undefined) return progressReporting;
  if (!process.stdout.isTTY) return false;
  if (env.WT_SESSION) return false;
  if (env.ConEmuANSI || env.ConEmuPID || env.ConEmuTask) return true;
  let version = semverModule_2.coerce(env.TERM_PROGRAM_VERSION);
  if (!version) return false;
  if (env.TERM_PROGRAM === "ghostty") return semverGt(version.version, "1.2.0");
  if (env.TERM_PROGRAM === "iTerm.app") return semverGt(version.version, "3.6.6");
  return false;
}
//@ chunk-xd1cb3xs.js:3320-3400 layout
/**
 * 给定终端名是否在扩展键（kitty 键盘协议/modifyOtherKeys）白名单里；不给终端名时看能力探测结果。
 */
function isExtendedKeysTerminal(terminal) {
  if (terminal != null) return EXTENDED_KEYS_TERMINALS.includes(terminal);
  return getTerminalCapabilities().now("extendedKeys");
}
//@ chunk-xd1cb3xs.js:3400-3548 callgraph-fingerprint (2.1.88 match: supportsExtendedKeys, 0.182)
/**
 * 是否启用扩展键：tmux/screen 下不启用；能力表显示支持，且终端不在需要确认的名单里或已确认支持 kitty 键盘。
 */
function supportsExtendedKeys(terminal = env.terminal, capabilities = getTerminalCapabilities()) {
  if (env.TMUX || env.STY || !capabilities.now("extendedKeys")) return false;
  return (
    terminal === null ||
    !EXTENDED_KEYS_NEEDS_CONFIRM.includes(terminal) ||
    capabilities.confirmed("kittyKeyboard")
  );
}
//@ chunk-xd1cb3xs.js:3548-3616 placement (2.1.88 match: kittyKeyboard, 0.863)
function popKittyKeyboardSequence() {
  return !hasUnknownSequencePrintingBug() &&
    (isExtendedKeysTerminal() || getTerminalCapabilities().now("kittyKeyboard"))
    ? DISABLE_KITTY_KEYBOARD
    : "";
}
//@ chunk-xd1cb3xs.js:3616-3650 placement
function disableModifyOtherKeysSequence() {
  return hasUnknownSequencePrintingBug() ? "" : DISABLE_MODIFY_OTHER_KEYS;
}
//@ chunk-xd1cb3xs.js:3650-3713 placement
/**
 * 启用扩展键：kitty 键盘协议压栈（legacyKitty 时用旧标志位）+ modifyOtherKeys。
 */
function enableExtendedKeysSequence(options) {
  return isExtendedKeysTerminal()
    ? DISABLE_KITTY_KEYBOARD +
        (options?.legacyKitty ? ENABLE_KITTY_KEYBOARD_LEGACY : ENABLE_KITTY_KEYBOARD) +
        ENABLE_MODIFY_OTHER_KEYS
    : "";
}
//@ chunk-xd1cb3xs.js:3713-3753 placement
function enterAltScreenSequence(options) {
  return ENTER_ALT_SCREEN + ERASE_SCREEN + CURSOR_HOME + enableExtendedKeysSequence(options);
}
//@ chunk-xd1cb3xs.js:3753-3791 placement
function exitAltScreenSequence() {
  return popKittyKeyboardSequence() + EXIT_ALT_SCREEN + disableModifyOtherKeysSequence();
}
//@ chunk-xd1cb3xs.js:3791-3804 placement
var STDIN_IDLE_REASSERT_MS = 5000;
//@ chunk-xd1cb3xs.js:3840-3859 placement
var DECSTBM_ENABLED; // deferred: uses shouldUseSynchronizedOutput of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xd1cb3xs.js:3840", () => {
  DECSTBM_ENABLED = shouldUseSynchronizedOutput(isSynchronizedOutputLikely());
});
//@ chunk-xd1cb3xs.js:3859-4009 placement
function recordSlowestWrite(stats, startedMs, bytes) {
  let startTime = performance.now();
  let slowestWrite = stats.slowestWrite;
  if (slowestWrite === undefined || startTime - startedMs >= slowestWrite.endedMs - slowestWrite.startedMs)
    stats.slowestWrite = {
      startedMs,
      endedMs: startTime,
      bytes,
    };
}
//@ chunk-xd1cb3xs.js:4238-4838 fingerprint (2.1.88 match: writeDiffToTerminal, 0.955)
/**
 * 把 Patch 列表拼成一个字符串一次写到终端：默认用同步输出（DEC 2026 BSU/ESU）包裹；clearTerminal 按主屏/备用屏用不同清屏方式；相对光标移动的 dy 夹在视口内；写失败（EPIPE）静默处理。
 */
function writeDiffToTerminal(terminal, patches, skipSyncMarkers = false, rows, prefix = "") {
  let maxDy = rows !== undefined && rows > 1 ? rows - 1 : undefined;
  if (patches.length === 0) {
    if (prefix !== "") handleEPIPE(terminal, prefix);
    return;
  }
  let useSync = !skipSyncMarkers;
  let out = prefix + (useSync ? BSU : "");
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
        out += cursorMove(
          patch.x,
          maxDy !== undefined ? Math.max(-maxDy, Math.min(maxDy, patch.y)) : patch.y,
        );
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
export {
  sanitizeSessionName,
  isSynchronizedOutputSupported,
  isXtermJs,
  hasUnknownSequencePrintingBug,
  describeMetaKey,
  hasCursorUpViewportYankBug,
  getSecondRootError,
  detectMinimalTerminal,
  shouldUseSynchronizedOutput,
  isSynchronizedOutputLikely,
  supportsItermImages,
  supportsKittyGraphics,
  DECSTBM_ENABLED,
  STDIN_IDLE_REASSERT_MS,
  getTerminalName,
  getTerminalMultiplexer,
  getClipboardNativeModulePath,
  isSshSession,
  getTmuxSocketArgs,
  disableModifyOtherKeysSequence,
  popKittyKeyboardSequence,
  isProgressReportingAvailable,
  PROGRAM_STATUS_CLEAR,
  writeDiffToTerminal,
  recordSlowestWrite,
  getTerminalHooks,
  isUiMounted,
  exitAltScreenSequence,
  invalidateCursorYankBug,
  getInitialCapabilities,
  enterAltScreenSequence,
  supportsExtendedKeys,
  enableExtendedKeysSequence,
  isXtermJsTerminal,
  isSyncOutputKnownSupported,
  formatTabStatus,
  programStatusClearById,
  setTerminalHooks,
};

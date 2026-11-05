/**
 * ink/termio/osc.ts
 *
 * OSC 序列：超链接、窗口标题、剪贴板 OSC 52、通知、tmux 直通包装
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/termio/osc.ts
 * pieces: chunk-2avr6cej.js (5), chunk-edrpfa7j.js (33)
 * attribution: fingerprint 12, layout 20, placement 3, callgraph-fingerprint 2, callgraph-witnessed 1
 */
import { Buffer as N } from "buffer";
import { ESC, ESC_TYPE, BEL, SEP } from "./ansi.js";
import {
  getTerminalName,
  getTerminalMultiplexer,
  getClipboardNativeModulePath,
  isSshSession,
  getTmuxSocketArgs,
  hasUnknownSequencePrintingBug,
} from "../terminal.js";
import { getPlatform } from "../../utils/platform.js";
import { whichAsync } from "../../utils/which.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { terminalDetector } from "../terminalColorSupport.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { ANY_CONTROL_CHAR_RE } from "../../utils/stringUtils.js";
import { cursorPosition } from "./csi.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-edrpfa7j.js:2431-2481 fingerprint (2.1.88 match: OSC_PREFIX, 1)
/**
 * OSC 引导符：ESC ] 与字符串结束符 ST（kitty 用 ST，其它终端用 BEL 结束）。
 */
var OSC_PREFIX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ST;
deferInit("chunk-edrpfa7j.js:2431", () => {
  OSC_PREFIX = ESC + String.fromCharCode(ESC_TYPE.OSC);
  ST = ESC + "\\";
});
//@ chunk-edrpfa7j.js:3409-3485 fingerprint (2.1.88 match: osc, 0.817)
/**
 * 按当前终端（kitty 用 ST，其余用 BEL）拼接 OSC 序列。
 */
function osc(...parts) {
  let terminator = getTerminalName() === "kitty" ? ST : BEL;
  return `${OSC_PREFIX}${parts.join(SEP)}${terminator}`;
}
//@ chunk-edrpfa7j.js:3485-3664 callgraph-fingerprint (2.1.88 match: wrapForMultiplexer, 0.333)
/**
 * 按当前复用器包装序列：tmux 用 DCS tmux; 透传（ESC 加倍），screen 用 DCS 透传，其它原样。
 */
function wrapForMultiplexer(sequence) {
  let terminalMultiplexer = getTerminalMultiplexer();
  if (terminalMultiplexer === "tmux") return `\x1BPtmux;${sequence.replaceAll("\x1B", "\x1B\x1B")}\x1B\\`;
  if (terminalMultiplexer === "screen") return `\x1BP${sequence.replaceAll("\x1B", "\x1B\x1B")}\x1B\\`;
  return sequence;
}
//@ chunk-edrpfa7j.js:3664-4430 layout
/**
 * Linux 剪贴板工具探测（按 host 单例）：Wayland 下 wl-copy，X11 下 xclip/xsel，都没有时用原生插件 setLinuxClipboardText；记录插件写入成败与 wl-copy 并发序号。
 */
class LinuxClipboardTool {
  tool = undefined;
  addonWriteFailed = false;
  addonWriteSucceeded = false;
  waylandCopyGeneration = 0;
  async probe() {
    if (getPlatform() !== "linux" || (typeof this.tool === "string" && this.tool !== "addon")) return;
    let { display, waylandDisplay } = getDisplayEnv();
    if (waylandDisplay && (await whichAsync("wl-copy"))) {
      this.tool = "wl-copy";
      return;
    }
    if (display) {
      if (await whichAsync("xclip")) {
        this.tool = "xclip";
        return;
      }
      if (await whichAsync("xsel")) {
        this.tool = "xsel";
        return;
      }
    }
    if (
      !this.addonWriteFailed &&
      hasLocalDisplay() &&
      getClipboardNativeModulePath()?.setLinuxClipboardText
    ) {
      this.tool = "addon";
      return;
    }
    this.tool = null;
  }
  recordAddonWrite(succeeded) {
    if (succeeded) this.addonWriteSucceeded = true;
    else this.addonWriteFailed ||= !this.addonWriteSucceeded;
  }
  beginWaylandCopy() {
    return ++this.waylandCopyGeneration;
  }
  isLatestWaylandCopy(generation) {
    return generation === this.waylandCopyGeneration;
  }
  reset() {
    this.tool = undefined;
    this.addonWriteFailed = false;
    this.addonWriteSucceeded = false;
  }
}
//@ chunk-edrpfa7j.js:4430-4453 layout
var linuxClipboardByHost; // deferred: uses LinuxClipboardTool of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-edrpfa7j.js:4430", () => {
  linuxClipboardByHost = new HostScoped(() => new LinuxClipboardTool());
});
//@ chunk-edrpfa7j.js:4453-4488 layout
function getLinuxClipboardTool() {
  return linuxClipboardByHost.of(getRootSession().host);
}
//@ chunk-edrpfa7j.js:4488-4678 fingerprint (2.1.88 match: getClipboardPath, 0.488)
/**
 * 预测复制会走哪条路径：本地 macOS/Windows/WSL 或已探测到 Linux 工具时为 native，在 tmux 里为 tmux-buffer，否则 osc52。
 */
function getClipboardPath() {
  if (!isSshSession())
    switch (getPlatform()) {
      case "macos":
      case "windows":
      case "wsl":
        return "native";
      case "linux":
        if (typeof getLinuxClipboardTool().tool === "string") return "native";
        break;
    }
  if (getTmuxSocketArgs()) return "tmux-buffer";
  return "osc52";
}
//@ chunk-edrpfa7j.js:4678-4712 layout
function probeLinuxClipboard() {
  return getLinuxClipboardTool().probe();
}
//@ chunk-edrpfa7j.js:4712-4828 layout
function getLinuxClipboardToolName() {
  if (getPlatform() !== "linux") return "not_linux";
  let { tool } = getLinuxClipboardTool();
  if (tool === undefined) return "not_probed";
  return tool ?? "none";
}
//@ chunk-edrpfa7j.js:4828-4870 layout
function isVteTerminal() {
  return env.VTE_VERSION != null;
}
//@ chunk-edrpfa7j.js:4870-4962 layout
function getDisplayEnv() {
  return {
    display: process.env.DISPLAY,
    waylandDisplay: process.env.WAYLAND_DISPLAY,
  };
}
//@ chunk-edrpfa7j.js:4962-5052 layout
function hasLocalDisplay() {
  let { display, waylandDisplay } = getDisplayEnv();
  if (display) return /^(unix)?:/.test(display);
  return !!waylandDisplay;
}
//@ chunk-edrpfa7j.js:5052-5095 layout
function hasNonAscii(text) {
  return /[^\x00-\x7f]/.test(text);
}
//@ chunk-edrpfa7j.js:5095-5246 layout
/**
 * VS Code 1.123/1.124 的 OSC 52 会把非 ASCII 粘贴成乱码：命中时返回提示文字。
 */
function getOsc52Utf8Warning(text) {
  if (!terminalDetector.hasOsc52ClipboardUtf8Bug() || !hasNonAscii(text)) return null;
  return "VS Code 1.123/1.124 will mojibake this paste \u2014 update to \u22651.125";
}
//@ chunk-edrpfa7j.js:5246-5718 fingerprint (2.1.88 match: tmuxLoadBuffer, 0.339)
/**
 * 把文本写进 tmux 粘贴缓冲（load-buffer -w，失败再不带 -w 重试），让 tmux 同步到系统剪贴板。
 */
async function tmuxLoadBuffer(text) {
  let tmuxSocketArgs = getTmuxSocketArgs();
  if (!tmuxSocketArgs) return false;
  let execOptions = {
    input: text,
    useCwd: false,
    timeout: 2000,
  };
  let LC_TERMINAL = env.LC_TERMINAL ?? "unset";
  let args = tmuxSocketArgs.length > 0 ? "attacher socket" : "$TMUX";
  let { code } = await execFileNoThrow("tmux", [...tmuxSocketArgs, "load-buffer", "-w", "-"], execOptions);
  logForDebugging(
    `clipboard: tmux load-buffer -w - \u2192 exit ${code} (server=${args} LC_TERMINAL=${LC_TERMINAL})`,
  );
  if (code === 0) return true;
  let retryResult = await execFileNoThrow("tmux", [...tmuxSocketArgs, "load-buffer", "-"], execOptions);
  logForDebugging(
    `clipboard: retry tmux load-buffer - \u2192 exit ${retryResult.code} (server=${args} LC_TERMINAL=${LC_TERMINAL})`,
  );
  return retryResult.code === 0;
}
//@ chunk-edrpfa7j.js:5718-5727 layout
var SCREEN_OSC52_CHUNK = 76;
//@ chunk-edrpfa7j.js:5727-6387 callgraph-witnessed (2.1.88 match: setClipboard, 0.222)
/**
 * 复制到剪贴板：本地（非 SSH）先用原生方式（pbcopy、wl-copy、xclip/xsel、插件、PowerShell Set-Clipboard），再写 tmux 缓冲；返回需要写到终端的 OSC 52 序列（tmux 下原样+透传各一份、screen 下分块 DCS；VTE 系终端在本地已复制时不发）。
 */
async function setClipboard(text) {
  let base64 = N.from(text, "utf8").toString("base64");
  let isSsh = isSshSession();
  let platform = getPlatform();
  let copiedNatively = false;
  if (!isSsh) {
    if (platform === "linux" && typeof getLinuxClipboardTool().tool !== "string")
      await getLinuxClipboardTool().probe();
    copiedNatively = copyNative(text);
  }
  await tmuxLoadBuffer(text);
  let mux = getTerminalMultiplexer();
  let skipOsc52 =
    (copiedNatively &&
      (platform === "linux" || platform === "wsl") &&
      terminalDetector.isVteBasedTerminal(getTerminalName())) ||
    hasUnknownSequencePrintingBug();
  let emitKind = skipOsc52 ? "none(vte)" : mux === "tmux" ? "raw+dcs" : mux === "screen" ? "dcs" : "raw";
  logForDebugging(
    `clipboard: setClipboard mux=${mux ?? "none"} ssh=${isSsh} native=${copiedNatively} predicted=${getClipboardPath()} emit=${emitKind} bytes=${text.length}`,
  );
  if (skipOsc52) return "";
  if (mux === "tmux") {
    let sequence = `${ESC}]52;c;${base64}${BEL}`;
    return sequence + wrapForMultiplexer(sequence);
  }
  if (mux === "screen") {
    let chunks = [];
    for (let offset = 0; offset < base64.length; offset += SCREEN_OSC52_CHUNK)
      chunks.push(base64.slice(offset, offset + SCREEN_OSC52_CHUNK));
    return `${ESC}P${ESC}]52;c;${chunks.join(`${ST}${ESC}P`)}${BEL}${ST}`;
  }
  return osc(OSC.CLIPBOARD, "c", base64);
}
//@ chunk-edrpfa7j.js:6387-6568 layout
var POWERSHELL_SET_CLIPBOARD =
  "[Console]::InputEncoding = [Text.Encoding]::UTF8; Set-Clipboard -Value ([Console]::In.ReadToEnd())";
var POWERSHELL_GET_CLIPBOARD = "[Console]::OutputEncoding = [Text.Encoding]::UTF8; Get-Clipboard -Raw";
//@ chunk-edrpfa7j.js:6568-7338 fingerprint (2.1.88 match: copyNative, 0.581)
/**
 * 用平台原生工具复制文本（macOS pbcopy；Linux wl-copy / xclip / xsel 同时写 clipboard 与 primary，或原生插件；WSL/Windows PowerShell），返回是否已复制。
 */
function copyNative(text) {
  let opts = {
    input: text,
    useCwd: false,
    timeout: 2000,
  };
  switch (getPlatform()) {
    case "macos":
      execFileNoThrow("pbcopy", [], opts);
      return true;
    case "linux": {
      let linuxClipboardTool = getLinuxClipboardTool();
      if (linuxClipboardTool.tool === "wl-copy") {
        waylandCopy(text);
        return true;
      }
      if (linuxClipboardTool.tool === "xclip") {
        let optsWithCgroup = {
          ...opts,
          useToolMemoryCgroup: false,
        };
        execFileNoThrow("xclip", ["-selection", "clipboard"], optsWithCgroup);
        execFileNoThrow("xclip", ["-selection", "primary"], optsWithCgroup);
        return true;
      }
      if (linuxClipboardTool.tool === "xsel") {
        let optsWithCgroup = {
          ...opts,
          useToolMemoryCgroup: false,
        };
        execFileNoThrow("xsel", ["--clipboard", "--input"], optsWithCgroup);
        execFileNoThrow("xsel", ["--primary", "--input"], optsWithCgroup);
        return true;
      }
      if (linuxClipboardTool.tool === "addon") {
        let handled;
        try {
          handled = getClipboardNativeModulePath()?.setLinuxClipboardText(text) === true;
        } catch {
          handled = false;
        }
        linuxClipboardTool.recordAddonWrite(handled);
        linuxClipboardTool.probe();
        return handled;
      }
      return false;
    }
    case "wsl":
      execFileNoThrow(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", POWERSHELL_SET_CLIPBOARD],
        opts,
      );
      return true;
    case "windows":
      execFileNoThrow(
        "powershell",
        ["-NoProfile", "-NonInteractive", "-Command", POWERSHELL_SET_CLIPBOARD],
        opts,
      );
      return true;
  }
  return false;
}
//@ chunk-edrpfa7j.js:7338-7578 layout
async function waylandCopy(text) {
  let linuxClipboardTool = getLinuxClipboardTool();
  let copyGeneration = linuxClipboardTool.beginWaylandCopy();
  let execOptions = {
    input: text,
    useCwd: false,
    timeout: 2000,
    stdout: "ignore",
    stderr: "ignore",
    useToolMemoryCgroup: false,
  };
  await execFileNoThrow("wl-copy", [], execOptions);
  if (!linuxClipboardTool.isLatestWaylandCopy(copyGeneration)) return;
  await execFileNoThrow("wl-copy", ["--primary"], execOptions);
}
//@ chunk-edrpfa7j.js:7578-8272 layout
/**
 * 读系统剪贴板（中键/右键粘贴用）：macOS pbpaste、Windows/WSL PowerShell Get-Clipboard、Linux 依次尝试 wl-paste/xclip/xsel（clipboard 或 primary）再退到原生插件；SSH 中返回空串。
 */
async function readClipboard(selection = "clipboard") {
  if (isSshSession()) return "";
  let execOptions = {
    useCwd: false,
    timeout: 2000,
  };
  switch (getPlatform()) {
    case "macos": {
      let result = await execFileNoThrow("pbpaste", [], execOptions);
      return result.code === 0 ? result.stdout : "";
    }
    case "windows":
    case "wsl": {
      let result = await execFileNoThrow(
        getPlatform() === "wsl" ? "powershell.exe" : "powershell",
        ["-NoProfile", "-NonInteractive", "-Command", POWERSHELL_GET_CLIPBOARD],
        execOptions,
      );
      return result.code === 0
        ? result.stdout
            .replace(
              /\r\n/g,
              `
`,
            )
            .replace(/\n$/, "")
        : "";
    }
    case "linux": {
      let usePrimary = selection === "primary";
      let commands = [
        ["wl-paste", usePrimary ? ["--primary", "--no-newline"] : ["--no-newline"]],
        ["xclip", ["-selection", usePrimary ? "primary" : "clipboard", "-o"]],
        ["xsel", [usePrimary ? "--primary" : "--clipboard", "--output"]],
      ];
      for (let [item, index] of commands) {
        let output = await execFileNoThrow(item, [...index], execOptions);
        if (output.code === 0) return output.stdout;
      }
      return (await readClipboardViaAddon(usePrimary, execOptions.timeout)) ?? "";
    }
    default:
      return "";
  }
}
//@ chunk-edrpfa7j.js:8272-8456 layout
async function readClipboardViaAddon(selection, timeout) {
  if (!hasLocalDisplay()) return null;
  try {
    return (
      (await getClipboardNativeModulePath()?.getLinuxClipboardText?.(selection, timeout))?.replace(
        /\r?\n$|\r$/,
        "",
      ) ?? null
    );
  } catch (error) {
    logForDebugging(`clipboard: addon read: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-edrpfa7j.js:8456-8796 fingerprint (2.1.88 match: OSC, 0.951)
/**
 * OSC 编号常量表（标题、颜色、超链接、剪贴板 OSC 52、kitty、标签状态等）。
 */
var OSC = {
  SET_TITLE_AND_ICON: 0,
  SET_ICON: 1,
  SET_TITLE: 2,
  SET_COLOR: 4,
  SET_CWD: 7,
  HYPERLINK: 8,
  ITERM2: 9,
  SET_FG_COLOR: 10,
  SET_BG_COLOR: 11,
  SET_CURSOR_COLOR: 12,
  CLIPBOARD: 52,
  KITTY: 99,
  RESET_COLOR: 104,
  RESET_FG_COLOR: 110,
  RESET_BG_COLOR: 111,
  RESET_CURSOR_COLOR: 112,
  SEMANTIC_PROMPT: 133,
  GHOSTTY: 777,
  ITERM2_PROPRIETARY: 1337,
  PROGRAM_STATUS: 7501,
  TAB_STATUS: 21337,
};
//@ chunk-edrpfa7j.js:8796-9537 fingerprint (2.1.88 match: parseOSC, 1)
/**
 * 解析 OSC 内容为语义动作：标题（0/1/2）、超链接开始/结束（8，含 id 等参数）、标签状态（21337）；其余 unknown。
 */
function parseOSC(content) {
  let semicolonIdx = content.indexOf(";");
  let command = semicolonIdx >= 0 ? content.slice(0, semicolonIdx) : content;
  let data = semicolonIdx >= 0 ? content.slice(semicolonIdx + 1) : "";
  let commandNum = parseInt(command, 10);
  if (commandNum === OSC.SET_TITLE_AND_ICON)
    return {
      type: "title",
      action: {
        type: "both",
        title: data,
      },
    };
  if (commandNum === OSC.SET_ICON)
    return {
      type: "title",
      action: {
        type: "iconName",
        name: data,
      },
    };
  if (commandNum === OSC.SET_TITLE)
    return {
      type: "title",
      action: {
        type: "windowTitle",
        title: data,
      },
    };
  if (commandNum === OSC.HYPERLINK) {
    let parts = data.split(";");
    let paramsStr = parts[0] ?? "";
    let url = parts.slice(1).join(";");
    if (url === "")
      return {
        type: "link",
        action: {
          type: "end",
        },
      };
    let params = {};
    if (paramsStr)
      for (let pair of paramsStr.split(":")) {
        let eqIdx = pair.indexOf("=");
        if (eqIdx >= 0) params[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
      }
    return {
      type: "link",
      action: {
        type: "start",
        url,
        params: Object.keys(params).length > 0 ? params : undefined,
      },
    };
  }
  if (commandNum === OSC.TAB_STATUS)
    return {
      type: "tabStatus",
      action: parseTabStatus(data),
    };
  return {
    type: "unknown",
    sequence: `\x1B]${content}`,
  };
}
//@ chunk-edrpfa7j.js:9537-9896 placement (2.1.88 match: rgb, 1)
/**
 * 解析颜色字符串（#rrggbb 或 X11 rgb:h/h/h，1–4 位十六进制）为 {type:'rgb', r, g, b}。
 */
function parseOscColor(text) {
  let match = text.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (match)
    return {
      type: "rgb",
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16),
    };
  let match_2 = text.match(/^rgb:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})$/i);
  if (match_2) {
    let channelFromHex = (hex) => Math.round((parseInt(hex, 16) / (16 ** hex.length - 1)) * 255);
    return {
      type: "rgb",
      r: channelFromHex(match_2[1]),
      g: channelFromHex(match_2[2]),
      b: channelFromHex(match_2[3]),
    };
  }
  return null;
}
//@ chunk-edrpfa7j.js:9896-10109 fingerprint (2.1.88 match: parseTabStatus, 1)
/**
 * 解析标签状态 OSC 21337 的 key=value;… 字段（indicator / status / status-color，空值表示清除）。
 */
function parseTabStatus(data) {
  let action = {};
  for (let [key, value] of splitTabStatusFields(data))
    switch (key) {
      case "indicator":
        action.indicator = value === "" ? null : parseOscColor(value);
        break;
      case "status":
        action.status = value === "" ? null : value;
        break;
      case "status-color":
        action.statusColor = value === "" ? null : parseOscColor(value);
        break;
    }
  return action;
}
//@ chunk-edrpfa7j.js:10109-10327 layout
/**
 * 按 ; 与 = 切分标签状态字段，支持反斜杠转义。
 */
function* splitTabStatusFields(data) {
  let key = "";
  let val = "";
  let inVal = false;
  let esc = false;
  for (let char of data)
    if (esc) {
      if (inVal) val += char;
      else key += char;
      esc = false;
    } else if (char === "\\") esc = true;
    else if (char === ";") {
      yield [key, val];
      key = "";
      val = "";
      inVal = false;
    } else if (char === "=" && !inVal) inVal = true;
    else if (inVal) val += char;
    else key += char;
  if (key || inVal) yield [key, val];
}
//@ chunk-edrpfa7j.js:10327-10359 layout
var URL_STRIP_RE; // deferred: uses CONTROL_CHARS_EXCEPT_WS_RE (../../utils/stringUtils.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-edrpfa7j.js:10327", () => {
  URL_STRIP_RE = new RegExp(ANY_CONTROL_CHAR_RE.source, "g");
});
//@ chunk-edrpfa7j.js:10359-10522 fingerprint (2.1.88 match: link, 1)
/**
 * 生成 OSC 8 超链接开始序列：去掉 URL 中的非法字符，附带由 URL 哈希得到的 id（相同链接跨行能被终端识别为同一个）；空 URL 返回结束序列。
 */
function link(url, params) {
  let url_2 = url.replace(URL_STRIP_RE, "");
  if (!url_2) return LINK_END;
  let paramsWithId = {
    id: osc8Id(url_2),
    ...params,
  };
  let paramStr = Object.entries(paramsWithId)
    .map(([k, v]) => `${k}=${v}`)
    .join(":");
  return osc(OSC.HYPERLINK, paramStr, url_2);
}
//@ chunk-edrpfa7j.js:10522-10628 callgraph-fingerprint (2.1.88 match: osc8Id, 1)
/**
 * URL 的 32 位哈希（base36），作 OSC 8 的 id 参数。
 */
function osc8Id(url) {
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}
//@ chunk-edrpfa7j.js:10628-10893 fingerprint (2.1.88 match: PROGRESS, 0.452)
/**
 * 常用 OSC 序列：OSC 8 结束、iTerm2 OSC 9 子命令（通知/徽标/进度 4）、进度状态（清除/设置/错误/不确定）、清除进度条、清除标题、清除标签状态。
 */
var LINK_END; // deferred: uses osc of its import cycle while loading; runs once the cycle is complete
var ITERM2_OSC9;
var PROGRESS;
var CLEAR_PROGRESS;
var CLEAR_TERMINAL_TITLE;
var CLEAR_TAB_STATUS;
deferInit("chunk-edrpfa7j.js:10628", () => {
  LINK_END = osc(OSC.HYPERLINK, "", "");
  ITERM2_OSC9 = {
    NOTIFY: 0,
    BADGE: 2,
    PROGRESS: 4,
  };
  PROGRESS = {
    CLEAR: 0,
    SET: 1,
    ERROR: 2,
    INDETERMINATE: 3,
  };
  CLEAR_PROGRESS = `${OSC_PREFIX}${OSC.ITERM2};${ITERM2_OSC9.PROGRESS};${PROGRESS.CLEAR};${BEL}`;
  CLEAR_TERMINAL_TITLE = `${OSC_PREFIX}${OSC.SET_TITLE_AND_ICON};${BEL}`;
  CLEAR_TAB_STATUS = osc(OSC.TAB_STATUS, "indicator=;status=;status-color=");
});
//@ chunk-edrpfa7j.js:10893-10917 layout
function isTabStatusEnabled() {
  return false;
}
//@ chunk-edrpfa7j.js:10917-11323 fingerprint (2.1.88 match: tabStatus, 1)
/**
 * 生成标签状态序列 OSC 21337（indicator=#rrggbb;status=…;status-color=…），status 中的 \ 和 ; 转义。
 */
function tabStatus(fields) {
  let parts = [];
  let rgb = (color) =>
    color.type === "rgb"
      ? `#${[color.r, color.g, color.b].map((n) => n.toString(16).padStart(2, "0")).join("")}`
      : "";
  if ("indicator" in fields) parts.push(`indicator=${fields.indicator ? rgb(fields.indicator) : ""}`);
  if ("status" in fields)
    parts.push(`status=${fields.status?.replaceAll("\\", "\\\\").replaceAll(";", "\\;") ?? ""}`);
  if ("statusColor" in fields)
    parts.push(`status-color=${fields.statusColor ? rgb(fields.statusColor) : ""}`);
  return osc(OSC.TAB_STATUS, parts.join(";"));
}
//@ chunk-2avr6cej.js:268604-268687 fingerprint (2.1.88 match: tmuxPassthrough, 0.681)
var TMUX_PASSTHROUGH_PREFIX = `${ESC}Ptmux;`;
var TMUX_PASSTHROUGH_MAX = 262144;
var SAVE_CURSOR_DEC = `${ESC}7`;
var RESTORE_CURSOR_DEC = `${ESC}8`;
var ITERM_FILE_PREFIX_2 = `${ESC}]1337;File=`;
var MULTIPART_OVERHEAD = 64;
//@ chunk-2avr6cej.js:268687-268739 layout
function tmuxPassthrough(sequence) {
  return TMUX_PASSTHROUGH_PREFIX + sequence.replaceAll(ESC, ESC + ESC) + ST;
}
//@ chunk-2avr6cej.js:268739-269168 layout
/**
 * 把一串转义序列按 tmux 透传上限（256KB）切块，每块包成 DCS tmux 透传。
 */
function tmuxPassthroughChunked(text) {
  let out = "";
  let pending = "";
  let pendingLen = 0;
  let pos = 0;
  while (pos < text.length) {
    let kind = text[pos] === ESC ? text[pos + 1] : undefined;
    let limit = text.length;
    if (kind === "_" || kind === "P") {
      let index = text.indexOf(ST, pos + 2);
      limit = index === -1 ? limit : index + ST.length;
    } else if (kind === "]") {
      let index = text.indexOf(BEL, pos + 2);
      let index_2 = text.indexOf(ST, pos + 2);
      limit =
        index !== -1 && (index_2 === -1 || index < index_2)
          ? index + BEL.length
          : index_2 === -1
            ? limit
            : index_2 + ST.length;
    } else {
      let index = text.indexOf(ESC, pos + 1);
      limit = index === -1 ? limit : index;
    }
    let text_2 = text.slice(pos, limit);
    let escapedLength = tmuxEscapedLength(text_2);
    pos = limit;
    if (pending !== "" && pendingLen + escapedLength > TMUX_PASSTHROUGH_MAX) {
      out += tmuxPassthrough(pending);
      pending = "";
      pendingLen = 0;
    }
    pending += text_2;
    pendingLen += escapedLength;
  }
  return pending === "" ? out : out + tmuxPassthrough(pending);
}
//@ chunk-2avr6cej.js:269168-269715 placement
/**
 * tmux 下的 iTerm2 图片：保存光标、移到 pane 内绝对位置、输出图片、恢复光标，整体透传；超过上限时改用 MultipartFile/FilePart/FileEnd 分片。
 */
function wrapItermImageForTmux(sequence, position) {
  let index = sequence.indexOf(":", ITERM_FILE_PREFIX_2.length);
  if (!(
    sequence.startsWith(ITERM_FILE_PREFIX_2) &&
    sequence.endsWith(BEL) &&
    sequence.indexOf(ESC, 1) === -1 &&
    sequence.indexOf(BEL) === sequence.length - BEL.length &&
    index !== -1
  ))
    throw TypeError("tmux passthrough: expected exactly one iTerm2 File= sequence ending in BEL");
  let cursorMove = cursorPosition(position.row, position.column);
  let payload = SAVE_CURSOR_DEC + cursorMove + sequence + RESTORE_CURSOR_DEC;
  if (tmuxEscapedLength(payload) <= TMUX_PASSTHROUGH_MAX) return tmuxPassthrough(payload);
  let fileParams = sequence.slice(ITERM_FILE_PREFIX_2.length, index);
  let fileData = sequence.slice(index + 1, -BEL.length);
  let chunkSize = TMUX_PASSTHROUGH_MAX - MULTIPART_OVERHEAD;
  let output = tmuxPassthrough(`${ESC}]1337;MultipartFile=${fileParams}${BEL}`);
  for (let offset = 0; offset < fileData.length; offset += chunkSize)
    output += tmuxPassthrough(`${ESC}]1337;FilePart=${fileData.slice(offset, offset + chunkSize)}${BEL}`);
  return (
    output + tmuxPassthrough(`${SAVE_CURSOR_DEC}${cursorMove}${ESC}]1337;FileEnd${BEL}${RESTORE_CURSOR_DEC}`)
  );
}
//@ chunk-2avr6cej.js:269715-269767 placement
function tmuxEscapedLength(text) {
  return text.length + text.split(ESC).length - 1;
}
export {
  getClipboardPath,
  getOsc52Utf8Warning,
  probeLinuxClipboard,
  osc,
  OSC,
  isTabStatusEnabled,
  wrapForMultiplexer,
  CLEAR_TAB_STATUS,
  tabStatus,
  readClipboard,
  LINK_END,
  link,
  tmuxPassthroughChunked,
  wrapItermImageForTmux,
  CLEAR_PROGRESS,
  setClipboard,
  getLinuxClipboardToolName,
  isVteTerminal,
  CLEAR_TERMINAL_TITLE,
  URL_STRIP_RE,
  OSC_PREFIX,
  parseOSC,
  ST,
  ITERM2_OSC9,
  PROGRESS,
};

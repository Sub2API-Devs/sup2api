/**
 * ink/termio/osc.ts
 *
 * OSC 序列：超链接、窗口标题、剪贴板 OSC 52、通知、tmux 直通包装
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/termio/osc.ts
 * pieces: chunk-bzr73sfg.js (5), chunk-dxdtyerk.js (33)
 * attribution: fingerprint 12, affinity 4, callgraph-fingerprint 2, layout 18, callgraph-witnessed 1, placement 1
 */
import { Buffer as M } from "buffer";
import { ESC, ESC_TYPE, BEL, SEP, BEL as BEL_2 } from "./ansi.js";
import {
  getTerminalName,
  getTerminalMultiplexer,
  getClipboardNativeModulePath,
  b_dxdt,
  getTmuxSocketArgs,
  HX,
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

//@ chunk-dxdtyerk.js:2070-2120 fingerprint = OSC_PREFIX (1)
var OSC_PREFIX = ESC + String.fromCharCode(ESC_TYPE.OSC),
  ST = ESC + "\\";
/**
 * 生成 OSC 序列：ESC ] 参数;… 结束符（kitty 用 ST，其它用 BEL）。
 */
//@ chunk-dxdtyerk.js:3048-3124 fingerprint = osc (0.817)
function osc(...e) {
  let terminator = getTerminalName() === "kitty" ? ST : BEL;
  return `${OSC_PREFIX}${e.join(SEP)}${terminator}`;
}
/**
 * 按当前复用器包装序列：tmux 用 DCS tmux; 透传（ESC 加倍），screen 用 DCS 透传，其它原样。
 */
//@ chunk-dxdtyerk.js:3124-3303 callgraph-fingerprint = wrapForMultiplexer (0.333)
function wrapForMultiplexer(sequence) {
  let r = getTerminalMultiplexer();
  if (r === "tmux") return `\x1BPtmux;${sequence.replaceAll("\x1B", "\x1B\x1B")}\x1B\\`;
  if (r === "screen") return `\x1BP${sequence.replaceAll("\x1B", "\x1B\x1B")}\x1B\\`;
  return sequence;
}
/**
 * Linux 剪贴板工具探测（按 host 单例）：Wayland 下 wl-copy，X11 下 xclip/xsel，都没有时用原生插件 setLinuxClipboardText；记录插件写入成败与 wl-copy 并发序号。
 */
//@ chunk-dxdtyerk.js:3303-4069 layout
class LinuxClipboardTool {
  tool = void 0;
  addonWriteFailed = !1;
  addonWriteSucceeded = !1;
  waylandCopyGeneration = 0;
  async probe() {
    if (getPlatform() !== "linux" || (typeof this.tool === "string" && this.tool !== "addon")) return;
    let { display: display, waylandDisplay: waylandDisplay } = getDisplayEnv();
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
  recordAddonWrite(e) {
    if (e) this.addonWriteSucceeded = !0;
    else this.addonWriteFailed ||= !this.addonWriteSucceeded;
  }
  beginWaylandCopy() {
    return ++this.waylandCopyGeneration;
  }
  isLatestWaylandCopy(e) {
    return e === this.waylandCopyGeneration;
  }
  reset() {
    ((this.tool = void 0), (this.addonWriteFailed = !1), (this.addonWriteSucceeded = !1));
  }
}
//@ chunk-dxdtyerk.js:4069-4092 layout
var linuxClipboardByHost = new HostScoped(() => new LinuxClipboardTool());
//@ chunk-dxdtyerk.js:4092-4127 layout
function getLinuxClipboardTool() {
  return linuxClipboardByHost.of(getRootSession().host);
}
/**
 * 预测复制会走哪条路径：本地 macOS/Windows/WSL 或已探测到 Linux 工具时为 native，在 tmux 里为 tmux-buffer，否则 osc52。
 */
//@ chunk-dxdtyerk.js:4127-4317 fingerprint = getClipboardPath (0.488)
function getClipboardPath() {
  if (!b_dxdt())
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
//@ chunk-dxdtyerk.js:4317-4351 layout
function probeLinuxClipboard() {
  return getLinuxClipboardTool().probe();
}
//@ chunk-dxdtyerk.js:4351-4467 layout
function getLinuxClipboardToolName() {
  if (getPlatform() !== "linux") return "not_linux";
  let { tool: tool } = getLinuxClipboardTool();
  if (tool === void 0) return "not_probed";
  return tool ?? "none";
}
//@ chunk-dxdtyerk.js:4467-4509 layout
function isVteTerminal() {
  return env.VTE_VERSION != null;
}
//@ chunk-dxdtyerk.js:4509-4601 layout
function getDisplayEnv() {
  return { display: process.env.DISPLAY, waylandDisplay: process.env.WAYLAND_DISPLAY };
}
//@ chunk-dxdtyerk.js:4601-4691 layout
function hasLocalDisplay() {
  let { display: display, waylandDisplay: waylandDisplay } = getDisplayEnv();
  if (display) return /^(unix)?:/.test(display);
  return !!waylandDisplay;
}
//@ chunk-dxdtyerk.js:4691-4734 layout
function hasNonAscii(e) {
  return /[^\x00-\x7f]/.test(e);
}
/**
 * VS Code 1.123/1.124 的 OSC 52 会把非 ASCII 粘贴成乱码：命中时返回提示文字。
 */
//@ chunk-dxdtyerk.js:4734-4885 layout
function getOsc52Utf8Warning(text) {
  if (!terminalDetector.hasOsc52ClipboardUtf8Bug() || !hasNonAscii(text)) return null;
  return "VS Code 1.123/1.124 will mojibake this paste \u2014 update to \u22651.125";
}
/**
 * 把文本写进 tmux 粘贴缓冲（load-buffer -w，失败再不带 -w 重试），让 tmux 同步到系统剪贴板。
 */
//@ chunk-dxdtyerk.js:4885-5357 fingerprint = tmuxLoadBuffer (0.339)
async function tmuxLoadBuffer(text) {
  let r = getTmuxSocketArgs();
  if (!r) return !1;
  let n = { input: text, useCwd: !1, timeout: 2000 },
    o = env.LC_TERMINAL ?? "unset",
    args = r.length > 0 ? "attacher socket" : "$TMUX",
    { code: code } = await execFileNoThrow("tmux", [...r, "load-buffer", "-w", "-"], n);
  if (
    (logForDebugging(
      `clipboard: tmux load-buffer -w - \u2192 exit ${code} (server=${args} LC_TERMINAL=${o})`,
    ),
    code === 0)
  )
    return !0;
  let u = await execFileNoThrow("tmux", [...r, "load-buffer", "-"], n);
  return (
    logForDebugging(
      `clipboard: retry tmux load-buffer - \u2192 exit ${u.code} (server=${args} LC_TERMINAL=${o})`,
    ),
    u.code === 0
  );
}
//@ chunk-dxdtyerk.js:5357-5366 layout
var SCREEN_OSC52_CHUNK = 76;
/**
 * 复制到剪贴板：本地（非 SSH）先用原生方式（pbcopy、wl-copy、xclip/xsel、插件、PowerShell Set-Clipboard），再写 tmux 缓冲；返回需要写到终端的 OSC 52 序列（tmux 下原样+透传各一份、screen 下分块 DCS；VTE 系终端在本地已复制时不发）。
 */
//@ chunk-dxdtyerk.js:5366-6026 callgraph-witnessed = setClipboard (0.223)
async function setClipboard(text) {
  let base64 = M.from(text, "utf8").toString("base64"),
    isSsh = b_dxdt(),
    platform = getPlatform(),
    copiedNatively = !1;
  if (!isSsh) {
    if (platform === "linux" && typeof getLinuxClipboardTool().tool !== "string")
      await getLinuxClipboardTool().probe();
    copiedNatively = copyNative(text);
  }
  await tmuxLoadBuffer(text);
  let mux = getTerminalMultiplexer(),
    skipOsc52 =
      (copiedNatively &&
        (platform === "linux" || platform === "wsl") &&
        terminalDetector.isVteBasedTerminal(getTerminalName())) ||
      HX(),
    emitKind = skipOsc52 ? "none(vte)" : mux === "tmux" ? "raw+dcs" : mux === "screen" ? "dcs" : "raw";
  if (
    (logForDebugging(
      `clipboard: setClipboard mux=${mux ?? "none"} ssh=${isSsh} native=${copiedNatively} predicted=${getClipboardPath()} emit=${emitKind} bytes=${text.length}`,
    ),
    skipOsc52)
  )
    return "";
  if (mux === "tmux") {
    let c = `${ESC}]52;c;${base64}${BEL}`;
    return c + wrapForMultiplexer(c);
  }
  if (mux === "screen") {
    let c = [];
    for (let p = 0; p < base64.length; p += SCREEN_OSC52_CHUNK)
      c.push(base64.slice(p, p + SCREEN_OSC52_CHUNK));
    return `${ESC}P${ESC}]52;c;${c.join(`${ST}${ESC}P`)}${BEL}${ST}`;
  }
  return osc(OSC.CLIPBOARD, "c", base64);
}
//@ chunk-dxdtyerk.js:6026-6207 layout
var POWERSHELL_SET_CLIPBOARD =
    "[Console]::InputEncoding = [Text.Encoding]::UTF8; Set-Clipboard -Value ([Console]::In.ReadToEnd())",
  POWERSHELL_GET_CLIPBOARD = "[Console]::OutputEncoding = [Text.Encoding]::UTF8; Get-Clipboard -Raw";
/**
 * 用平台原生工具复制文本（macOS pbcopy；Linux wl-copy / xclip / xsel 同时写 clipboard 与 primary，或原生插件；WSL/Windows PowerShell），返回是否已复制。
 */
//@ chunk-dxdtyerk.js:6207-6977 fingerprint = copyNative (0.581)
function copyNative(text) {
  let opts = { input: text, useCwd: !1, timeout: 2000 };
  switch (getPlatform()) {
    case "macos":
      return (execFileNoThrow("pbcopy", [], opts), !0);
    case "linux": {
      let n = getLinuxClipboardTool();
      if (n.tool === "wl-copy") return (waylandCopy(text), !0);
      if (n.tool === "xclip") {
        let o = { ...opts, useToolMemoryCgroup: !1 };
        return (
          execFileNoThrow("xclip", ["-selection", "clipboard"], o),
          execFileNoThrow("xclip", ["-selection", "primary"], o),
          !0
        );
      }
      if (n.tool === "xsel") {
        let o = { ...opts, useToolMemoryCgroup: !1 };
        return (
          execFileNoThrow("xsel", ["--clipboard", "--input"], o),
          execFileNoThrow("xsel", ["--primary", "--input"], o),
          !0
        );
      }
      if (n.tool === "addon") {
        let o;
        try {
          o = getClipboardNativeModulePath()?.setLinuxClipboardText(text) === !0;
        } catch {
          o = !1;
        }
        return (n.recordAddonWrite(o), n.probe(), o);
      }
      return !1;
    }
    case "wsl":
      return (
        execFileNoThrow(
          "powershell.exe",
          ["-NoProfile", "-NonInteractive", "-Command", POWERSHELL_SET_CLIPBOARD],
          opts,
        ),
        !0
      );
    case "windows":
      return (
        execFileNoThrow(
          "powershell",
          ["-NoProfile", "-NonInteractive", "-Command", POWERSHELL_SET_CLIPBOARD],
          opts,
        ),
        !0
      );
  }
  return !1;
}
//@ chunk-dxdtyerk.js:6977-7217 layout
async function waylandCopy(text) {
  let r = getLinuxClipboardTool(),
    beginWaylandCopy = r.beginWaylandCopy(),
    o = {
      input: text,
      useCwd: !1,
      timeout: 2000,
      stdout: "ignore",
      stderr: "ignore",
      useToolMemoryCgroup: !1,
    };
  if ((await execFileNoThrow("wl-copy", [], o), !r.isLatestWaylandCopy(beginWaylandCopy))) return;
  await execFileNoThrow("wl-copy", ["--primary"], o);
}
/**
 * 读系统剪贴板（中键/右键粘贴用）：macOS pbpaste、Windows/WSL PowerShell Get-Clipboard、Linux 依次尝试 wl-paste/xclip/xsel（clipboard 或 primary）再退到原生插件；SSH 中返回空串。
 */
//@ chunk-dxdtyerk.js:7217-7912 layout
async function readClipboard(selection = "clipboard") {
  if (b_dxdt()) return "";
  let r = { useCwd: !1, timeout: 2000 };
  switch (getPlatform()) {
    case "macos": {
      let n = await execFileNoThrow("pbpaste", [], r);
      return n.code === 0 ? n.stdout : "";
    }
    case "windows":
    case "wsl": {
      let n = await execFileNoThrow(
        getPlatform() === "wsl" ? "powershell.exe" : "powershell",
        ["-NoProfile", "-NonInteractive", "-Command", POWERSHELL_GET_CLIPBOARD],
        r,
      );
      return n.code === 0
        ? n.stdout
            .replace(
              /\r\n/g,
              `
`,
            )
            .replace(/\n$/, "")
        : "";
    }
    case "linux": {
      let n = selection === "primary",
        o = [
          ["wl-paste", n ? ["--primary", "--no-newline"] : ["--no-newline"]],
          ["xclip", ["-selection", n ? "primary" : "clipboard", "-o"]],
          ["xsel", [n ? "--primary" : "--clipboard", "--output"]],
        ];
      for (let [s, a] of o) {
        let u = await execFileNoThrow(s, [...a], r);
        if (u.code === 0) return u.stdout;
      }
      return (await readClipboardViaAddon(n, r.timeout)) ?? "";
    }
    default:
      return "";
  }
}
//@ chunk-dxdtyerk.js:7912-8097 layout
async function readClipboardViaAddon(e, r) {
  if (!hasLocalDisplay()) return null;
  try {
    return (
      (await getClipboardNativeModulePath()?.getLinuxClipboardText?.(e, r))?.replace(/\r?\n$|\r$/, "") ?? null
    );
  } catch (error) {
    return (logForDebugging(`clipboard: addon read: ${errorMessage(error)}`), null);
  }
}
/**
 * OSC 命令号表：标题 0/1/2、颜色 4/10/11/12/104/110/111/112、工作目录 7、超链接 8、iTerm2 通知/进度 9、剪贴板 52、kitty 通知 99、语义提示 133、Ghostty 通知 777、iTerm2 私有 1337、程序状态 7501、标签状态 21337。
 */
//@ chunk-dxdtyerk.js:8097-8437 fingerprint = OSC (0.951)
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
/**
 * 解析 OSC 内容为语义动作：标题（0/1/2）、超链接开始/结束（8，含 id 等参数）、标签状态（21337）；其余 unknown。
 */
//@ chunk-dxdtyerk.js:8437-9178 fingerprint = parseOSC (1)
function parseOSC(content) {
  let semicolonIdx = content.indexOf(";"),
    n = semicolonIdx >= 0 ? content.slice(0, semicolonIdx) : content,
    o = semicolonIdx >= 0 ? content.slice(semicolonIdx + 1) : "",
    commandNum = parseInt(n, 10);
  if (commandNum === OSC.SET_TITLE_AND_ICON) return { type: "title", action: { type: "both", title: o } };
  if (commandNum === OSC.SET_ICON) return { type: "title", action: { type: "iconName", name: o } };
  if (commandNum === OSC.SET_TITLE) return { type: "title", action: { type: "windowTitle", title: o } };
  if (commandNum === OSC.HYPERLINK) {
    let parts = o.split(";"),
      paramsStr = parts[0] ?? "",
      url = parts.slice(1).join(";");
    if (url === "") return { type: "link", action: { type: "end" } };
    let params = {};
    if (paramsStr)
      for (let pair of paramsStr.split(":")) {
        let eqIdx = pair.indexOf("=");
        if (eqIdx >= 0) params[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
      }
    return {
      type: "link",
      action: { type: "start", url: url, params: Object.keys(params).length > 0 ? params : void 0 },
    };
  }
  if (commandNum === OSC.TAB_STATUS) return { type: "tabStatus", action: parseTabStatus(o) };
  return { type: "unknown", sequence: `\x1B]${content}` };
}
/**
 * 解析颜色字符串（#rrggbb 或 X11 rgb:h/h/h，1–4 位十六进制）为 {type:'rgb', r, g, b}。
 */
//@ chunk-dxdtyerk.js:9178-9537 placement = rgb (1)
function parseOscColor(text) {
  let match = text.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (match)
    return { type: "rgb", r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) };
  let match_2 = text.match(/^rgb:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})$/i);
  if (match_2) {
    let o = (s) => Math.round((parseInt(s, 16) / (16 ** s.length - 1)) * 255);
    return { type: "rgb", r: o(match_2[1]), g: o(match_2[2]), b: o(match_2[3]) };
  }
  return null;
}
/**
 * 解析标签状态 OSC 21337 的 key=value;… 字段（indicator / status / status-color，空值表示清除）。
 */
//@ chunk-dxdtyerk.js:9537-9750 fingerprint = parseTabStatus (1)
function parseTabStatus(data) {
  let action = {};
  for (let [n, o] of splitTabStatusFields(data))
    switch (n) {
      case "indicator":
        action.indicator = o === "" ? null : parseOscColor(o);
        break;
      case "status":
        action.status = o === "" ? null : o;
        break;
      case "status-color":
        action.statusColor = o === "" ? null : parseOscColor(o);
        break;
    }
  return action;
}
/**
 * 按 ; 与 = 切分标签状态字段，支持反斜杠转义。
 */
//@ chunk-dxdtyerk.js:9750-9968 layout
function* splitTabStatusFields(data) {
  let r = "",
    n = "",
    o = !1,
    s = !1;
  for (let a of data)
    if (s) {
      if (o) n += a;
      else r += a;
      s = !1;
    } else if (a === "\\") s = !0;
    else if (a === ";") (yield [r, n], (r = ""), (n = ""), (o = !1));
    else if (a === "=" && !o) o = !0;
    else if (o) n += a;
    else r += a;
  if (r || o) yield [r, n];
}
//@ chunk-dxdtyerk.js:9968-10000 layout
var URL_STRIP_RE = new RegExp(ANY_CONTROL_CHAR_RE.source, "g");
/**
 * 生成 OSC 8 超链接开始序列：去掉 URL 中的非法字符，附带由 URL 哈希得到的 id（相同链接跨行能被终端识别为同一个）；空 URL 返回结束序列。
 */
//@ chunk-dxdtyerk.js:10000-10163 fingerprint = link (1)
function link(url, params) {
  let replaced = url.replace(URL_STRIP_RE, "");
  if (!replaced) return LINK_END;
  let o = { id: osc8Id(replaced), ...params },
    paramStr = Object.entries(o)
      .map(([a, u]) => `${a}=${u}`)
      .join(":");
  return osc(OSC.HYPERLINK, paramStr, replaced);
}
/**
 * URL 的 32 位哈希（base36），作 OSC 8 的 id 参数。
 */
//@ chunk-dxdtyerk.js:10163-10269 callgraph-fingerprint = osc8Id (1)
function osc8Id(url) {
  let r = 0;
  for (let n = 0; n < url.length; n++) r = ((r << 5) - r + url.charCodeAt(n)) | 0;
  return (r >>> 0).toString(36);
}
/**
 * 常用 OSC 序列：OSC 8 结束、iTerm2 OSC 9 子命令（通知/徽标/进度 4）、进度状态（清除/设置/错误/不确定）、清除进度条、清除标题、清除标签状态。
 */
//@ chunk-dxdtyerk.js:10269-10534 fingerprint = PROGRESS (0.452)
var LINK_END = osc(OSC.HYPERLINK, "", ""),
  ITERM2_OSC9 = { NOTIFY: 0, BADGE: 2, PROGRESS: 4 },
  PROGRESS = { CLEAR: 0, SET: 1, ERROR: 2, INDETERMINATE: 3 },
  CLEAR_PROGRESS = `${OSC_PREFIX}${OSC.ITERM2};${ITERM2_OSC9.PROGRESS};${PROGRESS.CLEAR};${BEL}`,
  CLEAR_TERMINAL_TITLE = `${OSC_PREFIX}${OSC.SET_TITLE_AND_ICON};${BEL}`,
  CLEAR_TAB_STATUS = osc(OSC.TAB_STATUS, "indicator=;status=;status-color=");
//@ chunk-dxdtyerk.js:10534-10558 layout
function isTabStatusEnabled() {
  return !1;
}
/**
 * 生成标签状态序列 OSC 21337（indicator=#rrggbb;status=…;status-color=…），status 中的 \ 和 ; 转义。
 */
//@ chunk-dxdtyerk.js:10558-10964 fingerprint = tabStatus (1)
function tabStatus(fields) {
  let parts = [],
    rgb = (o) =>
      o.type === "rgb" ? `#${[o.r, o.g, o.b].map((s) => s.toString(16).padStart(2, "0")).join("")}` : "";
  if ("indicator" in fields) parts.push(`indicator=${fields.indicator ? rgb(fields.indicator) : ""}`);
  if ("status" in fields)
    parts.push(`status=${fields.status?.replaceAll("\\", "\\\\").replaceAll(";", "\\;") ?? ""}`);
  if ("statusColor" in fields)
    parts.push(`status-color=${fields.statusColor ? rgb(fields.statusColor) : ""}`);
  return osc(OSC.TAB_STATUS, parts.join(";"));
}
//@ chunk-bzr73sfg.js:269023-269106 fingerprint = tmuxPassthrough (0.681)
var TMUX_PASSTHROUGH_PREFIX = `${ESC}Ptmux;`,
  TMUX_PASSTHROUGH_MAX = 262144,
  SAVE_CURSOR_DEC = `${ESC}7`,
  RESTORE_CURSOR_DEC = `${ESC}8`,
  ITERM_FILE_PREFIX_2 = `${ESC}]1337;File=`,
  MULTIPART_OVERHEAD = 64;
//@ chunk-bzr73sfg.js:269106-269158 affinity
function tmuxPassthrough(sequence) {
  return TMUX_PASSTHROUGH_PREFIX + sequence.replaceAll(ESC, ESC + ESC) + ST;
}
/**
 * 把一串转义序列按 tmux 透传上限（256KB）切块，每块包成 DCS tmux 透传。
 */
//@ chunk-bzr73sfg.js:269158-269587 affinity
function tmuxPassthroughChunked(text) {
  let out = "",
    pending = "",
    pendingLen = 0,
    pos = 0;
  while (pos < text.length) {
    let g = text[pos] === ESC ? text[pos + 1] : void 0,
      E = text.length;
    if (g === "_" || g === "P") {
      let index = text.indexOf(ST, pos + 2);
      E = index === -1 ? E : index + ST.length;
    } else if (g === "]") {
      let index = text.indexOf(BEL_2, pos + 2),
        index_2 = text.indexOf(ST, pos + 2);
      E =
        index !== -1 && (index_2 === -1 || index < index_2)
          ? index + BEL_2.length
          : index_2 === -1
            ? E
            : index_2 + ST.length;
    } else {
      let index = text.indexOf(ESC, pos + 1);
      E = index === -1 ? E : index;
    }
    let sliced = text.slice(pos, E),
      A = tmuxEscapedLength(sliced);
    if (((pos = E), pending !== "" && pendingLen + A > TMUX_PASSTHROUGH_MAX))
      ((out += tmuxPassthrough(pending)), (pending = ""), (pendingLen = 0));
    ((pending += sliced), (pendingLen += A));
  }
  return pending === "" ? out : out + tmuxPassthrough(pending);
}
/**
 * tmux 下的 iTerm2 图片：保存光标、移到 pane 内绝对位置、输出图片、恢复光标，整体透传；超过上限时改用 MultipartFile/FilePart/FileEnd 分片。
 */
//@ chunk-bzr73sfg.js:269587-270134 affinity
function wrapItermImageForTmux(sequence, position) {
  let index = sequence.indexOf(":", ITERM_FILE_PREFIX_2.length);
  if (!(
    sequence.startsWith(ITERM_FILE_PREFIX_2) &&
    sequence.endsWith(BEL_2) &&
    sequence.indexOf(ESC, 1) === -1 &&
    sequence.indexOf(BEL_2) === sequence.length - BEL_2.length &&
    index !== -1
  ))
    throw TypeError("tmux passthrough: expected exactly one iTerm2 File= sequence ending in BEL");
  let p = cursorPosition(position.row, position.column),
    g = SAVE_CURSOR_DEC + p + sequence + RESTORE_CURSOR_DEC;
  if (tmuxEscapedLength(g) <= TMUX_PASSTHROUGH_MAX) return tmuxPassthrough(g);
  let sliced = sequence.slice(ITERM_FILE_PREFIX_2.length, index),
    sliced_2 = sequence.slice(index + 1, -BEL_2.length),
    A = TMUX_PASSTHROUGH_MAX - MULTIPART_OVERHEAD,
    D = tmuxPassthrough(`${ESC}]1337;MultipartFile=${sliced}${BEL_2}`);
  for (let O = 0; O < sliced_2.length; O += A)
    D += tmuxPassthrough(`${ESC}]1337;FilePart=${sliced_2.slice(O, O + A)}${BEL_2}`);
  return D + tmuxPassthrough(`${SAVE_CURSOR_DEC}${p}${ESC}]1337;FileEnd${BEL_2}${RESTORE_CURSOR_DEC}`);
}
//@ chunk-bzr73sfg.js:270134-270186 affinity
function tmuxEscapedLength(text) {
  return text.length + text.split(ESC).length - 1;
}

export {
  setClipboard,
  getOsc52Utf8Warning,
  getClipboardPath,
  readClipboard,
  getLinuxClipboardToolName,
  isVteTerminal,
  osc,
  OSC,
  URL_STRIP_RE,
  OSC_PREFIX,
  link,
  wrapForMultiplexer,
  ITERM2_OSC9,
  PROGRESS,
  LINK_END,
  tmuxPassthroughChunked,
  wrapItermImageForTmux,
  CLEAR_PROGRESS,
  isTabStatusEnabled,
  CLEAR_TAB_STATUS,
  CLEAR_TERMINAL_TITLE,
  parseOSC,
  ST,
  probeLinuxClipboard,
  tabStatus,
};

/**
 * ink/terminalCapabilities.ts
 *
 * 2.1.316 新增。终端能力探测结果。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-brd2890s.js (15)
 * attribution: placement 15
 */
import { createSignal } from "../utils/signal.js";
import { getInitialCapabilities } from "./terminal.js";
import { env } from "../utils/env.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";

//@ chunk-brd2890s.js:372-1033 placement
/**
 * 单项终端能力的读数：unasked → asking → settled 三态，记录值与来源；answer 时通知订阅者，onSettle 在已确定时立即回调。
 */
class CapabilityReading {
  reading;
  settled = createSignal();
  constructor(initial) {
    this.reading =
      initial === undefined
        ? {
            state: "unasked",
          }
        : {
            state: "settled",
            value: initial.value,
            source: initial.source,
          };
  }
  get() {
    return this.reading;
  }
  now() {
    return this.reading.state === "settled" && this.reading.value;
  }
  begin() {
    if (this.reading.state !== "unasked") return false;
    this.reading = {
      state: "asking",
    };
    return true;
  }
  unask() {
    if (this.reading.state === "asking")
      this.reading = {
        state: "unasked",
      };
  }
  answer(reading) {
    if (this.reading.state === "settled") return false;
    this.reading = {
      state: "settled",
      ...reading,
    };
    try {
      this.settled.emit(reading.value);
    } finally {
      this.settled.clear();
    }
    return true;
  }
  onSettle(listener) {
    if (this.reading.state === "settled") {
      listener(this.reading.value);
      return () => {};
    }
    return this.settled.subscribe(listener);
  }
}
//@ chunk-brd2890s.js:1033-1179 placement
/**
 * 终端能力默认值（扩展键、同步输出、kitty 键盘、kitty 图像、iTerm 图像、鼠标像素、程序状态）及其键名列表。
 */
var DEFAULT_TERMINAL_CAPABILITIES = {
  extendedKeys: false,
  synchronizedOutput: false,
  kittyKeyboard: true,
  kittyGraphics: false,
  itermImages: false,
  mousePixels: false,
  programStatus: false,
};
var keys = Object.keys(DEFAULT_TERMINAL_CAPABILITIES);
//@ chunk-brd2890s.js:1179-2222 placement
class TerminalCapabilityReadings {
  readings = new Map();
  answeredYes = new Set();
  listeners = new Map();
  constructor(initialCapabilities) {
    for (let t of keys) {
      let n = initialCapabilities[t];
      this.readings.set(
        t,
        "settled" in n
          ? {
              state: "settled",
              value: n.settled,
              source: n.source,
            }
          : {
              state: "pending",
              likely: n.likely,
              source: n.source,
            },
      );
    }
  }
  get(e) {
    return this.readings.get(e);
  }
  now(e) {
    let t = this.get(e);
    return t.state === "settled" ? t.value : DEFAULT_TERMINAL_CAPABILITIES[e];
  }
  confirmed(e) {
    return this.answeredYes.has(e);
  }
  pending() {
    return keys.filter((e) => this.get(e).state === "pending");
  }
  answer(e, t, n) {
    let a = this.get(e);
    if (a.state === "settled") {
      if (t && a.value) this.answeredYes.add(e);
      return false;
    }
    if (t) this.answeredYes.add(e);
    this.settle(e, t, n);
    return true;
  }
  deadline() {
    for (let e of this.pending()) {
      let t = this.get(e);
      this.settle(e, t.likely, `${t.source}, no answer`);
    }
  }
  onSettle(e, t) {
    let n = this.get(e);
    if (n.state === "settled") {
      t(n.value);
      return () => {};
    }
    let a = this.listeners.get(e) ?? new Set();
    this.listeners.set(e, a);
    a.add(t);
    return () => {
      a.delete(t);
    };
  }
  settle(e, t, source) {
    this.readings.set(e, {
      state: "settled",
      value: t,
      source,
    });
    let a = this.listeners.get(e);
    this.listeners.delete(e);
    for (let r of a ?? []) r(t);
  }
}
//@ chunk-brd2890s.js:2222-2841 placement
/**
 * 终端探测状态：xtversion 名称、能力读数集、是否可读图像文件（受 CLAUDE_CODE_FORCE_TERMINAL_IMAGES / tmux 影响）、tmux 窗格信息、OSC 11 响应、单元格像素等；可重置。
 */
class TerminalProbeState {
  xtversionName = undefined;
  #e = undefined;
  get capabilities() {
    return (this.#e ??= new TerminalCapabilityReadings(getInitialCapabilities()));
  }
  #t = undefined;
  get imageFiles() {
    return (this.#t ??= new CapabilityReading(
      env.CLAUDE_CODE_FORCE_TERMINAL_IMAGES
        ? {
            value: true,
            source: "env: CLAUDE_CODE_FORCE_TERMINAL_IMAGES",
          }
        : env.TMUX
          ? {
              value: false,
              source: "env: inside tmux, where the terminal cannot be asked whether it reads files",
            }
          : undefined,
    ));
  }
  tmuxPane = undefined;
  isTmuxPaneAsked = false;
  tmuxPaneAnsweredAt = undefined;
  resetCapabilities() {
    this.#e = undefined;
    this.#t = undefined;
    this.tmuxPane = undefined;
    this.isTmuxPaneAsked = false;
    this.tmuxPaneAnsweredAt = undefined;
  }
  osc11Responsive = undefined;
  cellPixels = undefined;
  probeEventLogged = false;
  nativeCursorEnabled = undefined;
}
//@ chunk-brd2890s.js:2841-2864 placement
/**
 * HostScoped 的终端探测状态
 */
var terminalProbeStateSlot = new HostScoped(() => new TerminalProbeState());
//@ chunk-brd2890s.js:2864-2900 placement
/**
 * 取当前宿主的终端能力探测状态（能力表、图像文件支持、XTVERSION 名称）。
 */
function getTerminalProbeState() {
  return terminalProbeStateSlot.of(getRootSession().host);
}
//@ chunk-brd2890s.js:2900-2939 placement
/**
 * 取终端能力表（kittyGraphics、now 等取值接口）。
 */
function getTerminalCapabilities() {
  return getTerminalProbeState().capabilities;
}
//@ chunk-brd2890s.js:2939-2987 placement
/**
 * 取当前 kittyGraphics 能力（未支持时为 undefined）。
 */
function currentKittyGraphics() {
  return getTerminalCapabilities().now("kittyGraphics");
}
//@ chunk-brd2890s.js:2987-3087 placement
/**
 * 返回当前可用的终端图像协议（kitty 或 iterm），都不支持时为 undefined。
 */
function terminalImageProtocol() {
  let terminalCapabilities = getTerminalCapabilities();
  return terminalCapabilities.now("kittyGraphics")
    ? "kitty"
    : terminalCapabilities.now("itermImages")
      ? "iterm"
      : undefined;
}
//@ chunk-brd2890s.js:3087-3221 placement
/**
 * 订阅图像协议能力确定的事件，确定后回调当前协议；返回取消订阅函数。
 */
function onImageProtocolSettled(e) {
  let terminalCapabilities = getTerminalCapabilities();
  let n = () => e(terminalImageProtocol());
  let a = [
    terminalCapabilities.onSettle("kittyGraphics", n),
    terminalCapabilities.onSettle("itermImages", n),
  ];
  return () => a.forEach((r) => r());
}
//@ chunk-brd2890s.js:3221-3259 placement
/**
 * 取终端是否支持以文件方式显示图像。
 */
function getTerminalImageFiles() {
  return getTerminalProbeState().imageFiles;
}
//@ chunk-brd2890s.js:3259-3296 placement
/**
 * 记录终端通过 XTVERSION 报出的名称。
 */
function setXtversionName(xtversionName) {
  getTerminalProbeState().xtversionName = xtversionName;
}
//@ chunk-brd2890s.js:3296-3337 placement
/**
 * 取终端 XTVERSION 报出的名称。
 */
function getXtversionName() {
  return getTerminalProbeState().xtversionName;
}
//@ chunk-brd2890s.js:3474-3596 placement
/**
 * 判断 XTVERSION 报告的终端是否为 iTerm2 或 tmux。
 */
function isItermOrTmuxXtversion() {
  let lower = getTerminalProbeState().xtversionName?.toLowerCase();
  return lower !== undefined && (lower.startsWith("iterm2") || lower.startsWith("tmux "));
}
//@ chunk-brd2890s.js:3596-3678 placement
/**
 * 判断 XTVERSION 名称是否以 ghostty 开头。
 */
function isGhostty() {
  return getTerminalProbeState().xtversionName?.toLowerCase().startsWith("ghostty") ?? false;
}
export {
  getTerminalProbeState,
  getXtversionName,
  getTerminalCapabilities,
  getTerminalImageFiles,
  currentKittyGraphics,
  terminalImageProtocol,
  onImageProtocolSettled,
  setXtversionName,
  keys,
  isGhostty,
  isItermOrTmuxXtversion,
};

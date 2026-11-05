/**
 * ink/terminalCapabilities.ts
 *
 * 2.1.316 新增。终端能力探测结果。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8n54kmae.js (15)
 * attribution: placement 15
 */
import { createSignal } from "../utils/signal.js";
import { getInitialCapabilities } from "./terminal.js";
import { env } from "../utils/env.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-8n54kmae.js:372-1033 placement
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
//@ chunk-8n54kmae.js:1033-1179 placement
/**
 * 终端能力默认值（扩展键、同步输出、kitty 键盘、kitty 图像、iTerm 图像、鼠标像素、程序状态）及其键名列表。
 */
var DEFAULT_TERMINAL_CAPABILITIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var keys;
deferInit("chunk-8n54kmae.js:1033", () => {
  DEFAULT_TERMINAL_CAPABILITIES = {
    extendedKeys: false,
    synchronizedOutput: false,
    kittyKeyboard: true,
    kittyGraphics: false,
    itermImages: false,
    mousePixels: false,
    programStatus: false,
  };
  keys = Object.keys(DEFAULT_TERMINAL_CAPABILITIES);
});
//@ chunk-8n54kmae.js:1179-2222 placement
class TerminalCapabilityReadings {
  readings = new Map();
  answeredYes = new Set();
  listeners = new Map();
  constructor(initialCapabilities) {
    for (let capability of keys) {
      let initial = initialCapabilities[capability];
      this.readings.set(
        capability,
        "settled" in initial
          ? {
              state: "settled",
              value: initial.settled,
              source: initial.source,
            }
          : {
              state: "pending",
              likely: initial.likely,
              source: initial.source,
            },
      );
    }
  }
  get(capability) {
    return this.readings.get(capability);
  }
  now(capability) {
    let reading = this.get(capability);
    return reading.state === "settled" ? reading.value : DEFAULT_TERMINAL_CAPABILITIES[capability];
  }
  confirmed(capability) {
    return this.answeredYes.has(capability);
  }
  pending() {
    return keys.filter((capability) => this.get(capability).state === "pending");
  }
  answer(capability, value, source) {
    let reading = this.get(capability);
    if (reading.state === "settled") {
      if (value && reading.value) this.answeredYes.add(capability);
      return false;
    }
    if (value) this.answeredYes.add(capability);
    this.settle(capability, value, source);
    return true;
  }
  deadline() {
    for (let capability of this.pending()) {
      let reading = this.get(capability);
      this.settle(capability, reading.likely, `${reading.source}, no answer`);
    }
  }
  onSettle(capability, listener) {
    let reading = this.get(capability);
    if (reading.state === "settled") {
      listener(reading.value);
      return () => {};
    }
    let listeners = this.listeners.get(capability) ?? new Set();
    this.listeners.set(capability, listeners);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
  settle(capability, value, source) {
    this.readings.set(capability, {
      state: "settled",
      value,
      source,
    });
    let listeners = this.listeners.get(capability);
    this.listeners.delete(capability);
    for (let listener of listeners ?? []) listener(value);
  }
}
//@ chunk-8n54kmae.js:2222-2841 placement
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
//@ chunk-8n54kmae.js:2841-2864 placement
/**
 * HostScoped 的终端探测状态
 */
var terminalProbeStateSlot; // deferred: uses TerminalProbeState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8n54kmae.js:2841", () => {
  terminalProbeStateSlot = new HostScoped(() => new TerminalProbeState());
});
//@ chunk-8n54kmae.js:2864-2900 placement
/**
 * 取当前宿主的终端能力探测状态（能力表、图像文件支持、XTVERSION 名称）。
 */
function getTerminalProbeState() {
  return terminalProbeStateSlot.of(getRootSession().host);
}
//@ chunk-8n54kmae.js:2900-2939 placement
/**
 * 取终端能力表（kittyGraphics、now 等取值接口）。
 */
function getTerminalCapabilities() {
  return getTerminalProbeState().capabilities;
}
//@ chunk-8n54kmae.js:2939-2987 placement
/**
 * 取当前 kittyGraphics 能力（未支持时为 undefined）。
 */
function currentKittyGraphics() {
  return getTerminalCapabilities().now("kittyGraphics");
}
//@ chunk-8n54kmae.js:2987-3087 placement
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
//@ chunk-8n54kmae.js:3087-3221 placement
/**
 * 订阅图像协议能力确定的事件，确定后回调当前协议；返回取消订阅函数。
 */
function onImageProtocolSettled(onSettled) {
  let terminalCapabilities = getTerminalCapabilities();
  let notify = () => onSettled(terminalImageProtocol());
  let unsubscribers = [
    terminalCapabilities.onSettle("kittyGraphics", notify),
    terminalCapabilities.onSettle("itermImages", notify),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
//@ chunk-8n54kmae.js:3221-3259 placement
/**
 * 取终端是否支持以文件方式显示图像。
 */
function getTerminalImageFiles() {
  return getTerminalProbeState().imageFiles;
}
//@ chunk-8n54kmae.js:3259-3296 placement
/**
 * 记录终端通过 XTVERSION 报出的名称。
 */
function setXtversionName(xtversionName) {
  getTerminalProbeState().xtversionName = xtversionName;
}
//@ chunk-8n54kmae.js:3296-3337 placement
/**
 * 取终端 XTVERSION 报出的名称。
 */
function getXtversionName() {
  return getTerminalProbeState().xtversionName;
}
//@ chunk-8n54kmae.js:3474-3596 placement
/**
 * 判断 XTVERSION 报告的终端是否为 iTerm2 或 tmux。
 */
function isItermOrTmuxXtversion() {
  let lower = getTerminalProbeState().xtversionName?.toLowerCase();
  return lower !== undefined && (lower.startsWith("iterm2") || lower.startsWith("tmux "));
}
//@ chunk-8n54kmae.js:3596-3678 placement
/**
 * 判断 XTVERSION 名称是否以 ghostty 开头。
 */
function isGhostty() {
  return getTerminalProbeState().xtversionName?.toLowerCase().startsWith("ghostty") ?? false;
}
export {
  getTerminalProbeState,
  setXtversionName,
  keys,
  getTerminalCapabilities,
  isGhostty,
  isItermOrTmuxXtversion,
  getXtversionName,
  getTerminalImageFiles,
  currentKittyGraphics,
  terminalImageProtocol,
  onImageProtocolSettled,
};

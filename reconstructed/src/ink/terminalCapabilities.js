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

/**
 * 单项终端能力的读数：unasked → asking → settled 三态，记录值与来源；answer 时通知订阅者，onSettle 在已确定时立即回调。
 */
//@ chunk-brd2890s.js:372-1033 placement
class CapabilityReading {
  reading;
  settled = createSignal();
  constructor(initial) {
    this.reading =
      initial === void 0
        ? { state: "unasked" }
        : { state: "settled", value: initial.value, source: initial.source };
  }
  get() {
    return this.reading;
  }
  now() {
    return this.reading.state === "settled" && this.reading.value;
  }
  begin() {
    if (this.reading.state !== "unasked") return !1;
    return ((this.reading = { state: "asking" }), !0);
  }
  unask() {
    if (this.reading.state === "asking") this.reading = { state: "unasked" };
  }
  answer(reading) {
    if (this.reading.state === "settled") return !1;
    this.reading = { state: "settled", ...reading };
    try {
      this.settled.emit(reading.value);
    } finally {
      this.settled.clear();
    }
    return !0;
  }
  onSettle(listener) {
    if (this.reading.state === "settled") return (listener(this.reading.value), () => {});
    return this.settled.subscribe(listener);
  }
}
/**
 * 终端能力默认值（扩展键、同步输出、kitty 键盘、kitty 图像、iTerm 图像、鼠标像素、程序状态）及其键名列表。
 */
//@ chunk-brd2890s.js:1033-1179 placement
var DEFAULT_TERMINAL_CAPABILITIES = {
    extendedKeys: !1,
    synchronizedOutput: !1,
    kittyKeyboard: !0,
    kittyGraphics: !1,
    itermImages: !1,
    mousePixels: !1,
    programStatus: !1,
  },
  keys = Object.keys(DEFAULT_TERMINAL_CAPABILITIES);
//@ chunk-brd2890s.js:1179-2222 placement
class TerminalCapabilityReadings {
  readings = new Map();
  answeredYes = new Set();
  listeners = new Map();
  constructor(e) {
    for (let t of keys) {
      let n = e[t];
      this.readings.set(
        t,
        "settled" in n
          ? { state: "settled", value: n.settled, source: n.source }
          : { state: "pending", likely: n.likely, source: n.source },
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
      return !1;
    }
    if (t) this.answeredYes.add(e);
    return (this.settle(e, t, n), !0);
  }
  deadline() {
    for (let e of this.pending()) {
      let t = this.get(e);
      this.settle(e, t.likely, `${t.source}, no answer`);
    }
  }
  onSettle(e, t) {
    let n = this.get(e);
    if (n.state === "settled") return (t(n.value), () => {});
    let a = this.listeners.get(e) ?? new Set();
    return (
      this.listeners.set(e, a),
      a.add(t),
      () => {
        a.delete(t);
      }
    );
  }
  settle(e, t, n) {
    this.readings.set(e, { state: "settled", value: t, source: n });
    let a = this.listeners.get(e);
    this.listeners.delete(e);
    for (let r of a ?? []) r(t);
  }
}
/**
 * 终端探测状态：xtversion 名称、能力读数集、是否可读图像文件（受 CLAUDE_CODE_FORCE_TERMINAL_IMAGES / tmux 影响）、tmux 窗格信息、OSC 11 响应、单元格像素等；可重置。
 */
//@ chunk-brd2890s.js:2222-2841 placement
class TerminalProbeState {
  xtversionName = void 0;
  #e = void 0;
  get capabilities() {
    return (this.#e ??= new TerminalCapabilityReadings(getInitialCapabilities()));
  }
  #t = void 0;
  get imageFiles() {
    return (this.#t ??= new CapabilityReading(
      env.CLAUDE_CODE_FORCE_TERMINAL_IMAGES
        ? { value: !0, source: "env: CLAUDE_CODE_FORCE_TERMINAL_IMAGES" }
        : env.TMUX
          ? {
              value: !1,
              source: "env: inside tmux, where the terminal cannot be asked whether it reads files",
            }
          : void 0,
    ));
  }
  tmuxPane = void 0;
  isTmuxPaneAsked = !1;
  tmuxPaneAnsweredAt = void 0;
  resetCapabilities() {
    ((this.#e = void 0),
      (this.#t = void 0),
      (this.tmuxPane = void 0),
      (this.isTmuxPaneAsked = !1),
      (this.tmuxPaneAnsweredAt = void 0));
  }
  osc11Responsive = void 0;
  cellPixels = void 0;
  probeEventLogged = !1;
  nativeCursorEnabled = void 0;
}
//@ chunk-brd2890s.js:2841-2864 placement
var u = new HostScoped(() => new TerminalProbeState());
//@ chunk-brd2890s.js:2864-2900 placement
function gk() {
  return u.of(getRootSession().host);
}
//@ chunk-brd2890s.js:2900-2939 placement
function EA() {
  return gk().capabilities;
}
//@ chunk-brd2890s.js:2939-2987 placement
function u$s() {
  return EA().now("kittyGraphics");
}
/**
 * 返回当前可用的终端图像协议（kitty 或 iterm），都不支持时为 undefined。
 */
//@ chunk-brd2890s.js:2987-3087 placement
function terminalImageProtocol() {
  let e = EA();
  return e.now("kittyGraphics") ? "kitty" : e.now("itermImages") ? "iterm" : void 0;
}
/**
 * 订阅图像协议能力确定的事件，确定后回调当前协议；返回取消订阅函数。
 */
//@ chunk-brd2890s.js:3087-3221 placement
function onImageProtocolSettled(e) {
  let t = EA(),
    n = () => e(terminalImageProtocol()),
    a = [t.onSettle("kittyGraphics", n), t.onSettle("itermImages", n)];
  return () => a.forEach((r) => r());
}
//@ chunk-brd2890s.js:3221-3259 placement
function Csn() {
  return gk().imageFiles;
}
//@ chunk-brd2890s.js:3259-3296 placement
function p$s(e) {
  gk().xtversionName = e;
}
//@ chunk-brd2890s.js:3296-3337 placement
function Rsn() {
  return gk().xtversionName;
}
/**
 * 判断 XTVERSION 报告的终端是否为 iTerm2 或 tmux。
 */
//@ chunk-brd2890s.js:3474-3596 placement
function isItermOrTmuxXtversion() {
  let e = gk().xtversionName?.toLowerCase();
  return e !== void 0 && (e.startsWith("iterm2") || e.startsWith("tmux "));
}
//@ chunk-brd2890s.js:3596-3678 placement
function g$s() {
  return gk().xtversionName?.toLowerCase().startsWith("ghostty") ?? !1;
}

export {
  gk,
  Rsn,
  EA,
  Csn,
  u$s,
  terminalImageProtocol,
  onImageProtocolSettled,
  p$s,
  keys,
  g$s,
  isItermOrTmuxXtversion,
};

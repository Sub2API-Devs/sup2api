/**
 * keybindings/keyNames.ts
 *
 * 2.1.316 新增：按键名到 Ink 键名的映射与显示别名；把按键名称转换为 Ink 的 key 布尔对象。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8pssrarc.js (7)
 * attribution: placement 7
 */
import { j } from "../../vendor/react/cjs/react.production.js";
import { createSignal } from "../utils/signal.js";

/**
 * 把按键名称转换为 Ink 的 key 布尔对象。
 */
//@ chunk-8pssrarc.js:457-921 placement
function toInkKey(n) {
  let t = KEY_NAME_MAP[n.name],
    r = {
      upArrow: t === "upArrow",
      downArrow: t === "downArrow",
      leftArrow: t === "leftArrow",
      rightArrow: t === "rightArrow",
      pageDown: t === "pageDown",
      pageUp: t === "pageUp",
      wheelUp: !1,
      wheelDown: !1,
      home: t === "home",
      end: t === "end",
      return: t === "return",
      escape: t === "escape",
      tab: t === "tab",
      backspace: t === "backspace",
      delete: t === "delete",
      ctrl: n.ctrl,
      shift: n.shift,
      super: n.superKey,
      meta: n.meta,
    };
  return {
    input:
      n.name === "enter"
        ? `
`
        : [...n.key].length === 1
          ? n.key
          : "",
    key: r,
  };
}
/**
 * 按键名到 Ink 键名的映射与显示别名。
 */
//@ chunk-8pssrarc.js:921-1443 placement
var KEY_NAME_MAP = {
    up: "upArrow",
    down: "downArrow",
    left: "leftArrow",
    right: "rightArrow",
    pagedown: "pageDown",
    pageup: "pageUp",
    home: "home",
    end: "end",
    return: "return",
    escape: "escape",
    tab: "tab",
    backspace: "backspace",
    delete: "delete",
  },
  re = [
    ["escape", "escape"],
    ["return", "return"],
    ["tab", "tab"],
    ["backspace", "backspace"],
    ["delete", "delete"],
    ["upArrow", "up"],
    ["downArrow", "down"],
    ["leftArrow", "left"],
    ["rightArrow", "right"],
    ["pageUp", "pageup"],
    ["pageDown", "pagedown"],
    ["wheelUp", "wheelup"],
    ["wheelDown", "wheeldown"],
    ["home", "home"],
    ["end", "end"],
  ];
/**
 * 把按键名与修饰键转换成 Ink 的按键事件对象（name、key、ctrl/shift/meta/super）。
 */
//@ chunk-8pssrarc.js:1443-1581 placement
function toInkKeyEvent(n, t) {
  return {
    name:
      re.find(([i]) => t[i])?.[1] ??
      (n ===
      `
`
        ? "enter"
        : ""),
    key: n,
    ctrl: t.ctrl,
    shift: t.shift,
    meta: t.meta,
    superKey: t.super,
  };
}
//@ chunk-8pssrarc.js:1581-1585 placement
j();
//@ chunk-8pssrarc.js:1585-1600 placement
function he() {}
//@ chunk-8pssrarc.js:1600-1641 placement
function fe(ke) {
  return ke.handler() !== !1;
}
/**
 * 创建快捷键注册表的初始状态：声明表、作用域与处理器变化信号、抢占作用域、吞键表与分发跟踪信号。
 */
//@ chunk-8pssrarc.js:1641-1788 placement
function createKeybindingRegistryState() {
  return {
    decls: new WeakMap(),
    scopesChanged: createSignal(),
    handlersChanged: createSignal(),
    preemptiveScopes: new Map(),
    swallowAll: new Map(),
    keyDispatchTrace: createSignal(),
  };
}

export { toInkKeyEvent, he, fe, createKeybindingRegistryState, toInkKey };

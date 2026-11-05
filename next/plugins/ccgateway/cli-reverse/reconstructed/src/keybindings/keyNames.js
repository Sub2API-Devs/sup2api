/**
 * keybindings/keyNames.ts
 *
 * 2.1.316 新增：按键名到 Ink 键名的映射与显示别名；把按键名称转换为 Ink 的 key 布尔对象。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7wgjt81y.js (7)
 * attribution: placement 7
 */
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { createSignal } from "../utils/signal.js";

//@ chunk-7wgjt81y.js:457-921 placement
/**
 * 把按键名称转换为 Ink 的 key 布尔对象。
 */
function toInkKey(keyEvent) {
  let name = KEY_NAME_MAP[keyEvent.name];
  let key = {
    upArrow: name === "upArrow",
    downArrow: name === "downArrow",
    leftArrow: name === "leftArrow",
    rightArrow: name === "rightArrow",
    pageDown: name === "pageDown",
    pageUp: name === "pageUp",
    wheelUp: false,
    wheelDown: false,
    home: name === "home",
    end: name === "end",
    return: name === "return",
    escape: name === "escape",
    tab: name === "tab",
    backspace: name === "backspace",
    delete: name === "delete",
    ctrl: keyEvent.ctrl,
    shift: keyEvent.shift,
    super: keyEvent.superKey,
    meta: keyEvent.meta,
  };
  return {
    input:
      keyEvent.name === "enter"
        ? `
`
        : [...keyEvent.key].length === 1
          ? keyEvent.key
          : "",
    key,
  };
}
//@ chunk-7wgjt81y.js:921-1443 placement
/**
 * 按键名到 Ink 键字段名的映射，以及反向的 Ink 键名到显示别名表。
 */
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
};
var INK_KEY_DISPLAY_ALIASES = [
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
//@ chunk-7wgjt81y.js:1443-1581 placement
/**
 * 把按键名与修饰键转换成 Ink 的按键事件对象（name、key、ctrl/shift/meta/super）。
 */
function toInkKeyEvent(action, context) {
  return {
    name:
      INK_KEY_DISPLAY_ALIASES.find(([entry]) => context[entry])?.[1] ??
      (action ===
      `
`
        ? "enter"
        : ""),
    key: action,
    ctrl: context.ctrl,
    shift: context.shift,
    meta: context.meta,
    superKey: context.super,
  };
}
//@ chunk-7wgjt81y.js:1581-1585 placement
init_react_production();
//@ chunk-7wgjt81y.js:1585-1600 placement
/**
 * 空函数
 */
function noop() {}
//@ chunk-7wgjt81y.js:1600-1641 placement
/**
 * 处理器是否消费了按键
 */
function didHandlerConsume(registration) {
  return registration.handler() !== false;
}
//@ chunk-7wgjt81y.js:1641-1788 placement
/**
 * 创建快捷键注册表的初始状态：声明表、作用域与处理器变化信号、抢占作用域、吞键表与分发跟踪信号。
 */
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
export { createKeybindingRegistryState, toInkKeyEvent, noop, didHandlerConsume, toInkKey };

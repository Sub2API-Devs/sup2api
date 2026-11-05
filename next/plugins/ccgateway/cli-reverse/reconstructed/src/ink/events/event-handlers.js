/**
 * ink/events/event-handlers.ts
 *
 * 并入已有模块：把 scrollTop 限制在可滚动范围内。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/events/event-handlers.ts
 * pieces: chunk-2avr6cej.js (2)
 * attribution: placement 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-2avr6cej.js:187226-187373 placement
/**
 * 把 scrollTop 限制在可滚动范围内。
 */
function clampScrollTop(element) {
  let scrollTop = element.scrollTop ?? 0;
  if (element.scrollHeight === undefined) return scrollTop;
  return Math.min(scrollTop, Math.max(0, element.scrollHeight - (element.scrollViewportHeight ?? 0)));
}
//@ chunk-2avr6cej.js:187373-187962 fingerprint (2.1.88 match: HANDLER_FOR_EVENT, 0.718)
/**
 * 事件类型 → 冒泡/捕获处理器属性名；RAW_MODE_HANDLER_PROPS 是需要 stdin 原始模式的处理器（键盘、粘贴、滚轮），EVENT_HANDLER_PROPS 是 reconciler 当作事件处理器存进 _eventHandlers 的全部属性。
 */
var HANDLER_FOR_EVENT = {
  keydown: {
    bubble: "onKeyDown",
    capture: "onKeyDownCapture",
  },
  focus: {
    bubble: "onFocus",
  },
  blur: {
    bubble: "onBlur",
  },
  paste: {
    bubble: "onPaste",
    capture: "onPasteCapture",
  },
  wheel: {
    bubble: "onWheel",
    capture: "onWheelCapture",
  },
  action: {
    bubble: "onAction",
    capture: "onActionCapture",
  },
  click: {
    bubble: "onClick",
  },
};
var RAW_MODE_HANDLER_PROPS = new Set([
  "onKeyDown",
  "onKeyDownCapture",
  "onPaste",
  "onPasteCapture",
  "onWheel",
  "onWheelCapture",
]);
var EVENT_HANDLER_PROPS = new Set([
  "onKeyDown",
  "onKeyDownCapture",
  "onFocus",
  "onBlur",
  "onPaste",
  "onPasteCapture",
  "onWheel",
  "onWheelCapture",
  "onAction",
  "onActionCapture",
  "onClick",
  "onMouseEnter",
  "onMouseLeave",
  "onPointer",
]);
export { RAW_MODE_HANDLER_PROPS, EVENT_HANDLER_PROPS, HANDLER_FOR_EVENT, clampScrollTop };

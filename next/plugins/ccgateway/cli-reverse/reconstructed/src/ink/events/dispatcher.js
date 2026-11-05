/**
 * ink/events/dispatcher.ts
 *
 * 事件派发器：捕获/冒泡路径收集、按事件类型决定 React 更新优先级
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/events/dispatcher.ts
 * pieces: chunk-2avr6cej.js (5)
 * attribution: fingerprint 5
 */
import { HANDLER_FOR_EVENT } from "./event-handlers.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import {
  discreteEventPriority,
  continuousEventPriority,
  defaultEventPriority,
  noEventPriority,
} from "../../../vendor/yoga-layout/dist/src/generated/YGEnums.js";

//@ chunk-2avr6cej.js:187962-188094 fingerprint (2.1.88 match: getHandler, 1)
/**
 * 取节点上某事件类型的冒泡或捕获处理器。
 */
function getHandler(node, eventType, capture) {
  let handlers = node._eventHandlers;
  if (!handlers) return;
  let mapping = HANDLER_FOR_EVENT[eventType];
  if (!mapping) return;
  let propName = capture ? mapping.capture : mapping.bubble;
  if (!propName) return;
  return handlers[propName];
}
//@ chunk-2avr6cej.js:188094-188351 fingerprint (2.1.88 match: collectListeners, 1)
/**
 * 从目标沿父链收集监听器：捕获处理器放前面（unshift），冒泡处理器放后面（事件不冒泡时只取目标自身），标注阶段。
 */
function collectListeners(target, event) {
  let listeners = [];
  let node = target;
  while (node) {
    let isTarget = node === target;
    let captureHandler = getHandler(node, event.type, true);
    let bubbleHandler = getHandler(node, event.type, false);
    if (captureHandler)
      listeners.unshift({
        node,
        handler: captureHandler,
        phase: isTarget ? "at_target" : "capturing",
      });
    if (bubbleHandler && (event.bubbles || isTarget))
      listeners.push({
        node,
        handler: bubbleHandler,
        phase: isTarget ? "at_target" : "bubbling",
      });
    node = node.parentNode;
  }
  return listeners;
}
//@ chunk-2avr6cej.js:188351-188626 fingerprint (2.1.88 match: processDispatchQueue, 0.875)
/**
 * 按顺序执行监听器：立即停止传播则中断，停止传播则在换节点时中断；处理器抛错只记日志。
 */
function processDispatchQueue(listeners, event) {
  let previousNode;
  for (let { node, handler, phase } of listeners) {
    if (event._isImmediatePropagationStopped()) break;
    if (event._isPropagationStopped() && node !== previousNode) break;
    event._setEventPhase(phase);
    event._setCurrentTarget(node);
    event._prepareForTarget(node);
    try {
      handler(event);
    } catch (error) {
      logError(withTelemetryMessage(toError(error), "Ink event handler threw"));
    }
    previousNode = node;
  }
}
//@ chunk-2avr6cej.js:188626-188830 fingerprint (2.1.88 match: getEventPriority, 0.905)
/**
 * 事件类型 → React 更新优先级：离散事件（按键、点击、焦点、粘贴、action）为 Discrete，连续事件（resize/scroll/wheel/mousemove）为 Continuous，其余 Default。
 */
function getEventPriority(eventType) {
  switch (eventType) {
    case "keydown":
    case "keyup":
    case "click":
    case "focus":
    case "blur":
    case "paste":
    case "action":
      return discreteEventPriority;
    case "resize":
    case "scroll":
    case "wheel":
    case "mousemove":
      return continuousEventPriority;
    default:
      return defaultEventPriority;
  }
}
//@ chunk-2avr6cej.js:188830-189664 fingerprint (2.1.88 match: Dispatcher, 0.956)
/**
 * Ink 的 DOM 事件分发器：dispatch 收集监听器并执行，返回是否未被 preventDefault；dispatchDiscrete 走 reconciler.discreteUpdates；dispatchContinuous 临时把优先级设为 Continuous。resolveEventPriority 供 reconciler 的 getCurrentUpdatePriority 使用。
 */
class Dispatcher {
  discreteUpdates;
  currentEvent = null;
  currentUpdatePriority = defaultEventPriority;
  constructor(discreteUpdates = null) {
    this.discreteUpdates = discreteUpdates;
  }
  setCurrentUpdatePriority(currentUpdatePriority) {
    this.currentUpdatePriority = currentUpdatePriority;
  }
  resolveEventPriority() {
    if (this.currentUpdatePriority !== noEventPriority) return this.currentUpdatePriority;
    if (this.currentEvent) return getEventPriority(this.currentEvent.type);
    return defaultEventPriority;
  }
  dispatch(target, event) {
    let previousEvent = this.currentEvent;
    this.currentEvent = event;
    try {
      event._setTarget(target);
      let listeners = collectListeners(target, event);
      processDispatchQueue(listeners, event);
      event._setEventPhase("none");
      event._setCurrentTarget(null);
      return !event.defaultPrevented;
    } finally {
      this.currentEvent = previousEvent;
    }
  }
  dispatchDiscrete(target, event) {
    if (!this.discreteUpdates) return this.dispatch(target, event);
    return this.discreteUpdates((t, e) => this.dispatch(t, e), target, event, undefined, undefined);
  }
  dispatchContinuous(target, event) {
    let previousPriority = this.currentUpdatePriority;
    try {
      this.currentUpdatePriority = continuousEventPriority;
      return this.dispatch(target, event);
    } finally {
      this.currentUpdatePriority = previousPriority;
    }
  }
}
export { Dispatcher };

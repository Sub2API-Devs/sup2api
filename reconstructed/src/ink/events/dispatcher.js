/**
 * ink/events/dispatcher.ts
 *
 * 事件派发器：捕获/冒泡路径收集、按事件类型决定 React 更新优先级
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/events/dispatcher.ts
 * pieces: chunk-bzr73sfg.js (5)
 * attribution: fingerprint 5
 */
import { HANDLER_FOR_EVENT } from "./event-handlers.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { Fc, Ia, ul, Uc } from "../../../vendor/yoga-layout/dist/src/generated/YGEnums.js";

/**
 * 取节点上某事件类型的冒泡或捕获处理器。
 */
//@ chunk-bzr73sfg.js:188315-188447 fingerprint = getHandler (1)
function getHandler(node, eventType, capture) {
  let handlers = node._eventHandlers;
  if (!handlers) return;
  let mapping = HANDLER_FOR_EVENT[eventType];
  if (!mapping) return;
  let propName = capture ? mapping.capture : mapping.bubble;
  if (!propName) return;
  return handlers[propName];
}
/**
 * 从目标沿父链收集监听器：捕获处理器放前面（unshift），冒泡处理器放后面（事件不冒泡时只取目标自身），标注阶段。
 */
//@ chunk-bzr73sfg.js:188447-188704 fingerprint = collectListeners (1)
function collectListeners(target, event) {
  let listeners = [],
    node = target;
  while (node) {
    let isTarget = node === target,
      captureHandler = getHandler(node, event.type, !0),
      bubbleHandler = getHandler(node, event.type, !1);
    if (captureHandler)
      listeners.unshift({ node: node, handler: captureHandler, phase: isTarget ? "at_target" : "capturing" });
    if (bubbleHandler && (event.bubbles || isTarget))
      listeners.push({ node: node, handler: bubbleHandler, phase: isTarget ? "at_target" : "bubbling" });
    node = node.parentNode;
  }
  return listeners;
}
/**
 * 按顺序执行监听器：立即停止传播则中断，停止传播则在换节点时中断；处理器抛错只记日志。
 */
//@ chunk-bzr73sfg.js:188704-188979 fingerprint = processDispatchQueue (0.875)
function processDispatchQueue(listeners, event) {
  let previousNode;
  for (let { node: node, handler: handler, phase: phase } of listeners) {
    if (event._isImmediatePropagationStopped()) break;
    if (event._isPropagationStopped() && node !== previousNode) break;
    (event._setEventPhase(phase), event._setCurrentTarget(node), event._prepareForTarget(node));
    try {
      handler(event);
    } catch (error) {
      logError(withTelemetryMessage(toError(error), "Ink event handler threw"));
    }
    previousNode = node;
  }
}
/**
 * 事件类型 → React 更新优先级：离散事件（按键、点击、焦点、粘贴、action）为 Discrete，连续事件（resize/scroll/wheel/mousemove）为 Continuous，其余 Default。
 */
//@ chunk-bzr73sfg.js:188979-189183 fingerprint = getEventPriority (0.905)
function getEventPriority(eventType) {
  switch (eventType) {
    case "keydown":
    case "keyup":
    case "click":
    case "focus":
    case "blur":
    case "paste":
    case "action":
      return Fc;
    case "resize":
    case "scroll":
    case "wheel":
    case "mousemove":
      return Ia;
    default:
      return ul;
  }
}
/**
 * Ink 的 DOM 事件分发器：dispatch 收集监听器并执行，返回是否未被 preventDefault；dispatchDiscrete 走 reconciler.discreteUpdates；dispatchContinuous 临时把优先级设为 Continuous。resolveEventPriority 供 reconciler 的 getCurrentUpdatePriority 使用。
 */
//@ chunk-bzr73sfg.js:189183-190017 fingerprint = Dispatcher (0.956)
class Dispatcher {
  discreteUpdates;
  currentEvent = null;
  currentUpdatePriority = ul;
  constructor(n = null) {
    this.discreteUpdates = n;
  }
  setCurrentUpdatePriority(n) {
    this.currentUpdatePriority = n;
  }
  resolveEventPriority() {
    if (this.currentUpdatePriority !== Uc) return this.currentUpdatePriority;
    if (this.currentEvent) return getEventPriority(this.currentEvent.type);
    return ul;
  }
  dispatch(n, u) {
    let currentEvent = this.currentEvent;
    this.currentEvent = u;
    try {
      u._setTarget(n);
      let m = collectListeners(n, u);
      return (
        processDispatchQueue(m, u),
        u._setEventPhase("none"),
        u._setCurrentTarget(null),
        !u.defaultPrevented
      );
    } finally {
      this.currentEvent = currentEvent;
    }
  }
  dispatchDiscrete(n, u) {
    if (!this.discreteUpdates) return this.dispatch(n, u);
    return this.discreteUpdates((f, m) => this.dispatch(f, m), n, u, void 0, void 0);
  }
  dispatchContinuous(n, u) {
    let currentUpdatePriority = this.currentUpdatePriority;
    try {
      return ((this.currentUpdatePriority = Ia), this.dispatch(n, u));
    } finally {
      this.currentUpdatePriority = currentUpdatePriority;
    }
  }
}

export { Dispatcher };

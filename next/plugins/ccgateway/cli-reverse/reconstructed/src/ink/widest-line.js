/**
 * ink/widest-line.ts
 *
 * 并入已有模块：记录滚轮输入事件与实时状态（滚动速度调试/演示标尺）；订阅滚轮实时状态的辅助函数组。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/widest-line.ts
 * pieces: chunk-2avr6cej.js (13)
 * attribution: placement 12, callgraph-fingerprint 1
 */
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { lineWidth } from "./line-width-cache.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-2avr6cej.js:289789-289800 placement
var MAX_SCROLL_TRACE_EVENTS = 256;
//@ chunk-2avr6cej.js:289800-291500 placement
/**
 * 记录滚轮输入事件与实时状态（滚动速度调试/演示标尺）。
 */
class ScrollTrace {
  enabled = false;
  events = [];
  position = null;
  lastInputTs = 0;
  snapshot = {
    enabled: false,
    events: this.events,
    position: null,
  };
  listeners = new Set();
  liveWatching = false;
  demoRuler = false;
  liveState = null;
  liveListeners = new Set();
  setLiveWatching(watching, options) {
    let demoRulerValue = watching && (options?.demoRuler ?? true);
    if (this.liveWatching === watching && this.demoRuler === demoRulerValue) return;
    this.liveWatching = watching;
    this.demoRuler = demoRulerValue;
    if (!watching) this.liveState = null;
    for (let liveListener of this.liveListeners) liveListener();
  }
  subscribeLive(listener) {
    this.liveListeners.add(listener);
    return () => this.liveListeners.delete(listener);
  }
  getLiveState() {
    return this.liveState;
  }
  isLiveWatching() {
    return this.liveWatching;
  }
  isDemoRulerEnabled() {
    return this.demoRuler;
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  getSnapshot() {
    return this.snapshot;
  }
  isEnabled() {
    return this.enabled;
  }
  setEnabled(enabled) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) {
      this.events = [];
      this.lastInputTs = 0;
      this.position = null;
    }
    this.bump();
  }
  recordInput(dir, step, inputMeta, inputTs) {
    if (this.liveWatching) {
      this.liveState = {
        wheelMode: inputMeta.wheelMode,
      };
      for (let liveListener of this.liveListeners) liveListener();
    }
    if (!this.enabled) return;
    let gap = this.lastInputTs === 0 ? 1 / 0 : inputTs - this.lastInputTs;
    this.lastInputTs = inputTs;
    this.push({
      kind: "in",
      ts: inputTs,
      dir,
      step,
      flip: inputMeta.pendingFlip && step === 0,
      gap,
      mult: inputMeta.mult,
      wheelMode: inputMeta.wheelMode,
      burst: inputMeta.burstCount,
      jbBypass: inputMeta.jbBypass,
    });
  }
  recordOut(applied, remaining, algo) {
    if (!this.enabled) return;
    this.push({
      kind: "out",
      ts: performance.now(),
      applied,
      remaining,
      algo,
    });
  }
  recordPosition(viewportMetrics) {
    if (!this.enabled) return;
    this.position = {
      top: viewportMetrics.getScrollTop(),
      height: viewportMetrics.getScrollHeight(),
      viewport: viewportMetrics.getViewportHeight(),
    };
  }
  push(event) {
    this.events =
      this.events.length >= MAX_SCROLL_TRACE_EVENTS
        ? [...this.events.slice(1 - MAX_SCROLL_TRACE_EVENTS), event]
        : [...this.events, event];
    this.bump();
  }
  bump() {
    this.snapshot = {
      enabled: this.enabled,
      events: this.events,
      position: this.position,
    };
    for (let listener of this.listeners) listener();
  }
}
//@ chunk-2avr6cej.js:291500-291525 placement
var scrollTraceByHost; // deferred: uses ScrollTrace of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-2avr6cej.js:291500", () => {
  scrollTraceByHost = new HostScoped(() => new ScrollTrace());
});
//@ chunk-2avr6cej.js:291525-291562 placement
function getScrollTrace() {
  return scrollTraceByHost.of(getRootSession().host);
}
//@ chunk-2avr6cej.js:291562-291606 placement
function setScrollTraceLiveWatching(enabled, liveWatching) {
  getScrollTrace().setLiveWatching(enabled, liveWatching);
}
//@ chunk-2avr6cej.js:291606-291651 placement
/**
 * 订阅滚轮实时状态的辅助函数组。
 */
function subscribeScrollTraceLive(listener) {
  return getScrollTrace().subscribeLive(listener);
}
//@ chunk-2avr6cej.js:291651-291693 placement
function getScrollTraceLiveState() {
  return getScrollTrace().getLiveState();
}
//@ chunk-2avr6cej.js:291693-291737 placement
function isScrollTraceLiveWatching() {
  return getScrollTrace().isLiveWatching();
}
//@ chunk-2avr6cej.js:291737-291785 placement
function isScrollTraceDemoRuler() {
  return getScrollTrace().isDemoRulerEnabled();
}
//@ chunk-2avr6cej.js:291785-291833 placement
function recordScrollInput(dir, rows, state, inputTs) {
  getScrollTrace().recordInput(dir, rows, state, inputTs);
}
//@ chunk-2avr6cej.js:291833-291874 placement
function recordScrollOut(delta, pending, mode) {
  getScrollTrace().recordOut(delta, pending, mode);
}
//@ chunk-2avr6cej.js:291874-291913 placement
function recordScrollPosition(viewportMetrics) {
  getScrollTrace().recordPosition(viewportMetrics);
}
//@ chunk-2avr6cej.js:291913-292075 callgraph-fingerprint (2.1.88 match: widestLine, 1)
/**
 * 多行文本中最宽一行的显示宽度。
 */
function widestLine(string) {
  let maxWidth = 0;
  let start = 0;
  while (start <= string.length) {
    let end = string.indexOf(
      `
`,
      start,
    );
    let line = end === -1 ? string.substring(start) : string.substring(start, end);
    maxWidth = Math.max(maxWidth, lineWidth(line));
    if (end === -1) break;
    start = end + 1;
  }
  return maxWidth;
}
export {
  recordScrollPosition,
  recordScrollInput,
  widestLine,
  recordScrollOut,
  setScrollTraceLiveWatching,
  subscribeScrollTraceLive,
  getScrollTraceLiveState,
  isScrollTraceLiveWatching,
  isScrollTraceDemoRuler,
};

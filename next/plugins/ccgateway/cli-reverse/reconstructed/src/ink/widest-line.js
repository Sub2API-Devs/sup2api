/**
 * ink/widest-line.ts
 *
 * 并入已有模块：记录滚轮输入事件与实时状态（滚动速度调试/演示标尺）；订阅滚轮实时状态的辅助函数组。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/widest-line.ts
 * pieces: chunk-bzr73sfg.js (13)
 * attribution: placement 12, callgraph-fingerprint 1
 */
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { lineWidth } from "./line-width-cache.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bzr73sfg.js:290208-290219 placement
var MAX_SCROLL_TRACE_EVENTS = 256;
//@ chunk-bzr73sfg.js:290219-291919 placement
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
//@ chunk-bzr73sfg.js:291919-291944 placement
var scrollTraceByHost; // deferred: uses ScrollTrace of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bzr73sfg.js:291919", () => {
  scrollTraceByHost = new HostScoped(() => new ScrollTrace());
});
//@ chunk-bzr73sfg.js:291944-291981 placement
function getScrollTrace() {
  return scrollTraceByHost.of(getRootSession().host);
}
//@ chunk-bzr73sfg.js:291981-292025 placement
function setScrollTraceLiveWatching(enabled, liveWatching) {
  getScrollTrace().setLiveWatching(enabled, liveWatching);
}
//@ chunk-bzr73sfg.js:292025-292070 placement
/**
 * 订阅滚轮实时状态的辅助函数组。
 */
function subscribeScrollTraceLive(listener) {
  return getScrollTrace().subscribeLive(listener);
}
//@ chunk-bzr73sfg.js:292070-292112 placement
function getScrollTraceLiveState() {
  return getScrollTrace().getLiveState();
}
//@ chunk-bzr73sfg.js:292112-292156 placement
function isScrollTraceLiveWatching() {
  return getScrollTrace().isLiveWatching();
}
//@ chunk-bzr73sfg.js:292156-292204 placement
function isScrollTraceDemoRuler() {
  return getScrollTrace().isDemoRulerEnabled();
}
//@ chunk-bzr73sfg.js:292204-292252 placement
function recordScrollInput(dir, rows, state, inputTs) {
  getScrollTrace().recordInput(dir, rows, state, inputTs);
}
//@ chunk-bzr73sfg.js:292252-292293 placement
function recordScrollOut(delta, pending, mode) {
  getScrollTrace().recordOut(delta, pending, mode);
}
//@ chunk-bzr73sfg.js:292293-292332 placement
function recordScrollPosition(viewportMetrics) {
  getScrollTrace().recordPosition(viewportMetrics);
}
//@ chunk-bzr73sfg.js:292332-292494 callgraph-fingerprint = widestLine (1)
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
  subscribeScrollTraceLive,
  isScrollTraceLiveWatching,
  isScrollTraceDemoRuler,
  widestLine,
  recordScrollOut,
  setScrollTraceLiveWatching,
  getScrollTraceLiveState,
};

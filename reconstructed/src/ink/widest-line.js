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
  setLiveWatching(n, u) {
    let f = n && (u?.demoRuler ?? true);
    if (this.liveWatching === n && this.demoRuler === f) return;
    this.liveWatching = n;
    this.demoRuler = f;
    if (!n) this.liveState = null;
    for (let liveListener of this.liveListeners) liveListener();
  }
  subscribeLive(n) {
    this.liveListeners.add(n);
    return () => this.liveListeners.delete(n);
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
  subscribe(n) {
    this.listeners.add(n);
    return () => this.listeners.delete(n);
  }
  getSnapshot() {
    return this.snapshot;
  }
  isEnabled() {
    return this.enabled;
  }
  setEnabled(n) {
    if (this.enabled === n) return;
    this.enabled = n;
    if (!n) {
      this.events = [];
      this.lastInputTs = 0;
      this.position = null;
    }
    this.bump();
  }
  recordInput(dir, u, f, m) {
    if (this.liveWatching) {
      this.liveState = {
        wheelMode: f.wheelMode,
      };
      for (let liveListener of this.liveListeners) liveListener();
    }
    if (!this.enabled) return;
    let gap = this.lastInputTs === 0 ? 1 / 0 : m - this.lastInputTs;
    this.lastInputTs = m;
    this.push({
      kind: "in",
      ts: m,
      dir,
      step: u,
      flip: f.pendingFlip && u === 0,
      gap,
      mult: f.mult,
      wheelMode: f.wheelMode,
      burst: f.burstCount,
      jbBypass: f.jbBypass,
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
  recordPosition(n) {
    if (!this.enabled) return;
    this.position = {
      top: n.getScrollTop(),
      height: n.getScrollHeight(),
      viewport: n.getViewportHeight(),
    };
  }
  push(n) {
    this.events =
      this.events.length >= MAX_SCROLL_TRACE_EVENTS
        ? [...this.events.slice(1 - MAX_SCROLL_TRACE_EVENTS), n]
        : [...this.events, n];
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
var scrollTraceByHost = new HostScoped(() => new ScrollTrace());
//@ chunk-bzr73sfg.js:291944-291981 placement
function getScrollTrace() {
  return scrollTraceByHost.of(getRootSession().host);
}
//@ chunk-bzr73sfg.js:291981-292025 placement
function setScrollTraceLiveWatching(n, u) {
  getScrollTrace().setLiveWatching(n, u);
}
//@ chunk-bzr73sfg.js:292025-292070 placement
/**
 * 订阅滚轮实时状态的辅助函数组。
 */
function subscribeScrollTraceLive(n) {
  return getScrollTrace().subscribeLive(n);
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
function recordScrollInput(n, rows, state, m) {
  getScrollTrace().recordInput(n, rows, state, m);
}
//@ chunk-bzr73sfg.js:292252-292293 placement
function recordScrollOut(n, u, f) {
  getScrollTrace().recordOut(n, u, f);
}
//@ chunk-bzr73sfg.js:292293-292332 placement
function recordScrollPosition(n) {
  getScrollTrace().recordPosition(n);
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

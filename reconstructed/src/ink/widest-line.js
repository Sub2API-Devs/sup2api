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
/**
 * 记录滚轮输入事件与实时状态（滚动速度调试/演示标尺）。
 */
//@ chunk-bzr73sfg.js:290219-291919 placement
class ScrollTrace {
  enabled = !1;
  events = [];
  position = null;
  lastInputTs = 0;
  snapshot = { enabled: !1, events: this.events, position: null };
  listeners = new Set();
  liveWatching = !1;
  demoRuler = !1;
  liveState = null;
  liveListeners = new Set();
  setLiveWatching(n, u) {
    let f = n && (u?.demoRuler ?? !0);
    if (this.liveWatching === n && this.demoRuler === f) return;
    if (((this.liveWatching = n), (this.demoRuler = f), !n)) this.liveState = null;
    for (let liveListener of this.liveListeners) liveListener();
  }
  subscribeLive(n) {
    return (this.liveListeners.add(n), () => this.liveListeners.delete(n));
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
    return (this.listeners.add(n), () => this.listeners.delete(n));
  }
  getSnapshot() {
    return this.snapshot;
  }
  isEnabled() {
    return this.enabled;
  }
  setEnabled(n) {
    if (this.enabled === n) return;
    if (((this.enabled = n), !n)) ((this.events = []), (this.lastInputTs = 0), (this.position = null));
    this.bump();
  }
  recordInput(n, u, f, m) {
    if (this.liveWatching) {
      this.liveState = { wheelMode: f.wheelMode };
      for (let liveListener of this.liveListeners) liveListener();
    }
    if (!this.enabled) return;
    let p = this.lastInputTs === 0 ? 1 / 0 : m - this.lastInputTs;
    ((this.lastInputTs = m),
      this.push({
        kind: "in",
        ts: m,
        dir: n,
        step: u,
        flip: f.pendingFlip && u === 0,
        gap: p,
        mult: f.mult,
        wheelMode: f.wheelMode,
        burst: f.burstCount,
        jbBypass: f.jbBypass,
      }));
  }
  recordOut(n, u, f) {
    if (!this.enabled) return;
    this.push({ kind: "out", ts: performance.now(), applied: n, remaining: u, algo: f });
  }
  recordPosition(n) {
    if (!this.enabled) return;
    this.position = { top: n.getScrollTop(), height: n.getScrollHeight(), viewport: n.getViewportHeight() };
  }
  push(n) {
    ((this.events =
      this.events.length >= MAX_SCROLL_TRACE_EVENTS
        ? [...this.events.slice(1 - MAX_SCROLL_TRACE_EVENTS), n]
        : [...this.events, n]),
      this.bump());
  }
  bump() {
    this.snapshot = { enabled: this.enabled, events: this.events, position: this.position };
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
/**
 * 订阅滚轮实时状态的辅助函数组。
 */
//@ chunk-bzr73sfg.js:292025-292070 placement
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
function recordScrollInput(n, u, f, m) {
  getScrollTrace().recordInput(n, u, f, m);
}
//@ chunk-bzr73sfg.js:292252-292293 placement
function recordScrollOut(n, u, f) {
  getScrollTrace().recordOut(n, u, f);
}
//@ chunk-bzr73sfg.js:292293-292332 placement
function recordScrollPosition(n) {
  getScrollTrace().recordPosition(n);
}
/**
 * 多行文本中最宽一行的显示宽度。
 */
//@ chunk-bzr73sfg.js:292332-292494 callgraph-fingerprint = widestLine (1)
function widestLine(string) {
  let u = 0,
    f = 0;
  while (f <= string.length) {
    let index = string.indexOf(
        `
`,
        f,
      ),
      line = index === -1 ? string.substring(f) : string.substring(f, index);
    if (((u = Math.max(u, lineWidth(line))), index === -1)) break;
    f = index + 1;
  }
  return u;
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

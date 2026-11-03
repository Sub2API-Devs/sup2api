/**
 * services/analytics/index.ts
 *
 * 分析事件公共入口 logEvent/logEventAsync：sink 挂上前排队（上限 1000），stripProtoFields。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/analytics/index.ts
 * pieces: chunk-8kte1b36.js (10)
 * attribution: facade-exports 4, layout 6
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { onProcessRootHost } from "../../bootstrap/state.js";

/**
 * 去掉 _PROTO_ 前缀的字段（这些只进 1P protobuf 的特权列，不发往 Datadog）。
 */
//@ chunk-8kte1b36.js:262-374 facade-exports = stripProtoFields (1)
function stripProtoFields(metadata) {
  let result;
  for (let key in metadata)
    if (key.startsWith("_PROTO_")) {
      if (result === void 0) result = { ...metadata };
      delete result[key];
    }
  return result ?? metadata;
}
//@ chunk-8kte1b36.js:374-385 layout
var MAX_QUEUED_EVENTS = 1000;
//@ chunk-8kte1b36.js:385-450 layout
function createAnalyticsQueueState() {
  return { eventQueue: [], sink: null, droppedEventCount: 0 };
}
/**
 * 事件入队：队列满 1000 时丢弃最旧事件并累计 droppedEventCount。
 */
//@ chunk-8kte1b36.js:450-556 layout
function enqueueAnalyticsEvent(t, e) {
  if (t.eventQueue.length >= MAX_QUEUED_EVENTS) (t.eventQueue.shift(), t.droppedEventCount++);
  t.eventQueue.push(e);
}
//@ chunk-8kte1b36.js:556-574 layout
class AnalyticsQueueHolder {
  state = createAnalyticsQueueState();
}
//@ chunk-8kte1b36.js:574-597 layout
var analyticsQueueByHost = new HostScoped(() => new AnalyticsQueueHolder());
//@ chunk-8kte1b36.js:597-623 layout
function getAnalyticsQueueHolder() {
  return onProcessRootHost(analyticsQueueByHost);
}
/**
 * 挂上分析 sink（只允许一次），在 microtask 中按顺序回放之前排队的事件。
 */
//@ chunk-8kte1b36.js:623-888 facade-exports
function attachAnalyticsSink(newSink) {
  let state = getAnalyticsQueueHolder().state;
  if (state.sink !== null) return !1;
  if (((state.sink = newSink), state.eventQueue.length > 0)) {
    let eventQueue = state.eventQueue;
    ((state.eventQueue = []),
      queueMicrotask(() => {
        for (let event of eventQueue)
          if (event.async) newSink.logEventAsync(event.eventName, event.metadata);
          else newSink.logEvent(event.eventName, event.metadata);
      }));
  }
  return !0;
}
/**
 * 记录分析事件：sink 未挂上前进入内存队列（上限 1000，满了丢最旧并计数），挂上后直接交给 sink.logEvent。
 */
//@ chunk-8kte1b36.js:888-1005 facade-exports = logEvent (0.878)
function logEvent(eventName, metadata) {
  let state = getAnalyticsQueueHolder().state;
  if (state.sink === null) {
    enqueueAnalyticsEvent(state, { eventName: eventName, metadata: metadata, async: !1 });
    return;
  }
  state.sink.logEvent(eventName, metadata);
}
/**
 * logEvent 的异步版本，等待 sink 发送完成；sink 未挂上时同样入队。
 */
//@ chunk-8kte1b36.js:1005-1140 facade-exports = logEventAsync (0.883)
async function logEventAsync(eventName, metadata) {
  let state = getAnalyticsQueueHolder().state;
  if (state.sink === null) {
    enqueueAnalyticsEvent(state, { eventName: eventName, metadata: metadata, async: !0 });
    return;
  }
  await state.sink.logEventAsync(eventName, metadata);
}

export { logEvent, logEventAsync, stripProtoFields, attachAnalyticsSink };

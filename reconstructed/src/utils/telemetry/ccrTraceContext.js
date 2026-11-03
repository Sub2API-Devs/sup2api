/**
 * utils/telemetry/ccrTraceContext.ts
 *
 * 2.1.316 新增：CCR 追踪上下文。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-19a14v9k.js (6)
 * attribution: placement 6
 */
import { Vt } from "../agentId.js";

//@ chunk-19a14v9k.js:227-320 placement
var a = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/,
  repeat = "0".repeat(32),
  repeat_2 = "0".repeat(16),
  u = 8;
//@ chunk-19a14v9k.js:320-418 placement
function d(n) {
  if (typeof n !== "string") return !1;
  let match = a.exec(n);
  return match !== null && match[1] !== repeat && match[2] !== repeat_2;
}
/**
 * 从非跨会话消息中取 trace_context 与事件 uuid。
 */
//@ chunk-19a14v9k.js:418-633 placement
function extractCcrTraceContext(n, { isCrossSession: isCrossSession }) {
  if (isCrossSession || typeof n !== "object" || n === null) return;
  if (!("trace_context" in n) || !("uuid" in n)) return;
  let trace_context = n.trace_context,
    o = Vt(n.uuid);
  if (!d(trace_context) || !o) return;
  return { traceparent: trace_context, eventUuid: o };
}
/**
 * 合并排队提示的追踪上下文：最后一个为父，其余去重为链接。
 */
//@ chunk-19a14v9k.js:633-898 placement
function mergeQueuedTraceContexts(n) {
  let t = n.findLast((e) => e.traceContext)?.traceContext;
  if (!t) return { parent: void 0, linked: [] };
  let r = new Set([t.traceparent]),
    o = [];
  for (let { traceContext: traceContext } of n)
    if (traceContext && !r.has(traceContext.traceparent))
      (r.add(traceContext.traceparent), o.push(traceContext));
  return { parent: t, linked: o.slice(-u) };
}
//@ chunk-19a14v9k.js:898-978 placement
var ANTHROPIC_CCR_TURN_EVENT_UUID = "anthropic/ccr-turn-event-uuid",
  ANTHROPIC_CCR_TURN_LINKED_EVENT_UUIDS = "anthropic/ccr-turn-linked-event-uuids";
/**
 * CCR 回合事件 uuid 与链接事件 uuid 头。
 */
//@ chunk-19a14v9k.js:978-1150 placement
function ccrTurnEventHeaders(n) {
  let t = Vt(n?.parent?.eventUuid);
  if (!n || !t) return {};
  let flattened = n.linked.flatMap((o) => {
    let e = Vt(o.eventUuid);
    return e ? [e] : [];
  });
  return {
    [ANTHROPIC_CCR_TURN_EVENT_UUID]: t,
    ...(flattened.length > 0 && { [ANTHROPIC_CCR_TURN_LINKED_EVENT_UUIDS]: flattened }),
  };
}

export { ccrTurnEventHeaders, extractCcrTraceContext, mergeQueuedTraceContexts };

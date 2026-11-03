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
import { normalizeUuidOrNull } from "../agentId.js";

//@ chunk-19a14v9k.js:227-320 placement
var TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;
var c = "0".repeat(32);
var i = "0".repeat(16);
var MAX_LINKED_SPANS = 8;
//@ chunk-19a14v9k.js:320-418 placement
function isForeignTraceparent(traceContext) {
  if (typeof traceContext !== "string") return false;
  let match = TRACEPARENT_RE.exec(traceContext);
  return match !== null && match[1] !== c && match[2] !== i;
}
//@ chunk-19a14v9k.js:418-633 placement
/**
 * 从非跨会话消息中取 trace_context 与事件 uuid。
 */
function extractCcrTraceContext(n, { isCrossSession }) {
  if (isCrossSession || typeof n !== "object" || n === null) return;
  if (!("trace_context" in n) || !("uuid" in n)) return;
  let traceContext = n.trace_context;
  let o = normalizeUuidOrNull(n.uuid);
  if (!isForeignTraceparent(traceContext) || !o) return;
  return {
    traceparent: traceContext,
    eventUuid: o,
  };
}
//@ chunk-19a14v9k.js:633-898 placement
/**
 * 合并排队提示的追踪上下文：最后一个为父，其余去重为链接。
 */
function mergeQueuedTraceContexts(n) {
  let traceContext = n.findLast((e) => e.traceContext)?.traceContext;
  if (!traceContext)
    return {
      parent: undefined,
      linked: [],
    };
  let r = new Set([traceContext.traceparent]);
  let o = [];
  for (let { traceContext } of n)
    if (traceContext && !r.has(traceContext.traceparent)) {
      r.add(traceContext.traceparent);
      o.push(traceContext);
    }
  return {
    parent: traceContext,
    linked: o.slice(-MAX_LINKED_SPANS),
  };
}
//@ chunk-19a14v9k.js:898-978 placement
var ANTHROPIC_CCR_TURN_EVENT_UUID = "anthropic/ccr-turn-event-uuid";
var ANTHROPIC_CCR_TURN_LINKED_EVENT_UUIDS = "anthropic/ccr-turn-linked-event-uuids";
//@ chunk-19a14v9k.js:978-1150 placement
/**
 * CCR 回合事件 uuid 与链接事件 uuid 头。
 */
function ccrTurnEventHeaders(n) {
  let t = normalizeUuidOrNull(n?.parent?.eventUuid);
  if (!n || !t) return {};
  let flattened = n.linked.flatMap((o) => {
    let e = normalizeUuidOrNull(o.eventUuid);
    return e ? [e] : [];
  });
  return {
    [ANTHROPIC_CCR_TURN_EVENT_UUID]: t,
    ...(flattened.length > 0 && {
      [ANTHROPIC_CCR_TURN_LINKED_EVENT_UUIDS]: flattened,
    }),
  };
}
export { ccrTurnEventHeaders, extractCcrTraceContext, mergeQueuedTraceContexts };

/**
 * utils/telemetry/ccrTraceContext.ts
 *
 * 2.1.316 新增：CCR 追踪上下文。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-07fdjf23.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalizeUuidOrNull } from "../agentId.js";

//@ chunk-07fdjf23.js:227-320 placement
var TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;
var ZERO_TRACE_ID = "0".repeat(32);
var ZERO_SPAN_ID = "0".repeat(16);
var MAX_LINKED_SPANS = 8;
//@ chunk-07fdjf23.js:320-418 placement
function isForeignTraceparent(traceContext) {
  if (typeof traceContext !== "string") return false;
  let match = TRACEPARENT_RE.exec(traceContext);
  return match !== null && match[1] !== ZERO_TRACE_ID && match[2] !== ZERO_SPAN_ID;
}
//@ chunk-07fdjf23.js:418-633 placement
/**
 * 从非跨会话消息中取 trace_context 与事件 uuid。
 */
function extractCcrTraceContext(message, { isCrossSession }) {
  if (isCrossSession || typeof message !== "object" || message === null) return;
  if (!("trace_context" in message) || !("uuid" in message)) return;
  let traceContext = message.trace_context;
  let eventUuid = normalizeUuidOrNull(message.uuid);
  if (!isForeignTraceparent(traceContext) || !eventUuid) return;
  return {
    traceparent: traceContext,
    eventUuid,
  };
}
//@ chunk-07fdjf23.js:633-898 placement
/**
 * 合并排队提示的追踪上下文：最后一个为父，其余去重为链接。
 */
function mergeQueuedTraceContexts(queuedEvents) {
  let traceContext = queuedEvents.findLast((queuedEvent) => queuedEvent.traceContext)?.traceContext;
  if (!traceContext)
    return {
      parent: undefined,
      linked: [],
    };
  let seenTraceparents = new Set([traceContext.traceparent]);
  let linkedContexts = [];
  for (let { traceContext } of queuedEvents)
    if (traceContext && !seenTraceparents.has(traceContext.traceparent)) {
      seenTraceparents.add(traceContext.traceparent);
      linkedContexts.push(traceContext);
    }
  return {
    parent: traceContext,
    linked: linkedContexts.slice(-MAX_LINKED_SPANS),
  };
}
//@ chunk-07fdjf23.js:898-978 placement
var ANTHROPIC_CCR_TURN_EVENT_UUID = "anthropic/ccr-turn-event-uuid";
var ANTHROPIC_CCR_TURN_LINKED_EVENT_UUIDS = "anthropic/ccr-turn-linked-event-uuids";
//@ chunk-07fdjf23.js:978-1150 placement
/**
 * CCR 回合事件 uuid 与链接事件 uuid 头。
 */
function ccrTurnEventHeaders(traceContexts) {
  let eventUuid = normalizeUuidOrNull(traceContexts?.parent?.eventUuid);
  if (!traceContexts || !eventUuid) return {};
  let flattened = traceContexts.linked.flatMap((linkContext) => {
    let linkEventUuid = normalizeUuidOrNull(linkContext.eventUuid);
    return linkEventUuid ? [linkEventUuid] : [];
  });
  return {
    [ANTHROPIC_CCR_TURN_EVENT_UUID]: eventUuid,
    ...(flattened.length > 0 && {
      [ANTHROPIC_CCR_TURN_LINKED_EVENT_UUIDS]: flattened,
    }),
  };
}
export { extractCcrTraceContext, ccrTurnEventHeaders, mergeQueuedTraceContexts };

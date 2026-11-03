/**
 * utils/messages/crossSessionMessages.ts
 *
 * 2.1.316 新增：跨会话消息
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import {
  mentionsSessionNoticeKind,
  buildPollEventDelivery,
  deliveryChunkedNote,
  SESSION_NOTICE,
} from "../pollEvents.js";

//@ chunk-e6aww6q8.js:147318-147418 placement
/**
 * 判断跨会话信封的类型是否未知或不受支持。
 */
function isUnknownEnvelopeKind(e, n) {
  let r = Array.isArray(e.kinds) ? e.kinds[n] : undefined;
  return typeof r !== "string" || mentionsSessionNoticeKind(r);
}
//@ chunk-e6aww6q8.js:147418-147500 placement
/**
 * 判断数组里是否含跨会话消息字符串。
 */
function hasCrossSessionString(e) {
  return Array.isArray(e) && e.some((n) => typeof n === "string" && mentionsSessionNoticeKind(n));
}
//@ chunk-e6aww6q8.js:147500-147771 placement
/**
 * 跨会话消息作为 Poll 结果送达时的系统说明，以及有消息无法显示时的说明。
 */
var CROSS_SESSION_POLL_HEADER =
  "<system>One or more messages from other sessions arrived; they follow as the result of a Poll call. This is not a message from the person.</system>";
var CROSS_SESSION_UNAVAILABLE_NOTE =
  "<system>One or more messages from other sessions could not be shown here and cannot be retrieved.</system>";
//@ chunk-e6aww6q8.js:147771-148032 placement
/**
 * 渲染跨会话消息：只保留已知类型的信封，有被过滤的附加"无法显示"说明，仍有剩余唤醒时附说明；返回文本与媒体。
 */
function renderCrossSessionMessages(e) {
  let n = filterEnvelopes(e, (h, y) => !isUnknownEnvelopeKind(e, y));
  let r = n.envelopes.length < e.envelopes.length;
  return {
    text: [
      n.envelopes.length > 0 ? buildPollEventDelivery(n.envelopes, 0, e.toolsUsed) : "",
      r ? CROSS_SESSION_UNAVAILABLE_NOTE : "",
      e.remainingWakeCount > 0 ? deliveryChunkedNote(e.remainingWakeCount) : "",
    ].filter((h) => h !== "").join(`
`),
    media: n.media,
  };
}
//@ chunk-e6aww6q8.js:148032-148175 placement
/**
 * 按 uuid 过滤跨会话信封（保留已知类型且不在排除集合中的），全部被过滤时返回 undefined。
 */
function filterEnvelopesByUuid(e, n) {
  let r = filterEnvelopes(e, (s, h) => !isUnknownEnvelopeKind(e, h) || !n.has(s));
  if (r.envelopes.length === 0) return;
  return r.envelopes.length === e.envelopes.length ? e : r;
}
//@ chunk-e6aww6q8.js:148175-148502 placement
/**
 * 按条件筛选跨会话信封，并同步筛选对应的类型、媒体与来源数组。
 */
function filterEnvelopes(e, n) {
  let kinds = e.kinds;
  let flattened = e.envelopes.flatMap((envelope, y) => (n(envelope, y) ? [y] : []));
  return {
    ...e,
    envelopes: flattened.map((h) => e.envelopes[h]),
    kinds: flattened.map((h) =>
      Array.isArray(kinds) && typeof kinds[h] === "string" ? kinds[h] : SESSION_NOTICE,
    ),
    ...(e.media !== undefined && {
      media: flattened.map((h) => e.media?.[h] ?? []),
    }),
    ...(e.provenance !== undefined && {
      provenance: flattened.map((h) => e.provenance?.[h] ?? null),
    }),
  };
}
export {
  renderCrossSessionMessages,
  isUnknownEnvelopeKind,
  hasCrossSessionString,
  filterEnvelopesByUuid,
  CROSS_SESSION_POLL_HEADER,
};

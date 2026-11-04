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
function isUnknownEnvelopeKind(group, index) {
  let kind = Array.isArray(group.kinds) ? group.kinds[index] : undefined;
  return typeof kind !== "string" || mentionsSessionNoticeKind(kind);
}
//@ chunk-e6aww6q8.js:147418-147500 placement
/**
 * 判断数组里是否含跨会话消息字符串。
 */
function hasCrossSessionString(values) {
  return (
    Array.isArray(values) &&
    values.some((value) => typeof value === "string" && mentionsSessionNoticeKind(value))
  );
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
function renderCrossSessionMessages(attachment) {
  let filtered = filterEnvelopes(attachment, (envelope, index) => !isUnknownEnvelopeKind(attachment, index));
  let dropped = filtered.envelopes.length < attachment.envelopes.length;
  return {
    text: [
      filtered.envelopes.length > 0
        ? buildPollEventDelivery(filtered.envelopes, 0, attachment.toolsUsed)
        : "",
      dropped ? CROSS_SESSION_UNAVAILABLE_NOTE : "",
      attachment.remainingWakeCount > 0 ? deliveryChunkedNote(attachment.remainingWakeCount) : "",
    ].filter((part) => part !== "").join(`
`),
    media: filtered.media,
  };
}
//@ chunk-e6aww6q8.js:148032-148175 placement
/**
 * 按 uuid 过滤跨会话信封（保留已知类型且不在排除集合中的），全部被过滤时返回 undefined。
 */
function filterEnvelopesByUuid(attachment, knownUuids) {
  let filtered = filterEnvelopes(
    attachment,
    (envelope, index) => !isUnknownEnvelopeKind(attachment, index) || !knownUuids.has(envelope),
  );
  if (filtered.envelopes.length === 0) return;
  return filtered.envelopes.length === attachment.envelopes.length ? attachment : filtered;
}
//@ chunk-e6aww6q8.js:148175-148502 placement
/**
 * 按条件筛选跨会话信封，并同步筛选对应的类型、媒体与来源数组。
 */
function filterEnvelopes(attachment, keep) {
  let kinds = attachment.kinds;
  let flattened = attachment.envelopes.flatMap((envelope, index) => (keep(envelope, index) ? [index] : []));
  return {
    ...attachment,
    envelopes: flattened.map((index) => attachment.envelopes[index]),
    kinds: flattened.map((kindIndex) =>
      Array.isArray(kinds) && typeof kinds[kindIndex] === "string" ? kinds[kindIndex] : SESSION_NOTICE,
    ),
    ...(attachment.media !== undefined && {
      media: flattened.map((mediaIndex) => attachment.media?.[mediaIndex] ?? []),
    }),
    ...(attachment.provenance !== undefined && {
      provenance: flattened.map((provenanceIndex) => attachment.provenance?.[provenanceIndex] ?? null),
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

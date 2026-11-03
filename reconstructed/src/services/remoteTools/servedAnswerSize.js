/**
 * services/remoteTools/servedAnswerSize.ts
 *
 * 2.1.316 新增。服务回答大小限制。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-51ajpv6p.js (5)
 * attribution: placement 5
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { readCallResult } from "../../remote/tools/toolDescriptors.js";
import { buildRemoteToolCallResult } from "../../remote/tools/callResults.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../../remote/tools/protocolConstants.js";

//@ chunk-51ajpv6p.js:268-333 placement
/**
 * 服务回答大小的常量与开关：默认上限、允许区间、预留字符，以及读取开关的函数。
 */
var TENGU_SYNTHETIC_FOG = "tengu_synthetic_fog";
var DEFAULT_SERVED_ANSWER_MAX_BYTES = 5242880;
var MIN_SERVED_ANSWER_MAX_BYTES = 65536;
var MAX_SERVED_ANSWER_SETTING_BYTES = 33554432;
var _ = 65536;
//@ chunk-51ajpv6p.js:333-427 placement
function servedAnswerMaxBytes() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    TENGU_SYNTHETIC_FOG,
    DEFAULT_SERVED_ANSWER_MAX_BYTES,
  );
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
    Number.isSafeInteger(featureValue_CACHED_MAY_BE_STALE) &&
    featureValue_CACHED_MAY_BE_STALE >= MIN_SERVED_ANSWER_MAX_BYTES &&
    featureValue_CACHED_MAY_BE_STALE <= MAX_SERVED_ANSWER_SETTING_BYTES
    ? featureValue_CACHED_MAY_BE_STALE
    : DEFAULT_SERVED_ANSWER_MAX_BYTES;
}
//@ chunk-51ajpv6p.js:427-455 placement
/**
 * 计算可返回答案的字节上限。
 */
function servedAnswerLimitBytes() {
  return servedAnswerMaxBytes() - _;
}
//@ chunk-51ajpv6p.js:455-1528 placement
function servedAnswerTooLargeText({ answer, bytes, status, tooLarge }) {
  let n = tooLarge
    ? `is too large for the session service to carry back (${bytes} bytes)`
    : `was refused by the session service (HTTP ${status})`;
  let callResult = readCallResult(
    typeof answer === "object" && answer !== null ? Reflect.get(answer, "result") : undefined,
  );
  let envelope = callResult.envelope.status === "present" ? callResult.envelope.envelope : undefined;
  if (envelope === undefined)
    return {
      content: [
        {
          type: "text",
          text: `(this machine's answer ${n}, so it was not returned)`,
        },
      ],
      isError: true,
    };
  let s = envelope.target.name;
  let a = tooLarge
    ? " Run a narrower command instead: read part of the file (offset and limit), filter the output (head, tail, grep), or for an image or screenshot save a smaller copy on the machine and read that."
    : "";
  let u =
    envelope.outcome === "completed"
      ? `The command ran to completion on ${s}, but its result ${n}, so it was not returned. Its effects stand \u2014 do not re-run it just to see the output.${a}`
      : `${s} answered this call, but the answer ${n}, so it was not returned.${a}`;
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "failed",
      ...(envelope.call_id !== undefined && {
        call_id: envelope.call_id,
      }),
      target: envelope.target,
      code: "tool_error",
      message: u,
      ...replayedFields(envelope),
    },
    content: [
      {
        type: "text",
        text: u,
      },
    ],
  });
}
//@ chunk-51ajpv6p.js:1528-1665 placement
/**
 * 若结果是重放的，返回 replayed 标记与服务时间字段。
 */
function replayedFields(envelope) {
  return "replayed" in envelope && envelope.replayed === true
    ? {
        replayed: true,
        ...("served_at" in envelope &&
          envelope.served_at !== undefined && {
            served_at: envelope.served_at,
          }),
      }
    : {};
}
export { servedAnswerLimitBytes, replayedFields, servedAnswerTooLargeText };

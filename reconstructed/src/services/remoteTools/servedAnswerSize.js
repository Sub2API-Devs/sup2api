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
var TENGU_SYNTHETIC_FOG = "tengu_synthetic_fog",
  l = 5242880,
  p = 65536,
  m = 33554432,
  _ = 65536;
//@ chunk-51ajpv6p.js:333-427 placement
function f() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SYNTHETIC_FOG, l);
  return typeof e === "number" && Number.isSafeInteger(e) && e >= p && e <= m ? e : l;
}
//@ chunk-51ajpv6p.js:427-455 placement
function aNt() {
  return f() - _;
}
//@ chunk-51ajpv6p.js:455-1528 placement
function servedAnswerTooLargeText({ answer: answer, bytes: bytes, status: status, tooLarge: tooLarge }) {
  let n = tooLarge
      ? `is too large for the session service to carry back (${bytes} bytes)`
      : `was refused by the session service (HTTP ${status})`,
    r = readCallResult(
      typeof answer === "object" && answer !== null ? Reflect.get(answer, "result") : void 0,
    ),
    t = r.envelope.status === "present" ? r.envelope.envelope : void 0;
  if (t === void 0)
    return {
      content: [{ type: "text", text: `(this machine's answer ${n}, so it was not returned)` }],
      isError: !0,
    };
  let s = t.target.name,
    a = tooLarge
      ? " Run a narrower command instead: read part of the file (offset and limit), filter the output (head, tail, grep), or for an image or screenshot save a smaller copy on the machine and read that."
      : "",
    u =
      t.outcome === "completed"
        ? `The command ran to completion on ${s}, but its result ${n}, so it was not returned. Its effects stand \u2014 do not re-run it just to see the output.${a}`
        : `${s} answered this call, but the answer ${n}, so it was not returned.${a}`;
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "failed",
      ...(t.call_id !== void 0 && { call_id: t.call_id }),
      target: t.target,
      code: "tool_error",
      message: u,
      ...replayedFields(t),
    },
    content: [{ type: "text", text: u }],
  });
}
/**
 * 若结果是重放的，返回 replayed 标记与服务时间字段。
 */
//@ chunk-51ajpv6p.js:1528-1665 placement
function replayedFields(e) {
  return "replayed" in e && e.replayed === !0
    ? { replayed: !0, ...("served_at" in e && e.served_at !== void 0 && { served_at: e.served_at }) }
    : {};
}

export { aNt, replayedFields, servedAnswerTooLargeText };

/**
 * services/cloudSession/transcript.ts
 *
 * 2.1.316 新增：云会话记录读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yyv1m8fa.js (2)
 * attribution: placement 2
 */
import {
  requireCloudSessionId,
  refusalBeforeAnyRequest,
  getFromSessionApi,
  unavailableForResult,
  unavailable,
} from "./cloudSessionReads.js";
import { WireSafeControlError, isMaxContentLengthError } from "../../utils/errors.js";
import { extractSessionFromResponse } from "../../utils/teleport/api.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";

//@ chunk-yyv1m8fa.js:3892-3934 placement
var S = 200,
  y = 16000000,
  R = 20000,
  C = 1e6,
  p = 2048;
/**
 * 处理 SDK 的 get_cloud_session_transcript：校验会话 id 与游标，先确认云会话存在，再分页拉取 teleport-events（响应过大时把 limit 减半重试，403 记为拒绝），返回事件载荷与下一页游标；按结果打点。
 */
//@ chunk-yyv1m8fa.js:3934-5265 placement
async function getCloudSessionTranscript(limiter, request, context) {
  if (
    (requireCloudSessionId(request.subtype, request.session_id),
    request.cursor !== void 0 &&
      (typeof request.cursor !== "string" || request.cursor === "" || request.cursor.length > p))
  )
    throw new WireSafeControlError(
      `${request.subtype}: cursor must be a non-empty string of at most ${p} characters`,
    );
  let result = await limiter.bounded(request.subtype, context, async (signal) => {
    let d = await refusalBeforeAnyRequest(!0);
    if (d !== null) return d;
    let sessionResult = await getFromSessionApi(`/v1/code/sessions/${request.session_id}`, {
        signal: signal,
        context: context,
        maxResponseBytes: C,
        olderApi: !1,
        isBackground: !1,
      }),
      c = unavailableForResult(sessionResult, !1);
    if (c !== null) return c;
    if (extractSessionFromResponse(sessionResult.ok ? sessionResult.data : void 0) === void 0)
      return unavailable("not_found");
    for (let pageLimit = S; ; pageLimit = Math.floor(pageLimit / 2)) {
      let uRLSearchParams = new URLSearchParams([
        ["limit", String(pageLimit)],
        ...(request.cursor === void 0 ? [] : [["cursor", request.cursor]]),
      ]);
      try {
        let pageResult = await getFromSessionApi(
          `/v1/code/sessions/${request.session_id}/teleport-events?${uRLSearchParams}`,
          {
            signal: signal,
            context: context,
            maxResponseBytes: y,
            olderApi: !1,
            isBackground: !1,
            timeoutMs: R,
            withDeviceProof: !0,
          },
        );
        if (pageResult.ok && pageResult.status === 403) await limiter.pageWasRefused();
        let f = unavailableForResult(pageResult, !1);
        if (f !== null) return f;
        let page = pageResult.ok ? pageResult.data : void 0;
        if (!isPlainObject(page) || !Array.isArray(page.data)) return unavailable("failed");
        return {
          status: "ok",
          entries: page.data.flatMap((a) =>
            isPlainObject(a) && isPlainObject(a.payload) ? [a.payload] : [],
          ),
          ...(typeof page.next_cursor === "string" &&
            page.next_cursor !== "" && { next_cursor: page.next_cursor }),
        };
      } catch (error) {
        if (!isMaxContentLengthError(error) || pageLimit === 1) throw error;
      }
    }
  });
  if (result.status === "ok") logFeatureOk("sdk_get_cloud_session_transcript");
  else logFeatureBad("sdk_get_cloud_session_transcript", result.reason ?? "failed");
  return result;
}

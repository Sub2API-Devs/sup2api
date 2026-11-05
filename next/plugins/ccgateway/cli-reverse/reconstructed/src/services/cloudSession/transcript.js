/**
 * services/cloudSession/transcript.ts
 *
 * 2.1.316 新增：云会话记录读取
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6n97n7ky.js (2)
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

//@ chunk-6n97n7ky.js:4200-4242 placement
/**
 * 转写游标的最大字符数（2048）。
 */
var DEFAULT_TRANSCRIPT_PAGE_LIMIT = 200;
var MAX_TRANSCRIPT_RESPONSE_BYTES = 16000000;
var DEFAULT_TRANSCRIPT_TIMEOUT_MS = 20000;
var MAX_SESSION_EXISTS_RESPONSE_BYTES = 1e6;
var MAX_CURSOR_CHARS = 2048;
//@ chunk-6n97n7ky.js:4242-5573 placement
/**
 * 处理 SDK 的 get_cloud_session_transcript：校验会话 id 与游标，先确认云会话存在，再分页拉取 teleport-events（响应过大时把 limit 减半重试，403 记为拒绝），返回事件载荷与下一页游标；按结果打点。
 */
async function getCloudSessionTranscript(limiter, request, context) {
  requireCloudSessionId(request.subtype, request.session_id);
  if (
    request.cursor !== undefined &&
    (typeof request.cursor !== "string" || request.cursor === "" || request.cursor.length > MAX_CURSOR_CHARS)
  )
    throw new WireSafeControlError(
      `${request.subtype}: cursor must be a non-empty string of at most ${MAX_CURSOR_CHARS} characters`,
    );
  let result = await limiter.bounded(request.subtype, context, async (signal) => {
    let pageLimit = await refusalBeforeAnyRequest(true);
    if (pageLimit !== null) return pageLimit;
    let sessionResult = await getFromSessionApi(`/v1/code/sessions/${request.session_id}`, {
      signal,
      context,
      maxResponseBytes: MAX_SESSION_EXISTS_RESPONSE_BYTES,
      olderApi: false,
      isBackground: false,
    });
    let constructor = unavailableForResult(sessionResult, false);
    if (constructor !== null) return constructor;
    if (extractSessionFromResponse(sessionResult.ok ? sessionResult.data : undefined) === undefined)
      return unavailable("not_found");
    for (let pageLimit = DEFAULT_TRANSCRIPT_PAGE_LIMIT; ; pageLimit = Math.floor(pageLimit / 2)) {
      let uRLSearchParams = new URLSearchParams([
        ["limit", String(pageLimit)],
        ...(request.cursor === undefined ? [] : [["cursor", request.cursor]]),
      ]);
      try {
        let pageResult = await getFromSessionApi(
          `/v1/code/sessions/${request.session_id}/teleport-events?${uRLSearchParams}`,
          {
            signal,
            context,
            maxResponseBytes: MAX_TRANSCRIPT_RESPONSE_BYTES,
            olderApi: false,
            isBackground: false,
            timeoutMs: DEFAULT_TRANSCRIPT_TIMEOUT_MS,
            withDeviceProof: true,
          },
        );
        if (pageResult.ok && pageResult.status === 403) await limiter.pageWasRefused();
        let unavailableResult = unavailableForResult(pageResult, false);
        if (unavailableResult !== null) return unavailableResult;
        let page = pageResult.ok ? pageResult.data : undefined;
        if (!isPlainObject(page) || !Array.isArray(page.data)) return unavailable("failed");
        return {
          status: "ok",
          entries: page.data.flatMap((entry) =>
            isPlainObject(entry) && isPlainObject(entry.payload) ? [entry.payload] : [],
          ),
          ...(typeof page.next_cursor === "string" &&
            page.next_cursor !== "" && {
              next_cursor: page.next_cursor,
            }),
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
export { getCloudSessionTranscript };

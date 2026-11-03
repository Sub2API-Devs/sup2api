/**
 * services/api/incrementalRequestBody.ts
 *
 * 2.1.316 新增：增量序列化请求体并在发送前校验字节一致
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: placement 17
 */
import { createHash } from "crypto";
import {
  fetchWithRequestBodyCompression,
  getGzipRequestBodyBlocksMode,
  hasFinalAnswerRoute,
  scheduleIdleDrop,
} from "./gzipRequestBody.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { TENGU_PLAID_KETTLE } from "./withRetry.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { jsonStringifyRaw } from "../../utils/slowOperations.js";
import { WATERMARK_BITS } from "../analytics/eventSerialization.js";
import { systemClock } from "../../utils/sleep.js";
import { env } from "../../utils/env.js";
import { streamFallbackWarning } from "./streamFallbackWarning.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { getSessionId } from "../../bootstrap/state.js";
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";

//@ chunk-e6aww6q8.js:2574793-2574841 placement
var TAKES_REQUEST_BODY_BYTES = Symbol("takes a request body as bytes");
//@ chunk-e6aww6q8.js:2574841-2574897 placement
/**
 * 导出函数 `markTakesRequestBodyBytes`：参数 e。
 */
function markTakesRequestBodyBytes(e) {
  Object.defineProperty(e, TAKES_REQUEST_BODY_BYTES, {
    value: true,
  });
}
//@ chunk-e6aww6q8.js:2574897-2574950 placement
/**
 * 导出函数 `takesRequestBodyBytes`：参数 e，返回 e === void 0 || e === fetchWithRequestBodyCompression || ycn in e。
 */
function takesRequestBodyBytes(e) {
  return e === undefined || e === fetchWithRequestBodyCompression || TAKES_REQUEST_BODY_BYTES in e;
}
//@ chunk-e6aww6q8.js:2574988-2575032 placement
var TENGU_SOFT_KURZWEIL = "tengu_soft_kurzweil";
var MAX_REUSE_MISMATCH_REPORTS = 3;
var REUSE_MISMATCH_SAMPLE = 0.1;
//@ chunk-e6aww6q8.js:2575032-2575107 placement
function reuseCheckSampleRate() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PLAID_KETTLE, 1);
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
    featureValue_CACHED_MAY_BE_STALE >= 0.1 &&
    featureValue_CACHED_MAY_BE_STALE <= 1
    ? featureValue_CACHED_MAY_BE_STALE
    : 1;
}
//@ chunk-e6aww6q8.js:2575107-2575136 placement
var NOT_COPIED = Symbol("not copied");
//@ chunk-e6aww6q8.js:2575136-2575203 placement
function isPlainObjectWithProto(e) {
  return Object.getPrototypeOf(e) === Object.prototype;
}
//@ chunk-e6aww6q8.js:2575203-2575362 placement
function jsonShape(e) {
  if (typeof e !== "object" || e === null) return e;
  if ("toJSON" in e) return NOT_COPIED;
  if (Array.isArray(e)) return e.map(jsonShape);
  return isPlainObjectWithProto(e) ? xr(e, (n) => jsonShape(n)) : NOT_COPIED;
}
//@ chunk-e6aww6q8.js:2575362-2575460 placement
function hasNotCopiedMarker(e) {
  if (typeof e !== "object" || e === null) return e === NOT_COPIED;
  return Object.values(e).some(hasNotCopiedMarker);
}
//@ chunk-e6aww6q8.js:2575460-2575907 placement
/**
 * 比较两个 JSON 值的结构与键顺序是否完全一致（右侧含 toJSON 视为不同）。
 */
function sameJsonShape(shapes, messages) {
  if (typeof shapes !== "object" || shapes === null || typeof messages !== "object" || messages === null)
    return shapes === messages;
  if ("toJSON" in messages) return false;
  if (Array.isArray(shapes)) {
    if (!Array.isArray(messages) || shapes.length !== messages.length) return false;
    for (let idx = 0; idx < shapes.length; idx++)
      if (!sameJsonShape(shapes[idx], messages[idx])) return false;
    return true;
  }
  if (Array.isArray(messages) || !isPlainObjectWithProto(shapes) || !isPlainObjectWithProto(messages))
    return false;
  let keys = Object.keys(shapes);
  let keys_2 = Object.keys(messages);
  if (keys.length !== keys_2.length) return false;
  for (let [h, y] of keys.entries())
    if (y !== keys_2[h] || !sameJsonShape(shapes[y], messages[y])) return false;
  return true;
}
//@ chunk-e6aww6q8.js:2575907-2576014 placement
function serializeKeys(e, n) {
  return n
    .flatMap((r) => {
      let s = jsonStringifyRaw(e[r]);
      return s === undefined ? [] : [`${jsonStringifyRaw(r)}:${s}`];
    })
    .join(",");
}
//@ chunk-e6aww6q8.js:2576014-2577540 placement
/**
 * 增量序列化请求体：复用上次已序列化的消息前缀，只追加新消息。
 */
function serializeRequestBodyIncrementally(e, n) {
  let messages = e.messages;
  if (
    !Array.isArray(messages) ||
    "toJSON" in e ||
    [...Object.values(e), ...messages].some((lt) => typeof lt === "object" && lt !== null && "toJSON" in lt)
  )
    return;
  let keys = Object.keys(e);
  let h = serializeKeys(e, keys.slice(0, keys.indexOf("messages")));
  let y = serializeKeys(e, keys.slice(keys.indexOf("messages") + 1));
  let S = `{${h}${h === "" ? "" : ","}"messages":[`;
  let w = `]${y === "" ? "" : ","}${y}}`;
  let L = n?.keptBody?.inUse === true ? undefined : n;
  let keptBody = L?.keptBody?.opening === S ? L.keptBody : undefined;
  let q = 0;
  if (keptBody !== undefined) {
    let min = Math.min(keptBody.shapes.length, messages.length);
    while (q < min && sameJsonShape(keptBody.shapes[q], messages[q])) q++;
  }
  let Z = keptBody === undefined || q === 0 ? Buffer.byteLength(S) : (keptBody.ends[q - 1] ?? 0);
  let Se = L === undefined ? [] : Array.from(messages.slice(q), jsonShape);
  let list = Array.from(messages.slice(q), (lt, Je) => {
    let nt = L === undefined || hasNotCopiedMarker(Se[Je]) ? lt : Se[Je];
    return jsonStringifyRaw(nt) ?? "null";
  });
  let we =
    Z + list.reduce((acc, Je) => acc + 1 + Buffer.byteLength(Je), 0) + Buffer.byteLength(w) + WATERMARK_BITS;
  let memory = keptBody?.memory;
  if (memory === undefined || memory.length < we || memory.length > 2 * we) {
    memory = Buffer.allocUnsafeSlow(L === undefined ? we : we + (we >> 2));
    if (keptBody === undefined) memory.write(S, 0);
    else keptBody.memory.copy(memory, 0, 0, Z);
  }
  let Ae = keptBody === undefined ? [] : keptBody.ends.slice(0, q);
  let Ie = keptBody === undefined ? [] : keptBody.charEnds.slice(0, q);
  let keptChars = Ie.at(-1) ?? 0;
  let We = Z;
  let ze = Ie.at(-1) ?? S.length;
  for (let lt of list) {
    if (Ae.length > 0) {
      We += memory.write(",", We);
      ze++;
    }
    We += memory.write(lt, We);
    ze += lt.length;
    Ae.push(We);
    Ie.push(ze);
  }
  We += memory.write(w, We);
  if (L !== undefined)
    L.keptBody = {
      memory,
      opening: S,
      shapes: [...(keptBody === undefined ? [] : keptBody.shapes.slice(0, q)), ...Se],
      ends: Ae,
      charEnds: Ie,
      length: We,
      blockDigests: keptBody === undefined ? new Map() : keptBody.blockDigests,
      digestedBytes: keptBody === undefined ? 0 : Math.min(keptBody.digestedBytes, Z),
      inUse: true,
    };
  return {
    bytes: memory.subarray(0, We),
    chars: ze + w.length,
    keptChars,
  };
}
//@ chunk-e6aww6q8.js:2577540-2578848 placement
/**
 * 发送前校验增量请求体与完整序列化结果字节一致，不一致时回退并记录。
 */
function checkIncrementalRequestBody(streamRequestBody, n, r = systemClock) {
  let CLAUDE_CODE_INCREMENTAL_REQUEST_BODY = env.CLAUDE_CODE_INCREMENTAL_REQUEST_BODY ?? 0;
  let h =
    CLAUDE_CODE_INCREMENTAL_REQUEST_BODY !== 0 &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SOFT_KURZWEIL, true) === true
      ? CLAUDE_CODE_INCREMENTAL_REQUEST_BODY
      : 0;
  let y = streamFallbackWarning();
  let gzipRequestBody = y.gzipRequestBody;
  let w = h === 2 && getGzipRequestBodyBlocksMode() !== 0 && !gzipRequestBody.blocksSwitchedOff;
  if (!w && gzipRequestBody.blockStore.keptBody?.inUse === false)
    gzipRequestBody.blockStore.keptBody = undefined;
  if (h === 0) return;
  if (
    gzipRequestBody.bodyBytesSwitchedOff ||
    getAPIProvider() !== "firstParty" ||
    hasFinalAnswerRoute() ||
    streamRequestBody.output_format !== undefined
  )
    return;
  try {
    let { betas, user_profile_id: userProfileId, workspace_id: workspaceId, ...Z } = streamRequestBody;
    let Se = w && n;
    let ke = serializeRequestBodyIncrementally(Z, Se ? gzipRequestBody.blockStore : undefined);
    if (ke === undefined) return;
    if (Se && gzipRequestBody.blockStore.cancelIdleDrop === undefined)
      scheduleIdleDrop(gzipRequestBody.blockStore, r);
    let we = false;
    let Ee = gzipRequestBody.blockStore.keptBody?.memory.buffer === ke.bytes.buffer;
    let Ae = we || !Ee ? 1 : reuseCheckSampleRate();
    let Ie =
      ke.keptChars > 0 &&
      (gzipRequestBody.firstReusingBodiesDraw ??= randomSample()) < Ae &&
      gzipRequestBody.reusingBodiesChecked < MAX_REUSE_MISMATCH_REPORTS;
    let Me = we || Ie || Math.random() < REUSE_MISMATCH_SAMPLE * Ae;
    if (Ie) gzipRequestBody.reusingBodiesChecked++;
    if (Me && !bufferEqualsJson(ke.bytes, Z)) {
      switchOffBodyBytes();
      logFeatureBad("api_incremental_request_body", "wrong_bytes_caught_before_send", {
        mode: h,
      });
      logForDiagnosticsNoPII("error", "api_incremental_request_body_wrong_bytes_caught_before_send", {
        mode: h,
      });
      return;
    }
    if (y.once("incremental_request_body_ok"))
      logFeatureOk("api_incremental_request_body", {
        mode: h,
      });
    gzipRequestBody.serialisedBodies.set(ke.bytes.buffer, {
      chars: ke.chars,
      keptChars: ke.keptChars,
      checked: Me,
    });
    return ke.bytes;
  } catch (error) {
    logError(toError(error));
    switchOffBodyBytes();
    logFeatureSad("api_incremental_request_body", "serialising_threw", {
      mode: h,
    });
    logForDiagnosticsNoPII("warn", "api_incremental_request_body_serialising_threw", {
      mode: h,
    });
    return;
  }
}
//@ chunk-e6aww6q8.js:2578848-2578964 placement
function randomSample() {
  return (
    createHash("sha256").update(`${getSessionId()} ${process.hrtime.bigint()}`).digest().readUInt32BE(0) /
    4294967296
  );
}
//@ chunk-e6aww6q8.js:2578964-2579030 placement = resolveMotion (0.719)
function bufferEqualsJson(e, n) {
  return e.equals(Buffer.from(JSON.stringify(n)));
}
//@ chunk-e6aww6q8.js:2579030-2579127 placement
function switchOffBodyBytes() {
  let gzipRequestBody = streamFallbackWarning().gzipRequestBody;
  gzipRequestBody.bodyBytesSwitchedOff = true;
  gzipRequestBody.blockStore.keptBody = undefined;
}
//@ chunk-e6aww6q8.js:2579127-2579785 placement
async function reportIncrementalBodyMismatch(e, streamRequestBody, r) {
  let blockStore = streamFallbackWarning().gzipRequestBody.blockStore;
  let keptBody =
    e !== undefined && e.buffer === blockStore.keptBody?.memory.buffer ? blockStore.keptBody : undefined;
  try {
    return await r();
  } catch (error) {
    if (
      keptBody !== undefined &&
      error instanceof APIError &&
      error.status !== undefined &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 401 &&
      error.status !== 429
    )
      try {
        if (blockStore.keptBody === keptBody) blockStore.keptBody = undefined;
        let S = Buffer.byteLength(keptBody.opening) - 1;
        let chunk = keptBody.memory.subarray(S, (keptBody.ends.at(-1) ?? S + 1) + 1);
        if (
          sameJsonShape(keptBody.shapes, streamRequestBody.messages) &&
          !bufferEqualsJson(chunk, streamRequestBody.messages)
        ) {
          switchOffBodyBytes();
          logFeatureBad("api_incremental_request_body", "wrong_bytes_sent", {
            status: error.status,
          });
          logForDiagnosticsNoPII("error", "api_incremental_request_body_wrong_bytes_sent", {
            status: error.status,
          });
        }
      } catch (error) {
        logError(toError(error));
      }
    throw error;
  } finally {
    if (keptBody !== undefined) keptBody.inUse = false;
  }
}
export {
  takesRequestBodyBytes,
  checkIncrementalRequestBody,
  reportIncrementalBodyMismatch,
  markTakesRequestBodyBytes,
};

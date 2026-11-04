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
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2574793-2574841 placement
var TAKES_REQUEST_BODY_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:2574793", () => {
  TAKES_REQUEST_BODY_BYTES = Symbol("takes a request body as bytes");
});
//@ chunk-e6aww6q8.js:2574841-2574897 placement
/**
 * 导出函数 `markTakesRequestBodyBytes`：参数 e。
 */
function markTakesRequestBodyBytes(target) {
  Object.defineProperty(target, TAKES_REQUEST_BODY_BYTES, {
    value: true,
  });
}
//@ chunk-e6aww6q8.js:2574897-2574950 placement
/**
 * 导出函数 `takesRequestBodyBytes`：参数 e，返回 e === void 0 || e === fetchWithRequestBodyCompression || ycn in e。
 */
function takesRequestBodyBytes(target) {
  return (
    target === undefined || target === fetchWithRequestBodyCompression || TAKES_REQUEST_BODY_BYTES in target
  );
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
var NOT_COPIED; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:2575107", () => {
  NOT_COPIED = Symbol("not copied");
});
//@ chunk-e6aww6q8.js:2575136-2575203 placement
function isPlainObjectWithProto(value) {
  return Object.getPrototypeOf(value) === Object.prototype;
}
//@ chunk-e6aww6q8.js:2575203-2575362 placement
function jsonShape(value) {
  if (typeof value !== "object" || value === null) return value;
  if ("toJSON" in value) return NOT_COPIED;
  if (Array.isArray(value)) return value.map(jsonShape);
  return isPlainObjectWithProto(value) ? import_mapValues(value, (value) => jsonShape(value)) : NOT_COPIED;
}
//@ chunk-e6aww6q8.js:2575362-2575460 placement
function hasNotCopiedMarker(value) {
  if (typeof value !== "object" || value === null) return value === NOT_COPIED;
  return Object.values(value).some(hasNotCopiedMarker);
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
  for (let [key, value] of keys.entries())
    if (value !== keys_2[key] || !sameJsonShape(shapes[value], messages[value])) return false;
  return true;
}
//@ chunk-e6aww6q8.js:2575907-2576014 placement
function serializeKeys(source, keys) {
  return keys
    .flatMap((key) => {
      let raw = jsonStringifyRaw(source[key]);
      return raw === undefined ? [] : [`${jsonStringifyRaw(key)}:${raw}`];
    })
    .join(",");
}
//@ chunk-e6aww6q8.js:2576014-2577540 placement
/**
 * 增量序列化请求体：复用上次已序列化的消息前缀，只追加新消息。
 */
function serializeRequestBodyIncrementally(body, keptBodyState) {
  let messages = body.messages;
  if (
    !Array.isArray(messages) ||
    "toJSON" in body ||
    [...Object.values(body), ...messages].some(
      (value) => typeof value === "object" && value !== null && "toJSON" in value,
    )
  )
    return;
  let keys = Object.keys(body);
  let keysBeforeMessages = serializeKeys(body, keys.slice(0, keys.indexOf("messages")));
  let keysAfterMessages = serializeKeys(body, keys.slice(keys.indexOf("messages") + 1));
  let opening = `{${keysBeforeMessages}${keysBeforeMessages === "" ? "" : ","}"messages":[`;
  let closing = `]${keysAfterMessages === "" ? "" : ","}${keysAfterMessages}}`;
  let reusableState = keptBodyState?.keptBody?.inUse === true ? undefined : keptBodyState;
  let keptBody = reusableState?.keptBody?.opening === opening ? reusableState.keptBody : undefined;
  let sharedMessageCount = 0;
  if (keptBody !== undefined) {
    let min = Math.min(keptBody.shapes.length, messages.length);
    while (
      sharedMessageCount < min &&
      sameJsonShape(keptBody.shapes[sharedMessageCount], messages[sharedMessageCount])
    )
      sharedMessageCount++;
  }
  let startOffset =
    keptBody === undefined || sharedMessageCount === 0
      ? Buffer.byteLength(opening)
      : (keptBody.ends[sharedMessageCount - 1] ?? 0);
  let previousShapes =
    reusableState === undefined ? [] : Array.from(messages.slice(sharedMessageCount), jsonShape);
  let list = Array.from(messages.slice(sharedMessageCount), (message, messageIndex) => {
    let serializable =
      reusableState === undefined || hasNotCopiedMarker(previousShapes[messageIndex])
        ? message
        : previousShapes[messageIndex];
    return jsonStringifyRaw(serializable) ?? "null";
  });
  let bytesNeeded =
    startOffset +
    list.reduce((acc, json) => acc + 1 + Buffer.byteLength(json), 0) +
    Buffer.byteLength(closing) +
    WATERMARK_BITS;
  let memory = keptBody?.memory;
  if (memory === undefined || memory.length < bytesNeeded || memory.length > 2 * bytesNeeded) {
    memory = Buffer.allocUnsafeSlow(
      reusableState === undefined ? bytesNeeded : bytesNeeded + (bytesNeeded >> 2),
    );
    if (keptBody === undefined) memory.write(opening, 0);
    else keptBody.memory.copy(memory, 0, 0, startOffset);
  }
  let ends = keptBody === undefined ? [] : keptBody.ends.slice(0, sharedMessageCount);
  let charEnds = keptBody === undefined ? [] : keptBody.charEnds.slice(0, sharedMessageCount);
  let keptChars = charEnds.at(-1) ?? 0;
  let writeOffset = startOffset;
  let charCount = charEnds.at(-1) ?? opening.length;
  for (let json of list) {
    if (ends.length > 0) {
      writeOffset += memory.write(",", writeOffset);
      charCount++;
    }
    writeOffset += memory.write(json, writeOffset);
    charCount += json.length;
    ends.push(writeOffset);
    charEnds.push(charCount);
  }
  writeOffset += memory.write(closing, writeOffset);
  if (reusableState !== undefined)
    reusableState.keptBody = {
      memory,
      opening,
      shapes: [
        ...(keptBody === undefined ? [] : keptBody.shapes.slice(0, sharedMessageCount)),
        ...previousShapes,
      ],
      ends,
      charEnds,
      length: writeOffset,
      blockDigests: keptBody === undefined ? new Map() : keptBody.blockDigests,
      digestedBytes: keptBody === undefined ? 0 : Math.min(keptBody.digestedBytes, startOffset),
      inUse: true,
    };
  return {
    bytes: memory.subarray(0, writeOffset),
    chars: charCount + closing.length,
    keptChars,
  };
}
//@ chunk-e6aww6q8.js:2577540-2578848 placement
/**
 * 发送前校验增量请求体与完整序列化结果字节一致，不一致时回退并记录。
 */
function checkIncrementalRequestBody(streamRequestBody, useKeptBody, clock = systemClock) {
  let CLAUDE_CODE_INCREMENTAL_REQUEST_BODY = env.CLAUDE_CODE_INCREMENTAL_REQUEST_BODY ?? 0;
  let mode =
    CLAUDE_CODE_INCREMENTAL_REQUEST_BODY !== 0 &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SOFT_KURZWEIL, true) === true
      ? CLAUDE_CODE_INCREMENTAL_REQUEST_BODY
      : 0;
  let gzipState = streamFallbackWarning();
  let gzipRequestBody = gzipState.gzipRequestBody;
  let blocksModeOn = mode === 2 && getGzipRequestBodyBlocksMode() !== 0 && !gzipRequestBody.blocksSwitchedOff;
  if (!blocksModeOn && gzipRequestBody.blockStore.keptBody?.inUse === false)
    gzipRequestBody.blockStore.keptBody = undefined;
  if (mode === 0) return;
  if (
    gzipRequestBody.bodyBytesSwitchedOff ||
    getAPIProvider() !== "firstParty" ||
    hasFinalAnswerRoute() ||
    streamRequestBody.output_format !== undefined
  )
    return;
  try {
    let {
      betas,
      user_profile_id: userProfileId,
      workspace_id: workspaceId,
      ...bodyForSerialization
    } = streamRequestBody;
    let keepBodyState = blocksModeOn && useKeptBody;
    let serialised = serializeRequestBodyIncrementally(
      bodyForSerialization,
      keepBodyState ? gzipRequestBody.blockStore : undefined,
    );
    if (serialised === undefined) return;
    if (keepBodyState && gzipRequestBody.blockStore.cancelIdleDrop === undefined)
      scheduleIdleDrop(gzipRequestBody.blockStore, clock);
    let forceCheck = false;
    let reusedBuffer = gzipRequestBody.blockStore.keptBody?.memory.buffer === serialised.bytes.buffer;
    let sampleRate = forceCheck || !reusedBuffer ? 1 : reuseCheckSampleRate();
    let checkReuse =
      serialised.keptChars > 0 &&
      (gzipRequestBody.firstReusingBodiesDraw ??= randomSample()) < sampleRate &&
      gzipRequestBody.reusingBodiesChecked < MAX_REUSE_MISMATCH_REPORTS;
    let checkBytes = forceCheck || checkReuse || Math.random() < REUSE_MISMATCH_SAMPLE * sampleRate;
    if (checkReuse) gzipRequestBody.reusingBodiesChecked++;
    if (checkBytes && !bufferEqualsJson(serialised.bytes, bodyForSerialization)) {
      switchOffBodyBytes();
      logFeatureBad("api_incremental_request_body", "wrong_bytes_caught_before_send", {
        mode,
      });
      logForDiagnosticsNoPII("error", "api_incremental_request_body_wrong_bytes_caught_before_send", {
        mode,
      });
      return;
    }
    if (gzipState.once("incremental_request_body_ok"))
      logFeatureOk("api_incremental_request_body", {
        mode,
      });
    gzipRequestBody.serialisedBodies.set(serialised.bytes.buffer, {
      chars: serialised.chars,
      keptChars: serialised.keptChars,
      checked: checkBytes,
    });
    return serialised.bytes;
  } catch (error) {
    logError(toError(error));
    switchOffBodyBytes();
    logFeatureSad("api_incremental_request_body", "serialising_threw", {
      mode,
    });
    logForDiagnosticsNoPII("warn", "api_incremental_request_body_serialising_threw", {
      mode,
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
//@ chunk-e6aww6q8.js:2578964-2579030 placement (2.1.88 match: resolveMotion, 0.719)
function bufferEqualsJson(buffer, other) {
  return buffer.equals(Buffer.from(JSON.stringify(other)));
}
//@ chunk-e6aww6q8.js:2579030-2579127 placement
function switchOffBodyBytes() {
  let gzipRequestBody = streamFallbackWarning().gzipRequestBody;
  gzipRequestBody.bodyBytesSwitchedOff = true;
  gzipRequestBody.blockStore.keptBody = undefined;
}
//@ chunk-e6aww6q8.js:2579127-2579785 placement
async function reportIncrementalBodyMismatch(plan, streamRequestBody, send) {
  let blockStore = streamFallbackWarning().gzipRequestBody.blockStore;
  let keptBody =
    plan !== undefined && plan.buffer === blockStore.keptBody?.memory.buffer
      ? blockStore.keptBody
      : undefined;
  try {
    return await send();
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
        let openingLength = Buffer.byteLength(keptBody.opening) - 1;
        let buffer = keptBody.memory.subarray(openingLength, (keptBody.ends.at(-1) ?? openingLength + 1) + 1);
        if (
          sameJsonShape(keptBody.shapes, streamRequestBody.messages) &&
          !bufferEqualsJson(buffer, streamRequestBody.messages)
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

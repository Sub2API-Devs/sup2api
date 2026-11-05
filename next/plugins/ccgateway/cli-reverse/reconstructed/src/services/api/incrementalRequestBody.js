/**
 * services/api/incrementalRequestBody.ts
 *
 * 2.1.316 新增：增量序列化请求体并在发送前校验字节一致
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (18)
 * attribution: placement 17, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash } from "crypto";
import {
  fetchWithRequestBodyCompression,
  getGzipRequestBodyBlocksMode,
  hasFinalAnswerRoute,
  scheduleIdleDrop,
  findKeptBody,
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
import { classifyQuerySource } from "./requestHeaders.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { getSessionId } from "../../bootstrap/state.js";
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2627101-2627149 placement
var TAKES_REQUEST_BODY_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:2627101", () => {
  TAKES_REQUEST_BODY_BYTES = Symbol("takes a request body as bytes");
});
//@ chunk-5xgkngpb.js:2627149-2627205 placement
/**
 * 导出函数 `markTakesRequestBodyBytes`：参数 e。
 */
function markTakesRequestBodyBytes(target) {
  Object.defineProperty(target, TAKES_REQUEST_BODY_BYTES, {
    value: true,
  });
}
//@ chunk-5xgkngpb.js:2627205-2627258 placement
/**
 * 导出函数 `takesRequestBodyBytes`：参数 e，返回 e === void 0 || e === fetchWithRequestBodyCompression || ycn in e。
 */
function takesRequestBodyBytes(target) {
  return (
    target === undefined || target === fetchWithRequestBodyCompression || TAKES_REQUEST_BODY_BYTES in target
  );
}
//@ chunk-5xgkngpb.js:2627296-2627382 placement
var TENGU_SOFT_KURZWEIL = "tengu_soft_kurzweil";
var TENGU_VAST_FROST = "tengu_vast_frost";
var MAX_KEPT_SUBAGENT_BODIES = 8;
var MAX_KEPT_SUBAGENT_BYTES = 16777216;
var BYTES_PER_TOKEN_ESTIMATE_2 = 3;
var REUSE_MISMATCH_SAMPLE = 0.1;
//@ chunk-5xgkngpb.js:2627382-2627457 placement
function reuseCheckSampleRate() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PLAID_KETTLE, 1);
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
    featureValue_CACHED_MAY_BE_STALE >= 0.1 &&
    featureValue_CACHED_MAY_BE_STALE <= 1
    ? featureValue_CACHED_MAY_BE_STALE
    : 1;
}
//@ chunk-5xgkngpb.js:2627457-2627486 placement
var NOT_COPIED; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:2627457", () => {
  NOT_COPIED = Symbol("not copied");
});
//@ chunk-5xgkngpb.js:2627486-2627553 placement
function isPlainObjectWithProto(value) {
  return Object.getPrototypeOf(value) === Object.prototype;
}
//@ chunk-5xgkngpb.js:2627553-2627712 placement
function jsonShape(value) {
  if (typeof value !== "object" || value === null) return value;
  if ("toJSON" in value) return NOT_COPIED;
  if (Array.isArray(value)) return value.map(jsonShape);
  return isPlainObjectWithProto(value) ? import_mapValues(value, (value) => jsonShape(value)) : NOT_COPIED;
}
//@ chunk-5xgkngpb.js:2627712-2627810 placement
function hasNotCopiedMarker(value) {
  if (typeof value !== "object" || value === null) return value === NOT_COPIED;
  return Object.values(value).some(hasNotCopiedMarker);
}
//@ chunk-5xgkngpb.js:2627810-2628257 placement
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
//@ chunk-5xgkngpb.js:2628257-2628364 placement
function serializeKeys(source, keys) {
  return keys
    .flatMap((key) => {
      let raw = jsonStringifyRaw(source[key]);
      return raw === undefined ? [] : [`${jsonStringifyRaw(key)}:${raw}`];
    })
    .join(",");
}
//@ chunk-5xgkngpb.js:2628364-2629895 placement
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
//@ chunk-5xgkngpb.js:2629895-2632073 placement
/**
 * 发送前校验增量请求体与完整序列化结果字节一致，不一致时回退并记录。
 */
function checkIncrementalRequestBody(streamRequestBody, options, clock = systemClock) {
  let CLAUDE_CODE_INCREMENTAL_REQUEST_BODY = env.CLAUDE_CODE_INCREMENTAL_REQUEST_BODY ?? 0;
  let mode =
    CLAUDE_CODE_INCREMENTAL_REQUEST_BODY !== 0 &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SOFT_KURZWEIL, true) === true
      ? CLAUDE_CODE_INCREMENTAL_REQUEST_BODY
      : 0;
  let gzipState = streamFallbackWarning();
  let gzipRequestBody = gzipState.gzipRequestBody;
  let blockStore = gzipRequestBody.blockStore;
  let blocksActive = mode === 2 && getGzipRequestBodyBlocksMode() !== 0 && !gzipRequestBody.blocksSwitchedOff;
  if (!blocksActive && blockStore.keptBody?.inUse === false) blockStore.keptBody = undefined;
  let subagentBudgetSetting = blocksActive ? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VAST_FROST, 0) : 0;
  let subagentBodyLimit =
    typeof subagentBudgetSetting === "number" &&
    Number.isInteger(subagentBudgetSetting) &&
    subagentBudgetSetting > 0
      ? Math.min(subagentBudgetSetting, MAX_KEPT_SUBAGENT_BODIES)
      : 0;
  if (subagentBodyLimit === 0) blockStore.keptSubagentBodies.clear();
  if (mode === 0) return;
  if (
    gzipRequestBody.bodyBytesSwitchedOff ||
    getAPIProvider() !== "firstParty" ||
    hasFinalAnswerRoute() ||
    streamRequestBody.output_format !== undefined
  )
    return;
  let querySource = classifyQuerySource(options.querySource);
  let agentId =
    subagentBodyLimit > 0 && querySource === "subagent" && options.querySource !== "hook_agent"
      ? options.agentId
      : undefined;
  let keepsSubagentBody = agentId !== undefined;
  try {
    let { betas, user_profile_id: userProfileId, workspace_id: workspaceId, ...body } = streamRequestBody;
    let subagentState =
      agentId === undefined
        ? undefined
        : (blockStore.keptSubagentBodies.get(agentId) ?? {
            keptBody: undefined,
            reusingBodiesChecked: 0,
          });
    let keptBodyState =
      subagentState ??
      (blocksActive && querySource === "main" && options.agentId === undefined ? blockStore : undefined);
    let serialised = serializeRequestBodyIncrementally(body, keptBodyState);
    if (serialised === undefined) return;
    if (subagentState !== undefined && agentId !== undefined) {
      blockStore.keptSubagentBodies.delete(agentId);
      if ((subagentState.keptBody?.memory.length ?? 0) <= MAX_KEPT_SUBAGENT_BYTES)
        blockStore.keptSubagentBodies.set(agentId, subagentState);
      let totalSubagentBytes = 0;
      for (let { keptBody } of blockStore.keptSubagentBodies.values())
        totalSubagentBytes += keptBody?.memory.length ?? 0;
      for (let [subagentId, { keptBody: subagentBody }] of blockStore.keptSubagentBodies) {
        if (
          blockStore.keptSubagentBodies.size <= subagentBodyLimit &&
          totalSubagentBytes <= MAX_KEPT_SUBAGENT_BYTES
        )
          break;
        blockStore.keptSubagentBodies.delete(subagentId);
        totalSubagentBytes -= subagentBody?.memory.length ?? 0;
      }
    }
    if (keptBodyState !== undefined && blockStore.cancelIdleDrop === undefined)
      scheduleIdleDrop(blockStore, clock);
    let forceCheck = false;
    let reusedBuffer = blockStore.keptBody?.memory.buffer === serialised.bytes.buffer;
    let sampleRate = forceCheck || !reusedBuffer ? 1 : reuseCheckSampleRate();
    let reuseTelemetry = subagentState ?? gzipRequestBody;
    let drawsReuseCheck =
      serialised.keptChars > 0 &&
      (subagentState !== undefined ||
        (gzipRequestBody.firstReusingBodiesDraw ??= randomSample()) < sampleRate) &&
      reuseTelemetry.reusingBodiesChecked < BYTES_PER_TOKEN_ESTIMATE_2;
    let checkBytes =
      forceCheck ||
      drawsReuseCheck ||
      (serialised.keptChars > 0 && findKeptBody(blockStore, serialised.bytes) === undefined) ||
      Math.random() < REUSE_MISMATCH_SAMPLE * sampleRate;
    if (drawsReuseCheck) reuseTelemetry.reusingBodiesChecked++;
    if (checkBytes && !bufferEqualsJson(serialised.bytes, body)) {
      switchOffBodyBytes();
      logFeatureBad("api_incremental_request_body", "wrong_bytes_caught_before_send", {
        mode,
        ...(keepsSubagentBody && {
          keptForSubagent: keepsSubagentBody,
        }),
      });
      logForDiagnosticsNoPII("error", "api_incremental_request_body_wrong_bytes_caught_before_send", {
        mode,
        kept_for_subagent: keepsSubagentBody,
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
      ...(keepsSubagentBody && {
        keptForSubagent: keepsSubagentBody,
      }),
    });
    logForDiagnosticsNoPII("warn", "api_incremental_request_body_serialising_threw", {
      mode,
      kept_for_subagent: keepsSubagentBody,
    });
    return;
  }
}
//@ chunk-5xgkngpb.js:2632073-2632150 layout
function clearKeptSubagentBodies(agentId) {
  streamFallbackWarning().gzipRequestBody.blockStore.keptSubagentBodies.delete(agentId);
}
//@ chunk-5xgkngpb.js:2632150-2632266 placement
function randomSample() {
  return (
    createHash("sha256").update(`${getSessionId()} ${process.hrtime.bigint()}`).digest().readUInt32BE(0) /
    4294967296
  );
}
//@ chunk-5xgkngpb.js:2632266-2632332 placement (2.1.88 match: resolveMotion, 0.719)
function bufferEqualsJson(buffer, other) {
  return buffer.equals(Buffer.from(JSON.stringify(other)));
}
//@ chunk-5xgkngpb.js:2632332-2632469 placement
function switchOffBodyBytes() {
  let gzipRequestBody = streamFallbackWarning().gzipRequestBody;
  gzipRequestBody.bodyBytesSwitchedOff = true;
  gzipRequestBody.blockStore.keptBody = undefined;
  gzipRequestBody.blockStore.keptSubagentBodies.clear();
}
//@ chunk-5xgkngpb.js:2632469-2633249 placement
async function reportIncrementalBodyMismatch(incrementalBody, streamRequestBody, send) {
  let blockStore = streamFallbackWarning().gzipRequestBody.blockStore;
  let keptBody = incrementalBody === undefined ? undefined : findKeptBody(blockStore, incrementalBody);
  let keptForSubagent = keptBody !== undefined && keptBody !== blockStore.keptBody;
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
        for (let [agentId, { keptBody: subagentBody }] of blockStore.keptSubagentBodies)
          if (subagentBody === keptBody) blockStore.keptSubagentBodies.delete(agentId);
        let openingEnd = Buffer.byteLength(keptBody.opening) - 1;
        let buffer = keptBody.memory.subarray(openingEnd, (keptBody.ends.at(-1) ?? openingEnd + 1) + 1);
        if (
          sameJsonShape(keptBody.shapes, streamRequestBody.messages) &&
          !bufferEqualsJson(buffer, streamRequestBody.messages)
        ) {
          switchOffBodyBytes();
          logFeatureBad("api_incremental_request_body", "wrong_bytes_sent", {
            status: error.status,
            ...(keptForSubagent && {
              keptForSubagent,
            }),
          });
          logForDiagnosticsNoPII("error", "api_incremental_request_body_wrong_bytes_sent", {
            status: error.status,
            kept_for_subagent: keptForSubagent,
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
  clearKeptSubagentBodies,
};

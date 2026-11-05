/**
 * utils/task/shellOutputPersist.ts
 *
 * 2.1.316 新增：shell 输出持久化
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { realpath } from "fs/promises";
import {
  SOURCENOTREGULAR,
  SOURCESHARED,
  SOURCEOUTSIDE,
  formatStorageError,
} from "../storage/storageErrors.js";
import { openVerifiedTaskOutput, unlinkTaskOutput } from "./diskOutput.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  errorMessage,
} from "../errors.js";
import { telemetrySafeModelName } from "../model/telemetryModelName.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3185307-3185346 placement
var PERSIST_RETRYABLE_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3185307", () => {
  PERSIST_RETRYABLE_ERRNOS = new Set(["ELOOP", SOURCENOTREGULAR, SOURCESHARED, SOURCEOUTSIDE]);
});
//@ chunk-5xgkngpb.js:3185346-3185431 placement
function storageTelemetryCode(error) {
  return error.code === "Failed" && "telemetryCode" in error ? error.telemetryCode : undefined;
}
//@ chunk-5xgkngpb.js:3185431-3186323 placement
/**
 * 持久化后台 shell 输出文件。
 */
async function persistShellOutput(taskId, requestId, outputFilePath, maxBytes, taskOutputRootDir) {
  let { handle, size } = await openVerifiedTaskOutput(outputFilePath, maxBytes);
  await handle.close();
  let realRoot = await realpath(taskOutputRootDir).catch(() => {
    return;
  });
  if (realRoot === undefined) {
    logForDebugging(
      `Shell output ${outputFilePath}: its temp root could not be resolved; persisting it as today`,
    );
    return "today";
  }
  let result = await taskId.writeFromFile(requestId, outputFilePath, {
    mode: 438 & ~process.umask(),
    copy: true,
    growth: "prefix",
    expect: {
      within: realRoot,
      singleName: true,
      maxBytes,
    },
  });
  if (!result.ok) {
    let error = storageTelemetryCode(result.error);
    if (error !== undefined && PERSIST_RETRYABLE_ERRNOS.has(error)) {
      let size = `shell output moved or replaced before it could be stored (${error}): ${outputFilePath}`;
      logForDebugging(size, {
        level: "error",
      });
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          size,
          "shell output moved or replaced before it could be stored",
        ),
      );
      return;
    }
    logForDebugging(
      `Shell output ${outputFilePath} not taken by the storage interface (${formatStorageError(result.error)}); persisting it as today`,
    );
    return "today";
  }
  let { bytes, grew, capped } = result.value;
  logForDebugging(
    `Stored shell output ${outputFilePath} through the storage interface (copied, ${bytes} bytes${capped ? ", capped" : ""}${grew ? ", grew while copied" : ""})`,
  );
  return size;
}
//@ chunk-5xgkngpb.js:3186323-3186334 placement
/**
 * 阻塞式 sleep 检测时保留的首尾行数（25）。
 */
var MAX_BLOCKED_SLEEP_LINES = 25;
//@ chunk-5xgkngpb.js:3186334-3186512 placement
/**
 * 去掉文本首尾的空白行。
 */
function trimBlankEdgeLines(text) {
  let lines = text.split(`
`);
  let first = 0;
  while (first < lines.length && lines[first]?.trim() === "") first++;
  let last = lines.length - 1;
  while (last >= 0 && lines[last]?.trim() === "") last--;
  if (first > last) return "";
  return lines.slice(first, last + 1).join(`
`);
}
//@ chunk-5xgkngpb.js:3186512-3186580 placement
/**
 * 是否 base64 图片 data URI。
 */
function isBase64DataUri(uri) {
  return /^data:image\/[a-z0-9.+_-]+;base64,/i.test(uri);
}
//@ chunk-5xgkngpb.js:3186580-3186617 placement
var DATA_URI_RE = /^data:([^;]+);base64,(.+)$/;
//@ chunk-5xgkngpb.js:3186617-3186724 placement
/**
 * 解析 data URI，取出媒体类型与数据（不匹配返回 null）。
 */
function parseDataUri(source) {
  let match = source.trim().match(DATA_URI_RE);
  if (!match || !match[1] || !match[2]) return null;
  return {
    mediaType: match[1],
    data: match[2],
  };
}
//@ chunk-5xgkngpb.js:3191111-3191161 placement
/**
 * 取（已脱敏的）请求模型名。
 */
function safeRequestedModelName(parentMessage, fallbackModel) {
  return telemetrySafeModelName(parentMessage?.requestedModel ?? fallbackModel);
}
//@ chunk-5xgkngpb.js:3191161-3191771 placement
function copyShellOutputFile(taskRegistry) {
  let pendingCopy;
  return {
    track(request) {
      let outputTaskId = request.outputTaskId;
      let taskExists = outputTaskId !== undefined && taskRegistry.get(outputTaskId) !== undefined;
      if (request.backgroundTaskId === undefined && (request.outputFileSize ?? 0) > 0 && !taskExists)
        pendingCopy = request.outputFilePath;
    },
    copyFailed(error, previousError) {
      let effectiveError =
        getErrnoCode(error) === "ENOENT" && previousError !== undefined ? previousError : error;
      let errnoCode = getErrnoCode(effectiveError);
      let diskFull = errnoCode === "ENOSPC" || errnoCode === "EDQUOT";
      if (effectiveError !== undefined && pendingCopy !== undefined)
        logForDebugging(
          `Could not copy ${pendingCopy} to the session's tool-results folder (${errorMessage(effectiveError)}). ${diskFull ? "Deleting it because the disk or quota is full." : "Keeping it."}`,
        );
      if (!diskFull) pendingCopy = undefined;
    },
    async [Symbol.asyncDispose]() {
      if (pendingCopy === undefined) return;
      try {
        await unlinkTaskOutput(pendingCopy);
      } catch (error) {
        if (getErrnoCode(error) !== "ENOENT")
          logForDebugging(`Could not delete the output file ${pendingCopy}: ${errorMessage(error)}`, {
            level: "error",
          });
      }
    },
  };
}
export {
  persistShellOutput,
  MAX_BLOCKED_SLEEP_LINES,
  safeRequestedModelName,
  copyShellOutputFile,
  isBase64DataUri,
  trimBlankEdgeLines,
  parseDataUri,
};

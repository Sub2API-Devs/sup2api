/**
 * utils/task/shellOutputPersist.ts
 *
 * 2.1.316 新增：shell 输出持久化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
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

//@ chunk-e6aww6q8.js:3098919-3098958 placement
var PERSIST_RETRYABLE_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3098919", () => {
  PERSIST_RETRYABLE_ERRNOS = new Set(["ELOOP", SOURCENOTREGULAR, SOURCESHARED, SOURCEOUTSIDE]);
});
//@ chunk-e6aww6q8.js:3098958-3099043 placement
function storageTelemetryCode(error) {
  return error.code === "Failed" && "telemetryCode" in error ? error.telemetryCode : undefined;
}
//@ chunk-e6aww6q8.js:3099043-3099933 placement
/**
 * 持久化后台 shell 输出文件。
 */
async function persistShellOutput(taskId, requestId, path, maxBytes, taskOutputRootDir) {
  let { handle, size } = await openVerifiedTaskOutput(path, maxBytes);
  await handle.close();
  let realRoot = await realpath(taskOutputRootDir).catch(() => {
    return;
  });
  if (realRoot === undefined) {
    logForDebugging(`Shell output ${path}: its temp root could not be resolved; persisting it as today`);
    return "today";
  }
  let result = await taskId.writeFromFile(requestId, path, {
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
      let size = `shell output moved or replaced before it could be stored (${error}): ${path}`;
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
      `Shell output ${path} not taken by the storage interface (${formatStorageError(result.error)}); persisting it as today`,
    );
    return "today";
  }
  let { bytes, grew, capped } = result.value;
  logForDebugging(
    `Stored shell output ${path} through the storage interface (copied, ${bytes} bytes${capped ? ", capped" : ""}${grew ? ", grew while copied" : ""})`,
  );
  return size;
}
//@ chunk-e6aww6q8.js:3099933-3099944 placement
/**
 * 阻塞式 sleep 检测时保留的首尾行数（25）。
 */
var MAX_BLOCKED_SLEEP_LINES = 25;
//@ chunk-e6aww6q8.js:3099944-3100122 placement
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
//@ chunk-e6aww6q8.js:3100122-3100190 placement
/**
 * 是否 base64 图片 data URI。
 */
function isBase64DataUri(uri) {
  return /^data:image\/[a-z0-9.+_-]+;base64,/i.test(uri);
}
//@ chunk-e6aww6q8.js:3100190-3100227 placement
var DATA_URI_RE = /^data:([^;]+);base64,(.+)$/;
//@ chunk-e6aww6q8.js:3100227-3100334 placement
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
//@ chunk-e6aww6q8.js:3104591-3104641 placement
/**
 * 取（已脱敏的）请求模型名。
 */
function safeRequestedModelName(parentMessage, fallbackModel) {
  return telemetrySafeModelName(parentMessage?.requestedModel ?? fallbackModel);
}
//@ chunk-e6aww6q8.js:3104641-3105251 placement
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
  MAX_BLOCKED_SLEEP_LINES,
  safeRequestedModelName,
  copyShellOutputFile,
  trimBlankEdgeLines,
  persistShellOutput,
  isBase64DataUri,
  parseDataUri,
};

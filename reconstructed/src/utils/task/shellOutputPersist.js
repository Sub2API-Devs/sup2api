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

//@ chunk-e6aww6q8.js:3098919-3098958 placement
var PERSIST_RETRYABLE_ERRNOS = new Set(["ELOOP", SOURCENOTREGULAR, SOURCESHARED, SOURCEOUTSIDE]);
//@ chunk-e6aww6q8.js:3098958-3099043 placement
function storageTelemetryCode(error) {
  return error.code === "Failed" && "telemetryCode" in error ? error.telemetryCode : undefined;
}
//@ chunk-e6aww6q8.js:3099043-3099933 placement
/**
 * 持久化后台 shell 输出文件。
 */
async function persistShellOutput(e, n, outputFilePath, s, taskOutputRootDir) {
  let { handle, size } = await openVerifiedTaskOutput(outputFilePath, s);
  await handle.close();
  let w = await realpath(taskOutputRootDir).catch(() => {
    return;
  });
  if (w === undefined) {
    logForDebugging(
      `Shell output ${outputFilePath}: its temp root could not be resolved; persisting it as today`,
    );
    return "today";
  }
  let L = await e.writeFromFile(n, outputFilePath, {
    mode: 438 & ~process.umask(),
    copy: true,
    growth: "prefix",
    expect: {
      within: w,
      singleName: true,
      maxBytes: s,
    },
  });
  if (!L.ok) {
    let Se = storageTelemetryCode(L.error);
    if (Se !== undefined && PERSIST_RETRYABLE_ERRNOS.has(Se)) {
      let ke = `shell output moved or replaced before it could be stored (${Se}): ${outputFilePath}`;
      logForDebugging(ke, {
        level: "error",
      });
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          ke,
          "shell output moved or replaced before it could be stored",
        ),
      );
      return;
    }
    logForDebugging(
      `Shell output ${outputFilePath} not taken by the storage interface (${formatStorageError(L.error)}); persisting it as today`,
    );
    return "today";
  }
  let { bytes, grew, capped } = L.value;
  logForDebugging(
    `Stored shell output ${outputFilePath} through the storage interface (copied, ${bytes} bytes${capped ? ", capped" : ""}${grew ? ", grew while copied" : ""})`,
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
function trimBlankEdgeLines(e) {
  let lines = e.split(`
`);
  let r = 0;
  while (r < lines.length && lines[r]?.trim() === "") r++;
  let s = lines.length - 1;
  while (s >= 0 && lines[s]?.trim() === "") s--;
  if (r > s) return "";
  return lines.slice(r, s + 1).join(`
`);
}
//@ chunk-e6aww6q8.js:3100122-3100190 placement
/**
 * 是否 base64 图片 data URI。
 */
function isBase64DataUri(e) {
  return /^data:image\/[a-z0-9.+_-]+;base64,/i.test(e);
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
function safeRequestedModelName(parentMessage, n) {
  return telemetrySafeModelName(parentMessage?.requestedModel ?? n);
}
//@ chunk-e6aww6q8.js:3104641-3105251 placement
function copyShellOutputFile(taskRegistry) {
  let n;
  return {
    track(r) {
      let outputTaskId = r.outputTaskId;
      let h = outputTaskId !== undefined && taskRegistry.get(outputTaskId) !== undefined;
      if (r.backgroundTaskId === undefined && (r.outputFileSize ?? 0) > 0 && !h) n = r.outputFilePath;
    },
    copyFailed(r, s) {
      let h = getErrnoCode(r) === "ENOENT" && s !== undefined ? s : r;
      let errnoCode = getErrnoCode(h);
      let S = errnoCode === "ENOSPC" || errnoCode === "EDQUOT";
      if (h !== undefined && n !== undefined)
        logForDebugging(
          `Could not copy ${n} to the session's tool-results folder (${errorMessage(h)}). ${S ? "Deleting it because the disk or quota is full." : "Keeping it."}`,
        );
      if (!S) n = undefined;
    },
    async [Symbol.asyncDispose]() {
      if (n === undefined) return;
      try {
        await unlinkTaskOutput(n);
      } catch (error) {
        if (getErrnoCode(error) !== "ENOENT")
          logForDebugging(`Could not delete the output file ${n}: ${errorMessage(error)}`, {
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

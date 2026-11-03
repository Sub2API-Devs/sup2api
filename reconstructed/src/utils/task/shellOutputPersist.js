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
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
} from "fs/promises";
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
var uRr = new Set(["ELOOP", SOURCENOTREGULAR, SOURCESHARED, SOURCEOUTSIDE]);
//@ chunk-e6aww6q8.js:3098958-3099043 placement
function cRr(e) {
  return e.code === "Failed" && "telemetryCode" in e ? e.telemetryCode : void 0;
}
/**
 * 持久化后台 shell 输出文件。
 */
//@ chunk-e6aww6q8.js:3099043-3099933 placement
async function persistShellOutput(e, n, r, s, h) {
  let { handle: handle, size: size } = await openVerifiedTaskOutput(r, s);
  await handle.close();
  let w = await realpath_26(h).catch(() => {
    return;
  });
  if (w === void 0)
    return (
      logForDebugging(`Shell output ${r}: its temp root could not be resolved; persisting it as today`),
      "today"
    );
  let writeFromFile = await e.writeFromFile(n, r, {
    mode: 438 & ~process.umask(),
    copy: !0,
    growth: "prefix",
    expect: { within: w, singleName: !0, maxBytes: s },
  });
  if (!writeFromFile.ok) {
    let Se = cRr(writeFromFile.error);
    if (Se !== void 0 && uRr.has(Se)) {
      let ke = `shell output moved or replaced before it could be stored (${Se}): ${r}`;
      (logForDebugging(ke, { level: "error" }),
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            ke,
            "shell output moved or replaced before it could be stored",
          ),
        ));
      return;
    }
    return (
      logForDebugging(
        `Shell output ${r} not taken by the storage interface (${formatStorageError(writeFromFile.error)}); persisting it as today`,
      ),
      "today"
    );
  }
  let { bytes: bytes, grew: grew, capped: capped } = writeFromFile.value;
  return (
    logForDebugging(
      `Stored shell output ${r} through the storage interface (copied, ${bytes} bytes${capped ? ", capped" : ""}${grew ? ", grew while copied" : ""})`,
    ),
    size
  );
}
//@ chunk-e6aww6q8.js:3099933-3099944 placement
var kWr = 25;
/**
 * 去掉文本首尾的空白行。
 */
//@ chunk-e6aww6q8.js:3099944-3100122 placement
function trimBlankEdgeLines(e) {
  let parts = e.split(`
`),
    r = 0;
  while (r < parts.length && parts[r]?.trim() === "") r++;
  let s = parts.length - 1;
  while (s >= 0 && parts[s]?.trim() === "") s--;
  if (r > s) return "";
  return parts.slice(r, s + 1).join(`
`);
}
//@ chunk-e6aww6q8.js:3100122-3100190 placement
function ywt(e) {
  return /^data:image\/[a-z0-9.+_-]+;base64,/i.test(e);
}
//@ chunk-e6aww6q8.js:3100190-3100227 placement
var fRr = /^data:([^;]+);base64,(.+)$/;
/**
 * 解析 data URI，取出媒体类型与数据（不匹配返回 null）。
 */
//@ chunk-e6aww6q8.js:3100227-3100334 placement
function parseDataUri(e) {
  let match = e.trim().match(fRr);
  if (!match || !match[1] || !match[2]) return null;
  return { mediaType: match[1], data: match[2] };
}
//@ chunk-e6aww6q8.js:3104591-3104641 placement
function HWr(e, n) {
  return telemetrySafeModelName(e?.requestedModel ?? n);
}
//@ chunk-e6aww6q8.js:3104641-3105251 placement
function copyShellOutputFile(e) {
  let n;
  return {
    track(r) {
      let outputTaskId = r.outputTaskId,
        h = outputTaskId !== void 0 && e.get(outputTaskId) !== void 0;
      if (r.backgroundTaskId === void 0 && (r.outputFileSize ?? 0) > 0 && !h) n = r.outputFilePath;
    },
    copyFailed(r, s) {
      let h = getErrnoCode(r) === "ENOENT" && s !== void 0 ? s : r,
        y = getErrnoCode(h),
        S = y === "ENOSPC" || y === "EDQUOT";
      if (h !== void 0 && n !== void 0)
        logForDebugging(
          `Could not copy ${n} to the session's tool-results folder (${errorMessage(h)}). ${S ? "Deleting it because the disk or quota is full." : "Keeping it."}`,
        );
      if (!S) n = void 0;
    },
    async [Symbol.asyncDispose]() {
      if (n === void 0) return;
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

export { kWr, HWr, copyShellOutputFile, trimBlankEdgeLines, persistShellOutput, ywt, parseDataUri };

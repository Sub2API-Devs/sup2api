/**
 * utils/backgroundSessionResume.ts
 *
 * 2.1.316 新增：后台会话恢复
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-63641kq7.js (16)
 * attribution: placement 16
 */
import { open } from "fs/promises";
import { constants } from "fs";
import { safeIdentifierOrUndefined } from "./safeIdentifier.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { getErrnoCode, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { looseObject, literal, stringSchema, booleanSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { validateUuid } from "./sessionStoragePortable.js";
import { isPlainObject } from "./isPlainObject.js";
import { renderPluginPrompt } from "./messages/pluginPrompts.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-63641kq7.js:639-973 placement
/**
 * 把文本流按行切分逐行产出；流不是文本时抛 TypeError。
 */
async function* transcriptLines(readStream) {
  let carry = [];
  for await (let chunk of readStream) {
    if (typeof chunk !== "string")
      throw TypeError("transcriptLines takes text: open the stream with an encoding");
    let lineStart = 0;
    for (
      let index = chunk.indexOf(`
`);
      index !== -1;
      index = chunk.indexOf(
        `
`,
        lineStart,
      )
    ) {
      carry.push(chunk.slice(lineStart, index));
      yield stripTrailingCR(carry.join(""));
      carry = [];
      lineStart = index + 1;
    }
    if (lineStart < chunk.length) carry.push(chunk.slice(lineStart));
  }
  if (carry.length > 0) yield stripTrailingCR(carry.join(""));
}
//@ chunk-63641kq7.js:973-1027 placement
/**
 * 去掉行尾的 \r（CRLF 兼容）。
 */
function stripTrailingCR(line) {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}
//@ chunk-63641kq7.js:1027-1352 placement
/**
 * 规范化任务通知来源对象，只保留存在的字段。
 */
function normalizeTaskNotificationOrigin(origin) {
  if (origin?.kind !== "task-notification") return origin;
  let runId = safeIdentifierOrUndefined(origin.runId);
  return {
    kind: "task-notification",
    ...(origin.subkind !== undefined && {
      subkind: origin.subkind,
    }),
    ...(origin.fireReason !== undefined && {
      fireReason: origin.fireReason,
    }),
    ...(origin.producer !== undefined && {
      producer: origin.producer,
    }),
    ...(runId !== undefined && {
      runId,
    }),
    ...(origin.taskKind === "mcp-task" && {
      taskKind: origin.taskKind,
    }),
  };
}
//@ chunk-63641kq7.js:1352-1537 placement = processQueuedCommands (0.75)
function resolveTaskNotificationOrigin(origin, commandMode, runId) {
  let normalized =
    normalizeTaskNotificationOrigin(origin) ??
    (commandMode === "task-notification"
      ? {
          kind: "task-notification",
        }
      : undefined);
  let runId_2 = safeIdentifierOrUndefined(runId);
  return runId_2 !== undefined && normalized?.kind === "task-notification" && normalized.runId === undefined
    ? {
        ...normalized,
        runId: runId_2,
      }
    : normalized;
}
//@ chunk-63641kq7.js:1537-1619 placement
/**
 * 判断是否为会话任务发出的任务通知来源。
 */
function isSessionTaskNotificationOrigin(origin) {
  return origin?.kind === "task-notification" && origin.producer === "session-task";
}
//@ chunk-63641kq7.js:1619-1755 placement
function isBareTaskNotificationOrigin(origin) {
  return (
    origin?.kind === "task-notification" &&
    Object.keys(origin).every(
      (key) => key === "kind" || key === "producer" || key === "runId" || key === "taskKind",
    )
  );
}
//@ chunk-63641kq7.js:1755-1804 placement
/**
 * 判断是否为任务通知来源（或显式标记为是）。
 */
function isTaskNotificationOrigin(origin, isSessionTask) {
  return (
    isBareTaskNotificationOrigin(origin) &&
    (isSessionTaskNotificationOrigin(origin) || isSessionTask === true)
  );
}
//@ chunk-63641kq7.js:1804-1877 placement
/**
 * 判断消息来源是否为非人类输入（默认考虑 UDS inbox）。
 */
function isNonHumanInboundOrigin(origin, udsInboxEnabled) {
  return isNonHumanInboundOrigin_2(origin, {
    udsInboxEnabled: typeof udsInboxEnabled === "boolean" ? udsInboxEnabled : true,
  });
}
//@ chunk-63641kq7.js:1877-2133 placement
function isNonHumanInboundOrigin_2(origin, { udsInboxEnabled }) {
  if (origin?.kind === "channel") return true;
  if (origin?.kind === "observer") return true;
  if (origin?.kind === "observer-activity") return true;
  if (origin?.kind === "slack-ping") return true;
  if (origin?.kind === "peer") {
    if (origin.senderTaskId !== undefined) return true;
    if (udsInboxEnabled) return true;
  }
  return false;
}
//@ chunk-63641kq7.js:2233-2759 placement
/**
 * 只在转录文件存在且非空时以追加模式写入文本（存储 v5 开启时走存储后端），处理部分写入直到写完；文件不存在返回 false。
 */
async function tryAppendToTranscript(path, text, storageTargetForPath) {
  if (isStorageV5Enabled() && storageTargetForPath !== undefined)
    return tryAppendViaStorage(storageTargetForPath, text);
  let handle;
  try {
    handle = await open(path, constants.O_WRONLY | constants.O_APPEND);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return false;
    throw error;
  }
  try {
    let { size } = await handle.stat();
    if (size === 0) return false;
    let position = undefined;
    let buffer = Buffer.from(text, "utf8");
    let written = 0;
    while (written < buffer.length) {
      let { bytesWritten } = await handle.write(buffer, written, buffer.length - written, position);
      if (bytesWritten <= 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `tryAppend: short write to ${path} stalled with ${buffer.length - written} bytes remaining`,
          "tryAppend: zero-progress short write",
        );
      written += bytesWritten;
      if (position !== undefined) position += bytesWritten;
    }
    return true;
  } finally {
    await handle.close();
  }
}
//@ chunk-63641kq7.js:2759-3017 placement
async function tryAppendViaStorage({ backend, key }, data) {
  let appendResult = await backend.append(
    key,
    [
      {
        data,
      },
    ],
    {
      precondition: {
        type: "ifExists",
        nonEmpty: true,
      },
    },
  );
  if (!appendResult.ok) {
    if (appendResult.error.code === "NotFound") return false;
    throw Error("Session append: transcript not writable via storage", {
      cause: appendResult.error,
    });
  }
  return true;
}
//@ chunk-63641kq7.js:3124-3336 placement
var CONTINUED_IN_MARKER; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var continuedInEntrySchema;
var assistantStopReasonSchema;
deferInit("chunk-63641kq7.js:3124", () => {
  CONTINUED_IN_MARKER = '"type":"continued-in"';
  continuedInEntrySchema = DoctorLazy(() =>
    looseObject({
      type: literal("continued-in"),
      continuedInSessionId: stringSchema(),
    }),
  );
  assistantStopReasonSchema = DoctorLazy(() =>
    looseObject({
      type: literal("assistant"),
      isApiErrorMessage: booleanSchema().optional(),
      message: looseObject({
        stop_reason: stringSchema().nullish(),
      }).optional(),
    }),
  );
});
//@ chunk-63641kq7.js:3336-3868 placement
/**
 * 生成最近会话已转到后台运行的提示，说明如何附着或另选会话。
 */
function backgroundSessionMovedNotice(
  state,
  { canFork } = {
    canFork: true,
  },
) {
  if (state.provable)
    return `Your most recent conversation is running in the background (session ${state.sessionId}). Use \`claude agents\` to find and attach to it, or \`claude --resume\` to pick another session.`;
  let forkNote = canFork ? ", or add --fork-session to branch off a copy" : "";
  return `Your most recent conversation moved to a background session (${state.sessionId}) registered from another machine or container, so this one can't tell whether it is still running. Use \`claude --resume\` to pick a session${forkNote}.`;
}
//@ chunk-63641kq7.js:3868-3984 placement
function createContinuedInEntry(sessionId, continuedInSessionId) {
  return {
    type: "continued-in",
    timestamp: new Date().toISOString(),
    sessionId,
    continuedInSessionId,
  };
}
//@ chunk-63641kq7.js:3984-4351 placement
/**
 * 从转录文本末尾向前查找 continued-in 记录，返回会话接续到的新会话 id；若在此之前遇到已完成的用户/助手回合则返回 undefined（说明之后仍在本会话继续）。
 */
function findContinuedInSessionId(tail) {
  if (!tail.includes(CONTINUED_IN_MARKER)) return;
  let endIndex = tail.length;
  while (endIndex > 0) {
    let index = tail.lastIndexOf(
      `
`,
      endIndex - 1,
    );
    let sliced = tail.slice(index + 1, endIndex);
    endIndex = index;
    let included = sliced.includes(CONTINUED_IN_MARKER);
    let isTurnEntry = sliced.includes('"type":"user"') || sliced.includes('"type":"assistant"');
    if (included || isTurnEntry)
      try {
        let parsed = JSON.parse(sliced);
        if (included) {
          let parseResult = continuedInEntrySchema().safeParse(parsed);
          if (parseResult.success) return validateUuid(parseResult.data.continuedInSessionId) ?? undefined;
        }
        if (isTurnEntry && isCompletedTurnEntry(parsed)) return;
      } catch {}
    if (index < 0) break;
  }
  return;
}
//@ chunk-63641kq7.js:4351-4535 placement
function isCompletedTurnEntry(entry) {
  let parseResult = assistantStopReasonSchema().safeParse(entry);
  if (parseResult.success)
    return (
      parseResult.data.isApiErrorMessage !== true && typeof parseResult.data.message?.stop_reason === "string"
    );
  return (
    isPlainObject(entry) &&
    renderPluginPrompt(entry, {
      commandFallback: "",
    }) !== undefined
  );
}
export {
  resolveTaskNotificationOrigin,
  isNonHumanInboundOrigin,
  transcriptLines,
  tryAppendToTranscript,
  findContinuedInSessionId,
  normalizeTaskNotificationOrigin,
  isSessionTaskNotificationOrigin,
  isBareTaskNotificationOrigin,
  isTaskNotificationOrigin,
  backgroundSessionMovedNotice,
  createContinuedInEntry,
};

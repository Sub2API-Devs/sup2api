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
import { looseObject, literal, string, M } from "../../vendor/zod/v4/classic/schemas.js";
import { validateUuid } from "./sessionStoragePortable.js";
import { isPlainObject } from "./isPlainObject.js";
import { renderPluginPrompt } from "./messages/pluginPrompts.js";

//@ chunk-63641kq7.js:639-973 placement
/**
 * 把文本流按行切分逐行产出；流不是文本时抛 TypeError。
 */
async function* transcriptLines(readStream) {
  let n = [];
  for await (let r of readStream) {
    if (typeof r !== "string")
      throw TypeError("transcriptLines takes text: open the stream with an encoding");
    let t = 0;
    for (
      let index = r.indexOf(`
`);
      index !== -1;
      index = r.indexOf(
        `
`,
        t,
      )
    ) {
      n.push(r.slice(t, index));
      yield stripTrailingCR(n.join(""));
      n = [];
      t = index + 1;
    }
    if (t < r.length) n.push(r.slice(t));
  }
  if (n.length > 0) yield stripTrailingCR(n.join(""));
}
//@ chunk-63641kq7.js:973-1027 placement
/**
 * 去掉行尾的 \r（CRLF 兼容）。
 */
function stripTrailingCR(e) {
  return e.endsWith("\r") ? e.slice(0, -1) : e;
}
//@ chunk-63641kq7.js:1027-1352 placement
/**
 * 规范化任务通知来源对象，只保留存在的字段。
 */
function normalizeTaskNotificationOrigin(origin) {
  if (origin?.kind !== "task-notification") return origin;
  let n = safeIdentifierOrUndefined(origin.runId);
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
    ...(n !== undefined && {
      runId: n,
    }),
    ...(origin.taskKind === "mcp-task" && {
      taskKind: origin.taskKind,
    }),
  };
}
//@ chunk-63641kq7.js:1352-1537 placement = processQueuedCommands (0.75)
function resolveTaskNotificationOrigin(origin, commandMode, runId) {
  let t =
    normalizeTaskNotificationOrigin(origin) ??
    (commandMode === "task-notification"
      ? {
          kind: "task-notification",
        }
      : undefined);
  let i = safeIdentifierOrUndefined(runId);
  return i !== undefined && t?.kind === "task-notification" && t.runId === undefined
    ? {
        ...t,
        runId: i,
      }
    : t;
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
function isTaskNotificationOrigin(origin, n) {
  return isBareTaskNotificationOrigin(origin) && (isSessionTaskNotificationOrigin(origin) || n === true);
}
//@ chunk-63641kq7.js:1804-1877 placement
/**
 * 判断消息来源是否为非人类输入（默认考虑 UDS inbox）。
 */
function isNonHumanInboundOrigin(origin, n) {
  return isNonHumanInboundOrigin_2(origin, {
    udsInboxEnabled: typeof n === "boolean" ? n : true,
  });
}
//@ chunk-63641kq7.js:1877-2133 placement
function isNonHumanInboundOrigin_2(e, { udsInboxEnabled }) {
  if (e?.kind === "channel") return true;
  if (e?.kind === "observer") return true;
  if (e?.kind === "observer-activity") return true;
  if (e?.kind === "slack-ping") return true;
  if (e?.kind === "peer") {
    if (e.senderTaskId !== undefined) return true;
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
    let s = undefined;
    let buffer = Buffer.from(text, "utf8");
    let written = 0;
    while (written < buffer.length) {
      let { bytesWritten } = await handle.write(buffer, written, buffer.length - written, s);
      if (bytesWritten <= 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `tryAppend: short write to ${path} stalled with ${buffer.length - written} bytes remaining`,
          "tryAppend: zero-progress short write",
        );
      written += bytesWritten;
      if (s !== undefined) s += bytesWritten;
    }
    return true;
  } finally {
    await handle.close();
  }
}
//@ chunk-63641kq7.js:2759-3017 placement
async function tryAppendViaStorage({ backend, key }, data) {
  let t = await backend.append(
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
  if (!t.ok) {
    if (t.error.code === "NotFound") return false;
    throw Error("Session append: transcript not writable via storage", {
      cause: t.error,
    });
  }
  return true;
}
//@ chunk-63641kq7.js:3124-3336 placement
var CONTINUED_IN_MARKER = '"type":"continued-in"';
var continuedInEntrySchema = DoctorLazy(() =>
  looseObject({
    type: literal("continued-in"),
    continuedInSessionId: string(),
  }),
);
var assistantStopReasonSchema = DoctorLazy(() =>
  looseObject({
    type: literal("assistant"),
    isApiErrorMessage: M().optional(),
    message: looseObject({
      stop_reason: string().nullish(),
    }).optional(),
  }),
);
//@ chunk-63641kq7.js:3336-3868 placement
/**
 * 生成最近会话已转到后台运行的提示，说明如何附着或另选会话。
 */
function backgroundSessionMovedNotice(
  state,
  { canFork: n } = {
    canFork: true,
  },
) {
  if (state.provable)
    return `Your most recent conversation is running in the background (session ${state.sessionId}). Use \`claude agents\` to find and attach to it, or \`claude --resume\` to pick another session.`;
  let r = n ? ", or add --fork-session to branch off a copy" : "";
  return `Your most recent conversation moved to a background session (${state.sessionId}) registered from another machine or container, so this one can't tell whether it is still running. Use \`claude --resume\` to pick a session${r}.`;
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
  let n = tail.length;
  while (n > 0) {
    let index = tail.lastIndexOf(
      `
`,
      n - 1,
    );
    let sliced = tail.slice(index + 1, n);
    n = index;
    let included = sliced.includes(CONTINUED_IN_MARKER);
    let s = sliced.includes('"type":"user"') || sliced.includes('"type":"assistant"');
    if (included || s)
      try {
        let parsed = JSON.parse(sliced);
        if (included) {
          let a = continuedInEntrySchema().safeParse(parsed);
          if (a.success) return validateUuid(a.data.continuedInSessionId) ?? undefined;
        }
        if (s && isCompletedTurnEntry(parsed)) return;
      } catch {}
    if (index < 0) break;
  }
  return;
}
//@ chunk-63641kq7.js:4351-4535 placement
function isCompletedTurnEntry(e) {
  let n = assistantStopReasonSchema().safeParse(e);
  if (n.success) return n.data.isApiErrorMessage !== true && typeof n.data.message?.stop_reason === "string";
  return (
    isPlainObject(e) &&
    renderPluginPrompt(e, {
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

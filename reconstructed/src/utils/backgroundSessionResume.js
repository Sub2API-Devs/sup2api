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
import { open, open as open_2 } from "fs/promises";
import { constants, constants as constants_2 } from "fs";
import { kN } from "./safeIdentifier.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { getErrnoCode, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { kt, T, o, M } from "../../vendor/zod/v4/classic/schemas.js";
import { validateUuid } from "./sessionStoragePortable.js";
import { isPlainObject } from "./isPlainObject.js";
import { renderPluginPrompt } from "./messages/pluginPrompts.js";

/**
 * 把文本流按行切分逐行产出；流不是文本时抛 TypeError。
 */
//@ chunk-63641kq7.js:639-973 placement
async function* transcriptLines(e) {
  let n = [];
  for await (let r of e) {
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
    )
      (n.push(r.slice(t, index)), yield g(n.join("")), (n = []), (t = index + 1));
    if (t < r.length) n.push(r.slice(t));
  }
  if (n.length > 0) yield g(n.join(""));
}
//@ chunk-63641kq7.js:973-1027 placement
function g(e) {
  return e.endsWith("\r") ? e.slice(0, -1) : e;
}
/**
 * 规范化任务通知来源对象，只保留存在的字段。
 */
//@ chunk-63641kq7.js:1027-1352 placement
function normalizeTaskNotificationOrigin(e) {
  if (e?.kind !== "task-notification") return e;
  let n = kN(e.runId);
  return {
    kind: "task-notification",
    ...(e.subkind !== void 0 && { subkind: e.subkind }),
    ...(e.fireReason !== void 0 && { fireReason: e.fireReason }),
    ...(e.producer !== void 0 && { producer: e.producer }),
    ...(n !== void 0 && { runId: n }),
    ...(e.taskKind === "mcp-task" && { taskKind: e.taskKind }),
  };
}
//@ chunk-63641kq7.js:1352-1537 placement = processQueuedCommands (0.75)
function resolveTaskNotificationOrigin(e, n, r) {
  let t =
      normalizeTaskNotificationOrigin(e) ??
      (n === "task-notification" ? { kind: "task-notification" } : void 0),
    i = kN(r);
  return i !== void 0 && t?.kind === "task-notification" && t.runId === void 0 ? { ...t, runId: i } : t;
}
//@ chunk-63641kq7.js:1537-1619 placement
function zfe(e) {
  return e?.kind === "task-notification" && e.producer === "session-task";
}
//@ chunk-63641kq7.js:1619-1755 placement
function isBareTaskNotificationOrigin(e) {
  return (
    e?.kind === "task-notification" &&
    Object.keys(e).every((n) => n === "kind" || n === "producer" || n === "runId" || n === "taskKind")
  );
}
//@ chunk-63641kq7.js:1755-1804 placement
function k2t(e, n) {
  return isBareTaskNotificationOrigin(e) && (zfe(e) || n === !0);
}
//@ chunk-63641kq7.js:1804-1877 placement
function qB(e, n) {
  return isNonHumanInboundOrigin(e, { udsInboxEnabled: typeof n === "boolean" ? n : !0 });
}
//@ chunk-63641kq7.js:1877-2133 placement
function isNonHumanInboundOrigin(e, { udsInboxEnabled: udsInboxEnabled }) {
  if (e?.kind === "channel") return !0;
  if (e?.kind === "observer") return !0;
  if (e?.kind === "observer-activity") return !0;
  if (e?.kind === "slack-ping") return !0;
  if (e?.kind === "peer") {
    if (e.senderTaskId !== void 0) return !0;
    if (udsInboxEnabled) return !0;
  }
  return !1;
}
/**
 * 只在转录文件存在且非空时以追加模式写入文本（存储 v5 开启时走存储后端），处理部分写入直到写完；文件不存在返回 false。
 */
//@ chunk-63641kq7.js:2233-2759 placement
async function tryAppendToTranscript(path, text, r) {
  if (isStorageV5Enabled() && r !== void 0) return tryAppendViaStorage(r, text);
  let handle;
  try {
    handle = await open(path, constants.O_WRONLY | constants.O_APPEND);
  } catch (error) {
    let s = getErrnoCode(error);
    if (s === "ENOENT" || s === "ENOTDIR") return !1;
    throw error;
  }
  try {
    let { size: size } = await handle.stat();
    if (size === 0) return !1;
    let s = void 0,
      buffer = Buffer.from(text, "utf8"),
      written = 0;
    while (written < buffer.length) {
      let { bytesWritten: bytesWritten } = await handle.write(buffer, written, buffer.length - written, s);
      if (bytesWritten <= 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `tryAppend: short write to ${path} stalled with ${buffer.length - written} bytes remaining`,
          "tryAppend: zero-progress short write",
        );
      if (((written += bytesWritten), s !== void 0)) s += bytesWritten;
    }
    return !0;
  } finally {
    await handle.close();
  }
}
//@ chunk-63641kq7.js:2759-3017 placement
async function tryAppendViaStorage({ backend: backend, key: key }, r) {
  let append = await backend.append(key, [{ data: r }], { precondition: { type: "ifExists", nonEmpty: !0 } });
  if (!append.ok) {
    if (append.error.code === "NotFound") return !1;
    throw Error("Session append: transcript not writable via storage", { cause: append.error });
  }
  return !0;
}
//@ chunk-63641kq7.js:3124-3336 placement
var CONTINUED_IN_MARKER = '"type":"continued-in"',
  continuedInEntrySchema = DoctorLazy(() => kt({ type: T("continued-in"), continuedInSessionId: o() })),
  assistantStopReasonSchema = DoctorLazy(() =>
    kt({
      type: T("assistant"),
      isApiErrorMessage: M().optional(),
      message: kt({ stop_reason: o().nullish() }).optional(),
    }),
  );
/**
 * 生成最近会话已转到后台运行的提示，说明如何附着或另选会话。
 */
//@ chunk-63641kq7.js:3336-3868 placement
function backgroundSessionMovedNotice(state, { canFork: n } = { canFork: !0 }) {
  if (state.provable)
    return `Your most recent conversation is running in the background (session ${state.sessionId}). Use \`claude agents\` to find and attach to it, or \`claude --resume\` to pick another session.`;
  let r = n ? ", or add --fork-session to branch off a copy" : "";
  return `Your most recent conversation moved to a background session (${state.sessionId}) registered from another machine or container, so this one can't tell whether it is still running. Use \`claude --resume\` to pick a session${r}.`;
}
//@ chunk-63641kq7.js:3868-3984 placement
function createContinuedInEntry(e, n) {
  return { type: "continued-in", timestamp: new Date().toISOString(), sessionId: e, continuedInSessionId: n };
}
/**
 * 从转录文本末尾向前查找 continued-in 记录，返回会话接续到的新会话 id；若在此之前遇到已完成的用户/助手回合则返回 undefined（说明之后仍在本会话继续）。
 */
//@ chunk-63641kq7.js:3984-4351 placement
function findContinuedInSessionId(e) {
  if (!e.includes(CONTINUED_IN_MARKER)) return;
  let n = e.length;
  while (n > 0) {
    let index = e.lastIndexOf(
        `
`,
        n - 1,
      ),
      sliced = e.slice(index + 1, n);
    n = index;
    let included = sliced.includes(CONTINUED_IN_MARKER),
      s = sliced.includes('"type":"user"') || sliced.includes('"type":"assistant"');
    if (included || s)
      try {
        let parsed = JSON.parse(sliced);
        if (included) {
          let safeParse = continuedInEntrySchema().safeParse(parsed);
          if (safeParse.success) return validateUuid(safeParse.data.continuedInSessionId) ?? void 0;
        }
        if (s && isCompletedTurnEntry(parsed)) return;
      } catch {}
    if (index < 0) break;
  }
  return;
}
//@ chunk-63641kq7.js:4351-4535 placement
function isCompletedTurnEntry(e) {
  let safeParse = assistantStopReasonSchema().safeParse(e);
  if (safeParse.success)
    return safeParse.data.isApiErrorMessage !== !0 && typeof safeParse.data.message?.stop_reason === "string";
  return isPlainObject(e) && renderPluginPrompt(e, { commandFallback: "" }) !== void 0;
}

export {
  resolveTaskNotificationOrigin,
  qB,
  transcriptLines,
  tryAppendToTranscript,
  findContinuedInSessionId,
  normalizeTaskNotificationOrigin,
  zfe,
  isBareTaskNotificationOrigin,
  k2t,
  backgroundSessionMovedNotice,
  createContinuedInEntry,
};

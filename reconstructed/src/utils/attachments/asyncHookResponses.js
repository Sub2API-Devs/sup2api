/**
 * utils/attachments/asyncHookResponses.ts
 *
 * 2.1.316 新增：异步钩子响应附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { literal, discriminatedUnion, u, unknown, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { getHookMessageTexts } from "../hooks/hookEventHelpers.js";

//@ chunk-e6aww6q8.js:3290286-3290634 placement
/**
 * SessionStart 钩子记录的 schema：异步钩子响应、附加上下文与成功消息三类附件。
 */
var sessionStartHookRecordSchema = DoctorLazy(() => {
  let hookEvent = literal("SessionStart");
  return discriminatedUnion("type", [
    u({
      type: literal("async_hook_response"),
      hookEvent,
      response: unknown().optional(),
      command: unknown().optional(),
      pluginId: unknown().optional(),
      exitCode: unknown().optional(),
    }),
    u({
      type: literal("hook_additional_context"),
      hookEvent,
      content: array(unknown()).catch([]),
    }),
    u({
      type: literal("hook_success"),
      hookEvent,
      content: unknown().optional(),
    }),
  ]);
});
//@ chunk-e6aww6q8.js:3290634-3290919 placement
function parseHookRecordTexts(e) {
  let n = sessionStartHookRecordSchema().safeParse(e);
  if (!n.success) return;
  switch (n.data.type) {
    case "async_hook_response":
      return {
        ...n.data,
        texts: getHookMessageTexts(n.data.response),
      };
    case "hook_additional_context":
      return {
        texts: n.data.content,
      };
    case "hook_success":
      return {
        texts: n.data.content === "" ? [] : [n.data.content],
      };
  }
}
//@ chunk-e6aww6q8.js:3290919-3291241 placement
/**
 * 判断异步钩子响应是否与历史中同一命令/插件的钩子输出重复：从后向前查找，文本都已出现过即为重复，遇到成功退出则停止。
 */
function isAsyncHookResponseDuplicate(e, n) {
  let hookMessageTexts = getHookMessageTexts(e.response);
  if (hookMessageTexts.length === 0) return false;
  for (let idx = n.length - 1; idx >= 0; idx--) {
    let hookRecordTexts = parseHookRecordTexts(n[idx]);
    if (hookRecordTexts === undefined) continue;
    let y = hookRecordTexts.command === e.command && hookRecordTexts.pluginId === e.pluginId;
    if (hookRecordTexts.command !== undefined && !y) continue;
    if (hookRecordTexts.texts.length > 0)
      return hookMessageTexts.every((hookMessageText) => hookRecordTexts.texts.includes(hookMessageText));
    if (y && hookRecordTexts.exitCode === 0) return false;
  }
  return false;
}
export { isAsyncHookResponseDuplicate };

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
import {
  literal,
  discriminatedUnion,
  objectSchema,
  unknown,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { getHookMessageTexts } from "../hooks/hookEventHelpers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3290286-3290634 placement
/**
 * SessionStart 钩子记录的 schema：异步钩子响应、附加上下文与成功消息三类附件。
 */
var sessionStartHookRecordSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3290286", () => {
  sessionStartHookRecordSchema = DoctorLazy(() => {
    let hookEvent = literal("SessionStart");
    return discriminatedUnion("type", [
      objectSchema({
        type: literal("async_hook_response"),
        hookEvent,
        response: unknown().optional(),
        command: unknown().optional(),
        pluginId: unknown().optional(),
        exitCode: unknown().optional(),
      }),
      objectSchema({
        type: literal("hook_additional_context"),
        hookEvent,
        content: array(unknown()).catch([]),
      }),
      objectSchema({
        type: literal("hook_success"),
        hookEvent,
        content: unknown().optional(),
      }),
    ]);
  });
});
//@ chunk-e6aww6q8.js:3290634-3290919 placement
function parseHookRecordTexts(record) {
  let parseResult = sessionStartHookRecordSchema().safeParse(record);
  if (!parseResult.success) return;
  switch (parseResult.data.type) {
    case "async_hook_response":
      return {
        ...parseResult.data,
        texts: getHookMessageTexts(parseResult.data.response),
      };
    case "hook_additional_context":
      return {
        texts: parseResult.data.content,
      };
    case "hook_success":
      return {
        texts: parseResult.data.content === "" ? [] : [parseResult.data.content],
      };
  }
}
//@ chunk-e6aww6q8.js:3290919-3291241 placement
/**
 * 判断异步钩子响应是否与历史中同一命令/插件的钩子输出重复：从后向前查找，文本都已出现过即为重复，遇到成功退出则停止。
 */
function isAsyncHookResponseDuplicate(candidate, priorAttachments) {
  let hookMessageTexts = getHookMessageTexts(candidate.response);
  if (hookMessageTexts.length === 0) return false;
  for (let idx = priorAttachments.length - 1; idx >= 0; idx--) {
    let hookRecordTexts = parseHookRecordTexts(priorAttachments[idx]);
    if (hookRecordTexts === undefined) continue;
    let sameOrigin =
      hookRecordTexts.command === candidate.command && hookRecordTexts.pluginId === candidate.pluginId;
    if (hookRecordTexts.command !== undefined && !sameOrigin) continue;
    if (hookRecordTexts.texts.length > 0)
      return hookMessageTexts.every((hookMessageText) => hookRecordTexts.texts.includes(hookMessageText));
    if (sameOrigin && hookRecordTexts.exitCode === 0) return false;
  }
  return false;
}
export { isAsyncHookResponseDuplicate };

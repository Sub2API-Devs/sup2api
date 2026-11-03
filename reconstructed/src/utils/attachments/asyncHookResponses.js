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
import { T, Ir, u, oe, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { getHookMessageTexts } from "../hooks/hookEventHelpers.js";

/**
 * SessionStart 钩子记录的 schema：异步钩子响应、附加上下文与成功消息三类附件。
 */
//@ chunk-e6aww6q8.js:3290286-3290634 placement
var sessionStartHookRecordSchema = DoctorLazy(() => {
  let e = T("SessionStart");
  return Ir("type", [
    u({
      type: T("async_hook_response"),
      hookEvent: e,
      response: oe().optional(),
      command: oe().optional(),
      pluginId: oe().optional(),
      exitCode: oe().optional(),
    }),
    u({ type: T("hook_additional_context"), hookEvent: e, content: A(oe()).catch([]) }),
    u({ type: T("hook_success"), hookEvent: e, content: oe().optional() }),
  ]);
});
//@ chunk-e6aww6q8.js:3290634-3290919 placement
function parseHookRecordTexts(e) {
  let safeParse = sessionStartHookRecordSchema().safeParse(e);
  if (!safeParse.success) return;
  switch (safeParse.data.type) {
    case "async_hook_response":
      return { ...safeParse.data, texts: getHookMessageTexts(safeParse.data.response) };
    case "hook_additional_context":
      return { texts: safeParse.data.content };
    case "hook_success":
      return { texts: safeParse.data.content === "" ? [] : [safeParse.data.content] };
  }
}
/**
 * 判断异步钩子响应是否与历史中同一命令/插件的钩子输出重复：从后向前查找，文本都已出现过即为重复，遇到成功退出则停止。
 */
//@ chunk-e6aww6q8.js:3290919-3291241 placement
function isAsyncHookResponseDuplicate(e, n) {
  let r = getHookMessageTexts(e.response);
  if (r.length === 0) return !1;
  for (let s = n.length - 1; s >= 0; s--) {
    let h = parseHookRecordTexts(n[s]);
    if (h === void 0) continue;
    let y = h.command === e.command && h.pluginId === e.pluginId;
    if (h.command !== void 0 && !y) continue;
    if (h.texts.length > 0) return r.every((S) => h.texts.includes(S));
    if (y && h.exitCode === 0) return !1;
  }
  return !1;
}

export { isAsyncHookResponseDuplicate };

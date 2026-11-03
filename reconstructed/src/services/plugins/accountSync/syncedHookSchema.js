/**
 * services/plugins/accountSync/syncedHookSchema.ts
 *
 * 2.1.316 新增：同步钩子 schema
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f9asxqh1.js (4)
 * attribution: placement 4
 */
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, T, o, A, E, U, M, oe } from "../../../../vendor/zod/v4/classic/schemas.js";
import { HOOK_EVENTS } from "../../../entrypoints/sdk/coreSchemas.js";
import { isPrefilterableHook } from "../../../utils/hooks.js";
import { Do } from "../../../utils/git/gitSafeEnv.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { HooksSchema } from "../../../schemas/hooks.js";

/**
 * 同步钩子里本地不执行的钩子类型（prompt/agent/http/mcp_tool），以及 command、prompt 两类钩子与"事件→匹配器→钩子"列表的懒加载 schema。
 */
//@ chunk-f9asxqh1.js:13006-13652 placement
var OTHER_HOOK_KINDS = ["prompt", "agent", "http", "mcp_tool"],
  syncedCommandHookSchema = DoctorLazy(() =>
    u({
      type: T("command"),
      command: o(),
      args: A(o()).nullish(),
      if: o().nullish(),
      shell: o().nullish(),
      timeout: E().nullish(),
      on_failure: U(["continue", "block"]).nullish().catch("block"),
      status_message: o().nullish(),
      once: M().nullish(),
      async: M().nullish(),
      async_rewake: M().nullish(),
      rewake_message: o().nullish(),
      rewake_summary: o().nullish(),
    }),
  ),
  syncedPromptHookSchema = DoctorLazy(() =>
    u({
      type: T("prompt"),
      prompt: o(),
      if: o().nullish(),
      timeout: E().nullish(),
      model: o().nullish(),
      continue_on_block: M().nullish(),
      status_message: o().nullish(),
      once: M().nullish(),
    }),
  ),
  syncedHooksListSchema = DoctorLazy(() =>
    A(u({ event: o(), matchers: A(u({ matcher: o().nullish(), hooks: A(oe()) })) })),
  );
/**
 * 把账号插件列表里的钩子（snake_case 的 event/matchers 列表）转换为本地 HooksSchema：只接受 command 与 prompt 两类，未知事件计数，其他类型（agent/http/mcp_tool）记入 otherKinds；有 hook_modules 或校验失败时返回 undefined。
 */
//@ chunk-f9asxqh1.js:13652-15123 placement
function convertSyncedPluginHooks(plugin) {
  if (!Array.isArray(plugin.hook_modules) || plugin.hook_modules.length > 0) return;
  let safeParse = syncedHooksListSchema().safeParse(plugin.hooks === null ? [] : plugin.hooks);
  if (!safeParse.success) return;
  let hooksByEvent = {},
    unknownEventCount = 0,
    hasOtherKinds = !1,
    otherKinds = new Set(),
    knownEvents = HOOK_EVENTS;
  for (let { event: event, matchers: matchers } of safeParse.data) {
    if (!knownEvents.includes(event)) {
      unknownEventCount += matchers.reduce((C, H) => C + H.hooks.length, 0);
      continue;
    }
    for (let { matcher: matcher, hooks: hooks } of matchers) {
      let flattened = hooks.flatMap((O) => {
        let safeParse = syncedPromptHookSchema().safeParse(O);
        if (safeParse.success) {
          otherKinds.add("prompt");
          let { continue_on_block: continue_on_block, status_message: status_message, ...Y } = safeParse.data;
          if (!isPrefilterableHook({ type: Y.type, if: Y.if ?? void 0 })) return ((hasOtherKinds = !0), []);
          return [
            Do(
              { ...Y, continueOnBlock: continue_on_block, statusMessage: status_message },
              (De) => De != null,
            ),
          ];
        }
        let safeParse_2 = syncedCommandHookSchema().safeParse(O);
        if (!safeParse_2.success) {
          hasOtherKinds = !0;
          let K = isPlainObject(O) ? OTHER_HOOK_KINDS.find((j) => j === O.type) : void 0;
          if (K !== void 0) otherKinds.add(K);
          return [];
        }
        let P = safeParse_2.data;
        return [
          {
            type: "command",
            command: P.command,
            ...(P.args != null && { args: P.args }),
            ...(P.if != null && { if: P.if }),
            ...(P.shell != null && { shell: P.shell }),
            ...(P.timeout != null && { timeout: P.timeout }),
            ...(P.on_failure != null && { onFailure: P.on_failure }),
            ...(P.status_message != null && { statusMessage: P.status_message }),
            ...(P.once != null && { once: P.once }),
            ...(P.async != null && { async: P.async }),
            ...(P.async_rewake != null && { asyncRewake: P.async_rewake }),
            ...(P.rewake_message != null && { rewakeMessage: P.rewake_message }),
            ...(P.rewake_summary != null && { rewakeSummary: P.rewake_summary }),
          },
        ];
      });
      if (flattened.length > 0)
        (hooksByEvent[event] ??= []).push({ ...(matcher != null && { matcher: matcher }), hooks: flattened });
    }
  }
  let safeParse_2 = HooksSchema().safeParse(hooksByEvent);
  if (!safeParse_2.success) return;
  let result = { hooks: safeParse_2.data, unknownEvents: unknownEventCount };
  if (hasOtherKinds) return { ...result, hasOtherKinds: !0, otherKinds: [...otherKinds] };
  return otherKinds.size > 0 ? { ...result, otherKinds: [...otherKinds] } : result;
}
//@ chunk-f9asxqh1.js:15890-15953 placement
var tn = DoctorLazy(() => u({ type: o(), name: o(), description: o().nullish() }));
//@ chunk-f9asxqh1.js:15953-15990 placement
function ge(e) {
  return e.enabled !== !1;
}

export { tn, convertSyncedPluginHooks, ge };

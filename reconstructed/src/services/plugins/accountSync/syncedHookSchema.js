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
import {
  u,
  literal,
  string,
  array,
  E,
  _enum,
  M,
  unknown,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { HOOK_EVENTS } from "../../../entrypoints/sdk/coreSchemas.js";
import { isPrefilterableHook } from "../../../utils/hooks.js";
import { pickByHelper } from "../../../utils/git/gitSafeEnv.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { HooksSchema } from "../../../schemas/hooks.js";

//@ chunk-f9asxqh1.js:13006-13652 placement
/**
 * 同步钩子里本地不执行的钩子类型（prompt/agent/http/mcp_tool），以及 command、prompt 两类钩子与"事件→匹配器→钩子"列表的懒加载 schema。
 */
var OTHER_HOOK_KINDS = ["prompt", "agent", "http", "mcp_tool"];
var syncedCommandHookSchema = DoctorLazy(() =>
  u({
    type: literal("command"),
    command: string(),
    args: array(string()).nullish(),
    if: string().nullish(),
    shell: string().nullish(),
    timeout: E().nullish(),
    on_failure: _enum(["continue", "block"]).nullish().catch("block"),
    status_message: string().nullish(),
    once: M().nullish(),
    async: M().nullish(),
    async_rewake: M().nullish(),
    rewake_message: string().nullish(),
    rewake_summary: string().nullish(),
  }),
);
var syncedPromptHookSchema = DoctorLazy(() =>
  u({
    type: literal("prompt"),
    prompt: string(),
    if: string().nullish(),
    timeout: E().nullish(),
    model: string().nullish(),
    continue_on_block: M().nullish(),
    status_message: string().nullish(),
    once: M().nullish(),
  }),
);
var syncedHooksListSchema = DoctorLazy(() =>
  array(
    u({
      event: string(),
      matchers: array(
        u({
          matcher: string().nullish(),
          hooks: array(unknown()),
        }),
      ),
    }),
  ),
);
//@ chunk-f9asxqh1.js:13652-15123 placement
/**
 * 把账号插件列表里的钩子（snake_case 的 event/matchers 列表）转换为本地 HooksSchema：只接受 command 与 prompt 两类，未知事件计数，其他类型（agent/http/mcp_tool）记入 otherKinds；有 hook_modules 或校验失败时返回 undefined。
 */
function convertSyncedPluginHooks(plugin) {
  if (!Array.isArray(plugin.hook_modules) || plugin.hook_modules.length > 0) return;
  let n = syncedHooksListSchema().safeParse(plugin.hooks === null ? [] : plugin.hooks);
  if (!n.success) return;
  let hooksByEvent = {};
  let unknownEventCount = 0;
  let hasOtherKinds = false;
  let otherKinds = new Set();
  let knownEvents = HOOK_EVENTS;
  for (let { event, matchers } of n.data) {
    if (!knownEvents.includes(event)) {
      unknownEventCount += matchers.reduce((acc, matcher) => acc + matcher.hooks.length, 0);
      continue;
    }
    for (let { matcher, hooks } of matchers) {
      let flattened = hooks.flatMap((hook) => {
        let R = syncedPromptHookSchema().safeParse(hook);
        if (R.success) {
          otherKinds.add("prompt");
          let { continue_on_block: continueOnBlock, status_message: statusMessage, ...Y } = R.data;
          if (
            !isPrefilterableHook({
              type: Y.type,
              if: Y.if ?? undefined,
            })
          ) {
            hasOtherKinds = true;
            return [];
          }
          return [
            pickByHelper(
              {
                ...Y,
                continueOnBlock,
                statusMessage,
              },
              (De) => De != null,
            ),
          ];
        }
        let G = syncedCommandHookSchema().safeParse(hook);
        if (!G.success) {
          hasOtherKinds = true;
          let K = isPlainObject(hook) ? OTHER_HOOK_KINDS.find((j) => j === hook.type) : undefined;
          if (K !== undefined) otherKinds.add(K);
          return [];
        }
        let P = G.data;
        return [
          {
            type: "command",
            command: P.command,
            ...(P.args != null && {
              args: P.args,
            }),
            ...(P.if != null && {
              if: P.if,
            }),
            ...(P.shell != null && {
              shell: P.shell,
            }),
            ...(P.timeout != null && {
              timeout: P.timeout,
            }),
            ...(P.on_failure != null && {
              onFailure: P.on_failure,
            }),
            ...(P.status_message != null && {
              statusMessage: P.status_message,
            }),
            ...(P.once != null && {
              once: P.once,
            }),
            ...(P.async != null && {
              async: P.async,
            }),
            ...(P.async_rewake != null && {
              asyncRewake: P.async_rewake,
            }),
            ...(P.rewake_message != null && {
              rewakeMessage: P.rewake_message,
            }),
            ...(P.rewake_summary != null && {
              rewakeSummary: P.rewake_summary,
            }),
          },
        ];
      });
      if (flattened.length > 0)
        (hooksByEvent[event] ??= []).push({
          ...(matcher != null && {
            matcher,
          }),
          hooks: flattened,
        });
    }
  }
  let h = HooksSchema().safeParse(hooksByEvent);
  if (!h.success) return;
  let result = {
    hooks: h.data,
    unknownEvents: unknownEventCount,
  };
  if (hasOtherKinds)
    return {
      ...result,
      hasOtherKinds: true,
      otherKinds: [...otherKinds],
    };
  return otherKinds.size > 0
    ? {
        ...result,
        otherKinds: [...otherKinds],
      }
    : result;
}
//@ chunk-f9asxqh1.js:15890-15953 placement
/**
 * 单个同步钩子条目的 schema。
 */
var syncedHookEntrySchema = DoctorLazy(() =>
  u({
    type: string(),
    name: string(),
    description: string().nullish(),
  }),
);
//@ chunk-f9asxqh1.js:15953-15990 placement
/**
 * 条目未显式禁用即视为启用。
 */
function isEnabledEntry(e) {
  return e.enabled !== false;
}
export { syncedHookEntrySchema, convertSyncedPluginHooks, isEnabledEntry };

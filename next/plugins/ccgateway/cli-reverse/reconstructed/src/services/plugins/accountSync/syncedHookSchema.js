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
  objectSchema,
  literal,
  stringSchema,
  array,
  numberSchema,
  _enum,
  booleanSchema,
  unknown,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { HOOK_EVENTS } from "../../../entrypoints/sdk/coreSchemas.js";
import { isPrefilterableHook } from "../../../utils/hooks.js";
import { pickByHelper } from "../../../utils/git/gitSafeEnv.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { HooksSchema } from "../../../schemas/hooks.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-f9asxqh1.js:13006-13652 placement
/**
 * 同步钩子里本地不执行的钩子类型（prompt/agent/http/mcp_tool），以及 command、prompt 两类钩子与"事件→匹配器→钩子"列表的懒加载 schema。
 */
var OTHER_HOOK_KINDS; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var syncedCommandHookSchema;
var syncedPromptHookSchema;
var syncedHooksListSchema;
deferInit("chunk-f9asxqh1.js:13006", () => {
  OTHER_HOOK_KINDS = ["prompt", "agent", "http", "mcp_tool"];
  syncedCommandHookSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("command"),
      command: stringSchema(),
      args: array(stringSchema()).nullish(),
      if: stringSchema().nullish(),
      shell: stringSchema().nullish(),
      timeout: numberSchema().nullish(),
      on_failure: _enum(["continue", "block"]).nullish().catch("block"),
      status_message: stringSchema().nullish(),
      once: booleanSchema().nullish(),
      async: booleanSchema().nullish(),
      async_rewake: booleanSchema().nullish(),
      rewake_message: stringSchema().nullish(),
      rewake_summary: stringSchema().nullish(),
    }),
  );
  syncedPromptHookSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("prompt"),
      prompt: stringSchema(),
      if: stringSchema().nullish(),
      timeout: numberSchema().nullish(),
      model: stringSchema().nullish(),
      continue_on_block: booleanSchema().nullish(),
      status_message: stringSchema().nullish(),
      once: booleanSchema().nullish(),
    }),
  );
  syncedHooksListSchema = DoctorLazy(() =>
    array(
      objectSchema({
        event: stringSchema(),
        matchers: array(
          objectSchema({
            matcher: stringSchema().nullish(),
            hooks: array(unknown()),
          }),
        ),
      }),
    ),
  );
});
//@ chunk-f9asxqh1.js:13652-15123 placement
/**
 * 把账号插件列表里的钩子（snake_case 的 event/matchers 列表）转换为本地 HooksSchema：只接受 command 与 prompt 两类，未知事件计数，其他类型（agent/http/mcp_tool）记入 otherKinds；有 hook_modules 或校验失败时返回 undefined。
 */
function convertSyncedPluginHooks(plugin) {
  if (!Array.isArray(plugin.hook_modules) || plugin.hook_modules.length > 0) return;
  let parsed = syncedHooksListSchema().safeParse(plugin.hooks === null ? [] : plugin.hooks);
  if (!parsed.success) return;
  let hooksByEvent = {};
  let unknownEventCount = 0;
  let hasOtherKinds = false;
  let otherKinds = new Set();
  let knownEvents = HOOK_EVENTS;
  for (let { event, matchers } of parsed.data) {
    if (!knownEvents.includes(event)) {
      unknownEventCount += matchers.reduce((acc, matcher) => acc + matcher.hooks.length, 0);
      continue;
    }
    for (let { matcher, hooks } of matchers) {
      let flattened = hooks.flatMap((hook) => {
        let promptHook = syncedPromptHookSchema().safeParse(hook);
        if (promptHook.success) {
          otherKinds.add("prompt");
          let {
            continue_on_block: continueOnBlock,
            status_message: statusMessage,
            ...rest
          } = promptHook.data;
          if (
            !isPrefilterableHook({
              type: rest.type,
              if: rest.if ?? undefined,
            })
          ) {
            hasOtherKinds = true;
            return [];
          }
          return [
            pickByHelper(
              {
                ...rest,
                continueOnBlock,
                statusMessage,
              },
              (value) => value != null,
            ),
          ];
        }
        let commandHook = syncedCommandHookSchema().safeParse(hook);
        if (!commandHook.success) {
          hasOtherKinds = true;
          let otherKind = isPlainObject(hook)
            ? OTHER_HOOK_KINDS.find((kind) => kind === hook.type)
            : undefined;
          if (otherKind !== undefined) otherKinds.add(otherKind);
          return [];
        }
        let data = commandHook.data;
        return [
          {
            type: "command",
            command: data.command,
            ...(data.args != null && {
              args: data.args,
            }),
            ...(data.if != null && {
              if: data.if,
            }),
            ...(data.shell != null && {
              shell: data.shell,
            }),
            ...(data.timeout != null && {
              timeout: data.timeout,
            }),
            ...(data.on_failure != null && {
              onFailure: data.on_failure,
            }),
            ...(data.status_message != null && {
              statusMessage: data.status_message,
            }),
            ...(data.once != null && {
              once: data.once,
            }),
            ...(data.async != null && {
              async: data.async,
            }),
            ...(data.async_rewake != null && {
              asyncRewake: data.async_rewake,
            }),
            ...(data.rewake_message != null && {
              rewakeMessage: data.rewake_message,
            }),
            ...(data.rewake_summary != null && {
              rewakeSummary: data.rewake_summary,
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
  let validatedHooks = HooksSchema().safeParse(hooksByEvent);
  if (!validatedHooks.success) return;
  let result = {
    hooks: validatedHooks.data,
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
var syncedHookEntrySchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-f9asxqh1.js:15890", () => {
  syncedHookEntrySchema = DoctorLazy(() =>
    objectSchema({
      type: stringSchema(),
      name: stringSchema(),
      description: stringSchema().nullish(),
    }),
  );
});
//@ chunk-f9asxqh1.js:15953-15990 placement
/**
 * 条目未显式禁用即视为启用。
 */
function isEnabledEntry(entry) {
  return entry.enabled !== false;
}
export { syncedHookEntrySchema, convertSyncedPluginHooks, isEnabledEntry };

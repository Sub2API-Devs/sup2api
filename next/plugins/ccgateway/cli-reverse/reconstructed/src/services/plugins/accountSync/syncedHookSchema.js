/**
 * services/plugins/accountSync/syncedHookSchema.ts
 *
 * 2.1.316 新增：同步钩子 schema
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-q1gbn2mn.js (6)
 * attribution: sole-consumer 2, placement 4
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";
import { hasNoRuleCondition } from "../../../utils/hooks.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  objectSchema,
  literal,
  stringSchema,
  array,
  numberSchema,
  _enum,
  booleanSchema,
  record,
  unknown,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { HOOK_EVENTS } from "../../../entrypoints/sdk/coreSchemas.js";
import { pickByHelper } from "../../../utils/git/gitSafeEnv.js";
import { MAX_MATCHER_STEPS } from "../../../utils/hooks/matcherGrammar.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { HooksSchema } from "../../../schemas/hooks.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-q1gbn2mn.js:13122-13207 sole-consumer
function enabledHookFeatures() {
  let featureValue = getFeatureValue_CACHED_MAY_BE_STALE("tengu_woven_ladder", []);
  return new Set(Array.isArray(featureValue) ? featureValue : []);
}
//@ chunk-q1gbn2mn.js:13207-13264 sole-consumer
function isIfSupported(hook, enabledFeatures = enabledHookFeatures()) {
  return hasNoRuleCondition(hook) || enabledFeatures.has("if_pattern");
}
//@ chunk-q1gbn2mn.js:13264-14538 placement
/**
 * 同步钩子里本地不执行的钩子类型（prompt/agent/http/mcp_tool），以及 command、prompt 两类钩子与"事件→匹配器→钩子"列表的懒加载 schema。
 */
var OTHER_HOOK_KINDS; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var syncedCommandHookSchema;
var syncedPromptHookSchema;
var syncedAgentHookSchema;
var syncedHttpHookSchema;
var syncedMcpToolHookSchema;
var PLUGIN_SERVER_PATTERN;
var syncedHooksListSchema;
deferInit("chunk-q1gbn2mn.js:13264", () => {
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
  syncedAgentHookSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("agent"),
      prompt: stringSchema(),
      if: stringSchema().nullish(),
      timeout: numberSchema().positive().nullish(),
      model: stringSchema().nullish(),
      status_message: stringSchema().nullish(),
      once: booleanSchema().nullish(),
    }),
  );
  syncedHttpHookSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("http"),
      url: stringSchema().url(),
      if: stringSchema().nullish(),
      timeout: numberSchema().positive().nullish(),
      on_failure: _enum(["continue", "block"]).nullish().catch("block"),
      headers: record(stringSchema(), stringSchema()).nullish(),
      allowed_env_vars: array(stringSchema()).nullish(),
      status_message: stringSchema().nullish(),
      once: booleanSchema().nullish(),
    }),
  );
  syncedMcpToolHookSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("mcp_tool"),
      server: stringSchema(),
      tool: stringSchema(),
      input: record(stringSchema(), unknown()).nullish(),
      if: stringSchema().nullish(),
      timeout: numberSchema().positive().nullish(),
      status_message: stringSchema().nullish(),
      once: booleanSchema().nullish(),
    }),
  );
  PLUGIN_SERVER_PATTERN = /^plugin:[^:]+:./;
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
//@ chunk-q1gbn2mn.js:14538-16802 placement
/**
 * 把账号插件列表里的钩子（snake_case 的 event/matchers 列表）转换为本地 HooksSchema：只接受 command 与 prompt 两类，未知事件计数，其他类型（agent/http/mcp_tool）记入 otherKinds；有 hook_modules 或校验失败时返回 undefined。
 */
function convertSyncedPluginHooks(plugin) {
  if (!Array.isArray(plugin.hook_modules) || plugin.hook_modules.length > 0) return;
  let parsed = syncedHooksListSchema().safeParse(plugin.hooks === null ? [] : plugin.hooks);
  if (!parsed.success) return;
  let hooksByEvent = {};
  let notConnectedByEvent = {};
  let matcherStepCount = 0;
  let unknownEvents = 0;
  let sawUnsupportedHook = false;
  let otherKinds = new Set();
  let knownEvents = HOOK_EVENTS;
  let enabledFeatures = enabledHookFeatures();
  for (let { event, matchers } of parsed.data) {
    if (!knownEvents.includes(event)) {
      unknownEvents += matchers.reduce((acc, matcher) => acc + matcher.hooks.length, 0);
      continue;
    }
    for (let { matcher, hooks } of matchers) {
      let notConnectedHooks = [];
      let flattened = hooks.flatMap((hook) => {
        let promptHook = syncedPromptHookSchema().safeParse(hook);
        if (promptHook.success) {
          otherKinds.add("prompt");
          let {
            continue_on_block: continueOnBlock,
            status_message: statusMessage,
            ...promptRest
          } = promptHook.data;
          if (
            !isIfSupported(
              {
                if: promptRest.if ?? undefined,
              },
              enabledFeatures,
            )
          ) {
            sawUnsupportedHook = true;
            return [];
          }
          return [
            pickByHelper(
              {
                ...promptRest,
                continueOnBlock,
                statusMessage,
              },
              (value) => value != null,
            ),
          ];
        }
        let agentParse = enabledFeatures.has("agent") ? syncedAgentHookSchema().safeParse(hook) : undefined;
        if (
          agentParse?.success &&
          isIfSupported(
            {
              if: agentParse.data.if ?? undefined,
            },
            enabledFeatures,
          )
        ) {
          otherKinds.add("agent");
          let { status_message: statusMessage, ...agentRest } = agentParse.data;
          return [
            pickByHelper(
              {
                ...agentRest,
                statusMessage,
              },
              (value) => value != null,
            ),
          ];
        }
        let httpParse = enabledFeatures.has("http") ? syncedHttpHookSchema().safeParse(hook) : undefined;
        if (httpParse?.success) {
          otherKinds.add("http");
          let {
            on_failure: onFailure,
            allowed_env_vars: allowedEnvVars,
            status_message: statusMessage,
            ...httpRest
          } = httpParse.data;
          return [
            pickByHelper(
              {
                ...httpRest,
                onFailure,
                allowedEnvVars,
                statusMessage,
              },
              (value) => value != null,
            ),
          ];
        }
        let mcpParse = enabledFeatures.has("mcp_tool")
          ? syncedMcpToolHookSchema().safeParse(hook)
          : undefined;
        if (
          mcpParse?.success &&
          matcherStepCount < MAX_MATCHER_STEPS &&
          PLUGIN_SERVER_PATTERN.test(mcpParse.data.server)
        ) {
          matcherStepCount++;
          otherKinds.add("mcp_tool");
          let { status_message: statusMessage, ...mcpRest } = mcpParse.data;
          notConnectedHooks.push(
            pickByHelper(
              {
                ...mcpRest,
                statusMessage,
              },
              (value) => value != null,
            ),
          );
          return [];
        }
        let commandParse = syncedCommandHookSchema().safeParse(hook);
        if (!commandParse.success) {
          sawUnsupportedHook = true;
          let otherKind = isPlainObject(hook)
            ? OTHER_HOOK_KINDS.find((kind) => kind === hook.type)
            : undefined;
          if (otherKind !== undefined) otherKinds.add(otherKind);
          return [];
        }
        let data = commandParse.data;
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
      if (notConnectedHooks.length > 0)
        (notConnectedByEvent[event] ??= []).push({
          ...(matcher != null && {
            matcher,
          }),
          hooks: notConnectedHooks,
        });
    }
  }
  let validatedHooks = HooksSchema().safeParse(hooksByEvent);
  let notConnectedParse = HooksSchema().safeParse(notConnectedByEvent);
  if (!validatedHooks.success || !notConnectedParse.success) return;
  let result = {
    hooks: validatedHooks.data,
    unknownEvents,
    ...(Object.keys(notConnectedParse.data).length > 0 && {
      notConnected: notConnectedParse.data,
    }),
  };
  if (sawUnsupportedHook)
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
//@ chunk-q1gbn2mn.js:17569-17632 placement
/**
 * 单个同步钩子条目的 schema。
 */
var syncedHookEntrySchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-q1gbn2mn.js:17569", () => {
  syncedHookEntrySchema = DoctorLazy(() =>
    objectSchema({
      type: stringSchema(),
      name: stringSchema(),
      description: stringSchema().nullish(),
    }),
  );
});
//@ chunk-q1gbn2mn.js:17632-17669 placement
/**
 * 条目未显式禁用即视为启用。
 */
function isEnabledEntry(entry) {
  return entry.enabled !== false;
}
export { syncedHookEntrySchema, convertSyncedPluginHooks, isEnabledEntry };

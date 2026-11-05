/**
 * services/remoteTools/runPluginHook.ts
 *
 * 2.1.316 新增。远程执行插件钩子。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m2gb6h8m.js (15)
 * attribution: placement 13, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  adminPolicyLoadFailureRefusesLaunch,
  getPolicyHelperSourceLoadErrors,
} from "../../utils/settings/settings.js";
import { findFatalPolicyHelperError } from "../../utils/settings/policyHelper/policyHelper.js";
import { hasSyncedContent, syncSettingsEnabled } from "../plugins/accountSync/syncedPluginHooks.js";
import { getPluginsSyncVetoed, getLastSyncedLaneLoad } from "../../bootstrap/state.js";
import { stripInvisibleChars } from "../../utils/plugins/syncedItems.js";
import { syncedPluginFolderId, loadAllPluginsCacheOnly } from "../../utils/plugins/pluginLoader.js";
import { joinPluginId, marketplaceSuffix } from "../../utils/plugins/pluginIdentifier.js";
import { SYNCED } from "../../utils/telemetry/pluginTelemetry.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logError } from "../../utils/log.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  _enum,
  array,
  record,
  numberSchema,
  booleanSchema,
  unknown,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  HOOK_EVENTS,
  truncateHookOutput,
  SyncHookJSONOutputSchema,
  truncateHookField,
  assertPluginHooksAllowed,
  findEnabledPlugin,
  assertPluginSyncSettled,
  assertSyncedPluginUsable,
  parseRemoteHookInput,
  evaluateHookCondition,
  holdHookUntilManagedSettings,
  runCommandHookWithTimeout,
} from "../../entrypoints/sdk/coreSchemas.js";
import {
  SAFE_CALLER_ID,
  isElicitationFailureExit,
  PROMPT_GUARD_EVENTS,
  blocksWhenItCannotRunElsewhere,
  parseHookOutput,
} from "../../utils/hooks.js";
import { byteLengthOfJson, resyncForMissingEntry } from "./commandRendering.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { ServedCallError } from "../mcpServe/servedCallError.js";
import { isHookPolicyUnanswered } from "../../commands/goal/goal.js";
import { settleBeforeHookRun, runHttpHook } from "../mcpServe/orgHookLists.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { isBuiltinPluginId } from "../../plugins/builtinPlugins.js";
import { convertPluginHooksToMatchers } from "../../utils/plugins/loadPluginHooks.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isManagedOrAllowlistedHook } from "../../utils/hooks/managedHooksOnly.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-m2gb6h8m.js:13386-13433 placement
/**
 * 策略加载失败或策略 helper 有致命错误时，拒绝在本机运行插件钩子。
 */
function policyLoadFailureRefusesPluginHooks() {
  return (
    adminPolicyLoadFailureRefusesLaunch() ||
    findFatalPolicyHelperError(getPolicyHelperSourceLoadErrors()) !== undefined
  );
}
//@ chunk-m2gb6h8m.js:13433-14189 placement
function pluginHookListingStatus(
  pluginId,
  { accountListing, lastCompleteList },
  lastSyncedLaneLoad,
  warnings,
) {
  try {
    if (!hasSyncedContent()) return "sync_not_armed";
    if (!syncSettingsEnabled() || getPluginsSyncVetoed()) return "sync_off";
    if (accountListing === "refused") return "listing_refused";
    if (lastCompleteList === null || lastSyncedLaneLoad === null) return "unknown";
    let normalizedId = stripInvisibleChars(pluginId);
    let lines = new Set();
    for (let [bucket, items] of lastCompleteList.dirsById)
      for (let item of items)
        if (stripInvisibleChars(syncedPluginFolderId(item)) === normalizedId) lines.add(bucket);
    if (lines.size === 0) return "absent_from_listing";
    let found = lastSyncedLaneLoad.find(
      (load) =>
        load.bucket === lastCompleteList.bucket && load.pluginId !== undefined && lines.has(load.pluginId),
    );
    switch (found?.outcome) {
      case undefined:
        return "no_copy_at_load";
      case "held_back":
        return "held_back";
      case "not_loaded": {
        let qualifiedName = joinPluginId(found.pluginName, SYNCED);
        return warnings.some(
          (warning) => warning.type === "synced-plugin-shadowed" && warning.source === qualifiedName,
        )
          ? "local_copy_wins"
          : "not_loaded";
      }
      case "loaded":
        return "unknown";
    }
  } catch (error) {
    logForDiagnosticsNoPII("warn", "plugins_sync_absence_unreadable");
    logError(error);
    return "unknown";
  }
}
//@ chunk-m2gb6h8m.js:14189-14699 placement
/**
 * RunPluginHook/RunPluginHookIf 的输入 schema 与相关 schema（调用方、jsonInput）以及路径字段名正则。
 */
var RUNPLUGINHOOK; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var RUNPLUGINHOOKIF;
var RUNPLUGINHTTPHOOK;
var runPluginHookInputSchema;
var remoteHookCallerSchema;
var jsonInputSchema;
var PATH_FIELD_NAME_REGEX;
deferInit("chunk-m2gb6h8m.js:14189", () => {
  RUNPLUGINHOOK = "RunPluginHook";
  RUNPLUGINHOOKIF = "RunPluginHookIf";
  RUNPLUGINHTTPHOOK = "RunPluginHttpHook";
  runPluginHookInputSchema = DoctorLazy(() =>
    objectSchema({
      pluginId: stringSchema(),
      hookEvent: _enum(HOOK_EVENTS),
      command: stringSchema(),
      args: array(stringSchema()).optional(),
      headers: record(stringSchema(), stringSchema()).optional(),
      allowedEnvVars: array(stringSchema()).optional(),
      if: stringSchema().optional(),
      timeout: numberSchema().positive().optional(),
      jsonInput: stringSchema(),
      hookIndex: numberSchema().int().nonnegative().optional(),
      isOrgRequired: booleanSchema().optional(),
    }),
  );
  remoteHookCallerSchema = DoctorLazy(() =>
    objectSchema({
      session_id: stringSchema().regex(SAFE_CALLER_ID),
      cwd: stringSchema(),
      effort: objectSchema({
        level: stringSchema().regex(SAFE_CALLER_ID),
      }).optional(),
    }),
  );
  jsonInputSchema = DoctorLazy(() => record(stringSchema(), unknown()));
  PATH_FIELD_NAME_REGEX = /(?:^|_)(?:path|dir|cwd|directory)$/;
});
//@ chunk-m2gb6h8m.js:14699-14780 placement
/**
 * 钩子输入里的路径类字段与钩子结果字节上限。
 */
var PATH_LIKE_FIELDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_HOOK_RESULT_BYTES;
deferInit("chunk-m2gb6h8m.js:14699", () => {
  PATH_LIKE_FIELDS = new Set(["file_path", "trigger_file_path", "parent_file_path"]);
  MAX_HOOK_RESULT_BYTES = 1048576;
});
//@ chunk-m2gb6h8m.js:14780-15344 placement
/**
 * 远程钩子执行的提示文字与限制：策略不可读/会阻止启动、输出过长、需截断的文本字段与输出字段、被丢弃的字段。
 */
var POLICY_UNREADABLE_TEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var POLICY_BLOCKS_START_TEXT;
var HOOK_OUTPUT_CUT_TEXT;
var HOOK_OUTPUT_MAX_CHARS;
var HOOK_TEXT_FIELDS;
var HOOK_UPDATED_OUTPUT_FIELDS;
var HOOK_OUTPUT_DROPPED_TEXT;
var HOOK_DROPPED_FIELDS;
deferInit("chunk-m2gb6h8m.js:14780", () => {
  POLICY_UNREADABLE_TEXT = "this machine's policy cannot be read for now";
  POLICY_BLOCKS_START_TEXT = "this machine's policy would stop claude from starting";
  HOOK_OUTPUT_CUT_TEXT = "The hook printed more than is passed on.";
  HOOK_OUTPUT_MAX_CHARS = 16384;
  HOOK_TEXT_FIELDS = new Set([
    "reason",
    "stopReason",
    "systemMessage",
    "additionalContext",
    "permissionDecisionReason",
    "message",
    "sessionTitle",
    "classifierContext",
  ]);
  HOOK_UPDATED_OUTPUT_FIELDS = new Set(["updatedToolOutput", "updatedMCPToolOutput"]);
  HOOK_OUTPUT_DROPPED_TEXT =
    "A hook changed a tool's result, and the change was too long to pass on, so Claude read the result as the tool gave it.";
  HOOK_DROPPED_FIELDS = new Set(["terminalSequence", "rewakeSummary", "metrics", "watchPaths"]);
});
//@ chunk-m2gb6h8m.js:15344-15847 placement
/**
 * 让远程钩子执行结果不超过大小上限：依次替换 output、stderr、stdout 为截断说明；可安全放行的事件直接改为失败结果。
 */
function fitHookResult(result, event) {
  if (byteLengthOfJson(result) <= MAX_HOOK_RESULT_BYTES) return result;
  let trimmed = {
    ...result,
    output: HOOK_OUTPUT_CUT_TEXT,
    missingScript: undefined,
    repairedInput: undefined,
  };
  if (byteLengthOfJson(trimmed) <= MAX_HOOK_RESULT_BYTES) return trimmed;
  let withStderr = {
    ...trimmed,
    stderr: HOOK_OUTPUT_CUT_TEXT,
    ...(isElicitationFailureExit(event, result.status) && {
      stdioClosedWithoutEnd: true,
    }),
  };
  if (byteLengthOfJson(withStderr) <= MAX_HOOK_RESULT_BYTES) return withStderr;
  if (
    result.status !== 2 &&
    !result.stdioIncomplete &&
    !result.stdioClosedWithoutEnd &&
    PROMPT_GUARD_EVENTS.has(event) &&
    !blocksWhenItCannotRunElsewhere(event)
  )
    return {
      stdout: "",
      stderr: HOOK_OUTPUT_CUT_TEXT,
      output: HOOK_OUTPUT_CUT_TEXT,
      status: 1,
      spawnFailed: true,
      ...(result.aborted && {
        aborted: true,
      }),
    };
  let noStdout = {
    ...withStderr,
    stdout: "",
    stdioClosedWithoutEnd: true,
  };
  let keepStderr = {
    ...noStdout,
    stderr: result.stderr,
  };
  return result.stderr !== "" && byteLengthOfJson(keepStderr) <= MAX_HOOK_RESULT_BYTES
    ? keepStderr
    : noStdout;
}
//@ chunk-m2gb6h8m.js:15847-16319 placement
/**
 * 钩子标准输出超限时重写：解析为 JSON 则截断字段后重新序列化（阻断类结果保留关键字段），否则截断原文。
 */
function shrinkHookStdout(result, event) {
  if (
    result.status === 2 ||
    result.aborted ||
    result.stdioIncomplete ||
    result.stdioClosedWithoutEnd ||
    fitHookResult(result, event).stdout === result.stdout
  )
    return result;
  let { json, validationError } = parseHookOutput(result.stdout);
  if (json !== undefined)
    try {
      let shrunk = dropMcpUpdatedOutput(truncateHookOutput(json));
      let text = jsonStringify(shrunk);
      let mustKeep = shrunk.continue === false || shrunk.decision === "block";
      return {
        ...result,
        stdout:
          mustKeep &&
          fitHookResult(
            {
              ...result,
              stdout: text,
            },
            event,
          ).stdout !== text
            ? jsonStringify(SyncHookJSONOutputSchema(shrunk))
            : text,
      };
    } catch (error) {
      logForDebugging(`a hook's answer could not be written again: ${errorMessage(error)}`, {
        level: "error",
      });
      return result;
    }
  return {
    ...result,
    stdout:
      validationError === undefined
        ? truncateHookField(result.stdout)
        : `${truncateHookField(result.stdout)}}`,
  };
}
//@ chunk-m2gb6h8m.js:16319-17172 placement
/**
 * 远程插件钩子被拒绝时的固定文案（插件未结算、无此插件、无此钩子、钩子被禁用、条件无法判断）与结果 schema。
 */
var RUN_PLUGIN_HOOK_REFUSALS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PLUGINS_NOT_SETTLED_TEXT;
var NO_ENABLED_PLUGIN_TEXT;
var ANTHROPIC_PLUGINABSENCE;
var NO_SUCH_HOOK_TEXT;
var HOOKS_DISABLED_TEXT;
var HOOK_CONDITION_UNKNOWN_TEXT;
deferInit("chunk-m2gb6h8m.js:16319", () => {
  RUN_PLUGIN_HOOK_REFUSALS = DoctorLazy(() =>
    objectSchema({
      stdout: stringSchema(),
      stderr: stringSchema(),
      output: stringSchema(),
      status: numberSchema(),
      aborted: booleanSchema().optional(),
      spawnFailed: booleanSchema().optional(),
      notStarted: booleanSchema().optional(),
      stdioIncomplete: booleanSchema().optional(),
      stdioClosedWithoutEnd: booleanSchema().optional(),
      runsInBackground: booleanSchema().optional(),
      missingScript: objectSchema({
        scriptPath: stringSchema().max(MAX_HOOK_RESULT_BYTES),
        cutFrom: stringSchema().max(MAX_HOOK_RESULT_BYTES).optional(),
        isRepeat: booleanSchema(),
      }).optional(),
      repairedInput: jsonInputSchema().optional(),
      httpStatus: numberSchema().int().optional(),
      applies: literal(true).optional(),
      inSessionCwd: stringSchema().max(4096).optional(),
      withheld: literal(true).optional(),
    }),
  );
  PLUGINS_NOT_SETTLED_TEXT = "this machine has not settled its plugins yet: ask again";
  NO_ENABLED_PLUGIN_TEXT = "no enabled plugin with that id";
  ANTHROPIC_PLUGINABSENCE = "anthropic/pluginAbsence";
  NO_SUCH_HOOK_TEXT = "the plugin declares no such hook for that event here";
  HOOKS_DISABLED_TEXT =
    "this machine keeps the plugin's hooks off (its settings or policy, how it was launched, or a folder nobody has trusted)";
  HOOK_CONDITION_UNKNOWN_TEXT = "this machine could not judge the hook's condition";
});
//@ chunk-m2gb6h8m.js:17172-17193 placement
/**
 * 远程插件钩子调用失败时抛出的错误（携带插件缺席原因等元数据）。
 */
let PluginHookServedCallError; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-m2gb6h8m.js:17172", () => {
  PluginHookServedCallError = class PluginHookServedCallError extends ServedCallError {};
});
//@ chunk-m2gb6h8m.js:17193-17216 placement
/**
 * 远程插件钩子的通用错误类。
 */
class RemotePluginHookError extends Error {}
//@ chunk-m2gb6h8m.js:17216-17322 layout
async function runCommandHook(input, toolName, context) {
  let toolContext = context.toolUseContext();
  return runRemotePluginHook(input, toolContext, (retry) =>
    resyncForMissingEntry(context, toolContext.abortController.signal, retry),
  );
}
//@ chunk-m2gb6h8m.js:17322-17435 layout (2.1.88 match: isHTTPConfig, 0.778)
async function isHTTPConfig(input, toolName, context) {
  let toolContext = context.toolUseContext();
  return runRemotePluginHook(
    input,
    toolContext,
    (retry) => resyncForMissingEntry(context, toolContext.abortController.signal, retry),
    "http",
  );
}
//@ chunk-m2gb6h8m.js:17435-19418 placement
/**
 * 在本机运行另一台机器（远程会话）发来的插件命令钩子：校验插件可用与同步状态、查找匹配的 command 钩子、检查 if 条件、组织托管设置未读时按事件拒绝或挂起，然后执行。
 */
async function runRemotePluginHook(
  input,
  toolUseContext,
  awaitPluginSync,
  hookKind = "command",
  isRepair = false,
) {
  let { storageV5, credentials } = toolUseContext;
  let signal = toolUseContext.abortController.signal;
  let {
    pluginId,
    hookEvent,
    command,
    args,
    headers,
    allowedEnvVars,
    if: condition,
    timeout,
    jsonInput,
    hookIndex,
    isOrgRequired,
  } = runPluginHookInputSchema().parse(input);
  if (hookKind === "http" && marketplaceSuffix(pluginId) !== SYNCED)
    throw Error("only an account plugin's http hooks are sent for another machine");
  if (hookKind === "http" && (hookEvent === "SessionStart" || hookEvent === "Setup"))
    throw new PluginHookServedCallError(NO_SUCH_HOOK_TEXT);
  let hookPolicyUnanswered = hookKind === "http" && !isRepair && isHookPolicyUnanswered();
  if (hookKind === "http" && !isRepair && !hookPolicyUnanswered) await settleBeforeHookRun(signal);
  invalidateCommandNames();
  assertPluginHooksAllowed(pluginId);
  if (isBuiltinPluginId(pluginId)) throw Error("a built-in plugin's hooks are not run for another machine");
  let enabledPlugin = await findEnabledPlugin(pluginId, storageV5, credentials);
  if (enabledPlugin.plugin === undefined && awaitPluginSync !== undefined) {
    let syncResult = await awaitPluginSync(async () => {
      enabledPlugin = await findEnabledPlugin(pluginId, storageV5, credentials);
      return enabledPlugin.plugin !== undefined;
    });
    if (enabledPlugin.plugin === undefined)
      enabledPlugin = await findEnabledPlugin(pluginId, storageV5, credentials);
    if (enabledPlugin.plugin === undefined)
      assertPluginSyncSettled(pluginId, syncResult, toolUseContext.session);
  }
  let { plugin } = enabledPlugin;
  if (plugin === undefined)
    throw new PluginHookServedCallError(
      NO_ENABLED_PLUGIN_TEXT,
      marketplaceSuffix(pluginId) === SYNCED
        ? {
            [ANTHROPIC_PLUGINABSENCE]: pluginHookListingStatus(
              pluginId,
              toolUseContext.session.pluginsSync,
              getLastSyncedLaneLoad(),
              enabledPlugin.warnings,
            ),
          }
        : undefined,
    );
  assertSyncedPluginUsable(plugin);
  let found = convertPluginHooksToMatchers(plugin)
    [hookEvent].flatMap((matcher) => matcher.hooks)
    .find((hook) =>
      hook.type === "http"
        ? hookKind === "http" &&
          hook.url === command &&
          import_sortedIndex_2(hook.headers, headers) &&
          import_sortedIndex_2(hook.allowedEnvVars, allowedEnvVars) &&
          hook.if === condition
        : hookKind === "command" &&
          hook.type === "command" &&
          hook.command === command &&
          import_sortedIndex_2(hook.args, args) &&
          (condition === undefined || hook.if === condition),
    );
  if (found === undefined || (found.type !== "command" && found.type !== "http")) {
    let { errors } = await loadAllPluginsCacheOnly(storageV5, credentials);
    let pluginForErrors = plugin;
    if (errors.some((error) => "plugin" in error && error.plugin === pluginForErrors.name))
      throw Error("this machine could not read the plugin's hooks for now");
    throw new PluginHookServedCallError(NO_SUCH_HOOK_TEXT);
  }
  let remoteHookInput = parseRemoteHookInput(jsonInput);
  if (condition !== undefined && found.if && !(await evaluateHookCondition(found.if, remoteHookInput)))
    return {
      summary: "its condition does not hold",
      output: {
        stdout: "",
        stderr: "",
        output: "",
        status: 0,
      },
    };
  signal.throwIfAborted();
  invalidateCommandNames();
  assertPluginHooksAllowed(pluginId);
  assertPluginHooksAllowed(plugin.source);
  assertSyncedPluginUsable(plugin);
  let holdResult = await holdHookUntilManagedSettings(
    hookEvent,
    remoteHookInput.stdin,
    found.type === "http" ? timeout : (timeout ?? found.timeout),
    signal,
    () =>
      isOrgRequired === true ||
      (isManagedOrAllowlistedHook(pluginId) && isManagedOrAllowlistedHook(plugin.source)),
    HOOKS_DISABLED_TEXT,
  );
  if (holdResult === "answered")
    return runRemotePluginHook(input, toolUseContext, awaitPluginSync, hookKind, isRepair);
  if (holdResult !== undefined) return holdResult;
  if (found.type === "http") {
    if (hookPolicyUnanswered) {
      await settleBeforeHookRun(signal);
      return runRemotePluginHook(input, toolUseContext, awaitPluginSync, hookKind, true);
    }
    let httpResult = await runHttpHook(
      {
        ...found,
        timeout,
      },
      hookEvent,
      remoteHookInput.stdin,
      timeout,
      signal,
      undefined,
      undefined,
    );
    return {
      summary: `exit ${httpResult.status}`,
      output: fitHookResult(
        {
          ...shrinkHookStdout(httpResult, hookEvent),
          repairedInput: remoteHookInput.repairedInput,
        },
        hookEvent,
      ),
    };
  }
  return runCommandHookWithTimeout(
    {
      ...found,
      timeout: timeout ?? found.timeout,
    },
    hookEvent,
    remoteHookInput,
    hookIndex,
    toolUseContext,
    {
      root: plugin.path,
      id: plugin.source,
    },
  );
}
//@ chunk-m2gb6h8m.js:23284-23441 placement
function dropMcpUpdatedOutput(output) {
  let hookSpecificOutput = output.hookSpecificOutput;
  if (!isPlainObject(hookSpecificOutput) || !("updatedToolOutput" in hookSpecificOutput)) return output;
  let { updatedMCPToolOutput, ...rest } = hookSpecificOutput;
  return {
    ...output,
    hookSpecificOutput: rest,
  };
}
//@ chunk-m2gb6h8m.js:23441-23499 placement
function withDroppedOutputNote(text) {
  return typeof text === "string"
    ? `${HOOK_OUTPUT_DROPPED_TEXT}
${text}`
    : HOOK_OUTPUT_DROPPED_TEXT;
}
export {
  remoteHookCallerSchema,
  jsonInputSchema,
  PATH_FIELD_NAME_REGEX,
  PATH_LIKE_FIELDS,
  PluginHookServedCallError,
  HOOK_CONDITION_UNKNOWN_TEXT,
  fitHookResult,
  shrinkHookStdout,
  RemotePluginHookError,
  POLICY_UNREADABLE_TEXT,
  HOOKS_DISABLED_TEXT,
  policyLoadFailureRefusesPluginHooks,
  POLICY_BLOCKS_START_TEXT,
  PLUGINS_NOT_SETTLED_TEXT,
  HOOK_OUTPUT_MAX_CHARS,
  HOOK_OUTPUT_CUT_TEXT,
  HOOK_DROPPED_FIELDS,
  HOOK_TEXT_FIELDS,
  HOOK_UPDATED_OUTPUT_FIELDS,
  withDroppedOutputNote,
  runRemotePluginHook,
  runPluginHookInputSchema,
  MAX_HOOK_RESULT_BYTES,
  RUNPLUGINHOOK,
  runCommandHook,
  RUNPLUGINHOOKIF,
  RUNPLUGINHTTPHOOK,
  isHTTPConfig,
};

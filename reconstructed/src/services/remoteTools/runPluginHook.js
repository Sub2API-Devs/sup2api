/**
 * services/remoteTools/runPluginHook.ts
 *
 * 2.1.316 新增。远程执行插件钩子。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzb0qnrm.js (13)
 * attribution: placement 13
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
import { u, string, _enum, array, E, M, record, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { byteLengthOfJson } from "./commandRendering.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { ServedCallError } from "../mcpServe/servedCallError.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { isBuiltinPluginId } from "../../plugins/builtinPlugins.js";
import { convertPluginHooksToMatchers } from "../../utils/plugins/loadPluginHooks.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isManagedOrAllowlistedHook } from "../../utils/hooks/managedHooksOnly.js";
import { isPlainObject } from "../../utils/isPlainObject.js";

//@ chunk-bzb0qnrm.js:1583-1630 placement
/**
 * 策略加载失败或策略 helper 有致命错误时，拒绝在本机运行插件钩子。
 */
function policyLoadFailureRefusesPluginHooks() {
  return (
    adminPolicyLoadFailureRefusesLaunch() ||
    findFatalPolicyHelperError(getPolicyHelperSourceLoadErrors()) !== undefined
  );
}
//@ chunk-bzb0qnrm.js:1630-2385 placement
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
    let c = stripInvisibleChars(pluginId);
    let a = new Set();
    for (let [h, S] of lastCompleteList.dirsById)
      for (let P of S) if (stripInvisibleChars(syncedPluginFolderId(P)) === c) a.add(h);
    if (a.size === 0) return "absent_from_listing";
    let found = lastSyncedLaneLoad.find(
      (h) => h.bucket === lastCompleteList.bucket && h.pluginId !== undefined && a.has(h.pluginId),
    );
    switch (found?.outcome) {
      case undefined:
        return "no_copy_at_load";
      case "held_back":
        return "held_back";
      case "not_loaded": {
        let h = joinPluginId(found.pluginName, SYNCED);
        return warnings.some((S) => S.type === "synced-plugin-shadowed" && S.source === h)
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
//@ chunk-bzb0qnrm.js:2385-2806 placement
/**
 * RunPluginHook/RunPluginHookIf 的输入 schema 与相关 schema（调用方、jsonInput）以及路径字段名正则。
 */
var RUNPLUGINHOOK = "RunPluginHook";
var RUNPLUGINHOOKIF = "RunPluginHookIf";
var runPluginHookInputSchema = DoctorLazy(() =>
  u({
    pluginId: string(),
    hookEvent: _enum(HOOK_EVENTS),
    command: string(),
    args: array(string()).optional(),
    if: string().optional(),
    timeout: E().positive().optional(),
    jsonInput: string(),
    hookIndex: E().int().nonnegative().optional(),
    isOrgRequired: M().optional(),
  }),
);
var remoteHookCallerSchema = DoctorLazy(() =>
  u({
    session_id: string().regex(SAFE_CALLER_ID),
    cwd: string(),
    effort: u({
      level: string().regex(SAFE_CALLER_ID),
    }).optional(),
  }),
);
var jsonInputSchema = DoctorLazy(() => record(string(), unknown()));
var PATH_FIELD_NAME_REGEX = /(?:^|_)(?:path|dir|cwd|directory)$/;
//@ chunk-bzb0qnrm.js:2806-2887 placement
/**
 * 钩子输入里的路径类字段与钩子结果字节上限。
 */
var PATH_LIKE_FIELDS = new Set(["file_path", "trigger_file_path", "parent_file_path"]);
var MAX_HOOK_RESULT_BYTES = 1048576;
//@ chunk-bzb0qnrm.js:2887-3448 placement
/**
 * 远程钩子执行的提示文字与限制：策略不可读/会阻止启动、输出过长、需截断的文本字段与输出字段、被丢弃的字段。
 */
var POLICY_UNREADABLE_TEXT = "this machine's policy cannot be read for now";
var POLICY_BLOCKS_START_TEXT = "this machine's policy would stop claude from starting";
var HOOK_OUTPUT_CUT_TEXT = "The hook printed more than is passed on.";
var HOOK_OUTPUT_MAX_CHARS = 16384;
var HOOK_TEXT_FIELDS = new Set([
  "reason",
  "stopReason",
  "systemMessage",
  "additionalContext",
  "permissionDecisionReason",
  "message",
  "sessionTitle",
  "classifierContext",
]);
var HOOK_UPDATED_OUTPUT_FIELDS = new Set(["updatedToolOutput", "updatedMCPToolOutput"]);
var HOOK_OUTPUT_DROPPED_TEXT =
  "A hook changed a tool's result, and the change was too long to pass on, so Claude read the result as the tool gave it.";
var HOOK_DROPPED_FIELDS = new Set(["terminalSequence", "rewakeSummary", "metrics", "watchPaths"]);
//@ chunk-bzb0qnrm.js:3448-3949 placement
/**
 * 让远程钩子执行结果不超过大小上限：依次替换 output、stderr、stdout 为截断说明；可安全放行的事件直接改为失败结果。
 */
function fitHookResult(result, event) {
  if (byteLengthOfJson(result) <= MAX_HOOK_RESULT_BYTES) return result;
  let r = {
    ...result,
    output: HOOK_OUTPUT_CUT_TEXT,
    missingScript: undefined,
    repairedInput: undefined,
  };
  if (byteLengthOfJson(r) <= MAX_HOOK_RESULT_BYTES) return r;
  let s = {
    ...r,
    stderr: HOOK_OUTPUT_CUT_TEXT,
    ...(isElicitationFailureExit(event, result.status) && {
      stdioClosedWithoutEnd: true,
    }),
  };
  if (byteLengthOfJson(s) <= MAX_HOOK_RESULT_BYTES) return s;
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
  let i = {
    ...s,
    stdout: "",
    stdioClosedWithoutEnd: true,
  };
  let c = {
    ...i,
    stderr: result.stderr,
  };
  return result.stderr !== "" && byteLengthOfJson(c) <= MAX_HOOK_RESULT_BYTES ? c : i;
}
//@ chunk-bzb0qnrm.js:3949-4413 placement
/**
 * 钩子标准输出超限时重写：解析为 JSON 则截断字段后重新序列化（阻断类结果保留关键字段），否则截断原文。
 */
function shrinkHookStdout(e, n) {
  if (
    e.status === 2 ||
    e.aborted ||
    e.stdioIncomplete ||
    e.stdioClosedWithoutEnd ||
    fitHookResult(e, n).stdout === e.stdout
  )
    return e;
  let { json, validationError } = parseHookOutput(e.stdout);
  if (json !== undefined)
    try {
      let i = dropMcpUpdatedOutput(truncateHookOutput(json));
      let c = jsonStringify(i);
      let a = i.continue === false || i.decision === "block";
      return {
        ...e,
        stdout:
          a &&
          fitHookResult(
            {
              ...e,
              stdout: c,
            },
            n,
          ).stdout !== c
            ? jsonStringify(SyncHookJSONOutputSchema(i))
            : c,
      };
    } catch (error) {
      logForDebugging(`a hook's answer could not be written again: ${errorMessage(error)}`, {
        level: "error",
      });
      return e;
    }
  return {
    ...e,
    stdout: validationError === undefined ? truncateHookField(e.stdout) : `${truncateHookField(e.stdout)}}`,
  };
}
//@ chunk-bzb0qnrm.js:4413-5143 placement
/**
 * 远程插件钩子被拒绝时的固定文案（插件未结算、无此插件、无此钩子、钩子被禁用、条件无法判断）与结果 schema。
 */
var RUN_PLUGIN_HOOK_REFUSALS = DoctorLazy(() =>
  u({
    stdout: string(),
    stderr: string(),
    output: string(),
    status: E(),
    aborted: M().optional(),
    spawnFailed: M().optional(),
    notStarted: M().optional(),
    stdioIncomplete: M().optional(),
    stdioClosedWithoutEnd: M().optional(),
    runsInBackground: M().optional(),
    missingScript: u({
      scriptPath: string().max(MAX_HOOK_RESULT_BYTES),
      cutFrom: string().max(MAX_HOOK_RESULT_BYTES).optional(),
      isRepeat: M(),
    }).optional(),
    repairedInput: jsonInputSchema().optional(),
  }),
);
var PLUGINS_NOT_SETTLED_TEXT = "this machine has not settled its plugins yet: ask again";
var NO_ENABLED_PLUGIN_TEXT = "no enabled plugin with that id";
var ANTHROPIC_PLUGINABSENCE = "anthropic/pluginAbsence";
var NO_SUCH_HOOK_TEXT = "the plugin declares no such hook for that event here";
var HOOKS_DISABLED_TEXT =
  "this machine keeps the plugin's hooks off (its settings or policy, how it was launched, or a folder nobody has trusted)";
var HOOK_CONDITION_UNKNOWN_TEXT = "this machine could not judge the hook's condition";
//@ chunk-bzb0qnrm.js:5143-5164 placement
/**
 * 远程插件钩子调用失败时抛出的错误（携带插件缺席原因等元数据）。
 */
class PluginHookServedCallError extends ServedCallError {}
//@ chunk-bzb0qnrm.js:5164-5187 placement
/**
 * 远程插件钩子的通用错误类。
 */
class RemotePluginHookError extends Error {}
//@ chunk-bzb0qnrm.js:5293-6622 placement
/**
 * 在本机运行另一台机器（远程会话）发来的插件命令钩子：校验插件可用与同步状态、查找匹配的 command 钩子、检查 if 条件、组织托管设置未读时按事件拒绝或挂起，然后执行。
 */
async function runRemotePluginHook(e, n, r) {
  let { storageV5, credentials } = n;
  let signal = n.abortController.signal;
  let {
    pluginId,
    hookEvent,
    command,
    args,
    if: P,
    timeout,
    jsonInput,
    hookIndex,
    isOrgRequired,
  } = runPluginHookInputSchema().parse(e);
  invalidateCommandNames();
  assertPluginHooksAllowed(pluginId);
  if (isBuiltinPluginId(pluginId)) throw Error("a built-in plugin's hooks are not run for another machine");
  let enabledPlugin = await findEnabledPlugin(pluginId, storageV5, credentials);
  if (enabledPlugin.plugin === undefined && r !== undefined) {
    let k = await r(async () => {
      enabledPlugin = await findEnabledPlugin(pluginId, storageV5, credentials);
      return enabledPlugin.plugin !== undefined;
    });
    if (enabledPlugin.plugin === undefined)
      enabledPlugin = await findEnabledPlugin(pluginId, storageV5, credentials);
    if (enabledPlugin.plugin === undefined) assertPluginSyncSettled(pluginId, k, n.session);
  }
  let { plugin } = enabledPlugin;
  if (plugin === undefined)
    throw new PluginHookServedCallError(
      NO_ENABLED_PLUGIN_TEXT,
      marketplaceSuffix(pluginId) === SYNCED
        ? {
            [ANTHROPIC_PLUGINABSENCE]: pluginHookListingStatus(
              pluginId,
              n.session.pluginsSync,
              getLastSyncedLaneLoad(),
              enabledPlugin.warnings,
            ),
          }
        : undefined,
    );
  assertSyncedPluginUsable(plugin);
  let found = convertPluginHooksToMatchers(plugin)
    [hookEvent].flatMap((k) => k.hooks)
    .find(
      (k) =>
        k.type === "command" && k.command === command && En(k.args, args) && (P === undefined || k.if === P),
    );
  if (found === undefined || found.type !== "command") {
    let { errors } = await loadAllPluginsCacheOnly(storageV5, credentials);
    let Q = plugin;
    if (errors.some((error) => "plugin" in error && error.plugin === Q.name))
      throw Error("this machine could not read the plugin's hooks for now");
    throw new PluginHookServedCallError(NO_SUCH_HOOK_TEXT);
  }
  let remoteHookInput = parseRemoteHookInput(jsonInput);
  if (P !== undefined && found.if && !(await evaluateHookCondition(found.if, remoteHookInput)))
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
  assertPluginHooksAllowed(plugin.source);
  assertSyncedPluginUsable(plugin);
  let N = await holdHookUntilManagedSettings(
    hookEvent,
    remoteHookInput.stdin,
    timeout ?? found.timeout,
    signal,
    () => isOrgRequired === true || isManagedOrAllowlistedHook(plugin.source),
    HOOKS_DISABLED_TEXT,
  );
  if (N === "answered") return runRemotePluginHook(e, n, r);
  if (N !== undefined) return N;
  return runCommandHookWithTimeout(
    {
      ...found,
      timeout: timeout ?? found.timeout,
    },
    hookEvent,
    remoteHookInput,
    hookIndex,
    n,
    {
      root: plugin.path,
      id: plugin.source,
    },
  );
}
//@ chunk-bzb0qnrm.js:10468-10625 placement
function dropMcpUpdatedOutput(e) {
  let hookSpecificOutput = e.hookSpecificOutput;
  if (!isPlainObject(hookSpecificOutput) || !("updatedToolOutput" in hookSpecificOutput)) return e;
  let { updatedMCPToolOutput, ...s } = hookSpecificOutput;
  return {
    ...e,
    hookSpecificOutput: s,
  };
}
//@ chunk-bzb0qnrm.js:10625-10680 placement
function withDroppedOutputNote(e) {
  return typeof e === "string"
    ? `${HOOK_OUTPUT_DROPPED_TEXT}
${e}`
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
  RUNPLUGINHOOKIF,
};

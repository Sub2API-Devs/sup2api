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
import { brr, wie } from "../plugins/accountSync/syncedPluginHooks.js";
import { getPluginsSyncVetoed, getLastSyncedLaneLoad } from "../../bootstrap/state.js";
import { stripInvisibleChars } from "../../utils/plugins/syncedItems.js";
import { syncedPluginFolderId, loadAllPluginsCacheOnly } from "../../utils/plugins/pluginLoader.js";
import { joinPluginId, marketplaceSuffix } from "../../utils/plugins/pluginIdentifier.js";
import { SYNCED } from "../../utils/telemetry/pluginTelemetry.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logError } from "../../utils/log.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, U, A, E, M, pe, oe } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { Xje } from "./commandRendering.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { ServedCallError } from "../mcpServe/servedCallError.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import { isBuiltinPluginId } from "../../plugins/builtinPlugins.js";
import { convertPluginHooksToMatchers } from "../../utils/plugins/loadPluginHooks.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { eKt } from "../../utils/hooks/managedHooksOnly.js";
import { isPlainObject } from "../../utils/isPlainObject.js";

//@ chunk-bzb0qnrm.js:1583-1630 placement
function Avr() {
  return (
    adminPolicyLoadFailureRefusesLaunch() ||
    findFatalPolicyHelperError(getPolicyHelperSourceLoadErrors()) !== void 0
  );
}
//@ chunk-bzb0qnrm.js:1630-2385 placement
function pluginHookListingStatus(
  e,
  { accountListing: accountListing, lastCompleteList: lastCompleteList },
  s,
  i,
) {
  try {
    if (!brr()) return "sync_not_armed";
    if (!wie() || getPluginsSyncVetoed()) return "sync_off";
    if (accountListing === "refused") return "listing_refused";
    if (lastCompleteList === null || s === null) return "unknown";
    let c = stripInvisibleChars(e),
      a = new Set();
    for (let [h, S] of lastCompleteList.dirsById)
      for (let P of S) if (stripInvisibleChars(syncedPluginFolderId(P)) === c) a.add(h);
    if (a.size === 0) return "absent_from_listing";
    let found = s.find(
      (h) => h.bucket === lastCompleteList.bucket && h.pluginId !== void 0 && a.has(h.pluginId),
    );
    switch (found?.outcome) {
      case void 0:
        return "no_copy_at_load";
      case "held_back":
        return "held_back";
      case "not_loaded": {
        let h = joinPluginId(found.pluginName, SYNCED);
        return i.some((S) => S.type === "synced-plugin-shadowed" && S.source === h)
          ? "local_copy_wins"
          : "not_loaded";
      }
      case "loaded":
        return "unknown";
    }
  } catch (error) {
    return (logForDiagnosticsNoPII("warn", "plugins_sync_absence_unreadable"), logError(error), "unknown");
  }
}
//@ chunk-bzb0qnrm.js:2385-2806 placement
var RUNPLUGINHOOK = "RunPluginHook",
  RUNPLUGINHOOKIF = "RunPluginHookIf",
  ufo = DoctorLazy(() =>
    u({
      pluginId: o(),
      hookEvent: U(HOOK_EVENTS),
      command: o(),
      args: A(o()).optional(),
      if: o().optional(),
      timeout: E().positive().optional(),
      jsonInput: o(),
      hookIndex: E().int().nonnegative().optional(),
      isOrgRequired: M().optional(),
    }),
  ),
  ot = DoctorLazy(() =>
    u({
      session_id: o().regex(SAFE_CALLER_ID),
      cwd: o(),
      effort: u({ level: o().regex(SAFE_CALLER_ID) }).optional(),
    }),
  ),
  q = DoctorLazy(() => pe(o(), oe())),
  et = /(?:^|_)(?:path|dir|cwd|directory)$/;
//@ chunk-bzb0qnrm.js:2806-2887 placement
var nt = new Set(["file_path", "trigger_file_path", "parent_file_path"]),
  Qft = 1048576;
/**
 * 远程钩子执行的提示文字与限制：策略不可读/会阻止启动、输出过长、需截断的文本字段与输出字段、被丢弃的字段。
 */
//@ chunk-bzb0qnrm.js:2887-3448 placement
var POLICY_UNREADABLE_TEXT = "this machine's policy cannot be read for now",
  POLICY_BLOCKS_START_TEXT = "this machine's policy would stop claude from starting",
  HOOK_OUTPUT_CUT_TEXT = "The hook printed more than is passed on.",
  HOOK_OUTPUT_MAX_CHARS = 16384,
  HOOK_TEXT_FIELDS = new Set([
    "reason",
    "stopReason",
    "systemMessage",
    "additionalContext",
    "permissionDecisionReason",
    "message",
    "sessionTitle",
    "classifierContext",
  ]),
  HOOK_UPDATED_OUTPUT_FIELDS = new Set(["updatedToolOutput", "updatedMCPToolOutput"]),
  HOOK_OUTPUT_DROPPED_TEXT =
    "A hook changed a tool's result, and the change was too long to pass on, so Claude read the result as the tool gave it.",
  HOOK_DROPPED_FIELDS = new Set(["terminalSequence", "rewakeSummary", "metrics", "watchPaths"]);
/**
 * 让远程钩子执行结果不超过大小上限：依次替换 output、stderr、stdout 为截断说明；可安全放行的事件直接改为失败结果。
 */
//@ chunk-bzb0qnrm.js:3448-3949 placement
function fitHookResult(result, event) {
  if (Xje(result) <= Qft) return result;
  let r = { ...result, output: HOOK_OUTPUT_CUT_TEXT, missingScript: void 0, repairedInput: void 0 };
  if (Xje(r) <= Qft) return r;
  let s = {
    ...r,
    stderr: HOOK_OUTPUT_CUT_TEXT,
    ...(isElicitationFailureExit(event, result.status) && { stdioClosedWithoutEnd: !0 }),
  };
  if (Xje(s) <= Qft) return s;
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
      spawnFailed: !0,
      ...(result.aborted && { aborted: !0 }),
    };
  let i = { ...s, stdout: "", stdioClosedWithoutEnd: !0 },
    c = { ...i, stderr: result.stderr };
  return result.stderr !== "" && Xje(c) <= Qft ? c : i;
}
/**
 * 钩子标准输出超限时重写：解析为 JSON 则截断字段后重新序列化（阻断类结果保留关键字段），否则截断原文。
 */
//@ chunk-bzb0qnrm.js:3949-4413 placement
function shrinkHookStdout(e, n) {
  if (
    e.status === 2 ||
    e.aborted ||
    e.stdioIncomplete ||
    e.stdioClosedWithoutEnd ||
    fitHookResult(e, n).stdout === e.stdout
  )
    return e;
  let { json: json, validationError: validationError } = parseHookOutput(e.stdout);
  if (json !== void 0)
    try {
      let i = dropMcpUpdatedOutput(truncateHookOutput(json)),
        c = jsonStringify(i),
        a = i.continue === !1 || i.decision === "block";
      return {
        ...e,
        stdout:
          a && fitHookResult({ ...e, stdout: c }, n).stdout !== c
            ? jsonStringify(SyncHookJSONOutputSchema(i))
            : c,
      };
    } catch (error) {
      return (
        logForDebugging(`a hook's answer could not be written again: ${errorMessage(error)}`, {
          level: "error",
        }),
        e
      );
    }
  return {
    ...e,
    stdout: validationError === void 0 ? truncateHookField(e.stdout) : `${truncateHookField(e.stdout)}}`,
  };
}
//@ chunk-bzb0qnrm.js:4413-5143 placement
var RUN_PLUGIN_HOOK_REFUSALS = DoctorLazy(() =>
    u({
      stdout: o(),
      stderr: o(),
      output: o(),
      status: E(),
      aborted: M().optional(),
      spawnFailed: M().optional(),
      notStarted: M().optional(),
      stdioIncomplete: M().optional(),
      stdioClosedWithoutEnd: M().optional(),
      runsInBackground: M().optional(),
      missingScript: u({
        scriptPath: o().max(Qft),
        cutFrom: o().max(Qft).optional(),
        isRepeat: M(),
      }).optional(),
      repairedInput: q().optional(),
    }),
  ),
  dt = "this machine has not settled its plugins yet: ask again",
  lt = "no enabled plugin with that id",
  ANTHROPIC_PLUGINABSENCE = "anthropic/pluginAbsence",
  pt = "the plugin declares no such hook for that event here",
  W =
    "this machine keeps the plugin's hooks off (its settings or policy, how it was launched, or a folder nobody has trusted)",
  mt = "this machine could not judge the hook's condition";
//@ chunk-bzb0qnrm.js:5143-5164 placement
class C_2 extends ServedCallError {}
//@ chunk-bzb0qnrm.js:5164-5187 placement
class O extends Error {}
/**
 * 在本机运行另一台机器（远程会话）发来的插件命令钩子：校验插件可用与同步状态、查找匹配的 command 钩子、检查 if 条件、组织托管设置未读时按事件拒绝或挂起，然后执行。
 */
//@ chunk-bzb0qnrm.js:5293-6622 placement
async function runRemotePluginHook(e, n, r) {
  let { storageV5: storageV5, credentials: credentials } = n,
    signal = n.abortController.signal,
    {
      pluginId: pluginId,
      hookEvent: hookEvent,
      command: command,
      args: args,
      if: P,
      timeout: timeout,
      jsonInput: jsonInput,
      hookIndex: hookIndex,
      isOrgRequired: isOrgRequired,
    } = ufo().parse(e);
  if ((or(), assertPluginHooksAllowed(pluginId), isBuiltinPluginId(pluginId)))
    throw Error("a built-in plugin's hooks are not run for another machine");
  let y = await findEnabledPlugin(pluginId, storageV5, credentials);
  if (y.plugin === void 0 && r !== void 0) {
    let k = await r(
      async () => ((y = await findEnabledPlugin(pluginId, storageV5, credentials)), y.plugin !== void 0),
    );
    if (y.plugin === void 0) y = await findEnabledPlugin(pluginId, storageV5, credentials);
    if (y.plugin === void 0) assertPluginSyncSettled(pluginId, k, n.session);
  }
  let { plugin: plugin } = y;
  if (plugin === void 0)
    throw new C_2(
      lt,
      marketplaceSuffix(pluginId) === SYNCED
        ? {
            [ANTHROPIC_PLUGINABSENCE]: pluginHookListingStatus(
              pluginId,
              n.session.pluginsSync,
              getLastSyncedLaneLoad(),
              y.warnings,
            ),
          }
        : void 0,
    );
  assertSyncedPluginUsable(plugin);
  let found = convertPluginHooksToMatchers(plugin)
    [hookEvent].flatMap((k) => k.hooks)
    .find(
      (k) =>
        k.type === "command" && k.command === command && En(k.args, args) && (P === void 0 || k.if === P),
    );
  if (found === void 0 || found.type !== "command") {
    let { errors: errors } = await loadAllPluginsCacheOnly(storageV5, credentials),
      Q = plugin;
    if (errors.some((F) => "plugin" in F && F.plugin === Q.name))
      throw Error("this machine could not read the plugin's hooks for now");
    throw new C_2(pt);
  }
  let z = parseRemoteHookInput(jsonInput);
  if (P !== void 0 && found.if && !(await evaluateHookCondition(found.if, z)))
    return {
      summary: "its condition does not hold",
      output: { stdout: "", stderr: "", output: "", status: 0 },
    };
  (signal.throwIfAborted(), or(), assertPluginHooksAllowed(plugin.source), assertSyncedPluginUsable(plugin));
  let N = await holdHookUntilManagedSettings(
    hookEvent,
    z.stdin,
    timeout ?? found.timeout,
    signal,
    () => isOrgRequired === !0 || eKt(plugin.source),
    W,
  );
  if (N === "answered") return runRemotePluginHook(e, n, r);
  if (N !== void 0) return N;
  return runCommandHookWithTimeout(
    { ...found, timeout: timeout ?? found.timeout },
    hookEvent,
    z,
    hookIndex,
    n,
    { root: plugin.path, id: plugin.source },
  );
}
//@ chunk-bzb0qnrm.js:10468-10625 placement
function dropMcpUpdatedOutput(e) {
  let hookSpecificOutput = e.hookSpecificOutput;
  if (!isPlainObject(hookSpecificOutput) || !("updatedToolOutput" in hookSpecificOutput)) return e;
  let { updatedMCPToolOutput: updatedMCPToolOutput, ...s } = hookSpecificOutput;
  return { ...e, hookSpecificOutput: s };
}
//@ chunk-bzb0qnrm.js:10625-10680 placement
function Y(e) {
  return typeof e === "string"
    ? `${HOOK_OUTPUT_DROPPED_TEXT}
${e}`
    : HOOK_OUTPUT_DROPPED_TEXT;
}

export {
  ot,
  q,
  et,
  nt,
  C_2,
  mt,
  fitHookResult,
  shrinkHookStdout,
  O,
  POLICY_UNREADABLE_TEXT,
  W,
  Avr,
  POLICY_BLOCKS_START_TEXT,
  dt,
  HOOK_OUTPUT_MAX_CHARS,
  HOOK_OUTPUT_CUT_TEXT,
  HOOK_DROPPED_FIELDS,
  HOOK_TEXT_FIELDS,
  HOOK_UPDATED_OUTPUT_FIELDS,
  Y,
  runRemotePluginHook,
  ufo,
  Qft,
  RUNPLUGINHOOK,
  RUNPLUGINHOOKIF,
};

/**
 * services/mcpServe/hookCalls.ts
 *
 * 2.1.316 新增：mcp serve 钩子调用：列出并运行项目/技能/托管钩子。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy9dbk5f.js (17)
 * attribution: placement 17
 */
import { homedir } from "os";
import { join } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  array,
  _enum,
  u,
  record,
  string,
  unknown,
  M,
  zodStrictObject,
  E,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  HEARTBEAT_SETTINGS_SOURCES,
  MAX_HEARTBEAT_BYTES,
  watchRepoSettingsChanges,
  getSettingsFilesStamp,
} from "../../entrypoints/mcp/progressHeartbeat.js";
import { runPluginHookInputSchema, MAX_HOOK_RESULT_BYTES } from "../remoteTools/runPluginHook.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import {
  assertHooksPolicyReady,
  HOOK_EVENTS,
  parseRemoteHookInput,
  HookInputUnionSchema,
  evaluateHookCondition,
  runCommandHookWithTimeout,
  findEnabledPlugin,
  assertHooksNotDisabled,
  assertSyncedPluginUsable,
  assertPluginSyncSettled,
  holdHookUntilManagedSettings,
} from "../../entrypoints/sdk/coreSchemas.js";
import {
  byteLengthOfJson,
  findLocalSkillCommand,
  readHostCatalogSkill,
  resyncForMissingEntry,
  skillUnavailableReason,
} from "../remoteTools/commandRendering.js";
import {
  rememberedScriptsRegistry,
  rememberBounded,
  expandHookPathVariables,
  detectMissingHookScript,
} from "../../utils/hooks/hookCommandResolution.js";
import { hookMatchQuery, hookMatcherMatches, shouldSkipHookDueToTrust } from "../../utils/hooks.js";
import { getHookDisplayText } from "../../utils/hooks/hooksSettings.js";
import { defaultShellKind } from "../../utils/shell/shellToolUtils.js";
import { getProjectConfigRoot, getProjectRoot } from "../../bootstrap/state.js";
import { getPlatform } from "../../utils/platform.js";
import { env } from "../../utils/env.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  shouldDisableAllHooksIncludingManaged,
  shouldAllowManagedHooksOnly,
  shouldSkipSessionHooksByPolicy,
} from "../../utils/hooks/hooksConfigSnapshot.js";
import { ServedCallError } from "./servedCallError.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";
import { getSettingsForSource, getSettingsParseErrorsForSource } from "../../utils/settings/settings.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { HookCommandSchema } from "../../schemas/hooks.js";
import { clearSkillCaches } from "../../skills/loadSkillsDir.js";
import { stripSyncedSkillPrefix, isValidSkillDirName } from "../../skills/syncedSkills.js";
import { HOST_SKILLS_MOUNT, PUBLIC } from "../../skills/hostSkillMounts.js";
import { isDefined, checkSyncedSkillAccess } from "../../utils/claudeAiSync/syncedSkillAccess.js";
import { isVouchedMarketplaceRef } from "../../utils/permissions/permissionsLoader.js";

//@ chunk-wy9dbk5f.js:20080-20581 placement
/**
 * 按宿主保存的钩子状态。
 */
var LISTPROJECTHOOKS = "ListProjectHooks";
var RUNPROJECTHOOK = "RunProjectHook";
var MAX_HOOK_OUTPUT_BYTES = 262144;
var MAX_HOOKS = 200;
var MAX_HOOK_INPUT_BYTES = 16384;
var MAX_HOOK_STDERR_BYTES = 8192;
var hookSourceSchema = DoctorLazy(() => array(_enum(HEARTBEAT_SETTINGS_SOURCES)));
var listHooksInputSchema = DoctorLazy(() =>
  u({
    sources: hookSourceSchema(),
  }),
);
var listHooksResultSchema = DoctorLazy(() =>
  u({
    hooks: record(string(), array(unknown())),
    cut: M(),
    leftOut: array(string()),
    unreadable: M(),
    stamp: string().max(MAX_HEARTBEAT_BYTES),
    sources: array(string()),
  }),
);
var runHookInputSchema = DoctorLazy(() =>
  runPluginHookInputSchema()
    .omit({
      pluginId: true,
    })
    .extend({
      shell: string().optional(),
      inBackground: M().optional(),
      asksWhichCopy: M().optional(),
      sources: hookSourceSchema(),
    }),
);
var NOT_APPLICABLE_RESULT = {
  summary: "it does not apply to this event",
  output: {
    stdout: "",
    stderr: "",
    output: "",
    status: 0,
  },
};
var hookStateByHost = new HostScoped(() => ({
  hooks: new Map(),
}));
//@ chunk-wy9dbk5f.js:20581-21319 placement
async function serveListProjectHooks(e, r, n) {
  let s = n?.tellToolListChanged === undefined ? undefined : hookStateByHost.of(n.session.host);
  if (n?.tellToolListChanged !== undefined && s !== undefined)
    watchRepoSettingsChanges(n.session.host, n.tellToolListChanged, () => refreshHookSnapshot(s));
  let stamp = await getSettingsFilesStamp();
  let c = {};
  let y = new Set();
  let g = 0;
  let h = 0;
  let S = 0;
  let C = 0;
  let b = false;
  let R = usableHookSources(listHooksInputSchema().parse(e).sources);
  invalidateCommandNames();
  let x = hooksDisabledForSources(R);
  assertHooksPolicyReady();
  if (s !== undefined) refreshHookSnapshot(s, R);
  let unreadable = !x && R.some(isSourceUnparseable);
  for (let O of x ? [] : HOOK_EVENTS)
    for (let { matcher, hooks } of collectHookMatchers(O, R))
      for (let hook of hooks) {
        if (hook.type !== "command") {
          y.add(O);
          continue;
        }
        let B = {
          matcher,
          hooks: [hook],
        };
        let H = byteLengthOfJson(B);
        let Y = hook.args?.length ?? 0;
        let Q = matcher?.length ?? 0;
        if (
          g === MAX_HOOKS ||
          h + H > MAX_HOOK_OUTPUT_BYTES ||
          S + Y > MAX_HOOK_STDERR_BYTES ||
          C + Q > MAX_HOOK_INPUT_BYTES
        ) {
          b = true;
          continue;
        }
        g++;
        h += H;
        S += Y;
        C += Q;
        (c[O] ??= []).push(B);
      }
  return {
    summary: `${g} hooks${b ? ", cut at a limit" : ""}`,
    output: {
      hooks: c,
      cut: b,
      leftOut: [...y],
      unreadable,
      stamp,
      sources: R,
    },
  };
}
//@ chunk-wy9dbk5f.js:21319-21423 placement
var NO_SUCH_HOOK_MESSAGE = "the repo declares no such hook for that event now";
var REPO_HOOKS_OFF_MESSAGE = "this machine keeps the repo's hooks off";
//@ chunk-wy9dbk5f.js:21423-22643 placement
async function serveRunProjectHook(e, r, n) {
  let s = n.toolUseContext();
  let a = runHookInputSchema().parse(e);
  let remoteHookInput = parseRemoteHookInput(a.jsonInput);
  let y = HookInputUnionSchema().safeParse(remoteHookInput.stdin).data;
  let projectHook = findProjectHook(a, y, n.session.host);
  if (projectHook?.if) {
    if (!(await evaluateHookCondition(projectHook.if, remoteHookInput))) return NOT_APPLICABLE_RESULT;
    projectHook = findProjectHook(a, y, n.session.host);
  }
  s.abortController.signal.throwIfAborted();
  if (projectHook === undefined) return NOT_APPLICABLE_RESULT;
  if (a.asksWhichCopy)
    return {
      summary: "it applies",
      output: {
        ...NOT_APPLICABLE_RESULT.output,
        runsInBackground: projectHook.asyncRewake === true,
      },
    };
  let h = await runCommandHookWithTimeout(
    {
      ...projectHook,
      timeout: a.timeout ?? projectHook.timeout,
    },
    a.hookEvent,
    remoteHookInput,
    a.hookIndex,
    s,
    undefined,
    false,
    undefined,
    a.inBackground,
  );
  if (!projectHook.asyncRewake) return h;
  let S = rememberedScriptsRegistry.of(n.session.host);
  let C = y && hookMatchQuery(y);
  let R = `${C ? `${a.hookEvent}:${C}` : a.hookEvent}
${getHookDisplayText(projectHook)}`;
  if (h.output.status !== 2) {
    rememberBounded(S, R, undefined);
    return h;
  }
  let x = (projectHook.shell ?? defaultShellKind()) === "powershell";
  let w = projectHook.args !== undefined;
  let O = expandHookPathVariables({
    command: projectHook.command,
    args: projectHook.args,
    pluginRoot: undefined,
    projectDir: getProjectConfigRoot() ?? getProjectRoot(),
    homeDir: homedir(),
    windowsBash: getPlatform() === "windows" && !x && !w,
    posixShell: !x && !w && !env.CLAUDE_CODE_SHELL_PREFIX,
  });
  let missingHookScript = await detectMissingHookScript({
    stdout: h.output.stdout,
    stderr: h.output.stderr,
    scriptPaths: O.map((j) => j.path),
  });
  if (missingHookScript === undefined) {
    rememberBounded(S, R, undefined);
    return h;
  }
  let L = {
    ...h.output,
    missingScript: {
      scriptPath: missingHookScript.scriptPath,
      cutFrom: O.find((j) => j.path === missingHookScript.scriptPath)?.cutFrom,
      isRepeat: a.inBackground === true && rememberBounded(S, R, missingHookScript.output),
    },
  };
  return byteLengthOfJson(L) <= MAX_HOOK_RESULT_BYTES
    ? {
        ...h,
        output: L,
      }
    : h;
}
//@ chunk-wy9dbk5f.js:22643-23116 placement
/**
 * 在当前设置的钩子里查找与请求完全一致的命令钩子（命令、参数、if、shell），检查匹配器；钩子被禁用或不存在时抛 ServedCallError。
 */
function findProjectHook(e, r, host) {
  invalidateCommandNames();
  let s = usableHookSources(e.sources);
  let a = hooksDisabledForSources(s);
  let c = hookStateByHost.of(host);
  let isOff = En(s, c.sources) ? c.isOff : undefined;
  if (shouldDisableAllHooksIncludingManaged() || (isOff ?? a))
    throw new ServedCallError(REPO_HOOKS_OFF_MESSAGE);
  let g = false;
  let h;
  for (let { matcher, hooks } of collectHookMatchers(e.hookEvent, s, c.hooks))
    for (let hook of hooks) {
      if (
        hook.type !== "command" ||
        hook.command !== e.command ||
        !En(hook.args, e.args) ||
        hook.if !== e.if ||
        hook.shell !== e.shell
      )
        continue;
      g = true;
      if (matcher && matcher !== "*" && r === undefined)
        throw Error("this machine could not judge the hook's matcher");
      if (r === undefined || hookMatcherMatches(r, matcher)) h = hook;
    }
  if (!g) throw new ServedCallError(NO_SUCH_HOOK_MESSAGE);
  return h;
}
//@ chunk-wy9dbk5f.js:23116-23186 placement
/**
 * 判断该来源的钩子是否被禁用。
 */
function hooksDisabledForSources(e) {
  return (
    isCustomizationDisabled("hooks") ||
    shouldDisableAllHooksIncludingManaged() ||
    shouldAllowManagedHooksOnly(isDisableAllHooksEffective(e)) ||
    isRestrictedToPluginOnly("hooks") ||
    shouldSkipHookDueToTrust()
  );
}
//@ chunk-wy9dbk5f.js:23186-23310 placement = getEnabledSettingSources (0.752)
function isDisableAllHooksEffective(e) {
  return (
    [...e, "flagSettings", "policySettings"]
      .map((s) => getSettingsForSource(s)?.disableAllHooks)
      .findLast((s) => s !== undefined) === true
  );
}
//@ chunk-wy9dbk5f.js:23310-23368 placement
/**
 * 判断设置来源是否启用但解析失败/为空。
 */
function isSourceUnparseable(e) {
  return (
    isSettingSourceEnabled(e) &&
    getSettingsForSource(e) === null &&
    getSettingsParseErrorsForSource(e).length > 0
  );
}
//@ chunk-wy9dbk5f.js:23368-23428 placement
/**
 * 过滤出可用的钩子来源。
 */
function usableHookSources(sources) {
  return HEARTBEAT_SETTINGS_SOURCES.filter((r) => sources.includes(r) && isSettingSourceEnabled(r));
}
//@ chunk-wy9dbk5f.js:23428-23558 placement
function collectHookMatchers(e, r, hooks = new Map()) {
  let s = [];
  for (let a of r)
    if (isSettingSourceEnabled(a)) {
      let c = hooks.has(a) ? hooks.get(a) : getSettingsForSource(a)?.hooks;
      s = s.concat(c?.[e] ?? []);
    }
  return s;
}
//@ chunk-wy9dbk5f.js:23558-23757 placement
function refreshHookSnapshot(e, r = e.sources) {
  try {
    let n = r && hooksDisabledForSources(r);
    let s = n !== e.isOff;
    e.isOff = n;
    e.sources = r;
    for (let a of HEARTBEAT_SETTINGS_SOURCES) {
      let hooks = getSettingsForSource(a)?.hooks;
      s ||= !En(hooks, e.hooks.get(a));
      e.hooks.set(a, hooks);
    }
    return s;
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-wy9dbk5f.js:23757-23883 placement
/**
 * 运行托管钩子的输入 schema。
 */
var RUNMANAGEDHOOK = "RunManagedHook";
var runManagedHookInputSchema = DoctorLazy(() =>
  zodStrictObject({
    hookEvent: _enum(HOOK_EVENTS),
    hook: HookCommandSchema(),
    jsonInput: string(),
    hookIndex: E().int().nonnegative().optional(),
  }),
);
//@ chunk-wy9dbk5f.js:23883-24195 placement
async function serveRunManagedHook(e, r, n) {
  let s = n.toolUseContext();
  let { hook, hookEvent, jsonInput, hookIndex } = runManagedHookInputSchema().parse(e);
  if (hook.type !== "command") throw Error("only a command hook runs on this machine");
  let remoteHookInput = parseRemoteHookInput(jsonInput);
  if (hook.if && !(await evaluateHookCondition(hook.if, remoteHookInput))) return NOT_APPLICABLE_RESULT;
  s.abortController.signal.throwIfAborted();
  return runCommandHookWithTimeout(hook, hookEvent, remoteHookInput, hookIndex, s, undefined, true);
}
//@ chunk-wy9dbk5f.js:24224-24297 placement
/**
 * 目录技能钩子的 id 后缀 @catalog-skill。
 */
var RUNSKILLHOOK = "RunSkillHook";
var SKILL_HOOK_SUFFIX = "@skill";
var PLUGIN_SKILL_HOOK_SUFFIX = "@plugin-skill";
var CATALOG_SKILL_HOOK_SUFFIX = "@catalog-skill";
//@ chunk-wy9dbk5f.js:24297-24364 placement
/**
 * 从插件 id 去掉 @plugin-skill 后缀。
 */
function pluginIdFromSkillSuffix(pluginId) {
  return pluginId?.endsWith(PLUGIN_SKILL_HOOK_SUFFIX)
    ? pluginId.slice(0, -PLUGIN_SKILL_HOOK_SUFFIX.length)
    : undefined;
}
//@ chunk-wy9dbk5f.js:24364-24537 placement
var SKILL_HOOKS_OFF_MESSAGE = "this machine's settings keep a skill's hooks off";
var runSkillHookInputSchema = DoctorLazy(() =>
  zodStrictObject({
    pluginId: string(),
    hookEvent: _enum(HOOK_EVENTS),
    hook: HookCommandSchema(),
    jsonInput: string(),
    hookIndex: E().int().nonnegative().optional(),
  }),
);
//@ chunk-wy9dbk5f.js:24537-25942 placement
async function serveRunSkillHook(e, r, context) {
  let s = context.toolUseContext();
  let { pluginId, hook, hookEvent, jsonInput, hookIndex } = runSkillHookInputSchema().parse(e);
  if (hook.type !== "command") throw Error("only a command hook runs on this machine");
  let remoteHookInput = parseRemoteHookInput(jsonInput);
  if (hook.if && !(await evaluateHookCondition(hook.if, remoteHookInput)))
    return {
      ...NOT_APPLICABLE_RESULT,
      output: {
        ...NOT_APPLICABLE_RESULT.output,
        notStarted: true,
      },
    };
  let C = pluginId.endsWith(SKILL_HOOK_SUFFIX) ? pluginId.slice(0, -SKILL_HOOK_SUFFIX.length) : undefined;
  let b = C ? await findLocalSkillCommand(C, s, null) : undefined;
  if (C && !b) {
    clearSkillCaches();
    b = await findLocalSkillCommand(C, s, null);
  }
  let skillName = pluginId.endsWith(CATALOG_SKILL_HOOK_SUFFIX)
    ? stripSyncedSkillPrefix(pluginId.slice(0, -CATALOG_SKILL_HOOK_SUFFIX.length))
    : undefined;
  let x =
    skillName !== undefined &&
    isValidSkillDirName(skillName) &&
    !("reason" in (await readHostCatalogSkill(skillName)))
      ? join(HOST_SKILLS_MOUNT, PUBLIC, skillName)
      : undefined;
  let w = pluginIdFromSkillSuffix(pluginId);
  let { storageV5, credentials } = s;
  let plugin = w === undefined ? undefined : (await findEnabledPlugin(w, storageV5, credentials)).plugin;
  let j = true;
  if (w !== undefined && plugin === undefined) {
    j = await resyncForMissingEntry(context, s.abortController.signal, async () => {
      plugin = (await findEnabledPlugin(w, storageV5, credentials)).plugin;
      return plugin !== undefined;
    });
    plugin ??= (await findEnabledPlugin(w, storageV5, credentials)).plugin;
  }
  invalidateCommandNames();
  let B =
    w !== undefined
      ? plugin === undefined || isDefined(await checkSyncedSkillAccess(plugin.source, plugin.path))
      : C !== undefined && stripSyncedSkillPrefix(C) !== C && (!b || skillUnavailableReason(b) !== undefined);
  invalidateCommandNames();
  assertHooksNotDisabled();
  assertHooksPolicyReady();
  if (plugin !== undefined) assertSyncedPluginUsable(plugin);
  else if (w !== undefined) assertPluginSyncSettled(w, j, s.session);
  if (
    B ||
    shouldSkipSessionHooksByPolicy() ||
    (w === undefined && isRestrictedToPluginOnly("hooks")) ||
    shouldSkipHookDueToTrust()
  )
    throw Error("this machine's settings keep a skill's hooks off");
  if (skillName !== undefined && x === undefined)
    throw Error("the host catalog's skill has no folder on this machine");
  s.abortController.signal.throwIfAborted();
  let H = await holdHookUntilManagedSettings(
    hookEvent,
    remoteHookInput.stdin,
    hook.timeout,
    s.abortController.signal,
    () => plugin !== undefined && isVouchedMarketplaceRef(plugin.source),
    SKILL_HOOKS_OFF_MESSAGE,
  );
  if (H === "answered") return serveRunSkillHook(e, r, context);
  if (H !== undefined) return H;
  return runCommandHookWithTimeout(
    hook,
    hookEvent,
    remoteHookInput,
    hookIndex,
    s,
    undefined,
    false,
    plugin?.path ?? b?.skillRoot ?? x,
  );
}
export {
  LISTPROJECTHOOKS,
  serveListProjectHooks,
  RUNPROJECTHOOK,
  serveRunProjectHook,
  RUNMANAGEDHOOK,
  serveRunManagedHook,
  RUNSKILLHOOK,
  serveRunSkillHook,
};

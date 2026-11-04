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
  objectSchema,
  record,
  stringSchema,
  unknown,
  booleanSchema,
  zodStrictObject,
  numberSchema,
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
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
  objectSchema({
    sources: hookSourceSchema(),
  }),
);
var listHooksResultSchema = DoctorLazy(() =>
  objectSchema({
    hooks: record(stringSchema(), array(unknown())),
    cut: booleanSchema(),
    leftOut: array(stringSchema()),
    unreadable: booleanSchema(),
    stamp: stringSchema().max(MAX_HEARTBEAT_BYTES),
    sources: array(stringSchema()),
  }),
);
var runHookInputSchema = DoctorLazy(() =>
  runPluginHookInputSchema()
    .omit({
      pluginId: true,
    })
    .extend({
      shell: stringSchema().optional(),
      inBackground: booleanSchema().optional(),
      asksWhichCopy: booleanSchema().optional(),
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
async function serveListProjectHooks(input, signal, context) {
  let hookState =
    context?.tellToolListChanged === undefined ? undefined : hookStateByHost.of(context.session.host);
  if (context?.tellToolListChanged !== undefined && hookState !== undefined)
    watchRepoSettingsChanges(context.session.host, context.tellToolListChanged, () =>
      refreshHookSnapshot(hookState),
    );
  let stamp = await getSettingsFilesStamp();
  let hooksByEvent = {};
  let leftOutEvents = new Set();
  let hookCount = 0;
  let jsonBytes = 0;
  let argCharCount = 0;
  let matcherCharCount = 0;
  let cut = false;
  let sources = usableHookSources(listHooksInputSchema().parse(input).sources);
  invalidateCommandNames();
  let hooksOff = hooksDisabledForSources(sources);
  assertHooksPolicyReady();
  if (hookState !== undefined) refreshHookSnapshot(hookState, sources);
  let unreadable = !hooksOff && sources.some(isSourceUnparseable);
  for (let event of hooksOff ? [] : HOOK_EVENTS)
    for (let { matcher, hooks } of collectHookMatchers(event, sources))
      for (let hook of hooks) {
        if (hook.type !== "command") {
          leftOutEvents.add(event);
          continue;
        }
        let entry = {
          matcher,
          hooks: [hook],
        };
        let entryBytes = byteLengthOfJson(entry);
        let argLength = hook.args?.length ?? 0;
        let matcherLength = matcher?.length ?? 0;
        if (
          hookCount === MAX_HOOKS ||
          jsonBytes + entryBytes > MAX_HOOK_OUTPUT_BYTES ||
          argCharCount + argLength > MAX_HOOK_STDERR_BYTES ||
          matcherCharCount + matcherLength > MAX_HOOK_INPUT_BYTES
        ) {
          cut = true;
          continue;
        }
        hookCount++;
        jsonBytes += entryBytes;
        argCharCount += argLength;
        matcherCharCount += matcherLength;
        (hooksByEvent[event] ??= []).push(entry);
      }
  return {
    summary: `${hookCount} hooks${cut ? ", cut at a limit" : ""}`,
    output: {
      hooks: hooksByEvent,
      cut,
      leftOut: [...leftOutEvents],
      unreadable,
      stamp,
      sources,
    },
  };
}
//@ chunk-wy9dbk5f.js:21319-21423 placement
var NO_SUCH_HOOK_MESSAGE = "the repo declares no such hook for that event now";
var REPO_HOOKS_OFF_MESSAGE = "this machine keeps the repo's hooks off";
//@ chunk-wy9dbk5f.js:21423-22643 placement
async function serveRunProjectHook(input, signal, context) {
  let toolContext = context.toolUseContext();
  let request = runHookInputSchema().parse(input);
  let remoteHookInput = parseRemoteHookInput(request.jsonInput);
  let hookInput = HookInputUnionSchema().safeParse(remoteHookInput.stdin).data;
  let projectHook = findProjectHook(request, hookInput, context.session.host);
  if (projectHook?.if) {
    if (!(await evaluateHookCondition(projectHook.if, remoteHookInput))) return NOT_APPLICABLE_RESULT;
    projectHook = findProjectHook(request, hookInput, context.session.host);
  }
  toolContext.abortController.signal.throwIfAborted();
  if (projectHook === undefined) return NOT_APPLICABLE_RESULT;
  if (request.asksWhichCopy)
    return {
      summary: "it applies",
      output: {
        ...NOT_APPLICABLE_RESULT.output,
        runsInBackground: projectHook.asyncRewake === true,
      },
    };
  let result = await runCommandHookWithTimeout(
    {
      ...projectHook,
      timeout: request.timeout ?? projectHook.timeout,
    },
    request.hookEvent,
    remoteHookInput,
    request.hookIndex,
    toolContext,
    undefined,
    false,
    undefined,
    request.inBackground,
  );
  if (!projectHook.asyncRewake) return result;
  let registry = rememberedScriptsRegistry.of(context.session.host);
  let matchQuery = hookInput && hookMatchQuery(hookInput);
  let scriptKey = `${matchQuery ? `${request.hookEvent}:${matchQuery}` : request.hookEvent}
${getHookDisplayText(projectHook)}`;
  if (result.output.status !== 2) {
    rememberBounded(registry, scriptKey, undefined);
    return result;
  }
  let isPowerShell = (projectHook.shell ?? defaultShellKind()) === "powershell";
  let hasArgs = projectHook.args !== undefined;
  let expandedPaths = expandHookPathVariables({
    command: projectHook.command,
    args: projectHook.args,
    pluginRoot: undefined,
    projectDir: getProjectConfigRoot() ?? getProjectRoot(),
    homeDir: homedir(),
    windowsBash: getPlatform() === "windows" && !isPowerShell && !hasArgs,
    posixShell: !isPowerShell && !hasArgs && !env.CLAUDE_CODE_SHELL_PREFIX,
  });
  let missingHookScript = await detectMissingHookScript({
    stdout: result.output.stdout,
    stderr: result.output.stderr,
    scriptPaths: expandedPaths.map((expandedPath) => expandedPath.path),
  });
  if (missingHookScript === undefined) {
    rememberBounded(registry, scriptKey, undefined);
    return result;
  }
  let output = {
    ...result.output,
    missingScript: {
      scriptPath: missingHookScript.scriptPath,
      cutFrom: expandedPaths.find((expandedPath) => expandedPath.path === missingHookScript.scriptPath)
        ?.cutFrom,
      isRepeat:
        request.inBackground === true && rememberBounded(registry, scriptKey, missingHookScript.output),
    },
  };
  return byteLengthOfJson(output) <= MAX_HOOK_RESULT_BYTES
    ? {
        ...result,
        output,
      }
    : result;
}
//@ chunk-wy9dbk5f.js:22643-23116 placement
/**
 * 在当前设置的钩子里查找与请求完全一致的命令钩子（命令、参数、if、shell），检查匹配器；钩子被禁用或不存在时抛 ServedCallError。
 */
function findProjectHook(request, hookInput, host) {
  invalidateCommandNames();
  let sources = usableHookSources(request.sources);
  let sourcesOff = hooksDisabledForSources(sources);
  let hookState = hookStateByHost.of(host);
  let isOff = import_sortedIndex_2(sources, hookState.sources) ? hookState.isOff : undefined;
  if (shouldDisableAllHooksIncludingManaged() || (isOff ?? sourcesOff))
    throw new ServedCallError(REPO_HOOKS_OFF_MESSAGE);
  let found = false;
  let foundHook;
  for (let { matcher, hooks } of collectHookMatchers(request.hookEvent, sources, hookState.hooks))
    for (let hook of hooks) {
      if (
        hook.type !== "command" ||
        hook.command !== request.command ||
        !import_sortedIndex_2(hook.args, request.args) ||
        hook.if !== request.if ||
        hook.shell !== request.shell
      )
        continue;
      found = true;
      if (matcher && matcher !== "*" && hookInput === undefined)
        throw Error("this machine could not judge the hook's matcher");
      if (hookInput === undefined || hookMatcherMatches(hookInput, matcher)) foundHook = hook;
    }
  if (!found) throw new ServedCallError(NO_SUCH_HOOK_MESSAGE);
  return foundHook;
}
//@ chunk-wy9dbk5f.js:23116-23186 placement
/**
 * 判断该来源的钩子是否被禁用。
 */
function hooksDisabledForSources(sources) {
  return (
    isCustomizationDisabled("hooks") ||
    shouldDisableAllHooksIncludingManaged() ||
    shouldAllowManagedHooksOnly(isDisableAllHooksEffective(sources)) ||
    isRestrictedToPluginOnly("hooks") ||
    shouldSkipHookDueToTrust()
  );
}
//@ chunk-wy9dbk5f.js:23186-23310 placement (2.1.88 match: getEnabledSettingSources, 0.752)
function isDisableAllHooksEffective(sources) {
  return (
    [...sources, "flagSettings", "policySettings"]
      .map((source) => getSettingsForSource(source)?.disableAllHooks)
      .findLast((setting) => setting !== undefined) === true
  );
}
//@ chunk-wy9dbk5f.js:23310-23368 placement
/**
 * 判断设置来源是否启用但解析失败/为空。
 */
function isSourceUnparseable(source) {
  return (
    isSettingSourceEnabled(source) &&
    getSettingsForSource(source) === null &&
    getSettingsParseErrorsForSource(source).length > 0
  );
}
//@ chunk-wy9dbk5f.js:23368-23428 placement
/**
 * 过滤出可用的钩子来源。
 */
function usableHookSources(sources) {
  return HEARTBEAT_SETTINGS_SOURCES.filter(
    (source) => sources.includes(source) && isSettingSourceEnabled(source),
  );
}
//@ chunk-wy9dbk5f.js:23428-23558 placement
function collectHookMatchers(event, sources, hooks = new Map()) {
  let matchers = [];
  for (let source of sources)
    if (isSettingSourceEnabled(source)) {
      let sourceHooks = hooks.has(source) ? hooks.get(source) : getSettingsForSource(source)?.hooks;
      matchers = matchers.concat(sourceHooks?.[event] ?? []);
    }
  return matchers;
}
//@ chunk-wy9dbk5f.js:23558-23757 placement
function refreshHookSnapshot(snapshot, sources = snapshot.sources) {
  try {
    let isOff = sources && hooksDisabledForSources(sources);
    let changed = isOff !== snapshot.isOff;
    snapshot.isOff = isOff;
    snapshot.sources = sources;
    for (let source of HEARTBEAT_SETTINGS_SOURCES) {
      let hooks = getSettingsForSource(source)?.hooks;
      changed ||= !import_sortedIndex_2(hooks, snapshot.hooks.get(source));
      snapshot.hooks.set(source, hooks);
    }
    return changed;
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
    jsonInput: stringSchema(),
    hookIndex: numberSchema().int().nonnegative().optional(),
  }),
);
//@ chunk-wy9dbk5f.js:23883-24195 placement
async function serveRunManagedHook(input, signal, context) {
  let toolContext = context.toolUseContext();
  let { hook, hookEvent, jsonInput, hookIndex } = runManagedHookInputSchema().parse(input);
  if (hook.type !== "command") throw Error("only a command hook runs on this machine");
  let remoteHookInput = parseRemoteHookInput(jsonInput);
  if (hook.if && !(await evaluateHookCondition(hook.if, remoteHookInput))) return NOT_APPLICABLE_RESULT;
  toolContext.abortController.signal.throwIfAborted();
  return runCommandHookWithTimeout(hook, hookEvent, remoteHookInput, hookIndex, toolContext, undefined, true);
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
    pluginId: stringSchema(),
    hookEvent: _enum(HOOK_EVENTS),
    hook: HookCommandSchema(),
    jsonInput: stringSchema(),
    hookIndex: numberSchema().int().nonnegative().optional(),
  }),
);
//@ chunk-wy9dbk5f.js:24537-25942 placement
async function serveRunSkillHook(input, signal, context) {
  let toolContext = context.toolUseContext();
  let { pluginId, hook, hookEvent, jsonInput, hookIndex } = runSkillHookInputSchema().parse(input);
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
  let skillRef = pluginId.endsWith(SKILL_HOOK_SUFFIX)
    ? pluginId.slice(0, -SKILL_HOOK_SUFFIX.length)
    : undefined;
  let localSkill = skillRef ? await findLocalSkillCommand(skillRef, toolContext, null) : undefined;
  if (skillRef && !localSkill) {
    clearSkillCaches();
    localSkill = await findLocalSkillCommand(skillRef, toolContext, null);
  }
  let skillName = pluginId.endsWith(CATALOG_SKILL_HOOK_SUFFIX)
    ? stripSyncedSkillPrefix(pluginId.slice(0, -CATALOG_SKILL_HOOK_SUFFIX.length))
    : undefined;
  let hostSkillDir =
    skillName !== undefined &&
    isValidSkillDirName(skillName) &&
    !("reason" in (await readHostCatalogSkill(skillName)))
      ? join(HOST_SKILLS_MOUNT, PUBLIC, skillName)
      : undefined;
  let hookPluginId = pluginIdFromSkillSuffix(pluginId);
  let { storageV5, credentials } = toolContext;
  let plugin =
    hookPluginId === undefined
      ? undefined
      : (await findEnabledPlugin(hookPluginId, storageV5, credentials)).plugin;
  let resynced = true;
  if (hookPluginId !== undefined && plugin === undefined) {
    resynced = await resyncForMissingEntry(context, toolContext.abortController.signal, async () => {
      plugin = (await findEnabledPlugin(hookPluginId, storageV5, credentials)).plugin;
      return plugin !== undefined;
    });
    plugin ??= (await findEnabledPlugin(hookPluginId, storageV5, credentials)).plugin;
  }
  invalidateCommandNames();
  let mustRefuse =
    hookPluginId !== undefined
      ? plugin === undefined || isDefined(await checkSyncedSkillAccess(plugin.source, plugin.path))
      : skillRef !== undefined &&
        stripSyncedSkillPrefix(skillRef) !== skillRef &&
        (!localSkill || skillUnavailableReason(localSkill) !== undefined);
  invalidateCommandNames();
  assertHooksNotDisabled();
  assertHooksPolicyReady();
  if (plugin !== undefined) assertSyncedPluginUsable(plugin);
  else if (hookPluginId !== undefined) assertPluginSyncSettled(hookPluginId, resynced, toolContext.session);
  if (
    mustRefuse ||
    shouldSkipSessionHooksByPolicy() ||
    (hookPluginId === undefined && isRestrictedToPluginOnly("hooks")) ||
    shouldSkipHookDueToTrust()
  )
    throw Error("this machine's settings keep a skill's hooks off");
  if (skillName !== undefined && hostSkillDir === undefined)
    throw Error("the host catalog's skill has no folder on this machine");
  toolContext.abortController.signal.throwIfAborted();
  let policyAnswer = await holdHookUntilManagedSettings(
    hookEvent,
    remoteHookInput.stdin,
    hook.timeout,
    toolContext.abortController.signal,
    () => plugin !== undefined && isVouchedMarketplaceRef(plugin.source),
    SKILL_HOOKS_OFF_MESSAGE,
  );
  if (policyAnswer === "answered") return serveRunSkillHook(input, signal, context);
  if (policyAnswer !== undefined) return policyAnswer;
  return runCommandHookWithTimeout(
    hook,
    hookEvent,
    remoteHookInput,
    hookIndex,
    toolContext,
    undefined,
    false,
    plugin?.path ?? localSkill?.skillRoot ?? hostSkillDir,
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

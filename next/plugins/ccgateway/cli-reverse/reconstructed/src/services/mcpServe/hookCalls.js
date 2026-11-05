/**
 * services/mcpServe/hookCalls.ts
 *
 * 2.1.316 新增：mcp serve 钩子调用：列出并运行项目/技能/托管钩子。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xrwmcqkn.js (26)
 * attribution: placement 15, layout 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { homedir } from "os";
import { join } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  array,
  _enum,
  objectSchema,
  stringSchema,
  literal,
  record,
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
import {
  runPluginHookInputSchema,
  fitHookResult,
  shrinkHookStdout,
  MAX_HOOK_RESULT_BYTES,
} from "../remoteTools/runPluginHook.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { withDeadline, raceWithAbortSignal } from "../../utils/sleep.js";
import {
  waitForManagedSettings,
  hasSignIn,
  settleBeforeHookRun,
  isProjectMcpHookUnlisted,
  NO_SIGN_IN_MESSAGE,
  runHttpHook,
  collectProjectMcpHooks,
} from "./orgHookLists.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import {
  assertHooksPolicyReady,
  HOOK_EVENTS,
  parseRemoteHookInput,
  HookInputUnionSchema,
  evaluateHookCondition,
  holdHookUntilManagedSettings,
  runCommandHookWithTimeout,
  findEnabledPlugin,
  assertHooksNotDisabled,
  assertSyncedPluginUsable,
  assertPluginSyncSettled,
} from "../../entrypoints/sdk/coreSchemas.js";
import { isHookPolicyUnanswered } from "../../commands/goal/goal.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { getManagedHooksHoldState } from "../../utils/hooks/managedHooksOnly.js";
import { getMcpConfigByName } from "../mcp/config.js";
import { isManagedHookMatcher, getHookDisplayText } from "../../utils/hooks/hooksSettings.js";
import { pickAlias, import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  byteLengthOfJson,
  findLocalSkillCommand,
  readHostCatalogSkill,
  resyncForMissingEntry,
  skillUnavailableReason,
} from "../remoteTools/commandRendering.js";
import {
  getSettingsRootPathForSource,
  getSettingsForSource,
  getSettingsParseErrorsForSource,
  projectSettingsAliasesUserSettings,
} from "../../utils/settings/settings.js";
import { TOOL_HOOK_EXECUTION_TIMEOUT_MS } from "../../utils/hooks/hookEvents.js";
import { serveListProjectMcpServers, relayStateSlot, toRpcError } from "./mcpRelayCalls.js";
import { AbortError, toError } from "../../utils/errors.js";
import { getCwd } from "../../utils/cwd.js";
import {
  blocksWhenItCannotRunElsewhere,
  hookMatchQuery,
  hookMatcherMatches,
  shouldSkipHookDueToTrust,
} from "../../utils/hooks.js";
import { ServedCallError } from "./servedCallError.js";
import {
  rememberedScriptsRegistry,
  rememberBounded,
  expandHookPathVariables,
  detectMissingHookScript,
} from "../../utils/hooks/hookCommandResolution.js";
import { defaultShellKind } from "../../utils/shell/shellToolUtils.js";
import { getProjectConfigRoot, getProjectRoot } from "../../bootstrap/state.js";
import { getPlatform } from "../../utils/platform.js";
import { env } from "../../utils/env.js";
import {
  shouldDisableAllHooksIncludingManaged,
  shouldAllowManagedHooksOnly,
  shouldSkipSessionHooksByPolicy,
} from "../../utils/hooks/hooksConfigSnapshot.js";
import { getContentFieldValue } from "../../components/hooks/ViewHookMode.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { logError } from "../../utils/log.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { executeMcpToolHook } from "../../utils/hooks/mcpToolHook.js";
import { HookCommandSchema } from "../../schemas/hooks.js";
import { clearSkillCaches } from "../../skills/loadSkillsDir.js";
import { stripSyncedSkillPrefix, isValidSkillDirName } from "../../skills/syncedSkills.js";
import { HOST_SKILLS_MOUNT, PUBLIC } from "../../skills/hostSkillMounts.js";
import { isDefined, checkSyncedSkillAccess } from "../../utils/claudeAiSync/syncedSkillAccess.js";
import { isVouchedMarketplaceRef } from "../../utils/permissions/permissionsLoader.js";

//@ chunk-xrwmcqkn.js:20920-21909 placement
/**
 * 按宿主保存的钩子状态。
 */
var LISTPROJECTHOOKS = "ListProjectHooks";
var RUNPROJECTHOOK = "RunProjectHook";
var RUNPROJECTHTTPHOOK = "RunProjectHttpHook";
var RUNPROJECTMODELHOOK = "RunProjectModelHook";
var RUNPROJECTMCPHOOK = "RunProjectMcpHook";
var MAX_HOOK_OUTPUT_BYTES = 262144;
var MAX_HOOKS = 200;
var MAX_HOOK_INPUT_BYTES = 16384;
var MAX_HOOK_STDERR_BYTES = 8192;
var hookSourceSchema = DoctorLazy(() => array(_enum(HEARTBEAT_SETTINGS_SOURCES)));
var hookSettingsSchema = DoctorLazy(() =>
  objectSchema({
    allowedHttpHookUrls: array(stringSchema()).optional(),
    httpHookAllowedEnvVars: array(stringSchema()).optional(),
  }).optional(),
);
var hookSourcesSchema = DoctorLazy(() =>
  objectSchema({
    sources: hookSourceSchema(),
    takesHttpHooks: literal(true).optional(),
    organizationLists: hookSettingsSchema(),
    takesPromptHooks: literal(true).optional(),
    takesAgentHooks: literal(true).optional(),
    takesMcpToolHooks: literal(true).optional(),
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
    folder: stringSchema().max(4096).optional(),
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
      hookType: literal("agent").optional(),
      serverRefused: booleanSchema().or(literal("unjudged")).optional(),
      asksWhichCopy: booleanSchema().optional(),
      sources: hookSourceSchema(),
      flagLists: hookSettingsSchema(),
      organizationLists: hookSettingsSchema(),
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
var EMPTY_HOOK_RESULT = 1e4;
//@ chunk-xrwmcqkn.js:21909-23440 layout
async function loadHookSnapshot(json, snapshot_2, context) {
  let snapshot =
    context?.tellToolListChanged === undefined ? undefined : hookStateByHost.of(context.session.host);
  if (context?.tellToolListChanged !== undefined && snapshot !== undefined)
    watchRepoSettingsChanges(context.session.host, context.tellToolListChanged, () =>
      refreshHookSnapshot(snapshot),
    );
  await withDeadline(waitForManagedSettings(), EMPTY_HOOK_RESULT);
  let stamp = await getSettingsFilesStamp();
  let settingsStamp = {};
  let seen = new Set();
  let matcherCount = 0;
  let hookCount = 0;
  let argBytes = 0;
  let matcherBytes = 0;
  let budgetHit = false;
  let parsed = hookSourcesSchema().parse(json);
  let sources = usableHookSources(parsed.sources);
  invalidateCommandNames();
  let hooksOff = hooksDisabledForSources(sources);
  assertHooksPolicyReady();
  if (snapshot !== undefined) {
    refreshHookSnapshot(snapshot, sources);
    waitForManagedSettings().then(() => {
      if (isHookPolicyUnanswered() !== snapshot.holds) settingsChangeDetector.notifyChange("policySettings");
    });
  }
  let unreadable = !hooksOff && sources.some(isSourceUnparseable);
  let takesHttpHooks = parsed.takesHttpHooks === true;
  let httpHooksReady = takesHttpHooks && (hasSignIn() || parsed.organizationLists !== undefined);
  for (let hookEvent of hooksOff ? [] : HOOK_EVENTS) {
    let holdState =
      takesHttpHooks && !httpHooksReady && isHookPolicyUnanswered()
        ? getManagedHooksHoldState(hookEvent)
        : undefined;
    for (let matcherGroup of collectHookMatchers(hookEvent, sources)) {
      let { matcher, hooks } = matcherGroup;
      for (let hook of hooks) {
        if (hook.type === "http" && (hookEvent === "SessionStart" || hookEvent === "Setup")) continue;
        if (!(
          hook.type === "command" ||
          (hook.type === "http" && takesHttpHooks) ||
          (hook.type === "prompt" && parsed.takesPromptHooks === true) ||
          (hook.type === "agent" && parsed.takesAgentHooks === true) ||
          (hook.type === "mcp_tool" &&
            parsed.takesMcpToolHooks === true &&
            getMcpConfigByName(hook.server)?.scope === "project")
        )) {
          seen.add(hookEvent);
          continue;
        }
        if (hook.type === "http" && !httpHooksReady) {
          seen.add(hookEvent);
          if (holdState === undefined || isManagedHookMatcher(matcherGroup, holdState)) continue;
        }
        let hookIndex =
          hook.type !== "http"
            ? hook
            : pickAlias(hook, ["type", "url", "if", "timeout", "statusMessage", "onFailure"]);
        let trimmed =
          hookIndex.type === "command" &&
          hookEvent === "PreToolUse" &&
          (hookIndex.async || hookIndex.asyncRewake) &&
          isHookPolicyUnanswered();
        let forcedBackground = {
          matcher,
          hooks: [
            trimmed
              ? {
                  ...hookIndex,
                  async: false,
                  asyncRewake: false,
                }
              : hookIndex,
          ],
        };
        let entry = countHookInputNodes(
          "args" in hookIndex ? hookIndex.args : "input" in hookIndex ? hookIndex.input : undefined,
        );
        let argLength = entry > MAX_HOOK_STDERR_BYTES ? 0 : byteLengthOfJson(forcedBackground);
        let matcherLength = matcher?.length ?? 0;
        if (
          matcherCount === MAX_HOOKS ||
          hookCount + argLength > MAX_HOOK_OUTPUT_BYTES ||
          argBytes + entry > MAX_HOOK_STDERR_BYTES ||
          matcherBytes + matcherLength > MAX_HOOK_INPUT_BYTES
        ) {
          budgetHit = true;
          continue;
        }
        matcherCount++;
        hookCount += argLength;
        argBytes += entry;
        matcherBytes += matcherLength;
        (settingsStamp[hookEvent] ??= []).push(forcedBackground);
      }
    }
  }
  return {
    summary: `${matcherCount} hooks${budgetHit ? ", cut at a limit" : ""}`,
    output: {
      hooks: settingsStamp,
      cut: budgetHit,
      leftOut: [...seen],
      unreadable,
      stamp,
      sources,
      folder: getSettingsRootPathForSource("projectSettings"),
    },
  };
}
//@ chunk-xrwmcqkn.js:23440-23544 placement
var NO_SUCH_HOOK_MESSAGE = "the repo declares no such hook for that event now";
var REPO_HOOKS_OFF_MESSAGE = "this machine keeps the repo's hooks off";
//@ chunk-xrwmcqkn.js:23544-23587 layout (2.1.88 match: isHTTPConfig, 1)
function isHTTPConfig(config, json, hookEvent) {
  return runHook(config, json, hookEvent, "http");
}
//@ chunk-xrwmcqkn.js:23587-23681 layout
function runPromptHook(json, hookEvent, isAgent) {
  let kind = runHookInputSchema().parse(json).hookType === "agent";
  return runHook(json, hookEvent, isAgent, kind ? "agent" : "prompt");
}
//@ chunk-xrwmcqkn.js:23681-23728 layout
function runMcpToolHook(json, hookEvent, context) {
  return runHook(json, hookEvent, context, "mcp_tool");
}
//@ chunk-xrwmcqkn.js:23728-26424 layout
async function runHook(json, hookEvent, context, kind = "command") {
  let toolUseContext = context.toolUseContext();
  let input = runHookInputSchema().parse(json);
  let remoteHookInput = parseRemoteHookInput(input.jsonInput);
  let stdinInput = HookInputUnionSchema().safeParse(remoteHookInput.stdin).data;
  let signal = toolUseContext.abortController.signal;
  let isManaged = kind !== "command";
  let policyUnanswered = isManaged && isHookPolicyUnanswered();
  if (isManaged && !policyUnanswered) await settleBeforeHookRun(signal);
  let projectHook = findProjectHook(input, kind, stdinInput, context.session.host);
  if (projectHook?.if) {
    if (!(await evaluateHookCondition(projectHook.if, remoteHookInput))) return NOT_APPLICABLE_RESULT;
    projectHook = findProjectHook(input, kind, stdinInput, context.session.host);
  }
  signal.throwIfAborted();
  if (projectHook === undefined) return NOT_APPLICABLE_RESULT;
  if (input.asksWhichCopy)
    return {
      summary: "it applies",
      output: {
        ...NOT_APPLICABLE_RESULT.output,
        runsInBackground: projectHook.type === "command" && projectHook.asyncRewake === true,
      },
    };
  let hook = projectHook;
  let holdOutcome = await holdHookUntilManagedSettings(
    input.hookEvent,
    remoteHookInput.stdin,
    input.timeout ?? projectHook.timeout,
    signal,
    () => {
      let holdState = getManagedHooksHoldState(input.hookEvent);
      return collectHookMatchers(
        input.hookEvent,
        usableHookSources(input.sources),
        hookStateByHost.of(context.session.host).hooks,
      ).some((group) => group.hooks.includes(hook) && isManagedHookMatcher(group, holdState));
    },
    REPO_HOOKS_OFF_MESSAGE,
  );
  if (holdOutcome === "answered") return runHook(json, hookEvent, context, kind);
  if (holdOutcome !== undefined) return holdOutcome;
  if (policyUnanswered) {
    await settleBeforeHookRun(signal);
    projectHook = findProjectHook(input, kind, stdinInput, context.session.host);
    if (projectHook === undefined) return NOT_APPLICABLE_RESULT;
  }
  let serverRefused = input.serverRefused ?? true;
  let timeout = input.timeout;
  if (
    projectHook.type === "mcp_tool" &&
    !serverRefused &&
    isProjectMcpHookUnlisted(projectHook, stdinInput, context.session)
  ) {
    let startTime = performance.now();
    let serverRefused = timeout ?? projectHook.timeout ?? TOOL_HOOK_EXECUTION_TIMEOUT_MS / 1000;
    if (
      (await withDeadline(
        raceWithAbortSignal(
          Promise.race([
            serveListProjectMcpServers(
              {
                plugins: true,
                unlessListed: true,
              },
              new AbortController().signal,
              context,
            ),
            relayStateSlot.of(context.session).repoRoundStarted.promise,
          ]),
          signal,
          () => new AbortError(),
        ),
        serverRefused * 1000,
      )) === undefined
    )
      return {
        summary: "timed out",
        output: {
          ...NOT_APPLICABLE_RESULT.output,
          status: 1,
          aborted: true,
        },
      };
    timeout = serverRefused - (performance.now() - startTime) / 1000;
    projectHook = findProjectHook(input, kind, stdinInput, context.session.host);
    if (projectHook === undefined) return NOT_APPLICABLE_RESULT;
  }
  if (projectHook.type === "mcp_tool") {
    let timeoutSeconds = await runMcpToolHookBody(
      projectHook,
      input.hookEvent,
      stdinInput,
      timeout,
      signal,
      context.session,
      serverRefused,
    );
    return {
      summary: `exit ${timeoutSeconds.status}`,
      output: fitHookResult(
        {
          ...shrinkHookStdout(timeoutSeconds, input.hookEvent),
          repairedInput: remoteHookInput.repairedInput,
        },
        input.hookEvent,
      ),
    };
  }
  if (projectHook.type === "prompt" || projectHook.type === "agent")
    return {
      summary: "it applies",
      output: {
        ...NOT_APPLICABLE_RESULT.output,
        applies: true,
        inSessionCwd: getCwd(),
      },
    };
  if (projectHook.type !== "command") {
    if (
      !hasSignIn() &&
      input.organizationLists === undefined &&
      blocksWhenItCannotRunElsewhere(input.hookEvent)
    )
      throw new ServedCallError(NO_SIGN_IN_MESSAGE);
    let result = await runHttpHook(
      projectHook,
      input.hookEvent,
      remoteHookInput.stdin,
      input.timeout,
      signal,
      input.flagLists,
      input.organizationLists,
    );
    return {
      summary: `exit ${result.status}`,
      output: fitHookResult(
        {
          ...shrinkHookStdout(result, input.hookEvent),
          repairedInput: remoteHookInput.repairedInput,
        },
        input.hookEvent,
      ),
    };
  }
  let ranHook = await runCommandHookWithTimeout(
    {
      ...projectHook,
      timeout: input.timeout ?? projectHook.timeout,
    },
    input.hookEvent,
    remoteHookInput,
    input.hookIndex,
    toolUseContext,
    undefined,
    false,
    undefined,
    input.inBackground,
  );
  if (!projectHook.asyncRewake) return ranHook;
  let host = rememberedScriptsRegistry.of(context.session.host);
  let matcher = stdinInput && hookMatchQuery(stdinInput);
  let label = `${matcher ? `${input.hookEvent}:${matcher}` : input.hookEvent}
${getHookDisplayText(projectHook)}`;
  if (ranHook.output.status !== 2) {
    rememberBounded(host, label, undefined);
    return ranHook;
  }
  let isPowershell = (projectHook.shell ?? defaultShellKind()) === "powershell";
  let usesArgs = projectHook.args !== undefined;
  let scripts = expandHookPathVariables({
    command: projectHook.command,
    args: projectHook.args,
    pluginRoot: undefined,
    projectDir: getProjectConfigRoot() ?? getProjectRoot(),
    homeDir: homedir(),
    windowsBash: getPlatform() === "windows" && !isPowershell && !usesArgs,
    posixShell: !isPowershell && !usesArgs && !env.CLAUDE_CODE_SHELL_PREFIX,
  });
  let missingHookScript = await detectMissingHookScript({
    stdout: ranHook.output.stdout,
    stderr: ranHook.output.stderr,
    scriptPaths: scripts.map((missingScript) => missingScript.path),
  });
  if (missingHookScript === undefined) {
    rememberBounded(host, label, undefined);
    return ranHook;
  }
  let cutFrom = {
    ...ranHook.output,
    missingScript: {
      scriptPath: missingHookScript.scriptPath,
      cutFrom: scripts.find((repeat) => repeat.path === missingHookScript.scriptPath)?.cutFrom,
      isRepeat: input.inBackground === true && rememberBounded(host, label, missingHookScript.output),
    },
  };
  return byteLengthOfJson(cutFrom) <= MAX_HOOK_RESULT_BYTES
    ? {
        ...ranHook,
        output: cutFrom,
      }
    : ranHook;
}
//@ chunk-xrwmcqkn.js:26424-26909 placement
/**
 * 在当前设置的钩子里查找与请求完全一致的命令钩子（命令、参数、if、shell），检查匹配器；钩子被禁用或不存在时抛 ServedCallError。
 */
function findProjectHook(request, hookContext, hookInput, host) {
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
        hook.type !== hookContext ||
        getContentFieldValue(hook) !== request.command ||
        (hook.type === "command" &&
          (!import_sortedIndex_2(hook.args, request.args) || hook.shell !== request.shell)) ||
        hook.if !== request.if
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
//@ chunk-xrwmcqkn.js:27065-27135 placement
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
//@ chunk-xrwmcqkn.js:27135-27259 placement (2.1.88 match: getEnabledSettingSources, 0.752)
function isDisableAllHooksEffective(sources) {
  return (
    [...sources, "flagSettings", "policySettings"]
      .map((source) => getSettingsForSource(source)?.disableAllHooks)
      .findLast((setting) => setting !== undefined) === true
  );
}
//@ chunk-xrwmcqkn.js:27259-27317 placement
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
//@ chunk-xrwmcqkn.js:27317-27377 placement
/**
 * 过滤出可用的钩子来源。
 */
function usableHookSources(sources) {
  return HEARTBEAT_SETTINGS_SOURCES.filter(
    (source) => sources.includes(source) && isSettingSourceEnabled(source),
  );
}
//@ chunk-xrwmcqkn.js:27377-27595 placement
function collectHookMatchers(event, sources, hooks = new Map()) {
  let matchers = [];
  for (let source of sources) {
    let layers =
      source === "projectSettings" &&
      sources.includes("userSettings") &&
      isSettingSourceEnabled("userSettings") &&
      projectSettingsAliasesUserSettings();
    if (isSettingSourceEnabled(source) && !layers) {
      let sourceHooks = hooks.has(source) ? hooks.get(source) : getSettingsForSource(source)?.hooks;
      matchers = matchers.concat(sourceHooks?.[event] ?? []);
    }
  }
  return matchers;
}
//@ chunk-xrwmcqkn.js:27595-27824 placement
function refreshHookSnapshot(snapshot, sources = snapshot.sources) {
  try {
    let isOff = sources && hooksDisabledForSources(sources);
    let holds = isHookPolicyUnanswered();
    let changed = isOff !== snapshot.isOff || holds !== snapshot.holds;
    snapshot.isOff = isOff;
    snapshot.holds = holds;
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
//@ chunk-xrwmcqkn.js:27824-27996 layout
function countHookInputNodes(value) {
  let count = 0;
  let stack = [value];
  while (stack.length > 0 && count <= MAX_HOOK_STDERR_BYTES) {
    let current = stack.pop();
    if (typeof current === "object" && current !== null) {
      let values = Object.values(current);
      count += values.length;
      for (let children of values) stack.push(children);
    }
  }
  return count;
}
//@ chunk-xrwmcqkn.js:27996-28318 layout
function httpResultToOutput(httpResult, hookEvent) {
  if (httpResult.aborted)
    return {
      stdout: "",
      stderr: "",
      output: "",
      status: 1,
      aborted: true,
    };
  let stdout =
    httpResult.ok &&
    byteLengthOfJson(httpResult.body) > MAX_HOOK_RESULT_BYTES &&
    !httpResult.body.trimStart().startsWith("{")
      ? truncateToLength(httpResult.body, MAX_HOOK_RESULT_BYTES / 8)
      : httpResult.body;
  let stderr = "thrown" in httpResult ? toRpcError(httpResult.thrown).message : (httpResult.error ?? "");
  return fitHookResult(
    {
      stdout,
      stderr,
      output: `${stdout}${stderr}`,
      status: httpResult.ok ? 0 : 1,
      ...(httpResult.withheld && {
        withheld: true,
      }),
    },
    hookEvent,
  );
}
//@ chunk-xrwmcqkn.js:28318-28702 layout
async function runMcpToolHookBody(serverRef, hookEvent, stdinInput, timeout, signal, session, serverRefused) {
  if (stdinInput === undefined) return withheldResult("this machine could not read the hook's input", true);
  if (serverRefused === "unjudged") {
    let organisationLists = `The organization's MCP server lists could not be applied to '${serverRef.server}'`;
    return withheldResult(organisationLists, true);
  }
  if (serverRefused) return withheldResult(`MCP server '${serverRef.server}' not connected`);
  return httpResultToOutput(
    await executeMcpToolHook(
      {
        ...serverRef,
        timeout: timeout ?? serverRef.timeout,
      },
      hookEvent,
      stdinInput,
      collectProjectMcpHooks(relayStateSlot.of(session)),
      signal,
      TOOL_HOOK_EXECUTION_TIMEOUT_MS,
      undefined,
      () => collectProjectMcpHooks(relayStateSlot.of(session)),
    ),
    hookEvent,
  );
}
//@ chunk-xrwmcqkn.js:28702-28783 layout
function withheldResult(message, withheld) {
  return {
    stdout: "",
    stderr: message,
    output: message,
    status: 1,
    ...(withheld && {
      withheld,
    }),
  };
}
//@ chunk-xrwmcqkn.js:28783-28909 placement
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
//@ chunk-xrwmcqkn.js:28909-29220 placement
async function serveRunManagedHook(input, signal, context) {
  let toolContext = context.toolUseContext();
  let { hook, hookEvent, jsonInput, hookIndex } = runManagedHookInputSchema().parse(input);
  if (hook.type !== "command") throw Error("only a command hook runs on this machine");
  let remoteHookInput = parseRemoteHookInput(jsonInput);
  if (hook.if && !(await evaluateHookCondition(hook.if, remoteHookInput))) return NOT_APPLICABLE_RESULT;
  toolContext.abortController.signal.throwIfAborted();
  return runCommandHookWithTimeout(hook, hookEvent, remoteHookInput, hookIndex, toolContext, undefined, true);
}
//@ chunk-xrwmcqkn.js:29220-29284 layout
var JUDGEHOOKCONDITION = "JudgeHookCondition";
var JudgeHookConditionSchema = DoctorLazy(() =>
  objectSchema({
    if: stringSchema(),
    jsonInput: stringSchema(),
  }),
);
//@ chunk-xrwmcqkn.js:29284-29435 layout
async function judgeHookCondition(json) {
  let { if: fixedCondition, jsonInput } = JudgeHookConditionSchema().parse(json);
  if (!(await evaluateHookCondition(fixedCondition, parseRemoteHookInput(jsonInput))))
    return NOT_APPLICABLE_RESULT;
  return {
    summary: "it applies",
    output: {
      ...NOT_APPLICABLE_RESULT.output,
      applies: true,
    },
  };
}
//@ chunk-xrwmcqkn.js:29464-29537 placement
/**
 * 目录技能钩子的 id 后缀 @catalog-skill。
 */
var RUNSKILLHOOK = "RunSkillHook";
var SKILL_HOOK_SUFFIX = "@skill";
var PLUGIN_SKILL_HOOK_SUFFIX = "@plugin-skill";
var CATALOG_SKILL_HOOK_SUFFIX = "@catalog-skill";
//@ chunk-xrwmcqkn.js:29537-29604 placement
/**
 * 从插件 id 去掉 @plugin-skill 后缀。
 */
function pluginIdFromSkillSuffix(pluginId) {
  return pluginId?.endsWith(PLUGIN_SKILL_HOOK_SUFFIX)
    ? pluginId.slice(0, -PLUGIN_SKILL_HOOK_SUFFIX.length)
    : undefined;
}
//@ chunk-xrwmcqkn.js:29604-29777 placement
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
//@ chunk-xrwmcqkn.js:29777-31181 placement
async function serveRunSkillHook(input, signal, json) {
  let toolContext = json.toolUseContext();
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
    resynced = await resyncForMissingEntry(json, toolContext.abortController.signal, async () => {
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
  if (policyAnswer === "answered") return serveRunSkillHook(input, signal, json);
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
  loadHookSnapshot,
  RUNPROJECTHOOK,
  runHook,
  RUNPROJECTHTTPHOOK,
  isHTTPConfig,
  RUNPROJECTMODELHOOK,
  runPromptHook,
  RUNPROJECTMCPHOOK,
  runMcpToolHook,
  RUNMANAGEDHOOK,
  serveRunManagedHook,
  RUNSKILLHOOK,
  serveRunSkillHook,
  JUDGEHOOKCONDITION,
  judgeHookCondition,
};

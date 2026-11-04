/**
 * utils/settings/settingsProblems.ts
 *
 * 2.1.316 新增：设置问题
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: placement 18
 */
import { basename, join, dirname } from "path";
import { PERSONAL_BLOCKING_EVENTS_2 } from "../hooks/hookFailures.js";
import { isPersonalConfigRestricted, getPersonalConfigFixHint } from "../personalConfigRestriction.js";
import {
  getSettingsFilePathForSource,
  parseSettingsFile,
  getSettingsForSource,
  getSettings_DEPRECATED,
} from "./settings.js";
import { isSettingSourceEnabled } from "./constants.js";
import { isRestrictedSession } from "../../bootstrap/state.js";
import { shouldAllowManagedPermissionRulesOnly } from "../permissions/permissionsLoader.js";
import { isCustomizationDisabled } from "./customizationDisabled.js";
import {
  keepsOwnHooksDespiteDisableAll,
  shouldAllowManagedHooksOnly,
  shouldDisableAllHooksIncludingManaged,
  ownHooksOffForUnreadablePolicy,
} from "../hooks/hooksConfigSnapshot.js";
import { isRestrictedToPluginOnly } from "./pluginOnlyPolicy.js";
import { isHookPolicyUnanswered } from "../../commands/goal/goal.js";
import { PROMPT_GUARD_EVENTS } from "../hooks.js";
import { getBareModeExitHint, isSafeMode, getSafeModeExitHint } from "../envUtils.js";
import { USER_SETTINGS_FILE_NAMES } from "./settingsFileParsing.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1272235-1272291 placement
var HOOK_TYPES_WITH_COMMAND; // deferred: uses PERSONAL_BLOCKING_EVENTS_2 (../hooks/hookFailures.js) of its import cycle while loading; runs once the cycle is complete
var PERSONAL_BLOCKING_EVENT_LIST;
var MAX_SETTING_PROBLEMS_SHOWN;
deferInit("chunk-e6aww6q8.js:1272235", () => {
  HOOK_TYPES_WITH_COMMAND = new Set(["command", "http"]);
  PERSONAL_BLOCKING_EVENT_LIST = [...PERSONAL_BLOCKING_EVENTS_2];
  MAX_SETTING_PROBLEMS_SHOWN = 10;
});
//@ chunk-e6aww6q8.js:1272291-1274253 placement
/**
 * 描述设置文件中的问题（受限模式、来源被排除），并给出修复建议。
 */
function describeSettingsProblem() {
  if (!isPersonalConfigRestricted())
    return {
      kind: "clear",
    };
  let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
  if (settingsFilePathForSource === undefined)
    return {
      kind: "clear",
    };
  if (!isSettingSourceEnabled("userSettings")) {
    let disabledNotice = describeDisabledHooks(settingsFilePathForSource, null);
    if (disabledNotice !== undefined) return disabledNotice;
    return hooksNotRunningNotice(
      settingsFilePathForSource,
      parseSettingsFile(settingsFilePathForSource).settings,
      {
        why: isRestrictedSession()
          ? "this session runs in restricted mode, which reads no user settings"
          : "this session's settings sources leave out user settings",
      },
    );
  }
  let { settings, errors } = parseSettingsFile(settingsFilePathForSource);
  let defaultFixText = "Fix the file, then start a new session.";
  let personalConfigFixHint = getPersonalConfigFixHint();
  if (settings === null && errors.some((error) => error.severity !== "warning")) {
    let problems = errors.filter(isBlockingSettingProblem);
    return {
      kind: "stop",
      text: blockingProblemText(
        `your user settings file ${settingsFilePathForSource} has errors, so none of its hooks or permission rules are in effect`,
        problems,
        problems.some((problem) => problem.path !== "")
          ? (personalConfigFixHint ?? defaultFixText)
          : defaultFixText,
      ),
    };
  }
  let ruleWarnings = shouldAllowManagedPermissionRulesOnly() ? [] : errors.filter(isPermissionRuleWarning);
  let hooksAllowed =
    !isCustomizationDisabled("hooks") &&
    (keepsOwnHooksDespiteDisableAll() ||
      !(
        shouldAllowManagedHooksOnly() ||
        shouldDisableAllHooksIncludingManaged() ||
        isRestrictedToPluginOnly("hooks")
      ));
  let hooksBlockReason =
    hooksAllowed && !isHookPolicyUnanswered()
      ? undefined
      : (describeManagedHooksPolicy(settings) ?? {
          why: "another settings file turns all hooks off",
        });
  let hookWarnings = hooksAllowed ? errors.filter(isPreservedHookWarning) : [];
  let filtered = hookWarnings.filter(isPromptGuardHookPath);
  if (ruleWarnings.length > 0 || filtered.length > 0) {
    let blockedKinds =
      filtered.length === 0 ? "rules" : ruleWarnings.length === 0 ? "hooks" : "rules and hooks";
    return {
      kind: "stop",
      text: blockingProblemText(
        `these ${blockedKinds} in ${settingsFilePathForSource} have errors and did not load, so they can't block or ask about anything`,
        [...ruleWarnings, ...filtered],
        personalConfigFixHint ?? defaultFixText,
      ),
    };
  }
  let disabledHooks = describeDisabledHooks(settingsFilePathForSource, settings);
  if (disabledHooks !== undefined) return disabledHooks;
  if (hooksBlockReason !== undefined && !hooksAllowed)
    return hooksNotRunningNotice(settingsFilePathForSource, settings, hooksBlockReason);
  let nonCommandHookList = nonCommandHooks(settings?.hooks);
  if (nonCommandHookList.length > 0)
    return {
      kind: "stop",
      text: blockingProblemText(
        `these hooks in ${settingsFilePathForSource} are on ${PERSONAL_BLOCKING_EVENT_LIST.slice(0, -1).join(", ")} or ${PERSONAL_BLOCKING_EVENT_LIST.at(-1)}, where only command and http hooks are allowed in this session`,
        nonCommandHookList,
        personalConfigFixHint === undefined
          ? "Change them to command or http hooks or move them to another event, then start a new session."
          : `Change them to command or http hooks or move them to another event. ${personalConfigFixHint}`,
      ),
    };
  if (hooksBlockReason !== undefined)
    return hooksNotRunningNotice(settingsFilePathForSource, settings, hooksBlockReason);
  if (hookWarnings.length > 0)
    return {
      kind: "notice",
      text:
        personalConfigFixHint === undefined
          ? `Some hooks in ${settingsFilePathForSource} have errors and won't run in this session. Your other hooks and settings still apply. To use them, fix these and start a new session:
${formatProblemList(hookWarnings)}`
          : `Some hooks in ${settingsFilePathForSource} have errors and won't run in this session. Your other hooks and settings still apply. The hooks with errors:
${formatProblemList(hookWarnings)}
${personalConfigFixHint}`,
    };
  return coworkSettingsHooksNotice(settingsFilePathForSource);
}
//@ chunk-e6aww6q8.js:1274253-1274454 placement
function settingsProblemDenial() {
  let problem = describeSettingsProblem();
  if (problem.kind !== "stop") return null;
  return {
    behavior: "deny",
    message: problem.text,
    decisionReason: {
      type: "other",
      reason: "A problem with your own settings or hooks is blocking tool calls",
    },
  };
}
//@ chunk-e6aww6q8.js:1274454-1274704 placement
function blockingProblemText(reasonText, problems, fixText) {
  let listSuffix =
    problems.length > 0
      ? `:
${formatProblemList(problems)}`
      : ".";
  return `Claude Code is blocking every prompt and tool call in this session because ${reasonText}${listSuffix}
${fixText} (This check is on because the session was started with CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG set.)`;
}
//@ chunk-e6aww6q8.js:1274704-1274894 placement
function formatProblemList(problems) {
  let mapped = problems
    .slice(0, MAX_SETTING_PROBLEMS_SHOWN)
    .map((problem) => `- ${problem.path || "(whole file)"}: ${stripValidValuesSuffix(problem.message)}`);
  let omittedCount = problems.length - mapped.length;
  return [...mapped, ...(omittedCount > 0 ? [`- and ${omittedCount} more problems in the file`] : [])].join(`
`);
}
//@ chunk-e6aww6q8.js:1274894-1274953 placement
function isBlockingSettingProblem(problem) {
  return problem.severity !== "warning" || isHooksSettingPath(problem.path);
}
//@ chunk-e6aww6q8.js:1274953-1275036 placement
function isPreservedHookWarning(problem) {
  return (
    problem.severity === "warning" && problem.preserveOnWrite === true && isHooksSettingPath(problem.path)
  );
}
//@ chunk-e6aww6q8.js:1275036-1275189 placement
function isPromptGuardHookPath(problem) {
  let sliced = problem.path.slice(6);
  return [...PROMPT_GUARD_EVENTS].some(
    (eventName) =>
      sliced.toLowerCase() === eventName.toLowerCase() ||
      (sliced.startsWith(`${eventName}.`) && /^\d/.test(sliced.slice(eventName.length + 1))),
  );
}
//@ chunk-e6aww6q8.js:1275189-1275257 placement
function stripValidValuesSuffix(message) {
  return message.replace(/ Valid (?:events|types): .*$/, "");
}
//@ chunk-e6aww6q8.js:1275257-1275362 placement
function isPermissionRuleWarning(problem) {
  return (
    problem.severity === "warning" &&
    (problem.path === "permissions.deny" || problem.path === "permissions.ask")
  );
}
//@ chunk-e6aww6q8.js:1275362-1275421 placement
function isHooksSettingPath(path) {
  return path === "hooks" || path.startsWith("hooks.");
}
//@ chunk-e6aww6q8.js:1275421-1275602 placement
function nonCommandHooks(hooks) {
  return PERSONAL_BLOCKING_EVENT_LIST.flatMap((eventName) =>
    (hooks?.[eventName] ?? []).flatMap((matcherGroup, matcherIndex) =>
      matcherGroup.hooks.flatMap((hook, hookIndex) =>
        HOOK_TYPES_WITH_COMMAND.has(hook.type)
          ? []
          : [
              {
                path: `hooks.${eventName}.${matcherIndex}.hooks.${hookIndex}`,
                message: `is a ${hook.type} hook`,
              },
            ],
      ),
    ),
  );
}
//@ chunk-e6aww6q8.js:1275602-1275776 placement
function hasHooks(hooks, eventNames, isRetainedAsyncHook = () => true) {
  return Object.entries(hooks ?? {}).some(
    ([key, value]) =>
      (eventNames === undefined || eventNames.has(key)) &&
      Array.isArray(value) &&
      value.some(
        (matcherGroup) =>
          Array.isArray(matcherGroup?.hooks) && matcherGroup.hooks.some((hook) => isRetainedAsyncHook(hook)),
      ),
  );
}
//@ chunk-e6aww6q8.js:1275776-1275852 placement
function isRetainedAsyncHook(hook) {
  return hook.type !== "command" || (hook.async !== true && hook.asyncRewake !== true);
}
//@ chunk-e6aww6q8.js:1275852-1276615 placement
function describeDisabledHooks(settingsFilePathForSource, settings) {
  if (!ownHooksOffForUnreadablePolicy() || isCustomizationDisabled("hooks")) return;
  let hooks = getSettingsForSource("flagSettings")?.hooks;
  let disabledFiles = [
    ...(hasHooks(settings?.hooks) ? [settingsFilePathForSource] : []),
    ...(hasHooks(hooks) ? ["the settings Claude Code was started with (--settings)"] : []),
  ];
  if (disabledFiles.length === 0) return;
  let whyText = `the hooks in ${disabledFiles.join(" and ")} are turned off: the project's settings (.claude/settings.json or .claude/settings.local.json) set "disableAllHooks" and a source of your organization's managed settings could not be read, so Claude Code cannot tell whether your organization allows them`;
  let fixText = `Fix the managed settings (your administrator manages them), or remove "disableAllHooks" from the project's settings, then start a new session.`;
  return hasHooks(settings?.hooks, PROMPT_GUARD_EVENTS, isRetainedAsyncHook) ||
    hasHooks(hooks, PROMPT_GUARD_EVENTS, isRetainedAsyncHook)
    ? {
        kind: "stop",
        text: blockingProblemText(whyText, [], fixText),
      }
    : {
        kind: "notice",
        text: `In this session ${whyText}. ${fixText}`,
      };
}
//@ chunk-e6aww6q8.js:1276615-1277505 placement
function describeManagedHooksPolicy(settings) {
  if (shouldDisableAllHooksIncludingManaged())
    return {
      why: `your organization's managed settings set "disableAllHooks"`,
    };
  if (getSettingsForSource("policySettings")?.allowManagedHooksOnly === true)
    return {
      why: "your organization's managed settings allow only managed hooks",
    };
  if (isRestrictedToPluginOnly("hooks"))
    return {
      why: "your organization's managed settings allow hooks only from plugins",
    };
  if (isCustomizationDisabled("hooks"))
    return {
      why: "this session runs in bare mode",
      fix: getBareModeExitHint(),
    };
  if (isSafeMode())
    return {
      why: "this session runs in safe mode",
      fix: getSafeModeExitHint(),
    };
  if (isHookPolicyUnanswered())
    return {
      why: "your organization's managed settings haven't been read yet, so it isn't known whether it allows them",
    };
  if (getSettings_DEPRECATED().disableAllHooks === true && !keepsOwnHooksDespiteDisableAll()) {
    if (settings?.disableAllHooks === true)
      return {
        why: 'this file sets "disableAllHooks"',
        fix: "remove it from the file and start a new session",
      };
    if (getSettingsForSource("flagSettings")?.disableAllHooks === true)
      return {
        why: 'the settings file Claude Code was started with (--settings) sets "disableAllHooks"',
      };
  }
  return;
}
//@ chunk-e6aww6q8.js:1277505-1277713 placement
function hooksNotRunningNotice(settingsFilePathForSource, settings, reason) {
  if (!hasHooks(settings?.hooks))
    return {
      kind: "clear",
    };
  let fixSuffix = reason.fix === undefined ? "" : ` To run them, ${reason.fix}.`;
  return {
    kind: "notice",
    text: `The hooks in ${settingsFilePathForSource} aren't running in this session because ${reason.why}.${fixSuffix}`,
  };
}
//@ chunk-e6aww6q8.js:1277713-1277955 placement
function coworkSettingsHooksNotice(settingsFilePathForSource) {
  if (basename(settingsFilePathForSource) !== USER_SETTINGS_FILE_NAMES.cowork)
    return {
      kind: "clear",
    };
  let defaultSettingsPath = join(dirname(settingsFilePathForSource), USER_SETTINGS_FILE_NAMES.default);
  if (getSettingsFilePathForSource("projectSettings") === defaultSettingsPath)
    return {
      kind: "clear",
    };
  return hooksNotRunningNotice(defaultSettingsPath, parseSettingsFile(defaultSettingsPath).settings, {
    why: `CLAUDE_CODE_USE_COWORK_PLUGINS makes Claude Code read ${settingsFilePathForSource} instead`,
  });
}
export { settingsProblemDenial, describeSettingsProblem };

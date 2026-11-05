/**
 * utils/settings/settingsProblems.ts
 *
 * 2.1.316 新增：设置问题
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (20)
 * attribution: placement 17, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { personalHooksOffKind } from "../hooks/personalHooksOff.js";
import { getBareModeExitHint, isSafeMode, getSafeModeExitHint } from "../envUtils.js";
import { PROMPT_GUARD_EVENTS } from "../hooks.js";
import { USER_SETTINGS_FILE_NAMES } from "./settingsFileParsing.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1277099-1277155 placement
var HOOK_TYPES_WITH_COMMAND; // deferred: uses PERSONAL_BLOCKING_EVENTS_2 (../hooks/hookFailures.js) of its import cycle while loading; runs once the cycle is complete
var PERSONAL_BLOCKING_EVENT_LIST;
var MAX_SETTING_PROBLEMS_SHOWN;
deferInit("chunk-5xgkngpb.js:1277099", () => {
  HOOK_TYPES_WITH_COMMAND = new Set(["command", "http"]);
  PERSONAL_BLOCKING_EVENT_LIST = [...PERSONAL_BLOCKING_EVENTS_2];
  MAX_SETTING_PROBLEMS_SHOWN = 10;
});
//@ chunk-5xgkngpb.js:1277155-1279128 layout
function personalSettingsProblem() {
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
        mode: true,
      },
    );
  }
  let { settings, errors } = parseSettingsFile(settingsFilePathForSource);
  let fixHint = "Fix the file, then start a new session.";
  let personalConfigFixHint = getPersonalConfigFixHint();
  if (settings === null && errors.some((error) => error.severity !== "warning")) {
    let problems = errors.filter(isBlockingSettingProblem);
    return {
      kind: "stop",
      text: blockingProblemText(
        `your user settings file ${settingsFilePathForSource} has errors, so none of its hooks or permission rules are in effect`,
        problems,
        problems.some((problem) => problem.path !== "") ? (personalConfigFixHint ?? fixHint) : fixHint,
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
  let hooksPolicy =
    hooksAllowed && !isHookPolicyUnanswered()
      ? undefined
      : (describeManagedHooksPolicy(settings) ?? {
          why: "another settings file turns all hooks off",
        });
  let problems = hooksAllowed ? errors.filter(isPreservedHookWarning) : [];
  let filtered = problems.filter(isPromptGuardHookPath);
  if (ruleWarnings.length > 0 || filtered.length > 0) {
    let brokenKinds =
      filtered.length === 0 ? "rules" : ruleWarnings.length === 0 ? "hooks" : "rules and hooks";
    return {
      kind: "stop",
      text: blockingProblemText(
        `these ${brokenKinds} in ${settingsFilePathForSource} have errors and did not load, so they can't block or ask about anything`,
        [...ruleWarnings, ...filtered],
        personalConfigFixHint ?? fixHint,
      ),
    };
  }
  let disabledNotice = describeDisabledHooks(settingsFilePathForSource, settings);
  if (disabledNotice !== undefined) return disabledNotice;
  if (hooksPolicy !== undefined && !hooksAllowed)
    return hooksNotRunningNotice(settingsFilePathForSource, settings, hooksPolicy);
  let problems_2 = nonCommandHooks(settings?.hooks);
  if (problems_2.length > 0)
    return {
      kind: "stop",
      text: blockingProblemText(
        `these hooks in ${settingsFilePathForSource} are on ${PERSONAL_BLOCKING_EVENT_LIST.slice(0, -1).join(", ")} or ${PERSONAL_BLOCKING_EVENT_LIST.at(-1)}, where only command and http hooks are allowed in this session`,
        problems_2,
        personalConfigFixHint === undefined
          ? "Change them to command or http hooks or move them to another event, then start a new session."
          : `Change them to command or http hooks or move them to another event. ${personalConfigFixHint}`,
      ),
    };
  if (hooksPolicy !== undefined)
    return hooksNotRunningNotice(settingsFilePathForSource, settings, hooksPolicy);
  if (problems.length > 0)
    return {
      kind: "notice",
      text:
        personalConfigFixHint === undefined
          ? `Some hooks in ${settingsFilePathForSource} have errors and won't run in this session. Your other hooks and settings still apply. To use them, fix these and start a new session:
${formatProblemList(problems)}`
          : `Some hooks in ${settingsFilePathForSource} have errors and won't run in this session. Your other hooks and settings still apply. The hooks with errors:
${formatProblemList(problems)}
${personalConfigFixHint}`,
    };
  return coworkSettingsHooksNotice(settingsFilePathForSource);
}
//@ chunk-5xgkngpb.js:1279128-1280335 layout
var HOST_OFF_HOOK_NOTICES = {
  retry:
    "Your own Claude Code hooks aren't running in this session: setting them up did not finish. Start a new session to try again.",
  fix: undefined,
  host: "Your own Claude Code hooks aren't running in this session: the program that started Claude Code kept them out. If a new session doesn't bring them back, ask whoever runs these sessions.",
};
var HOST_OFF_HOOK_NOTICES_FOR_CLAUDE = {
  retry:
    "Claude Code adds this note, not the user: the user's own Claude Code hooks are not running in this session, because setting them up did not finish. Tell the user this in one short sentence in your next reply, and that starting a new session tries again.",
  fix: "Claude Code adds this note, not the user: the user's own Claude Code hooks are not running in this session, because something in their own files needs a change. Tell the user this in one short sentence in your next reply, and that the notice from the program that started this session says what to change.",
  host: "Claude Code adds this note, not the user: the user's own Claude Code hooks are not running in this session, because the program that started Claude Code kept them out. Tell the user this in one short sentence in your next reply, and that a new session may bring them back.",
};
//@ chunk-5xgkngpb.js:1280335-1280967 layout
function personalHooksProblem() {
  let personalProblem = personalSettingsProblem();
  let hostOffKind = isPersonalConfigRestricted() ? personalHooksOffKind() : undefined;
  if (personalProblem.kind === "stop" || hostOffKind === undefined) return personalProblem;
  let notice = personalProblem.kind === "notice" ? personalProblem : undefined;
  if (hostOffKind === "launch" && notice?.stands === "mode")
    return {
      kind: "host_off",
      text: notice.text,
      forClaude: undefined,
    };
  let exitHint = isCustomizationDisabled("hooks")
    ? getBareModeExitHint()
    : isSafeMode()
      ? getSafeModeExitHint()
      : undefined;
  let hostOffText =
    hostOffKind === "launch"
      ? `Your own Claude Code hooks aren't running in this session: it was started in a mode that leaves out your own settings and hooks. ${exitHint === undefined ? "Start a new session without that mode to use them." : `To use them, ${exitHint}.`}`
      : HOST_OFF_HOOK_NOTICES[hostOffKind];
  let text = notice?.stands === undefined ? undefined : notice.text;
  return {
    kind: "host_off",
    text:
      hostOffText === undefined || text === undefined
        ? (hostOffText ?? text)
        : `${hostOffText}
${text}`,
    forClaude: hostOffKind === "launch" ? undefined : HOST_OFF_HOOK_NOTICES_FOR_CLAUDE[hostOffKind],
  };
}
//@ chunk-5xgkngpb.js:1280967-1281168 placement
function settingsProblemDenial() {
  let problem = personalSettingsProblem();
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
//@ chunk-5xgkngpb.js:1281168-1281418 placement
function blockingProblemText(reasonText, problems, fixText) {
  let listSuffix =
    problems.length > 0
      ? `:
${formatProblemList(problems)}`
      : ".";
  return `Claude Code is blocking every prompt and tool call in this session because ${reasonText}${listSuffix}
${fixText} (This check is on because the session was started with CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG set.)`;
}
//@ chunk-5xgkngpb.js:1281418-1281608 placement
function formatProblemList(problems) {
  let mapped = problems
    .slice(0, MAX_SETTING_PROBLEMS_SHOWN)
    .map((problem) => `- ${problem.path || "(whole file)"}: ${stripValidValuesSuffix(problem.message)}`);
  let omittedCount = problems.length - mapped.length;
  return [...mapped, ...(omittedCount > 0 ? [`- and ${omittedCount} more problems in the file`] : [])].join(`
`);
}
//@ chunk-5xgkngpb.js:1281608-1281667 placement
function isBlockingSettingProblem(problem) {
  return problem.severity !== "warning" || isHooksSettingPath(problem.path);
}
//@ chunk-5xgkngpb.js:1281667-1281750 placement
function isPreservedHookWarning(problem) {
  return (
    problem.severity === "warning" && problem.preserveOnWrite === true && isHooksSettingPath(problem.path)
  );
}
//@ chunk-5xgkngpb.js:1281750-1281903 placement
function isPromptGuardHookPath(problem) {
  let sliced = problem.path.slice(6);
  return [...PROMPT_GUARD_EVENTS].some(
    (eventName) =>
      sliced.toLowerCase() === eventName.toLowerCase() ||
      (sliced.startsWith(`${eventName}.`) && /^\d/.test(sliced.slice(eventName.length + 1))),
  );
}
//@ chunk-5xgkngpb.js:1281903-1281971 placement
function stripValidValuesSuffix(message) {
  return message.replace(/ Valid (?:events|types): .*$/, "");
}
//@ chunk-5xgkngpb.js:1281971-1282076 placement
function isPermissionRuleWarning(problem) {
  return (
    problem.severity === "warning" &&
    (problem.path === "permissions.deny" || problem.path === "permissions.ask")
  );
}
//@ chunk-5xgkngpb.js:1282076-1282135 placement
function isHooksSettingPath(path) {
  return path === "hooks" || path.startsWith("hooks.");
}
//@ chunk-5xgkngpb.js:1282135-1282316 placement
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
//@ chunk-5xgkngpb.js:1282316-1282490 placement
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
//@ chunk-5xgkngpb.js:1282490-1282566 placement
function isRetainedAsyncHook(hook) {
  return hook.type !== "command" || (hook.async !== true && hook.asyncRewake !== true);
}
//@ chunk-5xgkngpb.js:1282566-1283339 placement
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
        stands: true,
      };
}
//@ chunk-5xgkngpb.js:1283339-1284245 placement
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
      mode: true,
    };
  if (isSafeMode())
    return {
      why: "this session runs in safe mode",
      fix: getSafeModeExitHint(),
      mode: true,
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
//@ chunk-5xgkngpb.js:1284245-1284482 placement
function hooksNotRunningNotice(settingsFilePathForSource, settings, reason) {
  if (!hasHooks(settings?.hooks))
    return {
      kind: "clear",
    };
  let fixSuffix = reason.fix === undefined ? "" : ` To run them, ${reason.fix}.`;
  return {
    kind: "notice",
    text: `The hooks in ${settingsFilePathForSource} aren't running in this session because ${reason.why}.${fixSuffix}`,
    stands: reason.mode === true ? "mode" : true,
  };
}
//@ chunk-5xgkngpb.js:1284482-1284724 placement
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
export { settingsProblemDenial, personalHooksProblem, personalSettingsProblem };

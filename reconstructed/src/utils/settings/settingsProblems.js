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

//@ chunk-e6aww6q8.js:1272235-1272291 placement
var HOOK_TYPES_WITH_COMMAND = new Set(["command", "http"]);
var PERSONAL_BLOCKING_EVENT_LIST = [...PERSONAL_BLOCKING_EVENTS_2];
var MAX_SETTING_PROBLEMS_SHOWN = 10;
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
    let ke = describeDisabledHooks(settingsFilePathForSource, null);
    if (ke !== undefined) return ke;
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
  let s = "Fix the file, then start a new session.";
  let personalConfigFixHint = getPersonalConfigFixHint();
  if (settings === null && errors.some((error) => error.severity !== "warning")) {
    let filtered = errors.filter(isBlockingSettingProblem);
    return {
      kind: "stop",
      text: blockingProblemText(
        `your user settings file ${settingsFilePathForSource} has errors, so none of its hooks or permission rules are in effect`,
        filtered,
        filtered.some((we) => we.path !== "") ? (personalConfigFixHint ?? s) : s,
      ),
    };
  }
  let y = shouldAllowManagedPermissionRulesOnly() ? [] : errors.filter(isPermissionRuleWarning);
  let S =
    !isCustomizationDisabled("hooks") &&
    (keepsOwnHooksDespiteDisableAll() ||
      !(
        shouldAllowManagedHooksOnly() ||
        shouldDisableAllHooksIncludingManaged() ||
        isRestrictedToPluginOnly("hooks")
      ));
  let L =
    S && !isHookPolicyUnanswered()
      ? undefined
      : (describeManagedHooksPolicy(settings) ?? {
          why: "another settings file turns all hooks off",
        });
  let G = S ? errors.filter(isPreservedHookWarning) : [];
  let filtered = G.filter(isPromptGuardHookPath);
  if (y.length > 0 || filtered.length > 0) {
    let ke = filtered.length === 0 ? "rules" : y.length === 0 ? "hooks" : "rules and hooks";
    return {
      kind: "stop",
      text: blockingProblemText(
        `these ${ke} in ${settingsFilePathForSource} have errors and did not load, so they can't block or ask about anything`,
        [...y, ...filtered],
        personalConfigFixHint ?? s,
      ),
    };
  }
  let Z = describeDisabledHooks(settingsFilePathForSource, settings);
  if (Z !== undefined) return Z;
  if (L !== undefined && !S) return hooksNotRunningNotice(settingsFilePathForSource, settings, L);
  let Se = nonCommandHooks(settings?.hooks);
  if (Se.length > 0)
    return {
      kind: "stop",
      text: blockingProblemText(
        `these hooks in ${settingsFilePathForSource} are on ${PERSONAL_BLOCKING_EVENT_LIST.slice(0, -1).join(", ")} or ${PERSONAL_BLOCKING_EVENT_LIST.at(-1)}, where only command and http hooks are allowed in this session`,
        Se,
        personalConfigFixHint === undefined
          ? "Change them to command or http hooks or move them to another event, then start a new session."
          : `Change them to command or http hooks or move them to another event. ${personalConfigFixHint}`,
      ),
    };
  if (L !== undefined) return hooksNotRunningNotice(settingsFilePathForSource, settings, L);
  if (G.length > 0)
    return {
      kind: "notice",
      text:
        personalConfigFixHint === undefined
          ? `Some hooks in ${settingsFilePathForSource} have errors and won't run in this session. Your other hooks and settings still apply. To use them, fix these and start a new session:
${formatProblemList(G)}`
          : `Some hooks in ${settingsFilePathForSource} have errors and won't run in this session. Your other hooks and settings still apply. The hooks with errors:
${formatProblemList(G)}
${personalConfigFixHint}`,
    };
  return coworkSettingsHooksNotice(settingsFilePathForSource);
}
//@ chunk-e6aww6q8.js:1274253-1274454 placement
function settingsProblemDenial() {
  let e = describeSettingsProblem();
  if (e.kind !== "stop") return null;
  return {
    behavior: "deny",
    message: e.text,
    decisionReason: {
      type: "other",
      reason: "A problem with your own settings or hooks is blocking tool calls",
    },
  };
}
//@ chunk-e6aww6q8.js:1274454-1274704 placement
function blockingProblemText(e, n, r) {
  let s =
    n.length > 0
      ? `:
${formatProblemList(n)}`
      : ".";
  return `Claude Code is blocking every prompt and tool call in this session because ${e}${s}
${r} (This check is on because the session was started with CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG set.)`;
}
//@ chunk-e6aww6q8.js:1274704-1274894 placement
function formatProblemList(e) {
  let mapped = e
    .slice(0, MAX_SETTING_PROBLEMS_SHOWN)
    .map((s) => `- ${s.path || "(whole file)"}: ${stripValidValuesSuffix(s.message)}`);
  let r = e.length - mapped.length;
  return [...mapped, ...(r > 0 ? [`- and ${r} more problems in the file`] : [])].join(`
`);
}
//@ chunk-e6aww6q8.js:1274894-1274953 placement
function isBlockingSettingProblem(e) {
  return e.severity !== "warning" || isHooksSettingPath(e.path);
}
//@ chunk-e6aww6q8.js:1274953-1275036 placement
function isPreservedHookWarning(e) {
  return e.severity === "warning" && e.preserveOnWrite === true && isHooksSettingPath(e.path);
}
//@ chunk-e6aww6q8.js:1275036-1275189 placement
function isPromptGuardHookPath(e) {
  let sliced = e.path.slice(6);
  return [...PROMPT_GUARD_EVENTS].some(
    (r) =>
      sliced.toLowerCase() === r.toLowerCase() ||
      (sliced.startsWith(`${r}.`) && /^\d/.test(sliced.slice(r.length + 1))),
  );
}
//@ chunk-e6aww6q8.js:1275189-1275257 placement
function stripValidValuesSuffix(message) {
  return message.replace(/ Valid (?:events|types): .*$/, "");
}
//@ chunk-e6aww6q8.js:1275257-1275362 placement
function isPermissionRuleWarning(e) {
  return e.severity === "warning" && (e.path === "permissions.deny" || e.path === "permissions.ask");
}
//@ chunk-e6aww6q8.js:1275362-1275421 placement
function isHooksSettingPath(path) {
  return path === "hooks" || path.startsWith("hooks.");
}
//@ chunk-e6aww6q8.js:1275421-1275602 placement
function nonCommandHooks(hooks) {
  return PERSONAL_BLOCKING_EVENT_LIST.flatMap((n) =>
    (hooks?.[n] ?? []).flatMap((r, s) =>
      r.hooks.flatMap((hook, y) =>
        HOOK_TYPES_WITH_COMMAND.has(hook.type)
          ? []
          : [
              {
                path: `hooks.${n}.${s}.hooks.${y}`,
                message: `is a ${hook.type} hook`,
              },
            ],
      ),
    ),
  );
}
//@ chunk-e6aww6q8.js:1275602-1275776 placement
function hasHooks(hooks, n, isRetainedAsyncHook = () => true) {
  return Object.entries(hooks ?? {}).some(
    ([key, value]) =>
      (n === undefined || n.has(key)) &&
      Array.isArray(value) &&
      value.some((y) => Array.isArray(y?.hooks) && y.hooks.some((hook) => isRetainedAsyncHook(hook))),
  );
}
//@ chunk-e6aww6q8.js:1275776-1275852 placement
function isRetainedAsyncHook(e) {
  return e.type !== "command" || (e.async !== true && e.asyncRewake !== true);
}
//@ chunk-e6aww6q8.js:1275852-1276615 placement
function describeDisabledHooks(settingsFilePathForSource, n) {
  if (!ownHooksOffForUnreadablePolicy() || isCustomizationDisabled("hooks")) return;
  let hooks = getSettingsForSource("flagSettings")?.hooks;
  let s = [
    ...(hasHooks(n?.hooks) ? [settingsFilePathForSource] : []),
    ...(hasHooks(hooks) ? ["the settings Claude Code was started with (--settings)"] : []),
  ];
  if (s.length === 0) return;
  let h = `the hooks in ${s.join(" and ")} are turned off: the project's settings (.claude/settings.json or .claude/settings.local.json) set "disableAllHooks" and a source of your organization's managed settings could not be read, so Claude Code cannot tell whether your organization allows them`;
  let y = `Fix the managed settings (your administrator manages them), or remove "disableAllHooks" from the project's settings, then start a new session.`;
  return hasHooks(n?.hooks, PROMPT_GUARD_EVENTS, isRetainedAsyncHook) ||
    hasHooks(hooks, PROMPT_GUARD_EVENTS, isRetainedAsyncHook)
    ? {
        kind: "stop",
        text: blockingProblemText(h, [], y),
      }
    : {
        kind: "notice",
        text: `In this session ${h}. ${y}`,
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
function hooksNotRunningNotice(settingsFilePathForSource, settings, r) {
  if (!hasHooks(settings?.hooks))
    return {
      kind: "clear",
    };
  let s = r.fix === undefined ? "" : ` To run them, ${r.fix}.`;
  return {
    kind: "notice",
    text: `The hooks in ${settingsFilePathForSource} aren't running in this session because ${r.why}.${s}`,
  };
}
//@ chunk-e6aww6q8.js:1277713-1277955 placement
function coworkSettingsHooksNotice(settingsFilePathForSource) {
  if (basename(settingsFilePathForSource) !== USER_SETTINGS_FILE_NAMES.cowork)
    return {
      kind: "clear",
    };
  let n = join(dirname(settingsFilePathForSource), USER_SETTINGS_FILE_NAMES.default);
  if (getSettingsFilePathForSource("projectSettings") === n)
    return {
      kind: "clear",
    };
  return hooksNotRunningNotice(n, parseSettingsFile(n).settings, {
    why: `CLAUDE_CODE_USE_COWORK_PLUGINS makes Claude Code read ${settingsFilePathForSource} instead`,
  });
}
export { settingsProblemDenial, describeSettingsProblem };

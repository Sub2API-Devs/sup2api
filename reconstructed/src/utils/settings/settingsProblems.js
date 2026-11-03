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
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import { PERSONAL_BLOCKING_EVENTS } from "../hooks/hookFailures.js";
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
var RNo = new Set(["command", "http"]),
  Oqe = [...PERSONAL_BLOCKING_EVENTS],
  CNo = 10;
/**
 * 描述设置文件中的问题（受限模式、来源被排除），并给出修复建议。
 */
//@ chunk-e6aww6q8.js:1272291-1274253 placement
function describeSettingsProblem() {
  if (!isPersonalConfigRestricted()) return { kind: "clear" };
  let e = getSettingsFilePathForSource("userSettings");
  if (e === void 0) return { kind: "clear" };
  if (!isSettingSourceEnabled("userSettings")) {
    let ke = describeDisabledHooks(e, null);
    if (ke !== void 0) return ke;
    return hooksNotRunningNotice(e, parseSettingsFile(e).settings, {
      why: isRestrictedSession()
        ? "this session runs in restricted mode, which reads no user settings"
        : "this session's settings sources leave out user settings",
    });
  }
  let { settings: settings, errors: errors } = parseSettingsFile(e),
    s = "Fix the file, then start a new session.",
    h = getPersonalConfigFixHint();
  if (settings === null && errors.some((ke) => ke.severity !== "warning")) {
    let filtered = errors.filter(ANo);
    return {
      kind: "stop",
      text: blockingProblemText(
        `your user settings file ${e} has errors, so none of its hooks or permission rules are in effect`,
        filtered,
        filtered.some((we) => we.path !== "") ? (h ?? s) : s,
      ),
    };
  }
  let y = shouldAllowManagedPermissionRulesOnly() ? [] : errors.filter(isPermissionRuleWarning),
    S =
      !isCustomizationDisabled("hooks") &&
      (keepsOwnHooksDespiteDisableAll() ||
        !(
          shouldAllowManagedHooksOnly() ||
          shouldDisableAllHooksIncludingManaged() ||
          isRestrictedToPluginOnly("hooks")
        )),
    L =
      S && !isHookPolicyUnanswered()
        ? void 0
        : (describeManagedHooksPolicy(settings) ?? { why: "another settings file turns all hooks off" }),
    G = S ? errors.filter(xNo) : [],
    filtered = G.filter(isPromptGuardHookPath);
  if (y.length > 0 || filtered.length > 0) {
    let ke = filtered.length === 0 ? "rules" : y.length === 0 ? "hooks" : "rules and hooks";
    return {
      kind: "stop",
      text: blockingProblemText(
        `these ${ke} in ${e} have errors and did not load, so they can't block or ask about anything`,
        [...y, ...filtered],
        h ?? s,
      ),
    };
  }
  let Z = describeDisabledHooks(e, settings);
  if (Z !== void 0) return Z;
  if (L !== void 0 && !S) return hooksNotRunningNotice(e, settings, L);
  let Se = nonCommandHooks(settings?.hooks);
  if (Se.length > 0)
    return {
      kind: "stop",
      text: blockingProblemText(
        `these hooks in ${e} are on ${Oqe.slice(0, -1).join(", ")} or ${Oqe.at(-1)}, where only command and http hooks are allowed in this session`,
        Se,
        h === void 0
          ? "Change them to command or http hooks or move them to another event, then start a new session."
          : `Change them to command or http hooks or move them to another event. ${h}`,
      ),
    };
  if (L !== void 0) return hooksNotRunningNotice(e, settings, L);
  if (G.length > 0)
    return {
      kind: "notice",
      text:
        h === void 0
          ? `Some hooks in ${e} have errors and won't run in this session. Your other hooks and settings still apply. To use them, fix these and start a new session:
${formatProblemList(G)}`
          : `Some hooks in ${e} have errors and won't run in this session. Your other hooks and settings still apply. The hooks with errors:
${formatProblemList(G)}
${h}`,
    };
  return coworkSettingsHooksNotice(e);
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
  let mapped = e.slice(0, CNo).map((s) => `- ${s.path || "(whole file)"}: ${MNo(s.message)}`),
    r = e.length - mapped.length;
  return [...mapped, ...(r > 0 ? [`- and ${r} more problems in the file`] : [])].join(`
`);
}
//@ chunk-e6aww6q8.js:1274894-1274953 placement
function ANo(e) {
  return e.severity !== "warning" || M4t(e.path);
}
//@ chunk-e6aww6q8.js:1274953-1275036 placement
function xNo(e) {
  return e.severity === "warning" && e.preserveOnWrite === !0 && M4t(e.path);
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
function MNo(e) {
  return e.replace(/ Valid (?:events|types): .*$/, "");
}
//@ chunk-e6aww6q8.js:1275257-1275362 placement
function isPermissionRuleWarning(e) {
  return e.severity === "warning" && (e.path === "permissions.deny" || e.path === "permissions.ask");
}
//@ chunk-e6aww6q8.js:1275362-1275421 placement
function M4t(e) {
  return e === "hooks" || e.startsWith("hooks.");
}
//@ chunk-e6aww6q8.js:1275421-1275602 placement
function nonCommandHooks(e) {
  return Oqe.flatMap((n) =>
    (e?.[n] ?? []).flatMap((r, s) =>
      r.hooks.flatMap((hook, y) =>
        RNo.has(hook.type) ? [] : [{ path: `hooks.${n}.${s}.hooks.${y}`, message: `is a ${hook.type} hook` }],
      ),
    ),
  );
}
//@ chunk-e6aww6q8.js:1275602-1275776 placement
function hasHooks(e, n, r = () => !0) {
  return Object.entries(e ?? {}).some(
    ([s, h]) =>
      (n === void 0 || n.has(s)) &&
      Array.isArray(h) &&
      h.some((y) => Array.isArray(y?.hooks) && y.hooks.some((hook) => r(hook))),
  );
}
//@ chunk-e6aww6q8.js:1275776-1275852 placement
function A4t(e) {
  return e.type !== "command" || (e.async !== !0 && e.asyncRewake !== !0);
}
//@ chunk-e6aww6q8.js:1275852-1276615 placement
function describeDisabledHooks(e, n) {
  if (!ownHooksOffForUnreadablePolicy() || isCustomizationDisabled("hooks")) return;
  let r = getSettingsForSource("flagSettings")?.hooks,
    s = [
      ...(hasHooks(n?.hooks) ? [e] : []),
      ...(hasHooks(r) ? ["the settings Claude Code was started with (--settings)"] : []),
    ];
  if (s.length === 0) return;
  let h = `the hooks in ${s.join(" and ")} are turned off: the project's settings (.claude/settings.json or .claude/settings.local.json) set "disableAllHooks" and a source of your organization's managed settings could not be read, so Claude Code cannot tell whether your organization allows them`,
    y = `Fix the managed settings (your administrator manages them), or remove "disableAllHooks" from the project's settings, then start a new session.`;
  return hasHooks(n?.hooks, PROMPT_GUARD_EVENTS, A4t) || hasHooks(r, PROMPT_GUARD_EVENTS, A4t)
    ? { kind: "stop", text: blockingProblemText(h, [], y) }
    : { kind: "notice", text: `In this session ${h}. ${y}` };
}
//@ chunk-e6aww6q8.js:1276615-1277505 placement
function describeManagedHooksPolicy(e) {
  if (shouldDisableAllHooksIncludingManaged())
    return { why: `your organization's managed settings set "disableAllHooks"` };
  if (getSettingsForSource("policySettings")?.allowManagedHooksOnly === !0)
    return { why: "your organization's managed settings allow only managed hooks" };
  if (isRestrictedToPluginOnly("hooks"))
    return { why: "your organization's managed settings allow hooks only from plugins" };
  if (isCustomizationDisabled("hooks"))
    return { why: "this session runs in bare mode", fix: getBareModeExitHint() };
  if (isSafeMode()) return { why: "this session runs in safe mode", fix: getSafeModeExitHint() };
  if (isHookPolicyUnanswered())
    return {
      why: "your organization's managed settings haven't been read yet, so it isn't known whether it allows them",
    };
  if (getSettings_DEPRECATED().disableAllHooks === !0 && !keepsOwnHooksDespiteDisableAll()) {
    if (e?.disableAllHooks === !0)
      return {
        why: 'this file sets "disableAllHooks"',
        fix: "remove it from the file and start a new session",
      };
    if (getSettingsForSource("flagSettings")?.disableAllHooks === !0)
      return { why: 'the settings file Claude Code was started with (--settings) sets "disableAllHooks"' };
  }
  return;
}
//@ chunk-e6aww6q8.js:1277505-1277713 placement
function hooksNotRunningNotice(e, n, r) {
  if (!hasHooks(n?.hooks)) return { kind: "clear" };
  let s = r.fix === void 0 ? "" : ` To run them, ${r.fix}.`;
  return { kind: "notice", text: `The hooks in ${e} aren't running in this session because ${r.why}.${s}` };
}
//@ chunk-e6aww6q8.js:1277713-1277955 placement
function coworkSettingsHooksNotice(e) {
  if (basename_21(e) !== USER_SETTINGS_FILE_NAMES.cowork) return { kind: "clear" };
  let n = join_50(dirname_29(e), USER_SETTINGS_FILE_NAMES.default);
  if (getSettingsFilePathForSource("projectSettings") === n) return { kind: "clear" };
  return hooksNotRunningNotice(n, parseSettingsFile(n).settings, {
    why: `CLAUDE_CODE_USE_COWORK_PLUGINS makes Claude Code read ${e} instead`,
  });
}

export { settingsProblemDenial, describeSettingsProblem };

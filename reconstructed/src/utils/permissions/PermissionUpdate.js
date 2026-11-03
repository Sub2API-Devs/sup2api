/**
 * utils/permissions/PermissionUpdate.ts
 *
 * 权限更新（addRules/replaceRules/removeRules/setMode/addDirectories/removeDirectories）的运行时校验、应用到 ToolPermissionContext 与持久化到 settings 文件；混入若干同名误配的小函数。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/PermissionUpdate.ts
 * pieces: chunk-1de6ar4n.js (1), chunk-4kzs0ch0.js (1), chunk-82kqcve8.js (36)
 * attribution: placement 18, fingerprint 5, layout 15
 */
import { posix, posix as posix_2, posix as posix_3, posix as posix_4, posix as posix_5 } from "path";
import {
  getAllPolicyTierSettings,
  basePolicyNamesHelper,
  getPolicySettingsLoadErrors,
  getManagedFileLoadState,
  updateSettingsForSourceWithTransform,
  updateSettingsForSource,
} from "../settings/settings.js";
import {
  getEligibilityMemo,
  getLastLoadStatus,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { policyHelperConsentState, oOt, GRi, sOt } from "../settings/policyHelper/helperRemote.js";
import { ave, uIn, One, isPolicyReadAnswered } from "../settings/managedPluginTiers.js";
import { policySettingsUnreadable } from "../hooks/hooksConfigSnapshot.js";
import { Ao } from "../../bootstrap/sessionFeatureValues.js";
import { logError } from "../log.js";
import { env } from "../env.js";
import { getDenyRules, getAskRules, NARROWING_RULE_SOURCES, toolMatchesRule } from "./permissions.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import {
  permissionRuleValueFromString,
  canonicalToolName,
  aliasesFor,
  escapeRuleContent,
} from "./permissionRuleParser.js";
import { formatPermissionRule } from "./disallowedToolsFlag.js";
import { jsonStringify } from "../slowOperations.js";
import { truncateToLength } from "../stringUtils.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { isSessionRuleUpdate, propagateAbort } from "../../components/permissions/hooks.js";
import { logForDebugging } from "../debug.js";
import { syncRemoteBrowserCardAnswers } from "./toolPermissionContext.js";
import { getToolNameForPermissionCheck } from "../../services/mcp/mcpStringUtils.js";
import { addPermissionRulesToSettings } from "./permissionsLoader.js";
import { toPosixPath } from "./filesystem.js";
import { getAdditionalDirectoriesForClaudeMd } from "../../bootstrap/state.js";
import { PATH_RULE_CARVE_OUT_RE } from "../settings/permissionRuleCarveOut.js";

//@ chunk-82kqcve8.js:219856-219950 placement
function L9r() {
  return getAllPolicyTierSettings().some((e) => e.permissions?.blockReadsOutsideWorkingDirectories === !0);
}
//@ chunk-82kqcve8.js:219980-220047 placement
function cp() {
  let e = getEligibilityMemo();
  return e === !1 || (e === !0 && getLastLoadStatus()?.state === "ok");
}
//@ chunk-82kqcve8.js:220047-220175 placement
function isPolicyHelperConsentSatisfied() {
  let { state: state, applied: applied } = policyHelperConsentState();
  return (
    !oOt() &&
    !GRi() &&
    sOt().length === 0 &&
    (state === "ok" || (state === "none" && (applied !== "none" || !basePolicyNamesHelper())))
  );
}
//@ chunk-82kqcve8.js:220175-220259 placement
function wi() {
  return ave() && !uIn() && One().loadState !== "didNotLoad" && getPolicySettingsLoadErrors().length === 0;
}
//@ chunk-82kqcve8.js:220259-220298 placement
function mp() {
  return wi() && isPolicyReadAnswered("hklm");
}
//@ chunk-82kqcve8.js:220298-220337 placement
function fp() {
  return wi() && isPolicyReadAnswered("hkcu");
}
//@ chunk-82kqcve8.js:220337-220385 placement
function pp() {
  return getManagedFileLoadState() !== "didNotLoad" && hasRules();
}
//@ chunk-82kqcve8.js:220385-220428 placement
function hasRules() {
  return !policySettingsUnreadable() && getPolicySettingsLoadErrors().length === 0;
}
//@ chunk-82kqcve8.js:220428-220500 placement
var hp = {
  remote: cp,
  helper: isPolicyHelperConsentSatisfied,
  plist: wi,
  hklm: mp,
  hkcu: fp,
  file: pp,
  parent: hasRules,
};
//@ chunk-82kqcve8.js:220500-220669 placement
function areManagedSourcesClear() {
  try {
    return Object.values(hp).every((e) => e());
  } catch (error) {
    let n = Ao();
    if (n.managedSourcesReadErrorLogged !== !0) ((n.managedSourcesReadErrorLogged = !0), logError(error));
    return !1;
  }
}
/**
 * 在 CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS 下记录规则集是否不含路径范围规则（豁免移除的前提）。
 */
//@ chunk-82kqcve8.js:220669-220825 placement
function noteRemovalWaiverRules(e) {
  if (!env.CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS) return;
  let n = Ao();
  n.removalWaiverRulesClear = n.removalWaiverRulesClear !== !1 && !hasPathScopedRules(e);
}
/**
 * 规则集含路径范围规则时撤销移除豁免。
 */
//@ chunk-82kqcve8.js:220825-220936 placement
function clearRemovalWaiverIfPathScoped(e) {
  if (env.CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS && hasPathScopedRules(e))
    Ao().removalWaiverRulesClear = !1;
}
/**
 * 非子会话且启用 EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS 时，规则集无路径范围规则、无未完成的设置改动、托管来源都正常才返回 true。
 */
//@ chunk-82kqcve8.js:220936-221147 placement
function isRemovalWaiverActive(e) {
  if (!env.CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS || env.CLAUDE_CODE_CHILD_SESSION) return !1;
  clearRemovalWaiverIfPathScoped(e);
  let n = Ao();
  return (
    n.removalWaiverRulesClear === !0 && (n.settingsChangesUnfinished ?? 0) === 0 && areManagedSourcesClear()
  );
}
//@ chunk-82kqcve8.js:221147-222106 placement
function checkBypassPermissionsEnv(e) {
  if (
    !env.CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS ||
    env.CLAUDE_CODE_CHILD_SESSION ||
    (e.mode !== "bypassPermissions" && !e.isBypassPermissionsModeAvailable)
  )
    return;
  if ((clearRemovalWaiverIfPathScoped(e), Ao().removalWaiverRulesClear !== !0))
    return "CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS has no effect in this session: dangerous rm commands keep their usual checks.";
  return ave() && !(isPolicyReadAnswered("hklm") && isPolicyReadAnswered("hkcu"))
    ? "CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS has no effect while the Windows registry cannot be read for managed settings: dangerous rm commands keep their usual checks, and can run without a prompt in bypass permissions mode if the registry later becomes readable. If you didn't set it, check your shell profile."
    : "CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS is set, so dangerous rm commands can run without a prompt in bypass permissions mode once managed settings and plugin hooks have loaded. If you didn't set it, check your shell profile.";
}
//@ chunk-82kqcve8.js:222106-222303 placement = getDenyRuleForAgent (0.771)
function hasPathScopedRules(e) {
  return (
    e.blockReadsOutsideWorkingDirectories === !0 ||
    [...getDenyRules(e), ...getAskRules(e)].some(
      (rule) =>
        !(NARROWING_RULE_SOURCES.includes(rule.source) && rule.ruleValue.ruleContent === void 0) &&
        [BASH_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME].some((r) =>
          toolMatchesRule(e, { name: r }, rule),
        ),
    )
  );
}
//@ chunk-82kqcve8.js:222303-222397 placement
function gar(e) {
  let n = permissionRuleValueFromString(formatPermissionRule(e));
  return n.toolName === e.toolName && n.ruleContent === e.ruleContent;
}
//@ chunk-82kqcve8.js:222397-222545 placement
function canonicalizeAliasedRule(e) {
  let n = permissionRuleValueFromString(formatPermissionRule(e));
  if (
    n.ruleContent !== e.ruleContent ||
    n.toolName === e.toolName ||
    canonicalToolName(e.toolName) !== n.toolName ||
    !gar(n)
  )
    return null;
  return n;
}
/**
 * 合法的更新目的地（settings 五层 + cliArg/command/toolsNarrowing/mcpServerPolicy/hostCredential/session/mcpMount）与 allow/deny/ask → alwaysAllowRules/alwaysDenyRules/alwaysAskRules 的映射。
 */
//@ chunk-82kqcve8.js:222545-222841 layout
var PERMISSION_UPDATE_DESTINATION_SET = {
    userSettings: !0,
    projectSettings: !0,
    localSettings: !0,
    flagSettings: !0,
    policySettings: !0,
    cliArg: !0,
    command: !0,
    toolsNarrowing: !0,
    mcpServerPolicy: !0,
    hostCredential: !0,
    session: !0,
    mcpMount: !0,
  },
  VALID_PERMISSION_UPDATE_DESTINATIONS = new Set(Object.keys(PERMISSION_UPDATE_DESTINATION_SET)),
  RULE_BEHAVIOR_CONTEXT_KEYS = { allow: "alwaysAllowRules", deny: "alwaysDenyRules", ask: "alwaysAskRules" };
/**
 * 从更新列表中取出所有 addRules 的规则值。
 */
//@ chunk-82kqcve8.js:222841-222960 fingerprint = extractRules (1)
function extractRules(updates) {
  if (!updates) return [];
  return updates.flatMap((update) => {
    switch (update.type) {
      case "addRules":
        return update.rules;
      default:
        return [];
    }
  });
}
//@ chunk-82kqcve8.js:222960-223120 layout
function isPermissionRuleValueShape(e) {
  if (e === null || typeof e !== "object") return !1;
  let n = e;
  return typeof n.toolName === "string" && (n.ruleContent === void 0 || typeof n.ruleContent === "string");
}
//@ chunk-82kqcve8.js:223120-223245 layout
function describeValueForLog(e) {
  let n;
  try {
    n = isPermissionRuleValueShape(e) ? formatPermissionRule(e) : String(jsonStringify(e));
  } catch {
    n = "(unprintable value)";
  }
  return n.length > 200 ? `${truncateToLength(n, 200)}\u2026` : n;
}
/**
 * 运行时校验一条权限更新，返回 {action:"apply", update} 或 {action:"drop", reason}：目的地/行为必须在枚举内；放宽型（allow 的 add/replace、非 allow 的 remove）规则必须形状合法且能经存储往返（否则尝试 bp 修正）；收紧型规则只丢弃畸形项并按解析结果规范化；目录列表不得含空串/NUL。
 */
//@ chunk-82kqcve8.js:223245-225938 layout
function validatePermissionUpdate(update) {
  if (update === null || typeof update !== "object")
    return { action: "drop", reason: `non-object permission update: ${describeValueForLog(update)}` };
  let { type: type, destination: destination } = update;
  if (typeof destination !== "string" || !VALID_PERMISSION_UPDATE_DESTINATIONS.has(destination))
    return {
      action: "drop",
      reason: `${typeof type === "string" ? describeValueForLog(type) : "permission update"} with out-of-enum destination: ${describeValueForLog(destination)}`,
    };
  let destinationChecked = destination;
  switch (type) {
    case "addRules":
    case "replaceRules":
    case "removeRules": {
      let behavior = update.behavior;
      if (typeof behavior !== "string" || !Object.hasOwn(RULE_BEHAVIOR_CONTEXT_KEYS, behavior))
        return {
          action: "drop",
          reason: `${type} with out-of-enum behavior: ${describeValueForLog(behavior)}`,
        };
      let behaviorChecked = behavior,
        rules = update.rules;
      if (!Array.isArray(rules))
        return { action: "drop", reason: `${type} (${behaviorChecked}) whose rules field is not an array` };
      let rulesCopy = [...rules],
        mapped = rulesCopy.map((L) => {
          if (L === null || typeof L !== "object") return L;
          let { toolName: toolName, ruleContent: ruleContent } = L;
          return ruleContent === void 0
            ? { toolName: toolName }
            : { toolName: toolName, ruleContent: ruleContent };
        });
      if (
        !(type === "removeRules"
          ? behaviorChecked === "allow"
          : behaviorChecked === "deny" || behaviorChecked === "ask")
      ) {
        let L = [];
        for (let j of mapped) {
          if (!isPermissionRuleValueShape(j))
            return {
              action: "drop",
              reason: `widening ${type} (${behaviorChecked}) carries a shape-invalid rule: ${describeValueForLog(j)}`,
            };
          if (!gar(j)) {
            let G = type === "removeRules" ? null : canonicalizeAliasedRule(j);
            if (G !== null) {
              L.push(G);
              continue;
            }
            return {
              action: "drop",
              reason: `widening ${type} (${behaviorChecked}) carries a rule that does not survive the store round-trip: ${describeValueForLog(j)}`,
            };
          }
          L.push(j);
        }
        return {
          action: "apply",
          update: { type: type, behavior: behaviorChecked, destination: destinationChecked, rules: L },
        };
      }
      let normalizedRules = [];
      for (let L of mapped) {
        if (!isPermissionRuleValueShape(L)) continue;
        let j = permissionRuleValueFromString(formatPermissionRule(L));
        if (j.toolName !== L.toolName || j.ruleContent !== L.ruleContent) normalizedRules.push(j);
        else normalizedRules.push(L);
      }
      if (normalizedRules.length === 0 && rulesCopy.length > 0)
        return {
          action: "drop",
          reason: `restrictive ${type} (${behaviorChecked}) in which every rule is shape-invalid`,
        };
      return {
        action: "apply",
        update: {
          type: type,
          behavior: behaviorChecked,
          destination: destinationChecked,
          rules: normalizedRules,
        },
      };
    }
    case "addDirectories": {
      let directories = update.directories;
      if (!Array.isArray(directories))
        return { action: "drop", reason: "addDirectories whose directories field is not an array" };
      let y = [...directories];
      for (let w of y) {
        if (typeof w !== "string")
          return {
            action: "drop",
            reason: `addDirectories carries a non-string directory: ${describeValueForLog(w)}`,
          };
        if (w.trim() === "")
          return {
            action: "drop",
            reason: `addDirectories carries a trim-empty directory: ${describeValueForLog(w)}`,
          };
        if (w.includes("\x00"))
          return {
            action: "drop",
            reason: `addDirectories carries a directory containing a null byte: ${describeValueForLog(w)}`,
          };
      }
      return { action: "apply", update: { type: type, destination: destinationChecked, directories: y } };
    }
    case "removeDirectories": {
      let directories = update.directories;
      if (!Array.isArray(directories))
        return { action: "drop", reason: "removeDirectories whose directories field is not an array" };
      let filtered = [...directories].filter((w) => typeof w === "string");
      return {
        action: "apply",
        update: { type: type, destination: destinationChecked, directories: filtered },
      };
    }
    case "setMode": {
      let mode = update.mode;
      if (typeof mode !== "string")
        return { action: "drop", reason: `setMode with non-string mode: ${describeValueForLog(mode)}` };
      return { action: "apply", update: { type: type, destination: destinationChecked, mode: mode } };
    }
    default:
      return { action: "drop", reason: `unknown permission update type: ${describeValueForLog(type)}` };
  }
}
//@ chunk-82kqcve8.js:225938-226138 layout
function logRefusedPermissionUpdate(sink, reason) {
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Permission update refused at the runtime sink (${sink}; the check is pure, so every judgement site refuses identically): ${reason}`,
      "Permission update refused at the runtime sink",
    ),
  );
}
/**
 * 批量校验更新，丢弃不合法项并记错误日志。
 */
//@ chunk-82kqcve8.js:226138-226375 layout
function sanitizePermissionUpdates(updates) {
  if (!Array.isArray(updates))
    return (logRefusedPermissionUpdate("resolution-boundary", "non-array permission update list"), []);
  let valid = [];
  for (let r of updates) {
    let s = validatePermissionUpdate(r);
    if (s.action === "drop") {
      logRefusedPermissionUpdate("resolution-boundary", s.reason);
      continue;
    }
    valid.push(s.update);
  }
  return valid;
}
/**
 * 向权限上下文添加额外工作目录（记录来源），返回新上下文。
 */
//@ chunk-82kqcve8.js:226375-226527 layout
function addAdditionalWorkingDirectories(context, directories, source) {
  let dirs = new Map(context.additionalWorkingDirectories);
  for (let h of directories) dirs.set(h, { path: h, source: source });
  return { ...context, additionalWorkingDirectories: dirs };
}
/**
 * 校验后应用单条更新；Desktop Code 标签会话会丢弃未限定到单个 skill 的 .claude 会话 Edit allow 规则（Omi）；最后经 QYt 后处理。
 */
//@ chunk-82kqcve8.js:226527-226823 layout
function applyValidatedPermissionUpdate(context, update, { announce: r = !0 } = {}) {
  let validation = validatePermissionUpdate(update);
  if (validation.action === "drop")
    return (logRefusedPermissionUpdate("in-memory", validation.reason), context);
  let filtered = isSessionRuleUpdate(validation.update);
  if (filtered !== validation.update)
    logForDebugging(
      "Permission update: dropped .claude session Edit allow rule(s) not narrowed to one skill (Desktop Code tab session)",
    );
  return filtered === void 0
    ? context
    : syncRemoteBrowserCardAnswers(context, applyPermissionUpdate(context, filtered, r));
}
//@ chunk-82kqcve8.js:226823-226850 layout
function logIfAnnounced(e, n) {
  if (e) logForDebugging(n);
}
/**
 * 把一条（已校验的）更新应用到 ToolPermissionContext：setMode（bypass 不可用时拒绝）、addRules/replaceRules/removeRules（按目的地写入对应规则表）、addDirectories/removeDirectories。
 */
//@ chunk-82kqcve8.js:226850-228601 fingerprint = applyPermissionUpdate (0.884)
function applyPermissionUpdate(context, update, announce) {
  switch (update.type) {
    case "setMode":
      if (update.mode === "bypassPermissions" && !context.isBypassPermissionsModeAvailable)
        return (
          logForDebugging(
            "Ignoring permission update: setMode 'bypassPermissions' rejected \u2014 mode is not available (disableBypassPermissionsMode set, or session not launched in bypassPermissions mode)",
          ),
          context
        );
      return (
        logIfAnnounced(announce, `Applying permission update: Setting mode to '${update.mode}'`),
        { ...context, mode: update.mode }
      );
    case "addRules": {
      let ruleStrings = update.rules.map((rule) => formatPermissionRule(rule));
      logIfAnnounced(
        announce,
        `Applying permission update: Adding ${update.rules.length} ${update.behavior} rule(s) to destination '${update.destination}': ${jsonStringify(ruleStrings)}`,
      );
      let h = RULE_BEHAVIOR_CONTEXT_KEYS[update.behavior];
      return {
        ...context,
        [h]: {
          ...context[h],
          [update.destination]: [...(context[h][update.destination] || []), ...ruleStrings],
        },
      };
    }
    case "replaceRules": {
      let ruleStrings = update.rules.map((rule) => formatPermissionRule(rule));
      logIfAnnounced(
        announce,
        `Replacing all ${update.behavior} rules for destination '${update.destination}' with ${update.rules.length} rule(s): ${jsonStringify(ruleStrings)}`,
      );
      let h = RULE_BEHAVIOR_CONTEXT_KEYS[update.behavior];
      return { ...context, [h]: { ...context[h], [update.destination]: ruleStrings } };
    }
    case "addDirectories":
      return (
        logIfAnnounced(
          announce,
          `Applying permission update: Adding ${update.directories.length} director${update.directories.length === 1 ? "y" : "ies"} with destination '${update.destination}': ${jsonStringify(update.directories)}`,
        ),
        addAdditionalWorkingDirectories(context, update.directories, update.destination)
      );
    case "removeRules": {
      let ruleStrings = update.rules.map((rule) => formatPermissionRule(rule));
      logIfAnnounced(
        announce,
        `Applying permission update: Removing ${update.rules.length} ${update.behavior} rule(s) from source '${update.destination}': ${jsonStringify(ruleStrings)}`,
      );
      let h = RULE_BEHAVIOR_CONTEXT_KEYS[update.behavior],
        existingRules = context[h][update.destination] || [],
        rulesToRemove = new Set(ruleStrings),
        filteredRules = existingRules.filter((rule) => !rulesToRemove.has(rule));
      return { ...context, [h]: { ...context[h], [update.destination]: filteredRules } };
    }
    case "removeDirectories": {
      logIfAnnounced(
        announce,
        `Applying permission update: Removing ${update.directories.length} director${update.directories.length === 1 ? "y" : "ies"}: ${jsonStringify(update.directories)}`,
      );
      let newAdditionalDirs = new Map(context.additionalWorkingDirectories);
      for (let directory of update.directories) newAdditionalDirs.delete(directory);
      return { ...context, additionalWorkingDirectories: newAdditionalDirs };
    }
    default:
      return context;
  }
}
/**
 * 从 allow 的 add/replace 更新中去掉针对指定工具的“整工具”（无内容）规则，豁免条件由回调决定。
 */
//@ chunk-82kqcve8.js:228601-228995 layout
function dropBareAllowRulesForTools(updates, toolNames, isExempt, isTargeted) {
  let h = (w, S) => {
      let R = permissionRuleValueFromString(formatPermissionRule(w));
      if (R.ruleContent !== void 0) return !1;
      if (!(toolNames.has(R.toolName) || isTargeted(R))) return !1;
      return !isExempt(R, S);
    },
    y = [];
  for (let w of updates) {
    if (!((w.type === "addRules" || w.type === "replaceRules") && w.behavior === "allow")) {
      y.push(w);
      continue;
    }
    let filtered = w.rules.filter((rule) => !h(rule, w.destination));
    if (filtered.length === w.rules.length) y.push(w);
    else if (filtered.length > 0) y.push({ ...w, rules: filtered });
  }
  return y;
}
/**
 * 工具名及其全部别名组成的集合。
 */
//@ chunk-82kqcve8.js:228995-229068 layout
function getToolNameWithAliases(e, n) {
  let r = getToolNameForPermissionCheck(e);
  return new Set([r, ...aliasesFor(r, n.toolAliases)]);
}
/**
 * 依次应用多条更新；模式变化时清掉 startupModeDecidedByProactivityLevel。
 */
//@ chunk-82kqcve8.js:229068-229269 layout
function applyPermissionUpdates(context, updates, options = {}) {
  (propagateAbort(updates), clearRemovalWaiverIfPathScoped(context));
  let next = context;
  for (let h of updates) next = applyValidatedPermissionUpdate(next, h, options);
  if (next.mode !== context.mode && next.startupModeDecidedByProactivityLevel !== void 0)
    next = { ...next, startupModeDecidedByProactivityLevel: void 0 };
  return next;
}
/**
 * 只有 localSettings/userSettings/projectSettings 可持久化。
 */
//@ chunk-82kqcve8.js:229269-229355 layout = supportsPersistence (1)
function supportsPersistence(destination) {
  return (
    destination === "localSettings" || destination === "userSettings" || destination === "projectSettings"
  );
}
/**
 * 先校验 PermissionUpdate（validatePermissionUpdate），被丢弃时记录原因，通过后持久化。
 */
//@ chunk-82kqcve8.js:229355-229462 layout
async function persistValidatedPermissionUpdate(e, n) {
  let r = validatePermissionUpdate(e);
  if (r.action === "drop") {
    logRefusedPermissionUpdate("disk", r.reason);
    return;
  }
  return persistPermissionUpdate(r.update, n);
}
/**
 * 把更新写入 settings 文件（仅三个可写层）：addRules/removeRules/replaceRules 改 permissions.allow|deny|ask，add/removeDirectories 改 additionalDirectories，setMode 写 defaultMode；setMode bypassPermissions 只在会话内生效，不落盘。
 */
//@ chunk-82kqcve8.js:229462-231258 fingerprint = persistPermissionUpdate (0.963)
async function persistPermissionUpdate(update, storage) {
  if (!supportsPersistence(update.destination)) return;
  if (update.type === "setMode" && update.mode === "bypassPermissions") {
    logForDebugging(
      `setMode:'bypassPermissions' is session-scoped; not persisting as defaultMode to ${update.destination}`,
    );
    return;
  }
  switch (
    (logForDebugging(`Persisting permission update: ${update.type} to source '${update.destination}'`),
    update.type)
  ) {
    case "addRules": {
      (logForDebugging(
        `Persisting ${update.rules.length} ${update.behavior} rule(s) to ${update.destination}`,
      ),
        await addPermissionRulesToSettings(
          { ruleValues: update.rules, ruleBehavior: update.behavior },
          update.destination,
          storage,
        ));
      break;
    }
    case "addDirectories": {
      logForDebugging(
        `Persisting ${update.directories.length} director${update.directories.length === 1 ? "y" : "ies"} to ${update.destination}`,
      );
      let r = [...update.directories];
      await updateSettingsForSourceWithTransform(
        update.destination,
        (s) => {
          let h = s?.permissions?.additionalDirectories || [],
            dirsToAdd = r.filter((dir) => !h.includes(dir));
          if (dirsToAdd.length === 0) return null;
          return { permissions: { additionalDirectories: [...h, ...dirsToAdd] } };
        },
        void 0,
        storage,
      );
      break;
    }
    case "removeRules": {
      logForDebugging(
        `Removing ${update.rules.length} ${update.behavior} rule(s) from ${update.destination}`,
      );
      let rulesToRemove = new Set(update.rules.map(formatPermissionRule)),
        behavior = update.behavior;
      await updateSettingsForSourceWithTransform(
        update.destination,
        (h) => {
          let filteredRules = (h?.permissions?.[behavior] || []).filter((rule) => {
            let normalized = formatPermissionRule(permissionRuleValueFromString(rule));
            return !rulesToRemove.has(normalized);
          });
          return { permissions: { [behavior]: filteredRules } };
        },
        void 0,
        storage,
      );
      break;
    }
    case "removeDirectories": {
      logForDebugging(
        `Removing ${update.directories.length} director${update.directories.length === 1 ? "y" : "ies"} from ${update.destination}`,
      );
      let dirsToRemove = new Set(update.directories);
      await updateSettingsForSourceWithTransform(
        update.destination,
        (s) => ({
          permissions: {
            additionalDirectories: (s?.permissions?.additionalDirectories || []).filter(
              (dir) => !dirsToRemove.has(dir),
            ),
          },
        }),
        void 0,
        storage,
      );
      break;
    }
    case "setMode": {
      (logForDebugging(`Persisting mode '${update.mode}' to ${update.destination}`),
        await updateSettingsForSource(
          update.destination,
          { permissions: { defaultMode: update.mode } },
          void 0,
          storage,
        ));
      break;
    }
    case "replaceRules": {
      logForDebugging(
        `Replacing all ${update.behavior} rules in ${update.destination} with ${update.rules.length} rule(s)`,
      );
      let ruleStrings = update.rules.map(formatPermissionRule),
        behavior = update.behavior;
      await updateSettingsForSourceWithTransform(
        update.destination,
        () => ({ permissions: { [behavior]: ruleStrings } }),
        void 0,
        storage,
      );
      break;
    }
  }
}
//@ chunk-82kqcve8.js:231258-231311 layout
async function persistPermissionUpdates(e, n) {
  for (let r of e) await persistValidatedPermissionUpdate(r, n);
}
/**
 * 为目录生成 Read(<dir>/**) 的 allow 规则建议（转义 glob，绝对路径前加 /）；根目录返回 undefined。
 */
//@ chunk-82kqcve8.js:231311-231561 fingerprint = createReadRuleSuggestion (0.838)
function createReadRuleSuggestion(dirPath, destination = "session") {
  let pathForPattern = toPosixPath(dirPath);
  if (pathForPattern === "/") return;
  let s = escapeRuleContent(pathForPattern, { escapeGlobs: !0 }),
    ruleContent = posix_5.isAbsolute(pathForPattern)
      ? `/${s}/**`
      : s.startsWith("\\")
        ? `./${s}/**`
        : `${s}/**`;
  return {
    type: "addRules",
    rules: [{ toolName: FILE_READ_TOOL_NAME, ruleContent: ruleContent }],
    behavior: "allow",
    destination: destination,
  };
}
/**
 * 给权限上下文追加附加工作目录（来源 session）。与 it2 无关。
 */
//@ chunk-1de6ar4n.js:264-309 placement = isIt2CliAvailable (0.65)
function addSessionWorkingDirectories(toolPermissionContext) {
  return addAdditionalWorkingDirectories(
    toolPermissionContext,
    getAdditionalDirectoriesForClaudeMd(),
    "session",
  );
}
/**
 * 与磁盘已存规则合并：目的地为 user/project/local 设置时，把已存规则放前、再加上新规则中非特殊形式的项。
 */
//@ chunk-4kzs0ch0.js:1689-1845 fingerprint = supportsPersistence (1)
function mergeWithStoredRules(s, e, n, o) {
  if (o === void 0 || (e !== "userSettings" && e !== "projectSettings" && e !== "localSettings")) return s;
  return [...o[e][n], ...s.filter((r) => !PATH_RULE_CARVE_OUT_RE.test(r))];
}

export {
  gar,
  dropBareAllowRulesForTools,
  getToolNameWithAliases,
  supportsPersistence,
  applyPermissionUpdates,
  persistPermissionUpdates,
  addAdditionalWorkingDirectories,
  isRemovalWaiverActive,
  applyValidatedPermissionUpdate,
  clearRemovalWaiverIfPathScoped,
  L9r,
  createReadRuleSuggestion,
  persistValidatedPermissionUpdate,
  extractRules,
  checkBypassPermissionsEnv,
  noteRemovalWaiverRules,
  mergeWithStoredRules,
  sanitizePermissionUpdates,
  addSessionWorkingDirectories,
};

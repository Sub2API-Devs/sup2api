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
import { posix } from "path";
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
import {
  policyHelperConsentState,
  hasHelperPassInFlight,
  releaseLatchWhenTickSettles,
  helperSelectionWarnings,
} from "../settings/policyHelper/helperRemote.js";
import {
  hasMdmResult,
  isMdmLoadInFlight,
  mdmResult,
  isPolicyReadAnswered,
} from "../settings/mdm/mdmLoader.js";
import { policySettingsUnreadable } from "../hooks/hooksConfigSnapshot.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { logError } from "../log.js";
import { env } from "../env.js";
import {
  getDenyRules,
  getAskRules,
  NARROWING_RULE_SOURCES as NARROWING_RULE_SOURCES_2,
  toolMatchesRule,
} from "./permissions.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-82kqcve8.js:219856-219950 placement
/**
 * blocksReadsOutsideWorkingDirs：策略设置是否要求阻断工作目录外的读取。
 */
function blocksReadsOutsideWorkingDirs() {
  return getAllPolicyTierSettings().some(
    (settings) => settings.permissions?.blockReadsOutsideWorkingDirectories === true,
  );
}
//@ chunk-82kqcve8.js:219980-220047 placement
function isRemotePolicyEligible() {
  let eligibilityMemo = getEligibilityMemo();
  return eligibilityMemo === false || (eligibilityMemo === true && getLastLoadStatus()?.state === "ok");
}
//@ chunk-82kqcve8.js:220047-220175 placement
function isPolicyHelperConsentSatisfied() {
  let { state, applied } = policyHelperConsentState();
  return (
    !hasHelperPassInFlight() &&
    !releaseLatchWhenTickSettles() &&
    helperSelectionWarnings().length === 0 &&
    (state === "ok" || (state === "none" && (applied !== "none" || !basePolicyNamesHelper())))
  );
}
//@ chunk-82kqcve8.js:220175-220259 placement
function isPolicyPlistsAvailable() {
  return (
    hasMdmResult() &&
    !isMdmLoadInFlight() &&
    mdmResult().loadState !== "didNotLoad" &&
    getPolicySettingsLoadErrors().length === 0
  );
}
//@ chunk-82kqcve8.js:220259-220298 placement
function isHklmPolicyAvailable() {
  return isPolicyPlistsAvailable() && isPolicyReadAnswered("hklm");
}
//@ chunk-82kqcve8.js:220298-220337 placement
function isHkcuPolicyAvailable() {
  return isPolicyPlistsAvailable() && isPolicyReadAnswered("hkcu");
}
//@ chunk-82kqcve8.js:220337-220385 placement
function hasManagedFileRules() {
  return getManagedFileLoadState() !== "didNotLoad" && hasRules();
}
//@ chunk-82kqcve8.js:220385-220428 placement
function hasRules() {
  return !policySettingsUnreadable() && getPolicySettingsLoadErrors().length === 0;
}
//@ chunk-82kqcve8.js:220428-220500 placement
var POLICY_SOURCE_PROBES = {
  remote: isRemotePolicyEligible,
  helper: isPolicyHelperConsentSatisfied,
  plist: isPolicyPlistsAvailable,
  hklm: isHklmPolicyAvailable,
  hkcu: isHkcuPolicyAvailable,
  file: hasManagedFileRules,
  parent: hasRules,
};
//@ chunk-82kqcve8.js:220500-220669 placement
function areManagedSourcesClear() {
  try {
    return Object.values(POLICY_SOURCE_PROBES).every((probe) => probe());
  } catch (error) {
    let sessionFeatureValues = getSessionFeatureValues();
    if (sessionFeatureValues.managedSourcesReadErrorLogged !== true) {
      sessionFeatureValues.managedSourcesReadErrorLogged = true;
      logError(error);
    }
    return false;
  }
}
//@ chunk-82kqcve8.js:220669-220825 placement
/**
 * 在 CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS 下记录规则集是否不含路径范围规则（豁免移除的前提）。
 */
function noteRemovalWaiverRules(context) {
  if (!env.CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS) return;
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.removalWaiverRulesClear =
    sessionFeatureValues.removalWaiverRulesClear !== false && !hasPathScopedRules(context);
}
//@ chunk-82kqcve8.js:220825-220936 placement
/**
 * 规则集含路径范围规则时撤销移除豁免。
 */
function clearRemovalWaiverIfPathScoped(context) {
  if (env.CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS && hasPathScopedRules(context))
    getSessionFeatureValues().removalWaiverRulesClear = false;
}
//@ chunk-82kqcve8.js:220936-221147 placement
/**
 * 非子会话且启用 EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS 时，规则集无路径范围规则、无未完成的设置改动、托管来源都正常才返回 true。
 */
function isRemovalWaiverActive(context) {
  if (!env.CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS || env.CLAUDE_CODE_CHILD_SESSION) return false;
  clearRemovalWaiverIfPathScoped(context);
  let sessionFeatureValues = getSessionFeatureValues();
  return (
    sessionFeatureValues.removalWaiverRulesClear === true &&
    (sessionFeatureValues.settingsChangesUnfinished ?? 0) === 0 &&
    areManagedSourcesClear()
  );
}
//@ chunk-82kqcve8.js:221147-222106 placement
function checkBypassPermissionsEnv(toolPermissionContext) {
  if (
    !env.CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS ||
    env.CLAUDE_CODE_CHILD_SESSION ||
    (toolPermissionContext.mode !== "bypassPermissions" &&
      !toolPermissionContext.isBypassPermissionsModeAvailable)
  )
    return;
  clearRemovalWaiverIfPathScoped(toolPermissionContext);
  if (getSessionFeatureValues().removalWaiverRulesClear !== true)
    return "CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS has no effect in this session: dangerous rm commands keep their usual checks.";
  return hasMdmResult() && !(isPolicyReadAnswered("hklm") && isPolicyReadAnswered("hkcu"))
    ? "CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS has no effect while the Windows registry cannot be read for managed settings: dangerous rm commands keep their usual checks, and can run without a prompt in bypass permissions mode if the registry later becomes readable. If you didn't set it, check your shell profile."
    : "CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS is set, so dangerous rm commands can run without a prompt in bypass permissions mode once managed settings and plugin hooks have loaded. If you didn't set it, check your shell profile.";
}
//@ chunk-82kqcve8.js:222106-222303 placement (2.1.88 match: getDenyRuleForAgent, 0.771)
function hasPathScopedRules(context) {
  return (
    context.blockReadsOutsideWorkingDirectories === true ||
    [...getDenyRules(context), ...getAskRules(context)].some(
      (rule) =>
        !(NARROWING_RULE_SOURCES_2.includes(rule.source) && rule.ruleValue.ruleContent === undefined) &&
        [BASH_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME].some((name) =>
          toolMatchesRule(
            context,
            {
              name,
            },
            rule,
          ),
        ),
    )
  );
}
//@ chunk-82kqcve8.js:222303-222397 placement
/**
 * isRuleRoundTripStable：规则经格式化再解析后与原值一致。
 */
function isRuleRoundTripStable(ruleValue) {
  let roundTripped = permissionRuleValueFromString(formatPermissionRule(ruleValue));
  return roundTripped.toolName === ruleValue.toolName && roundTripped.ruleContent === ruleValue.ruleContent;
}
//@ chunk-82kqcve8.js:222397-222545 placement
function canonicalizeAliasedRule(ruleValue) {
  let roundTripped = permissionRuleValueFromString(formatPermissionRule(ruleValue));
  if (
    roundTripped.ruleContent !== ruleValue.ruleContent ||
    roundTripped.toolName === ruleValue.toolName ||
    canonicalToolName(ruleValue.toolName) !== roundTripped.toolName ||
    !isRuleRoundTripStable(roundTripped)
  )
    return null;
  return roundTripped;
}
//@ chunk-82kqcve8.js:222545-222841 layout
/**
 * 合法的更新目的地（settings 五层 + cliArg/command/toolsNarrowing/mcpServerPolicy/hostCredential/session/mcpMount）与 allow/deny/ask → alwaysAllowRules/alwaysDenyRules/alwaysAskRules 的映射。
 */
var PERMISSION_UPDATE_DESTINATION_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var VALID_PERMISSION_UPDATE_DESTINATIONS;
var RULE_BEHAVIOR_CONTEXT_KEYS;
deferInit("chunk-82kqcve8.js:222545", () => {
  PERMISSION_UPDATE_DESTINATION_SET = {
    userSettings: true,
    projectSettings: true,
    localSettings: true,
    flagSettings: true,
    policySettings: true,
    cliArg: true,
    command: true,
    toolsNarrowing: true,
    mcpServerPolicy: true,
    hostCredential: true,
    session: true,
    mcpMount: true,
  };
  VALID_PERMISSION_UPDATE_DESTINATIONS = new Set(Object.keys(PERMISSION_UPDATE_DESTINATION_SET));
  RULE_BEHAVIOR_CONTEXT_KEYS = {
    allow: "alwaysAllowRules",
    deny: "alwaysDenyRules",
    ask: "alwaysAskRules",
  };
});
//@ chunk-82kqcve8.js:222841-222960 fingerprint (2.1.88 match: extractRules, 1)
/**
 * 从更新列表中取出所有 addRules 的规则值。
 */
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
function isPermissionRuleValueShape(value) {
  if (value === null || typeof value !== "object") return false;
  let candidate = value;
  return (
    typeof candidate.toolName === "string" &&
    (candidate.ruleContent === undefined || typeof candidate.ruleContent === "string")
  );
}
//@ chunk-82kqcve8.js:223120-223245 layout
function describeValueForLog(value) {
  let described;
  try {
    described = isPermissionRuleValueShape(value)
      ? formatPermissionRule(value)
      : String(jsonStringify(value));
  } catch {
    described = "(unprintable value)";
  }
  return described.length > 200 ? `${truncateToLength(described, 200)}\u2026` : described;
}
//@ chunk-82kqcve8.js:223245-225938 layout
/**
 * 运行时校验一条权限更新，返回 {action:"apply", update} 或 {action:"drop", reason}：目的地/行为必须在枚举内；放宽型（allow 的 add/replace、非 allow 的 remove）规则必须形状合法且能经存储往返（否则尝试 bp 修正）；收紧型规则只丢弃畸形项并按解析结果规范化；目录列表不得含空串/NUL。
 */
function validatePermissionUpdate(update) {
  if (update === null || typeof update !== "object")
    return {
      action: "drop",
      reason: `non-object permission update: ${describeValueForLog(update)}`,
    };
  let { type, destination } = update;
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
      let behaviorChecked = behavior;
      let rules = update.rules;
      if (!Array.isArray(rules))
        return {
          action: "drop",
          reason: `${type} (${behaviorChecked}) whose rules field is not an array`,
        };
      let rulesCopy = [...rules];
      let mapped = rulesCopy.map((rule) => {
        if (rule === null || typeof rule !== "object") return rule;
        let { toolName, ruleContent } = rule;
        return ruleContent === undefined
          ? {
              toolName,
            }
          : {
              toolName,
              ruleContent,
            };
      });
      if (
        !(type === "removeRules"
          ? behaviorChecked === "allow"
          : behaviorChecked === "deny" || behaviorChecked === "ask")
      ) {
        let normalized = [];
        for (let candidate of mapped) {
          if (!isPermissionRuleValueShape(candidate))
            return {
              action: "drop",
              reason: `widening ${type} (${behaviorChecked}) carries a shape-invalid rule: ${describeValueForLog(candidate)}`,
            };
          if (!isRuleRoundTripStable(candidate)) {
            let canonical = type === "removeRules" ? null : canonicalizeAliasedRule(candidate);
            if (canonical !== null) {
              normalized.push(canonical);
              continue;
            }
            return {
              action: "drop",
              reason: `widening ${type} (${behaviorChecked}) carries a rule that does not survive the store round-trip: ${describeValueForLog(candidate)}`,
            };
          }
          normalized.push(candidate);
        }
        return {
          action: "apply",
          update: {
            type,
            behavior: behaviorChecked,
            destination: destinationChecked,
            rules: normalized,
          },
        };
      }
      let normalizedRules = [];
      for (let candidate of mapped) {
        if (!isPermissionRuleValueShape(candidate)) continue;
        let normalizedRule = permissionRuleValueFromString(formatPermissionRule(candidate));
        if (
          normalizedRule.toolName !== candidate.toolName ||
          normalizedRule.ruleContent !== candidate.ruleContent
        )
          normalizedRules.push(normalizedRule);
        else normalizedRules.push(candidate);
      }
      if (normalizedRules.length === 0 && rulesCopy.length > 0)
        return {
          action: "drop",
          reason: `restrictive ${type} (${behaviorChecked}) in which every rule is shape-invalid`,
        };
      return {
        action: "apply",
        update: {
          type,
          behavior: behaviorChecked,
          destination: destinationChecked,
          rules: normalizedRules,
        },
      };
    }
    case "addDirectories": {
      let directories = update.directories;
      if (!Array.isArray(directories))
        return {
          action: "drop",
          reason: "addDirectories whose directories field is not an array",
        };
      let directoryList = [...directories];
      for (let directory of directoryList) {
        if (typeof directory !== "string")
          return {
            action: "drop",
            reason: `addDirectories carries a non-string directory: ${describeValueForLog(directory)}`,
          };
        if (directory.trim() === "")
          return {
            action: "drop",
            reason: `addDirectories carries a trim-empty directory: ${describeValueForLog(directory)}`,
          };
        if (directory.includes("\x00"))
          return {
            action: "drop",
            reason: `addDirectories carries a directory containing a null byte: ${describeValueForLog(directory)}`,
          };
      }
      return {
        action: "apply",
        update: {
          type,
          destination: destinationChecked,
          directories: directoryList,
        },
      };
    }
    case "removeDirectories": {
      let directories = update.directories;
      if (!Array.isArray(directories))
        return {
          action: "drop",
          reason: "removeDirectories whose directories field is not an array",
        };
      let directories_2 = [...directories].filter((directory) => typeof directory === "string");
      return {
        action: "apply",
        update: {
          type,
          destination: destinationChecked,
          directories: directories_2,
        },
      };
    }
    case "setMode": {
      let mode = update.mode;
      if (typeof mode !== "string")
        return {
          action: "drop",
          reason: `setMode with non-string mode: ${describeValueForLog(mode)}`,
        };
      return {
        action: "apply",
        update: {
          type,
          destination: destinationChecked,
          mode,
        },
      };
    }
    default:
      return {
        action: "drop",
        reason: `unknown permission update type: ${describeValueForLog(type)}`,
      };
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
//@ chunk-82kqcve8.js:226138-226375 layout
/**
 * 批量校验更新，丢弃不合法项并记错误日志。
 */
function sanitizePermissionUpdates(updates) {
  if (!Array.isArray(updates)) {
    logRefusedPermissionUpdate("resolution-boundary", "non-array permission update list");
    return [];
  }
  let valid = [];
  for (let update of updates) {
    let validated = validatePermissionUpdate(update);
    if (validated.action === "drop") {
      logRefusedPermissionUpdate("resolution-boundary", validated.reason);
      continue;
    }
    valid.push(validated.update);
  }
  return valid;
}
//@ chunk-82kqcve8.js:226375-226527 layout
/**
 * 向权限上下文添加额外工作目录（记录来源），返回新上下文。
 */
function addAdditionalWorkingDirectories(context, directories, source) {
  let dirs = new Map(context.additionalWorkingDirectories);
  for (let directory of directories)
    dirs.set(directory, {
      path: directory,
      source,
    });
  return {
    ...context,
    additionalWorkingDirectories: dirs,
  };
}
//@ chunk-82kqcve8.js:226527-226823 layout
/**
 * 校验后应用单条更新；Desktop Code 标签会话会丢弃未限定到单个 skill 的 .claude 会话 Edit allow 规则（Omi）；最后经 QYt 后处理。
 */
function applyValidatedPermissionUpdate(context, update, { announce = true } = {}) {
  let validation = validatePermissionUpdate(update);
  if (validation.action === "drop") {
    logRefusedPermissionUpdate("in-memory", validation.reason);
    return context;
  }
  let filtered = isSessionRuleUpdate(validation.update);
  if (filtered !== validation.update)
    logForDebugging(
      "Permission update: dropped .claude session Edit allow rule(s) not narrowed to one skill (Desktop Code tab session)",
    );
  return filtered === undefined
    ? context
    : syncRemoteBrowserCardAnswers(context, applyPermissionUpdate(context, filtered, announce));
}
//@ chunk-82kqcve8.js:226823-226850 layout
function logIfAnnounced(announce, message) {
  if (announce) logForDebugging(message);
}
//@ chunk-82kqcve8.js:226850-228601 fingerprint (2.1.88 match: applyPermissionUpdate, 0.884)
/**
 * 把一条（已校验的）更新应用到 ToolPermissionContext：setMode（bypass 不可用时拒绝）、addRules/replaceRules/removeRules（按目的地写入对应规则表）、addDirectories/removeDirectories。
 */
function applyPermissionUpdate(context, update, announce) {
  switch (update.type) {
    case "setMode":
      if (update.mode === "bypassPermissions" && !context.isBypassPermissionsModeAvailable) {
        logForDebugging(
          "Ignoring permission update: setMode 'bypassPermissions' rejected \u2014 mode is not available (disableBypassPermissionsMode set, or session not launched in bypassPermissions mode)",
        );
        return context;
      }
      logIfAnnounced(announce, `Applying permission update: Setting mode to '${update.mode}'`);
      return {
        ...context,
        mode: update.mode,
      };
    case "addRules": {
      let ruleStrings = update.rules.map((rule) => formatPermissionRule(rule));
      logIfAnnounced(
        announce,
        `Applying permission update: Adding ${update.rules.length} ${update.behavior} rule(s) to destination '${update.destination}': ${jsonStringify(ruleStrings)}`,
      );
      let ruleKind = RULE_BEHAVIOR_CONTEXT_KEYS[update.behavior];
      return {
        ...context,
        [ruleKind]: {
          ...context[ruleKind],
          [update.destination]: [...(context[ruleKind][update.destination] || []), ...ruleStrings],
        },
      };
    }
    case "replaceRules": {
      let ruleStrings = update.rules.map((rule) => formatPermissionRule(rule));
      logIfAnnounced(
        announce,
        `Replacing all ${update.behavior} rules for destination '${update.destination}' with ${update.rules.length} rule(s): ${jsonStringify(ruleStrings)}`,
      );
      let ruleKind = RULE_BEHAVIOR_CONTEXT_KEYS[update.behavior];
      return {
        ...context,
        [ruleKind]: {
          ...context[ruleKind],
          [update.destination]: ruleStrings,
        },
      };
    }
    case "addDirectories":
      logIfAnnounced(
        announce,
        `Applying permission update: Adding ${update.directories.length} director${update.directories.length === 1 ? "y" : "ies"} with destination '${update.destination}': ${jsonStringify(update.directories)}`,
      );
      return addAdditionalWorkingDirectories(context, update.directories, update.destination);
    case "removeRules": {
      let ruleStrings = update.rules.map((rule) => formatPermissionRule(rule));
      logIfAnnounced(
        announce,
        `Applying permission update: Removing ${update.rules.length} ${update.behavior} rule(s) from source '${update.destination}': ${jsonStringify(ruleStrings)}`,
      );
      let ruleKind = RULE_BEHAVIOR_CONTEXT_KEYS[update.behavior];
      let existingRules = context[ruleKind][update.destination] || [];
      let rulesToRemove = new Set(ruleStrings);
      let filteredRules = existingRules.filter((rule) => !rulesToRemove.has(rule));
      return {
        ...context,
        [ruleKind]: {
          ...context[ruleKind],
          [update.destination]: filteredRules,
        },
      };
    }
    case "removeDirectories": {
      logIfAnnounced(
        announce,
        `Applying permission update: Removing ${update.directories.length} director${update.directories.length === 1 ? "y" : "ies"}: ${jsonStringify(update.directories)}`,
      );
      let newAdditionalDirs = new Map(context.additionalWorkingDirectories);
      for (let directory of update.directories) newAdditionalDirs.delete(directory);
      return {
        ...context,
        additionalWorkingDirectories: newAdditionalDirs,
      };
    }
    default:
      return context;
  }
}
//@ chunk-82kqcve8.js:228601-228995 layout
/**
 * 从 allow 的 add/replace 更新中去掉针对指定工具的“整工具”（无内容）规则，豁免条件由回调决定。
 */
function dropBareAllowRulesForTools(updates, toolNames, isExempt, isTargeted) {
  let shouldDrop = (rule, destination) => {
    let ruleValue = permissionRuleValueFromString(formatPermissionRule(rule));
    if (ruleValue.ruleContent !== undefined) return false;
    if (!(toolNames.has(ruleValue.toolName) || isTargeted(ruleValue))) return false;
    return !isExempt(ruleValue, destination);
  };
  let result = [];
  for (let update of updates) {
    if (!((update.type === "addRules" || update.type === "replaceRules") && update.behavior === "allow")) {
      result.push(update);
      continue;
    }
    let filtered = update.rules.filter((rule) => !shouldDrop(rule, update.destination));
    if (filtered.length === update.rules.length) result.push(update);
    else if (filtered.length > 0)
      result.push({
        ...update,
        rules: filtered,
      });
  }
  return result;
}
//@ chunk-82kqcve8.js:228995-229068 layout
/**
 * 工具名及其全部别名组成的集合。
 */
function getToolNameWithAliases(tool, toolPermissionContext) {
  let toolNameForPermissionCheck = getToolNameForPermissionCheck(tool);
  return new Set([
    toolNameForPermissionCheck,
    ...aliasesFor(toolNameForPermissionCheck, toolPermissionContext.toolAliases),
  ]);
}
//@ chunk-82kqcve8.js:229068-229269 layout
/**
 * 依次应用多条更新；模式变化时清掉 startupModeDecidedByProactivityLevel。
 */
function applyPermissionUpdates(context, updates, options = {}) {
  propagateAbort(updates);
  clearRemovalWaiverIfPathScoped(context);
  let next = context;
  for (let update of updates) next = applyValidatedPermissionUpdate(next, update, options);
  if (next.mode !== context.mode && next.startupModeDecidedByProactivityLevel !== undefined)
    next = {
      ...next,
      startupModeDecidedByProactivityLevel: undefined,
    };
  return next;
}
//@ chunk-82kqcve8.js:229269-229355 layout (2.1.88 match: supportsPersistence, 1)
/**
 * 只有 localSettings/userSettings/projectSettings 可持久化。
 */
function supportsPersistence(destination) {
  return (
    destination === "localSettings" || destination === "userSettings" || destination === "projectSettings"
  );
}
//@ chunk-82kqcve8.js:229355-229462 layout
/**
 * 先校验 PermissionUpdate（validatePermissionUpdate），被丢弃时记录原因，通过后持久化。
 */
async function persistValidatedPermissionUpdate(update, storage) {
  let validated = validatePermissionUpdate(update);
  if (validated.action === "drop") {
    logRefusedPermissionUpdate("disk", validated.reason);
    return;
  }
  return persistPermissionUpdate(validated.update, storage);
}
//@ chunk-82kqcve8.js:229462-231258 fingerprint (2.1.88 match: persistPermissionUpdate, 0.963)
/**
 * 把更新写入 settings 文件（仅三个可写层）：addRules/removeRules/replaceRules 改 permissions.allow|deny|ask，add/removeDirectories 改 additionalDirectories，setMode 写 defaultMode；setMode bypassPermissions 只在会话内生效，不落盘。
 */
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
      logForDebugging(
        `Persisting ${update.rules.length} ${update.behavior} rule(s) to ${update.destination}`,
      );
      await addPermissionRulesToSettings(
        {
          ruleValues: update.rules,
          ruleBehavior: update.behavior,
        },
        update.destination,
        storage,
      );
      break;
    }
    case "addDirectories": {
      logForDebugging(
        `Persisting ${update.directories.length} director${update.directories.length === 1 ? "y" : "ies"} to ${update.destination}`,
      );
      let directories = [...update.directories];
      await updateSettingsForSourceWithTransform(
        update.destination,
        (current) => {
          let existingDirs = current?.permissions?.additionalDirectories || [];
          let dirsToAdd = directories.filter((dir) => !existingDirs.includes(dir));
          if (dirsToAdd.length === 0) return null;
          return {
            permissions: {
              additionalDirectories: [...existingDirs, ...dirsToAdd],
            },
          };
        },
        undefined,
        storage,
      );
      break;
    }
    case "removeRules": {
      logForDebugging(
        `Removing ${update.rules.length} ${update.behavior} rule(s) from ${update.destination}`,
      );
      let rulesToRemove = new Set(update.rules.map(formatPermissionRule));
      let behavior = update.behavior;
      await updateSettingsForSourceWithTransform(
        update.destination,
        (currentSettings) => {
          let filteredRules = (currentSettings?.permissions?.[behavior] || []).filter((rule) => {
            let normalized = formatPermissionRule(permissionRuleValueFromString(rule));
            return !rulesToRemove.has(normalized);
          });
          return {
            permissions: {
              [behavior]: filteredRules,
            },
          };
        },
        undefined,
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
        (currentSettings) => ({
          permissions: {
            additionalDirectories: (currentSettings?.permissions?.additionalDirectories || []).filter(
              (dir) => !dirsToRemove.has(dir),
            ),
          },
        }),
        undefined,
        storage,
      );
      break;
    }
    case "setMode": {
      logForDebugging(`Persisting mode '${update.mode}' to ${update.destination}`);
      await updateSettingsForSource(
        update.destination,
        {
          permissions: {
            defaultMode: update.mode,
          },
        },
        undefined,
        storage,
      );
      break;
    }
    case "replaceRules": {
      logForDebugging(
        `Replacing all ${update.behavior} rules in ${update.destination} with ${update.rules.length} rule(s)`,
      );
      let ruleStrings = update.rules.map(formatPermissionRule);
      let behavior = update.behavior;
      await updateSettingsForSourceWithTransform(
        update.destination,
        () => ({
          permissions: {
            [behavior]: ruleStrings,
          },
        }),
        undefined,
        storage,
      );
      break;
    }
  }
}
//@ chunk-82kqcve8.js:231258-231311 layout
async function persistPermissionUpdates(updates, storageV5) {
  for (let update of updates) await persistValidatedPermissionUpdate(update, storageV5);
}
//@ chunk-82kqcve8.js:231311-231561 fingerprint (2.1.88 match: createReadRuleSuggestion, 0.838)
/**
 * 为目录生成 Read(<dir>/**) 的 allow 规则建议（转义 glob，绝对路径前加 /）；根目录返回 undefined。
 */
function createReadRuleSuggestion(dirPath, destination = "session") {
  let pathForPattern = toPosixPath(dirPath);
  if (pathForPattern === "/") return;
  let escapedPath = escapeRuleContent(pathForPattern, {
    escapeGlobs: true,
  });
  let ruleContent = posix.isAbsolute(pathForPattern)
    ? `/${escapedPath}/**`
    : escapedPath.startsWith("\\")
      ? `./${escapedPath}/**`
      : `${escapedPath}/**`;
  return {
    type: "addRules",
    rules: [
      {
        toolName: FILE_READ_TOOL_NAME,
        ruleContent,
      },
    ],
    behavior: "allow",
    destination,
  };
}
//@ chunk-1de6ar4n.js:264-309 placement (2.1.88 match: isIt2CliAvailable, 0.65)
/**
 * 给权限上下文追加附加工作目录（来源 session）。与 it2 无关。
 */
function addSessionWorkingDirectories(toolPermissionContext) {
  return addAdditionalWorkingDirectories(
    toolPermissionContext,
    getAdditionalDirectoriesForClaudeMd(),
    "session",
  );
}
//@ chunk-4kzs0ch0.js:1689-1845 fingerprint (2.1.88 match: supportsPersistence, 1)
/**
 * 与磁盘已存规则合并：目的地为 user/project/local 设置时，把已存规则放前、再加上新规则中非特殊形式的项。
 */
function mergeWithStoredRules(rules, destination, behavior, mergeOptions) {
  if (
    mergeOptions === undefined ||
    (destination !== "userSettings" && destination !== "projectSettings" && destination !== "localSettings")
  )
    return rules;
  return [
    ...mergeOptions[destination][behavior],
    ...rules.filter((ruleString) => !PATH_RULE_CARVE_OUT_RE.test(ruleString)),
  ];
}
export {
  isRuleRoundTripStable,
  dropBareAllowRulesForTools,
  getToolNameWithAliases,
  supportsPersistence,
  applyPermissionUpdates,
  persistPermissionUpdates,
  addAdditionalWorkingDirectories,
  isRemovalWaiverActive,
  applyValidatedPermissionUpdate,
  clearRemovalWaiverIfPathScoped,
  blocksReadsOutsideWorkingDirs,
  createReadRuleSuggestion,
  persistValidatedPermissionUpdate,
  extractRules,
  checkBypassPermissionsEnv,
  noteRemovalWaiverRules,
  mergeWithStoredRules,
  sanitizePermissionUpdates,
  addSessionWorkingDirectories,
};

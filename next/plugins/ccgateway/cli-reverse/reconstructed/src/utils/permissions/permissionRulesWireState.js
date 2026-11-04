/**
 * utils/permissions/permissionRulesWireState.ts
 *
 * 权限规则线上传输状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-eecdvv5g.js (5)
 * attribution: placement 5
 */
import { describeRuleShape } from "../../components/permissions/rules/PermissionRuleDescription.js";
import { formatPermissionRule } from "./disallowedToolsFlag.js";
import { PERMISSION_RULE_SOURCES, getAllowRules, getAskRules, getDenyRules } from "./permissions.js";
import { permissionRuleValueFromString } from "./permissionRuleParser.js";
import { shouldAllowManagedPermissionRulesOnly } from "./permissionsLoader.js";

//@ chunk-eecdvv5g.js:4829-4858 placement
var RULE_BEHAVIORS = ["allow", "deny", "ask"];
//@ chunk-eecdvv5g.js:4858-5031 placement (2.1.88 match: isPermissionUpdateDestination, 0.776)
function getRuleEditability(source) {
  switch (source) {
    case "userSettings":
    case "projectSettings":
    case "localSettings":
      return "persistent";
    case "cliArg":
    case "session":
      return "session";
    default:
      return "readonly";
  }
}
//@ chunk-eecdvv5g.js:5031-5321 placement
function toRuleListEntry(rule, stored) {
  let description = describeRuleShape(rule.ruleValue);
  let ruleText = stored?.raw ?? formatPermissionRule(rule.ruleValue);
  let editability = stored?.notInEffect ? "readonly" : getRuleEditability(rule.source);
  if (editability === "session" && formatPermissionRule(rule.ruleValue) !== ruleText)
    editability = "readonly";
  return {
    behavior: rule.ruleBehavior,
    source: rule.source,
    rule: ruleText,
    ...(description !== null && {
      description,
    }),
    editability,
    ...(stored?.notInEffect && {
      notInEffect: true,
    }),
  };
}
//@ chunk-eecdvv5g.js:5321-5709 placement
/**
 * 把一组规则与上下文中某行为的规则逐一配对（按来源+规范化规则计数），返回 {rule, raw} 列表。
 */
function matchStoredRulesToContext(context, behavior, storedRules) {
  let field = {
    allow: "alwaysAllowRules",
    deny: "alwaysDenyRules",
    ask: "alwaysAskRules",
  }[behavior];
  let remaining = new Map();
  for (let storedRule of storedRules) {
    let key = `${storedRule.source}\x00${formatPermissionRule(storedRule.ruleValue)}`;
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  let matched = [];
  for (let source of PERMISSION_RULE_SOURCES)
    for (let rawRule of context[field][source] ?? []) {
      let ruleValue = permissionRuleValueFromString(rawRule);
      let key = `${source}\x00${formatPermissionRule(ruleValue)}`;
      let count = remaining.get(key) ?? 0;
      if (count <= 0) continue;
      remaining.set(key, count - 1);
      matched.push({
        rule: {
          source,
          ruleBehavior: behavior,
          ruleValue,
        },
        raw: rawRule,
      });
    }
  return matched;
}
//@ chunk-eecdvv5g.js:5709-6545 placement
function summarizeWireRules(options) {
  let { context, originalCwd } = options;
  let managedOnly = shouldAllowManagedPermissionRulesOnly();
  let sources = options.readSettingsWithSources().sources;
  let mapped = options
    .readSettingsErrors()
    .errors.filter((error) => error.severity !== "warning")
    .map((error) => ({
      file: error.file,
      path: error.path,
      message: error.message,
    }));
  let entries = [];
  let seen = new Set();
  let addEntry = (ruleListEntry) => {
    let dedupeKey = `${ruleListEntry.behavior}\x00${ruleListEntry.source}\x00${ruleListEntry.rule}\x00${ruleListEntry.notInEffect ? 1 : 0}`;
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      entries.push(ruleListEntry);
    }
  };
  for (let { rule, raw } of [
    ...matchStoredRulesToContext(context, "allow", getAllowRules(context)),
    ...matchStoredRulesToContext(context, "ask", getAskRules(context)),
    ...matchStoredRulesToContext(context, "deny", getDenyRules(context)),
  ])
    addEntry(
      toRuleListEntry(rule, {
        raw,
      }),
    );
  if (managedOnly)
    for (let { source, settings } of sources) {
      if (source === "policySettings" || !settings.permissions) continue;
      for (let behavior of RULE_BEHAVIORS)
        for (let rawRule of settings.permissions[behavior] ?? [])
          addEntry(
            toRuleListEntry(
              {
                source,
                ruleBehavior: behavior,
                ruleValue: permissionRuleValueFromString(rawRule),
              },
              {
                raw: rawRule,
                notInEffect: true,
              },
            ),
          );
    }
  return {
    rules: entries,
    workspaceDirectories: Array.from(context.additionalWorkingDirectories.values(), (entry) => ({
      path: entry.path,
      source: entry.source,
    })),
    originalCwd,
    managedOnly,
    ...(mapped.length > 0 && {
      errors: mapped,
    }),
  };
}
export { summarizeWireRules };

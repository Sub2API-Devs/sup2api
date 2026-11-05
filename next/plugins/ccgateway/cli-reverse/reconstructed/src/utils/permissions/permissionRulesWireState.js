/**
 * utils/permissions/permissionRulesWireState.ts
 *
 * 权限规则线上传输状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mj4tyz4n.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { describeRuleShape } from "../../components/permissions/rules/PermissionRuleDescription.js";
import { permissionRuleValueFromString } from "./permissionRuleParser.js";
import { PERMISSION_RULE_SOURCES, getAllowRules, askedBashRules, deniedBashRules } from "./permissions.js";
import { normalizeRuleString } from "./legacyWildcardRules.js";
import { shouldAllowManagedPermissionRulesOnly } from "./permissionsLoader.js";

//@ chunk-mj4tyz4n.js:5081-5110 placement
var RULE_BEHAVIORS = ["allow", "deny", "ask"];
//@ chunk-mj4tyz4n.js:5110-5283 placement (2.1.88 match: isPermissionUpdateDestination, 0.776)
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
//@ chunk-mj4tyz4n.js:5283-5573 placement
function toRuleListEntry(rule, stored) {
  let description = describeRuleShape(rule.ruleValue);
  let ruleText = stored?.raw ?? permissionRuleValueFromString(rule.ruleValue);
  let editability = stored?.notInEffect ? "readonly" : getRuleEditability(rule.source);
  if (editability === "session" && permissionRuleValueFromString(rule.ruleValue) !== ruleText)
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
//@ chunk-mj4tyz4n.js:5573-6082 placement
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
    let key = `${storedRule.source}\x00${permissionRuleValueFromString(storedRule.ruleValue)}`;
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  let matched = [];
  for (let source of PERMISSION_RULE_SOURCES)
    for (let rawRule of context[field][source] ?? []) {
      let ruleValue = normalizeRuleString(rawRule, behavior);
      let key = `${source}\x00${permissionRuleValueFromString(ruleValue)}`;
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
  for (let storedRule of storedRules) {
    let ruleValue = permissionRuleValueFromString(storedRule.ruleValue);
    let key = `${storedRule.source}\x00${ruleValue}`;
    let count = remaining.get(key) ?? 0;
    if (count > 0) {
      remaining.set(key, count - 1);
      matched.push({
        rule: storedRule,
        raw: ruleValue,
      });
    }
  }
  return matched;
}
//@ chunk-mj4tyz4n.js:6082-6995 placement
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
  let parentSettingsIncluded = options.readParentSettingsIncluded();
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
    ...matchStoredRulesToContext(context, "ask", askedBashRules(context)),
    ...matchStoredRulesToContext(context, "deny", deniedBashRules(context)),
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
                ruleValue: normalizeRuleString(rawRule, behavior),
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
    ...(parentSettingsIncluded !== undefined && {
      parentSettingsIncluded,
    }),
    ...(mapped.length > 0 && {
      errors: mapped,
    }),
  };
}
export { summarizeWireRules };

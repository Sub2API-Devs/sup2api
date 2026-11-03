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
var y = ["allow", "deny", "ask"];
//@ chunk-eecdvv5g.js:4858-5031 placement = isPermissionUpdateDestination (0.776)
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
function toRuleListEntry(s, r) {
  let a = describeRuleShape(s.ruleValue),
    l = r?.raw ?? formatPermissionRule(s.ruleValue),
    o = r?.notInEffect ? "readonly" : getRuleEditability(s.source);
  if (o === "session" && formatPermissionRule(s.ruleValue) !== l) o = "readonly";
  return {
    behavior: s.ruleBehavior,
    source: s.source,
    rule: l,
    ...(a !== null && { description: a }),
    editability: o,
    ...(r?.notInEffect && { notInEffect: !0 }),
  };
}
/**
 * 把一组规则与上下文中某行为的规则逐一配对（按来源+规范化规则计数），返回 {rule, raw} 列表。
 */
//@ chunk-eecdvv5g.js:5321-5709 placement
function matchStoredRulesToContext(s, r, a) {
  let l = { allow: "alwaysAllowRules", deny: "alwaysDenyRules", ask: "alwaysAskRules" }[r],
    o = new Map();
  for (let n of a) {
    let t = `${n.source}\x00${formatPermissionRule(n.ruleValue)}`;
    o.set(t, (o.get(t) ?? 0) + 1);
  }
  let u = [];
  for (let n of PERMISSION_RULE_SOURCES)
    for (let t of s[l][n] ?? []) {
      let c = permissionRuleValueFromString(t),
        e = `${n}\x00${formatPermissionRule(c)}`,
        i = o.get(e) ?? 0;
      if (i <= 0) continue;
      (o.set(e, i - 1), u.push({ rule: { source: n, ruleBehavior: r, ruleValue: c }, raw: t }));
    }
  return u;
}
//@ chunk-eecdvv5g.js:5709-6545 placement
function summarizeWireRules(s) {
  let { context: context, originalCwd: originalCwd } = s,
    l = shouldAllowManagedPermissionRulesOnly(),
    sources = s.readSettingsWithSources().sources,
    mapped = s
      .readSettingsErrors()
      .errors.filter((error) => error.severity !== "warning")
      .map((e) => ({ file: e.file, path: e.path, message: e.message })),
    n = [],
    t = new Set(),
    c = (e) => {
      let i = `${e.behavior}\x00${e.source}\x00${e.rule}\x00${e.notInEffect ? 1 : 0}`;
      if (!t.has(i)) (t.add(i), n.push(e));
    };
  for (let { rule: rule, raw: raw } of [
    ...matchStoredRulesToContext(context, "allow", getAllowRules(context)),
    ...matchStoredRulesToContext(context, "ask", getAskRules(context)),
    ...matchStoredRulesToContext(context, "deny", getDenyRules(context)),
  ])
    c(toRuleListEntry(rule, { raw: raw }));
  if (l)
    for (let { source: source, settings: settings } of sources) {
      if (source === "policySettings" || !settings.permissions) continue;
      for (let g of y)
        for (let f of settings.permissions[g] ?? [])
          c(
            toRuleListEntry(
              { source: source, ruleBehavior: g, ruleValue: permissionRuleValueFromString(f) },
              { raw: f, notInEffect: !0 },
            ),
          );
    }
  return {
    rules: n,
    workspaceDirectories: Array.from(context.additionalWorkingDirectories.values(), (e) => ({
      path: e.path,
      source: e.source,
    })),
    originalCwd: originalCwd,
    managedOnly: l,
    ...(mapped.length > 0 && { errors: mapped }),
  };
}

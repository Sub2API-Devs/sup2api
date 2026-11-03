/**
 * utils/permissions/editPermissionRules.ts
 *
 * 2.1.316 新增。编辑 settings 中的权限规则。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cgsbs2dj.js (10)
 * attribution: placement 10
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { U, zodStrictObject, T, A, o, Ir } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  EDITABLE_SETTING_SOURCES,
  isSettingSourceEnabled,
  getSettingSourceDisplayNameLowercase,
} from "../settings/constants.js";
import {
  shouldAllowManagedPermissionRulesOnly,
  deletePermissionRuleFromSettings,
} from "./permissionsLoader.js";
import { policySettingsUnreadable } from "../hooks/hooksConfigSnapshot.js";
import { validatePermissionRule } from "../settings/permissionValidation.js";
import { permissionRuleValueFromString, classifyRuleParens } from "./permissionRuleParser.js";
import { formatPermissionRule } from "./disallowedToolsFlag.js";
import {
  getSettingsForSourceWriteSeed,
  getSettingsForSource,
  settleBackgroundSettingsWork,
  getSettingsFilePathForSource,
  parseSettingsFile,
} from "../settings/settings.js";
import { persistValidatedPermissionUpdate } from "./PermissionUpdate.js";

/**
 * 权限规则编辑请求的 schema：add（1–100 条、每条 ≤10000 字符）与 remove 两种操作，按 op 区分。
 */
//@ chunk-cgsbs2dj.js:5232-5808 placement
var RULE_BEHAVIORS = ["allow", "deny", "ask"],
  MAX_RULE_LENGTH = 1e4,
  MAX_RULES_PER_EDIT = 100,
  ruleBehaviorSchema = DoctorLazy(() =>
    U(RULE_BEHAVIORS, { error: "behavior must be one of: allow, deny, ask" }),
  ),
  editableSourceSchema = DoctorLazy(() => U(EDITABLE_SETTING_SOURCES)),
  addRulesEditSchema = DoctorLazy(() =>
    zodStrictObject({
      op: T("add"),
      rules: A(o().max(MAX_RULE_LENGTH, "each rule must be at most 10000 characters"))
        .min(1, "rules must be an array of 1 to 100 strings")
        .max(MAX_RULES_PER_EDIT, "rules must be an array of 1 to 100 strings"),
      behavior: ruleBehaviorSchema(),
      destination: editableSourceSchema(),
    }),
  ),
  removeRuleEditSchema = DoctorLazy(() =>
    zodStrictObject({
      op: T("remove"),
      rule: o()
        .min(1, "rule must be a non-empty string of at most 10000 characters")
        .max(MAX_RULE_LENGTH, "rule must be a non-empty string of at most 10000 characters"),
      behavior: ruleBehaviorSchema(),
      source: editableSourceSchema(),
    }),
  ),
  permissionRuleEditSchema = DoctorLazy(() => Ir("op", [addRulesEditSchema(), removeRuleEditSchema()]));
/**
 * 把规则编辑 schema 的第一个校验问题转成面向用户的错误信息（目的地、来源、op、rules/rule 类型错误等有专门措辞）。
 */
//@ chunk-cgsbs2dj.js:5808-6498 placement
function formatRuleEditIssue(zodError) {
  let issue = zodError.issues[0];
  if (!issue) return "the edit is not a valid permission-rule edit";
  let joined = issue.path.map(String).join(".");
  if (joined === "destination" || joined === "source")
    return joined === "destination"
      ? `destination must be one of: ${EDITABLE_SETTING_SOURCES.join(", ")}`
      : `rules from this source cannot be removed here (removable sources: ${EDITABLE_SETTING_SOURCES.join(", ")})`;
  if (joined === "op") return "op must be one of: add, remove";
  if (joined.startsWith("rules") && issue.code === "invalid_type")
    return "rules must be an array of 1 to 100 strings";
  if (joined === "rule" && issue.code === "invalid_type")
    return "rule must be a non-empty string of at most 10000 characters";
  let u = issue.path[0] === void 0 ? "" : String(issue.path[0]);
  return joined && !issue.message.startsWith(u) ? `${joined}: ${issue.message}` : issue.message;
}
//@ chunk-cgsbs2dj.js:6498-6737 placement
function getRuleEditBlockedReason() {
  if (shouldAllowManagedPermissionRulesOnly())
    return "enterprise managed settings allow only managed permission rules; rules cannot be added or removed";
  if (policySettingsUnreadable())
    return "enterprise managed settings could not be read, so permission rules cannot be edited";
  return null;
}
//@ chunk-cgsbs2dj.js:6737-6833 placement
function x(s) {
  return isSettingSourceEnabled(s)
    ? null
    : `${getSettingSourceDisplayNameLowercase(s)} are not loaded here, so their rules cannot be edited`;
}
/**
 * 校验 add 操作的每条规则：去空白、validatePermissionRule 校验并收集警告；Tool(*) 写法提示会保存为整工具规则。返回解析后的规则值。
 */
//@ chunk-cgsbs2dj.js:6833-7501 placement
function validateAddRulesEdit(s) {
  let { rules: rules, behavior: behavior, destination: destination } = s,
    ruleValues = [],
    warnings = [];
  for (let rawRule of rules) {
    let trimmed = rawRule.trim();
    if (trimmed.length === 0) return { ok: !1, error: "rules must not be empty" };
    let validation = validatePermissionRule(trimmed, behavior);
    if (!validation.valid)
      return {
        ok: !1,
        error: validation.suggestion
          ? `${validation.error} \u2014 ${validation.suggestion}`
          : (validation.error ?? "invalid permission rule"),
      };
    if (validation.warning !== void 0) warnings.push(validation.warning);
    let ruleValue = permissionRuleValueFromString(trimmed),
      parens = classifyRuleParens(trimmed);
    if (
      parens.kind === "call" &&
      parens.toolName !== "" &&
      !/\s/.test(parens.toolName) &&
      parens.rawContent === "*"
    ) {
      let f = formatPermissionRule(ruleValue);
      warnings.push(
        `"${trimmed}" was saved as the tool-wide rule "${f}", which matches every use of the tool. To limit it, put a specific pattern inside the parentheses.`,
      );
    }
    ruleValues.push(ruleValue);
  }
  return { ok: !0, ruleValues: ruleValues, behavior: behavior, destination: destination, warnings: warnings };
}
/**
 * 在来源的存储规则中按原样查找要删除的规则；找不到或同一文件有等价拼写时报错，否则返回规则对象与原文。
 */
//@ chunk-cgsbs2dj.js:7501-8108 placement
function resolveRemoveRuleEdit(s, storedRules) {
  let { rule: rule, behavior: behavior, source: source } = s,
    found = storedRules.find((r) => r === rule);
  if (found === void 0)
    return {
      ok: !1,
      error: `rule not found: no ${behavior} rule with this exact value in ${getSettingSourceDisplayNameLowercase(source)} (rules are matched verbatim, as the listing reports them; the file may have been changed outside this dialog)`,
    };
  let canonicalKey = c(found);
  if (storedRules.some((r) => r !== found && c(r) === canonicalKey))
    return {
      ok: !1,
      error:
        "this rule cannot be removed here: the same settings file holds another spelling of the same rule, and removing one would silently remove both \u2014 edit the file by hand to clean these up",
    };
  return {
    ok: !0,
    rule: { source: source, ruleBehavior: behavior, ruleValue: permissionRuleValueFromString(found) },
    storedRaw: found,
  };
}
//@ chunk-cgsbs2dj.js:8108-8139 placement
function c(s) {
  return formatPermissionRule(permissionRuleValueFromString(s));
}
//@ chunk-cgsbs2dj.js:8139-8186 placement
function R(s, t) {
  return s?.permissions?.[t] ?? [];
}
//@ chunk-cgsbs2dj.js:8186-10256 placement
async function editPermissionRules(s, t) {
  let e = (i) => ({ ok: !1, error: i }),
    u = getRuleEditBlockedReason();
  if (u !== null) return e(u);
  let safeParse = permissionRuleEditSchema().safeParse(s);
  if (!safeParse.success) return e(formatRuleEditIssue(safeParse.error));
  let n = safeParse.data;
  if (n.op === "add") {
    let i = validateAddRulesEdit(n);
    if (!i.ok) return e(i.error);
    let { destination: destination, behavior: behavior, ruleValues: ruleValues } = i,
      w = x(destination);
    if (w !== null) return e(w);
    let P = getSettingsFileLoadError(destination);
    if (P !== null) return e(P);
    let F = new Set(R(getSettingsForSourceWriteSeed(destination), behavior).map(c)),
      found = ruleValues.find((y) => F.has(formatPermissionRule(y)));
    if (found !== void 0)
      return e(
        `"${formatPermissionRule(found)}" is already in the ${behavior} rules in ${getSettingSourceDisplayNameLowercase(destination)}`,
      );
    if (destination === "localSettings") {
      let y = new Set(R(getSettingsForSource(destination), behavior).map(c)),
        found = ruleValues.find((I) => y.has(formatPermissionRule(I)));
      if (found !== void 0)
        return e(
          `"${formatPermissionRule(found)}" is already in effect from the launch directory\u2019s own .claude/settings.local.json`,
        );
    }
    (await persistValidatedPermissionUpdate(
      { type: "addRules", rules: ruleValues, behavior: behavior, destination: destination },
      t,
    ),
      await settleBackgroundSettingsWork());
    let D = new Set(R(getSettingsForSourceWriteSeed(destination), behavior).map(c)),
      filtered = ruleValues.filter((y) => !D.has(formatPermissionRule(y)));
    if (filtered.length > 0)
      return e(
        filtered.length === ruleValues.length
          ? `the rules could not be written to ${getSettingSourceDisplayNameLowercase(destination)}: the settings write was refused or failed`
          : `${filtered.length} of ${ruleValues.length} rules could not be written to ${getSettingSourceDisplayNameLowercase(destination)}: the settings write was refused or failed for those`,
      );
    return { ok: !0, warnings: i.warnings, stored: ruleValues.map(formatPermissionRule) };
  }
  let { behavior: behavior, source: source } = n,
    a = x(source);
  if (a !== null) return e(a);
  let S = getSettingsFileLoadError(source);
  if (S !== null) return e(S);
  let h = R(getSettingsForSourceWriteSeed(source), behavior);
  if (
    source === "localSettings" &&
    !h.includes(n.rule) &&
    R(getSettingsForSource(source), behavior).includes(n.rule)
  )
    return e(
      "that rule is defined in the launch directory\u2019s own .claude/settings.local.json, which is not edited here; edit that file directly",
    );
  let f = resolveRemoveRuleEdit(n, h);
  if (!f.ok) return e(f.error);
  if (
    source === "localSettings" &&
    R(getSettingsForSource(source), behavior).some((i) => i !== f.storedRaw && c(i) === c(f.storedRaw))
  )
    return e(
      "this rule cannot be removed here: the launch directory\u2019s own .claude/settings.local.json holds another spelling of the same rule, and removing one would silently remove both \u2014 edit that file by hand to clean these up",
    );
  let j = await deletePermissionRuleFromSettings(f.rule, t);
  await settleBackgroundSettingsWork();
  let any = R(getSettingsForSourceWriteSeed(source), behavior).some((i) => c(i) === c(f.storedRaw));
  if (!j || any)
    return e(
      `the rule could not be removed from ${getSettingSourceDisplayNameLowercase(source)}: the settings write was refused or failed, so it is still in its settings file`,
    );
  return { ok: !0, warnings: [], stored: [] };
}
//@ chunk-cgsbs2dj.js:10256-10472 placement
function getSettingsFileLoadError(s) {
  if (getSettingsForSourceWriteSeed(s) !== null) return null;
  let t = getSettingsFilePathForSource(s);
  if (t === void 0) return null;
  return parseSettingsFile(t).errors.some((error) => error.severity !== "warning")
    ? `the ${getSettingSourceDisplayNameLowercase(s)} file has errors and could not be loaded; fix it by hand first`
    : null;
}

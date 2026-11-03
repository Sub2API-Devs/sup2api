/**
 * utils/settings/validation.ts
 *
 * 设置校验错误格式化（zod issue → 文件/路径/消息 + 修正提示），无效权限规则过滤，policyHelper 配置校验。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/validation.ts
 * pieces: chunk-dcmhvw5a.js (15)
 * attribution: sole-consumer 1, fingerprint 8, layout 5, file-local 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  buildWholeSettingsSchema,
  getSettingsSchemaForDocument,
  SUPPORTED_PLATFORMS,
  withholdGrants,
} from "./types.js";
import { LOt } from "../spellcheck.js";
import { UNLOADABLE_GUARD_NOTE } from "../../schemas/hookEntryValidation.js";
import { getValidationTip } from "./validationTips.js";
import { plural } from "../stringUtils.js";
import { jsonParse, clone } from "../slowOperations.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { applySettingAliases, aliasConflictMessage, SETTING_ALIASES } from "./marketplaceSettingsAliases.js";
import {
  crossSessionInboundError,
  CROSSSESSIONINBOUND,
  strictPluginOnlyCustomizationError,
  validateAllowedProviders,
  collectRuleWarnings,
  validateSettingsDocument,
  remapIssuePath,
  copyAllowedProviders,
} from "./hooksValidation.js";
import { generateSettingsJSONSchema } from "./schemaOutput.js";
import { validatePermissionRule } from "./permissionValidation.js";

//@ chunk-dcmhvw5a.js:437432-437494 sole-consumer
var Dw = DoctorLazy(() => buildWholeSettingsSchema(LOt(), { strictPolicyHelperKeys: !0 }).strict());
//@ chunk-dcmhvw5a.js:437494-437540 fingerprint = isInvalidTypeIssue (1)
function isInvalidTypeIssue(issue) {
  return issue.code === "invalid_type";
}
//@ chunk-dcmhvw5a.js:437540-437587 fingerprint = isInvalidValueIssue (1)
function isInvalidValueIssue(issue) {
  return issue.code === "invalid_value";
}
//@ chunk-dcmhvw5a.js:437587-437638 fingerprint = isUnrecognizedKeysIssue (1)
function isUnrecognizedKeysIssue(issue) {
  return issue.code === "unrecognized_keys";
}
//@ chunk-dcmhvw5a.js:437638-437681 fingerprint = isTooSmallIssue (1)
function isTooSmallIssue(issue) {
  return issue.code === "too_small";
}
//@ chunk-dcmhvw5a.js:437681-437754 layout
function AOn(e) {
  return e.severity !== "warning" && !e.loadedWithoutGuardHook;
}
//@ chunk-dcmhvw5a.js:437754-438033 layout
var UNLOADABLE_GUARD_HOOK_TEXT =
  'a PreToolUse/PermissionRequest hook that cannot be loaded does not run, nor does any other hook of the document where "hooks" is listed here as ignored; fix or remove the entry. The managed settings document is not skipped for it, unlike a user or project settings file';
//@ chunk-dcmhvw5a.js:438033-438186 layout
function explainUnloadableGuardHooks(e) {
  return e.map((n) =>
    n.severity !== "warning" && n.message.includes(UNLOADABLE_GUARD_NOTE)
      ? {
          ...n,
          message: n.message.replace(UNLOADABLE_GUARD_NOTE, () => UNLOADABLE_GUARD_HOOK_TEXT),
          loadedWithoutGuardHook: !0,
        }
      : n,
  );
}
//@ chunk-dcmhvw5a.js:438186-438308 fingerprint = getReceivedType (1)
function getReceivedType(value) {
  if (value === null) return "null";
  if (value === void 0) return "undefined";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
//@ chunk-dcmhvw5a.js:438308-438376 file-local
function extractReceivedFromMessage(msg) {
  let match = msg.match(/received (\w+)/);
  return match ? match[1] : void 0;
}
/**
 * 把 zod 错误转成 {file,path,message} 列表，附带 validationTips 里的修正提示与文档链接。
 */
//@ chunk-dcmhvw5a.js:438376-439575 fingerprint = formatZodError (0.935)
function formatZodError(error, filePath) {
  return error.issues
    .flatMap((issue) => {
      if (issue.code !== "invalid_union" || issue.path.join(".") !== "attribution") return [issue];
      let filtered = issue.errors.flat().filter((c) => c.path.length > 0);
      return filtered.length > 0
        ? filtered.map((c) => ({ ...c, path: [...issue.path, ...c.path] }))
        : [issue];
    })
    .map((s) => {
      let path = s.path.map(String).join("."),
        message = s.message,
        g,
        m,
        f,
        h,
        y;
      if (isInvalidValueIssue(s))
        ((m = s.values.map((S) => String(S))), (f = m.join(" | ")), (h = void 0), (y = void 0));
      else if (isInvalidTypeIssue(s)) {
        f = s.expected;
        let receivedType = extractReceivedFromMessage(s.message);
        ((h = receivedType ?? getReceivedType(s.input)), (y = receivedType ?? getReceivedType(s.input)));
      } else if (isTooSmallIssue(s)) f = String(s.minimum);
      else if (s.code === "custom" && "params" in s) ((h = s.params.received), (y = h));
      let tip = getValidationTip({
        path: path,
        code: s.code,
        expected: f,
        received: h,
        enumValues: m,
        message: s.message,
        value: h,
      });
      if (isInvalidValueIssue(s))
        ((g = m?.map((S) => `"${S}"`).join(", ")), (message = `Invalid value. Expected one of: ${g}`));
      else if (isInvalidTypeIssue(s)) {
        let receivedType = extractReceivedFromMessage(s.message) ?? getReceivedType(s.input);
        if (s.expected === "object" && receivedType === "null" && path === "")
          message = "Invalid or malformed JSON";
        else message = `Expected ${s.expected}, but received ${receivedType}`;
      } else if (isUnrecognizedKeysIssue(s)) {
        let keys = s.keys.join(", ");
        message = `Unrecognized ${plural(s.keys.length, "field")}: ${keys}`;
      } else if (isTooSmallIssue(s))
        ((message = `Number must be greater than or equal to ${s.minimum}`), (g = String(s.minimum)));
      return {
        file: filePath,
        path: path,
        message: message,
        expected: g,
        invalidValue: y,
        suggestion: tip?.suggestion,
        docLink: tip?.docLink,
      };
    });
}
/**
 * 校验设置文件文本（编辑 settings.json 前后用），返回是否合法与错误说明。
 */
//@ chunk-dcmhvw5a.js:439575-440624 fingerprint = validateSettingsFileContent (0.508)
function validateSettingsFileContent(content) {
  try {
    let jsonData = jsonParse(content),
      r = isPlainObject_2(jsonData) ? { ...jsonData } : jsonData,
      mapped = applySettingAliases(r, "settings").map(aliasConflictMessage),
      a = jsonData;
    if (isPlainObject_2(jsonData)) {
      let filtered = SETTING_ALIASES.map((w) => w.alias).filter((w) => w in jsonData && jsonData[w] === null);
      if (filtered.length > 0) {
        let w = { ...jsonData };
        for (let L of filtered) delete w[L];
        a = w;
      }
    }
    let result = Dw().safeParse(a),
      g = result.success ? [] : formatZodError(result.error, "settings"),
      m = crossSessionInboundError(jsonData);
    if (m !== void 0) g.push({ path: CROSSSESSIONINBOUND, message: `"crossSessionInbound" ${m}.` });
    let f = strictPluginOnlyCustomizationError(jsonData);
    if (f !== void 0)
      g.push({ path: "strictPluginOnlyCustomization", message: `"strictPluginOnlyCustomization" ${f}.` });
    let h = validateAllowedProviders(jsonData);
    if (h !== void 0) g.push({ path: "allowedProviders", message: `"allowedProviders" ${h}.` });
    let y = staticPayloadWarnings(jsonData),
      b = collectRuleWarnings(r);
    if (g.length === 0 && mapped.length === 0 && y.length === 0 && b.length === 0) return { isValid: !0 };
    return {
      isValid: !1,
      error:
        `Settings validation failed:
` +
        [
          ...mapped.map((C) => `- ${C}`),
          ...g.map((C) => {
            let w = `- ${C.path}: ${C.message}`;
            if (C.suggestion) w += `. ${C.suggestion}`;
            return w;
          }),
          ...b.map((C) => `- ${C}`),
          ...y.map((err) => `- ${err}`),
        ].join(`
`),
      fullSchema: generateSettingsJSONSchema(),
    };
  } catch (parseError) {
    return {
      isValid: !1,
      error: `Invalid JSON: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`,
      fullSchema: generateSettingsJSONSchema(),
    };
  }
}
//@ chunk-dcmhvw5a.js:440624-441480 layout
function validatePolicyHelperConfig(e, n) {
  let r = clone(e),
    s = [];
  if (r && typeof r === "object") {
    let y = r;
    for (let b of ["policyHelper", "policyHelpers"])
      if (y[b] !== void 0) {
        if (y[b] !== null) s.push(b);
        delete y[b];
      }
  }
  let a = new Map(),
    c = validateSettingsDocument(r, n, {
      mcpServerEntrySalvageOnly: !0,
      policySource: !0,
      marketplacePatternIndexMapOut: a,
    }),
    g = n.startsWith("policyHelpers.") ? "payload" : "managedSettings",
    m = strictPluginOnlyCustomizationError(r);
  if (m !== void 0)
    return { error: `${g} rejected: strictPluginOnlyCustomization: ${m}`, warnings: c, strippedKeys: s };
  let f = validateAllowedProviders(r);
  if (f !== void 0) return { error: `${g} rejected: allowedProviders: ${f}`, warnings: c, strippedKeys: s };
  let safeParse = getSettingsSchemaForDocument(r).safeParse(r);
  if (!safeParse.success) {
    let joined = safeParse.error.issues
      .slice(0, 3)
      .map((b) => {
        let S = remapIssuePath(b.path, a);
        return S.length ? `${S.join(".")}: ${b.message}` : b.message;
      })
      .join("; ");
    return { error: `${g} rejected: ${joined}`, warnings: c, strippedKeys: s };
  }
  return (
    copyAllowedProviders(r, safeParse.data),
    { settings: safeParse.data, warnings: c, strippedKeys: s }
  );
}
/**
 * 检查 policyHelpers 中的静态设置载荷（default 与各平台 defaultSettings）：别名冲突、规则警告与无效载荷（来自 OS 管理员来源时会拒绝启动），返回警告文字列表。
 */
//@ chunk-dcmhvw5a.js:441480-442221 layout
function staticPayloadWarnings(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return [];
  let policyHelpers = e.policyHelpers;
  if (!policyHelpers || typeof policyHelpers !== "object" || Array.isArray(policyHelpers)) return [];
  let payloads = [],
    helpers = policyHelpers;
  if (helpers.default !== void 0 && helpers.default !== null)
    payloads.push(["policyHelpers.default", helpers.default]);
  for (let c of SUPPORTED_PLATFORMS) {
    let g = helpers[c];
    if (g && typeof g === "object" && !Array.isArray(g)) {
      let defaultSettings = g.defaultSettings;
      if (defaultSettings !== void 0 && defaultSettings !== null)
        payloads.push([`policyHelpers.${c}.defaultSettings`, defaultSettings]);
    }
  }
  let warnings = [];
  for (let [c, g] of payloads) {
    let m = isPlainObject_2(g) ? { ...g } : g;
    for (let h of applySettingAliases(m, c)) warnings.push(`${c}: ${aliasConflictMessage(h)}`);
    for (let h of collectRuleWarnings(m)) warnings.push(`${c}.${h}`);
    let f = validatePolicyHelperConfig(g, c);
    if ("error" in f)
      warnings.push(
        `${c}: not a valid static settings payload \u2014 Claude Code refuses to start on it when delivered from an OS-admin policy source (${f.error})`,
      );
  }
  return warnings;
}
/**
 * 从 permissions.allow/deny/ask 中剔除格式错误的规则并给出警告，避免整份设置作废。
 */
//@ chunk-dcmhvw5a.js:442221-443201 fingerprint = filterInvalidPermissionRules (0.686)
function filterInvalidPermissionRules(e, n, r) {
  if (!e || typeof e !== "object") return [];
  let obj = e;
  if (!obj.permissions || typeof obj.permissions !== "object") return [];
  let perms = obj.permissions,
    warnings = [],
    g = new Map();
  for (let key of ["allow", "deny", "ask"]) {
    let rules = perms[key];
    if (!Array.isArray(rules)) continue;
    let filtered = rules.filter((rule) => {
      if (typeof rule !== "string")
        return (
          warnings.push({
            file: n,
            path: `permissions.${key}`,
            message: `Non-string value in ${key} array was removed`,
            severity: "warning",
            invalidValue: rule,
          }),
          !1
        );
      let b = validatePermissionRule(rule, key);
      if (!b.valid) {
        let message = `Invalid permission rule "${rule}" was skipped: ${b.error}`;
        if (b.suggestion) message += `. ${b.suggestion}`;
        return (
          warnings.push({
            file: n,
            path: `permissions.${key}`,
            message: message,
            severity: "warning",
            invalidValue: rule,
          }),
          !1
        );
      }
      return !0;
    });
    if (r?.policySource && key !== "allow" && rules.length > 0 && filtered.length === 0) {
      if (!r.strictParseFollows) continue;
      g.set(key, "unreadable");
    } else if (filtered.length < rules.length) g.set(key, "trimmed");
    perms[key] = filtered;
  }
  return (
    withholdGrants(
      "permissions",
      perms,
      (m) => g.get(m),
      (m) =>
        warnings.push({
          file: n,
          path: m.path,
          message: m.message,
          severity: "warning",
          ...(m.substituted && { substituted: m.substituted }),
        }),
    ),
    warnings
  );
}

export {
  staticPayloadWarnings,
  AOn,
  getReceivedType,
  filterInvalidPermissionRules,
  formatZodError,
  explainUnloadableGuardHooks,
  validateSettingsFileContent,
  validatePolicyHelperConfig,
};

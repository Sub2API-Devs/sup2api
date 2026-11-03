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
import { enabledSettingsFeatureGroups } from "../spellcheck.js";
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
var strictSettingsSchema = DoctorLazy(() =>
  buildWholeSettingsSchema(enabledSettingsFeatureGroups(), {
    strictPolicyHelperKeys: true,
  }).strict(),
);
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
/**
 * isBlockingSettingsIssue：是否阻断的设置问题。
 */
function isBlockingSettingsIssue(e) {
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
          loadedWithoutGuardHook: true,
        }
      : n,
  );
}
//@ chunk-dcmhvw5a.js:438186-438308 fingerprint = getReceivedType (1)
function getReceivedType(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
//@ chunk-dcmhvw5a.js:438308-438376 file-local
function extractReceivedFromMessage(msg) {
  let match = msg.match(/received (\w+)/);
  return match ? match[1] : undefined;
}
//@ chunk-dcmhvw5a.js:438376-439575 fingerprint = formatZodError (0.935)
/**
 * 把 zod 错误转成 {file,path,message} 列表，附带 validationTips 里的修正提示与文档链接。
 */
function formatZodError(error, filePath) {
  return error.issues
    .flatMap((issue) => {
      if (issue.code !== "invalid_union" || issue.path.join(".") !== "attribution") return [issue];
      let filtered = issue.errors.flat().filter((error) => error.path.length > 0);
      return filtered.length > 0
        ? filtered.map((c) => ({
            ...c,
            path: [...issue.path, ...c.path],
          }))
        : [issue];
    })
    .map((issue) => {
      let path = issue.path.map(String).join(".");
      let message = issue.message;
      let expected;
      let enumValues;
      let expectedValue;
      let receivedValue;
      let invalidValue;
      if (isInvalidValueIssue(issue)) {
        enumValues = issue.values.map((v) => String(v));
        expectedValue = enumValues.join(" | ");
        receivedValue = undefined;
        invalidValue = undefined;
      } else if (isInvalidTypeIssue(issue)) {
        expectedValue = issue.expected;
        let receivedType = extractReceivedFromMessage(issue.message);
        receivedValue = receivedType ?? getReceivedType(issue.input);
        invalidValue = receivedType ?? getReceivedType(issue.input);
      } else if (isTooSmallIssue(issue)) expectedValue = String(issue.minimum);
      else if (issue.code === "custom" && "params" in issue) {
        receivedValue = issue.params.received;
        invalidValue = receivedValue;
      }
      let tip = getValidationTip({
        path,
        code: issue.code,
        expected: expectedValue,
        received: receivedValue,
        enumValues,
        message: issue.message,
        value: receivedValue,
      });
      if (isInvalidValueIssue(issue)) {
        expected = enumValues?.map((v) => `"${v}"`).join(", ");
        message = `Invalid value. Expected one of: ${expected}`;
      } else if (isInvalidTypeIssue(issue)) {
        let receivedType = extractReceivedFromMessage(issue.message) ?? getReceivedType(issue.input);
        if (issue.expected === "object" && receivedType === "null" && path === "")
          message = "Invalid or malformed JSON";
        else message = `Expected ${issue.expected}, but received ${receivedType}`;
      } else if (isUnrecognizedKeysIssue(issue)) {
        let keys = issue.keys.join(", ");
        message = `Unrecognized ${plural(issue.keys.length, "field")}: ${keys}`;
      } else if (isTooSmallIssue(issue)) {
        message = `Number must be greater than or equal to ${issue.minimum}`;
        expected = String(issue.minimum);
      }
      return {
        file: filePath,
        path,
        message,
        expected,
        invalidValue,
        suggestion: tip?.suggestion,
        docLink: tip?.docLink,
      };
    });
}
//@ chunk-dcmhvw5a.js:439575-440624 fingerprint = validateSettingsFileContent (0.508)
/**
 * 校验设置文件文本（编辑 settings.json 前后用），返回是否合法与错误说明。
 */
function validateSettingsFileContent(content) {
  try {
    let jsonData = jsonParse(content);
    let r = isPlainObject_2(jsonData)
      ? {
          ...jsonData,
        }
      : jsonData;
    let mapped = applySettingAliases(r, "settings").map(aliasConflictMessage);
    let a = jsonData;
    if (isPlainObject_2(jsonData)) {
      let filtered = SETTING_ALIASES.map((w) => w.alias).filter((w) => w in jsonData && jsonData[w] === null);
      if (filtered.length > 0) {
        let w = {
          ...jsonData,
        };
        for (let L of filtered) delete w[L];
        a = w;
      }
    }
    let result = strictSettingsSchema().safeParse(a);
    let g = result.success ? [] : formatZodError(result.error, "settings");
    let m = crossSessionInboundError(jsonData);
    if (m !== undefined)
      g.push({
        path: CROSSSESSIONINBOUND,
        message: `"crossSessionInbound" ${m}.`,
      });
    let f = strictPluginOnlyCustomizationError(jsonData);
    if (f !== undefined)
      g.push({
        path: "strictPluginOnlyCustomization",
        message: `"strictPluginOnlyCustomization" ${f}.`,
      });
    let h = validateAllowedProviders(jsonData);
    if (h !== undefined)
      g.push({
        path: "allowedProviders",
        message: `"allowedProviders" ${h}.`,
      });
    let y = staticPayloadWarnings(jsonData);
    let ruleWarnings = collectRuleWarnings(r);
    if (g.length === 0 && mapped.length === 0 && y.length === 0 && ruleWarnings.length === 0)
      return {
        isValid: true,
      };
    return {
      isValid: false,
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
          ...ruleWarnings.map((ruleWarning) => `- ${ruleWarning}`),
          ...y.map((err) => `- ${err}`),
        ].join(`
`),
      fullSchema: generateSettingsJSONSchema(),
    };
  } catch (parseError) {
    return {
      isValid: false,
      error: `Invalid JSON: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`,
      fullSchema: generateSettingsJSONSchema(),
    };
  }
}
//@ chunk-dcmhvw5a.js:440624-441480 layout
function validatePolicyHelperConfig(e, n) {
  let r = clone(e);
  let s = [];
  if (r && typeof r === "object") {
    let y = r;
    for (let b of ["policyHelper", "policyHelpers"])
      if (y[b] !== undefined) {
        if (y[b] !== null) s.push(b);
        delete y[b];
      }
  }
  let a = new Map();
  let warnings = validateSettingsDocument(r, n, {
    mcpServerEntrySalvageOnly: true,
    policySource: true,
    marketplacePatternIndexMapOut: a,
  });
  let g = n.startsWith("policyHelpers.") ? "payload" : "managedSettings";
  let m = strictPluginOnlyCustomizationError(r);
  if (m !== undefined)
    return {
      error: `${g} rejected: strictPluginOnlyCustomization: ${m}`,
      warnings,
      strippedKeys: s,
    };
  let f = validateAllowedProviders(r);
  if (f !== undefined)
    return {
      error: `${g} rejected: allowedProviders: ${f}`,
      warnings,
      strippedKeys: s,
    };
  let h = getSettingsSchemaForDocument(r).safeParse(r);
  if (!h.success) {
    let joined = h.error.issues
      .slice(0, 3)
      .map((issue) => {
        let S = remapIssuePath(issue.path, a);
        return S.length ? `${S.join(".")}: ${issue.message}` : issue.message;
      })
      .join("; ");
    return {
      error: `${g} rejected: ${joined}`,
      warnings,
      strippedKeys: s,
    };
  }
  copyAllowedProviders(r, h.data);
  return {
    settings: h.data,
    warnings,
    strippedKeys: s,
  };
}
//@ chunk-dcmhvw5a.js:441480-442221 layout
/**
 * 检查 policyHelpers 中的静态设置载荷（default 与各平台 defaultSettings）：别名冲突、规则警告与无效载荷（来自 OS 管理员来源时会拒绝启动），返回警告文字列表。
 */
function staticPayloadWarnings(e) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return [];
  let policyHelpers = e.policyHelpers;
  if (!policyHelpers || typeof policyHelpers !== "object" || Array.isArray(policyHelpers)) return [];
  let payloads = [];
  let helpers = policyHelpers;
  if (helpers.default !== undefined && helpers.default !== null)
    payloads.push(["policyHelpers.default", helpers.default]);
  for (let c of SUPPORTED_PLATFORMS) {
    let g = helpers[c];
    if (g && typeof g === "object" && !Array.isArray(g)) {
      let defaultSettings = g.defaultSettings;
      if (defaultSettings !== undefined && defaultSettings !== null)
        payloads.push([`policyHelpers.${c}.defaultSettings`, defaultSettings]);
    }
  }
  let warnings = [];
  for (let [c, g] of payloads) {
    let m = isPlainObject_2(g)
      ? {
          ...g,
        }
      : g;
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
//@ chunk-dcmhvw5a.js:442221-443201 fingerprint = filterInvalidPermissionRules (0.686)
/**
 * 从 permissions.allow/deny/ask 中剔除格式错误的规则并给出警告，避免整份设置作废。
 */
function filterInvalidPermissionRules(data, filePath, r) {
  if (!data || typeof data !== "object") return [];
  let obj = data;
  if (!obj.permissions || typeof obj.permissions !== "object") return [];
  let perms = obj.permissions;
  let warnings = [];
  let g = new Map();
  for (let key of ["allow", "deny", "ask"]) {
    let rules = perms[key];
    if (!Array.isArray(rules)) continue;
    let filtered = rules.filter((rule) => {
      if (typeof rule !== "string") {
        warnings.push({
          file: filePath,
          path: `permissions.${key}`,
          message: `Non-string value in ${key} array was removed`,
          severity: "warning",
          invalidValue: rule,
        });
        return false;
      }
      let result = validatePermissionRule(rule, key);
      if (!result.valid) {
        let message = `Invalid permission rule "${rule}" was skipped: ${result.error}`;
        if (result.suggestion) message += `. ${result.suggestion}`;
        warnings.push({
          file: filePath,
          path: `permissions.${key}`,
          message,
          severity: "warning",
          invalidValue: rule,
        });
        return false;
      }
      return true;
    });
    if (r?.policySource && key !== "allow" && rules.length > 0 && filtered.length === 0) {
      if (!r.strictParseFollows) continue;
      g.set(key, "unreadable");
    } else if (filtered.length < rules.length) g.set(key, "trimmed");
    perms[key] = filtered;
  }
  withholdGrants(
    "permissions",
    perms,
    (m) => g.get(m),
    (m) =>
      warnings.push({
        file: filePath,
        path: m.path,
        message: m.message,
        severity: "warning",
        ...(m.substituted && {
          substituted: m.substituted,
        }),
      }),
  );
  return warnings;
}
export {
  staticPayloadWarnings,
  isBlockingSettingsIssue,
  getReceivedType,
  filterInvalidPermissionRules,
  formatZodError,
  explainUnloadableGuardHooks,
  validateSettingsFileContent,
  validatePolicyHelperConfig,
};

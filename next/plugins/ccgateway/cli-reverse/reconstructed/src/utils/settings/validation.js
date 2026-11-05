/**
 * utils/settings/validation.ts
 *
 * 设置校验错误格式化（zod issue → 文件/路径/消息 + 修正提示），无效权限规则过滤，policyHelper 配置校验。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/validation.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-z20c443b.js (15)
 * attribution: fingerprint 7, sole-consumer 1, layout 7, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { HOOK_OUTPUT_META_KEYS } from "../hooks.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:435894-435956 sole-consumer
var strictSettingsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:435894", () => {
  strictSettingsSchema = DoctorLazy(() =>
    buildWholeSettingsSchema(enabledSettingsFeatureGroups(), {
      strictPolicyHelperKeys: true,
    }).strict(),
  );
});
//@ chunk-z20c443b.js:435956-436002 fingerprint (2.1.88 match: isInvalidTypeIssue, 1)
function isInvalidTypeIssue(issue) {
  return issue.code === "invalid_type";
}
//@ chunk-z20c443b.js:436002-436049 layout (2.1.88 match: isInvalidValueIssue, 1)
function isInvalidValueIssue_2(issue) {
  return issue.code === "invalid_value";
}
//@ chunk-z20c443b.js:436049-436100 layout (2.1.88 match: isUnrecognizedKeysIssue, 1)
function isUnrecognizedKeysIssue(issue) {
  return issue.code === "unrecognized_keys";
}
//@ chunk-z20c443b.js:436100-436143 fingerprint (2.1.88 match: isTooSmallIssue, 1)
function isTooSmallIssue(issue) {
  return issue.code === "too_small";
}
//@ chunk-z20c443b.js:436143-436216 layout
/**
 * isBlockingSettingsIssue：是否阻断的设置问题。
 */
function isBlockingSettingsIssue(issue) {
  return issue.severity !== "warning" && !issue.loadedWithoutGuardHook;
}
//@ chunk-z20c443b.js:436216-436495 layout
var UNLOADABLE_GUARD_HOOK_TEXT =
  'a PreToolUse/PermissionRequest hook that cannot be loaded does not run, nor does any other hook of the document where "hooks" is listed here as ignored; fix or remove the entry. The managed settings document is not skipped for it, unlike a user or project settings file';
//@ chunk-z20c443b.js:436495-436648 layout
function explainUnloadableGuardHooks(issues) {
  return issues.map((issue) =>
    issue.severity !== "warning" && issue.message.includes(UNLOADABLE_GUARD_NOTE)
      ? {
          ...issue,
          message: issue.message.replace(UNLOADABLE_GUARD_NOTE, () => UNLOADABLE_GUARD_HOOK_TEXT),
          loadedWithoutGuardHook: true,
        }
      : issue,
  );
}
//@ chunk-z20c443b.js:436648-436770 fingerprint (2.1.88 match: getReceivedType, 1)
function getReceivedType(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
//@ chunk-z20c443b.js:436770-436838 file-local
function extractReceivedFromMessage(msg) {
  let match = msg.match(/received (\w+)/);
  return match ? match[1] : undefined;
}
//@ chunk-z20c443b.js:436838-438037 fingerprint (2.1.88 match: formatZodError, 0.935)
/**
 * 把 zod 错误转成 {file,path,message} 列表，附带 validationTips 里的修正提示与文档链接。
 */
function formatZodError(error, filePath) {
  return error.issues
    .flatMap((issue) => {
      if (issue.code !== "invalid_union" || issue.path.join(".") !== "attribution") return [issue];
      let filtered = issue.errors.flat().filter((error) => error.path.length > 0);
      return filtered.length > 0
        ? filtered.map((error) => ({
            ...error,
            path: [...issue.path, ...error.path],
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
      if (isInvalidValueIssue_2(issue)) {
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
      if (isInvalidValueIssue_2(issue)) {
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
//@ chunk-z20c443b.js:438037-439086 fingerprint (2.1.88 match: validateSettingsFileContent, 0.508)
/**
 * 校验设置文件文本（编辑 settings.json 前后用），返回是否合法与错误说明。
 */
function validateSettingsFileContent(content) {
  try {
    let jsonData = jsonParse(content);
    let settingsObject = isPlainObject_2(jsonData)
      ? {
          ...jsonData,
        }
      : jsonData;
    let mapped = applySettingAliases(settingsObject, "settings").map(aliasConflictMessage);
    let parsedForValidation = jsonData;
    if (isPlainObject_2(jsonData)) {
      let filtered = SETTING_ALIASES.map((alias) => alias.alias).filter(
        (aliasName) => aliasName in jsonData && jsonData[aliasName] === null,
      );
      if (filtered.length > 0) {
        let withoutNullAliases = {
          ...jsonData,
        };
        for (let aliasName of filtered) delete withoutNullAliases[aliasName];
        parsedForValidation = withoutNullAliases;
      }
    }
    let result = strictSettingsSchema().safeParse(parsedForValidation);
    let issues = result.success ? [] : formatZodError(result.error, "settings");
    let crossSessionError = crossSessionInboundError(jsonData);
    if (crossSessionError !== undefined)
      issues.push({
        path: CROSSSESSIONINBOUND,
        message: `"crossSessionInbound" ${crossSessionError}.`,
      });
    let pluginOnlyError = strictPluginOnlyCustomizationError(jsonData);
    if (pluginOnlyError !== undefined)
      issues.push({
        path: "strictPluginOnlyCustomization",
        message: `"strictPluginOnlyCustomization" ${pluginOnlyError}.`,
      });
    let providersError = validateAllowedProviders(jsonData);
    if (providersError !== undefined)
      issues.push({
        path: "allowedProviders",
        message: `"allowedProviders" ${providersError}.`,
      });
    let payloadWarnings = staticPayloadWarnings(jsonData);
    let ruleWarnings = collectRuleWarnings(settingsObject);
    if (
      issues.length === 0 &&
      mapped.length === 0 &&
      payloadWarnings.length === 0 &&
      ruleWarnings.length === 0
    )
      return {
        isValid: true,
      };
    return {
      isValid: false,
      error:
        `Settings validation failed:
` +
        [
          ...mapped.map((aliasMessage) => `- ${aliasMessage}`),
          ...issues.map((issue) => {
            let line = `- ${issue.path}: ${issue.message}`;
            if (issue.suggestion) line += `. ${issue.suggestion}`;
            return line;
          }),
          ...ruleWarnings.map((ruleWarning) => `- ${ruleWarning}`),
          ...payloadWarnings.map((err) => `- ${err}`),
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
//@ chunk-z20c443b.js:439086-439942 layout
function validatePolicyHelperConfig(config, documentPath) {
  let settings = clone(config);
  let strippedKeys = [];
  if (settings && typeof settings === "object") {
    let record = settings;
    for (let key of ["policyHelper", "policyHelpers"])
      if (record[key] !== undefined) {
        if (record[key] !== null) strippedKeys.push(key);
        delete record[key];
      }
  }
  let marketplacePatternIndex = new Map();
  let warnings = validateSettingsDocument(settings, documentPath, {
    mcpServerEntrySalvageOnly: true,
    policySource: true,
    marketplacePatternIndexMapOut: marketplacePatternIndex,
  });
  let label = documentPath.startsWith("policyHelpers.") ? "payload" : "managedSettings";
  let pluginOnlyError = strictPluginOnlyCustomizationError(settings);
  if (pluginOnlyError !== undefined)
    return {
      error: `${label} rejected: strictPluginOnlyCustomization: ${pluginOnlyError}`,
      warnings,
      strippedKeys,
    };
  let providersError = validateAllowedProviders(settings);
  if (providersError !== undefined)
    return {
      error: `${label} rejected: allowedProviders: ${providersError}`,
      warnings,
      strippedKeys,
    };
  let parsed = getSettingsSchemaForDocument(settings).safeParse(settings);
  if (!parsed.success) {
    let joined = parsed.error.issues
      .slice(0, 3)
      .map((issue) => {
        let pathSegments = remapIssuePath(issue.path, marketplacePatternIndex);
        return pathSegments.length ? `${pathSegments.join(".")}: ${issue.message}` : issue.message;
      })
      .join("; ");
    return {
      error: `${label} rejected: ${joined}`,
      warnings,
      strippedKeys,
    };
  }
  copyAllowedProviders(settings, parsed.data);
  return {
    settings: parsed.data,
    warnings,
    strippedKeys,
  };
}
//@ chunk-z20c443b.js:439942-440683 layout
/**
 * 检查 policyHelpers 中的静态设置载荷（default 与各平台 defaultSettings）：别名冲突、规则警告与无效载荷（来自 OS 管理员来源时会拒绝启动），返回警告文字列表。
 */
function staticPayloadWarnings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return [];
  let policyHelpers = settings.policyHelpers;
  if (!policyHelpers || typeof policyHelpers !== "object" || Array.isArray(policyHelpers)) return [];
  let payloads = [];
  let helpers = policyHelpers;
  if (helpers.default !== undefined && helpers.default !== null)
    payloads.push(["policyHelpers.default", helpers.default]);
  for (let platform of SUPPORTED_PLATFORMS) {
    let entry = helpers[platform];
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      let defaultSettings = entry.defaultSettings;
      if (defaultSettings !== undefined && defaultSettings !== null)
        payloads.push([`policyHelpers.${platform}.defaultSettings`, defaultSettings]);
    }
  }
  let warnings = [];
  for (let [payloadPath, payload] of payloads) {
    let payloadCopy = isPlainObject_2(payload)
      ? {
          ...payload,
        }
      : payload;
    for (let conflict of applySettingAliases(payloadCopy, payloadPath))
      warnings.push(`${payloadPath}: ${aliasConflictMessage(conflict)}`);
    for (let ruleWarning of collectRuleWarnings(payloadCopy)) warnings.push(`${payloadPath}.${ruleWarning}`);
    let validation = validatePolicyHelperConfig(payload, payloadPath);
    if ("error" in validation)
      warnings.push(
        `${payloadPath}: not a valid static settings payload \u2014 Claude Code refuses to start on it when delivered from an OS-admin policy source (${validation.error})`,
      );
  }
  return warnings;
}
//@ chunk-z20c443b.js:440683-441663 fingerprint (2.1.88 match: filterInvalidPermissionRules, 0.686)
/**
 * 从 permissions.allow/deny/ask 中剔除格式错误的规则并给出警告，避免整份设置作废。
 */
function filterInvalidPermissionRules(data, filePath, options) {
  if (!data || typeof data !== "object") return [];
  let obj = data;
  if (!obj.permissions || typeof obj.permissions !== "object") return [];
  let perms = obj.permissions;
  let warnings = [];
  let unreadableRuleKinds = new Map();
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
    if (options?.policySource && key !== "allow" && rules.length > 0 && filtered.length === 0) {
      if (!options.strictParseFollows) continue;
      unreadableRuleKinds.set(key, "unreadable");
    } else if (filtered.length < rules.length) unreadableRuleKinds.set(key, "trimmed");
    perms[key] = filtered;
  }
  withholdGrants(
    "permissions",
    perms,
    (ruleKind) => unreadableRuleKinds.get(ruleKind),
    (warning) =>
      warnings.push({
        file: filePath,
        path: warning.path,
        message: warning.message,
        severity: "warning",
        ...(warning.substituted && {
          substituted: warning.substituted,
        }),
      }),
  );
  return warnings;
}
//@ chunk-5xgkngpb.js:3503098-3503199 fingerprint (2.1.88 match: isInvalidValueIssue, 1)
function isInvalidValueIssue(issue) {
  let last = issue.path.at(-1);
  return issue.code === "invalid_value" && typeof last === "string" && HOOK_OUTPUT_META_KEYS.has(last);
}
export {
  staticPayloadWarnings,
  isBlockingSettingsIssue,
  formatZodError,
  validatePolicyHelperConfig,
  isInvalidValueIssue,
  validateSettingsFileContent,
  getReceivedType,
  filterInvalidPermissionRules,
  explainUnloadableGuardHooks,
};

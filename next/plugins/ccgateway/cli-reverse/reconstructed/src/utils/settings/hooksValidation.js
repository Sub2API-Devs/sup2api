/**
 * utils/settings/hooksValidation.ts
 *
 * 2.1.316 新增：校验设置中的 hooks 结构（事件、匹配器、命令）；校验 modelPricing 设置等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (32)
 * attribution: placement 32
 */
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";
import {
  hasNestedHooks,
  OPAQUE_SETTING_KEYS,
  UNLOADABLE_GUARD_NOTE,
  hasGuardHooks_2,
  looksLikeHookMatcher,
  containsHooks,
  GUARD_HOOK_EVENTS,
  stripInvalidHookEntries,
  knownHookTypes,
} from "../../schemas/hookEntryValidation.js";
import { getReceivedType, filterInvalidPermissionRules } from "./validation.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { escapeControlCharsForDisplay, plural } from "../stringUtils.js";
import {
  allowedMcpServersSchema,
  deniedMcpServersSchema,
  RESTRICTIVE_TOP_LEVEL_SETTINGS,
  getUnenforceableMarketplaceReason,
  agentsSettingsSchema,
  outputStylesSettingsSchema,
  mcpSettingsSchema,
  hooksSettingsSchema,
  POLICY_HELPER_ON_FAILURE,
  POLICY_HELPER_LOG_LEVELS,
} from "./types.js";
import {
  MarketplaceSourceStrictSchema,
  hasUnknownSourceType,
  POLICY_SOURCE_TYPES,
  formatZodIssuesBrief,
  IMPERSONATION_ERROR_MESSAGE,
  isAsciiImpersonatingOfficialName,
  redactIssuePathKey,
} from "../plugins/schemas.js";
import { parseManagedMcpServers } from "../../services/mcp/types.js";
import { isAnthropicProviderId, API_PROVIDER_KINDS } from "../permissions/autoModeRulesPrompt.js";
import { applySettingAliases } from "./marketplaceSettingsAliases.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:441663-441682 placement
var HOOK_EVENT_NAME_SET; // deferred: uses HOOK_EVENTS (../../entrypoints/sdk/coreSchemas.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:441663", () => {
  HOOK_EVENT_NAME_SET = new Set(HOOK_EVENTS);
});
//@ chunk-z20c443b.js:441682-441987 placement
/**
 * 检查 hooks 中 PreToolUse/PermissionRequest 的配置问题。
 */
function validateHookOutputs(doc, file) {
  if (!doc || typeof doc !== "object") return [];
  return [
    ...(hasNestedHooks(doc, OPAQUE_SETTING_KEYS)
      ? [
          {
            file,
            path: "hooks",
            message: `PreToolUse/PermissionRequest hooks are declared outside "hooks" (at the top level or under another key) \u2014 ${UNLOADABLE_GUARD_NOTE}.`,
            severity: "fatal",
            docLink: "https://code.claude.com/docs/en/hooks",
          },
        ]
      : []),
    ...validateHooksSettings(doc, file),
  ];
}
//@ chunk-z20c443b.js:441987-444720 placement
/**
 * 校验设置中的 hooks 结构（事件、匹配器、命令）。
 */
function validateHooksSettings(doc, file) {
  if (!("hooks" in doc)) return [];
  if (doc.hooks === null || typeof doc.hooks !== "object" || Array.isArray(doc.hooks)) {
    let receivedType = getReceivedType(doc.hooks);
    if (Array.isArray(doc.hooks) && (doc.hooks.some(isPlainObject_2) || hasGuardHooks_2(doc.hooks)))
      return [
        {
          file,
          path: "hooks",
          message: `"hooks" must be an object mapping event names to matcher arrays; received ${receivedType} \u2014 ${UNLOADABLE_GUARD_NOTE}.`,
          invalidValue: receivedType,
          docLink: "https://code.claude.com/docs/en/hooks",
        },
      ];
    delete doc.hooks;
    return [
      {
        file,
        path: "hooks",
        message: `"hooks" must be an object mapping event names to matcher arrays; received ${receivedType}. This field was ignored.`,
        severity: "warning",
        invalidValue: receivedType,
        docLink: "https://code.claude.com/docs/en/hooks",
      },
    ];
  }
  let hooks = doc.hooks;
  if (looksLikeHookMatcher(hooks))
    return [
      {
        file,
        path: "hooks",
        message: `"hooks" must be an object mapping event names to matcher arrays; received a single matcher \u2014 ${UNLOADABLE_GUARD_NOTE}.`,
        docLink: "https://code.claude.com/docs/en/hooks",
      },
    ];
  let issues = [];
  for (let key of Object.keys(hooks)) {
    let escapedKey = escapeControlCharsForDisplay(key);
    if (!HOOK_EVENT_NAME_SET.has(key)) {
      if (
        containsHooks(hooks[key], 3, {
          matchersCount: !Array.isArray(hooks[key]),
        })
      ) {
        issues.push({
          file,
          path: `hooks.${escapedKey}`,
          message: `"${escapedKey}" is not a hook event, but it holds PreToolUse/PermissionRequest hooks \u2014 ${UNLOADABLE_GUARD_NOTE}.`,
          docLink: "https://code.claude.com/docs/en/hooks",
        });
        continue;
      }
      delete hooks[key];
      issues.push({
        file,
        path: `hooks.${escapedKey}`,
        message: `Unknown hook event "${escapedKey}" was ignored. Valid events: ${HOOK_EVENTS.join(", ")}`,
        severity: "warning",
        invalidValue: escapedKey,
        docLink: "https://code.claude.com/docs/en/hooks",
        preserveOnWrite: true,
      });
      continue;
    }
    if (!Array.isArray(hooks[key])) {
      let value = hooks[key];
      let receivedType = getReceivedType(value);
      if (
        (GUARD_HOOK_EVENTS.has(key) && value !== null) ||
        containsHooks(value, 3, {
          matchersCount: false,
        })
      ) {
        issues.push({
          file,
          path: `hooks.${escapedKey}`,
          message: `Hook event "${escapedKey}" must be an array of matchers; received ${receivedType} \u2014 ${UNLOADABLE_GUARD_NOTE}.`,
          invalidValue: receivedType,
          docLink: "https://code.claude.com/docs/en/hooks",
        });
        continue;
      }
      delete hooks[key];
      issues.push({
        file,
        path: `hooks.${escapedKey}`,
        message: `Hook event "${escapedKey}" must be an array of matchers; received ${receivedType}. This entry was ignored.`,
        severity: "warning",
        invalidValue: receivedType,
        docLink: "https://code.claude.com/docs/en/hooks",
        ...(value !== null && {
          preserveOnWrite: true,
        }),
      });
    }
  }
  for (let [key, value] of Object.entries(hooks)) {
    let { stripped, unloadableGuards } = stripInvalidHookEntries(value, key);
    for (let unloadableGuard of unloadableGuards)
      issues.push({
        file,
        path: unloadableGuard.aboutType
          ? `hooks.${key}.${unloadableGuard.path}.type`
          : `hooks.${key}.${unloadableGuard.path}`,
        message: `${unloadableGuard.problem} \u2014 ${UNLOADABLE_GUARD_NOTE}.${unloadableGuard.aboutType ? ` Valid types: ${[...knownHookTypes()].join(", ")}` : ""}`,
        severity: "fatal",
        invalidValue: unloadableGuard.received,
        docLink: "https://code.claude.com/docs/en/hooks",
      });
    for (let entry of stripped)
      issues.push({
        file,
        path: entry.aboutType ? `hooks.${key}.${entry.path}.type` : `hooks.${key}.${entry.path}`,
        message: entry.aboutType
          ? `${entry.problem}; entry ignored. Valid types: ${[...knownHookTypes()].join(", ")}`
          : `${entry.problem}; ${entry.hookIndex === undefined ? "matcher" : "entry"} ignored.`,
        severity: "warning",
        invalidValue: entry.received,
        docLink: "https://code.claude.com/docs/en/hooks",
        preserveOnWrite: true,
      });
  }
  if (issues.length > 0 && Object.keys(hooks).length === 0) delete doc.hooks;
  return issues;
}
//@ chunk-z20c443b.js:444720-444800 placement
var MCP_SERVER_LIST_SETTINGS; // deferred: uses PermissionsSettingsSchema (./types.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:444720", () => {
  MCP_SERVER_LIST_SETTINGS = [
    {
      key: "allowedMcpServers",
      schema: allowedMcpServersSchema,
    },
    {
      key: "deniedMcpServers",
      schema: deniedMcpServersSchema,
    },
  ];
});
//@ chunk-z20c443b.js:444800-445448 placement
/**
 * 按 schema 校验列表类设置项。
 */
function validateListSettings(doc, file, options) {
  if (!doc || typeof doc !== "object") return [];
  let target = doc;
  let issues = [];
  for (let { key, schema } of MCP_SERVER_LIST_SETTINGS) {
    if (!(key in target)) continue;
    if (!Array.isArray(target[key])) {
      if (options?.keepWholeFieldInvalid) continue;
      let value = target[key];
      delete target[key];
      issues.push({
        file,
        path: key,
        message: `"${key}" must be an array; received ${getReceivedType(value)}. This field was ignored.`,
        severity: "warning",
        invalidValue: value,
      });
      continue;
    }
    let list = target[key];
    let valid = [];
    for (let j = 0; j < list.length; j++) {
      let parsed = schema().safeParse(list[j]);
      if (parsed.success) valid.push(list[j]);
      else
        issues.push({
          file,
          path: `${key}[${j}]`,
          message: `Invalid entry was ignored: ${parsed.error.issues[0]?.message ?? "failed validation"}`,
          severity: "warning",
          invalidValue: list[j],
        });
    }
    if (valid.length < list.length) target[key] = valid;
  }
  return issues;
}
//@ chunk-z20c443b.js:445448-445505 placement
var MARKETPLACE_LIST_SETTINGS = ["strictKnownMarketplaces", "blockedMarketplaces"];
//@ chunk-z20c443b.js:445505-445581 placement
function dropNullRestrictionKeys(doc) {
  if (!isPlainObject_2(doc)) return;
  for (let key of RESTRICTIVE_TOP_LEVEL_SETTINGS()) if (doc[key] === null) delete doc[key];
}
//@ chunk-z20c443b.js:445581-446253 placement
/**
 * 校验权限规则列表（逐条解析）。
 */
function validatePermissionRuleLists(doc, file, marketplacePatternIndexMapOut) {
  if (!isPlainObject_2(doc)) return [];
  let issues = [];
  for (let key of MARKETPLACE_LIST_SETTINGS) {
    let list = doc[key];
    if (!Array.isArray(list)) continue;
    let kept = [];
    let keptIndexes = [];
    for (let j = 0; j < list.length; j++) {
      let parsed = MarketplaceSourceStrictSchema().safeParse(list[j]);
      if (!parsed.success) {
        kept.push(list[j]);
        keptIndexes.push(j);
        continue;
      }
      let unenforceableMarketplaceReason = getUnenforceableMarketplaceReason(parsed.data);
      if (unenforceableMarketplaceReason === null) {
        kept.push(list[j]);
        keptIndexes.push(j);
        continue;
      }
      if (key === "blockedMarketplaces") {
        kept.push(list[j]);
        keptIndexes.push(j);
        issues.push({
          file,
          path: `${key}[${j}]`,
          message: `Unenforceable entry was kept: ${unenforceableMarketplaceReason}; it can never match a marketplace source, but marketplace restrictions stay active`,
          severity: "warning",
        });
        continue;
      }
      issues.push({
        file,
        path: `${key}[${j}]`,
        message: `Invalid entry was ignored: ${unenforceableMarketplaceReason}`,
        severity: "warning",
      });
    }
    if (kept.length < list.length) {
      doc[key] = kept;
      marketplacePatternIndexMapOut?.set(key, keptIndexes);
    }
  }
  return issues;
}
//@ chunk-z20c443b.js:446253-446753 placement
/**
 * 收集权限规则的警告。
 */
function collectRuleWarnings(doc) {
  if (!isPlainObject_2(doc)) return [];
  let warnings = [];
  for (let key of MARKETPLACE_LIST_SETTINGS) {
    let list = doc[key];
    if (!Array.isArray(list)) continue;
    for (let [index, entry] of list.entries()) {
      let parsed = MarketplaceSourceStrictSchema().safeParse(entry);
      if (!parsed.success) continue;
      let unenforceableMarketplaceReason = getUnenforceableMarketplaceReason(parsed.data);
      if (unenforceableMarketplaceReason !== null)
        warnings.push(
          `${key}[${index}]: ${unenforceableMarketplaceReason} \u2014 on policy tiers (managed settings) ${key === "blockedMarketplaces" ? "clients keep it with a warning, but it can never match, so it blocks nothing" : "clients silently strip it at load"}; in user/project/local files the key is inert; fix or remove the entry`,
        );
    }
  }
  return warnings;
}
//@ chunk-z20c443b.js:446753-446901 placement
function remapIssuePath(path, map) {
  let key = path[0];
  let index = path[1];
  if (typeof key !== "string" || typeof index !== "number") return path;
  let mapped = map.get(key)?.[index];
  return mapped === undefined ? path : [key, mapped, ...path.slice(2)];
}
//@ chunk-z20c443b.js:446901-447224 placement
/**
 * 校验 managedMcpServers。
 */
function validateManagedMcpServers(doc, file) {
  if (!isPlainObject_2(doc) || doc.managedMcpServers === undefined) return [];
  let issues = [];
  let managedMcpServers = parseManagedMcpServers(doc.managedMcpServers, (name, problem) =>
    issues.push({
      file,
      path: name ? `managedMcpServers.${name}` : "managedMcpServers",
      message: name ? `Managed MCP server was ignored: ${problem}` : problem,
      severity: "warning",
    }),
  );
  if (managedMcpServers === undefined) delete doc.managedMcpServers;
  else doc.managedMcpServers = managedMcpServers;
  return issues;
}
//@ chunk-z20c443b.js:447224-447373 placement
function marketplaceSourceType(entry) {
  if (!entry || typeof entry !== "object") return;
  let source = entry.source;
  if (!source || typeof source !== "object") return;
  let source_2 = source.source;
  return typeof source_2 === "string" ? source_2 : undefined;
}
//@ chunk-z20c443b.js:447373-447527 placement
function hasUnknownPluginSourceType(entry) {
  if (!entry || typeof entry !== "object") return false;
  let source = entry.source;
  if (!source || typeof source !== "object") return false;
  let plugins = source.plugins;
  return Array.isArray(plugins) && plugins.some(hasUnknownSourceType);
}
//@ chunk-z20c443b.js:447527-447644 placement
function settingsMarketplaceName(entry) {
  let source = isPlainObject_2(entry) ? entry.source : undefined;
  return isPlainObject_2(source) && source.source === "settings" && typeof source.name === "string"
    ? source.name
    : undefined;
}
//@ chunk-z20c443b.js:447644-448919 placement
/**
 * 校验 extraKnownMarketplaces。
 */
function validateExtraMarketplaces(doc, file) {
  if (!doc || typeof doc !== "object") return [];
  let target = doc;
  let key = "extraKnownMarketplaces";
  if (!(key in target)) return [];
  let value = target[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    let receivedType = getReceivedType(value);
    delete target[key];
    return [
      {
        file,
        path: key,
        message: `"${key}" must be an object mapping marketplace names to declarations; received ${receivedType}. This field was ignored.`,
        severity: "warning",
        invalidValue: receivedType,
      },
    ];
  }
  let map = value;
  let issues = [];
  for (let key_2 of Object.keys(map)) {
    let parsed = agentsSettingsSchema().safeParse(map[key_2]);
    let problem;
    let impersonating = false;
    if (!parsed.success) {
      let sourceType = marketplaceSourceType(map[key_2]);
      if (
        (sourceType !== undefined && !POLICY_SOURCE_TYPES.has(sourceType)) ||
        hasUnknownPluginSourceType(map[key_2])
      )
        continue;
      problem = formatZodIssuesBrief(parsed.error.issues);
      {
        let name = settingsMarketplaceName(map[key_2]);
        impersonating =
          parsed.error.issues.every((issue) => issue.message === IMPERSONATION_ERROR_MESSAGE) &&
          name === key_2 &&
          isAsciiImpersonatingOfficialName(name);
      }
    } else if (parsed.data.source.source === "settings" && parsed.data.source.name !== key_2)
      problem = `key "${redactIssuePathKey(key_2)}" must match the settings source name "${redactIssuePathKey(parsed.data.source.name)}"`;
    if (problem !== undefined) {
      issues.push({
        file,
        path: `${key}.${redactIssuePathKey(key_2)}`,
        message: impersonating
          ? "Marketplace entry was ignored: its name reads like an official Anthropic or Claude marketplace. It stays in this file: rename it (the key and the source's name) to use it, or delete it. If /plugin also shows a marketplace of this name as refused, remove that one in /plugin \u2192 Marketplaces once this entry is renamed or deleted."
          : `Invalid marketplace entry was ignored: ${problem}`,
        severity: "warning",
        ...(impersonating && {
          preserveOnWrite: true,
        }),
      });
      delete map[key_2];
    }
  }
  return issues;
}
//@ chunk-z20c443b.js:448919-450033 placement
/**
 * 校验 modelPicker 设置。
 */
function validateModelPicker(doc, file) {
  if (!doc || typeof doc !== "object") return [];
  let target = doc;
  let key = "modelPicker";
  if (!(key in target)) return [];
  let value = target[key];
  if (!isPlainObject_2(value) || !Array.isArray(value.options)) {
    let received = isPlainObject_2(value)
      ? `options: ${getReceivedType(value.options)}`
      : getReceivedType(value);
    delete target[key];
    return [
      {
        file,
        path: key,
        message: `"${key}" must be an object with an "options" array of { model, label?, description?, behavesAs? } rows; received ${received}. This field was ignored.`,
        severity: "warning",
        invalidValue: received,
      },
    ];
  }
  let issues = [];
  if ("replaceBuiltInOptions" in value && typeof value.replaceBuiltInOptions !== "boolean") {
    let receivedType = getReceivedType(value.replaceBuiltInOptions);
    delete value.replaceBuiltInOptions;
    issues.push({
      file,
      path: `${key}.replaceBuiltInOptions`,
      message: `"replaceBuiltInOptions" must be true or false; received ${receivedType}. This entry was ignored (the rows are added to the built-in lineup).`,
      severity: "warning",
      invalidValue: receivedType,
    });
  }
  let options = value.options;
  let validOptions = [];
  for (let j = 0; j < options.length; j++) {
    let parsed = outputStylesSettingsSchema().safeParse(options[j]);
    if (parsed.success) {
      validOptions.push(options[j]);
      continue;
    }
    issues.push({
      file,
      path: `${key}.options.${j}`,
      message: `${modelPickerIssueText(parsed.error.issues[0])}. This row was ignored; the other rows still apply.`,
      severity: "warning",
      invalidValue: getReceivedType(options[j]),
    });
  }
  if (validOptions.length !== options.length) value.options = validOptions;
  return issues;
}
//@ chunk-z20c443b.js:450033-451341 placement
/**
 * 校验 modelPricing 设置。
 */
function validateModelPricing(doc, file) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return [];
  let target = doc;
  if (!("modelPricing" in target) || target.modelPricing === undefined) return [];
  let modelPricing = target.modelPricing;
  if (!modelPricing || typeof modelPricing !== "object" || Array.isArray(modelPricing)) {
    delete target.modelPricing;
    return [
      {
        file,
        path: "modelPricing",
        message: `"modelPricing" must be an object; received ${getReceivedType(modelPricing)}. It was ignored.`,
        severity: "warning",
      },
    ];
  }
  let pricing = modelPricing;
  let issues = [];
  if (pricing.multiplier !== undefined && !mcpSettingsSchema().safeParse(pricing.multiplier).success) {
    issues.push({
      file,
      path: "modelPricing.multiplier",
      message: '"multiplier" must be a number greater than 0 and at most 10. It was ignored.',
      severity: "warning",
      invalidValue: pricing.multiplier,
    });
    delete pricing.multiplier;
  }
  if (pricing.overrides !== undefined) {
    let overrides = pricing.overrides;
    if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
      issues.push({
        file,
        path: "modelPricing.overrides",
        message: `"overrides" must be an object mapping model ID to rates; received ${getReceivedType(overrides)}. It was ignored.`,
        severity: "warning",
      });
      delete pricing.overrides;
    } else {
      let overrideRows = overrides;
      for (let key of Object.keys(overrideRows)) {
        let parsed = hooksSettingsSchema().safeParse(overrideRows[key]);
        if (parsed.success && key !== "constructor" && key !== "__proto__") continue;
        let issue = parsed.success ? undefined : parsed.error.issues[0];
        issues.push({
          file,
          path: `modelPricing.overrides.${redactIssuePathKey(key)}`,
          message: `Invalid pricing row was ignored (${issue ? `${issue.path.join(".") || "row"}: ${issue.message}` : "not a model ID"}).`,
          severity: "warning",
          invalidValue: overrideRows[key],
        });
        delete overrideRows[key];
      }
    }
  }
  return issues;
}
//@ chunk-z20c443b.js:451341-451484 placement
function modelPickerIssueText(issue) {
  if (!issue) return "Invalid modelPicker row";
  return `modelPicker row ${issue.path.length > 0 ? `"${issue.path.join(".")}" ` : ""}${issue.message}`.trim();
}
//@ chunk-z20c443b.js:451484-451740 placement
function sanitizeCrossSessionInbound(doc, file, options) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return [];
  let target = doc;
  let crossSessionInbound = target.crossSessionInbound;
  if (crossSessionInbound === undefined || isKnownHookEvent(crossSessionInbound)) return [];
  if (options?.policySource) target.crossSessionInbound = "refuse";
  else delete target.crossSessionInbound;
  return [unknownValueWarning(crossSessionInbound, file, options?.policySource === true)];
}
//@ chunk-z20c443b.js:451740-451799 placement
function isKnownHookEvent(crossSessionInbound) {
  return typeof crossSessionInbound === "string" && POLICY_HELPER_ON_FAILURE.includes(crossSessionInbound);
}
//@ chunk-z20c443b.js:451799-451829 placement
var CROSSSESSIONINBOUND = "crossSessionInbound";
//@ chunk-z20c443b.js:451829-451930 placement
/**
 * 校验 crossSessionInbound 设置值，不合法时返回错误说明。
 */
function crossSessionInboundError(doc) {
  if (!isPlainObject_2(doc)) return;
  let crossSessionInbound = doc.crossSessionInbound;
  if (crossSessionInbound === undefined || isKnownHookEvent(crossSessionInbound)) return;
  return crossSessionInboundExpected(crossSessionInbound);
}
//@ chunk-z20c443b.js:451930-452148 placement
/**
 * 校验 strictPluginOnlyCustomization 设置（布尔或数组），不合法时返回错误说明。
 */
function strictPluginOnlyCustomizationError(doc) {
  if (!isPlainObject_2(doc)) return;
  let strictPluginOnlyCustomization = doc.strictPluginOnlyCustomization;
  if (
    strictPluginOnlyCustomization === undefined ||
    strictPluginOnlyCustomization === null ||
    typeof strictPluginOnlyCustomization === "boolean" ||
    Array.isArray(strictPluginOnlyCustomization)
  )
    return;
  return `must be true, false, or an array of surface names; received ${getReceivedType(strictPluginOnlyCustomization)}`;
}
//@ chunk-z20c443b.js:452148-452602 placement
/**
 * 校验 allowedProviders。
 */
function validateAllowedProviders(doc) {
  if (!isPlainObject_2(doc)) return;
  let allowedProviders = doc.allowedProviders;
  if (allowedProviders === undefined) return;
  if (!Array.isArray(allowedProviders))
    return `must be an array of provider names; received ${getReceivedType(allowedProviders)}`;
  let found = allowedProviders.find((allowedProvider) => typeof allowedProvider !== "string");
  if (found !== undefined)
    return `entries must be provider names (strings); received ${getReceivedType(found)}`;
  let filtered = allowedProviders.filter((allowedProvider) => !isAnthropicProviderId(allowedProvider));
  return filtered.length === 0
    ? undefined
    : `unknown provider ${plural(filtered.length, "name")} ${filtered.map((name) => JSON.stringify(name)).join(", ")}; known names: ${API_PROVIDER_KINDS.join(", ")}`;
}
//@ chunk-z20c443b.js:452602-452737 placement
function copyAllowedProviders(doc, target) {
  if (!isPlainObject_2(doc) || !Array.isArray(doc.allowedProviders)) return;
  Object.assign(target, {
    allowedProviders: doc.allowedProviders.filter(isAnthropicProviderId),
  });
}
//@ chunk-z20c443b.js:452737-452905 placement
function crossSessionInboundExpected(value) {
  let joined = POLICY_HELPER_ON_FAILURE.map((allowed) => `"${allowed}"`).join(", ");
  let received =
    typeof value === "string"
      ? `"${redactIssuePathKey(value).replace(/^<key>$/, "<value>")}"`
      : getReceivedType(value);
  return `must be one of ${joined}; received ${received}`;
}
//@ chunk-z20c443b.js:452905-453433 placement
/**
 * 无法识别的取值的警告（托管设置视为拒绝）。
 */
function unknownValueWarning(crossSessionInbound, file, policySource = false) {
  let expected = POLICY_HELPER_ON_FAILURE.map((allowed) => `"${allowed}"`).join(", ");
  let consequence = policySource
    ? 'In managed settings an unrecognized value is treated as "refuse" (the most restrictive): cross-session messages to this session are turned away until an administrator fixes it.'
    : "This value was ignored; while it is present, cross-session messages are held for your approval instead of being delivered. Set it to one of the values above.";
  return {
    file,
    path: CROSSSESSIONINBOUND,
    message: `"crossSessionInbound" ${crossSessionInboundExpected(crossSessionInbound)}. ${consequence}`,
    severity: "warning",
    expected,
    ...(policySource && {
      statusOnly: true,
    }),
  };
}
//@ chunk-z20c443b.js:453433-453474 placement
var REMOTECONTROL_SHAREHOSTPROFILE = "remoteControl.shareHostProfile";
//@ chunk-z20c443b.js:453474-454720 placement
/**
 * 校验 remoteControl 设置。
 */
function validateRemoteControlSetting(doc, file, options) {
  if (!isPlainObject_2(doc) || doc.remoteControl === undefined) return [];
  let policySource = options?.policySource === true;
  let joined = POLICY_HELPER_LOG_LEVELS.map((level) => `"${level}"`).join(", ");
  let consequence = policySource
    ? 'In managed settings this is treated as "off" (the most restrictive): Remote Control environments report nothing about this machine until an administrator fixes it.'
    : "While it is present, Remote Control environments report nothing about this machine.";
  let issue = (problem) => ({
    file,
    path: REMOTECONTROL_SHAREHOSTPROFILE,
    message: `${problem}. ${consequence}`,
    severity: "warning",
    expected: joined,
    ...(policySource
      ? {
          statusOnly: true,
        }
      : {
          preserveOnWrite: true,
        }),
  });
  let type = (value) =>
    typeof value === "string"
      ? `"${redactIssuePathKey(value).replace(/^<key>$/, "<value>")}"`
      : getReceivedType(value);
  let remoteControl = doc.remoteControl;
  if (!isPlainObject_2(remoteControl)) {
    if (policySource)
      doc.remoteControl = {
        shareHostProfile: "off",
      };
    else delete doc.remoteControl;
    return [
      issue(
        `"remoteControl" must be an object like { "shareHostProfile": ${joined.replace(/, /g, " | ")} }; received ${type(remoteControl)}`,
      ),
    ];
  }
  let issues = [];
  let filtered = Object.keys(remoteControl).filter((key) => key !== "shareHostProfile");
  if (filtered.length > 0) {
    if (policySource) remoteControl.shareHostProfile = "off";
    issues.push(
      issue(
        `"remoteControl" has an unrecognized key ${filtered.map((key) => `"${redactIssuePathKey(key)}"`).join(", ")} (its only key is "shareHostProfile")`,
      ),
    );
  }
  let shareHostProfile = remoteControl.shareHostProfile;
  if (
    shareHostProfile !== undefined &&
    !(typeof shareHostProfile === "string" && POLICY_HELPER_LOG_LEVELS.includes(shareHostProfile))
  ) {
    if (policySource) remoteControl.shareHostProfile = "off";
    else delete remoteControl.shareHostProfile;
    issues.push(
      issue(
        `"${REMOTECONTROL_SHAREHOSTPROFILE}" must be one of ${joined}; received ${type(shareHostProfile)}`,
      ),
    );
  }
  return issues;
}
//@ chunk-z20c443b.js:454720-454800 placement
var MCP_SERVER_ENABLED_SETTINGS = ["enabledMcpjsonServers", "disabledMcpjsonServers"];
var MCP_SERVER_NAME_RE = /^[A-Za-z0-9_-]+$/;
//@ chunk-z20c443b.js:454800-454905 placement
/**
 * 把应为数组的字符串设置包成数组。
 */
function coerceStringListSettings(doc) {
  if (!isPlainObject_2(doc)) return;
  for (let key of MCP_SERVER_ENABLED_SETTINGS) {
    let value = doc[key];
    if (typeof value === "string" && MCP_SERVER_NAME_RE.test(value)) doc[key] = [value];
  }
}
//@ chunk-z20c443b.js:454905-455425 placement
/**
 * 校验整份设置文档（别名、hooks、规则等）。
 */
function validateSettingsDocument(doc, file, options) {
  let issues = [...applySettingAliases(doc, file)];
  dropNullRestrictionKeys(doc);
  if (!options?.policySource) coerceStringListSettings(doc);
  issues.push(
    ...filterInvalidPermissionRules(doc, file, {
      policySource: options?.policySource,
      strictParseFollows: options?.mcpServerEntrySalvageOnly,
    }),
    ...validateHookOutputs(doc, file),
    ...validateExtraMarketplaces(doc, file),
    ...validateModelPicker(doc, file),
    ...validateModelPricing(doc, file),
    ...sanitizeCrossSessionInbound(doc, file, {
      policySource: options?.policySource,
    }),
    ...validateRemoteControlSetting(doc, file, {
      policySource: options?.policySource,
    }),
    ...(options?.skipMcpServerEntryFilter
      ? []
      : validateListSettings(doc, file, {
          keepWholeFieldInvalid: options?.mcpServerEntrySalvageOnly,
        })),
    ...(options?.mcpServerEntrySalvageOnly ? validateManagedMcpServers(doc, file) : []),
    ...(options?.mcpServerEntrySalvageOnly
      ? validatePermissionRuleLists(doc, file, options.marketplacePatternIndexMapOut)
      : []),
  );
  return issues;
}
export {
  coerceStringListSettings,
  collectRuleWarnings,
  crossSessionInboundError,
  strictPluginOnlyCustomizationError,
  validateAllowedProviders,
  validateSettingsDocument,
  CROSSSESSIONINBOUND,
  remapIssuePath,
  copyAllowedProviders,
  REMOTECONTROL_SHAREHOSTPROFILE,
};

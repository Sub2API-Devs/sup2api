/**
 * utils/settings/hooksValidation.ts
 *
 * 2.1.316 新增：校验设置中的 hooks 结构（事件、匹配器、命令）；校验 modelPricing 设置等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (32)
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

//@ chunk-dcmhvw5a.js:443201-443220 placement
var HOOK_EVENT_NAME_SET = new Set(HOOK_EVENTS);
//@ chunk-dcmhvw5a.js:443220-443525 placement
/**
 * 检查 hooks 中 PreToolUse/PermissionRequest 的配置问题。
 */
function validateHookOutputs(e, file) {
  if (!e || typeof e !== "object") return [];
  return [
    ...(hasNestedHooks(e, OPAQUE_SETTING_KEYS)
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
    ...validateHooksSettings(e, file),
  ];
}
//@ chunk-dcmhvw5a.js:443525-446258 placement
/**
 * 校验设置中的 hooks 结构（事件、匹配器、命令）。
 */
function validateHooksSettings(e, file) {
  if (!("hooks" in e)) return [];
  if (e.hooks === null || typeof e.hooks !== "object" || Array.isArray(e.hooks)) {
    let receivedType = getReceivedType(e.hooks);
    if (Array.isArray(e.hooks) && (e.hooks.some(isPlainObject_2) || hasGuardHooks_2(e.hooks)))
      return [
        {
          file,
          path: "hooks",
          message: `"hooks" must be an object mapping event names to matcher arrays; received ${receivedType} \u2014 ${UNLOADABLE_GUARD_NOTE}.`,
          invalidValue: receivedType,
          docLink: "https://code.claude.com/docs/en/hooks",
        },
      ];
    delete e.hooks;
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
  let hooks = e.hooks;
  if (looksLikeHookMatcher(hooks))
    return [
      {
        file,
        path: "hooks",
        message: `"hooks" must be an object mapping event names to matcher arrays; received a single matcher \u2014 ${UNLOADABLE_GUARD_NOTE}.`,
        docLink: "https://code.claude.com/docs/en/hooks",
      },
    ];
  let s = [];
  for (let key of Object.keys(hooks)) {
    let c = escapeControlCharsForDisplay(key);
    if (!HOOK_EVENT_NAME_SET.has(key)) {
      if (
        containsHooks(hooks[key], 3, {
          matchersCount: !Array.isArray(hooks[key]),
        })
      ) {
        s.push({
          file,
          path: `hooks.${c}`,
          message: `"${c}" is not a hook event, but it holds PreToolUse/PermissionRequest hooks \u2014 ${UNLOADABLE_GUARD_NOTE}.`,
          docLink: "https://code.claude.com/docs/en/hooks",
        });
        continue;
      }
      delete hooks[key];
      s.push({
        file,
        path: `hooks.${c}`,
        message: `Unknown hook event "${c}" was ignored. Valid events: ${HOOK_EVENTS.join(", ")}`,
        severity: "warning",
        invalidValue: c,
        docLink: "https://code.claude.com/docs/en/hooks",
        preserveOnWrite: true,
      });
      continue;
    }
    if (!Array.isArray(hooks[key])) {
      let g = hooks[key];
      let receivedType = getReceivedType(g);
      if (
        (GUARD_HOOK_EVENTS.has(key) && g !== null) ||
        containsHooks(g, 3, {
          matchersCount: false,
        })
      ) {
        s.push({
          file,
          path: `hooks.${c}`,
          message: `Hook event "${c}" must be an array of matchers; received ${receivedType} \u2014 ${UNLOADABLE_GUARD_NOTE}.`,
          invalidValue: receivedType,
          docLink: "https://code.claude.com/docs/en/hooks",
        });
        continue;
      }
      delete hooks[key];
      s.push({
        file,
        path: `hooks.${c}`,
        message: `Hook event "${c}" must be an array of matchers; received ${receivedType}. This entry was ignored.`,
        severity: "warning",
        invalidValue: receivedType,
        docLink: "https://code.claude.com/docs/en/hooks",
        ...(g !== null && {
          preserveOnWrite: true,
        }),
      });
    }
  }
  for (let [key, value] of Object.entries(hooks)) {
    let { stripped, unloadableGuards } = stripInvalidHookEntries(value, key);
    for (let unloadableGuard of unloadableGuards)
      s.push({
        file,
        path: unloadableGuard.aboutType
          ? `hooks.${key}.${unloadableGuard.path}.type`
          : `hooks.${key}.${unloadableGuard.path}`,
        message: `${unloadableGuard.problem} \u2014 ${UNLOADABLE_GUARD_NOTE}.${unloadableGuard.aboutType ? ` Valid types: ${[...knownHookTypes()].join(", ")}` : ""}`,
        severity: "fatal",
        invalidValue: unloadableGuard.received,
        docLink: "https://code.claude.com/docs/en/hooks",
      });
    for (let f of stripped)
      s.push({
        file,
        path: f.aboutType ? `hooks.${key}.${f.path}.type` : `hooks.${key}.${f.path}`,
        message: f.aboutType
          ? `${f.problem}; entry ignored. Valid types: ${[...knownHookTypes()].join(", ")}`
          : `${f.problem}; ${f.hookIndex === undefined ? "matcher" : "entry"} ignored.`,
        severity: "warning",
        invalidValue: f.received,
        docLink: "https://code.claude.com/docs/en/hooks",
        preserveOnWrite: true,
      });
  }
  if (s.length > 0 && Object.keys(hooks).length === 0) delete e.hooks;
  return s;
}
//@ chunk-dcmhvw5a.js:446258-446338 placement
var MCP_SERVER_LIST_SETTINGS = [
  {
    key: "allowedMcpServers",
    schema: allowedMcpServersSchema,
  },
  {
    key: "deniedMcpServers",
    schema: deniedMcpServersSchema,
  },
];
//@ chunk-dcmhvw5a.js:446338-446986 placement
/**
 * 按 schema 校验列表类设置项。
 */
function validateListSettings(e, file, r) {
  if (!e || typeof e !== "object") return [];
  let s = e;
  let a = [];
  for (let { key, schema } of MCP_SERVER_LIST_SETTINGS) {
    if (!(key in s)) continue;
    if (!Array.isArray(s[key])) {
      if (r?.keepWholeFieldInvalid) continue;
      let h = s[key];
      delete s[key];
      a.push({
        file,
        path: key,
        message: `"${key}" must be an array; received ${getReceivedType(h)}. This field was ignored.`,
        severity: "warning",
        invalidValue: h,
      });
      continue;
    }
    let m = s[key];
    let f = [];
    for (let j = 0; j < m.length; j++) {
      let y = schema().safeParse(m[j]);
      if (y.success) f.push(m[j]);
      else
        a.push({
          file,
          path: `${key}[${j}]`,
          message: `Invalid entry was ignored: ${y.error.issues[0]?.message ?? "failed validation"}`,
          severity: "warning",
          invalidValue: m[j],
        });
    }
    if (f.length < m.length) s[key] = f;
  }
  return a;
}
//@ chunk-dcmhvw5a.js:446986-447043 placement
var MARKETPLACE_LIST_SETTINGS = ["strictKnownMarketplaces", "blockedMarketplaces"];
//@ chunk-dcmhvw5a.js:447043-447119 placement
function dropNullRestrictionKeys(e) {
  if (!isPlainObject_2(e)) return;
  for (let n of RESTRICTIVE_TOP_LEVEL_SETTINGS()) if (e[n] === null) delete e[n];
}
//@ chunk-dcmhvw5a.js:447119-447791 placement
/**
 * 校验权限规则列表（逐条解析）。
 */
function validatePermissionRuleLists(e, file, marketplacePatternIndexMapOut) {
  if (!isPlainObject_2(e)) return [];
  let s = [];
  for (let a of MARKETPLACE_LIST_SETTINGS) {
    let c = e[a];
    if (!Array.isArray(c)) continue;
    let g = [];
    let m = [];
    for (let j = 0; j < c.length; j++) {
      let h = MarketplaceSourceStrictSchema().safeParse(c[j]);
      if (!h.success) {
        g.push(c[j]);
        m.push(j);
        continue;
      }
      let unenforceableMarketplaceReason = getUnenforceableMarketplaceReason(h.data);
      if (unenforceableMarketplaceReason === null) {
        g.push(c[j]);
        m.push(j);
        continue;
      }
      if (a === "blockedMarketplaces") {
        g.push(c[j]);
        m.push(j);
        s.push({
          file,
          path: `${a}[${j}]`,
          message: `Unenforceable entry was kept: ${unenforceableMarketplaceReason}; it can never match a marketplace source, but marketplace restrictions stay active`,
          severity: "warning",
        });
        continue;
      }
      s.push({
        file,
        path: `${a}[${j}]`,
        message: `Invalid entry was ignored: ${unenforceableMarketplaceReason}`,
        severity: "warning",
      });
    }
    if (g.length < c.length) {
      e[a] = g;
      marketplacePatternIndexMapOut?.set(a, m);
    }
  }
  return s;
}
//@ chunk-dcmhvw5a.js:447791-448291 placement
/**
 * 收集权限规则的警告。
 */
function collectRuleWarnings(e) {
  if (!isPlainObject_2(e)) return [];
  let n = [];
  for (let r of MARKETPLACE_LIST_SETTINGS) {
    let s = e[r];
    if (!Array.isArray(s)) continue;
    for (let [a, c] of s.entries()) {
      let g = MarketplaceSourceStrictSchema().safeParse(c);
      if (!g.success) continue;
      let unenforceableMarketplaceReason = getUnenforceableMarketplaceReason(g.data);
      if (unenforceableMarketplaceReason !== null)
        n.push(
          `${r}[${a}]: ${unenforceableMarketplaceReason} \u2014 on policy tiers (managed settings) ${r === "blockedMarketplaces" ? "clients keep it with a warning, but it can never match, so it blocks nothing" : "clients silently strip it at load"}; in user/project/local files the key is inert; fix or remove the entry`,
        );
    }
  }
  return n;
}
//@ chunk-dcmhvw5a.js:448291-448439 placement
function remapIssuePath(path, n) {
  let r = path[0];
  let s = path[1];
  if (typeof r !== "string" || typeof s !== "number") return path;
  let a = n.get(r)?.[s];
  return a === undefined ? path : [r, a, ...path.slice(2)];
}
//@ chunk-dcmhvw5a.js:448439-448762 placement
/**
 * 校验 managedMcpServers。
 */
function validateManagedMcpServers(e, file) {
  if (!isPlainObject_2(e) || e.managedMcpServers === undefined) return [];
  let s = [];
  let managedMcpServers = parseManagedMcpServers(e.managedMcpServers, (c, g) =>
    s.push({
      file,
      path: c ? `managedMcpServers.${c}` : "managedMcpServers",
      message: c ? `Managed MCP server was ignored: ${g}` : g,
      severity: "warning",
    }),
  );
  if (managedMcpServers === undefined) delete e.managedMcpServers;
  else e.managedMcpServers = managedMcpServers;
  return s;
}
//@ chunk-dcmhvw5a.js:448762-448911 placement
function marketplaceSourceType(e) {
  if (!e || typeof e !== "object") return;
  let source = e.source;
  if (!source || typeof source !== "object") return;
  let source_2 = source.source;
  return typeof source_2 === "string" ? source_2 : undefined;
}
//@ chunk-dcmhvw5a.js:448911-449065 placement
function hasUnknownPluginSourceType(e) {
  if (!e || typeof e !== "object") return false;
  let source = e.source;
  if (!source || typeof source !== "object") return false;
  let plugins = source.plugins;
  return Array.isArray(plugins) && plugins.some(hasUnknownSourceType);
}
//@ chunk-dcmhvw5a.js:449065-449182 placement
function settingsMarketplaceName(e) {
  let source = isPlainObject_2(e) ? e.source : undefined;
  return isPlainObject_2(source) && source.source === "settings" && typeof source.name === "string"
    ? source.name
    : undefined;
}
//@ chunk-dcmhvw5a.js:449182-450456 placement
/**
 * 校验 extraKnownMarketplaces。
 */
function validateExtraMarketplaces(e, file) {
  if (!e || typeof e !== "object") return [];
  let r = e;
  let s = "extraKnownMarketplaces";
  if (!(s in r)) return [];
  let a = r[s];
  if (!a || typeof a !== "object" || Array.isArray(a)) {
    let receivedType = getReceivedType(a);
    delete r[s];
    return [
      {
        file,
        path: s,
        message: `"${s}" must be an object mapping marketplace names to declarations; received ${receivedType}. This field was ignored.`,
        severity: "warning",
        invalidValue: receivedType,
      },
    ];
  }
  let c = a;
  let g = [];
  for (let key of Object.keys(c)) {
    let f = agentsSettingsSchema().safeParse(c[key]);
    let h;
    let y = false;
    if (!f.success) {
      let b = marketplaceSourceType(c[key]);
      if ((b !== undefined && !POLICY_SOURCE_TYPES.has(b)) || hasUnknownPluginSourceType(c[key])) continue;
      h = formatZodIssuesBrief(f.error.issues);
      {
        let S = settingsMarketplaceName(c[key]);
        y =
          f.error.issues.every((issue) => issue.message === IMPERSONATION_ERROR_MESSAGE) &&
          S === key &&
          isAsciiImpersonatingOfficialName(S);
      }
    } else if (f.data.source.source === "settings" && f.data.source.name !== key)
      h = `key "${redactIssuePathKey(key)}" must match the settings source name "${redactIssuePathKey(f.data.source.name)}"`;
    if (h !== undefined) {
      g.push({
        file,
        path: `${s}.${redactIssuePathKey(key)}`,
        message: y
          ? "Marketplace entry was ignored: its name reads like an official Anthropic or Claude marketplace. It stays in this file: rename it (the key and the source's name) to use it, or delete it. If /plugin also shows a marketplace of this name as refused, remove that one in /plugin \u2192 Marketplaces once this entry is renamed or deleted."
          : `Invalid marketplace entry was ignored: ${h}`,
        severity: "warning",
        ...(y && {
          preserveOnWrite: true,
        }),
      });
      delete c[key];
    }
  }
  return g;
}
//@ chunk-dcmhvw5a.js:450456-451570 placement
/**
 * 校验 modelPicker 设置。
 */
function validateModelPicker(e, file) {
  if (!e || typeof e !== "object") return [];
  let r = e;
  let s = "modelPicker";
  if (!(s in r)) return [];
  let a = r[s];
  if (!isPlainObject_2(a) || !Array.isArray(a.options)) {
    let f = isPlainObject_2(a) ? `options: ${getReceivedType(a.options)}` : getReceivedType(a);
    delete r[s];
    return [
      {
        file,
        path: s,
        message: `"${s}" must be an object with an "options" array of { model, label?, description?, behavesAs? } rows; received ${f}. This field was ignored.`,
        severity: "warning",
        invalidValue: f,
      },
    ];
  }
  let c = [];
  if ("replaceBuiltInOptions" in a && typeof a.replaceBuiltInOptions !== "boolean") {
    let receivedType = getReceivedType(a.replaceBuiltInOptions);
    delete a.replaceBuiltInOptions;
    c.push({
      file,
      path: `${s}.replaceBuiltInOptions`,
      message: `"replaceBuiltInOptions" must be true or false; received ${receivedType}. This entry was ignored (the rows are added to the built-in lineup).`,
      severity: "warning",
      invalidValue: receivedType,
    });
  }
  let options = a.options;
  let m = [];
  for (let j = 0; j < options.length; j++) {
    let h = outputStylesSettingsSchema().safeParse(options[j]);
    if (h.success) {
      m.push(options[j]);
      continue;
    }
    c.push({
      file,
      path: `${s}.options.${j}`,
      message: `${modelPickerIssueText(h.error.issues[0])}. This row was ignored; the other rows still apply.`,
      severity: "warning",
      invalidValue: getReceivedType(options[j]),
    });
  }
  if (m.length !== options.length) a.options = m;
  return c;
}
//@ chunk-dcmhvw5a.js:451570-452878 placement
/**
 * 校验 modelPricing 设置。
 */
function validateModelPricing(e, file) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return [];
  let r = e;
  if (!("modelPricing" in r) || r.modelPricing === undefined) return [];
  let modelPricing = r.modelPricing;
  if (!modelPricing || typeof modelPricing !== "object" || Array.isArray(modelPricing)) {
    delete r.modelPricing;
    return [
      {
        file,
        path: "modelPricing",
        message: `"modelPricing" must be an object; received ${getReceivedType(modelPricing)}. It was ignored.`,
        severity: "warning",
      },
    ];
  }
  let a = modelPricing;
  let c = [];
  if (a.multiplier !== undefined && !mcpSettingsSchema().safeParse(a.multiplier).success) {
    c.push({
      file,
      path: "modelPricing.multiplier",
      message: '"multiplier" must be a number greater than 0 and at most 10. It was ignored.',
      severity: "warning",
      invalidValue: a.multiplier,
    });
    delete a.multiplier;
  }
  if (a.overrides !== undefined) {
    let overrides = a.overrides;
    if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
      c.push({
        file,
        path: "modelPricing.overrides",
        message: `"overrides" must be an object mapping model ID to rates; received ${getReceivedType(overrides)}. It was ignored.`,
        severity: "warning",
      });
      delete a.overrides;
    } else {
      let m = overrides;
      for (let key of Object.keys(m)) {
        let h = hooksSettingsSchema().safeParse(m[key]);
        if (h.success && key !== "constructor" && key !== "__proto__") continue;
        let y = h.success ? undefined : h.error.issues[0];
        c.push({
          file,
          path: `modelPricing.overrides.${redactIssuePathKey(key)}`,
          message: `Invalid pricing row was ignored (${y ? `${y.path.join(".") || "row"}: ${y.message}` : "not a model ID"}).`,
          severity: "warning",
          invalidValue: m[key],
        });
        delete m[key];
      }
    }
  }
  return c;
}
//@ chunk-dcmhvw5a.js:452878-453021 placement
function modelPickerIssueText(e) {
  if (!e) return "Invalid modelPicker row";
  return `modelPicker row ${e.path.length > 0 ? `"${e.path.join(".")}" ` : ""}${e.message}`.trim();
}
//@ chunk-dcmhvw5a.js:453021-453277 placement
function sanitizeCrossSessionInbound(e, file, r) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return [];
  let s = e;
  let crossSessionInbound = s.crossSessionInbound;
  if (crossSessionInbound === undefined || isKnownHookEvent(crossSessionInbound)) return [];
  if (r?.policySource) s.crossSessionInbound = "refuse";
  else delete s.crossSessionInbound;
  return [unknownValueWarning(crossSessionInbound, file, r?.policySource === true)];
}
//@ chunk-dcmhvw5a.js:453277-453336 placement
function isKnownHookEvent(crossSessionInbound) {
  return typeof crossSessionInbound === "string" && POLICY_HELPER_ON_FAILURE.includes(crossSessionInbound);
}
//@ chunk-dcmhvw5a.js:453336-453366 placement
var CROSSSESSIONINBOUND = "crossSessionInbound";
//@ chunk-dcmhvw5a.js:453366-453467 placement
/**
 * 校验 crossSessionInbound 设置值，不合法时返回错误说明。
 */
function crossSessionInboundError(e) {
  if (!isPlainObject_2(e)) return;
  let crossSessionInbound = e.crossSessionInbound;
  if (crossSessionInbound === undefined || isKnownHookEvent(crossSessionInbound)) return;
  return crossSessionInboundExpected(crossSessionInbound);
}
//@ chunk-dcmhvw5a.js:453467-453685 placement
/**
 * 校验 strictPluginOnlyCustomization 设置（布尔或数组），不合法时返回错误说明。
 */
function strictPluginOnlyCustomizationError(e) {
  if (!isPlainObject_2(e)) return;
  let strictPluginOnlyCustomization = e.strictPluginOnlyCustomization;
  if (
    strictPluginOnlyCustomization === undefined ||
    strictPluginOnlyCustomization === null ||
    typeof strictPluginOnlyCustomization === "boolean" ||
    Array.isArray(strictPluginOnlyCustomization)
  )
    return;
  return `must be true, false, or an array of surface names; received ${getReceivedType(strictPluginOnlyCustomization)}`;
}
//@ chunk-dcmhvw5a.js:453685-454139 placement
/**
 * 校验 allowedProviders。
 */
function validateAllowedProviders(e) {
  if (!isPlainObject_2(e)) return;
  let allowedProviders = e.allowedProviders;
  if (allowedProviders === undefined) return;
  if (!Array.isArray(allowedProviders))
    return `must be an array of provider names; received ${getReceivedType(allowedProviders)}`;
  let found = allowedProviders.find((allowedProvider) => typeof allowedProvider !== "string");
  if (found !== undefined)
    return `entries must be provider names (strings); received ${getReceivedType(found)}`;
  let filtered = allowedProviders.filter((allowedProvider) => !isAnthropicProviderId(allowedProvider));
  return filtered.length === 0
    ? undefined
    : `unknown provider ${plural(filtered.length, "name")} ${filtered.map((a) => JSON.stringify(a)).join(", ")}; known names: ${API_PROVIDER_KINDS.join(", ")}`;
}
//@ chunk-dcmhvw5a.js:454139-454274 placement
function copyAllowedProviders(e, n) {
  if (!isPlainObject_2(e) || !Array.isArray(e.allowedProviders)) return;
  Object.assign(n, {
    allowedProviders: e.allowedProviders.filter(isAnthropicProviderId),
  });
}
//@ chunk-dcmhvw5a.js:454274-454442 placement
function crossSessionInboundExpected(e) {
  let joined = POLICY_HELPER_ON_FAILURE.map((s) => `"${s}"`).join(", ");
  let r =
    typeof e === "string" ? `"${redactIssuePathKey(e).replace(/^<key>$/, "<value>")}"` : getReceivedType(e);
  return `must be one of ${joined}; received ${r}`;
}
//@ chunk-dcmhvw5a.js:454442-454970 placement
/**
 * 无法识别的取值的警告（托管设置视为拒绝）。
 */
function unknownValueWarning(crossSessionInbound, file, r = false) {
  let expected = POLICY_HELPER_ON_FAILURE.map((c) => `"${c}"`).join(", ");
  let a = r
    ? 'In managed settings an unrecognized value is treated as "refuse" (the most restrictive): cross-session messages to this session are turned away until an administrator fixes it.'
    : "This value was ignored; while it is present, cross-session messages are held for your approval instead of being delivered. Set it to one of the values above.";
  return {
    file,
    path: CROSSSESSIONINBOUND,
    message: `"crossSessionInbound" ${crossSessionInboundExpected(crossSessionInbound)}. ${a}`,
    severity: "warning",
    expected,
    ...(r && {
      statusOnly: true,
    }),
  };
}
//@ chunk-dcmhvw5a.js:454970-455011 placement
var REMOTECONTROL_SHAREHOSTPROFILE = "remoteControl.shareHostProfile";
//@ chunk-dcmhvw5a.js:455011-456257 placement
/**
 * 校验 remoteControl 设置。
 */
function validateRemoteControlSetting(e, file, r) {
  if (!isPlainObject_2(e) || e.remoteControl === undefined) return [];
  let s = r?.policySource === true;
  let joined = POLICY_HELPER_LOG_LEVELS.map((S) => `"${S}"`).join(", ");
  let c = s
    ? 'In managed settings this is treated as "off" (the most restrictive): Remote Control environments report nothing about this machine until an administrator fixes it.'
    : "While it is present, Remote Control environments report nothing about this machine.";
  let g = (S) => ({
    file,
    path: REMOTECONTROL_SHAREHOSTPROFILE,
    message: `${S}. ${c}`,
    severity: "warning",
    expected: joined,
    ...(s
      ? {
          statusOnly: true,
        }
      : {
          preserveOnWrite: true,
        }),
  });
  let m = (S) =>
    typeof S === "string" ? `"${redactIssuePathKey(S).replace(/^<key>$/, "<value>")}"` : getReceivedType(S);
  let remoteControl = e.remoteControl;
  if (!isPlainObject_2(remoteControl)) {
    if (s)
      e.remoteControl = {
        shareHostProfile: "off",
      };
    else delete e.remoteControl;
    return [
      g(
        `"remoteControl" must be an object like { "shareHostProfile": ${joined.replace(/, /g, " | ")} }; received ${m(remoteControl)}`,
      ),
    ];
  }
  let h = [];
  let filtered = Object.keys(remoteControl).filter((key) => key !== "shareHostProfile");
  if (filtered.length > 0) {
    if (s) remoteControl.shareHostProfile = "off";
    h.push(
      g(
        `"remoteControl" has an unrecognized key ${filtered.map((S) => `"${redactIssuePathKey(S)}"`).join(", ")} (its only key is "shareHostProfile")`,
      ),
    );
  }
  let shareHostProfile = remoteControl.shareHostProfile;
  if (
    shareHostProfile !== undefined &&
    !(typeof shareHostProfile === "string" && POLICY_HELPER_LOG_LEVELS.includes(shareHostProfile))
  ) {
    if (s) remoteControl.shareHostProfile = "off";
    else delete remoteControl.shareHostProfile;
    h.push(
      g(`"${REMOTECONTROL_SHAREHOSTPROFILE}" must be one of ${joined}; received ${m(shareHostProfile)}`),
    );
  }
  return h;
}
//@ chunk-dcmhvw5a.js:456257-456337 placement
var MCP_SERVER_ENABLED_SETTINGS = ["enabledMcpjsonServers", "disabledMcpjsonServers"];
var MCP_SERVER_NAME_RE = /^[A-Za-z0-9_-]+$/;
//@ chunk-dcmhvw5a.js:456337-456442 placement
/**
 * 把应为数组的字符串设置包成数组。
 */
function coerceStringListSettings(e) {
  if (!isPlainObject_2(e)) return;
  for (let n of MCP_SERVER_ENABLED_SETTINGS) {
    let r = e[n];
    if (typeof r === "string" && MCP_SERVER_NAME_RE.test(r)) e[n] = [r];
  }
}
//@ chunk-dcmhvw5a.js:456442-456962 placement
/**
 * 校验整份设置文档（别名、hooks、规则等）。
 */
function validateSettingsDocument(e, file, r) {
  let s = [...applySettingAliases(e, file)];
  dropNullRestrictionKeys(e);
  if (!r?.policySource) coerceStringListSettings(e);
  s.push(
    ...filterInvalidPermissionRules(e, file, {
      policySource: r?.policySource,
      strictParseFollows: r?.mcpServerEntrySalvageOnly,
    }),
    ...validateHookOutputs(e, file),
    ...validateExtraMarketplaces(e, file),
    ...validateModelPicker(e, file),
    ...validateModelPricing(e, file),
    ...sanitizeCrossSessionInbound(e, file, {
      policySource: r?.policySource,
    }),
    ...validateRemoteControlSetting(e, file, {
      policySource: r?.policySource,
    }),
    ...(r?.skipMcpServerEntryFilter
      ? []
      : validateListSettings(e, file, {
          keepWholeFieldInvalid: r?.mcpServerEntrySalvageOnly,
        })),
    ...(r?.mcpServerEntrySalvageOnly ? validateManagedMcpServers(e, file) : []),
    ...(r?.mcpServerEntrySalvageOnly
      ? validatePermissionRuleLists(e, file, r.marketplacePatternIndexMapOut)
      : []),
  );
  return s;
}
export {
  collectRuleWarnings,
  crossSessionInboundError,
  strictPluginOnlyCustomizationError,
  validateAllowedProviders,
  REMOTECONTROL_SHAREHOSTPROFILE,
  coerceStringListSettings,
  CROSSSESSIONINBOUND,
  validateSettingsDocument,
  remapIssuePath,
  copyAllowedProviders,
};

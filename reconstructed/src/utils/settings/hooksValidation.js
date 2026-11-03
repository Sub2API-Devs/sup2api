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
  qn,
} from "../../schemas/hookEntryValidation.js";
import { getReceivedType, filterInvalidPermissionRules } from "./validation.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { Mu, plural } from "../stringUtils.js";
import { Co, wo, Ao, getUnenforceableMarketplaceReason, cs, gs, ps, us, rJt, mct } from "./types.js";
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
import { cn, API_PROVIDER_KINDS } from "../permissions/autoModeRulesPrompt.js";
import { applySettingAliases } from "./marketplaceSettingsAliases.js";

//@ chunk-dcmhvw5a.js:443201-443220 placement
var Lw = new Set(HOOK_EVENTS);
/**
 * 检查 hooks 中 PreToolUse/PermissionRequest 的配置问题。
 */
//@ chunk-dcmhvw5a.js:443220-443525 placement
function validateHookOutputs(e, n) {
  if (!e || typeof e !== "object") return [];
  return [
    ...(hasNestedHooks(e, OPAQUE_SETTING_KEYS)
      ? [
          {
            file: n,
            path: "hooks",
            message: `PreToolUse/PermissionRequest hooks are declared outside "hooks" (at the top level or under another key) \u2014 ${UNLOADABLE_GUARD_NOTE}.`,
            severity: "fatal",
            docLink: "https://code.claude.com/docs/en/hooks",
          },
        ]
      : []),
    ...validateHooksSettings(e, n),
  ];
}
/**
 * 校验设置中的 hooks 结构（事件、匹配器、命令）。
 */
//@ chunk-dcmhvw5a.js:443525-446258 placement
function validateHooksSettings(e, n) {
  if (!("hooks" in e)) return [];
  if (e.hooks === null || typeof e.hooks !== "object" || Array.isArray(e.hooks)) {
    let a = getReceivedType(e.hooks);
    if (Array.isArray(e.hooks) && (e.hooks.some(isPlainObject_2) || hasGuardHooks_2(e.hooks)))
      return [
        {
          file: n,
          path: "hooks",
          message: `"hooks" must be an object mapping event names to matcher arrays; received ${a} \u2014 ${UNLOADABLE_GUARD_NOTE}.`,
          invalidValue: a,
          docLink: "https://code.claude.com/docs/en/hooks",
        },
      ];
    return (
      delete e.hooks,
      [
        {
          file: n,
          path: "hooks",
          message: `"hooks" must be an object mapping event names to matcher arrays; received ${a}. This field was ignored.`,
          severity: "warning",
          invalidValue: a,
          docLink: "https://code.claude.com/docs/en/hooks",
        },
      ]
    );
  }
  let hooks = e.hooks;
  if (looksLikeHookMatcher(hooks))
    return [
      {
        file: n,
        path: "hooks",
        message: `"hooks" must be an object mapping event names to matcher arrays; received a single matcher \u2014 ${UNLOADABLE_GUARD_NOTE}.`,
        docLink: "https://code.claude.com/docs/en/hooks",
      },
    ];
  let s = [];
  for (let a of Object.keys(hooks)) {
    let c = Mu(a);
    if (!Lw.has(a)) {
      if (containsHooks(hooks[a], 3, { matchersCount: !Array.isArray(hooks[a]) })) {
        s.push({
          file: n,
          path: `hooks.${c}`,
          message: `"${c}" is not a hook event, but it holds PreToolUse/PermissionRequest hooks \u2014 ${UNLOADABLE_GUARD_NOTE}.`,
          docLink: "https://code.claude.com/docs/en/hooks",
        });
        continue;
      }
      (delete hooks[a],
        s.push({
          file: n,
          path: `hooks.${c}`,
          message: `Unknown hook event "${c}" was ignored. Valid events: ${HOOK_EVENTS.join(", ")}`,
          severity: "warning",
          invalidValue: c,
          docLink: "https://code.claude.com/docs/en/hooks",
          preserveOnWrite: !0,
        }));
      continue;
    }
    if (!Array.isArray(hooks[a])) {
      let g = hooks[a],
        m = getReceivedType(g);
      if ((GUARD_HOOK_EVENTS.has(a) && g !== null) || containsHooks(g, 3, { matchersCount: !1 })) {
        s.push({
          file: n,
          path: `hooks.${c}`,
          message: `Hook event "${c}" must be an array of matchers; received ${m} \u2014 ${UNLOADABLE_GUARD_NOTE}.`,
          invalidValue: m,
          docLink: "https://code.claude.com/docs/en/hooks",
        });
        continue;
      }
      (delete hooks[a],
        s.push({
          file: n,
          path: `hooks.${c}`,
          message: `Hook event "${c}" must be an array of matchers; received ${m}. This entry was ignored.`,
          severity: "warning",
          invalidValue: m,
          docLink: "https://code.claude.com/docs/en/hooks",
          ...(g !== null && { preserveOnWrite: !0 }),
        }));
    }
  }
  for (let [a, c] of Object.entries(hooks)) {
    let { stripped: stripped, unloadableGuards: unloadableGuards } = stripInvalidHookEntries(c, a);
    for (let f of unloadableGuards)
      s.push({
        file: n,
        path: f.aboutType ? `hooks.${a}.${f.path}.type` : `hooks.${a}.${f.path}`,
        message: `${f.problem} \u2014 ${UNLOADABLE_GUARD_NOTE}.${f.aboutType ? ` Valid types: ${[...qn()].join(", ")}` : ""}`,
        severity: "fatal",
        invalidValue: f.received,
        docLink: "https://code.claude.com/docs/en/hooks",
      });
    for (let f of stripped)
      s.push({
        file: n,
        path: f.aboutType ? `hooks.${a}.${f.path}.type` : `hooks.${a}.${f.path}`,
        message: f.aboutType
          ? `${f.problem}; entry ignored. Valid types: ${[...qn()].join(", ")}`
          : `${f.problem}; ${f.hookIndex === void 0 ? "matcher" : "entry"} ignored.`,
        severity: "warning",
        invalidValue: f.received,
        docLink: "https://code.claude.com/docs/en/hooks",
        preserveOnWrite: !0,
      });
  }
  if (s.length > 0 && Object.keys(hooks).length === 0) delete e.hooks;
  return s;
}
//@ chunk-dcmhvw5a.js:446258-446338 placement
var Hw = [
  { key: "allowedMcpServers", schema: Co },
  { key: "deniedMcpServers", schema: wo },
];
/**
 * 按 schema 校验列表类设置项。
 */
//@ chunk-dcmhvw5a.js:446338-446986 placement
function validateListSettings(e, n, r) {
  if (!e || typeof e !== "object") return [];
  let s = e,
    a = [];
  for (let { key: key, schema: schema } of Hw) {
    if (!(key in s)) continue;
    if (!Array.isArray(s[key])) {
      if (r?.keepWholeFieldInvalid) continue;
      let h = s[key];
      (delete s[key],
        a.push({
          file: n,
          path: key,
          message: `"${key}" must be an array; received ${getReceivedType(h)}. This field was ignored.`,
          severity: "warning",
          invalidValue: h,
        }));
      continue;
    }
    let m = s[key],
      f = [];
    for (let h = 0; h < m.length; h++) {
      let safeParse = schema().safeParse(m[h]);
      if (safeParse.success) f.push(m[h]);
      else
        a.push({
          file: n,
          path: `${key}[${h}]`,
          message: `Invalid entry was ignored: ${safeParse.error.issues[0]?.message ?? "failed validation"}`,
          severity: "warning",
          invalidValue: m[h],
        });
    }
    if (f.length < m.length) s[key] = f;
  }
  return a;
}
//@ chunk-dcmhvw5a.js:446986-447043 placement
var Yp = ["strictKnownMarketplaces", "blockedMarketplaces"];
//@ chunk-dcmhvw5a.js:447043-447119 placement
function Fw(e) {
  if (!isPlainObject_2(e)) return;
  for (let n of Ao()) if (e[n] === null) delete e[n];
}
/**
 * 校验权限规则列表（逐条解析）。
 */
//@ chunk-dcmhvw5a.js:447119-447791 placement
function validatePermissionRuleLists(e, n, r) {
  if (!isPlainObject_2(e)) return [];
  let s = [];
  for (let a of Yp) {
    let c = e[a];
    if (!Array.isArray(c)) continue;
    let g = [],
      m = [];
    for (let f = 0; f < c.length; f++) {
      let safeParse = MarketplaceSourceStrictSchema().safeParse(c[f]);
      if (!safeParse.success) {
        (g.push(c[f]), m.push(f));
        continue;
      }
      let y = getUnenforceableMarketplaceReason(safeParse.data);
      if (y === null) {
        (g.push(c[f]), m.push(f));
        continue;
      }
      if (a === "blockedMarketplaces") {
        (g.push(c[f]),
          m.push(f),
          s.push({
            file: n,
            path: `${a}[${f}]`,
            message: `Unenforceable entry was kept: ${y}; it can never match a marketplace source, but marketplace restrictions stay active`,
            severity: "warning",
          }));
        continue;
      }
      s.push({
        file: n,
        path: `${a}[${f}]`,
        message: `Invalid entry was ignored: ${y}`,
        severity: "warning",
      });
    }
    if (g.length < c.length) ((e[a] = g), r?.set(a, m));
  }
  return s;
}
/**
 * 收集权限规则的警告。
 */
//@ chunk-dcmhvw5a.js:447791-448291 placement
function collectRuleWarnings(e) {
  if (!isPlainObject_2(e)) return [];
  let n = [];
  for (let r of Yp) {
    let s = e[r];
    if (!Array.isArray(s)) continue;
    for (let [a, c] of s.entries()) {
      let safeParse = MarketplaceSourceStrictSchema().safeParse(c);
      if (!safeParse.success) continue;
      let m = getUnenforceableMarketplaceReason(safeParse.data);
      if (m !== null)
        n.push(
          `${r}[${a}]: ${m} \u2014 on policy tiers (managed settings) ${r === "blockedMarketplaces" ? "clients keep it with a warning, but it can never match, so it blocks nothing" : "clients silently strip it at load"}; in user/project/local files the key is inert; fix or remove the entry`,
        );
    }
  }
  return n;
}
//@ chunk-dcmhvw5a.js:448291-448439 placement
function remapIssuePath(e, n) {
  let r = e[0],
    s = e[1];
  if (typeof r !== "string" || typeof s !== "number") return e;
  let a = n.get(r)?.[s];
  return a === void 0 ? e : [r, a, ...e.slice(2)];
}
/**
 * 校验 managedMcpServers。
 */
//@ chunk-dcmhvw5a.js:448439-448762 placement
function validateManagedMcpServers(e, n) {
  if (!isPlainObject_2(e) || e.managedMcpServers === void 0) return [];
  let s = [],
    a = parseManagedMcpServers(e.managedMcpServers, (c, g) =>
      s.push({
        file: n,
        path: c ? `managedMcpServers.${c}` : "managedMcpServers",
        message: c ? `Managed MCP server was ignored: ${g}` : g,
        severity: "warning",
      }),
    );
  if (a === void 0) delete e.managedMcpServers;
  else e.managedMcpServers = a;
  return s;
}
//@ chunk-dcmhvw5a.js:448762-448911 placement
function marketplaceSourceType(e) {
  if (!e || typeof e !== "object") return;
  let source = e.source;
  if (!source || typeof source !== "object") return;
  let source_2 = source.source;
  return typeof source_2 === "string" ? source_2 : void 0;
}
//@ chunk-dcmhvw5a.js:448911-449065 placement
function hasUnknownPluginSourceType(e) {
  if (!e || typeof e !== "object") return !1;
  let source = e.source;
  if (!source || typeof source !== "object") return !1;
  let plugins = source.plugins;
  return Array.isArray(plugins) && plugins.some(hasUnknownSourceType);
}
//@ chunk-dcmhvw5a.js:449065-449182 placement
function settingsMarketplaceName(e) {
  let n = isPlainObject_2(e) ? e.source : void 0;
  return isPlainObject_2(n) && n.source === "settings" && typeof n.name === "string" ? n.name : void 0;
}
/**
 * 校验 extraKnownMarketplaces。
 */
//@ chunk-dcmhvw5a.js:449182-450456 placement
function validateExtraMarketplaces(e, n) {
  if (!e || typeof e !== "object") return [];
  let r = e,
    s = "extraKnownMarketplaces";
  if (!(s in r)) return [];
  let a = r[s];
  if (!a || typeof a !== "object" || Array.isArray(a)) {
    let m = getReceivedType(a);
    return (
      delete r[s],
      [
        {
          file: n,
          path: s,
          message: `"${s}" must be an object mapping marketplace names to declarations; received ${m}. This field was ignored.`,
          severity: "warning",
          invalidValue: m,
        },
      ]
    );
  }
  let c = a,
    g = [];
  for (let m of Object.keys(c)) {
    let safeParse = cs().safeParse(c[m]),
      h,
      y = !1;
    if (!safeParse.success) {
      let b = marketplaceSourceType(c[m]);
      if ((b !== void 0 && !POLICY_SOURCE_TYPES.has(b)) || hasUnknownPluginSourceType(c[m])) continue;
      h = formatZodIssuesBrief(safeParse.error.issues);
      {
        let S = settingsMarketplaceName(c[m]);
        y =
          safeParse.error.issues.every((issue) => issue.message === IMPERSONATION_ERROR_MESSAGE) &&
          S === m &&
          isAsciiImpersonatingOfficialName(S);
      }
    } else if (safeParse.data.source.source === "settings" && safeParse.data.source.name !== m)
      h = `key "${redactIssuePathKey(m)}" must match the settings source name "${redactIssuePathKey(safeParse.data.source.name)}"`;
    if (h !== void 0)
      (g.push({
        file: n,
        path: `${s}.${redactIssuePathKey(m)}`,
        message: y
          ? "Marketplace entry was ignored: its name reads like an official Anthropic or Claude marketplace. It stays in this file: rename it (the key and the source's name) to use it, or delete it. If /plugin also shows a marketplace of this name as refused, remove that one in /plugin \u2192 Marketplaces once this entry is renamed or deleted."
          : `Invalid marketplace entry was ignored: ${h}`,
        severity: "warning",
        ...(y && { preserveOnWrite: !0 }),
      }),
        delete c[m]);
  }
  return g;
}
/**
 * 校验 modelPicker 设置。
 */
//@ chunk-dcmhvw5a.js:450456-451570 placement
function validateModelPicker(e, n) {
  if (!e || typeof e !== "object") return [];
  let r = e,
    s = "modelPicker";
  if (!(s in r)) return [];
  let a = r[s];
  if (!isPlainObject_2(a) || !Array.isArray(a.options)) {
    let f = isPlainObject_2(a) ? `options: ${getReceivedType(a.options)}` : getReceivedType(a);
    return (
      delete r[s],
      [
        {
          file: n,
          path: s,
          message: `"${s}" must be an object with an "options" array of { model, label?, description?, behavesAs? } rows; received ${f}. This field was ignored.`,
          severity: "warning",
          invalidValue: f,
        },
      ]
    );
  }
  let c = [];
  if ("replaceBuiltInOptions" in a && typeof a.replaceBuiltInOptions !== "boolean") {
    let f = getReceivedType(a.replaceBuiltInOptions);
    (delete a.replaceBuiltInOptions,
      c.push({
        file: n,
        path: `${s}.replaceBuiltInOptions`,
        message: `"replaceBuiltInOptions" must be true or false; received ${f}. This entry was ignored (the rows are added to the built-in lineup).`,
        severity: "warning",
        invalidValue: f,
      }));
  }
  let options = a.options,
    m = [];
  for (let f = 0; f < options.length; f++) {
    let safeParse = gs().safeParse(options[f]);
    if (safeParse.success) {
      m.push(options[f]);
      continue;
    }
    c.push({
      file: n,
      path: `${s}.options.${f}`,
      message: `${modelPickerIssueText(safeParse.error.issues[0])}. This row was ignored; the other rows still apply.`,
      severity: "warning",
      invalidValue: getReceivedType(options[f]),
    });
  }
  if (m.length !== options.length) a.options = m;
  return c;
}
/**
 * 校验 modelPricing 设置。
 */
//@ chunk-dcmhvw5a.js:451570-452878 placement
function validateModelPricing(e, n) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return [];
  let r = e;
  if (!("modelPricing" in r) || r.modelPricing === void 0) return [];
  let modelPricing = r.modelPricing;
  if (!modelPricing || typeof modelPricing !== "object" || Array.isArray(modelPricing))
    return (
      delete r.modelPricing,
      [
        {
          file: n,
          path: "modelPricing",
          message: `"modelPricing" must be an object; received ${getReceivedType(modelPricing)}. It was ignored.`,
          severity: "warning",
        },
      ]
    );
  let a = modelPricing,
    c = [];
  if (a.multiplier !== void 0 && !ps().safeParse(a.multiplier).success)
    (c.push({
      file: n,
      path: "modelPricing.multiplier",
      message: '"multiplier" must be a number greater than 0 and at most 10. It was ignored.',
      severity: "warning",
      invalidValue: a.multiplier,
    }),
      delete a.multiplier);
  if (a.overrides !== void 0) {
    let overrides = a.overrides;
    if (!overrides || typeof overrides !== "object" || Array.isArray(overrides))
      (c.push({
        file: n,
        path: "modelPricing.overrides",
        message: `"overrides" must be an object mapping model ID to rates; received ${getReceivedType(overrides)}. It was ignored.`,
        severity: "warning",
      }),
        delete a.overrides);
    else {
      let m = overrides;
      for (let f of Object.keys(m)) {
        let safeParse = us().safeParse(m[f]);
        if (safeParse.success && f !== "constructor" && f !== "__proto__") continue;
        let y = safeParse.success ? void 0 : safeParse.error.issues[0];
        (c.push({
          file: n,
          path: `modelPricing.overrides.${redactIssuePathKey(f)}`,
          message: `Invalid pricing row was ignored (${y ? `${y.path.join(".") || "row"}: ${y.message}` : "not a model ID"}).`,
          severity: "warning",
          invalidValue: m[f],
        }),
          delete m[f]);
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
function sanitizeCrossSessionInbound(e, n, r) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return [];
  let s = e,
    crossSessionInbound = s.crossSessionInbound;
  if (crossSessionInbound === void 0 || Xp(crossSessionInbound)) return [];
  if (r?.policySource) s.crossSessionInbound = "refuse";
  else delete s.crossSessionInbound;
  return [unknownValueWarning(crossSessionInbound, n, r?.policySource === !0)];
}
//@ chunk-dcmhvw5a.js:453277-453336 placement
function Xp(e) {
  return typeof e === "string" && rJt.includes(e);
}
//@ chunk-dcmhvw5a.js:453336-453366 placement
var CROSSSESSIONINBOUND = "crossSessionInbound";
/**
 * 校验 crossSessionInbound 设置值，不合法时返回错误说明。
 */
//@ chunk-dcmhvw5a.js:453366-453467 placement
function crossSessionInboundError(e) {
  if (!isPlainObject_2(e)) return;
  let crossSessionInbound = e.crossSessionInbound;
  if (crossSessionInbound === void 0 || Xp(crossSessionInbound)) return;
  return crossSessionInboundExpected(crossSessionInbound);
}
/**
 * 校验 strictPluginOnlyCustomization 设置（布尔或数组），不合法时返回错误说明。
 */
//@ chunk-dcmhvw5a.js:453467-453685 placement
function strictPluginOnlyCustomizationError(e) {
  if (!isPlainObject_2(e)) return;
  let strictPluginOnlyCustomization = e.strictPluginOnlyCustomization;
  if (
    strictPluginOnlyCustomization === void 0 ||
    strictPluginOnlyCustomization === null ||
    typeof strictPluginOnlyCustomization === "boolean" ||
    Array.isArray(strictPluginOnlyCustomization)
  )
    return;
  return `must be true, false, or an array of surface names; received ${getReceivedType(strictPluginOnlyCustomization)}`;
}
/**
 * 校验 allowedProviders。
 */
//@ chunk-dcmhvw5a.js:453685-454139 placement
function validateAllowedProviders(e) {
  if (!isPlainObject_2(e)) return;
  let allowedProviders = e.allowedProviders;
  if (allowedProviders === void 0) return;
  if (!Array.isArray(allowedProviders))
    return `must be an array of provider names; received ${getReceivedType(allowedProviders)}`;
  let found = allowedProviders.find((a) => typeof a !== "string");
  if (found !== void 0) return `entries must be provider names (strings); received ${getReceivedType(found)}`;
  let filtered = allowedProviders.filter((a) => !cn(a));
  return filtered.length === 0
    ? void 0
    : `unknown provider ${plural(filtered.length, "name")} ${filtered.map((a) => JSON.stringify(a)).join(", ")}; known names: ${API_PROVIDER_KINDS.join(", ")}`;
}
//@ chunk-dcmhvw5a.js:454139-454274 placement
function copyAllowedProviders(e, n) {
  if (!isPlainObject_2(e) || !Array.isArray(e.allowedProviders)) return;
  Object.assign(n, { allowedProviders: e.allowedProviders.filter(cn) });
}
//@ chunk-dcmhvw5a.js:454274-454442 placement
function crossSessionInboundExpected(e) {
  let joined = rJt.map((s) => `"${s}"`).join(", "),
    r =
      typeof e === "string" ? `"${redactIssuePathKey(e).replace(/^<key>$/, "<value>")}"` : getReceivedType(e);
  return `must be one of ${joined}; received ${r}`;
}
/**
 * 无法识别的取值的警告（托管设置视为拒绝）。
 */
//@ chunk-dcmhvw5a.js:454442-454970 placement
function unknownValueWarning(e, n, r = !1) {
  let joined = rJt.map((c) => `"${c}"`).join(", "),
    a = r
      ? 'In managed settings an unrecognized value is treated as "refuse" (the most restrictive): cross-session messages to this session are turned away until an administrator fixes it.'
      : "This value was ignored; while it is present, cross-session messages are held for your approval instead of being delivered. Set it to one of the values above.";
  return {
    file: n,
    path: CROSSSESSIONINBOUND,
    message: `"crossSessionInbound" ${crossSessionInboundExpected(e)}. ${a}`,
    severity: "warning",
    expected: joined,
    ...(r && { statusOnly: !0 }),
  };
}
//@ chunk-dcmhvw5a.js:454970-455011 placement
var REMOTECONTROL_SHAREHOSTPROFILE = "remoteControl.shareHostProfile";
/**
 * 校验 remoteControl 设置。
 */
//@ chunk-dcmhvw5a.js:455011-456257 placement
function validateRemoteControlSetting(e, n, r) {
  if (!isPlainObject_2(e) || e.remoteControl === void 0) return [];
  let s = r?.policySource === !0,
    joined = mct.map((S) => `"${S}"`).join(", "),
    c = s
      ? 'In managed settings this is treated as "off" (the most restrictive): Remote Control environments report nothing about this machine until an administrator fixes it.'
      : "While it is present, Remote Control environments report nothing about this machine.",
    g = (S) => ({
      file: n,
      path: REMOTECONTROL_SHAREHOSTPROFILE,
      message: `${S}. ${c}`,
      severity: "warning",
      expected: joined,
      ...(s ? { statusOnly: !0 } : { preserveOnWrite: !0 }),
    }),
    m = (S) =>
      typeof S === "string" ? `"${redactIssuePathKey(S).replace(/^<key>$/, "<value>")}"` : getReceivedType(S),
    remoteControl = e.remoteControl;
  if (!isPlainObject_2(remoteControl)) {
    if (s) e.remoteControl = { shareHostProfile: "off" };
    else delete e.remoteControl;
    return [
      g(
        `"remoteControl" must be an object like { "shareHostProfile": ${joined.replace(/, /g, " | ")} }; received ${m(remoteControl)}`,
      ),
    ];
  }
  let h = [],
    filtered = Object.keys(remoteControl).filter((S) => S !== "shareHostProfile");
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
    shareHostProfile !== void 0 &&
    !(typeof shareHostProfile === "string" && mct.includes(shareHostProfile))
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
var nA = ["enabledMcpjsonServers", "disabledMcpjsonServers"],
  lA = /^[A-Za-z0-9_-]+$/;
/**
 * 把应为数组的字符串设置包成数组。
 */
//@ chunk-dcmhvw5a.js:456337-456442 placement
function coerceStringListSettings(e) {
  if (!isPlainObject_2(e)) return;
  for (let n of nA) {
    let r = e[n];
    if (typeof r === "string" && lA.test(r)) e[n] = [r];
  }
}
/**
 * 校验整份设置文档（别名、hooks、规则等）。
 */
//@ chunk-dcmhvw5a.js:456442-456962 placement
function validateSettingsDocument(e, n, r) {
  let s = [...applySettingAliases(e, n)];
  if ((Fw(e), !r?.policySource)) coerceStringListSettings(e);
  return (
    s.push(
      ...filterInvalidPermissionRules(e, n, {
        policySource: r?.policySource,
        strictParseFollows: r?.mcpServerEntrySalvageOnly,
      }),
      ...validateHookOutputs(e, n),
      ...validateExtraMarketplaces(e, n),
      ...validateModelPicker(e, n),
      ...validateModelPricing(e, n),
      ...sanitizeCrossSessionInbound(e, n, { policySource: r?.policySource }),
      ...validateRemoteControlSetting(e, n, { policySource: r?.policySource }),
      ...(r?.skipMcpServerEntryFilter
        ? []
        : validateListSettings(e, n, { keepWholeFieldInvalid: r?.mcpServerEntrySalvageOnly })),
      ...(r?.mcpServerEntrySalvageOnly ? validateManagedMcpServers(e, n) : []),
      ...(r?.mcpServerEntrySalvageOnly
        ? validatePermissionRuleLists(e, n, r.marketplacePatternIndexMapOut)
        : []),
    ),
    s
  );
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

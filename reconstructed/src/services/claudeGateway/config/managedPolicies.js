/**
 * services/claudeGateway/config/managedPolicies.ts
 *
 * 2.1.316 新增：网关下发的托管策略
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (21)
 * attribution: placement 21
 */
import { readFile } from "fs/promises";
import { gatewayLog } from "../../gateway/gatewayBanner.js";
import {
  POLICY_HELPER_CONFIG_KEYS,
  hasEffectivePolicyContent,
} from "../../../utils/settings/policySettings.js";
import { isPlainObject as isPlainObject_3 } from "../../../utils/isPlainObject.js";
import { PATH_RULE_CARVE_OUT_RE } from "../../../utils/settings/permissionRuleCarveOut.js";
import {
  parseDesktopSettingsOverlay,
  checkCoworkEgressHosts,
  mergeDesktopToolPolicy,
} from "../desktopSettings.js";
import { GatewayConfigSchema } from "./schema.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isENOENT,
} from "../../../utils/errors.js";
import { computeChecksum } from "../../policyLimits/index.js";
import { readStringListField } from "./load.js";
import { jsonStringify, jsonParse } from "../../../utils/slowOperations.js";
import { uniq } from "../../../utils/collections.js";
import { resolveUpstreamModel, findPricingOverride, modelCanonicalKey } from "../models.js";
import { findModelConfigById } from "../../../utils/model/providerCaches.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { buildWholeSettingsSchema } from "../../../utils/settings/types.js";
import { enabledSettingsFeatureGroups } from "../../../utils/spellcheck.js";
import { applySettingAliases } from "../../../utils/settings/marketplaceSettingsAliases.js";
import { staticPayloadWarnings } from "../../../utils/settings/validation.js";
import {
  collectRuleWarnings,
  crossSessionInboundError,
  strictPluginOnlyCustomizationError,
  validateAllowedProviders,
} from "../../../utils/settings/hooksValidation.js";

//@ chunk-1ny7cxrt.js:1413940-1417430 placement
/**
 * 解析网关配置里的托管策略（含桌面版策略），生成下发给客户端的托管设置。
 */
async function resolveManagedPolicies(gatewayConfig) {
  let otelEnv = buildOtelEnv(gatewayConfig);
  let n = hasManagedPolicies(gatewayConfig.managed) ? buildPricingOverrides(gatewayConfig) : null;
  let managed = gatewayConfig.managed;
  let r;
  let s = [];
  if (managed?.policies) {
    let any = managed.policies.some((policy) => policy.desktop !== undefined);
    if (gatewayConfig.listen.public_url === undefined && any)
      gatewayLog(
        "warn",
        "managed.policies: listen.public_url is not set \u2014 origin-pin hygiene is skipped at boot, so an origin-pinned overlay value would be silently dropped by desktops",
      );
    let desktop = managed.policies.find((policy) => isCatchAllPolicyMatch(policy.match))?.desktop;
    let h = [];
    r = managed.policies.map((policy, y) => {
      let b = `managed.policies[${y}].${policy.underCode ? "code" : "cli"}`;
      let { cli, aliasIssues } = applyAliasesToSettings(policy.cli, b);
      try {
        validateManagedSettings(cli, b, aliasIssues);
      } catch (error) {
        h.push(error instanceof Error ? error.message : String(error));
      }
      if (managed.policy_mode === "layered") {
        for (let N of POLICY_HELPER_CONFIG_KEYS)
          if (cli[N] !== undefined)
            h.push(
              `${b}.${N} can't be used with policy_mode: layered. A policy helper's output replaces the settings served here or adds to them, so it could drop another matching policy's deny rules. Remove it, or remove policy_mode.`,
            );
        for (let N of isCatchAllPolicyMatch(policy.match) ? [] : HOOK_SETTING_KEYS)
          if (cli[N] !== undefined)
            h.push(
              `${b}.${N} can't be used in this policy with policy_mode: layered. It limits every hook that a person is served, so it could switch off another matching policy's hooks. Move it to a match: {} policy, or remove policy_mode.`,
            );
        let permissions = isPlainObject_3(cli.permissions) ? cli.permissions : {};
        for (let N of PERMISSION_LIST_KEYS) {
          let Z = permissions[N];
          for (let F of Array.isArray(Z) ? Z : [])
            if (typeof F === "string" && PATH_RULE_CARVE_OUT_RE.test(F))
              h.push(
                `${b}.permissions.${N}: "${F}" can't be used with policy_mode: layered. A rule whose path starts with "!" takes paths back out of the rules before it, and under layered those can be another matching policy's rules. Remove it and narrow the rule it carved out of, or remove policy_mode.`,
              );
        }
      }
      let desktop_2;
      if (policy.desktop !== undefined)
        try {
          desktop_2 = parseDesktopSettingsOverlay(
            policy.desktop,
            `managed.policies[${y}].desktop`,
            gatewayConfig.listen.public_url,
            isPlainObject_3(desktop) && !isCatchAllPolicyMatch(policy.match) ? desktop : undefined,
            [
              ...Object.keys(policy),
              "settings",
              "code",
              ...Object.keys(GatewayConfigSchema().innerType().shape),
            ],
          );
        } catch (error) {
          h.push(error instanceof Error ? error.message : String(error));
        }
      return {
        match: policy.match,
        cli,
        underCode: policy.underCode,
        desktop: desktop_2,
        serve_to_desktop: policy.serve_to_desktop,
      };
    });
    if (h.length > 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        h.join(`
`),
        "managed policies invalid: one or more policies failed validation",
      );
    s = r;
    r = mergeCatchAllPolicy(r);
    for (let [m, y] of r.entries())
      if (y.desktop !== undefined && y.desktop.coworkEgressAllowedHosts === undefined)
        checkCoworkEgressHosts(y.cli, `managed.policies[${m}].${y.underCode ? "code" : "cli"}`);
  } else if (managed?.settings) {
    let { cli, aliasIssues } = applyAliasesToSettings(
      await readManagedSettingsFile(managed.settings),
      "managed settings",
    );
    validateManagedSettings(cli, "managed settings", aliasIssues);
    r = [
      {
        match: {},
        cli,
      },
    ];
  } else if (otelEnv)
    r = [
      {
        match: {},
        cli: {},
      },
    ];
  else return null;
  let a = 0;
  let l = (u) => {
    let { match, cli, underCode, desktop, serve_to_desktop: serveToDesktop } = u;
    let w = cli;
    if (otelEnv)
      w = {
        ...w,
        env: {
          ...otelEnv,
          ...(isPlainObject_3(cli.env) ? cli.env : {}),
        },
      };
    let modelPricing = cli.modelPricing;
    if (
      n &&
      (modelPricing === undefined ||
        (isPlainObject_3(modelPricing) &&
          Object.keys(modelPricing).length > 0 &&
          modelPricing.multiplier === undefined &&
          modelPricing.overrides === undefined))
    ) {
      w = {
        ...w,
        modelPricing: {
          ...modelPricing,
          ...n,
        },
      };
      a++;
    }
    let checksum = computeChecksum(w);
    let M = {
      uuid: checksum,
      checksum,
      settings: w,
    };
    let N = hasEffectivePolicyContent(cli);
    let availableModelsMatch = w.availableModelsMatch;
    let availableModelsMatch_2 =
      availableModelsMatch === "prefix" || availableModelsMatch === "exact"
        ? availableModelsMatch
        : undefined;
    return {
      match,
      payload: M,
      availableModels: readStringListField(w, "availableModels"),
      availableModelsMatch: availableModelsMatch_2,
      deniedModels: readStringListField(w, "deniedModels"),
      underCode,
      desktop,
      serveToDesktop,
      desktopSessionPayload: (underCode ? N : serveToDesktop === true && Object.keys(w).length > 0)
        ? M
        : undefined,
    };
  };
  let mapped = r.map(l);
  if (managed?.policy_mode === "layered") {
    let u = new Map();
    for (let f of mapped.filter((h) => !isCatchAllPolicyMatch(h.match)))
      f.layered = (h) => {
        let joined = h.join();
        let y = u.get(joined);
        if (!y) {
          if (u.size >= 1024) u.clear();
          y = l(h.map((b) => s[b]).reduceRight((b, w) => mergePolicy(b, w)));
          u.set(joined, y);
        }
        return y;
      };
  }
  if (n)
    gatewayLog(
      "info",
      `pricing: pushing modelPricing (${Object.keys(n.overrides ?? {}).length} model(s), multiplier ${n.multiplier ?? 1}) to clients in ${a} of ${r.length} managed policies`,
    );
  return mapped;
}
//@ chunk-1ny7cxrt.js:1417430-1417495 placement
/**
 * 判断策略的 match 是否为 catch-all（没有 groups 也没有 email_domain）。
 */
function isCatchAllPolicyMatch(match) {
  return match.groups === undefined && match.email_domain === undefined;
}
//@ chunk-1ny7cxrt.js:1417495-1418006 placement
/**
 * 把 catch-all 策略（match: {}）合并进其他策略；catch-all 不在最后时警告。
 */
function mergeCatchAllPolicy(e) {
  let index = e.findIndex((o) => isCatchAllPolicyMatch(o.match));
  if (index === -1) return e;
  if (index !== e.length - 1)
    gatewayLog(
      "warn",
      `managed.policies[${index}] is a catch-all (match: {}) but is not the ` +
        "last entry \u2014 policies after it will never match. Move it to the end.",
    );
  let n = e[index];
  return e.map((o, r) => {
    if (r === index) return o;
    let s = mergePolicy(n, o);
    logChangedKeys(`managed.policies[${r}] after merge with catch-all base`, s.cli, o.cli);
    if (s.desktop !== undefined)
      logChangedKeys(
        `managed.policies[${r}] desktop overlay after merge with catch-all base`,
        s.desktop,
        o.desktop,
      );
    return s;
  });
}
//@ chunk-1ny7cxrt.js:1418006-1418204 placement
/**
 * 合并两条托管策略（cli、desktop 覆盖层、serve_to_desktop）。
 */
function mergePolicy(e, t) {
  return {
    ...t,
    cli: mergeCliSettings(e.cli, t.cli),
    desktop:
      e.desktop || t.desktop
        ? {
            ...e.desktop,
            ...t.desktop,
            ...mergeDesktopToolPolicy(e.desktop, t.desktop),
          }
        : undefined,
    serve_to_desktop: t.serve_to_desktop ?? e.serve_to_desktop,
  };
}
//@ chunk-1ny7cxrt.js:1418204-1418433 placement
/**
 * 合并 CLI 托管设置：对象键浅合并、列表键去重并集，permissions/hooks 特殊处理。
 */
function mergeCliSettings(e, t) {
  let n = {
    ...e,
    ...t,
  };
  for (let o of MERGED_OBJECT_KEYS) {
    let r = e[o];
    let s = t[o];
    if (isPlainObject_3(r) && isPlainObject_3(s))
      n[o] = {
        ...r,
        ...s,
      };
  }
  for (let o of UNION_LIST_KEYS) n[o] = unionLists(e[o], t[o]);
  n.permissions = mergeListGroups(e.permissions, t.permissions, PERMISSION_LIST_KEYS);
  n.hooks = mergeListGroups(e.hooks, t.hooks);
  return dropUndefinedValues(n);
}
//@ chunk-1ny7cxrt.js:1418433-1418598 placement
/**
 * 合并含列表的对象（指定键或全部键做去重并集）。
 */
function mergeListGroups(e, t, n) {
  let o = isPlainObject_3(e) ? e : undefined;
  let r = isPlainObject_3(t) ? t : undefined;
  if (!o && !r) return;
  let s = {
    ...(o ?? {}),
    ...(r ?? {}),
  };
  for (let a of n ?? Object.keys(s)) s[a] = unionLists(o?.[a], r?.[a]);
  return dropUndefinedValues(s);
}
//@ chunk-1ny7cxrt.js:1418598-1418679 placement
/**
 * 删除对象中值为 undefined 的键。
 */
function dropUndefinedValues(e) {
  for (let key of Object.keys(e)) if (e[key] === undefined) delete e[key];
  return e;
}
//@ chunk-1ny7cxrt.js:1418679-1418905 placement
/**
 * 托管策略合并时的键分类：对象合并、列表并集、权限列表、钩子相关键。
 */
var MERGED_OBJECT_KEYS = ["env", "modelOverrides", "skillOverrides"];
var UNION_LIST_KEYS = ["disabledMcpjsonServers", "deniedMcpServers", "blockedMarketplaces", "deniedModels"];
var PERMISSION_LIST_KEYS = ["deny", "ask"];
var HOOK_SETTING_KEYS = ["disableAllHooks", "allowedHttpHookUrls", "httpHookAllowedEnvVars"];
//@ chunk-1ny7cxrt.js:1418905-1419152 placement
/**
 * 两个列表按 JSON 去重求并集（都不是数组时 undefined）。
 */
function unionLists(e, t) {
  let n = Array.isArray(e) ? e : [];
  let o = Array.isArray(t) ? t : [];
  if (n.length === 0 && o.length === 0) return Array.isArray(e) || Array.isArray(t) ? [] : undefined;
  let r = new Set();
  let s = [];
  for (let a of [...n, ...o]) {
    let l = jsonStringify(a);
    if (!r.has(l)) {
      r.add(l);
      s.push(a);
    }
  }
  return s;
}
//@ chunk-1ny7cxrt.js:1419152-1420031 placement
/**
 * 根据 telemetry.forward_to 与 public_url 生成下发给客户端的 OTEL 环境变量。
 */
function buildOtelEnv(e) {
  if (e.telemetry.forward_to.length === 0) {
    if (Object.keys(e.telemetry.resource_attributes ?? {}).length > 0)
      gatewayLog(
        "warn",
        "telemetry.resource_attributes is set but telemetry.forward_to is empty, so the labels are not applied",
      );
    return null;
  }
  let publicUrl = e.listen.public_url;
  if (!publicUrl) {
    gatewayLog(
      "warn",
      "telemetry.forward_to is configured but listen.public_url is not \u2014 " +
        "clients will not be told to export OTLP. Set listen.public_url so /managed/settings can push OTEL_EXPORTER_OTLP_ENDPOINT.",
    );
    return null;
  }
  let forwardTo = e.telemetry.forward_to;
  let entries = Object.entries(e.telemetry.resource_attributes ?? {});
  return {
    CLAUDE_CODE_ENABLE_TELEMETRY: "1",
    OTEL_METRICS_EXPORTER: otlpExporterSetting(forwardTo, "metrics"),
    OTEL_LOGS_EXPORTER: otlpExporterSetting(forwardTo, "logs"),
    OTEL_TRACES_EXPORTER: otlpExporterSetting(forwardTo, "traces"),
    OTEL_EXPORTER_OTLP_ENDPOINT: publicUrl,
    OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
    ...(entries.length > 0 && {
      OTEL_RESOURCE_ATTRIBUTES: entries.map(([r, s]) => `${r}=${s}`).join(","),
    }),
  };
}
//@ chunk-1ny7cxrt.js:1420031-1420087 placement
/**
 * 根据 forward_to 列表决定 OTEL_*_EXPORTER 的值："otlp" 或 "none"。
 */
function otlpExporterSetting(forwardTo, t) {
  return forwardTo.some((n) => n[t]) ? "otlp" : "none";
}
//@ chunk-1ny7cxrt.js:1420087-1420423 placement
/**
 * 记录合并后发生变化的设置键。
 */
function logChangedKeys(e, t, n) {
  let o = (s) => {
    if (Array.isArray(s)) {
      let mapped = s.map(o);
      return mapped.every((l) => typeof l === "string") ? uniq(mapped).sort() : mapped;
    }
    if (isPlainObject_3(s))
      return Object.fromEntries(
        Object.keys(s)
          .sort()
          .map((key) => [key, o(s[key])]),
      );
    return s;
  };
  let filtered = Object.keys(t).filter((key) => jsonStringify(o(t[key])) !== jsonStringify(o(n?.[key])));
  if (filtered.length > 0) gatewayLog("info", `${e} \u2014 changed keys: ${filtered.join(", ")}`);
}
//@ chunk-1ny7cxrt.js:1420423-1420907 placement
/**
 * 按组与邮箱域名匹配托管策略（支持分层策略叠加）。
 */
function matchPolicy(managedPolicies, t) {
  if (t.cri === true) return null;
  let groups = t.groups ?? [];
  let o = t.email?.includes("@") ? t.email.slice(t.email.lastIndexOf("@") + 1).toLowerCase() : undefined;
  let r = [];
  for (let [c, u] of managedPolicies.entries()) {
    let { groups: groups_2, email_domain: emailDomain } = u.match;
    if (groups_2 && !groups_2.some((group) => groups.includes(group))) continue;
    if (emailDomain && o !== emailDomain) continue;
    r.push({
      index: c,
      policy: u,
    });
    if (!u.layered) break;
  }
  let [s, a] = r;
  if (!s?.policy.layered || !a?.policy.layered) return s ?? null;
  let mapped = r.map((c) => c.index);
  return {
    index: s.index,
    indexes: mapped,
    policy: s.policy.layered(mapped),
  };
}
//@ chunk-1ny7cxrt.js:1420907-1420982 placement
/**
 * 托管配置里是否有策略或 settings（决定是否生成价格覆盖）。
 */
function hasManagedPolicies(managed) {
  return managed?.policies ? managed.policies.length > 0 : Boolean(managed?.settings);
}
//@ chunk-1ny7cxrt.js:1420982-1421143 placement
/**
 * 找第一个可服务该模型且不按组限制的上游。
 */
function firstUpstreamForModel(e, t) {
  for (let upstream of e.upstreams) {
    let upstreamModel = resolveUpstreamModel(t, upstream, e.models, e.auto_include_builtin_models);
    if (upstreamModel.ok)
      return upstream.groups
        ? undefined
        : {
            upstream,
            model: upstreamModel.model,
          };
  }
  return;
}
//@ chunk-1ny7cxrt.js:1421143-1421521 placement
/**
 * 生成下发给客户端的价格覆盖（倍率与各模型单价）。
 */
function buildPricingOverrides(e) {
  let pricing = e.pricing;
  if (!pricing) return null;
  let n = [];
  for (let o of pricingModelIds(e)) {
    let r = firstUpstreamForModel(e, o);
    let s = r && findPricingOverride(pricing, r.upstream.name, r.model, o);
    if (s)
      n.push([
        o,
        {
          input: s.input,
          output: s.output,
          cacheRead: s.cache_read,
          cacheWrite: s.cache_write,
        },
      ]);
  }
  if (n.length === 0 && pricing.multiplier === 1) return null;
  return {
    ...(pricing.multiplier !== 1 && {
      multiplier: pricing.multiplier,
    }),
    ...(n.length > 0 && {
      overrides: Object.fromEntries(n),
    }),
  };
}
//@ chunk-1ny7cxrt.js:1421521-1421724 placement
/**
 * 需要计算价格的模型 id 列表（去重）。
 */
function pricingModelIds(e) {
  let t = new Set();
  let n = [];
  for (let o of [
    ...(e.pricing?.overrides ?? []).map((r) => findModelConfigById(r.model)?.firstParty ?? r.model),
    ...e.models.map((model) => model.id),
  ]) {
    let r = modelCanonicalKey(o);
    if (!t.has(r)) {
      t.add(r);
      n.push(o);
    }
  }
  return n;
}
//@ chunk-1ny7cxrt.js:1421724-1421778 placement
/**
 * 懒加载的完整设置 schema（用于列出现有配置键）。
 */
var wholeSettingsSchema = DoctorLazy(() =>
  buildWholeSettingsSchema(enabledSettingsFeatureGroups(), {
    strictPolicyHelperKeys: true,
  }),
);
//@ chunk-1ny7cxrt.js:1421778-1422018 placement
/**
 * 规范化设置别名，报告同时设置别名与正名的问题。
 */
function applyAliasesToSettings(e, t) {
  let n = {
    ...e,
  };
  let o = applySettingAliases(n, t, {
    loneNullAlias: "rename",
  });
  return {
    cli: n,
    aliasIssues: o.map(
      (r) =>
        `  ${r.alias}: this document sets both "${r.alias}" and "${r.canonical}", which are the same setting \u2014 keep only "${r.canonical}"`,
    ),
  };
}
//@ chunk-1ny7cxrt.js:1422018-1423077 placement
/**
 * 校验托管设置文档：schema、规则、跨会话入站、插件定制、允许的提供方、未知键；有问题时抛错。
 */
function validateManagedSettings(e, t, aliasIssues) {
  let o = wholeSettingsSchema();
  let r = o.safeParse(e);
  let s = [...aliasIssues];
  if (!r.success) s.push(...r.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`));
  s.push(...staticPayloadWarnings(e).map((u) => `  ${u}`));
  s.push(...collectRuleWarnings(e).map((u) => `  ${u}`));
  let a = crossSessionInboundError(e);
  if (a !== undefined) s.push(`  crossSessionInbound: ${a} \u2014 fix the value`);
  let l = strictPluginOnlyCustomizationError(e);
  if (l !== undefined) s.push(`  strictPluginOnlyCustomization: ${l} \u2014 fix the value`);
  let c = validateAllowedProviders(e);
  if (c !== undefined) s.push(`  allowedProviders: ${c} \u2014 fix the value`);
  if (e !== null && typeof e === "object") {
    let u = new Set(Object.keys(o.shape));
    for (let [key, value] of Object.entries(e))
      if (key === "mcpServers") {
        if (value !== undefined)
          s.push(
            '  mcpServers: not a managed-settings key \u2014 use "managedMcpServers" (http/sse servers only; same entry shape as .mcp.json)',
          );
      } else if (!u.has(key))
        s.push(
          `  ${key}: unknown settings key \u2014 fix the typo, upgrade the gateway if this key was added in a newer CLI, or set the gateway's matching env/build gate if the key is gated (e.g. CLAUDE_CODE_ENABLE_XAA for xaaIdp)`,
        );
  }
  if (s.length > 0)
    throw Error(`${t} invalid:
${s.join(`
`)}`);
}
//@ chunk-1ny7cxrt.js:1423077-1423359 placement
/**
 * 读取托管设置 JSON 文件（不存在返回空对象，非对象报错）。
 */
async function readManagedSettingsFile(settings) {
  if (!settings) return {};
  let t;
  try {
    t = await readFile(settings, "utf8");
  } catch (error) {
    if (isENOENT(error)) return {};
    throw error;
  }
  let n = jsonParse(t);
  if (typeof n !== "object" || n === null || Array.isArray(n))
    throw Error(
      `Managed settings file ${settings}: expected a JSON object, got ${Array.isArray(n) ? "array" : typeof n}`,
    );
  return n;
}
export { hasManagedPolicies, resolveManagedPolicies, matchPolicy, firstUpstreamForModel };

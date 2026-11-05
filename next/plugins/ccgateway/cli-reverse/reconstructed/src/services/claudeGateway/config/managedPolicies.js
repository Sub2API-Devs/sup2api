/**
 * services/claudeGateway/config/managedPolicies.ts
 *
 * 2.1.316 新增：网关下发的托管策略
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (21)
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
import { normalizeCaseForComparison_2 } from "../../../utils/permissions/filesystem.js";
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
import { deferInit, beginDeferredInits } from "../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 3 modules closed by ./load.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/services/claudeGateway/config/load.js");
//@ chunk-1hnjmk23.js:1415820-1419310 placement
/**
 * 解析网关配置里的托管策略（含桌面版策略），生成下发给客户端的托管设置。
 */
async function resolveManagedPolicies(config) {
  let otelEnv = buildOtelEnv(config);
  let pricingOverrides = hasManagedPolicies(config.managed) ? buildPricingOverrides(config) : null;
  let managed = config.managed;
  let policies;
  let sourcePolicies = [];
  if (managed?.policies) {
    let any = managed.policies.some((policy) => policy.desktop !== undefined);
    if (config.listen.public_url === undefined && any)
      gatewayLog(
        "warn",
        "managed.policies: listen.public_url is not set \u2014 origin-pin hygiene is skipped at boot, so an origin-pinned overlay value would be silently dropped by desktops",
      );
    let desktop = managed.policies.find((policy) => isCatchAllPolicyMatch(policy.match))?.desktop;
    let errors = [];
    policies = managed.policies.map((policy, policyIndex) => {
      let label = `managed.policies[${policyIndex}].${policy.underCode ? "code" : "cli"}`;
      let { cli, aliasIssues } = applyAliasesToSettings(policy.cli, label);
      try {
        validateManagedSettings(cli, label, aliasIssues);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
      if (managed.policy_mode === "layered") {
        for (let helperKey of POLICY_HELPER_CONFIG_KEYS)
          if (cli[helperKey] !== undefined)
            errors.push(
              `${label}.${helperKey} can't be used with policy_mode: layered. A policy helper's output replaces the settings served here or adds to them, so it could drop another matching policy's deny rules. Remove it, or remove policy_mode.`,
            );
        for (let hookKey of isCatchAllPolicyMatch(policy.match) ? [] : HOOK_SETTING_KEYS)
          if (cli[hookKey] !== undefined)
            errors.push(
              `${label}.${hookKey} can't be used in this policy with policy_mode: layered. It limits every hook that a person is served, so it could switch off another matching policy's hooks. Move it to a match: {} policy, or remove policy_mode.`,
            );
        let permissions = isPlainObject_3(cli.permissions) ? cli.permissions : {};
        for (let permissionKey of PERMISSION_LIST_KEYS) {
          let rules = permissions[permissionKey];
          for (let rule of Array.isArray(rules) ? rules : [])
            if (typeof rule === "string" && PATH_RULE_CARVE_OUT_RE.test(rule))
              errors.push(
                `${label}.permissions.${permissionKey}: "${rule}" can't be used with policy_mode: layered. A rule whose path starts with "!" takes paths back out of the rules before it, and under layered those can be another matching policy's rules. Remove it and narrow the rule it carved out of, or remove policy_mode.`,
              );
        }
      }
      let desktop_2;
      if (policy.desktop !== undefined)
        try {
          desktop_2 = parseDesktopSettingsOverlay(
            policy.desktop,
            `managed.policies[${policyIndex}].desktop`,
            config.listen.public_url,
            isPlainObject_3(desktop) && !isCatchAllPolicyMatch(policy.match) ? desktop : undefined,
            [
              ...Object.keys(policy),
              "settings",
              "code",
              ...Object.keys(GatewayConfigSchema().innerType().shape),
            ],
          );
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      return {
        match: policy.match,
        cli,
        underCode: policy.underCode,
        desktop: desktop_2,
        serve_to_desktop: policy.serve_to_desktop,
      };
    });
    if (errors.length > 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        errors.join(`
`),
        "managed policies invalid: one or more policies failed validation",
      );
    sourcePolicies = policies;
    policies = mergeCatchAllPolicy(policies);
    for (let [policyIndex, policyEntry] of policies.entries())
      if (policyEntry.desktop !== undefined && policyEntry.desktop.coworkEgressAllowedHosts === undefined)
        checkCoworkEgressHosts(
          policyEntry.cli,
          `managed.policies[${policyIndex}].${policyEntry.underCode ? "code" : "cli"}`,
        );
  } else if (managed?.settings) {
    let { cli, aliasIssues } = applyAliasesToSettings(
      await readManagedSettingsFile(managed.settings),
      "managed settings",
    );
    validateManagedSettings(cli, "managed settings", aliasIssues);
    policies = [
      {
        match: {},
        cli,
      },
    ];
  } else if (otelEnv)
    policies = [
      {
        match: {},
        cli: {},
      },
    ];
  else return null;
  let pricedPolicyCount = 0;
  let toServedPolicy = (policyEntry) => {
    let { match, cli, underCode, desktop, serve_to_desktop: serveToDesktop } = policyEntry;
    let settings = cli;
    if (otelEnv)
      settings = {
        ...settings,
        env: {
          ...otelEnv,
          ...(isPlainObject_3(cli.env) ? cli.env : {}),
        },
      };
    let modelPricing = cli.modelPricing;
    if (
      pricingOverrides &&
      (modelPricing === undefined ||
        (isPlainObject_3(modelPricing) &&
          Object.keys(modelPricing).length > 0 &&
          modelPricing.multiplier === undefined &&
          modelPricing.overrides === undefined))
    ) {
      settings = {
        ...settings,
        modelPricing: {
          ...modelPricing,
          ...pricingOverrides,
        },
      };
      pricedPolicyCount++;
    }
    let checksum = computeChecksum(settings);
    let payload = {
      uuid: checksum,
      checksum,
      settings,
    };
    let hasContent = hasEffectivePolicyContent(cli);
    let availableModelsMatch = settings.availableModelsMatch;
    let availableModelsMatch_2 =
      availableModelsMatch === "prefix" || availableModelsMatch === "exact"
        ? availableModelsMatch
        : undefined;
    return {
      match,
      payload,
      availableModels: readStringListField(settings, "availableModels"),
      availableModelsMatch: availableModelsMatch_2,
      deniedModels: readStringListField(settings, "deniedModels"),
      underCode,
      desktop,
      serveToDesktop,
      desktopSessionPayload: (
        underCode ? hasContent : serveToDesktop === true && Object.keys(settings).length > 0
      )
        ? payload
        : undefined,
    };
  };
  let mapped = policies.map(toServedPolicy);
  if (managed?.policy_mode === "layered") {
    let layeredCache = new Map();
    for (let policyEntry of mapped.filter((policyEntry) => !isCatchAllPolicyMatch(policyEntry.match)))
      policyEntry.layered = (indexes) => {
        let joined = indexes.join();
        let layered = layeredCache.get(joined);
        if (!layered) {
          if (layeredCache.size >= 1024) layeredCache.clear();
          layered = toServedPolicy(
            indexes
              .map((index) => sourcePolicies[index])
              .reduceRight((merged, overlay) => mergePolicy(merged, overlay)),
          );
          layeredCache.set(joined, layered);
        }
        return layered;
      };
  }
  if (pricingOverrides)
    gatewayLog(
      "info",
      `pricing: pushing modelPricing (${Object.keys(pricingOverrides.overrides ?? {}).length} model(s), multiplier ${pricingOverrides.multiplier ?? 1}) to clients in ${pricedPolicyCount} of ${policies.length} managed policies`,
    );
  return mapped;
}
//@ chunk-1hnjmk23.js:1419310-1419375 placement
/**
 * 判断策略的 match 是否为 catch-all（没有 groups 也没有 email_domain）。
 */
function isCatchAllPolicyMatch(match) {
  return match.groups === undefined && match.email_domain === undefined;
}
//@ chunk-1hnjmk23.js:1419375-1419886 placement
/**
 * 把 catch-all 策略（match: {}）合并进其他策略；catch-all 不在最后时警告。
 */
function mergeCatchAllPolicy(policies) {
  let index = policies.findIndex((policy) => isCatchAllPolicyMatch(policy.match));
  if (index === -1) return policies;
  if (index !== policies.length - 1)
    gatewayLog(
      "warn",
      `managed.policies[${index}] is a catch-all (match: {}) but is not the ` +
        "last entry \u2014 policies after it will never match. Move it to the end.",
    );
  let policyIndex = policies[index];
  return policies.map((base, mergedIndex) => {
    if (mergedIndex === index) return base;
    let merged = mergePolicy(policyIndex, base);
    logChangedKeys(`managed.policies[${mergedIndex}] after merge with catch-all base`, merged.cli, base.cli);
    if (merged.desktop !== undefined)
      logChangedKeys(
        `managed.policies[${mergedIndex}] desktop overlay after merge with catch-all base`,
        merged.desktop,
        base.desktop,
      );
    return merged;
  });
}
//@ chunk-1hnjmk23.js:1419886-1420084 placement
/**
 * 合并两条托管策略（cli、desktop 覆盖层、serve_to_desktop）。
 */
function mergePolicy(base, override) {
  return {
    ...override,
    cli: mergeCliSettings(base.cli, override.cli),
    desktop:
      base.desktop || override.desktop
        ? {
            ...base.desktop,
            ...override.desktop,
            ...mergeDesktopToolPolicy(base.desktop, override.desktop),
          }
        : undefined,
    serve_to_desktop: override.serve_to_desktop ?? base.serve_to_desktop,
  };
}
//@ chunk-1hnjmk23.js:1420084-1420313 placement
/**
 * 合并 CLI 托管设置：对象键浅合并、列表键去重并集，permissions/hooks 特殊处理。
 */
function mergeCliSettings(base, override) {
  let merged = {
    ...base,
    ...override,
  };
  for (let key of MERGED_OBJECT_KEYS) {
    let baseValue = base[key];
    let overrideValue = override[key];
    if (isPlainObject_3(baseValue) && isPlainObject_3(overrideValue))
      merged[key] = {
        ...baseValue,
        ...overrideValue,
      };
  }
  for (let key of UNION_LIST_KEYS) merged[key] = unionLists(base[key], override[key]);
  merged.permissions = mergeListGroups(base.permissions, override.permissions, PERMISSION_LIST_KEYS);
  merged.hooks = mergeListGroups(base.hooks, override.hooks);
  return dropUndefinedValues(merged);
}
//@ chunk-1hnjmk23.js:1420313-1420478 placement
/**
 * 合并含列表的对象（指定键或全部键做去重并集）。
 */
function mergeListGroups(base, override, keys) {
  let baseObject = isPlainObject_3(base) ? base : undefined;
  let overrideObject = isPlainObject_3(override) ? override : undefined;
  if (!baseObject && !overrideObject) return;
  let merged = {
    ...(baseObject ?? {}),
    ...(overrideObject ?? {}),
  };
  for (let key of keys ?? Object.keys(merged))
    merged[key] = unionLists(baseObject?.[key], overrideObject?.[key]);
  return dropUndefinedValues(merged);
}
//@ chunk-1hnjmk23.js:1420478-1420559 placement
/**
 * 删除对象中值为 undefined 的键。
 */
function dropUndefinedValues(obj) {
  for (let key of Object.keys(obj)) if (obj[key] === undefined) delete obj[key];
  return obj;
}
//@ chunk-1hnjmk23.js:1420559-1420785 placement
/**
 * 托管策略合并时的键分类：对象合并、列表并集、权限列表、钩子相关键。
 */
var MERGED_OBJECT_KEYS = ["env", "modelOverrides", "skillOverrides"];
var UNION_LIST_KEYS = ["disabledMcpjsonServers", "deniedMcpServers", "blockedMarketplaces", "deniedModels"];
var PERMISSION_LIST_KEYS = ["deny", "ask"];
var HOOK_SETTING_KEYS = ["disableAllHooks", "allowedHttpHookUrls", "httpHookAllowedEnvVars"];
//@ chunk-1hnjmk23.js:1420785-1421032 placement
/**
 * 两个列表按 JSON 去重求并集（都不是数组时 undefined）。
 */
function unionLists(left, right) {
  let leftList = Array.isArray(left) ? left : [];
  let rightList = Array.isArray(right) ? right : [];
  if (leftList.length === 0 && rightList.length === 0)
    return Array.isArray(left) || Array.isArray(right) ? [] : undefined;
  let seen = new Set();
  let merged = [];
  for (let item of [...leftList, ...rightList]) {
    let serialized = jsonStringify(item);
    if (!seen.has(serialized)) {
      seen.add(serialized);
      merged.push(item);
    }
  }
  return merged;
}
//@ chunk-1hnjmk23.js:1421032-1421911 placement
/**
 * 根据 telemetry.forward_to 与 public_url 生成下发给客户端的 OTEL 环境变量。
 */
function buildOtelEnv(config) {
  if (config.telemetry.forward_to.length === 0) {
    if (Object.keys(config.telemetry.resource_attributes ?? {}).length > 0)
      gatewayLog(
        "warn",
        "telemetry.resource_attributes is set but telemetry.forward_to is empty, so the labels are not applied",
      );
    return null;
  }
  let publicUrl = config.listen.public_url;
  if (!publicUrl) {
    gatewayLog(
      "warn",
      "telemetry.forward_to is configured but listen.public_url is not \u2014 " +
        "clients will not be told to export OTLP. Set listen.public_url so /managed/settings can push OTEL_EXPORTER_OTLP_ENDPOINT.",
    );
    return null;
  }
  let forwardTo = config.telemetry.forward_to;
  let entries = Object.entries(config.telemetry.resource_attributes ?? {});
  return {
    CLAUDE_CODE_ENABLE_TELEMETRY: "1",
    OTEL_METRICS_EXPORTER: otlpExporterSetting(forwardTo, "metrics"),
    OTEL_LOGS_EXPORTER: otlpExporterSetting(forwardTo, "logs"),
    OTEL_TRACES_EXPORTER: otlpExporterSetting(forwardTo, "traces"),
    OTEL_EXPORTER_OTLP_ENDPOINT: publicUrl,
    OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
    ...(entries.length > 0 && {
      OTEL_RESOURCE_ATTRIBUTES: entries.map(([attrKey, attrValue]) => `${attrKey}=${attrValue}`).join(","),
    }),
  };
}
//@ chunk-1hnjmk23.js:1421911-1421967 placement
/**
 * 根据 forward_to 列表决定 OTEL_*_EXPORTER 的值："otlp" 或 "none"。
 */
function otlpExporterSetting(forwardTo, signalKind) {
  return forwardTo.some((target) => target[signalKind]) ? "otlp" : "none";
}
//@ chunk-1hnjmk23.js:1421967-1422303 placement
/**
 * 记录合并后发生变化的设置键。
 */
function logChangedKeys(label, after, before) {
  let normalize = (value) => {
    if (Array.isArray(value)) {
      let mapped = value.map(normalize);
      return mapped.every((item) => typeof item === "string")
        ? normalizeCaseForComparison_2(mapped).sort()
        : mapped;
    }
    if (isPlainObject_3(value))
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, normalize(value[key])]),
      );
    return value;
  };
  let filtered = Object.keys(after).filter(
    (key) => jsonStringify(normalize(after[key])) !== jsonStringify(normalize(before?.[key])),
  );
  if (filtered.length > 0) gatewayLog("info", `${label} \u2014 changed keys: ${filtered.join(", ")}`);
}
//@ chunk-1hnjmk23.js:1422303-1422787 placement
/**
 * 按组与邮箱域名匹配托管策略（支持分层策略叠加）。
 */
function matchPolicy(managedPolicies, principal) {
  if (principal.cri === true) return null;
  let groups = principal.groups ?? [];
  let emailDomain = principal.email?.includes("@")
    ? principal.email.slice(principal.email.lastIndexOf("@") + 1).toLowerCase()
    : undefined;
  let matches = [];
  for (let [index, policy] of managedPolicies.entries()) {
    let { groups: groups_2, email_domain: emailDomain_2 } = policy.match;
    if (groups_2 && !groups_2.some((group) => groups.includes(group))) continue;
    if (emailDomain_2 && emailDomain !== emailDomain_2) continue;
    matches.push({
      index,
      policy,
    });
    if (!policy.layered) break;
  }
  let [firstMatch, secondMatch] = matches;
  if (!firstMatch?.policy.layered || !secondMatch?.policy.layered) return firstMatch ?? null;
  let mapped = matches.map((match) => match.index);
  return {
    index: firstMatch.index,
    indexes: mapped,
    policy: firstMatch.policy.layered(mapped),
  };
}
//@ chunk-1hnjmk23.js:1422787-1422862 placement
/**
 * 托管配置里是否有策略或 settings（决定是否生成价格覆盖）。
 */
function hasManagedPolicies(managed) {
  return managed?.policies ? managed.policies.length > 0 : Boolean(managed?.settings);
}
//@ chunk-1hnjmk23.js:1422862-1423023 placement
/**
 * 找第一个可服务该模型且不按组限制的上游。
 */
function firstUpstreamForModel(config, modelId) {
  for (let upstream of config.upstreams) {
    let upstreamModel = resolveUpstreamModel(
      modelId,
      upstream,
      config.models,
      config.auto_include_builtin_models,
    );
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
//@ chunk-1hnjmk23.js:1423023-1423401 placement
/**
 * 生成下发给客户端的价格覆盖（倍率与各模型单价）。
 */
function buildPricingOverrides(config) {
  let pricing = config.pricing;
  if (!pricing) return null;
  let overrides = [];
  for (let modelId of pricingModelIds(config)) {
    let upstreamInfo = firstUpstreamForModel(config, modelId);
    let override =
      upstreamInfo && findPricingOverride(pricing, upstreamInfo.upstream.name, upstreamInfo.model, modelId);
    if (override)
      overrides.push([
        modelId,
        {
          input: override.input,
          output: override.output,
          cacheRead: override.cache_read,
          cacheWrite: override.cache_write,
        },
      ]);
  }
  if (overrides.length === 0 && pricing.multiplier === 1) return null;
  return {
    ...(pricing.multiplier !== 1 && {
      multiplier: pricing.multiplier,
    }),
    ...(overrides.length > 0 && {
      overrides: Object.fromEntries(overrides),
    }),
  };
}
//@ chunk-1hnjmk23.js:1423401-1423604 placement
/**
 * 需要计算价格的模型 id 列表（去重）。
 */
function pricingModelIds(config) {
  let seen = new Set();
  let ids = [];
  for (let modelId of [
    ...(config.pricing?.overrides ?? []).map(
      (override) => findModelConfigById(override.model)?.firstParty ?? override.model,
    ),
    ...config.models.map((model) => model.id),
  ]) {
    let canonicalKey = modelCanonicalKey(modelId);
    if (!seen.has(canonicalKey)) {
      seen.add(canonicalKey);
      ids.push(modelId);
    }
  }
  return ids;
}
//@ chunk-1hnjmk23.js:1423604-1423658 placement
/**
 * 懒加载的完整设置 schema（用于列出现有配置键）。
 */
var wholeSettingsSchema; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1hnjmk23.js:1423604", () => {
  wholeSettingsSchema = DoctorLazy(() =>
    buildWholeSettingsSchema(enabledSettingsFeatureGroups(), {
      strictPolicyHelperKeys: true,
    }),
  );
});
//@ chunk-1hnjmk23.js:1423658-1423898 placement
/**
 * 规范化设置别名，报告同时设置别名与正名的问题。
 */
function applyAliasesToSettings(cli, aliasMap) {
  let copy = {
    ...cli,
  };
  let issues = applySettingAliases(copy, aliasMap, {
    loneNullAlias: "rename",
  });
  return {
    cli: copy,
    aliasIssues: issues.map(
      (issue) =>
        `  ${issue.alias}: this document sets both "${issue.alias}" and "${issue.canonical}", which are the same setting \u2014 keep only "${issue.canonical}"`,
    ),
  };
}
//@ chunk-1hnjmk23.js:1423898-1424957 placement
/**
 * 校验托管设置文档：schema、规则、跨会话入站、插件定制、允许的提供方、未知键；有问题时抛错。
 */
function validateManagedSettings(settings, label, aliasIssues) {
  let schema = wholeSettingsSchema();
  let parsed = schema.safeParse(settings);
  let issues = [...aliasIssues];
  if (!parsed.success)
    issues.push(...parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`));
  issues.push(...staticPayloadWarnings(settings).map((warning) => `  ${warning}`));
  issues.push(...collectRuleWarnings(settings).map((warning) => `  ${warning}`));
  let crossSessionError = crossSessionInboundError(settings);
  if (crossSessionError !== undefined)
    issues.push(`  crossSessionInbound: ${crossSessionError} \u2014 fix the value`);
  let strictPluginError = strictPluginOnlyCustomizationError(settings);
  if (strictPluginError !== undefined)
    issues.push(`  strictPluginOnlyCustomization: ${strictPluginError} \u2014 fix the value`);
  let allowedProvidersError = validateAllowedProviders(settings);
  if (allowedProvidersError !== undefined)
    issues.push(`  allowedProviders: ${allowedProvidersError} \u2014 fix the value`);
  if (settings !== null && typeof settings === "object") {
    let knownKeys = new Set(Object.keys(schema.shape));
    for (let [key, value] of Object.entries(settings))
      if (key === "mcpServers") {
        if (value !== undefined)
          issues.push(
            '  mcpServers: not a managed-settings key \u2014 use "managedMcpServers" (http/sse servers only; same entry shape as .mcp.json)',
          );
      } else if (!knownKeys.has(key))
        issues.push(
          `  ${key}: unknown settings key \u2014 fix the typo, upgrade the gateway if this key was added in a newer CLI, or set the gateway's matching env/build gate if the key is gated (e.g. CLAUDE_CODE_ENABLE_XAA for xaaIdp)`,
        );
  }
  if (issues.length > 0)
    throw Error(`${label} invalid:
${issues.join(`
`)}`);
}
//@ chunk-1hnjmk23.js:1424957-1425239 placement
/**
 * 读取托管设置 JSON 文件（不存在返回空对象，非对象报错）。
 */
async function readManagedSettingsFile(settings) {
  if (!settings) return {};
  let text;
  try {
    text = await readFile(settings, "utf8");
  } catch (error) {
    if (isENOENT(error)) return {};
    throw error;
  }
  let parsed = jsonParse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    throw Error(
      `Managed settings file ${settings}: expected a JSON object, got ${Array.isArray(parsed) ? "array" : typeof parsed}`,
    );
  return parsed;
}
export { hasManagedPolicies, resolveManagedPolicies, matchPolicy, firstUpstreamForModel };

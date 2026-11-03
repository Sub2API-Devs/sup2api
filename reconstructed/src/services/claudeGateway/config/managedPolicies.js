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
import { readFile, readFile as readFile_2, readFile as readFile_3 } from "fs/promises";
import { gatewayLog } from "../../gateway/gatewayBanner.js";
import {
  POLICY_HELPER_CONFIG_KEYS,
  hasEffectivePolicyContent,
} from "../../../utils/settings/policySettings.js";
import { isPlainObject as isPlainObject_2 } from "../../../utils/isPlainObject.js";
import { PATH_RULE_CARVE_OUT_RE } from "../../../utils/settings/permissionRuleCarveOut.js";
import {
  parseDesktopSettingsOverlay,
  checkCoworkEgressHosts,
  mergeDesktopToolPolicy,
} from "../desktopSettings.js";
import { Yz } from "./schema.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isENOENT,
} from "../../../utils/errors.js";
import { computeChecksum } from "../../policyLimits/index.js";
import { Kz } from "./load.js";
import { jsonStringify, jsonParse } from "../../../utils/slowOperations.js";
import { uniq } from "../../../utils/collections.js";
import { resolveUpstreamModel, findPricingOverride, Kf } from "../models.js";
import { findModelConfigById } from "../../../utils/model/providerCaches.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { buildWholeSettingsSchema } from "../../../utils/settings/types.js";
import { LOt } from "../../../utils/spellcheck.js";
import { applySettingAliases } from "../../../utils/settings/marketplaceSettingsAliases.js";
import { staticPayloadWarnings } from "../../../utils/settings/validation.js";
import {
  collectRuleWarnings,
  crossSessionInboundError,
  strictPluginOnlyCustomizationError,
  validateAllowedProviders,
} from "../../../utils/settings/hooksValidation.js";

/**
 * 解析网关配置里的托管策略（含桌面版策略），生成下发给客户端的托管设置。
 */
//@ chunk-1ny7cxrt.js:1413940-1417430 placement
async function resolveManagedPolicies(e) {
  let t = buildOtelEnv(e),
    n = r1(e.managed) ? buildPricingOverrides(e) : null,
    managed = e.managed,
    r,
    s = [];
  if (managed?.policies) {
    let any = managed.policies.some((policy) => policy.desktop !== void 0);
    if (e.listen.public_url === void 0 && any)
      gatewayLog(
        "warn",
        "managed.policies: listen.public_url is not set \u2014 origin-pin hygiene is skipped at boot, so an origin-pinned overlay value would be silently dropped by desktops",
      );
    let f = managed.policies.find((policy) => Fd(policy.match))?.desktop,
      h = [];
    if (
      ((r = managed.policies.map((policy, y) => {
        let b = `managed.policies[${y}].${policy.underCode ? "code" : "cli"}`,
          { cli: cli, aliasIssues: aliasIssues } = applyAliasesToSettings(policy.cli, b);
        try {
          validateManagedSettings(cli, b, aliasIssues);
        } catch (error) {
          h.push(error instanceof Error ? error.message : String(error));
        }
        if (managed.policy_mode === "layered") {
          for (let N of POLICY_HELPER_CONFIG_KEYS)
            if (cli[N] !== void 0)
              h.push(
                `${b}.${N} can't be used with policy_mode: layered. A policy helper's output replaces the settings served here or adds to them, so it could drop another matching policy's deny rules. Remove it, or remove policy_mode.`,
              );
          for (let N of Fd(policy.match) ? [] : HOOK_SETTING_KEYS)
            if (cli[N] !== void 0)
              h.push(
                `${b}.${N} can't be used in this policy with policy_mode: layered. It limits every hook that a person is served, so it could switch off another matching policy's hooks. Move it to a match: {} policy, or remove policy_mode.`,
              );
          let M = isPlainObject_2(cli.permissions) ? cli.permissions : {};
          for (let N of PERMISSION_LIST_KEYS) {
            let Z = M[N];
            for (let F of Array.isArray(Z) ? Z : [])
              if (typeof F === "string" && PATH_RULE_CARVE_OUT_RE.test(F))
                h.push(
                  `${b}.permissions.${N}: "${F}" can't be used with policy_mode: layered. A rule whose path starts with "!" takes paths back out of the rules before it, and under layered those can be another matching policy's rules. Remove it and narrow the rule it carved out of, or remove policy_mode.`,
                );
          }
        }
        let j;
        if (policy.desktop !== void 0)
          try {
            j = parseDesktopSettingsOverlay(
              policy.desktop,
              `managed.policies[${y}].desktop`,
              e.listen.public_url,
              isPlainObject_2(f) && !Fd(policy.match) ? f : void 0,
              [...Object.keys(policy), "settings", "code", ...Object.keys(Yz().innerType().shape)],
            );
          } catch (error) {
            h.push(error instanceof Error ? error.message : String(error));
          }
        return {
          match: policy.match,
          cli: cli,
          underCode: policy.underCode,
          desktop: j,
          serve_to_desktop: policy.serve_to_desktop,
        };
      })),
      h.length > 0)
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        h.join(`
`),
        "managed policies invalid: one or more policies failed validation",
      );
    ((s = r), (r = mergeCatchAllPolicy(r)));
    for (let [m, y] of r.entries())
      if (y.desktop !== void 0 && y.desktop.coworkEgressAllowedHosts === void 0)
        checkCoworkEgressHosts(y.cli, `managed.policies[${m}].${y.underCode ? "code" : "cli"}`);
  } else if (managed?.settings) {
    let { cli: cli, aliasIssues: aliasIssues } = applyAliasesToSettings(
      await readManagedSettingsFile(managed.settings),
      "managed settings",
    );
    (validateManagedSettings(cli, "managed settings", aliasIssues), (r = [{ match: {}, cli: cli }]));
  } else if (t) r = [{ match: {}, cli: {} }];
  else return null;
  let a = 0,
    l = (u) => {
      let {
          match: match,
          cli: cli,
          underCode: underCode,
          desktop: desktop,
          serve_to_desktop: serve_to_desktop,
        } = u,
        w = cli;
      if (t) w = { ...w, env: { ...t, ...(isPlainObject_2(cli.env) ? cli.env : {}) } };
      let modelPricing = cli.modelPricing;
      if (
        n &&
        (modelPricing === void 0 ||
          (isPlainObject_2(modelPricing) &&
            Object.keys(modelPricing).length > 0 &&
            modelPricing.multiplier === void 0 &&
            modelPricing.overrides === void 0))
      )
        ((w = { ...w, modelPricing: { ...modelPricing, ...n } }), a++);
      let j = computeChecksum(w),
        M = { uuid: j, checksum: j, settings: w },
        N = hasEffectivePolicyContent(cli),
        availableModelsMatch = w.availableModelsMatch,
        F =
          availableModelsMatch === "prefix" || availableModelsMatch === "exact"
            ? availableModelsMatch
            : void 0;
      return {
        match: match,
        payload: M,
        availableModels: Kz(w, "availableModels"),
        availableModelsMatch: F,
        deniedModels: Kz(w, "deniedModels"),
        underCode: underCode,
        desktop: desktop,
        serveToDesktop: serve_to_desktop,
        desktopSessionPayload: (underCode ? N : serve_to_desktop === !0 && Object.keys(w).length > 0)
          ? M
          : void 0,
      };
    },
    mapped = r.map(l);
  if (managed?.policy_mode === "layered") {
    let u = new Map();
    for (let f of mapped.filter((h) => !Fd(h.match)))
      f.layered = (h) => {
        let joined = h.join(),
          y = u.get(joined);
        if (!y) {
          if (u.size >= 1024) u.clear();
          ((y = l(h.map((b) => s[b]).reduceRight((b, w) => mergePolicy(b, w)))), u.set(joined, y));
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
function Fd(e) {
  return e.groups === void 0 && e.email_domain === void 0;
}
/**
 * 把 catch-all 策略（match: {}）合并进其他策略；catch-all 不在最后时警告。
 */
//@ chunk-1ny7cxrt.js:1417495-1418006 placement
function mergeCatchAllPolicy(e) {
  let index = e.findIndex((o) => Fd(o.match));
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
    if (
      (logChangedKeys(`managed.policies[${r}] after merge with catch-all base`, s.cli, o.cli),
      s.desktop !== void 0)
    )
      logChangedKeys(
        `managed.policies[${r}] desktop overlay after merge with catch-all base`,
        s.desktop,
        o.desktop,
      );
    return s;
  });
}
/**
 * 合并两条托管策略（cli、desktop 覆盖层、serve_to_desktop）。
 */
//@ chunk-1ny7cxrt.js:1418006-1418204 placement
function mergePolicy(e, t) {
  return {
    ...t,
    cli: mergeCliSettings(e.cli, t.cli),
    desktop:
      e.desktop || t.desktop
        ? { ...e.desktop, ...t.desktop, ...mergeDesktopToolPolicy(e.desktop, t.desktop) }
        : void 0,
    serve_to_desktop: t.serve_to_desktop ?? e.serve_to_desktop,
  };
}
/**
 * 合并 CLI 托管设置：对象键浅合并、列表键去重并集，permissions/hooks 特殊处理。
 */
//@ chunk-1ny7cxrt.js:1418204-1418433 placement
function mergeCliSettings(e, t) {
  let n = { ...e, ...t };
  for (let o of MERGED_OBJECT_KEYS) {
    let r = e[o],
      s = t[o];
    if (isPlainObject_2(r) && isPlainObject_2(s)) n[o] = { ...r, ...s };
  }
  for (let o of UNION_LIST_KEYS) n[o] = unionLists(e[o], t[o]);
  return (
    (n.permissions = mergeListGroups(e.permissions, t.permissions, PERMISSION_LIST_KEYS)),
    (n.hooks = mergeListGroups(e.hooks, t.hooks)),
    e1(n)
  );
}
/**
 * 合并含列表的对象（指定键或全部键做去重并集）。
 */
//@ chunk-1ny7cxrt.js:1418433-1418598 placement
function mergeListGroups(e, t, n) {
  let o = isPlainObject_2(e) ? e : void 0,
    r = isPlainObject_2(t) ? t : void 0;
  if (!o && !r) return;
  let s = { ...(o ?? {}), ...(r ?? {}) };
  for (let a of n ?? Object.keys(s)) s[a] = unionLists(o?.[a], r?.[a]);
  return e1(s);
}
//@ chunk-1ny7cxrt.js:1418598-1418679 placement
function e1(e) {
  for (let t of Object.keys(e)) if (e[t] === void 0) delete e[t];
  return e;
}
/**
 * 托管策略合并时的键分类：对象合并、列表并集、权限列表、钩子相关键。
 */
//@ chunk-1ny7cxrt.js:1418679-1418905 placement
var MERGED_OBJECT_KEYS = ["env", "modelOverrides", "skillOverrides"],
  UNION_LIST_KEYS = ["disabledMcpjsonServers", "deniedMcpServers", "blockedMarketplaces", "deniedModels"],
  PERMISSION_LIST_KEYS = ["deny", "ask"],
  HOOK_SETTING_KEYS = ["disableAllHooks", "allowedHttpHookUrls", "httpHookAllowedEnvVars"];
/**
 * 两个列表按 JSON 去重求并集（都不是数组时 undefined）。
 */
//@ chunk-1ny7cxrt.js:1418905-1419152 placement
function unionLists(e, t) {
  let n = Array.isArray(e) ? e : [],
    o = Array.isArray(t) ? t : [];
  if (n.length === 0 && o.length === 0) return Array.isArray(e) || Array.isArray(t) ? [] : void 0;
  let r = new Set(),
    s = [];
  for (let a of [...n, ...o]) {
    let l = jsonStringify(a);
    if (!r.has(l)) (r.add(l), s.push(a));
  }
  return s;
}
/**
 * 根据 telemetry.forward_to 与 public_url 生成下发给客户端的 OTEL 环境变量。
 */
//@ chunk-1ny7cxrt.js:1419152-1420031 placement
function buildOtelEnv(e) {
  if (e.telemetry.forward_to.length === 0) {
    if (Object.keys(e.telemetry.resource_attributes ?? {}).length > 0)
      gatewayLog(
        "warn",
        "telemetry.resource_attributes is set but telemetry.forward_to is empty, so the labels are not applied",
      );
    return null;
  }
  let public_url = e.listen.public_url;
  if (!public_url)
    return (
      gatewayLog(
        "warn",
        "telemetry.forward_to is configured but listen.public_url is not \u2014 " +
          "clients will not be told to export OTLP. Set listen.public_url so /managed/settings can push OTEL_EXPORTER_OTLP_ENDPOINT.",
      ),
      null
    );
  let forward_to = e.telemetry.forward_to,
    entries = Object.entries(e.telemetry.resource_attributes ?? {});
  return {
    CLAUDE_CODE_ENABLE_TELEMETRY: "1",
    OTEL_METRICS_EXPORTER: N0(forward_to, "metrics"),
    OTEL_LOGS_EXPORTER: N0(forward_to, "logs"),
    OTEL_TRACES_EXPORTER: N0(forward_to, "traces"),
    OTEL_EXPORTER_OTLP_ENDPOINT: public_url,
    OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
    ...(entries.length > 0 && { OTEL_RESOURCE_ATTRIBUTES: entries.map(([r, s]) => `${r}=${s}`).join(",") }),
  };
}
//@ chunk-1ny7cxrt.js:1420031-1420087 placement
function N0(e, t) {
  return e.some((n) => n[t]) ? "otlp" : "none";
}
/**
 * 记录合并后发生变化的设置键。
 */
//@ chunk-1ny7cxrt.js:1420087-1420423 placement
function logChangedKeys(e, t, n) {
  let o = (s) => {
      if (Array.isArray(s)) {
        let mapped = s.map(o);
        return mapped.every((l) => typeof l === "string") ? uniq(mapped).sort() : mapped;
      }
      if (isPlainObject_2(s))
        return Object.fromEntries(
          Object.keys(s)
            .sort()
            .map((a) => [a, o(s[a])]),
        );
      return s;
    },
    filtered = Object.keys(t).filter((s) => jsonStringify(o(t[s])) !== jsonStringify(o(n?.[s])));
  if (filtered.length > 0) gatewayLog("info", `${e} \u2014 changed keys: ${filtered.join(", ")}`);
}
/**
 * 按组与邮箱域名匹配托管策略（支持分层策略叠加）。
 */
//@ chunk-1ny7cxrt.js:1420423-1420907 placement
function matchPolicy(e, t) {
  if (t.cri === !0) return null;
  let n = t.groups ?? [],
    o = t.email?.includes("@") ? t.email.slice(t.email.lastIndexOf("@") + 1).toLowerCase() : void 0,
    r = [];
  for (let [c, u] of e.entries()) {
    let { groups: groups, email_domain: email_domain } = u.match;
    if (groups && !groups.some((m) => n.includes(m))) continue;
    if (email_domain && o !== email_domain) continue;
    if ((r.push({ index: c, policy: u }), !u.layered)) break;
  }
  let [s, a] = r;
  if (!s?.policy.layered || !a?.policy.layered) return s ?? null;
  let mapped = r.map((c) => c.index);
  return { index: s.index, indexes: mapped, policy: s.policy.layered(mapped) };
}
//@ chunk-1ny7cxrt.js:1420907-1420982 placement
function r1(e) {
  return e?.policies ? e.policies.length > 0 : Boolean(e?.settings);
}
/**
 * 找第一个可服务该模型且不按组限制的上游。
 */
//@ chunk-1ny7cxrt.js:1420982-1421143 placement
function firstUpstreamForModel(e, t) {
  for (let upstream of e.upstreams) {
    let o = resolveUpstreamModel(t, upstream, e.models, e.auto_include_builtin_models);
    if (o.ok) return upstream.groups ? void 0 : { upstream: upstream, model: o.model };
  }
  return;
}
/**
 * 生成下发给客户端的价格覆盖（倍率与各模型单价）。
 */
//@ chunk-1ny7cxrt.js:1421143-1421521 placement
function buildPricingOverrides(e) {
  let pricing = e.pricing;
  if (!pricing) return null;
  let n = [];
  for (let o of pricingModelIds(e)) {
    let r = firstUpstreamForModel(e, o),
      s = r && findPricingOverride(pricing, r.upstream.name, r.model, o);
    if (s)
      n.push([o, { input: s.input, output: s.output, cacheRead: s.cache_read, cacheWrite: s.cache_write }]);
  }
  if (n.length === 0 && pricing.multiplier === 1) return null;
  return {
    ...(pricing.multiplier !== 1 && { multiplier: pricing.multiplier }),
    ...(n.length > 0 && { overrides: Object.fromEntries(n) }),
  };
}
/**
 * 需要计算价格的模型 id 列表（去重）。
 */
//@ chunk-1ny7cxrt.js:1421521-1421724 placement
function pricingModelIds(e) {
  let t = new Set(),
    n = [];
  for (let o of [
    ...(e.pricing?.overrides ?? []).map((r) => findModelConfigById(r.model)?.firstParty ?? r.model),
    ...e.models.map((model) => model.id),
  ]) {
    let r = Kf(o);
    if (!t.has(r)) (t.add(r), n.push(o));
  }
  return n;
}
//@ chunk-1ny7cxrt.js:1421724-1421778 placement
var mbe = DoctorLazy(() => buildWholeSettingsSchema(LOt(), { strictPolicyHelperKeys: !0 }));
/**
 * 规范化设置别名，报告同时设置别名与正名的问题。
 */
//@ chunk-1ny7cxrt.js:1421778-1422018 placement
function applyAliasesToSettings(e, t) {
  let n = { ...e },
    o = applySettingAliases(n, t, { loneNullAlias: "rename" });
  return {
    cli: n,
    aliasIssues: o.map(
      (r) =>
        `  ${r.alias}: this document sets both "${r.alias}" and "${r.canonical}", which are the same setting \u2014 keep only "${r.canonical}"`,
    ),
  };
}
/**
 * 校验托管设置文档：schema、规则、跨会话入站、插件定制、允许的提供方、未知键；有问题时抛错。
 */
//@ chunk-1ny7cxrt.js:1422018-1423077 placement
function validateManagedSettings(e, t, n) {
  let o = mbe(),
    safeParse = o.safeParse(e),
    s = [...n];
  if (!safeParse.success)
    s.push(...safeParse.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`));
  (s.push(...staticPayloadWarnings(e).map((u) => `  ${u}`)),
    s.push(...collectRuleWarnings(e).map((u) => `  ${u}`)));
  let a = crossSessionInboundError(e);
  if (a !== void 0) s.push(`  crossSessionInbound: ${a} \u2014 fix the value`);
  let l = strictPluginOnlyCustomizationError(e);
  if (l !== void 0) s.push(`  strictPluginOnlyCustomization: ${l} \u2014 fix the value`);
  let c = validateAllowedProviders(e);
  if (c !== void 0) s.push(`  allowedProviders: ${c} \u2014 fix the value`);
  if (e !== null && typeof e === "object") {
    let u = new Set(Object.keys(o.shape));
    for (let [f, h] of Object.entries(e))
      if (f === "mcpServers") {
        if (h !== void 0)
          s.push(
            '  mcpServers: not a managed-settings key \u2014 use "managedMcpServers" (http/sse servers only; same entry shape as .mcp.json)',
          );
      } else if (!u.has(f))
        s.push(
          `  ${f}: unknown settings key \u2014 fix the typo, upgrade the gateway if this key was added in a newer CLI, or set the gateway's matching env/build gate if the key is gated (e.g. CLAUDE_CODE_ENABLE_XAA for xaaIdp)`,
        );
  }
  if (s.length > 0)
    throw Error(`${t} invalid:
${s.join(`
`)}`);
}
/**
 * 读取托管设置 JSON 文件（不存在返回空对象，非对象报错）。
 */
//@ chunk-1ny7cxrt.js:1423077-1423359 placement
async function readManagedSettingsFile(e) {
  if (!e) return {};
  let t;
  try {
    t = await readFile_3(e, "utf8");
  } catch (error) {
    if (isENOENT(error)) return {};
    throw error;
  }
  let n = jsonParse(t);
  if (typeof n !== "object" || n === null || Array.isArray(n))
    throw Error(
      `Managed settings file ${e}: expected a JSON object, got ${Array.isArray(n) ? "array" : typeof n}`,
    );
  return n;
}

export { r1, resolveManagedPolicies, matchPolicy, firstUpstreamForModel };

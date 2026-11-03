/**
 * utils/model/thirdPartyDefaultFallbacks.ts
 *
 * 2.1.316 新增。第三方提供商（Bedrock/Vertex/Mantle）默认模型不可用时探测并回退到可用模型，记 tengu_*_default_fallback。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4r745zza.js (13)
 * attribution: placement 13
 */
import { buildProviderTierDefaults } from "./agent.js";
import { getInitialSettings_2 } from "../settings/settings.js";
import {
  collectUnpinnedTiers,
  enforcedAllowlistLeavesOut,
  predecessorsInTier,
  STARTUP_PROBE_DEADLINE_MS,
  seedEnvDefaultForUserPin,
} from "./stalePins.js";
import { catalogEntriesByFirstPartyId } from "./modelCatalog.js";
import { isModelRemappedOrRetired, isModelDeprecated } from "./deprecation.js";
import { getModelStrings } from "./modelStrings.js";
import { registerFallbackLadder, applyThirdPartyCrossTierFallback } from "./modelUnavailability.js";
import { getMarketingNameForModel, DEFAULT_MANTLE_OPUS_KEY } from "./model.js";
import { logForDebugging } from "../debug.js";
import { env } from "../env.js";
import {
  userConfiguredDefault,
  recordProbedDefault,
  recordSeededDefault,
} from "./thirdPartyModelDefaults.js";
import {
  setAdmin3PSteeringSnapshot,
  recordProbeRefutedDocumentDefault,
  setMainLoopModelOverride,
} from "../../bootstrap/state.js";
import { vetUserSpecifiedModel, getUserSpecifiedModelSetting } from "./smallFastModel.js";
import { getEnvDefaultModel, isEnvDefaultModelGoverning } from "./defaultModel.js";
import { getAPIProvider } from "./providers.js";
import { strip1mSuffix } from "./modelIds.js";
import { getCanonicalName } from "./canonicalModelName.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { supportsAutoModeIfActive } from "./modelAccessCheck.js";

//@ chunk-4r745zza.js:768-1458 placement
/**
 * 按管理员固定调整
 */
function steerAdminPins(o) {
  let providerTierDefaults = buildProviderTierDefaults(o);
  if (providerTierDefaults === undefined) return;
  let modelOverrides = getInitialSettings_2().modelOverrides;
  for (let r of collectUnpinnedTiers(providerTierDefaults, modelOverrides)) {
    let { documentTarget, fromDocument } = providerTierDefaults[r.tier];
    let id = documentTarget?.modelId ?? catalogEntriesByFirstPartyId[r.defaultKey][o];
    if (id === null || enforcedAllowlistLeavesOut(id)) continue;
    let d = predecessorsInTier(r.defaultKey, r.tier, documentTarget !== undefined);
    let index = d.findIndex((m) => {
      let p = catalogEntriesByFirstPartyId[m][o];
      return p !== null && (isModelRemappedOrRetired(p) || isModelDeprecated(p));
    });
    let k = index < 0 ? d : d.slice(0, index);
    let E = new Set(k.filter((m) => Boolean(modelOverrides?.[catalogEntriesByFirstPartyId[m].firstParty])));
    let g =
      fromDocument === true
        ? k.find((m) => E.has(m) && !enforcedAllowlistLeavesOut(String(getModelStrings()[m])))
        : undefined;
    let v = [
      documentTarget === undefined
        ? defaultModelWithMarketingName(r.defaultKey, id)
        : {
            id,
            name: documentTarget.name,
          },
      ...(g === undefined ? k : k.slice(0, k.indexOf(g))).flatMap((m) => {
        let id = catalogEntriesByFirstPartyId[m][o];
        return id === null || E.has(m) || enforcedAllowlistLeavesOut(id)
          ? []
          : [defaultModelWithMarketingName(m, id)];
      }),
      ...(g === undefined ? [] : [defaultModelWithMarketingName(g, String(getModelStrings()[g]))]),
    ];
    registerFallbackLadder(o, r.tier, r.envVar, v);
  }
}
//@ chunk-4r745zza.js:1458-1524 placement
function defaultModelWithMarketingName(o, id) {
  let firstParty = catalogEntriesByFirstPartyId[o].firstParty;
  return {
    id,
    name: getMarketingNameForModel(firstParty) ?? firstParty,
  };
}
//@ chunk-4r745zza.js:1524-1589 placement
var TIER_LABELS = {
  fable: "Fable",
  sonnet: "Sonnet",
  opus: "Opus",
  haiku: "Haiku",
};
//@ chunk-4r745zza.js:1589-1808 placement
async function withProbeDeadline(o, l, f = STARTUP_PROBE_DEADLINE_MS) {
  let r;
  try {
    return await Promise.race([
      l,
      new Promise((resolve) => {
        r = setTimeout(
          (u, n, d) => {
            logForDebugging(`[3p-probe] ${n} hit ${d}ms deadline; proceeding without it`);
            u([]);
          },
          f,
          resolve,
          o,
          f,
        );
      }),
    ]);
  } finally {
    clearTimeout(r);
  }
}
//@ chunk-4r745zza.js:1808-1971 placement = createFallbackStorage (0.51)
/**
 * 在总时限内依次探测某提供者的回退默认值与文档默认值（第二次用剩余时间），返回两者结果；属于第三方提供者默认模型探测，误归 secureStorage（旧版名 createFallbackStorage 错配）。
 */
async function probeProviderDefaults(o, l, f, r = STARTUP_PROBE_DEADLINE_MS) {
  let now = Date.now();
  let u = await withProbeDeadline(`${o}-fallback`, l(), r);
  let n = r - (Date.now() - now);
  let d = n > 0 ? await withProbeDeadline(`${o}-document-default`, f(), n) : [];
  return [u, d];
}
//@ chunk-4r745zza.js:1971-2385 placement
/**
 * 默认模型环境变量是否由用户设置
 */
function isDefaultModelEnvUserSet(envVar) {
  switch (envVar) {
    case "ANTHROPIC_DEFAULT_SONNET_MODEL":
      return env.ANTHROPIC_DEFAULT_SONNET_MODEL !== undefined && !userConfiguredDefault("sonnet");
    case "ANTHROPIC_DEFAULT_OPUS_MODEL":
      return env.ANTHROPIC_DEFAULT_OPUS_MODEL !== undefined && !userConfiguredDefault("opus");
    case "ANTHROPIC_DEFAULT_HAIKU_MODEL":
      return env.ANTHROPIC_DEFAULT_HAIKU_MODEL !== undefined && !userConfiguredDefault("haiku");
    case "ANTHROPIC_SMALL_FAST_MODEL":
      return env.ANTHROPIC_SMALL_FAST_MODEL !== undefined;
    default:
      return false;
  }
}
//@ chunk-4r745zza.js:2385-2610 placement
/**
 * 设置默认模型环境变量
 */
function setDefaultModelEnv(envVar, l) {
  switch (envVar) {
    case "ANTHROPIC_DEFAULT_SONNET_MODEL":
      env.set("ANTHROPIC_DEFAULT_SONNET_MODEL", l);
      break;
    case "ANTHROPIC_DEFAULT_OPUS_MODEL":
      env.set("ANTHROPIC_DEFAULT_OPUS_MODEL", l);
      break;
    default:
      return;
  }
  recordProbedDefault(envVar, l);
  recordSeededDefault(envVar, l);
}
//@ chunk-4r745zza.js:2610-2754 placement
function captureAdmin3PSteeringSnapshot() {
  setAdmin3PSteeringSnapshot({
    sonnet: env.ANTHROPIC_DEFAULT_SONNET_MODEL !== undefined && !userConfiguredDefault("sonnet"),
    opus: env.ANTHROPIC_DEFAULT_OPUS_MODEL !== undefined && !userConfiguredDefault("opus"),
  });
}
//@ chunk-4r745zza.js:2754-3442 placement
/**
 * 第三方提供商（Bedrock/Vertex/Mantle）默认模型不可用时探测并回退到可用模型，记 tengu_*_default_fallback。
 */
async function apply3PDefaultFallbacks(o) {
  captureAdmin3PSteeringSnapshot();
  let trimmed = o?.pendingUserModel?.trim();
  let r = vetUserSpecifiedModel(
    trimmed === "default" || trimmed === "inherit" || trimmed === "" ? undefined : (trimmed ?? undefined),
  );
  let envDefaultModel = getEnvDefaultModel();
  let u =
    r != null && r !== ""
      ? r
      : trimmed !== undefined && r == null
        ? (envDefaultModel ?? undefined)
        : (getUserSpecifiedModelSetting() ?? envDefaultModel ?? undefined);
  switch (getAPIProvider()) {
    case "bedrock":
      return {
        lines: await applyBedrockFallbacks(u),
        hasHardFailure: false,
      };
    case "vertex":
      return {
        lines: await applyVertexFallbacks(u),
        hasHardFailure: false,
      };
    case "mantle": {
      let n = false;
      if (envDefaultModel !== null) {
        let e = strip1mSuffix(envDefaultModel.trim().toLowerCase());
        n =
          !(
            e === "opus" ||
            e === "best" ||
            getCanonicalName(e) ===
              getCanonicalName(catalogEntriesByFirstPartyId[DEFAULT_MANTLE_OPUS_KEY].firstParty)
          ) && isEnvDefaultModelGoverning();
      }
      let d = (r != null && r !== "") || getUserSpecifiedModelSetting() != null || n;
      return applyMantleFallbacks(d);
    }
    case "foundry": {
      let providerTierDefaults = buildProviderTierDefaults("foundry");
      let d = providerTierDefaults && seedEnvDefaultForUserPin(u, providerTierDefaults);
      if (d && !isDefaultModelEnvUserSet(d.envVar)) setDefaultModelEnv(d.envVar, d.value);
      steerAdminPins("foundry");
      return {
        lines: [],
        hasHardFailure: false,
      };
    }
    default:
      return {
        lines: [],
        hasHardFailure: false,
      };
  }
}
//@ chunk-4r745zza.js:3442-3812 placement
/**
 * 记录文档默认回退
 */
function recordDocumentFallbacks(o, l) {
  let f = [];
  for (let r of o) {
    recordProbeRefutedDocumentDefault(r.candidate);
    logEvent(l === "bedrock" ? "tengu_bedrock_default_fallback" : "tengu_vertex_default_fallback", {
      tier: fromEnum(r.tier ?? "default"),
      default_key: lit("document_default"),
      fallback_key: lit("tier_default"),
      cross_tier: lit("false"),
    });
    f.push(
      `Default model: ${r.name} not available on this account \u2014 not used as this session's default`,
    );
  }
  return f;
}
//@ chunk-4r745zza.js:3812-5007 placement
/**
 * 应用 Bedrock 默认回退
 */
async function applyBedrockFallbacks(o) {
  let { checkBedrockDefaultAvailability, checkBedrockDocumentDefaults, seedEnvDefaultForUserPin } =
    await import("./chunk-a7mvp1gg.js");
  let s = seedEnvDefaultForUserPin(o);
  if (s && !isDefaultModelEnvUserSet(s.envVar)) setDefaultModelEnv(s.envVar, s.value);
  let [u, n] = await probeProviderDefaults(
    "bedrock",
    checkBedrockDefaultAvailability,
    checkBedrockDocumentDefaults,
  );
  let d = [];
  for (let e of u) {
    if (isDefaultModelEnvUserSet(e.envVar)) continue;
    process.env[e.envVar] = e.fallbackBedrockId;
    recordProbedDefault(e.envVar, e.fallbackBedrockId);
    if (e.tier === "sonnet")
      applyThirdPartyCrossTierFallback("bedrock", e.fallbackBedrockId, supportsAutoModeIfActive);
    if (e.tier === "haiku") {
      if (!isDefaultModelEnvUserSet("ANTHROPIC_DEFAULT_HAIKU_MODEL"))
        process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = e.fallbackBedrockId;
    }
    if (e.crossTier) {
      process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME = e.fallbackName;
      process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION = `Opus unavailable \u2014 using ${e.fallbackName}`;
    }
    logEvent("tengu_bedrock_default_fallback", {
      tier: fromEnum(e.tier),
      default_key: e.documentTargetId ? lit("document_target") : fromEnum(e.defaultKey),
      fallback_key: fromEnum(e.fallbackKey),
      cross_tier: lit(e.crossTier ? "true" : "false"),
    });
    d.push(
      e.crossTier
        ? `${TIER_LABELS[e.tier]}: ${e.defaultName} not available \u2014 using ${e.fallbackName}. Enable ${e.defaultName} in the Bedrock console to upgrade.`
        : `${TIER_LABELS[e.tier]}: ${e.defaultName} not available \u2014 using ${e.fallbackName} for this session`,
    );
  }
  d.push(...recordDocumentFallbacks(n, "bedrock"));
  return d;
}
//@ chunk-4r745zza.js:5007-6185 placement
/**
 * 应用 Vertex 默认回退
 */
async function applyVertexFallbacks(o) {
  let { checkVertexDefaultAvailability, checkVertexDocumentDefaults, seedEnvDefaultForUserPin } =
    await import("./chunk-5wnerh16.js");
  let s = seedEnvDefaultForUserPin(o);
  if (s && !isDefaultModelEnvUserSet(s.envVar)) setDefaultModelEnv(s.envVar, s.value);
  let [u, n] = await probeProviderDefaults(
    "vertex",
    checkVertexDefaultAvailability,
    checkVertexDocumentDefaults,
  );
  let d = [];
  for (let e of u) {
    if (isDefaultModelEnvUserSet(e.envVar)) continue;
    process.env[e.envVar] = e.fallbackVertexId;
    recordProbedDefault(e.envVar, e.fallbackVertexId);
    if (e.tier === "sonnet")
      applyThirdPartyCrossTierFallback("vertex", e.fallbackVertexId, supportsAutoModeIfActive);
    if (e.tier === "haiku") {
      if (!isDefaultModelEnvUserSet("ANTHROPIC_DEFAULT_HAIKU_MODEL"))
        process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = e.fallbackVertexId;
    }
    if (e.crossTier) {
      process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME = e.fallbackName;
      process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION = `Opus unavailable \u2014 using ${e.fallbackName}`;
    }
    logEvent("tengu_vertex_default_fallback", {
      tier: fromEnum(e.tier),
      default_key: e.documentTargetId ? lit("document_target") : fromEnum(e.defaultKey),
      fallback_key: fromEnum(e.fallbackKey),
      cross_tier: lit(e.crossTier ? "true" : "false"),
    });
    d.push(
      e.crossTier
        ? `${TIER_LABELS[e.tier]}: ${e.defaultName} not available \u2014 using ${e.fallbackName}. Enable ${e.defaultName} in Model Garden to upgrade.`
        : `${TIER_LABELS[e.tier]}: ${e.defaultName} not available \u2014 using ${e.fallbackName} for this session`,
    );
  }
  d.push(...recordDocumentFallbacks(n, "vertex"));
  return d;
}
//@ chunk-4r745zza.js:6185-7417 placement
/**
 * 应用 Mantle 默认回退
 */
async function applyMantleFallbacks(o) {
  let { checkMantleDefaultAvailability } = await import("./chunk-paetrb4a.js");
  let f = await withProbeDeadline(
    "mantle-fallback",
    checkMantleDefaultAvailability(undefined, {
      userPinned: o,
    }),
  );
  let r = [];
  let hasHardFailure = false;
  let u;
  for (let n of f)
    if (n.kind === "adminPin") {
      if (!o) {
        setMainLoopModelOverride(n.adminMantleId);
        u = n.adminMantleId;
      }
    } else if (n.kind === "pinRefuted") {
      if (!o) {
        setMainLoopModelOverride(n.workingMantleId);
        u = n.workingMantleId;
        logEvent("tengu_mantle_default_fallback", {
          default_key: fromEnum(n.defaultKey),
          fallback_key: fromEnum(n.workingKey),
          admin_pin_refuted: lit("true"),
        });
        r.push(
          `${TIER_LABELS[n.tier]}: the admin-configured Opus model is not available on this account \u2014 using ${n.workingName} for this session`,
        );
      }
    } else if (n.kind === "fallback") {
      let d = false;
      if (!isDefaultModelEnvUserSet(n.envVar)) {
        process.env[n.envVar] = n.fallbackMantleId;
        recordProbedDefault(n.envVar, n.fallbackMantleId);
        d = true;
      }
      if (!o) {
        setMainLoopModelOverride(n.fallbackMantleId);
        u = n.fallbackMantleId;
        d = true;
      }
      if (d) {
        logEvent("tengu_mantle_default_fallback", {
          default_key: fromEnum(n.defaultKey),
          fallback_key: fromEnum(n.fallbackKey),
        });
        r.push(
          `${TIER_LABELS[n.tier]}: ${n.defaultName} not available \u2014 using ${n.fallbackName} for this session`,
        );
      }
    } else {
      hasHardFailure = true;
      logEvent("tengu_mantle_default_fallback", {
        default_key: lit("exhausted"),
      });
      r.push(
        `${TIER_LABELS[n.tier]}: no accessible model (tried ${n.triedNames.join(", ")}). Enable ${n.defaultName} in Amazon Bedrock (Mantle).`,
      );
    }
  return {
    lines: r,
    hasHardFailure,
    mantleOverride: u,
  };
}
export { TIER_LABELS, apply3PDefaultFallbacks, withProbeDeadline, captureAdmin3PSteeringSnapshot };

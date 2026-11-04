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
function steerAdminPins(provider) {
  let tierConfig = buildProviderTierDefaults(provider);
  if (tierConfig === undefined) return;
  let modelOverrides = getInitialSettings_2().modelOverrides;
  for (let tier of collectUnpinnedTiers(tierConfig, modelOverrides)) {
    let { documentTarget, fromDocument } = tierConfig[tier.tier];
    let id = documentTarget?.modelId ?? catalogEntriesByFirstPartyId[tier.defaultKey][provider];
    if (id === null || enforcedAllowlistLeavesOut(id)) continue;
    let predecessors = predecessorsInTier(tier.defaultKey, tier.tier, documentTarget !== undefined);
    let index = predecessors.findIndex((key) => {
      let modelId = catalogEntriesByFirstPartyId[key][provider];
      return modelId !== null && (isModelRemappedOrRetired(modelId) || isModelDeprecated(modelId));
    });
    let kept = index < 0 ? predecessors : predecessors.slice(0, index);
    let overridden = new Set(
      kept.filter((key) => Boolean(modelOverrides?.[catalogEntriesByFirstPartyId[key].firstParty])),
    );
    let adminPinned =
      fromDocument === true
        ? kept.find(
            (key) => overridden.has(key) && !enforcedAllowlistLeavesOut(String(getModelStrings()[key])),
          )
        : undefined;
    let rungs = [
      documentTarget === undefined
        ? defaultModelWithMarketingName(tier.defaultKey, id)
        : {
            id,
            name: documentTarget.name,
          },
      ...(adminPinned === undefined ? kept : kept.slice(0, kept.indexOf(adminPinned))).flatMap((key) => {
        let id = catalogEntriesByFirstPartyId[key][provider];
        return id === null || overridden.has(key) || enforcedAllowlistLeavesOut(id)
          ? []
          : [defaultModelWithMarketingName(key, id)];
      }),
      ...(adminPinned === undefined
        ? []
        : [defaultModelWithMarketingName(adminPinned, String(getModelStrings()[adminPinned]))]),
    ];
    registerFallbackLadder(provider, tier.tier, tier.envVar, rungs);
  }
}
//@ chunk-4r745zza.js:1458-1524 placement
function defaultModelWithMarketingName(key, id) {
  let firstParty = catalogEntriesByFirstPartyId[key].firstParty;
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
async function withProbeDeadline(label, promise, deadlineMs = STARTUP_PROBE_DEADLINE_MS) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(
          (resolve, name, timeout) => {
            logForDebugging(`[3p-probe] ${name} hit ${timeout}ms deadline; proceeding without it`);
            resolve([]);
          },
          deadlineMs,
          resolve,
          label,
          deadlineMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
//@ chunk-4r745zza.js:1808-1971 placement = createFallbackStorage (0.51)
/**
 * 在总时限内依次探测某提供者的回退默认值与文档默认值（第二次用剩余时间），返回两者结果；属于第三方提供者默认模型探测，误归 secureStorage（旧版名 createFallbackStorage 错配）。
 */
async function probeProviderDefaults(
  provider,
  availabilityProbe,
  documentProbe,
  deadlineMs = STARTUP_PROBE_DEADLINE_MS,
) {
  let now = Date.now();
  let availability = await withProbeDeadline(`${provider}-fallback`, availabilityProbe(), deadlineMs);
  let remaining = deadlineMs - (Date.now() - now);
  let documents =
    remaining > 0 ? await withProbeDeadline(`${provider}-document-default`, documentProbe(), remaining) : [];
  return [availability, documents];
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
function setDefaultModelEnv(envVar, value) {
  switch (envVar) {
    case "ANTHROPIC_DEFAULT_SONNET_MODEL":
      env.set("ANTHROPIC_DEFAULT_SONNET_MODEL", value);
      break;
    case "ANTHROPIC_DEFAULT_OPUS_MODEL":
      env.set("ANTHROPIC_DEFAULT_OPUS_MODEL", value);
      break;
    default:
      return;
  }
  recordProbedDefault(envVar, value);
  recordSeededDefault(envVar, value);
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
async function apply3PDefaultFallbacks(options) {
  captureAdmin3PSteeringSnapshot();
  let trimmed = options?.pendingUserModel?.trim();
  let pendingUserModel = vetUserSpecifiedModel(
    trimmed === "default" || trimmed === "inherit" || trimmed === "" ? undefined : (trimmed ?? undefined),
  );
  let envDefaultModel = getEnvDefaultModel();
  let baselineModel =
    pendingUserModel != null && pendingUserModel !== ""
      ? pendingUserModel
      : trimmed !== undefined && pendingUserModel == null
        ? (envDefaultModel ?? undefined)
        : (getUserSpecifiedModelSetting() ?? envDefaultModel ?? undefined);
  switch (getAPIProvider()) {
    case "bedrock":
      return {
        lines: await applyBedrockFallbacks(baselineModel),
        hasHardFailure: false,
      };
    case "vertex":
      return {
        lines: await applyVertexFallbacks(baselineModel),
        hasHardFailure: false,
      };
    case "mantle": {
      let envGoverning = false;
      if (envDefaultModel !== null) {
        let envId = strip1mSuffix(envDefaultModel.trim().toLowerCase());
        envGoverning =
          !(
            envId === "opus" ||
            envId === "best" ||
            getCanonicalName(envId) ===
              getCanonicalName(catalogEntriesByFirstPartyId[DEFAULT_MANTLE_OPUS_KEY].firstParty)
          ) && isEnvDefaultModelGoverning();
      }
      let userPinned =
        (pendingUserModel != null && pendingUserModel !== "") ||
        getUserSpecifiedModelSetting() != null ||
        envGoverning;
      return applyMantleFallbacks(userPinned);
    }
    case "foundry": {
      let tierConfig = buildProviderTierDefaults("foundry");
      let pin = tierConfig && seedEnvDefaultForUserPin(baselineModel, tierConfig);
      if (pin && !isDefaultModelEnvUserSet(pin.envVar)) setDefaultModelEnv(pin.envVar, pin.value);
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
function recordDocumentFallbacks(candidates, provider) {
  let lines = [];
  for (let candidate of candidates) {
    recordProbeRefutedDocumentDefault(candidate.candidate);
    logEvent(provider === "bedrock" ? "tengu_bedrock_default_fallback" : "tengu_vertex_default_fallback", {
      tier: fromEnum(candidate.tier ?? "default"),
      default_key: lit("document_default"),
      fallback_key: lit("tier_default"),
      cross_tier: lit("false"),
    });
    lines.push(
      `Default model: ${candidate.name} not available on this account \u2014 not used as this session's default`,
    );
  }
  return lines;
}
//@ chunk-4r745zza.js:3812-5007 placement
/**
 * 应用 Bedrock 默认回退
 */
async function applyBedrockFallbacks(baselineModel) {
  let { checkBedrockDefaultAvailability, checkBedrockDocumentDefaults, seedEnvDefaultForUserPin } =
    await import("./bedrockDefaultCheck.js");
  let pin = seedEnvDefaultForUserPin(baselineModel);
  if (pin && !isDefaultModelEnvUserSet(pin.envVar)) setDefaultModelEnv(pin.envVar, pin.value);
  let [tierFallbacks, documentFallbacks] = await probeProviderDefaults(
    "bedrock",
    checkBedrockDefaultAvailability,
    checkBedrockDocumentDefaults,
  );
  let lines = [];
  for (let fallback of tierFallbacks) {
    if (isDefaultModelEnvUserSet(fallback.envVar)) continue;
    process.env[fallback.envVar] = fallback.fallbackBedrockId;
    recordProbedDefault(fallback.envVar, fallback.fallbackBedrockId);
    if (fallback.tier === "sonnet")
      applyThirdPartyCrossTierFallback("bedrock", fallback.fallbackBedrockId, supportsAutoModeIfActive);
    if (fallback.tier === "haiku") {
      if (!isDefaultModelEnvUserSet("ANTHROPIC_DEFAULT_HAIKU_MODEL"))
        process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = fallback.fallbackBedrockId;
    }
    if (fallback.crossTier) {
      process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME = fallback.fallbackName;
      process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION = `Opus unavailable \u2014 using ${fallback.fallbackName}`;
    }
    logEvent("tengu_bedrock_default_fallback", {
      tier: fromEnum(fallback.tier),
      default_key: fallback.documentTargetId ? lit("document_target") : fromEnum(fallback.defaultKey),
      fallback_key: fromEnum(fallback.fallbackKey),
      cross_tier: lit(fallback.crossTier ? "true" : "false"),
    });
    lines.push(
      fallback.crossTier
        ? `${TIER_LABELS[fallback.tier]}: ${fallback.defaultName} not available \u2014 using ${fallback.fallbackName}. Enable ${fallback.defaultName} in the Bedrock console to upgrade.`
        : `${TIER_LABELS[fallback.tier]}: ${fallback.defaultName} not available \u2014 using ${fallback.fallbackName} for this session`,
    );
  }
  lines.push(...recordDocumentFallbacks(documentFallbacks, "bedrock"));
  return lines;
}
//@ chunk-4r745zza.js:5007-6185 placement
/**
 * 应用 Vertex 默认回退
 */
async function applyVertexFallbacks(baselineModel) {
  let { checkVertexDefaultAvailability, checkVertexDocumentDefaults, seedEnvDefaultForUserPin } =
    await import("./checkVertexDefaultAvailability.lazy.js");
  let pin = seedEnvDefaultForUserPin(baselineModel);
  if (pin && !isDefaultModelEnvUserSet(pin.envVar)) setDefaultModelEnv(pin.envVar, pin.value);
  let [tierFallbacks, documentFallbacks] = await probeProviderDefaults(
    "vertex",
    checkVertexDefaultAvailability,
    checkVertexDocumentDefaults,
  );
  let lines = [];
  for (let fallback of tierFallbacks) {
    if (isDefaultModelEnvUserSet(fallback.envVar)) continue;
    process.env[fallback.envVar] = fallback.fallbackVertexId;
    recordProbedDefault(fallback.envVar, fallback.fallbackVertexId);
    if (fallback.tier === "sonnet")
      applyThirdPartyCrossTierFallback("vertex", fallback.fallbackVertexId, supportsAutoModeIfActive);
    if (fallback.tier === "haiku") {
      if (!isDefaultModelEnvUserSet("ANTHROPIC_DEFAULT_HAIKU_MODEL"))
        process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = fallback.fallbackVertexId;
    }
    if (fallback.crossTier) {
      process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME = fallback.fallbackName;
      process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION = `Opus unavailable \u2014 using ${fallback.fallbackName}`;
    }
    logEvent("tengu_vertex_default_fallback", {
      tier: fromEnum(fallback.tier),
      default_key: fallback.documentTargetId ? lit("document_target") : fromEnum(fallback.defaultKey),
      fallback_key: fromEnum(fallback.fallbackKey),
      cross_tier: lit(fallback.crossTier ? "true" : "false"),
    });
    lines.push(
      fallback.crossTier
        ? `${TIER_LABELS[fallback.tier]}: ${fallback.defaultName} not available \u2014 using ${fallback.fallbackName}. Enable ${fallback.defaultName} in Model Garden to upgrade.`
        : `${TIER_LABELS[fallback.tier]}: ${fallback.defaultName} not available \u2014 using ${fallback.fallbackName} for this session`,
    );
  }
  lines.push(...recordDocumentFallbacks(documentFallbacks, "vertex"));
  return lines;
}
//@ chunk-4r745zza.js:6185-7417 placement
/**
 * 应用 Mantle 默认回退
 */
async function applyMantleFallbacks(userPinned) {
  let { checkMantleDefaultAvailability } = await import("./checkMantleDefaultAvailability.lazy.js");
  let results = await withProbeDeadline(
    "mantle-fallback",
    checkMantleDefaultAvailability(undefined, {
      userPinned,
    }),
  );
  let lines = [];
  let hasHardFailure = false;
  let mantleOverride;
  for (let result of results)
    if (result.kind === "adminPin") {
      if (!userPinned) {
        setMainLoopModelOverride(result.adminMantleId);
        mantleOverride = result.adminMantleId;
      }
    } else if (result.kind === "pinRefuted") {
      if (!userPinned) {
        setMainLoopModelOverride(result.workingMantleId);
        mantleOverride = result.workingMantleId;
        logEvent("tengu_mantle_default_fallback", {
          default_key: fromEnum(result.defaultKey),
          fallback_key: fromEnum(result.workingKey),
          admin_pin_refuted: lit("true"),
        });
        lines.push(
          `${TIER_LABELS[result.tier]}: the admin-configured Opus model is not available on this account \u2014 using ${result.workingName} for this session`,
        );
      }
    } else if (result.kind === "fallback") {
      let applied = false;
      if (!isDefaultModelEnvUserSet(result.envVar)) {
        process.env[result.envVar] = result.fallbackMantleId;
        recordProbedDefault(result.envVar, result.fallbackMantleId);
        applied = true;
      }
      if (!userPinned) {
        setMainLoopModelOverride(result.fallbackMantleId);
        mantleOverride = result.fallbackMantleId;
        applied = true;
      }
      if (applied) {
        logEvent("tengu_mantle_default_fallback", {
          default_key: fromEnum(result.defaultKey),
          fallback_key: fromEnum(result.fallbackKey),
        });
        lines.push(
          `${TIER_LABELS[result.tier]}: ${result.defaultName} not available \u2014 using ${result.fallbackName} for this session`,
        );
      }
    } else {
      hasHardFailure = true;
      logEvent("tengu_mantle_default_fallback", {
        default_key: lit("exhausted"),
      });
      lines.push(
        `${TIER_LABELS[result.tier]}: no accessible model (tried ${result.triedNames.join(", ")}). Enable ${result.defaultName} in Amazon Bedrock (Mantle).`,
      );
    }
  return {
    lines,
    hasHardFailure,
    mantleOverride,
  };
}
export { TIER_LABELS, apply3PDefaultFallbacks, withProbeDeadline, captureAdmin3PSteeringSnapshot };

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
import { No } from "./modelCatalog.js";
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
import { Lt } from "./modelIds.js";
import { getCanonicalName } from "./canonicalModelName.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { fxe } from "./modelAccessCheck.js";

/**
 * 按管理员固定调整
 */
//@ chunk-4r745zza.js:768-1458 placement
function steerAdminPins(o) {
  let l = buildProviderTierDefaults(o);
  if (l === void 0) return;
  let modelOverrides = getInitialSettings_2().modelOverrides;
  for (let r of collectUnpinnedTiers(l, modelOverrides)) {
    let { documentTarget: documentTarget, fromDocument: fromDocument } = l[r.tier],
      n = documentTarget?.modelId ?? No[r.defaultKey][o];
    if (n === null || enforcedAllowlistLeavesOut(n)) continue;
    let d = predecessorsInTier(r.defaultKey, r.tier, documentTarget !== void 0),
      index = d.findIndex((m) => {
        let p = No[m][o];
        return p !== null && (isModelRemappedOrRetired(p) || isModelDeprecated(p));
      }),
      k = index < 0 ? d : d.slice(0, index),
      E = new Set(k.filter((m) => Boolean(modelOverrides?.[No[m].firstParty]))),
      g =
        fromDocument === !0
          ? k.find((m) => E.has(m) && !enforcedAllowlistLeavesOut(String(getModelStrings()[m])))
          : void 0,
      v = [
        documentTarget === void 0 ? D(r.defaultKey, n) : { id: n, name: documentTarget.name },
        ...(g === void 0 ? k : k.slice(0, k.indexOf(g))).flatMap((m) => {
          let p = No[m][o];
          return p === null || E.has(m) || enforcedAllowlistLeavesOut(p) ? [] : [D(m, p)];
        }),
        ...(g === void 0 ? [] : [D(g, String(getModelStrings()[g]))]),
      ];
    registerFallbackLadder(o, r.tier, r.envVar, v);
  }
}
//@ chunk-4r745zza.js:1458-1524 placement
function D(o, l) {
  let firstParty = No[o].firstParty;
  return { id: l, name: getMarketingNameForModel(firstParty) ?? firstParty };
}
//@ chunk-4r745zza.js:1524-1589 placement
var TIER_LABELS = { fable: "Fable", sonnet: "Sonnet", opus: "Opus", haiku: "Haiku" };
//@ chunk-4r745zza.js:1589-1808 placement
async function withProbeDeadline(o, l, f = STARTUP_PROBE_DEADLINE_MS) {
  let r;
  try {
    return await Promise.race([
      l,
      new Promise((s) => {
        r = setTimeout(
          (u, n, d) => {
            (logForDebugging(`[3p-probe] ${n} hit ${d}ms deadline; proceeding without it`), u([]));
          },
          f,
          s,
          o,
          f,
        );
      }),
    ]);
  } finally {
    clearTimeout(r);
  }
}
/**
 * 在总时限内依次探测某提供者的回退默认值与文档默认值（第二次用剩余时间），返回两者结果；属于第三方提供者默认模型探测，误归 secureStorage（旧版名 createFallbackStorage 错配）。
 */
//@ chunk-4r745zza.js:1808-1971 placement = createFallbackStorage (0.51)
async function probeProviderDefaults(o, l, f, r = STARTUP_PROBE_DEADLINE_MS) {
  let now = Date.now(),
    u = await withProbeDeadline(`${o}-fallback`, l(), r),
    n = r - (Date.now() - now),
    d = n > 0 ? await withProbeDeadline(`${o}-document-default`, f(), n) : [];
  return [u, d];
}
/**
 * 默认模型环境变量是否由用户设置
 */
//@ chunk-4r745zza.js:1971-2385 placement
function isDefaultModelEnvUserSet(o) {
  switch (o) {
    case "ANTHROPIC_DEFAULT_SONNET_MODEL":
      return env.ANTHROPIC_DEFAULT_SONNET_MODEL !== void 0 && !userConfiguredDefault("sonnet");
    case "ANTHROPIC_DEFAULT_OPUS_MODEL":
      return env.ANTHROPIC_DEFAULT_OPUS_MODEL !== void 0 && !userConfiguredDefault("opus");
    case "ANTHROPIC_DEFAULT_HAIKU_MODEL":
      return env.ANTHROPIC_DEFAULT_HAIKU_MODEL !== void 0 && !userConfiguredDefault("haiku");
    case "ANTHROPIC_SMALL_FAST_MODEL":
      return env.ANTHROPIC_SMALL_FAST_MODEL !== void 0;
    default:
      return !1;
  }
}
/**
 * 设置默认模型环境变量
 */
//@ chunk-4r745zza.js:2385-2610 placement
function setDefaultModelEnv(o, l) {
  switch (o) {
    case "ANTHROPIC_DEFAULT_SONNET_MODEL":
      env.set("ANTHROPIC_DEFAULT_SONNET_MODEL", l);
      break;
    case "ANTHROPIC_DEFAULT_OPUS_MODEL":
      env.set("ANTHROPIC_DEFAULT_OPUS_MODEL", l);
      break;
    default:
      return;
  }
  (recordProbedDefault(o, l), recordSeededDefault(o, l));
}
//@ chunk-4r745zza.js:2610-2754 placement
function captureAdmin3PSteeringSnapshot() {
  setAdmin3PSteeringSnapshot({
    sonnet: env.ANTHROPIC_DEFAULT_SONNET_MODEL !== void 0 && !userConfiguredDefault("sonnet"),
    opus: env.ANTHROPIC_DEFAULT_OPUS_MODEL !== void 0 && !userConfiguredDefault("opus"),
  });
}
/**
 * 第三方提供商（Bedrock/Vertex/Mantle）默认模型不可用时探测并回退到可用模型，记 tengu_*_default_fallback。
 */
//@ chunk-4r745zza.js:2754-3442 placement
async function apply3PDefaultFallbacks(o) {
  captureAdmin3PSteeringSnapshot();
  let l = o?.pendingUserModel?.trim(),
    r = vetUserSpecifiedModel(l === "default" || l === "inherit" || l === "" ? void 0 : (l ?? void 0)),
    s = getEnvDefaultModel(),
    u =
      r != null && r !== ""
        ? r
        : l !== void 0 && r == null
          ? (s ?? void 0)
          : (getUserSpecifiedModelSetting() ?? s ?? void 0);
  switch (getAPIProvider()) {
    case "bedrock":
      return { lines: await applyBedrockFallbacks(u), hasHardFailure: !1 };
    case "vertex":
      return { lines: await applyVertexFallbacks(u), hasHardFailure: !1 };
    case "mantle": {
      let n = !1;
      if (s !== null) {
        let e = Lt(s.trim().toLowerCase());
        n =
          !(
            e === "opus" ||
            e === "best" ||
            getCanonicalName(e) === getCanonicalName(No[DEFAULT_MANTLE_OPUS_KEY].firstParty)
          ) && isEnvDefaultModelGoverning();
      }
      let d = (r != null && r !== "") || getUserSpecifiedModelSetting() != null || n;
      return applyMantleFallbacks(d);
    }
    case "foundry": {
      let n = buildProviderTierDefaults("foundry"),
        d = n && seedEnvDefaultForUserPin(u, n);
      if (d && !isDefaultModelEnvUserSet(d.envVar)) setDefaultModelEnv(d.envVar, d.value);
      return (steerAdminPins("foundry"), { lines: [], hasHardFailure: !1 });
    }
    default:
      return { lines: [], hasHardFailure: !1 };
  }
}
/**
 * 记录文档默认回退
 */
//@ chunk-4r745zza.js:3442-3812 placement
function recordDocumentFallbacks(o, l) {
  let f = [];
  for (let r of o)
    (recordProbeRefutedDocumentDefault(r.candidate),
      logEvent(l === "bedrock" ? "tengu_bedrock_default_fallback" : "tengu_vertex_default_fallback", {
        tier: fromEnum(r.tier ?? "default"),
        default_key: lit("document_default"),
        fallback_key: lit("tier_default"),
        cross_tier: lit("false"),
      }),
      f.push(
        `Default model: ${r.name} not available on this account \u2014 not used as this session's default`,
      ));
  return f;
}
/**
 * 应用 Bedrock 默认回退
 */
//@ chunk-4r745zza.js:3812-5007 placement
async function applyBedrockFallbacks(o) {
  let {
      checkBedrockDefaultAvailability: checkBedrockDefaultAvailability,
      checkBedrockDocumentDefaults: checkBedrockDocumentDefaults,
      seedEnvDefaultForUserPin: seedEnvDefaultForUserPin,
    } = await import("./chunk-a7mvp1gg.js"),
    s = seedEnvDefaultForUserPin(o);
  if (s && !isDefaultModelEnvUserSet(s.envVar)) setDefaultModelEnv(s.envVar, s.value);
  let [u, n] = await probeProviderDefaults(
      "bedrock",
      checkBedrockDefaultAvailability,
      checkBedrockDocumentDefaults,
    ),
    d = [];
  for (let e of u) {
    if (isDefaultModelEnvUserSet(e.envVar)) continue;
    if (
      ((process.env[e.envVar] = e.fallbackBedrockId),
      recordProbedDefault(e.envVar, e.fallbackBedrockId),
      e.tier === "sonnet")
    )
      applyThirdPartyCrossTierFallback("bedrock", e.fallbackBedrockId, fxe);
    if (e.tier === "haiku") {
      if (!isDefaultModelEnvUserSet("ANTHROPIC_DEFAULT_HAIKU_MODEL"))
        process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = e.fallbackBedrockId;
    }
    if (e.crossTier)
      ((process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME = e.fallbackName),
        (process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION = `Opus unavailable \u2014 using ${e.fallbackName}`));
    (logEvent("tengu_bedrock_default_fallback", {
      tier: fromEnum(e.tier),
      default_key: e.documentTargetId ? lit("document_target") : fromEnum(e.defaultKey),
      fallback_key: fromEnum(e.fallbackKey),
      cross_tier: lit(e.crossTier ? "true" : "false"),
    }),
      d.push(
        e.crossTier
          ? `${TIER_LABELS[e.tier]}: ${e.defaultName} not available \u2014 using ${e.fallbackName}. Enable ${e.defaultName} in the Bedrock console to upgrade.`
          : `${TIER_LABELS[e.tier]}: ${e.defaultName} not available \u2014 using ${e.fallbackName} for this session`,
      ));
  }
  return (d.push(...recordDocumentFallbacks(n, "bedrock")), d);
}
/**
 * 应用 Vertex 默认回退
 */
//@ chunk-4r745zza.js:5007-6185 placement
async function applyVertexFallbacks(o) {
  let {
      checkVertexDefaultAvailability: checkVertexDefaultAvailability,
      checkVertexDocumentDefaults: checkVertexDocumentDefaults,
      seedEnvDefaultForUserPin: seedEnvDefaultForUserPin,
    } = await import("./chunk-5wnerh16.js"),
    s = seedEnvDefaultForUserPin(o);
  if (s && !isDefaultModelEnvUserSet(s.envVar)) setDefaultModelEnv(s.envVar, s.value);
  let [u, n] = await probeProviderDefaults(
      "vertex",
      checkVertexDefaultAvailability,
      checkVertexDocumentDefaults,
    ),
    d = [];
  for (let e of u) {
    if (isDefaultModelEnvUserSet(e.envVar)) continue;
    if (
      ((process.env[e.envVar] = e.fallbackVertexId),
      recordProbedDefault(e.envVar, e.fallbackVertexId),
      e.tier === "sonnet")
    )
      applyThirdPartyCrossTierFallback("vertex", e.fallbackVertexId, fxe);
    if (e.tier === "haiku") {
      if (!isDefaultModelEnvUserSet("ANTHROPIC_DEFAULT_HAIKU_MODEL"))
        process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = e.fallbackVertexId;
    }
    if (e.crossTier)
      ((process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME = e.fallbackName),
        (process.env.ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION = `Opus unavailable \u2014 using ${e.fallbackName}`));
    (logEvent("tengu_vertex_default_fallback", {
      tier: fromEnum(e.tier),
      default_key: e.documentTargetId ? lit("document_target") : fromEnum(e.defaultKey),
      fallback_key: fromEnum(e.fallbackKey),
      cross_tier: lit(e.crossTier ? "true" : "false"),
    }),
      d.push(
        e.crossTier
          ? `${TIER_LABELS[e.tier]}: ${e.defaultName} not available \u2014 using ${e.fallbackName}. Enable ${e.defaultName} in Model Garden to upgrade.`
          : `${TIER_LABELS[e.tier]}: ${e.defaultName} not available \u2014 using ${e.fallbackName} for this session`,
      ));
  }
  return (d.push(...recordDocumentFallbacks(n, "vertex")), d);
}
/**
 * 应用 Mantle 默认回退
 */
//@ chunk-4r745zza.js:6185-7417 placement
async function applyMantleFallbacks(o) {
  let { checkMantleDefaultAvailability: checkMantleDefaultAvailability } =
      await import("./chunk-paetrb4a.js"),
    f = await withProbeDeadline("mantle-fallback", checkMantleDefaultAvailability(void 0, { userPinned: o })),
    r = [],
    s = !1,
    u;
  for (let n of f)
    if (n.kind === "adminPin") {
      if (!o) (setMainLoopModelOverride(n.adminMantleId), (u = n.adminMantleId));
    } else if (n.kind === "pinRefuted") {
      if (!o)
        (setMainLoopModelOverride(n.workingMantleId),
          (u = n.workingMantleId),
          logEvent("tengu_mantle_default_fallback", {
            default_key: fromEnum(n.defaultKey),
            fallback_key: fromEnum(n.workingKey),
            admin_pin_refuted: lit("true"),
          }),
          r.push(
            `${TIER_LABELS[n.tier]}: the admin-configured Opus model is not available on this account \u2014 using ${n.workingName} for this session`,
          ));
    } else if (n.kind === "fallback") {
      let d = !1;
      if (!isDefaultModelEnvUserSet(n.envVar))
        ((process.env[n.envVar] = n.fallbackMantleId),
          recordProbedDefault(n.envVar, n.fallbackMantleId),
          (d = !0));
      if (!o) (setMainLoopModelOverride(n.fallbackMantleId), (u = n.fallbackMantleId), (d = !0));
      if (d)
        (logEvent("tengu_mantle_default_fallback", {
          default_key: fromEnum(n.defaultKey),
          fallback_key: fromEnum(n.fallbackKey),
        }),
          r.push(
            `${TIER_LABELS[n.tier]}: ${n.defaultName} not available \u2014 using ${n.fallbackName} for this session`,
          ));
    } else
      ((s = !0),
        logEvent("tengu_mantle_default_fallback", { default_key: lit("exhausted") }),
        r.push(
          `${TIER_LABELS[n.tier]}: no accessible model (tried ${n.triedNames.join(", ")}). Enable ${n.defaultName} in Amazon Bedrock (Mantle).`,
        ));
  return { lines: r, hasHardFailure: s, mantleOverride: u };
}

export { TIER_LABELS, apply3PDefaultFallbacks, withProbeDeadline, captureAdmin3PSteeringSnapshot };

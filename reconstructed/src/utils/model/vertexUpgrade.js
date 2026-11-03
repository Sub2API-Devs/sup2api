/**
 * utils/model/vertexUpgrade.ts
 *
 * 2.1.316 新增：Vertex 默认模型可用性检查与升级候选。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5wnerh16.js (12)
 * attribution: placement 12
 */
import {
  tierConfig,
  collectStalePins,
  enforcedAllowlistLeavesOut,
  leftOutDebugLine,
  seedEnvDefaultForUserPin,
  lastLiveRoundStart,
  collectUnpinnedTiers,
  predecessorsInTier,
  refuteUnavailableDocumentDefaults,
} from "./stalePins.js";
import { DEFAULT_VERTEX_OPUS_KEY, getMarketingNameForModel, DEFAULT_3P_SONNET_KEY } from "./model.js";
import { getAPIProvider } from "./providers.js";
import { env } from "../env.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromNumber, fromEnum } from "../../services/analytics/safeMetadata.js";
import { No } from "./modelCatalog.js";
import { logForDebugging } from "../debug.js";
import { telemetrySafeModelName } from "./telemetryModelName.js";
import { getInitialSettings_2 } from "../settings/settings.js";
import {
  markModelRefused,
  modelNotAvailableError,
  cmr,
  registerFallbackLadder,
} from "./modelUnavailability.js";
import {
  REFUSED_TTL_MS,
  findFirstAccessibleModel,
  _ze,
  checkRememberedModelAccess,
  bze,
  PACKAGE_INFO,
  getCustomHeaders,
} from "./thirdPartyModelAccess.js";
import { getModelStrings } from "./modelStrings.js";
import { documentNamesCloudDefault } from "./planModeModel.js";
import {
  getConfiguredVertexProjectId,
  isHostManagedProviderAuth,
  refreshGcpCredentialsIfNeeded,
} from "../auth.js";
import { getVertexRegionForModel, getVertexBaseUrlForRegion } from "../envUtils.js";
import {
  buildVertexGoogleAuth,
  suppressVertexAuthRejection,
  vertexResidualCredentialPins,
} from "../../services/api/vertexAuth.js";
import { bearerFromEnvOrHeaders, CLOUD_AUTH_SLOT } from "../../services/api/customHeaders.js";
import { getForwardableEnvHeaders } from "../../services/api/requestHeaders.js";
import { sendStartupModelCheck } from "./modelAccessCheck.js";

//@ chunk-5wnerh16.js:3691-3720 placement
function T() {
  return tierConfig(DEFAULT_VERTEX_OPUS_KEY);
}
//@ chunk-5wnerh16.js:3720-4564 placement
async function findVertexUpgradeCandidates() {
  if (getAPIProvider() !== "vertex") return [];
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return [];
  let e = collectStalePins(T());
  if (e.length === 0) return [];
  logEvent("tengu_vertex_upgrade_check", { stale_tiers: fromNumber(e.length) });
  let filtered = (
    await Promise.all(
      e.map(async (n) => {
        let vertex = No[n.defaultKey].vertex;
        if (vertex === null) return null;
        if (enforcedAllowlistLeavesOut(vertex))
          return (logForDebugging(`[vertex-upgrade] ${leftOutDebugLine(n.tier, "upgrade", [vertex])}`), null);
        let g = await probeVertexModel(vertex, { isDefault: !0, versionTooOld: "unavailable" });
        if (
          (logEvent("tengu_vertex_probe_result", {
            tier: fromEnum(n.tier),
            model_id: telemetrySafeModelName(vertex),
            accessible: g,
          }),
          !g)
        )
          return null;
        let v = getMarketingNameForModel(No[n.pinnedKey].firstParty),
          o = getMarketingNameForModel(No[n.defaultKey].firstParty);
        if (!v || !o) return null;
        return {
          tier: n.tier,
          envVar: n.envVar,
          fromKey: n.pinnedKey,
          fromMarketingName: v,
          toKey: n.defaultKey,
          toMarketingName: o,
          toVertexId: vertex,
        };
      }),
    )
  ).filter((n) => n !== null);
  return (
    logForDebugging(`[vertex-upgrade] tiersWithPin=${e.length} candidates=${filtered.length}`),
    filtered
  );
}
//@ chunk-5wnerh16.js:4564-4597 placement
function seedUserPinEnvDefault(e) {
  return seedEnvDefaultForUserPin(e, T());
}
//@ chunk-5wnerh16.js:4597-6038 placement
async function checkVertexDefaultAvailability() {
  if (getAPIProvider() !== "vertex") return [];
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return [];
  let e = lastLiveRoundStart(Date.now()),
    modelOverrides = getInitialSettings_2().modelOverrides,
    d = T(),
    n = collectUnpinnedTiers(d, modelOverrides);
  if (n.length === 0) return [];
  logEvent("tengu_vertex_default_check", { unpinned_tiers: fromNumber(n.length) });
  let any = n.some((o) => o.tier === "sonnet"),
    results = await Promise.all(
      n.map(async (o) => {
        let _ = No[o.defaultKey],
          documentTarget = d[o.tier].documentTarget,
          V = d[o.tier].fromDocument === !0,
          y = documentTarget?.modelId ?? _.vertex;
        if (y !== null && enforcedAllowlistLeavesOut(y))
          return (logForDebugging(`[vertex-fallback] ${leftOutDebugLine(o.tier, "check", [y])}`), null);
        await registerVertexLadder(o, modelOverrides, documentTarget, V, any);
        let p = {},
          b = await probeVertexModel(y, {
            isDefault: !0,
            ...(d[o.tier].fromDocument && { versionTooOld: "unavailable" }),
            onVerdict: (f, D) => {
              ((p.verdict = f), (p.at = D));
            },
          });
        if (
          (logEvent("tengu_vertex_probe_result", {
            tier: fromEnum(o.tier),
            model_id: telemetrySafeModelName(y),
            accessible: b,
          }),
          b || p.verdict === "temporary")
        )
          return null;
        if (y !== null && p.verdict === "refused")
          markModelRefused(y, modelNotAvailableError(y), (p.at ?? Date.now()) + REFUSED_TTL_MS);
        let r = await findVertexFallback(
          o.defaultKey,
          o.tier,
          modelOverrides,
          e,
          documentTarget !== void 0,
          V,
        );
        if (!r) return null;
        if (
          p.verdict !== "refused" &&
          r.answeredLive !== !0 &&
          r.adminMapped !== !0 &&
          !(await probeVertexModel(r.vertexId, { live: !0 }))
        )
          return null;
        let l = documentTarget?.name ?? getMarketingNameForModel(_.firstParty),
          x = getMarketingNameForModel(No[r.key].firstParty);
        if (!l || !x) return null;
        return {
          tier: o.tier,
          envVar: o.envVar,
          defaultKey: o.defaultKey,
          defaultName: l,
          ...(documentTarget !== void 0 && { documentTargetId: documentTarget.modelId }),
          fallbackKey: r.key,
          fallbackName: x,
          fallbackVertexId: r.vertexId,
          ...(r.crossTier && { crossTier: !0 }),
        };
      }),
    ),
    v = [];
  for (let o of results) if (o !== null) v.push(o);
  return (logForDebugging(`[vertex-fallback] unpinnedTiers=${n.length} fallbacks=${v.length}`), v);
}
/**
 * 为 Vertex 默认模型寻找可用的回退：按同档前代模型（排除已映射与被白名单排除者）及 Opus 跨档 Sonnet 默认依次探测，记录拒绝/可用结论，返回选中的键与 Vertex id。
 */
//@ chunk-5wnerh16.js:6038-7099 placement
async function findVertexFallback(defaultKey, tier, accessMap, deadline, isDefault = !1, versionTooOld = !1) {
  let isMapped = (f) => Boolean(accessMap?.[No[f].firstParty]),
    isUsable = (f) => isMapped(f) && !enforcedAllowlistLeavesOut(String(getModelStrings()[f])),
    predecessors = predecessorsInTier(defaultKey, tier, isDefault),
    adminMapped = versionTooOld ? predecessors.find(isUsable) : void 0,
    filtered = (
      adminMapped === void 0 ? predecessors : predecessors.slice(0, predecessors.indexOf(adminMapped))
    ).filter((f) => !isMapped(f)),
    filtered_2 = filtered.filter((f) => !P(f)),
    needsCrossTier = tier === "opus" && adminMapped === void 0,
    crossTierKeys = needsCrossTier && !P(DEFAULT_3P_SONNET_KEY) ? [DEFAULT_3P_SONNET_KEY] : [],
    mapped = filtered.filter(P).map((f) => String(No[f].vertex));
  if (needsCrossTier && P(DEFAULT_3P_SONNET_KEY))
    mapped.push(`${No[DEFAULT_3P_SONNET_KEY].vertex} (the cross-tier Sonnet default)`);
  if (mapped.length > 0) logForDebugging(`[vertex-fallback] ${leftOutDebugLine(tier, "fallback", mapped)}`);
  let answeredLive = new Set(),
    found = await findFirstAccessibleModel(
      [filtered_2, crossTierKeys],
      (f, D) => {
        let vertex = No[f].vertex;
        return probeVertexModel(vertex, {
          ...(D && { live: D }),
          ...(isDefault && f === defaultKey && { isDefault: !0 }),
          ...(versionTooOld && { versionTooOld: "unavailable" }),
          onVerdict: (k, h) => {
            if (k === "refused" && vertex !== null)
              markModelRefused(vertex, modelNotAvailableError(vertex), (h ?? Date.now()) + REFUSED_TTL_MS);
            else if (k === "accessible" && vertex !== null) {
              if ((cmr(vertex), h === void 0)) answeredLive.add(f);
            }
          },
        });
      },
      async (f) => {
        let vertex = No[f].vertex;
        if (vertex === null) return !1;
        let A = await getVertexCacheKey(vertex);
        return A !== void 0 && (await _ze(A, vertex))?.state === "refused";
      },
      deadline,
    );
  if (found === void 0)
    return adminMapped === void 0
      ? null
      : { key: adminMapped, vertexId: String(getModelStrings()[adminMapped]), adminMapped: !0 };
  return {
    key: found,
    vertexId: No[found].vertex,
    ...(crossTierKeys.includes(found) && { crossTier: !0 }),
    ...(answeredLive.has(found) && { answeredLive: !0 }),
  };
}
//@ chunk-5wnerh16.js:7099-7524 placement
async function checkVertexDocumentDefaults() {
  if (
    getAPIProvider() !== "vertex" ||
    env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST ||
    !documentNamesCloudDefault()
  )
    return [];
  let e = await refuteUnavailableDocumentDefaults(async (s, d) => {
    let n = {},
      u = await probeVertexModel(s, {
        isDefault: !0,
        versionTooOld: "unavailable",
        onVerdict: (g) => {
          n.verdict = g;
        },
      });
    return (
      logEvent("tengu_vertex_probe_result", {
        tier: fromEnum(d ?? "default"),
        model_id: telemetrySafeModelName(s),
        accessible: u,
      }),
      u || n.verdict === "temporary"
    );
  }, getInitialSettings_2().modelOverrides);
  return (logForDebugging(`[vertex-fallback] refutedDocumentDefaults=${e.length}`), e);
}
//@ chunk-5wnerh16.js:7524-7660 placement
async function probeVertexModel(e, s) {
  if (e === null) return (s?.onVerdict?.("refused"), !1);
  return (
    (await checkRememberedModelAccess(
      "vertex",
      await getVertexCacheKey(e),
      e,
      () => sendVertexStartupCheck(e),
      s,
    )) === "accessible"
  );
}
//@ chunk-5wnerh16.js:7660-7795 placement
async function rememberVertexModelAccess(e, s) {
  try {
    let d = await getVertexCacheKey(e);
    if (d !== void 0) await bze(d, e, s);
  } catch (error) {
    logForDebugging(`[3p-model-memory] vertex record failed: ${error}`);
  }
}
/**
 * 为 Vertex 某档注册回退阶梯（默认模型、前代模型、管理员映射或跨档 Sonnet），并把记忆中已被拒绝的阶梯模型标记为拒绝。
 */
//@ chunk-5wnerh16.js:7795-8720 placement
async function registerVertexLadder(tierInfo, accessMap, documentTarget, preferAdmin, includeCrossTier) {
  let toRung = (r) => {
      let l = No[r];
      return l.vertex === null
        ? void 0
        : { id: l.vertex, name: getMarketingNameForModel(l.firstParty) ?? l.firstParty };
    },
    head =
      documentTarget === void 0
        ? toRung(tierInfo.defaultKey)
        : { id: documentTarget.modelId, name: documentTarget.name };
  if (head === void 0) return;
  let isMapped = (r) => Boolean(accessMap?.[No[r].firstParty]),
    isUsable = (r) => isMapped(r) && !enforcedAllowlistLeavesOut(String(getModelStrings()[r])),
    toRungs = (r) => r.filter((l) => !P(l)).flatMap((l) => toRung(l) ?? []),
    predecessorRungs = (r, l) => toRungs(predecessorsInTier(r, l).filter((x) => !isMapped(x))),
    predecessors = predecessorsInTier(tierInfo.defaultKey, tierInfo.tier, documentTarget !== void 0),
    adminMapped = preferAdmin ? predecessors.find(isUsable) : void 0,
    rungs = [
      head,
      ...toRungs(
        (adminMapped === void 0
          ? predecessors
          : predecessors.slice(0, predecessors.indexOf(adminMapped))
        ).filter((r) => !isMapped(r)),
      ),
    ];
  if (adminMapped !== void 0)
    rungs.push({
      id: String(getModelStrings()[adminMapped]),
      name: getMarketingNameForModel(No[adminMapped].firstParty) ?? No[adminMapped].firstParty,
    });
  else if (tierInfo.tier === "opus") {
    let r = toRung(DEFAULT_3P_SONNET_KEY),
      l =
        r === void 0
          ? []
          : !P(DEFAULT_3P_SONNET_KEY)
            ? [r]
            : includeCrossTier
              ? predecessorRungs(DEFAULT_3P_SONNET_KEY, "sonnet")
              : [];
    rungs.push(...l.map((x) => ({ ...x, crossTier: !0 })));
  }
  (registerFallbackLadder("vertex", tierInfo.tier, tierInfo.envVar, rungs),
    await Promise.all(
      rungs.slice(1).map(async (r) => {
        let l = await getVertexCacheKey(r.id),
          x = l === void 0 ? void 0 : await _ze(l, r.id);
        if (x?.state === "refused")
          markModelRefused(r.id, modelNotAvailableError(r.id), x.at + REFUSED_TTL_MS);
      }),
    ).catch(() => {}));
}
//@ chunk-5wnerh16.js:8720-8972 placement
function getVertexCacheKey(e) {
  return PACKAGE_INFO("vertex", () => [
    env.ANTHROPIC_VERTEX_PROJECT_ID,
    getConfiguredVertexProjectId(),
    env.ANTHROPIC_GOOGLE_CLOUD_PROJECT,
    getVertexRegionForModel(e),
    env.ANTHROPIC_VERTEX_BASE_URL,
    env.GOOGLE_APPLICATION_CREDENTIALS,
    env.CLOUDSDK_CONFIG,
    env.CLAUDE_CODE_SKIP_VERTEX_AUTH ? "skip-auth" : void 0,
    getCustomHeaders(),
  ]);
}
/**
 * 用 AnthropicVertex 客户端（按需刷新 GCP 凭据、8 秒超时、不重试）发送启动模型检查请求；成功或 429 视为可用，其他错误返回不可用及错误。
 */
//@ chunk-5wnerh16.js:8972-9592 placement
async function sendVertexStartupCheck(e) {
  try {
    let [{ AnthropicVertex: AnthropicVertexClass }, { getProxyFetchOptions: getProxyFetchOptions }] =
        await Promise.all([import("./chunk-xa96axyz.js"), import("./chunk-amdegp7s.js")]),
      CLAUDE_CODE_SKIP_VERTEX_AUTH = env.CLAUDE_CODE_SKIP_VERTEX_AUTH,
      hostManaged = isHostManagedProviderAuth();
    if (!CLAUDE_CODE_SKIP_VERTEX_AUTH && !hostManaged) await refreshGcpCredentialsIfNeeded();
    let googleAuth = await buildVertexGoogleAuth(
        CLAUDE_CODE_SKIP_VERTEX_AUTH ? { kind: "skip" } : { kind: "default" },
        getConfiguredVertexProjectId(),
      ),
      region = getVertexRegionForModel(e),
      bearer = CLAUDE_CODE_SKIP_VERTEX_AUTH ? bearerFromEnvOrHeaders() : void 0;
    return (
      await suppressVertexAuthRejection(
        new AnthropicVertexClass({
          region: region,
          googleAuth: googleAuth,
          maxRetries: 0,
          defaultHeaders: {
            ...getForwardableEnvHeaders(),
            ...vertexResidualCredentialPins(
              CLAUDE_CODE_SKIP_VERTEX_AUTH ? { wireAuthorization: bearer } : !1,
            ),
          },
          ...CLOUD_AUTH_SLOT,
          timeout: 8000,
          fetchOptions: getProxyFetchOptions({
            url: env.ANTHROPIC_VERTEX_BASE_URL || getVertexBaseUrlForRegion(region),
          }),
        }),
      ).messages.create(sendStartupModelCheck(e)),
      { accessible: !0 }
    );
  } catch (error) {
    if (error?.status === 429) return { accessible: !0 };
    return { accessible: !1, error: error };
  }
}
//@ chunk-5wnerh16.js:9592-9648 placement
function P(e) {
  let vertex = No[e].vertex;
  return vertex !== null && enforcedAllowlistLeavesOut(vertex);
}

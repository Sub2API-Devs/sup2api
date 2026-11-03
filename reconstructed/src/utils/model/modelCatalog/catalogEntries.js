/**
 * utils/model/modelCatalog/catalogEntries.ts
 *
 * 2.1.316 新增：设置当前生效的服务端模型目录；遥测中把保密模型 id 替换为占位等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (34)
 * attribution: placement 34
 */
import { getConfidentialModelIds } from "../../permissions/yoloClassifier.js";
import {
  catalogStateModel,
  findServedCatalogRow,
  publicModelIds,
  isFirstPartyProvider,
} from "../providers.js";
import {
  stripAnyVersatileSuffix,
  parseModelId,
  isStandardVersion,
  isModelKeyAlias,
  CLAUDE_MYTHOS_PREVIEW,
  isSameModelVersion,
  LEGACY_MODEL_IDS_2,
} from "../modelIds.js";
import { getProviderState } from "../providerCaches.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { getModelCatalog_2 } from "../modelCatalog.js";
import { LRUCache } from "../../../../vendor/lru-cache/dist/esm/index.min.js";
import { isConfidentialShorthand, maskModelFieldValue } from "./servedCatalog.js";

//@ chunk-aepeg2w5.js:139056-139208 placement
/**
 * 需要隐藏的模型 id 集合：confidential 模型、config.dropped_model_ids，以及无法解析的默认模型。属模型目录模块。
 */
function getHiddenModelIds(registry) {
  let confidentialModelIds = getConfidentialModelIds(registry);
  for (let s of registry.config.dropped_model_ids ?? []) confidentialModelIds.add(normalizeModelId(s));
  let r = catalogStateModel(registry);
  if (r !== undefined && findServedCatalogRow(registry, r) === undefined)
    confidentialModelIds.add(normalizeModelId(r));
  return confidentialModelIds;
}
//@ chunk-aepeg2w5.js:139208-139271 placement
/**
 * 判断目录配置是否标记了"丢弃未识别行"。
 */
function hasDroppedUnidentifiedRows(e) {
  return e.config.dropped_unidentified_rows === true;
}
//@ chunk-aepeg2w5.js:139271-139372 placement
/**
 * 汇总目录中需遮盖的保密模型 id（含已丢弃的保密 id）。
 */
function getMaskedIdSet(registry) {
  let confidentialModelIds = getConfidentialModelIds(registry);
  for (let r of registry.config.dropped_confidential_ids ?? []) confidentialModelIds.add(normalizeModelId(r));
  return confidentialModelIds;
}
//@ chunk-aepeg2w5.js:139372-139444 placement
/**
 * 目录是否有丢弃的模型 id。
 */
function hasDroppedModels(catalog) {
  return (catalog.config.dropped_model_ids?.length ?? 0) > 0 || hasDroppedUnidentifiedRows(catalog);
}
//@ chunk-aepeg2w5.js:139444-139493 placement
/**
 * 规范化模型 id（去上下文标签、小写）。
 */
function normalizeModelId(e) {
  return stripAnyVersatileSuffix(e).trim().toLowerCase();
}
//@ chunk-aepeg2w5.js:139493-139515 placement
/**
 * 保密模型的占位 id。
 */
var CONFIDENTIAL_MODEL_ID = "confidential";
//@ chunk-aepeg2w5.js:139515-139789 placement
/**
 * 激活服务端下发的目录（null 时为回退），记录获取时间、是否过期与路由信息。
 */
function activateServedCatalog(
  catalog,
  fetchedAt,
  stale = false,
  { route: s, credential: h, organizationUuid: y, resolution: S } = {},
) {
  setActiveCatalog({
    catalog,
    source: catalog === null ? "fallback" : "served",
    fetchedAt,
    stale,
    ...(s !== undefined && {
      route: s,
    }),
    ...(h !== undefined && {
      credential: h,
    }),
    ...(y !== undefined && {
      organizationUuid: y,
    }),
    ...(S !== undefined && {
      resolution: S,
    }),
  });
}
//@ chunk-aepeg2w5.js:139789-140021 placement
/**
 * 激活回退目录并记录回退原因与路由信息。
 */
function activateFallbackCatalog(fallbackReason, { route: n, credential: r, organizationUuid: s } = {}) {
  setActiveCatalog({
    catalog: null,
    source: "fallback",
    fetchedAt: undefined,
    stale: false,
    fallbackReason,
    ...(n !== undefined && {
      route: n,
    }),
    ...(r !== undefined && {
      credential: r,
    }),
    ...(s !== undefined && {
      organizationUuid: s,
    }),
  });
}
//@ chunk-aepeg2w5.js:140021-140379 placement
/**
 * 设置当前生效的服务端模型目录。
 */
function setServedCatalog(catalog, fetchedAt, stale = false) {
  let servedCatalogActive = getProviderState().servedCatalogActive;
  let h = servedCatalogActive?.source === "fallback" ? servedCatalogActive : undefined;
  setActiveCatalog({
    catalog:
      catalog === null || catalog.origin === "published"
        ? catalog
        : {
            ...catalog,
            origin: "published",
          },
    source: catalog === null ? "fallback" : "published",
    fetchedAt,
    stale,
    ...(h?.fallbackReason !== undefined && {
      fallbackReason: h.fallbackReason,
    }),
    ...(h?.organizationUuid !== undefined && {
      organizationUuid: h.organizationUuid,
    }),
  });
}
//@ chunk-aepeg2w5.js:140379-140535 placement
function setActiveCatalog(e) {
  let providerState = getProviderState();
  providerState.servedCatalogActive = e;
  providerState.servedCatalogDeactivatedRows = undefined;
  providerState.familySpellingVerdicts.clear();
  if (e.catalog !== null) recordMaskedFromCatalog(e.catalog);
}
//@ chunk-aepeg2w5.js:140535-140619 placement
/**
 * 把公开模型 id 登记到当前目录的公开 id 表。
 */
function registerPublicIds(e) {
  let servedCatalogPublicIds = getProviderState().servedCatalogPublicIds;
  for (let r of publicModelIds(e)) servedCatalogPublicIds.set(r, parseVersionedModelSpec(r));
}
//@ chunk-aepeg2w5.js:140619-140856 placement
/**
 * 停用当前服务端目录（保留其行以便回退），清空公开 id 集合。
 */
function deactivateServedCatalog() {
  let providerState = getProviderState();
  let servedCatalogActive = providerState.servedCatalogActive;
  if (servedCatalogActive?.source === "served") {
    providerState.servedCatalogDeactivatedRows = servedCatalogActive.catalog ?? undefined;
    providerState.servedCatalogActive = {
      catalog: null,
      source: "fallback",
      fetchedAt: undefined,
      stale: false,
    };
  }
  providerState.servedCatalogPublicIds.clear();
}
//@ chunk-aepeg2w5.js:140856-140906 placement
/**
 * 被遮盖的模型 id 集合。
 */
function getMaskedModelIds() {
  return getProviderState().servedCatalogMaskedIds;
}
//@ chunk-aepeg2w5.js:140906-141015 placement
/**
 * 把模型 id 加入遮盖集合（跳过内置族名）。
 */
function addMaskedModelIds(e) {
  let servedCatalogMaskedIds = getProviderState().servedCatalogMaskedIds;
  for (let r of e) {
    let s = normalizeModelId(r);
    if (s.length > 0 && !isMaskFreeModelId(s)) servedCatalogMaskedIds.add(s);
  }
}
//@ chunk-aepeg2w5.js:141015-141086 placement
/**
 * 从目录记录需要遮盖的 id，必要时标记"遮盖全部 id"。
 */
function recordMaskedFromCatalog(catalog) {
  addMaskedModelIds(getHiddenModelIds(catalog));
  if (hasDroppedUnidentifiedRows(catalog)) getProviderState().servedCatalogMasksEveryId = true;
}
//@ chunk-aepeg2w5.js:141086-141138 placement
/**
 * 判断当前目录是否要求遮罩所有模型 id。
 */
function masksEveryId() {
  return getProviderState().servedCatalogMasksEveryId;
}
//@ chunk-aepeg2w5.js:141138-141214 placement = modelMatchesVersionPrefix (1)
/**
 * 规范化后补 claude- 前缀再解析（Gd）。旧版名 modelMatchesVersionPrefix_3 为错配。
 */
function parseVersionedModelSpec(e) {
  let n = normalizeModelId(e);
  return parseModelId(n.includes("claude-") ? n : `claude-${n}`);
}
//@ chunk-aepeg2w5.js:141214-141269 placement
function dateMatches(versionedModelSpec, dates) {
  return versionedModelSpec.date === undefined || dates.has(versionedModelSpec.date);
}
//@ chunk-aepeg2w5.js:141269-141508 placement
var bundledDatedModels = DoctorLazy(() =>
  getModelCatalog_2().models.flatMap((model) => {
    let modelId = parseModelId(model.id);
    if (!isStandardVersion(modelId)) return [];
    let r = new Set();
    for (let s of [model.id, ...Object.values(model.provider_ids)]) {
      let date = typeof s === "string" ? parseModelId(s)?.date : undefined;
      if (date !== undefined) r.add(date);
    }
    return [
      {
        parsed: modelId,
        dates: r,
      },
    ];
  }),
);
//@ chunk-aepeg2w5.js:141508-141653 placement
/**
 * 判断模型 id 是否公开（已知旧模型、服务端公开或与内置日期版本匹配）。
 */
function isPublicModelId(e) {
  let n = normalizeModelId(e);
  if (isModelKeyAlias(n) || n === CLAUDE_MYTHOS_PREVIEW) return true;
  if (isServedPublicId(e)) return true;
  let versionedModelSpec = parseVersionedModelSpec(e);
  return (
    isStandardVersion(versionedModelSpec) &&
    bundledDatedModels().some(
      (s) => isSameModelVersion(s.parsed, versionedModelSpec) && dateMatches(versionedModelSpec, s.dates),
    )
  );
}
//@ chunk-aepeg2w5.js:141653-141732 placement
var LEGACY_FAMILY_SET = new Set(LEGACY_MODEL_IDS_2.flatMap((e) => parseModelId(e)?.family ?? []));
var MAX_CACHED_MODEL_ID_CHARS = 128;
var maskedIdCache = new LRUCache({
  max: 64,
});
//@ chunk-aepeg2w5.js:141732-141764 placement
function isLegacyFamily(e) {
  return LEGACY_FAMILY_SET.has(e);
}
//@ chunk-aepeg2w5.js:141764-141792 placement
/**
 * 判断模型 id 是否无需遮盖。
 */
function isMaskFreeModelId(e) {
  return isLegacyFamily(e);
}
//@ chunk-aepeg2w5.js:141792-141956 placement
/**
 * 带缓存地遮盖模型 id（只缓存长度不超限且编码合法的字符串）。
 */
function maskModelIdCached(e) {
  if (e.length > MAX_CACHED_MODEL_ID_CHARS) return isLegacyCandidateUncached(e);
  let n = maskedIdCache.get(e);
  if (n === undefined) {
    n = isLegacyCandidateUncached(e);
    let str = Buffer.from(e, "utf16le").toString("utf16le");
    if (str === e) maskedIdCache.set(str, n);
  }
  return n;
}
//@ chunk-aepeg2w5.js:141956-142053 placement
function isLegacyCandidateUncached(e) {
  let n = normalizeModelId(e);
  if (isModelKeyAlias(n) || n === CLAUDE_MYTHOS_PREVIEW) return true;
  let versionedModelSpec = parseVersionedModelSpec(n);
  return isStandardVersion(versionedModelSpec) && LEGACY_FAMILY_SET.has(versionedModelSpec.family);
}
//@ chunk-aepeg2w5.js:142053-142097 placement
function shouldMaskServedId(e) {
  return isFirstPartyProviderAlias() && !isServedPublicId(e) && !maskModelIdCached(e);
}
//@ chunk-aepeg2w5.js:142097-142322 placement
function isServedPublicId(e) {
  let servedCatalogPublicIds = getProviderState().servedCatalogPublicIds;
  if (servedCatalogPublicIds.size === 0) return false;
  if (servedCatalogPublicIds.has(normalizeModelId(e))) return true;
  let versionedModelSpec = parseVersionedModelSpec(e);
  if (!isStandardVersion(versionedModelSpec)) return false;
  for (let s of servedCatalogPublicIds.values())
    if (
      isStandardVersion(s) &&
      isSameModelVersion(s, versionedModelSpec) &&
      (versionedModelSpec.date === undefined || versionedModelSpec.date === s.date)
    )
      return true;
  return false;
}
//@ chunk-aepeg2w5.js:142322-142348 placement
function isFirstPartyProviderAlias() {
  return isFirstPartyProvider();
}
//@ chunk-aepeg2w5.js:142348-142440 placement
/**
 * 遥测中把保密模型 id 替换为占位。
 */
function maskModelIdForTelemetry(e) {
  if (containsMaskedId(e, getMaskedModelIds())) return CONFIDENTIAL_MODEL_ID;
  if (shouldMaskServedId(e) || (masksEveryId() && !isPublicModelId(e))) {
    addMaskedModelIds([e]);
    return CONFIDENTIAL_MODEL_ID;
  }
  return e;
}
//@ chunk-aepeg2w5.js:142440-142711 placement
/**
 * 判断模型 id 是否包含遮盖集合中的某个 id（作为完整片段）。
 */
function containsMaskedId(e, maskedModelIds) {
  if (maskedModelIds.size === 0) return false;
  let r = normalizeModelId(e);
  if (maskedModelIds.has(r) && !isMaskFreeModelId(r)) return true;
  for (let s of maskedModelIds) {
    if (s.length === 0 || isMaskFreeModelId(s)) continue;
    let index = r.indexOf(s);
    while (index !== -1) {
      let y = index === 0 ? "" : r.charAt(index - 1);
      let S = r.charAt(index + s.length);
      if (!isAsciiLowerDigit(y) && !isAsciiLowerDigit(S)) return true;
      index = r.indexOf(s, index + 1);
    }
  }
  return false;
}
//@ chunk-aepeg2w5.js:142711-142753 placement
function isAsciiLowerDigit(e) {
  return /^[a-z0-9]$/.test(e);
}
//@ chunk-aepeg2w5.js:142753-142880 placement
function isModelFieldName(e) {
  return (
    MODEL_FIELD_NAMES.has(e) ||
    (!NON_MODEL_FIELD_NAMES.has(e) &&
      /^(?:model|model_id|[A-Za-z0-9_]*_models?|[A-Za-z0-9_]*[a-z0-9]Models?)$/.test(e))
  );
}
//@ chunk-aepeg2w5.js:142880-143039 placement
/**
 * 模型字段名的额外/排除集合，以及模型占位值集合。
 */
var MODEL_FIELD_NAMES = new Set(["chain_entry", "fallbackFrom", "shortName"]);
var NON_MODEL_FIELD_NAMES = new Set(["repository_model"]);
var MODEL_PLACEHOLDER_VALUES = new Set(["inherit", "default", "none", "unknown", "nonconforming"]);
//@ chunk-aepeg2w5.js:143039-143350 placement = createModelSwitchBreadcrumbs (1)
/**
 * 对设置/参数对象里看起来是模型字段（model、*_model(s)）的值做模型 id 掩码/改写（服务端目录屏蔽的 id 换成占位），先处理确定是模型键的再处理其他。旧版名 createModelSwitchBreadcrumbs 为错配。
 */
function maskModelIdsInRecord(e) {
  let n = isFirstPartyProviderAlias() || masksEveryId();
  if (getMaskedModelIds().size === 0 && !n) return e;
  let r;
  let entries = Object.entries(e);
  for (let h of [true, false])
    for (let [y, S] of entries) {
      if (typeof S !== "string" && !Array.isArray(S)) continue;
      let w = isModelFieldName(y);
      if (w !== h) continue;
      let R =
        y === "model" && typeof S === "string" && isConfidentialShorthand(S)
          ? maskModelIdForTelemetry(S)
          : maskModelFieldValue(S, n, w);
      if (R !== S) {
        r ??= {
          ...e,
        };
        r[y] = R;
      }
    }
  return r ?? e;
}
export {
  CONFIDENTIAL_MODEL_ID,
  maskModelIdForTelemetry,
  normalizeModelId,
  registerPublicIds,
  activateServedCatalog,
  activateFallbackCatalog,
  setServedCatalog,
  getMaskedModelIds,
  getHiddenModelIds,
  hasDroppedUnidentifiedRows,
  containsMaskedId,
  maskModelIdCached,
  deactivateServedCatalog,
  maskModelIdsInRecord,
  masksEveryId,
  MODEL_PLACEHOLDER_VALUES,
  isPublicModelId,
  addMaskedModelIds,
  isMaskFreeModelId,
  hasDroppedModels,
  getMaskedIdSet,
  recordMaskedFromCatalog,
};

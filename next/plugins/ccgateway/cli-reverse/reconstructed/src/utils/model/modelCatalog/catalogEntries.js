/**
 * utils/model/modelCatalog/catalogEntries.ts
 *
 * 2.1.316 新增：设置当前生效的服务端模型目录；遥测中把保密模型 id 替换为占位等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (34)
 * attribution: placement 34
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:148565-148717 placement
/**
 * 需要隐藏的模型 id 集合：confidential 模型、config.dropped_model_ids，以及无法解析的默认模型。属模型目录模块。
 */
function getHiddenModelIds(catalog) {
  let confidentialModelIds = getConfidentialModelIds(catalog);
  for (let id of catalog.config.dropped_model_ids ?? []) confidentialModelIds.add(normalizeModelId(id));
  let rowId = catalogStateModel(catalog);
  if (rowId !== undefined && findServedCatalogRow(catalog, rowId) === undefined)
    confidentialModelIds.add(normalizeModelId(rowId));
  return confidentialModelIds;
}
//@ chunk-exfmq47h.js:148717-148780 placement
/**
 * 判断目录配置是否标记了"丢弃未识别行"。
 */
function hasDroppedUnidentifiedRows(registry) {
  return registry.config.dropped_unidentified_rows === true;
}
//@ chunk-exfmq47h.js:148780-148881 placement
/**
 * 汇总目录中需遮盖的保密模型 id（含已丢弃的保密 id）。
 */
function getMaskedIdSet(registry) {
  let confidentialModelIds = getConfidentialModelIds(registry);
  for (let id of registry.config.dropped_confidential_ids ?? [])
    confidentialModelIds.add(normalizeModelId(id));
  return confidentialModelIds;
}
//@ chunk-exfmq47h.js:148881-148953 placement
/**
 * 目录是否有丢弃的模型 id。
 */
function hasDroppedModels(registry) {
  return (registry.config.dropped_model_ids?.length ?? 0) > 0 || hasDroppedUnidentifiedRows(registry);
}
//@ chunk-exfmq47h.js:148953-149002 placement
/**
 * 规范化模型 id（去上下文标签、小写）。
 */
function normalizeModelId(modelId) {
  return stripAnyVersatileSuffix(modelId).trim().toLowerCase();
}
//@ chunk-exfmq47h.js:149002-149024 placement
/**
 * 保密模型的占位 id。
 */
var CONFIDENTIAL_MODEL_ID = "confidential";
//@ chunk-exfmq47h.js:149024-149298 placement
/**
 * 激活服务端下发的目录（null 时为回退），记录获取时间、是否过期与路由信息。
 */
function activateServedCatalog(
  catalog,
  fetchedAt,
  stale = false,
  { route, credential, organizationUuid, resolution } = {},
) {
  setActiveCatalog({
    catalog,
    source: catalog === null ? "fallback" : "served",
    fetchedAt,
    stale,
    ...(route !== undefined && {
      route,
    }),
    ...(credential !== undefined && {
      credential,
    }),
    ...(organizationUuid !== undefined && {
      organizationUuid,
    }),
    ...(resolution !== undefined && {
      resolution,
    }),
  });
}
//@ chunk-exfmq47h.js:149298-149530 placement
/**
 * 激活回退目录并记录回退原因与路由信息。
 */
function activateFallbackCatalog(fallbackReason, { route, credential, organizationUuid } = {}) {
  setActiveCatalog({
    catalog: null,
    source: "fallback",
    fetchedAt: undefined,
    stale: false,
    fallbackReason,
    ...(route !== undefined && {
      route,
    }),
    ...(credential !== undefined && {
      credential,
    }),
    ...(organizationUuid !== undefined && {
      organizationUuid,
    }),
  });
}
//@ chunk-exfmq47h.js:149530-149888 placement
/**
 * 设置当前生效的服务端模型目录。
 */
function setServedCatalog(catalog, fetchedAt, stale = false) {
  let servedCatalogActive = getProviderState().servedCatalogActive;
  let previous = servedCatalogActive?.source === "fallback" ? servedCatalogActive : undefined;
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
    ...(previous?.fallbackReason !== undefined && {
      fallbackReason: previous.fallbackReason,
    }),
    ...(previous?.organizationUuid !== undefined && {
      organizationUuid: previous.organizationUuid,
    }),
  });
}
//@ chunk-exfmq47h.js:149888-150044 placement
function setActiveCatalog(entry) {
  let providerState = getProviderState();
  providerState.servedCatalogActive = entry;
  providerState.servedCatalogDeactivatedRows = undefined;
  providerState.familySpellingVerdicts.clear();
  if (entry.catalog !== null) recordMaskedFromCatalog(entry.catalog);
}
//@ chunk-exfmq47h.js:150044-150128 placement
/**
 * 把公开模型 id 登记到当前目录的公开 id 表。
 */
function registerPublicIds(catalog) {
  let servedCatalogPublicIds = getProviderState().servedCatalogPublicIds;
  for (let id of publicModelIds(catalog)) servedCatalogPublicIds.set(id, parseVersionedModelSpec(id));
}
//@ chunk-exfmq47h.js:150128-150365 placement
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
//@ chunk-exfmq47h.js:150365-150415 placement
/**
 * 被遮盖的模型 id 集合。
 */
function getMaskedModelIds() {
  return getProviderState().servedCatalogMaskedIds;
}
//@ chunk-exfmq47h.js:150415-150524 placement
/**
 * 把模型 id 加入遮盖集合（跳过内置族名）。
 */
function addMaskedModelIds(ids) {
  let servedCatalogMaskedIds = getProviderState().servedCatalogMaskedIds;
  for (let id of ids) {
    let normalized = normalizeModelId(id);
    if (normalized.length > 0 && !isMaskFreeModelId(normalized)) servedCatalogMaskedIds.add(normalized);
  }
}
//@ chunk-exfmq47h.js:150524-150595 placement
/**
 * 从目录记录需要遮盖的 id，必要时标记"遮盖全部 id"。
 */
function recordMaskedFromCatalog(registry) {
  addMaskedModelIds(getHiddenModelIds(registry));
  if (hasDroppedUnidentifiedRows(registry)) getProviderState().servedCatalogMasksEveryId = true;
}
//@ chunk-exfmq47h.js:150595-150647 placement
/**
 * 判断当前目录是否要求遮罩所有模型 id。
 */
function masksEveryId() {
  return getProviderState().servedCatalogMasksEveryId;
}
//@ chunk-exfmq47h.js:150647-150723 placement (2.1.88 match: modelMatchesVersionPrefix, 1)
/**
 * 规范化后补 claude- 前缀再解析（Gd）。旧版名 modelMatchesVersionPrefix_3 为错配。
 */
function parseVersionedModelSpec(modelId) {
  let normalized = normalizeModelId(modelId);
  return parseModelId(normalized.includes("claude-") ? normalized : `claude-${normalized}`);
}
//@ chunk-exfmq47h.js:150723-150778 placement
function dateMatches(versionedModelSpec, dates) {
  return versionedModelSpec.date === undefined || dates.has(versionedModelSpec.date);
}
//@ chunk-exfmq47h.js:150778-151017 placement
var bundledDatedModels; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:150778", () => {
  bundledDatedModels = DoctorLazy(() =>
    getModelCatalog_2().models.flatMap((model) => {
      let modelId = parseModelId(model.id);
      if (!isStandardVersion(modelId)) return [];
      let dates = new Set();
      for (let candidate of [model.id, ...Object.values(model.provider_ids)]) {
        let date = typeof candidate === "string" ? parseModelId(candidate)?.date : undefined;
        if (date !== undefined) dates.add(date);
      }
      return [
        {
          parsed: modelId,
          dates,
        },
      ];
    }),
  );
});
//@ chunk-exfmq47h.js:151017-151163 placement
/**
 * 判断模型 id 是否公开（已知旧模型、服务端公开或与内置日期版本匹配）。
 */
function isPublicModelId(modelId) {
  let normalized = normalizeModelId(modelId);
  if (isModelKeyAlias(normalized) || normalized === CLAUDE_MYTHOS_PREVIEW) return true;
  if (isServedPublicId(modelId)) return true;
  let versionedModelSpec = parseVersionedModelSpec(modelId);
  return (
    isStandardVersion(versionedModelSpec) &&
    bundledDatedModels().some(
      (entry) =>
        isSameModelVersion(entry.parsed, versionedModelSpec) && dateMatches(versionedModelSpec, entry.dates),
    )
  );
}
//@ chunk-exfmq47h.js:151163-151242 placement
var LEGACY_FAMILY_SET; // deferred: uses LEGACY_MODEL_IDS_2 (../modelIds.js) of its import cycle while loading; runs once the cycle is complete
var MAX_CACHED_MODEL_ID_CHARS;
var maskedIdCache;
deferInit("chunk-exfmq47h.js:151163", () => {
  LEGACY_FAMILY_SET = new Set(LEGACY_MODEL_IDS_2.flatMap((id) => parseModelId(id)?.family ?? []));
  MAX_CACHED_MODEL_ID_CHARS = 128;
  maskedIdCache = new LRUCache({
    max: 64,
  });
});
//@ chunk-exfmq47h.js:151242-151274 placement
function isLegacyFamily(family) {
  return LEGACY_FAMILY_SET.has(family);
}
//@ chunk-exfmq47h.js:151274-151302 placement
/**
 * 判断模型 id 是否无需遮盖。
 */
function isMaskFreeModelId(modelId) {
  return isLegacyFamily(modelId);
}
//@ chunk-exfmq47h.js:151302-151466 placement
/**
 * 带缓存地遮盖模型 id（只缓存长度不超限且编码合法的字符串）。
 */
function maskModelIdCached(modelId) {
  if (modelId.length > MAX_CACHED_MODEL_ID_CHARS) return isLegacyCandidateUncached(modelId);
  let cached = maskedIdCache.get(modelId);
  if (cached === undefined) {
    cached = isLegacyCandidateUncached(modelId);
    let str = Buffer.from(modelId, "utf16le").toString("utf16le");
    if (str === modelId) maskedIdCache.set(str, cached);
  }
  return cached;
}
//@ chunk-exfmq47h.js:151466-151563 placement
function isLegacyCandidateUncached(modelId) {
  let normalized = normalizeModelId(modelId);
  if (isModelKeyAlias(normalized) || normalized === CLAUDE_MYTHOS_PREVIEW) return true;
  let versionedModelSpec = parseVersionedModelSpec(normalized);
  return isStandardVersion(versionedModelSpec) && LEGACY_FAMILY_SET.has(versionedModelSpec.family);
}
//@ chunk-exfmq47h.js:151563-151607 placement
function shouldMaskServedId(modelId) {
  return isFirstPartyProviderAlias() && !isServedPublicId(modelId) && !maskModelIdCached(modelId);
}
//@ chunk-exfmq47h.js:151607-151832 placement
function isServedPublicId(modelId) {
  let servedCatalogPublicIds = getProviderState().servedCatalogPublicIds;
  if (servedCatalogPublicIds.size === 0) return false;
  if (servedCatalogPublicIds.has(normalizeModelId(modelId))) return true;
  let versionedModelSpec = parseVersionedModelSpec(modelId);
  if (!isStandardVersion(versionedModelSpec)) return false;
  for (let publicId of servedCatalogPublicIds.values())
    if (
      isStandardVersion(publicId) &&
      isSameModelVersion(publicId, versionedModelSpec) &&
      (versionedModelSpec.date === undefined || versionedModelSpec.date === publicId.date)
    )
      return true;
  return false;
}
//@ chunk-exfmq47h.js:151832-151858 placement
function isFirstPartyProviderAlias() {
  return isFirstPartyProvider();
}
//@ chunk-exfmq47h.js:151858-151951 placement
/**
 * 遥测中把保密模型 id 替换为占位。
 */
function maskModelIdForTelemetry(modelId) {
  if (containsMaskedId(modelId, getMaskedModelIds())) return CONFIDENTIAL_MODEL_ID;
  if (shouldMaskServedId(modelId) || (masksEveryId() && !isPublicModelId(modelId))) {
    addMaskedModelIds([modelId]);
    return CONFIDENTIAL_MODEL_ID;
  }
  return modelId;
}
//@ chunk-exfmq47h.js:151951-152222 placement
/**
 * 判断模型 id 是否包含遮盖集合中的某个 id（作为完整片段）。
 */
function containsMaskedId(text, maskedIds) {
  if (maskedIds.size === 0) return false;
  let normalized = normalizeModelId(text);
  if (maskedIds.has(normalized) && !isMaskFreeModelId(normalized)) return true;
  for (let maskedId of maskedIds) {
    if (maskedId.length === 0 || isMaskFreeModelId(maskedId)) continue;
    let index = normalized.indexOf(maskedId);
    while (index !== -1) {
      let before = index === 0 ? "" : normalized.charAt(index - 1);
      let after = normalized.charAt(index + maskedId.length);
      if (!isAsciiLowerDigit(before) && !isAsciiLowerDigit(after)) return true;
      index = normalized.indexOf(maskedId, index + 1);
    }
  }
  return false;
}
//@ chunk-exfmq47h.js:152222-152264 placement
function isAsciiLowerDigit(char) {
  return /^[a-z0-9]$/.test(char);
}
//@ chunk-exfmq47h.js:152264-152391 placement
function isModelFieldName(fieldName) {
  return (
    MODEL_FIELD_NAMES.has(fieldName) ||
    (!NON_MODEL_FIELD_NAMES.has(fieldName) &&
      /^(?:model|model_id|[A-Za-z0-9_]*_models?|[A-Za-z0-9_]*[a-z0-9]Models?)$/.test(fieldName))
  );
}
//@ chunk-exfmq47h.js:152391-152550 placement
/**
 * 模型字段名的额外/排除集合，以及模型占位值集合。
 */
var MODEL_FIELD_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NON_MODEL_FIELD_NAMES;
var MODEL_PLACEHOLDER_VALUES;
deferInit("chunk-exfmq47h.js:152391", () => {
  MODEL_FIELD_NAMES = new Set(["chain_entry", "fallbackFrom", "shortName"]);
  NON_MODEL_FIELD_NAMES = new Set(["repository_model"]);
  MODEL_PLACEHOLDER_VALUES = new Set(["inherit", "default", "none", "unknown", "nonconforming"]);
});
//@ chunk-exfmq47h.js:152550-152861 placement (2.1.88 match: createModelSwitchBreadcrumbs, 1)
/**
 * 对设置/参数对象里看起来是模型字段（model、*_model(s)）的值做模型 id 掩码/改写（服务端目录屏蔽的 id 换成占位），先处理确定是模型键的再处理其他。旧版名 createModelSwitchBreadcrumbs 为错配。
 */
function maskModelIdsInRecord(record) {
  let maskAll = isFirstPartyProviderAlias() || masksEveryId();
  if (getMaskedModelIds().size === 0 && !maskAll) return record;
  let next;
  let entries = Object.entries(record);
  for (let isModelField of [true, false])
    for (let [key, value] of entries) {
      if (typeof value !== "string" && !Array.isArray(value)) continue;
      let fieldIsModel = isModelFieldName(key);
      if (fieldIsModel !== isModelField) continue;
      let masked =
        key === "model" && typeof value === "string" && isConfidentialShorthand(value)
          ? maskModelIdForTelemetry(value)
          : maskModelFieldValue(value, maskAll, fieldIsModel);
      if (masked !== value) {
        next ??= {
          ...record,
        };
        next[key] = masked;
      }
    }
  return next ?? record;
}
export {
  maskModelIdForTelemetry,
  maskModelIdsInRecord,
  normalizeModelId,
  CONFIDENTIAL_MODEL_ID,
  isPublicModelId,
  registerPublicIds,
  recordMaskedFromCatalog,
  getMaskedIdSet,
  hasDroppedModels,
  deactivateServedCatalog,
  activateServedCatalog,
  activateFallbackCatalog,
  setServedCatalog,
  getMaskedModelIds,
  getHiddenModelIds,
  hasDroppedUnidentifiedRows,
  containsMaskedId,
  maskModelIdCached,
  masksEveryId,
  MODEL_PLACEHOLDER_VALUES,
  addMaskedModelIds,
  isMaskFreeModelId,
};

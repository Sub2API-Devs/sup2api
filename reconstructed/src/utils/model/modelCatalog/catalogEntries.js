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
import { Dos, D3, Uy, isFirstPartyProvider } from "../providers.js";
import {
  Bn,
  parseModelId,
  wR,
  Nb,
  CLAUDE_MYTHOS_PREVIEW,
  isSameModelVersion,
  LEGACY_MODEL_IDS,
} from "../modelIds.js";
import { getProviderState } from "../providerCaches.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { getModelCatalog } from "../modelCatalog.js";
import { Dc } from "../../../../vendor/lru-cache/dist/esm/index.min.js";
import { ob, maskModelFieldValue } from "./servedCatalog.js";

/**
 * 需要隐藏的模型 id 集合：confidential 模型、config.dropped_model_ids，以及无法解析的默认模型。属模型目录模块。
 */
//@ chunk-aepeg2w5.js:139056-139208 placement
function getHiddenModelIds(e) {
  let n = getConfidentialModelIds(e);
  for (let s of e.config.dropped_model_ids ?? []) n.add(normalizeModelId(s));
  let r = Dos(e);
  if (r !== void 0 && D3(e, r) === void 0) n.add(normalizeModelId(r));
  return n;
}
//@ chunk-aepeg2w5.js:139208-139271 placement
function vpr(e) {
  return e.config.dropped_unidentified_rows === !0;
}
/**
 * 汇总目录中需遮盖的保密模型 id（含已丢弃的保密 id）。
 */
//@ chunk-aepeg2w5.js:139271-139372 placement
function getMaskedIdSet(e) {
  let n = getConfidentialModelIds(e);
  for (let r of e.config.dropped_confidential_ids ?? []) n.add(normalizeModelId(r));
  return n;
}
/**
 * 目录是否有丢弃的模型 id。
 */
//@ chunk-aepeg2w5.js:139372-139444 placement
function hasDroppedModels(e) {
  return (e.config.dropped_model_ids?.length ?? 0) > 0 || vpr(e);
}
/**
 * 规范化模型 id（去上下文标签、小写）。
 */
//@ chunk-aepeg2w5.js:139444-139493 placement
function normalizeModelId(e) {
  return Bn(e).trim().toLowerCase();
}
/**
 * 保密模型的占位 id。
 */
//@ chunk-aepeg2w5.js:139493-139515 placement
var CONFIDENTIAL_MODEL_ID = "confidential";
/**
 * 激活服务端下发的目录（null 时为回退），记录获取时间、是否过期与路由信息。
 */
//@ chunk-aepeg2w5.js:139515-139789 placement
function activateServedCatalog(
  e,
  n,
  r = !1,
  { route: s, credential: h, organizationUuid: y, resolution: S } = {},
) {
  setActiveCatalog({
    catalog: e,
    source: e === null ? "fallback" : "served",
    fetchedAt: n,
    stale: r,
    ...(s !== void 0 && { route: s }),
    ...(h !== void 0 && { credential: h }),
    ...(y !== void 0 && { organizationUuid: y }),
    ...(S !== void 0 && { resolution: S }),
  });
}
/**
 * 激活回退目录并记录回退原因与路由信息。
 */
//@ chunk-aepeg2w5.js:139789-140021 placement
function activateFallbackCatalog(e, { route: n, credential: r, organizationUuid: s } = {}) {
  setActiveCatalog({
    catalog: null,
    source: "fallback",
    fetchedAt: void 0,
    stale: !1,
    fallbackReason: e,
    ...(n !== void 0 && { route: n }),
    ...(r !== void 0 && { credential: r }),
    ...(s !== void 0 && { organizationUuid: s }),
  });
}
/**
 * 设置当前生效的服务端模型目录。
 */
//@ chunk-aepeg2w5.js:140021-140379 placement
function setServedCatalog(e, n, r = !1) {
  let servedCatalogActive = getProviderState().servedCatalogActive,
    h = servedCatalogActive?.source === "fallback" ? servedCatalogActive : void 0;
  setActiveCatalog({
    catalog: e === null || e.origin === "published" ? e : { ...e, origin: "published" },
    source: e === null ? "fallback" : "published",
    fetchedAt: n,
    stale: r,
    ...(h?.fallbackReason !== void 0 && { fallbackReason: h.fallbackReason }),
    ...(h?.organizationUuid !== void 0 && { organizationUuid: h.organizationUuid }),
  });
}
//@ chunk-aepeg2w5.js:140379-140535 placement
function setActiveCatalog(e) {
  let n = getProviderState();
  if (
    ((n.servedCatalogActive = e),
    (n.servedCatalogDeactivatedRows = void 0),
    n.familySpellingVerdicts.clear(),
    e.catalog !== null)
  )
    SCn(e.catalog);
}
//@ chunk-aepeg2w5.js:140535-140619 placement
function Tpr(e) {
  let servedCatalogPublicIds = getProviderState().servedCatalogPublicIds;
  for (let r of Uy(e)) servedCatalogPublicIds.set(r, parseVersionedModelSpec(r));
}
/**
 * 停用当前服务端目录（保留其行以便回退），清空公开 id 集合。
 */
//@ chunk-aepeg2w5.js:140619-140856 placement
function deactivateServedCatalog() {
  let e = getProviderState(),
    servedCatalogActive = e.servedCatalogActive;
  if (servedCatalogActive?.source === "served")
    ((e.servedCatalogDeactivatedRows = servedCatalogActive.catalog ?? void 0),
      (e.servedCatalogActive = { catalog: null, source: "fallback", fetchedAt: void 0, stale: !1 }));
  e.servedCatalogPublicIds.clear();
}
/**
 * 被遮盖的模型 id 集合。
 */
//@ chunk-aepeg2w5.js:140856-140906 placement
function getMaskedModelIds() {
  return getProviderState().servedCatalogMaskedIds;
}
/**
 * 把模型 id 加入遮盖集合（跳过内置族名）。
 */
//@ chunk-aepeg2w5.js:140906-141015 placement
function addMaskedModelIds(e) {
  let servedCatalogMaskedIds = getProviderState().servedCatalogMaskedIds;
  for (let r of e) {
    let s = normalizeModelId(r);
    if (s.length > 0 && !co(s)) servedCatalogMaskedIds.add(s);
  }
}
//@ chunk-aepeg2w5.js:141015-141086 placement
function SCn(e) {
  if ((addMaskedModelIds(getHiddenModelIds(e)), vpr(e))) getProviderState().servedCatalogMasksEveryId = !0;
}
//@ chunk-aepeg2w5.js:141086-141138 placement
function Mc() {
  return getProviderState().servedCatalogMasksEveryId;
}
/**
 * 规范化后补 claude- 前缀再解析（Gd）。旧版名 modelMatchesVersionPrefix_3 为错配。
 */
//@ chunk-aepeg2w5.js:141138-141214 placement = modelMatchesVersionPrefix (1)
function parseVersionedModelSpec(e) {
  let n = normalizeModelId(e);
  return parseModelId(n.includes("claude-") ? n : `claude-${n}`);
}
//@ chunk-aepeg2w5.js:141214-141269 placement
function $D(e, n) {
  return e.date === void 0 || n.has(e.date);
}
//@ chunk-aepeg2w5.js:141269-141508 placement
var bundledDatedModels = DoctorLazy(() =>
  getModelCatalog().models.flatMap((model) => {
    let n = parseModelId(model.id);
    if (!wR(n)) return [];
    let r = new Set();
    for (let s of [model.id, ...Object.values(model.provider_ids)]) {
      let h = typeof s === "string" ? parseModelId(s)?.date : void 0;
      if (h !== void 0) r.add(h);
    }
    return [{ parsed: n, dates: r }];
  }),
);
/**
 * 判断模型 id 是否公开（已知旧模型、服务端公开或与内置日期版本匹配）。
 */
//@ chunk-aepeg2w5.js:141508-141653 placement
function isPublicModelId(e) {
  let n = normalizeModelId(e);
  if (Nb(n) || n === CLAUDE_MYTHOS_PREVIEW) return !0;
  if (isServedPublicId(e)) return !0;
  let r = parseVersionedModelSpec(e);
  return wR(r) && bundledDatedModels().some((s) => isSameModelVersion(s.parsed, r) && $D(r, s.dates));
}
//@ chunk-aepeg2w5.js:141653-141732 placement
var Yy = new Set(LEGACY_MODEL_IDS.flatMap((e) => parseModelId(e)?.family ?? [])),
  YD = 128,
  By = new Dc({ max: 64 });
//@ chunk-aepeg2w5.js:141732-141764 placement
function qy(e) {
  return Yy.has(e);
}
//@ chunk-aepeg2w5.js:141764-141792 placement
function co(e) {
  return qy(e);
}
/**
 * 带缓存地遮盖模型 id（只缓存长度不超限且编码合法的字符串）。
 */
//@ chunk-aepeg2w5.js:141792-141956 placement
function maskModelIdCached(e) {
  if (e.length > YD) return Gy(e);
  let n = By.get(e);
  if (n === void 0) {
    n = Gy(e);
    let str = Buffer.from(e, "utf16le").toString("utf16le");
    if (str === e) By.set(str, n);
  }
  return n;
}
//@ chunk-aepeg2w5.js:141956-142053 placement
function Gy(e) {
  let n = normalizeModelId(e);
  if (Nb(n) || n === CLAUDE_MYTHOS_PREVIEW) return !0;
  let r = parseVersionedModelSpec(n);
  return wR(r) && Yy.has(r.family);
}
//@ chunk-aepeg2w5.js:142053-142097 placement
function qD(e) {
  return Qy() && !isServedPublicId(e) && !maskModelIdCached(e);
}
//@ chunk-aepeg2w5.js:142097-142322 placement
function isServedPublicId(e) {
  let servedCatalogPublicIds = getProviderState().servedCatalogPublicIds;
  if (servedCatalogPublicIds.size === 0) return !1;
  if (servedCatalogPublicIds.has(normalizeModelId(e))) return !0;
  let r = parseVersionedModelSpec(e);
  if (!wR(r)) return !1;
  for (let s of servedCatalogPublicIds.values())
    if (wR(s) && isSameModelVersion(s, r) && (r.date === void 0 || r.date === s.date)) return !0;
  return !1;
}
//@ chunk-aepeg2w5.js:142322-142348 placement
function Qy() {
  return isFirstPartyProvider();
}
/**
 * 遥测中把保密模型 id 替换为占位。
 */
//@ chunk-aepeg2w5.js:142348-142440 placement
function maskModelIdForTelemetry(e) {
  if (containsMaskedId(e, getMaskedModelIds())) return CONFIDENTIAL_MODEL_ID;
  if (qD(e) || (Mc() && !isPublicModelId(e))) return (addMaskedModelIds([e]), CONFIDENTIAL_MODEL_ID);
  return e;
}
/**
 * 判断模型 id 是否包含遮盖集合中的某个 id（作为完整片段）。
 */
//@ chunk-aepeg2w5.js:142440-142711 placement
function containsMaskedId(e, n) {
  if (n.size === 0) return !1;
  let r = normalizeModelId(e);
  if (n.has(r) && !co(r)) return !0;
  for (let s of n) {
    if (s.length === 0 || co(s)) continue;
    let index = r.indexOf(s);
    while (index !== -1) {
      let y = index === 0 ? "" : r.charAt(index - 1),
        charAt = r.charAt(index + s.length);
      if (!$y(y) && !$y(charAt)) return !0;
      index = r.indexOf(s, index + 1);
    }
  }
  return !1;
}
//@ chunk-aepeg2w5.js:142711-142753 placement
function $y(e) {
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
/**
 * 模型字段名的额外/排除集合，以及模型占位值集合。
 */
//@ chunk-aepeg2w5.js:142880-143039 placement
var MODEL_FIELD_NAMES = new Set(["chain_entry", "fallbackFrom", "shortName"]),
  NON_MODEL_FIELD_NAMES = new Set(["repository_model"]),
  MODEL_PLACEHOLDER_VALUES = new Set(["inherit", "default", "none", "unknown", "nonconforming"]);
/**
 * 对设置/参数对象里看起来是模型字段（model、*_model(s)）的值做模型 id 掩码/改写（服务端目录屏蔽的 id 换成占位），先处理确定是模型键的再处理其他。旧版名 createModelSwitchBreadcrumbs 为错配。
 */
//@ chunk-aepeg2w5.js:143039-143350 placement = createModelSwitchBreadcrumbs (1)
function maskModelIdsInRecord(e) {
  let n = Qy() || Mc();
  if (getMaskedModelIds().size === 0 && !n) return e;
  let r,
    entries = Object.entries(e);
  for (let h of [!0, !1])
    for (let [y, S] of entries) {
      if (typeof S !== "string" && !Array.isArray(S)) continue;
      let w = isModelFieldName(y);
      if (w !== h) continue;
      let R =
        y === "model" && typeof S === "string" && ob(S)
          ? maskModelIdForTelemetry(S)
          : maskModelFieldValue(S, n, w);
      if (R !== S) ((r ??= { ...e }), (r[y] = R));
    }
  return r ?? e;
}

export {
  CONFIDENTIAL_MODEL_ID,
  maskModelIdForTelemetry,
  normalizeModelId,
  Tpr,
  activateServedCatalog,
  activateFallbackCatalog,
  setServedCatalog,
  getMaskedModelIds,
  getHiddenModelIds,
  vpr,
  containsMaskedId,
  maskModelIdCached,
  deactivateServedCatalog,
  maskModelIdsInRecord,
  Mc,
  MODEL_PLACEHOLDER_VALUES,
  isPublicModelId,
  addMaskedModelIds,
  co,
  hasDroppedModels,
  getMaskedIdSet,
  SCn,
};

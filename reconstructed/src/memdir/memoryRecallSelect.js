/**
 * memdir/memoryRecallSelect.ts
 *
 * 2.1.316 新增：记忆召回候选选择（相关性下限、索引扫描）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import {
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
} from "path";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { getAutoMemPath } from "./paths.js";
import { hasOrgMemoryDecisionRunStarted } from "../services/orgMemory/discovery.js";
import { waitForOrgMemoryDecisionSettledOnce } from "../services/orgMemory/orgMemoryDecision.js";
import {
  FIRST_STORE_PULL_WAIT_DEADLINE_MS,
  isFirstStorePullPending,
} from "../services/orgMemory/storePulls.js";
import {
  recallVisibleTeamMounts,
  loadedIndexExclusions,
  isRecallVisiblePath,
  scanMemoryFiles,
  formatMemoryManifest,
} from "./memoryScan.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import {
  XJt,
  startMemoryPickerState,
  setPickerAccountContext,
  pickerMessages,
  selectRelevantMemories,
} from "./findRelevantMemories.js";
import { MEMORY_TYPES } from "./memoryTypes.js";
import { getDefaultSonnetModel } from "../utils/model/model.js";
import { isNoModelFallbackEnabled } from "../utils/model/modelFallback.js";
import { allowedVersionsInFamilyForProvider } from "../utils/model/modelAllowlist.js";
import { Bn } from "../utils/model/modelIds.js";
import { isPermittedByOrgModelPolicy } from "../utils/model/defaultModel.js";
import { calculateCostWithPricingSource } from "../utils/modelCost.js";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";
import { isModelNotFoundError, isModelPermissionDeniedError } from "../services/api/withRetry.js";

//@ chunk-e6aww6q8.js:3302627-3302679 placement
var uCn = new SessionRootSlot(() => new Map()),
  cCn = new SessionRootSlot(() => new Set());
/**
 * 记忆召回选择器的系统提示（最多选 5 个、谨慎对待用户/项目概况记忆）及其输出 token 上限。
 */
//@ chunk-e6aww6q8.js:3302713-3304053 placement
var MEMORY_SELECTOR_PROMPT = `You are selecting memories that will be useful to Claude Code as it processes a user's query. The first message lists the available memory files with their filenames and descriptions; subsequent messages each contain one user query.

Return a list of filenames for the memories that will clearly be useful to Claude Code as it processes the user's query (up to 5). Only include memories that you are certain will be helpful based on their name and description.
- If you are unsure if a memory will be useful in processing the user's query, then do not include it in your list. Be selective and discerning.
- If there are no memories in the list that would clearly be useful, feel free to return an empty list.
- Be especially conservative with user-profile and project-overview memories ([user], [project]). These describe the user's ongoing focus, not what every question is about. A profile saying "works on DB performance" is NOT relevant to a question that merely contains the word "performance" unless the question is actually about that DB work. Match on what the question IS ABOUT, not on surface keyword overlap with who the user is.
- Do not re-select memories you already returned for an earlier query in this conversation.

Reply with only a JSON object of the form {"selected_memories": ["<filename>", ...]}.
`,
  SELECTOR_MAX_TOKENS = 512;
/**
 * 记忆召回选择：按相关性下限从索引候选中挑选可返回的记忆，并记录无候选、扫描不完整等结果。
 */
//@ chunk-e6aww6q8.js:3304053-3306754 placement
async function selectMemoryRecall(
  e,
  n,
  r,
  s,
  h,
  y = new Set(),
  S = !1,
  w,
  L = !1,
  G,
  q = () => !1,
  Z,
  Se,
  ke = [],
  we = !1,
  Ee,
  Ae = !0,
  Ie = Ee?.scope,
) {
  if (((s.lastUsage = null), S))
    try {
      if (r === getAutoMemPath() && (q() || hasOrgMemoryDecisionRunStarted()))
        await waitForOrgMemoryDecisionSettledOnce(FIRST_STORE_PULL_WAIT_DEADLINE_MS, h);
      if (h.aborted) return [];
      let { searchMemoryFilesWithIndex: searchMemoryFilesWithIndex } = await import("./chunk-vp5gef34.js"),
        rn = recallVisibleTeamMounts(r),
        pn = 5 + Math.min(y.size + 10, 20),
        { ranked: ranked, stats: stats } = await searchMemoryFilesWithIndex(
          e,
          n,
          r,
          h,
          pn,
          loadedIndexExclusions(),
          w,
          L,
          (Kn) => isRecallVisiblePath(Kn, rn),
        ),
        ho = recallVisibleTeamMounts(r),
        mapped = ranked
          .filter(
            (Kn) => isRecallVisiblePath(relative_33(r, Kn.path), ho) && !y.has(Kn.path) && !G?.(Kn.path),
          )
          .slice(0, 5)
          .map((Kn) => ({ path: Kn.path, mtimeMs: Kn.mtimeMs }));
      if (!h.aborted)
        if (!stats.sync.scanCompleted)
          logFeatureSad("memory_recall_select", "index_sweep_incomplete", { via_index: !0 });
        else if (stats.docCount === 0)
          logFeatureSad("memory_recall_select", "no_candidates", { via_index: !0 });
        else {
          let Kn =
            mapped.length > 0
              ? void 0
              : stats.suppressedByFloor
                ? "below_relevance_floor"
                : stats.hitCount === 0
                  ? "no_servable_hits"
                  : stats.belowFloorCount > 0 && ranked.length < pn
                    ? "partially_below_floor"
                    : "all_filtered";
          logFeatureOk("memory_recall_select", {
            via_index: !0,
            selected_count: mapped.length,
            ...(Kn !== void 0 && { selected_zero_reason: fromEnum(Kn) }),
            candidate_docs: stats.docCount,
            index_query_term_count: stats.queryTermCount,
            index_hit_count: stats.hitCount,
            index_below_floor_count: stats.belowFloorCount,
            index_top_score: Math.round(stats.topScore * 100) / 100,
            index_relevance_floor: Math.round(stats.relevanceFloor * 100) / 100,
            index_loaded_from_disk: stats.loadedFromDisk,
            index_took_ms: Math.round(stats.tookMs),
            index_store_held: stats.storeWasHeld,
            index_open_wait_ms: Math.round(stats.openWaitMs),
            index_store_open_ms: Math.round(stats.storeOpenMs),
          });
        }
      return mapped;
    } catch (error) {
      if (!h.aborted)
        (logFeatureSad("memory_recall_select", "index_query_failed", { via_index: !0 }),
          logForDebugging(`index recall failed: ${errorMessage(error)}`));
      return [];
    }
  let Me = { type: "ephemeral" },
    We = r === getAutoMemPath() && isFirstStorePullPending(),
    ze = XJt(s, r),
    Je =
      (Ae ? (ze?.hydrated || We ? ze : void 0) : ze?.memories.length === 0 ? ze : void 0) ??
      (await (Ae ? scanMemoryFiles(r, h, Z, { regularFilesOnly: we }) : Promise.resolve([])).then((Zt) => {
        if (h.aborted) return;
        if (Zt.length > 0) return startMemoryPickerState(s, r, Zt, formatMemoryManifest(Zt), Me, !We);
        return Ee ? startMemoryPickerState(s, r, [], xxr, Me, !1) : void 0;
      }));
  setPickerAccountContext(s, r, Ee, Me, Ie);
  let nt = Je?.account?.names ?? new Set(),
    pt = recallVisibleTeamMounts(r),
    Et = (Zt) => !y.has(Zt.filePath) && isRecallVisiblePath(Zt.filename, pt);
  if (!Je || (!Je.memories.some(Et) && nt.size === 0)) {
    if (!h.aborted)
      logFeatureSad(
        "memory_recall_select",
        Je
          ? Je.memories.some((memory) => !y.has(memory.filePath))
            ? "none_visible"
            : "all_surfaced"
          : "no_candidates",
      );
    return [];
  }
  let yt = pickerMessages(Je),
    gt = new Map(Je.memories.map((memory) => [memory.filename, memory])),
    At = await selectRelevantMemories({
      query: n,
      memoryDir: r,
      selectorCtx: s,
      history: yt,
      turnCount: (Je.messages.length - 1) / 2 + 1,
      byFilename: gt,
      accountNames: nt,
      cacheControl: Me,
      signal: h,
      credentials: Se,
      selectorTurnReverts: ke,
    }),
    It = recallVisibleTeamMounts(r),
    Yt = [],
    qt = [];
  for (let Zt of At) {
    let rn = gt.get(Zt);
    if (rn === void 0) {
      if (nt.has(Zt)) qt.push({ path: Zt, mtimeMs: 0, account: !0 });
    } else if (!y.has(rn.filePath) && isRecallVisiblePath(rn.filename, It))
      (Yt.push(rn), qt.push({ path: rn.filePath, mtimeMs: rn.mtimeMs }));
  }
  return qt;
}
//@ chunk-e6aww6q8.js:3306754-3306853 placement
var xxr = "(no local memory files)",
  regExp_16 = new RegExp(`^\\[(?:${[...MEMORY_TYPES, "account"].join("|")})\\]\\s+`);
//@ chunk-e6aww6q8.js:3308623-3308633 placement
var Oxr = 2;
//@ chunk-e6aww6q8.js:3308633-3308829 placement
function* iterateSelectorModels() {
  let e = getDefaultSonnetModel();
  yield e;
  let n = getMillionTokenCost(e);
  if (isNoModelFallbackEnabled() || n === void 0) return;
  let r = 0;
  for (let s of allowedVersionsInFamilyForProvider("sonnet")) {
    let h = getMillionTokenCost(s);
    if (Bn(s) !== Bn(e) && isPermittedByOrgModelPolicy(s) && h !== void 0 && h <= n) {
      if ((yield s, ++r === Oxr)) return;
    }
  }
}
//@ chunk-e6aww6q8.js:3308829-3308946 placement
function getMillionTokenCost(e) {
  let { usd: usd, pricing: pricing } = calculateCostWithPricingSource(e, {
    ...EMPTY_USAGE,
    input_tokens: 1e6,
    output_tokens: 1e6,
  });
  return pricing === "default" ? void 0 : usd;
}
/**
 * 依次用候选模型执行请求，遇到 API 拒绝时换下一个模型；全部拒绝后抛出最后的错误。
 */
//@ chunk-e6aww6q8.js:3308946-3309282 placement
async function tryModelsUntilAccepted(e, n, r) {
  let s,
    h = 0,
    y = e.next();
  while (y.done !== !0)
    try {
      return { result: await n(y.value), refusals: h };
    } catch (error) {
      if (r.aborted || !hCn(error)) throw error;
      ((s = error), h++);
      let w = e.next();
      (logForDebugging(
        `[memdir] the API refused the selector request for ${y.value} (${errorMessage(error)}); ${w.done === !0 ? "no model left to try" : `trying ${w.value}`}`,
        { level: "warn" },
      ),
        (y = w));
    }
  throw s;
}
//@ chunk-e6aww6q8.js:3309282-3309320 placement
function hCn(e) {
  return isModelNotFoundError(e) || isModelPermissionDeniedError(e);
}

export {
  MEMORY_SELECTOR_PROMPT,
  SELECTOR_MAX_TOKENS,
  tryModelsUntilAccepted,
  iterateSelectorModels,
  regExp_16,
  hCn,
  uCn,
  cCn,
  selectMemoryRecall,
};

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
import { relative } from "path";
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
  pickerStateForDir,
  startMemoryPickerState,
  setPickerAccountContext,
  pickerMessages,
  selectRelevantMemories,
} from "./findRelevantMemories.js";
import { MEMORY_TYPES } from "./memoryTypes.js";
import { getDefaultSonnetModel } from "../utils/model/model.js";
import { isNoModelFallbackEnabled } from "../utils/model/modelFallback.js";
import { allowedVersionsInFamilyForProvider } from "../utils/model/modelAllowlist.js";
import { stripAnyVersatileSuffix } from "../utils/model/modelIds.js";
import { isPermittedByOrgModelPolicy } from "../utils/model/defaultModel.js";
import { calculateCostWithPricingSource } from "../utils/modelCost.js";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";
import { isModelNotFoundError, isModelPermissionDeniedError } from "../services/api/withRetry.js";

//@ chunk-e6aww6q8.js:3302627-3302679 placement
/**
 * 记忆选择器按会话保存的两张表（已展示条目与已用会话）。
 */
var memoryPickerMaps = new SessionRootSlot(() => new Map());
var memoryPickerSets = new SessionRootSlot(() => new Set());
//@ chunk-e6aww6q8.js:3302713-3304053 placement
/**
 * 记忆召回选择器的系统提示（最多选 5 个、谨慎对待用户/项目概况记忆）及其输出 token 上限。
 */
var MEMORY_SELECTOR_PROMPT = `You are selecting memories that will be useful to Claude Code as it processes a user's query. The first message lists the available memory files with their filenames and descriptions; subsequent messages each contain one user query.

Return a list of filenames for the memories that will clearly be useful to Claude Code as it processes the user's query (up to 5). Only include memories that you are certain will be helpful based on their name and description.
- If you are unsure if a memory will be useful in processing the user's query, then do not include it in your list. Be selective and discerning.
- If there are no memories in the list that would clearly be useful, feel free to return an empty list.
- Be especially conservative with user-profile and project-overview memories ([user], [project]). These describe the user's ongoing focus, not what every question is about. A profile saying "works on DB performance" is NOT relevant to a question that merely contains the word "performance" unless the question is actually about that DB work. Match on what the question IS ABOUT, not on surface keyword overlap with who the user is.
- Do not re-select memories you already returned for an earlier query in this conversation.

Reply with only a JSON object of the form {"selected_memories": ["<filename>", ...]}.
`;
var SELECTOR_MAX_TOKENS = 512;
//@ chunk-e6aww6q8.js:3304053-3306754 placement
/**
 * 记忆召回选择：按相关性下限从索引候选中挑选可返回的记忆，并记录无候选、扫描不完整等结果。
 */
async function selectMemoryRecall(
  session,
  n,
  dir,
  memorySelector,
  signal,
  paths = new Set(),
  S = false,
  w,
  L = false,
  G,
  isMultiStoreSyncAvailable = () => false,
  storageV5,
  credentials,
  selectorTurnReverts = [],
  regularFilesOnly = false,
  Ee,
  Ae = true,
  Ie = Ee?.scope,
) {
  memorySelector.lastUsage = null;
  if (S)
    try {
      if (dir === getAutoMemPath() && (isMultiStoreSyncAvailable() || hasOrgMemoryDecisionRunStarted()))
        await waitForOrgMemoryDecisionSettledOnce(FIRST_STORE_PULL_WAIT_DEADLINE_MS, signal);
      if (signal.aborted) return [];
      let { searchMemoryFilesWithIndex } = await import("./chunk-vp5gef34.js");
      let rn = recallVisibleTeamMounts(dir);
      let pn = 5 + Math.min(paths.size + 10, 20);
      let { ranked, stats } = await searchMemoryFilesWithIndex(
        session,
        n,
        dir,
        signal,
        pn,
        loadedIndexExclusions(),
        w,
        L,
        (Kn) => isRecallVisiblePath(Kn, rn),
      );
      let ho = recallVisibleTeamMounts(dir);
      let mapped = ranked
        .filter(
          (Kn) => isRecallVisiblePath(relative(dir, Kn.path), ho) && !paths.has(Kn.path) && !G?.(Kn.path),
        )
        .slice(0, 5)
        .map((Kn) => ({
          path: Kn.path,
          mtimeMs: Kn.mtimeMs,
        }));
      if (!signal.aborted)
        if (!stats.sync.scanCompleted)
          logFeatureSad("memory_recall_select", "index_sweep_incomplete", {
            via_index: true,
          });
        else if (stats.docCount === 0)
          logFeatureSad("memory_recall_select", "no_candidates", {
            via_index: true,
          });
        else {
          let Kn =
            mapped.length > 0
              ? undefined
              : stats.suppressedByFloor
                ? "below_relevance_floor"
                : stats.hitCount === 0
                  ? "no_servable_hits"
                  : stats.belowFloorCount > 0 && ranked.length < pn
                    ? "partially_below_floor"
                    : "all_filtered";
          logFeatureOk("memory_recall_select", {
            via_index: true,
            selected_count: mapped.length,
            ...(Kn !== undefined && {
              selected_zero_reason: fromEnum(Kn),
            }),
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
      if (!signal.aborted) {
        logFeatureSad("memory_recall_select", "index_query_failed", {
          via_index: true,
        });
        logForDebugging(`index recall failed: ${errorMessage(error)}`);
      }
      return [];
    }
  let Me = {
    type: "ephemeral",
  };
  let We = dir === getAutoMemPath() && isFirstStorePullPending();
  let ze = pickerStateForDir(memorySelector, dir);
  let Je =
    (Ae ? (ze?.hydrated || We ? ze : undefined) : ze?.memories.length === 0 ? ze : undefined) ??
    (await (
      Ae
        ? scanMemoryFiles(dir, signal, storageV5, {
            regularFilesOnly,
          })
        : Promise.resolve([])
    ).then((memories) => {
      if (signal.aborted) return;
      if (memories.length > 0)
        return startMemoryPickerState(memorySelector, dir, memories, formatMemoryManifest(memories), Me, !We);
      return Ee
        ? startMemoryPickerState(memorySelector, dir, [], NO_LOCAL_MEMORY_TEXT, Me, false)
        : undefined;
    }));
  setPickerAccountContext(memorySelector, dir, Ee, Me, Ie);
  let nt = Je?.account?.names ?? new Set();
  let pt = recallVisibleTeamMounts(dir);
  let Et = (Zt) => !paths.has(Zt.filePath) && isRecallVisiblePath(Zt.filename, pt);
  if (!Je || (!Je.memories.some(Et) && nt.size === 0)) {
    if (!signal.aborted)
      logFeatureSad(
        "memory_recall_select",
        Je
          ? Je.memories.some((memory) => !paths.has(memory.filePath))
            ? "none_visible"
            : "all_surfaced"
          : "no_candidates",
      );
    return [];
  }
  let history = pickerMessages(Je);
  let gt = new Map(Je.memories.map((memory) => [memory.filename, memory]));
  let relevantMemories = await selectRelevantMemories({
    query: n,
    memoryDir: dir,
    selectorCtx: memorySelector,
    history,
    turnCount: (Je.messages.length - 1) / 2 + 1,
    byFilename: gt,
    accountNames: nt,
    cacheControl: Me,
    signal,
    credentials,
    selectorTurnReverts,
  });
  let It = recallVisibleTeamMounts(dir);
  let Yt = [];
  let qt = [];
  for (let relevantMemory of relevantMemories) {
    let rn = gt.get(relevantMemory);
    if (rn === undefined) {
      if (nt.has(relevantMemory))
        qt.push({
          path: relevantMemory,
          mtimeMs: 0,
          account: true,
        });
    } else if (!paths.has(rn.filePath) && isRecallVisiblePath(rn.filename, It)) {
      Yt.push(rn);
      qt.push({
        path: rn.filePath,
        mtimeMs: rn.mtimeMs,
      });
    }
  }
  return qt;
}
//@ chunk-e6aww6q8.js:3306754-3306853 placement
/**
 * 没有本地记忆时给模型看的占位文字，以及“记忆类型前缀”的匹配正则。
 */
var NO_LOCAL_MEMORY_TEXT = "(no local memory files)";
var regExp_16 = new RegExp(`^\\[(?:${[...MEMORY_TYPES, "account"].join("|")})\\]\\s+`);
//@ chunk-e6aww6q8.js:3308623-3308633 placement
/**
 * 2
 */
var YIELD_EVERY_N = 2;
//@ chunk-e6aww6q8.js:3308633-3308829 placement
function* iterateSelectorModels() {
  let defaultSonnetModel = getDefaultSonnetModel();
  yield defaultSonnetModel;
  let millionTokenCost = getMillionTokenCost(defaultSonnetModel);
  if (isNoModelFallbackEnabled() || millionTokenCost === undefined) return;
  let r = 0;
  for (let s of allowedVersionsInFamilyForProvider("sonnet")) {
    let millionTokenCost_2 = getMillionTokenCost(s);
    if (
      stripAnyVersatileSuffix(s) !== stripAnyVersatileSuffix(defaultSonnetModel) &&
      isPermittedByOrgModelPolicy(s) &&
      millionTokenCost_2 !== undefined &&
      millionTokenCost_2 <= millionTokenCost
    ) {
      yield s;
      if (++r === YIELD_EVERY_N) return;
    }
  }
}
//@ chunk-e6aww6q8.js:3308829-3308946 placement
function getMillionTokenCost(e) {
  let { usd, pricing } = calculateCostWithPricingSource(e, {
    ...EMPTY_USAGE,
    input_tokens: 1e6,
    output_tokens: 1e6,
  });
  return pricing === "default" ? undefined : usd;
}
//@ chunk-e6aww6q8.js:3308946-3309282 placement
/**
 * 依次用候选模型执行请求，遇到 API 拒绝时换下一个模型；全部拒绝后抛出最后的错误。
 */
async function tryModelsUntilAccepted(e, n, signal) {
  let s;
  let h = 0;
  let y = e.next();
  while (y.done !== true)
    try {
      return {
        result: await n(y.value),
        refusals: h,
      };
    } catch (error) {
      if (signal.aborted || !isUnusableSelectorModel(error)) throw error;
      s = error;
      h++;
      let w = e.next();
      logForDebugging(
        `[memdir] the API refused the selector request for ${y.value} (${errorMessage(error)}); ${w.done === true ? "no model left to try" : `trying ${w.value}`}`,
        {
          level: "warn",
        },
      );
      y = w;
    }
  throw s;
}
//@ chunk-e6aww6q8.js:3309282-3309320 placement
/**
 * 模型不存在或无权限
 */
function isUnusableSelectorModel(e) {
  return isModelNotFoundError(e) || isModelPermissionDeniedError(e);
}
export {
  MEMORY_SELECTOR_PROMPT,
  SELECTOR_MAX_TOKENS,
  tryModelsUntilAccepted,
  iterateSelectorModels,
  regExp_16,
  isUnusableSelectorModel,
  memoryPickerMaps,
  memoryPickerSets,
  selectMemoryRecall,
};

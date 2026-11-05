/**
 * memdir/memoryRecallSelect.ts
 *
 * 2.1.316 新增：记忆召回候选选择（相关性下限、索引扫描）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3387701-3387784 placement
/**
 * 记忆选择器按会话保存的两张表（已展示条目与已用会话）。
 */
var memoryPickerMaps; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var memoryPickerSets;
var pdfPickerSlot;
deferInit("chunk-5xgkngpb.js:3387701", () => {
  memoryPickerMaps = new SessionRootSlot(() => new Map());
  memoryPickerSets = new SessionRootSlot(() => new Set());
  pdfPickerSlot = new SessionRootSlot(() => ({
    pdf: undefined,
  }));
});
//@ chunk-5xgkngpb.js:3387818-3389158 placement
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
//@ chunk-5xgkngpb.js:3389158-3391861 placement
/**
 * 记忆召回选择：按相关性下限从索引候选中挑选可返回的记忆，并记录无候选、扫描不完整等结果。
 */
async function selectMemoryRecall(
  session,
  query,
  memoryDir,
  selectorCtx,
  signal,
  paths = new Set(),
  useIndex = false,
  excludePath,
  fromIndex = false,
  isExcluded,
  isMultiStoreSyncAvailable = () => false,
  storageV5,
  credentials,
  selectorTurnReverts = [],
  regularFilesOnly = false,
  account,
  usePicker = true,
  accountScope = account?.scope,
) {
  selectorCtx.lastUsage = null;
  if (useIndex)
    try {
      if (memoryDir === getAutoMemPath() && (isMultiStoreSyncAvailable() || hasOrgMemoryDecisionRunStarted()))
        await waitForOrgMemoryDecisionSettledOnce(FIRST_STORE_PULL_WAIT_DEADLINE_MS, signal);
      if (signal.aborted) return [];
      let { searchMemoryFilesWithIndex } = await import("./prewarmMemoryIndex.lazy.js");
      let visibleTeamMounts = recallVisibleTeamMounts(memoryDir);
      let candidateLimit = 5 + Math.min(paths.size + 10, 20);
      let { ranked, stats } = await searchMemoryFilesWithIndex(
        session,
        query,
        memoryDir,
        signal,
        candidateLimit,
        loadedIndexExclusions(),
        excludePath,
        fromIndex,
        (path) => isRecallVisiblePath(path, visibleTeamMounts),
      );
      let teamMountsForFilter = recallVisibleTeamMounts(memoryDir);
      let mapped = ranked
        .filter(
          (hit) =>
            isRecallVisiblePath(relative(memoryDir, hit.path), teamMountsForFilter) &&
            !paths.has(hit.path) &&
            !isExcluded?.(hit.path),
        )
        .slice(0, 5)
        .map((hit) => ({
          path: hit.path,
          mtimeMs: hit.mtimeMs,
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
          let zeroReason =
            mapped.length > 0
              ? undefined
              : stats.suppressedByFloor
                ? "below_relevance_floor"
                : stats.hitCount === 0
                  ? "no_servable_hits"
                  : stats.belowFloorCount > 0 && ranked.length < candidateLimit
                    ? "partially_below_floor"
                    : "all_filtered";
          logFeatureOk("memory_recall_select", {
            via_index: true,
            selected_count: mapped.length,
            ...(zeroReason !== undefined && {
              selected_zero_reason: fromEnum(zeroReason),
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
  let cacheControl = {
    type: "ephemeral",
  };
  let orgStorePending = memoryDir === getAutoMemPath() && isFirstStorePullPending();
  let pickerState = pickerStateForDir(selectorCtx, memoryDir);
  let activePickerState =
    (usePicker
      ? pickerState?.hydrated || orgStorePending
        ? pickerState
        : undefined
      : pickerState?.memories.length === 0
        ? pickerState
        : undefined) ??
    (await (
      usePicker
        ? scanMemoryFiles(memoryDir, signal, storageV5, {
            regularFilesOnly,
          })
        : Promise.resolve([])
    ).then((memories) => {
      if (signal.aborted) return;
      if (memories.length > 0)
        return startMemoryPickerState(
          selectorCtx,
          memoryDir,
          memories,
          formatMemoryManifest(memories),
          cacheControl,
          !orgStorePending,
        );
      return account
        ? startMemoryPickerState(selectorCtx, memoryDir, [], NO_LOCAL_MEMORY_TEXT, cacheControl, false)
        : undefined;
    }));
  setPickerAccountContext(selectorCtx, memoryDir, account, cacheControl, accountScope);
  let accountNames = activePickerState?.account?.names ?? new Set();
  let visibleTeamMounts = recallVisibleTeamMounts(memoryDir);
  let isCandidate = (memory) =>
    !paths.has(memory.filePath) && isRecallVisiblePath(memory.filename, visibleTeamMounts);
  if (!activePickerState || (!activePickerState.memories.some(isCandidate) && accountNames.size === 0)) {
    if (!signal.aborted)
      logFeatureSad(
        "memory_recall_select",
        activePickerState
          ? activePickerState.memories.some((memory) => !paths.has(memory.filePath))
            ? "none_visible"
            : "all_surfaced"
          : "no_candidates",
      );
    return [];
  }
  let history = pickerMessages(activePickerState);
  let memoryByFilename = new Map(activePickerState.memories.map((memory) => [memory.filename, memory]));
  let relevantMemories = await selectRelevantMemories({
    query,
    memoryDir,
    selectorCtx,
    history,
    turnCount: (activePickerState.messages.length - 1) / 2 + 1,
    byFilename: memoryByFilename,
    accountNames,
    cacheControl,
    signal,
    credentials,
    selectorTurnReverts,
  });
  let teamMountsForSelection = recallVisibleTeamMounts(memoryDir);
  let visibleMemories = [];
  let selected = [];
  for (let relevantMemory of relevantMemories) {
    let memory = memoryByFilename.get(relevantMemory);
    if (memory === undefined) {
      if (accountNames.has(relevantMemory))
        selected.push({
          path: relevantMemory,
          mtimeMs: 0,
          account: true,
        });
    } else if (!paths.has(memory.filePath) && isRecallVisiblePath(memory.filename, teamMountsForSelection)) {
      visibleMemories.push(memory);
      selected.push({
        path: memory.filePath,
        mtimeMs: memory.mtimeMs,
      });
    }
  }
  return selected;
}
//@ chunk-5xgkngpb.js:3391861-3391960 placement
/**
 * 没有本地记忆时给模型看的占位文字，以及“记忆类型前缀”的匹配正则。
 */
var NO_LOCAL_MEMORY_TEXT; // deferred: uses MEMORY_TYPES (./memoryTypes.js) of its import cycle while loading; runs once the cycle is complete
var regExp_18;
deferInit("chunk-5xgkngpb.js:3391861", () => {
  NO_LOCAL_MEMORY_TEXT = "(no local memory files)";
  regExp_18 = new RegExp(`^\\[(?:${[...MEMORY_TYPES, "account"].join("|")})\\]\\s+`);
});
//@ chunk-5xgkngpb.js:3393732-3393742 placement
/**
 * 2
 */
var YIELD_EVERY_N = 2;
//@ chunk-5xgkngpb.js:3393742-3393938 placement
function* iterateSelectorModels() {
  let model = getDefaultSonnetModel();
  yield model;
  let millionTokenCost = getMillionTokenCost(model);
  if (isNoModelFallbackEnabled() || millionTokenCost === undefined) return;
  let yieldCount = 0;
  for (let model_2 of allowedVersionsInFamilyForProvider("sonnet")) {
    let millionTokenCost_2 = getMillionTokenCost(model_2);
    if (
      stripAnyVersatileSuffix(model_2) !== stripAnyVersatileSuffix(model) &&
      isPermittedByOrgModelPolicy(model_2) &&
      millionTokenCost_2 !== undefined &&
      millionTokenCost_2 <= millionTokenCost
    ) {
      yield model_2;
      if (++yieldCount === YIELD_EVERY_N) return;
    }
  }
}
//@ chunk-5xgkngpb.js:3393938-3394055 placement
function getMillionTokenCost(model) {
  let { usd, pricing } = calculateCostWithPricingSource(model, {
    ...EMPTY_USAGE,
    input_tokens: 1e6,
    output_tokens: 1e6,
  });
  return pricing === "default" ? undefined : usd;
}
//@ chunk-5xgkngpb.js:3394055-3394391 placement
/**
 * 依次用候选模型执行请求，遇到 API 拒绝时换下一个模型；全部拒绝后抛出最后的错误。
 */
async function tryModelsUntilAccepted(models, attempt, signal) {
  let lastError;
  let refusals = 0;
  let nextModel = models.next();
  while (nextModel.done !== true)
    try {
      return {
        result: await attempt(nextModel.value),
        refusals,
      };
    } catch (error) {
      if (signal.aborted || !isUnusableSelectorModel(error)) throw error;
      lastError = error;
      refusals++;
      let followingModel = models.next();
      logForDebugging(
        `[memdir] the API refused the selector request for ${nextModel.value} (${errorMessage(error)}); ${followingModel.done === true ? "no model left to try" : `trying ${followingModel.value}`}`,
        {
          level: "warn",
        },
      );
      nextModel = followingModel;
    }
  throw lastError;
}
//@ chunk-5xgkngpb.js:3394391-3394429 placement
/**
 * 模型不存在或无权限
 */
function isUnusableSelectorModel(error) {
  return isModelNotFoundError(error) || isModelPermissionDeniedError(error);
}
export {
  memoryPickerMaps,
  memoryPickerSets,
  selectMemoryRecall,
  MEMORY_SELECTOR_PROMPT,
  SELECTOR_MAX_TOKENS,
  tryModelsUntilAccepted,
  iterateSelectorModels,
  regExp_18,
  isUnusableSelectorModel,
  pdfPickerSlot,
};

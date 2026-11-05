/**
 * hooks/useArrowKeyHistory.tsx
 *
 * 上下箭头浏览 prompt 历史：分批加载历史、按模式（bash/prompt）过滤、首次使用时提示 Ctrl+R 搜索。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useArrowKeyHistory.tsx
 * pieces: chunk-czq1j3j2.js (5)
 * attribution: affinity 1, fingerprint 2, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { Text } from "../ink/components/Text.js";
import { getModeFromInput as getModeFromInput_2 } from "../components/PromptInput/inputModes.js";
import { HostScoped } from "../utils/hostScoped.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useHost } from "../context/session.js";
import { useStoreSelector } from "./useStoreSelector.js";
import { selectDraftValue } from "../screens/repl/PromptDraft.js";
import { useState, useRef, useCallback } from "../../vendor/react/cjs/react.production.js";
import { useNotifications } from "../context/notifications.js";
import {
  collapseSmallPastedBlocks,
  renumberPastedContents,
  getHistoryGeneration,
  readProjectHistory,
  countHistoryForProject,
} from "../history.js";
import { mergeTurnTags } from "../utils/userTurnTags.js";
import { ConfigurableShortcutHint } from "../components/ConfigurableShortcutHint.js";
import { NOTIFICATION_TIMEOUT_MS } from "../components/PromptInput/Notifications.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:891760-891771 affinity
var HISTORY_BATCH_SIZE = 10;
//@ chunk-czq1j3j2.js:891771-892249 fingerprint (2.1.88 match: loadHistoryEntries, 0.663)
class HistoryLoader {
  #e = null;
  #t = 0;
  #o = undefined;
  #n = 0;
  get pending() {
    return this.#e;
  }
  async load(minCount, mode, generation, readEntries) {
    let targetCount = Math.ceil(minCount / HISTORY_BATCH_SIZE) * HISTORY_BATCH_SIZE;
    while (this.#e) {
      if (this.#t >= targetCount && this.#o === mode && this.#n === generation) return this.#e;
      await this.#e;
    }
    this.#t = targetCount;
    this.#o = mode;
    this.#n = generation;
    let loadPromise = (async () => {
      let entries = [];
      let loaded = 0;
      for await (let entry of readEntries()) {
        if (mode) {
          if (getModeFromInput_2(entry.display) !== mode) continue;
        }
        entries.push(entry);
        loaded++;
        if (loaded >= targetCount) break;
      }
      return entries;
    })();
    this.#e = loadPromise;
    try {
      return await loadPromise;
    } finally {
      if (this.#e === loadPromise) {
        this.#e = null;
        this.#t = 0;
        this.#o = undefined;
        this.#n = 0;
      }
    }
  }
}
//@ chunk-czq1j3j2.js:892249-892276 layout
var historyLoaderByHost; // deferred: uses HistoryLoader of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:892249", () => {
  historyLoaderByHost = new HostScoped(() => new HistoryLoader());
});
//@ chunk-czq1j3j2.js:892276-892486 layout
function findHistoryOverlapIndex(history, nextHistory) {
  if (nextHistory.length === 0) return 0;
  for (let idx = 0; idx < history.length; idx++) {
    let min = Math.min(nextHistory.length, history.length - idx);
    let matches = true;
    for (let idx_2 = 0; idx_2 < min; idx_2++)
      if (history[idx + idx_2]?.display !== nextHistory[idx_2]?.display) {
        matches = false;
        break;
      }
    if (matches) return idx;
  }
  return -1;
}
//@ chunk-czq1j3j2.js:892486-896916 fingerprint (2.1.88 match: useArrowKeyHistory, 0.743)
/**
 * 上下箭头历史：按批（10 条）从历史文件加载，按 bash/prompt 模式过滤，记住当前草稿以便回到底部；第一次使用时弹出 "ctrl+r to search history" 提示；返回 onHistoryUp/Down/Reset。
 */
function useArrowKeyHistory(draft, applyDraft, restrictedHistory) {
  let { storageV5 } = useTheme_2();
  let historyLoader = historyLoaderByHost.of(useHost());
  let value = useStoreSelector(draft, selectDraftValue);
  let hasPastedContents = restrictedHistory !== undefined;
  let [historyIndex, setHistoryIndex] = useState(0);
  let [historyTotal, setHistoryTotal] = useState(null);
  let hasShownSearchHintRef = useRef(0);
  let isCountingHistory = useRef(false);
  let savedDraft = useRef(null);
  let hasShownHint = useRef(false);
  let { addNotification, removeNotification } = useNotifications();
  let historyCache = useRef([]);
  let historyCacheModeFilter = useRef(undefined);
  let historyIndexRef = useRef(0);
  let initialModeFilterRef = useRef(0);
  let currentInputRef = useRef(null);
  let pastedContentsRef = useRef(undefined);
  let currentModeRef = useRef(new Map());
  let nextIndexRef = useRef(0);
  let isLoadingHistory = useRef(false);
  let loadGeneration = useRef(0);
  let setInputWithCursor = useCallback(
    (value, mode, contents, cursorToStart) => {
      value = value.replaceAll("\t", "    ");
      currentInputRef.current = value;
      applyDraft(value, mode, contents, cursorToStart === "end" ? value.length : 0);
    },
    [applyDraft],
  );
  let updateInput = useCallback(
    (input, cursorToStart) => {
      if (!input || !input.display) return false;
      let collapsedInput = hasPastedContents
        ? collapseSmallPastedBlocks(input.display)
        : {
            text: input.display,
            pastedContents: {},
          };
      let mode_0 = renumberPastedContents({
        display: collapsedInput.text,
        pastedContents: input.pastedContents ?? {},
      });
      let mergedContents = mergeTurnTags(mode_0.pastedContents, Object.values(collapsedInput.pastedContents));
      let modeFromInput = getModeFromInput_2(input.display);
      let value = modeFromInput === "bash" ? mode_0.display.slice(1) : mode_0.display;
      setInputWithCursor(value, modeFromInput, mergedContents, cursorToStart);
      return true;
    },
    [setInputWithCursor, hasPastedContents],
  );
  let showSearchHint = useCallback(
    (index, cursorToStart) => {
      let editedEntry = currentModeRef.current.get(index);
      if (editedEntry) {
        setInputWithCursor(editedEntry.display, editedEntry.mode, editedEntry.pastedContents, cursorToStart);
        return true;
      }
      return updateInput(historyCache.current[index], cursorToStart);
    },
    [setInputWithCursor, updateInput],
  );
  let onHistoryUp = useCallback(() => {
    addNotification({
      key: "search-history-hint",
      kind: "contextual",
      jsx: jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default(ConfigurableShortcutHint, {
          action: "history:search",
          context: "Global",
          fallback: "ctrl+r",
          description: "search history",
        }),
      }),
      priority: "immediate",
      timeoutMs: NOTIFICATION_TIMEOUT_MS,
    });
  }, [addNotification]);
  let restoreCurrentDraft = useCallback(() => {
    let targetIndex = savedDraft.current;
    if (targetIndex)
      setInputWithCursor(targetIndex.display, targetIndex.mode, targetIndex.pastedContents ?? {}, "start");
    else setInputWithCursor("", pastedContentsRef.current ?? "prompt", {}, "start");
  }, [setInputWithCursor]);
  let adoptHistory = useCallback(
    (nextHistory) => {
      let historyOverlapIndex = findHistoryOverlapIndex(nextHistory, historyCache.current);
      historyCache.current = nextHistory;
      if (historyOverlapIndex === 0) return historyOverlapIndex;
      hasShownSearchHintRef.current++;
      isCountingHistory.current = false;
      if (historyOverlapIndex < 0) {
        if (nextIndexRef.current > 0 && draft.value === currentInputRef.current) restoreCurrentDraft();
        initialModeFilterRef.current = 0;
        setHistoryIndex(0);
        nextIndexRef.current = 0;
        currentModeRef.current.clear();
        setHistoryTotal(null);
        return historyOverlapIndex;
      }
      setHistoryTotal((currentTotal) =>
        currentTotal === null ? currentTotal : currentTotal + historyOverlapIndex,
      );
      if (initialModeFilterRef.current > 0) {
        initialModeFilterRef.current += historyOverlapIndex;
        setHistoryIndex(initialModeFilterRef.current);
      }
      if (nextIndexRef.current > 0) nextIndexRef.current += historyOverlapIndex;
      if (currentModeRef.current.size > 0)
        currentModeRef.current = new Map(
          [...currentModeRef.current].map(([entryIndex, entry]) => [entryIndex + historyOverlapIndex, entry]),
        );
      return historyOverlapIndex;
    },
    [draft, restoreCurrentDraft],
  );
  let loadHistoryBatch = useCallback(
    async (generation, modeFilter, currentIndex) => {
      for (;;) {
        let historyGeneration = getHistoryGeneration();
        let loadedHistory = await historyLoader.load(
          Math.max(currentIndex() + 1, historyCache.current.length + HISTORY_BATCH_SIZE),
          modeFilter,
          historyGeneration,
          () =>
            readProjectHistory(storageV5, {
              withClearedDrafts: true,
            }),
        );
        if (loadGeneration.current !== generation) return "cancelled";
        if (getHistoryGeneration() !== historyGeneration) continue;
        if (
          historyCacheModeFilter.current !== modeFilter ||
          (loadedHistory.length <= historyCache.current.length &&
            historyIndexRef.current === historyGeneration)
        )
          return "unchanged";
        let overlapIndex = adoptHistory(loadedHistory);
        historyIndexRef.current = historyGeneration;
        if (overlapIndex < 0) return "restarted";
        if (overlapIndex > 0 && currentIndex() >= loadedHistory.length) continue;
        return "adopted";
      }
    },
    [adoptHistory, historyLoader, storageV5],
  );
  let onHistoryUp_2 = useCallback(() => {
    let inputAtPress = initialModeFilterRef.current;
    let { value: draftValue, pastedContents, mode } = draft.getSnapshot();
    let isFreshHistory = nextIndexRef.current === 0;
    if (inputAtPress === 0) pastedContentsRef.current = mode === "bash" ? mode : undefined;
    let pastedContentsAtPress = pastedContentsRef.current;
    let historyGeneration = getHistoryGeneration();
    if (
      historyCacheModeFilter.current !== pastedContentsAtPress ||
      (inputAtPress === 0 && !restrictedHistory && historyIndexRef.current !== historyGeneration)
    ) {
      historyCache.current = [];
      historyCacheModeFilter.current = pastedContentsAtPress;
      historyIndexRef.current = historyGeneration;
      currentModeRef.current.clear();
      hasShownSearchHintRef.current++;
      isCountingHistory.current = false;
      setHistoryTotal(null);
    }
    let providedHistory = restrictedHistory;
    if (providedHistory) {
      let filteredHistory = pastedContentsAtPress
        ? providedHistory.filter((entry) => getModeFromInput_2(entry.display) === pastedContentsAtPress)
        : providedHistory;
      let isOverlapNegative = false;
      if (filteredHistory.length > historyCache.current.length) {
        isOverlapNegative = adoptHistory(filteredHistory) < 0;
        inputAtPress = initialModeFilterRef.current;
      }
      setHistoryTotal(historyCache.current.length);
      if (isOverlapNegative) return;
    }
    if (inputAtPress === 0 && !providedHistory && !isCountingHistory.current) {
      isCountingHistory.current = true;
      let modeAtPress = hasShownSearchHintRef.current;
      countHistoryForProject(
        pastedContentsAtPress ? (entry) => getModeFromInput_2(entry) === pastedContentsAtPress : undefined,
        storageV5,
      ).then((count) => {
        if (hasShownSearchHintRef.current !== modeAtPress) return;
        isCountingHistory.current = false;
        setHistoryTotal(count);
      });
    }
    let moveUp = () => {
      if (initialModeFilterRef.current !== inputAtPress) return;
      if (inputAtPress >= historyCache.current.length) return;
      if (inputAtPress === 0) {
        if (isFreshHistory && draftValue.trim() !== "")
          savedDraft.current = {
            display: draftValue,
            pastedContents,
            mode,
          };
      } else if (inputAtPress === nextIndexRef.current)
        currentModeRef.current.set(inputAtPress - 1, {
          display: draftValue,
          pastedContents,
          mode,
        });
      let nextIndex = inputAtPress + 1;
      initialModeFilterRef.current = nextIndex;
      setHistoryIndex(nextIndex);
      if (showSearchHint(inputAtPress, "end")) nextIndexRef.current = nextIndex;
      if (nextIndex >= 2 && !providedHistory && !hasShownHint.current) {
        hasShownHint.current = true;
        onHistoryUp();
      }
    };
    if (
      providedHistory ||
      (inputAtPress < historyCache.current.length && historyIndexRef.current === historyGeneration)
    ) {
      moveUp();
      return;
    }
    isLoadingHistory.current = true;
    let generation = ++loadGeneration.current;
    (async () => {
      try {
        let loadOutcome = await loadHistoryBatch(
          generation,
          pastedContentsAtPress,
          () => initialModeFilterRef.current,
        );
        if (loadOutcome === "cancelled" || loadOutcome === "restarted") return;
        if (loadOutcome === "adopted") inputAtPress = initialModeFilterRef.current;
        if (draft.value !== draftValue) return;
        moveUp();
      } catch {
      } finally {
        if (loadGeneration.current === generation) isLoadingHistory.current = false;
      }
    })();
  }, [draft, restrictedHistory, adoptHistory, loadHistoryBatch, showSearchHint, onHistoryUp, storageV5]);
  let onHistoryDown = useCallback(() => {
    let modeFilter = isLoadingHistory.current;
    if (modeFilter) {
      loadGeneration.current++;
      isLoadingHistory.current = false;
    }
    let indexAtPress = initialModeFilterRef.current;
    if (indexAtPress > 0 && indexAtPress === nextIndexRef.current) {
      let { value: draftValue, pastedContents, mode } = draft.getSnapshot();
      currentModeRef.current.set(indexAtPress - 1, {
        display: draftValue,
        pastedContents,
        mode,
      });
    }
    let moveDown = () => {
      let currentIndex = initialModeFilterRef.current;
      if (currentIndex > 1) {
        initialModeFilterRef.current = currentIndex - 1;
        setHistoryIndex(currentIndex - 1);
        if (showSearchHint(currentIndex - 2, "start")) nextIndexRef.current = currentIndex - 1;
      } else if (currentIndex === 1) {
        initialModeFilterRef.current = 0;
        setHistoryIndex(0);
        restoreCurrentDraft();
        nextIndexRef.current = 0;
      }
    };
    if (indexAtPress > 0 && !restrictedHistory && historyIndexRef.current !== getHistoryGeneration()) {
      let generation = ++loadGeneration.current;
      let draftValue = draft.value;
      loadHistoryBatch(generation, pastedContentsRef.current, () =>
        Math.max(initialModeFilterRef.current - 2, 0),
      ).then(
        (loadOutcome) => {
          if ((loadOutcome === "adopted" || loadOutcome === "unchanged") && draft.value === draftValue)
            moveDown();
        },
        () => {},
      );
      return false;
    }
    moveDown();
    return indexAtPress <= 0 && !modeFilter;
  }, [draft, restrictedHistory, loadHistoryBatch, restoreCurrentDraft, showSearchHint]);
  let resetHistory = useCallback(() => {
    savedDraft.current = null;
    setHistoryIndex(0);
    setHistoryTotal(null);
    hasShownSearchHintRef.current++;
    isCountingHistory.current = false;
    initialModeFilterRef.current = 0;
    nextIndexRef.current = 0;
    loadGeneration.current++;
    isLoadingHistory.current = false;
    currentInputRef.current = null;
    pastedContentsRef.current = undefined;
    removeNotification("search-history-hint");
    historyCache.current = [];
    historyCacheModeFilter.current = undefined;
    currentModeRef.current.clear();
  }, [removeNotification]);
  let dismissSearchHint = useCallback(() => {
    removeNotification("search-history-hint");
  }, [removeNotification]);
  return {
    historyIndex,
    historyTotal,
    historyEdited: historyIndex > 0 && value !== currentInputRef.current,
    onHistoryUp: onHistoryUp_2,
    onHistoryDown,
    resetHistory,
    dismissSearchHint,
  };
}
export { useArrowKeyHistory };

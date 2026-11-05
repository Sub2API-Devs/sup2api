/**
 * components/PromptInput/autocompleteStore.ts
 *
 * 2.1.316 新增。输入补全状态存储。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (26)
 * attribution: placement 25, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { createStore } from "../../state/store.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import {
  autocompleteWithNoCore,
  normalizeAutocompleteSuggestions,
  currentToken,
  COMPOSER_EDIT_ORIGIN,
} from "../../plugins/functionHooks/sessionEvents.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { applyTextInsertion } from "../../plugins/functionHooks/coreHandlers.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { renderVersions } from "../../plugins/functionHooks/ui/renderInstances.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:556284-556288 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:556284", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:563362-563449 placement
var subscribeOwnAndRows = (stores) => (listener) => {
  let unsubscribeOwn = stores.own.subscribe(listener);
  let unsubscribeRows = stores.rows.subscribe(listener);
  return () => {
    unsubscribeOwn();
    unsubscribeRows();
  };
};
//@ chunk-czq1j3j2.js:563449-563541 placement
var buildLiveView = (own, rows, subscribe) => ({
  getSnapshot: rows.live,
  getState: rows.live,
  setState: own.own.setState,
  subscribe,
});
//@ chunk-czq1j3j2.js:563541-563629 placement
var createAutocompleteView = (own, rows) => ({
  ...own,
  ...buildLiveView(own, rows, subscribeOwnAndRows(own)),
  drawn: {
    getSnapshot: rows.drawn,
    subscribe: subscribeOwnAndRows(own),
  },
});
//@ chunk-czq1j3j2.js:563629-563644 placement
var alwaysFalse = () => false;
//@ chunk-czq1j3j2.js:563644-563669 placement
var EMPTY_SUGGESTION_ROWS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:563644", () => {
  EMPTY_SUGGESTION_ROWS = Object.freeze([]);
});
//@ chunk-czq1j3j2.js:563669-563725 placement
var EMPTY_AUTOCOMPLETE_STATE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:563669", () => {
  EMPTY_AUTOCOMPLETE_STATE = Object.freeze({
    rows: EMPTY_SUGGESTION_ROWS,
    isLive: alwaysFalse,
    isArrowed: false,
  });
});
//@ chunk-czq1j3j2.js:563725-563804 placement
var normalizeSelectedSuggestion = (state) =>
  state.selectedSuggestion < state.suggestions.length ? state.selectedSuggestion : -1;
//@ chunk-czq1j3j2.js:563804-564103 placement
function mergeAutocompleteRows(state, rowState, suggestions) {
  let selectedIndex =
    rowState.selectedId !== undefined ? rowState.rows.findIndex((row) => row.id === rowState.selectedId) : -1;
  let hasNoRows = rowState.rows.length === 0;
  let isArrowed = selectedIndex >= 0 && rowState.isArrowed;
  return hasNoRows
    ? state
    : {
        ...state,
        suggestions: suggestions ?? state.suggestions.concat(rowState.rows),
        selectedSuggestion:
          selectedIndex < 0 ? normalizeSelectedSuggestion(state) : state.suggestions.length + selectedIndex,
        ...(isArrowed && {
          arrowedSuggestionId: rowState.selectedId,
        }),
      };
}
//@ chunk-czq1j3j2.js:564103-564189 placement
function freezeRowsIfEmpty(state) {
  return state.rows.length === 0
    ? state
    : {
        rows: state.rows,
        isLive: state.isLive,
        isArrowed: false,
      };
}
//@ chunk-czq1j3j2.js:564189-564321 placement
function clearHoverIfInRows(state, rows) {
  let hoveredSuggestionId = state.hoveredSuggestionId;
  return hoveredSuggestionId !== null &&
    hoveredSuggestionId !== undefined &&
    rows.some((row) => row.id === hoveredSuggestionId)
    ? {
        ...state,
        hoveredSuggestionId: null,
      }
    : state;
}
//@ chunk-czq1j3j2.js:564321-564758 placement
/**
 * 把输入框建议状态与插件提供的补全行合成一个派生 store：live 时合并补全行与选中项，否则返回原状态；结果按输入引用缓存。
 */
function createAutocompleteStore(store) {
  let store_2 = createStore(EMPTY_AUTOCOMPLETE_STATE);
  let state = store.getState();
  let rowState = store_2.getState();
  let isLive = rowState.isLive();
  let merged = mergeAutocompleteRows(state, rowState, undefined);
  function getDrawn() {
    let state_2 = store.getState();
    let state_3 = store_2.getState();
    let nextIsLive = state_3.isLive();
    let isUnchanged = state_2 === state && state_3 === rowState && nextIsLive === isLive;
    let areSuggestionsUnchanged = state_2.suggestions === state.suggestions && state_3.rows === rowState.rows;
    if (!isUnchanged) {
      let suggestions = areSuggestionsUnchanged ? merged.suggestions : undefined;
      merged = nextIsLive
        ? mergeAutocompleteRows(state_2, state_3, suggestions)
        : mergeAutocompleteRows(
            clearHoverIfInRows(state_2, state_3.rows),
            freezeRowsIfEmpty(state_3),
            suggestions,
          );
      state = state_2;
      rowState = state_3;
      isLive = nextIsLive;
    }
    return merged;
  }
  function getLive() {
    let drawnState = getDrawn();
    return isLive ? drawnState : state;
  }
  return createAutocompleteView(
    {
      own: store,
      rows: store_2,
    },
    {
      live: getLive,
      drawn: getDrawn,
    },
  );
}
//@ chunk-czq1j3j2.js:564758-564878 placement
function createAutocompleteLogger() {
  let lastQuery;
  let isHooked = hasModuleHookingSite("prompt.autocomplete");
  return (query) => {
    let didChange = query !== lastQuery;
    lastQuery = query;
    if (didChange) isHooked = hasModuleHookingSite("prompt.autocomplete");
    return isHooked;
  };
}
//@ chunk-czq1j3j2.js:564878-564882 layout
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:564878", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:564882-564985 placement
var withAutocompleteSelection = (state, selectedRowId, arrowed) => ({
  rows: state.rows,
  isLive: state.isLive,
  isArrowed: selectedRowId !== undefined && arrowed,
  ...(selectedRowId !== undefined && {
    selectedId: selectedRowId,
  }),
});
//@ chunk-czq1j3j2.js:564985-565229 placement
function toAutocompleteSuggestions(items) {
  let seenCounts = new Map();
  return items.map(({ text, label, description }) => {
    let seenCount = seenCounts.get(text) ?? 0;
    seenCounts.set(text, seenCount + 1);
    return {
      id: `autocomplete-${seenCount}-${text}`,
      displayText: (label ?? text).replace(/\s+/gu, " "),
      ...(description !== undefined && {
        description,
      }),
      autocompleteText: text,
    };
  });
}
//@ chunk-czq1j3j2.js:565229-565241 placement
var AUTOCOMPLETE_TIMEOUT_MS = 150;
//@ chunk-czq1j3j2.js:565241-566616 placement
function raisePromptAutocomplete(onSuggestions, options = {}, debounceMs = AUTOCOMPLETE_TIMEOUT_MS) {
  let raise = options.raise ?? autocompleteWithNoCore;
  let report =
    options.report ??
    ((message) =>
      logForDebugging(message, {
        level: "error",
      }));
  let abortController = new AbortController();
  let hooked = false;
  let currentTokenSnap;
  let pendingToken;
  let inFlightToken;
  let inFlightController;
  let shownToken;
  let timer;
  let droppedText;
  function showSuggestions(token, items) {
    let shouldEmit = shownToken !== undefined || items.length > 0;
    shownToken = items.length > 0 ? token : undefined;
    clearTimeout(timer);
    timer = undefined;
    if (shouldEmit) onSuggestions(items);
  }
  function startNext() {
    let token = pendingToken;
    if (token === undefined || inFlightController !== undefined) {
      inFlightController?.abort();
      return;
    }
    let abortController = new AbortController();
    pendingToken = undefined;
    inFlightController = abortController;
    new Promise((resolve) => resolve(raise(token, abortController.signal)))
      .then((result) => toAutocompleteSuggestions(normalizeAutocompleteSuggestions(result.suggestions)))
      .catch((error) => {
        if (!abortController.signal.aborted)
          report(`prompt.autocomplete: ${errorMessage(error)}; no row added`);
        return EMPTY_SUGGESTION_ROWS;
      })
      .then((result) => onResult(token, result))
      .catch((error) => report(`prompt.autocomplete: ${errorMessage(error)}; no row shown`));
  }
  function onResult(token, items) {
    inFlightController = undefined;
    if (abortController.signal.aborted) return;
    if (inFlightToken === token) showSuggestions(token, items);
    startNext();
  }
  let isAnswerTo = (token) => shownToken?.text === token.text && shownToken.cursor === token.cursor;
  function onDebounce() {
    let shouldClear = currentTokenSnap === undefined || !isAnswerTo(currentTokenSnap);
    timer = undefined;
    if (shouldClear) showSuggestions(undefined, EMPTY_SUGGESTION_ROWS);
  }
  function reset() {
    pendingToken = undefined;
    inFlightToken = undefined;
    inFlightController?.abort();
    showSuggestions(undefined, EMPTY_SUGGESTION_ROWS);
  }
  return {
    ask: (token) => {
      let nextToken =
        hooked && token !== undefined && token.text !== droppedText ? currentToken(token) : undefined;
      let sameToken =
        nextToken?.text === currentTokenSnap?.text && nextToken?.cursor === currentTokenSnap?.cursor;
      droppedText = token?.text === droppedText ? droppedText : undefined;
      if (sameToken) return;
      let samePrefix =
        nextToken !== undefined &&
        currentTokenSnap !== undefined &&
        nextToken.start === currentTokenSnap.start &&
        nextToken.text.slice(0, nextToken.start) === currentTokenSnap.text.slice(0, currentTokenSnap.start);
      currentTokenSnap = nextToken;
      if (!samePrefix) reset();
      let differs = nextToken !== undefined && !isAnswerTo(nextToken);
      if (shownToken !== undefined && differs) timer ??= setTimeout(onDebounce, debounceMs);
      pendingToken = nextToken;
      inFlightToken = nextToken;
      startNext();
    },
    drop: () => {
      droppedText = currentTokenSnap?.text;
      currentTokenSnap = undefined;
      reset();
    },
    isAnswerTo,
    setHooked: (hookedFlag) => {
      hooked = hookedFlag;
    },
    dispose: () => {
      abortController.abort();
      reset();
    },
  };
}
//@ chunk-czq1j3j2.js:566616-566683 placement
function liveRowsOf(shown) {
  let state = shown.rows.getState();
  return state.isLive() ? state.rows : EMPTY_SUGGESTION_ROWS;
}
//@ chunk-czq1j3j2.js:566683-566711 placement
var nextIndexWrap = (selectedSuggestion, total) =>
  selectedSuggestion >= total - 1 ? 0 : selectedSuggestion + 1;
//@ chunk-czq1j3j2.js:566711-566739 placement
var prevIndexWrap = (selectedSuggestion, total) =>
  selectedSuggestion <= 0 ? total - 1 : selectedSuggestion - 1;
//@ chunk-czq1j3j2.js:566739-567317 placement
/**
 * 在合并后的建议列表中上下移动选中项：落在自有建议区就更新 selectedSuggestion，落在补全行区就更新补全 store 的 selectedId 与 isArrowed。
 */
function moveAutocompleteSelection(store, direction, arrowed) {
  let rows = liveRowsOf(store);
  let state = store.getState();
  let total = state.suggestions.length;
  let ownCount = total - rows.length;
  let stepped =
    direction > 0
      ? nextIndexWrap(state.selectedSuggestion, total)
      : prevIndexWrap(state.selectedSuggestion, total);
  let isOwnRow = state.selectedSuggestion >= ownCount;
  let isArrowed = store.rows.getState().isArrowed;
  let nextIndex = arrowed && isOwnRow && !isArrowed ? state.selectedSuggestion : stepped;
  let selectedRowId = nextIndex < ownCount ? undefined : rows[nextIndex - ownCount]?.id;
  if (rows.length === 0) return false;
  store.own.setState((nextSelection) => ({
    ...nextSelection,
    hoveredSuggestionId: null,
    selectedSuggestion: nextIndex < ownCount ? nextIndex : nextSelection.selectedSuggestion,
    ...(arrowed && {
      arrowedSuggestionId: nextIndex < ownCount ? nextSelection.suggestions[nextIndex]?.id : null,
    }),
  }));
  store.rows.setState((state) =>
    state.selectedId === selectedRowId && (selectedRowId === undefined || state.isArrowed === arrowed)
      ? state
      : withAutocompleteSelection(state, selectedRowId, arrowed),
  );
  return true;
}
//@ chunk-czq1j3j2.js:567317-567469 placement
function nextAutocompleteRowsState(previousState, rows, isLive) {
  let hasNoRows = rows.length === 0;
  let keepsSelection =
    previousState.selectedId !== undefined && rows.some((state) => state.id === previousState.selectedId);
  return hasNoRows
    ? EMPTY_AUTOCOMPLETE_STATE
    : {
        isArrowed: false,
        ...(keepsSelection && previousState),
        rows,
        isLive,
      };
}
//@ chunk-czq1j3j2.js:567469-567675 placement
function activeAutocompleteRow(shown) {
  let liveRows = liveRowsOf(shown);
  let { selectedId } = shown.rows.getState();
  let { suggestions, hoveredSuggestionId } = shown.own.getState();
  return suggestions.some((suggestion) => suggestion.id === hoveredSuggestionId)
    ? undefined
    : (liveRows.find((row) => row.id === hoveredSuggestionId) ??
        liveRows.find((row) => row.id === selectedId));
}
//@ chunk-czq1j3j2.js:567675-567791 placement
var autocompleteRowEdit = (input, inputText) =>
  applyTextInsertion({
    origin: COMPOSER_EDIT_ORIGIN,
    text: input.text,
    cursor: input.cursor,
    start: currentToken(input)?.start ?? input.cursor,
    end: input.cursor,
    inputText,
  });
//@ chunk-czq1j3j2.js:567791-569027 placement
function takeAutocompleteRow(props) {
  let { shown, draft, text, cursor, isOpen } = props;
  let [autocomplete] = useState(() =>
    raisePromptAutocomplete((suggestions) => {
      let rows = shown.rows.getState().rows;
      shown.rows.setState((rowsState) => nextAutocompleteRowsState(rowsState, suggestions, isLive));
      shown.own.setState((ownState) => clearHoverIfInRows(ownState, rows));
    }),
  );
  let [isLive] = useState(
    () => () =>
      autocomplete.isAnswerTo({
        text: draft.value,
        cursor: draft.cursorOffset,
      }),
  );
  let [handlers] = useState(() => {
    function acceptRow(row) {
      let autocompleteText = row?.autocompleteText;
      if (autocompleteText === undefined) return false;
      try {
        let edited = autocompleteRowEdit(
          {
            text: draft.value,
            cursor: draft.cursorOffset,
          },
          autocompleteText,
        );
        autocomplete.drop();
        draft.setValueWithCursor(edited.text, edited.cursor);
        logFeatureOk("plugin_function_hooks_autocomplete");
      } catch (error) {
        logFeatureBad("plugin_function_hooks_autocomplete", "take_failed");
        logForDebugging(`prompt.autocomplete: ${errorMessage(error)}; the row was not taken`, {
          level: "error",
        });
      }
      return true;
    }
    let hasLiveRows = () => liveRowsOf(shown).length > 0;
    let hasNoOwnRows = () => shown.own.getState().suggestions.length === 0;
    return {
      tab: () => acceptRow(activeAutocompleteRow(shown)),
      tabTop: () => hasNoOwnRows() && acceptRow(liveRowsOf(shown)[0]),
      enter: () => {
        let taken = acceptRow(activeAutocompleteRow(shown));
        let canFallThrough = hasLiveRows() && hasNoOwnRows();
        return taken ? "taken" : canFallThrough ? "left" : "engine";
      },
      click: (rowId) => acceptRow(liveRowsOf(shown).find((state) => state.id === rowId)),
      move: (direction, arrowed) => moveAutocompleteSelection(shown, direction, arrowed),
      drop: autocomplete.drop,
    };
  });
  let [logger] = useState(createAutocompleteLogger);
  let storeSelector = useStoreSelector(renderVersions(), logger);
  useEffect(() => {
    try {
      autocomplete.setHooked(storeSelector);
      autocomplete.ask(
        isOpen
          ? {
              text,
              cursor,
            }
          : undefined,
      );
      shown.rows.setState(freezeRowsIfEmpty);
      shown.own.setState((ownState) => clearHoverIfInRows(ownState, shown.rows.getState().rows));
    } catch (error) {
      logForDebugging(`prompt.autocomplete: ${errorMessage(error)}; no plugin was asked`, {
        level: "error",
      });
    }
  }, [autocomplete, shown, storeSelector, isOpen, text, cursor]);
  useEffect(() => () => autocomplete.dispose(), [autocomplete]);
  return handlers;
}
export { createAutocompleteStore, takeAutocompleteRow };

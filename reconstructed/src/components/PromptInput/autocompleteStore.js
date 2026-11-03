/**
 * components/PromptInput/autocompleteStore.ts
 *
 * 2.1.316 新增。输入补全状态存储。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (25)
 * attribution: placement 25
 */
import { createStore } from "../../state/store.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { init_react_production, y, P } from "../../../vendor/react/cjs/react.production.js";
import {
  autocompleteWithNoCore,
  normalizeAutocompleteSuggestions,
  currentToken,
  cXe,
} from "../../plugins/functionHooks/sessionEvents.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { applyTextInsertion } from "../../plugins/functionHooks/coreHandlers.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { renderVersions } from "../../plugins/functionHooks/ui/renderInstances.js";

//@ chunk-18hwfzwa.js:542676-542763 placement
var subscribeOwnAndRows = (h) => (x) => {
  let D = h.own.subscribe(x);
  let L = h.rows.subscribe(x);
  return () => {
    D();
    L();
  };
};
//@ chunk-18hwfzwa.js:542763-542855 placement
var buildLiveView = (h, x, subscribe) => ({
  getSnapshot: x.live,
  getState: x.live,
  setState: h.own.setState,
  subscribe,
});
//@ chunk-18hwfzwa.js:542855-542943 placement
var createAutocompleteView = (h, x) => ({
  ...h,
  ...buildLiveView(h, x, subscribeOwnAndRows(h)),
  drawn: {
    getSnapshot: x.drawn,
    subscribe: subscribeOwnAndRows(h),
  },
});
//@ chunk-18hwfzwa.js:542943-542958 placement
var alwaysFalse = () => false;
//@ chunk-18hwfzwa.js:542958-542983 placement
var ET = Object.freeze([]);
//@ chunk-18hwfzwa.js:542983-543039 placement
var XY = Object.freeze({
  rows: ET,
  isLive: alwaysFalse,
  isArrowed: false,
});
//@ chunk-18hwfzwa.js:543039-543118 placement
var normalizeSelectedSuggestion = (h) =>
  h.selectedSuggestion < h.suggestions.length ? h.selectedSuggestion : -1;
//@ chunk-18hwfzwa.js:543118-543417 placement
function mergeAutocompleteRows(h, x, suggestions) {
  let ee = x.selectedId !== undefined ? x.rows.findIndex((Be) => Be.id === x.selectedId) : -1;
  let ke = x.rows.length === 0;
  let isArrowed = ee >= 0 && x.isArrowed;
  return ke
    ? h
    : {
        ...h,
        suggestions: suggestions ?? h.suggestions.concat(x.rows),
        selectedSuggestion: ee < 0 ? normalizeSelectedSuggestion(h) : h.suggestions.length + ee,
        ...(isArrowed && {
          arrowedSuggestionId: x.selectedId,
        }),
      };
}
//@ chunk-18hwfzwa.js:543417-543503 placement
function freezeRowsIfEmpty(h) {
  return h.rows.length === 0
    ? h
    : {
        rows: h.rows,
        isLive: h.isLive,
        isArrowed: false,
      };
}
//@ chunk-18hwfzwa.js:543503-543635 placement
function clearHoverIfInRows(h, rows) {
  let hoveredSuggestionId = h.hoveredSuggestionId;
  return hoveredSuggestionId !== null &&
    hoveredSuggestionId !== undefined &&
    rows.some((ee) => ee.id === hoveredSuggestionId)
    ? {
        ...h,
        hoveredSuggestionId: null,
      }
    : h;
}
//@ chunk-18hwfzwa.js:543635-544072 placement
/**
 * 把输入框建议状态与插件提供的补全行合成一个派生 store：live 时合并补全行与选中项，否则返回原状态；结果按输入引用缓存。
 */
function createAutocompleteStore(store) {
  let store_2 = createStore(XY);
  let state = store.getState();
  let state_2 = store_2.getState();
  let ee = state_2.isLive();
  let ke = mergeAutocompleteRows(state, state_2, undefined);
  function Re() {
    let state_3 = store.getState();
    let state_4 = store_2.getState();
    let ze = state_4.isLive();
    let Xe = state_3 === state && state_4 === state_2 && ze === ee;
    let rt = state_3.suggestions === state.suggestions && state_4.rows === state_2.rows;
    if (!Xe) {
      let suggestions = rt ? ke.suggestions : undefined;
      ke = ze
        ? mergeAutocompleteRows(state_3, state_4, suggestions)
        : mergeAutocompleteRows(
            clearHoverIfInRows(state_3, state_4.rows),
            freezeRowsIfEmpty(state_4),
            suggestions,
          );
      state = state_3;
      state_2 = state_4;
      ee = ze;
    }
    return ke;
  }
  function Be() {
    let He = Re();
    return ee ? He : state;
  }
  return createAutocompleteView(
    {
      own: store,
      rows: store_2,
    },
    {
      live: Be,
      drawn: Re,
    },
  );
}
//@ chunk-18hwfzwa.js:544072-544192 placement
function createAutocompleteLogger() {
  let h;
  let x = hasModuleHookingSite("prompt.autocomplete");
  return (D) => {
    let L = D !== h;
    h = D;
    if (L) x = hasModuleHookingSite("prompt.autocomplete");
    return x;
  };
}
//@ chunk-18hwfzwa.js:544192-544196 placement
init_react_production();
//@ chunk-18hwfzwa.js:544196-544299 placement
var withAutocompleteSelection = (h, selectedRowId, arrowed) => ({
  rows: h.rows,
  isLive: h.isLive,
  isArrowed: selectedRowId !== undefined && arrowed,
  ...(selectedRowId !== undefined && {
    selectedId: selectedRowId,
  }),
});
//@ chunk-18hwfzwa.js:544299-544543 placement
function toAutocompleteSuggestions(h) {
  let x = new Map();
  return h.map(({ text, label, description }) => {
    let ke = x.get(text) ?? 0;
    x.set(text, ke + 1);
    return {
      id: `autocomplete-${ke}-${text}`,
      displayText: (label ?? text).replace(/\s+/gu, " "),
      ...(description !== undefined && {
        description,
      }),
      autocompleteText: text,
    };
  });
}
//@ chunk-18hwfzwa.js:544543-544555 placement
var AUTOCOMPLETE_TIMEOUT_MS = 150;
//@ chunk-18hwfzwa.js:544555-545930 placement
function raisePromptAutocomplete(h, x = {}, D = AUTOCOMPLETE_TIMEOUT_MS) {
  let raise = x.raise ?? autocompleteWithNoCore;
  let ee =
    x.report ??
    ((oo) =>
      logForDebugging(oo, {
        level: "error",
      }));
  let abortController = new AbortController();
  let Re = false;
  let Be;
  let He;
  let We;
  let ze;
  let Xe;
  let rt;
  let kt;
  function At(oo, Xt) {
    let io = Xe !== undefined || Xt.length > 0;
    Xe = Xt.length > 0 ? oo : undefined;
    clearTimeout(rt);
    rt = undefined;
    if (io) h(Xt);
  }
  function It() {
    let oo = He;
    if (oo === undefined || ze !== undefined) {
      ze?.abort();
      return;
    }
    let abortController = new AbortController();
    He = undefined;
    ze = abortController;
    new Promise((resolve) => resolve(raise(oo, abortController.signal)))
      .then((io) => toAutocompleteSuggestions(normalizeAutocompleteSuggestions(io.suggestions)))
      .catch((error) => {
        if (!abortController.signal.aborted) ee(`prompt.autocomplete: ${errorMessage(error)}; no row added`);
        return ET;
      })
      .then((io) => Ot(oo, io))
      .catch((error) => ee(`prompt.autocomplete: ${errorMessage(error)}; no row shown`));
  }
  function Ot(oo, Xt) {
    ze = undefined;
    if (abortController.signal.aborted) return;
    if (We === oo) At(oo, Xt);
    It();
  }
  let Et = (oo) => Xe?.text === oo.text && Xe.cursor === oo.cursor;
  function Dt() {
    let oo = Be === undefined || !Et(Be);
    rt = undefined;
    if (oo) At(undefined, ET);
  }
  function Lt() {
    He = undefined;
    We = undefined;
    ze?.abort();
    At(undefined, ET);
  }
  return {
    ask: (oo) => {
      let io = Re && oo !== undefined && oo.text !== kt ? currentToken(oo) : undefined;
      let so = io?.text === Be?.text && io?.cursor === Be?.cursor;
      kt = oo?.text === kt ? kt : undefined;
      if (so) return;
      let po =
        io !== undefined &&
        Be !== undefined &&
        io.start === Be.start &&
        io.text.slice(0, io.start) === Be.text.slice(0, Be.start);
      Be = io;
      if (!po) Lt();
      let ao = io !== undefined && !Et(io);
      if (Xe !== undefined && ao) rt ??= setTimeout(Dt, D);
      He = io;
      We = io;
      It();
    },
    drop: () => {
      kt = Be?.text;
      Be = undefined;
      Lt();
    },
    isAnswerTo: Et,
    setHooked: (oo) => {
      Re = oo;
    },
    dispose: () => {
      abortController.abort();
      Lt();
    },
  };
}
//@ chunk-18hwfzwa.js:545930-545997 placement
function liveRowsOf(shown) {
  let state = shown.rows.getState();
  return state.isLive() ? state.rows : ET;
}
//@ chunk-18hwfzwa.js:545997-546025 placement
var nextIndexWrap = (selectedSuggestion, total) =>
  selectedSuggestion >= total - 1 ? 0 : selectedSuggestion + 1;
//@ chunk-18hwfzwa.js:546025-546053 placement
var prevIndexWrap = (selectedSuggestion, total) =>
  selectedSuggestion <= 0 ? total - 1 : selectedSuggestion - 1;
//@ chunk-18hwfzwa.js:546053-546631 placement
/**
 * 在合并后的建议列表中上下移动选中项：落在自有建议区就更新 selectedSuggestion，落在补全行区就更新补全 store 的 selectedId 与 isArrowed。
 */
function moveAutocompleteSelection(store, direction, arrowed) {
  let rows = liveRowsOf(store);
  let state = store.getState();
  let total = state.suggestions.length;
  let ownCount = total - rows.length;
  let He =
    direction > 0
      ? nextIndexWrap(state.selectedSuggestion, total)
      : prevIndexWrap(state.selectedSuggestion, total);
  let We = state.selectedSuggestion >= ownCount;
  let isArrowed = store.rows.getState().isArrowed;
  let nextIndex = arrowed && We && !isArrowed ? state.selectedSuggestion : He;
  let selectedRowId = nextIndex < ownCount ? undefined : rows[nextIndex - ownCount]?.id;
  if (rows.length === 0) return false;
  store.own.setState((At) => ({
    ...At,
    hoveredSuggestionId: null,
    selectedSuggestion: nextIndex < ownCount ? nextIndex : At.selectedSuggestion,
    ...(arrowed && {
      arrowedSuggestionId: nextIndex < ownCount ? At.suggestions[nextIndex]?.id : null,
    }),
  }));
  store.rows.setState((At) =>
    At.selectedId === selectedRowId && (selectedRowId === undefined || At.isArrowed === arrowed)
      ? At
      : withAutocompleteSelection(At, selectedRowId, arrowed),
  );
  return true;
}
//@ chunk-18hwfzwa.js:546631-546783 placement
function nextAutocompleteRowsState(h, x, isLive) {
  let L = x.length === 0;
  let ee = h.selectedId !== undefined && x.some((ke) => ke.id === h.selectedId);
  return L
    ? XY
    : {
        isArrowed: false,
        ...(ee && h),
        rows: x,
        isLive,
      };
}
//@ chunk-18hwfzwa.js:546783-546989 placement
function activeAutocompleteRow(shown) {
  let x = liveRowsOf(shown);
  let { selectedId } = shown.rows.getState();
  let { suggestions, hoveredSuggestionId } = shown.own.getState();
  return suggestions.some((suggestion) => suggestion.id === hoveredSuggestionId)
    ? undefined
    : (x.find((Re) => Re.id === hoveredSuggestionId) ?? x.find((Re) => Re.id === selectedId));
}
//@ chunk-18hwfzwa.js:546989-547105 placement
var autocompleteRowEdit = (h, inputText) =>
  applyTextInsertion({
    origin: cXe,
    text: h.text,
    cursor: h.cursor,
    start: currentToken(h)?.start ?? h.cursor,
    end: h.cursor,
    inputText,
  });
//@ chunk-18hwfzwa.js:547105-548341 placement
function takeAutocompleteRow(props) {
  let { shown, draft, text, cursor, isOpen } = props;
  let [Re] = y(() =>
    raisePromptAutocomplete((Xe) => {
      let rows = shown.rows.getState().rows;
      shown.rows.setState((kt) => nextAutocompleteRowsState(kt, Xe, isLive));
      shown.own.setState((kt) => clearHoverIfInRows(kt, rows));
    }),
  );
  let [isLive] = y(
    () => () =>
      Re.isAnswerTo({
        text: draft.value,
        cursor: draft.cursorOffset,
      }),
  );
  let [He] = y(() => {
    function Xe(At) {
      let autocompleteText = At?.autocompleteText;
      if (autocompleteText === undefined) return false;
      try {
        let Ot = autocompleteRowEdit(
          {
            text: draft.value,
            cursor: draft.cursorOffset,
          },
          autocompleteText,
        );
        Re.drop();
        draft.setValueWithCursor(Ot.text, Ot.cursor);
        logFeatureOk("plugin_function_hooks_autocomplete");
      } catch (error) {
        logFeatureBad("plugin_function_hooks_autocomplete", "take_failed");
        logForDebugging(`prompt.autocomplete: ${errorMessage(error)}; the row was not taken`, {
          level: "error",
        });
      }
      return true;
    }
    let rt = () => liveRowsOf(shown).length > 0;
    let kt = () => shown.own.getState().suggestions.length === 0;
    return {
      tab: () => Xe(activeAutocompleteRow(shown)),
      tabTop: () => kt() && Xe(liveRowsOf(shown)[0]),
      enter: () => {
        let At = Xe(activeAutocompleteRow(shown));
        let It = rt() && kt();
        return At ? "taken" : It ? "left" : "engine";
      },
      click: (At) => Xe(liveRowsOf(shown).find((It) => It.id === At)),
      move: (direction, arrowed) => moveAutocompleteSelection(shown, direction, arrowed),
      drop: Re.drop,
    };
  });
  let [We] = y(createAutocompleteLogger);
  let storeSelector = useStoreSelector(renderVersions(), We);
  P(() => {
    try {
      Re.setHooked(storeSelector);
      Re.ask(
        isOpen
          ? {
              text,
              cursor,
            }
          : undefined,
      );
      shown.rows.setState(freezeRowsIfEmpty);
      shown.own.setState((Xe) => clearHoverIfInRows(Xe, shown.rows.getState().rows));
    } catch (error) {
      logForDebugging(`prompt.autocomplete: ${errorMessage(error)}; no plugin was asked`, {
        level: "error",
      });
    }
  }, [Re, shown, storeSelector, isOpen, text, cursor]);
  P(() => () => Re.dispose(), [Re]);
  return He;
}
export { createAutocompleteStore, takeAutocompleteRow };

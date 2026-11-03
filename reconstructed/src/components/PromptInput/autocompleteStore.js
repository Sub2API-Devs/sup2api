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
import { j, y, P } from "../../../vendor/react/cjs/react.production.js";
import {
  Y0n,
  normalizeAutocompleteSuggestions,
  currentToken,
  freeze as freeze_9,
} from "../../plugins/functionHooks/sessionEvents.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { applyTextInsertion } from "../../plugins/functionHooks/coreHandlers.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { JB } from "../../plugins/functionHooks/ui/renderInstances.js";

//@ chunk-18hwfzwa.js:542676-542763 placement
var Vce = (h) => (x) => {
  let subscribe = h.own.subscribe(x),
    subscribe_2 = h.rows.subscribe(x);
  return () => {
    (subscribe(), subscribe_2());
  };
};
//@ chunk-18hwfzwa.js:542763-542855 placement
var kVe = (h, x, D) => ({ getSnapshot: x.live, getState: x.live, setState: h.own.setState, subscribe: D });
//@ chunk-18hwfzwa.js:542855-542943 placement
var vVe = (h, x) => ({ ...h, ...kVe(h, x, Vce(h)), drawn: { getSnapshot: x.drawn, subscribe: Vce(h) } });
//@ chunk-18hwfzwa.js:542943-542958 placement
var TVe = () => !1;
//@ chunk-18hwfzwa.js:542958-542983 placement
var freeze_2 = Object.freeze([]);
//@ chunk-18hwfzwa.js:542983-543039 placement
var freeze_3 = Object.freeze({ rows: freeze_2, isLive: TVe, isArrowed: !1 });
//@ chunk-18hwfzwa.js:543039-543118 placement
var RVe = (h) => (h.selectedSuggestion < h.suggestions.length ? h.selectedSuggestion : -1);
//@ chunk-18hwfzwa.js:543118-543417 placement
function mergeAutocompleteRows(h, x, D) {
  let ee = x.selectedId !== void 0 ? x.rows.findIndex((row) => row.id === x.selectedId) : -1,
    ke = x.rows.length === 0,
    Re = ee >= 0 && x.isArrowed;
  return ke
    ? h
    : {
        ...h,
        suggestions: D ?? h.suggestions.concat(x.rows),
        selectedSuggestion: ee < 0 ? RVe(h) : h.suggestions.length + ee,
        ...(Re && { arrowedSuggestionId: x.selectedId }),
      };
}
//@ chunk-18hwfzwa.js:543417-543503 placement
function Kce(h) {
  return h.rows.length === 0 ? h : { rows: h.rows, isLive: h.isLive, isArrowed: !1 };
}
//@ chunk-18hwfzwa.js:543503-543635 placement
function clearHoverIfInRows(h, x) {
  let hoveredSuggestionId = h.hoveredSuggestionId;
  return hoveredSuggestionId !== null &&
    hoveredSuggestionId !== void 0 &&
    x.some((ee) => ee.id === hoveredSuggestionId)
    ? { ...h, hoveredSuggestionId: null }
    : h;
}
/**
 * 把输入框建议状态与插件提供的补全行合成一个派生 store：live 时合并补全行与选中项，否则返回原状态；结果按输入引用缓存。
 */
//@ chunk-18hwfzwa.js:543635-544072 placement
function createAutocompleteStore(h) {
  let x = createStore(freeze_3),
    state = h.getState(),
    state_2 = x.getState(),
    isLive = state_2.isLive(),
    ke = mergeAutocompleteRows(state, state_2, void 0);
  function Re() {
    let state_3 = h.getState(),
      state_4 = x.getState(),
      isLive_2 = state_4.isLive(),
      Xe = state_3 === state && state_4 === state_2 && isLive_2 === isLive,
      rt = state_3.suggestions === state.suggestions && state_4.rows === state_2.rows;
    if (!Xe) {
      let kt = rt ? ke.suggestions : void 0;
      ((ke = isLive_2
        ? mergeAutocompleteRows(state_3, state_4, kt)
        : mergeAutocompleteRows(clearHoverIfInRows(state_3, state_4.rows), Kce(state_4), kt)),
        (state = state_3),
        (state_2 = state_4),
        (isLive = isLive_2));
    }
    return ke;
  }
  function Be() {
    let He = Re();
    return isLive ? He : state;
  }
  return vVe({ own: h, rows: x }, { live: Be, drawn: Re });
}
//@ chunk-18hwfzwa.js:544072-544192 placement
function createAutocompleteLogger() {
  let h,
    x = hasModuleHookingSite("prompt.autocomplete");
  return (D) => {
    let L = D !== h;
    if (((h = D), L)) x = hasModuleHookingSite("prompt.autocomplete");
    return x;
  };
}
//@ chunk-18hwfzwa.js:544192-544196 placement
j();
//@ chunk-18hwfzwa.js:544196-544299 placement
var withAutocompleteSelection = (h, x, D) => ({
  rows: h.rows,
  isLive: h.isLive,
  isArrowed: x !== void 0 && D,
  ...(x !== void 0 && { selectedId: x }),
});
//@ chunk-18hwfzwa.js:544299-544543 placement
function toAutocompleteSuggestions(h) {
  let x = new Map();
  return h.map(({ text: text, label: label, description: description }) => {
    let ke = x.get(text) ?? 0;
    return (
      x.set(text, ke + 1),
      {
        id: `autocomplete-${ke}-${text}`,
        displayText: (label ?? text).replace(/\s+/gu, " "),
        ...(description !== void 0 && { description: description }),
        autocompleteText: text,
      }
    );
  });
}
//@ chunk-18hwfzwa.js:544543-544555 placement
var DVe = 150;
//@ chunk-18hwfzwa.js:544555-545930 placement
function raisePromptAutocomplete(h, x = {}, D = DVe) {
  let L = x.raise ?? Y0n,
    ee = x.report ?? ((oo) => logForDebugging(oo, { level: "error" })),
    abortController = new AbortController(),
    Re = !1,
    Be,
    He,
    We,
    ze,
    Xe,
    rt,
    kt;
  function At(oo, Xt) {
    let io = Xe !== void 0 || Xt.length > 0;
    if (((Xe = Xt.length > 0 ? oo : void 0), clearTimeout(rt), (rt = void 0), io)) h(Xt);
  }
  function It() {
    let oo = He;
    if (oo === void 0 || ze !== void 0) {
      ze?.abort();
      return;
    }
    let abortController = new AbortController();
    ((He = void 0),
      (ze = abortController),
      new Promise((io) => io(L(oo, abortController.signal)))
        .then((io) => toAutocompleteSuggestions(normalizeAutocompleteSuggestions(io.suggestions)))
        .catch((io) => {
          if (!abortController.signal.aborted) ee(`prompt.autocomplete: ${errorMessage(io)}; no row added`);
          return freeze_2;
        })
        .then((io) => Ot(oo, io))
        .catch((io) => ee(`prompt.autocomplete: ${errorMessage(io)}; no row shown`)));
  }
  function Ot(oo, Xt) {
    if (((ze = void 0), abortController.signal.aborted)) return;
    if (We === oo) At(oo, Xt);
    It();
  }
  let Et = (oo) => Xe?.text === oo.text && Xe.cursor === oo.cursor;
  function Dt() {
    let oo = Be === void 0 || !Et(Be);
    if (((rt = void 0), oo)) At(void 0, freeze_2);
  }
  function Lt() {
    ((He = void 0), (We = void 0), ze?.abort(), At(void 0, freeze_2));
  }
  return {
    ask: (oo) => {
      let io = Re && oo !== void 0 && oo.text !== kt ? currentToken(oo) : void 0,
        so = io?.text === Be?.text && io?.cursor === Be?.cursor;
      if (((kt = oo?.text === kt ? kt : void 0), so)) return;
      let po =
        io !== void 0 &&
        Be !== void 0 &&
        io.start === Be.start &&
        io.text.slice(0, io.start) === Be.text.slice(0, Be.start);
      if (((Be = io), !po)) Lt();
      let ao = io !== void 0 && !Et(io);
      if (Xe !== void 0 && ao) rt ??= setTimeout(Dt, D);
      ((He = io), (We = io), It());
    },
    drop: () => {
      ((kt = Be?.text), (Be = void 0), Lt());
    },
    isAnswerTo: Et,
    setHooked: (oo) => {
      Re = oo;
    },
    dispose: () => {
      (abortController.abort(), Lt());
    },
  };
}
//@ chunk-18hwfzwa.js:545930-545997 placement
function cA(h) {
  let state = h.rows.getState();
  return state.isLive() ? state.rows : freeze_2;
}
//@ chunk-18hwfzwa.js:545997-546025 placement
var NVe = (h, x) => (h >= x - 1 ? 0 : h + 1);
//@ chunk-18hwfzwa.js:546025-546053 placement
var LVe = (h, x) => (h <= 0 ? x - 1 : h - 1);
/**
 * 在合并后的建议列表中上下移动选中项：落在自有建议区就更新 selectedSuggestion，落在补全行区就更新补全 store 的 selectedId 与 isArrowed。
 */
//@ chunk-18hwfzwa.js:546053-546631 placement
function moveAutocompleteSelection(store, direction, arrowed) {
  let rows = cA(store),
    state = store.getState(),
    total = state.suggestions.length,
    ownCount = total - rows.length,
    He = direction > 0 ? NVe(state.selectedSuggestion, total) : LVe(state.selectedSuggestion, total),
    We = state.selectedSuggestion >= ownCount,
    isArrowed = store.rows.getState().isArrowed,
    nextIndex = arrowed && We && !isArrowed ? state.selectedSuggestion : He,
    selectedRowId = nextIndex < ownCount ? void 0 : rows[nextIndex - ownCount]?.id;
  if (rows.length === 0) return !1;
  return (
    store.own.setState((At) => ({
      ...At,
      hoveredSuggestionId: null,
      selectedSuggestion: nextIndex < ownCount ? nextIndex : At.selectedSuggestion,
      ...(arrowed && { arrowedSuggestionId: nextIndex < ownCount ? At.suggestions[nextIndex]?.id : null }),
    })),
    store.rows.setState((At) =>
      At.selectedId === selectedRowId && (selectedRowId === void 0 || At.isArrowed === arrowed)
        ? At
        : withAutocompleteSelection(At, selectedRowId, arrowed),
    ),
    !0
  );
}
//@ chunk-18hwfzwa.js:546631-546783 placement
function nextAutocompleteRowsState(h, x, D) {
  let L = x.length === 0,
    ee = h.selectedId !== void 0 && x.some((ke) => ke.id === h.selectedId);
  return L ? freeze_3 : { isArrowed: !1, ...(ee && h), rows: x, isLive: D };
}
//@ chunk-18hwfzwa.js:546783-546989 placement
function activeAutocompleteRow(h) {
  let x = cA(h),
    { selectedId: selectedId } = h.rows.getState(),
    { suggestions: suggestions, hoveredSuggestionId: hoveredSuggestionId } = h.own.getState();
  return suggestions.some((Re) => Re.id === hoveredSuggestionId)
    ? void 0
    : (x.find((Re) => Re.id === hoveredSuggestionId) ?? x.find((Re) => Re.id === selectedId));
}
//@ chunk-18hwfzwa.js:546989-547105 placement
var autocompleteRowEdit = (h, x) =>
  applyTextInsertion({
    origin: freeze_9,
    text: h.text,
    cursor: h.cursor,
    start: currentToken(h)?.start ?? h.cursor,
    end: h.cursor,
    inputText: x,
  });
//@ chunk-18hwfzwa.js:547105-548341 placement
function takeAutocompleteRow(h) {
  let { shown: shown, draft: draft, text: text, cursor: cursor, isOpen: isOpen } = h,
    [Re] = y(() =>
      raisePromptAutocomplete((Xe) => {
        let rows = shown.rows.getState().rows;
        (shown.rows.setState((kt) => nextAutocompleteRowsState(kt, Xe, Be)),
          shown.own.setState((kt) => clearHoverIfInRows(kt, rows)));
      }),
    ),
    [Be] = y(() => () => Re.isAnswerTo({ text: draft.value, cursor: draft.cursorOffset })),
    [He] = y(() => {
      function Xe(At) {
        let It = At?.autocompleteText;
        if (It === void 0) return !1;
        try {
          let Ot = autocompleteRowEdit({ text: draft.value, cursor: draft.cursorOffset }, It);
          (Re.drop(),
            draft.setValueWithCursor(Ot.text, Ot.cursor),
            logFeatureOk("plugin_function_hooks_autocomplete"));
        } catch (error) {
          (logFeatureBad("plugin_function_hooks_autocomplete", "take_failed"),
            logForDebugging(`prompt.autocomplete: ${errorMessage(error)}; the row was not taken`, {
              level: "error",
            }));
        }
        return !0;
      }
      let rt = () => cA(shown).length > 0,
        kt = () => shown.own.getState().suggestions.length === 0;
      return {
        tab: () => Xe(activeAutocompleteRow(shown)),
        tabTop: () => kt() && Xe(cA(shown)[0]),
        enter: () => {
          let At = Xe(activeAutocompleteRow(shown)),
            It = rt() && kt();
          return At ? "taken" : It ? "left" : "engine";
        },
        click: (At) => Xe(cA(shown).find((It) => It.id === At)),
        move: (At, It) => moveAutocompleteSelection(shown, At, It),
        drop: Re.drop,
      };
    }),
    [We] = y(createAutocompleteLogger),
    ze = useStoreSelector(JB(), We);
  return (
    P(() => {
      try {
        (Re.setHooked(ze),
          Re.ask(isOpen ? { text: text, cursor: cursor } : void 0),
          shown.rows.setState(Kce),
          shown.own.setState((Xe) => clearHoverIfInRows(Xe, shown.rows.getState().rows)));
      } catch (error) {
        logForDebugging(`prompt.autocomplete: ${errorMessage(error)}; no plugin was asked`, {
          level: "error",
        });
      }
    }, [Re, shown, ze, isOpen, text, cursor]),
    P(() => () => Re.dispose(), [Re]),
    He
  );
}

export { createAutocompleteStore, takeAutocompleteRow };

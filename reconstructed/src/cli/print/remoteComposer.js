/**
 * cli/print/remoteComposer.ts
 *
 * 2.1.316 新增：远程输入框编辑队列、自动补全与面板描述
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (12)
 * attribution: placement 12
 */
import { identity } from "../../utils/identity.js";
import {
  fullscreenClients,
  clientRegistry,
  holdPanePlacement,
  placeWaitingPanes,
  paneHostSlot,
  describePaneUnplaced,
  resolvePaneColor,
} from "../../plugins/functionHooks/panes.js";
import { dropPaneSites, runPaneRequest, SCROLL_REQUEST_KIND } from "./pluginUiPanes.js";
import {
  autocompleteWithNoCore,
  currentToken,
  normalizeAutocompleteSuggestions,
  diffTextEdit,
  dispatchPromptEdit,
  clampCursor,
} from "../../plugins/functionHooks/sessionEvents.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { nonEmptySpans, normalizeInputDecorations } from "../../components/PromptInput/inputDecorations.js";
import { aEt } from "../../plugins/functionHooks/promptApi.js";

//@ chunk-tyg7f3ek.js:499590-499624 placement
var PANE_PLACEMENT_HOLDS = identity(new Map(), (e) => e.clear());
//@ chunk-tyg7f3ek.js:499624-499933 placement
function pruneDetachedClients() {
  let e = new Set(fullscreenClients().map((s) => s.clientId));
  let n = new Set(clientRegistry.list().map((s) => s.clientId));
  dropPaneSites((s) => !n.has(s.clientId));
  for (let [s, h] of PANE_PLACEMENT_HOLDS)
    if (!e.has(s)) {
      PANE_PLACEMENT_HOLDS.delete(s);
      h();
    }
  for (let s of e)
    if (!PANE_PLACEMENT_HOLDS.has(s)) {
      PANE_PLACEMENT_HOLDS.set(s, holdPanePlacement());
      placeWaitingPanes(`${s} attached`);
    }
  if (paneHostSlot.get() === undefined && describePaneUnplaced() === undefined)
    placeWaitingPanes("no sized client attached");
}
//@ chunk-tyg7f3ek.js:499933-500343 placement
var describePanesForClient = (e) => ({
  panes: e.panes.map((pane) => ({
    id: pane.id,
    title: pane.title,
    plugin: pane.plugin,
    ...(pane.closeOnEscape && {
      close_on_escape: pane.closeOnEscape,
    }),
    ...(pane.holdToasts && {
      hold_toasts: pane.holdToasts,
    }),
    ...(pane.backgroundColor !== undefined && {
      background_color: resolvePaneColor(pane.backgroundColor),
    }),
    ...(pane.rows !== undefined && {
      rows: pane.rows,
    }),
    ...(pane.columns !== undefined && {
      columns: pane.columns,
    }),
  })),
  shown_id: e.shownId,
  focused_id: e.focusedId,
  focus_requested_id: e.focusRequestedId,
});
//@ chunk-tyg7f3ek.js:500343-500364 placement
var handlePaneScrollRequest = (e) => runPaneRequest(e, SCROLL_REQUEST_KIND);
//@ chunk-tyg7f3ek.js:500364-500701 placement
function paneStateFields(props) {
  let { scroll, isFocused } = props;
  let s = typeof scroll === "object" && scroll !== null && "offset" in scroll && "bodyRows" in scroll;
  let offset = s ? scroll.offset : undefined;
  let bodyRows = s ? scroll.bodyRows : undefined;
  return {
    ...(typeof offset === "number" &&
      typeof bodyRows === "number" &&
      Number.isInteger(offset) &&
      Number.isInteger(bodyRows) &&
      offset >= 0 &&
      bodyRows >= 0 && {
        scroll: {
          offset,
          bodyRows,
        },
      }),
    ...(typeof isFocused === "boolean" && {
      keyboard: isFocused ? "held" : "away",
    }),
  };
}
//@ chunk-tyg7f3ek.js:500701-501679 placement
/**
 * 远程编辑器（remote composer）的 prompt.autocomplete：每个客户端一条在途请求，新请求取代旧请求。
 */
function createRemoteAutocomplete(e) {
  let raise = e.raise ?? autocompleteWithNoCore;
  let r = new Map();
  e.onDetach?.((y) => {
    s(r.get(y));
    r.delete(y);
  });
  function s(y) {
    y?.out?.abort();
    y?.waiting?.answer({
      suggestions: [],
      superseded: true,
    });
    if (y !== undefined) y.waiting = undefined;
  }
  function h(y, S) {
    let waiting = S.waiting;
    if (S.out === undefined && waiting === undefined && r.get(y) === S) r.delete(y);
    if (S.out !== undefined || waiting === undefined) {
      S.out?.abort();
      return;
    }
    let P = currentToken(waiting.box);
    let abortController = new AbortController();
    S.waiting = undefined;
    if (P === undefined) {
      waiting.answer({
        suggestions: [],
      });
      h(y, S);
      return;
    }
    S.out = abortController;
    new Promise((resolve) => resolve(raise(P, abortController.signal)))
      .then((q) => normalizeAutocompleteSuggestions(q.suggestions))
      .catch((error) => {
        if (!abortController.signal.aborted)
          logForDebugging(`prompt.autocomplete (remote composer): ${errorMessage(error)}; no row added`, {
            level: "error",
          });
        return [];
      })
      .then((suggestions) => {
        S.out = undefined;
        waiting.answer(
          abortController.signal.aborted
            ? {
                suggestions: [],
                superseded: true,
              }
            : {
                suggestions,
                start: P.start,
              },
        );
        h(y, S);
      });
  }
  return {
    ask: (y, box) =>
      new Promise((resolve) => {
        let w = r.get(y) ?? {};
        r.set(y, w);
        w.waiting?.answer({
          suggestions: [],
          superseded: true,
        });
        w.waiting = {
          box,
          answer: resolve,
        };
        h(y, w);
      }),
    clear: () => {
      for (let y of r.values()) s(y);
      r.clear();
    },
  };
}
//@ chunk-tyg7f3ek.js:501679-501732 placement
var REMOTE_AUTOCOMPLETE = identity(
  createRemoteAutocomplete({
    onDetach: clientRegistry.onDetach,
  }),
  (e) => e.clear(),
);
//@ chunk-tyg7f3ek.js:501732-501809 placement
function editDistanceAfterChange(e, n) {
  let { start, end, inputText } = diffTextEdit(e, n);
  return end - start + inputText.length;
}
//@ chunk-tyg7f3ek.js:501809-501888 placement
function closerEditBox(e, box) {
  let { box: box_2, offered } = e;
  return offered !== undefined && editDistanceAfterChange(offered, box) < editDistanceAfterChange(box_2, box)
    ? offered
    : box_2;
}
//@ chunk-tyg7f3ek.js:501888-502041 placement
function toInkKeyFromRemote(key) {
  let n = key.key === "space";
  return {
    key: n ? " " : key.key,
    name: n || [...key.key].length === 1 ? "" : key.key,
    ctrl: key.ctrl === true,
    shift: key.shift === true,
    meta: key.meta === true,
  };
}
//@ chunk-tyg7f3ek.js:502041-503294 placement
/**
 * 远程编辑器的 prompt.edit：按客户端排队编辑请求并逐个应用。
 */
function createRemoteEditQueue(e) {
  let raise = e.raise ?? dispatchPromptEdit;
  let r = new Map();
  e.onDetach?.((S) => r.delete(S));
  function s(S) {
    let last = S.waiting.at(-1);
    if (S.isRaising || last === undefined) return;
    let key = S.waiting.length === 1 ? last.key : undefined;
    let before = closerEditBox(S, last.box);
    for (let L of S.waiting.slice(0, -1))
      L.answer({
        ...L.box,
        superseded: true,
      });
    S.box = last.box;
    S.offered = undefined;
    S.waiting = [];
    S.isRaising = true;
    new Promise((resolve) =>
      resolve(
        raise({
          before,
          after: last.box,
          ...(key !== undefined && {
            key: toInkKeyFromRemote(key),
          }),
        }),
      ),
    )
      .then((L) => h(S, last, L))
      .catch((error) => {
        logForDebugging(`prompt.edit (remote composer): ${errorMessage(error)}; the edit stands`);
        h(S, last, last.box);
      });
  }
  function h(S, R, w) {
    let P = clampCursor(w);
    let L = (P.text !== R.box.text || P.cursor !== R.box.cursor) && S.waiting.length === 0 && !S.isStale;
    let q = nonEmptySpans(normalizeInputDecorations(w.decorations, P.text));
    S.isRaising = false;
    S.isStale = false;
    if (L) S.offered = P;
    R.answer({
      ...P,
      ...(q.length > 0 && {
        decorations: q,
      }),
    });
    s(S);
  }
  function y(S) {
    let R = r.get(S) ?? {
      box: aEt,
      isRaising: false,
      isStale: false,
      waiting: [],
    };
    r.delete(S);
    r.set(S, R);
    return R;
  }
  return {
    edit: (S) =>
      new Promise((resolve) => {
        let w = y(S.clientKey);
        w.waiting = [
          ...w.waiting,
          {
            box: clampCursor(S.box),
            ...(S.key !== undefined && {
              key: S.key,
            }),
            answer: resolve,
          },
        ];
        s(w);
      }),
    adopt: (S, R) => {
      let w = y(S);
      for (let P of w.waiting)
        P.answer({
          ...P.box,
          superseded: true,
        });
      w.box = clampCursor(R);
      w.offered = undefined;
      w.waiting = [];
      w.isStale = w.isRaising;
      return w.box;
    },
    read: () => [...r.values()].at(-1)?.box,
    forget: (S) => {
      r.delete(S);
    },
    clear: () => {
      r.clear();
    },
  };
}
//@ chunk-tyg7f3ek.js:503294-503347 placement
var REMOTE_EDIT_QUEUE = identity(
  createRemoteEditQueue({
    onDetach: clientRegistry.onDetach,
  }),
  (e) => e.clear(),
);
export {
  REMOTE_EDIT_QUEUE,
  pruneDetachedClients,
  describePanesForClient,
  REMOTE_AUTOCOMPLETE,
  handlePaneScrollRequest,
  paneStateFields,
};

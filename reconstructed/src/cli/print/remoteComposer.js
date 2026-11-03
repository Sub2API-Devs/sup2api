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
import { ge } from "../../utils/identity.js";
import {
  $tr,
  vk,
  holdPanePlacement,
  placeWaitingPanes,
  g2,
  describePaneUnplaced,
  JNe,
} from "../../plugins/functionHooks/panes.js";
import { dropPaneSites, runPaneRequest, SCROLL_REQUEST_KIND } from "./pluginUiPanes.js";
import {
  Y0n,
  currentToken,
  normalizeAutocompleteSuggestions,
  diffTextEdit,
  dispatchPromptEdit,
  X0n,
} from "../../plugins/functionHooks/sessionEvents.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { k8n, normalizeInputDecorations } from "../../components/PromptInput/inputDecorations.js";
import { freeze_19 } from "../../plugins/functionHooks/promptApi.js";

//@ chunk-tyg7f3ek.js:499590-499624 placement
var _m = ge(new Map(), (e) => e.clear());
//@ chunk-tyg7f3ek.js:499624-499933 placement
function pruneDetachedClients() {
  let e = new Set($tr().map((s) => s.clientId)),
    n = new Set(vk.list().map((s) => s.clientId));
  dropPaneSites((s) => !n.has(s.clientId));
  for (let [s, h] of _m) if (!e.has(s)) (_m.delete(s), h());
  for (let s of e) if (!_m.has(s)) (_m.set(s, holdPanePlacement()), placeWaitingPanes(`${s} attached`));
  if (g2.get() === void 0 && describePaneUnplaced() === void 0) placeWaitingPanes("no sized client attached");
}
//@ chunk-tyg7f3ek.js:499933-500343 placement
var describePanesForClient = (e) => ({
  panes: e.panes.map((pane) => ({
    id: pane.id,
    title: pane.title,
    plugin: pane.plugin,
    ...(pane.closeOnEscape && { close_on_escape: pane.closeOnEscape }),
    ...(pane.holdToasts && { hold_toasts: pane.holdToasts }),
    ...(pane.backgroundColor !== void 0 && { background_color: JNe(pane.backgroundColor) }),
    ...(pane.rows !== void 0 && { rows: pane.rows }),
    ...(pane.columns !== void 0 && { columns: pane.columns }),
  })),
  shown_id: e.shownId,
  focused_id: e.focusedId,
  focus_requested_id: e.focusRequestedId,
});
//@ chunk-tyg7f3ek.js:500343-500364 placement
var handlePaneScrollRequest = (e) => runPaneRequest(e, SCROLL_REQUEST_KIND);
//@ chunk-tyg7f3ek.js:500364-500701 placement
function paneStateFields(e) {
  let { scroll: scroll, isFocused: isFocused } = e,
    s = typeof scroll === "object" && scroll !== null && "offset" in scroll && "bodyRows" in scroll,
    h = s ? scroll.offset : void 0,
    y = s ? scroll.bodyRows : void 0;
  return {
    ...(typeof h === "number" &&
      typeof y === "number" &&
      Number.isInteger(h) &&
      Number.isInteger(y) &&
      h >= 0 &&
      y >= 0 && { scroll: { offset: h, bodyRows: y } }),
    ...(typeof isFocused === "boolean" && { keyboard: isFocused ? "held" : "away" }),
  };
}
/**
 * 远程编辑器（remote composer）的 prompt.autocomplete：每个客户端一条在途请求，新请求取代旧请求。
 */
//@ chunk-tyg7f3ek.js:500701-501679 placement
function createRemoteAutocomplete(e) {
  let n = e.raise ?? Y0n,
    r = new Map();
  e.onDetach?.((y) => {
    (s(r.get(y)), r.delete(y));
  });
  function s(y) {
    if ((y?.out?.abort(), y?.waiting?.answer({ suggestions: [], superseded: !0 }), y !== void 0))
      y.waiting = void 0;
  }
  function h(y, S) {
    let waiting = S.waiting;
    if (S.out === void 0 && waiting === void 0 && r.get(y) === S) r.delete(y);
    if (S.out !== void 0 || waiting === void 0) {
      S.out?.abort();
      return;
    }
    let P = currentToken(waiting.box),
      abortController = new AbortController();
    if (((S.waiting = void 0), P === void 0)) {
      (waiting.answer({ suggestions: [] }), h(y, S));
      return;
    }
    ((S.out = abortController),
      new Promise((q) => q(n(P, abortController.signal)))
        .then((q) => normalizeAutocompleteSuggestions(q.suggestions))
        .catch((q) => {
          if (!abortController.signal.aborted)
            logForDebugging(`prompt.autocomplete (remote composer): ${errorMessage(q)}; no row added`, {
              level: "error",
            });
          return [];
        })
        .then((q) => {
          ((S.out = void 0),
            waiting.answer(
              abortController.signal.aborted
                ? { suggestions: [], superseded: !0 }
                : { suggestions: q, start: P.start },
            ),
            h(y, S));
        }));
  }
  return {
    ask: (y, S) =>
      new Promise((R) => {
        let w = r.get(y) ?? {};
        (r.set(y, w),
          w.waiting?.answer({ suggestions: [], superseded: !0 }),
          (w.waiting = { box: S, answer: R }),
          h(y, w));
      }),
    clear: () => {
      for (let y of r.values()) s(y);
      r.clear();
    },
  };
}
//@ chunk-tyg7f3ek.js:501679-501732 placement
var REMOTE_AUTOCOMPLETE = ge(createRemoteAutocomplete({ onDetach: vk.onDetach }), (e) => e.clear());
//@ chunk-tyg7f3ek.js:501732-501809 placement
function nk(e, n) {
  let { start: start, end: end, inputText: inputText } = diffTextEdit(e, n);
  return end - start + inputText.length;
}
//@ chunk-tyg7f3ek.js:501809-501888 placement
function jI(e, n) {
  let { box: box, offered: offered } = e;
  return offered !== void 0 && nk(offered, n) < nk(box, n) ? offered : box;
}
//@ chunk-tyg7f3ek.js:501888-502041 placement
function toInkKeyFromRemote(e) {
  let n = e.key === "space";
  return {
    key: n ? " " : e.key,
    name: n || [...e.key].length === 1 ? "" : e.key,
    ctrl: e.ctrl === !0,
    shift: e.shift === !0,
    meta: e.meta === !0,
  };
}
/**
 * 远程编辑器的 prompt.edit：按客户端排队编辑请求并逐个应用。
 */
//@ chunk-tyg7f3ek.js:502041-503294 placement
function createRemoteEditQueue(e) {
  let n = e.raise ?? dispatchPromptEdit,
    r = new Map();
  e.onDetach?.((S) => r.delete(S));
  function s(S) {
    let at = S.waiting.at(-1);
    if (S.isRaising || at === void 0) return;
    let w = S.waiting.length === 1 ? at.key : void 0,
      P = jI(S, at.box);
    for (let L of S.waiting.slice(0, -1)) L.answer({ ...L.box, superseded: !0 });
    ((S.box = at.box),
      (S.offered = void 0),
      (S.waiting = []),
      (S.isRaising = !0),
      new Promise((L) =>
        L(n({ before: P, after: at.box, ...(w !== void 0 && { key: toInkKeyFromRemote(w) }) })),
      )
        .then((L) => h(S, at, L))
        .catch((L) => {
          (logForDebugging(`prompt.edit (remote composer): ${errorMessage(L)}; the edit stands`),
            h(S, at, at.box));
        }));
  }
  function h(S, R, w) {
    let P = X0n(w),
      L = (P.text !== R.box.text || P.cursor !== R.box.cursor) && S.waiting.length === 0 && !S.isStale,
      q = k8n(normalizeInputDecorations(w.decorations, P.text));
    if (((S.isRaising = !1), (S.isStale = !1), L)) S.offered = P;
    (R.answer({ ...P, ...(q.length > 0 && { decorations: q }) }), s(S));
  }
  function y(S) {
    let R = r.get(S) ?? { box: freeze_19, isRaising: !1, isStale: !1, waiting: [] };
    return (r.delete(S), r.set(S, R), R);
  }
  return {
    edit: (S) =>
      new Promise((R) => {
        let w = y(S.clientKey);
        ((w.waiting = [
          ...w.waiting,
          { box: X0n(S.box), ...(S.key !== void 0 && { key: S.key }), answer: R },
        ]),
          s(w));
      }),
    adopt: (S, R) => {
      let w = y(S);
      for (let P of w.waiting) P.answer({ ...P.box, superseded: !0 });
      return ((w.box = X0n(R)), (w.offered = void 0), (w.waiting = []), (w.isStale = w.isRaising), w.box);
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
var REMOTE_EDIT_QUEUE = ge(createRemoteEditQueue({ onDetach: vk.onDetach }), (e) => e.clear());

export {
  REMOTE_EDIT_QUEUE,
  pruneDetachedClients,
  describePanesForClient,
  REMOTE_AUTOCOMPLETE,
  handlePaneScrollRequest,
  paneStateFields,
};

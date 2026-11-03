/**
 * cli/print/pluginUiPanes.ts
 *
 * 2.1.316 新增：插件 UI 面板状态发布、滚动/聚焦与状态缓冲
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (43)
 * attribution: placement 43
 */
import { ge } from "../../utils/identity.js";
import { createSignal } from "../../utils/signal.js";
import { ABOVE_PROMPT, KCe, kSt, s6, dispatchUiScroll } from "../../plugins/functionHooks/uiHooks.js";
import { ul, hxe, vk } from "../../plugins/functionHooks/panes.js";
import { rgn, dispatchUiFocus } from "../../plugins/functionHooks/uiApi.js";
import { M$e } from "../../services/mcp/mcpClientCapabilities.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { subscribe_2 } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { collectSurfaceHandles } from "../../plugins/functionHooks/sessionEvents.js";

//@ chunk-tyg7f3ek.js:490840-490853 placement
var PANE_STATUS_TTL_MS = 60000;
//@ chunk-tyg7f3ek.js:490853-490863 placement
var PANE_STATUS_MAX = 20;
//@ chunk-tyg7f3ek.js:490863-491397 placement
function createUiStatusBuffer(e) {
  let n = new Map(),
    r = [],
    s = 0;
  function h(P) {
    return ((s += 1), { push: P, madeAtMs: e(), order: s });
  }
  function y(P) {
    if (P.subtype !== "ui_status") return;
    (n.delete(P.plugin), n.set(P.plugin, h(P)));
  }
  function S(P) {
    if (P.subtype === "ui_status") {
      y(P);
      return;
    }
    (r.push(h(P)), r.splice(0, r.length - PANE_STATUS_MAX));
  }
  function R() {
    let P = e() - PANE_STATUS_TTL_MS,
      filtered = r.splice(0).filter((q) => q.madeAtMs >= P);
    return [...n.values(), ...filtered].sort((q, x) => q.order - x.order).map((q) => q.push);
  }
  function w() {
    return (r.splice(0), [...n.values()].map((P) => P.push));
  }
  return { note: y, hold: S, forFirstClient: R, forLaterClient: w };
}
//@ chunk-tyg7f3ek.js:491397-491473 placement
var paneSignals = ge({ scroll: createSignal(), focus: createSignal() }, (e) => {
  (e.scroll.clear(), e.focus.clear());
});
//@ chunk-tyg7f3ek.js:491473-491507 placement
var paneSites = ge(new Map(), (e) => e.clear());
//@ chunk-tyg7f3ek.js:491507-491969 placement
function setPaneFocus(e, n) {
  let r = paneSites.get(e);
  if (r === void 0) return "no such site";
  let { plugin: plugin, element: element } = n;
  if (element === void 0 || plugin === void 0) {
    paneSites.set(e, { ...r, holder: void 0 });
    return;
  }
  if (!r.focusables.some((focusable) => focusable.plugin === plugin && focusable.element === element))
    return `no element of ${plugin} is drawn under that key`;
  if (
    (paneSites.set(e, { ...r, holder: { plugin: plugin, element: element } }),
    n.origin.kind === "plugin" && !r.isReporting)
  )
    paneSignals.focus.emit({
      clientId: r.clientId,
      component: r.component,
      requestId: r.requestId,
      plugin: plugin,
      element: element,
    });
  return;
}
//@ chunk-tyg7f3ek.js:491969-492418 placement
function scrollPaneByPerson(e, n, r) {
  let s = paneSites.get(e);
  if (s === void 0) return "no such site";
  if (r.kind === "person") {
    if (s.isSuperseded) return "the window moved meanwhile";
    let max = Math.max(0, s.contentRows - s.bodyRows);
    paneSites.set(e, { ...s, offset: n, isFollowingEnd: s.isFollowingEnd && n >= max });
    return;
  }
  (paneSites.set(e, { ...s, offset: n, isSuperseded: s.isPersonMoving, isFollowingEnd: !1 }),
    paneSignals.scroll.emit({
      clientId: s.clientId,
      component: s.component,
      requestId: s.requestId,
      offset: n,
      isFollowingEnd: !1,
    }));
  return;
}
//@ chunk-tyg7f3ek.js:492418-492524 placement
function scrollActor(e, n) {
  return e.by === "auto" && n !== null && n !== void 0
    ? { kind: "plugin", name: n.plugin }
    : { kind: "person" };
}
//@ chunk-tyg7f3ek.js:492524-492627 placement
function paneHolder(e) {
  let n = paneSites.get(e)?.holder;
  if (n === void 0) return null;
  return { plugin: n.plugin, key: n.element };
}
//@ chunk-tyg7f3ek.js:492627-492668 placement
var SI = (e, n) => ({ result: n, element: paneHolder(e) });
//@ chunk-tyg7f3ek.js:492668-492784 placement
function isPaneSiteOpen(e, n) {
  let r = e === "AbovePrompt" && n === ABOVE_PROMPT,
    s =
      e === "Pane" &&
      ul()
        .getState()
        .open.some((h) => h.id === n);
  return r || s;
}
//@ chunk-tyg7f3ek.js:492784-492892 placement
function paneScrollOffset(e) {
  if (e === void 0) return 0;
  return e.isFollowingEnd ? Math.max(0, e.contentRows - e.bodyRows) : e.offset;
}
//@ chunk-tyg7f3ek.js:492892-493724 placement
function publishPaneState(e) {
  let n = paneSites.get(e);
  if (n === void 0) {
    (KCe().delete(e), kSt().delete(e));
    return;
  }
  let {
      component: component,
      requestId: requestId,
      owner: owner,
      bodyRows: bodyRows,
      contentRows: contentRows,
    } = n,
    max = Math.max(0, contentRows - bodyRows),
    w = () => paneSites.get(e);
  (KCe().set(e, {
    component: component,
    requestId: requestId,
    owner: owner,
    bodyRows: bodyRows,
    contentRows: contentRows,
    maxOffset: max,
    offset: () => paneScrollOffset(w()),
    keyRows: (P, L) => {
      let q = w()?.keyed.find((x) => x.plugin === P && x.key === L);
      return q && { top: q.top, bottom: q.bottom };
    },
    commit: (P, L) => scrollPaneByPerson(e, Math.min(max, P), L) === void 0,
    followEnd: () => {
      let P = w();
      if (P !== void 0)
        (paneSites.set(e, { ...P, isFollowingEnd: !0 }),
          paneSignals.scroll.emit({
            clientId: P.clientId,
            component: component,
            requestId: requestId,
            offset: P.offset,
            isFollowingEnd: !0,
          }));
    },
  }),
    kSt().set(e, {
      component: component,
      requestId: requestId,
      owner: owner,
      isHeldNow: () => w()?.isHeld === !0,
      holderNow: () => w()?.holder?.plugin,
      hasElement: (P, L) => w()?.focusables.some((q) => q.plugin === P && q.element === L) === !0,
      commit: (P) => setPaneFocus(e, P),
    }),
    rgn().emit());
}
//@ chunk-tyg7f3ek.js:493724-493832 placement
function keepHeldElement(e, n) {
  return n.element === void 0 && n.isHeld && e.element !== void 0
    ? { ...n, element: e.element, by: e.by }
    : n;
}
//@ chunk-tyg7f3ek.js:493832-493868 placement
var vI = (e, n) => ({ ...n, by: e.by + n.by });
//@ chunk-tyg7f3ek.js:493868-493956 placement
function pluginOfPane(e, n) {
  return (e === "Pane" ? hxe(ul().getState()) : []).find((h) => h.id === n)?.plugin;
}
//@ chunk-tyg7f3ek.js:493956-494441 placement
function createSerialReporter(e) {
  let n, r;
  async function s(h, y) {
    try {
      return await new Promise((S, R) => {
        y(h).then(S, R);
      });
    } finally {
      let S = r;
      if (((r = void 0), (n = S && s(S.report, y)), S !== void 0)) n?.then(S.resolve, S.reject);
    }
  }
  return {
    drop: (h) => {
      let y = r,
        S = () => y?.resolve(h);
      ((r = void 0), (n ?? Promise.resolve()).then(S, S));
    },
    take: (h, y) => {
      if (n === void 0) return ((n = s(h, y)), n);
      if (r !== void 0) return ((r.report = e(r.report, h)), r.promise);
      let { promise: promise, resolve: resolve, reject: reject } = Promise.withResolvers();
      return ((r = { report: h, resolve: resolve, reject: reject, promise: promise }), promise);
    },
  };
}
//@ chunk-tyg7f3ek.js:494441-494744 placement
var newPaneSite = (e, n, r) => ({
  owner: n?.owner ?? pluginOfPane(e.component, e.requestId),
  offset: 0,
  unlandedOffset: void 0,
  bodyRows: 0,
  contentRows: 0,
  keyed: [],
  focusables: [],
  isHeld: !1,
  holder: void 0,
  isPersonMoving: !1,
  isSuperseded: !1,
  isReporting: !1,
  isFollowingEnd: !1,
  scrolls: n?.scrolls ?? createSerialReporter(vI),
  focuses: n?.focuses ?? createSerialReporter(keepHeldElement),
  ...e,
  ...n,
  ...r,
});
//@ chunk-tyg7f3ek.js:494744-494801 placement
var noSuchSiteResult = () => ({ result: { deny: "no such site" }, element: null });
//@ chunk-tyg7f3ek.js:494801-495295 placement
async function focusPaneElement(e) {
  let { clientId: clientId, component: component, requestId: requestId, element: element } = e,
    y = s6(component, requestId),
    S = paneSites.get(y);
  if (S === void 0 || !isPaneSiteOpen(component, requestId)) return noSuchSiteResult();
  (paneSites.set(
    y,
    newPaneSite({ component: component, requestId: requestId, clientId: clientId }, S, {
      isHeld: e.isHeld,
      holder: e.isHeld ? S.holder : void 0,
      isReporting: !0,
    }),
  ),
    publishPaneState(y));
  let R = element !== void 0 && e.isHeld,
    w = element ?? void 0;
  try {
    return SI(
      y,
      R
        ? await dispatchUiFocus({
            input: {
              component: component,
              requestId: requestId,
              ...(w !== void 0 && { plugin: w.plugin, element: w.key }),
              origin: scrollActor(e, element),
            },
          })
        : {},
    );
  } finally {
    let P = paneSites.get(y);
    if (P !== void 0) paneSites.set(y, { ...P, isReporting: !1 });
  }
}
//@ chunk-tyg7f3ek.js:495295-495344 placement
var FOCUS_REQUEST_KIND = { turnsOf: (e) => e.focuses, run: focusPaneElement, denied: noSuchSiteResult };
//@ chunk-tyg7f3ek.js:495344-495392 placement
var isClientAttached = (e) => vk.list().some((n) => n.clientId === e);
//@ chunk-tyg7f3ek.js:495392-495639 placement
function runPaneRequest(e, n) {
  let { clientId: clientId, component: component, requestId: requestId } = e,
    y = s6(component, requestId),
    S = paneSites.get(y);
  if (!isPaneSiteOpen(component, requestId) || (S === void 0 && !isClientAttached(clientId)))
    return Promise.resolve(n.denied(e));
  let w = newPaneSite({ component: component, requestId: requestId, clientId: clientId }, S, {});
  return (paneSites.set(y, w), n.turnsOf(w).take(e, n.run));
}
//@ chunk-tyg7f3ek.js:495639-495660 placement
var handlePaneFocusRequest = (e) => runPaneRequest(e, FOCUS_REQUEST_KIND);
//@ chunk-tyg7f3ek.js:495660-495923 placement
function trackOpenPane(e) {
  let n = s6("Pane", e.requestId),
    r = paneSites.get(n);
  if (!(isPaneSiteOpen("Pane", e.requestId) && (r !== void 0 || (e.isHeld && isClientAttached(e.clientId)))))
    return;
  (paneSites.set(
    n,
    newPaneSite({ component: "Pane", requestId: e.requestId, clientId: e.clientId }, r, {
      isHeld: e.isHeld,
      ...(!e.isHeld && { holder: void 0 }),
    }),
  ),
    publishPaneState(n));
}
//@ chunk-tyg7f3ek.js:495923-496085 placement
function syncOpenPanes(e) {
  let { open: open, focusedId: focusedId } = ul().getState();
  for (let s of open) {
    let h = paneSites.has(s6("Pane", s.id)),
      y = s.id === focusedId;
    if (h || y) trackOpenPane({ clientId: e, requestId: s.id, isHeld: y });
  }
}
//@ chunk-tyg7f3ek.js:496085-496195 placement
function dropPaneSites(e) {
  let filtered = [...paneSites.entries()].filter(([, r]) => e(r));
  for (let [r] of filtered) (paneSites.delete(r), publishPaneState(r));
  return filtered.length;
}
//@ chunk-tyg7f3ek.js:496195-496277 placement
var dropClosedPanes = (e) =>
  dropPaneSites((n) => n.component === "Pane" && !e.panes.some((pane) => pane.id === n.requestId));
//@ chunk-tyg7f3ek.js:496277-496326 placement
var maxScrollOffset = (e) => Math.max(0, e.contentRows - e.bodyRows);
//@ chunk-tyg7f3ek.js:496326-496432 placement
function isLandedScroll(e, n) {
  let { unlandedOffset: unlandedOffset } = n;
  return (
    unlandedOffset !== void 0 && e.offset === Math.min(Math.max(0, unlandedOffset + e.by), maxScrollOffset(e))
  );
}
//@ chunk-tyg7f3ek.js:496432-497004 placement
function describeOpenPanes(e) {
  let filtered = e.open.filter((y) => M$e(y.plugin)),
    r = new Set(e.open.filter((y) => !filtered.includes(y)).map((y) => y.id)),
    s = (y) => (r.has(y ?? "") ? null : y),
    h = r.has(e.shownId ?? "");
  return {
    panes: filtered.map((y) => ({
      id: y.id,
      title: y.title,
      plugin: y.plugin,
      ...(y.closeOnEscape && { closeOnEscape: y.closeOnEscape }),
      ...(y.holdToasts && { holdToasts: y.holdToasts }),
      ...(y.backgroundColor !== void 0 && { backgroundColor: y.backgroundColor }),
      ...(y.rows !== void 0 && { rows: y.rows }),
      ...(y.columns !== void 0 && { columns: y.columns }),
    })),
    shownId: h ? (filtered.at(-1)?.id ?? null) : e.shownId,
    focusedId: s(e.focusedId),
    focusRequestedId: s(e.focusRequest),
  };
}
//@ chunk-tyg7f3ek.js:497004-497172 placement
function subscribeOpenPanes(e) {
  let n = jsonStringify(describeOpenPanes(ul().getState()));
  function r() {
    let y = describeOpenPanes(ul().getState()),
      S = jsonStringify(y);
    if (S === n) return;
    ((n = S), e(y));
  }
  let subscribe = ul().subscribe(r),
    h = subscribe_2(r);
  return () => {
    (subscribe(), h());
  };
}
//@ chunk-tyg7f3ek.js:497172-497276 placement
var windowMovedResult = (e) => ({
  result: { deny: "the window moved meanwhile" },
  offset: paneScrollOffset(e),
  isFollowingEnd: e.isFollowingEnd,
});
//@ chunk-tyg7f3ek.js:497276-497679 placement
function settleScrollRequest(e, n) {
  let { key: key, before: before } = e,
    h = paneSites.get(key);
  if (h === void 0 || h.scrolls !== e.scrolls) return { result: n, offset: before, isFollowingEnd: !1 };
  if (h.isSuperseded) {
    let w = windowMovedResult(h);
    return (h.scrolls.drop(w), w);
  }
  let y = n.deny !== void 0,
    { end: end } = e,
    R = h.isFollowingEnd || (!y && end.wasFollowed && end.isDownward && h.offset >= end.offset);
  return (
    paneSites.set(key, { ...h, offset: y ? before : h.offset, isFollowingEnd: R }),
    { result: n, offset: y ? before : h.offset, isFollowingEnd: R }
  );
}
//@ chunk-tyg7f3ek.js:497679-497757 placement
var scrollFollowState = (e, n) => ({
  offset: maxScrollOffset(e),
  wasFollowed: n.isFollowingEnd,
  isDownward: e.by > 0,
});
//@ chunk-tyg7f3ek.js:497757-497833 placement
function OI(e, n) {
  let r = maxScrollOffset(e);
  return n.isFollowingEnd ? r : Math.min(n.offset, r);
}
//@ chunk-tyg7f3ek.js:497833-497928 placement
var DI = (e, n) => ({
  key: s6(e.component, e.requestId),
  scrolls: n.scrolls,
  before: OI(e, n),
  end: scrollFollowState(e, n),
});
//@ chunk-tyg7f3ek.js:497928-498007 placement
var Bp = (e) => ({ result: { deny: "no such site" }, offset: e.offset, isFollowingEnd: !1 });
//@ chunk-tyg7f3ek.js:498007-498808 placement
async function scrollPaneElement(e) {
  let { clientId: clientId, component: component, requestId: requestId } = e,
    h = s6(component, requestId),
    y = paneSites.get(h);
  if (y === void 0 || !isPaneSiteOpen(component, requestId)) return Bp(e);
  let S = DI(e, y),
    w = (S.end.wasFollowed && S.end.isDownward) || isLandedScroll(e, y) ? S.before + e.by : e.offset,
    min = Math.min(Math.max(0, w), S.end.offset);
  (paneSites.set(
    h,
    newPaneSite({ component: component, requestId: requestId, clientId: clientId }, y, {
      offset: S.before,
      bodyRows: e.bodyRows,
      contentRows: e.contentRows,
      ...(e.keyed !== void 0 && { keyed: e.keyed }),
      isPersonMoving: !0,
      isSuperseded: !1,
    }),
  ),
    publishPaneState(h));
  try {
    return settleScrollRequest(
      S,
      await dispatchUiScroll({
        input: {
          component: component,
          requestId: requestId,
          offset: min,
          by: e.by,
          bodyRows: e.bodyRows,
          contentRows: e.contentRows,
          origin: { kind: "person" },
          ...(e.pointer !== void 0 && { pointer: e.pointer }),
        },
      }),
    );
  } finally {
    let L = paneSites.get(h);
    if (L !== void 0 && L.scrolls === S.scrolls) {
      let q = paneScrollOffset(L) === e.offset;
      paneSites.set(h, { ...L, isPersonMoving: !1, isSuperseded: !1, unlandedOffset: q ? void 0 : e.offset });
    }
  }
}
//@ chunk-tyg7f3ek.js:498808-498857 placement
var SCROLL_REQUEST_KIND = { turnsOf: (e) => e.scrolls, run: scrollPaneElement, denied: Bp };
//@ chunk-tyg7f3ek.js:498857-498951 placement
function UI(e, n) {
  return n === void 0 || (n.bodyRows === 0 && n.contentRows === 0) ? e : { bodyRows: e.bodyRows };
}
//@ chunk-tyg7f3ek.js:498951-499316 placement
function attachPaneClient(e) {
  let { clientId: clientId, component: component, requestId: requestId } = e;
  if (!(isPaneSiteOpen(component, requestId) && isClientAttached(clientId))) return;
  let y = s6(component, requestId),
    S = paneSites.get(y);
  (paneSites.set(
    y,
    newPaneSite({ component: component, requestId: requestId, clientId: clientId }, S, {
      clientId: clientId,
      ...(e.scroll !== void 0 && UI(e.scroll, S)),
      ...(e.contentRows !== void 0 && { contentRows: e.contentRows }),
      ...(e.keyed !== void 0 && { keyed: e.keyed }),
      ...(e.keyboard !== void 0 && { isHeld: e.keyboard === "held" }),
    }),
  ),
    publishPaneState(y));
}
//@ chunk-tyg7f3ek.js:499316-499590 placement
function updatePaneSurface(e) {
  let { clientId: clientId, component: component, requestId: requestId } = e,
    h = s6(component, requestId),
    y = paneSites.get(h);
  if (!(y !== void 0 && isClientAttached(clientId) && isPaneSiteOpen(component, requestId))) return;
  let R = collectSurfaceHandles(e.tree),
    { holder: holder } = y,
    P = holder !== void 0 && R.some((L) => L.plugin === holder.plugin && L.element === holder.element);
  (paneSites.set(h, { ...y, focusables: R, holder: P ? holder : void 0 }), publishPaneState(h));
}

export {
  createUiStatusBuffer,
  describeOpenPanes,
  subscribeOpenPanes,
  dropClosedPanes,
  paneSignals,
  syncOpenPanes,
  handlePaneFocusRequest,
  dropPaneSites,
  runPaneRequest,
  SCROLL_REQUEST_KIND,
  attachPaneClient,
  isClientAttached,
  updatePaneSurface,
};

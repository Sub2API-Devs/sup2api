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
import { identity } from "../../utils/identity.js";
import { createSignal } from "../../utils/signal.js";
import {
  ABOVE_PROMPT,
  scrollSites,
  focusSites,
  siteKey,
  dispatchUiScroll,
} from "../../plugins/functionHooks/uiHooks.js";
import { paneRegistry, allPanes, clientRegistry } from "../../plugins/functionHooks/panes.js";
import { focusSiteDraws, dispatchUiFocus } from "../../plugins/functionHooks/uiApi.js";
import { isModuleAdmittedByName } from "../../services/mcp/mcpClientCapabilities.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { subscribe_2 } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { collectSurfaceHandles } from "../../plugins/functionHooks/sessionEvents.js";

//@ chunk-tyg7f3ek.js:490840-490853 placement
var PANE_STATUS_TTL_MS = 60000;
//@ chunk-tyg7f3ek.js:490853-490863 placement
var PANE_STATUS_MAX = 20;
//@ chunk-tyg7f3ek.js:490863-491397 placement
function createUiStatusBuffer(now) {
  let n = new Map();
  let r = [];
  let order = 0;
  function h(push) {
    order += 1;
    return {
      push,
      madeAtMs: now(),
      order,
    };
  }
  function y(P) {
    if (P.subtype !== "ui_status") return;
    n.delete(P.plugin);
    n.set(P.plugin, h(P));
  }
  function S(P) {
    if (P.subtype === "ui_status") {
      y(P);
      return;
    }
    r.push(h(P));
    r.splice(0, r.length - PANE_STATUS_MAX);
  }
  function R() {
    let P = now() - PANE_STATUS_TTL_MS;
    let filtered = r.splice(0).filter((q) => q.madeAtMs >= P);
    return [...n.values(), ...filtered].sort((q, x) => q.order - x.order).map((q) => q.push);
  }
  function w() {
    r.splice(0);
    return [...n.values()].map((P) => P.push);
  }
  return {
    note: y,
    hold: S,
    forFirstClient: R,
    forLaterClient: w,
  };
}
//@ chunk-tyg7f3ek.js:491397-491473 placement
var paneSignals = identity(
  {
    scroll: createSignal(),
    focus: createSignal(),
  },
  (e) => {
    e.scroll.clear();
    e.focus.clear();
  },
);
//@ chunk-tyg7f3ek.js:491473-491507 placement
var paneSites = identity(new Map(), (e) => e.clear());
//@ chunk-tyg7f3ek.js:491507-491969 placement
function setPaneFocus(e, n) {
  let r = paneSites.get(e);
  if (r === undefined) return "no such site";
  let { plugin, element } = n;
  if (element === undefined || plugin === undefined) {
    paneSites.set(e, {
      ...r,
      holder: undefined,
    });
    return;
  }
  if (!r.focusables.some((focusable) => focusable.plugin === plugin && focusable.element === element))
    return `no element of ${plugin} is drawn under that key`;
  paneSites.set(e, {
    ...r,
    holder: {
      plugin,
      element,
    },
  });
  if (n.origin.kind === "plugin" && !r.isReporting)
    paneSignals.focus.emit({
      clientId: r.clientId,
      component: r.component,
      requestId: r.requestId,
      plugin,
      element,
    });
  return;
}
//@ chunk-tyg7f3ek.js:491969-492418 placement
function scrollPaneByPerson(e, n, r) {
  let s = paneSites.get(e);
  if (s === undefined) return "no such site";
  if (r.kind === "person") {
    if (s.isSuperseded) return "the window moved meanwhile";
    let max = Math.max(0, s.contentRows - s.bodyRows);
    paneSites.set(e, {
      ...s,
      offset: n,
      isFollowingEnd: s.isFollowingEnd && n >= max,
    });
    return;
  }
  paneSites.set(e, {
    ...s,
    offset: n,
    isSuperseded: s.isPersonMoving,
    isFollowingEnd: false,
  });
  paneSignals.scroll.emit({
    clientId: s.clientId,
    component: s.component,
    requestId: s.requestId,
    offset: n,
    isFollowingEnd: false,
  });
  return;
}
//@ chunk-tyg7f3ek.js:492418-492524 placement
function scrollActor(e, element) {
  return e.by === "auto" && element !== null && element !== undefined
    ? {
        kind: "plugin",
        name: element.plugin,
      }
    : {
        kind: "person",
      };
}
//@ chunk-tyg7f3ek.js:492524-492627 placement
function paneHolder(e) {
  let holder = paneSites.get(e)?.holder;
  if (holder === undefined) return null;
  return {
    plugin: holder.plugin,
    key: holder.element,
  };
}
//@ chunk-tyg7f3ek.js:492627-492668 placement
var paneResultWithElement = (e, result) => ({
  result,
  element: paneHolder(e),
});
//@ chunk-tyg7f3ek.js:492668-492784 placement
function isPaneSiteOpen(component, requestId) {
  let r = component === "AbovePrompt" && requestId === ABOVE_PROMPT;
  let s =
    component === "Pane" &&
    paneRegistry()
      .getState()
      .open.some((h) => h.id === requestId);
  return r || s;
}
//@ chunk-tyg7f3ek.js:492784-492892 placement
function paneScrollOffset(e) {
  if (e === undefined) return 0;
  return e.isFollowingEnd ? Math.max(0, e.contentRows - e.bodyRows) : e.offset;
}
//@ chunk-tyg7f3ek.js:492892-493724 placement
function publishPaneState(e) {
  let n = paneSites.get(e);
  if (n === undefined) {
    scrollSites().delete(e);
    focusSites().delete(e);
    return;
  }
  let { component, requestId, owner, bodyRows, contentRows } = n;
  let max = Math.max(0, contentRows - bodyRows);
  let w = () => paneSites.get(e);
  scrollSites().set(e, {
    component,
    requestId,
    owner,
    bodyRows,
    contentRows,
    maxOffset: max,
    offset: () => paneScrollOffset(w()),
    keyRows: (P, L) => {
      let found = w()?.keyed.find((x) => x.plugin === P && x.key === L);
      return (
        found && {
          top: found.top,
          bottom: found.bottom,
        }
      );
    },
    commit: (P, L) => scrollPaneByPerson(e, Math.min(max, P), L) === undefined,
    followEnd: () => {
      let P = w();
      if (P !== undefined) {
        paneSites.set(e, {
          ...P,
          isFollowingEnd: true,
        });
        paneSignals.scroll.emit({
          clientId: P.clientId,
          component,
          requestId,
          offset: P.offset,
          isFollowingEnd: true,
        });
      }
    },
  });
  focusSites().set(e, {
    component,
    requestId,
    owner,
    isHeldNow: () => w()?.isHeld === true,
    holderNow: () => w()?.holder?.plugin,
    hasElement: (P, L) =>
      w()?.focusables.some((focusable) => focusable.plugin === P && focusable.element === L) === true,
    commit: (P) => setPaneFocus(e, P),
  });
  focusSiteDraws().emit();
}
//@ chunk-tyg7f3ek.js:493724-493832 placement
function keepHeldElement(e, n) {
  return n.element === undefined && n.isHeld && e.element !== undefined
    ? {
        ...n,
        element: e.element,
        by: e.by,
      }
    : n;
}
//@ chunk-tyg7f3ek.js:493832-493868 placement
var mergeScrollReporter = (e, n) => ({
  ...n,
  by: e.by + n.by,
});
//@ chunk-tyg7f3ek.js:493868-493956 placement
function pluginOfPane(component, requestId) {
  return (component === "Pane" ? allPanes(paneRegistry().getState()) : []).find((h) => h.id === requestId)
    ?.plugin;
}
//@ chunk-tyg7f3ek.js:493956-494441 placement
function createSerialReporter(e) {
  let n;
  let r;
  async function s(h, y) {
    try {
      return await new Promise((resolve, reject) => {
        y(h).then(resolve, reject);
      });
    } finally {
      let S = r;
      r = undefined;
      n = S && s(S.report, y);
      if (S !== undefined) n?.then(S.resolve, S.reject);
    }
  }
  return {
    drop: (h) => {
      let y = r;
      let S = () => y?.resolve(h);
      r = undefined;
      (n ?? Promise.resolve()).then(S, S);
    },
    take: (h, y) => {
      if (n === undefined) {
        n = s(h, y);
        return n;
      }
      if (r !== undefined) {
        r.report = e(r.report, h);
        return r.promise;
      }
      let { promise, resolve, reject } = Promise.withResolvers();
      r = {
        report: h,
        resolve,
        reject,
        promise,
      };
      return promise;
    },
  };
}
//@ chunk-tyg7f3ek.js:494441-494744 placement
var newPaneSite = (e, n, r) => ({
  owner: n?.owner ?? pluginOfPane(e.component, e.requestId),
  offset: 0,
  unlandedOffset: undefined,
  bodyRows: 0,
  contentRows: 0,
  keyed: [],
  focusables: [],
  isHeld: false,
  holder: undefined,
  isPersonMoving: false,
  isSuperseded: false,
  isReporting: false,
  isFollowingEnd: false,
  scrolls: n?.scrolls ?? createSerialReporter(mergeScrollReporter),
  focuses: n?.focuses ?? createSerialReporter(keepHeldElement),
  ...e,
  ...n,
  ...r,
});
//@ chunk-tyg7f3ek.js:494744-494801 placement
var noSuchSiteResult = () => ({
  result: {
    deny: "no such site",
  },
  element: null,
});
//@ chunk-tyg7f3ek.js:494801-495295 placement
async function focusPaneElement(e) {
  let { clientId, component, requestId, element } = e;
  let y = siteKey(component, requestId);
  let S = paneSites.get(y);
  if (S === undefined || !isPaneSiteOpen(component, requestId)) return noSuchSiteResult();
  paneSites.set(
    y,
    newPaneSite(
      {
        component,
        requestId,
        clientId,
      },
      S,
      {
        isHeld: e.isHeld,
        holder: e.isHeld ? S.holder : undefined,
        isReporting: true,
      },
    ),
  );
  publishPaneState(y);
  let isHeld = element !== undefined && e.isHeld;
  let w = element ?? undefined;
  try {
    return paneResultWithElement(
      y,
      isHeld
        ? await dispatchUiFocus({
            input: {
              component,
              requestId,
              ...(w !== undefined && {
                plugin: w.plugin,
                element: w.key,
              }),
              origin: scrollActor(e, element),
            },
          })
        : {},
    );
  } finally {
    let P = paneSites.get(y);
    if (P !== undefined)
      paneSites.set(y, {
        ...P,
        isReporting: false,
      });
  }
}
//@ chunk-tyg7f3ek.js:495295-495344 placement
var FOCUS_REQUEST_KIND = {
  turnsOf: (e) => e.focuses,
  run: focusPaneElement,
  denied: noSuchSiteResult,
};
//@ chunk-tyg7f3ek.js:495344-495392 placement
var isClientAttached = (clientId) => clientRegistry.list().some((n) => n.clientId === clientId);
//@ chunk-tyg7f3ek.js:495392-495639 placement
function runPaneRequest(e, n) {
  let { clientId, component, requestId } = e;
  let y = siteKey(component, requestId);
  let S = paneSites.get(y);
  if (!isPaneSiteOpen(component, requestId) || (S === undefined && !isClientAttached(clientId)))
    return Promise.resolve(n.denied(e));
  let paneSite = newPaneSite(
    {
      component,
      requestId,
      clientId,
    },
    S,
    {},
  );
  paneSites.set(y, paneSite);
  return n.turnsOf(paneSite).take(e, n.run);
}
//@ chunk-tyg7f3ek.js:495639-495660 placement
var handlePaneFocusRequest = (e) => runPaneRequest(e, FOCUS_REQUEST_KIND);
//@ chunk-tyg7f3ek.js:495660-495923 placement
function trackOpenPane(e) {
  let n = siteKey("Pane", e.requestId);
  let r = paneSites.get(n);
  if (!(
    isPaneSiteOpen("Pane", e.requestId) &&
    (r !== undefined || (e.isHeld && isClientAttached(e.clientId)))
  ))
    return;
  paneSites.set(
    n,
    newPaneSite(
      {
        component: "Pane",
        requestId: e.requestId,
        clientId: e.clientId,
      },
      r,
      {
        isHeld: e.isHeld,
        ...(!e.isHeld && {
          holder: undefined,
        }),
      },
    ),
  );
  publishPaneState(n);
}
//@ chunk-tyg7f3ek.js:495923-496085 placement
function syncOpenPanes(clientId) {
  let { open, focusedId } = paneRegistry().getState();
  for (let s of open) {
    let h = paneSites.has(siteKey("Pane", s.id));
    let y = s.id === focusedId;
    if (h || y)
      trackOpenPane({
        clientId,
        requestId: s.id,
        isHeld: y,
      });
  }
}
//@ chunk-tyg7f3ek.js:496085-496195 placement
function dropPaneSites(e) {
  let filtered = [...paneSites.entries()].filter(([, r]) => e(r));
  for (let [r] of filtered) {
    paneSites.delete(r);
    publishPaneState(r);
  }
  return filtered.length;
}
//@ chunk-tyg7f3ek.js:496195-496277 placement
var dropClosedPanes = (e) =>
  dropPaneSites((n) => n.component === "Pane" && !e.panes.some((pane) => pane.id === n.requestId));
//@ chunk-tyg7f3ek.js:496277-496326 placement
var maxScrollOffset = (e) => Math.max(0, e.contentRows - e.bodyRows);
//@ chunk-tyg7f3ek.js:496326-496432 placement
function isLandedScroll(e, n) {
  let { unlandedOffset } = n;
  return (
    unlandedOffset !== undefined &&
    e.offset === Math.min(Math.max(0, unlandedOffset + e.by), maxScrollOffset(e))
  );
}
//@ chunk-tyg7f3ek.js:496432-497004 placement
function describeOpenPanes(state) {
  let filtered = state.open.filter((y) => isModuleAdmittedByName(y.plugin));
  let r = new Set(state.open.filter((y) => !filtered.includes(y)).map((y) => y.id));
  let s = (y) => (r.has(y ?? "") ? null : y);
  let h = r.has(state.shownId ?? "");
  return {
    panes: filtered.map((y) => ({
      id: y.id,
      title: y.title,
      plugin: y.plugin,
      ...(y.closeOnEscape && {
        closeOnEscape: y.closeOnEscape,
      }),
      ...(y.holdToasts && {
        holdToasts: y.holdToasts,
      }),
      ...(y.backgroundColor !== undefined && {
        backgroundColor: y.backgroundColor,
      }),
      ...(y.rows !== undefined && {
        rows: y.rows,
      }),
      ...(y.columns !== undefined && {
        columns: y.columns,
      }),
    })),
    shownId: h ? (filtered.at(-1)?.id ?? null) : state.shownId,
    focusedId: s(state.focusedId),
    focusRequestedId: s(state.focusRequest),
  };
}
//@ chunk-tyg7f3ek.js:497004-497172 placement
function subscribeOpenPanes(e) {
  let n = jsonStringify(describeOpenPanes(paneRegistry().getState()));
  function r() {
    let y = describeOpenPanes(paneRegistry().getState());
    let S = jsonStringify(y);
    if (S === n) return;
    n = S;
    e(y);
  }
  let s = paneRegistry().subscribe(r);
  let h = subscribe_2(r);
  return () => {
    s();
    h();
  };
}
//@ chunk-tyg7f3ek.js:497172-497276 placement
var windowMovedResult = (e) => ({
  result: {
    deny: "the window moved meanwhile",
  },
  offset: paneScrollOffset(e),
  isFollowingEnd: e.isFollowingEnd,
});
//@ chunk-tyg7f3ek.js:497276-497679 placement
function settleScrollRequest(e, n) {
  let { key, before } = e;
  let h = paneSites.get(key);
  if (h === undefined || h.scrolls !== e.scrolls)
    return {
      result: n,
      offset: before,
      isFollowingEnd: false,
    };
  if (h.isSuperseded) {
    let w = windowMovedResult(h);
    h.scrolls.drop(w);
    return w;
  }
  let y = n.deny !== undefined;
  let { end } = e;
  let isFollowingEnd =
    h.isFollowingEnd || (!y && end.wasFollowed && end.isDownward && h.offset >= end.offset);
  paneSites.set(key, {
    ...h,
    offset: y ? before : h.offset,
    isFollowingEnd,
  });
  return {
    result: n,
    offset: y ? before : h.offset,
    isFollowingEnd,
  };
}
//@ chunk-tyg7f3ek.js:497679-497757 placement
var scrollFollowState = (e, n) => ({
  offset: maxScrollOffset(e),
  wasFollowed: n.isFollowingEnd,
  isDownward: e.by > 0,
});
//@ chunk-tyg7f3ek.js:497757-497833 placement
function clampScrollOffset(e, n) {
  let r = maxScrollOffset(e);
  return n.isFollowingEnd ? r : Math.min(n.offset, r);
}
//@ chunk-tyg7f3ek.js:497833-497928 placement
var describePaneScroll = (e, n) => ({
  key: siteKey(e.component, e.requestId),
  scrolls: n.scrolls,
  before: clampScrollOffset(e, n),
  end: scrollFollowState(e, n),
});
//@ chunk-tyg7f3ek.js:497928-498007 placement
var noSuchPaneSiteResult = (e) => ({
  result: {
    deny: "no such site",
  },
  offset: e.offset,
  isFollowingEnd: false,
});
//@ chunk-tyg7f3ek.js:498007-498808 placement
async function scrollPaneElement(e) {
  let { clientId, component, requestId } = e;
  let h = siteKey(component, requestId);
  let y = paneSites.get(h);
  if (y === undefined || !isPaneSiteOpen(component, requestId)) return noSuchPaneSiteResult(e);
  let S = describePaneScroll(e, y);
  let w = (S.end.wasFollowed && S.end.isDownward) || isLandedScroll(e, y) ? S.before + e.by : e.offset;
  let offset = Math.min(Math.max(0, w), S.end.offset);
  paneSites.set(
    h,
    newPaneSite(
      {
        component,
        requestId,
        clientId,
      },
      y,
      {
        offset: S.before,
        bodyRows: e.bodyRows,
        contentRows: e.contentRows,
        ...(e.keyed !== undefined && {
          keyed: e.keyed,
        }),
        isPersonMoving: true,
        isSuperseded: false,
      },
    ),
  );
  publishPaneState(h);
  try {
    return settleScrollRequest(
      S,
      await dispatchUiScroll({
        input: {
          component,
          requestId,
          offset,
          by: e.by,
          bodyRows: e.bodyRows,
          contentRows: e.contentRows,
          origin: {
            kind: "person",
          },
          ...(e.pointer !== undefined && {
            pointer: e.pointer,
          }),
        },
      }),
    );
  } finally {
    let L = paneSites.get(h);
    if (L !== undefined && L.scrolls === S.scrolls) {
      let q = paneScrollOffset(L) === e.offset;
      paneSites.set(h, {
        ...L,
        isPersonMoving: false,
        isSuperseded: false,
        unlandedOffset: q ? undefined : e.offset,
      });
    }
  }
}
//@ chunk-tyg7f3ek.js:498808-498857 placement
var SCROLL_REQUEST_KIND = {
  turnsOf: (e) => e.scrolls,
  run: scrollPaneElement,
  denied: noSuchPaneSiteResult,
};
//@ chunk-tyg7f3ek.js:498857-498951 placement
function pickContentRows(scroll, n) {
  return n === undefined || (n.bodyRows === 0 && n.contentRows === 0)
    ? scroll
    : {
        bodyRows: scroll.bodyRows,
      };
}
//@ chunk-tyg7f3ek.js:498951-499316 placement
function attachPaneClient(e) {
  let { clientId, component, requestId } = e;
  if (!(isPaneSiteOpen(component, requestId) && isClientAttached(clientId))) return;
  let y = siteKey(component, requestId);
  let S = paneSites.get(y);
  paneSites.set(
    y,
    newPaneSite(
      {
        component,
        requestId,
        clientId,
      },
      S,
      {
        clientId,
        ...(e.scroll !== undefined && pickContentRows(e.scroll, S)),
        ...(e.contentRows !== undefined && {
          contentRows: e.contentRows,
        }),
        ...(e.keyed !== undefined && {
          keyed: e.keyed,
        }),
        ...(e.keyboard !== undefined && {
          isHeld: e.keyboard === "held",
        }),
      },
    ),
  );
  publishPaneState(y);
}
//@ chunk-tyg7f3ek.js:499316-499590 placement
function updatePaneSurface(e) {
  let { clientId, component, requestId } = e;
  let h = siteKey(component, requestId);
  let y = paneSites.get(h);
  if (!(y !== undefined && isClientAttached(clientId) && isPaneSiteOpen(component, requestId))) return;
  let surfaceHandles = collectSurfaceHandles(e.tree);
  let { holder } = y;
  let P =
    holder !== undefined &&
    surfaceHandles.some(
      (surfaceHandle) => surfaceHandle.plugin === holder.plugin && surfaceHandle.element === holder.element,
    );
  paneSites.set(h, {
    ...y,
    focusables: surfaceHandles,
    holder: P ? holder : undefined,
  });
  publishPaneState(h);
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

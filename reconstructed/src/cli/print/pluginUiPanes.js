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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tyg7f3ek.js:490840-490853 placement
var PANE_STATUS_TTL_MS = 60000;
//@ chunk-tyg7f3ek.js:490853-490863 placement
var PANE_STATUS_MAX = 20;
//@ chunk-tyg7f3ek.js:490863-491397 placement
function createUiStatusBuffer(now) {
  let byPlugin = new Map();
  let recent = [];
  let order = 0;
  function createPushedItem(push) {
    order += 1;
    return {
      push,
      madeAtMs: now(),
      order,
    };
  }
  function note(event) {
    if (event.subtype !== "ui_status") return;
    byPlugin.delete(event.plugin);
    byPlugin.set(event.plugin, createPushedItem(event));
  }
  function hold(event) {
    if (event.subtype === "ui_status") {
      note(event);
      return;
    }
    recent.push(createPushedItem(event));
    recent.splice(0, recent.length - PANE_STATUS_MAX);
  }
  function forFirstClient() {
    let cutoff = now() - PANE_STATUS_TTL_MS;
    let filtered = recent.splice(0).filter((entry) => entry.madeAtMs >= cutoff);
    return [...byPlugin.values(), ...filtered].sort((a, b) => a.order - b.order).map((entry) => entry.push);
  }
  function forLaterClient() {
    recent.splice(0);
    return [...byPlugin.values()].map((entry) => entry.push);
  }
  return {
    note,
    hold,
    forFirstClient,
    forLaterClient,
  };
}
//@ chunk-tyg7f3ek.js:491397-491473 placement
var paneSignals; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tyg7f3ek.js:491397", () => {
  paneSignals = identity(
    {
      scroll: createSignal(),
      focus: createSignal(),
    },
    (signals) => {
      signals.scroll.clear();
      signals.focus.clear();
    },
  );
});
//@ chunk-tyg7f3ek.js:491473-491507 placement
var paneSites; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tyg7f3ek.js:491473", () => {
  paneSites = identity(new Map(), (sites) => sites.clear());
});
//@ chunk-tyg7f3ek.js:491507-491969 placement
function setPaneFocus(key, request) {
  let site = paneSites.get(key);
  if (site === undefined) return "no such site";
  let { plugin, element } = request;
  if (element === undefined || plugin === undefined) {
    paneSites.set(key, {
      ...site,
      holder: undefined,
    });
    return;
  }
  if (!site.focusables.some((focusable) => focusable.plugin === plugin && focusable.element === element))
    return `no element of ${plugin} is drawn under that key`;
  paneSites.set(key, {
    ...site,
    holder: {
      plugin,
      element,
    },
  });
  if (request.origin.kind === "plugin" && !site.isReporting)
    paneSignals.focus.emit({
      clientId: site.clientId,
      component: site.component,
      requestId: site.requestId,
      plugin,
      element,
    });
  return;
}
//@ chunk-tyg7f3ek.js:491969-492418 placement
function scrollPaneByPerson(key, offset, origin) {
  let site = paneSites.get(key);
  if (site === undefined) return "no such site";
  if (origin.kind === "person") {
    if (site.isSuperseded) return "the window moved meanwhile";
    let max = Math.max(0, site.contentRows - site.bodyRows);
    paneSites.set(key, {
      ...site,
      offset,
      isFollowingEnd: site.isFollowingEnd && offset >= max,
    });
    return;
  }
  paneSites.set(key, {
    ...site,
    offset,
    isSuperseded: site.isPersonMoving,
    isFollowingEnd: false,
  });
  paneSignals.scroll.emit({
    clientId: site.clientId,
    component: site.component,
    requestId: site.requestId,
    offset,
    isFollowingEnd: false,
  });
  return;
}
//@ chunk-tyg7f3ek.js:492418-492524 placement
function scrollActor(request, element) {
  return request.by === "auto" && element !== null && element !== undefined
    ? {
        kind: "plugin",
        name: element.plugin,
      }
    : {
        kind: "person",
      };
}
//@ chunk-tyg7f3ek.js:492524-492627 placement
function paneHolder(key) {
  let holder = paneSites.get(key)?.holder;
  if (holder === undefined) return null;
  return {
    plugin: holder.plugin,
    key: holder.element,
  };
}
//@ chunk-tyg7f3ek.js:492627-492668 placement
var paneResultWithElement = (key, result) => ({
  result,
  element: paneHolder(key),
});
//@ chunk-tyg7f3ek.js:492668-492784 placement
function isPaneSiteOpen(component, requestId) {
  let isAbovePrompt = component === "AbovePrompt" && requestId === ABOVE_PROMPT;
  let isOpenPane =
    component === "Pane" &&
    paneRegistry()
      .getState()
      .open.some((pane) => pane.id === requestId);
  return isAbovePrompt || isOpenPane;
}
//@ chunk-tyg7f3ek.js:492784-492892 placement
function paneScrollOffset(site) {
  if (site === undefined) return 0;
  return site.isFollowingEnd ? Math.max(0, site.contentRows - site.bodyRows) : site.offset;
}
//@ chunk-tyg7f3ek.js:492892-493724 placement
function publishPaneState(key) {
  let site = paneSites.get(key);
  if (site === undefined) {
    scrollSites().delete(key);
    focusSites().delete(key);
    return;
  }
  let { component, requestId, owner, bodyRows, contentRows } = site;
  let max = Math.max(0, contentRows - bodyRows);
  let current = () => paneSites.get(key);
  scrollSites().set(key, {
    component,
    requestId,
    owner,
    bodyRows,
    contentRows,
    maxOffset: max,
    offset: () => paneScrollOffset(current()),
    keyRows: (plugin, key) => {
      let found = current()?.keyed.find((entry) => entry.plugin === plugin && entry.key === key);
      return (
        found && {
          top: found.top,
          bottom: found.bottom,
        }
      );
    },
    commit: (offset, origin) => scrollPaneByPerson(key, Math.min(max, offset), origin) === undefined,
    followEnd: () => {
      let site = current();
      if (site !== undefined) {
        paneSites.set(key, {
          ...site,
          isFollowingEnd: true,
        });
        paneSignals.scroll.emit({
          clientId: site.clientId,
          component,
          requestId,
          offset: site.offset,
          isFollowingEnd: true,
        });
      }
    },
  });
  focusSites().set(key, {
    component,
    requestId,
    owner,
    isHeldNow: () => current()?.isHeld === true,
    holderNow: () => current()?.holder?.plugin,
    hasElement: (plugin, element) =>
      current()?.focusables.some(
        (focusable) => focusable.plugin === plugin && focusable.element === element,
      ) === true,
    commit: (request) => setPaneFocus(key, request),
  });
  focusSiteDraws().emit();
}
//@ chunk-tyg7f3ek.js:493724-493832 placement
function keepHeldElement(previous, next) {
  return next.element === undefined && next.isHeld && previous.element !== undefined
    ? {
        ...next,
        element: previous.element,
        by: previous.by,
      }
    : next;
}
//@ chunk-tyg7f3ek.js:493832-493868 placement
var mergeScrollReporter = (a, b) => ({
  ...b,
  by: a.by + b.by,
});
//@ chunk-tyg7f3ek.js:493868-493956 placement
function pluginOfPane(component, requestId) {
  return (component === "Pane" ? allPanes(paneRegistry().getState()) : []).find(
    (pane) => pane.id === requestId,
  )?.plugin;
}
//@ chunk-tyg7f3ek.js:493956-494441 placement
function createSerialReporter(merge) {
  let running;
  let pending;
  async function run(report, runReport) {
    try {
      return await new Promise((resolve, reject) => {
        runReport(report).then(resolve, reject);
      });
    } finally {
      let pending2 = pending;
      pending = undefined;
      running = pending2 && run(pending2.report, runReport);
      if (pending2 !== undefined) running?.then(pending2.resolve, pending2.reject);
    }
  }
  return {
    drop: (value) => {
      let waiting = pending;
      let resolve = () => waiting?.resolve(value);
      pending = undefined;
      (running ?? Promise.resolve()).then(resolve, resolve);
    },
    take: (report, runReport) => {
      if (running === undefined) {
        running = run(report, runReport);
        return running;
      }
      if (pending !== undefined) {
        pending.report = merge(pending.report, report);
        return pending.promise;
      }
      let { promise, resolve, reject } = Promise.withResolvers();
      pending = {
        report,
        resolve,
        reject,
        promise,
      };
      return promise;
    },
  };
}
//@ chunk-tyg7f3ek.js:494441-494744 placement
var newPaneSite = (key, site, extra) => ({
  owner: site?.owner ?? pluginOfPane(key.component, key.requestId),
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
  scrolls: site?.scrolls ?? createSerialReporter(mergeScrollReporter),
  focuses: site?.focuses ?? createSerialReporter(keepHeldElement),
  ...key,
  ...site,
  ...extra,
});
//@ chunk-tyg7f3ek.js:494744-494801 placement
var noSuchSiteResult = () => ({
  result: {
    deny: "no such site",
  },
  element: null,
});
//@ chunk-tyg7f3ek.js:494801-495295 placement
async function focusPaneElement(request) {
  let { clientId, component, requestId, element } = request;
  let key = siteKey(component, requestId);
  let site = paneSites.get(key);
  if (site === undefined || !isPaneSiteOpen(component, requestId)) return noSuchSiteResult();
  paneSites.set(
    key,
    newPaneSite(
      {
        component,
        requestId,
        clientId,
      },
      site,
      {
        isHeld: request.isHeld,
        holder: request.isHeld ? site.holder : undefined,
        isReporting: true,
      },
    ),
  );
  publishPaneState(key);
  let isHeld = element !== undefined && request.isHeld;
  let focusTarget = element ?? undefined;
  try {
    return paneResultWithElement(
      key,
      isHeld
        ? await dispatchUiFocus({
            input: {
              component,
              requestId,
              ...(focusTarget !== undefined && {
                plugin: focusTarget.plugin,
                element: focusTarget.key,
              }),
              origin: scrollActor(request, element),
            },
          })
        : {},
    );
  } finally {
    let site = paneSites.get(key);
    if (site !== undefined)
      paneSites.set(key, {
        ...site,
        isReporting: false,
      });
  }
}
//@ chunk-tyg7f3ek.js:495295-495344 placement
var FOCUS_REQUEST_KIND = {
  turnsOf: (site) => site.focuses,
  run: focusPaneElement,
  denied: noSuchSiteResult,
};
//@ chunk-tyg7f3ek.js:495344-495392 placement
var isClientAttached = (clientId) => clientRegistry.list().some((client) => client.clientId === clientId);
//@ chunk-tyg7f3ek.js:495392-495639 placement
function runPaneRequest(request, kind) {
  let { clientId, component, requestId } = request;
  let key = siteKey(component, requestId);
  let site = paneSites.get(key);
  if (!isPaneSiteOpen(component, requestId) || (site === undefined && !isClientAttached(clientId)))
    return Promise.resolve(kind.denied(request));
  let paneSite = newPaneSite(
    {
      component,
      requestId,
      clientId,
    },
    site,
    {},
  );
  paneSites.set(key, paneSite);
  return kind.turnsOf(paneSite).take(request, kind.run);
}
//@ chunk-tyg7f3ek.js:495639-495660 placement
var handlePaneFocusRequest = (request) => runPaneRequest(request, FOCUS_REQUEST_KIND);
//@ chunk-tyg7f3ek.js:495660-495923 placement
function trackOpenPane(request) {
  let key = siteKey("Pane", request.requestId);
  let site = paneSites.get(key);
  if (!(
    isPaneSiteOpen("Pane", request.requestId) &&
    (site !== undefined || (request.isHeld && isClientAttached(request.clientId)))
  ))
    return;
  paneSites.set(
    key,
    newPaneSite(
      {
        component: "Pane",
        requestId: request.requestId,
        clientId: request.clientId,
      },
      site,
      {
        isHeld: request.isHeld,
        ...(!request.isHeld && {
          holder: undefined,
        }),
      },
    ),
  );
  publishPaneState(key);
}
//@ chunk-tyg7f3ek.js:495923-496085 placement
function syncOpenPanes(clientId) {
  let { open, focusedId } = paneRegistry().getState();
  for (let pane of open) {
    let tracked = paneSites.has(siteKey("Pane", pane.id));
    let focused = pane.id === focusedId;
    if (tracked || focused)
      trackOpenPane({
        clientId,
        requestId: pane.id,
        isHeld: focused,
      });
  }
}
//@ chunk-tyg7f3ek.js:496085-496195 placement
function dropPaneSites(predicate) {
  let filtered = [...paneSites.entries()].filter(([, site]) => predicate(site));
  for (let [key] of filtered) {
    paneSites.delete(key);
    publishPaneState(key);
  }
  return filtered.length;
}
//@ chunk-tyg7f3ek.js:496195-496277 placement
var dropClosedPanes = (state) =>
  dropPaneSites(
    (site) => site.component === "Pane" && !state.panes.some((pane) => pane.id === site.requestId),
  );
//@ chunk-tyg7f3ek.js:496277-496326 placement
var maxScrollOffset = (site) => Math.max(0, site.contentRows - site.bodyRows);
//@ chunk-tyg7f3ek.js:496326-496432 placement
function isLandedScroll(request, site) {
  let { unlandedOffset } = site;
  return (
    unlandedOffset !== undefined &&
    request.offset === Math.min(Math.max(0, unlandedOffset + request.by), maxScrollOffset(request))
  );
}
//@ chunk-tyg7f3ek.js:496432-497004 placement
function describeOpenPanes(state) {
  let filtered = state.open.filter((pane) => isModuleAdmittedByName(pane.plugin));
  let hiddenIds = new Set(state.open.filter((pane) => !filtered.includes(pane)).map((pane) => pane.id));
  let visible = (id) => (hiddenIds.has(id ?? "") ? null : id);
  let shownHidden = hiddenIds.has(state.shownId ?? "");
  return {
    panes: filtered.map((pane) => ({
      id: pane.id,
      title: pane.title,
      plugin: pane.plugin,
      ...(pane.closeOnEscape && {
        closeOnEscape: pane.closeOnEscape,
      }),
      ...(pane.holdToasts && {
        holdToasts: pane.holdToasts,
      }),
      ...(pane.backgroundColor !== undefined && {
        backgroundColor: pane.backgroundColor,
      }),
      ...(pane.rows !== undefined && {
        rows: pane.rows,
      }),
      ...(pane.columns !== undefined && {
        columns: pane.columns,
      }),
    })),
    shownId: shownHidden ? (filtered.at(-1)?.id ?? null) : state.shownId,
    focusedId: visible(state.focusedId),
    focusRequestedId: visible(state.focusRequest),
  };
}
//@ chunk-tyg7f3ek.js:497004-497172 placement
function subscribeOpenPanes(onPanes) {
  let lastJson = jsonStringify(describeOpenPanes(paneRegistry().getState()));
  function check() {
    let panes = describeOpenPanes(paneRegistry().getState());
    let json = jsonStringify(panes);
    if (json === lastJson) return;
    lastJson = json;
    onPanes(panes);
  }
  let unsubscribe = paneRegistry().subscribe(check);
  let unsubscribeSignal = subscribe_2(check);
  return () => {
    unsubscribe();
    unsubscribeSignal();
  };
}
//@ chunk-tyg7f3ek.js:497172-497276 placement
var windowMovedResult = (site) => ({
  result: {
    deny: "the window moved meanwhile",
  },
  offset: paneScrollOffset(site),
  isFollowingEnd: site.isFollowingEnd,
});
//@ chunk-tyg7f3ek.js:497276-497679 placement
function settleScrollRequest(request, result) {
  let { key, before } = request;
  let site = paneSites.get(key);
  if (site === undefined || site.scrolls !== request.scrolls)
    return {
      result,
      offset: before,
      isFollowingEnd: false,
    };
  if (site.isSuperseded) {
    let moved = windowMovedResult(site);
    site.scrolls.drop(moved);
    return moved;
  }
  let denied = result.deny !== undefined;
  let { end } = request;
  let isFollowingEnd =
    site.isFollowingEnd || (!denied && end.wasFollowed && end.isDownward && site.offset >= end.offset);
  paneSites.set(key, {
    ...site,
    offset: denied ? before : site.offset,
    isFollowingEnd,
  });
  return {
    result,
    offset: denied ? before : site.offset,
    isFollowingEnd,
  };
}
//@ chunk-tyg7f3ek.js:497679-497757 placement
var scrollFollowState = (request, site) => ({
  offset: maxScrollOffset(request),
  wasFollowed: site.isFollowingEnd,
  isDownward: request.by > 0,
});
//@ chunk-tyg7f3ek.js:497757-497833 placement
function clampScrollOffset(request, site) {
  let max = maxScrollOffset(request);
  return site.isFollowingEnd ? max : Math.min(site.offset, max);
}
//@ chunk-tyg7f3ek.js:497833-497928 placement
var describePaneScroll = (request, site) => ({
  key: siteKey(request.component, request.requestId),
  scrolls: site.scrolls,
  before: clampScrollOffset(request, site),
  end: scrollFollowState(request, site),
});
//@ chunk-tyg7f3ek.js:497928-498007 placement
var noSuchPaneSiteResult = (request) => ({
  result: {
    deny: "no such site",
  },
  offset: request.offset,
  isFollowingEnd: false,
});
//@ chunk-tyg7f3ek.js:498007-498808 placement
async function scrollPaneElement(request) {
  let { clientId, component, requestId } = request;
  let key = siteKey(component, requestId);
  let site = paneSites.get(key);
  if (site === undefined || !isPaneSiteOpen(component, requestId)) return noSuchPaneSiteResult(request);
  let described = describePaneScroll(request, site);
  let nextOffset =
    (described.end.wasFollowed && described.end.isDownward) || isLandedScroll(request, site)
      ? described.before + request.by
      : request.offset;
  let offset = Math.min(Math.max(0, nextOffset), described.end.offset);
  paneSites.set(
    key,
    newPaneSite(
      {
        component,
        requestId,
        clientId,
      },
      site,
      {
        offset: described.before,
        bodyRows: request.bodyRows,
        contentRows: request.contentRows,
        ...(request.keyed !== undefined && {
          keyed: request.keyed,
        }),
        isPersonMoving: true,
        isSuperseded: false,
      },
    ),
  );
  publishPaneState(key);
  try {
    return settleScrollRequest(
      described,
      await dispatchUiScroll({
        input: {
          component,
          requestId,
          offset,
          by: request.by,
          bodyRows: request.bodyRows,
          contentRows: request.contentRows,
          origin: {
            kind: "person",
          },
          ...(request.pointer !== undefined && {
            pointer: request.pointer,
          }),
        },
      }),
    );
  } finally {
    let site = paneSites.get(key);
    if (site !== undefined && site.scrolls === described.scrolls) {
      let unchanged = paneScrollOffset(site) === request.offset;
      paneSites.set(key, {
        ...site,
        isPersonMoving: false,
        isSuperseded: false,
        unlandedOffset: unchanged ? undefined : request.offset,
      });
    }
  }
}
//@ chunk-tyg7f3ek.js:498808-498857 placement
var SCROLL_REQUEST_KIND = {
  turnsOf: (site) => site.scrolls,
  run: scrollPaneElement,
  denied: noSuchPaneSiteResult,
};
//@ chunk-tyg7f3ek.js:498857-498951 placement
function pickContentRows(scroll, site) {
  return site === undefined || (site.bodyRows === 0 && site.contentRows === 0)
    ? scroll
    : {
        bodyRows: scroll.bodyRows,
      };
}
//@ chunk-tyg7f3ek.js:498951-499316 placement
function attachPaneClient(request) {
  let { clientId, component, requestId } = request;
  if (!(isPaneSiteOpen(component, requestId) && isClientAttached(clientId))) return;
  let key = siteKey(component, requestId);
  let site = paneSites.get(key);
  paneSites.set(
    key,
    newPaneSite(
      {
        component,
        requestId,
        clientId,
      },
      site,
      {
        clientId,
        ...(request.scroll !== undefined && pickContentRows(request.scroll, site)),
        ...(request.contentRows !== undefined && {
          contentRows: request.contentRows,
        }),
        ...(request.keyed !== undefined && {
          keyed: request.keyed,
        }),
        ...(request.keyboard !== undefined && {
          isHeld: request.keyboard === "held",
        }),
      },
    ),
  );
  publishPaneState(key);
}
//@ chunk-tyg7f3ek.js:499316-499590 placement
function updatePaneSurface(request) {
  let { clientId, component, requestId } = request;
  let key = siteKey(component, requestId);
  let site = paneSites.get(key);
  if (!(site !== undefined && isClientAttached(clientId) && isPaneSiteOpen(component, requestId))) return;
  let surfaceHandles = collectSurfaceHandles(request.tree);
  let { holder } = site;
  let holderStillDrawn =
    holder !== undefined &&
    surfaceHandles.some(
      (surfaceHandle) => surfaceHandle.plugin === holder.plugin && surfaceHandle.element === holder.element,
    );
  paneSites.set(key, {
    ...site,
    focusables: surfaceHandles,
    holder: holderStillDrawn ? holder : undefined,
  });
  publishPaneState(key);
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

/**
 * cli/print/pluginUiPanes.ts
 *
 * 2.1.316 新增：插件 UI 面板状态发布、滚动/聚焦与状态缓冲
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (43)
 * attribution: placement 43
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-0yw3taqg.js:522466-522479 placement
var PANE_STATUS_TTL_MS = 60000;
//@ chunk-0yw3taqg.js:522479-522489 placement
var PANE_STATUS_MAX = 20;
//@ chunk-0yw3taqg.js:522489-523023 placement
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
//@ chunk-0yw3taqg.js:523023-523099 placement
var paneSignals; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0yw3taqg.js:523023", () => {
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
//@ chunk-0yw3taqg.js:523099-523133 placement
var paneSites; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0yw3taqg.js:523099", () => {
  paneSites = identity(new Map(), (sites) => sites.clear());
});
//@ chunk-0yw3taqg.js:523133-523595 placement
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
//@ chunk-0yw3taqg.js:523595-524044 placement
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
//@ chunk-0yw3taqg.js:524044-524150 placement
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
//@ chunk-0yw3taqg.js:524150-524253 placement
function paneHolder(key) {
  let holder = paneSites.get(key)?.holder;
  if (holder === undefined) return null;
  return {
    plugin: holder.plugin,
    key: holder.element,
  };
}
//@ chunk-0yw3taqg.js:524253-524294 placement
var paneResultWithElement = (key, result) => ({
  result,
  element: paneHolder(key),
});
//@ chunk-0yw3taqg.js:524294-524410 placement
function isPaneSiteOpen(component, requestId) {
  let isAbovePrompt = component === "AbovePrompt" && requestId === ABOVE_PROMPT;
  let isOpenPane =
    component === "Pane" &&
    paneRegistry()
      .getState()
      .open.some((pane) => pane.id === requestId);
  return isAbovePrompt || isOpenPane;
}
//@ chunk-0yw3taqg.js:524410-524518 placement
function paneScrollOffset(site) {
  if (site === undefined) return 0;
  return site.isFollowingEnd ? Math.max(0, site.contentRows - site.bodyRows) : site.offset;
}
//@ chunk-0yw3taqg.js:524518-525350 placement
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
//@ chunk-0yw3taqg.js:525350-525458 placement
function keepHeldElement(previous, next) {
  return next.element === undefined && next.isHeld && previous.element !== undefined
    ? {
        ...next,
        element: previous.element,
        by: previous.by,
      }
    : next;
}
//@ chunk-0yw3taqg.js:525458-525494 placement
var mergeScrollReporter = (a, b) => ({
  ...b,
  by: a.by + b.by,
});
//@ chunk-0yw3taqg.js:525494-525582 placement
function pluginOfPane(component, requestId) {
  return (component === "Pane" ? allPanes(paneRegistry().getState()) : []).find(
    (pane) => pane.id === requestId,
  )?.plugin;
}
//@ chunk-0yw3taqg.js:525582-526067 placement
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
//@ chunk-0yw3taqg.js:526067-526370 placement
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
//@ chunk-0yw3taqg.js:526370-526427 placement
var noSuchSiteResult = () => ({
  result: {
    deny: "no such site",
  },
  element: null,
});
//@ chunk-0yw3taqg.js:526427-526921 placement
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
//@ chunk-0yw3taqg.js:526921-526970 placement
var FOCUS_REQUEST_KIND = {
  turnsOf: (site) => site.focuses,
  run: focusPaneElement,
  denied: noSuchSiteResult,
};
//@ chunk-0yw3taqg.js:526970-527018 placement
var isClientAttached = (clientId) => clientRegistry.list().some((client) => client.clientId === clientId);
//@ chunk-0yw3taqg.js:527018-527265 placement
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
//@ chunk-0yw3taqg.js:527265-527286 placement
var handlePaneFocusRequest = (request) => runPaneRequest(request, FOCUS_REQUEST_KIND);
//@ chunk-0yw3taqg.js:527286-527549 placement
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
//@ chunk-0yw3taqg.js:527549-527711 placement
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
//@ chunk-0yw3taqg.js:527711-527821 placement
function dropPaneSites(predicate) {
  let filtered = [...paneSites.entries()].filter(([, site]) => predicate(site));
  for (let [key] of filtered) {
    paneSites.delete(key);
    publishPaneState(key);
  }
  return filtered.length;
}
//@ chunk-0yw3taqg.js:527821-527903 placement
var dropClosedPanes = (state) =>
  dropPaneSites(
    (site) => site.component === "Pane" && !state.panes.some((pane) => pane.id === site.requestId),
  );
//@ chunk-0yw3taqg.js:527903-527952 placement
var maxScrollOffset = (site) => Math.max(0, site.contentRows - site.bodyRows);
//@ chunk-0yw3taqg.js:527952-528058 placement
function isLandedScroll(request, site) {
  let { unlandedOffset } = site;
  return (
    unlandedOffset !== undefined &&
    request.offset === Math.min(Math.max(0, unlandedOffset + request.by), maxScrollOffset(request))
  );
}
//@ chunk-0yw3taqg.js:528058-528630 placement
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
//@ chunk-0yw3taqg.js:528630-528798 placement
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
//@ chunk-0yw3taqg.js:528798-528902 placement
var windowMovedResult = (site) => ({
  result: {
    deny: "the window moved meanwhile",
  },
  offset: paneScrollOffset(site),
  isFollowingEnd: site.isFollowingEnd,
});
//@ chunk-0yw3taqg.js:528902-529305 placement
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
//@ chunk-0yw3taqg.js:529305-529383 placement
var scrollFollowState = (request, site) => ({
  offset: maxScrollOffset(request),
  wasFollowed: site.isFollowingEnd,
  isDownward: request.by > 0,
});
//@ chunk-0yw3taqg.js:529383-529459 placement
function clampScrollOffset(request, site) {
  let max = maxScrollOffset(request);
  return site.isFollowingEnd ? max : Math.min(site.offset, max);
}
//@ chunk-0yw3taqg.js:529459-529554 placement
var describePaneScroll = (request, site) => ({
  key: siteKey(request.component, request.requestId),
  scrolls: site.scrolls,
  before: clampScrollOffset(request, site),
  end: scrollFollowState(request, site),
});
//@ chunk-0yw3taqg.js:529554-529633 placement
var noSuchPaneSiteResult = (request) => ({
  result: {
    deny: "no such site",
  },
  offset: request.offset,
  isFollowingEnd: false,
});
//@ chunk-0yw3taqg.js:529633-530434 placement
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
//@ chunk-0yw3taqg.js:530434-530483 placement
var SCROLL_REQUEST_KIND = {
  turnsOf: (site) => site.scrolls,
  run: scrollPaneElement,
  denied: noSuchPaneSiteResult,
};
//@ chunk-0yw3taqg.js:530483-530577 placement
function pickContentRows(scroll, site) {
  return site === undefined || (site.bodyRows === 0 && site.contentRows === 0)
    ? scroll
    : {
        bodyRows: scroll.bodyRows,
      };
}
//@ chunk-0yw3taqg.js:530577-530942 placement
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
//@ chunk-0yw3taqg.js:530942-531216 placement
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

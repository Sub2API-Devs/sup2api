/**
 * cli/print/remoteComposer.ts
 *
 * 2.1.316 新增：远程输入框编辑队列、自动补全与面板描述
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { EMPTY_PROMPT_DRAFT } from "../../plugins/functionHooks/promptApi.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:531216-531250 placement
var PANE_PLACEMENT_HOLDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0yw3taqg.js:531216", () => {
  PANE_PLACEMENT_HOLDS = identity(new Map(), (holds) => holds.clear());
});
//@ chunk-0yw3taqg.js:531250-531559 placement
function pruneDetachedClients() {
  let fullscreenIds = new Set(fullscreenClients().map((client) => client.clientId));
  let liveIds = new Set(clientRegistry.list().map((client) => client.clientId));
  dropPaneSites((site) => !liveIds.has(site.clientId));
  for (let [clientId, releaseHold] of PANE_PLACEMENT_HOLDS)
    if (!fullscreenIds.has(clientId)) {
      PANE_PLACEMENT_HOLDS.delete(clientId);
      releaseHold();
    }
  for (let clientId of fullscreenIds)
    if (!PANE_PLACEMENT_HOLDS.has(clientId)) {
      PANE_PLACEMENT_HOLDS.set(clientId, holdPanePlacement());
      placeWaitingPanes(`${clientId} attached`);
    }
  if (paneHostSlot.get() === undefined && describePaneUnplaced() === undefined)
    placeWaitingPanes("no sized client attached");
}
//@ chunk-0yw3taqg.js:531559-531969 placement
var describePanesForClient = (snapshot) => ({
  panes: snapshot.panes.map((pane) => ({
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
  shown_id: snapshot.shownId,
  focused_id: snapshot.focusedId,
  focus_requested_id: snapshot.focusRequestedId,
});
//@ chunk-0yw3taqg.js:531969-531990 placement
var handlePaneScrollRequest = (request) => runPaneRequest(request, SCROLL_REQUEST_KIND);
//@ chunk-0yw3taqg.js:531990-532327 placement
function paneStateFields(props) {
  let { scroll, isFocused } = props;
  let isScrollObject =
    typeof scroll === "object" && scroll !== null && "offset" in scroll && "bodyRows" in scroll;
  let offset = isScrollObject ? scroll.offset : undefined;
  let bodyRows = isScrollObject ? scroll.bodyRows : undefined;
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
//@ chunk-0yw3taqg.js:532327-533305 placement
/**
 * 远程编辑器（remote composer）的 prompt.autocomplete：每个客户端一条在途请求，新请求取代旧请求。
 */
function createRemoteAutocomplete(deps) {
  let raise = deps.raise ?? autocompleteWithNoCore;
  let byClient = new Map();
  deps.onDetach?.((clientKey) => {
    releaseEntry(byClient.get(clientKey));
    byClient.delete(clientKey);
  });
  function releaseEntry(entry) {
    entry?.out?.abort();
    entry?.waiting?.answer({
      suggestions: [],
      superseded: true,
    });
    if (entry !== undefined) entry.waiting = undefined;
  }
  function resolveEntry(clientKey, result) {
    let waiting = result.waiting;
    if (result.out === undefined && waiting === undefined && byClient.get(clientKey) === result)
      byClient.delete(clientKey);
    if (result.out !== undefined || waiting === undefined) {
      result.out?.abort();
      return;
    }
    let token = currentToken(waiting.box);
    let abortController = new AbortController();
    result.waiting = undefined;
    if (token === undefined) {
      waiting.answer({
        suggestions: [],
      });
      resolveEntry(clientKey, result);
      return;
    }
    result.out = abortController;
    new Promise((resolve) => resolve(raise(token, abortController.signal)))
      .then((response) => normalizeAutocompleteSuggestions(response.suggestions))
      .catch((error) => {
        if (!abortController.signal.aborted)
          logForDebugging(`prompt.autocomplete (remote composer): ${errorMessage(error)}; no row added`, {
            level: "error",
          });
        return [];
      })
      .then((suggestions) => {
        result.out = undefined;
        waiting.answer(
          abortController.signal.aborted
            ? {
                suggestions: [],
                superseded: true,
              }
            : {
                suggestions,
                start: token.start,
              },
        );
        resolveEntry(clientKey, result);
      });
  }
  return {
    ask: (clientKey, box) =>
      new Promise((resolve) => {
        let entry = byClient.get(clientKey) ?? {};
        byClient.set(clientKey, entry);
        entry.waiting?.answer({
          suggestions: [],
          superseded: true,
        });
        entry.waiting = {
          box,
          answer: resolve,
        };
        resolveEntry(clientKey, entry);
      }),
    clear: () => {
      for (let entry of byClient.values()) releaseEntry(entry);
      byClient.clear();
    },
  };
}
//@ chunk-0yw3taqg.js:533305-533358 placement
var REMOTE_AUTOCOMPLETE; // deferred: uses createRemoteAutocomplete of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0yw3taqg.js:533305", () => {
  REMOTE_AUTOCOMPLETE = identity(
    createRemoteAutocomplete({
      onDetach: clientRegistry.onDetach,
    }),
    (queue) => queue.clear(),
  );
});
//@ chunk-0yw3taqg.js:533358-533435 placement
function editDistanceAfterChange(previousText, nextText) {
  let { start, end, inputText } = diffTextEdit(previousText, nextText);
  return end - start + inputText.length;
}
//@ chunk-0yw3taqg.js:533435-533514 placement
function closerEditBox(entry, nextText) {
  let { box, offered } = entry;
  return offered !== undefined &&
    editDistanceAfterChange(offered, nextText) < editDistanceAfterChange(box, nextText)
    ? offered
    : box;
}
//@ chunk-0yw3taqg.js:533514-533667 placement
function toInkKeyFromRemote(key) {
  let isSpace = key.key === "space";
  return {
    key: isSpace ? " " : key.key,
    name: isSpace || [...key.key].length === 1 ? "" : key.key,
    ctrl: key.ctrl === true,
    shift: key.shift === true,
    meta: key.meta === true,
  };
}
//@ chunk-0yw3taqg.js:533667-534921 placement
/**
 * 远程编辑器的 prompt.edit：按客户端排队编辑请求并逐个应用。
 */
function createRemoteEditQueue(deps) {
  let raise = deps.raise ?? dispatchPromptEdit;
  let byClient = new Map();
  deps.onDetach?.((clientKey) => byClient.delete(clientKey));
  function raiseNext(entry) {
    let edit = entry.waiting.at(-1);
    if (entry.isRaising || edit === undefined) return;
    let key = entry.waiting.length === 1 ? edit.key : undefined;
    let before = closerEditBox(entry, edit.box);
    for (let pendingEdit of entry.waiting.slice(0, -1))
      pendingEdit.answer({
        ...pendingEdit.box,
        superseded: true,
      });
    entry.box = edit.box;
    entry.offered = undefined;
    entry.waiting = [];
    entry.isRaising = true;
    new Promise((resolve) =>
      resolve(
        raise({
          before,
          after: edit.box,
          ...(key !== undefined && {
            key: toInkKeyFromRemote(key),
          }),
        }),
      ),
    )
      .then((afterPrompt) => applyRaisedBox(entry, edit, afterPrompt))
      .catch((error) => {
        logForDebugging(`prompt.edit (remote composer): ${errorMessage(error)}; the edit stands`);
        applyRaisedBox(entry, edit, edit.box);
      });
  }
  function applyRaisedBox(entry, edit, box) {
    let nextBox = clampCursor(box);
    let isChanged =
      (nextBox.text !== edit.box.text || nextBox.cursor !== edit.box.cursor) &&
      entry.waiting.length === 0 &&
      !entry.isStale;
    let decorations = nonEmptySpans(normalizeInputDecorations(box.decorations, nextBox.text));
    entry.isRaising = false;
    entry.isStale = false;
    if (isChanged) entry.offered = nextBox;
    edit.answer({
      ...nextBox,
      ...(decorations.length > 0 && {
        decorations,
      }),
    });
    raiseNext(entry);
  }
  function touchEntry(clientKey) {
    let entry = byClient.get(clientKey) ?? {
      box: EMPTY_PROMPT_DRAFT,
      isRaising: false,
      isStale: false,
      waiting: [],
    };
    byClient.delete(clientKey);
    byClient.set(clientKey, entry);
    return entry;
  }
  return {
    edit: (request) =>
      new Promise((resolve) => {
        let entry = touchEntry(request.clientKey);
        entry.waiting = [
          ...entry.waiting,
          {
            box: clampCursor(request.box),
            ...(request.key !== undefined && {
              key: request.key,
            }),
            answer: resolve,
          },
        ];
        raiseNext(entry);
      }),
    adopt: (clientKey, box) => {
      let entry = touchEntry(clientKey);
      for (let pendingEdit of entry.waiting)
        pendingEdit.answer({
          ...pendingEdit.box,
          superseded: true,
        });
      entry.box = clampCursor(box);
      entry.offered = undefined;
      entry.waiting = [];
      entry.isStale = entry.isRaising;
      return entry.box;
    },
    read: () => [...byClient.values()].at(-1)?.box,
    forget: (clientKey) => {
      byClient.delete(clientKey);
    },
    clear: () => {
      byClient.clear();
    },
  };
}
//@ chunk-0yw3taqg.js:534921-534974 placement
var REMOTE_EDIT_QUEUE; // deferred: uses createRemoteEditQueue of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0yw3taqg.js:534921", () => {
  REMOTE_EDIT_QUEUE = identity(
    createRemoteEditQueue({
      onDetach: clientRegistry.onDetach,
    }),
    (queue) => queue.clear(),
  );
});
export {
  REMOTE_EDIT_QUEUE,
  pruneDetachedClients,
  describePanesForClient,
  REMOTE_AUTOCOMPLETE,
  handlePaneScrollRequest,
  paneStateFields,
};

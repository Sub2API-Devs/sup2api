/**
 * components/pluginUi/promptChangeHook.ts
 *
 * 2.1.316 新增。prompt.change 插件钩子桥接。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 8
 */
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "../../plugins/functionHooks/eventCatalog.js";
import { uniq } from "../../utils/collections.js";
import { logForDebugging } from "../../utils/debug.js";
import { tellOnce } from "../../plugins/functionHooks/ui/renderNotices.js";
import { errorMessage } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1807723-1807785 placement
function hasPromptChangeHookingSite() {
  try {
    return hasModuleHookingSite("prompt.change");
  } catch {
    return false;
  }
}
//@ chunk-18hwfzwa.js:1807785-1807823 placement
var clearedPromptOrigin; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1807785", () => {
  clearedPromptOrigin = Object.freeze({
    kind: "clear",
  });
});
//@ chunk-18hwfzwa.js:1807823-1807862 placement
var enginePromptOrigin; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1807823", () => {
  enginePromptOrigin = Object.freeze({
    kind: "engine",
  });
});
//@ chunk-18hwfzwa.js:1807862-1807995 placement
function promptChangeOrigin(change, fallbackOrigin) {
  let defaultOrigin = change.after === "" ? clearedPromptOrigin : enginePromptOrigin;
  let origin = change.origin;
  if (origin === undefined || origin.kind === "composer") return defaultOrigin;
  return origin.kind === "landing" ? (fallbackOrigin ?? defaultOrigin) : origin;
}
//@ chunk-18hwfzwa.js:1807995-1808005 placement
var MAX_STALLED_PLUGINS = 8;
//@ chunk-18hwfzwa.js:1808005-1808064 placement
function raiseCorePromptChange(change, signal) {
  return NO_CORE_AT_CHAIN_BOTTOM("prompt.change", {
    signal,
  })(change);
}
//@ chunk-18hwfzwa.js:1808064-1808313 placement
function warnPromptChangeStalled(owners) {
  let joined = uniq(owners).toSorted().join(", ");
  let message = `prompt.change: ${owners.length} dispatches in a row for fills by ${joined}; not raised again until the box changes another way`;
  logForDebugging(message, {
    level: "warn",
  });
  tellOnce({
    key: `prompt.change stalled ${joined}`,
    lead: "hooks",
    text: message,
  });
}
//@ chunk-18hwfzwa.js:1808313-1809318 placement
function raisePromptChange(readPrompt, options = {}) {
  let raise = options.raise ?? raiseCorePromptChange;
  let later = options.later ?? queueMicrotask;
  let isHooked = options.isHooked ?? hasPromptChangeHookingSite;
  let report = options.report ?? ((message) => logForDebugging(message));
  let stall = options.stall ?? warnPromptChangeStalled;
  let abortController = new AbortController();
  let pendingBefore;
  let pendingAfter;
  let pendingOrigin;
  let lastOrigin;
  let stalledPlugins = [];
  let stalledWarned = false;
  let inFlight = false;
  let scheduled = false;
  function noteStalledPlugin(origin) {
    if (origin.kind !== "plugin") return false;
    let isStalled = stalledPlugins.length >= MAX_STALLED_PLUGINS;
    if (isStalled && !stalledWarned) {
      stalledWarned = true;
      stall(stalledPlugins);
    }
    stalledPlugins = isStalled ? stalledPlugins : [...stalledPlugins, origin.name];
    return isStalled;
  }
  function run() {
    scheduled = false;
    let origin = pendingOrigin;
    if (inFlight || abortController.signal.aborted || pendingBefore === undefined || origin === undefined)
      return;
    let next = readPrompt();
    let afterChanged = pendingAfter !== undefined && next.text !== pendingAfter;
    let needsRaise = next.text !== pendingBefore || afterChanged;
    pendingBefore = undefined;
    pendingAfter = undefined;
    pendingOrigin = undefined;
    if (!needsRaise || !isHooked() || noteStalledPlugin(origin)) return;
    inFlight = true;
    new Promise((resolve) =>
      resolve(
        raise(
          {
            ...next,
            origin,
          },
          abortController.signal,
        ),
      ),
    )
      .catch((error) => {
        report(`prompt.change: ${errorMessage(error)}`);
      })
      .finally(() => {
        inFlight = false;
      })
      .then(run);
  }
  return {
    changed: (change) => {
      let isComposer = change.origin?.kind === "composer";
      if (abortController.signal.aborted) return;
      lastOrigin = isComposer ? undefined : promptChangeOrigin(change, lastOrigin);
      if (lastOrigin?.kind !== "plugin") {
        stalledPlugins = [];
        stalledWarned = false;
      }
      if (lastOrigin === undefined) {
        pendingAfter = pendingBefore === undefined ? undefined : change.after;
        return;
      }
      if (!isHooked()) {
        pendingBefore = undefined;
        pendingAfter = undefined;
        pendingOrigin = undefined;
        return;
      }
      pendingBefore ??= change.before;
      pendingOrigin = lastOrigin;
      if (!scheduled && !inFlight) {
        scheduled = true;
        later(run);
      }
    },
    dispose: () => {
      pendingBefore = undefined;
      pendingAfter = undefined;
      pendingOrigin = undefined;
      abortController.abort();
    },
  };
}
export { raisePromptChange };

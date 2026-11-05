/**
 * components/pluginUi/toastStack.ts
 *
 * 2.1.316 新增。插件 toast 队列。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (21)
 * attribution: placement 21
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { __export } from "../../../runtime/bun-runtime.js";
import {
  MAX_QUEUED_TOASTS,
  pluginToastScopeKey,
  tellRefusalOnce,
} from "../../plugins/functionHooks/uiToast.js";
import { emptyPluginLoadState, getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { custom } from "../../../vendor/zod/v4/classic/schemas.js";
import { identity as identity_4 } from "../../utils/identity.js";
import { ENGINE } from "../../plugins/functionHooks/dispatch/chain.js";
import { stateSession, entryKeyOf, landValue } from "../../plugins/functionHooks/api/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { tellOnce } from "../../plugins/functionHooks/ui/renderNotices.js";
import { arraysEqual } from "../../utils/collections.js";
import { sourceLabel } from "../../utils/messages/nonUserMessages.js";
import { isPolicyTier } from "../../plugins/functionHooks/hookDispatch.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:34057-34067 placement
var toastStackNamespace = {};
//@ chunk-czq1j3j2.js:34067-34507 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:34067", () => {
  __export(toastStackNamespace, {
    NO_TOASTS: () => NO_TOASTS,
    TOAST_FADE_MS: () => TOAST_FADE_MS,
    TOAST_HOLD_MAX_MS: () => TOAST_HOLD_MAX_MS,
    TOAST_STACK_MAX: () => MAX_QUEUED_TOASTS,
    TOAST_STACK_REF: () => TOAST_STACK_REF,
    createToastClock: () => emptyPluginLoadState,
    default: () => toastStackNamespace,
    dismissToast: () => dismissToast,
    drawnToasts: () => drawnToasts,
    expireToasts: () => expireToasts,
    expiredToasts: () => expiredToasts,
    holdToast: () => holdToast,
    keepToasts: () => keepToasts,
    pauseToasts: () => pauseToasts,
    pushToast: () => pushToast,
    scheduleExpiry: () => scheduleExpiry,
    sharedStack: () => sharedStack,
    stackToast: () => stackToast,
    stackedToasts: () => stackedToasts,
    tellToastUndrawn: () => tellToastUndrawn,
    toastClock: () => toastClock,
  });
});
//@ chunk-czq1j3j2.js:185156-185206 placement
function looseStringSchema() {
  return custom((value) => typeof value === "string");
}
//@ chunk-czq1j3j2.js:185206-185240 placement
var drawnToasts; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:185206", () => {
  drawnToasts = identity_4(new Set(), (set) => set.clear());
});
//@ chunk-czq1j3j2.js:185240-185251 placement
var TOAST_FADE_MS = 240;
//@ chunk-czq1j3j2.js:185251-185264 placement
var TOAST_HOLD_MAX_MS = 30000;
//@ chunk-czq1j3j2.js:185264-185508 placement
var expiredToasts = (toasts, now) =>
  toasts.flatMap((toast) => {
    let { heldAt, ...rest } = toast;
    let unheld =
      heldAt !== undefined && now - heldAt >= TOAST_HOLD_MAX_MS
        ? {
            ...rest,
            leavesAt: toast.leavesAt + (now - heldAt),
          }
        : toast;
    let isExpired = unheld.heldAt === undefined && unheld.leavesAt <= now;
    let isLeaving = isExpired && unheld.phase === "leaving";
    let leaving = isExpired
      ? {
          ...unheld,
          phase: "leaving",
          leavesAt: now + TOAST_FADE_MS,
        }
      : unheld;
    return isLeaving ? [] : [leaving];
  });
//@ chunk-czq1j3j2.js:185508-185534 placement
var NO_TOASTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:185508", () => {
  NO_TOASTS = Object.freeze([]);
});
//@ chunk-czq1j3j2.js:185534-185567 placement
var TOAST_STACK_REF; // deferred: uses ENGINE (../../plugins/functionHooks/dispatch/chain.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:185534", () => {
  TOAST_STACK_REF = {
    plugin: ENGINE,
    key: "toasts",
  };
});
//@ chunk-czq1j3j2.js:185567-185663 placement
function stackedToasts(state = stateSession().values.getState()) {
  let value = state.get(entryKeyOf(TOAST_STACK_REF))?.value;
  return Array.isArray(value) ? value : NO_TOASTS;
}
//@ chunk-czq1j3j2.js:185663-185690 placement
var toastClock = () => getPluginRegistry().toastClock;
//@ chunk-czq1j3j2.js:185690-186021 placement
function scheduleExpiry(now, onExpire) {
  let clock = toastClock();
  if (clock.pending !== undefined) {
    clearTimeout(clock.pending);
    clock.pending = undefined;
  }
  let mapped = stackedToasts().map(
    (toast) => (toast.heldAt ?? toast.leavesAt) + (toast.heldAt === undefined ? 0 : TOAST_HOLD_MAX_MS),
  );
  if (clock.pausedAt !== undefined || mapped.length === 0) return;
  clock.pending = setTimeout(
    (ownerClock, callback) => {
      if (ownerClock === toastClock()) {
        ownerClock.pending = undefined;
        callback();
      }
    },
    Math.max(1, Math.min(...mapped) - now()),
    clock,
    onExpire,
  );
  clock.pending.unref();
}
//@ chunk-czq1j3j2.js:186021-186242 placement
function sharedStack(toasts) {
  if (toasts.length <= MAX_QUEUED_TOASTS) return toasts;
  let lastIsManaged = toasts.at(-1)?.isManaged === true;
  let [largestGroup] = [
    ...Map.groupBy(
      toasts.filter((toast) => lastIsManaged || !toast.isManaged),
      (toast) => toast.owner,
    ).values(),
  ].toSorted((a, b) => b.length - a.length);
  return sharedStack(toasts.filter((toast) => toast !== largestGroup?.[0]));
}
//@ chunk-czq1j3j2.js:186242-186455 placement
function tellToastUndrawn(toast) {
  logForDebugging(`$.ui.toast (${toast.owner}): ${toast.id} left the stack, never drawn`);
  tellOnce({
    key: ["toast undrawn", pluginToastScopeKey(toast.owner)].join(" "),
    lead: toast.owner,
    text: "$.ui.toast: a toast left the stack before it was ever drawn",
  });
}
//@ chunk-czq1j3j2.js:186455-186712 placement
function keepToasts(toasts, now) {
  let kept = sharedStack(toasts);
  let previous = stackedToasts();
  let keptIds = new Set(kept.map((toast) => toast.id));
  let previousIds = new Set(previous.map((toast) => toast.id));
  if (!arraysEqual(previous, kept)) landValue(entryKeyOf(TOAST_STACK_REF), kept);
  previous
    .concat(toasts.filter((toast) => !previousIds.has(toast.id)))
    .filter((toast) => !keptIds.has(toast.id) && !drawnToasts.delete(toast.id))
    .forEach(tellToastUndrawn);
  scheduleExpiry(now, () => keepToasts(expiredToasts(stackedToasts(), now()), now));
}
//@ chunk-czq1j3j2.js:186712-186819 placement
function dismissToast(id, now = Date.now) {
  let previous = stackedToasts();
  let filtered = previous.filter((toast) => toast.id !== id);
  if (filtered.length !== previous.length) {
    drawnToasts.add(id);
    keepToasts(filtered, now);
  }
}
//@ chunk-czq1j3j2.js:186819-186851 placement
var expireToasts = (now) => keepToasts(expiredToasts(stackedToasts(), now()), now);
//@ chunk-czq1j3j2.js:186851-187130 placement
function holdToast(change, now = Date.now) {
  let nowMs = now();
  let previous = stackedToasts();
  let mapped = previous.map((toast) => {
    if (toast.id !== change.id || (toast.heldAt !== undefined) === change.isHeld) return toast;
    if (change.isHeld)
      return {
        ...toast,
        phase: "shown",
        heldAt: nowMs,
      };
    let { heldAt, ...rest } = toast;
    return {
      ...rest,
      leavesAt: toast.leavesAt + (nowMs - (heldAt ?? nowMs)),
    };
  });
  if (mapped.some((toast, index) => toast !== previous[index])) keepToasts(mapped, now);
}
//@ chunk-czq1j3j2.js:187130-187393 placement
function pauseToasts(change, now = Date.now) {
  let clock = toastClock();
  let { pausedAt } = clock;
  if (change.isPaused === (pausedAt !== undefined)) return;
  let nowMs = now();
  clock.pausedAt = change.isPaused ? nowMs : undefined;
  let elapsedMs = nowMs - (pausedAt ?? nowMs);
  keepToasts(
    elapsedMs === 0
      ? stackedToasts()
      : stackedToasts().map((toast) => ({
          ...toast,
          leavesAt: toast.leavesAt + elapsedMs,
          ...(toast.heldAt !== undefined && {
            heldAt: toast.heldAt + elapsedMs,
          }),
        })),
    now,
  );
}
//@ chunk-czq1j3j2.js:187431-187630 placement
function pushToast(request, now = Date.now) {
  let nowMs = now();
  keepToasts(
    [
      ...stackedToasts(),
      {
        id: randomUUID(),
        owner: request.plugin,
        plugin: sourceLabel(request.plugin),
        isManaged: isPolicyTier(request.plugin),
        text: request.text,
        shownAt: nowMs,
        leavesAt: (toastClock().pausedAt ?? nowMs) + request.timeoutMs,
        phase: "shown",
      },
    ],
    now,
  );
}
//@ chunk-czq1j3j2.js:187630-187897 placement
function stackToast(request) {
  let previousIds = new Set(stackedToasts().map((toast) => toast.id));
  pushToast(request);
  let any = stackedToasts().some((toast) => !previousIds.has(toast.id));
  let stackResult = any ? "stacked" : "not stacked, the stack being full";
  if (any)
    tellRefusalOnce("toast stacked", request.plugin, () => logFeatureOk("plugin_function_hooks_toast_stack"));
  logForDebugging(`$.ui.toast: ${stackResult} (${stackedToasts().length} up)`);
}
export { looseStringSchema, drawnToasts, TOAST_FADE_MS, toastStackNamespace, pauseToasts, stackToast };

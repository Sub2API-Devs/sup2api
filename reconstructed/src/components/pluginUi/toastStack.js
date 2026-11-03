/**
 * components/pluginUi/toastStack.ts
 *
 * 2.1.316 新增。插件 toast 队列。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (21)
 * attribution: placement 21
 */
import { randomUUID } from "crypto";
import { Ar } from "../../../runtime/bun-runtime.js";
import {
  MAX_QUEUED_TOASTS,
  pluginToastScopeKey,
  tellRefusalOnce,
} from "../../plugins/functionHooks/uiToast.js";
import { emptyPluginLoadState, getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { hu } from "../../../vendor/zod/v4/classic/schemas.js";
import { identity as identity_4 } from "../../utils/identity.js";
import { ENGINE } from "../../plugins/functionHooks/dispatch/chain.js";
import {
  pluginStateRegistry,
  stateEntryKey,
  writeStateValue,
} from "../../plugins/functionHooks/api/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { tellOnce } from "../../plugins/functionHooks/ui/renderNotices.js";
import { arraysEqual } from "../../utils/collections.js";
import { sourceLabel } from "../../utils/messages/nonUserMessages.js";
import { isPolicyTier } from "../../plugins/functionHooks/hookDispatch.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-18hwfzwa.js:32496-32506 placement
var toastStackNamespace = {};
//@ chunk-18hwfzwa.js:32506-32946 placement
Ar(toastStackNamespace, {
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
//@ chunk-18hwfzwa.js:180359-180409 placement
function looseStringSchema() {
  return hu((h) => typeof h === "string");
}
//@ chunk-18hwfzwa.js:180409-180443 placement
var drawnToasts = identity_4(new Set(), (h) => h.clear());
//@ chunk-18hwfzwa.js:180443-180454 placement
var TOAST_FADE_MS = 240;
//@ chunk-18hwfzwa.js:180454-180467 placement
var TOAST_HOLD_MAX_MS = 30000;
//@ chunk-18hwfzwa.js:180467-180711 placement
var expiredToasts = (h, x) =>
  h.flatMap((D) => {
    let { heldAt, ...ee } = D;
    let Re =
      heldAt !== undefined && x - heldAt >= TOAST_HOLD_MAX_MS
        ? {
            ...ee,
            leavesAt: D.leavesAt + (x - heldAt),
          }
        : D;
    let Be = Re.heldAt === undefined && Re.leavesAt <= x;
    let He = Be && Re.phase === "leaving";
    let We = Be
      ? {
          ...Re,
          phase: "leaving",
          leavesAt: x + TOAST_FADE_MS,
        }
      : Re;
    return He ? [] : [We];
  });
//@ chunk-18hwfzwa.js:180711-180737 placement
var NO_TOASTS = Object.freeze([]);
//@ chunk-18hwfzwa.js:180737-180770 placement
var TOAST_STACK_REF = {
  plugin: ENGINE,
  key: "toasts",
};
//@ chunk-18hwfzwa.js:180770-180866 placement
function stackedToasts(h = pluginStateRegistry().values.getState()) {
  let x = h.get(stateEntryKey(TOAST_STACK_REF))?.value;
  return Array.isArray(x) ? x : NO_TOASTS;
}
//@ chunk-18hwfzwa.js:180866-180893 placement
var toastClock = () => getPluginRegistry().toastClock;
//@ chunk-18hwfzwa.js:180893-181224 placement
function scheduleExpiry(h, x) {
  let D = toastClock();
  if (D.pending !== undefined) {
    clearTimeout(D.pending);
    D.pending = undefined;
  }
  let mapped = stackedToasts().map(
    (ke) => (ke.heldAt ?? ke.leavesAt) + (ke.heldAt === undefined ? 0 : TOAST_HOLD_MAX_MS),
  );
  if (D.pausedAt !== undefined || mapped.length === 0) return;
  D.pending = setTimeout(
    (ke, Re) => {
      if (ke === toastClock()) {
        ke.pending = undefined;
        Re();
      }
    },
    Math.max(1, Math.min(...mapped) - h()),
    D,
    x,
  );
  D.pending.unref();
}
//@ chunk-18hwfzwa.js:181224-181445 placement
function sharedStack(h) {
  if (h.length <= MAX_QUEUED_TOASTS) return h;
  let x = h.at(-1)?.isManaged === true;
  let [D] = [
    ...Map.groupBy(
      h.filter((L) => x || !L.isManaged),
      (L) => L.owner,
    ).values(),
  ].toSorted((L, ee) => ee.length - L.length);
  return sharedStack(h.filter((L) => L !== D?.[0]));
}
//@ chunk-18hwfzwa.js:181445-181658 placement
function tellToastUndrawn(h) {
  logForDebugging(`$.ui.toast (${h.owner}): ${h.id} left the stack, never drawn`);
  tellOnce({
    key: ["toast undrawn", pluginToastScopeKey(h.owner)].join(" "),
    lead: h.owner,
    text: "$.ui.toast: a toast left the stack before it was ever drawn",
  });
}
//@ chunk-18hwfzwa.js:181658-181915 placement
function keepToasts(h, x) {
  let D = sharedStack(h);
  let L = stackedToasts();
  let ee = new Set(D.map((Re) => Re.id));
  let ke = new Set(L.map((Re) => Re.id));
  if (!arraysEqual(L, D)) writeStateValue(stateEntryKey(TOAST_STACK_REF), D);
  L.concat(h.filter((Re) => !ke.has(Re.id)))
    .filter((Re) => !ee.has(Re.id) && !drawnToasts.delete(Re.id))
    .forEach(tellToastUndrawn);
  scheduleExpiry(x, () => keepToasts(expiredToasts(stackedToasts(), x()), x));
}
//@ chunk-18hwfzwa.js:181915-182022 placement
function dismissToast(h, x = Date.now) {
  let D = stackedToasts();
  let filtered = D.filter((ee) => ee.id !== h);
  if (filtered.length !== D.length) {
    drawnToasts.add(h);
    keepToasts(filtered, x);
  }
}
//@ chunk-18hwfzwa.js:182022-182054 placement
var expireToasts = (h) => keepToasts(expiredToasts(stackedToasts(), h()), h);
//@ chunk-18hwfzwa.js:182054-182333 placement
function holdToast(h, x = Date.now) {
  let D = x();
  let L = stackedToasts();
  let mapped = L.map((Re) => {
    if (Re.id !== h.id || (Re.heldAt !== undefined) === h.isHeld) return Re;
    if (h.isHeld)
      return {
        ...Re,
        phase: "shown",
        heldAt: D,
      };
    let { heldAt, ...We } = Re;
    return {
      ...We,
      leavesAt: Re.leavesAt + (D - (heldAt ?? D)),
    };
  });
  if (mapped.some((Re, Be) => Re !== L[Be])) keepToasts(mapped, x);
}
//@ chunk-18hwfzwa.js:182333-182596 placement
function pauseToasts(h, x = Date.now) {
  let D = toastClock();
  let { pausedAt } = D;
  if (h.isPaused === (pausedAt !== undefined)) return;
  let ee = x();
  D.pausedAt = h.isPaused ? ee : undefined;
  let ke = ee - (pausedAt ?? ee);
  keepToasts(
    ke === 0
      ? stackedToasts()
      : stackedToasts().map((Be) => ({
          ...Be,
          leavesAt: Be.leavesAt + ke,
          ...(Be.heldAt !== undefined && {
            heldAt: Be.heldAt + ke,
          }),
        })),
    x,
  );
}
//@ chunk-18hwfzwa.js:182634-182833 placement
function pushToast(h, x = Date.now) {
  let D = x();
  keepToasts(
    [
      ...stackedToasts(),
      {
        id: randomUUID(),
        owner: h.plugin,
        plugin: sourceLabel(h.plugin),
        isManaged: isPolicyTier(h.plugin),
        text: h.text,
        shownAt: D,
        leavesAt: (toastClock().pausedAt ?? D) + h.timeoutMs,
        phase: "shown",
      },
    ],
    x,
  );
}
//@ chunk-18hwfzwa.js:182833-183100 placement
function stackToast(h) {
  let x = new Set(stackedToasts().map((ee) => ee.id));
  pushToast(h);
  let any = stackedToasts().some((ee) => !x.has(ee.id));
  let L = any ? "stacked" : "not stacked, the stack being full";
  if (any)
    tellRefusalOnce("toast stacked", h.plugin, () => logFeatureOk("plugin_function_hooks_toast_stack"));
  logForDebugging(`$.ui.toast: ${L} (${stackedToasts().length} up)`);
}
export { looseStringSchema, drawnToasts, TOAST_FADE_MS, toastStackNamespace, pauseToasts, stackToast };

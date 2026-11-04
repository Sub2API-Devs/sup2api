/**
 * plugins/functionHooks/uiToast.ts
 *
 * 2.1.316 新增：插件 $.ui.toast 提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (34)
 * attribution: placement 34
 */
import { ENGINE } from "./dispatch/chain.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  array,
  stringSchema,
  booleanSchema,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { pluginStateRegistry, stateEntryKey, writeStateValue } from "./api/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isPolicyTier } from "./hookDispatch.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { toldRefusals, tellOnce } from "./ui/renderNotices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:772988-773044 placement
/**
 * 从 key 取提示正文
 */
var pluginToastText = (key) => key?.match(/^plugin-toast-[^:]*:(.*)$/s)?.[1];
//@ chunk-e6aww6q8.js:773044-773234 placement
/**
 * 从通知队列中取出插件提示：当前显示的与等待中的（各自的 key 与时长），以及是否隐藏。
 */
function pluginToastQueueView(notifications, isHidden, defaultMs) {
  let [current, ...queue] = [notifications.current, ...notifications.queue].map((entry) =>
    entry !== null && pluginToastText(entry.key) !== undefined
      ? {
          key: entry.key,
          ms: entry.timeoutMs ?? defaultMs,
        }
      : undefined,
  );
  return {
    current,
    waiting: queue.flatMap((entry) => entry ?? []),
    isHidden,
  };
}
//@ chunk-e6aww6q8.js:773234-773244 placement
/**
 * 50
 */
var UNTOLD_TOAST_MS = 50;
//@ chunk-e6aww6q8.js:773244-773282 placement
/**
 * 状态区提示的存盘键
 */
var BAR_TOASTS_STATE; // deferred: uses ENGINE (./dispatch/chain.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:773244", () => {
  BAR_TOASTS_STATE = {
    plugin: ENGINE,
    key: "bar-toasts",
  };
});
//@ chunk-e6aww6q8.js:773282-773519 placement
var barToastsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:773282", () => {
  barToastsSchema = DoctorLazy(() =>
    objectSchema({
      toasts: array(
        objectSchema({
          key: stringSchema(),
          plugin: stringSchema(),
          text: stringSchema(),
          isManaged: booleanSchema(),
          leftMs: numberSchema(),
          wasShown: booleanSchema(),
          lentMs: numberSchema(),
          untoldMs: numberSchema(),
        }).readonly(),
      ).readonly(),
      at: numberSchema(),
      slot: objectSchema({
        key: stringSchema(),
        endsAt: numberSchema(),
        shown: stringSchema().optional(),
      })
        .readonly()
        .optional(),
    }).readonly(),
  );
});
//@ chunk-e6aww6q8.js:773519-773595 placement
/**
 * 托管提示排前
 */
var managedFirst = (toasts) => [
  ...toasts.filter((toast) => toast.isManaged),
  ...toasts.filter((toast) => !toast.isManaged),
];
//@ chunk-e6aww6q8.js:773595-773753 placement
function chargeToastTime(toast, slot, elapsedMs) {
  let isCharging = toast.key === slot.key;
  let isChargedBySlot = toast.key === (slot.shown ?? slot.key);
  let lentDelta = Number(isCharging && !isChargedBySlot) - Number(isChargedBySlot && !isCharging);
  return {
    ...toast,
    leftMs: toast.leftMs - Number(isChargedBySlot) * elapsedMs,
    lentMs: toast.lentMs + lentDelta * elapsedMs,
  };
}
//@ chunk-e6aww6q8.js:773753-773852 placement
/**
 * 记录提示账本
 */
var withLedger = (toasts, slot, at) => ({
  toasts: toasts.map((toast) => ({
    ...toast,
    wasShown: toast.wasShown || toast.key === slot?.shown,
  })),
  at,
  slot,
});
//@ chunk-e6aww6q8.js:773852-774156 placement
/**
 * 按剩余预算截短提示时间，超出部分记为丢失。
 */
function trimToastsToBudget(toasts, budgetMs) {
  let mapped = toasts.map((toast, index) => {
    let min = Math.min(
      toast.leftMs,
      Math.max(
        0,
        toasts.slice(0, index + 1).reduce((acc, prior) => acc + prior.leftMs, -budgetMs),
      ),
    );
    return {
      ...toast,
      leftMs: toast.leftMs - min,
      untoldMs: toast.untoldMs + min,
    };
  });
  return {
    kept: mapped.map((toast) =>
      toast.untoldMs > UNTOLD_TOAST_MS
        ? {
            ...toast,
            untoldMs: 0,
          }
        : toast,
    ),
    lost: mapped
      .filter((toast) => toast.untoldMs > UNTOLD_TOAST_MS)
      .map((toast) => ({
        ...toast,
        leftMs: toast.untoldMs,
      })),
  };
}
//@ chunk-e6aww6q8.js:774156-774223 placement
var EMPTY_BAR_TOASTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:774156", () => {
  EMPTY_BAR_TOASTS = Object.freeze({
    toasts: Object.freeze([]),
    at: 0,
    slot: undefined,
  });
});
//@ chunk-e6aww6q8.js:774223-774336 placement
/**
 * 读取持久化的通知栏插件提示账本（不合法时为空账本）。
 */
function readBarToasts(state = pluginStateRegistry().values.getState()) {
  let parsed = barToastsSchema().safeParse(state.get(stateEntryKey(BAR_TOASTS_STATE))?.value);
  return parsed.success ? parsed.data : EMPTY_BAR_TOASTS;
}
//@ chunk-e6aww6q8.js:774336-774474 placement
/**
 * 判断某提示是否已显示过（或在可显示时排在首位）。
 */
function wasToastShown(barToasts, givesWay, isCutShort) {
  let toasts = barToasts.toasts.filter((toast) => toast.leftMs > 0);
  let isNextDrawn = managedFirst(toasts).at(0)?.key === givesWay;
  return (
    barToasts.toasts.some((toast) => toast.key === givesWay && toast.wasShown) || (isCutShort && isNextDrawn)
  );
}
//@ chunk-e6aww6q8.js:774474-774664 placement
/**
 * 保存通知栏插件提示账本（新旧都为空时跳过），失败记录错误。
 */
function saveBarToasts(ledger) {
  let all = [readBarToasts(), ledger].every(
    (ledger) => ledger.toasts.length === 0 && ledger.slot === undefined,
  );
  try {
    if (!all) writeStateValue(stateEntryKey(BAR_TOASTS_STATE), ledger);
  } catch (error) {
    logForDebugging(`$.ui.toast: the bar's toasts were not kept: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-e6aww6q8.js:774664-774764 placement
var keepLiveToasts = (previous, kept, knownKeys) =>
  previous.flatMap((toast) =>
    kept
      .filter((entry) => entry.key === toast.key)
      .filter((entry) => entry.leftMs > 0 || knownKeys.has(entry.key)),
  );
//@ chunk-e6aww6q8.js:774764-775166 placement
/**
 * 推进提示计时：扣除已显示的时间，移除已用完的提示。
 */
function advanceToastClock(ledger, view, now) {
  let liveKeys = new Set([view.current, ...view.waiting].map((entry) => entry?.key));
  let slot = ledger.slot;
  let max = Math.max(0, Math.min(now, slot?.endsAt ?? 0) - ledger.at);
  let hasNewCurrent = slot?.key !== view.current?.key;
  return ledger.toasts
    .map((toast) => (slot === undefined ? toast : chargeToastTime(toast, slot, max)))
    .map((toast, index) => {
      let isLive = liveKeys.has(toast.key);
      let chargesFull = isLive && !(hasNewCurrent && toast.leftMs !== ledger.toasts[index]?.leftMs);
      let leftMs = isLive ? toast.leftMs : Math.min(toast.leftMs, toast.lentMs);
      let isSpent = leftMs <= (chargesFull ? 0 : UNTOLD_TOAST_MS);
      return {
        ...toast,
        leftMs: isSpent ? 0 : leftMs,
      };
    })
    .filter((toast) => toast.leftMs > 0 || liveKeys.has(toast.key));
}
//@ chunk-e6aww6q8.js:775166-775259 placement
/**
 * key → 文本
 */
var toastTextMap = (toasts, texts) =>
  new Map(
    toasts.flatMap((toast, index) => {
      let entry = texts[index];
      return entry === undefined ? [] : [[toast.key, entry.text]];
    }),
  );
//@ chunk-e6aww6q8.js:775259-775333 placement
/**
 * 账本条目
 */
function toastLedgerEntry(slot, endsAt, shown) {
  return slot === undefined
    ? undefined
    : {
        key: slot.key,
        endsAt,
        shown,
      };
}
//@ chunk-e6aww6q8.js:775333-775509 placement
function toastForSlots(toasts, durations) {
  let mapped = toasts.map((toast, index) =>
    toasts.slice(0, index + 1).reduce((acc, prior) => acc + prior.leftMs, 0),
  );
  return durations.map((duration, index) => {
    let reduced = durations.slice(0, index).reduce((acc, prior) => acc + prior, 0);
    return toasts[mapped.findIndex((cumulative) => cumulative > reduced)];
  });
}
//@ chunk-e6aww6q8.js:775509-776028 placement
/**
 * 按通知栏剩余时间重排插件提示：推进计时、按管理优先排序、分配显示时间，返回新账本、要显示的文字与丢失时间的提示。
 */
function planBarToasts(ledger, view, now) {
  let { current } = view;
  let endsAt =
    current !== undefined && ledger.slot?.key === current.key
      ? (ledger.slot?.endsAt ?? now)
      : now + (current?.ms ?? 0);
  let advanced = advanceToastClock(ledger, view, now);
  let liveKeys = new Set(advanced.map((toast) => toast.key));
  let flattened = [current, ...view.waiting].flatMap((entry) => entry ?? []);
  let knownKeys = new Set(flattened.map((entry) => entry.key));
  let toasts = flattened.filter((entry) => liveKeys.has(entry.key));
  let durations = toasts.map((entry) => (entry === current ? Math.max(0, endsAt - now) : entry.ms));
  let trimmed = trimToastsToBudget(
    managedFirst(advanced),
    durations.reduce((acc, duration) => acc + duration, 0),
  );
  let slotTexts = toastForSlots(
    trimmed.kept.filter((toast) => toast.leftMs > 0),
    durations,
  );
  let isSlotHidden = current === undefined || view.isHidden || !liveKeys.has(current.key);
  return {
    ledger: withLedger(
      keepLiveToasts(advanced, trimmed.kept, knownKeys),
      toastLedgerEntry(current, endsAt, isSlotHidden ? undefined : slotTexts[0]?.key),
      now,
    ),
    texts: toastTextMap(toasts, slotTexts),
    lost: trimmed.lost,
  };
}
//@ chunk-e6aww6q8.js:776028-776197 placement
/**
 * 把插件提示加入通知栏账本（托管层插件优先）。
 */
function enqueueBarToast(notice) {
  let barToasts = readBarToasts();
  saveBarToasts({
    ...barToasts,
    toasts: [
      ...barToasts.toasts,
      {
        key: notice.key,
        plugin: notice.plugin,
        text: notice.text,
        isManaged: isPolicyTier(notice.plugin),
        leftMs: notice.ms,
        wasShown: false,
        lentMs: 0,
        untoldMs: 0,
      },
    ],
  });
}
//@ chunk-e6aww6q8.js:776197-776348 placement
/**
 * 合并两个提示账本：保留旧账本中新账本没有的提示。
 */
function mergeToastLedgers(ledger, barToasts) {
  let barKeys = new Set(barToasts.toasts.map((toast) => toast.key));
  let filtered = ledger.toasts.filter((toast) => !barKeys.has(toast.key));
  return filtered.length === 0
    ? barToasts
    : {
        ...ledger,
        toasts: [...filtered, ...barToasts.toasts],
      };
}
//@ chunk-e6aww6q8.js:776348-776486 placement
/**
 * 当前显示提示的结束时间（早于槽位结束时）。
 */
function shownToastEndsAt(ledger) {
  let found = ledger.toasts.find((toast) => toast.key === ledger.slot?.shown);
  return found !== undefined && ledger.at + found.leftMs < (ledger.slot?.endsAt ?? 0)
    ? ledger.at + found.leftMs
    : undefined;
}
//@ chunk-e6aww6q8.js:776486-776626 placement
/**
 * 记录插件提示因通知栏无剩余时间而丢失的时长。
 */
var logToastTimeLost = (lost) =>
  logForDebugging(
    `$.ui.toast (${lost.plugin}): ${lost.key} lost ${lost.leftMs} ms of its time, the notification bar having no toast time left for it`,
  );
//@ chunk-e6aww6q8.js:776626-776721 placement
/**
 * 覆盖提示文本
 */
function applyToastText(toast, texts) {
  let text = texts.get(toast.key);
  return text !== undefined && "text" in toast && toast.text !== text
    ? {
        ...toast,
        text,
      }
    : toast;
}
//@ chunk-e6aww6q8.js:776721-776878 placement
/**
 * 重写通知队列中插件提示的 key（未变时返回原队列）。
 */
function rekeyToastQueue(notifications, texts) {
  let { current, queue } = notifications;
  let nextCurrent = current === null ? null : applyToastText(current, texts);
  let mapped = queue.map((entry) => applyToastText(entry, texts));
  return nextCurrent === current && mapped.every((entry, index) => entry === queue[index])
    ? notifications
    : {
        ...notifications,
        current: nextCurrent,
        queue: mapped,
      };
}
//@ chunk-e6aww6q8.js:776878-776889 placement
/**
 * 提示队列最多排 50 条，再多就让最早的一条让位。
 */
var MAX_QUEUED_TOASTS = 50;
//@ chunk-e6aww6q8.js:776889-776979 placement
/**
 * 让位给哪个提示
 */
function toastGivesWayKey(queue, pluginName) {
  let filtered = queue.filter((entry) => pluginToastText(entry.key) === pluginName);
  return filtered.length < MAX_QUEUED_TOASTS ? undefined : filtered[0]?.key;
}
//@ chunk-e6aww6q8.js:776979-777078 placement
/**
 * plugin#环境
 */
var pluginToastScopeKey = (pluginName) =>
  [
    pluginName,
    ...getPluginRegistry()
      .loadedModules.filter((loadedModule) => loadedModule.name === pluginName)
      .map((loadedModule) => loadedModule.environmentId),
  ].join("#");
//@ chunk-e6aww6q8.js:777078-777153 placement
/**
 * 每次只提示一次让位
 */
function tellRefusalOnce(reason, plugin, tell) {
  let joined = [reason, pluginToastScopeKey(plugin)].join(" ");
  if (!toldRefusals.has(joined)) {
    toldRefusals.add(joined);
    tell();
  }
}
//@ chunk-e6aww6q8.js:777153-777173 placement
var IMMEDIATE = "immediate";
//@ chunk-e6aww6q8.js:777173-777186 placement
/**
 * 提示默认显示 4000 毫秒，调用方可用 timeoutMs 覆盖。
 */
var TOAST_DEFAULT_MS = 4000;
//@ chunk-e6aww6q8.js:777186-777470 placement
/**
 * 记录插件提示让位（被截断或未显示），未显示时提示一次插件作者。
 */
function logToastGaveWay({ key, plugin, isCutShort }) {
  if (key === undefined) return;
  logForDebugging(`$.ui.toast (${plugin}): ${key} gave way, ` + (isCutShort ? "cut short" : "unseen"));
  if (!isCutShort)
    tellOnce({
      key: ["toast gave way", pluginToastScopeKey(plugin)].join(" "),
      lead: plugin,
      text: "$.ui.toast: a toast that waits to be shown gives way to the plugin's newer ones, unseen",
    });
}
//@ chunk-e6aww6q8.js:777470-777510 placement
/**
 * 提示的键 plugin-toast-<plugin>:<text>，按插件与正文区分同文提示。
 */
var toastKeyFor = (id, pluginName) => `plugin-toast-${pluginName}:${id}`;
//@ chunk-e6aww6q8.js:777510-777796 placement
/**
 * 判断插件新提示的排队情况：是否需等待、让位给哪个提示、当前显示的是否被截断。
 */
function toastQueueState(view, pluginName) {
  if (view.isHeld)
    return {
      isWaiting: false,
      givesWay: toastGivesWayKey(view.queue, pluginName),
      isCutShort: false,
    };
  let currentPlugin = pluginToastText(view.current?.key);
  let isCurrentOurs = currentPlugin === pluginName;
  let hasOthers =
    (currentPlugin !== undefined && !isCurrentOurs) ||
    view.queue.some((entry) => pluginToastText(entry.key) !== undefined);
  let isShownShort = !hasOthers && isCurrentOurs;
  let giver = isShownShort
    ? view.current
    : view.queue.findLast((entry) => pluginToastText(entry.key) === pluginName);
  return {
    isWaiting: hasOthers,
    givesWay: giver?.key,
    isCutShort: isShownShort,
  };
}
export {
  MAX_QUEUED_TOASTS,
  pluginToastScopeKey,
  tellRefusalOnce,
  pluginToastQueueView,
  TOAST_DEFAULT_MS,
  planBarToasts,
  mergeToastLedgers,
  readBarToasts,
  saveBarToasts,
  logToastTimeLost,
  rekeyToastQueue,
  shownToastEndsAt,
  EMPTY_BAR_TOASTS,
  toastQueueState,
  toastKeyFor,
  logToastGaveWay,
  wasToastShown,
  IMMEDIATE,
  enqueueBarToast,
};

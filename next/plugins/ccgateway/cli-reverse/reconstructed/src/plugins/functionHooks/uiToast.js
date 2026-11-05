/**
 * plugins/functionHooks/uiToast.ts
 *
 * 2.1.316 新增：插件 $.ui.toast 提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (34)
 * attribution: placement 34
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { stateSession, entryKeyOf, landValue } from "./api/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isPolicyTier } from "./hookDispatch.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { toldRefusals, tellOnce } from "./ui/renderNotices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:784086-784142 placement
/**
 * 从 key 取提示正文
 */
var pluginToastText = (key) => key?.match(/^plugin-toast-[^:]*:(.*)$/s)?.[1];
//@ chunk-5xgkngpb.js:784142-784332 placement
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
//@ chunk-5xgkngpb.js:784332-784342 placement
/**
 * 50
 */
var UNTOLD_TOAST_MS = 50;
//@ chunk-5xgkngpb.js:784342-784380 placement
/**
 * 状态区提示的存盘键
 */
var BAR_TOASTS_STATE; // deferred: uses ENGINE (./dispatch/chain.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:784342", () => {
  BAR_TOASTS_STATE = {
    plugin: ENGINE,
    key: "bar-toasts",
  };
});
//@ chunk-5xgkngpb.js:784380-784617 placement
var barToastsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:784380", () => {
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
//@ chunk-5xgkngpb.js:784617-784693 placement
/**
 * 托管提示排前
 */
var managedFirst = (toasts) => [
  ...toasts.filter((toast) => toast.isManaged),
  ...toasts.filter((toast) => !toast.isManaged),
];
//@ chunk-5xgkngpb.js:784693-784851 placement
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
//@ chunk-5xgkngpb.js:784851-784950 placement
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
//@ chunk-5xgkngpb.js:784950-785254 placement
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
//@ chunk-5xgkngpb.js:785254-785321 placement
var EMPTY_BAR_TOASTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:785254", () => {
  EMPTY_BAR_TOASTS = Object.freeze({
    toasts: Object.freeze([]),
    at: 0,
    slot: undefined,
  });
});
//@ chunk-5xgkngpb.js:785321-785434 placement
/**
 * 读取持久化的通知栏插件提示账本（不合法时为空账本）。
 */
function readBarToasts(state = stateSession().values.getState()) {
  let parsed = barToastsSchema().safeParse(state.get(entryKeyOf(BAR_TOASTS_STATE))?.value);
  return parsed.success ? parsed.data : EMPTY_BAR_TOASTS;
}
//@ chunk-5xgkngpb.js:785434-785572 placement
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
//@ chunk-5xgkngpb.js:785572-785762 placement
/**
 * 保存通知栏插件提示账本（新旧都为空时跳过），失败记录错误。
 */
function saveBarToasts(ledger) {
  let all = [readBarToasts(), ledger].every(
    (ledger) => ledger.toasts.length === 0 && ledger.slot === undefined,
  );
  try {
    if (!all) landValue(entryKeyOf(BAR_TOASTS_STATE), ledger);
  } catch (error) {
    logForDebugging(`$.ui.toast: the bar's toasts were not kept: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-5xgkngpb.js:785762-785862 placement
var keepLiveToasts = (previous, kept, knownKeys) =>
  previous.flatMap((toast) =>
    kept
      .filter((entry) => entry.key === toast.key)
      .filter((entry) => entry.leftMs > 0 || knownKeys.has(entry.key)),
  );
//@ chunk-5xgkngpb.js:785862-786267 placement
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
//@ chunk-5xgkngpb.js:786267-786360 placement
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
//@ chunk-5xgkngpb.js:786360-786434 placement
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
//@ chunk-5xgkngpb.js:786434-786610 placement
function toastForSlots(toasts, durations) {
  let mapped = toasts.map((toast, index) =>
    toasts.slice(0, index + 1).reduce((acc, prior) => acc + prior.leftMs, 0),
  );
  return durations.map((duration, index) => {
    let reduced = durations.slice(0, index).reduce((acc, prior) => acc + prior, 0);
    return toasts[mapped.findIndex((cumulative) => cumulative > reduced)];
  });
}
//@ chunk-5xgkngpb.js:786610-787132 placement
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
//@ chunk-5xgkngpb.js:787132-787301 placement
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
//@ chunk-5xgkngpb.js:787301-787452 placement
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
//@ chunk-5xgkngpb.js:787452-787590 placement
/**
 * 当前显示提示的结束时间（早于槽位结束时）。
 */
function shownToastEndsAt(ledger) {
  let found = ledger.toasts.find((toast) => toast.key === ledger.slot?.shown);
  return found !== undefined && ledger.at + found.leftMs < (ledger.slot?.endsAt ?? 0)
    ? ledger.at + found.leftMs
    : undefined;
}
//@ chunk-5xgkngpb.js:787590-787730 placement
/**
 * 记录插件提示因通知栏无剩余时间而丢失的时长。
 */
var logToastTimeLost = (lost) =>
  logForDebugging(
    `$.ui.toast (${lost.plugin}): ${lost.key} lost ${lost.leftMs} ms of its time, the notification bar having no toast time left for it`,
  );
//@ chunk-5xgkngpb.js:787730-787825 placement
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
//@ chunk-5xgkngpb.js:787825-787982 placement
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
//@ chunk-5xgkngpb.js:787982-787993 placement
/**
 * 提示队列最多排 50 条，再多就让最早的一条让位。
 */
var MAX_QUEUED_TOASTS = 50;
//@ chunk-5xgkngpb.js:787993-788083 placement
/**
 * 让位给哪个提示
 */
function toastGivesWayKey(queue, pluginName) {
  let filtered = queue.filter((entry) => pluginToastText(entry.key) === pluginName);
  return filtered.length < MAX_QUEUED_TOASTS ? undefined : filtered[0]?.key;
}
//@ chunk-5xgkngpb.js:788083-788182 placement
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
//@ chunk-5xgkngpb.js:788182-788257 placement
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
//@ chunk-5xgkngpb.js:788257-788277 placement
var IMMEDIATE = "immediate";
//@ chunk-5xgkngpb.js:788277-788290 placement
/**
 * 提示默认显示 4000 毫秒，调用方可用 timeoutMs 覆盖。
 */
var TOAST_DEFAULT_MS = 4000;
//@ chunk-5xgkngpb.js:788290-788574 placement
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
//@ chunk-5xgkngpb.js:788574-788614 placement
/**
 * 提示的键 plugin-toast-<plugin>:<text>，按插件与正文区分同文提示。
 */
var toastKeyFor = (id, pluginName) => `plugin-toast-${pluginName}:${id}`;
//@ chunk-5xgkngpb.js:788614-788900 placement
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
  TOAST_DEFAULT_MS,
  pluginToastScopeKey,
  pluginToastQueueView,
  planBarToasts,
  mergeToastLedgers,
  readBarToasts,
  saveBarToasts,
  logToastTimeLost,
  rekeyToastQueue,
  shownToastEndsAt,
  EMPTY_BAR_TOASTS,
  MAX_QUEUED_TOASTS,
  tellRefusalOnce,
  toastQueueState,
  toastKeyFor,
  logToastGaveWay,
  wasToastShown,
  IMMEDIATE,
  enqueueBarToast,
};

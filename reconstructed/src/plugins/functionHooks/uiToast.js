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
import { u, array, string, M, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { pluginStateRegistry, stateEntryKey, writeStateValue } from "./api/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isPolicyTier } from "./hookDispatch.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { toldRefusals, tellOnce } from "./ui/renderNotices.js";

//@ chunk-e6aww6q8.js:772988-773044 placement
/**
 * 从 key 取提示正文
 */
var pluginToastText = (key) => key?.match(/^plugin-toast-[^:]*:(.*)$/s)?.[1];
//@ chunk-e6aww6q8.js:773044-773234 placement
/**
 * 从通知队列中取出插件提示：当前显示的与等待中的（各自的 key 与时长），以及是否隐藏。
 */
function pluginToastQueueView(notifications, isHidden, r) {
  let [s, ...h] = [notifications.current, ...notifications.queue].map((y) =>
    y !== null && pluginToastText(y.key) !== undefined
      ? {
          key: y.key,
          ms: y.timeoutMs ?? r,
        }
      : undefined,
  );
  return {
    current: s,
    waiting: h.flatMap((y) => y ?? []),
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
var BAR_TOASTS_STATE = {
  plugin: ENGINE,
  key: "bar-toasts",
};
//@ chunk-e6aww6q8.js:773282-773519 placement
var barToastsSchema = DoctorLazy(() =>
  u({
    toasts: array(
      u({
        key: string(),
        plugin: string(),
        text: string(),
        isManaged: M(),
        leftMs: E(),
        wasShown: M(),
        lentMs: E(),
        untoldMs: E(),
      }).readonly(),
    ).readonly(),
    at: E(),
    slot: u({
      key: string(),
      endsAt: E(),
      shown: string().optional(),
    })
      .readonly()
      .optional(),
  }).readonly(),
);
//@ chunk-e6aww6q8.js:773519-773595 placement
/**
 * 托管提示排前
 */
var managedFirst = (e) => [...e.filter((n) => n.isManaged), ...e.filter((n) => !n.isManaged)];
//@ chunk-e6aww6q8.js:773595-773753 placement
function chargeToastTime(toast, slot, r) {
  let s = toast.key === slot.key;
  let h = toast.key === (slot.shown ?? slot.key);
  let y = Number(s && !h) - Number(h && !s);
  return {
    ...toast,
    leftMs: toast.leftMs - Number(h) * r,
    lentMs: toast.lentMs + y * r,
  };
}
//@ chunk-e6aww6q8.js:773753-773852 placement
/**
 * 记录提示账本
 */
var withLedger = (e, n, at) => ({
  toasts: e.map((s) => ({
    ...s,
    wasShown: s.wasShown || s.key === n?.shown,
  })),
  at,
  slot: n,
});
//@ chunk-e6aww6q8.js:773852-774156 placement
/**
 * 按剩余预算截短提示时间，超出部分记为丢失。
 */
function trimToastsToBudget(e, n) {
  let mapped = e.map((s, h) => {
    let min = Math.min(
      s.leftMs,
      Math.max(
        0,
        e.slice(0, h + 1).reduce((acc, w) => acc + w.leftMs, -n),
      ),
    );
    return {
      ...s,
      leftMs: s.leftMs - min,
      untoldMs: s.untoldMs + min,
    };
  });
  return {
    kept: mapped.map((s) =>
      s.untoldMs > UNTOLD_TOAST_MS
        ? {
            ...s,
            untoldMs: 0,
          }
        : s,
    ),
    lost: mapped
      .filter((s) => s.untoldMs > UNTOLD_TOAST_MS)
      .map((s) => ({
        ...s,
        leftMs: s.untoldMs,
      })),
  };
}
//@ chunk-e6aww6q8.js:774156-774223 placement
var J$o = Object.freeze({
  toasts: Object.freeze([]),
  at: 0,
  slot: undefined,
});
//@ chunk-e6aww6q8.js:774223-774336 placement
/**
 * 读取持久化的通知栏插件提示账本（不合法时为空账本）。
 */
function readBarToasts(e = pluginStateRegistry().values.getState()) {
  let n = barToastsSchema().safeParse(e.get(stateEntryKey(BAR_TOASTS_STATE))?.value);
  return n.success ? n.data : J$o;
}
//@ chunk-e6aww6q8.js:774336-774474 placement
/**
 * 判断某提示是否已显示过（或在可显示时排在首位）。
 */
function wasToastShown(barToasts, givesWay, isCutShort) {
  let filtered = barToasts.toasts.filter((toast) => toast.leftMs > 0);
  let h = managedFirst(filtered).at(0)?.key === givesWay;
  return barToasts.toasts.some((toast) => toast.key === givesWay && toast.wasShown) || (isCutShort && h);
}
//@ chunk-e6aww6q8.js:774474-774664 placement
/**
 * 保存通知栏插件提示账本（新旧都为空时跳过），失败记录错误。
 */
function saveBarToasts(ledger) {
  let all = [readBarToasts(), ledger].every((r) => r.toasts.length === 0 && r.slot === undefined);
  try {
    if (!all) writeStateValue(stateEntryKey(BAR_TOASTS_STATE), ledger);
  } catch (error) {
    logForDebugging(`$.ui.toast: the bar's toasts were not kept: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-e6aww6q8.js:774664-774764 placement
var keepLiveToasts = (e, kept, r) =>
  e.flatMap((s) => kept.filter((h) => h.key === s.key).filter((h) => h.leftMs > 0 || r.has(h.key)));
//@ chunk-e6aww6q8.js:774764-775166 placement
/**
 * 推进提示计时：扣除已显示的时间，移除已用完的提示。
 */
function advanceToastClock(e, n, r) {
  let s = new Set([n.current, ...n.waiting].map((w) => w?.key));
  let slot = e.slot;
  let max = Math.max(0, Math.min(r, slot?.endsAt ?? 0) - e.at);
  let S = slot?.key !== n.current?.key;
  return e.toasts
    .map((toast) => (slot === undefined ? toast : chargeToastTime(toast, slot, max)))
    .map((w, L) => {
      let G = s.has(w.key);
      let q = G && !(S && w.leftMs !== e.toasts[L]?.leftMs);
      let Z = G ? w.leftMs : Math.min(w.leftMs, w.lentMs);
      let Se = Z <= (q ? 0 : UNTOLD_TOAST_MS);
      return {
        ...w,
        leftMs: Se ? 0 : Z,
      };
    })
    .filter((w) => w.leftMs > 0 || s.has(w.key));
}
//@ chunk-e6aww6q8.js:775166-775259 placement
/**
 * key → 文本
 */
var toastTextMap = (e, n) =>
  new Map(
    e.flatMap((r, s) => {
      let h = n[s];
      return h === undefined ? [] : [[r.key, h.text]];
    }),
  );
//@ chunk-e6aww6q8.js:775259-775333 placement
/**
 * 账本条目
 */
function toastLedgerEntry(e, endsAt, shown) {
  return e === undefined
    ? undefined
    : {
        key: e.key,
        endsAt,
        shown,
      };
}
//@ chunk-e6aww6q8.js:775333-775509 placement
function toastForSlots(e, n) {
  let mapped = e.map((s, h) => e.slice(0, h + 1).reduce((acc, S) => acc + S.leftMs, 0));
  return n.map((s, h) => {
    let reduced = n.slice(0, h).reduce((acc, w) => acc + w, 0);
    return e[mapped.findIndex((S) => S > reduced)];
  });
}
//@ chunk-e6aww6q8.js:775509-776028 placement
/**
 * 按通知栏剩余时间重排插件提示：推进计时、按管理优先排序、分配显示时间，返回新账本、要显示的文字与丢失时间的提示。
 */
function planBarToasts(e, n, r) {
  let { current: s } = n;
  let endsAt = s !== undefined && e.slot?.key === s.key ? (e.slot?.endsAt ?? r) : r + (s?.ms ?? 0);
  let S = advanceToastClock(e, n, r);
  let w = new Set(S.map((Ee) => Ee.key));
  let flattened = [s, ...n.waiting].flatMap((Ee) => Ee ?? []);
  let G = new Set(flattened.map((Ee) => Ee.key));
  let filtered = flattened.filter((Ee) => w.has(Ee.key));
  let mapped = filtered.map((Ee) => (Ee === s ? Math.max(0, endsAt - r) : Ee.ms));
  let Se = trimToastsToBudget(
    managedFirst(S),
    mapped.reduce((acc, Ae) => acc + Ae, 0),
  );
  let ke = toastForSlots(
    Se.kept.filter((Ee) => Ee.leftMs > 0),
    mapped,
  );
  let we = s === undefined || n.isHidden || !w.has(s.key);
  return {
    ledger: withLedger(
      keepLiveToasts(S, Se.kept, G),
      toastLedgerEntry(s, endsAt, we ? undefined : ke[0]?.key),
      r,
    ),
    texts: toastTextMap(filtered, ke),
    lost: Se.lost,
  };
}
//@ chunk-e6aww6q8.js:776028-776197 placement
/**
 * 把插件提示加入通知栏账本（托管层插件优先）。
 */
function enqueueBarToast(e) {
  let barToasts = readBarToasts();
  saveBarToasts({
    ...barToasts,
    toasts: [
      ...barToasts.toasts,
      {
        key: e.key,
        plugin: e.plugin,
        text: e.text,
        isManaged: isPolicyTier(e.plugin),
        leftMs: e.ms,
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
function mergeToastLedgers(e, barToasts) {
  let r = new Set(barToasts.toasts.map((toast) => toast.key));
  let filtered = e.toasts.filter((toast) => !r.has(toast.key));
  return filtered.length === 0
    ? barToasts
    : {
        ...e,
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
var logToastTimeLost = (e) =>
  logForDebugging(
    `$.ui.toast (${e.plugin}): ${e.key} lost ${e.leftMs} ms of its time, the notification bar having no toast time left for it`,
  );
//@ chunk-e6aww6q8.js:776626-776721 placement
/**
 * 覆盖提示文本
 */
function applyToastText(e, n) {
  let r = n.get(e.key);
  return r !== undefined && "text" in e && e.text !== r
    ? {
        ...e,
        text: r,
      }
    : e;
}
//@ chunk-e6aww6q8.js:776721-776878 placement
/**
 * 重写通知队列中插件提示的 key（未变时返回原队列）。
 */
function rekeyToastQueue(notifications, texts) {
  let { current: r, queue } = notifications;
  let h = r === null ? null : applyToastText(r, texts);
  let mapped = queue.map((w) => applyToastText(w, texts));
  return h === r && mapped.every((w, L) => w === queue[L])
    ? notifications
    : {
        ...notifications,
        current: h,
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
function toastGivesWayKey(queue, n) {
  let filtered = queue.filter((s) => pluginToastText(s.key) === n);
  return filtered.length < MAX_QUEUED_TOASTS ? undefined : filtered[0]?.key;
}
//@ chunk-e6aww6q8.js:776979-777078 placement
/**
 * plugin#环境
 */
var pluginToastScopeKey = (e) =>
  [
    e,
    ...getPluginRegistry()
      .loadedModules.filter((loadedModule) => loadedModule.name === e)
      .map((loadedModule) => loadedModule.environmentId),
  ].join("#");
//@ chunk-e6aww6q8.js:777078-777153 placement
/**
 * 每次只提示一次让位
 */
function tellRefusalOnce(e, plugin, r) {
  let joined = [e, pluginToastScopeKey(plugin)].join(" ");
  if (!toldRefusals.has(joined)) {
    toldRefusals.add(joined);
    r();
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
var toastKeyFor = (e, n) => `plugin-toast-${n}:${e}`;
//@ chunk-e6aww6q8.js:777510-777796 placement
/**
 * 判断插件新提示的排队情况：是否需等待、让位给哪个提示、当前显示的是否被截断。
 */
function toastQueueState(e, n) {
  if (e.isHeld)
    return {
      isWaiting: false,
      givesWay: toastGivesWayKey(e.queue, n),
      isCutShort: false,
    };
  let r = pluginToastText(e.current?.key);
  let s = r === n;
  let h = (r !== undefined && !s) || e.queue.some((w) => pluginToastText(w.key) !== undefined);
  let y = !h && s;
  let S = y ? e.current : e.queue.findLast((w) => pluginToastText(w.key) === n);
  return {
    isWaiting: h,
    givesWay: S?.key,
    isCutShort: y,
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
  J$o,
  toastQueueState,
  toastKeyFor,
  logToastGaveWay,
  wasToastShown,
  IMMEDIATE,
  enqueueBarToast,
};

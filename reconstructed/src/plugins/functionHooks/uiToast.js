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
import { u, A, o, M, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { zS, nxe, writeStateValue } from "./api/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isPolicyTier } from "./hookDispatch.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { toldRefusals, tellOnce } from "./ui/renderNotices.js";

//@ chunk-e6aww6q8.js:772988-773044 placement
var LD = (e) => e?.match(/^plugin-toast-[^:]*:(.*)$/s)?.[1];
/**
 * 从通知队列中取出插件提示：当前显示的与等待中的（各自的 key 与时长），以及是否隐藏。
 */
//@ chunk-e6aww6q8.js:773044-773234 placement
function pluginToastQueueView(e, n, r) {
  let [s, ...h] = [e.current, ...e.queue].map((y) =>
    y !== null && LD(y.key) !== void 0 ? { key: y.key, ms: y.timeoutMs ?? r } : void 0,
  );
  return { current: s, waiting: h.flatMap((y) => y ?? []), isHidden: n };
}
//@ chunk-e6aww6q8.js:773234-773244 placement
var C7 = 50;
//@ chunk-e6aww6q8.js:773244-773282 placement
var Jme = { plugin: ENGINE, key: "bar-toasts" };
//@ chunk-e6aww6q8.js:773282-773519 placement
var barToastsSchema = DoctorLazy(() =>
  u({
    toasts: A(
      u({
        key: o(),
        plugin: o(),
        text: o(),
        isManaged: M(),
        leftMs: E(),
        wasShown: M(),
        lentMs: E(),
        untoldMs: E(),
      }).readonly(),
    ).readonly(),
    at: E(),
    slot: u({ key: o(), endsAt: E(), shown: o().optional() }).readonly().optional(),
  }).readonly(),
);
//@ chunk-e6aww6q8.js:773519-773595 placement
var ege = (e) => [...e.filter((n) => n.isManaged), ...e.filter((n) => !n.isManaged)];
//@ chunk-e6aww6q8.js:773595-773753 placement
function chargeToastTime(e, n, r) {
  let s = e.key === n.key,
    h = e.key === (n.shown ?? n.key),
    y = Number(s && !h) - Number(h && !s);
  return { ...e, leftMs: e.leftMs - Number(h) * r, lentMs: e.lentMs + y * r };
}
//@ chunk-e6aww6q8.js:773753-773852 placement
var n0t = (e, n, r) => ({
  toasts: e.map((s) => ({ ...s, wasShown: s.wasShown || s.key === n?.shown })),
  at: r,
  slot: n,
});
/**
 * 按剩余预算截短提示时间，超出部分记为丢失。
 */
//@ chunk-e6aww6q8.js:773852-774156 placement
function trimToastsToBudget(e, n) {
  let mapped = e.map((s, h) => {
    let min = Math.min(
      s.leftMs,
      Math.max(
        0,
        e.slice(0, h + 1).reduce((S, w) => S + w.leftMs, -n),
      ),
    );
    return { ...s, leftMs: s.leftMs - min, untoldMs: s.untoldMs + min };
  });
  return {
    kept: mapped.map((s) => (s.untoldMs > C7 ? { ...s, untoldMs: 0 } : s)),
    lost: mapped.filter((s) => s.untoldMs > C7).map((s) => ({ ...s, leftMs: s.untoldMs })),
  };
}
//@ chunk-e6aww6q8.js:774156-774223 placement
var freeze_4 = Object.freeze({ toasts: Object.freeze([]), at: 0, slot: void 0 });
/**
 * 读取持久化的通知栏插件提示账本（不合法时为空账本）。
 */
//@ chunk-e6aww6q8.js:774223-774336 placement
function readBarToasts(e = zS().values.getState()) {
  let safeParse = barToastsSchema().safeParse(e.get(nxe(Jme))?.value);
  return safeParse.success ? safeParse.data : freeze_4;
}
/**
 * 判断某提示是否已显示过（或在可显示时排在首位）。
 */
//@ chunk-e6aww6q8.js:774336-774474 placement
function wasToastShown(e, n, r) {
  let filtered = e.toasts.filter((toast) => toast.leftMs > 0),
    h = ege(filtered).at(0)?.key === n;
  return e.toasts.some((toast) => toast.key === n && toast.wasShown) || (r && h);
}
/**
 * 保存通知栏插件提示账本（新旧都为空时跳过），失败记录错误。
 */
//@ chunk-e6aww6q8.js:774474-774664 placement
function saveBarToasts(e) {
  let all = [readBarToasts(), e].every((r) => r.toasts.length === 0 && r.slot === void 0);
  try {
    if (!all) writeStateValue(nxe(Jme), e);
  } catch (error) {
    logForDebugging(`$.ui.toast: the bar's toasts were not kept: ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-e6aww6q8.js:774664-774764 placement
var keepLiveToasts = (e, n, r) =>
  e.flatMap((s) => n.filter((h) => h.key === s.key).filter((h) => h.leftMs > 0 || r.has(h.key)));
/**
 * 推进提示计时：扣除已显示的时间，移除已用完的提示。
 */
//@ chunk-e6aww6q8.js:774764-775166 placement
function advanceToastClock(e, n, r) {
  let s = new Set([n.current, ...n.waiting].map((w) => w?.key)),
    slot = e.slot,
    max = Math.max(0, Math.min(r, slot?.endsAt ?? 0) - e.at),
    S = slot?.key !== n.current?.key;
  return e.toasts
    .map((toast) => (slot === void 0 ? toast : chargeToastTime(toast, slot, max)))
    .map((w, L) => {
      let G = s.has(w.key),
        q = G && !(S && w.leftMs !== e.toasts[L]?.leftMs),
        Z = G ? w.leftMs : Math.min(w.leftMs, w.lentMs),
        Se = Z <= (q ? 0 : C7);
      return { ...w, leftMs: Se ? 0 : Z };
    })
    .filter((w) => w.leftMs > 0 || s.has(w.key));
}
//@ chunk-e6aww6q8.js:775166-775259 placement
var a0t = (e, n) =>
  new Map(
    e.flatMap((r, s) => {
      let h = n[s];
      return h === void 0 ? [] : [[r.key, h.text]];
    }),
  );
//@ chunk-e6aww6q8.js:775259-775333 placement
function l0t(e, n, r) {
  return e === void 0 ? void 0 : { key: e.key, endsAt: n, shown: r };
}
//@ chunk-e6aww6q8.js:775333-775509 placement
function toastForSlots(e, n) {
  let mapped = e.map((s, h) => e.slice(0, h + 1).reduce((y, S) => y + S.leftMs, 0));
  return n.map((s, h) => {
    let reduced = n.slice(0, h).reduce((S, w) => S + w, 0);
    return e[mapped.findIndex((S) => S > reduced)];
  });
}
/**
 * 按通知栏剩余时间重排插件提示：推进计时、按管理优先排序、分配显示时间，返回新账本、要显示的文字与丢失时间的提示。
 */
//@ chunk-e6aww6q8.js:775509-776028 placement
function planBarToasts(e, n, r) {
  let { current: s } = n,
    y = s !== void 0 && e.slot?.key === s.key ? (e.slot?.endsAt ?? r) : r + (s?.ms ?? 0),
    S = advanceToastClock(e, n, r),
    w = new Set(S.map((Ee) => Ee.key)),
    flattened = [s, ...n.waiting].flatMap((Ee) => Ee ?? []),
    G = new Set(flattened.map((Ee) => Ee.key)),
    filtered = flattened.filter((Ee) => w.has(Ee.key)),
    mapped = filtered.map((Ee) => (Ee === s ? Math.max(0, y - r) : Ee.ms)),
    Se = trimToastsToBudget(
      ege(S),
      mapped.reduce((Ee, Ae) => Ee + Ae, 0),
    ),
    ke = toastForSlots(
      Se.kept.filter((Ee) => Ee.leftMs > 0),
      mapped,
    ),
    we = s === void 0 || n.isHidden || !w.has(s.key);
  return {
    ledger: n0t(keepLiveToasts(S, Se.kept, G), l0t(s, y, we ? void 0 : ke[0]?.key), r),
    texts: a0t(filtered, ke),
    lost: Se.lost,
  };
}
/**
 * 把插件提示加入通知栏账本（托管层插件优先）。
 */
//@ chunk-e6aww6q8.js:776028-776197 placement
function enqueueBarToast(e) {
  let n = readBarToasts();
  saveBarToasts({
    ...n,
    toasts: [
      ...n.toasts,
      {
        key: e.key,
        plugin: e.plugin,
        text: e.text,
        isManaged: isPolicyTier(e.plugin),
        leftMs: e.ms,
        wasShown: !1,
        lentMs: 0,
        untoldMs: 0,
      },
    ],
  });
}
/**
 * 合并两个提示账本：保留旧账本中新账本没有的提示。
 */
//@ chunk-e6aww6q8.js:776197-776348 placement
function mergeToastLedgers(e, n) {
  let r = new Set(n.toasts.map((toast) => toast.key)),
    filtered = e.toasts.filter((toast) => !r.has(toast.key));
  return filtered.length === 0 ? n : { ...e, toasts: [...filtered, ...n.toasts] };
}
/**
 * 当前显示提示的结束时间（早于槽位结束时）。
 */
//@ chunk-e6aww6q8.js:776348-776486 placement
function shownToastEndsAt(e) {
  let found = e.toasts.find((toast) => toast.key === e.slot?.shown);
  return found !== void 0 && e.at + found.leftMs < (e.slot?.endsAt ?? 0) ? e.at + found.leftMs : void 0;
}
/**
 * 记录插件提示因通知栏无剩余时间而丢失的时长。
 */
//@ chunk-e6aww6q8.js:776486-776626 placement
var logToastTimeLost = (e) =>
  logForDebugging(
    `$.ui.toast (${e.plugin}): ${e.key} lost ${e.leftMs} ms of its time, the notification bar having no toast time left for it`,
  );
//@ chunk-e6aww6q8.js:776626-776721 placement
function bWe(e, n) {
  let r = n.get(e.key);
  return r !== void 0 && "text" in e && e.text !== r ? { ...e, text: r } : e;
}
/**
 * 重写通知队列中插件提示的 key（未变时返回原队列）。
 */
//@ chunk-e6aww6q8.js:776721-776878 placement
function rekeyToastQueue(e, n) {
  let { current: r, queue: queue } = e,
    h = r === null ? null : bWe(r, n),
    mapped = queue.map((w) => bWe(w, n));
  return h === r && mapped.every((w, L) => w === queue[L]) ? e : { ...e, current: h, queue: mapped };
}
//@ chunk-e6aww6q8.js:776878-776889 placement
var O3n = 50;
//@ chunk-e6aww6q8.js:776889-776979 placement
function u0t(e, n) {
  let filtered = e.filter((s) => LD(s.key) === n);
  return filtered.length < O3n ? void 0 : filtered[0]?.key;
}
//@ chunk-e6aww6q8.js:776979-777078 placement
var H2e = (e) =>
  [
    e,
    ...getPluginRegistry()
      .loadedModules.filter((loadedModule) => loadedModule.name === e)
      .map((n) => n.environmentId),
  ].join("#");
//@ chunk-e6aww6q8.js:777078-777153 placement
function Aqs(e, n, r) {
  let joined = [e, H2e(n)].join(" ");
  if (!toldRefusals.has(joined)) (toldRefusals.add(joined), r());
}
//@ chunk-e6aww6q8.js:777153-777173 placement
var IMMEDIATE = "immediate";
//@ chunk-e6aww6q8.js:777173-777186 placement
var gfn = 4000;
/**
 * 记录插件提示让位（被截断或未显示），未显示时提示一次插件作者。
 */
//@ chunk-e6aww6q8.js:777186-777470 placement
function logToastGaveWay({ key: key, plugin: plugin, isCutShort: isCutShort }) {
  if (key === void 0) return;
  if (
    (logForDebugging(`$.ui.toast (${plugin}): ${key} gave way, ` + (isCutShort ? "cut short" : "unseen")),
    !isCutShort)
  )
    tellOnce({
      key: ["toast gave way", H2e(plugin)].join(" "),
      lead: plugin,
      text: "$.ui.toast: a toast that waits to be shown gives way to the plugin's newer ones, unseen",
    });
}
//@ chunk-e6aww6q8.js:777470-777510 placement
var NNi = (e, n) => `plugin-toast-${n}:${e}`;
/**
 * 判断插件新提示的排队情况：是否需等待、让位给哪个提示、当前显示的是否被截断。
 */
//@ chunk-e6aww6q8.js:777510-777796 placement
function toastQueueState(e, n) {
  if (e.isHeld) return { isWaiting: !1, givesWay: u0t(e.queue, n), isCutShort: !1 };
  let r = LD(e.current?.key),
    s = r === n,
    h = (r !== void 0 && !s) || e.queue.some((w) => LD(w.key) !== void 0),
    y = !h && s,
    S = y ? e.current : e.queue.findLast((w) => LD(w.key) === n);
  return { isWaiting: h, givesWay: S?.key, isCutShort: y };
}

export {
  O3n,
  H2e,
  Aqs,
  pluginToastQueueView,
  gfn,
  planBarToasts,
  mergeToastLedgers,
  readBarToasts,
  saveBarToasts,
  logToastTimeLost,
  rekeyToastQueue,
  shownToastEndsAt,
  freeze_4,
  toastQueueState,
  NNi,
  logToastGaveWay,
  wasToastShown,
  IMMEDIATE,
  enqueueBarToast,
};

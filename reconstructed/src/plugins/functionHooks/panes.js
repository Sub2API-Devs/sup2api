/**
 * plugins/functionHooks/panes.ts
 *
 * 2.1.316 新增：函数钩子插件的面板（pane）管理：ui.open/ui.close、面板询问记录（asked）、客户端附着、插件存储（$.store）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z3wfa7xm.js (103)
 * attribution: placement 103
 */
import { dirname, dirname as dirname_2, dirname as dirname_3, resolve, isAbsolute, win32, join } from "path";
import { createHash, randomUUID } from "crypto";
import {
  mkdir,
  mkdir as mkdir_2,
  utimes,
  readFile,
  readFile as readFile_2,
  writeFile,
  link,
  copyFile,
  unlink,
} from "fs/promises";
import { constants } from "fs";
import { Ar } from "../../../runtime/bun-runtime.js";
import { freeze, getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { wZr, checkPaneId, Nae } from "./sites/siteRules.js";
import { createSignal } from "../../utils/signal.js";
import { uniq } from "../../utils/collections.js";
import { ge } from "../../utils/identity.js";
import { to } from "../../utils/valueSlot.js";
import { parsePluginIdentifier_2, legacyPluginIds } from "../../utils/plugins/pluginIdentifier.js";
import {
  BUILTIN,
  INLINE_PLUGIN_MARKETPLACE,
  buildPluginTelemetryFields,
} from "../../utils/telemetry/pluginTelemetry.js";
import { getBuiltinPlugin } from "../builtinPlugins.js";
import { isValidThemeColor, isBuiltinTheme } from "../../utils/theme.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { BPe } from "../../utils/plugins/managedPlugins.js";
import { gte } from "./devModsName.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { saveGlobalConfigDurably, getGlobalConfig } from "../../utils/config.js";
import { IT } from "../hooksModules/loadedModuleFilters.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { hookMembersFor } from "./hookDispatch.js";
import { reportChainFailure } from "./dispatch/chain.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isENOENT, getErrnoCode } from "../../utils/errors.js";
import { DIFF_SIDEBAR_MIN_COLUMNS, okt } from "../bundled/diff/index.js";
import { Rs } from "../../utils/hooks/hookSerialization.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { uEe } from "./api/sessionOps.js";
import { lxt } from "./api/operations.js";
import { hasControlCharacter } from "./ui/validateTree.js";
import { getCwd } from "../../utils/cwd.js";
import { dY } from "../../utils/settings/settingsStorage.js";
import { findGitRoot } from "../../utils/git.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { getPluginsDirectory } from "../../utils/plugins/pluginDirectories.js";
import { HooksError } from "./hooksErrors.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { lock, releaseLockQuietly } from "../../utils/lockfile.js";

//@ chunk-z3wfa7xm.js:1438-1448 placement
var Uq = {};
//@ chunk-z3wfa7xm.js:1448-2285 placement
Ar(Uq, {
  ASKED_MAX: () => K,
  ASKED_ROW_SCHEMA: () => V,
  EMPTY_PANES: () => freeze,
  PANE_ID_MAX: () => wZr,
  askedLatch: () => R,
  askedPaneOf: () => L_n,
  channelsInRange: () => W,
  closePane: () => F_n,
  closePanesOf: () => closePluginPanes,
  cycledPaneId: () => cyclePaneId,
  default: () => Uq,
  everyPane: () => hxe,
  focusPane: () => focusPane,
  forgetAsked: () => dismissPaneAsk,
  forgetDismissed: () => F,
  hasAsked: () => w,
  isToastHoldShown: () => B4o,
  keepAsked: () => setPaneAsked,
  keptAsked: () => readAskedPanes,
  nextPaneId: () => j4o,
  offerPlacement: () => holdPanePlacement,
  openFloor: () => I,
  openPane: () => openPane,
  paneCloseProblem: () => checkPaneOrigin,
  paneIdProblem: () => checkPaneId,
  paneManners: () => pickPaneOptions,
  paneOpenProblem: () => validatePaneOptions,
  panesOf: () => listPluginPanes,
  panesStore: () => ul,
  placeWaiting: () => describePanePlaced,
  placeWaitingRemote: () => placeWaitingPanes,
  placedPanes: () => placePane,
  placementAtOpen: () => describePaneAskState,
  raiseClose: () => closePane,
  rememberAsked: () => markPaneAsked,
  remotePlacement: () => describePaneUnplaced,
  seedAsked: () => loadAskedPanes,
  settleFocusRequest: () => settleFocusRequest,
  showPane: () => showPane,
  shownPane: () => rkt,
  withKeptAsked: () => q,
  withoutPane: () => removePanes,
});
//@ chunk-z3wfa7xm.js:2285-2927 placement
function createClientRegistry() {
  let e = new Map(),
    r = new Set(),
    n = () => [...e.values()],
    i = createSignal();
  return {
    attach: (s) => {
      let a = e.get(s.clientId);
      if ((r.delete(s.clientId), a === void 0)) return (e.set(s.clientId, s), !0);
      if (s.viewport !== void 0 || s.answers !== void 0)
        e.set(s.clientId, {
          ...a,
          ...(s.viewport !== void 0 && { viewport: { ...a.viewport, ...s.viewport } }),
          ...(s.answers !== void 0 && { answers: s.answers }),
        });
      return !1;
    },
    detach: (s) => {
      let a = e.get(s);
      return (e.delete(s), r.delete(s), i.emit(s), a);
    },
    hasSurface: (s) => n().some((a) => a.surface === s),
    list: n,
    surfaces: () => uniq(n().map((s) => s.surface)),
    onDetach: (s) => i.subscribe(s),
    missed: (s) => {
      if (e.has(s)) r.add(s);
    },
    heard: (s) => void r.delete(s),
    isSilent: (s) => r.has(s),
  };
}
//@ chunk-z3wfa7xm.js:2927-2993 placement
var vk = ge(createClientRegistry(), (e) => {
  for (let r of e.list()) e.detach(r.clientId);
});
//@ chunk-z3wfa7xm.js:2993-3062 placement
var $tr = () => vk.list().filter((e) => e.viewport?.isFullscreen !== void 0);
//@ chunk-z3wfa7xm.js:3062-3126 placement
function listViewportClients() {
  return vk.list().filter((e) => e.viewport !== void 0);
}
//@ chunk-z3wfa7xm.js:3126-3161 placement
var g2 = ge(to(), (e) => e.set(void 0));
//@ chunk-z3wfa7xm.js:3161-3238 placement
function isOfficialMarketplacePlugin(e) {
  let { name: r, marketplace: marketplace } = parsePluginIdentifier_2(e);
  return marketplace === BUILTIN && getBuiltinPlugin(r) !== void 0;
}
//@ chunk-z3wfa7xm.js:3238-3580 placement
var PANE_COLORS = {
  black: "#000000",
  red: "#e5484d",
  green: "#46a758",
  yellow: "#f5d90a",
  blue: "#3e63dd",
  magenta: "#d6409f",
  cyan: "#05a2c2",
  white: "#ffffff",
  gray: "#8b8d98",
  grey: "#8b8d98",
  blackBright: "#6e6e6e",
  redBright: "#ff6369",
  greenBright: "#5bd07f",
  yellowBright: "#ffe629",
  blueBright: "#5b8def",
  magentaBright: "#ee6ac2",
  cyanBright: "#3ec2e0",
  whiteBright: "#ffffff",
};
//@ chunk-z3wfa7xm.js:3580-3628 placement
var Ftr = (e) => (Object.hasOwn(PANE_COLORS, e) ? PANE_COLORS[e] : void 0);
//@ chunk-z3wfa7xm.js:3628-3651 placement
var JNe = (e) => Ftr(e) ?? e;
//@ chunk-z3wfa7xm.js:3651-3669 placement
var ae = (e) => isValidThemeColor(e);
//@ chunk-z3wfa7xm.js:3669-3729 placement
function ekt(e) {
  return e !== void 0 && (isBuiltinTheme(e) || ae(e)) ? e : void 0;
}
//@ chunk-z3wfa7xm.js:3729-3763 placement
var R = ge(to(), (e) => e.set(void 0));
//@ chunk-z3wfa7xm.js:3763-3772 placement
var K = 64;
//@ chunk-z3wfa7xm.js:3772-3805 placement
var L_n = (e, r) => ({ plugin: e, id: r });
//@ chunk-z3wfa7xm.js:3805-3841 placement
var V = DoctorLazy(() => u({ plugin: o(), id: o() }));
//@ chunk-z3wfa7xm.js:3841-3918 placement
var W = (e) => !/^(?:rgb|ansi256)\(.*\b(?:[3-9]\d\d|2[6-9]\d|25[6-9])\b/.test(e);
//@ chunk-z3wfa7xm.js:3918-3954 placement
var H_n = ge(to(), (e) => e.set(void 0));
//@ chunk-z3wfa7xm.js:3954-3990 placement
var N_n = ge(to(), (e) => e.set(void 0));
//@ chunk-z3wfa7xm.js:3990-4026 placement
var $_n = ge(to(), (e) => e.set(void 0));
//@ chunk-z3wfa7xm.js:4026-4056 placement
var KKt = (e, r) => `${e}\x00${r}`;
//@ chunk-z3wfa7xm.js:4056-4109 placement
function VKt(e, r) {
  return $_n.get()?.get(KKt(e, r)) ?? 0;
}
//@ chunk-z3wfa7xm.js:4109-4180 placement
function tkt(e, r) {
  let n = new Map(e);
  for (let i of r) n.delete(i);
  return n;
}
/**
 * 标记某插件某面板需要重绘：更新渲染与可见计数，并递增其版本号。
 */
//@ chunk-z3wfa7xm.js:4180-4337 placement
function bumpPaneRender(e, r) {
  let n = KKt(e, r),
    i = VKt(e, r) + 1;
  (H_n.set(tkt(H_n.get() ?? new Map(), [n])),
    N_n.set(tkt(N_n.get() ?? new Map(), [n])),
    $_n.set(new Map($_n.get()).set(n, i)));
}
//@ chunk-z3wfa7xm.js:4337-4390 placement
var ul = ge(
  () => getPluginRegistry().panes,
  (e) => e().setState(() => freeze),
);
/**
 * 从面板状态中移除满足条件的面板，修正显示中/聚焦/待聚焦与关闭中列表。
 */
//@ chunk-z3wfa7xm.js:4390-4807 placement
function removePanes(e, r) {
  let filtered = e.open.filter((l) => !r(l)),
    filtered_2 = e.unplaced.filter((l) => !r(l));
  if (filtered.length === e.open.length && filtered_2.length === e.unplaced.length) return e;
  let a = new Set([...filtered, ...filtered_2].map((l) => l.id)),
    m = (l) => (a.has(l ?? "") ? l : null);
  return {
    open: filtered,
    unplaced: filtered_2,
    asked: e.asked,
    shownId: m(e.shownId) ?? filtered.at(-1)?.id ?? null,
    focusedId: m(e.focusedId),
    focusRequest: m(e.focusRequest),
    placements: e.placements,
    closing: e.closing.filter((l) => a.has(l)),
  };
}
//@ chunk-z3wfa7xm.js:4807-4876 placement
function F_n(e) {
  (ul().setState((r) => removePanes(r, (n) => n.id === e)), bumpPaneRender("Pane", e));
}
//@ chunk-z3wfa7xm.js:4876-4915 placement
var hxe = (e) => [...e.open, ...e.unplaced];
//@ chunk-z3wfa7xm.js:4915-4990 placement
function w(e, r) {
  return e.asked.some((n) => n.id === r.id && n.plugin === r.plugin);
}
//@ chunk-z3wfa7xm.js:5036-5298 placement
function classifyPluginOrigin({ pluginStorageId: pluginStorageId, pluginRoot: pluginRoot }) {
  let { name: n, marketplace: marketplace } = parsePluginIdentifier_2(pluginStorageId),
    s = BPe(pluginStorageId),
    a = dirname(resolve(pluginRoot)),
    l = [a, dirname(a)].includes(gte()) ? "dev_mods" : "plugin_dir",
    h = s ? "managed" : marketplace === INLINE_PLUGIN_MARKETPLACE ? l : "installed",
    A = isOfficialMarketplacePlugin(pluginStorageId) ? "builtin" : h;
  return { provenance: fromEnum(A), ...buildPluginTelemetryFields(n, marketplace, s ? new Set([n]) : null) };
}
//@ chunk-z3wfa7xm.js:5298-5436 placement
function readAskedPanes(e) {
  let r = e.pluginPanes?.asked;
  return Array.isArray(r)
    ? r.flatMap((n) => {
        let safeParse = V().safeParse(n);
        return safeParse.success ? [safeParse.data] : [];
      })
    : [];
}
//@ chunk-z3wfa7xm.js:5436-5497 placement
var q = (e, r) => ({ ...e, pluginPanes: { ...e.pluginPanes, asked: r } });
//@ chunk-z3wfa7xm.js:5497-5832 placement
function setPaneAsked(e, r) {
  let n = r === "asked",
    i = !1;
  saveGlobalConfigDurably((s) => {
    let a = readAskedPanes(s),
      filtered = a.filter((l) => l.plugin !== e.plugin || l.id !== e.id);
    return (
      (i = filtered.length < a.length !== n),
      i ? q(s, n ? [...filtered, L_n(e.plugin, e.id)].slice(-K) : filtered) : s
    );
  }).then((s) => {
    if (i) {
      let a = IT(e.plugin),
        m = a && classifyPluginOrigin(a);
      s
        ? logFeatureOk("plugin_function_hooks_pane_ask", m)
        : logFeatureSad("plugin_function_hooks_pane_ask", "not_persisted", m);
    }
  });
}
//@ chunk-z3wfa7xm.js:5832-5959 placement
function dismissPaneAsk(e) {
  (ul().setState((r) =>
    w(r, e) ? { ...r, asked: r.asked.filter((n) => n.plugin !== e.plugin || n.id !== e.id) } : r,
  ),
    setPaneAsked(e, "dismissed"));
}
//@ chunk-z3wfa7xm.js:5959-6022 placement
function F(e, r, n) {
  if (r.kind === "person" && n !== void 0) dismissPaneAsk(L_n(n, e));
}
/**
 * 关闭面板（卸载或 ui.close，钩子可保持打开）。
 */
//@ chunk-z3wfa7xm.js:6022-6873 placement
async function closePane(e, r) {
  let state = ul().getState(),
    included = state.closing.includes(e),
    s = r.kind === "unload",
    a = hxe(state).find((x) => x.id === e)?.plugin,
    m = !1;
  if (s) F_n(e);
  if (included) return;
  let filtered = hookMembersFor("ui.close").filter((x) => !s || x.name !== a);
  if (filtered.length === 0) {
    (F_n(e), F(e, r, a));
    return;
  }
  if (!s) ul().setState((x) => ({ ...x, closing: [...x.closing, e] }));
  try {
    let x = await reportChainFailure({
        e: { id: e, origin: r },
        handlers: filtered,
        site: Nae("ui.close"),
        bottom: (P) => {
          if (P.id !== e || ul().getState().closing.includes(e)) (F_n(P.id), (m = P.id === e));
          return Promise.resolve({ value: void 0 });
        },
      }),
      state = ul().getState();
    if (state.closing.includes(e) && hxe(state).some((P) => P.id === e))
      logForDebugging(
        `ui.close ${e} (${r.kind}): kept open by a hook` + (x.deny === void 0 ? "" : ` (${x.deny})`),
      );
  } catch (error) {
    logForDebugging(`ui.close ${e} (${r.kind}): the chain failed: ` + errorMessage(error), {
      level: "error",
    });
  } finally {
    if (
      (ul().setState((x) =>
        x.closing.includes(e) ? { ...x, closing: x.closing.filter((h) => h !== e) } : x,
      ),
      m)
    )
      F(e, r, a);
  }
}
/**
 * 关闭某插件打开的全部面板（插件卸载时）。
 */
//@ chunk-z3wfa7xm.js:6873-6973 placement
function closePluginPanes(e) {
  let r = hxe(ul().getState());
  for (let n of r) if (n.plugin === e) closePane(n.id, { kind: "unload" });
}
/**
 * 在打开的面板间循环：返回当前显示面板前后第 r 个的 id。
 */
//@ chunk-z3wfa7xm.js:6973-7103 placement
function cyclePaneId(e, r) {
  let n = e.open.length,
    index = e.open.findIndex((a) => a.id === e.shownId);
  return n > 1 && index >= 0 ? (e.open[(index + r + n) % n]?.id ?? null) : null;
}
/**
 * 聚焦并显示指定面板（null 表示取消聚焦），同时清除待聚焦请求。
 */
//@ chunk-z3wfa7xm.js:7103-7335 placement
var focusPane = (e) =>
  ul().setState((r) => {
    let n = e === null || r.open.some((m) => m.id === e),
      i = n ? e : r.focusedId,
      s = n && e !== null ? e : r.shownId;
    return r.focusedId === i && r.shownId === s && r.focusRequest === null
      ? r
      : { ...r, focusedId: i, shownId: s, focusRequest: null };
  });
//@ chunk-z3wfa7xm.js:7335-7383 placement
var rkt = (e) => e.open.find((r) => r.id === e.shownId);
//@ chunk-z3wfa7xm.js:7383-7436 placement
var B4o = (e) => e.placements > 0 && rkt(e)?.holdToasts === !0;
//@ chunk-z3wfa7xm.js:7436-7529 placement
function j4o(e) {
  let index = e.open.findIndex((n) => n.id === e.focusedId);
  return e.open[index + 1]?.id ?? null;
}
/**
 * 登记一个面板放置位（计数 +1），返回释放函数。
 */
//@ chunk-z3wfa7xm.js:7529-7665 placement
function holdPanePlacement() {
  return (
    ul().setState((e) => ({ ...e, placements: e.placements + 1 })),
    () => ul().setState((e) => ({ ...e, placements: e.placements - 1 }))
  );
}
//@ chunk-z3wfa7xm.js:7665-7693 placement
var I = (e, r) => (w(e, r) ? DIFF_SIDEBAR_MIN_COLUMNS : okt);
//@ chunk-z3wfa7xm.js:7693-7954 placement
function pickPaneOptions(e) {
  return {
    ...(e.closeOnEscape && { closeOnEscape: e.closeOnEscape }),
    ...(e.holdToasts && { holdToasts: e.holdToasts }),
    ...(e.backgroundColor !== void 0 && { backgroundColor: e.backgroundColor }),
    ...(e.rows !== void 0 && { rows: e.rows }),
    ...(e.columns !== void 0 && { columns: e.columns }),
  };
}
/**
 * 把面板放入打开列表（已存在则替换），从未放置列表中移除，必要时设为显示中。
 */
//@ chunk-z3wfa7xm.js:7954-8271 placement
function placePane(e, r, n) {
  let any = e.open.some((a) => a.id === r.id),
    mapped = e.open.map((a) => (a.id === r.id ? { ...r, plugin: a.plugin } : a));
  return {
    open: any ? mapped : [...e.open, r],
    unplaced: e.unplaced.filter((a) => a.id !== r.id),
    asked: e.asked,
    shownId: any ? e.shownId : (e.focusedId ?? r.id),
    focusedId: e.focusedId,
    focusRequest: n,
    placements: e.placements,
    closing: e.closing,
  };
}
//@ chunk-z3wfa7xm.js:8271-8539 placement
function describePaneUnplaced() {
  let e = listViewportClients();
  if (e.length === 0) return;
  if ($tr().length > 0) return { isPlaced: !0 };
  return {
    isPlaced: !1,
    reason: `no attached surface places panes (${e.map((n) => n.clientId).join(", ")}): placed when a surface that does attaches; once they detach, as a fresh open is`,
  };
}
//@ chunk-z3wfa7xm.js:8539-8860 placement
function describePaneAskState(e, r, n) {
  let i = g2.get()?.columns,
    s = I(e, r);
  if (i === void 0) return describePaneUnplaced() ?? { isPlaced: !0 };
  if (n || i >= s) return { isPlaced: !0 };
  return {
    isPlaced: !1,
    reason: `unasked below ${s} columns (${i} now${s === DIFF_SIDEBAR_MIN_COLUMNS ? ", an id the person opened before" : ""}): placed when the person opens it, or when the terminal is widened to ${s} columns`,
  };
}
//@ chunk-z3wfa7xm.js:8860-9012 placement
function loadAskedPanes() {
  if (R.get()) return;
  R.set(!0);
  let e = readAskedPanes(getGlobalConfig());
  if (e.length === 0) return;
  ul().setState((r) => ({ ...r, asked: [...e.filter((n) => !w(r, n)), ...r.asked] }));
}
/**
 * 打开面板：校验选项、记录询问、等待布局。
 */
//@ chunk-z3wfa7xm.js:9012-9950 placement
function openPane(e, r, n) {
  loadAskedPanes();
  let i = e.title ?? e.id,
    s = e.focus === !0 ? e.id : void 0,
    a = pickPaneOptions(e),
    m = { id: e.id, plugin: r },
    l = (y) =>
      y?.title === i &&
      y.closeOnEscape === a.closeOnEscape &&
      y.holdToasts === a.holdToasts &&
      y.backgroundColor === a.backgroundColor &&
      y.rows === a.rows &&
      y.columns === a.columns,
    x,
    h = !1;
  if (
    (ul().setState((y) => {
      let M = n && !w(y, m),
        found = y.open.find((C) => C.id === e.id),
        found_2 = y.unplaced.find((C) => C.id === e.id),
        oe = found !== void 0,
        Me = found_2 !== void 0,
        re = { id: e.id, plugin: found_2?.plugin ?? r };
      ((x = oe ? { isPlaced: !0 } : describePaneAskState(y, re, n)), (h = M));
      let isPlaced = x.isPlaced,
        Re = l(found) && s === void 0 && !M,
        N = { ...re, title: i, ...a },
        se = M ? { ...y, asked: [...y.asked, m] } : y,
        _e = { ...se, unplaced: Me ? y.unplaced.map((C) => (C.id === e.id ? N : C)) : [...y.unplaced, N] },
        Fe = oe ? Re : !isPlaced && l(found_2) && !M,
        je = isPlaced ? placePane(se, N, s ?? y.focusRequest) : _e;
      return Fe ? y : je;
    }),
    h)
  )
    setPaneAsked(m, "asked");
  let A = x ?? { isPlaced: !0 },
    P = g2.get()?.columns ?? "unmeasured",
    Z = n ? "asked" : "unasked",
    $e = A.isPlaced ? "placed" : `waits unplaced (${A.reason})`;
  return (logForDebugging(`ui.open ${r} ${e.id} (${Z}, ${P} columns): ${$e}`), A);
}
/**
 * 校验面板参数：id 合法，origin 只能是插件（引擎来源由引擎设置）。
 */
//@ chunk-z3wfa7xm.js:9950-10070 placement
function checkPaneOrigin(e) {
  let r = Rs(e?.origin) === Rs({ kind: "plugin" });
  return checkPaneId(e?.id) ?? (r ? void 0 : "origin is the engine's to set");
}
//@ chunk-z3wfa7xm.js:10070-10240 placement
function checkArgv(e) {
  return Array.isArray(e) && e.length > 0 && e.every((n) => typeof n === "string") && e[0] !== ""
    ? void 0
    : "takes argv, a non-empty list of strings naming the command first";
}
//@ chunk-z3wfa7xm.js:10240-10368 placement
function checkStringRecord(e, r) {
  return e === void 0 || (isPlainObject(e) && Object.values(e).every((i) => typeof i === "string"))
    ? void 0
    : `${r} is an object of strings`;
}
/**
 * 校验 $.flag.value 参数：需要 name 与 fallback。
 */
//@ chunk-z3wfa7xm.js:10368-10556 placement
function checkFlagValueArgs(e) {
  let r = typeof e?.name !== "string" || e.name === "",
    n = e?.fallback === void 0;
  return r
    ? "takes the flag's name"
    : n
      ? "takes a fallback, the value where the flag table has no say"
      : void 0;
}
//@ chunk-z3wfa7xm.js:10556-10601 placement
var Rni = (e) => e !== void 0 && typeof e !== "string";
//@ chunk-z3wfa7xm.js:10601-10678 placement
function N4o(e, r) {
  return typeof e === "number" && Number.isInteger(e) && e > 0 && e <= r;
}
//@ chunk-z3wfa7xm.js:10678-10953 placement
function describeNonJsonValue(e) {
  let r;
  try {
    r = jsonStringify(e);
  } catch (error) {
    return `value is not JSON data: ${errorMessage(error)}`;
  }
  let n = r;
  if (typeof n !== "string") return `value is not JSON data: ${e === void 0 ? "undefined" : `a ${typeof e}`}`;
  return n.length > uEe ? `the value is ${n.length} characters, over the ${uEe} limit` : void 0;
}
//@ chunk-z3wfa7xm.js:10953-11022 placement
function dYr(e) {
  return typeof e?.key === "string" ? void 0 : "takes a key";
}
//@ chunk-z3wfa7xm.js:11022-11256 placement
function validateAgentIdArg(e) {
  let r = e?.agentId,
    n = e?.as,
    i = r === void 0 || (typeof r === "string" && r !== ""),
    s = n === void 0 || n === "api";
  if (!i) return `takes agentId, a non-empty string (got ${String(r)})`;
  return s ? void 0 : `takes as "api" or none (got ${String(n)})`;
}
//@ chunk-z3wfa7xm.js:11303-11795 placement
function validateNamesArg(e) {
  let r = e?.names;
  if (!Array.isArray(r)) return "takes names, a list of relative .md file names";
  for (let n of ["of", "below"]) {
    let i = e?.[n];
    if (i !== void 0 && (typeof i !== "string" || i === "")) return `takes ${n}, a path, when given`;
  }
  for (let n of r) {
    if (typeof n !== "string" || !n.toLowerCase().endsWith(".md"))
      return `takes names, each a .md file name (${JSON.stringify(n)})`;
    if (isAbsolute(n) || win32.isAbsolute(n) || n.split(/[\\/]/).includes(".."))
      return `takes names, each relative with no ".." (${n})`;
  }
  return;
}
//@ chunk-z3wfa7xm.js:11795-11882 placement
function zKt(e) {
  let r = e?.path;
  return typeof r !== "string" || r === "" ? "takes a path" : void 0;
}
/**
 * 校验 $.fs.read 参数：路径合法，as 为 text 或 bytes。
 */
//@ chunk-z3wfa7xm.js:11882-11988 placement
function checkFsReadArgs(e) {
  let r = e?.as === "text" || e?.as === "bytes";
  return zKt(e) ?? (r ? void 0 : 'as is "text" or "bytes"');
}
/**
 * 校验 $.fs.stat 参数：路径合法，resolve 为布尔。
 */
//@ chunk-z3wfa7xm.js:11988-12093 placement
function checkFsStatArgs(e) {
  let r = typeof e?.resolve === "boolean";
  return zKt(e) ?? (r ? void 0 : "resolve is true or false");
}
//@ chunk-z3wfa7xm.js:12093-12108 placement
var Ntr = 600000;
//@ chunk-z3wfa7xm.js:12108-12596 placement
function validateSpawnInit(e) {
  let r = checkArgv(e?.argv);
  if (r !== void 0) return r;
  let n = e?.init;
  if (n === void 0) return;
  if (!isPlainObject(n)) return "takes init, { cwd?, env?, stdin?, timeoutMs? }";
  if (n.cwd !== void 0 && (typeof n.cwd !== "string" || n.cwd === "")) return "init.cwd is a non-empty path";
  let s = checkStringRecord(n.env, "init.env");
  if (s !== void 0) return s;
  if (n.stdin !== void 0 && typeof n.stdin !== "string") return "init.stdin is a string";
  return n.timeoutMs !== void 0 && !N4o(n.timeoutMs, Ntr)
    ? `init.timeoutMs is a whole number of ms, 1 to ${Ntr}`
    : void 0;
}
//@ chunk-z3wfa7xm.js:12596-12870 placement
function validateExecArgs(e) {
  if (!isPlainObject(e)) return "takes { argv, cwd?, env?, input? }";
  let { argv: argv, cwd: cwd, env: env, input: input } = e,
    a = cwd !== void 0 && (typeof cwd !== "string" || cwd === ""),
    m = input !== void 0 && typeof input !== "string";
  return (
    checkArgv(argv) ??
    (a ? "cwd is a non-empty path" : void 0) ??
    checkStringRecord(env, "env") ??
    (m ? "input is a string" : void 0)
  );
}
//@ chunk-z3wfa7xm.js:12870-13083 placement
function validateToolRegistration(e) {
  let r = e?.name,
    n = e?.description,
    i = typeof r !== "string" || !lxt.test(r),
    s = typeof n === "string" && !!n.trim();
  return (i ? "name is letters, digits, _ or - (up to 64)" : void 0) ?? (s ? void 0 : "needs a description");
}
//@ chunk-z3wfa7xm.js:13083-13118 placement
var PFi = (e) => dYr(e) ?? describeNonJsonValue(e?.value);
/**
 * 校验工具 inputSchema：必须是可 JSON 序列化的对象。
 */
//@ chunk-z3wfa7xm.js:13118-13264 placement
function checkInputSchema(e) {
  if (!isPlainObject(e)) return "inputSchema must be a JSON schema object";
  try {
    jsonStringify(e);
    return;
  } catch (error) {
    return `inputSchema is not JSON data: ${errorMessage(error)}`;
  }
}
//@ chunk-z3wfa7xm.js:13264-13326 placement
var hrt = (e) => (typeof e === "string" ? void 0 : "takes a string text");
//@ chunk-z3wfa7xm.js:13326-13613 placement
function validateBreakdownArg(e) {
  let r = e?.breakdown,
    n = e?.columns;
  if (!(r === void 0 || r === "summary" || r === "full"))
    return `takes breakdown "summary" or "full" (got ${String(r)})`;
  return n === void 0 || (typeof n === "number" && Number.isInteger(n) && n > 0)
    ? void 0
    : `takes columns, a positive whole number (got ${String(n)})`;
}
//@ chunk-z3wfa7xm.js:13613-14298 placement
function validatePaneOptions(e) {
  let r = e?.title,
    n = r !== void 0,
    i = typeof r === "string" && hasControlCharacter(r),
    found = ["focus", "closeOnEscape", "holdToasts"].find((x) => e?.[x] !== void 0 && e[x] !== !0),
    a = e?.backgroundColor,
    m =
      a === void 0 ||
      a === "transparent" ||
      (typeof a === "string" && !/[^\S ]/.test(a) && ekt(JNe(a)) !== void 0 && W(a)),
    found_2 = ["rows", "columns"].find((x) => {
      let h = e?.[x];
      return h !== void 0 && !(typeof h === "number" && Number.isInteger(h) && h > 0);
    });
  return (
    checkPaneId(e?.id) ??
    (n ? hrt(r) : void 0) ??
    (i ? "title holds a control character" : void 0) ??
    (found === void 0 ? void 0 : `${found} is true or left out`) ??
    (found_2 === void 0
      ? void 0
      : `${found_2} is a positive whole number or left out (got ${String(e?.[found_2])})`) ??
    (m ? void 0 : 'backgroundColor is a theme key, a raw color or "transparent"')
  );
}
/**
 * 列出某插件的面板（id、标题、是否显示、聚焦、已放置），冻结返回。
 */
//@ chunk-z3wfa7xm.js:14298-14530 placement
function listPluginPanes(e) {
  let state = ul().getState(),
    n = new Set(state.open);
  return Object.freeze(
    hxe(state)
      .filter((i) => i.plugin === e)
      .map((i) =>
        Object.freeze({
          id: i.id,
          title: i.title,
          isShown: state.shownId === i.id,
          isFocused: state.focusedId === i.id,
          isPlaced: n.has(i),
        }),
      ),
  );
}
//@ chunk-z3wfa7xm.js:14530-14808 placement
function describePanePlaced(e) {
  let unplaced = ul().getState().unplaced;
  ul().setState((i) =>
    i.unplaced.filter((s) => e >= I(i, s)).reduce((s, a) => placePane(s, a, s.focusRequest), i),
  );
  let n = new Set(ul().getState().open);
  for (let i of unplaced.filter((s) => n.has(s)))
    logForDebugging(`ui.open ${i.plugin} ${i.id} (waiting, ${e} columns): placed`);
}
/**
 * 有放置位后，把等待中的面板全部放置并记录日志。
 */
//@ chunk-z3wfa7xm.js:14808-15020 placement
function placeWaitingPanes(e) {
  let unplaced = ul().getState().unplaced;
  if (unplaced.length === 0) return;
  ul().setState((n) => n.unplaced.reduce((i, s) => placePane(i, s, i.focusRequest), n));
  for (let n of unplaced) logForDebugging(`ui.open ${n.plugin} ${n.id} (waiting, ${e}): placed`);
}
/**
 * 记录插件已询问过打开某面板（持久化到全局配置）。
 */
//@ chunk-z3wfa7xm.js:15020-15136 placement
function markPaneAsked(e) {
  loadAskedPanes();
  let r = !1;
  if ((ul().setState((n) => ((r = !w(n, e)), r ? { ...n, asked: [...n.asked, { ...e }] } : n)), r))
    setPaneAsked(e, "asked");
}
/**
 * 处理待聚焦请求：接受则聚焦该面板，否则清除请求。
 */
//@ chunk-z3wfa7xm.js:15136-15263 placement
function settleFocusRequest(e) {
  let { focusRequest: focusRequest } = ul().getState();
  if (focusRequest === null) return;
  e ? focusPane(focusRequest) : ul().setState((n) => ({ ...n, focusRequest: null }));
}
/**
 * 把指定的已打开面板设为显示中（已聚焦时一并转移焦点）。
 */
//@ chunk-z3wfa7xm.js:15263-15394 placement
var showPane = (e) =>
  ul().setState((r) =>
    r.shownId === e || !r.open.some((i) => i.id === e)
      ? r
      : { ...r, shownId: e, focusedId: r.focusedId === null ? null : e },
  );
//@ chunk-z3wfa7xm.js:15394-15450 placement
function EFi(e) {
  let r = e ?? getCwd();
  return dY(r) ?? findGitRoot(r) ?? getOriginalCwd();
}
//@ chunk-z3wfa7xm.js:15450-15484 placement
var le = (e) =>
  e.catch(() => {
    return;
  });
//@ chunk-z3wfa7xm.js:15484-15571 placement
function bqe() {
  let resolved = Promise.resolve();
  return (r) => {
    let n = resolved.then(r, r);
    return ((resolved = le(n)), n);
  };
}
//@ chunk-z3wfa7xm.js:15571-15624 placement
var lt = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
//@ chunk-z3wfa7xm.js:15624-15634 placement
var ce = 64;
//@ chunk-z3wfa7xm.js:15634-15644 placement
var ct = 12;
//@ chunk-z3wfa7xm.js:15644-15789 placement
var STORE_LOCK_OPTIONS = {
  realpath: !1,
  retries: { retries: 10, minTimeout: 5, maxTimeout: 100 },
  onCompromised: (e) => {
    logForDebugging(`$.store lock compromised: ${errorMessage(e)}`, { level: "warn" });
  },
};
//@ chunk-z3wfa7xm.js:15789-15872 placement
function ye() {
  let e = new Map();
  return (r) => {
    let n = e.get(r) ?? bqe();
    return (e.set(r, n), n);
  };
}
//@ chunk-z3wfa7xm.js:15872-15896 placement
var xt = /^[a-z0-9._-]+$/;
//@ chunk-z3wfa7xm.js:15896-15908 placement
var yt = ye();
//@ chunk-z3wfa7xm.js:16043-16271 placement
function pluginStoreFileName(e) {
  if (xt.test(e) && !lt.test(e) && e.length <= ce && e !== "." && e !== "..") return `${e}.json`;
  let replaced = e.replace(/[^a-zA-Z0-9_-]/g, "_"),
    sliced = createHash("sha256").update(e).digest("hex").slice(0, ct);
  return `${replaced.slice(0, ce) || "plugin"}-${sliced}.json`;
}
//@ chunk-z3wfa7xm.js:16271-16305 placement
var S = (e) => join(getPluginsDirectory(), "store", pluginStoreFileName(e));
//@ chunk-z3wfa7xm.js:16305-16386 placement
async function ke(e) {
  let r = S(e);
  return (await mkdir(dirname_2(r), { recursive: !0, mode: 448 }), r);
}
//@ chunk-z3wfa7xm.js:16424-16558 placement
async function touchStoreFile(e, r) {
  let date = new Date();
  try {
    await utimes(r, date, date);
  } catch (error) {
    logForDebugging(`$.store (${e}): could not touch ${r}: ${errorMessage(error)}`, { level: "warn" });
  }
}
//@ chunk-z3wfa7xm.js:16791-16908 placement
async function readStoreFile(e) {
  let r = await readFile(S(e), "utf8").catch((n) => {
    if (isENOENT(n)) return;
    throw n;
  });
  return r === void 0 ? void 0 : [e, r];
}
//@ chunk-z3wfa7xm.js:16908-17472 placement
async function writePluginStore(e) {
  let reduced = await legacyPluginIds(e).reduce(
    async (m, l) => (await m) ?? readStoreFile(l),
    Promise.resolve(void 0),
  );
  if (reduced === void 0) return !1;
  let [n, i] = reduced,
    s = S(e),
    a = `${s}.carry-${randomUUID()}`;
  try {
    if (!isPlainObject(jsonParse(i))) return !1;
    return (
      await mkdir_2(dirname_3(s), { recursive: !0 }),
      await writeFile(a, i, { flag: "wx" }),
      await link(a, s).catch(async (m) => {
        if (getErrnoCode(m) === "EEXIST") throw m;
        await copyFile(a, s, constants.COPYFILE_EXCL);
      }),
      !0
    );
  } catch (error) {
    let l = getErrnoCode(error) === "EEXIST";
    return (
      logForDebugging(
        `$.store (${e}): ` +
          (l
            ? `${n}'s store was carried by another session`
            : `could not carry ${n}'s store: ${errorMessage(error)}`),
        { level: l ? "debug" : "warn" },
      ),
      l
    );
  } finally {
    await unlink(a).catch(() => {
      return;
    });
  }
}
//@ chunk-z3wfa7xm.js:17512-17677 placement
async function readStoreWithMigration(e, r) {
  try {
    return await readFile_2(r, "utf8");
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  if (!(await writePluginStore(e))) return;
  try {
    return await readFile_2(r, "utf8");
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
}
//@ chunk-z3wfa7xm.js:17677-18162 placement
var PLUGIN_STORE_ERRORS = {
  async read(e) {
    let r = S(e),
      n;
    try {
      n = await readStoreWithMigration(e, r);
    } catch (error) {
      throw new HooksError(`${e}: store file ${r} is unreadable (${errorMessage(error)})`);
    }
    if (n === void 0) return {};
    let i;
    try {
      i = jsonParse(n);
    } catch (error) {
      throw new HooksError(`${e}: store file ${r} is malformed (${errorMessage(error)})`);
    }
    if (!isPlainObject(i))
      throw new HooksError(`${e}: store file ${r} is malformed (the JSON is not an object)`);
    return (await touchStoreFile(e, r), i);
  },
  write: async (e, r) =>
    writeFileAtomic(
      await ke(e),
      `${jsonStringify(r, null, 2)}
`,
      384,
    ),
  async lock(e) {
    let r = await ke(e);
    return lock(r, { lockfilePath: `${r}.lock`, ...STORE_LOCK_OPTIONS });
  },
};
//@ chunk-z3wfa7xm.js:18162-18234 placement
function Ce() {
  let e = to();
  return { setBackend: e.set, backendOverride: e.get };
}
//@ chunk-z3wfa7xm.js:18234-18246 placement
var Vt = Ce();
//@ chunk-z3wfa7xm.js:18246-18282 placement
var Ie = () => Vt.backendOverride() ?? PLUGIN_STORE_ERRORS;
//@ chunk-z3wfa7xm.js:18282-18292 placement
var Y = 256;
/**
 * 应用 $.store 事件（键长度上限、keys 事件）。
 */
//@ chunk-z3wfa7xm.js:18292-19125 placement
async function applyStoreEvent(e, r) {
  try {
    if (e.event !== "keys" && e.key.length > Y)
      throw new HooksError(
        `${r}: $.store.${e.event}: the key is ${e.key.length} characters, over the ${Y} limit`,
      );
    let n = Ie(),
      s = e.event === "set" || e.event === "delete" ? await n.lock?.(r) : void 0;
    try {
      let read = await n.read(r);
      switch (e.event) {
        case "get":
          return Object.hasOwn(read, e.key) ? read[e.key] : void 0;
        case "keys":
          return Object.keys(read);
        case "set": {
          let m = { ...read, [e.key]: e.value },
            l = jsonStringify(m).length;
          if (l > uEe)
            throw new HooksError(
              `${r}: $.store.set: the store would be ${l} characters, over the ${uEe} limit`,
            );
          (await n.write(r, m), logForDebugging(`$.store.set (${r}): ${e.key}`));
          return;
        }
        case "delete": {
          if (!Object.hasOwn(read, e.key)) return;
          let m = { ...read };
          (delete m[e.key], await n.write(r, m));
          return;
        }
      }
    } finally {
      await releaseLockQuietly(s, `$.store.${e.event} (${r})`);
    }
  } catch (error) {
    if (error instanceof HooksError) throw error;
    throw new HooksError(`${r}: $.store.${e.event} failed: ${errorMessage(error)}`);
  }
}
//@ chunk-z3wfa7xm.js:19125-19159 placement
var qKt = (e, r) => yt(r)(() => applyStoreEvent(e, r));

export {
  vk,
  rkt,
  ul,
  ekt,
  JNe,
  closePane,
  focusPane,
  showPane,
  cyclePaneId,
  VKt,
  Uq,
  B4o,
  H_n,
  bumpPaneRender,
  N_n,
  $_n,
  KKt,
  tkt,
  settleFocusRequest,
  j4o,
  g2,
  describePanePlaced,
  $tr,
  hxe,
  qKt,
  markPaneAsked,
  L_n,
  isOfficialMarketplacePlugin,
  PANE_COLORS,
  Ftr,
  classifyPluginOrigin,
  EFi,
  checkFlagValueArgs,
  validateNamesArg,
  zKt,
  checkFsReadArgs,
  checkFsStatArgs,
  bqe,
  Ntr,
  hrt,
  validateAgentIdArg,
  validateBreakdownArg,
  Rni,
  validateToolRegistration,
  checkInputSchema,
  N4o,
  validatePaneOptions,
  openPane,
  checkPaneOrigin,
  F_n,
  listPluginPanes,
  dYr,
  PFi,
  validateSpawnInit,
  validateExecArgs,
  closePluginPanes,
  describeNonJsonValue,
  holdPanePlacement,
  placeWaitingPanes,
  describePaneUnplaced,
};

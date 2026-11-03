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
import { dirname, resolve, isAbsolute, win32, join } from "path";
import { createHash, randomUUID } from "crypto";
import { mkdir, utimes, readFile, writeFile, link, copyFile, unlink } from "fs/promises";
import { constants } from "fs";
import { Ar } from "../../../runtime/bun-runtime.js";
import { hpr, getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { MAX_PANE_ID_LEN, checkPaneId, envSiteRuleFor } from "./sites/siteRules.js";
import { createSignal } from "../../utils/signal.js";
import { uniq } from "../../utils/collections.js";
import { identity } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { parsePluginIdentifier_2, legacyPluginIds } from "../../utils/plugins/pluginIdentifier.js";
import {
  BUILTIN,
  INLINE_PLUGIN_MARKETPLACE,
  buildPluginTelemetryFields,
} from "../../utils/telemetry/pluginTelemetry.js";
import { getBuiltinPlugin } from "../builtinPlugins.js";
import { isValidThemeColor, isBuiltinTheme } from "../../utils/theme.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { isVouchedPolicyPluginId } from "../../utils/plugins/managedPlugins.js";
import { devModsDir } from "./devModsName.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { saveGlobalConfigDurably, getGlobalConfig } from "../../utils/config.js";
import { loadedModuleArgs } from "../hooksModules/loadedModuleFilters.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { hookMembersFor } from "./hookDispatch.js";
import { reportChainFailure } from "./dispatch/chain.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isENOENT, getErrnoCode } from "../../utils/errors.js";
import { DIFF_SIDEBAR_MIN_COLUMNS, DIFF_SIDEBAR_OPEN_COLUMNS } from "../bundled/diff/index.js";
import { stableStringifySafe } from "../../utils/hooks/hookSerialization.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { MAX_CALL_VALUE_CHARS } from "./api/sessionOps.js";
import { MCP_SERVER_NAME_RE } from "./api/operations.js";
import { hasControlCharacter } from "./ui/validateTree.js";
import { getCwd } from "../../utils/cwd.js";
import { noUncachedRoot } from "../../utils/settings/settingsStorage.js";
import { findGitRoot } from "../../utils/git.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { getPluginsDirectory } from "../../utils/plugins/pluginDirectories.js";
import { HooksError } from "./hooksErrors.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { lock, releaseLockQuietly } from "../../utils/lockfile.js";

//@ chunk-z3wfa7xm.js:1438-1448 placement
/**
 * 空对象
 */
var EMPTY_PANES = {};
//@ chunk-z3wfa7xm.js:1448-2285 placement
Ar(EMPTY_PANES, {
  ASKED_MAX: () => MAX_PANE_ID_CHARS,
  ASKED_ROW_SCHEMA: () => paneKeySchema,
  EMPTY_PANES: () => hpr,
  PANE_ID_MAX: () => MAX_PANE_ID_LEN,
  askedLatch: () => paneSlot,
  askedPaneOf: () => paneKey,
  channelsInRange: () => isLowColorIndex,
  closePane: () => dropPane,
  closePanesOf: () => closePluginPanes,
  cycledPaneId: () => cyclePaneId,
  default: () => EMPTY_PANES,
  everyPane: () => allPanes,
  focusPane: () => focusPane,
  forgetAsked: () => dismissPaneAsk,
  forgetDismissed: () => dismissIfPersonAsked,
  hasAsked: () => wasAsked,
  isToastHoldShown: () => holdsToasts,
  keepAsked: () => setPaneAsked,
  keptAsked: () => readAskedPanes,
  nextPaneId: () => nextPaneId,
  offerPlacement: () => holdPanePlacement,
  openFloor: () => paneMinWidth,
  openPane: () => openPane,
  paneCloseProblem: () => checkPaneOrigin,
  paneIdProblem: () => checkPaneId,
  paneManners: () => pickPaneOptions,
  paneOpenProblem: () => validatePaneOptions,
  panesOf: () => listPluginPanes,
  panesStore: () => paneRegistry,
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
  shownPane: () => shownPane,
  withKeptAsked: () => withAsked,
  withoutPane: () => removePanes,
});
//@ chunk-z3wfa7xm.js:2285-2927 placement
function createClientRegistry() {
  let e = new Map();
  let r = new Set();
  let n = () => [...e.values()];
  let signal = createSignal();
  return {
    attach: (s) => {
      let a = e.get(s.clientId);
      r.delete(s.clientId);
      if (a === undefined) {
        e.set(s.clientId, s);
        return true;
      }
      if (s.viewport !== undefined || s.answers !== undefined)
        e.set(s.clientId, {
          ...a,
          ...(s.viewport !== undefined && {
            viewport: {
              ...a.viewport,
              ...s.viewport,
            },
          }),
          ...(s.answers !== undefined && {
            answers: s.answers,
          }),
        });
      return false;
    },
    detach: (s) => {
      let a = e.get(s);
      e.delete(s);
      r.delete(s);
      signal.emit(s);
      return a;
    },
    hasSurface: (s) => n().some((a) => a.surface === s),
    list: n,
    surfaces: () => uniq(n().map((s) => s.surface)),
    onDetach: (s) => signal.subscribe(s),
    missed: (s) => {
      if (e.has(s)) r.add(s);
    },
    heard: (s) => void r.delete(s),
    isSilent: (s) => r.has(s),
  };
}
//@ chunk-z3wfa7xm.js:2927-2993 placement
/**
 * 面板客户端登记表
 */
var clientRegistry = identity(createClientRegistry(), (e) => {
  for (let r of e.list()) e.detach(r.clientId);
});
//@ chunk-z3wfa7xm.js:2993-3062 placement
/**
 * 全屏客户端
 */
var fullscreenClients = () => clientRegistry.list().filter((e) => e.viewport?.isFullscreen !== undefined);
//@ chunk-z3wfa7xm.js:3062-3126 placement
function listViewportClients() {
  return clientRegistry.list().filter((e) => e.viewport !== undefined);
}
//@ chunk-z3wfa7xm.js:3126-3161 placement
/**
 * 面板宿主槽
 */
var paneHostSlot = identity(createValueSlot(), (e) => e.set(undefined));
//@ chunk-z3wfa7xm.js:3161-3238 placement
function isOfficialMarketplacePlugin(pluginStorageId) {
  let { name: r, marketplace } = parsePluginIdentifier_2(pluginStorageId);
  return marketplace === BUILTIN && getBuiltinPlugin(r) !== undefined;
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
/**
 * 面板颜色
 */
var paneColorOf = (e) => (Object.hasOwn(PANE_COLORS, e) ? PANE_COLORS[e] : undefined);
//@ chunk-z3wfa7xm.js:3628-3651 placement
/**
 * 颜色或原值
 */
var resolvePaneColor = (backgroundColor) => paneColorOf(backgroundColor) ?? backgroundColor;
//@ chunk-z3wfa7xm.js:3651-3669 placement
/**
 * 是否合法主题色
 */
var isThemeColor = (e) => isValidThemeColor(e);
//@ chunk-z3wfa7xm.js:3669-3729 placement
/**
 * 合法主题名
 */
function validThemeName(e) {
  return e !== undefined && (isBuiltinTheme(e) || isThemeColor(e)) ? e : undefined;
}
//@ chunk-z3wfa7xm.js:3729-3763 placement
/**
 * 面板槽
 */
var paneSlot = identity(createValueSlot(), (e) => e.set(undefined));
//@ chunk-z3wfa7xm.js:3763-3772 placement
/**
 * 64
 */
var MAX_PANE_ID_CHARS = 64;
//@ chunk-z3wfa7xm.js:3772-3805 placement
/**
 * 组装面板键 {plugin,id}；列表与设置都按这个形状传面板标识。
 */
var paneKey = (plugin, id) => ({
  plugin,
  id,
});
//@ chunk-z3wfa7xm.js:3805-3841 placement
/**
 * 面板键 schema
 */
var paneKeySchema = DoctorLazy(() =>
  u({
    plugin: string(),
    id: string(),
  }),
);
//@ chunk-z3wfa7xm.js:3841-3918 placement
/**
 * 颜色索引不超范围
 */
var isLowColorIndex = (backgroundColor) =>
  !/^(?:rgb|ansi256)\(.*\b(?:[3-9]\d\d|2[6-9]\d|25[6-9])\b/.test(backgroundColor);
//@ chunk-z3wfa7xm.js:3918-3954 placement
/**
 * 聚焦槽
 */
var focusSlot = identity(createValueSlot(), (e) => e.set(undefined));
//@ chunk-z3wfa7xm.js:3954-3990 placement
/**
 * 放置槽
 */
var placementSlot = identity(createValueSlot(), (e) => e.set(undefined));
//@ chunk-z3wfa7xm.js:3990-4026 placement
/**
 * 询问计数槽
 */
var askSlot = identity(createValueSlot(), (e) => e.set(undefined));
//@ chunk-z3wfa7xm.js:4026-4056 placement
/**
 * 询问计数表的键 plugin\0id，与面板键分开存放询问次数。
 */
var paneAskKey = (e, r) => `${e}\x00${r}`;
//@ chunk-z3wfa7xm.js:4056-4109 placement
/**
 * 取询问计数
 */
function askCountFor(e, r) {
  return askSlot.get()?.get(paneAskKey(e, r)) ?? 0;
}
//@ chunk-z3wfa7xm.js:4109-4180 placement
/**
 * 删除若干键
 */
function withoutKeys(e, r) {
  let n = new Map(e);
  for (let i of r) n.delete(i);
  return n;
}
//@ chunk-z3wfa7xm.js:4180-4337 placement
/**
 * 标记某插件某面板需要重绘：更新渲染与可见计数，并递增其版本号。
 */
function bumpPaneRender(e, r) {
  let n = paneAskKey(e, r);
  let i = askCountFor(e, r) + 1;
  focusSlot.set(withoutKeys(focusSlot.get() ?? new Map(), [n]));
  placementSlot.set(withoutKeys(placementSlot.get() ?? new Map(), [n]));
  askSlot.set(new Map(askSlot.get()).set(n, i));
}
//@ chunk-z3wfa7xm.js:4337-4390 placement
/**
 * 插件面板登记表
 */
var paneRegistry = identity(
  () => getPluginRegistry().panes,
  (e) => e().setState(() => hpr),
);
//@ chunk-z3wfa7xm.js:4390-4807 placement
/**
 * 从面板状态中移除满足条件的面板，修正显示中/聚焦/待聚焦与关闭中列表。
 */
function removePanes(e, r) {
  let filtered = e.open.filter((l) => !r(l));
  let filtered_2 = e.unplaced.filter((l) => !r(l));
  if (filtered.length === e.open.length && filtered_2.length === e.unplaced.length) return e;
  let a = new Set([...filtered, ...filtered_2].map((l) => l.id));
  let m = (l) => (a.has(l ?? "") ? l : null);
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
/**
 * 移除面板并触发重绘
 */
function dropPane(id) {
  paneRegistry().setState((r) => removePanes(r, (n) => n.id === id));
  bumpPaneRender("Pane", id);
}
//@ chunk-z3wfa7xm.js:4876-4915 placement
/**
 * 打开与传统一放的面板
 */
var allPanes = (state) => [...state.open, ...state.unplaced];
//@ chunk-z3wfa7xm.js:4915-4990 placement
/**
 * 是否已询问过
 */
function wasAsked(e, r) {
  return e.asked.some((n) => n.id === r.id && n.plugin === r.plugin);
}
//@ chunk-z3wfa7xm.js:5036-5298 placement
function classifyPluginOrigin({ pluginStorageId, pluginRoot }) {
  let { name: n, marketplace } = parsePluginIdentifier_2(pluginStorageId);
  let s = isVouchedPolicyPluginId(pluginStorageId);
  let a = dirname(resolve(pluginRoot));
  let l = [a, dirname(a)].includes(devModsDir()) ? "dev_mods" : "plugin_dir";
  let h = s ? "managed" : marketplace === INLINE_PLUGIN_MARKETPLACE ? l : "installed";
  let A = isOfficialMarketplacePlugin(pluginStorageId) ? "builtin" : h;
  return {
    provenance: fromEnum(A),
    ...buildPluginTelemetryFields(n, marketplace, s ? new Set([n]) : null),
  };
}
//@ chunk-z3wfa7xm.js:5298-5436 placement
function readAskedPanes(e) {
  let asked = e.pluginPanes?.asked;
  return Array.isArray(asked)
    ? asked.flatMap((n) => {
        let i = paneKeySchema().safeParse(n);
        return i.success ? [i.data] : [];
      })
    : [];
}
//@ chunk-z3wfa7xm.js:5436-5497 placement
/**
 * 更新 asked 列表
 */
var withAsked = (e, asked) => ({
  ...e,
  pluginPanes: {
    ...e.pluginPanes,
    asked,
  },
});
//@ chunk-z3wfa7xm.js:5497-5832 placement
function setPaneAsked(e, r) {
  let n = r === "asked";
  let i = false;
  saveGlobalConfigDurably((s) => {
    let askedPanes = readAskedPanes(s);
    let filtered = askedPanes.filter((askedPane) => askedPane.plugin !== e.plugin || askedPane.id !== e.id);
    i = filtered.length < askedPanes.length !== n;
    return i
      ? withAsked(s, n ? [...filtered, paneKey(e.plugin, e.id)].slice(-MAX_PANE_ID_CHARS) : filtered)
      : s;
  }).then((s) => {
    if (i) {
      let a = loadedModuleArgs(e.plugin);
      let m = a && classifyPluginOrigin(a);
      if (s) logFeatureOk("plugin_function_hooks_pane_ask", m);
      else logFeatureSad("plugin_function_hooks_pane_ask", "not_persisted", m);
    }
  });
}
//@ chunk-z3wfa7xm.js:5832-5959 placement
function dismissPaneAsk(e) {
  paneRegistry().setState((r) =>
    wasAsked(r, e)
      ? {
          ...r,
          asked: r.asked.filter((n) => n.plugin !== e.plugin || n.id !== e.id),
        }
      : r,
  );
  setPaneAsked(e, "dismissed");
}
//@ chunk-z3wfa7xm.js:5959-6022 placement
/**
 * 人回答后关闭询问
 */
function dismissIfPersonAsked(id, r, plugin) {
  if (r.kind === "person" && plugin !== undefined) dismissPaneAsk(paneKey(plugin, id));
}
//@ chunk-z3wfa7xm.js:6022-6873 placement
/**
 * 关闭面板（卸载或 ui.close，钩子可保持打开）。
 */
async function closePane(id, r) {
  let state = paneRegistry().getState();
  let included = state.closing.includes(id);
  let s = r.kind === "unload";
  let plugin = allPanes(state).find((x) => x.id === id)?.plugin;
  let m = false;
  if (s) dropPane(id);
  if (included) return;
  let filtered = hookMembersFor("ui.close").filter((x) => !s || x.name !== plugin);
  if (filtered.length === 0) {
    dropPane(id);
    dismissIfPersonAsked(id, r, plugin);
    return;
  }
  if (!s)
    paneRegistry().setState((x) => ({
      ...x,
      closing: [...x.closing, id],
    }));
  try {
    let x = await reportChainFailure({
      e: {
        id,
        origin: r,
      },
      handlers: filtered,
      site: envSiteRuleFor("ui.close"),
      bottom: (P) => {
        if (P.id !== id || paneRegistry().getState().closing.includes(id)) {
          dropPane(P.id);
          m = P.id === id;
        }
        return Promise.resolve({
          value: undefined,
        });
      },
    });
    let state = paneRegistry().getState();
    if (state.closing.includes(id) && allPanes(state).some((P) => P.id === id))
      logForDebugging(
        `ui.close ${id} (${r.kind}): kept open by a hook` + (x.deny === undefined ? "" : ` (${x.deny})`),
      );
  } catch (error) {
    logForDebugging(`ui.close ${id} (${r.kind}): the chain failed: ` + errorMessage(error), {
      level: "error",
    });
  } finally {
    paneRegistry().setState((x) =>
      x.closing.includes(id)
        ? {
            ...x,
            closing: x.closing.filter((h) => h !== id),
          }
        : x,
    );
    if (m) dismissIfPersonAsked(id, r, plugin);
  }
}
//@ chunk-z3wfa7xm.js:6873-6973 placement
/**
 * 关闭某插件打开的全部面板（插件卸载时）。
 */
function closePluginPanes(e) {
  let r = allPanes(paneRegistry().getState());
  for (let n of r)
    if (n.plugin === e)
      closePane(n.id, {
        kind: "unload",
      });
}
//@ chunk-z3wfa7xm.js:6973-7103 placement
/**
 * 在打开的面板间循环：返回当前显示面板前后第 r 个的 id。
 */
function cyclePaneId(state, r) {
  let n = state.open.length;
  let index = state.open.findIndex((a) => a.id === state.shownId);
  return n > 1 && index >= 0 ? (state.open[(index + r + n) % n]?.id ?? null) : null;
}
//@ chunk-z3wfa7xm.js:7103-7335 placement
/**
 * 聚焦并显示指定面板（null 表示取消聚焦），同时清除待聚焦请求。
 */
var focusPane = (e) =>
  paneRegistry().setState((r) => {
    let n = e === null || r.open.some((m) => m.id === e);
    let i = n ? e : r.focusedId;
    let s = n && e !== null ? e : r.shownId;
    return r.focusedId === i && r.shownId === s && r.focusRequest === null
      ? r
      : {
          ...r,
          focusedId: i,
          shownId: s,
          focusRequest: null,
        };
  });
//@ chunk-z3wfa7xm.js:7335-7383 placement
/**
 * 当前显示的面板
 */
var shownPane = (e) => e.open.find((r) => r.id === e.shownId);
//@ chunk-z3wfa7xm.js:7383-7436 placement
/**
 * 面板是否接管 toast
 */
var holdsToasts = (e) => e.placements > 0 && shownPane(e)?.holdToasts === true;
//@ chunk-z3wfa7xm.js:7436-7529 placement
/**
 * 聚焦面板的下一个
 */
function nextPaneId(e) {
  let index = e.open.findIndex((n) => n.id === e.focusedId);
  return e.open[index + 1]?.id ?? null;
}
//@ chunk-z3wfa7xm.js:7529-7665 placement
/**
 * 登记一个面板放置位（计数 +1），返回释放函数。
 */
function holdPanePlacement() {
  paneRegistry().setState((e) => ({
    ...e,
    placements: e.placements + 1,
  }));
  return () =>
    paneRegistry().setState((e) => ({
      ...e,
      placements: e.placements - 1,
    }));
}
//@ chunk-z3wfa7xm.js:7665-7693 placement
/**
 * 面板最小宽度
 */
var paneMinWidth = (e, r) => (wasAsked(e, r) ? DIFF_SIDEBAR_MIN_COLUMNS : DIFF_SIDEBAR_OPEN_COLUMNS);
//@ chunk-z3wfa7xm.js:7693-7954 placement
function pickPaneOptions(e) {
  return {
    ...(e.closeOnEscape && {
      closeOnEscape: e.closeOnEscape,
    }),
    ...(e.holdToasts && {
      holdToasts: e.holdToasts,
    }),
    ...(e.backgroundColor !== undefined && {
      backgroundColor: e.backgroundColor,
    }),
    ...(e.rows !== undefined && {
      rows: e.rows,
    }),
    ...(e.columns !== undefined && {
      columns: e.columns,
    }),
  };
}
//@ chunk-z3wfa7xm.js:7954-8271 placement
/**
 * 把面板放入打开列表（已存在则替换），从未放置列表中移除，必要时设为显示中。
 */
function placePane(e, r, focusRequest) {
  let any = e.open.some((a) => a.id === r.id);
  let mapped = e.open.map((a) =>
    a.id === r.id
      ? {
          ...r,
          plugin: a.plugin,
        }
      : a,
  );
  return {
    open: any ? mapped : [...e.open, r],
    unplaced: e.unplaced.filter((a) => a.id !== r.id),
    asked: e.asked,
    shownId: any ? e.shownId : (e.focusedId ?? r.id),
    focusedId: e.focusedId,
    focusRequest,
    placements: e.placements,
    closing: e.closing,
  };
}
//@ chunk-z3wfa7xm.js:8271-8539 placement
function describePaneUnplaced() {
  let e = listViewportClients();
  if (e.length === 0) return;
  if (fullscreenClients().length > 0)
    return {
      isPlaced: true,
    };
  return {
    isPlaced: false,
    reason: `no attached surface places panes (${e.map((n) => n.clientId).join(", ")}): placed when a surface that does attaches; once they detach, as a fresh open is`,
  };
}
//@ chunk-z3wfa7xm.js:8539-8860 placement
function describePaneAskState(e, r, n) {
  let columns = paneHostSlot.get()?.columns;
  let s = paneMinWidth(e, r);
  if (columns === undefined)
    return (
      describePaneUnplaced() ?? {
        isPlaced: true,
      }
    );
  if (n || columns >= s)
    return {
      isPlaced: true,
    };
  return {
    isPlaced: false,
    reason: `unasked below ${s} columns (${columns} now${s === DIFF_SIDEBAR_MIN_COLUMNS ? ", an id the person opened before" : ""}): placed when the person opens it, or when the terminal is widened to ${s} columns`,
  };
}
//@ chunk-z3wfa7xm.js:8860-9012 placement
function loadAskedPanes() {
  if (paneSlot.get()) return;
  paneSlot.set(true);
  let askedPanes = readAskedPanes(getGlobalConfig());
  if (askedPanes.length === 0) return;
  paneRegistry().setState((r) => ({
    ...r,
    asked: [...askedPanes.filter((askedPane) => !wasAsked(r, askedPane)), ...r.asked],
  }));
}
//@ chunk-z3wfa7xm.js:9012-9950 placement
/**
 * 打开面板：校验选项、记录询问、等待布局。
 */
function openPane(e, plugin, n) {
  loadAskedPanes();
  let i = e.title ?? e.id;
  let id = e.focus === true ? e.id : undefined;
  let a = pickPaneOptions(e);
  let m = {
    id: e.id,
    plugin,
  };
  let l = (y) =>
    y?.title === i &&
    y.closeOnEscape === a.closeOnEscape &&
    y.holdToasts === a.holdToasts &&
    y.backgroundColor === a.backgroundColor &&
    y.rows === a.rows &&
    y.columns === a.columns;
  let x;
  let h = false;
  paneRegistry().setState((y) => {
    let M = n && !wasAsked(y, m);
    let found = y.open.find((C) => C.id === e.id);
    let found_2 = y.unplaced.find((C) => C.id === e.id);
    let oe = found !== undefined;
    let Me = found_2 !== undefined;
    let re = {
      id: e.id,
      plugin: found_2?.plugin ?? plugin,
    };
    x = oe
      ? {
          isPlaced: true,
        }
      : describePaneAskState(y, re, n);
    h = M;
    let isPlaced = x.isPlaced;
    let Re = l(found) && id === undefined && !M;
    let N = {
      ...re,
      title: i,
      ...a,
    };
    let se = M
      ? {
          ...y,
          asked: [...y.asked, m],
        }
      : y;
    let _e = {
      ...se,
      unplaced: Me ? y.unplaced.map((C) => (C.id === e.id ? N : C)) : [...y.unplaced, N],
    };
    let Fe = oe ? Re : !isPlaced && l(found_2) && !M;
    let je = isPlaced ? placePane(se, N, id ?? y.focusRequest) : _e;
    return Fe ? y : je;
  });
  if (h) setPaneAsked(m, "asked");
  let A = x ?? {
    isPlaced: true,
  };
  let columns = paneHostSlot.get()?.columns ?? "unmeasured";
  let Z = n ? "asked" : "unasked";
  let $e = A.isPlaced ? "placed" : `waits unplaced (${A.reason})`;
  logForDebugging(`ui.open ${plugin} ${e.id} (${Z}, ${columns} columns): ${$e}`);
  return A;
}
//@ chunk-z3wfa7xm.js:9950-10070 placement
/**
 * 校验面板参数：id 合法，origin 只能是插件（引擎来源由引擎设置）。
 */
function checkPaneOrigin(e) {
  let r =
    stableStringifySafe(e?.origin) ===
    stableStringifySafe({
      kind: "plugin",
    });
  return checkPaneId(e?.id) ?? (r ? undefined : "origin is the engine's to set");
}
//@ chunk-z3wfa7xm.js:10070-10240 placement
function checkArgv(argv) {
  return Array.isArray(argv) && argv.length > 0 && argv.every((n) => typeof n === "string") && argv[0] !== ""
    ? undefined
    : "takes argv, a non-empty list of strings naming the command first";
}
//@ chunk-z3wfa7xm.js:10240-10368 placement
function checkStringRecord(env, r) {
  return env === undefined || (isPlainObject(env) && Object.values(env).every((i) => typeof i === "string"))
    ? undefined
    : `${r} is an object of strings`;
}
//@ chunk-z3wfa7xm.js:10368-10556 placement
/**
 * 校验 $.flag.value 参数：需要 name 与 fallback。
 */
function checkFlagValueArgs(e) {
  let r = typeof e?.name !== "string" || e.name === "";
  let n = e?.fallback === undefined;
  return r
    ? "takes the flag's name"
    : n
      ? "takes a fallback, the value where the flag table has no say"
      : undefined;
}
//@ chunk-z3wfa7xm.js:10556-10601 placement
/**
 * 非字符串参数
 */
var isObjectArg = (e) => e !== undefined && typeof e !== "string";
//@ chunk-z3wfa7xm.js:10601-10678 placement
/**
 * 1..n 的整数
 */
function isPositiveIntUpTo(timeoutMs, r) {
  return typeof timeoutMs === "number" && Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= r;
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
  if (typeof n !== "string")
    return `value is not JSON data: ${e === undefined ? "undefined" : `a ${typeof e}`}`;
  return n.length > MAX_CALL_VALUE_CHARS
    ? `the value is ${n.length} characters, over the ${MAX_CALL_VALUE_CHARS} limit`
    : undefined;
}
//@ chunk-z3wfa7xm.js:10953-11022 placement
/**
 * 校验 key 参数
 */
function checkKeyArg(e) {
  return typeof e?.key === "string" ? undefined : "takes a key";
}
//@ chunk-z3wfa7xm.js:11022-11256 placement
function validateAgentIdArg(e) {
  let agentId = e?.agentId;
  let as = e?.as;
  let i = agentId === undefined || (typeof agentId === "string" && agentId !== "");
  let s = as === undefined || as === "api";
  if (!i) return `takes agentId, a non-empty string (got ${String(agentId)})`;
  return s ? undefined : `takes as "api" or none (got ${String(as)})`;
}
//@ chunk-z3wfa7xm.js:11303-11795 placement
function validateNamesArg(e) {
  let names = e?.names;
  if (!Array.isArray(names)) return "takes names, a list of relative .md file names";
  for (let n of ["of", "below"]) {
    let i = e?.[n];
    if (i !== undefined && (typeof i !== "string" || i === "")) return `takes ${n}, a path, when given`;
  }
  for (let name of names) {
    if (typeof name !== "string" || !name.toLowerCase().endsWith(".md"))
      return `takes names, each a .md file name (${JSON.stringify(name)})`;
    if (isAbsolute(name) || win32.isAbsolute(name) || name.split(/[\\/]/).includes(".."))
      return `takes names, each relative with no ".." (${name})`;
  }
  return;
}
//@ chunk-z3wfa7xm.js:11795-11882 placement
/**
 * 校验 path 参数
 */
function checkPathArg(e) {
  let path = e?.path;
  return typeof path !== "string" || path === "" ? "takes a path" : undefined;
}
//@ chunk-z3wfa7xm.js:11882-11988 placement
/**
 * 校验 $.fs.read 参数：路径合法，as 为 text 或 bytes。
 */
function checkFsReadArgs(e) {
  let r = e?.as === "text" || e?.as === "bytes";
  return checkPathArg(e) ?? (r ? undefined : 'as is "text" or "bytes"');
}
//@ chunk-z3wfa7xm.js:11988-12093 placement
/**
 * 校验 $.fs.stat 参数：路径合法，resolve 为布尔。
 */
function checkFsStatArgs(e) {
  let r = typeof e?.resolve === "boolean";
  return checkPathArg(e) ?? (r ? undefined : "resolve is true or false");
}
//@ chunk-z3wfa7xm.js:12093-12108 placement
/**
 * 进程 init.timeoutMs 的上限 600000 毫秒（10 分钟），超出即报参数错误。
 */
var MAX_PROCESS_TIMEOUT_MS = 600000;
//@ chunk-z3wfa7xm.js:12108-12596 placement
function validateSpawnInit(e) {
  let r = checkArgv(e?.argv);
  if (r !== undefined) return r;
  let init = e?.init;
  if (init === undefined) return;
  if (!isPlainObject(init)) return "takes init, { cwd?, env?, stdin?, timeoutMs? }";
  if (init.cwd !== undefined && (typeof init.cwd !== "string" || init.cwd === ""))
    return "init.cwd is a non-empty path";
  let s = checkStringRecord(init.env, "init.env");
  if (s !== undefined) return s;
  if (init.stdin !== undefined && typeof init.stdin !== "string") return "init.stdin is a string";
  return init.timeoutMs !== undefined && !isPositiveIntUpTo(init.timeoutMs, MAX_PROCESS_TIMEOUT_MS)
    ? `init.timeoutMs is a whole number of ms, 1 to ${MAX_PROCESS_TIMEOUT_MS}`
    : undefined;
}
//@ chunk-z3wfa7xm.js:12596-12870 placement
function validateExecArgs(e) {
  if (!isPlainObject(e)) return "takes { argv, cwd?, env?, input? }";
  let { argv, cwd, env, input } = e;
  let a = cwd !== undefined && (typeof cwd !== "string" || cwd === "");
  let m = input !== undefined && typeof input !== "string";
  return (
    checkArgv(argv) ??
    (a ? "cwd is a non-empty path" : undefined) ??
    checkStringRecord(env, "env") ??
    (m ? "input is a string" : undefined)
  );
}
//@ chunk-z3wfa7xm.js:12870-13083 placement
function validateToolRegistration(e) {
  let r = e?.name;
  let description = e?.description;
  let i = typeof r !== "string" || !MCP_SERVER_NAME_RE.test(r);
  let s = typeof description === "string" && !!description.trim();
  return (
    (i ? "name is letters, digits, _ or - (up to 64)" : undefined) ?? (s ? undefined : "needs a description")
  );
}
//@ chunk-z3wfa7xm.js:13083-13118 placement
/**
 * 值须可 JSON 序列化
 */
var checkValueJson = (e) => checkKeyArg(e) ?? describeNonJsonValue(e?.value);
//@ chunk-z3wfa7xm.js:13118-13264 placement
/**
 * 校验工具 inputSchema：必须是可 JSON 序列化的对象。
 */
function checkInputSchema(inputSchema) {
  if (!isPlainObject(inputSchema)) return "inputSchema must be a JSON schema object";
  try {
    jsonStringify(inputSchema);
    return;
  } catch (error) {
    return `inputSchema is not JSON data: ${errorMessage(error)}`;
  }
}
//@ chunk-z3wfa7xm.js:13264-13326 placement
/**
 * text 必须字符串
 */
var checkTextArg = (e) => (typeof e === "string" ? undefined : "takes a string text");
//@ chunk-z3wfa7xm.js:13326-13613 placement
function validateBreakdownArg(e) {
  let breakdown = e?.breakdown;
  let columns = e?.columns;
  if (!(breakdown === undefined || breakdown === "summary" || breakdown === "full"))
    return `takes breakdown "summary" or "full" (got ${String(breakdown)})`;
  return columns === undefined || (typeof columns === "number" && Number.isInteger(columns) && columns > 0)
    ? undefined
    : `takes columns, a positive whole number (got ${String(columns)})`;
}
//@ chunk-z3wfa7xm.js:13613-14298 placement
function validatePaneOptions(e) {
  let title = e?.title;
  let n = title !== undefined;
  let i = typeof title === "string" && hasControlCharacter(title);
  let found = ["focus", "closeOnEscape", "holdToasts"].find((x) => e?.[x] !== undefined && e[x] !== true);
  let backgroundColor = e?.backgroundColor;
  let m =
    backgroundColor === undefined ||
    backgroundColor === "transparent" ||
    (typeof backgroundColor === "string" &&
      !/[^\S ]/.test(backgroundColor) &&
      validThemeName(resolvePaneColor(backgroundColor)) !== undefined &&
      isLowColorIndex(backgroundColor));
  let found_2 = ["rows", "columns"].find((x) => {
    let h = e?.[x];
    return h !== undefined && !(typeof h === "number" && Number.isInteger(h) && h > 0);
  });
  return (
    checkPaneId(e?.id) ??
    (n ? checkTextArg(title) : undefined) ??
    (i ? "title holds a control character" : undefined) ??
    (found === undefined ? undefined : `${found} is true or left out`) ??
    (found_2 === undefined
      ? undefined
      : `${found_2} is a positive whole number or left out (got ${String(e?.[found_2])})`) ??
    (m ? undefined : 'backgroundColor is a theme key, a raw color or "transparent"')
  );
}
//@ chunk-z3wfa7xm.js:14298-14530 placement
/**
 * 列出某插件的面板（id、标题、是否显示、聚焦、已放置），冻结返回。
 */
function listPluginPanes(plugin) {
  let state = paneRegistry().getState();
  let n = new Set(state.open);
  return Object.freeze(
    allPanes(state)
      .filter((i) => i.plugin === plugin)
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
  let unplaced = paneRegistry().getState().unplaced;
  paneRegistry().setState((i) =>
    i.unplaced
      .filter((s) => e >= paneMinWidth(i, s))
      .reduce((acc, a) => placePane(acc, a, acc.focusRequest), i),
  );
  let n = new Set(paneRegistry().getState().open);
  for (let i of unplaced.filter((s) => n.has(s)))
    logForDebugging(`ui.open ${i.plugin} ${i.id} (waiting, ${e} columns): placed`);
}
//@ chunk-z3wfa7xm.js:14808-15020 placement
/**
 * 有放置位后，把等待中的面板全部放置并记录日志。
 */
function placeWaitingPanes(e) {
  let unplaced = paneRegistry().getState().unplaced;
  if (unplaced.length === 0) return;
  paneRegistry().setState((n) => n.unplaced.reduce((acc, s) => placePane(acc, s, acc.focusRequest), n));
  for (let n of unplaced) logForDebugging(`ui.open ${n.plugin} ${n.id} (waiting, ${e}): placed`);
}
//@ chunk-z3wfa7xm.js:15020-15136 placement
/**
 * 记录插件已询问过打开某面板（持久化到全局配置）。
 */
function markPaneAsked(e) {
  loadAskedPanes();
  let r = false;
  paneRegistry().setState((n) => {
    r = !wasAsked(n, e);
    return r
      ? {
          ...n,
          asked: [
            ...n.asked,
            {
              ...e,
            },
          ],
        }
      : n;
  });
  if (r) setPaneAsked(e, "asked");
}
//@ chunk-z3wfa7xm.js:15136-15263 placement
/**
 * 处理待聚焦请求：接受则聚焦该面板，否则清除请求。
 */
function settleFocusRequest(e) {
  let { focusRequest } = paneRegistry().getState();
  if (focusRequest === null) return;
  if (e) focusPane(focusRequest);
  else
    paneRegistry().setState((n) => ({
      ...n,
      focusRequest: null,
    }));
}
//@ chunk-z3wfa7xm.js:15263-15394 placement
/**
 * 把指定的已打开面板设为显示中（已聚焦时一并转移焦点）。
 */
var showPane = (e) =>
  paneRegistry().setState((r) =>
    r.shownId === e || !r.open.some((i) => i.id === e)
      ? r
      : {
          ...r,
          shownId: e,
          focusedId: r.focusedId === null ? null : e,
        },
  );
//@ chunk-z3wfa7xm.js:15394-15450 placement
/**
 * 项目根目录
 */
function projectRootFor(e) {
  let r = e ?? getCwd();
  return noUncachedRoot(r) ?? findGitRoot(r) ?? getOriginalCwd();
}
//@ chunk-z3wfa7xm.js:15450-15484 placement
/**
 * 吞掉 rejection
 */
var swallow = (e) =>
  e.catch(() => {
    return;
  });
//@ chunk-z3wfa7xm.js:15484-15571 placement
/**
 * 串行任务队列
 */
function createSerialQueue() {
  let resolved = Promise.resolve();
  return (r) => {
    let n = resolved.then(r, r);
    resolved = swallow(n);
    return n;
  };
}
//@ chunk-z3wfa7xm.js:15571-15624 placement
/**
 * con/prn/aux/nul/com1…
 */
var WINDOWS_RESERVED_NAME_RE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
//@ chunk-z3wfa7xm.js:15624-15634 placement
/**
 * 64
 */
var MAX_STORE_KEY_CHARS = 64;
//@ chunk-z3wfa7xm.js:15634-15644 placement
/**
 * 12
 */
var MAX_STORE_DEPTH = 12;
//@ chunk-z3wfa7xm.js:15644-15789 placement
var STORE_LOCK_OPTIONS = {
  realpath: false,
  retries: {
    retries: 10,
    minTimeout: 5,
    maxTimeout: 100,
  },
  onCompromised: (e) => {
    logForDebugging(`$.store lock compromised: ${errorMessage(e)}`, {
      level: "warn",
    });
  },
};
//@ chunk-z3wfa7xm.js:15789-15872 placement
/**
 * 按键串行队列
 */
function keyedQueueFactory() {
  let e = new Map();
  return (r) => {
    let n = e.get(r) ?? createSerialQueue();
    e.set(r, n);
    return n;
  };
}
//@ chunk-z3wfa7xm.js:15872-15896 placement
/**
 * 存储键格式
 */
var STORE_KEY_RE = /^[a-z0-9._-]+$/;
//@ chunk-z3wfa7xm.js:15896-15908 placement
/**
 * 插件串行队列
 */
var pluginQueue = keyedQueueFactory();
//@ chunk-z3wfa7xm.js:16043-16271 placement
function pluginStoreFileName(e) {
  if (
    STORE_KEY_RE.test(e) &&
    !WINDOWS_RESERVED_NAME_RE.test(e) &&
    e.length <= MAX_STORE_KEY_CHARS &&
    e !== "." &&
    e !== ".."
  )
    return `${e}.json`;
  let replaced = e.replace(/[^a-zA-Z0-9_-]/g, "_");
  let sliced = createHash("sha256").update(e).digest("hex").slice(0, MAX_STORE_DEPTH);
  return `${replaced.slice(0, MAX_STORE_KEY_CHARS) || "plugin"}-${sliced}.json`;
}
//@ chunk-z3wfa7xm.js:16271-16305 placement
/**
 * 插件存储文件路径
 */
var pluginStorePath = (e) => join(getPluginsDirectory(), "store", pluginStoreFileName(e));
//@ chunk-z3wfa7xm.js:16305-16386 placement
/**
 * 创建存储目录
 */
async function ensurePluginStoreDir(e) {
  let r = pluginStorePath(e);
  await mkdir(dirname(r), {
    recursive: true,
    mode: 448,
  });
  return r;
}
//@ chunk-z3wfa7xm.js:16424-16558 placement
async function touchStoreFile(e, r) {
  let date = new Date();
  try {
    await utimes(r, date, date);
  } catch (error) {
    logForDebugging(`$.store (${e}): could not touch ${r}: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-z3wfa7xm.js:16791-16908 placement
async function readStoreFile(e) {
  let r = await readFile(pluginStorePath(e), "utf8").catch((error) => {
    if (isENOENT(error)) return;
    throw error;
  });
  return r === undefined ? undefined : [e, r];
}
//@ chunk-z3wfa7xm.js:16908-17472 placement
async function writePluginStore(e) {
  let reduced = await legacyPluginIds(e).reduce(
    async (acc, l) => (await acc) ?? readStoreFile(l),
    Promise.resolve(undefined),
  );
  if (reduced === undefined) return false;
  let [n, i] = reduced;
  let s = pluginStorePath(e);
  let a = `${s}.carry-${randomUUID()}`;
  try {
    if (!isPlainObject(jsonParse(i))) return false;
    await mkdir(dirname(s), {
      recursive: true,
    });
    await writeFile(a, i, {
      flag: "wx",
    });
    await link(a, s).catch(async (error) => {
      if (getErrnoCode(error) === "EEXIST") throw error;
      await copyFile(a, s, constants.COPYFILE_EXCL);
    });
    return true;
  } catch (error) {
    let l = getErrnoCode(error) === "EEXIST";
    logForDebugging(
      `$.store (${e}): ` +
        (l
          ? `${n}'s store was carried by another session`
          : `could not carry ${n}'s store: ${errorMessage(error)}`),
      {
        level: l ? "debug" : "warn",
      },
    );
    return l;
  } finally {
    await unlink(a).catch(() => {
      return;
    });
  }
}
//@ chunk-z3wfa7xm.js:17512-17677 placement
async function readStoreWithMigration(e, r) {
  try {
    return await readFile(r, "utf8");
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  if (!(await writePluginStore(e))) return;
  try {
    return await readFile(r, "utf8");
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
}
//@ chunk-z3wfa7xm.js:17677-18162 placement
var PLUGIN_STORE_ERRORS = {
  async read(e) {
    let r = pluginStorePath(e);
    let n;
    try {
      n = await readStoreWithMigration(e, r);
    } catch (error) {
      throw new HooksError(`${e}: store file ${r} is unreadable (${errorMessage(error)})`);
    }
    if (n === undefined) return {};
    let i;
    try {
      i = jsonParse(n);
    } catch (error) {
      throw new HooksError(`${e}: store file ${r} is malformed (${errorMessage(error)})`);
    }
    if (!isPlainObject(i))
      throw new HooksError(`${e}: store file ${r} is malformed (the JSON is not an object)`);
    await touchStoreFile(e, r);
    return i;
  },
  write: async (e, r) =>
    writeFileAtomic(
      await ensurePluginStoreDir(e),
      `${jsonStringify(r, null, 2)}
`,
      384,
    ),
  async lock(e) {
    let pluginStoreDir = await ensurePluginStoreDir(e);
    return lock(pluginStoreDir, {
      lockfilePath: `${pluginStoreDir}.lock`,
      ...STORE_LOCK_OPTIONS,
    });
  },
};
//@ chunk-z3wfa7xm.js:18162-18234 placement
/**
 * 存储后端句柄
 */
function storeBackend() {
  let valueSlot = createValueSlot();
  return {
    setBackend: valueSlot.set,
    backendOverride: valueSlot.get,
  };
}
//@ chunk-z3wfa7xm.js:18234-18246 placement
/**
 * 存储后端引用
 */
var storeBackendRef = storeBackend();
//@ chunk-z3wfa7xm.js:18246-18282 placement
/**
 * 存储错误文本表
 */
var storeErrors = () => storeBackendRef.backendOverride() ?? PLUGIN_STORE_ERRORS;
//@ chunk-z3wfa7xm.js:18282-18292 placement
/**
 * 256
 */
var MAX_STORE_KEYS = 256;
//@ chunk-z3wfa7xm.js:18292-19125 placement
/**
 * 应用 $.store 事件（键长度上限、keys 事件）。
 */
async function applyStoreEvent(e, r) {
  try {
    if (e.event !== "keys" && e.key.length > MAX_STORE_KEYS)
      throw new HooksError(
        `${r}: $.store.${e.event}: the key is ${e.key.length} characters, over the ${MAX_STORE_KEYS} limit`,
      );
    let n = storeErrors();
    let s = e.event === "set" || e.event === "delete" ? await n.lock?.(r) : undefined;
    try {
      let a = await n.read(r);
      switch (e.event) {
        case "get":
          return Object.hasOwn(a, e.key) ? a[e.key] : undefined;
        case "keys":
          return Object.keys(a);
        case "set": {
          let m = {
            ...a,
            [e.key]: e.value,
          };
          let l = jsonStringify(m).length;
          if (l > MAX_CALL_VALUE_CHARS)
            throw new HooksError(
              `${r}: $.store.set: the store would be ${l} characters, over the ${MAX_CALL_VALUE_CHARS} limit`,
            );
          await n.write(r, m);
          logForDebugging(`$.store.set (${r}): ${e.key}`);
          return;
        }
        case "delete": {
          if (!Object.hasOwn(a, e.key)) return;
          let m = {
            ...a,
          };
          delete m[e.key];
          await n.write(r, m);
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
/**
 * 排队应用存储事件
 */
var storeEventQueued = (e, r) => pluginQueue(r)(() => applyStoreEvent(e, r));
export {
  clientRegistry,
  shownPane,
  paneRegistry,
  validThemeName,
  resolvePaneColor,
  closePane,
  focusPane,
  showPane,
  cyclePaneId,
  askCountFor,
  EMPTY_PANES,
  holdsToasts,
  focusSlot,
  bumpPaneRender,
  placementSlot,
  askSlot,
  paneAskKey,
  withoutKeys,
  settleFocusRequest,
  nextPaneId,
  paneHostSlot,
  describePanePlaced,
  fullscreenClients,
  allPanes,
  storeEventQueued,
  markPaneAsked,
  paneKey,
  isOfficialMarketplacePlugin,
  PANE_COLORS,
  paneColorOf,
  classifyPluginOrigin,
  projectRootFor,
  checkFlagValueArgs,
  validateNamesArg,
  checkPathArg,
  checkFsReadArgs,
  checkFsStatArgs,
  createSerialQueue,
  MAX_PROCESS_TIMEOUT_MS,
  checkTextArg,
  validateAgentIdArg,
  validateBreakdownArg,
  isObjectArg,
  validateToolRegistration,
  checkInputSchema,
  isPositiveIntUpTo,
  validatePaneOptions,
  openPane,
  checkPaneOrigin,
  dropPane,
  listPluginPanes,
  checkKeyArg,
  checkValueJson,
  validateSpawnInit,
  validateExecArgs,
  closePluginPanes,
  describeNonJsonValue,
  holdPanePlacement,
  placeWaitingPanes,
  describePaneUnplaced,
};

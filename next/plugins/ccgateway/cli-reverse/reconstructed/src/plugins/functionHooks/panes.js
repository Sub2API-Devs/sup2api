/**
 * plugins/functionHooks/panes.ts
 *
 * 2.1.316 新增：函数钩子插件的面板（pane）管理：ui.open/ui.close、面板询问记录（asked）、客户端附着、插件存储（$.store）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-k4mxxz7x.js (108)
 * attribution: placement 103, layout 5
 */
import { dirname, resolve, isAbsolute, win32, join } from "path";
import { createHash, randomUUID } from "crypto";
import { mkdir, utimes, readFile, writeFile, link, copyFile, unlink } from "fs/promises";
import { constants } from "fs";
import { __export } from "../../../runtime/bun-runtime.js";
import { EMPTY_PLUGIN_LOAD_LISTS, getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { MAX_PANE_ID_LEN, checkPaneId, envSiteRuleFor } from "./sites/siteRules.js";
import { createSignal } from "../../utils/signal.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { identity } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { parsePluginIdentifier_2, legacyPluginIds } from "../../utils/plugins/pluginIdentifier.js";
import {
  BUILTIN,
  INLINE_PLUGIN_MARKETPLACE,
  buildPluginTelemetryFields,
} from "../../utils/telemetry/pluginTelemetry.js";
import { getBuiltinPlugin } from "../builtinPlugins.js";
import { isValidThemeColor } from "../../utils/ink.js";
import { isBuiltinTheme } from "../../utils/theme.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-k4mxxz7x.js:1438-1448 placement
/**
 * 空对象
 */
var EMPTY_PANES = {};
//@ chunk-k4mxxz7x.js:1448-2285 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-k4mxxz7x.js:1448", () => {
  __export(EMPTY_PANES, {
    ASKED_MAX: () => MAX_PANE_ID_CHARS,
    ASKED_ROW_SCHEMA: () => paneKeySchema,
    EMPTY_PANES: () => EMPTY_PLUGIN_LOAD_LISTS,
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
});
//@ chunk-k4mxxz7x.js:2285-2982 placement
function createClientRegistry() {
  let clientsById = new Map();
  let silentIds = new Set();
  let allClients = () => [...clientsById.values()];
  let signal = createSignal();
  return {
    attach: (client) => {
      let existing = clientsById.get(client.clientId);
      silentIds.delete(client.clientId);
      if (existing === undefined) {
        clientsById.set(client.clientId, client);
        return true;
      }
      if (client.viewport !== undefined || client.answers !== undefined || client.draws !== undefined)
        clientsById.set(client.clientId, {
          ...existing,
          ...(client.viewport !== undefined && {
            viewport: {
              ...existing.viewport,
              ...client.viewport,
            },
          }),
          ...(client.answers !== undefined && {
            answers: client.answers,
          }),
          ...(client.draws !== undefined && {
            draws: client.draws,
          }),
        });
      return false;
    },
    detach: (clientId) => {
      let detached = clientsById.get(clientId);
      clientsById.delete(clientId);
      silentIds.delete(clientId);
      signal.emit(clientId);
      return detached;
    },
    hasSurface: (surface) => allClients().some((client) => client.surface === surface),
    list: allClients,
    surfaces: () => normalizeCaseForComparison_2(allClients().map((client) => client.surface)),
    onDetach: (listener) => signal.subscribe(listener),
    missed: (clientId) => {
      if (clientsById.has(clientId)) silentIds.add(clientId);
    },
    heard: (clientId) => void silentIds.delete(clientId),
    isSilent: (clientId) => silentIds.has(clientId),
  };
}
//@ chunk-k4mxxz7x.js:2982-3048 placement
/**
 * 面板客户端登记表
 */
var clientRegistry; // deferred: uses createClientRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-k4mxxz7x.js:2982", () => {
  clientRegistry = identity(createClientRegistry(), (registry) => {
    for (let client of registry.list()) registry.detach(client.clientId);
  });
});
//@ chunk-k4mxxz7x.js:3048-3088 layout
var KEYED_DRAW_TYPES = {
  Backdrop: true,
  Input: true,
  Select: true,
};
//@ chunk-k4mxxz7x.js:3088-3167 layout
function normalizeDraws(draws) {
  return draws === undefined
    ? undefined
    : normalizeCaseForComparison_2(draws.filter((draw) => Object.hasOwn(KEYED_DRAW_TYPES, draw)));
}
//@ chunk-k4mxxz7x.js:3167-3230 layout
var EMPTY_COLUMN_BOX = {
  type: "Box",
  props: {
    flexDirection: "column",
  },
  children: [],
};
//@ chunk-k4mxxz7x.js:3230-3279 layout
function isInputLike(type) {
  return type === "Input" || type === "Select";
}
//@ chunk-k4mxxz7x.js:3279-3534 layout
function blockInputsOnMobile(node, surface, supportedTypes) {
  if (surface !== "mobile") return node;
  if (isInputLike(node.type)) return supportedTypes?.includes(node.type) === true ? node : EMPTY_COLUMN_BOX;
  if (node.type !== "Box") return node;
  let { children } = node;
  let mapped = children?.map((child) =>
    typeof child === "string" ? child : blockInputsOnMobile(child, surface, supportedTypes),
  );
  return mapped !== undefined && mapped.some((mapped, index) => mapped !== children?.[index])
    ? {
        ...node,
        children: mapped,
      }
    : node;
}
//@ chunk-k4mxxz7x.js:3534-3603 placement
/**
 * 全屏客户端
 */
var fullscreenClients = () =>
  clientRegistry.list().filter((client) => client.viewport?.isFullscreen !== undefined);
//@ chunk-k4mxxz7x.js:3603-3667 placement
function listViewportClients() {
  return clientRegistry.list().filter((client) => client.viewport !== undefined);
}
//@ chunk-k4mxxz7x.js:3667-3702 placement
/**
 * 面板宿主槽
 */
var paneHostSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-k4mxxz7x.js:3667", () => {
  paneHostSlot = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-k4mxxz7x.js:3702-3779 placement
function isOfficialMarketplacePlugin(pluginStorageId) {
  let { name, marketplace } = parsePluginIdentifier_2(pluginStorageId);
  return marketplace === BUILTIN && getBuiltinPlugin(name) !== undefined;
}
//@ chunk-k4mxxz7x.js:3779-4121 placement
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
//@ chunk-k4mxxz7x.js:4121-4169 placement
/**
 * 面板颜色
 */
var paneColorOf = (colorName) => (Object.hasOwn(PANE_COLORS, colorName) ? PANE_COLORS[colorName] : undefined);
//@ chunk-k4mxxz7x.js:4169-4192 placement
/**
 * 颜色或原值
 */
var resolvePaneColor = (colorName) => paneColorOf(colorName) ?? colorName;
//@ chunk-k4mxxz7x.js:4192-4210 placement
/**
 * 是否合法主题色
 */
var isThemeColor = (color) => isValidThemeColor(color);
//@ chunk-k4mxxz7x.js:4210-4270 placement
/**
 * 合法主题名
 */
function validThemeName(themeName) {
  return themeName !== undefined && (isBuiltinTheme(themeName) || isThemeColor(themeName))
    ? themeName
    : undefined;
}
//@ chunk-k4mxxz7x.js:4270-4304 placement
/**
 * 面板槽
 */
var paneSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-k4mxxz7x.js:4270", () => {
  paneSlot = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-k4mxxz7x.js:4304-4313 placement
/**
 * 64
 */
var MAX_PANE_ID_CHARS = 64;
//@ chunk-k4mxxz7x.js:4313-4346 placement
/**
 * 组装面板键 {plugin,id}；列表与设置都按这个形状传面板标识。
 */
var paneKey = (plugin, id) => ({
  plugin,
  id,
});
//@ chunk-k4mxxz7x.js:4346-4382 placement
/**
 * 面板键 schema
 */
var paneKeySchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-k4mxxz7x.js:4346", () => {
  paneKeySchema = DoctorLazy(() =>
    objectSchema({
      plugin: stringSchema(),
      id: stringSchema(),
    }),
  );
});
//@ chunk-k4mxxz7x.js:4382-4459 placement
/**
 * 颜色索引不超范围
 */
var isLowColorIndex = (backgroundColor) =>
  !/^(?:rgb|ansi256)\(.*\b(?:[3-9]\d\d|2[6-9]\d|25[6-9])\b/.test(backgroundColor);
//@ chunk-k4mxxz7x.js:4459-4495 placement
/**
 * 聚焦槽
 */
var focusSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-k4mxxz7x.js:4459", () => {
  focusSlot = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-k4mxxz7x.js:4495-4531 placement
/**
 * 放置槽
 */
var placementSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-k4mxxz7x.js:4495", () => {
  placementSlot = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-k4mxxz7x.js:4531-4567 placement
/**
 * 询问计数槽
 */
var askSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-k4mxxz7x.js:4531", () => {
  askSlot = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-k4mxxz7x.js:4567-4597 placement
/**
 * 询问计数表的键 plugin\0id，与面板键分开存放询问次数。
 */
var paneAskKey = (surface, paneId) => `${surface}\x00${paneId}`;
//@ chunk-k4mxxz7x.js:4597-4650 placement
/**
 * 取询问计数
 */
function askCountFor(surface, paneId) {
  return askSlot.get()?.get(paneAskKey(surface, paneId)) ?? 0;
}
//@ chunk-k4mxxz7x.js:4650-4721 placement
/**
 * 删除若干键
 */
function withoutKeys(map, keys) {
  let copy = new Map(map);
  for (let key of keys) copy.delete(key);
  return copy;
}
//@ chunk-k4mxxz7x.js:4721-4878 placement
/**
 * 标记某插件某面板需要重绘：更新渲染与可见计数，并递增其版本号。
 */
function bumpPaneRender(surface, paneId) {
  let askKey = paneAskKey(surface, paneId);
  let nextCount = askCountFor(surface, paneId) + 1;
  focusSlot.set(withoutKeys(focusSlot.get() ?? new Map(), [askKey]));
  placementSlot.set(withoutKeys(placementSlot.get() ?? new Map(), [askKey]));
  askSlot.set(new Map(askSlot.get()).set(askKey, nextCount));
}
//@ chunk-k4mxxz7x.js:4878-4931 placement
/**
 * 插件面板登记表
 */
var paneRegistry; // deferred: uses getPluginRegistry (../../utils/plugins/pluginLoadState.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-k4mxxz7x.js:4878", () => {
  paneRegistry = identity(
    () => getPluginRegistry().panes,
    (panes) => panes().setState(() => EMPTY_PLUGIN_LOAD_LISTS),
  );
});
//@ chunk-k4mxxz7x.js:4931-5348 placement
/**
 * 从面板状态中移除满足条件的面板，修正显示中/聚焦/待聚焦与关闭中列表。
 */
function removePanes(state, shouldRemove) {
  let filtered = state.open.filter((pane) => !shouldRemove(pane));
  let filtered_2 = state.unplaced.filter((pane) => !shouldRemove(pane));
  if (filtered.length === state.open.length && filtered_2.length === state.unplaced.length) return state;
  let removedIds = new Set([...filtered, ...filtered_2].map((pane) => pane.id));
  let keepIfPresent = (paneId) => (removedIds.has(paneId ?? "") ? paneId : null);
  return {
    open: filtered,
    unplaced: filtered_2,
    asked: state.asked,
    shownId: keepIfPresent(state.shownId) ?? filtered.at(-1)?.id ?? null,
    focusedId: keepIfPresent(state.focusedId),
    focusRequest: keepIfPresent(state.focusRequest),
    placements: state.placements,
    closing: state.closing.filter((paneId) => removedIds.has(paneId)),
  };
}
//@ chunk-k4mxxz7x.js:5348-5417 placement
/**
 * 移除面板并触发重绘
 */
function dropPane(paneId) {
  paneRegistry().setState((state) => removePanes(state, (pane) => pane.id === paneId));
  bumpPaneRender("Pane", paneId);
}
//@ chunk-k4mxxz7x.js:5417-5456 placement
/**
 * 打开与传统一放的面板
 */
var allPanes = (state) => [...state.open, ...state.unplaced];
//@ chunk-k4mxxz7x.js:5456-5531 placement
/**
 * 是否已询问过
 */
function wasAsked(state, pane) {
  return state.asked.some((askedPane) => askedPane.id === pane.id && askedPane.plugin === pane.plugin);
}
//@ chunk-k4mxxz7x.js:5577-5839 placement
function classifyPluginOrigin({ pluginStorageId, pluginRoot }) {
  let { name, marketplace } = parsePluginIdentifier_2(pluginStorageId);
  let isVouched = isVouchedPolicyPluginId(pluginStorageId);
  let parentDir = dirname(resolve(pluginRoot));
  let rootKind = [parentDir, dirname(parentDir)].includes(devModsDir()) ? "dev_mods" : "plugin_dir";
  let provenance = isVouched ? "managed" : marketplace === INLINE_PLUGIN_MARKETPLACE ? rootKind : "installed";
  let finalProvenance = isOfficialMarketplacePlugin(pluginStorageId) ? "builtin" : provenance;
  return {
    provenance: fromEnum(finalProvenance),
    ...buildPluginTelemetryFields(name, marketplace, isVouched ? new Set([name]) : null),
  };
}
//@ chunk-k4mxxz7x.js:5839-5977 placement
function readAskedPanes(config) {
  let asked = config.pluginPanes?.asked;
  return Array.isArray(asked)
    ? asked.flatMap((entry) => {
        let parsed = paneKeySchema().safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
}
//@ chunk-k4mxxz7x.js:5977-6038 placement
/**
 * 更新 asked 列表
 */
var withAsked = (config, asked) => ({
  ...config,
  pluginPanes: {
    ...config.pluginPanes,
    asked,
  },
});
//@ chunk-k4mxxz7x.js:6038-6373 placement
function setPaneAsked(paneRef, status) {
  let markAsked = status === "asked";
  let changed = false;
  saveGlobalConfigDurably((config) => {
    let askedPanes = readAskedPanes(config);
    let filtered = askedPanes.filter(
      (askedPane) => askedPane.plugin !== paneRef.plugin || askedPane.id !== paneRef.id,
    );
    changed = filtered.length < askedPanes.length !== markAsked;
    return changed
      ? withAsked(
          config,
          markAsked ? [...filtered, paneKey(paneRef.plugin, paneRef.id)].slice(-MAX_PANE_ID_CHARS) : filtered,
        )
      : config;
  }).then((saved) => {
    if (changed) {
      let pluginArgs = loadedModuleArgs(paneRef.plugin);
      let origin = pluginArgs && classifyPluginOrigin(pluginArgs);
      if (saved) logFeatureOk("plugin_function_hooks_pane_ask", origin);
      else logFeatureSad("plugin_function_hooks_pane_ask", "not_persisted", origin);
    }
  });
}
//@ chunk-k4mxxz7x.js:6373-6500 placement
function dismissPaneAsk(paneKey) {
  paneRegistry().setState((state) =>
    wasAsked(state, paneKey)
      ? {
          ...state,
          asked: state.asked.filter(
            (askedPane) => askedPane.plugin !== paneKey.plugin || askedPane.id !== paneKey.id,
          ),
        }
      : state,
  );
  setPaneAsked(paneKey, "dismissed");
}
//@ chunk-k4mxxz7x.js:6500-6563 placement
/**
 * 人回答后关闭询问
 */
function dismissIfPersonAsked(id, reason, plugin) {
  if (reason.kind === "person" && plugin !== undefined) dismissPaneAsk(paneKey(plugin, id));
}
//@ chunk-k4mxxz7x.js:6563-7414 placement
/**
 * 关闭面板（卸载或 ui.close，钩子可保持打开）。
 */
async function closePane(id, reason) {
  let state = paneRegistry().getState();
  let included = state.closing.includes(id);
  let isUnload = reason.kind === "unload";
  let plugin = allPanes(state).find((pane) => pane.id === id)?.plugin;
  let droppedByChain = false;
  if (isUnload) dropPane(id);
  if (included) return;
  let filtered = hookMembersFor("ui.close").filter((member) => !isUnload || member.name !== plugin);
  if (filtered.length === 0) {
    dropPane(id);
    dismissIfPersonAsked(id, reason, plugin);
    return;
  }
  if (!isUnload)
    paneRegistry().setState((state) => ({
      ...state,
      closing: [...state.closing, id],
    }));
  try {
    let outcome = await reportChainFailure({
      e: {
        id,
        origin: reason,
      },
      handlers: filtered,
      site: envSiteRuleFor("ui.close"),
      bottom: (request) => {
        if (request.id !== id || paneRegistry().getState().closing.includes(id)) {
          dropPane(request.id);
          droppedByChain = request.id === id;
        }
        return Promise.resolve({
          value: undefined,
        });
      },
    });
    let state = paneRegistry().getState();
    if (state.closing.includes(id) && allPanes(state).some((pane) => pane.id === id))
      logForDebugging(
        `ui.close ${id} (${reason.kind}): kept open by a hook` +
          (outcome.deny === undefined ? "" : ` (${outcome.deny})`),
      );
  } catch (error) {
    logForDebugging(`ui.close ${id} (${reason.kind}): the chain failed: ` + errorMessage(error), {
      level: "error",
    });
  } finally {
    paneRegistry().setState((state) =>
      state.closing.includes(id)
        ? {
            ...state,
            closing: state.closing.filter((closingId) => closingId !== id),
          }
        : state,
    );
    if (droppedByChain) dismissIfPersonAsked(id, reason, plugin);
  }
}
//@ chunk-k4mxxz7x.js:7414-7514 placement
/**
 * 关闭某插件打开的全部面板（插件卸载时）。
 */
function closePluginPanes(plugin) {
  let panes = allPanes(paneRegistry().getState());
  for (let pane of panes)
    if (pane.plugin === plugin)
      closePane(pane.id, {
        kind: "unload",
      });
}
//@ chunk-k4mxxz7x.js:7514-7644 placement
/**
 * 在打开的面板间循环：返回当前显示面板前后第 r 个的 id。
 */
function cyclePaneId(state, delta) {
  let openCount = state.open.length;
  let index = state.open.findIndex((pane) => pane.id === state.shownId);
  return openCount > 1 && index >= 0
    ? (state.open[(index + delta + openCount) % openCount]?.id ?? null)
    : null;
}
//@ chunk-k4mxxz7x.js:7644-7876 placement
/**
 * 聚焦并显示指定面板（null 表示取消聚焦），同时清除待聚焦请求。
 */
var focusPane = (paneId) =>
  paneRegistry().setState((state) => {
    let isValid = paneId === null || state.open.some((pane) => pane.id === paneId);
    let focusedId = isValid ? paneId : state.focusedId;
    let shownId = isValid && paneId !== null ? paneId : state.shownId;
    return state.focusedId === focusedId && state.shownId === shownId && state.focusRequest === null
      ? state
      : {
          ...state,
          focusedId,
          shownId,
          focusRequest: null,
        };
  });
//@ chunk-k4mxxz7x.js:7876-7924 placement
/**
 * 当前显示的面板
 */
var shownPane = (state) => state.open.find((pane) => pane.id === state.shownId);
//@ chunk-k4mxxz7x.js:7924-7977 placement
/**
 * 面板是否接管 toast
 */
var holdsToasts = (state) => state.placements > 0 && shownPane(state)?.holdToasts === true;
//@ chunk-k4mxxz7x.js:7977-8070 placement
/**
 * 聚焦面板的下一个
 */
function nextPaneId(state) {
  let index = state.open.findIndex((pane) => pane.id === state.focusedId);
  return state.open[index + 1]?.id ?? null;
}
//@ chunk-k4mxxz7x.js:8070-8206 placement
/**
 * 登记一个面板放置位（计数 +1），返回释放函数。
 */
function holdPanePlacement() {
  paneRegistry().setState((state) => ({
    ...state,
    placements: state.placements + 1,
  }));
  return () =>
    paneRegistry().setState((state) => ({
      ...state,
      placements: state.placements - 1,
    }));
}
//@ chunk-k4mxxz7x.js:8206-8234 placement
/**
 * 面板最小宽度
 */
var paneMinWidth = (state, pane) =>
  wasAsked(state, pane) ? DIFF_SIDEBAR_MIN_COLUMNS : DIFF_SIDEBAR_OPEN_COLUMNS;
//@ chunk-k4mxxz7x.js:8234-8495 placement
function pickPaneOptions(options) {
  return {
    ...(options.closeOnEscape && {
      closeOnEscape: options.closeOnEscape,
    }),
    ...(options.holdToasts && {
      holdToasts: options.holdToasts,
    }),
    ...(options.backgroundColor !== undefined && {
      backgroundColor: options.backgroundColor,
    }),
    ...(options.rows !== undefined && {
      rows: options.rows,
    }),
    ...(options.columns !== undefined && {
      columns: options.columns,
    }),
  };
}
//@ chunk-k4mxxz7x.js:8495-8812 placement
/**
 * 把面板放入打开列表（已存在则替换），从未放置列表中移除，必要时设为显示中。
 */
function placePane(state, pane, focusRequest) {
  let any = state.open.some((openPane) => openPane.id === pane.id);
  let mapped = state.open.map((openPane) =>
    openPane.id === pane.id
      ? {
          ...pane,
          plugin: openPane.plugin,
        }
      : openPane,
  );
  return {
    open: any ? mapped : [...state.open, pane],
    unplaced: state.unplaced.filter((unplaced) => unplaced.id !== pane.id),
    asked: state.asked,
    shownId: any ? state.shownId : (state.focusedId ?? pane.id),
    focusedId: state.focusedId,
    focusRequest,
    placements: state.placements,
    closing: state.closing,
  };
}
//@ chunk-k4mxxz7x.js:8812-9080 placement
function describePaneUnplaced() {
  let viewportClients = listViewportClients();
  if (viewportClients.length === 0) return;
  if (fullscreenClients().length > 0)
    return {
      isPlaced: true,
    };
  return {
    isPlaced: false,
    reason: `no attached surface places panes (${viewportClients.map((client) => client.clientId).join(", ")}): placed when a surface that does attaches; once they detach, as a fresh open is`,
  };
}
//@ chunk-k4mxxz7x.js:9080-9401 placement
function describePaneAskState(state, pane, isForced) {
  let columns = paneHostSlot.get()?.columns;
  let minColumns = paneMinWidth(state, pane);
  if (columns === undefined)
    return (
      describePaneUnplaced() ?? {
        isPlaced: true,
      }
    );
  if (isForced || columns >= minColumns)
    return {
      isPlaced: true,
    };
  return {
    isPlaced: false,
    reason: `unasked below ${minColumns} columns (${columns} now${minColumns === DIFF_SIDEBAR_MIN_COLUMNS ? ", an id the person opened before" : ""}): placed when the person opens it, or when the terminal is widened to ${minColumns} columns`,
  };
}
//@ chunk-k4mxxz7x.js:9401-9553 placement
function loadAskedPanes() {
  if (paneSlot.get()) return;
  paneSlot.set(true);
  let askedPanes = readAskedPanes(getGlobalConfig());
  if (askedPanes.length === 0) return;
  paneRegistry().setState((state) => ({
    ...state,
    asked: [...askedPanes.filter((askedPane) => !wasAsked(state, askedPane)), ...state.asked],
  }));
}
//@ chunk-k4mxxz7x.js:9553-10491 placement
/**
 * 打开面板：校验选项、记录询问、等待布局。
 */
function openPane(request, plugin, isPersonAsked) {
  loadAskedPanes();
  let title = request.title ?? request.id;
  let id = request.focus === true ? request.id : undefined;
  let options = pickPaneOptions(request);
  let paneRef = {
    id: request.id,
    plugin,
  };
  let matchesOptions = (pane) =>
    pane?.title === title &&
    pane.closeOnEscape === options.closeOnEscape &&
    pane.holdToasts === options.holdToasts &&
    pane.backgroundColor === options.backgroundColor &&
    pane.rows === options.rows &&
    pane.columns === options.columns;
  let placement;
  let shouldMarkAsked = false;
  paneRegistry().setState((state) => {
    let isNewlyAsked = isPersonAsked && !wasAsked(state, paneRef);
    let pane = state.open.find((openPane) => openPane.id === request.id);
    let pane_2 = state.unplaced.find((unplacedPane) => unplacedPane.id === request.id);
    let isOpen = pane !== undefined;
    let isUnplaced = pane_2 !== undefined;
    let currentRef = {
      id: request.id,
      plugin: pane_2?.plugin ?? plugin,
    };
    placement = isOpen
      ? {
          isPlaced: true,
        }
      : describePaneAskState(state, currentRef, isPersonAsked);
    shouldMarkAsked = isNewlyAsked;
    let isPlaced = placement.isPlaced;
    let isUnchanged = matchesOptions(pane) && id === undefined && !isNewlyAsked;
    let nextPane = {
      ...currentRef,
      title,
      ...options,
    };
    let askedState = isNewlyAsked
      ? {
          ...state,
          asked: [...state.asked, paneRef],
        }
      : state;
    let unplacedState = {
      ...askedState,
      unplaced: isUnplaced
        ? state.unplaced.map((unplacedPane) => (unplacedPane.id === request.id ? nextPane : unplacedPane))
        : [...state.unplaced, nextPane],
    };
    let isNoop = isOpen ? isUnchanged : !isPlaced && matchesOptions(pane_2) && !isNewlyAsked;
    let nextState = isPlaced ? placePane(askedState, nextPane, id ?? state.focusRequest) : unplacedState;
    return isNoop ? state : nextState;
  });
  if (shouldMarkAsked) setPaneAsked(paneRef, "asked");
  let finalPlacement = placement ?? {
    isPlaced: true,
  };
  let columns = paneHostSlot.get()?.columns ?? "unmeasured";
  let askedLabel = isPersonAsked ? "asked" : "unasked";
  let placementText = finalPlacement.isPlaced ? "placed" : `waits unplaced (${finalPlacement.reason})`;
  logForDebugging(`ui.open ${plugin} ${request.id} (${askedLabel}, ${columns} columns): ${placementText}`);
  return finalPlacement;
}
//@ chunk-k4mxxz7x.js:10491-10611 placement
/**
 * 校验面板参数：id 合法，origin 只能是插件（引擎来源由引擎设置）。
 */
function checkPaneOrigin(pane) {
  let hasPluginOrigin =
    stableStringifySafe(pane?.origin) ===
    stableStringifySafe({
      kind: "plugin",
    });
  return checkPaneId(pane?.id) ?? (hasPluginOrigin ? undefined : "origin is the engine's to set");
}
//@ chunk-k4mxxz7x.js:10611-10781 placement
function checkArgv(argv) {
  return Array.isArray(argv) &&
    argv.length > 0 &&
    argv.every((arg) => typeof arg === "string") &&
    argv[0] !== ""
    ? undefined
    : "takes argv, a non-empty list of strings naming the command first";
}
//@ chunk-k4mxxz7x.js:10781-10909 placement
function checkStringRecord(env, label) {
  return env === undefined ||
    (isPlainObject(env) && Object.values(env).every((value) => typeof value === "string"))
    ? undefined
    : `${label} is an object of strings`;
}
//@ chunk-k4mxxz7x.js:10909-11097 placement
/**
 * 校验 $.flag.value 参数：需要 name 与 fallback。
 */
function checkFlagValueArgs(args) {
  let isNameMissing = typeof args?.name !== "string" || args.name === "";
  let hasNoFallback = args?.fallback === undefined;
  return isNameMissing
    ? "takes the flag's name"
    : hasNoFallback
      ? "takes a fallback, the value where the flag table has no say"
      : undefined;
}
//@ chunk-k4mxxz7x.js:11097-11142 placement
/**
 * 非字符串参数
 */
var isObjectArg = (value) => value !== undefined && typeof value !== "string";
//@ chunk-k4mxxz7x.js:11142-11219 placement
/**
 * 1..n 的整数
 */
function isPositiveIntUpTo(timeoutMs, max) {
  return typeof timeoutMs === "number" && Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= max;
}
//@ chunk-k4mxxz7x.js:11219-11494 placement
function describeNonJsonValue(value) {
  let serialized;
  try {
    serialized = jsonStringify(value);
  } catch (error) {
    return `value is not JSON data: ${errorMessage(error)}`;
  }
  let text = serialized;
  if (typeof text !== "string")
    return `value is not JSON data: ${value === undefined ? "undefined" : `a ${typeof value}`}`;
  return text.length > MAX_CALL_VALUE_CHARS
    ? `the value is ${text.length} characters, over the ${MAX_CALL_VALUE_CHARS} limit`
    : undefined;
}
//@ chunk-k4mxxz7x.js:11494-11563 placement
/**
 * 校验 key 参数
 */
function checkKeyArg(args) {
  return typeof args?.key === "string" ? undefined : "takes a key";
}
//@ chunk-k4mxxz7x.js:11563-11797 placement
function validateAgentIdArg(args) {
  let agentId = args?.agentId;
  let as = args?.as;
  let isAgentIdValid = agentId === undefined || (typeof agentId === "string" && agentId !== "");
  let isAsValid = as === undefined || as === "api";
  if (!isAgentIdValid) return `takes agentId, a non-empty string (got ${String(agentId)})`;
  return isAsValid ? undefined : `takes as "api" or none (got ${String(as)})`;
}
//@ chunk-k4mxxz7x.js:11844-12336 placement
function validateNamesArg(args) {
  let names = args?.names;
  if (!Array.isArray(names)) return "takes names, a list of relative .md file names";
  for (let optionName of ["of", "below"]) {
    let optionValue = args?.[optionName];
    if (optionValue !== undefined && (typeof optionValue !== "string" || optionValue === ""))
      return `takes ${optionName}, a path, when given`;
  }
  for (let name of names) {
    if (typeof name !== "string" || !name.toLowerCase().endsWith(".md"))
      return `takes names, each a .md file name (${JSON.stringify(name)})`;
    if (isAbsolute(name) || win32.isAbsolute(name) || name.split(/[\\/]/).includes(".."))
      return `takes names, each relative with no ".." (${name})`;
  }
  return;
}
//@ chunk-k4mxxz7x.js:12336-12423 placement
/**
 * 校验 path 参数
 */
function checkPathArg(args) {
  let path = args?.path;
  return typeof path !== "string" || path === "" ? "takes a path" : undefined;
}
//@ chunk-k4mxxz7x.js:12423-12529 placement
/**
 * 校验 $.fs.read 参数：路径合法，as 为 text 或 bytes。
 */
function checkFsReadArgs(args) {
  let isAsValid = args?.as === "text" || args?.as === "bytes";
  return checkPathArg(args) ?? (isAsValid ? undefined : 'as is "text" or "bytes"');
}
//@ chunk-k4mxxz7x.js:12529-12634 placement
/**
 * 校验 $.fs.stat 参数：路径合法，resolve 为布尔。
 */
function checkFsStatArgs(args) {
  let isResolveBoolean = typeof args?.resolve === "boolean";
  return checkPathArg(args) ?? (isResolveBoolean ? undefined : "resolve is true or false");
}
//@ chunk-k4mxxz7x.js:12634-12649 placement
/**
 * 进程 init.timeoutMs 的上限 600000 毫秒（10 分钟），超出即报参数错误。
 */
var MAX_PROCESS_TIMEOUT_MS = 600000;
//@ chunk-k4mxxz7x.js:12649-13137 placement
function validateSpawnInit(args) {
  let argvProblem = checkArgv(args?.argv);
  if (argvProblem !== undefined) return argvProblem;
  let init = args?.init;
  if (init === undefined) return;
  if (!isPlainObject(init)) return "takes init, { cwd?, env?, stdin?, timeoutMs? }";
  if (init.cwd !== undefined && (typeof init.cwd !== "string" || init.cwd === ""))
    return "init.cwd is a non-empty path";
  let envProblem = checkStringRecord(init.env, "init.env");
  if (envProblem !== undefined) return envProblem;
  if (init.stdin !== undefined && typeof init.stdin !== "string") return "init.stdin is a string";
  return init.timeoutMs !== undefined && !isPositiveIntUpTo(init.timeoutMs, MAX_PROCESS_TIMEOUT_MS)
    ? `init.timeoutMs is a whole number of ms, 1 to ${MAX_PROCESS_TIMEOUT_MS}`
    : undefined;
}
//@ chunk-k4mxxz7x.js:13137-13411 placement
function validateExecArgs(args) {
  if (!isPlainObject(args)) return "takes { argv, cwd?, env?, input? }";
  let { argv, cwd, env, input } = args;
  let isCwdInvalid = cwd !== undefined && (typeof cwd !== "string" || cwd === "");
  let isInputInvalid = input !== undefined && typeof input !== "string";
  return (
    checkArgv(argv) ??
    (isCwdInvalid ? "cwd is a non-empty path" : undefined) ??
    checkStringRecord(env, "env") ??
    (isInputInvalid ? "input is a string" : undefined)
  );
}
//@ chunk-k4mxxz7x.js:13411-13624 placement
function validateToolRegistration(registration) {
  let name = registration?.name;
  let description = registration?.description;
  let isNameInvalid = typeof name !== "string" || !MCP_SERVER_NAME_RE.test(name);
  let hasDescription = typeof description === "string" && !!description.trim();
  return (
    (isNameInvalid ? "name is letters, digits, _ or - (up to 64)" : undefined) ??
    (hasDescription ? undefined : "needs a description")
  );
}
//@ chunk-k4mxxz7x.js:13624-13659 placement
/**
 * 值须可 JSON 序列化
 */
var checkValueJson = (args) => checkKeyArg(args) ?? describeNonJsonValue(args?.value);
//@ chunk-k4mxxz7x.js:13659-13805 placement
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
//@ chunk-k4mxxz7x.js:13805-13867 placement
/**
 * text 必须字符串
 */
var checkTextArg = (text) => (typeof text === "string" ? undefined : "takes a string text");
//@ chunk-k4mxxz7x.js:13867-14154 placement
function validateBreakdownArg(args) {
  let breakdown = args?.breakdown;
  let columns = args?.columns;
  if (!(breakdown === undefined || breakdown === "summary" || breakdown === "full"))
    return `takes breakdown "summary" or "full" (got ${String(breakdown)})`;
  return columns === undefined || (typeof columns === "number" && Number.isInteger(columns) && columns > 0)
    ? undefined
    : `takes columns, a positive whole number (got ${String(columns)})`;
}
//@ chunk-k4mxxz7x.js:14154-14839 placement
function validatePaneOptions(options) {
  let title = options?.title;
  let hasTitle = title !== undefined;
  let hasControlChar = typeof title === "string" && hasControlCharacter(title);
  let found = ["focus", "closeOnEscape", "holdToasts"].find(
    (key) => options?.[key] !== undefined && options[key] !== true,
  );
  let backgroundColor = options?.backgroundColor;
  let isColorValid =
    backgroundColor === undefined ||
    backgroundColor === "transparent" ||
    (typeof backgroundColor === "string" &&
      !/[^\S ]/.test(backgroundColor) &&
      validThemeName(resolvePaneColor(backgroundColor)) !== undefined &&
      isLowColorIndex(backgroundColor));
  let found_2 = ["rows", "columns"].find((key) => {
    let size = options?.[key];
    return size !== undefined && !(typeof size === "number" && Number.isInteger(size) && size > 0);
  });
  return (
    checkPaneId(options?.id) ??
    (hasTitle ? checkTextArg(title) : undefined) ??
    (hasControlChar ? "title holds a control character" : undefined) ??
    (found === undefined ? undefined : `${found} is true or left out`) ??
    (found_2 === undefined
      ? undefined
      : `${found_2} is a positive whole number or left out (got ${String(options?.[found_2])})`) ??
    (isColorValid ? undefined : 'backgroundColor is a theme key, a raw color or "transparent"')
  );
}
//@ chunk-k4mxxz7x.js:14839-15071 placement
/**
 * 列出某插件的面板（id、标题、是否显示、聚焦、已放置），冻结返回。
 */
function listPluginPanes(plugin) {
  let state = paneRegistry().getState();
  let openPanes = new Set(state.open);
  return Object.freeze(
    allPanes(state)
      .filter((pane) => pane.plugin === plugin)
      .map((pane) =>
        Object.freeze({
          id: pane.id,
          title: pane.title,
          isShown: state.shownId === pane.id,
          isFocused: state.focusedId === pane.id,
          isPlaced: openPanes.has(pane),
        }),
      ),
  );
}
//@ chunk-k4mxxz7x.js:15071-15349 placement
function describePanePlaced(columns) {
  let unplaced = paneRegistry().getState().unplaced;
  paneRegistry().setState((state) =>
    state.unplaced
      .filter((pane) => columns >= paneMinWidth(state, pane))
      .reduce((acc, pane) => placePane(acc, pane, acc.focusRequest), state),
  );
  let openPanes = new Set(paneRegistry().getState().open);
  for (let pane of unplaced.filter((pane) => openPanes.has(pane)))
    logForDebugging(`ui.open ${pane.plugin} ${pane.id} (waiting, ${columns} columns): placed`);
}
//@ chunk-k4mxxz7x.js:15349-15561 placement
/**
 * 有放置位后，把等待中的面板全部放置并记录日志。
 */
function placeWaitingPanes(columns) {
  let unplaced = paneRegistry().getState().unplaced;
  if (unplaced.length === 0) return;
  paneRegistry().setState((state) =>
    state.unplaced.reduce((acc, pane) => placePane(acc, pane, acc.focusRequest), state),
  );
  for (let pane of unplaced)
    logForDebugging(`ui.open ${pane.plugin} ${pane.id} (waiting, ${columns}): placed`);
}
//@ chunk-k4mxxz7x.js:15561-15677 placement
/**
 * 记录插件已询问过打开某面板（持久化到全局配置）。
 */
function markPaneAsked(paneRef) {
  loadAskedPanes();
  let isNew = false;
  paneRegistry().setState((state) => {
    isNew = !wasAsked(state, paneRef);
    return isNew
      ? {
          ...state,
          asked: [
            ...state.asked,
            {
              ...paneRef,
            },
          ],
        }
      : state;
  });
  if (isNew) setPaneAsked(paneRef, "asked");
}
//@ chunk-k4mxxz7x.js:15677-15804 placement
/**
 * 处理待聚焦请求：接受则聚焦该面板，否则清除请求。
 */
function settleFocusRequest(isShown) {
  let { focusRequest } = paneRegistry().getState();
  if (focusRequest === null) return;
  if (isShown) focusPane(focusRequest);
  else
    paneRegistry().setState((state) => ({
      ...state,
      focusRequest: null,
    }));
}
//@ chunk-k4mxxz7x.js:15804-15935 placement
/**
 * 把指定的已打开面板设为显示中（已聚焦时一并转移焦点）。
 */
var showPane = (paneId) =>
  paneRegistry().setState((state) =>
    state.shownId === paneId || !state.open.some((pane) => pane.id === paneId)
      ? state
      : {
          ...state,
          shownId: paneId,
          focusedId: state.focusedId === null ? null : paneId,
        },
  );
//@ chunk-k4mxxz7x.js:15935-15991 placement
/**
 * 项目根目录
 */
function projectRootFor(cwd) {
  let startDir = cwd ?? getCwd();
  return noUncachedRoot(startDir) ?? findGitRoot(startDir) ?? getOriginalCwd();
}
//@ chunk-k4mxxz7x.js:15991-16025 placement
/**
 * 吞掉 rejection
 */
var swallow = (promise) =>
  promise.catch(() => {
    return;
  });
//@ chunk-k4mxxz7x.js:16025-16112 placement
/**
 * 串行任务队列
 */
function createSerialQueue() {
  let resolved = Promise.resolve();
  return (task) => {
    let run = resolved.then(task, task);
    resolved = swallow(run);
    return run;
  };
}
//@ chunk-k4mxxz7x.js:16112-16165 placement
/**
 * con/prn/aux/nul/com1…
 */
var WINDOWS_RESERVED_NAME_RE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
//@ chunk-k4mxxz7x.js:16165-16175 placement
/**
 * 64
 */
var MAX_STORE_KEY_CHARS = 64;
//@ chunk-k4mxxz7x.js:16175-16185 placement
/**
 * 12
 */
var MAX_STORE_DEPTH = 12;
//@ chunk-k4mxxz7x.js:16185-16330 placement
var STORE_LOCK_OPTIONS = {
  realpath: false,
  retries: {
    retries: 10,
    minTimeout: 5,
    maxTimeout: 100,
  },
  onCompromised: (error) => {
    logForDebugging(`$.store lock compromised: ${errorMessage(error)}`, {
      level: "warn",
    });
  },
};
//@ chunk-k4mxxz7x.js:16330-16413 placement
/**
 * 按键串行队列
 */
function keyedQueueFactory() {
  let queues = new Map();
  return (key) => {
    let queue = queues.get(key) ?? createSerialQueue();
    queues.set(key, queue);
    return queue;
  };
}
//@ chunk-k4mxxz7x.js:16413-16437 placement
/**
 * 存储键格式
 */
var STORE_KEY_RE = /^[a-z0-9._-]+$/;
//@ chunk-k4mxxz7x.js:16437-16449 placement
/**
 * 插件串行队列
 */
var pluginQueue; // deferred: uses keyedQueueFactory of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-k4mxxz7x.js:16437", () => {
  pluginQueue = keyedQueueFactory();
});
//@ chunk-k4mxxz7x.js:16584-16812 placement
function pluginStoreFileName(key) {
  if (
    STORE_KEY_RE.test(key) &&
    !WINDOWS_RESERVED_NAME_RE.test(key) &&
    key.length <= MAX_STORE_KEY_CHARS &&
    key !== "." &&
    key !== ".."
  )
    return `${key}.json`;
  let replaced = key.replace(/[^a-zA-Z0-9_-]/g, "_");
  let sliced = createHash("sha256").update(key).digest("hex").slice(0, MAX_STORE_DEPTH);
  return `${replaced.slice(0, MAX_STORE_KEY_CHARS) || "plugin"}-${sliced}.json`;
}
//@ chunk-k4mxxz7x.js:16812-16846 placement
/**
 * 插件存储文件路径
 */
var pluginStorePath = (pluginId) => join(getPluginsDirectory(), "store", pluginStoreFileName(pluginId));
//@ chunk-k4mxxz7x.js:16846-16927 placement
/**
 * 创建存储目录
 */
async function ensurePluginStoreDir(pluginId) {
  let path = pluginStorePath(pluginId);
  await mkdir(dirname(path), {
    recursive: true,
    mode: 448,
  });
  return path;
}
//@ chunk-k4mxxz7x.js:16965-17099 placement
async function touchStoreFile(pluginId, path) {
  let date = new Date();
  try {
    await utimes(path, date, date);
  } catch (error) {
    logForDebugging(`$.store (${pluginId}): could not touch ${path}: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-k4mxxz7x.js:17332-17449 placement
async function readStoreFile(pluginId) {
  let text = await readFile(pluginStorePath(pluginId), "utf8").catch((error) => {
    if (isENOENT(error)) return;
    throw error;
  });
  return text === undefined ? undefined : [pluginId, text];
}
//@ chunk-k4mxxz7x.js:17449-18013 placement
async function writePluginStore(pluginId) {
  let reduced = await legacyPluginIds(pluginId).reduce(
    async (acc, legacyId) => (await acc) ?? readStoreFile(legacyId),
    Promise.resolve(undefined),
  );
  if (reduced === undefined) return false;
  let [foundId, foundText] = reduced;
  let targetPath = pluginStorePath(pluginId);
  let tempPath = `${targetPath}.carry-${randomUUID()}`;
  try {
    if (!isPlainObject(jsonParse(foundText))) return false;
    await mkdir(dirname(targetPath), {
      recursive: true,
    });
    await writeFile(tempPath, foundText, {
      flag: "wx",
    });
    await link(tempPath, targetPath).catch(async (error) => {
      if (getErrnoCode(error) === "EEXIST") throw error;
      await copyFile(tempPath, targetPath, constants.COPYFILE_EXCL);
    });
    return true;
  } catch (error) {
    let isCarried = getErrnoCode(error) === "EEXIST";
    logForDebugging(
      `$.store (${pluginId}): ` +
        (isCarried
          ? `${foundId}'s store was carried by another session`
          : `could not carry ${foundId}'s store: ${errorMessage(error)}`),
      {
        level: isCarried ? "debug" : "warn",
      },
    );
    return isCarried;
  } finally {
    await unlink(tempPath).catch(() => {
      return;
    });
  }
}
//@ chunk-k4mxxz7x.js:18053-18218 placement
async function readStoreWithMigration(pluginId, path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  if (!(await writePluginStore(pluginId))) return;
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
}
//@ chunk-k4mxxz7x.js:18218-18703 placement
var PLUGIN_STORE_ERRORS = {
  async read(pluginId) {
    let path = pluginStorePath(pluginId);
    let text;
    try {
      text = await readStoreWithMigration(pluginId, path);
    } catch (error) {
      throw new HooksError(`${pluginId}: store file ${path} is unreadable (${errorMessage(error)})`);
    }
    if (text === undefined) return {};
    let parsed;
    try {
      parsed = jsonParse(text);
    } catch (error) {
      throw new HooksError(`${pluginId}: store file ${path} is malformed (${errorMessage(error)})`);
    }
    if (!isPlainObject(parsed))
      throw new HooksError(`${pluginId}: store file ${path} is malformed (the JSON is not an object)`);
    await touchStoreFile(pluginId, path);
    return parsed;
  },
  write: async (pluginId, data) =>
    writeFileAtomic(
      await ensurePluginStoreDir(pluginId),
      `${jsonStringify(data, null, 2)}
`,
      384,
    ),
  async lock(pluginId) {
    let pluginStoreDir = await ensurePluginStoreDir(pluginId);
    return lock(pluginStoreDir, {
      lockfilePath: `${pluginStoreDir}.lock`,
      ...STORE_LOCK_OPTIONS,
    });
  },
};
//@ chunk-k4mxxz7x.js:18703-18775 placement
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
//@ chunk-k4mxxz7x.js:18775-18787 placement
/**
 * 存储后端引用
 */
var storeBackendRef; // deferred: uses storeBackend of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-k4mxxz7x.js:18775", () => {
  storeBackendRef = storeBackend();
});
//@ chunk-k4mxxz7x.js:18787-18823 placement
/**
 * 存储错误文本表
 */
var storeErrors = () => storeBackendRef.backendOverride() ?? PLUGIN_STORE_ERRORS;
//@ chunk-k4mxxz7x.js:18823-18833 placement
/**
 * 256
 */
var MAX_STORE_KEYS = 256;
//@ chunk-k4mxxz7x.js:18833-19666 placement
/**
 * 应用 $.store 事件（键长度上限、keys 事件）。
 */
async function applyStoreEvent(request, pluginId) {
  try {
    if (request.event !== "keys" && request.key.length > MAX_STORE_KEYS)
      throw new HooksError(
        `${pluginId}: $.store.${request.event}: the key is ${request.key.length} characters, over the ${MAX_STORE_KEYS} limit`,
      );
    let errors = storeErrors();
    let lockHandle =
      request.event === "set" || request.event === "delete" ? await errors.lock?.(pluginId) : undefined;
    try {
      let data = await errors.read(pluginId);
      switch (request.event) {
        case "get":
          return Object.hasOwn(data, request.key) ? data[request.key] : undefined;
        case "keys":
          return Object.keys(data);
        case "set": {
          let nextData = {
            ...data,
            [request.key]: request.value,
          };
          let size = jsonStringify(nextData).length;
          if (size > MAX_CALL_VALUE_CHARS)
            throw new HooksError(
              `${pluginId}: $.store.set: the store would be ${size} characters, over the ${MAX_CALL_VALUE_CHARS} limit`,
            );
          await errors.write(pluginId, nextData);
          logForDebugging(`$.store.set (${pluginId}): ${request.key}`);
          return;
        }
        case "delete": {
          if (!Object.hasOwn(data, request.key)) return;
          let nextData = {
            ...data,
          };
          delete nextData[request.key];
          await errors.write(pluginId, nextData);
          return;
        }
      }
    } finally {
      await releaseLockQuietly(lockHandle, `$.store.${request.event} (${pluginId})`);
    }
  } catch (error) {
    if (error instanceof HooksError) throw error;
    throw new HooksError(`${pluginId}: $.store.${request.event} failed: ${errorMessage(error)}`);
  }
}
//@ chunk-k4mxxz7x.js:19666-19700 placement
/**
 * 排队应用存储事件
 */
var storeEventQueued = (request, pluginId) => pluginQueue(pluginId)(() => applyStoreEvent(request, pluginId));
export {
  storeEventQueued,
  markPaneAsked,
  paneKey,
  clientRegistry,
  paneRegistry,
  normalizeDraws,
  fullscreenClients,
  showPane,
  focusPane,
  allPanes,
  closePane,
  holdPanePlacement,
  placeWaitingPanes,
  paneHostSlot,
  describePaneUnplaced,
  resolvePaneColor,
  blockInputsOnMobile,
  isInputLike,
  isOfficialMarketplacePlugin,
  validThemeName,
  classifyPluginOrigin,
  projectRootFor,
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
  checkPathArg,
  checkKeyArg,
  checkValueJson,
  validateSpawnInit,
  validateExecArgs,
  checkFlagValueArgs,
  validateNamesArg,
  checkFsReadArgs,
  checkFsStatArgs,
  createSerialQueue,
  MAX_PROCESS_TIMEOUT_MS,
  closePluginPanes,
  shownPane,
  cyclePaneId,
  askCountFor,
  EMPTY_PANES,
  holdsToasts,
  describeNonJsonValue,
  focusSlot,
  bumpPaneRender,
  placementSlot,
  askSlot,
  paneAskKey,
  withoutKeys,
  settleFocusRequest,
  nextPaneId,
  describePanePlaced,
  PANE_COLORS,
  paneColorOf,
};

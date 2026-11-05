/**
 * plugins/functionHooks/uiApi.ts
 *
 * 2.1.316 新增：插件 $.ui 接口（focus、press、resolve 等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (57)
 * attribution: placement 56, layout 1
 */
import { randomUUID } from "crypto";
import { identity as identity_2 } from "../../utils/identity.js";
import { clientRegistry, paneRegistry, checkTextArg } from "./panes.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { EMPTY_PROMPT_DRAFT } from "./promptApi.js";
import { nonEmptySpans, normalizeInputDecorations } from "../../components/PromptInput/inputDecorations.js";
import { clampPositive } from "./coreHandlers.js";
import { logPressFill } from "./ui/pressFill.js";
import { errorMessage } from "../../utils/errors.js";
import { attachedSurfaces, currentSurfaceBinding } from "./surfaceBinding.js";
import { setClipboard, getClipboardPath } from "../../ink/termio/osc.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import {
  ABOVE_PROMPT,
  focusSiteFor,
  isOtherPluginsHolder,
  commitFocus,
  runUiChain,
  siteKey,
  focusSites,
  isPersonInitiated,
} from "./uiHooks.js";
import { renderPluginsFor } from "./ui/renderSites.js";
import { isUiRenderEvent } from "./apiDispatch.js";
import { awaitHooksRespawn, hookMembersFor } from "./hookDispatch.js";
import { sleep } from "../../utils/sleep.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  init_react_production,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { truncateUiLog } from "./hooksWorkerClient.js";
import { HooksError } from "./hooksErrors.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3502696-3502716 placement
/**
 * 发给界面宿主的请求（复制、读选区、读写提示等）默认超时 5 秒。
 */
var MEMORY_SERVER_MAX = 50;
var UI_HOST_REQUEST_TIMEOUT_MS = 5000;
//@ chunk-5xgkngpb.js:4099163-4099219 placement
/**
 * 选区对象
 */
var selectionValue = (text, requestId) =>
  requestId === undefined
    ? {
        text,
      }
    : {
        text,
        requestId,
      };
//@ chunk-5xgkngpb.js:4099219-4099293 placement
/**
 * 空则 undefined
 */
function emptyOrSelection(text, requestId) {
  return text === undefined || text === ""
    ? undefined
    : selectionValue(text, requestId === "" ? undefined : requestId);
}
//@ chunk-5xgkngpb.js:4099293-4099344 placement
/**
 * 选区结果
 */
var selectionResult = (text, requestId) => ({
  selection: emptyOrSelection(text, requestId),
  cause: undefined,
});
//@ chunk-5xgkngpb.js:4099344-4099396 placement
/**
 * 当前请求者
 */
var currentRequester; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4099344", () => {
  currentRequester = identity_2(
    {
      current: undefined,
    },
    (state) => {
      state.current = undefined;
    },
  );
});
//@ chunk-5xgkngpb.js:4099396-4099424 placement
/**
 * 非终端界面
 */
var isNonTerminalSurface = (surface) => surface !== "terminal";
//@ chunk-5xgkngpb.js:4099424-4099487 placement
/**
 * 请求者客户端
 */
var requesterClient = (requester, clientId, surface) => ({
  requester,
  client: {
    clientId,
    surface,
  },
});
//@ chunk-5xgkngpb.js:4099487-4099650 placement
var answeringClientsOf = (requester, api, surface) =>
  clientRegistry.list().flatMap((client) => {
    let { clientId, surface: surface_2 } = client;
    return requester !== undefined &&
      (surface === undefined || surface_2 === surface) &&
      client.answers?.includes(api) === true &&
      isNonTerminalSurface(surface_2)
      ? [requesterClient(requester, clientId, surface_2)]
      : [];
  });
//@ chunk-5xgkngpb.js:4099650-4099685 placement
/**
 * 能回答的客户端
 */
var answeringClients = (api, surface) => answeringClientsOf(currentRequester.current, api, surface);
//@ chunk-5xgkngpb.js:4099685-4099883 placement
/**
 * 按当前请求者的可达范围列出能回答某能力的远程客户端：first 只取第一个，否则把静默客户端排到后面。
 */
function reachableClients(api, surface) {
  let reach = currentRequester.current?.reach() ?? "none";
  let clients = reach !== "none" ? answeringClients(api, surface) : [];
  let isFirstOnly = reach === "first";
  let silenceRank = (client) => Number(clientRegistry.isSilent(client.client.clientId));
  return isFirstOnly
    ? clients.filter((client) => client === clients[0])
    : clients.toSorted((a, b) => silenceRank(a) - silenceRank(b));
}
//@ chunk-5xgkngpb.js:4099883-4100111 placement
/**
 * 依次询问能回答某能力的客户端，第一个给出结果的记为 heard 并返回；不回答的记为 missed。
 */
async function askClientsInTurn(api, ask, surface) {
  let tried = new Set();
  let nextClient = () => reachableClients(api, surface).find((client) => !tried.has(client.client.clientId));
  for (let client = nextClient(); client !== undefined; client = nextClient()) {
    let { clientId } = client.client;
    tried.add(clientId);
    let answer = await ask(client);
    if (answer !== undefined) {
      clientRegistry.heard(clientId);
      return answer;
    }
    clientRegistry.missed(clientId);
  }
  return;
}
//@ chunk-5xgkngpb.js:4100111-4100122 placement
/**
 * 1e6
 */
var MAX_COPY_CHARS = 1e6;
//@ chunk-5xgkngpb.js:4100122-4100388 placement
/**
 * $.ui.copy 交给远程客户端复制：超过 1e6 字符不发送，返回是否复制成功；没有客户端时返回 undefined。
 */
async function copyViaRemoteClient(surface, plugin, text) {
  if (reachableClients("ui_copy", surface).length === 0) return;
  if (text.length > MAX_COPY_CHARS) {
    logForDebugging(
      `$.ui.copy (${plugin}): ${text.length} chars is past the ${MAX_COPY_CHARS} a remote copy carries; not sent`,
    );
    return false;
  }
  return (
    (await askClientsInTurn(
      "ui_copy",
      (client) =>
        client.requester.copy({
          ...client.client,
          plugin,
          text,
        }),
      surface,
    )) === true
  );
}
//@ chunk-5xgkngpb.js:4100388-4100489 placement
async function requireSelection(selectionPromise) {
  let result = await selectionPromise;
  if (result.selection === undefined) throw Error("nothing selected");
  return result;
}
//@ chunk-5xgkngpb.js:4100489-4100502 layout
var BACKDROP_CLEAR_DELAY_MS = 5000;
//@ chunk-5xgkngpb.js:4100502-4100580 placement
/**
 * 设置当前请求者
 */
function withCurrentRequester(requester) {
  currentRequester.current = requester;
  return () => {
    if (currentRequester.current === requester) currentRequester.current = undefined;
  };
}
//@ chunk-5xgkngpb.js:4100580-4100751 placement
function selectionReadCause(results) {
  let filtered = results.map((entry) => entry.cause).filter((cause) => cause !== "not_asked");
  let included = filtered.includes("parse_failed");
  return filtered.includes(undefined)
    ? undefined
    : included
      ? "parse_failed"
      : (filtered.at(0) ?? "not_asked");
}
//@ chunk-5xgkngpb.js:4100751-4100981 placement
function logSelectionReadOutcome(results) {
  let cause = selectionReadCause(results);
  if (cause === undefined) {
    logFeatureOk("plugin_function_hooks_selection_read");
    return;
  }
  if (cause === "parse_failed") {
    logFeatureBad("plugin_function_hooks_selection_read", cause);
    return;
  }
  if (cause !== "not_asked") logFeatureSad("plugin_function_hooks_selection_read", cause);
}
//@ chunk-5xgkngpb.js:4100981-4102344 placement
/**
 * headless 模式下的输入框代理：read/write/paint/forget/propose 优先交给远程客户端（ui_prompt_* 能力），没有则用本地实现。
 */
function createRemotePromptBox(localBox) {
  let layersByOwner = new Map();
  let layerCounter = 0;
  return {
    read: async () => {
      let answer =
        reachableClients("ui_prompt_read").length > 0
          ? await askClientsInTurn("ui_prompt_read", (client) => client.requester.readPrompt(client.client))
          : localBox.read();
      if (answer === undefined) return EMPTY_PROMPT_DRAFT;
      return {
        text: answer.text,
        cursor: Math.min(answer.cursor, answer.text.length),
      };
    },
    write: async (text, mode, options) => {
      if (reachableClients("ui_prompt_fill").length === 0)
        return {
          isFilled: false,
          refusal: "no_composer",
        };
      let decorations = nonEmptySpans(normalizeInputDecorations(options?.decorations, text));
      return {
        isFilled:
          text.length <= MAX_COPY_CHARS &&
          (await askClientsInTurn("ui_prompt_fill", (client) =>
            client.requester.fillPrompt({
              ...client.client,
              text,
              mode,
              ...(decorations.length > 0 && {
                decorations,
              }),
              ...(options?.cursor !== undefined && {
                cursor: clampPositive(options.cursor, Number.MAX_SAFE_INTEGER),
              }),
              answersPress: logPressFill(options?.answersPress, client.client.clientId),
            }),
          )) === true,
      };
    },
    paint: async (layer, decorations, text) => {
      let nextText = decorations.length === 0 ? undefined : text;
      let normalized = nonEmptySpans(normalizeInputDecorations(decorations, nextText ?? ""));
      if (nextText !== undefined) {
        layerCounter += 1;
        layersByOwner.set(layer, layerCounter);
      }
      let layerId = layersByOwner.get(layer);
      let isPainted =
        (nextText === undefined || nextText.length <= MAX_COPY_CHARS) &&
        (await askClientsInTurn("ui_prompt_paint", (client) =>
          client.requester.paintPrompt({
            ...client.client,
            layer,
            ...(nextText !== undefined && {
              text: nextText,
            }),
            ...(normalized.length > 0 && {
              decorations: normalized,
            }),
          }),
        )) === true;
      if (nextText === undefined && isPainted && layersByOwner.get(layer) === layerId)
        layersByOwner.delete(layer);
      return {
        isPainted,
      };
    },
    forget: (owner) => {
      let layerId = layersByOwner.get(owner);
      if (layerId !== undefined)
        askClientsInTurn("ui_prompt_paint", (client) =>
          client.requester.paintPrompt({
            ...client.client,
            layer: owner,
          }),
        )
          .then((isPainted) => {
            if (isPainted === true && layersByOwner.get(owner) === layerId) layersByOwner.delete(owner);
          })
          .catch((error) => {
            logForDebugging(`prompt.paint: ${errorMessage(error)}`, {
              level: "error",
            });
          });
    },
    propose: async (text) => ({
      isShown:
        text.length <= MAX_COPY_CHARS &&
        (await askClientsInTurn("ui_prompt_suggest", (client) =>
          client.requester.suggestPrompt({
            ...client.client,
            text,
          }),
        )) === true,
    }),
  };
}
//@ chunk-5xgkngpb.js:4102344-4102386 placement
/**
 * 只有原因的失败结果
 */
var causeOnlyResult = (cause) => ({
  selection: undefined,
  cause,
});
//@ chunk-5xgkngpb.js:4102386-4102582 placement
async function readFirstSelection(reads) {
  let mapped = reads.map((read) => read.catch(() => causeOnlyResult("aborted")));
  let selected = await Promise.any(mapped.map(requireSelection)).catch(() => {
    return;
  });
  if (selected === undefined) {
    logSelectionReadOutcome(await Promise.all(mapped));
    return;
  }
  logSelectionReadOutcome([selected]);
  return selected.selection;
}
//@ chunk-5xgkngpb.js:4102582-4102683 placement
/**
 * headless 模式下的选区读取器：并行询问所有能读选区的客户端，取第一个有选区的结果。
 */
var createRemoteSelectionReader = () => ({
  read: () =>
    readFirstSelection(
      answeringClients("ui_read_selection").map((client) => client.requester.readSelection(client.client)),
    ),
});
//@ chunk-5xgkngpb.js:4102683-4102699 placement
/**
 * 1048576
 */
var MAX_UI_VALUE_BYTES = 1048576;
//@ chunk-5xgkngpb.js:4102699-4103450 placement
async function uiCopyForPlugin(args, caller) {
  let { text, surface } = args;
  if (!(surface !== undefined && attachedSurfaces().includes(surface))) {
    logForDebugging(
      `$.ui.copy (${caller.plugin}): no surface draws (${surface ?? "none attached"}); nothing copied`,
    );
    return {
      isCopied: false,
      reason: "no-surface",
    };
  }
  if (surface !== "terminal") {
    let isCopied = (await copyViaRemoteClient(surface, caller.plugin, text)) === true;
    logForDebugging(
      `$.ui.copy (${caller.plugin}): ${text.length} chars to ${surface}: ` +
        (isCopied ? "copied" : "no client there took it; nothing copied"),
    );
    return isCopied
      ? {
          isCopied: true,
        }
      : {
          isCopied: false,
          reason: "no-clipboard",
        };
  }
  let osc52Payload = await setClipboard(text);
  let clipboardPath = getClipboardPath();
  let isOsc52Written = osc52Payload !== "" && osc52Payload.length <= MAX_UI_VALUE_BYTES;
  if (isOsc52Written) process.stdout.write(osc52Payload);
  let isCopied = isOsc52Written || clipboardPath !== "osc52";
  logForDebugging(
    `$.ui.copy (${caller.plugin}): ${text.length} chars, path ${clipboardPath}, OSC 52 ${isOsc52Written ? "written" : osc52Payload === "" ? "left out" : "over the write bound"}; ` +
      (isCopied ? "copied" : "nothing copied"),
  );
  return isCopied
    ? {
        isCopied: true,
      }
    : {
        isCopied: false,
        reason: "no-clipboard",
      };
}
//@ chunk-5xgkngpb.js:4103450-4103530 placement
/**
 * 补默认界面
 */
function withDefaultSurface(args, context) {
  let surface = args.surface ?? attachedSurfaces()[0];
  return surface === undefined
    ? args
    : {
        ...args,
        surface,
      };
}
//@ chunk-5xgkngpb.js:4103530-4103645 placement
function placedRowResult(row, reason) {
  if (reason === undefined)
    return {
      isPlaced: true,
      requestId: row.uuid,
    };
  return {
    isPlaced: false,
    requestId: row.uuid,
    reason,
  };
}
//@ chunk-5xgkngpb.js:4103645-4103683 placement
/**
 * 订阅放置事件
 */
var subscribePlaced = (listener) => getPluginRegistry().placed.subscribe(listener);
//@ chunk-5xgkngpb.js:4103683-4103695 placement
/**
 * 500
 */
var PLACED_EVENT_BUDGET_MS = 500;
//@ chunk-5xgkngpb.js:4103733-4103868 placement
var createPlacedRowMessage = (row, plugin) => ({
  type: "system",
  subtype: "placed",
  plugin,
  id: row.id,
  content: "",
  persist: false,
  timestamp: new Date().toISOString(),
  uuid: randomUUID(),
});
//@ chunk-5xgkngpb.js:4103868-4103944 placement
/**
 * 取 placed 系统事件
 */
var placedEvents = (rows) =>
  rows.flatMap((row) => (row.type === "system" && row.subtype === "placed" ? [row] : []));
//@ chunk-5xgkngpb.js:4103944-4104527 placement
async function uiPlaceRowForPlugin(row, caller, site) {
  let conversation = currentSurfaceBinding()?.conversation?.();
  if (conversation === undefined) {
    logFeatureBad("plugin_function_hooks_place", "no_conversation");
    return {
      isPlaced: false,
      reason: "no conversation to place a row in",
    };
  }
  let filtered = placedEvents(conversation.rows()).filter((placed) => placed.plugin === caller.plugin);
  let row_2 = filtered.find((placed) => placed.id === row.id);
  if (row_2 !== undefined) return placedRowResult(row_2, site);
  if (filtered.length >= PLACED_EVENT_BUDGET_MS) {
    logFeatureBad("plugin_function_hooks_place", "over_cap");
    return {
      isPlaced: false,
      reason: `a plugin holds at most ${PLACED_EVENT_BUDGET_MS} placed rows`,
    };
  }
  let row_3 = createPlacedRowMessage(row, caller.plugin);
  conversation.keep([row_3]);
  getPluginRegistry().placed.emit();
  if (site === undefined) logFeatureOk("plugin_function_hooks_place");
  else logFeatureSad("plugin_function_hooks_place", "undrawn");
  return placedRowResult(row_3, site);
}
//@ chunk-5xgkngpb.js:4104527-4104803 placement
/**
 * 列出会话中插件放置的行（插件、id、request_id 与之前最后一条用户/助手消息 uuid）。
 */
function listPlacedRows() {
  let rows = currentSurfaceBinding()?.conversation?.()?.rows() ?? [];
  let placed = [];
  let lastRow;
  for (let row of rows) {
    if ((row.type === "user" || row.type === "assistant") && !row.isMeta) lastRow = row;
    if (row.type === "system" && row.subtype === "placed")
      placed.push({
        plugin: row.plugin,
        id: row.id,
        request_id: row.uuid,
        ...(lastRow !== undefined && {
          after_uuid: lastRow.uuid,
        }),
      });
  }
  return placed;
}
//@ chunk-5xgkngpb.js:4104803-4104816 placement
/**
 * 3000
 */
var FOCUS_WAIT_MS = 3000;
//@ chunk-5xgkngpb.js:4104816-4105018 placement
/**
 * 校验 $.ui.focus 参数：需要非空的 requestId 与 key。
 */
function checkUiFocusArgs(args) {
  let requestId = args?.requestId;
  let key = args?.key;
  return typeof requestId === "string" && requestId !== "" && typeof key === "string" && key !== ""
    ? undefined
    : "takes { requestId, key } (which of its sites, and the element it drew there, by key)";
}
//@ chunk-5xgkngpb.js:4105018-4105251 placement
function pluginFocusSiteOf(args, caller) {
  let { requestId } = args;
  let { plugin } = caller;
  let any = paneRegistry()
    .getState()
    .open.some((pane) => pane.plugin === plugin && pane.id === requestId);
  let isAbovePrompt = requestId === ABOVE_PROMPT && renderPluginsFor("AbovePrompt").includes(plugin);
  let component = any ? "Pane" : isAbovePrompt ? "AbovePrompt" : undefined;
  return component === undefined
    ? undefined
    : {
        component,
        requestId,
      };
}
//@ chunk-5xgkngpb.js:4105251-4105650 placement
/**
 * 判断焦点目标是否已就绪（站点存在、持有键盘或面板已显示）。
 */
function isFocusSettled(args, caller) {
  let site = pluginFocusSiteOf(args, caller);
  let heldSite = site && focusSiteFor(site);
  let state = paneRegistry().getState();
  let hasAbovePrompt =
    focusSiteFor({
      component: "AbovePrompt",
      requestId: ABOVE_PROMPT,
    }) !== undefined;
  let isRequested = state.focusRequest === args.requestId && hasAbovePrompt;
  let isPane = site?.component === "Pane";
  if (
    site === undefined ||
    isUiRenderEvent(caller.rootEvent) ||
    (isPane
      ? state.placements === 0 || (state.shownId !== args.requestId && !isRequested)
      : heldSite === undefined)
  )
    return true;
  if (heldSite === undefined || isRequested) return false;
  let origin = {
    kind: "plugin",
    name: caller.plugin,
  };
  return (
    !heldSite.isHeldNow() ||
    isOtherPluginsHolder(heldSite, origin) ||
    heldSite.hasElement(caller.plugin, args.key)
  );
}
//@ chunk-5xgkngpb.js:4105650-4106187 placement
/**
 * 运行 ui.focus 钩子链（等待 hooks 重生），无钩子时直接提交焦点移动，记录结果。
 */
function dispatchUiFocus(request) {
  let { input, hookOrigin, signal } = request;
  let respawnWait = awaitHooksRespawn(
    {
      event: "ui.focus",
      e: input,
      origin: hookOrigin,
    },
    signal,
  );
  if (respawnWait !== undefined) return respawnWait.then(() => dispatchUiFocus(request));
  let handlers = hookMembersFor("ui.focus", hookOrigin);
  function report(answer) {
    let targetText = input.element === undefined ? "the engine's stop" : `${input.plugin}'s ${input.element}`;
    logForDebugging(
      `ui.focus ${input.component} ${input.requestId} (${input.origin.kind}) onto ${targetText}: ` +
        (answer.deny === undefined ? "moved" : `denied (${answer.deny})`),
    );
    return answer;
  }
  return handlers.length === 0
    ? report(commitFocus(input))
    : runUiChain(
        {
          event: "ui.focus",
          input,
          handlers,
          hookOrigin,
          signal,
        },
        (answer) =>
          signal?.aborted === true
            ? {
                deny: "the move was abandoned",
              }
            : commitFocus(answer),
      ).then(report);
}
//@ chunk-5xgkngpb.js:4106187-4106240 placement
/**
 * 焦点站点绘制表
 */
var focusSiteDraws; // deferred: uses getPluginRegistry (../../utils/plugins/pluginLoadState.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4106187", () => {
  focusSiteDraws = identity_2(
    () => getPluginRegistry().focusSiteDraws,
    (registry) => registry().clear(),
  );
});
//@ chunk-5xgkngpb.js:4106240-4106449 placement
async function sleepUntilChanged(isSettled, signal, timeoutMs) {
  let abortController = new AbortController();
  function abortIfSettled() {
    if (isSettled()) abortController.abort();
  }
  let releaseDraws = focusSiteDraws().subscribe(abortIfSettled);
  let releasePanes = paneRegistry().subscribe(abortIfSettled);
  try {
    await sleep(
      timeoutMs,
      signal === undefined ? abortController.signal : AbortSignal.any([signal, abortController.signal]),
    );
  } finally {
    releaseDraws();
    releasePanes();
  }
}
//@ chunk-5xgkngpb.js:4106449-4106579 placement
async function waitForCondition(isSettled, signal, timeoutMs = FOCUS_WAIT_MS) {
  let deadline = Date.now() + timeoutMs;
  while (!isSettled() && signal?.aborted !== true) {
    let remaining = deadline - Date.now();
    if (remaining <= 0) return;
    await sleepUntilChanged(isSettled, signal, remaining);
  }
}
//@ chunk-5xgkngpb.js:4106579-4107117 placement
/**
 * $.ui.focus 实现：等待站点稳定后，校验站点属于插件、持有键盘且画有该 key 的元素，再经 ui.focus 链移动焦点。
 */
async function uiFocusOp(args, caller, timeoutMs) {
  await waitForCondition(() => isFocusSettled(args, caller), caller.signal, timeoutMs);
  let site = pluginFocusSiteOf(args, caller);
  let heldSite = site && focusSiteFor(site);
  let origin = {
    kind: "plugin",
    name: caller.plugin,
  };
  if (!heldSite)
    return {
      deny: "not this plugin's site",
    };
  if (!heldSite.isHeldNow())
    return {
      deny: "that site does not hold the keyboard",
    };
  if (isOtherPluginsHolder(heldSite, origin))
    return {
      deny: "another plugin's element holds the keyboard",
    };
  if (!heldSite.hasElement(caller.plugin, args.key))
    return {
      deny: "no element of its own is drawn under that key",
    };
  return dispatchUiFocus({
    input: {
      component: heldSite.component,
      requestId: heldSite.requestId,
      plugin: caller.plugin,
      element: args.key,
      origin,
    },
    hookOrigin: caller.origin,
    signal: caller.signal,
  });
}
//@ chunk-5xgkngpb.js:4107117-4107179 placement
/**
 * 包装处理器，跳过指定键
 */
var wrapActHandlers = (session, handlers, kept = []) =>
  import_mapValues(handlers, (handler, name) => (kept.includes(name) ? handler : () => session.act(handler)));
//@ chunk-5xgkngpb.js:4107179-4107190 placement
/**
 * 64
 */
var MAX_FOCUS_KEYS = 64;
//@ chunk-5xgkngpb.js:4107190-4107194 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4107190", () => {
  init_react_production();
});
//@ chunk-5xgkngpb.js:4107194-4107234 placement
/**
 * 取值或 null
 */
var pickOrNull = (focusables, index) => (index === null ? null : (focusables[index] ?? null));
//@ chunk-5xgkngpb.js:4107234-4107307 placement
/**
 * 记录拒绝但不抛
 */
var logRejection = (label, promise) =>
  promise.catch((error) => {
    logForDebugging(`${label}: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  });
//@ chunk-5xgkngpb.js:4107307-4109570 placement
/**
 * 插件 $.ui.focus：把焦点移到插件元素；焦点已变化或元素不存在时说明原因。
 */
function uiFocusForPlugin(props) {
  let { component, requestId, owner, focusables, isHeld } = props;
  let { isHeldNow, indexNow, isEmptyNow, land } = props;
  let inFlight = useRef(undefined);
  let queue = useRef([]);
  let hasMoved = useRef(false);
  let isMounted = useRef(true);
  let drainQueue = useCallback(() => {
    while (inFlight.current === undefined && queue.current.length > 0) {
      let [next, ...rest] = queue.current;
      queue.current = rest;
      next?.();
    }
  }, []);
  let forget = useCallback(() => {
    inFlight.current?.abort.abort();
    inFlight.current = undefined;
    queue.current = [];
  }, []);
  let moveFocus = useCallback(
    (input, expectation) => {
      let pending = {
        ...expectation,
        abort: new AbortController(),
      };
      inFlight.current = pending;
      let result = dispatchUiFocus({
        input,
        signal: pending.abort.signal,
      });
      function settle() {
        let isCurrent = inFlight.current === pending;
        if (isCurrent) inFlight.current = undefined;
        if (isCurrent && isMounted.current) drainQueue();
      }
      return result instanceof Promise
        ? void logRejection(`ui.focus ${requestId}`, result).finally(settle)
        : settle();
    },
    [requestId, drainQueue],
  );
  let moveByPerson = useCallback(
    (move) => {
      let focusable = pickOrNull(focusables, move.index);
      if (move.index !== null && focusable === null) return;
      hasMoved.current = true;
      moveFocus(
        {
          component,
          requestId,
          ...(focusable && {
            plugin: focusable.plugin,
            element: focusable.element,
          }),
          origin: {
            kind: "person",
          },
        },
        {
          expected: indexNow(),
          move,
        },
      );
    },
    [component, requestId, focusables, indexNow, moveFocus],
  );
  let act = useCallback((action) => {
    if (!(inFlight.current !== undefined || queue.current.length > 0)) action();
    else if (queue.current.length < MAX_FOCUS_KEYS) queue.current = [...queue.current, action];
  }, []);
  let indexOfElement = useCallback(
    (pluginName, element) =>
      focusables.findIndex((focusable) => focusable.plugin === pluginName && focusable.element === element),
    [focusables],
  );
  let commit = useCallback(
    (input) => {
      let pending = inFlight.current;
      let isEngineStop = input.element === undefined;
      if (input.origin.kind === "person") {
        let move = pending?.move;
        if (pending === undefined || move === undefined || indexNow() !== pending.expected)
          return "the focus moved meanwhile";
        let target = pickOrNull(focusables, move.index);
        if (
          isEngineStop ||
          (target !== null && target.plugin === input.plugin && target.element === input.element)
        ) {
          move.apply();
          return;
        }
      }
      let auto = pending?.auto;
      if (
        auto !== undefined &&
        input.plugin === auto.plugin &&
        input.element === auto.element &&
        indexNow() !== pending?.expected
      )
        return "the focus moved meanwhile";
      let index = indexOfElement(input.plugin, input.element);
      if (index < 0)
        return isEngineStop ? "no element named" : `no element of ${input.plugin} is drawn under that key`;
      hasMoved.current = true;
      land(index);
      return;
    },
    [focusables, indexNow, land, indexOfElement],
  );
  useLayoutEffect(() => {
    let focusSiteKey = siteKey(component, requestId);
    focusSites().set(focusSiteKey, {
      component,
      requestId,
      owner,
      isHeldNow,
      holderNow: () => pickOrNull(focusables, indexNow())?.plugin,
      hasElement: (pluginName, element) => indexOfElement(pluginName, element) >= 0,
      commit,
    });
    focusSiteDraws().emit();
    return () => {
      focusSites().delete(focusSiteKey);
    };
  }, [component, requestId, owner, focusables, isHeldNow, indexNow, indexOfElement, commit]);
  let autoFocusable = useMemo(() => focusables.find((focusable) => focusable.isAutoFocus), [focusables]);
  useEffect(() => {
    if (!isHeld) {
      hasMoved.current = false;
      forget();
      return;
    }
    if (!(
      hasMoved.current ||
      inFlight.current !== undefined ||
      autoFocusable === undefined ||
      !isEmptyNow()
    )) {
      hasMoved.current = true;
      moveFocus(
        {
          component,
          requestId,
          plugin: autoFocusable.plugin,
          element: autoFocusable.element,
          origin: {
            kind: "plugin",
            name: autoFocusable.plugin,
          },
        },
        {
          expected: indexNow(),
          auto: autoFocusable,
        },
      );
    }
  }, [isHeld, autoFocusable, isEmptyNow, indexNow, component, requestId, moveFocus, forget]);
  useEffect(
    () => () => {
      isMounted.current = false;
      forget();
    },
    [forget],
  );
  return useMemo(
    () => ({
      act,
      moveByPerson,
      forget,
    }),
    [act, moveByPerson, forget],
  );
}
//@ chunk-5xgkngpb.js:4109570-4109631 placement
/**
 * $.ui.log 写调试日志
 */
function logUiLogToDebug(plugin, text) {
  logForDebugging(`[${plugin}] $.ui.log (to debug): ${truncateUiLog(text)}`);
}
//@ chunk-5xgkngpb.js:4109631-4109787 placement
/**
 * 设置插件 UI 日志的接收函数，并把积压的日志以 "again" 重放；返回解除函数。
 */
function setUiLogSink(sink) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.uiLogSink = sink;
  let pendingUiLog = pluginRegistry.pendingUiLog;
  pluginRegistry.pendingUiLog = [];
  for (let line of pendingUiLog) sink(line, "again");
  return () => {
    if (pluginRegistry.uiLogSink === sink) pluginRegistry.uiLogSink = null;
  };
}
//@ chunk-5xgkngpb.js:4109787-4109918 placement
/**
 * $.ui.log 的 to 只能是 "transcript" 或 "debug"。
 */
function checkUiLogTarget(target) {
  return target === undefined || target === "transcript" || target === "debug"
    ? undefined
    : `to is "transcript" or "debug" (got ${JSON.stringify(target)})`;
}
//@ chunk-5xgkngpb.js:4109918-4110047 placement
/**
 * 校验 $.ui.notify 参数：text 合法，title 若给出须为字符串。
 */
function checkUiNotifyArgs(args) {
  let title = args?.title;
  let isTitleValid = title === undefined || typeof title === "string";
  return checkTextArg(args?.text) ?? (isTitleValid ? undefined : "title is a string, when given");
}
//@ chunk-5xgkngpb.js:4110047-4110441 placement
/**
 * 把通知通道结果映射为 $.ui.notify 返回值（发送渠道或未发送原因）。
 */
function notifyOutcome(outcome, plugin) {
  switch (outcome) {
    case "no_surface":
      return {
        isSent: false,
        reason: "no-surface",
      };
    case "iterm2":
    case "iterm2_with_bell":
    case "kitty":
    case "ghostty":
    case "terminal_bell":
      return {
        isSent: true,
        channel: outcome,
      };
    case "disabled":
      return {
        isSent: false,
        reason: "disabled",
      };
    case "none":
    case "no_method_available":
      return {
        isSent: false,
        reason: "no-channel",
      };
    case "error":
      throw new HooksError(`${plugin}: $.ui.notify: the channel's write failed`);
  }
}
//@ chunk-5xgkngpb.js:4110441-4110741 placement
/**
 * $.ui.notify：通过终端通知通道（iTerm2、kitty、ghostty、响铃等）发送插件通知，返回是否发送及渠道或原因。
 */
async function uiNotifyOp(args, caller) {
  let isShuttingDown = isTerminalShutdown();
  let result = notifyOutcome(
    isShuttingDown
      ? "no_surface"
      : ((await currentSurfaceBinding()?.notify?.(
          {
            message: args.text,
            title: args.title || caller.plugin,
            notificationType: "plugin_notification",
          },
          caller.origin,
        )) ?? "no_surface"),
    caller.plugin,
  );
  logForDebugging(
    `$.ui.notify (${caller.plugin}): ${args.text.length} chars: ` +
      (result.isSent ? `sent by ${result.channel}` : result.reason),
  );
  return result;
}
//@ chunk-5xgkngpb.js:4110741-4110789 placement
/**
 * 补默认标题
 */
var withDefaultTitle = (args, caller) => ({
  ...args,
  title: args.title || caller.plugin,
});
//@ chunk-5xgkngpb.js:4110789-4110802 placement
/**
 * 3000
 */
var VIEW_WAIT_MS = 3000;
//@ chunk-5xgkngpb.js:4113175-4113496 placement
/**
 * 校验 $.ui.view 参数：只允许 {agentId}（非空字符串）或 {}（主对话）。
 */
function checkUiViewArgs(args) {
  return isPlainObject_6(args) &&
    Object.prototype.toString.call(args) === "[object Object]" &&
    Reflect.ownKeys(args).every((key) => key === "agentId") &&
    (!("agentId" in args) || (typeof args.agentId === "string" && args.agentId !== ""))
    ? undefined
    : "takes { agentId } (whose transcript the main view shows, by its id in $.agent.list()) or {} for the main conversation";
}
//@ chunk-5xgkngpb.js:4113496-4114186 placement
async function uiViewForPlugin(args, caller) {
  let view = currentSurfaceBinding()?.view;
  if (!view)
    return {
      deny: "no main view here",
    };
  if (!isPersonInitiated(caller)) {
    logForDebugging(
      `ui.view ${caller.plugin}: denied, not person-initiated (root ${caller.rootEvent ?? "none"})`,
    );
    return {
      deny: "not person-initiated",
    };
  }
  let outcome = await view.show(args);
  switch (
    (logForDebugging(`ui.view ${caller.plugin}: ${outcome}`),
    outcome === "shown"
      ? logFeatureOk("plugin_function_hooks_view_switch")
      : logFeatureBad("plugin_function_hooks_view_switch", outcome),
    outcome)
  ) {
    case "shown":
      return {};
    case "unknown":
      return {
        deny: "no agent under that id",
      };
    case "hidden":
      return {
        deny: "that agent is not one the tasks list shows",
      };
    case "ended":
      return {
        deny: "that agent has ended",
      };
    case "moved":
      return {
        deny: "the view moved meanwhile",
      };
    case "elsewhere":
      return {
        deny: "that agent's transcript is not in this session",
      };
  }
}
export {
  createRemotePromptBox,
  createRemoteSelectionReader,
  withCurrentRequester,
  BACKDROP_CLEAR_DELAY_MS,
  causeOnlyResult,
  selectionResult,
  setUiLogSink,
  listPlacedRows,
  subscribePlaced,
  focusSiteDraws,
  dispatchUiFocus,
  UI_HOST_REQUEST_TIMEOUT_MS,
  MEMORY_SERVER_MAX,
  checkUiLogTarget,
  logUiLogToDebug,
  uiPlaceRowForPlugin,
  checkUiFocusArgs,
  uiFocusOp,
  withDefaultSurface,
  uiCopyForPlugin,
  checkUiViewArgs,
  uiViewForPlugin,
  checkUiNotifyArgs,
  withDefaultTitle,
  uiNotifyOp,
  VIEW_WAIT_MS,
  uiFocusForPlugin,
  wrapActHandlers,
  pickOrNull,
  logRejection,
  selectionValue,
};

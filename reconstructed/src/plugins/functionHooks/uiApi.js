/**
 * plugins/functionHooks/uiApi.ts
 *
 * 2.1.316 新增：插件 $.ui 接口（focus、press、resolve 等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (56)
 * attribution: placement 56
 */
import { randomUUID } from "crypto";
import { identity as identity_2 } from "../../utils/identity.js";
import { clientRegistry, paneRegistry, checkTextArg } from "./panes.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { aEt } from "./promptApi.js";
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
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { init_react_production, R, ce, zt, Q, P } from "../../../vendor/react/cjs/react.production.js";
import { truncateUiLog } from "./hooksWorkerClient.js";
import { HooksError } from "./hooksErrors.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";

//@ chunk-e6aww6q8.js:3993711-3993767 placement
/**
 * 选区对象
 */
var selectionValue = (text, n) =>
  n === undefined
    ? {
        text,
      }
    : {
        text,
        requestId: n,
      };
//@ chunk-e6aww6q8.js:3993767-3993841 placement
/**
 * 空则 undefined
 */
function emptyOrSelection(text, n) {
  return text === undefined || text === "" ? undefined : selectionValue(text, n === "" ? undefined : n);
}
//@ chunk-e6aww6q8.js:3993841-3993892 placement
/**
 * 选区结果
 */
var selectionResult = (text, instanceId) => ({
  selection: emptyOrSelection(text, instanceId),
  cause: undefined,
});
//@ chunk-e6aww6q8.js:3993892-3993944 placement
/**
 * 当前请求者
 */
var currentRequester = identity_2(
  {
    current: undefined,
  },
  (e) => {
    e.current = undefined;
  },
);
//@ chunk-e6aww6q8.js:3993944-3993972 placement
/**
 * 非终端界面
 */
var isNonTerminalSurface = (surface) => surface !== "terminal";
//@ chunk-e6aww6q8.js:3993972-3994035 placement
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
//@ chunk-e6aww6q8.js:3994035-3994198 placement
var answeringClientsOf = (requester, n, r) =>
  clientRegistry.list().flatMap((s) => {
    let { clientId, surface } = s;
    return requester !== undefined &&
      (r === undefined || surface === r) &&
      s.answers?.includes(n) === true &&
      isNonTerminalSurface(surface)
      ? [requesterClient(requester, clientId, surface)]
      : [];
  });
//@ chunk-e6aww6q8.js:3994198-3994233 placement
/**
 * 能回答的客户端
 */
var answeringClients = (e, n) => answeringClientsOf(currentRequester.current, e, n);
//@ chunk-e6aww6q8.js:3994233-3994431 placement
/**
 * 按当前请求者的可达范围列出能回答某能力的远程客户端：first 只取第一个，否则把静默客户端排到后面。
 */
function reachableClients(e, n) {
  let r = currentRequester.current?.reach() ?? "none";
  let h = r !== "none" ? answeringClients(e, n) : [];
  let y = r === "first";
  let S = (w) => Number(clientRegistry.isSilent(w.client.clientId));
  return y ? h.filter((w) => w === h[0]) : h.toSorted((w, L) => S(w) - S(L));
}
//@ chunk-e6aww6q8.js:3994431-3994659 placement
/**
 * 依次询问能回答某能力的客户端，第一个给出结果的记为 heard 并返回；不回答的记为 missed。
 */
async function askClientsInTurn(e, n, r) {
  let s = new Set();
  let h = () => reachableClients(e, r).find((y) => !s.has(y.client.clientId));
  for (let y = h(); y !== undefined; y = h()) {
    let { clientId } = y.client;
    s.add(clientId);
    let w = await n(y);
    if (w !== undefined) {
      clientRegistry.heard(clientId);
      return w;
    }
    clientRegistry.missed(clientId);
  }
  return;
}
//@ chunk-e6aww6q8.js:3994659-3994670 placement
/**
 * 1e6
 */
var MAX_COPY_CHARS = 1e6;
//@ chunk-e6aww6q8.js:3994670-3994936 placement
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
      (s) =>
        s.requester.copy({
          ...s.client,
          plugin,
          text,
        }),
      surface,
    )) === true
  );
}
//@ chunk-e6aww6q8.js:3994936-3995037 placement
async function requireSelection(e) {
  let n = await e;
  if (n.selection === undefined) throw Error("nothing selected");
  return n;
}
//@ chunk-e6aww6q8.js:3995037-3995050 placement
/**
 * 发给界面宿主的请求（复制、读选区、读写提示等）默认超时 5 秒。
 */
var UI_HOST_REQUEST_TIMEOUT_MS = 5000;
//@ chunk-e6aww6q8.js:3995050-3995128 placement
/**
 * 设置当前请求者
 */
function withCurrentRequester(e) {
  currentRequester.current = e;
  return () => {
    if (currentRequester.current === e) currentRequester.current = undefined;
  };
}
//@ chunk-e6aww6q8.js:3995128-3995299 placement
function selectionReadCause(e) {
  let filtered = e.map((h) => h.cause).filter((h) => h !== "not_asked");
  let included = filtered.includes("parse_failed");
  return filtered.includes(undefined)
    ? undefined
    : included
      ? "parse_failed"
      : (filtered.at(0) ?? "not_asked");
}
//@ chunk-e6aww6q8.js:3995299-3995529 placement
function logSelectionReadOutcome(e) {
  let n = selectionReadCause(e);
  if (n === undefined) {
    logFeatureOk("plugin_function_hooks_selection_read");
    return;
  }
  if (n === "parse_failed") {
    logFeatureBad("plugin_function_hooks_selection_read", n);
    return;
  }
  if (n !== "not_asked") logFeatureSad("plugin_function_hooks_selection_read", n);
}
//@ chunk-e6aww6q8.js:3995529-3996887 placement
/**
 * headless 模式下的输入框代理：read/write/paint/forget/propose 优先交给远程客户端（ui_prompt_* 能力），没有则用本地实现。
 */
function createRemotePromptBox(e) {
  let n = new Map();
  let r = 0;
  return {
    read: async () => {
      let h =
        reachableClients("ui_prompt_read").length > 0
          ? await askClientsInTurn("ui_prompt_read", (y) => y.requester.readPrompt(y.client))
          : e.read();
      if (h === undefined) return aEt;
      return {
        text: h.text,
        cursor: Math.min(h.cursor, h.text.length),
      };
    },
    write: async (s, mode, y) => {
      if (reachableClients("ui_prompt_fill").length === 0)
        return {
          isFilled: false,
          refusal: "no_composer",
        };
      let S = nonEmptySpans(normalizeInputDecorations(y?.decorations, s));
      return {
        isFilled:
          s.length <= MAX_COPY_CHARS &&
          (await askClientsInTurn("ui_prompt_fill", (L) =>
            L.requester.fillPrompt({
              ...L.client,
              text: s,
              mode,
              ...(S.length > 0 && {
                decorations: S,
              }),
              ...(y?.cursor !== undefined && {
                cursor: clampPositive(y.cursor, Number.MAX_SAFE_INTEGER),
              }),
              answersPress: logPressFill(y?.answersPress, L.client.clientId),
            }),
          )) === true,
      };
    },
    paint: async (s, h, y) => {
      let S = h.length === 0 ? undefined : y;
      let w = nonEmptySpans(normalizeInputDecorations(h, S ?? ""));
      if (S !== undefined) {
        r += 1;
        n.set(s, r);
      }
      let L = n.get(s);
      let G =
        (S === undefined || S.length <= MAX_COPY_CHARS) &&
        (await askClientsInTurn("ui_prompt_paint", (Z) =>
          Z.requester.paintPrompt({
            ...Z.client,
            layer: s,
            ...(S !== undefined && {
              text: S,
            }),
            ...(w.length > 0 && {
              decorations: w,
            }),
          }),
        )) === true;
      if (S === undefined && G && n.get(s) === L) n.delete(s);
      return {
        isPainted: G,
      };
    },
    forget: (s) => {
      let h = n.get(s);
      if (h !== undefined)
        askClientsInTurn("ui_prompt_paint", (y) =>
          y.requester.paintPrompt({
            ...y.client,
            layer: s,
          }),
        )
          .then((y) => {
            if (y === true && n.get(s) === h) n.delete(s);
          })
          .catch((error) => {
            logForDebugging(`prompt.paint: ${errorMessage(error)}`, {
              level: "error",
            });
          });
    },
    propose: async (s) => ({
      isShown:
        s.length <= MAX_COPY_CHARS &&
        (await askClientsInTurn("ui_prompt_suggest", (y) =>
          y.requester.suggestPrompt({
            ...y.client,
            text: s,
          }),
        )) === true,
    }),
  };
}
//@ chunk-e6aww6q8.js:3996887-3996929 placement
/**
 * 只有原因的失败结果
 */
var causeOnlyResult = (cause) => ({
  selection: undefined,
  cause,
});
//@ chunk-e6aww6q8.js:3996929-3997125 placement
async function readFirstSelection(e) {
  let mapped = e.map((s) => s.catch(() => causeOnlyResult("aborted")));
  let r = await Promise.any(mapped.map(requireSelection)).catch(() => {
    return;
  });
  if (r === undefined) {
    logSelectionReadOutcome(await Promise.all(mapped));
    return;
  }
  logSelectionReadOutcome([r]);
  return r.selection;
}
//@ chunk-e6aww6q8.js:3997125-3997226 placement
/**
 * headless 模式下的选区读取器：并行询问所有能读选区的客户端，取第一个有选区的结果。
 */
var createRemoteSelectionReader = () => ({
  read: () =>
    readFirstSelection(answeringClients("ui_read_selection").map((e) => e.requester.readSelection(e.client))),
});
//@ chunk-e6aww6q8.js:3997226-3997242 placement
/**
 * 1048576
 */
var MAX_UI_VALUE_BYTES = 1048576;
//@ chunk-e6aww6q8.js:3997242-3997993 placement
async function uiCopyForPlugin(e, n) {
  let { text, surface } = e;
  if (!(surface !== undefined && attachedSurfaces().includes(surface))) {
    logForDebugging(
      `$.ui.copy (${n.plugin}): no surface draws (${surface ?? "none attached"}); nothing copied`,
    );
    return {
      isCopied: false,
      reason: "no-surface",
    };
  }
  if (surface !== "terminal") {
    let G = (await copyViaRemoteClient(surface, n.plugin, text)) === true;
    logForDebugging(
      `$.ui.copy (${n.plugin}): ${text.length} chars to ${surface}: ` +
        (G ? "copied" : "no client there took it; nothing copied"),
    );
    return G
      ? {
          isCopied: true,
        }
      : {
          isCopied: false,
          reason: "no-clipboard",
        };
  }
  let y = await setClipboard(text);
  let clipboardPath = getClipboardPath();
  let w = y !== "" && y.length <= MAX_UI_VALUE_BYTES;
  if (w) process.stdout.write(y);
  let L = w || clipboardPath !== "osc52";
  logForDebugging(
    `$.ui.copy (${n.plugin}): ${text.length} chars, path ${clipboardPath}, OSC 52 ${w ? "written" : y === "" ? "left out" : "over the write bound"}; ` +
      (L ? "copied" : "nothing copied"),
  );
  return L
    ? {
        isCopied: true,
      }
    : {
        isCopied: false,
        reason: "no-clipboard",
      };
}
//@ chunk-e6aww6q8.js:3997993-3998073 placement
/**
 * 补默认界面
 */
function withDefaultSurface(e, n) {
  let r = e.surface ?? attachedSurfaces()[0];
  return r === undefined
    ? e
    : {
        ...e,
        surface: r,
      };
}
//@ chunk-e6aww6q8.js:3998073-3998188 placement
function placedRowResult(e, n) {
  if (n === undefined)
    return {
      isPlaced: true,
      requestId: e.uuid,
    };
  return {
    isPlaced: false,
    requestId: e.uuid,
    reason: n,
  };
}
//@ chunk-e6aww6q8.js:3998188-3998226 placement
/**
 * 订阅放置事件
 */
var subscribePlaced = (e) => getPluginRegistry().placed.subscribe(e);
//@ chunk-e6aww6q8.js:3998226-3998238 placement
/**
 * 500
 */
var PLACED_EVENT_BUDGET_MS = 500;
//@ chunk-e6aww6q8.js:3998276-3998411 placement
var createPlacedRowMessage = (e, plugin) => ({
  type: "system",
  subtype: "placed",
  plugin,
  id: e.id,
  content: "",
  persist: false,
  timestamp: new Date().toISOString(),
  uuid: randomUUID(),
});
//@ chunk-e6aww6q8.js:3998411-3998487 placement
/**
 * 取 placed 系统事件
 */
var placedEvents = (e) => e.flatMap((n) => (n.type === "system" && n.subtype === "placed" ? [n] : []));
//@ chunk-e6aww6q8.js:3998487-3999070 placement
async function uiPlaceRowForPlugin(e, n, r) {
  let s = currentSurfaceBinding()?.conversation?.();
  if (s === undefined) {
    logFeatureBad("plugin_function_hooks_place", "no_conversation");
    return {
      isPlaced: false,
      reason: "no conversation to place a row in",
    };
  }
  let filtered = placedEvents(s.rows()).filter((w) => w.plugin === n.plugin);
  let found = filtered.find((w) => w.id === e.id);
  if (found !== undefined) return placedRowResult(found, r);
  if (filtered.length >= PLACED_EVENT_BUDGET_MS) {
    logFeatureBad("plugin_function_hooks_place", "over_cap");
    return {
      isPlaced: false,
      reason: `a plugin holds at most ${PLACED_EVENT_BUDGET_MS} placed rows`,
    };
  }
  let placedRowMessage = createPlacedRowMessage(e, n.plugin);
  s.keep([placedRowMessage]);
  getPluginRegistry().placed.emit();
  if (r === undefined) logFeatureOk("plugin_function_hooks_place");
  else logFeatureSad("plugin_function_hooks_place", "undrawn");
  return placedRowResult(placedRowMessage, r);
}
//@ chunk-e6aww6q8.js:3999070-3999346 placement
/**
 * 列出会话中插件放置的行（插件、id、request_id 与之前最后一条用户/助手消息 uuid）。
 */
function listPlacedRows() {
  let e = currentSurfaceBinding()?.conversation?.()?.rows() ?? [];
  let n = [];
  let r;
  for (let s of e) {
    if ((s.type === "user" || s.type === "assistant") && !s.isMeta) r = s;
    if (s.type === "system" && s.subtype === "placed")
      n.push({
        plugin: s.plugin,
        id: s.id,
        request_id: s.uuid,
        ...(r !== undefined && {
          after_uuid: r.uuid,
        }),
      });
  }
  return n;
}
//@ chunk-e6aww6q8.js:3999346-3999359 placement
/**
 * 3000
 */
var FOCUS_WAIT_MS = 3000;
//@ chunk-e6aww6q8.js:3999359-3999561 placement
/**
 * 校验 $.ui.focus 参数：需要非空的 requestId 与 key。
 */
function checkUiFocusArgs(e) {
  let requestId = e?.requestId;
  let key = e?.key;
  return typeof requestId === "string" && requestId !== "" && typeof key === "string" && key !== ""
    ? undefined
    : "takes { requestId, key } (which of its sites, and the element it drew there, by key)";
}
//@ chunk-e6aww6q8.js:3999561-3999794 placement
function pluginFocusSiteOf(e, n) {
  let { requestId } = e;
  let { plugin } = n;
  let any = paneRegistry()
    .getState()
    .open.some((w) => w.plugin === plugin && w.id === requestId);
  let y = requestId === ABOVE_PROMPT && renderPluginsFor("AbovePrompt").includes(plugin);
  let S = any ? "Pane" : y ? "AbovePrompt" : undefined;
  return S === undefined
    ? undefined
    : {
        component: S,
        requestId,
      };
}
//@ chunk-e6aww6q8.js:3999794-4000193 placement
/**
 * 判断焦点目标是否已就绪（站点存在、持有键盘或面板已显示）。
 */
function isFocusSettled(e, n) {
  let r = pluginFocusSiteOf(e, n);
  let s = r && focusSiteFor(r);
  let state = paneRegistry().getState();
  let y =
    focusSiteFor({
      component: "AbovePrompt",
      requestId: ABOVE_PROMPT,
    }) !== undefined;
  let S = state.focusRequest === e.requestId && y;
  let w = r?.component === "Pane";
  if (
    r === undefined ||
    isUiRenderEvent(n.rootEvent) ||
    (w ? state.placements === 0 || (state.shownId !== e.requestId && !S) : s === undefined)
  )
    return true;
  if (s === undefined || S) return false;
  let G = {
    kind: "plugin",
    name: n.plugin,
  };
  return !s.isHeldNow() || isOtherPluginsHolder(s, G) || s.hasElement(n.plugin, e.key);
}
//@ chunk-e6aww6q8.js:4000193-4000730 placement
/**
 * 运行 ui.focus 钩子链（等待 hooks 重生），无钩子时直接提交焦点移动，记录结果。
 */
function dispatchUiFocus(e) {
  let { input, hookOrigin, signal } = e;
  let h = awaitHooksRespawn(
    {
      event: "ui.focus",
      e: input,
      origin: hookOrigin,
    },
    signal,
  );
  if (h !== undefined) return h.then(() => dispatchUiFocus(e));
  let y = hookMembersFor("ui.focus", hookOrigin);
  function S(L) {
    let q = input.element === undefined ? "the engine's stop" : `${input.plugin}'s ${input.element}`;
    logForDebugging(
      `ui.focus ${input.component} ${input.requestId} (${input.origin.kind}) onto ${q}: ` +
        (L.deny === undefined ? "moved" : `denied (${L.deny})`),
    );
    return L;
  }
  return y.length === 0
    ? S(commitFocus(input))
    : runUiChain(
        {
          event: "ui.focus",
          input,
          handlers: y,
          hookOrigin,
          signal,
        },
        (L) =>
          signal?.aborted === true
            ? {
                deny: "the move was abandoned",
              }
            : commitFocus(L),
      ).then(S);
}
//@ chunk-e6aww6q8.js:4000730-4000783 placement
/**
 * 焦点站点绘制表
 */
var focusSiteDraws = identity_2(
  () => getPluginRegistry().focusSiteDraws,
  (e) => e().clear(),
);
//@ chunk-e6aww6q8.js:4000783-4000992 placement
async function sleepUntilChanged(e, n, r) {
  let abortController = new AbortController();
  function h() {
    if (e()) abortController.abort();
  }
  let y = focusSiteDraws().subscribe(h);
  let S = paneRegistry().subscribe(h);
  try {
    await sleep(r, n === undefined ? abortController.signal : AbortSignal.any([n, abortController.signal]));
  } finally {
    y();
    S();
  }
}
//@ chunk-e6aww6q8.js:4000992-4001122 placement
async function waitForCondition(e, signal, r = FOCUS_WAIT_MS) {
  let s = Date.now() + r;
  while (!e() && signal?.aborted !== true) {
    let h = s - Date.now();
    if (h <= 0) return;
    await sleepUntilChanged(e, signal, h);
  }
}
//@ chunk-e6aww6q8.js:4001122-4001660 placement
/**
 * $.ui.focus 实现：等待站点稳定后，校验站点属于插件、持有键盘且画有该 key 的元素，再经 ui.focus 链移动焦点。
 */
async function uiFocusOp(e, n, r) {
  await waitForCondition(() => isFocusSettled(e, n), n.signal, r);
  let s = pluginFocusSiteOf(e, n);
  let h = s && focusSiteFor(s);
  let y = {
    kind: "plugin",
    name: n.plugin,
  };
  if (!h)
    return {
      deny: "not this plugin's site",
    };
  if (!h.isHeldNow())
    return {
      deny: "that site does not hold the keyboard",
    };
  if (isOtherPluginsHolder(h, y))
    return {
      deny: "another plugin's element holds the keyboard",
    };
  if (!h.hasElement(n.plugin, e.key))
    return {
      deny: "no element of its own is drawn under that key",
    };
  return dispatchUiFocus({
    input: {
      component: h.component,
      requestId: h.requestId,
      plugin: n.plugin,
      element: e.key,
      origin: y,
    },
    hookOrigin: n.origin,
    signal: n.signal,
  });
}
//@ chunk-e6aww6q8.js:4001660-4001722 placement
/**
 * 包装处理器，跳过指定键
 */
var wrapActHandlers = (e, n, r = []) => xr(n, (s, h) => (r.includes(h) ? s : () => e.act(s)));
//@ chunk-e6aww6q8.js:4001722-4001733 placement
/**
 * 64
 */
var MAX_FOCUS_KEYS = 64;
//@ chunk-e6aww6q8.js:4001733-4001737 placement
init_react_production();
//@ chunk-e6aww6q8.js:4001737-4001777 placement
/**
 * 取值或 null
 */
var pickOrNull = (focusables, n) => (n === null ? null : (focusables[n] ?? null));
//@ chunk-e6aww6q8.js:4001777-4001850 placement
/**
 * 记录拒绝但不抛
 */
var logRejection = (e, n) =>
  n.catch((error) => {
    logForDebugging(`${e}: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  });
//@ chunk-e6aww6q8.js:4001850-4004104 placement
/**
 * 插件 $.ui.focus：把焦点移到插件元素；焦点已变化或元素不存在时说明原因。
 */
function uiFocusForPlugin(props) {
  let { component, requestId, owner, focusables, isHeld } = props;
  let { isHeldNow, indexNow, isEmptyNow, land } = props;
  let q = R(undefined);
  let Z = R([]);
  let Se = R(false);
  let ke = R(true);
  let we = ce(() => {
    while (q.current === undefined && Z.current.length > 0) {
      let [Je, ...nt] = Z.current;
      Z.current = nt;
      Je?.();
    }
  }, []);
  let Ee = ce(() => {
    q.current?.abort.abort();
    q.current = undefined;
    Z.current = [];
  }, []);
  let Ae = ce(
    (input, nt) => {
      let pt = {
        ...nt,
        abort: new AbortController(),
      };
      q.current = pt;
      let Et = dispatchUiFocus({
        input,
        signal: pt.abort.signal,
      });
      function yt() {
        let At = q.current === pt;
        if (At) q.current = undefined;
        if (At && ke.current) we();
      }
      return Et instanceof Promise ? void logRejection(`ui.focus ${requestId}`, Et).finally(yt) : yt();
    },
    [requestId, we],
  );
  let Ie = ce(
    (Je) => {
      let nt = pickOrNull(focusables, Je.index);
      if (Je.index !== null && nt === null) return;
      Se.current = true;
      Ae(
        {
          component,
          requestId,
          ...(nt && {
            plugin: nt.plugin,
            element: nt.element,
          }),
          origin: {
            kind: "person",
          },
        },
        {
          expected: indexNow(),
          move: Je,
        },
      );
    },
    [component, requestId, focusables, indexNow, Ae],
  );
  let Me = ce((Je) => {
    if (!(q.current !== undefined || Z.current.length > 0)) Je();
    else if (Z.current.length < MAX_FOCUS_KEYS) Z.current = [...Z.current, Je];
  }, []);
  let We = ce(
    (Je, nt) => focusables.findIndex((focusable) => focusable.plugin === Je && focusable.element === nt),
    [focusables],
  );
  let ze = ce(
    (Je) => {
      let nt = q.current;
      let pt = Je.element === undefined;
      if (Je.origin.kind === "person") {
        let move = nt?.move;
        if (nt === undefined || move === undefined || indexNow() !== nt.expected)
          return "the focus moved meanwhile";
        let Yt = pickOrNull(focusables, move.index);
        if (pt || (Yt !== null && Yt.plugin === Je.plugin && Yt.element === Je.element)) {
          move.apply();
          return;
        }
      }
      let auto = nt?.auto;
      if (
        auto !== undefined &&
        Je.plugin === auto.plugin &&
        Je.element === auto.element &&
        indexNow() !== nt?.expected
      )
        return "the focus moved meanwhile";
      let gt = We(Je.plugin, Je.element);
      if (gt < 0) return pt ? "no element named" : `no element of ${Je.plugin} is drawn under that key`;
      Se.current = true;
      land(gt);
      return;
    },
    [focusables, indexNow, land, We],
  );
  zt(() => {
    let Je = siteKey(component, requestId);
    focusSites().set(Je, {
      component,
      requestId,
      owner,
      isHeldNow,
      holderNow: () => pickOrNull(focusables, indexNow())?.plugin,
      hasElement: (nt, pt) => We(nt, pt) >= 0,
      commit: ze,
    });
    focusSiteDraws().emit();
    return () => {
      focusSites().delete(Je);
    };
  }, [component, requestId, owner, focusables, isHeldNow, indexNow, We, ze]);
  let lt = Q(() => focusables.find((focusable) => focusable.isAutoFocus), [focusables]);
  P(() => {
    if (!isHeld) {
      Se.current = false;
      Ee();
      return;
    }
    if (!(Se.current || q.current !== undefined || lt === undefined || !isEmptyNow())) {
      Se.current = true;
      Ae(
        {
          component,
          requestId,
          plugin: lt.plugin,
          element: lt.element,
          origin: {
            kind: "plugin",
            name: lt.plugin,
          },
        },
        {
          expected: indexNow(),
          auto: lt,
        },
      );
    }
  }, [isHeld, lt, isEmptyNow, indexNow, component, requestId, Ae, Ee]);
  P(
    () => () => {
      ke.current = false;
      Ee();
    },
    [Ee],
  );
  return Q(
    () => ({
      act: Me,
      moveByPerson: Ie,
      forget: Ee,
    }),
    [Me, Ie, Ee],
  );
}
//@ chunk-e6aww6q8.js:4004104-4004165 placement
/**
 * $.ui.log 写调试日志
 */
function logUiLogToDebug(plugin, text) {
  logForDebugging(`[${plugin}] $.ui.log (to debug): ${truncateUiLog(text)}`);
}
//@ chunk-e6aww6q8.js:4004165-4004321 placement
/**
 * 设置插件 UI 日志的接收函数，并把积压的日志以 "again" 重放；返回解除函数。
 */
function setUiLogSink(e) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.uiLogSink = e;
  let pendingUiLog = pluginRegistry.pendingUiLog;
  pluginRegistry.pendingUiLog = [];
  for (let s of pendingUiLog) e(s, "again");
  return () => {
    if (pluginRegistry.uiLogSink === e) pluginRegistry.uiLogSink = null;
  };
}
//@ chunk-e6aww6q8.js:4004321-4004452 placement
/**
 * $.ui.log 的 to 只能是 "transcript" 或 "debug"。
 */
function checkUiLogTarget(e) {
  return e === undefined || e === "transcript" || e === "debug"
    ? undefined
    : `to is "transcript" or "debug" (got ${JSON.stringify(e)})`;
}
//@ chunk-e6aww6q8.js:4004452-4004581 placement
/**
 * 校验 $.ui.notify 参数：text 合法，title 若给出须为字符串。
 */
function checkUiNotifyArgs(e) {
  let title = e?.title;
  let r = title === undefined || typeof title === "string";
  return checkTextArg(e?.text) ?? (r ? undefined : "title is a string, when given");
}
//@ chunk-e6aww6q8.js:4004581-4004975 placement
/**
 * 把通知通道结果映射为 $.ui.notify 返回值（发送渠道或未发送原因）。
 */
function notifyOutcome(e, plugin) {
  switch (e) {
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
        channel: e,
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
//@ chunk-e6aww6q8.js:4004975-4005275 placement
/**
 * $.ui.notify：通过终端通知通道（iTerm2、kitty、ghostty、响铃等）发送插件通知，返回是否发送及渠道或原因。
 */
async function uiNotifyOp(e, n) {
  let r = isTerminalShutdown();
  let s = notifyOutcome(
    r
      ? "no_surface"
      : ((await currentSurfaceBinding()?.notify?.(
          {
            message: e.text,
            title: e.title || n.plugin,
            notificationType: "plugin_notification",
          },
          n.origin,
        )) ?? "no_surface"),
    n.plugin,
  );
  logForDebugging(
    `$.ui.notify (${n.plugin}): ${e.text.length} chars: ` + (s.isSent ? `sent by ${s.channel}` : s.reason),
  );
  return s;
}
//@ chunk-e6aww6q8.js:4005275-4005323 placement
/**
 * 补默认标题
 */
var withDefaultTitle = (e, n) => ({
  ...e,
  title: e.title || n.plugin,
});
//@ chunk-e6aww6q8.js:4005323-4005336 placement
/**
 * 3000
 */
var VIEW_WAIT_MS = 3000;
//@ chunk-e6aww6q8.js:4007709-4008030 placement
/**
 * 校验 $.ui.view 参数：只允许 {agentId}（非空字符串）或 {}（主对话）。
 */
function checkUiViewArgs(e) {
  return isPlainObject_5(e) &&
    Object.prototype.toString.call(e) === "[object Object]" &&
    Reflect.ownKeys(e).every((r) => r === "agentId") &&
    (!("agentId" in e) || (typeof e.agentId === "string" && e.agentId !== ""))
    ? undefined
    : "takes { agentId } (whose transcript the main view shows, by its id in $.agent.list()) or {} for the main conversation";
}
//@ chunk-e6aww6q8.js:4008030-4008720 placement
async function uiViewForPlugin(e, n) {
  let view = currentSurfaceBinding()?.view;
  if (!view)
    return {
      deny: "no main view here",
    };
  if (!isPersonInitiated(n)) {
    logForDebugging(`ui.view ${n.plugin}: denied, not person-initiated (root ${n.rootEvent ?? "none"})`);
    return {
      deny: "not person-initiated",
    };
  }
  let s = await view.show(e);
  switch (
    (logForDebugging(`ui.view ${n.plugin}: ${s}`),
    s === "shown"
      ? logFeatureOk("plugin_function_hooks_view_switch")
      : logFeatureBad("plugin_function_hooks_view_switch", s),
    s)
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
  uiFocusForPlugin,
  wrapActHandlers,
  pickOrNull,
  setUiLogSink,
  VIEW_WAIT_MS,
  logRejection,
  createRemotePromptBox,
  createRemoteSelectionReader,
  withCurrentRequester,
  UI_HOST_REQUEST_TIMEOUT_MS,
  causeOnlyResult,
  selectionResult,
  listPlacedRows,
  subscribePlaced,
  selectionValue,
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
  focusSiteDraws,
  dispatchUiFocus,
};

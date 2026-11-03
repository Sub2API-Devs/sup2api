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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { ge } from "../../utils/identity.js";
import { vk, ul, hrt } from "./panes.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { freeze_19 } from "./promptApi.js";
import { k8n, normalizeInputDecorations } from "../../components/PromptInput/inputDecorations.js";
import { V$ } from "./coreHandlers.js";
import { logPressFill } from "./ui/pressFill.js";
import { errorMessage } from "../../utils/errors.js";
import { attachedSurfaces, lp } from "./surfaceBinding.js";
import { setClipboard, getClipboardPath } from "../../ink/termio/osc.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { ABOVE_PROMPT, X$, G1, commitFocus, runUiChain, s6, kSt, isPersonInitiated } from "./uiHooks.js";
import { renderPluginsFor } from "./ui/renderSites.js";
import { oxe } from "./apiDispatch.js";
import { awaitHooksRespawn, hookMembersFor } from "./hookDispatch.js";
import { sleep } from "../../utils/sleep.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { j, R, ce, zt, Q, P } from "../../../vendor/react/cjs/react.production.js";
import { truncateUiLog } from "./hooksWorkerClient.js";
import { HooksError } from "./hooksErrors.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";

//@ chunk-e6aww6q8.js:3993711-3993767 placement
var i2r = (e, n) => (n === void 0 ? { text: e } : { text: e, requestId: n });
//@ chunk-e6aww6q8.js:3993767-3993841 placement
function I0n(e, n) {
  return e === void 0 || e === "" ? void 0 : i2r(e, n === "" ? void 0 : n);
}
//@ chunk-e6aww6q8.js:3993841-3993892 placement
var u$i = (e, n) => ({ selection: I0n(e, n), cause: void 0 });
//@ chunk-e6aww6q8.js:3993892-3993944 placement
var QN = ge({ current: void 0 }, (e) => {
  e.current = void 0;
});
//@ chunk-e6aww6q8.js:3993944-3993972 placement
var D0n = (e) => e !== "terminal";
//@ chunk-e6aww6q8.js:3993972-3994035 placement
var L0n = (e, n, r) => ({ requester: e, client: { clientId: n, surface: r } });
//@ chunk-e6aww6q8.js:3994035-3994198 placement
var answeringClientsOf = (e, n, r) =>
  vk.list().flatMap((s) => {
    let { clientId: clientId, surface: surface } = s;
    return e !== void 0 && (r === void 0 || surface === r) && s.answers?.includes(n) === !0 && D0n(surface)
      ? [L0n(e, clientId, surface)]
      : [];
  });
//@ chunk-e6aww6q8.js:3994198-3994233 placement
var yMe = (e, n) => answeringClientsOf(QN.current, e, n);
/**
 * 按当前请求者的可达范围列出能回答某能力的远程客户端：first 只取第一个，否则把静默客户端排到后面。
 */
//@ chunk-e6aww6q8.js:3994233-3994431 placement
function reachableClients(e, n) {
  let r = QN.current?.reach() ?? "none",
    h = r !== "none" ? yMe(e, n) : [],
    y = r === "first",
    S = (w) => Number(vk.isSilent(w.client.clientId));
  return y ? h.filter((w) => w === h[0]) : h.toSorted((w, L) => S(w) - S(L));
}
/**
 * 依次询问能回答某能力的客户端，第一个给出结果的记为 heard 并返回；不回答的记为 missed。
 */
//@ chunk-e6aww6q8.js:3994431-3994659 placement
async function askClientsInTurn(e, n, r) {
  let s = new Set(),
    h = () => reachableClients(e, r).find((y) => !s.has(y.client.clientId));
  for (let y = h(); y !== void 0; y = h()) {
    let { clientId: clientId } = y.client;
    s.add(clientId);
    let w = await n(y);
    if (w !== void 0) return (vk.heard(clientId), w);
    vk.missed(clientId);
  }
  return;
}
//@ chunk-e6aww6q8.js:3994659-3994670 placement
var Oj = 1e6;
/**
 * $.ui.copy 交给远程客户端复制：超过 1e6 字符不发送，返回是否复制成功；没有客户端时返回 undefined。
 */
//@ chunk-e6aww6q8.js:3994670-3994936 placement
async function copyViaRemoteClient(e, n, r) {
  if (reachableClients("ui_copy", e).length === 0) return;
  if (r.length > Oj)
    return (
      logForDebugging(
        `$.ui.copy (${n}): ${r.length} chars is past the ${Oj} a remote copy carries; not sent`,
      ),
      !1
    );
  return (
    (await askClientsInTurn("ui_copy", (s) => s.requester.copy({ ...s.client, plugin: n, text: r }), e)) ===
    !0
  );
}
//@ chunk-e6aww6q8.js:3994936-3995037 placement
async function requireSelection(e) {
  let n = await e;
  if (n.selection === void 0) throw Error("nothing selected");
  return n;
}
//@ chunk-e6aww6q8.js:3995037-3995050 placement
var tgn = 5000;
//@ chunk-e6aww6q8.js:3995050-3995128 placement
function f$i(e) {
  return (
    (QN.current = e),
    () => {
      if (QN.current === e) QN.current = void 0;
    }
  );
}
//@ chunk-e6aww6q8.js:3995128-3995299 placement
function selectionReadCause(e) {
  let filtered = e.map((h) => h.cause).filter((h) => h !== "not_asked"),
    included = filtered.includes("parse_failed");
  return filtered.includes(void 0) ? void 0 : included ? "parse_failed" : (filtered.at(0) ?? "not_asked");
}
//@ chunk-e6aww6q8.js:3995299-3995529 placement
function logSelectionReadOutcome(e) {
  let n = selectionReadCause(e);
  if (n === void 0) {
    logFeatureOk("plugin_function_hooks_selection_read");
    return;
  }
  if (n === "parse_failed") {
    logFeatureBad("plugin_function_hooks_selection_read", n);
    return;
  }
  if (n !== "not_asked") logFeatureSad("plugin_function_hooks_selection_read", n);
}
/**
 * headless 模式下的输入框代理：read/write/paint/forget/propose 优先交给远程客户端（ui_prompt_* 能力），没有则用本地实现。
 */
//@ chunk-e6aww6q8.js:3995529-3996887 placement
function createRemotePromptBox(e) {
  let n = new Map(),
    r = 0;
  return {
    read: async () => {
      let h =
        reachableClients("ui_prompt_read").length > 0
          ? await askClientsInTurn("ui_prompt_read", (y) => y.requester.readPrompt(y.client))
          : e.read();
      if (h === void 0) return freeze_19;
      return { text: h.text, cursor: Math.min(h.cursor, h.text.length) };
    },
    write: async (s, h, y) => {
      if (reachableClients("ui_prompt_fill").length === 0) return { isFilled: !1, refusal: "no_composer" };
      let S = k8n(normalizeInputDecorations(y?.decorations, s));
      return {
        isFilled:
          s.length <= Oj &&
          (await askClientsInTurn("ui_prompt_fill", (L) =>
            L.requester.fillPrompt({
              ...L.client,
              text: s,
              mode: h,
              ...(S.length > 0 && { decorations: S }),
              ...(y?.cursor !== void 0 && { cursor: V$(y.cursor, Number.MAX_SAFE_INTEGER) }),
              answersPress: logPressFill(y?.answersPress, L.client.clientId),
            }),
          )) === !0,
      };
    },
    paint: async (s, h, y) => {
      let S = h.length === 0 ? void 0 : y,
        w = k8n(normalizeInputDecorations(h, S ?? ""));
      if (S !== void 0) ((r += 1), n.set(s, r));
      let L = n.get(s),
        G =
          (S === void 0 || S.length <= Oj) &&
          (await askClientsInTurn("ui_prompt_paint", (Z) =>
            Z.requester.paintPrompt({
              ...Z.client,
              layer: s,
              ...(S !== void 0 && { text: S }),
              ...(w.length > 0 && { decorations: w }),
            }),
          )) === !0;
      if (S === void 0 && G && n.get(s) === L) n.delete(s);
      return { isPainted: G };
    },
    forget: (s) => {
      let h = n.get(s);
      if (h !== void 0)
        askClientsInTurn("ui_prompt_paint", (y) => y.requester.paintPrompt({ ...y.client, layer: s }))
          .then((y) => {
            if (y === !0 && n.get(s) === h) n.delete(s);
          })
          .catch((y) => {
            logForDebugging(`prompt.paint: ${errorMessage(y)}`, { level: "error" });
          });
    },
    propose: async (s) => ({
      isShown:
        s.length <= Oj &&
        (await askClientsInTurn("ui_prompt_suggest", (y) =>
          y.requester.suggestPrompt({ ...y.client, text: s }),
        )) === !0,
    }),
  };
}
//@ chunk-e6aww6q8.js:3996887-3996929 placement
var a2r = (e) => ({ selection: void 0, cause: e });
//@ chunk-e6aww6q8.js:3996929-3997125 placement
async function readFirstSelection(e) {
  let mapped = e.map((s) => s.catch(() => a2r("aborted"))),
    r = await Promise.any(mapped.map(requireSelection)).catch(() => {
      return;
    });
  if (r === void 0) {
    logSelectionReadOutcome(await Promise.all(mapped));
    return;
  }
  return (logSelectionReadOutcome([r]), r.selection);
}
/**
 * headless 模式下的选区读取器：并行询问所有能读选区的客户端，取第一个有选区的结果。
 */
//@ chunk-e6aww6q8.js:3997125-3997226 placement
var createRemoteSelectionReader = () => ({
  read: () => readFirstSelection(yMe("ui_read_selection").map((e) => e.requester.readSelection(e.client))),
});
//@ chunk-e6aww6q8.js:3997226-3997242 placement
var U0n = 1048576;
//@ chunk-e6aww6q8.js:3997242-3997993 placement
async function uiCopyForPlugin(e, n) {
  let { text: text, surface: surface } = e;
  if (!(surface !== void 0 && attachedSurfaces().includes(surface)))
    return (
      logForDebugging(
        `$.ui.copy (${n.plugin}): no surface draws (${surface ?? "none attached"}); nothing copied`,
      ),
      { isCopied: !1, reason: "no-surface" }
    );
  if (surface !== "terminal") {
    let G = (await copyViaRemoteClient(surface, n.plugin, text)) === !0;
    return (
      logForDebugging(
        `$.ui.copy (${n.plugin}): ${text.length} chars to ${surface}: ` +
          (G ? "copied" : "no client there took it; nothing copied"),
      ),
      G ? { isCopied: !0 } : { isCopied: !1, reason: "no-clipboard" }
    );
  }
  let y = await setClipboard(text),
    S = getClipboardPath(),
    w = y !== "" && y.length <= U0n;
  if (w) process.stdout.write(y);
  let L = w || S !== "osc52";
  return (
    logForDebugging(
      `$.ui.copy (${n.plugin}): ${text.length} chars, path ${S}, OSC 52 ${w ? "written" : y === "" ? "left out" : "over the write bound"}; ` +
        (L ? "copied" : "nothing copied"),
    ),
    L ? { isCopied: !0 } : { isCopied: !1, reason: "no-clipboard" }
  );
}
//@ chunk-e6aww6q8.js:3997993-3998073 placement
function f7r(e, n) {
  let r = e.surface ?? attachedSurfaces()[0];
  return r === void 0 ? e : { ...e, surface: r };
}
//@ chunk-e6aww6q8.js:3998073-3998188 placement
function placedRowResult(e, n) {
  if (n === void 0) return { isPlaced: !0, requestId: e.uuid };
  return { isPlaced: !1, requestId: e.uuid, reason: n };
}
//@ chunk-e6aww6q8.js:3998188-3998226 placement
var g$i = (e) => getPluginRegistry().placed.subscribe(e);
//@ chunk-e6aww6q8.js:3998226-3998238 placement
var kat = 500;
//@ chunk-e6aww6q8.js:3998276-3998411 placement
var createPlacedRowMessage = (e, n) => ({
  type: "system",
  subtype: "placed",
  plugin: n,
  id: e.id,
  content: "",
  persist: !1,
  timestamp: new Date().toISOString(),
  uuid: randomUUID_46(),
});
//@ chunk-e6aww6q8.js:3998411-3998487 placement
var G0n = (e) => e.flatMap((n) => (n.type === "system" && n.subtype === "placed" ? [n] : []));
//@ chunk-e6aww6q8.js:3998487-3999070 placement
async function uiPlaceRowForPlugin(e, n, r) {
  let s = lp()?.conversation?.();
  if (s === void 0)
    return (
      logFeatureBad("plugin_function_hooks_place", "no_conversation"),
      { isPlaced: !1, reason: "no conversation to place a row in" }
    );
  let filtered = G0n(s.rows()).filter((w) => w.plugin === n.plugin),
    found = filtered.find((w) => w.id === e.id);
  if (found !== void 0) return placedRowResult(found, r);
  if (filtered.length >= kat)
    return (
      logFeatureBad("plugin_function_hooks_place", "over_cap"),
      { isPlaced: !1, reason: `a plugin holds at most ${kat} placed rows` }
    );
  let S = createPlacedRowMessage(e, n.plugin);
  return (
    s.keep([S]),
    getPluginRegistry().placed.emit(),
    r === void 0
      ? logFeatureOk("plugin_function_hooks_place")
      : logFeatureSad("plugin_function_hooks_place", "undrawn"),
    placedRowResult(S, r)
  );
}
/**
 * 列出会话中插件放置的行（插件、id、request_id 与之前最后一条用户/助手消息 uuid）。
 */
//@ chunk-e6aww6q8.js:3999070-3999346 placement
function listPlacedRows() {
  let e = lp()?.conversation?.()?.rows() ?? [],
    n = [],
    r;
  for (let s of e) {
    if ((s.type === "user" || s.type === "assistant") && !s.isMeta) r = s;
    if (s.type === "system" && s.subtype === "placed")
      n.push({ plugin: s.plugin, id: s.id, request_id: s.uuid, ...(r !== void 0 && { after_uuid: r.uuid }) });
  }
  return n;
}
//@ chunk-e6aww6q8.js:3999346-3999359 placement
var q0n = 3000;
/**
 * 校验 $.ui.focus 参数：需要非空的 requestId 与 key。
 */
//@ chunk-e6aww6q8.js:3999359-3999561 placement
function checkUiFocusArgs(e) {
  let n = e?.requestId,
    r = e?.key;
  return typeof n === "string" && n !== "" && typeof r === "string" && r !== ""
    ? void 0
    : "takes { requestId, key } (which of its sites, and the element it drew there, by key)";
}
//@ chunk-e6aww6q8.js:3999561-3999794 placement
function pluginFocusSiteOf(e, n) {
  let { requestId: requestId } = e,
    { plugin: plugin } = n,
    any = ul()
      .getState()
      .open.some((w) => w.plugin === plugin && w.id === requestId),
    y = requestId === ABOVE_PROMPT && renderPluginsFor("AbovePrompt").includes(plugin),
    S = any ? "Pane" : y ? "AbovePrompt" : void 0;
  return S === void 0 ? void 0 : { component: S, requestId: requestId };
}
/**
 * 判断焦点目标是否已就绪（站点存在、持有键盘或面板已显示）。
 */
//@ chunk-e6aww6q8.js:3999794-4000193 placement
function isFocusSettled(e, n) {
  let r = pluginFocusSiteOf(e, n),
    s = r && X$(r),
    state = ul().getState(),
    y = X$({ component: "AbovePrompt", requestId: ABOVE_PROMPT }) !== void 0,
    S = state.focusRequest === e.requestId && y,
    w = r?.component === "Pane";
  if (
    r === void 0 ||
    oxe(n.rootEvent) ||
    (w ? state.placements === 0 || (state.shownId !== e.requestId && !S) : s === void 0)
  )
    return !0;
  if (s === void 0 || S) return !1;
  let G = { kind: "plugin", name: n.plugin };
  return !s.isHeldNow() || G1(s, G) || s.hasElement(n.plugin, e.key);
}
/**
 * 运行 ui.focus 钩子链（等待 hooks 重生），无钩子时直接提交焦点移动，记录结果。
 */
//@ chunk-e6aww6q8.js:4000193-4000730 placement
function dispatchUiFocus(e) {
  let { input: input, hookOrigin: hookOrigin, signal: signal } = e,
    h = awaitHooksRespawn({ event: "ui.focus", e: input, origin: hookOrigin }, signal);
  if (h !== void 0) return h.then(() => dispatchUiFocus(e));
  let y = hookMembersFor("ui.focus", hookOrigin);
  function S(L) {
    let q = input.element === void 0 ? "the engine's stop" : `${input.plugin}'s ${input.element}`;
    return (
      logForDebugging(
        `ui.focus ${input.component} ${input.requestId} (${input.origin.kind}) onto ${q}: ` +
          (L.deny === void 0 ? "moved" : `denied (${L.deny})`),
      ),
      L
    );
  }
  return y.length === 0
    ? S(commitFocus(input))
    : runUiChain(
        { event: "ui.focus", input: input, handlers: y, hookOrigin: hookOrigin, signal: signal },
        (L) => (signal?.aborted === !0 ? { deny: "the move was abandoned" } : commitFocus(L)),
      ).then(S);
}
//@ chunk-e6aww6q8.js:4000730-4000783 placement
var rgn = ge(
  () => getPluginRegistry().focusSiteDraws,
  (e) => e().clear(),
);
//@ chunk-e6aww6q8.js:4000783-4000992 placement
async function sleepUntilChanged(e, n, r) {
  let abortController = new AbortController();
  function h() {
    if (e()) abortController.abort();
  }
  let subscribe = rgn().subscribe(h),
    subscribe_2 = ul().subscribe(h);
  try {
    await sleep(r, n === void 0 ? abortController.signal : AbortSignal.any([n, abortController.signal]));
  } finally {
    (subscribe(), subscribe_2());
  }
}
//@ chunk-e6aww6q8.js:4000992-4001122 placement
async function waitForCondition(e, n, r = q0n) {
  let s = Date.now() + r;
  while (!e() && n?.aborted !== !0) {
    let h = s - Date.now();
    if (h <= 0) return;
    await sleepUntilChanged(e, n, h);
  }
}
/**
 * $.ui.focus 实现：等待站点稳定后，校验站点属于插件、持有键盘且画有该 key 的元素，再经 ui.focus 链移动焦点。
 */
//@ chunk-e6aww6q8.js:4001122-4001660 placement
async function uiFocusOp(e, n, r) {
  await waitForCondition(() => isFocusSettled(e, n), n.signal, r);
  let s = pluginFocusSiteOf(e, n),
    h = s && X$(s),
    y = { kind: "plugin", name: n.plugin };
  if (!h) return { deny: "not this plugin's site" };
  if (!h.isHeldNow()) return { deny: "that site does not hold the keyboard" };
  if (G1(h, y)) return { deny: "another plugin's element holds the keyboard" };
  if (!h.hasElement(n.plugin, e.key)) return { deny: "no element of its own is drawn under that key" };
  return dispatchUiFocus({
    input: { component: h.component, requestId: h.requestId, plugin: n.plugin, element: e.key, origin: y },
    hookOrigin: n.origin,
    signal: n.signal,
  });
}
//@ chunk-e6aww6q8.js:4001660-4001722 placement
var f9s = (e, n, r = []) => xr(n, (s, h) => (r.includes(h) ? s : () => e.act(s)));
//@ chunk-e6aww6q8.js:4001722-4001733 placement
var X0n = 64;
//@ chunk-e6aww6q8.js:4001733-4001737 placement
j();
//@ chunk-e6aww6q8.js:4001737-4001777 placement
var bRe = (e, n) => (n === null ? null : (e[n] ?? null));
//@ chunk-e6aww6q8.js:4001777-4001850 placement
var SRe = (e, n) =>
  n.catch((r) => {
    logForDebugging(`${e}: ${errorMessage(r)}`, { level: "error" });
    return;
  });
/**
 * 插件 $.ui.focus：把焦点移到插件元素；焦点已变化或元素不存在时说明原因。
 */
//@ chunk-e6aww6q8.js:4001850-4004104 placement
function uiFocusForPlugin(e) {
  let {
      component: component,
      requestId: requestId,
      owner: owner,
      focusables: focusables,
      isHeld: isHeld,
    } = e,
    { isHeldNow: isHeldNow, indexNow: indexNow, isEmptyNow: isEmptyNow, land: land } = e,
    q = R(void 0),
    Z = R([]),
    Se = R(!1),
    ke = R(!0),
    we = ce(() => {
      while (q.current === void 0 && Z.current.length > 0) {
        let [Je, ...nt] = Z.current;
        ((Z.current = nt), Je?.());
      }
    }, []),
    Ee = ce(() => {
      (q.current?.abort.abort(), (q.current = void 0), (Z.current = []));
    }, []),
    Ae = ce(
      (Je, nt) => {
        let pt = { ...nt, abort: new AbortController() };
        q.current = pt;
        let Et = dispatchUiFocus({ input: Je, signal: pt.abort.signal });
        function yt() {
          let At = q.current === pt;
          if (At) q.current = void 0;
          if (At && ke.current) we();
        }
        return Et instanceof Promise ? void SRe(`ui.focus ${requestId}`, Et).finally(yt) : yt();
      },
      [requestId, we],
    ),
    Ie = ce(
      (Je) => {
        let nt = bRe(focusables, Je.index);
        if (Je.index !== null && nt === null) return;
        ((Se.current = !0),
          Ae(
            {
              component: component,
              requestId: requestId,
              ...(nt && { plugin: nt.plugin, element: nt.element }),
              origin: { kind: "person" },
            },
            { expected: indexNow(), move: Je },
          ));
      },
      [component, requestId, focusables, indexNow, Ae],
    ),
    Me = ce((Je) => {
      if (!(q.current !== void 0 || Z.current.length > 0)) Je();
      else if (Z.current.length < X0n) Z.current = [...Z.current, Je];
    }, []),
    We = ce((Je, nt) => focusables.findIndex((pt) => pt.plugin === Je && pt.element === nt), [focusables]),
    ze = ce(
      (Je) => {
        let nt = q.current,
          pt = Je.element === void 0;
        if (Je.origin.kind === "person") {
          let At = nt?.move;
          if (nt === void 0 || At === void 0 || indexNow() !== nt.expected)
            return "the focus moved meanwhile";
          let Yt = bRe(focusables, At.index);
          if (pt || (Yt !== null && Yt.plugin === Je.plugin && Yt.element === Je.element)) {
            At.apply();
            return;
          }
        }
        let Et = nt?.auto;
        if (
          Et !== void 0 &&
          Je.plugin === Et.plugin &&
          Je.element === Et.element &&
          indexNow() !== nt?.expected
        )
          return "the focus moved meanwhile";
        let gt = We(Je.plugin, Je.element);
        if (gt < 0) return pt ? "no element named" : `no element of ${Je.plugin} is drawn under that key`;
        ((Se.current = !0), land(gt));
        return;
      },
      [focusables, indexNow, land, We],
    );
  zt(() => {
    let Je = s6(component, requestId);
    return (
      kSt().set(Je, {
        component: component,
        requestId: requestId,
        owner: owner,
        isHeldNow: isHeldNow,
        holderNow: () => bRe(focusables, indexNow())?.plugin,
        hasElement: (nt, pt) => We(nt, pt) >= 0,
        commit: ze,
      }),
      rgn().emit(),
      () => {
        kSt().delete(Je);
      }
    );
  }, [component, requestId, owner, focusables, isHeldNow, indexNow, We, ze]);
  let lt = Q(() => focusables.find((Je) => Je.isAutoFocus), [focusables]);
  return (
    P(() => {
      if (!isHeld) {
        ((Se.current = !1), Ee());
        return;
      }
      if (!(Se.current || q.current !== void 0 || lt === void 0 || !isEmptyNow()))
        ((Se.current = !0),
          Ae(
            {
              component: component,
              requestId: requestId,
              plugin: lt.plugin,
              element: lt.element,
              origin: { kind: "plugin", name: lt.plugin },
            },
            { expected: indexNow(), auto: lt },
          ));
    }, [isHeld, lt, isEmptyNow, indexNow, component, requestId, Ae, Ee]),
    P(
      () => () => {
        ((ke.current = !1), Ee());
      },
      [Ee],
    ),
    Q(() => ({ act: Me, moveByPerson: Ie, forget: Ee }), [Me, Ie, Ee])
  );
}
//@ chunk-e6aww6q8.js:4004104-4004165 placement
function z7r(e, n) {
  logForDebugging(`[${e}] $.ui.log (to debug): ${truncateUiLog(n)}`);
}
/**
 * 设置插件 UI 日志的接收函数，并把积压的日志以 "again" 重放；返回解除函数。
 */
//@ chunk-e6aww6q8.js:4004165-4004321 placement
function setUiLogSink(e) {
  let n = getPluginRegistry();
  n.uiLogSink = e;
  let pendingUiLog = n.pendingUiLog;
  n.pendingUiLog = [];
  for (let s of pendingUiLog) e(s, "again");
  return () => {
    if (n.uiLogSink === e) n.uiLogSink = null;
  };
}
/**
 * $.ui.log 的 to 只能是 "transcript" 或 "debug"。
 */
//@ chunk-e6aww6q8.js:4004321-4004452 placement
function checkUiLogTarget(e) {
  return e === void 0 || e === "transcript" || e === "debug"
    ? void 0
    : `to is "transcript" or "debug" (got ${JSON.stringify(e)})`;
}
/**
 * 校验 $.ui.notify 参数：text 合法，title 若给出须为字符串。
 */
//@ chunk-e6aww6q8.js:4004452-4004581 placement
function checkUiNotifyArgs(e) {
  let n = e?.title,
    r = n === void 0 || typeof n === "string";
  return hrt(e?.text) ?? (r ? void 0 : "title is a string, when given");
}
/**
 * 把通知通道结果映射为 $.ui.notify 返回值（发送渠道或未发送原因）。
 */
//@ chunk-e6aww6q8.js:4004581-4004975 placement
function notifyOutcome(e, n) {
  switch (e) {
    case "no_surface":
      return { isSent: !1, reason: "no-surface" };
    case "iterm2":
    case "iterm2_with_bell":
    case "kitty":
    case "ghostty":
    case "terminal_bell":
      return { isSent: !0, channel: e };
    case "disabled":
      return { isSent: !1, reason: "disabled" };
    case "none":
    case "no_method_available":
      return { isSent: !1, reason: "no-channel" };
    case "error":
      throw new HooksError(`${n}: $.ui.notify: the channel's write failed`);
  }
}
/**
 * $.ui.notify：通过终端通知通道（iTerm2、kitty、ghostty、响铃等）发送插件通知，返回是否发送及渠道或原因。
 */
//@ chunk-e6aww6q8.js:4004975-4005275 placement
async function uiNotifyOp(e, n) {
  let r = isTerminalShutdown(),
    s = notifyOutcome(
      r
        ? "no_surface"
        : ((await lp()?.notify?.(
            { message: e.text, title: e.title || n.plugin, notificationType: "plugin_notification" },
            n.origin,
          )) ?? "no_surface"),
      n.plugin,
    );
  return (
    logForDebugging(
      `$.ui.notify (${n.plugin}): ${e.text.length} chars: ` + (s.isSent ? `sent by ${s.channel}` : s.reason),
    ),
    s
  );
}
//@ chunk-e6aww6q8.js:4005275-4005323 placement
var J7r = (e, n) => ({ ...e, title: e.title || n.plugin });
//@ chunk-e6aww6q8.js:4005323-4005336 placement
var eHn = 3000;
/**
 * 校验 $.ui.view 参数：只允许 {agentId}（非空字符串）或 {}（主对话）。
 */
//@ chunk-e6aww6q8.js:4007709-4008030 placement
function checkUiViewArgs(e) {
  return isPlainObject_4(e) &&
    Object.prototype.toString.call(e) === "[object Object]" &&
    Reflect.ownKeys(e).every((r) => r === "agentId") &&
    (!("agentId" in e) || (typeof e.agentId === "string" && e.agentId !== ""))
    ? void 0
    : "takes { agentId } (whose transcript the main view shows, by its id in $.agent.list()) or {} for the main conversation";
}
//@ chunk-e6aww6q8.js:4008030-4008720 placement
async function uiViewForPlugin(e, n) {
  let r = lp()?.view;
  if (!r) return { deny: "no main view here" };
  if (!isPersonInitiated(n))
    return (
      logForDebugging(`ui.view ${n.plugin}: denied, not person-initiated (root ${n.rootEvent ?? "none"})`),
      { deny: "not person-initiated" }
    );
  let show = await r.show(e);
  switch (
    (logForDebugging(`ui.view ${n.plugin}: ${show}`),
    show === "shown"
      ? logFeatureOk("plugin_function_hooks_view_switch")
      : logFeatureBad("plugin_function_hooks_view_switch", show),
    show)
  ) {
    case "shown":
      return {};
    case "unknown":
      return { deny: "no agent under that id" };
    case "hidden":
      return { deny: "that agent is not one the tasks list shows" };
    case "ended":
      return { deny: "that agent has ended" };
    case "moved":
      return { deny: "the view moved meanwhile" };
    case "elsewhere":
      return { deny: "that agent's transcript is not in this session" };
  }
}

export {
  uiFocusForPlugin,
  f9s,
  bRe,
  setUiLogSink,
  eHn,
  SRe,
  createRemotePromptBox,
  createRemoteSelectionReader,
  f$i,
  tgn,
  a2r,
  u$i,
  listPlacedRows,
  g$i,
  i2r,
  checkUiLogTarget,
  z7r,
  uiPlaceRowForPlugin,
  checkUiFocusArgs,
  uiFocusOp,
  f7r,
  uiCopyForPlugin,
  checkUiViewArgs,
  uiViewForPlugin,
  checkUiNotifyArgs,
  J7r,
  uiNotifyOp,
  rgn,
  dispatchUiFocus,
};

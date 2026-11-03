/**
 * cli/handlers/pluginTest/engineShim.ts
 *
 * 2.1.316 新增。claude plugin test 中模拟引擎事件、会话存储与 hooks 模块源。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1tz177x8.js (58)
 * attribution: placement 58
 */
import { join, join as join_2, join as join_3, join as join_4, join as join_5, join as join_6 } from "path";
import { isStreamingHookEvent, Ueo, pos } from "../../../plugins/functionHooks/hookApiSurface.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { scaffoldPluginTestDir } from "./runner.js";
import { getSessionId } from "../../../bootstrap/state.js";
import { getCwd } from "../../../utils/cwd.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { HooksError } from "../../../plugins/functionHooks/hooksErrors.js";
import { $Br } from "../../../plugins/functionHooks/toolCallHooks.js";
import { runClassicHookChain } from "../../../plugins/functionHooks/classicHookBridge.js";
import { getRuleBehaviorDescription } from "../../../utils/permissions/PermissionResult.js";
import { toolInputOf, REQUESTMETA, m3t } from "../../../plugins/functionHooks/sites/toolSites.js";
import { restoreMissingKeys, Wrs } from "../../../plugins/functionHooks/sites/siteRules.js";
import {
  reportChainFailure,
  createStepRecorder,
  grs,
} from "../../../plugins/functionHooks/dispatch/chain.js";
import {
  toToolCheckEvent,
  VFo,
  describePluginPermissionDenial,
} from "../../../plugins/functionHooks/toolCheckHooks.js";
import {
  hookMembersFor,
  hookOriginFromStack,
  pluginsMatchingEvent,
} from "../../../plugins/functionHooks/hookDispatch.js";
import { AUTO_REJECT_MESSAGE } from "../../../utils/messages.js";
import { KW } from "../../../utils/hooks/matcherGrammar.js";
import { hasModuleHookingSite } from "../../../plugins/hooksModules/loadedModuleFilters.js";
import {
  insertBeforeEngineAnswer,
  createEventCallers,
  NO_CORE_AT_CHAIN_BOTTOM,
} from "../../../plugins/functionHooks/eventCatalog.js";
import { contentBlockStableKeys } from "../../../engine/renderedRows.js";
import {
  parseTypedBlocks,
  rQe,
  reconcileAppendContent,
  normalizeAppendedToolResult,
  refuseSessionAppend,
} from "../../../plugins/functionHooks/api/sessionAppend.js";
import { uniq } from "../../../utils/collections.js";
import { checkAppendMessage, rxt } from "../../../plugins/functionHooks/sites/sessionSites.js";
import { safeDeepEqual, c2r, d2r } from "../../../plugins/functionHooks/apiDispatch.js";
import { pd } from "../../../utils/hooks/functionHookMatchers.js";
import { getOwn } from "../../../utils/objectSafety.js";
import { _ee } from "../../../utils/cloudTrash.js";
import { Cer } from "../../../plugins/functionHooks/ui/interactions.js";
import { DoctorLazy } from "../util.js";
import { u, o, U, A, pe, Ue, E, M } from "../../../../vendor/zod/v4/classic/schemas.js";
import { W5e, RENDER_SITES } from "../../../plugins/functionHooks/ui/renderSites.js";
import { $yn } from "../../../plugins/functionHooks/ui/renderInstances.js";
import {
  validateStateSetArgs,
  stateSetForPlugin,
  flushStaleFold,
} from "../../../plugins/functionHooks/api/state.js";
import { check } from "../../../utils/lockfile.js";
import { judgeHookInput } from "../../../plugins/functionHooks/dispatch/inputJudging.js";
import { isReservedHookName } from "../../../plugins/functionHooks/eventPatterns.js";
import { normalizePluginHostAction } from "../../../plugins/functionHooks/hostBridge.js";
import { env } from "../../../utils/env.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import { Cs } from "./uiDriver.js";

//@ chunk-1tz177x8.js:14394-14407 placement = resetStateForTests (0.751)
var resetStateForTests = "test";
//@ chunk-1tz177x8.js:14407-14637 placement
async function hooksModuleSource(e, r) {
  let n = join(e, resetStateForTests),
    joined = r.map((f) => {
      let a = isStreamingHookEvent(f) ? "async function* () {}" : "() => undefined";
      return `  on(${jsonStringify(f)}, ${a})`;
    }).join(`
`),
    m = await scaffoldPluginTestDir(
      n,
      resetStateForTests,
      `export function register(on) {
${joined}
}
`,
    );
  return { dir: n, modulePath: m };
}
//@ chunk-1tz177x8.js:14637-14729 placement
var co = (e, r) => ({
  session_id: getSessionId(),
  transcript_path: "",
  cwd: getCwd(),
  ...(isPlainObject(r) ? r : {}),
  hook_event_name: e,
});
//@ chunk-1tz177x8.js:14729-15025 placement
function classicHookCaller(path, signal) {
  let sliced = path.slice(8);
  if (sliced === "PreToolUse")
    throw new HooksError(
      "$.classic.PreToolUse is no call on the engine's $: the engine raises it inside tool.call, so a test calls $.tool.call",
    );
  if (!$Br(sliced)) throw new HooksError(`$.${path} is no call on the engine's $`);
  return (m) => runClassicHookChain({ hookInput: co(sliced, m), signal: signal });
}
//@ chunk-1tz177x8.js:15025-15069 placement
var Te = () => Ueo.filter($Br).map((e) => [e, !1]);
//@ chunk-1tz177x8.js:15069-15207 placement
function applyRecordedDenial(e, r) {
  let of = r.of(e.ref);
  return of !== void 0 && e.deny === void 0 && (e.result === void 0 || e.result === of.made.result)
    ? { deny: of.made.text }
    : e;
}
//@ chunk-1tz177x8.js:15207-15375 placement
function denyToolCall(call, reason, denials) {
  let s = reason || `Hook PreToolUse:${call.tool} ${getRuleBehaviorDescription("deny")} this tool`,
    m = `Error: ${s}`;
  return { ref: denials.keep(toolInputOf(call), { result: m, text: s }), result: m, text: s, isError: !0 };
}
//@ chunk-1tz177x8.js:15375-15449 placement
var io = (e, r) => restoreMissingKeys(["agentId", "consent", REQUESTMETA], m3t(e.tool, e.tool_use_id, r), e);
/**
 * 把插件测试中钩子的 allow/ask/deny 决定转换为权限结果对象。
 */
//@ chunk-1tz177x8.js:15449-15785 placement
function toPermissionResult({ decision: decision, reason: reason }, n, s) {
  let m = reason || `Permission to use ${n} has been denied.`,
    f = reason || `${n} needs approval`,
    a = { type: "other", reason: reason || "denied" };
  switch (decision) {
    case "allow":
      return { behavior: "allow", updatedInput: s };
    case "ask":
      return { behavior: "ask", message: f, updatedInput: s };
    case "deny":
      return { behavior: "deny", message: m, decisionReason: a };
  }
}
//@ chunk-1tz177x8.js:15785-15881 placement
var Ee = (e) => ({
  name: "core",
  isCore: !0,
  budgetMs: 0,
  async run(r, n) {
    let s = await n(r);
    return (e(s), s);
  },
});
//@ chunk-1tz177x8.js:15881-15954 placement
function Se(e, r) {
  let n;
  return {
    core: Ee((m) => {
      n = toPermissionResult(m, e, r);
    }),
    decided: () => n,
  };
}
//@ chunk-1tz177x8.js:15954-16030 placement
var Oe = () => ({ name: "core", isCore: !0, budgetMs: 0, run: () => Promise.resolve({}) });
/**
 * 钩子改写工具输入后重新跑一遍 tool.check（只用替引擎作答的成员），把决定转换成 {updatedInput} 或 {deny}。
 */
//@ chunk-1tz177x8.js:16030-16362 placement
async function checkUpdatedInput(call, signal, stack) {
  let s = toolInputOf(call),
    m = toPermissionResult(
      await reportChainFailure({
        e: toToolCheckEvent({ name: call.tool }, call.tool_use_id, { input: s, agentId: call.agentId }),
        handlers: hookMembersFor("tool.check", stack).filter((a) => a.answersForEngine === !0),
        site: VFo,
        signal: signal,
        origin: hookOriginFromStack(stack),
        bottom: () => Promise.resolve({ decision: "allow" }),
      }),
      call.tool,
      s,
    );
  return m.behavior === "allow" ? { updatedInput: s } : { deny: m.message };
}
/**
 * ask 决定时跑 PermissionRequest 钩子：allow 时若改写输入再检查一次；deny 用钩子消息；无人作答时用自动拒绝消息。
 */
//@ chunk-1tz177x8.js:16362-16770 placement
async function askPermissionRequestHook(call, signal, origin) {
  let s = await runClassicHookChain({
      hookInput: co("PermissionRequest", {
        tool_name: call.tool,
        tool_input: toolInputOf(call),
        ...(call.agentId !== void 0 && { agent_id: call.agentId }),
      }),
      core: Oe(),
      signal: signal,
      origin: origin,
    }),
    m = "decision" in s ? s.decision : void 0;
  switch (m?.behavior) {
    case "allow":
      return m.updatedInput ? checkUpdatedInput(io(call, m.updatedInput), signal, origin) : {};
    case "deny":
      return { deny: m.message || "Permission denied by hook" };
    case void 0:
      return { deny: AUTO_REJECT_MESSAGE(call.tool) };
  }
}
/**
 * 测试引擎里的 tool.check 链：跑插件的 tool.check 处理器，汇总为 allow/deny/ask；ask 交给 PermissionRequest 钩子。
 */
//@ chunk-1tz177x8.js:16770-17420 placement
async function runToolCheckChain({ e, next: { signal: r }, settled: settled, stated: stated }, stack) {
  let f = { name: e.tool },
    a = { ...KW(f), agentId: e.agentId };
  if (!hasModuleHookingSite("tool.check", a)) return {};
  let c = toolInputOf(e),
    h = hookMembersFor("tool.check", stack),
    k = Se(e.tool, c),
    y = describePluginPermissionDenial({
      result: await reportChainFailure({
        e: { ...toToolCheckEvent(f, e.tool_use_id, { input: c, agentId: e.agentId }), ...stated },
        handlers: insertBeforeEngineAnswer(h, k.core),
        site: VFo,
        signal: r,
        origin: hookOriginFromStack(stack),
        bottom: () => Promise.resolve(settled),
      }),
      decided: k.decided(),
      tool: e.tool,
      input: c,
      toolUseID: e.tool_use_id,
      hooked: pluginsMatchingEvent("tool.check", { ...a, isReadOnly: stated.isReadOnly }, stack).filter(
        (b) => !h.some((z) => z.name === b && z.answersForEngine === !0),
      ),
    });
  switch (y.behavior) {
    case "allow":
      return {};
    case "deny":
      return { deny: y.message };
    case "ask":
      return askPermissionRequestHook(e, r, stack);
  }
}
//@ chunk-1tz177x8.js:17420-17553 placement
async function checkThenCall(step, stack, denials) {
  let { e: s, next: m } = step,
    { deny: deny, updatedInput: updatedInput } = await runToolCheckChain(step, stack);
  return typeof deny === "string"
    ? denyToolCall(s, deny, denials)
    : m(updatedInput ? io(s, updatedInput) : s);
}
//@ chunk-1tz177x8.js:17553-17698 placement
function settledFromPreToolUse({ ask: ask, allow: allow }) {
  return typeof ask === "string"
    ? { decision: "ask", reason: ask, hook: "PreToolUse" }
    : { decision: "allow", ...(allow && { hook: "PreToolUse" }) };
}
/**
 * 测试引擎里 tool.call 链底的核心步骤：先跑 classic PreToolUse 钩子（可拒绝或改写输入），再走 tool.check。
 */
//@ chunk-1tz177x8.js:17698-18034 placement
var coreToolCallStep = (stack, denials, stated) => ({
  name: "core",
  isCore: !0,
  budgetMs: 0,
  async run(s, m) {
    let f = m3t(s.tool, s.tool_use_id, toolInputOf(s)),
      a = await Wrs(f, hookMembersFor("classic.PreToolUse", stack), {
        signal: m.signal,
        origin: hookOriginFromStack(stack),
        bottom: () => Promise.resolve({}),
      }),
      { deny: deny, updatedInput: updatedInput } = a,
      k = typeof deny === "string",
      y = updatedInput ? io(s, updatedInput) : s;
    return k
      ? denyToolCall(f, deny, denials)
      : checkThenCall({ e: y, next: m, settled: settledFromPreToolUse(a), stated: stated }, stack, denials);
  },
});
//@ chunk-1tz177x8.js:18034-18139 placement
function withheldCoreSteps(e, r = createStepRecorder(), n = {}) {
  return hasModuleHookingSite("classic.PreToolUse") || hasModuleHookingSite("tool.check")
    ? { "tool.call": coreToolCallStep(e, r, n) }
    : {};
}
//@ chunk-1tz177x8.js:18139-18204 placement
var freeze = Object.freeze({ isHookable: !0, keep: () => {}, arrived: () => {} });
//@ chunk-1tz177x8.js:18204-18339 placement
function newAppendedBlockTypes(e, r) {
  let n = new Set(contentBlockStableKeys(parseTypedBlocks(r))),
    s = contentBlockStableKeys(e);
  return uniq(
    e.flatMap((m, f) => {
      let a = s[f];
      return a !== void 0 && !n.has(a) ? [m.type] : [];
    }),
  );
}
//@ chunk-1tz177x8.js:18339-18406 placement
var yo = (e) => e.content.map((r) => (typeof r.text === "string" ? r.text : ""));
//@ chunk-1tz177x8.js:18406-18438 placement
var $e = new Set(["poll_events"]);
//@ chunk-1tz177x8.js:18438-18549 placement
function freezeToolResultContent(e, r) {
  let n = $e.has(e.name ?? ""),
    s = rQe(yo(e), r);
  return n ? e.content : s.map((m) => ({ type: "text", text: m }));
}
//@ chunk-1tz177x8.js:18549-18641 placement
var je = (e, r) =>
  [
    rQe(yo(e), r).join(`
`),
  ]
    .filter((n) => n !== "")
    .map((n) => ({ type: "text", text: n }));
//@ chunk-1tz177x8.js:18641-18719 placement
function Ne(e, r) {
  let n = Array.isArray(e) ? e : void 0;
  return r === void 0 ? e : reconcileAppendContent(n, r);
}
//@ chunk-1tz177x8.js:18719-18808 placement
function Le(e, r) {
  let { is_error: is_error, ...s } = e;
  return r === (is_error === !0) ? e : { ...s, ...(r && { is_error: !0 }) };
}
//@ chunk-1tz177x8.js:18808-18934 placement
function applyEditToToolResult(e, r) {
  return r.kind === "tool-result" && e.type === "tool_result"
    ? Le({ ...e, content: Ne(e.content, r.content) }, r.isError)
    : e;
}
//@ chunk-1tz177x8.js:18934-19013 placement
var De = (e, r) => ({ type: "text", text: r, ...(e.type === "assistant" && { citations: null }) });
//@ chunk-1tz177x8.js:19013-19161 placement
function sliceEditedBlocks(e, r) {
  if (r.kind === "text") return [De(e, r.text)];
  let sliced = e.content.slice(r.index, r.index + 1);
  return e.type === "assistant" ? sliced : sliced.map((m) => applyEditToToolResult(m, r));
}
//@ chunk-1tz177x8.js:19161-19199 placement
var Io = (e, r) => r.flatMap((n) => sliceEditedBlocks(e, n));
//@ chunk-1tz177x8.js:19199-19268 placement
var freeze_2 = Object.freeze({ user: Io, assistant: Io, attachment: freezeToolResultContent, system: je });
//@ chunk-1tz177x8.js:19268-19457 placement
function normalizeAppendedMessage(e, r) {
  if (!(
    checkAppendMessage(e) === void 0 &&
    Object.hasOwn(freeze_2, e.type) &&
    parseTypedBlocks(e.content).length === e.content.length
  ))
    return r;
  let s = normalizeAppendedToolResult(e.content, parseTypedBlocks(r.content));
  return { ...e, content: freeze_2[e.type](e, s) };
}
//@ chunk-1tz177x8.js:19457-20291 placement
function storeSessionAppendRow(e, r, n) {
  if (n === r || safeDeepEqual(n.content, r.content)) return;
  let m = newAppendedBlockTypes(e.message.content, r.content),
    f = `session.append: the ${e.door} row ${e.uuid} is stored `,
    c = m.includes("tool_result")
      ? " To scrub a tool result, pass on a tool_result with the same tool_use_id and new content."
      : "";
  return m.length > 0
    ? `${f}with its ${m.join(", ")} kept, as a session stores it. A session pins tool_use, tool_result, thinking and unknown blocks (a request pairs each tool call with its result and carries thinking as signed), so no hook drops one or changes its id.` +
        c
    : `${f}as a session stores it, not as the hooks left it: a pinned block a hook changed is put back as raised, new or changed media and empty texts are not kept, a response's new text carries citations: null, a notice is one text, and an attachment rendered per request stays as raised.`;
}
//@ chunk-1tz177x8.js:20291-20421 placement
function storeAppendedRow(e, r) {
  let n = normalizeAppendedMessage(e.message, r.message),
    s = storeSessionAppendRow(e, r.message, n);
  if (s !== void 0) pd().log(s, "warn");
  return { message: n, uuid: e.uuid };
}
//@ chunk-1tz177x8.js:20421-20468 placement
var Ve = (e) => async (r) => (rxt(e) ? refuseSessionAppend(r, freeze) : storeAppendedRow(e, r));
//@ chunk-1tz177x8.js:20468-20512 placement
var freeze_3 = Object.freeze({ "session.append": Ve });
/**
 * 按 "事件.方法" 路径取出测试引擎 $ 上可调用的函数；classic.* 走经典钩子；调用时要求传完整事件输入。
 */
//@ chunk-1tz177x8.js:20512-20904 placement
function engineCallFor(path, signal) {
  let [n = "", s = ""] = path.split(".");
  if (n === "classic") return classicHookCaller(path, signal);
  let m = createEventCallers({ signal: signal, withheldCore: withheldCoreSteps(), withheldFloor: freeze_3 }),
    f = getOwn(m, n),
    a = isPlainObject(f) ? getOwn(f, s) : void 0;
  if (typeof a !== "function") throw new HooksError(`$.${path} is no call on the engine's $`);
  let c = a;
  return (h) => {
    if (h === void 0)
      throw new HooksError(
        `$.${path} in a test takes the whole input of its event, which a mod's call may leave out`,
      );
    return c(h);
  };
}
//@ chunk-1tz177x8.js:20904-21023 placement
var describeEngineCalls = () => [
  ...Object.entries(createEventCallers()).map(([e, r]) => [
    e,
    Object.keys(r).map((n) => [n, isStreamingHookEvent(`${e}.${n}`)]),
  ]),
  ["classic", Te()],
];
/**
 * 在已绘制的插件 UI 中按标签、插件、key（及可选 requestId/surface）找唯一一个元素；找不到或多于一个时抛出带说明的 HooksError。
 */
//@ chunk-1tz177x8.js:21023-21610 placement
function findHostedElement({
  act: act,
  tag: tag,
  plugin: plugin,
  key: key,
  requestId: requestId,
  surface: surface,
}) {
  let matches = _ee
      .hostedButtonsOf(plugin, key)
      .filter(
        ({ button: button }) =>
          button.tag === tag &&
          (surface === void 0 || button.surface === surface) &&
          (requestId === void 0 || button.requestId === requestId),
      ),
    [first, ...h] = matches;
  if (!first)
    throw new HooksError(
      `$.ui.${act}: no ${tag} of ${plugin} keyed ${JSON.stringify(key)} is drawn${surface === void 0 ? "" : ` on the ${surface} surface`}; render or mount the tree that holds it first`,
    );
  if (h.length > 0)
    throw new HooksError(
      `$.ui.${act}: ${plugin} holds ${matches.length} ${tag}s keyed ${JSON.stringify(key)}, in ` +
        matches.map((k) => `${k.button.requestId} on ${k.button.surface}`).join(", ") +
        "; name the requestId or the surface",
    );
  return first;
}
/**
 * 把测试里内联给的 register 源码（方法简写、function 或箭头函数）改写成 export function register(...) 模块源码；格式不对时报错。
 */
//@ chunk-1tz177x8.js:21639-22172 placement
function registerSourceAsModule(pluginName, source) {
  let match = /^(async\s+)?register\s*\(/.exec(source);
  if (match)
    return `export ${match[1] ?? ""}function ${source.slice(match[1]?.length ?? 0)}
`;
  let match_2 = /^(async\s+)?function\s*[\w$]*\s*\(/.exec(source);
  if (match_2)
    return `export ${match_2[1] ?? ""}function register(${source.slice(match_2[0].length)}
`;
  let match_3 = /^(async\s*)?(?:\(([^)]*)\)|([\w$]+))\s*=>\s*\{/.exec(source);
  if (match_3) {
    let f = match_3[1] !== void 0,
      a = match_3[2] ?? match_3[3] ?? "";
    return `export ${f ? "async " : ""}function register(${a}) {${source.slice(match_3[0].length)}
`;
  }
  throw new HooksError(
    `test(name, { plugins }): ${pluginName}'s register is written \`register(on) { ... }\``,
  );
}
//@ chunk-1tz177x8.js:22172-22256 placement
async function Ye(e, { name: r, source: source }) {
  let s = join_3(e, r);
  return (await scaffoldPluginTestDir(s, r, registerSourceAsModule(r, source)), s);
}
//@ chunk-1tz177x8.js:22256-22523 placement
function submitTestInput({
  plugin: plugin,
  key: key,
  text: text,
  kind: kind,
  requestId: requestId,
  surface: surface,
}) {
  let a = findHostedElement({
    act: "input",
    tag: "Input",
    plugin: plugin,
    key: key,
    requestId: requestId,
    surface: surface,
  });
  return Cer({
    plugin: plugin,
    handle: a.hosted,
    element: key,
    component: a.button.component,
    surface: a.button.surface,
    kind: kind ?? "submit",
    value: text,
  });
}
//@ chunk-1tz177x8.js:22523-22688 placement
var INPUT_ACTION_SCHEMA = DoctorLazy(() =>
  u({
    plugin: o(),
    key: o(),
    text: o(),
    kind: U(["change", "submit"]).optional(),
    requestId: o().optional(),
    surface: o().refine(W5e, "is not a surface").optional(),
  }),
);
//@ chunk-1tz177x8.js:22688-22698 placement
var Ze = !0;
//@ chunk-1tz177x8.js:22698-22752 placement
var Je = (e) => typeof e === "string" && Object.hasOwn(RENDER_SITES, e);
//@ chunk-1tz177x8.js:22752-22768 placement
var zo = `${resetStateForTests}: `;
/**
 * 插件测试引擎中各操作对应的钩子链名。
 */
//@ chunk-1tz177x8.js:38481-38937 placement
var ENGINE_CHAIN_FOR_OP = {
  "tool.call": "tool.call",
  "tool.check": "tool.check",
  "agent.spawn": "agent.spawn",
  "ui.ask": "tool.call",
  "command.run": "command.run",
  "config.set": "config.set",
  "telemetry.log": "telemetry.log",
  "telemetry.mark": "telemetry.mark",
  "prompt.submit": "prompt.submit",
  "prompt.fill": "prompt.fill",
  "prompt.suggest": "prompt.suggest",
  "prompt.compose": "prompt.compose",
  "session.compact": "session.compact",
  "session.send": "session.send",
  "session.append": "session.append",
};
/**
 * 对引擎链结果做收尾：tool.call 应用拒绝记录，遥测写入日志，prompt.fill 返回填充后的文本与光标。
 */
//@ chunk-1tz177x8.js:38937-39242 placement
async function finishEngineResult(e, r, n) {
  if (e === "tool.call") {
    let { isReadOnly: isReadOnly, ...c } = r;
    return applyRecordedDenial(c, n.denials);
  }
  if (e === "telemetry.log" || e === "telemetry.mark") return c2r(n.caller, e, r);
  if (e !== "prompt.fill") return r;
  let { isFilled: isFilled } = r,
    { text: text, cursor: cursor } = await d2r(n.caller, n.scan, "prompt.fill");
  return { isFilled: isFilled, text: text, cursor: cursor };
}
//@ chunk-1tz177x8.js:39242-39326 placement
var It = { run: (e, r) => ($yn(r.plugin, "steady"), $yn(r.plugin, "live"), Promise.resolve()) };
//@ chunk-1tz177x8.js:39353-39463 placement
var STATE_SET_STEP = {
  check: validateStateSetArgs,
  run: async (e, r) => {
    let n = await stateSetForPlugin(e, r),
      now = Date.now();
    return (flushStaleFold("steady", now), flushStaleFold("live", now), n);
  },
};
//@ chunk-1tz177x8.js:39463-39502 placement
var $t = { "state.get": check, "state.set": STATE_SET_STEP };
/**
 * 插件测试的宿主调用分发：ui.invalidate 与保留钩子直接判定；其他操作按 ENGINE_CHAIN_FOR_OP 映射到引擎链执行，结果再按事件后处理。
 */
//@ chunk-1tz177x8.js:39502-40049 placement
function handleTestHostCall({ op: op, args: args, caller: caller }, s, m) {
  if (op === "ui.invalidate") {
    let invalidateArgs = args;
    return judgeHookInput({
      event: "ui.invalidate",
      args: invalidateArgs,
      caller: caller,
      raise: s,
      ...(invalidateArgs.event === "ui.render" && { bottom: It }),
    });
  }
  if (pos(op)) {
    let reservedBottom = isReservedHookName(op) ? $t[op] : void 0;
    return judgeHookInput({
      event: op,
      args: args,
      caller: caller,
      raise: s,
      ...(reservedBottom !== void 0 && { bottom: reservedBottom }),
    });
  }
  let handler = Object.hasOwn(ENGINE_CHAIN_FOR_OP, op) ? ENGINE_CHAIN_FOR_OP[op] : void 0;
  if (!handler) return grs({ event: op });
  let denials = createStepRecorder();
  return NO_CORE_AT_CHAIN_BOTTOM(handler, {
    origin: caller.origin,
    signal: caller.signal,
    withheldCore: withheldCoreSteps(caller.origin, denials, op === "ui.ask" ? { isReadOnly: !0 } : {}),
    withheldFloor: freeze_3,
  })(normalizePluginHostAction(args, caller.plugin, handler)).then((c) =>
    finishEngineResult(handler, c, { caller: caller, scan: m, denials: denials }),
  );
}
//@ chunk-1tz177x8.js:40049-40154 placement
function installTestHost() {
  (env.set("CLAUDE_CODE_HOOKS_SAME_THREAD", Ze),
    (getPluginRegistry().hookRegistration ??= Promise.resolve()),
    Cs(handleTestHostCall));
}
/**
 * 校验测试声明的插件名（格式、与保留名冲突、重复），并登记插件来源。
 */
//@ chunk-1tz177x8.js:40154-40572 placement
function validateTestPlugins(plugins) {
  let r = new Set([resetStateForTests]);
  for (let { name: n, source: source } of plugins) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(n))
      throw new HooksError(
        `test(name, { plugins }): "${n}" is no plugin name (lowercase letters, digits and dashes)`,
      );
    if (r.has(n)) {
      let m = n === resetStateForTests;
      throw new HooksError(
        m
          ? `test(name, { plugins }): "${n}" is the name the hooks of the test load under; name the plugin otherwise`
          : `test(name, { plugins }): "${n}" is named twice`,
      );
    }
    (registerSourceAsModule(n, source), r.add(n));
  }
}
//@ chunk-1tz177x8.js:40572-40699 placement
var SELECT_ACTION_SCHEMA = DoctorLazy(() =>
  u({
    plugin: o(),
    key: o(),
    value: o(),
    requestId: o().optional(),
    surface: o().refine(W5e, "is not a surface").optional(),
  }),
);
//@ chunk-1tz177x8.js:40699-40751 placement
var Go = () => U(["prepend", "user", "append", "builtin"]);
//@ chunk-1tz177x8.js:40751-40878 placement
var TEST_PLUGINS_SCHEMA = DoctorLazy(() =>
  u({
    tier: Go(),
    plugins: A(u({ name: o(), tier: Go(), source: o() })),
    options: pe(o(), Ue([o(), E(), M(), A(o())])).optional(),
  }),
);

export {
  installTestHost,
  resetStateForTests,
  zo,
  Je,
  findHostedElement,
  engineCallFor,
  Ye,
  hooksModuleSource,
  submitTestInput,
  TEST_PLUGINS_SCHEMA,
  validateTestPlugins,
  INPUT_ACTION_SCHEMA,
  SELECT_ACTION_SCHEMA,
  describeEngineCalls,
};

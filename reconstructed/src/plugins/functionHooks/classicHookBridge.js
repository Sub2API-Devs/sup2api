/**
 * plugins/functionHooks/classicHookBridge.ts
 *
 * 2.1.316 新增：把传统 settings 钩子事件桥接为 classic.<HookEvent> 函数钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (29)
 * attribution: placement 27, affinity 1, sole-consumer 1
 */
import { wi, wS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { mergeHookAggregates } from "../../entrypoints/sdk/coreSchemas.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { extractMode } from "../../components/permissions/PermissionDecisionDebugInfo.js";
import { GLe, noteWithheldPostToolUse } from "./toolCallHooks.js";
import { awaitHooksRespawnUnlessSessionEnd, hookMembersFor, hookOriginFromStack } from "./hookDispatch.js";
import { reportChainFailure } from "./dispatch/chain.js";
import { SZr } from "./sites/siteRules.js";
import { uniq } from "../../utils/collections.js";
import { Rs } from "../../utils/hooks/hookSerialization.js";
import { Yn } from "../../utils/stripAnsi.js";

//@ chunk-e6aww6q8.js:37217-37325 placement
function stripNonAllowInterrupt(decision) {
  if (decision.behavior === "allow") return decision;
  let { interrupt: interrupt, ...r } = decision;
  return interrupt === !0 ? { ...r, interrupt: interrupt } : r;
}
/**
 * 把一次钩子执行结果转成统一的聚合字段（block、preventContinuation、additionalContext、permissionDecision、decision、updatedToolOutput 等）。
 */
//@ chunk-e6aww6q8.js:37325-38105 placement
function toHookAggregateFields(hookResult, hookEvent) {
  let { permissionBehavior: permissionBehavior, permissionRequestResult: permissionRequestResult } =
      hookResult,
    h =
      hookEvent === "PreModelSwitch" &&
      (permissionBehavior === "allow" || permissionBehavior === "deny" || permissionBehavior === "ask"),
    S = hookEvent === "PermissionRequest" ? permissionRequestResult : void 0;
  return {
    block: hookResult.blockingError?.blockingError,
    preventContinuation: hookResult.preventContinuation === !0 || void 0,
    stopReason: hookResult.stopReason,
    additionalContext: hookResult.additionalContexts,
    permissionDecision: h ? permissionBehavior : void 0,
    permissionDecisionReason: h ? hookResult.hookPermissionDecisionReason : void 0,
    decision: S && stripNonAllowInterrupt(S),
    updatedToolOutput: hookResult.updatedToolOutput,
    updatedMCPToolOutput: hookResult.updatedMCPToolOutput,
    initialUserMessage: hookResult.initialUserMessage,
    sessionTitle: hookResult.sessionTitle,
    suppressOriginalPrompt: hookResult.suppressOriginalPrompt === !0 || void 0,
    watchPaths: hookResult.watchPaths,
    reloadSkills: hookResult.reloadSkills === !0 || void 0,
    retry: hookResult.retry === !0 || void 0,
    displayContent: hookResult.displayContent,
  };
}
//@ chunk-e6aww6q8.js:38105-38139 placement
var omitUndefined = (e) => wi(e, (n) => n === void 0);
//@ chunk-e6aww6q8.js:38139-38175 placement
var emptyHookAggregate = () => ({ result: {}, yields: [] });
/**
 * 消费钩子结果流并逐个合并，返回 {result, yields}。
 */
//@ chunk-e6aww6q8.js:38761-38887 affinity
async function aggregateHookResults(results, hookEvent) {
  let r = emptyHookAggregate();
  for await (let s of results)
    r = {
      result: mergeHookAggregates(r.result, omitUndefined(toHookAggregateFields(s, hookEvent))),
      yields: [...r.yields, s],
    };
  return r;
}
//@ chunk-e6aww6q8.js:38887-39007 placement
var isBlockingAggregate = (e) =>
  e.block !== void 0 ||
  e.preventContinuation === !0 ||
  e.permissionDecision === "deny" ||
  e.decision?.behavior === "deny";
//@ chunk-e6aww6q8.js:39007-39148 placement
var mergeIntoBelowAggregate = (e, n) => ({
  ...mergeHookAggregates(e, omitUndefined(n)),
  ...omitUndefined(
    Uo(e, ["additionalContext", "watchPaths", "permissionDecision", "permissionDecisionReason", "decision"]),
  ),
});
//@ chunk-e6aww6q8.js:39148-39273 placement
function blockReasonOf(e) {
  return e.block === void 0 && e.permissionDecision === "deny"
    ? (e.permissionDecisionReason ?? "Blocked by hook")
    : e.block;
}
/**
 * 从经典钩子结果中取出权限相关字段（决定、原因、decision）。
 */
//@ chunk-e6aww6q8.js:39452-39825 sole-consumer
function permissionFieldsOf(e) {
  let {
      permissionDecision: permissionDecision,
      permissionDecisionReason: permissionDecisionReason,
      decision: decision,
    } = e,
    h = {};
  if (permissionDecision !== void 0) h.permissionBehavior = permissionDecision;
  if (permissionDecisionReason !== void 0) h.hookPermissionDecisionReason = permissionDecisionReason;
  if (decision === void 0) return h;
  ((h.permissionRequestResult = extractMode(decision)),
    (h.permissionBehavior = decision.behavior === "allow" ? "allow" : "deny"));
  let y = decision.behavior === "allow" ? decision.updatedInput : void 0;
  if (y !== void 0) h.updatedInput = y;
  return h;
}
//@ chunk-e6aww6q8.js:39825-39992 placement
var PASSTHROUGH_HOOK_FIELDS = [
  "updatedToolOutput",
  "updatedMCPToolOutput",
  "initialUserMessage",
  "sessionTitle",
  "suppressOriginalPrompt",
  "watchPaths",
  "reloadSkills",
  "retry",
  "displayContent",
];
/**
 * 把经典钩子的结果转换为钩子运行器的 yield 形状（阻断错误、权限字段等）。
 */
//@ chunk-e6aww6q8.js:39992-40436 placement
function toClassicYield(e, n, r) {
  let s = blockReasonOf(e),
    h = permissionFieldsOf(e);
  if (s !== void 0)
    h.blockingError = n.find((S) => S.blockingError?.blockingError === s)?.blockingError ?? {
      blockingError: s,
      command: r,
    };
  if (e.preventContinuation === !0) h.preventContinuation = !0;
  if (e.stopReason !== void 0) h.stopReason = e.stopReason;
  if (e.additionalContext !== void 0 && e.additionalContext.length > 0)
    h.additionalContexts = e.additionalContext;
  for (let S of PASSTHROUGH_HOOK_FIELDS) if (e[S] !== void 0) Object.assign(h, { [S]: e[S] });
  return h;
}
//@ chunk-e6aww6q8.js:40436-40589 placement
var createClassicCoreHandler = (e, n) => ({
  name: "core",
  isCore: !0,
  budgetMs: 0,
  async run(r) {
    let s = await aggregateHookResults(e(r, { managedHooksExcluded: !0 }), r.hook_event_name);
    return (n(s), s.result);
  },
});
//@ chunk-e6aww6q8.js:40589-40606 placement
var MANAGED = "managed";
//@ chunk-e6aww6q8.js:40606-40795 placement
var createManagedClassicHandler = (e, n) => ({
  name: MANAGED,
  isManaged: !0,
  budgetMs: 0,
  async run(r, s) {
    let h = await aggregateHookResults(e(r, { managedHooksOnly: !0 }), r.hook_event_name);
    return (n(h), isBlockingAggregate(h.result) ? h.result : mergeIntoBelowAggregate(h.result, await s(r)));
  },
});
/**
 * 把 settings 钩子结果放进函数钩子链：托管钩子在最前、插件 classic.<事件> 钩子居中、普通 settings 钩子在底部；钩子进程重启时等待后重试。
 */
//@ chunk-e6aww6q8.js:40795-41085 placement
function runClassicHookChain(e) {
  let {
      hookInput: hookInput,
      managed: managed,
      core: core,
      signal: signal,
      origin: origin,
      withheld: withheld,
    } = e,
    w = GLe(hookInput.hook_event_name),
    L = awaitHooksRespawnUnlessSessionEnd({ event: w, e: hookInput, origin: origin }, signal);
  return L !== void 0
    ? L.then(() => runClassicHookChain(e))
    : (() =>
        reportChainFailure({
          e: hookInput,
          handlers: [managed, ...hookMembersFor(w, origin, { withheld: withheld }), core].filter(
            (Z) => Z !== void 0,
          ),
          site: SZr(w),
          signal: signal,
          origin: hookOriginFromStack(origin),
        }))();
}
//@ chunk-e6aww6q8.js:41085-41202 placement
var expandPermissionFields = (e) =>
  uniq(
    e.flatMap((n) => {
      let r = ["permissionDecision", "permissionDecisionReason"];
      return r.includes(n) ? r : [n];
    }),
  );
//@ chunk-e6aww6q8.js:41202-41260 placement
var Ght = (e) => mergeHookAggregates(e.managed?.result ?? {}, e.core?.result ?? {});
//@ chunk-e6aww6q8.js:41260-41942 placement
function bridgeClassicHookResult(e, n) {
  let r = n === "PreModelSwitch";
  switch (e) {
    case "block":
      return r ? ["blockingError"] : ["blockingError", "permissionBehavior", "hookPermissionDecisionReason"];
    case "additionalContext":
      return ["additionalContexts"];
    case "permissionDecision":
    case "permissionDecisionReason":
      return ["permissionBehavior", "hookPermissionDecisionReason"];
    case "decision":
      return ["permissionRequestResult", "permissionBehavior", "updatedInput"];
    case "preventContinuation":
    case "stopReason":
    case "sessionTitle":
    case "suppressOriginalPrompt":
    case "initialUserMessage":
    case "watchPaths":
    case "reloadSkills":
    case "updatedToolOutput":
    case "updatedMCPToolOutput":
    case "retry":
    case "displayContent":
      return [e];
    default:
      return [];
  }
}
/**
 * 比较经典钩子结果与托管/核心 yield 的差异，列出不一致的字段。
 */
//@ chunk-e6aww6q8.js:41942-42329 placement
function diffClassicYields(e, n, r) {
  let s = [...(n.managed?.yields ?? []), ...(n.core?.yields ?? [])],
    h = e,
    y = Ght(n),
    filtered = uniq([...Object.keys(h), ...Object.keys(y)]).filter((Z) => Rs(h[Z]) !== Rs(y[Z]));
  if (filtered.length === 0) return s;
  let w = new Set(filtered.flatMap((Z) => bridgeClassicHookResult(Z, r.event))),
    filtered_2 = s.map((Z) => wi(Z, (Se, ke) => w.has(ke))).filter((Z) => Object.keys(Z).length > 0),
    G = toClassicYield(wS(e, expandPermissionFields(filtered)), s, r.command);
  return Object.keys(G).length === 0 ? filtered_2 : [...filtered_2, G];
}
/**
 * classic 事件的生成器入口：运行钩子链后，按插件钩子对结果的改写产出最终的 yield 序列（PostToolUse 时可被扣留）。
 */
//@ chunk-e6aww6q8.js:42329-42640 placement
async function* runClassicEventThroughHooks({
  event: event,
  hookInput: hookInput,
  runClassicHooks: runClassicHooks,
  managedRanAbove: managedRanAbove,
  signal: signal,
  origin: origin,
}) {
  let S = {};
  yield* diffClassicYields(
    await runClassicHookChain({
      hookInput: hookInput,
      managed: managedRanAbove
        ? void 0
        : createManagedClassicHandler(runClassicHooks, (w) => {
            S.managed = w;
          }),
      core: createClassicCoreHandler(runClassicHooks, (w) => {
        S.core = w;
      }),
      signal: signal,
      origin: origin,
      ...(event === "PostToolUse" && { withheld: () => noteWithheldPostToolUse(hookInput) }),
    }),
    S,
    { event: event, command: `${GLe(event)} hook` },
  );
}
//@ chunk-e6aww6q8.js:42640-42702 placement
var Kht = (e, n) => ({ command: e, succeeded: !1, output: n, blocked: !0 });
//@ chunk-e6aww6q8.js:42702-42788 placement
function b7n(e) {
  return (
    Yn(e)
      .split(
        `
`,
      )
      .map((n) => n.trim())
      .filter(Boolean)
      .at(-1) ?? ""
  );
}
/**
 * 从成功且未被扣留的钩子输出中取第一个非空 worktree 路径。
 */
//@ chunk-e6aww6q8.js:42788-42898 placement
function firstWorktreePathOutput(e) {
  return e
    .filter((n) => n.succeeded && !n.answerHeld)
    .map((n) => b7n(n.output))
    .find((n) => n.length > 0);
}
//@ chunk-e6aww6q8.js:42898-43025 placement
function summarizeOutsideReplResults(e, n) {
  let found = e.find((h) => h.blocked),
    s = n === "WorktreeCreate";
  return omitUndefined({ block: found?.output, worktreePath: s ? firstWorktreePathOutput(e) : void 0 });
}
//@ chunk-e6aww6q8.js:43025-43300 placement
var createOutsideReplHandler = (e, n, r) => ({
  name: n.managedHooksOnly === !0 ? MANAGED : "core",
  ...(n.managedHooksOnly === !0 ? { isManaged: !0 } : { isCore: !0 }),
  budgetMs: 0,
  async run(s, h) {
    let y = n.managedHooksOnly === !0,
      runClassicHooks = await e.runClassicHooks(s, n);
    r(runClassicHooks);
    let w = summarizeOutsideReplResults(runClassicHooks, e.event);
    return !y || w.block !== void 0 ? w : mergeIntoBelowAggregate(w, await h(s));
  },
});
//@ chunk-e6aww6q8.js:43300-43362 placement
var Yht = (e, n) => ({ command: e, succeeded: !0, output: n, blocked: !1 });
/**
 * 在 REPL 之外运行经典钩子时调和各结果（阻断与 WorktreeCreate 路径一致性）。
 */
//@ chunk-e6aww6q8.js:43362-43671 placement
function reconcileOutsideReplResults(e, n, r) {
  let s = summarizeOutsideReplResults(e, r.event),
    h = n.block === s.block,
    y = r.event !== "WorktreeCreate" || n.worktreePath === s.worktreePath,
    filtered = e.filter((G) => (h || !G.blocked) && (y || firstWorktreePathOutput([G]) === void 0)),
    w = h ? void 0 : n.block,
    L = y ? void 0 : n.worktreePath;
  return [
    ...filtered,
    ...(w === void 0 ? [] : [Kht(r.command, w)]),
    ...(L === void 0 ? [] : [Yht(r.command, L)]),
  ];
}
/**
 * 非 REPL 场景（如 WorktreeCreate）下运行函数钩子链：托管与普通 settings 钩子分别在两端，最后把钩子改写的阻断/worktree 路径合并回结果列表。
 */
//@ chunk-e6aww6q8.js:43671-44052 placement
async function runOutsideReplHookChain(e) {
  let n = GLe(e.event),
    r = awaitHooksRespawnUnlessSessionEnd({ event: n, e: e.hookInput, origin: void 0 }, e.signal);
  if (r !== void 0) return (await r, runOutsideReplHookChain(e));
  let s = [],
    h = (y) => {
      s.push(...y);
    };
  return reconcileOutsideReplResults(
    s,
    await reportChainFailure({
      handlers: [
        createOutsideReplHandler(e, { managedHooksOnly: !0 }, h),
        ...hookMembersFor(n, e.origin),
        createOutsideReplHandler(e, { managedHooksExcluded: !0 }, h),
      ],
      e: e.hookInput,
      site: SZr(n),
      signal: e.signal,
      origin: hookOriginFromStack(e.origin),
    }),
    { event: e.event, command: `${n} hook` },
  );
}
/**
 * 在钩子成员列表前后加上可选的首/尾处理器。
 */
//@ chunk-e6aww6q8.js:44052-44154 placement
function withChainEnds(e, n, r) {
  let s = r === void 0 ? [] : [r];
  return e === void 0 || n.length === 0 ? [...n, ...s] : [e, ...n, ...s];
}

export {
  omitUndefined,
  runClassicHookChain,
  MANAGED,
  firstWorktreePathOutput,
  runClassicEventThroughHooks,
  runOutsideReplHookChain,
  withChainEnds,
};

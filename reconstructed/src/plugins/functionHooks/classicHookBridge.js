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
import { mergeHookAggregates_2 } from "../../entrypoints/sdk/coreSchemas.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { extractMode } from "../../components/permissions/PermissionDecisionDebugInfo.js";
import { classicSiteName, noteWithheldPostToolUse } from "./toolCallHooks.js";
import { awaitHooksRespawnUnlessSessionEnd, hookMembersFor, hookOriginFromStack } from "./hookDispatch.js";
import { reportChainFailure } from "./dispatch/chain.js";
import { classicSite } from "./sites/siteRules.js";
import { uniq } from "../../utils/collections.js";
import { stableStringifySafe } from "../../utils/hooks/hookSerialization.js";
import { stripAnsi } from "../../utils/stripAnsi.js";

//@ chunk-e6aww6q8.js:37217-37325 placement
function stripNonAllowInterrupt(decision) {
  if (decision.behavior === "allow") return decision;
  let { interrupt, ...r } = decision;
  return interrupt === true
    ? {
        ...r,
        interrupt,
      }
    : r;
}
//@ chunk-e6aww6q8.js:37325-38105 placement
/**
 * 把一次钩子执行结果转成统一的聚合字段（block、preventContinuation、additionalContext、permissionDecision、decision、updatedToolOutput 等）。
 */
function toHookAggregateFields(hookResult, hookEvent) {
  let { permissionBehavior, permissionRequestResult } = hookResult;
  let h =
    hookEvent === "PreModelSwitch" &&
    (permissionBehavior === "allow" || permissionBehavior === "deny" || permissionBehavior === "ask");
  let decision = hookEvent === "PermissionRequest" ? permissionRequestResult : undefined;
  return {
    block: hookResult.blockingError?.blockingError,
    preventContinuation: hookResult.preventContinuation === true || undefined,
    stopReason: hookResult.stopReason,
    additionalContext: hookResult.additionalContexts,
    permissionDecision: h ? permissionBehavior : undefined,
    permissionDecisionReason: h ? hookResult.hookPermissionDecisionReason : undefined,
    decision: decision && stripNonAllowInterrupt(decision),
    updatedToolOutput: hookResult.updatedToolOutput,
    updatedMCPToolOutput: hookResult.updatedMCPToolOutput,
    initialUserMessage: hookResult.initialUserMessage,
    sessionTitle: hookResult.sessionTitle,
    suppressOriginalPrompt: hookResult.suppressOriginalPrompt === true || undefined,
    watchPaths: hookResult.watchPaths,
    reloadSkills: hookResult.reloadSkills === true || undefined,
    retry: hookResult.retry === true || undefined,
    displayContent: hookResult.displayContent,
  };
}
//@ chunk-e6aww6q8.js:38105-38139 placement
var omitUndefined = (e) => wi(e, (n) => n === undefined);
//@ chunk-e6aww6q8.js:38139-38175 placement
var emptyHookAggregate = () => ({
  result: {},
  yields: [],
});
//@ chunk-e6aww6q8.js:38761-38887 affinity
/**
 * 消费钩子结果流并逐个合并，返回 {result, yields}。
 */
async function aggregateHookResults(results, hookEvent) {
  let r = emptyHookAggregate();
  for await (let result of results)
    r = {
      result: mergeHookAggregates_2(r.result, omitUndefined(toHookAggregateFields(result, hookEvent))),
      yields: [...r.yields, result],
    };
  return r;
}
//@ chunk-e6aww6q8.js:38887-39007 placement
var isBlockingAggregate = (result) =>
  result.block !== undefined ||
  result.preventContinuation === true ||
  result.permissionDecision === "deny" ||
  result.decision?.behavior === "deny";
//@ chunk-e6aww6q8.js:39007-39148 placement
var mergeIntoBelowAggregate = (e, n) => ({
  ...mergeHookAggregates_2(e, omitUndefined(n)),
  ...omitUndefined(
    Uo(e, ["additionalContext", "watchPaths", "permissionDecision", "permissionDecisionReason", "decision"]),
  ),
});
//@ chunk-e6aww6q8.js:39148-39273 placement
function blockReasonOf(e) {
  return e.block === undefined && e.permissionDecision === "deny"
    ? (e.permissionDecisionReason ?? "Blocked by hook")
    : e.block;
}
//@ chunk-e6aww6q8.js:39452-39825 sole-consumer
/**
 * 从经典钩子结果中取出权限相关字段（决定、原因、decision）。
 */
function permissionFieldsOf(e) {
  let { permissionDecision, permissionDecisionReason, decision } = e;
  let h = {};
  if (permissionDecision !== undefined) h.permissionBehavior = permissionDecision;
  if (permissionDecisionReason !== undefined) h.hookPermissionDecisionReason = permissionDecisionReason;
  if (decision === undefined) return h;
  h.permissionRequestResult = extractMode(decision);
  h.permissionBehavior = decision.behavior === "allow" ? "allow" : "deny";
  let updatedInput = decision.behavior === "allow" ? decision.updatedInput : undefined;
  if (updatedInput !== undefined) h.updatedInput = updatedInput;
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
//@ chunk-e6aww6q8.js:39992-40436 placement
/**
 * 把经典钩子的结果转换为钩子运行器的 yield 形状（阻断错误、权限字段等）。
 */
function toClassicYield(e, n, command) {
  let s = blockReasonOf(e);
  let h = permissionFieldsOf(e);
  if (s !== undefined)
    h.blockingError = n.find((S) => S.blockingError?.blockingError === s)?.blockingError ?? {
      blockingError: s,
      command,
    };
  if (e.preventContinuation === true) h.preventContinuation = true;
  if (e.stopReason !== undefined) h.stopReason = e.stopReason;
  if (e.additionalContext !== undefined && e.additionalContext.length > 0)
    h.additionalContexts = e.additionalContext;
  for (let S of PASSTHROUGH_HOOK_FIELDS)
    if (e[S] !== undefined)
      Object.assign(h, {
        [S]: e[S],
      });
  return h;
}
//@ chunk-e6aww6q8.js:40436-40589 placement
var createClassicCoreHandler = (runClassicHooks, n) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  async run(r) {
    let s = await aggregateHookResults(
      runClassicHooks(r, {
        managedHooksExcluded: true,
      }),
      r.hook_event_name,
    );
    n(s);
    return s.result;
  },
});
//@ chunk-e6aww6q8.js:40589-40606 placement
var MANAGED = "managed";
//@ chunk-e6aww6q8.js:40606-40795 placement
var createManagedClassicHandler = (runClassicHooks, n) => ({
  name: MANAGED,
  isManaged: true,
  budgetMs: 0,
  async run(r, s) {
    let h = await aggregateHookResults(
      runClassicHooks(r, {
        managedHooksOnly: true,
      }),
      r.hook_event_name,
    );
    n(h);
    return isBlockingAggregate(h.result) ? h.result : mergeIntoBelowAggregate(h.result, await s(r));
  },
});
//@ chunk-e6aww6q8.js:40795-41085 placement
/**
 * 把 settings 钩子结果放进函数钩子链：托管钩子在最前、插件 classic.<事件> 钩子居中、普通 settings 钩子在底部；钩子进程重启时等待后重试。
 */
function runClassicHookChain(e) {
  let { hookInput, managed, core, signal, origin, withheld } = e;
  let event = classicSiteName(hookInput.hook_event_name);
  let L = awaitHooksRespawnUnlessSessionEnd(
    {
      event,
      e: hookInput,
      origin,
    },
    signal,
  );
  return L !== undefined
    ? L.then(() => runClassicHookChain(e))
    : (() =>
        reportChainFailure({
          e: hookInput,
          handlers: [
            managed,
            ...hookMembersFor(event, origin, {
              withheld,
            }),
            core,
          ].filter((Z) => Z !== undefined),
          site: classicSite(event),
          signal,
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
/**
 * 合并托管与核心的钩子结果
 */
var mergeHookAggregates = (e) => mergeHookAggregates_2(e.managed?.result ?? {}, e.core?.result ?? {});
//@ chunk-e6aww6q8.js:41260-41942 placement
function bridgeClassicHookResult(e, event) {
  let r = event === "PreModelSwitch";
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
//@ chunk-e6aww6q8.js:41942-42329 placement
/**
 * 比较经典钩子结果与托管/核心 yield 的差异，列出不一致的字段。
 */
function diffClassicYields(e, n, r) {
  let s = [...(n.managed?.yields ?? []), ...(n.core?.yields ?? [])];
  let h = e;
  let y = mergeHookAggregates(n);
  let filtered = uniq([...Object.keys(h), ...Object.keys(y)]).filter(
    (Z) => stableStringifySafe(h[Z]) !== stableStringifySafe(y[Z]),
  );
  if (filtered.length === 0) return s;
  let w = new Set(filtered.flatMap((Z) => bridgeClassicHookResult(Z, r.event)));
  let filtered_2 = s.map((Z) => wi(Z, (Se, ke) => w.has(ke))).filter((Z) => Object.keys(Z).length > 0);
  let classicYield = toClassicYield(wS(e, expandPermissionFields(filtered)), s, r.command);
  return Object.keys(classicYield).length === 0 ? filtered_2 : [...filtered_2, classicYield];
}
//@ chunk-e6aww6q8.js:42329-42640 placement
/**
 * classic 事件的生成器入口：运行钩子链后，按插件钩子对结果的改写产出最终的 yield 序列（PostToolUse 时可被扣留）。
 */
async function* runClassicEventThroughHooks({
  event,
  hookInput,
  runClassicHooks,
  managedRanAbove,
  signal,
  origin,
}) {
  let S = {};
  yield* diffClassicYields(
    await runClassicHookChain({
      hookInput,
      managed: managedRanAbove
        ? undefined
        : createManagedClassicHandler(runClassicHooks, (managed) => {
            S.managed = managed;
          }),
      core: createClassicCoreHandler(runClassicHooks, (core) => {
        S.core = core;
      }),
      signal,
      origin,
      ...(event === "PostToolUse" && {
        withheld: () => noteWithheldPostToolUse(hookInput),
      }),
    }),
    S,
    {
      event,
      command: `${classicSiteName(event)} hook`,
    },
  );
}
//@ chunk-e6aww6q8.js:42640-42702 placement
/**
 * 被阻断的结果
 */
var blockedResult = (command, output) => ({
  command,
  succeeded: false,
  output,
  blocked: true,
});
//@ chunk-e6aww6q8.js:42702-42788 placement
/**
 * 输出按行拆分
 */
function splitOutputLines(output) {
  return (
    stripAnsi(output)
      .split(
        `
`,
      )
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1) ?? ""
  );
}
//@ chunk-e6aww6q8.js:42788-42898 placement
/**
 * 从成功且未被扣留的钩子输出中取第一个非空 worktree 路径。
 */
function firstWorktreePathOutput(e) {
  return e
    .filter((n) => n.succeeded && !n.answerHeld)
    .map((n) => splitOutputLines(n.output))
    .find((n) => n.length > 0);
}
//@ chunk-e6aww6q8.js:42898-43025 placement
function summarizeOutsideReplResults(e, event) {
  let found = e.find((h) => h.blocked);
  let s = event === "WorktreeCreate";
  return omitUndefined({
    block: found?.output,
    worktreePath: s ? firstWorktreePathOutput(e) : undefined,
  });
}
//@ chunk-e6aww6q8.js:43025-43300 placement
var createOutsideReplHandler = (e, n, r) => ({
  name: n.managedHooksOnly === true ? MANAGED : "core",
  ...(n.managedHooksOnly === true
    ? {
        isManaged: true,
      }
    : {
        isCore: true,
      }),
  budgetMs: 0,
  async run(s, h) {
    let y = n.managedHooksOnly === true;
    let S = await e.runClassicHooks(s, n);
    r(S);
    let w = summarizeOutsideReplResults(S, e.event);
    return !y || w.block !== undefined ? w : mergeIntoBelowAggregate(w, await h(s));
  },
});
//@ chunk-e6aww6q8.js:43300-43362 placement
/**
 * 成功结果
 */
var succeededResult = (command, output) => ({
  command,
  succeeded: true,
  output,
  blocked: false,
});
//@ chunk-e6aww6q8.js:43362-43671 placement
/**
 * 在 REPL 之外运行经典钩子时调和各结果（阻断与 WorktreeCreate 路径一致性）。
 */
function reconcileOutsideReplResults(e, n, r) {
  let s = summarizeOutsideReplResults(e, r.event);
  let h = n.block === s.block;
  let y = r.event !== "WorktreeCreate" || n.worktreePath === s.worktreePath;
  let filtered = e.filter((G) => (h || !G.blocked) && (y || firstWorktreePathOutput([G]) === undefined));
  let block = h ? undefined : n.block;
  let worktreePath = y ? undefined : n.worktreePath;
  return [
    ...filtered,
    ...(block === undefined ? [] : [blockedResult(r.command, block)]),
    ...(worktreePath === undefined ? [] : [succeededResult(r.command, worktreePath)]),
  ];
}
//@ chunk-e6aww6q8.js:43671-44052 placement
/**
 * 非 REPL 场景（如 WorktreeCreate）下运行函数钩子链：托管与普通 settings 钩子分别在两端，最后把钩子改写的阻断/worktree 路径合并回结果列表。
 */
async function runOutsideReplHookChain(e) {
  let event = classicSiteName(e.event);
  let r = awaitHooksRespawnUnlessSessionEnd(
    {
      event,
      e: e.hookInput,
      origin: undefined,
    },
    e.signal,
  );
  if (r !== undefined) {
    await r;
    return runOutsideReplHookChain(e);
  }
  let s = [];
  let h = (y) => {
    s.push(...y);
  };
  return reconcileOutsideReplResults(
    s,
    await reportChainFailure({
      handlers: [
        createOutsideReplHandler(
          e,
          {
            managedHooksOnly: true,
          },
          h,
        ),
        ...hookMembersFor(event, e.origin),
        createOutsideReplHandler(
          e,
          {
            managedHooksExcluded: true,
          },
          h,
        ),
      ],
      e: e.hookInput,
      site: classicSite(event),
      signal: e.signal,
      origin: hookOriginFromStack(e.origin),
    }),
    {
      event: e.event,
      command: `${event} hook`,
    },
  );
}
//@ chunk-e6aww6q8.js:44052-44154 placement
/**
 * 在钩子成员列表前后加上可选的首/尾处理器。
 */
function withChainEnds(e, n, r) {
  let s = r === undefined ? [] : [r];
  return e === undefined || n.length === 0 ? [...n, ...s] : [e, ...n, ...s];
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

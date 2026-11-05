/**
 * plugins/functionHooks/classicHookBridge.ts
 *
 * 2.1.316 新增：把传统 settings 钩子事件桥接为 classic.<HookEvent> 函数钩子
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (29)
 * attribution: placement 27, affinity 1, sole-consumer 1
 */
import { import_reject, pickAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { mergeHookAggregates_2 } from "../../entrypoints/sdk/coreSchemas.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { extractMode } from "../../components/permissions/PermissionDecisionDebugInfo.js";
import { classicSiteName, noteWithheldPostToolUse } from "./toolCallHooks.js";
import { awaitHooksRespawnUnlessSessionEnd, hookMembersFor, hookOriginFromStack } from "./hookDispatch.js";
import { reportChainFailure } from "./dispatch/chain.js";
import { classicSite } from "./sites/siteRules.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { stableStringifySafe } from "../../utils/hooks/hookSerialization.js";
import { stripAnsi } from "../../utils/stripAnsi.js";

//@ chunk-5xgkngpb.js:39805-39913 placement
function stripNonAllowInterrupt(decision) {
  if (decision.behavior === "allow") return decision;
  let { interrupt, ...rest } = decision;
  return interrupt === true
    ? {
        ...rest,
        interrupt,
      }
    : rest;
}
//@ chunk-5xgkngpb.js:39913-40693 placement
/**
 * 把一次钩子执行结果转成统一的聚合字段（block、preventContinuation、additionalContext、permissionDecision、decision、updatedToolOutput 等）。
 */
function toHookAggregateFields(hookResult, hookEvent) {
  let { permissionBehavior, permissionRequestResult } = hookResult;
  let hasPermission =
    hookEvent === "PreModelSwitch" &&
    (permissionBehavior === "allow" || permissionBehavior === "deny" || permissionBehavior === "ask");
  let decision = hookEvent === "PermissionRequest" ? permissionRequestResult : undefined;
  return {
    block: hookResult.blockingError?.blockingError,
    preventContinuation: hookResult.preventContinuation === true || undefined,
    stopReason: hookResult.stopReason,
    additionalContext: hookResult.additionalContexts,
    permissionDecision: hasPermission ? permissionBehavior : undefined,
    permissionDecisionReason: hasPermission ? hookResult.hookPermissionDecisionReason : undefined,
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
//@ chunk-5xgkngpb.js:40693-40727 placement
var omitUndefined = (value) => import_reject(value, (entry) => entry === undefined);
//@ chunk-5xgkngpb.js:40727-40763 placement
var emptyHookAggregate = () => ({
  result: {},
  yields: [],
});
//@ chunk-5xgkngpb.js:41349-41475 affinity
/**
 * 消费钩子结果流并逐个合并，返回 {result, yields}。
 */
async function aggregateHookResults(results, hookEvent) {
  let aggregate = emptyHookAggregate();
  for await (let result of results)
    aggregate = {
      result: mergeHookAggregates_2(
        aggregate.result,
        omitUndefined(toHookAggregateFields(result, hookEvent)),
      ),
      yields: [...aggregate.yields, result],
    };
  return aggregate;
}
//@ chunk-5xgkngpb.js:41475-41595 placement
var isBlockingAggregate = (result) =>
  result.block !== undefined ||
  result.preventContinuation === true ||
  result.permissionDecision === "deny" ||
  result.decision?.behavior === "deny";
//@ chunk-5xgkngpb.js:41595-41736 placement
var mergeIntoBelowAggregate = (below, above) => ({
  ...mergeHookAggregates_2(below, omitUndefined(above)),
  ...omitUndefined(
    omitAlias(below, [
      "additionalContext",
      "watchPaths",
      "permissionDecision",
      "permissionDecisionReason",
      "decision",
    ]),
  ),
});
//@ chunk-5xgkngpb.js:41736-41861 placement
function blockReasonOf(result) {
  return result.block === undefined && result.permissionDecision === "deny"
    ? (result.permissionDecisionReason ?? "Blocked by hook")
    : result.block;
}
//@ chunk-5xgkngpb.js:42040-42413 sole-consumer
/**
 * 从经典钩子结果中取出权限相关字段（决定、原因、decision）。
 */
function permissionFieldsOf(result) {
  let { permissionDecision, permissionDecisionReason, decision } = result;
  let fields = {};
  if (permissionDecision !== undefined) fields.permissionBehavior = permissionDecision;
  if (permissionDecisionReason !== undefined) fields.hookPermissionDecisionReason = permissionDecisionReason;
  if (decision === undefined) return fields;
  fields.permissionRequestResult = extractMode(decision);
  fields.permissionBehavior = decision.behavior === "allow" ? "allow" : "deny";
  let updatedInput = decision.behavior === "allow" ? decision.updatedInput : undefined;
  if (updatedInput !== undefined) fields.updatedInput = updatedInput;
  return fields;
}
//@ chunk-5xgkngpb.js:42413-42580 placement
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
//@ chunk-5xgkngpb.js:42580-43024 placement
/**
 * 把经典钩子的结果转换为钩子运行器的 yield 形状（阻断错误、权限字段等）。
 */
function toClassicYield(result, results, command) {
  let blockReason = blockReasonOf(result);
  let fields = permissionFieldsOf(result);
  if (blockReason !== undefined)
    fields.blockingError = results.find((entry) => entry.blockingError?.blockingError === blockReason)
      ?.blockingError ?? {
      blockingError: blockReason,
      command,
    };
  if (result.preventContinuation === true) fields.preventContinuation = true;
  if (result.stopReason !== undefined) fields.stopReason = result.stopReason;
  if (result.additionalContext !== undefined && result.additionalContext.length > 0)
    fields.additionalContexts = result.additionalContext;
  for (let entry of PASSTHROUGH_HOOK_FIELDS)
    if (result[entry] !== undefined)
      Object.assign(fields, {
        [entry]: result[entry],
      });
  return fields;
}
//@ chunk-5xgkngpb.js:43024-43177 placement
var createClassicCoreHandler = (runClassicHooks, onManaged) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  async run(input) {
    let result = await aggregateHookResults(
      runClassicHooks(input, {
        managedHooksExcluded: true,
      }),
      input.hook_event_name,
    );
    onManaged(result);
    return result.result;
  },
});
//@ chunk-5xgkngpb.js:43177-43194 placement
var MANAGED = "managed";
//@ chunk-5xgkngpb.js:43194-43383 placement
var createManagedClassicHandler = (runClassicHooks, onManaged) => ({
  name: MANAGED,
  isManaged: true,
  budgetMs: 0,
  async run(input, result) {
    let managed = await aggregateHookResults(
      runClassicHooks(input, {
        managedHooksOnly: true,
      }),
      input.hook_event_name,
    );
    onManaged(managed);
    return isBlockingAggregate(managed.result)
      ? managed.result
      : mergeIntoBelowAggregate(managed.result, await result(input));
  },
});
//@ chunk-5xgkngpb.js:43383-43675 placement
/**
 * 把 settings 钩子结果放进函数钩子链：托管钩子在最前、插件 classic.<事件> 钩子居中、普通 settings 钩子在底部；钩子进程重启时等待后重试。
 */
function runClassicHookChain(options) {
  let { hookInput, managed, core, signal, origin, withheld } = options;
  let event = classicSiteName(hookInput.hook_event_name);
  let summary = awaitHooksRespawnUnlessSessionEnd(
    {
      event,
      e: hookInput,
      origin,
    },
    signal,
  );
  return summary !== undefined
    ? summary.then(() => runClassicHookChain(options))
    : (() =>
        reportChainFailure({
          e: hookInput,
          handlers: [
            managed,
            ...hookMembersFor(event, origin, {
              withheld,
            }),
            core,
          ].filter((core) => core !== undefined),
          site: classicSite(event),
          signal,
          origin: hookOriginFromStack(origin),
        }))();
}
//@ chunk-5xgkngpb.js:43675-43792 placement
var expandPermissionFields = (fields) =>
  normalizeCaseForComparison_2(
    fields.flatMap((field) => {
      let names = ["permissionDecision", "permissionDecisionReason"];
      return names.includes(field) ? names : [field];
    }),
  );
//@ chunk-5xgkngpb.js:43792-43850 placement
/**
 * 合并托管与核心的钩子结果
 */
var mergeHookAggregates = (aggregate) =>
  mergeHookAggregates_2(aggregate.managed?.result ?? {}, aggregate.core?.result ?? {});
//@ chunk-5xgkngpb.js:43850-44532 placement
function bridgeClassicHookResult(reason, event) {
  let isPreModelSwitch = event === "PreModelSwitch";
  switch (reason) {
    case "block":
      return isPreModelSwitch
        ? ["blockingError"]
        : ["blockingError", "permissionBehavior", "hookPermissionDecisionReason"];
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
      return [reason];
    default:
      return [];
  }
}
//@ chunk-5xgkngpb.js:44532-44928 placement
/**
 * 比较经典钩子结果与托管/核心 yield 的差异，列出不一致的字段。
 */
function diffClassicYields(input, aggregate, info) {
  let yields = [...(aggregate.managed?.yields ?? []), ...(aggregate.core?.yields ?? [])];
  let before = input;
  let after = mergeHookAggregates(aggregate);
  let fields = normalizeCaseForComparison_2([...Object.keys(before), ...Object.keys(after)]).filter(
    (key) => stableStringifySafe(before[key]) !== stableStringifySafe(after[key]),
  );
  if (fields.length === 0) return yields;
  let changed = new Set(fields.flatMap((key) => bridgeClassicHookResult(key, info.event)));
  let filtered = yields
    .map((entry) => import_reject(entry, (value, key) => changed.has(key)))
    .filter((entry) => Object.keys(entry).length > 0);
  let classicYield = toClassicYield(pickAlias(input, expandPermissionFields(fields)), yields, info.command);
  return Object.keys(classicYield).length === 0 ? filtered : [...filtered, classicYield];
}
//@ chunk-5xgkngpb.js:44928-45239 placement
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
  let collected = {};
  yield* diffClassicYields(
    await runClassicHookChain({
      hookInput,
      managed: managedRanAbove
        ? undefined
        : createManagedClassicHandler(runClassicHooks, (managed) => {
            collected.managed = managed;
          }),
      core: createClassicCoreHandler(runClassicHooks, (core) => {
        collected.core = core;
      }),
      signal,
      origin,
      ...(event === "PostToolUse" && {
        withheld: () => noteWithheldPostToolUse(hookInput),
      }),
    }),
    collected,
    {
      event,
      command: `${classicSiteName(event)} hook`,
    },
  );
}
//@ chunk-5xgkngpb.js:45239-45301 placement
/**
 * 被阻断的结果
 */
var blockedResult = (command, output) => ({
  command,
  succeeded: false,
  output,
  blocked: true,
});
//@ chunk-5xgkngpb.js:45301-45387 placement
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
//@ chunk-5xgkngpb.js:45387-45497 placement
/**
 * 从成功且未被扣留的钩子输出中取第一个非空 worktree 路径。
 */
function firstWorktreePathOutput(results) {
  return results
    .filter((result) => result.succeeded && !result.answerHeld)
    .map((result) => splitOutputLines(result.output))
    .find((lines) => lines.length > 0);
}
//@ chunk-5xgkngpb.js:45497-45624 placement
function summarizeOutsideReplResults(results, event) {
  let found = results.find((result) => result.blocked);
  let isWorktreeCreate = event === "WorktreeCreate";
  return omitUndefined({
    block: found?.output,
    worktreePath: isWorktreeCreate ? firstWorktreePathOutput(results) : undefined,
  });
}
//@ chunk-5xgkngpb.js:45624-45899 placement
var createOutsideReplHandler = (config, options, collect) => ({
  name: options.managedHooksOnly === true ? MANAGED : "core",
  ...(options.managedHooksOnly === true
    ? {
        isManaged: true,
      }
    : {
        isCore: true,
      }),
  budgetMs: 0,
  async run(input, next) {
    let isManagedOnly = options.managedHooksOnly === true;
    let results = await config.runClassicHooks(input, options);
    collect(results);
    let summary = summarizeOutsideReplResults(results, config.event);
    return !isManagedOnly || summary.block !== undefined
      ? summary
      : mergeIntoBelowAggregate(summary, await next(input));
  },
});
//@ chunk-5xgkngpb.js:45899-45961 placement
/**
 * 成功结果
 */
var succeededResult = (command, output) => ({
  command,
  succeeded: true,
  output,
  blocked: false,
});
//@ chunk-5xgkngpb.js:45961-46270 placement
/**
 * 在 REPL 之外运行经典钩子时调和各结果（阻断与 WorktreeCreate 路径一致性）。
 */
function reconcileOutsideReplResults(results, aggregate, info) {
  let summary = summarizeOutsideReplResults(results, info.event);
  let isBlockSame = aggregate.block === summary.block;
  let isWorktreePathSame = info.event !== "WorktreeCreate" || aggregate.worktreePath === summary.worktreePath;
  let filtered = results.filter(
    (result) =>
      (isBlockSame || !result.blocked) &&
      (isWorktreePathSame || firstWorktreePathOutput([result]) === undefined),
  );
  let block = isBlockSame ? undefined : aggregate.block;
  let worktreePath = isWorktreePathSame ? undefined : aggregate.worktreePath;
  return [
    ...filtered,
    ...(block === undefined ? [] : [blockedResult(info.command, block)]),
    ...(worktreePath === undefined ? [] : [succeededResult(info.command, worktreePath)]),
  ];
}
//@ chunk-5xgkngpb.js:46270-46651 placement
/**
 * 非 REPL 场景（如 WorktreeCreate）下运行函数钩子链：托管与普通 settings 钩子分别在两端，最后把钩子改写的阻断/worktree 路径合并回结果列表。
 */
async function runOutsideReplHookChain(options) {
  let event = classicSiteName(options.event);
  let respawn = awaitHooksRespawnUnlessSessionEnd(
    {
      event,
      e: options.hookInput,
      origin: undefined,
    },
    options.signal,
  );
  if (respawn !== undefined) {
    await respawn;
    return runOutsideReplHookChain(options);
  }
  let results = [];
  let collect = (yields) => {
    results.push(...yields);
  };
  return reconcileOutsideReplResults(
    results,
    await reportChainFailure({
      handlers: [
        createOutsideReplHandler(
          options,
          {
            managedHooksOnly: true,
          },
          collect,
        ),
        ...hookMembersFor(event, options.origin),
        createOutsideReplHandler(
          options,
          {
            managedHooksExcluded: true,
          },
          collect,
        ),
      ],
      e: options.hookInput,
      site: classicSite(event),
      signal: options.signal,
      origin: hookOriginFromStack(options.origin),
    }),
    {
      event: options.event,
      command: `${event} hook`,
    },
  );
}
//@ chunk-5xgkngpb.js:46651-46753 placement
/**
 * 在钩子成员列表前后加上可选的首/尾处理器。
 */
function withChainEnds(head, middle, tail) {
  let tailItems = tail === undefined ? [] : [tail];
  return head === undefined || middle.length === 0
    ? [...middle, ...tailItems]
    : [head, ...middle, ...tailItems];
}
export {
  omitUndefined,
  withChainEnds,
  MANAGED,
  firstWorktreePathOutput,
  runClassicEventThroughHooks,
  runOutsideReplHookChain,
  runClassicHookChain,
};

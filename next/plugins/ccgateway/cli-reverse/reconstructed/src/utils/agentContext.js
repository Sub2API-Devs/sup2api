/**
 * utils/agentContext.ts
 *
 * 并入已有模块：权限提示对话框定义；是否为同步子代理（或回收 shell 的）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/agentContext.ts
 * pieces: chunk-d91efs9w.js (1), chunk-exfmq47h.js (32), chunk-w3ch4xq2.js (4)
 * attribution: placement 19, layout 11, fingerprint 4, sole-consumer 3
 */
import { TMUX_QUERY_TIMEOUT_MS, tmuxQueryCacheByRoot } from "./concurrentSessions.js";
import { formatRulesForCritique_2 } from "../cli/handlers/autoMode.js";
import { withDeadline } from "./sleep.js";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { deepFreezeToolName } from "./deepFreezePlainData.js";
import { getSessionId } from "../bootstrap/state.js";
import { attributionKeyOrUndefined } from "./turnAttributionKey.js";
import { getContextKey } from "./cwd.js";
import { codeModeAccepted } from "./codeMode/accepted.js";
import { agentTypeForAnalytics_GATE_EVALUATED, lit } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "./debug.js";
import { getDynamicTeamContext } from "./teammate.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:874008-874207 placement
/**
 * 预先为评审准备规则文本：同一键只准备一次，在时限内等待结果并缓存已完成的答案。
 */
function primeRulesForCritique(sessionRoot, id, rulesPromise, timeoutMs = TMUX_QUERY_TIMEOUT_MS) {
  let cache = tmuxQueryCacheByRoot.of(sessionRoot);
  if (cache.has(id)) return;
  let answerPromise = rulesPromise.then(formatRulesForCritique_2).catch(() => {
    return;
  });
  let entry = {
    settled: false,
    answer: withDeadline(answerPromise, timeoutMs),
  };
  cache.set(id, entry);
  answerPromise.then((answer) => {
    if (cache.get(id) === entry)
      cache.set(id, {
        settled: true,
        answer,
      });
  });
}
//@ chunk-exfmq47h.js:874207-874243 placement
/**
 * 清空某 agent 上下文里的答案缓存。
 */
function clearAgentAnswers(sessionRoot) {
  tmuxQueryCacheByRoot.peek(sessionRoot)?.clear();
}
//@ chunk-exfmq47h.js:874243-874294 placement
/**
 * 取出某键的缓存答案。
 */
function getCachedAgentAnswer(rootSession, sessionId) {
  return tmuxQueryCacheByRoot.peek(rootSession)?.get(sessionId)?.answer;
}
//@ chunk-exfmq47h.js:874343-874379 placement
/**
 * 取上下文里的 hook 调用者。
 */
function getHookCallerOf(context) {
  return context.hookCaller;
}
//@ chunk-exfmq47h.js:874379-874467 placement
/**
 * 主线程非远程执行时的 hook 调用者。
 */
function getHookCaller(context) {
  return context.agentId === undefined && context.forRemoteExecution !== true
    ? context.hookCaller
    : undefined;
}
//@ chunk-exfmq47h.js:874467-874533 placement
/**
 * 是否由 hook 或插件驱动。
 */
function isHookOrPluginSteered(context) {
  return context.hookCaller !== undefined || context.pluginSteered === true;
}
//@ chunk-exfmq47h.js:874533-874582 layout
function context(context) {
  return getHookCallerOf(context) ?? (isHookOrPluginSteered(context) ? "" : undefined);
}
//@ chunk-exfmq47h.js:874582-874650 placement
/**
 * 是否为远程代理或插件代理。
 */
function isRemoteOrPluginAgent(requestSource) {
  return requestSource?.type === "remote-agent" || requestSource?.type === "plugin";
}
//@ chunk-exfmq47h.js:874650-874736 placement
/**
 * 把指定值的选项排在前面。
 */
function preferValueFirst(suggestions, preferredValue) {
  return [
    ...suggestions.filter((suggestion) => suggestion.value === preferredValue),
    ...suggestions.filter((suggestion) => suggestion.value !== preferredValue),
  ];
}
//@ chunk-exfmq47h.js:874736-874901 placement
/**
 * 从权限更新列表中筛出 addDirectories 类型的更新，输入不是数组或出错时返回 null。
 */
function filterAddDirectoriesUpdates(suggestions) {
  if (!Array.isArray(suggestions)) return null;
  try {
    return suggestions.filter(
      (suggestion) =>
        typeof suggestion === "object" &&
        suggestion !== null &&
        "type" in suggestion &&
        suggestion.type === "addDirectories",
    );
  } catch {
    return null;
  }
}
//@ chunk-exfmq47h.js:874901-875159 placement
/**
 * 权限提示对话框定义。
 */
var PERMISSION_PROMPT_DIALOG; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:874901", () => {
  PERMISSION_PROMPT_DIALOG = withHideWhile({
    kind: "permission_prompt",
    payload: DoctorLazy(() =>
      deepFreezeToolName(
        (payload) =>
          typeof payload === "object" &&
          payload !== null &&
          "requestId" in payload &&
          "toolName" in payload &&
          "permissionResult" in payload,
      ),
    ),
    result: DoctorLazy(() =>
      deepFreezeToolName((result) => typeof result === "object" && result !== null && "behavior" in result),
    ),
    default: {
      behavior: "cancelled",
    },
  });
});
//@ chunk-exfmq47h.js:876113-876164 placement
/**
 * 主线程代理上下文。
 */
function mainAgentContext() {
  return {
    agentType: "main",
    agentId: getSessionId(),
  };
}
//@ chunk-exfmq47h.js:876164-876207 placement
/**
 * 是否为主线程。
 */
function isMainAgent(agentContext) {
  return agentContext.agentType === "main";
}
//@ chunk-exfmq47h.js:876207-876298 placement
/**
 * 回合归因键。
 */
function turnAttributionKeyFor(agentContext) {
  return attributionKeyOrUndefined(
    agentContext && !isMainAgent(agentContext) && "turnAttributionKey" in agentContext
      ? agentContext.turnAttributionKey
      : getContextKey(),
  );
}
//@ chunk-exfmq47h.js:876298-876375 placement (2.1.88 match: isSubagentContext, 0.783)
/**
 * 是否为委托观察的子代理。
 */
function isDelegatedObservationContext(context) {
  return context?.agentType === "subagent" && context.delegatedObservation === true;
}
//@ chunk-exfmq47h.js:876375-876441 placement
/**
 * 代理嵌套深度。
 */
function getAgentDepth(agentContext) {
  if (agentContext.agentType === "main") return 0;
  return agentContext.depth ?? 0;
}
//@ chunk-exfmq47h.js:876441-876586 placement
/**
 * 前台子代理的 agentId（主线程、后台代理、主会话后台任务返回 undefined）。
 */
function getForegroundSubagentId(agentContext) {
  if (!agentContext || agentContext.agentType === "main") return;
  if (agentContext.isBackgroundAgent) return;
  if ("isMainSession" in agentContext && agentContext.isMainSession) return;
  return agentContext.agentId;
}
//@ chunk-exfmq47h.js:876586-876681 placement
/**
 * 后台代理 id。
 */
function getBackgroundAgentId(agentContext) {
  if (!agentContext || agentContext.agentType === "main") return;
  return agentContext.isBackgroundAgent ? agentContext.agentId : undefined;
}
//@ chunk-exfmq47h.js:876681-876790 placement
/**
 * 是否为同步子代理（或回收 shell 的）。
 */
function reapsShellsOnExit(agentContext) {
  return (
    agentContext !== undefined &&
    agentContext.agentType === "subagent" &&
    (agentContext.isAsync === false || agentContext.reapsShellsUnlessMoved === true)
  );
}
//@ chunk-exfmq47h.js:876790-876837 fingerprint (2.1.88 match: isSubagentContext, 1)
/**
 * agentType === "subagent"。
 */
function isSubagentContext(context) {
  return context.agentType === "subagent";
}
//@ chunk-exfmq47h.js:876837-876981 layout
/**
 * 是否运行在"非交互式"代理语境：teammate、异步子代理、远程执行，或另一个条件成立。
 */
function isUnattendedAgentContext(toolUseContext) {
  return (
    toolUseContext.agentContext.agentType === "teammate" ||
    (isSubagentContext(toolUseContext.agentContext) && toolUseContext.agentContext.isAsync === true) ||
    toolUseContext.forRemoteExecution === true ||
    isHookOrPluginSteered(toolUseContext)
  );
}
//@ chunk-exfmq47h.js:876981-877193 layout
function isMainSpawnedSubagent(context) {
  return (
    context.agentContext !== undefined &&
    isNonMainSessionSubagent(context.agentContext) &&
    context.agentContext.agentId === context.agentId &&
    context.agentContext.agentType === "subagent" &&
    context.agentContext.spawnedByMainThread === true &&
    context.teammateContext === undefined
  );
}
//@ chunk-exfmq47h.js:877193-877269 layout
/**
 * 恒为 false 的占位判断（构建时关闭的特性）。
 */
function alwaysFalse(toolUseContext) {
  return (
    codeModeAccepted() && toolUseContext.agentId === undefined && toolUseContext.teammateContext === undefined
  );
}
//@ chunk-exfmq47h.js:877269-877326 layout
function isUnattendedRun(toolUseContext) {
  return (
    isUnattendedAgentContext(toolUseContext) || (codeModeAccepted() && toolUseContext.replAsyncAsk === true)
  );
}
//@ chunk-exfmq47h.js:877326-877373 layout
/**
 * 是子代理且不是主会话后台任务。
 */
function isNonMainSessionSubagent(agentContext) {
  return isSubagentContext(agentContext) && !agentContext.isMainSession;
}
//@ chunk-exfmq47h.js:877373-877450 layout
/**
 * agentId 是当前主会话后台任务自身时返回 undefined，否则原样返回。
 */
function excludeMainSessionAgentId(agentId, agentContext) {
  return isSubagentContext(agentContext) &&
    agentContext.isMainSession === true &&
    agentContext.agentId === agentId
    ? undefined
    : agentId;
}
//@ chunk-exfmq47h.js:877450-877554 layout
/**
 * 是否在"主对话"语境：主线程，或主会话后台任务/主对话的 fork。
 */
function isMainConversationContext(agentContext) {
  return (
    agentContext !== undefined &&
    (isMainAgent(agentContext) ||
      (isSubagentContext(agentContext) &&
        (agentContext.isMainSession === true || agentContext.forkOfMainConversation === true)))
  );
}
//@ chunk-exfmq47h.js:877554-877664 fingerprint (2.1.88 match: getSubagentLogName, 1)
/**
 * 子代理类型的遥测名：内置代理用真实名，自定义代理统一为 user-defined。
 */
function getSubagentLogName(agentContext) {
  if (!isSubagentContext(agentContext) || !agentContext.subagentName) return;
  return agentContext.isBuiltIn
    ? agentTypeForAnalytics_GATE_EVALUATED(agentContext.subagentName, true)
    : lit("user-defined");
}
//@ chunk-exfmq47h.js:877664-877813 layout
/**
 * 子代理遥测字段 {subagent_type, is_built_in_agent}。
 */
function getSubagentTelemetryFields(agentContext) {
  try {
    if (!isSubagentContext(agentContext)) return {};
    let subagentLogName = getSubagentLogName(agentContext);
    if (subagentLogName === undefined) return {};
    return {
      subagent_type: subagentLogName,
      is_built_in_agent: agentContext.isBuiltIn ?? false,
    };
  } catch {
    return {};
  }
}
//@ chunk-exfmq47h.js:877813-877964 layout
/**
 * workflow 运行的 OTel 属性 workflow.run_id / workflow.name。
 */
function getWorkflowSpanAttributes(agentContext) {
  if (!agentContext || !isSubagentContext(agentContext) || !agentContext.workflowRunId) return {};
  return {
    "workflow.run_id": agentContext.workflowRunId,
    ...(agentContext.workflowName && {
      "workflow.name": agentContext.workflowName,
    }),
  };
}
//@ chunk-exfmq47h.js:877964-878086 layout
/**
 * workflow 运行字段 {workflowRunId, workflowName}。
 */
function getWorkflowRunFields(agentContext) {
  if (!agentContext || !isSubagentContext(agentContext) || !agentContext.workflowRunId) return {};
  return {
    workflowRunId: agentContext.workflowRunId,
    workflowName: agentContext.workflowName,
  };
}
//@ chunk-exfmq47h.js:878086-878278 fingerprint (2.1.88 match: consumeInvokingRequestId, 0.757)
/**
 * 一次性取出发起该子代理的请求 ID（之后标 invocationEmitted），用于把首个请求关联到父调用。
 */
function consumeInvokingRequestId(agentContext) {
  if (agentContext.agentType === "main" || !agentContext.invokingRequestId || agentContext.invocationEmitted)
    return;
  agentContext.invocationEmitted = true;
  return {
    invokingRequestId: agentContext.invokingRequestId,
    invocationKind: agentContext.invocationKind,
  };
}
//@ chunk-d91efs9w.js:191-250 placement
/**
 * 对象是否含 main 键（或未定义）。
 */
function hasMainKey(observers) {
  return observers === undefined || Object.hasOwn(observers, "main");
}
//@ chunk-w3ch4xq2.js:84699-84755 sole-consumer
/**
 * 构造 TeammateIdle 钩子的目标对象（agentId、队友名、团队名）。
 */
var teammateIdleTarget = (agentId, teammateName, teamName) => ({
  agentId,
  teammateName,
  teamName,
});
//@ chunk-w3ch4xq2.js:84755-85087 sole-consumer
/**
 * 找到持有某队友的进程内任务，若其可恢复 agent id 与给定 id 一致，则返回 TeammateIdle 钩子的目标；没有任务持有时记日志。
 */
function getTeammateIdleTarget(agentContext, taskMap, agentId) {
  let flattened = Object.values(taskMap.all()).flatMap((task) =>
    task.type === "in_process_teammate" && task.identity.agentId === agentContext.agentId
      ? [task.identity.resumableAgentId]
      : [],
  );
  if (flattened.length === 0)
    logForDebugging(
      `[stopHooks] no task holds teammate ${agentContext.agentId}: its turn ends with no TeammateIdle`,
    );
  return agentId !== undefined && flattened.includes(agentId)
    ? teammateIdleTarget(agentId, agentContext.agentName, agentContext.teamName)
    : undefined;
}
//@ chunk-w3ch4xq2.js:85087-85277 sole-consumer
function getTeamContextTarget(agentContext) {
  let dynamicTeamContext = getDynamicTeamContext();
  let hasDynamicTeamContext =
    dynamicTeamContext !== null &&
    Boolean(dynamicTeamContext.agentId) &&
    Boolean(dynamicTeamContext.teamName);
  let isSubagentInMainSession = agentContext?.agentType === "subagent" && agentContext.isMainSession === true;
  return hasDynamicTeamContext
    ? teammateIdleTarget(
        isSubagentInMainSession ? agentContext.agentId : undefined,
        dynamicTeamContext.agentName,
        dynamicTeamContext.teamName,
      )
    : undefined;
}
//@ chunk-w3ch4xq2.js:85277-85345 fingerprint (2.1.88 match: isTeammateAgentContext, 1)
/**
 * 按代理语境分派：teammate 走一个实现，其余走另一个。
 */
function isTeammateAgentContext(agentContext, taskMap, agentId) {
  return agentContext?.agentType === "teammate"
    ? getTeammateIdleTarget(agentContext, taskMap, agentId)
    : getTeamContextTarget(agentContext);
}
export {
  isHookOrPluginSteered,
  getHookCaller,
  isUnattendedAgentContext,
  getCachedAgentAnswer,
  turnAttributionKeyFor,
  mainAgentContext,
  isMainAgent,
  isSubagentContext,
  isMainConversationContext,
  getBackgroundAgentId,
  getForegroundSubagentId,
  context,
  isDelegatedObservationContext,
  getAgentDepth,
  PERMISSION_PROMPT_DIALOG,
  isUnattendedRun,
  isMainSpawnedSubagent,
  getWorkflowSpanAttributes,
  hasMainKey,
  reapsShellsOnExit,
  primeRulesForCritique,
  clearAgentAnswers,
  getSubagentLogName,
  consumeInvokingRequestId,
  getWorkflowRunFields,
  getSubagentTelemetryFields,
  alwaysFalse,
  isRemoteOrPluginAgent,
  filterAddDirectoriesUpdates,
  preferValueFirst,
  excludeMainSessionAgentId,
  getHookCallerOf,
  isNonMainSessionSubagent,
  isTeammateAgentContext,
};

/**
 * utils/agentContext.ts
 *
 * 并入已有模块：权限提示对话框定义；是否为同步子代理（或回收 shell 的）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/agentContext.ts
 * pieces: chunk-aepeg2w5.js (29), chunk-bxv8ns7f.js (1), chunk-ha3km179.js (4)
 * attribution: placement 19, fingerprint 4, layout 8, sole-consumer 3
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
import { agentTypeForAnalytics_GATE_EVALUATED, lit } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "./debug.js";
import { getDynamicTeamContext } from "./teammate.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:851673-851872 placement
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
//@ chunk-aepeg2w5.js:851872-851908 placement
/**
 * 清空某 agent 上下文里的答案缓存。
 */
function clearAgentAnswers(sessionRoot) {
  tmuxQueryCacheByRoot.peek(sessionRoot)?.clear();
}
//@ chunk-aepeg2w5.js:851908-851959 placement
/**
 * 取出某键的缓存答案。
 */
function getCachedAgentAnswer(rootSession, sessionId) {
  return tmuxQueryCacheByRoot.peek(rootSession)?.get(sessionId)?.answer;
}
//@ chunk-aepeg2w5.js:852008-852044 placement
/**
 * 取上下文里的 hook 调用者。
 */
function getHookCallerOf(context) {
  return context.hookCaller;
}
//@ chunk-aepeg2w5.js:852044-852133 placement
/**
 * 主线程非远程执行时的 hook 调用者。
 */
function getHookCaller(context) {
  return context.agentId === undefined && context.forRemoteExecution !== true
    ? context.hookCaller
    : undefined;
}
//@ chunk-aepeg2w5.js:852133-852199 placement
/**
 * 是否由 hook 或插件驱动。
 */
function isHookOrPluginSteered(context) {
  return context.hookCaller !== undefined || context.pluginSteered === true;
}
//@ chunk-aepeg2w5.js:852199-852267 placement
/**
 * 是否为远程代理或插件代理。
 */
function isRemoteOrPluginAgent(requestSource) {
  return requestSource?.type === "remote-agent" || requestSource?.type === "plugin";
}
//@ chunk-aepeg2w5.js:852267-852353 placement
/**
 * 把指定值的选项排在前面。
 */
function preferValueFirst(suggestions, preferredValue) {
  return [
    ...suggestions.filter((suggestion) => suggestion.value === preferredValue),
    ...suggestions.filter((suggestion) => suggestion.value !== preferredValue),
  ];
}
//@ chunk-aepeg2w5.js:852353-852518 placement
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
//@ chunk-aepeg2w5.js:852518-852776 placement
/**
 * 权限提示对话框定义。
 */
var PERMISSION_PROMPT_DIALOG; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:852518", () => {
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
//@ chunk-aepeg2w5.js:853777-853828 placement
/**
 * 主线程代理上下文。
 */
function mainAgentContext() {
  return {
    agentType: "main",
    agentId: getSessionId(),
  };
}
//@ chunk-aepeg2w5.js:853828-853871 placement
/**
 * 是否为主线程。
 */
function isMainAgent(agentContext) {
  return agentContext.agentType === "main";
}
//@ chunk-aepeg2w5.js:853871-853962 placement
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
//@ chunk-aepeg2w5.js:853962-854039 placement (2.1.88 match: isSubagentContext, 0.783)
/**
 * 是否为委托观察的子代理。
 */
function isDelegatedObservationContext(context) {
  return context?.agentType === "subagent" && context.delegatedObservation === true;
}
//@ chunk-aepeg2w5.js:854039-854105 placement
/**
 * 代理嵌套深度。
 */
function getAgentDepth(agentContext) {
  if (agentContext.agentType === "main") return 0;
  return agentContext.depth ?? 0;
}
//@ chunk-aepeg2w5.js:854105-854250 placement
/**
 * 前台子代理的 agentId（主线程、后台代理、主会话后台任务返回 undefined）。
 */
function getForegroundSubagentId(agentContext) {
  if (!agentContext || agentContext.agentType === "main") return;
  if (agentContext.isBackgroundAgent) return;
  if ("isMainSession" in agentContext && agentContext.isMainSession) return;
  return agentContext.agentId;
}
//@ chunk-aepeg2w5.js:854250-854345 placement
/**
 * 后台代理 id。
 */
function getBackgroundAgentId(agentContext) {
  if (!agentContext || agentContext.agentType === "main") return;
  return agentContext.isBackgroundAgent ? agentContext.agentId : undefined;
}
//@ chunk-aepeg2w5.js:854345-854454 placement
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
//@ chunk-aepeg2w5.js:854454-854501 fingerprint (2.1.88 match: isSubagentContext, 1)
/**
 * agentType === "subagent"。
 */
function isSubagentContext(context) {
  return context.agentType === "subagent";
}
//@ chunk-aepeg2w5.js:854501-854645 layout
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
//@ chunk-aepeg2w5.js:854645-854670 layout
/**
 * 恒为 false 的占位判断（构建时关闭的特性）。
 */
function alwaysFalse(toolUseContext) {
  return false;
}
//@ chunk-aepeg2w5.js:854670-854717 layout
/**
 * 是子代理且不是主会话后台任务。
 */
function isNonMainSessionSubagent(agentContext) {
  return isSubagentContext(agentContext) && !agentContext.isMainSession;
}
//@ chunk-aepeg2w5.js:854717-854794 layout
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
//@ chunk-aepeg2w5.js:854794-854898 layout
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
//@ chunk-aepeg2w5.js:854898-855008 fingerprint (2.1.88 match: getSubagentLogName, 1)
/**
 * 子代理类型的遥测名：内置代理用真实名，自定义代理统一为 user-defined。
 */
function getSubagentLogName(agentContext) {
  if (!isSubagentContext(agentContext) || !agentContext.subagentName) return;
  return agentContext.isBuiltIn
    ? agentTypeForAnalytics_GATE_EVALUATED(agentContext.subagentName, true)
    : lit("user-defined");
}
//@ chunk-aepeg2w5.js:855008-855157 layout
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
//@ chunk-aepeg2w5.js:855157-855308 layout
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
//@ chunk-aepeg2w5.js:855308-855430 layout
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
//@ chunk-aepeg2w5.js:855430-855622 fingerprint (2.1.88 match: consumeInvokingRequestId, 0.757)
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
//@ chunk-bxv8ns7f.js:191-250 placement
/**
 * 对象是否含 main 键（或未定义）。
 */
function hasMainKey(observers) {
  return observers === undefined || Object.hasOwn(observers, "main");
}
//@ chunk-ha3km179.js:75409-75465 sole-consumer
/**
 * 构造 TeammateIdle 钩子的目标对象（agentId、队友名、团队名）。
 */
var teammateIdleTarget = (agentId, teammateName, teamName) => ({
  agentId,
  teammateName,
  teamName,
});
//@ chunk-ha3km179.js:75465-75797 sole-consumer
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
//@ chunk-ha3km179.js:75797-75987 sole-consumer
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
//@ chunk-ha3km179.js:75987-76055 fingerprint (2.1.88 match: isTeammateAgentContext, 1)
/**
 * 按代理语境分派：teammate 走一个实现，其余走另一个。
 */
function isTeammateAgentContext(agentContext, taskMap, agentId) {
  return agentContext?.agentType === "teammate"
    ? getTeammateIdleTarget(agentContext, taskMap, agentId)
    : getTeamContextTarget(agentContext);
}
export {
  mainAgentContext,
  hasMainKey,
  isHookOrPluginSteered,
  getHookCaller,
  isUnattendedAgentContext,
  isRemoteOrPluginAgent,
  getAgentDepth,
  alwaysFalse,
  getWorkflowRunFields,
  isMainConversationContext,
  isDelegatedObservationContext,
  PERMISSION_PROMPT_DIALOG,
  isMainAgent,
  getBackgroundAgentId,
  filterAddDirectoriesUpdates,
  preferValueFirst,
  getCachedAgentAnswer,
  turnAttributionKeyFor,
  isSubagentContext,
  isNonMainSessionSubagent,
  reapsShellsOnExit,
  getForegroundSubagentId,
  getHookCallerOf,
  getWorkflowSpanAttributes,
  getSubagentTelemetryFields,
  primeRulesForCritique,
  clearAgentAnswers,
  getSubagentLogName,
  consumeInvokingRequestId,
  excludeMainSessionAgentId,
  isTeammateAgentContext,
};

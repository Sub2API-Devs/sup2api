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
import { TMUX_QUERY_TIMEOUT_MS, Xg } from "./concurrentSessions.js";
import { formatRulesForCritique_2 } from "../cli/handlers/autoMode.js";
import { withDeadline } from "./sleep.js";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { Fh } from "./deepFreezePlainData.js";
import { getSessionId } from "../bootstrap/state.js";
import { Rlt } from "./turnAttributionKey.js";
import { getContextKey } from "./cwd.js";
import { agentTypeForAnalytics_GATE_EVALUATED, lit } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "./debug.js";
import { getDynamicTeamContext } from "./teammate.js";

/**
 * 预先为评审准备规则文本：同一键只准备一次，在时限内等待结果并缓存已完成的答案。
 */
//@ chunk-aepeg2w5.js:851673-851872 placement
function primeRulesForCritique(e, n, r, s = TMUX_QUERY_TIMEOUT_MS) {
  let of = Xg.of(e);
  if (of.has(n)) return;
  let y = r.then(formatRulesForCritique_2).catch(() => {
      return;
    }),
    S = { settled: !1, answer: withDeadline(y, s) };
  (of.set(n, S),
    y.then((w) => {
      if (of.get(n) === S) of.set(n, { settled: !0, answer: w });
    }));
}
//@ chunk-aepeg2w5.js:851872-851908 placement
function cTi(e) {
  Xg.peek(e)?.clear();
}
//@ chunk-aepeg2w5.js:851908-851959 placement
function rP(e, n) {
  return Xg.peek(e)?.get(n)?.answer;
}
//@ chunk-aepeg2w5.js:852008-852044 placement
function ygr(e) {
  return e.hookCaller;
}
/**
 * 主线程非远程执行时的 hook 调用者。
 */
//@ chunk-aepeg2w5.js:852044-852133 placement
function getHookCaller(e) {
  return e.agentId === void 0 && e.forRemoteExecution !== !0 ? e.hookCaller : void 0;
}
/**
 * 是否由 hook 或插件驱动。
 */
//@ chunk-aepeg2w5.js:852133-852199 placement
function isHookOrPluginSteered(e) {
  return e.hookCaller !== void 0 || e.pluginSteered === !0;
}
/**
 * 是否为远程代理或插件代理。
 */
//@ chunk-aepeg2w5.js:852199-852267 placement
function isRemoteOrPluginAgent(e) {
  return e?.type === "remote-agent" || e?.type === "plugin";
}
/**
 * 把指定值的选项排在前面。
 */
//@ chunk-aepeg2w5.js:852267-852353 placement
function preferValueFirst(e, n) {
  return [...e.filter((r) => r.value === n), ...e.filter((r) => r.value !== n)];
}
/**
 * 从权限更新列表中筛出 addDirectories 类型的更新，输入不是数组或出错时返回 null。
 */
//@ chunk-aepeg2w5.js:852353-852518 placement
function filterAddDirectoriesUpdates(e) {
  if (!Array.isArray(e)) return null;
  try {
    return e.filter((n) => typeof n === "object" && n !== null && "type" in n && n.type === "addDirectories");
  } catch {
    return null;
  }
}
/**
 * 权限提示对话框定义。
 */
//@ chunk-aepeg2w5.js:852518-852776 placement
var PERMISSION_PROMPT_DIALOG = withHideWhile({
  kind: "permission_prompt",
  payload: DoctorLazy(() =>
    Fh(
      (e) =>
        typeof e === "object" && e !== null && "requestId" in e && "toolName" in e && "permissionResult" in e,
    ),
  ),
  result: DoctorLazy(() => Fh((e) => typeof e === "object" && e !== null && "behavior" in e)),
  default: { behavior: "cancelled" },
});
/**
 * 主线程代理上下文。
 */
//@ chunk-aepeg2w5.js:853777-853828 placement
function mainAgentContext() {
  return { agentType: "main", agentId: getSessionId() };
}
/**
 * 是否为主线程。
 */
//@ chunk-aepeg2w5.js:853828-853871 placement
function isMainAgent(e) {
  return e.agentType === "main";
}
/**
 * 回合归因键。
 */
//@ chunk-aepeg2w5.js:853871-853962 placement
function turnAttributionKeyFor(e) {
  return Rlt(e && !isMainAgent(e) && "turnAttributionKey" in e ? e.turnAttributionKey : getContextKey());
}
/**
 * 是否为委托观察的子代理。
 */
//@ chunk-aepeg2w5.js:853962-854039 placement = isSubagentContext (0.783)
function isDelegatedObservationContext(context) {
  return context?.agentType === "subagent" && context.delegatedObservation === !0;
}
/**
 * 代理嵌套深度。
 */
//@ chunk-aepeg2w5.js:854039-854105 placement
function getAgentDepth(agentContext) {
  if (agentContext.agentType === "main") return 0;
  return agentContext.depth ?? 0;
}
/**
 * 前台子代理的 agentId（主线程、后台代理、主会话后台任务返回 undefined）。
 */
//@ chunk-aepeg2w5.js:854105-854250 placement
function getForegroundSubagentId(agentContext) {
  if (!agentContext || agentContext.agentType === "main") return;
  if (agentContext.isBackgroundAgent) return;
  if ("isMainSession" in agentContext && agentContext.isMainSession) return;
  return agentContext.agentId;
}
/**
 * 后台代理 id。
 */
//@ chunk-aepeg2w5.js:854250-854345 placement
function getBackgroundAgentId(agentContext) {
  if (!agentContext || agentContext.agentType === "main") return;
  return agentContext.isBackgroundAgent ? agentContext.agentId : void 0;
}
/**
 * 是否为同步子代理（或回收 shell 的）。
 */
//@ chunk-aepeg2w5.js:854345-854454 placement
function reapsShellsOnExit(agentContext) {
  return (
    agentContext !== void 0 &&
    agentContext.agentType === "subagent" &&
    (agentContext.isAsync === !1 || agentContext.reapsShellsUnlessMoved === !0)
  );
}
/**
 * agentType === "subagent"。
 */
//@ chunk-aepeg2w5.js:854454-854501 fingerprint = isSubagentContext (1)
function isSubagentContext(context) {
  return context.agentType === "subagent";
}
/**
 * 是否运行在"非交互式"代理语境：teammate、异步子代理、远程执行，或另一个条件成立。
 */
//@ chunk-aepeg2w5.js:854501-854645 layout
function isUnattendedAgentContext(toolUseContext) {
  return (
    toolUseContext.agentContext.agentType === "teammate" ||
    (isSubagentContext(toolUseContext.agentContext) && toolUseContext.agentContext.isAsync === !0) ||
    toolUseContext.forRemoteExecution === !0 ||
    isHookOrPluginSteered(toolUseContext)
  );
}
/**
 * 恒为 false 的占位判断（构建时关闭的特性）。
 */
//@ chunk-aepeg2w5.js:854645-854670 layout
function alwaysFalse(e) {
  return !1;
}
/**
 * 是子代理且不是主会话后台任务。
 */
//@ chunk-aepeg2w5.js:854670-854717 layout
function isNonMainSessionSubagent(agentContext) {
  return isSubagentContext(agentContext) && !agentContext.isMainSession;
}
/**
 * agentId 是当前主会话后台任务自身时返回 undefined，否则原样返回。
 */
//@ chunk-aepeg2w5.js:854717-854794 layout
function excludeMainSessionAgentId(agentId, agentContext) {
  return isSubagentContext(agentContext) &&
    agentContext.isMainSession === !0 &&
    agentContext.agentId === agentId
    ? void 0
    : agentId;
}
/**
 * 是否在"主对话"语境：主线程，或主会话后台任务/主对话的 fork。
 */
//@ chunk-aepeg2w5.js:854794-854898 layout
function isMainConversationContext(agentContext) {
  return (
    agentContext !== void 0 &&
    (isMainAgent(agentContext) ||
      (isSubagentContext(agentContext) &&
        (agentContext.isMainSession === !0 || agentContext.forkOfMainConversation === !0)))
  );
}
/**
 * 子代理类型的遥测名：内置代理用真实名，自定义代理统一为 user-defined。
 */
//@ chunk-aepeg2w5.js:854898-855008 fingerprint = getSubagentLogName (1)
function getSubagentLogName(agentContext) {
  if (!isSubagentContext(agentContext) || !agentContext.subagentName) return;
  return agentContext.isBuiltIn
    ? agentTypeForAnalytics_GATE_EVALUATED(agentContext.subagentName, !0)
    : lit("user-defined");
}
/**
 * 子代理遥测字段 {subagent_type, is_built_in_agent}。
 */
//@ chunk-aepeg2w5.js:855008-855157 layout
function getSubagentTelemetryFields(agentContext) {
  try {
    if (!isSubagentContext(agentContext)) return {};
    let n = getSubagentLogName(agentContext);
    if (n === void 0) return {};
    return { subagent_type: n, is_built_in_agent: agentContext.isBuiltIn ?? !1 };
  } catch {
    return {};
  }
}
/**
 * workflow 运行的 OTel 属性 workflow.run_id / workflow.name。
 */
//@ chunk-aepeg2w5.js:855157-855308 layout
function getWorkflowSpanAttributes(agentContext) {
  if (!agentContext || !isSubagentContext(agentContext) || !agentContext.workflowRunId) return {};
  return {
    "workflow.run_id": agentContext.workflowRunId,
    ...(agentContext.workflowName && { "workflow.name": agentContext.workflowName }),
  };
}
/**
 * workflow 运行字段 {workflowRunId, workflowName}。
 */
//@ chunk-aepeg2w5.js:855308-855430 layout
function getWorkflowRunFields(agentContext) {
  if (!agentContext || !isSubagentContext(agentContext) || !agentContext.workflowRunId) return {};
  return { workflowRunId: agentContext.workflowRunId, workflowName: agentContext.workflowName };
}
/**
 * 一次性取出发起该子代理的请求 ID（之后标 invocationEmitted），用于把首个请求关联到父调用。
 */
//@ chunk-aepeg2w5.js:855430-855622 fingerprint = consumeInvokingRequestId (0.757)
function consumeInvokingRequestId(agentContext) {
  if (agentContext.agentType === "main" || !agentContext.invokingRequestId || agentContext.invocationEmitted)
    return;
  return (
    (agentContext.invocationEmitted = !0),
    { invokingRequestId: agentContext.invokingRequestId, invocationKind: agentContext.invocationKind }
  );
}
//@ chunk-ha3km179.js:75409-75465 sole-consumer
var qr = (e, n, r) => ({ agentId: e, teammateName: n, teamName: r });
/**
 * 找到持有某队友的进程内任务，若其可恢复 agent id 与给定 id 一致，则返回 TeammateIdle 钩子的目标；没有任务持有时记日志。
 */
//@ chunk-ha3km179.js:75465-75797 sole-consumer
function getTeammateIdleTarget(e, n, r) {
  let flattened = Object.values(n.all()).flatMap((S) =>
    S.type === "in_process_teammate" && S.identity.agentId === e.agentId ? [S.identity.resumableAgentId] : [],
  );
  if (flattened.length === 0)
    logForDebugging(`[stopHooks] no task holds teammate ${e.agentId}: its turn ends with no TeammateIdle`);
  return r !== void 0 && flattened.includes(r) ? qr(r, e.agentName, e.teamName) : void 0;
}
//@ chunk-ha3km179.js:75797-75987 sole-consumer
function getTeamContextTarget(e) {
  let n = getDynamicTeamContext(),
    r = n !== null && Boolean(n.agentId) && Boolean(n.teamName),
    s = e?.agentType === "subagent" && e.isMainSession === !0;
  return r ? qr(s ? e.agentId : void 0, n.agentName, n.teamName) : void 0;
}
/**
 * 按代理语境分派：teammate 走一个实现，其余走另一个。
 */
//@ chunk-ha3km179.js:75987-76055 fingerprint = isTeammateAgentContext (1)
function isTeammateAgentContext(agentContext, n, r) {
  return agentContext?.agentType === "teammate"
    ? getTeammateIdleTarget(agentContext, n, r)
    : getTeamContextTarget(agentContext);
}
/**
 * 对象是否含 main 键（或未定义）。
 */
//@ chunk-bxv8ns7f.js:191-250 placement
function hasMainKey(n) {
  return n === void 0 || Object.hasOwn(n, "main");
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
  rP,
  isSubagentContext,
  turnAttributionKeyFor,
  isNonMainSessionSubagent,
  reapsShellsOnExit,
  getForegroundSubagentId,
  ygr,
  getWorkflowSpanAttributes,
  getSubagentTelemetryFields,
  primeRulesForCritique,
  cTi,
  getSubagentLogName,
  consumeInvokingRequestId,
  excludeMainSessionAgentId,
  isTeammateAgentContext,
};

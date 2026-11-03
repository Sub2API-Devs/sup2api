/**
 * services/workflow/runScript.ts
 *
 * 2.1.316 新增：运行工作流脚本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-41w44bgm.js (12)
 * attribution: placement 12
 */
import * as vmModule from "vm";
import * as vmModule_2 from "vm";
import * as vmModule_3 from "vm";
import { truncateMiddle, summarizeError } from "../../memdir/memoryTool.js";
import {
  buildUnreviewedSubagentWarning,
  buildSubagentClassifierUnavailableNote,
} from "../../utils/messages.js";
import {
  UNREVIEWED_REPORT_WARNING,
  flaggedStructuredResultWarning,
} from "../../tools/AgentTool/subagentSpawn.js";
import { isBuiltInAgent } from "../../tools/AgentTool/loadAgentsDir.js";
import { structuredOutputVerdict, Io } from "./journalEntries.js";
import { eP } from "../../bootstrap/stateSlices.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import { createWorkflowAgentRuntime } from "./agentCall.js";
import {
  describeBoundaryValue,
  VM_STRING_BRIDGE_SOURCE,
  wrapHostFnForVm,
  createVmSideCopier,
} from "../../plugins/functionHooks/vm/boundaryCopy.js";
import { createVmConsole, sealSyncGlobalsInVM, Kn } from "./vmGlobals.js";
import { sanitizeAndLogError } from "../../components/Feedback.js";
import { createVmTimers, Jn, defineVmPromiseResolve, sin } from "./scriptSandbox.js";
import { SubAgentContext } from "../../components/CtrlOToExpand.js";
import {
  cfr,
  createVmRealm,
  freeze,
  createVmHostFnWrapper,
  createVmInboundCopier,
  $An,
  FAn,
  createVmErrorDescriber,
  B5e,
} from "../../plugins/functionHooks/vm/vmRealm.js";
import { din, PGe } from "./loadWorkflows.js";
import { loadWorkflowScriptFile, Rr } from "./scriptFile.js";
import { createWorkflowCall } from "./childWorkflows.js";
import { clone, jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-41w44bgm.js:90673-90749 placement = countUnseenAssistantTurns (1)
function countUnseenAssistantTurns(e) {
  return (n) => {
    e(n.type === "progress" ? { ...n, data: truncateProgressStrings(n.data) } : n);
  };
}
//@ chunk-41w44bgm.js:90749-90814 placement
function Oi(e) {
  e.abort(new DOMException("stalled", "AbortError"));
}
//@ chunk-41w44bgm.js:90814-90879 placement
function Zr(e, n) {
  return { ...(e && { label: truncateMiddle(e) }), ...(n && { phase: truncateMiddle(n) }) };
}
//@ chunk-41w44bgm.js:90879-91047 placement
function truncateProgressStrings(e) {
  let n;
  for (let r of Object.keys(e)) {
    let h = Reflect.get(e, r);
    if (typeof h !== "string") continue;
    let T = truncateMiddle(h);
    if (T !== h) ((n ??= { ...e }), Reflect.set(n, r, T));
  }
  return n ?? e;
}
/**
 * 把结构化输出未获判定的原因（refused / unavailable）映射为给模型的警告文案与类型。
 */
//@ chunk-41w44bgm.js:91047-91246 placement
function structuredOutputUnjudgedWarning(e) {
  switch (e.kind) {
    case "refused":
      return {
        warning: e.switchedOff ? buildUnreviewedSubagentWarning("report") : UNREVIEWED_REPORT_WARNING,
        kind: "refused",
      };
    case "unavailable":
      return {
        warning: buildSubagentClassifierUnavailableNote(e.model, e.httpStatus, e.errorKind),
        kind: "unavailable",
      };
  }
}
/**
 * 给 agent 定义的系统提示词追加一段后缀（返回新定义）。
 */
//@ chunk-41w44bgm.js:91246-91378 placement
function withSystemPromptSuffix(e, n) {
  return isBuiltInAgent(e)
    ? { ...e, getSystemPrompt: (r) => e.getSystemPrompt(r) + n }
    : { ...e, getSystemPrompt: (r) => e.getSystemPrompt(r) + n };
}
/**
 * 汇总子代理结构化输出的分类器判定：交付的输出或其他调用被标记时返回拒绝结果；无判定、被 hook 改动、不是最后一步或判定模式变化时返回 undefined；全部通过返回 null。各分支记埋点。
 */
//@ chunk-41w44bgm.js:91378-92280 placement
async function judgeStructuredOutputVerdict({
  calls: calls,
  deliveredId: deliveredId,
  delivered: delivered,
  lastOtherToolCallAt: lastOtherToolCallAt,
  context: context,
}) {
  if (deliveredId === void 0) return;
  let deliveredCall = calls.get(deliveredId),
    deliveredVerdict =
      deliveredCall === void 0 ? void 0 : await structuredOutputVerdict(deliveredCall.response, deliveredId),
    unchangedByHook = deliveredCall !== void 0 && eP(deliveredCall.written, delivered);
  if (deliveredVerdict?.flagged)
    return (
      logFeatureOk("workflow_structured_output_verdict", { flagged: !0 }),
      flaggedStructuredResultWarning(
        deliveredVerdict.reason,
        unchangedByHook ? "flagged" : "flagged_then_changed",
      )
    );
  let missingVerdict = deliveredVerdict === void 0;
  for (let [he, ke] of calls) {
    if (he === deliveredId) continue;
    let te = await structuredOutputVerdict(ke.response, he);
    if (te?.flagged)
      return (
        logFeatureOk("workflow_structured_output_verdict", { flagged: !0 }),
        flaggedStructuredResultWarning(te.reason, "another")
      );
    missingVerdict ||= te === void 0;
  }
  if (missingVerdict) {
    logFeatureSad("workflow_structured_output_verdict", "no_verdict");
    return;
  }
  if (!unchangedByHook) {
    logFeatureSad("workflow_structured_output_verdict", "changed_by_hook");
    return;
  }
  if ((deliveredCall?.responseNumber ?? 0) <= lastOtherToolCallAt) {
    logFeatureSad("workflow_structured_output_verdict", "not_last_step");
    return;
  }
  if (!Io(getToolPermissionContext(context).mode)) {
    logFeatureSad("workflow_structured_output_verdict", "judge_changed");
    return;
  }
  return (logFeatureOk("workflow_structured_output_verdict", { flagged: !1 }), null);
}
//@ chunk-41w44bgm.js:92280-92309 placement
var TENGU_ZESTY_FEATHER = "tengu_zesty_feather";
//@ chunk-41w44bgm.js:92309-92347 placement
function ls() {
  return readFlagWithOverride(TENGU_ZESTY_FEATHER, { safe: !0 });
}
/**
 * 为工作流脚本建立 VM 上下文：创建代理运行时（agent/parallel/pipeline/workflow 钩子）、console/log/phase/budget、确定性定时器、VM 字符串桥与 Promise 设施，注入 args，
 * 返回 {vmContext, hooks, ...}。
 */
//@ chunk-41w44bgm.js:92347-94269 placement
function createWorkflowVmContext(context, canUseTool, onProgress, h, T, y, A, L, j, he, ke, te, me, We, G) {
  let emitProgress = countUnseenAssistantTurns(onProgress),
    runtime = createWorkflowAgentRuntime(
      context,
      canUseTool,
      emitProgress,
      h,
      T,
      A,
      L,
      j,
      he,
      ke,
      te,
      me,
      We,
      G,
    ),
    s = {
      sanitize: ($e) => ($e === null || (typeof $e !== "object" && typeof $e !== "function") ? $e : {}),
      toStr: ($e) => describeBoundaryValue($e),
    },
    S = createVmConsole(
      ($e) =>
        emitProgress({
          type: "progress",
          toolUseID: "workflow_log",
          data: { type: "workflow_log", message: $e },
        }),
      s,
    ),
    freeze_2 = Object.freeze({
      __proto__: null,
      total: L?.total ?? null,
      spent: sanitizeAndLogError(() => L?.getTurnSpent() ?? 0),
      remaining: sanitizeAndLogError(() =>
        L?.total == null ? 1 / 0 : Math.max(0, L.total - L.getTurnSpent()),
      ),
    }),
    P = context.abortController?.signal,
    timers = createVmTimers(P),
    vmContext = SubAgentContext(
      {
        __proto__: null,
        log: sanitizeAndLogError(runtime.log),
        phase: sanitizeAndLogError(runtime.phase),
        console: S,
        budget: freeze_2,
        setTimeout: timers.setTimeout,
        clearTimeout: timers.clearTimeout,
      },
      { codeGeneration: { strings: !1, wasm: !1 } },
    );
  (Jn(vmContext), cfr(vmContext), createVmRealm(vmContext, freeze), defineVmPromiseResolve(vmContext));
  let se = ls(),
    q = se ? createVmHostFnWrapper(vmContext) : ($e) => $e;
  if (se) sealSyncGlobalsInVM(vmContext, q);
  let {
    vmToStr: vmToStr,
    vmStringify: vmStringify,
    vmOwnString: vmOwnString,
  } = VM_STRING_BRIDGE_SOURCE(vmContext);
  timers.bindVMInvoke(vmModule_2.runInContext("(fn => { fn() })", vmContext));
  let ut = createVmInboundCopier(vmContext),
    Tt = $An(vmContext),
    Wt = FAn(vmContext),
    ye = {},
    gt = {
      hooks: runtime,
      budget: freeze_2,
      abortSignal: P,
      timers: timers,
      resolveWorkflow: ($e, Se) => din($e, Se, context.storageV5),
      getAllWorkflows: ($e) => PGe($e, context.storageV5),
      intakeClone: ut,
      sealSyncHooksInVM: se,
      loadScriptPath: ($e) => loadWorkflowScriptFile($e, Rr(context)),
      childSpawnMemo: () => ye.get?.(),
    },
    Ut = createWorkflowCall(gt),
    $t = Kn(vmContext),
    jt = ($e, Se) => runtime.agent($e, Se);
  for (let [$e, Se] of [
    ["agent", jt],
    ["parallel", runtime.parallel],
    ["pipeline", runtime.pipeline],
    ["workflow", Ut],
  ])
    Object.defineProperty(vmContext, $e, {
      value: $t(wrapHostFnForVm(Se)),
      writable: !0,
      enumerable: !0,
      configurable: !0,
    });
  {
    let $e = y === void 0 ? void 0 : JSON.stringify(y);
    Object.defineProperty(vmContext, "args", {
      value: $e === void 0 ? void 0 : vmModule_2.runInContext(`JSON.parse(${JSON.stringify($e)})`, vmContext),
      writable: !0,
      enumerable: !0,
      configurable: !0,
    });
  }
  let kt = createVmSideCopier(vmContext, freeze);
  return (
    (s.sanitize = kt.sanitize),
    (s.toStr = vmToStr),
    runtime.bindVMAwait({
      settle: Tt,
      call: Wt,
      clone: ut,
      sanitize: kt.sanitize,
      snapshot: kt.snapshot,
      getProp: kt.getProp,
    }),
    {
      vmContext: vmContext,
      hooks: runtime,
      vmToStr: vmToStr,
      vmOwnString: vmOwnString,
      vmStringify: vmStringify,
      timers: timers,
      childSpawnMemoRef: ye,
      vmBoundary: { clone: ut, call: Wt, settle: Tt, sanitize: kt.sanitize, asyncWrap: $t, syncWrap: q },
      childWorkflow: gt,
    }
  );
}
//@ chunk-41w44bgm.js:94269-94281 placement
var Wi = 1000;
/**
 * 在 VM 中运行已编译的工作流脚本：可选加载日志 journal，执行并等待结果（可被中断），清洗/克隆结果；
 * 返回 {result, agentCount, logs, failures, toolsUsed, usageLimitDenial, durationMs}，出错时 result 为 null 并带错误信息。
 */
//@ chunk-41w44bgm.js:94281-96077 placement
async function runWorkflowScript(compiledScript, context, canUseTool, options = {}) {
  let now = Date.now(),
    logs = [],
    A = (me) => {
      if (me.type === "progress" && me.data.type === "workflow_log" && logs.length < Wi)
        logs.push(me.data.message);
      options.onProgress?.(me);
    },
    L = options.journal ? await options.journal.load() : void 0,
    vm = createWorkflowVmContext(
      context,
      canUseTool,
      A,
      options.workflowRunId,
      options.onAgentController,
      options.args,
      options.seedPhaseTitles,
      options.tokenBudget,
      options.journal,
      L,
      options.workflowName,
      options.invokingRequestId,
      options.parentPromptId,
      options.onRateLimitWait,
      options.withholdScript,
    ),
    he = createVmErrorDescriber(vm.vmContext),
    ke = context.abortController?.signal,
    te;
  try {
    let runInContext = compiledScript.runInContext(vm.vmContext, B5e(sin, options.syncTimeoutMs)),
      We = $An(vm.vmContext)(runInContext);
    We.catch(() => {});
    let ce = (
      ke
        ? await Promise.race([
            We,
            new Promise((w, P) => {
              let V = () => P(Error("Workflow aborted"));
              if (ke.aborted) V();
              else (ke.addEventListener("abort", V), (te = () => ke.removeEventListener("abort", V)));
            }),
          ])
        : await We
    ).v;
    if (typeof ce === "function") throw Error("workflow result cannot be a function");
    let E = ce !== null && typeof ce === "object" ? vm.hooks.sanitizeVMValue(ce) : ce,
      s;
    try {
      s = clone(E);
    } catch (error) {
      if (E === null || typeof E !== "object") throw error;
      s = JSON.parse(jsonStringify(E, (P, V) => (typeof V === "function" ? void 0 : V)) ?? "null");
    }
    jsonStringify(s);
    let toolsUsed = vm.hooks.getToolsUsed();
    return {
      result: s,
      agentCount: vm.hooks.getAgentCount(),
      logs: logs,
      failures: vm.hooks.getFailures(),
      ...(vm.hooks.getForeignArtifactContent() && { foreignArtifactContent: !0 }),
      ...(toolsUsed.length > 0 && { toolsUsed: toolsUsed }),
      usageLimitDenial: vm.hooks.takeUsageLimitDenial(),
      durationMs: Date.now() - now,
    };
  } catch (error) {
    let { name: We, message: message, stack: stack } = he(error);
    if (stack)
      logForDebugging(
        `Workflow script error stack trace:
${stack}`,
        { level: "error" },
      );
    let toolsUsed = vm.hooks.getToolsUsed();
    return {
      result: null,
      agentCount: vm.hooks.getAgentCount(),
      logs: logs,
      failures: vm.hooks.getFailures(),
      ...(vm.hooks.getForeignArtifactContent() && { foreignArtifactContent: !0 }),
      ...(toolsUsed.length > 0 && { toolsUsed: toolsUsed }),
      usageLimitDenial: vm.hooks.takeUsageLimitDenial(),
      durationMs: Date.now() - now,
      error: summarizeError({ name: We, message: message, stack: stack }),
    };
  } finally {
    te?.();
  }
}

export {
  Zr,
  withSystemPromptSuffix,
  Oi,
  structuredOutputUnjudgedWarning,
  judgeStructuredOutputVerdict,
  runWorkflowScript,
  createWorkflowVmContext,
};

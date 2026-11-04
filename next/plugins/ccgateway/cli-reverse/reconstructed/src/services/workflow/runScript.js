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
import "vm";
import * as vmModule_2 from "vm";
import "vm";
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
import { structuredOutputVerdict, isArbiterStructuredOutputReviewOn } from "./journalEntries.js";
import { deepEqualIgnoringUndefined } from "../../bootstrap/stateSlices.js";
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
import { createVmConsole, sealSyncGlobalsInVM, wrapVmGlobal } from "./vmGlobals.js";
import { sanitizeAndLogError } from "../../components/Feedback.js";
import {
  createVmTimers,
  installDeterminismShim,
  defineVmPromiseResolve,
  VM_ABORT_TIMEOUT_MS,
} from "./scriptSandbox.js";
import { SubAgentContext } from "../../components/CtrlOToExpand.js";
import {
  removeCaptureStackTrace,
  createVmRealm,
  NO_IMPORT_OPTIONS,
  createVmHostFnWrapper,
  createVmInboundCopier,
  awaitAsNullProto,
  callWithArgs,
  createVmErrorDescriber,
  timeoutOption,
} from "../../plugins/functionHooks/vm/vmRealm.js";
import { findWorkflowByName, allWorkflowsForHost } from "./loadWorkflows.js";
import { loadWorkflowScriptFile, workflowToolContext } from "./scriptFile.js";
import { createWorkflowCall } from "./childWorkflows.js";
import { clone, jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { runDeferredInits } from "../../../runtime/deferred-init.js";

//@ chunk-41w44bgm.js:90673-90749 placement = countUnseenAssistantTurns (1)
function countUnseenAssistantTurns(onProgress) {
  return (event) => {
    onProgress(
      event.type === "progress"
        ? {
            ...event,
            data: truncateProgressStrings(event.data),
          }
        : event,
    );
  };
}
//@ chunk-41w44bgm.js:90749-90814 placement
/**
 * 以 AbortError 中止卡住的执行。
 */
function abortStalled(controller) {
  controller.abort(new DOMException("stalled", "AbortError"));
}
//@ chunk-41w44bgm.js:90814-90879 placement
/**
 * 截断进度里的 label 与 phase。
 */
function truncateProgressFields(label, phase) {
  return {
    ...(label && {
      label: truncateMiddle(label),
    }),
    ...(phase && {
      phase: truncateMiddle(phase),
    }),
  };
}
//@ chunk-41w44bgm.js:90879-91047 placement
function truncateProgressStrings(data) {
  let copy;
  for (let key of Object.keys(data)) {
    let value = Reflect.get(data, key);
    if (typeof value !== "string") continue;
    let truncated = truncateMiddle(value);
    if (truncated !== value) {
      copy ??= {
        ...data,
      };
      Reflect.set(copy, key, truncated);
    }
  }
  return copy ?? data;
}
//@ chunk-41w44bgm.js:91047-91246 placement
/**
 * 把结构化输出未获判定的原因（refused / unavailable）映射为给模型的警告文案与类型。
 */
function structuredOutputUnjudgedWarning(noVerdict) {
  switch (noVerdict.kind) {
    case "refused":
      return {
        warning: noVerdict.switchedOff ? buildUnreviewedSubagentWarning("report") : UNREVIEWED_REPORT_WARNING,
        kind: "refused",
      };
    case "unavailable":
      return {
        warning: buildSubagentClassifierUnavailableNote(
          noVerdict.model,
          noVerdict.httpStatus,
          noVerdict.errorKind,
        ),
        kind: "unavailable",
      };
  }
}
//@ chunk-41w44bgm.js:91246-91378 placement
/**
 * 给 agent 定义的系统提示词追加一段后缀（返回新定义）。
 */
function withSystemPromptSuffix(agent, suffix) {
  return isBuiltInAgent(agent)
    ? {
        ...agent,
        getSystemPrompt: (context) => agent.getSystemPrompt(context) + suffix,
      }
    : {
        ...agent,
        getSystemPrompt: (context) => agent.getSystemPrompt(context) + suffix,
      };
}
//@ chunk-41w44bgm.js:91378-92280 placement
/**
 * 汇总子代理结构化输出的分类器判定：交付的输出或其他调用被标记时返回拒绝结果；无判定、被 hook 改动、不是最后一步或判定模式变化时返回 undefined；全部通过返回 null。各分支记埋点。
 */
async function judgeStructuredOutputVerdict({ calls, deliveredId, delivered, lastOtherToolCallAt, context }) {
  if (deliveredId === undefined) return;
  let deliveredCall = calls.get(deliveredId);
  let deliveredVerdict =
    deliveredCall === undefined
      ? undefined
      : await structuredOutputVerdict(deliveredCall.response, deliveredId);
  let unchangedByHook =
    deliveredCall !== undefined && deepEqualIgnoringUndefined(deliveredCall.written, delivered);
  if (deliveredVerdict?.flagged) {
    logFeatureOk("workflow_structured_output_verdict", {
      flagged: true,
    });
    return flaggedStructuredResultWarning(
      deliveredVerdict.reason,
      unchangedByHook ? "flagged" : "flagged_then_changed",
    );
  }
  let missingVerdict = deliveredVerdict === undefined;
  for (let [callId, call] of calls) {
    if (callId === deliveredId) continue;
    let verdict = await structuredOutputVerdict(call.response, callId);
    if (verdict?.flagged) {
      logFeatureOk("workflow_structured_output_verdict", {
        flagged: true,
      });
      return flaggedStructuredResultWarning(verdict.reason, "another");
    }
    missingVerdict ||= verdict === undefined;
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
  if (!isArbiterStructuredOutputReviewOn(getToolPermissionContext(context).mode)) {
    logFeatureSad("workflow_structured_output_verdict", "judge_changed");
    return;
  }
  logFeatureOk("workflow_structured_output_verdict", {
    flagged: false,
  });
  return null;
}
//@ chunk-41w44bgm.js:92280-92309 placement
var TENGU_ZESTY_FEATHER = "tengu_zesty_feather";
//@ chunk-41w44bgm.js:92309-92347 placement
/**
 * 读开关 tengu_zesty_feather。
 */
function isZestyFeatherOn() {
  return readFlagWithOverride(TENGU_ZESTY_FEATHER, {
    safe: true,
  });
}
//@ chunk-41w44bgm.js:92347-94269 placement
/**
 * 为工作流脚本建立 VM 上下文：创建代理运行时（agent/parallel/pipeline/workflow 钩子）、console/log/phase/budget、确定性定时器、VM 字符串桥与 Promise 设施，注入 args，
 * 返回 {vmContext, hooks, ...}。
 */
function createWorkflowVmContext(
  context,
  canUseTool,
  onProgress,
  workflowRunId,
  onAgentController,
  args,
  initialPhases,
  budget,
  journal,
  journalIndex,
  workflowName,
  invokingRequestId,
  parentPromptId,
  onRateLimitWait,
  numberedLabels,
) {
  let emitProgress = countUnseenAssistantTurns(onProgress);
  let runtime = createWorkflowAgentRuntime(
    context,
    canUseTool,
    emitProgress,
    workflowRunId,
    onAgentController,
    initialPhases,
    budget,
    journal,
    journalIndex,
    workflowName,
    invokingRequestId,
    parentPromptId,
    onRateLimitWait,
    numberedLabels,
  );
  let bridges = {
    sanitize: (value) =>
      value === null || (typeof value !== "object" && typeof value !== "function") ? value : {},
    toStr: (value) => describeBoundaryValue(value),
  };
  let vmConsole = createVmConsole(
    (message) =>
      emitProgress({
        type: "progress",
        toolUseID: "workflow_log",
        data: {
          type: "workflow_log",
          message,
        },
      }),
    bridges,
  );
  let budget_2 = Object.freeze({
    __proto__: null,
    total: budget?.total ?? null,
    spent: sanitizeAndLogError(() => budget?.getTurnSpent() ?? 0),
    remaining: sanitizeAndLogError(() =>
      budget?.total == null ? 1 / 0 : Math.max(0, budget.total - budget.getTurnSpent()),
    ),
  });
  let signal = context.abortController?.signal;
  let timers = createVmTimers(signal);
  let vmContext = SubAgentContext(
    {
      __proto__: null,
      log: sanitizeAndLogError(runtime.log),
      phase: sanitizeAndLogError(runtime.phase),
      console: vmConsole,
      budget: budget_2,
      setTimeout: timers.setTimeout,
      clearTimeout: timers.clearTimeout,
    },
    {
      codeGeneration: {
        strings: false,
        wasm: false,
      },
    },
  );
  installDeterminismShim(vmContext);
  removeCaptureStackTrace(vmContext);
  createVmRealm(vmContext, NO_IMPORT_OPTIONS);
  defineVmPromiseResolve(vmContext);
  let sealHooks = isZestyFeatherOn();
  let wrapCallable = sealHooks ? createVmHostFnWrapper(vmContext) : (fn) => fn;
  if (sealHooks) sealSyncGlobalsInVM(vmContext, wrapCallable);
  let { vmToStr, vmStringify, vmOwnString } = VM_STRING_BRIDGE_SOURCE(vmContext);
  timers.bindVMInvoke(vmModule_2.runInContext("(fn => { fn() })", vmContext));
  let vmInboundCopier = createVmInboundCopier(vmContext);
  let settle = awaitAsNullProto(vmContext);
  let call = callWithArgs(vmContext);
  let childSpawnMemoRef = {};
  let childHooks = {
    hooks: runtime,
    budget: budget_2,
    abortSignal: signal,
    timers,
    resolveWorkflow: (name, cwd) => findWorkflowByName(name, cwd, context.storageV5),
    getAllWorkflows: (cwd) => allWorkflowsForHost(cwd, context.storageV5),
    intakeClone: vmInboundCopier,
    sealSyncHooksInVM: sealHooks,
    loadScriptPath: (scriptPath) => loadWorkflowScriptFile(scriptPath, workflowToolContext(context)),
    childSpawnMemo: () => childSpawnMemoRef.get?.(),
  };
  let workflowCall = createWorkflowCall(childHooks);
  let asyncWrap = wrapVmGlobal(vmContext);
  let agentFn = (prompt, options) => runtime.agent(prompt, options);
  for (let [hookName, hookFn] of [
    ["agent", agentFn],
    ["parallel", runtime.parallel],
    ["pipeline", runtime.pipeline],
    ["workflow", workflowCall],
  ])
    Object.defineProperty(vmContext, hookName, {
      value: asyncWrap(wrapHostFnForVm(hookFn)),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  {
    let argsJson = args === undefined ? undefined : JSON.stringify(args);
    Object.defineProperty(vmContext, "args", {
      value:
        argsJson === undefined
          ? undefined
          : vmModule_2.runInContext(`JSON.parse(${JSON.stringify(argsJson)})`, vmContext),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  let vmSideCopier = createVmSideCopier(vmContext, NO_IMPORT_OPTIONS);
  bridges.sanitize = vmSideCopier.sanitize;
  bridges.toStr = vmToStr;
  runtime.bindVMAwait({
    settle,
    call,
    clone: vmInboundCopier,
    sanitize: vmSideCopier.sanitize,
    snapshot: vmSideCopier.snapshot,
    getProp: vmSideCopier.getProp,
  });
  return {
    vmContext,
    hooks: runtime,
    vmToStr,
    vmOwnString,
    vmStringify,
    timers,
    childSpawnMemoRef,
    vmBoundary: {
      clone: vmInboundCopier,
      call,
      settle,
      sanitize: vmSideCopier.sanitize,
      asyncWrap,
      syncWrap: wrapCallable,
    },
    childWorkflow: childHooks,
  };
}
//@ chunk-41w44bgm.js:94269-94281 placement
var PROGRESS_TICK_MS = 1000;
//@ chunk-41w44bgm.js:94281-96077 placement
/**
 * 在 VM 中运行已编译的工作流脚本：可选加载日志 journal，执行并等待结果（可被中断），清洗/克隆结果；
 * 返回 {result, agentCount, logs, failures, toolsUsed, usageLimitDenial, durationMs}，出错时 result 为 null 并带错误信息。
 */
async function runWorkflowScript(compiledScript, context, canUseTool, options = {}) {
  let now = Date.now();
  let logs = [];
  let onProgress = (event) => {
    if (event.type === "progress" && event.data.type === "workflow_log" && logs.length < PROGRESS_TICK_MS)
      logs.push(event.data.message);
    options.onProgress?.(event);
  };
  let journalIndex = options.journal ? await options.journal.load() : undefined;
  let vm = createWorkflowVmContext(
    context,
    canUseTool,
    onProgress,
    options.workflowRunId,
    options.onAgentController,
    options.args,
    options.seedPhaseTitles,
    options.tokenBudget,
    options.journal,
    journalIndex,
    options.workflowName,
    options.invokingRequestId,
    options.parentPromptId,
    options.onRateLimitWait,
    options.withholdScript,
  );
  let vmErrorDescriber = createVmErrorDescriber(vm.vmContext);
  let signal = context.abortController?.signal;
  let removeAbortListener;
  try {
    let rawResult = compiledScript.runInContext(
      vm.vmContext,
      timeoutOption(VM_ABORT_TIMEOUT_MS, options.syncTimeoutMs),
    );
    let settled = awaitAsNullProto(vm.vmContext)(rawResult);
    settled.catch(() => {});
    let resultValue = (
      signal
        ? await Promise.race([
            settled,
            new Promise((resolve, reject) => {
              let onAbort = () => reject(Error("Workflow aborted"));
              if (signal.aborted) onAbort();
              else {
                signal.addEventListener("abort", onAbort);
                removeAbortListener = () => signal.removeEventListener("abort", onAbort);
              }
            }),
          ])
        : await settled
    ).v;
    if (typeof resultValue === "function") throw Error("workflow result cannot be a function");
    let sanitized =
      resultValue !== null && typeof resultValue === "object"
        ? vm.hooks.sanitizeVMValue(resultValue)
        : resultValue;
    let cloned;
    try {
      cloned = clone(sanitized);
    } catch (error) {
      if (sanitized === null || typeof sanitized !== "object") throw error;
      cloned = JSON.parse(
        jsonStringify(sanitized, (key, value) => (typeof value === "function" ? undefined : value)) ?? "null",
      );
    }
    jsonStringify(cloned);
    let toolsUsed = vm.hooks.getToolsUsed();
    return {
      result: cloned,
      agentCount: vm.hooks.getAgentCount(),
      logs,
      failures: vm.hooks.getFailures(),
      ...(vm.hooks.getForeignArtifactContent() && {
        foreignArtifactContent: true,
      }),
      ...(toolsUsed.length > 0 && {
        toolsUsed,
      }),
      usageLimitDenial: vm.hooks.takeUsageLimitDenial(),
      durationMs: Date.now() - now,
    };
  } catch (error) {
    let { name: errorName, message, stack } = vmErrorDescriber(error);
    if (stack)
      logForDebugging(
        `Workflow script error stack trace:
${stack}`,
        {
          level: "error",
        },
      );
    let toolsUsed = vm.hooks.getToolsUsed();
    return {
      result: null,
      agentCount: vm.hooks.getAgentCount(),
      logs,
      failures: vm.hooks.getFailures(),
      ...(vm.hooks.getForeignArtifactContent() && {
        foreignArtifactContent: true,
      }),
      ...(toolsUsed.length > 0 && {
        toolsUsed,
      }),
      usageLimitDenial: vm.hooks.takeUsageLimitDenial(),
      durationMs: Date.now() - now,
      error: summarizeError({
        name: errorName,
        message,
        stack,
      }),
    };
  } finally {
    removeAbortListener?.();
  }
}

// The import cycle this module closes (2 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/services/workflow/runScript.js");
export {
  truncateProgressFields,
  withSystemPromptSuffix,
  abortStalled,
  structuredOutputUnjudgedWarning,
  judgeStructuredOutputVerdict,
  runWorkflowScript,
  createWorkflowVmContext,
};

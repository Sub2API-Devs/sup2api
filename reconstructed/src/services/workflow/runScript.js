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
  vUe,
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

//@ chunk-41w44bgm.js:90673-90749 placement = countUnseenAssistantTurns (1)
function countUnseenAssistantTurns(onProgress) {
  return (n) => {
    onProgress(
      n.type === "progress"
        ? {
            ...n,
            data: truncateProgressStrings(n.data),
          }
        : n,
    );
  };
}
//@ chunk-41w44bgm.js:90749-90814 placement
/**
 * 以 AbortError 中止卡住的执行。
 */
function abortStalled(e) {
  e.abort(new DOMException("stalled", "AbortError"));
}
//@ chunk-41w44bgm.js:90814-90879 placement
/**
 * 截断进度里的 label 与 phase。
 */
function truncateProgressFields(e, n) {
  return {
    ...(e && {
      label: truncateMiddle(e),
    }),
    ...(n && {
      phase: truncateMiddle(n),
    }),
  };
}
//@ chunk-41w44bgm.js:90879-91047 placement
function truncateProgressStrings(e) {
  let n;
  for (let key of Object.keys(e)) {
    let h = Reflect.get(e, key);
    if (typeof h !== "string") continue;
    let T = truncateMiddle(h);
    if (T !== h) {
      n ??= {
        ...e,
      };
      Reflect.set(n, key, T);
    }
  }
  return n ?? e;
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
function withSystemPromptSuffix(e, n) {
  return isBuiltInAgent(e)
    ? {
        ...e,
        getSystemPrompt: (r) => e.getSystemPrompt(r) + n,
      }
    : {
        ...e,
        getSystemPrompt: (r) => e.getSystemPrompt(r) + n,
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
  for (let [he, ke] of calls) {
    if (he === deliveredId) continue;
    let te = await structuredOutputVerdict(ke.response, he);
    if (te?.flagged) {
      logFeatureOk("workflow_structured_output_verdict", {
        flagged: true,
      });
      return flaggedStructuredResultWarning(te.reason, "another");
    }
    missingVerdict ||= te === undefined;
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
  h,
  T,
  y,
  seedPhaseTitles,
  tokenBudget,
  journal,
  he,
  workflowName,
  invokingRequestId,
  parentPromptId,
  We,
  withholdScript,
) {
  let emitProgress = countUnseenAssistantTurns(onProgress);
  let runtime = createWorkflowAgentRuntime(
    context,
    canUseTool,
    emitProgress,
    h,
    T,
    seedPhaseTitles,
    tokenBudget,
    journal,
    he,
    workflowName,
    invokingRequestId,
    parentPromptId,
    We,
    withholdScript,
  );
  let s = {
    sanitize: ($e) => ($e === null || (typeof $e !== "object" && typeof $e !== "function") ? $e : {}),
    toStr: ($e) => describeBoundaryValue($e),
  };
  let S = createVmConsole(
    (message) =>
      emitProgress({
        type: "progress",
        toolUseID: "workflow_log",
        data: {
          type: "workflow_log",
          message,
        },
      }),
    s,
  );
  let budget = Object.freeze({
    __proto__: null,
    total: tokenBudget?.total ?? null,
    spent: sanitizeAndLogError(() => tokenBudget?.getTurnSpent() ?? 0),
    remaining: sanitizeAndLogError(() =>
      tokenBudget?.total == null ? 1 / 0 : Math.max(0, tokenBudget.total - tokenBudget.getTurnSpent()),
    ),
  });
  let signal = context.abortController?.signal;
  let timers = createVmTimers(signal);
  let vmContext = SubAgentContext(
    {
      __proto__: null,
      log: sanitizeAndLogError(runtime.log),
      phase: sanitizeAndLogError(runtime.phase),
      console: S,
      budget,
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
  createVmRealm(vmContext, vUe);
  defineVmPromiseResolve(vmContext);
  let se = isZestyFeatherOn();
  let wrapCallable = se ? createVmHostFnWrapper(vmContext) : ($e) => $e;
  if (se) sealSyncGlobalsInVM(vmContext, wrapCallable);
  let { vmToStr, vmStringify, vmOwnString } = VM_STRING_BRIDGE_SOURCE(vmContext);
  timers.bindVMInvoke(vmModule_2.runInContext("(fn => { fn() })", vmContext));
  let vmInboundCopier = createVmInboundCopier(vmContext);
  let settle = awaitAsNullProto(vmContext);
  let call = callWithArgs(vmContext);
  let ye = {};
  let gt = {
    hooks: runtime,
    budget,
    abortSignal: signal,
    timers,
    resolveWorkflow: ($e, Se) => findWorkflowByName($e, Se, context.storageV5),
    getAllWorkflows: ($e) => allWorkflowsForHost($e, context.storageV5),
    intakeClone: vmInboundCopier,
    sealSyncHooksInVM: se,
    loadScriptPath: (scriptPath) => loadWorkflowScriptFile(scriptPath, workflowToolContext(context)),
    childSpawnMemo: () => ye.get?.(),
  };
  let workflowCall = createWorkflowCall(gt);
  let $t = wrapVmGlobal(vmContext);
  let jt = ($e, Se) => runtime.agent($e, Se);
  for (let [$e, Se] of [
    ["agent", jt],
    ["parallel", runtime.parallel],
    ["pipeline", runtime.pipeline],
    ["workflow", workflowCall],
  ])
    Object.defineProperty(vmContext, $e, {
      value: $t(wrapHostFnForVm(Se)),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  {
    let $e = y === undefined ? undefined : JSON.stringify(y);
    Object.defineProperty(vmContext, "args", {
      value:
        $e === undefined
          ? undefined
          : vmModule_2.runInContext(`JSON.parse(${JSON.stringify($e)})`, vmContext),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  let vmSideCopier = createVmSideCopier(vmContext, vUe);
  s.sanitize = vmSideCopier.sanitize;
  s.toStr = vmToStr;
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
    childSpawnMemoRef: ye,
    vmBoundary: {
      clone: vmInboundCopier,
      call,
      settle,
      sanitize: vmSideCopier.sanitize,
      asyncWrap: $t,
      syncWrap: wrapCallable,
    },
    childWorkflow: gt,
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
  let onProgress = (me) => {
    if (me.type === "progress" && me.data.type === "workflow_log" && logs.length < PROGRESS_TICK_MS)
      logs.push(me.data.message);
    options.onProgress?.(me);
  };
  let L = options.journal ? await options.journal.load() : undefined;
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
    L,
    options.workflowName,
    options.invokingRequestId,
    options.parentPromptId,
    options.onRateLimitWait,
    options.withholdScript,
  );
  let vmErrorDescriber = createVmErrorDescriber(vm.vmContext);
  let signal = context.abortController?.signal;
  let te;
  try {
    let me = compiledScript.runInContext(
      vm.vmContext,
      timeoutOption(VM_ABORT_TIMEOUT_MS, options.syncTimeoutMs),
    );
    let We = awaitAsNullProto(vm.vmContext)(me);
    We.catch(() => {});
    let ce = (
      signal
        ? await Promise.race([
            We,
            new Promise((resolve, reject) => {
              let V = () => reject(Error("Workflow aborted"));
              if (signal.aborted) V();
              else {
                signal.addEventListener("abort", V);
                te = () => signal.removeEventListener("abort", V);
              }
            }),
          ])
        : await We
    ).v;
    if (typeof ce === "function") throw Error("workflow result cannot be a function");
    let E = ce !== null && typeof ce === "object" ? vm.hooks.sanitizeVMValue(ce) : ce;
    let s;
    try {
      s = clone(E);
    } catch (error) {
      if (E === null || typeof E !== "object") throw error;
      s = JSON.parse(jsonStringify(E, (P, V) => (typeof V === "function" ? undefined : V)) ?? "null");
    }
    jsonStringify(s);
    let toolsUsed = vm.hooks.getToolsUsed();
    return {
      result: s,
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
    let { name: We, message, stack } = vmErrorDescriber(error);
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
        name: We,
        message,
        stack,
      }),
    };
  } finally {
    te?.();
  }
}
export {
  truncateProgressFields,
  withSystemPromptSuffix,
  abortStalled,
  structuredOutputUnjudgedWarning,
  judgeStructuredOutputVerdict,
  runWorkflowScript,
  createWorkflowVmContext,
};

/**
 * services/workflow/childWorkflows.ts
 *
 * 2.1.316 新增：子工作流
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-41w44bgm.js (5)
 * attribution: placement 5
 */
import "vm";
import * as vmModule_2 from "vm";
import "vm";
import { getCwd } from "../../utils/cwd.js";
import { parseWorkflowScript } from "../workflows/workflowScriptMeta.js";
import { workflowNameOnlyEnv } from "./loadWorkflows.js";
import {
  describeBoundaryValue,
  createVmSideCopier,
  VM_STRING_BRIDGE_SOURCE,
  wrapHostFnForVm,
} from "../../plugins/functionHooks/vm/boundaryCopy.js";
import { sanitizeAndLogError } from "../../components/Feedback.js";
import { createVmConsole, sealSyncGlobalsInVM, wrapVmGlobal } from "./vmGlobals.js";
import { SubAgentContext } from "../../components/CtrlOToExpand.js";
import {
  installDeterminismShim,
  defineVmPromiseResolve,
  sealPrototype,
  compileWorkflowScript,
  VM_ABORT_TIMEOUT_MS,
} from "./scriptSandbox.js";
import {
  removeCaptureStackTrace,
  createVmRealm,
  NO_IMPORT_OPTIONS,
  createVmHostFnWrapper,
  createVmErrorDescriber,
  awaitAsNullProto,
  createVmInboundCopier,
  callWithArgs,
  timeoutOption,
  createSealedError,
} from "../../plugins/functionHooks/vm/vmRealm.js";
import { SMALL_TRIANGLE_RIGHT } from "../../constants/figures.js";
import { summarizeError, truncateMiddle } from "../../memdir/memoryTool.js";

//@ chunk-41w44bgm.js:24305-25367 placement
/**
 * 解析 workflow() 的参数：名称则查找已注册的工作流并解析脚本，{scriptPath} 则加载脚本文件（CLAUDE_WORKFLOW_NAME_ONLY 时禁止）；返回 {childName, scriptBody, scriptPath?}。
 */
async function resolveChildWorkflow(runtime, target) {
  let resolved = runtime.intakeClone(target);
  if (typeof resolved === "string") {
    let workflow = await runtime.resolveWorkflow(resolved, getCwd());
    if (!workflow) {
      let joined = (await runtime.getAllWorkflows(getCwd())).map((workflow) => workflow.name).join(", ");
      throw Error(`workflow('${resolved}'): no workflow with that name. Available: ${joined || "(none)"}`);
    }
    let workflowScript = parseWorkflowScript(workflow.script);
    if ("error" in workflowScript) throw Error(`workflow('${resolved}'): ${workflowScript.error}`);
    return {
      childName: workflow.name,
      scriptBody: workflowScript.scriptBody,
    };
  }
  if (
    resolved &&
    typeof resolved === "object" &&
    "scriptPath" in resolved &&
    typeof resolved.scriptPath === "string"
  ) {
    if (workflowNameOnlyEnv())
      throw Error(
        "workflow({scriptPath}): this session restricts workflows to " +
          "named bundled workflows (CLAUDE_WORKFLOW_NAME_ONLY is set) \u2014 " +
          "nest with workflow('<name>') instead.",
      );
    let scriptPath = await runtime.loadScriptPath(resolved.scriptPath);
    if ("error" in scriptPath)
      throw Error(`workflow({scriptPath: '${resolved.scriptPath}'}): ${scriptPath.error}`);
    let workflowScript = parseWorkflowScript(scriptPath.script);
    if ("error" in workflowScript)
      throw Error(`workflow({scriptPath: '${resolved.scriptPath}'}): ${workflowScript.error}`);
    return {
      childName: workflowScript.meta.name,
      scriptBody: workflowScript.scriptBody,
      scriptPath: resolved.scriptPath,
    };
  }
  throw TypeError("workflow() expects a workflow name (string) or {scriptPath: string}");
}
//@ chunk-41w44bgm.js:25367-26530 placement
/**
 * 为子工作流建立独立 VM 上下文：带名称前缀的 log/console、共享预算与定时器、字符串桥与克隆/调用辅助；agent 调用会缓存并恢复 schema 对象。
 */
function createChildVmContext(parent, childName, phase, timers = parent.timers) {
  let logPrefix = `[${childName}] `;
  let bridges = {
    sanitize: (value) =>
      value === null || (typeof value !== "object" && typeof value !== "function") ? value : {},
    toStr: (value) => describeBoundaryValue(value),
  };
  let globals = {
    __proto__: null,
    budget: parent.budget,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    phase: sanitizeAndLogError((value) => {}),
    log: sanitizeAndLogError((value) => parent.hooks.log(logPrefix + describeBoundaryValue(value))),
    console: createVmConsole((text) => parent.hooks.log(logPrefix + text), bridges),
  };
  let context = SubAgentContext(globals, {
    codeGeneration: {
      strings: false,
      wasm: false,
    },
  });
  installDeterminismShim(context);
  removeCaptureStackTrace(context);
  createVmRealm(context, NO_IMPORT_OPTIONS);
  defineVmPromiseResolve(context);
  let wrapCallable = parent.sealSyncHooksInVM ? createVmHostFnWrapper(context) : (fn) => fn;
  if (parent.sealSyncHooksInVM) sealSyncGlobalsInVM(context, wrapCallable);
  let errorInfo = createVmErrorDescriber(context);
  let settle = awaitAsNullProto(context);
  let vmInboundCopier = createVmInboundCopier(context);
  let call = callWithArgs(context);
  let vmSideCopier = createVmSideCopier(context, NO_IMPORT_OPTIONS);
  let { vmToStr, vmOwnString, vmStringify } = VM_STRING_BRIDGE_SOURCE(context);
  bridges.sanitize = vmSideCopier.sanitize;
  bridges.toStr = vmToStr;
  let schemaOf = vmModule_2.runInContext(
    '(o => { try { const s = o && typeof o === "object" ? o.schema : undefined; return s && typeof s === "object" ? s : undefined } catch { return undefined } })',
    context,
  );
  let weakMap = new WeakMap();
  let agent = (prompt, options, arg3, arg4, arg5) => {
    let copiedOptions = vmInboundCopier(options);
    let schema = schemaOf(options);
    if (copiedOptions && typeof copiedOptions === "object" && schema) {
      let knownSchema = weakMap.get(schema);
      if (knownSchema !== undefined) copiedOptions.schema = knownSchema;
      else if (copiedOptions.schema !== undefined) weakMap.set(schema, copiedOptions.schema);
    }
    return parent.hooks.agent(
      prompt,
      {
        ...copiedOptions,
        phase,
      },
      arg3,
      arg4,
      arg5,
    );
  };
  return {
    childCtx: context,
    errorInfo,
    settle,
    clone: vmInboundCopier,
    call,
    sanitize: vmSideCopier.sanitize,
    toStr: vmToStr,
    ownString: vmOwnString,
    stringify: vmStringify,
    asyncWrap: wrapVmGlobal(context),
    syncWrap: wrapCallable,
    agent,
  };
}
//@ chunk-41w44bgm.js:26530-26727 placement
/**
 * 子工作流中再调用 workflow() 时返回的拒绝（嵌套只允许一层）。
 */
function rejectNestedWorkflow() {
  return Promise.reject(
    Error(
      "workflow() cannot be called from within a child workflow \u2014 nesting is limited to one level. Inline the inner script or call its agents directly.",
    ),
  );
}
//@ chunk-41w44bgm.js:26727-26840 placement
/**
 * 生成子工作流阶段名：同名阶段第二次起加 #序号。
 */
function makeChildPhaseNamer() {
  let counts = new Map();
  return (childName) => {
    let count = (counts.get(childName) ?? 0) + 1;
    counts.set(childName, count);
    return `${SMALL_TRIANGLE_RIGHT} ${childName}${count > 1 ? ` #${count}` : ""}`;
  };
}
//@ chunk-41w44bgm.js:26840-28059 placement
/**
 * 构造脚本中的 workflow() 函数：解析并编译子工作流，在子 VM 中运行（只允许一层嵌套），记录阶段与日志，失败时记 failure 并抛出摘要错误。
 */
function createWorkflowCall(childHooks) {
  let childPhaseNamer = makeChildPhaseNamer();
  return sealPrototype(async function (target, args) {
    if (childHooks.abortSignal?.aborted) return new Promise(() => {});
    let spawnMemo = childHooks.childSpawnMemo?.();
    let { childName, scriptBody } = await resolveChildWorkflow(childHooks, target);
    let compiled = compileWorkflowScript(scriptBody);
    if (!compiled.ok) throw Error(`workflow('${childName}'): ${compiled.error}`);
    let phase = childPhaseNamer(childName);
    childHooks.hooks.reservePhase(phase, "child");
    childHooks.hooks.log(`${SMALL_TRIANGLE_RIGHT} running dynamic workflow ${childName}`);
    let errorInfo;
    try {
      let childVmContext = createChildVmContext(childHooks, childName, phase);
      errorInfo = childVmContext.errorInfo;
      let childHooks_2 = {
        agent: (prompt, options) => childVmContext.agent(prompt, options, undefined, spawnMemo),
        parallel: childHooks.hooks.parallel,
        pipeline: childHooks.hooks.pipeline,
        workflow: rejectNestedWorkflow,
      };
      for (let [key, value] of Object.entries(childHooks_2))
        Object.defineProperty(childVmContext.childCtx, key, {
          value: childVmContext.asyncWrap(wrapHostFnForVm(value)),
          writable: true,
          enumerable: true,
          configurable: true,
        });
      Object.defineProperty(childVmContext.childCtx, "args", {
        value: args === undefined ? undefined : childVmContext.clone(args),
        writable: true,
        enumerable: true,
        configurable: true,
      });
      let settled = await childVmContext.settle(
        compiled.vmScript.runInContext(childVmContext.childCtx, timeoutOption(VM_ABORT_TIMEOUT_MS)),
      );
      let result = childVmContext.clone(settled.v);
      childHooks.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${childName} done`);
      return result;
    } catch (error) {
      let errorName;
      let errorMessage;
      let errorStack;
      if (errorInfo) ({ name: errorName, message: errorMessage, stack: errorStack } = errorInfo(error));
      else {
        errorName = error instanceof Error ? error.name : "Error";
        errorMessage = error instanceof Error ? error.message : "";
        errorStack = error instanceof Error ? error.stack : undefined;
      }
      let summary = summarizeError({
        name: errorName,
        message: errorMessage,
        stack: errorStack,
      });
      childHooks.hooks.recordFailure(`${phase}: ${summary}`);
      childHooks.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${childName} failed: ${summary}`);
      throw createSealedError(truncateMiddle(errorMessage), errorName, summary);
    }
  });
}
export {
  createWorkflowCall,
  makeChildPhaseNamer,
  resolveChildWorkflow,
  createChildVmContext,
  rejectNestedWorkflow,
};

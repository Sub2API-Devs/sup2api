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
  vUe,
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
async function resolveChildWorkflow(e, n) {
  let r = e.intakeClone(n);
  if (typeof r === "string") {
    let workflow = await e.resolveWorkflow(r, getCwd());
    if (!workflow) {
      let joined = (await e.getAllWorkflows(getCwd())).map((A) => A.name).join(", ");
      throw Error(`workflow('${r}'): no workflow with that name. Available: ${joined || "(none)"}`);
    }
    let workflowScript = parseWorkflowScript(workflow.script);
    if ("error" in workflowScript) throw Error(`workflow('${r}'): ${workflowScript.error}`);
    return {
      childName: workflow.name,
      scriptBody: workflowScript.scriptBody,
    };
  }
  if (r && typeof r === "object" && "scriptPath" in r && typeof r.scriptPath === "string") {
    if (workflowNameOnlyEnv())
      throw Error(
        "workflow({scriptPath}): this session restricts workflows to " +
          "named bundled workflows (CLAUDE_WORKFLOW_NAME_ONLY is set) \u2014 " +
          "nest with workflow('<name>') instead.",
      );
    let scriptPath = await e.loadScriptPath(r.scriptPath);
    if ("error" in scriptPath) throw Error(`workflow({scriptPath: '${r.scriptPath}'}): ${scriptPath.error}`);
    let workflowScript = parseWorkflowScript(scriptPath.script);
    if ("error" in workflowScript)
      throw Error(`workflow({scriptPath: '${r.scriptPath}'}): ${workflowScript.error}`);
    return {
      childName: workflowScript.meta.name,
      scriptBody: workflowScript.scriptBody,
      scriptPath: r.scriptPath,
    };
  }
  throw TypeError("workflow() expects a workflow name (string) or {scriptPath: string}");
}
//@ chunk-41w44bgm.js:25367-26530 placement
/**
 * 为子工作流建立独立 VM 上下文：带名称前缀的 log/console、共享预算与定时器、字符串桥与克隆/调用辅助；agent 调用会缓存并恢复 schema 对象。
 */
function createChildVmContext(parent, childName, phase, timers = parent.timers) {
  let T = `[${childName}] `;
  let y = {
    sanitize: (P) => (P === null || (typeof P !== "object" && typeof P !== "function") ? P : {}),
    toStr: (P) => describeBoundaryValue(P),
  };
  let A = {
    __proto__: null,
    budget: parent.budget,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    phase: sanitizeAndLogError((P) => {}),
    log: sanitizeAndLogError((P) => parent.hooks.log(T + describeBoundaryValue(P))),
    console: createVmConsole((P) => parent.hooks.log(T + P), y),
  };
  let context = SubAgentContext(A, {
    codeGeneration: {
      strings: false,
      wasm: false,
    },
  });
  installDeterminismShim(context);
  removeCaptureStackTrace(context);
  createVmRealm(context, vUe);
  defineVmPromiseResolve(context);
  let wrapCallable = parent.sealSyncHooksInVM ? createVmHostFnWrapper(context) : (P) => P;
  if (parent.sealSyncHooksInVM) sealSyncGlobalsInVM(context, wrapCallable);
  let errorInfo = createVmErrorDescriber(context);
  let settle = awaitAsNullProto(context);
  let vmInboundCopier = createVmInboundCopier(context);
  let call = callWithArgs(context);
  let vmSideCopier = createVmSideCopier(context, vUe);
  let { vmToStr, vmOwnString, vmStringify } = VM_STRING_BRIDGE_SOURCE(context);
  y.sanitize = vmSideCopier.sanitize;
  y.toStr = vmToStr;
  let s = vmModule_2.runInContext(
    '(o => { try { const s = o && typeof o === "object" ? o.schema : undefined; return s && typeof s === "object" ? s : undefined } catch { return undefined } })',
    context,
  );
  let weakMap = new WeakMap();
  let agent = (P, V, N, se, q) => {
    let ue = vmInboundCopier(V);
    let Ee = s(V);
    if (ue && typeof ue === "object" && Ee) {
      let xe = weakMap.get(Ee);
      if (xe !== undefined) ue.schema = xe;
      else if (ue.schema !== undefined) weakMap.set(Ee, ue.schema);
    }
    return parent.hooks.agent(
      P,
      {
        ...ue,
        phase,
      },
      N,
      se,
      q,
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
  let e = new Map();
  return (n) => {
    let r = (e.get(n) ?? 0) + 1;
    e.set(n, r);
    return `${SMALL_TRIANGLE_RIGHT} ${n}${r > 1 ? ` #${r}` : ""}`;
  };
}
//@ chunk-41w44bgm.js:26840-28059 placement
/**
 * 构造脚本中的 workflow() 函数：解析并编译子工作流，在子 VM 中运行（只允许一层嵌套），记录阶段与日志，失败时记 failure 并抛出摘要错误。
 */
function createWorkflowCall(parent) {
  let childPhaseNamer = makeChildPhaseNamer();
  return sealPrototype(async function (h, T) {
    if (parent.abortSignal?.aborted) return new Promise(() => {});
    let y = parent.childSpawnMemo?.();
    let { childName, scriptBody } = await resolveChildWorkflow(parent, h);
    let j = compileWorkflowScript(scriptBody);
    if (!j.ok) throw Error(`workflow('${childName}'): ${j.error}`);
    let phase = childPhaseNamer(childName);
    parent.hooks.reservePhase(phase, "child");
    parent.hooks.log(`${SMALL_TRIANGLE_RIGHT} running dynamic workflow ${childName}`);
    let ke;
    try {
      let childVmContext = createChildVmContext(parent, childName, phase);
      ke = childVmContext.errorInfo;
      let me = {
        agent: (ce, E) => childVmContext.agent(ce, E, undefined, y),
        parallel: parent.hooks.parallel,
        pipeline: parent.hooks.pipeline,
        workflow: rejectNestedWorkflow,
      };
      for (let [key, value] of Object.entries(me))
        Object.defineProperty(childVmContext.childCtx, key, {
          value: childVmContext.asyncWrap(wrapHostFnForVm(value)),
          writable: true,
          enumerable: true,
          configurable: true,
        });
      Object.defineProperty(childVmContext.childCtx, "args", {
        value: T === undefined ? undefined : childVmContext.clone(T),
        writable: true,
        enumerable: true,
        configurable: true,
      });
      let We = await childVmContext.settle(
        j.vmScript.runInContext(childVmContext.childCtx, timeoutOption(VM_ABORT_TIMEOUT_MS)),
      );
      let G = childVmContext.clone(We.v);
      parent.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${childName} done`);
      return G;
    } catch (error) {
      let me;
      let We;
      let G;
      if (ke) ({ name: me, message: We, stack: G } = ke(error));
      else {
        me = error instanceof Error ? error.name : "Error";
        We = error instanceof Error ? error.message : "";
        G = error instanceof Error ? error.stack : undefined;
      }
      let ce = summarizeError({
        name: me,
        message: We,
        stack: G,
      });
      parent.hooks.recordFailure(`${phase}: ${ce}`);
      parent.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${childName} failed: ${ce}`);
      throw createSealedError(truncateMiddle(We), me, ce);
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

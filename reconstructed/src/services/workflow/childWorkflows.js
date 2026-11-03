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
import * as vmModule from "vm";
import * as vmModule_2 from "vm";
import * as vmModule_3 from "vm";
import { getCwd } from "../../utils/cwd.js";
import { parseWorkflowScript } from "../workflows/workflowScriptMeta.js";
import { qht } from "./loadWorkflows.js";
import {
  describeBoundaryValue,
  createVmSideCopier,
  VM_STRING_BRIDGE_SOURCE,
  wrapHostFnForVm,
} from "../../plugins/functionHooks/vm/boundaryCopy.js";
import { sanitizeAndLogError } from "../../components/Feedback.js";
import { createVmConsole, sealSyncGlobalsInVM, Kn } from "./vmGlobals.js";
import { SubAgentContext } from "../../components/CtrlOToExpand.js";
import { Jn, defineVmPromiseResolve, Qt, compileWorkflowScript, sin } from "./scriptSandbox.js";
import {
  cfr,
  createVmRealm,
  freeze,
  createVmHostFnWrapper,
  createVmErrorDescriber,
  $An,
  createVmInboundCopier,
  FAn,
  B5e,
  createSealedError,
} from "../../plugins/functionHooks/vm/vmRealm.js";
import { SMALL_TRIANGLE_RIGHT } from "../../constants/figures.js";
import { summarizeError, truncateMiddle } from "../../memdir/memoryTool.js";

/**
 * 解析 workflow() 的参数：名称则查找已注册的工作流并解析脚本，{scriptPath} 则加载脚本文件（CLAUDE_WORKFLOW_NAME_ONLY 时禁止）；返回 {childName, scriptBody, scriptPath?}。
 */
//@ chunk-41w44bgm.js:24305-25367 placement
async function resolveChildWorkflow(e, n) {
  let intakeClone = e.intakeClone(n);
  if (typeof intakeClone === "string") {
    let workflow = await e.resolveWorkflow(intakeClone, getCwd());
    if (!workflow) {
      let joined = (await e.getAllWorkflows(getCwd())).map((A) => A.name).join(", ");
      throw Error(`workflow('${intakeClone}'): no workflow with that name. Available: ${joined || "(none)"}`);
    }
    let T = parseWorkflowScript(workflow.script);
    if ("error" in T) throw Error(`workflow('${intakeClone}'): ${T.error}`);
    return { childName: workflow.name, scriptBody: T.scriptBody };
  }
  if (
    intakeClone &&
    typeof intakeClone === "object" &&
    "scriptPath" in intakeClone &&
    typeof intakeClone.scriptPath === "string"
  ) {
    if (qht())
      throw Error(
        "workflow({scriptPath}): this session restricts workflows to " +
          "named bundled workflows (CLAUDE_WORKFLOW_NAME_ONLY is set) \u2014 " +
          "nest with workflow('<name>') instead.",
      );
    let scriptPath = await e.loadScriptPath(intakeClone.scriptPath);
    if ("error" in scriptPath)
      throw Error(`workflow({scriptPath: '${intakeClone.scriptPath}'}): ${scriptPath.error}`);
    let T = parseWorkflowScript(scriptPath.script);
    if ("error" in T) throw Error(`workflow({scriptPath: '${intakeClone.scriptPath}'}): ${T.error}`);
    return { childName: T.meta.name, scriptBody: T.scriptBody, scriptPath: intakeClone.scriptPath };
  }
  throw TypeError("workflow() expects a workflow name (string) or {scriptPath: string}");
}
/**
 * 为子工作流建立独立 VM 上下文：带名称前缀的 log/console、共享预算与定时器、字符串桥与克隆/调用辅助；agent 调用会缓存并恢复 schema 对象。
 */
//@ chunk-41w44bgm.js:25367-26530 placement
function createChildVmContext(parent, childName, phase, timers = parent.timers) {
  let T = `[${childName}] `,
    y = {
      sanitize: (P) => (P === null || (typeof P !== "object" && typeof P !== "function") ? P : {}),
      toStr: (P) => describeBoundaryValue(P),
    },
    A = {
      __proto__: null,
      budget: parent.budget,
      setTimeout: timers.setTimeout,
      clearTimeout: timers.clearTimeout,
      phase: sanitizeAndLogError((P) => {}),
      log: sanitizeAndLogError((P) => parent.hooks.log(T + describeBoundaryValue(P))),
      console: createVmConsole((P) => parent.hooks.log(T + P), y),
    },
    L = SubAgentContext(A, { codeGeneration: { strings: !1, wasm: !1 } });
  (Jn(L), cfr(L), createVmRealm(L, freeze), defineVmPromiseResolve(L));
  let j = parent.sealSyncHooksInVM ? createVmHostFnWrapper(L) : (P) => P;
  if (parent.sealSyncHooksInVM) sealSyncGlobalsInVM(L, j);
  let he = createVmErrorDescriber(L),
    ke = $An(L),
    te = createVmInboundCopier(L),
    me = FAn(L),
    We = createVmSideCopier(L, freeze),
    { vmToStr: vmToStr, vmOwnString: vmOwnString, vmStringify: vmStringify } = VM_STRING_BRIDGE_SOURCE(L);
  ((y.sanitize = We.sanitize), (y.toStr = vmToStr));
  let runInContext = vmModule_3.runInContext(
      '(o => { try { const s = o && typeof o === "object" ? o.schema : undefined; return s && typeof s === "object" ? s : undefined } catch { return undefined } })',
      L,
    ),
    weakMap = new WeakMap(),
    w = (P, V, N, se, q) => {
      let ue = te(V),
        Ee = runInContext(V);
      if (ue && typeof ue === "object" && Ee) {
        let xe = weakMap.get(Ee);
        if (xe !== void 0) ue.schema = xe;
        else if (ue.schema !== void 0) weakMap.set(Ee, ue.schema);
      }
      return parent.hooks.agent(P, { ...ue, phase: phase }, N, se, q);
    };
  return {
    childCtx: L,
    errorInfo: he,
    settle: ke,
    clone: te,
    call: me,
    sanitize: We.sanitize,
    toStr: vmToStr,
    ownString: vmOwnString,
    stringify: vmStringify,
    asyncWrap: Kn(L),
    syncWrap: j,
    agent: w,
  };
}
/**
 * 子工作流中再调用 workflow() 时返回的拒绝（嵌套只允许一层）。
 */
//@ chunk-41w44bgm.js:26530-26727 placement
function rejectNestedWorkflow() {
  return Promise.reject(
    Error(
      "workflow() cannot be called from within a child workflow \u2014 nesting is limited to one level. Inline the inner script or call its agents directly.",
    ),
  );
}
/**
 * 生成子工作流阶段名：同名阶段第二次起加 #序号。
 */
//@ chunk-41w44bgm.js:26727-26840 placement
function makeChildPhaseNamer() {
  let e = new Map();
  return (n) => {
    let r = (e.get(n) ?? 0) + 1;
    return (e.set(n, r), `${SMALL_TRIANGLE_RIGHT} ${n}${r > 1 ? ` #${r}` : ""}`);
  };
}
/**
 * 构造脚本中的 workflow() 函数：解析并编译子工作流，在子 VM 中运行（只允许一层嵌套），记录阶段与日志，失败时记 failure 并抛出摘要错误。
 */
//@ chunk-41w44bgm.js:26840-28059 placement
function createWorkflowCall(e) {
  let n = makeChildPhaseNamer();
  return Qt(async function (h, T) {
    if (e.abortSignal?.aborted) return new Promise(() => {});
    let y = e.childSpawnMemo?.(),
      { childName: childName, scriptBody: scriptBody } = await resolveChildWorkflow(e, h),
      j = compileWorkflowScript(scriptBody);
    if (!j.ok) throw Error(`workflow('${childName}'): ${j.error}`);
    let he = n(childName);
    (e.hooks.reservePhase(he, "child"),
      e.hooks.log(`${SMALL_TRIANGLE_RIGHT} running dynamic workflow ${childName}`));
    let ke;
    try {
      let te = createChildVmContext(e, childName, he);
      ke = te.errorInfo;
      let me = {
        agent: (ce, E) => te.agent(ce, E, void 0, y),
        parallel: e.hooks.parallel,
        pipeline: e.hooks.pipeline,
        workflow: rejectNestedWorkflow,
      };
      for (let [ce, E] of Object.entries(me))
        Object.defineProperty(te.childCtx, ce, {
          value: te.asyncWrap(wrapHostFnForVm(E)),
          writable: !0,
          enumerable: !0,
          configurable: !0,
        });
      Object.defineProperty(te.childCtx, "args", {
        value: T === void 0 ? void 0 : te.clone(T),
        writable: !0,
        enumerable: !0,
        configurable: !0,
      });
      let settle = await te.settle(j.vmScript.runInContext(te.childCtx, B5e(sin))),
        clone = te.clone(settle.v);
      return (e.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${childName} done`), clone);
    } catch (error) {
      let me, We, G;
      if (ke) ({ name: me, message: We, stack: G } = ke(error));
      else
        ((me = error instanceof Error ? error.name : "Error"),
          (We = error instanceof Error ? error.message : ""),
          (G = error instanceof Error ? error.stack : void 0));
      let ce = summarizeError({ name: me, message: We, stack: G });
      throw (
        e.hooks.recordFailure(`${he}: ${ce}`),
        e.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${childName} failed: ${ce}`),
        createSealedError(truncateMiddle(We), me, ce)
      );
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

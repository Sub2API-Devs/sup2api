/**
 * tools/REPLTool/session.ts
 *
 * 建立会话与 VM 上下文、安装计步 shim 与调用上下文（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AsyncLocalStorage } from "async_hooks";
import { getCwd } from "../../utils/cwd.js";
import {
  replStepBudget,
  UNAWAITED_PROMISE_MESSAGE,
  BLOCK_STEP_PREFIX,
  EXPR_STEP_PREFIX,
  BLOCK_STEP_SUFFIX,
} from "./instrument.js";
import { beginTurn, weakSet_3, installStepBudget, weakMap_3, resumeSteps } from "./stepBudget.js";
import { doesEngineResultHold, engineCheckResult } from "../../utils/bunEngineProbe.js";
import { initReplModule, createReplReadProbeSlot } from "./sessionHelpers.js";
import { VM_HEAP_LIMIT_BYTES } from "./consoleRing.js";
import { ScriptCheckQueue, startedAfterThis } from "./scriptChecks.js";
import { getImportModuleDynamically, runInVm, lazyEvals } from "./vmContext.js";
import { SubAgentContext } from "../../components/CtrlOToExpand.js";
import { createVmIsolationLayer } from "./vmHardening.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { createSignal } from "../../utils/signal.js";
import { createCallState, toolsExceptRepl, trackOutstandingCall } from "./callState.js";
import { LEAD_CONTEXT, createContextApi } from "./contexts.js";
import { NO_EVALS, getReplSessions } from "../../state/replSessions.js";
import { createToolHelpers } from "./discovery.js";
import { createVmRealm } from "../../plugins/functionHooks/vm/vmRealm.js";
import { installScriptGlobals } from "./globals.js";
import { buildToolWrappers } from "./toolWrappers.js";
import { wireName } from "../../services/mcp/serverIdentity.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { REPL_MAIN_THREAD_KEY } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";

//@ chunk-n51jggtb.js:153047-153107 placement
/**
 * 设置会话 cwd 与步数预算并启动计步。
 */
function initCallContext(replState, call) {
  call.cwd = getCwd();
  call.stepBudget = replStepBudget();
  beginTurn(replState.steps, call);
}
//@ chunk-n51jggtb.js:153107-153183 placement
/**
 * 在当前调用上运行并把结果深度解密封。
 */
function runInCallContext(replState, onValue, fn) {
  return replState.currentCall.run(onValue, () => replState.sealers.resolveDeep(fn));
}
//@ chunk-n51jggtb.js:153183-155140 placement
/**
 * 建立 REPL VM 上下文：引擎检查、全局快照、console 环、计步器与状态容器。
 */
function createReplSession(tools) {
  if (doesEngineResultHold(engineCheckResult()))
    throw Error(
      "The REPL tool cannot run scripts in this session: the JavaScript engine under Claude Code failed Code Mode's engine check. Run Claude Code with the repository's pinned Bun (node_modules/.bin/bun) or use a staff build.",
    );
  initReplModule();
  let timerState = {
    nextId: 1,
    nextOutsideId: VM_HEAP_LIMIT_BYTES,
    armed: new Map(),
  };
  let helpers = {
    contexts: new Map(),
    ring: {
      lines: [],
      sizes: [],
      bytes: 0,
      dropped: 0,
      total: 0,
    },
  };
  let callStorage = new AsyncLocalStorage();
  let unclassifiedCode = {
    ran: false,
  };
  let scriptChecks = new ScriptCheckQueue(unclassifiedCode);
  let importModuleDynamically = getImportModuleDynamically();
  let vmContext = SubAgentContext(
    {
      __proto__: null,
    },
    {
      codeGeneration: {
        strings: false,
        wasm: false,
      },
      importModuleDynamically,
    },
  );
  let sealers = createVmIsolationLayer(vmContext, importModuleDynamically);
  weakSet_3.add(runInVm("Promise.prototype", vmContext, sealers.rejectImport));
  runInVm(
    `Promise.prototype.toString = function () {
      throw new TypeError(${jsonStringify(UNAWAITED_PROMISE_MESSAGE)})
    }`,
    vmContext,
    sealers.rejectImport,
  );
  let steps = sealers.clone({
    left: 0,
    rest: 0,
    budget: 0,
    deadline: 0,
    bound: 0,
    stride: 1,
    lastClock: 0,
    stopped: false,
    clockStops: 0,
    budgetStopped: false,
    budgetStops: 0,
  });
  installStepBudget(vmContext, steps, sealers);
  let outstanding = {
    count: 0,
    changed: createSignal(),
  };
  let base = createCallState(sealers, {
    toolWrappers: {},
    team: LEAD_CONTEXT,
    evals: NO_EVALS,
    discovery: createToolHelpers([], []),
    stepBudget: replStepBudget(),
    outside: true,
  });
  let current = () => callStorage.getStore() ?? base;
  installFunctionToStringShim(vmContext, sealers);
  createVmRealm(vmContext, {
    importModuleDynamically: sealers.rejectImport,
  });
  let toolNames = toolsExceptRepl(tools).map((tool) => tool.name);
  let vmGlobal = runInVm("globalThis", vmContext, sealers.rejectImport);
  installScriptGlobals(
    vmContext,
    vmGlobal,
    sealers,
    current,
    toolNames,
    timerState,
    helpers,
    steps,
    outstanding,
  );
  let baselineGlobalNames = new Set(Object.getOwnPropertyNames(vmContext));
  let vmGlobalNames = runInVm(
    'Object.getOwnPropertyNames(globalThis).join(",")',
    vmContext,
    sealers.rejectImport,
  );
  let knownGlobalNames = new Set(
    typeof vmGlobalNames === "string" ? vmGlobalNames.split(",") : baselineGlobalNames,
  );
  let session = {
    vmContext,
    vmGlobal,
    toolWrapperNames: new Set(toolNames),
    steps,
    currentCall: callStorage,
    base,
    current,
    sealers,
    timers: timerState,
    clearAllTimers: () => {
      for (let [timerId, { owner: armed, clear: clearFn }] of timerState.armed) {
        clearFn();
        armed.timers.delete(timerId);
      }
      timerState.armed.clear();
    },
    endCall: (call, reason) => {
      if (call.ended) return;
      call.ended = true;
      call.cancelled = reason === "cancelled";
      for (let timer of call.timers) {
        timerState.armed.get(timer)?.clear();
        timerState.armed.delete(timer);
      }
      call.timers.clear();
      clearInterval(call.clockHeartbeat);
      call.clockHeartbeat = undefined;
    },
    helperState: helpers,
    scriptGlobalNames: () =>
      Object.getOwnPropertyNames(vmContext).filter(
        (name) => !baselineGlobalNames.has(name) && !session.toolWrapperNames.has(name),
      ),
    isGlobalName: (globalName) =>
      knownGlobalNames.has(globalName) || session.toolWrapperNames.has(globalName),
    unclassifiedCode,
    verdictOrder: {
      newestStarted: 0,
    },
    scriptChecks,
    outstanding,
  };
  return session;
}
//@ chunk-n51jggtb.js:155140-156197 placement
/**
 * 为一次脚本运行建立调用上下文对象。
 */
function buildCallState(
  replState,
  toolList,
  callCtx,
  canUseTool,
  parentMessage,
  lane,
  onToolProgress,
  onHookEvent,
  evalId = () => {
    return;
  },
  onPhase,
  stopSignal,
  abortSignal,
  x = {
    order: undefined,
    returned: false,
  },
) {
  let allTools = toolsExceptRepl(toolList);
  let shellDirectorySlot = {
    pending: undefined,
  };
  let readProbeSlot = createReplReadProbeSlot();
  let toolWrappers = buildToolWrappers(
    allTools,
    callCtx,
    canUseTool,
    parentMessage,
    lane,
    onToolProgress,
    onHookEvent,
    replState.unclassifiedCode,
    shellDirectorySlot,
    readProbeSlot,
    abortSignal,
    {
      laterScriptStarted: () => startedAfterThis(replState.verdictOrder, x),
      scriptReturned: () => x.returned,
      startsNoMoreCalls: () => x.startsNoMoreCalls === true,
      ...(x.spelledOutCommands !== undefined && {
        spellsOut: (name) => typeof name === "string" && x.spelledOutCommands?.has(name) === true,
      }),
    },
  );
  let callState = createCallState(replState.sealers, {
    toolWrappers,
    envVars: callCtx,
    shellDirectorySlot,
    readProbeSlot,
    stopSignal,
    discovery: createToolHelpers(
      toolList,
      toolList.filter((tool) => Object.hasOwn(toolWrappers, wireName(tool.name))),
      onToolProgress,
    ),
    team: createContextApi(callCtx),
    hostWait: async (promise, resumeAfter = false) => {
      onPhase?.("start");
      let turns = weakMap_3.get(replState.steps)?.turns ?? 0;
      try {
        return await trackOutstandingCall(replState.outstanding, callState, promise);
      } finally {
        onPhase?.("end");
        let turnAdvanced = (weakMap_3.get(replState.steps)?.turns ?? 0) > turns;
        if (resumeAfter && turnAdvanced) resumeSteps(replState.steps, callState);
        else await callState.resumed();
      }
    },
    resumed: async () => {
      await yieldToEventLoop();
      resumeSteps(replState.steps, callState);
    },
    evals: lazyEvals(() => getReplSessions(callCtx).access(callCtx.agentId ?? REPL_MAIN_THREAD_KEY, evalId)),
    stepBudget: replStepBudget(),
    outside: false,
  });
  let keys = Object.keys(callState.toolWrappers);
  installScriptGlobals(
    replState.vmContext,
    replState.vmGlobal,
    replState.sealers,
    replState.current,
    keys,
    replState.timers,
    replState.helperState,
    replState.steps,
    replState.outstanding,
  );
  for (let name of keys) replState.toolWrapperNames.add(name);
  return callState;
}
//@ chunk-n51jggtb.js:156197-157574 placement
/**
 * 安装步数 shim（__replStep 的 VM 侧实现）。
 */
function installFunctionToStringShim(vmContext, sealerContext) {
  runInVm(
    `'use strict';
    (() => {
      const stepInBlock = ${jsonStringify(BLOCK_STEP_PREFIX)}
      const stepInExpression = ${jsonStringify(EXPR_STEP_PREFIX)}
      const stepAfterDirectives = ${jsonStringify(BLOCK_STEP_SUFFIX)}
      // Every built-in the shim uses is read now, before any script runs. A
      // script can replace a global (Reflect, say), and a shim that read it
      // at call time would hand the replacement a built-in.
      const { apply, defineProperty } = Reflect
      const builtinToString = Function.prototype.toString
      const { replaceAll } = String.prototype
      const printing = {
        toString() {
          if (this === printing.toString) {
            return apply(builtinToString, builtinToString, [])
          }
          let text = apply(builtinToString, this, [])
          text = apply(replaceAll, text, [stepAfterDirectives, ''])
          text = apply(replaceAll, text, [stepInBlock, '{'])
          return apply(replaceAll, text, [stepInExpression, '('])
        },
      }
      defineProperty(printing.toString, 'name', { value: builtinToString.name, configurable: true })
      defineProperty(printing.toString, 'length', { value: builtinToString.length, configurable: true })
      defineProperty(Function.prototype, 'toString', {
        value: printing.toString,
        writable: true,
        enumerable: false,
        configurable: true,
      })
    })()`,
    vmContext,
    sealerContext.rejectImport,
  );
}
export { createReplSession, buildCallState, initCallContext, runInCallContext };

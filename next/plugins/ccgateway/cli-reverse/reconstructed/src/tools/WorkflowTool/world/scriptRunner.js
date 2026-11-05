/**
 * tools/WorkflowTool/world/scriptRunner.ts
 *
 * 2.1.316 新增：工作流脚本运行器（VM 宿主 API、world 绑定、运行生命周期）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kgbsr4tm.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import "vm";
import * as vmModule_2 from "vm";
import {
  timeoutOption,
  createSealedError,
  createVmErrorDescriber,
} from "../../../plugins/functionHooks/vm/vmRealm.js";
import {
  VM_ABORT_TIMEOUT_MS,
  compileWorkflowScript,
  createVmTimers,
  WORKFLOW_VM_WORDS,
} from "../../../services/workflow/scriptSandbox.js";
import { logForDebugging } from "../../../utils/debug.js";
import { summarizeError, truncateMiddle } from "../../../memdir/memoryTool.js";
import { clone, jsonParse, jsonStringify } from "../../../utils/slowOperations.js";
import { HOST_SCOPE, parseFact, parsePattern, parseAtLeastPattern } from "./worldStore.js";
import {
  makeChildPhaseNamer,
  resolveChildWorkflow,
  createChildVmContext,
  rejectNestedWorkflow,
} from "../../../services/workflow/childWorkflows.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../../utils/errors.js";
import { wrapHostFnForVm } from "../../../plugins/functionHooks/vm/boundaryCopy.js";
import { SMALL_TRIANGLE_RIGHT } from "../../../constants/figures.js";
import { sanitizeAndLogError } from "../../../components/Feedback.js";
import { truncateToLength } from "../../../utils/stringUtils.js";
import { WorkflowJournalStub } from "../../../services/workflow/localFileJournal.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { fromEnum, lit } from "../../../services/analytics/safeMetadata.js";
import { countWhere } from "../../../utils/collections.js";
import { logError } from "../../../utils/log.js";
import { finiteOrZero, hasErrorField, isAgentEvalRow } from "./runRegistry.js";
import { sleep } from "../../../utils/sleep.js";
import { createWorkflowVmContext } from "../../../services/workflow/runScript.js";
import { beginDeferredInits } from "../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 2 modules closed by ./runRegistry.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/tools/WorkflowTool/world/runRegistry.js");
//@ chunk-kgbsr4tm.js:26339-26388 placement
var STOP_REASONS = ["user", "model", "stop", "runaway", "pause"];
//@ chunk-kgbsr4tm.js:26410-27073 placement
async function runScriptInContext(script, runtime) {
  let settled;
  try {
    let promise = script.runInContext(runtime.vmContext, timeoutOption(VM_ABORT_TIMEOUT_MS));
    settled = await runtime.settle(promise);
  } catch (error) {
    let errorInfo = runtime.errorInfo(error);
    if (errorInfo.stack)
      logForDebugging(
        `Workflow v2 script error stack:
${errorInfo.stack}`,
        {
          level: "error",
        },
      );
    return {
      error: summarizeError(errorInfo),
      thrown: errorInfo,
    };
  }
  let rawValue = settled.v;
  if (typeof rawValue === "function")
    return {
      error: "workflow result cannot be a function",
    };
  if (rawValue === null || typeof rawValue !== "object") {
    if (typeof rawValue === "bigint" || typeof rawValue === "symbol")
      return {
        error: `workflow result is not JSON-serializable (a ${typeof rawValue})`,
      };
    return {
      value: rawValue,
    };
  }
  let sanitized = runtime.sanitize(rawValue);
  try {
    let cloned;
    try {
      cloned = clone(sanitized);
    } catch {
      cloned = jsonParse(jsonStringify(sanitized) ?? "null");
    }
    jsonStringify(cloned);
    return {
      value: cloned,
    };
  } catch {
    return {
      error: "workflow result is not JSON-serializable (a circular reference?)",
    };
  }
}
//@ chunk-kgbsr4tm.js:27073-27256 placement
function isInsideChildWorkflow(world, addr, boundaryAddr) {
  let cursor = world.rows[addr]?.in ?? HOST_SCOPE;
  while (cursor !== HOST_SCOPE && cursor !== boundaryAddr) {
    let row = world.rows[cursor];
    if (!row) return false;
    if (row.kind === "eval" && row.fact.topic === "workflow" && row.fact.child === true) return true;
    cursor = row.in;
  }
  return false;
}
//@ chunk-kgbsr4tm.js:27256-27465 placement
function resolveRuleOrigin(world, row, boundaryAddr) {
  let { addr, by } = row;
  for (;;) {
    if (!by.startsWith("rule:")) return addr;
    let ruleAddr = Number(by.slice(5));
    if (
      !Number.isSafeInteger(ruleAddr) ||
      ruleAddr < 0 ||
      ruleAddr >= addr ||
      !world.within(ruleAddr, boundaryAddr)
    )
      return;
    let ruleRow = world.rows[ruleAddr];
    if (!ruleRow) return;
    addr = ruleAddr;
    by = ruleRow.by;
  }
}
//@ chunk-kgbsr4tm.js:27465-27526 placement
/**
 * 判断某行是否属于当前脚本可触发的规则（不在子工作流内且能解析来源）。
 */
function isValidRuleRow(world, row, boundaryAddr) {
  return (
    !isInsideChildWorkflow(world, row.addr, boundaryAddr) &&
    resolveRuleOrigin(world, row, boundaryAddr) !== undefined
  );
}
//@ chunk-kgbsr4tm.js:27526-31728 placement
/**
 * 为工作流脚本 VM 构建宿主 API（agent/spawn/world 操作等），处理跨 VM 边界的克隆与包装。
 */
function createWorkflowHostApi(options) {
  let { ctx, world, killSignal } = options;
  let childWorkflow = ctx.childWorkflow;
  let { clone } = ctx.vmBoundary;
  let childPhaseNamer = makeChildPhaseNamer();
  let pendingAwaits = new Map();
  let liveChildren = new Map();
  function abortError() {
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Workflow aborted",
      "workflow v2: child workflow retracted by kill",
    );
  }
  function awaitChild(addr) {
    return world.settled(addr).then(async (settled) => {
      let failure = pendingAwaits.get(addr);
      switch ((pendingAwaits.delete(addr), settled.status)) {
        case "done": {
          await world.whenIdle(addr);
          if (killSignal.aborted) throw abortError();
          if (world.rows[addr]?.status === "retracted") return null;
          let mapped = world
            .read(
              {
                topic: "result",
              },
              {
                in: addr,
              },
            )
            .filter((row) => isValidRuleRow(world, row, addr))
            .map((row) => row.fact);
          return mapped.length > 0 ? clone(mapped) : clone(settled.value);
        }
        case "failed": {
          if (failure) throw createSealedError(failure.message, failure.name, failure.rendered);
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            settled.error ?? "child workflow failed",
            "workflow v2: awaited child workflow failed",
          );
        }
        case "retracted":
          if (killSignal.aborted) throw abortError();
          return null;
        default:
          return null;
      }
    });
  }
  function describeError(error, errorInfo) {
    if (error instanceof Error)
      return {
        name: error.name,
        message: error.message,
      };
    let info = (errorInfo ?? options.errorInfo)(error);
    return {
      name: info.name,
      message: info.message,
    };
  }
  function cutChild(addr) {
    let child = liveChildren.get(addr);
    if (child) {
      child.cutRequested = true;
      return;
    }
    world.retract(addr);
  }
  async function spawnChild(args, value, nodeOptions) {
    if (childWorkflow.abortSignal?.aborted) return new Promise(() => {});
    let scope = {
      in: args.in,
    };
    let by = args.by;
    if (world.isRetractedScope(scope.in)) {
      if (killSignal.aborted) throw abortError();
      return null;
    }
    let clonedValue;
    let cloneError;
    try {
      clonedValue = childWorkflow.intakeClone(value);
    } catch (error) {
      cloneError = {
        error,
      };
    }
    let fact = parseFact({
      topic: "workflow",
      ...(typeof clonedValue === "string"
        ? {
            name: clonedValue,
          }
        : clonedValue !== null &&
            typeof clonedValue === "object" &&
            "scriptPath" in clonedValue &&
            typeof clonedValue.scriptPath === "string"
          ? {
              scriptPath: clonedValue.scriptPath,
            }
          : {}),
      founding: true,
      child: true,
    });
    let abortController = new AbortController();
    let childAddr = world.rows.length;
    let unsubscribe = world.subscribe((event) => {
      if (event.kind === "retracted" && event.row.addr === childAddr) {
        unsubscribe();
        liveChildren.delete(childAddr);
        abortController.abort();
      }
    });
    liveChildren.set(childAddr, {
      cutRequested: false,
    });
    async function runChild() {
      let errorInfo;
      let childName;
      let phase;
      let vmScript;
      let childContext;
      try {
        if (cloneError) throw cloneError.error;
        let childWorkflow_2 = await resolveChildWorkflow(childWorkflow, clonedValue);
        if (abortController.signal.aborted) return;
        let compiled = compileWorkflowScript(childWorkflow_2.scriptBody);
        if (!compiled.ok) {
          let compileError = `workflow('${childWorkflow_2.childName}'): ${compiled.error}`;
          throw Error(compileError);
        }
        childName = childWorkflow_2.childName;
        vmScript = compiled.vmScript;
        phase = childPhaseNamer(childName);
        let timers = createVmTimers(
          childWorkflow.abortSignal
            ? AbortSignal.any([childWorkflow.abortSignal, abortController.signal])
            : abortController.signal,
        );
        options.registerTimers(timers);
        childContext = createChildVmContext(childWorkflow, childName, phase, timers);
        errorInfo = childContext.errorInfo;
        timers.bindVMInvoke(vmModule_2.runInContext("(fn => { fn() })", childContext.childCtx));
        for (let [hookName, hook] of [
          ["parallel", childWorkflow.hooks.parallel],
          ["pipeline", childWorkflow.hooks.pipeline],
        ]) {
          let hostHook = hook;
          let guardedHook = (...hookArgs) =>
            abortController.signal.aborted ? new Promise(() => {}) : hostHook(...hookArgs);
          Object.defineProperty(childContext.childCtx, hookName, {
            value: childContext.asyncWrap(wrapHostFnForVm(guardedHook)),
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
        Object.defineProperty(childContext.childCtx, "args", {
          value: nodeOptions === undefined ? undefined : childContext.clone(nodeOptions),
          writable: true,
          enumerable: true,
          configurable: true,
        });
        let cutRequested = liveChildren.get(childAddr)?.cutRequested === true;
        liveChildren.delete(childAddr);
        if (cutRequested) {
          world.retract(childAddr);
          return;
        }
        childWorkflow.hooks.reservePhase(phase, "child");
        childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} running dynamic workflow ${childName}`);
        let childRun = {
          vmContext: childContext.childCtx,
          hooks: {
            ...childWorkflow.hooks,
            agent: childContext.agent,
          },
          childSpawnMemoRef: {},
          vmToStr: childContext.toStr,
          vmOwnString: childContext.ownString,
          vmStringify: childContext.stringify,
          timers,
          vmBoundary: {
            clone: childContext.clone,
            call: childContext.call,
            settle: childContext.settle,
            sanitize: childContext.sanitize,
            asyncWrap: childContext.asyncWrap,
            syncWrap: childContext.syncWrap,
          },
          childWorkflow,
        };
        options.installWords(childRun, childAddr, abortController.signal, args.spawnMemo);
      } catch (error) {
        liveChildren.delete(childAddr);
        abortController.abort();
        let { name: errorName, message } = describeError(error, errorInfo);
        let shortMessage = truncateMiddle(message);
        pendingAwaits.set(childAddr, {
          name: errorName,
          message: shortMessage,
          rendered: `${errorName}: ${shortMessage}`,
        });
        childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} workflow() failed to start: ${shortMessage}`);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          shortMessage,
          "workflow v2: child workflow failed to start",
        );
      }
      let scriptOutcome = await runScriptInContext(vmScript, {
        vmContext: childContext.childCtx,
        settle: childContext.settle,
        sanitize: childContext.sanitize,
        errorInfo: childContext.errorInfo,
      });
      if (abortController.signal.aborted) return;
      if (scriptOutcome.thrown) {
        pendingAwaits.set(childAddr, {
          name: scriptOutcome.thrown.name,
          message: truncateMiddle(scriptOutcome.thrown.message),
          rendered: scriptOutcome.error,
        });
        childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${childName} failed: ${scriptOutcome.error}`);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          scriptOutcome.error,
          "workflow v2: child workflow script failed",
        );
      }
      if (scriptOutcome.error !== undefined) {
        childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${childName} failed: ${scriptOutcome.error}`);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          scriptOutcome.error,
          "workflow v2: child workflow result refused",
        );
      }
      childWorkflow.hooks.log(`${SMALL_TRIANGLE_RIGHT} ${childName} done`);
      return scriptOutcome.value;
    }
    let landedAddr;
    try {
      landedAddr = world.eval(
        fact,
        (evalContext) => {
          evalContext.addEventListener("abort", () => abortController.abort(), {
            once: true,
          });
          return runChild();
        },
        by,
        scope,
      );
    } catch (error) {
      unsubscribe();
      liveChildren.delete(childAddr);
      if (!world.isRetractedScope(scope.in)) {
        let { message } = describeError(error, undefined);
        let label =
          typeof fact.name === "string"
            ? fact.name
            : typeof fact.scriptPath === "string"
              ? `workflow(${fact.scriptPath})`
              : "workflow()";
        childWorkflow.hooks.recordFailure(`${SMALL_TRIANGLE_RIGHT} ${label}: ${truncateMiddle(message)}`);
        childWorkflow.hooks.log(
          `${SMALL_TRIANGLE_RIGHT} workflow() failed to start: ${truncateMiddle(message)}`,
        );
      }
      throw error;
    }
    if (landedAddr !== childAddr) {
      unsubscribe();
      liveChildren.delete(childAddr);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `child workflow row landed at ${landedAddr}, expected ${childAddr}`,
        "workflow v2: child founding address mismatch",
      );
    }
    return awaitChild(landedAddr);
  }
  return {
    workflow: spawnChild,
    cut: cutChild,
  };
}
//@ chunk-kgbsr4tm.js:31750-31789 placement
/**
 * 是否为数组（辅助判断）。
 */
function isArray(value) {
  return Array.isArray(value);
}
//@ chunk-kgbsr4tm.js:31789-31888 placement
/**
 * 把内部行裁剪成对外暴露的字段（地址、来源、状态、值、错误、事实）。
 */
function toPublicRow(value) {
  return {
    addr: value.addr,
    by: value.by,
    status: value.status,
    value: value.value,
    error: value.error,
    fact: value.fact,
  };
}
//@ chunk-kgbsr4tm.js:31888-32306 placement
function parsePlacementOptions(world) {
  if (world === undefined || world === null) return false;
  if (typeof world !== "object" || Array.isArray(world))
    throw TypeError("placement options must be an object: {top: true} or nothing");
  let boundaryAddr = world;
  if (Object.keys(boundaryAddr).some((key) => key !== "top"))
    throw TypeError("unknown placement option \u2014 the only one is top (a boolean)");
  if (boundaryAddr.top !== undefined && typeof boundaryAddr.top !== "boolean")
    throw TypeError("placement option top must be a boolean");
  return boundaryAddr.top === true;
}
//@ chunk-kgbsr4tm.js:32306-37707 placement
/**
 * 为脚本提供 world（put/retract/read/rule 等）绑定，带作用域信号与 spawn 记忆。
 */
function createWorldBindings(
  hostContext,
  world,
  rootAddr,
  killSignal,
  { scopeSignal, inheritedSpawnMemo } = {},
) {
  let { clone, call: callFn, settle, sanitize, asyncWrap, syncWrap } = hostContext.vmBoundary;
  let { vmContext, hooks } = hostContext;
  let guard = (thrown) => syncWrap(sanitizeAndLogError(thrown));
  let vmErrorDescriber = createVmErrorDescriber(vmContext);
  let defaultPlacement = {
    by: "script",
    in: rootAddr,
    memo: "chain",
  };
  let currentPlacement = defaultPlacement;
  function withPlacement(placement, body) {
    let previousPlacement = currentPlacement;
    currentPlacement = placement;
    try {
      return placement.memo === "none" ? hostContext.hooks.withLanesInert(body) : body();
    } finally {
      currentPlacement = previousPlacement;
    }
  }
  let rootPattern = {
    in: rootAddr,
  };
  let resolvePlacement = (placement, options) =>
    parsePlacementOptions(options)
      ? rootPattern
      : {
          in: placement.in,
        };
  let makeFrozenWords = vmModule_2.runInContext(
    "(() => { const freeze = Object.freeze; return (put, read, on, retract, agent, workflow) => freeze({ put, read, on, retract, agent, workflow }) })()",
    vmContext,
  );
  function runGuarded(thunk) {
    let settled;
    try {
      settled = settle(thunk());
    } catch (error) {
      return Promise.reject(describeThrown(error));
    }
    return settled.then(
      (settledValue) => publicValue(settledValue.v),
      (error) => {
        throw describeThrown(error);
      },
    );
  }
  function describeThrown(error) {
    return toTelemetryError(vmErrorDescriber(error));
  }
  function toTelemetryError(described) {
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      described.message ? `${described.name}: ${described.message}` : described.name,
      "workflow v2: VM code threw",
    );
  }
  function publicValue(value) {
    let sanitized = sanitize(value);
    if (sanitized === null || typeof sanitized !== "object") return sanitized;
    let json = jsonStringify(sanitized);
    return json === undefined ? undefined : jsonParse(json);
  }
  function assertFunction(candidate, message) {
    if (typeof candidate !== "function")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        message,
        "workflow v2: word expected a function",
      );
  }
  let isAborted = () => killSignal.aborted || scopeSignal?.aborted === true;
  let isScopeIdle = (placement) => placement.memo === "chain" && world.rows[rootAddr]?.status !== "pending";
  let readWord = guard((patternInput) => {
    if (isAborted()) return clone([]);
    let pattern = parsePattern(publicValue(patternInput) ?? {});
    return clone(world.read(pattern, rootPattern).map(toPublicRow));
  });
  function isDeadScope(placement) {
    return isAborted() || (world.isRetractedScope(placement.in) && !isLiveAddr(placement));
  }
  function putWord(thunk) {
    return guard((factInput, optsInput) => {
      let placement = thunk();
      if (isDeadScope(placement)) return -1;
      let parsedPlacement = resolvePlacement(placement, publicValue(optsInput));
      if (world.isRetractedScope(parsedPlacement.in)) return -1;
      return world.put(parseFact(publicValue(factInput)), placement.by, parsedPlacement);
    });
  }
  function onWord(thunk) {
    return guard((patternInput, handler, optsInput) => {
      let placement = thunk();
      if (isDeadScope(placement)) return -1;
      let atLeastPattern = parseAtLeastPattern(publicValue(patternInput) ?? {});
      assertFunction(handler, "on() expects a function");
      let parsedPlacement = resolvePlacement(placement, publicValue(optsInput));
      if (world.isRetractedScope(parsedPlacement.in)) return -1;
      let ruleId = -1;
      ruleId = world.on(
        atLeastPattern,
        (matchedRows, nextRows, rulePlacement, journal) => {
          let publicRows = isArray(matchedRows) ? matchedRows.map(toPublicRow) : toPublicRow(matchedRows);
          let rulePlacementObj = {
            by: `rule:${ruleId}`,
            in: rulePlacement,
            memo: "none",
          };
          weakMap_2.set(rulePlacementObj, journal);
          let publicJournal = makeRules(rulePlacementObj);
          return withPlacement(rulePlacementObj, () =>
            runGuarded(() => callFn(handler, clone(publicRows), clone(nextRows), publicJournal)),
          );
        },
        placement.by,
        parsedPlacement,
      );
      return ruleId;
    });
  }
  let weakMap = new WeakMap();
  let weakMap_2 = new WeakMap();
  function isLiveAddr(addr) {
    let rowIndex = weakMap.get(addr);
    if (rowIndex === undefined) return false;
    let row = world.rows[rowIndex];
    return row !== undefined && !world.isRetractedScope(row.in);
  }
  function retractWord(thunk) {
    return guard((targetAddr) => {
      if (typeof targetAddr !== "number" || !Number.isSafeInteger(targetAddr))
        throw TypeError("retract() expects an address (a number)");
      if (isAborted() || targetAddr === rootAddr || !world.within(targetAddr, rootAddr)) return false;
      let placement = thunk();
      if (!isLiveAddr(placement) && world.isRetractedScope(placement.in)) return false;
      let withinTarget = world.within(placement.in, targetAddr);
      let journalHandle = withinTarget ? weakMap_2.get(placement) : undefined;
      let lastAddr = withinTarget ? weakMap.get(placement) : undefined;
      journalHandle?.keep(targetAddr);
      let retractResult = world.retract(targetAddr);
      if (withinTarget && retractResult) {
        if (lastAddr === undefined || world.within(lastAddr, targetAddr)) weakMap.set(placement, targetAddr);
        journalHandle?.keep(weakMap.get(placement));
      } else if (withinTarget) journalHandle?.keep(lastAddr);
      return retractResult;
    });
  }
  let skippedAddrs = new Set();
  let agentErrors = new Map();
  function awaitSettled(addr) {
    return world.settled(addr).then((settled) => {
      switch (settled.status) {
        case "done":
          return clone(settled.value);
        case "failed": {
          if (skippedAddrs.has(addr)) return null;
          let sealedError = agentErrors.get(addr);
          if (sealedError) throw createSealedError(sealedError.message, sealedError.name);
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            settled.error ?? "agent failed",
            "workflow v2: awaited agent failed",
          );
        }
        case "retracted":
          if (killSignal.aborted)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              "Workflow aborted",
              "workflow v2: awaited agent retracted by kill",
            );
          if (scopeSignal?.aborted) return new Promise(() => {});
          return null;
        default:
          return null;
      }
    });
  }
  let identityHostFn = asyncWrap(wrapHostFnForVm(async (value) => value));
  let neverPromise = vmModule_2.runInContext(
    "(() => { const P = Promise; return () => new P(() => {}) })()",
    vmContext,
  );
  function agentWord(thunk) {
    return guard((prompt, optsInput) => {
      if (isAborted()) return callFn(neverPromise);
      let placement = thunk();
      if (isScopeIdle(placement)) return callFn(neverPromise);
      if (!isLiveAddr(placement) && world.isRetractedScope(placement.in)) return callFn(identityHostFn, null);
      let opts = publicValue(optsInput);
      let optsObject = opts !== null && typeof opts === "object" && !Array.isArray(opts) ? opts : {};
      let promptText = hostContext.vmToStr(prompt);
      let label =
        typeof optsObject.label === "string"
          ? optsObject.label
          : truncateToLength(promptText, 60).replace(/\s+/g, " ").trim();
      let fact =
        optsObject.fact !== null && typeof optsObject.fact === "object" && !Array.isArray(optsObject.fact)
          ? optsObject.fact
          : {};
      let fact_2 = parseFact({
        ...fact,
        topic: "agent",
        label,
        ...(typeof optsObject.phase === "string" && {
          phase: optsObject.phase,
        }),
      });
      let agentPlacement = resolvePlacement(
        placement,
        optsObject.top === undefined
          ? undefined
          : {
              top: optsObject.top,
            },
      );
      if (world.isRetractedScope(agentPlacement.in)) return callFn(identityHostFn, null);
      let agentAddr = world.rows.length;
      let evalReturn = world.eval(
        fact_2,
        (abortSignal) =>
          hooks.agent(prompt, optsInput, abortSignal, spawnMemoFor(placement), scopeSignal).then(
            (agentResult) => {
              if (agentResult === null || agentResult === undefined) {
                skippedAddrs.add(agentAddr);
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  "agent produced no result (skipped, blocked, or gave up after retries)",
                  "workflow v2: agent resolved without a result",
                );
              }
              return publicValue(agentResult);
            },
            (error) => {
              let describedError = vmErrorDescriber(error);
              agentErrors.set(agentAddr, describedError);
              throw toTelemetryError(describedError);
            },
          ),
        placement.by,
        agentPlacement,
      );
      return callFn(identityHostFn, awaitSettled(evalReturn));
    });
  }
  function spawnMemoFor(placement) {
    if (placement.memo === "none") return new WorkflowJournalStub();
    if (inheritedSpawnMemo !== undefined) return inheritedSpawnMemo;
    let rootRow = world.rows[rootAddr];
    return rootRow === undefined || rootRow.status === "pending" ? undefined : new WorkflowJournalStub();
  }
  let getPlacement = () => currentPlacement;
  hostContext.childSpawnMemoRef.get = () => spawnMemoFor(currentPlacement);
  let boundPut = putWord(getPlacement);
  let boundOn = onWord(getPlacement);
  let boundRetract = retractWord(getPlacement);
  let boundAgent = agentWord(getPlacement);
  function makeRules(placement) {
    let scopedPlacement = () => (currentPlacement === defaultPlacement ? placement : currentPlacement);
    return makeFrozenWords(
      putWord(scopedPlacement),
      readWord,
      onWord(scopedPlacement),
      retractWord(scopedPlacement),
      agentWord(scopedPlacement),
      workflowWord(scopedPlacement),
    );
  }
  let varWord = guard((name) => {
    if (typeof name !== "string" || name === "")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "v(name) expects a non-empty string",
        "workflow v2: v() expects a name",
      );
    return clone({
      $var: name,
    });
  });
  let atleastWord = guard((count, patternInput) => {
    let of = parsePattern(publicValue(patternInput) ?? {});
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "atleast(N, pattern) expects a non-negative integer",
        "workflow v2: atleast() expects a count",
      );
    return clone({
      $atleast: count,
      of,
    });
  });
  for (let [wordName, wordFn] of [
    ["put", boundPut],
    ["read", readWord],
    ["on", boundOn],
    ["retract", boundRetract],
    ["agent", boundAgent],
    ["v", varWord],
    ["atleast", atleastWord],
    [WORKFLOW_VM_WORDS, guard(() => makeRules(currentPlacement))],
  ])
    Object.defineProperty(vmContext, wordName, {
      value: wordFn,
      writable: false,
      enumerable: true,
      configurable: false,
    });
  let childTimers = new Set();
  let { workflow, cut } = scopeSignal
    ? {
        workflow: () => rejectNestedWorkflow(),
        cut: () => {},
      }
    : createWorkflowHostApi({
        ctx: hostContext,
        world,
        killSignal,
        installWords: (childWorld, childAddr, scopeSignal, inheritedSpawnMemo) => {
          createWorldBindings(childWorld, world, childAddr, killSignal, {
            scopeSignal,
            inheritedSpawnMemo,
          });
        },
        registerTimers: (timers) => {
          childTimers.add(timers);
        },
        errorInfo: vmErrorDescriber,
      });
  function workflowWord(getPlacement) {
    return guard((scriptRef, args) => {
      if (isAborted()) return callFn(neverPromise);
      let placement = getPlacement();
      if (isScopeIdle(placement)) return callFn(neverPromise);
      if (isDeadScope(placement)) return callFn(identityHostFn, null);
      let childCall = {
        in: placement.in,
        by: placement.by,
        spawnMemo: spawnMemoFor(placement),
      };
      let wrappedWorkflow = asyncWrap(
        wrapHostFnForVm((scriptRef, args) => workflow(childCall, scriptRef, args)),
      );
      return callFn(wrappedWorkflow, scriptRef, args);
    });
  }
  Object.defineProperty(vmContext, "workflow", {
    value: workflowWord(getPlacement),
    writable: false,
    enumerable: true,
    configurable: false,
  });
  vmModule_2.runInContext("delete globalThis.eval", vmContext);
  return {
    as(by, body) {
      return withPlacement(
        {
          by,
          in: rootAddr,
          memo: "none",
        },
        body,
      );
    },
    clearChildTimers() {
      for (let timers of childTimers) timers.clear();
    },
    cutChild: cut,
  };
}
//@ chunk-kgbsr4tm.js:37707-37981 placement
/**
 * 等待 world 落定的超时（5 秒）。
 */
var MAX_RUN_LOGS = 1000;
var WORLD_SETTLE_TIMEOUT_MS = 5000;
var MODEL = "model";
var RUNAWAY_RUN_KILLED_TEXT =
  "killed (runaway): the run exceeded the per-run row cap \u2014 usually a rule putting the fact it fires on. Its facts are readable with read {status:'retracted'}; fix the rule (or split a genuinely larger workload) before launching again.";
//@ chunk-kgbsr4tm.js:37981-38034 placement
/**
 * 把停止原因规范成已知值，未知记为 unknown。
 */
function normalizeStopReason(reason) {
  return STOP_REASONS.find((workflowSize) => workflowSize === reason) ?? "unknown";
}
//@ chunk-kgbsr4tm.js:38034-49846 placement
/**
 * 一次工作流脚本运行：持有 VM 脚本、world、控制器与日志，负责启动、终止与收尾。
 */
class WorkflowScriptRun {
  runId;
  vmScript;
  world;
  controller = new AbortController();
  ctx;
  words;
  vmErrorInfo;
  logs = [];
  log(line) {
    if (this.logs.length < MAX_RUN_LOGS) this.logs.push(truncateMiddle(line));
  }
  sink;
  killed = false;
  killedSize;
  foreignArtifactContentAtKill = false;
  remoteControlDeviceReportAtKill = false;
  toolsUsedAtKill = [];
  scope = -1;
  priorScopes = [];
  retractPriorLives() {
    for (let priorScope of this.priorScopes) this.world.retract(priorScope);
  }
  reportedRows = 0;
  reportedLogs = 0;
  reportedFailures = 0;
  reopen;
  onUnfounded;
  constructor(runId, vmScript, world) {
    this.runId = runId;
    this.vmScript = vmScript;
    this.world = world;
  }
  static lost(runId, world, scope, priorScopes = []) {
    let run = new WorkflowScriptRun(runId, undefined, world);
    run.scope = scope;
    run.priorScopes = priorScopes;
    run.retractPriorLives();
    run.lostOnResume = true;
    let killRecord = run.killRecord();
    if (killRecord !== undefined || world.isRetractedScope(scope)) {
      run.kill("stop");
      if (killRecord !== undefined) run.killedSize = killRecord;
    }
    return run;
  }
  lostOnResume = false;
  get isLost() {
    return this.lostOnResume;
  }
  get founded() {
    return this.scope >= 0;
  }
  get isKilled() {
    return this.killed;
  }
  get carriedForeignArtifactContent() {
    return this.foreignArtifactContentAtKill || this.ctx?.hooks.getForeignArtifactContent() === true;
  }
  get carriedRemoteControlDeviceReport() {
    return this.remoteControlDeviceReportAtKill || this.ctx?.hooks.getRemoteControlDeviceReport() === true;
  }
  get isActive() {
    return this.scope >= 0 && !this.world.isIdle(this.scope);
  }
  state() {
    if (this.killed) return "killed";
    if (this.lostOnResume) return "lost";
    return this.isActive ? "open" : "settled";
  }
  get wasSteered() {
    return this.steered;
  }
  steered = false;
  afterKillReported = false;
  noteCallAfterKill(nextAction) {
    if (!this.killed || this.lostOnResume || this.afterKillReported || this.killedSize === undefined) return;
    this.afterKillReported = true;
    logFeatureOk("workflow_after_kill", {
      next_action: fromEnum(nextAction),
      seconds_since_kill: Math.round((Date.now() - this.killedSize.at) / 1000),
    });
  }
  msSinceLaunch() {
    let runRow = this.world.rows[this.scope];
    return runRow ? Date.now() - runRow.at : 0;
  }
  get pending() {
    return this.scope < 0 ? 0 : this.world.pending(this.scope);
  }
  status() {
    if (this.scope < 0)
      return {
        rows: 0,
        pending: 0,
      };
    return {
      rows: this.world.read(
        {},
        {
          in: this.scope,
        },
      ).length,
      pending: this.pending,
    };
  }
  kill(reason) {
    this.killed = true;
    this.controller.abort();
    if (this.scope >= 0 && !this.world.isRetractedScope(this.scope)) {
      let statusCounts = this.status();
      this.killedSize = {
        at: Date.now(),
        reason,
        ...statusCounts,
        rules: countWhere(
          this.world.read(
            {
              topic: "sub",
            },
            {
              in: this.scope,
            },
          ),
          (row) => row.kind === "sub",
        ),
        agents: this.ctx?.hooks.getAgentCount() ?? 0,
      };
      if (!this.lostOnResume)
        logFeatureOk("workflow_kill", {
          reason: fromEnum(reason),
          rows: statusCounts.rows,
          agents: this.killedSize.agents,
          ms_since_launch: this.msSinceLaunch(),
        });
      this.world.retract(this.scope);
      let { at, ...killFields } = this.killedSize;
      try {
        if (this.killRecord() === undefined)
          this.world.put(
            {
              topic: "run",
              runId: this.runId,
              killed: true,
              ...killFields,
            },
            "host",
            {
              in: HOST_SCOPE,
            },
          );
      } catch (error) {
        if (this.world.isFull)
          logForDebugging(`workflow v2: kill record for ${this.runId} skipped \u2014 the world is full`);
        else logError(error);
      }
    }
    this.foreignArtifactContentAtKill = this.carriedForeignArtifactContent;
    this.remoteControlDeviceReportAtKill = this.carriedRemoteControlDeviceReport;
    this.toolsUsedAtKill = this.ctx?.hooks.getToolsUsed() ?? [];
    this.ctx = undefined;
    this.words = undefined;
  }
  killRecord() {
    let row = this.killRecordRow();
    if (!row) return;
    return {
      at: finiteOrZero(row.at),
      reason: normalizeStopReason(row.fact.reason),
      rows: finiteOrZero(row.fact.rows),
      pending: finiteOrZero(row.fact.pending),
      rules: finiteOrZero(row.fact.rules),
      agents: finiteOrZero(row.fact.agents),
    };
  }
  cutUnawaitedScriptChildren() {
    let words = this.words;
    if (!words) return;
    for (let row of this.world.rows) {
      if (
        row.status === "retracted" ||
        row.by !== "script" ||
        row.in !== this.scope ||
        row.kind !== "eval" ||
        row.fact.topic !== "workflow" ||
        row.fact.child !== true
      )
        continue;
      if (row.status === "pending" || this.childHasOwnWork(row.addr)) words.cutChild(row.addr);
    }
  }
  childHasOwnWork(childAddr) {
    if (this.world.isIdle(childAddr)) return false;
    let rows = this.world.rows;
    for (let i = childAddr + 1; i < rows.length; i++) {
      let row = rows[i];
      if (
        !(row.status === "pending" || (row.kind === "sub" && !this.world.isIdle(row.addr))) ||
        !this.world.within(row.addr, childAddr) ||
        !isValidRuleRow(this.world, row, childAddr)
      )
        continue;
      return true;
    }
    return false;
  }
  killRecordRow() {
    return this.world
      .read(
        {
          topic: "run",
          runId: this.runId,
          killed: true,
        },
        {
          in: HOST_SCOPE,
        },
      )
      .find((row) => row.in === HOST_SCOPE && row.kind === "put" && row.by === "host");
  }
  async run(toolContext, canUseTool, sink, options) {
    this.sink = sink;
    let now = Date.now();
    if (this.scope < 0)
      try {
        let loadedJournal;
        try {
          loadedJournal = options.journal ? await options.journal.load() : undefined;
        } catch (error) {
          logFeatureBad("workflow_run", "journal_load_failed", {
            duration_ms: Date.now() - now,
          });
          throw error;
        }
        if (this.killed) {
          let durationMs = Date.now() - now;
          logFeatureSad("workflow_run", "killed", {
            agents: 0,
            rows: 0,
            duration_ms: durationMs,
            reopened: false,
            error_results: 0,
          });
          return {
            result: [],
            agentCount: 0,
            logs: [],
            failures: [],
            durationMs,
          };
        }
        try {
          this.found(toolContext, canUseTool, options, loadedJournal);
        } catch (error) {
          this.scope = -1;
          this.priorScopes = [];
          this.ctx = undefined;
          this.words = undefined;
          logFeatureBad("workflow_run", "founding_failed", {
            duration_ms: Date.now() - now,
          });
          throw error;
        }
      } finally {
        if (this.scope < 0) this.onUnfounded?.();
        this.onUnfounded = undefined;
      }
    await Promise.race([this.world.whenIdle(this.scope), this.aborted()]);
    this.ctx?.timers.clear();
    this.words?.clearChildTimers();
    let reportedRows = this.reportedRows;
    this.reportedRows = this.world.rows.length;
    let runRow = this.world.rows[this.scope];
    let errorText =
      runRow?.status === "failed" && this.scope >= reportedRows
        ? runRow.error
        : this.killedSize?.reason === "runaway" && !this.reportedRunaway
          ? RUNAWAY_RUN_KILLED_TEXT
          : undefined;
    let isRunaway = errorText === RUNAWAY_RUN_KILLED_TEXT;
    if (isRunaway) this.reportedRunaway = true;
    let scopePattern = {
      in: this.scope,
    };
    let isNewOwnRow = (row) => row.addr >= reportedRows && this.ownRow(row);
    let logs = this.logs.slice(this.reportedLogs);
    this.reportedLogs = this.logs.length;
    let hookFailures = this.ctx?.hooks.getFailures() ?? [];
    let filtered = this.world
      .read(
        {
          topic: "script",
          status: "failed",
        },
        scopePattern,
      )
      .filter((row) => isNewOwnRow(row) && row.addr !== this.scope);
    let sorted = [
      ...this.world.read(
        {
          topic: "workflow",
          status: "failed",
        },
        scopePattern,
      ),
      ...this.world.read(
        {
          topic: "workflow",
          status: "retracted",
        },
        scopePattern,
      ),
    ]
      .filter(
        (row) =>
          row.addr >= reportedRows &&
          row.kind === "eval" &&
          row.fact.child === true &&
          row.error !== undefined,
      )
      .sort((left, right) => left.addr - right.addr);
    let failures = [
      ...hookFailures.slice(this.reportedFailures),
      ...this.world
        .read(
          {
            topic: "error",
          },
          scopePattern,
        )
        .filter(isNewOwnRow)
        .map((row) => truncateMiddle(`error: ${jsonStringify(row.fact)}`)),
      ...filtered.map((row) => truncateMiddle(`script error: ${row.error ?? ""}`)),
      ...sorted.map((row) =>
        truncateMiddle(
          `${SMALL_TRIANGLE_RIGHT} ${typeof row.fact.name === "string" ? row.fact.name : typeof row.fact.scriptPath === "string" ? `workflow(${row.fact.scriptPath})` : "workflow()"}: ${row.error ?? ""}`,
        ),
      ),
    ];
    this.reportedFailures = hookFailures.length;
    let mapped = this.world
      .read(
        {
          topic: "result",
        },
        scopePattern,
      )
      .filter(isNewOwnRow)
      .map((row) => row.fact);
    let usedRunValue = mapped.length === 0 && runRow?.status === "done" && this.scope >= reportedRows;
    let runValue = usedRunValue ? runRow.value : undefined;
    let result = usedRunValue ? runValue : mapped.length === 0 && errorText !== undefined ? null : mapped;
    let resultItems = usedRunValue
      ? Array.isArray(runValue)
        ? runValue
        : runValue === undefined || runValue === null
          ? []
          : [runValue]
      : mapped;
    let result_2 = usedRunValue && Array.isArray(runValue) && runValue.length === 0 ? 1 : resultItems.length;
    let agentCount = this.killedSize?.agents ?? this.ctx?.hooks.getAgentCount() ?? 0;
    let toolsUsed = this.ctx?.hooks.getToolsUsed() ?? this.toolsUsedAtKill;
    let durationMs = Date.now() - now;
    this.logSettlement({
      result: result_2,
      errorResults: countWhere(resultItems, hasErrorField),
      scriptError: errorText === undefined ? undefined : isRunaway ? "runaway" : "script_failed",
      errors:
        countWhere(
          this.world.read(
            {
              topic: "error",
            },
            scopePattern,
          ),
          isNewOwnRow,
        ) +
        filtered.length +
        sorted.length,
      agentCount,
      durationMs,
    });
    return {
      result,
      agentCount,
      logs,
      failures,
      ...(this.carriedForeignArtifactContent && {
        foreignArtifactContent: true,
      }),
      ...(this.ctx?.hooks.getPluginSteered() !== false && {
        pluginSteered: true,
      }),
      ...(this.carriedRemoteControlDeviceReport && {
        remoteControlDeviceReport: true,
      }),
      ...(toolsUsed.length > 0 && {
        toolsUsed,
      }),
      usageLimitDenial: this.ctx?.hooks.takeUsageLimitDenial(),
      durationMs,
      ...(errorText !== undefined && {
        error: errorText,
      }),
    };
  }
  logSettlement(settlement) {
    let fields = {
      agents: settlement.agentCount,
      rows:
        this.killedSize?.rows ??
        this.world.read(
          {},
          {
            in: this.scope,
          },
        ).length,
      duration_ms: settlement.durationMs,
      reopened: this.settlements > 0,
      error_results: settlement.errorResults,
    };
    this.settlements++;
    if (settlement.scriptError !== undefined) {
      logFeatureBad("workflow_run", settlement.scriptError, fields);
      return;
    }
    if (this.killed) {
      logFeatureSad("workflow_run", "killed", fields);
      return;
    }
    if (settlement.result > settlement.errorResults) {
      logFeatureOk("workflow_run", {
        ...fields,
        rule_errors: settlement.errors,
      });
      return;
    }
    if (settlement.errorResults > 0) {
      logFeatureBad("workflow_run", "error_result", fields);
      return;
    }
    logFeatureSad("workflow_run", settlement.errors > 0 ? "rule_error" : "no_result", fields);
  }
  settlements = 0;
  reportedRunaway = false;
  requireOp(verb) {
    try {
      this.requireOpen();
      this.requireFounded();
    } catch (error) {
      logFeatureBad(
        "workflow_steer",
        this.killed ? "killed" : this.lostOnResume ? "lost_on_resume" : "not_founded",
        {
          verb: fromEnum(verb),
        },
      );
      throw error;
    }
  }
  put(fact) {
    this.requireOp("put");
    let addr = this.world.put(parseFact(fact), MODEL, {
      in: this.scope,
    });
    this.steered = true;
    return addr;
  }
  retract(addr) {
    this.requireOp("retract");
    if (addr === this.scope || !this.world.within(addr, this.scope)) return false;
    let retracted = this.world.retract(addr);
    if (retracted) this.steered = true;
    return retracted;
  }
  read(patternInput) {
    if (this.scope < 0) return [];
    let pattern = parsePattern(patternInput ?? {});
    return [...this.priorScopes, this.scope].flatMap((scopeAddr) =>
      this.world
        .read(pattern, {
          in: scopeAddr,
        })
        .map(toPublicRow),
    );
  }
  markSteer() {
    let snapshot = {
      rows: this.world.rows.length,
      retracted: 0,
      pendingAgents: new Set(),
    };
    for (let row of this.rowsInRun())
      if (row.status === "retracted") snapshot.retracted++;
      else if (row.status === "pending" && isAgentEvalRow(row)) snapshot.pendingAgents.add(row.addr);
    return snapshot;
  }
  reportSteer(verb, before) {
    if (this.scope < 0) return;
    let putCount = 0;
    let retractedCount = 0;
    let agentsSpawned = 0;
    let agentsAborted = 0;
    for (let row of this.rowsInRun()) {
      let isNew = row.addr >= before.rows;
      if (isNew && row.kind === "put") putCount++;
      if (row.status === "retracted") retractedCount++;
      if (!isAgentEvalRow(row)) continue;
      if (isNew) agentsSpawned++;
      if (row.status === "retracted" && (isNew || before.pendingAgents.has(row.addr))) agentsAborted++;
    }
    logFeatureOk("workflow_steer", {
      verb: fromEnum(verb),
      rows_put: putCount,
      rows_retracted: retractedCount - before.retracted,
      agents_spawned: agentsSpawned,
      agents_aborted: agentsAborted,
      ms_since_launch: this.msSinceLaunch(),
      run_state: fromEnum(this.state()),
    });
  }
  ownRow(row) {
    if (row.by === "host" && row.fact.topic === "error" && row.fact.kind === "rule") return true;
    if (!this.inChildWorkflow(row.addr)) return true;
    let ruleOrigin = resolveRuleOrigin(this.world, row, this.scope);
    return ruleOrigin !== undefined && !this.inChildWorkflow(ruleOrigin);
  }
  inChildWorkflow(addr) {
    return isInsideChildWorkflow(this.world, addr, this.scope);
  }
  rowsInRun() {
    if (this.scope < 0) return [];
    return this.world.rows.filter((row) => this.world.within(row.addr, this.scope));
  }
  beginScript(source) {
    this.requireOp("script");
    if (!this.ctx || !this.words) {
      logFeatureBad("workflow_steer", "no_context", {
        verb: lit("script"),
      });
      return {
        error: "run has no context yet",
      };
    }
    let compiled = compileWorkflowScript(source, {
      bindWords: true,
    });
    if (!compiled.ok) {
      logFeatureBad("workflow_steer", "compile_failed", {
        verb: lit("script"),
      });
      return {
        error: compiled.error,
      };
    }
    let addr = this.evalScript(
      compiled.vmScript,
      {
        topic: "script",
        via: MODEL,
      },
      MODEL,
      {
        in: this.scope,
      },
      MODEL,
    );
    this.steered = true;
    return {
      addr,
    };
  }
  async awaitScript(scriptAddr) {
    await Promise.race([this.world.settled(scriptAddr), sleep(WORLD_SETTLE_TIMEOUT_MS)]);
    let scriptRow = this.world.rows[scriptAddr];
    return scriptRow.status === "failed"
      ? {
          error: scriptRow.error,
        }
      : {};
  }
  async script(source) {
    let beginResult = this.beginScript(source);
    if ("error" in beginResult)
      return {
        error: beginResult.error,
      };
    let awaitResult = await this.awaitScript(beginResult.addr);
    return {
      addr: beginResult.addr,
      ...awaitResult,
    };
  }
  killReason() {
    return this.killedSize?.reason ?? this.killRecord()?.reason ?? "unknown";
  }
  requireOpen() {
    if (this.killed)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `workflow run ${this.runId} was killed`,
        "workflow v2: run op on a killed run",
      );
  }
  requireFounded() {
    if (this.scope < 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `workflow run ${this.runId} is not founded`,
        "workflow v2: run-op on an unfounded run",
      );
    if (this.lostOnResume)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `workflow run ${this.runId} was restored from the journal on resume; its rules and work are gone \u2014 read its facts, or launch again`,
        "workflow v2: run op on a lost run",
      );
  }
  aborted() {
    let signal = this.controller.signal;
    if (signal.aborted) return Promise.resolve();
    return new Promise((resolve) => {
      signal.addEventListener("abort", () => resolve(), {
        once: true,
      });
    });
  }
  found(toolContext, canUseTool, options, envMode) {
    let context = {
      ...toolContext,
      abortController: this.controller,
    };
    let hostContext = createWorkflowVmContext(
      context,
      canUseTool,
      (progress) => {
        if (progress.type === "progress" && progress.data.type === "workflow_log")
          this.log(progress.data.message);
        this.sink?.onProgress(progress);
      },
      this.runId,
      (agentKey, abort) => this.sink?.onAgentController(agentKey, abort),
      options.args,
      options.seedPhaseTitles,
      options.tokenBudget,
      options.journal,
      envMode,
      options.workflowName,
      options.invokingRequestId,
      options.parentPromptId,
      (rateLimitWait) => this.sink?.onRateLimitWait?.(rateLimitWait),
    );
    this.ctx = hostContext;
    this.vmErrorInfo = createVmErrorDescriber(hostContext.vmContext);
    this.priorScopes = this.world.rows
      .filter((row) => isFoundingScriptRow(row) && row.fact.runId === this.runId)
      .map((row) => row.addr);
    this.scope = this.world.rows.length;
    let unsubscribe = this.world.subscribe((event) => {
      if (event.kind === "runaway" && event.scope === this.scope) {
        unsubscribe();
        this.kill("runaway");
      }
    });
    this.controller.signal.addEventListener("abort", unsubscribe, {
      once: true,
    });
    try {
      this.words = createWorldBindings(hostContext, this.world, this.scope, this.controller.signal);
      if (!this.vmScript)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "a run restored from the journal cannot be founded",
          "workflow v2: found() on a lost run",
        );
      let foundingAddr = this.evalScript(
        this.vmScript,
        {
          topic: "script",
          founding: true,
          runId: this.runId,
        },
        "host",
        {
          in: HOST_SCOPE,
        },
      );
      if (foundingAddr !== this.scope)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `founding row landed at ${foundingAddr}, expected ${this.scope}`,
          "workflow v2: founding address mismatch",
        );
      this.retractPriorLives();
      let killRow = this.killRecordRow();
      if (killRow !== undefined) this.world.retract(killRow.addr);
      this.world.settled(this.scope).then((settled) => {
        if (settled.status === "retracted" || this.controller.signal.aborted) return;
        this.cutUnawaitedScriptChildren();
      });
    } catch (error) {
      unsubscribe();
      throw error;
    }
  }
  evalScript(vmScript, fact, by, placement, placementMode) {
    let ctx = this.ctx;
    let words = this.words;
    let runContext = {
      vmContext: ctx.vmContext,
      settle: ctx.vmBoundary.settle,
      sanitize: ctx.vmBoundary.sanitize,
      errorInfo: this.vmErrorInfo,
    };
    let runIt = () => runScriptInContext(vmScript, runContext);
    return this.world.eval(
      fact,
      () =>
        (placementMode === undefined ? runIt() : words.as(placementMode, runIt)).then((outcome) => {
          if (outcome.error)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              outcome.error,
              "workflow v2: script failed",
            );
          return outcome.value;
        }),
      by,
      placement,
    );
  }
}
//@ chunk-kgbsr4tm.js:49846-49956 placement
function isFoundingScriptRow(row) {
  return (
    row.in === HOST_SCOPE &&
    row.kind === "eval" &&
    row.by === "host" &&
    row.fact.topic === "script" &&
    row.fact.founding === true
  );
}
export { isFoundingScriptRow, WorkflowScriptRun, STOP_REASONS };

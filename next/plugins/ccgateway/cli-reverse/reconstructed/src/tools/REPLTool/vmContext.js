/**
 * tools/REPLTool/vmContext.ts
 *
 * VM 上下文建立与代码执行入口（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (5)
 * attribution: placement 5
 */
import "vm";
import * as vmModule_2 from "vm";
import { SubAgentContext } from "../../components/CtrlOToExpand.js";
import { IMPORT_UNAVAILABLE_SOURCE, isVmContextPoisoned } from "./vmHardening.js";
import { createVmRealm } from "../../plugins/functionHooks/vm/vmRealm.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { isHostError } from "../../utils/errors/hostError.js";

//@ chunk-n51jggtb.js:164711-164718 placement
/**
 * 预置 VM 上下文的缓存变量。
 */
var cachedImportModuleDynamically;
//@ chunk-n51jggtb.js:164718-164895 placement
/**
 * 惰性建立预置 VM 上下文。
 */
function getImportModuleDynamically() {
  if (cachedImportModuleDynamically !== undefined) return cachedImportModuleDynamically;
  let realm = SubAgentContext(
    {
      __proto__: null,
    },
    {
      codeGeneration: {
        strings: false,
        wasm: false,
      },
    },
  );
  let importModuleDynamically = vmModule_2.runInContext(IMPORT_UNAVAILABLE_SOURCE, realm);
  createVmRealm(realm, {
    importModuleDynamically,
  });
  cachedImportModuleDynamically = importModuleDynamically;
  return importModuleDynamically;
}
//@ chunk-n51jggtb.js:164895-164970 placement
/**
 * 在给定上下文中执行代码（带 importModuleDynamically）。
 */
function runInVm(code, vmContext, importHook) {
  return vmModule_2.runInContext(code, vmContext, {
    importModuleDynamically: importHook,
  });
}
//@ chunk-n51jggtb.js:164970-165057 placement
/**
 * 把 evals 控制器包成惰性 list/abort。
 */
function lazyEvals(getEvals) {
  let cached;
  let evals = () => (cached ??= getEvals());
  return {
    list: () => evals().list(),
    abort: (evalId) => evals().abort(evalId),
  };
}
//@ chunk-n51jggtb.js:181097-181745 placement
/**
 * VM 上下文被污染时统一处理：重置上下文并抛出“重跑”错误。
 */
function rethrowContextError(error, state, sessions, agentId, createSession) {
  if (isVmContextPoisoned(error)) {
    sessions.set(agentId, createSession());
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${error.message}. The REPL context was reset \u2014 rerun your code; ` +
        "global state (variables and functions) starts fresh.",
      "REPL context poisoned by non-configurable global; context reset",
    );
  }
  if (!isHostError(error)) {
    sessions.set(agentId, createSession());
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "This REPL call did not run: an earlier script changed globalThis (for example, its prototype) in a way that stops new calls from starting. The REPL context was reset, so variables and functions from earlier calls are gone. Rerun this call's code, and don't change globalThis itself again.",
      "REPL call setup threw a value from the script VM; context reset",
    );
  }
  throw error;
}
export { runInVm, getImportModuleDynamically, lazyEvals, rethrowContextError };

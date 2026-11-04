/**
 * services/workflow/vmGlobals.ts
 *
 * 2.1.316 新增：沙箱 VM 全局对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-41w44bgm.js (3)
 * attribution: placement 3
 */
import "vm";
import * as vmModule_2 from "vm";
import "vm";
import { VM_HOST_FN_WRAPPER, createVmRejectionWatcher } from "../../plugins/functionHooks/vm/vmRealm.js";
import { SWALLOWED_REJECTION_WARNING } from "./scriptSandbox.js";
import { describeBoundaryValue } from "../../plugins/functionHooks/vm/boundaryCopy.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { CLONE_DEPTH_THRESHOLD } from "../../utils/structuredCloneLimits.js";
import { sanitizeAndLogError } from "../../components/Feedback.js";

//@ chunk-41w44bgm.js:22524-22583 placement
/**
 * 把 VM 全局函数包成带拒绝告警的版本。
 */
function wrapVmGlobal(context) {
  let wrapper = VM_HOST_FN_WRAPPER(context);
  let vmRejectionWatcher = createVmRejectionWatcher(context, SWALLOWED_REJECTION_WARNING);
  return (fn) => vmRejectionWatcher(wrapper(fn));
}
//@ chunk-41w44bgm.js:22605-23538 placement
/**
 * 把 VM 上下文中的同步全局（log/phase/setTimeout/clearTimeout、console 各方法、budget 的 spent/remaining）用封装函数 n 包一层并以 VM 内冻结对象替换；缺少任一项时抛错。
 */
function sealSyncGlobalsInVM(context, wrapCallable) {
  let vmContext = context;
  let requireGlobal = (name, expectedType) => {
    let value = vmContext[name];
    if (typeof value !== expectedType || value === null)
      throw TypeError(
        "sealSyncGlobalsInVM: the context lacks one of log, phase, setTimeout, clearTimeout, console, budget \u2014 call it only on a context built by createWorkflowContext or createChildRealm",
      );
    return value;
  };
  let replaceGlobal = (name, value) =>
    Object.defineProperty(context, name, {
      ...Object.getOwnPropertyDescriptor(context, name),
      value,
    });
  for (let name of ["log", "phase", "setTimeout", "clearTimeout"])
    replaceGlobal(name, wrapCallable(requireGlobal(name, "function")));
  let { vmConsole, vmBudget } = vmModule_2.runInContext(
    `((freeze) => ({
      vmConsole: (log, info, debug, error, warn) => freeze({ __proto__: null, log, info, debug, error, warn }),
      vmBudget: (total, spent, remaining) => freeze({ __proto__: null, total, spent, remaining }),
    }))(Object.freeze)`,
    context,
  );
  let hostConsole = requireGlobal("console", "object");
  replaceGlobal(
    "console",
    vmConsole(
      wrapCallable(hostConsole.log),
      wrapCallable(hostConsole.info),
      wrapCallable(hostConsole.debug),
      wrapCallable(hostConsole.error),
      wrapCallable(hostConsole.warn),
    ),
  );
  let hostBudget = requireGlobal("budget", "object");
  replaceGlobal(
    "budget",
    vmBudget(hostBudget.total, wrapCallable(hostBudget.spent), wrapCallable(hostBudget.remaining)),
  );
}
//@ chunk-41w44bgm.js:23538-24305 placement
/**
 * 为工作流 VM 创建 console 对象：把参数格式化成字符串（对象经 sanitize 后 JSON 化，超长数组给提示），error/warn 加前缀，经回调输出。
 */
function createVmConsole(
  emit,
  bridges = {
    sanitize: (value) =>
      value === null || (typeof value !== "object" && typeof value !== "function") ? value : {},
    toStr: (value) => describeBoundaryValue(value),
  },
) {
  function formatArgs(args) {
    return args
      .map((arg) => {
        if (typeof arg === "string") return arg;
        if (arg === null || (typeof arg !== "object" && typeof arg !== "function"))
          try {
            return jsonStringify(arg);
          } catch {
            return `[${typeof arg}]`;
          }
        let fallbackText;
        try {
          let json = jsonStringify(bridges.sanitize(arg));
          if (json !== undefined && json !== "{}") return json;
          fallbackText = json ?? `[${typeof arg}]`;
        } catch (error) {
          let isTooDeep = false;
          try {
            let message = error?.message;
            isTooDeep = typeof message === "string" && message.includes("exceeds the maximum");
          } catch {}
          return isTooDeep
            ? `[${typeof arg}: array exceeds the ${CLONE_DEPTH_THRESHOLD}-element logging cap]`
            : `[${typeof arg}]`;
        }
        let text = bridges.toStr(arg);
        return text === "[object Object]" || text === "<unprintable>" ? fallbackText : text;
      })
      .join(" ");
  }
  let makeLogger = (prefix) => sanitizeAndLogError((...args) => emit(prefix + formatArgs(args)));
  return {
    __proto__: null,
    log: makeLogger(""),
    info: makeLogger(""),
    debug: makeLogger(""),
    error: makeLogger("[error] "),
    warn: makeLogger("[warn] "),
  };
}
export { createVmConsole, sealSyncGlobalsInVM, wrapVmGlobal };

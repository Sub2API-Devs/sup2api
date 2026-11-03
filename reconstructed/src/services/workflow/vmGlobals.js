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
import * as vmModule from "vm";
import * as vmModule_2 from "vm";
import * as vmModule_3 from "vm";
import { VM_HOST_FN_WRAPPER, createVmRejectionWatcher } from "../../plugins/functionHooks/vm/vmRealm.js";
import { SWALLOWED_REJECTION_WARNING } from "./scriptSandbox.js";
import { describeBoundaryValue } from "../../plugins/functionHooks/vm/boundaryCopy.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { CLONE_DEPTH_THRESHOLD } from "../../utils/structuredCloneLimits.js";
import { sanitizeAndLogError } from "../../components/Feedback.js";

//@ chunk-41w44bgm.js:22524-22583 placement
function Kn(e) {
  let n = VM_HOST_FN_WRAPPER(e),
    r = createVmRejectionWatcher(e, SWALLOWED_REJECTION_WARNING);
  return (h) => r(n(h));
}
/**
 * 把 VM 上下文中的同步全局（log/phase/setTimeout/clearTimeout、console 各方法、budget 的 spent/remaining）用封装函数 n 包一层并以 VM 内冻结对象替换；缺少任一项时抛错。
 */
//@ chunk-41w44bgm.js:22605-23538 placement
function sealSyncGlobalsInVM(context, wrapCallable) {
  let r = context,
    requireGlobal = (he, ke) => {
      let te = r[he];
      if (typeof te !== ke || te === null)
        throw TypeError(
          "sealSyncGlobalsInVM: the context lacks one of log, phase, setTimeout, clearTimeout, console, budget \u2014 call it only on a context built by createWorkflowContext or createChildRealm",
        );
      return te;
    },
    replaceGlobal = (he, ke) =>
      Object.defineProperty(context, he, { ...Object.getOwnPropertyDescriptor(context, he), value: ke });
  for (let he of ["log", "phase", "setTimeout", "clearTimeout"])
    replaceGlobal(he, wrapCallable(requireGlobal(he, "function")));
  let { vmConsole: vmConsole, vmBudget: vmBudget } = vmModule_3.runInContext(
      `((freeze) => ({
      vmConsole: (log, info, debug, error, warn) => freeze({ __proto__: null, log, info, debug, error, warn }),
      vmBudget: (total, spent, remaining) => freeze({ __proto__: null, total, spent, remaining }),
    }))(Object.freeze)`,
      context,
    ),
    hostConsole = requireGlobal("console", "object");
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
/**
 * 为工作流 VM 创建 console 对象：把参数格式化成字符串（对象经 sanitize 后 JSON 化，超长数组给提示），error/warn 加前缀，经回调输出。
 */
//@ chunk-41w44bgm.js:23538-24305 placement
function createVmConsole(
  e,
  n = {
    sanitize: (r) => (r === null || (typeof r !== "object" && typeof r !== "function") ? r : {}),
    toStr: (r) => describeBoundaryValue(r),
  },
) {
  function r(T) {
    return T.map((y) => {
      if (typeof y === "string") return y;
      if (y === null || (typeof y !== "object" && typeof y !== "function"))
        try {
          return jsonStringify(y);
        } catch {
          return `[${typeof y}]`;
        }
      let A;
      try {
        let j = jsonStringify(n.sanitize(y));
        if (j !== void 0 && j !== "{}") return j;
        A = j ?? `[${typeof y}]`;
      } catch (error) {
        let he = !1;
        try {
          let ke = error?.message;
          he = typeof ke === "string" && ke.includes("exceeds the maximum");
        } catch {}
        return he
          ? `[${typeof y}: array exceeds the ${CLONE_DEPTH_THRESHOLD}-element logging cap]`
          : `[${typeof y}]`;
      }
      let toStr = n.toStr(y);
      return toStr === "[object Object]" || toStr === "<unprintable>" ? A : toStr;
    }).join(" ");
  }
  let h = (T) => sanitizeAndLogError((...y) => e(T + r(y)));
  return { __proto__: null, log: h(""), info: h(""), debug: h(""), error: h("[error] "), warn: h("[warn] ") };
}

export { createVmConsole, sealSyncGlobalsInVM, Kn };

/**
 * services/workflow/scriptSandbox.ts
 *
 * 2.1.316 新增：工作流脚本沙箱 VM
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kd2wbncj.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import "vm";
import * as vmModule_2 from "vm";
import "vm";
import { jsonStringify, alwaysTrue } from "../../utils/slowOperations.js";
import { sanitizeAndLogError } from "../../components/Feedback.js";
import { require_acorn } from "../../../vendor/acorn/dist/acorn.js";
import { require_walk } from "../../../vendor/acorn-walk/dist/walk.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { createSealedError } from "../../plugins/functionHooks/vm/vmRealm.js";
import { registerSwallowedRejectionObserver } from "../../utils/shutdown/pendingWrites.js";

//@ chunk-kd2wbncj.js:6325-6522 placement
function slashTokenSpan({ token, tokenTypes, source, offset }) {
  let isRegexp = token.type === tokenTypes.regexp;
  let isSlashLike =
    (token.type === tokenTypes.slash || token.type === tokenTypes.assign) && source[token.start] === "/";
  if (!isRegexp && !isSlashLike) return;
  return {
    start: token.start - offset,
    end: token.end - offset,
    regex: isRegexp,
  };
}
//@ chunk-kd2wbncj.js:6522-6769 placement
/**
 * 二分查找第一个"既可读作正则又可读作除号"的斜杠 token：逐步把前 count 个斜杠替换成无歧义写法，看引擎能否解析；全部能解析返回 -1。
 */
function firstAmbiguousSlashIndex({ text, tokens, engineParses }) {
  if (
    tokens.length === 0 ||
    parsesWithSlashesRewritten({
      text,
      tokens,
      count: tokens.length,
      engineParses,
    })
  )
    return -1;
  engineParses(text);
  let low = 1;
  let high = tokens.length;
  while (low < high) {
    let mid = (low + high) >>> 1;
    if (
      parsesWithSlashesRewritten({
        text,
        tokens,
        count: mid,
        engineParses,
      })
    )
      low = mid + 1;
    else high = mid;
  }
  return low - 1;
}
//@ chunk-kd2wbncj.js:6769-7012 placement
function parsesWithSlashesRewritten({ text, tokens, count, engineParses }) {
  let parts = [];
  let cursor = 0;
  for (let token of tokens.slice(0, count)) {
    parts.push(
      text.slice(cursor, token.start),
      token.regex ? "/a/.source" : `%${text.slice(token.start + 1, token.end)}`,
    );
    cursor = token.end;
  }
  parts.push(text.slice(cursor));
  try {
    engineParses(parts.join(""));
    return true;
  } catch {
    return false;
  }
}
//@ chunk-kd2wbncj.js:7012-7106 placement
/**
 * 去掉对象原型链与 constructor/prototype 后再交进 VM。
 */
function sealPrototype(fn) {
  Object.setPrototypeOf(fn, null);
  delete fn.constructor;
  delete fn.prototype;
  return fn;
}
//@ chunk-kd2wbncj.js:7106-8354 placement
/**
 * 工作流脚本 VM 的确定性垫片：禁用 Date.now()/new Date()/Math.random()（会破坏恢复），Vs 为注入 VM 的垫片源码。
 */
var DATE_NOW_UNAVAILABLE =
  "Date.now() / new Date() are unavailable in workflow scripts (breaks resume). Stamp results after the workflow returns, or pass timestamps via args.";
var MATH_RANDOM_UNAVAILABLE =
  "Math.random() is unavailable in workflow scripts (breaks resume). For N independent samples, include the index in the agent label or prompt.";
var DETERMINISM_SHIM_SOURCE = `(() => {
      'use strict';
      const NOW_ERR = ${jsonStringify(DATE_NOW_UNAVAILABLE)};
      const RANDOM_ERR = ${jsonStringify(MATH_RANDOM_UNAVAILABLE)};
      Math.random = function random() { throw new Error(RANDOM_ERR) };
      const RealDate = Date;
      RealDate.now = function now() { throw new Error(NOW_ERR) };
      function ShimDate(...a) {
        if (!new.target) throw new Error(NOW_ERR); // bare Date() \u2192 now-string
        if (a.length === 0) throw new Error(NOW_ERR);
        return Reflect.construct(RealDate, a, new.target);
      }
      ShimDate.now = RealDate.now;
      ShimDate.parse = RealDate.parse;
      ShimDate.UTC = RealDate.UTC;
      ShimDate.prototype = RealDate.prototype;
      // Close the (new Date(x)).constructor backdoor to RealDate.now \u2014 point
      // .constructor at the shim, then freeze RealDate so it can't be undone.
      RealDate.prototype.constructor = ShimDate;
      Object.freeze(RealDate);
      globalThis.Date = ShimDate;
    })()`;
//@ chunk-kd2wbncj.js:8354-8391 placement
/**
 * 在给定 VM 上下文里装入确定性垫片（禁止 Date.now/Math.random）。
 */
function installDeterminismShim(context) {
  vmModule_2.runInContext(DETERMINISM_SHIM_SOURCE, context);
}
//@ chunk-kd2wbncj.js:8391-8405 placement
/**
 * 工作流脚本沙箱中止的超时。
 */
var VM_ABORT_TIMEOUT_MS = 30000;
//@ chunk-kd2wbncj.js:8405-8893 placement
/**
 * 为工作流 VM 提供 setTimeout/clearTimeout：只记录本 VM 创建的定时器，signal 中断时全部清除；回调经可替换的 VM 调用器执行。
 */
function createVmTimers(signal) {
  let timerIds = new Set();
  let invoke = (callback) => callback();
  function clearAll() {
    for (let timerId of timerIds) clearTimeout(timerId);
    timerIds.clear();
  }
  signal?.addEventListener("abort", clearAll, {
    once: true,
  });
  return {
    clear: clearAll,
    setTimeout: sanitizeAndLogError((callback, delay) => {
      if (signal?.aborted) return 0;
      let delayMs = typeof delay === "number" ? delay : typeof delay === "string" ? +delay || 0 : 0;
      let timerId = Number(
        setTimeout(() => {
          try {
            invoke(callback);
          } catch {}
        }, delayMs),
      );
      timerIds.add(timerId);
      return timerId;
    }),
    clearTimeout: sanitizeAndLogError((handle) => {
      if (typeof handle === "number" || typeof handle === "string") {
        let timerId = typeof handle === "number" ? handle : +handle;
        if (timerIds.has(timerId)) {
          timerIds.delete(timerId);
          clearTimeout(timerId);
        }
      }
    }),
    bindVMInvoke: (fn) => {
      invoke = fn;
    },
  };
}
//@ chunk-kd2wbncj.js:8893-8991 placement
/**
 * 工作流 VM 注入代码用的全局名前缀与相关变量名。
 */
var WORKFLOW_VM_PREFIX = "__wRg$";
var WORKFLOW_VM_WORDS = `${WORKFLOW_VM_PREFIX}words`;
var WORKFLOW_VM_BOUND_NAMES = "{put, read, on, retract, agent, workflow}";
var WORKFLOW_VM_RESOLVE = `${WORKFLOW_VM_PREFIX}resolve`;
//@ chunk-kd2wbncj.js:8991-9187 placement
/**
 * 在工作流 VM 全局对象上定义只读的 Promise.resolve 引用，供改写后的代码使用。
 */
function defineVmPromiseResolve(context) {
  vmModule_2.runInContext(
    `Object.defineProperty(globalThis, ${jsonStringify(WORKFLOW_VM_RESOLVE)}, {
      value: Promise.resolve.bind(Promise),
      writable: false, enumerable: false, configurable: false,
    })`,
    context,
  );
}
//@ chunk-kd2wbncj.js:9187-10999 placement
/**
 * 用 acorn 解析工作流脚本（包成 async IIFE）：可选检查正则/除号歧义；遍历 AST 拒绝保留标识符前缀、with、import()、及其他不支持的语法，并改写部分节点后返回源码。
 */
function compileWorkflowScriptBody(script) {
  let { parse, tokTypes } = require_acorn();
  let walk = require_walk();
  let prefix = `(async () => {'use strict';
`;
  let wrapped = `(async () => {'use strict';
${script}
})()`;
  let slashTokenHook = readFlagWithOverride("tengu_steady_metcalfe", {
    safe: true,
  });
  let slashSpans = [];
  let ast = parse(wrapped, {
    ecmaVersion: "latest",
    sourceType: "script",
    allowHashBang: true,
    onToken: slashTokenHook
      ? (token) => {
          let span = slashTokenSpan({
            token,
            tokenTypes: tokTypes,
            source: wrapped,
            offset: 28,
          });
          if (span) slashSpans.push(span);
        }
      : undefined,
  });
  if (slashTokenHook) assertNoAmbiguousSlash(script, slashSpans);
  walk.full(ast, (node) => {
    if (node.name?.startsWith(WORKFLOW_VM_PREFIX))
      throw SyntaxError(`Identifier '${node.name}' is reserved.`);
    if (node.type === "WithStatement")
      throw SyntaxError("'with' statements are not supported in workflow scripts.");
    if (node.type === "ImportExpression") throw SyntaxError("import() is not available in workflow scripts.");
  });
  let edits = [];
  let wrapAwait = (argument) => {
    if (!argument) return;
    edits.push([argument.start, ` ${WORKFLOW_VM_PREFIX}((`], [argument.end, "))"]);
  };
  let findEnclosingFunction = (ancestors) => {
    for (let idx = ancestors.length - 2; idx >= 0; idx--) {
      let ancestor = ancestors[idx];
      if (
        ancestor &&
        (ancestor.type === "FunctionDeclaration" ||
          ancestor.type === "FunctionExpression" ||
          ancestor.type === "ArrowFunctionExpression")
      )
        return ancestor;
    }
    return;
  };
  walk.ancestor(ast, {
    VariableDeclaration(node) {
      if (node.kind === "await using")
        throw SyntaxError("'await using' declarations are not supported in workflow scripts.");
    },
    AwaitExpression(node) {
      wrapAwait(node.argument);
    },
    ArrowFunctionExpression(node) {
      if (node.async && node.expression) wrapAwait(node.body);
    },
    ForOfStatement(node) {
      if (node.await) edits.push([node.right.start, ` ${WORKFLOW_VM_PREFIX}a((`], [node.right.end, "))"]);
    },
    ReturnStatement(node, state, ancestors) {
      let fn = findEnclosingFunction(ancestors);
      if (!fn?.async) return;
      if (fn.generator) {
        if (node.argument)
          edits.push([node.argument.start, ` await ${WORKFLOW_VM_PREFIX}((`], [node.argument.end, "))"]);
      } else wrapAwait(node.argument);
    },
    YieldExpression(node, state, ancestors) {
      let fn = findEnclosingFunction(ancestors);
      if (!(fn?.async && fn.generator)) return;
      if (node.delegate) {
        if (node.argument)
          edits.push([node.argument.start, ` ${WORKFLOW_VM_PREFIX}a((`], [node.argument.end, "))"]);
      } else wrapAwait(node.argument);
    },
  });
  if (edits.length === 0) return script;
  edits.sort((left, right) => right[0] - left[0]);
  let rewritten = wrapped;
  for (let [offset, insert] of edits)
    rewritten = rewritten.slice(0, offset) + insert + rewritten.slice(offset);
  let sliced = rewritten.slice(28, rewritten.length - 5);
  if (slashTokenHook)
    assertNoAmbiguousSlash(script, slashSpans, {
      text: sliced,
      tokens: remapTokenOffsets(slashSpans, edits, 28),
    });
  return sliced;
}
//@ chunk-kd2wbncj.js:10999-11441 placement
/**
 * 非 Bun 运行时启动工作流脚本时的错误文案：说明工作流只在原生 claude 二进制（Bun）上运行，并报告当前是 Deno 还是 Node.js。
 */
var NOT_ON_BUN_MESSAGE = `Workflow scripts run only when Claude Code runs on Bun, the JavaScript runtime its native binary is built with. This process is not running on Bun (it reports ${process.versions.deno !== undefined ? `Deno ${process.versions.deno}` : `Node.js ${process.version}`}), so the script was not started. To use workflows, run the native \`claude\` binary (the Agent SDK launches it by default) rather than a JavaScript bundle under another runtime.`;
//@ chunk-kd2wbncj.js:11441-13237 placement
/**
 * 编译工作流脚本：非 Bun 运行时直接失败；校验语法后包装成带异步迭代辅助的工厂函数源码，可选绑定词表；返回 {ok, ...} 或 {ok:false, error}。
 */
function compileWorkflowScript(script, { bindWords = false } = {}) {
  if (!alwaysTrue()) {
    logFeatureBad("workflow_compile", "unsupported_runtime");
    return {
      ok: false,
      error: NOT_ON_BUN_MESSAGE,
    };
  }
  try {
    syntaxCheckScript(script);
    let body = compileWorkflowScriptBody(script);
    let boundNames = bindWords ? `, ${WORKFLOW_VM_BOUND_NAMES}` : "";
    let words = bindWords ? `, ${WORKFLOW_VM_WORDS}()` : "";
    let source = `((${WORKFLOW_VM_PREFIX} => ((${WORKFLOW_VM_PREFIX}a${boundNames}) => async () => {'use strict';
${body}
})(${WORKFLOW_VM_PREFIX}it => ({[Symbol.asyncIterator](){const ${WORKFLOW_VM_PREFIX}ai = ${WORKFLOW_VM_PREFIX}it[Symbol.asyncIterator];if (${WORKFLOW_VM_PREFIX}ai != null && typeof ${WORKFLOW_VM_PREFIX}ai !== 'function') throw new TypeError('@@asyncIterator is not a function');const ${WORKFLOW_VM_PREFIX}i = ${WORKFLOW_VM_PREFIX}ai != null ? ${WORKFLOW_VM_PREFIX}ai.call(${WORKFLOW_VM_PREFIX}it) : ${WORKFLOW_VM_PREFIX}it[Symbol.iterator]();if (${WORKFLOW_VM_PREFIX}i === null || (typeof ${WORKFLOW_VM_PREFIX}i !== 'object' && typeof ${WORKFLOW_VM_PREFIX}i !== 'function')) throw new TypeError('Iterator is not an object');const ${WORKFLOW_VM_PREFIX}nxt = ${WORKFLOW_VM_PREFIX}i.next;if (typeof ${WORKFLOW_VM_PREFIX}nxt !== 'function') throw new TypeError('Iterator.next is not a function');const ${WORKFLOW_VM_PREFIX}ret = ${WORKFLOW_VM_PREFIX}i.return;const ${WORKFLOW_VM_PREFIX}thr = ${WORKFLOW_VM_PREFIX}i.throw;const ${WORKFLOW_VM_PREFIX}w = s => ${WORKFLOW_VM_PREFIX}(s).then(s => { if (s === null || (typeof s !== 'object' && typeof s !== 'function')) throw new TypeError('Iterator result is not an object'); const done = s.done; return ${WORKFLOW_VM_PREFIX}(s.value).then(value => ({value, done})) });return {next:v=>${WORKFLOW_VM_PREFIX}w(${WORKFLOW_VM_PREFIX}nxt.call(${WORKFLOW_VM_PREFIX}i,v)),return:v=>${WORKFLOW_VM_PREFIX}w(typeof ${WORKFLOW_VM_PREFIX}ret==='function'?${WORKFLOW_VM_PREFIX}ret.call(${WORKFLOW_VM_PREFIX}i,v):{value:v,done:true}),throw:e=>typeof ${WORKFLOW_VM_PREFIX}thr==='function'?${WORKFLOW_VM_PREFIX}w(${WORKFLOW_VM_PREFIX}thr.call(${WORKFLOW_VM_PREFIX}i,e)):${WORKFLOW_VM_PREFIX}(typeof ${WORKFLOW_VM_PREFIX}ret==='function'?${WORKFLOW_VM_PREFIX}ret.call(${WORKFLOW_VM_PREFIX}i):undefined).then(()=>{throw new TypeError('The iterator does not provide a throw method')})}}})${words}))(${WORKFLOW_VM_RESOLVE}))()`;
    let vmScript = new vmModule_2.Script(source, {
      filename: "workflow.js",
      importModuleDynamically: () => {
        throw createSealedError("import() is not available in workflow scripts.");
      },
    });
    logFeatureOk("workflow_compile");
    return {
      ok: true,
      vmScript,
    };
  } catch (error) {
    logFeatureBad(
      "workflow_compile",
      error instanceof AmbiguousSlashError ? "slash_mismatch" : "syntax_error",
    );
    return {
      ok: false,
      error: `SyntaxError: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
//@ chunk-kd2wbncj.js:13237-13310 placement
/**
 * 用 Function 做一次纯语法检查（不执行）。
 */
function syntaxCheckScript(script) {
  Function(`async function _check() {'use strict';
${script}
}`);
}
//@ chunk-kd2wbncj.js:13310-13340 placement
/**
 * 斜杠歧义时抛出的语法错误类型。
 */
class AmbiguousSlashError extends SyntaxError {}
//@ chunk-kd2wbncj.js:13340-13837 placement
/**
 * 若脚本里有既可读作正则又可读作除号的 '/'，抛出带行列号的错误，提示用 ';' 结束前一语句或加括号。
 */
function assertNoAmbiguousSlash(script, spans, override) {
  let index = firstAmbiguousSlashIndex({
    text: override?.text ?? script,
    tokens: override?.tokens ?? spans,
    engineParses: syntaxCheckScript,
  });
  if (index === -1) return;
  let parts = script.slice(0, spans[index].start).split(/\r\n|[\n\r\u2028\u2029]/);
  let line = parts.length;
  let column = parts.at(-1).length + 1;
  throw new AmbiguousSlashError(
    `Line ${line}, column ${column} of the script body (counted after the meta statement, if any): this '/' could be read either as the start of a regular expression or as a division, so the script was not run. End the statement before it with ';' (or parenthesize the expression) so it reads one way.`,
  );
}
//@ chunk-kd2wbncj.js:13837-14062 placement
function remapTokenOffsets(spans, edits, baseOffset) {
  let remapped = [];
  let reduced = edits.reduce((acc, [, insert]) => acc + insert.length, 0);
  let editIndex = 0;
  for (let j = spans.length - 1; j >= 0; j--) {
    let span = spans[j];
    while (editIndex < edits.length && edits[editIndex][0] - baseOffset > span.start) {
      reduced -= edits[editIndex][1].length;
      editIndex++;
    }
    remapped[j] = {
      start: span.start + reduced,
      end: span.end + reduced,
      regex: span.regex,
    };
  }
  return remapped;
}
//@ chunk-kd2wbncj.js:14062-14566 placement
/**
 * 判断脚本源码是否使用 Date.now()、Math.random() 或无参 new Date()（解析失败返回 false）。
 */
function usesNondeterministicTime(source) {
  let { parse } = require_acorn();
  let walk = require_walk();
  let found = false;
  try {
    let ast = parse(source, {
      ecmaVersion: "latest",
      sourceType: "module",
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
    });
    walk.simple(ast, {
      MemberExpression(node) {
        if (node.computed || node.object.type !== "Identifier" || node.property.type !== "Identifier") return;
        let objectName = node.object.name;
        let propertyName = node.property.name;
        if (
          (objectName === "Date" && propertyName === "now") ||
          (objectName === "Math" && propertyName === "random")
        )
          found = true;
      },
      NewExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "Date" && node.arguments.length === 0)
          found = true;
      },
    });
  } catch {
    return false;
  }
  return found;
}
//@ chunk-kd2wbncj.js:14588-14789 placement
/**
 * 工作流吞掉未处理 Promise 拒绝时的警告（脚本留下了失败的 agent/parallel/pipeline/workflow 调用而未处理）。
 */
var SWALLOWED_REJECTION_WARNING = registerSwallowedRejectionObserver(
  "Workflow: swallowed an unhandled rejection (not exiting): a script left a promise that carries the reason of a failed agent(), parallel(), pipeline() or workflow() call without a handler",
);
export {
  usesNondeterministicTime,
  compileWorkflowScript,
  SWALLOWED_REJECTION_WARNING,
  installDeterminismShim,
  defineVmPromiseResolve,
  sealPrototype,
  VM_ABORT_TIMEOUT_MS,
  createVmTimers,
  WORKFLOW_VM_WORDS,
  NOT_ON_BUN_MESSAGE,
};

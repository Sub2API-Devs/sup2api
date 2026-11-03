/**
 * services/workflow/scriptSandbox.ts
 *
 * 2.1.316 新增：工作流脚本沙箱 VM
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-41w44bgm.js (19)
 * attribution: placement 19
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

//@ chunk-41w44bgm.js:14075-14272 placement
function slashTokenSpan({ token, tokenTypes, source, offset }) {
  let T = token.type === tokenTypes.regexp;
  let y =
    (token.type === tokenTypes.slash || token.type === tokenTypes.assign) && source[token.start] === "/";
  if (!T && !y) return;
  return {
    start: token.start - offset,
    end: token.end - offset,
    regex: T,
  };
}
//@ chunk-41w44bgm.js:14272-14519 placement
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
  let h = 1;
  let T = tokens.length;
  while (h < T) {
    let y = (h + T) >>> 1;
    if (
      parsesWithSlashesRewritten({
        text,
        tokens,
        count: y,
        engineParses,
      })
    )
      h = y + 1;
    else T = y;
  }
  return h - 1;
}
//@ chunk-41w44bgm.js:14519-14762 placement
function parsesWithSlashesRewritten({ text, tokens, count, engineParses }) {
  let T = [];
  let y = 0;
  for (let token of tokens.slice(0, count)) {
    T.push(
      text.slice(y, token.start),
      token.regex ? "/a/.source" : `%${text.slice(token.start + 1, token.end)}`,
    );
    y = token.end;
  }
  T.push(text.slice(y));
  try {
    engineParses(T.join(""));
    return true;
  } catch {
    return false;
  }
}
//@ chunk-41w44bgm.js:14762-14856 placement
/**
 * 去掉对象原型链与 constructor/prototype 后再交进 VM。
 */
function sealPrototype(e) {
  Object.setPrototypeOf(e, null);
  delete e.constructor;
  delete e.prototype;
  return e;
}
//@ chunk-41w44bgm.js:14856-16104 placement
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
//@ chunk-41w44bgm.js:16104-16141 placement
/**
 * 在给定 VM 上下文里装入确定性垫片（禁止 Date.now/Math.random）。
 */
function installDeterminismShim(e) {
  vmModule_2.runInContext(DETERMINISM_SHIM_SOURCE, e);
}
//@ chunk-41w44bgm.js:16141-16155 placement
/**
 * 工作流脚本沙箱中止的超时。
 */
var VM_ABORT_TIMEOUT_MS = 30000;
//@ chunk-41w44bgm.js:16155-16643 placement
/**
 * 为工作流 VM 提供 setTimeout/clearTimeout：只记录本 VM 创建的定时器，signal 中断时全部清除；回调经可替换的 VM 调用器执行。
 */
function createVmTimers(signal) {
  let n = new Set();
  let r = (T) => T();
  function h() {
    for (let T of n) clearTimeout(T);
    n.clear();
  }
  signal?.addEventListener("abort", h, {
    once: true,
  });
  return {
    clear: h,
    setTimeout: sanitizeAndLogError((T, y) => {
      if (signal?.aborted) return 0;
      let A = typeof y === "number" ? y : typeof y === "string" ? +y || 0 : 0;
      let L = Number(
        setTimeout(() => {
          try {
            r(T);
          } catch {}
        }, A),
      );
      n.add(L);
      return L;
    }),
    clearTimeout: sanitizeAndLogError((T) => {
      if (typeof T === "number" || typeof T === "string") {
        let y = typeof T === "number" ? T : +T;
        if (n.has(y)) {
          n.delete(y);
          clearTimeout(y);
        }
      }
    }),
    bindVMInvoke: (T) => {
      r = T;
    },
  };
}
//@ chunk-41w44bgm.js:16643-16741 placement
/**
 * 工作流 VM 注入代码用的全局名前缀与相关变量名。
 */
var WORKFLOW_VM_PREFIX = "__wRg$";
var WORKFLOW_VM_WORDS = `${WORKFLOW_VM_PREFIX}words`;
var WORKFLOW_VM_BOUND_NAMES = "{put, read, on, retract, agent, workflow}";
var WORKFLOW_VM_RESOLVE = `${WORKFLOW_VM_PREFIX}resolve`;
//@ chunk-41w44bgm.js:16741-16937 placement
/**
 * 在工作流 VM 全局对象上定义只读的 Promise.resolve 引用，供改写后的代码使用。
 */
function defineVmPromiseResolve(e) {
  vmModule_2.runInContext(
    `Object.defineProperty(globalThis, ${jsonStringify(WORKFLOW_VM_RESOLVE)}, {
      value: Promise.resolve.bind(Promise),
      writable: false, enumerable: false, configurable: false,
    })`,
    e,
  );
}
//@ chunk-41w44bgm.js:16937-18735 placement
/**
 * 用 acorn 解析工作流脚本（包成 async IIFE）：可选检查正则/除号歧义；遍历 AST 拒绝保留标识符前缀、with、import()、及其他不支持的语法，并改写部分节点后返回源码。
 */
function compileWorkflowScriptBody(script) {
  let { parse, tokTypes } = require_acorn();
  let h = require_walk();
  let T = `(async () => {'use strict';
`;
  let y = `(async () => {'use strict';
${script}
})()`;
  let flagWithOverride = readFlagWithOverride("tengu_steady_metcalfe", {
    safe: true,
  });
  let L = [];
  let j = parse(y, {
    ecmaVersion: "latest",
    sourceType: "script",
    allowHashBang: true,
    onToken: flagWithOverride
      ? (token) => {
          let ce = slashTokenSpan({
            token,
            tokenTypes: tokTypes,
            source: y,
            offset: 28,
          });
          if (ce) L.push(ce);
        }
      : undefined,
  });
  if (flagWithOverride) assertNoAmbiguousSlash(script, L);
  h.full(j, (G) => {
    if (G.name?.startsWith(WORKFLOW_VM_PREFIX)) throw SyntaxError(`Identifier '${G.name}' is reserved.`);
    if (G.type === "WithStatement")
      throw SyntaxError("'with' statements are not supported in workflow scripts.");
    if (G.type === "ImportExpression") throw SyntaxError("import() is not available in workflow scripts.");
  });
  let he = [];
  let ke = (argument) => {
    if (!argument) return;
    he.push([argument.start, ` ${WORKFLOW_VM_PREFIX}((`], [argument.end, "))"]);
  };
  let te = (G) => {
    for (let idx = G.length - 2; idx >= 0; idx--) {
      let E = G[idx];
      if (
        E &&
        (E.type === "FunctionDeclaration" ||
          E.type === "FunctionExpression" ||
          E.type === "ArrowFunctionExpression")
      )
        return E;
    }
    return;
  };
  h.ancestor(j, {
    VariableDeclaration(G) {
      if (G.kind === "await using")
        throw SyntaxError("'await using' declarations are not supported in workflow scripts.");
    },
    AwaitExpression(G) {
      ke(G.argument);
    },
    ArrowFunctionExpression(G) {
      if (G.async && G.expression) ke(G.body);
    },
    ForOfStatement(G) {
      if (G.await) he.push([G.right.start, ` ${WORKFLOW_VM_PREFIX}a((`], [G.right.end, "))"]);
    },
    ReturnStatement(G, ce, E) {
      let s = te(E);
      if (!s?.async) return;
      if (s.generator) {
        if (G.argument) he.push([G.argument.start, ` await ${WORKFLOW_VM_PREFIX}((`], [G.argument.end, "))"]);
      } else ke(G.argument);
    },
    YieldExpression(G, ce, E) {
      let s = te(E);
      if (!(s?.async && s.generator)) return;
      if (G.delegate) {
        if (G.argument) he.push([G.argument.start, ` ${WORKFLOW_VM_PREFIX}a((`], [G.argument.end, "))"]);
      } else ke(G.argument);
    },
  });
  if (he.length === 0) return script;
  he.sort((G, ce) => ce[0] - G[0]);
  let me = y;
  for (let [G, ce] of he) me = me.slice(0, G) + ce + me.slice(G);
  let sliced = me.slice(28, me.length - 5);
  if (flagWithOverride)
    assertNoAmbiguousSlash(script, L, {
      text: sliced,
      tokens: remapTokenOffsets(L, he, 28),
    });
  return sliced;
}
//@ chunk-41w44bgm.js:18735-19177 placement
/**
 * 非 Bun 运行时启动工作流脚本时的错误文案：说明工作流只在原生 claude 二进制（Bun）上运行，并报告当前是 Deno 还是 Node.js。
 */
var NOT_ON_BUN_MESSAGE = `Workflow scripts run only when Claude Code runs on Bun, the JavaScript runtime its native binary is built with. This process is not running on Bun (it reports ${process.versions.deno !== undefined ? `Deno ${process.versions.deno}` : `Node.js ${process.version}`}), so the script was not started. To use workflows, run the native \`claude\` binary (the Agent SDK launches it by default) rather than a JavaScript bundle under another runtime.`;
//@ chunk-41w44bgm.js:19177-20973 placement
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
    let r = compileWorkflowScriptBody(script);
    let h = bindWords ? `, ${WORKFLOW_VM_BOUND_NAMES}` : "";
    let T = bindWords ? `, ${WORKFLOW_VM_WORDS}()` : "";
    let y = `((${WORKFLOW_VM_PREFIX} => ((${WORKFLOW_VM_PREFIX}a${h}) => async () => {'use strict';
${r}
})(${WORKFLOW_VM_PREFIX}it => ({[Symbol.asyncIterator](){const ${WORKFLOW_VM_PREFIX}ai = ${WORKFLOW_VM_PREFIX}it[Symbol.asyncIterator];if (${WORKFLOW_VM_PREFIX}ai != null && typeof ${WORKFLOW_VM_PREFIX}ai !== 'function') throw new TypeError('@@asyncIterator is not a function');const ${WORKFLOW_VM_PREFIX}i = ${WORKFLOW_VM_PREFIX}ai != null ? ${WORKFLOW_VM_PREFIX}ai.call(${WORKFLOW_VM_PREFIX}it) : ${WORKFLOW_VM_PREFIX}it[Symbol.iterator]();if (${WORKFLOW_VM_PREFIX}i === null || (typeof ${WORKFLOW_VM_PREFIX}i !== 'object' && typeof ${WORKFLOW_VM_PREFIX}i !== 'function')) throw new TypeError('Iterator is not an object');const ${WORKFLOW_VM_PREFIX}nxt = ${WORKFLOW_VM_PREFIX}i.next;if (typeof ${WORKFLOW_VM_PREFIX}nxt !== 'function') throw new TypeError('Iterator.next is not a function');const ${WORKFLOW_VM_PREFIX}ret = ${WORKFLOW_VM_PREFIX}i.return;const ${WORKFLOW_VM_PREFIX}thr = ${WORKFLOW_VM_PREFIX}i.throw;const ${WORKFLOW_VM_PREFIX}w = s => ${WORKFLOW_VM_PREFIX}(s).then(s => { if (s === null || (typeof s !== 'object' && typeof s !== 'function')) throw new TypeError('Iterator result is not an object'); const done = s.done; return ${WORKFLOW_VM_PREFIX}(s.value).then(value => ({value, done})) });return {next:v=>${WORKFLOW_VM_PREFIX}w(${WORKFLOW_VM_PREFIX}nxt.call(${WORKFLOW_VM_PREFIX}i,v)),return:v=>${WORKFLOW_VM_PREFIX}w(typeof ${WORKFLOW_VM_PREFIX}ret==='function'?${WORKFLOW_VM_PREFIX}ret.call(${WORKFLOW_VM_PREFIX}i,v):{value:v,done:true}),throw:e=>typeof ${WORKFLOW_VM_PREFIX}thr==='function'?${WORKFLOW_VM_PREFIX}w(${WORKFLOW_VM_PREFIX}thr.call(${WORKFLOW_VM_PREFIX}i,e)):${WORKFLOW_VM_PREFIX}(typeof ${WORKFLOW_VM_PREFIX}ret==='function'?${WORKFLOW_VM_PREFIX}ret.call(${WORKFLOW_VM_PREFIX}i):undefined).then(()=>{throw new TypeError('The iterator does not provide a throw method')})}}})${T}))(${WORKFLOW_VM_RESOLVE}))()`;
    let vmScript = new vmModule_2.Script(y, {
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
//@ chunk-41w44bgm.js:20973-21046 placement
/**
 * 用 Function 做一次纯语法检查（不执行）。
 */
function syntaxCheckScript(script) {
  Function(`async function _check() {'use strict';
${script}
}`);
}
//@ chunk-41w44bgm.js:21046-21076 placement
/**
 * 斜杠歧义时抛出的语法错误类型。
 */
class AmbiguousSlashError extends SyntaxError {}
//@ chunk-41w44bgm.js:21076-21573 placement
/**
 * 若脚本里有既可读作正则又可读作除号的 '/'，抛出带行列号的错误，提示用 ';' 结束前一语句或加括号。
 */
function assertNoAmbiguousSlash(script, n, r) {
  let h = firstAmbiguousSlashIndex({
    text: r?.text ?? script,
    tokens: r?.tokens ?? n,
    engineParses: syntaxCheckScript,
  });
  if (h === -1) return;
  let parts = script.slice(0, n[h].start).split(/\r\n|[\n\r\u2028\u2029]/);
  let y = parts.length;
  let A = parts.at(-1).length + 1;
  throw new AmbiguousSlashError(
    `Line ${y}, column ${A} of the script body (counted after the meta statement, if any): this '/' could be read either as the start of a regular expression or as a division, so the script was not run. End the statement before it with ';' (or parenthesize the expression) so it reads one way.`,
  );
}
//@ chunk-41w44bgm.js:21573-21798 placement
function remapTokenOffsets(e, n, r) {
  let h = [];
  let reduced = n.reduce((acc, [, L]) => acc + L.length, 0);
  let y = 0;
  for (let j = e.length - 1; j >= 0; j--) {
    let L = e[j];
    while (y < n.length && n[y][0] - r > L.start) {
      reduced -= n[y][1].length;
      y++;
    }
    h[j] = {
      start: L.start + reduced,
      end: L.end + reduced,
      regex: L.regex,
    };
  }
  return h;
}
//@ chunk-41w44bgm.js:21798-22301 placement
/**
 * 判断脚本源码是否使用 Date.now()、Math.random() 或无参 new Date()（解析失败返回 false）。
 */
function usesNondeterministicTime(source) {
  let { parse } = require_acorn();
  let r = require_walk();
  let found = false;
  try {
    let T = parse(source, {
      ecmaVersion: "latest",
      sourceType: "module",
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
    });
    r.simple(T, {
      MemberExpression(y) {
        if (y.computed || y.object.type !== "Identifier" || y.property.type !== "Identifier") return;
        let A = y.object.name;
        let L = y.property.name;
        if ((A === "Date" && L === "now") || (A === "Math" && L === "random")) found = true;
      },
      NewExpression(y) {
        if (y.callee.type === "Identifier" && y.callee.name === "Date" && y.arguments.length === 0)
          found = true;
      },
    });
  } catch {
    return false;
  }
  return found;
}
//@ chunk-41w44bgm.js:22323-22524 placement
/**
 * 工作流吞掉未处理 Promise 拒绝时的警告（脚本留下了失败的 agent/parallel/pipeline/workflow 调用而未处理）。
 */
var SWALLOWED_REJECTION_WARNING = registerSwallowedRejectionObserver(
  "Workflow: swallowed an unhandled rejection (not exiting): a script left a promise that carries the reason of a failed agent(), parallel(), pipeline() or workflow() call without a handler",
);
export {
  SWALLOWED_REJECTION_WARNING,
  installDeterminismShim,
  defineVmPromiseResolve,
  sealPrototype,
  compileWorkflowScript,
  VM_ABORT_TIMEOUT_MS,
  createVmTimers,
  usesNondeterministicTime,
  WORKFLOW_VM_WORDS,
  NOT_ON_BUN_MESSAGE,
};

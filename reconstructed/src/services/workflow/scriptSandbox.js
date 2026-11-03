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
import * as vmModule from "vm";
import * as vmModule_2 from "vm";
import * as vmModule_3 from "vm";
import { jsonStringify, alwaysTrue } from "../../utils/slowOperations.js";
import { sanitizeAndLogError } from "../../components/Feedback.js";
import { k3t } from "../../../vendor/acorn/dist/acorn.js";
import { Ro } from "../../../vendor/acorn-walk/dist/walk.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { createSealedError } from "../../plugins/functionHooks/vm/vmRealm.js";
import { MVs } from "../../utils/shutdown/pendingWrites.js";

//@ chunk-41w44bgm.js:14075-14272 placement
function slashTokenSpan({ token: token, tokenTypes: tokenTypes, source: source, offset: offset }) {
  let T = token.type === tokenTypes.regexp,
    y = (token.type === tokenTypes.slash || token.type === tokenTypes.assign) && source[token.start] === "/";
  if (!T && !y) return;
  return { start: token.start - offset, end: token.end - offset, regex: T };
}
/**
 * 二分查找第一个"既可读作正则又可读作除号"的斜杠 token：逐步把前 count 个斜杠替换成无歧义写法，看引擎能否解析；全部能解析返回 -1。
 */
//@ chunk-41w44bgm.js:14272-14519 placement
function firstAmbiguousSlashIndex({ text: text, tokens: tokens, engineParses: engineParses }) {
  if (
    tokens.length === 0 ||
    parsesWithSlashesRewritten({
      text: text,
      tokens: tokens,
      count: tokens.length,
      engineParses: engineParses,
    })
  )
    return -1;
  engineParses(text);
  let h = 1,
    T = tokens.length;
  while (h < T) {
    let y = (h + T) >>> 1;
    if (parsesWithSlashesRewritten({ text: text, tokens: tokens, count: y, engineParses: engineParses }))
      h = y + 1;
    else T = y;
  }
  return h - 1;
}
//@ chunk-41w44bgm.js:14519-14762 placement
function parsesWithSlashesRewritten({
  text: text,
  tokens: tokens,
  count: count,
  engineParses: engineParses,
}) {
  let T = [],
    y = 0;
  for (let A of tokens.slice(0, count))
    (T.push(text.slice(y, A.start), A.regex ? "/a/.source" : `%${text.slice(A.start + 1, A.end)}`),
      (y = A.end));
  T.push(text.slice(y));
  try {
    return (engineParses(T.join("")), !0);
  } catch {
    return !1;
  }
}
//@ chunk-41w44bgm.js:14762-14856 placement
function Qt(e) {
  return (Object.setPrototypeOf(e, null), delete e.constructor, delete e.prototype, e);
}
/**
 * 工作流脚本 VM 的确定性垫片：禁用 Date.now()/new Date()/Math.random()（会破坏恢复），Vs 为注入 VM 的垫片源码。
 */
//@ chunk-41w44bgm.js:14856-16104 placement
var DATE_NOW_UNAVAILABLE =
    "Date.now() / new Date() are unavailable in workflow scripts (breaks resume). Stamp results after the workflow returns, or pass timestamps via args.",
  MATH_RANDOM_UNAVAILABLE =
    "Math.random() is unavailable in workflow scripts (breaks resume). For N independent samples, include the index in the agent label or prompt.",
  DETERMINISM_SHIM_SOURCE = `(() => {
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
function Jn(e) {
  vmModule.runInContext(DETERMINISM_SHIM_SOURCE, e);
}
//@ chunk-41w44bgm.js:16141-16155 placement
var sin = 30000;
/**
 * 为工作流 VM 提供 setTimeout/clearTimeout：只记录本 VM 创建的定时器，signal 中断时全部清除；回调经可替换的 VM 调用器执行。
 */
//@ chunk-41w44bgm.js:16155-16643 placement
function createVmTimers(e) {
  let n = new Set(),
    r = (T) => T();
  function h() {
    for (let T of n) clearTimeout(T);
    n.clear();
  }
  return (
    e?.addEventListener("abort", h, { once: !0 }),
    {
      clear: h,
      setTimeout: sanitizeAndLogError((T, y) => {
        if (e?.aborted) return 0;
        let A = typeof y === "number" ? y : typeof y === "string" ? +y || 0 : 0,
          L = Number(
            setTimeout(() => {
              try {
                r(T);
              } catch {}
            }, A),
          );
        return (n.add(L), L);
      }),
      clearTimeout: sanitizeAndLogError((T) => {
        if (typeof T === "number" || typeof T === "string") {
          let y = typeof T === "number" ? T : +T;
          if (n.has(y)) (n.delete(y), clearTimeout(y));
        }
      }),
      bindVMInvoke: (T) => {
        r = T;
      },
    }
  );
}
//@ chunk-41w44bgm.js:16643-16741 placement
var be = "__wRg$",
  lCo = `${be}words`,
  Hs = "{put, read, on, retract, agent, workflow}",
  Dr = `${be}resolve`;
/**
 * 在工作流 VM 全局对象上定义只读的 Promise.resolve 引用，供改写后的代码使用。
 */
//@ chunk-41w44bgm.js:16741-16937 placement
function defineVmPromiseResolve(e) {
  vmModule.runInContext(
    `Object.defineProperty(globalThis, ${jsonStringify(Dr)}, {
      value: Promise.resolve.bind(Promise),
      writable: false, enumerable: false, configurable: false,
    })`,
    e,
  );
}
/**
 * 用 acorn 解析工作流脚本（包成 async IIFE）：可选检查正则/除号歧义；遍历 AST 拒绝保留标识符前缀、with、import()、及其他不支持的语法，并改写部分节点后返回源码。
 */
//@ chunk-41w44bgm.js:16937-18735 placement
function compileWorkflowScriptBody(script) {
  let { parse: parse, tokTypes: tokTypes } = k3t(),
    h = Ro(),
    T = `(async () => {'use strict';
`,
    y = `(async () => {'use strict';
${script}
})()`,
    A = readFlagWithOverride("tengu_steady_metcalfe", { safe: !0 }),
    L = [],
    j = parse(y, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowHashBang: !0,
      onToken: A
        ? (G) => {
            let ce = slashTokenSpan({ token: G, tokenTypes: tokTypes, source: y, offset: 28 });
            if (ce) L.push(ce);
          }
        : void 0,
    });
  if (A) assertNoAmbiguousSlash(script, L);
  h.full(j, (G) => {
    if (G.name?.startsWith(be)) throw SyntaxError(`Identifier '${G.name}' is reserved.`);
    if (G.type === "WithStatement")
      throw SyntaxError("'with' statements are not supported in workflow scripts.");
    if (G.type === "ImportExpression") throw SyntaxError("import() is not available in workflow scripts.");
  });
  let he = [],
    ke = (G) => {
      if (!G) return;
      he.push([G.start, ` ${be}((`], [G.end, "))"]);
    },
    te = (G) => {
      for (let ce = G.length - 2; ce >= 0; ce--) {
        let E = G[ce];
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
  if (
    (h.ancestor(j, {
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
        if (G.await) he.push([G.right.start, ` ${be}a((`], [G.right.end, "))"]);
      },
      ReturnStatement(G, ce, E) {
        let s = te(E);
        if (!s?.async) return;
        if (s.generator) {
          if (G.argument) he.push([G.argument.start, ` await ${be}((`], [G.argument.end, "))"]);
        } else ke(G.argument);
      },
      YieldExpression(G, ce, E) {
        let s = te(E);
        if (!(s?.async && s.generator)) return;
        if (G.delegate) {
          if (G.argument) he.push([G.argument.start, ` ${be}a((`], [G.argument.end, "))"]);
        } else ke(G.argument);
      },
    }),
    he.length === 0)
  )
    return script;
  he.sort((G, ce) => ce[0] - G[0]);
  let me = y;
  for (let [G, ce] of he) me = me.slice(0, G) + ce + me.slice(G);
  let sliced = me.slice(28, me.length - 5);
  if (A) assertNoAmbiguousSlash(script, L, { text: sliced, tokens: remapTokenOffsets(L, he, 28) });
  return sliced;
}
/**
 * 非 Bun 运行时启动工作流脚本时的错误文案：说明工作流只在原生 claude 二进制（Bun）上运行，并报告当前是 Deno 还是 Node.js。
 */
//@ chunk-41w44bgm.js:18735-19177 placement
var NOT_ON_BUN_MESSAGE = `Workflow scripts run only when Claude Code runs on Bun, the JavaScript runtime its native binary is built with. This process is not running on Bun (it reports ${process.versions.deno !== void 0 ? `Deno ${process.versions.deno}` : `Node.js ${process.version}`}), so the script was not started. To use workflows, run the native \`claude\` binary (the Agent SDK launches it by default) rather than a JavaScript bundle under another runtime.`;
/**
 * 编译工作流脚本：非 Bun 运行时直接失败；校验语法后包装成带异步迭代辅助的工厂函数源码，可选绑定词表；返回 {ok, ...} 或 {ok:false, error}。
 */
//@ chunk-41w44bgm.js:19177-20973 placement
function compileWorkflowScript(script, { bindWords: bindWords = !1 } = {}) {
  if (!alwaysTrue())
    return (logFeatureBad("workflow_compile", "unsupported_runtime"), { ok: !1, error: NOT_ON_BUN_MESSAGE });
  try {
    $r(script);
    let r = compileWorkflowScriptBody(script),
      h = bindWords ? `, ${Hs}` : "",
      T = bindWords ? `, ${lCo}()` : "",
      y = `((${be} => ((${be}a${h}) => async () => {'use strict';
${r}
})(${be}it => ({[Symbol.asyncIterator](){const ${be}ai = ${be}it[Symbol.asyncIterator];if (${be}ai != null && typeof ${be}ai !== 'function') throw new TypeError('@@asyncIterator is not a function');const ${be}i = ${be}ai != null ? ${be}ai.call(${be}it) : ${be}it[Symbol.iterator]();if (${be}i === null || (typeof ${be}i !== 'object' && typeof ${be}i !== 'function')) throw new TypeError('Iterator is not an object');const ${be}nxt = ${be}i.next;if (typeof ${be}nxt !== 'function') throw new TypeError('Iterator.next is not a function');const ${be}ret = ${be}i.return;const ${be}thr = ${be}i.throw;const ${be}w = s => ${be}(s).then(s => { if (s === null || (typeof s !== 'object' && typeof s !== 'function')) throw new TypeError('Iterator result is not an object'); const done = s.done; return ${be}(s.value).then(value => ({value, done})) });return {next:v=>${be}w(${be}nxt.call(${be}i,v)),return:v=>${be}w(typeof ${be}ret==='function'?${be}ret.call(${be}i,v):{value:v,done:true}),throw:e=>typeof ${be}thr==='function'?${be}w(${be}thr.call(${be}i,e)):${be}(typeof ${be}ret==='function'?${be}ret.call(${be}i):undefined).then(()=>{throw new TypeError('The iterator does not provide a throw method')})}}})${T}))(${Dr}))()`,
      A = new vmModule.Script(y, {
        filename: "workflow.js",
        importModuleDynamically: () => {
          throw createSealedError("import() is not available in workflow scripts.");
        },
      });
    return (logFeatureOk("workflow_compile"), { ok: !0, vmScript: A });
  } catch (error) {
    return (
      logFeatureBad("workflow_compile", error instanceof Mo ? "slash_mismatch" : "syntax_error"),
      { ok: !1, error: `SyntaxError: ${error instanceof Error ? error.message : String(error)}` }
    );
  }
}
//@ chunk-41w44bgm.js:20973-21046 placement
function $r(e) {
  Function(`async function _check() {'use strict';
${e}
}`);
}
//@ chunk-41w44bgm.js:21046-21076 placement
class Mo extends SyntaxError {}
/**
 * 若脚本里有既可读作正则又可读作除号的 '/'，抛出带行列号的错误，提示用 ';' 结束前一语句或加括号。
 */
//@ chunk-41w44bgm.js:21076-21573 placement
function assertNoAmbiguousSlash(e, n, r) {
  let h = firstAmbiguousSlashIndex({ text: r?.text ?? e, tokens: r?.tokens ?? n, engineParses: $r });
  if (h === -1) return;
  let parts = e.slice(0, n[h].start).split(/\r\n|[\n\r\u2028\u2029]/),
    y = parts.length,
    A = parts.at(-1).length + 1;
  throw new Mo(
    `Line ${y}, column ${A} of the script body (counted after the meta statement, if any): this '/' could be read either as the start of a regular expression or as a division, so the script was not run. End the statement before it with ';' (or parenthesize the expression) so it reads one way.`,
  );
}
//@ chunk-41w44bgm.js:21573-21798 placement
function remapTokenOffsets(e, n, r) {
  let h = [],
    reduced = n.reduce((A, [, L]) => A + L.length, 0),
    y = 0;
  for (let A = e.length - 1; A >= 0; A--) {
    let L = e[A];
    while (y < n.length && n[y][0] - r > L.start) ((reduced -= n[y][1].length), y++);
    h[A] = { start: L.start + reduced, end: L.end + reduced, regex: L.regex };
  }
  return h;
}
/**
 * 判断脚本源码是否使用 Date.now()、Math.random() 或无参 new Date()（解析失败返回 false）。
 */
//@ chunk-41w44bgm.js:21798-22301 placement
function usesNondeterministicTime(source) {
  let { parse: parse } = k3t(),
    r = Ro(),
    found = !1;
  try {
    let T = parse(source, {
      ecmaVersion: "latest",
      sourceType: "module",
      allowAwaitOutsideFunction: !0,
      allowReturnOutsideFunction: !0,
    });
    r.simple(T, {
      MemberExpression(y) {
        if (y.computed || y.object.type !== "Identifier" || y.property.type !== "Identifier") return;
        let A = y.object.name,
          L = y.property.name;
        if ((A === "Date" && L === "now") || (A === "Math" && L === "random")) found = !0;
      },
      NewExpression(y) {
        if (y.callee.type === "Identifier" && y.callee.name === "Date" && y.arguments.length === 0)
          found = !0;
      },
    });
  } catch {
    return !1;
  }
  return found;
}
/**
 * 工作流吞掉未处理 Promise 拒绝时的警告（脚本留下了失败的 agent/parallel/pipeline/workflow 调用而未处理）。
 */
//@ chunk-41w44bgm.js:22323-22524 placement
var SWALLOWED_REJECTION_WARNING = MVs(
  "Workflow: swallowed an unhandled rejection (not exiting): a script left a promise that carries the reason of a failed agent(), parallel(), pipeline() or workflow() call without a handler",
);

export {
  SWALLOWED_REJECTION_WARNING,
  Jn,
  defineVmPromiseResolve,
  Qt,
  compileWorkflowScript,
  sin,
  createVmTimers,
  usesNondeterministicTime,
  lCo,
  NOT_ON_BUN_MESSAGE,
};

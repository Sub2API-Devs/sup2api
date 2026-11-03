/**
 * utils/messages/toolDeltas.ts
 *
 * 2.1.316 新增：工具增减提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import { fVt } from "../../services/api/toolDefinitionShape.js";
import { createStepRecorder } from "../../plugins/functionHooks/dispatch/chain.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";

/**
 * 把工具增删应用到工具变更记录：新增项抵消之前的删除；删除时按值删除需在已宣告列表内才记录（否则只撤销对应新增）；新增时附上工具定义。
 */
//@ chunk-e6aww6q8.js:5043450-5043949 placement
function applyToolDeltas(e, n, r, s = new Map(), h = new Set()) {
  for (let y of n)
    if (e.toolRemovals?.includes(y)) recordToolDelta(e, "add", y);
    else e.toolAdditions = [...(e.toolAdditions ?? []), y];
  for (let { op: op, name: S, byValue: byValue } of r) {
    if (op === "remove" && byValue) {
      let G = fVt(e.toolDefinitions, S) !== void 0;
      if (!h.has(S)) {
        if (G) dropToolAddition(e, S);
        continue;
      }
      if ((recordToolDelta(e, "remove", S), !(e.byValueRemovals ?? []).includes(S)))
        e.byValueRemovals = [...(e.byValueRemovals ?? []), S];
      continue;
    }
    recordToolDelta(e, op, S);
    let L = s.get(S);
    if (op === "add" && L !== void 0) e.toolDefinitions = { ...(e.toolDefinitions ?? {}), [S]: L };
  }
}
//@ chunk-e6aww6q8.js:5043949-5044228 placement
function dropToolAddition(e, n) {
  let r = e.toolAdditions?.filter((s) => s !== n);
  if (r === void 0 || r.length === 0) delete e.toolAdditions;
  else e.toolAdditions = r;
  if (e.toolDefinitions !== void 0) {
    let { [n]: s, ...h } = e.toolDefinitions;
    if (Object.keys(h).length === 0) delete e.toolDefinitions;
    else e.toolDefinitions = h;
  }
}
/**
 * 从工具增量记录中挑出指定名称的工具定义。
 */
//@ chunk-e6aww6q8.js:5044228-5044339 placement
function pickToolDefinitions(e, n) {
  let r = new Map();
  for (let [s, { definition: h }] of e ?? []) if (n.has(s)) r.set(s, h);
  return { definitions: r };
}
/**
 * 记录一次工具增或删：删除时移除对应新增；新增时撤销对应删除与按值删除，并加入新增列表。
 */
//@ chunk-e6aww6q8.js:5044339-5044736 placement
function recordToolDelta(e, n, r) {
  let s = n === "add" ? "toolAdditions" : "toolRemovals",
    h = n === "add" ? "toolRemovals" : "toolAdditions";
  if (n === "remove") dropToolAddition(e, r);
  else {
    let y = e[h]?.filter((w) => w !== r);
    if (y !== void 0)
      if (y.length === 0) delete e[h];
      else e[h] = y;
    let S = e.byValueRemovals?.filter((w) => w !== r);
    if (S !== void 0)
      if (S.length === 0) delete e.byValueRemovals;
      else e.byValueRemovals = S;
  }
  if (!(e[s] ?? []).includes(r)) e[s] = [...(e[s] ?? []), r];
}
//@ chunk-e6aww6q8.js:5044736-5044945 placement
var makeCoreHookRunner = (e, n) => ({
  name: "core",
  isCore: !0,
  budgetMs: 0,
  async run(r) {
    let run = await e.run(r.args),
      textOf = e.textOf(run),
      contextOf = e.contextOf(run);
    return {
      ref: n.keep(r.args, { ran: run, text: textOf, context: contextOf }),
      text: textOf,
      ...(contextOf !== void 0 && { context: contextOf }),
    };
  },
});
//@ chunk-e6aww6q8.js:5044945-5045002 placement
function o5n(e) {
  let n = createStepRecorder();
  return { core: makeCoreHookRunner(e, n), runs: n };
}
/**
 * 判断给定的模块是否都已作为内置模块加载。
 */
//@ chunk-e6aww6q8.js:5045002-5045109 placement
function areBuiltinModulesLoaded(e) {
  let { loadedModules: loadedModules } = getPluginRegistry();
  return e.every((r) => loadedModules.some((s) => s.name === r && s.tier === "builtin"));
}
//@ chunk-e6aww6q8.js:5045109-5045155 placement
var mgt = (e, n) => (n === void 0 ? e : { ...e, exitCode: n });

export { applyToolDeltas, pickToolDefinitions, o5n, areBuiltinModulesLoaded, mgt };

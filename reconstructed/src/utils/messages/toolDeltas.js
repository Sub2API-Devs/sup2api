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
import { ownValue } from "../../services/api/toolDefinitionShape.js";
import { createStepRecorder } from "../../plugins/functionHooks/dispatch/chain.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";

//@ chunk-e6aww6q8.js:5043450-5043949 placement
/**
 * 把工具增删应用到工具变更记录：新增项抵消之前的删除；删除时按值删除需在已宣告列表内才记录（否则只撤销对应新增）；新增时附上工具定义。
 */
function applyToolDeltas(e, n, r, s = new Map(), h = new Set()) {
  for (let y of n)
    if (e.toolRemovals?.includes(y)) recordToolDelta(e, "add", y);
    else e.toolAdditions = [...(e.toolAdditions ?? []), y];
  for (let { op, name: S, byValue } of r) {
    if (op === "remove" && byValue) {
      let G = ownValue(e.toolDefinitions, S) !== undefined;
      if (!h.has(S)) {
        if (G) dropToolAddition(e, S);
        continue;
      }
      recordToolDelta(e, "remove", S);
      if (!(e.byValueRemovals ?? []).includes(S)) e.byValueRemovals = [...(e.byValueRemovals ?? []), S];
      continue;
    }
    recordToolDelta(e, op, S);
    let L = s.get(S);
    if (op === "add" && L !== undefined)
      e.toolDefinitions = {
        ...(e.toolDefinitions ?? {}),
        [S]: L,
      };
  }
}
//@ chunk-e6aww6q8.js:5043949-5044228 placement
function dropToolAddition(e, n) {
  let filtered = e.toolAdditions?.filter((toolAddition) => toolAddition !== n);
  if (filtered === undefined || filtered.length === 0) delete e.toolAdditions;
  else e.toolAdditions = filtered;
  if (e.toolDefinitions !== undefined) {
    let { [n]: s, ...h } = e.toolDefinitions;
    if (Object.keys(h).length === 0) delete e.toolDefinitions;
    else e.toolDefinitions = h;
  }
}
//@ chunk-e6aww6q8.js:5044228-5044339 placement
/**
 * 从工具增量记录中挑出指定名称的工具定义。
 */
function pickToolDefinitions(e, inlineToolDefinitions) {
  let r = new Map();
  for (let [s, { definition: h }] of e ?? []) if (inlineToolDefinitions.has(s)) r.set(s, h);
  return {
    definitions: r,
  };
}
//@ chunk-e6aww6q8.js:5044339-5044736 placement
/**
 * 记录一次工具增或删：删除时移除对应新增；新增时撤销对应删除与按值删除，并加入新增列表。
 */
function recordToolDelta(e, n, r) {
  let s = n === "add" ? "toolAdditions" : "toolRemovals";
  let h = n === "add" ? "toolRemovals" : "toolAdditions";
  if (n === "remove") dropToolAddition(e, r);
  else {
    let filtered = e[h]?.filter((w) => w !== r);
    if (filtered !== undefined)
      if (filtered.length === 0) delete e[h];
      else e[h] = filtered;
    let filtered_2 = e.byValueRemovals?.filter((byValueRemoval) => byValueRemoval !== r);
    if (filtered_2 !== undefined)
      if (filtered_2.length === 0) delete e.byValueRemovals;
      else e.byValueRemovals = filtered_2;
  }
  if (!(e[s] ?? []).includes(r)) e[s] = [...(e[s] ?? []), r];
}
//@ chunk-e6aww6q8.js:5044736-5044945 placement
var makeCoreHookRunner = (e, stepRecorder) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  async run(r) {
    let s = await e.run(r.args);
    let text = e.textOf(s);
    let y = e.contextOf(s);
    return {
      ref: stepRecorder.keep(r.args, {
        ran: s,
        text,
        context: y,
      }),
      text,
      ...(y !== undefined && {
        context: y,
      }),
    };
  },
});
//@ chunk-e6aww6q8.js:5044945-5045002 placement
/**
 * 创建带步骤记录器的工具差量执行核心。
 */
function createDeltaStepRecorder(engine) {
  let stepRecorder = createStepRecorder();
  return {
    core: makeCoreHookRunner(engine, stepRecorder),
    runs: stepRecorder,
  };
}
//@ chunk-e6aww6q8.js:5045002-5045109 placement
/**
 * 判断给定的模块是否都已作为内置模块加载。
 */
function areBuiltinModulesLoaded(e) {
  let { loadedModules } = getPluginRegistry();
  return e.every((r) =>
    loadedModules.some((loadedModule) => loadedModule.name === r && loadedModule.tier === "builtin"),
  );
}
//@ chunk-e6aww6q8.js:5045109-5045155 placement
/**
 * 有退出码时附加到结果对象上。
 */
var withExitCode = (e, exitCode) =>
  exitCode === undefined
    ? e
    : {
        ...e,
        exitCode,
      };
export {
  applyToolDeltas,
  pickToolDefinitions,
  createDeltaStepRecorder,
  areBuiltinModulesLoaded,
  withExitCode,
};

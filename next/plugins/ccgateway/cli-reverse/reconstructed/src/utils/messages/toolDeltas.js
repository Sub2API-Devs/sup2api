/**
 * utils/messages/toolDeltas.ts
 *
 * 2.1.316 新增：工具增减提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { ownValue } from "../../services/api/toolDefinitionShape.js";
import { createStepRecorder } from "../../plugins/functionHooks/dispatch/chain.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";

//@ chunk-5xgkngpb.js:5198575-5199074 placement
/**
 * 把工具增删应用到工具变更记录：新增项抵消之前的删除；删除时按值删除需在已宣告列表内才记录（否则只撤销对应新增）；新增时附上工具定义。
 */
function applyToolDeltas(
  message,
  announceNames,
  toolChanges,
  definitionsByName = new Map(),
  announcedNames = new Set(),
) {
  for (let toolName of announceNames)
    if (message.toolRemovals?.includes(toolName)) recordToolDelta(message, "add", toolName);
    else message.toolAdditions = [...(message.toolAdditions ?? []), toolName];
  for (let { op, name: changeToolName, byValue } of toolChanges) {
    if (op === "remove" && byValue) {
      let isDefined = ownValue(message.toolDefinitions, changeToolName) !== undefined;
      if (!announcedNames.has(changeToolName)) {
        if (isDefined) dropToolAddition(message, changeToolName);
        continue;
      }
      recordToolDelta(message, "remove", changeToolName);
      if (!(message.byValueRemovals ?? []).includes(changeToolName))
        message.byValueRemovals = [...(message.byValueRemovals ?? []), changeToolName];
      continue;
    }
    recordToolDelta(message, op, changeToolName);
    let definition = definitionsByName.get(changeToolName);
    if (op === "add" && definition !== undefined)
      message.toolDefinitions = {
        ...(message.toolDefinitions ?? {}),
        [changeToolName]: definition,
      };
  }
}
//@ chunk-5xgkngpb.js:5199074-5199353 placement
function dropToolAddition(message, toolName) {
  let filtered = message.toolAdditions?.filter((toolAddition) => toolAddition !== toolName);
  if (filtered === undefined || filtered.length === 0) delete message.toolAdditions;
  else message.toolAdditions = filtered;
  if (message.toolDefinitions !== undefined) {
    let { [toolName]: removedDefinition, ...restDefinitions } = message.toolDefinitions;
    if (Object.keys(restDefinitions).length === 0) delete message.toolDefinitions;
    else message.toolDefinitions = restDefinitions;
  }
}
//@ chunk-5xgkngpb.js:5199353-5199464 placement
/**
 * 从工具增量记录中挑出指定名称的工具定义。
 */
function pickToolDefinitions(deltas, inlineToolDefinitions) {
  let picked = new Map();
  for (let [toolName, { definition }] of deltas ?? [])
    if (inlineToolDefinitions.has(toolName)) picked.set(toolName, definition);
  return {
    definitions: picked,
  };
}
//@ chunk-5xgkngpb.js:5199464-5199861 placement
/**
 * 记录一次工具增或删：删除时移除对应新增；新增时撤销对应删除与按值删除，并加入新增列表。
 */
function recordToolDelta(message, op, toolName) {
  let targetField = op === "add" ? "toolAdditions" : "toolRemovals";
  let oppositeField = op === "add" ? "toolRemovals" : "toolAdditions";
  if (op === "remove") dropToolAddition(message, toolName);
  else {
    let filtered = message[oppositeField]?.filter((existingName) => existingName !== toolName);
    if (filtered !== undefined)
      if (filtered.length === 0) delete message[oppositeField];
      else message[oppositeField] = filtered;
    let filtered_2 = message.byValueRemovals?.filter((byValueRemoval) => byValueRemoval !== toolName);
    if (filtered_2 !== undefined)
      if (filtered_2.length === 0) delete message.byValueRemovals;
      else message.byValueRemovals = filtered_2;
  }
  if (!(message[targetField] ?? []).includes(toolName))
    message[targetField] = [...(message[targetField] ?? []), toolName];
}
//@ chunk-5xgkngpb.js:5199861-5200070 placement
var makeCoreHookRunner = (coreHook, stepRecorder) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  async run(input) {
    let output = await coreHook.run(input.args);
    let text = coreHook.textOf(output);
    let hookContext = coreHook.contextOf(output);
    return {
      ref: stepRecorder.keep(input.args, {
        ran: output,
        text,
        context: hookContext,
      }),
      text,
      ...(hookContext !== undefined && {
        context: hookContext,
      }),
    };
  },
});
//@ chunk-5xgkngpb.js:5200070-5200127 placement
/**
 * 创建带步骤记录器的工具差量执行核心。
 */
function createDeltaStepRecorder(coreHook) {
  let stepRecorder = createStepRecorder();
  return {
    core: makeCoreHookRunner(coreHook, stepRecorder),
    runs: stepRecorder,
  };
}
//@ chunk-5xgkngpb.js:5200127-5200234 placement
/**
 * 判断给定的模块是否都已作为内置模块加载。
 */
function areBuiltinModulesLoaded(moduleNames) {
  let { loadedModules } = getPluginRegistry();
  return moduleNames.every((moduleName) =>
    loadedModules.some((loadedModule) => loadedModule.name === moduleName && loadedModule.tier === "builtin"),
  );
}
//@ chunk-5xgkngpb.js:5200234-5200280 placement
/**
 * 有退出码时附加到结果对象上。
 */
var withExitCode = (result, exitCode) =>
  exitCode === undefined
    ? result
    : {
        ...result,
        exitCode,
      };
export {
  applyToolDeltas,
  pickToolDefinitions,
  createDeltaStepRecorder,
  areBuiltinModulesLoaded,
  withExitCode,
};

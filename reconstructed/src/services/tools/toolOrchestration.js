/**
 * services/tools/toolOrchestration.ts
 *
 * 非流式工具编排 runTools：按连续并发安全调用分批，安全批并发（默认上限 10，CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY）、其余串行，并按顺序应用上下文修改
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/tools/toolOrchestration.ts
 * pieces: chunk-0h4e7gnq.js (6)
 * attribution: placement 1, fingerprint 4, callgraph-witnessed 1
 */
import { env } from "../../utils/env.js";
import { hasTypeField, runToolUse } from "./toolExecution.js";
import { applyContextLayers } from "../../utils/permissions/toolPermissionContext.js";
import { findToolByName } from "../../Tool.js";
import { all } from "../../utils/generators.js";

//@ chunk-0h4e7gnq.js:30007-30092 placement
function concurrencyBucket(concurrentCount) {
  if (concurrentCount <= 2) return concurrentCount === 0 ? "0" : concurrentCount === 1 ? "1" : "2";
  return concurrentCount < 10 ? "3_to_9" : "10_plus";
}
//@ chunk-0h4e7gnq.js:30092-30156 fingerprint = getMaxToolUseConcurrency (1)
/**
 * 最大并发工具数：CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY，默认 10。
 */
function getMaxToolUseConcurrency() {
  return env.CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY ?? 10;
}
//@ chunk-0h4e7gnq.js:30156-30706 fingerprint = runTools (0.709)
/**
 * runTools：非流式路径的工具编排。按 partitionToolCalls 分批，并发安全批次用 runToolsConcurrently（上下文修改层按 tool_use 顺序在批次结束后统一应用），其余批次串行；产出消息、newContext 与 set_in_progress_tool_use_ids 事件。
 */
async function* runTools(toolUseMessages, assistantMessages, canUseTool, toolUseContext) {
  let currentContext = toolUseContext;
  for (let { isConcurrencySafe, blocks } of partitionToolCalls(
    toolUseMessages,
    currentContext.options.tools,
    currentContext.options.toolAliases,
  ))
    if (isConcurrencySafe) {
      let queuedContextModifiers = {};
      for await (let update of runToolsConcurrently(blocks, assistantMessages, canUseTool, currentContext)) {
        if (hasTypeField(update)) {
          yield update;
          continue;
        }
        if (update.contextLayers) {
          let { toolUseID, layers } = update.contextLayers;
          if (!queuedContextModifiers[toolUseID]) queuedContextModifiers[toolUseID] = [];
          queuedContextModifiers[toolUseID].push(...layers);
        }
        yield {
          message: update.message,
          newContext: currentContext,
        };
      }
      for (let block of blocks) {
        let modifiers = queuedContextModifiers[block.id];
        if (!modifiers || modifiers.length === 0) continue;
        currentContext = applyContextLayers(currentContext, modifiers);
      }
      yield {
        newContext: currentContext,
      };
    } else
      for await (let update of runToolsSerially(blocks, assistantMessages, canUseTool, currentContext)) {
        if (hasTypeField(update)) {
          yield update;
          continue;
        }
        if (update.newContext) currentContext = update.newContext;
        yield {
          message: update.message,
          newContext: currentContext,
        };
      }
}
//@ chunk-0h4e7gnq.js:30706-31015 fingerprint = partitionToolCalls (1)
/**
 * 把一条回答里的 tool_use 按"连续的并发安全调用"分批：输入解析成功且 isConcurrencySafe(input) 为真才算安全，异常视为不安全。
 */
function partitionToolCalls(toolUseMessages, tools, toolAliases) {
  return toolUseMessages.reduce((acc, toolUse) => {
    let tool = findToolByName(tools, toolUse.name, toolAliases);
    let parsedInput = tool?.inputSchema.safeParse(toolUse.input);
    let isConcurrencySafe = parsedInput?.success
      ? (() => {
          try {
            return Boolean(tool?.isConcurrencySafe(parsedInput.data));
          } catch {
            return false;
          }
        })()
      : false;
    if (isConcurrencySafe && acc.at(-1)?.isConcurrencySafe) acc.at(-1).blocks.push(toolUse);
    else
      acc.push({
        isConcurrencySafe,
        blocks: [toolUse],
      });
    return acc;
  }, []);
}
//@ chunk-0h4e7gnq.js:31015-31392 fingerprint = runToolsSerially (0.349)
/**
 * 串行执行一批 tool_use，每个调用产生的 contextLayers 立即应用到后续调用的上下文。
 */
async function* runToolsSerially(toolUseMessages, assistantMessages, canUseTool, toolUseContext) {
  let currentContext = toolUseContext;
  for (let toolUse of toolUseMessages) {
    for await (let update of runToolUse(
      toolUse,
      assistantMessages.find((assistantMessage) =>
        assistantMessage.message.content.some(
          (block) => block.type === "tool_use" && block.id === toolUse.id,
        ),
      ),
      canUseTool,
      currentContext,
      () => new Date().toISOString(),
    )) {
      if (hasTypeField(update)) {
        yield update;
        continue;
      }
      if (update.contextLayers)
        currentContext = applyContextLayers(currentContext, update.contextLayers.layers);
      yield {
        message: update.message,
        newContext: currentContext,
      };
    }
    yield {
      type: "set_in_progress_tool_use_ids",
      op: {
        action: "remove",
        ids: [toolUse.id],
      },
    };
  }
}
//@ chunk-0h4e7gnq.js:31392-31657 callgraph-witnessed = runToolsConcurrently (0.258)
/**
 * 并发执行一批 tool_use，上限 getMaxToolUseConcurrency()，各调用结束时发出移除进行中 id 的事件。
 */
async function* runToolsConcurrently(toolUseMessages, assistantMessages, canUseTool, toolUseContext) {
  yield* all(
    toolUseMessages.map(async function* (toolUse) {
      yield* runToolUse(
        toolUse,
        assistantMessages.find((prev) =>
          prev.message.content.some((block) => block.type === "tool_use" && block.id === toolUse.id),
        ),
        canUseTool,
        toolUseContext,
        () => new Date().toISOString(),
      );
      yield {
        type: "set_in_progress_tool_use_ids",
        op: {
          action: "remove",
          ids: [toolUse.id],
        },
      };
    }),
    getMaxToolUseConcurrency(),
  );
}
export { runTools, concurrencyBucket };

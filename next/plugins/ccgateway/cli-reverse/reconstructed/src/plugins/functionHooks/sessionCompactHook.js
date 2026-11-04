/**
 * plugins/functionHooks/sessionCompactHook.ts
 *
 * 2.1.316 新增：session.compact 事件钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (16)
 * attribution: placement 16
 */
import { randomUUID } from "crypto";
import { createAssistantMessage, createUserMessage } from "../../utils/messages.js";
import { stableStringifySafe } from "../../utils/hooks/hookSerialization.js";
import { attachToolResults, toPluginMessage } from "./sessionApi.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../../services/projects/threadRows.js";
import { pluginsMatchingEvent } from "./hookDispatch.js";
import { createStepRecorder } from "./dispatch/chain.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { logForDebugging } from "../../utils/debug.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1538522-1538936 placement
/**
 * 把插件可见的会话行还原为内部消息：助手行生成文本与 tool_use，用户行生成 tool_result 与文本。
 */
function pluginRowToMessage(row) {
  let textBlocks =
    row.text === ""
      ? []
      : [
          {
            type: "text",
            text: row.text,
          },
        ];
  if (row.role === "assistant") {
    let content = [
      ...textBlocks,
      ...row.toolUses.map((toolUse) => ({
        type: "tool_use",
        id: toolUse.tool_use_id,
        name: toolUse.tool,
        input: toolUse.input,
      })),
    ];
    return createAssistantMessage({
      content: content.length === 0 ? "" : content,
    });
  }
  let mapped = (row.toolResults ?? []).map((toolResult) => ({
    type: "tool_result",
    tool_use_id: toolResult.tool_use_id,
    content: toolResult.text,
    ...(toolResult.isError && {
      is_error: true,
    }),
  }));
  let hasNoResults = mapped.length === 0;
  return createUserMessage({
    content: hasNoResults ? row.text : [...mapped, ...textBlocks],
  });
}
//@ chunk-e6aww6q8.js:1538936-1539024 placement
/**
 * 构造插件行
 */
var pluginRow = (row) =>
  stableStringifySafe({
    role: row.role,
    text: row.text,
    toolUses: row.toolUses,
    toolResults: row.toolResults,
  });
//@ chunk-e6aww6q8.js:1539024-1539091 placement
/**
 * 附上工具结果与句柄
 */
var withToolResults = (pluginMessage, resultsById, handle) => ({
  ...pluginMessage,
  toolUses: pluginMessage.toolUses.map(attachToolResults(resultsById)),
  handle,
});
//@ chunk-e6aww6q8.js:1539091-1539676 placement
/**
 * session.compact 的行映射器：rowsOf 把消息转为插件行并记住每行对应的原消息组，messagesOf 把插件返回的行还原（未改动的行用原消息）。
 */
function createCompactRowMapper() {
  let rowsByHandle = new Map();
  return {
    rowsOf(messages) {
      let resultsById = new Map();
      for (let message of messages) {
        let toolResults = toPluginMessage(message)?.toolResults;
        for (let toolResult of toolResults ?? []) resultsById.set(toolResult.tool_use_id, toolResult);
      }
      let rows = [];
      let pending = [];
      let group = [];
      let started = false;
      for (let message of messages) {
        let pluginMessage = toPluginMessage(message);
        if (pluginMessage === undefined && started) {
          group.push(message);
          continue;
        }
        if (pluginMessage === undefined) {
          pending.push(message);
          continue;
        }
        let row = withToolResults(pluginMessage, resultsById, message.uuid);
        group = [...pending, message];
        pending = [];
        started = true;
        rowsByHandle.set(message.uuid, {
          row,
          messages: group,
        });
        rows.push(row);
      }
      return rows;
    },
    messagesOf(rows) {
      let takenHandles = new Set();
      return rows.flatMap((row) => {
        let origin = row.handle === undefined ? undefined : rowsByHandle.get(row.handle);
        if (!(
          origin !== undefined &&
          !takenHandles.has(origin.row.handle ?? "") &&
          pluginRow(origin.row) === pluginRow(row)
        ))
          return [pluginRowToMessage(row)];
        takenHandles.add(origin.row.handle ?? "");
        return origin.messages;
      });
    },
  };
}
//@ chunk-e6aww6q8.js:1539676-1539856 placement
var compactResult = (made, messages) => ({
  messages,
  ...(made.tokensBefore !== undefined && {
    tokensBefore: made.tokensBefore,
  }),
  ...(made.tokensAfter !== undefined && {
    tokensAfter: made.tokensAfter,
  }),
  ...(made.usage !== undefined && {
    usage: made.usage,
  }),
});
//@ chunk-e6aww6q8.js:1539856-1540150 placement
/**
 * session.compact 链底的核心处理器：用指令执行压缩，跳过则返回 skip，否则记录结果并返回行。
 */
var createCompactCore = (compact, compactRowMapper, stepRecorder) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  async run(request) {
    let instructions =
      request.instructions === undefined || request.instructions.trim() === ""
        ? undefined
        : request.instructions;
    let made = await compact(compactRowMapper.messagesOf(request.messages), instructions);
    if (made.skip !== undefined)
      return {
        skip: made.skip,
      };
    let messages = compactRowMapper.rowsOf(made.messages);
    stepRecorder.keep(request, {
      made,
      rows: messages,
    });
    return compactResult(made, messages);
  },
});
//@ chunk-e6aww6q8.js:1540150-1540238 placement
/**
 * session.compact 核心步骤
 */
var compactCoreStep = (
  made,
  result = compactResult(made, createCompactRowMapper().rowsOf(made.messages)),
) => ({
  kind: "core",
  record: made.record,
  result,
});
//@ chunk-e6aww6q8.js:1540238-1540357 placement
var sameRows = (messages, rows) =>
  messages.length === rows.length &&
  messages.every((message, index) => {
    let row = rows[index];
    return row !== undefined && message.handle === row.handle && pluginRow(message) === pluginRow(row);
  });
//@ chunk-e6aww6q8.js:1540395-1540565 placement (2.1.88 match: getTokenCountFromUsage, 0.899)
var getTokenCountFromUsage_2 = (usage) => ({
  ...usage,
  uuid: randomUUID(),
  message: {
    ...usage.message,
    usage: {
      ...usage.message.usage,
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  },
});
//@ chunk-e6aww6q8.js:1540603-1540674 placement
/**
 * 助手行换新 uuid
 */
var reuuidAssistantRows = (messages) =>
  messages.map((message) =>
    message.type === "assistant"
      ? getTokenCountFromUsage_2(message)
      : {
          ...message,
          uuid: randomUUID(),
        },
  );
//@ chunk-e6aww6q8.js:1540674-1540788 placement
var replacedCompactResult = (result, compactRowMapper, record) => ({
  kind: "replaced",
  messages: reuuidAssistantRows(
    compactRowMapper.messagesOf(result.messages).filter((message) => !isCompactBoundaryMessage_3(message)),
  ),
  record,
  result,
});
//@ chunk-e6aww6q8.js:1540788-1540825 placement
/**
 * 跳过压缩
 */
var skippedCompact = (fields) => ({
  kind: "skipped",
  ...fields,
});
//@ chunk-e6aww6q8.js:1540825-1541723 placement
/**
 * 运行 session.compact 钩子链并记录核心是否执行。
 */
async function dispatchSessionCompactHooks(request) {
  let { trigger, instructions, messages, agentId, isIsolated, origin, signal, compact } = request;
  let matchers = pluginsMatchingEvent(
    "session.compact",
    {
      trigger,
      agentId,
    },
    origin,
  );
  if (isIsolated || matchers.length === 0) {
    let made = await compact([...messages], instructions);
    return made.skip !== undefined
      ? skippedCompact({
          reason: made.skip,
          ranCore: true,
        })
      : compactCoreStep(made);
  }
  let compactRowMapper = createCompactRowMapper();
  let stepRecorder = createStepRecorder();
  let result = await NO_CORE_AT_CHAIN_BOTTOM("session.compact", {
    core: {
      "session.compact": createCompactCore(compact, compactRowMapper, stepRecorder),
    },
    origin,
    signal,
  })({
    trigger,
    ...(agentId !== undefined && {
      agentId,
    }),
    ...(instructions !== undefined && {
      instructions,
    }),
    messages: compactRowMapper.rowsOf(messages),
  });
  let hookedBy = `hooked by ${matchers.join("+")}`;
  let coreNote = stepRecorder.ran() ? "core ran beneath" : "core never ran";
  if (result.skip !== undefined) {
    logForDebugging(`session.compact (${trigger}): skipped (${result.skip}; ${hookedBy}); ${coreNote}`);
    return skippedCompact({
      reason: result.skip,
      ranCore: stepRecorder.ran(),
    });
  }
  let lastStep = stepRecorder.last();
  if (lastStep !== undefined && sameRows(result.messages, lastStep.made.rows))
    return compactCoreStep(lastStep.made.made, result);
  logForDebugging(
    `session.compact (${trigger}): a hook's ${result.messages.length} messages stand (${hookedBy}); ${coreNote}`,
  );
  return replacedCompactResult(result, compactRowMapper, lastStep?.made.made.record);
}
//@ chunk-e6aww6q8.js:1541723-1541784 placement
/**
 * 保留下层的行 uuid
 */
var keptRowUuids = (messages) =>
  messages.filter((message) => toPluginMessage(message) !== undefined).map((message) => message.uuid);
//@ chunk-e6aww6q8.js:1541784-1541814 placement
/**
 * session.compact 站点规则
 */
var SESSION_COMPACT_RULES; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1541784", () => {
  SESSION_COMPACT_RULES = UI_ENV_SITE_RULES["session.compact"];
});
//@ chunk-e6aww6q8.js:1541814-1542130 placement (2.1.88 match: getTokenCountFromUsage, 1)
function getTokenCountFromUsage_3(usage) {
  return usage === undefined ||
    (usage.input_tokens === 0 &&
      usage.output_tokens === 0 &&
      !usage.cache_read_input_tokens &&
      !usage.cache_creation_input_tokens)
    ? undefined
    : {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
      };
}
export {
  SESSION_COMPACT_RULES,
  keptRowUuids,
  getTokenCountFromUsage_3,
  dispatchSessionCompactHooks,
  reuuidAssistantRows,
};

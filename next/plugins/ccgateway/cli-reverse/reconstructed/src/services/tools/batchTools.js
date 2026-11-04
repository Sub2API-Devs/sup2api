/**
 * services/tools/batchTools.ts
 *
 * 2.1.316 新增：batch_tools 批量工具调用的拆分与结果重组
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a76knw89.js (14)
 * attribution: placement 14
 */
import { findToolByName } from "../../Tool.js";
import { isMultiEntryAliasTool } from "./permissionCheckGuard.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";
import {
  prefixedName,
  toolCategoryForTelemetry,
  telemetryToolCategory,
  stripSuffixNumber,
  unsupportedToolsSeen,
  SUFFIX_NUMBER_RE,
} from "../api/toolDefinitionShape.js";
import { ZodError } from "../../../vendor/zod/v4/classic/errors.js";
import { uniq } from "../../utils/collections.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { languageErrorNameOf } from "../../utils/errors.js";
import { getRootSession } from "../../bootstrap/state.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a76knw89.js:11390-12492 placement
/**
 * 把一次 batch_tools 调用拆成多个 tool_use（解析失败时记录）。
 */
function expandBatchToolsCall(block, tools, normalizeEntry) {
  let toolByName = findToolByName(tools, block.name);
  if (toolByName === undefined || !isMultiEntryAliasTool(toolByName)) return null;
  let failSynthetic = (reason) => {
    logFeatureSad("batch_tools", reason, {
      tool_name: sanitizeToolNameForAnalytics(toolByName.name),
      isMcp: false,
    });
    return [
      {
        type: "tool_use",
        id: prefixedName(block.id, 0),
        name: toolByName.name,
        input: block.input,
        ...(block.caller !== undefined && {
          caller: block.caller,
        }),
      },
    ];
  };
  try {
    let parsed = toolByName.inputSchema.safeParse(block.input);
    if (!parsed.success)
      return {
        synthetics: failSynthetic("parse_failed"),
        decomposed: false,
      };
    let { v1Tool, entries } = toolByName.perEntryHookInputs(parsed.data);
    if (entries.length === 0)
      return {
        synthetics: failSynthetic("zero_entries"),
        decomposed: false,
      };
    return {
      decomposed: true,
      synthetics: entries.map((entry, index) => {
        let input = entry;
        try {
          input = normalizeEntry(v1Tool, entry);
        } catch (error) {
          if (error instanceof Error && error.name === "ZodError") {
            let issueCodes =
              error instanceof ZodError ? uniq(error.issues.map((issue) => issue.code)).join(",") : "unknown";
            logForDebugging(
              `Normalizing a batch entry's input for tool=${toolCategoryForTelemetry(v1Tool)} was rejected: issues ${issueCodes}; the error text (${error.message.length} characters) is not logged`,
              {
                level: "error",
              },
            );
          } else
            logError(
              Error(
                `Normalizing a batch entry's input for tool=${telemetryToolCategory(v1Tool)} failed: ${languageErrorNameOf(error)} was thrown; its text is not logged`,
              ),
            );
        }
        return {
          type: "tool_use",
          id: prefixedName(block.id, index),
          name: v1Tool.name,
          input,
          ...(block.caller !== undefined && {
            caller: block.caller,
          }),
        };
      }),
    };
  } catch {
    return {
      synthetics: failSynthetic("per_entry_threw"),
      decomposed: false,
    };
  }
}
//@ chunk-a76knw89.js:12492-12640 placement
/**
 * 有多入口别名工具时，从工具列表中去掉其底层 v1 工具。
 */
function hideAliasedV1Tools(tools) {
  let hiddenNames;
  for (let tool of tools)
    if (isMultiEntryAliasTool(tool)) {
      hiddenNames ??= new Set();
      hiddenNames.add(tool.underlyingV1ToolName);
    }
  if (hiddenNames === undefined) return tools;
  return tools.filter((tool) => !hiddenNames.has(tool.name));
}
//@ chunk-a76knw89.js:12640-12976 placement
function isBatchToolsUse(content, tools, normalizeEntry) {
  let expanded;
  let batchToolUses = [];
  for (let j = 0; j < content.length; j++) {
    let block = content[j];
    if (block.type !== "tool_use") {
      expanded?.push(block);
      continue;
    }
    let expansion = expandBatchToolsCall(block, tools, normalizeEntry);
    if (expansion === null) {
      expanded?.push(block);
      continue;
    }
    expanded ??= content.slice(0, j);
    expanded.push(...expansion.synthetics);
    if (expansion.decomposed) {
      batchToolUses.push({
        id: block.id,
        name: block.name,
      });
      logFeatureOk("batch_tools", {
        tool_name: sanitizeToolNameForAnalytics(block.name),
        isMcp: false,
      });
    }
  }
  return {
    content: expanded ?? content,
    batchToolUses,
  };
}
//@ chunk-a76knw89.js:12976-13680 placement
/**
 * 把拆开调用的结果按原 batch 重新组合成一个 tool_result。
 */
function reassembleBatchResults(content, batchToolUses, tools) {
  if (batchToolUses === undefined || batchToolUses.length === 0) return content;
  let batchById = new Map();
  for (let batchUse of batchToolUses) if (!batchById.has(batchUse.id)) batchById.set(batchUse.id, batchUse);
  let reassembledById = new Map();
  for (let batchUse of batchById.values()) {
    let toolByName = findToolByName(tools, batchUse.name);
    if (toolByName === undefined || !isMultiEntryAliasTool(toolByName)) continue;
    let inputs = [];
    let firstBlock;
    for (let block of content)
      if (block.type === "tool_use" && stripSuffixNumber(block.id) === batchUse.id) {
        firstBlock ??= block;
        inputs.push(block.input);
      }
    try {
      reassembledById.set(batchUse.id, {
        type: "tool_use",
        id: batchUse.id,
        name: batchUse.name,
        input: toolByName.reassemble(inputs),
        ...(firstBlock?.caller !== undefined && {
          caller: firstBlock.caller,
        }),
      });
    } catch {
      let reportedIds = unsupportedToolsSeen.of(getRootSession().host);
      if (!reportedIds.has(batchUse.id)) {
        reportedIds.add(batchUse.id);
        logFeatureSad("batch_tools", "reassemble_threw", {
          tool_name: sanitizeToolNameForAnalytics(batchUse.name),
          isMcp: false,
        });
      }
    }
  }
  let emitted = new Set();
  let output = [];
  for (let block of content) {
    if (block.type === "tool_use") {
      let baseId = stripSuffixNumber(block.id);
      if (baseId !== undefined && reassembledById.has(baseId)) {
        if (!emitted.has(baseId)) {
          emitted.add(baseId);
          output.push(reassembledById.get(baseId));
        }
        continue;
      }
    }
    output.push(block);
  }
  return output;
}
//@ chunk-a76knw89.js:13680-14996 placement (2.1.88 match: countToolCallsSince, 1)
function countToolCallsSince(messages, sinceUuid) {
  let sawBatch = false;
  for (let message of messages) {
    if (message.type === "assistant") {
      for (let block of message.message.content)
        if (block.type === "tool_use") {
          let toolByName = findToolByName(sinceUuid, block.name);
          if (toolByName !== undefined && isMultiEntryAliasTool(toolByName)) sawBatch = true;
        }
    }
    if (message.type === "user" && !sawBatch) {
      if (
        Array.isArray(message.message.content) &&
        message.message.content.some(
          (block) => block.type === "tool_result" && stripSuffixNumber(block.tool_use_id) !== undefined,
        )
      )
        sawBatch = true;
    }
  }
  if (!sawBatch) return messages;
  let toolUseById = new Map();
  for (let message of messages) {
    if (message.type !== "assistant") continue;
    for (let block of message.message.content)
      if (block.type === "tool_use") toolUseById.set(block.id, block);
  }
  let resultsById = new Map();
  for (let message of messages) {
    if (message.type !== "user" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content) {
      if (block.type !== "tool_result") continue;
      let baseId = stripSuffixNumber(block.tool_use_id);
      if (baseId === undefined || !toolUseById.has(baseId)) continue;
      let perId = resultsById.get(baseId);
      if (perId === undefined) {
        perId = new Map();
        resultsById.set(baseId, perId);
      }
      if (!perId.has(block.tool_use_id)) perId.set(block.tool_use_id, block);
    }
  }
  if (resultsById.size === 0) return messages;
  let emitted = new Set();
  return messages.flatMap((block) => {
    if (block.type !== "user" || !Array.isArray(block.message.content)) return [block];
    let didReassemble = false;
    let blocks = [];
    for (let resultBlock of block.message.content) {
      if (resultBlock.type !== "tool_result") {
        blocks.push(resultBlock);
        continue;
      }
      let baseToolUseId = stripSuffixNumber(resultBlock.tool_use_id);
      let perId = baseToolUseId !== undefined ? resultsById.get(baseToolUseId) : undefined;
      if (baseToolUseId === undefined || perId === undefined) {
        blocks.push(resultBlock);
        continue;
      }
      didReassemble = true;
      if (emitted.has(baseToolUseId)) continue;
      emitted.add(baseToolUseId);
      let toolUse = toolUseById.get(baseToolUseId);
      let toolByName = findToolByName(sinceUuid, toolUse.name);
      let aliasTool = toolByName !== undefined && isMultiEntryAliasTool(toolByName) ? toolByName : undefined;
      blocks.push(
        formatBatchResultEntries(
          aliasTool,
          baseToolUseId,
          NO_RESULT_TEXT(aliasTool, toolUse.input, baseToolUseId, perId),
        ),
      );
    }
    if (!didReassemble) return [block];
    if (blocks.length === 0) return [];
    return [
      {
        ...block,
        message: {
          ...block.message,
          content: blocks,
        },
      },
    ];
  });
}
//@ chunk-a76knw89.js:14996-15391 placement
function NO_RESULT_TEXT(aliasTool, input, baseId, results) {
  let entries;
  if (aliasTool !== undefined)
    try {
      let parsed = aliasTool.inputSchema.safeParse(input);
      if (parsed.success) entries = aliasTool.perEntryHookInputs(parsed.data).entries;
    } catch {}
  let count = entries?.length ?? 0;
  for (let key of results.keys()) {
    let match = SUFFIX_NUMBER_RE.exec(key);
    if (match) count = Math.max(count, Number(match[1]) + 1);
  }
  if (count > 1000) count = entries?.length ?? results.size;
  return Array.from(
    {
      length: count,
    },
    (unused, index) => {
      let result = results.get(prefixedName(baseId, index));
      return result !== undefined
        ? {
            input: entries?.[index],
            result,
          }
        : {
            input: entries?.[index],
            error: "no result",
          };
    },
  );
}
//@ chunk-a76knw89.js:15391-16297 placement
function formatBatchResultEntries(aliasTool, toolUseId, entries) {
  let content = [];
  let textBuffer = "";
  let isError = false;
  let appendText = (text) => {
    if (text.length > 0)
      textBuffer =
        textBuffer === ""
          ? text
          : `${textBuffer}
${text}`;
  };
  let flushText = () => {
    if (textBuffer !== "") {
      content.push({
        type: "text",
        text: textBuffer,
      });
      textBuffer = "";
    }
  };
  for (let [index, entry] of entries.entries()) {
    let isEntryError = entry.result === undefined || entry.result.is_error === true;
    if (isEntryError) isError = true;
    appendText(`--- entry ${index + 1}${isEntryError ? " (error)" : ""} ---`);
    if (entry.result !== undefined) {
      let content_2 = entry.result.content;
      if (typeof content_2 === "string") appendText(content_2);
      else if (Array.isArray(content_2))
        for (let item of content_2)
          if (item.type === "text") appendText(item.text);
          else {
            flushText();
            content.push(item);
          }
    } else appendText(`[entry ${index + 1} error: ${entry.error ?? "no result"}]`);
  }
  if (entries.length === 1 && aliasTool !== undefined)
    appendText(
      `<system-reminder>Tip: ${aliasTool.name} accepts multiple entries in one call (\`${aliasTool.entryFieldName}: [{...}, {...}]\`). Batching related operations into a single call is faster than issuing them as separate or parallel calls. No action needed for this result.</system-reminder>`,
    );
  flushText();
  return {
    type: "tool_result",
    tool_use_id: toolUseId,
    content: content.length === 1 && content[0]?.type === "text" ? content[0].text : content,
    ...(isError && {
      is_error: true,
    }),
  };
}
//@ chunk-a76knw89.js:16297-16312 placement
/**
 * 别名 → 工具定义的注册表。
 */
var toolAliasRegistry; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-a76knw89.js:16297", () => {
  toolAliasRegistry = new Map();
});
//@ chunk-a76knw89.js:16312-16345 placement
/**
 * 按别名查工具定义。
 */
function toolByAlias(name) {
  return toolAliasRegistry.get(name);
}
//@ chunk-a76knw89.js:16345-16430 placement
/**
 * 把别名列表映射成当前启用中的工具定义。
 */
function enabledToolsForAliases(names) {
  return names
    .map(toolByAlias)
    .filter((tool) => tool !== undefined)
    .filter((tool) => tool.isEnabled());
}
//@ chunk-a76knw89.js:16430-16504 placement
/**
 * 把工具的内部 V1 名换成当前对外名。
 */
function canonicalToolName(name, tools) {
  return tools.find((tool) => tool.underlyingV1ToolName === name)?.name ?? name;
}
//@ chunk-a76knw89.js:16504-16568 placement
/**
 * 按工具名反查它的别名。
 */
function aliasOfToolName(toolName) {
  for (let [alias, tool] of toolAliasRegistry) if (tool.name === toolName) return alias;
  return;
}
//@ chunk-a76knw89.js:16568-16634 placement
var TENGU_MARLIN_THICKET; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var MARLIN_THICKET_FLAG;
var ideReadSlot;
deferInit("chunk-a76knw89.js:16568", () => {
  TENGU_MARLIN_THICKET = "tengu_marlin_thicket";
  MARLIN_THICKET_FLAG = "ide";
  ideReadSlot = new SessionRootSlot(() => ({
    read: false,
  }));
});
//@ chunk-a76knw89.js:16634-16692 placement
/**
 * 取对象自身的属性（不存在时 undefined）。
 */
function ownField(mcpLegacyKeyOwners, key) {
  return mcpLegacyKeyOwners && Object.hasOwn(mcpLegacyKeyOwners, key) ? mcpLegacyKeyOwners[key] : undefined;
}
export {
  reassembleBatchResults,
  countToolCallsSince,
  isBatchToolsUse,
  toolByAlias,
  aliasOfToolName,
  hideAliasedV1Tools,
  enabledToolsForAliases,
  ownField,
  ideReadSlot,
  TENGU_MARLIN_THICKET,
  MARLIN_THICKET_FLAG,
  canonicalToolName,
};

/**
 * services/api/toolSchemaWire.ts
 *
 * 2.1.316 新增：工具 schema 线上表示的缓存与替换
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (21)
 * attribution: placement 10, layout 11
 */
import { isDeepStrictEqual } from "util";
import { noopLedger, PromptPrefixLedger } from "./promptPrefixLedger.js";
import { expectPromptCacheDrop, MAIN as MAIN_2 } from "./promptCacheBreakDetection.js";
import { logError, logMCPError } from "../../utils/log.js";
import { lit as lit_2 } from "../analytics/safeMetadata.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../../tools/ScheduleWakeupTool/prompt.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import {
  ARTIFACT_TOOL_NAME as ARTIFACT_TOOL_NAME_2,
  ARTIFACT_COMMENTS_TOOL_NAME,
  ARTIFACT_DATA_TOOL_NAME,
  ARTIFACT_CHECK_TOOL_NAME,
} from "../../tools/ArtifactTool/constants.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { WAITFORMCPSERVERS } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { END_CONVERSATION_TOOL_NAME as END_CONVERSATION_TOOL_NAME_2 } from "../../tools/EndConversationTool/constants.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { jsonStringifyRaw } from "../../utils/slowOperations.js";
import { toError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { findToolByName } from "../../Tool.js";
import { isMcpTool } from "../mcp/utils.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession, isCcsTenant } from "../../bootstrap/state.js";
import { isUnsentImageBlock, UNSENT } from "../../utils/messages.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import { isBase64ImageBlock as isBase64ImageBlock_3 } from "../../utils/imageValidation.js";
import { isObjectBlock } from "../../utils/toolResultStorage.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { isFoamySpringEnabled } from "../analytics/growthbookGates.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1524433-1524736 placement
/**
 * 发现非延迟工具的描述与记录不一致时，标记"工具描述变化"，主链上预期缓存失效。
 */
function noteToolRedescribed(conversation, tools, { redescribed, recorded, isMainChain }) {
  try {
    if (redescribed === undefined || recorded === undefined) return;
    if (
      !tools.some(
        (schema) =>
          "description" in schema &&
          !("defer_loading" in schema && schema.defer_loading === true) &&
          redescribed.has(schema.name) &&
          recorded.has(schema.name) &&
          schema.description !== recorded.get(schema.name),
      )
    )
      return;
    noopLedger(conversation, "tool_redescribed");
    if (isMainChain) expectPromptCacheDrop(MAIN_2);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:1524736-1524761 placement
function emptyObject(conversation) {
  return {};
}
//@ chunk-5xgkngpb.js:1524761-1524834 placement
function promptPrefixLedgerFor(conversation) {
  conversation.sentPrefix.ledger ??= new PromptPrefixLedger();
  return conversation.sentPrefix.ledger;
}
//@ chunk-5xgkngpb.js:1524834-1525030 placement
function querySourceBucket(querySource) {
  if (querySource === "sdk") return lit_2("sdk");
  if (querySource.startsWith("repl_main_thread")) return lit_2("main");
  if (querySource.startsWith("agent:")) return lit_2("agent");
  if (querySource === "compact") return lit_2("compact");
  return lit_2("side");
}
//@ chunk-5xgkngpb.js:1525030-1525693 placement
/**
 * 遥测用的工具名到站点标签映射，以及缓存失效涉及部位（messages/system/tools 组合）的编码表。
 */
var TOOL_SITE_LABELS; // deferred: uses AGENT (../../tools/AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var PREFIX_SEGMENT_LABELS;
deferInit("chunk-5xgkngpb.js:1525030", () => {
  TOOL_SITE_LABELS = new Map([
    [BASH_TOOL_NAME, lit_2("tools:Bash")],
    [SCHEDULE_WAKEUP_TOOL_NAME, lit_2("tools:ScheduleWakeup")],
    [AGENT, lit_2("tools:Agent")],
    [SKILL, lit_2("tools:Skill")],
    [TOOL_SEARCH_TOOL_NAME, lit_2("tools:ToolSearch")],
    [ARTIFACT_TOOL_NAME_2, lit_2("tools:Artifact")],
    [ARTIFACT_COMMENTS_TOOL_NAME, lit_2("tools:ArtifactComments")],
    [ARTIFACT_DATA_TOOL_NAME, lit_2("tools:ArtifactData")],
    [ARTIFACT_CHECK_TOOL_NAME, lit_2("tools:ArtifactCheck")],
    [SENDMESSAGE, lit_2("tools:SendMessage")],
    [SEND_USER_FILE_TOOL_NAME, lit_2("tools:SendUserFile")],
    [READ, lit_2("tools:Read")],
    [EDIT, lit_2("tools:Edit")],
    [FILE_WRITE_TOOL_NAME, lit_2("tools:Write")],
    [POWERSHELL_TOOL_NAME, lit_2("tools:PowerShell")],
    [MONITOR, lit_2("tools:Monitor")],
    [WAITFORMCPSERVERS, lit_2("tools:WaitForMcpServers")],
    [END_CONVERSATION_TOOL_NAME_2, lit_2("tools:EndConversation")],
  ]);
  PREFIX_SEGMENT_LABELS = new Map([
    [1, lit_2("messages")],
    [2, lit_2("system")],
    [3, lit_2("system+messages")],
    [4, lit_2("tools")],
    [5, lit_2("tools+messages")],
    [6, lit_2("tools+system")],
    [7, lit_2("tools+system+messages")],
  ]);
});
//@ chunk-5xgkngpb.js:1525736-1525766 placement
var MAX_SCHEMA_SUBSTITUTIONS = 8;
var EMPTY_OBJECT_SCHEMA = {
  type: "object",
};
//@ chunk-5xgkngpb.js:1525766-1525799 placement
function schemaHash(inputSchema) {
  return computeContentHash(jsonStringifyRaw(inputSchema));
}
//@ chunk-5xgkngpb.js:1525799-1526077 placement
function applyRefusedToolSchemas(toolsForRequest, conversation) {
  let refusedToolSchemas = conversation.refusedToolSchemas;
  if (refusedToolSchemas.size === 0) return toolsForRequest;
  try {
    return toolsForRequest.map((schema) => {
      if (
        !("input_schema" in schema) ||
        !refusedToolSchemas.has(schema.name) ||
        refusedToolSchemas.get(schema.name) !== schemaHash(schema.input_schema)
      )
        return schema;
      let { eager_input_streaming: eagerInputStreaming, ...rest } = schema;
      return {
        ...rest,
        input_schema: {
          ...EMPTY_OBJECT_SCHEMA,
        },
      };
    });
  } catch (error) {
    logError(toError(error));
    return toolsForRequest;
  }
}
//@ chunk-5xgkngpb.js:1526077-1527320 placement
/**
 * 工具 schema 线上缓存：在限额内用已发送的 schema 引用替换重复的 input_schema。
 */
class ToolSchemaWireCache {
  #e;
  #t = 0;
  constructor(conversation) {
    this.#e = conversation;
  }
  resolve(error, toolSchemas, tools, querySource) {
    if (!(error instanceof APIError) || error.status !== 400) return;
    let matchIndex = /\btools\.(\d+)\.(?:custom\.)?input_schema\b/.exec(error.message)?.[1];
    if (matchIndex === undefined) return;
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_crescent", true))
      return this.#o("switched_off", querySource);
    let schema = toolSchemas?.[Number(matchIndex)];
    if (schema === undefined || !("input_schema" in schema))
      return this.#o("no_mcp_tool_at_index", querySource);
    let toolByName = findToolByName(tools, schema.name);
    if (
      !isMcpTool({
        name: schema.name,
        isMcp: toolByName?.isMcp,
      })
    )
      return this.#o("no_mcp_tool_at_index", querySource);
    if (isDeepStrictEqual(schema.input_schema, EMPTY_OBJECT_SCHEMA))
      return this.#o("already_replaced", querySource);
    if (this.#t >= MAX_SCHEMA_SUBSTITUTIONS) return this.#o("bound_reached", querySource);
    this.#e.refusedToolSchemas.set(schema.name, schemaHash(schema.input_schema));
    this.#t++;
    logFeatureSad("api_tool_schema_replacement", "replaced", this.#n(querySource));
    if (toolByName?.mcpInfo)
      logMCPError(
        toolByName.mcpInfo.serverName,
        `Tool "${toolByName.mcpInfo.toolName}": the API refused this tool's input schema. Claude can still call the tool in this conversation, but does not see its parameters. Fix the schema on the MCP server, then start a new conversation. The API said: ${error.message}`,
      );
    return `retry:tool-schema-refused-${this.#t}`;
  }
  #n(querySource) {
    return {
      replacements: this.#t,
      query_source: agentTypeForTelemetry(querySource),
    };
  }
  #o(reason, querySource) {
    logFeatureBad("api_tool_schema_replacement", reason, this.#n(querySource));
  }
  served() {
    try {
      if (this.#t > 0)
        logFeatureOk("api_tool_schema_replacement", {
          replacements: this.#t,
        });
    } catch (error) {
      logError(toError(error));
    }
  }
}
//@ chunk-5xgkngpb.js:1527320-1527401 layout
var TENGU_HAZY_HAMSTER; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var ccsUnsentMediaByAgent;
var ccsUnsentMediaBlocks;
deferInit("chunk-5xgkngpb.js:1527320", () => {
  TENGU_HAZY_HAMSTER = "tengu_hazy_hamster";
  ccsUnsentMediaByAgent = new SessionRootSlot(() => new Map());
  ccsUnsentMediaBlocks = new SessionRootSlot(() => new WeakSet());
});
//@ chunk-5xgkngpb.js:1527401-1527472 layout
function unsentMediaReportFor(agentId) {
  try {
    return ccsUnsentMediaByAgent.peek(getRootSession())?.get(agentId);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-5xgkngpb.js:1527472-1527603 layout
function unsentMediaByteLength(block) {
  if (!isUnsentImageBlock(block)) return;
  return ccsUnsentMediaBlocks.peek(getRootSession())?.has(block.source)
    ? Number(block.source.data.slice(UNSENT.length))
    : block.source.data.length;
}
//@ chunk-5xgkngpb.js:1527603-1527944 layout
function recordUnsentMedia(agentId, blocks) {
  try {
    if (
      blocks.length === 0 ||
      !isCcsTenant() ||
      readFlagWithOverride(TENGU_HAZY_HAMSTER, {
        safe: false,
      })
    )
      return;
    let report = unsentMediaReportFor(agentId);
    if (report === undefined) {
      report = {
        blocks: new WeakSet(),
        reports: 0,
      };
      ccsUnsentMediaByAgent.of(getRootSession()).set(agentId, report);
      logFeatureOk("ccs_unsent_media");
    }
    let sawNewBlock = false;
    for (let block of blocks)
      if (isBase64ImageBlock_3(block) && block.source.data.length > 0 && !report.blocks.has(block)) {
        report.blocks.add(block);
        sawNewBlock = true;
      }
    if (sawNewBlock) report.reports++;
  } catch (error) {
    logError(error);
    logFeatureBad("ccs_unsent_media", "report_failed");
  }
}
//@ chunk-5xgkngpb.js:1527944-1528195 layout
class UnsentMediaReporter {
  agentId;
  seenOf;
  seen = 0;
  constructor(agentId) {
    this.agentId = agentId;
  }
  hasReports() {
    return unsentMediaReportFor(this.agentId) !== undefined;
  }
  hasNews() {
    let report = unsentMediaReportFor(this.agentId);
    if (report === undefined || (report === this.seenOf && report.reports === this.seen)) return false;
    this.seenOf = report;
    this.seen = report.reports;
    return true;
  }
}
//@ chunk-5xgkngpb.js:1528195-1528236 layout
function forgetUnsentMediaReport(agentId) {
  ccsUnsentMediaByAgent.peek(getRootSession())?.delete(agentId);
}
//@ chunk-5xgkngpb.js:1528236-1529191 layout
function letGoOfUnsentMedia(messages, agentId, shouldSkip) {
  try {
    let blocks = unsentMediaReportFor(agentId)?.blocks;
    if (blocks === undefined) return messages;
    let unsentBlocks = ccsUnsentMediaBlocks.of(getRootSession());
    let next;
    for (let [index, message] of messages.entries()) {
      if (message.type !== "user" || !Array.isArray(message.message.content)) continue;
      let unsentByData = new Map();
      let mapped = message.message.content.map((block) => {
        if (
          !isObjectBlock(block) ||
          block.type !== "tool_result" ||
          !Array.isArray(block.content) ||
          !block.content.some((item) => blocks.has(item)) ||
          shouldSkip?.(block.tool_use_id)
        )
          return block;
        return {
          ...block,
          content: block.content.map((item) => {
            if (!blocks.has(item)) return item;
            if (item.type === "image" && item.source.type === "base64")
              return {
                ...item,
                source: markUnsentSource(item.source, unsentByData, unsentBlocks),
              };
            if (item.type === "document" && item.source.type === "base64")
              return {
                ...item,
                source: markUnsentSource(item.source, unsentByData, unsentBlocks),
              };
            return item;
          }),
        };
      });
      if (unsentByData.size > 0) {
        for (let mappedMessage of mapped)
          if (
            isObjectBlock(mappedMessage) &&
            mappedMessage.type === "tool_result" &&
            Array.isArray(mappedMessage.content)
          ) {
            for (let block of mappedMessage.content)
              if (isBase64ImageBlock_3(block)) unsentByData.delete(block.source.data);
          }
        next ??= [...messages];
        next[index] = {
          ...message,
          message: {
            ...message.message,
            content: mapped,
          },
          ...(message.toolUseResult !== undefined && {
            toolUseResult: replaceUnsentMediaMarkers(message.toolUseResult, unsentByData, 4),
          }),
        };
      }
    }
    return next ?? messages;
  } catch (error) {
    logError(error);
    logFeatureBad("ccs_unsent_media", "let_go_failed");
    return messages;
  }
}
//@ chunk-5xgkngpb.js:1529191-1529271 layout
function letGoOfUnsentMediaInPlace(messages, agentId, shouldSkip) {
  let next = letGoOfUnsentMedia(messages, agentId, shouldSkip);
  if (next !== messages) for (let [index, message] of next.entries()) messages[index] = message;
}
//@ chunk-5xgkngpb.js:1529271-1529453 layout
function toolResultUseIds(messages) {
  return new Set(
    messages
      .flatMap((message) =>
        message.type === "user" && Array.isArray(message.message.content) ? message.message.content : [],
      )
      .flatMap((block) => (isObjectBlock(block) && block.type === "tool_result" ? [block.tool_use_id] : [])),
  );
}
//@ chunk-5xgkngpb.js:1529453-1529558 layout
function markUnsentSource(source, unsentByData, unsentBlocks) {
  let marker = `${UNSENT}${source.data.length}`;
  unsentByData.set(source.data, marker);
  let unsentBlock = {
    ...source,
    data: marker,
  };
  unsentBlocks.add(unsentBlock);
  return unsentBlock;
}
//@ chunk-5xgkngpb.js:1529558-1530003 layout
function replaceUnsentMediaMarkers(value, unsentByData, depth) {
  if (typeof value === "string") {
    let replaced = unsentByData.get(value);
    if (replaced !== undefined) return replaced;
    for (let [data, marker] of unsentByData)
      if (value.endsWith(`,${data}`)) return `${value.slice(0, value.length - data.length)}${marker}`;
    return value;
  }
  if (depth === 0) return value;
  if (Array.isArray(value)) {
    let mapped = value.map((item) => replaceUnsentMediaMarkers(item, unsentByData, depth - 1));
    return mapped.some((item, index) => item !== value[index]) ? mapped : value;
  }
  if (!isPlainObject_6(value) || ArrayBuffer.isView(value)) return value;
  let mapped = Object.entries(value).map(([key, value]) => [
    key,
    replaceUnsentMediaMarkers(value, unsentByData, depth - 1),
  ]);
  return mapped.some(([key, mappedValue]) => mappedValue !== Reflect.get(value, key))
    ? Object.fromEntries(mapped)
    : value;
}
//@ chunk-5xgkngpb.js:1530003-1530030 placement
function isFoamySpringWireOn() {
  return isFoamySpringEnabled();
}
export {
  unsentMediaByteLength,
  noteToolRedescribed,
  applyRefusedToolSchemas,
  ToolSchemaWireCache,
  isFoamySpringWireOn,
  recordUnsentMedia,
  emptyObject,
  UnsentMediaReporter,
  toolResultUseIds,
  letGoOfUnsentMediaInPlace,
  letGoOfUnsentMedia,
  promptPrefixLedgerFor,
  querySourceBucket,
  forgetUnsentMediaReport,
};

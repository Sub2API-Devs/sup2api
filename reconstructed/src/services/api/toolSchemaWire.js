/**
 * services/api/toolSchemaWire.ts
 *
 * 2.1.316 新增：工具 schema 线上表示的缓存与替换
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
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
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
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
import { isFoamySpringEnabled } from "../analytics/growthbookGates.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1521691-1521994 placement
/**
 * 发现非延迟工具的描述与记录不一致时，标记"工具描述变化"，主链上预期缓存失效。
 */
function noteToolRedescribed(conversation, toolSchemas, { redescribed, recorded, isMainChain }) {
  try {
    if (redescribed === undefined || recorded === undefined) return;
    if (
      !toolSchemas.some(
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
//@ chunk-e6aww6q8.js:1521994-1522019 placement
function emptyObject(conversation) {
  return {};
}
//@ chunk-e6aww6q8.js:1522019-1522092 placement
function promptPrefixLedgerFor(conversation) {
  conversation.sentPrefix.ledger ??= new PromptPrefixLedger();
  return conversation.sentPrefix.ledger;
}
//@ chunk-e6aww6q8.js:1522092-1522288 placement
function querySourceBucket(querySource) {
  if (querySource === "sdk") return lit_2("sdk");
  if (querySource.startsWith("repl_main_thread")) return lit_2("main");
  if (querySource.startsWith("agent:")) return lit_2("agent");
  if (querySource === "compact") return lit_2("compact");
  return lit_2("side");
}
//@ chunk-e6aww6q8.js:1522288-1522951 placement
/**
 * 遥测用的工具名到站点标签映射，以及缓存失效涉及部位（messages/system/tools 组合）的编码表。
 */
var TOOL_SITE_LABELS; // deferred: uses AGENT (../../tools/AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var PREFIX_SEGMENT_LABELS;
deferInit("chunk-e6aww6q8.js:1522288", () => {
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
    [FILE_READ_TOOL_NAME, lit_2("tools:Read")],
    [FILE_EDIT_TOOL_NAME, lit_2("tools:Edit")],
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
//@ chunk-e6aww6q8.js:1522994-1523024 placement
var MAX_SCHEMA_SUBSTITUTIONS = 8;
var EMPTY_OBJECT_SCHEMA = {
  type: "object",
};
//@ chunk-e6aww6q8.js:1523024-1523057 placement
function schemaHash(inputSchema) {
  return computeContentHash(jsonStringifyRaw(inputSchema));
}
//@ chunk-e6aww6q8.js:1523057-1523335 placement
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
//@ chunk-e6aww6q8.js:1523335-1524578 placement
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
//@ chunk-e6aww6q8.js:1524578-1524605 placement
function isFoamySpringWireOn() {
  return isFoamySpringEnabled();
}
export {
  noteToolRedescribed,
  applyRefusedToolSchemas,
  ToolSchemaWireCache,
  isFoamySpringWireOn,
  emptyObject,
  promptPrefixLedgerFor,
  querySourceBucket,
};

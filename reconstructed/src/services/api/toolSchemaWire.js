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
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
  isDeepStrictEqual as isDeepStrictEqual_5,
  isDeepStrictEqual as isDeepStrictEqual_6,
  isDeepStrictEqual as isDeepStrictEqual_7,
  isDeepStrictEqual as isDeepStrictEqual_8,
  isDeepStrictEqual as isDeepStrictEqual_9,
  isDeepStrictEqual as isDeepStrictEqual_10,
  isDeepStrictEqual as isDeepStrictEqual_11,
  isDeepStrictEqual as isDeepStrictEqual_12,
  isDeepStrictEqual as isDeepStrictEqual_13,
  isDeepStrictEqual as isDeepStrictEqual_14,
  isDeepStrictEqual as isDeepStrictEqual_15,
  isDeepStrictEqual as isDeepStrictEqual_16,
  isDeepStrictEqual as isDeepStrictEqual_17,
  isDeepStrictEqual as isDeepStrictEqual_18,
  isDeepStrictEqual as isDeepStrictEqual_19,
} from "util";
import { lse, PromptPrefixLedger } from "./promptPrefixLedger.js";
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
import { Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { findToolByName } from "../../Tool.js";
import { isMcpTool } from "../mcp/utils.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";
import { isFoamySpringEnabled } from "../analytics/growthbookGates.js";

/**
 * 发现非延迟工具的描述与记录不一致时，标记"工具描述变化"，主链上预期缓存失效。
 */
//@ chunk-e6aww6q8.js:1521691-1521994 placement
function noteToolRedescribed(
  e,
  n,
  { redescribed: redescribed, recorded: recorded, isMainChain: isMainChain },
) {
  try {
    if (redescribed === void 0 || recorded === void 0) return;
    if (
      !n.some(
        (S) =>
          "description" in S &&
          !("defer_loading" in S && S.defer_loading === !0) &&
          redescribed.has(S.name) &&
          recorded.has(S.name) &&
          S.description !== recorded.get(S.name),
      )
    )
      return;
    if ((lse(e, "tool_redescribed"), isMainChain)) expectPromptCacheDrop(MAIN_2);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:1521994-1522019 placement
function _7t(e) {
  return {};
}
//@ chunk-e6aww6q8.js:1522019-1522092 placement
function i4o(e) {
  return ((e.sentPrefix.ledger ??= new PromptPrefixLedger()), e.sentPrefix.ledger);
}
//@ chunk-e6aww6q8.js:1522092-1522288 placement
function querySourceBucket(e) {
  if (e === "sdk") return lit_2("sdk");
  if (e.startsWith("repl_main_thread")) return lit_2("main");
  if (e.startsWith("agent:")) return lit_2("agent");
  if (e === "compact") return lit_2("compact");
  return lit_2("side");
}
/**
 * 遥测用的工具名到站点标签映射，以及缓存失效涉及部位（messages/system/tools 组合）的编码表。
 */
//@ chunk-e6aww6q8.js:1522288-1522951 placement
var TOOL_SITE_LABELS = new Map([
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
  ]),
  PREFIX_SEGMENT_LABELS = new Map([
    [1, lit_2("messages")],
    [2, lit_2("system")],
    [3, lit_2("system+messages")],
    [4, lit_2("tools")],
    [5, lit_2("tools+messages")],
    [6, lit_2("tools+system")],
    [7, lit_2("tools+system+messages")],
  ]);
//@ chunk-e6aww6q8.js:1522994-1523024 placement
var d4o = 8,
  S7t = { type: "object" };
//@ chunk-e6aww6q8.js:1523024-1523057 placement
function b7t(e) {
  return computeContentHash(jsonStringifyRaw(e));
}
//@ chunk-e6aww6q8.js:1523057-1523335 placement
function applyRefusedToolSchemas(e, n) {
  let refusedToolSchemas = n.refusedToolSchemas;
  if (refusedToolSchemas.size === 0) return e;
  try {
    return e.map((s) => {
      if (
        !("input_schema" in s) ||
        !refusedToolSchemas.has(s.name) ||
        refusedToolSchemas.get(s.name) !== b7t(s.input_schema)
      )
        return s;
      let { eager_input_streaming: eager_input_streaming, ...y } = s;
      return { ...y, input_schema: { ...S7t } };
    });
  } catch (error) {
    return (logError(toError(error)), e);
  }
}
/**
 * 工具 schema 线上缓存：在限额内用已发送的 schema 引用替换重复的 input_schema。
 */
//@ chunk-e6aww6q8.js:1523335-1524578 placement
class ToolSchemaWireCache {
  #e;
  #t = 0;
  constructor(e) {
    this.#e = e;
  }
  resolve(e, n, r, s) {
    if (!(e instanceof Ot) || e.status !== 400) return;
    let h = /\btools\.(\d+)\.(?:custom\.)?input_schema\b/.exec(e.message)?.[1];
    if (h === void 0) return;
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_crescent", !0)) return this.#o("switched_off", s);
    let y = n?.[Number(h)];
    if (y === void 0 || !("input_schema" in y)) return this.#o("no_mcp_tool_at_index", s);
    let S = findToolByName(r, y.name);
    if (!isMcpTool({ name: y.name, isMcp: S?.isMcp })) return this.#o("no_mcp_tool_at_index", s);
    if (isDeepStrictEqual_9(y.input_schema, S7t)) return this.#o("already_replaced", s);
    if (this.#t >= d4o) return this.#o("bound_reached", s);
    if (
      (this.#e.refusedToolSchemas.set(y.name, b7t(y.input_schema)),
      this.#t++,
      logFeatureSad("api_tool_schema_replacement", "replaced", this.#n(s)),
      S?.mcpInfo)
    )
      logMCPError(
        S.mcpInfo.serverName,
        `Tool "${S.mcpInfo.toolName}": the API refused this tool's input schema. Claude can still call the tool in this conversation, but does not see its parameters. Fix the schema on the MCP server, then start a new conversation. The API said: ${e.message}`,
      );
    return `retry:tool-schema-refused-${this.#t}`;
  }
  #n(e) {
    return { replacements: this.#t, query_source: agentTypeForTelemetry(e) };
  }
  #o(e, n) {
    logFeatureBad("api_tool_schema_replacement", e, this.#n(n));
  }
  served() {
    try {
      if (this.#t > 0) logFeatureOk("api_tool_schema_replacement", { replacements: this.#t });
    } catch (error) {
      logError(toError(error));
    }
  }
}
//@ chunk-e6aww6q8.js:1524578-1524605 placement
function v7t() {
  return isFoamySpringEnabled();
}

export {
  noteToolRedescribed,
  applyRefusedToolSchemas,
  ToolSchemaWireCache,
  v7t,
  _7t,
  i4o,
  querySourceBucket,
};

/**
 * entrypoints/mcpServe/serveModeInput.ts
 *
 * 2.1.316 新增：mcp serve 模式工具集构建与客户端特权字段剥离
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-spbsnp6d.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getDefaultAppState_2 } from "../../state/AppStateStore.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";
import { REFUSED_INPUT_FIELDS_WHEN_SANDBOX_REQUIRED } from "../../tools/BashTool/BashTool.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { getTools } from "../../tools.js";
import { getEmptyToolPermissionContext, matchesToolName, getToolRemoteExecution } from "../../Tool.js";
import { isMultiEntryAliasTool } from "../../services/tools/permissionCheckGuard.js";
import { getShadowedSearchToolNames } from "../../utils/embeddedTools.js";
import { GlobTool } from "../../tools/GlobTool/GlobTool.js";
import { GrepTool } from "../../tools/GrepTool/GrepTool.js";
import { getDispatchableAgents } from "../../utils/permissions/permissions.js";
import { filterAgentsByMcpRequirements } from "../../tools/AgentTool/loadAgentsDir.js";
import { formatAgentLine, AGENT_LIST_IN_REMINDER_NOTE } from "../../tools/AgentTool/prompt.js";
import { toolInputJsonSchema } from "../../plugins/functionHooks/types/builtinToolSchemas.js";
import { WEBSEARCH, fillMonthYear } from "../../tools/WebSearchTool/prompt.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { AGENT_TYPES_NOTE } from "../../constants/promptSections.js";
import { HOST_TOOL_INPUT_FIELD } from "../../bridge/deviceRegistration.js";
import { getHostAgentPolicy, runWithHostAgentPolicy, HostAgentPolicy } from "../../utils/hostAgentPolicy.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-spbsnp6d.js:862-908 placement
var serveModeDefaultAppState = () =>
  getDefaultAppState_2({
    promptSuggestionEnabled: false,
  });
//@ chunk-spbsnp6d.js:908-975 placement
/**
 * 导出值：同一声明里的多个绑定：SERVE_MODE_KEYS（标识 serve 模式的键集合）；SERVE_MODE_VALUE（serve 模式取值）。
 */
var SERVE_MODE_CORE_TOOLS; // deferred: uses GREP_TOOL_NAME (../../tools/GrepTool/prompt.js) of its import cycle while loading; runs once the cycle is complete
var SERVE_MODE_KEYS;
var SERVE_MODE_VALUE;
deferInit("chunk-spbsnp6d.js:908", () => {
  SERVE_MODE_CORE_TOOLS = new Set([
    BASH_TOOL_NAME,
    READ,
    EDIT,
    FILE_WRITE_TOOL_NAME,
    GREP_TOOL_NAME,
    GLOB_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
    POWERSHELL_TOOL_NAME,
  ]);
  SERVE_MODE_KEYS = new Set([SEND_USER_FILE_TOOL_NAME]);
  SERVE_MODE_VALUE = REFUSED_INPUT_FIELDS_WHEN_SANDBOX_REQUIRED;
});
//@ chunk-spbsnp6d.js:975-1034 placement
function coerceServedInput(tool, rawInput) {
  return tool.coerceInput?.(omitAlias(rawInput, SERVE_MODE_VALUE))?.input;
}
//@ chunk-spbsnp6d.js:1034-1079 placement
function serveModeInput(tool, rawInput) {
  return coerceServedInput(tool, rawInput) ?? omitAlias(rawInput, SERVE_MODE_VALUE);
}
//@ chunk-spbsnp6d.js:1079-1138 placement
function parseServeModeInput(tool, rawInput) {
  return tool.inputSchema.safeParse(serveModeInput(tool, rawInput));
}
//@ chunk-spbsnp6d.js:1138-1236 placement
function strippedPrivilegeFieldsNote(fields) {
  return `[serve-mode] Stripped client-supplied privilege field(s): ${fields.join(", ")}`;
}
//@ chunk-spbsnp6d.js:1236-1470 placement
function omitSchemaProperties(schema, fields) {
  if (schema.properties === undefined || fields.length === 0) return schema;
  let properties = {
    ...schema.properties,
  };
  for (let field of fields) delete properties[field];
  let required = Array.isArray(schema.required)
    ? schema.required.filter((field) => !fields.includes(field))
    : schema.required;
  return {
    ...schema,
    properties,
    required,
  };
}
//@ chunk-spbsnp6d.js:1470-1793 placement
function serveModeTools(isHttp, { skipSearchToolRestore = false } = {}) {
  let filtered = getTools(getEmptyToolPermissionContext(), {
    skipReplFilter: true,
    skipSimpleModeFilter: isHttp,
    ...(isHttp && {
      onlyNames: SERVE_MODE_CORE_TOOLS,
    }),
  }).filter((tool) => !isMultiEntryAliasTool(tool));
  if (!isHttp) return filtered;
  let filtered_2 = filtered.filter((tool) => SERVE_MODE_CORE_TOOLS.has(tool.name));
  if (skipSearchToolRestore) return filtered_2;
  let shadowedSearchToolNames = getShadowedSearchToolNames();
  let filtered_3 = [GlobTool, GrepTool].filter(
    (searchTool) =>
      shadowedSearchToolNames.has(searchTool.name) &&
      SERVE_MODE_CORE_TOOLS.has(searchTool.name) &&
      !filtered_2.includes(searchTool) &&
      searchTool.isEnabled(),
  );
  return [...filtered_2, ...filtered_3];
}
//@ chunk-spbsnp6d.js:1793-2682 placement
/**
 * 为 claude mcp serve 构建对外提供的工具集与 agent 定义（http 模式不含 agent 列表）。
 */
async function buildServeModeToolset(transportKind, options = {}, modelOptions) {
  let isHttp = transportKind === "http";
  let emptyToolPermissionContext = getEmptyToolPermissionContext();
  let tools = serveModeTools(isHttp, options);
  let agentDefinitions = options.agentDefinitions ?? {
    activeAgents: [],
    allAgents: [],
  };
  let agents = isHttp
    ? []
    : await getDispatchableAgents(
        filterAgentsByMcpRequirements(agentDefinitions.activeAgents, []),
        agentDefinitions.allowedAgentTypes,
        emptyToolPermissionContext,
      );
  let agentListText =
    agents.length > 0
      ? `Available agent types:
${agents.map((agent) => formatAgentLine(agent, false)).join(`
`)}`
      : "";
  let fn = () =>
    Promise.all(
      tools.map(async (tool) => {
        let inputJsonSchema = toolInputJsonSchema(tool.inputSchema);
        let { remoteExecution, outputSchemaAcrossProcesses, ...toolRest } = tool;
        let description = await tool.prompt({
          getToolPermissionContext: async () => emptyToolPermissionContext,
          tools,
          agents: agentDefinitions.activeAgents,
          ...(modelOptions !== undefined && {
            model: modelOptions.model,
            leanPrompt: modelOptions.leanPrompt,
            bashFirstTrimmed: false,
          }),
        });
        return {
          ...toolRest,
          description: matchesToolName(tool, WEBSEARCH)
            ? fillMonthYear(description)
            : matchesToolName(tool, AGENT)
              ? description.replace(
                  description.includes(AGENT_LIST_IN_REMINDER_NOTE)
                    ? AGENT_LIST_IN_REMINDER_NOTE
                    : AGENT_TYPES_NOTE,
                  () => agentListText,
                )
              : description,
          inputSchema: omitSchemaProperties(inputJsonSchema, [
            ...(isHttp ? SERVE_MODE_VALUE : []),
            ...(getToolRemoteExecution(tool).supported ? [HOST_TOOL_INPUT_FIELD] : []),
          ]),
          outputSchema: undefined,
        };
      }),
    );
  if (!isHttp) return fn();
  let hostAgentPolicy = getHostAgentPolicy();
  if (
    hostAgentPolicy.backgroundTasksDisabled &&
    hostAgentPolicy.unsandboxedCommandsDisabled &&
    !hostAgentPolicy.backgroundShellsKeptElsewhere
  )
    return fn();
  for (let tool of tools) tool.inputSchema;
  return runWithHostAgentPolicy(restrictHostAgentPolicy(), fn);
}
//@ chunk-spbsnp6d.js:2682-2773 placement
function restrictHostAgentPolicy(hostAgentPolicy = new HostAgentPolicy()) {
  hostAgentPolicy.disableBackgroundTasks();
  hostAgentPolicy.disableUnsandboxedCommands();
  return hostAgentPolicy;
}
export {
  serveModeTools,
  coerceServedInput,
  SERVE_MODE_VALUE,
  serveModeInput,
  SERVE_MODE_KEYS,
  strippedPrivilegeFieldsNote,
  parseServeModeInput,
  serveModeDefaultAppState,
  restrictHostAgentPolicy,
  buildServeModeToolset,
};

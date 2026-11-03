/**
 * entrypoints/mcpServe/serveModeInput.ts
 *
 * 2.1.316 新增：mcp serve 模式工具集构建与客户端特权字段剥离
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-387jwn0v.js (10)
 * attribution: placement 10
 */
import { getDefaultAppState_2 } from "../../state/AppStateStore.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";
import { BUr } from "../../tools/BashTool/BashTool.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { getTools } from "../../tools.js";
import { getEmptyToolPermissionContext, toolMatchesName, getToolRemoteExecution } from "../../Tool.js";
import { isMultiEntryAliasTool } from "../../services/tools/permissionCheckGuard.js";
import { getShadowedSearchToolNames } from "../../utils/embeddedTools.js";
import { GlobTool } from "../../tools/GlobTool/GlobTool.js";
import { GrepTool } from "../../tools/GrepTool/GrepTool.js";
import { getDispatchableAgents } from "../../utils/permissions/permissions.js";
import { filterAgentsByMcpRequirements } from "../../tools/AgentTool/loadAgentsDir.js";
import { formatAgentLine, AGENT_LIST_IN_REMINDER_NOTE } from "../../tools/AgentTool/prompt.js";
import { toolInputJsonSchema } from "../../plugins/functionHooks/types/builtinToolSchemas.js";
import { WEBSEARCH, efi } from "../../tools/WebSearchTool/prompt.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { JQo } from "../../constants/promptSections.js";
import { $r } from "../../bridge/deviceRegistration.js";
import { getHostAgentPolicy, runWithHostAgentPolicy, HostAgentPolicy } from "../../utils/hostAgentPolicy.js";

//@ chunk-387jwn0v.js:796-842 placement
var serveModeDefaultAppState = () => getDefaultAppState_2({ promptSuggestionEnabled: !1 });
//@ chunk-387jwn0v.js:842-909 placement
var SERVE_MODE_CORE_TOOLS = new Set([
    BASH_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    GREP_TOOL_NAME,
    GLOB_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
    POWERSHELL_TOOL_NAME,
  ]),
  Jje = new Set([SEND_USER_FILE_TOOL_NAME]),
  Zde = BUr;
//@ chunk-387jwn0v.js:909-968 placement
function coerceServedInput(e, o) {
  return e.coerceInput?.(Uo(o, Zde))?.input;
}
//@ chunk-387jwn0v.js:968-1013 placement
function serveModeInput(e, o) {
  return coerceServedInput(e, o) ?? Uo(o, Zde);
}
//@ chunk-387jwn0v.js:1013-1072 placement
function parseServeModeInput(e, o) {
  return e.inputSchema.safeParse(serveModeInput(e, o));
}
//@ chunk-387jwn0v.js:1072-1170 placement
function strippedPrivilegeFieldsNote(e) {
  return `[serve-mode] Stripped client-supplied privilege field(s): ${e.join(", ")}`;
}
//@ chunk-387jwn0v.js:1170-1404 placement
function omitSchemaProperties(e, o) {
  if (e.properties === void 0 || o.length === 0) return e;
  let s = { ...e.properties };
  for (let i of o) delete s[i];
  let r = Array.isArray(e.required) ? e.required.filter((i) => !o.includes(i)) : e.required;
  return { ...e, properties: s, required: r };
}
//@ chunk-387jwn0v.js:1404-1727 placement
function serveModeTools(e, { skipSearchToolRestore: o = !1 } = {}) {
  let filtered = getTools(getEmptyToolPermissionContext(), {
    skipReplFilter: !0,
    skipSimpleModeFilter: e,
    ...(e && { onlyNames: SERVE_MODE_CORE_TOOLS }),
  }).filter((t) => !isMultiEntryAliasTool(t));
  if (!e) return filtered;
  let filtered_2 = filtered.filter((t) => SERVE_MODE_CORE_TOOLS.has(t.name));
  if (o) return filtered_2;
  let i = getShadowedSearchToolNames(),
    filtered_3 = [GlobTool, GrepTool].filter(
      (t) => i.has(t.name) && SERVE_MODE_CORE_TOOLS.has(t.name) && !filtered_2.includes(t) && t.isEnabled(),
    );
  return [...filtered_2, ...filtered_3];
}
/**
 * 为 claude mcp serve 构建对外提供的工具集与 agent 定义（http 模式不含 agent 列表）。
 */
//@ chunk-387jwn0v.js:1727-2616 placement
async function buildServeModeToolset(e, o = {}, s) {
  let r = e === "http",
    i = getEmptyToolPermissionContext(),
    p = serveModeTools(r, o),
    t = o.agentDefinitions ?? { activeAgents: [], allAgents: [] },
    d = r
      ? []
      : await getDispatchableAgents(
          filterAgentsByMcpRequirements(t.activeAgents, []),
          t.allowedAgentTypes,
          i,
        ),
    u =
      d.length > 0
        ? `Available agent types:
${d.map((n) => formatAgentLine(n, !1)).join(`
`)}`
        : "",
    m = () =>
      Promise.all(
        p.map(async (n) => {
          let T = toolInputJsonSchema(n.inputSchema),
            {
              remoteExecution: remoteExecution,
              outputSchemaAcrossProcesses: outputSchemaAcrossProcesses,
              ...f
            } = n,
            prompt = await n.prompt({
              getToolPermissionContext: async () => i,
              tools: p,
              agents: t.activeAgents,
              ...(s !== void 0 && { model: s.model, leanPrompt: s.leanPrompt, bashFirstTrimmed: !1 }),
            });
          return {
            ...f,
            description: toolMatchesName(n, WEBSEARCH)
              ? efi(prompt)
              : toolMatchesName(n, AGENT)
                ? prompt.replace(
                    prompt.includes(AGENT_LIST_IN_REMINDER_NOTE) ? AGENT_LIST_IN_REMINDER_NOTE : JQo,
                    () => u,
                  )
                : prompt,
            inputSchema: omitSchemaProperties(T, [
              ...(r ? Zde : []),
              ...(getToolRemoteExecution(n).supported ? [$r] : []),
            ]),
            outputSchema: void 0,
          };
        }),
      );
  if (!r) return m();
  let a = getHostAgentPolicy();
  if (a.backgroundTasksDisabled && a.unsandboxedCommandsDisabled && !a.backgroundShellsKeptElsewhere)
    return m();
  for (let n of p) n.inputSchema;
  return runWithHostAgentPolicy(restrictHostAgentPolicy(), m);
}
//@ chunk-387jwn0v.js:2616-2707 placement
function restrictHostAgentPolicy(e = new HostAgentPolicy()) {
  return (e.disableBackgroundTasks(), e.disableUnsandboxedCommands(), e);
}

export {
  serveModeTools,
  coerceServedInput,
  Zde,
  serveModeInput,
  restrictHostAgentPolicy,
  buildServeModeToolset,
  serveModeDefaultAppState,
  Jje,
  parseServeModeInput,
  strippedPrivilegeFieldsNote,
};

/**
 * cli/startup/agentsFlag.ts
 *
 * 2.1.316 新增：--agents 标志加载会话代理与追加子代理提示词
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (5)
 * attribution: placement 4, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve } from "path";
import { readFile } from "fs/promises";
import { getTools } from "../../tools.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { getCommands } from "../../commands.js";
import {
  getAgentDefinitionsWithOverrides,
  parseAgentsFromJson,
  rebuildAgentDefinitions,
} from "../../tools/AgentTool/loadAgentsDir.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { safeParseJSON } from "../../utils/json.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { setMainThreadAgentType } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { excludeWebFetchAgent } from "../../tools/WebFetchTool/harnessNotes.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";

//@ chunk-hjswk319.js:15441-16291 placement
/**
 * 启动时加载 agent 定义（--agents JSON、agent 设置、安全模式下忽略自定义 agent），并在工具加载后应用协调者过滤。
 */
async function loadAgentsForSession({
  cwd,
  toolPermissionContext,
  applyCoordinatorFilter,
  agentsJson,
  agentSetting,
  commandsPromise,
  agentDefsPromise,
  deferCommands,
  onToolsLoaded,
  storageV5,
}) {
  let tools = getTools(toolPermissionContext);
  if (applyCoordinatorFilter && isCoordinatorMode_2()) {
    let { applyCoordinatorToolFilter } = await import("../../utils/toolPool.js");
    tools = applyCoordinatorToolFilter(tools);
  }
  onToolsLoaded?.();
  commandsPromise?.catch(() => {});
  agentDefsPromise?.catch(() => {});
  let commands = commandsPromise ?? getCommands(cwd, storageV5);
  if (deferCommands) commands.catch(() => {});
  let [loadedCommands, defs] = await Promise.all([
    deferCommands ? Promise.resolve([]) : commands,
    agentDefsPromise ?? getAgentDefinitionsWithOverrides(cwd, storageV5),
  ]);
  let cliAgents = [];
  if (
    agentsJson &&
    !isCustomizationDisabled("agents", {
      explicitlyRequested: true,
    })
  )
    try {
      let agentsJson_2 = safeParseJSON(agentsJson);
      if (agentsJson_2) cliAgents = parseAgentsFromJson(agentsJson_2, "flagSettings");
    } catch (error) {
      logError(error);
    }
  else if (agentsJson)
    logForDebugging("--agents: ignored in safe mode (user-supplied custom agents are disabled)", {
      level: "warn",
    });
  let definitions = rebuildAgentDefinitions(defs, [...defs.allAgents, ...cliAgents]);
  let selectedAgent = findSelectedAgent(definitions.activeAgents, agentSetting);
  setMainThreadAgentType(selectedAgent?.agentType);
  return {
    tools,
    commands: loadedCommands,
    agentDefinitions: definitions,
    mainThreadAgentDefinition: selectedAgent,
    cliAgents,
    deferredCommandsPromise: deferCommands ? commands : undefined,
  };
}
//@ chunk-hjswk319.js:16291-16350 layout
/**
 * 是否同步安装插件（传入值存在且 CLAUDE_CODE_SYNC_PLUGIN_INSTALL）。
 */
function shouldSyncPluginInstall(isNonInteractiveSession) {
  return isNonInteractiveSession && env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL;
}
//@ chunk-hjswk319.js:16350-16602 placement
function findSelectedAgent(agents, setting) {
  if (!setting) return;
  let candidates = excludeWebFetchAgent(agents);
  let found =
    candidates.find((agent) => agent.agentType === setting) ??
    candidates.find((agent) => agent.agentType.endsWith(`:${setting}`));
  if (!found)
    logForDebugging(
      `Warning: agent "${setting}" not found. Available agents: ${agents.map((agent) => agent.agentType).join(", ")}. Using default behavior.`,
    );
  return found;
}
//@ chunk-hjswk319.js:16674-16756 placement
function enableAppendSubagentPrompt(appendSubagentSystemPrompt, env = process.env) {
  if (appendSubagentSystemPrompt) env.CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT = "1";
}
//@ chunk-hjswk319.js:16756-17312 placement
async function readAppendSubagentPrompt(options) {
  if (!options.appendSubagentSystemPromptFile)
    return {
      ok: true,
      prompt: options.appendSubagentSystemPrompt,
    };
  if (options.appendSubagentSystemPrompt)
    return {
      ok: false,
      error:
        "Error: Cannot use both --append-subagent-system-prompt and --append-subagent-system-prompt-file. Please use only one.",
    };
  let path = resolve(options.appendSubagentSystemPromptFile);
  try {
    return {
      ok: true,
      prompt: await readFile(path, "utf8"),
    };
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      return {
        ok: false,
        error: `Error: Append subagent system prompt file not found: ${path}`,
      };
    return {
      ok: false,
      error: `Error reading append subagent system prompt file: ${errorMessage(error)}`,
    };
  }
}
export {
  readAppendSubagentPrompt,
  enableAppendSubagentPrompt,
  shouldSyncPluginInstall,
  loadAgentsForSession,
  findSelectedAgent,
};

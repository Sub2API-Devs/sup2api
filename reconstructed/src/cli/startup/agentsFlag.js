/**
 * cli/startup/agentsFlag.ts
 *
 * 2.1.316 新增：--agents 标志加载会话代理与追加子代理提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (4)
 * attribution: placement 4
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
import { excludeWebFetchAgent } from "../../tools/WebFetchTool/harnessNotes.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";

//@ chunk-3wek6r2k.js:14860-15714 placement
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
    let { applyCoordinatorToolFilter } = await import("./chunk-7g8rqsne.js");
    tools = applyCoordinatorToolFilter(tools);
  }
  onToolsLoaded?.();
  commandsPromise?.catch(() => {});
  agentDefsPromise?.catch(() => {});
  let w = commandsPromise ?? getCommands(cwd, storageV5);
  if (deferCommands) w.catch(() => {});
  let [P, A] = await Promise.all([
    deferCommands ? Promise.resolve([]) : w,
    agentDefsPromise ?? getAgentDefinitionsWithOverrides(cwd, storageV5),
  ]);
  let se = [];
  if (
    agentsJson &&
    !isCustomizationDisabled("agents", {
      explicitlyRequested: true,
    })
  )
    try {
      let agentsJson_2 = safeParseJSON(agentsJson);
      if (agentsJson_2) se = parseAgentsFromJson(agentsJson_2, "flagSettings");
    } catch (error) {
      logError(error);
    }
  else if (agentsJson)
    logForDebugging("--agents: ignored in safe mode (user-supplied custom agents are disabled)", {
      level: "warn",
    });
  let q = rebuildAgentDefinitions(A, [...A.allAgents, ...se]);
  let selectedAgent = findSelectedAgent(q.activeAgents, agentSetting);
  setMainThreadAgentType(selectedAgent?.agentType);
  return {
    tools,
    commands: P,
    agentDefinitions: q,
    mainThreadAgentDefinition: selectedAgent,
    cliAgents: se,
    deferredCommandsPromise: deferCommands ? w : undefined,
  };
}
//@ chunk-3wek6r2k.js:15773-16025 placement
function findSelectedAgent(activeAgents, o) {
  if (!o) return;
  let n = excludeWebFetchAgent(activeAgents);
  let r = n.find((u) => u.agentType === o) ?? n.find((u) => u.agentType.endsWith(`:${o}`));
  if (!r)
    logForDebugging(
      `Warning: agent "${o}" not found. Available agents: ${activeAgents.map((u) => u.agentType).join(", ")}. Using default behavior.`,
    );
  return r;
}
//@ chunk-3wek6r2k.js:16097-16179 placement
function enableAppendSubagentPrompt(appendSubagentSystemPrompt, o = process.env) {
  if (appendSubagentSystemPrompt) o.CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT = "1";
}
//@ chunk-3wek6r2k.js:16179-16735 placement
async function readAppendSubagentPrompt(e) {
  if (!e.appendSubagentSystemPromptFile)
    return {
      ok: true,
      prompt: e.appendSubagentSystemPrompt,
    };
  if (e.appendSubagentSystemPrompt)
    return {
      ok: false,
      error:
        "Error: Cannot use both --append-subagent-system-prompt and --append-subagent-system-prompt-file. Please use only one.",
    };
  let o = resolve(e.appendSubagentSystemPromptFile);
  try {
    return {
      ok: true,
      prompt: await readFile(o, "utf8"),
    };
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      return {
        ok: false,
        error: `Error: Append subagent system prompt file not found: ${o}`,
      };
    return {
      ok: false,
      error: `Error reading append subagent system prompt file: ${errorMessage(error)}`,
    };
  }
}
export { readAppendSubagentPrompt, enableAppendSubagentPrompt, loadAgentsForSession, findSelectedAgent };

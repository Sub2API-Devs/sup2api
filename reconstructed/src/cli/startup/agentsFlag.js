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
import { resolve, resolve as resolve_2, resolve as resolve_3, resolve as resolve_4 } from "path";
import { readFile, readFile as readFile_2 } from "fs/promises";
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
import { Mtr } from "../../tools/WebFetchTool/harnessNotes.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";

/**
 * 启动时加载 agent 定义（--agents JSON、agent 设置、安全模式下忽略自定义 agent），并在工具加载后应用协调者过滤。
 */
//@ chunk-3wek6r2k.js:14860-15714 placement
async function loadAgentsForSession({
  cwd: cwd,
  toolPermissionContext: toolPermissionContext,
  applyCoordinatorFilter: applyCoordinatorFilter,
  agentsJson: agentsJson,
  agentSetting: agentSetting,
  commandsPromise: commandsPromise,
  agentDefsPromise: agentDefsPromise,
  deferCommands: deferCommands,
  onToolsLoaded: onToolsLoaded,
  storageV5: storageV5,
}) {
  let E = getTools(toolPermissionContext);
  if (applyCoordinatorFilter && isCoordinatorMode_2()) {
    let { applyCoordinatorToolFilter: applyCoordinatorToolFilter } = await import("./chunk-7g8rqsne.js");
    E = applyCoordinatorToolFilter(E);
  }
  (onToolsLoaded?.(), commandsPromise?.catch(() => {}), agentDefsPromise?.catch(() => {}));
  let w = commandsPromise ?? getCommands(cwd, storageV5);
  if (deferCommands) w.catch(() => {});
  let [P, A] = await Promise.all([
      deferCommands ? Promise.resolve([]) : w,
      agentDefsPromise ?? getAgentDefinitionsWithOverrides(cwd, storageV5),
    ]),
    se = [];
  if (agentsJson && !isCustomizationDisabled("agents", { explicitlyRequested: !0 }))
    try {
      let pe = safeParseJSON(agentsJson);
      if (pe) se = parseAgentsFromJson(pe, "flagSettings");
    } catch (error) {
      logError(error);
    }
  else if (agentsJson)
    logForDebugging("--agents: ignored in safe mode (user-supplied custom agents are disabled)", {
      level: "warn",
    });
  let q = rebuildAgentDefinitions(A, [...A.allAgents, ...se]),
    ce = findSelectedAgent(q.activeAgents, agentSetting);
  return (
    setMainThreadAgentType(ce?.agentType),
    {
      tools: E,
      commands: P,
      agentDefinitions: q,
      mainThreadAgentDefinition: ce,
      cliAgents: se,
      deferredCommandsPromise: deferCommands ? w : void 0,
    }
  );
}
//@ chunk-3wek6r2k.js:15773-16025 placement
function findSelectedAgent(e, o) {
  if (!o) return;
  let n = Mtr(e),
    r = n.find((u) => u.agentType === o) ?? n.find((u) => u.agentType.endsWith(`:${o}`));
  if (!r)
    logForDebugging(
      `Warning: agent "${o}" not found. Available agents: ${e.map((u) => u.agentType).join(", ")}. Using default behavior.`,
    );
  return r;
}
//@ chunk-3wek6r2k.js:16097-16179 placement
function enableAppendSubagentPrompt(e, o = process.env) {
  if (e) o.CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT = "1";
}
//@ chunk-3wek6r2k.js:16179-16735 placement
async function readAppendSubagentPrompt(e) {
  if (!e.appendSubagentSystemPromptFile) return { ok: !0, prompt: e.appendSubagentSystemPrompt };
  if (e.appendSubagentSystemPrompt)
    return {
      ok: !1,
      error:
        "Error: Cannot use both --append-subagent-system-prompt and --append-subagent-system-prompt-file. Please use only one.",
    };
  let o = resolve_2(e.appendSubagentSystemPromptFile);
  try {
    return { ok: !0, prompt: await readFile(o, "utf8") };
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      return { ok: !1, error: `Error: Append subagent system prompt file not found: ${o}` };
    return { ok: !1, error: `Error reading append subagent system prompt file: ${errorMessage(error)}` };
  }
}

export { readAppendSubagentPrompt, enableAppendSubagentPrompt, loadAgentsForSession, findSelectedAgent };

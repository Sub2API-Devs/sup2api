/**
 * tools/TeamCreateTool/TeamCreateTool.ts
 *
 * 316 无 TeamCreate 工具：此处是会话隐式团队的初始化函数（团队文件、lead 成员、任务列表迁移）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TeamCreateTool/TeamCreateTool.ts
 * pieces: chunk-6cc2zqkz.js (1)
 * attribution: fingerprint 1
 */
import { rename } from "fs/promises";
import { getAssistantTeamName } from "../../utils/swarm/sessionTeam.js";
import { sessionTeamName, isSessionListId } from "../../utils/swarm/sessionTaskList.js";
import { getSessionId, getOriginalCwd } from "../../bootstrap/state.js";
import { agentAddress } from "../../utils/swarm/teammateIds.js";
import { TEAM_LEAD } from "../../utils/swarm/constants.js";
import {
  getTeamFilePath,
  readTeamFileAsync,
  updateTeamFile,
  logTeamFileWriteFailure,
  writeTeamFileAsync,
  registerTeamForSessionCleanup,
} from "../../utils/swarm/teamHelpers.js";
import { countConcurrentSessions_2 } from "../../utils/concurrentSessions.js";
import { setLeaderTeamName, setSessionListId } from "../../utils/swarm/teammateMessageRepair.js";
import { env } from "../../utils/env.js";
import { getTaskOutputDir, ensureTaskListDir } from "../../utils/tasks.js";
import { AGENT_COLOR_NAMES } from "../AgentTool/agentColorManager.js";

//@ chunk-6cc2zqkz.js:3286-4232 fingerprint = TeamCreateTool (0.482)
/**
 * 建立会话唯一的隐式团队：写团队文件（lead 成员 team-lead，in-process 后端）、迁移会话任务列表目录、注册清理，返回 teamContext 与队友颜色分配。316 没有 TeamCreate 工具，此函数由会话启动流程调用。
 */
async function initializeSessionTeam(options, storageV5) {
  let existingTeamName = options?.existingTeamName || getAssistantTeamName();
  let teamName = existingTeamName ?? sessionTeamName(getSessionId());
  let leadAgentId = agentAddress(TEAM_LEAD, teamName);
  let teamFilePath = getTeamFilePath(teamName);
  let existingTeamFile = existingTeamName ? await readTeamFileAsync(teamName, storageV5) : null;
  let leadProcess = await countConcurrentSessions_2();
  if (existingTeamFile)
    await updateTeamFile(
      teamName,
      (teamFile) => {
        teamFile.leadProcess = leadProcess;
      },
      {
        bestEffortWrite: true,
      },
      storageV5,
    ).catch((error) => logTeamFileWriteFailure(teamName, error));
  else {
    let teamFile = {
      name: teamName,
      createdAt: Date.now(),
      leadAgentId,
      leadSessionId: getSessionId(),
      leadProcess,
      members: [
        {
          agentId: leadAgentId,
          name: TEAM_LEAD,
          agentType: TEAM_LEAD,
          joinedAt: Date.now(),
          tmuxPaneId: "leader",
          cwd: getOriginalCwd(),
          subscriptions: [],
          backendType: "in-process",
        },
      ],
    };
    await writeTeamFileAsync(teamName, teamFile, storageV5).catch((error) =>
      logTeamFileWriteFailure(teamName, error),
    );
  }
  setLeaderTeamName(teamName);
  let CLAUDE_INTERNAL_SESSION_TASK_LIST_ID = env.CLAUDE_INTERNAL_SESSION_TASK_LIST_ID;
  env.unset("CLAUDE_INTERNAL_SESSION_TASK_LIST_ID");
  if (CLAUDE_INTERNAL_SESSION_TASK_LIST_ID && isSessionListId(CLAUDE_INTERNAL_SESSION_TASK_LIST_ID))
    setSessionListId(CLAUDE_INTERNAL_SESSION_TASK_LIST_ID);
  let sessionId = getSessionId();
  if (teamName !== sessionId && !options?.keepSessionKeyedTaskList)
    await rename(getTaskOutputDir(sessionId), getTaskOutputDir(teamName)).catch(() => {});
  await ensureTaskListDir(teamName, storageV5);
  registerTeamForSessionCleanup(teamName);
  let leadColor = AGENT_COLOR_NAMES[0];
  return {
    teamContext: {
      teamName,
      teamFilePath,
      leadAgentId,
      teammates: {
        [leadAgentId]: {
          name: TEAM_LEAD,
          agentType: TEAM_LEAD,
          color: leadColor,
          tmuxSessionName: "in-process",
          tmuxPaneId: "leader",
          cwd: getOriginalCwd(),
          spawnedAt: Date.now(),
        },
      },
    },
    teammateColors: {
      assignments: new Map([[leadAgentId, leadColor]]),
      index: 1,
    },
  };
}
export { initializeSessionTeam };

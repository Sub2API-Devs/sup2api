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
import { MG } from "../../utils/swarm/teammateIds.js";
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

/**
 * 建立会话唯一的隐式团队：写团队文件（lead 成员 team-lead，in-process 后端）、迁移会话任务列表目录、注册清理，返回 teamContext 与队友颜色分配。316 没有 TeamCreate 工具，此函数由会话启动流程调用。
 */
//@ chunk-6cc2zqkz.js:3286-4232 fingerprint = TeamCreateTool (0.482)
async function initializeSessionTeam(options, storageV5) {
  let o = options?.existingTeamName || getAssistantTeamName(),
    teamName = o ?? sessionTeamName(getSessionId()),
    leadAgentId = MG(TEAM_LEAD, teamName),
    m = getTeamFilePath(teamName),
    c = o ? await readTeamFileAsync(teamName, storageV5) : null,
    l = await countConcurrentSessions_2();
  if (c)
    await updateTeamFile(
      teamName,
      (u) => {
        u.leadProcess = l;
      },
      { bestEffortWrite: !0 },
      storageV5,
    ).catch((u) => logTeamFileWriteFailure(teamName, u));
  else {
    let u = {
      name: teamName,
      createdAt: Date.now(),
      leadAgentId: leadAgentId,
      leadSessionId: getSessionId(),
      leadProcess: l,
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
    await writeTeamFileAsync(teamName, u, storageV5).catch((g) => logTeamFileWriteFailure(teamName, g));
  }
  setLeaderTeamName(teamName);
  let CLAUDE_INTERNAL_SESSION_TASK_LIST_ID = env.CLAUDE_INTERNAL_SESSION_TASK_LIST_ID;
  if (
    (env.unset("CLAUDE_INTERNAL_SESSION_TASK_LIST_ID"),
    CLAUDE_INTERNAL_SESSION_TASK_LIST_ID && isSessionListId(CLAUDE_INTERNAL_SESSION_TASK_LIST_ID))
  )
    setSessionListId(CLAUDE_INTERNAL_SESSION_TASK_LIST_ID);
  let r = getSessionId();
  if (teamName !== r && !options?.keepSessionKeyedTaskList)
    await rename(getTaskOutputDir(r), getTaskOutputDir(teamName)).catch(() => {});
  (await ensureTaskListDir(teamName, storageV5), registerTeamForSessionCleanup(teamName));
  let p = AGENT_COLOR_NAMES[0];
  return {
    teamContext: {
      teamName: teamName,
      teamFilePath: m,
      leadAgentId: leadAgentId,
      teammates: {
        [leadAgentId]: {
          name: TEAM_LEAD,
          agentType: TEAM_LEAD,
          color: p,
          tmuxSessionName: "in-process",
          tmuxPaneId: "leader",
          cwd: getOriginalCwd(),
          spawnedAt: Date.now(),
        },
      },
    },
    teammateColors: { assignments: new Map([[leadAgentId, p]]), index: 1 },
  };
}

export { initializeSessionTeam };

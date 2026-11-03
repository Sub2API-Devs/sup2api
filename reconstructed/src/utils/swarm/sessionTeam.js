/**
 * utils/swarm/sessionTeam.ts
 *
 * 2.1.316 新增：会话团队（session team）：内部团队名、移动团队到当前会话、领导进程存活判断
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6cc2zqkz.js (7)
 * attribution: placement 7
 */
import { mkdir, rmdir } from "fs/promises";
import { dirname, join } from "path";
import {
  getInheritedTeamName,
  setInheritedTeamName,
  getSessionId,
  getSessionCreatedTeams,
} from "../../bootstrap/state.js";
import { swarmHostState } from "./hostState.js";
import {
  sessionTeamName,
  SESSION_TEAM_NAME_PREFIX,
  SESSION_LIST_NOTE_FILE,
  SESSION_LIST_NOTE_MAX_BYTES,
  isSessionListId,
} from "./sessionTaskList.js";
import { readTeamFileAsync, getTeamDir, cleanupTeamDirectories, updateTeamFile } from "./teamHelpers.js";
import { TEAM_LEAD } from "./constants.js";
import { setSessionListId, setLeaderTeamName } from "./teammateMessageRepair.js";
import { getTaskOutputDir, unassignTeammateTasks, listTasks } from "../tasks.js";
import { initializeSessionTeam } from "../../tools/TeamCreateTool/TeamCreateTool.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { readPluginFileSafe } from "../plugins/safeFileRead.js";
import { writeFileAtomically } from "../plugins/safeCopy.js";
import { ownPidSpace } from "../pidSpace.js";
import {
  isProcessProvablyGone,
  hasExitedUnreaped,
  provenSameProcessAsync,
  getProcessCreationTimeMsAsync,
} from "../processIdentity.js";
import { countConcurrentSessions_2 } from "../concurrentSessions.js";

//@ chunk-6cc2zqkz.js:3102-3113 placement
var LEAD_PROCESS_CLAIM_SLACK_MS = 2000;
//@ chunk-6cc2zqkz.js:3113-3286 placement
function getAssistantTeamName() {
  if (getInheritedTeamName() === undefined) {
    let CLAUDE_INTERNAL_ASSISTANT_TEAM_NAME = process.env.CLAUDE_INTERNAL_ASSISTANT_TEAM_NAME || null;
    delete process.env.CLAUDE_INTERNAL_ASSISTANT_TEAM_NAME;
    setInheritedTeamName(CLAUDE_INTERNAL_ASSISTANT_TEAM_NAME);
  }
  return getInheritedTeamName() ?? null;
}
//@ chunk-6cc2zqkz.js:4232-4277 placement
/**
 * 未继承团队名时把会话团队移到当前。
 */
async function moveSessionTeamUnlessInherited(a) {
  return getInheritedTeamName() ? undefined : moveSessionTeamToCurrent(a);
}
//@ chunk-6cc2zqkz.js:4277-4319 placement
/**
 * 清掉继承的团队名再移动会话团队。
 */
async function resetAndMoveSessionTeam(a) {
  setInheritedTeamName(null);
  return moveSessionTeamToCurrent(a);
}
//@ chunk-6cc2zqkz.js:4319-5143 placement
async function moveSessionTeamToCurrent(storageV5) {
  let { leaderTeamName, sessionListId } = swarmHostState().taskList;
  let sessionId = getSessionId();
  let teamName = sessionTeamName(sessionId);
  if (!leaderTeamName) return;
  try {
    let teamFile = await readTeamFileAsync(leaderTeamName, storageV5);
    if (
      !leaderTeamName.startsWith(`${SESSION_TEAM_NAME_PREFIX}-`) ||
      !teamFile ||
      teamFile.members.some((member) => member.name !== TEAM_LEAD)
    )
      return;
    if (leaderTeamName === teamName) {
      setSessionListId(await resolveSessionListId(sessionId, storageV5));
      return;
    }
    let teamFile_2 = await readTeamFileAsync(teamName, storageV5);
    if (
      !(teamFile_2
        ? await reclaimDeadLeadProcess(teamName, teamFile_2, storageV5)
        : await mkdir(getTeamDir(teamName)).then(
            () => true,
            () => false,
          ))
    ) {
      setSessionListId((await resolveSessionListId(sessionId, storageV5)) ?? teamName);
      await rmdir(getTaskOutputDir(leaderTeamName)).catch(() => {});
      return;
    }
    if (teamFile_2) await cleanupTeamDirectories(teamName).catch(() => {});
    let sessionTeam = await initializeSessionTeam(
      {
        keepSessionKeyedTaskList: true,
      },
      storageV5,
    );
    setSessionListId(await resolveSessionListId(sessionId, storageV5));
    await Promise.allSettled(
      (teamFile_2?.members ?? [])
        .filter((r) => r.name !== TEAM_LEAD && r.backendType === "in-process")
        .map((r) => unassignTeammateTasks(teamName, r.agentId, r.name, "terminated", storageV5)),
    );
    getSessionCreatedTeams().delete(leaderTeamName);
    await cleanupTeamDirectories(leaderTeamName).catch(() => {});
    await rmdir(getTaskOutputDir(leaderTeamName)).catch(() => {});
    return sessionTeam;
  } catch (error) {
    setLeaderTeamName(leaderTeamName);
    setSessionListId(sessionListId);
    logForDebugging(
      `[sessionTeam] Could not move the session team to the current session: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-6cc2zqkz.js:5143-5352 placement
async function resolveSessionListId(sessionId, n) {
  let o = sessionTeamName(sessionId);
  if ((await listTasks(o, n)).length > 0) return;
  let taskOutputDir = getTaskOutputDir(o);
  let s =
    (await readPluginFileSafe(dirname(dirname(taskOutputDir)), taskOutputDir)) === "ok"
      ? await writeFileAtomically(join(taskOutputDir, SESSION_LIST_NOTE_FILE), SESSION_LIST_NOTE_MAX_BYTES)
      : null;
  if (s !== null && isSessionListId(s)) return s;
  return (await listTasks(sessionId, n)).length > 0 ? sessionId : undefined;
}
//@ chunk-6cc2zqkz.js:5496-5891 placement
/**
 * 回收已退出的团队负责人进程记录（同一 pid 空间且进程确已结束）。
 */
async function reclaimDeadLeadProcess(a, teamFile, o) {
  let leadProcess = teamFile.leadProcess;
  if (!leadProcess || leadProcess.pidSpace !== ownPidSpace()) return false;
  if (!(
    isProcessProvablyGone(leadProcess.pid) ||
    (await hasExitedUnreaped(leadProcess.pid)) ||
    (leadProcess.procStart !== undefined
      ? (await provenSameProcessAsync(leadProcess.pid, leadProcess.procStart)) === false
      : ((await getProcessCreationTimeMsAsync(leadProcess.pid)) ?? 0) >
        leadProcess.claimedAt + LEAD_PROCESS_CLAIM_SLACK_MS)
  ))
    return false;
  let leadProcess_2 = await countConcurrentSessions_2();
  return (
    (await updateTeamFile(
      a,
      (l) => {
        if (l.leadProcess?.pid !== leadProcess.pid || l.leadProcess.claimedAt !== leadProcess.claimedAt)
          return false;
        l.leadProcess = leadProcess_2;
        return true;
      },
      undefined,
      o,
    ).catch(() => {
      return;
    })) === true
  );
}
export { getAssistantTeamName };

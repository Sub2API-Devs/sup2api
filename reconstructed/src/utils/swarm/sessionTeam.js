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
import { ci } from "./hostState.js";
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
var L = 2000;
//@ chunk-6cc2zqkz.js:3113-3286 placement
function getAssistantTeamName() {
  if (getInheritedTeamName() === void 0) {
    let a = process.env.CLAUDE_INTERNAL_ASSISTANT_TEAM_NAME || null;
    (delete process.env.CLAUDE_INTERNAL_ASSISTANT_TEAM_NAME, setInheritedTeamName(a));
  }
  return getInheritedTeamName() ?? null;
}
//@ chunk-6cc2zqkz.js:4232-4277 placement
async function q(a) {
  return getInheritedTeamName() ? void 0 : moveSessionTeamToCurrent(a);
}
//@ chunk-6cc2zqkz.js:4277-4319 placement
async function J(a) {
  return (setInheritedTeamName(null), moveSessionTeamToCurrent(a));
}
//@ chunk-6cc2zqkz.js:4319-5143 placement
async function moveSessionTeamToCurrent(a) {
  let { leaderTeamName: leaderTeamName, sessionListId: sessionListId } = ci().taskList,
    e = getSessionId(),
    s = sessionTeamName(e);
  if (!leaderTeamName) return;
  try {
    let m = await readTeamFileAsync(leaderTeamName, a);
    if (
      !leaderTeamName.startsWith(`${SESSION_TEAM_NAME_PREFIX}-`) ||
      !m ||
      m.members.some((member) => member.name !== TEAM_LEAD)
    )
      return;
    if (leaderTeamName === s) {
      setSessionListId(await resolveSessionListId(e, a));
      return;
    }
    let c = await readTeamFileAsync(s, a);
    if (
      !(c
        ? await reclaimDeadLeadProcess(s, c, a)
        : await mkdir(getTeamDir(s)).then(
            () => !0,
            () => !1,
          ))
    ) {
      (setSessionListId((await resolveSessionListId(e, a)) ?? s),
        await rmdir(getTaskOutputDir(leaderTeamName)).catch(() => {}));
      return;
    }
    if (c) await cleanupTeamDirectories(s).catch(() => {});
    let T = await initializeSessionTeam({ keepSessionKeyedTaskList: !0 }, a);
    return (
      setSessionListId(await resolveSessionListId(e, a)),
      await Promise.allSettled(
        (c?.members ?? [])
          .filter((r) => r.name !== TEAM_LEAD && r.backendType === "in-process")
          .map((r) => unassignTeammateTasks(s, r.agentId, r.name, "terminated", a)),
      ),
      getSessionCreatedTeams().delete(leaderTeamName),
      await cleanupTeamDirectories(leaderTeamName).catch(() => {}),
      await rmdir(getTaskOutputDir(leaderTeamName)).catch(() => {}),
      T
    );
  } catch (error) {
    (setLeaderTeamName(leaderTeamName),
      setSessionListId(sessionListId),
      logForDebugging(
        `[sessionTeam] Could not move the session team to the current session: ${errorMessage(error)}`,
        { level: "error" },
      ));
    return;
  }
}
//@ chunk-6cc2zqkz.js:5143-5352 placement
async function resolveSessionListId(a, n) {
  let o = sessionTeamName(a);
  if ((await listTasks(o, n)).length > 0) return;
  let e = getTaskOutputDir(o),
    s =
      (await readPluginFileSafe(dirname(dirname(e)), e)) === "ok"
        ? await writeFileAtomically(join(e, SESSION_LIST_NOTE_FILE), SESSION_LIST_NOTE_MAX_BYTES)
        : null;
  if (s !== null && isSessionListId(s)) return s;
  return (await listTasks(a, n)).length > 0 ? a : void 0;
}
/**
 * 回收已退出的团队负责人进程记录（同一 pid 空间且进程确已结束）。
 */
//@ chunk-6cc2zqkz.js:5496-5891 placement
async function reclaimDeadLeadProcess(a, n, o) {
  let leadProcess = n.leadProcess;
  if (!leadProcess || leadProcess.pidSpace !== ownPidSpace()) return !1;
  if (!(
    isProcessProvablyGone(leadProcess.pid) ||
    (await hasExitedUnreaped(leadProcess.pid)) ||
    (leadProcess.procStart !== void 0
      ? (await provenSameProcessAsync(leadProcess.pid, leadProcess.procStart)) === !1
      : ((await getProcessCreationTimeMsAsync(leadProcess.pid)) ?? 0) > leadProcess.claimedAt + L)
  ))
    return !1;
  let m = await countConcurrentSessions_2();
  return (
    (await updateTeamFile(
      a,
      (l) => {
        if (l.leadProcess?.pid !== leadProcess.pid || l.leadProcess.claimedAt !== leadProcess.claimedAt)
          return !1;
        return ((l.leadProcess = m), !0);
      },
      void 0,
      o,
    ).catch(() => {
      return;
    })) === !0
  );
}

export { getAssistantTeamName };

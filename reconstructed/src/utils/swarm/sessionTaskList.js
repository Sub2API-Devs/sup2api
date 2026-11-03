/**
 * utils/swarm/sessionTaskList.ts
 *
 * 2.1.316 新增。/clear 后记录会话任务列表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-v5nznc39.js (4)
 * attribution: placement 4
 */
import { dirname, join } from "path";
import { mkdir } from "fs/promises";
import { Vt } from "../agentId.js";
import { decodeTaggedUuid } from "../../services/mcp/serverIdentity.js";
import { isValidSessionIdForAdopt } from "../background/adopt.js";
import { ci } from "./hostState.js";
import { isDiskless, getSessionId } from "../../bootstrap/state.js";
import { getTaskOutputDir } from "../tasks.js";
import { getErrnoCode, errorMessage } from "../errors.js";
import { readPluginFileSafe } from "../plugins/safeFileRead.js";
import { logForDebugging } from "../debug.js";
import { writeFileAtomic } from "../atomicPublishWrite.js";

//@ chunk-v5nznc39.js:630-675 placement
var SESSION_TEAM_NAME_PREFIX = "session",
  SESSION_LIST_NOTE_FILE = ".session-list",
  SESSION_LIST_NOTE_MAX_BYTES = 64;
//@ chunk-v5nznc39.js:675-745 placement
function sessionTeamName(o) {
  let e = Vt(o) ? o.slice(0, 8) : (decodeTaggedUuid(o) ?? o);
  return `${SESSION_TEAM_NAME_PREFIX}-${e}`;
}
//@ chunk-v5nznc39.js:745-872 placement
function isSessionListId(o) {
  let e = `${SESSION_TEAM_NAME_PREFIX}-`,
    r = o.startsWith(e) ? o.slice(e.length) : void 0;
  return isValidSessionIdForAdopt(o) || isValidSessionIdForAdopt(r) || /^[0-9a-f]{8}$/i.test(r ?? "");
}
/**
 * /clear 后记录会话任务列表。
 */
//@ chunk-v5nznc39.js:872-1350 placement
async function noteSessionTaskListAfterClear() {
  let { leaderTeamName: leaderTeamName, sessionListId: sessionListId } = ci().taskList,
    r = sessionListId ?? leaderTeamName;
  if (!r || isDiskless()) return;
  try {
    let i = getTaskOutputDir(sessionTeamName(getSessionId())),
      s = dirname(i);
    for (let n of [s, i])
      if (
        (await mkdir(n).catch((a) => {
          if (getErrnoCode(a) !== "EEXIST") throw a;
        }),
        (await readPluginFileSafe(dirname(s), n)) !== "ok")
      ) {
        logForDebugging(
          "[sessionTeam] Not noting the task list of the cleared session: its folder is not a plain directory",
          { level: "warn" },
        );
        return;
      }
    await writeFileAtomic(join(i, SESSION_LIST_NOTE_FILE), r);
  } catch (error) {
    logForDebugging(
      `[sessionTeam] Could not note the task list of the cleared session: ${errorMessage(error)}`,
      { level: "warn" },
    );
  }
}

export {
  sessionTeamName,
  SESSION_TEAM_NAME_PREFIX,
  SESSION_LIST_NOTE_FILE,
  SESSION_LIST_NOTE_MAX_BYTES,
  isSessionListId,
};

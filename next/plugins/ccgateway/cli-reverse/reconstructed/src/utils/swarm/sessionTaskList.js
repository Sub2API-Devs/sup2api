/**
 * utils/swarm/sessionTaskList.ts
 *
 * 2.1.316 新增。/clear 后记录会话任务列表。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3xs5443t.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { dirname, join } from "path";
import { mkdir } from "fs/promises";
import { normalizeUuidOrNull } from "../agentId.js";
import { decodeTaggedUuid } from "../../services/mcp/serverIdentity.js";
import { isValidSessionIdForAdopt } from "../background/adopt.js";
import { swarmHostState } from "./hostState.js";
import { isDiskless, getSessionId } from "../../bootstrap/state.js";
import { getTaskOutputDir } from "../tasks.js";
import { getErrnoCode, errorMessage } from "../errors.js";
import { readPluginFileSafe } from "../plugins/safeFileRead.js";
import { logForDebugging } from "../debug.js";
import { writeFileAtomic } from "../atomicPublishWrite.js";

//@ chunk-3xs5443t.js:21294-21339 placement
var SESSION_TEAM_NAME_PREFIX = "session";
var SESSION_LIST_NOTE_FILE = ".session-list";
var SESSION_LIST_NOTE_MAX_BYTES = 64;
//@ chunk-3xs5443t.js:21339-21409 placement
function sessionTeamName(sessionId) {
  let shortId = normalizeUuidOrNull(sessionId)
    ? sessionId.slice(0, 8)
    : (decodeTaggedUuid(sessionId) ?? sessionId);
  return `${SESSION_TEAM_NAME_PREFIX}-${shortId}`;
}
//@ chunk-3xs5443t.js:21409-21536 placement
function isSessionListId(listId) {
  let prefix = `${SESSION_TEAM_NAME_PREFIX}-`;
  let suffix = listId.startsWith(prefix) ? listId.slice(prefix.length) : undefined;
  return (
    isValidSessionIdForAdopt(listId) ||
    isValidSessionIdForAdopt(suffix) ||
    /^[0-9a-f]{8}$/i.test(suffix ?? "")
  );
}
//@ chunk-3xs5443t.js:21536-22018 placement
/**
 * /clear 后记录会话任务列表。
 */
async function noteSessionTaskListAfterClear() {
  let { leaderTeamName, sessionListId } = swarmHostState().taskList;
  let listId = sessionListId ?? leaderTeamName;
  if (!listId || isDiskless()) return;
  try {
    let taskOutputDir = getTaskOutputDir(sessionTeamName(getSessionId()));
    let parentDir = dirname(taskOutputDir);
    for (let dir of [parentDir, taskOutputDir]) {
      await mkdir(dir).catch((error) => {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      });
      if ((await readPluginFileSafe(dirname(parentDir), dir)) !== "ok") {
        logForDebugging(
          "[sessionTeam] Not noting the task list of the cleared session: its folder is not a plain directory",
          {
            level: "warn",
          },
        );
        return;
      }
    }
    await writeFileAtomic(join(taskOutputDir, SESSION_LIST_NOTE_FILE), listId);
  } catch (error) {
    logForDebugging(
      `[sessionTeam] Could not note the task list of the cleared session: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  }
}
export {
  SESSION_TEAM_NAME_PREFIX,
  sessionTeamName,
  SESSION_LIST_NOTE_FILE,
  SESSION_LIST_NOTE_MAX_BYTES,
  isSessionListId,
  noteSessionTaskListAfterClear,
};

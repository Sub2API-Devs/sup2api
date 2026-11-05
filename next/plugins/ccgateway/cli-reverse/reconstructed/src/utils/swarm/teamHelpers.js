/**
 * utils/swarm/teamHelpers.ts
 *
 * 团队辅助：发送到终端窗格的命令中禁止控制字符
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/teamHelpers.ts
 * pieces: chunk-qrtkkn9z.js (39)
 * attribution: placement 4, layout 14, facade-exports 19, file-local 1, fingerprint 1
 */
import { join } from "path";
import { readFile, open, writeFile, mkdir, rename, rm, stat } from "fs/promises";
import { randomUUID } from "crypto";
import { getTeamsDir } from "../envUtils.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import {
  isSyscallError,
  errorMessage,
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizeErrnoForTelemetry,
} from "../errors.js";
import { logForDebugging } from "../debug.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { logError } from "../log.js";
import { lock } from "../lockfile.js";
import { createJitteredBackoff } from "../backoff.js";
import {
  logFeatureOk,
  logFeatureSad,
  logFeatureBad,
  withFeatureTelemetry,
} from "../../services/analytics/featureTelemetry.js";
import { isTeammate, getTeamName, getAgentName } from "../teammate.js";
import { getSessionCreatedTeams, getSessionSpawnedTeammatePanes } from "../../bootstrap/state.js";
import { TEAM_LEAD } from "./constants.js";

//@ chunk-qrtkkn9z.js:787-862 placement
class SwarmPaneError extends Error {
  constructor(message) {
    super(message);
    this.name = "SwarmPaneError";
  }
}
//@ chunk-qrtkkn9z.js:862-878 placement
var CONTROL_CHAR_RE = /\p{Cc}/u;
//@ chunk-qrtkkn9z.js:878-911 placement
/**
 * 文本是否含控制字符。
 */
function hasControlChars(text) {
  return CONTROL_CHAR_RE.test(text);
}
//@ chunk-qrtkkn9z.js:911-1113 placement
function assertNoControlChars(text) {
  let match = CONTROL_CHAR_RE.exec(text);
  if (match) {
    let codePoint = match[0].codePointAt(0);
    throw new SwarmPaneError(
      `Refusing to send command containing control character U+${codePoint.toString(16).padStart(4, "0").toUpperCase()} to terminal pane`,
    );
  }
}
//@ chunk-qrtkkn9z.js:1113-1161 layout (2.1.88 match: getBackendByType, 1)
/**
 * 类型是否是 pane 后端（tmux 或 iterm2）。
 */
function isPaneBackendType(type) {
  return type === "tmux" || type === "iterm2";
}
//@ chunk-qrtkkn9z.js:1161-1229 facade-exports
function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
}
//@ chunk-qrtkkn9z.js:1229-1274 facade-exports
function sanitizeAgentName(name) {
  return name.replaceAll("@", "-");
}
//@ chunk-qrtkkn9z.js:1274-1313 facade-exports
/**
 * 团队目录：<teams 目录>/<规范化团队名>。
 */
function getTeamDir(teamName) {
  return join(getTeamsDir(), sanitizeName(teamName));
}
//@ chunk-qrtkkn9z.js:1313-1360 facade-exports (2.1.88 match: getTeamFilePath, 1)
/**
 * 团队文件路径：<团队目录>/config.json。
 */
function getTeamFilePath(teamName) {
  return join(getTeamDir(teamName), "config.json");
}
//@ chunk-qrtkkn9z.js:1360-1397 layout
/**
 * 团队文件在存储 v5 中的键。
 */
function teamStoreKey(teamName) {
  return STORAGE_SPACES.team(sanitizeName(teamName));
}
//@ chunk-qrtkkn9z.js:1397-1561 layout
function formatStoreError(error) {
  let failureClassSuffix = "failureClass" in error ? `/${error.failureClass}` : "";
  let telemetrySuffix =
    "telemetryCode" in error && error.telemetryCode !== undefined ? ` [${error.telemetryCode}]` : "";
  return `${error.code}${failureClassSuffix}${telemetrySuffix}`;
}
//@ chunk-qrtkkn9z.js:1561-1638 layout
function isLockSuspectError(error) {
  return error.code === "Unavailable" && error.telemetryCode === "LockSuspect";
}
//@ chunk-qrtkkn9z.js:1638-1717 layout
function isLockContendedError(error) {
  return error.code === "Unavailable" && error.telemetryCode === "LockContended";
}
//@ chunk-qrtkkn9z.js:1717-1936 layout
function isBenignStoreError(error) {
  return (
    error.code === "Unavailable" ||
    error.code === "NotFound" ||
    (error.code === "Failed" &&
      (error.failureClass === "permission" ||
        error.failureClass === "resource" ||
        error.failureClass === "environment" ||
        (error.failureClass === "unknown" && isSyscallError(error.cause))))
  );
}
//@ chunk-qrtkkn9z.js:1936-2224 layout
/**
 * 规范化团队文件：剔除格式不对的成员与 leadProcess。
 */
function sanitizeTeamFile(teamFile) {
  if (typeof teamFile !== "object" || teamFile === null || Array.isArray(teamFile)) return null;
  let record = teamFile;
  let members = Array.isArray(record.members) ? record.members.filter(isValidMember) : [];
  let leadProcess = isValidLeadProcess(record.leadProcess) ? record.leadProcess : undefined;
  return Array.isArray(record.members) &&
    members.length === record.members.length &&
    leadProcess === record.leadProcess
    ? record
    : {
        ...record,
        members,
        leadProcess,
      };
}
//@ chunk-qrtkkn9z.js:2224-2461 layout
function isValidLeadProcess(leadProcess) {
  return (
    typeof leadProcess === "object" &&
    leadProcess !== null &&
    "pid" in leadProcess &&
    Number.isSafeInteger(leadProcess.pid) &&
    "pidSpace" in leadProcess &&
    typeof leadProcess.pidSpace === "string" &&
    "claimedAt" in leadProcess &&
    Number.isFinite(leadProcess.claimedAt) &&
    (!("procStart" in leadProcess) || typeof leadProcess.procStart === "string")
  );
}
//@ chunk-qrtkkn9z.js:2461-2594 layout
function isValidMember(member) {
  return (
    typeof member === "object" &&
    member !== null &&
    "agentId" in member &&
    typeof member.agentId === "string" &&
    "name" in member &&
    typeof member.name === "string"
  );
}
//@ chunk-qrtkkn9z.js:2594-3096 facade-exports (2.1.88 match: readTeamFile, 0.837)
/**
 * 读团队文件：有存储 v5 时从存储读，否则读 config.json；不存在返回 null。
 */
async function readTeamFileAsync(teamName, storage) {
  if (storage) {
    let readResult = await storage.read([teamStoreKey(teamName)]);
    if (!readResult.ok) {
      logForDebugging(`[TeammateTool] Failed to read team file for ${teamName}: ${readResult.error.code}`);
      return null;
    }
    let item = readResult.value.items[0];
    if (!item.found) return null;
    try {
      return sanitizeTeamFile(jsonParse(Buffer.from(item.value).toString("utf8")));
    } catch (error) {
      logForDebugging(`[TeammateTool] Failed to read team file for ${teamName}: ${errorMessage(error)}`);
      return null;
    }
  }
  try {
    let content = await readFile(getTeamFilePath(teamName), "utf-8");
    return sanitizeTeamFile(jsonParse(content));
  } catch (e) {
    if (getErrnoCode(e) === "ENOENT") return null;
    logForDebugging(`[TeammateTool] Failed to read team file for ${teamName}: ${errorMessage(e)}`);
    return null;
  }
}
//@ chunk-qrtkkn9z.js:3096-3316 facade-exports
function logTeamFileWriteFailure(teamName, error) {
  if (isSyscallError(error))
    logForDebugging(
      `[TeammateTool] Failed to write team file for ${teamName} (${getErrnoCode(error)}): ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  else if (isBenignStoreErrorCause(error))
    logForDebugging(`[TeammateTool] Failed to write team file for ${teamName}: ${errorMessage(error)}`, {
      level: "error",
    });
  else logError(error);
}
//@ chunk-qrtkkn9z.js:3316-3482 layout
function isBenignStoreErrorCause(error) {
  if (!(error instanceof Error) || error.cause === undefined || error.cause === null) return false;
  let cause = error.cause;
  if (typeof cause !== "object" || typeof cause.code !== "string") return false;
  return isBenignStoreError(cause);
}
//@ chunk-qrtkkn9z.js:3482-3572 layout (2.1.88 match: LOCK_OPTIONS, 0.776)
/**
 * 团队文件锁选项（10 次重试）。
 */
var TEAM_FILE_LOCK_OPTIONS = {
  realpath: false,
  retries: {
    retries: 10,
    minTimeout: 5,
    maxTimeout: 100,
  },
  onCompromised: () => {},
};
//@ chunk-qrtkkn9z.js:3572-3759 layout
function teamFileMissingError(teamName) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Internal error: team file for "${teamName}" not found. The session team should have been initialized at startup.`,
    "Team file missing (session team not initialized)",
  );
}
//@ chunk-qrtkkn9z.js:3759-4347 facade-exports (2.1.88 match: writeTeamFile, 0)
/**
 * 加锁读-改-写团队文件：回调返回 false 时不写；bestEffortWrite 时写失败只记录。存储 v5 走 updateTeamFileInStore。
 */
async function updateTeamFile(teamName, mutate, options, storage) {
  if (storage) return updateTeamFileInStore(teamName, mutate, options, storage);
  let teamDir = getTeamFilePath(teamName);
  let releaseLock;
  try {
    releaseLock = await lock(teamDir, {
      lockfilePath: `${teamDir}.lock`,
      ...TEAM_FILE_LOCK_OPTIONS,
    });
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") throw teamFileMissingError(teamName);
    throw error;
  }
  try {
    let teamFile = await readTeamFileAsync(teamName);
    if (!teamFile) throw Error("Team config file unreadable (lock acquired, read failed)");
    let result = mutate(teamFile);
    if (result === false) return;
    try {
      let text = jsonStringify(teamFile, null, 2);
      let fileHandle = await open(teamDir, "r+");
      try {
        await writeFile(fileHandle, text);
        await fileHandle.truncate(Buffer.byteLength(text));
      } finally {
        await fileHandle.close();
      }
    } catch (error) {
      if (!options?.bestEffortWrite)
        throw getErrnoCode(error) === "ENOENT" ? teamFileMissingError(teamName) : error;
      logTeamFileWriteFailure(teamName, error);
    }
    return result;
  } finally {
    try {
      await releaseLock();
    } catch (error) {
      logForDebugging(`[TeammateTool] updateTeamFile lock release failed: ${errorMessage(error)}`);
    }
  }
}
//@ chunk-qrtkkn9z.js:4347-4562 facade-exports (2.1.88 match: removeMemberFromTeam, 0.358)
/**
 * 按 agentId 从团队文件删除成员（失败只记日志）。
 */
async function removeTeamMember(teamName, agentId, storage) {
  try {
    await updateTeamFile(
      teamName,
      (teamFile) => {
        let memberIndex = teamFile.members.findIndex((m) => m.agentId === agentId);
        if (memberIndex === -1) return false;
        teamFile.members.splice(memberIndex, 1);
      },
      undefined,
      storage,
    );
  } catch (error) {
    logForDebugging(`[TeammateTool] removeTeamMember(${agentId}) failed: ${errorMessage(error)}`);
  }
}
//@ chunk-qrtkkn9z.js:4562-6135 file-local
/**
 * 在存储 v5 上原子更新团队文件：锁可疑/文件不可读时最多重试 5 次，其余错误按 bestEffortWrite 决定抛出或记录。
 */
async function updateTeamFileInStore(teamName, mutate, options, storage) {
  let storeKey = teamStoreKey(teamName);
  let maxAttempts = 5;
  let jitteredBackoff = createJitteredBackoff(50);
  let lastResult;
  let updater = (current) => {
    if (current === undefined)
      return {
        skip: true,
        result: {
          kind: "missing",
        },
      };
    let teamFile;
    try {
      teamFile = sanitizeTeamFile(jsonParse(Buffer.from(current.value).toString("utf8"))) ?? undefined;
    } catch (error) {
      return {
        skip: true,
        result: {
          kind: "unreadable",
          parseError: errorMessage(error),
        },
      };
    }
    if (!teamFile)
      return {
        skip: true,
        result: {
          kind: "unreadable",
        },
      };
    let applied;
    try {
      applied = mutate(teamFile);
    } catch (error) {
      return {
        skip: true,
        result: {
          kind: "threw",
          error,
        },
      };
    }
    if (applied === false)
      return {
        skip: true,
        result: {
          kind: "declined",
        },
      };
    lastResult = applied;
    return {
      write: jsonStringify(teamFile, null, 2),
      result: {
        kind: "applied",
        result: applied,
      },
    };
  };
  let updateResult;
  for (let idx = 1; ; idx++) {
    updateResult = await storage.update(storeKey, updater);
    if (!updateResult.ok) {
      if (isLockSuspectError(updateResult.error) && idx < 5) {
        await jitteredBackoff(idx);
        continue;
      }
      break;
    }
    let outcome = updateResult.value.result;
    if (outcome === undefined || outcome.kind === "declined") return;
    switch (outcome.kind) {
      case "missing":
        throw teamFileMissingError(teamName);
      case "unreadable":
        if (outcome.parseError !== undefined)
          logForDebugging(`[TeammateTool] Failed to read team file for ${teamName}: ${outcome.parseError}`);
        if (idx < 5) {
          await jitteredBackoff(idx);
          continue;
        }
        throw Error("Team config file unreadable (lock acquired, read failed)");
      case "threw":
        throw outcome.error;
      case "applied":
        logFeatureOk("swarm_team_file_update");
        return outcome.result;
      default:
        return outcome;
    }
  }
  let contended = isLockContendedError(updateResult.error);
  if (contended) logFeatureSad("swarm_team_file_update", "lock_contended");
  if (!options?.bestEffortWrite) {
    let error = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Team file update failed (${formatStoreError(updateResult.error)}) for ${teamName}`,
      "Team file update failed (storage v5)",
    );
    error.cause = updateResult.error;
    if (!contended && !isBenignStoreError(updateResult.error))
      logFeatureBad("swarm_team_file_update", updateResult.error.code);
    throw error;
  }
  if (!isLockSuspectError(updateResult.error) && isBenignStoreError(updateResult.error))
    logForDebugging(
      `[TeammateTool] Failed to update team file for ${teamName} (${formatStoreError(updateResult.error)})`,
      {
        level: "error",
      },
    );
  else {
    let error = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Team file update failed (${formatStoreError(updateResult.error)}) for ${teamName}`,
      "Team file update failed (storage v5)",
    );
    error.cause = updateResult.error;
    logFeatureBad("swarm_team_file_update", updateResult.error.code);
    logError(error);
  }
  return lastResult;
}
//@ chunk-qrtkkn9z.js:6135-6443 facade-exports (2.1.88 match: writeTeamFileAsync, 0.14)
/**
 * 写团队文件（存储 v5 或 config.json）。
 */
async function writeTeamFileAsync(teamName, teamFile, storage) {
  if (storage) {
    let writeResult = await storage.write(teamStoreKey(teamName), jsonStringify(teamFile, null, 2), {
      precondition: {
        type: "none",
      },
    });
    if (!writeResult.ok) {
      let error = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Team file write failed (${formatStoreError(writeResult.error)}) for ${teamName}`,
        "Team file write failed (storage v5)",
      );
      error.cause = writeResult.error;
      throw error;
    }
    return;
  }
  let teamDir = getTeamDir(teamName);
  await mkdir(teamDir, {
    recursive: true,
  });
  await writeFile(getTeamFilePath(teamName), jsonStringify(teamFile, null, 2));
}
//@ chunk-qrtkkn9z.js:6443-7081 facade-exports (2.1.88 match: removeTeammateFromTeamFile, 0.879)
/**
 * 按 agentId 或名字从团队文件删除成员（尽力写入）。
 */
async function removeTeammateFromTeamFile(teamName, identifier, storageV5) {
  let identifierStr = identifier.agentId || identifier.name;
  if (!identifierStr) {
    logForDebugging("[TeammateTool] removeTeammateFromTeamFile called with no identifier");
    return false;
  }
  let notFound = false;
  try {
    let updated =
      (await updateTeamFile(
        teamName,
        (teamFile) => {
          notFound = false;
          let originalLength = teamFile.members.length;
          teamFile.members = teamFile.members.filter((m) => {
            if (identifier.agentId && m.agentId === identifier.agentId) return false;
            if (identifier.name && m.name === identifier.name) return false;
            return true;
          });
          let removed = teamFile.members.length !== originalLength;
          notFound = !removed;
          return removed;
        },
        {
          bestEffortWrite: true,
        },
        storageV5,
      )) ?? false;
    if (updated) logForDebugging(`[TeammateTool] Removed teammate from team file: ${identifierStr}`);
    else if (notFound)
      logForDebugging(`[TeammateTool] Teammate ${identifierStr} not found in team file for "${teamName}"`);
    return updated;
  } catch (error) {
    logForDebugging(
      `[TeammateTool] Cannot remove teammate ${identifierStr} from "${teamName}": ${errorMessage(error)}`,
    );
    return false;
  }
}
//@ chunk-qrtkkn9z.js:7081-7332 facade-exports (2.1.88 match: setMultipleMemberModes, 0.184)
async function isShutdownFrameStale(teamName, agentId, timestamp, storage) {
  let found = (await readTeamFileAsync(teamName, storage).catch(() => null))?.members.find(
    (member) => member.agentId === agentId,
  );
  let stale = found !== undefined && found.joinedAt >= Date.parse(timestamp);
  if (stale)
    logForDebugging(
      `[TeammateTool] Ignoring a shutdown approval for ${agentId}: it was sent before this member joined`,
    );
  return stale;
}
//@ chunk-qrtkkn9z.js:7332-7909 facade-exports (2.1.88 match: removeMemberByAgentId, 0.516)
/**
 * 按 agentId 删除成员；onlyIfJoinedBefore 防止删掉删除发起后又重新加入的同 ID 成员。
 */
async function removeMemberByAgentId(teamName, agentId, options, storageV5) {
  let stale = false;
  try {
    let updated =
      (await updateTeamFile(
        teamName,
        (teamFile) => {
          let memberIndex = teamFile.members.findIndex((m) => m.agentId === agentId);
          let member = teamFile.members[memberIndex];
          if (!member) {
            stale = false;
            return false;
          }
          if (options?.onlyIfJoinedBefore !== undefined && member.joinedAt >= options.onlyIfJoinedBefore) {
            stale = true;
            return false;
          }
          stale = false;
          teamFile.members.splice(memberIndex, 1);
          return true;
        },
        {
          bestEffortWrite: true,
        },
        storageV5,
      )) ?? false;
    if (updated) logForDebugging(`[TeammateTool] Removed member ${agentId} from team ${teamName}`);
    else if (stale)
      logForDebugging(
        `[TeammateTool] Skipped stale removal of ${agentId} from team ${teamName} (re-added after removal was initiated)`,
      );
    return updated;
  } catch (error) {
    logForDebugging(
      `[TeammateTool] removeMemberByAgentId(${agentId}) failed for team ${teamName}: ${errorMessage(error)}`,
    );
    return false;
  }
}
//@ chunk-qrtkkn9z.js:7909-8346 facade-exports (2.1.88 match: setMemberMode, 0.819)
/**
 * 设置成员的权限模式（mode），返回状态 absent/unchanged/set 只用于日志。
 */
async function setMemberMode(teamName, memberName, mode, storage) {
  let outcome = "unchanged";
  try {
    await updateTeamFile(
      teamName,
      (teamFile) => {
        let member = teamFile.members.find((m) => m.name === memberName);
        if (!member) {
          outcome = "absent";
          return false;
        }
        if (member.mode === mode) {
          outcome = "unchanged";
          return false;
        }
        outcome = "set";
        member.mode = mode;
      },
      undefined,
      storage,
    );
    if (outcome === "absent")
      logForDebugging(
        `[TeammateTool] Cannot set member mode: member ${memberName} not found in team ${teamName}`,
      );
    else if (outcome === "set")
      logForDebugging(`[TeammateTool] Set member ${memberName} in team ${teamName} to mode: ${mode}`);
  } catch (error) {
    logForDebugging(`[TeammateTool] Cannot set member mode: ${errorMessage(error)}`);
  }
}
//@ chunk-qrtkkn9z.js:8346-8436 facade-exports
/**
 * 当前是 teammate 时，把自己在团队文件里的 mode 更新为给定值。
 */
async function syncTeammateMode(mode, teamName, storage) {
  if (!isTeammate()) return;
  let teamName_2 = teamName ?? getTeamName();
  let agentName = getAgentName();
  if (teamName_2 && agentName) await setMemberMode(teamName_2, agentName, mode, storage);
}
//@ chunk-qrtkkn9z.js:8436-8895 facade-exports (2.1.88 match: setMemberActive, 0.789)
/**
 * 设置成员 isActive（空闲/活动）。
 */
async function setMemberActive(teamName, memberName, isActive, storage) {
  let outcome = "unchanged";
  try {
    await updateTeamFile(
      teamName,
      (teamFile) => {
        let member = teamFile.members.find((m) => m.name === memberName);
        if (!member) {
          outcome = "absent";
          return false;
        }
        if (member.isActive === isActive) {
          outcome = "unchanged";
          return false;
        }
        outcome = "set";
        member.isActive = isActive;
      },
      undefined,
      storage,
    );
    if (outcome === "absent")
      logForDebugging(
        `[TeammateTool] Cannot set member active: member ${memberName} not found in team ${teamName}`,
      );
    else if (outcome === "set")
      logForDebugging(
        `[TeammateTool] Set member ${memberName} in team ${teamName} to ${isActive ? "active" : "idle"}`,
      );
  } catch (error) {
    logForDebugging(`[TeammateTool] Cannot set member active: ${errorMessage(error)}`);
  }
}
//@ chunk-qrtkkn9z.js:8895-8924 facade-exports
/**
 * 登记本会话创建的团队，会话结束时清理。
 */
function registerTeamForSessionCleanup(teamName) {
  getSessionCreatedTeams().add(teamName);
}
//@ chunk-qrtkkn9z.js:8924-9303 facade-exports (2.1.88 match: cleanupSessionTeams, 0.749)
/**
 * 会话结束时清理本会话创建的团队：先杀孤儿 pane，再删团队目录。
 */
async function cleanupSessionTeams(storageV5) {
  return withFeatureTelemetry("swarm_session_cleanup", async () => {
    let sessionCreatedTeams = getSessionCreatedTeams();
    if (sessionCreatedTeams.size === 0) return;
    let teams = Array.from(sessionCreatedTeams);
    logForDebugging(`cleanupSessionTeams: removing ${teams.length} orphan team dir(s): ${teams.join(", ")}`);
    await Promise.allSettled(teams.map((name) => killOrphanedTeammatePanes(name, storageV5)));
    let settled = await Promise.allSettled(teams.map((name) => cleanupTeamDirectories(name)));
    sessionCreatedTeams.clear();
    for (let result of settled) if (result.status === "rejected") throw result.reason;
  }).catch(() => {});
}
//@ chunk-qrtkkn9z.js:9303-9337 layout
function paneKey(backendType, paneId) {
  return `${backendType}:${paneId}`;
}
//@ chunk-qrtkkn9z.js:9337-9386 facade-exports
/**
 * 记录本会话创建的 pane（后端类型:paneId），供会话结束时清理。
 */
function recordSpawnedTeammatePane(backendType, paneId) {
  if (isPaneBackendType(backendType) && paneId)
    getSessionSpawnedTeammatePanes().add(paneKey(backendType, paneId));
}
//@ chunk-qrtkkn9z.js:9386-10030 fingerprint (2.1.88 match: killOrphanedTeammatePanes, 0.846)
/**
 * 杀掉团队文件中、由本会话创建的 tmux/iTerm2 pane。
 */
async function killOrphanedTeammatePanes(teamName, storageV5) {
  let teamFile = await readTeamFileAsync(teamName, storageV5);
  if (!teamFile) return;
  let sessionSpawnedTeammatePanes = getSessionSpawnedTeammatePanes();
  let paneMembers = teamFile.members.filter(
    (m) =>
      m.name !== TEAM_LEAD &&
      m.tmuxPaneId &&
      m.backendType &&
      isPaneBackendType(m.backendType) &&
      sessionSpawnedTeammatePanes.has(paneKey(m.backendType, m.tmuxPaneId)),
  );
  if (paneMembers.length === 0) return;
  let [{ ensureBackendsRegistered, getBackendByType }, { isInsideTmux }] = await Promise.all([
    import("./backends/registry.js"),
    import("./backends/detection.js"),
  ]);
  await ensureBackendsRegistered();
  let useExternalSession = !(await isInsideTmux());
  await Promise.allSettled(
    paneMembers.map(async (m) => {
      if (!m.tmuxPaneId || !m.backendType || !isPaneBackendType(m.backendType)) return;
      let ok = await getBackendByType(m.backendType).killPane(m.tmuxPaneId, useExternalSession);
      logForDebugging(
        `cleanupSessionTeams: killPane ${m.name} (${m.backendType} ${m.tmuxPaneId}) \u2192 ${ok}`,
      );
    }),
  );
}
//@ chunk-qrtkkn9z.js:10030-10038 layout
var MAX_TEAM_DIR_DELETE_ATTEMPTS = 3;
//@ chunk-qrtkkn9z.js:10038-10587 facade-exports (2.1.88 match: cleanupTeamDirectories, 0.433)
/**
 * 删除团队目录（记 swarm_team_cleanup）。
 */
async function cleanupTeamDirectories(teamName) {
  return withFeatureTelemetry(
    "swarm_team_cleanup",
    async () => {
      let sanitizedName = getTeamDir(teamName);
      try {
        let trashPath = `${sanitizedName}.deleted-${randomUUID()}`;
        let targetPath = await rename(sanitizedName, trashPath).then(
          () => trashPath,
          () => sanitizedName,
        );
        for (let idx = 1; ; idx++) {
          await rm(targetPath, {
            recursive: true,
            force: true,
          });
          if (
            await stat(targetPath).then(
              () => false,
              (error) => getErrnoCode(error) === "ENOENT",
            )
          )
            break;
          if (idx === MAX_TEAM_DIR_DELETE_ATTEMPTS) {
            logForDebugging(`[TeammateTool] ${targetPath} still exists after ${idx} delete attempts`);
            throw Error("team folder still exists after every delete attempt");
          }
        }
        logForDebugging(`[TeammateTool] Cleaned up team directory: ${sanitizedName}`);
      } catch (error) {
        logForDebugging(
          `[TeammateTool] Failed to clean up team directory ${sanitizedName}: ${errorMessage(error)}`,
        );
        throw error;
      }
    },
    (error) => sanitizeErrnoForTelemetry(error) ?? "error",
  );
}
export {
  readTeamFileAsync,
  isShutdownFrameStale,
  removeTeammateFromTeamFile,
  removeMemberByAgentId,
  getTeamDir,
  cleanupTeamDirectories,
  updateTeamFile,
  getTeamFilePath,
  logTeamFileWriteFailure,
  writeTeamFileAsync,
  registerTeamForSessionCleanup,
  SwarmPaneError,
  hasControlChars,
  removeTeamMember,
  recordSpawnedTeammatePane,
  sanitizeAgentName,
  sanitizeName,
  assertNoControlChars,
  isPaneBackendType,
  syncTeammateMode,
  setMemberActive,
  setMemberMode,
  cleanupSessionTeams,
};

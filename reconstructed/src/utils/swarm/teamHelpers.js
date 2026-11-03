/**
 * utils/swarm/teamHelpers.ts
 *
 * 团队辅助：发送到终端窗格的命令中禁止控制字符
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/teamHelpers.ts
 * pieces: chunk-cne5hsvz.js (1), chunk-fw249fsw.js (37)
 * attribution: callgraph-fingerprint 1, placement 4, layout 13, facade-exports 18, file-local 1, fingerprint 1
 */
import { join } from "path";
import { readFile, mkdir, writeFile, rm } from "fs/promises";
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

//@ chunk-fw249fsw.js:719-794 placement
class SwarmPaneError extends Error {
  constructor(e) {
    super(e);
    this.name = "SwarmPaneError";
  }
}
//@ chunk-fw249fsw.js:794-810 placement
var A = /\p{Cc}/u;
//@ chunk-fw249fsw.js:810-843 placement
function Cii(e) {
  return A.test(e);
}
//@ chunk-fw249fsw.js:843-1045 placement
function assertNoControlChars(e) {
  let match = A.exec(e);
  if (match) {
    let codePoint = match[0].codePointAt(0);
    throw new SwarmPaneError(
      `Refusing to send command containing control character U+${codePoint.toString(16).padStart(4, "0").toUpperCase()} to terminal pane`,
    );
  }
}
/**
 * 类型是否是 pane 后端（tmux 或 iterm2）。
 */
//@ chunk-fw249fsw.js:1045-1093 layout = getBackendByType (1)
function isPaneBackendType(type) {
  return type === "tmux" || type === "iterm2";
}
//@ chunk-fw249fsw.js:1093-1161 facade-exports
function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
}
//@ chunk-fw249fsw.js:1161-1206 facade-exports
function sanitizeAgentName(e) {
  return e.replaceAll("@", "-");
}
/**
 * 团队目录：<teams 目录>/<规范化团队名>。
 */
//@ chunk-fw249fsw.js:1206-1245 facade-exports
function getTeamDir(teamName) {
  return join(getTeamsDir(), sanitizeName(teamName));
}
/**
 * 团队文件路径：<团队目录>/config.json。
 */
//@ chunk-fw249fsw.js:1245-1292 facade-exports = getTeamFilePath (1)
function getTeamFilePath(teamName) {
  return join(getTeamDir(teamName), "config.json");
}
/**
 * 团队文件在存储 v5 中的键。
 */
//@ chunk-fw249fsw.js:1292-1329 layout
function teamStoreKey(teamName) {
  return STORAGE_SPACES.team(sanitizeName(teamName));
}
//@ chunk-fw249fsw.js:1329-1493 layout
function formatStoreError(e) {
  let r = "failureClass" in e ? `/${e.failureClass}` : "",
    n = "telemetryCode" in e && e.telemetryCode !== void 0 ? ` [${e.telemetryCode}]` : "";
  return `${e.code}${r}${n}`;
}
//@ chunk-fw249fsw.js:1493-1570 layout
function isLockSuspectError(e) {
  return e.code === "Unavailable" && e.telemetryCode === "LockSuspect";
}
//@ chunk-fw249fsw.js:1570-1649 layout
function isLockContendedError(e) {
  return e.code === "Unavailable" && e.telemetryCode === "LockContended";
}
//@ chunk-fw249fsw.js:1649-1868 layout
function isBenignStoreError(e) {
  return (
    e.code === "Unavailable" ||
    e.code === "NotFound" ||
    (e.code === "Failed" &&
      (e.failureClass === "permission" ||
        e.failureClass === "resource" ||
        e.failureClass === "environment" ||
        (e.failureClass === "unknown" && isSyscallError(e.cause))))
  );
}
/**
 * 规范化团队文件：剔除格式不对的成员与 leadProcess。
 */
//@ chunk-fw249fsw.js:1868-2156 layout
function sanitizeTeamFile(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e)) return null;
  let r = e,
    n = Array.isArray(r.members) ? r.members.filter(isValidMember) : [],
    i = isValidLeadProcess(r.leadProcess) ? r.leadProcess : void 0;
  return Array.isArray(r.members) && n.length === r.members.length && i === r.leadProcess
    ? r
    : { ...r, members: n, leadProcess: i };
}
//@ chunk-fw249fsw.js:2156-2393 layout
function isValidLeadProcess(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    "pid" in e &&
    Number.isSafeInteger(e.pid) &&
    "pidSpace" in e &&
    typeof e.pidSpace === "string" &&
    "claimedAt" in e &&
    Number.isFinite(e.claimedAt) &&
    (!("procStart" in e) || typeof e.procStart === "string")
  );
}
//@ chunk-fw249fsw.js:2393-2526 layout
function isValidMember(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    "agentId" in e &&
    typeof e.agentId === "string" &&
    "name" in e &&
    typeof e.name === "string"
  );
}
/**
 * 读团队文件：有存储 v5 时从存储读，否则读 config.json；不存在返回 null。
 */
//@ chunk-fw249fsw.js:2526-3028 facade-exports = readTeamFile (0.837)
async function readTeamFileAsync(teamName, storage) {
  if (storage) {
    let read = await storage.read([teamStoreKey(teamName)]);
    if (!read.ok)
      return (
        logForDebugging(`[TeammateTool] Failed to read team file for ${teamName}: ${read.error.code}`),
        null
      );
    let i = read.value.items[0];
    if (!i.found) return null;
    try {
      return sanitizeTeamFile(jsonParse(Buffer.from(i.value).toString("utf8")));
    } catch (error) {
      return (
        logForDebugging(`[TeammateTool] Failed to read team file for ${teamName}: ${errorMessage(error)}`),
        null
      );
    }
  }
  try {
    let n = await readFile(getTeamFilePath(teamName), "utf-8");
    return sanitizeTeamFile(jsonParse(n));
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return null;
    return (
      logForDebugging(`[TeammateTool] Failed to read team file for ${teamName}: ${errorMessage(error)}`),
      null
    );
  }
}
//@ chunk-fw249fsw.js:3028-3248 facade-exports
function logTeamFileWriteFailure(e, r) {
  if (isSyscallError(r))
    logForDebugging(
      `[TeammateTool] Failed to write team file for ${e} (${getErrnoCode(r)}): ${errorMessage(r)}`,
      { level: "error" },
    );
  else if (isBenignStoreErrorCause(r))
    logForDebugging(`[TeammateTool] Failed to write team file for ${e}: ${errorMessage(r)}`, {
      level: "error",
    });
  else logError(r);
}
//@ chunk-fw249fsw.js:3248-3414 layout
function isBenignStoreErrorCause(e) {
  if (!(e instanceof Error) || e.cause === void 0 || e.cause === null) return !1;
  let cause = e.cause;
  if (typeof cause !== "object" || typeof cause.code !== "string") return !1;
  return isBenignStoreError(cause);
}
/**
 * 团队文件锁选项（10 次重试）。
 */
//@ chunk-fw249fsw.js:3414-3504 layout = LOCK_OPTIONS (0.776)
var TEAM_FILE_LOCK_OPTIONS = {
  realpath: !1,
  retries: { retries: 10, minTimeout: 5, maxTimeout: 100 },
  onCompromised: () => {},
};
//@ chunk-fw249fsw.js:3504-3691 layout
function teamFileMissingError(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Internal error: team file for "${e}" not found. The session team should have been initialized at startup.`,
    "Team file missing (session team not initialized)",
  );
}
/**
 * 加锁读-改-写团队文件：回调返回 false 时不写；bestEffortWrite 时写失败只记录。存储 v5 走 updateTeamFileInStore。
 */
//@ chunk-fw249fsw.js:3691-4156 facade-exports = writeTeamFile (0)
async function updateTeamFile(teamName, mutate, options, storage) {
  if (storage) return updateTeamFileInStore(teamName, mutate, options, storage);
  let teamDir = getTeamFilePath(teamName),
    u;
  try {
    u = await lock(teamDir, { lockfilePath: `${teamDir}.lock`, ...TEAM_FILE_LOCK_OPTIONS });
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") throw teamFileMissingError(teamName);
    throw error;
  }
  try {
    let s = await readTeamFileAsync(teamName);
    if (!s) throw Error("Team config file unreadable (lock acquired, read failed)");
    let c = mutate(s);
    if (c === !1) return;
    try {
      await writeTeamFileAsync(teamName, s);
    } catch (error) {
      if (!options?.bestEffortWrite) throw error;
      logTeamFileWriteFailure(teamName, error);
    }
    return c;
  } finally {
    try {
      await u();
    } catch (error) {
      logForDebugging(`[TeammateTool] updateTeamFile lock release failed: ${errorMessage(error)}`);
    }
  }
}
/**
 * 按 agentId 从团队文件删除成员（失败只记日志）。
 */
//@ chunk-fw249fsw.js:4156-4371 facade-exports = removeMemberFromTeam (0.359)
async function removeTeamMember(teamName, agentId, storage) {
  try {
    await updateTeamFile(
      teamName,
      (i) => {
        let memberIndex = i.members.findIndex((member) => member.agentId === agentId);
        if (memberIndex === -1) return !1;
        i.members.splice(memberIndex, 1);
      },
      void 0,
      storage,
    );
  } catch (error) {
    logForDebugging(`[TeammateTool] removeTeamMember(${agentId}) failed: ${errorMessage(error)}`);
  }
}
/**
 * 在存储 v5 上原子更新团队文件：锁可疑/文件不可读时最多重试 5 次，其余错误按 bestEffortWrite 决定抛出或记录。
 */
//@ chunk-fw249fsw.js:4371-5944 file-local
async function updateTeamFileInStore(teamName, mutate, options, storage) {
  let o = teamStoreKey(teamName),
    u = 5,
    s = createJitteredBackoff(50),
    c,
    y = (p) => {
      if (p === void 0) return { skip: !0, result: { kind: "missing" } };
      let T;
      try {
        T = sanitizeTeamFile(jsonParse(Buffer.from(p.value).toString("utf8"))) ?? void 0;
      } catch (error) {
        return { skip: !0, result: { kind: "unreadable", parseError: errorMessage(error) } };
      }
      if (!T) return { skip: !0, result: { kind: "unreadable" } };
      let b;
      try {
        b = mutate(T);
      } catch (error) {
        return { skip: !0, result: { kind: "threw", error: error } };
      }
      if (b === !1) return { skip: !0, result: { kind: "declined" } };
      return ((c = b), { write: jsonStringify(T, null, 2), result: { kind: "applied", result: b } });
    },
    a;
  for (let p = 1; ; p++) {
    if (((a = await storage.update(o, y)), !a.ok)) {
      if (isLockSuspectError(a.error) && p < 5) {
        await s(p);
        continue;
      }
      break;
    }
    let T = a.value.result;
    if (T === void 0 || T.kind === "declined") return;
    switch (T.kind) {
      case "missing":
        throw teamFileMissingError(teamName);
      case "unreadable":
        if (T.parseError !== void 0)
          logForDebugging(`[TeammateTool] Failed to read team file for ${teamName}: ${T.parseError}`);
        if (p < 5) {
          await s(p);
          continue;
        }
        throw Error("Team config file unreadable (lock acquired, read failed)");
      case "threw":
        throw T.error;
      case "applied":
        return (logFeatureOk("swarm_team_file_update"), T.result);
      default:
        return T;
    }
  }
  let w = isLockContendedError(a.error);
  if (w) logFeatureSad("swarm_team_file_update", "lock_contended");
  if (!options?.bestEffortWrite) {
    let p = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Team file update failed (${formatStoreError(a.error)}) for ${teamName}`,
      "Team file update failed (storage v5)",
    );
    if (((p.cause = a.error), !w && !isBenignStoreError(a.error)))
      logFeatureBad("swarm_team_file_update", a.error.code);
    throw p;
  }
  if (!isLockSuspectError(a.error) && isBenignStoreError(a.error))
    logForDebugging(
      `[TeammateTool] Failed to update team file for ${teamName} (${formatStoreError(a.error)})`,
      { level: "error" },
    );
  else {
    let p = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Team file update failed (${formatStoreError(a.error)}) for ${teamName}`,
      "Team file update failed (storage v5)",
    );
    ((p.cause = a.error), logFeatureBad("swarm_team_file_update", a.error.code), logError(p));
  }
  return c;
}
/**
 * 写团队文件（存储 v5 或 config.json）。
 */
//@ chunk-fw249fsw.js:5944-6252 facade-exports = writeTeamFileAsync (0.14)
async function writeTeamFileAsync(teamName, teamFile, storage) {
  if (storage) {
    let write = await storage.write(teamStoreKey(teamName), jsonStringify(teamFile, null, 2), {
      precondition: { type: "none" },
    });
    if (!write.ok) {
      let u = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Team file write failed (${formatStoreError(write.error)}) for ${teamName}`,
        "Team file write failed (storage v5)",
      );
      throw ((u.cause = write.error), u);
    }
    return;
  }
  let teamDir = getTeamDir(teamName);
  (await mkdir(teamDir, { recursive: !0 }),
    await writeFile(getTeamFilePath(teamName), jsonStringify(teamFile, null, 2)));
}
/**
 * 按 agentId 或名字从团队文件删除成员（尽力写入）。
 */
//@ chunk-fw249fsw.js:6252-6890 facade-exports = removeTeammateFromTeamFile (0.879)
async function removeTeammateFromTeamFile(e, r, n) {
  let i = r.agentId || r.name;
  if (!i) return (logForDebugging("[TeammateTool] removeTeammateFromTeamFile called with no identifier"), !1);
  let o = !1;
  try {
    let u =
      (await updateTeamFile(
        e,
        (s) => {
          o = !1;
          let originalLength = s.members.length;
          s.members = s.members.filter((member) => {
            if (r.agentId && member.agentId === r.agentId) return !1;
            if (r.name && member.name === r.name) return !1;
            return !0;
          });
          let y = s.members.length !== originalLength;
          return ((o = !y), y);
        },
        { bestEffortWrite: !0 },
        n,
      )) ?? !1;
    if (u) logForDebugging(`[TeammateTool] Removed teammate from team file: ${i}`);
    else if (o) logForDebugging(`[TeammateTool] Teammate ${i} not found in team file for "${e}"`);
    return u;
  } catch (error) {
    return (
      logForDebugging(`[TeammateTool] Cannot remove teammate ${i} from "${e}": ${errorMessage(error)}`),
      !1
    );
  }
}
/**
 * 按 agentId 删除成员；onlyIfJoinedBefore 防止删掉删除发起后又重新加入的同 ID 成员。
 */
//@ chunk-fw249fsw.js:6890-7467 facade-exports = removeMemberByAgentId (0.516)
async function removeMemberByAgentId(e, r, n, i) {
  let o = !1;
  try {
    let u =
      (await updateTeamFile(
        e,
        (s) => {
          let memberIndex = s.members.findIndex((member) => member.agentId === r),
            y = s.members[memberIndex];
          if (!y) return ((o = !1), !1);
          if (n?.onlyIfJoinedBefore !== void 0 && y.joinedAt >= n.onlyIfJoinedBefore) return ((o = !0), !1);
          return ((o = !1), s.members.splice(memberIndex, 1), !0);
        },
        { bestEffortWrite: !0 },
        i,
      )) ?? !1;
    if (u) logForDebugging(`[TeammateTool] Removed member ${r} from team ${e}`);
    else if (o)
      logForDebugging(
        `[TeammateTool] Skipped stale removal of ${r} from team ${e} (re-added after removal was initiated)`,
      );
    return u;
  } catch (error) {
    return (
      logForDebugging(
        `[TeammateTool] removeMemberByAgentId(${r}) failed for team ${e}: ${errorMessage(error)}`,
      ),
      !1
    );
  }
}
/**
 * 设置成员的权限模式（mode），返回状态 absent/unchanged/set 只用于日志。
 */
//@ chunk-fw249fsw.js:7467-7904 facade-exports = setMemberMode (0.819)
async function setMemberMode(teamName, memberName, mode, storage) {
  let o = "unchanged";
  try {
    if (
      (await updateTeamFile(
        teamName,
        (u) => {
          let member = u.members.find((member) => member.name === memberName);
          if (!member) return ((o = "absent"), !1);
          if (member.mode === mode) return ((o = "unchanged"), !1);
          ((o = "set"), (member.mode = mode));
        },
        void 0,
        storage,
      ),
      o === "absent")
    )
      logForDebugging(
        `[TeammateTool] Cannot set member mode: member ${memberName} not found in team ${teamName}`,
      );
    else if (o === "set")
      logForDebugging(`[TeammateTool] Set member ${memberName} in team ${teamName} to mode: ${mode}`);
  } catch (error) {
    logForDebugging(`[TeammateTool] Cannot set member mode: ${errorMessage(error)}`);
  }
}
/**
 * 当前是 teammate 时，把自己在团队文件里的 mode 更新为给定值。
 */
//@ chunk-fw249fsw.js:7904-7994 facade-exports
async function syncTeammateMode(mode, teamName, storage) {
  if (!isTeammate()) return;
  let i = teamName ?? getTeamName(),
    o = getAgentName();
  if (i && o) await setMemberMode(i, o, mode, storage);
}
/**
 * 设置成员 isActive（空闲/活动）。
 */
//@ chunk-fw249fsw.js:7994-8453 facade-exports = setMemberActive (0.789)
async function setMemberActive(teamName, memberName, isActive, storage) {
  let o = "unchanged";
  try {
    if (
      (await updateTeamFile(
        teamName,
        (u) => {
          let member = u.members.find((member) => member.name === memberName);
          if (!member) return ((o = "absent"), !1);
          if (member.isActive === isActive) return ((o = "unchanged"), !1);
          ((o = "set"), (member.isActive = isActive));
        },
        void 0,
        storage,
      ),
      o === "absent")
    )
      logForDebugging(
        `[TeammateTool] Cannot set member active: member ${memberName} not found in team ${teamName}`,
      );
    else if (o === "set")
      logForDebugging(
        `[TeammateTool] Set member ${memberName} in team ${teamName} to ${isActive ? "active" : "idle"}`,
      );
  } catch (error) {
    logForDebugging(`[TeammateTool] Cannot set member active: ${errorMessage(error)}`);
  }
}
/**
 * 登记本会话创建的团队，会话结束时清理。
 */
//@ chunk-fw249fsw.js:8453-8482 facade-exports
function registerTeamForSessionCleanup(teamName) {
  getSessionCreatedTeams().add(teamName);
}
/**
 * 会话结束时清理本会话创建的团队：先杀孤儿 pane，再删团队目录。
 */
//@ chunk-fw249fsw.js:8482-8861 facade-exports = cleanupSessionTeams (0.749)
async function cleanupSessionTeams(e) {
  return withFeatureTelemetry("swarm_session_cleanup", async () => {
    let sessionCreatedTeams = getSessionCreatedTeams();
    if (sessionCreatedTeams.size === 0) return;
    let teams = Array.from(sessionCreatedTeams);
    (logForDebugging(`cleanupSessionTeams: removing ${teams.length} orphan team dir(s): ${teams.join(", ")}`),
      await Promise.allSettled(teams.map((name) => killOrphanedTeammatePanes(name, e))));
    let settled = await Promise.allSettled(teams.map((name) => cleanupTeamDirectories(name)));
    sessionCreatedTeams.clear();
    for (let o of settled) if (o.status === "rejected") throw o.reason;
  }).catch(() => {});
}
//@ chunk-fw249fsw.js:8861-8895 layout
function paneKey(e, r) {
  return `${e}:${r}`;
}
/**
 * 记录本会话创建的 pane（后端类型:paneId），供会话结束时清理。
 */
//@ chunk-fw249fsw.js:8895-8944 facade-exports
function recordSpawnedTeammatePane(backendType, paneId) {
  if (isPaneBackendType(backendType) && paneId)
    getSessionSpawnedTeammatePanes().add(paneKey(backendType, paneId));
}
/**
 * 杀掉团队文件中、由本会话创建的 tmux/iTerm2 pane。
 */
//@ chunk-fw249fsw.js:8944-9588 fingerprint = killOrphanedTeammatePanes (0.847)
async function killOrphanedTeammatePanes(e, r) {
  let n = await readTeamFileAsync(e, r);
  if (!n) return;
  let i = getSessionSpawnedTeammatePanes(),
    paneMembers = n.members.filter(
      (member) =>
        member.name !== TEAM_LEAD &&
        member.tmuxPaneId &&
        member.backendType &&
        isPaneBackendType(member.backendType) &&
        i.has(paneKey(member.backendType, member.tmuxPaneId)),
    );
  if (paneMembers.length === 0) return;
  let [{ ensureBackendsRegistered: u, getBackendByType: s }, { isInsideTmux: c }] = await Promise.all([
    import("./chunk-qv0x351r.js"),
    import("./chunk-1bjs4yb5.js"),
  ]);
  await u();
  let useExternalSession = !(await c());
  await Promise.allSettled(
    paneMembers.map(async (a) => {
      if (!a.tmuxPaneId || !a.backendType || !isPaneBackendType(a.backendType)) return;
      let ok = await s(a.backendType).killPane(a.tmuxPaneId, useExternalSession);
      logForDebugging(
        `cleanupSessionTeams: killPane ${a.name} (${a.backendType} ${a.tmuxPaneId}) \u2192 ${ok}`,
      );
    }),
  );
}
/**
 * 删除团队目录（记 swarm_team_cleanup）。
 */
//@ chunk-fw249fsw.js:9588-9863 facade-exports = cleanupTeamDirectories (0.753)
async function cleanupTeamDirectories(teamName) {
  return withFeatureTelemetry(
    "swarm_team_cleanup",
    async () => {
      let sanitizedName = getTeamDir(teamName);
      try {
        (await rm(sanitizedName, { recursive: !0, force: !0 }),
          logForDebugging(`[TeammateTool] Cleaned up team directory: ${sanitizedName}`));
      } catch (error) {
        throw (
          logForDebugging(
            `[TeammateTool] Failed to clean up team directory ${sanitizedName}: ${errorMessage(error)}`,
          ),
          error
        );
      }
    },
    (r) => sanitizeErrnoForTelemetry(r) ?? "error",
  );
}
/**
 * 把成员的 pane 信息（tmuxPaneId、backendType）写入团队文件，并记录为本会话创建的 pane。
 */
//@ chunk-cne5hsvz.js:22255-22452 callgraph-fingerprint = setMultipleMemberModes (0.329)
async function setMemberPaneInfo(teamName, agentId, paneInfo, storage) {
  (recordSpawnedTeammatePane(paneInfo.backendType, paneInfo.tmuxPaneId),
    await updateTeamFile(
      teamName,
      (E) => {
        let found = E.members.find((member) => member.agentId === agentId);
        if (!found) return !1;
        ((found.tmuxPaneId = paneInfo.tmuxPaneId), (found.backendType = paneInfo.backendType));
      },
      void 0,
      storage,
    ));
}

export {
  readTeamFileAsync,
  setMemberActive,
  syncTeammateMode,
  removeTeammateFromTeamFile,
  SwarmPaneError,
  assertNoControlChars,
  getTeamFilePath,
  removeMemberByAgentId,
  getTeamDir,
  cleanupTeamDirectories,
  updateTeamFile,
  logTeamFileWriteFailure,
  writeTeamFileAsync,
  registerTeamForSessionCleanup,
  setMemberPaneInfo,
  sanitizeName,
  isPaneBackendType,
  Cii,
  removeTeamMember,
  sanitizeAgentName,
  setMemberMode,
};

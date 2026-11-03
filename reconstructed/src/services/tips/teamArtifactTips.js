/**
 * services/tips/teamArtifactTips.ts
 *
 * 2.1.316 新增。团队 Artifact 提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vjr65ep9.js (12)
 * attribution: placement 12
 */
import {
  checkHasTrustDialogAccepted,
  getCurrentProjectConfig,
  saveCurrentProjectConfig,
} from "../../utils/config.js";
import { preferRemoteValue, runInRemoteCallFrameMain } from "../../remote/remoteMode.js";
import { getCwd } from "../../utils/cwd.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { findGitRoot, gitExe } from "../../utils/git.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { getGitEmail, getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logEvent } from "../analytics/index.js";
import { logForDebugging } from "../../utils/debug.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { is1PEventLoggingEnabled } from "../analytics/firstPartyEventLogger.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";

//@ chunk-vjr65ep9.js:504-558 placement
var TEAM_ARTIFACT_DIRS = [".claude/skills", ".claude/commands"];
var MAX_TEAM_ARTIFACT_OVERFLOW = 3;
var _ = 100;
//@ chunk-vjr65ep9.js:558-981 placement
/**
 * 解析 .claude/ 下的团队产物路径：skills/<名>/SKILL.md 为技能，commands/…/*.md（或 …/skill.md）为命令（子目录用冒号连接）；其他返回 null。
 */
function parseTeamArtifactPath(n) {
  let parts = n.split("/");
  if (parts[0] !== ".claude" || parts.length < 3) return null;
  switch (parts[1]) {
    case "skills":
      if (parts.length === 4 && parts[3] === "SKILL.md")
        return {
          kind: "skill",
          name: parts[2],
        };
      return null;
    case "commands": {
      let last = parts.at(-1);
      if (!last.endsWith(".md")) return null;
      if (/^skill\.md$/i.test(last))
        return parts.length < 4
          ? null
          : {
              kind: "command",
              name: parts.slice(2, -1).join(":"),
            };
      return {
        kind: "command",
        name: parts.slice(2).join(":").slice(0, -3),
      };
    }
    default:
      return null;
  }
}
//@ chunk-vjr65ep9.js:981-2549 placement
class TeamArtifactScanner {
  inFlight = undefined;
  resolved = undefined;
  get(n) {
    this.inFlight ??= this.scan(n);
    return this.inFlight;
  }
  teammateAuthorOf(n) {
    return this.resolved?.find((e) => !e.byCurrentUser && e.name === n)?.author || null;
  }
  async scan(n) {
    if (!checkHasTrustDialogAccepted()) return [];
    let e = preferRemoteValue(getCwd(), getOriginalCwd());
    let gitRoot = findGitRoot(e);
    if (!gitRoot) return [];
    let [{ stdout: o, code: m }, s] = await Promise.all([
      execFileNoThrowWithCwd(
        gitExe(),
        [
          "-c",
          "core.quotePath=false",
          "-c",
          "core.fsmonitor=",
          "-c",
          "core.hooksPath=/dev/null",
          "-c",
          "core.pager=",
          "-c",
          "log.showSignature=false",
          "log",
          "--since=7.days",
          "--diff-filter=A",
          "--name-only",
          "--format=COMMIT%x00%an%x00%ae",
          "--",
          ...TEAM_ARTIFACT_DIRS,
        ],
        {
          cwd: gitRoot,
          timeout: 5000,
        },
      ),
      runInRemoteCallFrameMain(e, getGitEmail),
    ]);
    if (m !== 0) return [];
    let lower = s?.toLowerCase();
    let l = [];
    let A = new Set();
    let author = "";
    let h = "";
    for (let line of o.split(`
`)) {
      if (line.startsWith("COMMIT\x00")) {
        let parts = line.split("\x00");
        author = parts[1] ?? "";
        h = (parts[2] ?? "").toLowerCase();
        continue;
      }
      if (!line || A.has(line)) continue;
      A.add(line);
      let teamArtifactPath = parseTeamArtifactPath(line);
      if (teamArtifactPath) {
        let byCurrentUser = Boolean(lower && h === lower);
        l.push({
          path: line,
          author,
          byCurrentUser,
          ...teamArtifactPath,
        });
      }
    }
    this.resolved = l;
    let currentProjectConfig = getCurrentProjectConfig();
    let E = new Set(currentProjectConfig.seenTeamArtifactPaths ?? []);
    let any = l.some((r) => !r.byCurrentUser && !E.has(r.path));
    let U = new Set(currentProjectConfig.loggedAuthoredArtifactPaths ?? []);
    let filtered = l.filter((r) => r.byCurrentUser && !U.has(r.path));
    for (let r of filtered)
      logEvent("tengu_skill_authored", {
        is_skill: r.kind === "skill",
      });
    try {
      await saveCurrentProjectConfig((r) => {
        let d = r.hasUnseenTeamArtifacts === any;
        if (filtered.length === 0 && d) return r;
        let f = d
          ? r
          : {
              ...r,
              hasUnseenTeamArtifacts: any,
            };
        if (filtered.length === 0) return f;
        let loggedAuthoredArtifactPaths = f.loggedAuthoredArtifactPaths ?? [];
        let mapped = filtered.map((T) => T.path);
        let B = new Set(mapped);
        let loggedAuthoredArtifactPaths_2 = [
          ...loggedAuthoredArtifactPaths.filter(
            (loggedAuthoredArtifactPath) => !B.has(loggedAuthoredArtifactPath),
          ),
          ...mapped,
        ].slice(-_);
        return {
          ...f,
          loggedAuthoredArtifactPaths: loggedAuthoredArtifactPaths_2,
        };
      }, n);
    } catch (error) {
      logForDebugging(`team-artifact eligibility persist failed: ${error}`);
    }
    return l;
  }
}
//@ chunk-vjr65ep9.js:2549-2573 placement
/**
 * 按会话保存的团队产物扫描器。
 */
var teamArtifactScannerSlots = new SessionRootSlot(() => new TeamArtifactScanner());
//@ chunk-vjr65ep9.js:2573-2611 placement
/**
 * 查找某技能/命令的队友作者（团队 artifact 提示用）。
 */
function teammateAuthorOfSkill(n, e) {
  return teamArtifactScannerSlots.of(n).get(e);
}
//@ chunk-vjr65ep9.js:2611-2734 placement
/**
 * 团队 artifact 提示开启时，查找项目设置中某技能/命令的队友作者，否则返回 null。
 */
function getTeammateAuthor(session, e, skillName) {
  if (e !== "projectSettings" || !getFeatureValue_CACHED_MAY_BE_STALE("tengu_tussock_oriole", false))
    return null;
  return teamArtifactScannerSlots.of(session).teammateAuthorOf(skillName);
}
//@ chunk-vjr65ep9.js:2734-2863 placement
/**
 * 判断是否有未看过的团队 artifact（开启一方事件日志时顺便后台刷新列表）。
 */
function hasUnseenTeamArtifacts(session, storageV5) {
  if (is1PEventLoggingEnabled()) teammateAuthorOfSkill(session, storageV5).catch(() => {});
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_tussock_oriole", false)) return false;
  return getCurrentProjectConfig().hasUnseenTeamArtifacts === true;
}
//@ chunk-vjr65ep9.js:2863-3032 placement
/**
 * 列出不是当前用户创建且尚未看过的团队技能/命令。
 */
async function listUnseenTeamArtifacts(session, storageV5) {
  let i = await teammateAuthorOfSkill(session, storageV5);
  if (i.length === 0) return [];
  let o = new Set(getCurrentProjectConfig().seenTeamArtifactPaths ?? []);
  return i.filter((m) => !m.byCurrentUser && !o.has(m.path));
}
//@ chunk-vjr65ep9.js:3032-3389 placement
/**
 * 把队友新增的技能/命令路径记为已看过（保留最近若干条）并清除"有未看团队产物"标记，无变化时不写配置。
 */
async function markTeamArtifactsSeen(session, storageV5) {
  let mapped = (await teammateAuthorOfSkill(session, storageV5))
    .filter((s) => !s.byCurrentUser)
    .map((s) => s.path);
  let m = new Set(mapped);
  await saveCurrentProjectConfig((s) => {
    let seenTeamArtifactPaths = s.seenTeamArtifactPaths ?? [];
    let sliced = [
      ...seenTeamArtifactPaths.filter((seenTeamArtifactPath) => !m.has(seenTeamArtifactPath)),
      ...mapped,
    ].slice(-_);
    if (
      sliced.length === seenTeamArtifactPaths.length &&
      sliced.every((u, h) => u === seenTeamArtifactPaths[h]) &&
      s.hasUnseenTeamArtifacts === false
    )
      return s;
    return {
      ...s,
      seenTeamArtifactPaths: sliced,
      hasUnseenTeamArtifacts: false,
    };
  }, storageV5);
}
//@ chunk-vjr65ep9.js:3389-3606 placement
/**
 * 团队 artifact 提示展示时打点（技能、命令数量与超出显示的数量）。
 */
function logTeamArtifactTipShown(n) {
  let e = {
    skill: 0,
    command: 0,
  };
  for (let i of n) e[i.kind]++;
  logFeatureOk("tips_team_artifact_show");
  logEvent("tengu_team_artifact_tip_shown", {
    skill_count: e.skill,
    command_count: e.command,
    overflow_count: Math.max(0, n.length - MAX_TEAM_ARTIFACT_OVERFLOW),
  });
}
//@ chunk-vjr65ep9.js:3606-3738 placement
/**
 * 生成使用项目设置中技能/命令时的归因字段：是否是通过团队提示发现的。
 */
function getTeamTipAttribution(n, e) {
  if (n !== "projectSettings") return {};
  return {
    via_team_tip: (getCurrentProjectConfig().seenTeamArtifactPaths ?? []).some(
      (o) => parseTeamArtifactPath(o)?.name === e,
    ),
  };
}
//@ chunk-vjr65ep9.js:3738-4038 placement
/**
 * 生成"团队新增"提示：列出队友新增的若干技能/命令（/名 (作者)），超出部分写"plus N more"。
 */
function formatTeamArtifactTip(n) {
  let filtered = n.filter((c) => !c.byCurrentUser);
  if (filtered.length === 0) return "";
  let sliced = filtered.slice(0, MAX_TEAM_ARTIFACT_OVERFLOW);
  let mapped = sliced.map((c) => `/${c.name} (${c.author || "a teammate"})`);
  let m = mapped.length === 1 ? mapped[0] : `${mapped.slice(0, -1).join(", ")} and ${mapped.at(-1)}`;
  let s = filtered.length - sliced.length;
  return `New from your team: ${m}${s > 0 ? `, plus ${s} more` : ""}`;
}
export {
  getTeammateAuthor,
  getTeamTipAttribution,
  listUnseenTeamArtifacts,
  logTeamArtifactTipShown,
  markTeamArtifactsSeen,
  formatTeamArtifactTip,
  hasUnseenTeamArtifacts,
};

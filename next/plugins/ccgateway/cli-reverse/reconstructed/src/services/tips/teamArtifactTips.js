/**
 * services/tips/teamArtifactTips.ts
 *
 * 2.1.316 新增。团队 Artifact 提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-byepptkv.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-byepptkv.js:537-591 placement
var TEAM_ARTIFACT_DIRS = [".claude/skills", ".claude/commands"];
var MAX_TEAM_ARTIFACT_OVERFLOW = 3;
var TEAM_ARTIFACT_HISTORY_LIMIT = 100;
//@ chunk-byepptkv.js:591-1014 placement
/**
 * 解析 .claude/ 下的团队产物路径：skills/<名>/SKILL.md 为技能，commands/…/*.md（或 …/skill.md）为命令（子目录用冒号连接）；其他返回 null。
 */
function parseTeamArtifactPath(relativePath) {
  let parts = relativePath.split("/");
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
//@ chunk-byepptkv.js:1014-2582 placement
class TeamArtifactScanner {
  inFlight = undefined;
  resolved = undefined;
  get(storageV5) {
    this.inFlight ??= this.scan(storageV5);
    return this.inFlight;
  }
  teammateAuthorOf(skillName) {
    return (
      this.resolved?.find((artifact) => !artifact.byCurrentUser && artifact.name === skillName)?.author ||
      null
    );
  }
  async scan(storageV5) {
    if (!checkHasTrustDialogAccepted()) return [];
    let cwd = preferRemoteValue(getCwd(), getOriginalCwd());
    let gitRoot = findGitRoot(cwd);
    if (!gitRoot) return [];
    let [{ stdout, code: exitCode }, gitEmail] = await Promise.all([
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
      runInRemoteCallFrameMain(cwd, getGitEmail),
    ]);
    if (exitCode !== 0) return [];
    let lower = gitEmail?.toLowerCase();
    let artifacts = [];
    let seenPaths = new Set();
    let author = "";
    let authorEmail = "";
    for (let line of stdout.split(`
`)) {
      if (line.startsWith("COMMIT\x00")) {
        let parts = line.split("\x00");
        author = parts[1] ?? "";
        authorEmail = (parts[2] ?? "").toLowerCase();
        continue;
      }
      if (!line || seenPaths.has(line)) continue;
      seenPaths.add(line);
      let teamArtifactPath = parseTeamArtifactPath(line);
      if (teamArtifactPath) {
        let byCurrentUser = Boolean(lower && authorEmail === lower);
        artifacts.push({
          path: line,
          author,
          byCurrentUser,
          ...teamArtifactPath,
        });
      }
    }
    this.resolved = artifacts;
    let currentProjectConfig = getCurrentProjectConfig();
    let alreadySeenPaths = new Set(currentProjectConfig.seenTeamArtifactPaths ?? []);
    let any = artifacts.some((artifact) => !artifact.byCurrentUser && !alreadySeenPaths.has(artifact.path));
    let loggedPaths = new Set(currentProjectConfig.loggedAuthoredArtifactPaths ?? []);
    let filtered = artifacts.filter((artifact) => artifact.byCurrentUser && !loggedPaths.has(artifact.path));
    for (let artifact of filtered)
      logEvent("tengu_skill_authored", {
        is_skill: artifact.kind === "skill",
      });
    try {
      await saveCurrentProjectConfig((config) => {
        let isUnchangedFlag = config.hasUnseenTeamArtifacts === any;
        if (filtered.length === 0 && isUnchangedFlag) return config;
        let withFlag = isUnchangedFlag
          ? config
          : {
              ...config,
              hasUnseenTeamArtifacts: any,
            };
        if (filtered.length === 0) return withFlag;
        let loggedAuthoredArtifactPaths = withFlag.loggedAuthoredArtifactPaths ?? [];
        let mapped = filtered.map((artifact) => artifact.path);
        let newPaths = new Set(mapped);
        let loggedAuthoredArtifactPaths_2 = [
          ...loggedAuthoredArtifactPaths.filter(
            (loggedAuthoredArtifactPath) => !newPaths.has(loggedAuthoredArtifactPath),
          ),
          ...mapped,
        ].slice(-TEAM_ARTIFACT_HISTORY_LIMIT);
        return {
          ...withFlag,
          loggedAuthoredArtifactPaths: loggedAuthoredArtifactPaths_2,
        };
      }, storageV5);
    } catch (error) {
      logForDebugging(`team-artifact eligibility persist failed: ${error}`);
    }
    return artifacts;
  }
}
//@ chunk-byepptkv.js:2582-2606 placement
/**
 * 按会话保存的团队产物扫描器。
 */
var teamArtifactScannerSlots; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-byepptkv.js:2582", () => {
  teamArtifactScannerSlots = new SessionRootSlot(() => new TeamArtifactScanner());
});
//@ chunk-byepptkv.js:2606-2644 placement
/**
 * 查找某技能/命令的队友作者（团队 artifact 提示用）。
 */
function teammateAuthorOfSkill(session, storageV5) {
  return teamArtifactScannerSlots.of(session).get(storageV5);
}
//@ chunk-byepptkv.js:2644-2767 placement
/**
 * 团队 artifact 提示开启时，查找项目设置中某技能/命令的队友作者，否则返回 null。
 */
function getTeammateAuthor(session, source, path) {
  if (source !== "projectSettings" || !getFeatureValue_CACHED_MAY_BE_STALE("tengu_tussock_oriole", false))
    return null;
  return teamArtifactScannerSlots.of(session).teammateAuthorOf(path);
}
//@ chunk-byepptkv.js:2767-2896 placement
/**
 * 判断是否有未看过的团队 artifact（开启一方事件日志时顺便后台刷新列表）。
 */
function hasUnseenTeamArtifacts(session, storageV5) {
  if (is1PEventLoggingEnabled()) teammateAuthorOfSkill(session, storageV5).catch(() => {});
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_tussock_oriole", false)) return false;
  return getCurrentProjectConfig().hasUnseenTeamArtifacts === true;
}
//@ chunk-byepptkv.js:2896-3065 placement
/**
 * 列出不是当前用户创建且尚未看过的团队技能/命令。
 */
async function listUnseenTeamArtifacts(session, storageV5) {
  let artifacts = await teammateAuthorOfSkill(session, storageV5);
  if (artifacts.length === 0) return [];
  let seenPaths = new Set(getCurrentProjectConfig().seenTeamArtifactPaths ?? []);
  return artifacts.filter((artifact) => !artifact.byCurrentUser && !seenPaths.has(artifact.path));
}
//@ chunk-byepptkv.js:3065-3422 placement
/**
 * 把队友新增的技能/命令路径记为已看过（保留最近若干条）并清除"有未看团队产物"标记，无变化时不写配置。
 */
async function markTeamArtifactsSeen(session, storageV5) {
  let mapped = (await teammateAuthorOfSkill(session, storageV5))
    .filter((artifact) => !artifact.byCurrentUser)
    .map((artifact) => artifact.path);
  let newPaths = new Set(mapped);
  await saveCurrentProjectConfig((config) => {
    let seenTeamArtifactPaths = config.seenTeamArtifactPaths ?? [];
    let sliced = [
      ...seenTeamArtifactPaths.filter((seenTeamArtifactPath) => !newPaths.has(seenTeamArtifactPath)),
      ...mapped,
    ].slice(-TEAM_ARTIFACT_HISTORY_LIMIT);
    if (
      sliced.length === seenTeamArtifactPaths.length &&
      sliced.every((path, index) => path === seenTeamArtifactPaths[index]) &&
      config.hasUnseenTeamArtifacts === false
    )
      return config;
    return {
      ...config,
      seenTeamArtifactPaths: sliced,
      hasUnseenTeamArtifacts: false,
    };
  }, storageV5);
}
//@ chunk-byepptkv.js:3422-3639 placement
/**
 * 团队 artifact 提示展示时打点（技能、命令数量与超出显示的数量）。
 */
function logTeamArtifactTipShown(artifacts) {
  let counts = {
    skill: 0,
    command: 0,
  };
  for (let artifact of artifacts) counts[artifact.kind]++;
  logFeatureOk("tips_team_artifact_show");
  logEvent("tengu_team_artifact_tip_shown", {
    skill_count: counts.skill,
    command_count: counts.command,
    overflow_count: Math.max(0, artifacts.length - MAX_TEAM_ARTIFACT_OVERFLOW),
  });
}
//@ chunk-byepptkv.js:3639-3771 placement
/**
 * 生成使用项目设置中技能/命令时的归因字段：是否是通过团队提示发现的。
 */
function getTeamTipAttribution(source, skillName) {
  if (source !== "projectSettings") return {};
  return {
    via_team_tip: (getCurrentProjectConfig().seenTeamArtifactPaths ?? []).some(
      (seenPath) => parseTeamArtifactPath(seenPath)?.name === skillName,
    ),
  };
}
//@ chunk-byepptkv.js:3771-4071 placement
/**
 * 生成"团队新增"提示：列出队友新增的若干技能/命令（/名 (作者)），超出部分写"plus N more"。
 */
function formatTeamArtifactTip(artifacts) {
  let filtered = artifacts.filter((artifact) => !artifact.byCurrentUser);
  if (filtered.length === 0) return "";
  let sliced = filtered.slice(0, MAX_TEAM_ARTIFACT_OVERFLOW);
  let mapped = sliced.map((artifact) => `/${artifact.name} (${artifact.author || "a teammate"})`);
  let joined = mapped.length === 1 ? mapped[0] : `${mapped.slice(0, -1).join(", ")} and ${mapped.at(-1)}`;
  let remainingCount = filtered.length - sliced.length;
  return `New from your team: ${joined}${remainingCount > 0 ? `, plus ${remainingCount} more` : ""}`;
}
export {
  listUnseenTeamArtifacts,
  logTeamArtifactTipShown,
  markTeamArtifactsSeen,
  formatTeamArtifactTip,
  hasUnseenTeamArtifacts,
  getTeamTipAttribution,
  getTeammateAuthor,
};

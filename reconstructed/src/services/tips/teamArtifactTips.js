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
import { IMe, Yg } from "../../remote/remoteMode.js";
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
var L = [".claude/skills", ".claude/commands"],
  C = 3,
  _ = 100;
/**
 * 解析 .claude/ 下的团队产物路径：skills/<名>/SKILL.md 为技能，commands/…/*.md（或 …/skill.md）为命令（子目录用冒号连接）；其他返回 null。
 */
//@ chunk-vjr65ep9.js:558-981 placement
function parseTeamArtifactPath(n) {
  let parts = n.split("/");
  if (parts[0] !== ".claude" || parts.length < 3) return null;
  switch (parts[1]) {
    case "skills":
      if (parts.length === 4 && parts[3] === "SKILL.md") return { kind: "skill", name: parts[2] };
      return null;
    case "commands": {
      let at = parts.at(-1);
      if (!at.endsWith(".md")) return null;
      if (/^skill\.md$/i.test(at))
        return parts.length < 4 ? null : { kind: "command", name: parts.slice(2, -1).join(":") };
      return { kind: "command", name: parts.slice(2).join(":").slice(0, -3) };
    }
    default:
      return null;
  }
}
//@ chunk-vjr65ep9.js:981-2549 placement
class TeamArtifactScanner {
  inFlight = void 0;
  resolved = void 0;
  get(n) {
    return ((this.inFlight ??= this.scan(n)), this.inFlight);
  }
  teammateAuthorOf(n) {
    return this.resolved?.find((e) => !e.byCurrentUser && e.name === n)?.author || null;
  }
  async scan(n) {
    if (!checkHasTrustDialogAccepted()) return [];
    let e = IMe(getCwd(), getOriginalCwd()),
      i = findGitRoot(e);
    if (!i) return [];
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
          ...L,
        ],
        { cwd: i, timeout: 5000 },
      ),
      Yg(e, getGitEmail),
    ]);
    if (m !== 0) return [];
    let c = s?.toLowerCase(),
      l = [],
      A = new Set(),
      u = "",
      h = "";
    for (let r of o.split(`
`)) {
      if (r.startsWith("COMMIT\x00")) {
        let parts = r.split("\x00");
        ((u = parts[1] ?? ""), (h = (parts[2] ?? "").toLowerCase()));
        continue;
      }
      if (!r || A.has(r)) continue;
      A.add(r);
      let d = parseTeamArtifactPath(r);
      if (d) {
        let f = Boolean(c && h === c);
        l.push({ path: r, author: u, byCurrentUser: f, ...d });
      }
    }
    this.resolved = l;
    let k = getCurrentProjectConfig(),
      E = new Set(k.seenTeamArtifactPaths ?? []),
      any = l.some((r) => !r.byCurrentUser && !E.has(r.path)),
      U = new Set(k.loggedAuthoredArtifactPaths ?? []),
      filtered = l.filter((r) => r.byCurrentUser && !U.has(r.path));
    for (let r of filtered) logEvent("tengu_skill_authored", { is_skill: r.kind === "skill" });
    try {
      await saveCurrentProjectConfig((r) => {
        let d = r.hasUnseenTeamArtifacts === any;
        if (filtered.length === 0 && d) return r;
        let f = d ? r : { ...r, hasUnseenTeamArtifacts: any };
        if (filtered.length === 0) return f;
        let j = f.loggedAuthoredArtifactPaths ?? [],
          mapped = filtered.map((T) => T.path),
          B = new Set(mapped),
          sliced = [...j.filter((T) => !B.has(T)), ...mapped].slice(-_);
        return { ...f, loggedAuthoredArtifactPaths: sliced };
      }, n);
    } catch (error) {
      logForDebugging(`team-artifact eligibility persist failed: ${error}`);
    }
    return l;
  }
}
//@ chunk-vjr65ep9.js:2549-2573 placement
var b = new SessionRootSlot(() => new TeamArtifactScanner());
//@ chunk-vjr65ep9.js:2573-2611 placement
function S(n, e) {
  return b.of(n).get(e);
}
/**
 * 团队 artifact 提示开启时，查找项目设置中某技能/命令的队友作者，否则返回 null。
 */
//@ chunk-vjr65ep9.js:2611-2734 placement
function getTeammateAuthor(n, e, i) {
  if (e !== "projectSettings" || !getFeatureValue_CACHED_MAY_BE_STALE("tengu_tussock_oriole", !1))
    return null;
  return b.of(n).teammateAuthorOf(i);
}
/**
 * 判断是否有未看过的团队 artifact（开启一方事件日志时顺便后台刷新列表）。
 */
//@ chunk-vjr65ep9.js:2734-2863 placement
function hasUnseenTeamArtifacts(n, e) {
  if (is1PEventLoggingEnabled()) S(n, e).catch(() => {});
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_tussock_oriole", !1)) return !1;
  return getCurrentProjectConfig().hasUnseenTeamArtifacts === !0;
}
/**
 * 列出不是当前用户创建且尚未看过的团队技能/命令。
 */
//@ chunk-vjr65ep9.js:2863-3032 placement
async function listUnseenTeamArtifacts(n, e) {
  let i = await S(n, e);
  if (i.length === 0) return [];
  let o = new Set(getCurrentProjectConfig().seenTeamArtifactPaths ?? []);
  return i.filter((m) => !m.byCurrentUser && !o.has(m.path));
}
/**
 * 把队友新增的技能/命令路径记为已看过（保留最近若干条）并清除"有未看团队产物"标记，无变化时不写配置。
 */
//@ chunk-vjr65ep9.js:3032-3389 placement
async function markTeamArtifactsSeen(n, e) {
  let mapped = (await S(n, e)).filter((s) => !s.byCurrentUser).map((s) => s.path),
    m = new Set(mapped);
  await saveCurrentProjectConfig((s) => {
    let c = s.seenTeamArtifactPaths ?? [],
      sliced = [...c.filter((u) => !m.has(u)), ...mapped].slice(-_);
    if (sliced.length === c.length && sliced.every((u, h) => u === c[h]) && s.hasUnseenTeamArtifacts === !1)
      return s;
    return { ...s, seenTeamArtifactPaths: sliced, hasUnseenTeamArtifacts: !1 };
  }, e);
}
/**
 * 团队 artifact 提示展示时打点（技能、命令数量与超出显示的数量）。
 */
//@ chunk-vjr65ep9.js:3389-3606 placement
function logTeamArtifactTipShown(n) {
  let e = { skill: 0, command: 0 };
  for (let i of n) e[i.kind]++;
  (logFeatureOk("tips_team_artifact_show"),
    logEvent("tengu_team_artifact_tip_shown", {
      skill_count: e.skill,
      command_count: e.command,
      overflow_count: Math.max(0, n.length - C),
    }));
}
/**
 * 生成使用项目设置中技能/命令时的归因字段：是否是通过团队提示发现的。
 */
//@ chunk-vjr65ep9.js:3606-3738 placement
function getTeamTipAttribution(n, e) {
  if (n !== "projectSettings") return {};
  return {
    via_team_tip: (getCurrentProjectConfig().seenTeamArtifactPaths ?? []).some(
      (o) => parseTeamArtifactPath(o)?.name === e,
    ),
  };
}
/**
 * 生成"团队新增"提示：列出队友新增的若干技能/命令（/名 (作者)），超出部分写"plus N more"。
 */
//@ chunk-vjr65ep9.js:3738-4038 placement
function formatTeamArtifactTip(n) {
  let filtered = n.filter((c) => !c.byCurrentUser);
  if (filtered.length === 0) return "";
  let sliced = filtered.slice(0, C),
    mapped = sliced.map((c) => `/${c.name} (${c.author || "a teammate"})`),
    m = mapped.length === 1 ? mapped[0] : `${mapped.slice(0, -1).join(", ")} and ${mapped.at(-1)}`,
    s = filtered.length - sliced.length;
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

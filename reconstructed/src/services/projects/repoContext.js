/**
 * services/projects/repoContext.ts
 *
 * 2.1.316 新增：仓库上下文
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz3q485w.js (13)
 * attribution: placement 13
 */
import { resolve, relative, sep, isAbsolute, join, join as join_2 } from "path";
import { fetchEnvironmentsAndPools } from "../../utils/teleport/selfHostedPool.js";
import { ChannelApiError } from "./channelApi.js";
import { printableName, stripAnsiAndControls } from "../../utils/printableName.js";
import { tPe, isSelfHostedPool } from "../../utils/teleport/environmentSelection.js";
import { Lcr } from "../../utils/github/anthropicRepos.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { gitExe, getBranch } from "../../utils/git.js";
import { freeze } from "../../utils/git/gitSafeEnv.js";
import {
  getRemoteUrlForDir,
  resolveGitDir,
  getCommonDir,
  rawPointerPathIsUnsafe,
} from "../../utils/git/gitFilesystem.js";
import { parseGitRemote } from "../../utils/detectRepository.js";
import { isGithubDotCom } from "../../utils/git/githubUrl.js";
import { checkGithubAppInstalled } from "../../utils/background/remote/preconditions.js";
import { samePath } from "../../utils/file.js";
import { getWorktreePaths } from "../../utils/getWorktreePaths.js";
import { cl } from "../../utils/pathClassification.js";
import { yl, isOnForeignMount } from "../../utils/networkPaths.js";

/**
 * 选出默认云环境：优先当前选中的非 bridge 环境，否则取第一个可用的非 bridge 环境；列出环境失败时抛错。
 */
//@ chunk-dz3q485w.js:12729-13096 placement
async function defaultCloudEnvironment(e, n) {
  let s = await fetchEnvironmentsAndPools(e, n);
  if (s.environmentsError !== null)
    throw new ChannelApiError(
      "list your cloud environments",
      null,
      printableName(s.environmentsError, 200),
      "request_failed",
    );
  let r = (l) => l.kind !== "bridge",
    a =
      s.selectedTarget !== null && r(s.selectedTarget)
        ? s.selectedTarget
        : (tPe(s.availableTargets, r) ?? null);
  if (a === null) return null;
  return { id: isSelfHostedPool(a), name: printableName(a.name, 60), kind: a.kind };
}
//@ chunk-dz3q485w.js:13096-13184 placement
function qOr(e, n) {
  return e.kind === "github" && (!bsn(e) || Lcr(n)) ? `${e.owner}/${e.name}` : "";
}
//@ chunk-dz3q485w.js:13184-13209 placement
function bsn(e) {
  return !1;
}
//@ chunk-dz3q485w.js:13209-13465 placement
var DOC_NAME_REGEX =
    /^(readme(\.[a-z]+)?|claude\.md|agents\.md|plan\.md|todo\.md|roadmap\.md|design\.md|notes\.md|spec\.md|architecture\.md|changelog\.md|docs|doc|design|notes|specs|rfcs?)$/i,
  MAX_TOP_LEVEL_ENTRIES = 60,
  GITHUB_OWNER_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,38})$/,
  GITHUB_REPO_REGEX = /^[A-Za-z0-9._-]{1,100}$/;
//@ chunk-dz3q485w.js:13465-13498 placement
function Io(e) {
  return GITHUB_OWNER_REGEX.test(e);
}
//@ chunk-dz3q485w.js:13498-13550 placement
function Ao(e) {
  return GITHUB_REPO_REGEX.test(e) && e !== "." && e !== "..";
}
//@ chunk-dz3q485w.js:13550-13604 placement
function Yt(e, n) {
  return `https://github.com/${e}/${n}`;
}
//@ chunk-dz3q485w.js:13604-13788 placement
async function hasUnpushedCommits(e) {
  let n = await execFileNoThrowWithCwd(
    gitExe(),
    [...freeze, "rev-list", "--max-count=1", "HEAD", "--not", "--remotes=origin"],
    { cwd: e, preserveOutputOnError: !1 },
  );
  return n.code === 0 && n.stdout.trim() !== "";
}
/**
 * 解析目录的仓库事实：非 git、origin 非 GitHub，或 GitHub 仓库（分支、owner/name，需要时检查访问权限），并给出是否有 origin。
 */
//@ chunk-dz3q485w.js:13788-14193 placement
async function resolveRepoFact(e, n, s) {
  if (e === null) return { repo: { kind: "no-git" }, hasOrigin: !1 };
  let [r, a] = await Promise.all([getBranch(e), getRemoteUrlForDir(e)]),
    l = stripAnsiAndControls(r),
    c = a !== null,
    h = a === null ? null : parseGitRemote(a);
  if (h === null || !isGithubDotCom(h.host) || !Io(h.owner) || !Ao(h.name))
    return { repo: { kind: "no-github-remote", branch: l, hasOrigin: c }, hasOrigin: c };
  return {
    repo: {
      kind: "github",
      branch: l,
      owner: h.owner,
      name: h.name,
      access: n ? await checkGithubRepoAccess(h.owner, h.name, s) : null,
    },
    hasOrigin: c,
  };
}
/**
 * 检查 GitHub 仓库的访问情况：是否可访问、是否安装了 App、默认分支、是否暂时无法判断、GitHub 是否未关联。
 */
//@ chunk-dz3q485w.js:14193-14476 placement
async function checkGithubRepoAccess(e, n, s) {
  let r = await checkGithubAppInstalled(e, n, s);
  return {
    accessible: r.linkedAccountAccess === "ok" || r.defaultBranch !== null || r.appInstalled,
    appInstalled: r.appInstalled,
    defaultBranch: r.defaultBranch,
    transient: r.transient,
    githubNotConnected: r.linkedAccountAccess === "github_not_connected",
  };
}
//@ chunk-dz3q485w.js:14476-14516 placement
function we(e, n) {
  return samePath(resolve(e), resolve(n));
}
//@ chunk-dz3q485w.js:14516-14765 placement
function isSameRepoPath(e, n, s) {
  if (we(e, n)) return !0;
  let r = (c) => {
      let h = relative(resolve(c), resolve(n));
      return h === "" || (h !== ".." && !h.startsWith(".." + sep) && !isAbsolute(h));
    },
    a = s.filter(r).sort((c, h) => h.length - c.length)[0];
  if (a === void 0) return !1;
  let l = relative(a, n);
  return s.some((c) => we(join(c, l), e));
}
/**
 * 列出与当前仓库属于同一 git 公共目录的工作树路径（排除不安全或无法解析的路径）。
 */
//@ chunk-dz3q485w.js:14765-15117 placement
async function sameRepoWorktrees(e) {
  let n = await getWorktreePaths(e),
    s = await resolveGitDir(e),
    r = s === null ? null : ((await getCommonDir(s)) ?? s),
    results = await Promise.all(
      n.map(async (l) => {
        if (!isAbsolute(l) || cl(l)) return !1;
        if (we(l, e)) return !0;
        if (r === null || yl(l) || isOnForeignMount(l, e) || rawPointerPathIsUnsafe(l, e)) return !1;
        let c = await resolveGitDir(l).catch(() => null);
        if (c === null) return !1;
        let h = (await getCommonDir(c).catch(() => null)) ?? c;
        return we(h, r);
      }),
    );
  return n.filter((l, c) => results[c]);
}

export {
  sameRepoWorktrees,
  isSameRepoPath,
  bsn,
  qOr,
  defaultCloudEnvironment,
  checkGithubRepoAccess,
  DOC_NAME_REGEX,
  MAX_TOP_LEVEL_ENTRIES,
  resolveRepoFact,
  hasUnpushedCommits,
  Yt,
};

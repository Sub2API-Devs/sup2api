/**
 * bridge/gitSessionContext.ts
 *
 * 2.1.316 新增。构造会话的 git 上下文（来源仓库、分支）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sn0v73kq.js (2)
 * attribution: placement 2
 */
import { GITHUB_HOST } from "../utils/git/githubUrl.js";

//@ chunk-sn0v73kq.js:227-476 placement
async function parseGitSourceRepository(s) {
  let { isNestedGitLabProject, parseGitRemote, parseGitHubRepository } = await import("./chunk-zqrznfbt.js");
  let gitRemote = parseGitRemote(s);
  if (gitRemote) return isNestedGitLabProject(gitRemote) ? null : gitRemote;
  let gitHubRepository = parseGitHubRepository(s);
  if (gitHubRepository) {
    let [o, n] = gitHubRepository.split("/");
    if (o && n)
      return {
        host: GITHUB_HOST,
        owner: o,
        name: n,
      };
  }
  return null;
}
//@ chunk-sn0v73kq.js:476-1566 placement
/**
 * 构造会话的 git 上下文（来源仓库、分支）。
 */
async function buildGitSessionContext(gitRepoUrl, branch, defaultBranch) {
  let report = {
    revisionGuessUsed: false,
  };
  if (!gitRepoUrl)
    return {
      sources: [],
      outcomes: [],
      report,
    };
  let { getDefaultBranch } = await import("./chunk-rqvep8jc.js");
  if (branch === "HEAD") branch = "";
  let revisionGuessUsed = false;
  let o = branch || defaultBranch || undefined;
  if (!o) {
    o = (await getDefaultBranch()) || undefined;
    revisionGuessUsed = o !== undefined;
  }
  let n = branch && defaultBranch && branch !== defaultBranch ? [branch] : [];
  let branchDropped;
  let warnMessage;
  if (branch && n.length === 0) {
    branchDropped = defaultBranch ? "is_default" : "no_evidence";
    warnMessage = defaultBranch
      ? `[bridge] requested branch '${branch}' is the default branch \u2014 ` +
        "omitted from outcomes.branches (the runner stays on the clone)"
      : "[bridge] no session-anchored default-branch evidence \u2014 " +
        `omitting requested branch '${branch}' from outcomes.branches; the remote session will work on a generated branch instead. Run 'git remote set-head origin -a' in the repo (or supply defaultBranch via the SDK) to restore branch continuity.`;
  }
  let report_2 = {
    branchDropped,
    revisionGuessUsed,
    warnMessage,
  };
  let l = (host, owner, name) => ({
    report: report_2,
    sources: [
      {
        type: "git_repository",
        url: `https://${host}/${owner}/${name}`,
        revision: o,
      },
    ],
    outcomes: [
      {
        type: "git_repository",
        git_info: {
          type: "github",
          repo: `${owner}/${name}`,
          branches: n,
        },
      },
    ],
  });
  let gitSourceRepository = await parseGitSourceRepository(gitRepoUrl);
  if (gitSourceRepository)
    return l(gitSourceRepository.host, gitSourceRepository.owner, gitSourceRepository.name);
  return {
    sources: [],
    outcomes: [],
    report,
  };
}
export { buildGitSessionContext, parseGitSourceRepository };

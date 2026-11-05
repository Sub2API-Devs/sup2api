/**
 * bridge/gitSessionContext.ts
 *
 * 2.1.316 新增。构造会话的 git 上下文（来源仓库、分支）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ahbsrpnq.js (2)
 * attribution: placement 2
 */
import { GITHUB_HOST } from "../utils/git/githubUrl.js";

//@ chunk-ahbsrpnq.js:227-476 placement
async function parseGitSourceRepository(url) {
  let { isNestedGitLabProject, parseGitRemote, parseGitHubRepository } =
    await import("../utils/detectRepository.js");
  let gitRemote = parseGitRemote(url);
  if (gitRemote) return isNestedGitLabProject(gitRemote) ? null : gitRemote;
  let gitHubRepository = parseGitHubRepository(url);
  if (gitHubRepository) {
    let [owner, name] = gitHubRepository.split("/");
    if (owner && name)
      return {
        host: GITHUB_HOST,
        owner,
        name,
      };
  }
  return null;
}
//@ chunk-ahbsrpnq.js:476-1566 placement
/**
 * 构造会话的 git 上下文（来源仓库、分支）。
 */
async function buildGitSessionContext(url, branch, defaultBranch) {
  let report = {
    revisionGuessUsed: false,
  };
  if (!url)
    return {
      sources: [],
      outcomes: [],
      report,
    };
  let { getDefaultBranch } = await import("../utils/git.js");
  if (branch === "HEAD") branch = "";
  let revisionGuessUsed = false;
  let revision = branch || defaultBranch || undefined;
  if (!revision) {
    revision = (await getDefaultBranch()) || undefined;
    revisionGuessUsed = revision !== undefined;
  }
  let branches = branch && defaultBranch && branch !== defaultBranch ? [branch] : [];
  let branchDropped;
  let warnMessage;
  if (branch && branches.length === 0) {
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
  let buildResult = (host, owner, name) => ({
    report: report_2,
    sources: [
      {
        type: "git_repository",
        url: `https://${host}/${owner}/${name}`,
        revision,
      },
    ],
    outcomes: [
      {
        type: "git_repository",
        git_info: {
          type: "github",
          repo: `${owner}/${name}`,
          branches,
        },
      },
    ],
  });
  let gitSourceRepository = await parseGitSourceRepository(url);
  if (gitSourceRepository)
    return buildResult(gitSourceRepository.host, gitSourceRepository.owner, gitSourceRepository.name);
  return {
    sources: [],
    outcomes: [],
    report,
  };
}
export { parseGitSourceRepository, buildGitSessionContext };

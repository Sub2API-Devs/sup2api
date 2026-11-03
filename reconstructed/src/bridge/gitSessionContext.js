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
  let {
      isNestedGitLabProject: isNestedGitLabProject,
      parseGitRemote: parseGitRemote,
      parseGitHubRepository: parseGitHubRepository,
    } = await import("./chunk-zqrznfbt.js"),
    r = parseGitRemote(s);
  if (r) return isNestedGitLabProject(r) ? null : r;
  let i = parseGitHubRepository(s);
  if (i) {
    let [o, n] = i.split("/");
    if (o && n) return { host: GITHUB_HOST, owner: o, name: n };
  }
  return null;
}
/**
 * 构造会话的 git 上下文（来源仓库、分支）。
 */
//@ chunk-sn0v73kq.js:476-1566 placement
async function buildGitSessionContext(s, e, t) {
  let u = { revisionGuessUsed: !1 };
  if (!s) return { sources: [], outcomes: [], report: u };
  let { getDefaultBranch: getDefaultBranch } = await import("./chunk-rqvep8jc.js");
  if (e === "HEAD") e = "";
  let i = !1,
    o = e || t || void 0;
  if (!o) ((o = (await getDefaultBranch()) || void 0), (i = o !== void 0));
  let n = e && t && e !== t ? [e] : [],
    c,
    a;
  if (e && n.length === 0)
    ((c = t ? "is_default" : "no_evidence"),
      (a = t
        ? `[bridge] requested branch '${e}' is the default branch \u2014 ` +
          "omitted from outcomes.branches (the runner stays on the clone)"
        : "[bridge] no session-anchored default-branch evidence \u2014 " +
          `omitting requested branch '${e}' from outcomes.branches; the remote session will work on a generated branch instead. Run 'git remote set-head origin -a' in the repo (or supply defaultBranch via the SDK) to restore branch continuity.`));
  let g = { branchDropped: c, revisionGuessUsed: i, warnMessage: a },
    l = (y, d, m) => ({
      report: g,
      sources: [{ type: "git_repository", url: `https://${y}/${d}/${m}`, revision: o }],
      outcomes: [{ type: "git_repository", git_info: { type: "github", repo: `${d}/${m}`, branches: n } }],
    }),
    p = await parseGitSourceRepository(s);
  if (p) return l(p.host, p.owner, p.name);
  return { sources: [], outcomes: [], report: u };
}

export { buildGitSessionContext, parseGitSourceRepository };

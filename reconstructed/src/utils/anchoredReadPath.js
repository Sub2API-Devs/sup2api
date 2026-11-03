/**
 * utils/anchoredReadPath.ts
 *
 * 2.1.316 新增：锚定读路径解析。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qa2d1m12.js (3)
 * attribution: placement 3
 */
import { isAbsolute } from "path";
import { PathAnchorSchema } from "../entrypoints/sdk/controlSchemas.js";
import { getProjectRootOrNull } from "../bootstrap/state.js";
import { getWorkspaceDiffRoot } from "./workspaceDiff.js";
import { expandPath } from "./path.js";
import { isSubpathOf } from "./pathPrefix.js";
import { getDeclaredRepoCheckouts } from "./git/repoCheckouts.js";
import { parseRepoSlug } from "./detectRepository.js";
import { getRemoteUrlForDir } from "./git/gitFilesystem.js";

//@ chunk-qa2d1m12.js:5810-6226 placement
async function resolveAnchoredReadPath(o, e) {
  let t = PathAnchorSchema().safeParse(e);
  if (!t.success) return null;
  let r;
  switch (t.data.kind) {
    case "workspace_root":
      r = getProjectRootOrNull();
      break;
    case "diff_root": {
      let workspaceDiffRoot = await getWorkspaceDiffRoot();
      r = workspaceDiffRoot === null || workspaceDiffRoot.followsShell ? null : workspaceDiffRoot.root;
      break;
    }
    case "repo":
      r = await resolveRepoSlugRoot(t.data.repo);
      break;
    case "as_written":
      return null;
  }
  if (r === null || !isAbsolute(r) || /^~(?:\/|$)/.test(o.trim())) return null;
  let n = expandPath(r);
  let i = expandPath(o, n);
  return isSubpathOf(n, i, false)
    ? {
        absPath: i,
        kind: t.data.kind,
      }
    : null;
}
//@ chunk-qa2d1m12.js:6226-6533 placement
/**
 * 把 owner/name 形式的仓库标识解析为本地检出目录：先查声明的仓库检出，再看当前仓库的远程地址是否匹配。
 */
async function resolveRepoSlugRoot(repo) {
  if (!/^[\w.-]{1,100}\/[\w.-]{1,100}$/.test(repo)) return null;
  let index = repo.indexOf("/");
  let t = {
    owner: repo.slice(0, index),
    name: repo.slice(index + 1),
  };
  for (let [i, s] of getDeclaredRepoCheckouts()) if (sameRepoSlug(parseRepoSlug(i), t)) return s;
  let root = (await getWorkspaceDiffRoot())?.root;
  if (root === undefined) return null;
  let remoteUrlForDir = await getRemoteUrlForDir(root);
  return remoteUrlForDir !== null &&
    remoteUrlForDir.length <= 2048 &&
    sameRepoSlug(parseRepoSlug(remoteUrlForDir), t)
    ? root
    : null;
}
//@ chunk-qa2d1m12.js:6533-6657 placement
function sameRepoSlug(repoSlug, e) {
  return (
    repoSlug !== null &&
    repoSlug.owner.toLowerCase() === e.owner.toLowerCase() &&
    repoSlug.name.toLowerCase() === e.name.toLowerCase()
  );
}

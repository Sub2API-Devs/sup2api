/**
 * utils/anchoredReadPath.ts
 *
 * 2.1.316 新增：锚定读路径解析。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zd9jtaaf.js (3)
 * attribution: placement 3
 */
import { isAbsolute } from "path";
import { PathAnchorSchema } from "../entrypoints/sdk/controlSchemas.js";
import { getProjectRootOrNull } from "../bootstrap/state.js";
import { getWorkspaceDiffRoot } from "./workspaceDiff.js";
import { planEmptyRepoDiff } from "../bridge/workspaceDiff.js";
import { expandPath } from "./path.js";
import { isSubpathOf } from "./pathPrefix.js";
import { getDeclaredRepoCheckouts } from "./git/repoCheckouts.js";
import { parseRepoSlug } from "./detectRepository.js";
import { getRemoteUrlForDir } from "./git/gitFilesystem.js";

//@ chunk-zd9jtaaf.js:6486-6914 placement
async function resolveAnchoredReadPath(path, anchor) {
  let anchorParse = PathAnchorSchema().safeParse(anchor);
  if (!anchorParse.success) return null;
  let anchorRoot;
  switch (anchorParse.data.kind) {
    case "workspace_root":
      anchorRoot = getProjectRootOrNull();
      break;
    case "diff_root": {
      let workspaceDiffRoot = await getWorkspaceDiffRoot();
      anchorRoot =
        workspaceDiffRoot === null
          ? planEmptyRepoDiff().listed
          : workspaceDiffRoot.followsShell
            ? null
            : workspaceDiffRoot.root;
      break;
    }
    case "repo":
      anchorRoot = await resolveRepoSlugRoot(anchorParse.data.repo);
      break;
    case "as_written":
      return null;
  }
  if (anchorRoot === null || !isAbsolute(anchorRoot) || /^~(?:\/|$)/.test(path.trim())) return null;
  let rootPath = expandPath(anchorRoot);
  let absPath = expandPath(path, rootPath);
  return isSubpathOf(rootPath, absPath, false)
    ? {
        absPath,
        kind: anchorParse.data.kind,
      }
    : null;
}
//@ chunk-zd9jtaaf.js:6914-7221 placement
/**
 * 把 owner/name 形式的仓库标识解析为本地检出目录：先查声明的仓库检出，再看当前仓库的远程地址是否匹配。
 */
async function resolveRepoSlugRoot(repo) {
  if (!/^[\w.-]{1,100}\/[\w.-]{1,100}$/.test(repo)) return null;
  let index = repo.indexOf("/");
  let repoSlug = {
    owner: repo.slice(0, index),
    name: repo.slice(index + 1),
  };
  for (let [checkoutSlug, checkoutPath] of getDeclaredRepoCheckouts())
    if (sameRepoSlug(parseRepoSlug(checkoutSlug), repoSlug)) return checkoutPath;
  let root = (await getWorkspaceDiffRoot())?.root;
  if (root === undefined) return null;
  let remoteUrlForDir = await getRemoteUrlForDir(root);
  return remoteUrlForDir !== null &&
    remoteUrlForDir.length <= 2048 &&
    sameRepoSlug(parseRepoSlug(remoteUrlForDir), repoSlug)
    ? root
    : null;
}
//@ chunk-zd9jtaaf.js:7221-7345 placement
function sameRepoSlug(repoSlug, expectedSlug) {
  return (
    repoSlug !== null &&
    repoSlug.owner.toLowerCase() === expectedSlug.owner.toLowerCase() &&
    repoSlug.name.toLowerCase() === expectedSlug.name.toLowerCase()
  );
}
export { resolveAnchoredReadPath };

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
import { Ils } from "../entrypoints/sdk/controlSchemas.js";
import { getProjectRootOrNull } from "../bootstrap/state.js";
import { getWorkspaceDiffRoot } from "./workspaceDiff.js";
import { expandPath } from "./path.js";
import { hm } from "./pathPrefix.js";
import { getDeclaredRepoCheckouts } from "./git/repoCheckouts.js";
import { parseRepoSlug } from "./detectRepository.js";
import { getRemoteUrlForDir } from "./git/gitFilesystem.js";

//@ chunk-qa2d1m12.js:5810-6226 placement
async function resolveAnchoredReadPath(o, e) {
  let safeParse = Ils().safeParse(e);
  if (!safeParse.success) return null;
  let r;
  switch (safeParse.data.kind) {
    case "workspace_root":
      r = getProjectRootOrNull();
      break;
    case "diff_root": {
      let s = await getWorkspaceDiffRoot();
      r = s === null || s.followsShell ? null : s.root;
      break;
    }
    case "repo":
      r = await resolveRepoSlugRoot(safeParse.data.repo);
      break;
    case "as_written":
      return null;
  }
  if (r === null || !isAbsolute(r) || /^~(?:\/|$)/.test(o.trim())) return null;
  let n = expandPath(r),
    i = expandPath(o, n);
  return hm(n, i, !1) ? { absPath: i, kind: safeParse.data.kind } : null;
}
/**
 * 把 owner/name 形式的仓库标识解析为本地检出目录：先查声明的仓库检出，再看当前仓库的远程地址是否匹配。
 */
//@ chunk-qa2d1m12.js:6226-6533 placement
async function resolveRepoSlugRoot(o) {
  if (!/^[\w.-]{1,100}\/[\w.-]{1,100}$/.test(o)) return null;
  let index = o.indexOf("/"),
    t = { owner: o.slice(0, index), name: o.slice(index + 1) };
  for (let [i, s] of getDeclaredRepoCheckouts()) if (sameRepoSlug(parseRepoSlug(i), t)) return s;
  let r = (await getWorkspaceDiffRoot())?.root;
  if (r === void 0) return null;
  let n = await getRemoteUrlForDir(r);
  return n !== null && n.length <= 2048 && sameRepoSlug(parseRepoSlug(n), t) ? r : null;
}
//@ chunk-qa2d1m12.js:6533-6657 placement
function sameRepoSlug(o, e) {
  return (
    o !== null &&
    o.owner.toLowerCase() === e.owner.toLowerCase() &&
    o.name.toLowerCase() === e.name.toLowerCase()
  );
}

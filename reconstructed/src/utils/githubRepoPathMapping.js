/**
 * utils/githubRepoPathMapping.ts
 *
 * 记录 GitHub 仓库 → 本地检出路径映射（全局配置），用于 teleport 等找到本地仓库
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/githubRepoPathMapping.ts
 * pieces: chunk-md1x7k3r.js (5)
 * attribution: fingerprint 3, file-local 2
 */
import { realpath } from "fs/promises";
import { detectCurrentRepository, parseGitHubRepository } from "./detectRepository.js";
import { logForDebugging } from "./debug.js";
import { getOriginalCwd } from "../bootstrap/state.js";
import { findGitRoot } from "./git.js";
import { Mn } from "./pathClassification.js";
import { getGlobalConfig, saveGlobalConfig } from "./config.js";
import { pathExists } from "./fsSafety/atomicWriteStaging.js";
import { getRemoteUrlForDir } from "./git/gitFilesystem.js";

//@ chunk-md1x7k3r.js:493-997 fingerprint = updateGithubRepoPathMapping (0.935)
async function updateGithubRepoPathMapping(r) {
  try {
    let repo = await detectCurrentRepository();
    if (!repo) {
      logForDebugging("Not in a GitHub repository, skipping path mapping update");
      return;
    }
    let cwd = getOriginalCwd(),
      s = findGitRoot(cwd) ?? cwd,
      currentPath;
    try {
      currentPath = Mn(await realpath(s));
    } catch {
      currentPath = s;
    }
    let repoKey = repo.toLowerCase(),
      p = getGlobalConfig().githubRepoPaths?.[repoKey] ?? [];
    if (p[0] === currentPath) {
      logForDebugging(`Path ${currentPath} already tracked for repo ${repoKey}`);
      return;
    }
    let withoutCurrent = p.filter((c) => c !== currentPath),
      updatedPaths = [currentPath, ...withoutCurrent];
    (await saveGlobalConfig(
      (current) => ({ ...current, githubRepoPaths: { ...current.githubRepoPaths, [repoKey]: updatedPaths } }),
      r,
    ),
      logForDebugging(`Added ${currentPath} to tracked paths for repo ${repoKey}`));
  } catch (error) {
    logForDebugging(`Error updating repo path mapping: ${error}`);
  }
}
//@ chunk-md1x7k3r.js:997-1076 fingerprint = getKnownPathsForRepo (1)
function getKnownPathsForRepo(repo) {
  let config = getGlobalConfig(),
    repoKey = repo.toLowerCase();
  return config.githubRepoPaths?.[repoKey] ?? [];
}
//@ chunk-md1x7k3r.js:1076-1162 file-local
async function filterExistingPaths(paths) {
  let results = await Promise.all(paths.map(pathExists));
  return paths.filter((e, n) => results[n]);
}
//@ chunk-md1x7k3r.js:1162-1309 file-local
async function validateRepoAtPath(path, expectedRepo) {
  try {
    let remoteUrl = await getRemoteUrlForDir(path);
    if (!remoteUrl) return !1;
    let actualRepo = parseGitHubRepository(remoteUrl);
    if (!actualRepo) return !1;
    return actualRepo.toLowerCase() === expectedRepo.toLowerCase();
  } catch {
    return !1;
  }
}
//@ chunk-md1x7k3r.js:1309-1598 fingerprint = removePathFromRepo (1)
function removePathFromRepo(r, o, e) {
  let config = getGlobalConfig(),
    repoKey = r.toLowerCase(),
    existingPaths = config.githubRepoPaths?.[repoKey] ?? [],
    updatedPaths = existingPaths.filter((path) => path !== o);
  if (updatedPaths.length === existingPaths.length) return;
  let updatedMapping = { ...config.githubRepoPaths };
  if (updatedPaths.length === 0) delete updatedMapping[repoKey];
  else updatedMapping[repoKey] = updatedPaths;
  (saveGlobalConfig((current) => ({ ...current, githubRepoPaths: updatedMapping }), e),
    logForDebugging(`Removed ${o} from tracked paths for repo ${repoKey}`));
}

export {
  getKnownPathsForRepo,
  filterExistingPaths,
  updateGithubRepoPathMapping,
  validateRepoAtPath,
  removePathFromRepo,
};

/**
 * utils/worktree/partialClone.ts
 *
 * 2.1.316 新增：部分克隆
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (14)
 * attribution: placement 14
 */
import { join, resolve as resolve_2 } from "path";
import { lstat } from "fs/promises";
import { gitExe } from "../git.js";
import { partialCloneFetchCache, stripProgressLines } from "./worktreeRegistrations.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { GIT_SAFE_GLOBAL_ARGS, GIT_ALLOW_PROTOCOL_VALUE } from "../git/gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { resolveGitDirsOrPlaceholder, NOT_A_GIT_REPO_PATH } from "../git/gitDirResolution.js";
import { readPartialCloneConfig, withSafeGitConfig } from "../git/gitLanes.js";
import { readLinkTextSafe, readBoundedSync, GIT_POINTER_MAX_BYTES } from "../git/gitFilesystem.js";
import { hideUnsafePath, hideUnsafeText } from "../unsafePathGlyphs.js";
import { reconcileSparseCheckout } from "../plugins/marketplaceManager.js";
import { writeSparsePatterns, uploadPackArgForRemote } from "./sparseCheckout.js";
import { logForDebugging } from "../debug.js";
import { SAFE_UPLOAD_PACK_ARG, SAFE_UPLOAD_PACK_ARG_2 } from "../gitSafeExec.js";
import { redactUrlsInMessage } from "../redaction/urlRedaction.js";
import { truncateMiddle as truncateMiddle_2 } from "../../memdir/memoryTool.js";

//@ chunk-e6aww6q8.js:3583881-3584208 placement
/**
 * 检查 git 版本是否不低于 2.36（按 git 可执行文件缓存结果）。
 */
function gitSupportsPartialCloneFetch(cwd) {
  let gitBinary = gitExe();
  let versionPromise = partialCloneFetchCache.get(gitBinary);
  if (versionPromise === undefined) {
    versionPromise = execFileNoThrowWithCwd(gitBinary, [...GIT_SAFE_GLOBAL_ARGS, "--version"], {
      cwd,
      env: getRemoteHostSessionCount(),
      timeout: 1e4,
    }).then(
      (versionResult) => {
        let match = /git version (\d+)\.(\d+)/.exec(versionResult.stdout);
        if (versionResult.code !== 0 || match === null) {
          partialCloneFetchCache.delete(gitBinary);
          return true;
        }
        let [majorVersion, minorVersion] = [Number(match[1]), Number(match[2])];
        return majorVersion > 2 || (majorVersion === 2 && minorVersion >= 36);
      },
      () => {
        partialCloneFetchCache.delete(gitBinary);
        return true;
      },
    );
    partialCloneFetchCache.set(gitBinary, versionPromise);
  }
  return versionPromise;
}
//@ chunk-e6aww6q8.js:3584409-3584489 placement
var MISSING_LIST_SLACK = 2;
var MAX_LISTED_MISSING_BYTES = 67108864;
var MISSING_TOO_MANY_TEXT = "more objects are missing than can be listed";
var MAX_LISTED_MISSING_OBJECTS = 10;
//@ chunk-e6aww6q8.js:3584489-3584547 placement
function isEagerBalloonEnabled() {
  return readFlagWithOverride("tengu_eager_balloon", {
    safe: true,
  });
}
//@ chunk-e6aww6q8.js:3584547-3584581 placement
var NO_PARTIAL_CLONE = {
  inForce: false,
  promisors: [],
};
//@ chunk-e6aww6q8.js:3584581-3584953 placement
/**
 * 检查目录是否是部分克隆：解析 git 目录、判断是否为子模块（找出上层仓库）、读取 promisor 远程顺序。
 */
async function inspectPartialClone(a, b) {
  if (!isEagerBalloonEnabled()) return NO_PARTIAL_CLONE;
  let gitDirsOrPlaceholder = resolveGitDirsOrPlaceholder(a);
  let hasOwnGitDir = gitDirsOrPlaceholder.gitDir !== NOT_A_GIT_REPO_PATH;
  let commonDirFromPointer = await resolveCommonDirFromPointer(a, gitDirsOrPlaceholder.commonDir);
  let ownership = hasOwnGitDir
    ? classifyGitDirOwnership(gitDirsOrPlaceholder)
    : commonDirFromPointer === NOT_A_GIT_REPO_PATH
      ? "other"
      : "pointer";
  let superproject = findSuperproject(commonDirFromPointer, ownership);
  let submoduleFields =
    superproject === null
      ? {}
      : {
          submodule: hasOwnGitDir ? commonDirFromPointer : "",
        };
  let promisors = orderPromisorRemotes(await readPartialCloneConfig(a, gitDirsOrPlaceholder));
  if (promisors.length === 0)
    return {
      inForce: true,
      promisors,
      ...submoduleFields,
    };
  if (!(await b(superproject?.superproject ?? null))) return NO_PARTIAL_CLONE;
  return superproject !== null
    ? {
        inForce: true,
        promisors: [],
        ...submoduleFields,
      }
    : {
        inForce: true,
        promisors,
      };
}
//@ chunk-e6aww6q8.js:3584953-3585179 placement
async function resolveCommonDirFromPointer(a, commonDir) {
  if (commonDir !== NOT_A_GIT_REPO_PATH) return commonDir;
  let gitDirPath = join(a, ".git");
  let gitEntryStats = await lstat(gitDirPath).catch(() => null);
  let pointerTarget = gitEntryStats?.isSymbolicLink()
    ? readLinkTextSafe(gitDirPath)
    : gitEntryStats?.isFile()
      ? /^gitdir:(.*)$/s.exec(readBoundedSync(gitDirPath, GIT_POINTER_MAX_BYTES)?.trim() ?? "")?.[1]
      : null;
  return pointerTarget?.trim() ? resolve_2(a, pointerTarget.trim()) : commonDir;
}
//@ chunk-e6aww6q8.js:3585179-3585290 placement
function classifyGitDirOwnership({ gitDir, workTree }) {
  if (workTree === null || gitDir === NOT_A_GIT_REPO_PATH) return "other";
  return gitDir === join(workTree, ".git") ? "own" : "pointer";
}
//@ chunk-e6aww6q8.js:3585290-3585639 placement
/**
 * 从子模块 git 目录路径推断上层仓库位置。
 */
function findSuperproject(commonDirFromPointer, a) {
  let commonDirSlashed = `${commonDirFromPointer.split(/[\\/]+/).join("/")}/`;
  let match = /^(.*?)\/\.git(?:\/worktrees\/[^/]+)?\/modules\//.exec(commonDirSlashed);
  if (match)
    return {
      superproject: match[1] || "/",
    };
  if (a === "own") return null;
  let match_2 = /^(.*?\/[^/]+\.git)(?:\/worktrees\/[^/]+)?\/modules\//.exec(commonDirSlashed);
  if (match_2)
    return {
      superproject: match_2[1],
    };
  return a === "pointer" && /\/modules\//i.test(commonDirSlashed)
    ? {
        superproject: null,
      }
    : null;
}
//@ chunk-e6aww6q8.js:3585639-3587324 placement
/**
 * 检出时关闭了按需拉取导致失败的说明。
 */
function explainOnDemandFetchOff(a, { submodule: submoduleDir } = {}, baseSha) {
  if (
    !/lazy fetching disabled|could not fetch [0-9a-f]+ from promisor remote|transport '[^']*' not allowed/.test(
      a,
    )
  )
    return "";
  let shortSha = baseSha ? baseSha.slice(0, 12) : "<the base commit>";
  if (submoduleDir !== undefined)
    return `
This checkout ran with git's on-demand fetching switched off, and git needed an object this repository does not have. This repository is a git submodule, and its git folder${submoduleDir ? `, "${hideUnsafePath(submoduleDir)}",` : ' (the folder its ".git" file points to)'} is kept inside the superproject's git folder, where commands running in the Bash sandbox can write. Because any git command run in the submodule follows what that folder holds, Claude Code fetched nothing ahead of time and cannot safely suggest a command to run there; while a sandboxed session that can write there is still running, the folder cannot be trusted at all. Once no such session is running, look through that folder for settings that should not be there \u2014 for example, in "config" (and "config.worktree", if present) a changed remote address, an upload-pack or ssh command, or an include line; a file named "commondir"; scripts in "hooks" that you did not install; or any other setting you did not make \u2014 and remove those. Then fetch the missing objects for commit ${shortSha} in the submodule yourself and try again.`;
  return `
This checkout ran with git's on-demand fetching switched off, and git needed an object this repository does not have. If the repository is a partial clone, run "git archive -o objects.tar ${shortSha}" (git fetches the commit's missing files \u2014 in a sparse checkout, the whole tree's; delete objects.tar afterwards) in its main checkout and try again; otherwise check it with "git fsck".`;
}
//@ chunk-e6aww6q8.js:3587324-3587409 placement
function partialCloneFetchEnv({ inForce }) {
  return inForce
    ? {
        GIT_NO_LAZY_FETCH: "1",
        GIT_ALLOW_PROTOCOL: GIT_ALLOW_PROTOCOL_VALUE,
      }
    : {};
}
//@ chunk-e6aww6q8.js:3587409-3590734 placement
/**
 * 部分克隆仓库缺少对象时的错误说明。
 */
async function explainPartialCloneFailure(
  cwd,
  baseSha,
  { promisors },
  sparseConfig = null,
  maxMinutes = MAX_LISTED_MISSING_OBJECTS,
) {
  let result = (failure, fetches = 0) => ({
    failure,
    fetches,
  });
  if (promisors.length === 0) return result(null);
  let sliced = baseSha.slice(0, 12);
  let fetchableRemotes = [];
  for (let promisor of promisors)
    if (!promisor.startsWith("-") && (await reconcileSparseCheckout(cwd, promisor)))
      fetchableRemotes.push(promisor);
  await using patterns = await writeSparsePatterns(
    cwd,
    typeof sparseConfig === "function" ? await sparseConfig() : sparseConfig,
  );
  let hasFetchable = fetchableRemotes.length > 0;
  let maxFetches = fetchableRemotes.length + MISSING_LIST_SLACK;
  let deadline = Date.now() + maxMinutes * 60000;
  let lastFailure = null;
  for (let fetches = 0, successCount = 0; ;) {
    let missing = await patterns.missing(baseSha);
    if (typeof missing === "string")
      return result(
        missing === MISSING_TOO_MANY_TEXT
          ? `This repository is a partial clone, and commit ${sliced} needs more than about 1.5 million objects it does not have, too many to fetch before checking it out. Limit the worktree with the worktree.sparsePaths setting, or check that commit out once in the main checkout so git fetches them, then try again.`
          : `This repository is a partial clone, and git could not list the objects needed for commit ${sliced} (${missing}), so none were fetched before the checkout. Check the repository with "git fsck" and try again.`,
        fetches,
      );
    if (missing.length === 0) return result(null, fetches);
    if (!hasFetchable)
      return result(
        isSafeRemoteName(promisors[0])
          ? `This repository is a partial clone, but its promisor remote "${promisors[0]}" has no URL in the repository's git config (remote.${promisors[0]}.url is not set), so the ${missing.length === 1 ? "object" : `${missing.length} objects`} needed for commit ${sliced} could not be fetched. Set it with "git config remote.${promisors[0]}.url <url>" and try again.`
          : `This repository is a partial clone, but its promisor remote ${describePromisorRemote(promisors[0])} cannot be fetched from safely (its name begins with "-", which git would read as an option, or it has no URL in the repository's git config), so the ${missing.length === 1 ? "object" : `${missing.length} objects`} needed for commit ${sliced} could not be fetched. Look through the [remote "\u2026"] sections and the extensions.partialclone line in that config, and in any file it includes, for a remote you did not set up; correct or remove it, then try again.`,
      );
    let remainingMs = deadline - Date.now();
    if (fetchableRemotes.length === 0 || fetches === maxFetches || remainingMs <= 0)
      return result(
        lastFailure ??
          `This repository is a partial clone, and its promisor remotes had still not delivered every object needed for commit ${sliced} after ${fetches === 1 ? "1 fetch" : `${fetches} fetches`}${remainingMs <= 0 ? ` and ${maxMinutes} minutes` : ""}. Run "git fetch <remote>" for each promisor remote to see which one is failing, then try again.`,
        fetches,
      );
    let remote = fetchableRemotes[successCount % fetchableRemotes.length];
    logForDebugging(
      `[worktree] partial clone: fetching ${missing.length} missing object(s) for ${sliced} from ${describePromisorRemote(remote)} before materializing`,
    );
    let fetchResult = await execFileNoThrowWithCwd(
      gitExe(),
      [
        ...SAFE_UPLOAD_PACK_ARG,
        "-c",
        "fetch.negotiationAlgorithm=noop",
        "fetch",
        (await uploadPackArgForRemote(cwd, remote)) ?? SAFE_UPLOAD_PACK_ARG_2,
        "--no-tags",
        "--no-write-fetch-head",
        "--recurse-submodules=no",
        "--filter=blob:none",
        "--stdin",
        remote,
      ],
      {
        cwd,
        env: withSafeGitConfig(cwd),
        input: `${missing.join(`
`)}
`,
        timeout: remainingMs,
        withoutControllingTerminal: true,
      },
    );
    fetches++;
    if (fetchResult.code === 0) {
      successCount++;
      continue;
    }
    let fetchError = redactUrlsInMessage(stripProgressLines(fetchResult.stderr));
    logForDebugging(
      `[worktree] explicit fetch from ${describePromisorRemote(remote)} failed: ${fetchError}`,
      {
        level: "warn",
      },
    );
    let fetchHint = fetchResult.timedOut
      ? `The fetches ran out of their shared ${maxMinutes}-minute budget.`
      : `git said: ${truncateMiddle_2(hideUnsafeText(fetchError, "git's error"))}`;
    lastFailure = `This repository is a partial clone, and ${missing.length === 1 ? "an object" : `${missing.length} objects`} needed for commit ${sliced} could not be fetched from its promisor remote ${describePromisorRemote(remote)} before checking it out (Claude Code checks worktrees out with git's on-demand fetching switched off). Check that the remote is reachable (${isSafeRemoteName(remote) ? `for example "git fetch ${remote}"` : 'run "git remote -v" to see which remotes are configured'}) and try again. ${fetchHint}`;
    fetchableRemotes.splice(fetchableRemotes.indexOf(remote), 1);
    fetches--;
  }
}
//@ chunk-e6aww6q8.js:3590734-3590799 placement
function isSafeRemoteName(name) {
  return /^[A-Za-z0-9][A-Za-z0-9._\/@+-]*$/.test(name);
}
//@ chunk-e6aww6q8.js:3590799-3590961 placement
function describePromisorRemote(name) {
  return isSafeRemoteName(name)
    ? `"${name}"`
    : "(name not shown: it does not begin with a letter or digit, or has characters other than letters, digits and . _ / @ + -)";
}
//@ chunk-e6aww6q8.js:3590961-3591085 placement
function orderPromisorRemotes(partialCloneConfig) {
  if (partialCloneConfig === null || partialCloneConfig === undefined) return [];
  let { extension, remotes } = partialCloneConfig;
  return extension === null ? remotes : [...remotes.filter((remote) => remote !== extension), extension];
}
export {
  inspectPartialClone,
  explainPartialCloneFailure,
  partialCloneFetchEnv,
  gitSupportsPartialCloneFetch,
  explainOnDemandFetchOff,
  MISSING_TOO_MANY_TEXT,
  MAX_LISTED_MISSING_BYTES,
};

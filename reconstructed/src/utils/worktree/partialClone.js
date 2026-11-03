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
  let n = gitExe();
  let r = partialCloneFetchCache.get(n);
  if (r === undefined) {
    r = execFileNoThrowWithCwd(n, [...GIT_SAFE_GLOBAL_ARGS, "--version"], {
      cwd,
      env: getRemoteHostSessionCount(),
      timeout: 1e4,
    }).then(
      (s) => {
        let match = /git version (\d+)\.(\d+)/.exec(s.stdout);
        if (s.code !== 0 || match === null) {
          partialCloneFetchCache.delete(n);
          return true;
        }
        let [y, S] = [Number(match[1]), Number(match[2])];
        return y > 2 || (y === 2 && S >= 36);
      },
      () => {
        partialCloneFetchCache.delete(n);
        return true;
      },
    );
    partialCloneFetchCache.set(n, r);
  }
  return r;
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
async function inspectPartialClone(e, n) {
  if (!isEagerBalloonEnabled()) return NO_PARTIAL_CLONE;
  let gitDirsOrPlaceholder = resolveGitDirsOrPlaceholder(e);
  let s = gitDirsOrPlaceholder.gitDir !== NOT_A_GIT_REPO_PATH;
  let commonDirFromPointer = await resolveCommonDirFromPointer(e, gitDirsOrPlaceholder.commonDir);
  let y = s
    ? classifyGitDirOwnership(gitDirsOrPlaceholder)
    : commonDirFromPointer === NOT_A_GIT_REPO_PATH
      ? "other"
      : "pointer";
  let superproject = findSuperproject(commonDirFromPointer, y);
  let w =
    superproject === null
      ? {}
      : {
          submodule: s ? commonDirFromPointer : "",
        };
  let L = orderPromisorRemotes(await readPartialCloneConfig(e, gitDirsOrPlaceholder));
  if (L.length === 0)
    return {
      inForce: true,
      promisors: L,
      ...w,
    };
  if (!(await n(superproject?.superproject ?? null))) return NO_PARTIAL_CLONE;
  return superproject !== null
    ? {
        inForce: true,
        promisors: [],
        ...w,
      }
    : {
        inForce: true,
        promisors: L,
      };
}
//@ chunk-e6aww6q8.js:3584953-3585179 placement
async function resolveCommonDirFromPointer(e, commonDir) {
  if (commonDir !== NOT_A_GIT_REPO_PATH) return commonDir;
  let r = join(e, ".git");
  let s = await lstat(r).catch(() => null);
  let h = s?.isSymbolicLink()
    ? readLinkTextSafe(r)
    : s?.isFile()
      ? /^gitdir:(.*)$/s.exec(readBoundedSync(r, GIT_POINTER_MAX_BYTES)?.trim() ?? "")?.[1]
      : null;
  return h?.trim() ? resolve_2(e, h.trim()) : commonDir;
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
function findSuperproject(commonDirFromPointer, n) {
  let r = `${commonDirFromPointer.split(/[\\/]+/).join("/")}/`;
  let match = /^(.*?)\/\.git(?:\/worktrees\/[^/]+)?\/modules\//.exec(r);
  if (match)
    return {
      superproject: match[1] || "/",
    };
  if (n === "own") return null;
  let match_2 = /^(.*?\/[^/]+\.git)(?:\/worktrees\/[^/]+)?\/modules\//.exec(r);
  if (match_2)
    return {
      superproject: match_2[1],
    };
  return n === "pointer" && /\/modules\//i.test(r)
    ? {
        superproject: null,
      }
    : null;
}
//@ chunk-e6aww6q8.js:3585639-3587324 placement
/**
 * 检出时关闭了按需拉取导致失败的说明。
 */
function explainOnDemandFetchOff(e, { submodule: n } = {}, baseSha) {
  if (
    !/lazy fetching disabled|could not fetch [0-9a-f]+ from promisor remote|transport '[^']*' not allowed/.test(
      e,
    )
  )
    return "";
  let s = baseSha ? baseSha.slice(0, 12) : "<the base commit>";
  if (n !== undefined)
    return `
This checkout ran with git's on-demand fetching switched off, and git needed an object this repository does not have. This repository is a git submodule, and its git folder${n ? `, "${hideUnsafePath(n)}",` : ' (the folder its ".git" file points to)'} is kept inside the superproject's git folder, where commands running in the Bash sandbox can write. Because any git command run in the submodule follows what that folder holds, Claude Code fetched nothing ahead of time and cannot safely suggest a command to run there; while a sandboxed session that can write there is still running, the folder cannot be trusted at all. Once no such session is running, look through that folder for settings that should not be there \u2014 for example, in "config" (and "config.worktree", if present) a changed remote address, an upload-pack or ssh command, or an include line; a file named "commondir"; scripts in "hooks" that you did not install; or any other setting you did not make \u2014 and remove those. Then fetch the missing objects for commit ${s} in the submodule yourself and try again.`;
  return `
This checkout ran with git's on-demand fetching switched off, and git needed an object this repository does not have. If the repository is a partial clone, run "git archive -o objects.tar ${s}" (git fetches the commit's missing files \u2014 in a sparse checkout, the whole tree's; delete objects.tar afterwards) in its main checkout and try again; otherwise check it with "git fsck".`;
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
async function explainPartialCloneFailure(cwd, n, { promisors }, s = null, h = MAX_LISTED_MISSING_OBJECTS) {
  let y = (failure, fetches = 0) => ({
    failure,
    fetches,
  });
  if (promisors.length === 0) return y(null);
  let sliced = n.slice(0, 12);
  let w = [];
  for (let promisor of promisors)
    if (!promisor.startsWith("-") && (await reconcileSparseCheckout(cwd, promisor))) w.push(promisor);
  await using L = await writeSparsePatterns(cwd, typeof s === "function" ? await s() : s);
  let G = w.length > 0;
  let q = w.length + MISSING_LIST_SLACK;
  let Z = Date.now() + h * 60000;
  let Se = null;
  for (let fetches = 0, we = 0; ;) {
    let Ee = await L.missing(n);
    if (typeof Ee === "string")
      return y(
        Ee === MISSING_TOO_MANY_TEXT
          ? `This repository is a partial clone, and commit ${sliced} needs more than about 1.5 million objects it does not have, too many to fetch before checking it out. Limit the worktree with the worktree.sparsePaths setting, or check that commit out once in the main checkout so git fetches them, then try again.`
          : `This repository is a partial clone, and git could not list the objects needed for commit ${sliced} (${Ee}), so none were fetched before the checkout. Check the repository with "git fsck" and try again.`,
        fetches,
      );
    if (Ee.length === 0) return y(null, fetches);
    if (!G)
      return y(
        isSafeRemoteName(promisors[0])
          ? `This repository is a partial clone, but its promisor remote "${promisors[0]}" has no URL in the repository's git config (remote.${promisors[0]}.url is not set), so the ${Ee.length === 1 ? "object" : `${Ee.length} objects`} needed for commit ${sliced} could not be fetched. Set it with "git config remote.${promisors[0]}.url <url>" and try again.`
          : `This repository is a partial clone, but its promisor remote ${describePromisorRemote(promisors[0])} cannot be fetched from safely (its name begins with "-", which git would read as an option, or it has no URL in the repository's git config), so the ${Ee.length === 1 ? "object" : `${Ee.length} objects`} needed for commit ${sliced} could not be fetched. Look through the [remote "\u2026"] sections and the extensions.partialclone line in that config, and in any file it includes, for a remote you did not set up; correct or remove it, then try again.`,
      );
    let Ae = Z - Date.now();
    if (w.length === 0 || fetches === q || Ae <= 0)
      return y(
        Se ??
          `This repository is a partial clone, and its promisor remotes had still not delivered every object needed for commit ${sliced} after ${fetches === 1 ? "1 fetch" : `${fetches} fetches`}${Ae <= 0 ? ` and ${h} minutes` : ""}. Run "git fetch <remote>" for each promisor remote to see which one is failing, then try again.`,
        fetches,
      );
    let Ie = w[we % w.length];
    logForDebugging(
      `[worktree] partial clone: fetching ${Ee.length} missing object(s) for ${sliced} from ${describePromisorRemote(Ie)} before materializing`,
    );
    let Me = await execFileNoThrowWithCwd(
      gitExe(),
      [
        ...SAFE_UPLOAD_PACK_ARG,
        "-c",
        "fetch.negotiationAlgorithm=noop",
        "fetch",
        (await uploadPackArgForRemote(cwd, Ie)) ?? SAFE_UPLOAD_PACK_ARG_2,
        "--no-tags",
        "--no-write-fetch-head",
        "--recurse-submodules=no",
        "--filter=blob:none",
        "--stdin",
        Ie,
      ],
      {
        cwd,
        env: withSafeGitConfig(cwd),
        input: `${Ee.join(`
`)}
`,
        timeout: Ae,
        withoutControllingTerminal: true,
      },
    );
    fetches++;
    if (Me.code === 0) {
      we++;
      continue;
    }
    let We = redactUrlsInMessage(stripProgressLines(Me.stderr));
    logForDebugging(`[worktree] explicit fetch from ${describePromisorRemote(Ie)} failed: ${We}`, {
      level: "warn",
    });
    let ze = Me.timedOut
      ? `The fetches ran out of their shared ${h}-minute budget.`
      : `git said: ${truncateMiddle_2(hideUnsafeText(We, "git's error"))}`;
    Se = `This repository is a partial clone, and ${Ee.length === 1 ? "an object" : `${Ee.length} objects`} needed for commit ${sliced} could not be fetched from its promisor remote ${describePromisorRemote(Ie)} before checking it out (Claude Code checks worktrees out with git's on-demand fetching switched off). Check that the remote is reachable (${isSafeRemoteName(Ie) ? `for example "git fetch ${Ie}"` : 'run "git remote -v" to see which remotes are configured'}) and try again. ${ze}`;
    w.splice(w.indexOf(Ie), 1);
    fetches--;
  }
}
//@ chunk-e6aww6q8.js:3590734-3590799 placement
function isSafeRemoteName(e) {
  return /^[A-Za-z0-9][A-Za-z0-9._\/@+-]*$/.test(e);
}
//@ chunk-e6aww6q8.js:3590799-3590961 placement
function describePromisorRemote(e) {
  return isSafeRemoteName(e)
    ? `"${e}"`
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

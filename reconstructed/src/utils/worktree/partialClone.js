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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
} from "fs/promises";
import { gitExe } from "../git.js";
import { PAe, stripProgressLines } from "./worktreeRegistrations.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { freeze as freeze_23, kMe } from "../git/gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { resolveGitDirsOrPlaceholder, NOT_A_GIT_REPO_PATH } from "../git/gitDirResolution.js";
import { readPartialCloneConfig, withSafeGitConfig } from "../git/gitLanes.js";
import { readLinkTextSafe, readBoundedSync, GIT_POINTER_MAX_BYTES } from "../git/gitFilesystem.js";
import { hideUnsafePath, hideUnsafeText } from "../unsafePathGlyphs.js";
import { reconcileSparseCheckout } from "../plugins/marketplaceManager.js";
import { writeSparsePatterns, uploadPackArgForRemote } from "./sparseCheckout.js";
import { logForDebugging } from "../debug.js";
import { GOi, SAFE_UPLOAD_PACK_ARG } from "../gitSafeExec.js";
import { redactUrlsInMessage } from "../redaction/urlRedaction.js";
import { truncateMiddle as truncateMiddle_2 } from "../../memdir/memoryTool.js";

/**
 * 检查 git 版本是否不低于 2.36（按 git 可执行文件缓存结果）。
 */
//@ chunk-e6aww6q8.js:3583881-3584208 placement
function gitSupportsPartialCloneFetch(e) {
  let n = gitExe(),
    r = PAe.get(n);
  if (r === void 0)
    ((r = execFileNoThrowWithCwd(n, [...freeze_23, "--version"], {
      cwd: e,
      env: getRemoteHostSessionCount(),
      timeout: 1e4,
    }).then(
      (s) => {
        let match = /git version (\d+)\.(\d+)/.exec(s.stdout);
        if (s.code !== 0 || match === null) return (PAe.delete(n), !0);
        let [y, S] = [Number(match[1]), Number(match[2])];
        return y > 2 || (y === 2 && S >= 36);
      },
      () => (PAe.delete(n), !0),
    )),
      PAe.set(n, r));
  return r;
}
//@ chunk-e6aww6q8.js:3584409-3584489 placement
var kIr = 2,
  bIr = 67108864,
  pot = "more objects are missing than can be listed",
  wIr = 10;
//@ chunk-e6aww6q8.js:3584489-3584547 placement
function TIr() {
  return readFlagWithOverride("tengu_eager_balloon", { safe: !0 });
}
//@ chunk-e6aww6q8.js:3584547-3584581 placement
var XPn = { inForce: !1, promisors: [] };
/**
 * 检查目录是否是部分克隆：解析 git 目录、判断是否为子模块（找出上层仓库）、读取 promisor 远程顺序。
 */
//@ chunk-e6aww6q8.js:3584581-3584953 placement
async function inspectPartialClone(e, n) {
  if (!TIr()) return XPn;
  let r = resolveGitDirsOrPlaceholder(e),
    s = r.gitDir !== NOT_A_GIT_REPO_PATH,
    h = await resolveCommonDirFromPointer(e, r.commonDir),
    y = s ? classifyGitDirOwnership(r) : h === NOT_A_GIT_REPO_PATH ? "other" : "pointer",
    S = findSuperproject(h, y),
    w = S === null ? {} : { submodule: s ? h : "" },
    L = orderPromisorRemotes(await readPartialCloneConfig(e, r));
  if (L.length === 0) return { inForce: !0, promisors: L, ...w };
  if (!(await n(S?.superproject ?? null))) return XPn;
  return S !== null ? { inForce: !0, promisors: [], ...w } : { inForce: !0, promisors: L };
}
//@ chunk-e6aww6q8.js:3584953-3585179 placement
async function resolveCommonDirFromPointer(e, n) {
  if (n !== NOT_A_GIT_REPO_PATH) return n;
  let r = join_93(e, ".git"),
    s = await lstat_32(r).catch(() => null),
    h = s?.isSymbolicLink()
      ? readLinkTextSafe(r)
      : s?.isFile()
        ? /^gitdir:(.*)$/s.exec(readBoundedSync(r, GIT_POINTER_MAX_BYTES)?.trim() ?? "")?.[1]
        : null;
  return h?.trim() ? resolve_38(e, h.trim()) : n;
}
//@ chunk-e6aww6q8.js:3585179-3585290 placement
function classifyGitDirOwnership({ gitDir: gitDir, workTree: workTree }) {
  if (workTree === null || gitDir === NOT_A_GIT_REPO_PATH) return "other";
  return gitDir === join_93(workTree, ".git") ? "own" : "pointer";
}
/**
 * 从子模块 git 目录路径推断上层仓库位置。
 */
//@ chunk-e6aww6q8.js:3585290-3585639 placement
function findSuperproject(e, n) {
  let r = `${e.split(/[\\/]+/).join("/")}/`,
    match = /^(.*?)\/\.git(?:\/worktrees\/[^/]+)?\/modules\//.exec(r);
  if (match) return { superproject: match[1] || "/" };
  if (n === "own") return null;
  let match_2 = /^(.*?\/[^/]+\.git)(?:\/worktrees\/[^/]+)?\/modules\//.exec(r);
  if (match_2) return { superproject: match_2[1] };
  return n === "pointer" && /\/modules\//i.test(r) ? { superproject: null } : null;
}
/**
 * 检出时关闭了按需拉取导致失败的说明。
 */
//@ chunk-e6aww6q8.js:3585639-3587324 placement
function explainOnDemandFetchOff(e, { submodule: n } = {}, r) {
  if (
    !/lazy fetching disabled|could not fetch [0-9a-f]+ from promisor remote|transport '[^']*' not allowed/.test(
      e,
    )
  )
    return "";
  let s = r ? r.slice(0, 12) : "<the base commit>";
  if (n !== void 0)
    return `
This checkout ran with git's on-demand fetching switched off, and git needed an object this repository does not have. This repository is a git submodule, and its git folder${n ? `, "${hideUnsafePath(n)}",` : ' (the folder its ".git" file points to)'} is kept inside the superproject's git folder, where commands running in the Bash sandbox can write. Because any git command run in the submodule follows what that folder holds, Claude Code fetched nothing ahead of time and cannot safely suggest a command to run there; while a sandboxed session that can write there is still running, the folder cannot be trusted at all. Once no such session is running, look through that folder for settings that should not be there \u2014 for example, in "config" (and "config.worktree", if present) a changed remote address, an upload-pack or ssh command, or an include line; a file named "commondir"; scripts in "hooks" that you did not install; or any other setting you did not make \u2014 and remove those. Then fetch the missing objects for commit ${s} in the submodule yourself and try again.`;
  return `
This checkout ran with git's on-demand fetching switched off, and git needed an object this repository does not have. If the repository is a partial clone, run "git archive -o objects.tar ${s}" (git fetches the commit's missing files \u2014 in a sparse checkout, the whole tree's; delete objects.tar afterwards) in its main checkout and try again; otherwise check it with "git fsck".`;
}
//@ chunk-e6aww6q8.js:3587324-3587409 placement
function doe({ inForce: inForce }) {
  return inForce ? { GIT_NO_LAZY_FETCH: "1", GIT_ALLOW_PROTOCOL: kMe } : {};
}
/**
 * 部分克隆仓库缺少对象时的错误说明。
 */
//@ chunk-e6aww6q8.js:3587409-3590734 placement
async function explainPartialCloneFailure(e, n, { promisors: promisors }, s = null, h = wIr) {
  let y = (ke, we = 0) => ({ failure: ke, fetches: we });
  if (promisors.length === 0) return y(null);
  let sliced = n.slice(0, 12),
    w = [];
  for (let ke of promisors) if (!ke.startsWith("-") && (await reconcileSparseCheckout(e, ke))) w.push(ke);
  await using L = await writeSparsePatterns(e, typeof s === "function" ? await s() : s);
  let G = w.length > 0,
    q = w.length + kIr,
    Z = Date.now() + h * 60000,
    Se = null;
  for (let ke = 0, we = 0; ;) {
    let missing = await L.missing(n);
    if (typeof missing === "string")
      return y(
        missing === pot
          ? `This repository is a partial clone, and commit ${sliced} needs more than about 1.5 million objects it does not have, too many to fetch before checking it out. Limit the worktree with the worktree.sparsePaths setting, or check that commit out once in the main checkout so git fetches them, then try again.`
          : `This repository is a partial clone, and git could not list the objects needed for commit ${sliced} (${missing}), so none were fetched before the checkout. Check the repository with "git fsck" and try again.`,
        ke,
      );
    if (missing.length === 0) return y(null, ke);
    if (!G)
      return y(
        lot(promisors[0])
          ? `This repository is a partial clone, but its promisor remote "${promisors[0]}" has no URL in the repository's git config (remote.${promisors[0]}.url is not set), so the ${missing.length === 1 ? "object" : `${missing.length} objects`} needed for commit ${sliced} could not be fetched. Set it with "git config remote.${promisors[0]}.url <url>" and try again.`
          : `This repository is a partial clone, but its promisor remote ${describePromisorRemote(promisors[0])} cannot be fetched from safely (its name begins with "-", which git would read as an option, or it has no URL in the repository's git config), so the ${missing.length === 1 ? "object" : `${missing.length} objects`} needed for commit ${sliced} could not be fetched. Look through the [remote "\u2026"] sections and the extensions.partialclone line in that config, and in any file it includes, for a remote you did not set up; correct or remove it, then try again.`,
      );
    let Ae = Z - Date.now();
    if (w.length === 0 || ke === q || Ae <= 0)
      return y(
        Se ??
          `This repository is a partial clone, and its promisor remotes had still not delivered every object needed for commit ${sliced} after ${ke === 1 ? "1 fetch" : `${ke} fetches`}${Ae <= 0 ? ` and ${h} minutes` : ""}. Run "git fetch <remote>" for each promisor remote to see which one is failing, then try again.`,
        ke,
      );
    let Ie = w[we % w.length];
    logForDebugging(
      `[worktree] partial clone: fetching ${missing.length} missing object(s) for ${sliced} from ${describePromisorRemote(Ie)} before materializing`,
    );
    let Me = await execFileNoThrowWithCwd(
      gitExe(),
      [
        ...GOi,
        "-c",
        "fetch.negotiationAlgorithm=noop",
        "fetch",
        (await uploadPackArgForRemote(e, Ie)) ?? SAFE_UPLOAD_PACK_ARG,
        "--no-tags",
        "--no-write-fetch-head",
        "--recurse-submodules=no",
        "--filter=blob:none",
        "--stdin",
        Ie,
      ],
      {
        cwd: e,
        env: withSafeGitConfig(e),
        input: `${missing.join(`
`)}
`,
        timeout: Ae,
        withoutControllingTerminal: !0,
      },
    );
    if ((ke++, Me.code === 0)) {
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
    ((Se = `This repository is a partial clone, and ${missing.length === 1 ? "an object" : `${missing.length} objects`} needed for commit ${sliced} could not be fetched from its promisor remote ${describePromisorRemote(Ie)} before checking it out (Claude Code checks worktrees out with git's on-demand fetching switched off). Check that the remote is reachable (${lot(Ie) ? `for example "git fetch ${Ie}"` : 'run "git remote -v" to see which remotes are configured'}) and try again. ${ze}`),
      w.splice(w.indexOf(Ie), 1),
      ke--);
  }
}
//@ chunk-e6aww6q8.js:3590734-3590799 placement
function lot(e) {
  return /^[A-Za-z0-9][A-Za-z0-9._\/@+-]*$/.test(e);
}
//@ chunk-e6aww6q8.js:3590799-3590961 placement
function describePromisorRemote(e) {
  return lot(e)
    ? `"${e}"`
    : "(name not shown: it does not begin with a letter or digit, or has characters other than letters, digits and . _ / @ + -)";
}
//@ chunk-e6aww6q8.js:3590961-3591085 placement
function orderPromisorRemotes(e) {
  if (e === null || e === void 0) return [];
  let { extension: extension, remotes: remotes } = e;
  return extension === null ? remotes : [...remotes.filter((s) => s !== extension), extension];
}

export {
  inspectPartialClone,
  explainPartialCloneFailure,
  doe,
  gitSupportsPartialCloneFetch,
  explainOnDemandFetchOff,
  pot,
  bIr,
};

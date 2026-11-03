/**
 * utils/worktreeIsolation.ts
 *
 * 2.1.316 新增：工作树隔离
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7), chunk-s61vbvea.js (75)
 * attribution: placement 82
 */
import { isAbsolute, join, relative, sep, dirname, resolve, basename } from "path";
import { homedir } from "os";
import { lstat, open, readdir } from "fs/promises";
import { lstatSync, realpathSync, openSync, fstatSync, readSync, closeSync, readdirSync } from "fs";
import { DoctorLazy } from "../cli/handlers/util.js";
import { array, unknown } from "../../vendor/zod/v4/classic/schemas.js";
import { getPlatform as getPlatform_2 } from "./platform.js";
import {
  isSameContainmentPath,
  isOutsideContainment,
  resolveContainmentTarget,
  hasUnresolvedCanonicalPath,
  describeCaseOnlyMismatch,
  isCanonicalUnderRoot,
  toWin32Backslashes,
} from "./permissions/bgContainment.js";
import { safeParseJSON } from "./json.js";
import { env } from "./env.js";
import { getCurrentWorktreeSession } from "./worktree.js";
import { getOriginalCwd, getRootSession } from "../bootstrap/state.js";
import { getGitRepoCache, REPO_NEGATIVE_RESULT, memoizeMap } from "./git/gitRepoCache.js";
import { logForDebugging } from "./debug.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { getBgTakeover, isIsolationUnavailableForCwd } from "./concurrentSessions.js";
import { hideUnsafePath } from "./unsafePathGlyphs.js";
import { isENOENT, getErrnoCode } from "./errors.js";
import { getRepoRootForWorktreePath, isSystemVolumePath } from "./permissions/protectedDirs.js";
import { uniq } from "./collections.js";
import { GIT_SAFE_GLOBAL_ARGS } from "./git/gitSafeEnv.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import {
  gitExe,
  findGitRootUncached,
  findCanonicalGitRootUncached,
  findCanonicalGitRoot,
  findGitRoot,
  isLinkedWorktree,
  isLinkedWorktreeUncached,
} from "./git.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import { safeExecFileSync } from "./safeSpawn.js";
import {
  isNonWslUncPath,
  isNetworkMountRoot,
  isNetworkMountPath_2,
  isWslLocalhostPath,
} from "./networkPaths.js";
import { HostScoped } from "./hostScoped.js";
import { getInitialSettings_2 } from "./settings/settings.js";
import { getCwd } from "./cwd.js";
import { hasWorktreeCreateHook } from "./hooks/worktreeHooks.js";
import { ENTER_WORKTREE_TOOL_NAME } from "../tools/EnterWorktreeTool/constants.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { nativeRealpathLong } from "./windowsUncPaths.js";

//@ chunk-s61vbvea.js:429820-429849 placement
var worktreeFenceSchema = DoctorLazy(() => array(unknown()).min(1));
//@ chunk-s61vbvea.js:429849-429968 placement
function isPathContainedIn(e, canonical) {
  return (getPlatform_2() === "linux" ? isSameContainmentPath : isOutsideContainment)(
    {
      lexical: canonical,
      canonical,
      skipped: false,
    },
    {
      lexical: e,
      canonical: e,
      skipped: false,
    },
  );
}
//@ chunk-s61vbvea.js:429968-430158 placement
function resolveFencePath(e) {
  if (typeof e !== "string" || !isAbsolute(e))
    return {
      code: "not_absolute",
      value: e,
    };
  let { canonical, skipped } = resolveContainmentTarget(e);
  return canonical === null
    ? {
        code: skipped ? "network_path" : "unresolvable_path",
        value: e,
      }
    : {
        at: canonical,
      };
}
//@ chunk-s61vbvea.js:430158-430705 placement
function checkWorktreeFence(declared, declaredFence, r) {
  let s = worktreeFenceSchema().safeParse(safeParseJSON(declaredFence, false));
  if (!s.success)
    return {
      problems: [
        {
          code: "bad_fence",
          value: declaredFence,
        },
      ],
    };
  let fencePath = resolveFencePath(declared);
  if ("code" in fencePath)
    return {
      problems: [fencePath],
    };
  let fencePath_2 = resolveFencePath(r);
  if ("code" in fencePath_2)
    return {
      problems: [fencePath_2],
    };
  if (!isPathContainedIn(fencePath.at, fencePath_2.at))
    return {
      problems: [
        {
          code: "session_outside_worktree",
          value: r,
        },
      ],
    };
  let containmentTarget = resolveContainmentTarget(homedir());
  let w = containmentTarget.canonical ?? containmentTarget.lexical;
  let R = [];
  let x = [];
  for (let P of s.data) {
    let fencePath = resolveFencePath(P);
    if ("code" in fencePath) x.push(fencePath);
    else if (isPathContainedIn(fencePath.at, w) && !isPathContainedIn(w, fencePath.at))
      x.push({
        code: "fence_too_wide",
        value: P,
      });
    else R.push(fencePath.at);
  }
  return {
    answer:
      R.length > 0
        ? {
            tree: fencePath.at,
            fence: R,
          }
        : undefined,
    problems: x,
  };
}
//@ chunk-s61vbvea.js:430705-430855 placement
function hostWorktreeDeclaration() {
  let CLAUDE_CODE_HOST_WORKTREE = env.CLAUDE_CODE_HOST_WORKTREE;
  let CLAUDE_CODE_HOST_WORKTREE_FENCE = env.CLAUDE_CODE_HOST_WORKTREE_FENCE;
  return CLAUDE_CODE_HOST_WORKTREE === undefined && CLAUDE_CODE_HOST_WORKTREE_FENCE === undefined
    ? undefined
    : {
        declared: CLAUDE_CODE_HOST_WORKTREE,
        declaredFence: CLAUDE_CODE_HOST_WORKTREE_FENCE,
      };
}
//@ chunk-s61vbvea.js:430855-431600 placement
function describeWorktreeWriteFence() {
  let e = hostWorktreeDeclaration();
  if (e === undefined) return;
  let { declared, declaredFence } = e;
  let s = getCurrentWorktreeSession()?.preEnterOriginalCwd ?? getOriginalCwd();
  let { answer, problems } = checkWorktreeFence(declared, declaredFence, s);
  let S = `CLAUDE_CODE_HOST_WORKTREE=${declared ?? "(not set)"} CLAUDE_CODE_HOST_WORKTREE_FENCE=${declaredFence ?? "(not set)"}, session folder ${s}: ${answer === undefined ? "ignored, so they block no file write" : `file tools may not write in ${answer.fence.join(", ")}, except inside ${answer.tree}`}${problems.map((problem) => `; ${problem.code}${typeof problem.value === "string" ? ` ${JSON.stringify(problem.value)}` : ""}`).join("")}`;
  let gitRepoCache = getGitRepoCache();
  if (gitRepoCache.hostWorktreeReport !== S) {
    gitRepoCache.hostWorktreeReport = S;
    logForDebugging(S, {
      level: problems.length > 0 ? "warn" : "debug",
    });
    if (problems.length === 0) logFeatureOk("worktree_host_declared");
    else if (answer === undefined) logFeatureBad("worktree_host_declared", problems[0].code);
    else logFeatureSad("worktree_host_declared", problems[0].code);
  }
  return answer;
}
//@ chunk-s61vbvea.js:431600-431764 placement
/**
 * 当前上下文的隔离 worktree：子代理自己的 worktree 优先，其次项目的 isolationRoot（非特定模式下），最后是当前 worktree 会话的路径。
 */
function isolationWorktreeFor(e) {
  if (e.agentWorktree) return e.agentWorktree;
  if (!isBackgroundSession()) {
    let isolationRoot = e.session.project?.isolationRoot;
    if (isolationRoot && !hasHostWorktreeDeclaration()) return isolationRoot;
  }
  return getCurrentWorktreeSession()?.worktreePath || undefined;
}
//@ chunk-s61vbvea.js:431764-431833 placement
/**
 * 是否后台会话（CLAUDE_CODE_SESSION_KIND=bg 或已接管）。
 */
function isBackgroundSession() {
  return env.CLAUDE_CODE_SESSION_KIND === "bg" || getBgTakeover() !== null;
}
//@ chunk-s61vbvea.js:431833-431869 placement
/**
 * 宿主是否声明了 worktree。
 */
function hasHostWorktreeDeclaration() {
  return hostWorktreeDeclaration() !== undefined;
}
//@ chunk-s61vbvea.js:432292-432332 placement
/**
 * 控制字符与「控制或格式字符」的模式。
 */
var CONTROL_CHAR_RE = /\p{Cc}/u;
var CONTROL_OR_FORMAT_CHAR_RE = /[\p{Cc}\p{Cf}]/u;
//@ chunk-s61vbvea.js:432332-432383 placement = isDangerousFilePathToAutoEdit (1)
function getClaudeWorktreesDir(repoRoot) {
  return join(repoRoot, ".claude", "worktrees");
}
//@ chunk-s61vbvea.js:432383-432457 placement = isDangerousFilePathToAutoEdit (0.775)
function getWorktreesDirSpec(repoRoot) {
  return {
    dir: getClaudeWorktreesDir(repoRoot),
    anchor: repoRoot,
    below: [".claude", "worktrees"],
  };
}
//@ chunk-s61vbvea.js:432457-432527 placement
/**
 * 生成 worktrees 目录规格。
 */
function worktreesDirSpec(e, n) {
  return {
    dir: join(n, ...e.below),
    anchor: n,
    below: e.below,
  };
}
//@ chunk-s61vbvea.js:432527-432839 placement
function parseWorktreeAddError(createStderr, worktreeBranch) {
  let lines = createStderr.split(/[\r\n]/);
  return [
    `fatal: '${worktreeBranch}' is already used by worktree at `,
    `fatal: '${worktreeBranch}' is already checked out at `,
    `fatal: cannot force update the branch '${worktreeBranch}' used by worktree at `,
    `fatal: cannot force update the branch '${worktreeBranch}' checked out at `,
  ].some((s) => lines.some((line) => line.startsWith(s)));
}
//@ chunk-s61vbvea.js:432839-433072 placement
/**
 * 给出一个路径相对仓库的安全描述：仓库外或路径段含不安全字符时只说"仓库外/内某处（不显示）"，否则显示路径。
 */
function describeRepoRelativeLocation(e, n) {
  let r = relative(n, e);
  if (r === ".." || r.startsWith(`..${sep}`) || isAbsolute(r))
    return "a location outside the repository (not shown)";
  return r === "" || r.split(sep).every((s) => SAFE_SEGMENT_RE.test(s))
    ? hideUnsafePath(e)
    : "a location inside the repository (not shown)";
}
//@ chunk-s61vbvea.js:433072-433100 placement
var SAFE_SEGMENT_RE = /^[a-zA-Z0-9._+-]+$/;
//@ chunk-s61vbvea.js:433100-433158 placement
function repoRelativePath(anchor, n) {
  return `${hideUnsafePath(relative(anchor, n))} in the repository`;
}
//@ chunk-s61vbvea.js:433158-433773 placement
async function checkWorktreePath(e, n) {
  let r = [...e.below.map((s, h, y) => join(e.anchor, ...y.slice(0, h + 1))), n];
  for (let s of r) {
    let h;
    try {
      h = await lstat(s);
    } catch (error) {
      if (isENOENT(error)) continue;
      return {
        ok: false,
        reason: "lstat_failed",
        message: `Cannot create worktree: failed to lstat ${repoRelativePath(e.anchor, s)}: it could not be read${getErrnoCode(error) ? ` (${getErrnoCode(error)})` : ""}`,
      };
    }
    if (h.isSymbolicLink())
      return {
        ok: false,
        reason: "symlink",
        message: `Cannot create worktree: ${repoRelativePath(e.anchor, s)} is a symlink. A repository-committed symlink at .claude, .claude/worktrees, or .claude/worktrees/<name> could redirect worktree creation outside the repository. Remove the symlink and retry.`,
      };
  }
  return {
    ok: true,
  };
}
//@ chunk-s61vbvea.js:433773-433803 placement
/**
 * 取仓库的 worktrees 目录规格。
 */
function worktreesDirSpecs(repoRoot) {
  return getWorktreesDirSpec(repoRoot);
}
//@ chunk-s61vbvea.js:433803-433834 placement
/**
 * worktrees 目录规格的数组形式。
 */
function candidateWorktreeDirs(e) {
  return [worktreesDirSpecs(e)];
}
//@ chunk-s61vbvea.js:433834-433909 placement
/**
 * 解析路径所属仓库检出与其 worktrees 家目录。
 */
function worktreeLocationOf(worktreePath) {
  let repoRoot = getRepoRootForWorktreePath(worktreePath);
  return repoRoot === null
    ? null
    : {
        checkout: repoRoot,
        home: getWorktreesDirSpec(repoRoot),
      };
}
//@ chunk-s61vbvea.js:433909-434277 placement
/**
 * 异步检查 worktree 隔离是否可靠：读取该 worktree 与候选仓库根的 git 身份，交给 checkWorktreeIsolation_2 比对（选项控制自持 pin 的见证要求）。
 */
async function checkWorktreeIsolation(worktreePath, repoRoots, extraRoots = [], options) {
  let [gitIdentity, y] = await Promise.all([
    readGitIdentityAsync(worktreePath),
    isSymlinkAsync(worktreePath),
  ]);
  let S = new Set(repoRoots);
  let w = new Set(extraRoots);
  let R = uniq([...repoRoots, ...extraRoots]);
  let x = options?.requireWitnessForSelfOwningPins === true;
  let P = options?.declineSelfOwningPinUnderLiveRoot === true;
  if (typeof gitIdentity.ids !== "object")
    return checkWorktreeIsolation_3(worktreePath, gitIdentity, y, R, S, w, [], x, P);
  let results = await Promise.all(
    candidateRepoRoots(worktreePath, R, gitIdentity.ids).map(async (G) => ({
      root: G,
      ...(await readGitIdentityAsync(G)),
    })),
  );
  return checkWorktreeIsolation_3(worktreePath, gitIdentity, y, R, S, w, results, x, P);
}
//@ chunk-s61vbvea.js:434277-434587 placement
/**
 * checkWorktreeIsolation 的同步版本。
 */
function checkWorktreeIsolationSync(worktreePath, repoRoots, extraRoots = [], options) {
  let gitIdentity = readGitIdentitySync(worktreePath);
  let y = isSymlinkSync(worktreePath);
  let S = new Set(repoRoots);
  let w = new Set(extraRoots);
  let R = uniq([...repoRoots, ...extraRoots]);
  let x = options?.requireWitnessForSelfOwningPins === true;
  let P = options?.declineSelfOwningPinUnderLiveRoot === true;
  if (typeof gitIdentity.ids !== "object")
    return checkWorktreeIsolation_3(worktreePath, gitIdentity, y, R, S, w, [], x, P);
  let mapped = candidateRepoRoots(worktreePath, R, gitIdentity.ids).map((G) => ({
    root: G,
    ...readGitIdentitySync(G),
  }));
  return checkWorktreeIsolation_3(worktreePath, gitIdentity, y, R, S, w, mapped, x, P);
}
//@ chunk-s61vbvea.js:434587-441228 placement
/**
 * 检查工作树隔离是否可靠（符号链接、.git 条目、仓库内外位置）
 */
function checkWorktreeIsolation_3(worktreePath, gitIdentity, r, s, h, y, S, w = false, R = false) {
  if (r)
    return unverifiableIsolationResult(
      worktreePath,
      "it is a symbolic link, so the tree it would isolate into cannot be pinned down",
    );
  if (gitIdentity.entry === "unverifiable")
    return unverifiableIsolationResult(worktreePath, "its .git entry exists but could not be examined");
  let ids = gitIdentity.ids;
  if (ids === "error") return unverifiableIsolationResult(worktreePath, "git could not be run to resolve it");
  if (typeof ids === "object" && ids.isBare === true)
    return unverifiableIsolationResult(worktreePath, "it is a bare repository, not a working tree");
  if (ids === "no-repo") {
    if (gitIdentity.entry !== "absent")
      return unverifiableIsolationResult(
        worktreePath,
        "a .git entry exists there but git could not resolve it",
      );
    for (let L of s) {
      if (!h.has(L)) continue;
      if (mayBeOutside(worktreePath, L))
        return {
          ok: false,
          reason: "pin-is-protected-checkout",
          message: stripControlCharsForMessage(
            `Refusing to use ${worktreePath} as an isolation worktree: it contains the protected checkout ${L}, so adopting it would disarm every isolation check for that checkout.`,
          ),
        };
    }
    for (let L of y)
      if (mayBeOutside(worktreePath, L))
        return {
          ok: false,
          reason: "pin-is-own-launch-tree",
          message: stripControlCharsForMessage(
            `This resume was started from inside ${worktreePath}, a non-git directory \u2014 nothing can confirm it as a separate isolation tree from there. Run the resume from the project checkout instead.`,
          ),
        };
    return {
      ok: true,
      reason: "not-a-git-worktree",
    };
  }
  if (ids.symlinkedRefStore.length > 0)
    return {
      ok: false,
      reason: "invalid-linked-worktree",
      message: stripControlCharsForMessage(
        `Refusing to use ${worktreePath} as an isolation worktree: its git metadata has symbolic links in place of ${ids.symlinkedRefStore.join(", ")}, which aliases another repository's refs into this tree. Recreate the worktree with git worktree add, then retry.`,
      ),
    };
  if (ids.unexaminableRefStore.length > 0)
    return unverifiableIsolationResult(
      worktreePath,
      `its ref storage could not be fully examined (${ids.unexaminableRefStore[0]})`,
    );
  let P = compareSameContainment(ids.topLevel, worktreePath);
  if (P === "indeterminate")
    return unverifiableIsolationResult(
      worktreePath,
      `its working tree resolves to a path that cannot be safely compared (${ids.topLevel})`,
    );
  if (P === "distinct")
    return {
      ok: false,
      reason: "work-tree-elsewhere",
      message: stripControlCharsForMessage(
        `Refusing to use ${worktreePath} as an isolation worktree: git resolves its working tree to ${ids.topLevel} (a core.worktree redirect, or a checkout discovered above it), so commands run there would write outside the worktree. Remove the redirect, restore the worktree's own .git, or recreate the worktree, then retry.`,
      ),
    };
  let j = compareSameContainment(ids.commonDir, ids.gitDir) !== "distinct";
  for (let L of S) {
    let included = s.includes(L.root);
    let Q = compareWithOutsideContainment(L.root, worktreePath);
    if (Q !== "same" && y.has(L.root) && !h.has(L.root) && mayBeOutside(worktreePath, L.root)) {
      if (!j && isOwnRepositoryCheckout(worktreePath, ids.commonDir)) continue;
      if (!j)
        return {
          ok: false,
          reason: "pin-is-own-launch-tree",
          message: stripControlCharsForMessage(
            `The worktree ${worktreePath} contains the directory this resume ran from, and nothing in this session vouches for its worktree registration \u2014 an isolation worktree never contains its own launch position. Run the resume from the project checkout instead.`,
          ),
        };
      return {
        ok: false,
        reason: "pin-is-own-launch-tree",
        message: stripControlCharsForMessage(
          `This resume was started from inside ${worktreePath} (or a directory it contains), which is its own repository \u2014 it cannot be confirmed as a separate isolation worktree from there. Run the resume from the project checkout instead.`,
        ),
      };
    }
    if (Q === "same") {
      if (included && h.has(L.root))
        return {
          ok: false,
          reason: "pin-is-protected-checkout",
          message: stripControlCharsForMessage(
            `Refusing to use ${worktreePath} as an isolation worktree: it is the checkout this session launched from. An honest launch-from-inside and a forged record are indistinguishable here, so both are refused \u2014 launch from the parent checkout to enter or resume this worktree.`,
          ),
        };
      if (included && j)
        return {
          ok: false,
          reason: "pin-is-own-launch-tree",
          message: stripControlCharsForMessage(
            `This resume was started from inside ${worktreePath}, which is its own repository \u2014 it cannot be confirmed as a separate isolation worktree from there. Run the resume from the project checkout instead.`,
          ),
        };
      continue;
    }
    if (L.entry === "unverifiable")
      return unverifiableIsolationResult(
        worktreePath,
        `the protected checkout ${L.root} has a .git entry that could not be examined`,
      );
    if (typeof L.ids !== "object") {
      if (L.ids === "no-repo") continue;
      return unverifiableIsolationResult(
        worktreePath,
        `the protected checkout ${L.root} has git metadata that could not be resolved`,
      );
    }
    let Z = compareWithOutsideContainment(ids.gitDir, L.ids.gitDir);
    if (Z === "indeterminate")
      return unverifiableIsolationResult(
        worktreePath,
        `its git directory (${ids.gitDir}) could not be safely compared with the protected checkout's`,
      );
    if (Z === "same")
      return {
        ok: false,
        reason: "shared-git-dir",
        message: stripControlCharsForMessage(
          `Refusing to use ${worktreePath} as an isolation worktree: its git directory is the shared checkout's own (${ids.gitDir}), so git commands there move the protected checkout's branches and refs. This usually means the worktree's .git file is stale or was rewritten \u2014 recreate the worktree, then retry.`,
        ),
      };
  }
  if (j && h.size === 0) {
    if (w)
      return {
        ok: false,
        reason: "pin-is-own-launch-tree",
        message: stripControlCharsForMessage(
          `The worktree ${worktreePath} is its own repository and nothing vouches for it from this session \u2014 it cannot be resumed or re-entered. Re-create it (a fresh isolated tree); the existing tree and its work remain on disk at ${worktreePath} for manual recovery.`,
        ),
      };
    if (R) {
      for (let L of y)
        if (compareWithOutsideContainment(L, worktreePath) !== "same" && mayBeOutside(L, worktreePath))
          return {
            ok: false,
            reason: "pin-is-own-launch-tree",
            message: stripControlCharsForMessage(
              `The worktree ${worktreePath} sits under the directory this resume ran from, and nothing else vouches for it \u2014 it cannot be resumed or re-entered. Re-create it (a fresh isolated tree); the existing tree and its work remain on disk at ${worktreePath} for manual recovery. Where it has a parent checkout, resuming from there also works.`,
            ),
          };
    }
  }
  for (let L of s) {
    if (compareWithOutsideContainment(L, worktreePath) === "same") continue;
    if (!mayBeOutside(worktreePath, L)) continue;
    if (y.has(L) && !h.has(L)) {
      if (!j && isOwnRepositoryCheckout(worktreePath, ids.commonDir)) continue;
      if (!j)
        return {
          ok: false,
          reason: "pin-is-own-launch-tree",
          message: stripControlCharsForMessage(
            `The worktree ${worktreePath} contains the directory this resume ran from, and nothing in this session vouches for its worktree registration \u2014 an isolation worktree never contains its own launch position. Run the resume from the project checkout instead.`,
          ),
        };
      return {
        ok: false,
        reason: "pin-is-own-launch-tree",
        message: stripControlCharsForMessage(
          `This resume was started from inside ${worktreePath} (or a directory it contains), which is its own repository \u2014 it cannot be confirmed as a separate isolation worktree from there. Run the resume from the project checkout instead.`,
        ),
      };
    }
    return {
      ok: false,
      reason: "pin-is-protected-checkout",
      message: stripControlCharsForMessage(
        `Refusing to use ${worktreePath} as an isolation worktree: it contains the protected checkout ${L}, so adopting it would disarm every isolation check for that checkout.`,
      ),
    };
  }
  let G = compareSameContainment(ids.commonDir, ids.gitDir);
  if (G === "indeterminate")
    return unverifiableIsolationResult(
      worktreePath,
      `its git metadata (common dir ${ids.commonDir}) could not be safely compared`,
    );
  if (G === "distinct") {
    let L = compareSameContainment(dirname(ids.gitDir), join(ids.commonDir, "worktrees"));
    let q =
      ids.backPointer !== null &&
      compareSameContainment(resolve(ids.gitDir, ids.backPointer), join(worktreePath, ".git")) === "same";
    if (L !== "same" || !q)
      return {
        ok: false,
        reason: "invalid-linked-worktree",
        message: stripControlCharsForMessage(
          `Refusing to use ${worktreePath} as an isolation worktree: it uses another repository's refs (${ids.commonDir}) without being a registered worktree of it (its admin directory or back-pointer does not check out). Recreate the worktree with git worktree add, then retry.`,
        ),
      };
  }
  return {
    ok: true,
    reason: "verified",
  };
}
//@ chunk-s61vbvea.js:441228-441335 placement
function candidateRepoRoots(worktreePath, n, r) {
  let s = basename(r.commonDir) === ".git" ? dirname(r.commonDir) : null;
  return uniq([...n, ...(s !== null ? [s] : [])]);
}
//@ chunk-s61vbvea.js:441335-441614 placement
/**
 * 返回 {ok:false, reason:"unverifiable"}：worktree 的 git 身份无法核验，拒绝用作隔离 worktree 的说明。
 */
function unverifiableIsolationResult(e, n) {
  return {
    ok: false,
    reason: "unverifiable",
    message: stripControlCharsForMessage(
      `Refusing to use ${e} as an isolation worktree: ${n}, so its git identity could not be verified. Isolation is refused rather than assumed \u2014 recreate the worktree (or remove the corrupt .git entry) and retry.`,
    ),
  };
}
//@ chunk-s61vbvea.js:441614-441710 placement
async function readGitIdentityAsync(e) {
  let [n, gitDirs] = await Promise.all([gitEntryPresenceAsync(join(e, ".git")), readGitDirs(e)]);
  return {
    entry: n,
    ids: gitDirs,
  };
}
//@ chunk-s61vbvea.js:441710-441766 placement
function readGitIdentitySync(cwd) {
  return {
    entry: gitEntryPresenceSync(join(cwd, ".git")),
    ids: probeGitIdentitySync(cwd),
  };
}
//@ chunk-s61vbvea.js:441766-441843 placement
async function gitEntryPresenceAsync(e) {
  try {
    await lstat(e);
    return "present";
  } catch (error) {
    return classifyGitEntryError(error);
  }
}
//@ chunk-s61vbvea.js:441843-441908 placement
function gitEntryPresenceSync(e) {
  try {
    lstatSync(e);
    return "present";
  } catch (error) {
    return classifyGitEntryError(error);
  }
}
//@ chunk-s61vbvea.js:441908-441986 placement
async function isSymlinkAsync(worktreePath) {
  try {
    return (await lstat(worktreePath)).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:441986-442051 placement
function isSymlinkSync(worktreePath) {
  try {
    return lstatSync(worktreePath).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:442051-442136 placement
function classifyGitEntryError(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "unverifiable";
}
//@ chunk-s61vbvea.js:442136-442229 placement
var GIT_IDENTITY_TIMEOUT_MS = 2000;
var GIT_IDENTITY_ARGS = [
  ...GIT_SAFE_GLOBAL_ARGS,
  "rev-parse",
  "--absolute-git-dir",
  "--show-toplevel",
  "--git-common-dir",
];
//@ chunk-s61vbvea.js:442229-443089 placement
async function readGitDirs(realCandidate) {
  let n = await execFileNoThrowWithCwd(gitExe(), [...GIT_IDENTITY_ARGS], {
    cwd: realCandidate,
    env: getRemoteHostSessionCount(),
    timeout: GIT_IDENTITY_TIMEOUT_MS,
    useToolMemoryCgroup: false,
    preserveOutputOnError: true,
  });
  if (n.code !== 0) {
    if (await readDirNamesCapped(realCandidate)) return "no-repo";
    if (isNotWorkTreeError(n.stderr)) {
      let y = await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--absolute-git-dir", "--git-common-dir"],
        {
          cwd: realCandidate,
          env: getRemoteHostSessionCount(),
          timeout: GIT_IDENTITY_TIMEOUT_MS,
          useToolMemoryCgroup: false,
          preserveOutputOnError: true,
        },
      );
      if (y.code === 0) {
        let bareRevParse = parseBareRevParse(realCandidate, y.stdout);
        if (bareRevParse !== null) {
          let [gitdirFile, R] = await Promise.all([
            readGitdirFile(bareRevParse.gitDir),
            scanGitDirSymlinks(bareRevParse.gitDir),
          ]);
          return {
            ...bareRevParse,
            backPointer: gitdirFile,
            symlinkedRefStore: R.symlinks,
            unexaminableRefStore: R.unexaminable,
          };
        }
      }
      return "error";
    }
    if (isNotGitRepoError(n.stderr)) return "no-repo";
    if (typeof n.exitCode === "number" && (await noGitAncestorEntries(realCandidate))) return "no-repo";
    return "error";
  }
  let revParseOutput = parseRevParseOutput(realCandidate, n.stdout);
  if (revParseOutput === null) return "error";
  let [gitdirFile, h] = await Promise.all([
    readGitdirFile(revParseOutput.gitDir),
    scanGitDirSymlinks(revParseOutput.gitDir),
  ]);
  return {
    ...revParseOutput,
    backPointer: gitdirFile,
    symlinkedRefStore: h.symlinks,
    unexaminableRefStore: h.unexaminable,
  };
}
//@ chunk-s61vbvea.js:443089-443978 placement
/**
 * 同步运行 git rev-parse 探测目录的 git 身份：失败时区分无仓库、裸仓库（再探 absolute-git-dir / common-dir）与错误，成功时附带 git 目录的符号链接检查结果。
 */
function probeGitIdentitySync(cwd) {
  let result;
  try {
    result = safeExecFileSync(gitExe(), [...GIT_IDENTITY_ARGS], {
      cwd,
      env: getRemoteHostSessionCount(),
      reject: false,
      timeout: GIT_IDENTITY_TIMEOUT_MS,
      useToolMemoryCgroup: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return "error";
  }
  if (result.exitCode !== 0) {
    if (readDirNamesCappedSync(cwd)) return "no-repo";
    if (isNotWorkTreeError(result.stderr)) {
      let fallback;
      try {
        fallback = safeExecFileSync(
          gitExe(),
          [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--absolute-git-dir", "--git-common-dir"],
          {
            cwd,
            env: getRemoteHostSessionCount(),
            reject: false,
            timeout: GIT_IDENTITY_TIMEOUT_MS,
            useToolMemoryCgroup: false,
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
      } catch {
        return "error";
      }
      if (fallback.exitCode === 0) {
        let fallbackDirs = parseBareRevParse(cwd, fallback.stdout);
        if (fallbackDirs !== null) {
          let fallbackRefScan = scanGitDirSymlinksSync(fallbackDirs.gitDir);
          return {
            ...fallbackDirs,
            backPointer: readGitdirFileSync(fallbackDirs.gitDir),
            symlinkedRefStore: fallbackRefScan.symlinks,
            unexaminableRefStore: fallbackRefScan.unexaminable,
          };
        }
      }
      return "error";
    }
    if (isNotGitRepoError(result.stderr)) return "no-repo";
    if (typeof result.exitCode === "number" && result.timedOut !== true && hasNoRepoAncestor(cwd))
      return "no-repo";
    return "error";
  }
  let dirs = parseRevParseOutput(cwd, result.stdout);
  if (dirs === null) return "error";
  let refScan = scanGitDirSymlinksSync(dirs.gitDir);
  return {
    ...dirs,
    backPointer: readGitdirFileSync(dirs.gitDir),
    symlinkedRefStore: refScan.symlinks,
    unexaminableRefStore: refScan.unexaminable,
  };
}
//@ chunk-s61vbvea.js:443978-444047 placement
/**
 * 把控制字符替换为空格，用于提示文案。
 */
function stripControlCharsForMessage(e) {
  return e.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
}
//@ chunk-s61vbvea.js:444047-444157 placement
function isNotGitRepoError(stderr) {
  return /not a git repository/i.test(stderr) || /gitfile does not point to a valid repository/i.test(stderr);
}
//@ chunk-s61vbvea.js:444157-444281 placement
async function noGitAncestorEntries(e) {
  let n = gitAncestorEntryPaths(e);
  if (n === null) return false;
  return (await Promise.all(n.map((s) => gitEntryPresenceAsync(s)))).every((s) => s === "absent");
}
//@ chunk-s61vbvea.js:444281-444356 placement
function hasNoRepoAncestor(cwd) {
  let n = gitAncestorEntryPaths(cwd);
  return n !== null && n.every((r) => gitEntryPresenceSync(r) === "absent");
}
//@ chunk-s61vbvea.js:444356-444669 placement
/**
 * 列出路径各级祖先下的 .git 与 HEAD 路径（Windows 或无法规范化、非 UTF-8 时返回 null），用于确认祖先中没有仓库。
 */
function gitAncestorEntryPaths(e) {
  if (getPlatform_2() === "windows") return null;
  if (resolveContainmentTarget(e).canonical === null) return null;
  let n;
  try {
    let s = realpathSync.native(e, {
      encoding: "buffer",
    });
    n = s.toString("utf8");
    if (!Buffer.from(n, "utf8").equals(s)) return null;
  } catch {
    return null;
  }
  let r = [];
  for (let s = n; ;) {
    r.push(join(s, ".git"), join(s, "HEAD"));
    let h = dirname(s);
    if (h === s) return r;
    s = h;
  }
}
//@ chunk-s61vbvea.js:444669-444772 placement = isRealPathWithinTeamDir (1)
async function readDirNamesCapped(realCandidate) {
  try {
    await lstat(realCandidate);
    return false;
  } catch (e) {
    let code = getErrnoCode(e);
    return code === "ENOENT" || code === "ENOTDIR";
  }
}
//@ chunk-s61vbvea.js:444772-444863 placement = isRealPathWithinTeamDir (1)
function readDirNamesCappedSync(realCandidate) {
  try {
    lstatSync(realCandidate);
    return false;
  } catch (e) {
    let code = getErrnoCode(e);
    return code === "ENOENT" || code === "ENOTDIR";
  }
}
//@ chunk-s61vbvea.js:444863-444941 placement
function isNotWorkTreeError(stderr) {
  return stderr.includes("this operation must be run in a work tree");
}
//@ chunk-s61vbvea.js:444941-445174 placement
function parseBareRevParse(e, stdout) {
  let filtered = stdout
    .split(
      `
`,
    )
    .filter((line) => line.length > 0);
  if (filtered.length !== 2) return null;
  if (filtered.some((h) => /[\u0000-\u001f\u007f-\u009f]/.test(h))) return null;
  let s = filtered[1];
  return {
    gitDir: filtered[0],
    topLevel: e,
    commonDir: isAbsolute(s) ? s : join(e, s),
    isBare: true,
  };
}
//@ chunk-s61vbvea.js:445174-445400 placement
function parseRevParseOutput(e, stdout) {
  let filtered = stdout
    .split(
      `
`,
    )
    .filter((line) => line.length > 0);
  if (filtered.length !== 3) return null;
  if (filtered.some((h) => /[\u0000-\u001f\u007f-\u009f]/.test(h))) return null;
  let s = filtered[2];
  return {
    gitDir: filtered[0],
    topLevel: filtered[1],
    commonDir: isAbsolute(s) ? s : resolve(e, s),
  };
}
//@ chunk-s61vbvea.js:445400-445413 placement
var MAX_GITDIR_FILE_BYTES = 65536;
//@ chunk-s61vbvea.js:445413-445711 placement
async function readGitdirFile(gitDir) {
  try {
    if (!(await lstat(join(gitDir, "gitdir"))).isFile()) return null;
    let r = await open(join(gitDir, "gitdir"), "r");
    try {
      if ((await r.stat()).size > MAX_GITDIR_FILE_BYTES) return null;
      let s = Buffer.alloc(MAX_GITDIR_FILE_BYTES);
      let { bytesRead } = await r.read(s, 0, MAX_GITDIR_FILE_BYTES, 0);
      return s.toString("utf-8", 0, bytesRead).trim();
    } finally {
      await r.close();
    }
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:445711-445948 placement
function readGitdirFileSync(gitDir) {
  try {
    if (!lstatSync(join(gitDir, "gitdir")).isFile()) return null;
    let n = openSync(join(gitDir, "gitdir"), "r");
    try {
      if (fstatSync(n).size > MAX_GITDIR_FILE_BYTES) return null;
      let r = Buffer.alloc(MAX_GITDIR_FILE_BYTES);
      let s = readSync(n, r, 0, MAX_GITDIR_FILE_BYTES, 0);
      return r.toString("utf-8", 0, s).trim();
    } finally {
      closeSync(n);
    }
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:445948-445966 placement
var MAX_SYMLINK_SCAN_DEPTH = 12;
var MAX_SYMLINK_SCAN_ENTRIES = 4096;
//@ chunk-s61vbvea.js:445966-446361 placement
/**
 * 扫描 git 目录顶层与 refs/ 下的符号链接（有条目数与深度上限），返回 {symlinks, unexaminable}。
 */
async function scanGitDirSymlinks(gitDir) {
  let symlinks = [];
  let unexaminable = [];
  let s;
  try {
    s = await readdir(gitDir);
  } catch (error) {
    if (classifyGitEntryError(error) !== "absent") unexaminable.push("(git dir unreadable)");
    s = [];
  }
  if (s.length > MAX_SYMLINK_SCAN_ENTRIES) {
    unexaminable.push("(over-cap top-level entries)");
    s = [];
  }
  await Promise.all(
    s.map(async (h) => {
      try {
        if ((await lstat(join(gitDir, h))).isSymbolicLink()) symlinks.push(h);
      } catch (error) {
        if (classifyGitEntryError(error) !== "absent") unexaminable.push(h);
      }
    }),
  );
  await scanRefsSymlinks(join(gitDir, "refs"), "refs", 0, symlinks, unexaminable, {
    entries: MAX_SYMLINK_SCAN_ENTRIES,
  });
  return {
    symlinks,
    unexaminable,
  };
}
//@ chunk-s61vbvea.js:446361-446877 placement
/**
 * 递归扫描 refs 目录中的符号链接，超过深度/条目上限或无法读取时记入 unexaminable。
 */
async function scanRefsSymlinks(dir, label, depth, symlinks, unexaminable, budget) {
  if (depth > MAX_SYMLINK_SCAN_DEPTH) {
    unexaminable.push(`${label} (too deep to examine)`);
    return;
  }
  if (budget.entries <= 0) {
    unexaminable.push(`${label} (too many entries to examine)`);
    return;
  }
  let S;
  try {
    S = await readdir(dir);
  } catch (error) {
    if (classifyGitEntryError(error) !== "absent") unexaminable.push(`${label} (unreadable)`);
    return;
  }
  for (let w of S) {
    if (--budget.entries < 0) {
      unexaminable.push(`${label} (too many entries to examine)`);
      return;
    }
    let dir_2 = join(dir, w);
    let label_2 = `${label}/${w}`;
    try {
      let P = await lstat(dir_2);
      if (P.isSymbolicLink()) symlinks.push(label_2);
      else if (P.isDirectory())
        await scanRefsSymlinks(dir_2, label_2, depth + 1, symlinks, unexaminable, budget);
    } catch (error) {
      if (classifyGitEntryError(error) !== "absent") unexaminable.push(`${label_2} (unreadable)`);
    }
  }
}
//@ chunk-s61vbvea.js:446877-447222 placement
/**
 * 同步扫描 git 目录顶层与 refs 下的符号链接，返回符号链接列表和无法检查的项（不可读、条目超限等）。
 */
function scanGitDirSymlinksSync(gitDir) {
  let n = [];
  let r = [];
  let s;
  try {
    s = readdirSync(gitDir);
  } catch (error) {
    if (classifyGitEntryError(error) !== "absent") r.push("(git dir unreadable)");
    s = [];
  }
  if (s.length > MAX_SYMLINK_SCAN_ENTRIES) {
    r.push("(over-cap top-level entries)");
    s = [];
  }
  for (let h of s)
    try {
      if (lstatSync(join(gitDir, h)).isSymbolicLink()) n.push(h);
    } catch (error) {
      if (classifyGitEntryError(error) !== "absent") r.push(h);
    }
  scanRefsSymlinksSync(join(gitDir, "refs"), "refs", 0, n, r, {
    entries: MAX_SYMLINK_SCAN_ENTRIES,
  });
  return {
    symlinks: n,
    unexaminable: r,
  };
}
//@ chunk-s61vbvea.js:447222-447714 placement
/**
 * 递归扫描 refs 目录中的符号链接：受深度与总条目数限制，超限或不可读的位置记入无法检查列表。
 */
function scanRefsSymlinksSync(e, n, r, s, h, y) {
  if (r > MAX_SYMLINK_SCAN_DEPTH) {
    h.push(`${n} (too deep to examine)`);
    return;
  }
  if (y.entries <= 0) {
    h.push(`${n} (too many entries to examine)`);
    return;
  }
  let S;
  try {
    S = readdirSync(e);
  } catch (error) {
    if (classifyGitEntryError(error) !== "absent") h.push(`${n} (unreadable)`);
    return;
  }
  for (let w of S) {
    if (--y.entries < 0) {
      h.push(`${n} (too many entries to examine)`);
      return;
    }
    let R = join(e, w);
    let x = `${n}/${w}`;
    try {
      let P = lstatSync(R);
      if (P.isSymbolicLink()) s.push(x);
      else if (P.isDirectory()) scanRefsSymlinksSync(R, x, r + 1, s, h, y);
    } catch (error) {
      if (classifyGitEntryError(error) !== "absent") h.push(`${x} (unreadable)`);
    }
  }
}
//@ chunk-s61vbvea.js:447714-447878 placement
function comparePathTargets(e, n, r) {
  let containmentTarget = resolveContainmentTarget(e);
  let containmentTarget_2 = resolveContainmentTarget(n);
  if (hasUnresolvedCanonicalPath(containmentTarget) || hasUnresolvedCanonicalPath(containmentTarget_2))
    return "indeterminate";
  if (containmentTarget.skipped !== containmentTarget_2.skipped) return "indeterminate";
  return r(containmentTarget, containmentTarget_2) && r(containmentTarget_2, containmentTarget)
    ? "same"
    : "distinct";
}
//@ chunk-s61vbvea.js:447878-447990 placement
function mayBeOutside(e, n) {
  let containmentTarget = resolveContainmentTarget(e);
  let containmentTarget_2 = resolveContainmentTarget(n);
  if (hasUnresolvedCanonicalPath(containmentTarget) || hasUnresolvedCanonicalPath(containmentTarget_2))
    return true;
  if (containmentTarget.skipped !== containmentTarget_2.skipped) return true;
  return isOutsideContainment(containmentTarget_2, containmentTarget);
}
//@ chunk-s61vbvea.js:447990-448026 placement
function compareWithOutsideContainment(e, n) {
  return comparePathTargets(e, n, isOutsideContainment);
}
//@ chunk-s61vbvea.js:448026-448062 placement
/**
 * 两个路径的包含关系比较（同路径判定）。
 */
function compareSameContainment(e, n) {
  return comparePathTargets(e, n, isSameContainmentPath);
}
//@ chunk-s61vbvea.js:448062-448139 placement
function isOwnRepositoryCheckout(e, commonDir) {
  let r = worktreeLocationOf(e);
  return r !== null && compareWithOutsideContainment(r.checkout, dirname(commonDir)) === "same";
}
//@ chunk-s61vbvea.js:448139-448361 placement
/**
 * 判断 worktree 路径确属一个仓库，且该仓库与给定的某个目录的规范 git 根相同（三处 R6 身份比对都为 same）。
 */
function isSameRepoWorktree(worktreePath, n) {
  let repoRootForWorktreePath = getRepoRootForWorktreePath(worktreePath);
  if (repoRootForWorktreePath === null) return false;
  let gitRootUncached = findGitRootUncached(worktreePath);
  if (gitRootUncached === null || compareSameContainment(gitRootUncached, worktreePath) !== "same")
    return false;
  let canonicalGitRootUncached = findCanonicalGitRootUncached(worktreePath);
  if (
    canonicalGitRootUncached === null ||
    compareSameContainment(repoRootForWorktreePath, canonicalGitRootUncached) !== "same"
  )
    return false;
  return n.some((y) => {
    let canonicalGitRoot = findCanonicalGitRoot(y);
    return (
      canonicalGitRoot !== null &&
      compareSameContainment(repoRootForWorktreePath, canonicalGitRoot) === "same"
    );
  });
}
//@ chunk-s61vbvea.js:448361-448485 placement
/**
 * 求路径所属的 git 根目录（普通与规范化根，加上额外候选），排除特殊路径并去重。
 */
function gitRootsForPath(e, ...n) {
  if (isNonWslUncPath(e) || isNetworkMountRoot(e)) return [];
  return uniq(
    [findGitRoot(e), findCanonicalGitRoot(e), ...n].filter(
      (r) => r !== null && r !== undefined && !isNonWslUncPath(r) && !isNetworkMountRoot(r),
    ),
  );
}
//@ chunk-s61vbvea.js:448485-449839 placement
function BLOCKED_CWD_MESSAGES(path, worktreePath) {
  {
    let r = sharedCheckoutRoots(path, worktreePath);
    if (r.escaped) {
      if (hasUnresolvedCanonicalPath(r.dir))
        return `This command was blocked because its working directory is spelled in a form that cannot be safely resolved (for example through a symlink storing a raw dot segment, a network-share or device-namespace shape, or an unreadable ancestor directory). If the directory is inside the worktree ${worktreePath}, re-run the command from its direct symlink-free path.`;
      if (r.dir.skipped && !r.roots.some((root) => root.skipped || hasUnresolvedCanonicalPath(root)))
        return `This command was blocked because its working directory is network-shaped (a UNC share or /net automount spelling) while the protected checkout is local. If the directory is genuinely inside the worktree ${worktreePath}, re-run the command from its local, plainly-spelled path.`;
      let { noun, possessive } = isolationSubjectWords(worktreePath);
      let y = hasHostWorktreeDeclaration() ? null : linkedWorktreeRepoRoot(r);
      if (y !== null) {
        let S = stripControlCharsForMessage(worktreePath);
        return `${noun} is isolated in the worktree ${S}, but this command's working directory (${stripControlCharsForMessage(path)}) is in a different worktree (${stripControlCharsForMessage(y)}). Refusing to run it there \u2014 ${possessive} commands must run inside its own worktree. Re-run the command from ${S}.`;
      }
      return `${noun} is isolated in the worktree ${worktreePath}, but this command's working directory resolved to the shared checkout (${path}). Refusing to run it there \u2014 ${possessive} commands must run inside its worktree. Re-run the command from ${worktreePath}.${describeCaseOnlyMismatch(r.dir.canonical, r.worktree.canonical, worktreePath)}`;
    }
  }
  return null;
}
//@ chunk-s61vbvea.js:449839-449967 placement
function linkedWorktreeRepoRoot(e) {
  let canonical = e.dir.canonical;
  let canonical_2 = e.worktree.canonical;
  if (canonical === null || canonical_2 === null || isCanonicalUnderRoot(canonical, canonical_2)) return null;
  return isLinkedWorktree(canonical) ? findGitRoot(canonical) : null;
}
//@ chunk-s61vbvea.js:449967-450139 placement
/**
 * worktree 隔离提示中的主语：当前会话的 worktree 时称 This session，否则称 This agent。
 */
function isolationSubjectWords(e) {
  return getCurrentWorktreeSession()?.worktreePath === e
    ? {
        noun: "This session",
        possessive: "a worktree-isolated session's",
      }
    : {
        noun: "This agent",
        possessive: "a worktree-isolated agent's",
      };
}
//@ chunk-s61vbvea.js:450139-450181 placement
/**
 * 共享检出根的越界部分。
 */
function escapedSharedRoots(path, worktreePath) {
  return sharedCheckoutRoots(path, worktreePath).escaped;
}
//@ chunk-s61vbvea.js:450181-450855 placement
/**
 * 计算隔离 worktree 需要拦住的共享检出根：原始 cwd、会话启动锚点及其 git 根/规范 git 根，统一做包含判断解析。
 */
function sharedCheckoutRoots(path, worktreePath) {
  let containmentTarget = resolveContainmentTarget(path);
  let currentWorktreeSession = getCurrentWorktreeSession();
  let h = null;
  let y = uniq(
    (currentWorktreeSession !== null && currentWorktreeSession.worktreePath === worktreePath
      ? [currentWorktreeSession.originalCwd]
      : [getOriginalCwd(), currentWorktreeSession?.originalCwd]
    ).filter((q) => q !== undefined && q !== ""),
  );
  let liveLaunchAnchor =
    currentWorktreeSession?.liveLaunchAnchor !== undefined && currentWorktreeSession.liveLaunchAnchor !== ""
      ? currentWorktreeSession.liveLaunchAnchor
      : undefined;
  let w =
    liveLaunchAnchor !== undefined &&
    (isNonWslUncPath(liveLaunchAnchor) || isNetworkMountRoot(liveLaunchAnchor));
  let R = () => linkedRepoRootOf(worktreePath);
  let x =
    liveLaunchAnchor !== undefined && !w
      ? [findGitRoot(liveLaunchAnchor), findCanonicalGitRoot(liveLaunchAnchor)].filter(
          (q) => q !== null && q !== undefined,
        )
      : [];
  let P = R();
  let j = x.length > 0;
  let G = [
    ...y.flatMap((q) =>
      isNonWslUncPath(q) || isNetworkMountRoot(q) ? [q] : [findGitRoot(q) ?? q, findCanonicalGitRoot(q)],
    ),
    ...x,
    ...(liveLaunchAnchor !== undefined && !j ? [liveLaunchAnchor] : []),
    P,
  ];
  let mapped = uniq(G.filter((q) => q !== null)).map((q) => resolveContainmentTarget(q));
  if (!mapped.some((q) => isOutsideContainment(containmentTarget, q)))
    return {
      dir: containmentTarget,
      worktree: h,
      roots: mapped,
      escaped: false,
    };
  h ??= resolveContainmentTarget(worktreePath);
  if (isSameContainmentPath(containmentTarget, h))
    return {
      dir: containmentTarget,
      worktree: h,
      roots: mapped,
      escaped: false,
    };
  return {
    dir: containmentTarget,
    worktree: h,
    roots: mapped,
    escaped: true,
  };
}
//@ chunk-s61vbvea.js:450855-450956 placement
function canonicalRepoRootOrSentinel(e) {
  if (!isLinkedWorktree(e)) return REPO_NEGATIVE_RESULT;
  let containmentTarget = resolveContainmentTarget(e);
  if (!detectTerminal(findGitRoot(e), containmentTarget.lexical)) return REPO_NEGATIVE_RESULT;
  return findCanonicalGitRoot(e) ?? REPO_NEGATIVE_RESULT;
}
//@ chunk-s61vbvea.js:450956-451034 placement
function linkedRepoRootOf(worktreePath) {
  let n = memoizeMap(getGitRepoCache().linkedFromRootByPin, worktreePath, canonicalRepoRootOrSentinel);
  return n === REPO_NEGATIVE_RESULT ? null : n;
}
//@ chunk-s61vbvea.js:451034-451166 placement = detectTerminal (0.92)
function detectTerminal(gitRoot, lexical, r = "linux") {
  if (gitRoot === null) return false;
  let s = r === "darwin" ? isSystemVolumePath(gitRoot) : gitRoot;
  if (r !== "win32") s = isNetworkMountPath_2(s, r);
  else s = toWin32Backslashes(isWslLocalhostPath(s));
  return s === lexical;
}
//@ chunk-s61vbvea.js:451166-451191 placement
var z0 = Object.freeze({});
//@ chunk-s61vbvea.js:451191-451302 placement
class IsolationRuntimeSlot {
  #e;
  register(e) {
    this.#e ??= e;
  }
  get runtime() {
    return this.#e ?? z0;
  }
  get registered() {
    return this.#e !== undefined;
  }
}
//@ chunk-s61vbvea.js:451302-451327 placement
var isolationRuntimeByHost = new HostScoped(() => new IsolationRuntimeSlot());
//@ chunk-s61vbvea.js:451327-451364 placement
function isolationRuntime() {
  return isolationRuntimeByHost.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:451364-451397 placement
/**
 * 注册隔离运行时。
 */
function registerIsolationRuntime(e) {
  isolationRuntime().register(e);
}
//@ chunk-s61vbvea.js:451397-451432 placement
/**
 * 取隔离运行时服务。
 */
function isolationRuntimeService() {
  return isolationRuntime().runtime;
}
//@ chunk-e6aww6q8.js:1369111-1369264 placement
/**
 * 后台会话隔离方式：环境变量 CLAUDE_BG_ISOLATION（worktree/none）优先，其次后台接管设置，最后读 settings.worktree.bgIsolation。
 */
function getBgIsolationSetting() {
  let CLAUDE_BG_ISOLATION = env.CLAUDE_BG_ISOLATION;
  if (CLAUDE_BG_ISOLATION === "worktree" || CLAUDE_BG_ISOLATION === "none") return CLAUDE_BG_ISOLATION;
  let bgTakeover = getBgTakeover();
  if (bgTakeover) return bgTakeover.bgIsolation;
  return getInitialSettings_2().worktree?.bgIsolation;
}
//@ chunk-e6aww6q8.js:1369264-1371063 placement
/**
 * 检查路径是否在 worktree 隔离范围内，范围外时提示改写 worktree 中的副本。
 */
function checkWorktreeIsolation_2(path, n) {
  {
    let worktreePath = isolationWorktreeFor(n);
    if (worktreePath) {
      let G = sharedCheckoutRoots(path, worktreePath);
      if (!G.escaped) return worktreeFenceWriteNotice(path, worktreePath);
      let q = pathContainmentKind(G.dir, G.roots);
      if (q === "unresolvable") return unresolvableWriteMessage(worktreePath);
      if (q === "network") return networkWriteMessage(worktreePath);
      let { noun } = isolationSubjectWords(worktreePath);
      let Se = hasHostWorktreeDeclaration() ? null : linkedWorktreeRepoRoot(G);
      if (Se !== null) {
        let ke = stripControlCharsForMessage(worktreePath);
        return `${noun} is isolated in the worktree ${ke}, so its writes are limited to that folder. This path is in a different worktree (${stripControlCharsForMessage(Se)}). Edit the copy of this file under ${ke} instead.`;
      }
      return isolatedWorktreeEditMessage(noun, worktreePath, G.dir.canonical, G.worktree.canonical);
    }
    let s = worktreeFenceWriteNotice(path);
    if (s !== null) return s;
    if (!isBackgroundSession()) return null;
    if (getBgIsolationSetting() === "none") return null;
    let h = n.agentId ? getOriginalCwd() : getCwd();
    let containmentTarget = resolveContainmentTarget(path);
    let containmentTarget_2 = resolveContainmentTarget(h);
    if (!isOutsideContainment(containmentTarget, containmentTarget_2)) return null;
    if (!findGitRoot(h) && (!hasWorktreeCreateHook() || isIsolationUnavailableForCwd(h))) return null;
    if (isLinkedWorktree(h)) return null;
    if (containmentTarget.canonical !== null && isLinkedWorktreeUncached(containmentTarget.canonical))
      return null;
    let w = pathContainmentKind(containmentTarget, containmentTarget_2);
    if (w === "unresolvable") return unresolvableWriteMessage();
    if (w === "network") return networkWriteMessage();
    let L = containmentTarget_2.canonical !== null;
    if (n.agentId)
      return `This subagent's parent bg session hasn't isolated yet, so writes to the shared checkout are blocked. Re-spawn this agent with \`isolation: "worktree"\`${L ? `, have the parent call ${ENTER_WORKTREE_TOOL_NAME} before spawning, or make the edit inside a linked git worktree you create for this task with \`git worktree add\` \u2014 paths inside a worktree are accepted` : `, or have the parent call ${ENTER_WORKTREE_TOOL_NAME} before spawning`}. (To disable this guard for this repo, set \`"worktree": {"bgIsolation": "none"}\` in .claude/settings.json.)`;
    return `This background session hasn't isolated its changes yet. Call ${ENTER_WORKTREE_TOOL_NAME} first so edits land in a worktree instead of the shared checkout, then retry this edit using the worktree path${L ? " (a path inside a linked git worktree, including one you create with `git worktree add`, is accepted)" : ""}. (To disable this guard for this repo, set \`"worktree": {"bgIsolation": "none"}\` in .claude/settings.json.)`;
  }
  return null;
}
//@ chunk-e6aww6q8.js:1371063-1371467 placement
/**
 * 写入路径落在 worktree 围栏内的共享检出而非当前 worktree 时，返回提示"请编辑 worktree 中的副本"；在配置目录内等情况放行（返回 null）。
 */
function worktreeFenceWriteNotice(e, n) {
  let r = describeWorktreeWriteFence();
  if (r === undefined) return null;
  let canonical = resolveContainmentTarget(e).canonical;
  let h = n === undefined ? r.tree : resolveContainmentTarget(n).canonical;
  if (canonical === null || h === null) return null;
  let filtered = r.fence.filter((L) => isPathContainedIn(L, canonical));
  if (filtered.length === 0 || isPathContainedIn(r.tree, canonical) || isPathContainedIn(h, canonical))
    return null;
  let S = resolve(getClaudeConfigDir());
  let canonical_2 = resolveContainmentTarget(nativeRealpathLong(S) ?? S).canonical;
  if (
    canonical_2 !== null &&
    isPathContainedIn(canonical_2, canonical) &&
    filtered.every((L) => isPathContainedIn(L, canonical_2))
  )
    return null;
  return isolatedWorktreeEditMessage(
    n === undefined ? "This session" : isolationSubjectWords(n).noun,
    stripControlCharsForMessage(n ?? r.tree),
    canonical,
    h,
  );
}
//@ chunk-e6aww6q8.js:1371467-1371622 placement
function isolatedWorktreeEditMessage(e, n, canonical, s) {
  return `${e} is isolated in the worktree ${n}. Edit the worktree copy of this file instead of the shared-checkout path.${describeCaseOnlyMismatch(canonical, s, n)}`;
}
//@ chunk-e6aww6q8.js:1371622-1371778 placement
function pathContainmentKind(e, n) {
  if (hasUnresolvedCanonicalPath(e)) return "unresolvable";
  let r = Array.isArray(n) ? n : [n];
  if (e.skipped && !r.some((s) => s.skipped || hasUnresolvedCanonicalPath(s))) return "network";
  return "contained";
}
//@ chunk-e6aww6q8.js:1371778-1372214 placement
/**
 * 写入因路径无法安全解析（符号链接含原始点段、网络/设备命名空间、祖先目录不可读）被拦截时的说明，建议改用直接的普通路径（或 worktree 内的无链接路径）。
 */
function unresolvableWriteMessage(e) {
  return `This write was blocked because the path is spelled in a form that cannot be safely resolved (for example through a symlink storing a raw dot segment, a network-share or device-namespace shape, or an unreadable ancestor directory). ${e === undefined ? "Retry the edit addressing the file by a direct, plainly-spelled path." : `If the file is inside the worktree ${e}, address it by its direct symlink-free path instead.`}`;
}
//@ chunk-e6aww6q8.js:1372214-1372627 placement
/**
 * 写入因路径是网络形态（UNC 共享或 /net 自动挂载）而本会话检出在本地被拦截时的说明，建议用本地普通路径访问。
 */
function networkWriteMessage(e) {
  return `This write was blocked because the path is network-shaped (a UNC share or /net automount spelling) while this session's checkout is local. Isolating cannot unblock it. ${e === undefined ? "If the file is genuinely local, retry the edit addressing it by its local, plainly-spelled path." : `If the file is genuinely inside the worktree ${e}, address it by its local, plainly-spelled path instead.`}`;
}
export {
  getBgIsolationSetting,
  stripControlCharsForMessage,
  checkWorktreeIsolationSync,
  gitRootsForPath,
  compareSameContainment,
  worktreeLocationOf,
  isolationWorktreeFor,
  isolationRuntimeService,
  isSameRepoWorktree,
  registerIsolationRuntime,
  checkWorktreeIsolation,
  checkWorktreeIsolation_2,
  isolationSubjectWords,
  escapedSharedRoots,
  getClaudeWorktreesDir,
  checkWorktreePath,
  candidateWorktreeDirs,
  worktreesDirSpec,
  parseWorktreeAddError,
  describeRepoRelativeLocation,
  worktreesDirSpecs,
  CONTROL_CHAR_RE,
  CONTROL_OR_FORMAT_CHAR_RE,
  getWorktreesDirSpec,
  hasHostWorktreeDeclaration,
  BLOCKED_CWD_MESSAGES,
};

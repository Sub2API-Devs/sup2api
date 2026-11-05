/**
 * utils/worktreeIsolation.ts
 *
 * 2.1.316 新增：工作树隔离
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (7), chunk-7jxyna5q.js (66), chunk-8nfjhq0y.js (9)
 * attribution: placement 82
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute, join, relative, sep, dirname, resolve, basename } from "path";
import { homedir } from "os";
import { lstat, open, readdir } from "fs/promises";
import { lstatSync, realpathSync, openSync, fstatSync, readSync, closeSync, readdirSync } from "fs";
import { DoctorLazy } from "../cli/handlers/util.js";
import { array, unknown } from "../../vendor/zod/v4/classic/schemas.js";
import { getPlatform } from "./platform.js";
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
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
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
import { getInitialSettings } from "./settings/settings.js";
import { getCwd } from "./cwd.js";
import { hasWorktreeCreateHook } from "./hooks/worktreeHooks.js";
import { ENTER_WORKTREE_TOOL_NAME } from "../tools/EnterWorktreeTool/constants.js";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { nativeRealpathLong } from "./windowsUncPaths.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-8nfjhq0y.js:23541-23570 placement
var worktreeFenceSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8nfjhq0y.js:23541", () => {
  worktreeFenceSchema = DoctorLazy(() => array(unknown()).min(1));
});
//@ chunk-8nfjhq0y.js:23570-23689 placement
function isPathContainedIn(path, canonical) {
  return (getPlatform() === "linux" ? isSameContainmentPath : isOutsideContainment)(
    {
      lexical: canonical,
      canonical,
      skipped: false,
    },
    {
      lexical: path,
      canonical: path,
      skipped: false,
    },
  );
}
//@ chunk-8nfjhq0y.js:23689-23878 placement
function resolveFencePath(value) {
  if (typeof value !== "string" || !isAbsolute(value))
    return {
      code: "not_absolute",
      value,
    };
  let { canonical, skipped } = resolveContainmentTarget(value);
  return canonical === null
    ? {
        code: skipped ? "network_path" : "unresolvable_path",
        value,
      }
    : {
        at: canonical,
      };
}
//@ chunk-8nfjhq0y.js:23878-24422 placement
function checkWorktreeFence(declared, declaredFence, sessionDir) {
  let fenceParse = worktreeFenceSchema().safeParse(safeParseJSON(declaredFence, false));
  if (!fenceParse.success)
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
  let fencePath_2 = resolveFencePath(sessionDir);
  if ("code" in fencePath_2)
    return {
      problems: [fencePath_2],
    };
  if (!isPathContainedIn(fencePath.at, fencePath_2.at))
    return {
      problems: [
        {
          code: "session_outside_worktree",
          value: sessionDir,
        },
      ],
    };
  let containmentTarget = resolveContainmentTarget(homedir());
  let homePath = containmentTarget.canonical ?? containmentTarget.lexical;
  let allowedFences = [];
  let problems = [];
  for (let fenceEntry of fenceParse.data) {
    let fencePath = resolveFencePath(fenceEntry);
    if ("code" in fencePath) problems.push(fencePath);
    else if (isPathContainedIn(fencePath.at, homePath) && !isPathContainedIn(homePath, fencePath.at))
      problems.push({
        code: "fence_too_wide",
        value: fenceEntry,
      });
    else allowedFences.push(fencePath.at);
  }
  return {
    answer:
      allowedFences.length > 0
        ? {
            tree: fencePath.at,
            fence: allowedFences,
          }
        : undefined,
    problems,
  };
}
//@ chunk-8nfjhq0y.js:24422-24571 placement
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
//@ chunk-8nfjhq0y.js:24571-25315 placement
function describeWorktreeWriteFence() {
  let declaration = hostWorktreeDeclaration();
  if (declaration === undefined) return;
  let { declared, declaredFence } = declaration;
  let sessionDir = getCurrentWorktreeSession()?.preEnterOriginalCwd ?? getOriginalCwd();
  let { answer, problems } = checkWorktreeFence(declared, declaredFence, sessionDir);
  let report = `CLAUDE_CODE_HOST_WORKTREE=${declared ?? "(not set)"} CLAUDE_CODE_HOST_WORKTREE_FENCE=${declaredFence ?? "(not set)"}, session folder ${sessionDir}: ${answer === undefined ? "ignored, so they block no file write" : `file tools may not write in ${answer.fence.join(", ")}, except inside ${answer.tree}`}${problems.map((problem) => `; ${problem.code}${typeof problem.value === "string" ? ` ${JSON.stringify(problem.value)}` : ""}`).join("")}`;
  let gitRepoCache = getGitRepoCache();
  if (gitRepoCache.hostWorktreeReport !== report) {
    gitRepoCache.hostWorktreeReport = report;
    logForDebugging(report, {
      level: problems.length > 0 ? "warn" : "debug",
    });
    if (problems.length === 0) logFeatureOk("worktree_host_declared");
    else if (answer === undefined) logFeatureBad("worktree_host_declared", problems[0].code);
    else logFeatureSad("worktree_host_declared", problems[0].code);
  }
  return answer;
}
//@ chunk-8nfjhq0y.js:25315-25479 placement
/**
 * 当前上下文的隔离 worktree：子代理自己的 worktree 优先，其次项目的 isolationRoot（非特定模式下），最后是当前 worktree 会话的路径。
 */
function isolationWorktreeFor(options) {
  if (options.agentWorktree) return options.agentWorktree;
  if (!isBackgroundSession()) {
    let isolationRoot = options.session.project?.isolationRoot;
    if (isolationRoot && !hasHostWorktreeDeclaration()) return isolationRoot;
  }
  return getCurrentWorktreeSession()?.worktreePath || undefined;
}
//@ chunk-8nfjhq0y.js:25479-25548 placement
/**
 * 是否后台会话（CLAUDE_CODE_SESSION_KIND=bg 或已接管）。
 */
function isBackgroundSession() {
  return env.CLAUDE_CODE_SESSION_KIND === "bg" || getBgTakeover() !== null;
}
//@ chunk-8nfjhq0y.js:25548-25583 placement
/**
 * 宿主是否声明了 worktree。
 */
function hasHostWorktreeDeclaration() {
  return hostWorktreeDeclaration() !== undefined;
}
//@ chunk-7jxyna5q.js:350957-350997 placement
/**
 * 控制字符与「控制或格式字符」的模式。
 */
var CONTROL_CHAR_RE = /\p{Cc}/u;
var CONTROL_OR_FORMAT_CHAR_RE = /[\p{Cc}\p{Cf}]/u;
//@ chunk-7jxyna5q.js:350997-351048 placement (2.1.88 match: isDangerousFilePathToAutoEdit, 1)
function getClaudeWorktreesDir(repoRoot) {
  return join(repoRoot, ".claude", "worktrees");
}
//@ chunk-7jxyna5q.js:351048-351122 placement (2.1.88 match: isDangerousFilePathToAutoEdit, 0.775)
function getWorktreesDirSpec(repoRoot) {
  return {
    dir: getClaudeWorktreesDir(repoRoot),
    anchor: repoRoot,
    below: [".claude", "worktrees"],
  };
}
//@ chunk-7jxyna5q.js:351122-351192 placement
/**
 * 生成 worktrees 目录规格。
 */
function worktreesDirSpec(spec, anchor) {
  return {
    dir: join(anchor, ...spec.below),
    anchor,
    below: spec.below,
  };
}
//@ chunk-7jxyna5q.js:351192-351504 placement
function parseWorktreeAddError(createStderr, worktreeBranch) {
  let lines = createStderr.split(/[\r\n]/);
  return [
    `fatal: '${worktreeBranch}' is already used by worktree at `,
    `fatal: '${worktreeBranch}' is already checked out at `,
    `fatal: cannot force update the branch '${worktreeBranch}' used by worktree at `,
    `fatal: cannot force update the branch '${worktreeBranch}' checked out at `,
  ].some((expectedPrefix) => lines.some((line) => line.startsWith(expectedPrefix)));
}
//@ chunk-7jxyna5q.js:351504-351737 placement
/**
 * 给出一个路径相对仓库的安全描述：仓库外或路径段含不安全字符时只说"仓库外/内某处（不显示）"，否则显示路径。
 */
function describeRepoRelativeLocation(a, b) {
  let relativePath = relative(b, a);
  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath))
    return "a location outside the repository (not shown)";
  return relativePath === "" || relativePath.split(sep).every((segment) => SAFE_SEGMENT_RE.test(segment))
    ? hideUnsafePath(a)
    : "a location inside the repository (not shown)";
}
//@ chunk-7jxyna5q.js:351737-351765 placement
var SAFE_SEGMENT_RE = /^[a-zA-Z0-9._+-]+$/;
//@ chunk-7jxyna5q.js:351765-351823 placement
function repoRelativePath(anchor, path) {
  return `${hideUnsafePath(relative(anchor, path))} in the repository`;
}
//@ chunk-7jxyna5q.js:351823-352438 placement
async function checkWorktreePath(a, b) {
  let pathsToCheck = [
    ...a.below.map((segment, segmentIndex, segments) =>
      join(a.anchor, ...segments.slice(0, segmentIndex + 1)),
    ),
    b,
  ];
  for (let candidatePath of pathsToCheck) {
    let stats;
    try {
      stats = await lstat(candidatePath);
    } catch (error) {
      if (isENOENT(error)) continue;
      return {
        ok: false,
        reason: "lstat_failed",
        message: `Cannot create worktree: failed to lstat ${repoRelativePath(a.anchor, candidatePath)}: it could not be read${getErrnoCode(error) ? ` (${getErrnoCode(error)})` : ""}`,
      };
    }
    if (stats.isSymbolicLink())
      return {
        ok: false,
        reason: "symlink",
        message: `Cannot create worktree: ${repoRelativePath(a.anchor, candidatePath)} is a symlink. A repository-committed symlink at .claude, .claude/worktrees, or .claude/worktrees/<name> could redirect worktree creation outside the repository. Remove the symlink and retry.`,
      };
  }
  return {
    ok: true,
  };
}
//@ chunk-7jxyna5q.js:352438-352468 placement
/**
 * 取仓库的 worktrees 目录规格。
 */
function worktreesDirSpecs(repoRoot) {
  return getWorktreesDirSpec(repoRoot);
}
//@ chunk-7jxyna5q.js:352468-352499 placement
/**
 * worktrees 目录规格的数组形式。
 */
function candidateWorktreeDirs(options) {
  return [worktreesDirSpecs(options)];
}
//@ chunk-7jxyna5q.js:352499-352574 placement
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
//@ chunk-7jxyna5q.js:352574-352942 placement
/**
 * 异步检查 worktree 隔离是否可靠：读取该 worktree 与候选仓库根的 git 身份，交给 checkWorktreeIsolation_2 比对（选项控制自持 pin 的见证要求）。
 */
async function checkWorktreeIsolation(worktreePath, repoRoots, extraRoots = [], options) {
  let [gitIdentity, isSymlink] = await Promise.all([
    readGitIdentityAsync(worktreePath),
    isSymlinkAsync(worktreePath),
  ]);
  let protectedRoots = new Set(repoRoots);
  let launchTrees = new Set(extraRoots);
  let allRoots = normalizeCaseForComparison_2([...repoRoots, ...extraRoots]);
  let requireWitness = options?.requireWitnessForSelfOwningPins === true;
  let declineSelfOwningPin = options?.declineSelfOwningPinUnderLiveRoot === true;
  if (typeof gitIdentity.ids !== "object")
    return checkWorktreeIsolation_3(
      worktreePath,
      gitIdentity,
      isSymlink,
      allRoots,
      protectedRoots,
      launchTrees,
      [],
      requireWitness,
      declineSelfOwningPin,
    );
  let results = await Promise.all(
    candidateRepoRoots(worktreePath, allRoots, gitIdentity.ids).map(async (root) => ({
      root,
      ...(await readGitIdentityAsync(root)),
    })),
  );
  return checkWorktreeIsolation_3(
    worktreePath,
    gitIdentity,
    isSymlink,
    allRoots,
    protectedRoots,
    launchTrees,
    results,
    requireWitness,
    declineSelfOwningPin,
  );
}
//@ chunk-7jxyna5q.js:352942-353252 placement
/**
 * checkWorktreeIsolation 的同步版本。
 */
function checkWorktreeIsolationSync(worktreePath, repoRoots, extraRoots = [], options) {
  let gitIdentity = readGitIdentitySync(worktreePath);
  let isSymlink = isSymlinkSync(worktreePath);
  let protectedRoots = new Set(repoRoots);
  let launchTrees = new Set(extraRoots);
  let allRoots = normalizeCaseForComparison_2([...repoRoots, ...extraRoots]);
  let requireWitness = options?.requireWitnessForSelfOwningPins === true;
  let declineSelfOwningPin = options?.declineSelfOwningPinUnderLiveRoot === true;
  if (typeof gitIdentity.ids !== "object")
    return checkWorktreeIsolation_3(
      worktreePath,
      gitIdentity,
      isSymlink,
      allRoots,
      protectedRoots,
      launchTrees,
      [],
      requireWitness,
      declineSelfOwningPin,
    );
  let mapped = candidateRepoRoots(worktreePath, allRoots, gitIdentity.ids).map((root) => ({
    root,
    ...readGitIdentitySync(root),
  }));
  return checkWorktreeIsolation_3(
    worktreePath,
    gitIdentity,
    isSymlink,
    allRoots,
    protectedRoots,
    launchTrees,
    mapped,
    requireWitness,
    declineSelfOwningPin,
  );
}
//@ chunk-7jxyna5q.js:353252-359896 placement
/**
 * 检查工作树隔离是否可靠（符号链接、.git 条目、仓库内外位置）
 */
function checkWorktreeIsolation_3(
  path,
  gitIdentity,
  isSymlink,
  allRoots,
  protectedRoots,
  launchTrees,
  rootResults,
  requireWitness = false,
  declineSelfOwningPin = false,
) {
  if (isSymlink)
    return unverifiableIsolationResult(
      path,
      "it is a symbolic link, so the tree it would isolate into cannot be pinned down",
    );
  if (gitIdentity.entry === "unverifiable")
    return unverifiableIsolationResult(path, "its .git entry exists but could not be examined");
  let ids = gitIdentity.ids;
  if (ids === "error") return unverifiableIsolationResult(path, "git could not be run to resolve it");
  if (typeof ids === "object" && ids.isBare === true)
    return unverifiableIsolationResult(path, "it is a bare repository, not a working tree");
  if (ids === "no-repo") {
    if (gitIdentity.entry !== "absent")
      return unverifiableIsolationResult(path, "a .git entry exists there but git could not resolve it");
    for (let protectedRoot of allRoots) {
      if (!protectedRoots.has(protectedRoot)) continue;
      if (mayBeOutside(path, protectedRoot))
        return {
          ok: false,
          reason: "pin-is-protected-checkout",
          message: stripControlCharsForMessage(
            `Refusing to use ${path} as an isolation worktree: it contains the protected checkout ${protectedRoot}, so adopting it would disarm every isolation check for that checkout.`,
          ),
        };
    }
    for (let launchTree of launchTrees)
      if (mayBeOutside(path, launchTree))
        return {
          ok: false,
          reason: "pin-is-own-launch-tree",
          message: stripControlCharsForMessage(
            `This resume was started from inside ${path}, a non-git directory \u2014 nothing can confirm it as a separate isolation tree from there. Run the resume from the project checkout instead.`,
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
        `Refusing to use ${path} as an isolation worktree: its git metadata has symbolic links in place of ${ids.symlinkedRefStore.join(", ")}, which aliases another repository's refs into this tree. Recreate the worktree with git worktree add, then retry.`,
      ),
    };
  if (ids.unexaminableRefStore.length > 0)
    return unverifiableIsolationResult(
      path,
      `its ref storage could not be fully examined (${ids.unexaminableRefStore[0]})`,
    );
  let topLevelVerdict = compareSameContainment(ids.topLevel, path);
  if (topLevelVerdict === "indeterminate")
    return unverifiableIsolationResult(
      path,
      `its working tree resolves to a path that cannot be safely compared (${ids.topLevel})`,
    );
  if (topLevelVerdict === "distinct")
    return {
      ok: false,
      reason: "work-tree-elsewhere",
      message: stripControlCharsForMessage(
        `Refusing to use ${path} as an isolation worktree: git resolves its working tree to ${ids.topLevel} (a core.worktree redirect, or a checkout discovered above it), so commands run there would write outside the worktree. Remove the redirect, restore the worktree's own .git, or recreate the worktree, then retry.`,
      ),
    };
  let sharedGitDir = compareSameContainment(ids.commonDir, ids.gitDir) !== "distinct";
  for (let pin of rootResults) {
    let included = allRoots.includes(pin.root);
    let containment = compareWithOutsideContainment(pin.root, path);
    if (
      containment !== "same" &&
      launchTrees.has(pin.root) &&
      !protectedRoots.has(pin.root) &&
      mayBeOutside(path, pin.root)
    ) {
      if (!sharedGitDir && isOwnRepositoryCheckout(path, ids.commonDir)) continue;
      if (!sharedGitDir)
        return {
          ok: false,
          reason: "pin-is-own-launch-tree",
          message: stripControlCharsForMessage(
            `The worktree ${path} contains the directory this resume ran from, and nothing in this session vouches for its worktree registration \u2014 an isolation worktree never contains its own launch position. Run the resume from the project checkout instead.`,
          ),
        };
      return {
        ok: false,
        reason: "pin-is-own-launch-tree",
        message: stripControlCharsForMessage(
          `This resume was started from inside ${path} (or a directory it contains), which is its own repository \u2014 it cannot be confirmed as a separate isolation worktree from there. Run the resume from the project checkout instead.`,
        ),
      };
    }
    if (containment === "same") {
      if (included && protectedRoots.has(pin.root))
        return {
          ok: false,
          reason: "pin-is-protected-checkout",
          message: stripControlCharsForMessage(
            `Refusing to use ${path} as an isolation worktree: it is the checkout this session launched from. An honest launch-from-inside and a forged record are indistinguishable here, so both are refused \u2014 launch from the parent checkout to enter or resume this worktree.`,
          ),
        };
      if (included && sharedGitDir)
        return {
          ok: false,
          reason: "pin-is-own-launch-tree",
          message: stripControlCharsForMessage(
            `This resume was started from inside ${path}, which is its own repository \u2014 it cannot be confirmed as a separate isolation worktree from there. Run the resume from the project checkout instead.`,
          ),
        };
      continue;
    }
    if (pin.entry === "unverifiable")
      return unverifiableIsolationResult(
        path,
        `the protected checkout ${pin.root} has a .git entry that could not be examined`,
      );
    if (typeof pin.ids !== "object") {
      if (pin.ids === "no-repo") continue;
      return unverifiableIsolationResult(
        path,
        `the protected checkout ${pin.root} has git metadata that could not be resolved`,
      );
    }
    let gitDirVerdict = compareWithOutsideContainment(ids.gitDir, pin.ids.gitDir);
    if (gitDirVerdict === "indeterminate")
      return unverifiableIsolationResult(
        path,
        `its git directory (${ids.gitDir}) could not be safely compared with the protected checkout's`,
      );
    if (gitDirVerdict === "same")
      return {
        ok: false,
        reason: "shared-git-dir",
        message: stripControlCharsForMessage(
          `Refusing to use ${path} as an isolation worktree: its git directory is the shared checkout's own (${ids.gitDir}), so git commands there move the protected checkout's branches and refs. This usually means the worktree's .git file is stale or was rewritten \u2014 recreate the worktree, then retry.`,
        ),
      };
  }
  if (sharedGitDir && protectedRoots.size === 0) {
    if (requireWitness)
      return {
        ok: false,
        reason: "pin-is-own-launch-tree",
        message: stripControlCharsForMessage(
          `The worktree ${path} is its own repository and nothing vouches for it from this session \u2014 it cannot be resumed or re-entered. Re-create it (a fresh isolated tree); the existing tree and its work remain on disk at ${path} for manual recovery.`,
        ),
      };
    if (declineSelfOwningPin) {
      for (let launchTree of launchTrees)
        if (compareWithOutsideContainment(launchTree, path) !== "same" && mayBeOutside(launchTree, path))
          return {
            ok: false,
            reason: "pin-is-own-launch-tree",
            message: stripControlCharsForMessage(
              `The worktree ${path} sits under the directory this resume ran from, and nothing else vouches for it \u2014 it cannot be resumed or re-entered. Re-create it (a fresh isolated tree); the existing tree and its work remain on disk at ${path} for manual recovery. Where it has a parent checkout, resuming from there also works.`,
            ),
          };
    }
  }
  for (let protectedRoot of allRoots) {
    if (compareWithOutsideContainment(protectedRoot, path) === "same") continue;
    if (!mayBeOutside(path, protectedRoot)) continue;
    if (launchTrees.has(protectedRoot) && !protectedRoots.has(protectedRoot)) {
      if (!sharedGitDir && isOwnRepositoryCheckout(path, ids.commonDir)) continue;
      if (!sharedGitDir)
        return {
          ok: false,
          reason: "pin-is-own-launch-tree",
          message: stripControlCharsForMessage(
            `The worktree ${path} contains the directory this resume ran from, and nothing in this session vouches for its worktree registration \u2014 an isolation worktree never contains its own launch position. Run the resume from the project checkout instead.`,
          ),
        };
      return {
        ok: false,
        reason: "pin-is-own-launch-tree",
        message: stripControlCharsForMessage(
          `This resume was started from inside ${path} (or a directory it contains), which is its own repository \u2014 it cannot be confirmed as a separate isolation worktree from there. Run the resume from the project checkout instead.`,
        ),
      };
    }
    return {
      ok: false,
      reason: "pin-is-protected-checkout",
      message: stripControlCharsForMessage(
        `Refusing to use ${path} as an isolation worktree: it contains the protected checkout ${protectedRoot}, so adopting it would disarm every isolation check for that checkout.`,
      ),
    };
  }
  let commonDirVerdict = compareSameContainment(ids.commonDir, ids.gitDir);
  if (commonDirVerdict === "indeterminate")
    return unverifiableIsolationResult(
      path,
      `its git metadata (common dir ${ids.commonDir}) could not be safely compared`,
    );
  if (commonDirVerdict === "distinct") {
    let adminDirVerdict = compareSameContainment(dirname(ids.gitDir), join(ids.commonDir, "worktrees"));
    let backPointerOk =
      ids.backPointer !== null &&
      compareSameContainment(resolve(ids.gitDir, ids.backPointer), join(path, ".git")) === "same";
    if (adminDirVerdict !== "same" || !backPointerOk)
      return {
        ok: false,
        reason: "invalid-linked-worktree",
        message: stripControlCharsForMessage(
          `Refusing to use ${path} as an isolation worktree: it uses another repository's refs (${ids.commonDir}) without being a registered worktree of it (its admin directory or back-pointer does not check out). Recreate the worktree with git worktree add, then retry.`,
        ),
      };
  }
  return {
    ok: true,
    reason: "verified",
  };
}
//@ chunk-7jxyna5q.js:359896-360003 placement
function candidateRepoRoots(worktreePath, repoRoots, gitIdentity) {
  let commonDirRoot = basename(gitIdentity.commonDir) === ".git" ? dirname(gitIdentity.commonDir) : null;
  return normalizeCaseForComparison_2([...repoRoots, ...(commonDirRoot !== null ? [commonDirRoot] : [])]);
}
//@ chunk-7jxyna5q.js:360003-360282 placement
/**
 * 返回 {ok:false, reason:"unverifiable"}：worktree 的 git 身份无法核验，拒绝用作隔离 worktree 的说明。
 */
function unverifiableIsolationResult(a, b) {
  return {
    ok: false,
    reason: "unverifiable",
    message: stripControlCharsForMessage(
      `Refusing to use ${a} as an isolation worktree: ${b}, so its git identity could not be verified. Isolation is refused rather than assumed \u2014 recreate the worktree (or remove the corrupt .git entry) and retry.`,
    ),
  };
}
//@ chunk-7jxyna5q.js:360282-360378 placement
async function readGitIdentityAsync(dir) {
  let [entry, gitDirs] = await Promise.all([gitEntryPresenceAsync(join(dir, ".git")), readGitDirs(dir)]);
  return {
    entry,
    ids: gitDirs,
  };
}
//@ chunk-7jxyna5q.js:360378-360434 placement
function readGitIdentitySync(cwd) {
  return {
    entry: gitEntryPresenceSync(join(cwd, ".git")),
    ids: probeGitIdentitySync(cwd),
  };
}
//@ chunk-7jxyna5q.js:360434-360511 placement
async function gitEntryPresenceAsync(path) {
  try {
    await lstat(path);
    return "present";
  } catch (error) {
    return classifyGitEntryError(error);
  }
}
//@ chunk-7jxyna5q.js:360511-360576 placement
function gitEntryPresenceSync(path) {
  try {
    lstatSync(path);
    return "present";
  } catch (error) {
    return classifyGitEntryError(error);
  }
}
//@ chunk-7jxyna5q.js:360576-360654 placement
async function isSymlinkAsync(worktreePath) {
  try {
    return (await lstat(worktreePath)).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-7jxyna5q.js:360654-360719 placement
function isSymlinkSync(worktreePath) {
  try {
    return lstatSync(worktreePath).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-7jxyna5q.js:360719-360804 placement
function classifyGitEntryError(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "unverifiable";
}
//@ chunk-7jxyna5q.js:360804-360897 placement
var GIT_IDENTITY_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GIT_IDENTITY_ARGS;
deferInit("chunk-7jxyna5q.js:360804", () => {
  GIT_IDENTITY_TIMEOUT_MS = 2000;
  GIT_IDENTITY_ARGS = [
    ...GIT_SAFE_GLOBAL_ARGS,
    "rev-parse",
    "--absolute-git-dir",
    "--show-toplevel",
    "--git-common-dir",
  ];
});
//@ chunk-7jxyna5q.js:360897-361757 placement
async function readGitDirs(dir) {
  let revParseResult = await execFileNoThrowWithCwd(gitExe(), [...GIT_IDENTITY_ARGS], {
    cwd: dir,
    env: getRemoteHostSessionCount(),
    timeout: GIT_IDENTITY_TIMEOUT_MS,
    useToolMemoryCgroup: false,
    preserveOutputOnError: true,
  });
  if (revParseResult.code !== 0) {
    if (await readDirNamesCapped(dir)) return "no-repo";
    if (isNotWorkTreeError(revParseResult.stderr)) {
      let bareResult = await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--absolute-git-dir", "--git-common-dir"],
        {
          cwd: dir,
          env: getRemoteHostSessionCount(),
          timeout: GIT_IDENTITY_TIMEOUT_MS,
          useToolMemoryCgroup: false,
          preserveOutputOnError: true,
        },
      );
      if (bareResult.code === 0) {
        let bareRevParse = parseBareRevParse(dir, bareResult.stdout);
        if (bareRevParse !== null) {
          let [gitdirFile, symlinkScan] = await Promise.all([
            readGitdirFile(bareRevParse.gitDir),
            scanGitDirSymlinks(bareRevParse.gitDir),
          ]);
          return {
            ...bareRevParse,
            backPointer: gitdirFile,
            symlinkedRefStore: symlinkScan.symlinks,
            unexaminableRefStore: symlinkScan.unexaminable,
          };
        }
      }
      return "error";
    }
    if (isNotGitRepoError(revParseResult.stderr)) return "no-repo";
    if (typeof revParseResult.exitCode === "number" && (await noGitAncestorEntries(dir))) return "no-repo";
    return "error";
  }
  let revParseOutput = parseRevParseOutput(dir, revParseResult.stdout);
  if (revParseOutput === null) return "error";
  let [gitdirFile, symlinkScan] = await Promise.all([
    readGitdirFile(revParseOutput.gitDir),
    scanGitDirSymlinks(revParseOutput.gitDir),
  ]);
  return {
    ...revParseOutput,
    backPointer: gitdirFile,
    symlinkedRefStore: symlinkScan.symlinks,
    unexaminableRefStore: symlinkScan.unexaminable,
  };
}
//@ chunk-7jxyna5q.js:361757-362646 placement
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
//@ chunk-7jxyna5q.js:362646-362715 placement
/**
 * 把控制字符替换为空格，用于提示文案。
 */
function stripControlCharsForMessage(text) {
  return text.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
}
//@ chunk-7jxyna5q.js:362715-362825 placement
function isNotGitRepoError(stderr) {
  return /not a git repository/i.test(stderr) || /gitfile does not point to a valid repository/i.test(stderr);
}
//@ chunk-7jxyna5q.js:362825-362949 placement
async function noGitAncestorEntries(cwd) {
  let entries = gitAncestorEntryPaths(cwd);
  if (entries === null) return false;
  return (await Promise.all(entries.map((entryPath) => gitEntryPresenceAsync(entryPath)))).every(
    (presence) => presence === "absent",
  );
}
//@ chunk-7jxyna5q.js:362949-363024 placement
function hasNoRepoAncestor(path) {
  let entries = gitAncestorEntryPaths(path);
  return entries !== null && entries.every((entryPath) => gitEntryPresenceSync(entryPath) === "absent");
}
//@ chunk-7jxyna5q.js:363024-363337 placement
/**
 * 列出路径各级祖先下的 .git 与 HEAD 路径（Windows 或无法规范化、非 UTF-8 时返回 null），用于确认祖先中没有仓库。
 */
function gitAncestorEntryPaths(path) {
  if (getPlatform() === "windows") return null;
  if (resolveContainmentTarget(path).canonical === null) return null;
  let realPath;
  try {
    let realBytes = realpathSync.native(path, {
      encoding: "buffer",
    });
    realPath = realBytes.toString("utf8");
    if (!Buffer.from(realPath, "utf8").equals(realBytes)) return null;
  } catch {
    return null;
  }
  let entries = [];
  for (let dir = realPath; ;) {
    entries.push(join(dir, ".git"), join(dir, "HEAD"));
    let parentDir = dirname(dir);
    if (parentDir === dir) return entries;
    dir = parentDir;
  }
}
//@ chunk-7jxyna5q.js:363337-363440 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
async function readDirNamesCapped(realCandidate) {
  try {
    await lstat(realCandidate);
    return false;
  } catch (e) {
    let code = getErrnoCode(e);
    return code === "ENOENT" || code === "ENOTDIR";
  }
}
//@ chunk-7jxyna5q.js:363440-363531 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
function readDirNamesCappedSync(realCandidate) {
  try {
    lstatSync(realCandidate);
    return false;
  } catch (e) {
    let code = getErrnoCode(e);
    return code === "ENOENT" || code === "ENOTDIR";
  }
}
//@ chunk-7jxyna5q.js:363531-363609 placement
function isNotWorkTreeError(stderr) {
  return stderr.includes("this operation must be run in a work tree");
}
//@ chunk-7jxyna5q.js:363609-363842 placement
function parseBareRevParse(topLevel, stdout) {
  let filtered = stdout
    .split(
      `
`,
    )
    .filter((line) => line.length > 0);
  if (filtered.length !== 2) return null;
  if (filtered.some((line) => /[\u0000-\u001f\u007f-\u009f]/.test(line))) return null;
  let commonDirRaw = filtered[1];
  return {
    gitDir: filtered[0],
    topLevel,
    commonDir: isAbsolute(commonDirRaw) ? commonDirRaw : join(topLevel, commonDirRaw),
    isBare: true,
  };
}
//@ chunk-7jxyna5q.js:363842-364068 placement
function parseRevParseOutput(baseDir, stdout) {
  let filtered = stdout
    .split(
      `
`,
    )
    .filter((line) => line.length > 0);
  if (filtered.length !== 3) return null;
  if (filtered.some((line) => /[\u0000-\u001f\u007f-\u009f]/.test(line))) return null;
  let commonDirRaw = filtered[2];
  return {
    gitDir: filtered[0],
    topLevel: filtered[1],
    commonDir: isAbsolute(commonDirRaw) ? commonDirRaw : resolve(baseDir, commonDirRaw),
  };
}
//@ chunk-7jxyna5q.js:364068-364081 placement
var MAX_GITDIR_FILE_BYTES = 65536;
//@ chunk-7jxyna5q.js:364081-364379 placement
async function readGitdirFile(gitDir) {
  try {
    if (!(await lstat(join(gitDir, "gitdir"))).isFile()) return null;
    let handle = await open(join(gitDir, "gitdir"), "r");
    try {
      if ((await handle.stat()).size > MAX_GITDIR_FILE_BYTES) return null;
      let buffer = Buffer.alloc(MAX_GITDIR_FILE_BYTES);
      let { bytesRead } = await handle.read(buffer, 0, MAX_GITDIR_FILE_BYTES, 0);
      return buffer.toString("utf-8", 0, bytesRead).trim();
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}
//@ chunk-7jxyna5q.js:364379-364616 placement
function readGitdirFileSync(gitDir) {
  try {
    if (!lstatSync(join(gitDir, "gitdir")).isFile()) return null;
    let fd = openSync(join(gitDir, "gitdir"), "r");
    try {
      if (fstatSync(fd).size > MAX_GITDIR_FILE_BYTES) return null;
      let buffer = Buffer.alloc(MAX_GITDIR_FILE_BYTES);
      let bytesRead = readSync(fd, buffer, 0, MAX_GITDIR_FILE_BYTES, 0);
      return buffer.toString("utf-8", 0, bytesRead).trim();
    } finally {
      closeSync(fd);
    }
  } catch {
    return null;
  }
}
//@ chunk-7jxyna5q.js:364616-364634 placement
var MAX_SYMLINK_SCAN_DEPTH = 12;
var MAX_SYMLINK_SCAN_ENTRIES = 4096;
//@ chunk-7jxyna5q.js:364634-365029 placement
/**
 * 扫描 git 目录顶层与 refs/ 下的符号链接（有条目数与深度上限），返回 {symlinks, unexaminable}。
 */
async function scanGitDirSymlinks(gitDir) {
  let symlinks = [];
  let unexaminable = [];
  let names;
  try {
    names = await readdir(gitDir);
  } catch (error) {
    if (classifyGitEntryError(error) !== "absent") unexaminable.push("(git dir unreadable)");
    names = [];
  }
  if (names.length > MAX_SYMLINK_SCAN_ENTRIES) {
    unexaminable.push("(over-cap top-level entries)");
    names = [];
  }
  await Promise.all(
    names.map(async (name) => {
      try {
        if ((await lstat(join(gitDir, name))).isSymbolicLink()) symlinks.push(name);
      } catch (error) {
        if (classifyGitEntryError(error) !== "absent") unexaminable.push(name);
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
//@ chunk-7jxyna5q.js:365029-365545 placement
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
  let names;
  try {
    names = await readdir(dir);
  } catch (error) {
    if (classifyGitEntryError(error) !== "absent") unexaminable.push(`${label} (unreadable)`);
    return;
  }
  for (let name of names) {
    if (--budget.entries < 0) {
      unexaminable.push(`${label} (too many entries to examine)`);
      return;
    }
    let dir_2 = join(dir, name);
    let label_2 = `${label}/${name}`;
    try {
      let stats = await lstat(dir_2);
      if (stats.isSymbolicLink()) symlinks.push(label_2);
      else if (stats.isDirectory())
        await scanRefsSymlinks(dir_2, label_2, depth + 1, symlinks, unexaminable, budget);
    } catch (error) {
      if (classifyGitEntryError(error) !== "absent") unexaminable.push(`${label_2} (unreadable)`);
    }
  }
}
//@ chunk-7jxyna5q.js:365545-365890 placement
/**
 * 同步扫描 git 目录顶层与 refs 下的符号链接，返回符号链接列表和无法检查的项（不可读、条目超限等）。
 */
function scanGitDirSymlinksSync(gitDir) {
  let symlinks = [];
  let unexaminable = [];
  let names;
  try {
    names = readdirSync(gitDir);
  } catch (error) {
    if (classifyGitEntryError(error) !== "absent") unexaminable.push("(git dir unreadable)");
    names = [];
  }
  if (names.length > MAX_SYMLINK_SCAN_ENTRIES) {
    unexaminable.push("(over-cap top-level entries)");
    names = [];
  }
  for (let name of names)
    try {
      if (lstatSync(join(gitDir, name)).isSymbolicLink()) symlinks.push(name);
    } catch (error) {
      if (classifyGitEntryError(error) !== "absent") unexaminable.push(name);
    }
  scanRefsSymlinksSync(join(gitDir, "refs"), "refs", 0, symlinks, unexaminable, {
    entries: MAX_SYMLINK_SCAN_ENTRIES,
  });
  return {
    symlinks,
    unexaminable,
  };
}
//@ chunk-7jxyna5q.js:365890-366382 placement
/**
 * 递归扫描 refs 目录中的符号链接：受深度与总条目数限制，超限或不可读的位置记入无法检查列表。
 */
function scanRefsSymlinksSync(dir, relativePath, depth, symlinks, unexaminable, budget) {
  if (depth > MAX_SYMLINK_SCAN_DEPTH) {
    unexaminable.push(`${relativePath} (too deep to examine)`);
    return;
  }
  if (budget.entries <= 0) {
    unexaminable.push(`${relativePath} (too many entries to examine)`);
    return;
  }
  let names;
  try {
    names = readdirSync(dir);
  } catch (error) {
    if (classifyGitEntryError(error) !== "absent") unexaminable.push(`${relativePath} (unreadable)`);
    return;
  }
  for (let name of names) {
    if (--budget.entries < 0) {
      unexaminable.push(`${relativePath} (too many entries to examine)`);
      return;
    }
    let fullPath = join(dir, name);
    let relativeChild = `${relativePath}/${name}`;
    try {
      let stats = lstatSync(fullPath);
      if (stats.isSymbolicLink()) symlinks.push(relativeChild);
      else if (stats.isDirectory())
        scanRefsSymlinksSync(fullPath, relativeChild, depth + 1, symlinks, unexaminable, budget);
    } catch (error) {
      if (classifyGitEntryError(error) !== "absent") unexaminable.push(`${relativeChild} (unreadable)`);
    }
  }
}
//@ chunk-7jxyna5q.js:366382-366546 placement
function comparePathTargets(pathA, pathB, compare) {
  let containmentTarget = resolveContainmentTarget(pathA);
  let containmentTarget_2 = resolveContainmentTarget(pathB);
  if (hasUnresolvedCanonicalPath(containmentTarget) || hasUnresolvedCanonicalPath(containmentTarget_2))
    return "indeterminate";
  if (containmentTarget.skipped !== containmentTarget_2.skipped) return "indeterminate";
  return compare(containmentTarget, containmentTarget_2) && compare(containmentTarget_2, containmentTarget)
    ? "same"
    : "distinct";
}
//@ chunk-7jxyna5q.js:366546-366658 placement
function mayBeOutside(pathA, pathB) {
  let containmentTarget = resolveContainmentTarget(pathA);
  let containmentTarget_2 = resolveContainmentTarget(pathB);
  if (hasUnresolvedCanonicalPath(containmentTarget) || hasUnresolvedCanonicalPath(containmentTarget_2))
    return true;
  if (containmentTarget.skipped !== containmentTarget_2.skipped) return true;
  return isOutsideContainment(containmentTarget_2, containmentTarget);
}
//@ chunk-7jxyna5q.js:366658-366694 placement
function compareWithOutsideContainment(pathA, pathB) {
  return comparePathTargets(pathA, pathB, isOutsideContainment);
}
//@ chunk-7jxyna5q.js:366694-366730 placement
/**
 * 两个路径的包含关系比较（同路径判定）。
 */
function compareSameContainment(pathA, pathB) {
  return comparePathTargets(pathA, pathB, isSameContainmentPath);
}
//@ chunk-7jxyna5q.js:366730-366807 placement
function isOwnRepositoryCheckout(path, commonDir) {
  let location = worktreeLocationOf(path);
  return location !== null && compareWithOutsideContainment(location.checkout, dirname(commonDir)) === "same";
}
//@ chunk-7jxyna5q.js:366807-367029 placement
/**
 * 判断 worktree 路径确属一个仓库，且该仓库与给定的某个目录的规范 git 根相同（三处 R6 身份比对都为 same）。
 */
function isSameRepoWorktree(worktreePath, roots) {
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
  return roots.some((root) => {
    let canonicalGitRoot = findCanonicalGitRoot(root);
    return (
      canonicalGitRoot !== null &&
      compareSameContainment(repoRootForWorktreePath, canonicalGitRoot) === "same"
    );
  });
}
//@ chunk-7jxyna5q.js:367029-367153 placement
/**
 * 求路径所属的 git 根目录（普通与规范化根，加上额外候选），排除特殊路径并去重。
 */
function gitRootsForPath(path, ...extraRoots) {
  if (isNonWslUncPath(path) || isNetworkMountRoot(path)) return [];
  return normalizeCaseForComparison_2(
    [findGitRoot(path), findCanonicalGitRoot(path), ...extraRoots].filter(
      (root) => root !== null && root !== undefined && !isNonWslUncPath(root) && !isNetworkMountRoot(root),
    ),
  );
}
//@ chunk-7jxyna5q.js:367153-368507 placement
function BLOCKED_CWD_MESSAGES(path, isolationRoot) {
  {
    let roots = sharedCheckoutRoots(path, isolationRoot);
    if (roots.escaped) {
      if (hasUnresolvedCanonicalPath(roots.dir))
        return `This command was blocked because its working directory is spelled in a form that cannot be safely resolved (for example through a symlink storing a raw dot segment, a network-share or device-namespace shape, or an unreadable ancestor directory). If the directory is inside the worktree ${isolationRoot}, re-run the command from its direct symlink-free path.`;
      if (roots.dir.skipped && !roots.roots.some((root) => root.skipped || hasUnresolvedCanonicalPath(root)))
        return `This command was blocked because its working directory is network-shaped (a UNC share or /net automount spelling) while the protected checkout is local. If the directory is genuinely inside the worktree ${isolationRoot}, re-run the command from its local, plainly-spelled path.`;
      let { noun, possessive } = isolationSubjectWords(isolationRoot);
      let foreignRoot = hasHostWorktreeDeclaration() ? null : linkedWorktreeRepoRoot(roots);
      if (foreignRoot !== null) {
        let worktreeLabel = stripControlCharsForMessage(isolationRoot);
        return `${noun} is isolated in the worktree ${worktreeLabel}, but this command's working directory (${stripControlCharsForMessage(path)}) is in a different worktree (${stripControlCharsForMessage(foreignRoot)}). Refusing to run it there \u2014 ${possessive} commands must run inside its own worktree. Re-run the command from ${worktreeLabel}.`;
      }
      return `${noun} is isolated in the worktree ${isolationRoot}, but this command's working directory resolved to the shared checkout (${path}). Refusing to run it there \u2014 ${possessive} commands must run inside its worktree. Re-run the command from ${isolationRoot}.${describeCaseOnlyMismatch(roots.dir.canonical, roots.worktree.canonical, isolationRoot)}`;
    }
  }
  return null;
}
//@ chunk-7jxyna5q.js:368507-368635 placement
function linkedWorktreeRepoRoot(roots) {
  let canonical = roots.dir.canonical;
  let canonical_2 = roots.worktree.canonical;
  if (canonical === null || canonical_2 === null || isCanonicalUnderRoot(canonical, canonical_2)) return null;
  return isLinkedWorktree(canonical) ? findGitRoot(canonical) : null;
}
//@ chunk-7jxyna5q.js:368635-368807 placement
/**
 * worktree 隔离提示中的主语：当前会话的 worktree 时称 This session，否则称 This agent。
 */
function isolationSubjectWords(worktreePath) {
  return getCurrentWorktreeSession()?.worktreePath === worktreePath
    ? {
        noun: "This session",
        possessive: "a worktree-isolated session's",
      }
    : {
        noun: "This agent",
        possessive: "a worktree-isolated agent's",
      };
}
//@ chunk-7jxyna5q.js:368807-368849 placement
/**
 * 共享检出根的越界部分。
 */
function escapedSharedRoots(path, worktreeDir) {
  return sharedCheckoutRoots(path, worktreeDir).escaped;
}
//@ chunk-7jxyna5q.js:368849-369523 placement
/**
 * 计算隔离 worktree 需要拦住的共享检出根：原始 cwd、会话启动锚点及其 git 根/规范 git 根，统一做包含判断解析。
 */
function sharedCheckoutRoots(path, worktreePath) {
  let containmentTarget = resolveContainmentTarget(path);
  let currentWorktreeSession = getCurrentWorktreeSession();
  let worktreeTarget = null;
  let checkoutDirs = normalizeCaseForComparison_2(
    (currentWorktreeSession !== null && currentWorktreeSession.worktreePath === worktreePath
      ? [currentWorktreeSession.originalCwd]
      : [getOriginalCwd(), currentWorktreeSession?.originalCwd]
    ).filter((dir) => dir !== undefined && dir !== ""),
  );
  let liveLaunchAnchor =
    currentWorktreeSession?.liveLaunchAnchor !== undefined && currentWorktreeSession.liveLaunchAnchor !== ""
      ? currentWorktreeSession.liveLaunchAnchor
      : undefined;
  let anchorOutOfReach =
    liveLaunchAnchor !== undefined &&
    (isNonWslUncPath(liveLaunchAnchor) || isNetworkMountRoot(liveLaunchAnchor));
  let linkedRoot = () => linkedRepoRootOf(worktreePath);
  let anchorRoots =
    liveLaunchAnchor !== undefined && !anchorOutOfReach
      ? [findGitRoot(liveLaunchAnchor), findCanonicalGitRoot(liveLaunchAnchor)].filter(
          (root) => root !== null && root !== undefined,
        )
      : [];
  let linkedRootPath = linkedRoot();
  let hasAnchorRoots = anchorRoots.length > 0;
  let rawRoots = [
    ...checkoutDirs.flatMap((dir) =>
      isNonWslUncPath(dir) || isNetworkMountRoot(dir)
        ? [dir]
        : [findGitRoot(dir) ?? dir, findCanonicalGitRoot(dir)],
    ),
    ...anchorRoots,
    ...(liveLaunchAnchor !== undefined && !hasAnchorRoots ? [liveLaunchAnchor] : []),
    linkedRootPath,
  ];
  let mapped = normalizeCaseForComparison_2(rawRoots.filter((root) => root !== null)).map((root) =>
    resolveContainmentTarget(root),
  );
  if (!mapped.some((root) => isOutsideContainment(containmentTarget, root)))
    return {
      dir: containmentTarget,
      worktree: worktreeTarget,
      roots: mapped,
      escaped: false,
    };
  worktreeTarget ??= resolveContainmentTarget(worktreePath);
  if (isSameContainmentPath(containmentTarget, worktreeTarget))
    return {
      dir: containmentTarget,
      worktree: worktreeTarget,
      roots: mapped,
      escaped: false,
    };
  return {
    dir: containmentTarget,
    worktree: worktreeTarget,
    roots: mapped,
    escaped: true,
  };
}
//@ chunk-7jxyna5q.js:369523-369624 placement
function canonicalRepoRootOrSentinel(path) {
  if (!isLinkedWorktree(path)) return REPO_NEGATIVE_RESULT;
  let containmentTarget = resolveContainmentTarget(path);
  if (!detectTerminal(findGitRoot(path), containmentTarget.lexical)) return REPO_NEGATIVE_RESULT;
  return findCanonicalGitRoot(path) ?? REPO_NEGATIVE_RESULT;
}
//@ chunk-7jxyna5q.js:369624-369702 placement
function linkedRepoRootOf(worktreePath) {
  let root = memoizeMap(getGitRepoCache().linkedFromRootByPin, worktreePath, canonicalRepoRootOrSentinel);
  return root === REPO_NEGATIVE_RESULT ? null : root;
}
//@ chunk-7jxyna5q.js:369702-369835 placement (2.1.88 match: detectTerminal, 0.92)
function detectTerminal(gitRoot, lexical, platform = "linux") {
  if (gitRoot === null) return false;
  let spelledRoot = platform === "darwin" ? isSystemVolumePath(gitRoot) : gitRoot;
  if (platform !== "win32") spelledRoot = isNetworkMountPath_2(spelledRoot, platform);
  else spelledRoot = toWin32Backslashes(isWslLocalhostPath(spelledRoot));
  return spelledRoot === lexical;
}
//@ chunk-7jxyna5q.js:369835-369860 placement
var EMPTY_RUNTIME; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:369835", () => {
  EMPTY_RUNTIME = Object.freeze({});
});
//@ chunk-7jxyna5q.js:369860-369971 placement
class IsolationRuntimeSlot {
  #e;
  register(runtime) {
    this.#e ??= runtime;
  }
  get runtime() {
    return this.#e ?? EMPTY_RUNTIME;
  }
  get registered() {
    return this.#e !== undefined;
  }
}
//@ chunk-7jxyna5q.js:369971-369996 placement
var isolationRuntimeByHost; // deferred: uses IsolationRuntimeSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:369971", () => {
  isolationRuntimeByHost = new HostScoped(() => new IsolationRuntimeSlot());
});
//@ chunk-7jxyna5q.js:369996-370033 placement
function isolationRuntime() {
  return isolationRuntimeByHost.of(getRootSession().host);
}
//@ chunk-7jxyna5q.js:370033-370066 placement
/**
 * 注册隔离运行时。
 */
function registerIsolationRuntime(runtime) {
  isolationRuntime().register(runtime);
}
//@ chunk-7jxyna5q.js:370066-370101 placement
/**
 * 取隔离运行时服务。
 */
function isolationRuntimeService() {
  return isolationRuntime().runtime;
}
//@ chunk-5xgkngpb.js:1368617-1368770 placement
/**
 * 后台会话隔离方式：环境变量 CLAUDE_BG_ISOLATION（worktree/none）优先，其次后台接管设置，最后读 settings.worktree.bgIsolation。
 */
function getBgIsolationSetting() {
  let CLAUDE_BG_ISOLATION = env.CLAUDE_BG_ISOLATION;
  if (CLAUDE_BG_ISOLATION === "worktree" || CLAUDE_BG_ISOLATION === "none") return CLAUDE_BG_ISOLATION;
  let bgTakeover = getBgTakeover();
  if (bgTakeover) return bgTakeover.bgIsolation;
  return getInitialSettings().worktree?.bgIsolation;
}
//@ chunk-5xgkngpb.js:1368770-1370572 placement
/**
 * 检查路径是否在 worktree 隔离范围内，范围外时提示改写 worktree 中的副本。
 */
function checkWorktreeIsolation_2(path, ctx) {
  {
    let worktreePath = isolationWorktreeFor(ctx);
    if (worktreePath) {
      let roots = sharedCheckoutRoots(path, worktreePath);
      if (!roots.escaped) return worktreeFenceWriteNotice(path, worktreePath);
      let containmentKind = pathContainmentKind(roots.dir, roots.roots);
      if (containmentKind === "unresolvable") return unresolvableWriteMessage(worktreePath);
      if (containmentKind === "network") return networkWriteMessage(worktreePath);
      let { noun } = isolationSubjectWords(worktreePath);
      let foreignRepoRoot = hasHostWorktreeDeclaration() ? null : linkedWorktreeRepoRoot(roots);
      if (foreignRepoRoot !== null) {
        let worktreeLabel = stripControlCharsForMessage(worktreePath);
        return `${noun} is isolated in the worktree ${worktreeLabel}, so its writes are limited to that folder. This path is in a different worktree (${stripControlCharsForMessage(foreignRepoRoot)}). Edit the copy of this file under ${worktreeLabel} instead.`;
      }
      return isolatedWorktreeEditMessage(noun, worktreePath, roots.dir.canonical, roots.worktree.canonical);
    }
    let fenceNotice = worktreeFenceWriteNotice(path);
    if (fenceNotice !== null) return fenceNotice;
    if (!isBackgroundSession()) return null;
    if (getBgIsolationSetting() === "none") return null;
    let baseCwd = ctx.agentId ? getOriginalCwd() : getCwd();
    let target = resolveContainmentTarget(path);
    let roots = resolveContainmentTarget(baseCwd);
    if (!isOutsideContainment(target, roots)) return null;
    if (!findGitRoot(baseCwd) && (!hasWorktreeCreateHook() || isIsolationUnavailableForCwd(baseCwd)))
      return null;
    if (isLinkedWorktree(baseCwd)) return null;
    if (target.canonical !== null && isLinkedWorktreeUncached(target.canonical)) return null;
    let containmentKind = pathContainmentKind(target, roots);
    if (containmentKind === "unresolvable") return unresolvableWriteMessage();
    if (containmentKind === "network") return networkWriteMessage();
    let hasCanonical = roots.canonical !== null;
    if (ctx.agentId)
      return `This subagent's parent bg session hasn't isolated yet, so writes to the shared checkout are blocked. Re-spawn this agent with \`isolation: "worktree"\`${hasCanonical ? `, have the parent call ${ENTER_WORKTREE_TOOL_NAME} before spawning, or make the edit inside a linked git worktree you create for this task with \`git worktree add\` \u2014 paths inside a worktree are accepted` : `, or have the parent call ${ENTER_WORKTREE_TOOL_NAME} before spawning`}. (To disable this guard for this repo, set \`"worktree": {"bgIsolation": "none"}\` in .claude/settings.json.)`;
    return `This background session hasn't isolated its changes yet. Call ${ENTER_WORKTREE_TOOL_NAME} first so edits land in a worktree instead of the shared checkout, then retry this edit using the worktree path${hasCanonical ? " (a path inside a linked git worktree, including one you create with `git worktree add`, is accepted)" : ""}. (To disable this guard for this repo, set \`"worktree": {"bgIsolation": "none"}\` in .claude/settings.json.)`;
  }
  return null;
}
//@ chunk-5xgkngpb.js:1370572-1370976 placement
/**
 * 写入路径落在 worktree 围栏内的共享检出而非当前 worktree 时，返回提示"请编辑 worktree 中的副本"；在配置目录内等情况放行（返回 null）。
 */
function worktreeFenceWriteNotice(path, worktreePath) {
  let fence = describeWorktreeWriteFence();
  if (fence === undefined) return null;
  let canonical = resolveContainmentTarget(path).canonical;
  let worktreeCanonical =
    worktreePath === undefined ? fence.tree : resolveContainmentTarget(worktreePath).canonical;
  if (canonical === null || worktreeCanonical === null) return null;
  let filtered = fence.fence.filter((fencePath) => isPathContainedIn(fencePath, canonical));
  if (
    filtered.length === 0 ||
    isPathContainedIn(fence.tree, canonical) ||
    isPathContainedIn(worktreeCanonical, canonical)
  )
    return null;
  let configDir = resolve(getClaudeConfigDir());
  let canonical_2 = resolveContainmentTarget(nativeRealpathLong(configDir) ?? configDir).canonical;
  if (
    canonical_2 !== null &&
    isPathContainedIn(canonical_2, canonical) &&
    filtered.every((fencePath) => isPathContainedIn(fencePath, canonical_2))
  )
    return null;
  return isolatedWorktreeEditMessage(
    worktreePath === undefined ? "This session" : isolationSubjectWords(worktreePath).noun,
    stripControlCharsForMessage(worktreePath ?? fence.tree),
    canonical,
    worktreeCanonical,
  );
}
//@ chunk-5xgkngpb.js:1370976-1371131 placement
function isolatedWorktreeEditMessage(noun, worktreePath, canonicalPath, worktreeCanonical) {
  return `${noun} is isolated in the worktree ${worktreePath}. Edit the worktree copy of this file instead of the shared-checkout path.${describeCaseOnlyMismatch(canonicalPath, worktreeCanonical, worktreePath)}`;
}
//@ chunk-5xgkngpb.js:1371131-1371287 placement
function pathContainmentKind(target, roots) {
  if (hasUnresolvedCanonicalPath(target)) return "unresolvable";
  let rootList = Array.isArray(roots) ? roots : [roots];
  if (target.skipped && !rootList.some((root) => root.skipped || hasUnresolvedCanonicalPath(root)))
    return "network";
  return "contained";
}
//@ chunk-5xgkngpb.js:1371287-1371723 placement
/**
 * 写入因路径无法安全解析（符号链接含原始点段、网络/设备命名空间、祖先目录不可读）被拦截时的说明，建议改用直接的普通路径（或 worktree 内的无链接路径）。
 */
function unresolvableWriteMessage(worktreePath) {
  return `This write was blocked because the path is spelled in a form that cannot be safely resolved (for example through a symlink storing a raw dot segment, a network-share or device-namespace shape, or an unreadable ancestor directory). ${worktreePath === undefined ? "Retry the edit addressing the file by a direct, plainly-spelled path." : `If the file is inside the worktree ${worktreePath}, address it by its direct symlink-free path instead.`}`;
}
//@ chunk-5xgkngpb.js:1371723-1372136 placement
/**
 * 写入因路径是网络形态（UNC 共享或 /net 自动挂载）而本会话检出在本地被拦截时的说明，建议用本地普通路径访问。
 */
function networkWriteMessage(worktreePath) {
  return `This write was blocked because the path is network-shaped (a UNC share or /net automount spelling) while this session's checkout is local. Isolating cannot unblock it. ${worktreePath === undefined ? "If the file is genuinely local, retry the edit addressing it by its local, plainly-spelled path." : `If the file is genuinely inside the worktree ${worktreePath}, address it by its local, plainly-spelled path instead.`}`;
}
export {
  getBgIsolationSetting,
  checkWorktreeIsolation_2,
  isolationRuntimeService,
  stripControlCharsForMessage,
  checkWorktreeIsolationSync,
  gitRootsForPath,
  compareSameContainment,
  worktreeLocationOf,
  hasHostWorktreeDeclaration,
  BLOCKED_CWD_MESSAGES,
  isolationSubjectWords,
  isolationWorktreeFor,
  getClaudeWorktreesDir,
  checkWorktreePath,
  candidateWorktreeDirs,
  worktreesDirSpec,
  checkWorktreeIsolation,
  parseWorktreeAddError,
  describeRepoRelativeLocation,
  worktreesDirSpecs,
  CONTROL_CHAR_RE,
  CONTROL_OR_FORMAT_CHAR_RE,
  getWorktreesDirSpec,
  registerIsolationRuntime,
  isSameRepoWorktree,
  escapedSharedRoots,
};

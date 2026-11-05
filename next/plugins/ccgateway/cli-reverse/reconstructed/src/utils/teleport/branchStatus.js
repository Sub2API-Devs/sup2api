/**
 * utils/teleport/branchStatus.ts
 *
 * 2.1.316 新增：分支状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8), chunk-fepf8jp6.js (24)
 * attribution: placement 32
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  readLaunchGitLayout,
  REACH_UNPLACED,
  buildScreenedGitEnv_2,
  describeGitBinaryFile,
  checkGitVersionForScreening,
  GIT_REF_MAX_BUFFER,
  GIT_REF_LIST_TIMEOUT_MS,
  GIT_REF_READ_TIMEOUT_MS,
  GIT_REF_PROBE_TIMEOUT_MS,
  MAX_REMOTE_BRANCH_CANDIDATES,
} from "./screenedGit.js";
import {
  IN_TREE_SETTINGS_UNREADABLE,
  runGitWithEnv,
  GIT_REPLACE_REFS_CONFIG_ARGS,
  GIT_READ_CONFIG_ARGS,
} from "../git/builderGit/gitEnv.js";
import { GIT_SHA_RE } from "../../remote/tools/servedOwnerSettings.js";
import { createCombinedAbortSignal } from "../combinedAbortSignal.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../git/gitSafeEnv.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { CONVENTIONAL_DEFAULT_BRANCH_NAMES, getBranchForDir } from "../git/gitFilesystem.js";
import { GITHUB_SETUP_HINT } from "../../tasks/RemoteAgentTask/githubSetupHint.js";
import { printableText } from "../stringUtils.js";
import { isGithubDotCom } from "../git/githubUrl.js";
import { getCurrentWorktreeSession } from "../worktree.js";
import { isWorktreeCloudClaimEnabled } from "../shutdown/pendingWrites.js";
import { isSafeRefName as isSafeRefName_2 } from "../git/safeRefName.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, array, stringSchema, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { getErrnoCode, errorMessage } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { withTimeout as withTimeout_2 } from "../sleep.js";
import { deleteFile } from "../../services/api/filesApi.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fepf8jp6.js:94322-97821 placement
/**
 * 检查当前分支是否已推送到远端，用于云会话启动。
 */
async function checkBranchPushed({
  gitRoot,
  remoteName,
  branch,
  headCommit,
  nameContaining = false,
  countAhead = false,
  sessionRoot,
  sessionReach,
  startsInProject = false,
  gitEnvPins = {},
  unsetInGitChildren = [],
  staleBranch,
  signal,
  deadlineMs,
  onSearchAmongAllRefs,
  withRefsAtHead = true,
  onCreation,
}) {
  try {
    let reachRead =
      sessionRoot === undefined
        ? undefined
        : (sessionReach ?? (await readLaunchGitLayout(sessionRoot, signal, startsInProject)));
    if (reachRead === IN_TREE_SETTINGS_UNREADABLE || reachRead === REACH_UNPLACED)
      return {
        kind: "unknown",
        cause: "nothing_vouched",
      };
    if (headCommit !== undefined && !GIT_SHA_RE.test(headCommit))
      return {
        kind: "unknown",
        cause: "not_a_commit_id",
      };
    let headRef = headCommit ?? "HEAD";
    let env = {
      ...buildScreenedGitEnv_2(
        {
          ...gitEnvPins,
          GIT_GRAFT_FILE: "/dev/null",
          GIT_NO_REPLACE_OBJECTS: "1",
        },
        reachRead,
      ),
      ...Object.fromEntries(unsetInGitChildren.map((unsetInGitChild) => [unsetInGitChild, undefined])),
    };
    let screen =
      reachRead === undefined
        ? describeGitBinaryFile(undefined)
        : await checkGitVersionForScreening(reachRead, {
            dir: gitRoot,
            env,
            signal,
            startsInProject,
          });
    let runGitBound = async (timeoutHint, script) => {
      let max = Math.max(1, Math.floor(deadlineMs ?? timeoutHint));
      let combinedAbortSignal = createCombinedAbortSignal(signal, {
        timeoutMs: max,
        refTimer: true,
      });
      try {
        return await script((args, input) =>
          runGitWithEnv(screen, [...GIT_SAFE_GLOBAL_ARGS, ...GIT_REPLACE_REFS_CONFIG_ARGS, ...args], {
            dir: gitRoot,
            env,
            abortSignal: combinedAbortSignal.signal,
            timeout: max,
            maxBuffer: GIT_REF_MAX_BUFFER,
            preserveOutputOnError: false,
            ...(input === undefined
              ? {
                  stdin: "ignore",
                }
              : {
                  input,
                }),
          }),
        );
      } finally {
        combinedAbortSignal.cleanup();
      }
    };
    let remotePrefix = `refs/remotes/${remoteName}/`;
    let staleRef = staleBranch === undefined ? null : `${remotePrefix}${staleBranch}`;
    let isStaleBranch = staleBranch !== undefined && staleBranch === branch;
    let findBranches = (git, pushed) =>
      findRemoteBranches(git, {
        remoteName,
        pushed,
        staleRef,
        head: headRef,
        headCommit,
        nameContaining,
      });
    let firstResult = await runGitBound(GIT_REF_LIST_TIMEOUT_MS, async (git_2) => {
      if (branch !== "HEAD" && !isStaleBranch) {
        let verify = await git_2(["show-ref", "--verify", "--quiet", `${remotePrefix}${branch}`]);
        if (verify.exitCode === 0) {
          if (!countAhead)
            return {
              kind: "on_remote",
            };
          let aheadCount = await countCommitsBetween(git_2, `${remotePrefix}${branch}`, headRef);
          if (
            aheadCount === null ||
            (aheadCount > 0 &&
              (await git_2(["rev-parse", "--is-shallow-repository"])).stdout.trim() !== "false")
          )
            return {
              kind: "on_remote",
            };
          return {
            kind: "on_remote",
            aheadCount,
          };
        }
        if (verify.exitCode !== 1)
          return {
            kind: "unknown",
            cause: "git_failed",
          };
      }
      let hasRefspec = isStaleBranch ? true : await hasStandardFetchRefspec(git_2, remoteName);
      if (hasRefspec !== true)
        return {
          kind: "unknown",
          cause: hasRefspec === null ? "git_failed" : "refspec_not_covering",
        };
      if (branch === "HEAD")
        return {
          kind: "search_all_refs",
          defaultBranch: null,
        };
      let [defaultBranchRefs, upstreamRefs, { creationRead, creation, refsAt: refsAtHead }] =
        await Promise.all([
          findDefaultBranchRefs(git_2, remotePrefix).catch(() => null),
          listUpstreamRefs(git_2, remotePrefix).catch(() => []),
          readBranchCreationPoint(git_2, branch)
            .catch(() => "read_failed")
            .then(async (creationResult) => ({
              creationRead: creationResult,
              creation: typeof creationResult === "object" ? creationResult : null,
              refsAt: withRefsAtHead
                ? await findRefsPointingAt(
                    git_2,
                    remotePrefix,
                    headRef,
                    typeof creationResult === "object" ? creationResult.commit : null,
                  ).catch(() => ({
                    atHead: [],
                    atCreation: [],
                  }))
                : {
                    atHead: [],
                    atCreation: [],
                  },
            })),
        ]);
      let defaultBranch = defaultBranchRefs?.name === staleBranch ? null : (defaultBranchRefs?.name ?? null);
      let creationRemoteRef = creation === null ? null : toRemoteTrackingRef(creation.from, remoteName);
      let localRefs = await listLocalRefs(
        git_2,
        normalizeCaseForComparison_2([
          ...(defaultBranchRefs?.refs ?? []),
          ...upstreamRefs,
          ...refsAtHead.atHead.filter((atHeadRef) => atHeadRef !== staleRef).slice(0, 1),
          ...refsAtHead.atCreation.filter((atCreationRef) => atCreationRef !== staleRef).slice(0, 1),
          ...(creationRemoteRef === null ? [] : [creationRemoteRef]),
        ]).filter((candidateRef) => candidateRef !== staleRef),
      ).catch(() => []);
      let ownResult =
        localRefs.length === 0
          ? null
          : await findBranches(git_2, {
              kind: "own",
              present: localRefs,
            });
      if (ownResult?.kind !== "pushed_ancestor") {
        reportCreation(
          onCreation,
          creation === null ? creationAbsenceReason(creationRead) : "no_first_answer",
        );
        return {
          kind: "search_all_refs",
          defaultBranch,
        };
      }
      let ownStart = {
        ...ownResult,
        fromOwnRefs: true,
      };
      let isBelowStart =
        creation !== null &&
        (creation.commit === ownStart.commit ||
          (await git_2(["merge-base", "--is-ancestor", creation.commit, ownStart.commit])).exitCode === 0);
      reportCreation(
        onCreation,
        creation === null
          ? creationAbsenceReason(creationRead)
          : isBelowStart
            ? "below_start"
            : "not_below_start",
      );
      return isBelowStart
        ? ownStart
        : {
            kind: "search_all_refs",
            defaultBranch,
            orElse: ownStart,
          };
    });
    if (firstResult.kind !== "search_all_refs") return firstResult;
    let isAborted = () => signal?.aborted === true;
    if (isAborted()) {
      if (firstResult.orElse !== undefined) return firstResult.orElse;
      return branch === "HEAD"
        ? {
            kind: "unknown",
            cause: "git_failed",
          }
        : {
            kind: "not_on_remote",
            searchFailure: "git_failed",
            defaultBranch: firstResult.defaultBranch,
          };
    }
    let searchAllRefs = () =>
      runGitBound(GIT_REF_READ_TIMEOUT_MS, (git_3) =>
        findBranches(git_3, {
          kind: "all",
        }),
      );
    let allRefsResult = await searchAllRefs();
    let needsRetry = allRefsResult.kind === "unknown" && allRefsResult.cause === "git_failed" && !isAborted();
    let finalResult = needsRetry ? await searchAllRefs() : allRefsResult;
    try {
      onSearchAmongAllRefs?.(needsRetry ? 2 : 1);
    } catch {}
    let orElse = firstResult.orElse;
    if (orElse !== undefined) return finalResult.kind === "pushed_ancestor" ? finalResult : orElse;
    if (isStaleBranch && finalResult.kind === "none")
      return {
        kind: "not_on_remote",
        searchFailure: "nothing_beneath",
        defaultBranch: firstResult.defaultBranch,
      };
    return finalResult.kind === "unknown" && branch !== "HEAD"
      ? {
          kind: "not_on_remote",
          searchFailure: finalResult.cause,
          defaultBranch: firstResult.defaultBranch,
        }
      : finalResult;
  } catch {
    return {
      kind: "unknown",
      cause: "threw",
    };
  }
}
//@ chunk-fepf8jp6.js:97821-97857 placement
function reportCreation(onCreation, result) {
  try {
    onCreation?.(result);
  } catch {}
}
//@ chunk-fepf8jp6.js:97857-98225 placement
/**
 * 从分支 reflog 中找出分支的创建点（创建时的提交与来源）。
 */
async function readBranchCreationPoint(runGit, branch) {
  let result = await runGit([
    "-c",
    "log.showSignature=false",
    "log",
    "-g",
    "--format=%H%x00%gs",
    `refs/heads/${branch}`,
    "--",
  ]);
  if (result.exitCode !== 0) return "read_failed";
  let last = result.stdout
    .split(
      `
`,
    )
    .filter((line) => line.trim() !== "")
    .at(-1);
  let [commitHash = "", reflogSubject = ""] = (last ?? "").split("\x00");
  let creationKey = "branch: Created from ";
  return GIT_SHA_RE.test(commitHash) && reflogSubject.startsWith(creationKey)
    ? {
        commit: commitHash,
        from: reflogSubject.slice(creationKey.length).trim(),
      }
    : "none";
}
//@ chunk-fepf8jp6.js:98225-98299 placement
function creationAbsenceReason(reason) {
  return reason === "read_failed" ? "read_failed" : "no_creation_entry";
}
//@ chunk-fepf8jp6.js:98299-98513 placement
function toRemoteTrackingRef(from, remoteName) {
  let refPrefix = `refs/remotes/${remoteName}/`;
  let shortPrefix = `${remoteName}/`;
  let branchName = from.startsWith(refPrefix)
    ? from.slice(refPrefix.length)
    : from.startsWith(shortPrefix)
      ? from.slice(shortPrefix.length)
      : null;
  return branchName === null ||
    branchName === "" ||
    branchName === "HEAD" ||
    /[\s~^:?*[\\]|\.\.|@\{/.test(branchName)
    ? null
    : `${refPrefix}${branchName}`;
}
//@ chunk-fepf8jp6.js:98513-98830 placement
/**
 * 列出本地分支及其上游引用。
 */
async function listUpstreamRefs(runGit, remotePrefix) {
  let result = await runGit(["for-each-ref", "--format=%(refname)%00%(upstream)", "refs/heads/"]);
  if (result.exitCode !== 0) return [];
  return result.stdout
    .split(
      `
`,
    )
    .filter(Boolean)
    .flatMap((line) => {
      let [refname = "", upstream = ""] = line.split("\x00");
      return [`${remotePrefix}${refname.slice(11)}`, upstream];
    })
    .filter(
      (line) =>
        line.startsWith(remotePrefix) && line.length > remotePrefix.length && line !== `${remotePrefix}HEAD`,
    );
}
//@ chunk-fepf8jp6.js:98830-99284 placement
/**
 * 列出指向给定提交的引用（可同时匹配两个提交）。
 */
async function findRefsPointingAt(runGit, refPattern, atHead, atCreation) {
  let result = await runGit([
    "for-each-ref",
    `--points-at=${atHead}`,
    ...(atCreation === null ? [] : [`--points-at=${atCreation}`]),
    "--format=%(objectname) %(refname)",
    refPattern,
  ]);
  if (result.exitCode !== 0)
    return {
      atHead: [],
      atCreation: [],
    };
  let flattened = result.stdout
    .split(
      `
`,
    )
    .flatMap((line) => {
      let [commit = "", ref = ""] = line.trim().split(" ");
      return ref.startsWith(refPattern) && ref !== `${refPattern}HEAD`
        ? [
            {
              commit,
              ref,
            },
          ]
        : [];
    });
  return {
    atHead: flattened
      .filter((atHeadEntry) => atHeadEntry.commit !== atCreation)
      .map((atHeadEntry_2) => atHeadEntry_2.ref),
    atCreation: flattened
      .filter((atCreationEntry) => atCreationEntry.commit === atCreation)
      .map((atCreationEntry_2) => atCreationEntry_2.ref),
  };
}
//@ chunk-fepf8jp6.js:99284-99789 placement
async function listLocalRefs(runGit, refs) {
  let reduced = await chunkArray(refs, REF_BATCH_SIZE).reduce(async (acc, batch) => {
    let previous = await acc;
    let result = await runGit(["for-each-ref", "--format=%(objectname) %(refname)", ...batch]);
    if (result.exitCode !== 0) throw Error("for-each-ref failed");
    let flattened = result.stdout
      .split(
        `
`,
      )
      .flatMap((line) => {
        let [line_2 = "", refname = ""] = line.trim().split(" ");
        return GIT_SHA_RE.test(line_2) && batch.includes(refname)
          ? [
              {
                ref: refname,
                commit: line_2,
              },
            ]
          : [];
      });
    previous.push(flattened);
    return previous;
  }, Promise.resolve([]));
  let objectName = new Map(reduced.flat().map(({ ref, commit }) => [ref, commit]));
  return refs.flatMap((others) => {
    let merged = objectName.get(others);
    return merged === undefined
      ? []
      : [
          {
            ref: others,
            commit: merged,
          },
        ];
  });
}
//@ chunk-fepf8jp6.js:99789-99799 placement
var REF_BATCH_SIZE = 64;
//@ chunk-fepf8jp6.js:99799-99894 placement
function chunkArray(array, size) {
  return Array.from(
    {
      length: Math.ceil(array.length / size),
    },
    (unused, index) => array.slice(index * size, (index + 1) * size),
  );
}
//@ chunk-fepf8jp6.js:99894-102279 placement
/**
 * 查找对应的远端分支（for-each-ref，取最近几个）。
 */
async function findRemoteBranches(
  runGit,
  { remoteName, pushed, staleRef, head, headCommit, nameContaining },
) {
  let remotePrefix = `refs/remotes/${remoteName}/`;
  try {
    if (pushed.kind === "all") {
      let probe = await runGit(["for-each-ref", "--count=3", "--format=%(refname)", remotePrefix]);
      if (probe.exitCode !== 0)
        return {
          kind: "unknown",
          cause: "git_failed",
        };
      if (
        probe.stdout
          .split(
            `
`,
          )
          .every(
            (line) =>
              line.trim() === "" ||
              (staleRef !== null && (line.trim() === staleRef || line.trim() === `${remotePrefix}HEAD`)),
          )
      )
        return {
          kind: "none",
          defaultBranch: null,
        };
    }
    let revList = await runGit(
      [
        "--no-replace-objects",
        "rev-list",
        `--max-count=${GIT_REF_PROBE_TIMEOUT_MS + 1}`,
        "--parents",
        head,
        ...(pushed.kind === "all"
          ? [
              "--not",
              ...(staleRef === null
                ? []
                : [`--exclude=${staleRef.slice(13)}`, `--exclude=${remoteName}/HEAD`]),
              `--remotes=${remoteName}`,
            ]
          : ["--stdin"]),
        "--",
      ],
      pushed.kind === "all"
        ? undefined
        : pushed.present.map(({ commit }) => `^${commit}`).join(`
`),
    );
    if (revList.exitCode !== 0)
      return {
        kind: "unknown",
        cause: "git_failed",
      };
    let filtered = revList.stdout
      .split(
        `
`,
      )
      .map((line) => line.trim().split(" ").filter(Boolean))
      .filter((line) => line.length > 0);
    if (filtered.length > GIT_REF_PROBE_TIMEOUT_MS)
      return {
        kind: "none",
        defaultBranch: await getRemoteDefaultBranch(runGit, remotePrefix),
      };
    if (filtered.some((rev) => rev.some((sha) => !GIT_SHA_RE.test(sha))))
      return {
        kind: "unknown",
        cause: "git_failed",
      };
    if (filtered.length > 0) {
      let walkCheck = await runGit(
        [
          ...GIT_READ_CONFIG_ARGS,
          "--no-replace-objects",
          "rev-list",
          "--no-walk=unsorted",
          "--parents",
          "--stdin",
        ],
        filtered.map(([sha_2]) => sha_2).join(`
`),
      );
      if (walkCheck.exitCode !== 0)
        return {
          kind: "unknown",
          cause: "git_failed",
        };
      if (walkCheck.stdout.trim() !== revList.stdout.trim())
        return {
          kind: "unknown",
          cause: "parents_misstated",
        };
    }
    let candidateCommit;
    let aheadCount;
    if (filtered.length === 0 && headCommit !== undefined) {
      candidateCommit = headCommit;
      aheadCount = 0;
    } else if (filtered.length === 0) {
      let headProbe = await runGit(["rev-parse", "-q", "--verify", "HEAD^{commit}"]);
      let trimmed = headProbe.stdout.trim();
      if (headProbe.exitCode !== 0 || !GIT_SHA_RE.test(trimmed))
        return {
          kind: "unknown",
          cause: "git_failed",
        };
      candidateCommit = trimmed;
      aheadCount = 0;
    } else {
      let reachedSet = new Set(filtered.map(([firstParent]) => firstParent));
      let candidates = normalizeCaseForComparison_2(
        filtered.flatMap(([, ...parent]) => parent.filter((parent_2) => !reachedSet.has(parent_2))),
      ).slice(0, MAX_REMOTE_BRANCH_CANDIDATES);
      let [nearest, ...others] = candidates;
      if (nearest === undefined)
        return {
          kind: "none",
          defaultBranch: await getRemoteDefaultBranch(runGit, remotePrefix),
        };
      if (others.length === 0) {
        candidateCommit = nearest;
        aheadCount = filtered.length;
      } else {
        let closestCandidate = await findClosestCandidate(runGit, candidates, head);
        if (closestCandidate === null)
          return {
            kind: "unknown",
            cause: "git_failed",
          };
        candidateCommit = closestCandidate.candidate;
        aheadCount = Math.max(closestCandidate.beyond, filtered.length);
      }
    }
    if (pushed.kind === "all") {
      let remoteBranchPointingAt = await findRemoteBranchPointingAt(
        runGit,
        remotePrefix,
        [remotePrefix],
        candidateCommit,
        staleRef,
      );
      let containedBranch =
        nameContaining && remoteBranchPointingAt === null
          ? await findRemoteBranchContaining(runGit, remotePrefix, [remotePrefix], candidateCommit, staleRef)
          : null;
      return {
        kind: "pushed_ancestor",
        commit: candidateCommit,
        aheadCount,
        branch: remoteBranchPointingAt,
        ...(containedBranch !== null && {
          containedIn: containedBranch,
        }),
      };
    }
    let found = pushed.present.find(({ commit }) => commit === candidateCommit);
    let foundBranch = found === undefined ? null : found.ref.slice(remotePrefix.length);
    let containingBranch =
      foundBranch ??
      (await chunkArray(
        pushed.present.map(({ ref }) => ref),
        REF_BATCH_SIZE,
      ).reduce(
        async (acc, batch) =>
          (await acc) ?? findRemoteBranchContaining(runGit, remotePrefix, batch, candidateCommit, staleRef),
        Promise.resolve(null),
      ));
    return {
      kind: "pushed_ancestor",
      commit: candidateCommit,
      aheadCount,
      branch: foundBranch,
      ...(nameContaining &&
        foundBranch === null &&
        containingBranch !== null && {
          containedIn: containingBranch,
        }),
      ...(containingBranch !== null && {
        foundOn: containingBranch,
      }),
    };
  } catch {
    return {
      kind: "unknown",
      cause: "threw",
    };
  }
}
//@ chunk-fepf8jp6.js:102279-102458 placement
async function countCommitsBetween(runGit, fromRef, toRef) {
  let result = await runGit(["rev-list", "--count", `${fromRef}..${toRef}`, "--"]);
  let count = Number.parseInt(result.stdout.trim(), 10);
  return result.exitCode === 0 && Number.isSafeInteger(count) && count >= 0 ? count : null;
}
//@ chunk-fepf8jp6.js:102458-102664 placement
async function hasStandardFetchRefspec(runGit, remoteName) {
  let result = await runGit(["config", "--get-all", `remote.${remoteName}.fetch`]);
  if (result.exitCode === 1) return false;
  if (result.exitCode !== 0) return null;
  return isStandardFetchRefspec(
    result.stdout
      .split(
        `
`,
      )
      .map((line) => line.trim())
      .filter(Boolean),
    remoteName,
  );
}
//@ chunk-fepf8jp6.js:102664-102839 placement
function isStandardFetchRefspec(refspecs, remoteName) {
  if (refspecs.some((line) => line.startsWith("^"))) return false;
  return refspecs.some((spec) => {
    let [src, dst] = spec.replace(/^\+/, "").split(":");
    return src === "refs/heads/*" && dst === `refs/remotes/${remoteName}/*`;
  });
}
//@ chunk-fepf8jp6.js:102839-103069 placement
async function findClosestCandidate(runGit, candidates, toRef) {
  let results = await Promise.all(
    candidates.map(async (candidate) => ({
      candidate,
      beyond: await countCommitsBetween(runGit, candidate, toRef),
    })),
  );
  let best = null;
  for (let { candidate, beyond } of results) {
    if (beyond === null) return null;
    if (best === null || beyond < best.beyond)
      best = {
        candidate,
        beyond,
      };
  }
  return best;
}
//@ chunk-fepf8jp6.js:103069-103135 placement
async function findRemoteBranchPointingAt(runGit, remoteName, pattern, headCommit, staleRef) {
  return findRemoteBranchFor(runGit, remoteName, pattern, ["--points-at", headCommit], staleRef);
}
//@ chunk-fepf8jp6.js:103135-103200 placement
async function findRemoteBranchContaining(runGit, remoteName, pattern, headCommit, staleRef) {
  return findRemoteBranchFor(runGit, remoteName, pattern, ["--contains", headCommit], staleRef);
}
//@ chunk-fepf8jp6.js:103200-103578 placement
/**
 * 查找本地分支在远端对应的分支引用。
 */
async function findRemoteBranchFor(runGit, remoteName, patterns, refArgs, staleRef) {
  let [result, remoteDefaultBranch] = await Promise.all([
    runGit(["for-each-ref", ...refArgs, "--format=%(refname)", ...patterns]),
    getRemoteDefaultBranch(runGit, remoteName),
  ]);
  if (result.exitCode !== 0) return null;
  let isWantedRef = (refName) =>
    patterns.length === 1 && patterns[0] === remoteName ? true : patterns.includes(refName);
  let mapped = result.stdout
    .split(
      `
`,
    )
    .map((line) => line.trim())
    .filter(
      (refName_2) =>
        refName_2.startsWith(remoteName) &&
        refName_2 !== `${remoteName}HEAD` &&
        refName_2 !== staleRef &&
        isWantedRef(refName_2),
    )
    .map((refName_3) => refName_3.slice(remoteName.length));
  return (
    (remoteDefaultBranch !== null && mapped.includes(remoteDefaultBranch) ? remoteDefaultBranch : null) ??
    mapped[0] ??
    null
  );
}
//@ chunk-fepf8jp6.js:103578-103824 placement
async function getRemoteDefaultBranch(runGit, remoteName) {
  let result = await runGit(["symbolic-ref", "-q", `${remoteName}HEAD`]);
  let trimmed = result.stdout.trim();
  if (result.exitCode !== 0 || !trimmed.startsWith(remoteName) || trimmed.length <= remoteName.length)
    return null;
  return (await runGit(["show-ref", "--verify", "--quiet", trimmed])).exitCode === 0
    ? trimmed.slice(remoteName.length)
    : null;
}
//@ chunk-fepf8jp6.js:103824-104157 placement
/**
 * 查找远端的默认分支引用（远端 HEAD 及常见默认分支名）。
 */
async function findDefaultBranchRefs(runGit, remoteName) {
  let remoteDefaultBranch = await getRemoteDefaultBranch(runGit, remoteName);
  let branchNames = normalizeCaseForComparison_2([
    ...(remoteDefaultBranch === null ? [] : [remoteDefaultBranch]),
    ...CONVENTIONAL_DEFAULT_BRANCH_NAMES,
  ]);
  let result = await runGit([
    "for-each-ref",
    "--format=%(refname)",
    ...branchNames.map((branchName) => `${remoteName}${branchName}`),
  ]);
  if (result.exitCode !== 0) return null;
  let mapped = result.stdout
    .split(
      `
`,
    )
    .map((line) => line.trim());
  let filtered = branchNames.filter((branchName_2) => mapped.includes(`${remoteName}${branchName_2}`));
  let [matchedRef] = filtered;
  return matchedRef === undefined
    ? null
    : {
        name: matchedRef,
        refs: filtered.map((branchName_3) => `${remoteName}${branchName_3}`),
      };
}
//@ chunk-fepf8jp6.js:104157-104537 placement
/**
 * 生成找不到 GitHub 仓库时的原因说明（非 git 仓库、信任未确认等）。
 */
function describeNoRepositoryReason(reason) {
  let message = `${
    {
      no_git: "This folder is not a git repository, so",
      trust_unconfirmed: "This folder's trust has not been confirmed, so its git remote was not read and",
      no_github_repository: "No GitHub repository was found for this folder, so",
    }[reason]
  } the cloud session starts empty: nothing from this folder is copied into it.`;
  return reason === "no_github_repository" ? `${message} ${GITHUB_SETUP_HINT}` : message;
}
//@ chunk-fepf8jp6.js:104537-104926 placement
/**
 * 生成分支不在远端时的提示，按需建议推送。
 */
function branchNotOnRemoteMessage({ branch, host, revision, advisesPush = true, goneFromGithub = false }) {
  let revisionText = printableText(revision);
  return `Branch ${printableText(branch)} ${goneFromGithub ? "is not on GitHub" : `is not on ${isGithubDotCom(host) ? "GitHub" : host} as of the last fetch`}, so the cloud session starts from the default branch, ${revisionText}, instead, without the commits that ${revisionText} lacks or any uncommitted changes.${advisesPush ? " Push the branch, then start a new session to use it." : ""}`;
}
//@ chunk-fepf8jp6.js:104926-105311 placement
/**
 * 生成本地分支领先远端若干提交时的提示，按需建议推送。
 */
function branchAheadOfRemoteMessage({ branch, aheadCount, remoteName, advisesPush }) {
  let branchText = printableText(branch);
  let isSingleCommit = aheadCount === 1;
  return `Branch ${branchText} is ${isSingleCommit ? "1 commit" : `${aheadCount.toLocaleString("en-US")} commits`} ahead of ${remoteName}/${branchText} (as last fetched), so the cloud session starts without ${isSingleCommit ? "it" : "them"} and without any uncommitted changes.${advisesPush ? ` Push the branch and start a new session to have ${isSingleCommit ? "that commit" : "those commits"}.` : ""}`;
}
//@ chunk-fepf8jp6.js:105311-106823 placement
/**
 * 说明当前检出能否作为云会话起点（分离 HEAD、领先过多等）。
 */
function describeBranchStartability({
  branch,
  start,
  remoteName,
  host,
  byName,
  carried,
  isAheadOfRemote = false,
  advisesPush = true,
}) {
  let branchText = printableText(branch);
  let startBranchText = start.branch === null ? null : printableText(start.branch);
  let byNameText = byName === null ? null : printableText(byName);
  let startText =
    branch === "HEAD"
      ? "This checkout is on a detached HEAD"
      : isAheadOfRemote
        ? `Branch ${branchText} is too far ahead of ${remoteName}/${branchText} to start from there`
        : `Branch ${branchText} is not on ${isGithubDotCom(host) ? "GitHub" : host}`;
  let sliced = start.commit.slice(0, 12);
  let carriedText =
    startBranchText === null ? `commit ${sliced}` : `${remoteName}/${startBranchText} (${sliced})`;
  let hostText = start.aheadCount === 1 ? "1 commit" : `${start.aheadCount} commits`;
  let remoteText =
    start.fromOwnRefs === true && start.foundOn !== undefined && start.aheadCount > 0
      ? `${remoteName}/${printableText(start.foundOn)}`
      : null;
  let pushedText = start.fromOwnRefs === true && remoteText === null && start.aheadCount > 0;
  let detailText =
    start.aheadCount === 0
      ? `its own commit, which ${startBranchText === null ? "the remote has" : `${remoteName}/${startBranchText} has`} (${sliced})`
      : remoteText !== null
        ? `the newest commit beneath it that ${remoteText} has (${sliced}), ${hostText} back`
        : pushedText
          ? `a pushed commit beneath it, ${carriedText}, ${hostText} back`
          : `the newest pushed commit beneath it, ${carriedText}, ${hostText} back`;
  let message =
    byNameText === null
      ? `the cloud session starts from ${detailText}`
      : `the cloud session starts from the tip of ${byNameText} on ${host} instead (a host other than github.com is not asked for a commit by id)`;
  let hint =
    carried || (start.aheadCount === 0 && byName === null)
      ? ""
      : `${remoteText !== null ? ` Commits that ${remoteText} lacks, and any uncommitted changes, stay on this machine` : pushedText ? " Later commits and any uncommitted changes stay on this machine" : ` ${start.aheadCount === 0 ? "Uncommitted changes" : start.aheadCount === 1 ? "That commit and any uncommitted changes" : `Those ${start.aheadCount} commits and any uncommitted changes`} stay on this machine`}${advisesPush || start.aheadCount === 0 ? "; push the branch to start from it" : ""}.`;
  return `${startText}, so ${message}.${hint}`;
}
//@ chunk-5xgkngpb.js:1990958-1991028 placement
async function branchForTeleport(dir, branchName) {
  if (getCurrentWorktreeSession() === null || !isWorktreeCloudClaimEnabled()) return branchName;
  return getBranchForDir(dir);
}
//@ chunk-5xgkngpb.js:1991028-1991116 placement
function recordedOriginalBranch(branchName) {
  let originalBranch = getCurrentWorktreeSession()?.originalBranch;
  return typeof originalBranch === "string" &&
    isSafeRefName_2(originalBranch) &&
    isWorktreeCloudClaimEnabled()
    ? originalBranch
    : branchName;
}
//@ chunk-5xgkngpb.js:1991116-1991244 placement
var BATCH_BRANCH_STATUS_PATH; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var batchBranchStatusSchema;
deferInit("chunk-5xgkngpb.js:1991116", () => {
  BATCH_BRANCH_STATUS_PATH = "/v1/code/github/get-batch-branch-status";
  batchBranchStatusSchema = DoctorLazy(() =>
    objectSchema({
      branch_statuses: array(
        objectSchema({
          repo: stringSchema(),
          branch: stringSchema(),
          branch_exists: booleanSchema(),
        }),
      ),
    }),
  );
});
//@ chunk-5xgkngpb.js:1991244-1991481 placement
function createBranchExistsLookup(body, repo) {
  let parsed = batchBranchStatusSchema().safeParse(body);
  let statuses = parsed.success
    ? parsed.data.branch_statuses.filter(
        (branchStatus) => branchStatus.repo.toLowerCase() === repo.toLowerCase(),
      )
    : [];
  return (lookup) => {
    let found = statuses.find((branchStatus) => branchStatus.branch === lookup);
    return found === undefined ? "cannot_tell" : found.branch_exists ? "yes" : "no";
  };
}
//@ chunk-5xgkngpb.js:1991481-1992143 placement
async function askGithubBranchExists({ owner, name: repoName, branches, timeoutMs, signal, credentials }) {
  let repoFullName = `${owner}/${repoName}`;
  let now = Date.now();
  let response = await apiClient
    .post(
      BATCH_BRANCH_STATUS_PATH,
      {
        repo_branches: branches.map((branch) => ({
          repo: repoFullName,
          branch,
        })),
        include_compare: false,
        include_review_decision: false,
      },
      {
        auth: "teleport-org",
        isRouteOwned401: () => true,
        timeout: timeoutMs,
        signal,
        validateStatus: () => true,
        credentials,
      },
    )
    .then(
      (requestInit) =>
        requestInit.ok
          ? {
              body: requestInit.status === 200 ? requestInit.data : undefined,
              how: `HTTP ${requestInit.status}`,
            }
          : {
              body: undefined,
              how: `not sent: ${requestInit.reason}`,
            },
      (error) => ({
        body: undefined,
        how: `request failed: ${getErrnoCode(error) ?? "no code"}`,
      }),
    );
  let branchExistsLookup = createBranchExistsLookup(response.body, repoFullName);
  logForDebugging(
    `[githubBranchStatus] ${repoFullName}: ${branches.map((branch) => `does GitHub have branch ${branch}? ${branchExistsLookup(branch)}`).join("; ")} (${response.how}, ${Date.now() - now} ms)`,
  );
  return branchExistsLookup;
}
//@ chunk-5xgkngpb.js:1992143-1992830 placement
/**
 * 决定云会话的起点：先查分支状态，必要时再询问是否连接 GitHub。
 */
async function resolveStartWithGithub({ lookUp, ask, alwaysAsk = false }) {
  let preAsked = alwaysAsk ? ask?.() : undefined;
  let start = await lookUp({
    remoteLacksBranch: false,
  });
  if (ask === null)
    return {
      start,
      github: "not_asked",
    };
  let canSkipAsk = start.kind === "pushed_ancestor" || start.kind === "none";
  if (canSkipAsk && !alwaysAsk)
    return {
      start,
      github: "not_needed",
    };
  let github = await (preAsked ?? ask());
  if (github === null)
    return {
      start,
      github: "not_asked",
    };
  if (canSkipAsk)
    return {
      start:
        github === "yes"
          ? {
              kind: "on_remote",
            }
          : start,
      github,
    };
  if (start.kind === "not_on_remote")
    return github === "yes"
      ? {
          start: {
            kind: "on_remote",
          },
          github,
          failedSearch: start.searchFailure,
        }
      : {
          start,
          github,
        };
  if (github !== "no")
    return {
      start,
      github,
    };
  let github_2 = await lookUp({
    remoteLacksBranch: true,
  });
  return {
    start:
      github_2.kind === "unknown"
        ? {
            kind: "not_on_remote",
            searchFailure: github_2.cause,
            defaultBranch: null,
          }
        : github_2,
    github,
  };
}
//@ chunk-5xgkngpb.js:1992830-1992878 placement
var SEED_DELETE_TIMEOUT_MS = 5000;
var SEED_DELETE_TIMEOUT_TEXT = "seed bundle delete timed out";
//@ chunk-5xgkngpb.js:1992878-1993353 placement
/**
 * 删除已上传的种子 bundle 文件（限时），返回失败原因。
 */
async function discardUploadedSeedBundle(options) {
  let errorReason;
  try {
    let result = await withTimeout_2(
      deleteFile(options.fileId, options.config, {
        timeoutMs: SEED_DELETE_TIMEOUT_MS,
      }),
      SEED_DELETE_TIMEOUT_MS,
      SEED_DELETE_TIMEOUT_TEXT,
    );
    errorReason = result.success ? undefined : result.reason;
  } catch (error) {
    errorReason =
      error instanceof Error && error.message === SEED_DELETE_TIMEOUT_TEXT ? "timeout" : "unexpected";
    logForDebugging(`[teleportToRemote] Deleting the uploaded bundle failed: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
  if (errorReason === undefined) {
    logFeatureOk("teleport_seed_bundle_discard");
    return;
  }
  logForDebugging(
    `[teleportToRemote] Could not delete the uploaded bundle (${errorReason}); its expiry removes it`,
    {
      level: "warn",
    },
  );
  logFeatureSad("teleport_seed_bundle_discard", errorReason);
}
export {
  askGithubBranchExists,
  resolveStartWithGithub,
  checkBranchPushed,
  recordedOriginalBranch,
  branchForTeleport,
  describeBranchStartability,
  branchNotOnRemoteMessage,
  branchAheadOfRemoteMessage,
  describeNoRepositoryReason,
  discardUploadedSeedBundle,
};

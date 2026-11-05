/**
 * utils/teleport/gitBundle.ts
 *
 * 把本地工作树打包为 git bundle 上传给云会话（CCR）：历史边界、浅克隆、引用选择、布局与设置检查、上传与回退说明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teleport/gitBundle.ts
 * pieces: chunk-sfy2wa1e.js (80)
 * attribution: placement 80
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstat, open, stat, realpath, unlink } from "fs/promises";
import { resolve, join, dirname, isAbsolute, basename } from "path";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  GIT_LIST_ENV,
  C_LOCALE_ENV,
  GIT_READ_CONFIG_ARGS,
  GIT_REPLACE_REFS_CONFIG_ARGS,
  buildGitEnv,
  resolveTempDir,
  findOverriddenGitConfigVar,
} from "../git/builderGit/gitEnv.js";
import { readOnlyNoFollowFlags } from "../platformTargets.js";
import { firstLineOf, plural, truncateWithCount, getFirstLine } from "../stringUtils.js";
import {
  currentGitBinaryState,
  GitBinaryError,
  isGitShimOnly,
  windowsGitDirNote,
} from "../git/builderGit/gitBinary.js";
import {
  listGitRefs,
  runGitForAudit,
  buildAuditEnv,
  MAX_INCLUDE_FILES,
  auditRefStorageSetting,
  inspectGitLayout,
  hasOnlyKnownFilterDrivers,
} from "../git/builderGit/gitConfigAudit.js";
import { GIT_SAFE_GLOBAL_ARGS, IGNORE_SUBMODULES_DIRTY_FLAG } from "../git/gitSafeEnv.js";
import { logForDebugging } from "../debug.js";
import { findGitRoot } from "../git.js";
import { getCwd } from "../cwd.js";
import { runInvocation } from "../detectRepository.js";
import {
  isGitLayoutUntampered,
  detectUnsupportedLayout,
  gitLayoutFaultOf,
  MAX_PLACEMENT_FILE_BYTES,
} from "../git/builderGit/gitDirShape.js";
import {
  REFS_SEED_STASH,
  REFS_SEED_ROOT,
  copyVerifiedBundle,
  FRESH_CLONE_HINT,
  KEEP_FOLDER_HINT,
  DO_NOT_RUN_GIT_ADVICE,
  createSeedRefNames,
  staleSeedRefs,
  createBundleOutput,
  readBundleFileSafely,
  verifyBundleFile,
  logBundleStartLocation,
  classifyCheckoutStart,
} from "./gitBundleVerify.js";
import {
  STASH_IDENTITY_ENV,
  captureWipStash,
  createStashCommit,
  formatDirectoryLabel,
  HEAD_UNVERIFIABLE_TEXT,
} from "./wipStash.js";
import {
  enclosingCheckoutAboveHome,
  findEnclosingRepos,
  classifyHomePosition,
  nearestRepoAncestor,
  pathIsForeignOrUnsafePointer,
  checkoutDirOfGitDir,
  UNEXAMINABLE_REACH_NOTE,
} from "../git/builderGit/sandboxReach.js";
import {
  checkSessionTempRoot,
  probeWorktreeConfigFile,
  readTextFileQuiet,
  holdDirectory,
  classifyIdentity,
  compareWorkTree,
  getFileIdentity_2,
  toPosixSpelling,
} from "../git/builderGit/gitDirIdentity.js";
import {
  isPathInside,
  readGitdirPointer,
  PROTECTED_ENV_VARS_2,
  HOME_ENV_VARS,
} from "../permissions/protectedEnvAndGitPaths.js";
import { readInTreeGitConfig, LAUNCH_ENV_CONFIG_NOTE } from "../git/builderGit/inTreeConfig.js";
import { replaceControlChars } from "../resultError.js";
import { getErrnoCode, errorMessage } from "../errors.js";
import {
  protectedSettingsFiles,
  protectedSettingSourcesWithFlag,
  findEnvChangedBySettings,
} from "../permissions/protectedSettingsPaths.js";
import { getSettingsForSourceTightenOnly, getSettingsForSource } from "../settings/settings.js";
import { PROJECT_SCOPE_BLOCKED_ENV_VARS } from "../managedEnvApply.js";
import { getPlatform } from "../platform.js";
import {
  rewriteCopyAsSingleFile,
  rebuildCachedTree,
  findUnsupportedGitEnv,
  copyRepositoryForBuild,
  indexFileEnv,
} from "../git/builderGit/repoCopy.js";
import { checkGitRootLocation, classifyPathIdentity, GIT_ROOT_REFUSALS } from "./gitBundleLayout.js";
import { countWhere } from "../collections.js";
import { isEnvTruthy } from "../envUtils.js";
import { getEnvCaseInsensitive } from "../plugins/securityDefaultPlugin.js";
import { env } from "../env.js";
import { firstGitFailureClass, seenStderr, WITHHELD_STDERR_NOTICE } from "../git/builderGit/gitRun.js";
import { formatFileSize } from "../format.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { emptyBindingFacts, classifyBindingFolder } from "../../bridge/deviceBinding.js";
import { hasBackslash, cwdHasBackslash } from "../pathClassification.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { tmpdir, generateTempFilePath } from "../tempDir.js";
import { isFileDeleted } from "../commitAttribution.js";
import { uploadFileFromPath } from "../../services/api/filesApi.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-sfy2wa1e.js:76594-77216 placement
/**
 * bundle 上传的默认上限与各类超时、长度常量，以及部分克隆的拒绝文案。
 */
var DEFAULT_BUNDLE_MAX_BYTES = 104857600;
var UPLOAD_URL_EXPIRES_SECONDS = 3600;
var DEFAULT_LISTED_FAILURES = 10;
var MAX_DISPLAYED_NAME_CHARS = 120;
var MAX_DETAIL_CHARS = 300;
var BUNDLE_STEP_TIMEOUT_MS = 180000;
var PARTIAL_CLONE_REFUSAL =
  "This partial clone does not hold every file of its working tree locally (a sparse checkout, or blobs never downloaded), so it cannot be uploaded without fetching from its remote, which the upload does not do \u2014 a full clone, made without --filter, would upload. If no file is missing from the working tree, the index names an object that this repository has lost: `git fsck --name-objects` prints it as \u201Cmissing blob <id> (:<path>)\u201D, and `git rm --cached <path>` then `git add <path>` stores it again";
var MAX_CHECKED_COMMITS = 32;
var PROBE_GIT_STEPS = ["rev-parse", "cat-file", "diff-files"];
//@ chunk-sfy2wa1e.js:77216-77278 placement
function bundleMaxBytes() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_bundle_max_bytes", null) ?? DEFAULT_BUNDLE_MAX_BYTES;
}
//@ chunk-sfy2wa1e.js:77278-77329 placement
var GIT_AUDIT_ENV; // deferred: uses GIT_ISOLATION_CONFIG_ARGS (../git/builderGit/gitEnv.js) of its import cycle while loading; runs once the cycle is complete
var MAX_REF_TIPS;
var MAX_REF_LIST_BYTES;
var MAX_REF_FILE_BYTES;
deferInit("chunk-sfy2wa1e.js:77278", () => {
  GIT_AUDIT_ENV = {
    ...GIT_LIST_ENV,
    ...C_LOCALE_ENV,
  };
  MAX_REF_TIPS = 64;
  MAX_REF_LIST_BYTES = 65536;
  MAX_REF_FILE_BYTES = (MAX_REF_TIPS + 1) * 65;
});
//@ chunk-sfy2wa1e.js:77329-77752 placement (2.1.88 match: readFileRange, 0.818)
async function readFileRange(path) {
  try {
    if (!(await lstat(path)).isFile()) return null;
    let handle = await open(path, readOnlyNoFollowFlags());
    try {
      let stats = await handle.stat();
      if (!stats.isFile() || stats.size > MAX_REF_FILE_BYTES) return null;
      let buffer = Buffer.allocUnsafe(stats.size);
      let { bytesRead } = await handle.read(buffer, 0, stats.size, 0);
      if (bytesRead !== stats.size) return null;
      let filtered = buffer
        .toString("utf8")
        .split(/\r?\n/)
        .filter((line) => line !== "");
      return filtered.length > MAX_REF_TIPS || filtered.some((tipSha) => !/^[0-9a-f]{40,64}$/.test(tipSha))
        ? null
        : filtered;
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}
//@ chunk-sfy2wa1e.js:77752-78254 placement
/**
 * 判断提交对象文本是否带 parent 行，以及浅克隆状态的说明文案。
 */
var commitHasParent = (stdout) =>
  firstLineOf(
    stdout,
    `

`,
  )
    .split(
      `
`,
    )
    .some((line) => line.startsWith("parent "));
var SHALLOW_STATE_MESSAGES = {
  complete: "HEAD's history is complete \u2014 bundling it as usual, without the widest tier",
  cut: "HEAD's history crosses the boundary \u2014 bundling a snapshot of the working tree, without history",
  unborn:
    "HEAD is unborn and no local branch or tag is cut \u2014 trying the widest tier (branches and tags), the only one that can carry it",
  unborn_cut: "HEAD is unborn and a local branch or tag is cut \u2014 nothing can be bundled",
};
//@ chunk-sfy2wa1e.js:78254-79280 placement
/**
 * 判断仓库是否浅克隆以及 HEAD 历史是否越过浅克隆边界：返回 not_shallow、complete、cut 或 unborn_cut，用于决定是否只打包工作树快照。
 */
async function detectShallowState(cwd, signal, hardening = null, probes = currentGitBinaryState()) {
  let probeArgs = ["rev-parse", "--is-shallow-repository", "--git-path", "shallow"];
  let hardening_2 = hardening
    ? await listGitRefs(cwd, probeArgs, {
        hardened: true,
        layout: hardening.layout,
        signal,
        probes,
      })
    : await runGitForAudit([...GIT_SAFE_GLOBAL_ARGS, ...GIT_READ_CONFIG_ARGS, ...probeArgs], {
        cwd,
        abortSignal: signal,
        ...buildAuditEnv(),
      });
  let [isShallow, shallowFilePath] = hardening_2.stdout.split(/\r?\n/);
  if (hardening_2.code !== 0 || isShallow !== "true") return "not_shallow";
  let runGit = (args) =>
    hardening
      ? listGitRefs(cwd, args, {
          hardened: true,
          layout: hardening.layout,
          signal,
          probes,
          env: GIT_AUDIT_ENV,
        })
      : runGitForAudit([...GIT_SAFE_GLOBAL_ARGS, ...GIT_READ_CONFIG_ARGS, ...args], {
          cwd,
          ...buildAuditEnv(GIT_AUDIT_ENV),
          abortSignal: signal,
          maxBuffer: MAX_REF_LIST_BYTES,
        });
  let isUnborn = (await runGit(["rev-parse", "--verify", "--quiet", "HEAD^{commit}"])).exitCode === 1;
  let cutKind = isUnborn ? "unborn_cut" : "cut";
  let fileRange = await readFileRange(resolve(cwd, shallowFilePath ?? join(".git", "shallow")));
  if (fileRange === null) return cutKind;
  for (let shallowSha of fileRange) {
    if (isUnborn) {
      let refList = await runGit([
        "for-each-ref",
        "--count=1",
        "--format=%(refname)",
        `--contains=${shallowSha}`,
        "refs/heads/",
        "refs/tags/",
      ]);
      if (refList.exitCode === 0 && refList.stdout.trim() === "") continue;
    } else {
      let ancestorResult = await runGit(["merge-base", "--is-ancestor", shallowSha, "HEAD"]);
      if (ancestorResult.exitCode === 1) continue;
      if (ancestorResult.exitCode !== 0) return cutKind;
    }
    let commitResult = await runGit(["cat-file", "commit", shallowSha]);
    if (commitResult.exitCode !== 0 || commitHasParent(commitResult.stdout)) return cutKind;
  }
  return isUnborn ? "unborn" : "complete";
}
//@ chunk-sfy2wa1e.js:79280-79310 placement
var PACK_MEASURE_TIMEOUT_MS = 5000;
var PACK_SIZE_GROWTH_BASELINE = 100;
var MAX_IN_PACK_OBJECTS = 5000000;
//@ chunk-sfy2wa1e.js:79310-80258 placement
/**
 * 测量仓库 pack 大小与对象数，决定是否需要压缩历史后再打包。
 */
async function measurePackSize(cwd, hardened, layout, signal, baselineBytes, probes) {
  let countObjects = await listGitRefs(cwd, ["count-objects", "-v"], {
    hardened,
    layout,
    signal,
    probes,
    ...(layout?.borrowedObjects !== undefined && {
      env: {
        GIT_OBJECT_DIRECTORY: layout.borrowedObjects,
      },
    }),
  });
  let { sizeBytes, inPackCount } = parseCountObjects(countObjects);
  if (
    sizeBytes === null ||
    baselineBytes === null ||
    sizeBytes <= baselineBytes ||
    sizeBytes > PACK_SIZE_GROWTH_BASELINE * baselineBytes ||
    (inPackCount !== null && inPackCount > MAX_IN_PACK_OBJECTS)
  )
    return {
      sizeBytes,
      inPackCount,
    };
  let configList = await listGitRefs(cwd, ["config", "-z", "--list"], {
    hardened,
    layout,
    signal,
    probes,
  });
  if (configList.code !== 0 || configListHasPartialClone(configList.stdout))
    return {
      sizeBytes,
      inPackCount,
    };
  let signal_2 =
    signal === undefined
      ? AbortSignal.timeout(PACK_MEASURE_TIMEOUT_MS)
      : AbortSignal.any([signal, AbortSignal.timeout(PACK_MEASURE_TIMEOUT_MS)]);
  let diskUsage = await listGitRefs(
    cwd,
    ["rev-list", "--disk-usage", "--objects", "--missing=allow-any", "--all"],
    {
      hardened,
      layout,
      signal: signal_2,
      probes,
      ...(!hardened && {
        env: {
          GIT_NO_LAZY_FETCH: "1",
        },
      }),
    },
  );
  let reachableBytes =
    diskUsage.code === 0 && /^\d+\s*$/.test(diskUsage.stdout) ? Number(diskUsage.stdout.trim()) : null;
  if (reachableBytes !== null && reachableBytes < sizeBytes)
    logForDebugging(
      `[gitBundle] packs hold ${sizeBytes} bytes but only ${reachableBytes} are reachable: sizing the tiers by the reachable figure`,
    );
  return {
    sizeBytes: reachableBytes !== null && reachableBytes < sizeBytes ? reachableBytes : sizeBytes,
    inPackCount,
  };
}
//@ chunk-sfy2wa1e.js:80258-80483 placement
function parseCountObjects({ code, stdout }) {
  if (code !== 0)
    return {
      sizeBytes: null,
      inPackCount: null,
    };
  let match = stdout.match(/^size-pack:\s*(\d+)/m);
  let match_2 = stdout.match(/^in-pack:\s*(\d+)/m);
  return {
    sizeBytes: match ? Number(match[1]) * 1024 : null,
    inPackCount: match_2 ? Number(match_2[1]) : null,
  };
}
//@ chunk-sfy2wa1e.js:80483-80935 placement
async function probeRepoBundleSize(options) {
  let cwd = options?.gitRoot ?? findGitRoot(getCwd());
  if (!cwd)
    return {
      tooLarge: false,
      sizeBytes: null,
      inPackCount: null,
    };
  let { sizeBytes, inPackCount } =
    options === undefined
      ? await measurePackSize(cwd, false, undefined, undefined, null, currentGitBinaryState())
      : parseCountObjects(
          await runInvocation(options.spawn([...GIT_SAFE_GLOBAL_ARGS, "count-objects", "-v"]), {
            abortSignal: options.signal,
            preserveOutputOnError: false,
            stdin: "ignore",
          }),
        );
  if (sizeBytes === null)
    return {
      tooLarge: false,
      sizeBytes: null,
      inPackCount,
    };
  let size = bundleMaxBytes();
  return {
    tooLarge:
      sizeBytes > 3 * size &&
      (sizeBytes > PACK_SIZE_GROWTH_BASELINE * size ||
        (inPackCount !== null && inPackCount > MAX_IN_PACK_OBJECTS)),
    sizeBytes,
    inPackCount,
  };
}
//@ chunk-sfy2wa1e.js:80935-87136 placement
/**
 * 生成 git bundle：选择 refs/heads、refs/tags、HEAD 与种子引用（stash、root），按需构造浅历史快照。
 */
async function _bundleWithFallback(cwd, outputBundlePath, bundleOptions) {
  let { hardened, layout, signal, probes } = bundleOptions;
  let seedRefs = [bundleOptions.seedRefs.stash, bundleOptions.seedRefs.root];
  let stashRefs = bundleOptions.hasStash ? [bundleOptions.seedRefs.stash] : [];
  let globArgs = [
    "--glob=refs/heads/*",
    "--glob=refs/tags/*",
    ...(bundleOptions.headResolves ? ["HEAD"] : []),
  ];
  let createBundle = async (refGlobs, revArgs) => {
    let branchTips =
      layout === undefined ? undefined : await listBranchAndTagTips(cwd, layout, seedRefs, signal, probes);
    if (branchTips === null)
      return {
        ok: false,
        ...gitDirTamperedResult(),
      };
    let createResult = await listGitRefs(
      cwd,
      [
        ...(hardened ? [] : GIT_READ_CONFIG_ARGS),
        "bundle",
        "create",
        outputBundlePath,
        ...revArgs,
        ...stashRefs,
        "--",
      ],
      {
        hardened,
        layout,
        signal,
        probes,
        ...(!hardened && {
          env: GIT_AUDIT_ENV,
        }),
      },
    );
    if (layout && !(await isGitLayoutUntampered(layout, seedRefs)))
      return {
        ok: false,
        ...gitDirTamperedResult(),
      };
    if (createResult.code !== 0) {
      if (!hardened && !signal?.aborted) {
        let configResult = await listGitRefs(cwd, ["config", "-z", "--list"], {
          hardened,
          layout,
          signal,
          probes,
        });
        if (configResult.code === 0 && configListHasPartialClone(configResult.stdout)) {
          logForDebugging(
            `[gitBundle] partial clone: git bundle create ${revArgs.join(" ")} failed (${createResult.code}), bundling a snapshot of the working tree instead: ${clipGitArgs(createResult.stderr, hardened)}`,
          );
          return {
            ...(await _bundleWithFallback(cwd, outputBundlePath, {
              ...bundleOptions,
              forceScope: "squashed",
              partialClone: true,
            })),
            promisorFallback: true,
          };
        }
      }
      return gitCommandFailure(
        `git bundle create ${hardened ? clipGitArgs(revArgs.join(" "), true) : revArgs.join(" ")}`,
        createResult,
        hardened,
      );
    }
    let { size: allSize } = await stat(outputBundlePath);
    if (allSize <= bundleOptions.maxBytes) {
      let headVerification = bundleOptions.hasStash
        ? await verifyBundleHeads(
            cwd,
            outputBundlePath,
            bundleOptions.relabelledPath,
            new Map([[bundleOptions.seedRefs.stash, REFS_SEED_STASH]]),
            {
              hardened,
              layout,
              signal,
              probes,
            },
          )
        : null;
      if (headVerification !== null && !headVerification.ok)
        return bundlePrepareFailure(headVerification.error);
      let bundlePath = headVerification === null ? outputBundlePath : bundleOptions.relabelledPath;
      let verified = hardened
        ? await verifyBundleRefs(
            cwd,
            bundlePath,
            [...revArgs, ...(bundleOptions.hasStash ? [REFS_SEED_STASH] : [])],
            {
              layout,
              signal,
              probes,
              expected:
                bundleOptions.stashCommit === undefined
                  ? {}
                  : {
                      [REFS_SEED_STASH]: bundleOptions.stashCommit,
                    },
              shown: branchTips,
            },
          )
        : bundleOptions.bindJudgedStash === true &&
            bundleOptions.hasStash &&
            bundleOptions.stashCommit !== undefined
          ? await verifySeedRefInBundle(cwd, bundlePath, REFS_SEED_STASH, bundleOptions.stashCommit, signal)
          : EMPTY_BUNDLE_VERDICT;
      if (layout && !(await isGitLayoutUntampered(layout, seedRefs)))
        return {
          ok: false,
          ...gitDirTamperedResult(),
        };
      return (
        bundleHeadsFailure(verified, hardened) ?? {
          ok: true,
          path: bundlePath,
          size: headVerification === null ? allSize : headVerification.sizeBytes,
          scope: refGlobs,
        }
      );
    }
    logForDebugging(
      `[gitBundle] ${refGlobs} bundle is ${(allSize / 1024 / 1024).toFixed(1)}MB (> ${(bundleOptions.maxBytes / 1024 / 1024).toFixed(0)}MB cap), trying the next tier`,
    );
    return null;
  };
  let { sizeBytes, inPackCount } = await measurePackSize(
    cwd,
    hardened,
    layout,
    signal,
    bundleOptions.forceScope === undefined ? bundleOptions.maxBytes : null,
    probes,
  );
  let forceSquashed = bundleOptions.forceScope === "squashed";
  let exceedsCap = sizeBytes !== null && sizeBytes > bundleOptions.maxBytes;
  let skipAllRefs = forceSquashed || bundleOptions.skipAllRefs || exceedsCap;
  let exceedsTripleCap = sizeBytes !== null && sizeBytes > 3 * bundleOptions.maxBytes;
  let skipHeadTier = forceSquashed || exceedsTripleCap;
  let tooLarge =
    exceedsTripleCap &&
    ((sizeBytes !== null && sizeBytes > PACK_SIZE_GROWTH_BASELINE * bundleOptions.maxBytes) ||
      (inPackCount !== null && inPackCount > MAX_IN_PACK_OBJECTS));
  if (forceSquashed)
    logForDebugging("[gitBundle] forceScope=squashed \u2014 skipping the all-branches and HEAD tiers");
  else if (exceedsCap)
    logForDebugging(
      bundleOptions.currentBranchOnly
        ? `[gitBundle] size-pack ${(sizeBytes / 1024 / 1024).toFixed(0)}MB vs ${(bundleOptions.maxBytes / 1024 / 1024).toFixed(0)}MB cap; ${skipHeadTier ? "skipping the branch tier" : "trying the branch tier"}${tooLarge ? ", skipping squashed" : ""}`
        : `[gitBundle] size-pack ${(sizeBytes / 1024 / 1024).toFixed(0)}MB > ${(bundleOptions.maxBytes / 1024 / 1024).toFixed(0)}MB cap; skipping all-branches${skipHeadTier ? " and HEAD" : ""}${tooLarge ? " and squashed" : ""}`,
    );
  if (bundleOptions.currentBranchOnly) {
    let headRef = await listGitRefs(
      cwd,
      ["rev-parse", "--verify", "--quiet", "--symbolic-full-name", "HEAD"],
      {
        hardened,
        layout,
        signal,
        probes,
      },
    );
    if (headRef.exitCode === 1)
      return {
        ok: false,
        error: "The current branch has no commits yet",
        failReason: "empty_repo",
      };
    if (headRef.code !== 0) return gitCommandFailure("git rev-parse HEAD", headRef, hardened);
    if (!skipHeadTier) {
      let trimmed = headRef.stdout.trim();
      let headTierFailure =
        trimmed === "HEAD"
          ? await createBundle("head", ["HEAD"])
          : await createBundle("current_branch", [trimmed, "HEAD"]);
      if (headTierFailure !== null) return headTierFailure;
    }
  } else {
    if (!skipAllRefs) {
      let allRefsBundle = await createBundle("all", globArgs);
      if (allRefsBundle !== null) return allRefsBundle;
    }
    if (!skipHeadTier) {
      let headBundle = await createBundle("head", ["HEAD"]);
      if (headBundle !== null) return headBundle;
    }
  }
  if (tooLarge)
    return {
      ok: false,
      error: `This repository is too large to upload: its git history is ${formatSizeOrUnknown(sizeBytes)}, and an upload can be at most ${formatSizeOrUnknown(bundleOptions.maxBytes)}`,
      failReason: "too_large",
      sizeBytes: sizeBytes ?? undefined,
    };
  let headTreeSnapshot =
    hardened && !bundleOptions.hasStash
      ? await snapshotHeadTree(cwd, layout, seedRefs, signal, probes)
      : undefined;
  if (headTreeSnapshot === null)
    return {
      ok: false,
      ...gitDirTamperedResult(),
    };
  if (hardened && !bundleOptions.hasStash && headTreeSnapshot === undefined)
    return {
      ok: false,
      error: "git rev-parse HEAD^{tree} failed: HEAD names no commit",
      failReason: "git_error",
    };
  let noLazyFetchEnv = {
    ...GIT_AUDIT_ENV,
    GIT_NO_LAZY_FETCH: "1",
  };
  let env = {
    ...(hardened ? {} : noLazyFetchEnv),
    ...STASH_IDENTITY_ENV,
  };
  let treeRef = bundleOptions.hasStash
    ? `${bundleOptions.stashCommit ?? bundleOptions.seedRefs.stash}^{tree}`
    : (headTreeSnapshot ?? "HEAD^{tree}");
  let parentArgs = [];
  if (bundleOptions.baseRef) {
    let [treeResult, baseTreeResult] = await Promise.all(
      [treeRef, `${bundleOptions.baseRef}^{tree}`].map((rev) =>
        listGitRefs(cwd, [...(hardened ? [] : GIT_REPLACE_REFS_CONFIG_ARGS), "rev-parse", rev], {
          hardened,
          layout,
          signal,
          probes,
          ...(!hardened && {
            env: noLazyFetchEnv,
          }),
        }),
      ),
    );
    if (treeResult?.code === 0 && treeResult.stdout.trim() === baseTreeResult?.stdout.trim())
      return {
        ok: false,
        error:
          bundleOptions.leftOutCount > 0
            ? `It doesn't look like you have any new commits or changes to review: the only uncommitted changes here are to ${bundleOptions.leftOutCount} ${plural(bundleOptions.leftOutCount, "file")} that ${plural(bundleOptions.leftOutCount, "stays", "stay")} on this machine (named like credentials or keys, ${bundleOptions.withheldByRules ? "covered by a Read rule or a sandbox read-deny setting of yours, linked from your Claude Code configuration, " : ""}hard-linked to another file, kept by a git filter such as LFS, or still being written while read) and ${plural(bundleOptions.leftOutCount, "is", "are")} not uploaded. Stage or commit any other work first.`
            : "It doesn't look like you have any new commits or changes to review. Stage or commit them first?",
        failReason: "no_changes",
      };
    let commitTree = await listGitRefs(
      cwd,
      [
        ...(hardened ? [] : GIT_REPLACE_REFS_CONFIG_ARGS),
        "commit-tree",
        `${bundleOptions.baseRef}^{tree}`,
        "-m",
        "seed-base",
      ],
      {
        hardened,
        layout,
        signal,
        probes,
        env,
      },
    );
    if (commitTree.code === 0) parentArgs = ["-p", commitTree.stdout.trim()];
    else
      logForDebugging(
        `[gitBundle] baseRef commit-tree failed (${commitTree.code}), squashing without parent: ${clipGitArgs(commitTree.stderr, hardened)}`,
      );
  }
  let commitTreeResult = await listGitRefs(
    cwd,
    [...(hardened ? [] : GIT_REPLACE_REFS_CONFIG_ARGS), "commit-tree", treeRef, ...parentArgs, "-m", "seed"],
    {
      hardened,
      layout,
      signal,
      probes,
      env,
    },
  );
  if (commitTreeResult.code !== 0) return gitCommandFailure("git commit-tree", commitTreeResult, hardened);
  let squashedSha = commitTreeResult.stdout.trim();
  if (layout && !(await isGitLayoutUntampered(layout, seedRefs)))
    return {
      ok: false,
      ...gitDirTamperedResult(),
    };
  let squashResult = await updateRefCommand(cwd, [bundleOptions.seedRefs.root, squashedSha], {
    hardened,
    layout,
    probes,
    ...(hardened && {
      signal,
    }),
  });
  if (hardened && signal?.aborted)
    return {
      ok: false,
      error: "Bundle upload aborted",
      failReason: "git_error",
    };
  if (squashResult.code !== 0)
    return {
      ok: false,
      ...seedRefWriteFailure(squashResult.stderr, layout?.adminDir),
      heldSeedRef: {
        exitCode: squashResult.code,
      },
    };
  let squashBundleResult = await listGitRefs(
    cwd,
    [
      ...(hardened ? [] : GIT_READ_CONFIG_ARGS),
      "bundle",
      "create",
      outputBundlePath,
      bundleOptions.seedRefs.root,
      "--",
    ],
    {
      hardened,
      layout,
      signal,
      probes,
      ...(!hardened && {
        env: noLazyFetchEnv,
      }),
    },
  );
  if (layout && !(await isGitLayoutUntampered(layout, seedRefs)))
    return {
      ok: false,
      ...gitDirTamperedResult(),
    };
  if (squashBundleResult.code !== 0)
    return {
      ok: false,
      ...(bundleOptions.partialClone
        ? {
            error: PARTIAL_CLONE_REFUSAL,
            failReason: "git_error",
          }
        : gitCommandFailure("git bundle create for the squashed root", squashBundleResult, hardened)),
    };
  let { size: squashSize } = await stat(outputBundlePath);
  if (squashSize <= bundleOptions.maxBytes) {
    let headsVerdict = await verifyBundleHeads(
      cwd,
      outputBundlePath,
      bundleOptions.relabelledPath,
      new Map([[bundleOptions.seedRefs.root, REFS_SEED_ROOT]]),
      {
        hardened,
        layout,
        signal,
        probes,
      },
    );
    if (!headsVerdict.ok) return bundlePrepareFailure(headsVerdict.error);
    let squashVerdict = hardened
      ? await verifyBundleRefs(cwd, bundleOptions.relabelledPath, [REFS_SEED_ROOT], {
          layout,
          signal,
          probes,
          expected: {
            [REFS_SEED_ROOT]: squashedSha,
          },
          shown: new Map(),
        })
      : bundleOptions.bindJudgedStash === true
        ? await verifySeedRefInBundle(cwd, bundleOptions.relabelledPath, REFS_SEED_ROOT, squashedSha, signal)
        : EMPTY_BUNDLE_VERDICT;
    if (layout && !(await isGitLayoutUntampered(layout, seedRefs)))
      return {
        ok: false,
        ...gitDirTamperedResult(),
      };
    return (
      bundleHeadsFailure(squashVerdict, hardened) ?? {
        ok: true,
        path: bundleOptions.relabelledPath,
        size: headsVerdict.sizeBytes,
        scope: "squashed",
        rootCommit: squashedSha,
      }
    );
  }
  return {
    ok: false,
    error: `This repository is too large to upload: even without its history it is ${formatSizeOrUnknown(squashSize)}, and an upload can be at most ${formatSizeOrUnknown(bundleOptions.maxBytes)}`,
    failReason: "too_large",
    sizeBytes: squashSize,
  };
}
//@ chunk-sfy2wa1e.js:87136-87363 placement
async function verifyBundleHeads(sessionId, path, labels, copyOptions, runOptions) {
  let copyResult = await copyVerifiedBundle(path, labels, copyOptions, runOptions.signal);
  if (!copyResult.ok) return copyResult;
  let listHeads = await listGitRefs(sessionId, ["bundle", "list-heads", labels], runOptions);
  return listHeads.code === 0
    ? copyResult
    : {
        ok: false,
        error: `git bundle list-heads exited ${listHeads.code}: ${clipGitArgs(listHeads.stderr, runOptions.hardened)}`,
      };
}
//@ chunk-sfy2wa1e.js:87363-87636 placement
function bundlePrepareFailure(error) {
  return {
    ok: false,
    error: `Could not prepare the upload of this working tree (${error}). Retry; if it keeps failing, check that the temporary directory has room for a second copy of the bundle and that nothing else is writing to this checkout.`,
    failReason: "git_error",
  };
}
//@ chunk-sfy2wa1e.js:87636-87695 placement
function isGitFileLayout(layout) {
  return layout.detail === "git_file" && layout.gitDir === "";
}
//@ chunk-sfy2wa1e.js:87695-87782 placement
function isUnuploadableLayout(layout) {
  return (
    layout.misplaced === "linked_worktree" ||
    MISPLACED_REASONS[layout.misplaced] !== undefined ||
    isGitFileLayout(layout)
  );
}
//@ chunk-sfy2wa1e.js:87782-90934 placement
/**
 * 决定在打包被拒时能否回退到旧上传方式：检查 .git 条目、家目录或上层检出能否被云会话写入，返回是否交还及拒绝原因文案。
 */
async function decideLegacyHandBack(cwd, layout, priorRefusal, reasonOverride) {
  let refuse = (notThePreviousWay, refusedAs = layout) => ({
    handedBack: false,
    refusedAs,
    notThePreviousWay,
  });
  if (priorRefusal !== null) return refuse(priorRefusal);
  let judgeRepository = (repository) => {
    let checkoutAboveHome = repository === null ? null : enclosingCheckoutAboveHome(repository);
    let reasonText =
      reasonOverride ??
      (repository === null || checkoutAboveHome === null
        ? null
        : `${homeInsideCheckoutPhrase(checkoutAboveHome, repository)} and this checkout\u2019s git directory (${displayName(repository)}) is inside it, so a Claude Code session started there can write that directory\u2019s configuration${layout.misplaced === "git_file" ? " \u2014 start from an ordinary clone instead" : ""}`);
    return reasonText === null
      ? {
          handedBack: true,
        }
      : {
          ...refuse(reasonText),
          belowHomeCheckout: true,
        };
  };
  if (isGitFileLayout(layout)) {
    let entryKind = await classifyDotGitEntry(cwd);
    return refuse(
      entryKind === "link"
        ? "its .git entry is a symbolic link, which this checkout\u2019s own session can re-point and nothing pins in place, so where it leads when that capture runs cannot be bound to this tree \u2014 start from an ordinary clone instead"
        : entryKind === "second_name"
          ? "its .git pointer file has a second name (a hard link), so what it names cannot be trusted between this read and git\u2019s \u2014 remove the other name, or start from an ordinary clone"
          : "its .git entry is a pointer file this upload could not follow (not the one gitdir line git writes), so where it leads cannot be judged \u2014 start from an ordinary clone instead",
    );
  }
  if (layout.gitDir !== "" && (layout.misplaced === "linked_worktree" || layout.detail === "git_file")) {
    if ((await checkSessionTempRoot(cwd)).some((tempRoot) => isPathInside(tempRoot, layout.gitDir)))
      return refuse(
        layout.misplaced === "linked_worktree"
          ? `its .git file names a worktree entry under a temporary directory (${displayName(layout.gitDir)}), where sessions write \u2014 run git worktree repair if this tree was moved, or start from the repository\u2019s main checkout`
          : `its .git file names a git directory under a temporary directory (${displayName(layout.gitDir)}), where sessions write \u2014 start from an ordinary clone of the repository`,
      );
  }
  if (layout.detail === "git_file" && layout.gitDir !== "") {
    let enclosingRepo = findEnclosingRepos(layout.gitDir)[0];
    if (enclosingRepo !== undefined)
      return refuse(
        `its git directory (${displayName(layout.gitDir)}) lies inside another checkout (${displayName(enclosingRepo)}), whose Claude Code sessions can write its configuration \u2014 start from an ordinary clone instead`,
      );
  }
  if (isUnuploadableLayout(layout))
    return refuse(
      MISPLACED_REASONS[layout.misplaced] ?? WORKTREE_DETAIL_REASONS[layout.detail ?? "admin_dir"],
    );
  let located =
    layout.gitDir === ""
      ? null
      : layout.misplaced === "old_git"
        ? isLinkedWorktreeGitDir(layout.gitDir)
          ? {
              entry: layout.gitDir,
              repository: dirname(dirname(layout.gitDir)),
            }
          : {
              entry: null,
              repository: layout.gitDir,
            }
        : layout.misplaced === "git_file"
          ? {
              entry: null,
              repository: layout.gitDir,
            }
          : null;
  if (located === null) return judgeRepository(null);
  let { entry, repository } = located;
  let unsupportedLayout =
    (entry === null ? null : await detectUnsupportedLayout(entry)) ??
    (await detectUnsupportedLayout(repository));
  if (unsupportedLayout !== null)
    return refuse(STATE_REASONS[unsupportedLayout], {
      ...layout,
      misplaced: unsupportedLayout,
      commonDir: repository,
    });
  if (entry === null && (await hasCommondirFile(repository)))
    return refuse(
      "its git directory holds a commondir file, which git writes only in a linked working tree\u2019s entry and which would send that capture to another repository\u2019s configuration \u2014 start from an ordinary clone",
      {
        ...layout,
        detail: "common_dir",
      },
    );
  if (entry !== null && (await probeWorktreeConfigFile(entry)) !== "absent")
    return refuse(WORKTREE_DETAIL_REASONS.worktree_config, {
      ...layout,
      misplaced: "linked_worktree",
      detail: "worktree_config",
    });
  let homeVerdict = judgeRepository(repository);
  if (!homeVerdict.handedBack) return homeVerdict;
  let finding = await readInTreeGitConfig(repository, cwd, entry !== null);
  if (finding.kind === "clear")
    return {
      handedBack: true,
    };
  return {
    ...refuse(
      describeConfigFinding(
        finding,
        layout.misplaced === "old_git" ? "update git (2.31 or newer), or " : "",
        layout.misplaced !== "old_git",
      ),
      finding.kind === "work_tree"
        ? {
            ...layout,
            misplaced: "work_tree",
          }
        : finding.kind === "worktree_config"
          ? {
              ...layout,
              misplaced: "linked_worktree",
              detail: "worktree_config",
            }
          : layout,
    ),
    screened: finding.kind,
  };
}
//@ chunk-sfy2wa1e.js:90934-94026 placement
/**
 * 工作树布局问题的原因说明文本。
 */
var WORKTREE_DETAIL_REASONS = {
  worktree_config:
    "its administrative entry carries a per-worktree configuration file, one a Claude Code session of this repository could have written there \u2014 delete that file only if nothing in it matters (`git rev-parse --git-path config.worktree` names it; git sparse-checkout writes one, and a sparse tree needs it to stay sparse), or start from the repository\u2019s main checkout",
  common_dir:
    "the commondir file in its administrative directory, which does not read as git writes it, would decide which repository that way takes its configuration from",
  keyed_elsewhere:
    "its .git file leads git to another repository than the one under which Claude Code keeps this folder\u2019s trust and settings, and that way would run under the other\u2019s configuration \u2014 start from the repository\u2019s main checkout",
  placement:
    "its repository is placed or named as git does not place one this upload takes a repository from (not <name>.git or .git, inside the working tree, or under another git directory) \u2014 rename a bare repository\u2019s directory to <name>.git and run git worktree repair from it, or start from an ordinary clone",
  back_link:
    "its administrative entry does not point back at this tree (a moved tree, or a back link something rewrote) \u2014 run git worktree repair, or start from the repository\u2019s main checkout",
  admin_dir:
    "its .git file names a worktree entry that does not exist or is not one git made, so where it would lead that capture cannot be judged \u2014 run git worktree repair if this tree was moved, or start from the repository\u2019s main checkout",
  foreign_mount:
    "something is mounted over its administrative entry in the repository (.git/worktrees/<name>), so what stands there is not the repository\u2019s own \u2014 unmount it, or start from the repository\u2019s main checkout",
  git_file:
    "its .git entry is a pointer file this upload could not follow, so where it leads cannot be judged \u2014 start from an ordinary clone instead",
};
var STATE_REASONS = {
  reftable:
    "this repository keeps (or appears to keep) its refs in reftable storage \u2014 a state a Claude Code session can bring about without the user, under which that capture would run git; start from an ordinary clone of the repository",
  borrowed_objects:
    "this repository borrows objects from another through an alternates file \u2014 a state a Claude Code session can bring about without the user, under which that capture would run git; start from an ordinary clone of the repository",
};
var CORE_WORKTREE_REASON =
  "its git configuration points the work tree somewhere else (core.worktree), so that capture would read the directory it names rather than this one; remove core.worktree or start from an ordinary clone";
var MISPLACED_REASONS = {
  ...STATE_REASONS,
  included_config:
    "a cloud session could change a file that git reads this checkout\u2019s configuration from, so that capture would run under whatever is put there",
  many_includes:
    "its git configuration pulls in more include files than are followed, so that capture would run every program those files name and enter any nested repository registered here; trim the include chain",
  work_tree: CORE_WORKTREE_REASON,
};
//@ chunk-sfy2wa1e.js:94026-98137 placement
/**
 * 把 git 配置检查发现的问题（include 文件、core.worktree、worktreeConfig、硬链接、无法解析、家目录检出）翻译成拒绝原因。
 */
function describeConfigFinding(finding, advicePrefix, ordinaryCloneAdvice) {
  if (finding.file === LAUNCH_ENV_CONFIG_NOTE)
    switch (finding.kind) {
      case "includes":
        return `its launch environment\u2019s git configuration (GIT_CONFIG_PARAMETERS / GIT_CONFIG_COUNT) includes a file inside this working tree, its repository or a directory your settings open to Claude Code sessions \u2014 configuration this upload could not have git list here, where a file a session may write could say what that capture runs; ${advicePrefix}drop that include from the environment, or start from an ordinary clone`;
      case "work_tree":
        return CORE_WORKTREE_REASON;
      case "worktree_config":
        return `its launch environment\u2019s git configuration switches per-worktree configuration on (extensions.worktreeConfig), under which that capture would also read a configuration file a session of the repository can plant in this tree\u2019s administrative entry; ${advicePrefix}start from the repository\u2019s main checkout`;
      case "second_name":
        return `its launch environment\u2019s git configuration (GIT_CONFIG_PARAMETERS / GIT_CONFIG_COUNT) includes a file that has a second name \u2014 a hard link \u2014 so a session that can reach the other name could change what that capture runs under; ${advicePrefix}give that file a single name again (copy it aside and move the copy back over it), drop that include from the environment, or start from an ordinary clone`;
      case "unread":
        return "the git configuration its launch environment carries (GIT_CONFIG_PARAMETERS / GIT_CONFIG_COUNT) does not parse as git would parse it, or includes a file that cannot be read or followed here, so what that capture would run under cannot be judged; check those variables, or start from an ordinary clone";
      case "home_checkout":
        return homeCheckoutReason(finding, advicePrefix, ordinaryCloneAdvice);
      case "settings_unreadable":
        return unreadableSettingsReason(finding.file, advicePrefix);
      case "config_in_checkout":
        return `its launch environment\u2019s git configuration (GIT_CONFIG_PARAMETERS / GIT_CONFIG_COUNT) includes a file that lies inside \u2014 or links into \u2014 a git checkout (${displayName(finding.checkout)}), which a Claude Code session started there can write; ${advicePrefix}drop that include from the environment, keep the file outside any checkout, or start from an ordinary clone`;
    }
  let configFile = displayName(finding.file);
  switch (finding.kind) {
    case "includes":
      return `its git configuration (${configFile}) pulls in include files, lies inside this working tree, its repository or a directory your settings open to Claude Code sessions, or includes a file there \u2014 configuration this upload could not have git list here, where a file a session may write could say what that capture runs; ${advicePrefix}move what the includes hold into the configuration file itself, stop granting sessions the directory that holds it (permissions.additionalDirectories, sandbox.filesystem.allowWrite, an Edit rule or --add-dir), or start from an ordinary clone`;
    case "second_name":
      return `its git configuration file ${configFile} (or a file it includes) has a second name \u2014 a hard link \u2014 so a session that can reach the other name could change what that capture runs under; ${advicePrefix}give the file a single name again (copy it aside and move the copy back over it), or start from an ordinary clone`;
    case "work_tree":
      return CORE_WORKTREE_REASON;
    case "worktree_config":
      return `its git configuration (${configFile}) switches per-worktree configuration on (extensions.worktreeConfig), under which that capture would also read a configuration file a session of the repository can plant in this tree\u2019s administrative entry; ${advicePrefix}start from the repository\u2019s main checkout`;
    case "unread":
      return `its git configuration file ${configFile} could not be read as a plain file git would parse, or is reached through a link that cannot be followed here, so what that capture would run under cannot be judged; ${advicePrefix}check that file, or start from an ordinary clone`;
    case "settings_unreadable":
      return unreadableSettingsReason(finding.file, advicePrefix);
    case "home_checkout":
      return homeCheckoutReason(finding, advicePrefix, ordinaryCloneAdvice);
    case "config_in_checkout":
      return `the user-level git configuration file ${configFile}, or a file it includes, lies inside \u2014 or links into \u2014 a git checkout (${displayName(finding.checkout)}), so a Claude Code session started there can write what that capture would run under, whether or not the file exists yet; ${advicePrefix}${ordinaryCloneAdvice ? "start from an ordinary clone, or " : ""}keep user-level git configuration outside any checkout`;
  }
}
//@ chunk-sfy2wa1e.js:98137-98501 placement
/**
 * 生成工作树内设置文件无法读取时的拒绝原因。
 */
function unreadableSettingsReason(file, advicePrefix) {
  return `a Claude Code settings file inside this working tree (${displayName(join(file, "settings.json"))} or settings.local.json) stands but cannot be read, so which directories it opens to sessions \u2014 and so whether a session could write the configuration that capture would run under \u2014 cannot be told; ${advicePrefix}fix or remove that settings file, then retry`;
}
//@ chunk-sfy2wa1e.js:98501-99311 placement
/**
 * 生成家目录本身或其上层是 git 检出时的拒绝原因。
 */
function homeCheckoutReason({ file, checkout }, advicePrefix, ordinaryCloneAdvice) {
  let cloneAdvice = ordinaryCloneAdvice ? "start from an ordinary clone, or " : "";
  switch (classifyHomePosition(checkout, dirname(file))) {
    case "home":
      return `your home directory is itself a git checkout, so a Claude Code session started there can write the user-level git configuration that capture would run under (${displayName(file)}, whether or not that file exists yet); ${advicePrefix}${cloneAdvice}keep the dotfiles repository\u2019s git directory outside your home (a bare repository used with --git-dir)`;
    case "above_home":
    case "elsewhere":
      return `your home directory lies inside a git checkout (${displayName(checkout)}), so a Claude Code session started there can write the user-level git configuration that capture would run under (${displayName(file)}, whether or not that file exists yet); ${advicePrefix}${cloneAdvice}move your home directory out of that checkout, or remove the stray git entry that makes it one`;
  }
}
//@ chunk-sfy2wa1e.js:99311-99474 placement
function describeHomeCheckout(home) {
  let ancestor = nearestRepoAncestor(home);
  return ancestor === null
    ? ""
    : classifyHomePosition(ancestor, home) === "home"
      ? ` (yours is itself a git checkout: ${displayName(ancestor)})`
      : ` (yours lies inside the git checkout at ${displayName(ancestor)})`;
}
//@ chunk-sfy2wa1e.js:99474-99634 placement
function homeInsideCheckoutPhrase(home, checkout) {
  return classifyHomePosition(home, checkout) === "home"
    ? `your home directory (${displayName(home)}) is itself a git checkout`
    : `your home directory lies inside a git checkout (${displayName(home)})`;
}
//@ chunk-sfy2wa1e.js:99634-99659 placement
var displayName = (value) => truncateWithCount(replaceControlChars(value), MAX_DISPLAYED_NAME_CHARS);
//@ chunk-sfy2wa1e.js:99659-99876 placement
function nestedCheckoutReason(checkout) {
  return `this checkout sits inside another checkout (${displayName(checkout)}), whose Claude Code sessions can write this one\u2019s git files \u2014 start from a checkout of this repository that stands inside no other`;
}
//@ chunk-sfy2wa1e.js:99876-100084 placement
function homeContainsRepoReason(home) {
  let enclosing = enclosingCheckoutAboveHome(home);
  return enclosing === null
    ? null
    : `${homeInsideCheckoutPhrase(enclosing, home)} and this working tree\u2019s repository (${displayName(home)}) is inside it, so a Claude Code session started there can write the repository\u2019s git files`;
}
//@ chunk-sfy2wa1e.js:100084-100321 placement
function nestedRepoReason(checkout) {
  return `this working tree\u2019s repository sits inside another checkout (${displayName(checkout)}), whose Claude Code sessions can write its git files \u2014 start from a working tree of a repository that stands inside no other checkout`;
}
//@ chunk-sfy2wa1e.js:100321-100782 placement
/**
 * 检查 .git 指向的目录里是否被放置了对象库（common_dir 等），返回问题类型。
 */
async function findPlantedObjectStore(dir) {
  let gitDir = join(dir, ".git");
  let stats;
  try {
    stats = await lstat(gitDir);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? null : "unreadable";
  }
  let gitDirs;
  if (stats.isDirectory()) gitDirs = [gitDir];
  else {
    if (!stats.isFile()) return "unreadable";
    let gitdirPointer = readGitdirPointer(
      await readTextFileQuiet(gitDir, {
        oneName: true,
      }).catch(() => {
        return;
      }),
    );
    if (gitdirPointer === undefined || pathIsForeignOrUnsafePointer(gitdirPointer, dir)) return "unreadable";
    let resolvedGitDir = isAbsolute(gitdirPointer) ? gitdirPointer : resolve(dir, gitdirPointer);
    gitDirs = isLinkedWorktreeGitDir(resolvedGitDir)
      ? [resolvedGitDir, dirname(dirname(resolvedGitDir))]
      : [resolvedGitDir];
  }
  for (let gitDir of gitDirs) {
    let unsupportedLayout = await detectUnsupportedLayout(gitDir);
    if (unsupportedLayout !== null) return unsupportedLayout;
    if (!isLinkedWorktreeGitDir(gitDir) && (await hasCommondirFile(gitDir))) return "common_dir";
  }
  return null;
}
//@ chunk-sfy2wa1e.js:100782-100900 placement
async function hasCommondirFile(dir) {
  return lstat(join(dir, "commondir")).then(
    () => true,
    (error) => {
      let errnoCode = getErrnoCode(error);
      return !(errnoCode === "ENOENT" || errnoCode === "ENOTDIR");
    },
  );
}
//@ chunk-sfy2wa1e.js:100900-100970 placement
function isLinkedWorktreeGitDir(gitDir) {
  return gitDir !== "" && basename(gitDir) !== ".git" && basename(dirname(gitDir)) === "worktrees";
}
//@ chunk-sfy2wa1e.js:100970-103855 placement
/**
 * 索引、shallow 等 git 目录文件异常时给用户的处理建议文本。
 */
var RETRY_ELSEWHERE_ADVICE = `${FRESH_CLONE_HINT} retry there. ${KEEP_FOLDER_HINT}`;
var DO_NOT_RUN_GIT_USE_ADVICE = `${DO_NOT_RUN_GIT_ADVICE} Use ${RETRY_ELSEWHERE_ADVICE}`;
var GIT_RESET_ADVICE =
  "`git reset` then rebuilds the index from HEAD (what was staged becomes unstaged; your files are untouched)";
var INSPECT_INDEX_ADVICE = `look at the file named index in this checkout\u2019s git directory (in an ordinary checkout: ls -l .git/index; a link shows an arrow, ->). If it is a link, do not run git in this folder, since git would write through it to whatever it points at: use ${RETRY_ELSEWHERE_ADVICE} If it is not a link,`;
var GIT_DIR_FILE_ADVICE = {
  index_link: ` Git never makes it a link: if you did not, something else did, and git would write through it. ${DO_NOT_RUN_GIT_USE_ADVICE}`,
  index_second_name: ` Git never gives it a second name, and through that name something else can change the file under git. Look at it (ls -l). Remove the other name if you can find it (\`find . -samefile\` with the file named above, run in this directory), or remove that file itself: ${GIT_RESET_ADVICE}. Then retry.`,
  index_too_large: " This upload has no way round that limit.",
  index_other: ` Look at it first (ls -l) and remove it if it is not an index git wrote; ${GIT_RESET_ADVICE}. Then retry.`,
  shallow_link: ` Git never makes it a link: if you did not, something else did. ${DO_NOT_RUN_GIT_USE_ADVICE}`,
  shallow_second_name:
    " Git never gives it a second name. Look at it (ls -l) and remove the other name if you can find it (`find . -samefile` with the file named above, run in this directory); or copy the file named above to a new name and move the copy over it. Then retry.",
  shallow_other:
    " Look at it (ls -l): git keeps the list of this clone\u2019s shallow commits there, as a small plain file \u2014 if this clone was not made with --depth, nothing should stand there and it can be removed. Then retry.",
  shared_index: ` Look at the split-index files (sharedindex.*) first (ls -l; a link shows an arrow, ->). If one is a link, git did not make it so, and git reads the index through it: do not run git in this folder, and use ${RETRY_ELSEWHERE_ADVICE} If none is a link, do not delete any of these files by hand: the index may need one of them, and which one can change whenever git writes the index. Use a fresh clone in this case too, by the same steps.`,
  shared_index_too_large: ` Do not delete that split-index file by hand: the index may need it. If this project has so many files that a fresh clone\u2019s index would be over that limit too, this upload has no way round it. If not, use ${RETRY_ELSEWHERE_ADVICE}`,
  head: ` First ${INSPECT_INDEX_ADVICE} check out a branch or a commit (\`git switch\`), and retry.`,
  symbolic_head: ` First ${INSPECT_INDEX_ADVICE} check out a branch by its own name (\`git switch\`; if it is the one that \`git status\` already shows, git answers \u201CAlready on\u201D, and your uncommitted work stays), and retry.`,
  refs: " `git for-each-ref` shows what git makes of them: rename or repair that branch or tag, then retry.",
  config: ` First ${INSPECT_INDEX_ADVICE} check \`git status\` here, and retry.`,
  other: ` Retry; if it keeps happening, first ${INSPECT_INDEX_ADVICE} \`git status\` here shows whether git itself still reads this checkout.`,
};
//@ chunk-sfy2wa1e.js:103855-105897 placement
/**
 * 生成因 core.attributesFile 等属性设置被拒绝上传时的说明与处理建议。
 */
function gitAttributesSettingRefusal({ kind, setting, where = "", relative }) {
  let whereText = replaceControlChars(where);
  let settingsSourceText = "Claude Code\u2019s environment (set by your shell or your Claude Code settings)";
  let moveAdvice = `Move the attribute rules it points to into a .gitattributes file committed with the project first, then remove the setting from ${whereText} and retry.`;
  let removeAdvice = `Remove ${setting} from your shell or your Claude Code settings, then start Claude Code again.`;
  let [problemText, fixText] = {
    attributes_file: relative
      ? [
          `${setting} in ${whereText} is not a full path, which the git this upload runs may read as a different file than yours does`,
          "Set it to a full path (on Windows, one that starts with a drive letter) or a ~/ path, then retry.",
        ]
      : [
          `${setting} is set in ${whereText}`,
          `Move the attribute rules it points to into a .gitattributes file committed with the project, or set core.attributesFile directly in your user or system git config file to an absolute or ~/ path; then remove the setting from ${whereText} and retry.`,
        ],
    attr_tree: [`${setting} is set in ${whereText}`, moveAdvice],
    ignore_case: [
      `${setting} (which decides whether .gitattributes patterns match file names regardless of letter case) is set in ${whereText}`,
      "Move the core.ignoreCase line into this repository\u2019s .git/config or directly into your ~/.gitconfig, then retry.",
    ],
    config_location: [
      `${setting} is a relative path in ${"Claude Code\u2019s environment (set by your shell or your Claude Code settings)"}, which git resolves from whatever directory it runs in`,
      `Set ${setting === "HOMEPATH" || setting === "USERPROFILE" ? "HOME" : setting} to a full path (on Windows, one that starts with a drive letter), then start Claude Code again.`,
    ],
    env_config: [
      `${setting} in ${"Claude Code\u2019s environment (set by your shell or your Claude Code settings)"} carries an include, core.attributesFile, attr.tree or core.ignoreCase, or does not parse`,
      removeAdvice,
    ],
    attr_source_env: [
      `${setting} is set in ${"Claude Code\u2019s environment (set by your shell or your Claude Code settings)"}`,
      removeAdvice,
    ],
  }[kind];
  return `Not uploading this working tree: ${problemText}, and the upload cannot follow that setting, so a file git would change before storing it (to encrypt it, for example) could be uploaded as it is on disk. ${fixText}`;
}
//@ chunk-sfy2wa1e.js:105897-105971 placement
function notPreviousWayNote(note) {
  return ` It is not uploaded the previous way either: ${note}.`;
}
//@ chunk-sfy2wa1e.js:105971-106173 placement
function misplacedKindForLog(misplaced) {
  switch (misplaced) {
    case "git_file":
    case "linked_worktree":
    case "work_tree":
    case "included_config":
    case "many_includes":
    case "old_git":
    case "borrowed_objects":
    case "reftable":
      return misplaced;
    default:
      return null;
  }
}
//@ chunk-sfy2wa1e.js:106173-106564 placement
/**
 * 查找会改写受保护环境变量的设置项，返回名称或无法读取。
 */
function findProtectedEnvSetting(location, names) {
  let protectedVars = PROTECTED_ENV_VARS_2;
  try {
    let files = protectedSettingsFiles(location, names);
    if (files === null)
      return {
        kind: "unreadable",
      };
    let found = [
      ...files,
      ...protectedSettingSourcesWithFlag().flatMap((found) =>
        Object.keys(getSettingsForSourceTightenOnly(found)?.env ?? {}),
      ),
    ].find((envName) => protectedVars.includes(envName.toUpperCase()));
    if (found !== undefined)
      return {
        kind: "names",
        name: found,
      };
    let envChangedBySettings = findEnvChangedBySettings(protectedVars);
    return envChangedBySettings === undefined
      ? null
      : {
          kind: "moved",
          name: envChangedBySettings,
        };
  } catch (error) {
    logForDebugging(`[gitBundle] could not read the repository's settings: ${errorMessage(error)}`);
    return {
      kind: "unreadable",
    };
  }
}
//@ chunk-sfy2wa1e.js:106564-106834 placement
function repositorySetBundleSwitches() {
  try {
    let flattened = ["projectSettings", "localSettings"].flatMap((source) =>
      Object.keys(getSettingsForSource(source)?.env ?? {}).filter((key) => {
        let upper = key.toUpperCase();
        return BUNDLE_ENV_SWITCHES.includes(upper) && PROJECT_SCOPE_BLOCKED_ENV_VARS.has(upper);
      }),
    );
    return flattened.filter(
      (key, index) =>
        flattened.findIndex((otherKey) => otherKey.toUpperCase() === key.toUpperCase()) === index,
    );
  } catch {
    return [];
  }
}
//@ chunk-sfy2wa1e.js:106834-106882 placement
var BUNDLE_ENV_SWITCHES = ["CCR_ENABLE_BUNDLE", "CCR_FORCE_BUNDLE"];
//@ chunk-sfy2wa1e.js:106882-108822 placement
/**
 * 生成因受保护环境变量（HOME、CLAUDE_CONFIG_DIR 等）被设置文件改写而拒绝上传的说明。
 */
function protectedEnvRefusal(finding) {
  if (finding.kind === "unreadable")
    return `Not uploading this working tree this way: ${"a settings file a cloud session could reach (this repository\u2019s .claude/settings.json or .claude/settings.local.json, or a --settings file)"} could not be parsed, so what it sets cannot be checked. Fix or remove it (see /status), then restart Claude Code.`;
  let included = HOME_ENV_VARS.includes(finding.name.toUpperCase());
  if (finding.kind === "names")
    return included
      ? `Not uploading this working tree this way: ${"a settings file a cloud session could reach (this repository\u2019s .claude/settings.json or .claude/settings.local.json, or a --settings file)"} names ${finding.name}, which decides where your own settings are found. Remove it there; if you put it there yourself and need it, set it in your shell instead. Then restart Claude Code.`
      : `Not uploading this working tree this way: ${"a settings file a cloud session could reach (this repository\u2019s .claude/settings.json or .claude/settings.local.json, or a --settings file)"} names ${finding.name}, and the upload's own git runs would have to trust what it names. If you did not put it there yourself, remove it. If you did, move it to your user settings (~/.claude/settings.json), managed settings or your shell (or pass the settings inline). Then restart Claude Code.`;
  return included
    ? `Not uploading this working tree this way: ${finding.name} was changed by a settings file after Claude Code started; it decides where your own settings are found, so the upload only trusts the value the process was started with. Set it in the shell rather than in a settings file, then restart Claude Code.`
    : `Not uploading this working tree this way: ${finding.name} was set by ${"a settings file a cloud session could reach (this repository\u2019s .claude/settings.json or .claude/settings.local.json, or a --settings file)"} that no longer names it, and the upload's own git runs would still have to trust it. Keep it out of those files and restart Claude Code.`;
}
//@ chunk-sfy2wa1e.js:108822-108860 placement
function previousCaptureServes() {
  return getPlatform() === "windows";
}
//@ chunk-sfy2wa1e.js:108860-109568 placement
function explainPreviousCaptureRetired(state) {
  switch (state?.kind) {
    case undefined:
      return "An older upload method, which took more layouts, is retired on macOS and Linux. To start without an upload, push your work and connect GitHub at https://claude.ai/code; /ultrareview also takes a pull request number.";
    case "forced_bundle":
      return "An older upload method, which took more layouts, is retired on macOS and Linux. To start without an upload, unset CCR_FORCE_BUNDLE, push your work and connect GitHub at https://claude.ai/code.";
    case "other_forge":
      return `An older upload method, which took more layouts, is retired on macOS and Linux. Cloud sessions can't clone from ${state.forge} yet, so an upload is the only way to start one from this repository.`;
  }
}
//@ chunk-sfy2wa1e.js:109568-109657 placement
function unsupportedLayoutResult(layoutKind, error) {
  return {
    success: false,
    error,
    failReason: "unsupported_layout",
    layoutKind,
  };
}
//@ chunk-sfy2wa1e.js:113565-114711 placement
async function handBackDecision(cwd, signal, changesOptions) {
  let gitRoot = findGitRoot(cwd ?? getCwd());
  let indexCopy = gitRoot ? await rewriteCopyAsSingleFile(gitRoot, signal) : null;
  if (indexCopy?.kind === "failed")
    return {
      kind: "refused",
      sentence: `It is not uploaded the previous way either: a private copy of this checkout's index could not be made (${truncateWithCount(replaceControlChars(indexCopy.detail), MAX_DETAIL_CHARS)}), and that way runs only over such a copy. Nothing was uploaded; once that is put right, retry, or start from an ordinary clone.`,
      named: 0,
      added: 0,
      unexamined: 0,
      gitlinks: 0,
      indexCopied: false,
      indexCopyCause: indexCopy.cause,
    };
  let changes;
  try {
    changes = await examineUncommittedChanges(cwd, signal, changesOptions, indexCopy?.indexFile);
  } catch (error) {
    await indexCopy?.dispose();
    throw error;
  }
  if (changes.kind === "refused") {
    await indexCopy?.dispose();
    return changes;
  }
  let cachedTree = null;
  try {
    cachedTree = indexCopy === null ? null : await rebuildCachedTree(gitRoot, indexCopy.indexFile, signal);
  } catch (error) {
    await indexCopy?.dispose();
    throw error;
  }
  if (cachedTree?.kind === "failed") {
    await indexCopy?.dispose();
    return {
      kind: "refused",
      sentence: `It is not uploaded the previous way either: that way runs only over a private copy of this checkout's index, and ${truncateWithCount(replaceControlChars(cachedTree.detail), MAX_DETAIL_CHARS)}. Nothing was uploaded; once that is put right, retry, or start from an ordinary clone.`,
      named: 0,
      added: 0,
      unexamined: 0,
      gitlinks: 0,
      indexCopied: false,
      indexCopyCause: "index_tree",
    };
  }
  return {
    kind: "proceed",
    pinnedIndex:
      indexCopy === null
        ? null
        : {
            path: indexCopy.indexFile,
            dispose: indexCopy.dispose,
          },
  };
}
//@ chunk-sfy2wa1e.js:114711-116844 placement
/**
 * 列出未提交改动并检查是否含必须留在本机的文件、子模块 gitlink 等；无法列出或含受限文件时返回 refused 结果。
 */
async function examineUncommittedChanges(cwd, signal, changesOptions, opts) {
  let changes = await checkGitRootLocation(cwd, signal, opts);
  if (changes === null)
    return {
      kind: "refused",
      sentence:
        "It is not uploaded the previous way either: its uncommitted changes could not be listed, so they cannot be checked for files that must stay on this machine \u2014 retry; if it keeps happening, git status in this checkout will show what git cannot list.",
      named: 0,
      added: 0,
      unexamined: 0,
      gitlinks: 0,
      indexCopied: true,
    };
  let { gitlinks } = changes;
  if (gitlinks.length > 0)
    return {
      kind: "refused",
      sentence: `It is not uploaded the previous way either: this checkout's index registers ${gitlinks.length} nested ${plural(gitlinks.length, "repository", "repositories")} (a submodule or gitlink: ${formatFailureDetails(gitlinks, 3)}), which that way would enter, running git under the nested repository\u2019s own configuration \u2014 one a session of this checkout can write. If the entry is not meant, remove it from the index with \`git update-index --force-remove -- <path>\` (not \`git rm\`, which first runs git inside the nested repository); otherwise update git (2.31 or newer) if it is older, or start from an ordinary clone.`,
      named: 0,
      added: 0,
      unexamined: 0,
      gitlinks: gitlinks.length,
      indexCopied: true,
    };
  let { unwrittenModes } = changes;
  if (unwrittenModes.length > 0)
    return {
      kind: "refused",
      sentence: `It is not uploaded the previous way either: this checkout's index lists ${unwrittenModes.length} ${plural(unwrittenModes.length, "entry", "entries")} under a file mode git itself never writes (${formatFailureDetails(unwrittenModes, 3)}), so something other than git wrote the index and what the previous way would carry cannot be checked. Remove each such entry with \`git update-index --force-remove -- <path>\` (the file itself stays on disk), then \`git add -- <path>\` if it should be tracked; or start from an ordinary clone.`,
      named: 0,
      added: 0,
      unexamined: unwrittenModes.length,
      gitlinks: 0,
      indexCopied: true,
    };
  let gitRoot = changes.gitRoot === "" ? undefined : await changesOptions?.(changes.gitRoot);
  let paths = await classifyPathIdentity(
    changes.gitRoot,
    changes.paths,
    changes.added,
    gitRoot,
    changes.deleted,
  );
  return paths.length === 0
    ? {
        kind: "proceed",
      }
    : {
        kind: "refused",
        sentence: `It is not uploaded the previous way either (that way keeps nothing back): ${changedPathsRefusal(paths, changesOptions !== undefined).replace(/^Not uploading this working tree: /, "")}`,
        named: paths.length,
        added: countWhere(paths, ({ why }) => why === "added"),
        unexamined: countWhere(paths, ({ why }) => why === "unexamined"),
        gitlinks: 0,
        indexCopied: true,
      };
}
//@ chunk-sfy2wa1e.js:116844-117001 placement
async function classifyDotGitEntry(dir) {
  let stats = await lstat(join(dir, ".git")).catch(() => null);
  return stats?.isSymbolicLink() === true
    ? "link"
    : stats?.isFile() === true && stats.nlink !== 1
      ? "second_name"
      : "other";
}
//@ chunk-sfy2wa1e.js:117001-117348 placement
/**
 * 判断 .git 指针文件指向的类型：链接工作树、子模块或独立 git 目录。
 */
async function classifyGitPointer(dir) {
  let gitPath = join(dir, ".git");
  let stats = await lstat(gitPath).catch(() => null);
  if (stats?.isSymbolicLink()) return "symlink";
  if (!stats?.isFile()) return "other";
  let pointerText = await readTextFileQuiet(gitPath).catch(() => {
    return;
  });
  let replaced = readGitdirPointer(pointerText)?.replaceAll("\\", "/");
  if (replaced === undefined) return "other";
  return /\/worktrees\/[^/]+\/?$/.test(replaced)
    ? "linked_worktree"
    : /\/modules\//.test(replaced)
      ? "submodule"
      : "separate_git_dir";
}
//@ chunk-sfy2wa1e.js:117348-118301 placement
function unsupportedLayoutNotice(kind) {
  return `This checkout ${
    {
      git_file:
        "is a submodule, a checkout with a separate git directory, or one whose .git pointer could not be followed",
      linked_worktree:
        "is a linked working tree whose pointer files could not be verified (try git worktree repair), which uses per-worktree configuration, or whose repository sits somewhere this upload does not trust",
      work_tree: "has core.worktree set",
      included_config: "reads git configuration from a file inside the working tree",
      many_includes: `is used with a git configuration that includes more files, or a longer chain of nested includes, than the new upload path follows (over ${MAX_INCLUDE_FILES} include files or 8 levels deep)`,
      old_git: "is used with a git older than 2.31",
      borrowed_objects: "borrows objects from another repository",
      reftable: "keeps its refs in the reftable format",
    }[kind]
  }; the new upload path does not support that yet, so the working tree is being uploaded the previous way for this session.`;
}
//@ chunk-sfy2wa1e.js:118301-118948 placement
/**
 * 判断是否请求使用旧版 bundle 上传方式（只认启动环境与自有设置）。
 */
function isLegacyBundleRequested() {
  let gitEnv = buildGitEnv(undefined);
  let envRequested = isEnvTruthy(getEnvCaseInsensitive(gitEnv, "CLAUDE_CODE_LEGACY_BUNDLE"));
  let envFlag = env.CLAUDE_CODE_LEGACY_BUNDLE === true;
  let ignored = envFlag && !envRequested;
  if (ignored) {
    let any = HOME_ENV_VARS.some(
      (envVar) => getEnvCaseInsensitive(process.env, envVar) !== getEnvCaseInsensitive(gitEnv, envVar),
    );
    logForDebugging(
      any
        ? "[gitBundle] CLAUDE_CODE_LEGACY_BUNDLE is set, but a settings tier also moves where settings are read from (HOME, CLAUDE_CONFIG_DIR, ...): no settings tier counts as the owner's word then, so it is ignored and the default upload method runs"
        : "[gitBundle] CLAUDE_CODE_LEGACY_BUNDLE is set by a settings file, not by the environment claude was started with or the owner's own settings: ignored, the default upload method runs",
      {
        level: "warn",
      },
    );
  }
  return {
    requested: envRequested && envFlag,
    ignored,
  };
}
//@ chunk-sfy2wa1e.js:118948-118979 placement
var EMPTY_BUNDLE_VERDICT = {
  missing: [],
  foreign: [],
};
//@ chunk-sfy2wa1e.js:118979-119264 placement
async function verifySeedRefInBundle(cwd, bundlePath, ref, targetSha, signal) {
  let result = await listGitRefs(cwd, [...GIT_READ_CONFIG_ARGS, "bundle", "list-heads", bundlePath], {
    hardened: false,
    signal,
    env: GIT_LIST_ENV,
  });
  if (result.code !== 0)
    return {
      missing: [ref],
      foreign: [],
      unlisted: getFirstLine(result.stderr.trim()) || `exit ${result.code}`,
    };
  return result.stdout
    .split(
      `
`,
    )
    .some((line) => line === `${targetSha} ${ref}`)
    ? EMPTY_BUNDLE_VERDICT
    : {
        missing: [ref],
        foreign: [],
      };
}
//@ chunk-sfy2wa1e.js:119264-120188 placement
/**
 * 校验生成的 bundle 只包含预期的引用。
 */
async function verifyBundleRefs(cwd, bundlePath, refs, options) {
  let filtered = refs.filter((ref) => !ref.startsWith("-"));
  let listed = await listGitRefs(cwd, ["bundle", "list-heads", bundlePath], {
    hardened: true,
    layout: options.layout,
    signal: options.signal,
    probes: options.probes,
  });
  if (listed.code !== 0)
    return {
      missing: filtered,
      foreign: [],
      unlisted: getFirstLine(listed.stderr.trim()) || `exit ${listed.code}`,
    };
  let heads = new Map(
    listed.stdout
      .split(
        `
`,
      )
      .flatMap((line) => {
        let [sha, refName] = line.split(" ");
        return sha === undefined || refName === undefined ? [] : [[refName, sha]];
      }),
  );
  let filtered_2 = filtered.filter((ref) => {
    let head = heads.get(ref);
    let expected = options.expected[ref];
    return head === undefined || (expected !== undefined && head !== expected);
  });
  let foreignRefs =
    options.shown === undefined
      ? []
      : [...heads].flatMap(([ref_2, head_2]) =>
          Object.hasOwn(options.expected, ref_2) || options.shown?.get(ref_2) === head_2 ? [] : [ref_2],
        );
  if (options.shown === undefined || filtered_2.length > 0 || foreignRefs.length > 0)
    return {
      missing: filtered_2,
      foreign: foreignRefs,
    };
  let checkResult = await listGitRefs(cwd, ["cat-file", "--batch-check"], {
    hardened: true,
    layout: options.layout,
    signal: options.signal,
    probes: options.probes,
    input: [...heads.values()]
      .map(
        (sha_2) => `${sha_2}
`,
      )
      .join(""),
  });
  let notHeld =
    checkResult.code === 0
      ? [...heads].flatMap(([sha_3, sha_4]) =>
          checkResult.stdout.includes(`${sha_4} missing`) ? [sha_3] : [],
        )
      : [...heads.keys()];
  return {
    missing: filtered_2,
    foreign: foreignRefs,
    notHeld,
  };
}
//@ chunk-sfy2wa1e.js:120188-120482 placement
async function snapshotHeadTree(cwd, layout, opts, signal, probes) {
  if (layout === undefined || !(await isGitLayoutUntampered(layout, opts))) return null;
  let result = await listGitRefs(cwd, ["rev-parse", "-q", "--verify", "HEAD^{tree}"], {
    hardened: true,
    layout,
    signal,
    probes,
  });
  let trimmed = result.stdout.trim();
  if (!(await isGitLayoutUntampered(layout, opts))) return null;
  return result.code === 0 && /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/.test(trimmed) ? trimmed : undefined;
}
//@ chunk-sfy2wa1e.js:120482-121026 placement
/**
 * 列出分支与标签的提交，用于判断能否用最宽的层级打包。
 */
async function listBranchAndTagTips(cwd, layout, opts, signal, probes) {
  if (!(await isGitLayoutUntampered(layout, opts))) return null;
  let [branches, head] = await Promise.all([
    listGitRefs(cwd, ["for-each-ref", "--format=%(objectname) %(refname)", "refs/heads/", "refs/tags/"], {
      hardened: true,
      layout,
      signal,
      probes,
    }),
    listGitRefs(cwd, ["rev-parse", "-q", "--verify", "HEAD"], {
      hardened: true,
      layout,
      signal,
      probes,
    }),
  ]);
  if (
    branches.code !== 0 ||
    (head.code !== 0 && head.exitCode !== 1) ||
    !(await isGitLayoutUntampered(layout, opts))
  )
    return null;
  let headEntries = head.code === 0 ? [["HEAD", head.stdout.trim()]] : [];
  return new Map([
    ...branches.stdout
      .split(
        `
`,
      )
      .flatMap((line) => {
        let [sha, refName] = line.split(" ");
        return sha === undefined || refName === undefined ? [] : [[refName, sha]];
      }),
    ...headEntries,
  ]);
}
//@ chunk-sfy2wa1e.js:121026-121312 placement
/**
 * git bundle 上传前的 ref 检查结果转错误（名字配错，与插件无关）。
 */
function bundleHeadsFailure(verdict, hardened) {
  if (verdict.unlisted !== undefined)
    return {
      ok: false,
      error: `git bundle list-heads failed: ${clipGitArgs(verdict.unlisted, hardened)}`,
      failReason: "git_error",
    };
  if (verdict.missing.length > 0) return droppedRefsFailure(verdict.missing);
  if (verdict.foreign.length > 0) return unexpectedRefsFailure(verdict.foreign);
  return (verdict.notHeld?.length ?? 0) > 0 ? unexpectedRefsFailure(verdict.notHeld ?? [], "not_held") : null;
}
//@ chunk-sfy2wa1e.js:121312-121994 placement
/**
 * 生成 bundle 打包了意外引用时的失败结果。
 */
function unexpectedRefsFailure(refs, reason = "changed") {
  return {
    ok: false,
    error:
      reason === "changed"
        ? `git bundle create packed ${formatFailureDetails(refs)}, which this checkout did not show when the upload read its refs: its refs changed, or were redirected elsewhere, while the bundle was made. Make sure nothing else is writing to this checkout, inspect its git directory (a commondir file there was not written by git), then retry.`
        : `git bundle create packed ${formatFailureDetails(refs)} at commits this checkout's own object store does not hold: another object store stood in while the bundle was made. Make sure nothing else is writing to this checkout's git directory (objects/info in particular), then retry.`,
    failReason: "git_dir_tampered",
    refsChanged: true,
  };
}
//@ chunk-sfy2wa1e.js:121994-122441 placement
/**
 * 生成 bundle 漏掉或改动引用时的失败结果。
 */
function droppedRefsFailure(missing) {
  return {
    ok: false,
    error: `git bundle create left out or altered ${formatFailureDetails(missing)}: another ref in this repository (a branch or tag spelled like it) makes the name ambiguous, or the temporary ref was rewritten while the bundle was made, so the upload would not carry your changes as captured. Make sure nothing else is writing to this checkout, rename or delete such a branch or tag (see \`git for-each-ref\`), then retry.`,
    failReason: "git_error",
  };
}
//@ chunk-sfy2wa1e.js:122441-122561 placement (2.1.88 match: formatFailureDetails, 0.776)
function formatFailureDetails(failures, includeReasons = DEFAULT_LISTED_FAILURES) {
  let joined = failures
    .slice(0, includeReasons)
    .map((failure) => truncateWithCount(replaceControlChars(failure), MAX_DISPLAYED_NAME_CHARS))
    .join(", ");
  let remaining = failures.length - includeReasons;
  return remaining > 0 ? `${joined} and ${remaining} more` : joined;
}
//@ chunk-sfy2wa1e.js:122561-123994 placement
/**
 * 生成 bundle 读回失败（对象缺失等）时的结果与原因。
 */
function bundleReadBackFailure(kind, detail) {
  switch (kind) {
    case "objects":
      return {
        outcome: "bundle_objects_missing",
        error: `Not uploading this working tree: git could not read a complete history back out of the bundle it just made (${detail}), so an object in this repository's .git/objects is most likely damaged. Run \`git fsck\` in this checkout, repair or re-clone the repository, then retry.`,
        failReason: "git_dir_tampered",
      };
    case "unlisted":
      return {
        outcome: "bundle_objects_unlisted",
        error: `Not uploading this working tree: the bundle git just made carries objects that none of the branches and tags it lists lead to (${detail}). In \`git for-each-ref\`, look for a name that holds refs/ twice (such as refs/tags/refs/heads/x), rename or delete that branch or tag (on the remote too, or the next fetch brings it back), then retry.`,
        failReason: "refused",
      };
    case "trailing":
      return {
        outcome: "bundle_trailing_bytes",
        error: `Not uploading this working tree: the bundle git just made does not end with its pack (${detail}). git does not write that on its own, so a pack file in this repository's .git/objects is most likely damaged or was not written by git. Clone the repository anew, then retry.`,
        failReason: "git_dir_tampered",
      };
    case "header":
    case "scratch":
    case "index":
    case "walk":
    case "unfinished":
      return {
        outcome: "git_error",
        error: `Could not check the bundle before upload, so nothing was uploaded (${detail}). Retry; if it happens again, run \`git fsck\` in this checkout.`,
        failReason: "git_error",
      };
  }
}
//@ chunk-sfy2wa1e.js:123994-124256 placement
function gitCommandFailure(command, result, hardened) {
  let failureClass = hardened ? undefined : firstGitFailureClass(seenStderr(result));
  let stderrText = clipGitArgs(result.stderr, hardened);
  let isWithheld = result.stderr === WITHHELD_STDERR_NOTICE;
  return {
    ok: false,
    error:
      failureClass !== undefined
        ? GIT_REFUSAL_MESSAGES[failureClass]
        : `${command} failed (${result.code})${stderrText && `: ${stderrText}`}${isWithheld ? "; `git fsck` in this checkout may show why" : ""}`,
    failReason: "git_error",
    ...(failureClass !== undefined && {
      gitRefused: failureClass,
    }),
  };
}
//@ chunk-sfy2wa1e.js:124256-124311 placement
function clipGitArgs(stderr, hardened) {
  return hardened ? truncateWithCount(replaceControlChars(stderr), 200) : stderr.slice(0, 200);
}
//@ chunk-sfy2wa1e.js:124311-125724 placement
/**
 * 链接工作树问题的原因说明文本。
 */
var LINKED_WORKTREE_REASONS = {
  git_file: "whose .git file does not hold the single pointer git writes there.",
  admin_dir:
    "whose .git file does not name the administrative directory git uses for it (or that directory is not where git keeps one, under the repository\u2019s .git/worktrees).",
  foreign_mount:
    "whose administrative directory under the repository\u2019s .git/worktrees has something mounted over it (another device or, on Linux, another mount) \u2014 unmount it first.",
  back_link:
    "whose administrative directory does not point back at it \u2014 usually a working tree that was moved; git worktree repair (run here) rewrites the pointer.",
  common_dir: "whose administrative directory names a different repository than git resolves for it.",
  keyed_elsewhere:
    "whose .git file leads git to a different repository from the one under which Claude Code keeps this folder\u2019s trust and settings. The usual cause is a symbolic link on the path in that file, or on the path to this folder.",
  placement:
    "whose repository sits inside this working tree (or the tree inside it), inside another git directory or under a temporary directory, or is not named the way git names one (.git, or name.git for a bare repository) \u2014 places and shapes this upload does not take a repository from.",
  worktree_config:
    "that uses per-worktree configuration (extensions.worktreeConfig, or a config.worktree file), which this upload does not support yet.",
};
//@ chunk-sfy2wa1e.js:125724-127404 placement
/**
 * 生成可被云会话写入的 git 配置文件导致拒绝上传时的说明。
 */
function writableConfigRefusal(writable) {
  let isIncluded = writable.startsWith("included");
  let whereText = isIncluded
    ? "a file that your git configuration includes"
    : writable.startsWith("repository")
      ? "this repository\u2019s own git configuration file"
      : "your own or the system-wide git configuration file";
  let hint = isIncluded
    ? " `git config --show-origin --get-regexp include` lists each include line and its file."
    : writable.startsWith("repository")
      ? ""
      : " `git config --list --show-origin --name-only` shows the files in use.";
  let retryHint = "then retry; if the line is not yours to change, this checkout cannot be uploaded.";
  let [problem, fix] = writable.endsWith("_inside")
    ? [
        "lies inside this checkout or its git directory (even if it does not exist yet), where a cloud session could change it",
        isIncluded
          ? "Remove that line or point it outside this checkout, then retry; if the line is not yours to change, this checkout cannot be uploaded."
          : "Keep that file outside this checkout, or start from a checkout that does not hold it.",
      ]
    : writable.endsWith("_not_text")
      ? [
          "has a name that is not valid text, so it cannot be checked",
          `Give the file and every folder in its path a name that is valid text, ${isIncluded ? "update the include line to match, " : ""}${writable.startsWith("repository") ? "" : "keep the file outside this checkout, "}then retry.`,
        ]
      : [
          "can be reached from this checkout (through a link, a hard link or another spelling of its path) or is on a network path, so a cloud session could change it or it cannot be checked",
          isIncluded
            ? "Remove that line, or point it by its plain path at an ordinary local file outside this checkout, then retry; if the line is not yours to change, this checkout cannot be uploaded."
            : "Put an ordinary local file (no link, no hard link) in its place, then retry.",
        ];
  return `Not uploading this working tree: ${whereText} ${problem}.${hint} ${fix}`;
}
//@ chunk-sfy2wa1e.js:127404-132392 placement
/**
 * 把工作树布局问题（.git 指针文件、链接工作树、include 配置、reftable、借用对象等）翻译成面向用户的拒绝上传说明。
 */
function misplacedRefusalMessage(summary) {
  switch (summary.misplaced) {
    case "git_file":
      return `Not uploading this working tree: ${summary.pointerFollowed ? "this checkout\u2019s .git is a pointer file (a submodule, a checkout with a separate git directory), which this upload does not support yet. Before running any git command here, look at the directory that it leads to (the .git file names it), unless you know it. Start" : summary.dotGitEntry === "link" ? "this checkout\u2019s .git is a symbolic link, which this upload does not follow. Start" : summary.dotGitEntry === "second_name" ? "this checkout\u2019s .git pointer file has a second name (a hard link), so what it names cannot be trusted. Remove the other name and retry, or start" : "this checkout\u2019s .git is something this upload could not follow (it could not be read, is not the one gitdir line git writes, or names another host). Start"} from an ordinary clone of the repository \u2014 its main checkout \u2014 instead.`;
    case "linked_worktree":
      return summary.detail === "worktree_config"
        ? `Not uploading this working tree: this checkout is a linked working tree ${LINKED_WORKTREE_REASONS.worktree_config} Start from the repository\u2019s main checkout instead (a new worktree made from this one would be refused too: a current git copies this file into it).`
        : summary.detail === "placement"
          ? `Not uploading this working tree: this checkout is a linked working tree ${LINKED_WORKTREE_REASONS.placement} Start from the repository\u2019s main checkout, or from a working tree made with git worktree add in an ordinary location, instead; where neither serves, from an ordinary clone of the repository.`
          : `Not uploading this working tree: this checkout is a linked working tree ${LINKED_WORKTREE_REASONS[summary.detail ?? "admin_dir"]} Start from the repository\u2019s main checkout, or from a working tree made with git worktree add in an ordinary location, instead.`;
    case "work_tree":
      return summary.unexamined
        ? "Not uploading this working tree: this checkout\u2019s own folder could not be examined just now, so it could not be checked that git\u2019s working tree is this folder. Retry; if it goes on, check that you can still open this folder."
        : "Not uploading this working tree: git resolves this checkout\u2019s working tree to another directory (core.worktree is set), which this upload does not support yet. Start from an ordinary clone of the repository instead, or unset core.worktree if nothing here relies on it.";
    case "included_config":
      return writableConfigRefusal(summary.writable ?? "included_indirect");
    case "many_includes":
      return `Not uploading this working tree: the git configuration in force for this checkout (~/.gitconfig, .git/config and the files they include) pulls in more include files, or a longer chain of nested includes, than this upload follows (over ${MAX_INCLUDE_FILES} files or 8 levels deep), so the programs that configuration names cannot all be switched off while the upload is prepared. Trim the include chain (directives naming files that do not exist do not count), then retry.`;
    case "old_git":
      return "Not uploading this working tree: the installed git is older than 2.31, which cannot be kept from running programs this checkout\u2019s configuration names while the upload is prepared. Update git (2.31 or newer), then retry.";
    case "borrowed_objects":
      return `Not uploading this working tree: this checkout borrows objects from another repository (an objects/info/alternates or http-alternates file \u2014 a clone made with --shared or --reference, or a file something else put there), so an upload could carry that repository\u2019s history too, which this upload does not support. Start from an ordinary clone of the repository instead.${summary.sharedDirectoryElsewhere ? " (This checkout is a linked working tree: that file is in its repository\u2019s git directory, which this checkout\u2019s .git file points into.)" : ""}`;
    case "reftable":
      return "Not uploading this working tree: this repository keeps its refs in the reftable format, whose tables the upload cannot yet vouch for one by one. Start from a clone made with the default (files) ref format instead.";
    case "ref_storage":
      return `Not uploading this working tree: ${auditRefStorageSetting(summary.keptBy ?? "setting")}. Nothing was uploaded.`;
    case "temp_root":
      return "Not uploading this working tree: this checkout stands \u2014 or a link on the way to it leads \u2014 under a directory cloud sessions on this machine use as scratch space, so nothing in it can be told apart from what such a session put there. Start from the checkout at its ordinary location instead.";
    case "git_dir":
      return "Not uploading this working tree: git does not use this checkout\u2019s own .git directory, which happens only when something in .git (usually HEAD) was emptied or overwritten by something other than git. Look at .git and put back what was changed before retrying, or start from an ordinary clone of the repository instead.";
    case "common_dir":
      return `Not uploading this working tree: the commondir file in this checkout\u2019s .git directory was written by something other than git, and it sends git to a directory where git itself would not keep this checkout\u2019s shared files. ${DO_NOT_RUN_GIT_USE_ADVICE}`;
  }
}
//@ chunk-sfy2wa1e.js:132392-132591 placement
function misplacedSummary(layout) {
  return {
    misplaced: layout.misplaced,
    unexamined: layout.unexamined,
    keptBy: layout.keptBy,
    writable: layout.writable,
    detail: layout.detail,
    pointerFollowed: layout.gitDir !== "",
    sharedDirectoryElsewhere: layout.commonDir !== layout.gitDir,
  };
}
//@ chunk-sfy2wa1e.js:132591-132877 placement
function deletedHereNotice(files) {
  return `${files.length} tracked ${plural(files.length, "file")} ${plural(files.length, "was", "were")} missing when read and ${plural(files.length, "is", "are")} uploaded as deleted (${formatFailureDetails(files, 3)}) \u2014 if a build was rewriting ${plural(files.length, "it", "them")} just then, start the session again once it settles.`;
}
//@ chunk-sfy2wa1e.js:132877-133569 placement
function leftOutNotice(items, { readRules = false, ofThisUploadOnly = false } = {}) {
  return `${ofThisUploadOnly ? "Left out of this upload" : "Left on this machine"}: ${items.length} uncommitted ${plural(items.length, "file")} named like credentials or keys, ${readRules ? "covered by a Read rule or a sandbox read-deny setting of yours, linked from your Claude Code configuration, " : ""}hard-linked to another file, kept by a git filter such as LFS, or still being written by another program while ${plural(items.length, "it was", "they were")} read (${formatFailureDetails(items)})${ofThisUploadOnly ? "" : `, ${plural(items.length, "was", "were")} not uploaded`} \u2014 the cloud session starts with the version git already holds for ${plural(items.length, "it", "them")} (committed or staged), or without ${plural(items.length, "it", "them")}.`;
}
//@ chunk-sfy2wa1e.js:133569-137029 placement
/**
 * 按 git 报告的变更路径异常类型（伪造拼写、同字节条目等）生成拒绝上传的说明文案。
 */
function changedPathsRefusal(paths, paths_2 = false) {
  let pathsWhere = (pathsWhere) => paths.filter((path) => path.why === pathsWhere).map(({ path }) => path);
  let forged = pathsWhere("forged");
  if (forged.length > 0)
    return `Not uploading this working tree: git reports changed paths spelled in a way git itself never writes (${formatFailureDetails(forged)}), so this checkout's index or HEAD was edited by something other than git. Inspect it (git status, git log) before retrying.`;
  let sameBytes = pathsWhere("same-bytes");
  if (sameBytes.length > 0)
    return `Not uploading this working tree: while it was read, an index entry appeared (${formatFailureDetails(sameBytes)}) holding, byte for byte, the content of a file that stays on this machine (named like credentials or keys${paths_2 ? ", covered by a Read rule or a sandbox read-deny setting of yours, linked from your Claude Code configuration" : ""}, or kept by a git filter) \u2014 at a name no step of this upload put it under, so something else wrote into the index copy this upload works in while it ran. Retry; if it recurs, check what else is running in this checkout.`;
  let alias = pathsWhere("alias");
  if (alias.length > 0)
    return `Not uploading this working tree: its uncommitted changes include paths shaped like Windows 8.3 short names (${formatFailureDetails(alias)}), which can open a different file than they name. Rename or remove them \u2014 committing them as they stand would put whatever they open into git \u2014 then retry.`;
  let hardlinked = pathsWhere("hardlinked");
  if (hardlinked.length > 0)
    return `Not uploading this working tree: ${hardlinked.length} changed ${plural(hardlinked.length, "file has", "files have")} a second hard link (${formatFailureDetails(hardlinked)}) \u2014 another name for what may be a file outside this tree, linked in without reading it \u2014 so ${plural(hardlinked.length, "it is", "they are")} never read for an upload. Remove the extra link (or commit the file if it is yours), then retry.`;
  let unexaminedPaths = pathsWhere("unexamined");
  if (unexaminedPaths.length > 0)
    return `Not uploading this working tree: ${unexaminedPaths.length} changed ${plural(unexaminedPaths.length, "file")} could not be examined where ${plural(unexaminedPaths.length, "it stands", "they stand")} (${formatFailureDetails(unexaminedPaths)}) \u2014 a directory above could not be inspected, the name is not valid UTF-8, or the entry could not be read \u2014 so whether another name leads outside this tree cannot be told. Check the path (ls -la along it), or commit the change if it is yours, then retry.`;
  let addedPaths = pathsWhere("added");
  let changedPaths = pathsWhere("changed");
  let resurrectedPaths = pathsWhere("resurrected");
  return [
    `Not uploading this working tree: its uncommitted changes include ${paths.length} ${plural(paths.length, "file")} named like credentials or keys${paths_2 ? ", covered by a Read rule or a sandbox read-deny setting of yours, or linked from your Claude Code configuration" : ""} (${formatFailureDetails(
      paths.map(({ path }) => path),
    )}).`,
    ...(addedPaths.length > 0
      ? [
          `${formatFailureDetails(addedPaths)} ${plural(addedPaths.length, "was", "were")} added to git's index but never committed: unless you meant to start tracking ${plural(addedPaths.length, "it", "them")}, take ${plural(addedPaths.length, "it", "them")} back out with ` +
            "`git rm --cached -- <file>` (the file itself stays on disk) \u2014 if you did not add " +
            `${plural(addedPaths.length, "it", "them")} yourself, something else did.`,
        ]
      : []),
    ...(changedPaths.length > 0
      ? [
          `${formatFailureDetails(changedPaths)} ${plural(changedPaths.length, "differs", "differ")} from what is committed: commit the change if it belongs in git; if ` +
            "`git status` shows no change there, running it once settled the difference \u2014 retry; if git should not be tracking " +
            `${plural(changedPaths.length, "that file", "those files")} at all, this checkout's history was rewritten \u2014 see ` +
            "`git log -- <file>`.",
        ]
      : []),
    ...(resurrectedPaths.length > 0
      ? [
          `${formatFailureDetails(resurrectedPaths)} ${plural(resurrectedPaths.length, "is", "are")} committed but removed from the index while the file is, or may still be, on disk: commit the removal, or if you never committed ${plural(resurrectedPaths.length, "it", "them")}, see \`git log -- <file>\` for who did.`,
        ]
      : []),
    "Then retry.",
  ].join(" ");
}
//@ chunk-sfy2wa1e.js:137029-137070 placement
function formatSizeOrUnknown(size) {
  return size === null ? "?" : formatFileSize(size);
}
//@ chunk-sfy2wa1e.js:137070-166998 placement
/**
 * 把当前工作树上传给云会话：HIPAA 策略拒绝、检查检出布局与设置、捕获 WIP、生成并校验 bundle、上传，失败时按原因说明是否回退旧方式（约 30 KB）。
 */
async function createAndUploadGitBundle(options, capability) {
  if (hasComplianceTaint("hipaa")) {
    logEvent("tengu_ccr_bundle_upload", {
      outcome: lit("refused_hipaa"),
    });
    logFeatureBad("teleport_git_bundle_upload", "refused_hipaa");
    return {
      success: false,
      error:
        "Cloud sessions started from an uploaded copy of this working tree are disabled by your organization's policy. Start the session from a GitHub repository source instead.",
      failReason: "refused",
    };
  }
  let requestedCwd = capability?.cwd ?? getCwd();
  let isCurrentBranchOnly = capability?.currentBranchOnly === true;
  let gitRoot = findGitRoot(requestedCwd);
  if (!gitRoot) {
    logEvent("tengu_ccr_bundle_upload", {
      outcome: lit("not_a_repo"),
    });
    logFeatureBad("teleport_git_bundle_upload", "not_a_repo");
    return {
      success: false,
      error: "Not in a git repository",
      failReason: "not_a_repo",
    };
  }
  let isBound = capability?.hardenForDeviceSessions === true;
  let legacySwitch =
    capability?.hardenForDeviceSessions === undefined && getPlatform() !== "windows"
      ? isLegacyBundleRequested()
      : {
          requested: false,
          ignored: false,
        };
  let hardened = capability?.hardenForDeviceSessions ?? !previousCaptureServes();
  let legacyFallbackOk = !isBound && (capability?.previousCaptureServes ?? previousCaptureServes());
  if (legacySwitch.requested)
    logForDebugging(
      "[gitBundle] CLAUDE_CODE_LEGACY_BUNDLE is not honoured on macOS and Linux: the default upload method runs",
      {
        level: "warn",
      },
    );
  let bindingFacts = hardened
    ? {
        hardened: true,
        ...emptyBindingFacts(),
        ...(legacySwitch.ignored && {
          legacy_switch_ignored: true,
        }),
        ...(legacySwitch.requested && {
          legacy_switch_retired: true,
        }),
      }
    : {
        legacy_bundle: true,
      };
  let refuseBackslash = () => {
    logEvent("tengu_ccr_bundle_upload", {
      outcome: lit("admin_dir_failed"),
      admin_dir_reason: lit("path_misread"),
      ...bindingFacts,
    });
    logFeatureBad("teleport_git_bundle_upload", "admin_dir_failed");
    return {
      success: false,
      error:
        "Not uploading this working tree: a folder with a backslash (\\) in its name is in its path (as written or with links followed) or in the path of the folder Claude Code was started in. Claude Code would read the backslash as a folder separator and check a different folder. Rename that folder, then start Claude Code again.",
      failReason: "refused",
    };
  };
  if (hasBackslash(gitRoot) || cwdHasBackslash()) return refuseBackslash();
  let rootPath = hardened ? await realpath(gitRoot).catch(() => null) : gitRoot;
  if (rootPath === null) {
    logEvent("tengu_ccr_bundle_upload", {
      outcome: lit("admin_dir_failed"),
      admin_dir_reason: lit("unresolved_root"),
      ...bindingFacts,
    });
    logFeatureBad("teleport_git_bundle_upload", "admin_dir_failed");
    return {
      success: false,
      error:
        "Not uploading this working tree: its own path could not be resolved just now (a link on the way to it changed or could not be read), so nothing was uploaded this way; retry from the directory itself.",
      failReason: "refused",
    };
  }
  if (hasBackslash(rootPath)) return refuseBackslash();
  await using rootHolder = holdDirectory();
  let rootHolderId = hardened ? await holdIdOfPath(rootHolder, rootPath) : null;
  if (rootHolderId !== null && classifyIdentity(rootHolderId) === "none")
    logEvent("tengu_ccr_bundle_root_names_no_object", {
      device_zero: rootHolderId.startsWith("0:"),
    });
  let enclosingRepos = hardened ? findEnclosingRepos(rootPath) : [];
  let refusedRootKind = classifyBindingFolder(gitRoot, capability?.rootAnchors);
  if (refusedRootKind !== null) {
    logEvent("tengu_ccr_bundle_upload", {
      outcome: lit("refused_home_root"),
      root_kind: fromEnum(refusedRootKind),
      ...bindingFacts,
    });
    logFeatureBad("teleport_git_bundle_upload", "refused_home_root");
    return {
      success: false,
      error: GIT_ROOT_REFUSALS[refusedRootKind],
      failReason: "git_dir_tampered",
    };
  }
  let seedRefNames = createSeedRefNames();
  let seedRefNamesList = [seedRefNames.stash, seedRefNames.root];
  let signal = capability?.signal;
  let stepTimeout = hardened ? AbortSignal.timeout(BUNDLE_STEP_TIMEOUT_MS) : undefined;
  let now = Date.now();
  let signal_2 =
    stepTimeout === undefined
      ? signal
      : signal === undefined
        ? stepTimeout
        : AbortSignal.any([signal, stepTimeout]);
  let probes = new GitBinaryError("operation");
  let abortResult = (phase) => {
    let phaseTiming = {
      phase: fromEnum(phase),
      elapsed_ms: Date.now() - now,
    };
    if (signal?.aborted === true || stepTimeout?.aborted !== true) {
      logEvent("tengu_ccr_bundle_upload", {
        ...bindingFacts,
        outcome: lit("aborted"),
        current_branch_only: isCurrentBranchOnly,
        ...phaseTiming,
      });
      return {
        success: false,
        error: "Bundle cancelled",
      };
    }
    logEvent("tengu_ccr_bundle_upload", {
      ...bindingFacts,
      outcome: lit("build_budget_expired"),
      current_branch_only: isCurrentBranchOnly,
      ...phaseTiming,
    });
    logFeatureBad("teleport_git_bundle_upload", "build_budget_expired");
    return {
      success: false,
      error:
        "Preparing the upload took too long and was stopped (a file in this checkout that git reads, such as a .gitattributes, may be a pipe or otherwise blocking). Check the checkout, then retry.",
      failReason: "git_error",
    };
  };
  await using holder = holdDirectory();
  let layout = hardened
    ? await inspectGitLayout(gitRoot, signal_2, {
        linkedTrees: true,
        bound: isBound,
        startsInProject: capability?.startsInProject,
        perWorktreeConfig: "serve",
        probes,
        holder,
      })
    : undefined;
  if (hardened && signal_2?.aborted) return abortResult("layout_read");
  let folderComparison =
    layout?.kind === "read" ? compareWorkTree(layout.layout, rootPath, rootHolderId) : "the_same";
  if (folderComparison !== "the_same")
    return createAndUploadGitBundle_2({
      on: "root_at_layout_read",
      folderRead: folderComparison,
    });
  let linkedCheckoutDir =
    layout?.kind === "read" && layout.layout.checkout === "linked"
      ? checkoutDirOfGitDir(layout.layout.commonDir)
      : layout?.kind === "tampered" && isLinkedWorktreeGitDir(layout.gitDir)
        ? checkoutDirOfGitDir(dirname(dirname(layout.gitDir)))
        : null;
  let linkedEnclosingRepos = linkedCheckoutDir === null ? [] : findEnclosingRepos(linkedCheckoutDir);
  let enclosedRepos = normalizeCaseForComparison_2([...enclosingRepos, ...linkedEnclosingRepos]);
  let nestedReason =
    enclosingRepos[0] !== undefined
      ? nestedCheckoutReason(enclosingRepos[0])
      : linkedEnclosingRepos[0] !== undefined
        ? nestedRepoReason(linkedEnclosingRepos[0])
        : null;
  let homeCheckout = hardened && nestedReason === null ? enclosingCheckoutAboveHome(rootPath) : null;
  let homeReason =
    homeCheckout !== null
      ? `${homeInsideCheckoutPhrase(homeCheckout, rootPath)} and this checkout is inside it, so a Claude Code session started there can write this checkout\u2019s git files`
      : hardened && nestedReason === null && linkedCheckoutDir !== null
        ? homeContainsRepoReason(linkedCheckoutDir)
        : null;
  let worktreeConfig = layout?.kind === "read" ? layout.layout.worktreeConfig : undefined;
  let needsEnvScreen =
    isBound || nestedReason !== null || homeReason !== null || worktreeConfig !== undefined;
  if (layout?.kind === "tampered") {
    logForDebugging(`[gitBundle] Refusing to bundle: misplaced ${layout.misplaced}`);
    let layoutKind = misplacedKindForLog(layout.misplaced);
    let tamperOutcome = layoutKind === null ? "git_dir_tampered" : `unsupported_${layoutKind}`;
    let gitFileKind = layout.misplaced === "git_file" ? await classifyGitPointer(gitRoot) : null;
    let handBack =
      layoutKind === null || isBound || (!legacyFallbackOk && isUnuploadableLayout(layout))
        ? {
            handedBack: false,
            refusedAs: layout,
            notThePreviousWay: "",
          }
        : legacyFallbackOk
          ? await decideLegacyHandBack(rootPath, layout, nestedReason, homeReason)
          : {
              handedBack: true,
            };
    let handedBack = handBack.handedBack;
    let finding =
      handedBack && legacyFallbackOk
        ? findProtectedEnvSetting({
            workTree: gitRoot,
          })
        : null;
    if (finding !== null) {
      logEvent("tengu_ccr_bundle_upload", {
        ...bindingFacts,
        outcome: lit("admin_dir_failed"),
        steering: fromEnum(finding.kind),
        enclosed: enclosedRepos.length > 0,
      });
      logFeatureBad("teleport_git_bundle_upload", "admin_dir_failed");
      return {
        success: false,
        error: protectedEnvRefusal(finding),
        failReason: "refused",
      };
    }
    let reportedLayout = handBack.handedBack ? layout : handBack.refusedAs;
    logEvent("tengu_ccr_bundle_upload", {
      ...bindingFacts,
      outcome: fromEnum(tamperOutcome),
      tampered_on: fromEnum(reportedLayout.misplaced),
      ...(reportedLayout.unexamined && {
        unexamined: true,
      }),
      ...(reportedLayout.keptBy !== undefined && {
        refs_kept_by: fromEnum(reportedLayout.keptBy),
      }),
      ...(reportedLayout.writable !== undefined && {
        writable_config: fromEnum(reportedLayout.writable),
      }),
      ...(reportedLayout.includedBy !== undefined && {
        included_by: fromEnum(reportedLayout.includedBy),
      }),
      ...(reportedLayout.detail !== undefined && {
        worktree_check: fromEnum(reportedLayout.detail),
      }),
      ...(!handBack.handedBack &&
        handBack.screened !== undefined && {
          unlisted_config: fromEnum(handBack.screened),
        }),
      ...(!handBack.handedBack &&
        handBack.belowHomeCheckout === true && {
          below_home_checkout: true,
        }),
      ...(layoutKind !== null && {
        fallback_eligible: handedBack,
        ...(!isBound && {
          enclosed: enclosedRepos.length > 0,
        }),
      }),
      ...(gitFileKind !== null && {
        git_file_kind: fromEnum(gitFileKind),
      }),
    });
    if (handBack.handedBack && layoutKind !== null)
      return {
        ...unsupportedLayoutResult(layoutKind, misplacedRefusalMessage(misplacedSummary(layout))),
        ...(gitFileKind !== null && {
          gitFileKind,
        }),
      };
    logFeatureBad(
      "teleport_git_bundle_upload",
      reportedLayout.misplaced === "included_config" && reportedLayout.writable !== undefined
        ? `${tamperOutcome}_${reportedLayout.writable}${reportedLayout.includedBy === undefined ? "" : `_by_${reportedLayout.includedBy}`}`
        : reportedLayout.misplaced === "linked_worktree" && reportedLayout.detail !== undefined
          ? `${tamperOutcome}_${reportedLayout.detail}`
          : tamperOutcome,
    );
    return {
      success: false,
      error:
        misplacedRefusalMessage({
          ...misplacedSummary(reportedLayout),
          ...(isGitFileLayout(reportedLayout) && {
            dotGitEntry: await classifyDotGitEntry(rootPath),
          }),
        }) +
        (handBack.handedBack || !legacyFallbackOk || layoutKind === null || reportedLayout.unexamined
          ? ""
          : notPreviousWayNote(handBack.notThePreviousWay)),
      failReason: "git_dir_tampered",
    };
  }
  if (layout?.kind === "failed") {
    logForDebugging(`[gitBundle] could not read the checkout's git layout: ${layout.detail.slice(0, 200)}`);
    if (layout.why === "changed_under_hold")
      return createAndUploadGitBundle_2({
        on: "changed_under_hold",
        unopened: layout.unopened,
      });
    if (layout.why === "settings_unreadable") {
      logEvent("tengu_ccr_bundle_upload", {
        ...bindingFacts,
        outcome: lit("admin_dir_failed"),
        steering: lit("unreadable"),
      });
      logFeatureBad("teleport_git_bundle_upload", "admin_dir_failed");
      return {
        success: false,
        error: protectedEnvRefusal({
          kind: "unreadable",
        }),
        failReason: "refused",
      };
    }
    let gitNotFound = layout.why === "git_not_found";
    let changedUnderRead = layout.why === "changed_under_read";
    let layoutFailure = gitNotFound ? "git_not_on_path" : (layout.cause ?? "wip_unreadable");
    logEvent("tengu_ccr_bundle_upload", {
      ...bindingFacts,
      outcome: fromEnum(layoutFailure),
      ...(changedUnderRead && {
        changed_under_read: true,
      }),
      ...(gitNotFound &&
        isGitShimOnly() && {
          git_script_wrapper_only: true,
        }),
    });
    logFeatureBad("teleport_git_bundle_upload", layoutFailure);
    if (layout.cause !== undefined)
      return {
        success: false,
        error: GIT_REFUSAL_MESSAGES[layout.cause],
        failReason: "git_error",
      };
    return gitNotFound
      ? isBound
        ? {
            success: false,
            error: `Not uploading this working tree: git was not found on the PATH this process was started with once the directories a cloud session can write here were left out (those inside this checkout or a checkout enclosing it, such as a worktree\u2019s main checkout; those below your home directory when it is, or lies inside, a git checkout${describeHomeCheckout(rootPath)}; a session temp directory; or one whose git links into them). Install git outside those, or put that directory on PATH, then retry.${windowsGitDirNote()} ${UNEXAMINABLE_REACH_NOTE}`,
            failReason: "refused",
          }
        : {
            success: false,
            error: `git was not found on the PATH this process was started with, so nothing was uploaded. Install git, or put its directory on PATH, then retry.${windowsGitDirNote()}`,
            failReason: "git_error",
          }
      : changedUnderRead
        ? {
            success: false,
            error:
              "This linked worktree\u2019s git files, in its repository\u2019s .git directory, changed while they were being read (removed, moved or replaced meanwhile), so nothing was uploaded. Retry; if it keeps happening, check what else is changing that .git directory.",
            failReason: "git_error",
          }
        : {
            success: false,
            error:
              "Could not read where git keeps this checkout, so nothing was uploaded. Run `git rev-parse --git-dir --show-toplevel` here (it changes nothing) to see what git says, then retry.",
            failReason: "git_error",
          };
  }
  let layout_2 = layout?.layout;
  if (
    layout_2 !== undefined &&
    !hasOnlyKnownFilterDrivers(layout_2) &&
    findUnsupportedGitEnv(buildGitEnv(undefined)) === null
  ) {
    logEvent("tengu_ccr_bundle_upload", {
      ...bindingFacts,
      outcome: lit("ambiguous_filter_driver"),
    });
    logFeatureBad("teleport_git_bundle_upload", "ambiguous_filter_driver");
    return {
      success: false,
      error:
        'Not uploading this working tree: your git configuration defines a filter driver named "unset" or "unspecified" (a file your configuration includes counts too, even one included only for other repositories), and git reports files that use such a driver as having no filter, so they would be uploaded as they are on disk, without the filter. Nothing was uploaded. Rename the driver in your git configuration, and in any attributes file that uses it, then retry.',
      failReason: "refused",
    };
  }
  let isLinkedCheckout = layout_2?.checkout === "linked";
  let earlyFault = layout_2 ? await gitLayoutFaultOf(layout_2, seedRefNamesList) : null;
  if (earlyFault !== null)
    return createAndUploadGitBundle_2({
      on: "mid_build",
      fault: earlyFault,
    });
  let isPartialClone =
    layout_2 !== undefined && (await hasPartialCloneConfig(gitRoot, layout_2, signal_2, probes));
  if (hardened && signal_2?.aborted) return abortResult("promisor_probe");
  if (isPartialClone)
    logForDebugging(
      "[gitBundle] partial clone \u2014 bundling a snapshot of the working tree, without history",
    );
  let finding = needsEnvScreen && layout_2 !== undefined ? findProtectedEnvSetting(layout_2) : null;
  if (finding !== null) {
    logEvent("tengu_ccr_bundle_upload", {
      ...bindingFacts,
      outcome: lit("admin_dir_failed"),
      steering: fromEnum(finding.kind),
      steered_by: fromEnumOpt(
        finding.kind === "unreadable"
          ? undefined
          : PROTECTED_ENV_VARS_2.find((envVarName) => envVarName === finding.name.toUpperCase()),
      ),
    });
    logFeatureBad("teleport_git_bundle_upload", "admin_dir_failed");
    return {
      success: false,
      error: protectedEnvRefusal(finding),
      failReason: "refused",
    };
  }
  let refuseNamedStash = hardened || capability?.refuseCredentialNamedInStash === true;
  let bundleRootDir = refuseNamedStash ? resolveTempDir() : tmpdir();
  await using privateGitDir =
    layout_2 !== undefined
      ? await copyRepositoryForBuild(gitRoot, layout_2, signal_2, probes, "own")
      : undefined;
  if (privateGitDir?.kind === "failed") {
    if (signal_2?.aborted) return abortResult("admin_dir");
    logForDebugging(
      `[gitBundle] could not set up the private git dir: ${privateGitDir.detail.slice(0, 200)}`,
    );
    if (privateGitDir.cause === "attribute_source") {
      let { kind } = privateGitDir.source;
      logEvent("tengu_ccr_bundle_upload", {
        ...bindingFacts,
        outcome: lit("attribute_source_unread"),
        attribute_source: fromEnum(kind),
        linked_worktree: isLinkedCheckout,
      });
      logFeatureBad("teleport_git_bundle_upload", "attribute_source_unread");
      return {
        success: false,
        error: gitAttributesSettingRefusal(privateGitDir.source),
        failReason: "refused",
      };
    }
    logEvent("tengu_ccr_bundle_upload", {
      ...bindingFacts,
      outcome: lit("admin_dir_failed"),
      linked_worktree: isLinkedCheckout,
      admin_dir_reason: fromEnum(privateGitDir.reason),
      admin_dir_cause: fromEnum(privateGitDir.cause),
      ...(!isBound && {
        enclosed: enclosedRepos.length > 0,
      }),
    });
    logFeatureBad("teleport_git_bundle_upload", "admin_dir_failed");
    let privateDirDetail = truncateWithCount(replaceControlChars(privateGitDir.detail), MAX_DETAIL_CHARS);
    let notPreviousNote = !legacyFallbackOk
      ? ""
      : nestedReason !== null
        ? notPreviousWayNote(nestedReason)
        : worktreeConfig === "extension"
          ? notPreviousWayNote(
              "its repository has per-worktree configuration switched on (extensions.worktreeConfig, which git sparse-checkout sets)",
            )
          : worktreeConfig === "inert"
            ? notPreviousWayNote(
                "a per-worktree configuration file (config.worktree) stands in its administrative entry",
              )
            : isLinkedCheckout
              ? notPreviousWayNote("a linked working tree is uploaded under that private directory only")
              : "";
    return {
      success: false,
      error:
        privateGitDir.cause === "symbolic_head"
          ? `Not uploading this working tree: ${privateDirDetail}. Nothing was uploaded.${GIT_DIR_FILE_ADVICE.symbolic_head}`
          : privateGitDir.cause === "placement"
            ? `Not uploading this working tree this way: the private git directory the upload must trust would stand where a cloud session can write \u2014 ${privateDirDetail}. Nothing was uploaded; retry once that is changed.`
            : privateGitDir.cause === "home"
              ? `Could not prepare a private git directory for the upload (${privateDirDetail}), so nothing was uploaded. It is kept under your configuration home: check that ${displayName(privateGitDir.home)} is a writable directory of yours, and that ${displayName(join(privateGitDir.home, "seed-admin"))}, if it exists, is a directory only you can write. Look at it first: ls -ld, with no / after the name (tab completion adds one, and with it a link to a folder shows as a plain folder). A directory there holds scratch only and can be removed (rm -r, again with no /). A link or a file there is removed by its name (rm, with no -r and no / after the name). Then retry.${notPreviousNote}`
              : `Could not prepare a private git directory for the upload (${privateDirDetail}), so nothing was uploaded. The upload builds from private copies of this checkout\u2019s HEAD, index and refs, and copies them only when they are ordinary files (no links, one name each).${GIT_DIR_FILE_ADVICE[privateGitDir.cause]}${notPreviousNote}`,
      failReason: "refused",
    };
  }
  let configLevelRefusal = (stage) => {
    let configVar =
      layout_2 === undefined ? undefined : findOverriddenGitConfigVar(layout_2, probes.screenMemo);
    if (configVar === undefined) return null;
    logEvent("tengu_ccr_bundle_upload", {
      ...bindingFacts,
      outcome: lit("config_level_not_read"),
      config_level: fromEnum(configVar),
      config_level_asked: fromEnum(stage),
    });
    logFeatureBad("teleport_git_bundle_upload", "config_level_not_read");
    return {
      success: false,
      error: `Not uploading this working tree: ${configVar} names a git configuration file that a Claude Code session could change, so the git that this upload runs does not read it, and a file git would change before storing it (to encrypt it, for example) could be uploaded as it is on disk. Move its settings into ${configVar === "GIT_CONFIG_GLOBAL" ? "~/.gitconfig" : "git\u2019s default system file"} and remove ${configVar} from your shell or your Claude Code settings; or keep the file outside this checkout, any checkout around it or around your home directory, Claude Code\u2019s temp folder, and any folder that settings open to sessions. Then start Claude Code again.`,
      failReason: "refused",
    };
  };
  let preBuildRefusal = configLevelRefusal("before_build");
  if (preBuildRefusal !== null) return preBuildRefusal;
  if (layout_2 !== undefined && privateGitDir?.kind === "made")
    layout_2 = {
      ...layout_2,
      adminDir: privateGitDir.path,
      borrowedObjects: privateGitDir.borrowedObjects,
    };
  let faultBeforeStash = layout_2 ? await gitLayoutFaultOf(layout_2, seedRefNamesList) : null;
  if (faultBeforeStash !== null)
    return createAndUploadGitBundle_2({
      on: "mid_build",
      fault: faultBeforeStash,
    });
  if (!hardened) {
    let seedRefList = await listGitRefs(gitRoot, ["for-each-ref", "--format=%(refname)", "refs/seed/"], {
      hardened,
      probes,
    });
    if (seedRefList.code !== 0)
      logForDebugging(
        `[gitBundle] could not list refs/seed/ (${seedRefList.code}), so private refs a killed build left are not swept this run (the two fixed names still are): ${clipGitArgs(seedRefList.stderr, hardened)}`,
      );
    let staleRefs = normalizeCaseForComparison_2([
      REFS_SEED_STASH,
      REFS_SEED_ROOT,
      ...staleSeedRefs(
        seedRefList.code === 0
          ? seedRefList.stdout
              .split(
                `
`,
              )
              .filter((line) => line !== "")
          : [],
      ),
    ]);
    for (let refName of staleRefs) {
      let deleteResult = await updateRefCommand(gitRoot, ["-d", refName], {
        hardened,
        layout: undefined,
        probes,
      });
      if (deleteResult.code !== 0)
        logForDebugging(`[gitBundle] could not sweep a stale seed ref: ${deleteResult.stderr.slice(0, 200)}`);
    }
  }
  let headProbe = await listGitRefs(gitRoot, ["rev-parse", "--verify", "--quiet", "HEAD"], {
    hardened,
    layout: layout_2,
    probes,
    ...(hardened && {
      signal: signal_2,
    }),
  });
  let headResolves = headProbe.code === 0;
  let headUnborn = headProbe.exitCode === 1;
  let headSilent = headProbe.exitCode === undefined && headProbe.stderr === "";
  let refProbe = await listGitRefs(gitRoot, ["for-each-ref", "--count=1", "refs/heads/", "refs/tags/"], {
    hardened,
    layout: layout_2,
    probes,
    ...(hardened && {
      signal: signal_2,
    }),
  });
  if (hardened && signal_2?.aborted) return abortResult("ref_probe");
  if (refProbe.code === 0 && refProbe.stdout.trim() === "" && !headResolves) {
    logEvent("tengu_ccr_bundle_upload", {
      ...bindingFacts,
      outcome: lit("empty_repo"),
      current_branch_only: isCurrentBranchOnly,
    });
    logFeatureBad("teleport_git_bundle_upload", "empty_repo");
    return {
      success: false,
      error: "Repository has no local branch, tag, or checkout to seed from yet",
      advice: COMMIT_FILES_ADVICE,
      failReason: "empty_repo",
    };
  }
  let unbornState =
    headUnborn && !isCurrentBranchOnly
      ? await (async () => {
          let gitOptions = {
            hardened,
            layout: layout_2,
            probes,
            signal: signal_2,
            ...(!hardened && {
              env: {
                ...GIT_LIST_ENV,
                GIT_NO_LAZY_FETCH: "1",
                ...indexFileEnv(capability?.pinnedIndexFile),
              },
            }),
          };
          let configArgs = hardened ? [] : GIT_READ_CONFIG_ARGS;
          let emptyTree = await listGitRefs(
            gitRoot,
            [...configArgs, "hash-object", "-t", "tree", "--stdin"],
            {
              ...gitOptions,
              input: "",
            },
          );
          let refTips = await listGitRefs(
            gitRoot,
            [
              ...configArgs,
              "for-each-ref",
              `--count=${MAX_CHECKED_COMMITS + 1}`,
              "--sort=-creatordate",
              "--format=%(if)%(*objecttype)%(then)%(*objecttype)%(else)%(objecttype)%(end) %(objectname)",
              "refs/heads/",
              "refs/tags/",
            ],
            gitOptions,
          );
          let treeMatchesIndex = async (extraArgs) => {
            let diffResult = await listGitRefs(gitRoot, [...configArgs, ...extraArgs], gitOptions);
            return diffResult.exitCode === 1
              ? true
              : diffResult.exitCode === 0 || diffResult.code === 0
                ? false
                : null;
          };
          let matchesTree = (treeish) =>
            treeMatchesIndex([
              "diff-index",
              "--cached",
              "--quiet",
              "--ita-invisible-in-index",
              treeish,
              "--",
            ]);
          let commits =
            refTips.code === 0
              ? refTips.stdout
                  .split(
                    `
`,
                  )
                  .flatMap((line) => {
                    let [objectType, objectSha] = line.split(" ");
                    return objectType === "commit" && objectSha !== undefined ? [objectSha] : [];
                  })
              : null;
          let emptyIndexMatch = emptyTree.code === 0 ? await matchesTree(emptyTree.stdout.trim()) : null;
          let allMatch = async (remaining) => {
            if (remaining.length === 0) return false;
            let matchResult = await matchesTree(`${remaining[0]}^{tree}`);
            return matchResult === null ? null : matchResult ? allMatch(remaining.slice(1)) : true;
          };
          if (emptyIndexMatch === false) return "empty";
          if (emptyIndexMatch === null || commits === null) return "unread";
          let commitsMatch = await allMatch(commits.slice(0, MAX_CHECKED_COMMITS));
          if (!commitsMatch)
            return commitsMatch === null
              ? "unread"
              : commits.length > MAX_CHECKED_COMMITS
                ? "over_cap"
                : "off_branch";
          let worktreeMatch = await treeMatchesIndex([
            "--no-optional-locks",
            "diff-files",
            "--quiet",
            IGNORE_SUBMODULES_DIRTY_FLAG,
          ]);
          return worktreeMatch === null ? "worktree_unread" : worktreeMatch ? "unstaged" : "on_branch";
        })()
      : undefined;
  if (signal_2?.aborted) return abortResult("ref_probe");
  if (
    unbornState === "off_branch" ||
    unbornState === "over_cap" ||
    unbornState === "unstaged" ||
    unbornState === "unread" ||
    unbornState === "worktree_unread"
  ) {
    logEvent("tengu_ccr_bundle_upload", {
      ...bindingFacts,
      outcome: lit("empty_repo"),
      current_branch_only: isCurrentBranchOnly,
      unborn_staged: unbornState !== "unstaged" && unbornState !== "worktree_unread",
      unborn_index: fromEnum(unbornState),
    });
    logFeatureBad("teleport_git_bundle_upload", "empty_repo");
    return {
      success: false,
      error: "The current branch has no commits yet",
      advice: COMMIT_CHANGED_FILES_ADVICE,
      failReason: "empty_repo",
    };
  }
  let unsafeNameCount = 0;
  let wipStash = layout_2
    ? await captureWipStash(gitRoot, layout_2, {
        signal: signal_2,
        probes,
        onNamesWindowsCannotHold: (count) => {
          unsafeNameCount = count;
        },
        onOpenRefusedAtTheLook: (files) => {
          logEvent("tengu_ccr_bundle_look_open_refused", {
            files,
          });
        },
        leaveOutUncommittedCredentialFiles: true,
        alsoLeaveOut: await combinePathMatchers(capability?.withholdFor, gitRoot, layout_2.workTree),
        neverRead: await combinePathMatchers(capability?.neverReadFor, gitRoot, layout_2.workTree),
        maxStagedBytes: 2 * bundleMaxBytes(),
      })
    : await createStashCommit(gitRoot, headResolves || headSilent, signal_2, capability?.pinnedIndexFile);
  let uploadFacts =
    unsafeNameCount > 0
      ? {
          ...bindingFacts,
          names_windows_cannot_hold: unsafeNameCount,
        }
      : bindingFacts;
  if (signal_2?.aborted) return abortResult("wip_stash");
  if (
    wipStash.kind === "created" &&
    layout_2 === undefined &&
    capability?.refuseCredentialNamedInStash === true
  ) {
    let paths = await isFileDeleted(
      gitRoot,
      wipStash.commit,
      signal_2,
      await capability?.withholdFor?.(gitRoot),
    );
    if (signal_2?.aborted) return abortResult("wip_stash");
    if (paths === null || paths.length > 0) {
      logEvent("tengu_ccr_bundle_upload", {
        ...uploadFacts,
        outcome: lit("uncommitted_credentials"),
        refused_paths: paths?.length ?? 0,
        refused_unexamined: countWhere(paths ?? [], ({ why }) => why === "unexamined"),
        refused_on: lit("stash_trees"),
      });
      logFeatureBad("teleport_git_bundle_upload", "uncommitted_credentials");
      return {
        success: false,
        error:
          paths === null
            ? "Not uploading this working tree: the uncommitted changes just captured could not be listed back, so they cannot be checked for files that must stay on this machine \u2014 retry."
            : changedPathsRefusal(paths, capability?.withholdFor !== undefined),
        failReason: "uncommitted_credentials",
      };
    }
  }
  if (wipStash.kind === "refused") {
    logForDebugging(
      `[gitBundle] Refusing to stash: ${wipStash.refused.length} forged path(s), or credential-named path(s) that reached a built tree`,
    );
    logEvent("tengu_ccr_bundle_upload", {
      ...uploadFacts,
      outcome: lit("uncommitted_credentials"),
      credential_paths: wipStash.refused.length,
      refused_on: fromEnum(wipStash.decidedOn),
    });
    logFeatureBad("teleport_git_bundle_upload", "uncommitted_credentials");
    return {
      success: false,
      error: changedPathsRefusal(wipStash.refused, capability?.withholdFor !== undefined),
      failReason: "uncommitted_credentials",
    };
  }
  if (wipStash.kind === "failed" && wipStash.step === "path-encoding") {
    logEvent("tengu_ccr_bundle_upload", {
      ...uploadFacts,
      outcome: lit("wip_path_encoding"),
    });
    logFeatureBad("teleport_git_bundle_upload", "wip_path_encoding");
    let encodingError =
      "A changed file in this checkout has a name \u2014 or a changed symbolic link a target \u2014 that is not valid UTF-8, which this upload cannot carry yet. Commit or rename it, then retry.";
    return {
      success: false,
      error: encodingError,
      advice: encodingError,
      failReason: "stash_failed",
    };
  }
  if (
    wipStash.kind === "failed" &&
    (wipStash.step === "verify" || wipStash.step === "refused-name" || wipStash.step === "rewritten")
  ) {
    logForDebugging(
      `[gitBundle] the checkout's git directory holds what git never wrote (${wipStash.step}): ${wipStash.detail.slice(0, 200)}`,
    );
    logEvent("tengu_ccr_bundle_upload", {
      ...uploadFacts,
      outcome: lit("wip_tampered"),
      wip_step: fromEnum(wipStash.step),
    });
    logFeatureBad("teleport_git_bundle_upload", "wip_tampered");
    return {
      success: false,
      error:
        wipStash.step === "verify"
          ? "Not uploading this working tree: its git directory holds an object that is not what its id names \u2014 something other than git wrote it there (`git fsck` usually names it). Nothing was uploaded; repair or re-clone the repository, then retry."
          : wipStash.step === "rewritten"
            ? "Not uploading this working tree: the scratch copy of the index this upload works in was changed by another process while the upload ran. Nothing was uploaded; retry, and if it recurs check what else is running in this checkout."
            : `Not uploading this working tree: its git index names a path git itself refuses to write (a ".git"-like or "git~1" name) \u2014 something other than git put it there. ${DO_NOT_RUN_GIT_USE_ADVICE}`,
      failReason: "git_dir_tampered",
    };
  }
  if (wipStash.kind === "failed" && wipStash.step === "malformed-tree") {
    logForDebugging(
      `[gitBundle] a committed tree is stored in a form git no longer writes: ${wipStash.detail.slice(0, 200)}`,
    );
    logEvent("tengu_ccr_bundle_upload", {
      ...uploadFacts,
      outcome: lit("wip_legacy_tree"),
    });
    logFeatureBad("teleport_git_bundle_upload", "wip_legacy_tree");
    let legacyTreeAdvice = `the committed tree for ${formatDirectoryLabel(wipStash.detail)} is stored in a form git reads but does not itself write (some old tools wrote trees this way: entries out of order, or an unknown file mode). Commit a change to any file ${wipStash.detail === "" ? "at the top of the checkout" : "in that directory"} so git rewrites the tree, then retry.`;
    return {
      success: false,
      error: `Not uploading this working tree: ${legacyTreeAdvice}`,
      advice: legacyTreeAdvice,
      failReason: "stash_failed",
    };
  }
  if (wipStash.kind === "failed" && PROBE_GIT_STEPS.includes(wipStash.step)) {
    logForDebugging(
      `[gitBundle] could not read the checkout's uncommitted state (git ${wipStash.step}): ${wipStash.detail.slice(0, 200)}`,
    );
    logEvent("tengu_ccr_bundle_upload", {
      ...uploadFacts,
      outcome: lit("wip_unreadable"),
    });
    logFeatureBad("teleport_git_bundle_upload", "wip_unreadable");
    return {
      success: false,
      error:
        "Could not read the uncommitted changes of this checkout with git before uploading them (HEAD or the index is not in a state git reports on cleanly), so nothing was uploaded. Check `git status` here, then retry.",
      failReason: "git_error",
    };
  }
  if (
    wipStash.kind === "failed" &&
    (wipStash.step === "write-tree" || wipStash.step === "read-tree") &&
    isPartialClone &&
    wipStash.said === "object_missing"
  ) {
    logEvent("tengu_ccr_bundle_upload", {
      ...uploadFacts,
      outcome: lit("stash_failed"),
      wip_step: fromEnum(wipStash.step),
      current_branch_only: isCurrentBranchOnly,
      partial_clone: true,
    });
    logFeatureBad("teleport_git_bundle_upload", "stash_failed");
    return {
      success: false,
      error: PARTIAL_CLONE_REFUSAL,
      failReason: "git_error",
    };
  }
  if (wipStash.kind === "failed") {
    logForDebugging(
      `[gitBundle] could not capture uncommitted changes (git ${wipStash.step}): ${wipStash.detail.slice(0, 200)}`,
    );
    logEvent("tengu_ccr_bundle_upload", {
      ...uploadFacts,
      outcome: lit("stash_failed"),
      wip_step: fromEnum(wipStash.step),
      ...(wipStash.silent && {
        wip_silent: true,
      }),
      ...(wipStash.said !== undefined && {
        git_said: fromEnum(wipStash.said),
      }),
      current_branch_only: isCurrentBranchOnly,
    });
    logFeatureBad("teleport_git_bundle_upload", "stash_failed");
    let stashDetail = hardened
      ? truncateWithCount(replaceControlChars(wipStash.detail), MAX_DETAIL_CHARS)
      : wipStash.detail;
    let stashHint =
      wipStash.said === "unmerged"
        ? "This checkout has an unfinished merge or rebase (git status lists the conflicted files): resolve or abort it here first, or start the session from a branch with --ref."
        : wipStash.said === "index_locked"
          ? "Another git process is running in this checkout; retry in a moment."
          : wipStash.said === "object_missing"
            ? "Retry; if it stops here again, run `git fsck` in this checkout."
            : undefined;
    let stashAdvice = !hardened
      ? wipStash.silent
        ? "Retry; if it stops here again, run `git --version` here to see whether git starts."
        : (stashHint ?? COMMIT_CHANGED_FILES_ADVICE)
      : wipStash.step === "scratch-index"
        ? "A scratch copy of the index could not be written (next to .git/index, under ~/.claude/seed-admin, or under the temporary directory); check the disk and permissions there, then retry."
        : wipStash.step === "stage"
          ? "A changed file could not be copied for upload as it stands (too large in total, still being written, or not a plain file); commit or stash such files, then retry. If nothing here is really uncommitted (a copied or restored checkout), run git status once so git refreshes its index, then retry."
          : wipStash.step === "check-attr"
            ? wipStash.detail === HEAD_UNVERIFIABLE_TEXT
              ? unsafeNameCount > 0
                ? windowsUnsafeNamesAdvice(unsafeNameCount)
                : "HEAD's .gitattributes rules could not be read reliably: retry first. If it stops here again, save each committed .gitattributes above a changed file as plain UTF-8 text with no byte-order mark (one saved as UTF-16 stops it, for example, and so does one that git lists as a submodule) and commit that; or commit all your changes; or check the repository's objects (git fsck)."
              : "The attributes in force could not be vouched for: in .git/info/attributes, move any filter rules, attribute macros or quoted patterns into a .gitattributes file and shorten any line of 2,048 bytes or more (or remove .git/info/attributes), or commit your changes first, then retry."
            : (stashHint ??
              (unsafeNameCount > 0
                ? windowsUnsafeNamesAdvice(unsafeNameCount)
                : COMMIT_CHANGED_FILES_ADVICE));
    return {
      success: false,
      error: `Could not capture uncommitted changes (git ${wipStash.step}: ${stashDetail}). ${stashAdvice}`,
      advice: stashAdvice,
      failReason: "stash_failed",
    };
  }
  let hasWip = wipStash.kind === "created";
  let leftOutPaths =
    wipStash.kind === "created" || wipStash.kind === "none"
      ? wipStash.leftOut.map(({ path }) => path).sort()
      : [];
  let leftOutUnstable =
    wipStash.kind === "created" || wipStash.kind === "none"
      ? countWhere(wipStash.leftOut, ({ why }) => why === "unstable")
      : 0;
  let deletedUnstaged = wipStash.kind === "created" ? [...wipStash.deletedUnstaged].sort() : [];
  if (leftOutPaths.length > 0)
    logForDebugging(
      `[gitBundle] ${leftOutPaths.length} uncommitted path(s) kept out of the WIP commit (credential-named, hard-linked, filtered, or changed while read)`,
    );
  if (hasWip) {
    logForDebugging(`[gitBundle] Captured WIP as stash ${wipStash.commit}`);
    let faultAfterStash = layout_2 ? await gitLayoutFaultOf(layout_2, seedRefNamesList) : null;
    if (faultAfterStash !== null)
      return createAndUploadGitBundle_2({
        on: "mid_build",
        fault: faultAfterStash,
      });
    let seedRefWrite = await updateRefCommand(gitRoot, [seedRefNames.stash, wipStash.commit], {
      hardened,
      layout: layout_2,
      probes,
      ...(hardened && {
        signal: signal_2,
      }),
    });
    if (seedRefWrite.code !== 0)
      return signal_2?.aborted
        ? abortResult("seed_refs")
        : seedRefHeldFailure(seedRefWrite.stderr, layout_2?.adminDir, uploadFacts, {
            held_ref: lit("stash"),
            git_exit_code: seedRefWrite.code,
          });
  }
  let bundleDir = null;
  let bundlePath = refuseNamedStash ? "" : generateTempFilePath("ccr-seed", ".bundle");
  try {
    if (refuseNamedStash) {
      try {
        bundleDir = await createBundleOutput("claude-seed", bundleRootDir);
      } catch (error) {
        logForDebugging(`[gitBundle] no private bundle directory: ${errorMessage(error)}`);
        logEvent("tengu_ccr_bundle_upload", {
          ...uploadFacts,
          outcome: lit("git_error"),
          current_branch_only: isCurrentBranchOnly,
        });
        logFeatureBad("teleport_git_bundle_upload", "git_error");
        return {
          success: false,
          error: "Could not create a private directory for the bundle.",
          failReason: "git_error",
        };
      }
      bundlePath = bundleDir.path;
    }
    let relabelledPath = `${bundlePath}.relabelled`;
    let maxBytes = bundleMaxBytes();
    let shallowState = await detectShallowState(
      gitRoot,
      signal_2,
      layout_2
        ? {
            layout: layout_2,
          }
        : null,
      probes,
    );
    if (shallowState !== "not_shallow")
      logForDebugging(`[gitBundle] shallow repository: ${SHALLOW_STATE_MESSAGES[shallowState]}`);
    let now = Date.now();
    let bundleResult =
      shallowState === "unborn_cut"
        ? {
            ok: false,
            error:
              "The current branch has no commits yet, and the other branches of this shallow clone are cut short, so nothing here can be bundled; commit first, or deepen the clone (git fetch --unshallow)",
            failReason: "empty_repo",
          }
        : await _bundleWithFallback(gitRoot, bundlePath, {
            maxBytes,
            seedRefs: seedRefNames,
            relabelledPath,
            hasStash: hasWip,
            ...(wipStash.kind === "created" && {
              stashCommit: wipStash.commit,
            }),
            leftOutCount: leftOutPaths.length,
            withheldByRules: capability?.withholdFor !== undefined,
            currentBranchOnly: isCurrentBranchOnly,
            headResolves,
            hardened,
            layout: layout_2,
            signal: signal_2,
            probes,
            baseRef: capability?.baseRef,
            forceScope: isPartialClone || shallowState === "cut" ? "squashed" : capability?.forceScope,
            partialClone: isPartialClone,
            skipAllRefs: shallowState === "complete" || shallowState === "cut",
            bindJudgedStash: capability?.refuseCredentialNamedInStash === true,
          });
    if (!bundleResult.ok) {
      if (hardened && signal_2?.aborted) return abortResult("bundle_create");
      logForDebugging(`[gitBundle] ${bundleResult.error}`);
      let userAborted = signal?.aborted === true;
      let failureKind = bundleResult.heldSeedRef
        ? "seed_ref_held"
        : bundleResult.refsChanged
          ? "bundle_refs_changed"
          : (bundleResult.gitRefused ?? bundleResult.failReason);
      let layoutFault =
        failureKind === "git_dir_tampered" && layout_2 !== undefined
          ? await gitLayoutFaultOf(layout_2, seedRefNamesList)
          : null;
      let outcome = layoutFault ?? failureKind;
      logEvent("tengu_ccr_bundle_upload", {
        ...uploadFacts,
        outcome: userAborted ? lit("aborted") : fromEnum(outcome),
        max_bytes: maxBytes,
        size_bytes: bundleResult.sizeBytes,
        current_branch_only: isCurrentBranchOnly,
        ...(bundleResult.failReason === "git_dir_tampered" && {
          tampered_on: lit("mid_build"),
        }),
        ...(bundleResult.heldSeedRef !== undefined && {
          held_ref: lit("root"),
          git_exit_code: bundleResult.heldSeedRef.exitCode,
        }),
        ...(bundleResult.promisorFallback && {
          promisor_fallback: true,
        }),
        ...(bundleResult.failReason === "git_error" &&
          isGitShimOnly() && {
            git_script_wrapper_only: true,
          }),
        shallow_repository: shallowState !== "not_shallow",
        shallow_head: shallowState === "cut",
        build_ms: Date.now() - now,
      });
      if (!userAborted) logFeatureBad("teleport_git_bundle_upload", outcome);
      return {
        success: false,
        error: layoutFault === null ? bundleResult.error : TAMPER_MESSAGES[layoutFault],
        ...(bundleResult.failReason === "empty_repo" &&
          shallowState !== "unborn_cut" && {
            advice: COMMIT_CHANGED_FILES_ADVICE,
          }),
        failReason: bundleResult.failReason,
      };
    }
    if (capability?.signal?.aborted) {
      logEvent("tengu_ccr_bundle_upload", {
        ...uploadFacts,
        outcome: lit("aborted"),
        max_bytes: maxBytes,
        current_branch_only: isCurrentBranchOnly,
        build_ms: Date.now() - now,
      });
      return {
        success: false,
        error: "Bundle cancelled",
      };
    }
    logEvent("tengu_ccr_bundle_built", {
      scope: fromEnum(bundleResult.scope),
      size_bytes: bundleResult.size,
      has_wip: hasWip,
      current_branch_only: isCurrentBranchOnly,
      build_ms: Date.now() - now,
    });
    capability?.onBundled?.({
      sizeBytes: bundleResult.size,
      scope: bundleResult.scope,
    });
    let bundleContent;
    let checkMs;
    if (refuseNamedStash) {
      let bundleFile = await readBundleFileSafely(bundleResult.path, maxBytes);
      if (bundleFile.kind !== "read") {
        let readBackDetail =
          bundleFile.kind === "too_large"
            ? `bundle grew to ${bundleFile.sizeBytes} bytes`
            : bundleFile.detail;
        logForDebugging(`[gitBundle] bundle unreadable after create: ${readBackDetail}`);
        logEvent("tengu_ccr_bundle_upload", {
          ...uploadFacts,
          outcome: lit("git_error"),
          max_bytes: maxBytes,
          current_branch_only: isCurrentBranchOnly,
        });
        logFeatureBad("teleport_git_bundle_upload", "git_error");
        return {
          success: false,
          error: `The bundle could not be read back for upload (${truncateWithCount(replaceControlChars(readBackDetail), 200)}).`,
          failReason: "git_error",
        };
      }
      bundleContent = bundleFile.content;
    }
    let preUploadRefusal = configLevelRefusal("before_upload");
    if (preUploadRefusal !== null) return preUploadRefusal;
    if (bundleContent !== undefined) {
      let now = Date.now();
      let checkResult = await verifyBundleFile(
        bundleContent,
        {
          scratchRoot: dirname(bundleResult.path),
        },
        (args, runOptions) =>
          listGitRefs(gitRoot, args, {
            hardened,
            layout: layout_2,
            probes,
            signal,
            ...runOptions,
          }),
      );
      checkMs = Date.now() - now;
      if (!checkResult.ok) {
        if (signal?.aborted) return abortResult("bundle_check");
        logForDebugging(
          `[gitBundle] the bundle failed its check (${checkResult.kind}): ${checkResult.detail}`,
        );
        let checkFailure = bundleReadBackFailure(
          checkResult.kind,
          truncateWithCount(replaceControlChars(checkResult.detail), 200),
        );
        logEvent("tengu_ccr_bundle_upload", {
          ...uploadFacts,
          outcome: fromEnum(checkFailure.outcome),
          check_failure: fromEnum(checkResult.kind),
          check_ms: checkMs,
          size_bytes: bundleResult.size,
          scope: fromEnum(bundleResult.scope),
          current_branch_only: isCurrentBranchOnly,
          has_wip: hasWip,
          ...(bundleResult.promisorFallback && {
            promisor_fallback: true,
          }),
          shallow_repository: shallowState !== "not_shallow",
          shallow_head: shallowState === "cut",
        });
        logFeatureBad("teleport_git_bundle_upload", checkFailure.outcome);
        return {
          success: false,
          error: checkFailure.error,
          failReason: checkFailure.failReason,
        };
      }
    }
    if (!hardened && capability?.refuseCredentialNamedInStash === true) {
      let plantedObjectStore = await findPlantedObjectStore(gitRoot);
      if (plantedObjectStore !== null) {
        logEvent("tengu_ccr_bundle_upload", {
          ...uploadFacts,
          outcome: lit("hand_back_store_planted"),
          tampered_on: fromEnum(plantedObjectStore),
        });
        logFeatureBad("teleport_git_bundle_upload", "hand_back_store_planted");
        return {
          success: false,
          error:
            plantedObjectStore === "unreadable"
              ? "Not uploading this working tree: its git directory could not be re-read after the capture ran, so what was packed cannot be vouched for. Inspect the checkout\u2019s .git, then retry."
              : plantedObjectStore === "common_dir"
                ? "Not uploading this working tree: a commondir file appeared in its git directory while the upload was prepared \u2014 git writes one only in a linked working tree\u2019s entry \u2014 so what was packed cannot be vouched for. Inspect the git directory, then retry."
                : `Not uploading this working tree: ${plantedObjectStore === "borrowed_objects" ? "an objects/info/alternates file" : "a reftable directory"} appeared in its git directory while the upload was prepared, so what was packed may hold another repository\u2019s history. ${DO_NOT_RUN_GIT_USE_ADVICE}`,
          failReason: "git_dir_tampered",
        };
      }
    }
    let now_2 = Date.now();
    let uploadResult = await uploadFileFromPath(bundleResult.path, "_source_seed.bundle", options, {
      signal,
      ...(bundleContent !== undefined && {
        content: bundleContent,
      }),
      expiresInSeconds: UPLOAD_URL_EXPIRES_SECONDS,
    });
    let uploadMs = Date.now() - now_2;
    if (!uploadResult.success) {
      let uploadAborted = capability?.signal?.aborted === true;
      logEvent("tengu_ccr_bundle_upload", {
        ...uploadFacts,
        outcome: uploadAborted ? lit("aborted") : lit("failed"),
        upload_error_type: fromEnum(uploadResult.reason),
        size_bytes: bundleResult.size,
        scope: fromEnum(bundleResult.scope),
        current_branch_only: isCurrentBranchOnly,
        ...(bundleResult.promisorFallback && {
          promisor_fallback: true,
        }),
        shallow_repository: shallowState !== "not_shallow",
        shallow_head: shallowState === "cut",
        upload_ms: uploadMs,
      });
      if (!uploadAborted) logFeatureBad("teleport_git_bundle_upload", "upload_failed");
      return {
        success: false,
        error: uploadResult.error,
        failReason: "upload_failed",
      };
    }
    logForDebugging(`[gitBundle] Uploaded ${uploadResult.size} bytes`);
    logEvent("tengu_ccr_bundle_upload", {
      ...uploadFacts,
      outcome: lit("success"),
      size_bytes: uploadResult.size,
      scope: fromEnum(bundleResult.scope),
      has_wip: hasWip,
      current_branch_only: isCurrentBranchOnly,
      ...(unbornState !== undefined && {
        unborn_index: fromEnum(unbornState),
      }),
      ...(hardened && {
        credential_paths_left_out: leftOutPaths.length,
        left_out_unstable: leftOutUnstable,
        deleted_unstaged: deletedUnstaged.length,
        partial_clone: isPartialClone,
        withhold_rules: capability?.withholdFor !== undefined,
        linked_worktree: layout_2?.checkout === "linked",
        ...(layout_2?.workTreeRespelled && {
          work_tree_respelled: true,
        }),
        ...(layout_2?.worktreeConfig === "inert" && {
          worktree_check: lit("inert_config"),
        }),
        private_admin_dir: layout_2?.adminDir !== undefined,
      }),
      ...(bundleResult.promisorFallback && {
        promisor_fallback: true,
      }),
      shallow_repository: shallowState !== "not_shallow",
      shallow_head: shallowState === "cut",
      upload_ms: uploadMs,
      ...(checkMs !== undefined && {
        check_ms: checkMs,
      }),
      ...false,
    });
    if (bundleResult.scope === "head" && !isCurrentBranchOnly)
      logFeatureSad("teleport_git_bundle_upload", "fallback_head");
    else if (bundleResult.scope === "squashed")
      logFeatureSad("teleport_git_bundle_upload", "fallback_squashed");
    else logFeatureOk("teleport_git_bundle_upload");
    logBundleStartLocation(classifyCheckoutStart(layout_2));
    return {
      success: true,
      fileId: uploadResult.fileId,
      bundleSizeBytes: uploadResult.size,
      scope: bundleResult.scope,
      hasWip,
      ...(hardened && {
        leftOut: leftOutPaths,
        ...(deletedUnstaged.length > 0 && {
          deletedHere: deletedUnstaged,
        }),
        ...(bundleResult.scope === "squashed"
          ? {
              seedCommit: bundleResult.rootCommit,
            }
          : wipStash.kind === "created" && {
              seedCommit: wipStash.commit,
            }),
      }),
    };
  } finally {
    if (bundlePath !== "") {
      try {
        await unlink(bundlePath);
      } catch {
        logForDebugging(`[gitBundle] Could not delete ${bundlePath} (non-fatal)`);
      }
      await unlink(`${bundlePath}.lock`).catch(() => {});
      await unlink(`${bundlePath}.relabelled`).catch(() => {});
    }
    await bundleDir?.dispose();
    if (!layout_2 || (await isGitLayoutUntampered(layout_2, seedRefNamesList)))
      for (let refName of seedRefNamesList)
        await updateRefCommand(gitRoot, ["-d", refName], {
          hardened,
          layout: layout_2,
          probes,
        });
  }
}
//@ chunk-sfy2wa1e.js:166998-167152 placement
async function hasPartialCloneConfig(cwd, layout, signal, probes) {
  let result = await listGitRefs(cwd, ["config", "-z", "--list"], {
    hardened: true,
    layout,
    signal,
    probes,
  });
  if (result.code !== 0) return true;
  return configListHasPartialClone(result.stdout);
}
//@ chunk-sfy2wa1e.js:167152-167450 placement
function configListHasPartialClone(stdout) {
  return stdout.split("\x00").some((line) => {
    let index = line.indexOf(`
`);
    let key = index === -1 ? line : line.slice(0, index);
    let value = index === -1 ? "true" : line.slice(index + 1);
    return (
      key === "extensions.partialclone" ||
      /^remote\..*\.partialclonefilter$/s.test(key) ||
      (/^remote\..*\.promisor$/s.test(key) && !["false", "no", "off", "0", ""].includes(value.toLowerCase()))
    );
  });
}
//@ chunk-sfy2wa1e.js:167450-167517 placement
function updateRefCommand(cwd, args, opts) {
  return listGitRefs(cwd, ["update-ref", "--no-deref", ...args], opts);
}
//@ chunk-sfy2wa1e.js:167517-167736 placement
var COMMIT_FILES_ADVICE =
  'Commit the files that you want the cloud session to see (git add <file>, then git commit -m "initial"), then retry.';
var COMMIT_CHANGED_FILES_ADVICE =
  "Commit the files that you changed by name (git add <file>, then git commit), then retry.";
//@ chunk-sfy2wa1e.js:167736-167995 placement
function windowsUnsafeNamesAdvice(fileCount) {
  return `${COMMIT_CHANGED_FILES_ADVICE} Do not run \`git add .\` or \`git commit -a\` here: this checkout tracks ${fileCount} file ${fileCount === 1 ? "name" : "names"} that Windows cannot hold, which git lists as deleted, and either command would record the ${fileCount === 1 ? "deletion" : "deletions"}.`;
}
//@ chunk-sfy2wa1e.js:167995-168089 placement
async function holdIdOfPath(holder, path) {
  let hold = await holder.hold(path);
  return hold === "not_held" ? getFileIdentity_2(path) : hold === "gone" ? null : hold.id;
}
//@ chunk-sfy2wa1e.js:168089-168227 placement
async function combinePathMatchers(exclude, path, workTree) {
  if (exclude === undefined) return;
  let results = await Promise.all(
    (toPosixSpelling(path) === workTree ? [path] : [path, workTree]).map((spelling) => exclude(spelling)),
  );
  return (matcher) => results.some((matcher_2) => matcher_2(matcher));
}
//@ chunk-sfy2wa1e.js:168227-168664 placement
function createAndUploadGitBundle_2(fault) {
  let wipStashSha =
    fault.on === "mid_build"
      ? fault.fault
      : fault.on === "root_at_layout_read"
        ? "work_tree_replaced"
        : "git_dir_tampered";
  let tamperMessage = TAMPER_MESSAGES[wipStashSha];
  logForDebugging(`[gitBundle] ${tamperMessage}`);
  logEvent("tengu_ccr_bundle_upload", {
    hardened: true,
    outcome: fromEnum(wipStashSha),
    tampered_on: fromEnum(fault.on),
    ...(fault.on === "changed_under_hold" && {
      hold_unopened: fault.unopened,
    }),
    ...(fault.on === "root_at_layout_read" && {
      folder_read: fromEnum(fault.folderRead),
    }),
  });
  logFeatureBad("teleport_git_bundle_upload", wipStashSha);
  return {
    success: false,
    error: tamperMessage,
    failReason: "git_dir_tampered",
  };
}
//@ chunk-sfy2wa1e.js:168664-168840 placement
function seedRefHeldFailure(stderr, privateGitDir, facts, eventFields) {
  let detail = seedRefWriteFailure(stderr, privateGitDir);
  logEvent("tengu_ccr_bundle_upload", {
    ...facts,
    outcome: lit("seed_ref_held"),
    ...eventFields,
  });
  logFeatureBad("teleport_git_bundle_upload", "seed_ref_held");
  return {
    success: false,
    ...detail,
  };
}
//@ chunk-sfy2wa1e.js:168840-169546 placement
/**
 * 生成写临时 seed 引用失败时的错误说明。
 */
function seedRefWriteFailure(stderr, privateGitDir) {
  logForDebugging(`[gitBundle] could not update a temporary seed ref: ${stderr.slice(0, 200)}`);
  let detail = truncateWithCount(replaceControlChars(getFirstLine(stderr.trim())), MAX_DETAIL_CHARS);
  return {
    error:
      privateGitDir !== undefined
        ? `Could not write a temporary ref in the private git directory that this upload builds in (${detail}). Retry; if it keeps failing, check that ${displayName(dirname(privateGitDir))} is writable and its disk has room.`
        : `Could not write the temporary ref this upload uses under .git/refs/seed (${detail}). If another git process is running here, let it finish, then retry; if it keeps failing, check that this checkout\u2019s git directory is writable and its disk has room. If it fails even so, something that git did not put there may be in the way at .git/refs/seed. ${DO_NOT_RUN_GIT_USE_ADVICE}`,
    failReason: "git_error",
  };
}
//@ chunk-sfy2wa1e.js:169546-170161 placement
/**
 * git 目录在准备上传期间被改动时的拒绝文案。
 */
var GIT_DIR_TAMPERED_MESSAGE =
  "Not uploading this working tree: its git directory changed while the upload was being prepared, holds something git itself never puts there, or could not be inspected \u2014 another git process (a background fetch or gc) may have written packs meanwhile, in which case let it finish and retry; otherwise look for a commondir or objects/info/alternates file, or a link, special or unreadable entry where its branches, tags, HEAD, the temporary refs/seed entries, their logs, or objects go (commondir, refs/heads, refs/tags, refs/seed, logs/refs/seed, logs/HEAD, objects/info, objects/pack) before retrying.";
//@ chunk-sfy2wa1e.js:170161-170222 placement
function gitDirTamperedResult() {
  return {
    error: GIT_DIR_TAMPERED_MESSAGE,
    failReason: "git_dir_tampered",
  };
}
//@ chunk-sfy2wa1e.js:170222-175967 placement
/**
 * git 目录内文件不是普通文件时的文案片段与各类篡改提示文本。
 */
var NOT_PLAIN_FILE_PHRASE; // deferred: uses MAX_PLACEMENT_FILE_BYTES (../git/builderGit/gitDirShape.js) of its import cycle while loading; runs once the cycle is complete
var TAMPER_MESSAGES;
var GIT_REFUSAL_MESSAGES;
deferInit("chunk-sfy2wa1e.js:170222", () => {
  NOT_PLAIN_FILE_PHRASE =
    "is not one plain file: it is a link, has a second name (a hard link, as tools that merge identical files make), is a folder or a special file, is missing where git needs it, or could not be examined. Git normally writes a plain file with one name there. Check with ls -l: a link shows an arrow (->), and the number after the permissions counts the names. If it is a plain file and that number is above 1, copy the file, move the copy over it (cp, then mv; git reads the copy the same), and retry. If it is anything else, start from a fresh clone of the repository instead (your uncommitted changes stay in this folder); where git itself writes links there (its core.preferSymlinkRefs setting), switch that setting off first.";
  TAMPER_MESSAGES = {
    work_tree_replaced:
      "Not uploading this working tree: this folder was moved, removed or replaced while the upload was being prepared, or could not be examined. Try again; if it happens again, look for another program that moves or recreates this folder.",
    git_dir_replaced: GIT_DIR_TAMPERED_MESSAGE,
    git_dir_head_not_plain: `Not uploading this working tree: HEAD in its git directory (usually .git/HEAD) ${NOT_PLAIN_FILE_PHRASE}`,
    git_dir_packed_refs_not_plain: `Not uploading this working tree: packed-refs in its git directory (usually .git/packed-refs) ${NOT_PLAIN_FILE_PHRASE}`,
    git_dir_refs_not_plain: `Not uploading this working tree: an entry at or under refs/heads, refs/tags or refs/remotes in its git directory (in an ordinary checkout, find .git/refs -type l -o -type f -links +1 lists such entries) ${NOT_PLAIN_FILE_PHRASE}`,
    git_dir_logs_not_plain: GIT_DIR_TAMPERED_MESSAGE,
    git_dir_tampered: GIT_DIR_TAMPERED_MESSAGE,
    git_dir_objects_not_plain: `Not uploading this working tree: the objects folder in its git directory (usually .git/objects) holds a link, a special file, a file directly in it that has a second name (a hard link), a folder where git keeps only files (in objects/pack or in objects/00 to objects/ff), an entry whose name is not valid UTF-8, more than ${MAX_PLACEMENT_FILE_BYTES.toLocaleString("en-US")} folders directly in it, or something that could not be examined (ls -lR .git/objects shows which). ${DO_NOT_RUN_GIT_USE_ADVICE}`,
    git_dir_objects_changed:
      "Not uploading this working tree: something wrote to objects/pack or objects/info in its git directory (usually .git) while the upload was being prepared. Usually that is another git process, such as a fetch, gc or maintenance run that an editor started. Let it finish, then retry. If it keeps happening with no git running, find out what else writes there.",
  };
  GIT_REFUSAL_MESSAGES = {
    git_refused_dubious_ownership:
      "Git will not work in this checkout because its folder, or the .git in it, belongs to another user (\u201Cdetected dubious ownership\u201D), so nothing was uploaded. That is common in containers and on mounted folders. Whether to go on is a question of whether you trust that user: git\u2019s safe.directory setting grants a folder. Run `git rev-parse --git-dir` here (it changes nothing): git\u2019s answer shows how. If that command works for you, your grant is given only through git\u2019s environment variables (GIT_CONFIG_PARAMETERS, or GIT_CONFIG_COUNT and its keys), which do not reach this upload\u2019s git: the grant has to stand in a file that git reads.",
    git_refused_not_a_repository:
      "Git does not recognise the .git here as a repository (\u201Cnot a git repository\u201D), so nothing was uploaded. Its HEAD, objects or refs may be missing, empty or unreadable, as after an interrupted copy. Start from a fresh clone, or from the folder that holds the real repository.",
    git_refused_bad_config:
      "Git cannot parse one of its configuration files (\u201Cbad config\u201D), so nothing was uploaded. Run `git rev-parse --git-dir` here (it changes nothing): its error names the file and the line, or the setting at fault. Fix that, then retry.",
    git_refused_config_unreadable:
      "Git cannot open one of its configuration files (\u201Cunable to access\u201D), so nothing was uploaded. Run `git rev-parse --git-dir` here (it changes nothing): its error names the file. Make that file readable for your user, or remove the include that points to it, then retry.",
    git_refused_unknown_extension:
      "This repository uses a git feature that the git on your PATH does not know (\u201Cunknown repository extension\u201D), so nothing was uploaded. Update git, or put a newer git first on the PATH that Claude Code is started with, then retry.",
    git_did_not_run:
      "The program that runs as git on your PATH started and ran no git, so nothing was uploaded. A version manager\u2019s shim (asdf\u2019s, for one) does that where no git version is set for the folder. Run `git --version` here to see what it says. Set a version, or put a real git first on the PATH that Claude Code is started with, then retry.",
    git_did_not_run_from_outside: "",
    git_dir_objects_folder_missing:
      "This checkout\u2019s git directory lacks objects/info or objects/pack, so nothing was uploaded. Git makes both in every repository and works without them; a copy that skips empty folders loses them. To make them again, in an ordinary checkout, at its top level, where .git is: first look with ls -ld .git .git/objects (a link shows an arrow, ->). If either is a link, stop, since the folders would be made wherever it points, and start from a fresh clone instead. Otherwise run mkdir .git/objects/info .git/objects/pack (an error that one of them exists does no harm), then retry.",
    launch_folder_unresolved:
      "This folder\u2019s own path could not be resolved just now: a link on the way to it changed, or a folder above it cannot be entered. So nothing was uploaded. Retry from the folder itself, by its real path.",
    keyed_folder_unresolved:
      "The folder under which Claude Code keeps this worktree\u2019s trust and settings could not be resolved just now: too many files may be open, or a folder on the way to it changed. So nothing was uploaded. Retry.",
  };
});
export {
  probeRepoBundleSize,
  createAndUploadGitBundle,
  deletedHereNotice,
  explainPreviousCaptureRetired,
  handBackDecision,
  leftOutNotice,
  previousCaptureServes,
  repositorySetBundleSwitches,
  unsupportedLayoutNotice,
};

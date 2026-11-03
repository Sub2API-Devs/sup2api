/**
 * utils/teleport/gitBundle.ts
 *
 * 把本地工作树打包为 git bundle 上传给云会话（CCR）：历史边界、浅克隆、引用选择、布局与设置检查、上传与回退说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teleport/gitBundle.ts
 * pieces: chunk-gjx0rh1b.js (80)
 * attribution: placement 80
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
  BUNDLE_OUTPUT_NAME,
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
import { count, uniq } from "../collections.js";
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
import { tmpdir, generateTempFilePath } from "../tempDir.js";
import { isFileDeleted } from "../commitAttribution.js";
import { uploadFileFromPath } from "../../services/api/filesApi.js";

//@ chunk-gjx0rh1b.js:76493-77115 placement
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
//@ chunk-gjx0rh1b.js:77115-77177 placement
function bundleMaxBytes() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_bundle_max_bytes", null) ?? DEFAULT_BUNDLE_MAX_BYTES;
}
//@ chunk-gjx0rh1b.js:77177-77228 placement
var GIT_AUDIT_ENV = {
  ...GIT_LIST_ENV,
  ...C_LOCALE_ENV,
};
var MAX_REF_TIPS = 64;
var MAX_REF_LIST_BYTES = 65536;
var MAX_REF_FILE_BYTES = (MAX_REF_TIPS + 1) * 65;
//@ chunk-gjx0rh1b.js:77228-77651 placement = readFileRange (0.819)
async function readFileRange(e) {
  try {
    if (!(await lstat(e)).isFile()) return null;
    let n = await open(e, readOnlyNoFollowFlags());
    try {
      let stats = await n.stat();
      if (!stats.isFile() || stats.size > MAX_REF_FILE_BYTES) return null;
      let buffer = Buffer.allocUnsafe(stats.size);
      let { bytesRead } = await n.read(buffer, 0, stats.size, 0);
      if (bytesRead !== stats.size) return null;
      let filtered = buffer
        .toString("utf8")
        .split(/\r?\n/)
        .filter((line) => line !== "");
      return filtered.length > MAX_REF_TIPS || filtered.some((h) => !/^[0-9a-f]{40,64}$/.test(h))
        ? null
        : filtered;
    } finally {
      await n.close();
    }
  } catch {
    return null;
  }
}
//@ chunk-gjx0rh1b.js:77651-78153 placement
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
//@ chunk-gjx0rh1b.js:78153-79179 placement
/**
 * 判断仓库是否浅克隆以及 HEAD 历史是否越过浅克隆边界：返回 not_shallow、complete、cut 或 unborn_cut，用于决定是否只打包工作树快照。
 */
async function detectShallowState(cwd, signal, hardening = null, probes = currentGitBinaryState()) {
  let s = ["rev-parse", "--is-shallow-repository", "--git-path", "shallow"];
  let l = hardening
    ? await listGitRefs(cwd, s, {
        hardened: true,
        layout: hardening.layout,
        signal,
        probes,
      })
    : await runGitForAudit([...GIT_SAFE_GLOBAL_ARGS, ...GIT_READ_CONFIG_ARGS, ...s], {
        cwd,
        abortSignal: signal,
        ...buildAuditEnv(),
      });
  let [h, u] = l.stdout.split(/\r?\n/);
  if (l.code !== 0 || h !== "true") return "not_shallow";
  let runGit = (C) =>
    hardening
      ? listGitRefs(cwd, C, {
          hardened: true,
          layout: hardening.layout,
          signal,
          probes,
          env: GIT_AUDIT_ENV,
        })
      : runGitForAudit([...GIT_SAFE_GLOBAL_ARGS, ...GIT_READ_CONFIG_ARGS, ...C], {
          cwd,
          ...buildAuditEnv(GIT_AUDIT_ENV),
          abortSignal: signal,
          maxBuffer: MAX_REF_LIST_BYTES,
        });
  let _ = (await runGit(["rev-parse", "--verify", "--quiet", "HEAD^{commit}"])).exitCode === 1;
  let y = _ ? "unborn_cut" : "cut";
  let fileRange = await readFileRange(resolve(cwd, u ?? join(".git", "shallow")));
  if (fileRange === null) return y;
  for (let C of fileRange) {
    if (_) {
      let R = await runGit([
        "for-each-ref",
        "--count=1",
        "--format=%(refname)",
        `--contains=${C}`,
        "refs/heads/",
        "refs/tags/",
      ]);
      if (R.exitCode === 0 && R.stdout.trim() === "") continue;
    } else {
      let R = await runGit(["merge-base", "--is-ancestor", C, "HEAD"]);
      if (R.exitCode === 1) continue;
      if (R.exitCode !== 0) return y;
    }
    let A = await runGit(["cat-file", "commit", C]);
    if (A.exitCode !== 0 || commitHasParent(A.stdout)) return y;
  }
  return _ ? "unborn" : "complete";
}
//@ chunk-gjx0rh1b.js:79179-79209 placement
var PACK_MEASURE_TIMEOUT_MS = 5000;
var PACK_SIZE_GROWTH_BASELINE = 100;
var MAX_IN_PACK_OBJECTS = 5000000;
//@ chunk-gjx0rh1b.js:79209-80157 placement
/**
 * 测量仓库 pack 大小与对象数，决定是否需要压缩历史后再打包。
 */
async function measurePackSize(cwd, hardened, layout, signal, baselineBytes, probes) {
  let h = await listGitRefs(cwd, ["count-objects", "-v"], {
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
  let { sizeBytes, inPackCount } = parseCountObjects(h);
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
  let w = await listGitRefs(cwd, ["config", "-z", "--list"], {
    hardened,
    layout,
    signal,
    probes,
  });
  if (w.code !== 0 || configListHasPartialClone(w.stdout))
    return {
      sizeBytes,
      inPackCount,
    };
  let signal_2 =
    signal === undefined
      ? AbortSignal.timeout(PACK_MEASURE_TIMEOUT_MS)
      : AbortSignal.any([signal, AbortSignal.timeout(PACK_MEASURE_TIMEOUT_MS)]);
  let y = await listGitRefs(cwd, ["rev-list", "--disk-usage", "--objects", "--missing=allow-any", "--all"], {
    hardened,
    layout,
    signal: signal_2,
    probes,
    ...(!hardened && {
      env: {
        GIT_NO_LAZY_FETCH: "1",
      },
    }),
  });
  let E = y.code === 0 && /^\d+\s*$/.test(y.stdout) ? Number(y.stdout.trim()) : null;
  if (E !== null && E < sizeBytes)
    logForDebugging(
      `[gitBundle] packs hold ${sizeBytes} bytes but only ${E} are reachable: sizing the tiers by the reachable figure`,
    );
  return {
    sizeBytes: E !== null && E < sizeBytes ? E : sizeBytes,
    inPackCount,
  };
}
//@ chunk-gjx0rh1b.js:80157-80382 placement
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
//@ chunk-gjx0rh1b.js:80382-80834 placement
async function probeRepoBundleSize(e) {
  let cwd = e?.gitRoot ?? findGitRoot(getCwd());
  if (!cwd)
    return {
      tooLarge: false,
      sizeBytes: null,
      inPackCount: null,
    };
  let { sizeBytes, inPackCount } =
    e === undefined
      ? await measurePackSize(cwd, false, undefined, undefined, null, currentGitBinaryState())
      : parseCountObjects(
          await runInvocation(e.spawn([...GIT_SAFE_GLOBAL_ARGS, "count-objects", "-v"]), {
            abortSignal: e.signal,
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
  let s = bundleMaxBytes();
  return {
    tooLarge:
      sizeBytes > 3 * s &&
      (sizeBytes > PACK_SIZE_GROWTH_BASELINE * s ||
        (inPackCount !== null && inPackCount > MAX_IN_PACK_OBJECTS)),
    sizeBytes,
    inPackCount,
  };
}
//@ chunk-gjx0rh1b.js:80834-87035 placement
/**
 * 生成 git bundle：选择 refs/heads、refs/tags、HEAD 与种子引用（stash、root），按需构造浅历史快照。
 */
async function _bundleWithFallback(cwd, n, r) {
  let { hardened, layout, signal, probes } = r;
  let u = [r.seedRefs.stash, r.seedRefs.root];
  let p = r.hasStash ? [r.seedRefs.stash] : [];
  let w = ["--glob=refs/heads/*", "--glob=refs/tags/*", ...(r.headResolves ? ["HEAD"] : [])];
  let _ = async (ie, K) => {
    let _e = layout === undefined ? undefined : await listBranchAndTagTips(cwd, layout, u, signal, probes);
    if (_e === null)
      return {
        ok: false,
        ...gitDirTamperedResult(),
      };
    let Ce = await listGitRefs(
      cwd,
      [...(hardened ? [] : GIT_READ_CONFIG_ARGS), "bundle", "create", n, ...K, ...p, "--"],
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
    if (layout && !(await isGitLayoutUntampered(layout, u)))
      return {
        ok: false,
        ...gitDirTamperedResult(),
      };
    if (Ce.code !== 0) {
      if (!hardened && !signal?.aborted) {
        let Re = await listGitRefs(cwd, ["config", "-z", "--list"], {
          hardened,
          layout,
          signal,
          probes,
        });
        if (Re.code === 0 && configListHasPartialClone(Re.stdout)) {
          logForDebugging(
            `[gitBundle] partial clone: git bundle create ${K.join(" ")} failed (${Ce.code}), bundling a snapshot of the working tree instead: ${clipGitArgs(Ce.stderr, hardened)}`,
          );
          return {
            ...(await _bundleWithFallback(cwd, n, {
              ...r,
              forceScope: "squashed",
              partialClone: true,
            })),
            promisorFallback: true,
          };
        }
      }
      return gitCommandFailure(
        `git bundle create ${hardened ? clipGitArgs(K.join(" "), true) : K.join(" ")}`,
        Ce,
        hardened,
      );
    }
    let { size: allSize } = await stat(n);
    if (allSize <= r.maxBytes) {
      let Re = r.hasStash
        ? await verifyBundleHeads(cwd, n, r.relabelledPath, new Map([[r.seedRefs.stash, REFS_SEED_STASH]]), {
            hardened,
            layout,
            signal,
            probes,
          })
        : null;
      if (Re !== null && !Re.ok) return bundlePrepareFailure(Re.error);
      let bundlePath = Re === null ? n : r.relabelledPath;
      let W = hardened
        ? await verifyBundleRefs(cwd, bundlePath, [...K, ...(r.hasStash ? [REFS_SEED_STASH] : [])], {
            layout,
            signal,
            probes,
            expected:
              r.stashCommit === undefined
                ? {}
                : {
                    [REFS_SEED_STASH]: r.stashCommit,
                  },
            shown: _e,
          })
        : r.bindJudgedStash === true && r.hasStash && r.stashCommit !== undefined
          ? await verifySeedRefInBundle(cwd, bundlePath, REFS_SEED_STASH, r.stashCommit, signal)
          : EMPTY_BUNDLE_VERDICT;
      if (layout && !(await isGitLayoutUntampered(layout, u)))
        return {
          ok: false,
          ...gitDirTamperedResult(),
        };
      return (
        bundleHeadsFailure(W, hardened) ?? {
          ok: true,
          path: bundlePath,
          size: Re === null ? allSize : Re.sizeBytes,
          scope: ie,
        }
      );
    }
    logForDebugging(
      `[gitBundle] ${ie} bundle is ${(allSize / 1024 / 1024).toFixed(1)}MB (> ${(r.maxBytes / 1024 / 1024).toFixed(0)}MB cap), trying the next tier`,
    );
    return null;
  };
  let { sizeBytes, inPackCount } = await measurePackSize(
    cwd,
    hardened,
    layout,
    signal,
    r.forceScope === undefined ? r.maxBytes : null,
    probes,
  );
  let C = r.forceScope === "squashed";
  let A = sizeBytes !== null && sizeBytes > r.maxBytes;
  let R = C || r.skipAllRefs || A;
  let B = sizeBytes !== null && sizeBytes > 3 * r.maxBytes;
  let x = C || B;
  let S =
    B &&
    ((sizeBytes !== null && sizeBytes > PACK_SIZE_GROWTH_BASELINE * r.maxBytes) ||
      (inPackCount !== null && inPackCount > MAX_IN_PACK_OBJECTS));
  if (C) logForDebugging("[gitBundle] forceScope=squashed \u2014 skipping the all-branches and HEAD tiers");
  else if (A)
    logForDebugging(
      r.currentBranchOnly
        ? `[gitBundle] size-pack ${(sizeBytes / 1024 / 1024).toFixed(0)}MB vs ${(r.maxBytes / 1024 / 1024).toFixed(0)}MB cap; ${x ? "skipping the branch tier" : "trying the branch tier"}${S ? ", skipping squashed" : ""}`
        : `[gitBundle] size-pack ${(sizeBytes / 1024 / 1024).toFixed(0)}MB > ${(r.maxBytes / 1024 / 1024).toFixed(0)}MB cap; skipping all-branches${x ? " and HEAD" : ""}${S ? " and squashed" : ""}`,
    );
  if (r.currentBranchOnly) {
    let ie = await listGitRefs(cwd, ["rev-parse", "--verify", "--quiet", "--symbolic-full-name", "HEAD"], {
      hardened,
      layout,
      signal,
      probes,
    });
    if (ie.exitCode === 1)
      return {
        ok: false,
        error: "The current branch has no commits yet",
        failReason: "empty_repo",
      };
    if (ie.code !== 0) return gitCommandFailure("git rev-parse HEAD", ie, hardened);
    if (!x) {
      let trimmed = ie.stdout.trim();
      let _e = trimmed === "HEAD" ? await _("head", ["HEAD"]) : await _("current_branch", [trimmed, "HEAD"]);
      if (_e !== null) return _e;
    }
  } else {
    if (!R) {
      let ie = await _("all", w);
      if (ie !== null) return ie;
    }
    if (!x) {
      let ie = await _("head", ["HEAD"]);
      if (ie !== null) return ie;
    }
  }
  if (S)
    return {
      ok: false,
      error: `This repository is too large to upload: its git history is ${formatSizeOrUnknown(sizeBytes)}, and an upload can be at most ${formatSizeOrUnknown(r.maxBytes)}`,
      failReason: "too_large",
      sizeBytes: sizeBytes ?? undefined,
    };
  let z = hardened && !r.hasStash ? await snapshotHeadTree(cwd, layout, u, signal, probes) : undefined;
  if (z === null)
    return {
      ok: false,
      ...gitDirTamperedResult(),
    };
  if (hardened && !r.hasStash && z === undefined)
    return {
      ok: false,
      error: "git rev-parse HEAD^{tree} failed: HEAD names no commit",
      failReason: "git_error",
    };
  let Y = {
    ...GIT_AUDIT_ENV,
    GIT_NO_LAZY_FETCH: "1",
  };
  let env = {
    ...(hardened ? {} : Y),
    ...STASH_IDENTITY_ENV,
  };
  let U = r.hasStash ? `${r.stashCommit ?? r.seedRefs.stash}^{tree}` : (z ?? "HEAD^{tree}");
  let D = [];
  if (r.baseRef) {
    let [ie, K] = await Promise.all(
      [U, `${r.baseRef}^{tree}`].map((Ce) =>
        listGitRefs(cwd, [...(hardened ? [] : GIT_REPLACE_REFS_CONFIG_ARGS), "rev-parse", Ce], {
          hardened,
          layout,
          signal,
          probes,
          ...(!hardened && {
            env: Y,
          }),
        }),
      ),
    );
    if (ie?.code === 0 && ie.stdout.trim() === K?.stdout.trim())
      return {
        ok: false,
        error:
          r.leftOutCount > 0
            ? `It doesn't look like you have any new commits or changes to review: the only uncommitted changes here are to ${r.leftOutCount} ${plural(r.leftOutCount, "file")} that ${plural(r.leftOutCount, "stays", "stay")} on this machine (named like credentials or keys, ${r.withheldByRules ? "covered by a Read rule or a sandbox read-deny setting of yours, linked from your Claude Code configuration, " : ""}hard-linked to another file, kept by a git filter such as LFS, or still being written while read) and ${plural(r.leftOutCount, "is", "are")} not uploaded. Stage or commit any other work first.`
            : "It doesn't look like you have any new commits or changes to review. Stage or commit them first?",
        failReason: "no_changes",
      };
    let commitTree = await listGitRefs(
      cwd,
      [
        ...(hardened ? [] : GIT_REPLACE_REFS_CONFIG_ARGS),
        "commit-tree",
        `${r.baseRef}^{tree}`,
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
    if (commitTree.code === 0) D = ["-p", commitTree.stdout.trim()];
    else
      logForDebugging(
        `[gitBundle] baseRef commit-tree failed (${commitTree.code}), squashing without parent: ${clipGitArgs(commitTree.stderr, hardened)}`,
      );
  }
  let pe = await listGitRefs(
    cwd,
    [...(hardened ? [] : GIT_REPLACE_REFS_CONFIG_ARGS), "commit-tree", U, ...D, "-m", "seed"],
    {
      hardened,
      layout,
      signal,
      probes,
      env,
    },
  );
  if (pe.code !== 0) return gitCommandFailure("git commit-tree", pe, hardened);
  let squashedSha = pe.stdout.trim();
  if (layout && !(await isGitLayoutUntampered(layout, u)))
    return {
      ok: false,
      ...gitDirTamperedResult(),
    };
  let squashResult = await updateRefCommand(cwd, [r.seedRefs.root, squashedSha], {
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
  let le = await listGitRefs(
    cwd,
    [...(hardened ? [] : GIT_READ_CONFIG_ARGS), "bundle", "create", n, r.seedRefs.root, "--"],
    {
      hardened,
      layout,
      signal,
      probes,
      ...(!hardened && {
        env: Y,
      }),
    },
  );
  if (layout && !(await isGitLayoutUntampered(layout, u)))
    return {
      ok: false,
      ...gitDirTamperedResult(),
    };
  if (le.code !== 0)
    return {
      ok: false,
      ...(r.partialClone
        ? {
            error: PARTIAL_CLONE_REFUSAL,
            failReason: "git_error",
          }
        : gitCommandFailure("git bundle create for the squashed root", le, hardened)),
    };
  let { size: squashSize } = await stat(n);
  if (squashSize <= r.maxBytes) {
    let ie = await verifyBundleHeads(cwd, n, r.relabelledPath, new Map([[r.seedRefs.root, REFS_SEED_ROOT]]), {
      hardened,
      layout,
      signal,
      probes,
    });
    if (!ie.ok) return bundlePrepareFailure(ie.error);
    let K = hardened
      ? await verifyBundleRefs(cwd, r.relabelledPath, [REFS_SEED_ROOT], {
          layout,
          signal,
          probes,
          expected: {
            [REFS_SEED_ROOT]: squashedSha,
          },
          shown: new Map(),
        })
      : r.bindJudgedStash === true
        ? await verifySeedRefInBundle(cwd, r.relabelledPath, REFS_SEED_ROOT, squashedSha, signal)
        : EMPTY_BUNDLE_VERDICT;
    if (layout && !(await isGitLayoutUntampered(layout, u)))
      return {
        ok: false,
        ...gitDirTamperedResult(),
      };
    return (
      bundleHeadsFailure(K, hardened) ?? {
        ok: true,
        path: r.relabelledPath,
        size: ie.sizeBytes,
        scope: "squashed",
        rootCommit: squashedSha,
      }
    );
  }
  return {
    ok: false,
    error: `This repository is too large to upload: even without its history it is ${formatSizeOrUnknown(squashSize)}, and an upload can be at most ${formatSizeOrUnknown(r.maxBytes)}`,
    failReason: "too_large",
    sizeBytes: squashSize,
  };
}
//@ chunk-gjx0rh1b.js:87035-87262 placement
async function verifyBundleHeads(e, n, relabelledPath, o, s) {
  let l = await copyVerifiedBundle(n, relabelledPath, o, s.signal);
  if (!l.ok) return l;
  let h = await listGitRefs(e, ["bundle", "list-heads", relabelledPath], s);
  return h.code === 0
    ? l
    : {
        ok: false,
        error: `git bundle list-heads exited ${h.code}: ${clipGitArgs(h.stderr, s.hardened)}`,
      };
}
//@ chunk-gjx0rh1b.js:87262-87535 placement
function bundlePrepareFailure(error) {
  return {
    ok: false,
    error: `Could not prepare the upload of this working tree (${error}). Retry; if it keeps failing, check that the temporary directory has room for a second copy of the bundle and that nothing else is writing to this checkout.`,
    failReason: "git_error",
  };
}
//@ chunk-gjx0rh1b.js:87535-87594 placement
function isGitFileLayout(e) {
  return e.detail === "git_file" && e.gitDir === "";
}
//@ chunk-gjx0rh1b.js:87594-87681 placement
function isUnuploadableLayout(e) {
  return (
    e.misplaced === "linked_worktree" || MISPLACED_REASONS[e.misplaced] !== undefined || isGitFileLayout(e)
  );
}
//@ chunk-gjx0rh1b.js:87681-90833 placement
/**
 * 决定在打包被拒时能否回退到旧上传方式：检查 .git 条目、家目录或上层检出能否被云会话写入，返回是否交还及拒绝原因文案。
 */
async function decideLegacyHandBack(cwd, layout, r, o) {
  let refuse = (notThePreviousWay, refusedAs = layout) => ({
    handedBack: false,
    refusedAs,
    notThePreviousWay,
  });
  if (r !== null) return refuse(r);
  let l = (repository) => {
    let C = repository === null ? null : enclosingCheckoutAboveHome(repository);
    let A =
      o ??
      (repository === null || C === null
        ? null
        : `${homeInsideCheckoutPhrase(C, repository)} and this checkout\u2019s git directory (${displayName(repository)}) is inside it, so a Claude Code session started there can write that directory\u2019s configuration${layout.misplaced === "git_file" ? " \u2014 start from an ordinary clone instead" : ""}`);
    return A === null
      ? {
          handedBack: true,
        }
      : {
          ...refuse(A),
          belowHomeCheckout: true,
        };
  };
  if (isGitFileLayout(layout)) {
    let E = await classifyDotGitEntry(cwd);
    return refuse(
      E === "link"
        ? "its .git entry is a symbolic link, which this checkout\u2019s own session can re-point and nothing pins in place, so where it leads when that capture runs cannot be bound to this tree \u2014 start from an ordinary clone instead"
        : E === "second_name"
          ? "its .git pointer file has a second name (a hard link), so what it names cannot be trusted between this read and git\u2019s \u2014 remove the other name, or start from an ordinary clone"
          : "its .git entry is a pointer file this upload could not follow (not the one gitdir line git writes), so where it leads cannot be judged \u2014 start from an ordinary clone instead",
    );
  }
  if (layout.gitDir !== "" && (layout.misplaced === "linked_worktree" || layout.detail === "git_file")) {
    if ((await checkSessionTempRoot(cwd)).some((C) => isPathInside(C, layout.gitDir)))
      return refuse(
        layout.misplaced === "linked_worktree"
          ? `its .git file names a worktree entry under a temporary directory (${displayName(layout.gitDir)}), where sessions write \u2014 run git worktree repair if this tree was moved, or start from the repository\u2019s main checkout`
          : `its .git file names a git directory under a temporary directory (${displayName(layout.gitDir)}), where sessions write \u2014 start from an ordinary clone of the repository`,
      );
  }
  if (layout.detail === "git_file" && layout.gitDir !== "") {
    let E = findEnclosingRepos(layout.gitDir)[0];
    if (E !== undefined)
      return refuse(
        `its git directory (${displayName(layout.gitDir)}) lies inside another checkout (${displayName(E)}), whose Claude Code sessions can write its configuration \u2014 start from an ordinary clone instead`,
      );
  }
  if (isUnuploadableLayout(layout))
    return refuse(
      MISPLACED_REASONS[layout.misplaced] ?? WORKTREE_DETAIL_REASONS[layout.detail ?? "admin_dir"],
    );
  let h =
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
  if (h === null) return l(null);
  let { entry, repository } = h;
  let w =
    (entry === null ? null : await detectUnsupportedLayout(entry)) ??
    (await detectUnsupportedLayout(repository));
  if (w !== null)
    return refuse(STATE_REASONS[w], {
      ...layout,
      misplaced: w,
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
  let _ = l(repository);
  if (!_.handedBack) return _;
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
//@ chunk-gjx0rh1b.js:90833-93925 placement
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
//@ chunk-gjx0rh1b.js:93925-98036 placement
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
  let o = displayName(finding.file);
  switch (finding.kind) {
    case "includes":
      return `its git configuration (${o}) pulls in include files, lies inside this working tree, its repository or a directory your settings open to Claude Code sessions, or includes a file there \u2014 configuration this upload could not have git list here, where a file a session may write could say what that capture runs; ${advicePrefix}move what the includes hold into the configuration file itself, stop granting sessions the directory that holds it (permissions.additionalDirectories, sandbox.filesystem.allowWrite, an Edit rule or --add-dir), or start from an ordinary clone`;
    case "second_name":
      return `its git configuration file ${o} (or a file it includes) has a second name \u2014 a hard link \u2014 so a session that can reach the other name could change what that capture runs under; ${advicePrefix}give the file a single name again (copy it aside and move the copy back over it), or start from an ordinary clone`;
    case "work_tree":
      return CORE_WORKTREE_REASON;
    case "worktree_config":
      return `its git configuration (${o}) switches per-worktree configuration on (extensions.worktreeConfig), under which that capture would also read a configuration file a session of the repository can plant in this tree\u2019s administrative entry; ${advicePrefix}start from the repository\u2019s main checkout`;
    case "unread":
      return `its git configuration file ${o} could not be read as a plain file git would parse, or is reached through a link that cannot be followed here, so what that capture would run under cannot be judged; ${advicePrefix}check that file, or start from an ordinary clone`;
    case "settings_unreadable":
      return unreadableSettingsReason(finding.file, advicePrefix);
    case "home_checkout":
      return homeCheckoutReason(finding, advicePrefix, ordinaryCloneAdvice);
    case "config_in_checkout":
      return `the user-level git configuration file ${o}, or a file it includes, lies inside \u2014 or links into \u2014 a git checkout (${displayName(finding.checkout)}), so a Claude Code session started there can write what that capture would run under, whether or not the file exists yet; ${advicePrefix}${ordinaryCloneAdvice ? "start from an ordinary clone, or " : ""}keep user-level git configuration outside any checkout`;
  }
}
//@ chunk-gjx0rh1b.js:98036-98400 placement
/**
 * 生成工作树内设置文件无法读取时的拒绝原因。
 */
function unreadableSettingsReason(file, advicePrefix) {
  return `a Claude Code settings file inside this working tree (${displayName(join(file, "settings.json"))} or settings.local.json) stands but cannot be read, so which directories it opens to sessions \u2014 and so whether a session could write the configuration that capture would run under \u2014 cannot be told; ${advicePrefix}fix or remove that settings file, then retry`;
}
//@ chunk-gjx0rh1b.js:98400-99210 placement
/**
 * 生成家目录本身或其上层是 git 检出时的拒绝原因。
 */
function homeCheckoutReason({ file, checkout }, advicePrefix, ordinaryCloneAdvice) {
  let s = ordinaryCloneAdvice ? "start from an ordinary clone, or " : "";
  switch (classifyHomePosition(checkout, dirname(file))) {
    case "home":
      return `your home directory is itself a git checkout, so a Claude Code session started there can write the user-level git configuration that capture would run under (${displayName(file)}, whether or not that file exists yet); ${advicePrefix}${s}keep the dotfiles repository\u2019s git directory outside your home (a bare repository used with --git-dir)`;
    case "above_home":
    case "elsewhere":
      return `your home directory lies inside a git checkout (${displayName(checkout)}), so a Claude Code session started there can write the user-level git configuration that capture would run under (${displayName(file)}, whether or not that file exists yet); ${advicePrefix}${s}move your home directory out of that checkout, or remove the stray git entry that makes it one`;
  }
}
//@ chunk-gjx0rh1b.js:99210-99373 placement
function describeHomeCheckout(e) {
  let n = nearestRepoAncestor(e);
  return n === null
    ? ""
    : classifyHomePosition(n, e) === "home"
      ? ` (yours is itself a git checkout: ${displayName(n)})`
      : ` (yours lies inside the git checkout at ${displayName(n)})`;
}
//@ chunk-gjx0rh1b.js:99373-99533 placement
function homeInsideCheckoutPhrase(e, n) {
  return classifyHomePosition(e, n) === "home"
    ? `your home directory (${displayName(e)}) is itself a git checkout`
    : `your home directory lies inside a git checkout (${displayName(e)})`;
}
//@ chunk-gjx0rh1b.js:99533-99558 placement
var displayName = (e) => truncateWithCount(replaceControlChars(e), MAX_DISPLAYED_NAME_CHARS);
//@ chunk-gjx0rh1b.js:99558-99775 placement
function nestedCheckoutReason(e) {
  return `this checkout sits inside another checkout (${displayName(e)}), whose Claude Code sessions can write this one\u2019s git files \u2014 start from a checkout of this repository that stands inside no other`;
}
//@ chunk-gjx0rh1b.js:99775-99983 placement
function homeContainsRepoReason(e) {
  let n = enclosingCheckoutAboveHome(e);
  return n === null
    ? null
    : `${homeInsideCheckoutPhrase(n, e)} and this working tree\u2019s repository (${displayName(e)}) is inside it, so a Claude Code session started there can write the repository\u2019s git files`;
}
//@ chunk-gjx0rh1b.js:99983-100220 placement
function nestedRepoReason(e) {
  return `this working tree\u2019s repository sits inside another checkout (${displayName(e)}), whose Claude Code sessions can write its git files \u2014 start from a working tree of a repository that stands inside no other checkout`;
}
//@ chunk-gjx0rh1b.js:100220-100681 placement
/**
 * 检查 .git 指向的目录里是否被放置了对象库（common_dir 等），返回问题类型。
 */
async function findPlantedObjectStore(e) {
  let n = join(e, ".git");
  let r;
  try {
    r = await lstat(n);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? null : "unreadable";
  }
  let o;
  if (r.isDirectory()) o = [n];
  else {
    if (!r.isFile()) return "unreadable";
    let gitdirPointer = readGitdirPointer(
      await readTextFileQuiet(n, {
        oneName: true,
      }).catch(() => {
        return;
      }),
    );
    if (gitdirPointer === undefined || pathIsForeignOrUnsafePointer(gitdirPointer, e)) return "unreadable";
    let l = isAbsolute(gitdirPointer) ? gitdirPointer : resolve(e, gitdirPointer);
    o = isLinkedWorktreeGitDir(l) ? [l, dirname(dirname(l))] : [l];
  }
  for (let s of o) {
    let unsupportedLayout = await detectUnsupportedLayout(s);
    if (unsupportedLayout !== null) return unsupportedLayout;
    if (!isLinkedWorktreeGitDir(s) && (await hasCommondirFile(s))) return "common_dir";
  }
  return null;
}
//@ chunk-gjx0rh1b.js:100681-100799 placement
async function hasCommondirFile(e) {
  return lstat(join(e, "commondir")).then(
    () => true,
    (error) => {
      let errnoCode = getErrnoCode(error);
      return !(errnoCode === "ENOENT" || errnoCode === "ENOTDIR");
    },
  );
}
//@ chunk-gjx0rh1b.js:100799-100869 placement
function isLinkedWorktreeGitDir(gitDir) {
  return gitDir !== "" && basename(gitDir) !== ".git" && basename(dirname(gitDir)) === "worktrees";
}
//@ chunk-gjx0rh1b.js:100869-103754 placement
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
//@ chunk-gjx0rh1b.js:103754-105796 placement
/**
 * 生成因 core.attributesFile 等属性设置被拒绝上传时的说明与处理建议。
 */
function gitAttributesSettingRefusal({ kind, setting, where = "", relative }) {
  let whereText = replaceControlChars(where);
  let l = "Claude Code\u2019s environment (set by your shell or your Claude Code settings)";
  let h = `Move the attribute rules it points to into a .gitattributes file committed with the project first, then remove the setting from ${whereText} and retry.`;
  let u = `Remove ${setting} from your shell or your Claude Code settings, then start Claude Code again.`;
  let [p, w] = {
    attributes_file: relative
      ? [
          `${setting} in ${whereText} is not a full path, which the git this upload runs may read as a different file than yours does`,
          "Set it to a full path (on Windows, one that starts with a drive letter) or a ~/ path, then retry.",
        ]
      : [
          `${setting} is set in ${whereText}`,
          `Move the attribute rules it points to into a .gitattributes file committed with the project, or set core.attributesFile directly in your user or system git config file to an absolute or ~/ path; then remove the setting from ${whereText} and retry.`,
        ],
    attr_tree: [`${setting} is set in ${whereText}`, h],
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
      u,
    ],
    attr_source_env: [
      `${setting} is set in ${"Claude Code\u2019s environment (set by your shell or your Claude Code settings)"}`,
      u,
    ],
  }[kind];
  return `Not uploading this working tree: ${p}, and the upload cannot follow that setting, so a file git would change before storing it (to encrypt it, for example) could be uploaded as it is on disk. ${w}`;
}
//@ chunk-gjx0rh1b.js:105796-105870 placement
function notPreviousWayNote(e) {
  return ` It is not uploaded the previous way either: ${e}.`;
}
//@ chunk-gjx0rh1b.js:105870-106072 placement
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
//@ chunk-gjx0rh1b.js:106072-106463 placement
/**
 * 查找会改写受保护环境变量的设置项，返回名称或无法读取。
 */
function findProtectedEnvSetting(layout, n) {
  let r = PROTECTED_ENV_VARS_2;
  try {
    let o = protectedSettingsFiles(layout, n);
    if (o === null)
      return {
        kind: "unreadable",
      };
    let found = [
      ...o,
      ...protectedSettingSourcesWithFlag().flatMap((h) =>
        Object.keys(getSettingsForSourceTightenOnly(h)?.env ?? {}),
      ),
    ].find((h) => r.includes(h.toUpperCase()));
    if (found !== undefined)
      return {
        kind: "names",
        name: found,
      };
    let envChangedBySettings = findEnvChangedBySettings(r);
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
//@ chunk-gjx0rh1b.js:106463-106733 placement
function repositorySetBundleSwitches() {
  try {
    let flattened = ["projectSettings", "localSettings"].flatMap((n) =>
      Object.keys(getSettingsForSource(n)?.env ?? {}).filter((key) => {
        let upper = key.toUpperCase();
        return BUNDLE_ENV_SWITCHES.includes(upper) && PROJECT_SCOPE_BLOCKED_ENV_VARS.has(upper);
      }),
    );
    return flattened.filter((n, r) => flattened.findIndex((o) => o.toUpperCase() === n.toUpperCase()) === r);
  } catch {
    return [];
  }
}
//@ chunk-gjx0rh1b.js:106733-106781 placement
var BUNDLE_ENV_SWITCHES = ["CCR_ENABLE_BUNDLE", "CCR_FORCE_BUNDLE"];
//@ chunk-gjx0rh1b.js:106781-108721 placement
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
//@ chunk-gjx0rh1b.js:108721-108759 placement
function previousCaptureServes() {
  return getPlatform() === "windows";
}
//@ chunk-gjx0rh1b.js:108759-109467 placement
function explainPreviousCaptureRetired(e) {
  switch (e?.kind) {
    case undefined:
      return "An older upload method, which took more layouts, is retired on macOS and Linux. To start without an upload, push your work and connect GitHub at https://claude.ai/code; /ultrareview also takes a pull request number.";
    case "forced_bundle":
      return "An older upload method, which took more layouts, is retired on macOS and Linux. To start without an upload, unset CCR_FORCE_BUNDLE, push your work and connect GitHub at https://claude.ai/code.";
    case "other_forge":
      return `An older upload method, which took more layouts, is retired on macOS and Linux. Cloud sessions can't clone from ${e.forge} yet, so an upload is the only way to start one from this repository.`;
  }
}
//@ chunk-gjx0rh1b.js:109467-109556 placement
function unsupportedLayoutResult(layoutKind, error) {
  return {
    success: false,
    error,
    failReason: "unsupported_layout",
    layoutKind,
  };
}
//@ chunk-gjx0rh1b.js:113464-114610 placement
async function handBackDecision(cwd, signal, r) {
  let gitRoot = findGitRoot(cwd ?? getCwd());
  let s = gitRoot ? await rewriteCopyAsSingleFile(gitRoot, signal) : null;
  if (s?.kind === "failed")
    return {
      kind: "refused",
      sentence: `It is not uploaded the previous way either: a private copy of this checkout's index could not be made (${truncateWithCount(replaceControlChars(s.detail), MAX_DETAIL_CHARS)}), and that way runs only over such a copy. Nothing was uploaded; once that is put right, retry, or start from an ordinary clone.`,
      named: 0,
      added: 0,
      unexamined: 0,
      gitlinks: 0,
      indexCopied: false,
      indexCopyCause: s.cause,
    };
  let l;
  try {
    l = await examineUncommittedChanges(cwd, signal, r, s?.indexFile);
  } catch (error) {
    await s?.dispose();
    throw error;
  }
  if (l.kind === "refused") {
    await s?.dispose();
    return l;
  }
  let h = null;
  try {
    h = s === null ? null : await rebuildCachedTree(gitRoot, s.indexFile, signal);
  } catch (error) {
    await s?.dispose();
    throw error;
  }
  if (h?.kind === "failed") {
    await s?.dispose();
    return {
      kind: "refused",
      sentence: `It is not uploaded the previous way either: that way runs only over a private copy of this checkout's index, and ${truncateWithCount(replaceControlChars(h.detail), MAX_DETAIL_CHARS)}. Nothing was uploaded; once that is put right, retry, or start from an ordinary clone.`,
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
      s === null
        ? null
        : {
            path: s.indexFile,
            dispose: s.dispose,
          },
  };
}
//@ chunk-gjx0rh1b.js:114610-116743 placement
/**
 * 列出未提交改动并检查是否含必须留在本机的文件、子模块 gitlink 等；无法列出或含受限文件时返回 refused 结果。
 */
async function examineUncommittedChanges(cwd, n, r, indexFile) {
  let changes = await checkGitRootLocation(cwd, n, indexFile);
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
  let u = changes.gitRoot === "" ? undefined : await r?.(changes.gitRoot);
  let paths = await classifyPathIdentity(changes.gitRoot, changes.paths, changes.added, u, changes.deleted);
  return paths.length === 0
    ? {
        kind: "proceed",
      }
    : {
        kind: "refused",
        sentence: `It is not uploaded the previous way either (that way keeps nothing back): ${changedPathsRefusal(paths, r !== undefined).replace(/^Not uploading this working tree: /, "")}`,
        named: paths.length,
        added: count(paths, ({ why }) => why === "added"),
        unexamined: count(paths, ({ why }) => why === "unexamined"),
        gitlinks: 0,
        indexCopied: true,
      };
}
//@ chunk-gjx0rh1b.js:116743-116900 placement
async function classifyDotGitEntry(e) {
  let n = await lstat(join(e, ".git")).catch(() => null);
  return n?.isSymbolicLink() === true
    ? "link"
    : n?.isFile() === true && n.nlink !== 1
      ? "second_name"
      : "other";
}
//@ chunk-gjx0rh1b.js:116900-117247 placement
/**
 * 判断 .git 指针文件指向的类型：链接工作树、子模块或独立 git 目录。
 */
async function classifyGitPointer(e) {
  let n = join(e, ".git");
  let r = await lstat(n).catch(() => null);
  if (r?.isSymbolicLink()) return "symlink";
  if (!r?.isFile()) return "other";
  let o = await readTextFileQuiet(n).catch(() => {
    return;
  });
  let replaced = readGitdirPointer(o)?.replaceAll("\\", "/");
  if (replaced === undefined) return "other";
  return /\/worktrees\/[^/]+\/?$/.test(replaced)
    ? "linked_worktree"
    : /\/modules\//.test(replaced)
      ? "submodule"
      : "separate_git_dir";
}
//@ chunk-gjx0rh1b.js:117247-118200 placement
function unsupportedLayoutNotice(e) {
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
    }[e]
  }; the new upload path does not support that yet, so the working tree is being uploaded the previous way for this session.`;
}
//@ chunk-gjx0rh1b.js:118200-118847 placement
/**
 * 判断是否请求使用旧版 bundle 上传方式（只认启动环境与自有设置）。
 */
function isLegacyBundleRequested() {
  let gitEnv = buildGitEnv(undefined);
  let n = isEnvTruthy(getEnvCaseInsensitive(gitEnv, "CLAUDE_CODE_LEGACY_BUNDLE"));
  let r = env.CLAUDE_CODE_LEGACY_BUNDLE === true;
  let o = r && !n;
  if (o) {
    let any = HOME_ENV_VARS.some(
      (l) => getEnvCaseInsensitive(process.env, l) !== getEnvCaseInsensitive(gitEnv, l),
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
    requested: n && r,
    ignored: o,
  };
}
//@ chunk-gjx0rh1b.js:118847-118878 placement
var EMPTY_BUNDLE_VERDICT = {
  missing: [],
  foreign: [],
};
//@ chunk-gjx0rh1b.js:118878-119163 placement
async function verifySeedRefInBundle(e, n, r, o, signal) {
  let l = await listGitRefs(e, [...GIT_READ_CONFIG_ARGS, "bundle", "list-heads", n], {
    hardened: false,
    signal,
    env: GIT_LIST_ENV,
  });
  if (l.code !== 0)
    return {
      missing: [r],
      foreign: [],
      unlisted: getFirstLine(l.stderr.trim()) || `exit ${l.code}`,
    };
  return l.stdout
    .split(
      `
`,
    )
    .some((line) => line === `${o} ${r}`)
    ? EMPTY_BUNDLE_VERDICT
    : {
        missing: [r],
        foreign: [],
      };
}
//@ chunk-gjx0rh1b.js:119163-120087 placement
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
        let [E, C] = line.split(" ");
        return E === undefined || C === undefined ? [] : [[C, E]];
      }),
  );
  let filtered_2 = filtered.filter((y) => {
    let E = heads.get(y);
    let C = options.expected[y];
    return E === undefined || (C !== undefined && E !== C);
  });
  let p =
    options.shown === undefined
      ? []
      : [...heads].flatMap(([y, E]) =>
          Object.hasOwn(options.expected, y) || options.shown?.get(y) === E ? [] : [y],
        );
  if (options.shown === undefined || filtered_2.length > 0 || p.length > 0)
    return {
      missing: filtered_2,
      foreign: p,
    };
  let w = await listGitRefs(cwd, ["cat-file", "--batch-check"], {
    hardened: true,
    layout: options.layout,
    signal: options.signal,
    probes: options.probes,
    input: [...heads.values()]
      .map(
        (y) => `${y}
`,
      )
      .join(""),
  });
  let notHeld =
    w.code === 0
      ? [...heads].flatMap(([y, E]) => (w.stdout.includes(`${E} missing`) ? [y] : []))
      : [...heads.keys()];
  return {
    missing: filtered_2,
    foreign: p,
    notHeld,
  };
}
//@ chunk-gjx0rh1b.js:120087-120381 placement
async function snapshotHeadTree(e, layout, r, signal, probes) {
  if (layout === undefined || !(await isGitLayoutUntampered(layout, r))) return null;
  let l = await listGitRefs(e, ["rev-parse", "-q", "--verify", "HEAD^{tree}"], {
    hardened: true,
    layout,
    signal,
    probes,
  });
  let trimmed = l.stdout.trim();
  if (!(await isGitLayoutUntampered(layout, r))) return null;
  return l.code === 0 && /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/.test(trimmed) ? trimmed : undefined;
}
//@ chunk-gjx0rh1b.js:120381-120925 placement
/**
 * 列出分支与标签的提交，用于判断能否用最宽的层级打包。
 */
async function listBranchAndTagTips(cwd, layout, r, signal, probes) {
  if (!(await isGitLayoutUntampered(layout, r))) return null;
  let [l, h] = await Promise.all([
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
  if (l.code !== 0 || (h.code !== 0 && h.exitCode !== 1) || !(await isGitLayoutUntampered(layout, r)))
    return null;
  let u = h.code === 0 ? [["HEAD", h.stdout.trim()]] : [];
  return new Map([
    ...l.stdout
      .split(
        `
`,
      )
      .flatMap((line) => {
        let [w, _] = line.split(" ");
        return w === undefined || _ === undefined ? [] : [[_, w]];
      }),
    ...u,
  ]);
}
//@ chunk-gjx0rh1b.js:120925-121211 placement
/**
 * git bundle 上传前的 ref 检查结果转错误（名字配错，与插件无关）。
 */
function bundleHeadsFailure(e, hardened) {
  if (e.unlisted !== undefined)
    return {
      ok: false,
      error: `git bundle list-heads failed: ${clipGitArgs(e.unlisted, hardened)}`,
      failReason: "git_error",
    };
  if (e.missing.length > 0) return droppedRefsFailure(e.missing);
  if (e.foreign.length > 0) return unexpectedRefsFailure(e.foreign);
  return (e.notHeld?.length ?? 0) > 0 ? unexpectedRefsFailure(e.notHeld ?? [], "not_held") : null;
}
//@ chunk-gjx0rh1b.js:121211-121893 placement
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
//@ chunk-gjx0rh1b.js:121893-122340 placement
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
//@ chunk-gjx0rh1b.js:122340-122460 placement = formatFailureDetails (0.777)
function formatFailureDetails(failures, includeReasons = DEFAULT_LISTED_FAILURES) {
  let joined = failures
    .slice(0, includeReasons)
    .map((failure) => truncateWithCount(replaceControlChars(failure), MAX_DISPLAYED_NAME_CHARS))
    .join(", ");
  let remaining = failures.length - includeReasons;
  return remaining > 0 ? `${joined} and ${remaining} more` : joined;
}
//@ chunk-gjx0rh1b.js:122460-123893 placement
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
//@ chunk-gjx0rh1b.js:123893-124155 placement
function gitCommandFailure(e, n, hardened) {
  let o = hardened ? undefined : firstGitFailureClass(seenStderr(n));
  let s = clipGitArgs(n.stderr, hardened);
  let l = n.stderr === WITHHELD_STDERR_NOTICE;
  return {
    ok: false,
    error:
      o !== undefined
        ? GIT_REFUSAL_MESSAGES[o]
        : `${e} failed (${n.code})${s && `: ${s}`}${l ? "; `git fsck` in this checkout may show why" : ""}`,
    failReason: "git_error",
    ...(o !== undefined && {
      gitRefused: o,
    }),
  };
}
//@ chunk-gjx0rh1b.js:124155-124210 placement
function clipGitArgs(stderr, n) {
  return n ? truncateWithCount(replaceControlChars(stderr), 200) : stderr.slice(0, 200);
}
//@ chunk-gjx0rh1b.js:124210-125623 placement
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
//@ chunk-gjx0rh1b.js:125623-127303 placement
/**
 * 生成可被云会话写入的 git 配置文件导致拒绝上传时的说明。
 */
function writableConfigRefusal(writable) {
  let n = writable.startsWith("included");
  let r = n
    ? "a file that your git configuration includes"
    : writable.startsWith("repository")
      ? "this repository\u2019s own git configuration file"
      : "your own or the system-wide git configuration file";
  let o = n
    ? " `git config --show-origin --get-regexp include` lists each include line and its file."
    : writable.startsWith("repository")
      ? ""
      : " `git config --list --show-origin --name-only` shows the files in use.";
  let s = "then retry; if the line is not yours to change, this checkout cannot be uploaded.";
  let [l, h] = writable.endsWith("_inside")
    ? [
        "lies inside this checkout or its git directory (even if it does not exist yet), where a cloud session could change it",
        n
          ? "Remove that line or point it outside this checkout, then retry; if the line is not yours to change, this checkout cannot be uploaded."
          : "Keep that file outside this checkout, or start from a checkout that does not hold it.",
      ]
    : writable.endsWith("_not_text")
      ? [
          "has a name that is not valid text, so it cannot be checked",
          `Give the file and every folder in its path a name that is valid text, ${n ? "update the include line to match, " : ""}${writable.startsWith("repository") ? "" : "keep the file outside this checkout, "}then retry.`,
        ]
      : [
          "can be reached from this checkout (through a link, a hard link or another spelling of its path) or is on a network path, so a cloud session could change it or it cannot be checked",
          n
            ? "Remove that line, or point it by its plain path at an ordinary local file outside this checkout, then retry; if the line is not yours to change, this checkout cannot be uploaded."
            : "Put an ordinary local file (no link, no hard link) in its place, then retry.",
        ];
  return `Not uploading this working tree: ${r} ${l}.${o} ${h}`;
}
//@ chunk-gjx0rh1b.js:127303-132291 placement
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
//@ chunk-gjx0rh1b.js:132291-132490 placement
function misplacedSummary(e) {
  return {
    misplaced: e.misplaced,
    unexamined: e.unexamined,
    keptBy: e.keptBy,
    writable: e.writable,
    detail: e.detail,
    pointerFollowed: e.gitDir !== "",
    sharedDirectoryElsewhere: e.commonDir !== e.gitDir,
  };
}
//@ chunk-gjx0rh1b.js:132490-132776 placement
function deletedHereNotice(e) {
  return `${e.length} tracked ${plural(e.length, "file")} ${plural(e.length, "was", "were")} missing when read and ${plural(e.length, "is", "are")} uploaded as deleted (${formatFailureDetails(e, 3)}) \u2014 if a build was rewriting ${plural(e.length, "it", "them")} just then, start the session again once it settles.`;
}
//@ chunk-gjx0rh1b.js:132776-133468 placement
function leftOutNotice(e, { readRules: n = false, ofThisUploadOnly: r = false } = {}) {
  return `${r ? "Left out of this upload" : "Left on this machine"}: ${e.length} uncommitted ${plural(e.length, "file")} named like credentials or keys, ${n ? "covered by a Read rule or a sandbox read-deny setting of yours, linked from your Claude Code configuration, " : ""}hard-linked to another file, kept by a git filter such as LFS, or still being written by another program while ${plural(e.length, "it was", "they were")} read (${formatFailureDetails(e)})${r ? "" : `, ${plural(e.length, "was", "were")} not uploaded`} \u2014 the cloud session starts with the version git already holds for ${plural(e.length, "it", "them")} (committed or staged), or without ${plural(e.length, "it", "them")}.`;
}
//@ chunk-gjx0rh1b.js:133468-136928 placement
/**
 * 按 git 报告的变更路径异常类型（伪造拼写、同字节条目等）生成拒绝上传的说明文案。
 */
function changedPathsRefusal(paths, n = false) {
  let pathsWhere = (y) => paths.filter((path) => path.why === y).map(({ path }) => path);
  let o = pathsWhere("forged");
  if (o.length > 0)
    return `Not uploading this working tree: git reports changed paths spelled in a way git itself never writes (${formatFailureDetails(o)}), so this checkout's index or HEAD was edited by something other than git. Inspect it (git status, git log) before retrying.`;
  let s = pathsWhere("same-bytes");
  if (s.length > 0)
    return `Not uploading this working tree: while it was read, an index entry appeared (${formatFailureDetails(s)}) holding, byte for byte, the content of a file that stays on this machine (named like credentials or keys${n ? ", covered by a Read rule or a sandbox read-deny setting of yours, linked from your Claude Code configuration" : ""}, or kept by a git filter) \u2014 at a name no step of this upload put it under, so something else wrote into the index copy this upload works in while it ran. Retry; if it recurs, check what else is running in this checkout.`;
  let l = pathsWhere("alias");
  if (l.length > 0)
    return `Not uploading this working tree: its uncommitted changes include paths shaped like Windows 8.3 short names (${formatFailureDetails(l)}), which can open a different file than they name. Rename or remove them \u2014 committing them as they stand would put whatever they open into git \u2014 then retry.`;
  let h = pathsWhere("hardlinked");
  if (h.length > 0)
    return `Not uploading this working tree: ${h.length} changed ${plural(h.length, "file has", "files have")} a second hard link (${formatFailureDetails(h)}) \u2014 another name for what may be a file outside this tree, linked in without reading it \u2014 so ${plural(h.length, "it is", "they are")} never read for an upload. Remove the extra link (or commit the file if it is yours), then retry.`;
  let u = pathsWhere("unexamined");
  if (u.length > 0)
    return `Not uploading this working tree: ${u.length} changed ${plural(u.length, "file")} could not be examined where ${plural(u.length, "it stands", "they stand")} (${formatFailureDetails(u)}) \u2014 a directory above could not be inspected, the name is not valid UTF-8, or the entry could not be read \u2014 so whether another name leads outside this tree cannot be told. Check the path (ls -la along it), or commit the change if it is yours, then retry.`;
  let p = pathsWhere("added");
  let w = pathsWhere("changed");
  let _ = pathsWhere("resurrected");
  return [
    `Not uploading this working tree: its uncommitted changes include ${paths.length} ${plural(paths.length, "file")} named like credentials or keys${n ? ", covered by a Read rule or a sandbox read-deny setting of yours, or linked from your Claude Code configuration" : ""} (${formatFailureDetails(
      paths.map(({ path }) => path),
    )}).`,
    ...(p.length > 0
      ? [
          `${formatFailureDetails(p)} ${plural(p.length, "was", "were")} added to git's index but never committed: unless you meant to start tracking ${plural(p.length, "it", "them")}, take ${plural(p.length, "it", "them")} back out with ` +
            "`git rm --cached -- <file>` (the file itself stays on disk) \u2014 if you did not add " +
            `${plural(p.length, "it", "them")} yourself, something else did.`,
        ]
      : []),
    ...(w.length > 0
      ? [
          `${formatFailureDetails(w)} ${plural(w.length, "differs", "differ")} from what is committed: commit the change if it belongs in git; if ` +
            "`git status` shows no change there, running it once settled the difference \u2014 retry; if git should not be tracking " +
            `${plural(w.length, "that file", "those files")} at all, this checkout's history was rewritten \u2014 see ` +
            "`git log -- <file>`.",
        ]
      : []),
    ...(_.length > 0
      ? [
          `${formatFailureDetails(_)} ${plural(_.length, "is", "are")} committed but removed from the index while the file is, or may still be, on disk: commit the removal, or if you never committed ${plural(_.length, "it", "them")}, see \`git log -- <file>\` for who did.`,
        ]
      : []),
    "Then retry.",
  ].join(" ");
}
//@ chunk-gjx0rh1b.js:136928-136969 placement
function formatSizeOrUnknown(e) {
  return e === null ? "?" : formatFileSize(e);
}
//@ chunk-gjx0rh1b.js:136969-166897 placement
/**
 * 把当前工作树上传给云会话：HIPAA 策略拒绝、检查检出布局与设置、捕获 WIP、生成并校验 bundle、上传，失败时按原因说明是否回退旧方式（约 30 KB）。
 */
async function createAndUploadGitBundle(e, n) {
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
  let r = n?.cwd ?? getCwd();
  let o = n?.currentBranchOnly === true;
  let cwd = findGitRoot(r);
  if (!cwd) {
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
  let l = n?.hardenForDeviceSessions === true;
  let h =
    n?.hardenForDeviceSessions === undefined && getPlatform() !== "windows"
      ? isLegacyBundleRequested()
      : {
          requested: false,
          ignored: false,
        };
  let u = n?.hardenForDeviceSessions ?? !previousCaptureServes();
  let p = !l && (n?.previousCaptureServes ?? previousCaptureServes());
  if (h.requested)
    logForDebugging(
      "[gitBundle] CLAUDE_CODE_LEGACY_BUNDLE is not honoured on macOS and Linux: the default upload method runs",
      {
        level: "warn",
      },
    );
  let w = u
    ? {
        hardened: true,
        ...emptyBindingFacts(),
        ...(h.ignored && {
          legacy_switch_ignored: true,
        }),
        ...(h.requested && {
          legacy_switch_retired: true,
        }),
      }
    : {
        legacy_bundle: true,
      };
  let _ = () => {
    logEvent("tengu_ccr_bundle_upload", {
      outcome: lit("admin_dir_failed"),
      admin_dir_reason: lit("path_misread"),
      ...w,
    });
    logFeatureBad("teleport_git_bundle_upload", "admin_dir_failed");
    return {
      success: false,
      error:
        "Not uploading this working tree: a folder with a backslash (\\) in its name is in its path (as written or with links followed) or in the path of the folder Claude Code was started in. Claude Code would read the backslash as a folder separator and check a different folder. Rename that folder, then start Claude Code again.",
      failReason: "refused",
    };
  };
  if (hasBackslash(cwd) || cwdHasBackslash()) return _();
  let cwd_2 = u ? await realpath(cwd).catch(() => null) : cwd;
  if (cwd_2 === null) {
    logEvent("tengu_ccr_bundle_upload", {
      outcome: lit("admin_dir_failed"),
      admin_dir_reason: lit("unresolved_root"),
      ...w,
    });
    logFeatureBad("teleport_git_bundle_upload", "admin_dir_failed");
    return {
      success: false,
      error:
        "Not uploading this working tree: its own path could not be resolved just now (a link on the way to it changed or could not be read), so nothing was uploaded this way; retry from the directory itself.",
      failReason: "refused",
    };
  }
  if (hasBackslash(cwd_2)) return _();
  await using E = holdDirectory();
  let C = u ? await holdIdOfPath(E, cwd_2) : null;
  if (C !== null && classifyIdentity(C) === "none")
    logEvent("tengu_ccr_bundle_root_names_no_object", {
      device_zero: C.startsWith("0:"),
    });
  let A = u ? findEnclosingRepos(cwd_2) : [];
  let R = classifyBindingFolder(cwd, n?.rootAnchors);
  if (R !== null) {
    logEvent("tengu_ccr_bundle_upload", {
      outcome: lit("refused_home_root"),
      root_kind: fromEnum(R),
      ...w,
    });
    logFeatureBad("teleport_git_bundle_upload", "refused_home_root");
    return {
      success: false,
      error: GIT_ROOT_REFUSALS[R],
      failReason: "git_dir_tampered",
    };
  }
  let seedRefNames = createSeedRefNames();
  let x = [seedRefNames.stash, seedRefNames.root];
  let signal = n?.signal;
  let z = u ? AbortSignal.timeout(BUNDLE_STEP_TIMEOUT_MS) : undefined;
  let now = Date.now();
  let signal_2 = z === undefined ? signal : signal === undefined ? z : AbortSignal.any([signal, z]);
  let probes = new GitBinaryError("operation");
  let D = (G) => {
    let Q = {
      phase: fromEnum(G),
      elapsed_ms: Date.now() - now,
    };
    if (signal?.aborted === true || z?.aborted !== true) {
      logEvent("tengu_ccr_bundle_upload", {
        ...w,
        outcome: lit("aborted"),
        current_branch_only: o,
        ...Q,
      });
      return {
        success: false,
        error: "Bundle cancelled",
      };
    }
    logEvent("tengu_ccr_bundle_upload", {
      ...w,
      outcome: lit("build_budget_expired"),
      current_branch_only: o,
      ...Q,
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
  let layout = u
    ? await inspectGitLayout(cwd, signal_2, {
        linkedTrees: true,
        bound: l,
        startsInProject: n?.startsInProject,
        perWorktreeConfig: "serve",
        probes,
        holder,
      })
    : undefined;
  if (u && signal_2?.aborted) return D("layout_read");
  let Te = layout?.kind === "read" ? compareWorkTree(layout.layout, cwd_2, C) : "the_same";
  if (Te !== "the_same")
    return createAndUploadGitBundle_2({
      on: "root_at_layout_read",
      folderRead: Te,
    });
  let le =
    layout?.kind === "read" && layout.layout.checkout === "linked"
      ? checkoutDirOfGitDir(layout.layout.commonDir)
      : layout?.kind === "tampered" && isLinkedWorktreeGitDir(layout.gitDir)
        ? checkoutDirOfGitDir(dirname(dirname(layout.gitDir)))
        : null;
  let ve = le === null ? [] : findEnclosingRepos(le);
  let ie = uniq([...A, ...ve]);
  let K =
    A[0] !== undefined ? nestedCheckoutReason(A[0]) : ve[0] !== undefined ? nestedRepoReason(ve[0]) : null;
  let _e = u && K === null ? enclosingCheckoutAboveHome(cwd_2) : null;
  let Ce =
    _e !== null
      ? `${homeInsideCheckoutPhrase(_e, cwd_2)} and this checkout is inside it, so a Claude Code session started there can write this checkout\u2019s git files`
      : u && K === null && le !== null
        ? homeContainsRepoReason(le)
        : null;
  let worktreeConfig = layout?.kind === "read" ? layout.layout.worktreeConfig : undefined;
  let $e = l || K !== null || Ce !== null || worktreeConfig !== undefined;
  if (layout?.kind === "tampered") {
    logForDebugging(`[gitBundle] Refusing to bundle: misplaced ${layout.misplaced}`);
    let layoutKind = misplacedKindForLog(layout.misplaced);
    let Q = layoutKind === null ? "git_dir_tampered" : `unsupported_${layoutKind}`;
    let te = layout.misplaced === "git_file" ? await classifyGitPointer(cwd) : null;
    let ue =
      layoutKind === null || l || (!p && isUnuploadableLayout(layout))
        ? {
            handedBack: false,
            refusedAs: layout,
            notThePreviousWay: "",
          }
        : p
          ? await decideLegacyHandBack(cwd_2, layout, K, Ce)
          : {
              handedBack: true,
            };
    let handedBack = ue.handedBack;
    let finding =
      handedBack && p
        ? findProtectedEnvSetting({
            workTree: cwd,
          })
        : null;
    if (finding !== null) {
      logEvent("tengu_ccr_bundle_upload", {
        ...w,
        outcome: lit("admin_dir_failed"),
        steering: fromEnum(finding.kind),
        enclosed: ie.length > 0,
      });
      logFeatureBad("teleport_git_bundle_upload", "admin_dir_failed");
      return {
        success: false,
        error: protectedEnvRefusal(finding),
        failReason: "refused",
      };
    }
    let oe = ue.handedBack ? layout : ue.refusedAs;
    logEvent("tengu_ccr_bundle_upload", {
      ...w,
      outcome: fromEnum(Q),
      tampered_on: fromEnum(oe.misplaced),
      ...(oe.unexamined && {
        unexamined: true,
      }),
      ...(oe.keptBy !== undefined && {
        refs_kept_by: fromEnum(oe.keptBy),
      }),
      ...(oe.writable !== undefined && {
        writable_config: fromEnum(oe.writable),
      }),
      ...(oe.includedBy !== undefined && {
        included_by: fromEnum(oe.includedBy),
      }),
      ...(oe.detail !== undefined && {
        worktree_check: fromEnum(oe.detail),
      }),
      ...(!ue.handedBack &&
        ue.screened !== undefined && {
          unlisted_config: fromEnum(ue.screened),
        }),
      ...(!ue.handedBack &&
        ue.belowHomeCheckout === true && {
          below_home_checkout: true,
        }),
      ...(layoutKind !== null && {
        fallback_eligible: handedBack,
        ...(!l && {
          enclosed: ie.length > 0,
        }),
      }),
      ...(te !== null && {
        git_file_kind: fromEnum(te),
      }),
    });
    if (ue.handedBack && layoutKind !== null)
      return {
        ...unsupportedLayoutResult(layoutKind, misplacedRefusalMessage(misplacedSummary(layout))),
        ...(te !== null && {
          gitFileKind: te,
        }),
      };
    logFeatureBad(
      "teleport_git_bundle_upload",
      oe.misplaced === "included_config" && oe.writable !== undefined
        ? `${Q}_${oe.writable}${oe.includedBy === undefined ? "" : `_by_${oe.includedBy}`}`
        : oe.misplaced === "linked_worktree" && oe.detail !== undefined
          ? `${Q}_${oe.detail}`
          : Q,
    );
    return {
      success: false,
      error:
        misplacedRefusalMessage({
          ...misplacedSummary(oe),
          ...(isGitFileLayout(oe) && {
            dotGitEntry: await classifyDotGitEntry(cwd_2),
          }),
        }) +
        (ue.handedBack || !p || layoutKind === null || oe.unexamined
          ? ""
          : notPreviousWayNote(ue.notThePreviousWay)),
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
        ...w,
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
    let G = layout.why === "git_not_found";
    let Q = layout.why === "changed_under_read";
    let te = G ? "git_not_on_path" : (layout.cause ?? "wip_unreadable");
    logEvent("tengu_ccr_bundle_upload", {
      ...w,
      outcome: fromEnum(te),
      ...(Q && {
        changed_under_read: true,
      }),
      ...(G &&
        isGitShimOnly() && {
          git_script_wrapper_only: true,
        }),
    });
    logFeatureBad("teleport_git_bundle_upload", te);
    if (layout.cause !== undefined)
      return {
        success: false,
        error: GIT_REFUSAL_MESSAGES[layout.cause],
        failReason: "git_error",
      };
    return G
      ? l
        ? {
            success: false,
            error: `Not uploading this working tree: git was not found on the PATH this process was started with once the directories a cloud session can write here were left out (those inside this checkout or a checkout enclosing it, such as a worktree\u2019s main checkout; those below your home directory when it is, or lies inside, a git checkout${describeHomeCheckout(cwd_2)}; a session temp directory; or one whose git links into them). Install git outside those, or put that directory on PATH, then retry.${windowsGitDirNote()} ${UNEXAMINABLE_REACH_NOTE}`,
            failReason: "refused",
          }
        : {
            success: false,
            error: `git was not found on the PATH this process was started with, so nothing was uploaded. Install git, or put its directory on PATH, then retry.${windowsGitDirNote()}`,
            failReason: "git_error",
          }
      : Q
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
      ...w,
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
  let ct = layout_2?.checkout === "linked";
  let ft = layout_2 ? await gitLayoutFaultOf(layout_2, x) : null;
  if (ft !== null)
    return createAndUploadGitBundle_2({
      on: "mid_build",
      fault: ft,
    });
  let Qe = layout_2 !== undefined && (await hasPartialCloneConfig(cwd, layout_2, signal_2, probes));
  if (u && signal_2?.aborted) return D("promisor_probe");
  if (Qe)
    logForDebugging(
      "[gitBundle] partial clone \u2014 bundling a snapshot of the working tree, without history",
    );
  let finding = $e && layout_2 !== undefined ? findProtectedEnvSetting(layout_2) : null;
  if (finding !== null) {
    logEvent("tengu_ccr_bundle_upload", {
      ...w,
      outcome: lit("admin_dir_failed"),
      steering: fromEnum(finding.kind),
      steered_by: fromEnumOpt(
        finding.kind === "unreadable"
          ? undefined
          : PROTECTED_ENV_VARS_2.find((G) => G === finding.name.toUpperCase()),
      ),
    });
    logFeatureBad("teleport_git_bundle_upload", "admin_dir_failed");
    return {
      success: false,
      error: protectedEnvRefusal(finding),
      failReason: "refused",
    };
  }
  let ee = u || n?.refuseCredentialNamedInStash === true;
  let De = ee ? resolveTempDir() : tmpdir();
  await using ce =
    layout_2 !== undefined ? await copyRepositoryForBuild(cwd, layout_2, signal_2, probes, "own") : undefined;
  if (ce?.kind === "failed") {
    if (signal_2?.aborted) return D("admin_dir");
    logForDebugging(`[gitBundle] could not set up the private git dir: ${ce.detail.slice(0, 200)}`);
    if (ce.cause === "attribute_source") {
      let { kind } = ce.source;
      logEvent("tengu_ccr_bundle_upload", {
        ...w,
        outcome: lit("attribute_source_unread"),
        attribute_source: fromEnum(kind),
        linked_worktree: ct,
      });
      logFeatureBad("teleport_git_bundle_upload", "attribute_source_unread");
      return {
        success: false,
        error: gitAttributesSettingRefusal(ce.source),
        failReason: "refused",
      };
    }
    logEvent("tengu_ccr_bundle_upload", {
      ...w,
      outcome: lit("admin_dir_failed"),
      linked_worktree: ct,
      admin_dir_reason: fromEnum(ce.reason),
      admin_dir_cause: fromEnum(ce.cause),
      ...(!l && {
        enclosed: ie.length > 0,
      }),
    });
    logFeatureBad("teleport_git_bundle_upload", "admin_dir_failed");
    let G = truncateWithCount(replaceControlChars(ce.detail), MAX_DETAIL_CHARS);
    let Q = !p
      ? ""
      : K !== null
        ? notPreviousWayNote(K)
        : worktreeConfig === "extension"
          ? notPreviousWayNote(
              "its repository has per-worktree configuration switched on (extensions.worktreeConfig, which git sparse-checkout sets)",
            )
          : worktreeConfig === "inert"
            ? notPreviousWayNote(
                "a per-worktree configuration file (config.worktree) stands in its administrative entry",
              )
            : ct
              ? notPreviousWayNote("a linked working tree is uploaded under that private directory only")
              : "";
    return {
      success: false,
      error:
        ce.cause === "symbolic_head"
          ? `Not uploading this working tree: ${G}. Nothing was uploaded.${GIT_DIR_FILE_ADVICE.symbolic_head}`
          : ce.cause === "placement"
            ? `Not uploading this working tree this way: the private git directory the upload must trust would stand where a cloud session can write \u2014 ${G}. Nothing was uploaded; retry once that is changed.`
            : ce.cause === "home"
              ? `Could not prepare a private git directory for the upload (${G}), so nothing was uploaded. It is kept under your configuration home: check that ${displayName(ce.home)} is a writable directory of yours, and that ${displayName(join(ce.home, "seed-admin"))}, if it exists, is a directory only you can write. Look at it first: ls -ld, with no / after the name (tab completion adds one, and with it a link to a folder shows as a plain folder). A directory there holds scratch only and can be removed (rm -r, again with no /). A link or a file there is removed by its name (rm, with no -r and no / after the name). Then retry.${Q}`
              : `Could not prepare a private git directory for the upload (${G}), so nothing was uploaded. The upload builds from private copies of this checkout\u2019s HEAD, index and refs, and copies them only when they are ordinary files (no links, one name each).${GIT_DIR_FILE_ADVICE[ce.cause]}${Q}`,
      failReason: "refused",
    };
  }
  let Fe = (G) => {
    let Q = layout_2 === undefined ? undefined : findOverriddenGitConfigVar(layout_2, probes.screenMemo);
    if (Q === undefined) return null;
    logEvent("tengu_ccr_bundle_upload", {
      ...w,
      outcome: lit("config_level_not_read"),
      config_level: fromEnum(Q),
      config_level_asked: fromEnum(G),
    });
    logFeatureBad("teleport_git_bundle_upload", "config_level_not_read");
    return {
      success: false,
      error: `Not uploading this working tree: ${Q} names a git configuration file that a Claude Code session could change, so the git that this upload runs does not read it, and a file git would change before storing it (to encrypt it, for example) could be uploaded as it is on disk. Move its settings into ${Q === "GIT_CONFIG_GLOBAL" ? "~/.gitconfig" : "git\u2019s default system file"} and remove ${Q} from your shell or your Claude Code settings; or keep the file outside this checkout, any checkout around it or around your home directory, Claude Code\u2019s temp folder, and any folder that settings open to sessions. Then start Claude Code again.`,
      failReason: "refused",
    };
  };
  let St = Fe("before_build");
  if (St !== null) return St;
  if (layout_2 !== undefined && ce?.kind === "made")
    layout_2 = {
      ...layout_2,
      adminDir: ce.path,
      borrowedObjects: ce.borrowedObjects,
    };
  let et = layout_2 ? await gitLayoutFaultOf(layout_2, x) : null;
  if (et !== null)
    return createAndUploadGitBundle_2({
      on: "mid_build",
      fault: et,
    });
  if (!u) {
    let G = await listGitRefs(cwd, ["for-each-ref", "--format=%(refname)", "refs/seed/"], {
      hardened: u,
      probes,
    });
    if (G.code !== 0)
      logForDebugging(
        `[gitBundle] could not list refs/seed/ (${G.code}), so private refs a killed build left are not swept this run (the two fixed names still are): ${clipGitArgs(G.stderr, u)}`,
      );
    let Q = uniq([
      REFS_SEED_STASH,
      REFS_SEED_ROOT,
      ...staleSeedRefs(
        G.code === 0
          ? G.stdout
              .split(
                `
`,
              )
              .filter((line) => line !== "")
          : [],
      ),
    ]);
    for (let te of Q) {
      let ue = await updateRefCommand(cwd, ["-d", te], {
        hardened: u,
        layout: undefined,
        probes,
      });
      if (ue.code !== 0)
        logForDebugging(`[gitBundle] could not sweep a stale seed ref: ${ue.stderr.slice(0, 200)}`);
    }
  }
  let ht = await listGitRefs(cwd, ["rev-parse", "--verify", "--quiet", "HEAD"], {
    hardened: u,
    layout: layout_2,
    probes,
    ...(u && {
      signal: signal_2,
    }),
  });
  let Nt = ht.code === 0;
  let Fn = ht.exitCode === 1;
  let Zt = ht.exitCode === undefined && ht.stderr === "";
  let $t = await listGitRefs(cwd, ["for-each-ref", "--count=1", "refs/heads/", "refs/tags/"], {
    hardened: u,
    layout: layout_2,
    probes,
    ...(u && {
      signal: signal_2,
    }),
  });
  if (u && signal_2?.aborted) return D("ref_probe");
  if ($t.code === 0 && $t.stdout.trim() === "" && !Nt) {
    logEvent("tengu_ccr_bundle_upload", {
      ...w,
      outcome: lit("empty_repo"),
      current_branch_only: o,
    });
    logFeatureBad("teleport_git_bundle_upload", "empty_repo");
    return {
      success: false,
      error: "Repository has no local branch, tag, or checkout to seed from yet",
      advice: COMMIT_FILES_ADVICE,
      failReason: "empty_repo",
    };
  }
  let Se =
    Fn && !o
      ? await (async () => {
          let G = {
            hardened: u,
            layout: layout_2,
            probes,
            signal: signal_2,
            ...(!u && {
              env: {
                ...GIT_LIST_ENV,
                GIT_NO_LAZY_FETCH: "1",
                ...indexFileEnv(n?.pinnedIndexFile),
              },
            }),
          };
          let Q = u ? [] : GIT_READ_CONFIG_ARGS;
          let te = await listGitRefs(cwd, [...Q, "hash-object", "-t", "tree", "--stdin"], {
            ...G,
            input: "",
          });
          let ue = await listGitRefs(
            cwd,
            [
              ...Q,
              "for-each-ref",
              `--count=${MAX_CHECKED_COMMITS + 1}`,
              "--sort=-creatordate",
              "--format=%(if)%(*objecttype)%(then)%(*objecttype)%(else)%(objecttype)%(end) %(objectname)",
              "refs/heads/",
              "refs/tags/",
            ],
            G,
          );
          let q = async (re) => {
            let we = await listGitRefs(cwd, [...Q, ...re], G);
            return we.exitCode === 1 ? true : we.exitCode === 0 || we.code === 0 ? false : null;
          };
          let ke = (re) => q(["diff-index", "--cached", "--quiet", "--ita-invisible-in-index", re, "--"]);
          let oe =
            ue.code === 0
              ? ue.stdout
                  .split(
                    `
`,
                  )
                  .flatMap((line) => {
                    let [we, P] = line.split(" ");
                    return we === "commit" && P !== undefined ? [P] : [];
                  })
              : null;
          let ot = te.code === 0 ? await ke(te.stdout.trim()) : null;
          let qe = async (re) => {
            if (re.length === 0) return false;
            let we = await ke(`${re[0]}^{tree}`);
            return we === null ? null : we ? qe(re.slice(1)) : true;
          };
          if (ot === false) return "empty";
          if (ot === null || oe === null) return "unread";
          let Me = await qe(oe.slice(0, MAX_CHECKED_COMMITS));
          if (!Me)
            return Me === null ? "unread" : oe.length > MAX_CHECKED_COMMITS ? "over_cap" : "off_branch";
          let He = await q(["--no-optional-locks", "diff-files", "--quiet", IGNORE_SUBMODULES_DIRTY_FLAG]);
          return He === null ? "worktree_unread" : He ? "unstaged" : "on_branch";
        })()
      : undefined;
  if (signal_2?.aborted) return D("ref_probe");
  if (
    Se === "off_branch" ||
    Se === "over_cap" ||
    Se === "unstaged" ||
    Se === "unread" ||
    Se === "worktree_unread"
  ) {
    logEvent("tengu_ccr_bundle_upload", {
      ...w,
      outcome: lit("empty_repo"),
      current_branch_only: o,
      unborn_staged: Se !== "unstaged" && Se !== "worktree_unread",
      unborn_index: fromEnum(Se),
    });
    logFeatureBad("teleport_git_bundle_upload", "empty_repo");
    return {
      success: false,
      error: "The current branch has no commits yet",
      advice: COMMIT_CHANGED_FILES_ADVICE,
      failReason: "empty_repo",
    };
  }
  let tt = 0;
  let M = layout_2
    ? await captureWipStash(cwd, layout_2, {
        signal: signal_2,
        probes,
        onNamesWindowsCannotHold: (G) => {
          tt = G;
        },
        onOpenRefusedAtTheLook: (files) => {
          logEvent("tengu_ccr_bundle_look_open_refused", {
            files,
          });
        },
        leaveOutUncommittedCredentialFiles: true,
        alsoLeaveOut: await combinePathMatchers(n?.withholdFor, cwd, layout_2.workTree),
        neverRead: await combinePathMatchers(n?.neverReadFor, cwd, layout_2.workTree),
        maxStagedBytes: 2 * bundleMaxBytes(),
      })
    : await createStashCommit(cwd, Nt || Zt, signal_2, n?.pinnedIndexFile);
  let Be =
    tt > 0
      ? {
          ...w,
          names_windows_cannot_hold: tt,
        }
      : w;
  if (signal_2?.aborted) return D("wip_stash");
  if (M.kind === "created" && layout_2 === undefined && n?.refuseCredentialNamedInStash === true) {
    let paths = await isFileDeleted(cwd, M.commit, signal_2, await n?.withholdFor?.(cwd));
    if (signal_2?.aborted) return D("wip_stash");
    if (paths === null || paths.length > 0) {
      logEvent("tengu_ccr_bundle_upload", {
        ...Be,
        outcome: lit("uncommitted_credentials"),
        refused_paths: paths?.length ?? 0,
        refused_unexamined: count(paths ?? [], ({ why }) => why === "unexamined"),
        refused_on: lit("stash_trees"),
      });
      logFeatureBad("teleport_git_bundle_upload", "uncommitted_credentials");
      return {
        success: false,
        error:
          paths === null
            ? "Not uploading this working tree: the uncommitted changes just captured could not be listed back, so they cannot be checked for files that must stay on this machine \u2014 retry."
            : changedPathsRefusal(paths, n?.withholdFor !== undefined),
        failReason: "uncommitted_credentials",
      };
    }
  }
  if (M.kind === "refused") {
    logForDebugging(
      `[gitBundle] Refusing to stash: ${M.refused.length} forged path(s), or credential-named path(s) that reached a built tree`,
    );
    logEvent("tengu_ccr_bundle_upload", {
      ...Be,
      outcome: lit("uncommitted_credentials"),
      credential_paths: M.refused.length,
      refused_on: fromEnum(M.decidedOn),
    });
    logFeatureBad("teleport_git_bundle_upload", "uncommitted_credentials");
    return {
      success: false,
      error: changedPathsRefusal(M.refused, n?.withholdFor !== undefined),
      failReason: "uncommitted_credentials",
    };
  }
  if (M.kind === "failed" && M.step === "path-encoding") {
    logEvent("tengu_ccr_bundle_upload", {
      ...Be,
      outcome: lit("wip_path_encoding"),
    });
    logFeatureBad("teleport_git_bundle_upload", "wip_path_encoding");
    let G =
      "A changed file in this checkout has a name \u2014 or a changed symbolic link a target \u2014 that is not valid UTF-8, which this upload cannot carry yet. Commit or rename it, then retry.";
    return {
      success: false,
      error: G,
      advice: G,
      failReason: "stash_failed",
    };
  }
  if (M.kind === "failed" && (M.step === "verify" || M.step === "refused-name" || M.step === "rewritten")) {
    logForDebugging(
      `[gitBundle] the checkout's git directory holds what git never wrote (${M.step}): ${M.detail.slice(0, 200)}`,
    );
    logEvent("tengu_ccr_bundle_upload", {
      ...Be,
      outcome: lit("wip_tampered"),
      wip_step: fromEnum(M.step),
    });
    logFeatureBad("teleport_git_bundle_upload", "wip_tampered");
    return {
      success: false,
      error:
        M.step === "verify"
          ? "Not uploading this working tree: its git directory holds an object that is not what its id names \u2014 something other than git wrote it there (`git fsck` usually names it). Nothing was uploaded; repair or re-clone the repository, then retry."
          : M.step === "rewritten"
            ? "Not uploading this working tree: the scratch copy of the index this upload works in was changed by another process while the upload ran. Nothing was uploaded; retry, and if it recurs check what else is running in this checkout."
            : `Not uploading this working tree: its git index names a path git itself refuses to write (a ".git"-like or "git~1" name) \u2014 something other than git put it there. ${DO_NOT_RUN_GIT_USE_ADVICE}`,
      failReason: "git_dir_tampered",
    };
  }
  if (M.kind === "failed" && M.step === "malformed-tree") {
    logForDebugging(
      `[gitBundle] a committed tree is stored in a form git no longer writes: ${M.detail.slice(0, 200)}`,
    );
    logEvent("tengu_ccr_bundle_upload", {
      ...Be,
      outcome: lit("wip_legacy_tree"),
    });
    logFeatureBad("teleport_git_bundle_upload", "wip_legacy_tree");
    let G = `the committed tree for ${formatDirectoryLabel(M.detail)} is stored in a form git reads but does not itself write (some old tools wrote trees this way: entries out of order, or an unknown file mode). Commit a change to any file ${M.detail === "" ? "at the top of the checkout" : "in that directory"} so git rewrites the tree, then retry.`;
    return {
      success: false,
      error: `Not uploading this working tree: ${G}`,
      advice: G,
      failReason: "stash_failed",
    };
  }
  if (M.kind === "failed" && PROBE_GIT_STEPS.includes(M.step)) {
    logForDebugging(
      `[gitBundle] could not read the checkout's uncommitted state (git ${M.step}): ${M.detail.slice(0, 200)}`,
    );
    logEvent("tengu_ccr_bundle_upload", {
      ...Be,
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
    M.kind === "failed" &&
    (M.step === "write-tree" || M.step === "read-tree") &&
    Qe &&
    M.said === "object_missing"
  ) {
    logEvent("tengu_ccr_bundle_upload", {
      ...Be,
      outcome: lit("stash_failed"),
      wip_step: fromEnum(M.step),
      current_branch_only: o,
      partial_clone: true,
    });
    logFeatureBad("teleport_git_bundle_upload", "stash_failed");
    return {
      success: false,
      error: PARTIAL_CLONE_REFUSAL,
      failReason: "git_error",
    };
  }
  if (M.kind === "failed") {
    logForDebugging(
      `[gitBundle] could not capture uncommitted changes (git ${M.step}): ${M.detail.slice(0, 200)}`,
    );
    logEvent("tengu_ccr_bundle_upload", {
      ...Be,
      outcome: lit("stash_failed"),
      wip_step: fromEnum(M.step),
      ...(M.silent && {
        wip_silent: true,
      }),
      ...(M.said !== undefined && {
        git_said: fromEnum(M.said),
      }),
      current_branch_only: o,
    });
    logFeatureBad("teleport_git_bundle_upload", "stash_failed");
    let G = u ? truncateWithCount(replaceControlChars(M.detail), MAX_DETAIL_CHARS) : M.detail;
    let Q =
      M.said === "unmerged"
        ? "This checkout has an unfinished merge or rebase (git status lists the conflicted files): resolve or abort it here first, or start the session from a branch with --ref."
        : M.said === "index_locked"
          ? "Another git process is running in this checkout; retry in a moment."
          : M.said === "object_missing"
            ? "Retry; if it stops here again, run `git fsck` in this checkout."
            : undefined;
    let te = !u
      ? M.silent
        ? "Retry; if it stops here again, run `git --version` here to see whether git starts."
        : (Q ?? COMMIT_CHANGED_FILES_ADVICE)
      : M.step === "scratch-index"
        ? "A scratch copy of the index could not be written (next to .git/index, under ~/.claude/seed-admin, or under the temporary directory); check the disk and permissions there, then retry."
        : M.step === "stage"
          ? "A changed file could not be copied for upload as it stands (too large in total, still being written, or not a plain file); commit or stash such files, then retry. If nothing here is really uncommitted (a copied or restored checkout), run git status once so git refreshes its index, then retry."
          : M.step === "check-attr"
            ? M.detail === HEAD_UNVERIFIABLE_TEXT
              ? tt > 0
                ? windowsUnsafeNamesAdvice(tt)
                : "HEAD's .gitattributes rules could not be read reliably: retry first. If it stops here again, save each committed .gitattributes above a changed file as plain UTF-8 text with no byte-order mark (one saved as UTF-16 stops it, for example, and so does one that git lists as a submodule) and commit that; or commit all your changes; or check the repository's objects (git fsck)."
              : "The attributes in force could not be vouched for: in .git/info/attributes, move any filter rules, attribute macros or quoted patterns into a .gitattributes file and shorten any line of 2,048 bytes or more (or remove .git/info/attributes), or commit your changes first, then retry."
            : (Q ?? (tt > 0 ? windowsUnsafeNamesAdvice(tt) : COMMIT_CHANGED_FILES_ADVICE));
    return {
      success: false,
      error: `Could not capture uncommitted changes (git ${M.step}: ${G}). ${te}`,
      advice: te,
      failReason: "stash_failed",
    };
  }
  let Ye = M.kind === "created";
  let Ke = M.kind === "created" || M.kind === "none" ? M.leftOut.map(({ path }) => path).sort() : [];
  let leftOutUnstable =
    M.kind === "created" || M.kind === "none" ? count(M.leftOut, ({ why }) => why === "unstable") : 0;
  let xt = M.kind === "created" ? [...M.deletedUnstaged].sort() : [];
  if (Ke.length > 0)
    logForDebugging(
      `[gitBundle] ${Ke.length} uncommitted path(s) kept out of the WIP commit (credential-named, hard-linked, filtered, or changed while read)`,
    );
  if (Ye) {
    logForDebugging(`[gitBundle] Captured WIP as stash ${M.commit}`);
    let G = layout_2 ? await gitLayoutFaultOf(layout_2, x) : null;
    if (G !== null)
      return createAndUploadGitBundle_2({
        on: "mid_build",
        fault: G,
      });
    let Q = await updateRefCommand(cwd, [seedRefNames.stash, M.commit], {
      hardened: u,
      layout: layout_2,
      probes,
      ...(u && {
        signal: signal_2,
      }),
    });
    if (Q.code !== 0)
      return signal_2?.aborted
        ? D("seed_refs")
        : seedRefHeldFailure(Q.stderr, layout_2?.adminDir, Be, {
            held_ref: lit("stash"),
            git_exit_code: Q.code,
          });
  }
  let nt = null;
  let ze = ee ? "" : generateTempFilePath("ccr-seed", ".bundle");
  try {
    if (ee) {
      try {
        nt = await BUNDLE_OUTPUT_NAME("claude-seed", De);
      } catch (error) {
        logForDebugging(`[gitBundle] no private bundle directory: ${errorMessage(error)}`);
        logEvent("tengu_ccr_bundle_upload", {
          ...Be,
          outcome: lit("git_error"),
          current_branch_only: o,
        });
        logFeatureBad("teleport_git_bundle_upload", "git_error");
        return {
          success: false,
          error: "Could not create a private directory for the bundle.",
          failReason: "git_error",
        };
      }
      ze = nt.path;
    }
    let relabelledPath = `${ze}.relabelled`;
    let Q = bundleMaxBytes();
    let shallowState = await detectShallowState(
      cwd,
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
    let q =
      shallowState === "unborn_cut"
        ? {
            ok: false,
            error:
              "The current branch has no commits yet, and the other branches of this shallow clone are cut short, so nothing here can be bundled; commit first, or deepen the clone (git fetch --unshallow)",
            failReason: "empty_repo",
          }
        : await _bundleWithFallback(cwd, ze, {
            maxBytes: Q,
            seedRefs: seedRefNames,
            relabelledPath,
            hasStash: Ye,
            ...(M.kind === "created" && {
              stashCommit: M.commit,
            }),
            leftOutCount: Ke.length,
            withheldByRules: n?.withholdFor !== undefined,
            currentBranchOnly: o,
            headResolves: Nt,
            hardened: u,
            layout: layout_2,
            signal: signal_2,
            probes,
            baseRef: n?.baseRef,
            forceScope: Qe || shallowState === "cut" ? "squashed" : n?.forceScope,
            partialClone: Qe,
            skipAllRefs: shallowState === "complete" || shallowState === "cut",
            bindJudgedStash: n?.refuseCredentialNamedInStash === true,
          });
    if (!q.ok) {
      if (u && signal_2?.aborted) return D("bundle_create");
      logForDebugging(`[gitBundle] ${q.error}`);
      let re = signal?.aborted === true;
      let we = q.heldSeedRef
        ? "seed_ref_held"
        : q.refsChanged
          ? "bundle_refs_changed"
          : (q.gitRefused ?? q.failReason);
      let P =
        we === "git_dir_tampered" && layout_2 !== undefined ? await gitLayoutFaultOf(layout_2, x) : null;
      let V = P ?? we;
      logEvent("tengu_ccr_bundle_upload", {
        ...Be,
        outcome: re ? lit("aborted") : fromEnum(V),
        max_bytes: Q,
        size_bytes: q.sizeBytes,
        current_branch_only: o,
        ...(q.failReason === "git_dir_tampered" && {
          tampered_on: lit("mid_build"),
        }),
        ...(q.heldSeedRef !== undefined && {
          held_ref: lit("root"),
          git_exit_code: q.heldSeedRef.exitCode,
        }),
        ...(q.promisorFallback && {
          promisor_fallback: true,
        }),
        ...(q.failReason === "git_error" &&
          isGitShimOnly() && {
            git_script_wrapper_only: true,
          }),
        shallow_repository: shallowState !== "not_shallow",
        shallow_head: shallowState === "cut",
        build_ms: Date.now() - now,
      });
      if (!re) logFeatureBad("teleport_git_bundle_upload", V);
      return {
        success: false,
        error: P === null ? q.error : TAMPER_MESSAGES[P],
        ...(q.failReason === "empty_repo" &&
          shallowState !== "unborn_cut" && {
            advice: COMMIT_CHANGED_FILES_ADVICE,
          }),
        failReason: q.failReason,
      };
    }
    if (n?.signal?.aborted) {
      logEvent("tengu_ccr_bundle_upload", {
        ...Be,
        outcome: lit("aborted"),
        max_bytes: Q,
        current_branch_only: o,
        build_ms: Date.now() - now,
      });
      return {
        success: false,
        error: "Bundle cancelled",
      };
    }
    logEvent("tengu_ccr_bundle_built", {
      scope: fromEnum(q.scope),
      size_bytes: q.size,
      has_wip: Ye,
      current_branch_only: o,
      build_ms: Date.now() - now,
    });
    n?.onBundled?.({
      sizeBytes: q.size,
      scope: q.scope,
    });
    let ke;
    let oe;
    if (ee) {
      let bundleFile = await readBundleFileSafely(q.path, Q);
      if (bundleFile.kind !== "read") {
        let we =
          bundleFile.kind === "too_large"
            ? `bundle grew to ${bundleFile.sizeBytes} bytes`
            : bundleFile.detail;
        logForDebugging(`[gitBundle] bundle unreadable after create: ${we}`);
        logEvent("tengu_ccr_bundle_upload", {
          ...Be,
          outcome: lit("git_error"),
          max_bytes: Q,
          current_branch_only: o,
        });
        logFeatureBad("teleport_git_bundle_upload", "git_error");
        return {
          success: false,
          error: `The bundle could not be read back for upload (${truncateWithCount(replaceControlChars(we), 200)}).`,
          failReason: "git_error",
        };
      }
      ke = bundleFile.content;
    }
    let ot = Fe("before_upload");
    if (ot !== null) return ot;
    if (ke !== undefined) {
      let now = Date.now();
      let we = await verifyBundleFile(
        ke,
        {
          scratchRoot: dirname(q.path),
        },
        (P, V) =>
          listGitRefs(cwd, P, {
            hardened: u,
            layout: layout_2,
            probes,
            signal,
            ...V,
          }),
      );
      oe = Date.now() - now;
      if (!we.ok) {
        if (signal?.aborted) return D("bundle_check");
        logForDebugging(`[gitBundle] the bundle failed its check (${we.kind}): ${we.detail}`);
        let P = bundleReadBackFailure(we.kind, truncateWithCount(replaceControlChars(we.detail), 200));
        logEvent("tengu_ccr_bundle_upload", {
          ...Be,
          outcome: fromEnum(P.outcome),
          check_failure: fromEnum(we.kind),
          check_ms: oe,
          size_bytes: q.size,
          scope: fromEnum(q.scope),
          current_branch_only: o,
          has_wip: Ye,
          ...(q.promisorFallback && {
            promisor_fallback: true,
          }),
          shallow_repository: shallowState !== "not_shallow",
          shallow_head: shallowState === "cut",
        });
        logFeatureBad("teleport_git_bundle_upload", P.outcome);
        return {
          success: false,
          error: P.error,
          failReason: P.failReason,
        };
      }
    }
    if (!u && n?.refuseCredentialNamedInStash === true) {
      let plantedObjectStore = await findPlantedObjectStore(cwd);
      if (plantedObjectStore !== null) {
        logEvent("tengu_ccr_bundle_upload", {
          ...Be,
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
    let Me = await uploadFileFromPath(q.path, "_source_seed.bundle", e, {
      signal,
      ...(ke !== undefined && {
        content: ke,
      }),
      expiresInSeconds: UPLOAD_URL_EXPIRES_SECONDS,
    });
    let uploadMs = Date.now() - now_2;
    if (!Me.success) {
      let re = n?.signal?.aborted === true;
      logEvent("tengu_ccr_bundle_upload", {
        ...Be,
        outcome: re ? lit("aborted") : lit("failed"),
        upload_error_type: fromEnum(Me.reason),
        size_bytes: q.size,
        scope: fromEnum(q.scope),
        current_branch_only: o,
        ...(q.promisorFallback && {
          promisor_fallback: true,
        }),
        shallow_repository: shallowState !== "not_shallow",
        shallow_head: shallowState === "cut",
        upload_ms: uploadMs,
      });
      if (!re) logFeatureBad("teleport_git_bundle_upload", "upload_failed");
      return {
        success: false,
        error: Me.error,
        failReason: "upload_failed",
      };
    }
    logForDebugging(`[gitBundle] Uploaded ${Me.size} bytes`);
    logEvent("tengu_ccr_bundle_upload", {
      ...Be,
      outcome: lit("success"),
      size_bytes: Me.size,
      scope: fromEnum(q.scope),
      has_wip: Ye,
      current_branch_only: o,
      ...(Se !== undefined && {
        unborn_index: fromEnum(Se),
      }),
      ...(u && {
        credential_paths_left_out: Ke.length,
        left_out_unstable: leftOutUnstable,
        deleted_unstaged: xt.length,
        partial_clone: Qe,
        withhold_rules: n?.withholdFor !== undefined,
        linked_worktree: layout_2?.checkout === "linked",
        ...(layout_2?.workTreeRespelled && {
          work_tree_respelled: true,
        }),
        ...(layout_2?.worktreeConfig === "inert" && {
          worktree_check: lit("inert_config"),
        }),
        private_admin_dir: layout_2?.adminDir !== undefined,
      }),
      ...(q.promisorFallback && {
        promisor_fallback: true,
      }),
      shallow_repository: shallowState !== "not_shallow",
      shallow_head: shallowState === "cut",
      upload_ms: uploadMs,
      ...(oe !== undefined && {
        check_ms: oe,
      }),
      ...false,
    });
    if (q.scope === "head" && !o) logFeatureSad("teleport_git_bundle_upload", "fallback_head");
    else if (q.scope === "squashed") logFeatureSad("teleport_git_bundle_upload", "fallback_squashed");
    else logFeatureOk("teleport_git_bundle_upload");
    logBundleStartLocation(classifyCheckoutStart(layout_2));
    return {
      success: true,
      fileId: Me.fileId,
      bundleSizeBytes: Me.size,
      scope: q.scope,
      hasWip: Ye,
      ...(u && {
        leftOut: Ke,
        ...(xt.length > 0 && {
          deletedHere: xt,
        }),
        ...(q.scope === "squashed"
          ? {
              seedCommit: q.rootCommit,
            }
          : M.kind === "created" && {
              seedCommit: M.commit,
            }),
      }),
    };
  } finally {
    if (ze !== "") {
      try {
        await unlink(ze);
      } catch {
        logForDebugging(`[gitBundle] Could not delete ${ze} (non-fatal)`);
      }
      await unlink(`${ze}.lock`).catch(() => {});
      await unlink(`${ze}.relabelled`).catch(() => {});
    }
    await nt?.dispose();
    if (!layout_2 || (await isGitLayoutUntampered(layout_2, x)))
      for (let G of x)
        await updateRefCommand(cwd, ["-d", G], {
          hardened: u,
          layout: layout_2,
          probes,
        });
  }
}
//@ chunk-gjx0rh1b.js:166897-167051 placement
async function hasPartialCloneConfig(e, layout, signal, probes) {
  let s = await listGitRefs(e, ["config", "-z", "--list"], {
    hardened: true,
    layout,
    signal,
    probes,
  });
  if (s.code !== 0) return true;
  return configListHasPartialClone(s.stdout);
}
//@ chunk-gjx0rh1b.js:167051-167349 placement
function configListHasPartialClone(stdout) {
  return stdout.split("\x00").some((n) => {
    let index = n.indexOf(`
`);
    let o = index === -1 ? n : n.slice(0, index);
    let s = index === -1 ? "true" : n.slice(index + 1);
    return (
      o === "extensions.partialclone" ||
      /^remote\..*\.partialclonefilter$/s.test(o) ||
      (/^remote\..*\.promisor$/s.test(o) && !["false", "no", "off", "0", ""].includes(s.toLowerCase()))
    );
  });
}
//@ chunk-gjx0rh1b.js:167349-167416 placement
function updateRefCommand(e, n, r) {
  return listGitRefs(e, ["update-ref", "--no-deref", ...n], r);
}
//@ chunk-gjx0rh1b.js:167416-167635 placement
var COMMIT_FILES_ADVICE =
  'Commit the files that you want the cloud session to see (git add <file>, then git commit -m "initial"), then retry.';
var COMMIT_CHANGED_FILES_ADVICE =
  "Commit the files that you changed by name (git add <file>, then git commit), then retry.";
//@ chunk-gjx0rh1b.js:167635-167894 placement
function windowsUnsafeNamesAdvice(e) {
  return `${COMMIT_CHANGED_FILES_ADVICE} Do not run \`git add .\` or \`git commit -a\` here: this checkout tracks ${e} file ${e === 1 ? "name" : "names"} that Windows cannot hold, which git lists as deleted, and either command would record the ${e === 1 ? "deletion" : "deletions"}.`;
}
//@ chunk-gjx0rh1b.js:167894-167988 placement
async function holdIdOfPath(e, n) {
  let r = await e.hold(n);
  return r === "not_held" ? getFileIdentity_2(n) : r === "gone" ? null : r.id;
}
//@ chunk-gjx0rh1b.js:167988-168126 placement
async function combinePathMatchers(e, n, workTree) {
  if (e === undefined) return;
  let results = await Promise.all((toPosixSpelling(n) === workTree ? [n] : [n, workTree]).map((s) => e(s)));
  return (s) => results.some((l) => l(s));
}
//@ chunk-gjx0rh1b.js:168126-168563 placement
function createAndUploadGitBundle_2(e) {
  let wipStashSha =
    e.on === "mid_build"
      ? e.fault
      : e.on === "root_at_layout_read"
        ? "work_tree_replaced"
        : "git_dir_tampered";
  let r = TAMPER_MESSAGES[wipStashSha];
  logForDebugging(`[gitBundle] ${r}`);
  logEvent("tengu_ccr_bundle_upload", {
    hardened: true,
    outcome: fromEnum(wipStashSha),
    tampered_on: fromEnum(e.on),
    ...(e.on === "changed_under_hold" && {
      hold_unopened: e.unopened,
    }),
    ...(e.on === "root_at_layout_read" && {
      folder_read: fromEnum(e.folderRead),
    }),
  });
  logFeatureBad("teleport_git_bundle_upload", wipStashSha);
  return {
    success: false,
    error: r,
    failReason: "git_dir_tampered",
  };
}
//@ chunk-gjx0rh1b.js:168563-168739 placement
function seedRefHeldFailure(stderr, privateGitDir, r, o) {
  let s = seedRefWriteFailure(stderr, privateGitDir);
  logEvent("tengu_ccr_bundle_upload", {
    ...r,
    outcome: lit("seed_ref_held"),
    ...o,
  });
  logFeatureBad("teleport_git_bundle_upload", "seed_ref_held");
  return {
    success: false,
    ...s,
  };
}
//@ chunk-gjx0rh1b.js:168739-169445 placement
/**
 * 生成写临时 seed 引用失败时的错误说明。
 */
function seedRefWriteFailure(stderr, privateGitDir) {
  logForDebugging(`[gitBundle] could not update a temporary seed ref: ${stderr.slice(0, 200)}`);
  let r = truncateWithCount(replaceControlChars(getFirstLine(stderr.trim())), MAX_DETAIL_CHARS);
  return {
    error:
      privateGitDir !== undefined
        ? `Could not write a temporary ref in the private git directory that this upload builds in (${r}). Retry; if it keeps failing, check that ${displayName(dirname(privateGitDir))} is writable and its disk has room.`
        : `Could not write the temporary ref this upload uses under .git/refs/seed (${r}). If another git process is running here, let it finish, then retry; if it keeps failing, check that this checkout\u2019s git directory is writable and its disk has room. If it fails even so, something that git did not put there may be in the way at .git/refs/seed. ${DO_NOT_RUN_GIT_USE_ADVICE}`,
    failReason: "git_error",
  };
}
//@ chunk-gjx0rh1b.js:169445-170060 placement
/**
 * git 目录在准备上传期间被改动时的拒绝文案。
 */
var GIT_DIR_TAMPERED_MESSAGE =
  "Not uploading this working tree: its git directory changed while the upload was being prepared, holds something git itself never puts there, or could not be inspected \u2014 another git process (a background fetch or gc) may have written packs meanwhile, in which case let it finish and retry; otherwise look for a commondir or objects/info/alternates file, or a link, special or unreadable entry where its branches, tags, HEAD, the temporary refs/seed entries, their logs, or objects go (commondir, refs/heads, refs/tags, refs/seed, logs/refs/seed, logs/HEAD, objects/info, objects/pack) before retrying.";
//@ chunk-gjx0rh1b.js:170060-170121 placement
function gitDirTamperedResult() {
  return {
    error: GIT_DIR_TAMPERED_MESSAGE,
    failReason: "git_dir_tampered",
  };
}
//@ chunk-gjx0rh1b.js:170121-175866 placement
/**
 * git 目录内文件不是普通文件时的文案片段与各类篡改提示文本。
 */
var NOT_PLAIN_FILE_PHRASE =
  "is not one plain file: it is a link, has a second name (a hard link, as tools that merge identical files make), is a folder or a special file, is missing where git needs it, or could not be examined. Git normally writes a plain file with one name there. Check with ls -l: a link shows an arrow (->), and the number after the permissions counts the names. If it is a plain file and that number is above 1, copy the file, move the copy over it (cp, then mv; git reads the copy the same), and retry. If it is anything else, start from a fresh clone of the repository instead (your uncommitted changes stay in this folder); where git itself writes links there (its core.preferSymlinkRefs setting), switch that setting off first.";
var TAMPER_MESSAGES = {
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
var GIT_REFUSAL_MESSAGES = {
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
export { probeRepoBundleSize };

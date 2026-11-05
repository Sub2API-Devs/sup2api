/**
 * commands/ultrareview/ultrareviewEval.ts
 *
 * claude ultrareview eval：解析 PR 目标与费用上限、检查并启动云端审查、输出 JSON 与结果摘要（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gsmkwtjh.js (15)
 * attribution: placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { mkdtemp, mkdir, writeFile, readdir, rm } from "fs/promises";
import { join, relative, resolve, isAbsolute, sep } from "path";
import { createReadStream } from "fs";
import { plural, toWellFormedString } from "../../utils/stringUtils.js";
import { formatCurrency } from "../../services/api/referral.js";
import { MIN_CONFIRM_ANSWER_DELAY_MS, confirmPrompt } from "../../utils/confirmPrompt.js";
import { isOnClaudeCodeSessionSurface } from "../../utils/teammate.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, array, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  isGithubDotCom,
  sameHost,
  GITHUB_HOST,
  HOST_LABEL_RE,
  normalizeHost,
  REPO_NAME_RE,
} from "../../utils/git/githubUrl.js";
import { whichOnPath } from "../../utils/which.js";
import { env } from "../../utils/env.js";
import { execFileNoThrow, execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { safeParseJSON } from "../../utils/json.js";
import {
  truncateForReport,
  MIN_LINE,
  writeJsonFile,
  runUltrareview as runUltrareview_2,
  ENDED_WITHOUT_REASON,
  redactText,
} from "../review/ultrareviewRun.js";
import {
  diffSizeLimits,
  typicalUltrareviewCost,
  getReviewCostNote,
  getReviewDurationNote,
  isUltrareviewEvalEnabled,
} from "../review/ultrareviewPreconditions.js";
import { tmpdir } from "../../utils/tempDir.js";
import { getRemoteHostSessionCount } from "../insights.js";
import { gitExe, getGitSshEnv } from "../../utils/git.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../../utils/git/gitSafeEnv.js";
import { SAFE_UPLOAD_PACK_ARG_2 } from "../../utils/gitSafeExec.js";
import { parseShortstat } from "../../utils/gitDiff.js";
import { logForDebugging } from "../../utils/debug.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { getErrnoCode } from "../../utils/errors.js";
import { createSemaphore } from "../../utils/concurrencyLimit.js";
import { INVISIBLE_CHAR_CLASSES } from "../../utils/sanitization.js";
import { quotedPrintable } from "../../utils/printableName.js";
import { parsePrUrl } from "../../utils/ghPrStatus.js";
import {
  hasWorkspaceTrust,
  allowFlagFetchOnOwnCredential,
  initializeGrowthBook,
} from "../../services/analytics/growthbook.js";
import {
  cliError,
  cliErrorAfterAnalyticsFlush,
  printCliError,
  exitAfterAnalyticsFlush,
  writeStdoutAndDrain,
} from "../../cli/exit.js";
import { waitForPolicyLimitsToLoad } from "../../services/policyLimits/PolicyLimitsClient.js";
import { policyDeniedReason, policyDenyKind } from "../../services/policyLimits/policyEvidence.js";
import { logOrgPolicyDeniedAsync } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import {
  logFeatureSadAsync,
  logFeatureBadAsync,
  logFeatureOkAsync,
} from "../../services/analytics/featureTelemetry.js";
import { getClaudeConfigDirOrNull } from "../../utils/envUtils.js";
import { stopCapturingEarlyInput } from "../../utils/earlyInput.js";
import { setRawModeSafe } from "../../ink/setRawModeSafe.js";
import { checkHasTrustDialogAccepted } from "../../utils/config.js";
import { detectCurrentRepositoryWithHost } from "../../utils/detectRepository.js";
import { fetchUltrareviewPreflight } from "../review/reviewRemote.js";
import { createAbortController } from "../../utils/abortController.js";
import { markPrintModeSignalHandlersRegistered } from "../../utils/gracefulShutdown.js";
import { canPromptForWorkspaceTrust } from "../../bridge/workspaceTrustPrompt.js";
import { readUsageCredits } from "../review/ultrareviewUsageCredits.js";
import { registerCleanup, registerPreExitFlush } from "../../utils/cleanupRegistry.js";
import { countWhere } from "../../utils/collections.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { markStdoutDrainExternallyClocked } from "../../utils/process.js";

//@ chunk-gsmkwtjh.js:14019-16399 placement
/**
 * ultrareview 的启动摘要：列出将要审查的 PR、说明上限与费用估算，以及没被排上的部分。
 */
function buildUltrareviewNotice({
  toReview,
  starts,
  maxCostGiven,
  leftOut,
  typicalCostUsd,
  costNote,
  creditsLeftCents,
  atOnce,
  launchingAtOnce,
  durationNote,
  giveUpAfter,
}) {
  let reviewCount = toReview.length;
  let lines = [];
  if (reviewCount > 0) {
    lines.push(
      starts < reviewCount
        ? `To be reviewed, in this order until ${starts} ${plural(starts, "has", "have")} started:`
        : "To be reviewed:",
    );
    for (let pullRequest of toReview) lines.push(`  ${pullRequest}`);
  }
  if (leftOut.length > 0) {
    lines.push(
      reviewCount === 0
        ? `Nothing was started: ${leftOut.length === 1 ? "your pull request can't be reviewed" : `none of your ${leftOut.length} pull requests can be reviewed`}:`
        : `${leftOut.length} of your ${reviewCount + leftOut.length} pull requests ${plural(leftOut.length, "is", "are")} left out:`,
    );
    for (let pullRequest of leftOut) lines.push(`  ${pullRequest.name}: ${pullRequest.why}`);
  }
  if (reviewCount === 0)
    return `${lines.join(`
`)}
`;
  lines.push(
    starts === 1
      ? "This runs 1 review, at the cost of one ultrareview."
      : `This runs ${starts} reviews: about ${starts} times the cost of one ultrareview.`,
    typicalCostUsd === null
      ? `Rough estimate: ${starts === 1 ? "" : `${starts} times `}${costNote}.`
      : `Rough estimate: ${formatCurrency(starts * typicalCostUsd * 100, "USD", "whole")} USD. One review usually costs ${costNote}, and a large pull request costs more.`,
  );
  if (maxCostGiven && typicalCostUsd !== null) {
    let maxCostText = formatCurrency(typicalCostUsd * 100, "USD", "whole");
    lines.push(
      `${starts < reviewCount ? `--max-cost covers ${starts} of the ${reviewCount} reviews that could run, at ${maxCostText} each, so no more than ${starts} will start.` : `--max-cost counts each review at ${maxCostText}, so it holds none back.`} The bill can still go over --max-cost.`,
    );
  }
  if (
    typicalCostUsd !== null &&
    creditsLeftCents !== null &&
    creditsLeftCents < starts * typicalCostUsd * 100
  ) {
    let creditsText =
      creditsLeftCents < 100
        ? "Less than $1"
        : `About ${formatCurrency(Math.floor(creditsLeftCents / 100) * 100, "USD", "whole")}`;
    let floored = Math.floor(creditsLeftCents / (typicalCostUsd * 100));
    lines.push(
      `${creditsText} of usage credits left: ${floored === 0 ? "less than one review usually costs" : `enough for about ${floored} of these ${starts}`}. A review stops if credits run out.`,
    );
  }
  if (starts > 1) {
    let batches = Math.ceil(starts / atOnce);
    lines.push(
      `One review takes ${durationNote}. ${batches === 1 ? `${starts === 2 ? "Both" : `All ${starts}`} run at the same time, so the run takes about that long.` : `${atOnce} ${plural(atOnce, "runs", "run")} at a time, so all ${starts} take about ${batches} times that.`}${Math.min(starts, atOnce) > launchingAtOnce ? ` Their repositories are copied and uploaded ${launchingAtOnce} at a time, which adds to that.` : ""}`,
    );
  }
  if (starts > Math.max(giveUpAfter.neighbours, Math.min(atOnce, launchingAtOnce)))
    lines.push(
      `If ${giveUpAfter.neighbours} reviews next to each other in the list${starts > giveUpAfter.sinceSuccess ? `, or ${giveUpAfter.sinceSuccess} with no success in between,` : ""} give no result, no more start.${atOnce === 1 ? "" : ` Those already running, up to ${Math.min(starts - 1, atOnce)}, are still billed.`}`,
    );
  lines.push(
    `${starts === 1 ? "The review" : "Each review"} uploads all the files of its repository, not just the changes, to a cloud session of the Claude account signed in on this computer.`,
  );
  return `${lines.join(`
`)}
`;
}
//@ chunk-gsmkwtjh.js:16399-17312 placement
/**
 * 判断当前 shell 能否就地确认费用：在 Claude Code 会话、CI/演示模式里都拒绝并给出该怎么跑。
 */
async function confirmUltrareviewStart({
  notice,
  starts,
  canPrompt,
  signal,
  input,
  answerGraceMs = MIN_CONFIRM_ANSWER_DELAY_MS,
}) {
  if (isOnClaudeCodeSessionSurface())
    return {
      start: false,
      reason: "in_session",
      message: `${notice}Nothing was started: this shell looks like part of a Claude Code session, and only a person can accept the cost. To accept it, a person should run this in a new terminal window, outside Claude Code and any tmux or screen that it started.`,
    };
  if (!canPrompt)
    return {
      start: false,
      reason: "no_prompt",
      message: `${notice}Nothing was started: this run can't ask you to accept the cost, because it is in CI or in demo mode (IS_DEMO), or its input or output isn't a terminal. Run it yourself in a terminal, with no pipes and with CI and IS_DEMO unset, and answer the question.`,
    };
  process.stdout.write(notice);
  return (await confirmPrompt(`Start ${starts} ${plural(starts, "review")}?`, input, {
    ignoreAnswersWithinMs: answerGraceMs,
    reaskPreamble: notice,
    signal,
  }))
    ? {
        start: true,
      }
    : {
        start: false,
        reason: "declined",
        message: "Nothing was started, so nothing is billed.",
      };
}
//@ chunk-gsmkwtjh.js:17312-17462 placement
var GH_TIMEOUT_MS = 1e4;
var PullRequestSchema = DoctorLazy(() =>
  objectSchema({
    state: stringSchema(),
    mergeCommit: objectSchema({
      oid: stringSchema(),
    }).nullable(),
    commits: array(
      objectSchema({
        authoredDate: stringSchema(),
      }),
    ),
    additions: numberSchema(),
    deletions: numberSchema(),
    changedFiles: numberSchema(),
  }),
);
//@ chunk-gsmkwtjh.js:17462-19311 placement
/**
 * 用 gh CLI 取 PR 的合并状态、提交、增删行与改名文件数，处理非 github 主机、未登录、超时。
 */
async function lookUpPullRequest(pullRequest, currentRepository, abortSignal) {
  let { host, owner, name: repoName } = pullRequest.repository;
  if (!isGithubDotCom(host) && !sameHost(host, currentRepository?.host))
    return {
      kind: "left_out",
      why: `its host, ${host}, isn't github.com, so run this from a clone of a repository on that host, in a folder you trust`,
    };
  let ghPath = whichOnPath("gh", env.PATH ?? "");
  if (ghPath === null)
    return {
      kind: "gh_missing",
    };
  let { stdout, stderr, code, error, timedOut } = await execFileNoThrow(
    ghPath,
    [
      "pr",
      "view",
      String(pullRequest.number),
      "--repo",
      `${host}/${owner}/${repoName}`,
      "--json",
      "state,mergeCommit,commits,additions,deletions,changedFiles",
    ],
    {
      timeout: GH_TIMEOUT_MS,
      preserveOutputOnError: true,
      abortSignal,
    },
  );
  if (error?.startsWith("Command failed with ENOENT") || code === 127)
    return {
      kind: "gh_missing",
    };
  if (timedOut)
    return {
      kind: "left_out",
      why: "GitHub did not answer in time, so try it again",
    };
  let info = PullRequestSchema().safeParse(code === 0 ? safeParseJSON(stdout, false) : null).data;
  if (info === undefined) {
    let lastErrorLine = truncateForReport(
      stderr
        .trim()
        .split(
          `
`,
        )
        .at(-1) ?? "",
    );
    return {
      kind: "left_out",
      why: stderr.includes("gh auth login")
        ? "the GitHub CLI is not signed in (run gh auth login)"
        : lastErrorLine === ""
          ? "the GitHub CLI could not look it up and gave no reason"
          : `the GitHub CLI could not look it up: ${lastErrorLine}`,
    };
  }
  if (info.state !== "MERGED")
    return {
      kind: "left_out",
      why: info.state === "OPEN" ? "it is still open" : "it was closed without being merged",
    };
  let oid = info.mergeCommit?.oid ?? "";
  if (!/^[0-9a-f]{40}$/.test(oid))
    return {
      kind: "left_out",
      why: "GitHub shows no merge commit for it, so there's no commit to review",
    };
  let { maxFiles, maxLines } = diffSizeLimits();
  let changedLines = info.additions + info.deletions;
  if (info.changedFiles > maxFiles || changedLines > maxLines)
    return {
      kind: "left_out",
      why: `it is too large for ultrareview (${info.changedFiles.toLocaleString("en-US")} ${plural(info.changedFiles, "file")}, ${changedLines.toLocaleString("en-US")} ${plural(changedLines, "line")}; the limit is ${maxFiles.toLocaleString("en-US")} ${plural(maxFiles, "file")} and ${maxLines.toLocaleString("en-US")} ${plural(maxLines, "line")})`,
    };
  return {
    kind: "merged",
    mergeCommit: oid,
    commitAuthorTimes: info.commits.map((commit) => Date.parse(commit.authoredDate) / 1000),
    changedFiles: info.changedFiles,
    additions: info.additions,
    deletions: info.deletions,
  };
}
//@ chunk-gsmkwtjh.js:19429-19459 placement
var COPY_TIMEOUT_MS = 180000;
var COPY_STEP_TIMEOUT_MS = 30000;
var MAX_COPY_CONCURRENCY = 100;
//@ chunk-gsmkwtjh.js:19459-22276 placement
/**
 * 把目标仓库做成临时浅克隆：init、写 template、sparse-checkout 与 fetch，供本地审查评估用。
 */
async function copyPullRequest(
  pullRequest,
  { mergeCommit, commitAuthorTimes, changedFiles, additions, deletions },
  abortSignal,
) {
  let copyFailed = {
    kind: "left_out",
    why: "a temporary copy of it could not be made",
  };
  let scratchDir;
  let succeeded = false;
  try {
    scratchDir = await mkdtemp(join(tmpdir(), "claude-ultrareview-eval-"));
    let repoDir = join(scratchDir, "repository");
    let gitOpts = {
      cwd: repoDir,
      env: getRemoteHostSessionCount({
        GIT_DEFAULT_HASH: "sha1",
        GIT_DEFAULT_REF_FORMAT: "files",
      }),
      timeout: COPY_STEP_TIMEOUT_MS,
      preserveOutputOnError: true,
      abortSignal,
    };
    let initResult = await execFileNoThrowWithCwd(gitExe(), ["init", "--quiet", "--template=", repoDir], {
      ...gitOpts,
      cwd: scratchDir,
    });
    if (initResult.error?.startsWith("Command failed with ENOENT") || initResult.code === 127)
      return {
        kind: "git_missing",
      };
    if (initResult.code !== 0) return copyFailed;
    await mkdir(join(repoDir, ".git", "info"), {
      recursive: true,
    });
    await writeFile(
      join(repoDir, ".git", "info", "sparse-checkout"),
      `!/*
`,
    );
    for (let gitArgs of [
      ["config", "core.sparseCheckout", "true"],
      ["config", "core.sparseCheckoutCone", "false"],
      ["remote", "add", "origin", pullRequest],
    ])
      if ((await execFileNoThrowWithCwd(gitExe(), gitArgs, gitOpts)).code !== 0) return copyFailed;
    let fetchOpts = {
      ...gitOpts,
      ...(await getGitSshEnv(repoDir)),
      timeout: COPY_TIMEOUT_MS,
    };
    let { host } = new URL(pullRequest);
    let fetchArgs = [
      ...GIT_SAFE_GLOBAL_ARGS,
      ...(host === ""
        ? []
        : [
            "-c",
            `credential.https://${host}.helper=`,
            "-c",
            `credential.https://${host}.helper=!gh auth git-credential`,
            "-c",
            `credential.https://${host}.username=`,
          ]),
      "fetch",
      SAFE_UPLOAD_PACK_ARG_2,
      "--quiet",
      "--no-tags",
      "--no-recurse-submodules",
    ];
    let fetchResult = await execFileNoThrowWithCwd(
      gitExe(),
      [...fetchArgs, "--depth=2", "origin", mergeCommit],
      fetchOpts,
    );
    let [, parentCommit, secondParent] = (
      await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "rev-list", "--parents", "--max-count=1", mergeCommit],
        gitOpts,
      )
    ).stdout
      .trim()
      .split(" ");
    let baseCommit = parentCommit;
    let commitCount = commitAuthorTimes.length;
    if (fetchResult.code === 0 && secondParent === undefined && commitCount > 1) {
      if (commitCount >= MAX_COPY_CONCURRENCY)
        return {
          kind: "left_out",
          why: "it has too many commits to tell what it merged into",
        };
      fetchResult = await execFileNoThrowWithCwd(
        gitExe(),
        [...fetchArgs, `--depth=${commitCount + 1}`, "origin", mergeCommit],
        fetchOpts,
      );
      if (
        (
          await execFileNoThrowWithCwd(
            gitExe(),
            [...GIT_SAFE_GLOBAL_ARGS, "log", "--format=%at", `--max-count=${commitCount}`, mergeCommit],
            gitOpts,
          )
        ).stdout
          .trim()
          .split(
            `
`,
          )
          .reverse()
          .join() === commitAuthorTimes.join()
      )
        baseCommit = (
          await execFileNoThrowWithCwd(
            gitExe(),
            [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--verify", "--quiet", `${mergeCommit}~${commitCount}`],
            gitOpts,
          )
        ).stdout.trim();
    }
    if (fetchResult.code !== 0) {
      let fetchErrorLine = truncateForReport(
        fetchResult.stderr
          .trim()
          .split(
            `
`,
          )
          .at(-1) ?? "",
      );
      return {
        kind: "left_out",
        why: fetchResult.timedOut
          ? "git did not fetch its merge commit in time"
          : `git could not fetch its merge commit${fetchErrorLine === "" ? "" : `: ${fetchErrorLine}`}`,
      };
    }
    if (baseCommit === undefined || !/^[0-9a-f]{40}$/.test(baseCommit))
      return {
        kind: "left_out",
        why: "the commit that it merged into could not be found",
      };
    if (
      (
        await execFileNoThrowWithCwd(
          gitExe(),
          [...GIT_SAFE_GLOBAL_ARGS, "checkout", "--quiet", "-b", "ultrareview-eval", mergeCommit],
          gitOpts,
        )
      ).code !== 0 ||
      (await readdir(repoDir)).join() !== ".git"
    )
      return copyFailed;
    let diffResult = await execFileNoThrowWithCwd(
      gitExe(),
      [
        ...GIT_SAFE_GLOBAL_ARGS,
        "diff",
        "--no-ext-diff",
        "--no-textconv",
        "--diff-algorithm=myers",
        "--find-renames",
        "--ignore-submodules=none",
        "--shortstat",
        baseCommit,
        mergeCommit,
      ],
      gitOpts,
    );
    if (diffResult.code !== 0) return copyFailed;
    let shortstat = parseShortstat(diffResult.stdout);
    if (shortstat === null)
      return {
        kind: "left_out",
        why: "it changes no files",
      };
    if (
      shortstat.filesCount !== changedFiles ||
      shortstat.linesAdded !== additions ||
      shortstat.linesRemoved !== deletions
    )
      return {
        kind: "left_out",
        why: "what it changed could not be worked out: the diff here does not match GitHub's count",
      };
    succeeded = true;
    return {
      kind: "ready",
      root: scratchDir,
      repository: repoDir,
      base: baseCommit,
    };
  } catch (error) {
    logForDebugging(`ultrareview eval: no scratch repository: ${error}`);
    return copyFailed;
  } finally {
    if (!succeeded && scratchDir !== undefined)
      await rm(scratchDir, {
        recursive: true,
        force: true,
        maxRetries: 3,
      }).catch((error) => logForDebugging(`ultrareview eval: could not remove ${scratchDir}: ${error}`));
  }
}
//@ chunk-gsmkwtjh.js:22276-22605 placement
/**
 * ultrareview 中止阈值常量与对应文案：连续 3 个审查无结果或 10 个无成功即停止、被停止、找不到 git。
 */
var MAX_REVIEWS = 20;
var LOOKUP_CONCURRENCY = 5;
var GIVE_UP_NEIGHBOURS = 3;
var GIVE_UP_SINCE_SUCCESS = 10;
var GAVE_UP_MESSAGE = `Not started: ${GIVE_UP_NEIGHBOURS} reviews next to each other in the list, or ${GIVE_UP_SINCE_SUCCESS} with no success in between, gave no result or could not launch, so the run started no more. Check why, then run this one again.`;
var STOPPED_MESSAGE = "Not started: the run was stopped.";
var GIT_MISSING_MESSAGE = "Not started: git was not found. Install it and run this again.";
//@ chunk-gsmkwtjh.js:22605-27546 placement
/**
 * ultrareview eval 的主流程：解析目标与费用上限、检查并启动审查、被信号中止时收尾，失败时给出 not_started 类说明。
 */
async function runUltrareview({
  targets,
  currentRepository,
  reportPath,
  maxCostUsd,
  canPrompt,
  creditsLeftCents,
  signal,
}) {
  let typicalCostUsd = typicalUltrareviewCost();
  let affordable =
    maxCostUsd === null ? 1 / 0 : typicalCostUsd === null ? 0 : Math.floor(maxCostUsd / typicalCostUsd);
  if (affordable === 0)
    return {
      kind: "not_started",
      reason: "max_cost_unusable",
      message:
        typicalCostUsd === null
          ? "Nothing was started: --max-cost can't be applied, because no typical review cost is known for this account. Run this again without --max-cost."
          : `Nothing was started: --max-cost is below what one review usually costs, about $${typicalCostUsd}. Raise it, or run this again without it.`,
    };
  let min = Math.min(
    MAX_REVIEWS,
    affordable,
    typicalCostUsd === null || creditsLeftCents === null
      ? 1 / 0
      : Math.max(1, Math.floor(creditsLeftCents / (typicalCostUsd * 100))),
  );
  let lookedUp = await pMap(targets, (target) => lookUpPullRequest(target, currentRepository, signal), {
    concurrency: LOOKUP_CONCURRENCY,
  });
  if (signal.aborted)
    return {
      kind: "not_started",
      reason: "stopped",
      message: "Stopped. Nothing was started, so nothing is billed.",
    };
  if (lookedUp.some((entry) => entry.kind === "gh_missing"))
    return {
      kind: "not_started",
      reason: "gh_missing",
      message:
        "Nothing was started: gh, the GitHub CLI, was not found. Install it, run gh auth login, then run this again.",
    };
  let toReview = [];
  let leftOut = [];
  let starts = [];
  let seenCommits = new Map();
  let repeats = 0;
  for (let [index, target] of targets.entries()) {
    let { host, owner, name: repoName } = target.repository;
    let lookup = lookedUp[index];
    let label = `${owner}/${repoName}#${target.number}`;
    let commitKey = lookup?.kind === "merged" ? `${host}/${lookup.mergeCommit}#${target.number}` : "";
    let duplicateOf = seenCommits.get(commitKey);
    let leftOutReason =
      lookup?.kind === "left_out"
        ? lookup.why
        : duplicateOf === undefined
          ? ""
          : `it is the same pull request as ${duplicateOf}`;
    let url = `https://${host}/${owner}/${repoName}/pull/${target.number}`;
    if (leftOutReason === "") {
      seenCommits.set(commitKey, label);
      toReview.push(url);
    } else {
      repeats += duplicateOf === undefined ? 0 : 1;
      leftOut.push({
        name: label,
        why: leftOutReason,
      });
    }
    starts.push({
      url,
      repository: `${owner}/${repoName}`,
      number: target.number,
      base_commit: null,
      head_commit: lookup?.kind === "merged" ? lookup.mergeCommit : null,
      session_id: null,
      outcome: leftOutReason === "" ? "pending" : "not_started",
      outcome_detail: leftOutReason === "" ? "" : capitalize(leftOutReason),
      minutes: null,
      note: target.note,
      findings: [],
    });
  }
  let reviewableUrls = new Set(toReview);
  let starts_2 = Math.min(toReview.length, affordable);
  let ultrareviewNotice = buildUltrareviewNotice({
    toReview,
    starts: starts_2,
    maxCostGiven: maxCostUsd !== null,
    leftOut,
    typicalCostUsd,
    costNote: getReviewCostNote(),
    creditsLeftCents,
    atOnce: min,
    launchingAtOnce: LOOKUP_CONCURRENCY,
    durationNote: getReviewDurationNote(),
    giveUpAfter: {
      neighbours: GIVE_UP_NEIGHBOURS,
      sinceSuccess: GIVE_UP_SINCE_SUCCESS,
    },
  });
  if (toReview.length === 0)
    return {
      kind: "not_started",
      reason: "none_can_run",
      message: ultrareviewNotice,
    };
  let confirmedStart = await confirmUltrareviewStart({
    notice: ultrareviewNotice,
    starts: starts_2,
    canPrompt,
    signal,
  });
  if (!confirmedStart.start)
    return signal.aborted
      ? {
          kind: "not_started",
          reason: "stopped",
          message: "Stopped. Nothing was started, so nothing is billed.",
        }
      : {
          kind: "not_started",
          reason: confirmedStart.reason,
          message: confirmedStart.message,
        };
  let counts = {
    schema_version: MIN_LINE,
    claude_code_version: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    started_at: new Date().toISOString(),
    pull_requests: starts,
  };
  try {
    await writeFile(reportPath, "", {
      flag: "wx",
      mode: 384,
    });
    await writeJsonFile(reportPath, counts).catch(async (error) => {
      await rm(reportPath, {
        force: true,
      });
      throw error;
    });
  } catch (error) {
    return {
      kind: "not_started",
      reason: "report_unwritable",
      message:
        getErrnoCode(error) === "EEXIST"
          ? `Nothing was started: ${reportPath} already exists. Give another name with --output.`
          : `Nothing was started: ${reportPath} can't be written. Check that its folder exists and that you can write to it.`,
    };
  }
  process.stdout
    .write(`Started. A review usually takes ${getReviewDurationNote()}. Results will appear here and in ${reportPath}.
`);
  let work = Promise.resolve(true);
  let startedCount = 0;
  let gaveUp = false;
  let consecutiveFailures = 0;
  let failedStarts = new Set();
  let gitMissing = false;
  let semaphore = createSemaphore(LOOKUP_CONCURRENCY);
  await pMap(
    lookedUp,
    async (lookupResult, startIndex) => {
      let startRecord = starts[startIndex];
      if (lookupResult.kind !== "merged" || startRecord === undefined || !reviewableUrls.has(startRecord.url))
        return;
      let acquireSlot = await semaphore.acquire();
      try {
        let startOutcome;
        let countedStart = false;
        if (signal.aborted)
          startOutcome = {
            outcome: "not_started",
            outcome_detail: STOPPED_MESSAGE,
          };
        else if (gitMissing)
          startOutcome = {
            outcome: "not_started",
            outcome_detail: GIT_MISSING_MESSAGE,
          };
        else if (gaveUp)
          startOutcome = {
            outcome: "not_started",
            outcome_detail: GAVE_UP_MESSAGE,
          };
        else if (startedCount >= affordable)
          startOutcome = {
            outcome: "not_started",
            outcome_detail: "Not started: --max-cost allows no more reviews.",
          };
        else {
          startedCount++;
          let copied = await copyPullRequest(
            `${startRecord.url.slice(0, startRecord.url.lastIndexOf("/pull/"))}.git`,
            lookupResult,
            signal,
          );
          if (copied.kind !== "ready") {
            startedCount--;
            gitMissing ||= copied.kind === "git_missing";
            startOutcome = {
              outcome: "not_started",
              outcome_detail: signal.aborted
                ? STOPPED_MESSAGE
                : copied.kind === "git_missing"
                  ? GIT_MISSING_MESSAGE
                  : capitalize(`Not started: ${copied.why}`),
            };
          } else
            try {
              countedStart = !gaveUp;
              startOutcome = countedStart
                ? {
                    base_commit: copied.base,
                    ...(await runUltrareview_2(
                      copied.repository,
                      copied.base,
                      join(copied.root, "launched"),
                      signal,
                      (sessionId) => {
                        acquireSlot();
                        startRecord.base_commit = copied.base;
                        startRecord.session_id = sessionId;
                        work = writeReportAnyway(work, reportPath, counts);
                      },
                    )),
                  }
                : {
                    outcome: "not_started",
                    outcome_detail: GAVE_UP_MESSAGE,
                  };
            } catch (error) {
              logForDebugging(`ultrareview eval: a review threw: ${error}`);
              startOutcome = {
                base_commit: copied.base,
                outcome: "failed",
                outcome_detail: ENDED_WITHOUT_REASON,
              };
            } finally {
              if (startOutcome?.outcome === "not_started") startedCount--;
              await rm(copied.root, {
                recursive: true,
                force: true,
                maxRetries: 3,
              }).catch((error) =>
                logForDebugging(`ultrareview eval: could not remove ${copied.root}: ${error}`),
              );
            }
        }
        Object.assign(startRecord, startOutcome);
        if (startRecord.outcome === "reviewed") consecutiveFailures = 0;
        else if (
          startRecord.outcome === "failed" ||
          startRecord.outcome === "timed_out" ||
          (countedStart && startRecord.outcome === "not_started")
        ) {
          failedStarts.add(startRecord);
          consecutiveFailures++;
        }
        gaveUp ||= consecutiveFailures >= GIVE_UP_SINCE_SUCCESS;
        let consecutiveFailuresRun = 0;
        for (let start of starts)
          if (failedStarts.has(start)) {
            consecutiveFailuresRun++;
            gaveUp ||= consecutiveFailuresRun >= GIVE_UP_NEIGHBOURS;
          } else if (start.outcome !== "not_started") consecutiveFailuresRun = 0;
      } finally {
        acquireSlot();
      }
      let findingCountForLine = startRecord.findings.length;
      process.stdout
        .write(`${startRecord.repository}#${startRecord.number}: ${startRecord.outcome === "reviewed" ? `reviewed in ${startRecord.minutes} min, ${findingCountForLine} ${plural(findingCountForLine, "finding")}` : startRecord.outcome_detail}
`);
      work = writeReportAnyway(work, reportPath, counts);
      await work;
    },
    {
      concurrency: min,
    },
  );
  return {
    kind: "ran",
    report: counts,
    repeats,
    written: await work,
  };
}
//@ chunk-gsmkwtjh.js:27546-27613 placement
function writeReportAnyway(work, path, counts) {
  return work
    .then(() => writeJsonFile(path, counts))
    .then(
      () => true,
      () => false,
    );
}
//@ chunk-gsmkwtjh.js:27613-27697 placement (2.1.88 match: capitalize, 1)
function capitalize(str) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1).replace(/\.$/, "")}.`;
}
//@ chunk-gsmkwtjh.js:27736-28110 placement
/**
 * PR 目标的解析常量：owner/repo#123、编号、URL 与 --list 行的正则及长度上限。
 */
var MAX_TARGETS = 100;
var MAX_LIST_BYTES = 500000;
var OWNER_REPO_NUMBER_RE = /^([^/#]+)\/([^/#]+)#(\d+)$/;
var BARE_NUMBER_RE = /^#?(\d+)$/;
var COMMENT_LINE_RE = /^#(?!\d)/;
var PULL_URL_RE = /^[^/]+\/\/[^/]+\/[^/]+\/[^/]+\/pull\/\d+(?:[/?#](?!.*(?::\/\/|\/pull\/)).*)?$/;
var regExp = new RegExp(`[ ${INVISIBLE_CHAR_CLASSES}]`, "gu");
var regExp_2 = new RegExp(`[\\p{Cf}${INVISIBLE_CHAR_CLASSES}]`, "gu");
var MAX_HOST_LENGTH = 253;
var MAX_OWNER_LENGTH = 39;
var MAX_REPO_LENGTH = 100;
var TARGET_FORMAT_HINT =
  "Write owner/repo#123, a pull request URL that starts with https://, or 123 for a pull request in this repository.";
//@ chunk-gsmkwtjh.js:28110-28266 placement
async function readListFile(list) {
  let text = "";
  try {
    for await (let chunk of createReadStream(list, "utf8")) {
      text += String(chunk);
      if (text.length > MAX_LIST_BYTES) return "too_long";
    }
  } catch {
    return "unreadable";
  }
  return text.split(`
`);
}
//@ chunk-gsmkwtjh.js:28266-30671 placement
/**
 * 把 --list 与参数里的 PR 写法（owner/repo#123、URL、编号）解析成目标，并给出歧义/缺主机的提示。
 */
function parseTargets(inputs, source, defaultRepo) {
  let defaultHost =
    defaultRepo === null
      ? GITHUB_HOST
      : !defaultRepo.host.startsWith("-") && HOST_LABEL_RE.test(normalizeHost(defaultRepo.host))
        ? defaultRepo.host
        : null;
  let trustedRepo =
    defaultRepo !== null &&
    defaultHost !== null &&
    !defaultRepo.owner.startsWith("-") &&
    defaultRepo.owner.length <= MAX_OWNER_LENGTH &&
    defaultRepo.name.length <= MAX_REPO_LENGTH &&
    REPO_NAME_RE.test(defaultRepo.owner) &&
    REPO_NAME_RE.test(defaultRepo.name)
      ? defaultRepo
      : null;
  let targets = [];
  let problems = [];
  let seen = new Set();
  let duplicatesFolded = 0;
  for (let [index, raw] of inputs.entries()) {
    let lineText = raw.trim();
    if (lineText === "" || (source === "lines" && COMMENT_LINE_RE.test(lineText))) continue;
    let linePrefix = source === "lines" ? `Line ${index + 1}: ` : "";
    let firstWord = lineText.split(/\s/, 1)[0] ?? "";
    let note = redactText(toWellFormedString(lineText.slice(firstWord.length)).replace(regExp_2, ""));
    let withoutInvisible = firstWord.replace(regExp, "");
    let redacted = redactText(withoutInvisible);
    let redactionIndex = Math.max(
      redacted.lastIndexOf("@"),
      redacted.lastIndexOf("%"),
      /[@%]/.test(withoutInvisible) ? redacted.lastIndexOf("[REDACTED]") : -1,
    );
    let shown = redactText(
      quotedPrintable(
        /\/\/[^/]*[?#]/.test(withoutInvisible)
          ? "\u2026"
          : redactionIndex === -1
            ? redacted
            : `\u2026${redacted.slice(redactionIndex)}`,
        160,
      ).replace(regExp, ""),
    );
    if (source === "arguments" && note !== "") {
      problems.push(
        `"${shown}" is followed by more text in the same argument. Give each pull request as its own argument, or put notes in a file for --list.`,
      );
      continue;
    }
    let urlParts = PULL_URL_RE.test(firstWord) ? parsePrUrl(firstWord) : null;
    let ownerRepoMatch = OWNER_REPO_NUMBER_RE.exec(firstWord);
    let bareNumberMatch = BARE_NUMBER_RE.exec(firstWord);
    if (source === "lines" && bareNumberMatch !== null && firstWord.startsWith("#")) {
      problems.push(
        `${linePrefix}"${shown}" could be pull request ${bareNumberMatch[1]}, or a comment. Write ${bareNumberMatch[1]} for the pull request, or put a space after the # for a comment.`,
      );
      continue;
    }
    let repository = null;
    if (urlParts !== null)
      repository = {
        host: urlParts.host,
        owner: urlParts.owner,
        name: urlParts.repo,
      };
    else if (ownerRepoMatch !== null) {
      if (defaultHost === null) {
        problems.push(
          `${linePrefix}"${shown}" doesn't say which host, and this folder's remote can't supply one. Write the pull request URL.`,
        );
        continue;
      }
      repository = {
        host: defaultHost,
        owner: ownerRepoMatch[1] ?? "",
        name: ownerRepoMatch[2] ?? "",
      };
    } else if (bareNumberMatch !== null && trustedRepo === null) {
      problems.push(
        `${linePrefix}"${shown}" doesn't say which repository, and this folder isn't a trusted GitHub repository. Write the pull request URL.`,
      );
      continue;
    } else if (bareNumberMatch !== null) repository = trustedRepo;
    let number = urlParts?.num ?? Number(ownerRepoMatch?.[3] ?? bareNumberMatch?.[1]);
    let host = isGithubDotCom(repository?.host ?? "") ? GITHUB_HOST : normalizeHost(repository?.host ?? "");
    let repoName = repository?.name.replace(/\.git$/i, "") ?? "";
    if (
      repository === null ||
      !Number.isSafeInteger(number) ||
      number < 1 ||
      host.length > MAX_HOST_LENGTH ||
      repository.owner.length > MAX_OWNER_LENGTH ||
      repoName.length > MAX_REPO_LENGTH ||
      host.startsWith("-") ||
      repository.owner.startsWith("-") ||
      !HOST_LABEL_RE.test(host) ||
      !REPO_NAME_RE.test(repository.owner) ||
      !REPO_NAME_RE.test(repoName)
    ) {
      problems.push(
        `${linePrefix}"${shown}" can't be read as a pull request. ${TARGET_FORMAT_HINT}${/@|%(?:25)*40/.test(withoutInvisible) ? " Leave any user name or token out of a URL." : ""}`,
      );
      continue;
    }
    let lower = `${host}/${repository.owner}/${repoName}#${number}`.toLowerCase();
    if (seen.has(lower)) {
      duplicatesFolded++;
      continue;
    }
    seen.add(lower);
    targets.push({
      repository: {
        ...repository,
        host,
        name: repoName,
      },
      number,
      note,
    });
  }
  if (targets.length === 0 && problems.length === 0)
    problems.push(
      `No pull requests were given. List them as arguments or with --list. ${TARGET_FORMAT_HINT}`,
    );
  if (targets.length > MAX_TARGETS)
    problems.push(
      `The list has ${targets.length} pull requests, and one run takes ${MAX_TARGETS} at most. Split it into shorter lists.`,
    );
  return {
    targets,
    problems,
    duplicatesFolded,
  };
}
//@ chunk-gsmkwtjh.js:30671-34910 placement
/**
 * claude ultrareview 的命令入口：解析 eval/--list/--output/--max-cost，取政策与额度后发起请求，输出 JSON 或列表。
 */
async function runUltrareviewEval(mode, args, options, credentials) {
  if (mode === "eval" && (hasWorkspaceTrust() || allowFlagFetchOnOwnCredential()))
    await initializeGrowthBook().catch(() => {});
  if (mode !== "eval" || !isUltrareviewEvalEnabled()) {
    for (let [flagName, flagValue] of [
      ["--list", options.list],
      ["--output", options.output],
      ["--max-cost", options.maxCost],
    ])
      if (flagValue !== undefined) return cliError(`error: unknown option '${flagName}'`);
    if (mode === "eval" && args.length > 0)
      return cliError(
        `error: too many arguments for 'ultrareview'. Expected 1 argument but got ${args.length + 1}.`,
      );
    return;
  }
  await waitForPolicyLimitsToLoad();
  let policyRefusal = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (policyRefusal) {
    let denyKind = policyDenyKind("allow_remote_sessions");
    await logOrgPolicyDeniedAsync("allow_remote_sessions", "cli_flag");
    await (denyKind === "cache_miss"
      ? logFeatureSadAsync("cli_ultrareview_eval", "policy_cache_miss")
      : logFeatureBadAsync(
          "cli_ultrareview_eval",
          denyKind === "route_missing" ? "policy_route_missing" : "policy_disallowed",
        ));
    return cliErrorAfterAnalyticsFlush(policyRefusal);
  }
  let maxCostUsd = options.maxCost === undefined ? null : Number(options.maxCost);
  let reportPath =
    options.output ?? `ultrareview-eval-${new Date().toISOString().slice(0, 19).replaceAll(":", "")}.json`;
  let configDir = getClaudeConfigDirOrNull();
  let reportRelative =
    configDir === null ? ".." : relative(resolve(configDir).toLowerCase(), resolve(reportPath).toLowerCase());
  let usageError = "";
  if (maxCostUsd !== null && !(maxCostUsd > 0 && maxCostUsd < 1 / 0))
    usageError = "--max-cost takes a number of US dollars above 0.";
  else if (options.list !== undefined && args.length > 0)
    usageError = "Give the pull requests as arguments or with --list, not both.";
  else if (
    options.json !== undefined ||
    options.timeout !== undefined ||
    options.post !== undefined ||
    options.trustWorkspace !== undefined
  )
    usageError =
      "--json, --timeout, --post, --no-post and --trust-workspace don't work with eval. Leave them out.";
  else if (options.list === "-")
    usageError = `--list takes a file, not "-": you answer a question about cost on stdin, so the list can't come in there. Put the list in a file, or give the pull requests as arguments.`;
  else if (!isAbsolute(reportRelative) && reportRelative !== ".." && !reportRelative.startsWith(`..${sep}`))
    usageError = `The report can't go in ${configDir}, Claude Code's own folder, where old files may be removed. Give another place with --output.`;
  if (usageError !== "") {
    await logFeatureBadAsync("cli_ultrareview_eval", "bad_usage");
    return cliErrorAfterAnalyticsFlush(`${usageError} Nothing was started.`);
  }
  stopCapturingEarlyInput();
  setRawModeSafe(process.stdin, false);
  let listLines = options.list === undefined ? null : await readListFile(options.list);
  if (listLines === "unreadable" || listLines === "too_long") {
    await logFeatureBadAsync("cli_ultrareview_eval", `list_${listLines}`);
    return cliErrorAfterAnalyticsFlush(
      listLines === "too_long"
        ? "The list is too long to be a list of pull requests. Check that --list names the right file. Nothing was started."
        : `${options.list} can't be read. Check the path. Nothing was started.`,
    );
  }
  let currentRepository = checkHasTrustDialogAccepted() ? await detectCurrentRepositoryWithHost() : null;
  let { targets, problems, duplicatesFolded } =
    listLines === null
      ? parseTargets(args, "arguments", currentRepository)
      : parseTargets(listLines, "lines", currentRepository);
  if (problems.length > 0) {
    await logFeatureBadAsync("cli_ultrareview_eval", "list_has_problems");
    return cliErrorAfterAnalyticsFlush(`${problems.join(`
`)}
Nothing was started.`);
  }
  let preflight = await fetchUltrareviewPreflight(credentials);
  if (preflight?.action === "blocked" && preflight.blocked) {
    await logFeatureBadAsync("cli_ultrareview_eval", "preflight_blocked");
    return cliErrorAfterAnalyticsFlush(`${preflight.blocked.message}${
      preflight.blocked.action_url
        ? `
  \u2192 ${preflight.blocked.action_url}`
        : ""
    }
Nothing was started.`);
  }
  if (duplicatesFolded > 0)
    process.stdout
      .write(`Skipped ${duplicatesFolded} duplicate ${plural(duplicatesFolded, "entry", "entries")}.
`);
  let run = {
    controller: createAbortController(),
    exitCode: 0,
  };
  markPrintModeSignalHandlersRegistered();
  process.on("SIGINT", stopRun.bind(null, run, 130));
  process.on("SIGTERM", stopRun.bind(null, run, 143));
  let pendingRun = runUltrareview({
    targets,
    currentRepository,
    reportPath,
    maxCostUsd,
    canPrompt: canPromptForWorkspaceTrust(),
    creditsLeftCents: await readUsageCredits(credentials),
    signal: run.controller.signal,
  });
  registerCleanup(async () => stopRun(run, 129));
  registerPreExitFlush(async () => {
    await pendingRun;
  }, 8000);
  let result = await pendingRun;
  if (result.kind === "not_started") {
    if (result.reason === "declined" || result.reason === "stopped") {
      process.stdout.write(`${result.message}
`);
      await logFeatureSadAsync("cli_ultrareview_eval", result.reason);
    } else {
      printCliError(result.message.trimEnd());
      await logFeatureBadAsync("cli_ultrareview_eval", result.reason);
    }
    return exitAfterAnalyticsFlush(run.exitCode || 1);
  }
  let pullRequests = result.report.pull_requests;
  let attempted = pullRequests.length - result.repeats;
  let reviewed = countWhere(pullRequests, (pullRequest) => pullRequest.outcome === "reviewed");
  let findingCount = pullRequests.flatMap((pullRequest) => pullRequest.findings).length;
  let unfinished = countWhere(
    pullRequests,
    (pullRequest) =>
      (pullRequest.outcome === "pending" || pullRequest.outcome === "timed_out") &&
      pullRequest.session_id !== null,
  );
  process.stdout.write(
    [
      `${reviewed} of ${attempted} ${plural(attempted, "pull request")} reviewed, ${findingCount} ${plural(findingCount, "finding")}.`,
      ...(unfinished > 0
        ? [
            `${unfinished} ${plural(unfinished, "review")} launched but gave no result. ${plural(unfinished, "It", "They")} may still be running in the cloud and ${plural(unfinished, "is", "are")} billed, but the findings won't appear here. Use the session ${plural(unfinished, "id")} in the report to trace a review or its bill.`,
          ]
        : []),
      result.written
        ? `The report is in ${reportPath}.`
        : `${reportPath} couldn't be updated at the end, so the whole report follows as JSON.`,
      "",
    ].join(`
`),
  );
  if (!result.written)
    await writeStdoutAndDrain(`${jsonStringify(result.report, null, 2)}
`);
  if (run.exitCode !== 0) {
    await logFeatureSadAsync("cli_ultrareview_eval", "stopped");
    return exitAfterAnalyticsFlush(run.exitCode);
  }
  if (reviewed === attempted && result.written) {
    await logFeatureOkAsync("cli_ultrareview_eval", {
      findings_count: findingCount,
    });
    return exitAfterAnalyticsFlush(0);
  }
  await (reviewed === 0
    ? logFeatureBadAsync("cli_ultrareview_eval", "none_reviewed")
    : logFeatureSadAsync("cli_ultrareview_eval", "partly_reviewed"));
  return exitAfterAnalyticsFlush(1);
}
//@ chunk-gsmkwtjh.js:34910-35099 placement
/**
 * 收到中止信号时的收尾：提示已启动的审查仍在云端继续计费。
 */
function stopRun(run, exitCode) {
  markStdoutDrainExternallyClocked();
  if (!run.controller.signal.aborted) {
    process.stderr.write(`
Stopping. Any review that has launched goes on in the cloud and is billed.
`);
    run.exitCode = exitCode;
    run.controller.abort();
  }
}
export { runUltrareviewEval };

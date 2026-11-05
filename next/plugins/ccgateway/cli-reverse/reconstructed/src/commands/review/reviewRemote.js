/**
 * commands/review/reviewRemote.ts
 *
 * ultrareview 配额响应结构（reviews_used/limit/remaining、is_overage）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/review/reviewRemote.ts
 * pieces: chunk-53f0ndkv.js (6), chunk-a2r96cyy.js (1), chunk-pp134gqz.js (20)
 * attribution: placement 26, fingerprint 1
 */
import { homedir } from "os";
import { resolve } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_3, create_6, create_26, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { env } from "../../utils/env.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { X_CLAUDE_CODE_SESSION_ID } from "../../services/api/requestHeaders.js";
import { getSessionId } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isLimitEnabled } from "../../services/api/usage.js";
import { isUsdCurrency } from "../../services/api/overageCreditGrant.js";
import {
  typicalUltrareviewCost,
  isGithubAccessPrecheckEnabled,
  diffSizeLimits,
  isEmptyTreeFallbackEnabled,
  isBranchPreflightRequired,
  getReviewCostNote,
  ultrareviewConfig,
  ultrareviewModelOverride,
  clientWaitMinutes,
  getReviewDurationNote,
  isUltrareviewWithBridge,
  ultrareviewUnavailableReason,
  isUltrareviewPostEnabled,
} from "./ultrareviewPreconditions.js";
import { readUsageCredits } from "./ultrareviewUsageCredits.js";
import { formatCurrency } from "../../services/api/referral.js";
import { isInGitRepo } from "../../utils/background/remote/preconditions.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum, fromEnumArr, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { parsePrUrl } from "../../utils/ghPrStatus.js";
import { detectCurrentRepositoryWithHost, isNestedGitLabProject } from "../../utils/detectRepository.js";
import { sameHost, isGithubDotCom } from "../../utils/git/githubUrl.js";
import { GITHUB_SETUP_HINT } from "../../tasks/RemoteAgentTask/githubSetupHint.js";
import { isAnthropicRepo } from "../../utils/github/anthropicRepos.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { probeGithubRepoAccess, noAccessText, installAppHint } from "../../utils/github/githubAccessHints.js";
import { isWebSetupOfferable } from "../../services/cloudSessions/webSetup.js";
import { probeRepoBundleSize } from "../../utils/teleport/gitBundle.js";
import { gitExe, getDefaultBranch, getBranch } from "../../utils/git.js";
import { GIT_SAFE_GLOBAL_ARGS, IGNORE_SUBMODULES_DIRTY_FLAG } from "../../utils/git/gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../insights.js";
import { parseShortstat, parseRawNumstat } from "../../utils/gitDiff.js";
import { gitReadInOwnWorkTree } from "../../utils/git/gitLanes.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { plural, truncateToLength } from "../../utils/stringUtils.js";
import { countWhere } from "../../utils/collections.js";
import { truncateToWidth } from "../../utils/format.js";
import { withGitNoPromptEnv, SSH_BATCH_CONFIG_ARGS } from "../../utils/gitSafeExec.js";
import { boundedEditDistance } from "../../utils/settings/managedEnvKeys.js";
import {
  checkRemoteSessionEligibility,
  formatPreconditionError,
  registerRemoteAgentTask,
} from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { teleportToRemote } from "../../utils/teleport.js";
import { markUltrareviewRun } from "../../services/api/ultrareviewQuota.js";
import { remoteSessionUrl } from "../../utils/background/remote/remoteSession.js";
import { POST_POLL_MS } from "./ultrareviewPost.js";
import { getBridgeEntitlementBlocker } from "../../bridge/bridgeEntitlement.js";
import { waitForPolicyLimitsToLoad } from "../../services/policyLimits/PolicyLimitsClient.js";
import { policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import { logOrgPolicyDenied } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import { sanitizedMachineReasonForTelemetry } from "../../utils/errors.js";
import { isHostEntrypoint } from "../../utils/entrypointKinds.js";
import { getCwd } from "../../utils/cwd.js";
import { samePath } from "../../utils/file.js";
import { identity } from "../../utils/pathClassification.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a2r96cyy.js:713-808 fingerprint (2.1.88 match: checkOverageGate, 0.329)
var checkOverageGate_2; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a2r96cyy.js:713", () => {
  checkOverageGate_2 = DoctorLazy(() =>
    create({
      reviews_used: create_3(),
      reviews_limit: create_3(),
      reviews_remaining: create_3(),
      is_overage: create_6(),
    }),
  );
});
//@ chunk-53f0ndkv.js:614-923 placement
/**
 * ultrareview 预检响应 schema
 */
var ultrareviewPreflightSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-53f0ndkv.js:614", () => {
  ultrareviewPreflightSchema = DoctorLazy(() =>
    create({
      action: create_26(["proceed", "confirm", "blocked"]),
      billing_note: create_2().nullable().optional(),
      github_login: create_2().nullable().optional(),
      confirm: create({
        title: create_2().optional(),
        body: create_2(),
      })
        .nullable()
        .optional(),
      blocked: create({
        message: create_2(),
        action_url: create_2().nullable(),
        reason: create_2().optional(),
      })
        .nullable()
        .optional(),
    }),
  );
});
//@ chunk-53f0ndkv.js:923-1009 placement
function blockedRemoteResult(message, reason) {
  return {
    action: "blocked",
    blocked: {
      message,
      action_url: null,
      reason,
    },
  };
}
//@ chunk-53f0ndkv.js:1009-2009 placement
/**
 * 调用 /v1/ultrareview/preflight
 */
async function fetchUltrareviewPreflight(credentials) {
  let fixtureJson = env.CLAUDE_CODE_ULTRAREVIEW_PREFLIGHT_FIXTURE;
  if (fixtureJson) {
    let parsedFixture = ultrareviewPreflightSchema().safeParse(jsonParse(fixtureJson));
    return parsedFixture.success ? parsedFixture.data : null;
  }
  try {
    let response = await apiClient.get("/v1/ultrareview/preflight", {
      auth: "teleport-org",
      timeout: 5000,
      credentials,
      headers: {
        [X_CLAUDE_CODE_SESSION_ID]: getSessionId(),
      },
    });
    if (!response.ok)
      switch (response.reason) {
        case "essential-traffic-only":
          return blockedRemoteResult(
            "Ultrareview runs in a cloud session and is unavailable when essential-traffic-only mode is active.",
            "zdr",
          );
        case "data-residency":
          return blockedRemoteResult(
            "Ultrareview runs in a cloud session and is unavailable on third-party providers.",
            "data_residency",
          );
        case "no-auth":
          return blockedRemoteResult(
            "Ultrareview requires a Claude.ai account. Run /login to authenticate.",
            "no_oauth_token",
          );
      }
    let parsed = ultrareviewPreflightSchema().safeParse(response.data);
    if (!parsed.success) {
      logForDebugging(`fetchUltrareviewPreflight schema mismatch: ${parsed.error.message}`);
      logFeatureSad("api_ultrareview_preflight", "schema_mismatch");
      return null;
    }
    logFeatureOk("api_ultrareview_preflight");
    return parsed.data;
  } catch (error) {
    logForDebugging(`fetchUltrareviewPreflight failed: ${error}`);
    logFeatureSad("api_ultrareview_preflight", "request_failed");
    return null;
  }
}
//@ chunk-53f0ndkv.js:2009-2020 placement
var REVIEW_REMOTE_POLL_MS = 3000;
//@ chunk-53f0ndkv.js:2020-2392 placement
/**
 * 剩余可用 overage 额度（USD）：未启用为 0，无上限为无穷，扣已用、再受余额/自动充值限制。
 */
function getRemainingOverageBudget(limit, prepaidBalance) {
  if (!limit || !isLimitEnabled(limit) || !isUsdCurrency(limit.currency)) return null;
  if (limit.is_enabled !== true) return 0;
  if (prepaidBalance === null || !isUsdCurrency(prepaidBalance.currency)) return null;
  let { monthly_limit: monthlyLimit, used_credits: usedCredits } = limit;
  let budgetCents;
  if (monthlyLimit === null) budgetCents = 1 / 0;
  else if (typeof monthlyLimit === "number" && typeof usedCredits === "number")
    budgetCents = monthlyLimit - usedCredits;
  else return null;
  let min = Math.min(
    budgetCents,
    prepaidBalance.auto_reload_settings?.enabled === true ? 1 / 0 : prepaidBalance.amount,
  );
  return Number.isFinite(min) ? Math.max(0, min) : null;
}
//@ chunk-53f0ndkv.js:2717-3013 placement
/**
 * 用量额度不足提示
 */
async function lowCreditsNote(context) {
  let typicalCostUsd = typicalUltrareviewCost();
  let remainingMinorUnits = await readUsageCredits(context);
  if (typicalCostUsd === null || remainingMinorUnits === null || remainingMinorUnits >= typicalCostUsd * 100)
    return null;
  let remainingLabel =
    remainingMinorUnits < 100
      ? "Less than $1"
      : `About ${formatCurrency(Math.floor(remainingMinorUnits / 100) * 100, "USD", "whole")}`;
  let costLabel = formatCurrency(typicalCostUsd * 100, "USD", "whole");
  return `${remainingLabel} of usage credits left. A review usually uses about ${costLabel} and stops if credits run out.`;
}
//@ chunk-pp134gqz.js:1616-1666 placement
var EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
//@ chunk-pp134gqz.js:1666-1857 placement
var POST_IGNORED_NOTE = `
Note: --post was ignored \u2014 posting applies only to GitHub.com pull request reviews.`;
var POST_DISABLED_NOTE = `
Note: --post was ignored \u2014 posting findings to the PR is currently turned off.`;
//@ chunk-pp134gqz.js:1857-2416 placement
function parseUltrareviewArgs(args) {
  let buildFlagPattern = (maxFindingsValue) =>
    String.raw`--fix|--comment|--post|--no-post|--max-findings(?:\s*=\s*(?!--)\S*|\s*=\S*|\s+${maxFindingsValue})?`;
  let regExp = new RegExp(`^(${buildFlagPattern(String.raw`(?!--)\S+`)})(?:\\s+|$)`);
  let regExp_2 = new RegExp(
    `(?:^|\\s+)(${buildFlagPattern(String.raw`(?:\d+|[Aa][Ll][Ll]|[Dd][Ee][Ff][Aa][Uu][Ll][Tt])`)})$`,
  );
  let flags = new Set();
  let trimmed = args.trim();
  for (;;) {
    let match = trimmed.match(regExp);
    if (!match) break;
    flags.add(match[1]);
    trimmed = trimmed.slice(match[0].length);
  }
  for (;;) {
    let match = trimmed.match(regExp_2);
    if (!match) break;
    flags.add(match[1]);
    trimmed = trimmed.slice(0, trimmed.length - match[0].length);
  }
  return {
    scopeArgs: trimmed,
    applyFixes: flags.has("--fix"),
    postReview: flags.has("--no-post") ? false : flags.has("--post") ? true : undefined,
  };
}
//@ chunk-pp134gqz.js:2416-18288 placement
/**
 * ultrareview 启动前检查范围（仓库、分支、改动量、额度、预检）。
 */
async function precheckLaunchScope(scopeArg, invocation = "/code-review ultra", options) {
  if (!(await isInGitRepo())) {
    logEvent("tengu_review_remote_precondition_failed", {
      reason: lit("not_git_repo"),
      cwd_is_home: isCwdHomeDir(),
    });
    return {
      ok: false,
      reason: "not_git_repo",
      error: noRepositoryAdvice(invocation, options?.confirmsBeforeLaunch !== true),
    };
  }
  let refName = scopeArg.trim();
  let prUrl = parsePrUrl(refName);
  let prNumber = prUrl?.num.toString() ?? refName.match(/^(?:#|PR[\s#]*)(\d+)$/i)?.[1] ?? refName;
  if (/^\d+$/.test(prNumber)) {
    let logRecovery = (outcome) => {
      if (outcome === "succeeded" && options?.suppressSucceededRecoveryEvent) return;
      if (prNumber !== refName)
        logEvent("tengu_review_remote_precondition_recovery", {
          reason: lit("base_ref_not_found"),
          method: lit("pr_arg_normalization"),
          outcome: fromEnum(outcome),
        });
    };
    let currentRepositoryWithHost = await detectCurrentRepositoryWithHost();
    let repo =
      currentRepositoryWithHost && isNestedGitLabProject(currentRepositoryWithHost)
        ? null
        : currentRepositoryWithHost;
    let sameRepo =
      sameHost(prUrl?.host, repo?.host) ||
      (!!prUrl && !!repo && isGithubDotCom(prUrl.host) && isGithubDotCom(repo.host));
    if (
      prUrl &&
      (!sameRepo ||
        prUrl.owner.toLowerCase() !== repo?.owner.toLowerCase() ||
        prUrl.repo.toLowerCase() !== repo?.name.toLowerCase())
    ) {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("pr_url_wrong_repo"),
        has_remote: !!repo,
        cwd_is_home: isCwdHomeDir(),
      });
      logRecovery("failed");
      let linkRepo = `${prUrl.owner}/${prUrl.repo} on ${prUrl.host}`;
      let currentRepoText = repo
        ? `you're in ${repo.owner}/${repo.name} on ${repo.host}`
        : "this directory has no GitHub remote";
      return {
        ok: false,
        reason: "pr_url_wrong_repo",
        error: `That link is for ${linkRepo}, but ${currentRepoText}. cd into a checkout of that repo and run ${invocation} ${prUrl.num} from there.`,
      };
    }
    if (!repo) {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("no_github_remote"),
        cwd_is_home: isCwdHomeDir(),
      });
      logRecovery("failed");
      return {
        ok: false,
        reason: "no_github_remote",
        error: `${invocation} <PR#> needs a GitHub remote so it knows which repository the PR is in. ${GITHUB_SETUP_HINT} If a GitHub repo already exists, run \`git remote add origin REPO_URL\`. Or run ${invocation} with no argument to review your current branch instead.`,
      };
    }
    if (isAnthropicRepo(repo)) {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("monorepo_blocked"),
        cwd_is_home: isCwdHomeDir(),
      });
      logRecovery("failed");
      return {
        ok: false,
        reason: "monorepo_blocked",
        error: `${invocation} doesn't support pull requests in this repository. Run /code-review ${prNumber}${invocation.startsWith("/") ? "" : " in Claude Code"} for a local review instead.`,
      };
    }
    let diffFiles;
    let diffLines;
    let [{ stdout: prViewStdout, code: prViewCode }, accessProbe] = await Promise.all([
      execFileNoThrow(
        "gh",
        [
          "pr",
          "view",
          prNumber,
          "--repo",
          `${repo.host}/${repo.owner}/${repo.name}`,
          "--json",
          "additions,deletions,changedFiles",
        ],
        {
          timeout: 5000,
          preserveOutputOnError: false,
        },
      ),
      isGithubDotCom(repo.host) && isGithubAccessPrecheckEnabled() && !isEssentialTrafficOnly()
        ? probeGithubRepoAccess(repo.owner, repo.name, options?.accessProbeBudgetMs)
        : null,
    ]);
    if (accessProbe && !options?.suppressOfferedRecoveryEvent)
      logEvent("tengu_review_remote_github_access_probe", {
        verdict: fromEnum(accessProbe.verdict),
        http_status: accessProbe.httpStatus ?? undefined,
      });
    if (accessProbe?.verdict === "github_not_connected" || accessProbe?.verdict === "github_repo_not_found") {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: fromEnum(accessProbe.verdict),
        cwd_is_home: isCwdHomeDir(),
      });
      logRecovery("failed");
      let webSetupHint = isWebSetupOfferable()
        ? `run /web-setup${invocation.startsWith("/") ? "" : " in Claude Code"} to reuse your GitHub CLI login`
        : "";
      let rerun = `then re-run ${invocation} ${prNumber}`;
      return {
        ok: false,
        reason: accessProbe.verdict,
        error:
          accessProbe.verdict === "github_not_connected"
            ? noAccessText({
                subject: `Ultrareview clones ${repo.owner}/${repo.name} in the cloud`,
                webSetupHint,
                rerun,
              })
            : installAppHint({
                owner: repo.owner,
                name: repo.name,
                webSetupHint,
                rerun,
                leadWithWebSetup: prViewCode === 0,
              }),
      };
    }
    if (prViewCode === 0 && prViewStdout.trim())
      try {
        let prInfo = jsonParse(prViewStdout);
        let { maxFiles, maxLines } = diffSizeLimits();
        let diffLinesTotal = prInfo.additions + prInfo.deletions;
        if (Number.isFinite(prInfo.changedFiles) && Number.isFinite(diffLinesTotal)) {
          diffFiles = prInfo.changedFiles;
          diffLines = diffLinesTotal;
        }
        if (prInfo.changedFiles > maxFiles || diffLinesTotal > maxLines) {
          logEvent("tengu_review_remote_precondition_failed", {
            reason: lit("pr_diff_too_large"),
            files: prInfo.changedFiles,
            lines: diffLinesTotal,
            max_files: maxFiles,
            max_lines: maxLines,
            cwd_is_home: isCwdHomeDir(),
          });
          logRecovery("failed");
          return {
            ok: false,
            reason: "pr_diff_too_large",
            error: `PR #${prNumber} is too large for ultrareview (${prInfo.changedFiles} files, ${diffLinesTotal.toLocaleString()} lines). Split it into smaller PRs, or run \`${invocation}\` on a narrower local diff.`,
          };
        }
      } catch {}
    logRecovery("succeeded");
    return {
      ok: true,
      scope: {
        mode: "pr",
        prNumber,
        repo: `${repo.owner}/${repo.name}`,
        host: repo.host,
        hadArg: true,
        diffFiles,
        diffLines,
      },
    };
  }
  let bundleSize = await probeRepoBundleSize();
  if (bundleSize.tooLarge) {
    logEvent("tengu_review_remote_precondition_failed", {
      reason: lit("repo_too_large_to_bundle"),
      pack_bytes: bundleSize.sizeBytes ?? undefined,
      pack_objects: bundleSize.inPackCount ?? undefined,
      cwd_is_home: isCwdHomeDir(),
    });
    return {
      ok: false,
      reason: "repo_too_large_to_bundle",
      error: `Repo is too large to bundle. Push a PR and use \`${invocation} <PR#>\` instead.`,
    };
  }
  let refExists = async (refName) =>
    (
      await execFileNoThrow(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--verify", "--quiet", "--end-of-options", refName],
        {
          preserveOutputOnError: false,
        },
      )
    ).code === 0;
  let matches = /\s/.test(refName);
  let hasBaseRef = matches && ((await refExists(`origin/${refName}`)) || (await refExists(refName)));
  let prUrlHint = matches && !hasBaseRef ? refName.match(/https:\/\/\S*\/pull\/\d+\b/) : null;
  let prNumberHint =
    matches && !hasBaseRef && !prUrlHint
      ? (refName.match(/(?<![\w/#-])(?:#|PR)[-\s#]*(\d+)\b/i) ??
        refName.match(/(?<![\w/#-])pull[\s-]+request[-\s#]*(\d+)\b/i) ??
        refName.match(/\/pull\/(\d+)\b/i) ??
        refName.match(/^(\d+)\b/))
      : null;
  if (prUrlHint || prNumberHint) {
    let prRefText = prUrlHint ? prUrlHint[0] : `#${prNumberHint[1]}`;
    let commandRef = prUrlHint ? prUrlHint[0] : prNumberHint[1];
    logEvent("tengu_review_remote_precondition_recovery", {
      reason: lit("base_ref_not_found"),
      method: lit("embedded_pr_hint"),
      outcome: lit("offered"),
    });
    logEvent("tengu_review_remote_precondition_failed", {
      reason: lit("base_ref_not_found"),
      looks_like_url: /^https?:/i.test(refName),
      looks_like_sha: false,
      starts_with_hash: refName.startsWith("#"),
      has_slash: refName.includes("/"),
      has_whitespace: true,
      has_pr_ref: true,
      has_remote: await hasRemoteRepository(),
      cwd_is_home: isCwdHomeDir(),
    });
    return {
      ok: false,
      reason: "base_ref_not_found",
      error: `Your request mentions what looks like a PR reference (${prRefText}). To review that PR, run \`${invocation} ${commandRef}\`. To review your current branch instead, rerun without the PR-style reference.`,
    };
  }
  let isProseInstructions = matches && !hasBaseRef && !refName.startsWith("-");
  let instructions = isProseInstructions ? refName : undefined;
  let baseRef = isProseInstructions ? "" : refName;
  let fetchedFromRemote = false;
  if (baseRef) {
    if (!(await refExists(`origin/${baseRef}`)) && !(await refExists(baseRef))) {
      let remoteBranch = await resolveRemoteBranch(baseRef);
      if (remoteBranch === "recovered" && (await refExists(`origin/${baseRef}`))) fetchedFromRemote = true;
      else {
        if (remoteBranch !== "not_found")
          logEvent("tengu_review_remote_precondition_recovery", {
            reason: lit("base_ref_not_found"),
            method: lit("fetch_retry"),
            outcome: lit("failed"),
          });
        if (remoteBranch === "fetch_failed") {
          logEvent("tengu_review_remote_precondition_failed", {
            reason: lit("base_ref_not_found"),
            looks_like_url: /^https?:/i.test(baseRef),
            looks_like_sha: /^[0-9a-f]{7,40}$/i.test(baseRef),
            starts_with_hash: baseRef.startsWith("#"),
            has_slash: baseRef.includes("/"),
            has_whitespace: /\s/.test(baseRef),
            has_remote: await hasRemoteRepository(),
            cwd_is_home: isCwdHomeDir(),
          });
          return {
            ok: false,
            reason: "base_ref_not_found",
            error: `"${baseRef}" exists on origin but couldn't be fetched. Run \`git fetch origin ${baseRef}\` and try ${invocation} again.`,
          };
        }
        let commandRef = await listBranchRefs(baseRef);
        if (commandRef)
          logEvent("tengu_review_remote_precondition_recovery", {
            reason: lit("base_ref_not_found"),
            method: lit("branch_suggestion"),
            outcome: lit("offered"),
          });
        logEvent("tengu_review_remote_precondition_failed", {
          reason: lit("base_ref_not_found"),
          looks_like_url: /^https?:/i.test(baseRef),
          looks_like_sha: /^[0-9a-f]{7,40}$/i.test(baseRef),
          starts_with_hash: baseRef.startsWith("#"),
          has_slash: baseRef.includes("/"),
          has_whitespace: /\s/.test(baseRef),
          has_remote: await hasRemoteRepository(),
          cwd_is_home: isCwdHomeDir(),
        });
        let suggestion = commandRef ? ` Did you mean \`${commandRef}\`?` : "";
        return {
          ok: false,
          reason: "base_ref_not_found",
          error: `"${baseRef}" is not a branch or commit in this repo.${suggestion} ${invocation} takes a PR number, a base branch or commit, or no argument (reviews your current branch). Try ${invocation} by itself.`,
        };
      }
    }
  }
  let logBranchRecovery = (outcome) => {
    if (fetchedFromRemote)
      logEvent("tengu_review_remote_precondition_recovery", {
        reason: lit("base_ref_not_found"),
        method: lit("fetch_retry"),
        outcome: fromEnum(outcome),
      });
    if (isProseInstructions) {
      if (outcome === "succeeded" && options?.suppressSucceededRecoveryEvent) return;
      logEvent("tengu_review_remote_precondition_recovery", {
        reason: lit("base_ref_not_found"),
        method: lit("prose_instructions"),
        outcome: fromEnum(outcome),
      });
    }
  };
  let baseBranch = baseRef || (await getDefaultBranch()) || "main";
  let headBranch = (await getBranch()) || "HEAD";
  let runMergeBase = async (ref) =>
    execFileNoThrow(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "merge-base", ref, "HEAD"], {
      preserveOutputOnError: false,
      env: getRemoteHostSessionCount(),
    });
  let mergeBaseRef = `origin/${baseBranch}`;
  let { stdout, code } = await runMergeBase(mergeBaseRef);
  if (code !== 0) {
    mergeBaseRef = baseBranch;
    ({ stdout, code } = await runMergeBase(mergeBaseRef));
  }
  let mergeBaseSha = stdout.trim();
  let runGit = (args) =>
    execFileNoThrow(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...args], {
      preserveOutputOnError: false,
      env: getRemoteHostSessionCount(),
    });
  let error = `Your checkout has no branches (detached HEAD only), which cloud review can't bundle. Create one first \u2014 \`git checkout -b <name>\` \u2014 then rerun ${invocation}.`;
  let hasBase = async () =>
    baseRef.length > 0 ||
    (await runGit(["rev-parse", "--verify", "--quiet", `origin/${baseBranch}`])).code === 0 ||
    (await runGit(["rev-parse", "--verify", "--quiet", baseBranch])).code === 0;
  let buildWholeRepoScope = async (firstCommit, headBranch_2 = headBranch) => {
    let hasReviewBase = firstCommit || (await hasBase());
    let { stdout, code } = await execFileNoThrow(
      gitExe(),
      [
        ...GIT_SAFE_GLOBAL_ARGS,
        "diff",
        "--no-ext-diff",
        "--no-textconv",
        IGNORE_SUBMODULES_DIRTY_FLAG,
        "--shortstat",
        EMPTY_TREE_SHA,
      ],
      {
        preserveOutputOnError: false,
        env: getRemoteHostSessionCount(),
      },
    );
    if (code === 0) {
      if (firstCommit && !stdout.trim()) return null;
      if (!stdout.trim()) {
        logEvent("tengu_review_remote_precondition_failed", {
          reason: lit("empty_diff"),
          cwd_is_home: isCwdHomeDir(),
        });
        logBranchRecovery("failed");
        return {
          ok: false,
          reason: "empty_diff",
          error: hasReviewBase
            ? `It doesn't look like you have any new commits or changes to review against your ${baseBranch} branch. Stage or commit them first?`
            : "It doesn't look like you have any changes to review. Stage or commit them first?",
        };
      }
      let shortstat = parseShortstat(stdout);
      let changedLines = shortstat ? shortstat.linesAdded + shortstat.linesRemoved : 0;
      let { maxFiles, maxLines } = diffSizeLimits();
      if (shortstat && (shortstat.filesCount > maxFiles || changedLines > maxLines)) {
        logEvent("tengu_review_remote_precondition_failed", {
          reason: lit("local_diff_too_large"),
          files: shortstat.filesCount,
          lines: changedLines,
          max_files: maxFiles,
          max_lines: maxLines,
          after_fallback: true,
          cwd_is_home: isCwdHomeDir(),
          first_commit: firstCommit || undefined,
        });
        logBranchRecovery("failed");
        let sizeAdvice = firstCommit
          ? `Your first commit is the base from here on: make your changes and rerun ${invocation} to review only those.`
          : hasReviewBase
            ? `Review a smaller subset by committing it on a branch off an empty base, or push a PR and use \`${invocation} <PR#>\`.`
            : `This repo has no ${baseBranch} branch \u2014 if another branch is your base, pass it explicitly (\`${invocation} <branch>\`). Otherwise review a smaller subset by committing it on a branch off an empty base, or push a PR and use \`${invocation} <PR#>\`.`;
        return {
          ok: false,
          reason: "local_diff_too_large",
          error: `This looks like a first review of the entire repository (${stdout.trim()}), which exceeds ultrareview's limit. ${sizeAdvice}`,
        };
      }
      if (!options?.suppressOfferedRecoveryEvent)
        logEvent("tengu_review_remote_precondition_recovery", {
          reason: lit("no_merge_base"),
          method: lit("empty_tree_bundle"),
          outcome: lit("offered"),
          files: shortstat?.filesCount,
          lines: shortstat ? changedLines : undefined,
          is_shallow: false,
          first_commit: firstCommit || undefined,
        });
      logBranchRecovery("succeeded");
      return {
        ok: true,
        scope: {
          mode: "branch",
          headBranch: headBranch_2,
          baseBranch,
          mergeBaseSha: EMPTY_TREE_SHA,
          diffStat: stdout.trim(),
          hadArg: baseRef.length > 0,
          diffFiles: shortstat?.filesCount,
          diffLines: shortstat ? changedLines : undefined,
          noMergeBase: firstCommit
            ? "first_commit"
            : hasReviewBase
              ? "unrelated_history"
              : "base_ref_missing",
          instructions,
        },
      };
    }
    return null;
  };
  if (code !== 0 || !mergeBaseSha) {
    let headResolves = (await runGit(["rev-parse", "--verify", "--quiet", "HEAD"])).code === 0;
    let trimmed = (await runGit(["rev-parse", "--is-shallow-repository"])).stdout.trim();
    let isShallow = trimmed === "true";
    let isComplete = trimmed === "false";
    let canUseEmptyTree = headResolves && isComplete && isEmptyTreeFallbackEnabled();
    let refsCheck = canUseEmptyTree ? await runGit(["for-each-ref", "--count=1", "refs/"]) : null;
    let hasRefs = refsCheck !== null && refsCheck.stdout.trim() !== "";
    let hasNoRefs = refsCheck !== null && refsCheck.code === 0 && refsCheck.stdout.trim() === "";
    let heldBack = false;
    if (canUseEmptyTree && hasRefs)
      if (options?.confirmsBeforeLaunch === true || options?.personRanTheCommand === true) {
        let wholeScope = await buildWholeRepoScope(false);
        if (wholeScope) return wholeScope;
      } else heldBack = true;
    logEvent("tengu_review_remote_precondition_failed", {
      reason: lit("no_merge_base"),
      cwd_is_home: isCwdHomeDir(),
      is_shallow: isShallow,
      head_resolves: headResolves,
      arg_was_explicit: baseRef.length > 0,
      has_refs: hasRefs ? true : hasNoRefs ? false : undefined,
      whole_repository_held_back: heldBack || undefined,
    });
    logBranchRecovery("failed");
    if (heldBack)
      return {
        ok: false,
        reason: "no_merge_base",
        error: `${(await hasBase()) ? `${baseBranch} shares no history with your checkout` : `This repository has no ${baseBranch} branch to compare with`}, so a review here would cover every file. To review it whole, a person can run /ultrareview in an interactive Claude Code session, which asks before it spends anything.`,
      };
    if (!headResolves)
      return {
        ok: false,
        reason: "no_merge_base",
        error: !options?.confirmsBeforeLaunch
          ? `Your current branch has no commits yet, so there is nothing to review. Commit a starting point first. ${invocation} then reviews the changes you make on top of that commit.`
          : `Your current branch has no commits yet, so there is nothing to review. Commit your work first, then rerun ${invocation}.`,
      };
    if (isShallow) {
      logEvent("tengu_review_remote_precondition_recovery", {
        reason: lit("no_merge_base"),
        method: lit("deepen_hint"),
        outcome: lit("offered"),
        is_shallow: true,
      });
      return {
        ok: false,
        reason: "no_merge_base",
        error: baseRef
          ? `Your clone is shallow and doesn't contain the point where your branch forked from ${baseBranch}. Run \`git fetch --deepen=100 origin ${baseBranch}\` (or \`git fetch --unshallow origin\`) and rerun ${invocation}.`
          : `Your clone is shallow and doesn't contain the point where your branch forked from ${baseBranch}. Run \`git fetch --unshallow origin\` and rerun ${invocation}. If your base branch isn't ${baseBranch}, pass it explicitly (\`${invocation} <branch>\`).`,
      };
    }
    if (hasNoRefs)
      return {
        ok: false,
        reason: "no_refs",
        error,
      };
    let noMergeBaseAdvice = fetchedFromRemote
      ? isComplete
        ? `${baseBranch} was fetched from origin but shares no history with HEAD. If another branch is your real base, pass it explicitly (\`${invocation} <branch>\`).`
        : `${baseBranch} was fetched from origin but shares no history with HEAD. Try \`git fetch --unshallow origin\` (or deepen the clone) and rerun.`
      : baseRef
        ? `Make sure ${baseBranch} exists locally or on origin (try \`git fetch origin ${baseBranch}\`).`
        : `Pass the base branch explicitly (e.g. \`${invocation} develop\`) or make sure you're in a git repo with a ${baseBranch} branch.`;
    return {
      ok: false,
      reason: "no_merge_base",
      error: `Could not find merge-base with ${baseBranch}. ${noMergeBaseAdvice}`,
    };
  }
  if (baseRef.length > 0) {
    let refsCheck = await runGit(["for-each-ref", "--count=1", "refs/"]);
    if (refsCheck.code === 0 && refsCheck.stdout.trim() === "") {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("no_refs"),
        cwd_is_home: isCwdHomeDir(),
        arg_was_explicit: true,
      });
      logBranchRecovery("failed");
      return {
        ok: false,
        reason: "no_refs",
        error,
      };
    }
  }
  let { stdout: stdout_2, code: code_2 } = await gitReadInOwnWorkTree(
    getFsImplementation().cwd(),
    [
      ...GIT_SAFE_GLOBAL_ARGS,
      "diff",
      "--no-ext-diff",
      "--no-textconv",
      IGNORE_SUBMODULES_DIRTY_FLAG,
      "--shortstat",
      mergeBaseSha,
    ],
    {
      LC_ALL: "C",
    },
    {
      preserveOutputOnError: false,
    },
  );
  if (code_2 === 0 && !stdout_2.trim()) {
    let headInfo = await readHeadInfo(mergeBaseSha, baseBranch);
    let headBranch = headInfo.headBranch;
    let canUseEmptyTree =
      headInfo.headAtMergeBase === true &&
      headInfo.headIsRoot === true &&
      headInfo.untrackedCount === 0 &&
      isEmptyTreeFallbackEnabled() &&
      (await runGit(["rev-parse", "--is-shallow-repository"])).stdout.trim() === "false" &&
      (
        await runGit(["rev-parse", "--verify", "--quiet", "--end-of-options", `${mergeBaseRef}^{commit}`])
      ).stdout.trim() === mergeBaseSha;
    let heldBack = canUseEmptyTree && options?.confirmsBeforeLaunch !== true;
    if (canUseEmptyTree && !heldBack) {
      let wholeScope = await buildWholeRepoScope(true, headBranch);
      if (wholeScope) return wholeScope;
    }
    logEvent("tengu_review_remote_precondition_failed", {
      reason: lit("empty_diff"),
      used_origin_ref: mergeBaseRef !== baseBranch,
      had_explicit_base: baseRef.length > 0,
      cwd_is_home: isCwdHomeDir(),
      on_base_branch: headInfo.onBaseBranch,
      head_at_merge_base: headInfo.headAtMergeBase,
      first_commit_held_back: heldBack || undefined,
      has_untracked: headInfo.untrackedCount === undefined ? undefined : headInfo.untrackedCount > 0,
    });
    logBranchRecovery("failed");
    let baseAdvice = baseRef
      ? `try a different base, e.g. \`${invocation} <branch>\``
      : `pass one explicitly, e.g. \`${invocation} <branch>\``;
    let mergeBaseText = `${mergeBaseRef} (merge-base ${mergeBaseSha.slice(0, 7)})`;
    let noEditsText = "no staged or unstaged edits to tracked files";
    let emptyReason;
    let emptyAdvice;
    if (headInfo.headAtMergeBase && headBranch && headInfo.onBaseBranch) {
      let branchAdvice = `If your work is on another branch, switch to it, or if the base should be something else, ${baseAdvice}.`;
      if (mergeBaseRef === headBranch) {
        emptyReason = `you're on ${headBranch}, which is also the base of this review, and it has ${noEditsText}`;
        emptyAdvice = `Everything already committed on ${headBranch} counts as the base here, so only edits you haven't committed yet would be reviewed. ${branchAdvice}`;
      } else {
        emptyReason = `you're on ${headBranch}, which is also the base of this review, and it has no commits beyond ${mergeBaseText} and ${noEditsText}`;
        emptyAdvice = branchAdvice;
      }
    } else if (headInfo.headAtMergeBase && headBranch === "HEAD") {
      emptyReason = `the commit you have checked out is already part of ${mergeBaseText}, and there are ${noEditsText}`;
      emptyAdvice = `If your work is on a branch, switch to it. If you meant a different base, ${baseAdvice}.`;
    } else if (headInfo.headAtMergeBase && headBranch) {
      emptyReason = `${headBranch} has no commits beyond ${mergeBaseText} and ${noEditsText}`;
      emptyAdvice = `If your work is on another branch, switch to it. If this branch was already merged or you meant a different base, ${baseAdvice}.`;
    } else {
      emptyReason = `the diff against ${mergeBaseText} is empty`;
      emptyAdvice = `If you have local edits, stage or commit them first. If your branch was already merged or you meant a different base, ${baseAdvice}.`;
    }
    let lastCommitHint = "";
    if (headInfo.headAtMergeBase && headInfo.parentSha) {
      let sliced = headInfo.parentSha.slice(0, 12);
      let parentRef = /^\d+$/.test(sliced) ? headInfo.parentSha : sliced;
      logEvent("tengu_review_remote_precondition_recovery", {
        reason: lit("empty_diff"),
        method: lit("last_commit_hint"),
        outcome: lit("offered"),
      });
      lastCommitHint = ` To review your latest commit anyway, run \`${invocation} ${parentRef}\`. That id is the commit before it, and any earlier commit id or tag works the same way.`;
    }
    let interactiveHint = heldBack
      ? " To review this first commit whole, run /ultrareview in an interactive Claude Code session, which asks before it spends anything."
      : "";
    return {
      ok: false,
      reason: "empty_diff",
      error: `No changes to review: ${emptyReason}.${untrackedFilesNote(headInfo.untrackedCount, invocation)} ${emptyAdvice}${lastCommitHint}${interactiveHint}`,
    };
  }
  let shortstat = parseShortstat(stdout_2);
  if (shortstat) {
    let { maxFiles, maxLines } = diffSizeLimits();
    let changedLines = shortstat.linesAdded + shortstat.linesRemoved;
    if (shortstat.filesCount > maxFiles || changedLines > maxLines) {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("local_diff_too_large"),
        files: shortstat.filesCount,
        lines: changedLines,
        max_files: maxFiles,
        max_lines: maxLines,
        cwd_is_home: isCwdHomeDir(),
      });
      logBranchRecovery("failed");
      let { stdout, code } = await gitReadInOwnWorkTree(
        getFsImplementation().cwd(),
        [
          ...GIT_SAFE_GLOBAL_ARGS,
          "-c",
          "core.quotepath=false",
          "diff",
          "--no-ext-diff",
          "--no-textconv",
          IGNORE_SUBMODULES_DIRTY_FLAG,
          "--numstat",
          mergeBaseSha,
        ],
        {},
        {
          preserveOutputOnError: false,
          timeout: 1e4,
          maxBuffer: 10485760,
        },
      );
      let largestFiles = code === 0 ? largestFilesNote(stdout) : "";
      return {
        ok: false,
        reason: "local_diff_too_large",
        error: `Diff is too large for ultrareview: ${shortstat.filesCount.toLocaleString()} ${plural(shortstat.filesCount, "file")}, ${changedLines.toLocaleString()} ${plural(changedLines, "line")} changed (limits: ${maxFiles.toLocaleString()} ${plural(maxFiles, "file")}, ${maxLines.toLocaleString()} ${plural(maxLines, "line")}).${largestFiles} Pass a closer base branch (\`${invocation} <branch>\`) to narrow the scope, or split the change.`,
      };
    }
  }
  logBranchRecovery("succeeded");
  return {
    ok: true,
    scope: {
      mode: "branch",
      headBranch,
      baseBranch,
      mergeBaseSha,
      diffStat: stdout_2.trim(),
      hadArg: baseRef.length > 0,
      diffFiles: shortstat?.filesCount,
      diffLines: shortstat ? shortstat.linesAdded + shortstat.linesRemoved : undefined,
      instructions,
    },
  };
}
//@ chunk-pp134gqz.js:18288-19138 placement
/**
 * 读取 HEAD 父提交、符号引用等
 */
async function readHeadInfo(mergeBaseSha, baseBranch) {
  let [revListResult, symbolicRefResult, untrackedResult] = await Promise.all([
    execFileNoThrow(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "rev-list", "--parents", "--max-count=1", "HEAD", "--"],
      {
        preserveOutputOnError: false,
        env: getRemoteHostSessionCount(),
      },
    ),
    execFileNoThrow(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "symbolic-ref", "--quiet", "HEAD"], {
      preserveOutputOnError: false,
      env: getRemoteHostSessionCount(),
    }),
    execFileNoThrow(
      gitExe(),
      [
        ...GIT_SAFE_GLOBAL_ARGS,
        "ls-files",
        "--others",
        "--exclude-standard",
        "--directory",
        "--no-empty-directory",
        "-z",
        "--",
        ":/",
      ],
      {
        preserveOutputOnError: false,
        timeout: 5000,
        maxBuffer: 1048576,
        env: getRemoteHostSessionCount({
          GIT_LITERAL_PATHSPECS: "",
        }),
      },
    ),
  ]);
  let [headSha, parentSha, ...extraParents] =
    revListResult.code === 0 ? revListResult.stdout.trim().split(/\s+/) : [];
  let headBranch =
    symbolicRefResult.exitCode === 0
      ? symbolicRefResult.stdout.trim().replace(/^refs\/heads\//, "") || undefined
      : symbolicRefResult.exitCode === 1
        ? "HEAD"
        : undefined;
  return {
    headBranch,
    onBaseBranch:
      headBranch === undefined
        ? undefined
        : headBranch !== "HEAD" && (headBranch === baseBranch || `origin/${headBranch}` === baseBranch),
    headAtMergeBase: headSha ? headSha === mergeBaseSha : undefined,
    parentSha: extraParents.length ? undefined : parentSha || undefined,
    headIsRoot: headSha ? !parentSha : undefined,
    untrackedCount:
      untrackedResult.code === 0 ? countWhere(untrackedResult.stdout.split("\x00"), Boolean) : undefined,
  };
}
//@ chunk-pp134gqz.js:19138-19396 placement
/**
 * 未跟踪文件提示
 */
function untrackedFilesNote(untrackedCount, invocation) {
  if (!untrackedCount) return "";
  return ` Git also sees ${untrackedCount.toLocaleString()} untracked ${plural(untrackedCount, "file or folder", "files or folders")} here. New files aren't part of a review until git tracks them: run \`git add\` on the ones you want reviewed, then rerun ${invocation}.`;
}
//@ chunk-pp134gqz.js:19396-19737 placement
/**
 * 改动最大的文件列表
 */
function largestFilesNote(stdout, maxFiles = 3) {
  let { perFileStats } = parseRawNumstat(stdout, Number.POSITIVE_INFINITY);
  let filtered = [...perFileStats.entries()]
    .map(([path, stats]) => ({
      path,
      lines: stats.added + stats.removed,
    }))
    .filter((fileEntry) => fileEntry.lines > 0);
  if (filtered.length === 0) return "";
  return ` Largest files: ${filtered
    .sort((leftFile, rightFile) => rightFile.lines - leftFile.lines)
    .slice(0, maxFiles)
    .map(
      (fileEntry) =>
        `${fileEntry.path} (${fileEntry.lines.toLocaleString()} ${plural(fileEntry.lines, "line")})`,
    )
    .join(", ")}.`;
}
//@ chunk-pp134gqz.js:19737-19800 placement
function previewInstructions(instructions, maxWidth = 80) {
  return truncateToWidth(instructions.replace(/\s+/g, " ").trim(), maxWidth);
}
//@ chunk-pp134gqz.js:19800-20643 placement
/**
 * 检查远端分支是否存在
 */
async function resolveRemoteBranch(branchName) {
  if (branchName.startsWith("-") || branchName.includes(":") || /\s/.test(branchName)) return "not_found";
  let env_2 = {
    ...withGitNoPromptEnv(),
    GIT_SSH_COMMAND: `${env.GIT_SSH_COMMAND || "ssh"} -o BatchMode=yes -o StrictHostKeyChecking=yes`,
    GIT_ALLOW_PROTOCOL: "https:http:ssh",
  };
  let lsRemoteResult = await execFileNoThrow(
    gitExe(),
    [
      ...GIT_SAFE_GLOBAL_ARGS,
      ...SSH_BATCH_CONFIG_ARGS,
      "-c",
      "credential.helper=",
      "-c",
      "core.askPass=",
      "ls-remote",
      "--heads",
      "--exit-code",
      "--end-of-options",
      "origin",
      branchName,
    ],
    {
      timeout: 4000,
      preserveOutputOnError: false,
      env: env_2,
    },
  );
  if (lsRemoteResult.code !== 0) return lsRemoteResult.code === 2 ? "not_found" : "probe_failed";
  if (
    !lsRemoteResult.stdout
      .split(
        `
`,
      )
      .some((line) => line.split("\t")[1]?.trim() === `refs/heads/${branchName}`)
  )
    return "not_found";
  return (
    await execFileNoThrow(
      gitExe(),
      [
        ...GIT_SAFE_GLOBAL_ARGS,
        ...SSH_BATCH_CONFIG_ARGS,
        "-c",
        "credential.helper=",
        "-c",
        "core.askPass=",
        "fetch",
        "--no-tags",
        "--end-of-options",
        "origin",
        `refs/heads/${branchName}:refs/remotes/origin/${branchName}`,
      ],
      {
        timeout: 15000,
        preserveOutputOnError: false,
        env: env_2,
      },
    )
  ).code === 0
    ? "recovered"
    : "fetch_failed";
}
//@ chunk-pp134gqz.js:20643-21271 placement
/**
 * 列出本地与 origin 分支引用
 */
async function listBranchRefs(missingBranch) {
  let { stdout, code } = await execFileNoThrow(
    gitExe(),
    [
      ...GIT_SAFE_GLOBAL_ARGS,
      "for-each-ref",
      "--format=%(refname:short)",
      "--count=2000",
      "refs/heads",
      "refs/remotes/origin",
    ],
    {
      preserveOutputOnError: false,
      env: getRemoteHostSessionCount(),
    },
  );
  if (code !== 0) return null;
  let branchRefs = new Map();
  for (let line of stdout.split(`
`)) {
    let trimmed = line.trim();
    if (!trimmed || trimmed === "origin" || trimmed === "origin/HEAD") continue;
    let shortName = trimmed.startsWith("origin/") ? trimmed.slice(7) : trimmed;
    if (trimmed.startsWith("origin/") || !branchRefs.has(shortName)) branchRefs.set(shortName, trimmed);
  }
  let fallbackName = missingBranch === "main" ? "master" : missingBranch === "master" ? "main" : null;
  if (fallbackName !== null) {
    let fallbackRef = branchRefs.get(fallbackName);
    if (fallbackRef) return fallbackRef;
  }
  let bestRef = null;
  let bestDistance = 3;
  for (let [candidateName, candidateRef] of branchRefs) {
    if (Math.abs(candidateName.length - missingBranch.length) >= bestDistance) continue;
    let distance = boundedEditDistance(missingBranch, candidateName, bestDistance - 1);
    if (distance > 0 && distance < bestDistance) {
      bestDistance = distance;
      bestRef = candidateRef;
    }
  }
  return bestRef;
}
//@ chunk-pp134gqz.js:21271-21483 placement
/**
 * 预检失败时的提示
 */
var PREFLIGHT_UNAVAILABLE_MESSAGE =
  "Couldn't check whether this review can run, so it stopped before uploading your code. Try again shortly; if this keeps happening, open a pull request for this branch and review the pull request instead.";
//@ chunk-pp134gqz.js:21483-22320 placement
async function checkOverageGate({
  overageConfirmed,
  credentials,
  skipLowCreditsNote = false,
  bundleFollows,
}) {
  let ultrareviewPreflight = await fetchUltrareviewPreflight(credentials);
  if (!ultrareviewPreflight) {
    if (bundleFollows && isBranchPreflightRequired())
      return {
        kind: "blocked",
        reason: "preflight_unavailable",
        message: PREFLIGHT_UNAVAILABLE_MESSAGE,
        actionUrl: null,
      };
    return {
      kind: "proceed",
      billingNote: "",
      preflightUnavailable: true,
    };
  }
  let billingNote = ultrareviewPreflight.billing_note ?? "";
  let githubLogin = ultrareviewPreflight.github_login ?? null;
  switch (ultrareviewPreflight.action) {
    case "proceed":
      return {
        kind: "proceed",
        billingNote,
        githubLogin,
      };
    case "blocked":
      return {
        kind: "blocked",
        reason: ultrareviewPreflight.blocked?.reason ?? "server",
        message: ultrareviewPreflight.blocked?.message ?? "Ultrareview is unavailable for your organization.",
        actionUrl: ultrareviewPreflight.blocked?.action_url ?? null,
      };
    case "confirm": {
      if (overageConfirmed)
        return {
          kind: "proceed",
          billingNote,
          githubLogin,
        };
      let lowCreditsLine = skipLowCreditsNote ? null : await lowCreditsNote(credentials);
      return {
        kind: "needs-confirm",
        body: `This review bills as usage credits (${getReviewCostNote()}).${
          lowCreditsLine
            ? `
${lowCreditsLine}`
            : ""
        }`,
        lowCreditsNote: lowCreditsLine,
        billingNote,
        githubLogin,
      };
    }
  }
}
//@ chunk-pp134gqz.js:22320-22329 placement
var RESULT_RELAY_MARGIN_MINUTES = 3;
//@ chunk-pp134gqz.js:22329-28228 placement (2.1.88 match: launchRemoteReview, 0.421)
async function launchRemoteReview(scope, context, billingNote, options) {
  let invocation = options?.invocation ?? "/code-review ultra";
  let failedResult = (text) => ({
    launched: false,
    blocks: [
      {
        type: "text",
        text,
      },
    ],
  });
  let eligibility = await checkRemoteSessionEligibility({
    allowBundle: true,
    storageV5: context.storageV5,
    credentials: context.credentials,
  });
  if (!eligibility.eligible) {
    let errors = eligibility.errors;
    if (errors.length > 0) {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("remote_agent_ineligible"),
        precondition_errors: fromEnumArr(errors.map((error) => error.type)),
        cwd_is_home: isCwdHomeDir(),
      });
      let joined = errors.map((error) => {
        if (error.type === "not_in_git_repo") return noRepositoryAdvice(invocation);
        if (error.type === "no_git_remote")
          return `${invocation} needs a GitHub remote so it can clone this repository into the cloud. ${GITHUB_SETUP_HINT} If a GitHub repo already exists, run \`git remote add origin REPO_URL && git push -u origin HEAD\`.`;
        return formatPreconditionError(error);
      }).join(`
`);
      if (scope.mode === "branch" && scope.noMergeBase)
        logEvent("tengu_review_remote_precondition_recovery", {
          reason: lit("no_merge_base"),
          method: lit("empty_tree_bundle"),
          outcome: lit("failed"),
        });
      logFeatureBad("ultrareview_launch", "remote_agent_ineligible");
      return failedResult(`Ultrareview cannot launch:
${joined}`);
    }
  }
  let CODE_REVIEW_ENV_ID = "env_011111111111111111111113";
  let config = ultrareviewConfig();
  let posInt = (v, fallback, max) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
    let n = Math.floor(v);
    if (n <= 0) return fallback;
    return n > max ? fallback : n;
  };
  let modelOverride = ultrareviewModelOverride();
  let bughunterEnv = {
    BUGHUNTER_DRY_RUN: "1",
    AUTOPATCH_ENABLE_ASIMOV: "1",
    ...(config?.code_quality !== false && {
      BUGHUNTER_CODE_QUALITY: "1",
    }),
    BUGHUNTER_FLEET_SIZE: String(posInt(config?.fleet_size, 5, 20)),
    BUGHUNTER_MAX_DURATION: String(posInt(config?.max_duration_minutes, 10, 25)),
    BUGHUNTER_AGENT_TIMEOUT: String(posInt(config?.agent_timeout_seconds, 600, 1800)),
    BUGHUNTER_TOTAL_WALLCLOCK: String(posInt(config?.total_wallclock_minutes, 22, 27)),
    BUGHUNTER_RESULT_RELAY_MAX_SEC: String((clientWaitMinutes() - RESULT_RELAY_MARGIN_MINUTES) * 60),
    ...(modelOverride && {
      BUGHUNTER_MODEL: modelOverride,
    }),
    ...(process.env.BUGHUNTER_DEV_BUNDLE_B64 && {
      BUGHUNTER_DEV_BUNDLE_B64: process.env.BUGHUNTER_DEV_BUNDLE_B64,
    }),
  };
  let remoteSession;
  let launchCommand;
  let scopeLabel;
  let diffStat = "";
  let bundleNotices = [];
  let createFailMessage;
  let failReason;
  let failStatus;
  let failServerType;
  let failServerReason;
  if (scope.mode === "pr") {
    let repo = await detectCurrentRepositoryWithHost();
    let prRepo = repo && isNestedGitLabProject(repo) ? null : repo;
    if (!prRepo) {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("no_github_remote_post_confirm"),
        cwd_is_home: isCwdHomeDir(),
      });
      logFeatureBad("ultrareview_launch", "no_github_remote");
      return null;
    }
    let sessionTitle = `ultrareview: ${prRepo.owner}/${prRepo.name}#${scope.prNumber}`;
    remoteSession = await teleportToRemote({
      initialMessage: null,
      source: "ultrareview",
      description: sessionTitle,
      title: sessionTitle,
      signal: context.abortController.signal,
      storageV5: context.storageV5,
      credentials: context.credentials,
      branchName: `refs/pull/${scope.prNumber}/head`,
      environmentId: CODE_REVIEW_ENV_ID,
      tags: ["ultrareview"],
      environmentVariables: {
        BUGHUNTER_PR_NUMBER: scope.prNumber,
        BUGHUNTER_REPOSITORY: `${prRepo.owner}/${prRepo.name}`,
        ...bughunterEnv,
      },
      onCreateFail: (message, reason, commandRef) => {
        createFailMessage = message;
        failReason = fromEnum(reason);
        failStatus = commandRef?.status;
        failServerType = fromEnumOpt(commandRef?.serverType);
        failServerReason = fromEnumOpt(commandRef?.serverReason);
      },
    });
    launchCommand = `/ultrareview ${scope.prNumber}`;
    scopeLabel = `${prRepo.owner}/${prRepo.name}#${scope.prNumber}`;
  } else {
    let { headBranch, baseBranch, mergeBaseSha, diffStat: diffStat_2, noMergeBase } = scope;
    diffStat = diffStat_2;
    let commandRef;
    let bundleFailKind;
    remoteSession = await teleportToRemote({
      initialMessage: null,
      source: "ultrareview",
      description: `ultrareview: ${headBranch}`,
      signal: context.abortController.signal,
      storageV5: context.storageV5,
      credentials: context.credentials,
      useBundle: true,
      bundleBaseRef: mergeBaseSha,
      bundleForceScope: noMergeBase ? "squashed" : undefined,
      environmentId: CODE_REVIEW_ENV_ID,
      tags: ["ultrareview"],
      environmentVariables: {
        BUGHUNTER_BASE_BRANCH: mergeBaseSha,
        ...bughunterEnv,
      },
      onBundleFail: (bundleFailMessage, bundleFailKindLocal) => {
        commandRef = bundleFailMessage;
        bundleFailKind = fromEnum(bundleFailKindLocal);
      },
      onBundleNotice: (notice) => {
        bundleNotices.push(notice);
      },
      onCreateFail: (message, reason, details) => {
        createFailMessage = message;
        failReason = fromEnum(reason);
        failStatus = details?.status;
        failServerType = fromEnumOpt(details?.serverType);
        failServerReason = fromEnumOpt(details?.serverReason);
      },
    });
    if (!remoteSession) {
      logEvent("tengu_review_remote_teleport_failed", {
        mode: lit("branch"),
        reason: failReason,
        bundle_fail_kind: bundleFailKind,
        status_code: failStatus,
        server_type: failServerType,
        server_reason: failServerReason,
      });
      let aborted = context.abortController.signal.aborted;
      if (noMergeBase && !aborted)
        logEvent("tengu_review_remote_precondition_recovery", {
          reason: lit("no_merge_base"),
          method: lit("empty_tree_bundle"),
          outcome: lit("failed"),
        });
      if (!aborted) logFeatureBad("ultrareview_launch", "teleport_failed");
      return failedResult(
        commandRef ??
          (createFailMessage
            ? `Ultrareview could not start the cloud session: ${createFailMessage}`
            : `Repo is too large. Push a PR and use \`${invocation} <PR#>\` instead.`),
      );
    }
    launchCommand = "/ultrareview";
    scopeLabel =
      noMergeBase === "unrelated_history"
        ? `${headBranch} (all files \u2014 no common history with ${baseBranch})`
        : noMergeBase === "base_ref_missing"
          ? `${headBranch} (all files)`
          : noMergeBase === "first_commit"
            ? `${headBranch} (every file in the first commit)`
            : headBranch === baseBranch
              ? headBranch
              : `${headBranch} \u2192 ${baseBranch}`;
  }
  if (!remoteSession) {
    logEvent("tengu_review_remote_teleport_failed", {
      mode: lit("pr"),
      reason: failReason,
      status_code: failStatus,
      server_type: failServerType,
      server_reason: failServerReason,
    });
    if (!context.abortController.signal.aborted) logFeatureBad("ultrareview_launch", "teleport_failed");
    if (createFailMessage)
      return failedResult(`Ultrareview could not start the cloud session: ${createFailMessage}`);
    return null;
  }
  let taskId;
  if (!options?.skipTaskRegistration)
    taskId = registerRemoteAgentTask({
      remoteTaskType: "ultrareview",
      session: remoteSession,
      command: launchCommand,
      context,
      isRemoteReview: true,
      applyFixesOnComplete: options?.applyFixesOnComplete,
      reviewInstructions: scope.mode === "branch" ? scope.instructions : undefined,
      postReviewTo:
        options?.postReviewToPR && scope.mode === "pr" && !options?.signal?.aborted
          ? {
              repo: scope.repo,
              prNumber: scope.prNumber,
            }
          : undefined,
    }).taskId;
  logEvent("tengu_review_remote_launched", {
    mode: fromEnum(scope.mode),
    had_arg: scope.hadArg,
    post_armed: options?.postReviewToPR === true && scope.mode === "pr" && !options?.signal?.aborted,
    had_instructions: scope.mode === "branch" && !!scope.instructions,
    diff_files: scope.diffFiles,
    diff_lines: scope.diffLines,
  });
  if (scope.mode === "branch" && scope.noMergeBase) {
    logEvent("tengu_review_remote_precondition_recovery", {
      reason: lit("no_merge_base"),
      method: lit("empty_tree_bundle"),
      outcome: lit("succeeded"),
    });
    if (scope.noMergeBase === "first_commit") logFeatureOk("ultrareview_launch");
    else logFeatureSad("ultrareview_launch", "no_merge_base_empty_tree_fallback");
  } else logFeatureOk("ultrareview_launch");
  markUltrareviewRun(context.storageV5);
  let sessionUrl = remoteSessionUrl(remoteSession.id);
  let billingPrefix = billingNote.trim()
    ? `${billingNote.trim()}
`
    : "";
  let scopeSuffix = diffStat
    ? `
Scope: ${diffStat}`
    : "";
  let noteSuffix =
    scope.mode === "branch" && scope.instructions
      ? options?.skipTaskRegistration
        ? `
Your text was read as a note, not a base branch \u2014 the standard review runs on the diff above.`
        : `
Your text was read as a note, not a base branch \u2014 the standard review runs on the diff above, and the findings will be related to your note when they arrive.`
      : "";
  return {
    launched: true,
    sessionId: remoteSession.id,
    sessionUrl,
    taskId,
    title: remoteSession.title,
    blocks: [
      {
        type: "text",
        text: `${billingPrefix}Ultrareview launched for ${scopeLabel} (${getReviewDurationNote()}, runs in the cloud).${options?.findingsArriveInSession ? " The findings arrive here when it finishes." : ""}${
          options?.postReviewToPR && scope.mode === "pr"
            ? `
When it finishes, the findings will be posted to the PR as a comment from your GitHub account. (Keep this session open: the consent lives only here, so if it ends before the review finishes, nothing will be posted \u2014 even on resume.)`
            : ""
        }${scopeSuffix}${noteSuffix}${bundleNotices
          .map(
            (notice) => `
${notice}`,
          )
          .join("")}`,
      },
    ],
  };
}
//@ chunk-pp134gqz.js:28228-28775 placement
function ultrareviewLaunchAcknowledgementNudge(applyFixes, noteText) {
  return `The output above is already visible to the user. Briefly acknowledge it without repeating the target or billing note. Findings will arrive via task-notification.${applyFixes ? " The user passed --fix: when the findings arrive, apply them to the local working tree." : ""}${noteText ? ` The user's argument was interpreted as a review note, not a base branch: "${truncateToLength(noteText, POST_POLL_MS)}". The cloud review runs its standard pass over the branch diff and does not see the note; when the findings arrive, prioritize and relate them to the user's request.` : ""}`;
}
//@ chunk-pp134gqz.js:28775-28807 placement
var REASON_CODE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
//@ chunk-pp134gqz.js:28807-32703 placement
async function runUltrareviewHeadless(args, options) {
  if (!isUltrareviewWithBridge()) {
    let unavailableReason = ultrareviewUnavailableReason();
    let entitlementBlocker = unavailableReason === "entitlement" ? getBridgeEntitlementBlocker() : null;
    logEvent("tengu_review_remote_gate_blocked", {
      reason: fromEnumOpt(unavailableReason) ?? lit("unknown"),
      entitlement_blocker: fromEnumOpt(entitlementBlocker),
    });
    return {
      status: "error",
      message: "Ultrareview is currently unavailable.",
      ...(unavailableReason !== null && {
        gate_blocker: unavailableReason,
      }),
      ...(entitlementBlocker !== null && {
        entitlement_blocker: entitlementBlocker,
      }),
    };
  }
  await waitForPolicyLimitsToLoad();
  let policyDenied = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (policyDenied) {
    logOrgPolicyDenied("allow_remote_sessions", "slash_command");
    return {
      status: "error",
      message: policyDenied,
    };
  }
  let precheck = await precheckLaunchScope(args, options.invocation, {
    suppressSucceededRecoveryEvent: !options.confirm,
    suppressOfferedRecoveryEvent: options.confirm && !options.singlePass,
    confirmsBeforeLaunch: options.confirmsBeforeLaunch === true,
    personRanTheCommand: options.personRanTheCommand === true,
  });
  if (!precheck.ok)
    return {
      status: "error",
      message: precheck.error,
      reason: precheck.reason,
    };
  let gate = await checkOverageGate({
    overageConfirmed: options.overageConfirmed,
    credentials: options.context.credentials,
    skipLowCreditsNote: options.confirm && !options.singlePass,
    bundleFollows: precheck.scope.mode === "branch",
  });
  if (gate.kind === "blocked") {
    logEvent("tengu_review_overage_blocked", {
      reason: sanitizedMachineReasonForTelemetry(gate.reason),
    });
    return {
      status: "blocked",
      message: gate.message,
      actionUrl: gate.actionUrl,
      ...(REASON_CODE_PATTERN.test(gate.reason) && {
        reason: gate.reason,
      }),
    };
  }
  let scopeNote = () => {
    let scopeLine =
      precheck.scope.mode === "pr"
        ? `Reviewing PR ${precheck.scope.repo}#${precheck.scope.prNumber}.`
        : precheck.scope.noMergeBase
          ? "Reviewing all files on the current branch."
          : `Reviewing current branch against ${precheck.scope.baseBranch}.`;
    let noteLine =
      precheck.scope.mode === "branch" && precheck.scope.instructions
        ? ` Note for findings (not a base branch): "${previewInstructions(precheck.scope.instructions)}"`
        : "";
    return `
${scopeLine}${noteLine}`;
  };
  if (
    gate.kind === "proceed" &&
    gate.preflightUnavailable &&
    options.withholdOverageConsent &&
    !options.overageConfirmed
  )
    return {
      status: "needs-confirm",
      body: `Couldn't verify your review quota right now, so this review may bill as usage credits (${getReviewCostNote()}).${scopeNote()}`,
      billingNote: "",
    };
  if (gate.kind === "needs-confirm") {
    if (options.withholdOverageConsent)
      return {
        status: "needs-confirm",
        body: `${gate.body}${scopeNote()}`,
        billingNote: gate.billingNote,
      };
    logEvent("tengu_review_overage_dialog_shown", {});
    if (!options.confirm)
      return {
        status: "needs-confirm",
        body: `${gate.body}${scopeNote()}`,
        billingNote: gate.billingNote,
      };
    options.markOverageConfirmed();
  }
  if (options.confirm && precheck.scope.mode === "branch" && precheck.scope.noMergeBase)
    logEvent("tengu_review_remote_precondition_recovery", {
      reason: lit("no_merge_base"),
      method: lit("empty_tree_bundle"),
      outcome: lit("accepted"),
    });
  if (!options.confirm) {
    let scopeText =
      precheck.scope.mode === "pr"
        ? `Reviewing PR ${precheck.scope.repo}#${precheck.scope.prNumber}`
        : precheck.scope.noMergeBase === "unrelated_history"
          ? `Reviewing all files (no common history with ${precheck.scope.baseBranch})
Scope: ${precheck.scope.diffStat}`
          : precheck.scope.noMergeBase === "base_ref_missing"
            ? `Reviewing all files (no ${precheck.scope.baseBranch} branch to compare against)
Scope: ${precheck.scope.diffStat}`
            : precheck.scope.noMergeBase === "first_commit"
              ? `Reviewing every file in the first commit (there is nothing earlier to compare with)
Scope: ${precheck.scope.diffStat}`
              : `Reviewing current branch against ${precheck.scope.baseBranch}
Scope: ${precheck.scope.diffStat}`;
    let noteText =
      precheck.scope.mode === "branch" && precheck.scope.instructions
        ? `
Note for findings (not a base branch): "${previewInstructions(precheck.scope.instructions)}"`
        : "";
    return {
      status: "needs-confirm",
      body: `${scopeText}${noteText}
${getReviewDurationNote()} \xB7 Est. cost ${getReviewCostNote()} USD`,
      billingNote: gate.billingNote,
    };
  }
  let postDisabled = options.postReview === true && !isUltrareviewPostEnabled();
  let postToPr =
    options.postReview === true &&
    !postDisabled &&
    precheck.scope.mode === "pr" &&
    isGithubDotCom(precheck.scope.host);
  let launchResult = await launchRemoteReview(precheck.scope, options.context, gate.billingNote, {
    skipTaskRegistration: options.skipTaskRegistration,
    invocation: options.invocation,
    applyFixesOnComplete: options.applyFixes,
    postReviewToPR: postToPr,
  });
  if (!launchResult?.launched)
    return {
      status: "error",
      message:
        launchResult?.blocks
          .map((block) => (block.type === "text" ? block.text : ""))
          .join("")
          .trim() || "Failed to launch cloud review session.",
    };
  let postIgnored = options.postReview === true && !postToPr;
  let trimmed = launchResult.blocks
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  return {
    status: "launched",
    sessionId: launchResult.sessionId,
    sessionUrl: launchResult.sessionUrl,
    taskId: launchResult.taskId,
    title: launchResult.title,
    message: postDisabled
      ? `${trimmed}${POST_DISABLED_NOTE}`
      : postIgnored
        ? `${trimmed}${POST_IGNORED_NOTE}`
        : trimmed,
    billingNote: gate.billingNote,
    postReviewTo:
      postToPr && precheck.scope.mode === "pr"
        ? {
            repo: precheck.scope.repo,
            prNumber: precheck.scope.prNumber,
          }
        : undefined,
    postIgnored: postIgnored || undefined,
    lowCreditsNote: (options.singlePass && gate.kind === "needs-confirm" && gate.lowCreditsNote) || undefined,
  };
}
//@ chunk-pp134gqz.js:32703-32758 placement
async function hasRemoteRepository() {
  let currentRepositoryWithHost = await detectCurrentRepositoryWithHost();
  return !!currentRepositoryWithHost && !isNestedGitLabProject(currentRepositoryWithHost);
}
//@ chunk-pp134gqz.js:32758-33363 placement
/**
 * 非 git 仓库时的建议文字
 */
function noRepositoryAdvice(invocation, confirmsBeforeLaunch = false) {
  let initAdvice = confirmsBeforeLaunch
    ? `run "git init" and commit a starting point. ${invocation} then reviews the changes you make on top of that commit.`
    : `run "git init" and commit your work. ${invocation} then reviews that first commit whole if it is small enough, and after that the changes you make on top of it.`;
  let leadAdvice = isHostEntrypoint()
    ? "Open a folder that is a git repository with at least one commit, then try again."
    : `If your project already uses git, cd into its folder and rerun ${invocation}. If it doesn't yet, ${initAdvice}`;
  return `${invocation} reviews the changes a git branch makes on top of an earlier commit, but ${getCwd()} is not inside a git repository. ${leadAdvice}`;
}
//@ chunk-pp134gqz.js:33363-33456 placement
function isCwdHomeDir() {
  try {
    let homeDir = homedir();
    if (!homeDir) return false;
    return samePath(identity(resolve(getCwd())), identity(resolve(homeDir)));
  } catch {
    return false;
  }
}
export {
  parseUltrareviewArgs,
  runUltrareviewHeadless,
  ultrareviewLaunchAcknowledgementNudge,
  launchRemoteReview,
  POST_DISABLED_NOTE,
  POST_IGNORED_NOTE,
  precheckLaunchScope,
  checkOverageGate,
  previewInstructions,
  REVIEW_REMOTE_POLL_MS,
  getRemainingOverageBudget,
  checkOverageGate_2,
  fetchUltrareviewPreflight,
};

/**
 * commands/review/reviewRemote.ts
 *
 * ultrareview 配额响应结构（reviews_used/limit/remaining、is_overage）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/review/reviewRemote.ts
 * pieces: chunk-twvgrhqz.js (1), chunk-zn8pzrw0.js (26)
 * attribution: fingerprint 1, placement 26
 */
import { homedir } from "os";
import { resolve } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_26, create_2, create_3, create_6 } from "../../../vendor/zod/lib/index.mjs";
import { env } from "../../utils/env.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { X_CLAUDE_CODE_SESSION_ID } from "../../services/api/requestHeaders.js";
import { getSessionId } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isLimitEnabled, fetchUtilization } from "../../services/api/usage.js";
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
import { isTeamSubscriber, isEnterpriseSubscriber } from "../../utils/auth.js";
import { withTimeout } from "../../utils/sleep.js";
import { fetchPrepaidBalance } from "../../services/api/billing.js";
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
import { count } from "../../utils/collections.js";
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

//@ chunk-zn8pzrw0.js:1793-2103 placement
/**
 * ultrareview 预检响应 schema
 */
var ultrareviewPreflightSchema = DoctorLazy(() =>
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
//@ chunk-zn8pzrw0.js:2103-2190 placement
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
//@ chunk-zn8pzrw0.js:2190-3194 placement
/**
 * 调用 /v1/ultrareview/preflight
 */
async function fetchUltrareviewPreflight(credentials) {
  let e = env.CLAUDE_CODE_ULTRAREVIEW_PREFLIGHT_FIXTURE;
  if (e) {
    let u = ultrareviewPreflightSchema().safeParse(jsonParse(e));
    return u.success ? u.data : null;
  }
  try {
    let u = await apiClient.get("/v1/ultrareview/preflight", {
      auth: "teleport-org",
      timeout: 5000,
      credentials,
      headers: {
        [X_CLAUDE_CODE_SESSION_ID]: getSessionId(),
      },
    });
    if (!u.ok)
      switch (u.reason) {
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
    let r = ultrareviewPreflightSchema().safeParse(u.data);
    if (!r.success) {
      logForDebugging(`fetchUltrareviewPreflight schema mismatch: ${r.error.message}`);
      logFeatureSad("api_ultrareview_preflight", "schema_mismatch");
      return null;
    }
    logFeatureOk("api_ultrareview_preflight");
    return r.data;
  } catch (error) {
    logForDebugging(`fetchUltrareviewPreflight failed: ${error}`);
    logFeatureSad("api_ultrareview_preflight", "request_failed");
    return null;
  }
}
//@ chunk-zn8pzrw0.js:3194-3206 placement
var REVIEW_REMOTE_POLL_MS = 3000;
//@ chunk-zn8pzrw0.js:3206-3581 placement
/**
 * 剩余可用 overage 额度（USD）：未启用为 0，无上限为无穷，扣已用、再受余额/自动充值限制。
 */
function getRemainingOverageBudget(extraUsage, e) {
  if (!extraUsage || !isLimitEnabled(extraUsage) || !isUsdCurrency(extraUsage.currency)) return null;
  if (extraUsage.is_enabled !== true) return 0;
  if (e === null || !isUsdCurrency(e.currency)) return null;
  let { monthly_limit: monthlyLimit, used_credits: usedCredits } = extraUsage;
  let s;
  if (monthlyLimit === null) s = 1 / 0;
  else if (typeof monthlyLimit === "number" && typeof usedCredits === "number")
    s = monthlyLimit - usedCredits;
  else return null;
  let min = Math.min(s, e.auto_reload_settings?.enabled === true ? 1 / 0 : e.amount);
  return Number.isFinite(min) ? Math.max(0, min) : null;
}
//@ chunk-zn8pzrw0.js:3648-4172 placement
/**
 * 用量额度不足提示
 */
async function lowCreditsNote(credentials) {
  try {
    let e = typicalUltrareviewCost();
    if (e === null || isTeamSubscriber() || isEnterpriseSubscriber()) return null;
    let [u, r] = await withTimeout(
      Promise.all([fetchUtilization(credentials), fetchPrepaidBalance(credentials)]),
      REVIEW_REMOTE_POLL_MS,
      "ultrareview: usage credits read timed out",
    );
    let remainingOverageBudget = getRemainingOverageBudget(u?.extra_usage, r);
    if (remainingOverageBudget === null || remainingOverageBudget >= e * 100) return null;
    let l =
      remainingOverageBudget < 100
        ? "Less than $1"
        : `About ${formatCurrency(Math.floor(remainingOverageBudget / 100) * 100, "USD", "whole")}`;
    let h = formatCurrency(e * 100, "USD", "whole");
    return `${l} of usage credits left. A review usually uses about ${h} and stops if credits run out.`;
  } catch {
    logForDebugging("ultrareview: could not read usage credits left, so no low-credits line");
    return null;
  }
}
//@ chunk-zn8pzrw0.js:4172-4222 placement
var EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
//@ chunk-zn8pzrw0.js:4222-4413 placement
var POST_IGNORED_NOTE = `
Note: --post was ignored \u2014 posting applies only to GitHub.com pull request reviews.`;
var POST_DISABLED_NOTE = `
Note: --post was ignored \u2014 posting findings to the PR is currently turned off.`;
//@ chunk-zn8pzrw0.js:4413-4972 placement
function parseUltrareviewArgs(o) {
  let e = (h) =>
    String.raw`--fix|--comment|--post|--no-post|--max-findings(?:\s*=\s*(?!--)\S*|\s*=\S*|\s+${h})?`;
  let regExp = new RegExp(`^(${e(String.raw`(?!--)\S+`)})(?:\\s+|$)`);
  let regExp_2 = new RegExp(
    `(?:^|\\s+)(${e(String.raw`(?:\d+|[Aa][Ll][Ll]|[Dd][Ee][Ff][Aa][Uu][Ll][Tt])`)})$`,
  );
  let s = new Set();
  let trimmed = o.trim();
  for (;;) {
    let match = trimmed.match(regExp);
    if (!match) break;
    s.add(match[1]);
    trimmed = trimmed.slice(match[0].length);
  }
  for (;;) {
    let match = trimmed.match(regExp_2);
    if (!match) break;
    s.add(match[1]);
    trimmed = trimmed.slice(0, trimmed.length - match[0].length);
  }
  return {
    scopeArgs: trimmed,
    applyFixes: s.has("--fix"),
    postReview: s.has("--no-post") ? false : s.has("--post") ? true : undefined,
  };
}
//@ chunk-zn8pzrw0.js:4972-20851 placement
/**
 * ultrareview 启动前检查范围（仓库、分支、改动量、额度、预检）。
 */
async function precheckLaunchScope(o, e = "/code-review ultra", u) {
  if (!(await isInGitRepo())) {
    logEvent("tengu_review_remote_precondition_failed", {
      reason: lit("not_git_repo"),
      cwd_is_home: isCwdHomeDir(),
    });
    return {
      ok: false,
      reason: "not_git_repo",
      error: noRepositoryAdvice(e, u?.confirmsBeforeLaunch !== true),
    };
  }
  let trimmed = o.trim();
  let prUrl = parsePrUrl(trimmed);
  let l = prUrl?.num.toString() ?? trimmed.match(/^(?:#|PR[\s#]*)(\d+)$/i)?.[1] ?? trimmed;
  if (/^\d+$/.test(l)) {
    let n = (B) => {
      if (B === "succeeded" && u?.suppressSucceededRecoveryEvent) return;
      if (l !== trimmed)
        logEvent("tengu_review_remote_precondition_recovery", {
          reason: lit("base_ref_not_found"),
          method: lit("pr_arg_normalization"),
          outcome: fromEnum(B),
        });
    };
    let currentRepositoryWithHost = await detectCurrentRepositoryWithHost();
    let d =
      currentRepositoryWithHost && isNestedGitLabProject(currentRepositoryWithHost)
        ? null
        : currentRepositoryWithHost;
    let S =
      sameHost(prUrl?.host, d?.host) ||
      (!!prUrl && !!d && isGithubDotCom(prUrl.host) && isGithubDotCom(d.host));
    if (
      prUrl &&
      (!S ||
        prUrl.owner.toLowerCase() !== d?.owner.toLowerCase() ||
        prUrl.repo.toLowerCase() !== d?.name.toLowerCase())
    ) {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("pr_url_wrong_repo"),
        has_remote: !!d,
        cwd_is_home: isCwdHomeDir(),
      });
      n("failed");
      let B = `${prUrl.owner}/${prUrl.repo} on ${prUrl.host}`;
      let G = d ? `you're in ${d.owner}/${d.name} on ${d.host}` : "this directory has no GitHub remote";
      return {
        ok: false,
        reason: "pr_url_wrong_repo",
        error: `That link is for ${B}, but ${G}. cd into a checkout of that repo and run ${e} ${prUrl.num} from there.`,
      };
    }
    if (!d) {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("no_github_remote"),
        cwd_is_home: isCwdHomeDir(),
      });
      n("failed");
      return {
        ok: false,
        reason: "no_github_remote",
        error: `${e} <PR#> needs a GitHub remote so it knows which repository the PR is in. ${GITHUB_SETUP_HINT} If a GitHub repo already exists, run \`git remote add origin REPO_URL\`. Or run ${e} with no argument to review your current branch instead.`,
      };
    }
    if (isAnthropicRepo(d)) {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("monorepo_blocked"),
        cwd_is_home: isCwdHomeDir(),
      });
      n("failed");
      return {
        ok: false,
        reason: "monorepo_blocked",
        error: `${e} doesn't support pull requests in this repository. Run /code-review ${l}${e.startsWith("/") ? "" : " in Claude Code"} for a local review instead.`,
      };
    }
    let diffFiles;
    let diffLines;
    let [{ stdout: H, code: D }, C] = await Promise.all([
      execFileNoThrow(
        "gh",
        [
          "pr",
          "view",
          l,
          "--repo",
          `${d.host}/${d.owner}/${d.name}`,
          "--json",
          "additions,deletions,changedFiles",
        ],
        {
          timeout: 5000,
          preserveOutputOnError: false,
        },
      ),
      isGithubDotCom(d.host) && isGithubAccessPrecheckEnabled() && !isEssentialTrafficOnly()
        ? probeGithubRepoAccess(d.owner, d.name, u?.accessProbeBudgetMs)
        : null,
    ]);
    if (C && !u?.suppressOfferedRecoveryEvent)
      logEvent("tengu_review_remote_github_access_probe", {
        verdict: fromEnum(C.verdict),
        http_status: C.httpStatus ?? undefined,
      });
    if (C?.verdict === "github_not_connected" || C?.verdict === "github_repo_not_found") {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: fromEnum(C.verdict),
        cwd_is_home: isCwdHomeDir(),
      });
      n("failed");
      let webSetupHint = isWebSetupOfferable()
        ? `run /web-setup${e.startsWith("/") ? "" : " in Claude Code"} to reuse your GitHub CLI login`
        : "";
      let rerun = `then re-run ${e} ${l}`;
      return {
        ok: false,
        reason: C.verdict,
        error:
          C.verdict === "github_not_connected"
            ? noAccessText({
                subject: `Ultrareview clones ${d.owner}/${d.name} in the cloud`,
                webSetupHint,
                rerun,
              })
            : installAppHint({
                owner: d.owner,
                name: d.name,
                webSetupHint,
                rerun,
                leadWithWebSetup: D === 0,
              }),
      };
    }
    if (D === 0 && H.trim())
      try {
        let B = jsonParse(H);
        let { maxFiles, maxLines } = diffSizeLimits();
        let Q = B.additions + B.deletions;
        if (Number.isFinite(B.changedFiles) && Number.isFinite(Q)) {
          diffFiles = B.changedFiles;
          diffLines = Q;
        }
        if (B.changedFiles > maxFiles || Q > maxLines) {
          logEvent("tengu_review_remote_precondition_failed", {
            reason: lit("pr_diff_too_large"),
            files: B.changedFiles,
            lines: Q,
            max_files: maxFiles,
            max_lines: maxLines,
            cwd_is_home: isCwdHomeDir(),
          });
          n("failed");
          return {
            ok: false,
            reason: "pr_diff_too_large",
            error: `PR #${l} is too large for ultrareview (${B.changedFiles} files, ${Q.toLocaleString()} lines). Split it into smaller PRs, or run \`${e}\` on a narrower local diff.`,
          };
        }
      } catch {}
    n("succeeded");
    return {
      ok: true,
      scope: {
        mode: "pr",
        prNumber: l,
        repo: `${d.owner}/${d.name}`,
        host: d.host,
        hadArg: true,
        diffFiles,
        diffLines,
      },
    };
  }
  let h = await probeRepoBundleSize();
  if (h.tooLarge) {
    logEvent("tengu_review_remote_precondition_failed", {
      reason: lit("repo_too_large_to_bundle"),
      pack_bytes: h.sizeBytes ?? undefined,
      pack_objects: h.inPackCount ?? undefined,
      cwd_is_home: isCwdHomeDir(),
    });
    return {
      ok: false,
      reason: "repo_too_large_to_bundle",
      error: `Repo is too large to bundle. Push a PR and use \`${e} <PR#>\` instead.`,
    };
  }
  let k = async (n) =>
    (
      await execFileNoThrow(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--verify", "--quiet", "--end-of-options", n],
        {
          preserveOutputOnError: false,
        },
      )
    ).code === 0;
  let matches = /\s/.test(trimmed);
  let L = matches && ((await k(`origin/${trimmed}`)) || (await k(trimmed)));
  let M = matches && !L ? trimmed.match(/https:\/\/\S*\/pull\/\d+\b/) : null;
  let T =
    matches && !L && !M
      ? (trimmed.match(/(?<![\w/#-])(?:#|PR)[-\s#]*(\d+)\b/i) ??
        trimmed.match(/(?<![\w/#-])pull[\s-]+request[-\s#]*(\d+)\b/i) ??
        trimmed.match(/\/pull\/(\d+)\b/i) ??
        trimmed.match(/^(\d+)\b/))
      : null;
  if (M || T) {
    let n = M ? M[0] : `#${T[1]}`;
    let _ = M ? M[0] : T[1];
    logEvent("tengu_review_remote_precondition_recovery", {
      reason: lit("base_ref_not_found"),
      method: lit("embedded_pr_hint"),
      outcome: lit("offered"),
    });
    logEvent("tengu_review_remote_precondition_failed", {
      reason: lit("base_ref_not_found"),
      looks_like_url: /^https?:/i.test(trimmed),
      looks_like_sha: false,
      starts_with_hash: trimmed.startsWith("#"),
      has_slash: trimmed.includes("/"),
      has_whitespace: true,
      has_pr_ref: true,
      has_remote: await hasRemoteRepository(),
      cwd_is_home: isCwdHomeDir(),
    });
    return {
      ok: false,
      reason: "base_ref_not_found",
      error: `Your request mentions what looks like a PR reference (${n}). To review that PR, run \`${e} ${_}\`. To review your current branch instead, rerun without the PR-style reference.`,
    };
  }
  let U = matches && !L && !trimmed.startsWith("-");
  let instructions = U ? trimmed : undefined;
  let v = U ? "" : trimmed;
  let z = false;
  if (v) {
    if (!(await k(`origin/${v}`)) && !(await k(v))) {
      let remoteBranch = await resolveRemoteBranch(v);
      if (remoteBranch === "recovered" && (await k(`origin/${v}`))) z = true;
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
            looks_like_url: /^https?:/i.test(v),
            looks_like_sha: /^[0-9a-f]{7,40}$/i.test(v),
            starts_with_hash: v.startsWith("#"),
            has_slash: v.includes("/"),
            has_whitespace: /\s/.test(v),
            has_remote: await hasRemoteRepository(),
            cwd_is_home: isCwdHomeDir(),
          });
          return {
            ok: false,
            reason: "base_ref_not_found",
            error: `"${v}" exists on origin but couldn't be fetched. Run \`git fetch origin ${v}\` and try ${e} again.`,
          };
        }
        let _ = await listBranchRefs(v);
        if (_)
          logEvent("tengu_review_remote_precondition_recovery", {
            reason: lit("base_ref_not_found"),
            method: lit("branch_suggestion"),
            outcome: lit("offered"),
          });
        logEvent("tengu_review_remote_precondition_failed", {
          reason: lit("base_ref_not_found"),
          looks_like_url: /^https?:/i.test(v),
          looks_like_sha: /^[0-9a-f]{7,40}$/i.test(v),
          starts_with_hash: v.startsWith("#"),
          has_slash: v.includes("/"),
          has_whitespace: /\s/.test(v),
          has_remote: await hasRemoteRepository(),
          cwd_is_home: isCwdHomeDir(),
        });
        let d = _ ? ` Did you mean \`${_}\`?` : "";
        return {
          ok: false,
          reason: "base_ref_not_found",
          error: `"${v}" is not a branch or commit in this repo.${d} ${e} takes a PR number, a base branch or commit, or no argument (reviews your current branch). Try ${e} by itself.`,
        };
      }
    }
  }
  let q = (n) => {
    if (z)
      logEvent("tengu_review_remote_precondition_recovery", {
        reason: lit("base_ref_not_found"),
        method: lit("fetch_retry"),
        outcome: fromEnum(n),
      });
    if (U) {
      if (n === "succeeded" && u?.suppressSucceededRecoveryEvent) return;
      logEvent("tengu_review_remote_precondition_recovery", {
        reason: lit("base_ref_not_found"),
        method: lit("prose_instructions"),
        outcome: fromEnum(n),
      });
    }
  };
  let R = v || (await getDefaultBranch()) || "main";
  let X = (await getBranch()) || "HEAD";
  let Z = async (n) =>
    execFileNoThrow(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "merge-base", n, "HEAD"], {
      preserveOutputOnError: false,
      env: getRemoteHostSessionCount(),
    });
  let W = `origin/${R}`;
  let { stdout, code } = await Z(W);
  if (code !== 0) {
    W = R;
    ({ stdout, code } = await Z(W));
  }
  let trimmed_2 = stdout.trim();
  let j = (n) =>
    execFileNoThrow(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...n], {
      preserveOutputOnError: false,
      env: getRemoteHostSessionCount(),
    });
  let error = `Your checkout has no branches (detached HEAD only), which cloud review can't bundle. Create one first \u2014 \`git checkout -b <name>\` \u2014 then rerun ${e}.`;
  let ie = async () =>
    v.length > 0 ||
    (await j(["rev-parse", "--verify", "--quiet", `origin/${R}`])).code === 0 ||
    (await j(["rev-parse", "--verify", "--quiet", R])).code === 0;
  let E = async (n, headBranch = X) => {
    let d = n || (await ie());
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
      if (n && !stdout.trim()) return null;
      if (!stdout.trim()) {
        logEvent("tengu_review_remote_precondition_failed", {
          reason: lit("empty_diff"),
          cwd_is_home: isCwdHomeDir(),
        });
        q("failed");
        return {
          ok: false,
          reason: "empty_diff",
          error: d
            ? `It doesn't look like you have any new commits or changes to review against your ${R} branch. Stage or commit them first?`
            : "It doesn't look like you have any changes to review. Stage or commit them first?",
        };
      }
      let shortstat = parseShortstat(stdout);
      let H = shortstat ? shortstat.linesAdded + shortstat.linesRemoved : 0;
      let { maxFiles, maxLines } = diffSizeLimits();
      if (shortstat && (shortstat.filesCount > maxFiles || H > maxLines)) {
        logEvent("tengu_review_remote_precondition_failed", {
          reason: lit("local_diff_too_large"),
          files: shortstat.filesCount,
          lines: H,
          max_files: maxFiles,
          max_lines: maxLines,
          after_fallback: true,
          cwd_is_home: isCwdHomeDir(),
          first_commit: n || undefined,
        });
        q("failed");
        let B = n
          ? `Your first commit is the base from here on: make your changes and rerun ${e} to review only those.`
          : d
            ? `Review a smaller subset by committing it on a branch off an empty base, or push a PR and use \`${e} <PR#>\`.`
            : `This repo has no ${R} branch \u2014 if another branch is your base, pass it explicitly (\`${e} <branch>\`). Otherwise review a smaller subset by committing it on a branch off an empty base, or push a PR and use \`${e} <PR#>\`.`;
        return {
          ok: false,
          reason: "local_diff_too_large",
          error: `This looks like a first review of the entire repository (${stdout.trim()}), which exceeds ultrareview's limit. ${B}`,
        };
      }
      if (!u?.suppressOfferedRecoveryEvent)
        logEvent("tengu_review_remote_precondition_recovery", {
          reason: lit("no_merge_base"),
          method: lit("empty_tree_bundle"),
          outcome: lit("offered"),
          files: shortstat?.filesCount,
          lines: shortstat ? H : undefined,
          is_shallow: false,
          first_commit: n || undefined,
        });
      q("succeeded");
      return {
        ok: true,
        scope: {
          mode: "branch",
          headBranch,
          baseBranch: R,
          mergeBaseSha: EMPTY_TREE_SHA,
          diffStat: stdout.trim(),
          hadArg: v.length > 0,
          diffFiles: shortstat?.filesCount,
          diffLines: shortstat ? H : undefined,
          noMergeBase: n ? "first_commit" : d ? "unrelated_history" : "base_ref_missing",
          instructions,
        },
      };
    }
    return null;
  };
  if (code !== 0 || !trimmed_2) {
    let n = (await j(["rev-parse", "--verify", "--quiet", "HEAD"])).code === 0;
    let trimmed = (await j(["rev-parse", "--is-shallow-repository"])).stdout.trim();
    let d = trimmed === "true";
    let S = trimmed === "false";
    let A = n && S && isEmptyTreeFallbackEnabled();
    let y = A ? await j(["for-each-ref", "--count=1", "refs/"]) : null;
    let H = y !== null && y.stdout.trim() !== "";
    let D = y !== null && y.code === 0 && y.stdout.trim() === "";
    let C = false;
    if (A && H)
      if (u?.confirmsBeforeLaunch === true || u?.personRanTheCommand === true) {
        let G = await E(false);
        if (G) return G;
      } else C = true;
    logEvent("tengu_review_remote_precondition_failed", {
      reason: lit("no_merge_base"),
      cwd_is_home: isCwdHomeDir(),
      is_shallow: d,
      head_resolves: n,
      arg_was_explicit: v.length > 0,
      has_refs: H ? true : D ? false : undefined,
      whole_repository_held_back: C || undefined,
    });
    q("failed");
    if (C)
      return {
        ok: false,
        reason: "no_merge_base",
        error: `${(await ie()) ? `${R} shares no history with your checkout` : `This repository has no ${R} branch to compare with`}, so a review here would cover every file. To review it whole, a person can run /ultrareview in an interactive Claude Code session, which asks before it spends anything.`,
      };
    if (!n)
      return {
        ok: false,
        reason: "no_merge_base",
        error: !u?.confirmsBeforeLaunch
          ? `Your current branch has no commits yet, so there is nothing to review. Commit a starting point first. ${e} then reviews the changes you make on top of that commit.`
          : `Your current branch has no commits yet, so there is nothing to review. Commit your work first, then rerun ${e}.`,
      };
    if (d) {
      logEvent("tengu_review_remote_precondition_recovery", {
        reason: lit("no_merge_base"),
        method: lit("deepen_hint"),
        outcome: lit("offered"),
        is_shallow: true,
      });
      return {
        ok: false,
        reason: "no_merge_base",
        error: v
          ? `Your clone is shallow and doesn't contain the point where your branch forked from ${R}. Run \`git fetch --deepen=100 origin ${R}\` (or \`git fetch --unshallow origin\`) and rerun ${e}.`
          : `Your clone is shallow and doesn't contain the point where your branch forked from ${R}. Run \`git fetch --unshallow origin\` and rerun ${e}. If your base branch isn't ${R}, pass it explicitly (\`${e} <branch>\`).`,
      };
    }
    if (D)
      return {
        ok: false,
        reason: "no_refs",
        error,
      };
    let B = z
      ? S
        ? `${R} was fetched from origin but shares no history with HEAD. If another branch is your real base, pass it explicitly (\`${e} <branch>\`).`
        : `${R} was fetched from origin but shares no history with HEAD. Try \`git fetch --unshallow origin\` (or deepen the clone) and rerun.`
      : v
        ? `Make sure ${R} exists locally or on origin (try \`git fetch origin ${R}\`).`
        : `Pass the base branch explicitly (e.g. \`${e} develop\`) or make sure you're in a git repo with a ${R} branch.`;
    return {
      ok: false,
      reason: "no_merge_base",
      error: `Could not find merge-base with ${R}. ${B}`,
    };
  }
  if (v.length > 0) {
    let n = await j(["for-each-ref", "--count=1", "refs/"]);
    if (n.code === 0 && n.stdout.trim() === "") {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("no_refs"),
        cwd_is_home: isCwdHomeDir(),
        arg_was_explicit: true,
      });
      q("failed");
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
      trimmed_2,
    ],
    {
      LC_ALL: "C",
    },
    {
      preserveOutputOnError: false,
    },
  );
  if (code_2 === 0 && !stdout_2.trim()) {
    let headInfo = await readHeadInfo(trimmed_2, R);
    let headBranch = headInfo.headBranch;
    let d =
      headInfo.headAtMergeBase === true &&
      headInfo.headIsRoot === true &&
      headInfo.untrackedCount === 0 &&
      isEmptyTreeFallbackEnabled() &&
      (await j(["rev-parse", "--is-shallow-repository"])).stdout.trim() === "false" &&
      (await j(["rev-parse", "--verify", "--quiet", "--end-of-options", `${W}^{commit}`])).stdout.trim() ===
        trimmed_2;
    let S = d && u?.confirmsBeforeLaunch !== true;
    if (d && !S) {
      let V = await E(true, headBranch);
      if (V) return V;
    }
    logEvent("tengu_review_remote_precondition_failed", {
      reason: lit("empty_diff"),
      used_origin_ref: W !== R,
      had_explicit_base: v.length > 0,
      cwd_is_home: isCwdHomeDir(),
      on_base_branch: headInfo.onBaseBranch,
      head_at_merge_base: headInfo.headAtMergeBase,
      first_commit_held_back: S || undefined,
      has_untracked: headInfo.untrackedCount === undefined ? undefined : headInfo.untrackedCount > 0,
    });
    q("failed");
    let A = v
      ? `try a different base, e.g. \`${e} <branch>\``
      : `pass one explicitly, e.g. \`${e} <branch>\``;
    let y = `${W} (merge-base ${trimmed_2.slice(0, 7)})`;
    let H = "no staged or unstaged edits to tracked files";
    let D;
    let C;
    if (headInfo.headAtMergeBase && headBranch && headInfo.onBaseBranch) {
      let V = `If your work is on another branch, switch to it, or if the base should be something else, ${A}.`;
      if (W === headBranch) {
        D = `you're on ${headBranch}, which is also the base of this review, and it has ${H}`;
        C = `Everything already committed on ${headBranch} counts as the base here, so only edits you haven't committed yet would be reviewed. ${V}`;
      } else {
        D = `you're on ${headBranch}, which is also the base of this review, and it has no commits beyond ${y} and ${H}`;
        C = V;
      }
    } else if (headInfo.headAtMergeBase && headBranch === "HEAD") {
      D = `the commit you have checked out is already part of ${y}, and there are ${H}`;
      C = `If your work is on a branch, switch to it. If you meant a different base, ${A}.`;
    } else if (headInfo.headAtMergeBase && headBranch) {
      D = `${headBranch} has no commits beyond ${y} and ${H}`;
      C = `If your work is on another branch, switch to it. If this branch was already merged or you meant a different base, ${A}.`;
    } else {
      D = `the diff against ${y} is empty`;
      C = `If you have local edits, stage or commit them first. If your branch was already merged or you meant a different base, ${A}.`;
    }
    let B = "";
    if (headInfo.headAtMergeBase && headInfo.parentSha) {
      let sliced = headInfo.parentSha.slice(0, 12);
      let Q = /^\d+$/.test(sliced) ? headInfo.parentSha : sliced;
      logEvent("tengu_review_remote_precondition_recovery", {
        reason: lit("empty_diff"),
        method: lit("last_commit_hint"),
        outcome: lit("offered"),
      });
      B = ` To review your latest commit anyway, run \`${e} ${Q}\`. That id is the commit before it, and any earlier commit id or tag works the same way.`;
    }
    let G = S
      ? " To review this first commit whole, run /ultrareview in an interactive Claude Code session, which asks before it spends anything."
      : "";
    return {
      ok: false,
      reason: "empty_diff",
      error: `No changes to review: ${D}.${untrackedFilesNote(headInfo.untrackedCount, e)} ${C}${B}${G}`,
    };
  }
  let shortstat = parseShortstat(stdout_2);
  if (shortstat) {
    let { maxFiles, maxLines } = diffSizeLimits();
    let d = shortstat.linesAdded + shortstat.linesRemoved;
    if (shortstat.filesCount > maxFiles || d > maxLines) {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("local_diff_too_large"),
        files: shortstat.filesCount,
        lines: d,
        max_files: maxFiles,
        max_lines: maxLines,
        cwd_is_home: isCwdHomeDir(),
      });
      q("failed");
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
          trimmed_2,
        ],
        {},
        {
          preserveOutputOnError: false,
          timeout: 1e4,
          maxBuffer: 10485760,
        },
      );
      let y = code === 0 ? largestFilesNote(stdout) : "";
      return {
        ok: false,
        reason: "local_diff_too_large",
        error: `Diff is too large for ultrareview: ${shortstat.filesCount.toLocaleString()} ${plural(shortstat.filesCount, "file")}, ${d.toLocaleString()} ${plural(d, "line")} changed (limits: ${maxFiles.toLocaleString()} ${plural(maxFiles, "file")}, ${maxLines.toLocaleString()} ${plural(maxLines, "line")}).${y} Pass a closer base branch (\`${e} <branch>\`) to narrow the scope, or split the change.`,
      };
    }
  }
  q("succeeded");
  return {
    ok: true,
    scope: {
      mode: "branch",
      headBranch: X,
      baseBranch: R,
      mergeBaseSha: trimmed_2,
      diffStat: stdout_2.trim(),
      hadArg: v.length > 0,
      diffFiles: shortstat?.filesCount,
      diffLines: shortstat ? shortstat.linesAdded + shortstat.linesRemoved : undefined,
      instructions,
    },
  };
}
//@ chunk-zn8pzrw0.js:20851-21701 placement
/**
 * 读取 HEAD 父提交、符号引用等
 */
async function readHeadInfo(o, e) {
  let [u, r, s] = await Promise.all([
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
  let [l, h, ...k] = u.code === 0 ? u.stdout.trim().split(/\s+/) : [];
  let w =
    r.exitCode === 0
      ? r.stdout.trim().replace(/^refs\/heads\//, "") || undefined
      : r.exitCode === 1
        ? "HEAD"
        : undefined;
  return {
    headBranch: w,
    onBaseBranch: w === undefined ? undefined : w !== "HEAD" && (w === e || `origin/${w}` === e),
    headAtMergeBase: l ? l === o : undefined,
    parentSha: k.length ? undefined : h || undefined,
    headIsRoot: l ? !h : undefined,
    untrackedCount: s.code === 0 ? count(s.stdout.split("\x00"), Boolean) : undefined,
  };
}
//@ chunk-zn8pzrw0.js:21701-21959 placement
/**
 * 未跟踪文件提示
 */
function untrackedFilesNote(untrackedCount, e) {
  if (!untrackedCount) return "";
  return ` Git also sees ${untrackedCount.toLocaleString()} untracked ${plural(untrackedCount, "file or folder", "files or folders")} here. New files aren't part of a review until git tracks them: run \`git add\` on the ones you want reviewed, then rerun ${e}.`;
}
//@ chunk-zn8pzrw0.js:21959-22300 placement
/**
 * 改动最大的文件列表
 */
function largestFilesNote(stdout, e = 3) {
  let { perFileStats } = parseRawNumstat(stdout, Number.POSITIVE_INFINITY);
  let filtered = [...perFileStats.entries()]
    .map(([l, h]) => ({
      path: l,
      lines: h.added + h.removed,
    }))
    .filter((l) => l.lines > 0);
  if (filtered.length === 0) return "";
  return ` Largest files: ${filtered
    .sort((l, h) => h.lines - l.lines)
    .slice(0, e)
    .map((l) => `${l.path} (${l.lines.toLocaleString()} ${plural(l.lines, "line")})`)
    .join(", ")}.`;
}
//@ chunk-zn8pzrw0.js:22300-22363 placement
function previewInstructions(instructions, e = 80) {
  return truncateToWidth(instructions.replace(/\s+/g, " ").trim(), e);
}
//@ chunk-zn8pzrw0.js:22363-23206 placement
/**
 * 检查远端分支是否存在
 */
async function resolveRemoteBranch(o) {
  if (o.startsWith("-") || o.includes(":") || /\s/.test(o)) return "not_found";
  let env_2 = {
    ...withGitNoPromptEnv(),
    GIT_SSH_COMMAND: `${env.GIT_SSH_COMMAND || "ssh"} -o BatchMode=yes -o StrictHostKeyChecking=yes`,
    GIT_ALLOW_PROTOCOL: "https:http:ssh",
  };
  let u = await execFileNoThrow(
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
      o,
    ],
    {
      timeout: 4000,
      preserveOutputOnError: false,
      env: env_2,
    },
  );
  if (u.code !== 0) return u.code === 2 ? "not_found" : "probe_failed";
  if (
    !u.stdout
      .split(
        `
`,
      )
      .some((line) => line.split("\t")[1]?.trim() === `refs/heads/${o}`)
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
        `refs/heads/${o}:refs/remotes/origin/${o}`,
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
//@ chunk-zn8pzrw0.js:23206-23834 placement
/**
 * 列出本地与 origin 分支引用
 */
async function listBranchRefs(o) {
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
  let r = new Map();
  for (let line of stdout.split(`
`)) {
    let trimmed = line.trim();
    if (!trimmed || trimmed === "origin" || trimmed === "origin/HEAD") continue;
    let L = trimmed.startsWith("origin/") ? trimmed.slice(7) : trimmed;
    if (trimmed.startsWith("origin/") || !r.has(L)) r.set(L, trimmed);
  }
  let s = o === "main" ? "master" : o === "master" ? "main" : null;
  if (s !== null) {
    let k = r.get(s);
    if (k) return k;
  }
  let l = null;
  let h = 3;
  for (let [k, w] of r) {
    if (Math.abs(k.length - o.length) >= h) continue;
    let L = boundedEditDistance(o, k, h - 1);
    if (L > 0 && L < h) {
      h = L;
      l = w;
    }
  }
  return l;
}
//@ chunk-zn8pzrw0.js:23834-24046 placement
/**
 * 预检失败时的提示
 */
var PREFLIGHT_UNAVAILABLE_MESSAGE =
  "Couldn't check whether this review can run, so it stopped before uploading your code. Try again shortly; if this keeps happening, open a pull request for this branch and review the pull request instead.";
//@ chunk-zn8pzrw0.js:24046-24881 placement
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
      let k = skipLowCreditsNote ? null : await lowCreditsNote(credentials);
      return {
        kind: "needs-confirm",
        body: `This review bills as usage credits (${getReviewCostNote()}).${
          k
            ? `
${k}`
            : ""
        }`,
        lowCreditsNote: k,
        billingNote,
        githubLogin,
      };
    }
  }
}
//@ chunk-zn8pzrw0.js:24881-24890 placement
var RESULT_RELAY_MARGIN_MINUTES = 3;
//@ chunk-zn8pzrw0.js:24890-30797 placement = launchRemoteReview (0.427)
async function launchRemoteReview(scope, context, billingNote, r) {
  let invocation = r?.invocation ?? "/code-review ultra";
  let l = (text) => ({
    launched: false,
    blocks: [
      {
        type: "text",
        text,
      },
    ],
  });
  let h = await checkRemoteSessionEligibility({
    allowBundle: true,
    storageV5: context.storageV5,
    credentials: context.credentials,
  });
  if (!h.eligible) {
    let errors = h.errors;
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
      return l(`Ultrareview cannot launch:
${joined}`);
    }
  }
  let CODE_REVIEW_ENV_ID = "env_011111111111111111111113";
  let w = ultrareviewConfig();
  let posInt = (v, fallback, max) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
    let n = Math.floor(v);
    if (n <= 0) return fallback;
    return n > max ? fallback : n;
  };
  let M = ultrareviewModelOverride();
  let T = {
    BUGHUNTER_DRY_RUN: "1",
    AUTOPATCH_ENABLE_ASIMOV: "1",
    ...(w?.code_quality !== false && {
      BUGHUNTER_CODE_QUALITY: "1",
    }),
    BUGHUNTER_FLEET_SIZE: String(posInt(w?.fleet_size, 5, 20)),
    BUGHUNTER_MAX_DURATION: String(posInt(w?.max_duration_minutes, 10, 25)),
    BUGHUNTER_AGENT_TIMEOUT: String(posInt(w?.agent_timeout_seconds, 600, 1800)),
    BUGHUNTER_TOTAL_WALLCLOCK: String(posInt(w?.total_wallclock_minutes, 22, 27)),
    BUGHUNTER_RESULT_RELAY_MAX_SEC: String((clientWaitMinutes() - RESULT_RELAY_MARGIN_MINUTES) * 60),
    ...(M && {
      BUGHUNTER_MODEL: M,
    }),
    ...(process.env.BUGHUNTER_DEV_BUNDLE_B64 && {
      BUGHUNTER_DEV_BUNDLE_B64: process.env.BUGHUNTER_DEV_BUNDLE_B64,
    }),
  };
  let U;
  let ee;
  let v;
  let z = "";
  let q = [];
  let R;
  let X;
  let Z;
  let W;
  let J;
  if (scope.mode === "pr") {
    let repo = await detectCurrentRepositoryWithHost();
    let P = repo && isNestedGitLabProject(repo) ? null : repo;
    if (!P) {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("no_github_remote_post_confirm"),
        cwd_is_home: isCwdHomeDir(),
      });
      logFeatureBad("ultrareview_launch", "no_github_remote");
      return null;
    }
    let x = `ultrareview: ${P.owner}/${P.name}#${scope.prNumber}`;
    U = await teleportToRemote({
      initialMessage: null,
      source: "ultrareview",
      description: x,
      title: x,
      signal: context.abortController.signal,
      storageV5: context.storageV5,
      credentials: context.credentials,
      branchName: `refs/pull/${scope.prNumber}/head`,
      environmentId: CODE_REVIEW_ENV_ID,
      tags: ["ultrareview"],
      environmentVariables: {
        BUGHUNTER_PR_NUMBER: scope.prNumber,
        BUGHUNTER_REPOSITORY: `${P.owner}/${P.name}`,
        ...T,
      },
      onCreateFail: (N, n, _) => {
        R = N;
        X = fromEnum(n);
        Z = _?.status;
        W = fromEnumOpt(_?.serverType);
        J = fromEnumOpt(_?.serverReason);
      },
    });
    ee = `/ultrareview ${scope.prNumber}`;
    v = `${P.owner}/${P.name}#${scope.prNumber}`;
  } else {
    let { headBranch, baseBranch, mergeBaseSha, diffStat, noMergeBase } = scope;
    z = diffStat;
    let _;
    let bundleFailKind;
    U = await teleportToRemote({
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
        ...T,
      },
      onBundleFail: (S, A) => {
        _ = S;
        bundleFailKind = fromEnum(A);
      },
      onBundleNotice: (S) => {
        q.push(S);
      },
      onCreateFail: (S, A, y) => {
        R = S;
        X = fromEnum(A);
        Z = y?.status;
        W = fromEnumOpt(y?.serverType);
        J = fromEnumOpt(y?.serverReason);
      },
    });
    if (!U) {
      logEvent("tengu_review_remote_teleport_failed", {
        mode: lit("branch"),
        reason: X,
        bundle_fail_kind: bundleFailKind,
        status_code: Z,
        server_type: W,
        server_reason: J,
      });
      let aborted = context.abortController.signal.aborted;
      if (noMergeBase && !aborted)
        logEvent("tengu_review_remote_precondition_recovery", {
          reason: lit("no_merge_base"),
          method: lit("empty_tree_bundle"),
          outcome: lit("failed"),
        });
      if (!aborted) logFeatureBad("ultrareview_launch", "teleport_failed");
      return l(
        _ ??
          (R
            ? `Ultrareview could not start the cloud session: ${R}`
            : `Repo is too large. Push a PR and use \`${invocation} <PR#>\` instead.`),
      );
    }
    ee = "/ultrareview";
    v =
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
  if (!U) {
    logEvent("tengu_review_remote_teleport_failed", {
      mode: lit("pr"),
      reason: X,
      status_code: Z,
      server_type: W,
      server_reason: J,
    });
    if (!context.abortController.signal.aborted) logFeatureBad("ultrareview_launch", "teleport_failed");
    if (R) return l(`Ultrareview could not start the cloud session: ${R}`);
    return null;
  }
  let taskId;
  if (!r?.skipTaskRegistration)
    taskId = registerRemoteAgentTask({
      remoteTaskType: "ultrareview",
      session: U,
      command: ee,
      context,
      isRemoteReview: true,
      applyFixesOnComplete: r?.applyFixesOnComplete,
      reviewInstructions: scope.mode === "branch" ? scope.instructions : undefined,
      postReviewTo:
        r?.postReviewToPR && scope.mode === "pr" && !r?.signal?.aborted
          ? {
              repo: scope.repo,
              prNumber: scope.prNumber,
            }
          : undefined,
    }).taskId;
  logEvent("tengu_review_remote_launched", {
    mode: fromEnum(scope.mode),
    had_arg: scope.hadArg,
    post_armed: r?.postReviewToPR === true && scope.mode === "pr" && !r?.signal?.aborted,
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
  let sessionUrl = remoteSessionUrl(U.id);
  let j = billingNote.trim()
    ? `${billingNote.trim()}
`
    : "";
  let oe = z
    ? `
Scope: ${z}`
    : "";
  let ie =
    scope.mode === "branch" && scope.instructions
      ? r?.skipTaskRegistration
        ? `
Your text was read as a note, not a base branch \u2014 the standard review runs on the diff above.`
        : `
Your text was read as a note, not a base branch \u2014 the standard review runs on the diff above, and the findings will be related to your note when they arrive.`
      : "";
  return {
    launched: true,
    sessionId: U.id,
    sessionUrl,
    taskId,
    title: U.title,
    blocks: [
      {
        type: "text",
        text: `${j}Ultrareview launched for ${v} (${getReviewDurationNote()}, runs in the cloud).${r?.findingsArriveInSession ? " The findings arrive here when it finishes." : ""}${
          r?.postReviewToPR && scope.mode === "pr"
            ? `
When it finishes, the findings will be posted to the PR as a comment from your GitHub account. (Keep this session open: the consent lives only here, so if it ends before the review finishes, nothing will be posted \u2014 even on resume.)`
            : ""
        }${oe}${ie}${q
          .map(
            (E) => `
${E}`,
          )
          .join("")}`,
      },
    ],
  };
}
//@ chunk-zn8pzrw0.js:30797-31345 placement
function ultrareviewLaunchAcknowledgementNudge(applyFixes, e) {
  return `The output above is already visible to the user. Briefly acknowledge it without repeating the target or billing note. Findings will arrive via task-notification.${applyFixes ? " The user passed --fix: when the findings arrive, apply them to the local working tree." : ""}${e ? ` The user's argument was interpreted as a review note, not a base branch: "${truncateToLength(e, POST_POLL_MS)}". The cloud review runs its standard pass over the branch diff and does not see the note; when the findings arrive, prioritize and relate them to the user's request.` : ""}`;
}
//@ chunk-zn8pzrw0.js:31345-31377 placement
var REASON_CODE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
//@ chunk-zn8pzrw0.js:31377-35274 placement
async function runUltrareviewHeadless(o, e) {
  if (!isUltrareviewWithBridge()) {
    let T = ultrareviewUnavailableReason();
    let U = T === "entitlement" ? getBridgeEntitlementBlocker() : null;
    logEvent("tengu_review_remote_gate_blocked", {
      reason: fromEnumOpt(T) ?? lit("unknown"),
      entitlement_blocker: fromEnumOpt(U),
    });
    return {
      status: "error",
      message: "Ultrareview is currently unavailable.",
      ...(T !== null && {
        gate_blocker: T,
      }),
      ...(U !== null && {
        entitlement_blocker: U,
      }),
    };
  }
  await waitForPolicyLimitsToLoad();
  let u = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (u) {
    logOrgPolicyDenied("allow_remote_sessions", "slash_command");
    return {
      status: "error",
      message: u,
    };
  }
  let r = await precheckLaunchScope(o, e.invocation, {
    suppressSucceededRecoveryEvent: !e.confirm,
    suppressOfferedRecoveryEvent: e.confirm && !e.singlePass,
    confirmsBeforeLaunch: e.confirmsBeforeLaunch === true,
    personRanTheCommand: e.personRanTheCommand === true,
  });
  if (!r.ok)
    return {
      status: "error",
      message: r.error,
      reason: r.reason,
    };
  let s = await checkOverageGate({
    overageConfirmed: e.overageConfirmed,
    credentials: e.context.credentials,
    skipLowCreditsNote: e.confirm && !e.singlePass,
    bundleFollows: r.scope.mode === "branch",
  });
  if (s.kind === "blocked") {
    logEvent("tengu_review_overage_blocked", {
      reason: sanitizedMachineReasonForTelemetry(s.reason),
    });
    return {
      status: "blocked",
      message: s.message,
      actionUrl: s.actionUrl,
      ...(REASON_CODE_PATTERN.test(s.reason) && {
        reason: s.reason,
      }),
    };
  }
  let l = () => {
    let T =
      r.scope.mode === "pr"
        ? `Reviewing PR ${r.scope.repo}#${r.scope.prNumber}.`
        : r.scope.noMergeBase
          ? "Reviewing all files on the current branch."
          : `Reviewing current branch against ${r.scope.baseBranch}.`;
    let U =
      r.scope.mode === "branch" && r.scope.instructions
        ? ` Note for findings (not a base branch): "${previewInstructions(r.scope.instructions)}"`
        : "";
    return `
${T}${U}`;
  };
  if (s.kind === "proceed" && s.preflightUnavailable && e.withholdOverageConsent && !e.overageConfirmed)
    return {
      status: "needs-confirm",
      body: `Couldn't verify your review quota right now, so this review may bill as usage credits (${getReviewCostNote()}).${l()}`,
      billingNote: "",
    };
  if (s.kind === "needs-confirm") {
    if (e.withholdOverageConsent)
      return {
        status: "needs-confirm",
        body: `${s.body}${l()}`,
        billingNote: s.billingNote,
      };
    logEvent("tengu_review_overage_dialog_shown", {});
    if (!e.confirm)
      return {
        status: "needs-confirm",
        body: `${s.body}${l()}`,
        billingNote: s.billingNote,
      };
    e.markOverageConfirmed();
  }
  if (e.confirm && r.scope.mode === "branch" && r.scope.noMergeBase)
    logEvent("tengu_review_remote_precondition_recovery", {
      reason: lit("no_merge_base"),
      method: lit("empty_tree_bundle"),
      outcome: lit("accepted"),
    });
  if (!e.confirm) {
    let T =
      r.scope.mode === "pr"
        ? `Reviewing PR ${r.scope.repo}#${r.scope.prNumber}`
        : r.scope.noMergeBase === "unrelated_history"
          ? `Reviewing all files (no common history with ${r.scope.baseBranch})
Scope: ${r.scope.diffStat}`
          : r.scope.noMergeBase === "base_ref_missing"
            ? `Reviewing all files (no ${r.scope.baseBranch} branch to compare against)
Scope: ${r.scope.diffStat}`
            : r.scope.noMergeBase === "first_commit"
              ? `Reviewing every file in the first commit (there is nothing earlier to compare with)
Scope: ${r.scope.diffStat}`
              : `Reviewing current branch against ${r.scope.baseBranch}
Scope: ${r.scope.diffStat}`;
    let U =
      r.scope.mode === "branch" && r.scope.instructions
        ? `
Note for findings (not a base branch): "${previewInstructions(r.scope.instructions)}"`
        : "";
    return {
      status: "needs-confirm",
      body: `${T}${U}
${getReviewDurationNote()} \xB7 Est. cost ${getReviewCostNote()} USD`,
      billingNote: s.billingNote,
    };
  }
  let h = e.postReview === true && !isUltrareviewPostEnabled();
  let k = e.postReview === true && !h && r.scope.mode === "pr" && isGithubDotCom(r.scope.host);
  let w = await launchRemoteReview(r.scope, e.context, s.billingNote, {
    skipTaskRegistration: e.skipTaskRegistration,
    invocation: e.invocation,
    applyFixesOnComplete: e.applyFixes,
    postReviewToPR: k,
  });
  if (!w?.launched)
    return {
      status: "error",
      message:
        w?.blocks
          .map((block) => (block.type === "text" ? block.text : ""))
          .join("")
          .trim() || "Failed to launch cloud review session.",
    };
  let L = e.postReview === true && !k;
  let trimmed = w.blocks
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  return {
    status: "launched",
    sessionId: w.sessionId,
    sessionUrl: w.sessionUrl,
    taskId: w.taskId,
    title: w.title,
    message: h ? `${trimmed}${POST_DISABLED_NOTE}` : L ? `${trimmed}${POST_IGNORED_NOTE}` : trimmed,
    billingNote: s.billingNote,
    postReviewTo:
      k && r.scope.mode === "pr"
        ? {
            repo: r.scope.repo,
            prNumber: r.scope.prNumber,
          }
        : undefined,
    postIgnored: L || undefined,
    lowCreditsNote: (e.singlePass && s.kind === "needs-confirm" && s.lowCreditsNote) || undefined,
  };
}
//@ chunk-zn8pzrw0.js:35274-35329 placement
async function hasRemoteRepository() {
  let currentRepositoryWithHost = await detectCurrentRepositoryWithHost();
  return !!currentRepositoryWithHost && !isNestedGitLabProject(currentRepositoryWithHost);
}
//@ chunk-zn8pzrw0.js:35329-35934 placement
/**
 * 非 git 仓库时的建议文字
 */
function noRepositoryAdvice(o, e = false) {
  let u = e
    ? `run "git init" and commit a starting point. ${o} then reviews the changes you make on top of that commit.`
    : `run "git init" and commit your work. ${o} then reviews that first commit whole if it is small enough, and after that the changes you make on top of it.`;
  let r = isHostEntrypoint()
    ? "Open a folder that is a git repository with at least one commit, then try again."
    : `If your project already uses git, cd into its folder and rerun ${o}. If it doesn't yet, ${u}`;
  return `${o} reviews the changes a git branch makes on top of an earlier commit, but ${getCwd()} is not inside a git repository. ${r}`;
}
//@ chunk-zn8pzrw0.js:35934-36027 placement
function isCwdHomeDir() {
  try {
    let o = homedir();
    if (!o) return false;
    return samePath(identity(resolve(getCwd())), identity(resolve(o)));
  } catch {
    return false;
  }
}
//@ chunk-twvgrhqz.js:714-809 fingerprint = checkOverageGate (0.329)
var checkOverageGate_2 = DoctorLazy(() =>
  create({
    reviews_used: create_3(),
    reviews_limit: create_3(),
    reviews_remaining: create_3(),
    is_overage: create_6(),
  }),
);
export {
  previewInstructions,
  launchRemoteReview,
  POST_DISABLED_NOTE,
  POST_IGNORED_NOTE,
  ultrareviewLaunchAcknowledgementNudge,
  parseUltrareviewArgs,
  precheckLaunchScope,
  checkOverageGate,
  runUltrareviewHeadless,
  checkOverageGate_2,
};

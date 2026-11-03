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
import { HEt, fetchUtilization } from "../../services/api/usage.js";
import { isUsdCurrency } from "../../services/api/overageCreditGrant.js";
import {
  typicalUltrareviewCost,
  Jei,
  diffSizeLimits,
  Fqo,
  Qei,
  getReviewCostNote,
  cxe,
  Xei,
  clientWaitMinutes,
  getReviewDurationNote,
  UF,
  ultrareviewUnavailableReason,
  Bvt,
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
import { Hcr } from "../../utils/github/anthropicRepos.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { probeGithubRepoAccess, noAccessText, installAppHint } from "../../utils/github/githubAccessHints.js";
import { isWebSetupOfferable } from "../../services/cloudSessions/webSetup.js";
import { probeRepoBundleSize } from "../../utils/teleport/gitBundle.js";
import { gitExe, getDefaultBranch, getBranch } from "../../utils/git.js";
import { freeze, lb } from "../../utils/git/gitSafeEnv.js";
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
import { m1s } from "../../services/api/ultrareviewQuota.js";
import { ZCe } from "../../utils/background/remote/remoteSession.js";
import { i9n } from "./ultrareviewPost.js";
import { getBridgeEntitlementBlocker } from "../../bridge/bridgeEntitlement.js";
import { waitForPolicyLimitsToLoad } from "../../services/policyLimits/PolicyLimitsClient.js";
import { policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import { logOrgPolicyDenied } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import { sanitizedMachineReasonForTelemetry } from "../../utils/errors.js";
import { isHostEntrypoint } from "../../utils/entrypointKinds.js";
import { getCwd } from "../../utils/cwd.js";
import { samePath } from "../../utils/file.js";
import { Mn } from "../../utils/pathClassification.js";

/**
 * ultrareview 预检响应 schema
 */
//@ chunk-zn8pzrw0.js:1793-2103 placement
var ultrareviewPreflightSchema = DoctorLazy(() =>
  create({
    action: create_26(["proceed", "confirm", "blocked"]),
    billing_note: create_2().nullable().optional(),
    github_login: create_2().nullable().optional(),
    confirm: create({ title: create_2().optional(), body: create_2() }).nullable().optional(),
    blocked: create({ message: create_2(), action_url: create_2().nullable(), reason: create_2().optional() })
      .nullable()
      .optional(),
  }),
);
//@ chunk-zn8pzrw0.js:2103-2190 placement
function se(o, e) {
  return { action: "blocked", blocked: { message: o, action_url: null, reason: e } };
}
/**
 * 调用 /v1/ultrareview/preflight
 */
//@ chunk-zn8pzrw0.js:2190-3194 placement
async function fetchUltrareviewPreflight(o) {
  let e = env.CLAUDE_CODE_ULTRAREVIEW_PREFLIGHT_FIXTURE;
  if (e) {
    let safeParse = ultrareviewPreflightSchema().safeParse(jsonParse(e));
    return safeParse.success ? safeParse.data : null;
  }
  try {
    let u = await apiClient.get("/v1/ultrareview/preflight", {
      auth: "teleport-org",
      timeout: 5000,
      credentials: o,
      headers: { [X_CLAUDE_CODE_SESSION_ID]: getSessionId() },
    });
    if (!u.ok)
      switch (u.reason) {
        case "essential-traffic-only":
          return se(
            "Ultrareview runs in a cloud session and is unavailable when essential-traffic-only mode is active.",
            "zdr",
          );
        case "data-residency":
          return se(
            "Ultrareview runs in a cloud session and is unavailable on third-party providers.",
            "data_residency",
          );
        case "no-auth":
          return se(
            "Ultrareview requires a Claude.ai account. Run /login to authenticate.",
            "no_oauth_token",
          );
      }
    let safeParse = ultrareviewPreflightSchema().safeParse(u.data);
    if (!safeParse.success)
      return (
        logForDebugging(`fetchUltrareviewPreflight schema mismatch: ${safeParse.error.message}`),
        logFeatureSad("api_ultrareview_preflight", "schema_mismatch"),
        null
      );
    return (logFeatureOk("api_ultrareview_preflight"), safeParse.data);
  } catch (error) {
    return (
      logForDebugging(`fetchUltrareviewPreflight failed: ${error}`),
      logFeatureSad("api_ultrareview_preflight", "request_failed"),
      null
    );
  }
}
//@ chunk-zn8pzrw0.js:3194-3206 placement
var we = 3000;
/**
 * 剩余可用 overage 额度（USD）：未启用为 0，无上限为无穷，扣已用、再受余额/自动充值限制。
 */
//@ chunk-zn8pzrw0.js:3206-3581 placement
function getRemainingOverageBudget(o, e) {
  if (!o || !HEt(o) || !isUsdCurrency(o.currency)) return null;
  if (o.is_enabled !== !0) return 0;
  if (e === null || !isUsdCurrency(e.currency)) return null;
  let { monthly_limit: monthly_limit, used_credits: used_credits } = o,
    s;
  if (monthly_limit === null) s = 1 / 0;
  else if (typeof monthly_limit === "number" && typeof used_credits === "number")
    s = monthly_limit - used_credits;
  else return null;
  let min = Math.min(s, e.auto_reload_settings?.enabled === !0 ? 1 / 0 : e.amount);
  return Number.isFinite(min) ? Math.max(0, min) : null;
}
/**
 * 用量额度不足提示
 */
//@ chunk-zn8pzrw0.js:3648-4172 placement
async function lowCreditsNote(o) {
  try {
    let e = typicalUltrareviewCost();
    if (e === null || isTeamSubscriber() || isEnterpriseSubscriber()) return null;
    let [u, r] = await withTimeout(
        Promise.all([fetchUtilization(o), fetchPrepaidBalance(o)]),
        we,
        "ultrareview: usage credits read timed out",
      ),
      s = getRemainingOverageBudget(u?.extra_usage, r);
    if (s === null || s >= e * 100) return null;
    let l = s < 100 ? "Less than $1" : `About ${formatCurrency(Math.floor(s / 100) * 100, "USD", "whole")}`,
      h = formatCurrency(e * 100, "USD", "whole");
    return `${l} of usage credits left. A review usually uses about ${h} and stops if credits run out.`;
  } catch {
    return (logForDebugging("ultrareview: could not read usage credits left, so no low-credits line"), null);
  }
}
//@ chunk-zn8pzrw0.js:4172-4222 placement
var pe = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
//@ chunk-zn8pzrw0.js:4222-4413 placement
var POST_IGNORED_NOTE = `
Note: --post was ignored \u2014 posting applies only to GitHub.com pull request reviews.`,
  POST_DISABLED_NOTE = `
Note: --post was ignored \u2014 posting findings to the PR is currently turned off.`;
//@ chunk-zn8pzrw0.js:4413-4972 placement
function parseUltrareviewArgs(o) {
  let e = (h) =>
      String.raw`--fix|--comment|--post|--no-post|--max-findings(?:\s*=\s*(?!--)\S*|\s*=\S*|\s+${h})?`,
    regExp = new RegExp(`^(${e(String.raw`(?!--)\S+`)})(?:\\s+|$)`),
    regExp_2 = new RegExp(`(?:^|\\s+)(${e(String.raw`(?:\d+|[Aa][Ll][Ll]|[Dd][Ee][Ff][Aa][Uu][Ll][Tt])`)})$`),
    s = new Set(),
    trimmed = o.trim();
  for (;;) {
    let match = trimmed.match(regExp);
    if (!match) break;
    (s.add(match[1]), (trimmed = trimmed.slice(match[0].length)));
  }
  for (;;) {
    let match = trimmed.match(regExp_2);
    if (!match) break;
    (s.add(match[1]), (trimmed = trimmed.slice(0, trimmed.length - match[0].length)));
  }
  return {
    scopeArgs: trimmed,
    applyFixes: s.has("--fix"),
    postReview: s.has("--no-post") ? !1 : s.has("--post") ? !0 : void 0,
  };
}
/**
 * ultrareview 启动前检查范围（仓库、分支、改动量、额度、预检）。
 */
//@ chunk-zn8pzrw0.js:4972-20851 placement
async function precheckLaunchScope(o, e = "/code-review ultra", u) {
  if (!(await isInGitRepo()))
    return (
      logEvent("tengu_review_remote_precondition_failed", { reason: lit("not_git_repo"), cwd_is_home: I() }),
      { ok: !1, reason: "not_git_repo", error: noRepositoryAdvice(e, u?.confirmsBeforeLaunch !== !0) }
    );
  let trimmed = o.trim(),
    s = parsePrUrl(trimmed),
    l = s?.num.toString() ?? trimmed.match(/^(?:#|PR[\s#]*)(\d+)$/i)?.[1] ?? trimmed;
  if (/^\d+$/.test(l)) {
    let n = (B) => {
        if (B === "succeeded" && u?.suppressSucceededRecoveryEvent) return;
        if (l !== trimmed)
          logEvent("tengu_review_remote_precondition_recovery", {
            reason: lit("base_ref_not_found"),
            method: lit("pr_arg_normalization"),
            outcome: fromEnum(B),
          });
      },
      _ = await detectCurrentRepositoryWithHost(),
      d = _ && isNestedGitLabProject(_) ? null : _,
      S = sameHost(s?.host, d?.host) || (!!s && !!d && isGithubDotCom(s.host) && isGithubDotCom(d.host));
    if (
      s &&
      (!S ||
        s.owner.toLowerCase() !== d?.owner.toLowerCase() ||
        s.repo.toLowerCase() !== d?.name.toLowerCase())
    ) {
      (logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("pr_url_wrong_repo"),
        has_remote: !!d,
        cwd_is_home: I(),
      }),
        n("failed"));
      let B = `${s.owner}/${s.repo} on ${s.host}`,
        G = d ? `you're in ${d.owner}/${d.name} on ${d.host}` : "this directory has no GitHub remote";
      return {
        ok: !1,
        reason: "pr_url_wrong_repo",
        error: `That link is for ${B}, but ${G}. cd into a checkout of that repo and run ${e} ${s.num} from there.`,
      };
    }
    if (!d)
      return (
        logEvent("tengu_review_remote_precondition_failed", {
          reason: lit("no_github_remote"),
          cwd_is_home: I(),
        }),
        n("failed"),
        {
          ok: !1,
          reason: "no_github_remote",
          error: `${e} <PR#> needs a GitHub remote so it knows which repository the PR is in. ${GITHUB_SETUP_HINT} If a GitHub repo already exists, run \`git remote add origin REPO_URL\`. Or run ${e} with no argument to review your current branch instead.`,
        }
      );
    if (Hcr(d))
      return (
        logEvent("tengu_review_remote_precondition_failed", {
          reason: lit("monorepo_blocked"),
          cwd_is_home: I(),
        }),
        n("failed"),
        {
          ok: !1,
          reason: "monorepo_blocked",
          error: `${e} doesn't support pull requests in this repository. Run /code-review ${l}${e.startsWith("/") ? "" : " in Claude Code"} for a local review instead.`,
        }
      );
    let A,
      y,
      [{ stdout: H, code: D }, C] = await Promise.all([
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
          { timeout: 5000, preserveOutputOnError: !1 },
        ),
        isGithubDotCom(d.host) && Jei() && !isEssentialTrafficOnly()
          ? probeGithubRepoAccess(d.owner, d.name, u?.accessProbeBudgetMs)
          : null,
      ]);
    if (C && !u?.suppressOfferedRecoveryEvent)
      logEvent("tengu_review_remote_github_access_probe", {
        verdict: fromEnum(C.verdict),
        http_status: C.httpStatus ?? void 0,
      });
    if (C?.verdict === "github_not_connected" || C?.verdict === "github_repo_not_found") {
      (logEvent("tengu_review_remote_precondition_failed", { reason: fromEnum(C.verdict), cwd_is_home: I() }),
        n("failed"));
      let B = isWebSetupOfferable()
          ? `run /web-setup${e.startsWith("/") ? "" : " in Claude Code"} to reuse your GitHub CLI login`
          : "",
        G = `then re-run ${e} ${l}`;
      return {
        ok: !1,
        reason: C.verdict,
        error:
          C.verdict === "github_not_connected"
            ? noAccessText({
                subject: `Ultrareview clones ${d.owner}/${d.name} in the cloud`,
                webSetupHint: B,
                rerun: G,
              })
            : installAppHint({
                owner: d.owner,
                name: d.name,
                webSetupHint: B,
                rerun: G,
                leadWithWebSetup: D === 0,
              }),
      };
    }
    if (D === 0 && H.trim())
      try {
        let B = jsonParse(H),
          { maxFiles: maxFiles, maxLines: maxLines } = diffSizeLimits(),
          Q = B.additions + B.deletions;
        if (Number.isFinite(B.changedFiles) && Number.isFinite(Q)) ((A = B.changedFiles), (y = Q));
        if (B.changedFiles > maxFiles || Q > maxLines)
          return (
            logEvent("tengu_review_remote_precondition_failed", {
              reason: lit("pr_diff_too_large"),
              files: B.changedFiles,
              lines: Q,
              max_files: maxFiles,
              max_lines: maxLines,
              cwd_is_home: I(),
            }),
            n("failed"),
            {
              ok: !1,
              reason: "pr_diff_too_large",
              error: `PR #${l} is too large for ultrareview (${B.changedFiles} files, ${Q.toLocaleString()} lines). Split it into smaller PRs, or run \`${e}\` on a narrower local diff.`,
            }
          );
      } catch {}
    return (
      n("succeeded"),
      {
        ok: !0,
        scope: {
          mode: "pr",
          prNumber: l,
          repo: `${d.owner}/${d.name}`,
          host: d.host,
          hadArg: !0,
          diffFiles: A,
          diffLines: y,
        },
      }
    );
  }
  let h = await probeRepoBundleSize();
  if (h.tooLarge)
    return (
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("repo_too_large_to_bundle"),
        pack_bytes: h.sizeBytes ?? void 0,
        pack_objects: h.inPackCount ?? void 0,
        cwd_is_home: I(),
      }),
      {
        ok: !1,
        reason: "repo_too_large_to_bundle",
        error: `Repo is too large to bundle. Push a PR and use \`${e} <PR#>\` instead.`,
      }
    );
  let k = async (n) =>
      (
        await execFileNoThrow(
          gitExe(),
          [...freeze, "rev-parse", "--verify", "--quiet", "--end-of-options", n],
          { preserveOutputOnError: !1 },
        )
      ).code === 0,
    matches = /\s/.test(trimmed),
    L = matches && ((await k(`origin/${trimmed}`)) || (await k(trimmed))),
    M = matches && !L ? trimmed.match(/https:\/\/\S*\/pull\/\d+\b/) : null,
    T =
      matches && !L && !M
        ? (trimmed.match(/(?<![\w/#-])(?:#|PR)[-\s#]*(\d+)\b/i) ??
          trimmed.match(/(?<![\w/#-])pull[\s-]+request[-\s#]*(\d+)\b/i) ??
          trimmed.match(/\/pull\/(\d+)\b/i) ??
          trimmed.match(/^(\d+)\b/))
        : null;
  if (M || T) {
    let n = M ? M[0] : `#${T[1]}`,
      _ = M ? M[0] : T[1];
    return (
      logEvent("tengu_review_remote_precondition_recovery", {
        reason: lit("base_ref_not_found"),
        method: lit("embedded_pr_hint"),
        outcome: lit("offered"),
      }),
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("base_ref_not_found"),
        looks_like_url: /^https?:/i.test(trimmed),
        looks_like_sha: !1,
        starts_with_hash: trimmed.startsWith("#"),
        has_slash: trimmed.includes("/"),
        has_whitespace: !0,
        has_pr_ref: !0,
        has_remote: await ae(),
        cwd_is_home: I(),
      }),
      {
        ok: !1,
        reason: "base_ref_not_found",
        error: `Your request mentions what looks like a PR reference (${n}). To review that PR, run \`${e} ${_}\`. To review your current branch instead, rerun without the PR-style reference.`,
      }
    );
  }
  let U = matches && !L && !trimmed.startsWith("-"),
    ee = U ? trimmed : void 0,
    v = U ? "" : trimmed,
    z = !1;
  if (v) {
    if (!(await k(`origin/${v}`)) && !(await k(v))) {
      let n = await resolveRemoteBranch(v);
      if (n === "recovered" && (await k(`origin/${v}`))) z = !0;
      else {
        if (n !== "not_found")
          logEvent("tengu_review_remote_precondition_recovery", {
            reason: lit("base_ref_not_found"),
            method: lit("fetch_retry"),
            outcome: lit("failed"),
          });
        if (n === "fetch_failed")
          return (
            logEvent("tengu_review_remote_precondition_failed", {
              reason: lit("base_ref_not_found"),
              looks_like_url: /^https?:/i.test(v),
              looks_like_sha: /^[0-9a-f]{7,40}$/i.test(v),
              starts_with_hash: v.startsWith("#"),
              has_slash: v.includes("/"),
              has_whitespace: /\s/.test(v),
              has_remote: await ae(),
              cwd_is_home: I(),
            }),
            {
              ok: !1,
              reason: "base_ref_not_found",
              error: `"${v}" exists on origin but couldn't be fetched. Run \`git fetch origin ${v}\` and try ${e} again.`,
            }
          );
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
          has_remote: await ae(),
          cwd_is_home: I(),
        });
        let d = _ ? ` Did you mean \`${_}\`?` : "";
        return {
          ok: !1,
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
    },
    R = v || (await getDefaultBranch()) || "main",
    X = (await getBranch()) || "HEAD",
    Z = async (n) =>
      execFileNoThrow(gitExe(), [...freeze, "merge-base", n, "HEAD"], {
        preserveOutputOnError: !1,
        env: getRemoteHostSessionCount(),
      }),
    W = `origin/${R}`,
    { stdout: stdout, code: code } = await Z(W);
  if (code !== 0) ((W = R), ({ stdout: stdout, code: code } = await Z(W)));
  let trimmed_2 = stdout.trim(),
    j = (n) =>
      execFileNoThrow(gitExe(), [...freeze, ...n], {
        preserveOutputOnError: !1,
        env: getRemoteHostSessionCount(),
      }),
    oe = `Your checkout has no branches (detached HEAD only), which cloud review can't bundle. Create one first \u2014 \`git checkout -b <name>\` \u2014 then rerun ${e}.`,
    ie = async () =>
      v.length > 0 ||
      (await j(["rev-parse", "--verify", "--quiet", `origin/${R}`])).code === 0 ||
      (await j(["rev-parse", "--verify", "--quiet", R])).code === 0,
    E = async (n, _ = X) => {
      let d = n || (await ie()),
        { stdout: stdout, code: code } = await execFileNoThrow(
          gitExe(),
          [...freeze, "diff", "--no-ext-diff", "--no-textconv", lb, "--shortstat", pe],
          { preserveOutputOnError: !1, env: getRemoteHostSessionCount() },
        );
      if (code === 0) {
        if (n && !stdout.trim()) return null;
        if (!stdout.trim())
          return (
            logEvent("tengu_review_remote_precondition_failed", {
              reason: lit("empty_diff"),
              cwd_is_home: I(),
            }),
            q("failed"),
            {
              ok: !1,
              reason: "empty_diff",
              error: d
                ? `It doesn't look like you have any new commits or changes to review against your ${R} branch. Stage or commit them first?`
                : "It doesn't look like you have any changes to review. Stage or commit them first?",
            }
          );
        let y = parseShortstat(stdout),
          H = y ? y.linesAdded + y.linesRemoved : 0,
          { maxFiles: maxFiles, maxLines: maxLines } = diffSizeLimits();
        if (y && (y.filesCount > maxFiles || H > maxLines)) {
          (logEvent("tengu_review_remote_precondition_failed", {
            reason: lit("local_diff_too_large"),
            files: y.filesCount,
            lines: H,
            max_files: maxFiles,
            max_lines: maxLines,
            after_fallback: !0,
            cwd_is_home: I(),
            first_commit: n || void 0,
          }),
            q("failed"));
          let B = n
            ? `Your first commit is the base from here on: make your changes and rerun ${e} to review only those.`
            : d
              ? `Review a smaller subset by committing it on a branch off an empty base, or push a PR and use \`${e} <PR#>\`.`
              : `This repo has no ${R} branch \u2014 if another branch is your base, pass it explicitly (\`${e} <branch>\`). Otherwise review a smaller subset by committing it on a branch off an empty base, or push a PR and use \`${e} <PR#>\`.`;
          return {
            ok: !1,
            reason: "local_diff_too_large",
            error: `This looks like a first review of the entire repository (${stdout.trim()}), which exceeds ultrareview's limit. ${B}`,
          };
        }
        if (!u?.suppressOfferedRecoveryEvent)
          logEvent("tengu_review_remote_precondition_recovery", {
            reason: lit("no_merge_base"),
            method: lit("empty_tree_bundle"),
            outcome: lit("offered"),
            files: y?.filesCount,
            lines: y ? H : void 0,
            is_shallow: !1,
            first_commit: n || void 0,
          });
        return (
          q("succeeded"),
          {
            ok: !0,
            scope: {
              mode: "branch",
              headBranch: _,
              baseBranch: R,
              mergeBaseSha: pe,
              diffStat: stdout.trim(),
              hadArg: v.length > 0,
              diffFiles: y?.filesCount,
              diffLines: y ? H : void 0,
              noMergeBase: n ? "first_commit" : d ? "unrelated_history" : "base_ref_missing",
              instructions: ee,
            },
          }
        );
      }
      return null;
    };
  if (code !== 0 || !trimmed_2) {
    let n = (await j(["rev-parse", "--verify", "--quiet", "HEAD"])).code === 0,
      trimmed = (await j(["rev-parse", "--is-shallow-repository"])).stdout.trim(),
      d = trimmed === "true",
      S = trimmed === "false",
      A = n && S && Fqo(),
      y = A ? await j(["for-each-ref", "--count=1", "refs/"]) : null,
      H = y !== null && y.stdout.trim() !== "",
      D = y !== null && y.code === 0 && y.stdout.trim() === "",
      C = !1;
    if (A && H)
      if (u?.confirmsBeforeLaunch === !0 || u?.personRanTheCommand === !0) {
        let G = await E(!1);
        if (G) return G;
      } else C = !0;
    if (
      (logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("no_merge_base"),
        cwd_is_home: I(),
        is_shallow: d,
        head_resolves: n,
        arg_was_explicit: v.length > 0,
        has_refs: H ? !0 : D ? !1 : void 0,
        whole_repository_held_back: C || void 0,
      }),
      q("failed"),
      C)
    )
      return {
        ok: !1,
        reason: "no_merge_base",
        error: `${(await ie()) ? `${R} shares no history with your checkout` : `This repository has no ${R} branch to compare with`}, so a review here would cover every file. To review it whole, a person can run /ultrareview in an interactive Claude Code session, which asks before it spends anything.`,
      };
    if (!n)
      return {
        ok: !1,
        reason: "no_merge_base",
        error: !u?.confirmsBeforeLaunch
          ? `Your current branch has no commits yet, so there is nothing to review. Commit a starting point first. ${e} then reviews the changes you make on top of that commit.`
          : `Your current branch has no commits yet, so there is nothing to review. Commit your work first, then rerun ${e}.`,
      };
    if (d)
      return (
        logEvent("tengu_review_remote_precondition_recovery", {
          reason: lit("no_merge_base"),
          method: lit("deepen_hint"),
          outcome: lit("offered"),
          is_shallow: !0,
        }),
        {
          ok: !1,
          reason: "no_merge_base",
          error: v
            ? `Your clone is shallow and doesn't contain the point where your branch forked from ${R}. Run \`git fetch --deepen=100 origin ${R}\` (or \`git fetch --unshallow origin\`) and rerun ${e}.`
            : `Your clone is shallow and doesn't contain the point where your branch forked from ${R}. Run \`git fetch --unshallow origin\` and rerun ${e}. If your base branch isn't ${R}, pass it explicitly (\`${e} <branch>\`).`,
        }
      );
    if (D) return { ok: !1, reason: "no_refs", error: oe };
    let B = z
      ? S
        ? `${R} was fetched from origin but shares no history with HEAD. If another branch is your real base, pass it explicitly (\`${e} <branch>\`).`
        : `${R} was fetched from origin but shares no history with HEAD. Try \`git fetch --unshallow origin\` (or deepen the clone) and rerun.`
      : v
        ? `Make sure ${R} exists locally or on origin (try \`git fetch origin ${R}\`).`
        : `Pass the base branch explicitly (e.g. \`${e} develop\`) or make sure you're in a git repo with a ${R} branch.`;
    return { ok: !1, reason: "no_merge_base", error: `Could not find merge-base with ${R}. ${B}` };
  }
  if (v.length > 0) {
    let n = await j(["for-each-ref", "--count=1", "refs/"]);
    if (n.code === 0 && n.stdout.trim() === "")
      return (
        logEvent("tengu_review_remote_precondition_failed", {
          reason: lit("no_refs"),
          cwd_is_home: I(),
          arg_was_explicit: !0,
        }),
        q("failed"),
        { ok: !1, reason: "no_refs", error: oe }
      );
  }
  let { stdout: stdout_2, code: code_2 } = await gitReadInOwnWorkTree(
    getFsImplementation().cwd(),
    [...freeze, "diff", "--no-ext-diff", "--no-textconv", lb, "--shortstat", trimmed_2],
    { LC_ALL: "C" },
    { preserveOutputOnError: !1 },
  );
  if (code_2 === 0 && !stdout_2.trim()) {
    let n = await readHeadInfo(trimmed_2, R),
      headBranch = n.headBranch,
      d =
        n.headAtMergeBase === !0 &&
        n.headIsRoot === !0 &&
        n.untrackedCount === 0 &&
        Fqo() &&
        (await j(["rev-parse", "--is-shallow-repository"])).stdout.trim() === "false" &&
        (await j(["rev-parse", "--verify", "--quiet", "--end-of-options", `${W}^{commit}`])).stdout.trim() ===
          trimmed_2,
      S = d && u?.confirmsBeforeLaunch !== !0;
    if (d && !S) {
      let V = await E(!0, headBranch);
      if (V) return V;
    }
    (logEvent("tengu_review_remote_precondition_failed", {
      reason: lit("empty_diff"),
      used_origin_ref: W !== R,
      had_explicit_base: v.length > 0,
      cwd_is_home: I(),
      on_base_branch: n.onBaseBranch,
      head_at_merge_base: n.headAtMergeBase,
      first_commit_held_back: S || void 0,
      has_untracked: n.untrackedCount === void 0 ? void 0 : n.untrackedCount > 0,
    }),
      q("failed"));
    let A = v
        ? `try a different base, e.g. \`${e} <branch>\``
        : `pass one explicitly, e.g. \`${e} <branch>\``,
      y = `${W} (merge-base ${trimmed_2.slice(0, 7)})`,
      H = "no staged or unstaged edits to tracked files",
      D,
      C;
    if (n.headAtMergeBase && headBranch && n.onBaseBranch) {
      let V = `If your work is on another branch, switch to it, or if the base should be something else, ${A}.`;
      if (W === headBranch)
        ((D = `you're on ${headBranch}, which is also the base of this review, and it has ${H}`),
          (C = `Everything already committed on ${headBranch} counts as the base here, so only edits you haven't committed yet would be reviewed. ${V}`));
      else
        ((D = `you're on ${headBranch}, which is also the base of this review, and it has no commits beyond ${y} and ${H}`),
          (C = V));
    } else if (n.headAtMergeBase && headBranch === "HEAD")
      ((D = `the commit you have checked out is already part of ${y}, and there are ${H}`),
        (C = `If your work is on a branch, switch to it. If you meant a different base, ${A}.`));
    else if (n.headAtMergeBase && headBranch)
      ((D = `${headBranch} has no commits beyond ${y} and ${H}`),
        (C = `If your work is on another branch, switch to it. If this branch was already merged or you meant a different base, ${A}.`));
    else
      ((D = `the diff against ${y} is empty`),
        (C = `If you have local edits, stage or commit them first. If your branch was already merged or you meant a different base, ${A}.`));
    let B = "";
    if (n.headAtMergeBase && n.parentSha) {
      let sliced = n.parentSha.slice(0, 12),
        Q = /^\d+$/.test(sliced) ? n.parentSha : sliced;
      (logEvent("tengu_review_remote_precondition_recovery", {
        reason: lit("empty_diff"),
        method: lit("last_commit_hint"),
        outcome: lit("offered"),
      }),
        (B = ` To review your latest commit anyway, run \`${e} ${Q}\`. That id is the commit before it, and any earlier commit id or tag works the same way.`));
    }
    let G = S
      ? " To review this first commit whole, run /ultrareview in an interactive Claude Code session, which asks before it spends anything."
      : "";
    return {
      ok: !1,
      reason: "empty_diff",
      error: `No changes to review: ${D}.${untrackedFilesNote(n.untrackedCount, e)} ${C}${B}${G}`,
    };
  }
  let N = parseShortstat(stdout_2);
  if (N) {
    let { maxFiles: maxFiles, maxLines: maxLines } = diffSizeLimits(),
      d = N.linesAdded + N.linesRemoved;
    if (N.filesCount > maxFiles || d > maxLines) {
      (logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("local_diff_too_large"),
        files: N.filesCount,
        lines: d,
        max_files: maxFiles,
        max_lines: maxLines,
        cwd_is_home: I(),
      }),
        q("failed"));
      let { stdout: stdout, code: code } = await gitReadInOwnWorkTree(
          getFsImplementation().cwd(),
          [
            ...freeze,
            "-c",
            "core.quotepath=false",
            "diff",
            "--no-ext-diff",
            "--no-textconv",
            lb,
            "--numstat",
            trimmed_2,
          ],
          {},
          { preserveOutputOnError: !1, timeout: 1e4, maxBuffer: 10485760 },
        ),
        y = code === 0 ? largestFilesNote(stdout) : "";
      return {
        ok: !1,
        reason: "local_diff_too_large",
        error: `Diff is too large for ultrareview: ${N.filesCount.toLocaleString()} ${plural(N.filesCount, "file")}, ${d.toLocaleString()} ${plural(d, "line")} changed (limits: ${maxFiles.toLocaleString()} ${plural(maxFiles, "file")}, ${maxLines.toLocaleString()} ${plural(maxLines, "line")}).${y} Pass a closer base branch (\`${e} <branch>\`) to narrow the scope, or split the change.`,
      };
    }
  }
  return (
    q("succeeded"),
    {
      ok: !0,
      scope: {
        mode: "branch",
        headBranch: X,
        baseBranch: R,
        mergeBaseSha: trimmed_2,
        diffStat: stdout_2.trim(),
        hadArg: v.length > 0,
        diffFiles: N?.filesCount,
        diffLines: N ? N.linesAdded + N.linesRemoved : void 0,
        instructions: ee,
      },
    }
  );
}
/**
 * 读取 HEAD 父提交、符号引用等
 */
//@ chunk-zn8pzrw0.js:20851-21701 placement
async function readHeadInfo(o, e) {
  let [u, r, s] = await Promise.all([
      execFileNoThrow(gitExe(), [...freeze, "rev-list", "--parents", "--max-count=1", "HEAD", "--"], {
        preserveOutputOnError: !1,
        env: getRemoteHostSessionCount(),
      }),
      execFileNoThrow(gitExe(), [...freeze, "symbolic-ref", "--quiet", "HEAD"], {
        preserveOutputOnError: !1,
        env: getRemoteHostSessionCount(),
      }),
      execFileNoThrow(
        gitExe(),
        [
          ...freeze,
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
          preserveOutputOnError: !1,
          timeout: 5000,
          maxBuffer: 1048576,
          env: getRemoteHostSessionCount({ GIT_LITERAL_PATHSPECS: "" }),
        },
      ),
    ]),
    [l, h, ...k] = u.code === 0 ? u.stdout.trim().split(/\s+/) : [],
    w =
      r.exitCode === 0
        ? r.stdout.trim().replace(/^refs\/heads\//, "") || void 0
        : r.exitCode === 1
          ? "HEAD"
          : void 0;
  return {
    headBranch: w,
    onBaseBranch: w === void 0 ? void 0 : w !== "HEAD" && (w === e || `origin/${w}` === e),
    headAtMergeBase: l ? l === o : void 0,
    parentSha: k.length ? void 0 : h || void 0,
    headIsRoot: l ? !h : void 0,
    untrackedCount: s.code === 0 ? count(s.stdout.split("\x00"), Boolean) : void 0,
  };
}
/**
 * 未跟踪文件提示
 */
//@ chunk-zn8pzrw0.js:21701-21959 placement
function untrackedFilesNote(o, e) {
  if (!o) return "";
  return ` Git also sees ${o.toLocaleString()} untracked ${plural(o, "file or folder", "files or folders")} here. New files aren't part of a review until git tracks them: run \`git add\` on the ones you want reviewed, then rerun ${e}.`;
}
/**
 * 改动最大的文件列表
 */
//@ chunk-zn8pzrw0.js:21959-22300 placement
function largestFilesNote(o, e = 3) {
  let { perFileStats: perFileStats } = parseRawNumstat(o, Number.POSITIVE_INFINITY),
    filtered = [...perFileStats.entries()]
      .map(([l, h]) => ({ path: l, lines: h.added + h.removed }))
      .filter((l) => l.lines > 0);
  if (filtered.length === 0) return "";
  return ` Largest files: ${filtered
    .sort((l, h) => h.lines - l.lines)
    .slice(0, e)
    .map((l) => `${l.path} (${l.lines.toLocaleString()} ${plural(l.lines, "line")})`)
    .join(", ")}.`;
}
//@ chunk-zn8pzrw0.js:22300-22363 placement
function previewInstructions(o, e = 80) {
  return truncateToWidth(o.replace(/\s+/g, " ").trim(), e);
}
/**
 * 检查远端分支是否存在
 */
//@ chunk-zn8pzrw0.js:22363-23206 placement
async function resolveRemoteBranch(o) {
  if (o.startsWith("-") || o.includes(":") || /\s/.test(o)) return "not_found";
  let e = {
      ...withGitNoPromptEnv(),
      GIT_SSH_COMMAND: `${env.GIT_SSH_COMMAND || "ssh"} -o BatchMode=yes -o StrictHostKeyChecking=yes`,
      GIT_ALLOW_PROTOCOL: "https:http:ssh",
    },
    u = await execFileNoThrow(
      gitExe(),
      [
        ...freeze,
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
      { timeout: 4000, preserveOutputOnError: !1, env: e },
    );
  if (u.code !== 0) return u.code === 2 ? "not_found" : "probe_failed";
  if (
    !u.stdout
      .split(
        `
`,
      )
      .some((l) => l.split("\t")[1]?.trim() === `refs/heads/${o}`)
  )
    return "not_found";
  return (
    await execFileNoThrow(
      gitExe(),
      [
        ...freeze,
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
      { timeout: 15000, preserveOutputOnError: !1, env: e },
    )
  ).code === 0
    ? "recovered"
    : "fetch_failed";
}
/**
 * 列出本地与 origin 分支引用
 */
//@ chunk-zn8pzrw0.js:23206-23834 placement
async function listBranchRefs(o) {
  let { stdout: stdout, code: code } = await execFileNoThrow(
    gitExe(),
    [
      ...freeze,
      "for-each-ref",
      "--format=%(refname:short)",
      "--count=2000",
      "refs/heads",
      "refs/remotes/origin",
    ],
    { preserveOutputOnError: !1, env: getRemoteHostSessionCount() },
  );
  if (code !== 0) return null;
  let r = new Map();
  for (let k of stdout.split(`
`)) {
    let trimmed = k.trim();
    if (!trimmed || trimmed === "origin" || trimmed === "origin/HEAD") continue;
    let L = trimmed.startsWith("origin/") ? trimmed.slice(7) : trimmed;
    if (trimmed.startsWith("origin/") || !r.has(L)) r.set(L, trimmed);
  }
  let s = o === "main" ? "master" : o === "master" ? "main" : null;
  if (s !== null) {
    let k = r.get(s);
    if (k) return k;
  }
  let l = null,
    h = 3;
  for (let [k, w] of r) {
    if (Math.abs(k.length - o.length) >= h) continue;
    let L = boundedEditDistance(o, k, h - 1);
    if (L > 0 && L < h) ((h = L), (l = w));
  }
  return l;
}
/**
 * 预检失败时的提示
 */
//@ chunk-zn8pzrw0.js:23834-24046 placement
var PREFLIGHT_UNAVAILABLE_MESSAGE =
  "Couldn't check whether this review can run, so it stopped before uploading your code. Try again shortly; if this keeps happening, open a pull request for this branch and review the pull request instead.";
//@ chunk-zn8pzrw0.js:24046-24881 placement
async function checkOverageGate({
  overageConfirmed: overageConfirmed,
  credentials: credentials,
  skipLowCreditsNote: skipLowCreditsNote = !1,
  bundleFollows: bundleFollows,
}) {
  let s = await fetchUltrareviewPreflight(credentials);
  if (!s) {
    if (bundleFollows && Qei())
      return {
        kind: "blocked",
        reason: "preflight_unavailable",
        message: PREFLIGHT_UNAVAILABLE_MESSAGE,
        actionUrl: null,
      };
    return { kind: "proceed", billingNote: "", preflightUnavailable: !0 };
  }
  let l = s.billing_note ?? "",
    h = s.github_login ?? null;
  switch (s.action) {
    case "proceed":
      return { kind: "proceed", billingNote: l, githubLogin: h };
    case "blocked":
      return {
        kind: "blocked",
        reason: s.blocked?.reason ?? "server",
        message: s.blocked?.message ?? "Ultrareview is unavailable for your organization.",
        actionUrl: s.blocked?.action_url ?? null,
      };
    case "confirm": {
      if (overageConfirmed) return { kind: "proceed", billingNote: l, githubLogin: h };
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
        billingNote: l,
        githubLogin: h,
      };
    }
  }
}
//@ chunk-zn8pzrw0.js:24881-24890 placement
var Be = 3;
//@ chunk-zn8pzrw0.js:24890-30797 placement = launchRemoteReview (0.427)
async function launchRemoteReview(o, e, u, r) {
  let s = r?.invocation ?? "/code-review ultra",
    l = (E) => ({ launched: !1, blocks: [{ type: "text", text: E }] }),
    h = await checkRemoteSessionEligibility({
      allowBundle: !0,
      storageV5: e.storageV5,
      credentials: e.credentials,
    });
  if (!h.eligible) {
    let errors = h.errors;
    if (errors.length > 0) {
      logEvent("tengu_review_remote_precondition_failed", {
        reason: lit("remote_agent_ineligible"),
        precondition_errors: fromEnumArr(errors.map((x) => x.type)),
        cwd_is_home: I(),
      });
      let joined = errors.map((x) => {
        if (x.type === "not_in_git_repo") return noRepositoryAdvice(s);
        if (x.type === "no_git_remote")
          return `${s} needs a GitHub remote so it can clone this repository into the cloud. ${GITHUB_SETUP_HINT} If a GitHub repo already exists, run \`git remote add origin REPO_URL && git push -u origin HEAD\`.`;
        return formatPreconditionError(x);
      }).join(`
`);
      if (o.mode === "branch" && o.noMergeBase)
        logEvent("tengu_review_remote_precondition_recovery", {
          reason: lit("no_merge_base"),
          method: lit("empty_tree_bundle"),
          outcome: lit("failed"),
        });
      return (
        logFeatureBad("ultrareview_launch", "remote_agent_ineligible"),
        l(`Ultrareview cannot launch:
${joined}`)
      );
    }
  }
  let CODE_REVIEW_ENV_ID = "env_011111111111111111111113",
    w = cxe(),
    posInt = (E, fallback, max) => {
      if (typeof E !== "number" || !Number.isFinite(E)) return fallback;
      let floored = Math.floor(E);
      if (floored <= 0) return fallback;
      return floored > max ? fallback : floored;
    },
    M = Xei(),
    T = {
      BUGHUNTER_DRY_RUN: "1",
      AUTOPATCH_ENABLE_ASIMOV: "1",
      ...(w?.code_quality !== !1 && { BUGHUNTER_CODE_QUALITY: "1" }),
      BUGHUNTER_FLEET_SIZE: String(posInt(w?.fleet_size, 5, 20)),
      BUGHUNTER_MAX_DURATION: String(posInt(w?.max_duration_minutes, 10, 25)),
      BUGHUNTER_AGENT_TIMEOUT: String(posInt(w?.agent_timeout_seconds, 600, 1800)),
      BUGHUNTER_TOTAL_WALLCLOCK: String(posInt(w?.total_wallclock_minutes, 22, 27)),
      BUGHUNTER_RESULT_RELAY_MAX_SEC: String((clientWaitMinutes() - Be) * 60),
      ...(M && { BUGHUNTER_MODEL: M }),
      ...(process.env.BUGHUNTER_DEV_BUNDLE_B64 && {
        BUGHUNTER_DEV_BUNDLE_B64: process.env.BUGHUNTER_DEV_BUNDLE_B64,
      }),
    },
    U,
    ee,
    v,
    z = "",
    q = [],
    R,
    X,
    Z,
    W,
    J;
  if (o.mode === "pr") {
    let repo = await detectCurrentRepositoryWithHost(),
      P = repo && isNestedGitLabProject(repo) ? null : repo;
    if (!P)
      return (
        logEvent("tengu_review_remote_precondition_failed", {
          reason: lit("no_github_remote_post_confirm"),
          cwd_is_home: I(),
        }),
        logFeatureBad("ultrareview_launch", "no_github_remote"),
        null
      );
    let x = `ultrareview: ${P.owner}/${P.name}#${o.prNumber}`;
    ((U = await teleportToRemote({
      initialMessage: null,
      source: "ultrareview",
      description: x,
      title: x,
      signal: e.abortController.signal,
      storageV5: e.storageV5,
      credentials: e.credentials,
      branchName: `refs/pull/${o.prNumber}/head`,
      environmentId: CODE_REVIEW_ENV_ID,
      tags: ["ultrareview"],
      environmentVariables: {
        BUGHUNTER_PR_NUMBER: o.prNumber,
        BUGHUNTER_REPOSITORY: `${P.owner}/${P.name}`,
        ...T,
      },
      onCreateFail: (N, n, _) => {
        ((R = N),
          (X = fromEnum(n)),
          (Z = _?.status),
          (W = fromEnumOpt(_?.serverType)),
          (J = fromEnumOpt(_?.serverReason)));
      },
    })),
      (ee = `/ultrareview ${o.prNumber}`),
      (v = `${P.owner}/${P.name}#${o.prNumber}`));
  } else {
    let {
      headBranch: headBranch,
      baseBranch: baseBranch,
      mergeBaseSha: mergeBaseSha,
      diffStat: diffStat,
      noMergeBase: noMergeBase,
    } = o;
    z = diffStat;
    let _, d;
    if (
      ((U = await teleportToRemote({
        initialMessage: null,
        source: "ultrareview",
        description: `ultrareview: ${headBranch}`,
        signal: e.abortController.signal,
        storageV5: e.storageV5,
        credentials: e.credentials,
        useBundle: !0,
        bundleBaseRef: mergeBaseSha,
        bundleForceScope: noMergeBase ? "squashed" : void 0,
        environmentId: CODE_REVIEW_ENV_ID,
        tags: ["ultrareview"],
        environmentVariables: { BUGHUNTER_BASE_BRANCH: mergeBaseSha, ...T },
        onBundleFail: (S, A) => {
          ((_ = S), (d = fromEnum(A)));
        },
        onBundleNotice: (S) => {
          q.push(S);
        },
        onCreateFail: (S, A, y) => {
          ((R = S),
            (X = fromEnum(A)),
            (Z = y?.status),
            (W = fromEnumOpt(y?.serverType)),
            (J = fromEnumOpt(y?.serverReason)));
        },
      })),
      !U)
    ) {
      logEvent("tengu_review_remote_teleport_failed", {
        mode: lit("branch"),
        reason: X,
        bundle_fail_kind: d,
        status_code: Z,
        server_type: W,
        server_reason: J,
      });
      let aborted = e.abortController.signal.aborted;
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
            : `Repo is too large. Push a PR and use \`${s} <PR#>\` instead.`),
      );
    }
    ((ee = "/ultrareview"),
      (v =
        noMergeBase === "unrelated_history"
          ? `${headBranch} (all files \u2014 no common history with ${baseBranch})`
          : noMergeBase === "base_ref_missing"
            ? `${headBranch} (all files)`
            : noMergeBase === "first_commit"
              ? `${headBranch} (every file in the first commit)`
              : headBranch === baseBranch
                ? headBranch
                : `${headBranch} \u2192 ${baseBranch}`));
  }
  if (!U) {
    if (
      (logEvent("tengu_review_remote_teleport_failed", {
        mode: lit("pr"),
        reason: X,
        status_code: Z,
        server_type: W,
        server_reason: J,
      }),
      !e.abortController.signal.aborted)
    )
      logFeatureBad("ultrareview_launch", "teleport_failed");
    if (R) return l(`Ultrareview could not start the cloud session: ${R}`);
    return null;
  }
  let re;
  if (!r?.skipTaskRegistration)
    re = registerRemoteAgentTask({
      remoteTaskType: "ultrareview",
      session: U,
      command: ee,
      context: e,
      isRemoteReview: !0,
      applyFixesOnComplete: r?.applyFixesOnComplete,
      reviewInstructions: o.mode === "branch" ? o.instructions : void 0,
      postReviewTo:
        r?.postReviewToPR && o.mode === "pr" && !r?.signal?.aborted
          ? { repo: o.repo, prNumber: o.prNumber }
          : void 0,
    }).taskId;
  if (
    (logEvent("tengu_review_remote_launched", {
      mode: fromEnum(o.mode),
      had_arg: o.hadArg,
      post_armed: r?.postReviewToPR === !0 && o.mode === "pr" && !r?.signal?.aborted,
      had_instructions: o.mode === "branch" && !!o.instructions,
      diff_files: o.diffFiles,
      diff_lines: o.diffLines,
    }),
    o.mode === "branch" && o.noMergeBase)
  )
    if (
      (logEvent("tengu_review_remote_precondition_recovery", {
        reason: lit("no_merge_base"),
        method: lit("empty_tree_bundle"),
        outcome: lit("succeeded"),
      }),
      o.noMergeBase === "first_commit")
    )
      logFeatureOk("ultrareview_launch");
    else logFeatureSad("ultrareview_launch", "no_merge_base_empty_tree_fallback");
  else logFeatureOk("ultrareview_launch");
  m1s(e.storageV5);
  let sessionUrl = ZCe(U.id),
    j = u.trim()
      ? `${u.trim()}
`
      : "",
    oe = z
      ? `
Scope: ${z}`
      : "",
    ie =
      o.mode === "branch" && o.instructions
        ? r?.skipTaskRegistration
          ? `
Your text was read as a note, not a base branch \u2014 the standard review runs on the diff above.`
          : `
Your text was read as a note, not a base branch \u2014 the standard review runs on the diff above, and the findings will be related to your note when they arrive.`
        : "";
  return {
    launched: !0,
    sessionId: U.id,
    sessionUrl: sessionUrl,
    taskId: re,
    title: U.title,
    blocks: [
      {
        type: "text",
        text: `${j}Ultrareview launched for ${v} (${getReviewDurationNote()}, runs in the cloud).${r?.findingsArriveInSession ? " The findings arrive here when it finishes." : ""}${
          r?.postReviewToPR && o.mode === "pr"
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
function ultrareviewLaunchAcknowledgementNudge(o, e) {
  return `The output above is already visible to the user. Briefly acknowledge it without repeating the target or billing note. Findings will arrive via task-notification.${o ? " The user passed --fix: when the findings arrive, apply them to the local working tree." : ""}${e ? ` The user's argument was interpreted as a review note, not a base branch: "${truncateToLength(e, i9n)}". The cloud review runs its standard pass over the branch diff and does not see the note; when the findings arrive, prioritize and relate them to the user's request.` : ""}`;
}
//@ chunk-zn8pzrw0.js:31345-31377 placement
var Te = /^[a-z][a-z0-9_]{0,63}$/;
//@ chunk-zn8pzrw0.js:31377-35274 placement
async function runUltrareviewHeadless(o, e) {
  if (!UF()) {
    let T = ultrareviewUnavailableReason(),
      U = T === "entitlement" ? getBridgeEntitlementBlocker() : null;
    return (
      logEvent("tengu_review_remote_gate_blocked", {
        reason: fromEnumOpt(T) ?? lit("unknown"),
        entitlement_blocker: fromEnumOpt(U),
      }),
      {
        status: "error",
        message: "Ultrareview is currently unavailable.",
        ...(T !== null && { gate_blocker: T }),
        ...(U !== null && { entitlement_blocker: U }),
      }
    );
  }
  await waitForPolicyLimitsToLoad();
  let u = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (u)
    return (logOrgPolicyDenied("allow_remote_sessions", "slash_command"), { status: "error", message: u });
  let r = await precheckLaunchScope(o, e.invocation, {
    suppressSucceededRecoveryEvent: !e.confirm,
    suppressOfferedRecoveryEvent: e.confirm && !e.singlePass,
    confirmsBeforeLaunch: e.confirmsBeforeLaunch === !0,
    personRanTheCommand: e.personRanTheCommand === !0,
  });
  if (!r.ok) return { status: "error", message: r.error, reason: r.reason };
  let s = await checkOverageGate({
    overageConfirmed: e.overageConfirmed,
    credentials: e.context.credentials,
    skipLowCreditsNote: e.confirm && !e.singlePass,
    bundleFollows: r.scope.mode === "branch",
  });
  if (s.kind === "blocked")
    return (
      logEvent("tengu_review_overage_blocked", { reason: sanitizedMachineReasonForTelemetry(s.reason) }),
      {
        status: "blocked",
        message: s.message,
        actionUrl: s.actionUrl,
        ...(Te.test(s.reason) && { reason: s.reason }),
      }
    );
  let l = () => {
    let T =
        r.scope.mode === "pr"
          ? `Reviewing PR ${r.scope.repo}#${r.scope.prNumber}.`
          : r.scope.noMergeBase
            ? "Reviewing all files on the current branch."
            : `Reviewing current branch against ${r.scope.baseBranch}.`,
      U =
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
      return { status: "needs-confirm", body: `${s.body}${l()}`, billingNote: s.billingNote };
    if ((logEvent("tengu_review_overage_dialog_shown", {}), !e.confirm))
      return { status: "needs-confirm", body: `${s.body}${l()}`, billingNote: s.billingNote };
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
Scope: ${r.scope.diffStat}`,
      U =
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
  let h = e.postReview === !0 && !Bvt(),
    k = e.postReview === !0 && !h && r.scope.mode === "pr" && isGithubDotCom(r.scope.host),
    w = await launchRemoteReview(r.scope, e.context, s.billingNote, {
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
          .map((T) => (T.type === "text" ? T.text : ""))
          .join("")
          .trim() || "Failed to launch cloud review session.",
    };
  let L = e.postReview === !0 && !k,
    trimmed = w.blocks
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
    postReviewTo: k && r.scope.mode === "pr" ? { repo: r.scope.repo, prNumber: r.scope.prNumber } : void 0,
    postIgnored: L || void 0,
    lowCreditsNote: (e.singlePass && s.kind === "needs-confirm" && s.lowCreditsNote) || void 0,
  };
}
//@ chunk-zn8pzrw0.js:35274-35329 placement
async function ae() {
  let o = await detectCurrentRepositoryWithHost();
  return !!o && !isNestedGitLabProject(o);
}
/**
 * 非 git 仓库时的建议文字
 */
//@ chunk-zn8pzrw0.js:35329-35934 placement
function noRepositoryAdvice(o, e = !1) {
  let u = e
      ? `run "git init" and commit a starting point. ${o} then reviews the changes you make on top of that commit.`
      : `run "git init" and commit your work. ${o} then reviews that first commit whole if it is small enough, and after that the changes you make on top of it.`,
    r = isHostEntrypoint()
      ? "Open a folder that is a git repository with at least one commit, then try again."
      : `If your project already uses git, cd into its folder and rerun ${o}. If it doesn't yet, ${u}`;
  return `${o} reviews the changes a git branch makes on top of an earlier commit, but ${getCwd()} is not inside a git repository. ${r}`;
}
//@ chunk-zn8pzrw0.js:35934-36027 placement
function I() {
  try {
    let o = homedir();
    if (!o) return !1;
    return samePath(Mn(resolve(getCwd())), Mn(resolve(o)));
  } catch {
    return !1;
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

/**
 * commands/ultrareview/ultrareviewCli.ts
 *
 * 2.1.316 新增：claude ultrareview 非交互入口：云端审查当前改动、工作区信任、把发现作为 PR 评论发布
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jzm79q04.js (11)
 * attribution: placement 11
 */
import {
  logFeatureBadAsync,
  logFeatureOk,
  logFeatureSadAsync,
  logFeatureOkAsync,
} from "../../services/analytics/featureTelemetry.js";
import { isOnClaudeCodeSessionSurface } from "../../utils/teammate.js";
import { cliErrorAfterAnalyticsFlush, writeStdoutAndDrain, exitAfterAnalyticsFlush } from "../../cli/exit.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { checkHasTrustDialogAccepted } from "../../utils/config.js";
import { setSessionTrustAccepted, getOriginalCwd, isHomeDirectorySession } from "../../bootstrap/state.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  checkUltrareviewWorkspaceTrust,
  clientWaitMinutes,
  getReviewDurationNote,
} from "../review/ultrareviewPreconditions.js";
import { stopCapturingEarlyInput } from "../../utils/earlyInput.js";
import { waitForPolicyLimitsToLoad } from "../../services/policyLimits/PolicyLimitsClient.js";
import { policyDeniedReason, policyDenyKind } from "../../services/policyLimits/policyEvidence.js";
import { logOrgPolicyDeniedAsync } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import { initializeGrowthBook } from "../../services/analytics/growthbook.js";
import { createAbortController } from "../../utils/abortController.js";
import { runUltrareviewHeadless } from "../review/reviewRemote.js";
import { UNLIMITED_RATE_LIMITER } from "../../tasks/taskLoopRegistry.js";
import { errorMessage } from "../../utils/errors.js";
import {
  parseReviewErrorPayload,
  countReviewFindings,
  extractReviewFromLog,
  isReviewStartupFailureFastFailEnabled,
} from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { waitForUltrareviewPost } from "../review/ultrareviewPost.js";
import { pollRemoteSessionEvents, isTransientNetworkError } from "../../utils/teleport/api.js";
import { sleep } from "../../utils/sleep.js";
import { REMOTE_REVIEW_PROGRESS } from "../../constants/xml.js";
import { sequential } from "../../utils/sequential.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-jzm79q04.js:12238-12445 placement
var POLL_INTERVAL_MS = 3000;
var MAX_POLL_FAILURES = 5;
var ARCHIVED_BEFORE_OUTPUT_MESSAGE = "cloud session was archived before producing output";
var FINDINGS_LOST_NOTE =
  "its findings will no longer arrive here. A new run is a new review: it uses one of your free ultrareviews or bills as usage credits.";
//@ chunk-jzm79q04.js:12445-12539 placement
class PollFailure extends Error {
  reason;
  constructor(reason, t) {
    super(t);
    this.reason = reason;
    this.name = "PollFailure";
  }
}
//@ chunk-jzm79q04.js:12539-12632 placement
function sessionStartFailure(startupFailure) {
  return new PollFailure("session_start_failed", `the cloud session could not start: ${startupFailure}`);
}
//@ chunk-jzm79q04.js:12632-12709 placement
var SEVERITY_EMOJI = {
  normal: "\uD83D\uDD34",
  nit: "\uD83D\uDFE1",
  pre_existing: "\uD83D\uDFE3",
};
//@ chunk-jzm79q04.js:12709-12797 placement
function shouldPostComment(post, argv) {
  if (argv.includes("--no-post")) return false;
  return post === true && argv.includes("--post");
}
//@ chunk-jzm79q04.js:12797-17230 placement
/**
 * claude ultrareview：信任工作区、启动云审查会话、等待结果并可发布评论（约 4.4 KB）。
 */
async function ultrareviewCommand(s, t, storageV5, credentials) {
  let a = () => process.exit(130);
  process.once("SIGINT", a);
  let found = process.argv.find((arg, T) => process.argv[T - 1] === "--trust-workspace" && !/^-./.test(arg));
  if (t.trustWorkspace === true && found !== undefined) {
    await logFeatureBadAsync("cli_ultrareview", "trust_flag_given_a_value");
    let n = isOnClaudeCodeSessionSurface()
      ? ""
      : " To trust it for this run, put nothing after the flag: a PR number or base branch goes before it.";
    return cliErrorAfterAnalyticsFlush(
      `Ultrareview did not start: \`--trust-workspace\` takes no value, but ${jsonStringify(found)} follows it. If you do not trust this folder, leave the flag out.${n}`,
    );
  }
  if (!checkHasTrustDialogAccepted())
    if (t.trustWorkspace === true) {
      setSessionTrustAccepted(true);
      logFeatureOk("cli_ultrareview_workspace_trust", {
        trust_source: lit("flag"),
      });
    } else {
      let { canPromptForWorkspaceTrust, offerBridgeWorkspaceTrust } = await import("./chunk-p3rkx9n6.js");
      let P = canPromptForWorkspaceTrust();
      if (P || (await checkUltrareviewWorkspaceTrust())) {
        stopCapturingEarlyInput();
        let E = await offerBridgeWorkspaceTrust({
          dir: getOriginalCwd(),
          isHomeDir: isHomeDirectorySession(),
          canPrompt: P,
          storageV5,
          answerTimeoutMs: 300000,
          asker: {
            feature: "cli_ultrareview_workspace_trust",
            name: "Ultrareview",
            command: "claude ultrareview",
            opening: "Ultrareview runs git in this folder to collect your changes:",
            grant:
              "This folder's git settings can make git run other programs. Trusting the folder also applies to Claude Code: sessions started here can read, edit, and execute files, and this folder's project settings (hooks, MCP servers, permission rules, helper commands) apply to them.",
            unattendedRemedy: isOnClaudeCodeSessionSurface()
              ? ""
              : " Or, in a script or CI job, pass `--trust-workspace` to trust the folder for this run only.",
          },
        });
        if (!E.trusted) {
          await logFeatureBadAsync(
            "cli_ultrareview",
            E.reason === "declined" ? "workspace_trust_declined" : "workspace_not_trusted",
          );
          return cliErrorAfterAnalyticsFlush(E.message);
        }
      }
    }
  await waitForPolicyLimitsToLoad();
  let w = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (w) {
    let n = policyDenyKind("allow_remote_sessions");
    await logOrgPolicyDeniedAsync("allow_remote_sessions", "cli_flag");
    if (n === "cache_miss") await logFeatureSadAsync("cli_ultrareview", "policy_cache_miss");
    else
      await logFeatureBadAsync(
        "cli_ultrareview",
        n === "route_missing" ? "policy_route_missing" : "policy_disallowed",
      );
    return cliErrorAfterAnalyticsFlush(w);
  }
  await initializeGrowthBook().catch(() => {});
  let l = Number(t.timeout);
  let f = Number.isFinite(l) && l > 0 ? l : clientWaitMinutes();
  let abortController = createAbortController();
  let postReview = shouldPostComment(t.post, process.argv);
  let e = await runUltrareviewHeadless(s, {
    confirm: true,
    postReview,
    overageConfirmed: false,
    markOverageConfirmed: () => {},
    singlePass: true,
    personRanTheCommand: !isOnClaudeCodeSessionSurface(),
    skipTaskRegistration: true,
    invocation: "claude ultrareview",
    context: {
      abortController,
      taskRegistry: UNLIMITED_RATE_LIMITER,
      storageV5,
      credentials,
    },
  });
  if (e.status !== "launched") {
    let n =
      e.status === "blocked" && e.actionUrl
        ? `
  \u2192 ${e.actionUrl}`
        : "";
    await logFeatureBadAsync("cli_ultrareview", "cli_ultrareview_launch_failed");
    return cliErrorAfterAnalyticsFlush(
      `Ultrareview could not launch: ${"message" in e ? e.message : e.body}${n}`,
    );
  }
  printStatus(e.message);
  if (e.lowCreditsNote) printStatus(e.lowCreditsNote);
  printStatus(`Waiting for findings (${getReviewDurationNote()})\u2026`);
  process.removeListener("SIGINT", a);
  let p = () => {
    printStatus(`
Stopped waiting. The review may still be running in the cloud, but ${FINDINGS_LOST_NOTE}${
      e.postReviewTo
        ? `
Nothing will be posted to the pull request.`
        : ""
    }`);
    process.exit(130);
  };
  process.once("SIGINT", p);
  let S = () => {
    process.removeListener("SIGINT", p);
    process.once("SIGINT", () => {
      printStatus(`
Interrupted. The review already finished (findings above).${
        e.postReviewTo
          ? `
The post to the pull request may already be on its way \u2014 check the PR before posting by hand.`
          : ""
      }`);
      process.exit(130);
    });
  };
  let text;
  try {
    text = await pollReviewSession(e.sessionId, abortController.signal, f * 60 * 1000, credentials);
  } catch (error) {
    await logFeatureBadAsync("cli_ultrareview", "cli_ultrareview_poll_failed", {
      reason: error instanceof PollFailure ? fromEnum(error.reason) : lit("poll_unknown"),
    });
    let T = error instanceof PollFailure && error.reason === "session_start_failed";
    return cliErrorAfterAnalyticsFlush(
      `Ultrareview failed: ${errorMessage(error)}${
        T
          ? `
Nothing is running in the cloud.`
          : `
This command stopped waiting. The review may still be running in the cloud, but ${FINDINGS_LOST_NOTE}`
      }${
        e.postReviewTo
          ? `
Nothing was posted to the pull request, and nothing will be. The --post request ends with this run.`
          : ""
      }`,
    );
  }
  let reviewErrorPayload = parseReviewErrorPayload(text);
  let error = reviewErrorPayload?.error ?? null;
  let k = reviewErrorPayload?.stopped === true;
  let reason =
    error === ARCHIVED_BEFORE_OUTPUT_MESSAGE
      ? lit("session_archived")
      : k
        ? lit("stopped_remotely")
        : lit("orchestrator_error");
  let C = countReviewFindings(text);
  let N =
    C !== undefined
      ? {
          findings_count: C,
        }
      : undefined;
  if (!error) S();
  if (t.json) {
    await writeStdoutAndDrain(
      text +
        `
`,
    );
    if (error) {
      await logFeatureBadAsync("cli_ultrareview", "cli_ultrareview_remote_error", {
        reason,
      });
      if (e.postReviewTo)
        printStatus(`Nothing was posted to the pull request: the review ${k ? "was stopped" : "failed"}.`);
    } else {
      await describePostOutcome(e, credentials);
      await logFeatureOkAsync("cli_ultrareview", N);
    }
    return exitAfterAnalyticsFlush(error ? 1 : 0);
  }
  if (error) {
    await logFeatureBadAsync("cli_ultrareview", "cli_ultrareview_remote_error", {
      reason,
    });
    return cliErrorAfterAnalyticsFlush(
      `${k ? "Review stopped" : "Review failed"}: ${error}${
        e.postReviewTo
          ? `
Nothing was posted to the pull request: the review ${k ? "was stopped" : "failed"}, so there are no findings to post.`
          : ""
      }`,
    );
  }
  await writeStdoutAndDrain(
    formatReviewResult(text) +
      `
`,
  );
  await describePostOutcome(e, credentials);
  await logFeatureOkAsync("cli_ultrareview", N);
  return exitAfterAnalyticsFlush(0);
}
//@ chunk-jzm79q04.js:17230-17650 placement
async function describePostOutcome({ postReviewTo, sessionId }, u) {
  if (!postReviewTo) return;
  printStatus("Posting the findings to the pull request as a comment from your GitHub account\u2026");
  let o = await waitForUltrareviewPost(sessionId, u);
  switch (o.status) {
    case "posted":
      printStatus(
        o.alreadyPosted
          ? `Already posted \u2014 this review's comment is on the pull request: ${o.commentUrl}`
          : `Posted \u2014 a single plain comment, not a review: ${o.commentUrl}`,
      );
      break;
    case "not-posted":
      printStatus(o.reason);
      break;
  }
}
//@ chunk-jzm79q04.js:17650-18596 placement
async function pollReviewSession(sessionId, signal, u, credentials) {
  let a = Date.now() + u;
  let i = null;
  let w = 0;
  let l = [];
  let f = "";
  while (Date.now() < a) {
    if (signal.aborted) throw Error("aborted");
    try {
      let r = await pollRemoteSessionEvents(sessionId, i, {
        credentials,
      });
      i = r.lastEventId;
      w = 0;
      if (r.sessionStatus === "archived") {
        if (r.newEvents.length > 0) l.push(...r.newEvents);
        let reviewFromLog = extractReviewFromLog(l);
        if (reviewFromLog) return reviewFromLog;
        if (r.startupFailure && isReviewStartupFailureFastFailEnabled())
          throw sessionStartFailure(r.startupFailure);
        return `{"error":"${ARCHIVED_BEFORE_OUTPUT_MESSAGE}"}`;
      }
      if (r.newEvents.length > 0) {
        l.push(...r.newEvents);
        for (let newEvent of r.newEvents)
          if (
            newEvent.type === "system" &&
            (newEvent.subtype === "hook_progress" || newEvent.subtype === "hook_response")
          ) {
            let p = formatReviewProgress(newEvent.stdout);
            if (p && p !== f) {
              f = p;
              printStatus(`  ${p}`);
            }
          }
        let reviewFromLog = extractReviewFromLog(l);
        if (reviewFromLog) return reviewFromLog;
      }
      if (r.startupFailure && isReviewStartupFailureFastFailEnabled())
        throw sessionStartFailure(r.startupFailure);
    } catch (error) {
      if (signal.aborted || error instanceof PollFailure) throw error;
      if (!isTransientNetworkError(error)) throw new PollFailure("poll_api_error", errorMessage(error));
      if (++w >= MAX_POLL_FAILURES)
        throw new PollFailure(
          "poll_connection_lost",
          "lost connection to the cloud session after repeated retries",
        );
    }
    await sleep(POLL_INTERVAL_MS, signal);
  }
  throw new PollFailure("poll_timeout", `cloud session exceeded ${Math.round(u / 60000)} minutes`);
}
//@ chunk-jzm79q04.js:18596-18914 placement
function formatReviewProgress(stdout) {
  let t = `<${REMOTE_REVIEW_PROGRESS}>`;
  let u = `</${REMOTE_REVIEW_PROGRESS}>`;
  let index = stdout.lastIndexOf(u);
  let a = index === -1 ? -1 : stdout.lastIndexOf(t, index);
  if (a === -1 || index <= a) return null;
  try {
    let i = jsonParse(stdout.slice(a + t.length, index));
    let stage = i.stage ?? "running";
    let bugsFound = i.bugs_found ?? 0;
    let bugsVerified = i.bugs_verified ?? 0;
    let bugsRefuted = i.bugs_refuted ?? 0;
    return `${stage} \u2014 ${bugsFound} found, ${bugsVerified} verified, ${bugsRefuted} refuted`;
  } catch {
    return null;
  }
}
//@ chunk-jzm79q04.js:18914-19480 placement
function formatReviewResult(s) {
  let t;
  try {
    t = jsonParse(s);
  } catch {
    return s;
  }
  if (!Array.isArray(t) || t.length === 0) return "Review complete \u2014 no findings.";
  let u = t;
  let o = u.length;
  let a = [sequential.bold(`Review complete \u2014 ${o} ${plural(o, "finding")}`), ""];
  for (let i of u) {
    let w = SEVERITY_EMOJI[i.severity ?? "normal"] ?? "\uD83D\uDD34";
    let filePath = i.file_path ?? "?";
    let startLine = i.start_line ?? 0;
    let endLine = i.end_line ?? startLine;
    let h = startLine === endLine ? `${filePath}:${startLine}` : `${filePath}:${startLine}-${endLine}`;
    let trimmed = (i.pr_comment ?? "").trim();
    let index = trimmed.indexOf(`

`);
    let S = index === -1 ? trimmed : trimmed.slice(0, index);
    let v = index === -1 ? "" : trimmed.slice(index + 2);
    a.push(`${w} ${sequential.bold(h)}`);
    if (S) a.push(S);
    if (v) {
      a.push("");
      a.push(v);
    }
    a.push("");
  }
  return a
    .join(
      `
`,
    )
    .trimEnd();
}
//@ chunk-jzm79q04.js:19480-19530 placement
function printStatus(s) {
  process.stderr.write(
    sequential.dim(s) +
      `
`,
  );
}

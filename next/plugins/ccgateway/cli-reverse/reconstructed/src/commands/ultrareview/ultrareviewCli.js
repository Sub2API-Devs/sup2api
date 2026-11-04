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
  constructor(reason, message) {
    super(message);
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
async function ultrareviewCommand(args, flags, storageV5, credentials) {
  let onSigint = () => process.exit(130);
  process.once("SIGINT", onSigint);
  let found = process.argv.find(
    (arg, argIndex) => process.argv[argIndex - 1] === "--trust-workspace" && !/^-./.test(arg),
  );
  if (flags.trustWorkspace === true && found !== undefined) {
    await logFeatureBadAsync("cli_ultrareview", "trust_flag_given_a_value");
    let hint = isOnClaudeCodeSessionSurface()
      ? ""
      : " To trust it for this run, put nothing after the flag: a PR number or base branch goes before it.";
    return cliErrorAfterAnalyticsFlush(
      `Ultrareview did not start: \`--trust-workspace\` takes no value, but ${jsonStringify(found)} follows it. If you do not trust this folder, leave the flag out.${hint}`,
    );
  }
  if (!checkHasTrustDialogAccepted())
    if (flags.trustWorkspace === true) {
      setSessionTrustAccepted(true);
      logFeatureOk("cli_ultrareview_workspace_trust", {
        trust_source: lit("flag"),
      });
    } else {
      let { canPromptForWorkspaceTrust, offerBridgeWorkspaceTrust } =
        await import("../../bridge/canPromptForWorkspaceTrust.lazy.js");
      let canPrompt = canPromptForWorkspaceTrust();
      if (canPrompt || (await checkUltrareviewWorkspaceTrust())) {
        stopCapturingEarlyInput();
        let trustAnswer = await offerBridgeWorkspaceTrust({
          dir: getOriginalCwd(),
          isHomeDir: isHomeDirectorySession(),
          canPrompt,
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
        if (!trustAnswer.trusted) {
          await logFeatureBadAsync(
            "cli_ultrareview",
            trustAnswer.reason === "declined" ? "workspace_trust_declined" : "workspace_not_trusted",
          );
          return cliErrorAfterAnalyticsFlush(trustAnswer.message);
        }
      }
    }
  await waitForPolicyLimitsToLoad();
  let policyDenied = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (policyDenied) {
    let denyKind = policyDenyKind("allow_remote_sessions");
    await logOrgPolicyDeniedAsync("allow_remote_sessions", "cli_flag");
    if (denyKind === "cache_miss") await logFeatureSadAsync("cli_ultrareview", "policy_cache_miss");
    else
      await logFeatureBadAsync(
        "cli_ultrareview",
        denyKind === "route_missing" ? "policy_route_missing" : "policy_disallowed",
      );
    return cliErrorAfterAnalyticsFlush(policyDenied);
  }
  await initializeGrowthBook().catch(() => {});
  let timeoutValue = Number(flags.timeout);
  let waitMinutes = Number.isFinite(timeoutValue) && timeoutValue > 0 ? timeoutValue : clientWaitMinutes();
  let abortController = createAbortController();
  let postReview = shouldPostComment(flags.post, process.argv);
  let result = await runUltrareviewHeadless(args, {
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
  if (result.status !== "launched") {
    let actionLine =
      result.status === "blocked" && result.actionUrl
        ? `
  \u2192 ${result.actionUrl}`
        : "";
    await logFeatureBadAsync("cli_ultrareview", "cli_ultrareview_launch_failed");
    return cliErrorAfterAnalyticsFlush(
      `Ultrareview could not launch: ${"message" in result ? result.message : result.body}${actionLine}`,
    );
  }
  printStatus(result.message);
  if (result.lowCreditsNote) printStatus(result.lowCreditsNote);
  printStatus(`Waiting for findings (${getReviewDurationNote()})\u2026`);
  process.removeListener("SIGINT", onSigint);
  let handleStopSigint = () => {
    printStatus(`
Stopped waiting. The review may still be running in the cloud, but ${FINDINGS_LOST_NOTE}${
      result.postReviewTo
        ? `
Nothing will be posted to the pull request.`
        : ""
    }`);
    process.exit(130);
  };
  process.once("SIGINT", handleStopSigint);
  let restoreSigint = () => {
    process.removeListener("SIGINT", handleStopSigint);
    process.once("SIGINT", () => {
      printStatus(`
Interrupted. The review already finished (findings above).${
        result.postReviewTo
          ? `
The post to the pull request may already be on its way \u2014 check the PR before posting by hand.`
          : ""
      }`);
      process.exit(130);
    });
  };
  let text;
  try {
    text = await pollReviewSession(
      result.sessionId,
      abortController.signal,
      waitMinutes * 60 * 1000,
      credentials,
    );
  } catch (error) {
    await logFeatureBadAsync("cli_ultrareview", "cli_ultrareview_poll_failed", {
      reason: error instanceof PollFailure ? fromEnum(error.reason) : lit("poll_unknown"),
    });
    let startFailed = error instanceof PollFailure && error.reason === "session_start_failed";
    return cliErrorAfterAnalyticsFlush(
      `Ultrareview failed: ${errorMessage(error)}${
        startFailed
          ? `
Nothing is running in the cloud.`
          : `
This command stopped waiting. The review may still be running in the cloud, but ${FINDINGS_LOST_NOTE}`
      }${
        result.postReviewTo
          ? `
Nothing was posted to the pull request, and nothing will be. The --post request ends with this run.`
          : ""
      }`,
    );
  }
  let reviewErrorPayload = parseReviewErrorPayload(text);
  let error = reviewErrorPayload?.error ?? null;
  let stoppedRemotely = reviewErrorPayload?.stopped === true;
  let reason =
    error === ARCHIVED_BEFORE_OUTPUT_MESSAGE
      ? lit("session_archived")
      : stoppedRemotely
        ? lit("stopped_remotely")
        : lit("orchestrator_error");
  let findingsCount = countReviewFindings(text);
  let okProps =
    findingsCount !== undefined
      ? {
          findings_count: findingsCount,
        }
      : undefined;
  if (!error) restoreSigint();
  if (flags.json) {
    await writeStdoutAndDrain(
      text +
        `
`,
    );
    if (error) {
      await logFeatureBadAsync("cli_ultrareview", "cli_ultrareview_remote_error", {
        reason,
      });
      if (result.postReviewTo)
        printStatus(
          `Nothing was posted to the pull request: the review ${stoppedRemotely ? "was stopped" : "failed"}.`,
        );
    } else {
      await describePostOutcome(result, credentials);
      await logFeatureOkAsync("cli_ultrareview", okProps);
    }
    return exitAfterAnalyticsFlush(error ? 1 : 0);
  }
  if (error) {
    await logFeatureBadAsync("cli_ultrareview", "cli_ultrareview_remote_error", {
      reason,
    });
    return cliErrorAfterAnalyticsFlush(
      `${stoppedRemotely ? "Review stopped" : "Review failed"}: ${error}${
        result.postReviewTo
          ? `
Nothing was posted to the pull request: the review ${stoppedRemotely ? "was stopped" : "failed"}, so there are no findings to post.`
          : ""
      }`,
    );
  }
  await writeStdoutAndDrain(
    formatReviewResult(text) +
      `
`,
  );
  await describePostOutcome(result, credentials);
  await logFeatureOkAsync("cli_ultrareview", okProps);
  return exitAfterAnalyticsFlush(0);
}
//@ chunk-jzm79q04.js:17230-17650 placement
async function describePostOutcome({ postReviewTo, sessionId }, credentials) {
  if (!postReviewTo) return;
  printStatus("Posting the findings to the pull request as a comment from your GitHub account\u2026");
  let postResult = await waitForUltrareviewPost(sessionId, credentials);
  switch (postResult.status) {
    case "posted":
      printStatus(
        postResult.alreadyPosted
          ? `Already posted \u2014 this review's comment is on the pull request: ${postResult.commentUrl}`
          : `Posted \u2014 a single plain comment, not a review: ${postResult.commentUrl}`,
      );
      break;
    case "not-posted":
      printStatus(postResult.reason);
      break;
  }
}
//@ chunk-jzm79q04.js:17650-18596 placement
async function pollReviewSession(sessionId, signal, timeoutMs, credentials) {
  let deadline = Date.now() + timeoutMs;
  let lastEventId = null;
  let failureCount = 0;
  let events = [];
  let lastProgress = "";
  while (Date.now() < deadline) {
    if (signal.aborted) throw Error("aborted");
    try {
      let pollResult = await pollRemoteSessionEvents(sessionId, lastEventId, {
        credentials,
      });
      lastEventId = pollResult.lastEventId;
      failureCount = 0;
      if (pollResult.sessionStatus === "archived") {
        if (pollResult.newEvents.length > 0) events.push(...pollResult.newEvents);
        let reviewFromLog = extractReviewFromLog(events);
        if (reviewFromLog) return reviewFromLog;
        if (pollResult.startupFailure && isReviewStartupFailureFastFailEnabled())
          throw sessionStartFailure(pollResult.startupFailure);
        return `{"error":"${ARCHIVED_BEFORE_OUTPUT_MESSAGE}"}`;
      }
      if (pollResult.newEvents.length > 0) {
        events.push(...pollResult.newEvents);
        for (let newEvent of pollResult.newEvents)
          if (
            newEvent.type === "system" &&
            (newEvent.subtype === "hook_progress" || newEvent.subtype === "hook_response")
          ) {
            let progress = formatReviewProgress(newEvent.stdout);
            if (progress && progress !== lastProgress) {
              lastProgress = progress;
              printStatus(`  ${progress}`);
            }
          }
        let reviewFromLog = extractReviewFromLog(events);
        if (reviewFromLog) return reviewFromLog;
      }
      if (pollResult.startupFailure && isReviewStartupFailureFastFailEnabled())
        throw sessionStartFailure(pollResult.startupFailure);
    } catch (error) {
      if (signal.aborted || error instanceof PollFailure) throw error;
      if (!isTransientNetworkError(error)) throw new PollFailure("poll_api_error", errorMessage(error));
      if (++failureCount >= MAX_POLL_FAILURES)
        throw new PollFailure(
          "poll_connection_lost",
          "lost connection to the cloud session after repeated retries",
        );
    }
    await sleep(POLL_INTERVAL_MS, signal);
  }
  throw new PollFailure("poll_timeout", `cloud session exceeded ${Math.round(timeoutMs / 60000)} minutes`);
}
//@ chunk-jzm79q04.js:18596-18914 placement
function formatReviewProgress(stdout) {
  let openTag = `<${REMOTE_REVIEW_PROGRESS}>`;
  let closeTag = `</${REMOTE_REVIEW_PROGRESS}>`;
  let index = stdout.lastIndexOf(closeTag);
  let startIndex = index === -1 ? -1 : stdout.lastIndexOf(openTag, index);
  if (startIndex === -1 || index <= startIndex) return null;
  try {
    let payload = jsonParse(stdout.slice(startIndex + openTag.length, index));
    let stage = payload.stage ?? "running";
    let bugsFound = payload.bugs_found ?? 0;
    let bugsVerified = payload.bugs_verified ?? 0;
    let bugsRefuted = payload.bugs_refuted ?? 0;
    return `${stage} \u2014 ${bugsFound} found, ${bugsVerified} verified, ${bugsRefuted} refuted`;
  } catch {
    return null;
  }
}
//@ chunk-jzm79q04.js:18914-19480 placement
function formatReviewResult(text) {
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    return text;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return "Review complete \u2014 no findings.";
  let findings = parsed;
  let findingCount = findings.length;
  let lines = [
    sequential.bold(`Review complete \u2014 ${findingCount} ${plural(findingCount, "finding")}`),
    "",
  ];
  for (let finding of findings) {
    let severityEmoji = SEVERITY_EMOJI[finding.severity ?? "normal"] ?? "\uD83D\uDD34";
    let filePath = finding.file_path ?? "?";
    let startLine = finding.start_line ?? 0;
    let endLine = finding.end_line ?? startLine;
    let location = startLine === endLine ? `${filePath}:${startLine}` : `${filePath}:${startLine}-${endLine}`;
    let trimmed = (finding.pr_comment ?? "").trim();
    let index = trimmed.indexOf(`

`);
    let summaryLine = index === -1 ? trimmed : trimmed.slice(0, index);
    let detailText = index === -1 ? "" : trimmed.slice(index + 2);
    lines.push(`${severityEmoji} ${sequential.bold(location)}`);
    if (summaryLine) lines.push(summaryLine);
    if (detailText) {
      lines.push("");
      lines.push(detailText);
    }
    lines.push("");
  }
  return lines
    .join(
      `
`,
    )
    .trimEnd();
}
//@ chunk-jzm79q04.js:19480-19530 placement
function printStatus(line) {
  process.stderr.write(
    sequential.dim(line) +
      `
`,
  );
}
export { ultrareviewCommand };

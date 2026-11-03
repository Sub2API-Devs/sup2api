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
import { u2 } from "../../tasks/taskLoopRegistry.js";
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
var POLL_INTERVAL_MS = 3000,
  MAX_POLL_FAILURES = 5,
  ARCHIVED_BEFORE_OUTPUT_MESSAGE = "cloud session was archived before producing output",
  FINDINGS_LOST_NOTE =
    "its findings will no longer arrive here. A new run is a new review: it uses one of your free ultrareviews or bills as usage credits.";
//@ chunk-jzm79q04.js:12445-12539 placement
class PollFailure extends Error {
  reason;
  constructor(s, t) {
    super(t);
    this.reason = s;
    this.name = "PollFailure";
  }
}
//@ chunk-jzm79q04.js:12539-12632 placement
function U(s) {
  return new PollFailure("session_start_failed", `the cloud session could not start: ${s}`);
}
//@ chunk-jzm79q04.js:12632-12709 placement
var j = { normal: "\uD83D\uDD34", nit: "\uD83D\uDFE1", pre_existing: "\uD83D\uDFE3" };
//@ chunk-jzm79q04.js:12709-12797 placement
function M(s, t) {
  if (t.includes("--no-post")) return !1;
  return s === !0 && t.includes("--post");
}
/**
 * claude ultrareview：信任工作区、启动云审查会话、等待结果并可发布评论（约 4.4 KB）。
 */
//@ chunk-jzm79q04.js:12797-17230 placement
async function ultrareviewCommand(s, t, u, o) {
  let a = () => process.exit(130);
  process.once("SIGINT", a);
  let found = process.argv.find((n, T) => process.argv[T - 1] === "--trust-workspace" && !/^-./.test(n));
  if (t.trustWorkspace === !0 && found !== void 0) {
    await logFeatureBadAsync("cli_ultrareview", "trust_flag_given_a_value");
    let n = isOnClaudeCodeSessionSurface()
      ? ""
      : " To trust it for this run, put nothing after the flag: a PR number or base branch goes before it.";
    return cliErrorAfterAnalyticsFlush(
      `Ultrareview did not start: \`--trust-workspace\` takes no value, but ${jsonStringify(found)} follows it. If you do not trust this folder, leave the flag out.${n}`,
    );
  }
  if (!checkHasTrustDialogAccepted())
    if (t.trustWorkspace === !0)
      (setSessionTrustAccepted(!0),
        logFeatureOk("cli_ultrareview_workspace_trust", { trust_source: lit("flag") }));
    else {
      let {
          canPromptForWorkspaceTrust: canPromptForWorkspaceTrust,
          offerBridgeWorkspaceTrust: offerBridgeWorkspaceTrust,
        } = await import("./chunk-p3rkx9n6.js"),
        P = canPromptForWorkspaceTrust();
      if (P || (await checkUltrareviewWorkspaceTrust())) {
        stopCapturingEarlyInput();
        let E = await offerBridgeWorkspaceTrust({
          dir: getOriginalCwd(),
          isHomeDir: isHomeDirectorySession(),
          canPrompt: P,
          storageV5: u,
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
        if (!E.trusted)
          return (
            await logFeatureBadAsync(
              "cli_ultrareview",
              E.reason === "declined" ? "workspace_trust_declined" : "workspace_not_trusted",
            ),
            cliErrorAfterAnalyticsFlush(E.message)
          );
      }
    }
  await waitForPolicyLimitsToLoad();
  let w = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (w) {
    let n = policyDenyKind("allow_remote_sessions");
    if ((await logOrgPolicyDeniedAsync("allow_remote_sessions", "cli_flag"), n === "cache_miss"))
      await logFeatureSadAsync("cli_ultrareview", "policy_cache_miss");
    else
      await logFeatureBadAsync(
        "cli_ultrareview",
        n === "route_missing" ? "policy_route_missing" : "policy_disallowed",
      );
    return cliErrorAfterAnalyticsFlush(w);
  }
  await initializeGrowthBook().catch(() => {});
  let l = Number(t.timeout),
    f = Number.isFinite(l) && l > 0 ? l : clientWaitMinutes(),
    r = createAbortController(),
    h = M(t.post, process.argv),
    e = await runUltrareviewHeadless(s, {
      confirm: !0,
      postReview: h,
      overageConfirmed: !1,
      markOverageConfirmed: () => {},
      singlePass: !0,
      personRanTheCommand: !isOnClaudeCodeSessionSurface(),
      skipTaskRegistration: !0,
      invocation: "claude ultrareview",
      context: { abortController: r, taskRegistry: u2, storageV5: u, credentials: o },
    });
  if (e.status !== "launched") {
    let n =
      e.status === "blocked" && e.actionUrl
        ? `
  \u2192 ${e.actionUrl}`
        : "";
    return (
      await logFeatureBadAsync("cli_ultrareview", "cli_ultrareview_launch_failed"),
      cliErrorAfterAnalyticsFlush(`Ultrareview could not launch: ${"message" in e ? e.message : e.body}${n}`)
    );
  }
  if ((m(e.message), e.lowCreditsNote)) m(e.lowCreditsNote);
  (m(`Waiting for findings (${getReviewDurationNote()})\u2026`), process.removeListener("SIGINT", a));
  let p = () => {
    (m(`
Stopped waiting. The review may still be running in the cloud, but ${FINDINGS_LOST_NOTE}${
      e.postReviewTo
        ? `
Nothing will be posted to the pull request.`
        : ""
    }`),
      process.exit(130));
  };
  process.once("SIGINT", p);
  let S = () => {
      (process.removeListener("SIGINT", p),
        process.once("SIGINT", () => {
          (m(`
Interrupted. The review already finished (findings above).${
            e.postReviewTo
              ? `
The post to the pull request may already be on its way \u2014 check the PR before posting by hand.`
              : ""
          }`),
            process.exit(130));
        }));
    },
    v;
  try {
    v = await pollReviewSession(e.sessionId, r.signal, f * 60 * 1000, o);
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
  let I = parseReviewErrorPayload(v),
    R = I?.error ?? null,
    k = I?.stopped === !0,
    A =
      R === ARCHIVED_BEFORE_OUTPUT_MESSAGE
        ? lit("session_archived")
        : k
          ? lit("stopped_remotely")
          : lit("orchestrator_error"),
    C = countReviewFindings(v),
    N = C !== void 0 ? { findings_count: C } : void 0;
  if (!R) S();
  if (t.json) {
    if (
      (await writeStdoutAndDrain(
        v +
          `
`,
      ),
      R)
    ) {
      if (
        (await logFeatureBadAsync("cli_ultrareview", "cli_ultrareview_remote_error", { reason: A }),
        e.postReviewTo)
      )
        m(`Nothing was posted to the pull request: the review ${k ? "was stopped" : "failed"}.`);
    } else (await describePostOutcome(e, o), await logFeatureOkAsync("cli_ultrareview", N));
    return exitAfterAnalyticsFlush(R ? 1 : 0);
  }
  if (R)
    return (
      await logFeatureBadAsync("cli_ultrareview", "cli_ultrareview_remote_error", { reason: A }),
      cliErrorAfterAnalyticsFlush(
        `${k ? "Review stopped" : "Review failed"}: ${R}${
          e.postReviewTo
            ? `
Nothing was posted to the pull request: the review ${k ? "was stopped" : "failed"}, so there are no findings to post.`
            : ""
        }`,
      )
    );
  return (
    await writeStdoutAndDrain(
      formatReviewResult(v) +
        `
`,
    ),
    await describePostOutcome(e, o),
    await logFeatureOkAsync("cli_ultrareview", N),
    exitAfterAnalyticsFlush(0)
  );
}
//@ chunk-jzm79q04.js:17230-17650 placement
async function describePostOutcome({ postReviewTo: postReviewTo, sessionId: sessionId }, u) {
  if (!postReviewTo) return;
  m("Posting the findings to the pull request as a comment from your GitHub account\u2026");
  let o = await waitForUltrareviewPost(sessionId, u);
  switch (o.status) {
    case "posted":
      m(
        o.alreadyPosted
          ? `Already posted \u2014 this review's comment is on the pull request: ${o.commentUrl}`
          : `Posted \u2014 a single plain comment, not a review: ${o.commentUrl}`,
      );
      break;
    case "not-posted":
      m(o.reason);
      break;
  }
}
//@ chunk-jzm79q04.js:17650-18596 placement
async function pollReviewSession(s, t, u, o) {
  let a = Date.now() + u,
    i = null,
    w = 0,
    l = [],
    f = "";
  while (Date.now() < a) {
    if (t.aborted) throw Error("aborted");
    try {
      let r = await pollRemoteSessionEvents(s, i, { credentials: o });
      if (((i = r.lastEventId), (w = 0), r.sessionStatus === "archived")) {
        if (r.newEvents.length > 0) l.push(...r.newEvents);
        let h = extractReviewFromLog(l);
        if (h) return h;
        if (r.startupFailure && isReviewStartupFailureFastFailEnabled()) throw U(r.startupFailure);
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
            if (p && p !== f) ((f = p), m(`  ${p}`));
          }
        let h = extractReviewFromLog(l);
        if (h) return h;
      }
      if (r.startupFailure && isReviewStartupFailureFastFailEnabled()) throw U(r.startupFailure);
    } catch (error) {
      if (t.aborted || error instanceof PollFailure) throw error;
      if (!isTransientNetworkError(error)) throw new PollFailure("poll_api_error", errorMessage(error));
      if (++w >= MAX_POLL_FAILURES)
        throw new PollFailure(
          "poll_connection_lost",
          "lost connection to the cloud session after repeated retries",
        );
    }
    await sleep(POLL_INTERVAL_MS, t);
  }
  throw new PollFailure("poll_timeout", `cloud session exceeded ${Math.round(u / 60000)} minutes`);
}
//@ chunk-jzm79q04.js:18596-18914 placement
function formatReviewProgress(s) {
  let t = `<${REMOTE_REVIEW_PROGRESS}>`,
    u = `</${REMOTE_REVIEW_PROGRESS}>`,
    index = s.lastIndexOf(u),
    a = index === -1 ? -1 : s.lastIndexOf(t, index);
  if (a === -1 || index <= a) return null;
  try {
    let i = jsonParse(s.slice(a + t.length, index)),
      w = i.stage ?? "running",
      l = i.bugs_found ?? 0,
      f = i.bugs_verified ?? 0,
      r = i.bugs_refuted ?? 0;
    return `${w} \u2014 ${l} found, ${f} verified, ${r} refuted`;
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
  let u = t,
    o = u.length,
    a = [sequential.bold(`Review complete \u2014 ${o} ${plural(o, "finding")}`), ""];
  for (let i of u) {
    let w = j[i.severity ?? "normal"] ?? "\uD83D\uDD34",
      l = i.file_path ?? "?",
      f = i.start_line ?? 0,
      r = i.end_line ?? f,
      h = f === r ? `${l}:${f}` : `${l}:${f}-${r}`,
      trimmed = (i.pr_comment ?? "").trim(),
      index = trimmed.indexOf(`

`),
      S = index === -1 ? trimmed : trimmed.slice(0, index),
      v = index === -1 ? "" : trimmed.slice(index + 2);
    if ((a.push(`${w} ${sequential.bold(h)}`), S)) a.push(S);
    if (v) (a.push(""), a.push(v));
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
function m(s) {
  process.stderr.write(
    sequential.dim(s) +
      `
`,
  );
}

/**
 * commands/review/ultrareviewCommand.tsx
 *
 * 2.1.316 新增：ultrareview 命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/review/ultrareviewCommand.tsx
 * pieces: chunk-0yw3taqg.js (1), chunk-1nx5c9rq.js (2), chunk-nm4wy193.js (1)
 * attribution: placement 4
 */
import {
  parseUltrareviewArgs,
  runUltrareviewHeadless,
  ultrareviewLaunchAcknowledgementNudge,
  launchRemoteReview,
  POST_DISABLED_NOTE,
  POST_IGNORED_NOTE,
  precheckLaunchScope,
  checkOverageGate,
} from "./reviewRemote.js";
import { isHostEntrypoint } from "../../utils/entrypointKinds.js";
import { createUserMessage } from "../../utils/messages.js";
import { COMMAND_NAME, LOCAL_COMMAND_STDOUT, LOCAL_COMMAND_STDERR } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import { logOrgPolicyDenied } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import { checkHasTrustDialogAccepted } from "../../utils/config.js";
import {
  checkUltrareviewWorkspaceTrust,
  isUltrareviewPostEnabled,
  getReviewDurationNote,
} from "./ultrareviewPreconditions.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { truncatePathForDisplay } from "../../utils/invisibleChars.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { sanitizedMachineReasonForTelemetry } from "../../utils/errors.js";
import { isExtraUsageAllowed } from "../../utils/auth.js";
import { isConsumerPlan } from "../../utils/planTiers.js";
import { isGithubDotCom } from "../../utils/git/githubUrl.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { UltrareviewLaunchDialog } from "./UltrareviewLaunchDialog.js";

//@ chunk-nm4wy193.js:13152-14039 placement
/**
 * /ultrareview 命令：解析参数后无界面运行审查。
 */
var runUltrareviewCommand = async (args, context, invokedName) => {
  let invocation = invokedName ? `/${invokedName}` : "/ultrareview";
  let { scopeArgs, applyFixes, postReview } = parseUltrareviewArgs(args);
  let result = await runUltrareviewHeadless(scopeArgs, {
    confirm: true,
    singlePass: true,
    withholdOverageConsent: true,
    applyFixes,
    postReview: postReview === true,
    overageConfirmed: context.isUltrareviewOverageConfirmed(),
    markOverageConfirmed: () => context.markUltrareviewOverageConfirmed(),
    context,
    invocation,
  });
  switch (result.status) {
    case "launched":
      return {
        type: "query",
        value: result.message,
        prompt: ultrareviewLaunchAcknowledgementNudge(applyFixes),
      };
    case "needs-confirm": {
      let hint = isHostEntrypoint()
        ? "Run /ultrareview to confirm and launch the cloud review."
        : 'Run "claude ultrareview" from your terminal to consent and launch, or use /ultrareview in an interactive Claude Code session.';
      return {
        type: "text",
        value: `${result.body} ${invocation} can't show the billing confirmation in this session. ${hint}`,
      };
    }
    case "blocked":
      return {
        type: "text",
        value: result.actionUrl
          ? `${result.message}
  \u2192 ${result.actionUrl}`
          : result.message,
      };
    case "error":
      return {
        type: "text",
        value: result.message,
      };
  }
};
//@ chunk-0yw3taqg.js:666619-667075 placement
/**
 * 把 /ultrareview 的启动结果转成 transcript 消息：命令行本身 + stdout（已启动）或 stderr（未启动，附 actionUrl）。needs-confirm 时不写。
 */
function buildUltrareviewMessages(args, result) {
  if (result.status === "needs-confirm") return [];
  let userMessage = createUserMessage({
    content: `<${COMMAND_NAME}>/ultrareview${args ? " " + escapeXml(args) : ""}</${COMMAND_NAME}>`,
    isMeta: true,
  });
  if (result.status === "launched")
    return [
      userMessage,
      createUserMessage({
        content: `<${LOCAL_COMMAND_STDOUT}>${escapeXml(result.message)}</${LOCAL_COMMAND_STDOUT}>`,
        isMeta: true,
        localCommandOutput: "stdout",
      }),
    ];
  let failureText =
    result.status === "blocked" && result.actionUrl
      ? `${result.message}
More: ${result.actionUrl}`
      : result.message;
  return [
    userMessage,
    createUserMessage({
      content: `<${LOCAL_COMMAND_STDERR}>Ultrareview did not launch: ${escapeXml(failureText)}</${LOCAL_COMMAND_STDERR}>`,
      isMeta: true,
      localCommandOutput: "stderr",
    }),
  ];
}
//@ chunk-1nx5c9rq.js:21075-21767 placement
async function launchUltrareview({
  scope,
  context,
  onDone,
  billingNote,
  applyFixes,
  postToPR,
  postDropped,
  signal,
}) {
  let launchResult = await launchRemoteReview(scope, context, billingNote, {
    applyFixesOnComplete: applyFixes,
    postReviewToPR: postToPR,
    findingsArriveInSession: true,
    signal,
  });
  if (signal?.aborted) {
    if (launchResult?.launched && launchResult.taskId && scope.mode === "pr")
      context.taskRegistry.update(launchResult.taskId, (task) => ({
        ...task,
        postReviewTo: undefined,
      }));
    return;
  }
  if (launchResult) {
    let droppedNote =
      postDropped && launchResult.launched
        ? postDropped === "disabled"
          ? POST_DISABLED_NOTE
          : POST_IGNORED_NOTE
        : "";
    let messageText =
      launchResult.blocks.map((block) => (block.type === "text" ? block.text : "")).filter(Boolean).join(`
`) + droppedNote;
    onDone(messageText, {
      shouldQuery: true,
      metaMessages: launchResult.launched
        ? [
            ultrareviewLaunchAcknowledgementNudge(
              applyFixes,
              scope.mode === "branch" ? scope.instructions : undefined,
            ),
          ]
        : undefined,
    });
  } else
    onDone(
      "Ultrareview failed to launch the cloud session. Check that this is a GitHub repo and try again.",
      {
        display: "system",
      },
    );
}
//@ chunk-1nx5c9rq.js:21767-23837 placement
/**
 * /ultrareview 命令定义：需要 allow_remote_sessions，在云会话中运行
 */
var call = async (onDone, context, args, invokedName) => {
  let done = (message, options) => onDone(message === undefined ? undefined : escapeXml(message), options);
  let policyDenied = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (policyDenied) {
    logOrgPolicyDenied("allow_remote_sessions", "slash_command");
    done(policyDenied, {
      display: "system",
    });
    return null;
  }
  let invocation = invokedName ? `/${invokedName}` : "/ultrareview";
  if (!checkHasTrustDialogAccepted() && (await checkUltrareviewWorkspaceTrust())) {
    logFeatureBad("cli_ultrareview_workspace_trust", "cannot_ask_in_session");
    done(
      `Ultrareview did not start: ${jsonStringify(truncatePathForDisplay(getOriginalCwd()))} is not trusted, and this session started without asking whether you trust it. Run ${invocation} in a \`claude\` session where you have accepted the workspace trust dialog for that folder.`,
      {
        display: "system",
      },
    );
    return null;
  }
  let { scopeArgs, applyFixes, postReview } = parseUltrareviewArgs(args);
  let precheck = await precheckLaunchScope(scopeArgs, invocation, {
    confirmsBeforeLaunch: true,
  });
  if (!precheck.ok) {
    done(precheck.error, {
      display: "system",
    });
    return null;
  }
  let scope = precheck.scope;
  let recoveryLogged = false;
  let logRecovery = (signal) => {
    if (scope.mode === "branch" && scope.noMergeBase)
      logEvent("tengu_review_remote_precondition_recovery", {
        reason: lit("no_merge_base"),
        method: lit("empty_tree_bundle"),
        outcome: fromEnum(signal),
      });
  };
  let gate = await checkOverageGate({
    overageConfirmed: context.isUltrareviewOverageConfirmed(),
    credentials: context.credentials,
    bundleFollows: scope.mode === "branch",
  });
  switch (gate.kind) {
    case "blocked": {
      logEvent("tengu_review_overage_blocked", {
        reason: sanitizedMachineReasonForTelemetry(gate.reason),
      });
      let actionLine = gate.actionUrl
        ? `
  \u2192 ${gate.actionUrl}`
        : "";
      let usageCreditsHint =
        gate.actionUrl?.includes("/admin-settings/") && isExtraUsageAllowed() && !isConsumerPlan()
          ? `
  Run /usage-credits to request this from your admin.`
          : "";
      done(`${gate.message}${actionLine}${usageCreditsHint}`, {
        display: "system",
      });
      return null;
    }
    case "needs-confirm":
    case "proceed":
      if (gate.kind === "needs-confirm") logEvent("tengu_review_overage_dialog_shown", {});
      let postDisabled = !isUltrareviewPostEnabled();
      let postOption =
        scope.mode === "pr" && isGithubDotCom(scope.host) && postReview !== false && !postDisabled
          ? {
              githubLogin: gate.githubLogin ?? null,
              preferPost: postReview === true,
            }
          : null;
      return jsxProd_default(UltrareviewLaunchDialog, {
        subtitle: gate.kind === "needs-confirm" ? getReviewDurationNote() : gate.billingNote || null,
        body: gate.kind === "needs-confirm" ? gate.body : undefined,
        scope,
        postOption,
        onProceed: async (signal, result) => {
          if (!recoveryLogged) {
            recoveryLogged = true;
            logRecovery("accepted");
          }
          await launchUltrareview({
            scope,
            context,
            onDone: done,
            billingNote: gate.billingNote,
            applyFixes,
            postToPR: postOption !== null && result.postToPR,
            postDropped:
              postReview === true && postOption === null ? (postDisabled ? "disabled" : "target") : undefined,
            signal,
          });
          if (!signal.aborted && gate.kind === "needs-confirm") context.markUltrareviewOverageConfirmed();
        },
        onCancel: () => {
          if (!recoveryLogged) logRecovery("declined");
          done("Ultrareview cancelled.", {
            display: "system",
          });
        },
      });
  }
};
export { buildUltrareviewMessages, runUltrareviewCommand, call };

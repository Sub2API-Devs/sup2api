/**
 * commands/review/ultrareviewCommand.tsx
 *
 * 2.1.316 新增：ultrareview 命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/review/ultrareviewCommand.tsx
 * pieces: chunk-0eepcc6r.js (2), chunk-tyg7f3ek.js (1), chunk-yxg7c7n7.js (1)
 * attribution: placement 4
 */
import {
  launchRemoteReview,
  POST_DISABLED_NOTE,
  POST_IGNORED_NOTE,
  ultrareviewLaunchAcknowledgementNudge,
  parseUltrareviewArgs,
  precheckLaunchScope,
  checkOverageGate,
  runUltrareviewHeadless,
} from "./reviewRemote.js";
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
import { createUserMessage } from "../../utils/messages.js";
import { COMMAND_NAME, LOCAL_COMMAND_STDOUT, LOCAL_COMMAND_STDERR } from "../../constants/xml.js";
import { isHostEntrypoint } from "../../utils/entrypointKinds.js";

//@ chunk-0eepcc6r.js:19899-20591 placement
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
  let t = await launchRemoteReview(scope, context, billingNote, {
    applyFixesOnComplete: applyFixes,
    postReviewToPR: postToPR,
    findingsArriveInSession: true,
    signal,
  });
  if (signal?.aborted) {
    if (t?.launched && t.taskId && scope.mode === "pr")
      context.taskRegistry.update(t.taskId, (u) => ({
        ...u,
        postReviewTo: undefined,
      }));
    return;
  }
  if (t) {
    let u =
      postDropped && t.launched ? (postDropped === "disabled" ? POST_DISABLED_NOTE : POST_IGNORED_NOTE) : "";
    let k =
      t.blocks.map((block) => (block.type === "text" ? block.text : "")).filter(Boolean).join(`
`) + u;
    onDone(k, {
      shouldQuery: true,
      metaMessages: t.launched
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
//@ chunk-0eepcc6r.js:20591-22662 placement
/**
 * /ultrareview 命令定义：需要 allow_remote_sessions，在云会话中运行
 */
var call = async (onDone, context, args, invokedName) => {
  let i = (f, T) => onDone(f === undefined ? undefined : escapeXml(f), T);
  let C = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (C) {
    logOrgPolicyDenied("allow_remote_sessions", "slash_command");
    i(C, {
      display: "system",
    });
    return null;
  }
  let h = invokedName ? `/${invokedName}` : "/ultrareview";
  if (!checkHasTrustDialogAccepted() && (await checkUltrareviewWorkspaceTrust())) {
    logFeatureBad("cli_ultrareview_workspace_trust", "cannot_ask_in_session");
    i(
      `Ultrareview did not start: ${jsonStringify(truncatePathForDisplay(getOriginalCwd()))} is not trusted, and this session started without asking whether you trust it. Run ${h} in a \`claude\` session where you have accepted the workspace trust dialog for that folder.`,
      {
        display: "system",
      },
    );
    return null;
  }
  let { scopeArgs, applyFixes, postReview } = parseUltrareviewArgs(args);
  let k = await precheckLaunchScope(scopeArgs, h, {
    confirmsBeforeLaunch: true,
  });
  if (!k.ok) {
    i(k.error, {
      display: "system",
    });
    return null;
  }
  let scope = k.scope;
  let F = false;
  let L = (signal) => {
    if (scope.mode === "branch" && scope.noMergeBase)
      logEvent("tengu_review_remote_precondition_recovery", {
        reason: lit("no_merge_base"),
        method: lit("empty_tree_bundle"),
        outcome: fromEnum(signal),
      });
  };
  let p = await checkOverageGate({
    overageConfirmed: context.isUltrareviewOverageConfirmed(),
    credentials: context.credentials,
    bundleFollows: scope.mode === "branch",
  });
  switch (p.kind) {
    case "blocked": {
      logEvent("tengu_review_overage_blocked", {
        reason: sanitizedMachineReasonForTelemetry(p.reason),
      });
      let M = p.actionUrl
        ? `
  \u2192 ${p.actionUrl}`
        : "";
      let D =
        p.actionUrl?.includes("/admin-settings/") && isExtraUsageAllowed() && !isConsumerPlan()
          ? `
  Run /usage-credits to request this from your admin.`
          : "";
      i(`${p.message}${M}${D}`, {
        display: "system",
      });
      return null;
    }
    case "needs-confirm":
    case "proceed":
      if (p.kind === "needs-confirm") logEvent("tengu_review_overage_dialog_shown", {});
      let f = !isUltrareviewPostEnabled();
      let T =
        scope.mode === "pr" && isGithubDotCom(scope.host) && postReview !== false && !f
          ? {
              githubLogin: p.githubLogin ?? null,
              preferPost: postReview === true,
            }
          : null;
      return jsxProd_default(UltrareviewLaunchDialog, {
        subtitle: p.kind === "needs-confirm" ? getReviewDurationNote() : p.billingNote || null,
        body: p.kind === "needs-confirm" ? p.body : undefined,
        scope,
        postOption: T,
        onProceed: async (M, D) => {
          if (!F) {
            F = true;
            L("accepted");
          }
          await launchUltrareview({
            scope,
            context,
            onDone: i,
            billingNote: p.billingNote,
            applyFixes,
            postToPR: T !== null && D.postToPR,
            postDropped: postReview === true && T === null ? (f ? "disabled" : "target") : undefined,
            signal: M,
          });
          if (!M.aborted && p.kind === "needs-confirm") context.markUltrareviewOverageConfirmed();
        },
        onCancel: () => {
          if (!F) L("declined");
          i("Ultrareview cancelled.", {
            display: "system",
          });
        },
      });
  }
};
//@ chunk-tyg7f3ek.js:624510-624966 placement
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
  let s =
    result.status === "blocked" && result.actionUrl
      ? `${result.message}
More: ${result.actionUrl}`
      : result.message;
  return [
    userMessage,
    createUserMessage({
      content: `<${LOCAL_COMMAND_STDERR}>Ultrareview did not launch: ${escapeXml(s)}</${LOCAL_COMMAND_STDERR}>`,
      isMeta: true,
      localCommandOutput: "stderr",
    }),
  ];
}
//@ chunk-yxg7c7n7.js:11976-12863 placement
/**
 * /ultrareview 命令：解析参数后无界面运行审查。
 */
var runUltrareviewCommand = async (args, context, invokedName) => {
  let a = invokedName ? `/${invokedName}` : "/ultrareview";
  let { scopeArgs, applyFixes, postReview } = parseUltrareviewArgs(args);
  let e = await runUltrareviewHeadless(scopeArgs, {
    confirm: true,
    singlePass: true,
    withholdOverageConsent: true,
    applyFixes,
    postReview: postReview === true,
    overageConfirmed: context.isUltrareviewOverageConfirmed(),
    markOverageConfirmed: () => context.markUltrareviewOverageConfirmed(),
    context,
    invocation: a,
  });
  switch (e.status) {
    case "launched":
      return {
        type: "query",
        value: e.message,
        prompt: ultrareviewLaunchAcknowledgementNudge(applyFixes),
      };
    case "needs-confirm": {
      let l = isHostEntrypoint()
        ? "Run /ultrareview to confirm and launch the cloud review."
        : 'Run "claude ultrareview" from your terminal to consent and launch, or use /ultrareview in an interactive Claude Code session.';
      return {
        type: "text",
        value: `${e.body} ${a} can't show the billing confirmation in this session. ${l}`,
      };
    }
    case "blocked":
      return {
        type: "text",
        value: e.actionUrl
          ? `${e.message}
  \u2192 ${e.actionUrl}`
          : e.message,
      };
    case "error":
      return {
        type: "text",
        value: e.message,
      };
  }
};
export { buildUltrareviewMessages };

/**
 * commands/review/ultrareviewCommand.tsx
 *
 * 2.1.316 新增：ultrareview 命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/review/ultrareviewCommand.tsx
 * pieces: chunk-0eepcc6r.js (2), chunk-yxg7c7n7.js (1)
 * attribution: placement 3
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
import { checkUltrareviewWorkspaceTrust, Bvt, getReviewDurationNote } from "./ultrareviewPreconditions.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { HD } from "../../utils/invisibleChars.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { sanitizedMachineReasonForTelemetry } from "../../utils/errors.js";
import { isExtraUsageAllowed } from "../../utils/auth.js";
import { isConsumerPlan } from "../../utils/planTiers.js";
import { isGithubDotCom } from "../../utils/git/githubUrl.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { UltrareviewLaunchDialog } from "./UltrareviewLaunchDialog.js";
import { isHostEntrypoint } from "../../utils/entrypointKinds.js";

//@ chunk-0eepcc6r.js:19899-20591 placement
async function launchUltrareview({
  scope: scope,
  context: context,
  onDone: onDone,
  billingNote: billingNote,
  applyFixes: applyFixes,
  postToPR: postToPR,
  postDropped: postDropped,
  signal: signal,
}) {
  let t = await launchRemoteReview(scope, context, billingNote, {
    applyFixesOnComplete: applyFixes,
    postReviewToPR: postToPR,
    findingsArriveInSession: !0,
    signal: signal,
  });
  if (signal?.aborted) {
    if (t?.launched && t.taskId && scope.mode === "pr")
      context.taskRegistry.update(t.taskId, (u) => ({ ...u, postReviewTo: void 0 }));
    return;
  }
  if (t) {
    let u =
        postDropped && t.launched
          ? postDropped === "disabled"
            ? POST_DISABLED_NOTE
            : POST_IGNORED_NOTE
          : "",
      k =
        t.blocks.map((block) => (block.type === "text" ? block.text : "")).filter(Boolean).join(`
`) + u;
    onDone(k, {
      shouldQuery: !0,
      metaMessages: t.launched
        ? [
            ultrareviewLaunchAcknowledgementNudge(
              applyFixes,
              scope.mode === "branch" ? scope.instructions : void 0,
            ),
          ]
        : void 0,
    });
  } else
    onDone(
      "Ultrareview failed to launch the cloud session. Check that this is a GitHub repo and try again.",
      { display: "system" },
    );
}
/**
 * /ultrareview 命令定义：需要 allow_remote_sessions，在云会话中运行
 */
//@ chunk-0eepcc6r.js:20591-22662 placement
var call = async (onDone, context, args, invokedName) => {
  let i = (f, T) => onDone(f === void 0 ? void 0 : escapeXml(f), T),
    C = policyDeniedReason("allow_remote_sessions", "Cloud sessions", "are");
  if (C)
    return (logOrgPolicyDenied("allow_remote_sessions", "slash_command"), i(C, { display: "system" }), null);
  let h = invokedName ? `/${invokedName}` : "/ultrareview";
  if (!checkHasTrustDialogAccepted() && (await checkUltrareviewWorkspaceTrust()))
    return (
      logFeatureBad("cli_ultrareview_workspace_trust", "cannot_ask_in_session"),
      i(
        `Ultrareview did not start: ${jsonStringify(HD(getOriginalCwd()))} is not trusted, and this session started without asking whether you trust it. Run ${h} in a \`claude\` session where you have accepted the workspace trust dialog for that folder.`,
        { display: "system" },
      ),
      null
    );
  let { scopeArgs: scopeArgs, applyFixes: applyFixes, postReview: postReview } = parseUltrareviewArgs(args),
    k = await precheckLaunchScope(scopeArgs, h, { confirmsBeforeLaunch: !0 });
  if (!k.ok) return (i(k.error, { display: "system" }), null);
  let scope = k.scope,
    F = !1,
    L = (signal) => {
      if (scope.mode === "branch" && scope.noMergeBase)
        logEvent("tengu_review_remote_precondition_recovery", {
          reason: lit("no_merge_base"),
          method: lit("empty_tree_bundle"),
          outcome: fromEnum(signal),
        });
    },
    p = await checkOverageGate({
      overageConfirmed: context.isUltrareviewOverageConfirmed(),
      credentials: context.credentials,
      bundleFollows: scope.mode === "branch",
    });
  switch (p.kind) {
    case "blocked": {
      logEvent("tengu_review_overage_blocked", { reason: sanitizedMachineReasonForTelemetry(p.reason) });
      let M = p.actionUrl
          ? `
  \u2192 ${p.actionUrl}`
          : "",
        D =
          p.actionUrl?.includes("/admin-settings/") && isExtraUsageAllowed() && !isConsumerPlan()
            ? `
  Run /usage-credits to request this from your admin.`
            : "";
      return (i(`${p.message}${M}${D}`, { display: "system" }), null);
    }
    case "needs-confirm":
    case "proceed":
      if (p.kind === "needs-confirm") logEvent("tengu_review_overage_dialog_shown", {});
      let f = !Bvt(),
        T =
          scope.mode === "pr" && isGithubDotCom(scope.host) && postReview !== !1 && !f
            ? { githubLogin: p.githubLogin ?? null, preferPost: postReview === !0 }
            : null;
      return e(UltrareviewLaunchDialog, {
        subtitle: p.kind === "needs-confirm" ? getReviewDurationNote() : p.billingNote || null,
        body: p.kind === "needs-confirm" ? p.body : void 0,
        scope: scope,
        postOption: T,
        onProceed: async (M, D) => {
          if (!F) ((F = !0), L("accepted"));
          if (
            (await launchUltrareview({
              scope: scope,
              context: context,
              onDone: i,
              billingNote: p.billingNote,
              applyFixes: applyFixes,
              postToPR: T !== null && D.postToPR,
              postDropped: postReview === !0 && T === null ? (f ? "disabled" : "target") : void 0,
              signal: M,
            }),
            !M.aborted && p.kind === "needs-confirm")
          )
            context.markUltrareviewOverageConfirmed();
        },
        onCancel: () => {
          if (!F) L("declined");
          i("Ultrareview cancelled.", { display: "system" });
        },
      });
  }
};
/**
 * /ultrareview 命令：解析参数后无界面运行审查。
 */
//@ chunk-yxg7c7n7.js:11976-12863 placement
var runUltrareviewCommand = async (args, context, invokedName) => {
  let a = invokedName ? `/${invokedName}` : "/ultrareview",
    { scopeArgs: scopeArgs, applyFixes: applyFixes, postReview: postReview } = parseUltrareviewArgs(args),
    e = await runUltrareviewHeadless(scopeArgs, {
      confirm: !0,
      singlePass: !0,
      withholdOverageConsent: !0,
      applyFixes: applyFixes,
      postReview: postReview === !0,
      overageConfirmed: context.isUltrareviewOverageConfirmed(),
      markOverageConfirmed: () => context.markUltrareviewOverageConfirmed(),
      context: context,
      invocation: a,
    });
  switch (e.status) {
    case "launched":
      return { type: "query", value: e.message, prompt: ultrareviewLaunchAcknowledgementNudge(applyFixes) };
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
      return { type: "text", value: e.message };
  }
};

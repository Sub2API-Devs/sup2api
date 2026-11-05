/**
 * commands/autofix-pr/autofix-pr.tsx
 *
 * /autofix-pr：为当前分支的 PR 启动云端自动修复会话（检测 PR、订阅、取消）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ffhe19sr.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { withCronCarryAttachment } from "../../services/daemon/sessionCron.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { getCwd } from "../../utils/cwd.js";
import {
  checkRemoteSessionEligibility,
  formatPreconditionError,
  registerRemoteAgentTask,
} from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { getBranch, getDefaultBranch, hasUnpushedCommits, findGitRoot } from "../../utils/git.js";
import {
  isFederatedFlaskOn,
  findPrStewardLabels,
  buildPrStewardPrompt,
  PR_STEWARD_OWNS_BINDING,
  PR_STEWARD_LABELS,
} from "../../services/prSteward/prStewardLabels.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { getRemoteSessionUrl } from "../../constants/product.js";
import {
  getIsNonInteractiveSession,
  isReplBridgeActive,
  setScheduledTasksEnabled,
} from "../../bootstrap/state.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { teleportToRemote, launchReadsOnlyTags, subscribeRemoteSessionToPR } from "../../utils/teleport.js";
import { archiveRemoteSession } from "../../utils/teleport/api.js";
import { GITHUB_APP_INSTALL_URL } from "../../bridge/githubPrSubscription.js";
import { printableName } from "../../utils/printableName.js";
import { errorMessage } from "../../utils/errors.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { env } from "../../utils/env.js";
import { plural } from "../../utils/stringUtils.js";
import { listAllCronTasks, addCronTask } from "../../utils/cronTasks.js";
import { getReplBridgeHandle, getSdkHostedBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { CRON_DELETE_TOOL_NAME } from "../../tools/ScheduleCronTool/prompt.js";
import { isGithubDotCom } from "../../utils/git/githubUrl.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { useAppStateSlice } from "../../state/AppState.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { createAbortController } from "../../utils/abortController.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import { ErrorText } from "../../components/ErrorText.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { expandPrUrlIfTemplate } from "../../utils/ghPrStatus.js";

//@ chunk-ffhe19sr.js:16000-16004 placement
init_react_production();
//@ chunk-ffhe19sr.js:16004-16154 placement
var AUTOFIX_PHASE_LABELS = {
  checking: "Detecting open PR for current branch\u2026",
  spawning: "Spawning cloud autofix session\u2026",
  subscribing: "Turning on autofix\u2026",
};
//@ chunk-ffhe19sr.js:16154-16311 placement
async function runAutofixPrCommand(args, context, options) {
  let result;
  let feedback;
  feedback = args === "stop" || args === "off";
  result = {
    freeformPrompt: args,
  };
  let autofixPr = await startAutofixPr(result, context, options);
  context.applyMessageOp?.({
    type: "update",
    updater: withCronCarryAttachment,
  });
  return autofixPr;
}
//@ chunk-ffhe19sr.js:16311-21943 placement
/**
 * 启动 autofix：检测当前分支的 PR（gh）、拒绝默认分支、派生云会话（约 5.6 KB）。
 */
async function startAutofixPr(request, context, { signal, onProgress }) {
  logEvent("tengu_autofix_pr_started", {
    action: lit("start"),
    has_pr_number: lit(request.prNumber !== undefined ? "true" : "false"),
    has_repo_path: lit(request.repoPath !== undefined ? "true" : "false"),
    has_repo_ref: lit(request.repoRef !== undefined ? "true" : "false"),
  });
  let { prNumber, target, freeformPrompt, repoPath, repoRef } = request;
  let skills = request.skills ?? [];
  try {
    let cwd = repoPath ?? getCwd();
    let [branch, defaultBranch, eligibility, hasUnpushed] = repoRef
      ? [
          undefined,
          undefined,
          await checkRemoteSessionEligibility({
            cwd,
            storageV5: context.storageV5,
            credentials: context.credentials,
          }),
          false,
        ]
      : await Promise.all([
          getBranch(cwd),
          getDefaultBranch(cwd),
          checkRemoteSessionEligibility({
            cwd,
            storageV5: context.storageV5,
            credentials: context.credentials,
          }),
          hasUnpushedCommits(cwd),
        ]);
    if (prNumber === undefined && !repoRef && branch === defaultBranch)
      return autofixFailure(
        `cannot run on the default branch (${defaultBranch}). This checks the branch of ${cwd} \u2014 check out a feature branch there first (or run Claude Code from your worktree).`,
        "on_default_branch",
      );
    if (!eligibility.eligible) {
      let joined = eligibility.errors.map(formatPreconditionError).join(`
`);
      return autofixFailure(
        `can't start autofix \u2014
${joined}`,
        "not_eligible",
      );
    }
    let route;
    if (repoRef) route = "remote_session";
    else {
      let sameRepo = !repoPath || findGitRoot(repoPath) === findGitRoot(getCwd());
      route = "remote_session";
    }
    let args = ["pr", "view"];
    if (prNumber !== undefined) args.push(String(prNumber));
    if (repoRef) args.push("-R", repoRefLabel(repoRef));
    let stewardOn = isFederatedFlaskOn();
    args.push("--json", stewardOn ? "number,state,url,headRefName,labels" : "number,state,url,headRefName");
    let { stdout, stderr, code, error } = await execFileNoThrowWithCwd("gh", args, {
      timeout: 1e4,
      preserveOutputOnError: true,
      abortSignal: signal,
      cwd,
    });
    if (signal.aborted) return autofixCancelledResult();
    if (code !== 0 || !stdout.trim()) {
      if (error?.includes("ENOENT"))
        return autofixFailure("gh CLI is required but not found.", "gh_not_found");
      if (error) {
        let joined = stderr
          .split(
            `
`,
          )
          .filter((line) => line.trim())
          .slice(-3).join(`
`);
        return autofixFailure(`gh pr view failed: ${joined || error}`, "gh_failed");
      }
      return autofixFailure(
        prNumber !== undefined
          ? `couldn't find PR #${prNumber}${repoRef ? ` in ${repoRefLabel(repoRef)}` : " in this repo"}.`
          : `no open PR found for branch "${branch}"${repoPath ? ` in ${repoPath}` : ""}. Create a PR first, then retry.`,
        "no_open_pr",
      );
    }
    let prNumber_2;
    let owner;
    let repo;
    let url;
    let headRef;
    let labels = [];
    try {
      let pr = jsonParse(stdout);
      if (pr.state === "MERGED" || pr.state === "CLOSED")
        return autofixFailure(
          `PR #${pr.number} is ${pr.state.toLowerCase()}. Autofix requires an open PR.`,
          "pr_not_open",
        );
      let match = pr.url.match(/\/([^/]+)\/([^/]+)\/pull\//);
      if (!match || !match[1] || !match[2])
        return autofixFailure(`unexpected PR URL format: ${pr.url}`, "bad_pr_url");
      prNumber_2 = pr.number;
      owner = match[1];
      repo = match[2];
      url = pr.url;
      headRef = prNumber === undefined && branch ? branch : pr.headRefName;
      if (stewardOn) labels = findPrStewardLabels(pr.labels ?? []);
    } catch {
      return autofixFailure(
        `no open PR found for branch "${branch}"${repoPath ? ` in ${repoPath}` : ""}. Create a PR first, then retry.`,
        "no_open_pr",
      );
    }
    let repoLabel = `${owner}/${repo}`;
    let prLabel = `${repoLabel}#${prNumber_2}`;
    onProgress?.({
      step: "checking",
      prInfo: {
        ref: prLabel,
        url,
      },
    });
    if (labels.length > 0) {
      let notes = [];
      let runningAutofixTask = findRunningAutofixTask(context.taskRegistry, {
        owner,
        repo,
        prNumber: prNumber_2,
      });
      if (runningAutofixTask)
        notes.push(
          `A cloud autofix session from an earlier /autofix-pr is still running on it: ${getRemoteSessionUrl(
            runningAutofixTask,
            undefined,
            {
              from: "cli",
            },
          )}`,
        );
      if (await hasAutofixCronTask(prLabel))
        notes.push(
          "This session is still polling it from an earlier /autofix-pr. Run /autofix-pr stop to end that.",
        );
      return logAutofixResult(
        prLabel,
        labels,
        notes.join(`

`),
      );
    }
    let skillsHint =
      skills.length > 0 ? ` Run ${skills.join(" and ")} for custom instructions on how to autofix.` : "";
    if (route === "current_session") {
      let subscription = await subscribeAutofixPr(prLabel, repoLabel, prNumber_2, skillsHint, {
        credentials: context.credentials,
        storageV5: context.storageV5,
      });
      if (subscription.kind === "pr_steward") return subscription;
      let warnings = [];
      if (hasUnpushed)
        warnings.push("WARNING: You have unpushed local commits, run git push so the PR reflects them");
      if (getIsNonInteractiveSession())
        warnings.push(
          "Note: this is a non-interactive session \u2014 the poll cron only fires while this process stays alive. For one-shot `-p` runs, use `remote` instead.",
        );
      logEvent("tengu_autofix_pr_result", {
        result: lit("success_current_session"),
      });
      return warnings.length > 0 && subscription.kind === "ok"
        ? {
            ...subscription,
            message: `${subscription.message}

${warnings.join(`
`)}`,
          }
        : subscription;
    }
    let prompt =
      freeformPrompt ||
      `You're monitoring PR #${prNumber_2} in ${repoLabel}. When CI failures or review comments arrive as notifications, investigate and push fixes directly to the PR branch. A CI-green notice means the push passed \u2014 nothing to fix.${skillsHint} Start by checking the current PR status.`;
    let prStewardPrompt = buildPrStewardPrompt({
      forCloudSession: true,
    });
    let initialMessage = prStewardPrompt
      ? `${prompt}

${prStewardPrompt}`
      : prompt;
    let runningAutofixTask = findRunningAutofixTask(context.taskRegistry, {
      owner,
      repo,
      prNumber: prNumber_2,
    });
    if (runningAutofixTask) {
      logEvent("tengu_autofix_pr_result", {
        result: lit("success"),
      });
      return {
        kind: "ok",
        message: `Already monitoring ${prLabel} in a cloud session
  ${figures_default.arrowRight} ${getRemoteSessionUrl(runningAutofixTask, undefined, {
    from: "cli",
  })}`,
      };
    }
    onProgress?.({
      step: "spawning",
    });
    let failure;
    let session = await teleportToRemote({
      initialMessage,
      source: "autofix_pr",
      tags: launchReadsOnlyTags(),
      branchName: headRef,
      reuseOutcomeBranch: headRef,
      title: `Autofix PR: ${owner}/${repo}#${prNumber_2} (${headRef})`,
      useDefaultEnvironment: true,
      signal,
      cwd,
      sourceUrl: repoRef ? `https://${repoRef.host}/${repoRef.owner}/${repoRef.repo}` : undefined,
      onBundleFail: (error) => {
        failure = error;
      },
      onCreateFail: (error) => {
        failure = error;
      },
      storageV5: context.storageV5,
      credentials: context.credentials,
    });
    if (signal.aborted) {
      if (session) archiveRemoteSession(session.id);
      return autofixCancelledResult();
    }
    if (!session) return autofixFailure(failure ?? "cloud session creation failed.", "session_create_failed");
    onProgress?.({
      step: "subscribing",
    });
    let binding = await subscribeRemoteSessionToPR(session.id, `${owner}/${repo}`, prNumber_2);
    if (signal.aborted) {
      archiveRemoteSession(session.id);
      return autofixCancelledResult();
    }
    if (stewardOn && !binding.ok && binding.reason === PR_STEWARD_OWNS_BINDING) {
      let archived = await archiveRemoteSession(session.id);
      return logAutofixResult(
        prLabel,
        null,
        archived
          ? "The cloud session started for it has been archived."
          : `The cloud session started for it couldn't be archived and may still work on the PR. Stop it here: ${getRemoteSessionUrl(
              session.id,
              undefined,
              {
                from: "cli",
              },
            )}`,
      );
    }
    registerRemoteAgentTask({
      remoteTaskType: "autofix-pr",
      session: {
        id: session.id,
        title: session.title,
      },
      command: prompt,
      isLongRunning: true,
      remoteTaskMetadata: {
        owner,
        repo,
        prNumber: prNumber_2,
      },
      context: {
        abortController: new AbortController(),
        taskRegistry: context.taskRegistry,
        storageV5: context.storageV5,
        credentials: context.credentials,
      },
    });
    let remoteSessionUrl = getRemoteSessionUrl(session.id, undefined, {
      from: "cli",
    });
    let warnings = [];
    if (!binding.ok)
      warnings.push(
        binding.reason === "github_app_not_installed"
          ? `Autofix is on, but webhook events won't arrive until the Claude GitHub app is installed on ${owner}/${repo}: ${GITHUB_APP_INSTALL_URL}`
          : binding.detail
            ? `Autofix is on, but webhook events won't reach the cloud session: ${printableName(binding.detail, 300)}`
            : "WARNING: Failed to turn on autofix for this PR",
      );
    if (!repoRef) {
      if (hasUnpushed)
        warnings.push(
          "WARNING: You have unpushed local commits, run git push so the cloud session sees them",
        );
    }
    let suffix =
      warnings.length > 0
        ? `

` +
          warnings.join(`
`)
        : "";
    logEvent("tengu_autofix_pr_result", {
      result: lit("success"),
    });
    return {
      kind: "ok",
      message: `Spawned cloud autofix PR session on ${headRef} (PR #${prNumber_2})
  ${figures_default.arrowRight} ${remoteSessionUrl}${suffix}`,
    };
  } catch (error) {
    if (signal.aborted) return autofixCancelledResult();
    return autofixFailure(errorMessage(error), "exception");
  }
}
//@ chunk-ffhe19sr.js:21943-22067 placement
function supervisedPrBinder() {
  {
    let { bindSupervisedPR, isSupervisedBridgeChild } = require("../../bridge/supervisedInbox.js");
    if (isSupervisedBridgeChild()) return bindSupervisedPR;
  }
  return null;
}
//@ chunk-ffhe19sr.js:22067-22111 placement
var AUTOFIX_PR_PROMPT_PREFIX = "Babysit PR ";
var AUTOFIX_PR_SESSION_SLOTS = new SessionRootSlot(() => new Map());
//@ chunk-ffhe19sr.js:22111-22256 placement
function autofixFailure(message, code) {
  logEvent("tengu_autofix_pr_result", {
    result: lit("failed"),
    error_code: fromEnum(code),
  });
  return {
    kind: "error",
    message: `Autofix PR failed: ${message}`,
    code,
  };
}
//@ chunk-ffhe19sr.js:22256-23530 placement
function logAutofixResult(prRef, labels, extra) {
  logEvent("tengu_autofix_pr_result", {
    result: lit("deferred_to_pr_steward"),
  });
  let { watching, working } = PR_STEWARD_LABELS;
  let joined = labels?.map((label) => `\`${label}\``).join(" and ");
  let any = labels?.some((label) => label.toLowerCase() === watching);
  let where = env.CLAUDE_CODE_REMOTE ? "on GitHub" : "on GitHub, or ask Claude to remove it for you";
  let removalText = `Removing it makes PR Steward stand down on this PR and archives its session. Once it has, remove \`${working}\` too if it is still on, and run /autofix-pr again.`;
  let cause;
  let advice;
  if (labels === null) {
    cause = `Claude's servers report that another Claude agent, usually PR Steward, is already watching ${prRef}`;
    advice = `if the PR has the \`${watching}\` label, remove it ${where}. ${removalText}`;
  } else if (any) {
    cause = `PR Steward is watching ${prRef} (it has the ${joined} ${plural(labels.length, "label")})`;
    advice = `remove the \`${watching}\` label ${where}. ${removalText}`;
  } else {
    cause = `PR Steward may be working on ${prRef} (it has the ${joined} label)`;
    advice = `if PR Steward isn't active, it may have stopped without clearing \`${working}\`. Remove that label on GitHub and run /autofix-pr again.`;
  }
  let message = `${cause}, so autofix won't take this PR on: two agents pushing to one PR race each other. You can:
- Leave it as it is and check the PR's status any time.
- You or Claude can make one change and hand back: pull the branch first, and wait while \`${working}\` is on the PR.
- Take over: ${advice}`;
  return {
    kind: "pr_steward",
    message: extra
      ? `${message}

${extra}`
      : message,
  };
}
//@ chunk-ffhe19sr.js:23530-23844 placement
function findRunningAutofixTask(taskRegistry, { owner, repo, prNumber }) {
  let found = Object.values(taskRegistry.all()).find(
    (task) =>
      task.type === "remote_agent" &&
      task.remoteTaskType === "autofix-pr" &&
      task.status === "running" &&
      task.remoteTaskMetadata?.owner === owner &&
      task.remoteTaskMetadata?.repo === repo &&
      task.remoteTaskMetadata?.prNumber === prNumber,
  );
  return found?.type === "remote_agent" ? found.sessionId : undefined;
}
//@ chunk-ffhe19sr.js:23844-23946 placement
async function hasAutofixCronTask(prRef) {
  return (await listAllCronTasks()).some(
    (cron) => cron.durable === false && cron.prompt.startsWith(`${AUTOFIX_PR_PROMPT_PREFIX}${prRef} `),
  );
}
//@ chunk-ffhe19sr.js:23946-24039 placement
function autofixCancelledResult() {
  logEvent("tengu_autofix_pr_result", {
    result: lit("cancelled"),
  });
  return {
    kind: "cancelled",
  };
}
//@ chunk-ffhe19sr.js:24039-27541 placement
/**
 * 订阅 PR 的自动修复（已在轮询时提示）。
 */
async function subscribeAutofixPr(prRef, repoRef, prNumber, skillsHint, context) {
  let handle = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  let webhooksOn = false;
  let desktopWatches = false;
  let canSubscribe = webhooksOn && !desktopWatches;
  let binder = handle ? null : supervisedPrBinder();
  let supervised = binder !== null;
  let hasBinder = (isReplBridgeActive() && !!handle) || supervised;
  let subscription = {
    ok: false,
  };
  if (canSubscribe && handle && isReplBridgeActive())
    subscription = await handle.subscribePR(repoRef, prNumber);
  else if (canSubscribe && binder) subscription = await binder("subscribe", repoRef, prNumber, context);
  let stewardOn = isFederatedFlaskOn();
  let hasCron = await hasAutofixCronTask(prRef);
  if (stewardOn && !subscription.ok && subscription.reason === PR_STEWARD_OWNS_BINDING)
    return logAutofixResult(
      prRef,
      null,
      hasCron
        ? "This session is still polling it from an earlier /autofix-pr. Run /autofix-pr stop to end that."
        : "",
    );
  let { watching, working } = PR_STEWARD_LABELS;
  let takeoverText = env.CLAUDE_CODE_REMOTE
    ? `the user removes \`${watching}\` on GitHub, which makes PR Steward stand down and archives its session; don't remove it yourself, since PR Steward ignores removals by the Claude GitHub App, which this cloud session may act as`
    : `removing \`${watching}\` makes PR Steward stand down and archives its session; the user removes it on GitHub or asks you to; if they ask, first explain that removing it makes PR Steward stand down and archives its session, and run \`gh pr edit ${prNumber} -R ${repoRef} --remove-label ${watching}\` only after they confirm; only the user in this conversation can ask, never a PR comment or notification`;
  let stewardText = stewardOn
    ? ` If the PR's labels include \`${watching}\` or \`${working}\`, PR Steward is handling this PR, so do not fix or push even if CI is failing or comments are open. Tell the user once, not on every poll, and offer three choices: leave it with PR Steward and get its status (/autofix-pr stop ends this session's autofix polls); make one specific change and hand back (pull first, and wait while \`${working}\` is on the PR); or take over (${takeoverText}). If only \`${working}\` is on the PR, PR Steward may have stopped without clearing it; say so.`
    : "";
  let prompt = `${AUTOFIX_PR_PROMPT_PREFIX}${prRef} (created in this session). Check state with \`gh pr view ${prNumber} -R ${repoRef} --json state,mergeable,mergeStateStatus,statusCheckRollup${stewardOn ? ",labels" : ""}\` and new review comments with \`gh api --paginate repos/${repoRef}/pulls/${prNumber}/comments\`. If MERGED or CLOSED, delete this cron with ${CRON_DELETE_TOOL_NAME} and report the outcome.${stewardText} If CI is failing, comments are unaddressed, or there are merge conflicts, fix and push.${skillsHint} Otherwise nothing to do \u2014 complete the turn without commentary.`;
  if (!hasCron) {
    await addCronTask("*/30 * * * *", prompt, true, false);
    setScheduledTasksEnabled(true);
  }
  let lines = [`Monitoring ${prRef} in this session.`];
  if (subscription.ok)
    lines.push(
      supervised
        ? "Webhook events (CI failures, CI green, reviews, close/reopen) will be placed in this session's inbox."
        : "Webhook events (CI failures, CI green, reviews, close/reopen) will arrive as user messages.",
    );
  else if (!webhooksOn)
    lines.push("PR webhooks are turned off right now, so this session polls every 30 minutes instead.");
  else if (desktopWatches)
    lines.push(
      "Claude Desktop watches PRs with its own tools, so this session doesn't subscribe to webhooks. It polls every 30 minutes instead.",
    );
  else if (hasBinder)
    lines.push(
      subscription.reason === "github_app_not_installed"
        ? `Webhook events won't arrive until the Claude GitHub app is installed on this repo. Install it at ${GITHUB_APP_INSTALL_URL}, then retry \u2014 falling back to a 30-minute poll for now.`
        : subscription.detail
          ? `Couldn't subscribe this session to PR webhooks: ${printableName(subscription.detail, 300).replace(/[.\s]+$/, "")}. Falling back to a 30-minute poll.`
          : "Couldn't subscribe this session to PR webhooks \u2014 falling back to a 30-minute poll. Check the debug log for [bridge] subscribe-pr.",
    );
  else
    lines.push(
      "Remote Control isn't connected, so webhooks can't be routed here \u2014 falling back to a 30-minute poll. Connect from the mobile or web app for real-time notifications.",
    );
  lines.push(
    hasCron
      ? "A poll cron for this PR is already registered."
      : "Registered a 30-minute poll cron as a backstop for merge conflicts (and CI/reviews when webhooks are unavailable).",
  );
  return {
    kind: "ok",
    display: "system",
    message: lines.join(" "),
  };
}
//@ chunk-ffhe19sr.js:27541-27620 placement
function repoRefLabel({ owner, repo, host }) {
  return isGithubDotCom(host) ? `${owner}/${repo}` : `${host}/${owner}/${repo}`;
}
//@ chunk-ffhe19sr.js:27620-27676 placement
function hasSeenAutofixChatOpsNotice() {
  return !getGlobalConfig().hasSeenAutofixPrChatOpsNotice;
}
//@ chunk-ffhe19sr.js:27676-27772 placement
function markAutofixChatOpsNoticeSeen(config) {
  return config.hasSeenAutofixPrChatOpsNotice
    ? config
    : {
        ...config,
        hasSeenAutofixPrChatOpsNotice: true,
      };
}
//@ chunk-ffhe19sr.js:27772-27822 placement
function prUrlTemplateOf(state) {
  return state.settings?.prUrlTemplate;
}
//@ chunk-ffhe19sr.js:27822-27884 placement
/**
 * /autofix-pr 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var renderAutofixCancelView = async (onDone, context, args) =>
  jsxProd_default(AutofixCancelView, {
    onDone,
    context,
    args: args.trim(),
  });
//@ chunk-ffhe19sr.js:27884-29143 placement
function AutofixCancelView(props) {
  let $ = useMemoCache(20);
  let { onDone, context, args } = props;
  let [seen, setSeen] = useState(hasSeenAutofixChatOpsNotice);
  if (!seen) {
    let inner;
    if ($[0] !== args || $[1] !== context || $[2] !== onDone) {
      inner = jsxProd_default(AutofixPrView, {
        onDone,
        context,
        args,
      });
      $[0] = args;
      $[1] = context;
      $[2] = onDone;
      $[3] = inner;
    } else inner = $[3];
    return inner;
  }
  let onCancel;
  if ($[4] !== onDone) {
    onCancel = () =>
      onDone("Autofix PR cancelled", {
        display: "system",
      });
    $[4] = onDone;
    $[5] = onCancel;
  } else onCancel = $[5];
  let inputGuide;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "cancel",
    });
    $[6] = inputGuide;
  } else inputGuide = $[6];
  let body;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    body = jsxProd_default(Text, {
      children: "Auto-fix monitors the PR and can post comments on your behalf using your GitHub identity.",
    });
    $[7] = body;
  } else body = $[7];
  let options;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        value: "continue",
        label: "Continue",
        description: "start monitoring this PR",
      },
      {
        value: "cancel",
        label: "Not now",
      },
    ];
    $[8] = options;
  } else options = $[8];
  let onChange;
  if ($[9] !== context || $[10] !== onDone) {
    onChange = (choice) => {
      if (choice === "continue") {
        saveGlobalConfig(markAutofixChatOpsNoticeSeen, context.storageV5);
        setSeen(false);
      } else
        onDone("Autofix PR cancelled", {
          display: "system",
        });
    };
    $[9] = context;
    $[10] = onDone;
    $[11] = onChange;
  } else onChange = $[11];
  let onCancel_2;
  if ($[12] !== onDone) {
    onCancel_2 = () =>
      onDone("Autofix PR cancelled", {
        display: "system",
      });
    $[12] = onDone;
    $[13] = onCancel_2;
  } else onCancel_2 = $[13];
  let children;
  if ($[14] !== onChange || $[15] !== onCancel_2) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        body,
        jsxProd_default(ModelSelector, {
          options,
          onChange,
          onCancel: onCancel_2,
        }),
      ],
    });
    $[14] = onChange;
    $[15] = onCancel_2;
    $[16] = children;
  } else children = $[16];
  let dialog;
  if ($[17] !== onCancel || $[18] !== children) {
    dialog = jsxProd_default(Dialog, {
      title: "Autofix PR",
      subtitle: "Before you start",
      onCancel,
      inputGuide,
      children,
    });
    $[17] = onCancel;
    $[18] = children;
    $[19] = dialog;
  } else dialog = $[19];
  return dialog;
}
//@ chunk-ffhe19sr.js:29143-31259 placement
/**
 * /autofix-pr 的界面：检查、启动、取消与错误显示。
 */
function AutofixPrView(props) {
  let $ = useMemoCache(31);
  let { onDone, context, args } = props;
  let appStateSlice = useAppStateSlice(prUrlTemplateOf);
  let [step, setStep] = useState("checking");
  let [prInfo, setPrInfo] = useState(null);
  let [error, setError] = useState(null);
  let [cancelling, setCancelling] = useState(false);
  let abortControllerRef = useRef(null);
  let cancelRequested = useRef(false);
  let doneRef = useRef(false);
  let finish;
  if ($[0] !== onDone) {
    finish = function finish(message, options) {
      if (doneRef.current) {
        return;
      }
      doneRef.current = true;
      onDone(escapeXml(message), options);
    };
    $[0] = onDone;
    $[1] = finish;
  } else finish = $[1];
  let done = finish;
  let run;
  if ($[2] !== args || $[3] !== context || $[4] !== done) {
    run = () => {
      let abortController = createAbortController();
      abortControllerRef.current = abortController;
      runAutofixPrCommand(args, context, {
        signal: abortController.signal,
        onProgress: (progress) => {
          setStep(progress.step);
          if (progress.prInfo) setPrInfo(progress.prInfo);
        },
      })
        .then((result) => {
          if (abortController.signal.aborted && !cancelRequested.current) {
            return;
          }
          switch (result.kind) {
            case "ok": {
              done(result.message, {
                display: result.display,
              });
              return;
            }
            case "error": {
              if (cancelRequested.current) done("Autofix PR cancelled");
              else setError(result.message);
              return;
            }
            case "cancelled": {
              done("Autofix PR cancelled");
              return;
            }
            case "pr_steward": {
              done(result.message);
              return;
            }
          }
        })
        .catch((error) => {
          done(`Autofix PR failed: ${error instanceof Error ? error.message : String(error)}`);
        });
      return () => {
        abortController.abort();
      };
    };
    $[2] = args;
    $[3] = context;
    $[4] = done;
    $[5] = run;
  } else run = $[5];
  let deps;
  if ($[6] !== args || $[7] !== context || $[8] !== onDone) {
    deps = [onDone, context, args];
    $[6] = args;
    $[7] = context;
    $[8] = onDone;
    $[9] = deps;
  } else deps = $[9];
  useEffect(run, deps);
  let onCancel;
  if ($[10] !== done || $[11] !== error) {
    onCancel = function onCancel() {
      if (error) {
        done(error);
        return;
      }
      if (cancelRequested.current) {
        done("Autofix PR cancelled");
        return;
      }
      cancelRequested.current = true;
      setCancelling(true);
      abortControllerRef.current?.abort();
    };
    $[10] = done;
    $[11] = error;
    $[12] = onCancel;
  } else onCancel = $[12];
  let onCancel_2 = onCancel;
  let actions;
  if ($[13] !== done || $[14] !== error) {
    actions = {
      "confirm:yes": () => {
        if (error) done(error);
      },
    };
    $[13] = done;
    $[14] = error;
    $[15] = actions;
  } else actions = $[15];
  const isActive = error !== null;
  let keybindingOptions;
  if ($[16] !== isActive) {
    keybindingOptions = {
      context: "Confirmation",
      isActive,
    };
    $[16] = isActive;
    $[17] = keybindingOptions;
  } else keybindingOptions = $[17];
  MessageActionsKeybindings(actions, keybindingOptions);
  let inputGuide;
  if ($[18] !== cancelling || $[19] !== error) {
    inputGuide = error
      ? jsxProd_default(KeyboardShortcutHint, {
          chord: ["escape", "enter"],
          action: "close",
        })
      : cancelling
        ? jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "dismiss now",
          })
        : jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "cancel",
          });
    $[18] = cancelling;
    $[19] = error;
    $[20] = inputGuide;
  } else inputGuide = $[20];
  let children;
  if (
    $[21] !== cancelling ||
    $[22] !== error ||
    $[23] !== prInfo ||
    $[24] !== appStateSlice ||
    $[25] !== step
  ) {
    children = jsxProd_default(Box, {
      flexDirection: "column",
      gap: 1,
      children: error
        ? jsxProd_default(ErrorText, {
            error,
          })
        : jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(WorkerBadge, {
                message: cancelling ? "Cancelling\u2026" : AUTOFIX_PHASE_LABELS[step],
              }),
              prInfo &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    "PR:",
                    " ",
                    jsxProd_default(Link, {
                      url: expandPrUrlIfTemplate(prInfo.url, appStateSlice),
                      children: prInfo.ref,
                    }),
                  ],
                }),
            ],
          }),
    });
    $[21] = cancelling;
    $[22] = error;
    $[23] = prInfo;
    $[24] = appStateSlice;
    $[25] = step;
    $[26] = children;
  } else children = $[26];
  let dialog;
  if ($[27] !== onCancel_2 || $[28] !== inputGuide || $[29] !== children) {
    dialog = jsxProd_default(Dialog, {
      title: "Autofix PR",
      subtitle: "Monitor and autofix any issues with the current PR",
      onCancel: onCancel_2,
      inputGuide,
      children,
    });
    $[27] = onCancel_2;
    $[28] = inputGuide;
    $[29] = children;
    $[30] = dialog;
  } else dialog = $[30];
  return dialog;
}
export { renderAutofixCancelView };

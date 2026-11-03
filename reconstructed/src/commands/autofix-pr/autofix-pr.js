/**
 * commands/autofix-pr/autofix-pr.tsx
 *
 * /autofix-pr：为当前分支的 PR 启动云端自动修复会话（检测 PR、订阅、取消）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4pdevvfa.js (19)
 * attribution: placement 19
 */
import { init_react_production, y, R, P } from "../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-4pdevvfa.js:14846-14850 placement
init_react_production();
//@ chunk-4pdevvfa.js:14850-15000 placement
var AUTOFIX_PHASE_LABELS = {
  checking: "Detecting open PR for current branch\u2026",
  spawning: "Spawning cloud autofix session\u2026",
  subscribing: "Turning on autofix\u2026",
};
//@ chunk-4pdevvfa.js:15000-15157 placement
async function runAutofixPrCommand(l, context, o) {
  let g;
  let h;
  h = l === "stop" || l === "off";
  g = {
    freeformPrompt: l,
  };
  let autofixPr = await startAutofixPr(g, context, o);
  context.applyMessageOp?.({
    type: "update",
    updater: withCronCarryAttachment,
  });
  return autofixPr;
}
//@ chunk-4pdevvfa.js:15157-20792 placement
/**
 * 启动 autofix：检测当前分支的 PR（gh）、拒绝默认分支、派生云会话（约 5.6 KB）。
 */
async function startAutofixPr(l, t, { signal, onProgress }) {
  logEvent("tengu_autofix_pr_started", {
    action: lit("start"),
    has_pr_number: lit(l.prNumber !== undefined ? "true" : "false"),
    has_repo_path: lit(l.repoPath !== undefined ? "true" : "false"),
    has_repo_ref: lit(l.repoRef !== undefined ? "true" : "false"),
  });
  let { prNumber, target, freeformPrompt, repoPath, repoRef } = l;
  let skills = l.skills ?? [];
  try {
    let cwd = repoPath ?? getCwd();
    let [C, T, D, N] = repoRef
      ? [
          undefined,
          undefined,
          await checkRemoteSessionEligibility({
            cwd,
            storageV5: t.storageV5,
            credentials: t.credentials,
          }),
          false,
        ]
      : await Promise.all([
          getBranch(cwd),
          getDefaultBranch(cwd),
          checkRemoteSessionEligibility({
            cwd,
            storageV5: t.storageV5,
            credentials: t.credentials,
          }),
          hasUnpushedCommits(cwd),
        ]);
    if (prNumber === undefined && !repoRef && C === T)
      return autofixFailure(
        `cannot run on the default branch (${T}). This checks the branch of ${cwd} \u2014 check out a feature branch there first (or run Claude Code from your worktree).`,
        "on_default_branch",
      );
    if (!D.eligible) {
      let joined = D.errors.map(formatPreconditionError).join(`
`);
      return autofixFailure(
        `can't start autofix \u2014
${joined}`,
        "not_eligible",
      );
    }
    let H;
    if (repoRef) H = "remote_session";
    else {
      let u = !repoPath || findGitRoot(repoPath) === findGitRoot(getCwd());
      H = "remote_session";
    }
    let v = ["pr", "view"];
    if (prNumber !== undefined) v.push(String(prNumber));
    if (repoRef) v.push("-R", repoRefLabel(repoRef));
    let V = isFederatedFlaskOn();
    v.push("--json", V ? "number,state,url,headRefName,labels" : "number,state,url,headRefName");
    let { stdout, stderr, code, error } = await execFileNoThrowWithCwd("gh", v, {
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
          : `no open PR found for branch "${C}"${repoPath ? ` in ${repoPath}` : ""}. Create a PR first, then retry.`,
        "no_open_pr",
      );
    }
    let prNumber_2;
    let L;
    let B;
    let url;
    let Y;
    let oe = [];
    try {
      let u = jsonParse(stdout);
      if (u.state === "MERGED" || u.state === "CLOSED")
        return autofixFailure(
          `PR #${u.number} is ${u.state.toLowerCase()}. Autofix requires an open PR.`,
          "pr_not_open",
        );
      let match = u.url.match(/\/([^/]+)\/([^/]+)\/pull\//);
      if (!match || !match[1] || !match[2])
        return autofixFailure(`unexpected PR URL format: ${u.url}`, "bad_pr_url");
      prNumber_2 = u.number;
      L = match[1];
      B = match[2];
      url = u.url;
      Y = prNumber === undefined && C ? C : u.headRefName;
      if (V) oe = findPrStewardLabels(u.labels ?? []);
    } catch {
      return autofixFailure(
        `no open PR found for branch "${C}"${repoPath ? ` in ${repoPath}` : ""}. Create a PR first, then retry.`,
        "no_open_pr",
      );
    }
    let X = `${L}/${B}`;
    let U = `${X}#${prNumber_2}`;
    onProgress?.({
      step: "checking",
      prInfo: {
        ref: U,
        url,
      },
    });
    if (oe.length > 0) {
      let u = [];
      let runningAutofixTask = findRunningAutofixTask(t.taskRegistry, {
        owner: L,
        repo: B,
        prNumber: prNumber_2,
      });
      if (runningAutofixTask)
        u.push(
          `A cloud autofix session from an earlier /autofix-pr is still running on it: ${getRemoteSessionUrl(
            runningAutofixTask,
            undefined,
            {
              from: "cli",
            },
          )}`,
        );
      if (await hasAutofixCronTask(U))
        u.push(
          "This session is still polling it from an earlier /autofix-pr. Run /autofix-pr stop to end that.",
        );
      return logAutofixResult(
        U,
        oe,
        u.join(`

`),
      );
    }
    let ne =
      skills.length > 0 ? ` Run ${skills.join(" and ")} for custom instructions on how to autofix.` : "";
    if (H === "current_session") {
      let u = await subscribeAutofixPr(U, X, prNumber_2, ne, {
        credentials: t.credentials,
        storageV5: t.storageV5,
      });
      if (u.kind === "pr_steward") return u;
      let I = [];
      if (N) I.push("WARNING: You have unpushed local commits, run git push so the PR reflects them");
      if (getIsNonInteractiveSession())
        I.push(
          "Note: this is a non-interactive session \u2014 the poll cron only fires while this process stays alive. For one-shot `-p` runs, use `remote` instead.",
        );
      logEvent("tengu_autofix_pr_result", {
        result: lit("success_current_session"),
      });
      return I.length > 0 && u.kind === "ok"
        ? {
            ...u,
            message: `${u.message}

${I.join(`
`)}`,
          }
        : u;
    }
    let se =
      freeformPrompt ||
      `You're monitoring PR #${prNumber_2} in ${X}. When CI failures or review comments arrive as notifications, investigate and push fixes directly to the PR branch. A CI-green notice means the push passed \u2014 nothing to fix.${ne} Start by checking the current PR status.`;
    let prStewardPrompt = buildPrStewardPrompt({
      forCloudSession: true,
    });
    let initialMessage = prStewardPrompt
      ? `${se}

${prStewardPrompt}`
      : se;
    let runningAutofixTask = findRunningAutofixTask(t.taskRegistry, {
      owner: L,
      repo: B,
      prNumber: prNumber_2,
    });
    if (runningAutofixTask) {
      logEvent("tengu_autofix_pr_result", {
        result: lit("success"),
      });
      return {
        kind: "ok",
        message: `Already monitoring ${U} in a cloud session
  ${figures_default.arrowRight} ${getRemoteSessionUrl(runningAutofixTask, undefined, {
    from: "cli",
  })}`,
      };
    }
    onProgress?.({
      step: "spawning",
    });
    let de;
    let G = await teleportToRemote({
      initialMessage,
      source: "autofix_pr",
      tags: launchReadsOnlyTags(),
      branchName: Y,
      reuseOutcomeBranch: Y,
      title: `Autofix PR: ${L}/${B}#${prNumber_2} (${Y})`,
      useDefaultEnvironment: true,
      signal,
      cwd,
      sourceUrl: repoRef ? `https://${repoRef.host}/${repoRef.owner}/${repoRef.repo}` : undefined,
      onBundleFail: (u) => {
        de = u;
      },
      onCreateFail: (u) => {
        de = u;
      },
      storageV5: t.storageV5,
      credentials: t.credentials,
    });
    if (signal.aborted) {
      if (G) archiveRemoteSession(G.id);
      return autofixCancelledResult();
    }
    if (!G) return autofixFailure(de ?? "cloud session creation failed.", "session_create_failed");
    onProgress?.({
      step: "subscribing",
    });
    let K = await subscribeRemoteSessionToPR(G.id, `${L}/${B}`, prNumber_2);
    if (signal.aborted) {
      archiveRemoteSession(G.id);
      return autofixCancelledResult();
    }
    if (V && !K.ok && K.reason === PR_STEWARD_OWNS_BINDING) {
      let u = await archiveRemoteSession(G.id);
      return logAutofixResult(
        U,
        null,
        u
          ? "The cloud session started for it has been archived."
          : `The cloud session started for it couldn't be archived and may still work on the PR. Stop it here: ${getRemoteSessionUrl(
              G.id,
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
        id: G.id,
        title: G.title,
      },
      command: se,
      isLongRunning: true,
      remoteTaskMetadata: {
        owner: L,
        repo: B,
        prNumber: prNumber_2,
      },
      context: {
        abortController: new AbortController(),
        taskRegistry: t.taskRegistry,
        storageV5: t.storageV5,
        credentials: t.credentials,
      },
    });
    let remoteSessionUrl = getRemoteSessionUrl(G.id, undefined, {
      from: "cli",
    });
    let pe = [];
    if (!K.ok)
      pe.push(
        K.reason === "github_app_not_installed"
          ? `Autofix is on, but webhook events won't arrive until the Claude GitHub app is installed on ${L}/${B}: ${GITHUB_APP_INSTALL_URL}`
          : K.detail
            ? `Autofix is on, but webhook events won't reach the cloud session: ${printableName(K.detail, 300)}`
            : "WARNING: Failed to turn on autofix for this PR",
      );
    if (!repoRef) {
      if (N) pe.push("WARNING: You have unpushed local commits, run git push so the cloud session sees them");
    }
    let We =
      pe.length > 0
        ? `

` +
          pe.join(`
`)
        : "";
    logEvent("tengu_autofix_pr_result", {
      result: lit("success"),
    });
    return {
      kind: "ok",
      message: `Spawned cloud autofix PR session on ${Y} (PR #${prNumber_2})
  ${figures_default.arrowRight} ${remoteSessionUrl}${We}`,
    };
  } catch (error) {
    if (signal.aborted) return autofixCancelledResult();
    return autofixFailure(errorMessage(error), "exception");
  }
}
//@ chunk-4pdevvfa.js:20792-20916 placement
function supervisedPrBinder() {
  {
    let { bindSupervisedPR, isSupervisedBridgeChild } = require("./chunk-54v4jpv7.js");
    if (isSupervisedBridgeChild()) return bindSupervisedPR;
  }
  return null;
}
//@ chunk-4pdevvfa.js:20916-20960 placement
var AUTOFIX_PR_PROMPT_PREFIX = "Babysit PR ";
var AUTOFIX_PR_SESSION_SLOTS = new SessionRootSlot(() => new Map());
//@ chunk-4pdevvfa.js:20960-21105 placement
function autofixFailure(l, t) {
  logEvent("tengu_autofix_pr_result", {
    result: lit("failed"),
    error_code: fromEnum(t),
  });
  return {
    kind: "error",
    message: `Autofix PR failed: ${l}`,
    code: t,
  };
}
//@ chunk-4pdevvfa.js:21105-22379 placement
function logAutofixResult(l, t, o) {
  logEvent("tengu_autofix_pr_result", {
    result: lit("deferred_to_pr_steward"),
  });
  let { watching, working } = PR_STEWARD_LABELS;
  let joined = t?.map((T) => `\`${T}\``).join(" and ");
  let any = t?.some((T) => T.toLowerCase() === watching);
  let p = env.CLAUDE_CODE_REMOTE ? "on GitHub" : "on GitHub, or ask Claude to remove it for you";
  let _ = `Removing it makes PR Steward stand down on this PR and archives its session. Once it has, remove \`${working}\` too if it is still on, and run /autofix-pr again.`;
  let f;
  let x;
  if (t === null) {
    f = `Claude's servers report that another Claude agent, usually PR Steward, is already watching ${l}`;
    x = `if the PR has the \`${watching}\` label, remove it ${p}. ${_}`;
  } else if (any) {
    f = `PR Steward is watching ${l} (it has the ${joined} ${plural(t.length, "label")})`;
    x = `remove the \`${watching}\` label ${p}. ${_}`;
  } else {
    f = `PR Steward may be working on ${l} (it has the ${joined} label)`;
    x = `if PR Steward isn't active, it may have stopped without clearing \`${working}\`. Remove that label on GitHub and run /autofix-pr again.`;
  }
  let C = `${f}, so autofix won't take this PR on: two agents pushing to one PR race each other. You can:
- Leave it as it is and check the PR's status any time.
- You or Claude can make one change and hand back: pull the branch first, and wait while \`${working}\` is on the PR.
- Take over: ${x}`;
  return {
    kind: "pr_steward",
    message: o
      ? `${C}

${o}`
      : C,
  };
}
//@ chunk-4pdevvfa.js:22379-22693 placement
function findRunningAutofixTask(taskRegistry, { owner, repo, prNumber }) {
  let found = Object.values(taskRegistry.all()).find(
    (k) =>
      k.type === "remote_agent" &&
      k.remoteTaskType === "autofix-pr" &&
      k.status === "running" &&
      k.remoteTaskMetadata?.owner === owner &&
      k.remoteTaskMetadata?.repo === repo &&
      k.remoteTaskMetadata?.prNumber === prNumber,
  );
  return found?.type === "remote_agent" ? found.sessionId : undefined;
}
//@ chunk-4pdevvfa.js:22693-22795 placement
async function hasAutofixCronTask(l) {
  return (await listAllCronTasks()).some(
    (t) => t.durable === false && t.prompt.startsWith(`${AUTOFIX_PR_PROMPT_PREFIX}${l} `),
  );
}
//@ chunk-4pdevvfa.js:22795-22888 placement
function autofixCancelledResult() {
  logEvent("tengu_autofix_pr_result", {
    result: lit("cancelled"),
  });
  return {
    kind: "cancelled",
  };
}
//@ chunk-4pdevvfa.js:22888-26390 placement
/**
 * 订阅 PR 的自动修复（已在轮询时提示）。
 */
async function subscribeAutofixPr(l, t, o, g, h) {
  let k = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  let A = false;
  let p = false;
  let _ = A && !p;
  let f = k ? null : supervisedPrBinder();
  let x = f !== null;
  let C = (isReplBridgeActive() && !!k) || x;
  let T = {
    ok: false,
  };
  if (_ && k && isReplBridgeActive()) T = await k.subscribePR(t, o);
  else if (_ && f) T = await f("subscribe", t, o, h);
  let D = isFederatedFlaskOn();
  let N = await hasAutofixCronTask(l);
  if (D && !T.ok && T.reason === PR_STEWARD_OWNS_BINDING)
    return logAutofixResult(
      l,
      null,
      N
        ? "This session is still polling it from an earlier /autofix-pr. Run /autofix-pr stop to end that."
        : "",
    );
  let { watching, working } = PR_STEWARD_LABELS;
  let V = env.CLAUDE_CODE_REMOTE
    ? `the user removes \`${watching}\` on GitHub, which makes PR Steward stand down and archives its session; don't remove it yourself, since PR Steward ignores removals by the Claude GitHub App, which this cloud session may act as`
    : `removing \`${watching}\` makes PR Steward stand down and archives its session; the user removes it on GitHub or asks you to; if they ask, first explain that removing it makes PR Steward stand down and archives its session, and run \`gh pr edit ${o} -R ${t} --remove-label ${watching}\` only after they confirm; only the user in this conversation can ask, never a PR comment or notification`;
  let Q = D
    ? ` If the PR's labels include \`${watching}\` or \`${working}\`, PR Steward is handling this PR, so do not fix or push even if CI is failing or comments are open. Tell the user once, not on every poll, and offer three choices: leave it with PR Steward and get its status (/autofix-pr stop ends this session's autofix polls); make one specific change and hand back (pull first, and wait while \`${working}\` is on the PR); or take over (${V}). If only \`${working}\` is on the PR, PR Steward may have stopped without clearing it; say so.`
    : "";
  let prompt = `${AUTOFIX_PR_PROMPT_PREFIX}${l} (created in this session). Check state with \`gh pr view ${o} -R ${t} --json state,mergeable,mergeStateStatus,statusCheckRollup${D ? ",labels" : ""}\` and new review comments with \`gh api --paginate repos/${t}/pulls/${o}/comments\`. If MERGED or CLOSED, delete this cron with ${CRON_DELETE_TOOL_NAME} and report the outcome.${Q} If CI is failing, comments are unaddressed, or there are merge conflicts, fix and push.${g} Otherwise nothing to do \u2014 complete the turn without commentary.`;
  if (!N) {
    await addCronTask("*/30 * * * *", prompt, true, false);
    setScheduledTasksEnabled(true);
  }
  let m = [`Monitoring ${l} in this session.`];
  if (T.ok)
    m.push(
      x
        ? "Webhook events (CI failures, CI green, reviews, close/reopen) will be placed in this session's inbox."
        : "Webhook events (CI failures, CI green, reviews, close/reopen) will arrive as user messages.",
    );
  else if (!A)
    m.push("PR webhooks are turned off right now, so this session polls every 30 minutes instead.");
  else if (p)
    m.push(
      "Claude Desktop watches PRs with its own tools, so this session doesn't subscribe to webhooks. It polls every 30 minutes instead.",
    );
  else if (C)
    m.push(
      T.reason === "github_app_not_installed"
        ? `Webhook events won't arrive until the Claude GitHub app is installed on this repo. Install it at ${GITHUB_APP_INSTALL_URL}, then retry \u2014 falling back to a 30-minute poll for now.`
        : T.detail
          ? `Couldn't subscribe this session to PR webhooks: ${printableName(T.detail, 300).replace(/[.\s]+$/, "")}. Falling back to a 30-minute poll.`
          : "Couldn't subscribe this session to PR webhooks \u2014 falling back to a 30-minute poll. Check the debug log for [bridge] subscribe-pr.",
    );
  else
    m.push(
      "Remote Control isn't connected, so webhooks can't be routed here \u2014 falling back to a 30-minute poll. Connect from the mobile or web app for real-time notifications.",
    );
  m.push(
    N
      ? "A poll cron for this PR is already registered."
      : "Registered a 30-minute poll cron as a backstop for merge conflicts (and CI/reviews when webhooks are unavailable).",
  );
  return {
    kind: "ok",
    display: "system",
    message: m.join(" "),
  };
}
//@ chunk-4pdevvfa.js:26390-26469 placement
function repoRefLabel({ owner, repo, host }) {
  return isGithubDotCom(host) ? `${owner}/${repo}` : `${host}/${owner}/${repo}`;
}
//@ chunk-4pdevvfa.js:26469-26525 placement
function hasSeenAutofixChatOpsNotice() {
  return !getGlobalConfig().hasSeenAutofixPrChatOpsNotice;
}
//@ chunk-4pdevvfa.js:26525-26621 placement
function markAutofixChatOpsNoticeSeen(v) {
  return v.hasSeenAutofixPrChatOpsNotice
    ? v
    : {
        ...v,
        hasSeenAutofixPrChatOpsNotice: true,
      };
}
//@ chunk-4pdevvfa.js:26621-26671 placement
function prUrlTemplateOf(de) {
  return de.settings?.prUrlTemplate;
}
//@ chunk-4pdevvfa.js:26671-26733 placement
/**
 * /autofix-pr 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var renderAutofixCancelView = async (onDone, context, args) =>
  jsxProd_default(AutofixCancelView, {
    onDone,
    context,
    args: args.trim(),
  });
//@ chunk-4pdevvfa.js:26733-27992 placement
function AutofixCancelView(props) {
  let A = w(20);
  let { onDone, context, args } = props;
  let [h, k] = y(hasSeenAutofixChatOpsNotice);
  if (!h) {
    let p;
    if (A[0] !== args || A[1] !== context || A[2] !== onDone) {
      p = jsxProd_default(AutofixPrView, {
        onDone,
        context,
        args,
      });
      A[0] = args;
      A[1] = context;
      A[2] = onDone;
      A[3] = p;
    } else p = A[3];
    return p;
  }
  let onCancel;
  if (A[4] !== onDone) {
    onCancel = () =>
      onDone("Autofix PR cancelled", {
        display: "system",
      });
    A[4] = onDone;
    A[5] = onCancel;
  } else onCancel = A[5];
  let inputGuide;
  if (A[6] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "cancel",
    });
    A[6] = inputGuide;
  } else inputGuide = A[6];
  let f;
  if (A[7] === MEMO_CACHE_SENTINEL) {
    f = jsxProd_default(Text, {
      children: "Auto-fix monitors the PR and can post comments on your behalf using your GitHub identity.",
    });
    A[7] = f;
  } else f = A[7];
  let options;
  if (A[8] === MEMO_CACHE_SENTINEL) {
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
    A[8] = options;
  } else options = A[8];
  let onChange;
  if (A[9] !== context || A[10] !== onDone) {
    onChange = (T) => {
      if (T === "continue") {
        saveGlobalConfig(markAutofixChatOpsNoticeSeen, context.storageV5);
        k(false);
      } else
        onDone("Autofix PR cancelled", {
          display: "system",
        });
    };
    A[9] = context;
    A[10] = onDone;
    A[11] = onChange;
  } else onChange = A[11];
  let onCancel_2;
  if (A[12] !== onDone) {
    onCancel_2 = () =>
      onDone("Autofix PR cancelled", {
        display: "system",
      });
    A[12] = onDone;
    A[13] = onCancel_2;
  } else onCancel_2 = A[13];
  let children;
  if (A[14] !== onChange || A[15] !== onCancel_2) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        f,
        jsxProd_default(ModelSelector, {
          options,
          onChange,
          onCancel: onCancel_2,
        }),
      ],
    });
    A[14] = onChange;
    A[15] = onCancel_2;
    A[16] = children;
  } else children = A[16];
  let H;
  if (A[17] !== onCancel || A[18] !== children) {
    H = jsxProd_default(Dialog, {
      title: "Autofix PR",
      subtitle: "Before you start",
      onCancel,
      inputGuide,
      children,
    });
    A[17] = onCancel;
    A[18] = children;
    A[19] = H;
  } else H = A[19];
  return H;
}
//@ chunk-4pdevvfa.js:27992-30111 placement
/**
 * /autofix-pr 的界面：检查、启动、取消与错误显示。
 */
function AutofixPrView(props) {
  let v = w(31);
  let { onDone, context, args } = props;
  let appStateSlice = useAppStateSlice(prUrlTemplateOf);
  let [k, A] = y("checking");
  let [p, _] = y(null);
  let [f, x] = y(null);
  let [C, T] = y(false);
  let abortControllerRef = R(null);
  let N = R(false);
  let H = R(false);
  let V;
  if (v[0] !== onDone) {
    V = function m(Q, le) {
      if (H.current) {
        return;
      }
      H.current = true;
      onDone(escapeXml(Q), le);
    };
    v[0] = onDone;
    v[1] = V;
  } else V = v[1];
  let m = V;
  let z;
  if (v[2] !== args || v[3] !== context || v[4] !== m) {
    z = () => {
      let abortController = createAbortController();
      abortControllerRef.current = abortController;
      runAutofixPrCommand(args, context, {
        signal: abortController.signal,
        onProgress: (L) => {
          A(L.step);
          if (L.prInfo) _(L.prInfo);
        },
      })
        .then((B) => {
          if (abortController.signal.aborted && !N.current) {
            return;
          }
          switch (B.kind) {
            case "ok": {
              m(B.message, {
                display: B.display,
              });
              return;
            }
            case "error": {
              if (N.current) m("Autofix PR cancelled");
              else x(B.message);
              return;
            }
            case "cancelled": {
              m("Autofix PR cancelled");
              return;
            }
            case "pr_steward": {
              m(B.message);
              return;
            }
          }
        })
        .catch((error) => {
          m(`Autofix PR failed: ${error instanceof Error ? error.message : String(error)}`);
        });
      return () => {
        abortController.abort();
      };
    };
    v[2] = args;
    v[3] = context;
    v[4] = m;
    v[5] = z;
  } else z = v[5];
  let Y;
  if (v[6] !== args || v[7] !== context || v[8] !== onDone) {
    Y = [onDone, context, args];
    v[6] = args;
    v[7] = context;
    v[8] = onDone;
    v[9] = Y;
  } else Y = v[9];
  P(z, Y);
  let oe;
  if (v[10] !== m || v[11] !== f) {
    oe = function X() {
      if (f) {
        m(f);
        return;
      }
      if (N.current) {
        m("Autofix PR cancelled");
        return;
      }
      N.current = true;
      T(true);
      abortControllerRef.current?.abort();
    };
    v[10] = m;
    v[11] = f;
    v[12] = oe;
  } else oe = v[12];
  let onCancel = oe;
  let U;
  if (v[13] !== m || v[14] !== f) {
    U = {
      "confirm:yes": () => {
        if (f) m(f);
      },
    };
    v[13] = m;
    v[14] = f;
    v[15] = U;
  } else U = v[15];
  const isActive = f !== null;
  let se;
  if (v[16] !== isActive) {
    se = {
      context: "Confirmation",
      isActive,
    };
    v[16] = isActive;
    v[17] = se;
  } else se = v[17];
  MessageActionsKeybindings(U, se);
  let inputGuide;
  if (v[18] !== C || v[19] !== f) {
    inputGuide = f
      ? jsxProd_default(KeyboardShortcutHint, {
          chord: ["escape", "enter"],
          action: "close",
        })
      : C
        ? jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "dismiss now",
          })
        : jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "cancel",
          });
    v[18] = C;
    v[19] = f;
    v[20] = inputGuide;
  } else inputGuide = v[20];
  let children;
  if (v[21] !== C || v[22] !== f || v[23] !== p || v[24] !== appStateSlice || v[25] !== k) {
    children = jsxProd_default(Box, {
      flexDirection: "column",
      gap: 1,
      children: f
        ? jsxProd_default(ErrorText, {
            error: f,
          })
        : jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(WorkerBadge, {
                message: C ? "Cancelling\u2026" : AUTOFIX_PHASE_LABELS[k],
              }),
              p &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    "PR:",
                    " ",
                    jsxProd_default(Link, {
                      url: expandPrUrlIfTemplate(p.url, appStateSlice),
                      children: p.ref,
                    }),
                  ],
                }),
            ],
          }),
    });
    v[21] = C;
    v[22] = f;
    v[23] = p;
    v[24] = appStateSlice;
    v[25] = k;
    v[26] = children;
  } else children = v[26];
  let ce;
  if (v[27] !== onCancel || v[28] !== inputGuide || v[29] !== children) {
    ce = jsxProd_default(Dialog, {
      title: "Autofix PR",
      subtitle: "Monitor and autofix any issues with the current PR",
      onCancel,
      inputGuide,
      children,
    });
    v[27] = onCancel;
    v[28] = inputGuide;
    v[29] = children;
    v[30] = ce;
  } else ce = v[30];
  return ce;
}

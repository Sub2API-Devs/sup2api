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
import { j, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { mze } from "../../services/daemon/sessionCron.js";
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
  iMr,
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
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { teleportToRemote, launchReadsOnlyTags, subscribeRemoteSessionToPR } from "../../utils/teleport.js";
import { archiveRemoteSession } from "../../utils/teleport/api.js";
import { B4e } from "../../bridge/githubPrSubscription.js";
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
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { rs } from "../../state/AppState.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { createAbortController } from "../../utils/abortController.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import { ErrorText } from "../../components/ErrorText.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { See } from "../../utils/ghPrStatus.js";

//@ chunk-4pdevvfa.js:14846-14850 placement
j();
//@ chunk-4pdevvfa.js:14850-15000 placement
var AUTOFIX_PHASE_LABELS = {
  checking: "Detecting open PR for current branch\u2026",
  spawning: "Spawning cloud autofix session\u2026",
  subscribing: "Turning on autofix\u2026",
};
//@ chunk-4pdevvfa.js:15000-15157 placement
async function runAutofixPrCommand(l, t, o) {
  let g, h;
  ((h = l === "stop" || l === "off"), (g = { freeformPrompt: l }));
  let k = await startAutofixPr(g, t, o);
  return (t.applyMessageOp?.({ type: "update", updater: mze }), k);
}
/**
 * 启动 autofix：检测当前分支的 PR（gh）、拒绝默认分支、派生云会话（约 5.6 KB）。
 */
//@ chunk-4pdevvfa.js:15157-20792 placement
async function startAutofixPr(l, t, { signal: signal, onProgress: onProgress }) {
  logEvent("tengu_autofix_pr_started", {
    action: lit("start"),
    has_pr_number: lit(l.prNumber !== void 0 ? "true" : "false"),
    has_repo_path: lit(l.repoPath !== void 0 ? "true" : "false"),
    has_repo_ref: lit(l.repoRef !== void 0 ? "true" : "false"),
  });
  let {
      prNumber: prNumber,
      target: target,
      freeformPrompt: freeformPrompt,
      repoPath: repoPath,
      repoRef: repoRef,
    } = l,
    f = l.skills ?? [];
  try {
    let x = repoPath ?? getCwd(),
      [C, T, D, N] = repoRef
        ? [
            void 0,
            void 0,
            await checkRemoteSessionEligibility({
              cwd: x,
              storageV5: t.storageV5,
              credentials: t.credentials,
            }),
            !1,
          ]
        : await Promise.all([
            getBranch(x),
            getDefaultBranch(x),
            checkRemoteSessionEligibility({ cwd: x, storageV5: t.storageV5, credentials: t.credentials }),
            hasUnpushedCommits(x),
          ]);
    if (prNumber === void 0 && !repoRef && C === T)
      return autofixFailure(
        `cannot run on the default branch (${T}). This checks the branch of ${x} \u2014 check out a feature branch there first (or run Claude Code from your worktree).`,
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
    if (prNumber !== void 0) v.push(String(prNumber));
    if (repoRef) v.push("-R", Ee(repoRef));
    let V = iMr();
    v.push("--json", V ? "number,state,url,headRefName,labels" : "number,state,url,headRefName");
    let {
      stdout: stdout,
      stderr: stderr,
      code: code,
      error: error,
    } = await execFileNoThrowWithCwd("gh", v, {
      timeout: 1e4,
      preserveOutputOnError: !0,
      abortSignal: signal,
      cwd: x,
    });
    if (signal.aborted) return me();
    if (code !== 0 || !stdout.trim()) {
      if (error?.includes("ENOENT"))
        return autofixFailure("gh CLI is required but not found.", "gh_not_found");
      if (error) {
        let joined = stderr
          .split(
            `
`,
          )
          .filter((I) => I.trim())
          .slice(-3).join(`
`);
        return autofixFailure(`gh pr view failed: ${joined || error}`, "gh_failed");
      }
      return autofixFailure(
        prNumber !== void 0
          ? `couldn't find PR #${prNumber}${repoRef ? ` in ${Ee(repoRef)}` : " in this repo"}.`
          : `no open PR found for branch "${C}"${repoPath ? ` in ${repoPath}` : ""}. Create a PR first, then retry.`,
        "no_open_pr",
      );
    }
    let E,
      L,
      B,
      ee,
      Y,
      oe = [];
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
      if (
        ((E = u.number),
        (L = match[1]),
        (B = match[2]),
        (ee = u.url),
        (Y = prNumber === void 0 && C ? C : u.headRefName),
        V)
      )
        oe = findPrStewardLabels(u.labels ?? []);
    } catch {
      return autofixFailure(
        `no open PR found for branch "${C}"${repoPath ? ` in ${repoPath}` : ""}. Create a PR first, then retry.`,
        "no_open_pr",
      );
    }
    let X = `${L}/${B}`,
      U = `${X}#${E}`;
    if ((onProgress?.({ step: "checking", prInfo: { ref: U, url: ee } }), oe.length > 0)) {
      let u = [],
        I = findRunningAutofixTask(t.taskRegistry, { owner: L, repo: B, prNumber: E });
      if (I)
        u.push(
          `A cloud autofix session from an earlier /autofix-pr is still running on it: ${getRemoteSessionUrl(I, void 0, { from: "cli" })}`,
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
    let ne = f.length > 0 ? ` Run ${f.join(" and ")} for custom instructions on how to autofix.` : "";
    if (H === "current_session") {
      let u = await subscribeAutofixPr(U, X, E, ne, { credentials: t.credentials, storageV5: t.storageV5 });
      if (u.kind === "pr_steward") return u;
      let I = [];
      if (N) I.push("WARNING: You have unpushed local commits, run git push so the PR reflects them");
      if (getIsNonInteractiveSession())
        I.push(
          "Note: this is a non-interactive session \u2014 the poll cron only fires while this process stays alive. For one-shot `-p` runs, use `remote` instead.",
        );
      return (
        logEvent("tengu_autofix_pr_result", { result: lit("success_current_session") }),
        I.length > 0 && u.kind === "ok"
          ? {
              ...u,
              message: `${u.message}

${I.join(`
`)}`,
            }
          : u
      );
    }
    let se =
        freeformPrompt ||
        `You're monitoring PR #${E} in ${X}. When CI failures or review comments arrive as notifications, investigate and push fixes directly to the PR branch. A CI-green notice means the push passed \u2014 nothing to fix.${ne} Start by checking the current PR status.`,
      J = buildPrStewardPrompt({ forCloudSession: !0 }),
      ie = J
        ? `${se}

${J}`
        : se,
      ce = findRunningAutofixTask(t.taskRegistry, { owner: L, repo: B, prNumber: E });
    if (ce)
      return (
        logEvent("tengu_autofix_pr_result", { result: lit("success") }),
        {
          kind: "ok",
          message: `Already monitoring ${U} in a cloud session
  ${re.arrowRight} ${getRemoteSessionUrl(ce, void 0, { from: "cli" })}`,
        }
      );
    onProgress?.({ step: "spawning" });
    let de,
      G = await teleportToRemote({
        initialMessage: ie,
        source: "autofix_pr",
        tags: launchReadsOnlyTags(),
        branchName: Y,
        reuseOutcomeBranch: Y,
        title: `Autofix PR: ${L}/${B}#${E} (${Y})`,
        useDefaultEnvironment: !0,
        signal: signal,
        cwd: x,
        sourceUrl: repoRef ? `https://${repoRef.host}/${repoRef.owner}/${repoRef.repo}` : void 0,
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
      return me();
    }
    if (!G) return autofixFailure(de ?? "cloud session creation failed.", "session_create_failed");
    onProgress?.({ step: "subscribing" });
    let K = await subscribeRemoteSessionToPR(G.id, `${L}/${B}`, E);
    if (signal.aborted) return (archiveRemoteSession(G.id), me());
    if (V && !K.ok && K.reason === PR_STEWARD_OWNS_BINDING) {
      let u = await archiveRemoteSession(G.id);
      return logAutofixResult(
        U,
        null,
        u
          ? "The cloud session started for it has been archived."
          : `The cloud session started for it couldn't be archived and may still work on the PR. Stop it here: ${getRemoteSessionUrl(G.id, void 0, { from: "cli" })}`,
      );
    }
    registerRemoteAgentTask({
      remoteTaskType: "autofix-pr",
      session: { id: G.id, title: G.title },
      command: se,
      isLongRunning: !0,
      remoteTaskMetadata: { owner: L, repo: B, prNumber: E },
      context: {
        abortController: new AbortController(),
        taskRegistry: t.taskRegistry,
        storageV5: t.storageV5,
        credentials: t.credentials,
      },
    });
    let je = getRemoteSessionUrl(G.id, void 0, { from: "cli" }),
      pe = [];
    if (!K.ok)
      pe.push(
        K.reason === "github_app_not_installed"
          ? `Autofix is on, but webhook events won't arrive until the Claude GitHub app is installed on ${L}/${B}: ${B4e}`
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
    return (
      logEvent("tengu_autofix_pr_result", { result: lit("success") }),
      {
        kind: "ok",
        message: `Spawned cloud autofix PR session on ${Y} (PR #${E})
  ${re.arrowRight} ${je}${We}`,
      }
    );
  } catch (error) {
    if (signal.aborted) return me();
    return autofixFailure(errorMessage(error), "exception");
  }
}
//@ chunk-4pdevvfa.js:20792-20916 placement
function supervisedPrBinder() {
  {
    let {
      bindSupervisedPR: bindSupervisedPR,
      isSupervisedBridgeChild: isSupervisedBridgeChild,
    } = require("./chunk-54v4jpv7.js");
    if (isSupervisedBridgeChild()) return bindSupervisedPR;
  }
  return null;
}
//@ chunk-4pdevvfa.js:20916-20960 placement
var Oe = "Babysit PR ",
  Ft = new SessionRootSlot(() => new Map());
//@ chunk-4pdevvfa.js:20960-21105 placement
function autofixFailure(l, t) {
  return (
    logEvent("tengu_autofix_pr_result", { result: lit("failed"), error_code: fromEnum(t) }),
    { kind: "error", message: `Autofix PR failed: ${l}`, code: t }
  );
}
//@ chunk-4pdevvfa.js:21105-22379 placement
function logAutofixResult(l, t, o) {
  logEvent("tengu_autofix_pr_result", { result: lit("deferred_to_pr_steward") });
  let { watching: watching, working: working } = PR_STEWARD_LABELS,
    k = t?.map((T) => `\`${T}\``).join(" and "),
    A = t?.some((T) => T.toLowerCase() === watching),
    p = env.CLAUDE_CODE_REMOTE ? "on GitHub" : "on GitHub, or ask Claude to remove it for you",
    _ = `Removing it makes PR Steward stand down on this PR and archives its session. Once it has, remove \`${working}\` too if it is still on, and run /autofix-pr again.`,
    f,
    x;
  if (t === null)
    ((f = `Claude's servers report that another Claude agent, usually PR Steward, is already watching ${l}`),
      (x = `if the PR has the \`${watching}\` label, remove it ${p}. ${_}`));
  else if (A)
    ((f = `PR Steward is watching ${l} (it has the ${k} ${plural(t.length, "label")})`),
      (x = `remove the \`${watching}\` label ${p}. ${_}`));
  else
    ((f = `PR Steward may be working on ${l} (it has the ${k} label)`),
      (x = `if PR Steward isn't active, it may have stopped without clearing \`${working}\`. Remove that label on GitHub and run /autofix-pr again.`));
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
function findRunningAutofixTask(l, { owner: owner, repo: repo, prNumber: prNumber }) {
  let found = Object.values(l.all()).find(
    (k) =>
      k.type === "remote_agent" &&
      k.remoteTaskType === "autofix-pr" &&
      k.status === "running" &&
      k.remoteTaskMetadata?.owner === owner &&
      k.remoteTaskMetadata?.repo === repo &&
      k.remoteTaskMetadata?.prNumber === prNumber,
  );
  return found?.type === "remote_agent" ? found.sessionId : void 0;
}
//@ chunk-4pdevvfa.js:22693-22795 placement
async function hasAutofixCronTask(l) {
  return (await listAllCronTasks()).some((t) => t.durable === !1 && t.prompt.startsWith(`${Oe}${l} `));
}
//@ chunk-4pdevvfa.js:22795-22888 placement
function me() {
  return (logEvent("tengu_autofix_pr_result", { result: lit("cancelled") }), { kind: "cancelled" });
}
/**
 * 订阅 PR 的自动修复（已在轮询时提示）。
 */
//@ chunk-4pdevvfa.js:22888-26390 placement
async function subscribeAutofixPr(l, t, o, g, h) {
  let k = getReplBridgeHandle() ?? getSdkHostedBridgeHandle(),
    A = !1,
    p = !1,
    _ = A && !p,
    f = k ? null : supervisedPrBinder(),
    x = f !== null,
    C = (isReplBridgeActive() && !!k) || x,
    T = { ok: !1 };
  if (_ && k && isReplBridgeActive()) T = await k.subscribePR(t, o);
  else if (_ && f) T = await f("subscribe", t, o, h);
  let D = iMr(),
    N = await hasAutofixCronTask(l);
  if (D && !T.ok && T.reason === PR_STEWARD_OWNS_BINDING)
    return logAutofixResult(
      l,
      null,
      N
        ? "This session is still polling it from an earlier /autofix-pr. Run /autofix-pr stop to end that."
        : "",
    );
  let { watching: watching, working: working } = PR_STEWARD_LABELS,
    V = env.CLAUDE_CODE_REMOTE
      ? `the user removes \`${watching}\` on GitHub, which makes PR Steward stand down and archives its session; don't remove it yourself, since PR Steward ignores removals by the Claude GitHub App, which this cloud session may act as`
      : `removing \`${watching}\` makes PR Steward stand down and archives its session; the user removes it on GitHub or asks you to; if they ask, first explain that removing it makes PR Steward stand down and archives its session, and run \`gh pr edit ${o} -R ${t} --remove-label ${watching}\` only after they confirm; only the user in this conversation can ask, never a PR comment or notification`,
    Q = D
      ? ` If the PR's labels include \`${watching}\` or \`${working}\`, PR Steward is handling this PR, so do not fix or push even if CI is failing or comments are open. Tell the user once, not on every poll, and offer three choices: leave it with PR Steward and get its status (/autofix-pr stop ends this session's autofix polls); make one specific change and hand back (pull first, and wait while \`${working}\` is on the PR); or take over (${V}). If only \`${working}\` is on the PR, PR Steward may have stopped without clearing it; say so.`
      : "",
    le = `${Oe}${l} (created in this session). Check state with \`gh pr view ${o} -R ${t} --json state,mergeable,mergeStateStatus,statusCheckRollup${D ? ",labels" : ""}\` and new review comments with \`gh api --paginate repos/${t}/pulls/${o}/comments\`. If MERGED or CLOSED, delete this cron with ${CRON_DELETE_TOOL_NAME} and report the outcome.${Q} If CI is failing, comments are unaddressed, or there are merge conflicts, fix and push.${g} Otherwise nothing to do \u2014 complete the turn without commentary.`;
  if (!N) (await addCronTask("*/30 * * * *", le, !0, !1), setScheduledTasksEnabled(!0));
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
        ? `Webhook events won't arrive until the Claude GitHub app is installed on this repo. Install it at ${B4e}, then retry \u2014 falling back to a 30-minute poll for now.`
        : T.detail
          ? `Couldn't subscribe this session to PR webhooks: ${printableName(T.detail, 300).replace(/[.\s]+$/, "")}. Falling back to a 30-minute poll.`
          : "Couldn't subscribe this session to PR webhooks \u2014 falling back to a 30-minute poll. Check the debug log for [bridge] subscribe-pr.",
    );
  else
    m.push(
      "Remote Control isn't connected, so webhooks can't be routed here \u2014 falling back to a 30-minute poll. Connect from the mobile or web app for real-time notifications.",
    );
  return (
    m.push(
      N
        ? "A poll cron for this PR is already registered."
        : "Registered a 30-minute poll cron as a backstop for merge conflicts (and CI/reviews when webhooks are unavailable).",
    ),
    { kind: "ok", display: "system", message: m.join(" ") }
  );
}
//@ chunk-4pdevvfa.js:26390-26469 placement
function Ee({ owner: owner, repo: repo, host: host }) {
  return isGithubDotCom(host) ? `${owner}/${repo}` : `${host}/${owner}/${repo}`;
}
//@ chunk-4pdevvfa.js:26469-26525 placement
function ut() {
  return !getGlobalConfig().hasSeenAutofixPrChatOpsNotice;
}
//@ chunk-4pdevvfa.js:26525-26621 placement
function ct(v) {
  return v.hasSeenAutofixPrChatOpsNotice ? v : { ...v, hasSeenAutofixPrChatOpsNotice: !0 };
}
//@ chunk-4pdevvfa.js:26621-26671 placement
function ft(de) {
  return de.settings?.prUrlTemplate;
}
/**
 * /autofix-pr 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-4pdevvfa.js:26671-26733 placement
var fr = async (onDone, context, args) =>
  e(AutofixCancelView, { onDone: onDone, context: context, args: args.trim() });
//@ chunk-4pdevvfa.js:26733-27992 placement
function AutofixCancelView(l) {
  let A = w(20),
    { onDone: onDone, context: context, args: args } = l,
    [h, k] = y(ut);
  if (!h) {
    let p;
    if (A[0] !== args || A[1] !== context || A[2] !== onDone)
      ((p = e(AutofixPrView, { onDone: onDone, context: context, args: args })),
        (A[0] = args),
        (A[1] = context),
        (A[2] = onDone),
        (A[3] = p));
    else p = A[3];
    return p;
  }
  let p;
  if (A[4] !== onDone)
    ((p = () => onDone("Autofix PR cancelled", { display: "system" })), (A[4] = onDone), (A[5] = p));
  else p = A[5];
  let _;
  if (A[6] === MEMO_CACHE_SENTINEL)
    ((_ = e(KeyboardShortcutHint, { chord: "escape", action: "cancel" })), (A[6] = _));
  else _ = A[6];
  let f;
  if (A[7] === MEMO_CACHE_SENTINEL)
    ((f = e(Text, {
      children: "Auto-fix monitors the PR and can post comments on your behalf using your GitHub identity.",
    })),
      (A[7] = f));
  else f = A[7];
  let x;
  if (A[8] === MEMO_CACHE_SENTINEL)
    ((x = [
      { value: "continue", label: "Continue", description: "start monitoring this PR" },
      { value: "cancel", label: "Not now" },
    ]),
      (A[8] = x));
  else x = A[8];
  let C;
  if (A[9] !== context || A[10] !== onDone)
    ((C = (T) => {
      if (T === "continue") (saveGlobalConfig(ct, context.storageV5), k(!1));
      else onDone("Autofix PR cancelled", { display: "system" });
    }),
      (A[9] = context),
      (A[10] = onDone),
      (A[11] = C));
  else C = A[11];
  let D;
  if (A[12] !== onDone)
    ((D = () => onDone("Autofix PR cancelled", { display: "system" })), (A[12] = onDone), (A[13] = D));
  else D = A[13];
  let N;
  if (A[14] !== C || A[15] !== D)
    ((N = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [f, e(ModelSelector, { options: x, onChange: C, onCancel: D })],
    })),
      (A[14] = C),
      (A[15] = D),
      (A[16] = N));
  else N = A[16];
  let H;
  if (A[17] !== p || A[18] !== N)
    ((H = e(Dialog, {
      title: "Autofix PR",
      subtitle: "Before you start",
      onCancel: p,
      inputGuide: _,
      children: N,
    })),
      (A[17] = p),
      (A[18] = N),
      (A[19] = H));
  else H = A[19];
  return H;
}
/**
 * /autofix-pr 的界面：检查、启动、取消与错误显示。
 */
//@ chunk-4pdevvfa.js:27992-30111 placement
function AutofixPrView(l) {
  let v = w(31),
    { onDone: onDone, context: context, args: args } = l,
    h = rs(ft),
    [k, A] = y("checking"),
    [p, _] = y(null),
    [f, x] = y(null),
    [C, T] = y(!1),
    D = R(null),
    N = R(!1),
    H = R(!1),
    V;
  if (v[0] !== onDone)
    ((V = function m(Q, le) {
      if (H.current) {
        return;
      }
      ((H.current = !0), onDone(escapeXml(Q), le));
    }),
      (v[0] = onDone),
      (v[1] = V));
  else V = v[1];
  let m = V,
    z;
  if (v[2] !== args || v[3] !== context || v[4] !== m)
    ((z = () => {
      let E = createAbortController();
      return (
        (D.current = E),
        runAutofixPrCommand(args, context, {
          signal: E.signal,
          onProgress: (L) => {
            if ((A(L.step), L.prInfo)) _(L.prInfo);
          },
        })
          .then((B) => {
            if (E.signal.aborted && !N.current) {
              return;
            }
            switch (B.kind) {
              case "ok": {
                m(B.message, { display: B.display });
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
          .catch((ee) => {
            m(`Autofix PR failed: ${ee instanceof Error ? ee.message : String(ee)}`);
          }),
        () => {
          E.abort();
        }
      );
    }),
      (v[2] = args),
      (v[3] = context),
      (v[4] = m),
      (v[5] = z));
  else z = v[5];
  let Y;
  if (v[6] !== args || v[7] !== context || v[8] !== onDone)
    ((Y = [onDone, context, args]), (v[6] = args), (v[7] = context), (v[8] = onDone), (v[9] = Y));
  else Y = v[9];
  P(z, Y);
  let oe;
  if (v[10] !== m || v[11] !== f)
    ((oe = function X() {
      if (f) {
        m(f);
        return;
      }
      if (N.current) {
        m("Autofix PR cancelled");
        return;
      }
      ((N.current = !0), T(!0), D.current?.abort());
    }),
      (v[10] = m),
      (v[11] = f),
      (v[12] = oe));
  else oe = v[12];
  let X = oe,
    U;
  if (v[13] !== m || v[14] !== f)
    ((U = {
      "confirm:yes": () => {
        if (f) m(f);
      },
    }),
      (v[13] = m),
      (v[14] = f),
      (v[15] = U));
  else U = v[15];
  const ne = f !== null;
  let se;
  if (v[16] !== ne) ((se = { context: "Confirmation", isActive: ne }), (v[16] = ne), (v[17] = se));
  else se = v[17];
  MessageActionsKeybindings(U, se);
  let J;
  if (v[18] !== C || v[19] !== f)
    ((J = f
      ? e(KeyboardShortcutHint, { chord: ["escape", "enter"], action: "close" })
      : C
        ? e(KeyboardShortcutHint, { chord: "escape", action: "dismiss now" })
        : e(KeyboardShortcutHint, { chord: "escape", action: "cancel" })),
      (v[18] = C),
      (v[19] = f),
      (v[20] = J));
  else J = v[20];
  let ie;
  if (v[21] !== C || v[22] !== f || v[23] !== p || v[24] !== h || v[25] !== k)
    ((ie = e(Box, {
      flexDirection: "column",
      gap: 1,
      children: f
        ? e(ErrorText, { error: f })
        : r(Fragment, {
            children: [
              e(WorkerBadge, { message: C ? "Cancelling\u2026" : AUTOFIX_PHASE_LABELS[k] }),
              p &&
                r(Text, {
                  dimColor: !0,
                  children: ["PR:", " ", e(Link, { url: See(p.url, h), children: p.ref })],
                }),
            ],
          }),
    })),
      (v[21] = C),
      (v[22] = f),
      (v[23] = p),
      (v[24] = h),
      (v[25] = k),
      (v[26] = ie));
  else ie = v[26];
  let ce;
  if (v[27] !== X || v[28] !== J || v[29] !== ie)
    ((ce = e(Dialog, {
      title: "Autofix PR",
      subtitle: "Monitor and autofix any issues with the current PR",
      onCancel: X,
      inputGuide: J,
      children: ie,
    })),
      (v[27] = X),
      (v[28] = J),
      (v[29] = ie),
      (v[30] = ce));
  else ce = v[30];
  return ce;
}

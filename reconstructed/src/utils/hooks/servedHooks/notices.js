/**
 * utils/hooks/servedHooks/notices.ts
 *
 * 2.1.316 新增：服务端钩子提示文案
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: placement 18
 */

/**
 * 服务端 hook 未运行原因的说明文本。
 */
//@ chunk-e6aww6q8.js:878616-879341 placement
var HOOK_NOT_RUN_REASONS = {
  project_configured:
    "your own user or managed settings do not define it as it stands (this project, an agent, or an edit since launch does), and the cloud session can rewrite this project",
  in_reach: "its script lives inside the synced project, which the cloud session can rewrite",
  unreadable: "this machine could not verify what it runs",
  windows_unparsed:
    "on Windows, Claude cannot yet confirm that the program behind a hook lies outside the synced project, which the cloud session can rewrite",
  start_directory:
    "Claude cannot confirm that the folder it would start in lies outside the synced project, which the cloud session can rewrite",
  model_hook: "an agent or prompt hook cannot run for a call from a cloud session",
};
//@ chunk-e6aww6q8.js:879341-879479 placement
function hookNotRunNotice(e, n, r) {
  return `A ${e} ${n} hook on this machine was not run for this call: ${HOOK_NOT_RUN_REASONS[r]}. Its output is not part of this result.`;
}
/**
 * 服务端下发钩子的提示文案（跳过不安全的钩子、钩子在会话中被修改等）。
 */
//@ chunk-e6aww6q8.js:879479-881402 placement
var SERVED_HOOK_NOTICES = "served-hooks-not-run",
  BBr = "This computer skips hooks it can't safely run for cloud session commands.",
  SERVED_HOOK_CHANGED_KEEPS_RECORDED = "served-hook-changed-keeps-recorded",
  Uqs =
    "A project's command check changed on disk while a cloud session was using this computer (for example after a git checkout). This computer keeps using the version recorded when the session connected, which may be looser or stricter than the new one, until the session reconnects; you are asked about the new one then.",
  YWe = {
    project_configured: "A check didn't run because your own settings don't define it. Approve this command?",
    in_reach: "A check that the cloud session can change didn't run. Approve this command?",
    unreadable: "A check that couldn't be verified didn't run. Approve this command?",
    windows_unparsed:
      "One of your checks can't run on Windows for a cloud session yet. Approve this command?",
    start_directory:
      "A check that may start in a folder the cloud session can change didn't run. Approve this command?",
    model_hook: "Agent and prompt hooks don't run for cloud session commands. Approve this command?",
  },
  jBr = "A limit on what Claude may read kept a check from running. Approve this command?",
  Bqs =
    "A limit on what Claude may read is set on this computer, so a project's command checks are not run for your cloud session and each command they cover asks you instead. Limits include a Read deny or ask rule, sandbox.filesystem.denyRead, sandbox.credentials.files and permissions.blockReadsOutsideWorkingDirectories. The project's own settings can set one too.",
  BHt =
    "This project's command check is not the one recorded when this computer was attached, so it is not run. Approve this command?",
  XWe =
    "This project's command check changed since the last time this computer served this project, so it is not run this time. Approve this command? (If you approve, this computer also accepts the changed check and runs it for this project from the next session on.)";
/**
 * 生成询问是否使用已更新 hook 脚本的提示。
 */
//@ chunk-e6aww6q8.js:881402-881817 placement
function hookScriptChangedQuestion(e, n) {
  return `A script in this project checks each command before it runs. It changed since this computer last used it, for example after a project update (version ${e} \u2192 ${n}, not shown). Use the updated script? Yes: this command runs now, then the script runs in a read-only sandbox, can only block or question commands, and becomes the expected one. No: it is not run and each command asks you.`;
}
//@ chunk-e6aww6q8.js:881817-882002 placement
var HOOK_UPDATED_NOT_ACCEPTED_QUESTION =
  "This project's command check changed since the last time this computer served this project, and the updated one was not accepted here, so it is not run. Approve this command?";
//@ chunk-e6aww6q8.js:882002-882060 placement
function jqs(e, n) {
  return e.endsWith(XWe) ? n?.at(-1) : void 0;
}
//@ chunk-e6aww6q8.js:882060-882166 placement
function WBr(e, n, r) {
  return n?.findLast((s) => {
    let h = r?.get(s)?.question;
    return h !== void 0 && e.endsWith(h);
  });
}
//@ chunk-e6aww6q8.js:882166-882890 placement
var SERVED_HOOK_UPDATE_NOTICES = 3,
  SERVED_HOOK_UPDATED_ACCEPTED = "served-hook-updated-accepted",
  zqs =
    "You let a cloud session's computer use a project's updated command check. It runs in a read-only sandbox and is the one this computer expects for that project from now on.",
  QWe =
    "This project's command check stopped working after files in this folder changed. The cloud session may have made that change. Run commands without it for the rest of this session? Claude then judges commands without this project's rules.",
  SERVED_HOOK_SET_ASIDE = "served-hook-set-aside",
  Vqs =
    "You let a cloud session run commands without a project's command check for the rest of its session, after the check stopped working on changed files. The check is used again the next time this computer serves that project.";
//@ chunk-e6aww6q8.js:882890-882948 placement
function GBr(e, n) {
  return e.endsWith(QWe) ? n?.at(-1) : void 0;
}
/**
 * 项目命令检查与记录不一致时的说明：本次不运行，改为逐条询问。
 */
//@ chunk-e6aww6q8.js:882948-883790 placement
var HOOK_CHANGED_ASKS_INSTEAD =
    "This project's command check is not the one that computer recorded the last time it served this project, so it is not run for this session and each command asks the person instead. It is accepted as the project's check once this session's use of that computer ends.",
  HOOK_CHANGED_ASKING_PERSON =
    "This project's command check is not the one that computer recorded the last time it served this project, so the person is asked whether to use the updated one. It is not run unless they say yes. If they say no, each command asks the person instead.",
  HOOK_UPDATED_ACCEPTED_NOTE =
    "The person accepted this project's updated command check. It runs for the rest of this session.",
  HOOK_WANTS_CONFIRM_QUESTION = "This project's command check wants you to confirm this command.",
  HOOK_REWRITE_REFUSED_QUESTION =
    "This project's command check wanted to change this command, which it may not do for a cloud session. Approve the command as written?";
//@ chunk-e6aww6q8.js:883790-883929 placement
function hookCheckUnfinishedQuestion(e) {
  return `This project's command check couldn't finish on this computer (${e}), so Claude needs your OK to run this command.`;
}
//@ chunk-e6aww6q8.js:883929-884166 placement
function hookBlockedMessage(e, n, r) {
  let s = `A command check in this project (${e}) blocked this command: ${n}`;
  return r
    ? `${s} (this computer is still using the check from before the project's files changed. Reconnect the computer to use the new one.)`
    : s;
}
/**
 * 项目 hook 未被本机用户接受时的说明。
 */
//@ chunk-e6aww6q8.js:884166-884931 placement
var HOOK_NOT_ACCEPTED_NOTICE =
    "This project's settings set a hook that the person at this computer has not accepted for cloud sessions, so it is not run for this session. A command that hook would stop can run here. Tell the user: to review it, run claude apply-project-settings in a terminal in the project folder on this computer.",
  HOOKS_SANDBOXED_NOTE =
    "Project command checks run in a read-only sandbox on this computer for this session.",
  HOOK_CHANGED_ON_DISK_NOTE =
    "This project's command check changed on disk during this session (for example after a git checkout). This computer keeps using the version recorded when the session connected. The changed one is not run. The recorded version may be looser or stricter than the new one. The person is asked about the new one the next time this computer serves this project.";
//@ chunk-e6aww6q8.js:884931-885138 placement
function hookCheckOutputNote(e, n, r) {
  return `This project's command check (${e}) ${{ asked: "asked for confirmation and said", context: "added this context", stderr: "did not finish; its first line of error output was" }[n]}: ${r}`;
}
/**
 * 生成 hook 连续三次需要确认后不再运行的提示。
 */
//@ chunk-e6aww6q8.js:885138-885470 placement
function hookStruckOutNotice(e) {
  return `This project's command check (${e}) needed the person's OK three times in a row on this computer, so it is not run again for this session and each command asks instead. If it could not finish there, make it work read-only (no writes outside $TMPDIR, no network, no tools installed under the home directory).`;
}
//@ chunk-e6aww6q8.js:885470-886048 placement
var SERVED_HOOK_ERROR_NOTICES = "served-hook-errors",
  Xqs =
    "A PreToolUse hook on this machine exited with an error (whatever its cause) for a command your cloud session sent here and, as for a local command, did not block it. Note that hooks for such calls start in your home directory with a reduced environment: a guard that inspects the project must use $CLAUDE_PROJECT_DIR or the cwd field on stdin.",
  bCo = {
    user: "your user settings",
    project: "this project's shared settings",
    local: "this project's local settings",
    managed: "the managed settings",
    launch: "the settings named when Claude Code was started",
  };
/**
 * 生成命令运行期间本机设置文件变化的通知。
 */
//@ chunk-e6aww6q8.js:886048-886379 placement
function servedSettingsChangedNotice(e, n) {
  return {
    key: `served-settings-changed-${e}-${n}`,
    text: `A Claude Code settings file on this computer (${bCo[e]}) changed while a command from your cloud session was running. The command may have changed it, or something else did: you, another program, or Claude Code itself. Check those settings before you go on.`,
  };
}
/**
 * 命令运行期间设置文件变化的说明及相关通知键。
 */
//@ chunk-e6aww6q8.js:886379-886845 placement
var SETTINGS_CHANGED_DURING_COMMAND =
    "A Claude Code settings file on this computer changed while this command ran. Nothing was undone. Do not rely on a setting you may have changed.",
  SERVED_BASH_LAUNCHED_FROM_HOME = "served-bash-launched-from-home",
  SERVED_BASH_FROM_HOME_NOTICE =
    "Bash on this machine is not offered to your cloud session: this folder or its repository is your home directory, is in a hidden folder there, or is another such place; start from a project folder \u2014 your cloud session cannot run commands on this machine meanwhile.";

export {
  SERVED_BASH_LAUNCHED_FROM_HOME,
  SERVED_BASH_FROM_HOME_NOTICE,
  YWe,
  hookNotRunNotice,
  jBr,
  HOOK_NOT_ACCEPTED_NOTICE,
  GBr,
  SERVED_HOOK_NOTICES,
  Bqs,
  BBr,
  jqs,
  WBr,
  SERVED_HOOK_UPDATED_ACCEPTED,
  zqs,
  SERVED_HOOK_SET_ASIDE,
  Vqs,
  SERVED_HOOK_UPDATE_NOTICES,
  SERVED_HOOK_CHANGED_KEEPS_RECORDED,
  Uqs,
  SETTINGS_CHANGED_DURING_COMMAND,
  servedSettingsChangedNotice,
  SERVED_HOOK_ERROR_NOTICES,
  Xqs,
  BHt,
  hookScriptChangedQuestion,
  XWe,
  HOOK_UPDATED_NOT_ACCEPTED_QUESTION,
  HOOK_CHANGED_ASKING_PERSON,
  HOOK_CHANGED_ASKS_INSTEAD,
  hookCheckOutputNote,
  HOOK_REWRITE_REFUSED_QUESTION,
  HOOK_WANTS_CONFIRM_QUESTION,
  hookBlockedMessage,
  hookCheckUnfinishedQuestion,
  HOOK_CHANGED_ON_DISK_NOTE,
  HOOK_UPDATED_ACCEPTED_NOTE,
  HOOKS_SANDBOXED_NOTE,
  QWe,
  hookStruckOutNotice,
};

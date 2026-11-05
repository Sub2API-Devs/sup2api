/**
 * utils/hooks/servedHooks/notices.ts
 *
 * 2.1.316 新增：服务端钩子提示文案
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (18)
 * attribution: placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-5xgkngpb.js:889090-889815 placement
/**
 * 服务端 hook 未运行原因的说明文本。
 */
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
//@ chunk-5xgkngpb.js:889815-889953 placement
function hookNotRunNotice(agentKind, type, reasonCode) {
  return `A ${agentKind} ${type} hook on this machine was not run for this call: ${HOOK_NOT_RUN_REASONS[reasonCode]}. Its output is not part of this result.`;
}
//@ chunk-5xgkngpb.js:889953-891876 placement
/**
 * 服务端下发钩子的提示文案（跳过不安全的钩子、钩子在会话中被修改等）。
 */
var SERVED_HOOK_NOTICES = "served-hooks-not-run";
var SKIPS_UNSAFE_HOOKS_NOTICE = "This computer skips hooks it can't safely run for cloud session commands.";
var SERVED_HOOK_CHANGED_KEEPS_RECORDED = "served-hook-changed-keeps-recorded";
var KEEPS_RECORDED_HOOK_NOTICE =
  "A project's command check changed on disk while a cloud session was using this computer (for example after a git checkout). This computer keeps using the version recorded when the session connected, which may be looser or stricter than the new one, until the session reconnects; you are asked about the new one then.";
var HOOK_NOT_RUN_QUESTIONS = {
  project_configured: "A check didn't run because your own settings don't define it. Approve this command?",
  in_reach: "A check that the cloud session can change didn't run. Approve this command?",
  unreadable: "A check that couldn't be verified didn't run. Approve this command?",
  windows_unparsed: "One of your checks can't run on Windows for a cloud session yet. Approve this command?",
  start_directory:
    "A check that may start in a folder the cloud session can change didn't run. Approve this command?",
  model_hook: "Agent and prompt hooks don't run for cloud session commands. Approve this command?",
};
var READ_LIMIT_BLOCKED_QUESTION =
  "A limit on what Claude may read kept a check from running. Approve this command?";
var READ_LIMIT_SET_NOTICE =
  "A limit on what Claude may read is set on this computer, so a project's command checks are not run for your cloud session and each command they cover asks you instead. Limits include a Read deny or ask rule, sandbox.filesystem.denyRead, sandbox.credentials.files and permissions.blockReadsOutsideWorkingDirectories. The project's own settings can set one too.";
var HOOK_NOT_RECORDED_QUESTION =
  "This project's command check is not the one recorded when this computer was attached, so it is not run. Approve this command?";
var HOOK_CHANGED_QUESTION =
  "This project's command check changed since the last time this computer served this project, so it is not run this time. Approve this command? (If you approve, this computer also accepts the changed check and runs it for this project from the next session on.)";
//@ chunk-5xgkngpb.js:891876-892291 placement
/**
 * 生成询问是否使用已更新 hook 脚本的提示。
 */
function hookScriptChangedQuestion(previousVersion, currentVersion) {
  return `A script in this project checks each command before it runs. It changed since this computer last used it, for example after a project update (version ${previousVersion} \u2192 ${currentVersion}, not shown). Use the updated script? Yes: this command runs now, then the script runs in a read-only sandbox, can only block or question commands, and becomes the expected one. No: it is not run and each command asks you.`;
}
//@ chunk-5xgkngpb.js:892291-892476 placement
var HOOK_UPDATED_NOT_ACCEPTED_QUESTION =
  "This project's command check changed since the last time this computer served this project, and the updated one was not accepted here, so it is not run. Approve this command?";
//@ chunk-5xgkngpb.js:892476-892534 placement
/**
 * 若文本以"钩子在磁盘上被修改"的问题结尾，返回最后一条问题。
 */
function lastIfChangedQuestion(message, changedHookKeys) {
  return message.endsWith(HOOK_CHANGED_QUESTION) ? changedHookKeys?.at(-1) : undefined;
}
//@ chunk-5xgkngpb.js:892534-892640 placement
/**
 * 在问题列表中找出文本以其结尾的最后一条。
 */
function findLastMatchingQuestion(message, changedHookKeys, updatedAsks) {
  return changedHookKeys?.findLast((hookKey) => {
    let question = updatedAsks?.get(hookKey)?.question;
    return question !== undefined && message.endsWith(question);
  });
}
//@ chunk-5xgkngpb.js:892640-893364 placement
/**
 * 钩子更新相关提示：接受更新后的检查、检查停止工作、本次会话跳过检查的说明与询问。
 */
var SERVED_HOOK_UPDATE_NOTICES = 3;
var SERVED_HOOK_UPDATED_ACCEPTED = "served-hook-updated-accepted";
var HOOK_UPDATED_ACCEPTED_NOTICE =
  "You let a cloud session's computer use a project's updated command check. It runs in a read-only sandbox and is the one this computer expects for that project from now on.";
var HOOK_STOPPED_WORKING_QUESTION =
  "This project's command check stopped working after files in this folder changed. The cloud session may have made that change. Run commands without it for the rest of this session? Claude then judges commands without this project's rules.";
var SERVED_HOOK_SET_ASIDE = "served-hook-set-aside";
var HOOK_SET_ASIDE_NOTICE =
  "You let a cloud session run commands without a project's command check for the rest of its session, after the check stopped working on changed files. The check is used again the next time this computer serves that project.";
//@ chunk-5xgkngpb.js:893364-893422 placement
/**
 * 若文本以"检查已停止工作"的问题结尾，返回最后一条。
 */
function lastIfStoppedQuestion(message, stoppedWorkingHookKeys) {
  return message.endsWith(HOOK_STOPPED_WORKING_QUESTION) ? stoppedWorkingHookKeys?.at(-1) : undefined;
}
//@ chunk-5xgkngpb.js:893422-894264 placement
/**
 * 项目命令检查与记录不一致时的说明：本次不运行，改为逐条询问。
 */
var HOOK_CHANGED_ASKS_INSTEAD =
  "This project's command check is not the one that computer recorded the last time it served this project, so it is not run for this session and each command asks the person instead. It is accepted as the project's check once this session's use of that computer ends.";
var HOOK_CHANGED_ASKING_PERSON =
  "This project's command check is not the one that computer recorded the last time it served this project, so the person is asked whether to use the updated one. It is not run unless they say yes. If they say no, each command asks the person instead.";
var HOOK_UPDATED_ACCEPTED_NOTE =
  "The person accepted this project's updated command check. It runs for the rest of this session.";
var HOOK_WANTS_CONFIRM_QUESTION = "This project's command check wants you to confirm this command.";
var HOOK_REWRITE_REFUSED_QUESTION =
  "This project's command check wanted to change this command, which it may not do for a cloud session. Approve the command as written?";
//@ chunk-5xgkngpb.js:894264-894403 placement
function hookCheckUnfinishedQuestion(reason) {
  return `This project's command check couldn't finish on this computer (${reason}), so Claude needs your OK to run this command.`;
}
//@ chunk-5xgkngpb.js:894403-894640 placement
function hookBlockedMessage(checkLabel, reason, isStale) {
  let message = `A command check in this project (${checkLabel}) blocked this command: ${reason}`;
  return isStale
    ? `${message} (this computer is still using the check from before the project's files changed. Reconnect the computer to use the new one.)`
    : message;
}
//@ chunk-5xgkngpb.js:894640-895405 placement
/**
 * 项目 hook 未被本机用户接受时的说明。
 */
var HOOK_NOT_ACCEPTED_NOTICE =
  "This project's settings set a hook that the person at this computer has not accepted for cloud sessions, so it is not run for this session. A command that hook would stop can run here. Tell the user: to review it, run claude apply-project-settings in a terminal in the project folder on this computer.";
var HOOKS_SANDBOXED_NOTE =
  "Project command checks run in a read-only sandbox on this computer for this session.";
var HOOK_CHANGED_ON_DISK_NOTE =
  "This project's command check changed on disk during this session (for example after a git checkout). This computer keeps using the version recorded when the session connected. The changed one is not run. The recorded version may be looser or stricter than the new one. The person is asked about the new one the next time this computer serves this project.";
//@ chunk-5xgkngpb.js:895405-895612 placement
function hookCheckOutputNote(checkLabel, kind, text) {
  return `This project's command check (${checkLabel}) ${
    {
      asked: "asked for confirmation and said",
      context: "added this context",
      stderr: "did not finish; its first line of error output was",
    }[kind]
  }: ${text}`;
}
//@ chunk-5xgkngpb.js:895612-895944 placement
/**
 * 生成 hook 连续三次需要确认后不再运行的提示。
 */
function hookStruckOutNotice(checkLabel) {
  return `This project's command check (${checkLabel}) needed the person's OK three times in a row on this computer, so it is not run again for this session and each command asks instead. If it could not finish there, make it work read-only (no writes outside $TMPDIR, no network, no tools installed under the home directory).`;
}
//@ chunk-5xgkngpb.js:895944-896522 placement
/**
 * 钩子报错与命令期间设置文件变化的提示文案，以及设置来源标签。
 */
var SERVED_HOOK_ERROR_NOTICES = "served-hook-errors";
var HOOK_ERRORED_NOTICE =
  "A PreToolUse hook on this machine exited with an error (whatever its cause) for a command your cloud session sent here and, as for a local command, did not block it. Note that hooks for such calls start in your home directory with a reduced environment: a guard that inspects the project must use $CLAUDE_PROJECT_DIR or the cwd field on stdin.";
var SETTINGS_SOURCE_LABELS = {
  user: "your user settings",
  project: "this project's shared settings",
  local: "this project's local settings",
  managed: "the managed settings",
  launch: "the settings named when Claude Code was started",
};
//@ chunk-5xgkngpb.js:896522-896853 placement
/**
 * 生成命令运行期间本机设置文件变化的通知。
 */
function servedSettingsChangedNotice(tier, telling) {
  return {
    key: `served-settings-changed-${tier}-${telling}`,
    text: `A Claude Code settings file on this computer (${SETTINGS_SOURCE_LABELS[tier]}) changed while a command from your cloud session was running. The command may have changed it, or something else did: you, another program, or Claude Code itself. Check those settings before you go on.`,
  };
}
//@ chunk-5xgkngpb.js:896853-897319 placement
/**
 * 命令运行期间设置文件变化的说明及相关通知键。
 */
var SETTINGS_CHANGED_DURING_COMMAND =
  "A Claude Code settings file on this computer changed while this command ran. Nothing was undone. Do not rely on a setting you may have changed.";
var SERVED_BASH_LAUNCHED_FROM_HOME = "served-bash-launched-from-home";
var SERVED_BASH_FROM_HOME_NOTICE =
  "Bash on this machine is not offered to your cloud session: this folder or its repository is your home directory, is in a hidden folder there, or is another such place; start from a project folder \u2014 your cloud session cannot run commands on this machine meanwhile.";
export {
  SERVED_BASH_LAUNCHED_FROM_HOME,
  SERVED_BASH_FROM_HOME_NOTICE,
  HOOK_NOT_RUN_QUESTIONS,
  hookNotRunNotice,
  READ_LIMIT_BLOCKED_QUESTION,
  HOOK_NOT_RECORDED_QUESTION,
  hookScriptChangedQuestion,
  HOOK_CHANGED_QUESTION,
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
  HOOK_STOPPED_WORKING_QUESTION,
  hookStruckOutNotice,
  HOOK_NOT_ACCEPTED_NOTICE,
  lastIfStoppedQuestion,
  SERVED_HOOK_NOTICES,
  READ_LIMIT_SET_NOTICE,
  SKIPS_UNSAFE_HOOKS_NOTICE,
  lastIfChangedQuestion,
  findLastMatchingQuestion,
  SERVED_HOOK_UPDATED_ACCEPTED,
  HOOK_UPDATED_ACCEPTED_NOTICE,
  SERVED_HOOK_SET_ASIDE,
  HOOK_SET_ASIDE_NOTICE,
  SERVED_HOOK_UPDATE_NOTICES,
  SERVED_HOOK_CHANGED_KEEPS_RECORDED,
  KEEPS_RECORDED_HOOK_NOTICE,
  SETTINGS_CHANGED_DURING_COMMAND,
  servedSettingsChangedNotice,
  SERVED_HOOK_ERROR_NOTICES,
  HOOK_ERRORED_NOTICE,
};

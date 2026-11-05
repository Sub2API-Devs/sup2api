/**
 * remote/tools/consentText.ts
 *
 * 远程工具（云会话在本机运行命令）同意文案（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-7jxyna5q.js:454163-467328 placement
/**
 * 让云会话在本机运行命令的同意文案表（无人值守、自动模式等）
 */
var REMOTE_TOOLS_CONSENT_TEXT = {
  "consent.unattended.title": "Let cloud sessions run commands on this computer in auto mode?",
  "consent.unattended.body": `${"This computer is serving tools to your cloud session. In auto mode, the cloud session decides which commands to run here without asking you each time \u2014 the same way auto mode works locally. Your deny rules and hooks on this computer still apply. Answer once per computer;"} change it later in /config.`,
  "consent.unattended.body.host": `${"This computer is serving tools to your cloud session. In auto mode, the cloud session decides which commands to run here without asking you each time \u2014 the same way auto mode works locally. Your deny rules and hooks on this computer still apply. Answer once per computer;"} change it later in Settings \u203A Claude Code.`,
  "consent.unattended.detail":
    "Until you answer, a cloud session in auto mode asks you before most commands here, as in Manual mode. Whatever you answer, a session set to edit files without asking can still create, edit, move and delete files here, in its folder and any other folder you or your settings let Claude work in, as it would locally.",
  consent_unattended_saved(settingsHint) {
    return `Yes and No are saved for this computer; to change the answer later, ${settingsHint}.`;
  },
  "auto_off.reason.consent_unset":
    "Unattended commands from cloud sessions are not yet allowed on this computer. Allow them in /config in claude, or in the Claude desktop app under Remote Control.",
  "auto_off.reason.consent_declined":
    "Unattended commands from cloud sessions are turned off on this computer. Turn them on in /config in claude, or in the Claude desktop app under Remote Control.",
  "auto_off.reason.sandbox_off":
    "Unattended commands need this computer's sandbox. Pick a mode in /sandbox there, then start claude remote-control again so the change is read.",
  "auto_off.reason.consent_unknown":
    "This computer could not read its unattended commands setting. If this repeats, check its Claude Code settings.",
  "auto_off.reason.consent_forced_off":
    "This computer's settings turn off unattended commands from cloud sessions in auto mode (remoteTools.allowUnattendedServing).",
  "auto_off.reason.settings": "This computer's settings turn auto mode off (disableAutoMode).",
  "auto_off.reason.breaker":
    "Auto mode is turned off for the Claude Code process running on this computer. Restarting it checks again.",
  auto_off_notice(computerLabel, reasonText) {
    return `Cloud sessions ask you before most commands on ${computerLabel}. ${reasonText}`;
  },
  "ask.outside_sandbox": "Runs outside the sandbox.",
  "ask.settings_person_only":
    "This may change Claude Code's settings or credentials, so only you can approve it.",
  ask_runs_in_vm(vmKind) {
    return `This runs in a ${vmKind} VM on this computer, not on the computer itself.`;
  },
  "serving_off.muted":
    "Remote tool serving was turned off by Anthropic (emergency switch). No new command is accepted until it is turned back on. A command Claude is waiting on may go on until the cloud session cancels it.",
  "serving_on.unmuted":
    "Remote tool serving was turned back on by Anthropic. Commands can run on this computer again.",
  "serving_off.profile_dirs_unreadable":
    "This computer's tools are not offered to your cloud session: Windows did not say where your profile folders are (AppData, the Start Menu, and Documents, where your PowerShell profile lives). Restarting Claude Code tries again; the debug log says why.",
  "serving_off.mount_table_unreadable":
    "This computer's tools are not offered to your cloud session: the list of mounted drives (/proc/self/mountinfo) could not be read in full. It is read again every few minutes; if this lasts, see the debug log.",
  "serving_off.bridge_trusted_devices":
    "This computer's tools are not offered to your cloud session over the device bridge. The bridge cannot check a device's proof, and trusted devices may be required for your organization or could not be checked. Remove the off switch for the session channel from your environment to serve over it instead.",
  "serving_off.vm_starting":
    "Your cloud session's calls wait on this computer for now: the VM they must run in is still starting. They run as soon as it is ready.",
  "serving_off.vm_unavailable":
    "Your cloud session's calls are refused on this computer: it is set to run them only inside a VM, and the VM is not available.",
  "call_refused.settings_unreadable":
    "A call from your cloud session was refused: this computer could not read all of its settings, so it could not tell whether tools must run inside a VM. Its tools are still offered, and the next call is judged afresh. Check that your settings files are valid and that your organization's settings have loaded.",
  "served_settings.folder_config_not_used":
    "This folder's hooks and plugin settings are not used while this computer serves a cloud session. The session may have written them: review them first; put only your own in ~/.claude/settings.json.",
  "served_settings.changed_while_attached":
    "This project's Claude Code settings changed while a cloud session was using this computer, so the change waits. Run claude apply-project-settings in a terminal in this folder to review. Cloud sessions keep using what you accepted. The cloud session may have made the change.",
  "served_settings.held_back":
    "This project's Claude Code settings differ from what you accepted for cloud sessions, which keep using what you accepted. Run claude apply-project-settings in a terminal in this folder to review. A cloud session may have made the change.",
  "served_settings.own_waiting":
    "Run claude apply-project-settings in a terminal: cloud sessions are not using your own Claude Code settings as they stand, and a change in them waits for you.",
  "served_settings.own_waiting.session_note":
    "The person's own Claude Code settings on this computer hold something they have not accepted for cloud sessions, so allow rules in them may not count here and a command may be asked about. Tell the user: to review, run claude apply-project-settings in a terminal on this computer.",
  "served_settings.taken_as_found":
    "A cloud session used this computer before: check .claude/settings.json and settings.local.json. Cloud sessions use them as they are; later changes wait until you run claude apply-project-settings.",
  "served_settings.record_unavailable":
    "Cloud sessions cannot use this computer until it can read and save its record of this folder's Claude Code settings. Check free disk space and that ~/.claude/state can be written, then reconnect it.",
  "served_settings.project_env_not_applied":
    "This project's Claude Code settings set environment variables not applied while this computer serves a cloud session. The session may have set them; put only your own in ~/.claude/settings.json here.",
  "refused.sandbox_custody":
    "This computer can't run this command inside its sandbox while protecting its credential files (a protected directory could not be prepared). Nothing was run. Ask the user to run it themselves on this computer, or continue without it.",
  "refused.path_too_long"(toolName, pathBytes) {
    return `${toolName} cannot open this path: written out in full it comes to ${pathBytes.toLocaleString("en-US")} bytes or more, and its operating system takes no path that long. Nothing was read or written.`;
  },
  "computer_folder.prompt.name": "Use a folder on your computer",
  "computer_folder.prompt.question": "Let this cloud session use a folder on your computer?",
  "computer_folder.prompt.meaning":
    "Claude in this cloud session can then run commands and read and change files in that folder, including in auto mode, under that computer\u2019s own sandbox, rules and hooks. To end it, stop claude remote-control on that computer or disconnect it in the Claude app.",
  "computer_folder.prompt.folder"(folderLabel) {
    return `folder: ${folderLabel}`;
  },
  "computer_folder.prompt.computer"(computerLabel) {
    return `on: ${computerLabel}`;
  },
  "repository_trust.state.trusted": "Repositories trusted",
  "repository_trust.state.no_repository": "No repository attached",
  "repository_trust.state.declined": "Repository trust declined",
  "repository_trust.state.not_marked": "Repositories not marked trusted",
  "repository_trust.prompt.meaning":
    "Answering yes marks everything attached to this cloud session as trusted, which lets the session act on your computer with your authority. Say yes only if you trust all of it.",
  "repository_trust.prompt.unbound":
    "This terminal is not the computer this cloud session is bound to, so an answer given here cannot prove which device it came from. Answer on a device that can: claude.ai on the web, the desktop app or the mobile app.",
  "repository_trust.prompt.not_shown_here":
    "Open claude.ai or the desktop or mobile app and say whether you trust what's attached to this session. The question can't be shown in full here. The session waits; esc stops this turn.",
  "repository_trust.prompt.answer_elsewhere"(askUrl) {
    return `Open ${askUrl} or the desktop or mobile app and say whether you trust what's attached to this session. A yes here doesn't count. The session waits for your answer.`;
  },
  "repository_trust.folder_waits.required":
    "Before this session can use a folder on your computer, it needs you to confirm you trust what is attached to it. It asks next.",
  "repository_trust.folder_waits.declined":
    "This session cannot use a folder on your computer: you declined to trust what is attached to it. Send it a new message if you want it to ask again.",
  "repository_trust.folder_waits.unavailable":
    "This session cannot use a folder on your computer right now: the service could not read what is attached to it. It can try again.",
  "repository_trust.folder_waits.not_elevated":
    "Before this session can use a folder on your computer, it needs you to agree to limit it to your trusted devices, for good. If it can ask you, it does so next; answer in Claude on the web or in the desktop app.",
  "repository_trust.folder_waits.marker":
    "(The service's own message to Claude is not shown here; the transcript view shows it.)",
  "repository_trust.served_calls.unattested":
    "This computer refused a call from the cloud session: the service could not vouch for the call's sender under your organization's trusted-device policy.",
  "repository_trust.served_calls.unattested_untrusted_repo.not_marked":
    "This computer refused a call from the cloud session, because you have not yet said you trust what is attached to it. Ask Claude in that session to connect to this computer again. If you are then asked whether you trust what is attached, or to allow the folder again, a yes lets its calls through. If you are not asked, or your yes changes nothing, start a new session with no repository and none of your files.",
  "repository_trust.served_calls.unattested_untrusted_repo":
    "This computer refused a call from the cloud session: the session's attached repositories were not marked trusted. Answer the session's trust question to let its calls through.",
  "forwarding_off.reason.disabled_switch_off":
    "running tools there is not turned on for this session's cloud environment",
  "forwarding_off.reason.disabled_flag_off": "running tools there is not enabled for this account",
  "forwarding_off.reason.disabled_device_policy":
    "this session cannot confirm that it is limited to trusted devices",
  "forwarding_off.reason.not_ready":
    "it has not been able to check whether running tools there is enabled for this account",
  "forwarding_off.retracted":
    "Correction: this session now offers device tools that act on the user's computer, so the earlier note that it cannot run tools there no longer holds for them. When the user asks for something on their computer, use those tools.",
  forwarding_off(reasonText) {
    return `The user's computer has connected to this cloud session, but this session cannot run tools on it, because ${reasonText}. Do the work in this session's own cloud environment. When the user asks for something on their computer, tell them plainly that this session cannot reach it and why, and that you are working in the cloud environment instead. Do not describe this environment as their computer. Do not retry or look for another route: a tool that only reports information about that computer cannot run anything on it, and if it says the computer is not connected or may be back in a few seconds, this is the cause and waiting will not change it.`;
  },
  forwarding_off_for_now(reasonText) {
    return `The user's computer has connected to this cloud session, but this session cannot run tools on it yet, because ${reasonText}. If that changes, the computer's tools are listed for you. Until then, do the work in this session's own cloud environment and do not describe this environment as their computer. When the user asks for something on their computer, tell them plainly that this session cannot reach it yet and why, that there is nothing to change on their computer, and that a new session may help if it stays this way.`;
  },
  "serving_off.computer_too_old":
    "Local tools are off: Claude on this computer is too old for this cloud session. Update the Claude app or Claude Code, then open this session again.",
  "serving_off.session_too_old":
    "Local tools are off: this cloud session's Claude Code is too old for this computer. Start a new session.",
  announce_unverified(detailText) {
    return `The cloud session did not accept the device proof on this machine's requests, so commands meant for this machine are not routed here and the session uses its own environment instead \u2014 ${detailText}.`;
  },
};
export { REMOTE_TOOLS_CONSENT_TEXT };

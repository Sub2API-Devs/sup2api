/**
 * services/remoteTools/transportMessages.ts
 *
 * 2.1.316 新增：远程工具调用的传输层文案：审批丢失/撤回、仍在运行、超时等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qmsrnapp.js (39)
 * attribution: placement 39
 */
import { machineLabelForMessage, currentMachineLabel } from "../../bridge/deviceRegistration.js";
import { formatDisplayPath } from "../../utils/messages.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { stripControlChars, stripControlChars_2 } from "../../utils/stripControlChars.js";

//@ chunk-qmsrnapp.js:29505-30036 placement
function callTimedOutMessage({ name, capMs, left = false }) {
  return left
    ? `${name} did not answer within ${Math.round(capMs / 1000)}s, and what became of the call could not be learned from it afterwards; the request was left with ${name}, so the command may have run or may still be running there. Check its effect on ${name} before repeating it.`
    : `${name} did not answer within ${Math.round(capMs / 1000)}s, and what became of the call could not be learned from it afterwards, so it was withdrawn there; it may have partially run. Check its effect on ${name} before repeating it.`;
}
//@ chunk-qmsrnapp.js:30036-30341 placement
function disconnectedDuringCallMessage(name) {
  return `${name} disconnected during the call. If the command had started, it has most likely continued to run there, but its result could not be delivered. Do not simply re-run it \u2014 first check whether it took effect (e.g. whether the file, commit or process now exists) or ask the user.`;
}
//@ chunk-qmsrnapp.js:30341-31336 placement
function inProgressStateMessage(name, state) {
  switch (state) {
    case "in_progress":
      return `${name} answered that this call was already under way there from an earlier attempt`;
    case "dropped":
      return `The connection to ${name} dropped during the call`;
    case "timed_out":
      return `${name} did not answer this call within this session's time limit`;
    case "unverified_refusal":
      return `A sender this session could not verify reported the call to ${name} refused`;
    case "classifier_refused":
      return `This session's automatic check (not a person) had approved the call to ${name}, and a sender this session could not verify reported it refused`;
    case "write_unresolved":
      return `This session could not confirm that this call was sent to ${name} in time (its connection to the service was backed up: the upload had not completed, or ended without an answer)`;
    case "approval_write_unresolved":
      return `This session could not confirm that your approval was sent to ${name} in time (its connection to the service was backed up: the upload had not completed, or ended without an answer)`;
  }
}
//@ chunk-qmsrnapp.js:31336-31675 placement
function maybeReachedMessage(name) {
  return `This call may or may not have reached ${name}: this session's connection to the service was backed up and the upload carrying it could not be confirmed in time, and what became of it could not be learned from ${name} afterwards. This is not a problem with ${name}. Check whether the command took effect before re-running it.`;
}
//@ chunk-qmsrnapp.js:31675-31985 placement
function approvalUploadUnconfirmedMessage(name) {
  return `This session's upload of your approval could not be confirmed in time (its connection to the service was backed up); whether ${name} received it and ran the command could not be learned from it afterwards. This is not a problem with ${name}. Check whether the command ran before retrying it.`;
}
//@ chunk-qmsrnapp.js:31985-32200 placement
function unverifiedRefusalMessage(name) {
  return `A sender this session could not verify reported this call refused, and ${name} could not be asked what became of it; whether it ran there is not confirmed. Check its effect before re-running it.`;
}
//@ chunk-qmsrnapp.js:32200-32994 placement
function stillRunningMessage({ name, state, cause }) {
  let head =
    cause === "unasked"
      ? `${name} answered that this call is still under way there`
      : `${inProgressStateMessage(name, cause)}; asked again, ${name} reports`;
  switch (state) {
    case "running":
      return `${head}${cause === "unasked" ? "" : " the command is STILL RUNNING there"}; its outcome is not known yet. Do not re-run it \u2014 check on its effect later, or ask the user.`;
    case "admitting":
      return `${head}${cause === "unasked" ? " \u2014" : ""} it had received the call but nothing had started yet; whether it then ran is not known. Check on its effect before repeating it, or ask the user.`;
    case "awaiting_approval":
      return `${head}${cause === "unasked" ? " \u2014" : ""} it was waiting for a permission decision and nothing had run, but it no longer accepts an answer to that question, so check on its effect before retrying it, or ask the user.`;
  }
}
//@ chunk-qmsrnapp.js:32994-34385 placement
function approvalDroppedMessage(name, reason, withdrawn) {
  let whatHappened =
    reason === "dropped"
      ? `The connection to ${name} dropped before your approval reached it`
      : reason === "classifier_refused"
        ? `This session's automatic check (not a person) had approved the call; a sender this session could not verify reported the approval refused, and ${name} had not run it when asked`
        : reason === "unverified_refusal"
          ? `A sender this session could not verify reported your approval refused, and ${name} had not received it when asked`
          : reason === "write_unresolved" || reason === "approval_write_unresolved"
            ? `This session's upload of your approval could not be confirmed in time (its connection to the service was backed up), and ${name} had not received it when asked`
            : `${name} did not answer your approval within this session's time limit and had not received it when asked`;
  let advice =
    reason === "unverified_refusal"
      ? "If the user answered from a surface this session cannot verify, send the call again and have them approve from the terminal or desktop prompt, unedited."
      : reason === "classifier_refused"
        ? `Retry once if it is still needed. If it is refused again, stop and tell the user that this tool on ${name} needs their own approval.`
        : "It is safe to retry the call if it is still wanted.";
  return withdrawn
    ? `${whatHappened}; the request was withdrawn there and nothing ran. ${advice}`
    : `${whatHappened}; the request was then withdrawn, but whether a delayed copy of the approval reached it first is not known. Check whether the command ran before retrying it.`;
}
//@ chunk-qmsrnapp.js:34385-34588 placement
function hostRestartedLostMessage(name, state) {
  return `${inProgressStateMessage(name, state)}, and Claude Code on ${name} has restarted since: the command was lost with it. It may have partially run before the restart \u2014 check its effect before repeating it.`;
}
//@ chunk-qmsrnapp.js:34588-34702 placement
function neverReceivedMessage(name, state) {
  return `${inProgressStateMessage(name, state)}, and ${name} reports it never received it: it did not run. It is safe to retry.`;
}
//@ chunk-qmsrnapp.js:34702-34781 placement
function waitingToReconnectStatus(machine, seconds) {
  return `Waiting up to ${seconds} s for ${machineLabelForMessage(machine)} to reconnect\u2026`;
}
//@ chunk-qmsrnapp.js:34781-34886 placement
function waitedToReconnectNote(name, seconds) {
  return `waited ${seconds} s for ${name} to reconnect after this session's environment restarted`;
}
//@ chunk-qmsrnapp.js:34886-34972 placement
function reconnectingStatus(name) {
  return `Reconnecting to ${name} to learn what happened to the call\u2026`;
}
//@ chunk-qmsrnapp.js:34972-35416 placement
function deliveredAfterReconnectNote(whatHappened = "completed") {
  switch (whatHappened) {
    case "completed":
      return "(delivered after reconnect \u2014 the first reply was lost; this is the recorded result, the command was not run again)";
    case "refused":
      return "(delivered after reconnect \u2014 the first reply was lost; this is the refusal recorded then, nothing ran)";
    case "failed":
      return "(delivered after reconnect \u2014 the first reply was lost; this is how the call ended, it was not run again)";
  }
}
//@ chunk-qmsrnapp.js:35416-35846 placement
function replayedOutcomeNote(servedAt, whatHappened = "completed") {
  let when =
    servedAt === undefined || !Number.isFinite(servedAt) || Math.abs(servedAt) > 8640000000000000
      ? "earlier"
      : `at ${formatUtcClock(new Date(servedAt))} UTC`;
  switch (whatHappened) {
    case "completed":
      return `(replayed \u2014 this call already ran ${when}; it was not run again)`;
    case "refused":
      return `(replayed \u2014 this is the refusal recorded ${when}; nothing ran then or now)`;
    case "failed":
      return `(replayed \u2014 this is how the call ended ${when}; it was not run again)`;
  }
}
//@ chunk-qmsrnapp.js:35846-35967 placement
function formatUtcClock(date) {
  return [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}
//@ chunk-qmsrnapp.js:35967-36078 placement
function failedInTransitMessage({ name, detail }) {
  return `The call to ${name} failed in transit (${truncateText(detail, MAX_MESSAGE_CHARS)}); it may not have run.`;
}
//@ chunk-qmsrnapp.js:36078-36153 placement
function refusedByMachineLine({ name, message }) {
  return `[refused by ${machineLabelForMessage(name)}] ${truncateText(message, MAX_MESSAGE_CHARS)}`;
}
//@ chunk-qmsrnapp.js:36153-36246 placement
function refusedDidNotRunLine({ name, message }) {
  return `[refused \u2014 did not run on ${machineLabelForMessage(name)}] ${truncateText(message, MAX_MESSAGE_CHARS)}`;
}
//@ chunk-qmsrnapp.js:36246-36319 placement
function failedOnMachineLine({ name, message }) {
  return `[failed on ${machineLabelForMessage(name)}] ${truncateText(message, MAX_MESSAGE_CHARS)}`;
}
//@ chunk-qmsrnapp.js:36319-36546 placement
var MAX_NAME_DISPLAY = 256;
var MAX_MESSAGE_CHARS = 8192;
var APPROVAL_SOURCE_TEXT = {
  prompt: "approved at a permission prompt",
  host_prompt: "approved at a permission prompt",
  hook: "approved by a permission hook",
  classifier: "approved by the auto-mode classifier",
  unasked: "no approval needed",
};
//@ chunk-qmsrnapp.js:36546-36575 placement
function approvalSourcePhrase(source) {
  return APPROVAL_SOURCE_TEXT[source];
}
//@ chunk-qmsrnapp.js:36575-36745 placement
function ranOnHeader(name, spelledDirectory, permittedBy, isError = false) {
  let shownSource = isError && permittedBy === "unasked" ? undefined : permittedBy;
  let sourceText = shownSource === undefined ? "" : ` \xB7 ${approvalSourcePhrase(shownSource)}`;
  return `[${isError ? "on" : "ran on"} ${machineLabelForMessage(name)} \xB7 ${spelledDirectory === "" ? "unknown directory" : spelledDirectory}${sourceText}]`;
}
//@ chunk-qmsrnapp.js:36745-36818 placement
function displayWorkingDir(dirPath, homeDir) {
  return formatDisplayPath(tildeRelativePath(dirPath.trim(), homeDir?.trim()), MAX_NAME_DISPLAY, {
    isDirectory: true,
  });
}
//@ chunk-qmsrnapp.js:36818-36974 placement
function tildeRelativePath(path, homeDir) {
  let replaced = homeDir?.replace(/[\\/]$/, "");
  if (!replaced) return path;
  if (path === replaced) return "~";
  let sliced = path.slice(replaced.length);
  return path.startsWith(replaced) && /^[\\/]/.test(sliced) ? `~${sliced}` : path;
}
//@ chunk-qmsrnapp.js:36974-37010 placement
function truncatePath(path, maxChars) {
  return truncateToLength(stripControlChars(path), maxChars);
}
//@ chunk-qmsrnapp.js:37010-37047 placement
function truncateText(message, maxChars) {
  return truncateToLength(stripControlChars_2(message), maxChars);
}
//@ chunk-qmsrnapp.js:37047-37091 placement
function formatMiB(bytes) {
  return (bytes / 1048576).toFixed(2);
}
//@ chunk-qmsrnapp.js:37091-37168 placement
function hereLocation() {
  return currentMachineLabel() === "container" ? "in the container" : "on this machine";
}
//@ chunk-qmsrnapp.js:37168-37496 placement
function unverifiedApprovalMessage(name) {
  return `The approval for this call could not be verified as the user's own answer, so ${name} did not run it and nothing ran (its earlier permission request for this call may stay open there; that is harmless). To proceed, send the call again and have the user approve from the terminal or desktop prompt, unedited.`;
}
//@ chunk-qmsrnapp.js:37496-37773 placement
function classifierOnlyApprovalMessage(name, name_2) {
  return `This session's automatic check approved this ${name_2} call, but only a person's approval counts for ${name_2} on ${name}, so nothing ran. Retry once if it is still needed. If it is refused again, stop and tell the user that ${name_2} on ${name} needs their own approval.`;
}
//@ chunk-qmsrnapp.js:37773-38014 placement
function approvalNotVerifiedMessage(name) {
  return `The approval for this call could not be verified as the user's own answer, so the call was not cleared to run on ${name} and nothing ran. Ask again and have the user approve from the terminal or desktop prompt, unedited.`;
}
//@ chunk-qmsrnapp.js:38014-38439 placement
function sendTimedOutMessage({ name, capMs }) {
  return `The call to ${name} could not be sent within ${Math.round(capMs / 1000)}s \u2014 this session's connection to the service was backed up \u2014 so it was withdrawn while still queued here. Most likely nothing ran on ${name}: if the call reaches it late, its withdrawal arrives with it (for a command with side effects, check before repeating it). This is not a problem with ${name}; try the call again.`;
}
//@ chunk-qmsrnapp.js:38439-38755 placement
function nothingRanSendTimeoutMessage({ name, capMs }) {
  return `Nothing ran on ${name}: the call could not be sent within ${Math.round(capMs / 1000)}s \u2014 this session's connection to the service was backed up \u2014 and it was taken back before it left this session, so ${name} never received it. This is not a problem with ${name}; try the call again.`;
}
//@ chunk-qmsrnapp.js:38755-39218 placement
function approvalWithdrawnMessage({ name, capMs }) {
  return `The call had reached ${name} and asked for approval there, but the user's approval could not be sent within ${Math.round(capMs / 1000)}s \u2014 this session's connection to the service was backed up \u2014 and it was taken back before it left this session, so ${name} never received it and nothing ran; the pending request on ${name} is withdrawn. This is not a problem with ${name}; send the call again and the user will be asked once more.`;
}
//@ chunk-qmsrnapp.js:39218-39740 placement
function approvalNotSentMessage({ name, capMs }) {
  return `The user's approval could not be sent to ${name} within ${Math.round(capMs / 1000)}s \u2014 this session's connection to the service was backed up \u2014 so it was withdrawn while still queued here, and the pending request on ${name} with it. Most likely nothing ran: if the approval still reaches ${name} late, its cancellation arrives with it (for a command with side effects, check before repeating it). This is not a problem with ${name}; send the call again and the user will be asked once more.`;
}
//@ chunk-qmsrnapp.js:39740-40183 placement
function livenessCheckWithdrawnMessage({ name, capMs }) {
  return `The call had reached ${name} and asked for approval there, but the check that ${name} is still connected could not be sent within ${Math.round(capMs / 1000)}s \u2014 this session's connection to the service was backed up \u2014 so the user's approval was never sent and the pending request on ${name} is withdrawn; nothing ran. This is not a problem with ${name}; send the call again and the user will be asked once more.`;
}
//@ chunk-qmsrnapp.js:40183-40449 placement
function livenessCheckNotSentMessage({ name, capMs }) {
  return `A liveness check to ${name} could not be sent within ${Math.round(capMs / 1000)}s \u2014 this session's connection to the service was backed up; the call was not sent and nothing ran. This is not a problem with ${name}; try the call again.`;
}
//@ chunk-qmsrnapp.js:40449-40892 placement
function interruptedCallMessage({ name, why, unsent }) {
  let eventText =
    why === "withdrawn"
      ? `Claude Code on ${name} withdrew from this session (it exited or stopped serving)`
      : `Claude Code on ${name} restarted`;
  return unsent
    ? `${eventText} before this call reached it; nothing ran there, and no result will arrive for it.`
    : `The call was interrupted: ${eventText} while the call was with it, so no result will arrive for it. It may have partially run \u2014 check its effects on ${name} before repeating it.`;
}
export {
  reconnectingStatus,
  refusedByMachineLine,
  approvalDroppedMessage,
  livenessCheckWithdrawnMessage,
  approvalWithdrawnMessage,
  approvalNotSentMessage,
  classifierOnlyApprovalMessage,
  approvalUploadUnconfirmedMessage,
  hostRestartedLostMessage,
  neverReceivedMessage,
  stillRunningMessage,
  callTimedOutMessage,
  replayedOutcomeNote,
  deliveredAfterReconnectNote,
  ranOnHeader,
  waitingToReconnectStatus,
  waitedToReconnectNote,
  displayWorkingDir,
  failedInTransitMessage,
  approvalSourcePhrase,
  hereLocation,
  formatUtcClock,
  truncatePath,
  MAX_NAME_DISPLAY,
  formatMiB,
  approvalNotVerifiedMessage,
  unverifiedApprovalMessage,
  livenessCheckNotSentMessage,
  nothingRanSendTimeoutMessage,
  sendTimedOutMessage,
  interruptedCallMessage,
  unverifiedRefusalMessage,
  maybeReachedMessage,
  disconnectedDuringCallMessage,
  refusedDidNotRunLine,
  failedOnMachineLine,
};

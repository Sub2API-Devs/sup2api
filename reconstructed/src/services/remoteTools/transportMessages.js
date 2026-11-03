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
function callTimedOutMessage({ name: e, capMs, left = false }) {
  return left
    ? `${e} did not answer within ${Math.round(capMs / 1000)}s, and what became of the call could not be learned from it afterwards; the request was left with ${e}, so the command may have run or may still be running there. Check its effect on ${e} before repeating it.`
    : `${e} did not answer within ${Math.round(capMs / 1000)}s, and what became of the call could not be learned from it afterwards, so it was withdrawn there; it may have partially run. Check its effect on ${e} before repeating it.`;
}
//@ chunk-qmsrnapp.js:30036-30341 placement
function disconnectedDuringCallMessage(e) {
  return `${e} disconnected during the call. If the command had started, it has most likely continued to run there, but its result could not be delivered. Do not simply re-run it \u2014 first check whether it took effect (e.g. whether the file, commit or process now exists) or ask the user.`;
}
//@ chunk-qmsrnapp.js:30341-31336 placement
function inProgressStateMessage(e, n) {
  switch (n) {
    case "in_progress":
      return `${e} answered that this call was already under way there from an earlier attempt`;
    case "dropped":
      return `The connection to ${e} dropped during the call`;
    case "timed_out":
      return `${e} did not answer this call within this session's time limit`;
    case "unverified_refusal":
      return `A sender this session could not verify reported the call to ${e} refused`;
    case "classifier_refused":
      return `This session's automatic check (not a person) had approved the call to ${e}, and a sender this session could not verify reported it refused`;
    case "write_unresolved":
      return `This session could not confirm that this call was sent to ${e} in time (its connection to the service was backed up: the upload had not completed, or ended without an answer)`;
    case "approval_write_unresolved":
      return `This session could not confirm that your approval was sent to ${e} in time (its connection to the service was backed up: the upload had not completed, or ended without an answer)`;
  }
}
//@ chunk-qmsrnapp.js:31336-31675 placement
function maybeReachedMessage(e) {
  return `This call may or may not have reached ${e}: this session's connection to the service was backed up and the upload carrying it could not be confirmed in time, and what became of it could not be learned from ${e} afterwards. This is not a problem with ${e}. Check whether the command took effect before re-running it.`;
}
//@ chunk-qmsrnapp.js:31675-31985 placement
function approvalUploadUnconfirmedMessage(name) {
  return `This session's upload of your approval could not be confirmed in time (its connection to the service was backed up); whether ${name} received it and ran the command could not be learned from it afterwards. This is not a problem with ${name}. Check whether the command ran before retrying it.`;
}
//@ chunk-qmsrnapp.js:31985-32200 placement
function unverifiedRefusalMessage(e) {
  return `A sender this session could not verify reported this call refused, and ${e} could not be asked what became of it; whether it ran there is not confirmed. Check its effect before re-running it.`;
}
//@ chunk-qmsrnapp.js:32200-32994 placement
function stillRunningMessage({ name: e, state, cause }) {
  let r =
    cause === "unasked"
      ? `${e} answered that this call is still under way there`
      : `${inProgressStateMessage(e, cause)}; asked again, ${e} reports`;
  switch (state) {
    case "running":
      return `${r}${cause === "unasked" ? "" : " the command is STILL RUNNING there"}; its outcome is not known yet. Do not re-run it \u2014 check on its effect later, or ask the user.`;
    case "admitting":
      return `${r}${cause === "unasked" ? " \u2014" : ""} it had received the call but nothing had started yet; whether it then ran is not known. Check on its effect before repeating it, or ask the user.`;
    case "awaiting_approval":
      return `${r}${cause === "unasked" ? " \u2014" : ""} it was waiting for a permission decision and nothing had run, but it no longer accepts an answer to that question, so check on its effect before retrying it, or ask the user.`;
  }
}
//@ chunk-qmsrnapp.js:32994-34385 placement
function approvalDroppedMessage(name, n, o) {
  let r =
    n === "dropped"
      ? `The connection to ${name} dropped before your approval reached it`
      : n === "classifier_refused"
        ? `This session's automatic check (not a person) had approved the call; a sender this session could not verify reported the approval refused, and ${name} had not run it when asked`
        : n === "unverified_refusal"
          ? `A sender this session could not verify reported your approval refused, and ${name} had not received it when asked`
          : n === "write_unresolved" || n === "approval_write_unresolved"
            ? `This session's upload of your approval could not be confirmed in time (its connection to the service was backed up), and ${name} had not received it when asked`
            : `${name} did not answer your approval within this session's time limit and had not received it when asked`;
  let s =
    n === "unverified_refusal"
      ? "If the user answered from a surface this session cannot verify, send the call again and have them approve from the terminal or desktop prompt, unedited."
      : n === "classifier_refused"
        ? `Retry once if it is still needed. If it is refused again, stop and tell the user that this tool on ${name} needs their own approval.`
        : "It is safe to retry the call if it is still wanted.";
  return o
    ? `${r}; the request was withdrawn there and nothing ran. ${s}`
    : `${r}; the request was then withdrawn, but whether a delayed copy of the approval reached it first is not known. Check whether the command ran before retrying it.`;
}
//@ chunk-qmsrnapp.js:34385-34588 placement
function hostRestartedLostMessage(name, n) {
  return `${inProgressStateMessage(name, n)}, and Claude Code on ${name} has restarted since: the command was lost with it. It may have partially run before the restart \u2014 check its effect before repeating it.`;
}
//@ chunk-qmsrnapp.js:34588-34702 placement
function neverReceivedMessage(name, n) {
  return `${inProgressStateMessage(name, n)}, and ${name} reports it never received it: it did not run. It is safe to retry.`;
}
//@ chunk-qmsrnapp.js:34702-34781 placement
function waitingToReconnectStatus(machine, n) {
  return `Waiting up to ${n} s for ${machineLabelForMessage(machine)} to reconnect\u2026`;
}
//@ chunk-qmsrnapp.js:34781-34886 placement
function waitedToReconnectNote(name, n) {
  return `waited ${n} s for ${name} to reconnect after this session's environment restarted`;
}
//@ chunk-qmsrnapp.js:34886-34972 placement
function reconnectingStatus(name) {
  return `Reconnecting to ${name} to learn what happened to the call\u2026`;
}
//@ chunk-qmsrnapp.js:34972-35416 placement
function deliveredAfterReconnectNote(e = "completed") {
  switch (e) {
    case "completed":
      return "(delivered after reconnect \u2014 the first reply was lost; this is the recorded result, the command was not run again)";
    case "refused":
      return "(delivered after reconnect \u2014 the first reply was lost; this is the refusal recorded then, nothing ran)";
    case "failed":
      return "(delivered after reconnect \u2014 the first reply was lost; this is how the call ended, it was not run again)";
  }
}
//@ chunk-qmsrnapp.js:35416-35846 placement
function replayedOutcomeNote(servedAt, n = "completed") {
  let o =
    servedAt === undefined || !Number.isFinite(servedAt) || Math.abs(servedAt) > 8640000000000000
      ? "earlier"
      : `at ${formatUtcClock(new Date(servedAt))} UTC`;
  switch (n) {
    case "completed":
      return `(replayed \u2014 this call already ran ${o}; it was not run again)`;
    case "refused":
      return `(replayed \u2014 this is the refusal recorded ${o}; nothing ran then or now)`;
    case "failed":
      return `(replayed \u2014 this is how the call ended ${o}; it was not run again)`;
  }
}
//@ chunk-qmsrnapp.js:35846-35967 placement
function formatUtcClock(e) {
  return [e.getUTCHours(), e.getUTCMinutes(), e.getUTCSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
//@ chunk-qmsrnapp.js:35967-36078 placement
function failedInTransitMessage({ name: e, detail }) {
  return `The call to ${e} failed in transit (${truncateText(detail, MAX_MESSAGE_CHARS)}); it may not have run.`;
}
//@ chunk-qmsrnapp.js:36078-36153 placement
function refusedByMachineLine({ name: e, message }) {
  return `[refused by ${machineLabelForMessage(e)}] ${truncateText(message, MAX_MESSAGE_CHARS)}`;
}
//@ chunk-qmsrnapp.js:36153-36246 placement
function refusedDidNotRunLine({ name: e, message }) {
  return `[refused \u2014 did not run on ${machineLabelForMessage(e)}] ${truncateText(message, MAX_MESSAGE_CHARS)}`;
}
//@ chunk-qmsrnapp.js:36246-36319 placement
function failedOnMachineLine({ name: e, message }) {
  return `[failed on ${machineLabelForMessage(e)}] ${truncateText(message, MAX_MESSAGE_CHARS)}`;
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
function approvalSourcePhrase(e) {
  return APPROVAL_SOURCE_TEXT[e];
}
//@ chunk-qmsrnapp.js:36575-36745 placement
function ranOnHeader(e, spelledDirectory, permittedBy, isError = false) {
  let s = isError && permittedBy === "unasked" ? undefined : permittedBy;
  let i = s === undefined ? "" : ` \xB7 ${approvalSourcePhrase(s)}`;
  return `[${isError ? "on" : "ran on"} ${machineLabelForMessage(e)} \xB7 ${spelledDirectory === "" ? "unknown directory" : spelledDirectory}${i}]`;
}
//@ chunk-qmsrnapp.js:36745-36818 placement
function displayWorkingDir(workingDir, n) {
  return formatDisplayPath(tildeRelativePath(workingDir.trim(), n?.trim()), MAX_NAME_DISPLAY, {
    isDirectory: true,
  });
}
//@ chunk-qmsrnapp.js:36818-36974 placement
function tildeRelativePath(e, n) {
  let replaced = n?.replace(/[\\/]$/, "");
  if (!replaced) return e;
  if (e === replaced) return "~";
  let sliced = e.slice(replaced.length);
  return e.startsWith(replaced) && /^[\\/]/.test(sliced) ? `~${sliced}` : e;
}
//@ chunk-qmsrnapp.js:36974-37010 placement
function truncatePath(path, n) {
  return truncateToLength(stripControlChars(path), n);
}
//@ chunk-qmsrnapp.js:37010-37047 placement
function truncateText(message, n) {
  return truncateToLength(stripControlChars_2(message), n);
}
//@ chunk-qmsrnapp.js:37047-37091 placement
function formatMiB(e) {
  return (e / 1048576).toFixed(2);
}
//@ chunk-qmsrnapp.js:37091-37168 placement
function hereLocation() {
  return currentMachineLabel() === "container" ? "in the container" : "on this machine";
}
//@ chunk-qmsrnapp.js:37168-37496 placement
function unverifiedApprovalMessage(e) {
  return `The approval for this call could not be verified as the user's own answer, so ${e} did not run it and nothing ran (its earlier permission request for this call may stay open there; that is harmless). To proceed, send the call again and have the user approve from the terminal or desktop prompt, unedited.`;
}
//@ chunk-qmsrnapp.js:37496-37773 placement
function classifierOnlyApprovalMessage(name, name_2) {
  return `This session's automatic check approved this ${name_2} call, but only a person's approval counts for ${name_2} on ${name}, so nothing ran. Retry once if it is still needed. If it is refused again, stop and tell the user that ${name_2} on ${name} needs their own approval.`;
}
//@ chunk-qmsrnapp.js:37773-38014 placement
function approvalNotVerifiedMessage(e) {
  return `The approval for this call could not be verified as the user's own answer, so the call was not cleared to run on ${e} and nothing ran. Ask again and have the user approve from the terminal or desktop prompt, unedited.`;
}
//@ chunk-qmsrnapp.js:38014-38439 placement
function sendTimedOutMessage({ name: e, capMs }) {
  return `The call to ${e} could not be sent within ${Math.round(capMs / 1000)}s \u2014 this session's connection to the service was backed up \u2014 so it was withdrawn while still queued here. Most likely nothing ran on ${e}: if the call reaches it late, its withdrawal arrives with it (for a command with side effects, check before repeating it). This is not a problem with ${e}; try the call again.`;
}
//@ chunk-qmsrnapp.js:38439-38755 placement
function nothingRanSendTimeoutMessage({ name: e, capMs }) {
  return `Nothing ran on ${e}: the call could not be sent within ${Math.round(capMs / 1000)}s \u2014 this session's connection to the service was backed up \u2014 and it was taken back before it left this session, so ${e} never received it. This is not a problem with ${e}; try the call again.`;
}
//@ chunk-qmsrnapp.js:38755-39218 placement
function approvalWithdrawnMessage({ name: e, capMs }) {
  return `The call had reached ${e} and asked for approval there, but the user's approval could not be sent within ${Math.round(capMs / 1000)}s \u2014 this session's connection to the service was backed up \u2014 and it was taken back before it left this session, so ${e} never received it and nothing ran; the pending request on ${e} is withdrawn. This is not a problem with ${e}; send the call again and the user will be asked once more.`;
}
//@ chunk-qmsrnapp.js:39218-39740 placement
function approvalNotSentMessage({ name: e, capMs }) {
  return `The user's approval could not be sent to ${e} within ${Math.round(capMs / 1000)}s \u2014 this session's connection to the service was backed up \u2014 so it was withdrawn while still queued here, and the pending request on ${e} with it. Most likely nothing ran: if the approval still reaches ${e} late, its cancellation arrives with it (for a command with side effects, check before repeating it). This is not a problem with ${e}; send the call again and the user will be asked once more.`;
}
//@ chunk-qmsrnapp.js:39740-40183 placement
function livenessCheckWithdrawnMessage({ name: e, capMs }) {
  return `The call had reached ${e} and asked for approval there, but the check that ${e} is still connected could not be sent within ${Math.round(capMs / 1000)}s \u2014 this session's connection to the service was backed up \u2014 so the user's approval was never sent and the pending request on ${e} is withdrawn; nothing ran. This is not a problem with ${e}; send the call again and the user will be asked once more.`;
}
//@ chunk-qmsrnapp.js:40183-40449 placement
function livenessCheckNotSentMessage({ name: e, capMs }) {
  return `A liveness check to ${e} could not be sent within ${Math.round(capMs / 1000)}s \u2014 this session's connection to the service was backed up; the call was not sent and nothing ran. This is not a problem with ${e}; try the call again.`;
}
//@ chunk-qmsrnapp.js:40449-40892 placement
function interruptedCallMessage({ name: e, why, unsent }) {
  let r =
    why === "withdrawn"
      ? `Claude Code on ${e} withdrew from this session (it exited or stopped serving)`
      : `Claude Code on ${e} restarted`;
  return unsent
    ? `${r} before this call reached it; nothing ran there, and no result will arrive for it.`
    : `The call was interrupted: ${r} while the call was with it, so no result will arrive for it. It may have partially run \u2014 check its effects on ${e} before repeating it.`;
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

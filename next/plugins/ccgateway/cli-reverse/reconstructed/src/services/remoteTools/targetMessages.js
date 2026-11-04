/**
 * services/remoteTools/targetMessages.ts
 *
 * 2.1.316 新增：远程工具目标机器状态文案：不可达、协议不匹配、停止服务、无此机器等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qmsrnapp.js (29)
 * attribution: placement 29
 */
import {
  machineLabelForMessage,
  isReservedMachineName,
  isReservedMachineNameExact,
  HOST_TOOL_INPUT_FIELD,
} from "../../bridge/deviceRegistration.js";
import { SUPPORTED_PROTOCOL_VERSIONS } from "../../remote/tools/protocolConstants.js";
import {
  hereLocation,
  formatUtcClock,
  truncatePath,
  MAX_NAME_DISPLAY,
  formatMiB,
} from "./transportMessages.js";
import { ASK_FIRST_REASON_TEXTS } from "../../utils/permissions/askFirstReasons.js";

//@ chunk-qmsrnapp.js:19087-19681 placement
function noSuchMachineMessage({ requested, attached }) {
  let label = machineLabelForMessage(requested);
  if (isReservedMachineName(requested) && !isReservedMachineNameExact(requested))
    return `No machine named "${label}" is attached to this session \u2014 to run this in the session's own environment, omit "${HOST_TOOL_INPUT_FIELD}".`;
  let attachedText =
    attached.length > 0
      ? `Attached: ${attached.join(", ")}.`
      : "No machine is attached to this session: only this session's own environment is available \u2014 it is not the user's machine, so do not describe it as one.";
  let extraCharsNote =
    label !== requested.trim() && attached.some((name) => name === label || name === `${label} (offline)`)
      ? " (the name as written contains extra or invisible characters)"
      : "";
  return `No machine named "${label}"${extraCharsNote} is attached to this session. ${attachedText}`;
}
//@ chunk-qmsrnapp.js:19681-20598 placement
function protocolMismatchMessage({ name, announced, runsOnlyThere, servedInsteadBy }) {
  let joined = SUPPORTED_PROTOCOL_VERSIONS.map((version) => `v${version}`).join("/");
  let max = Math.max(...SUPPORTED_PROTOCOL_VERSIONS);
  let versionsText =
    announced.length > 0
      ? `its remote-tool protocol ${announced.map((version) => `v${version}`).join("/")}, ours ${joined}`
      : `it names no remote-tool protocol version this session reads; ours is ${joined}`;
  let newerNote =
    announced.length === 0
      ? "whichever of the two is older needs updating"
      : Math.max(...announced) < max
        ? `Claude Code on ${name} is the older of the two and needs updating`
        : "this session's Claude Code is the older of the two: a newer cloud environment is needed, not a change on the machine";
  let alternative =
    servedInsteadBy !== undefined
      ? `${servedInsteadBy.toolName} has no home ${hereLocation()}; ${servedInsteadBy.name} serves it \u2014 set "${HOST_TOOL_INPUT_FIELD}" to "${servedInsteadBy.name}".`
      : runsOnlyThere === undefined
        ? `Omit "${HOST_TOOL_INPUT_FIELD}" to run it ${hereLocation()} instead.`
        : `${runsOnlyThere} exists only on ${name}, so it cannot run from this session until then.`;
  return `${name} is attached but the two Claude Code builds share no remote-tool protocol version (${versionsText}); the call did not run; ${newerNote}. ${alternative}`;
}
//@ chunk-qmsrnapp.js:20598-20824 placement
function computerUnreachableMessage() {
  return `The user's computer could not be reached right now; the call did not run. Do not call it again in this turn: do the rest of the task without it, and tell the user what is blocked. ${ASK_FIRST_REASON_TEXTS["away.ending"]()}`;
}
//@ chunk-qmsrnapp.js:20824-21176 placement
function computerNotReadyMessage(requested) {
  return `The user's computer is not ready yet \u2014 it may still be connecting (or running tools for cloud sessions is switched off on it, or this session could not verify it), so this session cannot tell yet whether "${machineLabelForMessage(requested)}" is its name; the call did not run. Try once more in a few seconds; if it is still not ready, tell the user.`;
}
//@ chunk-qmsrnapp.js:21176-21350 placement
function waitingForReconnectPhrase(name, reconnected) {
  return reconnected
    ? `for "${machineLabelForMessage(name)}" to reconnect after this session's cloud environment restarted`
    : `for "${machineLabelForMessage(name)}" to connect (this session could not reach it either)`;
}
//@ chunk-qmsrnapp.js:21350-21527 placement
var UNREACHABLE_CAUSES =
  "the computer may be asleep or offline, Claude may not be running on it, running tools for cloud sessions may be switched off on it, or this session could not verify it";
//@ chunk-qmsrnapp.js:21527-21750 placement
function waitedForReconnectMessage(name, waitedMs, reconnected = true) {
  return `This call waited ${Math.round(waitedMs / 1000)} s ${waitingForReconnectPhrase(name, reconnected)}; it did not \u2014 ${UNREACHABLE_CAUSES}. Nothing was sent. Ask the user to check that Claude is running on that computer rather than retrying immediately.`;
}
//@ chunk-qmsrnapp.js:21750-21969 placement
function alreadyWaitedMessage(name, waitedMs, reconnected = true) {
  return `This session already waited ${Math.round(waitedMs / 1000)} s earlier ${waitingForReconnectPhrase(name, reconnected)}, and it still has not \u2014 ${UNREACHABLE_CAUSES}. Nothing was sent. Ask the user to check that Claude is running on that computer.`;
}
//@ chunk-qmsrnapp.js:21969-22498 placement
function cannotRunAnythingMessage(name) {
  return `"${machineLabelForMessage(name)}" cannot run anything for this session right now: Claude on that computer stopped offering its tools here (the Claude app there may have closed or lost its connection, or running tools for cloud sessions was switched off on it). Nothing was sent. Ask the user to check that Claude is running on that computer, and to open the Claude app there if it was closed; if this session got the computer by asking to use one of its folders, look the folders up and ask to use that folder again afterwards.`;
}
//@ chunk-qmsrnapp.js:22498-23321 placement
function stoppedServingMessage(name, reason) {
  switch (reason) {
    case "idle":
      return `${name} stopped serving this session because the session had run nothing on it for a while: an idle computer frees its place for other sessions. Nothing on ${name} needs restarting and there is nothing to ask the user to fix. If the task still needs ${name}, look the user's computer folders up and ask for that folder again (the user approves the request); otherwise do the rest of the task without it. Do not call ${name} with "${HOST_TOOL_INPUT_FIELD}" until it is attached again.`;
    case "released":
      return `The person at ${name} disconnected this session from the folder it was using there. Nothing on ${name} is down. Do the rest of the task without ${name} and tell the user what that leaves undone; ask for the folder again only if the user wants you to. Do not call ${name} with "${HOST_TOOL_INPUT_FIELD}" until it is attached again.`;
  }
}
//@ chunk-qmsrnapp.js:23321-23436 placement
function noLongerAttachedMessage(name, reason) {
  let label = machineLabelForMessage(name);
  return `${label} is no longer attached to this session; the call did not run. ${stoppedServingMessage(label, reason)}`;
}
//@ chunk-qmsrnapp.js:23436-23708 placement
function olderConnectionOfferMessage() {
  return "A computer is offering its tools to this session over an older connection that this session does not accept; the call did not run. If it is the user's computer, Claude Code on it needs updating. Do not retry until the user says it has been updated.";
}
//@ chunk-qmsrnapp.js:23708-23912 placement
function linkedButNotConnectedMessage() {
  return `The user's computer is linked to this session, but Claude on it has not connected \u2014 ${UNREACHABLE_CAUSES}; the call did not run. Ask the user to check that Claude is running on that computer.`;
}
//@ chunk-qmsrnapp.js:23912-24187 placement
var NOT_ANSWERING_CAUSES =
  "most often because Claude there was quit, Remote Control or running tools for cloud sessions was turned off on it, or this session was disconnected from that computer; more rarely Claude there stopped offering its tools by itself, and then says why on that computer";
//@ chunk-qmsrnapp.js:24187-24805 placement
function notAnsweringMessage(name, side = "machine") {
  let base = `${name} is not answering right now, most often because its Claude is not connected to this session (Claude is not running on ${name}, the computer is asleep or offline, or it is reconnecting after another session used it); the call did not run.`;
  if (side === "this_side")
    return `${base} Try again shortly, or ask the user to check that Claude is open on ${name}.`;
  return `${base} Do not call ${name} again in this turn: do the rest of the task without ${name}, and tell the user what is blocked and that opening Claude on ${name}, with the computer awake and online, is what brings it back. ${ASK_FIRST_REASON_TEXTS["away.ending"]()}`;
}
//@ chunk-qmsrnapp.js:24805-26954 placement
function unreachableCallMessage(name, detail, side, recheckable, { cause, lastHeardAt, leftFor } = {}) {
  let heardText =
    lastHeardAt === undefined ? "" : `last heard from at ${formatUtcClock(new Date(lastHeardAt))} UTC; `;
  let base = `${name} could not be reached from this session (${heardText}${detail}); the call did not run.`;
  if (side === "this_side")
    return `${base} If Claude is not running on ${name}, or is no longer connected to this session, ask the user to check it; a call that was too large to deliver will not succeed on a retry.`;
  let sayWhenBack = recheckable ? "" : ", and to say when it is back";
  let notBeforePhrase = ASK_FIRST_REASON_TEXTS["away.until"](recheckable ? name : undefined);
  let ending = recheckable ? "" : ` ${ASK_FIRST_REASON_TEXTS["away.ending"]()}`;
  switch (cause) {
    case "asleep":
      return `${base} Waking the computer is all the user needs to do to bring ${name} back. Do not call ${name} again ${notBeforePhrase}: do the rest of the task without ${name}, and tell the user what is blocked.${ending}`;
    case "signed_off":
      if (leftFor !== undefined) return `${base} ${stoppedServingMessage(name, leftFor)}`;
      return `${base} Its Claude stopped serving this session by its own word, ${NOT_ANSWERING_CAUSES}: ask the user to open Claude on ${name} again with Remote Control on${sayWhenBack}. Do not call ${name} again ${notBeforePhrase}: do the rest of the task without ${name}, and tell the user what is blocked.${ending}`;
    case "busy":
      return `${base} The last thing heard from it was its word that it was busy running a command and could not hear this session, so Claude on ${name} and the computer are most likely fine and it is the connection between them and this session that is down: ask the user to check that computer's network, and not to quit Claude there, which would stop the command it is running${recheckable ? "" : "; and to say when it is back"}. Do not call ${name} again ${notBeforePhrase}: do the rest of the task without ${name}, and tell the user what is blocked.${ending}`;
    case undefined:
      return `${base} If Claude is not running on ${name}, or is no longer connected to this session, ask the user to check it${sayWhenBack}. Do not call ${name} again ${notBeforePhrase}: do the rest of the task without ${name}, and tell the user what is blocked.${ending}`;
    case "silent":
      return `${base} Most likely Claude on ${name} is no longer running (the app was closed, say) or lost its connection, or the computer went to sleep or offline: ask the user to open Claude on ${name} again with the computer awake and online${sayWhenBack}. Do not call ${name} again ${notBeforePhrase}: do the rest of the task without ${name}, and tell the user what is blocked.${ending}`;
  }
}
//@ chunk-qmsrnapp.js:26954-27164 placement
function unreadableAnnouncementMessage({ name, toolName }) {
  return `${name} announced ${toolName} in a form this session cannot read (a version or naming mismatch between the two Claude Code builds \u2014 update whichever is older); nothing ran.`;
}
//@ chunk-qmsrnapp.js:27164-27300 placement
function toolNotServedMessage({ name, toolName }) {
  return `${name} does not serve ${toolName} right now (its MCP server may have disconnected there); nothing ran.`;
}
//@ chunk-qmsrnapp.js:27300-27422 placement
function mcpToolsUnavailableMessage({ name, toolName }) {
  return `${name}'s MCP tools are not available in this session right now; ${toolName} did not run.`;
}
//@ chunk-qmsrnapp.js:27422-27502 placement
function runsOnlyThereMessage({ name, toolName }) {
  return `${toolName} runs only on ${name}; omit "${HOST_TOOL_INPUT_FIELD}".`;
}
//@ chunk-qmsrnapp.js:27502-27909 placement
function cannotRunHereMessage({ toolName, machines }) {
  let [first, ...rest] = machines;
  return rest.length === 0
    ? `${toolName} cannot run ${hereLocation()} \u2014 this session's own environment has no ${toolName}; it runs on ${first}: omit "${HOST_TOOL_INPUT_FIELD}" or set it to "${first}".`
    : `${toolName} cannot run ${hereLocation()} \u2014 this session's own environment has no ${toolName} \u2014 and ${machines.length} attached machines serve it, so the call must say which: set "${HOST_TOOL_INPUT_FIELD}" to one of ${machines.join(", ")}. Nothing ran.`;
}
//@ chunk-qmsrnapp.js:27909-28176 placement
function detachedNowhereMessage({ name, toolName }) {
  return `${name} is no longer attached to this session, and this session's own environment has no ${toolName}: there is nowhere to run it until a computer that serves ${toolName} attaches again. Nothing ran; do not retry it ${hereLocation()} with another tool.`;
}
//@ chunk-qmsrnapp.js:28176-28369 placement
function servedElsewhereMessage({ name, toolName, servedBy }) {
  return `${name} does not serve ${toolName}, and this session's own environment has none; ${servedBy} serves it \u2014 set "${HOST_TOOL_INPUT_FIELD}" to "${servedBy}" or omit it. Nothing ran.`;
}
//@ chunk-qmsrnapp.js:28369-28540 placement
function runningUnavailableMessage({ name, toolName }) {
  return `Running ${toolName} on ${name} is not available in this session right now, and this session's own environment has no ${toolName}; it did not run.`;
}
//@ chunk-qmsrnapp.js:28540-28757 placement
function notServedRightNowMessage({ name, toolName }) {
  return `${name} does not serve ${toolName} right now (its Claude Code there may have restarted without it, or be an older version), and this session's own environment has no ${toolName}; nothing ran.`;
}
//@ chunk-qmsrnapp.js:28757-29024 placement
function servedAlternativesMessage({ name, toolName, served }) {
  let alternatives =
    served.length === 0
      ? ""
      : ` \u2014 or do it on ${name} through a tool it does serve there (${served.join(", ")})`;
  return `${name} does not serve ${toolName} right now (its Claude Code may be an older version); omit "${HOST_TOOL_INPUT_FIELD}" to run it ${hereLocation()}${alternatives}.`;
}
//@ chunk-qmsrnapp.js:29024-29098 placement
function notContactedMessage({ name, ruleMessage }) {
  return `${ruleMessage} ${name} was not contacted.`;
}
//@ chunk-qmsrnapp.js:29098-29349 placement
function unmatchedPathSpellingMessage({ name, toolName, path, spellingIs }) {
  return `${toolName} was given "${truncatePath(path, MAX_NAME_DISPLAY)}", which is ${spellingIs} \u2014 a spelling this session cannot match to its own path rules as written. Use the file's full path as ${name} shows it. ${name} was not contacted.`;
}
//@ chunk-qmsrnapp.js:29349-29505 placement
function inputTooLargeMessage({ name, requestBytes, capBytes }) {
  return `This call's input is ${formatMiB(requestBytes)} MiB, over the ${formatMiB(capBytes)} MiB limit for calls to ${name}; it was not sent.`;
}
export {
  notContactedMessage,
  inputTooLargeMessage,
  toolNotServedMessage,
  unmatchedPathSpellingMessage,
  runningUnavailableMessage,
  cannotRunHereMessage,
  detachedNowhereMessage,
  notServedRightNowMessage,
  servedElsewhereMessage,
  protocolMismatchMessage,
  noSuchMachineMessage,
  computerUnreachableMessage,
  noLongerAttachedMessage,
  notAnsweringMessage,
  servedAlternativesMessage,
  mcpToolsUnavailableMessage,
  olderConnectionOfferMessage,
  unreachableCallMessage,
  unreadableAnnouncementMessage,
  runsOnlyThereMessage,
  cannotRunAnythingMessage,
  computerNotReadyMessage,
  linkedButNotConnectedMessage,
  alreadyWaitedMessage,
  waitedForReconnectMessage,
  NOT_ANSWERING_CAUSES,
};

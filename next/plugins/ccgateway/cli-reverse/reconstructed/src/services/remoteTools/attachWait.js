/**
 * services/remoteTools/attachWait.ts
 *
 * 2.1.316 新增：worker 重建后等待附加机器重连。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5vfqv7sk.js (9)
 * attribution: placement 9
 */
import { buildToolHostsNotice, getLastToolHostsNotice } from "../../remote/tools/toolHostsNotice.js";
import { isAttachAnnounceWaitOn } from "./servingGates.js";
import { waitForAnnounce } from "../../utils/remoteTools/folderTargets.js";
import { RemoteBackgroundCommands } from "./backgroundCommands.js";
import { syncRemoteToolTargets } from "../../remote/tools/remoteToolTargets.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { lit } from "../analytics/safeMetadata.js";
import {
  HOST_TOOL_INPUT_FIELD,
  MACHINE_SLUG_PATTERN,
  isReservedMachineNameExact,
} from "../../bridge/deviceRegistration.js";
import { firstLineOf } from "../../utils/stringUtils.js";

//@ chunk-5vfqv7sk.js:31387-31398 placement
var ATTACH_ANNOUNCE_WAIT_MS = 800;
//@ chunk-5vfqv7sk.js:31398-31479 placement
class OnceSet {
  #e = new Set();
  take(key) {
    if (this.#e.has(key)) return false;
    this.#e.add(key);
    return true;
  }
}
//@ chunk-5vfqv7sk.js:31479-32105 placement
/**
 * 会话 worker 重建后等待先前附加的机器重新连接（attach_announce_wait），超时则把未重连的机器写进说明。
 */
async function waitForAttachAnnouncements(appState, targets, request, signal) {
  let toolHostsNotice = buildToolHostsNotice(request);
  if (
    toolHostsNotice === undefined ||
    signal.aborted ||
    targets.sourceHosts("session").some((host) => host.status === "online") ||
    !isAttachAnnounceWaitOn() ||
    !appState.toolState.get(OnceSet).take(toolHostsNotice)
  )
    return;
  let now = Date.now();
  let outcome = await waitForAnnounce(
    appState.toolState.get(RemoteBackgroundCommands),
    signal,
    ATTACH_ANNOUNCE_WAIT_MS,
  );
  syncRemoteToolTargets(appState, targets, "attachment_scan");
  let waitedMs = Date.now() - now;
  logForDebugging(
    `[remote-tools] waited ${waitedMs} ms after a folder request was answered "attached" for the computer's announcement: ${outcome === "announced" ? "it arrived" : outcome === "aborted" ? "the attachment pass ran out of time first" : "none arrived in time"}`,
  );
  logEvent("tengu_remote_tool_targets", {
    event: lit("attach_announce_wait"),
    source: lit("session"),
    announce_arrived: outcome === "announced",
    waited_ms: waitedMs,
  });
}
//@ chunk-5vfqv7sk.js:32105-32244 placement
var NOT_RECONNECTED_YET_HEADING = "Attached earlier and not reconnected yet:";
var DID_NOT_RECONNECT_HEADING = "Did not reconnect:";
var RECONNECT_NOTE_LINE = /^- ([a-z0-9][a-z0-9-]*)(?: \(where the project lives\))?: /;
//@ chunk-5vfqv7sk.js:32244-32744 placement
function notReconnectedYetNote(machineNames) {
  let thoseWords = machineNames.length === 1 ? "that machine" : "those machines";
  return `${NOT_RECONNECTED_YET_HEADING} ${machineNames.join(", ")}. This session's cloud worker was replaced, and the Claude Code on ${thoseWords} has not connected to the new one yet. Do not do the work of ${thoseWords} here in this session's own environment, and do not report it as done. To use a machine again, name it with "${HOST_TOOL_INPUT_FIELD}" as before: the call waits a few seconds for it to reconnect. If it still does not answer, tell the user that it has not reconnected and pause that work.`;
}
//@ chunk-5vfqv7sk.js:32744-33197 placement
function didNotReconnectNote(machineNames, timeoutSeconds) {
  let thoseWords = machineNames.length === 1 ? "that machine" : "those machines";
  return `${DID_NOT_RECONNECT_HEADING} ${machineNames.join(", ")}. This session's cloud worker was replaced, and the Claude Code on ${thoseWords} did not connect to the new one within ${timeoutSeconds} s. Do not do the work of ${thoseWords} here in this session's own environment, and do not report it as done: tell the user that it has not reconnected, and carry on only with work that does not need it. If it reconnects, its tools appear here again.`;
}
//@ chunk-5vfqv7sk.js:33197-33248 placement
function isDidNotReconnectNote(note) {
  return note?.startsWith(`${DID_NOT_RECONNECT_HEADING} `) === true;
}
//@ chunk-5vfqv7sk.js:33248-33499 placement
function parseReconnectNotes(notes) {
  let machineNames = new Set();
  for (let note of notes) {
    if (note.startsWith(`${NOT_RECONNECTED_YET_HEADING} `)) {
      let firstLine = firstLineOf(note.slice(NOT_RECONNECTED_YET_HEADING.length + 1), ". ");
      for (let machineName of firstLine.split(", "))
        if (MACHINE_SLUG_PATTERN.test(machineName) && !isReservedMachineNameExact(machineName))
          machineNames.add(machineName);
      continue;
    }
    let machineName = RECONNECT_NOTE_LINE.exec(note)?.[1];
    if (
      machineName !== undefined &&
      MACHINE_SLUG_PATTERN.test(machineName) &&
      !isReservedMachineNameExact(machineName)
    )
      machineNames.add(machineName);
  }
  return machineNames;
}
//@ chunk-5vfqv7sk.js:33499-33544 placement
function reconnectNotesFromState(appState) {
  return parseReconnectNotes(getLastToolHostsNotice(appState)?.lines ?? []);
}
export {
  reconnectNotesFromState,
  waitForAttachAnnouncements,
  parseReconnectNotes,
  notReconnectedYetNote,
  didNotReconnectNote,
  isDidNotReconnectNote,
};

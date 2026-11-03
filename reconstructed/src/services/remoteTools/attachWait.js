/**
 * services/remoteTools/attachWait.ts
 *
 * 2.1.316 新增：worker 重建后等待附加机器重连。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qmsrnapp.js (9)
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

//@ chunk-qmsrnapp.js:53258-53269 placement
var ATTACH_ANNOUNCE_WAIT_MS = 800;
//@ chunk-qmsrnapp.js:53269-53350 placement
class OnceSet {
  #e = new Set();
  take(e) {
    if (this.#e.has(e)) return false;
    this.#e.add(e);
    return true;
  }
}
//@ chunk-qmsrnapp.js:53350-53976 placement
/**
 * 会话 worker 重建后等待先前附加的机器重新连接（attach_announce_wait），超时则把未重连的机器写进说明。
 */
async function waitForAttachAnnouncements(e, n, o, signal) {
  let toolHostsNotice = buildToolHostsNotice(o);
  if (
    toolHostsNotice === undefined ||
    signal.aborted ||
    n.sourceHosts("session").some((p) => p.status === "online") ||
    !isAttachAnnounceWaitOn() ||
    !e.toolState.get(OnceSet).take(toolHostsNotice)
  )
    return;
  let now = Date.now();
  let u = await waitForAnnounce(e.toolState.get(RemoteBackgroundCommands), signal, ATTACH_ANNOUNCE_WAIT_MS);
  syncRemoteToolTargets(e, n, "attachment_scan");
  let h = Date.now() - now;
  logForDebugging(
    `[remote-tools] waited ${h} ms after a folder request was answered "attached" for the computer's announcement: ${u === "announced" ? "it arrived" : u === "aborted" ? "the attachment pass ran out of time first" : "none arrived in time"}`,
  );
  logEvent("tengu_remote_tool_targets", {
    event: lit("attach_announce_wait"),
    source: lit("session"),
    announce_arrived: u === "announced",
    waited_ms: h,
  });
}
//@ chunk-qmsrnapp.js:53976-54115 placement
var NOT_RECONNECTED_YET_HEADING = "Attached earlier and not reconnected yet:";
var DID_NOT_RECONNECT_HEADING = "Did not reconnect:";
var RECONNECT_NOTE_LINE = /^- ([a-z0-9][a-z0-9-]*)(?: \(where the project lives\))?: /;
//@ chunk-qmsrnapp.js:54115-54615 placement
function notReconnectedYetNote(e) {
  let n = e.length === 1 ? "that machine" : "those machines";
  return `${NOT_RECONNECTED_YET_HEADING} ${e.join(", ")}. This session's cloud worker was replaced, and the Claude Code on ${n} has not connected to the new one yet. Do not do the work of ${n} here in this session's own environment, and do not report it as done. To use a machine again, name it with "${HOST_TOOL_INPUT_FIELD}" as before: the call waits a few seconds for it to reconnect. If it still does not answer, tell the user that it has not reconnected and pause that work.`;
}
//@ chunk-qmsrnapp.js:54615-55068 placement
function didNotReconnectNote(e, n) {
  let o = e.length === 1 ? "that machine" : "those machines";
  return `${DID_NOT_RECONNECT_HEADING} ${e.join(", ")}. This session's cloud worker was replaced, and the Claude Code on ${o} did not connect to the new one within ${n} s. Do not do the work of ${o} here in this session's own environment, and do not report it as done: tell the user that it has not reconnected, and carry on only with work that does not need it. If it reconnects, its tools appear here again.`;
}
//@ chunk-qmsrnapp.js:55068-55119 placement
function isDidNotReconnectNote(e) {
  return e?.startsWith(`${DID_NOT_RECONNECT_HEADING} `) === true;
}
//@ chunk-qmsrnapp.js:55119-55370 placement
function parseReconnectNotes(e) {
  let n = new Set();
  for (let o of e) {
    if (o.startsWith(`${NOT_RECONNECTED_YET_HEADING} `)) {
      let s = firstLineOf(o.slice(NOT_RECONNECTED_YET_HEADING.length + 1), ". ");
      for (let i of s.split(", "))
        if (MACHINE_SLUG_PATTERN.test(i) && !isReservedMachineNameExact(i)) n.add(i);
      continue;
    }
    let r = RECONNECT_NOTE_LINE.exec(o)?.[1];
    if (r !== undefined && MACHINE_SLUG_PATTERN.test(r) && !isReservedMachineNameExact(r)) n.add(r);
  }
  return n;
}
//@ chunk-qmsrnapp.js:55370-55415 placement
function reconnectNotesFromState(e) {
  return parseReconnectNotes(getLastToolHostsNotice(e)?.lines ?? []);
}
export {
  reconnectNotesFromState,
  waitForAttachAnnouncements,
  parseReconnectNotes,
  notReconnectedYetNote,
  didNotReconnectNote,
  isDidNotReconnectNote,
};

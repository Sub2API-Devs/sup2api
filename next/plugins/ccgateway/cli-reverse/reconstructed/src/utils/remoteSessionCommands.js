/**
 * utils/remoteSessionCommands.ts
 *
 * 2.1.316 新增：远程会话命令
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (11)
 * attribution: placement 9, layout 2
 */
import { HostScoped } from "./hostScoped.js";
import { isColorCommandForceHidden } from "../commands/color/index.js";
import { isSandboxEnforcedStub } from "./sandbox/sandboxRuntimeStubs.js";
import { getRootSession } from "../bootstrap/state.js";
import { EXIT_COMMAND_WORDS } from "./handlePromptSubmit.js";
import { findCommand, splitSlashCommandInput } from "../commands.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1805314-1805495 placement
class RemoteSessionScreenState {
  ownScreen = false;
  startsPlainSessions = false;
  spokenIn = false;
  cameBack = false;
  openHere = undefined;
  tabs = {
    sessions: [],
    local: [],
  };
  onScreen = undefined;
  visited = [];
  handedOver = false;
  exiting = false;
  closed = new Set();
}
//@ chunk-5xgkngpb.js:1805495-1805522 layout
var remoteSessionScreenState; // deferred: uses RemoteSessionScreenState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1805495", () => {
  remoteSessionScreenState = new HostScoped(() => new RemoteSessionScreenState());
});
//@ chunk-5xgkngpb.js:1805522-1805652 placement
/**
 * 退出方式提示。
 */
function exitHint(capitalize) {
  if (
    (isColorCommandForceHidden() && neverTrueRemote()) ||
    (usesRemoteSessionScreen() && isSandboxEnforcedStub())
  )
    return capitalize ? "Press Ctrl+C twice" : "press Ctrl+C twice";
  return capitalize ? "Run /exit" : "run /exit";
}
//@ chunk-5xgkngpb.js:1805676-1805700 placement
function neverTrueRemote() {
  return false;
}
//@ chunk-5xgkngpb.js:1805700-1805724 layout
function usesRemoteSessionScreen() {
  return false;
}
//@ chunk-5xgkngpb.js:1805724-1805746 placement
/**
 * noRemoteSessionCommands：无云会话时的空命令表。
 */
function noRemoteSessionCommands() {
  return;
}
//@ chunk-5xgkngpb.js:1805746-1805952 placement
/**
 * 无云会话时可运行的命令与提示。
 */
var LOCAL_REMOTE_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NO_CLOUD_SESSION_MESSAGE;
var awaitState;
deferInit("chunk-5xgkngpb.js:1805746", () => {
  LOCAL_REMOTE_COMMANDS = new Set(["login", "exit", "help"]);
  NO_CLOUD_SESSION_MESSAGE =
    "Nothing was sent or run: no cloud session is running here. Run /login to sign in, then press \u2191 to bring back what you typed.";
  awaitState = new HostScoped(() => ({
    awaits: false,
  }));
});
//@ chunk-5xgkngpb.js:1805952-1805998 placement
/**
 * remoteSessionAwaits：远程会话等待项。
 */
function remoteSessionAwaits() {
  return awaitState.of(getRootSession().host).awaits;
}
//@ chunk-5xgkngpb.js:1805998-1806040 placement
/**
 * setRemoteSessionAwaits：设置远程会话等待项。
 */
function setRemoteSessionAwaits(awaits) {
  awaitState.of(getRootSession().host).awaits = awaits;
}
//@ chunk-5xgkngpb.js:1806040-1806079 placement
/**
 * isLocalRemoteCommand：本地远程命令。
 */
function isLocalRemoteCommand(command) {
  return LOCAL_REMOTE_COMMANDS.has(command.name);
}
//@ chunk-5xgkngpb.js:1806079-1806224 placement (2.1.88 match: prependModeCharacterToInput, 1)
function prependModeCharacterToInput_2(input, inputMode, commands) {
  let trimmed = input.trim();
  if (trimmed === "") return true;
  if (inputMode === "bash") return false;
  return (
    EXIT_COMMAND_WORDS.includes(trimmed) ||
    (input.startsWith("/") && findCommand(splitSlashCommandInput(trimmed).name, commands) !== undefined)
  );
}
export {
  setRemoteSessionAwaits,
  isLocalRemoteCommand,
  remoteSessionAwaits,
  exitHint,
  noRemoteSessionCommands,
  prependModeCharacterToInput_2,
  NO_CLOUD_SESSION_MESSAGE,
};

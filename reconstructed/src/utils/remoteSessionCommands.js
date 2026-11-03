/**
 * utils/remoteSessionCommands.ts
 *
 * 2.1.316 新增：远程会话命令
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
 */
import { HostScoped } from "./hostScoped.js";
import { isColorCommandForceHidden } from "../commands/color/index.js";
import { getRootSession } from "../bootstrap/state.js";
import { EXIT_COMMAND_WORDS } from "./handlePromptSubmit.js";
import { findCommand, splitSlashCommandInput } from "../commands.js";

//@ chunk-e6aww6q8.js:1729936-1730105 placement
class RemoteSessionScreenState {
  ownScreen = false;
  startsPlainSessions = false;
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
//@ chunk-e6aww6q8.js:1730105-1730132 placement
var remoteSessionScreenSlot = new HostScoped(() => new RemoteSessionScreenState());
//@ chunk-e6aww6q8.js:1730132-1730248 placement
/**
 * 退出方式提示。
 */
function exitHint(e) {
  if (isColorCommandForceHidden() && neverTrueRemote())
    return e ? "Press Ctrl+C twice" : "press Ctrl+C twice";
  return e ? "Run /exit" : "run /exit";
}
//@ chunk-e6aww6q8.js:1730248-1730272 placement
function neverTrueRemote() {
  return false;
}
//@ chunk-e6aww6q8.js:1730272-1730294 placement
/**
 * noRemoteSessionCommands：无云会话时的空命令表。
 */
function noRemoteSessionCommands() {
  return;
}
//@ chunk-e6aww6q8.js:1730294-1730500 placement
/**
 * 无云会话时可运行的命令与提示。
 */
var LOCAL_REMOTE_COMMANDS = new Set(["login", "exit", "help"]);
var NO_CLOUD_SESSION_MESSAGE =
  "Nothing was sent or run: no cloud session is running here. Run /login to sign in, then press \u2191 to bring back what you typed.";
var awaitState = new HostScoped(() => ({
  awaits: false,
}));
//@ chunk-e6aww6q8.js:1730500-1730546 placement
/**
 * remoteSessionAwaits：远程会话等待项。
 */
function remoteSessionAwaits() {
  return awaitState.of(getRootSession().host).awaits;
}
//@ chunk-e6aww6q8.js:1730546-1730588 placement
/**
 * setRemoteSessionAwaits：设置远程会话等待项。
 */
function setRemoteSessionAwaits(awaits) {
  awaitState.of(getRootSession().host).awaits = awaits;
}
//@ chunk-e6aww6q8.js:1730588-1730627 placement
/**
 * isLocalRemoteCommand：本地远程命令。
 */
function isLocalRemoteCommand(e) {
  return LOCAL_REMOTE_COMMANDS.has(e.name);
}
//@ chunk-e6aww6q8.js:1730627-1730772 placement = prependModeCharacterToInput (1)
function prependModeCharacterToInput_2(e, inputMode, commands) {
  let trimmed = e.trim();
  if (trimmed === "") return true;
  if (inputMode === "bash") return false;
  return (
    EXIT_COMMAND_WORDS.includes(trimmed) ||
    (e.startsWith("/") && findCommand(splitSlashCommandInput(trimmed).name, commands) !== undefined)
  );
}
export {
  remoteSessionAwaits,
  exitHint,
  prependModeCharacterToInput_2,
  NO_CLOUD_SESSION_MESSAGE,
  noRemoteSessionCommands,
  setRemoteSessionAwaits,
  isLocalRemoteCommand,
};

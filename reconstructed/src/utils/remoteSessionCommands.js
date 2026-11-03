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
import { Zee } from "../commands/color/index.js";
import { getRootSession } from "../bootstrap/state.js";
import { cX } from "./handlePromptSubmit.js";
import { findCommand, splitSlashCommandInput } from "../commands.js";

//@ chunk-e6aww6q8.js:1729936-1730105 placement
class RemoteSessionScreenState {
  ownScreen = !1;
  startsPlainSessions = !1;
  cameBack = !1;
  openHere = void 0;
  tabs = { sessions: [], local: [] };
  onScreen = void 0;
  visited = [];
  handedOver = !1;
  exiting = !1;
  closed = new Set();
}
//@ chunk-e6aww6q8.js:1730105-1730132 placement
var sdl = new HostScoped(() => new RemoteSessionScreenState());
/**
 * 退出方式提示。
 */
//@ chunk-e6aww6q8.js:1730132-1730248 placement
function exitHint(e) {
  if (Zee() && R9o()) return e ? "Press Ctrl+C twice" : "press Ctrl+C twice";
  return e ? "Run /exit" : "run /exit";
}
//@ chunk-e6aww6q8.js:1730248-1730272 placement
function R9o() {
  return !1;
}
//@ chunk-e6aww6q8.js:1730272-1730294 placement
function j6s() {
  return;
}
/**
 * 无云会话时可运行的命令与提示。
 */
//@ chunk-e6aww6q8.js:1730294-1730500 placement
var LOCAL_REMOTE_COMMANDS = new Set(["login", "exit", "help"]),
  NO_CLOUD_SESSION_MESSAGE =
    "Nothing was sent or run: no cloud session is running here. Run /login to sign in, then press \u2191 to bring back what you typed.",
  awaitState = new HostScoped(() => ({ awaits: !1 }));
//@ chunk-e6aww6q8.js:1730500-1730546 placement
function htt() {
  return awaitState.of(getRootSession().host).awaits;
}
//@ chunk-e6aww6q8.js:1730546-1730588 placement
function Z6s(e) {
  awaitState.of(getRootSession().host).awaits = e;
}
//@ chunk-e6aww6q8.js:1730588-1730627 placement
function e3s(e) {
  return LOCAL_REMOTE_COMMANDS.has(e.name);
}
//@ chunk-e6aww6q8.js:1730627-1730772 placement = prependModeCharacterToInput (1)
function prependModeCharacterToInput_2(e, n, r) {
  let trimmed = e.trim();
  if (trimmed === "") return !0;
  if (n === "bash") return !1;
  return (
    cX.includes(trimmed) ||
    (e.startsWith("/") && findCommand(splitSlashCommandInput(trimmed).name, r) !== void 0)
  );
}

export { htt, exitHint, prependModeCharacterToInput_2, NO_CLOUD_SESSION_MESSAGE, j6s, Z6s, e3s };

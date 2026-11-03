/**
 * tools/SendMessageTool/listAgents.ts
 *
 * ListAgents/ListPeers 工具（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yggvmcq7.js (4)
 * attribution: placement 4
 */
import { SENDMESSAGE } from "./constants.js";

//@ chunk-yggvmcq7.js:227-263 placement
var LISTAGENTS = "ListAgents",
  LISTPEERS = "ListPeers";
//@ chunk-yggvmcq7.js:263-285 placement
function e() {
  return "";
}
//@ chunk-yggvmcq7.js:285-1794 placement
var LIST_AGENTS_PROMPT = `Lists agents you can ${SENDMESSAGE} to \u2014 in-process subagents you spawned, the teammates on your team, other local Claude sessions on this machine, your Claude sessions running in the cloud (when this session has cloud access; a cloud session receives your message but cannot message any session back yet \u2014 do not ask it to reply, read its answer in its own transcript), and (when Remote Control is connected here) your account's other sessions \u2014 Remote Control sessions on other machines and cloud sessions, each row labeled by kind. Names are the address: send with \`${SENDMESSAGE}({to: "<name>", message: "..."})\`, copying the name exactly as a row prints it. Append a row's \` [ref]\` only when the bare name is not enough \u2014 two rows share it, or an error asks you to disambiguate.`,
  n = `Lists the agents and Claude sessions this session can see \u2014 in-process subagents you spawned, the teammates on your team, other local Claude sessions on this machine, your Claude sessions running in the cloud (when this session has cloud access), and (when Remote Control is connected here) your account's other sessions, each row labeled by kind \u2014 plus this session's own name, the one other sessions use to message it. This session has no ${SENDMESSAGE} tool, so it cannot message them with it; other sessions can still message this one. To reply, use your host application's own messaging tool if it provides one \u2014 otherwise a reply from here is not possible, and if one is needed, tell your user.`;
//@ chunk-yggvmcq7.js:1794-1845 placement
function A5o({ canSendMessages: canSendMessages }) {
  return canSendMessages ? LIST_AGENTS_PROMPT + e() : n;
}

export { LISTAGENTS, LISTPEERS, A5o };

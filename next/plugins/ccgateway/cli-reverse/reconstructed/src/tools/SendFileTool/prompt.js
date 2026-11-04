/**
 * tools/SendFileTool/prompt.ts
 *
 * 2.1.316 新增。SendFile 工具提示词。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rwnj2eyf.js (4)
 * attribution: placement 4
 */
import { SENDMESSAGE } from "../SendMessageTool/constants.js";
import { LISTAGENTS } from "../SendMessageTool/listAgents.js";
import { hasEnvironmentKindOtherThanBridge } from "../../utils/sessionAddresses.js";

//@ chunk-rwnj2eyf.js:631-709 placement
/**
 * SendFile 的一句话描述。
 */
var SENDFILE = "SendFile";
var SEND_FILE_SHORT_DESCRIPTION = "Send one or more files to another Claude Code session";
//@ chunk-rwnj2eyf.js:709-1807 placement
function sendFileToolPrompt(maxChars, value) {
  return `Send files to another Claude Code session \u2014 a peer session on this machine, or a Remote Control / cloud session on another machine. The receiving Claude gets the files on its own filesystem with @path references, plus your message.

Use this when a file is the thing to hand over \u2014 a doc with figures, a screenshot, a report, a build artifact. For plain text, use ${SENDMESSAGE} instead. For agents inside this session (subagents, teammates), also use ${SENDMESSAGE} \u2014 they share your filesystem and can read the file at its path directly.

\`to\` accepts a peer session name from ${LISTAGENTS}, or an explicit \`uds:<socket>\` / \`bridge:<session id>\` address.

Each file is capped at ${value} MiB, at most ${maxChars} files per send. Files must exist on the local filesystem \u2014 write content to a file first if needed. The receiver verifies each file against a sha256 digest of what was sent (where the transport carries it) and refuses a mismatch with a visible note.

Example: ${SENDFILE}({ to: "devbox", files: ["report.pdf", "figures/plot.png"], message: "Here's the doc with figures." })`;
}
//@ chunk-rwnj2eyf.js:1807-1832 placement
/**
 * 会话类型标签 “Remote Control”。
 */
var REMOTE_CONTROL_LABEL = "Remote Control";
//@ chunk-rwnj2eyf.js:1832-1874 placement
/**
 * 云会话返回 “cloud”，否则 “Remote Control”。
 */
function sessionKindLabel(session) {
  return hasEnvironmentKindOtherThanBridge(session) ? "cloud" : REMOTE_CONTROL_LABEL;
}
export { SENDFILE, REMOTE_CONTROL_LABEL, sessionKindLabel, SEND_FILE_SHORT_DESCRIPTION, sendFileToolPrompt };
